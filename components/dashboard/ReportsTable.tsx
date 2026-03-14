"use client";

import DataTable from "@/components/dashboard/DataTable";

// ── Micro-composants ──────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  const initials = name
    ?.split(" ").filter(Boolean).slice(0, 2)
    .map((w) => w[0].toUpperCase()).join("");
  return (
    <div style={{
      width: "30px", height: "30px", borderRadius: "50%",
      background: "rgba(107,26,42,0.07)",
      border: "1.5px solid rgba(107,26,42,0.15)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "0.65rem", fontWeight: 700, color: "#6B1A2A", flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
const map: Record<string, { bg: string; color: string }> = {
  "Super Admin": { bg: "rgba(107,26,42,0.1)",  color: "#6B1A2A" },
  "Team Manager":{ bg: "rgba(59,130,246,0.1)", color: "#3b82f6" },
  "Team":        { bg: "rgba(16,185,129,0.1)", color: "#10b981" },
};
  const s = map[role] ?? { bg: "rgba(107,26,42,0.07)", color: "#6B1A2A" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: "20px",
      fontSize: "0.67rem", fontWeight: 600,
      background: s.bg, color: s.color,
    }}>
      {role}
    </span>
  );
}

function StatusBadge({ status }: { status: "done" | "pending" }) {
  return status === "done" ? (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: "20px", fontSize: "0.67rem", fontWeight: 600, background: "rgba(45,122,79,0.1)", color: "#2D7A4F" }}>
      ✓ Envoyé
    </span>
  ) : (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: "20px", fontSize: "0.67rem", fontWeight: 600, background: "rgba(107,26,42,0.08)", color: "#6B1A2A" }}>
      ⏳ En attente
    </span>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Report = {
  id: number;
  full_name: string;
  role?: string;
  built?: string | null;
  submitted_at?: string | null;
};

type Props = {
  todayReports: Report[];
  pendingMembers: Report[];
};

// ── Composant ─────────────────────────────────────────────────────────────────

export default function ReportsTable({ todayReports, pendingMembers }: Props) {
  const data = [
    ...todayReports,
    ...pendingMembers.map((m) => ({ ...m, built: null, submitted_at: null })),
  ];

  return (
    <DataTable
      columns={[
        {
          key: "full_name",
          label: "Membre",
          sortable: true,
          render: (r) => (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Avatar name={r.full_name} />
              <span style={{ fontWeight: 500, fontSize: "0.83rem" }}>{r.full_name}</span>
            </div>
          ),
        },
        {
          key: "role",
          label: "Rôle",
          sortable: true,
          render: (r) => <RoleBadge role={r.role ?? "—"} />,
        },
        {
          key: "built",
          label: "Construit aujourd'hui",
          render: (r) => (
            <span style={{ fontSize: "0.77rem", color: "#888", maxWidth: "200px", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {r.built ?? "—"}
            </span>
          ),
        },
        {
          key: "submitted_at",
          label: "Heure",
          sortable: true,
          render: (r) => (
            <span style={{ fontSize: "0.75rem", color: "#aaa", whiteSpace: "nowrap" }}>
              {r.submitted_at
                ? new Date(r.submitted_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                : "—"}
            </span>
          ),
        },
        {
          key: "status",
          label: "Statut",
          render: (r) => <StatusBadge status={r.built ? "done" : "pending"} />,
        },
      ]}
      data={data}
      searchable={false}
      pageSize={10}
      emptyMessage="Aucun rapport soumis aujourd'hui."
    />
  );
}
