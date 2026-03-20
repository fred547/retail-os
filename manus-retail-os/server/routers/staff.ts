import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import * as db from "../db";

export const staffRouter = router({
  list: protectedProcedure.query(() => db.listStaffWithProfiles()),

  getProfile: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => db.getStaffProfile(input.userId)),

  upsertProfile: adminProcedure
    .input(z.object({
      userId: z.number(), employeeCode: z.string().optional(), department: z.string().optional(),
      position: z.string().optional(), hireDate: z.date().optional(), emergencyContact: z.string().optional(),
      emergencyPhone: z.string().optional(), bankAccountNumber: z.string().optional(),
      skills: z.any().optional(), hobbies: z.string().optional(), bio: z.string().optional(),
    }))
    .mutation(({ input }) => db.upsertStaffProfile(input)),

  // ─── Shifts ─────────────────────────────────────────────
  listShifts: protectedProcedure
    .input(z.object({ userId: z.number().optional(), storeId: z.number().optional(), limit: z.number().optional() }).optional())
    .query(({ input }) => db.listShifts(input ?? {})),

  createShift: adminProcedure
    .input(z.object({ userId: z.number(), storeId: z.number(), shiftDate: z.date(), startTime: z.string(), endTime: z.string(), notes: z.string().optional() }))
    .mutation(({ input }) => db.createShift(input)),

  // ─── Tasks ──────────────────────────────────────────────
  listTasks: protectedProcedure
    .input(z.object({ assignedTo: z.number().optional(), storeId: z.number().optional(), status: z.string().optional(), limit: z.number().optional() }).optional())
    .query(({ input }) => db.listTasks(input ?? {})),

  createTask: protectedProcedure
    .input(z.object({ title: z.string().min(1), description: z.string().optional(), assignedTo: z.number().optional(), storeId: z.number().optional(), priority: z.enum(["low", "medium", "high", "urgent"]).optional(), dueDate: z.date().optional() }))
    .mutation(({ input, ctx }) => db.createTask({ ...input, assignedBy: ctx.user.id })),

  updateTask: protectedProcedure
    .input(z.object({ id: z.number(), title: z.string().optional(), description: z.string().optional(), assignedTo: z.number().nullable().optional(), priority: z.enum(["low", "medium", "high", "urgent"]).optional(), status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(), completedAt: z.date().nullable().optional() }))
    .mutation(({ input: { id, ...data } }) => db.updateTask(id, data)),
});
