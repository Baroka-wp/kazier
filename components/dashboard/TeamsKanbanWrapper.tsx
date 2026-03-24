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
import ReviewConfirmModal from "@/components/dashboard/ReviewConfirmModal"; // 👈 ajouter

type Props = {
  tasks: Task[];
  teamMemberId: number;
};

export default function TeamsKanbanWrapper({ tasks, teamMemberId }: Props) {
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [pendingDrop, setPendingDrop] = useState<{ taskId: number; status: Task["status"] } | null>(
    null
  ); // 👈 ajouter

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
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

  // 👇 Fonction commune pour appliquer le drop
  async function applyDrop(taskId: number, status: Task["status"]) {
    setLocalTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    const res = await updateTaskStatus(taskId, status);
    if (!res.success) setLocalTasks(tasks);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = parseInt(String(active.id).replace("task-", ""));
    const currentTask = localTasks.find((t) => t.id === taskId);
    if (!currentTask) return;

    if (!currentTask.assigned_to?.includes(teamMemberId)) return;
    if (currentTask.status === "review" || currentTask.status === "terminée") return;

    const overTask = localTasks.find((t) => `task-${t.id}` === String(over.id));
    const resolvedStatus = overTask
      ? overTask.status
      : (String(over.id).replace("column-", "") as Task["status"]);

    if (currentTask.status === resolvedStatus) return;
    if (resolvedStatus === "terminée") return;

    // 👇 Intercepter le drop vers review
    if (resolvedStatus === "review") {
      setPendingDrop({ taskId, status: resolvedStatus });
      return;
    }

    await applyDrop(taskId, resolvedStatus);
  }

  return (
    <>
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
                setLocalTasks((prev) =>
                  prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
                );
              }}
              readOnly={status === "terminée"}
            />
          ))}
        </div>

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

      {/* 👇 Modal confirmation review */}
      {pendingDrop && (
        <ReviewConfirmModal
          onConfirm={async () => {
            await applyDrop(pendingDrop.taskId, pendingDrop.status);
            setPendingDrop(null);
          }}
          onCancel={() => setPendingDrop(null)}
        />
      )}
    </>
  );
}
