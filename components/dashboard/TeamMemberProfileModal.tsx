"use client";

import { useEffect, useState } from "react";
import { X, Crown } from "lucide-react";
import type {
  TeamMember,
  EvaluationStats,
  EvaluationComment,
  TeamMemberProfileData,
} from "@/app/api/equipe/[id]/profile/route";

type StatField = "communication" | "collaboration" | "punctuality";

type Props = {
  member: TeamMember;
  onClose: () => void;
};

// Petit Avatar local (ou importe celui de TeamsTable si tu préfères)
function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name
    ?.split(" ")
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

export default function TeamMemberProfileModal({ member, onClose }: Props) {
  const [stats, setStats] = useState<EvaluationStats | null>(null);
  const [comments, setComments] = useState<EvaluationComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chargement des données profil + évaluations
  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/equipe/${member.id}/profile`);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || "Erreur lors du chargement du profil");
        }
        const data: TeamMemberProfileData = await res.json();
        if (!mounted) return;

        setStats(data.stats);
        setComments(data.comments);
      } catch (e: unknown) {
        if (!mounted) return;
        const message =
          e instanceof Error ? e.message : typeof e === "string" ? e : "Erreur inconnue";
        setError(message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [member.id]);

  const totalEvaluations = stats?.totalEvaluations ?? 0;

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
        {/* Header style TaskDetailModal */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
            <Avatar name={member.full_name} size={36} />
            <div>
              <h2
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  color: "#1A1A1A",
                  margin: "0 0 4px 0",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {member.full_name}
                {member.is_boss && <Crown size={14} color="#f59e0b" />}
              </h2>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                {member.role && <RoleBadge role={member.role} />}
                <span style={{ fontSize: "0.75rem", color: "#aaa" }}>
                  Inscrit le{" "}
                  {new Date(member.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
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

        {/* Body : 2 zones, comme ta modal de tâches mais verticales */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 1fr",
            flex: 1,
            overflow: "hidden",
          }}
        >
          {/* Colonne gauche : infos + stats */}
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
            {/* Infos de base */}
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
                Informations
              </p>
              {[
                { label: "E-mail", value: member.email ?? "—" },
                { label: "Téléphone", value: member.phone ?? "—" },
                {
                  label: "Âge",
                  value: member.age ? String(member.age) : "—",
                },
                { label: "Slack ID", value: member.slack_id ?? "—" },
                { label: "Compte", value: member.user_id ? "✓ Actif" : "✗ Aucun" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "6px",
                    gap: "16px",
                  }}
                >
                  <span style={{ fontSize: "0.72rem", color: "#999" }}>{label}</span>
                  <span
                    style={{
                      fontSize: "0.83rem",
                      color: "#1A1A1A",
                      fontWeight: 500,
                    }}
                  >
                    {value || "—"}
                  </span>
                </div>
              ))}
            </div>

            {/* Erreur éventuelle */}
            {error && (
              <div
                style={{
                  marginTop: "4px",
                  padding: "8px 10px",
                  borderRadius: "10px",
                  background: "rgba(229,62,62,0.07)",
                  border: "1px solid rgba(229,62,62,0.2)",
                  fontSize: "0.78rem",
                  color: "#e53e3e",
                }}
              >
                {error}
              </div>
            )}

            {/* Stats d'évaluations */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: "6px",
                }}
              >
                <p
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#aaa",
                    marginBottom: 0,
                  }}
                >
                  Évaluations
                </p>
                <span style={{ fontSize: "0.7rem", color: "#888" }}>
                  {loading
                    ? "Chargement..."
                    : totalEvaluations
                      ? `${totalEvaluations} évaluation(s)`
                      : "Aucune évaluation"}
                </span>
              </div>

              {!loading && stats && totalEvaluations > 0 && (
                <div style={{ display: "grid", gap: "8px" }}>
                  {(
                    [
                      { key: "communication", label: "Communication" },
                      { key: "collaboration", label: "Collaboration" },
                      { key: "punctuality", label: "Ponctualité" },
                    ] as const
                  ).map(({ key, label }) => {
                    const stat = stats[key as StatField];
                    if (!stat) return null;
                    return (
                      <div key={key}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.75rem",
                            marginBottom: "3px",
                          }}
                        >
                          <span style={{ color: "#555" }}>{label}</span>
                          <span style={{ color: "#888" }}>
                            {stat.average.toFixed(1)} / 5 · {stat.percentage}%
                          </span>
                        </div>
                        <div
                          style={{
                            width: "100%",
                            height: "6px",
                            borderRadius: "999px",
                            background: "#F1E7E1",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${stat.percentage}%`,
                              height: "100%",
                              background: "#6B1A2A",
                              borderRadius: "999px",
                              transition: "width 0.25s ease",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!loading && (!stats || totalEvaluations === 0) && !error && (
                <p style={{ fontSize: "0.75rem", color: "#aaa", marginTop: "4px" }}>
                  Aucune évaluation disponible pour ce membre.
                </p>
              )}
            </div>
          </div>

          {/* Colonne droite : commentaires */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
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

              {loading && (
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
              )}

              {!loading && comments.length === 0 && !error && (
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
              )}

              {!loading &&
                comments.length > 0 &&
                comments.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      borderRadius: "10px",
                      border: "1px solid rgba(0,0,0,0.06)",
                      padding: "8px 10px",
                      background: "#F9F6F3",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "4px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "#1A1A1A",
                        }}
                      >
                        {c.evaluator_name}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "#aaa" }}>
                        {new Date(c.report_date).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <p style={{ fontSize: "0.78rem", color: "#555" }}>{c.comment}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <style>{`
          @keyframes popIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    </div>
  );
}
