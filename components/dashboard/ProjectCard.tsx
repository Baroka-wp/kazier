"use client";

import { useState } from "react";
import { ChevronDown, AlertCircle } from "lucide-react";
import TaskItemTeam from "./TaskItemTeam";
import {
  assignTaskToSelf,
  unassignTaskFromSelf,
  type ProjectWithTasks,
} from "@/lib/team-actions";
import type { Task } from "@/lib/task-actions";
type Props = {
  project: ProjectWithTasks;
  teamMemberId: number;
  onTasksUpdated: (updatedTasks: Task[]) => void;
};

export default function ProjectCard({
  project,
  teamMemberId,
  onTasksUpdated,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [tasks, setTasks] = useState(project.tasks);
  const [loadingTaskId, setLoadingTaskId] = useState<number | null>(null);

  // Compter les tâches
  const assignedToMe = tasks.filter(
    (t) => Array.isArray(t.assigned_to) && t.assigned_to.includes(teamMemberId),
  ).length;
  const total = tasks.length;

  // Séparer les tâches libres et assignées
  const freeTasks = tasks.filter((t) => !t.assigned_to || t.assigned_to.length === 0);
  const myTasks = tasks.filter((t) => Array.isArray(t.assigned_to) && t.assigned_to.includes(teamMemberId));
  const othersTasks = tasks.filter((t) => Array.isArray(t.assigned_to) && t.assigned_to.length > 0 && !t.assigned_to.includes(teamMemberId));

  async function handleAssign(taskId: number) {
    setLoadingTaskId(taskId);
    const res = await assignTaskToSelf(taskId, teamMemberId);
    setLoadingTaskId(null);

    if (res.success && res.task) {
      const updated = tasks.map((t) => (t.id === taskId ? res.task! : t));
      setTasks(updated);
      onTasksUpdated(updated);
    }
  }

  async function handleUnassign(taskId: number) {
    setLoadingTaskId(taskId);
    const res = await unassignTaskFromSelf(taskId, teamMemberId);
    setLoadingTaskId(null);

    if (res.success && res.task) {
      const updated = tasks.map((t) => (t.id === taskId ? res.task! : t));
      setTasks(updated);
      onTasksUpdated(updated);
    }
  }

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "14px",
        border: "1.5px solid rgba(0,0,0,0.06)",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 8px 24px rgba(0,0,0,0.1)";
        (e.currentTarget as HTMLElement).style.borderColor =
          "rgba(107,26,42,0.1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 2px 8px rgba(0,0,0,0.04)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.06)";
      }}
    >
      {/* Header - Sticky */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "16px",
          cursor: "pointer",
          background: "#f9f7f4",
          borderBottom: isOpen ? "1px solid rgba(0,0,0,0.06)" : "none",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.background = "#f5f2ed")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.background = "#f9f7f4")
        }
      >
        {/* Icon */}
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            background: "rgba(107,26,42,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.2rem",
            flexShrink: 0,
          }}
        >
          {project.icon || "📦"}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              color: "#1A1A1A",
              marginBottom: "2px",
            }}
          >
            {project.name}
          </h3>
          <p
            style={{
              fontSize: "0.75rem",
              color: "#999",
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {project.description || "Pas de description"}
          </p>
        </div>

        {/* Counter */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div
            style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1A1A1A" }}
          >
            {assignedToMe}/{total}
          </div>
          <div style={{ fontSize: "0.65rem", color: "#999", marginTop: "2px" }}>
            assignées
          </div>
        </div>

        {/* Toggle Icon */}
        <ChevronDown
          size={18}
          style={{
            color: "#666",
            transition: "transform 0.2s",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}
        />
      </div>

      {/* Content - Accordion */}
      {isOpen && (
        <div
          style={{
            padding: "12px",
            maxHeight: "500px",
            overflowY: "auto",
            background: "#fafafa",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {tasks.length === 0 ? (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                color: "#999",
                fontSize: "0.85rem",
              }}
            >
              Aucune tâche dans ce projet
            </div>
          ) : (
            <>
              {/* Mes tâches */}
              {myTasks.length > 0 && (
                <>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "#999",
                      padding: "8px 4px",
                    }}
                  >
                    ✓ Mes tâches ({myTasks.length})
                  </div>
                  {myTasks.map((task) => (
                    <TaskItemTeam
                      key={task.id}
                      id={task.id}
                      title={task.title}
                      description={task.description}
                      status={task.status}
                      priority={task.priority}
                      assigned_to_names={task.assigned_to_names}
                      due_date={task.due_date}
                      isAssignedToMe={true}
                      isFree={false}
                      onAssign={() => handleAssign(task.id)}
                      onUnassign={() => handleUnassign(task.id)}
                      loading={loadingTaskId === task.id}
                    />
                  ))}
                </>
              )}

              {/* Tâches libres */}
              {freeTasks.length > 0 && (
                <>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "#999",
                      padding: "8px 4px",
                      marginTop: "8px",
                    }}
                  >
                    ◯ Tâches libres ({freeTasks.length})
                  </div>
                  {freeTasks.map((task) => (
                    <TaskItemTeam
                      key={task.id}
                      id={task.id}
                      title={task.title}
                      description={task.description}
                      status={task.status}
                      priority={task.priority}
                      assigned_to_names={task.assigned_to_names}
                      due_date={task.due_date}
                      isAssignedToMe={false}
                      isFree={true}
                      onAssign={() => handleAssign(task.id)}
                      onUnassign={() => handleUnassign(task.id)}
                      loading={loadingTaskId === task.id}
                    />
                  ))}
                </>
              )}

              {/* Tâches assignées à d'autres */}
              {othersTasks.length > 0 && (
                <>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "#999",
                      padding: "8px 4px",
                      marginTop: "8px",
                    }}
                  >
                    👤 Assignées à d'autres ({othersTasks.length})
                  </div>
                  {othersTasks.map((task) => (
                    <TaskItemTeam
                      key={task.id}
                      id={task.id}
                      title={task.title}
                      description={task.description}
                      status={task.status}
                      priority={task.priority}
                      assigned_to_names={task.assigned_to_names}
                      due_date={task.due_date}
                      isAssignedToMe={false}
                      isFree={false}
                      onAssign={() => handleAssign(task.id)}
                      onUnassign={() => handleUnassign(task.id)}
                      loading={loadingTaskId === task.id}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
