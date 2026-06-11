import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── Vérification signature Slack ──────────────────────────────────────────────

async function verifySlackSignature(req: NextRequest, rawBody: string): Promise<boolean> {
  try {
    const signingSecret = process.env.SLACK_SIGNING_SECRET!;
    const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";
    const slackSig = req.headers.get("x-slack-signature") ?? "";

    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

    const baseString = `v0:${timestamp}:${rawBody}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(signingSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(baseString));
    const hexSig =
      "v0=" +
      Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    return hexSig === slackSig;
  } catch {
    return false;
  }
}

// ── Envoyer un DM Slack ───────────────────────────────────────────────────────

async function sendDM(slackUserId: string, blocks: object[], text: string) {
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel: slackUserId, text, blocks }),
  });
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const contentType = req.headers.get("content-type") ?? "";

  // Parser le body une seule fois
  let payload: {
    type?: string;
    challenge?: string;
    event?: { type?: string; user?: { id?: string; profile?: { email?: string } } };
    actions?: Array<{ action_id?: string; value?: string }>;
    user?: { id?: string };
  };
  if (contentType.includes("application/json")) {
    payload = JSON.parse(rawBody);
  } else {
    const params = new URLSearchParams(rawBody);
    const raw = params.get("payload");
    payload = raw ? JSON.parse(raw) : {};
  }

  // ── Challenge Slack (vérification URL) — avant tout ──────────────────────
  if (payload.type === "url_verification") {
    return NextResponse.json({ challenge: payload.challenge });
  }

  // ── Vérification signature pour tout le reste ─────────────────────────────
  // const isValid = await verifySlackSignature(req, rawBody);

  // Pour les tests, on peut désactiver la vérification de la signature Slack en définissant SKIP_SLACK_SIGNATURE à "true"
  const isValid =
    process.env.SKIP_SLACK_SIGNATURE === "true" || (await verifySlackSignature(req, rawBody));
  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // ── Event : team_join ─────────────────────────────────────────────────────
  if (payload.type === "event_callback" && payload.event?.type === "team_join") {
    const slackUser = payload.event.user;
    if (!slackUser) return NextResponse.json({ ok: true });

    const slackId = slackUser.id;
    if (!slackId) return NextResponse.json({ ok: true });

    const email = slackUser.profile?.email ?? "";

    if (!email) return NextResponse.json({ ok: true });

    const authRecord = await prisma.auth.findFirst({
      where: {
        email: {
          equals: email.trim(),
          mode: "insensitive",
        },
      },
      include: {
        member: true,
      },
    });

    if (!authRecord || !authRecord.member) {
      await sendDM(
        slackId,
        [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `Bienvenue dans le workspace *Africa Samurai* ! 👋\n\nNous n'avons pas trouvé votre profil. Contactez votre responsable.`,
            },
          },
        ],
        "Bienvenue !"
      );
      return NextResponse.json({ ok: true });
    }

    const member = {
      id: authRecord.member.id,
      first_name: authRecord.member.firstName,
      last_name: authRecord.member.lastName,
      slack_id: authRecord.member.slackId,
    };

    // Déjà un slack_id → simple message de bienvenue
    if (member.slack_id) {
      await sendDM(
        slackId,
        [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `Bienvenue *${member.first_name}* ! 👋\n\nContent de vous revoir sur le workspace Africa Samurai.`,
            },
          },
        ],
        `Bienvenue ${member.first_name} !`
      );
      return NextResponse.json({ ok: true });
    }

    // Nouveau membre → DM avec bouton confirmation
    await sendDM(
      slackId,
      [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Bienvenue dans le workspace *Africa Samurai* ! 👋\n\nÊtes-vous bien *${member.first_name} ${member.last_name}* ?`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "✅ Oui, c'est moi !" },
              style: "primary",
              action_id: "confirm_identity",
              value: JSON.stringify({ team_id: member.id, slack_user_id: slackId }),
            },
            {
              type: "button",
              text: { type: "plain_text", text: "❌ Ce n'est pas moi" },
              action_id: "deny_identity",
              value: "deny",
            },
          ],
        },
      ],
      `Bienvenue ! Êtes-vous ${member.first_name} ${member.last_name} ?`
    );

    return NextResponse.json({ ok: true });
  }

  // ── Event : block_actions (clic bouton) ───────────────────────────────────
  if (payload.type === "block_actions") {
    const action = payload.actions?.[0];
    const slackUserId = payload.user?.id;

    if (!action || !slackUserId) return NextResponse.json({ ok: true });

    // Bouton "C'est moi"
    if (action.action_id === "confirm_identity") {
      try {
        const parsed = JSON.parse(action.value ?? "{}");
        const teamId = parsed.team_id;
        const slackId = parsed.slack_user_id;

        if (!teamId || !slackId) {
          return NextResponse.json({ ok: true });
        }

        await prisma.member.update({
          where: { id: teamId },
          data: { slackId: slackId },
        });

        await sendDM(
          slackUserId,
          [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `Parfait ! ✅ Votre identité a été confirmée et votre Slack ID enregistré.\n\nVous recevrez désormais vos rappels quotidiens ici. Bonne journée ! 🚀`,
              },
            },
            {
              type: "actions",
              elements: [
                {
                  type: "button",
                  text: { type: "plain_text", text: "📝 Soumettre mon rapport" },
                  url: process.env.NEXT_PUBLIC_FORM_URL,
                  style: "primary",
                  action_id: "open_form",
                },
              ],
            },
          ],
          "Identité confirmée ✅"
        );
      } catch {
        // parsing échoué — on ignore
      }

      return NextResponse.json({ ok: true });
    }

    // Bouton "Ce n'est pas moi"
    if (action.action_id === "deny_identity") {
      await sendDM(
        slackUserId,
        [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `Pas de problème ! 🙏 Contactez votre responsable pour qu'il mette à jour votre profil.`,
            },
          },
        ],
        "Contactez votre responsable."
      );

      return NextResponse.json({ ok: true });
    }
  }

  return NextResponse.json({ ok: true });
}
