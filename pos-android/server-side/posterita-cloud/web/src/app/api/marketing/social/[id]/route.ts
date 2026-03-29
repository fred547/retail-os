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

/** PATCH: Update social post status (approve/reject) */
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
    const { status } = body;

    if (!status || !["draft", "approved", "published", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be: draft, approved, published, rejected" },
        { status: 400 }
      );
    }

    const db = getDb();
    const update: Record<string, unknown> = { status };
    if (status === "published") {
      update.published_at = new Date().toISOString();
    }

    const { data, error } = await db
      .from("social_post")
      .update(update)
      .eq("id", parseInt(id))
      .select()
      .single();

    if (error) {
      await logToErrorDb(`Failed to update social post ${id}: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ post: data });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logToErrorDb(err.message, err.stack);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** DELETE: Delete a social post */
export async function DELETE(
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

    const { error } = await db
      .from("social_post")
      .delete()
      .eq("id", parseInt(id));

    if (error) {
      await logToErrorDb(`Failed to delete social post ${id}: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logToErrorDb(err.message, err.stack);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
