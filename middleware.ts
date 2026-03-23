import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;
  const { pathname } = req.nextUrl;
  const isDashboard = pathname.startsWith("/dashboard");
  const isRapportsPage = pathname.startsWith("/dashboard/rapports");

  // 1. Non authentifié tente d'accéder au dashboard
  if (!isLoggedIn && isDashboard) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  // 2. Utilisateur "TEAM" tente d'accéder aux rapports (Interdiction stricte)
  if (isLoggedIn && userRole === "T" && isRapportsPage) {
    // On le redirige vers sa page autorisée (ex: l'équipe)
    return NextResponse.redirect(new URL("/dashboard/teams", req.nextUrl.origin));
  }

  // 3. Redirection automatique si un TEAM arrive sur la racine du dashboard
  if (isLoggedIn && userRole === "T" && pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/dashboard/teams", req.nextUrl.origin));
  }

  return;
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
