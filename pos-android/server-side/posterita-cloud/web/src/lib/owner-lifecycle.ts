export const ACCOUNT_TYPES = ["demo", "trial", "live"] as const;
export const ACCOUNT_STATUSES = [
  "draft",
  "in_progress",
  "testing",
  "onboarding",
  "active",
  "failed",
  "archived",
] as const;
export const PROTECTED_DELETE_STATUSES = new Set(["onboarding", "active"]);

export type AccountType = (typeof ACCOUNT_TYPES)[number];
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export function normalizeEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function normalizePhone(phone: unknown): string {
  return typeof phone === "string" ? phone.trim().replace(/\s+/g, "") : "";
}

export function normalizeAccountType(type: unknown): AccountType | null {
  return typeof type === "string" && ACCOUNT_TYPES.includes(type.trim().toLowerCase() as AccountType)
    ? (type.trim().toLowerCase() as AccountType)
    : null;
}

export function normalizeAccountStatus(status: unknown): AccountStatus | null {
  return typeof status === "string" &&
    ACCOUNT_STATUSES.includes(status.trim().toLowerCase() as AccountStatus)
    ? (status.trim().toLowerCase() as AccountStatus)
    : null;
}

export function defaultStatusForType(type: AccountType): AccountStatus {
  switch (type) {
    case "live":
      return "onboarding";
    case "demo":
    case "trial":
      return "testing";
  }
}

export function deriveLifecycleStatus(options: {
  requestedStatus?: unknown;
  accountType: AccountType;
  activeUserCount?: number;
}): AccountStatus {
  const requested = normalizeAccountStatus(options.requestedStatus);
  if (requested) return requested;
  if ((options.activeUserCount ?? 0) > 1) return "onboarding";
  return defaultStatusForType(options.accountType);
}

export async function findOwnerByIdentity(
  supabase: any,
  identity: { phone?: string; email?: string }
) {
  const phone = normalizePhone(identity.phone);
  const email = normalizeEmail(identity.email);

  if (phone) {
    const { data, error } = await supabase
      .from("owner")
      .select("id, auth_uid, email, phone, name, account_manager_id")
      .eq("phone", phone)
      .single();

    if (error && error.code !== "PGRST116") {
      return { owner: null, error: error.message };
    }
    if (data?.id) {
      return { owner: data, error: null };
    }
  }

  if (email) {
    const { data, error } = await supabase
      .from("owner")
      .select("id, auth_uid, email, phone, name, account_manager_id")
      .eq("email", email)
      .single();

    if (error && error.code !== "PGRST116") {
      return { owner: null, error: error.message };
    }
    if (data?.id) {
      return { owner: data, error: null };
    }
  }

  return { owner: null, error: null };
}
