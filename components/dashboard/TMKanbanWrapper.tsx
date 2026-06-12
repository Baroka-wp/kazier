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
import { ArrowLeft, Plus } from "lucide-react";
import { Task } from "@/lib/task-actions";
import { updateTaskStatus } from "@/lib/team-actions";
import TaskColumn from "./TaskColumn";
import TaskCard from "./TaskCard";
import TaskDetailPage from "./TaskDetailPage";

type Project = { id: string; name: string };

type Props = {
  tasks: Task[];
  isLoading?: boolean;
  projects?: Project[];
  selectedProjectId?: number | null;
  onProjectChange?: (id: number | null) => void;
  onAddTask?: () => void;
  onBack?: () => void;
  isTM?: boolean;
  teamMemberId?: string;
};

export default function TMKanbanWrapper({
  tasks,
  isLoading = false,
  projects = [],
  selectedProjectId,
  onProjectChange,
  onAddTask,
  onBack,
  isTM = true,
  teamMemberId = 0,
}: Props) {
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    if (selectedTask) {
      const updated = localTasks.find((t) => t.id === selectedTask.id);
      if (updated) setSelectedTask(updated);
    }
  }, [localTasks, selectedTask]);

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

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const taskId = parseInt(String(active.id).replace("task-", ""));
    const currentTask = localTasks.find((t) => t.id === taskId);
    if (!currentTask) return;

    if (currentTask.status === "terminée") return;

    const overTask = localTasks.find((t) => `task-${t.id}` === String(over.id));
    const resolvedStatus = overTask
      ? overTask.status
      : (String(over.id).replace("column-", "") as Task["status"]);

    if (currentTask.status === resolvedStatus) return;

    setLocalTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: resolvedStatus } : t))
    );

    const res = await updateTaskStatus(taskId, resolvedStatus);
    if (!res.success) setLocalTasks(tasks);
  }

  // ── Vue détail tâche ──────────────────────────────────────────────────────
  if (selectedTask) {
    return (
      <TaskDetailPage
        task={selectedTask}
        onBack={() => setSelectedTask(null)}
        teamMemberId={teamMemberId}
        isTM={isTM}
        canManageTasks={true}
        onUpdated={(updatedTask: Task) => {
          setLocalTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
          setSelectedTask(updatedTask);
        }}
      />
    );
  }

  // ── Vue Kanban ────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#F2EFE9",
      }}
    >
      {/* ── Top navigation bar with project tabs ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "16px 24px",
          background: "#fff",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          flexShrink: 0,
        }}
      >
        {onBack && (
          <button
            onClick={onBack}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#888",
              fontSize: "0.75rem",
              fontWeight: 500,
              padding: "4px 0",
            }}
          >
            <ArrowLeft size={15} />
            <span style={{ letterSpacing: "0.03em" }}>RETOUR</span>
          </button>
        )}

        {/* Project tabs */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            flex: 1,
            paddingBottom: "4px",
          }}
        >
          {projects.map((project) => {
            const isActive = project.id === selectedProjectId;
            return (
              <button
                key={project.id}
                onClick={() => onProjectChange?.(project.id)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "0px",
                  border: isActive ? "1.5px solid #6B1A2A" : "1px solid rgba(0,0,0,0.08)",
                  background: isActive ? "rgba(107,26,42,0.08)" : "#fff",
                  color: isActive ? "#6B1A2A" : "#666",
                  fontSize: "0.82rem",
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s",
                  fontFamily: "'DM Sans', sans-serif",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "rgba(107,26,42,0.05)";
                    e.currentTarget.style.borderColor = "rgba(107,26,42,0.15)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "#fff";
                    e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)";
                  }
                }}
              >
                {project.name}
              </button>
            );
          })}
        </div>

        {/* Add task button */}
        <button
          onClick={onAddTask}
          disabled={!selectedProjectId}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            borderRadius: "0px",
            border: "none",
            background: !selectedProjectId ? "#ccc" : "#6B1A2A",
            color: "#fff",
            fontSize: "0.78rem",
            fontWeight: 700,
            cursor: !selectedProjectId ? "not-allowed" : "pointer",
            letterSpacing: "0.02em",
            transition: "background 0.15s",
            fontFamily: "'DM Sans', sans-serif",
          }}
          onMouseEnter={(e) => {
            if (selectedProjectId) e.currentTarget.style.background = "#8B2438";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = !selectedProjectId ? "#ccc" : "#6B1A2A";
          }}
        >
          <Plus size={15} strokeWidth={2.5} />
          AJOUTER
        </button>
      </div>

      {/* ── Kanban columns ── */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#999" }}>Chargement...</div>
      ) : !selectedProjectId ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "#aaa",
            fontSize: "0.9rem",
          }}
        >
          Sélectionnez un projet pour afficher le kanban
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            style={{
              display: "flex",
              gap: "20px",
              overflowX: "auto",
              padding: "20px 24px",
              flex: 1,
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(107,26,42,0.25) transparent",
            }}
          >
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
                onCardClick={(task) => setSelectedTask(task)}
                onAddTask={status === "à faire" ? onAddTask : undefined}
                readOnly={false}
                isTM={isTM}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask ? (
              <div
                style={{
                  opacity: 0.88,
                  transform: "rotate(1.5deg)",
                  pointerEvents: "none",
                  filter: "drop-shadow(0 12px 28px rgba(0,0,0,0.18))",
                }}
              >
                <TaskCard
                  task={activeTask}
                  index={0}
                  isAssignedToMe={false}
                  isFree={false}
                  teamMemberId={teamMemberId}
                  onTaskUpdated={() => {}}
                  isDragging
                  isTM={isTM}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
