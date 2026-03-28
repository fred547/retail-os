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

/** GET /api/tags/groups — list tag groups with their tags */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { data: groups, error: gErr } = await getDb()
      .from("tag_group")
      .select("*")
      .eq("account_id", accountId)
      .eq("is_deleted", false)
      .order("name");

    if (gErr) throw gErr;

    const { data: tags, error: tErr } = await getDb()
      .from("tag")
      .select("*")
      .eq("account_id", accountId)
      .eq("is_deleted", false)
      .order("position");

    if (tErr) throw tErr;

    // Nest tags under their groups
    const tagsByGroup: Record<number, any[]> = {};
    for (const t of tags ?? []) {
      if (!tagsByGroup[t.tag_group_id]) tagsByGroup[t.tag_group_id] = [];
      tagsByGroup[t.tag_group_id].push(t);
    }

    const enriched = (groups ?? []).map((g: any) => ({
      ...g,
      tags: tagsByGroup[g.tag_group_id] || [],
    }));

    return NextResponse.json({ groups: enriched });
  } catch (e: any) {
    await logToErrorDb(accountId, `Tag groups list error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** POST /api/tags/groups — create a tag group */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, description, color } = body;

    if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const { data, error } = await getDb()
      .from("tag_group")
      .insert({
        account_id: accountId,
        name: name.trim(),
        description: description || null,
        color: color || "#6B7280",
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes("duplicate")) {
        return NextResponse.json({ error: `Tag group "${name}" already exists` }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ group: data }, { status: 201 });
  } catch (e: any) {
    await logToErrorDb(accountId, `Tag group create error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
