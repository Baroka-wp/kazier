import { NextResponse } from "next/server";
import { sendTaskReminders } from "@/lib/server/jobs/task-reminders";

export async function GET() {
  const result = await sendTaskReminders();
  return NextResponse.json({ success: true, ...result });
}
