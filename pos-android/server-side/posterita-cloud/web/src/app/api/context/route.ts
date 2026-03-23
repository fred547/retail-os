import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createServerSupabaseAdmin } from "@/lib/supabase/server";
import { cookies } from "next/headers";

const CONTEXT_COOKIE = "posterita_context";

/**
 * Sets the user's session context: account_id + store_id + terminal_id.
 *
 * POST body: { account_id, store_id, terminal_id }
 * GET query: ?account_id=...&store_id=...&terminal_id=...&redirect=/
 *
 * For owners: upserts into owner_account_session table.
 * For super admins: stores in a session cookie (they already have account via super_admin_session).
 */

async function setContext(accountId: string, storeId: number, terminalId: number) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", status: 401 };
  }

  const admin = await createServerSupabaseAdmin();

  // Verify the store belongs to this account
  const { data: store } = await admin
    .from("store")
    .select("store_id")
    .eq("store_id", storeId)
    .eq("account_id", accountId)
    .single();

  if (!store) {
    return { error: "Store not found in this account", status: 404 };
  }

  // Verify the terminal belongs to this store
  const { data: terminal } = await admin
    .from("terminal")
    .select("terminal_id")
    .eq("terminal_id", terminalId)
    .eq("store_id", storeId)
    .eq("account_id", accountId)
    .single();

  if (!terminal) {
    return { error: "Terminal not found in this store", status: 404 };
  }

  // Find the owner record
  const { data: owner } = await admin
    .from("owner")
    .select("id")
    .eq("auth_uid", user.id)
    .eq("is_active", true)
    .single();

  if (owner) {
    // Owner: verify account ownership and upsert session
    const { data: account } = await admin
      .from("account")
      .select("account_id")
      .eq("account_id", accountId)
      .eq("owner_id", owner.id)
      .single();

    if (!account) {
      return { error: "Account not found or not owned by you", status: 403 };
    }

    const { error: upsertError } = await admin
      .from("owner_account_session")
      .upsert(
        {
          owner_id: owner.id,
          account_id: accountId,
          store_id: storeId,
          terminal_id: terminalId,
        },
        { onConflict: "owner_id" }
      );

    if (upsertError) {
      return { error: upsertError.message, status: 500 };
    }

    return { success: true };
  }

  // Check if super admin
  const { data: superAdmin } = await admin
    .from("super_admin")
    .select("id")
    .eq("auth_uid", user.id)
    .eq("is_active", true)
    .single();

  if (superAdmin) {
    // Super admin: store context in a cookie (account already set via super_admin_session)
    const cookieStore = await cookies();
    cookieStore.set(CONTEXT_COOKIE, JSON.stringify({
      account_id: accountId,
      store_id: storeId,
      terminal_id: terminalId,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });
    return { success: true };
  }

  return { error: "Not authorized", status: 403 };
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { account_id, store_id, terminal_id } = body;

  if (!account_id || !store_id || !terminal_id) {
    return NextResponse.json(
      { error: "account_id, store_id, and terminal_id are required" },
      { status: 400 }
    );
  }

  const result = await setContext(account_id, Number(store_id), Number(terminal_id));

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const accountId = searchParams.get("account_id");
  const storeId = searchParams.get("store_id");
  const terminalId = searchParams.get("terminal_id");
  // SECURITY: Validate redirect to prevent open redirect attacks
  let redirectTo = searchParams.get("redirect") || "/";
  if (redirectTo.includes("://") || redirectTo.startsWith("//") || !redirectTo.startsWith("/")) {
    redirectTo = "/";
  }

  if (!accountId || !storeId || !terminalId) {
    return NextResponse.redirect(new URL("/platform", request.url));
  }

  const result = await setContext(accountId, Number(storeId), Number(terminalId));

  if ("error" in result) {
    // On error, redirect back to platform
    return NextResponse.redirect(new URL("/platform", request.url));
  }

  return NextResponse.redirect(new URL(redirectTo, request.url));
}
