"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import TaskCard from "./TaskCard";
import { Task } from "@/lib/task-actions";

type Props = {
  status: "à faire" | "en cours" | "review" | "terminée";
  tasks: Task[];
  teamMemberId: number;
  onTaskUpdated: (task: Task) => void;
  readOnly?: boolean;
  isTM?: boolean;
};

const STATUS_LABELS = {
  "à faire": "À faire",
  "en cours": "En cours",
  review: "Review",
  terminée: "Terminée",
};

const STATUS_COLORS = {
  "à faire": "#f59e0b",
  "en cours": "#3b82f6",
  review: "#8b5cf6",
  terminée: "#10b981",
};

export default function TaskColumn({
  status,
  tasks,
  teamMemberId,
  onTaskUpdated,
  readOnly,
  isTM = false,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    disabled: readOnly,
  });

  return (
    <div
      style={{
        flex: 1,
        minWidth: "280px",
        maxWidth: "340px",
        background: "#fafafa",
        borderRadius: "12px",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        border: isOver ? "2px solid rgba(107,26,42,0.3)" : "2px solid transparent",
        transition: "border-color 0.15s",
      }}
    >
      {/* Header colonne */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: STATUS_COLORS[status],
            flexShrink: 0,
          }}
        />
        <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1A1A1A", margin: 0 }}>
          {STATUS_LABELS[status]}
        </h3>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "0.7rem",
            fontWeight: 600,
            background: "rgba(0,0,0,0.06)",
            color: "#666",
            borderRadius: "20px",
            padding: "1px 7px",
          }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Zone droppable */}
      <SortableContext
        items={tasks.map((t) => `task-${t.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          style={{
            flex: 1,
            overflowY: "auto",
            background: isOver ? "rgba(107,26,42,0.04)" : "transparent",
            borderRadius: "8px",
            padding: "4px",
            minHeight: "200px",
            transition: "background 0.15s",
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
                readOnly={readOnly}
                isTM={isTM}
              />
            );
          })}

          {tasks.length === 0 && (
            <div
              style={{
                height: "100%",
                minHeight: "120px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ccc",
                fontSize: "0.78rem",
                border: "1.5px dashed rgba(0,0,0,0.08)",
                borderRadius: "8px",
              }}
            >
              Déposer ici
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
