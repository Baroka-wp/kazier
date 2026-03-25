function stripHtml(html: string) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

export async function notifyTaskComment({
  taskId,
  authorId,
  authorName,
  content,
}: {
  taskId: number;
  authorId: number;
  authorName: string;
  content: string;
}) {
  const { prisma } = await import("./prisma");

  // 🔽 récupérer la tâche
  const task = await prisma.tasks.findUnique({
    where: { id: taskId },
    select: {
      title: true,
      assigned_to: true,
    },
  });

  if (!task || !task.assigned_to?.length) return;

  // 🔽 récupérer les membres assignés (avec slack_id)
  const members = await prisma.teams.findMany({
    where: {
      id: { in: task.assigned_to },
      slack_id: { not: null },
      NOT: { id: authorId }, // ❌ exclure l'auteur
    },
    select: {
      id: true,
      first_name: true,
      slack_id: true,
    },
  });

  if (!members.length) return;

  // ✂️ tronquer commentaire
  const shortContent = content.length > 150 ? content.slice(0, 150) + "..." : content;

  // 🔔 envoi Slack
  await Promise.all(
    members.map((member) => {
      const blocks: object[] = [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "💬 Nouveau commentaire",
            emoji: true,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `💬 *${authorName}* a commenté la tâche *${task.title}*`,
          },
        },
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `📝 *Commentaire* :\n${stripHtml(shortContent)}`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "👀 Voir la tâche",
                emoji: true,
              },
              style: "primary",
              url: `${process.env.NEXT_PUBLIC_FORM_URL?.replace(/\/$/, "")}/dashboard/tasks/${taskId}`,
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
