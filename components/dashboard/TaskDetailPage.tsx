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
  MessageSquare,
  ChevronUp,
  ChevronDown,
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
import { deleteTask, getTeamMembersByProject } from "@/lib/task-actions";
import TaskFormModal from "./TaskFormModal";
import { DeleteModal } from "./TasksTable/DeleteModal";
import { type Project, type TeamMember } from "./TasksTable/types";

const RichTextArea = dynamic(() => import("@/components/DailyForm/RichTextArea"), {
  ssr: false,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type Toast = {
  id: string;
  type: "success" | "error";
  message: string;
};

type Props = {
  task: Task;
  onBack: () => void;
  onUpdated?: (updated: Task) => void;
  teamMemberId?: string;
  isTM?: boolean;
  projects?: Project[];
  teams?: TeamMember[];
  canManageTasks?: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

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
        borderRadius: "6px",
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
        borderRadius: "6px",
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
        borderRadius: "10px",
        padding: "12px 16px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
        minWidth: "260px",
        maxWidth: "calc(100vw - 48px)",
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
          padding: "9px 14px",
          borderRadius: "10px",
          border: "1px solid rgba(107,26,42,0.16)",
          background: "#fff",
          color: "#6B1A2A",
          fontWeight: 600,
          cursor: "pointer",
          fontSize: "0.82rem",
          whiteSpace: "nowrap",
        }}
      >
        <Settings2 size={15} />
        Setting
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 80 }} />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 6px)",
              width: "180px",
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: "10px",
              boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
              padding: "6px",
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
              <Pencil size={14} /> Modifier
            </button>
            {canManageTasks && (
              <button
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
                style={{ ...menuItemStyle, color: "#dc2626" }}
              >
                <Trash2 size={14} /> Supprimer
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Shared style constants ────────────────────────────────────────────────────

const menuItemStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "9px 12px",
  borderRadius: "8px",
  border: "none",
  background: "transparent",
  fontSize: "0.83rem",
  fontWeight: 600,
  color: "#1A1A1A",
  cursor: "pointer",
  textAlign: "left",
};

const linkBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  color: "#6B1A2A",
  fontSize: "0.7rem",
  fontWeight: 600,
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: "8px",
  border: "1px solid rgba(0,0,0,0.08)",
  background: "#e8eaed",
  color: "#666",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "0.82rem",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: "8px",
  border: "none",
  background: "#6B1A2A",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "0.82rem",
};

const dangerBtnStyle: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: "8px",
  border: "none",
  background: "#dc2626",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "0.82rem",
};

// ── Comment Card Component ────────────────────────────────────────────────────

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
    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
      <Avatar name={comment.author_name} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "6px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{ fontSize: "0.82rem", fontWeight: 700, color: isMe ? "#6B1A2A" : "#1A1A1A" }}
          >
            {isMe ? "Moi" : comment.author_name}
          </span>
          <span style={{ fontSize: "0.7rem", color: "#8d8d8d" }}>
            {formatDateTime(comment.created_at)}
          </span>
        </div>
        <div
          style={{
            background: isMe ? "#6B1A2A" : "#e8eaed",
            color: isMe ? "#fff" : "#1A1A1A",
            borderRadius: isMe ? "10px 3px 10px 10px" : "3px 10px 10px 10px",
            padding: "10px 13px",
            fontSize: "0.84rem",
            lineHeight: 1.55,
            wordBreak: "break-word",
          }}
          dangerouslySetInnerHTML={{ __html: comment.content }}
        />
        {canEdit && (
          <div style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
            <button onClick={onEdit} style={linkBtnStyle}>
              <Pencil size={11} />
              Modifier
            </button>
            <button onClick={onDelete} style={{ ...linkBtnStyle, color: "#dc2626" }}>
              <Trash2 size={11} />
              Supprimer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function TaskDetailPage({
  task,
  onBack,
  onUpdated,
  teamMemberId = "",
  isTM = false,
  projects = [],
  teams = [],
  canManageTasks = false,
}: Props) {
  const { data: session } = useSession();
  const teamId = (session?.user as { id?: string })?.id ?? "";

  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [deleteTaskOpen, setDeleteTaskOpen] = useState(false);
  const [projectTeamMembers, setProjectTeamMembers] = useState<
    Array<{ id: string; first_name: string; last_name: string }>
  >([]);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(0);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const [resetKey, setResetKey] = useState(0);

  // Load team members when edit modal opens
  useEffect(() => {
    async function loadTeamMembers() {
      if (editTaskOpen && task.project_id) {
        const result = await getTeamMembersByProject(task.project_id);
        if (result.success && result.members) {
          setProjectTeamMembers(result.members);
        }
      }
    }
    loadTeamMembers();
  }, [editTaskOpen, task.project_id]);

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
    if (commentsExpanded) {
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments, commentsExpanded]);

  useEffect(() => {
    const timer = setTimeout(() => window.scrollTo(0, 0), 0);
    return () => clearTimeout(timer);
  }, []);

  function addToast(type: Toast["type"], message: string) {
    toastCounter.current += 1;
    const id = String(toastCounter.current);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  const assignedNames = task.assigned_to_names ?? [];
  const hasAssignees = assignedNames.length > 0;
  const projectName = task.project_name ?? "—";
  const dueDate = task.due_date ? formatDate(task.due_date) : "—";

  async function handleAssign() {
    const memberId = (session?.user as { id?: string })?.id ?? "";
    if (!memberId) return;
    const res = await assignTaskToSelf(task.id, memberId);
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

  async function handleUpdateComment(commentId: string) {
    if (!editContent.trim()) return;
    setUpdatingId(commentId);
    const res = await updateTaskComment(commentId, editContent);
    setUpdatingId(null);
    if (res.success) {
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, content: editContent.trim() } : c))
      );
      setEditingId(null);
      setEditContent("");
      addToast("success", "Commentaire modifié");
    } else {
      addToast("error", res.error || "Erreur lors de la modification");
    }
  }

  async function handleDeleteComment(commentId: string) {
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

  const latestComment = comments.length > 0 ? comments[comments.length - 1] : null;

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#F7F3ED",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        .tdp-wrapper {
          padding: 24px 32px 40px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .tdp-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 28px;
        }
        .tdp-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: none;
          background: transparent;
          color: #6B1A2A;
          font-weight: 700;
          cursor: pointer;
          padding: 8px 12px;
          fontSize: 0.78rem;
          letterSpacing: 0.04em;
          border-radius: 0;
          transition: background 0.15s;
        }
        .tdp-back-btn:hover {
          background: rgba(107,26,42,0.05);
        }
        .tdp-main-card {
          background: #fff;
          border-radius: 0;
          padding: 32px 40px;
          border: 1px solid rgba(0,0,0,0.08);
          margin-bottom: 20px;
        }
        .tdp-task-title {
          font-size: clamp(1.5rem, 3vw, 2.2rem);
          line-height: 1.15;
          margin: 0 0 20px 0;
          color: #1A1A1A;
          font-weight: 800;
          letter-spacing: -0.03em;
          word-break: break-word;
        }
        .tdp-meta-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }
        .tdp-assignee-group {
          border: 1px solid rgba(107,26,42,0.12);
          display: flex;
          alignItems: center;
          gap: 8px;
          padding: 6px 12px;
          background: rgba(107,26,42,0.05);
          border-radius: 0;
        }
        .tdp-description-box {
          border: 1px solid rgba(0,0,0,0.08);
          background: #fff;
          borderRadius: 0;
          padding: 20px 24px;
          color: #3d3d3d;
          lineHeight: 1.7;
          fontSize: 0.95rem;
          border: 1px solid rgba(0,0,0,0.08);
        }
        .tdp-info-row {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid rgba(0,0,0,0.08);
        }
        .tdp-info-pill {
          border: 1px solid rgba(0,0,0,0.08);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: #fff;
          border-radius: 0;
          font-size: 0.82rem;
          font-weight: 600;
          color: #1A1A1A;
        }
        .tdp-comments-section {
          border: 1px solid rgba(0,0,0,0.08);
          background: #fff;
          border-radius: 0;
          padding: 24px 32px;
          
        }
        .tdp-comments-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          cursor: pointer;
          padding: 8px 0;
        }
        .tdp-comments-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.85rem;
          font-weight: 800;
          color: #1A1A1A;
          letter-spacing: 0.06em;
        }
        .tdp-comments-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 22px;
          padding: 0 6px;
          background: #6B1A2A;
          color: #fff;
          borderRadius: 0;
          fontSize: 0.7rem;
          fontWeight: 700;
        }
        .tdp-comments-preview {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          background: #fff;
          border-radius: 0;
          cursor: pointer;
          transition: background 0.15s;
        }
        .tdp-comments-preview:hover {
          background: rgba(247,243,237,0.9);
        }
        .tdp-comments-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(0,0,0,0.08);
        }
        .tdp-comment-input-wrapper {
          margin-top: 20px;
          background: #fff;
          border-radius: 0;
          border: 1px solid rgba(0,0,0,0.08);
          overflow: hidden;
        }
        .tdp-comment-toolbar {
          padding: 8px 14px;
          borderBottom: 1px solid rgba(0,0,0,0.05);
          display: flex;
          gap: 10px;
          align-items: center;
          color: #888;
        }
        .tdp-comment-toolbar button {
          background: none;
          border: none;
          cursor: pointer;
          color: #888;
          display: flex;
          padding: 4px;
          border-radius: 4px;
          transition: background 0.1s;
        }
        .tdp-comment-toolbar button:hover {
          background: rgba(0,0,0,0.05);
        }
        .tdp-comment-editor {
          padding: 12px 14px;
        }
        .tdp-comment-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          borderTop: 1px solid rgba(0,0,0,0.05);
        }
        .tdp-comment-draft {
          font-size: 0.65rem;
          color: #8d8d8d;
        }
        .tdp-submit-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 16px;
          border-radius: 0;
          border: none;
          background: #6B1A2A;
          color: #fff;
          font-weight: 700;
          cursor: pointer;
          font-size: 0.8rem;
          transition: background 0.15s;
        }
        .tdp-submit-btn:disabled {
          background: rgba(107,26,42,0.35);
          cursor: not-allowed;
        }
        .tdp-submit-btn:hover:not(:disabled) {
          background: #8B2438;
        }
        .tdp-empty-state {
          padding: 24px;
          background: #fff;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 0;
          text-align: center;
          color: #8d8d8d;
          font-size: 0.88rem;
        }
        .tdp-section-label {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #8d8d8d;
          margin-bottom: 10px;
        }

        @media (max-width: 768px) {
          .tdp-wrapper {
            padding: 16px 16px 24px;
          }
          .tdp-main-card {
            padding: 20px 16px;
          }
          .tdp-comments-section {
          border: 1px solid rgba(0,0,0,0.08);
            padding: 16px;
          }
          .tdp-task-title {
            font-size: 1.4rem;
          }
        }

        .rich-editor-comment .ProseMirror {
          min-height: 60px !important;
          padding: 8px 10px !important;
          font-size: 0.85rem !important;
        }
      `}</style>

      <div className="tdp-wrapper">
        {/* ── Back button ── */}
        <button onClick={onBack} className="tdp-back-btn">
          <ArrowLeft size={16} />
          RETOUR
        </button>

        {/* ── Main task card ── */}
        <div className="tdp-main-card">
          {/* Title + actions */}
          <div className="tdp-header">
            <h1 className="tdp-task-title">{task.title}</h1>
            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
              {!hasAssignees && (
                <button
                  onClick={handleAssign}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "10px",
                    border: "1px solid rgba(107,26,42,0.18)",
                    background: "#6B1A2A",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    whiteSpace: "nowrap",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#8B2438")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#6B1A2A")}
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

          {/* Meta row */}
          <div className="tdp-meta-row">
            {hasAssignees ? (
              <div className="tdp-assignee-group">
                <div style={{ display: "flex", alignItems: "center" }}>
                  {assignedNames.slice(0, 3).map((name, i) => (
                    <div key={name + i} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                      <Avatar name={name} size={26} />
                    </div>
                  ))}
                  {assignedNames.length > 3 && (
                    <div
                      style={{
                        marginLeft: -8,
                        width: "26px",
                        height: "26px",
                        borderRadius: "50%",
                        background: "#e5e7eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        color: "#6b7280",
                        border: "2px solid #fff",
                      }}
                    >
                      +{assignedNames.length - 3}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: "0.8rem", color: "#1A1A1A", fontWeight: 600 }}>
                  {assignedNames.slice(0, 2).join(", ")}
                  {assignedNames.length > 2 ? ` +${assignedNames.length - 2}` : ""}
                </span>
              </div>
            ) : (
              <span style={{ fontSize: "0.82rem", color: "#7a7a7a" }}>Aucun assigné</span>
            )}

            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>

          {/* Description */}
          <div>
            <p className="tdp-section-label">Description</p>
            <div className="tdp-description-box">
              {task.description || (
                <span style={{ color: "#aaa", fontStyle: "italic" }}>Aucune description</span>
              )}
            </div>
          </div>

          {/* Info pills */}
          <div className="tdp-info-row">
            <div className="tdp-info-pill">
              <CalendarDays size={15} color="#6B1A2A" />
              {task.due_date ? formatDate(task.due_date) : "—"}
            </div>
            <div className="tdp-info-pill">
              <Users size={15} color="#6B1A2A" />
              {projectName}
            </div>
          </div>
        </div>

        {/* ── Comments section ── */}
        <div className="tdp-comments-section">
          <div
            className="tdp-comments-header"
            onClick={() => setCommentsExpanded((v) => !v)}
            style={{ cursor: "pointer" }}
          >
            <div className="tdp-comments-title">
              <MessageSquare size={16} color="#6B1A2A" />
              COMMENTAIRES
              {comments.length > 0 && <span className="tdp-comments-badge">{comments.length}</span>}
            </div>
            <button
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#6B1A2A",
                display: "flex",
                alignItems: "center",
              }}
            >
              {commentsExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>

          {commentsExpanded ? (
            <>
              <div className="tdp-comments-list">
                {loadingComments ? (
                  <div style={{ color: "#888", fontSize: "0.88rem" }}>Chargement...</div>
                ) : comments.length === 0 ? (
                  <div className="tdp-empty-state">Aucun commentaire pour l&apos;instant.</div>
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

              {/* Comment input */}
              <div className="tdp-comment-input-wrapper">
                <div className="tdp-comment-toolbar">
                  {[Bold, Italic, List, Paperclip, Smile].map((Icon, i) => (
                    <button key={i} type="button">
                      <Icon size={14} />
                    </button>
                  ))}
                </div>
                <div className="tdp-comment-editor">
                  <RichTextArea key={resetKey} value={newComment} onChange={setNewComment} />
                </div>
                <div className="tdp-comment-footer">
                  <span className="tdp-comment-draft">Sauvegarde automatique...</span>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !newComment.trim()}
                    className="tdp-submit-btn"
                  >
                    <Send size={13} />
                    Commenter
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Preview when collapsed */
            <div
              className="tdp-comments-preview"
              onClick={() => setCommentsExpanded(true)}
              style={{ cursor: "pointer" }}
            >
              {latestComment ? (
                <>
                  <Avatar name={latestComment.author_name} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1A1A1A" }}>
                        {latestComment.author_name}
                      </span>
                      <span style={{ fontSize: "0.68rem", color: "#8d8d8d" }}>
                        {formatDateTime(latestComment.created_at)}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        color: "#666",
                        marginTop: "4px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      dangerouslySetInnerHTML={{ __html: latestComment.content }}
                    />
                  </div>
                  <ChevronDown size={16} color="#6B1A2A" />
                </>
              ) : (
                <div style={{ color: "#8d8d8d", fontSize: "0.85rem" }}>
                  Cliquez pour ajouter un commentaire
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Edit comment modal ── */}
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
            padding: "16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "580px",
              padding: "20px",
            }}
          >
            <h3 style={{ margin: "0 0 14px 0", fontSize: "1rem" }}>Modifier le commentaire</h3>
            <div style={{ fontSize: "0.85rem" }}>
              <RichTextArea value={editContent} onChange={setEditContent} />
            </div>
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "14px" }}
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

      {/* ── Delete comment modal ── */}
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
            padding: "16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "400px",
              padding: "22px",
            }}
          >
            <h3 style={{ margin: "0 0 8px 0", fontSize: "1rem" }}>Supprimer le commentaire ?</h3>
            <p style={{ color: "#666", margin: "0 0 18px 0", fontSize: "0.88rem" }}>
              Cette action est irréversible.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
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

      {/* ── Task modals ── */}
      {editTaskOpen && task.project_id && (
        <TaskFormModal
          show={editTaskOpen}
          mode="edit"
          task={task}
          projectId={task.project_id}
          teamMembers={projectTeamMembers}
          onClose={() => setEditTaskOpen(false)}
          onSuccess={() => {
            setEditTaskOpen(false);
            // Refresh the task by calling onUpdated with current task
            onUpdated?.(task);
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

      {/* ── Toasts ── */}
      {toasts.map((t) => (
        <ToastNotification
          key={t.id}
          toast={t}
          onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
        />
      ))}
    </div>
  );
}
