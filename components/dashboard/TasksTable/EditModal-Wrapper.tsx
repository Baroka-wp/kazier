"use client";

import { X } from "lucide-react";
import { Task, EditMode, TeamMember, Project } from "./types";
import { CreateTaskForm } from "./EditModal-CREATE";
import { UpdateTaskForm } from "./EditModal-UPDATE";

export function EditModal({
  mode,
  task,
  projects,
  teams,
  onClose,
  onSaved,
}: {
  mode: EditMode;
  task: Task | null;
  projects: Project[];
  teams: TeamMember[];
  onClose: () => void;
  onSaved: (updated: Task, created: boolean) => void;
}) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.15)", animation: "popIn 0.2s ease" }}>

        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#aaa", marginBottom: "2px" }}>
              {mode === "create" ? "Nouvelle tâche" : "Édition"}
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1A1A1A" }}>
              {mode === "create" ? "Ajouter une tâche" : "Modifier la tâche"}
            </div>
          </div>
          <button onClick={onClose} style={{ width: "30px", height: "30px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.08)", background: "#F5F2ED", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        {mode === "create" ? (
          <CreateTaskForm
            projects={projects}
            onSaved={onSaved}
            onClose={onClose}
          />
        ) : (
          <UpdateTaskForm
            task={task!}
            projects={projects}
            onSaved={onSaved}
            onClose={onClose}
          />
        )}
      </div>

      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
