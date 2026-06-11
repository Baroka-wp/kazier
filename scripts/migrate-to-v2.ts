/**
 * Migration data Phase 1 — V1 (snake_case, Int IDs) → V2 (PascalCase, cuid IDs).
 *
 * Conditions d'exécution :
 *   - Les nouvelles tables (members, auths, projects, tasks…) doivent EXISTER,
 *     créées par un `prisma db push` du schema intermédiaire qui contient
 *     anciens + nouveaux modèles. Voir doc Phase 1.
 *   - Doit tourner sur la branche Neon `dev` d'abord.
 *
 * Usage :
 *   npx tsx scripts/migrate-to-v2.ts             # dry-run (compte, n'écrit rien)
 *   npx tsx scripts/migrate-to-v2.ts --commit    # exécute pour de vrai
 *   npx tsx scripts/migrate-to-v2.ts --verify    # vérifie qu'une migration est cohérente
 *
 * Stratégie :
 *   1. Construit un Plan en RAM (correspondances oldId → cuid + transformations).
 *   2. Imprime le plan en mode dry-run.
 *   3. En mode --commit, exécute le plan dans une transaction unique.
 *      Si quoi que ce soit casse, rollback complet.
 */

import { PrismaClient } from "@prisma/client";
import { createId } from "@paralleldrive/cuid2";

// Note: les noms de modèles dans le client Prisma actuel suivent le schema V1.
// Après `prisma db push` du schema intermédiaire, on aura access aux deux
// (anciens et nouveaux). Pour l'instant ce fichier référence les noms cibles
// qui n'existeront qu'à ce moment-là — TypeScript râlera tant que db push n'est
// pas fait. C'est attendu.
const prisma = new PrismaClient();

// ── Flags CLI ─────────────────────────────────────────────────────────────
const args = new Set(process.argv.slice(2));
const COMMIT = args.has("--commit");
const VERIFY = args.has("--verify");

// ── Mappings de transformation ────────────────────────────────────────────

const ROLE_MAP: Record<string, "SUPER_ADMIN" | "PROJECT_MANAGER" | "MEMBER"> = {
  SA: "SUPER_ADMIN",
  TM: "PROJECT_MANAGER",
  T: "MEMBER",
};

const TASK_STATUS_MAP: Record<string, "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "CANCELLED"> = {
  "à faire": "TODO",
  "en cours": "IN_PROGRESS",
  review: "REVIEW",
  terminée: "DONE",
  // sécurité : si une valeur inconnue apparaît
};

const PRIORITY_MAP: Record<string, "LOW" | "MEDIUM" | "HIGH" | "URGENT"> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
  urgent: "URGENT",
};

function mapTaskStatus(s: string | null): "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "CANCELLED" {
  if (!s) return "TODO";
  return TASK_STATUS_MAP[s] ?? "TODO";
}

function mapPriority(p: string | null): "LOW" | "MEDIUM" | "HIGH" | "URGENT" {
  if (!p) return "MEDIUM";
  return PRIORITY_MAP[p] ?? "MEDIUM";
}

function mapRole(r: string | null | undefined): "SUPER_ADMIN" | "PROJECT_MANAGER" | "MEMBER" {
  if (!r) return "MEMBER";
  return ROLE_MAP[r] ?? "MEMBER";
}

// ── Stats ─────────────────────────────────────────────────────────────────

type Stats = {
  members: number;
  auths: number;
  projects: number;
  projectMembers: number;
  tasks: number;
  taskAssignments: number;
  taskComments: number;
  deliverables: number;
  reports: number;
  reportsSkippedDup: number;
  evaluations: number;
};

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  if (VERIFY) return verify();

  console.log(`\n========= MIGRATION V1 → V2 (${COMMIT ? "COMMIT" : "DRY-RUN"}) =========\n`);

  // 1. Charger toute la V1 en RAM (volumes faibles)
  const [
    oldTeams,
    oldUsers,
    oldProjects,
    oldTasks,
    oldRapports,
    oldMilestones,
    oldTaskComments,
    oldEvaluations,
  ] = await Promise.all([
    prisma.legacyTeam.findMany({ orderBy: { id: "asc" } }),
    prisma.legacyUser.findMany({ orderBy: { id: "asc" } }),
    prisma.legacyProject.findMany({ orderBy: { id: "asc" } }),
    prisma.legacyTask.findMany({ orderBy: { id: "asc" } }),
    prisma.legacyRapport.findMany({ orderBy: { id: "asc" } }),
    prisma.legacyMilestone.findMany({ orderBy: { id: "asc" } }),
    prisma.legacyTaskComment.findMany({ orderBy: { id: "asc" } }),
    prisma.legacyEvaluation.findMany({ orderBy: { id: "asc" } }),
  ]);

  console.log(`Loaded V1 data:
  teams=${oldTeams.length}  users=${oldUsers.length}  projects=${oldProjects.length}
  tasks=${oldTasks.length}  rapports=${oldRapports.length}  milestones=${oldMilestones.length}
  task_comments=${oldTaskComments.length}  evaluations=${oldEvaluations.length}\n`);

  // 2. Générer les cuid + tables de correspondance
  const memberIdMap = new Map<number, string>();
  for (const t of oldTeams) memberIdMap.set(t.id, createId());

  const projectIdMap = new Map<number, string>();
  for (const p of oldProjects) projectIdMap.set(p.id, createId());

  const taskIdMap = new Map<number, string>();
  for (const t of oldTasks) taskIdMap.set(t.id, createId());

  const deliverableIdMap = new Map<number, string>(); // milestones → deliverables
  for (const m of oldMilestones) deliverableIdMap.set(m.id, createId());

  // 3. Préparer payloads transformés
  const newMembers = oldTeams.map((t) => ({
    id: memberIdMap.get(t.id)!,
    firstName: t.first_name ?? "Inconnu",
    lastName: t.last_name ?? "",
    email: t.email,
    phone: t.phone,
    age: t.age,
    slackId: t.slack_id,
    isBoss: t.is_boss,
    isActive: true,
    role: mapRole(oldUsers.find((u) => u.team_id === t.id)?.role),
    createdAt: t.created_at,
  }));

  // Auth : un user par team_id (1:1). On a vérifié à l'audit qu'aucun team_id n'a >1 auth.
  const newAuths = oldUsers
    .filter((u) => u.team_id && memberIdMap.has(u.team_id))
    .map((u) => ({
      id: createId(),
      memberId: memberIdMap.get(u.team_id!)!,
      email: u.email,
      passwordHash: u.password,
      resetToken: u.reset_token,
      resetExpires: u.reset_token_expires,
    }));

  const newProjects = oldProjects.map((p) => ({
    id: projectIdMap.get(p.id)!,
    name: p.name ?? "Sans nom",
    description: p.description,
    icon: p.icon,
    status: "ACTIVE" as const,
    startDate: p.start_date,
    endDate: p.end_date,
    objectives: p.objectives,
    stakeholders: p.stakeholders,
    createdAt: p.created_at,
  }));

  // ProjectMember depuis project.team_ids[]
  const newProjectMembers: { projectId: string; memberId: string }[] = [];
  for (const p of oldProjects) {
    for (const memberId of p.team_ids ?? []) {
      if (memberIdMap.has(memberId)) {
        newProjectMembers.push({
          projectId: projectIdMap.get(p.id)!,
          memberId: memberIdMap.get(memberId)!,
        });
      }
    }
  }

  // Deliverables (depuis milestones, cadence=MILESTONE)
  const newDeliverables = oldMilestones
    .filter((m) => projectIdMap.has(m.project_id))
    .map((m) => ({
      id: deliverableIdMap.get(m.id)!,
      projectId: projectIdMap.get(m.project_id)!,
      title: m.title,
      description: m.deliverables,
      cadence: "MILESTONE" as const,
      dueDate: m.due_date,
      status: "PLANNED" as const,
      createdAt: m.created_at,
    }));

  // Tasks
  const newTasks = oldTasks.map((t) => ({
    id: taskIdMap.get(t.id)!,
    projectId: t.project_id ? (projectIdMap.get(t.project_id) ?? null) : null,
    title: t.title ?? "Sans titre",
    description: t.description,
    status: mapTaskStatus(t.status),
    priority: mapPriority(t.priority),
    startDate: t.start_date,
    dueDate: t.due_date,
    reminderSent: t.reminder_sent,
    createdAt: t.created_at,
  }));

  // TaskAssignments depuis task.assigned_to[]
  const newTaskAssignments: { taskId: string; memberId: string }[] = [];
  for (const t of oldTasks) {
    for (const memberId of t.assigned_to ?? []) {
      if (memberIdMap.has(memberId)) {
        newTaskAssignments.push({
          taskId: taskIdMap.get(t.id)!,
          memberId: memberIdMap.get(memberId)!,
        });
      }
    }
  }

  // TaskComments
  const newTaskComments = oldTaskComments
    .filter((c) => taskIdMap.has(c.task_id) && memberIdMap.has(c.team_id))
    .map((c) => ({
      id: createId(),
      taskId: taskIdMap.get(c.task_id)!,
      memberId: memberIdMap.get(c.team_id)!,
      content: c.content,
      createdAt: c.created_at,
    }));

  // Reports : déduplication des 13 groupes en doublon (garder le plus ancien = id min)
  const reportGroups = new Map<string, typeof oldRapports>();
  for (const r of oldRapports) {
    const day = r.created_at.toISOString().slice(0, 10);
    const k = `${r.team_id ?? "null"}|${day}|${r.project_id ?? "null"}`;
    const arr = reportGroups.get(k) ?? [];
    arr.push(r);
    reportGroups.set(k, arr);
  }
  let reportsSkippedDup = 0;
  const newReports: {
    id: string;
    memberId: string;
    projectId: string | null;
    reportDate: Date;
    workCompleted: string | null;
    inProgress: string | null;
    blockers: string | null;
    learnings: string | null;
    learningNeeded: string | null;
    tomorrowPlan: string | null;
    extraMessage: string | null;
    createdAt: Date;
  }[] = [];
  for (const group of reportGroups.values()) {
    // Tri ascendant par id : on garde le premier
    const sorted = group.sort((a, b) => a.id - b.id);
    const keep = sorted[0];
    reportsSkippedDup += sorted.length - 1;
    if (!keep.team_id || !memberIdMap.has(keep.team_id)) continue; // skip rapports orphelins (au cas où)
    newReports.push({
      id: createId(),
      memberId: memberIdMap.get(keep.team_id)!,
      projectId: keep.project_id ? (projectIdMap.get(keep.project_id) ?? null) : null,
      reportDate: new Date(keep.created_at.toISOString().slice(0, 10)),
      workCompleted: keep.work_built,
      inProgress: keep.working_built,
      blockers: keep.broken_features,
      learnings: keep.validated_learning,
      learningNeeded: keep.needed_learning,
      tomorrowPlan: keep.tomorrow_build,
      extraMessage: keep.extra_message,
      createdAt: keep.created_at,
    });
  }

  // Evaluations
  const newEvaluations = oldEvaluations
    .filter((e) => memberIdMap.has(e.evaluator_id) && memberIdMap.has(e.evaluated_id))
    .map((e) => ({
      id: createId(),
      evaluatorId: memberIdMap.get(e.evaluator_id)!,
      evaluatedId: memberIdMap.get(e.evaluated_id)!,
      reportDate: e.report_date,
      communication: e.communication,
      collaboration: e.collaboration,
      punctuality: e.punctuality,
      comment: e.comment,
      createdAt: e.created_at,
    }));

  const stats: Stats = {
    members: newMembers.length,
    auths: newAuths.length,
    projects: newProjects.length,
    projectMembers: newProjectMembers.length,
    tasks: newTasks.length,
    taskAssignments: newTaskAssignments.length,
    taskComments: newTaskComments.length,
    deliverables: newDeliverables.length,
    reports: newReports.length,
    reportsSkippedDup,
    evaluations: newEvaluations.length,
  };

  console.log("PLAN :");
  console.log(`  Member            : ${stats.members}`);
  console.log(`  Auth              : ${stats.auths}`);
  console.log(`  Project           : ${stats.projects}`);
  console.log(`  ProjectMember     : ${stats.projectMembers}  (depuis project.team_ids[])`);
  console.log(`  Task              : ${stats.tasks}`);
  console.log(`  TaskAssignment    : ${stats.taskAssignments}  (depuis task.assigned_to[])`);
  console.log(`  TaskComment       : ${stats.taskComments}`);
  console.log(`  Deliverable       : ${stats.deliverables}  (depuis milestones)`);
  console.log(`  Report            : ${stats.reports}  (skip ${stats.reportsSkippedDup} doublons)`);
  console.log(`  Evaluation        : ${stats.evaluations}\n`);

  if (!COMMIT) {
    console.log("⚠️  DRY-RUN — rien n'a été écrit. Relancer avec --commit pour exécuter.\n");
    return;
  }

  // 4. Exécution en transaction unique
  console.log("⏳ Écriture en cours (transaction unique)…\n");

  await prisma.$transaction(
    async (tx) => {
      await tx.member.createMany({ data: newMembers });
      await tx.auth.createMany({ data: newAuths });
      await tx.project.createMany({ data: newProjects });
      await tx.projectMember.createMany({ data: newProjectMembers });
      await tx.deliverable.createMany({ data: newDeliverables });
      await tx.task.createMany({ data: newTasks });
      await tx.taskAssignment.createMany({ data: newTaskAssignments });
      await tx.taskComment.createMany({ data: newTaskComments });
      await tx.report.createMany({ data: newReports });
      await tx.evaluation.createMany({ data: newEvaluations });
    },
    { timeout: 60_000 }
  );

  console.log("✅ Migration terminée.\n");
  console.log("Prochaines étapes :");
  console.log("  1. npx tsx scripts/migrate-to-v2.ts --verify");
  console.log("  2. Si OK : appliquer le schema final (sans les anciennes tables)");
  console.log("  3. Tester l'app en local sur branche dev Neon\n");
}

// ── Verify ────────────────────────────────────────────────────────────────

async function verify() {
  console.log("\n========= VERIFY =========\n");
  const [
    oldT,
    oldU,
    oldP,
    oldK,
    oldR,
    oldM,
    oldC,
    oldE,
    newMembers,
    newAuths,
    newProjectsCount,
    newTasks,
    newReports,
    newDeliverables,
    newTaskComments,
    newEvaluations,
  ] = await Promise.all([
    prisma.legacyTeam.count(),
    prisma.legacyUser.count(),
    prisma.legacyProject.count(),
    prisma.legacyTask.count(),
    prisma.legacyRapport.count(),
    prisma.legacyMilestone.count(),
    prisma.legacyTaskComment.count(),
    prisma.legacyEvaluation.count(),
    prisma.member.count(),
    prisma.auth.count(),
    prisma.project.count(),
    prisma.task.count(),
    prisma.report.count(),
    prisma.deliverable.count(),
    prisma.taskComment.count(),
    prisma.evaluation.count(),
  ]);

  const expected = {
    members: oldT,
    auths: oldU,
    tasks: oldK,
    deliverables: oldM,
    taskComments: oldC,
    evaluations: oldE,
    reportsMin: oldR - 20, // tolérance pour les doublons supprimés (~13)
    reportsMax: oldR,
  };

  console.log("V1 counts :", { oldT, oldU, oldP, oldK, oldR, oldM, oldC, oldE });
  console.log("V2 counts :", {
    newMembers,
    newAuths,
    newProjects: newProjectsCount,
    newTasks,
    newReports,
    newDeliverables,
    newTaskComments,
    newEvaluations,
  });

  const checks = [
    ["Member == teams", newMembers === expected.members],
    ["Auth == users", newAuths === expected.auths],
    ["Task == tasks", newTasks === expected.tasks],
    ["Deliverable == milestones", newDeliverables === expected.deliverables],
    ["TaskComment == task_comments", newTaskComments === expected.taskComments],
    ["Evaluation == evaluations", newEvaluations === expected.evaluations],
    ["Report ≈ rapports", newReports >= expected.reportsMin && newReports <= expected.reportsMax],
  ];

  let allOk = true;
  for (const [label, ok] of checks) {
    console.log(`  ${ok ? "✅" : "❌"} ${label}`);
    if (!ok) allOk = false;
  }
  console.log(
    `\n${allOk ? "✅ Toutes les vérifications passent." : "❌ Échec — ne pas continuer."}\n`
  );
  process.exit(allOk ? 0 : 1);
}

main()
  .catch((e) => {
    console.error("❌ ERREUR :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
