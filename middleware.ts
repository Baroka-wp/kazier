import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;
  const { pathname } = req.nextUrl;

  const isDashboard = pathname.startsWith("/dashboard");
  const isApi = pathname.startsWith("/api"); // 👈 On détecte les appels API

  // 1. Gérer les appels API non authentifiés
  if (!isLoggedIn && isApi) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // 2. Non authentifié tente d'accéder au dashboard (Page HTML)
  if (!isLoggedIn && isDashboard) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  // 3. Protection TEAM (Rapports)
  if (isLoggedIn && userRole === "T") {
    if (pathname.startsWith("/dashboard/rapports") || pathname === "/dashboard") {
      return NextResponse.redirect(new URL("/dashboard/teams", req.nextUrl.origin));
    }
  }

  return;
});

export const config = {
  // On ajoute /api/:path* pour protéger aussi les routes de données
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
