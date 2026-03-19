"use client";

import { useState, useEffect } from "react";
import DataTable from "@/components/dashboard/DataTable";
import { deleteTask, getTeamsForAssignment, getProjectsForTasks } from "@/lib/task-actions";
import { usePermissions } from "@/hooks/usePermissions";

import {
  Task,
  Toast,
  EditMode,
  Action,
  StatusBadge,
  PriorityBadge,
  TeamMember,
  Project,
} from "./types";
import { ToastNotification } from "./ToastNotification";
import { DeleteModal } from "./DeleteModal";
import { EditModal } from "./EditModal-Wrapper";
import { FilterSlot } from "./Filters";

type Props = {
  tasks: Task[];
  loading?: boolean;
  isEmpty?: boolean;
  onRefresh?: () => void;
  defaultProjectId?: number;
  // Pagination serveur
  onPageChange?: (page: number) => void;
  onSearch?: (search: string) => void;
  totalItems?: number;
  totalPages?: number;
  currentPage?: number;
  // Filtres
  statusFilter?: string;
  onStatusFilter?: (status: string) => void;
  priorityFilter?: string;
  onPriorityFilter?: (priority: string) => void;
};

// ✅ Pills — max 2 affichés + compteur "+N"
function NamePills({ names }: { names?: string[] }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  if (!names?.length) return <span style={{ fontSize: "0.8rem", color: "#ccc" }}>—</span>;

  const visible = names.slice(0, 2);
  const extra = names.slice(2);

  function handleClose() {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 200);
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        flexWrap: "nowrap",
      }}
    >
      {visible.map((name, i) => {
        const parts = name.trim().split(" ").filter(Boolean);
        const initials = parts
          .slice(0, 2)
          .map((w) => w[0].toUpperCase())
          .join("");
        const firstName = parts[0] ?? name;
        return (
          <div
            key={i}
            title={name}
            className="name-pill"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "3px 8px 3px 3px",
              borderRadius: "20px",
              background: "rgba(107,26,42,0.07)",
              border: "1px solid rgba(107,26,42,0.12)",
              flexShrink: 0,
              animation: `pillFadeIn 0.25s ease both`,
              animationDelay: `${i * 0.06}s`,
              transition: "transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.06)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(107,26,42,0.15)";
              e.currentTarget.style.background = "rgba(107,26,42,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.background = "rgba(107,26,42,0.07)";
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
              {firstName}
            </span>
          </div>
        );
      })}

      {extra.length > 0 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
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
              cursor: "pointer",
              flexShrink: 0,
              transition:
                "transform 0.15s ease, background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
              animation: "pillFadeIn 0.25s ease both",
              animationDelay: `${visible.length * 0.06}s`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.1)";
              e.currentTarget.style.background = "#6B1A2A";
              e.currentTarget.style.color = "white";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(107,26,42,0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.background = "rgba(107,26,42,0.12)";
              e.currentTarget.style.color = "#6B1A2A";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            +{extra.length}
          </button>

          {open && (
            <div
              onClick={handleClose}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 200,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
                background: closing ? "rgba(0,0,0,0)" : "rgba(0,0,0,0.35)",
                transition: "background 0.2s ease",
                animation: "backdropIn 0.2s ease both",
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  padding: "24px",
                  width: "100%",
                  maxWidth: "320px",
                  boxShadow: "0 24px 60px rgba(0,0,0,0.15)",
                  animation: closing ? "slideDown 0.2s ease both" : "slideUp 0.25s ease both",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "16px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "#1A1A1A",
                    }}
                  >
                    Tous les membres ({names.length})
                  </span>
                  <button
                    onClick={handleClose}
                    style={{
                      width: "28px",
                      height: "28px",
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
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(107,26,42,0.07)";
                      e.currentTarget.style.color = "#6B1A2A";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#F5F2ED";
                      e.currentTarget.style.color = "#888";
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {names.map((name, i) => {
                    const parts = name.trim().split(" ").filter(Boolean);
                    const initials = parts
                      .slice(0, 2)
                      .map((w) => w[0].toUpperCase())
                      .join("");
                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "8px 10px",
                          borderRadius: "10px",
                          background: "#F5F2ED",
                          animation: `itemFadeIn 0.2s ease both`,
                          animationDelay: `${0.05 + i * 0.04}s`,
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "rgba(107,26,42,0.07)")
                        }
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#F5F2ED")}
                      >
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            background: "#6B1A2A",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.55rem",
                            fontWeight: 700,
                            color: "white",
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <span
                          style={{
                            fontSize: "0.82rem",
                            color: "#1A1A1A",
                            fontWeight: 500,
                          }}
                        >
                          {name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes pillFadeIn {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes slideDown {
          from { opacity: 1; transform: translateY(0)   scale(1); }
          to   { opacity: 0; transform: translateY(20px) scale(0.97); }
        }
        @keyframes backdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes itemFadeIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

function formatDeadline(raw: string | null): string {
  if (!raw) return "—";
  try {
    const [datePart, timePart] = raw.split(" ");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour = 0, minute = 0] = (timePart || "").split(":").map(Number);
    const d = new Date(year, month - 1, day, hour, minute);
    if (isNaN(d.getTime())) return "—";
    const dateStr = d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    return `${dateStr} ${timeStr}`;
  } catch {
    return "—";
  }
}

export default function TasksTable({
  tasks: initialTasks,
  loading: loadingProp,
  isEmpty,
  onRefresh,
  onPageChange,
  onSearch,
  totalItems,
  totalPages,
  currentPage,
  statusFilter: statusFilterProp,
  onStatusFilter,
  priorityFilter: priorityFilterProp,
  onPriorityFilter,
  defaultProjectId,
}: Props) {
  const [teams, setTeams] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [editTarget, setEditTarget] = useState<Task | null>(null);
  const [editMode, setEditMode] = useState<EditMode>("update");
  const [toDelete, setToDelete] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const { canManageTasks } = usePermissions();

  // Utiliser les filtres externes (serveur) ou locaux
  const statusFilter = statusFilterProp ?? "";
  const priorityFilter = priorityFilterProp ?? "";

  useEffect(() => {
    (async () => {
      const [teamsRes, projectsRes] = await Promise.all([
        getTeamsForAssignment(),
        getProjectsForTasks(),
      ]);
      if (teamsRes.success && teamsRes.teams) setTeams(teamsRes.teams);
      if (projectsRes.success && projectsRes.projects) setProjects(projectsRes.projects);
    })();
  }, []);

  // Pour pagination serveur, on utilise directement les tâches passées en props
  // Le filtrage est géré côté serveur via les params API

  function addToast(type: Toast["type"], message: string) {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    const res = await deleteTask(toDelete.id);
    setDeleting(false);
    if (res.success) {
      addToast("success", `Tâche "${toDelete.title}" supprimée.`);
      setToDelete(null);
      // ✅ Refresh via onRefresh
      await onRefresh?.();
    } else {
      addToast("error", res.error ?? "Erreur lors de la suppression.");
    }
  }

  const filterSlot = (
    <FilterSlot
      statusFilter={statusFilter}
      setStatusFilter={(v) => onStatusFilter?.(v)}
      priorityFilter={priorityFilter}
      setPriorityFilter={(v) => onPriorityFilter?.(v)}
      onAddTask={() => {
        setEditMode("create");
        setEditTarget(null);
      }}
      canViewTeam={canManageTasks}
    />
  );

  const actions: Action[] = [
    ...(canManageTasks
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
    ...(canManageTasks
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
            render: (t) => <span style={{ fontWeight: 500, fontSize: "0.83rem" }}>{t.title}</span>,
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
            render: (t) => <NamePills names={t.assigned_to_names} />,
          },
          {
            key: "project_name",
            label: "Projet",
            render: (t) => (
              <span style={{ fontSize: "0.8rem", color: "#666" }}>{t.project_name || "—"}</span>
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
                {formatDeadline(t.due_date)}
              </span>
            ),
          },
        ]}
        data={initialTasks}
        actions={actions}
        pageSize={10}
        searchPlaceholder="Rechercher une tâche..."
        emptyMessage={
          isEmpty
            ? "Aucune tâche pour le moment. Commencez par en créer une !"
            : "Aucune tâche trouvée."
        }
        filters={filterSlot}
        loading={loadingProp}
        // Pagination serveur
        onPageChange={onPageChange}
        onSearch={onSearch}
        totalItems={totalItems}
        totalPages={totalPages}
        currentPage={currentPage}
      />

      {(editMode === "create" || editTarget) && (
        <EditModal
          mode={editMode}
          task={editTarget}
          projects={projects}
          teams={teams}
          defaultProjectId={defaultProjectId}
          onClose={() => {
            setEditTarget(null);
            setEditMode("update");
          }}
          onSaved={async (updated, created) => {
            if (created) {
              addToast("success", `"${updated.title}" ajoutée.`);
            } else {
              addToast("success", `"${updated.title}" mise à jour.`);
            }
            // ✅ Refresh via onRefresh
            await onRefresh?.();
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
