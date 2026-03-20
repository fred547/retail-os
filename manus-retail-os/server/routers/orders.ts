import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { nanoid } from "nanoid";

export const orderRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().optional(), offset: z.number().optional(), storeId: z.number().optional(), customerId: z.number().optional(), status: z.string().optional(), channel: z.string().optional() }).optional())
    .query(({ input }) => db.listOrders(input ?? {})),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const order = await db.getOrderById(input.id);
      if (!order) return null;
      const items = await db.getOrderItems(input.id);
      const pmts = await db.getOrderPayments(input.id);
      return { ...order, items, payments: pmts };
    }),

  create: protectedProcedure
    .input(z.object({
      storeId: z.number(), customerId: z.number().optional(), deviceId: z.number().optional(), tillSessionId: z.number().optional(),
      channel: z.enum(["pos", "online", "whatsapp", "phone"]).optional(),
      subtotal: z.string(), taxAmount: z.string().optional(), discountAmount: z.string().optional(), totalAmount: z.string(),
      loyaltyPointsEarned: z.number().optional(), loyaltyPointsRedeemed: z.number().optional(), notes: z.string().optional(),
      offlineSyncId: z.string().optional(),
      items: z.array(z.object({
        productId: z.number(), productName: z.string(), sku: z.string().optional(), quantity: z.number(),
        unitPrice: z.string(), discountAmount: z.string().optional(), taxAmount: z.string().optional(), totalPrice: z.string(),
      })),
      payments: z.array(z.object({
        method: z.enum(["cash", "card", "qr", "mobile_money", "voucher", "loyalty_points", "split"]),
        amount: z.string(), reference: z.string().optional(),
      })),
    }))
    .mutation(({ input, ctx }) => {
      const { items, payments: pmts, ...orderData } = input;
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${nanoid(4).toUpperCase()}`;
      return db.createOrder(
        { ...orderData, orderNumber, userId: ctx.user.id, status: 'completed' } as any,
        items as any[],
        pmts as any[],
      );
    }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(["pending", "completed", "refunded", "partially_refunded", "cancelled", "on_hold"]) }))
    .mutation(({ input }) => db.updateOrderStatus(input.id, input.status)),

  // ─── Till Sessions ──────────────────────────────────────
  listTillSessions: protectedProcedure
    .input(z.object({ storeId: z.number().optional(), status: z.string().optional(), limit: z.number().optional() }).optional())
    .query(({ input }) => db.listTillSessions(input ?? {})),

  openTill: protectedProcedure
    .input(z.object({ deviceId: z.number(), storeId: z.number(), openingBalance: z.string() }))
    .mutation(({ input, ctx }) => db.openTillSession({ ...input, userId: ctx.user.id } as any)),

  closeTill: protectedProcedure
    .input(z.object({ id: z.number(), closingBalance: z.string(), expectedBalance: z.string(), discrepancy: z.string(), discrepancyNote: z.string().optional() }))
    .mutation(({ input: { id, ...data } }) => db.closeTillSession(id, data)),
});
