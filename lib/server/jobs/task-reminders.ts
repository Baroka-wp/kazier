/**
 * Cron job — rappel Slack à 80% de la fenêtre d'une tâche.
 *
 * Algorithme :
 *   - On considère uniquement les tâches non terminées / non en review,
 *     avec une dueDate et reminderSent=false.
 *   - On envoie le rappel quand `now` tombe dans une fenêtre ±30min autour
 *     du point "80% du temps total alloué entre createdAt et dueDate".
 *   - Une fois envoyé, on flag reminderSent=true pour ne plus renvoyer.
 *
 * Sécurité : appelé via /api/cron/task-reminders (à protéger par un secret
 * Vercel cron ou un Bearer dans une suite refactor).
 */

import { prisma } from "@/lib/core";
import { postMessage, header, section, actionButton, appUrl } from "@/lib/server/integrations/slack/client";

export async function sendTaskReminders(): Promise<{ sent: number }> {
  const now = new Date();
  const windowMs = 30 * 60 * 1000;

  const candidates = await prisma.task.findMany({
    where: {
      status: { notIn: ["DONE", "REVIEW", "CANCELLED"] },
      dueDate: { not: null },
      reminderSent: false,
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      dueDate: true,
      assignments: {
        select: { member: { select: { firstName: true, slackId: true } } },
      },
    },
  });

  let sent = 0;
  for (const task of candidates) {
    if (!task.dueDate) continue;
    const totalDuration = task.dueDate.getTime() - task.createdAt.getTime();
    if (totalDuration <= 0) continue;

    const reminderAt = new Date(task.createdAt.getTime() + totalDuration * 0.8);
    if (now < new Date(reminderAt.getTime() - windowMs)) continue;
    if (now > new Date(reminderAt.getTime() + windowMs)) continue;

    const recipients = task.assignments
      .map((a) => a.member)
      .filter((m): m is { firstName: string; slackId: string } => !!m.slackId);
    if (recipients.length === 0) continue;

    const timeLeft = task.dueDate.getTime() - now.getTime();
    const daysLeft = Math.floor(timeLeft / (24 * 60 * 60 * 1000));
    const hoursLeft = Math.round(timeLeft / (60 * 60 * 1000));
    const label = daysLeft >= 1 ? `${daysLeft} jour${daysLeft > 1 ? "s" : ""}` : `${hoursLeft} heure${hoursLeft > 1 ? "s" : ""}`;

    await Promise.all(
      recipients.map((m) =>
        postMessage({
          channel: m.slackId,
          iconEmoji: ":alarm_clock:",
          blocks: [
            header("⏰ Rappel de tâche"),
            section(`Bonjour *${m.firstName}* 👋\n\nLa tâche suivante approche de sa date limite :`),
            section(`📌 *${task.title}*\n⏳ Il vous reste *${label}* pour la compléter.\n🔔 Vous avez utilisé *80%* du temps imparti.`),
            actionButton("📋 Voir mes tâches", appUrl("/dashboard/tasks")),
          ],
        })
      )
    );

    await prisma.task.update({ where: { id: task.id }, data: { reminderSent: true } });
    sent++;
  }

  return { sent };
}
