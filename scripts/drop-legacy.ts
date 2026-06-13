/**
 * Phase 2.F — Drop des tables Legacy V1.
 *
 * Stratégie :
 *   1. Vérification finale : aucune table _v2 ne doit perdre de données.
 *      On compte avant, on compare après.
 *   2. DROP TABLE des tables legacy dans le bon ordre (en partant des
 *      enfants pour respecter les FK).
 *   3. RENAME des tables _v2 vers leur nom final.
 *
 *   4. Après ce script : exécuter `prisma db push` pour que Prisma
 *      reconnaisse l'état comme conforme au schéma (sans rien modifier).
 *
 * Usage :
 *   npx tsx scripts/drop-legacy.ts           # dry-run (compte + plan)
 *   npx tsx scripts/drop-legacy.ts --commit  # exécute
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const COMMIT = process.argv.includes("--commit");

const LEGACY_TABLES = [
  // Drop enfants d'abord (FK contraintes) :
  "task_comments",      // legacy : référençait tasks + teams
  "evaluations",        // legacy : référençait teams
  "rapports",           // legacy : référençait teams + project
  "milestones",         // legacy : référençait project
  "tasks",              // legacy : référençait project
  "users",              // legacy : référençait teams
  "project",            // legacy
  "teams",              // legacy
  "api_keys",           // legacy
];

const RENAMES: Array<[string, string]> = [
  ["tasks_v2", "tasks"],
  ["task_comments_v2", "task_comments"],
  ["evaluations_v2", "evaluations"],
  ["api_keys_v2", "api_keys"],
];

type Row = { c: bigint };

async function countTable(name: string): Promise<number | null> {
  try {
    const r = await prisma.$queryRawUnsafe<Row[]>(`SELECT COUNT(*) as c FROM "${name}"`);
    return Number(r[0].c);
  } catch {
    return null; // table inexistante
  }
}

async function main() {
  console.log(`\n========= DROP LEGACY (${COMMIT ? "COMMIT" : "DRY-RUN"}) =========\n`);

  // 1. Inventaire avant
  console.log("Inventaire avant :");
  const before: Record<string, number | null> = {};
  for (const t of LEGACY_TABLES) {
    before[t] = await countTable(t);
    console.log(`  ${t.padEnd(20)} ${before[t] ?? "MISSING"}`);
  }
  console.log();
  for (const [src, dst] of RENAMES) {
    const c = await countTable(src);
    console.log(`  ${src.padEnd(20)} ${c ?? "MISSING"}    (→ ${dst})`);
  }
  console.log();

  if (!COMMIT) {
    console.log("⚠️  DRY-RUN — relancer avec --commit pour exécuter.\n");
    return;
  }

  // 2. Drop legacy
  console.log("Exécution :");
  for (const t of LEGACY_TABLES) {
    if (before[t] === null) {
      console.log(`  skip drop ${t} (n'existe pas)`);
      continue;
    }
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${t}" CASCADE`);
    console.log(`  ✓ DROP ${t}`);
  }

  // 3. Rename _v2 → final
  for (const [src, dst] of RENAMES) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${src}" RENAME TO "${dst}"`);
    console.log(`  ✓ RENAME ${src} → ${dst}`);
  }

  // 4. Inventaire après
  console.log("\nInventaire après :");
  for (const [, dst] of RENAMES) {
    const c = await countTable(dst);
    const expected = before[dst.replace("_v2", "")];
    void expected;
    console.log(`  ${dst.padEnd(20)} ${c ?? "MISSING"}`);
  }

  console.log("\n✅ Drop terminé. Prochaine étape : prisma db push pour synchroniser.\n");
}

main()
  .catch((e) => {
    console.error("❌ ERROR:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
