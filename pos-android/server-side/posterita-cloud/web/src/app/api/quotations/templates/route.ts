import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "QUOTE_TEMPLATE",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** Available templates (hardcoded — styles live in code, config in DB) */
const TEMPLATES = [
  { id: "classic", name: "Classic", description: "Traditional business — serif header, bordered table, blue accents" },
  { id: "modern", name: "Modern", description: "Clean sans-serif, colored header band, rounded badges" },
  { id: "minimal", name: "Minimal", description: "Lots of whitespace, thin lines, monospace prices" },
  { id: "bold", name: "Bold", description: "Large colored header block, thick borders, big totals" },
  { id: "elegant", name: "Elegant", description: "Thin gold/dark accents, light gray background" },
];

/**
 * GET /api/quotations/templates — list templates with account configs
 */
export async function GET() {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { data: configs } = await getDb()
      .from("quote_template_config")
      .select("*")
      .eq("account_id", accountId);

    const configMap: Record<string, any> = {};
    for (const c of configs ?? []) configMap[c.template_id] = c;

    const templates = TEMPLATES.map((t) => ({
      ...t,
      config: configMap[t.id] ?? null,
      is_default: configMap[t.id]?.is_default ?? false,
    }));

    return NextResponse.json({ templates });
  } catch (e: any) {
    await logToErrorDb(accountId, `Template list error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * POST /api/quotations/templates — save/update template config
 */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { template_id, ...config } = body;

    if (!template_id || !TEMPLATES.find((t) => t.id === template_id)) {
      return NextResponse.json({ error: "Invalid template_id" }, { status: 400 });
    }

    // If setting as default, unset other defaults first
    if (config.is_default) {
      await getDb().from("quote_template_config")
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq("account_id", accountId)
        .eq("is_default", true);
    }

    const { data, error } = await getDb()
      .from("quote_template_config")
      .upsert({
        account_id: accountId,
        template_id,
        logo_url: config.logo_url ?? null,
        primary_color: config.primary_color ?? "#1976D2",
        company_name: config.company_name ?? null,
        company_address: config.company_address ?? null,
        company_phone: config.company_phone ?? null,
        company_email: config.company_email ?? null,
        footer_text: config.footer_text ?? null,
        default_terms: config.default_terms ?? null,
        default_valid_days: config.default_valid_days ?? 30,
        show_tax_breakdown: config.show_tax_breakdown ?? true,
        show_discount_column: config.show_discount_column ?? true,
        is_default: config.is_default ?? false,
        updated_at: new Date().toISOString(),
      }, { onConflict: "account_id,template_id" })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ config: data });
  } catch (e: any) {
    await logToErrorDb(accountId, `Template save error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
