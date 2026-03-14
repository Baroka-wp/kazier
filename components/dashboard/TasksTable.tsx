"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  AlertTriangle,
  Plus,
  CheckCircle2,
  XCircle,
  ChevronDown,
} from "lucide-react";
import DataTable from "@/components/dashboard/DataTable";
import { deleteTask, getProjectsForTasks, type Task } from "@/lib/task-actions";
import { usePermissions } from "@/hooks/usePermissions";
import { CreateTaskForm } from "./TasksTable/EditModal-CREATE";
import { UpdateTaskForm } from "./TasksTable/EditModal-UPDATE";

type Props = { tasks: Task[] };
type Toast = { id: number; type: "success" | "error"; message: string };
type EditMode = "create" | "update";
type Action = {
  icon: "view" | "edit" | "delete";
  label: string;
  onClick: (t: Task) => void;
};
type Project = { id: number; name: string };

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    const [datePart, timePart] = dateStr.split(" ");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour = 0, minute = 0] = (timePart || "").split(":").map(Number);
    const d = new Date(year, month - 1, day, hour, minute);
    if (isNaN(d.getTime())) return "—";
    const dateLabel = d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const timeLabel = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    return `${dateLabel} ${timeLabel}`;
  } catch {
    return "—";
  }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    "à faire": {
      bg: "rgba(209,213,219,0.3)",
      color: "#6B7280",
      label: "À faire",
    },
    "en cours": {
      bg: "rgba(59,130,246,0.1)",
      color: "#3b82f6",
      label: "En cours",
    },
    terminée: {
      bg: "rgba(16,185,129,0.1)",
      color: "#10b981",
      label: "Terminée",
    },
  };
  const s = map[status] ?? map["à faire"];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: "20px",
        fontSize: "0.67rem",
        fontWeight: 600,
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    low: { bg: "rgba(34,197,94,0.1)", color: "#22c55e", label: "Faible" },
    medium: { bg: "rgba(251,191,36,0.1)", color: "#fbbf24", label: "Moyen" },
    high: { bg: "rgba(239,68,68,0.1)", color: "#ef4444", label: "Élevée" },
  };
  const s = map[priority] ?? map["medium"];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: "20px",
        fontSize: "0.67rem",
        fontWeight: 600,
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}

// ── Avatars empilés + tooltip ─────────────────────────────────────────────────
const AVATAR_COLORS = [
  "#6B1A2A",
  "#2563EB",
  "#059669",
  "#D97706",
  "#7C3AED",
  "#DC2626",
];

// ✅ Colle ce composant dans TasksTable.tsx en remplacement de NamePills
function NamePills({ names }: { names?: string[] }) {
  if (!names?.length)
    return <span style={{ fontSize: "0.8rem", color: "#ccc" }}>—</span>;

  const visible = names.slice(0, 2);
  const extra = names.length - 2;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
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

// ── Toast ─────────────────────────────────────────────────────────────────────

function ToastNotification({
  toast,
  onClose,
}: {
  toast: Toast;
  onClose: () => void;
}) {
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
      {ok ? (
        <CheckCircle2 size={18} color="#2D7A4F" />
      ) : (
        <XCircle size={18} color="#e53e3e" />
      )}
      <span
        style={{
          fontSize: "0.83rem",
          fontWeight: 500,
          color: "#1A1A1A",
          flex: 1,
        }}
      >
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
      <style>{`@keyframes slideIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  );
}

// ── Modal Delete ──────────────────────────────────────────────────────────────

function DeleteModal({
  task,
  onConfirm,
  onCancel,
  loading,
}: {
  task: Task;
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
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              color: "#1A1A1A",
              marginBottom: "6px",
            }}
          >
            Supprimer cette tâche ?
          </h3>
          <p
            style={{ fontSize: "0.82rem", color: "#888", marginBottom: "8px" }}
          >
            Vous êtes sur le point de supprimer <strong>{task.title}</strong>.
          </p>
          <p style={{ fontSize: "0.78rem", color: "#e53e3e", fontWeight: 500 }}>
            Cette action est irréversible.
          </p>
        </div>
        <div
          style={{ display: "flex", gap: "10px", padding: "20px 24px 24px" }}
        >
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
      <style>{`@keyframes popIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }`}</style>
    </div>
  );
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────

function EditModalWrapper({
  mode,
  task,
  projects,
  onClose,
  onSaved,
}: {
  mode: EditMode;
  task: Task | null;
  projects: Project[];
  onClose: () => void;
  onSaved: (t: Task, created: boolean) => void;
}) {
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
              {mode === "create" ? "Nouvelle tâche" : "Édition"}
            </div>
            <div
              style={{ fontSize: "1rem", fontWeight: 700, color: "#1A1A1A" }}
            >
              {mode === "create" ? "Ajouter une tâche" : "Modifier la tâche"}
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
      <style>{`@keyframes popIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }`}</style>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function TasksTable({ tasks: initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [projects, setProjects] = useState<Project[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [editTarget, setEditTarget] = useState<Task | null>(null);
  const [editMode, setEditMode] = useState<EditMode>("update");
  const [toDelete, setToDelete] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const { canViewTeam } = usePermissions();

  React.useEffect(() => {
    getProjectsForTasks().then((res) => {
      if (res.success && res.projects) setProjects(res.projects);
    });
  }, []);

  const filtered = useMemo(() => {
    let data = tasks;
    if (statusFilter) data = data.filter((t) => t.status === statusFilter);
    if (priorityFilter)
      data = data.filter((t) => t.priority === priorityFilter);
    return data;
  }, [tasks, statusFilter, priorityFilter]);

  function addToast(type: Toast["type"], message: string) {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4000,
    );
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    const res = await deleteTask(toDelete.id);
    setDeleting(false);
    if (res.success) {
      setTasks((prev) => prev.filter((t) => t.id !== toDelete.id));
      addToast("success", `Tâche "${toDelete.title}" supprimée.`);
      setToDelete(null);
    } else {
      addToast("error", res.error ?? "Erreur lors de la suppression.");
    }
  }

  const filterSlot = (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
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
            background: "#F5F2ED",
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
            background: "#F5F2ED",
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
{/*       {canViewTeam && (
        <button onClick={() => { setEditMode("create"); setEditTarget(null); }} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "10px", border: "none", background: "#6B1A2A", color: "white", fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
          <Plus size={14} /> Ajouter tâche
        </button>
      )} */}
    </div>
  );

  const actions: Action[] = [
    ...(canViewTeam
      ? [
          {
            icon: "edit" as const,
            label: "Modifier",
            onClick: (t: Task) => {
              setEditMode("update");
              setEditTarget(t);
            },
          },
        ]
      : []),
    ...(canViewTeam
      ? [
          {
            icon: "delete" as const,
            label: "Supprimer",
            onClick: (t: Task) => setToDelete(t),
          },
        ]
      : []),
  ];

  return (
    <>
      <DataTable
        columns={[
          {
            key: "title",
            label: "Tâche",
            sortable: true,
            render: (t) => (
              <span style={{ fontWeight: 500, fontSize: "0.83rem" }}>
                {t.title}
              </span>
            ),
          },
          {
            key: "status",
            label: "Statut",
            sortable: true,
            render: (t) => <StatusBadge status={t.status} />,
          },
          {
            key: "priority",
            label: "Priorité",
            sortable: true,
            render: (t) => <PriorityBadge priority={t.priority} />,
          },
          {
            key: "assigned_to_names",
            label: "Assigné à",
            width: "180px",
            render: (t) => <NamePills names={t.assigned_to_names} />,
          },
          {
            key: "project_name",
            label: "Projet",
            render: (t) => (
              <span style={{ fontSize: "0.8rem", color: "#666" }}>
                {t.project_name || "—"}
              </span>
            ),
          },
          {
            key: "due_date",
            label: "Deadline",
            sortable: true,
            render: (t) => (
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "#aaa",
                  whiteSpace: "nowrap",
                }}
              >
                {formatDateTime(t.due_date)}
              </span>
            ),
          },
        ]}
        data={filtered}
        actions={actions}
        pageSize={10}
        searchPlaceholder="Rechercher une tâche..."
        emptyMessage="Aucune tâche trouvée."
        filters={filterSlot}
      />

      {(editMode === "create" || editTarget) && (
        <EditModalWrapper
          mode={editMode}
          task={editTarget}
          projects={projects}
          onClose={() => {
            setEditTarget(null);
            setEditMode("update");
          }}
          onSaved={(updated, created) => {
            if (created) {
              setTasks((prev) => [updated, ...prev]);
              addToast("success", `"${updated.title}" ajoutée.`);
            } else {
              setTasks((prev) =>
                prev.map((t) => (t.id === updated.id ? updated : t)),
              );
              addToast("success", `"${updated.title}" mise à jour.`);
            }
            setEditTarget(null);
            setEditMode("update");
          }}
        />
      )}

      {toDelete && (
        <DeleteModal
          task={toDelete}
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
