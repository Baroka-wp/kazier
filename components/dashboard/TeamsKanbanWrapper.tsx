"use client";

import { useState, useEffect } from "react";
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
import { getSessionPermissions, type SessionPermissions } from "@/lib/session-actions";
import TaskColumn from "./TaskColumn";
import TaskCard from "./TaskCard";
import ReviewConfirmModal from "@/components/dashboard/ReviewConfirmModal";
import TaskDetailPage from "./TaskDetailPage";

type Props = {
  tasks: Task[];
  teamMemberId: number; // garde pour compatibilité, sera overridé par le serveur
};

export default function TeamsKanbanWrapper({ tasks, teamMemberId }: Props) {
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [pendingDrop, setPendingDrop] = useState<{
    taskId: number;
    status: Task["status"];
  } | null>(null);

  // ── Permissions depuis le serveur ─────────────────────────────────────────
  const [perms, setPerms] = useState<SessionPermissions | null>(null);

  useEffect(() => {
    getSessionPermissions().then(setPerms);
  }, []);

  // ID résolu : serveur en priorité, prop en fallback
  const resolvedMemberId = perms?.teamMemberId ?? teamMemberId;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

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

    // T ne peut déplacer que ses propres tâches
    if (!currentTask.assigned_to?.includes(resolvedMemberId)) return;
    if (currentTask.status === "review" || currentTask.status === "terminée") return;

    const overTask = localTasks.find((t) => `task-${t.id}` === String(over.id));
    const resolvedStatus = overTask
      ? overTask.status
      : (String(over.id).replace("column-", "") as Task["status"]);

    if (currentTask.status === resolvedStatus) return;
    if (resolvedStatus === "terminée") return;

    // Intercepter le drop vers review → confirmation
    if (resolvedStatus === "review") {
      setPendingDrop({ taskId, status: resolvedStatus });
      return;
    }

    await applyDrop(taskId, resolvedStatus);
  }

  // ── Vue détail tâche ──────────────────────────────────────────────────────
  if (detailTask) {
    return (
      <TaskDetailPage
        task={detailTask}
        onBack={() => setDetailTask(null)}
        teamMemberId={resolvedMemberId}
        isTM={false}
        canManageTasks={false} // T : jamais de suppression ni gestion complète
        onUpdated={(updated) => {
          setLocalTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          setDetailTask(updated);
        }}
      />
    );
  }

  // ── Vue Kanban ────────────────────────────────────────────────────────────
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
              teamMemberId={resolvedMemberId}
              onTaskUpdated={(updatedTask) => {
                setLocalTasks((prev) =>
                  prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
                );
              }}
              onCardClick={(task) => setDetailTask(task)}
              readOnly={status === "terminée"}
              isTM={false}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div style={{ opacity: 0.85, transform: "rotate(2deg)", pointerEvents: "none" }}>
              <TaskCard
                task={activeTask}
                index={0}
                isAssignedToMe={activeTask.assigned_to?.includes(resolvedMemberId) ?? false}
                isFree={!activeTask.assigned_to || activeTask.assigned_to.length === 0}
                teamMemberId={resolvedMemberId}
                onTaskUpdated={() => {}}
                isDragging
                isTM={false}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal confirmation review */}
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
