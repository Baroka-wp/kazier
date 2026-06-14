/**
 * Page de consentement OAuth.
 *
 * Flow :
 *   - Claude.ai redirige ici avec ?response_type=code&client_id=...&...
 *   - On vérifie la session NextAuth ; si absente, on redirige vers /login
 *     avec callbackUrl pour revenir ici
 *   - On vérifie le client + redirect_uri
 *   - On affiche un component client qui POST vers /oauth/authorize/confirm
 *   - Sur "allow", on émet un code et on redirige vers redirect_uri
 *   - Sur "deny", on redirige avec error=access_denied
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/core";
import ConsentForm from "./ConsentForm";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const get = (k: string): string | undefined => {
    const v = params[k];
    return typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
  };

  const response_type = get("response_type");
  const client_id = get("client_id");
  const redirect_uri = get("redirect_uri");
  const code_challenge = get("code_challenge");
  const code_challenge_method = get("code_challenge_method") ?? "S256";
  const state = get("state");
  const scope = get("scope") ?? "";

  // Validations basiques
  if (response_type !== "code") return <ErrorPage msg="response_type must be 'code'" />;
  if (!client_id) return <ErrorPage msg="client_id required" />;
  if (!redirect_uri) return <ErrorPage msg="redirect_uri required" />;
  if (!code_challenge) return <ErrorPage msg="code_challenge required (PKCE)" />;
  if (code_challenge_method !== "S256") {
    return <ErrorPage msg="code_challenge_method must be S256" />;
  }

  const client = await prisma.oAuthClient.findUnique({ where: { clientId: client_id } });
  if (!client) return <ErrorPage msg="Unknown client_id" />;
  if (!client.redirectUris.includes(redirect_uri)) {
    return <ErrorPage msg="redirect_uri not registered for this client" />;
  }

  // Vérifie session NextAuth
  const session = await auth();
  if (!session?.user) {
    // Reconstruit l'URL courante pour callbackUrl
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (typeof v === "string") qs.set(k, v);
      else if (Array.isArray(v) && v[0]) qs.set(k, v[0]);
    });
    redirect(`/login?callbackUrl=${encodeURIComponent("/oauth/authorize?" + qs.toString())}`);
  }

  const user = session.user as { id?: string; name?: string; email?: string };
  if (!user.id) return <ErrorPage msg="Session invalid" />;

  return (
    <ConsentForm
      clientId={client_id}
      clientName={client.clientName ?? client_id}
      redirectUri={redirect_uri}
      codeChallenge={code_challenge}
      codeChallengeMethod={code_challenge_method}
      state={state ?? ""}
      scope={scope}
      userName={user.name ?? user.email ?? "Vous"}
    />
  );
}

function ErrorPage({ msg }: { msg: string }) {
  return (
    <div style={{ padding: 40, fontFamily: "system-ui, sans-serif" }}>
      <h1>Erreur OAuth</h1>
      <p style={{ color: "#a0263a" }}>{msg}</p>
    </div>
  );
}
