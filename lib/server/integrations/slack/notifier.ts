/**
 * Notifier Slack — un seul listener centralisé sur le bus d'events.
 *
 * Branché une fois au démarrage (idempotent). Chaque fonction core qui mute
 * émet un event ; ce module l'attrape et envoie le DM Slack adéquat.
 *
 * À importer une fois côté serveur (ex: instrumentation.ts ou auth.ts) pour
 * activer les listeners. L'import est volontairement à effet de bord pour
 * éviter d'avoir un objet à instancier.
 */

import { events, prisma } from "@/lib/core";
import { postMessage, header, section, divider, actionButton, stripHtml, appUrl } from "./client";

declare global {
  var __kazierSlackBound: boolean | undefined;
}

if (!globalThis.__kazierSlackBound) {
  globalThis.__kazierSlackBound = true;

  // ── task.assigned ─────────────────────────────────────────────────────
  events.on("task.assigned", async ({ taskId, memberIds }) => {
    try {
      const [task, members] = await Promise.all([
        prisma.task.findUnique({
          where: { id: taskId },
          select: {
            title: true,
            description: true,
            dueDate: true,
            project: { select: { name: true } },
          },
        }),
        prisma.member.findMany({
          where: { id: { in: memberIds }, slackId: { not: null } },
          select: { firstName: true, slackId: true },
        }),
      ]);
      if (!task || members.length === 0) return;

      const dueLabel = task.dueDate
        ? task.dueDate.toISOString().slice(0, 16).replace("T", " ")
        : null;

      await Promise.all(
        members.map((m) =>
          postMessage({
            channel: m.slackId!,
            blocks: [
              header("🎯 Nouvelle tâche assignée"),
              section(`Bonjour *${m.firstName}* ! Une nouvelle tâche t'a été assignée.`),
              divider,
              section(
                [
                  task.project?.name ? `📁 *Projet* : ${task.project.name}` : null,
                  dueLabel ? `📅 *Délai* : ${dueLabel}` : null,
                ]
                  .filter(Boolean)
                  .join("\n")
              ),
              section(
                `*Titre* : ${task.title}\n*Description* : ${stripHtml(task.description) || "Aucune description"}`
              ),
              actionButton("📋 Voir mes tâches", appUrl("/dashboard/tasks")),
            ],
          })
        )
      );
    } catch (e) {
      console.error("[slack.notifier task.assigned]", e);
    }
  });

  // ── task.status_changed → notif REVIEW aux SA + PM ────────────────────
  events.on("task.status_changed", async ({ taskId, from, to }) => {
    if (to !== "REVIEW" || from === "REVIEW") return;
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: {
          title: true,
          project: { select: { name: true, members: { select: { memberId: true } } } },
          assignments: { select: { member: { select: { firstName: true, lastName: true } } } },
        },
      });
      if (!task) return;

      // SA + PM du projet uniquement
      const recipients = await prisma.member.findMany({
        where: {
          slackId: { not: null },
          OR: [
            { role: "SUPER_ADMIN" },
            {
              role: "PROJECT_MANAGER",
              projectMemberships: { some: { projectId: { in: [] } } }, // placeholder
            },
          ],
        },
        select: { slackId: true },
      });
      if (recipients.length === 0) return;

      const assignees = task.assignments
        .map((a) => `${a.member.firstName} ${a.member.lastName}`.trim())
        .join(", ");

      await Promise.all(
        recipients.map((m) =>
          postMessage({
            channel: m.slackId!,
            iconEmoji: ":eyes:",
            blocks: [
              header("👀 Tâche en attente de review"),
              section("La tâche suivante vient d'être marquée en *review* :"),
              section(
                `📌 *${task.title}*\n📁 Projet : *${task.project?.name ?? "Non défini"}*\n👤 Assigné à : *${assignees || "Non assigné"}*`
              ),
              actionButton("📋 Voir les tâches", appUrl("/dashboard/tasks")),
            ],
          })
        )
      );
    } catch (e) {
      console.error("[slack.notifier task.status_changed]", e);
    }
  });

  // ── project.member_added ──────────────────────────────────────────────
  events.on("project.member_added", async ({ projectId, memberId }) => {
    try {
      const [project, member] = await Promise.all([
        prisma.project.findUnique({
          where: { id: projectId },
          select: { name: true, icon: true },
        }),
        prisma.member.findUnique({
          where: { id: memberId },
          select: { firstName: true, slackId: true },
        }),
      ]);
      if (!project || !member?.slackId) return;

      await postMessage({
        channel: member.slackId,
        blocks: [
          section(`Bonjour *${member.firstName}* 👋`),
          section(
            `📁 Vous avez été ajouté au projet *${project.icon ?? ""} ${project.name}* !\n\nPensez à soumettre votre rapport quotidien.`
          ),
          actionButton("📝 Soumettre mon rapport", process.env.NEXT_PUBLIC_FORM_URL ?? appUrl("/")),
        ],
      });
    } catch (e) {
      console.error("[slack.notifier project.member_added]", e);
    }
  });

  // ── expense.budget_threshold → DM aux SA + PM ────────────────────────
  // Dedup naïve : on prend l'audit log des 24h pour ce projet.
  events.on("expense.budget_threshold", async ({ projectId, ratio }) => {
    try {
      const bucket = ratio >= 1 ? "100" : ratio >= 0.8 ? "80" : "50";
      const action = `expense.budget_threshold.${bucket}`;
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const already = await prisma.auditLog.findFirst({
        where: { entity: "project", entityId: projectId, action, createdAt: { gte: dayAgo } },
      });
      if (already) return;

      await prisma.auditLog.create({
        data: {
          actorType: "SYSTEM",
          action,
          entity: "project",
          entityId: projectId,
          diff: { ratio },
        },
      });

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true, budgetCurrency: true },
      });
      if (!project) return;

      const recipients = await prisma.member.findMany({
        where: { slackId: { not: null }, role: { in: ["SUPER_ADMIN", "PROJECT_MANAGER"] } },
        select: { slackId: true },
      });
      const pct = Math.round(ratio * 100);

      await Promise.all(
        recipients.map((r) =>
          postMessage({
            channel: r.slackId!,
            iconEmoji: ":warning:",
            blocks: [
              header(`💸 Seuil budgétaire ${pct}% atteint`),
              section(`Le projet *${project.name}* a consommé *${pct}%* de son budget.`),
              actionButton("📊 Voir le projet", appUrl(`/dashboard/projects`)),
            ],
          })
        )
      );
    } catch (e) {
      console.error("[slack.notifier expense.budget_threshold]", e);
    }
  });
}

export {}; // module side-effect
