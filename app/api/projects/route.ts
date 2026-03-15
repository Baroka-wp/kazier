import { NextRequest } from "next/server";
import { getProjects } from "@/lib/project-actions";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";

  const result = await getProjects({ page, limit, search });

  return Response.json(result);
}
