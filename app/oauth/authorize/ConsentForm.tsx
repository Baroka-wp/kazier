"use client";

import { useState } from "react";

type Props = {
  clientId: string;
  clientName: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state: string;
  scope: string;
  userName: string;
};

export default function ConsentForm(props: Props) {
  const [submitting, setSubmitting] = useState<"allow" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(decision: "allow" | "deny") {
    setSubmitting(decision);
    setError(null);
    try {
      const res = await fetch("/oauth/authorize/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...props, decision }),
      });
      const data: { redirectTo?: string; error?: string } = await res.json();
      if (data.redirectTo) {
        window.location.href = data.redirectTo;
      } else if (data.error) {
        setError(data.error);
        setSubmitting(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
      setSubmitting(null);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f5f2",
        fontFamily: "system-ui, -apple-system, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          background: "white",
          borderRadius: 16,
          padding: 40,
          boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 12,
            letterSpacing: "0.08em",
            color: "#888",
            textTransform: "uppercase",
          }}
        >
          Kazier — Connexion externe
        </p>
        <h1 style={{ margin: "12px 0 24px", fontSize: 24, color: "#1A1A1A" }}>
          Autoriser <span style={{ color: "#6B1A2A" }}>{props.clientName}</span> ?
        </h1>

        <p style={{ fontSize: 15, lineHeight: 1.6, color: "#444" }}>
          <strong>{props.clientName}</strong> souhaite accéder à Kazier en votre nom (
          <strong>{props.userName}</strong>).
        </p>

        <p style={{ fontSize: 14, color: "#666", marginTop: 20 }}>
          Cette application pourra lire et modifier vos projets, tâches et rapports avec
          les mêmes droits que vous. Vous pouvez révoquer l&apos;accès à tout moment depuis
          le tableau de bord.
        </p>

        <div
          style={{
            background: "#fafafa",
            borderRadius: 10,
            padding: 14,
            margin: "24px 0",
            fontSize: 13,
            color: "#666",
            wordBreak: "break-all",
          }}
        >
          Redirection vers : <code>{props.redirectUri}</code>
        </div>

        {error && (
          <div
            style={{
              background: "#fee",
              border: "1px solid #fcc",
              padding: 12,
              borderRadius: 8,
              color: "#a0263a",
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button
            onClick={() => submit("deny")}
            disabled={submitting !== null}
            style={{
              flex: 1,
              padding: "12px 20px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "white",
              cursor: submitting !== null ? "not-allowed" : "pointer",
              fontSize: 15,
              color: "#666",
            }}
          >
            {submitting === "deny" ? "..." : "Refuser"}
          </button>
          <button
            onClick={() => submit("allow")}
            disabled={submitting !== null}
            style={{
              flex: 1,
              padding: "12px 20px",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg,#6B1A2A,#A0263A)",
              color: "white",
              cursor: submitting !== null ? "not-allowed" : "pointer",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {submitting === "allow" ? "..." : "Autoriser"}
          </button>
        </div>
      </div>
    </div>
  );
}
