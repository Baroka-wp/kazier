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
import { ArrowLeft, ChevronDown, FolderOpen, Plus } from "lucide-react";
import { Task } from "@/lib/task-actions";
import { updateTaskStatus } from "@/lib/team-actions";
import { getSessionPermissions, type SessionPermissions } from "@/lib/session-actions";
import TaskColumn from "./TaskColumn";
import TaskCard from "./TaskCard";
import TaskDetailPage from "./TaskDetailPage";

type Project = { id: number; name: string };

type Props = {
  tasks: Task[];
  isLoading?: boolean;
  projects?: Project[];
  selectedProjectId?: number | null;
  onProjectChange?: (id: number | null) => void;
  onAddTask?: () => void;
  projectName?: string;
  onBack?: () => void;
  isTM?: boolean;
  teamMemberId?: number;
};

export default function TMKanbanWrapper({
  tasks,
  isLoading = false,
  projects = [],
  selectedProjectId,
  onProjectChange,
  onAddTask,
  projectName,
  onBack,
  isTM = true,
  teamMemberId = 0,
}: Props) {
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [perms, setPerms] = useState<SessionPermissions | null>(null);

  // Fetch permissions from server once on mount
  useEffect(() => {
    getSessionPermissions().then(setPerms);
  }, []);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    if (selectedTask) {
      const updated = localTasks.find((t) => t.id === selectedTask.id);
      if (updated) setSelectedTask(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localTasks]);

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

  const resolvedProjectName =
    projectName ?? projects.find((p) => p.id === selectedProjectId)?.name ?? "Projet";

  // Permissions réelles depuis le serveur — fallback sur les props pendant le chargement
  const resolvedTeamMemberId = perms?.teamMemberId ?? teamMemberId;
  const resolvedCanManage = perms?.canManageTasks ?? isTM;

  // ── Vue détail tâche ──────────────────────────────────────────────────────
  if (selectedTask) {
    return (
      <TaskDetailPage
        task={selectedTask}
        onBack={() => setSelectedTask(null)}
        teamMemberId={resolvedTeamMemberId}
        isTM={resolvedCanManage}
        canManageTasks={resolvedCanManage}
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
        height: "100%",
        background: "#F2EFE9",
        borderRadius: "16px",
        padding: "28px 28px 0 28px",
        overflow: "hidden",
      }}
    >
      {/* ── Page header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "28px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "#111",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Tasks
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {onProjectChange && projects.length > 0 ? (
            <div style={{ position: "relative" }}>
              <FolderOpen
                size={14}
                color="#6B1A2A"
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  zIndex: 1,
                }}
              />
              <select
                value={selectedProjectId ?? ""}
                onChange={(e) => onProjectChange(e.target.value ? parseInt(e.target.value) : null)}
                style={{
                  appearance: "none",
                  WebkitAppearance: "none",
                  paddingLeft: "34px",
                  paddingRight: "32px",
                  paddingTop: "8px",
                  paddingBottom: "8px",
                  borderRadius: "10px",
                  border: "1.5px solid rgba(0,0,0,0.10)",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: "0.78rem",
                  fontWeight: 500,
                  color: selectedProjectId ? "#333" : "#aaa",
                  fontFamily: "'DM Sans', sans-serif",
                  outline: "none",
                  transition: "border-color 0.15s",
                  minWidth: "160px",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(107,26,42,0.4)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.10)")}
              >
                <option value="">Sélectionner un projet</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                color="#aaa"
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
              />
            </div>
          ) : (
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "8px 14px",
                borderRadius: "10px",
                border: "1.5px solid rgba(0,0,0,0.10)",
                background: "#fff",
                cursor: "pointer",
                fontSize: "0.78rem",
                fontWeight: 500,
                color: "#333",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(107,26,42,0.3)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.10)")}
            >
              <FolderOpen size={14} color="#6B1A2A" />
              <span>{resolvedProjectName}</span>
              <ChevronDown size={13} color="#aaa" />
            </button>
          )}

          {/* Bouton AJOUTER — TM/SA uniquement */}
          {resolvedCanManage && (
            <button
              onClick={onAddTask}
              disabled={!selectedProjectId && onProjectChange !== undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "10px",
                border: "none",
                background:
                  !selectedProjectId && onProjectChange !== undefined ? "#ccc" : "#6B1A2A",
                color: "#fff",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor:
                  !selectedProjectId && onProjectChange !== undefined ? "not-allowed" : "pointer",
                letterSpacing: "0.02em",
                transition: "background 0.15s",
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={(e) => {
                if (selectedProjectId || onProjectChange === undefined)
                  e.currentTarget.style.background = "#8B2438";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  !selectedProjectId && onProjectChange !== undefined ? "#ccc" : "#6B1A2A";
              }}
            >
              <Plus size={15} strokeWidth={2.5} />
              AJOUTER
            </button>
          )}
        </div>
      </div>

      {/* ── Kanban columns ── */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#999" }}>Chargement...</div>
      ) : !selectedProjectId && onProjectChange !== undefined ? (
        <div
          style={{ textAlign: "center", padding: "60px 20px", color: "#aaa", fontSize: "0.9rem" }}
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
              paddingBottom: "28px",
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
                teamMemberId={resolvedTeamMemberId}
                onTaskUpdated={(updatedTask) => {
                  setLocalTasks((prev) =>
                    prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
                  );
                }}
                onCardClick={(task) => setSelectedTask(task)}
                onAddTask={status === "à faire" && resolvedCanManage ? onAddTask : undefined}
                readOnly={false}
                isTM={resolvedCanManage}
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
                  teamMemberId={resolvedTeamMemberId}
                  onTaskUpdated={() => {}}
                  isDragging
                  isTM={resolvedCanManage}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
