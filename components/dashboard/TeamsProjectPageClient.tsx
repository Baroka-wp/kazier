"use client";

import dynamic from "next/dynamic";
import { Task } from "@/lib/task-actions";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

// Charger le Kanban en lazy - client only
const TeamsKanbanWrapper = dynamic(
  () => import("@/components/dashboard/TeamsKanbanWrapper"),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: "40px", textAlign: "center", color: "#999" }}>
        Chargement du tableau...
      </div>
    ),
  }
);

type Props = {
  tasks: Task[];
  teamMemberId: number;
  projectName: string;
};

export default function TeamsProjectPageClient({ tasks, teamMemberId, projectName }: Props) {
  const router = useRouter();

  return (
    <div style={{ padding: "20px", maxWidth: "1600px", margin: "0 auto" }}>
      {/* Header avec bouton retour */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <button
          onClick={() => router.back()}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            border: "1px solid rgba(0,0,0,0.08)",
            background: "#F5F2ED",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#666",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(107,26,42,0.07)"}
          onMouseLeave={e => e.currentTarget.style.background = "#F5F2ED"}
        >
          <ChevronLeft size={20} />
        </button>

        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "#1A1A1A", margin: 0 }}>
            {projectName}
          </h1>
          <p style={{ fontSize: "0.9rem", color: "#666", margin: "4px 0 0 0" }}>
            {tasks.length} tâche{tasks.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Kanban - Lazy loaded */}
      <TeamsKanbanWrapper tasks={tasks} teamMemberId={teamMemberId} />
    </div>
  );
}
