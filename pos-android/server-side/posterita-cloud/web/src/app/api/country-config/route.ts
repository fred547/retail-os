import { NextResponse } from "next/server";
import { getDb } from "@/lib/supabase/admin";

export const revalidate = 3600; // Cache for 1 hour

/**
 * GET /api/country-config
 * Public endpoint — returns all countries with regions and currencies.
 * Used by the website pricing page and signup form.
 */
export async function GET() {
  try {
    const { data, error } = await getDb()
      .from("country_config")
      .select("country_code, country_name, billing_region, currency_code, currency_symbol, phone_prefix, modules, timezone")
      .order("country_name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to load countries" }, { status: 500 });
    }

    return NextResponse.json({ countries: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Failed to load countries" }, { status: 500 });
  }
}
