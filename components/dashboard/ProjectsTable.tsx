"use client";

import { useState, useMemo } from "react";
import { X, AlertTriangle, Plus, CheckCircle2, XCircle } from "lucide-react";
import DataTable from "@/components/dashboard/DataTable";
import { createProject, updateProject, deleteProject, type Project } from "@/lib/project-actions";
import { usePermissions } from "@/hooks/usePermissions";

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  projects: Project[];
};

type Toast = {
  id: number;
  type: "success" | "error";
  message: string;
};

type EditMode = "create" | "update";

type Action = {
  icon: "view" | "edit" | "delete";
  label: string;
  onClick: (p: Project) => void;
};

// ── Avatar pour projet ────────────────────────────────────────────────────────

function ProjectAvatar({ name, icon }: { name: string; icon: string | null }) {
  if (icon) {
    return (
      <div style={{
        width: "36px",
        height: "36px",
        borderRadius: "10px",
        background: "#F5F2ED",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.2rem",
        flexShrink: 0,
      }}>
        {icon}
      </div>
    );
  }

  const initials = name?.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  return (
    <div style={{
      width: "36px",
      height: "36px",
      borderRadius: "10px",
      background: "rgba(107,26,42,0.1)",
      border: "1.5px solid rgba(107,26,42,0.15)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "0.75rem",
      fontWeight: 700,
      color: "#6B1A2A",
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function ToastNotification({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const ok = toast.type === "success";
  return (
    <div style={{
      position: "fixed",
      bottom: "24px",
      right: "24px",
      zIndex: 200,
      display: "flex",
      alignItems: "center",
      gap: "10px",
      background: "#fff",
      border: `1.5px solid ${ok ? "rgba(45,122,79,0.2)" : "rgba(229,62,62,0.2)"}`,
      borderRadius: "12px",
      padding: "12px 16px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
      minWidth: "280px",
      animation: "slideIn 0.25s ease",
    }}>
      {ok
        ? <CheckCircle2 size={18} color="#2D7A4F" />
        : <XCircle size={18} color="#e53e3e" />
      }
      <span style={{ fontSize: "0.83rem", fontWeight: 500, color: "#1A1A1A", flex: 1 }}>
        {toast.message}
      </span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", display: "flex", padding: "2px" }}>
        <X size={14} />
      </button>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Modal View ────────────────────────────────────────────────────────────────

function ViewModal({ project, onClose }: { project: Project; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "460px", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.15)", animation: "popIn 0.2s ease" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ProjectAvatar name={project.name ?? ""} icon={project.icon} />
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#1A1A1A" }}>
                {project.name}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#aaa" }}>
                {project.team_ids.length} équipes
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: "30px", height: "30px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.08)", background: "#F5F2ED", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 24px 22px" }}>
          {[
            { label: "Description", value: project.description },
            { label: "Équipes", value: project.team_ids.join(", ") || "Aucune" },
            { label: "Icône", value: project.icon || "—" },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", gap: "16px" }}>
              <span style={{ fontSize: "0.72rem", color: "#999" }}>{label}</span>
              <span style={{ fontSize: "0.83rem", color: "#1A1A1A", fontWeight: 500 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Modal Edit / Create ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: "10px",
  border: "1.5px solid rgba(0,0,0,0.08)",
  background: "#F5F2ED",
  fontSize: "0.82rem",
  fontFamily: "'DM Sans', sans-serif",
  color: "#1A1A1A",
  outline: "none",
};

function EditModal({ mode, project, onClose, onSaved }: {
  mode: EditMode;
  project: Project | null;
  onClose: () => void;
  onSaved: (updated: Project, created: boolean) => void;
}) {
  const [values, setValues] = useState(() => ({
    name: project?.name ?? "",
    description: project?.description ?? "",
    icon: project?.icon ?? "",
    team_ids: (project?.team_ids ?? []).join(","),
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  function setField(key: string, value: string) {
    setValues(v => ({ ...v, [key]: value }));
    setErrors(e => ({ ...e, [key]: "" }));
    setServerError("");
  }

  async function handleSubmit() {
    setSaving(true);
    setServerError("");

    const team_ids = values.team_ids
      .split(",")
      .map(id => parseInt(id.trim()))
      .filter(id => !isNaN(id));

    const data = {
      name: values.name,
      description: values.description,
      icon: values.icon || null,
      team_ids,
    };

    const result = mode === "create"
      ? await createProject(data)
      : await updateProject(project!.id, data);

    setSaving(false);

    if (result.success) {
      onSaved(result.project, mode === "create");
      onClose();
    } else {
      setServerError(result.error);
    }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.15)", animation: "popIn 0.2s ease" }}>

        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#aaa", marginBottom: "2px" }}>
              {mode === "create" ? "Nouveau projet" : "Édition"}
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1A1A1A" }}>
              {mode === "create" ? "Ajouter un projet" : "Modifier le projet"}
            </div>
          </div>
          <button onClick={onClose} style={{ width: "30px", height: "30px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.08)", background: "#F5F2ED", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 22px 22px" }}>
          {serverError && (
            <div style={{ marginBottom: "12px", padding: "8px 12px", borderRadius: "10px", background: "rgba(229,62,62,0.07)", border: "1px solid rgba(229,62,62,0.2)", fontSize: "0.8rem", color: "#e53e3e" }}>
              {serverError}
            </div>
          )}

          {/* Nom */}
          <div style={{ marginBottom: "10px" }}>
            <small style={{ display: "block", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#999", marginBottom: "4px" }}>
              Nom
            </small>
            <input
              type="text"
              value={values.name}
              placeholder="Ex: Kazier"
              onChange={e => setField("name", e.target.value)}
              style={inputStyle}
            />
            {errors.name && <p style={{ marginTop: "4px", fontSize: "0.7rem", color: "#e53e3e" }}>{errors.name}</p>}
          </div>

          {/* Description */}
          <div style={{ marginBottom: "10px" }}>
            <small style={{ display: "block", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#999", marginBottom: "4px" }}>
              Description
            </small>
            <textarea
              value={values.description}
              placeholder="Décrivez le projet..."
              onChange={e => setField("description", e.target.value)}
              style={{
                ...inputStyle,
                minHeight: "80px",
                resize: "vertical",
              }}
            />
            {errors.description && <p style={{ marginTop: "4px", fontSize: "0.7rem", color: "#e53e3e" }}>{errors.description}</p>}
          </div>

          {/* Icône */}
          <div style={{ marginBottom: "10px" }}>
            <small style={{ display: "block", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#999", marginBottom: "4px" }}>
              Icône (optionnel)
            </small>
            <input
              type="text"
              value={values.icon}
              placeholder="Ex: 📊"
              onChange={e => setField("icon", e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Team IDs */}
          <div style={{ marginBottom: "10px" }}>
            <small style={{ display: "block", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#999", marginBottom: "4px" }}>
              IDs des équipes (séparés par des virgules)
            </small>
            <input
              type="text"
              value={values.team_ids}
              placeholder="Ex: 1, 2, 3"
              onChange={e => setField("team_ids", e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button type="button" onClick={onClose} disabled={saving} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1.5px solid rgba(0,0,0,0.08)", background: "#F5F2ED", color: "#666", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              Annuler
            </button>
            <button type="button" onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", background: "#6B1A2A", color: "white", fontSize: "0.85rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Enregistrement..." : mode === "create" ? "Ajouter" : "Mettre à jour"}
            </button>
          </div>
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

// ── Modal Delete ──────────────────────────────────────────────────────────────

function DeleteModal({ project, onConfirm, onCancel, loading }: {
  project: Project;
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
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1A1A1A", marginBottom: "6px" }}>Supprimer ce projet ?</h3>
          <p style={{ fontSize: "0.82rem", color: "#888", marginBottom: "8px" }}>
            Vous êtes sur le point de supprimer <strong>{project.name}</strong>.
          </p>
          <p style={{ fontSize: "0.78rem", color: "#e53e3e", fontWeight: 500, marginBottom: "4px" }}>
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
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function ProjectsTable({ projects: initialProjects }: Props) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selected, setSelected] = useState<Project | null>(null);
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [editMode, setEditMode] = useState<EditMode>("update");
  const [toDelete, setToDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const { canManageTeam } = usePermissions();

  function addToast(type: Toast["type"], message: string) {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    const res = await deleteProject(toDelete.id);
    setDeleting(false);
    if (res.success) {
      setProjects(prev => prev.filter(p => p.id !== toDelete.id));
      addToast("success", `Projet "${toDelete.name}" supprimé.`);
      setToDelete(null);
    } else {
      addToast("error", res.error ?? "Erreur lors de la suppression.");
    }
  }

  const actions: Action[] = [
    { icon: "view", label: "Voir", onClick: (p) => setSelected(p) },
    ...(canManageTeam ? [{ icon: "edit" as const, label: "Modifier", onClick: (p: Project) => { setEditMode("update"); setEditTarget(p); } }] : []),
    ...(canManageTeam ? [{ icon: "delete" as const, label: "Supprimer", onClick: (p: Project) => setToDelete(p) }] : []),
  ];

  return (
    <>
      <DataTable
        columns={[
          {
            key: "name",
            label: "Projet",
            sortable: true,
            render: (p) => (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <ProjectAvatar name={p.name ?? ""} icon={p.icon} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: "0.83rem" }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#aaa" }}>
                    {p.team_ids.length} équipes
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "description",
            label: "Description",
            render: (p) => <span style={{ fontSize: "0.8rem", color: "#666" }}>{p.description}</span>,
          },
        ]}
        data={projects}
        actions={actions}
        pageSize={10}
        searchPlaceholder="Rechercher un projet..."
        emptyMessage="Aucun projet trouvé."
        filters={
          canManageTeam && (
            <button
              onClick={() => { setEditMode("create"); setEditTarget(null); }}
              style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "10px", border: "none", background: "#6B1A2A", color: "white", fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
            >
              <Plus size={14} /> Ajouter projet
            </button>
          )
        }
      />

      {selected && <ViewModal project={selected} onClose={() => setSelected(null)} />}

      {(editMode === "create" || editTarget) && (
        <EditModal
          mode={editMode}
          project={editTarget}
          onClose={() => { setEditTarget(null); setEditMode("update"); }}
          onSaved={(updated, created) => {
            if (created) {
              setProjects(prev => [updated, ...prev]);
              addToast("success", `"${updated.name}" ajouté.`);
            } else {
              setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
              addToast("success", `"${updated.name}" mis à jour.`);
            }
          }}
        />
      )}

      {toDelete && (
        <DeleteModal
          project={toDelete}
          loading={deleting}
          onCancel={() => setToDelete(null)}
          onConfirm={handleDelete}
        />
      )}

      {toasts.map(t => (
        <ToastNotification key={t.id} toast={t} onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
      ))}
    </>
  );
}
