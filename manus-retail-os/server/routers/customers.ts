import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import * as db from "../db";

export const customerRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().optional(), offset: z.number().optional(), search: z.string().optional() }).optional())
    .query(({ input }) => db.listCustomers(input ?? {})),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => db.getCustomerById(input.id)),

  create: protectedProcedure
    .input(z.object({
      firstName: z.string().min(1), lastName: z.string().optional(), email: z.string().optional(),
      phone: z.string().optional(), whatsappPhone: z.string().optional(), dateOfBirth: z.date().optional(),
      gender: z.enum(["male", "female", "other", "unspecified"]).optional(), notes: z.string().optional(),
      tags: z.any().optional(), preferredStoreId: z.number().optional(), whatsappOptIn: z.boolean().optional(),
    }))
    .mutation(({ input }) => db.createCustomer(input)),

  update: protectedProcedure
    .input(z.object({
      id: z.number(), firstName: z.string().optional(), lastName: z.string().nullable().optional(),
      email: z.string().nullable().optional(), phone: z.string().nullable().optional(),
      whatsappPhone: z.string().nullable().optional(), notes: z.string().nullable().optional(),
      tags: z.any().optional(), whatsappOptIn: z.boolean().optional(),
    }))
    .mutation(({ input: { id, ...data } }) => db.updateCustomer(id, data)),

  getAddresses: protectedProcedure
    .input(z.object({ customerId: z.number() }))
    .query(({ input }) => db.getCustomerAddresses(input.customerId)),

  getOrderHistory: protectedProcedure
    .input(z.object({ customerId: z.number(), limit: z.number().optional() }))
    .query(({ input }) => db.listOrders({ customerId: input.customerId, limit: input.limit })),

  getWhatsappHistory: protectedProcedure
    .input(z.object({ customerId: z.number(), limit: z.number().optional() }))
    .query(({ input }) => db.listWhatsappMessages({ customerId: input.customerId, limit: input.limit })),
});

export const loyaltyRouter = router({
  // ─── Tiers ──────────────────────────────────────────────
  listTiers: protectedProcedure.query(() => db.listLoyaltyTiers()),

  createTier: adminProcedure
    .input(z.object({ name: z.string().min(1), minPoints: z.number(), multiplier: z.string().optional(), benefits: z.any().optional(), color: z.string().optional(), sortOrder: z.number().optional() }))
    .mutation(({ input }) => db.createLoyaltyTier(input)),

  // ─── Accounts ───────────────────────────────────────────
  getAccount: protectedProcedure
    .input(z.object({ customerId: z.number() }))
    .query(({ input }) => db.getLoyaltyAccount(input.customerId)),

  createAccount: protectedProcedure
    .input(z.object({ customerId: z.number(), tierId: z.number().optional() }))
    .mutation(({ input }) => db.createLoyaltyAccount(input)),

  // ─── Transactions ──────────────────────────────────────
  earnPoints: protectedProcedure
    .input(z.object({ accountId: z.number(), customerId: z.number(), points: z.number(), orderId: z.number().optional(), description: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const account = await db.getLoyaltyAccount(input.customerId);
      if (!account) throw new Error("Loyalty account not found");
      const balanceAfter = account.pointsBalance + input.points;
      return db.addLoyaltyTransaction({ ...input, type: 'earn', balanceAfter, performedBy: ctx.user.id });
    }),

  redeemPoints: protectedProcedure
    .input(z.object({ accountId: z.number(), customerId: z.number(), points: z.number(), orderId: z.number().optional(), description: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const account = await db.getLoyaltyAccount(input.customerId);
      if (!account) throw new Error("Loyalty account not found");
      if (account.pointsBalance < input.points) throw new Error("Insufficient points");
      const balanceAfter = account.pointsBalance - input.points;
      return db.addLoyaltyTransaction({ ...input, type: 'redeem', points: -input.points, balanceAfter, performedBy: ctx.user.id });
    }),

  listTransactions: protectedProcedure
    .input(z.object({ customerId: z.number(), limit: z.number().optional() }))
    .query(({ input }) => db.listLoyaltyTransactions(input.customerId, input.limit)),

  // ─── Milestones ─────────────────────────────────────────
  listMilestones: protectedProcedure.query(() => db.listLoyaltyMilestones()),

  createMilestone: adminProcedure
    .input(z.object({
      name: z.string().min(1), triggerType: z.enum(["points_earned", "orders_count", "total_spent", "tier_upgrade"]),
      triggerValue: z.number(), rewardType: z.enum(["bonus_points", "voucher", "notification"]),
      rewardValue: z.string().optional(), whatsappTemplate: z.string().optional(),
    }))
    .mutation(({ input }) => db.createLoyaltyMilestone(input)),
});
