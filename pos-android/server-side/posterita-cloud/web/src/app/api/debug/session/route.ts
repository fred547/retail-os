import { NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const accountId = await getSessionAccountId();

    return NextResponse.json({
      auth_user_id: user?.id || null,
      auth_email: user?.email || null,
      resolved_account_id: accountId,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
