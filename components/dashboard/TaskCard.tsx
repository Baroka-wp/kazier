"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, MessageSquare, Lock } from "lucide-react";
import { useState } from "react";
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
    disabled: readOnly || task.status === "review", // 👈 bloquer drag si review
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
  const isTerminee = task.status === "terminée";

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
              ? "1.5px solid rgba(139,92,246,0.25)" // 👈 bordure violette si review
              : "1.5px solid rgba(0,0,0,0.06)",
          padding: "12px",
          marginBottom: "10px",
          boxShadow: isBeingDragged ? "0 12px 32px rgba(0,0,0,0.2)" : "0 2px 8px rgba(0,0,0,0.04)",
          opacity: isSortableDragging ? 0.4 : 1,
          cursor:
            readOnly || (isReview && !isTM) ? "default" : isBeingDragged ? "grabbing" : "grab",
          transition: "box-shadow 0.15s, opacity 0.15s",
          animation: shaking ? "shake 0.4s ease" : undefined, // 👈 shake
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
          {/* 👇 Icône cadenas si review et pas TM */}
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

        {/* Due Date */}
        {formattedDate && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "0.65rem",
              color: "#999",
              marginTop: "6px",
            }}
          >
            <Calendar size={12} color="#999" />
            {formattedDate}
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
      `}</style>
    </>
  );
}
