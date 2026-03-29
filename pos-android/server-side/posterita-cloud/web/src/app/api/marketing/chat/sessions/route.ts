import { NextResponse } from "next/server";
import { getDb } from "@/lib/supabase/admin";
import { isAccountManager } from "@/lib/super-admin";

/** GET: List recent chat sessions with messages (admin only) */
export async function GET() {
  try {
    const isManager = await isAccountManager();
    if (!isManager) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const db = getDb();

    // Get the most recent messages to find active sessions
    const { data: messages, error } = await db
      .from("chat_message")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by session_id
    const sessionMap = new Map<
      string,
      {
        session_id: string;
        messages: typeof messages;
        visitor_email?: string;
        last_message_at: string;
      }
    >();

    for (const msg of messages ?? []) {
      if (!sessionMap.has(msg.session_id)) {
        sessionMap.set(msg.session_id, {
          session_id: msg.session_id,
          messages: [],
          visitor_email: msg.visitor_email ?? undefined,
          last_message_at: msg.created_at,
        });
      }
      const session = sessionMap.get(msg.session_id)!;
      session.messages.push(msg);
      if (msg.visitor_email && !session.visitor_email) {
        session.visitor_email = msg.visitor_email;
      }
    }

    // Sort messages within each session chronologically
    const sessions = Array.from(sessionMap.values())
      .map((s) => ({
        ...s,
        messages: s.messages.sort(
          (a: { created_at: string }, b: { created_at: string }) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
      }))
      .sort(
        (a, b) =>
          new Date(b.last_message_at).getTime() -
          new Date(a.last_message_at).getTime()
      )
      .slice(0, 50);

    return NextResponse.json({ sessions });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
