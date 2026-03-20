import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import * as db from "../db";

export const whatsappRouter = router({
  // ─── Templates ──────────────────────────────────────────
  listTemplates: protectedProcedure.query(() => db.listWhatsappTemplates()),

  createTemplate: adminProcedure
    .input(z.object({
      name: z.string().min(1), category: z.enum(["receipt", "loyalty", "promotion", "support", "booking", "general"]),
      bodyTemplate: z.string().min(1), variables: z.any().optional(),
    }))
    .mutation(({ input }) => db.createWhatsappTemplate(input)),

  // ─── Messages ───────────────────────────────────────────
  listMessages: protectedProcedure
    .input(z.object({ customerId: z.number().optional(), phone: z.string().optional(), limit: z.number().optional() }).optional())
    .query(({ input }) => db.listWhatsappMessages(input ?? {})),

  sendMessage: protectedProcedure
    .input(z.object({
      customerId: z.number().optional(), phone: z.string().min(1), templateId: z.number().optional(),
      messageType: z.enum(["text", "template", "media", "interactive"]).optional(),
      content: z.string().optional(), mediaUrl: z.string().optional(), metadata: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      // Log the outbound message (actual WhatsApp API integration would go here)
      return db.logWhatsappMessage({ ...input, direction: 'outbound', status: 'queued' });
    }),

  // Webhook endpoint for receiving messages would be a REST route, not tRPC
  logInbound: protectedProcedure
    .input(z.object({
      customerId: z.number().optional(), phone: z.string().min(1),
      messageType: z.enum(["text", "template", "media", "interactive"]).optional(),
      content: z.string().optional(), mediaUrl: z.string().optional(),
      externalMessageId: z.string().optional(), metadata: z.any().optional(),
    }))
    .mutation(({ input }) => db.logWhatsappMessage({ ...input, direction: 'inbound', status: 'delivered' })),
});
