"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { assignTaskToSelf } from "@/lib/team-actions";
import { type Task } from "@/lib/task-actions";

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  task: Task;
  index: number;
  isAssignedToMe: boolean;
  isFree: boolean;
  teamMemberId: number;
  onTaskUpdated: (updated: Task) => void;
  onCardClick?: (task: Task) => void;
  isDragging?: boolean;
  readOnly?: boolean;
  isTM?: boolean;
};

// ── Priority badge ────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  low: {
    label: "BASSE PRIORITÉ",
    color: "#16a34a",
    bg: "rgba(22,163,74,0.09)",
    border: "rgba(22,163,74,0.20)",
  },
  medium: {
    label: "PRIORITÉ MOYENNE",
    color: "#92400e",
    bg: "rgba(180,83,9,0.09)",
    border: "rgba(180,83,9,0.22)",
  },
  high: {
    label: "HAUTE PRIORITÉ",
    color: "#6B1A2A",
    bg: "rgba(107,26,42,0.09)",
    border: "rgba(107,26,42,0.22)",
  },
};

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 9px",
        borderRadius: "6px",
        fontSize: "0.58rem",
        fontWeight: 700,
        letterSpacing: "0.05em",
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        textTransform: "uppercase",
      }}
    >
      {cfg.label}
    </span>
  );
}

// ── Date formatter ────────────────────────────────────────────────────────────

function formatDate(dateString: string | null): string | null {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  } catch {
    return null;
  }
}

// ── Timer badge ───────────────────────────────────────────────────────────────

function useCountdown(dueDate: string | null) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!dueDate) return;
    const target = new Date(dueDate).getTime();
    if (isNaN(target)) return;
    const tick = () => setTimeLeft(target - Date.now());
    tick();
    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, [dueDate]);
  return timeLeft;
}

function TimerBadge({ dueDate, status }: { dueDate: string | null; status: string }) {
  const ms = useCountdown(dueDate);

  if (!dueDate || ms === null || status === "terminée") return null;

  const isExpired = ms <= 0;
  const isCritical = ms <= 24 * 60 * 60 * 1000;
  const isWarning = ms <= 3 * 24 * 60 * 60 * 1000;
  const isNear = ms <= 7 * 24 * 60 * 60 * 1000;

  const color = isExpired
    ? "#dc2626"
    : isCritical
      ? "#ef4444"
      : isWarning
        ? "#f97316"
        : isNear
          ? "#b45309"
          : "#6b7280";
  const bg = isExpired
    ? "rgba(220,38,38,0.09)"
    : isCritical
      ? "rgba(239,68,68,0.07)"
      : isWarning
        ? "rgba(249,115,22,0.07)"
        : isNear
          ? "rgba(180,83,9,0.07)"
          : "rgba(107,114,128,0.06)";
  const border = isExpired
    ? "rgba(220,38,38,0.22)"
    : isCritical
      ? "rgba(239,68,68,0.18)"
      : isWarning
        ? "rgba(249,115,22,0.18)"
        : isNear
          ? "rgba(180,83,9,0.18)"
          : "rgba(107,114,128,0.14)";

  let label: string;
  if (isExpired) {
    const over = Math.abs(ms);
    const d = Math.floor(over / (24 * 60 * 60 * 1000));
    const h = Math.floor((over % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    label = d > 0 ? `Expiré · ${d}j ${h}h` : `Expiré · ${h}h`;
  } else {
    const d = Math.floor(ms / (24 * 60 * 60 * 1000));
    const h = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const m = Math.floor((ms % (60 * 60 * 1000)) / 60_000);
    label = d > 0 ? `${d}j ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  const icon = isExpired ? "⚠️" : isCritical ? "🔴" : isWarning ? "🟠" : isNear ? "🟡" : "🟢";

  return (
    <div
      title={`Échéance : ${new Date(dueDate).toLocaleString("fr-FR")}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 8px",
        borderRadius: "8px",
        fontSize: "0.62rem",
        fontWeight: 600,
        background: bg,
        color,
        border: `1px solid ${border}`,
        letterSpacing: "0.01em",
        animation: isExpired || isCritical ? "pulse 1.8s ease-in-out infinite" : undefined,
      }}
    >
      <span style={{ fontSize: "0.6rem" }}>{icon}</span>
      {label}
    </div>
  );
}

// ── Avatar stack ──────────────────────────────────────────────────────────────

function AvatarStack({
  names,
  assignedTo,
  teamMemberId,
  isTM,
}: {
  names: string[];
  assignedTo: number[];
  teamMemberId: number;
  isTM: boolean;
}) {
  const MAX_VISIBLE = 2;
  const visible = names.slice(0, MAX_VISIBLE);
  const overflow = names.length - MAX_VISIBLE;

  function initials(name: string) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function avatarColor(name: string) {
    // Brand palette — warm tones cohérents avec #6B1A2A
    const palette = ["#6B1A2A"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return palette[Math.abs(hash) % palette.length];
  }

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {visible.map((name, i) => {
        const isMe = !isTM && assignedTo[i] === teamMemberId;
        const bg = avatarColor(name);
        return (
          <div
            key={i}
            title={name}
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              background: bg,
              color: "#fff",
              fontSize: "0.58rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: isMe ? "2px solid #6B1A2A" : "2px solid #fff",
              marginLeft: i > 0 ? "-8px" : 0,
              zIndex: visible.length - i,
              boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
              outline: isMe ? "2px solid rgba(107,26,42,0.25)" : "none",
            }}
          >
            {initials(name)}
          </div>
        );
      })}
      {overflow > 0 && (
        <div
          style={{
            width: "26px",
            height: "26px",
            borderRadius: "50%",
            background: "#e5e7eb",
            color: "#6b7280",
            fontSize: "0.58rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid #fff",
            marginLeft: "-8px",
            zIndex: 0,
            boxShadow: "0 1px 3px rgba(0,0,0,0.10)",
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

// ── TaskCard ──────────────────────────────────────────────────────────────────

export default function TaskCard({
  task,
  isFree,
  teamMemberId,
  onTaskUpdated,
  onCardClick = () => {},
  isDragging = false,
  readOnly = false,
  isTM = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [shaking, setShaking] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: `task-${task.id}`,
    disabled: readOnly || task.status === "review",
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  async function handleAssign(e: React.MouseEvent) {
    e.stopPropagation();
    setLoading(true);
    const res = await assignTaskToSelf(task.id, teamMemberId);
    setLoading(false);
    if (res.success && res.task) onTaskUpdated(res.task);
  }

  function handleCardClick() {
    if (loading) return;
    onCardClick(task);
  }

  const formattedDate = formatDate(task.due_date);
  const isBeingDragged = isDragging || isSortableDragging;
  const isReview = task.status === "review";

  return (
    <>
      <div
        ref={setNodeRef}
        style={{
          ...style,
          background: "#fff",
          borderRadius: "12px",
          border:
            isReview && !isTM
              ? "1.5px solid rgba(139,92,246,0.25)"
              : "1.5px solid rgba(0,0,0,0.06)",
          padding: "14px 16px",
          marginBottom: "10px",
          boxShadow: isBeingDragged ? "0 16px 40px rgba(0,0,0,0.18)" : "0 1px 4px rgba(0,0,0,0.05)",
          opacity: isSortableDragging ? 0.4 : 1,
          cursor: readOnly
            ? "default"
            : isReview && !isTM
              ? "default"
              : isBeingDragged
                ? "grabbing"
                : "pointer",
          transition: "box-shadow 0.15s, opacity 0.15s, transform 0.1s",
          animation: shaking ? "shake 0.4s ease" : undefined,
          userSelect: "none",
        }}
        {...attributes}
        {...(readOnly || (isReview && !isTM) ? {} : listeners)}
        onClick={handleCardClick}
        onPointerDown={(e) => {
          if (isReview && !isTM) {
            setShaking(true);
            setTimeout(() => setShaking(false), 500);
          }
          listeners?.onPointerDown?.(e);
        }}
        onMouseEnter={(e) => {
          if (!isBeingDragged && !readOnly) {
            (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)";
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)";
        }}
      >
        {/* Row 1 — Priority badge + Date */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          <PriorityBadge priority={task.priority} />
          {formattedDate && (
            <span style={{ fontSize: "0.65rem", color: "#aaa", fontWeight: 500 }}>
              {formattedDate}
            </span>
          )}
        </div>

        {/* Title */}
        <h4
          style={{
            fontSize: "0.88rem",
            fontWeight: 600,
            color: "#111",
            margin: "0 0 4px 0",
            lineHeight: 1.4,
            display: "flex",
            alignItems: "flex-start",
            gap: "6px",
          }}
        >
          <span style={{ flex: 1 }}>{task.title}</span>
          {isReview && !isTM && (
            <Lock size={13} color="#8b5cf6" style={{ flexShrink: 0, marginTop: "2px" }} />
          )}
        </h4>

        {/* Description — optional, 2 lines max */}
        {task.description && (
          <p
            style={{
              fontSize: "0.73rem",
              color: "#888",
              margin: "4px 0 10px 0",
              lineHeight: 1.45,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {task.description}
          </p>
        )}

        {/* Row — Timer + Avatars */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "10px",
          }}
        >
          {/* Timer */}
          <TimerBadge dueDate={task.due_date} status={task.status} />

          {/* Avatars + assign button */}
          <div
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {isFree && !isTM ? (
              <button
                onClick={handleAssign}
                disabled={loading}
                style={{
                  padding: "3px 10px",
                  borderRadius: "6px",
                  border: "1px solid rgba(107,26,42,0.25)",
                  background: "rgba(107,26,42,0.05)",
                  color: "#6B1A2A",
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.background = "rgba(107,26,42,0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(107,26,42,0.05)";
                }}
              >
                {loading ? "..." : "S'assigner"}
              </button>
            ) : task.assigned_to_names && task.assigned_to_names.length > 0 ? (
              <AvatarStack
                names={task.assigned_to_names}
                assignedTo={task.assigned_to ?? []}
                teamMemberId={teamMemberId}
                isTM={isTM}
              />
            ) : null}
          </div>
        </div>

        {/* Review locked badge */}
        {isReview && !isTM && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              marginTop: "8px",
              padding: "3px 8px",
              borderRadius: "8px",
              fontSize: "0.62rem",
              fontWeight: 500,
              background: "rgba(139,92,246,0.08)",
              color: "#8b5cf6",
              border: "1px solid rgba(139,92,246,0.15)",
            }}
          >
            <Lock size={10} color="#8b5cf6" /> En attente de validation
          </div>
        )}

        {/* Completed badge (readOnly) */}
        {readOnly && (
          <div style={{ marginTop: "8px" }}>
            <span
              style={{
                display: "inline-flex",
                padding: "3px 8px",
                borderRadius: "8px",
                fontSize: "0.65rem",
                fontWeight: 500,
                background: "rgba(16,185,129,0.10)",
                color: "#10b981",
              }}
            >
              ✓ Terminée par l&apos;équipe
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-6px); }
          40%       { transform: translateX(6px); }
          60%       { transform: translateX(-4px); }
          80%       { transform: translateX(4px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.55; }
        }
      `}</style>
    </>
  );
}
