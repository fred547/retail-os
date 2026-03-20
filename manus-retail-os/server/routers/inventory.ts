import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import * as db from "../db";

export const inventoryRouter = router({
  // ─── Categories ─────────────────────────────────────────
  listCategories: protectedProcedure.query(() => db.listCategories()),

  createCategory: adminProcedure
    .input(z.object({ name: z.string().min(1), parentId: z.number().optional(), imageUrl: z.string().optional(), sortOrder: z.number().optional() }))
    .mutation(({ input }) => db.createCategory(input)),

  updateCategory: adminProcedure
    .input(z.object({ id: z.number(), name: z.string().optional(), parentId: z.number().nullable().optional(), imageUrl: z.string().nullable().optional(), sortOrder: z.number().optional(), isActive: z.boolean().optional() }))
    .mutation(({ input: { id, ...data } }) => db.updateCategory(id, data)),

  deleteCategory: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deleteCategory(input.id)),

  // ─── Products ───────────────────────────────────────────
  listProducts: protectedProcedure
    .input(z.object({ limit: z.number().optional(), offset: z.number().optional(), categoryId: z.number().optional(), search: z.string().optional(), activeOnly: z.boolean().optional() }).optional())
    .query(({ input }) => db.listProducts(input ?? {})),

  getProduct: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => db.getProductById(input.id)),

  createProduct: adminProcedure
    .input(z.object({
      sku: z.string().min(1), barcode: z.string().optional(), name: z.string().min(1), description: z.string().optional(),
      categoryId: z.number().optional(), price: z.string(), costPrice: z.string().optional(), taxRate: z.string().optional(),
      unit: z.string().optional(), imageUrl: z.string().optional(), isRecurring: z.boolean().optional(), loyaltyPointsEarn: z.number().optional(),
    }))
    .mutation(({ input }) => db.createProduct(input)),

  updateProduct: adminProcedure
    .input(z.object({
      id: z.number(), sku: z.string().optional(), barcode: z.string().nullable().optional(), name: z.string().optional(),
      description: z.string().nullable().optional(), categoryId: z.number().nullable().optional(), price: z.string().optional(),
      costPrice: z.string().nullable().optional(), taxRate: z.string().optional(), unit: z.string().optional(),
      imageUrl: z.string().nullable().optional(), isActive: z.boolean().optional(), isRecurring: z.boolean().optional(), loyaltyPointsEarn: z.number().optional(),
    }))
    .mutation(({ input: { id, ...data } }) => db.updateProduct(id, data)),

  // ─── Warehouses ─────────────────────────────────────────
  listWarehouses: protectedProcedure.query(() => db.listWarehouses()),

  createWarehouse: adminProcedure
    .input(z.object({ name: z.string().min(1), storeId: z.number().optional(), address: z.string().optional(), isDefault: z.boolean().optional() }))
    .mutation(({ input }) => db.createWarehouse(input)),

  // ─── Stock Levels ───────────────────────────────────────
  listInventoryLevels: protectedProcedure
    .input(z.object({ warehouseId: z.number().optional(), lowStockOnly: z.boolean().optional() }).optional())
    .query(({ input }) => db.listInventoryLevels(input ?? {})),

  adjustStock: protectedProcedure
    .input(z.object({
      productId: z.number(), warehouseId: z.number(),
      adjustmentType: z.enum(["received", "sold", "returned", "damaged", "counted", "transferred", "write_off"]),
      quantity: z.number(), previousQuantity: z.number(), newQuantity: z.number(), reason: z.string().optional(),
    }))
    .mutation(({ input, ctx }) => db.adjustStock({ ...input, performedBy: ctx.user.id })),

  listStockAdjustments: protectedProcedure
    .input(z.object({ productId: z.number().optional(), limit: z.number().optional() }).optional())
    .query(({ input }) => db.listStockAdjustments(input?.productId, input?.limit)),
});
