"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Crown,
  Mail,
  Phone,
  User,
  Calendar,
  TrendingUp,
  Hash,
  Briefcase,
  Database,
  Settings,
  Users as UsersIcon,
  Layers,
} from "lucide-react";
import type { TeamMemberProfileData } from "@/app/api/equipe/[id]/profile/route";
import Link from "next/link";

const AVATAR_COLORS = ["#6B1A2A", "#8B2A3A", "#4A1020", "#9B3A4A", "#5A0A1A", "#7C2233", "#3A0D18"];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

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
        background: getAvatarColor(name),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontWeight: 800,
        fontSize: size * 0.36,
        flexShrink: 0,
        border: "3px solid #fff",
      }}
    >
      {initials || "?"}
    </div>
  );
}

function InfoField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div>
      <label
        style={{
          fontSize: "0.7rem",
          fontWeight: 600,
          color: "#888",
          textTransform: "uppercase",
          display: "block",
          marginBottom: "8px",
        }}
      >
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "0",
            background: "rgba(107,26,42,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid rgba(0,0,0,0.05)",
            flexShrink: 0,
          }}
        >
          <Icon size={16} color="#6B1A2A" />
        </div>
        <span
          style={{
            fontSize: "0.9rem",
            fontWeight: 600,
            color: "#1A1A1A",
            wordBreak: "break-word",
          }}
        >
          {value}
        </span>
      </div>
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

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "24px 16px",
          background: "#F5F2ED",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.9rem",
          color: "#666",
        }}
      >
        Chargement du profil...
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "24px 16px",
          background: "#F5F2ED",
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
            borderRadius: 0,
            border: "1px solid rgba(0,0,0,0.1)",
            background: "#fff",
            color: "#666",
            fontSize: "0.85rem",
            fontWeight: 600,
            padding: "10px 14px",
            cursor: "pointer",
            width: "fit-content",
          }}
        >
          <ArrowLeft size={16} /> Retour
        </button>
        <p style={{ color: "#b91c1c", fontSize: "0.9rem" }}>{error ?? "Profil introuvable"}</p>
      </div>
    );
  }

  const { member, stats, projects } = data;
  const total = stats.totalEvaluations || 0;
  const avgGlobal =
    total > 0
      ? (stats.communication.average + stats.collaboration.average + stats.punctuality.average) / 3
      : 0;

  // Icon mapping for projects
  function getProjectIcon(iconName: string | null) {
    switch (iconName) {
      case "database":
        return Database;
      case "settings":
        return Settings;
      case "users":
        return UsersIcon;
      case "layers":
        return Layers;
      case "briefcase":
        return Briefcase;
      default:
        return Briefcase;
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5F2ED",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          padding: "16px 24px",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <button
            onClick={() => router.back()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: "0.85rem",
              color: "#666",
              fontWeight: 600,
              padding: 0,
            }}
          >
            <ArrowLeft size={16} /> Retour à l&apos;équipe
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "16px" }}>
        {/* Profile Header Card */}
        <div
          style={{
            background: "#fff",
            borderRadius: "0",
            padding: "24px",
            border: "1px solid rgba(0,0,0,0.1)",
            marginBottom: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
            <Avatar name={member.full_name} size={100} />
            <div style={{ flex: 1 }}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}
              >
                <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "#1A1A1A", margin: 0 }}>
                  {member.full_name}
                </h1>
                {member.is_boss && <Crown size={20} color="#6B1A2A" />}
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "5px 12px",
                  borderRadius: "0",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  background:
                    member.role === "SA"
                      ? "rgba(107,26,42,0.1)"
                      : member.role === "TM"
                        ? "rgba(59,130,246,0.1)"
                        : "rgba(16,185,129,0.1)",
                  color:
                    member.role === "SA" ? "#6B1A2A" : member.role === "TM" ? "#3b82f6" : "#10b981",
                  border: "1px solid rgba(0,0,0,0.05)",
                }}
              >
                {member.role === "SA"
                  ? "Super Admin"
                  : member.role === "TM"
                    ? "Team Manager"
                    : "Team"}
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: "10px",
          }}
        >
          {/* Info Card - Spans 7 columns */}
          <div
            style={{
              gridColumn: "span 7",
              background: "#fff",
              borderRadius: "0",
              padding: "20px",
              border: "1px solid rgba(0,0,0,0.1)",
            }}
          >
            <h2
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#888",
                textTransform: "uppercase",
                marginBottom: "20px",
              }}
            >
              Informations
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "20px",
              }}
            >
              <InfoField icon={Mail} label="Email" value={member.email ?? "—"} />
              <InfoField icon={Phone} label="Téléphone" value={member.phone ?? "—"} />
              <InfoField icon={User} label="Âge" value={member.age ? `${member.age} ans` : "—"} />
              <InfoField icon={Hash} label="Slack ID" value={member.slack_id ?? "—"} />
              <InfoField
                icon={Calendar}
                label="Membre depuis"
                value={new Date(member.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              />
            </div>
          </div>

          {/* Performance Card - Spans 5 columns */}
          <div
            style={{
              gridColumn: "span 5",
              background: "#fff",
              borderRadius: "0",
              padding: "20px",
              border: "1px solid rgba(0,0,0,0.1)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "0",
                  background: "rgba(107,26,42,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(0,0,0,0.05)",
                }}
              >
                <TrendingUp size={16} color="#6B1A2A" />
              </div>
              <h2
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#888",
                  textTransform: "uppercase",
                  margin: 0,
                }}
              >
                Performance
              </h2>
            </div>

            {/* Score Global */}
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <div style={{ fontSize: "3rem", fontWeight: 800, color: "#6B1A2A", lineHeight: 1 }}>
                {avgGlobal.toFixed(1)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#888", marginTop: "4px" }}>sur 5.0</div>
              <div style={{ fontSize: "0.7rem", color: "#aaa", marginTop: "8px" }}>
                {total} évaluation{total > 1 ? "s" : ""}
              </div>
            </div>

            {/* Stats Bars */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
                        marginBottom: 6,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ color: "#666" }}>{label}</span>
                      <span style={{ color: "#1A1A1A" }}>{stat.percentage}%</span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 0,
                        background: "#f3f4f6",
                        overflow: "hidden",
                        border: "1px solid rgba(0,0,0,0.05)",
                      }}
                    >
                      <div
                        style={{
                          width: `${stat.percentage}%`,
                          height: "100%",
                          background: "#6B1A2A",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Projects Card - Spans 12 columns (full width) */}
          <div
            style={{
              gridColumn: "span 12",
              background: "#fff",
              borderRadius: "0",
              padding: "20px",
              border: "1px solid rgba(0,0,0,0.1)",
            }}
          >
            <h2
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#888",
                textTransform: "uppercase",
                marginBottom: "20px",
              }}
            >
              Projets ({projects.length})
            </h2>
            {projects.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px 0",
                  color: "#999",
                  fontSize: "0.85rem",
                }}
              >
                Aucun projet assigné
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "10px",
                }}
              >
                {projects.map((project) => {
                  const Icon = getProjectIcon(project.icon);
                  return (
                    <Link
                      key={project.id}
                      href={`/dashboard/projects/${project.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px",
                        border: "1px solid rgba(0,0,0,0.1)",
                        background: "#fff",
                        textDecoration: "none",
                        color: "inherit",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "rgba(107,26,42,0.3)";
                        e.currentTarget.style.background = "#fafafa";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "rgba(0,0,0,0.1)";
                        e.currentTarget.style.background = "#fff";
                      }}
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "0",
                          background: "rgba(107,26,42,0.08)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid rgba(0,0,0,0.05)",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={18} color="#6B1A2A" />
                      </div>
                      <span
                        style={{
                          fontSize: "0.9rem",
                          fontWeight: 600,
                          color: "#1A1A1A",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {project.name}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
