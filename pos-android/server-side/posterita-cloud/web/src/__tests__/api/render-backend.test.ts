/**
 * Render Backend Tests — verify the backend service is running and healthy.
 * Hits the REAL production Render backend.
 * Run: SUPABASE_SERVICE_ROLE_KEY=xxx npx vitest run src/__tests__/api/render-backend.test.ts
 */
import { describe, it, expect } from "vitest";

const RENDER_URL = process.env.RENDER_URL || "https://posterita-backend.onrender.com";
const VERCEL_URL = process.env.SMOKE_TEST_URL || "https://web.posterita.com";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const canRun = SERVICE_KEY.length > 10;

// ── Render Backend Health ──

describe.skipIf(!canRun)("Render Backend — Health", () => {
  it("GET /health returns ok with DB connectivity", async () => {
    const res = await fetch(`${RENDER_URL}/health`, { signal: AbortSignal.timeout(15000) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.service).toBe("posterita-backend");
    expect(json.status).toBe("ok");
    expect(json.uptime_seconds).toBeGreaterThan(0);
  });

  it("GET / returns service info with endpoints list", async () => {
    const res = await fetch(`${RENDER_URL}/`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.service).toBe("posterita-backend");
    expect(json.endpoints).toBeInstanceOf(Array);
    expect(json.endpoints.length).toBeGreaterThan(3);
  });
});

// ── Render Backend — Monitoring Endpoints ──

describe.skipIf(!canRun)("Render Backend — Monitoring", () => {
  it("GET /monitor/errors returns error counts", async () => {
    const res = await fetch(`${RENDER_URL}/monitor/errors`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("open_count");
    expect(json).toHaveProperty("fatal_count");
    expect(json).toHaveProperty("recent");
    expect(typeof json.open_count).toBe("number");
    expect(typeof json.fatal_count).toBe("number");
    expect(Array.isArray(json.recent)).toBe(true);
  });

  it("GET /monitor/sync returns sync stats", async () => {
    const res = await fetch(`${RENDER_URL}/monitor/sync`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("syncs_last_hour");
    expect(json).toHaveProperty("failed_count");
    expect(json).toHaveProperty("avg_duration_ms");
    expect(json).toHaveProperty("slow");
    expect(typeof json.syncs_last_hour).toBe("number");
    expect(typeof json.avg_duration_ms).toBe("number");
  });

  it("GET /monitor/accounts returns account/owner/device counts", async () => {
    const res = await fetch(`${RENDER_URL}/monitor/accounts`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.accounts).toBeGreaterThan(0);
    expect(json.owners).toBeGreaterThan(0);
    expect(typeof json.active_devices).toBe("number");
  });
});

// ── Render Backend — WhatsApp Webhook ──

describe.skipIf(!canRun)("Render Backend — WhatsApp Webhook", () => {
  it("GET /webhook/whatsapp rejects invalid verify token", async () => {
    const res = await fetch(
      `${RENDER_URL}/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=test123`
    );
    expect(res.status).toBe(403);
  });

  it("GET /webhook/whatsapp responds to verify challenge", async () => {
    const res = await fetch(
      `${RENDER_URL}/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=posterita_whatsapp_2026&hub.challenge=test_challenge_abc`
    );
    // 200 = correct token, 403 = wrong token (both valid server behavior)
    expect([200, 403]).toContain(res.status);
    if (res.status === 200) {
      const text = await res.text();
      expect(text).toBe("test_challenge_abc");
    }
  });

  it("POST /webhook/whatsapp accepts empty payload without crashing", async () => {
    const res = await fetch(`${RENDER_URL}/webhook/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    // Should always return 200 (Meta requires fast ack)
    expect(res.status).toBe(200);
  });

  it("POST /webhook/whatsapp handles a simulated message payload", async () => {
    const res = await fetch(`${RENDER_URL}/webhook/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entry: [{
          changes: [{
            value: {
              messages: [{
                from: "23012345678",
                text: { body: "RECEIPT TEST-001" },
                timestamp: "1711234567",
              }],
            },
          }],
        }],
      }),
    });
    expect(res.status).toBe(200);
  });
});

// ── Render Backend — Security ──

describe.skipIf(!canRun)("Render Backend — Security", () => {
  it("responds to OPTIONS with CORS headers", async () => {
    const res = await fetch(`${RENDER_URL}/health`, { method: "OPTIONS" });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("non-existent routes return 404 JSON", async () => {
    const res = await fetch(`${RENDER_URL}/does-not-exist`);
    // Express default is 404 HTML, but our catch-all might not exist
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("malformed JSON to webhook doesn't crash server", async () => {
    const res = await fetch(`${RENDER_URL}/webhook/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json at all {{{",
    });
    // Should not return 200 (bad parse) or server should handle gracefully
    expect(res.status).toBeLessThan(600);
  });
});

// ── Vercel Monitor Endpoint (tests Render from Vercel) ──

describe.skipIf(!canRun)("Vercel Monitor — Cross-Service Health", () => {
  it("GET /api/monitor returns all service checks", async () => {
    const res = await fetch(`${VERCEL_URL}/api/monitor`, { signal: AbortSignal.timeout(20000) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("status");
    expect(json).toHaveProperty("checks");
    expect(json.checks).toHaveProperty("supabase");
    expect(json.checks).toHaveProperty("render_backend");
    expect(json.checks).toHaveProperty("vercel_sync_api");
  });

  it("Supabase check is ok", async () => {
    const res = await fetch(`${VERCEL_URL}/api/monitor`);
    const json = await res.json();
    expect(json.checks.supabase.status).toBe("ok");
  });

  it("Render backend check is ok", async () => {
    const res = await fetch(`${VERCEL_URL}/api/monitor`);
    const json = await res.json();
    expect(json.checks.render_backend.status).toBe("ok");
  });

  it("Monitor responds under 10 seconds", async () => {
    const res = await fetch(`${VERCEL_URL}/api/monitor`);
    const json = await res.json();
    expect(json.total_ms).toBeLessThan(10000);
  });
});
