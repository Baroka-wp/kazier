"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, MessageSquare, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { updateTaskStatus, assignTaskToSelf } from "@/lib/team-actions";
import { type Task } from "@/lib/task-actions";
import ReviewConfirmModal from "@/components/dashboard/ReviewConfirmModal";

const TaskDetailModal = dynamic(() => import("@/components/dashboard/TaskDetailModal"), {
  ssr: false,
});

// ── Types & helpers ───────────────────────────────────────────────────────────

type Props = {
  task: Task;
  index: number;
  isAssignedToMe: boolean;
  isFree: boolean;
  teamMemberId: number;
  onTaskUpdated: (updated: Task) => void;
  isDragging?: boolean;
  readOnly?: boolean;
  isTM?: boolean;
};

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    low: "#22c55e",
    medium: "#fbbf24",
    high: "#ef4444",
  };
  return (
    <div
      style={{
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: colors[priority] || "#fbbf24",
        flexShrink: 0,
      }}
    />
  );
}

function formatDate(dateString: string | null): string | null {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  } catch {
    return null;
  }
}

function StatusSelect({
  status,
  onStatusChange,
  disabled,
  isTM,
}: {
  status: string;
  onStatusChange: (s: string) => void;
  disabled: boolean;
  isTM?: boolean;
}) {
  const isLocked = !isTM && status === "review";
  return (
    <select
      value={status}
      onChange={(e) => onStatusChange(e.target.value)}
      disabled={disabled || isLocked}
      style={{
        padding: "4px 6px",
        borderRadius: "6px",
        border: "1px solid rgba(0,0,0,0.1)",
        background: disabled || isLocked ? "rgba(0,0,0,0.05)" : "rgba(107,26,42,0.1)",
        color: disabled || isLocked ? "#999" : "#6B1A2A",
        fontSize: "0.7rem",
        fontFamily: "inherit",
        cursor: disabled || isLocked ? "not-allowed" : "pointer",
        opacity: disabled || isLocked ? 0.6 : 1,
      }}
    >
      <option value="à faire">À faire</option>
      <option value="en cours">En cours</option>
      <option value="review">Review</option>
      {isTM && <option value="terminée">Terminée</option>}
    </select>
  );
}

// ── Timer ─────────────────────────────────────────────────────────────────────

function useCountdown(dueDate: string | null) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!dueDate) return;

    const target = new Date(dueDate).getTime();
    if (isNaN(target)) return;

    const tick = () => setTimeLeft(target - Date.now());
    tick();
    const interval = setInterval(tick, 60_000); // mise à jour toutes les minutes
    return () => clearInterval(interval);
  }, [dueDate]);

  return timeLeft;
}

function TimerBadge({ dueDate, status }: { dueDate: string | null; status: string }) {
  const ms = useCountdown(dueDate);

  if (!dueDate || ms === null || status === "terminée") return null;

  const isExpired = ms <= 0;
  const isCritical = ms <= 24 * 60 * 60 * 1000; // ≤ 24h
  const isWarning = ms <= 3 * 24 * 60 * 60 * 1000; // ≤ 3j
  const isNear = ms <= 7 * 24 * 60 * 60 * 1000; // ≤ 7j

  // Couleurs
  const color = isExpired
    ? "#dc2626"
    : isCritical
      ? "#ef4444"
      : isWarning
        ? "#f97316"
        : isNear
          ? "#eab308"
          : "#6b7280";

  const bg = isExpired
    ? "rgba(220,38,38,0.10)"
    : isCritical
      ? "rgba(239,68,68,0.08)"
      : isWarning
        ? "rgba(249,115,22,0.08)"
        : isNear
          ? "rgba(234,179,8,0.08)"
          : "rgba(107,114,128,0.07)";

  const border = isExpired
    ? "rgba(220,38,38,0.25)"
    : isCritical
      ? "rgba(239,68,68,0.20)"
      : isWarning
        ? "rgba(249,115,22,0.20)"
        : isNear
          ? "rgba(234,179,8,0.20)"
          : "rgba(107,114,128,0.15)";

  // Formatage du label
  let label: string;
  if (isExpired) {
    const overMs = Math.abs(ms);
    const overDays = Math.floor(overMs / (24 * 60 * 60 * 1000));
    const overHrs = Math.floor((overMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    label = overDays > 0 ? `Expiré · ${overDays}j ${overHrs}h` : `Expiré · ${overHrs}h`;
  } else {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hrs = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const mins = Math.floor((ms % (60 * 60 * 1000)) / 60_000);
    label = days > 0 ? `${days}j ${hrs}h` : hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  }

  const icon = isExpired ? "⚠️" : isCritical ? "🔴" : isWarning ? "🟠" : isNear ? "🟡" : "🟢";

  return (
    <div
      title={`Échéance : ${new Date(dueDate).toLocaleString("fr-FR")}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 7px",
        borderRadius: "8px",
        fontSize: "0.62rem",
        fontWeight: 600,
        background: bg,
        color,
        border: `1px solid ${border}`,
        letterSpacing: "0.01em",
        animation: isExpired || isCritical ? "pulse 1.8s ease-in-out infinite" : undefined,
      }}
    >
      <span style={{ fontSize: "0.6rem" }}>{icon}</span>
      {label}
    </div>
  );
}

// ── TaskCard ──────────────────────────────────────────────────────────────────

export default function TaskCard({
  task,
  isAssignedToMe,
  isFree,
  teamMemberId,
  onTaskUpdated,
  isDragging = false,
  readOnly = false,
  isTM = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showReviewConfirm, setShowReviewConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: `task-${task.id}`,
    disabled: readOnly || task.status === "review", // bloquer drag si review
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  async function handleAssign() {
    setLoading(true);
    const res = await assignTaskToSelf(task.id, teamMemberId);
    setLoading(false);
    if (res.success && res.task) onTaskUpdated(res.task);
  }

  async function handleStatusChange(newStatus: string) {
    // Intercepter le passage en review pour afficher la confirmation
    if (newStatus === "review" && !isTM) {
      setPendingStatus(newStatus);
      setShowReviewConfirm(true);
      return;
    }
    await applyStatusChange(newStatus);
  }

  async function applyStatusChange(newStatus: string) {
    setLoading(true);
    const res = await updateTaskStatus(task.id, newStatus as Task["status"]);
    setLoading(false);
    if (res.success && res.task) onTaskUpdated(res.task);
  }

  const formattedDate = formatDate(task.due_date);
  const isBeingDragged = isDragging || isSortableDragging;
  const isReview = task.status === "review";

  return (
    <>
      <div
        ref={setNodeRef}
        style={{
          ...style,
          background: readOnly ? "#f9f9f9" : "#fff",
          borderRadius: "10px",
          border:
            isReview && !isTM
              ? "1.5px solid rgba(139,92,246,0.25)" // bordure violette si review
              : "1.5px solid rgba(0,0,0,0.06)",
          padding: "12px",
          marginBottom: "10px",
          boxShadow: isBeingDragged ? "0 12px 32px rgba(0,0,0,0.2)" : "0 2px 8px rgba(0,0,0,0.04)",
          opacity: isSortableDragging ? 0.4 : 1,
          cursor:
            readOnly || (isReview && !isTM) ? "default" : isBeingDragged ? "grabbing" : "grab",
          transition: "box-shadow 0.15s, opacity 0.15s",
          animation: shaking ? "shake 0.4s ease" : undefined,
        }}
        {...attributes}
        {...(readOnly || (isReview && !isTM) ? {} : listeners)}
        onPointerDown={(e) => {
          if (task.status === "review" && !isTM) {
            setShaking(true);
            setTimeout(() => setShaking(false), 500);
          }
          // Laisser les listeners DnD gérer le reste
          listeners?.onPointerDown?.(e);
        }}
      >
        {/* Titre + Priority */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <PriorityDot priority={task.priority} />
          <h4
            style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1A1A1A", flex: 1, margin: 0 }}
          >
            {task.title}
          </h4>
          {/* Icône cadenas si review et pas TM */}
          {isReview && !isTM && (
            <div title="En attente de validation — déplacement bloqué">
              <Lock size={12} color="#8b5cf6" />
            </div>
          )}
        </div>

        {/* Badge review bloqué — seulement pour T */}
        {isReview && !isTM && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "3px 8px",
              borderRadius: "8px",
              fontSize: "0.62rem",
              fontWeight: 500,
              background: "rgba(139,92,246,0.08)",
              color: "#8b5cf6",
              marginBottom: "6px",
              border: "1px solid rgba(139,92,246,0.15)",
            }}
          >
            <Lock size={10} color="#8b5cf6" /> En attente de validation
          </div>
        )}

        {/* Description */}
        {task.description && (
          <p
            style={{
              fontSize: "0.75rem",
              color: "#666",
              margin: "6px 0",
              lineHeight: 1.4,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {task.description}
          </p>
        )}

        {/* Tâche libre — indication pour T */}
        {isFree && !isTM && (
          <div
            style={{
              fontSize: "0.62rem",
              color: "#aaa",
              fontStyle: "italic",
              marginTop: "4px",
            }}
          >
            💡 Cliquez &quot;S&apos;assigner&quot; pour prendre en charge
          </div>
        )}

        {/* Assignés */}
        {task.assigned_to_names && task.assigned_to_names.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
            {task.assigned_to_names.map((name, i) => {
              const isMe = !isTM && task.assigned_to?.[i] === teamMemberId;
              return (
                <span
                  key={i}
                  style={{
                    padding: "2px 7px",
                    borderRadius: "20px",
                    fontSize: "0.62rem",
                    fontWeight: isMe ? 600 : 400,
                    background: isMe ? "rgba(107,26,42,0.1)" : "rgba(0,0,0,0.05)",
                    color: isMe ? "#6B1A2A" : "#aaa",
                  }}
                >
                  {isMe ? `✓ ${name}` : name}
                </span>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginTop: "8px",
            flexWrap: "wrap",
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {readOnly ? (
            <span
              style={{
                display: "inline-flex",
                padding: "3px 8px",
                borderRadius: "8px",
                fontSize: "0.65rem",
                fontWeight: 500,
                background: "rgba(16,185,129,0.1)",
                color: "#10b981",
              }}
            >
              ✓ Terminée par l&apos;équipe
            </span>
          ) : (
            <>
              {(isAssignedToMe || isTM) && (
                <StatusSelect
                  status={task.status}
                  onStatusChange={handleStatusChange}
                  disabled={loading}
                  isTM={isTM}
                />
              )}

              {/* Bouton détails */}
              <button
                onClick={() => setShowDetail(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  border: "1px solid rgba(0,0,0,0.08)",
                  background: "#F5F2ED",
                  color: "#888",
                  fontSize: "0.65rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(107,26,42,0.07)";
                  e.currentTarget.style.color = "#6B1A2A";
                  e.currentTarget.style.borderColor = "rgba(107,26,42,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#F5F2ED";
                  e.currentTarget.style.color = "#888";
                  e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)";
                }}
              >
                <MessageSquare size={11} />
                Détails
              </button>

              {/* Bouton S'assigner */}
              {isFree && !isTM && (
                <button
                  onClick={handleAssign}
                  disabled={loading}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "6px",
                    border: "1px solid rgba(107,26,42,0.2)",
                    background: "rgba(107,26,42,0.05)",
                    color: "#6B1A2A",
                    fontSize: "0.65rem",
                    fontWeight: 500,
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.6 : 1,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) e.currentTarget.style.background = "rgba(107,26,42,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(107,26,42,0.05)";
                  }}
                >
                  {loading ? "..." : "S'assigner"}
                </button>
              )}
            </>
          )}
        </div>

        {/* Due Date + Timer */}
        {formattedDate && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "6px",
              marginTop: "8px",
              flexWrap: "wrap",
            }}
          >
            {/* Date fixe à gauche */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.65rem",
                color: "#999",
              }}
            >
              <Calendar size={12} color="#999" />
              {formattedDate}
            </div>

            {/* Timer dynamique à droite */}
            <TimerBadge dueDate={task.due_date} status={task.status} />
          </div>
        )}
      </div>

      {/* Modal détails */}
      {showDetail && <TaskDetailModal task={task} onClose={() => setShowDetail(false)} />}

      {/* Modal confirmation review */}
      {showReviewConfirm && (
        <ReviewConfirmModal
          onConfirm={async () => {
            setShowReviewConfirm(false);
            if (pendingStatus) await applyStatusChange(pendingStatus);
            setPendingStatus(null);
          }}
          onCancel={() => {
            setShowReviewConfirm(false);
            setPendingStatus(null);
          }}
        />
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-6px); }
          40%       { transform: translateX(6px); }
          60%       { transform: translateX(-4px); }
          80%       { transform: translateX(4px); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.55; }
        }
      `}</style>
    </>
  );
}
