"use client";

import { X, ChevronDown, Plus } from "lucide-react";

export function FilterSlot({
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  onAddTask,
  canViewTeam,
}: {
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  priorityFilter: string;
  setPriorityFilter: (p: string) => void;
  onAddTask: () => void;
  canViewTeam: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      {/* Filtre Statut */}
      <div style={{ position: "relative" }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            appearance: "none",
            paddingLeft: "12px",
            paddingRight: "28px",
            paddingTop: "8px",
            paddingBottom: "8px",
            border: "1.5px solid rgba(0,0,0,0.08)",
            borderRadius: "10px",
            background: "#e8eaed",
            fontSize: "0.82rem",
            fontFamily: "'DM Sans', sans-serif",
            color: statusFilter ? "#1A1A1A" : "#aaa",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="">Tous les statuts</option>
          <option value="à faire">À faire</option>
          <option value="en cours">En cours</option>
          <option value="terminée">Terminée</option>
        </select>
        <ChevronDown
          size={12}
          style={{
            position: "absolute",
            right: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#aaa",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Filtre Priorité */}
      <div style={{ position: "relative" }}>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          style={{
            appearance: "none",
            paddingLeft: "12px",
            paddingRight: "28px",
            paddingTop: "8px",
            paddingBottom: "8px",
            border: "1.5px solid rgba(0,0,0,0.08)",
            borderRadius: "10px",
            background: "#e8eaed",
            fontSize: "0.82rem",
            fontFamily: "'DM Sans', sans-serif",
            color: priorityFilter ? "#1A1A1A" : "#aaa",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="">Toutes les priorités</option>
          <option value="low">Faible</option>
          <option value="medium">Moyen</option>
          <option value="high">Élevée</option>
        </select>
        <ChevronDown
          size={12}
          style={{
            position: "absolute",
            right: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#aaa",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Bouton Réinitialiser */}
      {(statusFilter || priorityFilter) && (
        <button
          onClick={() => {
            setStatusFilter("");
            setPriorityFilter("");
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "8px 12px",
            borderRadius: "10px",
            border: "1.5px solid rgba(107,26,42,0.2)",
            background: "rgba(107,26,42,0.05)",
            color: "#6B1A2A",
            fontSize: "0.78rem",
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <X size={12} /> Réinitialiser
        </button>
      )}

      {/* Bouton Ajouter Tâche */}
      {canViewTeam && (
        <button
          onClick={onAddTask}
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "10px",
            border: "none",
            background: "#6B1A2A",
            color: "white",
            fontSize: "0.82rem",
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <Plus size={14} /> Ajouter tâche
        </button>
      )}
    </div>
  );
}
