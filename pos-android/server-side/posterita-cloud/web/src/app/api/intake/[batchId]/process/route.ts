import { NextRequest } from "next/server";
import { getDb } from "@/lib/supabase/admin";

export const maxDuration = 300;

const MODEL = "claude-sonnet-4-6";

// ════════════════════════════════════════════════════════
// SSE helpers
// ════════════════════════════════════════════════════════

type SSEWriter = {
  sendProgress: (message: string) => void;
  sendResult: (data: any) => void;
  sendError: (message: string) => void;
  close: () => void;
};

function createSSEStream(): { stream: ReadableStream; writer: SSEWriter } {
  let controller: ReadableStreamDefaultController;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(c) { controller = c; },
  });

  const send = (event: string, data: any) => {
    try {
      controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    } catch { /* stream closed */ }
  };

  return {
    stream,
    writer: {
      sendProgress: (message: string) => send("progress", { message }),
      sendResult: (data: any) => send("result", data),
      sendError: (message: string) => send("error", { message }),
      close: () => { try { controller.close(); } catch {} },
    },
  };
}

// ════════════════════════════════════════════════════════
// Claude helpers
// ════════════════════════════════════════════════════════

function extractTextFromBlocks(blocks: any[]): string {
  return blocks.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
}

function parseJsonObject<T>(text: string): T | null {
  // Strip markdown code blocks if present
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to find JSON object in the text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]) as T; } catch { return null; }
    }
    // Try JSON array
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try { return JSON.parse(arrMatch[0]) as T; } catch { return null; }
    }
    return null;
  }
}

async function callClaude(messages: any[], maxTokens: number = 16000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 280000);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CLAUDE_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      signal: controller.signal,
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages }),
    });
    clearTimeout(timeout);
    const data = await response.json();
    if (!response.ok) throw new Error(`Claude API error: ${data.error?.message || response.statusText}`);
    return extractTextFromBlocks(data.content || []);
  } catch (e: any) {
    clearTimeout(timeout);
    if (e.name === "AbortError") throw new Error("AI analysis timed out.");
    throw e;
  }
}

async function callClaudeWithWebSearch(prompt: string, maxSearches: number = 10): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 280000);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CLAUDE_API_KEY!,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16000,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: maxSearches }],
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await response.json();
    if (!response.ok) throw new Error(`Claude API error: ${data.error?.message || response.statusText}`);
    return extractTextFromBlocks(data.content || []);
  } catch (e: any) {
    clearTimeout(timeout);
    if (e.name === "AbortError") throw new Error("AI analysis timed out.");
    throw e;
  }
}

async function callClaudeVision(imageUrl: string, prompt: string): Promise<string> {
  return callClaude([{
    role: "user",
    content: [
      { type: "image", source: { type: "url", url: imageUrl } },
      { type: "text", text: prompt },
    ],
  }]);
}

async function uploadToCloudinary(imageUrl: string, accountId: string, itemId: number): Promise<string> {
  try {
    const formData = new FormData();
    formData.append("file", imageUrl);
    formData.append("upload_preset", "posterita_unsigned");
    formData.append("folder", `posterita/${accountId}/intake`);
    formData.append("public_id", `intake_${itemId}`);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dp2u3pwiy")}/image/upload`, { method: "POST", body: formData });
    const result = await response.json();
    return result.secure_url ?? imageUrl;
  } catch { return imageUrl; }
}

// ════════════════════════════════════════════════════════
// Extracted item type
// ════════════════════════════════════════════════════════

interface ExtractedItem {
  name: string;
  description?: string;
  selling_price?: number;
  cost_price?: number;
  image_url?: string;
  barcode?: string;
  category_name?: string;
  unit?: string;
  supplier_sku?: string;
  quantity?: number;
}

// ════════════════════════════════════════════════════════
// Source-specific extractors
// ════════════════════════════════════════════════════════

async function extractFromWebsite(url: string, writer: SSEWriter): Promise<ExtractedItem[]> {
  writer.sendProgress(`Fetching ${url}...`);

  let html = "";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PosteritaBot/1.0)" },
      signal: AbortSignal.timeout(30000),
    });
    html = await res.text();
    // Truncate to avoid token limits
    html = html.substring(0, 100000);
  } catch (e: any) {
    writer.sendProgress(`Could not fetch URL, using AI web search instead...`);
    return extractViaWebSearch(url, writer);
  }

  writer.sendProgress("Analyzing page content with AI...");

  const text = await callClaude([{
    role: "user",
    content: `You are a product extraction expert. Extract ALL products/items from this webpage HTML.

URL: ${url}

HTML content:
\`\`\`
${html}
\`\`\`

Return a JSON array of products. Each product:
{
  "name": "Product Name",
  "description": "Brief description",
  "selling_price": 9.99,
  "image_url": "https://full-url-to-image.jpg",
  "barcode": "UPC if found, or null",
  "category_name": "Category name",
  "unit": "piece"
}

RULES:
- Extract EVERY product you find — be thorough
- Use REAL prices from the page
- image_url must be absolute (start with https://)
- Return ONLY valid JSON array, no other text`,
  }]);

  const items = parseJsonObject<ExtractedItem[]>(text);
  return items ?? [];
}

async function extractViaWebSearch(ref: string, writer: SSEWriter): Promise<ExtractedItem[]> {
  writer.sendProgress("Searching the web for product data...");

  const text = await callClaudeWithWebSearch(
    `Search the internet for products sold by or at: ${ref}

Find their product catalog, menu, or price list. Extract ALL products with prices.

Return a JSON array of products:
[
  {
    "name": "Product Name",
    "description": "Brief description",
    "selling_price": 9.99,
    "image_url": "https://image-url.jpg or empty string",
    "category_name": "Category",
    "unit": "piece"
  }
]

Be thorough — find every product. Use real prices. Return ONLY valid JSON array.`,
    10
  );

  const items = parseJsonObject<ExtractedItem[]>(text);
  return items ?? [];
}

async function extractFromDocument(fileUrl: string, docType: string, writer: SSEWriter): Promise<ExtractedItem[]> {
  writer.sendProgress(`Analyzing ${docType} with AI vision...`);

  const prompt = docType === "purchase_order"
    ? `You are analyzing a purchase order document. Extract ALL line items.

For each item return:
{
  "name": "Product Name",
  "description": "Description if available",
  "cost_price": 9.99,
  "quantity": 10,
  "supplier_sku": "SKU if shown",
  "category_name": "Category if obvious",
  "unit": "piece or kg etc"
}

Return ONLY a valid JSON array.`
    : docType === "invoice"
    ? `You are analyzing an invoice document. Extract ALL line items and supplier info.

For each item return:
{
  "name": "Product Name",
  "description": "Description if available",
  "cost_price": 9.99,
  "quantity": 10,
  "supplier_sku": "SKU or item code",
  "barcode": "barcode if shown",
  "category_name": "Category if obvious",
  "unit": "piece or kg etc"
}

Return ONLY a valid JSON array.`
    : `You are analyzing a product catalogue document. Extract ALL products.

For each product return:
{
  "name": "Product Name",
  "description": "Description",
  "selling_price": 9.99,
  "cost_price": 5.99,
  "image_url": "",
  "barcode": "UPC/EAN if shown",
  "supplier_sku": "SKU if shown",
  "category_name": "Category",
  "unit": "piece"
}

Return ONLY a valid JSON array.`;

  const text = await callClaudeVision(fileUrl, prompt);
  const items = parseJsonObject<ExtractedItem[]>(text);
  return items ?? [];
}

// ════════════════════════════════════════════════════════
// AI matching against existing catalog
// ════════════════════════════════════════════════════════

interface MatchResult {
  item_index: number;
  match_product_id: number | null;
  match_confidence: number;
  match_type: "exact" | "fuzzy" | "new";
}

async function matchAgainstCatalog(
  items: ExtractedItem[],
  accountId: string,
  writer: SSEWriter
): Promise<MatchResult[]> {
  // Fetch existing products
  const { data: existing } = await getDb()
    .from("product")
    .select("product_id, name, upc, sellingprice, costprice, productcategory_id")
    .eq("account_id", accountId)
    .eq("isactive", "Y");

  if (!existing || existing.length === 0) {
    // No existing products — everything is new
    return items.map((_, i) => ({ item_index: i, match_product_id: null, match_confidence: 0, match_type: "new" as const }));
  }

  writer.sendProgress(`Matching ${items.length} items against ${existing.length} existing products...`);

  // First pass: exact barcode matches
  const results: MatchResult[] = items.map((item, i) => {
    if (item.barcode) {
      const match = existing.find((p: any) => p.upc && p.upc === item.barcode);
      if (match) {
        return { item_index: i, match_product_id: match.product_id, match_confidence: 1.0, match_type: "exact" as const };
      }
    }
    return { item_index: i, match_product_id: null, match_confidence: 0, match_type: "new" as const };
  });

  // Second pass: AI fuzzy matching for non-exact-matched items
  const unmatchedIndices = results.filter(r => r.match_type === "new").map(r => r.item_index);

  if (unmatchedIndices.length > 0 && existing.length > 0) {
    const unmatchedItems = unmatchedIndices.map(i => ({ index: i, name: items[i].name, price: items[i].selling_price ?? items[i].cost_price }));
    const catalogSummary = existing.map((p: any) => ({ id: p.product_id, name: p.name, price: p.sellingprice }));

    const text = await callClaude([{
      role: "user",
      content: `You are matching imported product items against an existing product catalog.

IMPORTED ITEMS (to match):
${JSON.stringify(unmatchedItems, null, 1)}

EXISTING CATALOG:
${JSON.stringify(catalogSummary, null, 1)}

For each imported item, determine if it matches an existing catalog product.
A match means it's the SAME product (perhaps different name spelling, abbreviation, or slight price difference).

Return a JSON array:
[
  { "index": 0, "match_id": 123, "confidence": 0.85, "type": "fuzzy" },
  { "index": 1, "match_id": null, "confidence": 0, "type": "new" }
]

confidence: 0.0 (no match) to 1.0 (certain match)
type: "fuzzy" if matched, "new" if no match
match_id: the product_id from the catalog, or null

Only match if confidence >= 0.6. When in doubt, mark as "new".
Return ONLY valid JSON array.`,
    }]);

    const matches = parseJsonObject<any[]>(text);
    if (matches) {
      for (const m of matches) {
        if (m.match_id && m.confidence >= 0.6) {
          const resultIdx = results.findIndex(r => r.item_index === m.index);
          if (resultIdx >= 0) {
            results[resultIdx] = {
              item_index: m.index,
              match_product_id: m.match_id,
              match_confidence: m.confidence,
              match_type: "fuzzy",
            };
          }
        }
      }
    }
  }

  return results;
}

// ════════════════════════════════════════════════════════
// Main processing endpoint
// ════════════════════════════════════════════════════════

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;
  const { stream, writer } = createSSEStream();

  (async () => {
    try {
      // Load the batch
      const { data: batch, error: batchErr } = await getDb()
        .from("intake_batch")
        .select("*")
        .eq("batch_id", batchId)
        .single();

      if (batchErr || !batch) {
        writer.sendError("Batch not found");
        writer.close();
        return;
      }

      writer.sendProgress(`Processing ${batch.source} intake...`);

      // Extract items based on source type
      let extractedItems: ExtractedItem[] = [];

      switch (batch.source) {
        case "website":
          extractedItems = await extractFromWebsite(batch.source_ref, writer);
          break;

        case "ai_search":
          extractedItems = await extractViaWebSearch(batch.source_ref, writer);
          break;

        case "catalogue":
        case "purchase_order":
        case "invoice":
          if (batch.source_file_url) {
            extractedItems = await extractFromDocument(batch.source_file_url, batch.source, writer);
          } else if (batch.source_ref) {
            // Maybe a URL to a catalogue page
            extractedItems = await extractFromWebsite(batch.source_ref, writer);
          } else {
            writer.sendError("No file or URL provided for this source type");
            writer.close();
            return;
          }
          break;

        case "supplier_feed":
          writer.sendError("Supplier feed processing is not yet implemented");
          writer.close();
          return;
      }

      if (extractedItems.length === 0) {
        await getDb().from("intake_batch").update({ status: "failed", item_count: 0 }).eq("batch_id", batchId);
        writer.sendError("No products could be extracted from the source");
        writer.close();
        return;
      }

      writer.sendProgress(`Extracted ${extractedItems.length} items. Running AI matching...`);

      // Match against existing catalog
      const matchResults = await matchAgainstCatalog(extractedItems, batch.account_id, writer);

      // Upload images to Cloudinary + insert intake_items
      writer.sendProgress("Uploading images and saving items...");

      const insertedItems: any[] = [];
      for (let i = 0; i < extractedItems.length; i++) {
        const item = extractedItems[i];
        const match = matchResults[i];

        // Upload image to Cloudinary if present
        let cdnUrl: string | null = null;
        if (item.image_url && item.image_url.startsWith("http")) {
          try {
            cdnUrl = await uploadToCloudinary(item.image_url, batch.account_id, i);
            if (cdnUrl === item.image_url) cdnUrl = null; // upload failed, keep original
          } catch { /* skip */ }
        }

        const { data: inserted } = await getDb()
          .from("intake_item")
          .insert({
            batch_id: parseInt(batchId),
            account_id: batch.account_id,
            name: item.name,
            description: item.description ?? null,
            selling_price: item.selling_price ?? null,
            cost_price: item.cost_price ?? null,
            image_url: item.image_url ?? null,
            image_cdn_url: cdnUrl,
            barcode: item.barcode ?? null,
            category_name: item.category_name ?? null,
            unit: item.unit ?? null,
            supplier_sku: item.supplier_sku ?? null,
            quantity: item.quantity ?? null,
            match_product_id: match.match_product_id,
            match_confidence: match.match_confidence,
            match_type: match.match_type,
            status: "pending",
          })
          .select()
          .single();

        if (inserted) insertedItems.push(inserted);

        if (i % 5 === 0 && i > 0) {
          writer.sendProgress(`Saved ${i + 1} of ${extractedItems.length} items...`);
        }
      }

      // Update batch status
      const newCount = matchResults.filter(m => m.match_type === "new").length;
      const matchedCount = matchResults.filter(m => m.match_type !== "new").length;

      await getDb().from("intake_batch").update({
        status: "ready",
        item_count: insertedItems.length,
      }).eq("batch_id", batchId);

      writer.sendProgress("Processing complete!");
      writer.sendResult({
        batch_id: batchId,
        item_count: insertedItems.length,
        new_items: newCount,
        matched_items: matchedCount,
      });
    } catch (e: any) {
      console.error("Intake processing error:", e);
      await getDb().from("intake_batch").update({ status: "failed" }).eq("batch_id", batchId);
      writer.sendError(e.message || "Processing failed");
    } finally {
      writer.close();
    }
  })();

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
