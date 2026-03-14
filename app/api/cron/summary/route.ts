import { prisma } from "@/lib/prisma";

export async function GET() {
  // Date du jour
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Membres ayant soumis aujourd'hui
  const submitted = await prisma.rapports.findMany({
    where: {
      created_at: {
        gte: today,
        lt: tomorrow,
      },
    },
    include: {
      team: {
        select: {
          first_name: true,
          last_name: true,
        },
      },
    },
    orderBy: [
      { team: { first_name: 'asc' } },
      { team: { last_name: 'asc' } },
    ],
  });

  // IDs des membres ayant soumis
  const submittedIds = submitted.map(r => r.team_id).filter((id): id is number => id !== null);

  // Membres qui n'ont pas soumis
  const missing = await prisma.teams.findMany({
    where: {
      is_boss: false,
      ...(submittedIds.length > 0 ? { id: { notIn: submittedIds } } : {}),
    },
    select: {
      first_name: true,
      last_name: true,
    },
    orderBy: [
      { first_name: 'asc' },
      { last_name: 'asc' },
    ],
  });

  const date = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  const message = missing.length === 0
    ? `✅ *Bilan du ${date}*\n\nTout le monde a soumis son rapport aujourd'hui ! 🎉`
    : `📊 *Bilan du ${date}*\n\n✅ *Ont soumis (${submitted.length}) :*\n${submitted.map(m => `• ${m.team?.first_name} ${m.team?.last_name}`).join("\n")}\n\n❌ *N'ont pas soumis (${missing.length}) :*\n${missing.map(m => `• ${m.first_name} ${m.last_name}`).join("\n")}`;

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify({
      channel: process.env.SLACK_BOSS_USER_ID,
      text: message,
    }),
  });

  const data = await res.json();
  if (!data.ok) return Response.json({ error: data.error }, { status: 500 });
  return Response.json({ success: true });
}