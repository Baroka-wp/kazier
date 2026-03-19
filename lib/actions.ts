"use server";

import { prisma } from "./prisma";

function stripHtml(html: string) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

export async function getProjectsByMember(team_id: number) {
  const result = await prisma.project.findMany({
    where: { team_ids: { has: team_id } },
    select: { id: true, name: true, description: true, icon: true },
    orderBy: { name: "asc" },
  });
  return result.map((r) => ({
    id: r.id,
    name: r.name || "",
    description: r.description || "",
    icon: r.icon || "",
  }));
}

export async function getTasksByMember(team_id: number) {
  const result = await prisma.tasks.findMany({
    where: {
      assigned_to: { has: team_id },
      status: { not: "terminée" },
    },
    include: {
      project: { select: { name: true, icon: true } },
    },
    orderBy: { due_date: "asc" },
  });
  return result.map((t) => ({
    id: t.id,
    title: t.title || "",
    description: t.description || "",
    status: t.status || "",
    priority: t.priority || "",
    due_date: t.due_date ? t.due_date.toISOString().split("T")[0] : null,
    project_id: t.project_id || 0,
    project_name: t.project?.name || "",
    project_icon: t.project?.icon || "",
  }));
}

// ── Nouveauté : récupérer les coéquipiers des projets sélectionnés ─────────────
export async function getTeammatesByProjects(
  project_ids: number[],
  current_team_id: number
): Promise<{ id: number; full_name: string }[]> {
  if (project_ids.length === 0) return [];

  // Les projets ont un champ team_ids (array d'ids)
  const projects = await prisma.project.findMany({
    where: { id: { in: project_ids } },
    select: { team_ids: true },
  });

  // Collecter tous les ids uniques, sauf le membre courant
  const allIds = new Set<number>();
  for (const p of projects) {
    for (const id of p.team_ids ?? []) {
      if (id !== current_team_id) allIds.add(id);
    }
  }

  if (allIds.size === 0) return [];

  const members = await prisma.teams.findMany({
    where: { id: { in: Array.from(allIds) }, is_boss: false },
    select: { id: true, first_name: true, last_name: true },
    orderBy: { first_name: "asc" },
  });

  return members.map((m) => ({
    id: m.id,
    full_name: `${m.first_name || ""} ${m.last_name || ""}`.trim(),
  }));
}

// ── Nouveauté : sauvegarder les évaluations ────────────────────────────────────
export async function saveEvaluations(
  evaluator_id: number,
  evaluations: {
    evaluated_id: number;
    communication: number;
    collaboration: number;
    punctuality: number;
    comment: string;
  }[]
) {
  if (evaluations.length === 0) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await Promise.all(
    evaluations.map((e) =>
      prisma.evaluation.upsert({
        where: {
          evaluator_id_evaluated_id_report_date: {
            evaluator_id,
            evaluated_id: e.evaluated_id,
            report_date: today,
          },
        },
        update: {
          communication: e.communication,
          collaboration: e.collaboration,
          punctuality: e.punctuality,
          comment: stripHtml(e.comment) || null,
        },
        create: {
          evaluator_id,
          evaluated_id: e.evaluated_id,
          report_date: today,
          communication: e.communication,
          collaboration: e.collaboration,
          punctuality: e.punctuality,
          comment: stripHtml(e.comment) || null,
        },
      })
    )
  );
}

export async function sendToSlack(data: {
  team_id: number;
  full_name: string;
  projects: string[];
  validated_tasks: number[];
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

  const taskRows =
    validated_tasks.length > 0
      ? await prisma.tasks.findMany({
          where: { id: { in: validated_tasks } },
          select: { id: true, title: true, project_id: true },
        })
      : [];

  const taskTitles = taskRows.map((r) => r.title || "");

  const projectRows =
    projects.length > 0
      ? await prisma.project.findMany({
          where: { name: { in: projects } },
          select: { id: true, name: true },
        })
      : [];

  const slackPayload = {
    username: "Groot_Bot",
    icon_emoji: ":robot_face:",
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "📅 Rapport Quotidien d'Activité" },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*👤 Nom :* ${full_name}\n*📁 Projets :* ${projects.join(", ")}`,
        },
      },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*✅ Tâches validées :*\n${
            taskTitles.length > 0 ? taskTitles.map((t) => `• ${t}`).join("\n") : "_Aucune_"
          }`,
        },
      },
      ...(extra_message && stripHtml(extra_message).length > 0
        ? [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*💬 Message :*\n${stripHtml(extra_message)}`,
              },
            },
          ]
        : []),
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*🚧 Challenges :*\n${stripHtml(challenges) || "_Non renseigné_"}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*🎯 À apprendre :*\n${stripHtml(needed_learning) || "_Non renseigné_"}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*🚀 Objectif demain :*\n${stripHtml(tomorrow_build) || "_Non renseigné_"}`,
        },
      },
      { type: "divider" },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "📊 Voir le dashboard" },
            url: `${process.env.NEXTAUTH_URL}/dashboard`,
            style: "primary",
          },
        ],
      },
    ],
  };

  try {
    const inserts = projectRows.map((p) => {
      const projectTaskTitles = taskRows
        .filter((t) => t.project_id === p.id)
        .map((t) => `• ${t.title}`)
        .join("\n");

      return prisma.rapports.create({
        data: {
          team_id,
          project_id: p.id,
          working_built: projectTaskTitles,
          validated_learning: "",
          broken_features: challenges ?? "",
          needed_learning: needed_learning ?? "",
          tomorrow_build: tomorrow_build ?? "",
          extra_message: extra_message ? stripHtml(extra_message) : "",
        },
      });
    });

    if (inserts.length === 0) {
      await prisma.rapports.create({
        data: {
          team_id,
          project_id: null,
          working_built: "",
          validated_learning: "",
          broken_features: challenges ?? "",
          needed_learning: needed_learning ?? "",
          tomorrow_build: tomorrow_build ?? "",
          extra_message: extra_message ? stripHtml(extra_message) : "",
        },
      });
    } else {
      await Promise.all(inserts);
    }

    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      },
      body: JSON.stringify({
        ...slackPayload,
        channel: process.env.SLACK_BOSS_USER_ID,
      }),
    });

    const result = await response.json();
    if (!result.ok) throw new Error(`Slack DM failed: ${result.error}`);

    return { success: true };
  } catch (error) {
    console.error("Erreur détaillée :", error);
    return { success: false };
  }
}

export async function checkAlreadySubmitted(team_id: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result = await prisma.rapports.findFirst({
    where: {
      team_id,
      created_at: { gte: today, lt: tomorrow },
    },
    select: { id: true },
  });

  return result !== null;
}

export async function searchNames(query: string) {
  if (!query || query.trim().length < 2) return [];

  const result = await prisma.teams.findMany({
    where: {
      OR: [
        { first_name: { contains: query, mode: "insensitive" } },
        { last_name: { contains: query, mode: "insensitive" } },
      ],
    },
    select: { id: true, first_name: true, last_name: true },
    orderBy: { first_name: "asc" },
    take: 5,
  });

  return result.map((r) => ({
    id: r.id,
    full_name: `${r.first_name || ""} ${r.last_name || ""}`.trim(),
  }));
}

export async function isNameInTeam(team_id: number) {
  const result = await prisma.teams.findFirst({
    where: { id: team_id, is_boss: false },
    select: { id: true },
  });
  return result !== null;
}

export async function getMissingMembers() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const allMembers = await prisma.teams.findMany({
    where: { is_boss: false },
    select: { id: true, first_name: true, last_name: true, slack_id: true },
    orderBy: { first_name: "asc" },
  });

  const submittedToday = await prisma.rapports.findMany({
    where: { created_at: { gte: today, lt: tomorrow } },
    select: { team_id: true },
    distinct: ["team_id"],
  });

  const submittedIds = new Set(submittedToday.map((r) => r.team_id).filter(Boolean));

  return allMembers
    .filter((m) => !submittedIds.has(m.id))
    .map((r) => ({
      full_name: `${r.first_name || ""} ${r.last_name || ""}`.trim(),
      slack_id: r.slack_id || "",
    }));
}
