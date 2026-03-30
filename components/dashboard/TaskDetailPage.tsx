"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Settings2,
  Send,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  XCircle,
  Paperclip,
  Bold,
  Italic,
  List,
  Smile,
  Users,
  CalendarDays,
  Clock3,
} from "lucide-react";

import { type Task } from "@/lib/task-actions";
import {
  type TaskComment,
  getTaskComments,
  addTaskComment,
  deleteTaskComment,
  updateTaskComment,
} from "@/lib/task-comments-actions";
import { assignTaskToSelf } from "@/lib/team-actions";
import { deleteTask } from "@/lib/task-actions";
import { EditModal } from "./TasksTable/EditModal-Wrapper";
import { DeleteModal } from "./TasksTable/DeleteModal";
import { type Project, type TeamMember } from "./TasksTable/types";

const RichTextArea = dynamic(() => import("@/components/DailyForm/RichTextArea"), {
  ssr: false,
});

type Toast = {
  id: number;
  type: "success" | "error";
  message: string;
};

type Props = {
  task: Task;
  onBack: () => void;
  onUpdated?: (updated: Task) => void;
  teamMemberId?: number; // ✅ Ajouté
  isTM?: boolean;
  projects?: Project[];
  teams?: TeamMember[];
  canManageTasks?: boolean;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  );
}

function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        background: "rgba(107,26,42,0.1)",
        border: "1.5px solid rgba(107,26,42,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#6B1A2A",
        fontWeight: 700,
        fontSize: `${size * 0.32}px`,
        flexShrink: 0,
      }}
    >
      {initials || "?"}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    "à faire": { label: "À faire", color: "#b45309", bg: "rgba(180,83,9,0.09)" },
    "en cours": { label: "En cours", color: "#2563eb", bg: "rgba(37,99,235,0.09)" },
    review: { label: "Review", color: "#7c3aed", bg: "rgba(124,58,237,0.09)" },
    terminée: { label: "Terminée", color: "#16a34a", bg: "rgba(22,163,74,0.09)" },
  };
  const s = map[status] ?? { label: status, color: "#666", bg: "rgba(0,0,0,0.05)" };
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: "999px",
        fontSize: "0.72rem",
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
  const map: Record<string, { label: string; color: string; bg: string }> = {
    low: { label: "Basse priorité", color: "#16a34a", bg: "rgba(22,163,74,0.09)" },
    medium: { label: "Priorité moyenne", color: "#92400e", bg: "rgba(180,83,9,0.09)" },
    high: { label: "Haute priorité", color: "#6B1A2A", bg: "rgba(107,26,42,0.09)" },
  };
  const s = map[priority] ?? map.medium;
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: "999px",
        fontSize: "0.72rem",
        fontWeight: 600,
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}

function ToastNotification({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const ok = toast.type === "success";
  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 400,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: "#fff",
        border: `1.5px solid ${ok ? "rgba(22,163,74,0.22)" : "rgba(229,62,62,0.22)"}`,
        borderRadius: "12px",
        padding: "12px 16px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
        minWidth: "280px",
      }}
    >
      {ok ? <CheckCircle2 size={18} color="#16a34a" /> : <XCircle size={18} color="#e53e3e" />}
      <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#1A1A1A", flex: 1 }}>
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
    </div>
  );
}

function MenuDropdown({
  onEdit,
  onDelete,
  canManageTasks,
}: {
  onEdit: () => void;
  onDelete: () => void;
  canManageTasks?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 14px",
          borderRadius: "10px",
          border: "1px solid rgba(107,26,42,0.16)",
          background: "#fff",
          color: "#6B1A2A",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <Settings2 size={16} />
        Setting
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 80 }} />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 8px)",
              width: "190px",
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: "14px",
              boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
              padding: "8px",
              zIndex: 90,
            }}
          >
            <button
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              style={menuItemStyle}
            >
              <Pencil size={14} />
              Modifier
            </button>
            {canManageTasks && (
              <button
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
                style={{ ...menuItemStyle, color: "#dc2626" }}
              >
                <Trash2 size={14} />
                Supprimer
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "none",
  background: "transparent",
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "#1A1A1A",
  cursor: "pointer",
  textAlign: "left",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: "0.68rem",
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.14em",
        color: "#8d8d8d",
        marginBottom: "10px",
      }}
    >
      {children}
    </p>
  );
}

function FileCard({ name, size, icon }: { name: string; size: string; icon: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 14px",
        borderRadius: "14px",
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "10px",
          background: "rgba(107,26,42,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6B1A2A",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1A1A1A", margin: 0 }}>{name}</p>
        <span style={{ fontSize: "0.72rem", color: "#888" }}>{size}</span>
      </div>
    </div>
  );
}

function CommentCard({
  comment,
  isMe,
  canEdit,
  onEdit,
  onDelete,
}: {
  comment: TaskComment;
  isMe: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
      <Avatar name={comment.author_name} size={34} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span
            style={{ fontSize: "0.84rem", fontWeight: 700, color: isMe ? "#6B1A2A" : "#1A1A1A" }}
          >
            {isMe ? "Moi" : comment.author_name}
          </span>
          <span style={{ fontSize: "0.72rem", color: "#8d8d8d" }}>
            {formatDateTime(comment.created_at)}
          </span>
        </div>

        <div
          style={{
            background: isMe ? "#6B1A2A" : "#f5f2ed",
            color: isMe ? "#fff" : "#1A1A1A",
            borderRadius: isMe ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
            padding: "12px 14px",
            fontSize: "0.85rem",
            lineHeight: 1.55,
          }}
          dangerouslySetInnerHTML={{ __html: comment.content }}
        />

        {canEdit && (
          <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
            <button onClick={onEdit} style={linkBtnStyle}>
              <Pencil size={12} />
              Modifier
            </button>
            <button onClick={onDelete} style={{ ...linkBtnStyle, color: "#dc2626" }}>
              <Trash2 size={12} />
              Supprimer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const linkBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  color: "#6B1A2A",
  fontSize: "0.72rem",
  fontWeight: 600,
};

export default function TaskDetailPage({
  task,
  onBack,
  onUpdated,
  projects = [],
  teams = [],
  canManageTasks = false,
}: Props) {
  const { data: session } = useSession();
  const teamId = parseInt((session?.user as { team_id?: string })?.team_id ?? "0");

  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [deleteTaskOpen, setDeleteTaskOpen] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(0);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    async function load() {
      setLoadingComments(true);
      const res = await getTaskComments(task.id);
      if (res.success && res.comments) setComments(res.comments);
      setLoadingComments(false);
    }
    void load();
  }, [task.id]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  function addToast(type: Toast["type"], message: string) {
    toastCounter.current += 1;
    const id = toastCounter.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  const assignedNames = task.assigned_to_names ?? [];
  const hasAssignees = assignedNames.length > 0;
  const projectName = task.project_name ?? "—";
  const dueDate = task.due_date ? formatDate(task.due_date) : "—";

  async function handleAssign() {
    const teamMemberId = parseInt((session?.user as { id?: string })?.id ?? "0");
    if (!teamMemberId) return;
    const res = await assignTaskToSelf(task.id, teamMemberId);
    if (res.success && res.task) {
      onUpdated?.(res.task);
      addToast("success", "Tâche assignée avec succès");
    } else {
      addToast("error", res.error || "Impossible de vous assigner à cette tâche");
    }
  }

  async function handleSubmit() {
    if (!newComment.trim()) return;
    setSubmitting(true);
    const res = await addTaskComment(task.id, newComment);
    setSubmitting(false);
    if (res.success && res.comment) {
      setComments((prev) => [...prev, res.comment!]);
      setNewComment("");
      setResetKey((v) => v + 1);
      addToast("success", "Commentaire ajouté");
    } else {
      addToast("error", res.error || "Erreur lors de l'ajout du commentaire");
    }
  }

  async function handleUpdateComment(commentId: number) {
    if (!editContent.trim()) return;
    setUpdatingId(commentId);
    const res = await updateTaskComment(commentId, editContent);
    setUpdatingId(null);

    if (res.success && res.comment) {
      setComments((prev) => prev.map((c) => (c.id === commentId ? res.comment! : c)));
      setEditingId(null);
      setEditContent("");
      addToast("success", "Commentaire modifié");
    } else {
      addToast("error", res.error || "Erreur lors de la modification");
    }
  }

  async function handleDeleteComment(commentId: number) {
    setDeletingId(commentId);
    const res = await deleteTaskComment(commentId);
    setDeletingId(null);
    setConfirmDeleteId(null);

    if (res.success) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      addToast("success", "Commentaire supprimé");
    } else {
      addToast("error", res.error || "Erreur lors de la suppression");
    }
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#f7f3ed",
        padding: "22px 24px 24px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "18px",
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            border: "none",
            background: "transparent",
            color: "#6B1A2A",
            fontWeight: 700,
            cursor: "pointer",
            padding: 0,
          }}
        >
          <ArrowLeft size={18} />
          RETOUR
        </button>
      </div>

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.15fr) minmax(360px, 0.85fr)",
          gap: "18px",
          minHeight: 0,
        }}
      >
        <div
          style={{
            background: "#F3EDE4",
            borderRadius: "18px",
            padding: "26px 28px",
            minHeight: 0,
            overflow: "auto",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.03)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "20px",
              marginBottom: "18px",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  fontSize: "clamp(2rem, 3vw, 3.2rem)",
                  lineHeight: 1.02,
                  margin: 0,
                  color: "#1A1A1A",
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                }}
              >
                {task.title}
              </h1>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", flexShrink: 0 }}>
              {!hasAssignees && (
                <button
                  onClick={handleAssign}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "10px",
                    border: "1px solid rgba(107,26,42,0.18)",
                    background: "#6B1A2A",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  S&apos;assigner
                </button>
              )}
              <MenuDropdown
                canManageTasks={canManageTasks}
                onEdit={() => setEditTaskOpen(true)}
                onDelete={() => setDeleteTaskOpen(true)}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "22px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {hasAssignees ? (
                <>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    {assignedNames.slice(0, 3).map((name, i) => (
                      <div key={name + i} style={{ marginLeft: i === 0 ? 0 : -10 }}>
                        <Avatar name={name} size={30} />
                      </div>
                    ))}
                    {assignedNames.length > 3 && (
                      <div
                        style={{
                          marginLeft: -10,
                          width: "30px",
                          height: "30px",
                          borderRadius: "50%",
                          background: "#e5e7eb",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: "#6b7280",
                          border: "2px solid #f3ede4",
                        }}
                      >
                        +{assignedNames.length - 3}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: "0.82rem", color: "#1A1A1A", fontWeight: 600 }}>
                    {assignedNames.join(", ")}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: "0.85rem", color: "#7a7a7a" }}>Aucun assigné</span>
              )}
            </div>

            <span style={{ color: "#c8b9a8" }}>•</span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock3 size={15} color="#6B1A2A" />
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1A1A1A" }}>
                {dueDate}
              </span>
            </div>
            <span style={{ color: "#c8b9a8" }}>•</span>
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>

          <div style={{ marginBottom: "26px" }}>
            <SectionLabel>Description</SectionLabel>
            <div
              style={{
                background: "rgba(255,255,255,0.55)",
                borderRadius: "16px",
                padding: "18px 18px",
                color: "#3d3d3d",
                lineHeight: 1.65,
                fontSize: "0.95rem",
                border: "1px solid rgba(0,0,0,0.05)",
              }}
            >
              {task.description || "Aucune description"}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "26px",
            }}
          >
            <div>
              <SectionLabel>Deadline</SectionLabel>
              <div
                style={{
                  background: "rgba(255,255,255,0.55)",
                  borderRadius: "16px",
                  padding: "14px 16px",
                  border: "1px solid rgba(0,0,0,0.05)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <CalendarDays size={16} color="#6B1A2A" />
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                  {task.due_date ? formatDate(task.due_date) : "—"}
                </span>
              </div>
            </div>
            <div>
              <SectionLabel>Créé par</SectionLabel>
              <div
                style={{
                  background: "rgba(255,255,255,0.55)",
                  borderRadius: "16px",
                  padding: "14px 16px",
                  border: "1px solid rgba(0,0,0,0.05)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <Users size={16} color="#6B1A2A" />
                {/* <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{task.created_by_name || "—"}</span> */}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "22px" }}>
            <SectionLabel>Fichiers</SectionLabel>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "12px",
              }}
            >
              <FileCard
                name="brand_guidelines_v2.pdf"
                size="2.4 MB"
                icon={<Paperclip size={16} />}
              />
              <FileCard name="dashboard_mockup.png" size="15 MB" icon={<Paperclip size={16} />} />
            </div>
          </div>

          <div>
            <SectionLabel>Détails</SectionLabel>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "12px",
              }}
            >
              <div style={infoCardStyle}>
                <span style={infoLabelStyle}>Projet</span>
                <span style={infoValueStyle}>{projectName}</span>
              </div>
              <div style={infoCardStyle}>
                <span style={infoLabelStyle}>Statut</span>
                <span style={infoValueStyle}>{task.status}</span>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#F3EDE4",
            borderRadius: "18px",
            padding: "24px",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ marginBottom: "18px" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#1A1A1A", margin: 0 }}>
              COMMENTAIRES
            </h2>
          </div>

          <div
            style={{
              flex: 1,
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              paddingRight: "4px",
            }}
          >
            {loadingComments ? (
              <div style={{ color: "#888", fontSize: "0.9rem" }}>Chargement...</div>
            ) : comments.length === 0 ? (
              <div
                style={{
                  padding: "18px",
                  background: "rgba(255,255,255,0.6)",
                  border: "1px dashed rgba(0,0,0,0.08)",
                  borderRadius: "14px",
                  color: "#8d8d8d",
                  fontSize: "0.9rem",
                }}
              >
                Aucun commentaire pour l’instant.
              </div>
            ) : (
              comments.map((c) => {
                const isMe = c.team_id === teamId;
                const canEdit = isMe || canManageTasks;
                return (
                  <CommentCard
                    key={c.id}
                    comment={c}
                    isMe={isMe}
                    canEdit={canEdit}
                    onEdit={() => {
                      setEditingId(c.id);
                      setEditContent(c.content);
                    }}
                    onDelete={() => setConfirmDeleteId(c.id)}
                  />
                );
              })
            )}
            <div ref={commentsEndRef} />
          </div>

          <div
            style={{
              marginTop: "16px",
              background: "#fff",
              borderRadius: "18px",
              border: "1px solid rgba(0,0,0,0.06)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "10px 12px",
                borderBottom: "1px solid rgba(0,0,0,0.06)",
                display: "flex",
                gap: "10px",
                alignItems: "center",
                color: "#777",
              }}
            >
              <Bold size={15} />
              <Italic size={15} />
              <List size={15} />
              <Paperclip size={15} />
              <Smile size={15} />
            </div>

            <div style={{ padding: "12px" }}>
              <div style={{ fontSize: "0.85rem" }}>
                <RichTextArea key={resetKey} value={newComment} onChange={setNewComment} />
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: "10px",
                }}
              >
                <span style={{ fontSize: "0.72rem", color: "#8d8d8d" }}>Auto-saving draft…</span>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !newComment.trim()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 16px",
                    borderRadius: "12px",
                    border: "none",
                    background:
                      submitting || !newComment.trim() ? "rgba(107,26,42,0.35)" : "#6B1A2A",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: submitting || !newComment.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  <Send size={15} />
                  Commenter
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editingId !== null && (
        <div
          onClick={() => {
            setEditingId(null);
            setEditContent("");
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "rgba(0,0,0,0.35)",
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
              borderRadius: "18px",
              width: "100%",
              maxWidth: "620px",
              padding: "20px",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Modifier le commentaire</h3>
            <div style={{ fontSize: "0.85rem" }}>
              <RichTextArea value={editContent} onChange={setEditContent} />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "14px",
              }}
            >
              <button
                onClick={() => {
                  setEditingId(null);
                  setEditContent("");
                }}
                style={secondaryBtnStyle}
              >
                Annuler
              </button>
              <button
                onClick={() => handleUpdateComment(editingId)}
                disabled={updatingId === editingId || !editContent.trim()}
                style={primaryBtnStyle}
              >
                {updatingId === editingId ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId !== null && (
        <div
          onClick={() => setConfirmDeleteId(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 320,
            background: "rgba(0,0,0,0.35)",
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
              borderRadius: "18px",
              width: "100%",
              maxWidth: "420px",
              padding: "22px",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Supprimer le commentaire ?</h3>
            <p style={{ color: "#666" }}>Cette action est irréversible.</p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "14px",
              }}
            >
              <button onClick={() => setConfirmDeleteId(null)} style={secondaryBtnStyle}>
                Annuler
              </button>
              <button onClick={() => handleDeleteComment(confirmDeleteId)} style={dangerBtnStyle}>
                {deletingId === confirmDeleteId ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editTaskOpen && (
        <EditModal
          mode="update"
          task={task}
          projects={projects}
          teams={teams}
          onClose={() => setEditTaskOpen(false)}
          onSaved={(updated) => {
            setEditTaskOpen(false);
            onUpdated?.(updated);
            addToast("success", "Tâche mise à jour");
          }}
        />
      )}

      {deleteTaskOpen && (
        <DeleteModal
          task={task}
          loading={false}
          onCancel={() => setDeleteTaskOpen(false)}
          onConfirm={async () => {
            const res = await deleteTask(task.id);
            if (res.success) {
              setDeleteTaskOpen(false);
              addToast("success", "Tâche supprimée");
              onBack();
            } else {
              addToast("error", res.error || "Erreur lors de la suppression");
            }
          }}
        />
      )}

      {toasts.map((t) => (
        <ToastNotification
          key={t.id}
          toast={t}
          onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
        />
      ))}

      <style>{`
        .rich-editor-comment .ProseMirror {
          min-height: 80px !important;
          padding: 10px 12px !important;
          font-size: 0.9rem !important;
        }
      `}</style>
    </div>
  );
}

const infoCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.55)",
  borderRadius: "14px",
  padding: "14px 16px",
  border: "1px solid rgba(0,0,0,0.05)",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const infoLabelStyle: React.CSSProperties = {
  fontSize: "0.66rem",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "#8d8d8d",
};

const infoValueStyle: React.CSSProperties = {
  fontSize: "0.9rem",
  fontWeight: 700,
  color: "#1A1A1A",
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: "10px",
  border: "1px solid rgba(0,0,0,0.08)",
  background: "#F5F2ED",
  color: "#666",
  fontWeight: 700,
  cursor: "pointer",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: "10px",
  border: "none",
  background: "#6B1A2A",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const dangerBtnStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: "10px",
  border: "none",
  background: "#dc2626",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};
