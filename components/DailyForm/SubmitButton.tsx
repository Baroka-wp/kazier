"use client";

import { useState } from "react";
import { BRAND } from "./questions";

type Props = {
  disabled?: boolean;
  onClick: () => Promise<void>;
};

export default function SubmitButton({ disabled = false, onClick }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading || disabled) return;
    setLoading(true);
    try {
      await onClick();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      style={{
        flex: 1,
        backgroundColor: loading ? `${BRAND}99` : BRAND,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        transition: "all 0.2s",
        cursor: loading || disabled ? "not-allowed" : "pointer",
      }}
      className="py-3 rounded-2xl font-semibold text-white hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
    >
      {loading ? (
        <>
          <span
            style={{
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.35)",
              borderTopColor: "#fff",
              display: "inline-block",
              animation: "spin 0.7s linear infinite",
              flexShrink: 0,
            }}
          />
          <span>Envoi en cours…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      ) : (
        <span>Envoyer mon rapport 🚀</span>
      )}
    </button>
  );
}
