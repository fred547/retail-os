import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Test helpers ─────────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-admin",
    email: "admin@posterita.com",
    name: "Test Admin",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

// ─── RBAC Tests ───────────────────────────────────────────────────────────────

describe("RBAC middleware", () => {
  it("rejects unauthenticated users from protected procedures", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.inventory.listProducts({})).rejects.toThrow("Please login");
  });

  it("rejects non-admin users from admin procedures", async () => {
    const ctx = createContext({ role: "user" });
    const caller = appRouter.createCaller(ctx);

    // createProduct is an admin procedure
    await expect(
      caller.inventory.createProduct({ sku: "T1", name: "Test", price: "10" })
    ).rejects.toThrow();
  });

  it("allows admin users to call admin procedures", async () => {
    const ctx = createContext({ role: "admin" });
    const caller = appRouter.createCaller(ctx);

    // This should not throw an auth error (may throw DB error since we're not connected)
    try {
      await caller.inventory.createProduct({ sku: "T1", name: "Test", price: "10" });
    } catch (e: any) {
      // Should NOT be a FORBIDDEN error - it would be a DB connection error
      expect(e.code).not.toBe("FORBIDDEN");
    }
  });
});

// ─── Auth Tests ───────────────────────────────────────────────────────────────

describe("auth.me", () => {
  it("returns null for unauthenticated users", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user object for authenticated users", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.email).toBe("admin@posterita.com");
    expect(result?.role).toBe("admin");
  });
});

// ─── Inventory Router Input Validation ────────────────────────────────────────

describe("inventory router", () => {
  it("validates product creation requires sku, name, and price", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    // Missing required fields should fail validation
    await expect(
      caller.inventory.createProduct({ sku: "", name: "", price: "" } as any)
    ).rejects.toThrow();
  });

  it("accepts valid product creation input", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.inventory.createProduct({
        sku: "PRD-001",
        name: "Test Product",
        price: "29.99",
        costPrice: "15.00",
        taxRate: "15.00",
      });
    } catch (e: any) {
      // Should fail at DB level, not validation
      expect(e.message).not.toContain("validation");
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });

  it("validates category creation requires name", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.inventory.createCategory({ name: "" } as any)
    ).rejects.toThrow();
  });
});

// ─── Customer Router Input Validation ─────────────────────────────────────────

describe("customer router", () => {
  it("validates customer creation requires firstName", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.customer.create({ firstName: "" } as any)
    ).rejects.toThrow();
  });

  it("accepts valid customer creation input", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.customer.create({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "+23057001234",
        whatsappPhone: "+23057001234",
      });
    } catch (e: any) {
      // Should fail at DB level, not validation
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });
});

// ─── Loyalty Router Input Validation ──────────────────────────────────────────

describe("loyalty router", () => {
  it("validates tier creation requires name and minPoints", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.loyalty.createTier({ name: "", minPoints: -1 } as any)
    ).rejects.toThrow();
  });

  it("accepts valid tier creation input", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.loyalty.createTier({
        name: "Silver",
        minPoints: 0,
        maxPoints: 999,
        pointsMultiplier: "1.0",
      });
    } catch (e: any) {
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });

  it("validates earn points requires customerId and points", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.loyalty.earnPoints({ customerId: 0, points: 0 } as any)
    ).rejects.toThrow();
  });
});

// ─── Order Router Input Validation ────────────────────────────────────────────

describe("order router", () => {
  it("validates order creation requires orderNumber and channel", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.order.create({ orderNumber: "", channel: "" as any })
    ).rejects.toThrow();
  });

  it("accepts valid order creation input", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.order.create({
        storeId: 1,
        channel: "pos",
        subtotal: "85.00",
        totalAmount: "100.00",
        taxAmount: "15.00",
        items: [{ productId: 1, productName: "Test", quantity: 1, unitPrice: "85.00", totalPrice: "85.00" }],
        payments: [{ method: "cash", amount: "100.00" }],
      });
    } catch (e: any) {
      // Should fail at DB level, not validation
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });
});

// ─── Store Router Input Validation ────────────────────────────────────────────

describe("store router", () => {
  it("validates store creation requires name and code", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.store.create({ name: "", code: "" })
    ).rejects.toThrow();
  });

  it("accepts valid store creation input", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.store.create({
        name: "Main Store",
        code: "STR-01",
        address: "Port Louis, Mauritius",
      });
    } catch (e: any) {
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });
});

// ─── Device Router Input Validation ───────────────────────────────────────────

describe("device router", () => {
  it("validates device registration requires deviceName, deviceType, storeId", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.device.register({ deviceName: "", deviceType: "" as any, storeId: 0 })
    ).rejects.toThrow();
  });
});

// ─── WhatsApp Router Input Validation ─────────────────────────────────────────

describe("whatsapp router", () => {
  it("validates template creation requires name, category, bodyTemplate", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.whatsapp.createTemplate({ name: "", category: "" as any, bodyTemplate: "" })
    ).rejects.toThrow();
  });

  it("validates send message requires phone", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.whatsapp.sendMessage({ phone: "" })
    ).rejects.toThrow();
  });
});

// ─── Staff Router Input Validation ────────────────────────────────────────────

describe("staff router", () => {
  it("validates task creation requires title", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.staff.createTask({ title: "" })
    ).rejects.toThrow();
  });

  it("accepts valid task creation input", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.staff.createTask({
        title: "Restock shelves",
        description: "Aisle 3 needs restocking",
        priority: "high",
      });
    } catch (e: any) {
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });
});
