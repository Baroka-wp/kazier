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
  Users,
  CalendarDays,
  Clock3,
  ChevronDown,
} from "lucide-react";

import { type Task, deleteTask, updateTaskStatusOnly } from "@/lib/task-actions";
import {
  type TaskComment,
  getTaskComments,
  addTaskComment,
  deleteTaskComment,
  updateTaskComment,
} from "@/lib/task-comments-actions";
import { assignTaskToSelf } from "@/lib/team-actions";
import { EditModal } from "./TasksTable/EditModal-Wrapper";
import { DeleteModal } from "./TasksTable/DeleteModal";
import { type Project, type TeamMember } from "./TasksTable/types";
import ReviewConfirmModal from "@/components/dashboard/ReviewConfirmModal";

const RichTextArea = dynamic(() => import("@/components/DailyForm/RichTextArea"), {
  ssr: false,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type Toast = { id: number; type: "success" | "error"; message: string };

type Props = {
  task: Task;
  onBack: () => void;
  onUpdated?: (updated: Task) => void;
  teamMemberId?: number;
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

// ── StatusOnlyModal — pour le rôle T ─────────────────────────────────────────
// Affiché à la place de EditModal quand canManageTasks === false.
// Seul le statut est modifiable, pas les autres champs.

const STATUS_OPTIONS: { value: Task["status"]; label: string; color: string; bg: string }[] = [
  { value: "à faire", label: "À faire", color: "#6B1A2A", bg: "#6b1a2a11" },
  { value: "en cours", label: "En cours", color: "#6B1A2A", bg: "#6b1a2a11" },
  { value: "review", label: "Review", color: "#6B1A2A", bg: "#6b1a2a11" },
];

function StatusOnlyModal({
  task,
  onClose,
  onSaved,
}: {
  task: Task;
  onClose: () => void;
  onSaved: (updated: Task) => void;
}) {
  const [status, setStatus] = useState<Task["status"]>(task.status);
  const [saving, setSaving] = useState(false);

  // ✅ States pour confirmation review
  const [showReviewConfirm, setShowReviewConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<Task["status"] | null>(null);

  async function handleSave() {
    if (status === task.status) {
      onClose();
      return;
    }

    // ✅ INTERCEPTEUR : modale avant "review"
    if (status === "review") {
      setPendingStatus(status);
      setShowReviewConfirm(true);
      return;
    }

    // Autres statuts → direct
    setSaving(true);
    const res = await updateTaskStatusOnly(task.id, status);
    setSaving(false);

    if (res.success && res.task) {
      onSaved(res.task);
    }
  }

  // ✅ Confirmation review
  async function confirmReview() {
    if (!pendingStatus) return;

    setShowReviewConfirm(false);
    setSaving(true);

    const res = await updateTaskStatusOnly(task.id, pendingStatus);
    setSaving(false);
    setPendingStatus(null);

    if (res.success && res.task) {
      onSaved(res.task);
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 350,
          background: "rgba(0,0,0,0.40)",
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
            borderRadius: "16px",
            width: "100%",
            maxWidth: "420px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
            overflow: "hidden",
            animation: "popIn 0.2s ease",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "20px 22px 16px",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#1A1A1A" }}>
                Modifier le statut
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#888" }}>{task.title}</p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "#F5F2ED",
                border: "none",
                borderRadius: "8px",
                width: "30px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#888",
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Body */}
          <div
            style={{
              padding: "20px 22px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {/* ✅ Message si bloqué */}
            {task.status === "review" && (
              <div
                style={{
                  padding: "12px 16px",
                  background: "rgba(253, 186, 116, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: "8px",
                  color: "#92400e",
                  fontSize: "0.85rem",
                }}
              >
                🔒 <strong>Tâche en review</strong> — bloquée en attente de validation TM/SA
              </div>
            )}

            {/* Custom select visuel */}
            <div style={{ position: "relative" }}>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Task["status"])}
                disabled={task.status === "review"} // ✅ Désactive si en review
                style={{
                  width: "100%",
                  appearance: "none",
                  WebkitAppearance: "none",
                  padding: "11px 38px 11px 14px",
                  borderRadius: "10px",
                  border: `2px solid ${STATUS_OPTIONS.find((o) => o.value === status)?.bg ?? "rgba(0,0,0,0.1)"}`,
                  background:
                    task.status === "review"
                      ? "#f5f5f5" // ✅ Gris si bloqué
                      : (STATUS_OPTIONS.find((o) => o.value === status)?.bg ?? "#fff"),
                  color:
                    task.status === "review"
                      ? "#999" // ✅ Texte grisé
                      : (STATUS_OPTIONS.find((o) => o.value === status)?.color ?? "#1A1A1A"),
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  cursor:
                    task.status === "review"
                      ? "not-allowed" // ✅ Curseur bloqué
                      : "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  transition: "border-color 0.15s",
                }}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={task.status === "review" && opt.value !== "review"} // ✅ Grise options sauf "review"
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={15}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: STATUS_OPTIONS.find((o) => o.value === status)?.color ?? "#888",
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "0 22px 20px",
              display: "flex",
              gap: "8px",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                border: "1.5px solid rgba(0,0,0,0.08)",
                background: "#F5F2ED",
                color: "#666",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "0.82rem",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving || status === task.status || task.status === "review"} // ✅
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                border: "none",
                background:
                  saving || status === task.status || task.status === "review"
                    ? "rgba(107,26,42,0.35)"
                    : "#6B1A2A",
                color: "#fff",
                fontWeight: 700,
                cursor:
                  saving || status === task.status || task.status === "review"
                    ? "not-allowed"
                    : "pointer",
                fontSize: "0.82rem",
                fontFamily: "'DM Sans', sans-serif",
                transition: "background 0.15s",
              }}
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
        <style>{`@keyframes popIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }`}</style>
      </div>

      {showReviewConfirm && pendingStatus && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 360, // ✅ Au-dessus de StatusOnlyModal (350)
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ReviewConfirmModal
            onConfirm={confirmReview}
            onCancel={() => {
              setShowReviewConfirm(false);
              setPendingStatus(null);
            }}
          />
        </div>
      )}
    </>
  );
}

// ── MenuDropdown ──────────────────────────────────────────────────────────────

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
          border: "none",
          background: "#6B1A2A",
          color: "#fff",
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
              width: "200px",
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
              <Pencil size={14} />
              {/* Label selon le rôle */}
              {canManageTasks ? "Modifier la tâche" : "Modifier le statut"}
            </button>

            {/* Supprimer — TM et SA uniquement */}
            {canManageTasks && (
              <>
                <div style={{ height: "1px", background: "rgba(0,0,0,0.06)", margin: "4px 0" }} />
                <button
                  onClick={() => {
                    setOpen(false);
                    onDelete();
                  }}
                  style={{ ...menuItemStyle, color: "#dc2626" }}
                >
                  <Trash2 size={14} /> Supprimer la tâche
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

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

const infoCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.55)",
  borderRadius: "10px",
  padding: "12px 14px",
  border: "1px solid rgba(0,0,0,0.05)",
  display: "flex",
  flexDirection: "column",
  gap: "5px",
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: "8px",
  border: "1px solid rgba(0,0,0,0.08)",
  background: "#F5F2ED",
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: "0.68rem",
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.14em",
        color: "#8d8d8d",
        margin: "0 0 8px 0",
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
        padding: "10px 12px",
        borderRadius: "10px",
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "32px",
          height: "32px",
          flexShrink: 0,
          borderRadius: "8px",
          background: "rgba(107,26,42,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6B1A2A",
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            fontSize: "0.78rem",
            fontWeight: 600,
            color: "#1A1A1A",
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </p>
        <span style={{ fontSize: "0.68rem", color: "#888" }}>{size}</span>
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
            background: isMe ? "#6B1A2A" : "#f5f2ed",
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

  // ── Modal routing — clé du comportement ──────────────────────────────────
  // canManageTasks = true  → EditModal complet (TM / SA)
  // canManageTasks = false → StatusOnlyModal  (T)
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [deleteTaskOpen, setDeleteTaskOpen] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(0);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialCommentLoad = useRef(true);
  const [resetKey, setResetKey] = useState(0);

  // Track task in local state so StatusOnlyModal update reflects instantly
  const [localTask, setLocalTask] = useState<Task>(task);
  useEffect(() => {
    setLocalTask(task);
  }, [task]);

  useEffect(() => {
    async function load() {
      setLoadingComments(true);
      const res = await getTaskComments(localTask.id);
      if (res.success && res.comments) setComments(res.comments);
      setLoadingComments(false);
      isInitialCommentLoad.current = true;
    }
    void load();
  }, [localTask.id]);

  useEffect(() => {
    if (isInitialCommentLoad.current) {
      isInitialCommentLoad.current = false;
      return;
    }
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let parent = el.parentElement;
    while (parent) {
      const { overflowY } = window.getComputedStyle(parent);
      if (overflowY === "auto" || overflowY === "scroll") {
        parent.scrollTop = 0;
        return;
      }
      parent = parent.parentElement;
    }
    window.scrollTo(0, 0);
  }, []);

  function addToast(type: Toast["type"], message: string) {
    toastCounter.current += 1;
    const id = toastCounter.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  const assignedNames = localTask.assigned_to_names ?? [];
  const hasAssignees = assignedNames.length > 0;
  const projectName = localTask.project_name ?? "—";
  const dueDate = localTask.due_date ? formatDate(localTask.due_date) : "—";

  async function handleAssign() {
    const memberId = parseInt((session?.user as { id?: string })?.id ?? "0");
    if (!memberId) return;
    const res = await assignTaskToSelf(localTask.id, memberId);
    if (res.success && res.task) {
      setLocalTask(res.task);
      onUpdated?.(res.task);
      addToast("success", "Tâche assignée avec succès");
    } else {
      addToast("error", res.error || "Impossible de vous assigner à cette tâche");
    }
  }

  async function handleSubmit() {
    if (!newComment.trim()) return;
    setSubmitting(true);
    const res = await addTaskComment(localTask.id, newComment);
    setSubmitting(false);
    if (res.success && res.comment) {
      setComments((prev) => [...prev, res.comment!]);
      isInitialCommentLoad.current = false;
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
      ref={containerRef}
      style={{ width: "100%", minHeight: "100%", background: "#f7f3ed", boxSizing: "border-box" }}
    >
      <style>{`
        .tdp-outer { padding: 20px 24px 32px; }
        .tdp-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
          gap: 16px; align-items: start;
        }
        .tdp-panel {
          background: #F3EDE4; border-radius: 10px;
          padding: 22px 24px; border: 1px solid rgba(0,0,0,0.04);
        }
        .tdp-comments-panel {
          background: #F3EDE4; border-radius: 10px;
          padding: 22px 24px; border: 1px solid rgba(0,0,0,0.04);
          display: flex; flex-direction: column;
          height: calc(100vh - 130px); min-height: 500px;
          position: sticky; top: 20px;
        }
        .tdp-task-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
        .tdp-task-title { font-size: clamp(1.4rem, 2.5vw, 2.6rem); line-height: 1.05; margin: 0; color: #1A1A1A; font-weight: 800; letter-spacing: -0.03em; word-break: break-word; }
        .tdp-meta-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
        .tdp-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 22px; }
        .tdp-files-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .tdp-actions-row { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        @media (max-width: 1024px) {
          .tdp-grid { grid-template-columns: 1fr 340px; }
          .tdp-comments-panel { height: calc(100vh - 130px); }
        }
        @media (max-width: 768px) {
          .tdp-outer { padding: 14px 14px 32px; }
          .tdp-grid { grid-template-columns: 1fr; }
          .tdp-panel { padding: 16px; }
          .tdp-comments-panel { height: auto; min-height: 400px; position: static; padding: 16px; }
          .tdp-task-header { flex-direction: column; align-items: stretch; gap: 12px; }
          .tdp-task-title { font-size: clamp(1.3rem, 6vw, 1.8rem); }
          .tdp-actions-row { justify-content: flex-start; }
          .tdp-info-grid { grid-template-columns: 1fr; }
          .tdp-files-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .tdp-meta-row { gap: 6px; }
          .tdp-panel, .tdp-comments-panel { padding: 14px 12px; }
        }
        .rich-editor-comment .ProseMirror { min-height: 72px !important; padding: 10px 12px !important; font-size: 0.88rem !important; }
      `}</style>

      <div className="tdp-outer">
        {/* ── Back ── */}
        <button
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            border: "none",
            background: "transparent",
            color: "#6B1A2A",
            fontWeight: 700,
            cursor: "pointer",
            padding: 0,
            marginBottom: "16px",
            fontSize: "0.78rem",
            letterSpacing: "0.04em",
          }}
        >
          <ArrowLeft size={16} />
          RETOUR
        </button>

        <div className="tdp-grid">
          {/* ══ Left panel ══ */}
          <div className="tdp-panel">
            <div className="tdp-task-header">
              <h1 className="tdp-task-title">{localTask.title}</h1>
              <div className="tdp-actions-row">
                {!hasAssignees && (
                  <button
                    onClick={handleAssign}
                    style={{
                      padding: "9px 14px",
                      borderRadius: "10px",
                      border: "1px solid rgba(107,26,42,0.18)",
                      background: "#6B1A2A",
                      color: "#fff",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "0.82rem",
                      whiteSpace: "nowrap",
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

            {/* Meta */}
            <div className="tdp-meta-row">
              {hasAssignees ? (
                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    {assignedNames.slice(0, 3).map((name, i) => (
                      <div key={name + i} style={{ marginLeft: i === 0 ? 0 : -9 }}>
                        <Avatar name={name} size={28} />
                      </div>
                    ))}
                    {assignedNames.length > 3 && (
                      <div
                        style={{
                          marginLeft: -9,
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          background: "#e5e7eb",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          color: "#6b7280",
                          border: "2px solid #f3ede4",
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
              <span style={{ color: "#c8b9a8", fontSize: "0.75rem" }}>•</span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Clock3 size={14} color="#6B1A2A" />
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1A1A1A" }}>
                  {dueDate}
                </span>
              </div>
              <span style={{ color: "#c8b9a8", fontSize: "0.75rem" }}>•</span>
              <StatusBadge status={localTask.status} />
              <PriorityBadge priority={localTask.priority} />
            </div>

            {/* Description */}
            <div style={{ marginBottom: "22px" }}>
              <SectionLabel>Description</SectionLabel>
              <div
                style={{
                  background: "rgba(255,255,255,0.55)",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  color: "#3d3d3d",
                  lineHeight: 1.65,
                  fontSize: "0.92rem",
                  border: "1px solid rgba(0,0,0,0.05)",
                }}
              >
                {localTask.description || (
                  <span style={{ color: "#aaa", fontStyle: "italic" }}>Aucune description</span>
                )}
              </div>
            </div>

            {/* Deadline + Créé par */}
            <div className="tdp-info-grid">
              <div>
                <SectionLabel>Deadline</SectionLabel>
                <div style={infoCardStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <CalendarDays size={15} color="#6B1A2A" />
                    <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                      {localTask.due_date ? formatDate(localTask.due_date) : "—"}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <SectionLabel>Créé par</SectionLabel>
                <div style={infoCardStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Users size={15} color="#6B1A2A" />
                    <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>—</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fichiers */}
            <div style={{ marginBottom: "22px" }}>
              <SectionLabel>Fichiers</SectionLabel>
              <div className="tdp-files-grid">
                <FileCard
                  name="brand_guidelines_v2.pdf"
                  size="2.4 MB"
                  icon={<Paperclip size={15} />}
                />
                <FileCard name="dashboard_mockup.png" size="15 MB" icon={<Paperclip size={15} />} />
              </div>
            </div>

            {/* Détails */}
            <div>
              <SectionLabel>Détails</SectionLabel>
              <div className="tdp-info-grid" style={{ marginBottom: 0 }}>
                <div style={infoCardStyle}>
                  <span
                    style={{
                      fontSize: "0.63rem",
                      fontWeight: 800,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.12em",
                      color: "#8d8d8d",
                    }}
                  >
                    Projet
                  </span>
                  <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1A1A1A" }}>
                    {projectName}
                  </span>
                </div>
                <div style={infoCardStyle}>
                  <span
                    style={{
                      fontSize: "0.63rem",
                      fontWeight: 800,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.12em",
                      color: "#8d8d8d",
                    }}
                  >
                    Statut
                  </span>
                  <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1A1A1A" }}>
                    {localTask.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ══ Right panel — Comments ══ */}
          <div className="tdp-comments-panel">
            <h2
              style={{
                fontSize: "0.88rem",
                fontWeight: 800,
                color: "#1A1A1A",
                margin: "0 0 16px 0",
                letterSpacing: "0.06em",
              }}
            >
              COMMENTAIRES
            </h2>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                paddingRight: "2px",
                marginBottom: "14px",
              }}
            >
              {loadingComments ? (
                <div style={{ color: "#888", fontSize: "0.88rem" }}>Chargement...</div>
              ) : comments.length === 0 ? (
                <div
                  style={{
                    padding: "16px",
                    background: "rgba(255,255,255,0.6)",
                    border: "1px dashed rgba(0,0,0,0.08)",
                    borderRadius: "10px",
                    color: "#8d8d8d",
                    fontSize: "0.88rem",
                  }}
                >
                  Aucun commentaire pour l&apos;instant.
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

            {/* Input zone */}
            <div
              style={{
                background: "#fff",
                borderRadius: "10px",
                border: "1px solid rgba(0,0,0,0.08)",
                flexShrink: 0,
                padding: "12px",
              }}
            >
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <Avatar name={session?.user?.name ?? "?"} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      background: "#f7f3ed",
                      borderRadius: "8px",
                      border: "1px solid rgba(0,0,0,0.07)",
                      overflow: "hidden",
                      fontSize: "0.85rem",
                    }}
                  >
                    <RichTextArea key={resetKey} value={newComment} onChange={setNewComment} />
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  marginTop: "10px",
                  paddingTop: "10px",
                  borderTop: "1px solid rgba(0,0,0,0.05)",
                }}
              >
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !newComment.trim()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "none",
                    background:
                      submitting || !newComment.trim() ? "rgba(107,26,42,0.30)" : "#6B1A2A",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: submitting || !newComment.trim() ? "not-allowed" : "pointer",
                    fontSize: "0.8rem",
                    transition: "background 0.15s",
                  }}
                >
                  <Send size={13} />
                  {submitting ? "Envoi..." : "Commenter"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal routing ────────────────────────────────────────────────────
          canManageTasks = true  → EditModal complet  (TM / SA)
          canManageTasks = false → StatusOnlyModal    (T)
      ── */}
      {editTaskOpen &&
        (canManageTasks ? (
          <EditModal
            mode="update"
            task={localTask}
            projects={projects}
            teams={teams}
            canManageTasks={canManageTasks}
            onClose={() => setEditTaskOpen(false)}
            onSaved={(updated) => {
              setEditTaskOpen(false);
              setLocalTask(updated);
              onUpdated?.(updated);
              addToast("success", "Tâche mise à jour");
            }}
          />
        ) : (
          <StatusOnlyModal
            task={localTask}
            onClose={() => setEditTaskOpen(false)}
            onSaved={(updated) => {
              setEditTaskOpen(false);
              setLocalTask(updated);
              onUpdated?.(updated);
              addToast("success", "Statut mis à jour");
            }}
          />
        ))}

      {deleteTaskOpen && (
        <DeleteModal
          task={localTask}
          loading={false}
          onCancel={() => setDeleteTaskOpen(false)}
          onConfirm={async () => {
            const res = await deleteTask(localTask.id);
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
