"use client";

import { useState } from "react";
import { DndContext, type DragEndEvent, closestCorners } from "@dnd-kit/core";
import {
  ChevronLeft,
  Package,
  Database,
  Settings,
  Users,
  Zap,
  Briefcase,
  BarChart3,
  Target,
  Lock,
  Layers,
  Cpu,
  Workflow,
  Boxes,
} from "lucide-react";
import Link from "next/link";
import TaskColumn from "./TaskColumn";
import { updateTaskStatus, type ProjectWithTasks } from "@/lib/team-actions";
import type { Task } from "@/lib/task-actions";
type Props = {
  project: ProjectWithTasks;
  initialTasks: Task[];
  teamMemberId: string;
};

type StatusType = "à faire" | "en cours" | "review" | "terminée";
const STATUSES: StatusType[] = ["à faire", "en cours", "review", "terminée"];

// ✅ Map des icônes Lucide
const ICON_MAP: Record<string, React.ReactNode> = {
  database: <Database size={24} color="#6B1A2A" />,
  settings: <Settings size={24} color="#6B1A2A" />,
  users: <Users size={24} color="#6B1A2A" />,
  zap: <Zap size={24} color="#6B1A2A" />,
  briefcase: <Briefcase size={24} color="#6B1A2A" />,
  "bar-chart": <BarChart3 size={24} color="#6B1A2A" />,
  target: <Target size={24} color="#6B1A2A" />,
  lock: <Lock size={24} color="#6B1A2A" />,
  layers: <Layers size={24} color="#6B1A2A" />,
  cpu: <Cpu size={24} color="#6B1A2A" />,
  workflow: <Workflow size={24} color="#6B1A2A" />,
  boxes: <Boxes size={24} color="#6B1A2A" />,
};

function getProjectIcon(iconId: string | null) {
  if (!iconId) {
    return <Package size={24} color="#6B1A2A" />;
  }
  return ICON_MAP[iconId] || <Package size={24} color="#6B1A2A" />;
}

export default function ProjectDetailClient({ project, initialTasks, teamMemberId }: Props) {
  const [tasks, setTasks] = useState(initialTasks);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id.toString().replace("task-", "");
    const newStatus = over.id.toString().replace("column-", "") as StatusType;

    if (active.id === over.id) return;

    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === taskId ? ({ ...t, status: newStatus } as Task) : t))
    );

    const res = await updateTaskStatus(taskId, newStatus);
    if (!res.success) {
      setTasks(initialTasks);
    }
  }

  function handleTaskUpdated(updated: Task) {
    setTasks((prevTasks) => prevTasks.map((t) => (t.id === updated.id ? updated : t)));
  }

  // Grouper les tâches par statut
  const tasksByStatus = STATUSES.reduce(
    (acc, status) => {
      acc[status] = tasks.filter((t) => t.status === status);
      return acc;
    },
    {} as Record<StatusType, Task[]>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fff",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Sticky Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "#fff",
          padding: "16px 20px",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          flexShrink: 0,
        }}
      >
        <div style={{ maxWidth: "1600px", margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <Link
              href="/dashboard/teams"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                border: "1px solid rgba(0,0,0,0.08)",
                background: "#e8eaed",
                cursor: "pointer",
                color: "#666",
                textDecoration: "none",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "rgba(107,26,42,0.1)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "#e8eaed";
              }}
            >
              <ChevronLeft size={16} />
            </Link>
            <div>
              <h1
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "#1A1A1A",
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {getProjectIcon(project.icon)} {project.name}
              </h1>
            </div>
          </div>
          <p style={{ fontSize: "0.85rem", color: "#666", margin: 0 }}>{project.description}</p>
        </div>
      </div>

      {/* Kanban Board - avec padding et border-radius */}
      <div style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
        <div style={{ maxWidth: "1600px", margin: "0 auto" }}>
          <div
            style={{
              borderRadius: "14px",
              border: "1px solid rgba(0,0,0,0.06)",
              background: "#f1f3f5",
              padding: "16px",
              minHeight: "100%",
              overflow: "hidden",
            }}
          >
            <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  overflowX: "auto",
                  paddingBottom: "20px",
                }}
              >
                {STATUSES.map((status) => (
                  <TaskColumn
                    key={status}
                    status={status}
                    tasks={tasksByStatus[status]}
                    teamMemberId={teamMemberId}
                    onTaskUpdated={handleTaskUpdated}
                  />
                ))}
              </div>
            </DndContext>
          </div>
        </div>
      </div>
    </div>
  );
}
