import { useState } from "react";
import { BRAND, QUESTIONS_GLOBAL } from "./questions";
import Screen from "./Screen";
import RichTextArea from "./RichTextArea";
import type { Project, Evaluation } from "./index";

type Task = {
  id: number;
  title: string;
  project_id: number;
  priority: string;
  status: string;
  due_date: string | null;
};

type Props = {
  step: number;
  answers: Record<string, string>;
  fading: boolean;
  blockReason: "not_found" | "already_submitted" | null;
  suggestions: { id: number; full_name: string }[];
  isValid: boolean;
  onGo: (next: number) => void;
  onAnswer: (id: string, value: string) => void;
  onSuggestionPick: (suggestion: { id: number; full_name: string }) => void;
  onReview: () => void;
  loadingSearch: boolean;
  projects?: Project[];
  selectedProjects?: Project[];
  onProjectToggle?: (project: Project) => void;
  tasks: Task[];
  selectedTaskIds?: number[];
  onTaskToggle?: (taskId: number) => void;
  // ── Évaluations ────────────────────────────────────────────────────────────
  teammates?: { id: number; full_name: string }[];
  evaluations?: Record<number, Evaluation>;
  onEvaluationChange?: (
    evaluated_id: number,
    field: keyof Omit<Evaluation, "evaluated_id">,
    value: number | string
  ) => void;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const priorityColor = (p: string) =>
  p === "high" ? "#EF4444" : p === "medium" ? "#F59E0B" : "#22C55E";

const statusLabel = (s: string) =>
  s === "à faire" ? "À faire" : s === "en cours" ? "En cours" : "Terminé";

function formatDueDate(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const [dp, tp] = raw.split(" ");
    const [y, mo, d] = dp.split("-").map(Number);
    const [h = 0, mi = 0] = (tp || "").split(":").map(Number);
    const dateLabel = new Date(y, mo - 1, d).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const timeLabel = `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
    return `${dateLabel} ${timeLabel}`;
  } catch {
    return null;
  }
}

// ── Modale tâches ─────────────────────────────────────────────────────────────

function TasksModal({
  project,
  tasks,
  onClose,
}: {
  project: Project;
  tasks: Task[];
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "480px",
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 60px rgba(0,0,0,0.2)",
          animation: "popIn 0.2s ease",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "18px" }}>📁</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1A1A1A" }}>
              {project.name}
            </div>
            <div style={{ fontSize: "0.7rem", color: "#aaa" }}>
              {tasks.length} tâche{tasks.length > 1 ? "s" : ""} assignée
              {tasks.length > 1 ? "s" : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              border: "1px solid rgba(0,0,0,0.08)",
              background: "#F5F2ED",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#888",
              fontSize: "13px",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
        <div
          style={{
            overflowY: "auto",
            padding: "12px 20px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {tasks.map((task) => (
            <div
              key={task.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                borderRadius: "12px",
                background: "rgba(0,0,0,0.02)",
                border: "1px solid rgba(0,0,0,0.05)",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: priorityColor(task.priority),
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: "13px", color: "#1A1A1A", flex: 1, fontWeight: 500 }}>
                {task.title}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "#666",
                    background: "rgba(0,0,0,0.05)",
                    padding: "3px 8px",
                    borderRadius: "20px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {statusLabel(task.status)}
                </span>
                {task.due_date && (
                  <span style={{ fontSize: "10px", color: "#999", whiteSpace: "nowrap" }}>
                    📅 {formatDueDate(task.due_date)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes popIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }`}</style>
    </div>
  );
}

// ── Badge tâches ──────────────────────────────────────────────────────────────

function TasksBadge({ tasks, onClick }: { tasks: Task[]; onClick: () => void }) {
  if (tasks.length === 0) return null;
  const highCount = tasks.filter((t) => t.priority === "high").length;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "3px 10px 3px 6px",
        borderRadius: "20px",
        background: highCount > 0 ? "rgba(239,68,68,0.08)" : "rgba(0,0,0,0.04)",
        border: `1px solid ${highCount > 0 ? "rgba(239,68,68,0.2)" : "rgba(0,0,0,0.08)"}`,
        cursor: "pointer",
        transition: "all 0.15s",
        fontSize: "11px",
        fontWeight: 600,
        color: highCount > 0 ? "#EF4444" : "#888",
        marginTop: "5px",
      }}
    >
      <span style={{ display: "flex", gap: "2px", alignItems: "center" }}>
        {tasks.slice(0, 4).map((t, i) => (
          <span
            key={i}
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: priorityColor(t.priority),
              display: "block",
            }}
          />
        ))}
        {tasks.length > 4 && (
          <span style={{ fontSize: "9px", color: "#aaa" }}>+{tasks.length - 4}</span>
        )}
      </span>
      <span>
        {tasks.length} tâche{tasks.length > 1 ? "s" : ""} →
      </span>
    </button>
  );
}

// ── Accordion projet avec pagination interne ──────────────────────────────────

const PAGE_SIZE = 4;

function ProjectTaskAccordion({
  project,
  tasks,
  selectedTaskIds,
  onTaskToggle,
  defaultOpen,
}: {
  project: Project;
  tasks: Task[];
  selectedTaskIds: number[];
  onTaskToggle: (id: number) => void;
  defaultOpen: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [page, setPage] = useState(1);

  const selectedCount = tasks.filter((t) => selectedTaskIds.includes(t.id)).length;
  const totalPages = Math.ceil(tasks.length / PAGE_SIZE);
  const visibleTasks = tasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div style={{ borderRadius: "16px", border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "12px 16px",
          background: isOpen ? `${BRAND}08` : "#fff",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          transition: "background 0.15s",
        }}
      >
        <span style={{ fontSize: "16px" }}>📁</span>
        <span style={{ flex: 1, fontWeight: 700, fontSize: "13px", color: BRAND }}>
          {project.name}
        </span>
        {selectedCount > 0 && (
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#fff",
              background: BRAND,
              padding: "2px 8px",
              borderRadius: "20px",
            }}
          >
            {selectedCount} ✓
          </span>
        )}
        <span style={{ fontSize: "11px", color: "#aaa" }}>
          {tasks.length} tâche{tasks.length > 1 ? "s" : ""}
        </span>
        <span
          style={{
            fontSize: "12px",
            color: "#999",
            display: "inline-block",
            transition: "transform 0.2s",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▾
        </span>
      </button>

      {isOpen && (
        <div style={{ background: "#fafafa" }}>
          <div
            style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: "6px" }}
          >
            {visibleTasks.map((task) => {
              const selected = selectedTaskIds.includes(task.id);
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onTaskToggle(task.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "9px 12px",
                    borderRadius: "12px",
                    border: `1px solid ${selected ? BRAND : "rgba(0,0,0,0.07)"}`,
                    background: selected ? `${BRAND}10` : "#fff",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      width: "17px",
                      height: "17px",
                      borderRadius: "5px",
                      flexShrink: 0,
                      border: `2px solid ${selected ? BRAND : "rgba(0,0,0,0.15)"}`,
                      background: selected ? BRAND : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s",
                    }}
                  >
                    {selected && (
                      <span style={{ color: "#fff", fontSize: "10px", lineHeight: 1 }}>✓</span>
                    )}
                  </div>
                  <span
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: priorityColor(task.priority),
                    }}
                  />
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      color: selected ? "#1A1A1A" : "#555",
                      flex: 1,
                    }}
                  >
                    {task.title}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "#666",
                      background: "rgba(0,0,0,0.05)",
                      padding: "2px 7px",
                      borderRadius: "20px",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {statusLabel(task.status)}
                  </span>
                </button>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 14px 12px",
                borderTop: "1px solid rgba(0,0,0,0.05)",
              }}
            >
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: "4px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(0,0,0,0.08)",
                  background: page === 1 ? "transparent" : "#fff",
                  color: page === 1 ? "#ccc" : "#666",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: page === 1 ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                ← Préc.
              </button>
              <span style={{ fontSize: "11px", color: "#aaa" }}>
                {page} / {totalPages}
                <span style={{ color: "#ccc", marginLeft: "4px" }}>
                  ({(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, tasks.length)} sur{" "}
                  {tasks.length})
                </span>
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: "4px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(0,0,0,0.08)",
                  background: page === totalPages ? "transparent" : "#fff",
                  color: page === totalPages ? "#ccc" : "#666",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: page === totalPages ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                Suiv. →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sélection tâches validées + message libre ─────────────────────────────────

function TasksStep({
  tasks,
  selectedProjects,
  selectedTaskIds,
  onTaskToggle,
  extraMessage,
  onExtraMessage,
}: {
  tasks: Task[];
  selectedProjects: Project[];
  selectedTaskIds: number[];
  onTaskToggle: (id: number) => void;
  extraMessage: string;
  onExtraMessage: (val: string) => void;
}) {
  const relevantTasks = tasks.filter((t) => selectedProjects.some((p) => p.id === t.project_id));

  const byProject = selectedProjects
    .map((project) => ({
      project,
      tasks: relevantTasks.filter((t) => t.project_id === project.id),
    }))
    .filter((g) => g.tasks.length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {byProject.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {byProject.map(({ project, tasks: projectTasks }, i) => (
            <ProjectTaskAccordion
              key={project.id}
              project={project}
              tasks={projectTasks}
              selectedTaskIds={selectedTaskIds}
              onTaskToggle={onTaskToggle}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            padding: "20px 24px",
            borderRadius: "16px",
            background: "rgba(107,26,42,0.04)",
            border: "1px dashed rgba(107,26,42,0.2)",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "22px", marginBottom: "6px" }}>📭</p>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#1A1A1A", marginBottom: "4px" }}>
            Aucune tâche assignée
          </p>
          <p style={{ fontSize: "12px", color: "#888" }}>
            Décrivez ce que vous avez accompli dans le champ ci-dessous.
          </p>
        </div>
      )}

      <div
        style={{
          borderRadius: "16px",
          border: "1px solid rgba(0,0,0,0.07)",
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <div
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid rgba(0,0,0,0.05)",
            background: `${BRAND}06`,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "14px" }}>💬</span>
          <span style={{ fontSize: "12px", fontWeight: 600, color: BRAND }}>Message libre</span>
          <span
            style={{ fontSize: "10px", color: "#aaa", marginLeft: "auto", fontStyle: "italic" }}
          >
            optionnel
          </span>
        </div>
        <div style={{ padding: "8px" }}>
          <RichTextArea value={extraMessage} onChange={onExtraMessage} />
        </div>
      </div>
    </div>
  );
}

// ── Notation étoiles ──────────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      <span
        style={{
          fontSize: "10px",
          fontWeight: 700,
          color: "#888",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(star)}
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "9px",
              border: `1.5px solid ${active >= star ? BRAND : "rgba(0,0,0,0.1)"}`,
              background: active >= star ? `${BRAND}15` : "transparent",
              fontSize: "15px",
              cursor: "pointer",
              transition: "all 0.12s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: active >= star ? BRAND : "#ccc", lineHeight: 1 }}>★</span>
          </button>
        ))}
        <span style={{ fontSize: "11px", color: "#bbb", marginLeft: "4px", minWidth: "24px" }}>
          {value > 0 ? `${value}/5` : "—"}
        </span>
      </div>
    </div>
  );
}

// ── Accordion évaluation par coéquipier ───────────────────────────────────────

function EvalAccordion({
  member,
  evaluation,
  onChange,
  isComplete,
}: {
  member: { id: number; full_name: string };
  evaluation: Evaluation | undefined;
  onChange: (field: keyof Omit<Evaluation, "evaluated_id">, value: number | string) => void;
  isComplete: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ev = evaluation ?? {
    evaluated_id: member.id,
    communication: 0,
    collaboration: 0,
    punctuality: 0,
    comment: "",
  };

  const initials = member.full_name
    .split(" ")
    .map((n) => n[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      style={{
        borderRadius: "16px",
        border: `1.5px solid ${isComplete ? `${BRAND}35` : "rgba(0,0,0,0.07)"}`,
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
    >
      {/* Header accordion */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "12px 16px",
          background: isComplete ? `${BRAND}06` : "#fff",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          transition: "background 0.15s",
        }}
      >
        {/* Avatar initiales */}
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: isComplete ? `${BRAND}20` : "rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: "13px",
            fontWeight: 700,
            color: isComplete ? BRAND : "#999",
            transition: "all 0.2s",
          }}
        >
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#1A1A1A" }}>
            {member.full_name}
          </div>
          {isComplete ? (
            <div
              style={{
                fontSize: "10px",
                color: BRAND,
                fontWeight: 600,
                marginTop: "2px",
                display: "flex",
                gap: "8px",
              }}
            >
              <span>✓ Évalué</span>
              <span style={{ color: "#ccc" }}>·</span>
              <span>📢 {ev.communication}★</span>
              <span>🤝 {ev.collaboration}★</span>
              <span>⏰ {ev.punctuality}★</span>
            </div>
          ) : (
            <div style={{ fontSize: "10px", color: "#F59E0B", fontWeight: 600, marginTop: "2px" }}>
              ⚠ Non évalué
            </div>
          )}
        </div>

        <span
          style={{
            fontSize: "12px",
            color: "#bbb",
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}
        >
          ▾
        </span>
      </button>

      {/* Contenu déroulant */}
      {open && (
        <div
          style={{
            background: "#fafafa",
            padding: "14px 16px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            borderTop: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          <StarRating
            label="Communication"
            value={ev.communication}
            onChange={(v) => onChange("communication", v)}
          />
          <StarRating
            label="Collaboration"
            value={ev.collaboration}
            onChange={(v) => onChange("collaboration", v)}
          />
          <StarRating
            label="Ponctualité"
            value={ev.punctuality}
            onChange={(v) => onChange("punctuality", v)}
          />

          {/* Commentaire libre */}
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#888",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Commentaire <span style={{ color: "#ccc", fontWeight: 400 }}>(optionnel)</span>
            </span>
            <RichTextArea value={ev.comment} onChange={(val) => onChange("comment", val)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Étape évaluations ─────────────────────────────────────────────────────────

function EvaluationsStep({
  teammates,
  evaluations,
  onEvaluationChange,
}: {
  teammates: { id: number; full_name: string }[];
  evaluations: Record<number, Evaluation>;
  onEvaluationChange: (
    id: number,
    field: keyof Omit<Evaluation, "evaluated_id">,
    value: number | string
  ) => void;
}) {
  if (teammates.length === 0) {
    return (
      <div
        style={{
          padding: "28px 24px",
          borderRadius: "16px",
          background: "rgba(107,26,42,0.04)",
          border: "1px dashed rgba(107,26,42,0.2)",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "28px", marginBottom: "8px" }}>👥</p>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#1A1A1A", marginBottom: "4px" }}>
          Aucun coéquipier à évaluer
        </p>
        <p style={{ fontSize: "13px", color: "#888" }}>Vous êtes seul(e) sur ces projets.</p>
      </div>
    );
  }

  const completedCount = teammates.filter((m) => {
    const e = evaluations[m.id];
    return e && e.communication > 0 && e.collaboration > 0 && e.punctuality > 0;
  }).length;

  const allDone = completedCount === teammates.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Barre de progression globale */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "8px 14px",
          borderRadius: "12px",
          background: allDone ? `${BRAND}08` : "rgba(245,158,11,0.07)",
          border: `1px solid ${allDone ? `${BRAND}20` : "rgba(245,158,11,0.2)"}`,
        }}
      >
        <div
          style={{
            flex: 1,
            height: "4px",
            borderRadius: "2px",
            background: "rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: "2px",
              background: allDone ? BRAND : "#F59E0B",
              width: `${(completedCount / teammates.length) * 100}%`,
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: allDone ? BRAND : "#F59E0B",
            whiteSpace: "nowrap",
          }}
        >
          {completedCount} / {teammates.length} évalué{completedCount > 1 ? "s" : ""}
        </span>
      </div>

      {/* Liste des accordions */}
      {teammates.map((member) => {
        const ev = evaluations[member.id];
        const isComplete = !!(
          ev &&
          ev.communication > 0 &&
          ev.collaboration > 0 &&
          ev.punctuality > 0
        );
        return (
          <EvalAccordion
            key={member.id}
            member={member}
            evaluation={ev}
            onChange={(field, value) => onEvaluationChange(member.id, field, value)}
            isComplete={isComplete}
          />
        );
      })}
    </div>
  );
}

// ── FormScreen ────────────────────────────────────────────────────────────────

export default function FormScreen({
  step,
  answers,
  fading,
  blockReason,
  suggestions,
  isValid,
  onGo,
  onAnswer,
  onSuggestionPick,
  onReview,
  loadingSearch,
  projects = [],
  selectedProjects = [],
  onProjectToggle,
  tasks,
  selectedTaskIds = [],
  onTaskToggle,
  teammates = [],
  evaluations = {},
  onEvaluationChange,
}: Props) {
  const q = QUESTIONS_GLOBAL[step];
  const isScrollable = q.type === "projects" || q.type === "tasks" || q.type === "evaluations";
  const [modalProject, setModalProject] = useState<Project | null>(null);
  const modalTasks = modalProject ? tasks.filter((t) => t.project_id === modalProject.id) : [];

  return (
    <Screen>
      <div
        className="w-full max-w-xl mx-auto"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: isScrollable ? "hidden" : "visible",
        }}
      >
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

        {/* Step dots */}
        <div className="flex gap-1.5 mb-8" style={{ flexShrink: 0 }}>
          {QUESTIONS_GLOBAL.map((_, i) => (
            <div
              key={i}
              style={i === step ? { backgroundColor: BRAND } : {}}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-8"
                  : answers[QUESTIONS_GLOBAL[i].id]
                    ? "w-2 bg-[#6B1A2A]/30"
                    : "w-2 bg-black/10"
              }`}
            />
          ))}
        </div>

        {/* Contenu */}
        <div
          style={{ flex: isScrollable ? 1 : "none", overflow: isScrollable ? "auto" : "visible" }}
          className={`transition-all duration-200 ${fading ? "opacity-0 translate-x-3" : "opacity-100 translate-x-0"}`}
        >
          <span
            style={{ color: BRAND }}
            className="block text-[11px] font-semibold uppercase tracking-widest mb-2"
          >
            {step + 1} / {QUESTIONS_GLOBAL.length}
          </span>
          <label className="block text-xl font-semibold text-[#1A1A1A] mb-4 leading-snug">
            {q.label}
          </label>

          {/* Input nom */}
          {q.type === "input" && (
            <>
              <div className="relative">
                <input
                  name={q.id}
                  value={answers[q.id] || ""}
                  autoFocus
                  placeholder="Votre nom complet..."
                  autoComplete="off"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (isValid) onGo(step + 1);
                    }
                  }}
                  onChange={(e) => onAnswer(q.id, e.target.value)}
                  className="w-full pr-12 px-5 py-4 rounded-2xl text-lg text-[#1A1A1A] bg-black/[0.02] border border-black/[0.07] outline-none transition-all focus:border-[#6B1A2A] focus:bg-white focus:ring-3 focus:ring-[#6B1A2A]/7 placeholder:text-black/20 placeholder:font-light"
                />
                {loadingSearch && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 rounded-full border-2 border-[#6B1A2A]/20 border-t-[#6B1A2A] animate-spin" />
                  </div>
                )}
                {suggestions.length > 0 && (
                  <ul className="absolute z-10 w-full mt-1 bg-white border border-black/7 rounded-2xl shadow-xl overflow-hidden">
                    {suggestions.map((s) => (
                      <li
                        key={s.id}
                        onClick={() => onSuggestionPick(s)}
                        className="px-5 py-3 text-[#1A1A1A] text-sm font-medium cursor-pointer transition-colors hover:bg-[#6B1A2A]/8 hover:text-[#6B1A2A]"
                      >
                        👤 {s.full_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {blockReason === "not_found" && (
                <p className="mt-3 px-4 py-3 rounded-xl text-sm bg-[#6B1A2A]/6 border border-[#6B1A2A]/15 text-[#6B1A2A]">
                  ⚠️ Ce nom n&apos;est pas reconnu. Choisissez votre nom dans la liste.
                </p>
              )}
              {blockReason === "already_submitted" && (
                <p className="mt-3 px-4 py-3 rounded-xl text-sm bg-[#6B1A2A]/6 border border-[#6B1A2A]/15 text-[#6B1A2A]">
                  ⛔ {answers["full_name"]}, vous avez déjà soumis aujourd&apos;hui. Revenez demain
                  !
                </p>
              )}
            </>
          )}

          {/* Sélection projets */}
          {q.type === "projects" && (
            <>
              {projects.length === 0 ? (
                <div
                  style={{
                    padding: "24px",
                    borderRadius: "16px",
                    background: "rgba(107,26,42,0.04)",
                    border: "1px dashed rgba(107,26,42,0.2)",
                    textAlign: "center",
                  }}
                >
                  <p style={{ fontSize: "24px", marginBottom: "8px" }}>📭</p>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#1A1A1A",
                      marginBottom: "4px",
                    }}
                  >
                    Aucun projet assigné
                  </p>
                  <p style={{ fontSize: "13px", color: "#666" }}>
                    Vous n&apos;êtes affecté à aucun projet.
                    <br />
                    Contactez votre responsable.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {projects.map((project) => {
                    const selected = selectedProjects.some((p) => p.id === project.id);
                    const projectTasks = tasks.filter((t) => t.project_id === project.id);
                    return (
                      <div key={project.id}>
                        <button
                          type="button"
                          onClick={() => onProjectToggle?.(project)}
                          style={
                            selected ? { borderColor: BRAND, backgroundColor: `${BRAND}10` } : {}
                          }
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all ${
                            selected
                              ? "border-[#6B1A2A]"
                              : "border-black/[0.07] bg-black/[0.02] hover:bg-black/[0.04]"
                          }`}
                        >
                          <span className="text-xl">📁</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#1A1A1A] text-sm">{project.name}</p>
                            {project.description && (
                              <p className="text-xs text-[#666666] truncate">
                                {project.description}
                              </p>
                            )}
                          </div>
                          {selected && (
                            <span
                              style={{ color: BRAND }}
                              className="font-bold text-lg flex-shrink-0"
                            >
                              ✓
                            </span>
                          )}
                        </button>
                        <TasksBadge tasks={projectTasks} onClick={() => setModalProject(project)} />
                      </div>
                    );
                  })}
                </div>
              )}
              {blockReason === "not_found" && (
                <p className="mt-3 px-4 py-3 rounded-xl text-sm bg-[#6B1A2A]/6 border border-[#6B1A2A]/15 text-[#6B1A2A]">
                  ⚠️ Sélectionnez au moins un projet pour continuer.
                </p>
              )}
            </>
          )}

          {/* Sélection tâches + message libre */}
          {q.type === "tasks" && (
            <TasksStep
              tasks={tasks}
              selectedProjects={selectedProjects}
              selectedTaskIds={selectedTaskIds}
              onTaskToggle={onTaskToggle ?? (() => {})}
              extraMessage={answers["extra_message"] || ""}
              onExtraMessage={(val) => onAnswer("extra_message", val)}
            />
          )}

          {/* RichText */}
          {q.type === "textarea" && (
            <RichTextArea
              key={q.id}
              value={answers[q.id] || ""}
              onChange={(val) => onAnswer(q.id, val)}
            />
          )}

          {/* Évaluations */}
          {q.type === "evaluations" && (
            <EvaluationsStep
              teammates={teammates}
              evaluations={evaluations}
              onEvaluationChange={onEvaluationChange ?? (() => {})}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-6" style={{ flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => onGo(step === 0 ? -1 : step - 1)}
            className="px-6 py-3 rounded-2xl font-semibold cursor-pointer transition-all bg-black/[0.04] text-[#666666] border border-black/7 hover:bg-black/[0.07] hover:text-[#1A1A1A]"
          >
            ←
          </button>
          {step < QUESTIONS_GLOBAL.length - 1 ? (
            <button
              type="button"
              onClick={() => onGo(step + 1)}
              disabled={!isValid}
              style={{ backgroundColor: BRAND }}
              className="flex-1 py-3 rounded-2xl font-semibold text-white cursor-pointer transition-all hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Suivant →
            </button>
          ) : (
            <button
              type="button"
              onClick={onReview}
              disabled={!isValid}
              style={{ backgroundColor: BRAND }}
              className="flex-1 py-3 rounded-2xl font-semibold text-white cursor-pointer transition-all hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Vérifier mon rapport →
            </button>
          )}
        </div>
      </div>

      {modalProject && (
        <TasksModal
          project={modalProject}
          tasks={modalTasks}
          onClose={() => setModalProject(null)}
        />
      )}
    </Screen>
  );
}
