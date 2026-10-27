import { NextResponse } from "next/server";
import { getChatHealth } from "@/lib/chat-health";

export async function GET() {
  const { healthy, reason } = getChatHealth();
  if (!healthy) {
    return NextResponse.json({ healthy: false, reason }, { status: 503 });
  }
  return NextResponse.json({ healthy: true });
}
