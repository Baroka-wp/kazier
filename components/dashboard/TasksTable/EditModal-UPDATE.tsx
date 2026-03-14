"use client";

import { useState, useEffect } from "react";
import { Task, TeamMember, Project } from "./types";
import { updateTask, getTeamMembersByProject } from "@/lib/task-actions";
import DatePicker from "@/components/dashboard/DatePicker";

// ✅ Parse manuel — évite le bug de new Date("YYYY-MM-DD HH:mm") invalide en prod
function formatDateForPicker(raw: any): string {
  if (!raw) return "";
  try {
    // Cas 1 : string "YYYY-MM-DD HH:mm" ou "YYYY-MM-DD HH:mm:ss" → parse direct sans new Date()
    if (typeof raw === "string") {
      const match = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
      if (match) return `${match[1]} ${match[2]}`;
      return "";
    }
    // Cas 2 : objet Date JS
    if (raw instanceof Date && !isNaN(raw.getTime())) {
      const y  = raw.getUTCFullYear();
      const mo = String(raw.getUTCMonth() + 1).padStart(2, "0");
      const d  = String(raw.getUTCDate()).padStart(2, "0");
      const h  = String(raw.getUTCHours()).padStart(2, "0");
      const mi = String(raw.getUTCMinutes()).padStart(2, "0");
      return `${y}-${mo}-${d} ${h}:${mi}`;
    }
    return "";
  } catch {
    return "";
  }
}

function UpdateTaskForm({
  task,
  projects,
  onSaved,
  onClose,
}: {
  task: Task;
  projects: Project[];
  onSaved: (task: Task, created: boolean) => void;
  onClose: () => void;
}) {
  const initialAssignedTo = Array.isArray(task.assigned_to) ? task.assigned_to : [];

  const [values, setValues] = useState({
    title:       task.title || "",
    description: task.description || "",
    status:      task.status || ("à faire" as const),
    priority:    task.priority || ("medium" as const),
    project_id:  task.project_id || null as number | null,
    assigned_to: initialAssignedTo as number[],
    due_date:    formatDateForPicker(task.due_date),
  });

  const [projectMembers, setProjectMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loading, setLoading]               = useState(false);
  const [serverError, setServerError]       = useState("");

  // Au montage : charger les membres du projet existant
  useEffect(() => {
    if (task.project_id) {
      getTeamMembersByProject(task.project_id).then(res => {
        if (res.success && res.members) setProjectMembers(res.members);
      });
    }
  }, []);

  // Quand project_id change : recharger membres + reset assigned_to
  useEffect(() => {
    if (!values.project_id) { setProjectMembers([]); return; }
    setLoadingMembers(true);
    getTeamMembersByProject(values.project_id).then(res => {
      setLoadingMembers(false);
      if (res.success && res.members) {
        setProjectMembers(res.members);
        const validIds = res.members.map(m => m.id);
        setValues(v => ({ ...v, assigned_to: v.assigned_to.filter(id => validIds.includes(id)) }));
      }
    });
  }, [values.project_id]);

  function setField(key: string, value: any) {
    setValues(v => ({ ...v, [key]: value }));
    setServerError("");
  }

  function handleProjectChange(projectId: number | null) {
    setValues(v => ({ ...v, project_id: projectId, assigned_to: [] }));
    setServerError("");
  }

  function toggleMember(id: number) {
    setValues(v => ({
      ...v,
      assigned_to: v.assigned_to.includes(id)
        ? v.assigned_to.filter(x => x !== id)
        : [...v.assigned_to, id],
    }));
  }

  async function handleSubmit() {
    if (!values.title.trim()) { setServerError("Le titre est obligatoire."); return; }
    setLoading(true);

    // Formater la date avec l'heure si seulement la date est sélectionnée
    let finalDueDate = values.due_date;
    if (finalDueDate && finalDueDate.length === 10) {
      // Seulement la date (YYYY-MM-DD), ajouter 23:59 comme heure par défaut
      finalDueDate = `${finalDueDate} 23:59`;
    }

    console.log("[UpdateTaskForm] due_date avant envoi:", finalDueDate);

    const data = {
      title:       values.title.trim(),
      description: values.description,
      status:      values.status,
      priority:    values.priority,
      project_id:  values.project_id,
      assigned_to: values.assigned_to.length ? values.assigned_to : null,
      due_date:    finalDueDate || null,
    };

    const result = await updateTask(task.id, data);
    setLoading(false);

    console.log("[UpdateTaskForm] résultat:", result);

    if (result.success) {
      onSaved(result.task!, false);
      onClose();
    } else {
      setServerError(result.error ?? "Erreur lors de la modification de la tâche.");
    }
  }

  const inputStyle = {
    width: "100%", padding: "8px 10px", borderRadius: "10px",
    border: "1.5px solid rgba(0,0,0,0.08)", background: "#F5F2ED",
    fontSize: "0.82rem", fontFamily: "'DM Sans', sans-serif",
    color: "#1A1A1A", outline: "none",
  };

  const labelStyle = {
    display: "block", fontSize: "0.7rem", fontWeight: 600,
    textTransform: "uppercase" as const, letterSpacing: "0.08em",
    color: "#999", marginBottom: "4px",
  };

  return (
    <div style={{ padding: "18px 22px 22px" }}>
      {serverError && (
        <div style={{ marginBottom: "12px", padding: "8px 12px", borderRadius: "10px", background: "rgba(229,62,62,0.07)", border: "1px solid rgba(229,62,62,0.2)", fontSize: "0.8rem", color: "#e53e3e" }}>
          {serverError}
        </div>
      )}

      {/* Titre */}
      <div style={{ marginBottom: "10px" }}>
        <small style={labelStyle}>Titre</small>
        <input type="text" value={values.title}
          onChange={e => setField("title", e.target.value)}
          style={{ ...inputStyle, cursor: "text" }} />
      </div>

      {/* Description */}
      <div style={{ marginBottom: "10px" }}>
        <small style={labelStyle}>Description</small>
        <textarea value={values.description}
          onChange={e => setField("description", e.target.value)}
          style={{ ...inputStyle, minHeight: "80px", resize: "vertical", cursor: "text" }} />
      </div>

      {/* Status + Priority */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
        <div>
          <small style={labelStyle}>Statut</small>
          <select value={values.status} onChange={e => setField("status", e.target.value)}
            style={{ ...inputStyle, appearance: "none" as any, cursor: "pointer" }}>
            <option value="à faire">À faire</option>
            <option value="en cours">En cours</option>
            <option value="terminée">Terminée</option>
          </select>
        </div>
        <div>
          <small style={labelStyle}>Priorité</small>
          <select value={values.priority} onChange={e => setField("priority", e.target.value)}
            style={{ ...inputStyle, appearance: "none" as any, cursor: "pointer" }}>
            <option value="low">Faible</option>
            <option value="medium">Moyen</option>
            <option value="high">Élevée</option>
          </select>
        </div>
      </div>

      {/* Projet */}
      <div style={{ marginBottom: "10px" }}>
        <small style={labelStyle}>Projet</small>
        <select value={values.project_id || ""}
          onChange={e => handleProjectChange(e.target.value ? parseInt(e.target.value) : null)}
          style={{ ...inputStyle, appearance: "none" as any, cursor: "pointer" }}>
          <option value="">Aucun projet</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Assigné à */}
      {values.project_id && (
        <div style={{ marginBottom: "10px" }}>
          <small style={labelStyle}>
            Assigné à{loadingMembers ? " (chargement...)" : ""}
          </small>
          {!loadingMembers && projectMembers.length > 0 ? (
            <>
              <div style={{ background: "#F5F2ED", borderRadius: "10px", border: "1.5px solid rgba(0,0,0,0.08)", padding: "8px 10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                {projectMembers.map(m => {
                  const checked = values.assigned_to.includes(m.id);
                  return (
                    <label key={m.id} onClick={() => toggleMember(m.id)}
                      style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", padding: "4px 6px", borderRadius: "8px", background: checked ? "rgba(107,26,42,0.06)" : "transparent", transition: "background 0.15s" }}>
                      <div style={{ width: "16px", height: "16px", borderRadius: "4px", flexShrink: 0, border: checked ? "2px solid #6B1A2A" : "2px solid rgba(0,0,0,0.15)", background: checked ? "#6B1A2A" : "white", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                        {checked && (
                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span style={{ fontSize: "0.82rem", color: "#1A1A1A", fontWeight: checked ? 600 : 400 }}>
                        {m.full_name}
                      </span>
                    </label>
                  );
                })}
              </div>
              {values.assigned_to.length > 0 && (
                <p style={{ marginTop: "5px", fontSize: "0.7rem", color: "#6B1A2A", fontWeight: 500 }}>
                  {values.assigned_to.length} personne{values.assigned_to.length > 1 ? "s" : ""} sélectionnée{values.assigned_to.length > 1 ? "s" : ""}
                </p>
              )}
            </>
          ) : !loadingMembers ? (
            <p style={{ fontSize: "0.78rem", color: "#aaa", padding: "8px 10px", background: "#F5F2ED", borderRadius: "10px" }}>
              Aucun membre dans ce projet.
            </p>
          ) : null}
        </div>
      )}

      {/* Due Date */}
      <div style={{ marginBottom: "10px" }}>
        <small style={labelStyle}>Date limite (avec heure)</small>
        <DatePicker value={values.due_date} onChange={e => setField("due_date", e)} placeholder="Sélectionner date et heure" />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={onClose} disabled={loading}
          style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1.5px solid rgba(0,0,0,0.08)", background: "#F5F2ED", color: "#666", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
          Annuler
        </button>
        <button onClick={handleSubmit} disabled={loading}
          style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", background: "#6B1A2A", color: "white", fontSize: "0.85rem", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Mise à jour..." : "Mettre à jour"}
        </button>
      </div>
    </div>
  );
}

export { UpdateTaskForm };
