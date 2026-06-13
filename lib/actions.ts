"use server";

/**
 * Server Actions du formulaire public DailyForm.
 *
 * Ces fonctions sont appelées SANS session NextAuth (public). On utilise
 * donc un Actor synthétique :
 *   - HUMAN(memberId, MEMBER) pour les writes du membre lui-même (submit
 *     report, save evaluations) → respecte la perm reports.write
 *   - SYSTEM pour les lectures publiques (projets/tâches dispo, autocomplete)
 */

import {
  prisma,
  members as membersCore,
  reports as reportsCore,
  systemActor,
  type Actor,
} from "@/lib/core";
import {
  postMessage,
  header,
  section,
  divider,
  actionButton,
  stripHtml,
} from "@/lib/server/integrations/slack/client";

const SYSTEM: Actor = systemActor("daily-form");
const formMember = (memberId: string): Actor => ({
  type: "HUMAN",
  memberId,
  role: "MEMBER",
});

// ── getProjectsByMember ──────────────────────────────────────────────────

export async function getProjectsByMember(team_id: string) {
  const memberships = await prisma.projectMember.findMany({
    where: { memberId: team_id },
    include: {
      project: { select: { id: true, name: true, description: true, icon: true } },
    },
    orderBy: { project: { name: "asc" } },
  });
  return memberships.map((m) => ({
    id: m.project.id,
    name: m.project.name,
    description: m.project.description ?? "",
    icon: m.project.icon ?? "",
  }));
}

// ── getTasksByMember (variante shape brut pour DailyForm) ───────────────

export async function getTasksByMember(team_id: string) {
  const rows = await prisma.task.findMany({
    where: {
      assignments: { some: { memberId: team_id } },
      status: { not: "DONE" },
    },
    include: {
      project: { select: { name: true, icon: true } },
    },
    orderBy: { dueDate: "asc" },
  });
  return rows.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description ?? "",
    status: t.status,
    priority: t.priority,
    due_date: t.dueDate ? t.dueDate.toISOString().split("T")[0] : null,
    project_id: t.projectId ?? "",
    project_name: t.project?.name ?? "",
    project_icon: t.project?.icon ?? "",
  }));
}

// ── getTeammatesByProjects ──────────────────────────────────────────────

export async function getTeammatesByProjects(
  project_ids: string[],
  current_team_id: string
): Promise<{ id: string; full_name: string }[]> {
  if (project_ids.length === 0) return [];

  const memberships = await prisma.projectMember.findMany({
    where: { projectId: { in: project_ids } },
    select: { memberId: true },
  });

  const allIds = [...new Set(memberships.map((m) => m.memberId))].filter(
    (id) => id !== current_team_id
  );
  if (allIds.length === 0) return [];

  const teammates = await prisma.member.findMany({
    where: { id: { in: allIds }, isBoss: false },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: "asc" },
  });

  return teammates.map((m) => ({
    id: m.id,
    full_name: `${m.firstName} ${m.lastName}`.trim(),
  }));
}

// ── saveEvaluations ─────────────────────────────────────────────────────

export async function saveEvaluations(
  evaluator_id: string,
  evaluations: {
    evaluated_id: string;
    communication: number;
    collaboration: number;
    punctuality: number;
    comment: string;
  }[]
) {
  if (evaluations.length === 0) return;

  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");

  await Promise.all(
    evaluations.map((e) =>
      prisma.evaluation.upsert({
        where: {
          evaluatorId_evaluatedId_reportDate: {
            evaluatorId: evaluator_id,
            evaluatedId: e.evaluated_id,
            reportDate: today,
          },
        },
        update: {
          communication: e.communication,
          collaboration: e.collaboration,
          punctuality: e.punctuality,
          comment: stripHtml(e.comment) || null,
        },
        create: {
          evaluatorId: evaluator_id,
          evaluatedId: e.evaluated_id,
          reportDate: today,
          communication: e.communication,
          collaboration: e.collaboration,
          punctuality: e.punctuality,
          comment: stripHtml(e.comment) || null,
        },
      })
    )
  );
}

// ── sendToSlack — soumission rapport quotidien ──────────────────────────

export async function sendToSlack(data: {
  team_id: string;
  full_name: string;
  projects: string[];
  validated_tasks: string[];
  challenges: string;
  needed_learning: string;
  tomorrow_build: string;
  extra_message?: string;
}) {
  const {
    team_id,
    full_name,
    projects,
    validated_tasks,
    challenges,
    needed_learning,
    tomorrow_build,
    extra_message,
  } = data;

  try {
    // 1. Récupérer projets et tâches choisis
    const [taskRows, projectRows] = await Promise.all([
      validated_tasks.length > 0
        ? prisma.task.findMany({
            where: { id: { in: validated_tasks } },
            select: { id: true, title: true, projectId: true },
          })
        : Promise.resolve([] as { id: string; title: string; projectId: string | null }[]),
      projects.length > 0
        ? prisma.project.findMany({
            where: { name: { in: projects } },
            select: { id: true, name: true },
          })
        : Promise.resolve([] as { id: string; name: string }[]),
    ]);

    // 2. Soumettre un rapport par projet (ou un seul sans projet)
    const actor = formMember(team_id);
    if (projectRows.length === 0) {
      const r = await reportsCore.submit(actor, {
        memberId: team_id,
        blockers: challenges,
        learningNeeded: needed_learning,
        tomorrowPlan: tomorrow_build,
        extraMessage: extra_message ? stripHtml(extra_message) : undefined,
      });
      // CONFLICT si déjà soumis aujourd'hui — c'est OK, on continue le Slack
      if (!r.ok && r.code !== "CONFLICT") {
        return { success: false };
      }
    } else {
      await Promise.all(
        projectRows.map(async (p) => {
          const tasksForProject = taskRows
            .filter((t) => t.projectId === p.id)
            .map((t) => `• ${t.title}`)
            .join("\n");
          const r = await reportsCore.submit(actor, {
            memberId: team_id,
            projectId: p.id,
            inProgress: tasksForProject,
            blockers: challenges,
            learningNeeded: needed_learning,
            tomorrowPlan: tomorrow_build,
            extraMessage: extra_message ? stripHtml(extra_message) : undefined,
          });
          if (!r.ok && r.code !== "CONFLICT") {
            throw new Error(r.message);
          }
        })
      );
    }

    // 3. DM au boss
    const taskTitles = taskRows.map((r) => r.title);
    const bossChannel = process.env.SLACK_BOSS_USER_ID;
    if (bossChannel) {
      await postMessage({
        channel: bossChannel,
        iconEmoji: ":robot_face:",
        username: "Groot_Bot",
        blocks: [
          header("📅 Rapport Quotidien d'Activité"),
          section(`*👤 Nom :* ${full_name}\n*📁 Projets :* ${projects.join(", ")}`),
          divider,
          section(
            `*✅ Tâches validées :*\n${
              taskTitles.length > 0 ? taskTitles.map((t) => `• ${t}`).join("\n") : "_Aucune_"
            }`
          ),
          ...(extra_message && stripHtml(extra_message).length > 0
            ? [section(`*💬 Message :*\n${stripHtml(extra_message)}`)]
            : []),
          section(`*🚧 Challenges :*\n${stripHtml(challenges) || "_Non renseigné_"}`),
          section(`*🎯 À apprendre :*\n${stripHtml(needed_learning) || "_Non renseigné_"}`),
          section(`*🚀 Objectif demain :*\n${stripHtml(tomorrow_build) || "_Non renseigné_"}`),
          divider,
          actionButton("📊 Voir le dashboard", `${process.env.NEXTAUTH_URL ?? ""}/dashboard`),
        ],
      });
    }

    return { success: true };
  } catch (e) {
    console.error("[sendToSlack]", e);
    return { success: false };
  }
}

// ── checkAlreadySubmitted ───────────────────────────────────────────────

export async function checkAlreadySubmitted(team_id: string) {
  const res = await reportsCore.hasSubmittedOn(formMember(team_id), {
    memberId: team_id,
  });
  return res.ok && res.data.submitted;
}

// ── searchNames ─────────────────────────────────────────────────────────

export async function searchNames(query: string) {
  const res = await membersCore.search(SYSTEM, query, 5);
  if (!res.ok) return [];
  return res.data.map((r) => ({ id: r.id, full_name: r.fullName }));
}

// ── isNameInTeam ────────────────────────────────────────────────────────

export async function isNameInTeam(team_id: string) {
  const found = await prisma.member.findFirst({
    where: { id: team_id, isBoss: false, isActive: true },
    select: { id: true },
  });
  return found !== null;
}

// ── getMissingMembers ───────────────────────────────────────────────────

export async function getMissingMembers() {
  const res = await reportsCore.missingMembers(SYSTEM, {});
  if (!res.ok) return [];
  return res.data.map((m) => ({
    full_name: m.fullName,
    slack_id: m.slackId ?? "",
  }));
}
