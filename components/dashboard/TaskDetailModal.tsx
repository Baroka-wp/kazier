"use client";

import { useState, useEffect, useRef } from "react";
import { X, Trash2, Send, Pencil, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { type Task } from "@/lib/task-actions";
import {
  type TaskComment,
  getTaskComments,
  addTaskComment,
  deleteTaskComment,
  updateTaskComment,
} from "@/lib/task-comments-actions";

const RichTextArea = dynamic(() => import("@/components/DailyForm/RichTextArea"), { ssr: false });

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
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

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        background: "rgba(107,26,42,0.1)",
        border: "1.5px solid rgba(107,26,42,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: `${size * 0.3}px`,
        fontWeight: 700,
        color: "#6B1A2A",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function RoleBadge({ role }: { role: string | null }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    SA: { label: "Super Admin", color: "#6B1A2A", bg: "rgba(107,26,42,0.1)" },
    TM: { label: "Team Manager", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
    T: { label: "Team", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  };
  const s = map[role ?? ""] ?? { label: role ?? "—", color: "#666", bg: "rgba(0,0,0,0.05)" };
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: "20px",
        fontSize: "0.6rem",
        fontWeight: 600,
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    "à faire": { label: "À faire", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    "en cours": { label: "En cours", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
    review: { label: "Review", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
    terminée: { label: "Terminée", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  };
  const s = map[status] ?? { label: status, color: "#666", bg: "rgba(0,0,0,0.05)" };
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: "20px",
        fontSize: "0.7rem",
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
    low: { label: "Faible", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
    medium: { label: "Moyen", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    high: { label: "Élevée", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  };
  const s = map[priority] ?? { label: priority, color: "#666", bg: "rgba(0,0,0,0.05)" };
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: "20px",
        fontSize: "0.7rem",
        fontWeight: 600,
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}

// ── Types Toast ───────────────────────────────────────────────────────────────

type Toast = {
  id: string;
  type: "success" | "error";
  message: string;
};

// ── Composant Toast ──────────────────────────────────────────────────────────

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
      <style>{`@keyframes slideIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  );
}

// ── Modal de confirmation ────────────────────────────────────────────────────

function ConfirmDeleteModal({
  onConfirm,
  onCancel,
  loading,
}: {
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
        background: "rgba(0,0,0,0.4)",
        zIndex: 200,
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
          maxWidth: "400px",
          overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,0.2)",
          animation: "popIn 0.2s ease",
        }}
      >
        <div
          style={{
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "rgba(229,62,62,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
            }}
          >
            <AlertTriangle size={22} color="#e53e3e" />
          </div>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1A1A1A", marginBottom: "8px" }}>
            Supprimer le commentaire ?
          </h3>
          <p style={{ fontSize: "0.82rem", color: "#666", marginBottom: "16px" }}>
            Cette action est irréversible.
          </p>
          <div style={{ display: "flex", gap: "10px", width: "100%" }}>
            <button
              onClick={onCancel}
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "10px",
                border: "1.5px solid rgba(0,0,0,0.08)",
                background: "#e8eaed",
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
                background: loading ? "rgba(229,62,62,0.4)" : "#e53e3e",
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
      <style>{`@keyframes popIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }`}</style>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  task: Task;
  onClose: () => void;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function TaskDetailModal({ task, onClose }: Props) {
  const { data: session } = useSession();
  const teamId = parseInt((session?.user as { team_id?: string })?.team_id ?? "0");
  const userRole = (session?.user as { role?: string })?.role ?? null;

  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const toastCounterRef = useRef(0); // ✅ Utilisation d'un ref pour générer des IDs uniques sans impureté

  // Charger les commentaires
  useEffect(() => {
    async function load() {
      setLoadingComments(true);
      const res = await getTaskComments(task.id);
      if (res.success && res.comments) setComments(res.comments);
      setLoadingComments(false);
    }
    void load();
  }, [task.id]);

  // Scroll au dernier commentaire
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  function addToast(type: Toast["type"], message: string) {
    // ✅ Utilisation d'un compteur incrémenté au lieu de Date.now()
    toastCounterRef.current += 1;
    const id = toastCounterRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }

  async function handleSubmit() {
    if (!newComment.trim()) return;
    setSubmitting(true);
    const res = await addTaskComment(task.id, newComment);
    setSubmitting(false);
    if (res.success && res.comment) {
      setComments((prev) => [...prev, res.comment!]);
      setNewComment("");
      setResetKey((prev) => prev + 1);
      addToast("success", "Commentaire ajouté");
    } else {
      addToast("error", res.error || "Erreur lors de l'ajout du commentaire");
    }
  }

  async function handleUpdate(commentId: number) {
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

  async function handleDelete(commentId: number) {
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
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 150,
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
            maxWidth: "860px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 24px 60px rgba(0,0,0,0.2)",
            animation: "popIn 0.2s ease",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "20px 24px",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "16px",
              flexShrink: 0,
            }}
          >
            <div style={{ flex: 1 }}>
              <h2
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "#1A1A1A",
                  margin: "0 0 8px 0",
                }}
              >
                {task.title}
              </h2>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
                {task.project_name && (
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: "20px",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      background: "rgba(0,0,0,0.05)",
                      color: "#666",
                    }}
                  >
                    📁 {task.project_name}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                border: "1px solid rgba(0,0,0,0.08)",
                background: "#e8eaed",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#888",
                flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Body — deux colonnes */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              flex: 1,
              overflow: "hidden",
            }}
          >
            {/* ── Colonne gauche : détails ── */}
            <div
              style={{
                padding: "20px 24px",
                borderRight: "1px solid rgba(0,0,0,0.06)",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {/* Description */}
              <div>
                <p
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#aaa",
                    marginBottom: "8px",
                  }}
                >
                  Description
                </p>
                <div
                  style={{
                    fontSize: "0.83rem",
                    color: task.description ? "#1A1A1A" : "#ccc",
                    background: "#e8eaed",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    lineHeight: 1.6,
                  }}
                >
                  {task.description || "Aucune description"}
                </div>
              </div>

              {/* Assignés */}
              {task.assigned_to_names && task.assigned_to_names.length > 0 && (
                <div>
                  <p
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "#aaa",
                      marginBottom: "8px",
                    }}
                  >
                    Assigné à
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {task.assigned_to_names.map((name, i) => (
                      <div
                        key={i}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "4px 10px 4px 4px",
                          borderRadius: "20px",
                          background: "rgba(107,26,42,0.07)",
                          border: "1px solid rgba(107,26,42,0.12)",
                        }}
                      >
                        <Avatar name={name} size={22} />
                        <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#6B1A2A" }}>
                          {name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deadline */}
              {task.due_date && (
                <div>
                  <p
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "#aaa",
                      marginBottom: "8px",
                    }}
                  >
                    Deadline
                  </p>
                  <span
                    style={{
                      fontSize: "0.82rem",
                      color: "#1A1A1A",
                      background: "#e8eaed",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      display: "inline-block",
                    }}
                  >
                    📅 {task.due_date}
                  </span>
                </div>
              )}
            </div>

            {/* ── Colonne droite : commentaires ── */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Liste commentaires */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <p
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#aaa",
                    marginBottom: "4px",
                    flexShrink: 0,
                  }}
                >
                  Commentaires ({comments.length})
                </p>

                {loadingComments ? (
                  <div
                    style={{
                      textAlign: "center",
                      color: "#aaa",
                      fontSize: "0.8rem",
                      padding: "20px",
                    }}
                  >
                    Chargement...
                  </div>
                ) : comments.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      color: "#ccc",
                      fontSize: "0.8rem",
                      padding: "30px 20px",
                      background: "#f1f3f5",
                      borderRadius: "10px",
                      border: "1.5px dashed rgba(0,0,0,0.08)",
                    }}
                  >
                    Aucun commentaire pour l&apos;instant
                  </div>
                ) : (
                  comments.map((c) => {
                    const isMe = c.team_id === teamId;
                    return (
                      <div
                        key={c.id}
                        style={{
                          display: "flex",
                          gap: "10px",
                          alignItems: "flex-start",
                          flexDirection: isMe ? "row-reverse" : "row",
                        }}
                      >
                        <Avatar name={c.author_name} size={30} />
                        <div style={{ flex: 1, maxWidth: "80%" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              marginBottom: "4px",
                              flexDirection: isMe ? "row-reverse" : "row",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                color: isMe ? "#6B1A2A" : "#1A1A1A",
                              }}
                            >
                              {isMe ? "Moi" : c.author_name}
                            </span>
                            <RoleBadge role={c.author_role} />
                            <span style={{ fontSize: "0.65rem", color: "#aaa" }}>
                              {formatDate(c.created_at)}
                            </span>
                          </div>

                          {/* Message bubble avec couleurs distinctes */}
                          <div
                            style={{
                              background: isMe ? "#6B1A2A" : "#e8eaed",
                              borderRadius: isMe ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                              padding: "10px 14px",
                              fontSize: "0.82rem",
                              color: isMe ? "white" : "#1A1A1A",
                              lineHeight: 1.5,
                              position: "relative",
                              boxShadow: isMe
                                ? "0 2px 4px rgba(107,26,42,0.1)"
                                : "0 1px 2px rgba(0,0,0,0.05)",
                            }}
                            dangerouslySetInnerHTML={{ __html: c.content }}
                          />

                          {/* Mode édition inline */}
                          {editingId === c.id && (
                            <div style={{ marginTop: "8px" }}>
                              <div style={{ fontSize: "0.83rem" }} className="rich-editor-comment">
                                <RichTextArea value={editContent} onChange={setEditContent} />
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "6px",
                                  marginTop: "6px",
                                  justifyContent: "flex-end",
                                }}
                              >
                                <button
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditContent("");
                                  }}
                                  style={{
                                    padding: "4px 10px",
                                    borderRadius: "8px",
                                    border: "1px solid rgba(0,0,0,0.08)",
                                    background: "#e8eaed",
                                    color: "#666",
                                    fontSize: "0.75rem",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                    fontFamily: "'DM Sans', sans-serif",
                                  }}
                                >
                                  Annuler
                                </button>
                                <button
                                  onClick={() => handleUpdate(c.id)}
                                  disabled={updatingId === c.id || !editContent.trim()}
                                  style={{
                                    padding: "4px 10px",
                                    borderRadius: "8px",
                                    border: "none",
                                    background:
                                      updatingId === c.id || !editContent.trim()
                                        ? "rgba(107,26,42,0.3)"
                                        : "#6B1A2A",
                                    color: "white",
                                    fontSize: "0.75rem",
                                    fontWeight: 500,
                                    cursor:
                                      updatingId === c.id || !editContent.trim()
                                        ? "not-allowed"
                                        : "pointer",
                                    fontFamily: "'DM Sans', sans-serif",
                                  }}
                                >
                                  {updatingId === c.id ? "Enregistrement..." : "Enregistrer"}
                                </button>
                              </div>
                            </div>
                          )}

                          {(isMe || userRole === "SA") && (
                            <div
                              style={{
                                display: "flex",
                                justifyContent: isMe ? "flex-end" : "flex-start",
                                gap: "8px",
                                marginTop: "4px",
                              }}
                            >
                              {/* Bouton Modifier — seulement l'auteur */}
                              {isMe && (
                                <button
                                  onClick={() => {
                                    setEditingId(c.id);
                                    setEditContent(c.content);
                                  }}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: isMe ? "#6B1A2A" : "#aaa",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "3px",
                                    fontSize: "0.65rem",
                                    padding: "2px 4px",
                                    borderRadius: "4px",
                                    transition: "color 0.15s",
                                  }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.color = isMe ? "#8B2A3A" : "#6B1A2A")
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.color = isMe ? "#6B1A2A" : "#aaa")
                                  }
                                >
                                  <Pencil size={11} /> Modifier
                                </button>
                              )}

                              {/* Bouton Supprimer avec confirmation */}
                              <button
                                onClick={() => setConfirmDeleteId(c.id)}
                                disabled={deletingId === c.id}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: deletingId === c.id ? "not-allowed" : "pointer",
                                  color: isMe ? "#6B1A2A" : "#ccc",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  fontSize: "0.65rem",
                                  padding: "2px 4px",
                                  borderRadius: "4px",
                                  transition: "color 0.15s",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = "#e53e3e")}
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.color = isMe ? "#6B1A2A" : "#ccc")
                                }
                              >
                                <Trash2 size={11} />
                                {deletingId === c.id ? "..." : "Supprimer"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Zone de saisie */}
              <div
                style={{
                  padding: "12px 24px 20px",
                  borderTop: "1px solid rgba(0,0,0,0.06)",
                  flexShrink: 0,
                }}
              >
                <div style={{ fontSize: "0.83rem" }} className="rich-editor-comment">
                  <RichTextArea key={resetKey} value={newComment} onChange={setNewComment} />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !newComment.trim()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 16px",
                      borderRadius: "10px",
                      border: "none",
                      background:
                        submitting || !newComment.trim() ? "rgba(107,26,42,0.3)" : "#6B1A2A",
                      color: "white",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: submitting || !newComment.trim() ? "not-allowed" : "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      transition: "background 0.15s",
                    }}
                  >
                    <Send size={14} />
                    {submitting ? "Envoi..." : "Commenter"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modale de confirmation suppression */}
      {confirmDeleteId !== null && (
        <ConfirmDeleteModal
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
          loading={deletingId === confirmDeleteId}
        />
      )}

      {/* Toasts */}
      {toasts.map((t) => (
        <ToastNotification
          key={t.id}
          toast={t}
          onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
        />
      ))}

      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .rich-editor-comment .ProseMirror {
          min-height: 60px !important;
          padding: 8px 12px !important;
          font-size: 0.82rem !important;
        }
        .rich-editor-comment .flex.flex-wrap.items-center {
          padding: 4px 8px !important;
          gap: 2px !important;
        }
        .rich-editor-comment button {
          padding: 3px 6px !important;
          font-size: 0.75rem !important;
        }
      `}</style>
    </>
  );
}
