import { reports, systemActor, isOk } from "@/lib/core";
import {
  postMessage,
  section,
  actionButton,
} from "@/lib/server/integrations/slack/client";

export async function GET() {
  const SYSTEM = systemActor("cron-chase");
  const res = await reports.missingMembers(SYSTEM, {});
  if (!isOk(res)) {
    return Response.json({ error: res.message }, { status: 500 });
  }

  const missing = res.data.filter((m) => m.slackId);
  if (missing.length === 0) {
    return Response.json({ message: "Tout le monde a soumis ✅" });
  }

  await Promise.all(
    missing.map((m) =>
      postMessage({
        channel: m.slackId!,
        blocks: [
          section(
            `👋 *${m.fullName}*, tu n'as pas encore soumis ton rapport du jour !\n\n_Il te reste encore un peu de temps !_ ⏰`
          ),
          actionButton(
            "📝 Remplir le formulaire",
            process.env.NEXT_PUBLIC_FORM_URL ?? "/"
          ),
        ],
      })
    )
  );

  return Response.json({ notified: missing.map((m) => m.fullName) });
}
