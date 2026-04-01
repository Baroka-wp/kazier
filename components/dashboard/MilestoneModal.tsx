"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Milestone } from "@/lib/milestone-actions";

type Props = {
  mode: "create" | "update";
  milestone?: Milestone | null;
  projectId: number;
  onClose: () => void;
  onSaved: () => void;
};

export default function MilestoneModal({ mode, milestone, projectId, onClose, onSaved }: Props) {
  const [values, setValues] = useState({
    title: milestone?.title || "",
    due_date: milestone?.due_date ? new Date(milestone.due_date).toISOString().split("T")[0] : "",
    deliverables: milestone?.deliverables || "",
  });
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  function setField(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setServerError("");
  }

  async function handleSubmit() {
    if (!values.title.trim()) {
      setServerError("Le titre est requis.");
      return;
    }
    if (!values.due_date) {
      setServerError("La date est requise.");
      return;
    }

    setSaving(true);
    setServerError("");

    const { createMilestone, updateMilestone } = await import("@/lib/milestone-actions");

    const result =
      mode === "create"
        ? await createMilestone({
            project_id: projectId,
            title: values.title,
            due_date: values.due_date,
            deliverables: values.deliverables || null,
          })
        : milestone
          ? await updateMilestone(milestone.id, {
              title: values.title,
              due_date: values.due_date,
              deliverables: values.deliverables || null,
            })
          : null;

    setSaving(false);

    if (result?.success) {
      onSaved();
      onClose();
    } else {
      setServerError(result?.error || "Erreur lors de l'enregistrement.");
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 150,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "0px",
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto",
          border: "1px solid rgba(0,0,0,0.08)",
          animation: "popIn 0.2s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 20px",
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
                fontSize: "0.65rem",
                fontWeight: 600,
                textTransform: "uppercase" as const,
                letterSpacing: "0.1em",
                color: "#aaa",
                marginBottom: 2,
              }}
            >
              {mode === "create" ? "Nouveau jalon" : "Modifier le jalon"}
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1A1A1A" }}>
              {mode === "create" ? "Ajouter un jalon" : "Modifier le jalon"}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "8px",
              border: "1px solid rgba(0,0,0,0.08)",
              background: "#e8eaed",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#888",
              transition: "all 0.15s",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "20px" }}>
          {serverError && (
            <div
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                borderRadius: "0px",
                background: "rgba(229,62,62,0.07)",
                border: "1px solid rgba(229,62,62,0.2)",
                fontSize: "0.8rem",
                color: "#e53e3e",
              }}
            >
              {serverError}
            </div>
          )}

          {/* Title */}
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#666",
                marginBottom: 6,
              }}
            >
              Titre du jalon *
            </label>
            <input
              type="text"
              value={values.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="Ex: Livraison version beta"
              autoFocus
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "0px",
                border: "1.5px solid rgba(0,0,0,0.08)",
                background: "#e8eaed",
                fontSize: "0.9rem",
                fontFamily: "'DM Sans', sans-serif",
                color: "#1A1A1A",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Due Date */}
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#666",
                marginBottom: 6,
              }}
            >
              Date du jalon *
            </label>
            <input
              type="date"
              value={values.due_date}
              onChange={(e) => setField("due_date", e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "0px",
                border: "1.5px solid rgba(0,0,0,0.08)",
                background: "#e8eaed",
                fontSize: "0.9rem",
                fontFamily: "'DM Sans', sans-serif",
                color: "#1A1A1A",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Deliverables */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#666",
                marginBottom: 6,
              }}
            >
              Livrables
            </label>
            <textarea
              value={values.deliverables}
              onChange={(e) => setField("deliverables", e.target.value)}
              placeholder="Décrivez les livrables attendus..."
              rows={4}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "0px",
                border: "1.5px solid rgba(0,0,0,0.08)",
                background: "#e8eaed",
                fontSize: "0.9rem",
                fontFamily: "'DM Sans', sans-serif",
                color: "#1A1A1A",
                outline: "none",
                resize: "vertical" as const,
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              disabled={saving}
              style={{
                flex: 1,
                padding: "11px",
                borderRadius: "0px",
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
              onClick={handleSubmit}
              disabled={saving}
              style={{
                flex: 1,
                padding: "11px",
                borderRadius: "0px",
                border: "none",
                background: saving ? "rgba(107,26,42,0.5)" : "#6B1A2A",
                color: "white",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Enregistrement..." : mode === "create" ? "Ajouter" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes popIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}
