/**
 * Fraud detection rules engine.
 * Each rule queries audit_event / orders / tills for a given account+period,
 * computes a metric, and returns a signal if the threshold is exceeded.
 */

interface FraudSignal {
  account_id: string;
  store_id?: number;
  user_id?: number;
  terminal_id?: number;
  signal_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  metric_value: number;
  threshold: number;
  period_start: string;
  period_end: string;
}

interface DetectionContext {
  db: any; // Supabase client
  accountId: string;
  periodStart: string; // ISO datetime
  periodEnd: string;
}

// ── Rule 1: High Void Rate ──────────────────────────────────────

async function detectHighVoidRate(ctx: DetectionContext): Promise<FraudSignal[]> {
  const threshold = 0.05; // 5%
  const { data: orders } = await ctx.db
    .from("orders")
    .select("order_id, doc_status, store_id")
    .eq("account_id", ctx.accountId)
    .gte("date_ordered", ctx.periodStart)
    .lte("date_ordered", ctx.periodEnd);

  if (!orders || orders.length < 10) return []; // Need minimum sample

  // Group by store — void orders have doc_status = 'VO'
  const byStore: Record<number, { total: number; voids: number }> = {};
  for (const o of orders) {
    const sid = o.store_id || 0;
    if (!byStore[sid]) byStore[sid] = { total: 0, voids: 0 };
    byStore[sid].total++;
    if (o.doc_status === "VO") byStore[sid].voids++;
  }

  const signals: FraudSignal[] = [];
  for (const [storeId, counts] of Object.entries(byStore)) {
    if (counts.total < 5) continue;
    const rate = counts.voids / counts.total;
    if (rate > threshold) {
      signals.push({
        account_id: ctx.accountId,
        store_id: parseInt(storeId),
        signal_type: "high_void_rate",
        severity: rate > 0.15 ? "critical" : "warning",
        title: `High void rate: ${(rate * 100).toFixed(1)}%`,
        detail: `${counts.voids} voided out of ${counts.total} orders in store ${storeId}`,
        metric_value: Math.round(rate * 1000) / 10,
        threshold: threshold * 100,
        period_start: ctx.periodStart,
        period_end: ctx.periodEnd,
      });
    }
  }
  return signals;
}

// ── Rule 2: Cash Shortage ───────────────────────────────────────

async function detectCashShortage(ctx: DetectionContext): Promise<FraudSignal[]> {
  const threshold = 0.03; // 3%
  const { data: tills } = await ctx.db
    .from("till")
    .select("till_id, store_id, cash_amt, closing_amt, opening_amt, status")
    .eq("account_id", ctx.accountId)
    .eq("status", "closed")
    .gte("date_closed", ctx.periodStart)
    .lte("date_closed", ctx.periodEnd);

  if (!tills || tills.length === 0) return [];

  const signals: FraudSignal[] = [];
  for (const till of tills) {
    const expected = (till.cash_amt || 0) + (till.opening_amt || 0);
    if (expected <= 0) continue;
    const actual = till.closing_amt || 0;
    const shortage = expected - actual;
    const rate = shortage / expected;
    if (rate > threshold && shortage > 10) {
      signals.push({
        account_id: ctx.accountId,
        store_id: till.store_id,
        signal_type: "cash_shortage",
        severity: rate > 0.1 ? "critical" : "warning",
        title: `Cash shortage: ${shortage.toFixed(2)} (${(rate * 100).toFixed(1)}%)`,
        detail: `Till ${till.till_id}: expected ${expected.toFixed(2)}, counted ${actual.toFixed(2)}`,
        metric_value: Math.round(rate * 1000) / 10,
        threshold: threshold * 100,
        period_start: ctx.periodStart,
        period_end: ctx.periodEnd,
      });
    }
  }
  return signals;
}

// ── Rule 3: Excessive Refunds ───────────────────────────────────

async function detectExcessiveRefunds(ctx: DetectionContext): Promise<FraudSignal[]> {
  const threshold = 0.10; // 10%
  const { data: events } = await ctx.db
    .from("audit_event")
    .select("user_id, user_name, action")
    .eq("account_id", ctx.accountId)
    .in("action", ["order.refund", "order.create"])
    .gte("created_at", ctx.periodStart)
    .lte("created_at", ctx.periodEnd);

  if (!events || events.length < 5) return [];

  const byUser: Record<number, { name: string; refunds: number; orders: number }> = {};
  for (const e of events) {
    if (!byUser[e.user_id]) byUser[e.user_id] = { name: e.user_name || `User ${e.user_id}`, refunds: 0, orders: 0 };
    if (e.action === "order.refund") byUser[e.user_id].refunds++;
    if (e.action === "order.create") byUser[e.user_id].orders++;
  }

  const signals: FraudSignal[] = [];
  for (const [userId, data] of Object.entries(byUser)) {
    if (data.orders < 3) continue;
    const rate = data.refunds / data.orders;
    if (rate > threshold) {
      signals.push({
        account_id: ctx.accountId,
        user_id: parseInt(userId),
        signal_type: "excessive_refunds",
        severity: rate > 0.25 ? "critical" : "warning",
        title: `Excessive refunds by ${data.name}: ${(rate * 100).toFixed(1)}%`,
        detail: `${data.refunds} refunds out of ${data.orders} orders`,
        metric_value: Math.round(rate * 1000) / 10,
        threshold: threshold * 100,
        period_start: ctx.periodStart,
        period_end: ctx.periodEnd,
      });
    }
  }
  return signals;
}

// ── Rule 4: Discount Outlier ────────────────────────────────────

async function detectDiscountOutlier(ctx: DetectionContext): Promise<FraudSignal[]> {
  const multiplierThreshold = 2.0;
  const { data: events } = await ctx.db
    .from("audit_event")
    .select("user_id, user_name, amount, store_id")
    .eq("account_id", ctx.accountId)
    .eq("action", "discount.apply")
    .gte("created_at", ctx.periodStart)
    .lte("created_at", ctx.periodEnd);

  if (!events || events.length < 5) return [];

  // Compute per-store averages and per-user-per-store breakdowns
  const storeDiscounts: Record<number, number[]> = {};
  // Track per-user-per-store so we compare user's average at EACH store they worked
  const userStoreDiscounts: Record<string, { userId: number; name: string; amounts: number[]; store_id: number }> = {};

  for (const e of events) {
    const sid = e.store_id || 0;
    const amt = Math.abs(e.amount || 0);
    if (!storeDiscounts[sid]) storeDiscounts[sid] = [];
    storeDiscounts[sid].push(amt);
    const key = `${e.user_id}_${sid}`;
    if (!userStoreDiscounts[key]) userStoreDiscounts[key] = { userId: e.user_id, name: e.user_name || `User ${e.user_id}`, amounts: [], store_id: sid };
    userStoreDiscounts[key].amounts.push(amt);
  }

  const signals: FraudSignal[] = [];
  for (const [, data] of Object.entries(userStoreDiscounts)) {
    if (data.amounts.length < 3) continue;
    const userAvg = data.amounts.reduce((s, v) => s + v, 0) / data.amounts.length;
    const storeAmounts = storeDiscounts[data.store_id] || [];
    const storeAvg = storeAmounts.length > 0 ? storeAmounts.reduce((s, v) => s + v, 0) / storeAmounts.length : 0;
    if (storeAvg <= 0) continue;
    const ratio = userAvg / storeAvg;
    if (ratio > multiplierThreshold) {
      signals.push({
        account_id: ctx.accountId,
        user_id: data.userId,
        store_id: data.store_id,
        signal_type: "discount_outlier",
        severity: ratio > 3 ? "critical" : "warning",
        title: `Discount outlier: ${data.name} (${ratio.toFixed(1)}x store avg)`,
        detail: `User avg: ${userAvg.toFixed(2)}, Store avg: ${storeAvg.toFixed(2)}`,
        metric_value: Math.round(ratio * 10) / 10,
        threshold: multiplierThreshold,
        period_start: ctx.periodStart,
        period_end: ctx.periodEnd,
      });
    }
  }
  return signals;
}

// ── Rule 5: Price Override Pattern ──────────────────────────────

async function detectPriceOverridePattern(ctx: DetectionContext): Promise<FraudSignal[]> {
  const threshold = 10;
  const { data: events } = await ctx.db
    .from("audit_event")
    .select("user_id, user_name")
    .eq("account_id", ctx.accountId)
    .eq("action", "price.override")
    .gte("created_at", ctx.periodStart)
    .lte("created_at", ctx.periodEnd);

  if (!events || events.length === 0) return [];

  const byUser: Record<number, { name: string; count: number }> = {};
  for (const e of events) {
    if (!byUser[e.user_id]) byUser[e.user_id] = { name: e.user_name || `User ${e.user_id}`, count: 0 };
    byUser[e.user_id].count++;
  }

  // Calculate period in days for per-day normalization
  const days = Math.max(1, (new Date(ctx.periodEnd).getTime() - new Date(ctx.periodStart).getTime()) / 86400000);

  const signals: FraudSignal[] = [];
  for (const [userId, data] of Object.entries(byUser)) {
    const perDay = data.count / days;
    if (perDay > threshold) {
      signals.push({
        account_id: ctx.accountId,
        user_id: parseInt(userId),
        signal_type: "price_override_pattern",
        severity: perDay > 20 ? "critical" : "warning",
        title: `Excessive price overrides: ${data.name} (${data.count} in ${Math.round(days)}d)`,
        detail: `${perDay.toFixed(1)} overrides/day, threshold ${threshold}/day`,
        metric_value: Math.round(perDay * 10) / 10,
        threshold,
        period_start: ctx.periodStart,
        period_end: ctx.periodEnd,
      });
    }
  }
  return signals;
}

// ── Rule 6: No-Sale Drawer Opens ────────────────────────────────

async function detectDrawerNoSale(ctx: DetectionContext): Promise<FraudSignal[]> {
  const threshold = 3;
  const { data: events } = await ctx.db
    .from("audit_event")
    .select("user_id, user_name, terminal_id")
    .eq("account_id", ctx.accountId)
    .eq("action", "drawer.open")
    .gte("created_at", ctx.periodStart)
    .lte("created_at", ctx.periodEnd);

  if (!events || events.length === 0) return [];

  const days = Math.max(1, (new Date(ctx.periodEnd).getTime() - new Date(ctx.periodStart).getTime()) / 86400000);
  const byUser: Record<number, { name: string; count: number }> = {};
  for (const e of events) {
    if (!byUser[e.user_id]) byUser[e.user_id] = { name: e.user_name || `User ${e.user_id}`, count: 0 };
    byUser[e.user_id].count++;
  }

  const signals: FraudSignal[] = [];
  for (const [userId, data] of Object.entries(byUser)) {
    const perDay = data.count / days;
    if (perDay > threshold) {
      signals.push({
        account_id: ctx.accountId,
        user_id: parseInt(userId),
        signal_type: "drawer_no_sale",
        severity: perDay > 8 ? "critical" : "warning",
        title: `Frequent no-sale drawer opens: ${data.name}`,
        detail: `${data.count} opens in ${Math.round(days)}d (${perDay.toFixed(1)}/day)`,
        metric_value: Math.round(perDay * 10) / 10,
        threshold,
        period_start: ctx.periodStart,
        period_end: ctx.periodEnd,
      });
    }
  }
  return signals;
}

// ── Rule 7: PIN Brute Force ─────────────────────────────────────

async function detectPinBruteForce(ctx: DetectionContext): Promise<FraudSignal[]> {
  const threshold = 10;
  const { data: events } = await ctx.db
    .from("audit_event")
    .select("terminal_id, store_id")
    .eq("account_id", ctx.accountId)
    .in("action", ["pin.failed", "pin.lockout", "supervisor.pin_fail"])
    .gte("created_at", ctx.periodStart)
    .lte("created_at", ctx.periodEnd);

  if (!events || events.length === 0) return [];

  const byTerminal: Record<number, { store_id: number; count: number }> = {};
  for (const e of events) {
    const tid = e.terminal_id || 0;
    if (!byTerminal[tid]) byTerminal[tid] = { store_id: e.store_id || 0, count: 0 };
    byTerminal[tid].count++;
  }

  const days = Math.max(1, (new Date(ctx.periodEnd).getTime() - new Date(ctx.periodStart).getTime()) / 86400000);
  const signals: FraudSignal[] = [];
  for (const [terminalId, data] of Object.entries(byTerminal)) {
    const perDay = data.count / days;
    if (perDay > threshold) {
      signals.push({
        account_id: ctx.accountId,
        terminal_id: parseInt(terminalId),
        store_id: data.store_id,
        signal_type: "pin_brute_force",
        severity: "critical",
        title: `PIN brute force on terminal ${terminalId}`,
        detail: `${data.count} failed PIN attempts in ${Math.round(days)}d (${perDay.toFixed(1)}/day)`,
        metric_value: Math.round(perDay * 10) / 10,
        threshold,
        period_start: ctx.periodStart,
        period_end: ctx.periodEnd,
      });
    }
  }
  return signals;
}

// ── Run All Rules ───────────────────────────────────────────────

export async function runFraudDetection(db: any, accountId: string, periodStart: string, periodEnd: string): Promise<FraudSignal[]> {
  const ctx: DetectionContext = { db, accountId, periodStart, periodEnd };

  const results = await Promise.allSettled([
    detectHighVoidRate(ctx),
    detectCashShortage(ctx),
    detectExcessiveRefunds(ctx),
    detectDiscountOutlier(ctx),
    detectPriceOverridePattern(ctx),
    detectDrawerNoSale(ctx),
    detectPinBruteForce(ctx),
  ]);

  const signals: FraudSignal[] = [];
  const errors: string[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      signals.push(...result.value);
    } else {
      errors.push(result.reason?.message || String(result.reason));
    }
  }
  if (errors.length > 0) {
    console.warn(`Fraud detection: ${errors.length} rule(s) failed:`, errors.join("; "));
  }
  return signals;
}
