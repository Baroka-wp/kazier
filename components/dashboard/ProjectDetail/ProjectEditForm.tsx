"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Save, X } from "lucide-react";
import { Project, updateProject } from "@/lib/project-actions";
import { getTeams, type TeamMember } from "@/lib/project-actions";

type ProjectExtended = Project & {
  created_at?: Date;
};

export default function ProjectEditForm({ project }: { project: ProjectExtended }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [values, setValues] = useState({
    name: project.name || "",
    description: project.description || "",
    icon: project.icon || "",
    objectives: project.objectives || "",
    stakeholders: project.stakeholders || "",
    start_date: project.start_date ? new Date(project.start_date).toISOString().split("T")[0] : "",
    end_date: project.end_date ? new Date(project.end_date).toISOString().split("T")[0] : "",
    team_ids: project.team_ids || [],
  });

  function setField(key: string, value: string | string[] | null) {
    setValues((v) => ({ ...v, [key]: value }));
    setServerError("");
  }

  function toggleTeam(id: string) {
    setValues((v) => ({
      ...v,
      team_ids: v.team_ids.includes(id) ? v.team_ids.filter((x) => x !== id) : [...v.team_ids, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.name.trim()) {
      setServerError("Le nom est requis.");
      return;
    }
    setLoading(true);
    setServerError("");
    setSuccessMessage("");

    const result = await updateProject(project.id, {
      name: values.name,
      description: values.description,
      icon: values.icon || null,
      objectives: values.objectives || null,
      stakeholders: values.stakeholders || null,
      start_date: values.start_date || null,
      end_date: values.end_date || null,
      team_ids: values.team_ids,
    });

    setLoading(false);

    if (result.success) {
      setSuccessMessage("Projet mis à jour avec succès !");
      setTimeout(() => {
        router.push(`/dashboard/projects/${project.id}`);
      }, 1500);
    } else {
      setServerError(result.error || "Erreur lors de la modification.");
    }
  }

  // Available icons
  const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
    database: (props) => (
      <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
    settings: (props) => (
      <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    users: (props) => (
      <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    target: (props) => (
      <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
    briefcase: (props) => (
      <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
    zap: (props) => (
      <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    layers: (props) => (
      <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
    workflow: (props) => (
      <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  };

  const AVAILABLE_ICONS = Object.entries(ICON_MAP).map(([id, component]) => ({
    id,
    label: id.charAt(0).toUpperCase() + id.slice(1),
    component,
  }));

  // Teams
  const [teams, setTeams] = useState<TeamMember[]>([]);

  useEffect(() => {
    getTeams().then((result) => {
      if (result.success && result.teams) {
        setTeams(result.teams);
      }
    });
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#F5F2ED" }}>
      {/* Header */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          padding: "12px 24px",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => router.back()}
              style={{
                background: "none",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                cursor: "pointer",
                color: "#666",
                borderRadius: "8px",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#e8eaed";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1A1A1A", margin: 0 }}>
              Modifier le projet
            </h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px" }}>
        {serverError && (
          <div
            style={{
              marginBottom: "20px",
              padding: "14px 18px",
              borderRadius: "10px",
              background: "rgba(229,62,62,0.07)",
              border: "1px solid rgba(229,62,62,0.2)",
              fontSize: "0.85rem",
              color: "#e53e3e",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span>{serverError}</span>
          </div>
        )}

        {successMessage && (
          <div
            style={{
              marginBottom: "20px",
              padding: "14px 18px",
              borderRadius: "10px",
              background: "rgba(45,122,79,0.07)",
              border: "1px solid rgba(45,122,79,0.2)",
              fontSize: "0.85rem",
              color: "#2D7A4F",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span>{successMessage}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            background: "#fff",
            borderRadius: "14px",
            padding: "24px",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          {/* Icon selection */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#666",
                marginBottom: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Icône du projet
            </label>
            <div
              style={{
                display: "flex",
                gap: "8px",
                padding: "10px",
                background: "#e8eaed",
                borderRadius: "8px",
                border: "1.5px solid rgba(0,0,0,0.08)",
                width: "fit-content",
              }}
            >
              {AVAILABLE_ICONS.map(({ id, label, component: IC }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setField("icon", id)}
                  title={label}
                  style={{
                    width: "40px",
                    height: "40px",
                    padding: "8px",
                    borderRadius: "6px",
                    border:
                      values.icon === id ? "2px solid #6B1A2A" : "1.5px solid rgba(0,0,0,0.08)",
                    background: values.icon === id ? "rgba(107,26,42,0.1)" : "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: values.icon === id ? "#6B1A2A" : "#666",
                    transition: "all 0.15s",
                  }}
                >
                  <IC size={18} />
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#666",
                marginBottom: "6px",
              }}
            >
              Nom du projet *
            </label>
            <input
              type="text"
              value={values.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Ex: Kazier"
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "8px",
                border: "1.5px solid rgba(0,0,0,0.08)",
                background: "#e8eaed",
                fontSize: "0.9rem",
                fontFamily: "'DM Sans', sans-serif",
                color: "#1A1A1A",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#666",
                marginBottom: "6px",
              }}
            >
              Description
            </label>
            <textarea
              value={values.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Décrivez le projet..."
              rows={3}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "8px",
                border: "1.5px solid rgba(0,0,0,0.08)",
                background: "#e8eaed",
                fontSize: "0.9rem",
                fontFamily: "'DM Sans', sans-serif",
                color: "#1A1A1A",
                outline: "none",
                resize: "vertical" as const,
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Objectives */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#666",
                marginBottom: "6px",
              }}
            >
              Objectifs du projet
            </label>
            <textarea
              value={values.objectives}
              onChange={(e) => setField("objectives", e.target.value)}
              placeholder="Quels sont les objectifs de ce projet ?"
              rows={4}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "8px",
                border: "1.5px solid rgba(0,0,0,0.08)",
                background: "#e8eaed",
                fontSize: "0.9rem",
                fontFamily: "'DM Sans', sans-serif",
                color: "#1A1A1A",
                outline: "none",
                resize: "vertical" as const,
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Stakeholders */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#666",
                marginBottom: "6px",
              }}
            >
              Parties prenantes
            </label>
            <textarea
              value={values.stakeholders}
              onChange={(e) => setField("stakeholders", e.target.value)}
              placeholder="Qui sont les parties prenantes de ce projet ?"
              rows={3}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "8px",
                border: "1.5px solid rgba(0,0,0,0.08)",
                background: "#e8eaed",
                fontSize: "0.9rem",
                fontFamily: "'DM Sans', sans-serif",
                color: "#1A1A1A",
                outline: "none",
                resize: "vertical" as const,
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Dates */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#666",
                  marginBottom: "6px",
                }}
              >
                Date de début
              </label>
              <input
                type="date"
                value={values.start_date}
                onChange={(e) => setField("start_date", e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: "8px",
                  border: "1.5px solid rgba(0,0,0,0.08)",
                  background: "#e8eaed",
                  fontSize: "0.9rem",
                  fontFamily: "'DM Sans', sans-serif",
                  color: "#1A1A1A",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#666",
                  marginBottom: "6px",
                }}
              >
                Date de fin
              </label>
              <input
                type="date"
                value={values.end_date}
                onChange={(e) => setField("end_date", e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: "8px",
                  border: "1.5px solid rgba(0,0,0,0.08)",
                  background: "#e8eaed",
                  fontSize: "0.9rem",
                  fontFamily: "'DM Sans', sans-serif",
                  color: "#1A1A1A",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Teams */}
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#666",
                marginBottom: "10px",
              }}
            >
              Équipes ({values.team_ids.length})
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                padding: "12px",
                background: "#e8eaed",
                borderRadius: "8px",
                border: "1.5px solid rgba(0,0,0,0.08)",
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              {teams.length === 0 ? (
                <p style={{ fontSize: "0.8rem", color: "#999", gridColumn: "1 / -1" }}>
                  Aucune équipe disponible
                </p>
              ) : (
                teams.map((team) => (
                  <label
                    key={team.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      cursor: "pointer",
                      borderRadius: "6px",
                      background: values.team_ids.includes(team.id)
                        ? "rgba(107,26,42,0.1)"
                        : "transparent",
                      transition: "all 0.15s",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={values.team_ids.includes(team.id)}
                      onChange={() => toggleTeam(team.id)}
                      style={{ cursor: "pointer" }}
                    />
                    <span style={{ fontSize: "0.85rem", color: "#666" }}>{team.full_name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              paddingTop: "20px",
              borderTop: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <button
              type="button"
              onClick={() => router.back()}
              disabled={loading}
              style={{
                flex: 1,
                padding: "12px 18px",
                borderRadius: "10px",
                border: "1.5px solid rgba(0,0,0,0.08)",
                background: "#e8eaed",
                color: "#666",
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <X size={18} />
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: "12px 18px",
                borderRadius: "10px",
                border: "none",
                background: loading ? "rgba(107,26,42,0.5)" : "#6B1A2A",
                color: "white",
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
                opacity: loading ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <Save size={18} />
              {loading ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
