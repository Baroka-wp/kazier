"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { Task } from "@/lib/task-actions";
import { updateTaskStatus } from "@/lib/team-actions";
import TaskColumn from "./TaskColumn";
import TaskCard from "./TaskCard";

type Props = {
  tasks: Task[];
  teamMemberId: number;
};

export default function TeamsKanbanWrapper({ tasks, teamMemberId }: Props) {
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // évite les drags accidentels
    })
  );

  const groupedByStatus = {
    "à faire": localTasks.filter((t) => t.status === "à faire"),
    "en cours": localTasks.filter((t) => t.status === "en cours"),
    review: localTasks.filter((t) => t.status === "review"),
    terminée: localTasks.filter((t) => t.status === "terminée"),
  };

  function handleDragStart(event: DragStartEvent) {
    const task = localTasks.find((t) => `task-${t.id}` === event.active.id);
    setActiveTask(task ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = parseInt(String(active.id).replace("task-", ""));
    // over.id peut être `column-xxx` ou `task-xxx` (si drop sur une card)
    const newStatus = String(over.id)
      .replace("column-", "")
      .replace(/^task-\d+$/, "") as Task["status"];

    // Si over est une task, récupérer le status de cette task
    const overTask = localTasks.find((t) => `task-${t.id}` === String(over.id));
    const resolvedStatus = overTask ? overTask.status : (newStatus as Task["status"]);

    const currentTask = localTasks.find((t) => t.id === taskId);
    if (!currentTask || currentTask.status === resolvedStatus) return;

    // Optimistic update
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: resolvedStatus } : t))
    );

    const res = await updateTaskStatus(taskId, resolvedStatus);
    if (!res.success) {
      // Rollback
      setLocalTasks(tasks);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={{ display: "flex", gap: "16px", overflowX: "auto" }}>
        {(["à faire", "en cours", "review", "terminée"] as const).map((status) => (
          <TaskColumn
            key={status}
            status={status}
            tasks={groupedByStatus[status]}
            teamMemberId={teamMemberId}
            onTaskUpdated={(updatedTask) => {
              setLocalTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
            }}
          />
        ))}
      </div>

      {/* Card fantôme pendant le drag */}
      <DragOverlay>
        {activeTask ? (
          <div style={{ opacity: 0.85, transform: "rotate(2deg)", pointerEvents: "none" }}>
            <TaskCard
              task={activeTask}
              index={0}
              isAssignedToMe={activeTask.assigned_to?.includes(teamMemberId) ?? false}
              isFree={!activeTask.assigned_to || activeTask.assigned_to.length === 0}
              teamMemberId={teamMemberId}
              onTaskUpdated={() => {}}
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
