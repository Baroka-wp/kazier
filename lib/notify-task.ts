/**
 * Envoie un DM Slack à chaque membre assigné à une tâche
 */
export async function notifyTaskAssigned({
  assignedIds,
  taskTitle,
  taskDescription,
  projectName,
  dueDate,
}: {
  assignedIds: number[];
  taskTitle: string;
  taskDescription?: string;
  projectName?: string;
  dueDate?: string | null;
}) {
  if (!assignedIds.length) return;

  const { prisma } = await import("./prisma");

  const members = await prisma.teams.findMany({
    where: {
      id: { in: assignedIds },
      slack_id: { not: null },
    },
    select: {
      first_name: true,
      last_name: true,
      slack_id: true,
    },
  });

  if (!members.length) return;

  await Promise.all(
    members.map((member) => {
      const fields = [
        ...(projectName ? [{ type: "mrkdwn", text: `📁 *Projet* : ${projectName}` }] : []),
        ...(dueDate ? [{ type: "mrkdwn", text: `📅 *Délai* : ${dueDate}` }] : []),
      ];

      const blocks: object[] = [
        // ── En-tête ──────────────────────────────────────────────
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🎯 Nouvelle tâche assignée",
            emoji: true,
          },
        },

        // ── Intro ─────────────────────────────────────────────────
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Bonjour *${member.first_name}* ! Une nouvelle tâche t'a été assignée !`,
          },
        },

        { type: "divider" },

        // ── Projet + Deadline en colonnes ─────────────────────────
        ...(fields.length > 0 ? [{ type: "section", fields }] : []),

        { type: "divider" },

        // ── Titre + description ───────────────────────────────────
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Titre* : ${taskTitle}\n*Description* : ${taskDescription || "Aucune description"}`,
          },
        },

        // ── Bouton ────────────────────────────────────────────────
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "📋 Voir mes tâches",
                emoji: true,
              },
              style: "primary",
              url: `${process.env.NEXT_PUBLIC_FORM_URL?.replace(/\/$/, "")}/dashboard`,
            },
          ],
        },
      ];

      return fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        },
        body: JSON.stringify({
          channel: member.slack_id,
          username: "Groot Bot",
          icon_emoji: ":robot_face:",
          blocks,
        }),
      });
    })
  );
}
