import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/geo
 * Returns the visitor's country based on IP using Vercel's geo headers.
 * Falls back to 'US' / 'developed' if detection fails.
 */
export async function GET(req: NextRequest) {
  try {
    // Vercel provides x-vercel-ip-country on deployed environments
    const countryCode =
      req.headers.get("x-vercel-ip-country") ||
      "US"; // Safe default: developed tier

    // Look up in country_config for full info
    const { data } = await getDb()
      .from("country_config")
      .select("country_code, country_name, billing_region, currency_code, currency_symbol")
      .eq("country_code", countryCode.toUpperCase().trim())
      .maybeSingle();

    if (data) {
      return NextResponse.json(data);
    }

    // Country not in our table — default to developed
    return NextResponse.json({
      country_code: countryCode.toUpperCase().trim(),
      country_name: "Unknown",
      billing_region: "developed",
      currency_code: "USD",
      currency_symbol: "$",
    });
  } catch {
    return NextResponse.json({
      country_code: "US",
      country_name: "United States",
      billing_region: "developed",
      currency_code: "USD",
      currency_symbol: "$",
    });
  }
}
