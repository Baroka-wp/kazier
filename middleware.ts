import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isDashboard = req.nextUrl.pathname.startsWith("/dashboard");

  // ── Non authentifié et tente d'accéder au dashboard ─────────────────────
  if (!isLoggedIn && isDashboard) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return Response.redirect(loginUrl);
  }

  // L'utilisateur est authentifié ou n'accède pas au dashboard
  return;
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
