import { getRapportsData } from "@/lib/rapports-actions";
import RapportsTable from "@/components/dashboard/RapportsTable";

export const revalidate = 0; // désactive le cache

export default async function RapportsPage() {
  const { allReports, roles, projects } = await getRapportsData();

  return (
    <div>
      <RapportsTable reports={allReports as any} roles={roles} projects={projects} />
    </div>
  );
}
