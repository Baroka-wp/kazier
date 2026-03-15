import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isDashboard = pathname.startsWith("/dashboard");

  // Vérifier si l'utilisateur est authentifié via le JWT NextAuth
  // NextAuth v5 peut utiliser différents noms de cookies selon HTTP/HTTPS
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value ||
    request.cookies.get("__Host-authjs.session-token")?.value;
  const isLoggedIn = !!sessionToken;

  // ── Non authentifié et tente d'accéder au dashboard ─────────────────────
  if (!isLoggedIn && isDashboard) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", "/dashboard");
    return NextResponse.redirect(loginUrl);
  }

  // ── Authentifié et sur le dashboard ──────────────────────────────────────
  if (isLoggedIn && isDashboard) {
    // Récupérer le rôle depuis le cookie JWT (décodage basique)
    // Pour une vérification complète du rôle, utiliser auth() dans un Server Component
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
