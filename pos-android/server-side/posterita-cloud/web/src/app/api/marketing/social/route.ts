import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/supabase/admin";
import { isAccountManager } from "@/lib/super-admin";

async function logToErrorDb(message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: "system",
      severity: "ERROR",
      tag: "MARKETING_SOCIAL",
      message,
      stack_trace: stackTrace ?? null,
      device_info: "web-api",
      app_version: "web",
    });
  } catch (_) {
    /* swallow */
  }
}

/** GET: List social posts with optional status filter */
export async function GET(request: NextRequest) {
  try {
    const isManager = await isAccountManager();
    if (!isManager) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const db = getDb();
    let query = db
      .from("social_post")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      await logToErrorDb(`Failed to list social posts: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ posts: data ?? [] });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logToErrorDb(err.message, err.stack);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST: Generate new social media posts using AI */
export async function POST(request: NextRequest) {
  try {
    const isManager = await isAccountManager();
    if (!isManager) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const count = Math.min(body.count ?? 7, 14);

    const prompt = `Generate ${count} social media posts for Posterita POS — a cloud-based point of sale system for retail, restaurants, and warehouses.

Key selling points:
- Free plan with unlimited products and orders
- Works offline on Android, Windows, Mac
- Zero transaction fees (competitors charge 2-3%)
- Kitchen Display System included
- Xero accounting integration
- AI-powered product import
- Regional pricing starting at $7/month
- Multi-store, multi-terminal support

Mix of types:
- tip: Share a useful POS/retail tip
- comparison: Compare Posterita vs competitors
- story: Tell a mini customer success story
- fact: Share a retail industry statistic
- question: Ask an engaging question to followers

Each post should have:
- A Twitter version (under 280 characters including hashtags)
- A LinkedIn version (2-3 paragraphs, professional tone)
- Relevant hashtags

Return ONLY valid JSON (no markdown, no code fences) as an array:
[{"platform": "twitter", "content": "tweet text here", "post_type": "tip"}, {"platform": "linkedin", "content": "linkedin post here", "post_type": "tip"}]

Generate ${count} pairs (twitter + linkedin for each topic).`;

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CLAUDE_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      await logToErrorDb(`Claude API error: ${claudeResponse.status}`, errorText);
      return NextResponse.json(
        { error: "AI service temporarily unavailable" },
        { status: 502 }
      );
    }

    const claudeData = await claudeResponse.json();
    const rawText = claudeData.content?.[0]?.text ?? "[]";

    // Parse JSON response — strip any markdown code fences if present
    let posts: Array<{ platform: string; content: string; post_type: string }>;
    try {
      const cleaned = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      posts = JSON.parse(cleaned);
    } catch {
      await logToErrorDb("Failed to parse social posts JSON", rawText);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    if (!Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json(
        { error: "AI did not generate valid posts" },
        { status: 500 }
      );
    }

    // Save each post to DB as draft
    const db = getDb();
    const rows = posts.map((p) => ({
      platform: p.platform || "twitter",
      content: p.content,
      post_type: p.post_type || "tip",
      status: "draft",
    }));

    const { data: saved, error: insertError } = await db
      .from("social_post")
      .insert(rows)
      .select();

    if (insertError) {
      await logToErrorDb(`Failed to save social posts: ${insertError.message}`);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ posts: saved ?? [] });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logToErrorDb(err.message, err.stack);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
