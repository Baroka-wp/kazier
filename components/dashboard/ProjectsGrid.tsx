"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import {
  X,
  AlertTriangle,
  Plus,
  CheckCircle2,
  XCircle,
  MoreVertical,
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
  LayoutGrid,
  List,
} from "lucide-react";
import {
  createProject,
  updateProject,
  deleteProject,
  getTeams,
  type Project,
  type TeamMember,
} from "@/lib/project-actions";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";
import DataTable from "@/components/dashboard/DataTable";

const AVAILABLE_ICONS = [
  { id: "database", label: "Database", component: Database },
  { id: "settings", label: "Settings", component: Settings },
  { id: "users", label: "Users", component: Users },
  { id: "zap", label: "Zap", component: Zap },
  { id: "briefcase", label: "Briefcase", component: Briefcase },
  { id: "chart", label: "Chart", component: BarChart3 },
  { id: "target", label: "Target", component: Target },
  { id: "lock", label: "Lock", component: Lock },
  { id: "layers", label: "Layers", component: Layers },
  { id: "cpu", label: "CPU", component: Cpu },
  { id: "workflow", label: "Workflow", component: Workflow },
  { id: "boxes", label: "Boxes", component: Boxes },
];

type Props = { projects?: Project[] };
type Toast = { id: number; type: "success" | "error"; message: string };
type EditMode = "create" | "update";
const fetcher = (url: string) => fetch(url).then((res) => res.json());

function ToastNotification({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const ok = toast.type === "success";
  return (
    <div
      style={{
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
      }}
    >
      {ok ? <CheckCircle2 size={18} color="#2D7A4F" /> : <XCircle size={18} color="#e53e3e" />}
      <span style={{ fontSize: "0.83rem", fontWeight: 500, color: "#1A1A1A", flex: 1 }}>
        {toast.message}
      </span>
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#aaa",
          display: "flex",
          padding: "2px",
        }}
      >
        <X size={14} />
      </button>
      <style>{`@keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

function MemberAvatar({ name }: { name: string }) {
  const initials = name
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return (
    <div
      style={{
        width: "28px",
        height: "28px",
        borderRadius: "50%",
        background: "rgba(107,26,42,0.1)",
        border: "1.5px solid rgba(107,26,42,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.6rem",
        fontWeight: 700,
        color: "#6B1A2A",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function NamePills({ names }: { names?: string[] }) {
  if (!names?.length) return <span style={{ fontSize: "0.8rem", color: "#ccc" }}>—</span>;
  const visible = names.slice(0, 2);
  const extra = names.length - 2;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
      {visible.map((name, i) => {
        const parts = name.trim().split(" ").filter(Boolean);
        const initials = parts
          .slice(0, 2)
          .map((w) => w[0].toUpperCase())
          .join("");
        const first = parts[0] ?? name;
        return (
          <div
            key={i}
            title={name}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "3px 8px 3px 3px",
              borderRadius: "20px",
              background: "rgba(107,26,42,0.07)",
              border: "1px solid rgba(107,26,42,0.12)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: "#6B1A2A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.48rem",
                fontWeight: 700,
                color: "white",
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 500,
                color: "#6B1A2A",
                whiteSpace: "nowrap",
              }}
            >
              {first}
            </span>
          </div>
        );
      })}
      {extra > 0 && (
        <div
          title={names.slice(2).join(", ")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "26px",
            height: "24px",
            padding: "0 7px",
            borderRadius: "20px",
            fontSize: "0.68rem",
            fontWeight: 700,
            background: "rgba(107,26,42,0.12)",
            color: "#6B1A2A",
            border: "1px solid rgba(107,26,42,0.2)",
            flexShrink: 0,
          }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}

function EditModal({
  mode,
  project,
  teams,
  onClose,
  onSaved,
}: {
  mode: EditMode;
  project: Project | null;
  teams: TeamMember[];
  onClose: () => void;
  onSaved: (updated: Project, created: boolean) => void;
}) {
  const [values, setValues] = useState(() => ({
    name: project?.name ?? "",
    description: project?.description ?? "",
    icon: project?.icon ?? "",
    team_ids: project?.team_ids ?? [],
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  function setField(key: string, value: string | number[] | null) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
    setServerError("");
  }

  function toggleTeam(teamId: number) {
    setValues((v) => ({
      ...v,
      team_ids: v.team_ids.includes(teamId)
        ? v.team_ids.filter((id) => id !== teamId)
        : [...v.team_ids, teamId],
    }));
  }

  async function handleSubmit() {
    setSaving(true);
    setServerError("");
    const data = {
      name: values.name,
      description: values.description,
      icon: values.icon || null,
      team_ids: values.team_ids,
    };
    const result =
      mode === "create" ? await createProject(data) : await updateProject(project!.id, data);
    setSaving(false);
    if (result.success) {
      onSaved(result.project, mode === "create");
      onClose();
    } else {
      setServerError(result.error);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "520px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 60px rgba(0,0,0,0.15)",
          animation: "popIn 0.2s ease",
        }}
      >
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            position: "sticky",
            top: 0,
            background: "#fff",
            zIndex: 1,
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.7rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#aaa",
                marginBottom: "2px",
              }}
            >
              {mode === "create" ? "Nouveau projet" : "Édition"}
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1A1A1A" }}>
              {mode === "create" ? "Ajouter un projet" : "Modifier le projet"}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              border: "1px solid rgba(0,0,0,0.08)",
              background: "#F5F2ED",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#888",
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: "18px 22px 22px" }}>
          {serverError && (
            <div
              style={{
                marginBottom: "12px",
                padding: "8px 12px",
                borderRadius: "10px",
                background: "rgba(229,62,62,0.07)",
                border: "1px solid rgba(229,62,62,0.2)",
                fontSize: "0.8rem",
                color: "#e53e3e",
              }}
            >
              {serverError}
            </div>
          )}

          {/* Icônes */}
          <div style={{ marginBottom: "16px" }}>
            <small
              style={{
                display: "block",
                fontSize: "0.7rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#999",
                marginBottom: "8px",
              }}
            >
              Icône du projet
            </small>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "8px",
                padding: "10px",
                background: "#F5F2ED",
                borderRadius: "10px",
                border: "1.5px solid rgba(0,0,0,0.08)",
              }}
            >
              {AVAILABLE_ICONS.map(({ id, label, component: IconComponent }) => (
                <button
                  key={id}
                  onClick={() => setField("icon", id)}
                  title={label}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
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
                  onMouseEnter={(e) => {
                    if (values.icon !== id)
                      e.currentTarget.style.background = "rgba(107,26,42,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    if (values.icon !== id) e.currentTarget.style.background = "#fff";
                  }}
                >
                  <IconComponent size={20} />
                </button>
              ))}
            </div>
          </div>

          {/* Nom */}
          <div style={{ marginBottom: "10px" }}>
            <small
              style={{
                display: "block",
                fontSize: "0.7rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#999",
                marginBottom: "4px",
              }}
            >
              Nom
            </small>
            <input
              type="text"
              value={values.name}
              placeholder="Ex: Kazier"
              onChange={(e) => setField("name", e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "10px",
                border: "1.5px solid rgba(0,0,0,0.08)",
                background: "#F5F2ED",
                fontSize: "0.82rem",
                fontFamily: "'DM Sans', sans-serif",
                color: "#1A1A1A",
                outline: "none",
              }}
            />
            {errors.name && (
              <p style={{ marginTop: "4px", fontSize: "0.7rem", color: "#e53e3e" }}>
                {errors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div style={{ marginBottom: "10px" }}>
            <small
              style={{
                display: "block",
                fontSize: "0.7rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#999",
                marginBottom: "4px",
              }}
            >
              Description
            </small>
            <textarea
              value={values.description}
              placeholder="Décrivez le projet..."
              onChange={(e) => setField("description", e.target.value)}
              style={{
                width: "100%",
                minHeight: "80px",
                padding: "8px 10px",
                borderRadius: "10px",
                border: "1.5px solid rgba(0,0,0,0.08)",
                background: "#F5F2ED",
                fontSize: "0.82rem",
                fontFamily: "'DM Sans', sans-serif",
                color: "#1A1A1A",
                outline: "none",
                resize: "vertical",
              }}
            />
            {errors.description && (
              <p style={{ marginTop: "4px", fontSize: "0.7rem", color: "#e53e3e" }}>
                {errors.description}
              </p>
            )}
          </div>

          {/* Équipes */}
          <div style={{ marginBottom: "10px" }}>
            <small
              style={{
                display: "block",
                fontSize: "0.7rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#999",
                marginBottom: "8px",
              }}
            >
              Équipes ({values.team_ids.length})
            </small>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                padding: "10px",
                background: "#F5F2ED",
                borderRadius: "10px",
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
                      gap: "6px",
                      padding: "6px 8px",
                      cursor: "pointer",
                      borderRadius: "8px",
                      transition: "background 0.15s",
                      background: values.team_ids.includes(team.id)
                        ? "rgba(107,26,42,0.1)"
                        : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={values.team_ids.includes(team.id)}
                      onChange={() => toggleTeam(team.id)}
                      style={{ cursor: "pointer" }}
                    />
                    <span style={{ fontSize: "0.75rem", color: "#666", whiteSpace: "nowrap" }}>
                      {team.full_name}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "10px",
                border: "1.5px solid rgba(0,0,0,0.08)",
                background: "#F5F2ED",
                color: "#666",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "10px",
                border: "none",
                background: "#6B1A2A",
                color: "white",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Enregistrement..." : mode === "create" ? "Ajouter" : "Mettre à jour"}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes popIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}

function DeleteModal({
  project,
  onConfirm,
  onCancel,
  loading,
}: {
  project: Project;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "420px",
          overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,0.15)",
          animation: "popIn 0.2s ease",
        }}
      >
        <div
          style={{
            padding: "28px 24px 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              background: "rgba(229,62,62,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
            }}
          >
            <AlertTriangle size={24} color="#e53e3e" />
          </div>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1A1A1A", marginBottom: "6px" }}>
            Supprimer ce projet ?
          </h3>
          <p style={{ fontSize: "0.82rem", color: "#888", marginBottom: "8px" }}>
            Vous êtes sur le point de supprimer <strong>{project.name}</strong>.
          </p>
          <p
            style={{ fontSize: "0.78rem", color: "#e53e3e", fontWeight: 500, marginBottom: "4px" }}
          >
            Cette action est irréversible.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", padding: "20px 24px 24px" }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "10px",
              border: "1.5px solid rgba(0,0,0,0.08)",
              background: "#F5F2ED",
              color: "#666",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "10px",
              border: "none",
              background: loading ? "rgba(229,62,62,0.5)" : "#e53e3e",
              color: "white",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {loading ? "Suppression..." : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionMenu({
  project,
  onEdit,
  onDelete,
  canDelete,
}: {
  project: Project;
  onEdit: (p: Project) => void;
  onDelete: (p: Project) => void;
  canDelete: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "8px",
          border: "1px solid rgba(0,0,0,0.08)",
          background: "#F5F2ED",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#888",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(107,26,42,0.07)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#F5F2ED")}
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
          <div
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: "4px",
              background: "#fff",
              borderRadius: "10px",
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              zIndex: 100,
              overflow: "hidden",
              minWidth: "120px",
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(project);
                setOpen(false);
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "none",
                background: "transparent",
                color: "#666",
                fontSize: "0.8rem",
                fontWeight: 500,
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#F5F2ED")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              Modifier
            </button>
            {canDelete && (
              <>
                <div style={{ height: "1px", background: "rgba(0,0,0,0.06)" }} />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(project);
                    setOpen(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "none",
                    background: "transparent",
                    color: "#e53e3e",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(229,62,62,0.07)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  Supprimer
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  onEdit,
  onDelete,
  canManage,
  canDelete,
  onClick,
}: {
  project: Project;
  onEdit: (p: Project) => void;
  onDelete: (p: Project) => void;
  canManage: boolean;
  canDelete: boolean;
  onClick: () => void;
}) {
  const IconComp = AVAILABLE_ICONS.find((i) => i.id === project.icon)?.component;
  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        borderRadius: "16px",
        border: "1.5px solid rgba(0,0,0,0.08)",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(107,26,42,0.12)";
        e.currentTarget.style.borderColor = "rgba(107,26,42,0.15)";
        e.currentTarget.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
        e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
          {IconComp ? (
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "rgba(107,26,42,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6B1A2A",
                flexShrink: 0,
              }}
            >
              <IconComp size={24} />
            </div>
          ) : (
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "#F5F2ED",
                flexShrink: 0,
              }}
            />
          )}
          <div style={{ minWidth: 0 }}>
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: "#1A1A1A",
                marginBottom: "2px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {project.name}
            </h3>
            <p style={{ fontSize: "0.7rem", color: "#aaa" }}>
              {project.team_members?.length ?? 0} équipes
            </p>
          </div>
        </div>
        {canManage && (
          <ActionMenu project={project} onEdit={onEdit} onDelete={onDelete} canDelete={canDelete} />
        )}
      </div>
      <p
        style={{
          fontSize: "0.82rem",
          color: "#666",
          lineHeight: 1.5,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {project.description}
      </p>
      {project.team_members && project.team_members.length > 0 && (
        <div style={{ paddingTop: "8px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <p
            style={{
              fontSize: "0.65rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#999",
              marginBottom: "6px",
            }}
          >
            Équipes ({project.team_members.length})
          </p>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {project.team_members.map((member) => (
              <div
                key={member.id}
                style={{ display: "flex", alignItems: "center", gap: "4px" }}
                title={member.full_name}
              >
                <MemberAvatar name={member.full_name} />
                <span style={{ fontSize: "0.7rem", color: "#666", whiteSpace: "nowrap" }}>
                  {member.first_name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectsGrid({ projects: initialProjects }: Props) {
  const router = useRouter();
  const [teams, setTeams] = useState<TeamMember[]>([]);
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [editMode, setEditMode] = useState<EditMode>("update");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");

  const { isSuperAdmin } = usePermissions();

  const { data, error, mutate } = useSWR<{ data: Project[] }>("/api/projects", fetcher, {
    dedupingInterval: 500,
  });

  const projects = data?.data ?? initialProjects ?? [];
  const isLoading = !data && !error;
  const isEmpty = !isLoading && projects.length === 0;

  useEffect(() => {
    (async () => {
      const result = await getTeams();
      if (result.success && result.teams) setTeams(result.teams);
    })();
  }, []);

  function addToast(type: Toast["type"], message: string) {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    const res = await deleteProject(toDelete.id);
    setDeleting(false);
    if (res.success) {
      addToast("success", `Projet "${toDelete.name}" supprimé.`);
      setToDelete(null);
      await mutate();
    } else {
      addToast("error", res.error ?? "Erreur lors de la suppression.");
    }
  }

  return (
    <>
      <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "24px",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1A1A1A", margin: 0 }}>
            Projets
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px",
                borderRadius: "10px",
                background: "#F5F2ED",
                border: "1.5px solid rgba(0,0,0,0.08)",
              }}
            >
              <button
                onClick={() => setViewMode("grid")}
                title="Vue Grille"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: "none",
                  background: viewMode === "grid" ? "#6B1A2A" : "transparent",
                  color: viewMode === "grid" ? "white" : "#666",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (viewMode !== "grid") {
                    e.currentTarget.style.background = "rgba(107,26,42,0.07)";
                    e.currentTarget.style.color = "#6B1A2A";
                  }
                }}
                onMouseLeave={(e) => {
                  if (viewMode !== "grid") {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#666";
                  }
                }}
              >
                <LayoutGrid size={14} />
                <span style={{ fontSize: "0.75rem" }}>Grille</span>
              </button>
              <button
                onClick={() => setViewMode("table")}
                title="Vue Tableau"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: "none",
                  background: viewMode === "table" ? "#6B1A2A" : "transparent",
                  color: viewMode === "table" ? "white" : "#666",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (viewMode !== "table") {
                    e.currentTarget.style.background = "rgba(107,26,42,0.07)";
                    e.currentTarget.style.color = "#6B1A2A";
                  }
                }}
                onMouseLeave={(e) => {
                  if (viewMode !== "table") {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#666";
                  }
                }}
              >
                <List size={14} />
                <span style={{ fontSize: "0.75rem" }}>Tableau</span>
              </button>
            </div>
            {isSuperAdmin && (
              <button
                onClick={() => {
                  setEditMode("create");
                  setIsModalOpen(true);
                  setEditTarget(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  border: "none",
                  background: "#6B1A2A",
                  color: "white",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#8B2A3A";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(107,26,42,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#6B1A2A";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <Plus size={16} /> Ajouter projet
              </button>
            )}
          </div>
        </div>

        {viewMode === "table" ? (
          <DataTable
            columns={[
              {
                key: "name",
                label: "Projet",
                sortable: true,
                render: (p) => (
                  <div
                    onClick={() => router.push(`/dashboard/projects/${p.id}`)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: "rgba(107,26,42,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.2rem",
                        flexShrink: 0,
                      }}
                    >
                      {(() => {
                        const IconComp = AVAILABLE_ICONS.find((i) => i.id === p.icon)?.component;
                        return IconComp ? <IconComp size={20} color="#6B1A2A" /> : null;
                      })()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: "0.83rem" }}>{p.name}</div>
                      <div style={{ fontSize: "0.7rem", color: "#aaa" }}>
                        {p.team_members?.length ?? 0} équipes
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                key: "description",
                label: "Description",
                render: (p) => (
                  <span style={{ fontSize: "0.8rem", color: "#666" }}>{p.description}</span>
                ),
              },
              {
                key: "team_members",
                label: "Équipes",
                render: (p) => <NamePills names={p.team_members?.map((m) => m.full_name)} />,
              },
            ]}
            data={projects}
            actions={[
              {
                icon: "view",
                label: "Voir",
                onClick: (p: Project) => router.push(`/dashboard/projects/${p.id}`),
              },
              ...(isSuperAdmin
                ? [
                    {
                      icon: "edit" as const,
                      label: "Modifier",
                      onClick: (p: Project) => {
                        setEditMode("update");
                        setEditTarget(p);
                        setIsModalOpen(true);
                      },
                    },
                  ]
                : []),
              ...(isSuperAdmin
                ? [
                    {
                      icon: "delete" as const,
                      label: "Supprimer",
                      onClick: (p: Project) => setToDelete(p),
                    },
                  ]
                : []),
            ]}
            pageSize={10}
            searchPlaceholder="Rechercher un projet..."
            emptyMessage={
              isEmpty
                ? "Aucun projet pour le moment. Commencez par en ajouter un !"
                : "Aucun projet trouvé."
            }
            loading={isLoading}
            onPageChange={undefined}
            onSearch={undefined}
            totalItems={undefined}
            totalPages={undefined}
            currentPage={undefined}
          />
        ) : (
          <div>
            {projects.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "80px 20px",
                  background: "#F5F2ED",
                  borderRadius: "16px",
                  border: "1.5px dashed rgba(0,0,0,0.1)",
                }}
              >
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    margin: "0 auto 16px",
                    borderRadius: "50%",
                    background: "rgba(107,26,42,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Briefcase size={28} color="#6B1A2A" />
                </div>
                <p
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    color: "#1A1A1A",
                    marginBottom: "8px",
                  }}
                >
                  Aucun projet
                </p>
                <p style={{ fontSize: "0.85rem", color: "#888" }}>
                  Commencez par créer votre premier projet
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                  gap: "20px",
                }}
              >
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onEdit={(p) => {
                      setEditMode("update");
                      setEditTarget(p);
                      setIsModalOpen(true);
                    }}
                    onDelete={(p) => setToDelete(p)}
                    canManage={isSuperAdmin}
                    canDelete={isSuperAdmin}
                    onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <EditModal
          mode={editMode}
          project={editTarget}
          teams={teams}
          onClose={() => {
            setIsModalOpen(false);
            setEditTarget(null);
            setEditMode("update");
          }}
          onSaved={async (updated, created) => {
            addToast(
              "success",
              created ? `"${updated.name}" ajouté.` : `"${updated.name}" mis à jour.`
            );
            setIsModalOpen(false);
            await mutate();
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

      {toasts.map((t) => (
        <ToastNotification
          key={t.id}
          toast={t}
          onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
        />
      ))}
    </>
  );
}
