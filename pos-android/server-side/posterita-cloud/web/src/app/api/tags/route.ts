import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "TAG",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** GET /api/tags — list tags, optionally filtered by group */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const groupId = new URL(req.url).searchParams.get("group_id");

    let query = getDb()
      .from("tag")
      .select("*")
      .eq("account_id", accountId)
      .eq("is_deleted", false)
      .order("position");

    if (groupId) query = query.eq("tag_group_id", parseInt(groupId));

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ tags: data ?? [] });
  } catch (e: any) {
    await logToErrorDb(accountId, `Tags list error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** POST /api/tags — create a tag within a group */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { tag_group_id, name, color, position } = body;

    if (!tag_group_id || !name?.trim()) {
      return NextResponse.json({ error: "tag_group_id and name are required" }, { status: 400 });
    }

    const { data, error } = await getDb()
      .from("tag")
      .insert({
        account_id: accountId,
        tag_group_id,
        name: name.trim(),
        color: color || null,
        position: position ?? 0,
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes("duplicate")) {
        return NextResponse.json({ error: `Tag "${name}" already exists in this group` }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ tag: data }, { status: 201 });
  } catch (e: any) {
    await logToErrorDb(accountId, `Tag create error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
