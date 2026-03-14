"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Lock } from "lucide-react";

type Props = {
  id: number;
  title: string;
  description: string;
  status: "à faire" | "en cours" | "review" | "terminée";
  priority: "low" | "medium" | "high";
  assigned_to_names?: string[];
  due_date?: string | null;
  isAssignedToMe: boolean;
  isFree: boolean;
  onAssign: () => void;
  onUnassign: () => void;
  loading: boolean;
};

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    low: "#22c55e",
    medium: "#fbbf24",
    high: "#ef4444",
  };
  return (
    <div
      style={{
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        background: colors[priority] || "#fbbf24",
        flexShrink: 0,
      }}
    />
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    "à faire":  { bg: "rgba(209, 213, 219, 0.1)", color: "#6B7280", label: "À faire"  },
    "en cours": { bg: "rgba(59, 130, 246, 0.1)",  color: "#3b82f6", label: "En cours" },
    "review":   { bg: "rgba(168, 85, 247, 0.1)",  color: "#a855f7", label: "Review"   },
    "terminée": { bg: "rgba(16, 185, 129, 0.1)",  color: "#10b981", label: "Terminée" },
  };
  const s = map[status] ?? map["à faire"];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "0.6rem",
        fontWeight: 600,
        background: s.bg,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

export default function TaskItemTeam({
  id,
  title,
  description,
  status,
  priority,
  assigned_to_names,
  due_date,
  isAssignedToMe,
  isFree,
  onAssign,
  onUnassign,
  loading,
}: Props) {
  const [hovered, setHovered] = useState(false);

  const isDisabled = !isFree && !isAssignedToMe;

  return (
    <div
      onMouseEnter={() => !isDisabled && setHovered(true)}
      onMouseLeave={() => !isDisabled && setHovered(false)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "12px",
        borderRadius: "10px",
        border: "1px solid rgba(0,0,0,0.06)",
        background: isDisabled ? "#fafafa" : "#fff",
        transition: "all 0.15s",
        opacity: isDisabled ? 0.6 : 1,
        cursor: isDisabled ? "not-allowed" : "pointer",
      }}
    >
      {/* Checkbox */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (!loading && !isDisabled) {
            if (isAssignedToMe) {
              onUnassign();
            } else if (isFree) {
              onAssign();
            }
          }
        }}
        onMouseEnter={(e) => {
          if (!isDisabled && !isAssignedToMe) {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(107,26,42,0.3)";
            (e.currentTarget as HTMLElement).style.background = "rgba(107,26,42,0.05)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isDisabled && !isAssignedToMe) {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.15)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "24px",
          height: "24px",
          borderRadius: "6px",
          border: isDisabled ? "1.5px solid rgba(0,0,0,0.1)" : "1.5px solid rgba(0,0,0,0.15)",
          background: isAssignedToMe ? "#6B1A2A" : "transparent",
          cursor: isDisabled ? "not-allowed" : "pointer",
          flexShrink: 0,
          transition: "all 0.15s",
        }}
      >
        {isAssignedToMe ? (
          <CheckCircle2 size={16} color="#fff" />
        ) : isFree ? (
          <Circle size={16} color="rgba(0,0,0,0.2)" />
        ) : (
          <Lock size={14} color="rgba(0,0,0,0.3)" />
        )}
      </div>

      {/* Contenu */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Titre + Priority */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <PriorityDot priority={priority} />
          <span
            style={{
              fontSize: "0.82rem",
              fontWeight: 500,
              color: "#1A1A1A",
              flex: 1,
              wordBreak: "break-word",
            }}
          >
            {title}
          </span>
        </div>

        {/* Description */}
        {description && (
          <p
            style={{
              fontSize: "0.75rem",
              color: "#666",
              margin: "4px 0",
              lineHeight: 1.4,
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {description}
          </p>
        )}

        {/* Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
          <StatusBadge status={status} />

          {isDisabled && assigned_to_names && assigned_to_names.length > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "0.6rem",
                fontWeight: 500,
                background: "rgba(107,26,42,0.08)",
                color: "#6B1A2A",
              }}
            >
              👤 {assigned_to_names.join(", ")}
            </span>
          )}

          {due_date && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "0.6rem",
                color: "#666",
              }}
            >
              📅 {new Date(due_date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>
      </div>

      {/* Bouton Assign */}
      {(isFree || isAssignedToMe) && hovered && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!loading) {
              if (isAssignedToMe) {
                onUnassign();
              } else {
                onAssign();
              }
            }
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              (e.currentTarget as HTMLElement).style.background = isAssignedToMe
                ? "rgba(239,68,68,0.2)"
                : "rgba(107,26,42,0.15)";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = isAssignedToMe
              ? "rgba(239,68,68,0.1)"
              : "rgba(107,26,42,0.1)";
          }}
          disabled={loading}
          style={{
            padding: "6px 12px",
            borderRadius: "8px",
            border: "none",
            background: isAssignedToMe ? "rgba(239,68,68,0.1)" : "rgba(107,26,42,0.1)",
            color: isAssignedToMe ? "#ef4444" : "#6B1A2A",
            fontSize: "0.7rem",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.15s",
            whiteSpace: "nowrap",
            flexShrink: 0,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "..." : isAssignedToMe ? "Se retirer" : "S'assigner"}
        </button>
      )}
    </div>
  );
}
