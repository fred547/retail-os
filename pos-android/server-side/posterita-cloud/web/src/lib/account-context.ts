import { createServerSupabase, createServerSupabaseAdmin } from "./supabase/server";
import { cookies } from "next/headers";

const OTT_COOKIE = "posterita_ott_session";

/**
 * Resolves the current user's account_id for data scoping.
 *
 * Priority:
 * 1. Super admin impersonation session
 * 2. Owner account session (owner_account_session table)
 * 3. pos_user.account_id (regular user's account)
 * 4. Owner fallback by email
 * 5. OTT cookie (Android WebView sessions)
 *
 * Returns null if no account can be determined.
 */
export async function getSessionAccountId(): Promise<string | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // No Supabase Auth user — check OTT cookie (Android WebView)
    return getOttAccountId();
  }

  const admin = await createServerSupabaseAdmin();

  // 1. Check super admin impersonation
  const { data: superAdmin } = await admin
    .from("super_admin")
    .select("id")
    .eq("auth_uid", user.id)
    .eq("is_active", true)
    .single();

  if (superAdmin) {
    const { data: session } = await admin
      .from("super_admin_session")
      .select("account_id")
      .eq("super_admin_id", superAdmin.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    if (session) return session.account_id;
    // Super admin without impersonation — no account context
    return null;
  }

  // 2. Owner account session
  const { data: owner, error: ownerError } = await admin
    .from("owner")
    .select("id")
    .eq("auth_uid", user.id)
    .eq("is_active", true)
    .single();

  if (ownerError) {
    console.error("[account-context] owner lookup failed:", ownerError.message);
  }

  if (owner?.id) {
    const { data: ownerSession } = await admin
      .from("owner_account_session")
      .select("account_id")
      .eq("owner_id", owner.id)
      .single();

    if (ownerSession?.account_id) return ownerSession.account_id;

    // No session — find first account for this owner
    const { data: firstAccount } = await admin
      .from("account")
      .select("account_id")
      .eq("owner_id", owner.id)
      .order("created_at")
      .limit(1)
      .single();

    if (firstAccount?.account_id) return firstAccount.account_id;
  }

  // 3. Regular user — look up account from pos_user
  const { data: posUser } = await admin
    .from("pos_user")
    .select("account_id")
    .eq("auth_uid", user.id)
    .limit(1)
    .single();

  if (posUser) return posUser.account_id;

  // 4. Fallback — check owner table by email
  if (!owner && user.email) {
    const { data: ownerByEmail } = await admin
      .from("owner")
      .select("id")
      .eq("email", user.email)
      .single();

    if (ownerByEmail) {
      const { data: account } = await admin
        .from("account")
        .select("account_id")
        .eq("owner_id", ownerByEmail.id)
        .limit(1)
        .single();

      if (account) return account.account_id;
    }
  }

  return null;
}

/**
 * Resolves the current user's store_id from their session context.
 * Returns null if no store context is set.
 */
export async function getSessionStoreId(): Promise<number | null> {
  const context = await getOwnerSessionContext();
  return context?.store_id ?? null;
}

/**
 * Resolves the current user's terminal_id from their session context.
 * Returns null if no terminal context is set.
 */
export async function getSessionTerminalId(): Promise<number | null> {
  const context = await getOwnerSessionContext();
  return context?.terminal_id ?? null;
}

/**
 * Returns the full session context (account_id, store_id, terminal_id)
 * from the owner_account_session table.
 */
export async function getSessionContext(): Promise<{
  account_id: string;
  store_id: number | null;
  terminal_id: number | null;
} | null> {
  const accountId = await getSessionAccountId();
  if (!accountId) return null;

  const context = await getOwnerSessionContext();
  return {
    account_id: accountId,
    store_id: context?.store_id ?? null,
    terminal_id: context?.terminal_id ?? null,
  };
}

/**
 * Internal helper to read the owner's session context from
 * owner_account_session (store_id + terminal_id).
 */
async function getOwnerSessionContext(): Promise<{
  store_id: number | null;
  terminal_id: number | null;
} | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = await createServerSupabaseAdmin();

  const { data: owner } = await admin
    .from("owner")
    .select("id")
    .eq("auth_uid", user.id)
    .eq("is_active", true)
    .single();

  if (!owner?.id) return null;

  const { data: session } = await admin
    .from("owner_account_session")
    .select("store_id, terminal_id")
    .eq("owner_id", owner.id)
    .single();

  return session ?? null;
}

/**
 * Read account_id from the OTT cookie set by middleware during
 * Android WebView authentication.
 */
async function getOttAccountId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const ottCookie = cookieStore.get(OTT_COOKIE);
    if (!ottCookie?.value) return null;

    const session = JSON.parse(ottCookie.value);
    return session.account_id ?? null;
  } catch {
    return null;
  }
}
