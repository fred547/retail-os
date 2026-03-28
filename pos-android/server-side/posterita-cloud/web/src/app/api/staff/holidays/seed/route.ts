import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "ROSTER",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

// Mauritius public holidays 2026
const MAURITIUS_2026 = [
  { date: "2026-01-01", name: "New Year's Day", is_recurring: true },
  { date: "2026-01-02", name: "New Year (Day 2)", is_recurring: true },
  { date: "2026-02-01", name: "Abolition of Slavery", is_recurring: true },
  { date: "2026-02-17", name: "Thaipoosam Cavadee", is_recurring: false },
  { date: "2026-03-12", name: "National Day", is_recurring: true },
  { date: "2026-03-28", name: "Ougadi", is_recurring: false },
  { date: "2026-05-01", name: "Labour Day", is_recurring: true },
  { date: "2026-08-15", name: "Assumption of Mary", is_recurring: true },
  { date: "2026-09-03", name: "Ganesh Chaturthi", is_recurring: false },
  { date: "2026-11-01", name: "All Saints' Day", is_recurring: true },
  { date: "2026-11-02", name: "Arrival of Indentured Labourers", is_recurring: true },
  { date: "2026-11-14", name: "Divali", is_recurring: false },
  { date: "2026-12-25", name: "Christmas Day", is_recurring: true },
  { date: "2026-03-20", name: "Eid-Ul-Fitr", is_recurring: false },
];

/** POST /api/staff/holidays/seed — seed country holidays */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const countryCode = body.country_code || "MU";
    const year = body.year || 2026;

    let holidays: { date: string; name: string; is_recurring: boolean }[];

    if (countryCode === "MU" && year === 2026) {
      holidays = MAURITIUS_2026;
    } else {
      return NextResponse.json({ error: `No seed data for ${countryCode} ${year}` }, { status: 400 });
    }

    const rows = holidays.map(h => ({
      account_id: accountId,
      country_code: countryCode,
      date: h.date,
      name: h.name,
      is_recurring: h.is_recurring,
    }));

    const { data, error } = await getDb()
      .from("public_holiday")
      .upsert(rows, { onConflict: "account_id,country_code,date" })
      .select();

    if (error) throw error;

    return NextResponse.json({ holidays: data, count: data?.length ?? 0 }, { status: 201 });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(e instanceof Error ? e.message : JSON.stringify(e));
    await logToErrorDb(accountId, `Holiday seed error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
