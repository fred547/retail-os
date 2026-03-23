import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";
import React from "react";
import { renderToBuffer, Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ════════════════════════════════════════════════════════
// Shared styles
// ════════════════════════════════════════════════════════

const colors = {
  primary: "#1976D2",
  ink: "#141414",
  muted: "#6C6F76",
  line: "#E6E2DA",
  bg: "#F5F2EA",
  white: "#FFFFFF",
};

// ════════════════════════════════════════════════════════
// Templates
// ════════════════════════════════════════════════════════

interface Product {
  product_id: number;
  name: string;
  description: string | null;
  sellingprice: number;
  costprice: number;
  image: string | null;
  upc: string | null;
  productcategory: { name: string } | null;
}

interface CatalogueOptions {
  template: "grid" | "list" | "compact" | "price-list";
  title: string;
  currency: string;
  showCost: boolean;
  showBarcode: boolean;
  showDescription: boolean;
  showImages: boolean;
}

function formatPrice(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Grid Template (2 columns, image + details) ──

function GridTemplate({ products, options }: { products: Product[]; options: CatalogueOptions }) {
  const s = StyleSheet.create({
    page: { padding: 40, fontFamily: "Helvetica", backgroundColor: colors.white },
    header: { marginBottom: 20, borderBottom: `2px solid ${colors.primary}`, paddingBottom: 12 },
    title: { fontSize: 22, fontWeight: "bold", color: colors.primary },
    subtitle: { fontSize: 10, color: colors.muted, marginTop: 4 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    card: { width: "48%", border: `1px solid ${colors.line}`, borderRadius: 6, padding: 10, marginBottom: 4 },
    image: { width: "100%", height: 100, objectFit: "contain", marginBottom: 8, borderRadius: 4, backgroundColor: "#f9f9f9" },
    noImage: { width: "100%", height: 100, backgroundColor: "#f5f5f5", borderRadius: 4, marginBottom: 8, justifyContent: "center", alignItems: "center" },
    noImageText: { fontSize: 10, color: colors.muted },
    name: { fontSize: 11, fontWeight: "bold", color: colors.ink, marginBottom: 3 },
    desc: { fontSize: 8, color: colors.muted, marginBottom: 4, lineClamp: 2 },
    price: { fontSize: 13, fontWeight: "bold", color: colors.primary },
    cost: { fontSize: 8, color: colors.muted, marginTop: 2 },
    barcode: { fontSize: 7, color: colors.muted, marginTop: 2, fontFamily: "Courier" },
    category: { fontSize: 7, color: colors.primary, marginBottom: 4, textTransform: "uppercase" },
    footer: { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between" },
    footerText: { fontSize: 7, color: colors.muted },
    pageNum: { fontSize: 7, color: colors.muted },
  });

  return React.createElement(Document, null,
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(View, { style: s.header },
        React.createElement(Text, { style: s.title }, options.title),
        React.createElement(Text, { style: s.subtitle }, `${products.length} products • Generated ${new Date().toLocaleDateString()}`),
      ),
      React.createElement(View, { style: s.grid },
        ...products.map((p) =>
          React.createElement(View, { key: p.product_id, style: s.card, wrap: false },
            options.showImages && p.image && p.image.startsWith("http")
              ? React.createElement(Image, { src: p.image, style: s.image } as any)
              : options.showImages
                ? React.createElement(View, { style: s.noImage }, React.createElement(Text, { style: s.noImageText }, "No image"))
                : null,
            p.productcategory?.name
              ? React.createElement(Text, { style: s.category }, p.productcategory.name)
              : null,
            React.createElement(Text, { style: s.name }, p.name),
            options.showDescription && p.description
              ? React.createElement(Text, { style: s.desc }, p.description.substring(0, 120))
              : null,
            React.createElement(Text, { style: s.price }, formatPrice(p.sellingprice, options.currency)),
            options.showCost
              ? React.createElement(Text, { style: s.cost }, `Cost: ${formatPrice(p.costprice, options.currency)}`)
              : null,
            options.showBarcode && p.upc
              ? React.createElement(Text, { style: s.barcode }, p.upc)
              : null,
          )
        )
      ),
      React.createElement(View, { style: s.footer, fixed: true },
        React.createElement(Text, { style: s.footerText }, options.title),
        React.createElement(Text, { style: s.pageNum, render: ({ pageNumber, totalPages }: any) => `${pageNumber} / ${totalPages}` } as any),
      ),
    )
  );
}

// ── List Template (full-width rows) ──

function ListTemplate({ products, options }: { products: Product[]; options: CatalogueOptions }) {
  const s = StyleSheet.create({
    page: { padding: 40, fontFamily: "Helvetica", backgroundColor: colors.white },
    header: { marginBottom: 20, borderBottom: `2px solid ${colors.primary}`, paddingBottom: 12 },
    title: { fontSize: 22, fontWeight: "bold", color: colors.primary },
    subtitle: { fontSize: 10, color: colors.muted, marginTop: 4 },
    row: { flexDirection: "row", borderBottom: `1px solid ${colors.line}`, paddingVertical: 8, alignItems: "center", gap: 12 },
    image: { width: 50, height: 50, objectFit: "contain", borderRadius: 4, backgroundColor: "#f9f9f9" },
    noImage: { width: 50, height: 50, backgroundColor: "#f5f5f5", borderRadius: 4, justifyContent: "center", alignItems: "center" },
    noImageText: { fontSize: 6, color: colors.muted },
    info: { flex: 1 },
    name: { fontSize: 11, fontWeight: "bold", color: colors.ink },
    desc: { fontSize: 8, color: colors.muted, marginTop: 2 },
    category: { fontSize: 7, color: colors.primary, textTransform: "uppercase", marginTop: 1 },
    priceCol: { width: 90, alignItems: "flex-end" },
    price: { fontSize: 13, fontWeight: "bold", color: colors.primary },
    cost: { fontSize: 8, color: colors.muted, marginTop: 2 },
    barcode: { fontSize: 7, color: colors.muted, marginTop: 1, fontFamily: "Courier" },
    footer: { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between" },
    footerText: { fontSize: 7, color: colors.muted },
  });

  return React.createElement(Document, null,
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(View, { style: s.header },
        React.createElement(Text, { style: s.title }, options.title),
        React.createElement(Text, { style: s.subtitle }, `${products.length} products • Generated ${new Date().toLocaleDateString()}`),
      ),
      ...products.map((p) =>
        React.createElement(View, { key: p.product_id, style: s.row, wrap: false },
          options.showImages && p.image && p.image.startsWith("http")
            ? React.createElement(Image, { src: p.image, style: s.image } as any)
            : options.showImages
              ? React.createElement(View, { style: s.noImage }, React.createElement(Text, { style: s.noImageText }, "No img"))
              : null,
          React.createElement(View, { style: s.info },
            React.createElement(Text, { style: s.name }, p.name),
            options.showDescription && p.description
              ? React.createElement(Text, { style: s.desc }, p.description.substring(0, 200))
              : null,
            p.productcategory?.name
              ? React.createElement(Text, { style: s.category }, p.productcategory.name)
              : null,
            options.showBarcode && p.upc
              ? React.createElement(Text, { style: s.barcode }, p.upc)
              : null,
          ),
          React.createElement(View, { style: s.priceCol },
            React.createElement(Text, { style: s.price }, formatPrice(p.sellingprice, options.currency)),
            options.showCost
              ? React.createElement(Text, { style: s.cost }, `Cost: ${formatPrice(p.costprice, options.currency)}`)
              : null,
          ),
        )
      ),
      React.createElement(View, { style: s.footer, fixed: true },
        React.createElement(Text, { style: s.footerText }, options.title),
        React.createElement(Text, { style: s.footerText, render: ({ pageNumber, totalPages }: any) => `${pageNumber} / ${totalPages}` } as any),
      ),
    )
  );
}

// ── Price List Template (compact table, no images) ──

function PriceListTemplate({ products, options }: { products: Product[]; options: CatalogueOptions }) {
  const s = StyleSheet.create({
    page: { padding: 40, fontFamily: "Helvetica", backgroundColor: colors.white },
    header: { marginBottom: 16, borderBottom: `2px solid ${colors.primary}`, paddingBottom: 10 },
    title: { fontSize: 20, fontWeight: "bold", color: colors.primary },
    subtitle: { fontSize: 9, color: colors.muted, marginTop: 4 },
    tableHeader: { flexDirection: "row", backgroundColor: colors.primary, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 3 },
    th: { fontSize: 8, fontWeight: "bold", color: colors.white, textTransform: "uppercase" },
    row: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottom: `1px solid ${colors.line}` },
    rowAlt: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottom: `1px solid ${colors.line}`, backgroundColor: "#fafafa" },
    cell: { fontSize: 9, color: colors.ink },
    cellMuted: { fontSize: 8, color: colors.muted },
    cellBold: { fontSize: 10, fontWeight: "bold", color: colors.ink },
    colName: { flex: 3 },
    colCat: { flex: 2 },
    colBarcode: { flex: 2 },
    colPrice: { flex: 1, textAlign: "right" as any },
    colCost: { flex: 1, textAlign: "right" as any },
    footer: { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between" },
    footerText: { fontSize: 7, color: colors.muted },
  });

  return React.createElement(Document, null,
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(View, { style: s.header },
        React.createElement(Text, { style: s.title }, options.title),
        React.createElement(Text, { style: s.subtitle }, `${products.length} products • Generated ${new Date().toLocaleDateString()}`),
      ),
      React.createElement(View, { style: s.tableHeader },
        React.createElement(Text, { style: { ...s.th, ...s.colName } }, "Product"),
        React.createElement(Text, { style: { ...s.th, ...s.colCat } }, "Category"),
        options.showBarcode ? React.createElement(Text, { style: { ...s.th, ...s.colBarcode } }, "Barcode") : null,
        React.createElement(Text, { style: { ...s.th, ...s.colPrice } }, "Price"),
        options.showCost ? React.createElement(Text, { style: { ...s.th, ...s.colCost } }, "Cost") : null,
      ),
      ...products.map((p, i) =>
        React.createElement(View, { key: p.product_id, style: i % 2 === 0 ? s.row : s.rowAlt, wrap: false },
          React.createElement(Text, { style: { ...s.cellBold, ...s.colName } }, p.name),
          React.createElement(Text, { style: { ...s.cellMuted, ...s.colCat } }, p.productcategory?.name ?? "—"),
          options.showBarcode ? React.createElement(Text, { style: { ...s.cellMuted, ...s.colBarcode } }, p.upc ?? "—") : null,
          React.createElement(Text, { style: { ...s.cellBold, ...s.colPrice } }, formatPrice(p.sellingprice, options.currency)),
          options.showCost ? React.createElement(Text, { style: { ...s.cellMuted, ...s.colCost } }, formatPrice(p.costprice, options.currency)) : null,
        )
      ),
      React.createElement(View, { style: s.footer, fixed: true },
        React.createElement(Text, { style: s.footerText }, options.title),
        React.createElement(Text, { style: s.footerText, render: ({ pageNumber, totalPages }: any) => `${pageNumber} / ${totalPages}` } as any),
      ),
    )
  );
}

// ════════════════════════════════════════════════════════
// API Handler
// ════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const accountId = await getSessionAccountId();
    if (!accountId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const {
      template = "grid",
      category_id,
      search,
      title,
      showCost = false,
      showBarcode = true,
      showDescription = true,
      showImages = true,
    } = body;

    const db = getDb();

    // Get account currency
    const { data: account } = await db
      .from("account")
      .select("businessname, currency")
      .eq("account_id", accountId)
      .single();

    const currency = account?.currency ?? "MUR";
    const catalogueTitle = title || `${account?.businessname ?? "Product"} Catalogue`;

    // Query products and categories separately (PostgREST FK detection unreliable)
    let query = db
      .from("product")
      .select("product_id, name, description, sellingprice, costprice, image, upc, productcategory_id")
      .eq("account_id", accountId)
      .eq("isactive", "Y")
      .order("name");

    if (category_id) {
      query = query.eq("productcategory_id", category_id);
    }
    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data: rawProducts, error: queryError } = await query;

    if (queryError || !rawProducts || rawProducts.length === 0) {
      return NextResponse.json({ error: "No products found matching your criteria" }, { status: 404 });
    }

    // Load categories for mapping
    const { data: cats } = await db
      .from("productcategory")
      .select("productcategory_id, name")
      .eq("account_id", accountId);

    const catMap = new Map((cats ?? []).map((c: any) => [c.productcategory_id, c.name]));

    const products: Product[] = rawProducts.map((p: any) => ({
      ...p,
      productcategory: p.productcategory_id ? { name: catMap.get(p.productcategory_id) ?? "" } : null,
    }));

    const options: CatalogueOptions = {
      template,
      title: catalogueTitle,
      currency,
      showCost,
      showBarcode,
      showDescription,
      showImages: template !== "price-list" && showImages,
    };

    // Select template
    let doc: React.ReactElement;
    switch (template) {
      case "list":
        doc = React.createElement(ListTemplate, { products, options });
        break;
      case "price-list":
        doc = React.createElement(PriceListTemplate, { products, options });
        break;
      case "grid":
      default:
        doc = React.createElement(GridTemplate, { products, options });
        break;
    }

    // Render PDF
    const buffer = await renderToBuffer(doc as any);
    const uint8 = new Uint8Array(buffer);

    return new Response(uint8, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${catalogueTitle.replace(/[^a-zA-Z0-9 ]/g, "")}.pdf"`,
        "Content-Length": uint8.length.toString(),
      },
    });
  } catch (e: any) {
    console.error("Catalogue generation error:", e);
    return NextResponse.json({ error: e.message || "Failed to generate catalogue" }, { status: 500 });
  }
}
