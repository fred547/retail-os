import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "SUPPLIER",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** GET /api/suppliers — list suppliers */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const showInactive = url.searchParams.get("inactive") === "true";

    let query = getDb()
      .from("supplier")
      .select("*", { count: "exact" })
      .eq("account_id", accountId)
      .eq("is_deleted", false)
      .order("name", { ascending: true });

    if (!showInactive) query = query.eq("is_active", true);
    if (search) query = query.or(`name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%`);

    const { data, count, error } = await query;
    if (error) {
      await logToErrorDb(accountId, `Failed to fetch suppliers: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ suppliers: data || [], total: count || 0 });
  } catch (e: any) {
    await logToErrorDb(accountId, `Suppliers list error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** POST /api/suppliers — create a new supplier */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, contact_name, phone, email, address, city, country, tax_id, payment_terms, notes } = body;

    if (!name) return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });

    const { data, error } = await getDb()
      .from("supplier")
      .insert({
        account_id: accountId,
        name, contact_name, phone, email, address, city, country, tax_id, payment_terms, notes,
      })
      .select()
      .single();

    if (error) {
      await logToErrorDb(accountId, `Failed to create supplier: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ supplier: data }, { status: 201 });
  } catch (e: any) {
    await logToErrorDb(accountId, `Supplier create error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
