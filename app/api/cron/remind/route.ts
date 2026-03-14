export async function GET() {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify({
      channel: process.env.SLACK_CHANNEL_ID,
      username: "Groot Bot",
      icon_emoji: ":robot_face:",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `📢 *Rappel quotidien !*\n\nN'oubliez pas de soumettre votre rapport du jour 👇`,
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
  });

  const data = await res.json();

  if (!data.ok) {
    return Response.json({ error: data.error }, { status: 500 });
  }

  return Response.json({ success: true });
}