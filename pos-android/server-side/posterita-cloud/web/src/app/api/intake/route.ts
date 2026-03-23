import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getDb } from "@/lib/supabase/admin";

/**
 * GET /api/intake — list batches for the current account
 * POST /api/intake — create a new batch
 */

async function getAccountId(): Promise<string | null> {
  const admin = getDb();
  const cookieStore = await cookies();

  // Check OTT cookie first (Android WebView)
  const ottCookie = cookieStore.get("posterita_ott_session");
  if (ottCookie?.value) {
    try {
      const session = JSON.parse(ottCookie.value);
      if (session.account_id) return session.account_id;
    } catch { /* ignore */ }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Super admin impersonation
  const { data: sa } = await admin.from("super_admin").select("id").eq("auth_uid", user.id).eq("is_active", true).single();
  if (sa) {
    const { data: session } = await admin.from("super_admin_session").select("account_id").eq("super_admin_id", sa.id).order("started_at", { ascending: false }).limit(1).single();
    return session?.account_id ?? null;
  }

  // Owner session
  const { data: owner } = await admin.from("owner").select("id").eq("auth_uid", user.id).eq("is_active", true).single();
  if (owner?.id) {
    const { data: ownerSession } = await admin.from("owner_account_session").select("account_id").eq("owner_id", owner.id).single();
    if (ownerSession?.account_id) return ownerSession.account_id;
  }

  // Fallback: pos_user
  const { data: posUser } = await admin.from("pos_user").select("account_id").eq("auth_uid", user.id).limit(1).single();
  return posUser?.account_id ?? null;
}

export async function GET() {
  const accountId = await getAccountId();
  if (!accountId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getDb();
  const { data, error } = await admin
    .from("intake_batch")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const accountId = await getAccountId();
  if (!accountId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { source, source_ref, source_file_url, supplier_name, notes } = body;

  if (!source) {
    return NextResponse.json({ error: "source is required" }, { status: 400 });
  }

  const admin = getDb();
  const { data, error } = await admin
    .from("intake_batch")
    .insert({
      account_id: accountId,
      source,
      source_ref: source_ref ?? null,
      source_file_url: source_file_url ?? null,
      supplier_name: supplier_name ?? null,
      notes: notes ?? null,
      status: "processing",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
