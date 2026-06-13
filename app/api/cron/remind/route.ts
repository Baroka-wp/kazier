import { postMessage, section, actionButton } from "@/lib/server/integrations/slack/client";

export async function GET() {
  const channel = process.env.SLACK_CHANNEL_ID;
  if (!channel) {
    return Response.json({ error: "SLACK_CHANNEL_ID not set" }, { status: 500 });
  }

  await postMessage({
    channel,
    blocks: [
      section("📢 *Rappel quotidien !*\n\nN'oubliez pas de soumettre votre rapport du jour 👇"),
      actionButton("📝 Remplir le formulaire", process.env.NEXT_PUBLIC_FORM_URL ?? "/"),
    ],
  });
  return Response.json({ success: true });
}
