"use client";

import { useEffect, useState, useCallback } from "react";
import Script from "next/script";
import {
  CreditCard, Check, ArrowUp, ArrowDown, Users, Monitor, Store,
  RefreshCw, ExternalLink, AlertCircle, Crown, Zap, Rocket, Building2,
  XCircle,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { logError } from "@/lib/error-logger";

declare global {
  interface Window {
    Paddle?: any;
  }
}

interface BillingStatus {
  plan: string;
  billing_region: string;
  subscription_status: string;
  current_period_end: string | null;
  paddle_customer_id: string | null;
  paddle_subscription_id: string | null;
  usage: { users: number; terminals: number; stores: number };
  limits: { users: number; terminals: number };
  events: Array<{ id: number; event_type: string; paddle_event_id: string; created_at: string }>;
}

const PLAN_ORDER = ["free", "starter", "growth", "business"];

const PLAN_CARDS = [
  {
    key: "free",
    name: "Free",
    icon: Zap,
    color: "bg-gray-100 text-gray-600",
    borderColor: "border-gray-200",
    description: "Solo operator starter",
    highlights: [
      "1 user, 1 terminal",
      "Unlimited products, orders, customers",
      "Basic inventory & loyalty",
      "Kitchen printing, modifiers, CSV export",
      "Offline mode, receipt & barcode",
      "7-day history",
      "\"Powered by Posterita\" on receipts",
    ],
  },
  {
    key: "starter",
    name: "Starter",
    icon: Rocket,
    color: "bg-blue-100 text-blue-600",
    borderColor: "border-blue-200",
    description: "For small teams",
    highlights: ["3 users per store", "2 terminals per store", "Customer management", "Full inventory", "Shifts & modifiers"],
  },
  {
    key: "growth",
    name: "Growth",
    icon: Crown,
    color: "bg-purple-100 text-purple-700",
    borderColor: "border-purple-200",
    description: "For growing businesses",
    highlights: ["8 users per store", "5 terminals per store", "Restaurant & KDS", "Promotions & loyalty", "AI import & suppliers"],
  },
  {
    key: "business",
    name: "Business",
    icon: Building2,
    color: "bg-amber-100 text-amber-700",
    borderColor: "border-amber-200",
    description: "For larger operations",
    highlights: ["20 users per store", "15 terminals per store", "Serialized inventory", "Warehouse management", "Xero & webhooks"],
  },
];

const REGION_PRICES: Record<string, Record<string, number>> = {
  developing: { free: 0, starter: 7, growth: 19, business: 39 },
  emerging:   { free: 0, starter: 12, growth: 29, business: 59 },
  developed:  { free: 0, starter: 19, growth: 49, business: 99 },
};

const REGION_LABELS: Record<string, string> = {
  developing: "Developing",
  emerging: "Emerging",
  developed: "Developed",
};

const STATUS_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  none:      { label: "No subscription", bg: "bg-gray-100", text: "text-gray-600" },
  trialing:  { label: "Trial",          bg: "bg-blue-100",  text: "text-blue-700" },
  active:    { label: "Active",         bg: "bg-green-100", text: "text-green-700" },
  past_due:  { label: "Past Due",       bg: "bg-red-100",   text: "text-red-700" },
  paused:    { label: "Paused",         bg: "bg-amber-100", text: "text-amber-700" },
  canceled:  { label: "Canceled",       bg: "bg-gray-100",  text: "text-gray-600" },
};

export default function BillingPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [paddleReady, setPaddleReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const paddleEnv = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT ?? "sandbox";
  const paddleToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? "";

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/status");
      if (!res.ok) throw new Error("Failed to load billing status");
      const data = await res.json();
      setStatus(data);
    } catch (e: any) {
      logError("Billing", `Failed to load status: ${e.message}`);
      setError("Failed to load billing information");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const initPaddle = () => {
    if (window.Paddle && paddleToken) {
      window.Paddle.Initialize({
        token: paddleToken,
        environment: paddleEnv === "production" ? undefined : "sandbox",
      });
      setPaddleReady(true);
    }
  };

  const handleCheckout = async (plan: string) => {
    if (!status) return;
    setError(null);
    setSuccess(null);
    setActionLoading(plan);

    try {
      // If already subscribed, use change-plan
      if (status.paddle_subscription_id && status.subscription_status === "active") {
        const res = await fetch("/api/billing/change-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ new_plan: plan }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to change plan");
        setSuccess(`Plan ${data.effective === "immediately" ? "upgraded" : "change scheduled"} successfully`);
        loadStatus();
        return;
      }

      // New subscription — create checkout
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billing_region: status.billing_region }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create checkout");

      if (data.transaction_id && paddleReady && window.Paddle) {
        window.Paddle.Checkout.open({
          transactionId: data.transaction_id,
          settings: {
            displayMode: "overlay",
            theme: "light",
            successUrl: `${window.location.origin}/billing?success=true`,
          },
        });
      } else {
        setError("Paddle checkout not available. Please refresh the page.");
      }
    } catch (e: any) {
      setError(e.message);
      logError("Billing", `Checkout error: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    setError(null);
    setSuccess(null);
    setActionLoading("cancel");

    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel");
      setSuccess("Subscription will be canceled at the end of the billing period");
      setShowCancel(false);
      loadStatus();
    } catch (e: any) {
      setError(e.message);
      logError("Billing", `Cancel error: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePortal = async () => {
    setActionLoading("portal");
    try {
      const res = await fetch("/api/billing/portal");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to open portal");
      if (data.portal_url) {
        window.open(data.portal_url, "_blank");
      }
    } catch (e: any) {
      setError(e.message);
      logError("Billing", `Portal error: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-400">
        <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
        Loading billing...
      </div>
    );
  }

  if (!status) {
    return (
      <div className="text-center py-16 text-gray-400">
        <AlertCircle size={24} className="mx-auto mb-3" />
        Failed to load billing information
      </div>
    );
  }

  const currentPlanIdx = PLAN_ORDER.indexOf(status.plan);
  const prices = REGION_PRICES[status.billing_region] ?? REGION_PRICES.developing;
  const statusBadge = STATUS_BADGES[status.subscription_status] ?? STATUS_BADGES.none;

  return (
    <div className="space-y-6">
      {/* Paddle.js */}
      <Script
        src={paddleEnv === "production"
          ? "https://cdn.paddle.com/paddle/v2/paddle.js"
          : "https://sandbox-cdn.paddle.com/paddle/v2/paddle.js"}
        onLoad={initPaddle}
      />

      <Breadcrumb items={[{ label: "Billing" }]} />

      {/* Flash messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <XCircle size={20} className="text-red-600 shrink-0" />
          <p className="text-sm text-red-800 font-medium">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <XCircle size={16} />
          </button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <Check size={20} className="text-green-600 shrink-0" />
          <p className="text-sm text-green-800 font-medium">{success}</p>
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-400 hover:text-green-600">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard size={28} className="text-indigo-500" />
          Billing
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your subscription and plan
        </p>
      </div>

      {/* Current Plan + Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Current Plan Card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Current Plan</p>
              <p className="text-2xl font-bold text-gray-900 capitalize mt-1">{status.plan}</p>
            </div>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
              {statusBadge.label}
            </span>
          </div>

          {status.billing_region && (
            <p className="text-xs text-gray-400 mt-2">
              Region: {REGION_LABELS[status.billing_region] ?? status.billing_region}
            </p>
          )}

          {status.current_period_end && (
            <p className="text-xs text-gray-400 mt-1">
              {status.subscription_status === "canceled" ? "Access until" : "Next billing"}:{" "}
              {new Date(status.current_period_end).toLocaleDateString()}
            </p>
          )}

          <div className="flex gap-2 mt-4">
            {status.paddle_customer_id && (
              <button
                onClick={handlePortal}
                disabled={actionLoading === "portal"}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <ExternalLink size={14} />
                {actionLoading === "portal" ? "Opening..." : "Payment Settings"}
              </button>
            )}
            {status.subscription_status === "active" && (
              <button
                onClick={() => setShowCancel(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Usage Card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-gray-500 mb-4">Usage</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Users size={16} className="text-blue-500" /> Users
              </div>
              <div className="text-sm">
                <span className="font-semibold text-gray-900">{status.usage.users}</span>
                <span className="text-gray-400"> / {status.limits.users} per store</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Monitor size={16} className="text-purple-500" /> Terminals
              </div>
              <div className="text-sm">
                <span className="font-semibold text-gray-900">{status.usage.terminals}</span>
                <span className="text-gray-400"> / {status.limits.terminals} per store</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Store size={16} className="text-green-500" /> Stores
              </div>
              <div className="text-sm">
                <span className="font-semibold text-gray-900">{status.usage.stores}</span>
                <span className="text-gray-400"> (1 included, then add-on pricing)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Plans</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLAN_CARDS.map((card) => {
            const planIdx = PLAN_ORDER.indexOf(card.key);
            const isCurrent = card.key === status.plan;
            const isUpgrade = planIdx > currentPlanIdx;
            const isDowngrade = planIdx < currentPlanIdx;
            const price = prices[card.key] ?? 0;
            const Icon = card.icon;

            return (
              <div
                key={card.key}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                  isCurrent ? `${card.borderColor} border-2 ring-2 ring-offset-1 ring-blue-200` : "border-gray-100"
                }`}
              >
                <div className="p-5">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-lg ${card.color} flex items-center justify-center`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{card.name}</p>
                      <p className="text-xs text-gray-500">{card.description}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="text-3xl font-bold text-gray-900">${price}</span>
                    <span className="text-sm text-gray-400">/mo per store</span>
                  </div>

                  <ul className="mt-4 space-y-1.5">
                    {card.highlights.map((h) => (
                      <li key={h} className="flex items-center gap-2 text-xs text-gray-600">
                        <Check size={14} className="text-green-500 shrink-0" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                  {isCurrent ? (
                    <div className="text-center text-sm font-medium text-gray-500 py-1.5">
                      Current Plan
                    </div>
                  ) : card.key === "free" ? (
                    // Can't downgrade to free via plan change — need to cancel
                    status.subscription_status === "active" ? (
                      <button
                        onClick={() => setShowCancel(true)}
                        className="w-full py-2 text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Cancel Subscription
                      </button>
                    ) : (
                      <div className="text-center text-sm text-gray-400 py-1.5">Free forever</div>
                    )
                  ) : (
                    <button
                      onClick={() => handleCheckout(card.key)}
                      disabled={actionLoading === card.key}
                      className={`w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                        isUpgrade
                          ? "bg-posterita-blue hover:bg-blue-700 text-white shadow-sm"
                          : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                      }`}
                    >
                      {actionLoading === card.key ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : isUpgrade ? (
                        <ArrowUp size={14} />
                      ) : isDowngrade ? (
                        <ArrowDown size={14} />
                      ) : null}
                      {actionLoading === card.key
                        ? "Processing..."
                        : isUpgrade
                        ? "Upgrade"
                        : "Downgrade"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Billing History */}
      {status.events.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Billing History</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {status.events.map((event) => (
              <div key={event.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-800">{event.event_type.replace(/_/g, " ").replace(/\./g, " - ")}</p>
                  {event.paddle_event_id && (
                    <p className="text-xs text-gray-400">ID: {event.paddle_event_id}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(event.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancel && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Cancel Subscription?</h3>
                <p className="text-sm text-gray-500">This action cannot be easily undone</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Your subscription will remain active until the end of the current billing period
              {status.current_period_end && (
                <> ({new Date(status.current_period_end).toLocaleDateString()})</>
              )}.
              After that, your account will revert to the Free plan.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCancel(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading === "cancel"}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {actionLoading === "cancel" ? "Canceling..." : "Cancel Subscription"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
