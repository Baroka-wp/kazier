/**
 * Mince client Slack — un seul endroit qui fait des fetch vers Slack.
 * Reste sans état, sans cache. Sert tous les usages (DM, channel, summary).
 */

const SLACK_API = "https://slack.com/api/chat.postMessage";

export type SlackBlock = Record<string, unknown>;

export type PostMessageInput = {
  channel: string;
  blocks?: SlackBlock[];
  text?: string;
  username?: string;
  iconEmoji?: string;
};

export async function postMessage(input: PostMessageInput): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.warn("[slack.postMessage] SLACK_BOT_TOKEN missing — message dropped");
    return;
  }
  try {
    const res = await fetch(SLACK_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        channel: input.channel,
        blocks: input.blocks,
        text: input.text ?? "",
        username: input.username ?? "Groot Bot",
        icon_emoji: input.iconEmoji ?? ":robot_face:",
      }),
    });
    const json = (await res.json()) as { ok: boolean; error?: string };
    if (!json.ok) console.error("[slack.postMessage] error:", json.error, "channel:", input.channel);
  } catch (e) {
    console.error("[slack.postMessage] threw:", e);
  }
}

/** Helpers pour construire des blocks fréquents. */

export function header(text: string): SlackBlock {
  return { type: "header", text: { type: "plain_text", text, emoji: true } };
}
export function section(markdown: string): SlackBlock {
  return { type: "section", text: { type: "mrkdwn", text: markdown } };
}
export const divider: SlackBlock = { type: "divider" };
export function actionButton(label: string, url: string, style: "primary" | "danger" = "primary"): SlackBlock {
  return {
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: label, emoji: true },
        style,
        url,
      },
    ],
  };
}

/** Strip basique des balises HTML — entrées TipTap sont du HTML quand serveur. */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

/** URL absolue vers une route de l'app pour les boutons Slack. */
export function appUrl(path: string): string {
  const base = (process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_FORM_URL ?? "").replace(
    /\/$/,
    ""
  );
  const p = path.startsWith("/") ? path : `/${path}`;
  return base + p;
}
