import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { inventoryRouter } from "./routers/inventory";
import { customerRouter, loyaltyRouter } from "./routers/customers";
import { orderRouter } from "./routers/orders";
import { deviceRouter } from "./routers/devices";
import { staffRouter } from "./routers/staff";
import { whatsappRouter } from "./routers/whatsapp";
import { analyticsRouter, storeRouter } from "./routers/analytics";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Feature routers
  inventory: inventoryRouter,
  customer: customerRouter,
  loyalty: loyaltyRouter,
  order: orderRouter,
  device: deviceRouter,
  staff: staffRouter,
  whatsapp: whatsappRouter,
  analytics: analyticsRouter,
  store: storeRouter,
});

export type AppRouter = typeof appRouter;
