import { getTeamsData } from "@/lib/equipe-actions";
import TeamsTable from "@/components/dashboard/TeamsTable";

export const revalidate = 0; // désactive le cache

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function EquipePage() {
  const { members, roles } = await getTeamsData();

  return (
    <div>
      {/* ── KPI Grid ── */}
      {/*       <div className="kpi-grid-4">


        <KpiCard
          label="Membres total"
          value={`${totalMembers}`}
          delta="dans l'équipe"
          deltaColor="#6B1A2A"
          icon={<Users size={22} />}
          accent
        />


        <KpiCard
          label="Avec un compte"
          value={`${withAccount}`}
          delta="accès au dashboard"
          deltaColor="#2D7A4F"
          icon={<UserCheck size={22} />}
        />


        <KpiCard
          label="Sans compte"
          value={`${withoutAccount}`}
          delta={withoutAccount === 0 ? "✓ Tout le monde" : "à inviter"}
          deltaColor={withoutAccount === 0 ? "#2D7A4F" : "#B7791F"}
          icon={<UserX size={22} />}
        />


        <KpiCard
          label="Managers"
          value={`${bosses}`}
          delta="is_boss = true"
          deltaColor="#f59e0b"
          icon={<Crown size={22} />}
        />
      </div> */}

      {/* Tableau CRUD membres */}
      <TeamsTable members={members as any} roles={roles} />
    </div>
  );
}
