import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import * as db from "../db";
import { nanoid } from "nanoid";

export const deviceRouter = router({
  list: protectedProcedure
    .input(z.object({ storeId: z.number().optional() }).optional())
    .query(({ input }) => db.listDevices(input?.storeId)),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => db.getDeviceById(input.id)),

  register: adminProcedure
    .input(z.object({
      name: z.string().min(1), deviceType: z.enum(["pos", "staff_mobile", "desktop", "kiosk", "kitchen_display"]),
      storeId: z.number(), assignedUserId: z.number().optional(), hardwareId: z.string().optional(), osInfo: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const provisioningCode = nanoid(12).toUpperCase();
      return db.createDevice({ ...input, provisioningCode, status: 'inactive' });
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(), name: z.string().optional(), deviceType: z.enum(["pos", "staff_mobile", "desktop", "kiosk", "kitchen_display"]).optional(),
      storeId: z.number().optional(), assignedUserId: z.number().nullable().optional(),
      status: z.enum(["active", "inactive", "revoked", "ghost"]).optional(),
    }))
    .mutation(({ input: { id, ...data } }) => db.updateDevice(id, data)),

  revoke: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.updateDevice(input.id, { status: 'revoked' })),

  generateProvisioningCode: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const code = nanoid(12).toUpperCase();
      await db.updateDevice(input.id, { provisioningCode: code, status: 'inactive' });
      return { code };
    }),
});
