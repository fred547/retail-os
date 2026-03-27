/**
 * Xero API helper — OAuth 2.0 + invoice/payment mapping.
 *
 * Env vars required:
 *   XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_REDIRECT_URI
 *
 * Scopes: openid profile email accounting.transactions accounting.contacts offline_access
 */

const XERO_AUTH_URL = "https://login.xero.com/identity/connect/authorize";
const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";
const XERO_API_URL = "https://api.xero.com/api.xro/2.0";
const XERO_CONNECTIONS_URL = "https://api.xero.com/connections";
// Granular scopes for apps created after March 2, 2026
// Broad scopes like accounting.transactions are DEPRECATED — use specific resource scopes
// See: https://developer.xero.com/documentation/guides/oauth2/scopes/
const SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  // Invoices (create + read)
  "accounting.invoices",
  // Payments (create + read)
  "accounting.payments",
  // Manual Journals (cash variance)
  "accounting.manualjournals",
  // Chart of Accounts + Tax Rates (for config dropdowns)
  "accounting.settings.read",
].join(" ");

export function getXeroConfig() {
  return {
    clientId: (process.env.XERO_CLIENT_ID || "").trim(),
    clientSecret: (process.env.XERO_CLIENT_SECRET || "").trim(),
    redirectUri: (process.env.XERO_REDIRECT_URI || "https://web.posterita.com/api/integrations/xero/callback").trim(),
  };
}

/** Build the Xero OAuth authorize URL */
export function buildAuthUrl(state: string): string {
  const { clientId, redirectUri } = getXeroConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
  });
  return `${XERO_AUTH_URL}?${params}`;
}

/** Exchange authorization code for tokens */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  id_token?: string;
}> {
  const { clientId, clientSecret, redirectUri } = getXeroConfig();
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xero token exchange failed: ${res.status} ${body}`);
  }

  return res.json();
}

/** Refresh an expired access token */
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const { clientId, clientSecret } = getXeroConfig();
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xero token refresh failed: ${res.status} ${body}`);
  }

  return res.json();
}

/** Get connected Xero tenants/organisations */
export async function getConnections(accessToken: string): Promise<Array<{
  tenantId: string;
  tenantName: string;
  tenantType: string;
}>> {
  const res = await fetch(XERO_CONNECTIONS_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Xero connections failed: ${res.status}`);
  return res.json();
}

/** Create an invoice in Xero */
export async function createInvoice(
  accessToken: string,
  tenantId: string,
  invoice: XeroInvoice
): Promise<{ InvoiceID: string; InvoiceNumber: string }> {
  const res = await fetch(`${XERO_API_URL}/Invoices`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "xero-tenant-id": tenantId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ Invoices: [invoice] }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xero create invoice failed: ${res.status} ${body}`);
  }

  const data = await res.json();
  const created = data.Invoices?.[0];
  return { InvoiceID: created?.InvoiceID, InvoiceNumber: created?.InvoiceNumber };
}

/** Create a payment against an invoice in Xero */
export async function createPayment(
  accessToken: string,
  tenantId: string,
  payment: XeroPayment
): Promise<{ PaymentID: string }> {
  const res = await fetch(`${XERO_API_URL}/Payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "xero-tenant-id": tenantId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ Payments: [payment] }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xero create payment failed: ${res.status} ${body}`);
  }

  const data = await res.json();
  return { PaymentID: data.Payments?.[0]?.PaymentID };
}

/** Fetch Chart of Accounts from Xero (for mapping dropdowns) */
export async function getAccounts(accessToken: string, tenantId: string): Promise<Array<{
  AccountID: string;
  Code: string;
  Name: string;
  Type: string;
  Class: string;
  Status: string;
}>> {
  const res = await fetch(`${XERO_API_URL}/Accounts?where=Status=="ACTIVE"`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "xero-tenant-id": tenantId,
    },
  });
  if (!res.ok) throw new Error(`Xero accounts fetch failed: ${res.status}`);
  const data = await res.json();
  return data.Accounts ?? [];
}

/** Fetch Tax Rates from Xero (for tax mapping) */
export async function getTaxRates(accessToken: string, tenantId: string): Promise<Array<{
  Name: string;
  TaxType: string;
  EffectiveRate: number;
  Status: string;
}>> {
  const res = await fetch(`${XERO_API_URL}/TaxRates`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "xero-tenant-id": tenantId,
    },
  });
  if (!res.ok) throw new Error(`Xero tax rates fetch failed: ${res.status}`);
  const data = await res.json();
  return data.TaxRates ?? [];
}

/** Create a Credit Note in Xero (for refunds) */
export async function createCreditNote(
  accessToken: string,
  tenantId: string,
  creditNote: XeroCreditNote
): Promise<{ CreditNoteID: string; CreditNoteNumber: string }> {
  const res = await fetch(`${XERO_API_URL}/CreditNotes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "xero-tenant-id": tenantId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ CreditNotes: [creditNote] }),
  });
  if (!res.ok) throw new Error(`Xero credit note failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const created = data.CreditNotes?.[0];
  return { CreditNoteID: created?.CreditNoteID, CreditNoteNumber: created?.CreditNoteNumber };
}

/** Create a Manual Journal in Xero (for cash variance, tips) */
export async function createJournalEntry(
  accessToken: string,
  tenantId: string,
  journal: XeroJournal
): Promise<{ JournalID: string }> {
  const res = await fetch(`${XERO_API_URL}/ManualJournals`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "xero-tenant-id": tenantId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ManualJournals: [journal] }),
  });
  if (!res.ok) throw new Error(`Xero journal failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return { JournalID: data.ManualJournals?.[0]?.ManualJournalID };
}

// ── Type mappings ──

export interface XeroInvoice {
  Type: "ACCREC"; // Accounts Receivable (sales invoice)
  Contact: { Name: string; EmailAddress?: string };
  Date: string; // YYYY-MM-DD
  DueDate: string;
  LineItems: Array<{
    Description: string;
    Quantity: number;
    UnitAmount: number;
    AccountCode?: string; // e.g., "200" for Sales
    TaxType?: string;
  }>;
  Reference?: string; // your order number
  Status?: "AUTHORISED" | "DRAFT";
  CurrencyCode?: string;
}

export interface XeroPayment {
  Invoice: { InvoiceID: string };
  Account: { Code: string }; // e.g., "090" for bank
  Date: string;
  Amount: number;
  Reference?: string;
}

export interface XeroCreditNote {
  Type: "ACCRECCREDIT";
  Contact: { Name: string; EmailAddress?: string };
  Date: string;
  LineItems: Array<{
    Description: string;
    Quantity: number;
    UnitAmount: number;
    AccountCode?: string;
    TaxType?: string;
  }>;
  Reference?: string;
  Status?: "AUTHORISED" | "DRAFT";
  CurrencyCode?: string;
}

export interface XeroJournal {
  Narration: string;
  Date: string;
  JournalLines: Array<{
    LineAmount: number;
    AccountCode: string;
    Description?: string;
    TaxType?: string;
  }>;
}

/** Settings stored per-account in integration_connection.settings */
export interface XeroAccountMapping {
  sync_mode: "per_order" | "daily_summary";
  auto_push: boolean;
  sales_account_code: string;       // Revenue (e.g., "200")
  cash_account_code: string;        // Cash on Hand (e.g., "090")
  card_account_code: string;        // Card Clearing (e.g., "091")
  tips_account_code: string;        // Tips Income (e.g., "260")
  discount_account_code: string;    // Discounts Given (e.g., "400")
  rounding_account_code: string;    // Rounding (e.g., "490")
  cash_variance_account_code: string; // Cash Over/Short (e.g., "480")
  tax_mappings: Record<string, string>; // posterita tax_id → Xero TaxType
}

export const DEFAULT_MAPPING: XeroAccountMapping = {
  sync_mode: "per_order",
  auto_push: true,
  sales_account_code: "200",
  cash_account_code: "090",
  card_account_code: "091",
  tips_account_code: "260",
  discount_account_code: "400",
  rounding_account_code: "490",
  cash_variance_account_code: "480",
  tax_mappings: {},
};

/** Map a Posterita order to a Xero invoice (uses account-specific settings) */
export function mapOrderToInvoice(
  order: any,
  lines: any[],
  currency: string,
  mapping: XeroAccountMapping = DEFAULT_MAPPING,
  taxes: Array<{ tax_id: number; rate: number; name: string }> = []
): XeroInvoice {
  const date = new Date(order.created_at || Date.now()).toISOString().slice(0, 10);
  const taxLookup: Record<number, string> = {};
  for (const t of taxes) {
    taxLookup[t.tax_id] = mapping.tax_mappings[String(t.tax_id)] || "NONE";
  }

  const lineItems: XeroInvoice["LineItems"] = lines.map((line: any) => ({
    Description: line.productname || line.product_name || "Item",
    Quantity: Math.abs(line.qtyentered ?? line.qty ?? 1),
    UnitAmount: Math.abs(line.priceentered ?? line.price ?? 0),
    AccountCode: mapping.sales_account_code,
    TaxType: taxLookup[line.tax_id] || undefined,
  }));

  // Add discount as negative line if present
  const discount = Math.abs(order.discount_total ?? order.discounttotal ?? 0);
  if (discount > 0) {
    lineItems.push({
      Description: "Discount",
      Quantity: 1,
      UnitAmount: -discount,
      AccountCode: mapping.discount_account_code,
    });
  }

  // Add tips as positive line if present
  const tips = Math.abs(order.tips ?? 0);
  if (tips > 0) {
    lineItems.push({
      Description: "Tips",
      Quantity: 1,
      UnitAmount: tips,
      AccountCode: mapping.tips_account_code,
    });
  }

  return {
    Type: "ACCREC",
    Contact: {
      Name: order.customer_name || "Walk-in Customer",
      EmailAddress: order.customer_email || undefined,
    },
    Date: date,
    DueDate: date,
    Reference: order.document_no || order.uuid,
    Status: "AUTHORISED",
    CurrencyCode: currency,
    LineItems: lineItems,
  };
}

/** Map a Posterita payment to a Xero payment (uses account-specific settings) */
export function mapPaymentToXero(
  payment: any,
  invoiceId: string,
  mapping: XeroAccountMapping = DEFAULT_MAPPING
): XeroPayment {
  const date = new Date(payment.datepaid || payment.created_at || Date.now()).toISOString().slice(0, 10);
  const isCash = (payment.paymenttype || payment.paymentType || "").toUpperCase() === "CASH";

  return {
    Invoice: { InvoiceID: invoiceId },
    Account: { Code: isCash ? mapping.cash_account_code : mapping.card_account_code },
    Date: date,
    Amount: Math.abs(payment.amount ?? payment.payamt ?? 0),
    Reference: payment.documentno || undefined,
  };
}

/** Map a till close cash variance to a Xero journal entry */
export function mapCashVarianceToJournal(
  tillDocNo: string,
  variance: number,
  date: string,
  mapping: XeroAccountMapping = DEFAULT_MAPPING
): XeroJournal {
  // Variance > 0 = cash over, < 0 = cash short
  return {
    Narration: `Cash variance for till ${tillDocNo}`,
    Date: date,
    JournalLines: [
      {
        LineAmount: variance,
        AccountCode: mapping.cash_account_code,
        Description: variance > 0 ? "Cash over" : "Cash short",
      },
      {
        LineAmount: -variance,
        AccountCode: mapping.cash_variance_account_code,
        Description: variance > 0 ? "Cash over" : "Cash short",
      },
    ],
  };
}
