import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Pro plan: allow up to 5 minutes for AI processing with web search
export const maxDuration = 300;

/**
 * Server-side AI Store Setup & Product Import (v2 — Streaming)
 *
 * Returns Server-Sent Events (SSE) for real-time progress feedback.
 * Each event is a JSON object with { type, message, data? }.
 *
 * Modes:
 *  1. "discover"  — Find business websites from name + location
 *  2. "website"   — Scan URL(s) for products
 *  3. "search"    — Web search to find products (no URL needed)
 *  4. "images"    — Analyze uploaded product images
 */

const MODEL = "claude-sonnet-4-6";

function getSupabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}
function getClaudeApiKey() { return process.env.CLAUDE_API_KEY!; }
function getCloudinaryCloudName() { return process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dp2u3pwiy"; }

// ════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════

interface BusinessCandidate {
  url: string;
  name: string;
  description: string;
  confidence: "high" | "medium" | "low";
}

interface StoreSetupResult {
  store_name: string;
  store_description: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  opening_hours: string;
  currency: string;
  business_type: "retail" | "restaurant";
  tax_rate: number;
  tax_name: string;
  categories: CategoryData[];
  stores: StoreLocationData[];
}

interface CategoryData {
  name: string;
  products: ProductData[];
}

interface ProductData {
  name: string;
  price: number;
  description: string;
  image_url: string;
}

interface StoreLocationData {
  store_name: string;
  address: string;
  city: string;
  country: string;
  currency: string;
  phone: string;
  opening_hours: string;
}

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
    start(c) {
      controller = c;
    },
  });

  const send = (event: string, data: any) => {
    try {
      controller.enqueue(
        encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      );
    } catch {
      // Stream may be closed
    }
  };

  return {
    stream,
    writer: {
      sendProgress: (message: string) => send("progress", { message }),
      sendResult: (data: any) => send("result", data),
      sendError: (message: string) => send("error", { message }),
      close: () => {
        try {
          controller.close();
        } catch {}
      },
    },
  };
}

// ════════════════════════════════════════════════════════
// Auth: resolve account_id server-side
// ════════════════════════════════════════════════════════

async function getAuthenticatedAccountId(): Promise<string | null> {
  const cookieStore = await cookies();

  // Create a user-context Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Check if super admin with active impersonation
  const { data: superAdmin } = await getSupabaseAdmin()
    .from("super_admin")
    .select("id")
    .eq("auth_uid", user.id)
    .eq("is_active", true)
    .single();

  if (superAdmin) {
    const { data: session } = await getSupabaseAdmin()
      .from("super_admin_session")
      .select("account_id")
      .eq("super_admin_id", superAdmin.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    if (session?.account_id) {
      return session.account_id;
    }
    return null; // Super admin without impersonation
  }

  // Owner-centric lookup: prefer the explicitly selected owner account.
  const { data: owner } = await getSupabaseAdmin()
    .from("owner")
    .select("id")
    .eq("auth_uid", user.id)
    .eq("is_active", true)
    .single();

  if (owner?.id) {
    const { data: ownerSession } = await getSupabaseAdmin()
      .from("owner_account_session")
      .select("account_id")
      .eq("owner_id", owner.id)
      .single();

    if (ownerSession?.account_id) {
      return ownerSession.account_id;
    }
  }

  // Fallback for legacy users that still map 1:1 through pos_user.
  const { data: posUser } = await getSupabaseAdmin()
    .from("pos_user")
    .select("account_id")
    .eq("auth_uid", user.id)
    .single();

  return posUser?.account_id ?? null;
}

async function setAccountStatus(
  accountId: string,
  status: "draft" | "in_progress" | "ready" | "failed"
) {
  await getSupabaseAdmin()
    .from("account")
    .update({ status })
    .eq("account_id", accountId);
}

// ════════════════════════════════════════════════════════
// Main handler
// ════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  const body = await req.json();
  const mode = body.mode;

  // Non-streaming mode for discover (lightweight, returns JSON directly)
  if (mode === "discover") {
    return handleDiscover(body);
  }

  // Non-streaming mode for Android standalone setup.
  // Returns extracted setup data without requiring a web account/session.
  if (mode === "device_setup") {
    return handleDeviceSetup(body);
  }

  // Streaming modes: search, website, images
  const { stream, writer } = createSSEStream();

  // Run the processing in the background, writing to the stream
  (async () => {
    try {
      // Resolve account_id server-side
      writer.sendProgress("Authenticating...");
      const accountId = await getAuthenticatedAccountId();

      if (!accountId) {
        writer.sendError(
          "Could not determine your account. Please select an account first."
        );
        writer.close();
        return;
      }

      await setAccountStatus(accountId, "in_progress");

      switch (mode) {
        case "search":
          await handleSearch(body, accountId, writer);
          break;
        case "website":
          await handleWebsite(body, accountId, writer);
          break;
        case "images":
          await handleImages(body, accountId, writer);
          break;
        default:
          writer.sendError(`Unknown mode: ${mode}`);
      }
    } catch (error: any) {
      console.error("AI Import error:", error);
      const accountId = await getAuthenticatedAccountId();
      if (accountId) {
        await setAccountStatus(accountId, "failed");
      }
      writer.sendError(
        error.message || "An unexpected error occurred. Please try again."
      );
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

// ════════════════════════════════════════════════════════
// Mode 1: Discover business websites (non-streaming, fast)
// ════════════════════════════════════════════════════════

async function handleDiscover(body: any) {
  const { business_name, location, business_type } = body;

  if (!business_name) {
    return Response.json(
      { error: "business_name is required" },
      { status: 400 }
    );
  }

  try {
    const typeHint = business_type ? `\nWhat they sell: ${business_type}` : "";

    const prompt = `Search the internet to find the official website, social media pages, and any online presence for this business:

- Business name: ${business_name}
- Location: ${location || "unknown"}${typeHint}

Search for their:
1. Official website
2. Facebook page
3. Instagram page
4. Google Maps / Google Business listing
5. Review pages (TripAdvisor, Yelp, Zomato, etc.)
6. Delivery platform listings (Uber Eats, DoorDash, Deliveroo, etc.)
7. Any other relevant online presence

After searching, return a JSON array of ALL relevant URLs you found, ranked by usefulness for extracting their product catalog or menu. For each URL, provide:
- "url": the actual full URL
- "name": a clean name for this source
- "description": what useful information this page contains
- "confidence": "high" if it's clearly this business, "medium" if likely, "low" if uncertain

Return ONLY a JSON array, no other text. Example:
[{"url": "https://example.com", "name": "Example Business", "description": "Official website with product listings", "confidence": "high"}]

If you cannot find any relevant websites, return an empty array: []`;

    const text = await callClaudeWithWebSearch(prompt, 5);
    const candidates = parseJsonArray<BusinessCandidate>(text);

    return Response.json({ success: true, candidates });
  } catch (error: any) {
    console.error("Discover error:", error);
    return Response.json(
      { error: error.message || "Failed to discover business websites" },
      { status: 500 }
    );
  }
}

async function handleDeviceSetup(body: any) {
  const setupData = await extractSetupFromSources(body);

  if (!setupData || !setupData.categories?.length) {
    return Response.json(
      {
        error:
          "Could not extract products from the provided sources. Try different URLs or add more business details.",
      },
      { status: 422 }
    );
  }

  const totalProducts = countProducts(setupData);

  return Response.json({
    success: true,
    setup: setupData,
    summary: {
      categories: setupData.categories.length,
      products: totalProducts,
      stores: setupData.stores?.length || 0,
    },
  });
}

// ════════════════════════════════════════════════════════
// Mode 2: Scan website URLs (streaming)
// ════════════════════════════════════════════════════════

function countProducts(setup: StoreSetupResult): number {
  return setup.categories.reduce((sum, c) => sum + c.products.length, 0);
}

async function extractSetupFromSources(body: any): Promise<StoreSetupResult | null> {
  const { urls, business_name, location, business_type } = body;

  if (!urls?.length) {
    return null;
  }

  const fetchResults = await Promise.allSettled(
    urls.map((url: string) => fetchWebPage(url))
  );

  const successfulPages: { url: string; content: string }[] = [];

  for (let i = 0; i < fetchResults.length; i++) {
    const result = fetchResults[i];
    if (result.status === "fulfilled" && result.value) {
      successfulPages.push({ url: urls[i], content: result.value });
    }
  }

  let setupData: StoreSetupResult | null = null;

  if (successfulPages.length > 0) {
    const combined = successfulPages
      .map(({ url, content }) => {
        const budget = Math.min(
          4000,
          Math.floor(20000 / successfulPages.length)
        );
        return `═══ SOURCE: ${url} ═══\n${content.substring(0, budget)}`;
      })
      .join("\n\n");

    setupData = await extractStoreSetup(
      combined,
      successfulPages.map((p) => p.url),
      business_name || "",
      location || "",
      business_type || ""
    );
  }

  if (!setupData || !setupData.categories?.length) {
    setupData = await extractStoreSetupWithWebSearch(
      business_name || "",
      location || "",
      business_type || "",
      urls
    );
  }

  return setupData;
}

async function handleWebsite(
  body: any,
  accountId: string,
  writer: SSEWriter
) {
  const { urls } = body;

  if (!urls?.length) {
    await setAccountStatus(accountId, "failed");
    writer.sendError("At least one URL is required.");
    return;
  }

  writer.sendProgress(`Fetching ${urls.length} webpage(s)...`);
  writer.sendProgress(
    "AI is analyzing the provided sources and searching the web if needed..."
  );

  const setupData = await extractSetupFromSources(body);

  if (!setupData || !setupData.categories?.length) {
    await setAccountStatus(accountId, "failed");
    writer.sendError(
      "Could not extract products from the provided URLs. Try different URLs or use Smart Search mode."
    );
    return;
  }

  // Step 4: Save to database
  writer.sendProgress("Saving products to your account...");
  const saved = await saveToSupabase(setupData, accountId, body.store_id, writer);
  await setAccountStatus(accountId, "ready");

  const totalProducts = countProducts(setupData);

  writer.sendProgress(
    `Done! Found ${totalProducts} products in ${setupData.categories.length} categories.`
  );
  writer.sendResult({ success: true, setup: setupData, saved });
}

// ════════════════════════════════════════════════════════
// Mode 3: Web search (streaming)
// ════════════════════════════════════════════════════════

async function handleSearch(
  body: any,
  accountId: string,
  writer: SSEWriter
) {
  const { business_name, location, business_type } = body;

  if (!business_name) {
    await setAccountStatus(accountId, "failed");
    writer.sendError("Business name is required.");
    return;
  }

  writer.sendProgress(
    `AI is searching the web for "${business_name}"...`
  );

  const setupData = await extractStoreSetupWithWebSearch(
    business_name,
    location || "",
    business_type || "",
    []
  );

  if (!setupData || !setupData.categories?.length) {
    await setAccountStatus(accountId, "failed");
    writer.sendError(
      `Could not find product information for "${business_name}". Try adding more details like location or business type.`
    );
    return;
  }

  const totalProducts = setupData.categories.reduce(
    (sum, c) => sum + c.products.length,
    0
  );

  writer.sendProgress(
    `Found ${totalProducts} products! Saving to your account...`
  );

  const saved = await saveToSupabase(setupData, accountId, body.store_id, writer);
  await setAccountStatus(accountId, "ready");

  writer.sendProgress(
    `Done! Imported ${saved.products_created} products in ${saved.categories_created} categories.`
  );
  writer.sendResult({ success: true, setup: setupData, saved });
}

// ════════════════════════════════════════════════════════
// Mode 4: Analyze uploaded product images (streaming)
// ════════════════════════════════════════════════════════

async function handleImages(
  body: any,
  accountId: string,
  writer: SSEWriter
) {
  const { image_urls } = body;

  if (!image_urls?.length) {
    await setAccountStatus(accountId, "failed");
    writer.sendError("At least one image URL is required.");
    return;
  }

  // Get existing categories for better matching
  let existingCategories: string[] = [];
  const { data } = await getSupabaseAdmin()
    .from("productcategory")
    .select("name")
    .eq("account_id", accountId)
    .eq("isactive", "Y");
  existingCategories = (data || []).map((c: any) => c.name).filter(Boolean);

  // Process images in batches of 5
  const batchSize = 5;
  const products: ProductData[] = [];

  for (let i = 0; i < image_urls.length; i += batchSize) {
    const batch = image_urls.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(image_urls.length / batchSize);

    writer.sendProgress(
      `Analyzing images... (batch ${batchNum}/${totalBatches}, ${products.length}/${image_urls.length} done)`
    );

    const batchResults = await Promise.allSettled(
      batch.map((url: string) =>
        analyzeProductImage(url, existingCategories)
      )
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled" && result.value) {
        products.push(result.value);
      }
    }
  }

  if (products.length === 0) {
    writer.sendError("Could not extract any products from the images.");
    return;
  }

  writer.sendProgress(
    `Analyzed ${products.length} products. Saving to your account...`
  );

  const saved = await saveProductsToSupabase(products, accountId, body.store_id);
  await setAccountStatus(accountId, "ready");

  writer.sendProgress(
    `Done! Imported ${saved.products_created} products.`
  );
  writer.sendResult({ success: true, products, saved });
}

// ════════════════════════════════════════════════════════
// Claude API helpers
// ════════════════════════════════════════════════════════

async function callClaudeWithWebSearch(
  prompt: string,
  maxSearches: number = 10
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 280000); // 280s (leave 20s buffer for DB saves)

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": getClaudeApiKey(),
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16000,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: maxSearches,
          },
        ],
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();

    if (!response.ok) {
      console.error("Claude API error:", JSON.stringify(data));
      throw new Error(
        `Claude API error: ${data.error?.message || response.statusText}`
      );
    }

    return extractTextFromBlocks(data.content || []);
  } catch (e: any) {
    clearTimeout(timeout);
    if (e.name === "AbortError") {
      throw new Error(
        "AI analysis timed out. Try a more specific business name or fewer URLs."
      );
    }
    throw e;
  }
}

async function callClaude(
  messages: any[],
  maxTokens: number = 8192
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 280000);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": getClaudeApiKey(),
        "anthropic-version": "2023-06-01",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        messages,
      }),
    });

    clearTimeout(timeout);

    const data = await response.json();

    if (!response.ok) {
      console.error("Claude API error:", data);
      throw new Error(
        `Claude API error: ${data.error?.message || response.statusText}`
      );
    }

    return extractTextFromBlocks(data.content || []);
  } catch (e: any) {
    clearTimeout(timeout);
    if (e.name === "AbortError") {
      throw new Error("AI analysis timed out.");
    }
    throw e;
  }
}

function extractTextFromBlocks(blocks: any[]): string {
  return blocks
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n");
}

// ════════════════════════════════════════════════════════
// Store setup extraction
// ════════════════════════════════════════════════════════

async function extractStoreSetup(
  combinedHtml: string,
  sourceUrls: string[],
  businessName: string,
  location: string,
  businessType: string
): Promise<StoreSetupResult | null> {
  const prompt = buildMultiSourcePrompt(
    combinedHtml,
    sourceUrls,
    businessName,
    location,
    businessType
  );

  const text = await callClaude(
    [{ role: "user", content: prompt }],
    16000
  );

  return parseJsonObject<StoreSetupResult>(text);
}

async function extractStoreSetupWithWebSearch(
  businessName: string,
  location: string,
  businessType: string,
  hintUrls: string[]
): Promise<StoreSetupResult | null> {
  const urlHints =
    hintUrls.length > 0
      ? `\n\nHere are some URLs that may belong to this business (visit them if possible):\n${hintUrls.map((u) => `- ${u}`).join("\n")}`
      : "";

  const prompt = `You are a business intelligence expert. Search the internet to find complete product/menu information for this business and set up their Point of Sale system.

Business details:
- Name: ${businessName}
- Location: ${location}
- What they sell: ${businessType}${urlHints}

Search for this business across their official website, social media (Facebook, Instagram), review sites (TripAdvisor, Yelp, Zomato), delivery platforms (Uber Eats, DoorDash, Deliveroo), and any other sources.

YOUR JOB: Find and extract ALL their products/menu items with prices, plus store information.

Return a JSON object with this EXACT structure (no other text, just JSON):
{
  "store_name": "The actual business name",
  "store_description": "What this business sells",
  "address": "Full street address",
  "city": "City name",
  "country": "Country name",
  "phone": "Phone number with country code",
  "opening_hours": "e.g. Mon-Sat 9:00-18:00",
  "currency": "3-letter code (USD, EUR, GBP, MUR, etc.)",
  "business_type": "retail" or "restaurant",
  "tax_rate": 15.0,
  "tax_name": "VAT or appropriate tax name",
  "categories": [
    {
      "name": "Category Name",
      "products": [
        {"name": "Product Name", "price": 9.99, "description": "Brief description", "image_url": "https://example.com/product-image.jpg"}
      ]
    }
  ],
  "stores": [
    {
      "store_name": "Brand — Branch Name",
      "address": "Full address",
      "city": "City",
      "country": "Country",
      "currency": "MUR",
      "phone": "Phone",
      "opening_hours": "Hours"
    }
  ]
}

CRITICAL RULES:
- Extract EVERY product/menu item you can find — be thorough
- Use REAL prices from the sources. If no prices found, estimate realistic local prices
- Include at LEAST 10 products if the business has that many
- If multiple locations exist, list each in the "stores" array
- IMAGES: For each product, search for a real product photo URL. Look on the business website, social media, delivery platforms. The image_url MUST be a full absolute URL starting with https://. If you truly cannot find an image, use empty string "".
- Return ONLY valid JSON, no markdown, no explanation`;

  const text = await callClaudeWithWebSearch(prompt, 10);
  return parseJsonObject<StoreSetupResult>(text);
}

function buildMultiSourcePrompt(
  combinedHtml: string,
  sourceUrls: string[],
  businessName: string,
  location: string,
  businessType: string
): string {
  return `You are a business intelligence expert analyzing MULTIPLE online sources to set up a Point of Sale system for a real business.

The business owner told us:
- Business name: ${businessName}
- Location: ${location}
- What they sell: ${businessType}

We scraped the following ${sourceUrls.length} sources about this business:
${sourceUrls.map((url, i) => `${i + 1}. ${url}`).join("\n")}

Here is the combined HTML content from ALL sources:
\`\`\`
${combinedHtml}
\`\`\`

YOUR JOB: Cross-reference ALL sources to build the MOST COMPLETE picture of this business. Be thorough!

Return a JSON object with this EXACT structure (no other text, just JSON):
{
  "store_name": "The actual legal/trading business name (brand name)",
  "store_description": "What this business sells — be specific",
  "address": "Full street address of the main/first location from ANY source",
  "city": "City name",
  "country": "Country name",
  "phone": "Phone number if found in ANY source (with country code if possible)",
  "opening_hours": "e.g. Mon-Sat 9:00-18:00, Sun Closed",
  "currency": "3-letter code (USD, EUR, GBP, MUR, etc.) — infer from prices shown or country",
  "business_type": "retail" or "restaurant",
  "tax_rate": 15.0,
  "tax_name": "VAT" or "GST" or "Sales Tax" — appropriate for the country,
  "categories": [
    {
      "name": "Category Name",
      "products": [
        {
          "name": "Product Name — be specific (include size/variant if known)",
          "price": 9.99,
          "description": "Brief product description",
          "image_url": "Full absolute URL to product image (must start with https://)"
        }
      ]
    }
  ],
  "stores": [
    {
      "store_name": "Brand Name — Location/Branch Name",
      "address": "Full street address of this specific location",
      "city": "City name",
      "country": "Country name",
      "currency": "MUR",
      "phone": "Phone for this specific location",
      "opening_hours": "Hours for this specific location"
    }
  ]
}

CRITICAL RULES:
- Extract EVERY product/menu item you can find across ALL sources — do NOT summarize or skip items
- Merge duplicates: if "Cappuccino" appears on website AND Facebook, combine into one entry with best price/image
- Prices: use REAL prices from the sources. If NO prices at all, estimate realistic prices for this business type in this country
- Images: prefer high-res images from any source (Facebook/Instagram images are fine)
- Categories: create logical groupings
- Return ONLY valid JSON, no markdown, no explanation, no preamble
- Include at LEAST 10 products if the business clearly has that many
- MULTI-STORE: If multiple locations exist, list EACH in the "stores" array`;
}

// ════════════════════════════════════════════════════════
// Image analysis
// ════════════════════════════════════════════════════════

async function analyzeProductImage(
  imageUrl: string,
  existingCategories: string[]
): Promise<ProductData | null> {
  const categoryHint =
    existingCategories.length > 0
      ? `\nExisting categories to match against: [${existingCategories.join(", ")}]`
      : "";

  const text = await callClaude(
    [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "url", url: imageUrl },
          },
          {
            type: "text",
            text: `Analyze this product image. Extract:
- name: product name (be specific, e.g. 'Coca-Cola 330ml' not just 'Soda')
- price: price if visible, otherwise 0.0
- description: brief 1-2 sentence description
- image_url: "${imageUrl}"${categoryHint}

Return ONLY a JSON object, no other text.
{"name": "...", "price": 0.0, "description": "...", "image_url": "..."}`,
          },
        ],
      },
    ],
    1024
  );

  return parseJsonObject<ProductData>(text);
}

// ════════════════════════════════════════════════════════
// Web page fetching
// ════════════════════════════════════════════════════════

async function fetchWebPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PosteritaBot/1.0; +https://posterita.com)",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const html = await response.text();

    // Strip scripts, styles, and HTML tags to get clean text
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 50000);
  } catch (e) {
    console.error(`Failed to fetch ${url}:`, e);
    return null;
  }
}

// ════════════════════════════════════════════════════════
// Cloudinary upload
// ════════════════════════════════════════════════════════

async function uploadToCloudinary(
  imageUrl: string,
  accountId: string,
  productId: number
): Promise<string> {
  try {
    const folder = `posterita/${accountId}/products`;
    const publicId = `product_${productId}`;

    const formData = new FormData();
    formData.append("file", imageUrl);
    formData.append("upload_preset", "posterita_unsigned");
    formData.append("folder", folder);
    formData.append("public_id", publicId);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${getCloudinaryCloudName()}/image/upload`,
      { method: "POST", body: formData }
    );

    const result = await response.json();
    return result.secure_url ?? imageUrl;
  } catch {
    return imageUrl; // Fallback to original URL
  }
}

// ════════════════════════════════════════════════════════
// Supabase persistence
// ════════════════════════════════════════════════════════

interface SaveResult {
  categories_created: number;
  products_created: number;
  stores_created: number;
}

async function saveToSupabase(
  setup: StoreSetupResult,
  accountId: string,
  storeId?: number,
  writer?: SSEWriter
): Promise<SaveResult> {
  let categoriesCreated = 0;
  let productsCreated = 0;
  let storesCreated = 0;

  // Get existing categories + taxes for this account
  const { data: existingCategories } = await getSupabaseAdmin()
    .from("productcategory")
    .select("productcategory_id, name")
    .eq("account_id", accountId)
    .eq("isactive", "Y");

  const { data: existingTaxes } = await getSupabaseAdmin()
    .from("tax")
    .select("tax_id, name, rate")
    .eq("account_id", accountId)
    .eq("isactive", "Y");

  // Get next IDs
  const { data: maxCatId } = await getSupabaseAdmin()
    .from("productcategory")
    .select("productcategory_id")
    .eq("account_id", accountId)
    .order("productcategory_id", { ascending: false })
    .limit(1);

  const { data: maxProdId } = await getSupabaseAdmin()
    .from("product")
    .select("product_id")
    .eq("account_id", accountId)
    .order("product_id", { ascending: false })
    .limit(1);

  let nextCategoryId = (maxCatId?.[0]?.productcategory_id ?? 0) + 1;
  let nextProductId = (maxProdId?.[0]?.product_id ?? 0) + 1;

  // Find or create a matching tax
  let taxId = 0;
  if (setup.tax_rate > 0) {
    const matchedTax = existingTaxes?.find(
      (t: any) => Math.abs(t.rate - setup.tax_rate) < 0.01
    );
    if (matchedTax) {
      taxId = matchedTax.tax_id;
    } else {
      const { data: newTax } = await getSupabaseAdmin()
        .from("tax")
        .insert({
          account_id: accountId,
          name: setup.tax_name || "VAT",
          rate: setup.tax_rate,
          isactive: "Y",
        })
        .select("tax_id")
        .single();
      if (newTax) taxId = newTax.tax_id;
    }
  }

  // Total product count for progress reporting
  const totalProducts = setup.categories.reduce(
    (sum, c) => sum + (c.products?.length ?? 0),
    0
  );

  // Create categories and products
  for (const cat of setup.categories) {
    if (!cat.name || !cat.products?.length) continue;

    // Find existing category or create new one
    const existing = existingCategories?.find(
      (c: any) => c.name?.toLowerCase() === cat.name.toLowerCase()
    );

    let categoryId: number;
    if (existing) {
      categoryId = existing.productcategory_id;
    } else {
      categoryId = nextCategoryId++;
      await getSupabaseAdmin().from("productcategory").upsert(
        {
          productcategory_id: categoryId,
          account_id: accountId,
          name: cat.name,
          isactive: "Y",
          display: "Y",
          position: categoriesCreated,
        },
        { onConflict: "productcategory_id" }
      );
      categoriesCreated++;
    }

    // Insert products for this category
    for (const product of cat.products) {
      if (!product.name) continue;

      const productId = nextProductId++;
      productsCreated++;

      // Report progress during save
      if (writer && productsCreated % 5 === 0) {
        writer.sendProgress(
          `Saving products... ${productsCreated}/${totalProducts}`
        );
      }

      // Upload image to Cloudinary if it's an external URL
      let imageUrl = product.image_url || "";
      if (
        imageUrl &&
        !imageUrl.includes("cloudinary") &&
        imageUrl.startsWith("http")
      ) {
        imageUrl = await uploadToCloudinary(imageUrl, accountId, productId);
      }

      const taxAmount =
        taxId && setup.tax_rate
          ? (product.price * setup.tax_rate) / (100 + setup.tax_rate)
          : 0;

      await getSupabaseAdmin().from("product").upsert(
        {
          product_id: productId,
          account_id: accountId,
          name: product.name,
          description: product.description || "",
          sellingprice: product.price || 0,
          costprice: (product.price || 0) * 0.6,
          taxamount: Math.round(taxAmount * 100) / 100,
          tax_id: taxId,
          productcategory_id: categoryId,
          image: imageUrl,
          isactive: "Y",
          istaxincluded: "Y",
          isstock: "Y",
          product_status: "review",
          source: "ai_import",
        },
        { onConflict: "product_id" }
      );
    }
  }

  // Create store records
  if (setup.stores?.length) {
    const { data: maxStoreId } = await getSupabaseAdmin()
      .from("store")
      .select("store_id")
      .eq("account_id", accountId)
      .order("store_id", { ascending: false })
      .limit(1);

    let nextStoreId = (maxStoreId?.[0]?.store_id ?? 0) + 1;

    for (const store of setup.stores) {
      if (!store.store_name) continue;

      await getSupabaseAdmin().from("store").upsert(
        {
          store_id: nextStoreId++,
          account_id: accountId,
          name: store.store_name,
          address: store.address || "",
          city: store.city || "",
          country: store.country || "",
          currency: store.currency || setup.currency || "MUR",
          isactive: "Y",
        },
        { onConflict: "store_id" }
      );
      storesCreated++;
    }
  }

  return {
    categories_created: categoriesCreated,
    products_created: productsCreated,
    stores_created: storesCreated,
  };
}

async function saveProductsToSupabase(
  products: ProductData[],
  accountId: string,
  storeId?: number
): Promise<SaveResult> {
  const categoryMap = new Map<string, ProductData[]>();
  for (const p of products) {
    const cat = (p as any).category || "Uncategorized";
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(p);
  }

  const setup: StoreSetupResult = {
    store_name: "",
    store_description: "",
    address: "",
    city: "",
    country: "",
    phone: "",
    opening_hours: "",
    currency: "MUR",
    business_type: "retail",
    tax_rate: 0,
    tax_name: "",
    categories: Array.from(categoryMap.entries()).map(([name, prods]) => ({
      name,
      products: prods,
    })),
    stores: [],
  };

  return saveToSupabase(setup, accountId, storeId);
}

// ════════════════════════════════════════════════════════
// JSON parsing helpers
// ════════════════════════════════════════════════════════

function parseJsonObject<T>(text: string): T | null {
  try {
    const jsonStr = extractJsonFromText(text, "{", "}");
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}

function parseJsonArray<T>(text: string): T[] {
  try {
    const jsonStr = extractJsonFromText(text, "[", "]");
    return JSON.parse(jsonStr) as T[];
  } catch {
    return [];
  }
}

function extractJsonFromText(
  text: string,
  openChar: string,
  closeChar: string
): string {
  // Try markdown code block first
  const codeBlockRegex = new RegExp(
    "```(?:json)?\\s*\\n?(\\" +
      openChar +
      "[\\s\\S]*?\\" +
      closeChar +
      ")\\s*\\n?```"
  );
  const match = codeBlockRegex.exec(text);
  if (match) return match[1];

  // Try raw JSON
  const start = text.indexOf(openChar);
  const end = text.lastIndexOf(closeChar);
  if (start !== -1 && end !== -1 && end > start) {
    return text.substring(start, end + 1);
  }

  return text;
}
