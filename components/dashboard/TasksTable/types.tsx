// ── Types ─────────────────────────────────────────────────────────────────────
export type Task = {
  id: number;
  title: string;
  description: string;
  status: "à faire" | "en cours" | "review" | "terminée";
  priority: "low" | "medium" | "high";
  project_id: number | null;
  assigned_to: number[] | null; // ✅ tableau, pas un scalaire
  due_date: string | null;
  created_at: string;
  assigned_to_names?: string[]; // ✅ pluriel + tableau (aligné sur task-actions)
  project_name?: string;
};
export type Toast = {
  id: number;
  type: "success" | "error";
  message: string;
};
export type EditMode = "create" | "update";
export type Action = {
  icon: "view" | "edit" | "delete";
  label: string;
  onClick: (t: Task) => void;
};
export type TeamMember = { id: number; full_name: string };
export type Project = { id: number; name: string };
// ── Composants Badge ──────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    "à faire": { bg: "rgba(209, 213, 219, 0.1)", color: "#6B7280", label: "À faire" },
    "en cours": { bg: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", label: "En cours" },
    review: { bg: "#8a5cf639", color: "#8b5cf6", label: "Review" },
    terminée: { bg: "rgba(16, 185, 129, 0.1)", color: "#10b981", label: "Terminée" },
  };
  const s = map[status] ?? map["à faire"];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: "20px",
        fontSize: "0.67rem",
        fontWeight: 600,
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}
export function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    low: { bg: "rgba(34, 197, 94, 0.1)", color: "#22c55e", label: "Faible" },
    medium: { bg: "rgba(251, 191, 36, 0.1)", color: "#fbbf24", label: "Moyen" },
    high: { bg: "rgba(239, 68, 68, 0.1)", color: "#ef4444", label: "Élevée" },
  };
  const s = map[priority] ?? map["medium"];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: "20px",
        fontSize: "0.67rem",
        fontWeight: 600,
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}
