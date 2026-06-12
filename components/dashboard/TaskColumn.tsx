"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import TaskCard from "./TaskCard";
import { Task } from "@/lib/task-actions";

type Props = {
  status: "à faire" | "en cours" | "review" | "terminée";
  tasks: Task[];
  teamMemberId: string;
  onTaskUpdated: (task: Task) => void;
  onCardClick?: (task: Task) => void;
  onAddTask?: () => void;
  readOnly?: boolean;
  isTM?: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  "à faire": "A FAIRE",
  "en cours": "EN COURS",
  review: "REVIEWS",
  terminée: "TERMINÉE",
};

// Accent bar color per column — matches mockup palette
const STATUS_COLORS: Record<string, string> = {
  "à faire": "#919191", // brand dark red
  "en cours": "#ffac1e", // deep green
  review: "#8b5cf6", // deep navy
  terminée: "#0cad47", // dark grey
};

export default function TaskColumn({
  status,
  tasks,
  teamMemberId,
  onTaskUpdated,
  onCardClick,
  onAddTask,
  readOnly,
  isTM = false,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    disabled: readOnly,
  });

  const accentColor = STATUS_COLORS[status];
  const showAddCta = status === "à faire" && isTM && onAddTask;

  return (
    <div
      style={{
        width: "300px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: "0",
      }}
    >
      {/* ── Column header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "14px",
          paddingLeft: "2px",
        }}
      >
        {/* Vertical accent bar */}
        <div
          style={{
            width: "4px",
            height: "20px",
            borderRadius: "4px",
            background: accentColor,
            flexShrink: 0,
          }}
        />
        <h3
          style={{
            fontSize: "0.78rem",
            fontWeight: 800,
            color: "#1A1A1A",
            margin: 0,
            letterSpacing: "0.07em",
            flex: 1,
          }}
        >
          {STATUS_LABELS[status]}
        </h3>
        {/* Count badge */}
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            background: "rgba(0,0,0,0.07)",
            color: "#555",
            borderRadius: "20px",
            padding: "2px 9px",
            minWidth: "24px",
            textAlign: "center",
          }}
        >
          {String(tasks.length).padStart(2, "0")}
        </span>
      </div>

      {/* ── Droppable zone ── */}
      <SortableContext
        items={tasks.map((t) => `task-${t.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: isOver ? "rgba(107,26,42,0.03)" : "transparent",
            borderRadius: "10px",
            minHeight: "200px",
            transition: "background 0.15s",
            outline: isOver ? "2px solid rgba(107,26,42,0.18)" : "2px solid transparent",
            outlineOffset: "2px",
          }}
        >
          {tasks.map((task, index) => {
            const isAssignedToMe = task.assigned_to?.includes(teamMemberId) ?? false;
            const isFree = !task.assigned_to || task.assigned_to.length === 0;

            return (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                isAssignedToMe={isAssignedToMe}
                isFree={isFree}
                teamMemberId={teamMemberId}
                onTaskUpdated={onTaskUpdated}
                onCardClick={onCardClick}
                readOnly={readOnly}
                isTM={isTM}
              />
            );
          })}

          {/* Empty drop zone */}
          {tasks.length === 0 && !showAddCta && (
            <div
              style={{
                minHeight: "80px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ccc",
                fontSize: "0.75rem",
                border: "1.5px dashed rgba(0,0,0,0.08)",
                borderRadius: "10px",
              }}
            >
              Déposer ici
            </div>
          )}
        </div>
      </SortableContext>

      {/* ── "Nouvelle tâche" CTA — only in "À faire" for TM ── */}
      {showAddCta && (
        <button
          onClick={onAddTask}
          style={{
            marginTop: "10px",
            width: "100%",
            padding: "28px 16px",
            border: "1.5px dashed rgba(0,0,0,0.12)",
            borderRadius: "12px",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            transition: "background 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(107,26,42,0.03)";
            e.currentTarget.style.borderColor = "rgba(107,26,42,0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)";
          }}
        >
          {/* Plus circle */}
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "rgba(107,26,42,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Plus size={18} color="#6B1A2A" strokeWidth={2.5} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1A1A1A" }}>
              Nouvelle tâche
            </div>
            <div style={{ fontSize: "0.7rem", color: "#aaa", marginTop: "2px" }}>
              Gérez vos tâches
            </div>
          </div>
        </button>
      )}
    </div>
  );
}
