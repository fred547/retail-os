import { NextResponse } from "next/server";
import { getDb } from "@/lib/supabase/admin";
import { isAccountManager } from "@/lib/super-admin";

/** GET: List all subscribers (admin only) */
export async function GET() {
  try {
    const isManager = await isAccountManager();
    if (!isManager) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const db = getDb();
    const { data, error } = await db
      .from("marketing_subscriber")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ subscribers: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
