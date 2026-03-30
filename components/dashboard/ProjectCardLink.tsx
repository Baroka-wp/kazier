"use client";

import Link from "next/link";
import {
  ChevronRight,
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
import { type ProjectWithTasks } from "@/lib/team-actions";

type Props = {
  project: ProjectWithTasks;
};

// ✅ Map des icônes Lucide disponibles
const ICON_MAP: Record<string, React.ReactNode> = {
  database: <Database size={40} color="#6B1A2A" />,
  settings: <Settings size={40} color="#6B1A2A" />,
  users: <Users size={40} color="#6B1A2A" />,
  zap: <Zap size={40} color="#6B1A2A" />,
  briefcase: <Briefcase size={40} color="#6B1A2A" />,
  "bar-chart": <BarChart3 size={40} color="#6B1A2A" />,
  target: <Target size={40} color="#6B1A2A" />,
  lock: <Lock size={40} color="#6B1A2A" />,
  layers: <Layers size={40} color="#6B1A2A" />,
  cpu: <Cpu size={40} color="#6B1A2A" />,
  workflow: <Workflow size={40} color="#6B1A2A" />,
  boxes: <Boxes size={40} color="#6B1A2A" />,
};

function getProjectIcon(iconId: string | null) {
  if (!iconId) {
    return <Package size={40} color="#6B1A2A" />;
  }
  return ICON_MAP[iconId] || <Package size={40} color="#6B1A2A" />;
}

export default function ProjectCardLink({ project }: Props) {
  console.log("🎨 ProjectCardLink - Icon ID:", project.icon); // Debug

  return (
    <Link href={`/dashboard/teams/team-projects/${project.id}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          border: "1.5px solid rgba(0,0,0,0.06)",
          padding: "20px",
          cursor: "pointer",
          transition: "all 0.15s",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(107,26,42,0.1)";
          (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.06)";
          (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        }}
      >
        {/* Icon + Titre */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "12px",
              background: "rgba(107,26,42,0.08)",
            }}
          >
            {getProjectIcon(project.icon)}
          </div>
          <ChevronRight size={20} color="#aaa" style={{ flexShrink: 0, marginTop: "4px" }} />
        </div>

        {/* Titre */}
        <div>
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              color: "#1A1A1A",
              margin: 0,
              marginBottom: "4px",
            }}
          >
            {project.name}
          </h3>
        </div>

        {/* Description */}
        <p
          style={{
            fontSize: "0.8rem",
            color: "#666",
            margin: 0,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            lineHeight: 1.4,
          }}
        >
          {project.description || "Pas de description"}
        </p>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            paddingTop: "12px",
            borderTop: "1px solid rgba(0,0,0,0.06)",
            fontSize: "0.8rem",
            color: "#666",
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: "#1A1A1A" }}>{project.tasks.length}</div>
            <div style={{ fontSize: "0.7rem", color: "#999" }}>tâches</div>
          </div>
          <div>
            <div style={{ fontWeight: 600, color: "#1A1A1A" }}>{project.team_members.length}</div>
            <div style={{ fontSize: "0.7rem", color: "#999" }}>membres</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
