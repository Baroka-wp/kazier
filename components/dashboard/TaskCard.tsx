"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar } from "lucide-react";
import { useState } from "react";
import { updateTaskStatus, assignTaskToSelf } from "@/lib/team-actions";
import { type Task } from "@/lib/task-actions";

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

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: `task-${task.id}`,
    disabled: readOnly,
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
    setLoading(true);
    const res = await updateTaskStatus(task.id, newStatus as Task["status"]);
    setLoading(false);
    if (res.success && res.task) onTaskUpdated(res.task);
  }

  const formattedDate = formatDate(task.due_date);
  const isBeingDragged = isDragging || isSortableDragging;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: readOnly ? "#f9f9f9" : "#fff", // 👈 fond légèrement grisé si terminée
        borderRadius: "10px",
        border: "1.5px solid rgba(0,0,0,0.06)",
        padding: "12px",
        marginBottom: "10px",
        boxShadow: isBeingDragged ? "0 12px 32px rgba(0,0,0,0.2)" : "0 2px 8px rgba(0,0,0,0.04)",
        opacity: isSortableDragging ? 0.4 : 1,
        cursor: readOnly ? "default" : isBeingDragged ? "grabbing" : "grab",
        transition: "box-shadow 0.15s, opacity 0.15s",
      }}
      {...attributes}
      {...(readOnly ? {} : listeners)} // 👈 pas de drag si readOnly
    >
      {/* Titre + Priority */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <PriorityDot priority={task.priority} />
        <h4 style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1A1A1A", flex: 1, margin: 0 }}>
          {task.title}
        </h4>
      </div>

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

      {/* Assignés — connecté en couleur, autres en gris */}
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
        {/* Si readOnly (terminée) — badge informatif uniquement */}
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
            ✓ Terminée
          </span>
        ) : (
          <>
            {/* Select statut — visible seulement si assigné à moi */}
            {(isAssignedToMe || isTM) && !readOnly && (
              <StatusSelect
                status={task.status}
                onStatusChange={handleStatusChange}
                disabled={loading}
                isTM={isTM}
              />
            )}

            {/* Bouton s'assigner — visible seulement si tâche libre */}
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
  );
}
