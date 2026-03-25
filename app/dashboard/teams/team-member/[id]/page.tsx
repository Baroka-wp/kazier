"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Crown } from "lucide-react";
import type { TeamMemberProfileData } from "@/app/api/equipe/[id]/profile/route";

function Avatar({ name, size = 80 }: { name: string; size?: number }) {
  const initials = name
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#6B1A2A",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontWeight: 800,
        fontSize: size * 0.36,
        flexShrink: 0,
      }}
    >
      {initials || "?"}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span
        style={{
          fontSize: "0.6rem",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "#A09A92",
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "0.9rem",
          fontWeight: 600,
          color: "#1E1A19",
          wordBreak: "break-word",
        }}
      >
        {value}
      </span>
    </div>
  );
}

type StatField = "communication" | "collaboration" | "punctuality";

export default function TeamProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const memberId = Number(params.id);

  const [data, setData] = useState<TeamMemberProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memberId || Number.isNaN(memberId)) {
      setError("Identifiant invalide");
      setLoading(false);
      return;
    }

    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/equipe/${memberId}/profile`);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || "Erreur lors du chargement du profil");
        }
        const profile: TeamMemberProfileData = await res.json();
        if (!mounted) return;
        setData(profile);
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
  }, [memberId]);

  // Écran chargement simple
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "24px 16px",
          background: "#F7F2EB",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.9rem",
        }}
      >
        Chargement du profil...
      </div>
    );
  }

  // Écran erreur
  if (error || !data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "24px 16px",
          background: "#F7F2EB",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 8,
            border: "1px solid rgba(107,26,42,0.2)",
            background: "rgba(107,26,42,0.05)",
            color: "#6B1A2A",
            fontSize: "0.8rem",
            fontWeight: 600,
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={16} /> Retour à l&apos;équipe
        </button>
        <p style={{ color: "#b91c1c", fontSize: "0.9rem" }}>{error ?? "Profil introuvable"}</p>
      </div>
    );
  }

  const { member, stats } = data;
  const total = stats.totalEvaluations || 0;
  const avgGlobal =
    total > 0
      ? (stats.communication.average + stats.collaboration.average + stats.punctuality.average) / 3
      : 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "16px 16px 32px",
        background: "#F7F2EB",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        boxSizing: "border-box",
      }}
    >
      {/* Bouton retour */}
      <button
        onClick={() => router.back()}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          border: "none",
          background: "none",
          cursor: "pointer",
          fontSize: "0.8rem",
          color: "#6B1A2A",
          width: "fit-content",
        }}
      >
        <ArrowLeft size={16} /> Retour à l&apos;équipe
      </button>

      {/* Carte informations compte */}
      <div
        className="info-card"
        style={{
          background: "#FFFDF9",
          borderRadius: "24px",
          padding: "24px",
          display: "flex",
          flexDirection: "row", // Horizontal par défaut (desktop)
          gap: "32px",
          alignItems: "flex-start",
          boxShadow: "0 18px 40px rgba(0,0,0,0.08)",
          flexWrap: "wrap",
        }}
      >
        {/* Avatar + nom */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <Avatar name={member.full_name} size={100} />
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                color: "#1E1A19",
              }}
            >
              {member.full_name}
            </div>
            <div style={{ fontSize: "0.85rem", color: "#7A6A64", marginTop: 4 }}>
              {member.role === "SA"
                ? "Super Admin"
                : member.role === "TM"
                  ? "Team Manager"
                  : "Team"}
              {member.is_boss && (
                <span style={{ marginLeft: 6, verticalAlign: "middle" }}>
                  <Crown size={14} color="#f59e0b" />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Infos texte en grille */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "20px 32px",
          }}
        >
          <Field label="Email" value={member.email ?? "—"} />
          <Field label="Téléphone" value={member.phone ?? "—"} />
          <Field label="Slack identifiant" value={member.slack_id ? `@${member.slack_id}` : "—"} />
          <Field
            label="Date d'inscription"
            value={new Date(member.created_at).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          />
          <Field label="Âge" value={member.age ? String(member.age) : "—"} />
          <Field label="Statut du compte" value={member.user_id ? "● Actif" : "○ Aucun compte"} />
        </div>
      </div>

      {/* Carte performances */}
      <div
        className="performance-card"
        style={{
          background: "#FFFDF9",
          borderRadius: "24px",
          padding: "32px 28px",
          boxShadow: "0 18px 40px rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "row", // Horizontal par défaut (desktop)
          gap: "48px",
          alignItems: "center",
        }}
      >
        {/* Colonne gauche : score global */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 16,
            flexShrink: 0,
          }}
        >
          <div style={{ width: 170, height: 170, position: "relative" }}>
            <svg
              viewBox="0 0 170 170"
              style={{
                width: "100%",
                height: "100%",
                display: "block",
              }}
            >
              <circle
                cx="85"
                cy="85"
                r="70"
                fill="none"
                stroke="#F1E7E1"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <circle
                cx="85"
                cy="85"
                r="70"
                fill="none"
                stroke="#6B1A2A"
                strokeWidth="12"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="1 1"
                strokeDashoffset={1 - avgGlobal / 5}
                transform="rotate(-90 85 85)"
                style={{ transition: "stroke-dashoffset 0.4s ease" }}
              />
            </svg>

            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                pointerEvents: "none",
              }}
            >
              <span style={{ fontSize: "2.4rem", fontWeight: 800, color: "#1A1A1A" }}>
                {avgGlobal.toFixed(1)}
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  letterSpacing: "0.08em",
                  color: "#888",
                  textTransform: "uppercase",
                  marginTop: 4,
                }}
              >
                Sur 5.0
              </span>
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#AAA39D",
                marginBottom: 4,
              }}
            >
              Performance
            </p>
            <p
              style={{
                fontSize: "1.1rem",
                fontWeight: 800,
                color: "#3A121B",
                marginBottom: 4,
              }}
            >
              Moyennes
            </p>
            <p style={{ fontSize: "0.8rem", color: "#8C7A73" }}>
              Basé sur {total} évaluation{total > 1 ? "s" : ""}.
            </p>
          </div>
        </div>

        {/* Colonne droite : barres */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 20,
          }}
        >
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
                    marginBottom: 8,
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "#7C6A65",
                    }}
                  >
                    {label}
                  </span>
                  <span style={{ color: "#3A121B" }}>{stat.percentage}%</span>
                </div>
                <div
                  style={{
                    height: 8,
                    borderRadius: 999,
                    background: "#EEE4DD",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${stat.percentage}%`,
                      height: "100%",
                      background: "#6B1A2A",
                      borderRadius: 999,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Styles responsifs */}
      <style jsx>{`
        @media (max-width: 768px) {
          .info-card {
            flex-direction: column !important;
            align-items: center !important;
            gap: 24px !important;
          }

          .performance-card {
            flex-direction: column !important;
            gap: 32px !important;
            align-items: stretch !important;
          }
        }
      `}</style>
    </div>
  );
}
