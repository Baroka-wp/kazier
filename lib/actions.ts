"use server";

import { prisma } from "./prisma";

// Nettoyer les balises HTML
function stripHtml(html: string) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

// Récupérer tous les projets
export async function getProjectsByMember(team_id: number) {
  const result = await prisma.project.findMany({
    where: {
      team_ids: {
        has: team_id,
      },
    },
    select: {
      id: true,
      name: true,
      description: true,
      icon: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return result.map((r) => ({
    id: r.id,
    name: r.name || "",
    description: r.description || "",
    icon: r.icon || "",
  }));
}

// Récupérer les tâches assignées au membre
export async function getTasksByMember(team_id: number) {
  const result = await prisma.tasks.findMany({
    where: {
      assigned_to: {
        has: team_id,
      },
      status: {
        not: "terminée",
      },
    },
    include: {
      project: {
        select: {
          name: true,
          icon: true,
        },
      },
    },
    orderBy: {
      due_date: "asc",
    },
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

// Envoyer le rapport à Slack et l'enregistrer dans Neon
export async function sendToSlack(data: {
  team_id: number;
  full_name: string;
  projects: string[];
  validated_tasks: number[];
  challenges: string;
  needed_learning: string;
  tomorrow_build: string;
}) {
  const {
    team_id,
    full_name,
    projects,
    validated_tasks,
    challenges,
    needed_learning,
    tomorrow_build,
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
    // ── INSERT rapports ────────────────────────────────────────────────────
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
        },
      });
    } else {
      await Promise.all(inserts);
    }

    // ── Mise à jour statut tâches → "review" ──────────────────────────────
    if (validated_tasks.length > 0) {
      await prisma.tasks.updateMany({
        where: { id: { in: validated_tasks } },
        data: { status: "review" },
      });
    }

    // ── Envoi Slack au Boss ────────────────────────────────────────────────
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

    // ── Notification review au Boss + TM des projets ───────────────────────
    if (validated_tasks.length > 0) {
      const reviewMessage = {
        username: "Groot_Bot",
        icon_emoji: ":eyes:",
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "👀 Tâches en attente de review" },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${full_name}* vient de soumettre son rapport.\nLes tâches suivantes sont maintenant en *review* :`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: taskTitles.map((t) => `• ${t}`).join("\n"),
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `👉 *Merci d'aller consulter et valider ces tâches dans l'application.*`,
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "📋 Voir les tâches" },
                url: `${process.env.NEXTAUTH_URL}/dashboard/tasks`,
                style: "primary",
              },
            ],
          },
        ],
      };

      // Récupérer tous les team_ids des projets concernés
      const projectIds = projectRows.map((p) => p.id);
      const projectsWithTeams = await prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: { team_ids: true },
      });

      const allTeamIds = [...new Set(projectsWithTeams.flatMap((p) => p.team_ids))];

      // Parmi ces membres, récupérer ceux qui ont le rôle "TM" via users
      const tmMembers =
        allTeamIds.length > 0
          ? await prisma.teams.findMany({
              where: {
                id: { in: allTeamIds },
                slack_id: { not: null },
                users: {
                  some: { role: "TM" },
                },
              },
              select: { slack_id: true },
            })
          : [];

      // Destinataires : SA + TM uniques
      const recipients = [
        ...new Set([
          process.env.SLACK_BOSS_USER_ID!,
          ...tmMembers.map((m) => m.slack_id).filter((id): id is string => id !== null),
        ]),
      ];

      await Promise.all(
        recipients.map((channel) =>
          fetch("https://slack.com/api/chat.postMessage", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
            },
            body: JSON.stringify({ ...reviewMessage, channel }),
          })
        )
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Erreur détaillée :", error);
    return { success: false };
  }
}

// Vérifier si un rapport a déjà été soumis aujourd'hui
export async function checkAlreadySubmitted(team_id: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result = await prisma.rapports.findFirst({
    where: {
      team_id,
      created_at: {
        gte: today,
        lt: tomorrow,
      },
    },
    select: {
      id: true,
    },
  });

  return result !== null;
}

// Recherche de membres pour l'autocomplétion
export async function searchNames(query: string) {
  if (!query || query.trim().length < 2) return [];

  const result = await prisma.teams.findMany({
    where: {
      OR: [
        {
          first_name: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          last_name: {
            contains: query,
            mode: "insensitive",
          },
        },
      ],
    },
    select: {
      id: true,
      first_name: true,
      last_name: true,
    },
    orderBy: {
      first_name: "asc",
    },
    take: 5,
  });

  return result.map((r) => ({
    id: r.id,
    full_name: `${r.first_name || ""} ${r.last_name || ""}`.trim(),
  }));
}

// Vérifier si le team_id existe dans la table teams
export async function isNameInTeam(team_id: number) {
  const result = await prisma.teams.findFirst({
    where: {
      id: team_id,
      is_boss: false,
    },
    select: {
      id: true,
    },
  });

  return result !== null;
}

// Récupérer les membres qui n'ont pas soumis leur rapport aujourd'hui
export async function getMissingMembers() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Récupérer tous les membres qui ne sont pas boss
  const allMembers = await prisma.teams.findMany({
    where: {
      is_boss: false,
    },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      slack_id: true,
    },
    orderBy: {
      first_name: "asc",
    },
  });

  // Récupérer les IDs des membres qui ont soumis aujourd'hui
  const submittedToday = await prisma.rapports.findMany({
    where: {
      created_at: {
        gte: today,
        lt: tomorrow,
      },
    },
    select: {
      team_id: true,
    },
    distinct: ["team_id"],
  });

  const submittedIds = new Set(submittedToday.map((r) => r.team_id).filter(Boolean));

  // Filtrer les membres qui n'ont pas soumis
  return allMembers
    .filter((m) => !submittedIds.has(m.id))
    .map((r) => ({
      full_name: `${r.first_name || ""} ${r.last_name || ""}`.trim(),
      slack_id: r.slack_id || "",
    }));
}
