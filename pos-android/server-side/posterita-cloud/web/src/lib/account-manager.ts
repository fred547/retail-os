const DEFAULT_ACCOUNT_MANAGER_EMAIL = "support@posterita.com";

export async function ensureDefaultAccountManager(admin: any) {
  return ensureAccountManager(admin, {
    email: DEFAULT_ACCOUNT_MANAGER_EMAIL,
    name: "Posterita Support",
  });
}

export async function ensureAccountManager(
  admin: any,
  manager: {
    superAdminId?: number | null;
    authUid?: string | null;
    email: string;
    name?: string | null;
  }
) {
  const normalizedEmail = manager.email.trim().toLowerCase();

  const { data: existing, error: existingError } = await admin
    .from("account_manager")
    .select("id, email, auth_uid, super_admin_id")
    .eq("email", normalizedEmail)
    .single();

  if (existingError && existingError.code !== "PGRST116") {
    throw new Error(existingError.message);
  }

  if (existing?.id) {
    await admin
      .from("account_manager")
      .update({
        super_admin_id: manager.superAdminId ?? existing.super_admin_id ?? null,
        auth_uid: manager.authUid ?? existing.auth_uid ?? null,
        name: manager.name || normalizedEmail,
        is_active: true,
      })
      .eq("id", existing.id);
    return existing.id as number;
  }

  const { data: inserted, error: insertError } = await admin
    .from("account_manager")
    .insert({
      super_admin_id: manager.superAdminId ?? null,
      auth_uid: manager.authUid ?? null,
      email: normalizedEmail,
      name: manager.name || normalizedEmail,
      is_active: true,
    })
    .select("id")
    .single();

  if (insertError || !inserted?.id) {
    throw new Error(insertError?.message || "Account manager creation failed");
  }

  return inserted.id as number;
}
