import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface EnrollRequest {
  account_id: string;
  store_id: number;
  terminal_id: number;
}

/**
 * POST /api/enroll
 *
 * Device enrollment endpoint. A new device scans a QR code containing
 * account_id, store_id, and terminal_id. This endpoint validates they
 * exist and returns the full bootstrap dataset so the device can
 * populate its local Room database and start operating immediately.
 *
 * No auth required — possession of the QR code (which requires physical
 * access to the terminal/store) serves as the authorization.
 */
export async function POST(req: NextRequest) {
  try {
    const body: EnrollRequest = await req.json();

    // Validate required fields
    if (!body.account_id || !body.store_id || !body.terminal_id) {
      return NextResponse.json(
        { error: "account_id, store_id, and terminal_id are required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Validate account exists
    const { data: account, error: accountErr } = await db
      .from("account")
      .select("*")
      .eq("account_id", body.account_id)
      .single();

    if (accountErr || !account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Validate store exists and belongs to this account
    const { data: store, error: storeErr } = await db
      .from("store")
      .select("*")
      .eq("store_id", body.store_id)
      .eq("account_id", body.account_id)
      .single();

    if (storeErr || !store) {
      return NextResponse.json(
        { error: "Store not found or does not belong to this account" },
        { status: 404 }
      );
    }

    // Validate terminal exists and belongs to this account
    const { data: terminal, error: terminalErr } = await db
      .from("terminal")
      .select("*")
      .eq("terminal_id", body.terminal_id)
      .eq("account_id", body.account_id)
      .single();

    if (terminalErr || !terminal) {
      return NextResponse.json(
        { error: "Terminal not found or does not belong to this account" },
        { status: 404 }
      );
    }

    // Fetch all bootstrap data for this account

    const { data: stores } = await db
      .from("store")
      .select("*")
      .eq("account_id", body.account_id);

    const { data: terminals } = await db
      .from("terminal")
      .select("*")
      .eq("account_id", body.account_id);

    const { data: users } = await db
      .from("pos_user")
      .select(
        "user_id, username, firstname, lastname, pin, role, isadmin, issalesrep, permissions, discountlimit, isactive"
      )
      .eq("account_id", body.account_id);

    const { data: products } = await db
      .from("product")
      .select("*")
      .eq("account_id", body.account_id)
      .eq("product_status", "live");

    const { data: categories } = await db
      .from("productcategory")
      .select("*")
      .eq("account_id", body.account_id);

    const { data: taxes } = await db
      .from("tax")
      .select("*")
      .eq("account_id", body.account_id);

    const { data: modifiers } = await db
      .from("modifier")
      .select("*")
      .eq("account_id", body.account_id);

    const { data: preferences } = await db
      .from("preference")
      .select("*")
      .eq("account_id", body.account_id);

    const { data: customers } = await db
      .from("customer")
      .select("*")
      .eq("account_id", body.account_id);

    const { data: discountCodes } = await db
      .from("discountcode")
      .select("*")
      .eq("account_id", body.account_id);

    // Generate a sync secret for this device (simple random token)
    const syncSecret = crypto.randomUUID();

    return NextResponse.json({
      success: true,
      // Account details
      account,
      // The specific store/terminal being enrolled
      enrolled_store: store,
      enrolled_terminal: terminal,
      // Full bootstrap data
      stores: stores ?? [],
      terminals: terminals ?? [],
      users: users ?? [],
      products: products ?? [],
      categories: categories ?? [],
      taxes: taxes ?? [],
      modifiers: modifiers ?? [],
      preferences: preferences ?? [],
      customers: customers ?? [],
      discount_codes: discountCodes ?? [],
      // Sync credentials
      sync_secret: syncSecret,
      server_time: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Enrollment error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "posterita-device-enrollment",
    timestamp: new Date().toISOString(),
  });
}
