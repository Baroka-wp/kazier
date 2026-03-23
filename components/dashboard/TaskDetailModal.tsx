"use client";

import { useState, useEffect, useRef } from "react";
import { X, Trash2, Send, Pencil } from "lucide-react";
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
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

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

  async function handleSubmit() {
    if (!newComment.trim()) return;
    setSubmitting(true);
    const res = await addTaskComment(task.id, newComment);
    setSubmitting(false);
    if (res.success && res.comment) {
      setComments((prev) => [...prev, res.comment!]);
      setNewComment("");
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
    }
  }

  async function handleDelete(commentId: number) {
    setDeletingId(commentId);
    const res = await deleteTaskComment(commentId);
    setDeletingId(null);
    if (res.success) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  }

  return (
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
              background: "#F5F2ED",
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
                  background: "#F5F2ED",
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
                    background: "#F5F2ED",
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
                    background: "#fafafa",
                    borderRadius: "10px",
                    border: "1.5px dashed rgba(0,0,0,0.08)",
                  }}
                >
                  Aucun commentaire pour l&apos;instant
                </div>
              ) : (
                comments.map((c) => {
                  const isMe = c.team_id === teamId;
                  const canDelete = isMe || userRole === "SA";
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
                              color: "#1A1A1A",
                            }}
                          >
                            {isMe ? "Moi" : c.author_name}
                          </span>
                          <RoleBadge role={c.author_role} />
                          <span style={{ fontSize: "0.65rem", color: "#aaa" }}>
                            {formatDate(c.created_at)}
                          </span>
                        </div>
                        <div
                          style={{
                            background: isMe ? "rgba(107,26,42,0.08)" : "#F5F2ED",
                            borderRadius: isMe ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
                            padding: "8px 12px",
                            fontSize: "0.82rem",
                            color: "#1A1A1A",
                            lineHeight: 1.5,
                            position: "relative",
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
                                  background: "#F5F2ED",
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
                                  color: "#aaa",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  fontSize: "0.65rem",
                                  padding: "2px 4px",
                                  borderRadius: "4px",
                                  transition: "color 0.15s",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = "#6B1A2A")}
                                onMouseLeave={(e) => (e.currentTarget.style.color = "#aaa")}
                              >
                                <Pencil size={11} /> Modifier
                              </button>
                            )}

                            {/* Bouton Supprimer */}
                            <button
                              onClick={() => handleDelete(c.id)}
                              disabled={deletingId === c.id}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: deletingId === c.id ? "not-allowed" : "pointer",
                                color: "#ccc",
                                display: "flex",
                                alignItems: "center",
                                gap: "3px",
                                fontSize: "0.65rem",
                                padding: "2px 4px",
                                borderRadius: "4px",
                                transition: "color 0.15s",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "#e53e3e")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "#ccc")}
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
                <RichTextArea value={newComment} onChange={setNewComment} />
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
    </div>
  );
}
