/* import { prisma } from "@/lib/prisma";
import { ClipboardList, Users, PercentCircle, Hourglass } from "lucide-react";
import KpiCard from "@/components/dashboard/KpiCard";
import ReportsTable from "@/components/dashboard/ReportsTable";

export const revalidate = 0; // désactive le cache → données toujours fraîches

// ── Types ─────────────────────────────────────────────────────────────────────


async function getDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [teamsData, rapportsData] = await Promise.all([
    prisma.teams.findMany({
      include: {
        users: true
      },
      orderBy: {
        created_at: 'desc'
      }
    }),

    prisma.rapports.findMany({
      where: {
        created_at: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        team: {
          include: {
            users: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })
  ]);

  // Transform members data
  const members = teamsData.map(t => {
    const user = t.users[0];
    return {
      id: t.id,
      full_name: `${t.first_name || ''} ${t.last_name || ''}`.trim(),
      role: user?.role ?? null,
      phone: t.phone,
      age: t.age,
      is_boss: t.is_boss,
      created_at: t.created_at
    };
  });

  // Transform reports data
  const todayReports = rapportsData.map(r => {
    const user = r.team?.users[0];
    return {
      id: r.id,
      full_name: `${r.team?.first_name || ''} ${r.team?.last_name || ''}`.trim(),
      role: user?.role ?? 'Membre',
      built: r.work_built,
      blocked: r.broken_features,
      submitted_at: r.created_at
    };
  });

  const totalMembers   = members.length;
  const reportedToday  = todayReports.length;
  const missingToday   = totalMembers - reportedToday;
  const completionRate = totalMembers > 0
    ? Math.round((reportedToday / totalMembers) * 100)
    : 0;


  const roleMap: Record<string, number> = {};
  for (const m of members) {
    const r = m.role ?? "Membre";
    roleMap[r] = (roleMap[r] ?? 0) + 1;
  }
  const roleStats = Object.entries(roleMap)
    .sort((a, b) => b[1] - a[1])
    .map(([role, count]) => ({
      role, count,
      pct: Math.round((count / totalMembers) * 100),
    }));


  const reportedIds = new Set(todayReports.map((r: any) => r.id));

  const reportedNames = new Set(todayReports.map((r: any) => r.full_name?.trim().toLowerCase()));
  const pendingMembers = members.filter(
    (m: any) => !reportedNames.has(m.full_name?.trim().toLowerCase())
  );

  return { totalMembers, reportedToday, missingToday, completionRate, roleStats, todayReports, pendingMembers };
}



export default async function DashboardPage() {
  const {
    totalMembers, reportedToday, missingToday,
    completionRate, roleStats, todayReports, pendingMembers,
  } = await getDashboardData();
   

  const CIRC   = 2 * Math.PI * 48;
  const offset = CIRC - (completionRate / 100) * CIRC;

  return (
    <div>


      <div className="kpi-grid-4">
        <KpiCard
          label="Rapports aujourd'hui"
          value={`${reportedToday}`}
          delta={`sur ${totalMembers} membres`}
          icon={<ClipboardList size={22} />}
          accent
        />
        <KpiCard
          label="Membres actifs"
          value={`${totalMembers}`}
          delta="Équipe actuelle"
          deltaColor="#6B1A2A"
          icon={<Users size={22} />}
        />
        <KpiCard
          label="Taux de complétion"
          value={`${completionRate}%`}
          delta={completionRate >= 80 ? "Journée bien avancée" : "Encore des rapports à venir"}
          deltaColor={completionRate >= 80 ? "#6B1A2A" : "#B7791F"}
          icon={<PercentCircle size={22} />}
        />
        <KpiCard
          label="Rapport manquant"
          value={`${missingToday}`}
          delta={missingToday === 0 ? "Tout le monde a soumis" : "En attente de rapports"}
          deltaColor="#B7791F"
          icon={<Hourglass size={22} />}
        />
      </div>


      <div className="bottom-grid">

        <div style={cardStyle}>
          <SectionHead title="Derniers rapports reçus" action="Voir tout" actionHref="/dashboard/rapports" />
          <ReportsTable
            todayReports={todayReports as any}
            pendingMembers={pendingMembers as any}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>


          <div style={cardStyle}>
            <SectionHead title="Complétion du jour" />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 20px 16px" }}>
              <svg width="110" height="110" viewBox="0 0 120 120" style={{ marginBottom: "12px" }}>
                <circle cx="60" cy="60" r="48" fill="none" stroke="#F5F2ED" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="48"
                  fill="none" stroke="#6B1A2A" strokeWidth="10"
                  strokeDasharray={CIRC}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                  style={{ transition: "stroke-dashoffset 1s ease" }}
                />
                <text x="60" y="55" textAnchor="middle"
                  style={{ fontFamily: "'DM Serif Display', serif", fontSize: "20px", fill: "#1A1A1A" }}>
                  {completionRate}%
                </text>
                <text x="60" y="70" textAnchor="middle" style={{ fontSize: "9px", fill: "#aaa" }}>
                  {reportedToday} / {totalMembers}
                </text>
              </svg>
              <p style={{ fontSize: "0.73rem", color: "#aaa", textAlign: "center", lineHeight: 1.6 }}>
                {reportedToday} rapport{reportedToday > 1 ? "s" : ""} reçu{reportedToday > 1 ? "s" : ""}<br />
                {missingToday > 0 ? `${missingToday} non soumis` : "Tout le monde a soumis ✓"}
              </p>
            </div>
          </div>


          <div style={cardStyle}>
            <SectionHead title="Membres par rôle" />
            <div style={{ padding: "16px 20px" }}>
              {roleStats.map(({ role, count, pct }) => (
                <div key={role} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "13px" }}>
                  <span style={{ fontSize: "0.77rem", fontWeight: 500, minWidth: "110px", color: "#1A1A1A" }}>{role}</span>
                  <div style={{ flex: 1, height: "6px", background: "#F5F2ED", borderRadius: "99px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "#6B1A2A", borderRadius: "99px" }} />
                  </div>
                  <span style={{ fontSize: "0.73rem", fontWeight: 600, color: "#aaa", minWidth: "16px", textAlign: "right" }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}



function SectionHead({ title, action, actionHref }: { title: string; action?: string; actionHref?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1A1A1A" }}>{title}</span>
      {action && actionHref && (
        <a href={actionHref} style={{ fontSize: "0.72rem", color: "#6B1A2A", fontWeight: 500, background: "rgba(107,26,42,0.07)", padding: "4px 10px", borderRadius: "20px", textDecoration: "none" }}>
          {action} →
        </a>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#FFFFFF",
  borderRadius: "16px",
  border: "1px solid rgba(0,0,0,0.07)",
  overflow: "hidden",
};
 */



import { redirect } from "next/navigation";

export default function DashboardPage() {
  redirect("/dashboard/rapports");
}