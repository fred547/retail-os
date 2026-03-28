import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";
import { renderToBuffer } from "@react-pdf/renderer";
import { renderQuotePdf } from "@/lib/pdf/quote-templates";

// ════════════════════════════════════════════════════════
// Rate limiting — 30 requests per hour per account
// ════════════════════════════════════════════════════════
const pdfRateLimiter = new Map<string, { count: number; firstAttempt: number }>();
const PDF_MAX = 30;
const PDF_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkPdfRate(key: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const entry = pdfRateLimiter.get(key);
  if (!entry || now - entry.firstAttempt > PDF_WINDOW_MS) {
    pdfRateLimiter.set(key, { count: 1, firstAttempt: now });
    return { allowed: true };
  }
  if (entry.count >= PDF_MAX) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.firstAttempt + PDF_WINDOW_MS - now) / 1000) };
  }
  entry.count++;
  return { allowed: true };
}

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "QUOTATION_PDF",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * POST /api/quotations/[id]/pdf — generate PDF for a quotation
 * Query param: ?template=classic (optional override)
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Rate limit check
  const rateCheck = checkPdfRate(accountId);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "PDF generation rate limit exceeded. Max 30 per hour." },
      { status: 429, headers: { "Retry-After": String(rateCheck.retryAfterSec) } }
    );
  }

  try {
    const { id } = await params;
    const quotationId = parseInt(id);
    if (isNaN(quotationId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }
    const url = new URL(req.url);
    const templateOverride = url.searchParams.get("template");

    // Fetch quotation + lines + template config
    const [{ data: quotation }, { data: lines }] = await Promise.all([
      getDb().from("quotation").select("*")
        .eq("quotation_id", quotationId).eq("account_id", accountId).eq("is_deleted", false).single(),
      getDb().from("quotation_line").select("*")
        .eq("quotation_id", quotationId).order("position"),
    ]);

    if (!quotation) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });

    const templateId = templateOverride || quotation.template_id || "classic";

    // Get template config (may not exist — use defaults)
    const { data: config } = await getDb().from("quote_template_config").select("*")
      .eq("account_id", accountId).eq("template_id", templateId).maybeSingle();

    // Generate PDF
    const pdfElement = renderQuotePdf({
      templateId,
      quotation,
      lines: lines ?? [],
      config: config ?? undefined,
    });

    const buffer = await renderToBuffer(pdfElement as any);

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Quote-${quotation.document_no || quotationId}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    await logToErrorDb(accountId, `Quotation PDF error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
