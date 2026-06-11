/**
 * Inspecte les "doublons" rapports (member+day+project) pour comprendre.
 * Lecture seule.
 */
import { prisma } from "../lib/prisma";

async function main() {
  const rapports = await prisma.rapports.findMany({
    include: {
      team: { select: { first_name: true, last_name: true } },
      project: { select: { name: true } },
    },
    orderBy: { created_at: "asc" },
  });

  const grouped = new Map<string, typeof rapports>();
  for (const r of rapports) {
    const day = r.created_at.toISOString().slice(0, 10);
    const k = `${r.team_id ?? "null"}|${day}|${r.project_id ?? "null"}`;
    const arr = grouped.get(k) ?? [];
    arr.push(r);
    grouped.set(k, arr);
  }

  const dups = [...grouped.entries()].filter(([, v]) => v.length > 1);
  console.log(`\n${dups.length} groupes en doublon (member+day+project)\n`);
  for (const [key, list] of dups) {
    const [t] = list;
    console.log(
      `── ${key}  (${t.team?.first_name} ${t.team?.last_name} / ${t.project?.name ?? "no project"})`
    );
    for (const r of list) {
      const built = (r.work_built ?? "").slice(0, 60).replace(/\n/g, " ");
      const tomorrow = (r.tomorrow_build ?? "").slice(0, 60).replace(/\n/g, " ");
      console.log(
        `  #${r.id}  ${r.created_at.toISOString()}  built="${built}…"  tomorrow="${tomorrow}…"`
      );
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
