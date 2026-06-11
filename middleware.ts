import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;
  const { pathname } = req.nextUrl;

  const isDashboard = pathname.startsWith("/dashboard");
  const isApi = pathname.startsWith("/api");

  // 1. API non authentifié
  if (!isLoggedIn && isApi) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // 2. Dashboard non authentifié
  if (!isLoggedIn && isDashboard) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  // 3. MEMBER ne peut pas voir rapports / dashboard root
  // (back-compat: anciens tokens "T" continueront de fonctionner via fallback)
  const isMember = userRole === "MEMBER" || userRole === "T";
  if (isLoggedIn && isMember) {
    if (pathname.startsWith("/dashboard/rapports") || pathname === "/dashboard") {
      return NextResponse.redirect(new URL("/dashboard/teams", req.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/rapports/:path*",
    "/api/teams/:path*",
    "/api/projects/:path*",
    "/api/tasks/:path*",
    "/api/equipe/:path*",
  ],
};
