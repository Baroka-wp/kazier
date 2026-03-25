"use client";

import { useEffect } from "react";
import { ClipboardEdit } from "lucide-react";
import { BRAND } from "./questions";
import Screen from "./Screen";
import SubmitButton from "./SubmitButton";
import type { Project, Evaluation } from "./index";

type Task = {
  id: number;
  title: string;
  project_id: number;
  priority: string;
  status: string;
  due_date: string | null;
};

type Citation = { quote: string; author: string };

type Props = {
  answers: Record<string, string>;
  selectedProjects: Project[];
  selectedTaskIds: number[];
  tasks: Task[];
  teammates: { id: number; full_name: string }[];
  evaluations: Record<number, Evaluation>;
  onEdit: (questionIndex: number) => void;
  onBack: () => void;
  onSubmit: () => Promise<void>;
  onCitationsReady: (citations: Citation[]) => void;
};

const FALLBACK_CITATIONS: Citation[] = [
  {
    quote: "Le succès, c'est d'aller d'échec en échec sans perdre son enthousiasme.",
    author: "Winston Churchill",
  },
  {
    quote: "La vie, c'est comme une bicyclette, il faut avancer pour ne pas perdre l'équilibre.",
    author: "Albert Einstein",
  },
  {
    quote: "Le seul moyen de faire du bon travail est d'aimer ce que vous faites.",
    author: "Steve Jobs",
  },
];

const priorityColor = (p: string) =>
  p === "high" ? "#EF4444" : p === "medium" ? "#F59E0B" : "#22C55E";

const statusLabel = (s: string) =>
  s === "à faire" ? "À faire" : s === "en cours" ? "En cours" : "Terminé";

// ── Section row ───────────────────────────────────────────────────────────────

function SectionBlock({
  short,
  questionIndex,
  isEmpty,
  children,
  onEdit,
}: {
  short: string;
  questionIndex: number;
  isEmpty: boolean;
  children: React.ReactNode;
  onEdit: (idx: number) => void;
}) {
  return (
    <div
      style={{
        borderRadius: "16px",
        border: "1px solid rgba(0,0,0,0.07)",
        overflow: "hidden",
        background: "#fff",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 16px",
          background: `${BRAND}08`,
          borderBottom: `1px solid ${BRAND}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: BRAND,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}
          >
            {short}
          </span>
          {isEmpty && (
            <span
              style={{
                fontSize: "10px",
                color: "#F59E0B",
                fontWeight: 600,
                background: "rgba(245,158,11,0.1)",
                padding: "2px 8px",
                borderRadius: "10px",
              }}
            >
              Non renseigné
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onEdit(questionIndex)}
          title="Modifier"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            borderRadius: "7px",
            color: "#999",
            display: "flex",
            alignItems: "center",
            transition: "color 0.15s, background 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = BRAND;
            e.currentTarget.style.background = `${BRAND}12`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#999";
            e.currentTarget.style.background = "none";
          }}
        >
          <ClipboardEdit size={15} />
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: "14px 16px", background: "#F5F2ED" }}>
        {isEmpty ? (
          <p style={{ fontSize: "0.83rem", color: "#bbb", fontStyle: "italic", margin: 0 }}>
            Non renseigné
          </p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function ReviewScreen({
  answers,
  selectedProjects,
  selectedTaskIds,
  tasks,
  teammates,
  evaluations,
  onEdit,
  onBack,
  onSubmit,
  onCitationsReady,
}: Props) {
  const selectedTasks = tasks.filter((t) => selectedTaskIds.includes(t.id));
  const tasksByProject = selectedProjects
    .map((p) => ({ project: p, tasks: selectedTasks.filter((t) => t.project_id === p.id) }))
    .filter((g) => g.tasks.length > 0);

  useEffect(() => {
    fetch("/api/citation")
      .then((r) => r.json())
      .then((data) => onCitationsReady(data))
      .catch(() => onCitationsReady(FALLBACK_CITATIONS));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen>
      <div className="w-full max-w-xl mx-auto" style={{ display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6" style={{ flexShrink: 0 }}>
          <img src="/africa-samurai-logo.png" alt="Africa Samurai" className="h-12" />
          <span className="text-xs text-[#666666] capitalize">
            {new Date().toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>

        <h2 className="text-2xl font-bold text-[#1A1A1A] mb-1">Vérifiez votre rapport</h2>
        <p className="text-sm text-[#666666] mb-5">
          Tout est correct ? Modifiez avant d&apos;envoyer.
        </p>

        {/* All sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Nom */}
          <SectionBlock
            short="Nom"
            questionIndex={0}
            isEmpty={!answers["full_name"]}
            onEdit={onEdit}
          >
            <p style={{ fontSize: "1rem", fontWeight: 600, color: "#1A1A1A", margin: 0 }}>
              {answers["full_name"]}
            </p>
          </SectionBlock>

          {/* Projets */}
          <SectionBlock
            short="Projets"
            questionIndex={1}
            isEmpty={selectedProjects.length === 0}
            onEdit={onEdit}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {selectedProjects.map((p) => (
                <span
                  key={p.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 12px",
                    borderRadius: "20px",
                    background: `${BRAND}12`,
                    border: `1px solid ${BRAND}25`,
                    fontSize: "13px",
                    fontWeight: 600,
                    color: BRAND,
                  }}
                >
                  📁 {p.name}
                </span>
              ))}
            </div>
          </SectionBlock>

          {/* Tâches validées */}
          <SectionBlock
            short="Tâches validées"
            questionIndex={2}
            isEmpty={selectedTasks.length === 0}
            onEdit={onEdit}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {tasksByProject.map(({ project, tasks: ptasks }) => (
                <div key={project.id}>
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: BRAND,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: "6px",
                    }}
                  >
                    📁 {project.name}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                    {ptasks.map((task) => (
                      <div
                        key={task.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "7px 10px",
                          borderRadius: "10px",
                          background: "rgba(0,0,0,0.03)",
                          border: "1px solid rgba(0,0,0,0.05)",
                        }}
                      >
                        <span
                          style={{
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            background: priorityColor(task.priority),
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{ fontSize: "12px", fontWeight: 500, color: "#1A1A1A", flex: 1 }}
                        >
                          {task.title}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            color: "#666",
                            background: "rgba(0,0,0,0.05)",
                            padding: "2px 8px",
                            borderRadius: "20px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {statusLabel(task.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SectionBlock>

          {/* Message libre */}
          <SectionBlock
            short="Message libre"
            questionIndex={2}
            isEmpty={!answers["extra_message"]?.replace(/<[^>]*>/g, "").trim()}
            onEdit={onEdit}
          >
            <div
              className="prose prose-sm max-w-none"
              style={{ fontSize: "0.85rem", color: "#1A1A1A", lineHeight: 1.7 }}
              dangerouslySetInnerHTML={{ __html: answers["extra_message"] || "" }}
            />
          </SectionBlock>

          {/* Challenges */}
          <SectionBlock
            short="Challenges"
            questionIndex={3}
            isEmpty={!answers["challenges"]?.replace(/<[^>]*>/g, "").trim()}
            onEdit={onEdit}
          >
            <div
              className="prose prose-sm max-w-none"
              style={{ fontSize: "0.85rem", color: "#1A1A1A", lineHeight: 1.7 }}
              dangerouslySetInnerHTML={{ __html: answers["challenges"] || "" }}
            />
          </SectionBlock>

          {/* À apprendre */}
          <SectionBlock
            short="À apprendre"
            questionIndex={4}
            isEmpty={!answers["needed_learning"]?.replace(/<[^>]*>/g, "").trim()}
            onEdit={onEdit}
          >
            <div
              className="prose prose-sm max-w-none"
              style={{ fontSize: "0.85rem", color: "#1A1A1A", lineHeight: 1.7 }}
              dangerouslySetInnerHTML={{ __html: answers["needed_learning"] || "" }}
            />
          </SectionBlock>

          {/* Demain */}
          <SectionBlock
            short="Demain"
            questionIndex={5}
            isEmpty={!answers["tomorrow_build"]?.replace(/<[^>]*>/g, "").trim()}
            onEdit={onEdit}
          >
            <div
              className="prose prose-sm max-w-none"
              style={{ fontSize: "0.85rem", color: "#1A1A1A", lineHeight: 1.7 }}
              dangerouslySetInnerHTML={{ __html: answers["tomorrow_build"] || "" }}
            />
          </SectionBlock>

          {/* Évaluations */}
          <SectionBlock
            short="Évaluations"
            questionIndex={6}
            isEmpty={teammates.length === 0 || Object.keys(evaluations).length === 0}
            onEdit={onEdit}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {teammates.length === 0 ? (
                <p style={{ fontSize: "0.83rem", color: "#bbb", fontStyle: "italic", margin: 0 }}>
                  Aucun coéquipier sur ces projets
                </p>
              ) : (
                teammates.map((m) => {
                  const e = evaluations[m.id];
                  if (!e)
                    return (
                      <div
                        key={m.id}
                        style={{
                          padding: "10px 14px",
                          borderRadius: "12px",
                          background: "rgba(245,158,11,0.05)",
                          border: "1px solid rgba(245,158,11,0.2)",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "9px",
                            background: "rgba(0,0,0,0.06)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#999",
                            flexShrink: 0,
                          }}
                        >
                          {m.full_name
                            .split(" ")
                            .map((n) => n[0] || "")
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <span
                          style={{ fontSize: "13px", fontWeight: 600, color: "#1A1A1A", flex: 1 }}
                        >
                          {m.full_name}
                        </span>
                        <span style={{ fontSize: "10px", color: "#F59E0B", fontWeight: 600 }}>
                          ⚠ Non évalué
                        </span>
                      </div>
                    );

                  return (
                    <div
                      key={m.id}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "14px",
                        background: "#fff",
                        border: `1px solid ${BRAND}20`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          marginBottom: "10px",
                        }}
                      >
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "9px",
                            background: `${BRAND}18`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: BRAND,
                            flexShrink: 0,
                          }}
                        >
                          {m.full_name
                            .split(" ")
                            .map((n) => n[0] || "")
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#1A1A1A" }}>
                          {m.full_name}
                        </span>
                        <span
                          style={{
                            marginLeft: "auto",
                            fontSize: "10px",
                            color: BRAND,
                            fontWeight: 600,
                            background: `${BRAND}10`,
                            padding: "2px 8px",
                            borderRadius: "10px",
                          }}
                        >
                          ✓ Évalué
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "12px",
                          marginBottom: e.comment ? "10px" : 0,
                        }}
                      >
                        {[
                          { label: "Communication", emoji: "📢", val: e.communication },
                          { label: "Collaboration", emoji: "🤝", val: e.collaboration },
                          { label: "Ponctualité", emoji: "⏰", val: e.punctuality },
                        ].map(({ label, emoji, val }) => (
                          <div
                            key={label}
                            style={{
                              flex: 1,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "2px",
                              padding: "8px 4px",
                              borderRadius: "10px",
                              background: "rgba(0,0,0,0.02)",
                              border: "1px solid rgba(0,0,0,0.04)",
                            }}
                          >
                            <span style={{ fontSize: "14px" }}>{emoji}</span>
                            <span style={{ fontSize: "16px", fontWeight: 700, color: BRAND }}>
                              {val}
                            </span>
                            <span
                              style={{
                                fontSize: "9px",
                                color: "#aaa",
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                              }}
                            >
                              {label}
                            </span>
                          </div>
                        ))}
                      </div>

                      {e.comment && e.comment.replace(/<[^>]*>/g, "").trim() && (
                        <div style={{ borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: "8px" }}>
                          <div
                            className="prose prose-sm"
                            style={{ fontSize: "12px", color: "#555", lineHeight: 1.6 }}
                            dangerouslySetInnerHTML={{ __html: e.comment }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </SectionBlock>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6 mb-2" style={{ flexShrink: 0 }}>
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 rounded-2xl font-semibold cursor-pointer transition-all bg-black/[0.04] text-[#666666] border border-black/7 hover:bg-black/[0.07] hover:text-[#1A1A1A]"
          >
            ←
          </button>
          <SubmitButton disabled={false} onClick={onSubmit} />
        </div>
      </div>
    </Screen>
  );
}
