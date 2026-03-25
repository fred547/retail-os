import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";
import React from "react";
import { renderToBuffer, Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ════════════════════════════════════════════════════════
// Page sizes (in points: 1pt = 1/72 inch)
// ════════════════════════════════════════════════════════

const PAGE_SIZES: Record<string, { width: number; height: number; label: string }> = {
  "a4":            { width: 595, height: 842, label: "A4" },
  "a5":            { width: 420, height: 595, label: "A5" },
  "a6":            { width: 298, height: 420, label: "A6 (Postcard)" },
  "dl":            { width: 283, height: 595, label: "DL (Flyer)" },
  "business-card": { width: 252, height: 144, label: "Business Card" },
  "square":        { width: 360, height: 360, label: "Square (5in)" },
};

const colors = {
  primary: "#1976D2",
  ink: "#141414",
  muted: "#6C6F76",
  line: "#E6E2DA",
  white: "#FFFFFF",
};

// ════════════════════════════════════════════════════════
// Types
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
  template: string;
  title: string;
  currency: string;
  brandName: string;
  pageSize: string;
  showCost: boolean;
  showBarcode: boolean;
  showDescription: boolean;
  showImages: boolean;
  showQrCode: boolean;
  showTitle: boolean;
  loyaltyMessage: string;
  qrDataUrls: Map<number, string>;
  loyaltyQrUrl: string | null;
}

function formatPrice(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getPageDimensions(sizeKey: string): [number, number] {
  const sz = PAGE_SIZES[sizeKey] ?? PAGE_SIZES["a4"];
  return [sz.width, sz.height];
}

// ════════════════════════════════════════════════════════
// Templates
// ════════════════════════════════════════════════════════

// ── Grid Template (2-column cards with images) ──

function GridTemplate({ products, options }: { products: Product[]; options: CatalogueOptions }) {
  const [pw, ph] = getPageDimensions(options.pageSize);
  const pad = Math.min(30, pw * 0.07);
  const isSmall = pw < 400;

  const s = StyleSheet.create({
    page: { padding: pad, fontFamily: "Helvetica", backgroundColor: colors.white },
    header: { marginBottom: 12, borderBottom: `2px solid ${colors.primary}`, paddingBottom: 8 },
    title: { fontSize: isSmall ? 14 : 20, fontWeight: "bold", color: colors.primary },
    subtitle: { fontSize: isSmall ? 7 : 9, color: colors.muted, marginTop: 2 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: isSmall ? 6 : 10 },
    card: { width: isSmall ? "100%" : "48%", border: `1px solid ${colors.line}`, borderRadius: 4, padding: isSmall ? 6 : 8, marginBottom: 2 },
    image: { width: "100%", height: isSmall ? 60 : 90, objectFit: "contain", marginBottom: 6, borderRadius: 3, backgroundColor: "#f9f9f9" },
    noImage: { width: "100%", height: isSmall ? 60 : 90, backgroundColor: "#f5f5f5", borderRadius: 3, marginBottom: 6, justifyContent: "center", alignItems: "center" },
    noImageText: { fontSize: 8, color: colors.muted },
    name: { fontSize: isSmall ? 9 : 11, fontWeight: "bold", color: colors.ink, marginBottom: 2 },
    desc: { fontSize: 7, color: colors.muted, marginBottom: 3 },
    price: { fontSize: isSmall ? 10 : 13, fontWeight: "bold", color: colors.primary },
    cost: { fontSize: 7, color: colors.muted, marginTop: 1 },
    barcode: { fontSize: 6, color: colors.muted, marginTop: 1, fontFamily: "Courier" },
    qrImage: { width: isSmall ? 32 : 44, height: isSmall ? 32 : 44, marginTop: 3 },
    category: { fontSize: 6, color: colors.primary, marginBottom: 3, textTransform: "uppercase" },
    footer: { position: "absolute", bottom: 12, left: pad, right: pad, flexDirection: "row", justifyContent: "space-between" },
    footerText: { fontSize: 6, color: colors.muted },
  });

  return React.createElement(Document, null,
    React.createElement(Page, { size: [pw, ph] as any, style: s.page },
      options.showTitle ? React.createElement(View, { style: s.header },
        React.createElement(Text, { style: s.title }, options.title),
        React.createElement(Text, { style: s.subtitle }, `${products.length} products`),
      ) : null,
      React.createElement(View, { style: s.grid },
        ...products.map((p) =>
          React.createElement(View, { key: p.product_id, style: s.card, wrap: false },
            options.showImages && p.image && p.image.startsWith("http")
              ? React.createElement(Image, { src: p.image, style: s.image } as any)
              : options.showImages
                ? React.createElement(View, { style: s.noImage }, React.createElement(Text, { style: s.noImageText }, "No image"))
                : null,
            p.productcategory?.name ? React.createElement(Text, { style: s.category }, p.productcategory.name) : null,
            React.createElement(Text, { style: s.name }, p.name),
            options.showDescription && p.description
              ? React.createElement(Text, { style: s.desc }, p.description.substring(0, isSmall ? 60 : 120))
              : null,
            React.createElement(Text, { style: s.price }, formatPrice(p.sellingprice, options.currency)),
            options.showCost ? React.createElement(Text, { style: s.cost }, `Cost: ${formatPrice(p.costprice, options.currency)}`) : null,
            options.showBarcode && p.upc ? React.createElement(Text, { style: s.barcode }, p.upc) : null,
            options.showQrCode && options.qrDataUrls.get(p.product_id)
              ? React.createElement(Image, { src: options.qrDataUrls.get(p.product_id)!, style: s.qrImage } as any)
              : null,
          )
        )
      ),
      React.createElement(View, { style: s.footer, fixed: true },
        React.createElement(Text, { style: s.footerText }, options.brandName),
        React.createElement(Text, { style: s.footerText, render: ({ pageNumber, totalPages }: any) => `${pageNumber} / ${totalPages}` } as any),
      ),
    )
  );
}

// ── List Template (full-width rows) ──

function ListTemplate({ products, options }: { products: Product[]; options: CatalogueOptions }) {
  const [pw, ph] = getPageDimensions(options.pageSize);
  const pad = Math.min(30, pw * 0.07);
  const isSmall = pw < 400;

  const s = StyleSheet.create({
    page: { padding: pad, fontFamily: "Helvetica", backgroundColor: colors.white },
    header: { marginBottom: 12, borderBottom: `2px solid ${colors.primary}`, paddingBottom: 8 },
    title: { fontSize: isSmall ? 14 : 20, fontWeight: "bold", color: colors.primary },
    subtitle: { fontSize: isSmall ? 7 : 9, color: colors.muted, marginTop: 2 },
    row: { flexDirection: "row", borderBottom: `1px solid ${colors.line}`, paddingVertical: isSmall ? 5 : 7, alignItems: "center", gap: 8 },
    image: { width: isSmall ? 36 : 48, height: isSmall ? 36 : 48, objectFit: "contain", borderRadius: 3, backgroundColor: "#f9f9f9" },
    noImage: { width: isSmall ? 36 : 48, height: isSmall ? 36 : 48, backgroundColor: "#f5f5f5", borderRadius: 3, justifyContent: "center", alignItems: "center" },
    noImageText: { fontSize: 5, color: colors.muted },
    info: { flex: 1 },
    name: { fontSize: isSmall ? 9 : 10, fontWeight: "bold", color: colors.ink },
    desc: { fontSize: 7, color: colors.muted, marginTop: 1 },
    category: { fontSize: 6, color: colors.primary, textTransform: "uppercase", marginTop: 1 },
    priceCol: { width: isSmall ? 60 : 80, alignItems: "flex-end" },
    price: { fontSize: isSmall ? 9 : 11, fontWeight: "bold", color: colors.primary },
    cost: { fontSize: 7, color: colors.muted, marginTop: 1 },
    barcode: { fontSize: 6, color: colors.muted, marginTop: 1, fontFamily: "Courier" },
    qrImage: { width: 32, height: 32 },
    footer: { position: "absolute", bottom: 12, left: pad, right: pad, flexDirection: "row", justifyContent: "space-between" },
    footerText: { fontSize: 6, color: colors.muted },
  });

  return React.createElement(Document, null,
    React.createElement(Page, { size: [pw, ph] as any, style: s.page },
      options.showTitle ? React.createElement(View, { style: s.header },
        React.createElement(Text, { style: s.title }, options.title),
        React.createElement(Text, { style: s.subtitle }, `${products.length} products`),
      ) : null,
      ...products.map((p) =>
        React.createElement(View, { key: p.product_id, style: s.row, wrap: false },
          options.showImages && p.image && p.image.startsWith("http")
            ? React.createElement(Image, { src: p.image, style: s.image } as any)
            : options.showImages
              ? React.createElement(View, { style: s.noImage }, React.createElement(Text, { style: s.noImageText }, "No img"))
              : null,
          React.createElement(View, { style: s.info },
            React.createElement(Text, { style: s.name }, p.name),
            options.showDescription && p.description ? React.createElement(Text, { style: s.desc }, p.description.substring(0, isSmall ? 80 : 200)) : null,
            p.productcategory?.name ? React.createElement(Text, { style: s.category }, p.productcategory.name) : null,
            options.showBarcode && p.upc ? React.createElement(Text, { style: s.barcode }, p.upc) : null,
          ),
          React.createElement(View, { style: s.priceCol },
            React.createElement(Text, { style: s.price }, formatPrice(p.sellingprice, options.currency)),
            options.showCost ? React.createElement(Text, { style: s.cost }, `Cost: ${formatPrice(p.costprice, options.currency)}`) : null,
            options.showQrCode && options.qrDataUrls.get(p.product_id)
              ? React.createElement(Image, { src: options.qrDataUrls.get(p.product_id)!, style: s.qrImage } as any) : null,
          ),
        )
      ),
      React.createElement(View, { style: s.footer, fixed: true },
        React.createElement(Text, { style: s.footerText }, options.brandName),
        React.createElement(Text, { style: s.footerText, render: ({ pageNumber, totalPages }: any) => `${pageNumber} / ${totalPages}` } as any),
      ),
    )
  );
}

// ── Price List Template (compact table) ──

function PriceListTemplate({ products, options }: { products: Product[]; options: CatalogueOptions }) {
  const [pw, ph] = getPageDimensions(options.pageSize);
  const pad = Math.min(30, pw * 0.07);

  const s = StyleSheet.create({
    page: { padding: pad, fontFamily: "Helvetica", backgroundColor: colors.white },
    header: { marginBottom: 10, borderBottom: `2px solid ${colors.primary}`, paddingBottom: 8 },
    title: { fontSize: 18, fontWeight: "bold", color: colors.primary },
    subtitle: { fontSize: 8, color: colors.muted, marginTop: 2 },
    tableHeader: { flexDirection: "row", backgroundColor: colors.primary, paddingVertical: 5, paddingHorizontal: 6, borderRadius: 2 },
    th: { fontSize: 7, fontWeight: "bold", color: colors.white, textTransform: "uppercase" },
    row: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 6, borderBottom: `1px solid ${colors.line}` },
    rowAlt: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 6, borderBottom: `1px solid ${colors.line}`, backgroundColor: "#fafafa" },
    cell: { fontSize: 8, color: colors.ink },
    cellMuted: { fontSize: 7, color: colors.muted },
    cellBold: { fontSize: 9, fontWeight: "bold", color: colors.ink },
    colName: { flex: 3 },
    colCat: { flex: 2 },
    colBarcode: { flex: 2 },
    colPrice: { flex: 1, textAlign: "right" as any },
    colCost: { flex: 1, textAlign: "right" as any },
    colQr: { width: 32, alignItems: "center" as any, justifyContent: "center" as any },
    qrImage: { width: 24, height: 24 },
    footer: { position: "absolute", bottom: 12, left: pad, right: pad, flexDirection: "row", justifyContent: "space-between" },
    footerText: { fontSize: 6, color: colors.muted },
  });

  return React.createElement(Document, null,
    React.createElement(Page, { size: [pw, ph] as any, style: s.page },
      options.showTitle ? React.createElement(View, { style: s.header },
        React.createElement(Text, { style: s.title }, options.title),
        React.createElement(Text, { style: s.subtitle }, `${products.length} products`),
      ) : null,
      React.createElement(View, { style: s.tableHeader },
        React.createElement(Text, { style: { ...s.th, ...s.colName } }, "Product"),
        React.createElement(Text, { style: { ...s.th, ...s.colCat } }, "Category"),
        options.showBarcode ? React.createElement(Text, { style: { ...s.th, ...s.colBarcode } }, "Barcode") : null,
        React.createElement(Text, { style: { ...s.th, ...s.colPrice } }, "Price"),
        options.showCost ? React.createElement(Text, { style: { ...s.th, ...s.colCost } }, "Cost") : null,
        options.showQrCode ? React.createElement(Text, { style: { ...s.th, ...s.colQr } }, "QR") : null,
      ),
      ...products.map((p, i) =>
        React.createElement(View, { key: p.product_id, style: i % 2 === 0 ? s.row : s.rowAlt, wrap: false },
          React.createElement(Text, { style: { ...s.cellBold, ...s.colName } }, p.name),
          React.createElement(Text, { style: { ...s.cellMuted, ...s.colCat } }, p.productcategory?.name ?? "—"),
          options.showBarcode ? React.createElement(Text, { style: { ...s.cellMuted, ...s.colBarcode } }, p.upc ?? "—") : null,
          React.createElement(Text, { style: { ...s.cellBold, ...s.colPrice } }, formatPrice(p.sellingprice, options.currency)),
          options.showCost ? React.createElement(Text, { style: { ...s.cellMuted, ...s.colCost } }, formatPrice(p.costprice, options.currency)) : null,
          options.showQrCode && options.qrDataUrls.get(p.product_id)
            ? React.createElement(View, { style: s.colQr }, React.createElement(Image, { src: options.qrDataUrls.get(p.product_id)!, style: s.qrImage } as any))
            : options.showQrCode ? React.createElement(View, { style: s.colQr }) : null,
        )
      ),
      React.createElement(View, { style: s.footer, fixed: true },
        React.createElement(Text, { style: s.footerText }, options.brandName),
        React.createElement(Text, { style: s.footerText, render: ({ pageNumber, totalPages }: any) => `${pageNumber} / ${totalPages}` } as any),
      ),
    )
  );
}

// ── Loyalty Card Template (multiple cards per A4 sheet) ──

function LoyaltyCardTemplate({ products, options }: { products: Product[]; options: CatalogueOptions }) {
  // Business card: 3.5 x 2 inches = 252 x 144pt
  // Fit 10 per A4 sheet (2 columns x 5 rows)
  const cardW = 252;
  const cardH = 144;
  const cardsPerRow = 2;
  const cardsPerCol = 5;
  const cardsPerPage = cardsPerRow * cardsPerCol;

  // Use first few products as featured, or cycle through
  const featured = products.slice(0, Math.min(3, products.length));

  // Build pages of cards
  const totalCards = Math.max(cardsPerPage, products.length); // at least 1 full sheet
  const pages: number[] = [];
  for (let i = 0; i < totalCards; i += cardsPerPage) pages.push(i);

  const s = StyleSheet.create({
    page: { padding: 20, fontFamily: "Helvetica", backgroundColor: colors.white },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 0 },
    card: {
      width: cardW, height: cardH,
      border: `0.5px dashed ${colors.line}`,
      padding: 10,
      justifyContent: "space-between",
    },
    topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    brandName: { fontSize: 11, fontWeight: "bold", color: colors.primary },
    tagline: { fontSize: 7, color: colors.muted, marginTop: 1 },
    loyaltyMsg: { fontSize: 8, color: colors.ink, marginTop: 4, textAlign: "center" },
    bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
    featuredItems: { flex: 1 },
    featuredItem: { fontSize: 6, color: colors.muted },
    qrImage: { width: 48, height: 48 },
    cutLine: { fontSize: 5, color: colors.line, textAlign: "center", marginTop: 2 },
  });

  return React.createElement(Document, null,
    ...pages.map((pageStart, pi) =>
      React.createElement(Page, { key: pi, size: "A4", style: s.page },
        React.createElement(View, { style: s.grid },
          ...Array.from({ length: cardsPerPage }, (_, ci) =>
            React.createElement(View, { key: ci, style: s.card },
              React.createElement(View, { style: s.topRow },
                React.createElement(View, null,
                  React.createElement(Text, { style: s.brandName }, options.brandName),
                  React.createElement(Text, { style: s.tagline }, "Loyalty Program"),
                ),
                options.loyaltyQrUrl
                  ? React.createElement(Image, { src: options.loyaltyQrUrl, style: { width: 36, height: 36 } } as any)
                  : null,
              ),
              React.createElement(Text, { style: s.loyaltyMsg },
                options.loyaltyMessage || "Scan to earn points on every purchase!"
              ),
              React.createElement(View, { style: s.bottomRow },
                React.createElement(View, { style: s.featuredItems },
                  ...featured.map((p) =>
                    React.createElement(Text, { key: p.product_id, style: s.featuredItem },
                      `${p.name} — ${formatPrice(p.sellingprice, options.currency)}`
                    )
                  )
                ),
              ),
            )
          )
        ),
      )
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
      pageSize = "a4",
      category_id,
      search,
      title,
      showTitle = false,
      showCost = false,
      showBarcode = true,
      showDescription = true,
      showImages = true,
      showQrCode = false,
      loyaltyMessage = "",
    } = body;

    const db = getDb();

    // Get account info
    const { data: account } = await db
      .from("account")
      .select("businessname, currency")
      .eq("account_id", accountId)
      .single();

    const currency = account?.currency ?? "MUR";
    const brandName = account?.businessname ?? "My Store";
    const catalogueTitle = title || `${brandName} Catalogue`;

    // Query products
    let query = db
      .from("product")
      .select("product_id, name, description, sellingprice, costprice, image, upc, productcategory_id")
      .eq("account_id", accountId)
      .eq("isactive", "Y")
      .order("name");

    if (category_id) query = query.eq("productcategory_id", category_id);
    if (search) query = query.ilike("name", `%${search}%`);

    const { data: rawProducts, error: queryError } = await query;

    if (queryError || !rawProducts || rawProducts.length === 0) {
      return NextResponse.json({ error: "No products found matching your criteria" }, { status: 404 });
    }

    // Load categories
    const { data: cats } = await db
      .from("productcategory")
      .select("productcategory_id, name")
      .eq("account_id", accountId);

    const catMap = new Map((cats ?? []).map((c: any) => [c.productcategory_id, c.name]));
    const products: Product[] = rawProducts.map((p: any) => ({
      ...p,
      productcategory: p.productcategory_id ? { name: catMap.get(p.productcategory_id) ?? "" } : null,
    }));

    // Generate QR codes
    const qrDataUrls = new Map<number, string>();
    if (showQrCode) {
      await Promise.all(
        products.map(async (p) => {
          try {
            const dataUrl = await QRCode.toDataURL(p.upc || p.name, { width: 100, margin: 1, color: { dark: "#000000", light: "#FFFFFF" } });
            qrDataUrls.set(p.product_id, dataUrl);
          } catch (_) {}
        })
      );
    }

    // Loyalty QR (links to the brand's loyalty signup or WhatsApp)
    let loyaltyQrUrl: string | null = null;
    if (template === "loyalty-card") {
      try {
        loyaltyQrUrl = await QRCode.toDataURL(`https://web.posterita.com/customer/login`, { width: 120, margin: 1 });
      } catch (_) {}
    }

    const options: CatalogueOptions = {
      template,
      title: catalogueTitle,
      currency,
      brandName,
      pageSize,
      showCost,
      showBarcode,
      showDescription,
      showImages: template === "price-list" ? false : showImages,
      showQrCode,
      showTitle,
      loyaltyMessage,
      qrDataUrls,
      loyaltyQrUrl,
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
      case "loyalty-card":
        doc = React.createElement(LoyaltyCardTemplate, { products, options });
        break;
      case "grid":
      default:
        doc = React.createElement(GridTemplate, { products, options });
        break;
    }

    const buffer = await renderToBuffer(doc as any);
    const uint8 = new Uint8Array(buffer);
    const filename = `${brandName.replace(/[^a-zA-Z0-9 ]/g, "")} - ${template}.pdf`;

    return new Response(uint8, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": uint8.length.toString(),
      },
    });
  } catch (e: any) {
    console.error("Catalogue generation error:", e);
    return NextResponse.json({ error: e.message || "Failed to generate catalogue" }, { status: 500 });
  }
}
