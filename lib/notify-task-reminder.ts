"use server";

import { prisma } from "./prisma";

export async function sendTaskReminders() {
  const now = new Date();

  const tasks = await prisma.tasks.findMany({
    where: {
      status: { notIn: ["terminée", "review"] },
      due_date: { not: null },
      reminder_sent: false,
    },
    select: {
      id: true,
      title: true,
      due_date: true,
      created_at: true,
      assigned_to: true,
      reminder_sent: true,
    },
  });

  for (const task of tasks) {
    if (!task.due_date || !task.created_at) continue;

    const created = new Date(task.created_at);
    const due = new Date(task.due_date);
    const totalDuration = due.getTime() - created.getTime();

    if (totalDuration <= 0) continue;

    // Date exacte à laquelle on atteint 80%
    const reminderDate = new Date(created.getTime() + totalDuration * 0.8);

    // Fenêtre de ±30 minutes autour du seuil de 80%
    const windowMs = 30 * 60 * 1000;
    const inWindow =
      now >= new Date(reminderDate.getTime() - windowMs) &&
      now <= new Date(reminderDate.getTime() + windowMs);

    if (!inWindow) continue;

    // Récupérer les membres assignés
    const assignedIds = Array.isArray(task.assigned_to) ? (task.assigned_to as number[]) : [];

    if (!assignedIds.length) continue;

    const members = await prisma.teams.findMany({
      where: {
        id: { in: assignedIds },
        slack_id: { not: null },
      },
      select: { slack_id: true, first_name: true },
    });

    if (!members.length) continue;

    // Calcul du temps restant
    const timeLeft = due.getTime() - now.getTime();
    const hoursLeft = Math.round(timeLeft / (1000 * 60 * 60));
    const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const timeLabel =
      daysLeft >= 1
        ? `${daysLeft} jour${daysLeft > 1 ? "s" : ""}`
        : `${hoursLeft} heure${hoursLeft > 1 ? "s" : ""}`;

    // Envoi Slack à chaque membre
    await Promise.all(
      members.map((m) =>
        fetch("https://slack.com/api/chat.postMessage", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          },
          body: JSON.stringify({
            channel: m.slack_id,
            username: "Groot_Bot",
            icon_emoji: ":alarm_clock:",
            blocks: [
              {
                type: "header",
                text: { type: "plain_text", text: "⏰ Rappel de tâche" },
              },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `Bonjour *${m.first_name}* 👋\n\nLa tâche suivante approche de sa date limite :`,
                },
              },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `📌 *${task.title}*\n⏳ Il vous reste *${timeLabel}* pour la compléter.\n🔔 Vous avez utilisé *80%* du temps imparti.`,
                },
              },
              {
                type: "actions",
                elements: [
                  {
                    type: "button",
                    text: { type: "plain_text", text: "📋 Voir mes tâches" },
                    url: `${process.env.NEXTAUTH_URL}/dashboard/tasks`,
                    style: "primary",
                  },
                ],
              },
            ],
          }),
        })
      )
    );

    // Marquer comme rappel envoyé pour ne plus renvoyer
    await prisma.tasks.update({
      where: { id: task.id },
      data: { reminder_sent: true },
    });
  }
}
// **La logique du timing expliquée :**

// created_at ──────────────────80%────────────due_date
//                           ↑
//                     reminderDate

//            [──────30min──────|──────30min──────]
//                         fenêtre OK

//                         ---
