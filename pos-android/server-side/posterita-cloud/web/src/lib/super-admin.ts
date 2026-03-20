import { createServerSupabase, createServerSupabaseAdmin } from "./supabase/server";

export async function getCurrentSuperAdminRecord() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = await createServerSupabaseAdmin();
  const { data: superAdmin } = await admin
    .from("super_admin")
    .select("*")
    .eq("auth_uid", user.id)
    .eq("is_active", true)
    .single();

  return superAdmin || null;
}

export async function isSuperAdmin(): Promise<boolean> {
  return !!(await getCurrentSuperAdminRecord());
}

export async function isAccountManager(): Promise<boolean> {
  return isSuperAdmin();
}

export async function getSuperAdminInfo() {
  const superAdmin = await getCurrentSuperAdminRecord();
  if (!superAdmin) return null;

  const admin = await createServerSupabaseAdmin();
  // Get current impersonation session
  const { data: session } = await admin
    .from("super_admin_session")
    .select("*, account(businessname)")
    .eq("super_admin_id", superAdmin.id)
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  return {
    ...superAdmin,
    impersonating: session
      ? {
          account_id: session.account_id,
          businessname: (session as any).account?.businessname,
        }
      : null,
  };
}

export async function getAccountManagerInfo() {
  return getSuperAdminInfo();
}

export async function switchAccount(accountId: string | null) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const admin = await createServerSupabaseAdmin();
  const { data: superAdmin } = await admin
    .from("super_admin")
    .select("id")
    .eq("auth_uid", user.id)
    .eq("is_active", true)
    .single();

  if (!superAdmin) return false;

  if (accountId) {
    // Start impersonating
    await admin.from("super_admin_session").insert({
      super_admin_id: superAdmin.id,
      account_id: accountId,
    });
  } else {
    // Stop impersonating — delete all sessions
    await admin
      .from("super_admin_session")
      .delete()
      .eq("super_admin_id", superAdmin.id);
  }

  return true;
}
