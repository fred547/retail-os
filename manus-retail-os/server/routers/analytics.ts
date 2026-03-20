import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import * as db from "../db";

export const analyticsRouter = router({
  dashboard: protectedProcedure
    .input(z.object({ storeId: z.number().optional(), startDate: z.date().optional(), endDate: z.date().optional() }).optional())
    .query(async ({ input }) => {
      const [sales, customerCount, productCount, lowStockCount, recentOrders, topProducts] = await Promise.all([
        db.getSalesAnalytics(input ?? {}),
        db.getCustomerCount(),
        db.getProductCount(),
        db.getLowStockCount(),
        db.getRecentOrders(5),
        db.getTopProducts(5),
      ]);
      return { sales, customerCount, productCount, lowStockCount, recentOrders, topProducts };
    }),

  salesAnalytics: protectedProcedure
    .input(z.object({ storeId: z.number().optional(), startDate: z.date().optional(), endDate: z.date().optional() }).optional())
    .query(({ input }) => db.getSalesAnalytics(input ?? {})),

  topProducts: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(({ input }) => db.getTopProducts(input?.limit)),
});

export const storeRouter = router({
  list: protectedProcedure.query(() => db.listStores()),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => db.getStoreById(input.id)),

  create: adminProcedure
    .input(z.object({ name: z.string().min(1), code: z.string().min(1), address: z.string().optional(), phone: z.string().optional(), email: z.string().optional(), timezone: z.string().optional(), currency: z.string().optional() }))
    .mutation(({ input }) => db.createStore(input)),

  update: adminProcedure
    .input(z.object({ id: z.number(), name: z.string().optional(), address: z.string().optional(), phone: z.string().optional(), email: z.string().optional(), timezone: z.string().optional(), currency: z.string().optional(), isActive: z.boolean().optional() }))
    .mutation(({ input: { id, ...data } }) => db.updateStore(id, data)),
});
