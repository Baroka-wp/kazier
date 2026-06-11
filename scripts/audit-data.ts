/**
 * Audit READ-ONLY de la donnée actuelle avant migration Phase 1.
 * Aucune écriture. Imprime un rapport pour calibrer le script de migration.
 *
 * Usage : npx tsx scripts/audit-data.ts
 */
import { prisma } from "../lib/prisma";

type Counter = Record<string, number>;
const bump = (c: Counter, k: string) => (c[k] = (c[k] ?? 0) + 1);
const fmt = (c: Counter) =>
  Object.entries(c)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `  ${k.padEnd(30)} ${v}`)
    .join("\n");

async function main() {
  console.log("\n========= AUDIT DATA KAZIER =========\n");

  // ── Volumes globaux ──────────────────────────────────────────
  const [
    teamsCount,
    usersCount,
    projectsCount,
    tasksCount,
    rapportsCount,
    milestonesCount,
    taskCommentsCount,
    evalCount,
    apiKeysCount,
  ] = await Promise.all([
    prisma.legacyTeam.count(),
    prisma.legacyUser.count(),
    prisma.legacyProject.count(),
    prisma.legacyTask.count(),
    prisma.legacyRapport.count(),
    prisma.legacyMilestone.count(),
    prisma.legacyTaskComment.count(),
    prisma.legacyEvaluation.count(),
    prisma.legacyApiKey.count(),
  ]);

  console.log("VOLUMES");
  console.log(`  teams (members)    : ${teamsCount}`);
  console.log(`  users (auth)       : ${usersCount}`);
  console.log(`  project            : ${projectsCount}`);
  console.log(`  tasks              : ${tasksCount}`);
  console.log(`  rapports           : ${rapportsCount}`);
  console.log(`  milestones         : ${milestonesCount}`);
  console.log(`  task_comments      : ${taskCommentsCount}`);
  console.log(`  evaluations        : ${evalCount}`);
  console.log(`  api_keys           : ${apiKeysCount}`);

  // ── teams : qualité ──────────────────────────────────────────
  const teams = await prisma.legacyTeam.findMany();
  const teamFlags: Counter = {};
  for (const t of teams) {
    if (!t.first_name) bump(teamFlags, "missing.first_name");
    if (!t.last_name) bump(teamFlags, "missing.last_name");
    if (!t.email) bump(teamFlags, "missing.email");
    if (!t.slack_id) bump(teamFlags, "missing.slack_id");
    if (t.is_boss) bump(teamFlags, "is_boss=true");
    if (t.role) bump(teamFlags, `legacy_role=${t.role}`);
  }
  console.log("\nTEAMS quality");
  console.log(fmt(teamFlags));

  // emails dupliqués (devra devenir UNIQUE)
  const emails = teams.map((t) => t.email).filter(Boolean) as string[];
  const dup = emails.filter((e, i) => emails.indexOf(e.toLowerCase()) !== i);
  console.log(`  emails dupliqués   : ${dup.length}`);
  if (dup.length) console.log(`    -> ${dup.slice(0, 5).join(", ")}`);

  // ── users : qualité ──────────────────────────────────────────
  const users = await prisma.legacyUser.findMany();
  const userFlags: Counter = {};
  for (const u of users) {
    if (!u.team_id) bump(userFlags, "missing.team_id (orphan auth)");
    if (!u.role) bump(userFlags, "missing.role");
    bump(userFlags, `role=${u.role ?? "NULL"}`);
  }
  console.log("\nUSERS quality");
  console.log(fmt(userFlags));

  // un user sans team correspondante ?
  const teamIds = new Set(teams.map((t) => t.id));
  const orphanUsers = users.filter((u) => u.team_id && !teamIds.has(u.team_id));
  console.log(`  users.team_id orphelin : ${orphanUsers.length}`);

  // multi-user sur un même team_id (cas non géré dans la nouvelle archi 1:1)
  const userTeamCount: Counter = {};
  for (const u of users) if (u.team_id) bump(userTeamCount, String(u.team_id));
  const multiAuth = Object.entries(userTeamCount).filter(([, v]) => v > 1);
  console.log(`  team_id avec >1 auth : ${multiAuth.length}`);
  if (multiAuth.length)
    console.log(
      `    -> ${multiAuth
        .slice(0, 5)
        .map(([k, v]) => `team#${k}=${v}`)
        .join(", ")}`
    );

  // ── project : qualité ────────────────────────────────────────
  const projects = await prisma.legacyProject.findMany();
  const projFlags: Counter = {};
  for (const p of projects) {
    if (!p.name) bump(projFlags, "missing.name");
    if (!p.description) bump(projFlags, "missing.description");
    if (!p.team_ids?.length) bump(projFlags, "no.team_ids");
    if (p.start_date && p.end_date && p.start_date > p.end_date)
      bump(projFlags, "invalid.dates (start>end)");
    // team_ids pointant vers un membre supprimé ?
    for (const tid of p.team_ids ?? []) {
      if (!teamIds.has(tid)) bump(projFlags, `team_ids.orphan`);
    }
  }
  console.log("\nPROJECT quality");
  console.log(fmt(projFlags));

  // ── tasks : qualité + énums ──────────────────────────────────
  const tasks = await prisma.legacyTask.findMany();
  const taskFlags: Counter = {};
  const statusCount: Counter = {};
  const prioCount: Counter = {};
  const projectIds = new Set(projects.map((p) => p.id));
  for (const t of tasks) {
    if (!t.title) bump(taskFlags, "missing.title");
    if (!t.assigned_to?.length) bump(taskFlags, "no.assigned_to");
    if (t.project_id && !projectIds.has(t.project_id)) bump(taskFlags, "project_id.orphan");
    for (const aid of t.assigned_to ?? []) {
      if (!teamIds.has(aid)) bump(taskFlags, "assigned_to.orphan");
    }
    bump(statusCount, `status=${t.status ?? "NULL"}`);
    bump(prioCount, `priority=${t.priority ?? "NULL"}`);
  }
  console.log("\nTASKS quality");
  console.log(fmt(taskFlags));
  console.log("\nTASKS status distribution");
  console.log(fmt(statusCount));
  console.log("\nTASKS priority distribution");
  console.log(fmt(prioCount));

  // ── rapports : qualité + anti-doublon ────────────────────────
  const rapports = await prisma.legacyRapport.findMany();
  const rapFlags: Counter = {};
  const rapDayKey: Counter = {};
  for (const r of rapports) {
    if (!r.team_id) bump(rapFlags, "missing.team_id");
    if (r.team_id && !teamIds.has(r.team_id)) bump(rapFlags, "team_id.orphan");
    if (r.project_id && !projectIds.has(r.project_id)) bump(rapFlags, "project_id.orphan");
    const day = r.created_at.toISOString().slice(0, 10);
    const k = `${r.team_id ?? "null"}|${day}|${r.project_id ?? "null"}`;
    bump(rapDayKey, k);
  }
  const dupRap = Object.entries(rapDayKey).filter(([, v]) => v > 1);
  console.log("\nRAPPORTS quality");
  console.log(fmt(rapFlags));
  console.log(`  doublons (member+day+project) : ${dupRap.length}`);
  if (dupRap.length)
    console.log(
      `    -> exemples: ${dupRap
        .slice(0, 3)
        .map(([k, v]) => `${k} x${v}`)
        .join(" | ")}`
    );

  // ── milestones : qualité ─────────────────────────────────────
  const ms = await prisma.legacyMilestone.findMany();
  const msFlags: Counter = {};
  for (const m of ms) {
    if (m.project_id && !projectIds.has(m.project_id)) bump(msFlags, "project_id.orphan");
    if (!m.title) bump(msFlags, "missing.title");
  }
  console.log("\nMILESTONES quality");
  console.log(fmt(msFlags));

  // ── task_comments : qualité ──────────────────────────────────
  const tc = await prisma.legacyTaskComment.findMany();
  const tcFlags: Counter = {};
  const taskIds = new Set(tasks.map((t) => t.id));
  for (const c of tc) {
    if (!taskIds.has(c.task_id)) bump(tcFlags, "task_id.orphan");
    if (!teamIds.has(c.team_id)) bump(tcFlags, "team_id.orphan");
  }
  console.log("\nTASK_COMMENTS quality");
  console.log(fmt(tcFlags));

  // ── api_keys ──────────────────────────────────────────────────
  const apiKeys = await prisma.legacyApiKey.findMany();
  const apiFlags: Counter = {};
  for (const k of apiKeys) {
    if (k.key.length < 32) bump(apiFlags, "key.suspiciously_short");
    // Si stockée en clair (pas hashée), longueur ≈ 32-64 et ressemble à un token
    if (k.key.startsWith("$2") || k.key.includes("$")) bump(apiFlags, "key.looks_hashed");
    else bump(apiFlags, "key.looks_plaintext");
  }
  console.log("\nAPI_KEYS quality");
  console.log(fmt(apiFlags));

  console.log("\n========= FIN AUDIT =========\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
