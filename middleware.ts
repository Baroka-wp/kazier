import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;
  const { pathname } = req.nextUrl;

  const isDashboard = pathname.startsWith("/dashboard");
  const isApi = pathname.startsWith("/api");

  // 1. Gérer les appels API non authentifiés
  if (!isLoggedIn && isApi) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // 2. Non authentifié tente d'accéder au dashboard
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

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    // Lister uniquement les routes API à protéger
    // api/auth, api/cron, api/citation, api/teams, api/upload = libres d'accès
    "/api/rapports/:path*",
    "/api/teams/:path*",
    "/api/projects/:path*",
    "/api/tasks/:path*",
    "/api/equipe/:path*",
  ],
};
