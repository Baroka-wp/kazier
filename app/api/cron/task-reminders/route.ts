import { NextResponse } from "next/server";
import { sendTaskReminders } from "@/lib/notify-task-reminder";

export async function GET(request: Request) {
  // Sécuriser avec un token secret
  // const authHeader = request.headers.get("authorization");
  // if (authHeader !== `Bearer ${process.env.AUTH_SECRET}`) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  await sendTaskReminders();
  return NextResponse.json({ success: true });
}
