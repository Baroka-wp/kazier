"use client";

import { Lock, AlertTriangle } from "lucide-react";

export default function ReviewConfirmModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
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
          borderRadius: "16px",
          padding: "24px",
          width: "100%",
          maxWidth: "380px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.15)",
          animation: "popIn 0.2s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "rgba(139,92,246,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertTriangle size={22} color="#8b5cf6" />
          </div>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1A1A1A", margin: 0 }}>
            Passer en Review ?
          </h3>
          <p style={{ fontSize: "0.82rem", color: "#666", lineHeight: 1.6, margin: 0 }}>
            Une fois la tâche en <strong style={{ color: "#8b5cf6" }}>Review</strong>, vous ne
            pourrez plus modifier son statut. Elle sera en attente de validation par votre équipe.
          </p>
          <div
            style={{
              background: "rgba(139,92,246,0.06)",
              borderRadius: "10px",
              padding: "10px 14px",
              fontSize: "0.78rem",
              color: "#8b5cf6",
              fontWeight: 500,
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              justifyContent: "center",
            }}
          >
            <Lock size={13} color="#8b5cf6" />
            Le statut sera verrouillé jusqu&apos;à validation
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button
            onClick={onCancel}
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
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "10px",
              border: "none",
              background: "#8b5cf6",
              color: "white",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Confirmer
          </button>
        </div>
      </div>
      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
