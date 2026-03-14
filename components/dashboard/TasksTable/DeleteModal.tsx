"use client";

import { AlertTriangle } from "lucide-react";
import { Task } from "./types";

export function DeleteModal({ task, onConfirm, onCancel, loading }: {
  task: Task;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "420px", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.15)", animation: "popIn 0.2s ease" }}>
        <div style={{ padding: "28px 24px 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(229,62,62,0.08)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
            <AlertTriangle size={24} color="#e53e3e" />
          </div>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1A1A1A", marginBottom: "6px" }}>Supprimer cette tâche ?</h3>
          <p style={{ fontSize: "0.82rem", color: "#888", marginBottom: "8px" }}>
            Vous êtes sur le point de supprimer <strong>{task.title}</strong>.
          </p>
          <p style={{ fontSize: "0.78rem", color: "#e53e3e", fontWeight: 500 }}>
            Cette action est irréversible.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", padding: "20px 24px 24px" }}>
          <button onClick={onCancel} disabled={loading} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1.5px solid rgba(0,0,0,0.08)", background: "#F5F2ED", color: "#666", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            Annuler
          </button>
          <button onClick={onConfirm} disabled={loading} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", background: loading ? "rgba(229,62,62,0.5)" : "#e53e3e", color: "white", fontSize: "0.85rem", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            {loading ? "Suppression..." : "Supprimer"}
          </button>
        </div>
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
