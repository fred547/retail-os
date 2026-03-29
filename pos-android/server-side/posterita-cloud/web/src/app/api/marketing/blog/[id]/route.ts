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

/** GET: Get a single blog post by ID (including html_content) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isManager = await isAccountManager();
    if (!isManager) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const db = getDb();

    const { data, error } = await db
      .from("blog_post")
      .select("*")
      .eq("id", parseInt(id))
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }

    return NextResponse.json({ post: data });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logToErrorDb(err.message, err.stack);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** PATCH: Update blog post (status, content, etc.) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isManager = await isAccountManager();
    if (!isManager) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, title, meta_description, html_content } = body;

    const update: Record<string, unknown> = {};

    if (status) {
      if (!["draft", "published", "archived"].includes(status)) {
        return NextResponse.json(
          { error: "Invalid status. Must be: draft, published, archived" },
          { status: 400 }
        );
      }
      update.status = status;
      if (status === "published") {
        update.published_at = new Date().toISOString();
      }
    }

    if (title) update.title = title;
    if (meta_description) update.meta_description = meta_description;
    if (html_content) update.html_content = html_content;

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const db = getDb();
    const { data, error } = await db
      .from("blog_post")
      .update(update)
      .eq("id", parseInt(id))
      .select("id, slug, title, status, published_at")
      .single();

    if (error) {
      await logToErrorDb(`Failed to update blog post ${id}: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }

    return NextResponse.json({ post: data });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logToErrorDb(err.message, err.stack);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
