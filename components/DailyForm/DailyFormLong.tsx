"use client";

import { useState, useEffect, useReducer } from "react";
import {
  sendToSlack,
  checkAlreadySubmitted,
  searchNames,
  getProjectsByMember,
  getTasksByMember,
  getTeammatesByProjects,
  saveEvaluations,
} from "@/lib/actions";
import {
  CheckCircle2,
  Loader2,
  Send,
  UserCheck,
  FolderKanban,
  ListChecks,
  Lightbulb,
  BookOpen,
  Target,
  Users,
  Star,
  Languages,
} from "lucide-react";
import Confetti from "./Confetti";
import { type Language, useTranslation } from "./translations";

type Suggestion = { id: number; full_name: string };
type Project = { id: number; name: string; description: string; icon: string };
type Teammate = { id: number; full_name: string };
type Evaluation = {
  evaluated_id: number;
  communication: number;
  collaboration: number;
  punctuality: number;
  comment: string;
};

type EvalState = {
  teammates: Teammate[];
  evaluations: Record<number, Evaluation>;
};

type EvalAction =
  | { type: "SET_TEAMMATES"; teammates: Teammate[] }
  | { type: "RESET" }
  | {
      type: "UPDATE_EVAL";
      evaluated_id: number;
      field: keyof Omit<Evaluation, "evaluated_id">;
      value: number | string;
    };

const evalInitial: EvalState = { teammates: [], evaluations: {} };

function evalReducer(state: EvalState, action: EvalAction): EvalState {
  switch (action.type) {
    case "SET_TEAMMATES":
      return { teammates: action.teammates, evaluations: {} };
    case "RESET":
      return evalInitial;
    case "UPDATE_EVAL": {
      const existing = state.evaluations[action.evaluated_id];
      return {
        ...state,
        evaluations: {
          ...state.evaluations,
          [action.evaluated_id]: {
            evaluated_id: action.evaluated_id,
            communication: existing?.communication ?? 0,
            collaboration: existing?.collaboration ?? 0,
            punctuality: existing?.punctuality ?? 0,
            comment: existing?.comment ?? "",
            [action.field]: action.value,
          },
        },
      };
    }
    default:
      return state;
  }
}

export default function DailyFormLong() {
  const [lang, setLang] = useState<Language>("fr");
  const t = useTranslation(lang);

  const [fullName, setFullName] = useState("");
  const [teamId, setTeamId] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Awaited<ReturnType<typeof getTasksByMember>>>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [challenges, setChallenges] = useState("");
  const [neededLearning, setNeededLearning] = useState("");
  const [tomorrowBuild, setTomorrowBuild] = useState("");
  const [extraMessage, setExtraMessage] = useState("");
  const [evalState, dispatch] = useReducer(evalReducer, evalInitial);
  const teammates = evalState.teammates;
  const evaluations = evalState.evaluations;

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetching =
      teamId && selectedProjects.length > 0
        ? getTeammatesByProjects(
            selectedProjects.map((p) => p.id),
            teamId
          )
        : Promise.resolve([] as Teammate[]);

    fetching.then((result) => {
      if (cancelled) return;
      dispatch({ type: "SET_TEAMMATES", teammates: result });
    });

    return () => {
      cancelled = true;
    };
  }, [selectedProjects, teamId]);

  async function loadProjects(team_id: number) {
    const [projectsResult, tasksResult] = await Promise.all([
      getProjectsByMember(team_id),
      getTasksByMember(team_id),
    ]);
    setProjects(projectsResult);
    setTasks(tasksResult);
  }

  async function handleNameSearch(value: string) {
    setFullName(value);
    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setLoadingSearch(true);
    const results = await searchNames(value);
    setSuggestions(results);
    setLoadingSearch(false);
  }

  function handleSuggestionPick(suggestion: Suggestion) {
    setTeamId(suggestion.id);
    setFullName(suggestion.full_name);
    setSuggestions([]);
    setError("");
    loadProjects(suggestion.id);
  }

  function handleProjectToggle(project: Project) {
    setSelectedProjects((prev) => {
      const exists = prev.find((p) => p.id === project.id);
      if (exists) {
        const projectTaskIds = tasks.filter((t) => t.project_id === project.id).map((t) => t.id);
        setSelectedTaskIds((ids) => ids.filter((id) => !projectTaskIds.includes(id)));
        return prev.filter((p) => p.id !== project.id);
      }
      return [...prev, project];
    });
  }

  function handleTaskToggle(taskId: number) {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  }

  function handleEvaluationChange(
    evaluated_id: number,
    field: keyof Omit<Evaluation, "evaluated_id">,
    value: number | string
  ) {
    dispatch({ type: "UPDATE_EVAL", evaluated_id, field, value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!teamId) {
      setError(t.errorSelectName);
      return;
    }

    const alreadySubmitted = await checkAlreadySubmitted(teamId);
    if (alreadySubmitted) {
      setError(t.errorAlreadySubmitted);
      return;
    }

    if (selectedProjects.length === 0) {
      setError(t.errorSelectProject);
      return;
    }

    const hasTask = selectedTaskIds.length > 0;
    const hasMessage = extraMessage.trim().length > 0;
    if (!hasTask && !hasMessage) {
      setError(t.errorSelectTaskOrMessage);
      return;
    }

    if (teammates.length > 0) {
      const allEvaluated = teammates.every((m) => {
        const e = evaluations[m.id];
        return e && e.communication > 0 && e.collaboration > 0 && e.punctuality > 0;
      });
      if (!allEvaluated) {
        setError(t.errorEvaluateAll);
        return;
      }
    }

    setSubmitting(true);

    const result = await sendToSlack({
      team_id: teamId,
      full_name: fullName,
      projects: selectedProjects.map((p) => p.name),
      validated_tasks: selectedTaskIds,
      challenges: challenges || "",
      needed_learning: neededLearning || "",
      tomorrow_build: tomorrowBuild || "",
      extra_message: extraMessage || "",
    });

    if (!result.success) {
      setError(t.errorSubmission);
      setSubmitting(false);
      return;
    }

    const evalList = Object.values(evaluations).filter(
      (e) => e.communication > 0 && e.collaboration > 0 && e.punctuality > 0
    );
    await saveEvaluations(teamId, evalList);

    setSubmitting(false);
    setSubmitted(true);
    setConfetti(true);
    setTimeout(() => setConfetti(false), 3000);

    setTimeout(() => {
      setSubmitted(false);
      setFullName("");
      setTeamId(null);
      setProjects([]);
      setSelectedProjects([]);
      setTasks([]);
      setSelectedTaskIds([]);
      setChallenges("");
      setNeededLearning("");
      setTomorrowBuild("");
      setExtraMessage("");
      dispatch({ type: "RESET" });
    }, 5000);
  }

  if (submitted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#F2EFE9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          position: "relative",
        }}
      >
        {confetti && <Confetti active={confetti} />}
        <div
          style={{
            background: "#fff",
            border: "1px solid #D4CFC5",
            padding: "60px 40px",
            maxWidth: "600px",
            textAlign: "center",
          }}
        >
          <CheckCircle2 size={80} color="#10b981" style={{ margin: "0 auto 24px" }} />
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              color: "#1A1A1A",
              marginBottom: "12px",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {t.reportSubmitted}
          </h1>
          <p
            style={{
              fontSize: "1.1rem",
              color: "#666",
              lineHeight: 1.6,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {t.thankYou} {fullName}. {t.successMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F2EFE9",
        padding: "40px 20px",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "48px", position: "relative" }}>
          {/* Language Selector */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              display: "flex",
              gap: "8px",
              alignItems: "center",
            }}
          >
            <Languages size={20} color="#6B1A2A" />
            <button
              onClick={() => setLang("fr")}
              style={{
                padding: "8px 16px",
                border: lang === "fr" ? "2px solid #6B1A2A" : "1px solid #D4CFC5",
                background: lang === "fr" ? "rgba(107,26,42,0.1)" : "#fff",
                color: lang === "fr" ? "#6B1A2A" : "#666",
                fontSize: "0.9rem",
                fontWeight: lang === "fr" ? 700 : 500,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              FR
            </button>
            <button
              onClick={() => setLang("en")}
              style={{
                padding: "8px 16px",
                border: lang === "en" ? "2px solid #6B1A2A" : "1px solid #D4CFC5",
                background: lang === "en" ? "rgba(107,26,42,0.1)" : "#fff",
                color: lang === "en" ? "#6B1A2A" : "#666",
                fontSize: "0.9rem",
                fontWeight: lang === "en" ? 700 : 500,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              EN
            </button>
          </div>

          <h1
            style={{
              fontSize: "2.5rem",
              fontWeight: 700,
              color: "#6B1A2A",
              marginBottom: "12px",
              letterSpacing: "-0.02em",
            }}
          >
            {t.pageTitle}
          </h1>
          <p style={{ fontSize: "1.1rem", color: "#666", lineHeight: 1.6 }}>{t.pageSubtitle}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              background: "#fff",
              border: "1px solid #D4CFC5",
              padding: "40px",
            }}
          >
            {/* 1. Identification */}
            <Section icon={<UserCheck size={24} color="#6B1A2A" />} title={t.whoAreYou}>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => handleNameSearch(e.target.value)}
                  placeholder={t.typeName}
                  required
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "1px solid #D4CFC5",
                    background: "#fff",
                    fontSize: "1rem",
                    fontFamily: "'DM Sans', sans-serif",
                    outline: "none",
                    color: "#000",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#6B1A2A")}
                  onBlur={(e) => (e.target.style.borderColor = "#D4CFC5")}
                />
                {loadingSearch && (
                  <Loader2
                    size={20}
                    style={{
                      position: "absolute",
                      right: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                )}
                {suggestions.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      background: "#fff",
                      border: "1px solid #D4CFC5",
                      zIndex: 10,
                      maxHeight: "240px",
                      overflow: "auto",
                    }}
                  >
                    {suggestions.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => handleSuggestionPick(s)}
                        style={{
                          padding: "12px 16px",
                          cursor: "pointer",
                          borderBottom: "1px solid #E8E4DC",
                          background: "#fff",
                          color: "#000",
                          fontSize: "1rem",
                          fontWeight: 500,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#6B1A2A";
                          e.currentTarget.style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#fff";
                          e.currentTarget.style.color = "#000";
                        }}
                      >
                        {s.full_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Section>

            {teamId && (
              <>
                {/* 2. Projets */}
                <Section icon={<FolderKanban size={24} color="#6B1A2A" />} title={t.selectProjects}>
                  {projects.length === 0 ? (
                    <p style={{ color: "#999", fontSize: "0.95rem" }}>{t.noProjects}</p>
                  ) : (
                    <div style={{ display: "grid", gap: "12px" }}>
                      {projects.map((project) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          selected={selectedProjects.some((p) => p.id === project.id)}
                          onToggle={() => handleProjectToggle(project)}
                        />
                      ))}
                    </div>
                  )}
                </Section>

                {/* 3. Tâches */}
                {selectedProjects.length > 0 && (
                  <Section icon={<ListChecks size={24} color="#6B1A2A" />} title={t.validatedTasks}>
                    {tasks.filter((t) => selectedProjects.some((p) => p.id === t.project_id))
                      .length === 0 ? (
                      <p style={{ color: "#999", fontSize: "0.95rem" }}>
                        Aucune tâche disponible pour les projets sélectionnés.
                      </p>
                    ) : (
                      <div style={{ display: "grid", gap: "10px" }}>
                        {tasks
                          .filter((t) => selectedProjects.some((p) => p.id === t.project_id))
                          .map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              selected={selectedTaskIds.includes(task.id)}
                              onToggle={() => handleTaskToggle(task.id)}
                            />
                          ))}
                      </div>
                    )}
                    <div style={{ marginTop: "20px" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.9rem",
                          fontWeight: 600,
                          color: "#444",
                          marginBottom: "8px",
                        }}
                      >
                        {t.additionalMessage}
                      </label>
                      <textarea
                        value={extraMessage}
                        onChange={(e) => setExtraMessage(e.target.value)}
                        placeholder={t.additionalMessagePlaceholder}
                        rows={3}
                        style={{
                          width: "100%",
                          padding: "12px 16px",
                          border: "1px solid #D4CFC5",
                          background: "#fff",
                          fontSize: "0.95rem",
                          fontFamily: "'DM Sans', sans-serif",
                          resize: "vertical",
                          outline: "none",
                          color: "#000",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#6B1A2A")}
                        onBlur={(e) => (e.target.style.borderColor = "#D4CFC5")}
                      />
                    </div>
                  </Section>
                )}

                {/* 4. Challenges */}
                <Section icon={<Lightbulb size={24} color="#6B1A2A" />} title={t.challenges}>
                  <textarea
                    value={challenges}
                    onChange={(e) => setChallenges(e.target.value)}
                    placeholder={t.challengesPlaceholder}
                    rows={4}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "1px solid #D4CFC5",
                      background: "#fff",
                      fontSize: "0.95rem",
                      fontFamily: "'DM Sans', sans-serif",
                      resize: "vertical",
                      outline: "none",
                      color: "#000",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#6B1A2A")}
                    onBlur={(e) => (e.target.style.borderColor = "#D4CFC5")}
                  />
                </Section>

                {/* 5. À apprendre */}
                <Section icon={<BookOpen size={24} color="#6B1A2A" />} title={t.learningNeeds}>
                  <textarea
                    value={neededLearning}
                    onChange={(e) => setNeededLearning(e.target.value)}
                    placeholder={t.learningNeedsPlaceholder}
                    rows={4}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "1px solid #D4CFC5",
                      background: "#fff",
                      fontSize: "0.95rem",
                      fontFamily: "'DM Sans', sans-serif",
                      resize: "vertical",
                      outline: "none",
                      color: "#000",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#6B1A2A")}
                    onBlur={(e) => (e.target.style.borderColor = "#D4CFC5")}
                  />
                </Section>

                {/* 6. Objectifs de demain */}
                <Section icon={<Target size={24} color="#6B1A2A" />} title={t.tomorrowGoals}>
                  <textarea
                    value={tomorrowBuild}
                    onChange={(e) => setTomorrowBuild(e.target.value)}
                    placeholder={t.tomorrowGoalsPlaceholder}
                    rows={4}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "1px solid #D4CFC5",
                      background: "#fff",
                      fontSize: "0.95rem",
                      fontFamily: "'DM Sans', sans-serif",
                      resize: "vertical",
                      outline: "none",
                      color: "#000",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#6B1A2A")}
                    onBlur={(e) => (e.target.style.borderColor = "#D4CFC5")}
                  />
                </Section>

                {/* 7. Évaluations */}
                {teammates.length > 0 && (
                  <Section icon={<Users size={24} color="#6B1A2A" />} title={t.evaluateTeammates}>
                    <div style={{ display: "grid", gap: "24px" }}>
                      {teammates.map((teammate) => (
                        <EvaluationCard
                          key={teammate.id}
                          teammate={teammate}
                          evaluation={evaluations[teammate.id]}
                          onChange={(field, value) =>
                            handleEvaluationChange(teammate.id, field, value)
                          }
                        />
                      ))}
                    </div>
                  </Section>
                )}
              </>
            )}

            {/* Error */}
            {error && (
              <div
                style={{
                  padding: "14px 16px",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid #ef4444",
                  color: "#dc2626",
                  fontSize: "0.95rem",
                  marginTop: "24px",
                }}
              >
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !teamId}
              style={{
                width: "100%",
                padding: "16px",
                background: submitting || !teamId ? "#ccc" : "#6B1A2A",
                color: "#fff",
                border: "none",
                fontSize: "1.1rem",
                fontWeight: 700,
                cursor: submitting || !teamId ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                marginTop: "32px",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
                  {t.submitting}
                </>
              ) : (
                <>
                  <Send size={24} />
                  {t.submitReport}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

// ── Section Component ──────────────────────────────────────────────────────
function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "32px", paddingBottom: "32px", borderBottom: "1px solid #E8E4DC" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        {icon}
        <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#1A1A1A", margin: 0 }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

// ── ProjectCard Component ──────────────────────────────────────────────────
function ProjectCard({
  project,
  selected,
  onToggle,
}: {
  project: Project;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        padding: "16px 20px",
        border: selected ? "2px solid #6B1A2A" : "1px solid #D4CFC5",
        cursor: "pointer",
        background: selected ? "rgba(107,26,42,0.05)" : "#fff",
        display: "flex",
        alignItems: "center",
        gap: "16px",
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = "#6B1A2A";
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = "#D4CFC5";
        }
      }}
    >
      <div
        style={{
          width: "20px",
          height: "20px",
          border: selected ? "2px solid #6B1A2A" : "2px solid #ccc",
          background: selected ? "#6B1A2A" : "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {selected && <CheckCircle2 size={14} color="#fff" />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: "1rem", color: "#1A1A1A", marginBottom: "4px" }}>
          {project.name}
        </div>
        <div style={{ fontSize: "0.85rem", color: "#666" }}>{project.description}</div>
      </div>
    </div>
  );
}

// ── TaskCard Component ─────────────────────────────────────────────────────
function TaskCard({
  task,
  selected,
  onToggle,
}: {
  task: { id: number; title: string; status: string };
  selected: boolean;
  onToggle: () => void;
}) {
  const statusColors: Record<string, { bg: string; color: string }> = {
    "à faire": { bg: "rgba(209, 213, 219, 0.1)", color: "#6B7280" },
    "en cours": { bg: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" },
    review: { bg: "#8a5cf639", color: "#8b5cf6" },
    terminée: { bg: "rgba(16, 185, 129, 0.1)", color: "#10b981" },
  };
  const statusStyle = statusColors[task.status] || statusColors["à faire"];

  return (
    <div
      onClick={onToggle}
      style={{
        padding: "12px 16px",
        border: selected ? "2px solid #6B1A2A" : "1px solid #D4CFC5",
        cursor: "pointer",
        background: selected ? "rgba(107,26,42,0.05)" : "#fff",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = "#6B1A2A";
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = "#D4CFC5";
        }
      }}
    >
      <div
        style={{
          width: "18px",
          height: "18px",
          border: selected ? "2px solid #6B1A2A" : "2px solid #ccc",
          background: selected ? "#6B1A2A" : "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {selected && <CheckCircle2 size={12} color="#fff" />}
      </div>
      <div style={{ flex: 1, fontSize: "0.95rem", color: "#1A1A1A" }}>{task.title}</div>
      <span
        style={{
          padding: "4px 12px",
          fontSize: "0.7rem",
          fontWeight: 600,
          background: statusStyle.bg,
          color: statusStyle.color,
          border: `1px solid ${statusStyle.color}`,
        }}
      >
        {task.status}
      </span>
    </div>
  );
}

// ── EvaluationCard Component ───────────────────────────────────────────────
function EvaluationCard({
  teammate,
  evaluation,
  onChange,
}: {
  teammate: Teammate;
  evaluation: Evaluation | undefined;
  onChange: (field: keyof Omit<Evaluation, "evaluated_id">, value: number | string) => void;
}) {
  const criteria = [
    { id: "communication" as const, label: "Communication" },
    { id: "collaboration" as const, label: "Collaboration" },
    { id: "punctuality" as const, label: "Ponctualité" },
  ];

  return (
    <div
      style={{
        padding: "20px",
        background: "#F9F9F9",
        border: "1px solid #D4CFC5",
      }}
    >
      <h4 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#1A1A1A", marginBottom: "16px" }}>
        {teammate.full_name}
      </h4>
      {criteria.map((criterion) => (
        <div key={criterion.id} style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.9rem",
              fontWeight: 500,
              color: "#444",
              marginBottom: "8px",
            }}
          >
            {criterion.label}
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => onChange(criterion.id, rating)}
                style={{
                  width: "40px",
                  height: "40px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <Star
                  size={32}
                  fill={evaluation && evaluation[criterion.id] >= rating ? "#fbbf24" : "none"}
                  color={evaluation && evaluation[criterion.id] >= rating ? "#fbbf24" : "#ccc"}
                />
              </button>
            ))}
          </div>
        </div>
      ))}
      <div style={{ marginTop: "16px" }}>
        <label
          style={{
            display: "block",
            fontSize: "0.9rem",
            fontWeight: 500,
            color: "#444",
            marginBottom: "8px",
          }}
        >
          Commentaire (optionnel)
        </label>
        <textarea
          value={evaluation?.comment || ""}
          onChange={(e) => onChange("comment", e.target.value)}
          placeholder="Ajoutez un commentaire..."
          rows={2}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid #D4CFC5",
            background: "#fff",
            fontSize: "0.9rem",
            fontFamily: "'DM Sans', sans-serif",
            resize: "vertical",
            outline: "none",
            color: "#000",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#6B1A2A")}
          onBlur={(e) => (e.target.style.borderColor = "#D4CFC5")}
        />
      </div>
    </div>
  );
}
