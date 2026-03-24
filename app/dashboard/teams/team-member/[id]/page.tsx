"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Crown } from "lucide-react";
import type { TeamMemberProfileData } from "@/app/api/equipe/[id]/profile/route";

// Helpers
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

  if (loading) {
    return <div style={{ padding: 32 }}>Chargement du profil...</div>;
  }

  if (error || !data) {
    return (
      <div style={{ padding: 32 }}>
        <button
          onClick={() => router.back()}
          style={{
            marginBottom: 12,
            border: "none",
            background: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            color: "#6B1A2A",
            fontSize: "0.8rem",
          }}
        >
          <ArrowLeft size={16} /> Retour
        </button>
        <p style={{ color: "#b91c1c" }}>{error ?? "Profil introuvable"}</p>
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
        padding: "24px 32px 40px",
        background: "#F7F2EB",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
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
        }}
      >
        <ArrowLeft size={16} /> Retour à l&apos;équipe
      </button>

      {/* Carte informations compte */}
      <div
        style={{
          background: "#FFFDF9",
          borderRadius: "24px",
          padding: "26px 30px",
          display: "flex",
          gap: "32px",
          alignItems: "center",
          boxShadow: "0 18px 40px rgba(0,0,0,0.08)",
        }}
      >
        {/* Avatar + nom */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            minWidth: 180,
          }}
        >
          <Avatar name={member.full_name} size={110} />
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "1.15rem",
                fontWeight: 800,
                color: "#1E1A19",
              }}
            >
              {member.full_name}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#7A6A64", marginTop: 2 }}>
              {member.role === "SA"
                ? "Super Admin"
                : member.role === "TM"
                  ? "Team Manager"
                  : "Team"}
              {member.is_boss && (
                <span style={{ marginLeft: 6, verticalAlign: "middle" }}>
                  <Crown size={13} color="#f59e0b" />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Infos texte en colonnes */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            rowGap: 16,
            columnGap: 36,
          }}
        >
          <Field label="Email address" value={member.email ?? "—"} />
          <Field label="Phone number" value={member.phone ?? "—"} />
          <Field label="Slack identity" value={member.slack_id ? `@${member.slack_id}` : "—"} />
          <Field
            label="Registration date"
            value={new Date(member.created_at).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          />
          <Field label="Age" value={member.age ? String(member.age) : "—"} />
          <Field label="Account status" value={member.user_id ? "● Actif" : "○ Aucun compte"} />
        </div>
      </div>

      {/* Carte performances */}
      <div
        style={{
          background: "#FFFDF9",
          borderRadius: "24px",
          padding: "26px 30px",
          boxShadow: "0 18px 40px rgba(0,0,0,0.08)",
          display: "grid",
          gridTemplateColumns: "260px 1fr",
          gap: "32px",
          alignItems: "stretch",
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
          }}
        >
          <div style={{ width: 170, height: 170, position: "relative" }}>
            <svg
              viewBox="0 0 170 170"
              style={{
                width: "100%",
                height: "100%",
                display: "block", // ✅ Empêche les marges SVG
              }}
            >
              {/* Fond gris */}
              <circle
                cx="85"
                cy="85"
                r="70"
                fill="none"
                stroke="#F1E7E1"
                strokeWidth="12"
                strokeLinecap="round"
              />
              {/* Anneau rouge proportionnel */}
              <circle
                cx="85"
                cy="85"
                r="70"
                fill="none"
                stroke="#6B1A2A"
                strokeWidth="12"
                strokeLinecap="round"
                pathLength="1" // ✅ Normalise la longueur (0 à 1)
                strokeDasharray="1 1" // ✅ Plus simple que calculer PI
                strokeDashoffset={1 - avgGlobal / 5} // ✅ 0=plein, 1=vide
                transform="rotate(-90 85 85)"
                style={{ transition: "stroke-dashoffset 1s ease" }}
              />
            </svg>

            {/* Score au CENTRE */}
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
                pointerEvents: "none", // ✅ Permet les clics à travers
              }}
            >
              <span style={{ fontSize: "2.6rem", fontWeight: 800, color: "#1A1A1A" }}>
                {avgGlobal.toFixed(1)}
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  letterSpacing: "0.08em",
                  color: "#888",
                  textTransform: "uppercase",
                  marginTop: "4px",
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
                fontSize: "1.15rem",
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
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 18,
          }}
        >
          {(
            [
              { key: "communication", label: "Communication" },
              { key: "collaboration", label: "Collaboration" },
              { key: "punctuality", label: "Punctualité" },
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
                    marginBottom: 4,
                    fontSize: "0.8rem",
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
                    height: 6,
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
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
