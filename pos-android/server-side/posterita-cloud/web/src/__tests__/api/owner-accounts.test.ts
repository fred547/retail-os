import { beforeEach, describe, expect, it, vi } from "vitest";

let tableResults: Record<string, { data: any; error: any }> = {};
let supabaseOps: Array<{
  table: string;
  op: string;
  data?: any;
  filters: Record<string, any>;
}> = [];

function createChain(table: string) {
  const state = {
    op: "select" as string,
    data: undefined as any,
    filters: {} as Record<string, any>,
  };

  function resolve() {
    supabaseOps.push({ table, op: state.op, data: state.data, filters: state.filters });
    const filterKey = Object.entries(state.filters)
      .map(([k, v]) => `${k}=${v}`)
      .join(",");

    return (
      tableResults[`${table}:${filterKey}`] ??
      tableResults[table] ??
      { data: state.op === "select" ? [] : null, error: null }
    );
  }

  const chain: any = {};
  for (const method of ["select", "eq", "neq", "order", "limit"] as const) {
    chain[method] = (...args: any[]) => {
      if (method === "select") state.op = "select";
      if (method === "eq") state.filters[args[0]] = args[1];
      if (method === "neq") state.filters[`${args[0]}!=`] = args[1];
      return chain;
    };
  }
  for (const method of ["insert", "update", "upsert", "delete"] as const) {
    chain[method] = (...args: any[]) => {
      state.op = method;
      state.data = args[0];
      return chain;
    };
  }
  chain.single = () => Promise.resolve(resolve());
  chain.then = (onFulfilled: Function, onRejected?: Function) =>
    Promise.resolve(resolve()).then(onFulfilled as any, onRejected as any);

  return chain;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => createChain(table),
  }),
}));

beforeEach(() => {
  tableResults = {};
  supabaseOps = [];
  vi.resetModules();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
});

describe("/api/owner/accounts GET", () => {
  it("returns owner accounts for a given phone", async () => {
    tableResults["owner:phone=+23052550000"] = {
      data: { id: 3, email: "owner@example.com", phone: "+23052550000" },
      error: null,
    };
    tableResults["account"] = {
      data: [
        {
          account_id: "trial_1",
          businessname: "Shop 1",
          type: "trial",
          status: "testing",
          created_at: "2026-03-18T00:00:00.000Z",
        },
      ],
      error: null,
    };

    const { GET } = await import("../../app/api/owner/accounts/route");
    const req = {
      nextUrl: new URL("https://web.posterita.com/api/owner/accounts?phone=%2B23052550000"),
    } as any;

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.accounts).toHaveLength(1);
    expect(json.accounts[0].owner_phone).toBe("+23052550000");
  });
});

describe("/api/owner/accounts/[accountId] PATCH", () => {
  it("updates an owned account type and lifecycle", async () => {
    tableResults["owner:phone=+23052550000"] = {
      data: { id: 7, email: "owner@example.com", phone: "+23052550000" },
      error: null,
    };
    tableResults["account:account_id=trial_1,owner_id=7"] = {
      data: { account_id: "trial_1", owner_id: 7, status: "testing", type: "trial" },
      error: null,
    };
    tableResults["account"] = {
      data: {
        account_id: "trial_1",
        businessname: "Renamed Shop",
        type: "live",
        status: "onboarding",
        created_at: "2026-03-18T00:00:00.000Z",
      },
      error: null,
    };

    const { PATCH } = await import("../../app/api/owner/accounts/[accountId]/route");
    const req = {
      json: () =>
        Promise.resolve({
          phone: "+23052550000",
          businessname: "Renamed Shop",
          type: "live",
          status: "onboarding",
        }),
    } as any;

    const res = await PATCH(req, { params: Promise.resolve({ accountId: "trial_1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.account.status).toBe("onboarding");
    expect(
      supabaseOps.some(
        (op) =>
          op.table === "account" &&
          op.data?.businessname === "Renamed Shop" &&
          op.data?.status === "onboarding"
      )
    ).toBe(true);
  });
});

describe("/api/owner/accounts/[accountId] DELETE", () => {
  it("requires owner verification for accounts past testing", async () => {
    tableResults["owner:phone=+23052550000"] = {
      data: { id: 9, email: "owner@example.com", phone: "+23052550000" },
      error: null,
    };
    tableResults["account:account_id=live_1,owner_id=9"] = {
      data: { account_id: "live_1", owner_id: 9, status: "active", type: "live" },
      error: null,
    };

    const { DELETE } = await import("../../app/api/owner/accounts/[accountId]/route");
    const req = {
      nextUrl: new URL("https://web.posterita.com/api/owner/accounts/live_1"),
      json: () => Promise.resolve({ phone: "+23052550000" }),
    } as any;

    const res = await DELETE(req, { params: Promise.resolve({ accountId: "live_1" }) });
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toContain("Owner phone verification");
  });

  it("archives an owned account after phone and PIN verification", async () => {
    tableResults["owner:phone=+23052550000"] = {
      data: { id: 9, email: "owner@example.com", phone: "+23052550000" },
      error: null,
    };
    tableResults["account:account_id=live_1,owner_id=9"] = {
      data: { account_id: "live_1", owner_id: 9, status: "active", type: "live" },
      error: null,
    };
    tableResults["pos_user:account_id=live_1,role=owner"] = {
      data: { pin: "123456" },
      error: null,
    };
    tableResults["account"] = {
      data: { account_id: "trial_2" },
      error: null,
    };

    const { DELETE } = await import("../../app/api/owner/accounts/[accountId]/route");
    const req = {
      nextUrl: new URL("https://web.posterita.com/api/owner/accounts/live_1"),
      json: () =>
        Promise.resolve({
          phone: "+23052550000",
          verification_phone: "+23052550000",
          owner_pin: "123456",
        }),
    } as any;

    const res = await DELETE(req, { params: Promise.resolve({ accountId: "live_1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.archived).toBe(true);
    expect(
      supabaseOps.some(
        (op) => op.table === "account" && op.op === "update" && op.data?.status === "archived"
      )
    ).toBe(true);
    expect(
      supabaseOps.some(
        (op) =>
          op.table === "owner_account_session" &&
          op.op === "upsert" &&
          op.data?.account_id === "trial_2"
      )
    ).toBe(true);
  });
});
