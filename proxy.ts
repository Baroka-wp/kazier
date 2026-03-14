import { auth } from "@/auth";
import { canAccessDashboard } from "@/lib/permissions";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;
  const isDashboard = pathname.startsWith("/dashboard");

  // ── Non authentifié ──────────────────────────────────────────────────────
  if (!isLoggedIn && isDashboard) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // ── Authentifié et sur le dashboard ──────────────────────────────────────
  if (isLoggedIn && isDashboard) {
    const role = (req.auth?.user as any)?.role;

    // Si l'utilisateur a accès au dashboard complet, laisser passer
    if (canAccessDashboard(role)) {
      // Vérifier les routes protégées pour SA/TM
      if (pathname.startsWith("/dashboard/rapports")) {
        if (role !== "SA" && role !== "TM") {
          return NextResponse.redirect(new URL("/dashboard/teams", req.url));
        }
      }
      
      if (pathname.startsWith("/dashboard/equipe")) {
        if (role !== "SA" && role !== "TM") {
          return NextResponse.redirect(new URL("/dashboard/teams", req.url));
        }
      }


      // Laisser passer pour les autres routes
      return NextResponse.next();
    }

    // Si pas accès au dashboard complet (rôle T)
    // Rediriger seulement si pas déjà sur /dashboard/teams
    if (!pathname.startsWith("/dashboard/teams")) {
      return NextResponse.redirect(new URL("/dashboard/teams", req.url));
    }

    // Laisser passer si déjà sur /dashboard/teams
    return NextResponse.next();
  }
});

export const config = {
  matcher: ["/dashboard/:path*"],
};