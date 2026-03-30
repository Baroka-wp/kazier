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

import WelcomeScreen from "./WelcomeScreen";
import FormScreen from "./FormScreen";
import ReviewScreen from "./ReviewScreen";
import SuccessScreen from "./SuccessScreen";
import { QUESTIONS_GLOBAL } from "./questions";

type Suggestion = { id: number; full_name: string };
type Citation = { quote: string; author: string };

export type Project = {
  id: number;
  name: string;
  description: string;
  icon: string;
};

export type Evaluation = {
  evaluated_id: number;
  communication: number;
  collaboration: number;
  punctuality: number;
  comment: string;
};

// ── Reducer évaluations ────────────────────────────────────────────────────────
// Regroupe teammates + evaluations dans un seul state pour éviter
// les appels setState multiples dans le useEffect (react-hooks/set-state-in-effect)

type Teammate = { id: number; full_name: string };

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
      // Nouveau set de coéquipiers → évaluations remises à zéro en même temps
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

// ── Composant principal ────────────────────────────────────────────────────────

export default function DailyForm() {
  const [step, setStep] = useState(-1); // -1 = welcome
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [fading, setFading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [editingFromReview, setEditingFromReview] = useState(false);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [blockReason, setBlockReason] = useState<"not_found" | "already_submitted" | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [citations, setCitations] = useState<Citation[]>([]);

  // ── Projets & tâches ───────────────────────────────────────────────────────
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Awaited<ReturnType<typeof getTasksByMember>>>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);

  // ── Évaluations — un seul dispatch pour teammates + evaluations ────────────
  const [evalState, dispatch] = useReducer(evalReducer, evalInitial);
  const teammates = evalState.teammates;
  const evaluations = evalState.evaluations;

  // ── Recharger les coéquipiers dès que selectedProjects ou teamId change ────
  // Un seul dispatch → un seul re-render, pas de cascading setState
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

  // ── Projets ────────────────────────────────────────────────────────────────

  async function loadProjects(team_id: number) {
    const [projectsResult, tasksResult] = await Promise.all([
      getProjectsByMember(team_id),
      getTasksByMember(team_id),
    ]);
    setProjects(projectsResult);
    setTasks(tasksResult);
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

  // ── Navigation ─────────────────────────────────────────────────────────────

  async function go(next: number) {
    if (step === 0) {
      if (!teamId) {
        setBlockReason("not_found");
        return;
      }
      const alreadySubmitted = await checkAlreadySubmitted(teamId);
      if (alreadySubmitted) {
        setBlockReason("already_submitted");
        setTimeout(() => {
          setBlockReason(null);
          setAnswers({});
          setTeamId(null);
          setStep(-1);
        }, 3000);
        return;
      }
    }

    if (step === 1) {
      if (selectedProjects.length === 0) {
        setBlockReason("not_found");
        return;
      }
    }

    setBlockReason(null);
    setFading(true);

    if (editingFromReview) {
      setTimeout(() => {
        setReviewing(true);
        setEditingFromReview(false);
        setFading(false);
      }, 180);
      return;
    }

    if (next < 0) {
      setTimeout(() => {
        setStep(-1);
        setFading(false);
      }, 180);
      return;
    }

    setTimeout(() => {
      setStep(next);
      setFading(false);
    }, 180);
  }

  async function handleAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setBlockReason(null);
    if (id === "full_name") {
      setLoadingSearch(true);
      const results = await searchNames(value);
      setSuggestions(results);
      setLoadingSearch(false);
    }
  }

  function handleSuggestionPick(suggestion: Suggestion) {
    setTeamId(suggestion.id);
    setAnswers((prev) => ({ ...prev, full_name: suggestion.full_name }));
    setSuggestions([]);
    setBlockReason(null);
    loadProjects(suggestion.id);
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  function isValid(): boolean {
    const q = QUESTIONS_GLOBAL[step];
    if (!q) return false;

    if (q.type === "projects") return selectedProjects.length > 0;

    if (q.type === "tasks") {
      const hasTask = selectedTaskIds.length > 0;
      const hasMessage = (answers["extra_message"] || "").replace(/<[^>]*>/g, "").trim().length > 0;
      return hasTask || hasMessage;
    }

    if (q.type === "evaluations") {
      if (teammates.length === 0) return true;
      return teammates.every((m) => {
        const e = evaluations[m.id];
        return e && e.communication > 0 && e.collaboration > 0 && e.punctuality > 0;
      });
    }

    const val = answers[q.id] || "";
    return val.replace(/<[^>]*>/g, "").trim().length > 0;
  }

  // ── Soumission ─────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!teamId) {
      return setBlockReason("not_found");
    }

    const result = await sendToSlack({
      team_id: teamId,
      full_name: answers["full_name"],
      projects: selectedProjects.map((p) => p.name),
      validated_tasks: selectedTaskIds,
      challenges: answers["challenges"] || "",
      needed_learning: answers["needed_learning"] || "",
      tomorrow_build: answers["tomorrow_build"] || "",
      extra_message: answers["extra_message"] || "",
    });

    if (!result.success) {
      return result;
    }

    const evalList = Object.values(evaluations).filter(
      (e) => e.communication > 0 && e.collaboration > 0 && e.punctuality > 0
    );
    await saveEvaluations(teamId, evalList);

    setDone(true);
    setConfetti(true);
    setTimeout(() => setConfetti(false), 3000);
  }

  // ── Routing ────────────────────────────────────────────────────────────────

  if (done)
    return (
      <SuccessScreen
        answers={answers}
        confetti={confetti}
        preloadedCitations={citations}
        onReset={() => {
          setDone(false);
          setAnswers({});
          setStep(-1);
          setTeamId(null);
          setReviewing(false);
          setCitations([]);
          setSelectedProjects([]);
          setSelectedTaskIds([]);
          dispatch({ type: "RESET" });
        }}
      />
    );

  if (step === -1) return <WelcomeScreen onStart={() => go(0)} />;

  if (reviewing)
    return (
      <ReviewScreen
        answers={answers}
        selectedProjects={selectedProjects}
        selectedTaskIds={selectedTaskIds}
        tasks={tasks}
        teammates={teammates}
        evaluations={evaluations}
        onEdit={(questionIndex) => {
          setReviewing(false);
          setEditingFromReview(true);
          setStep(questionIndex);
        }}
        onBack={() => setReviewing(false)}
        onSubmit={handleSubmit}
        onCitationsReady={(c) => setCitations(c)}
      />
    );

  return (
    <FormScreen
      step={step}
      answers={answers}
      fading={fading}
      blockReason={blockReason}
      suggestions={suggestions}
      isValid={isValid()}
      onGo={go}
      onAnswer={handleAnswer}
      onSuggestionPick={handleSuggestionPick}
      onReview={() => setReviewing(true)}
      loadingSearch={loadingSearch}
      projects={projects}
      selectedProjects={selectedProjects}
      onProjectToggle={handleProjectToggle}
      tasks={tasks}
      selectedTaskIds={selectedTaskIds}
      onTaskToggle={handleTaskToggle}
      teammates={teammates}
      evaluations={evaluations}
      onEvaluationChange={handleEvaluationChange}
    />
  );
}
