import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { KNOWLEDGE_BASE } from "@/lib/marketing/knowledge-base";

async function logToErrorDb(message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: "system",
      severity: "ERROR",
      tag: "MARKETING_CHAT",
      message,
      stack_trace: stackTrace ?? null,
      device_info: "web-api",
      app_version: "web",
    });
  } catch (_) {
    /* swallow */
  }
}

const SYSTEM_PROMPT = `${KNOWLEDGE_BASE}

You are the Posterita sales assistant on the Posterita website. Your role:
- Be helpful, concise, and friendly
- Guide visitors toward signing up at https://web.posterita.com/customer/signup
- If they ask about pricing, share the relevant plan details
- If they ask about features, explain what Posterita offers
- If they have technical questions you cannot answer, suggest emailing support@posterita.com or calling +230 232 1079
- Keep responses under 200 words unless the question requires more detail
- Never make up features that are not listed above
- If asked about competitors, be factual and highlight Posterita's advantages (zero transaction fees, offline mode, affordable pricing)
`;

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const { limited } = checkRateLimit(`chat:${ip}`, 20);
    if (limited) {
      return NextResponse.json(
        { error: "Too many messages. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { session_id, message, visitor_email } = body;

    if (!session_id || !message) {
      return NextResponse.json(
        { error: "session_id and message are required" },
        { status: 400 }
      );
    }

    if (typeof message !== "string" || message.length > 2000) {
      return NextResponse.json(
        { error: "Message must be a string under 2000 characters" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Load last 10 messages for context
    const { data: history } = await db
      .from("chat_message")
      .select("role, content")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true })
      .limit(10);

    // Build conversation messages
    const conversationMessages = [
      ...(history ?? []).map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    // Call Claude Haiku
    const claudeResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.CLAUDE_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          system: SYSTEM_PROMPT,
          messages: conversationMessages,
        }),
      }
    );

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      await logToErrorDb(
        `Claude API error: ${claudeResponse.status}`,
        errorText
      );
      return NextResponse.json(
        { error: "AI service temporarily unavailable" },
        { status: 502 }
      );
    }

    const claudeData = await claudeResponse.json();
    const assistantMessage =
      claudeData.content?.[0]?.text ?? "Sorry, I could not generate a response.";

    // Save user message
    await db.from("chat_message").insert({
      session_id,
      role: "user",
      content: message,
      visitor_email: visitor_email ?? null,
    });

    // Save assistant response
    await db.from("chat_message").insert({
      session_id,
      role: "assistant",
      content: assistantMessage,
      visitor_email: visitor_email ?? null,
    });

    // If visitor provided email, save as subscriber
    if (visitor_email && typeof visitor_email === "string" && visitor_email.includes("@")) {
      await db.from("marketing_subscriber").upsert(
        {
          email: visitor_email.toLowerCase().trim(),
          source: "chat-widget",
          drip_step: 0,
          drip_next_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        { onConflict: "email", ignoreDuplicates: true }
      );
    }

    return NextResponse.json({
      response: assistantMessage,
      session_id,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logToErrorDb(err.message, err.stack);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
