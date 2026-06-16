"use client";

import { useState } from "react";
import { Pin, Plus, X } from "lucide-react";
import {
  type ProjectNote,
  createProjectNote,
  updateProjectNote,
  deleteProjectNote,
} from "@/lib/notes-actions";

const BRAND = "#6B1A2A";

type Props = {
  projectId: string;
  notes: ProjectNote[];
  loading: boolean;
  canWrite: boolean;
  onRefresh: () => void;
};

export default function ProjectNotes({ projectId, notes, loading, canWrite, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const sorted = [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    await createProjectNote(projectId, title.trim(), text.trim());
    setSaving(false);
    setTitle("");
    setText("");
    setShowForm(false);
    onRefresh();
  }

  async function handleTogglePin(note: ProjectNote) {
    await updateProjectNote(note.id, projectId, { pinned: !note.pinned });
    onRefresh();
  }

  async function handleDelete(note: ProjectNote) {
    await deleteProjectNote(note.id, projectId);
    onRefresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {canWrite && (
        <div>
          {showForm ? (
            <div
              style={{
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre de la note"
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(0,0,0,0.12)",
                  fontSize: "0.92rem",
                  outline: "none",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              />
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Contenu de la note..."
                rows={4}
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(0,0,0,0.12)",
                  fontSize: "0.92rem",
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              />
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setTitle("");
                    setText("");
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "transparent",
                    color: "#666",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving || !title.trim()}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "none",
                    background: BRAND,
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: saving || !title.trim() ? "default" : "pointer",
                    opacity: saving || !title.trim() ? 0.6 : 1,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {saving ? "Enregistrement..." : "Ajouter la note"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 16px",
                borderRadius: "8px",
                border: `1px solid ${BRAND}`,
                background: "transparent",
                color: BRAND,
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <Plus size={16} />
              Nouvelle note
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
          Chargement des notes...
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#999" }}>
          <p style={{ fontSize: "1rem" }}>Aucune note pour ce projet</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {sorted.map((note) => (
            <div
              key={note.id}
              style={{
                border: "1px solid rgba(0,0,0,0.07)",
                borderRadius: "12px",
                padding: "16px",
                background: note.pinned ? "rgba(107,26,42,0.03)" : "#fff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "10px",
                  marginBottom: "8px",
                }}
              >
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1A1A1A", margin: 0 }}>
                  {note.title}
                </h4>
                {canWrite && (
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                    <button
                      onClick={() => handleTogglePin(note)}
                      title={note.pinned ? "Désépingler" : "Épingler"}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: note.pinned ? BRAND : "#bbb",
                        display: "flex",
                        padding: "2px",
                      }}
                    >
                      <Pin size={15} fill={note.pinned ? BRAND : "none"} />
                    </button>
                    <button
                      onClick={() => handleDelete(note)}
                      title="Supprimer"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#bbb",
                        display: "flex",
                        padding: "2px",
                      }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}
              </div>
              {note.text && (
                <p
                  style={{
                    fontSize: "0.88rem",
                    color: "#555",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    margin: "0 0 8px",
                  }}
                >
                  {note.text}
                </p>
              )}
              <p style={{ fontSize: "0.75rem", color: "#aaa", margin: 0 }}>
                {new Date(note.updated_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
