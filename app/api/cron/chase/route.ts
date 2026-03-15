import { prisma } from "@/lib/prisma";

export async function GET() {
  // Date du jour
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // IDs des membres ayant soumis aujourd'hui
  const submittedToday = await prisma.rapports.findMany({
    where: {
      created_at: {
        gte: today,
        lt: tomorrow,
      },
    },
    select: { team_id: true },
    distinct: ["team_id"],
  });

  const submittedIds = submittedToday
    .map((r) => r.team_id)
    .filter((id): id is number => id !== null);

  // Récupère les membres qui n'ont pas soumis aujourd'hui
  const missing = await prisma.teams.findMany({
    where: {
      slack_id: { not: null },
      is_boss: false,
      ...(submittedIds.length > 0 ? { id: { notIn: submittedIds } } : {}),
    },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      slack_id: true,
    },
  });

  if (missing.length === 0) {
    return Response.json({ message: "Tout le monde a soumis ✅" });
  }

  // Envoie un DM à chaque absent
  await Promise.all(
    missing.map((member) =>
      fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        },
        body: JSON.stringify({
          channel: member.slack_id,
          username: "Groot Bot",
          icon_emoji: ":robot_face:",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `👋 *${member.first_name} ${member.last_name}*, tu n'as pas encore soumis ton rapport du jour !\n\n_Il te reste encore un peu de temps !_ ⏰`,
              },
            },
            {
              type: "actions",
              elements: [
                {
                  type: "button",
                  text: {
                    type: "plain_text",
                    text: "📝 Remplir le formulaire",
                    emoji: true,
                  },
                  style: "primary",
                  url: process.env.NEXT_PUBLIC_FORM_URL,
                },
              ],
            },
          ],
        }),
      })
    )
  );

  return Response.json({ notified: missing.map((m) => `${m.first_name} ${m.last_name}`) });
}
