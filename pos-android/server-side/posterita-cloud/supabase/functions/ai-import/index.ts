// Supabase Edge Function: ai-import
// Handles AI-powered product import from website URL or images
// Runs server-side with higher API limits than the Android device

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY") ?? "";
const CLOUDINARY_CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME") ?? "";
const CLOUDINARY_API_KEY = Deno.env.get("CLOUDINARY_API_KEY") ?? "";
const CLOUDINARY_API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET") ?? "";

interface ImportRequest {
  mode: "website" | "images";
  website_url?: string;
  image_urls?: string[];  // Cloudinary URLs of uploaded images
  store_id: number;
}

interface ProductResult {
  name: string;
  description: string;
  sellingprice: number;
  costprice: number;
  category: string;
  upc: string;
  image_url: string;
  tax_rate: number;
}

async function setAccountStatus(supabaseAdmin: any, accountId: string, status: string) {
  await supabaseAdmin
    .from("account")
    .update({ status })
    .eq("account_id", accountId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ImportRequest = await req.json();
    let accountId: string | null = null;
    let userId = 0;

    const { data: owner } = await supabaseAdmin
      .from("owner")
      .select("id")
      .eq("auth_uid", user.id)
      .eq("is_active", true)
      .single();

    if (owner?.id) {
      const { data: ownerSession } = await supabaseAdmin
        .from("owner_account_session")
        .select("account_id")
        .eq("owner_id", owner.id)
        .single();

      if (ownerSession?.account_id) {
        accountId = ownerSession.account_id;
      }
    }

    const { data: posUser } = await supabase
      .from("pos_user")
      .select("account_id, user_id")
      .eq("auth_uid", user.id);

    const matchingPosUser =
      (accountId && posUser?.find((row: any) => row.account_id === accountId)) ??
      posUser?.[0] ??
      null;

    if (!matchingPosUser) {
      return new Response(JSON.stringify({ error: "POS user not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    accountId = matchingPosUser.account_id;
    userId = matchingPosUser.user_id;
    await setAccountStatus(supabaseAdmin, accountId, "in_progress");

    // Create import job record
    const { data: job, error: jobError } = await supabaseAdmin
      .from("ai_import_job")
      .insert({
        account_id: accountId,
        status: "processing",
        source_url: body.website_url ?? null,
        started_by: userId,
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Get existing categories for matching
    const { data: existingCategories } = await supabase
      .from("productcategory")
      .select("productcategory_id, name")
      .eq("isactive", "Y");

    // Get existing taxes
    const { data: existingTaxes } = await supabase
      .from("tax")
      .select("tax_id, name, rate")
      .eq("isactive", "Y");

    let products: ProductResult[] = [];

    if (body.mode === "website" && body.website_url) {
      products = await importFromWebsite(body.website_url, existingCategories ?? []);
    } else if (body.mode === "images" && body.image_urls?.length) {
      products = await importFromImages(body.image_urls, existingCategories ?? []);
    }

    // Update job with total
    await supabaseAdmin
      .from("ai_import_job")
      .update({ total_products: products.length })
      .eq("id", job.id);

    // Get max product_id for this account
    const { data: maxIdResult } = await supabaseAdmin
      .from("product")
      .select("product_id")
      .eq("account_id", accountId)
      .order("product_id", { ascending: false })
      .limit(1);

    let nextProductId = (maxIdResult?.[0]?.product_id ?? 0) + 1;

    // Insert products
    const insertedProducts = [];
    for (let i = 0; i < products.length; i++) {
      const p = products[i];

      // Match category
      const matchedCategory = existingCategories?.find(
        (c: any) => c.name?.toLowerCase() === p.category?.toLowerCase()
      );

      // Match tax
      const matchedTax = existingTaxes?.find(
        (t: any) => Math.abs(t.rate - p.tax_rate) < 0.01
      );

      // Upload image to Cloudinary if it's an external URL
      let imageUrl = p.image_url;
      if (imageUrl && !imageUrl.includes("cloudinary")) {
        imageUrl = await uploadToCloudinary(imageUrl, accountId, nextProductId);
      }

      const taxAmount = matchedTax
        ? p.sellingprice * matchedTax.rate / (100 + matchedTax.rate)
        : 0;

      const productData = {
        product_id: nextProductId++,
        account_id: accountId,
        name: p.name,
        description: p.description,
        sellingprice: p.sellingprice,
        costprice: p.costprice,
        taxamount: taxAmount,
        tax_id: matchedTax?.tax_id ?? 0,
        productcategory_id: matchedCategory?.productcategory_id ?? 0,
        upc: p.upc,
        image: imageUrl,
        isactive: "Y",
        istaxincluded: "Y",
        isstock: "Y",
        createdby: userId,
        updatedby: userId,
      };

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("product")
        .insert(productData)
        .select()
        .single();

      if (!insertError) {
        insertedProducts.push(inserted);
      }

      // Update progress
      await supabaseAdmin
        .from("ai_import_job")
        .update({ processed_products: i + 1 })
        .eq("id", job.id);
    }

    // Mark job complete
    await supabaseAdmin
      .from("ai_import_job")
      .update({
        status: "completed",
        processed_products: products.length,
        products_json: insertedProducts,
      })
      .eq("id", job.id);
    await setAccountStatus(supabaseAdmin, accountId, "ready");

    return new Response(
      JSON.stringify({
        success: true,
        job_id: job.id,
        products_created: insertedProducts.length,
        products: insertedProducts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    try {
      const authHeader = req.headers.get("Authorization")!;
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: owner } = await supabaseAdmin
          .from("owner")
          .select("id")
          .eq("auth_uid", user.id)
          .eq("is_active", true)
          .single();
        let accountId: string | null = null;
        if (owner?.id) {
          const { data: ownerSession } = await supabaseAdmin
            .from("owner_account_session")
            .select("account_id")
            .eq("owner_id", owner.id)
            .single();
          accountId = ownerSession?.account_id ?? null;
        }
        if (!accountId) {
          const { data: posUsers } = await supabase
            .from("pos_user")
            .select("account_id")
            .eq("auth_uid", user.id);
          accountId = posUsers?.[0]?.account_id ?? null;
        }
        if (accountId) {
          await setAccountStatus(supabaseAdmin, accountId, "failed");
        }
      }
    } catch {
      // Ignore failure bookkeeping.
    }
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================================
// AI Analysis Functions
// ============================================================

async function importFromWebsite(url: string, categories: any[]): Promise<ProductResult[]> {
  // Fetch the website content
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PosteritaBot/1.0)" },
  });
  const html = await response.text();

  // Strip HTML to text (basic)
  const textContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 50000); // Claude context limit consideration

  const categoryNames = categories.map((c: any) => c.name).join(", ");

  const claudeResponse = await callClaude(
    `You are a product data extraction expert. Extract ALL products from this website content.

For each product, provide:
- name: product name
- description: brief description
- sellingprice: price as a number (0 if not found)
- costprice: estimated cost (60% of selling price if not available)
- category: best matching category from: [${categoryNames}] or suggest a new one
- upc: barcode if visible, empty string if not
- image_url: product image URL if found, empty string if not
- tax_rate: tax rate percentage (15 for VAT countries, 0 if unclear)

Return a JSON array of products. Only return the JSON, no other text.

Website URL: ${url}
Website content:
${textContent}`
  );

  try {
    return JSON.parse(claudeResponse);
  } catch {
    return [];
  }
}

async function importFromImages(imageUrls: string[], categories: any[]): Promise<ProductResult[]> {
  const results: ProductResult[] = [];
  const categoryNames = categories.map((c: any) => c.name).join(", ");

  // Process up to 5 images concurrently
  const batchSize = 5;
  for (let i = 0; i < imageUrls.length; i += batchSize) {
    const batch = imageUrls.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (url) => {
        const claudeResponse = await callClaudeVision(
          `Analyze this product image. Extract:
- name: product name
- description: brief description (what it is, key features)
- sellingprice: estimated retail price (in the local currency shown, or estimate)
- costprice: estimated cost (60% of selling)
- category: best matching from: [${categoryNames}] or suggest one
- upc: barcode if visible, empty string if not
- image_url: "${url}"
- tax_rate: 15

Return ONLY a JSON object, no other text.`,
          url
        );

        try {
          return JSON.parse(claudeResponse) as ProductResult;
        } catch {
          return null;
        }
      })
    );

    results.push(...batchResults.filter((r): r is ProductResult => r !== null));
  }

  return results;
}

async function callClaude(prompt: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  return data.content?.[0]?.text ?? "[]";
}

async function callClaudeVision(prompt: string, imageUrl: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "url", url: imageUrl },
          },
          { type: "text", text: prompt },
        ],
      }],
    }),
  });

  const data = await response.json();
  return data.content?.[0]?.text ?? "{}";
}

async function uploadToCloudinary(
  imageUrl: string,
  accountId: string,
  productId: number
): Promise<string> {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `posterita/${accountId}/products`;
    const publicId = `product_${productId}`;

    // Generate signature
    const signStr = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(signStr);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const formData = new FormData();
    formData.append("file", imageUrl);
    formData.append("api_key", CLOUDINARY_API_KEY);
    formData.append("timestamp", timestamp.toString());
    formData.append("signature", signature);
    formData.append("folder", folder);
    formData.append("public_id", publicId);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );

    const result = await response.json();
    return result.secure_url ?? imageUrl;
  } catch {
    return imageUrl; // Fallback to original URL
  }
}
