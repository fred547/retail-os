import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

// ── Types ──

interface QuoteLine {
  product_name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
  line_total: number;
  position: number;
}

interface Quotation {
  document_no?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  currency?: string | null;
  notes?: string | null;
  terms?: string | null;
  valid_until?: string | null;
  status?: string;
  created_at?: string | null;
}

interface TemplateConfig {
  logo_url?: string | null;
  primary_color?: string;
  company_name?: string | null;
  company_address?: string | null;
  company_phone?: string | null;
  company_email?: string | null;
  footer_text?: string | null;
  default_terms?: string | null;
  show_tax_breakdown?: boolean;
  show_discount_column?: boolean;
}

interface RenderProps {
  templateId: string;
  quotation: Quotation;
  lines: QuoteLine[];
  config?: TemplateConfig;
}

// ── Helpers ──

function fmt(n: number): string {
  return n.toFixed(2);
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return iso; }
}

// ── Main Export ──

export function renderQuotePdf(props: RenderProps): React.ReactElement {
  switch (props.templateId) {
    case "modern": return <ModernTemplate {...props} />;
    case "minimal": return <MinimalTemplate {...props} />;
    case "bold": return <BoldTemplate {...props} />;
    case "elegant": return <ElegantTemplate {...props} />;
    default: return <ClassicTemplate {...props} />;
  }
}

// ═══════════════════════════════════════════════════
// TEMPLATE 1: Classic
// Traditional business — serif feel, bordered table
// ═══════════════════════════════════════════════════

function ClassicTemplate({ quotation: q, lines, config: c }: RenderProps) {
  const color = c?.primary_color || "#1976D2";
  const s = StyleSheet.create({
    page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#333" },
    header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
    title: { fontSize: 24, fontWeight: "bold", color, fontFamily: "Helvetica-Bold" },
    companyInfo: { textAlign: "right", fontSize: 9, color: "#666", lineHeight: 1.5 },
    badge: { backgroundColor: color, color: "#fff", padding: "3 8", borderRadius: 3, fontSize: 8, fontFamily: "Helvetica-Bold" },
    billTo: { marginBottom: 15, padding: 10, backgroundColor: "#f8f9fa", borderRadius: 4 },
    billToLabel: { fontSize: 8, color: "#999", marginBottom: 4, fontFamily: "Helvetica-Bold", textTransform: "uppercase" as const, letterSpacing: 1 },
    table: { marginBottom: 15 },
    tableHeader: { flexDirection: "row", backgroundColor: color, padding: "6 8", borderRadius: 3 },
    th: { color: "#fff", fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase" as const },
    row: { flexDirection: "row", padding: "6 8", borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0" },
    cell: { fontSize: 9 },
    totals: { alignItems: "flex-end", marginBottom: 20 },
    totalRow: { flexDirection: "row", justifyContent: "flex-end", paddingVertical: 2 },
    totalLabel: { width: 100, textAlign: "right", fontSize: 9, color: "#666" },
    totalValue: { width: 80, textAlign: "right", fontSize: 9, fontFamily: "Helvetica-Bold" },
    grandTotal: { fontSize: 14, color, fontFamily: "Helvetica-Bold" },
    section: { marginBottom: 10 },
    sectionTitle: { fontSize: 8, color: "#999", marginBottom: 4, fontFamily: "Helvetica-Bold", textTransform: "uppercase" as const },
    footer: { position: "absolute" as const, bottom: 30, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#999" },
  });

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>QUOTATION</Text>
            <Text style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{q.document_no || ""}</Text>
          </View>
          <View style={s.companyInfo}>
            <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: "#333" }}>{c?.company_name || "Your Company"}</Text>
            {c?.company_address && <Text>{c.company_address}</Text>}
            {c?.company_phone && <Text>{c.company_phone}</Text>}
            {c?.company_email && <Text>{c.company_email}</Text>}
          </View>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15 }}>
          <View style={s.billTo}>
            <Text style={s.billToLabel}>Bill To</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11 }}>{q.customer_name || "—"}</Text>
            {q.customer_email && <Text style={{ fontSize: 9, color: "#666" }}>{q.customer_email}</Text>}
            {q.customer_phone && <Text style={{ fontSize: 9, color: "#666" }}>{q.customer_phone}</Text>}
            {q.customer_address && <Text style={{ fontSize: 9, color: "#666" }}>{q.customer_address}</Text>}
          </View>
          <View style={{ textAlign: "right" }}>
            <Text style={{ fontSize: 9, color: "#666" }}>Date: {fmtDate(q.created_at)}</Text>
            {q.valid_until && <Text style={{ fontSize: 9, color: "#666" }}>Valid until: {fmtDate(q.valid_until)}</Text>}
            <View style={{ ...s.badge, marginTop: 4, alignSelf: "flex-end" }}>
              <Text>{(q.status || "draft").toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {renderTable(lines, s, c)}
        {renderTotals(q, s, c)}
        {q.notes && <View style={s.section}><Text style={s.sectionTitle}>Notes</Text><Text style={{ fontSize: 9, color: "#555" }}>{q.notes}</Text></View>}
        {(q.terms || c?.default_terms) && <View style={s.section}><Text style={s.sectionTitle}>Terms &amp; Conditions</Text><Text style={{ fontSize: 8, color: "#777", lineHeight: 1.4 }}>{q.terms || c?.default_terms}</Text></View>}
        <Text style={s.footer}>{c?.footer_text || "Thank you for your business"}</Text>
      </Page>
    </Document>
  );
}

// ═══════════════════════════════════════════════════
// TEMPLATE 2: Modern
// Clean, colored header band
// ═══════════════════════════════════════════════════

function ModernTemplate({ quotation: q, lines, config: c }: RenderProps) {
  const color = c?.primary_color || "#6366F1";
  const s = StyleSheet.create({
    page: { fontSize: 10, fontFamily: "Helvetica", color: "#1f2937" },
    headerBand: { backgroundColor: color, padding: "30 40 20 40" },
    title: { fontSize: 22, color: "#fff", fontFamily: "Helvetica-Bold" },
    subtitle: { fontSize: 10, color: "rgba(255,255,255,0.8)", marginTop: 2 },
    body: { padding: "20 40 40 40" },
    infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
    infoBox: { flex: 1 },
    label: { fontSize: 7, color: "#9ca3af", fontFamily: "Helvetica-Bold", textTransform: "uppercase" as const, marginBottom: 3, letterSpacing: 0.5 },
    table: { marginBottom: 20 },
    tableHeader: { flexDirection: "row", borderBottomWidth: 2, borderBottomColor: color, paddingBottom: 6, marginBottom: 4 },
    th: { fontSize: 8, color: "#6b7280", fontFamily: "Helvetica-Bold", textTransform: "uppercase" as const },
    row: { flexDirection: "row", paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
    cell: { fontSize: 9 },
    totals: { alignItems: "flex-end", marginBottom: 20 },
    totalRow: { flexDirection: "row", justifyContent: "flex-end", paddingVertical: 2 },
    totalLabel: { width: 100, textAlign: "right", fontSize: 9, color: "#6b7280" },
    totalValue: { width: 80, textAlign: "right", fontSize: 9, fontFamily: "Helvetica-Bold" },
    grandTotal: { fontSize: 16, color, fontFamily: "Helvetica-Bold" },
    section: { marginBottom: 10 },
    sectionTitle: { fontSize: 8, color: "#9ca3af", fontFamily: "Helvetica-Bold", textTransform: "uppercase" as const, marginBottom: 3 },
    footer: { position: "absolute" as const, bottom: 25, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#9ca3af" },
  });

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.headerBand}>
          <Text style={s.title}>{c?.company_name || "Quotation"}</Text>
          <Text style={s.subtitle}>{q.document_no || ""} — {fmtDate(q.created_at)}</Text>
        </View>
        <View style={s.body}>
          <View style={s.infoRow}>
            <View style={s.infoBox}>
              <Text style={s.label}>Prepared For</Text>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11 }}>{q.customer_name || "—"}</Text>
              {q.customer_email && <Text style={{ fontSize: 9, color: "#6b7280" }}>{q.customer_email}</Text>}
              {q.customer_phone && <Text style={{ fontSize: 9, color: "#6b7280" }}>{q.customer_phone}</Text>}
            </View>
            <View style={{ ...s.infoBox, alignItems: "flex-end" }}>
              <Text style={s.label}>Details</Text>
              {q.valid_until && <Text style={{ fontSize: 9 }}>Valid until {fmtDate(q.valid_until)}</Text>}
              {c?.company_address && <Text style={{ fontSize: 9, color: "#6b7280" }}>{c.company_address}</Text>}
            </View>
          </View>
          {renderTable(lines, s, c)}
          {renderTotals(q, s, c)}
          {q.notes && <View style={s.section}><Text style={s.sectionTitle}>Notes</Text><Text style={{ fontSize: 9, color: "#4b5563" }}>{q.notes}</Text></View>}
          {(q.terms || c?.default_terms) && <View style={s.section}><Text style={s.sectionTitle}>Terms</Text><Text style={{ fontSize: 8, color: "#9ca3af", lineHeight: 1.4 }}>{q.terms || c?.default_terms}</Text></View>}
        </View>
        <Text style={s.footer}>{c?.footer_text || "Thank you for your business"}</Text>
      </Page>
    </Document>
  );
}

// ═══════════════════════════════════════════════════
// TEMPLATE 3: Minimal
// Whitespace-heavy, thin lines
// ═══════════════════════════════════════════════════

function MinimalTemplate({ quotation: q, lines, config: c }: RenderProps) {
  const color = c?.primary_color || "#111827";
  const s = StyleSheet.create({
    page: { padding: 50, fontSize: 10, fontFamily: "Helvetica", color: "#374151" },
    header: { marginBottom: 40 },
    title: { fontSize: 14, fontFamily: "Helvetica-Bold", color, letterSpacing: 3, textTransform: "uppercase" as const },
    docNo: { fontSize: 9, color: "#9ca3af", marginTop: 4 },
    hr: { borderBottomWidth: 0.5, borderBottomColor: "#d1d5db", marginVertical: 15 },
    infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
    label: { fontSize: 7, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 4 },
    table: { marginBottom: 20 },
    tableHeader: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#d1d5db", paddingBottom: 8 },
    th: { fontSize: 7, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: 0.5 },
    row: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 0.25, borderBottomColor: "#e5e7eb" },
    cell: { fontSize: 9, fontFamily: "Courier" },
    totals: { alignItems: "flex-end", marginTop: 10, marginBottom: 30 },
    totalRow: { flexDirection: "row", justifyContent: "flex-end", paddingVertical: 3 },
    totalLabel: { width: 100, textAlign: "right", fontSize: 9, color: "#6b7280" },
    totalValue: { width: 80, textAlign: "right", fontSize: 9, fontFamily: "Courier-Bold" },
    grandTotal: { fontSize: 14, color, fontFamily: "Courier-Bold" },
    section: { marginBottom: 15 },
    sectionTitle: { fontSize: 7, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 4 },
    footer: { position: "absolute" as const, bottom: 30, left: 50, right: 50, textAlign: "center", fontSize: 7, color: "#d1d5db" },
  });

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>Quotation</Text>
          <Text style={s.docNo}>{q.document_no} — {fmtDate(q.created_at)}</Text>
        </View>
        <View style={s.hr} />
        <View style={s.infoRow}>
          <View>
            <Text style={s.label}>From</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{c?.company_name || "—"}</Text>
            {c?.company_email && <Text style={{ fontSize: 9, color: "#6b7280" }}>{c.company_email}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.label}>To</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{q.customer_name || "—"}</Text>
            {q.customer_email && <Text style={{ fontSize: 9, color: "#6b7280" }}>{q.customer_email}</Text>}
          </View>
        </View>
        {renderTable(lines, s, c)}
        {renderTotals(q, s, c)}
        {q.notes && <View style={s.section}><Text style={s.sectionTitle}>Notes</Text><Text style={{ fontSize: 9 }}>{q.notes}</Text></View>}
        {(q.terms || c?.default_terms) && <View style={s.section}><Text style={s.sectionTitle}>Terms</Text><Text style={{ fontSize: 8, color: "#9ca3af" }}>{q.terms || c?.default_terms}</Text></View>}
        <Text style={s.footer}>{c?.footer_text || ""}</Text>
      </Page>
    </Document>
  );
}

// ═══════════════════════════════════════════════════
// TEMPLATE 4: Bold
// Large header, thick borders, big totals
// ═══════════════════════════════════════════════════

function BoldTemplate({ quotation: q, lines, config: c }: RenderProps) {
  const color = c?.primary_color || "#DC2626";
  const s = StyleSheet.create({
    page: { fontSize: 10, fontFamily: "Helvetica", color: "#1f2937" },
    headerBlock: { backgroundColor: color, padding: "35 40 25 40" },
    title: { fontSize: 28, color: "#fff", fontFamily: "Helvetica-Bold", letterSpacing: 2 },
    headerSub: { fontSize: 11, color: "rgba(255,255,255,0.9)", marginTop: 4 },
    body: { padding: "25 40 40 40" },
    infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20, padding: 12, backgroundColor: "#f3f4f6", borderRadius: 4 },
    label: { fontSize: 7, color: "#6b7280", fontFamily: "Helvetica-Bold", textTransform: "uppercase" as const, marginBottom: 2 },
    table: { marginBottom: 20 },
    tableHeader: { flexDirection: "row", backgroundColor: "#1f2937", padding: "8 10", borderRadius: 4 },
    th: { color: "#fff", fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase" as const },
    row: { flexDirection: "row", padding: "8 10", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
    cell: { fontSize: 10 },
    totals: { alignItems: "flex-end", marginBottom: 25 },
    totalRow: { flexDirection: "row", justifyContent: "flex-end", paddingVertical: 3 },
    totalLabel: { width: 110, textAlign: "right", fontSize: 10, color: "#6b7280" },
    totalValue: { width: 90, textAlign: "right", fontSize: 10, fontFamily: "Helvetica-Bold" },
    grandTotal: { fontSize: 20, color, fontFamily: "Helvetica-Bold" },
    section: { marginBottom: 12 },
    sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#374151", marginBottom: 3, textTransform: "uppercase" as const },
    footer: { position: "absolute" as const, bottom: 25, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#9ca3af" },
  });

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.headerBlock}>
          <Text style={s.title}>QUOTE</Text>
          <Text style={s.headerSub}>{q.document_no} — {c?.company_name || ""}</Text>
        </View>
        <View style={s.body}>
          <View style={s.infoRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Customer</Text>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 12 }}>{q.customer_name || "—"}</Text>
              {q.customer_phone && <Text>{q.customer_phone}</Text>}
              {q.customer_email && <Text>{q.customer_email}</Text>}
            </View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={s.label}>Date</Text>
              <Text style={{ fontSize: 11 }}>{fmtDate(q.created_at)}</Text>
              {q.valid_until && <><Text style={{ ...s.label, marginTop: 4 }}>Expires</Text><Text style={{ fontSize: 11 }}>{fmtDate(q.valid_until)}</Text></>}
            </View>
          </View>
          {renderTable(lines, s, c)}
          {renderTotals(q, s, c)}
          {q.notes && <View style={s.section}><Text style={s.sectionTitle}>Notes</Text><Text>{q.notes}</Text></View>}
          {(q.terms || c?.default_terms) && <View style={s.section}><Text style={s.sectionTitle}>Terms</Text><Text style={{ fontSize: 8, color: "#6b7280" }}>{q.terms || c?.default_terms}</Text></View>}
        </View>
        <Text style={s.footer}>{c?.footer_text || "Thank you for your business"}</Text>
      </Page>
    </Document>
  );
}

// ═══════════════════════════════════════════════════
// TEMPLATE 5: Elegant
// Thin accents, light gray background
// ═══════════════════════════════════════════════════

function ElegantTemplate({ quotation: q, lines, config: c }: RenderProps) {
  const color = c?.primary_color || "#92400E";
  const s = StyleSheet.create({
    page: { padding: 45, fontSize: 10, fontFamily: "Helvetica", color: "#44403c", backgroundColor: "#fafaf9" },
    header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 25, borderBottomWidth: 1, borderBottomColor: color, paddingBottom: 15 },
    title: { fontSize: 18, color, fontFamily: "Helvetica-Bold", letterSpacing: 4, textTransform: "uppercase" as const },
    companyInfo: { textAlign: "right", fontSize: 9, color: "#78716c", lineHeight: 1.5 },
    billTo: { marginBottom: 20 },
    label: { fontSize: 7, color, fontFamily: "Helvetica-Bold", textTransform: "uppercase" as const, letterSpacing: 1.5, marginBottom: 4 },
    table: { marginBottom: 20 },
    tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: color, paddingBottom: 6 },
    th: { fontSize: 7, color, fontFamily: "Helvetica-Bold", textTransform: "uppercase" as const, letterSpacing: 0.5 },
    row: { flexDirection: "row", paddingVertical: 7, borderBottomWidth: 0.25, borderBottomColor: "#d6d3d1" },
    cell: { fontSize: 9 },
    totals: { alignItems: "flex-end", marginBottom: 25 },
    totalRow: { flexDirection: "row", justifyContent: "flex-end", paddingVertical: 2 },
    totalLabel: { width: 100, textAlign: "right", fontSize: 9, color: "#78716c" },
    totalValue: { width: 80, textAlign: "right", fontSize: 9, fontFamily: "Helvetica-Bold" },
    grandTotal: { fontSize: 15, color, fontFamily: "Helvetica-Bold" },
    section: { marginBottom: 12 },
    sectionTitle: { fontSize: 7, color, fontFamily: "Helvetica-Bold", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 3 },
    footer: { position: "absolute" as const, bottom: 25, left: 45, right: 45, textAlign: "center", fontSize: 7, color: "#a8a29e", borderTopWidth: 0.5, borderTopColor: "#d6d3d1", paddingTop: 8 },
  });

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Quotation</Text>
            <Text style={{ fontSize: 9, color: "#78716c", marginTop: 3 }}>{q.document_no} — {fmtDate(q.created_at)}</Text>
          </View>
          <View style={s.companyInfo}>
            <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: "#44403c" }}>{c?.company_name || ""}</Text>
            {c?.company_address && <Text>{c.company_address}</Text>}
            {c?.company_phone && <Text>{c.company_phone}</Text>}
            {c?.company_email && <Text>{c.company_email}</Text>}
          </View>
        </View>

        <View style={s.billTo}>
          <Text style={s.label}>Prepared For</Text>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11 }}>{q.customer_name || "—"}</Text>
          {q.customer_email && <Text style={{ fontSize: 9, color: "#78716c" }}>{q.customer_email}</Text>}
          {q.customer_address && <Text style={{ fontSize: 9, color: "#78716c" }}>{q.customer_address}</Text>}
          {q.valid_until && <Text style={{ fontSize: 9, color: "#78716c", marginTop: 3 }}>Valid until {fmtDate(q.valid_until)}</Text>}
        </View>

        {renderTable(lines, s, c)}
        {renderTotals(q, s, c)}
        {q.notes && <View style={s.section}><Text style={s.sectionTitle}>Notes</Text><Text style={{ fontSize: 9 }}>{q.notes}</Text></View>}
        {(q.terms || c?.default_terms) && <View style={s.section}><Text style={s.sectionTitle}>Terms &amp; Conditions</Text><Text style={{ fontSize: 8, color: "#a8a29e", lineHeight: 1.4 }}>{q.terms || c?.default_terms}</Text></View>}
        <Text style={s.footer}>{c?.footer_text || "Thank you for choosing us"}</Text>
      </Page>
    </Document>
  );
}

// ═══════════════════════════════════════════════════
// SHARED: Table + Totals (used by all templates)
// ═══════════════════════════════════════════════════

function renderTable(lines: QuoteLine[], s: any, c?: TemplateConfig) {
  const showDiscount = c?.show_discount_column !== false && lines.some((l) => l.discount_percent > 0);

  return (
    <View style={s.table}>
      <View style={s.tableHeader}>
        <Text style={{ ...s.th, width: 25 }}>#</Text>
        <Text style={{ ...s.th, flex: 1 }}>Description</Text>
        <Text style={{ ...s.th, width: 45, textAlign: "right" }}>Qty</Text>
        <Text style={{ ...s.th, width: 70, textAlign: "right" }}>Price</Text>
        {showDiscount && <Text style={{ ...s.th, width: 45, textAlign: "right" }}>Disc</Text>}
        <Text style={{ ...s.th, width: 75, textAlign: "right" }}>Total</Text>
      </View>
      {lines.map((line, i) => (
        <View key={i} style={s.row}>
          <Text style={{ ...s.cell, width: 25, color: "#9ca3af" }}>{i + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.cell}>{line.product_name}</Text>
            {line.description && <Text style={{ fontSize: 8, color: "#9ca3af" }}>{line.description}</Text>}
          </View>
          <Text style={{ ...s.cell, width: 45, textAlign: "right" }}>{line.quantity}</Text>
          <Text style={{ ...s.cell, width: 70, textAlign: "right" }}>{fmt(line.unit_price)}</Text>
          {showDiscount && <Text style={{ ...s.cell, width: 45, textAlign: "right" }}>{line.discount_percent > 0 ? `${line.discount_percent}%` : ""}</Text>}
          <Text style={{ ...s.cell, width: 75, textAlign: "right", fontFamily: "Helvetica-Bold" }}>{fmt(line.line_total)}</Text>
        </View>
      ))}
    </View>
  );
}

function renderTotals(q: Quotation, s: any, c?: TemplateConfig) {
  return (
    <View style={s.totals}>
      <View style={s.totalRow}>
        <Text style={s.totalLabel}>Subtotal</Text>
        <Text style={s.totalValue}>{fmt(q.subtotal)}</Text>
      </View>
      {(c?.show_tax_breakdown !== false) && q.tax_total > 0 && (
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Tax</Text>
          <Text style={s.totalValue}>{fmt(q.tax_total)}</Text>
        </View>
      )}
      <View style={{ ...s.totalRow, marginTop: 4, borderTopWidth: 1, borderTopColor: "#d1d5db", paddingTop: 4 }}>
        <Text style={{ ...s.totalLabel, fontSize: 12 }}>Total</Text>
        <Text style={s.grandTotal}>{fmt(q.grand_total)}</Text>
      </View>
    </View>
  );
}
