import { prisma, reports, systemActor, isOk } from "@/lib/core";
import { postMessage } from "@/lib/server/integrations/slack/client";

export async function GET() {
  const SYSTEM = systemActor("cron-summary");

  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");

  // Membres qui ont soumis aujourd'hui (raw query — pas besoin de tout le pipeline reports.list)
  const submittedReports = await prisma.report.findMany({
    where: { reportDate: today },
    include: { member: { select: { firstName: true, lastName: true } } },
    orderBy: { member: { firstName: "asc" } },
    distinct: ["memberId"],
  });

  const missingRes = await reports.missingMembers(SYSTEM, {});
  const missing = isOk(missingRes) ? missingRes.data : [];

  const dateLabel = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const message =
    missing.length === 0
      ? `✅ *Bilan du ${dateLabel}*\n\nTout le monde a soumis son rapport aujourd'hui ! 🎉`
      : `📊 *Bilan du ${dateLabel}*\n\n✅ *Ont soumis (${submittedReports.length}) :*\n${submittedReports
          .map((r) => `• ${r.member.firstName} ${r.member.lastName}`)
          .join("\n")}\n\n❌ *N'ont pas soumis (${missing.length}) :*\n${missing
          .map((m) => `• ${m.fullName}`)
          .join("\n")}`;

  const boss = process.env.SLACK_BOSS_USER_ID;
  if (!boss) {
    return Response.json({ error: "SLACK_BOSS_USER_ID not set" }, { status: 500 });
  }

  await postMessage({ channel: boss, text: message });
  return Response.json({ success: true });
}
