import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
            order: () => ({
              limit: async () => ({ data: [], error: null }),
            }),
          }),
          single: async () => ({ data: null, error: null }),
          order: () => ({
            limit: async () => ({ data: [], error: null }),
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: null } }),
    },
  }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [],
  }),
}));

function mockRequest(body: any, headers?: Record<string, string>): any {
  const hdrs = new Map(Object.entries(headers ?? {})); return { json: () => Promise.resolve(body), headers: { get: (key: string) => hdrs.get(key) ?? null } };
}

beforeEach(() => {
  vi.resetModules();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  process.env.CLAUDE_API_KEY = "test-claude-key";

  global.fetch = vi.fn(async (input: any) => {
    const url = typeof input === "string" ? input : input.url;

    if (url === "https://example.com/menu") {
      return new Response(
        "<html><body><h1>Sample Cafe</h1><p>Latte 150</p></body></html>",
        { status: 200 }
      );
    }

    if (url === "https://api.anthropic.com/v1/messages") {
      return new Response(
        JSON.stringify({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                store_name: "Sample Cafe",
                store_description: "Coffee and pastries",
                address: "1 Test Street",
                city: "Port Louis",
                country: "Mauritius",
                phone: "+2301234567",
                opening_hours: "Mon-Sat 08:00-18:00",
                currency: "MUR",
                business_type: "restaurant",
                tax_rate: 15,
                tax_name: "VAT",
                categories: [
                  {
                    name: "Coffee",
                    products: [
                      {
                        name: "Latte",
                        price: 150,
                        description: "Fresh milk coffee",
                        image_url: "https://images.example.com/latte.jpg",
                      },
                    ],
                  },
                ],
                stores: [
                  {
                    store_name: "Sample Cafe - Main",
                    address: "1 Test Street",
                    city: "Port Louis",
                    country: "Mauritius",
                    currency: "MUR",
                    phone: "+2301234567",
                    opening_hours: "Mon-Sat 08:00-18:00",
                  },
                ],
              }),
            },
          ],
        }),
        { status: 200 }
      );
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }) as any;
});

describe("/api/ai-import POST – device_setup", () => {
  it("returns extracted setup data without requiring a web session", async () => {
    const { POST } = await import("../../app/api/ai-import/route");

    const res = await POST(
      mockRequest({
        mode: "device_setup",
        urls: ["https://example.com/menu"],
        business_name: "Sample Cafe",
        location: "Port Louis",
        business_type: "restaurant",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.setup.store_name).toBe("Sample Cafe");
    expect(json.setup.categories).toHaveLength(1);
    expect(json.summary.products).toBe(1);
  });

  it("falls back to business name search when URLs are empty", async () => {
    const { POST } = await import("../../app/api/ai-import/route");

    const res = await POST(
      mockRequest({
        mode: "device_setup",
        urls: [],
        business_name: "Sample Cafe",
      })
    );
    const json = await res.json();

    // Empty URLs triggers business name search via Claude — still succeeds
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });
});
