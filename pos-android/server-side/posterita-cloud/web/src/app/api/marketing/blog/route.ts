import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/supabase/admin";
import { isAccountManager } from "@/lib/super-admin";

async function logToErrorDb(message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: "system",
      severity: "ERROR",
      tag: "MARKETING_BLOG",
      message,
      stack_trace: stackTrace ?? null,
      device_info: "web-api",
      app_version: "web",
    });
  } catch (_) {
    /* swallow */
  }
}

/** GET: List blog posts with optional status filter */
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
      .from("blog_post")
      .select("id, slug, title, meta_description, keyword, author, status, published_at, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      await logToErrorDb(`Failed to list blog posts: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ posts: data ?? [] });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logToErrorDb(err.message, err.stack);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST: Generate a new blog post using AI */
export async function POST(request: NextRequest) {
  try {
    const isManager = await isAccountManager();
    if (!isManager) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { keyword, topic, tone } = body;

    if (!keyword || typeof keyword !== "string") {
      return NextResponse.json(
        { error: "keyword is required" },
        { status: 400 }
      );
    }

    const slug = keyword
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const toneInstruction = tone === "formal" ? "Use a formal, professional tone." :
      tone === "casual" ? "Use a casual, friendly tone." :
      "Use a professional yet approachable tone.";

    const prompt = `Write a complete, SEO-optimized blog post for the Posterita POS website.

**Target keyword:** ${keyword}
**Topic:** ${topic || keyword}
**Tone:** ${toneInstruction}

Requirements:
1. Title should include the keyword naturally
2. Write a compelling meta description (under 160 characters)
3. Structure with H2 and H3 headings
4. Include the keyword naturally 3-5 times
5. 1200-1800 words
6. Include a call-to-action section at the end directing readers to sign up at https://web.posterita.com/customer/signup
7. Write for retail store owners, restaurant managers, and business operators

Output format — return ONLY valid JSON (no markdown fences):
{
  "title": "The blog post title",
  "meta_description": "Under 160 chars description for SEO",
  "html_content": "<article>Full HTML content with Tailwind classes for styling. Use prose classes. Include h2, h3, p, ul, li, strong, a tags. Use class='text-brand-600' for links. Use class='bg-brand-50 border-l-4 border-brand-600 p-4 rounded' for callout boxes.</article>"
}`;

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CLAUDE_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
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
    const rawText = claudeData.content?.[0]?.text ?? "{}";

    let parsed: { title: string; meta_description: string; html_content: string };
    try {
      const cleaned = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      await logToErrorDb("Failed to parse blog post JSON", rawText.slice(0, 500));
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    if (!parsed.title || !parsed.html_content) {
      return NextResponse.json(
        { error: "AI did not generate valid blog content" },
        { status: 500 }
      );
    }

    // Save to DB
    const db = getDb();
    const { data: saved, error: insertError } = await db
      .from("blog_post")
      .insert({
        slug,
        title: parsed.title,
        meta_description: parsed.meta_description ?? null,
        keyword,
        html_content: parsed.html_content,
        status: "draft",
      })
      .select("id, slug, title, status")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: `A blog post with slug "${slug}" already exists` },
          { status: 409 }
        );
      }
      await logToErrorDb(`Failed to save blog post: ${insertError.message}`);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ post: saved });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logToErrorDb(err.message, err.stack);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
