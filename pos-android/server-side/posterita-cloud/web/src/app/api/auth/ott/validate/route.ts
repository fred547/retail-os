import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }

    // Find and validate
    const { data, error } = await supabase
      .from("ott_tokens")
      .select("*")
      .eq("token", token)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // Mark as used
    await supabase.from("ott_tokens").update({ used: true }).eq("id", data.id);

    return NextResponse.json({
      valid: true,
      account_id: data.account_id,
      user_id: data.user_id,
      user_role: data.user_role,
      store_id: data.store_id,
      terminal_id: data.terminal_id,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
