"use client";

import { useEffect, useState } from "react";
import {
  Webhook, Plus, Trash2, Play, RefreshCw, CheckCircle, XCircle, Clock,
  Copy, Check, AlertTriangle, ToggleLeft, ToggleRight, ChevronDown, ChevronRight,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { logError } from "@/lib/error-logger";

const ALL_EVENTS = [
  { value: "order.created", label: "Order Created", group: "Orders" },
  { value: "order.refunded", label: "Order Refunded", group: "Orders" },
  { value: "product.created", label: "Product Created", group: "Products" },
  { value: "product.updated", label: "Product Updated", group: "Products" },
  { value: "customer.created", label: "Customer Created", group: "Customers" },
  { value: "stock.low", label: "Stock Low Alert", group: "Inventory" },
  { value: "till.opened", label: "Till Opened", group: "Tills" },
  { value: "till.closed", label: "Till Closed", group: "Tills" },
];

interface Subscription {
  id: number;
  url: string;
  events: string[];
  is_active: boolean;
  description: string | null;
  secret?: string;
  created_at: string;
  last_triggered: string | null;
  failure_count: number;
}

interface LogEntry {
  id: number;
  subscription_id: number;
  event: string;
  status: string;
  status_code: number | null;
  response_body: string | null;
  attempts: number;
  created_at: string;
  delivered_at: string | null;
}

export default function WebhooksPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedSub, setExpandedSub] = useState<number | null>(null);
  const [copiedSecret, setCopiedSecret] = useState<number | null>(null);
  const [testing, setTesting] = useState<number | null>(null);

  // Create form
  const [newUrl, setNewUrl] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newEvents, setNewEvents] = useState<string[]>(["order.created"]);
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [subsRes, logsRes] = await Promise.all([
        fetch("/api/webhooks").then((r) => r.json()),
        fetch("/api/webhooks/logs?limit=50").then((r) => r.json()),
      ]);
      setSubs(subsRes.data ?? []);
      setLogs(logsRes.data ?? []);
    } catch (e: any) {
      logError("Webhooks", `Failed to load: ${e.message}`);
    }
    setLoading(false);
  }

  async function createWebhook() {
    if (!newUrl.trim() || !newEvents.length) return;
    setCreating(true);
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl.trim(), events: newEvents, description: newDesc.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error || "Failed to create"); return; }
      setNewSecret(json.data.secret);
      setSubs((prev) => [json.data, ...prev]);
      setNewUrl("");
      setNewDesc("");
      setNewEvents(["order.created"]);
    } catch (e: any) {
      logError("Webhooks", `Create failed: ${e.message}`);
      alert("Failed to create webhook");
    } finally {
      setCreating(false);
    }
  }

  async function deleteSub(id: number) {
    if (!confirm("Delete this webhook? All delivery logs will be removed.")) return;
    try {
      await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
      setSubs((prev) => prev.filter((s) => s.id !== id));
      setLogs((prev) => prev.filter((l) => l.subscription_id !== id));
    } catch (e: any) {
      logError("Webhooks", `Delete failed: ${e.message}`);
    }
  }

  async function toggleActive(sub: Subscription) {
    try {
      const res = await fetch(`/api/webhooks/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !sub.is_active }),
      });
      const json = await res.json();
      if (res.ok) {
        setSubs((prev) => prev.map((s) => s.id === sub.id ? { ...s, ...json.data } : s));
      }
    } catch (e: any) {
      logError("Webhooks", `Toggle failed: ${e.message}`);
    }
  }

  async function testWebhook(id: number) {
    setTesting(id);
    try {
      const res = await fetch(`/api/webhooks/${id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (res.ok) {
        // Reload logs to show the test result
        const logsRes = await fetch("/api/webhooks/logs?limit=50").then((r) => r.json());
        setLogs(logsRes.data ?? []);
      } else {
        alert(json.error || "Test failed");
      }
    } catch (e: any) {
      logError("Webhooks", `Test failed: ${e.message}`);
    }
    setTesting(null);
  }

  function copySecret(secret: string, id: number) {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(id);
    setTimeout(() => setCopiedSecret(null), 2000);
  }

  function toggleEvent(event: string) {
    setNewEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  const subLogs = (subId: number) => logs.filter((l) => l.subscription_id === subId);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Webhooks" }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Webhooks</h1>
          <p className="text-gray-500 mt-1">
            Send real-time event notifications to external services
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(!showCreate); setNewSecret(null); }}
          className="flex items-center gap-2 bg-posterita-blue text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition"
        >
          <Plus size={18} /> Add Webhook
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">New Webhook</h3>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Endpoint URL (HTTPS only)</label>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://hooks.zapier.com/hooks/catch/..."
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-posterita-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Description (optional)</label>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="e.g. Xero accounting sync"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-posterita-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Events</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {ALL_EVENTS.map((ev) => (
                <label
                  key={ev.value}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition ${
                    newEvents.includes(ev.value)
                      ? "border-posterita-blue bg-blue-50 text-posterita-blue font-medium"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={newEvents.includes(ev.value)}
                    onChange={() => toggleEvent(ev.value)}
                    className="sr-only"
                  />
                  {ev.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={createWebhook}
              disabled={creating || !newUrl.trim() || !newEvents.length}
              className="bg-posterita-blue text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition disabled:opacity-40"
            >
              {creating ? "Creating..." : "Create Webhook"}
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewSecret(null); }}
              className="text-gray-500 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-100 transition"
            >
              Cancel
            </button>
          </div>

          {/* Show secret once after creation */}
          {newSecret && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
              <div className="flex items-start gap-2">
                <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    Signing Secret — copy it now, it won&apos;t be shown again
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="bg-white border border-amber-300 rounded px-3 py-1.5 text-xs font-mono break-all">
                      {newSecret}
                    </code>
                    <button
                      onClick={() => copySecret(newSecret, -1)}
                      className="text-amber-600 hover:text-amber-800 p-1"
                    >
                      {copiedSecret === -1 ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                  <p className="text-xs text-amber-600 mt-2">
                    Use this secret to verify webhook signatures via HMAC-SHA256.
                    The payload is signed with <code className="bg-white px-1 rounded">X-Webhook-Signature</code> header.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subscriptions list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw size={24} className="text-gray-400 animate-spin" />
        </div>
      ) : subs.length === 0 && !showCreate ? (
        <div className="text-center py-16">
          <Webhook size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-700">No webhooks yet</h2>
          <p className="text-gray-500 text-sm mt-1 max-w-md mx-auto">
            Webhooks send real-time notifications when events happen in your POS —
            connect to Zapier, Xero, QuickBooks, or your own systems.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {subs.map((sub) => {
            const isExpanded = expandedSub === sub.id;
            const recentLogs = subLogs(sub.id).slice(0, 5);
            const successRate = recentLogs.length
              ? Math.round((recentLogs.filter((l) => l.status === "success").length / recentLogs.length) * 100)
              : null;

            return (
              <div key={sub.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header row */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => setExpandedSub(isExpanded ? null : sub.id)}
                >
                  <div className={`p-2 rounded-lg ${sub.is_active ? "bg-green-50" : "bg-gray-100"}`}>
                    <Webhook size={20} className={sub.is_active ? "text-green-600" : "text-gray-400"} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm truncate">{sub.url}</span>
                      {!sub.is_active && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">DISABLED</span>
                      )}
                      {sub.failure_count >= 5 && sub.is_active && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">
                          {sub.failure_count} failures
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      {sub.description && <span>{sub.description}</span>}
                      <span>{sub.events.length} event{sub.events.length !== 1 ? "s" : ""}</span>
                      {sub.last_triggered && (
                        <span>Last fired: {new Date(sub.last_triggered).toLocaleDateString()}</span>
                      )}
                      {successRate !== null && (
                        <span className={successRate >= 80 ? "text-green-600" : successRate >= 50 ? "text-amber-600" : "text-red-600"}>
                          {successRate}% success
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); testWebhook(sub.id); }}
                      disabled={testing === sub.id || !sub.is_active}
                      className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-posterita-blue transition disabled:opacity-40"
                      title="Send test event"
                    >
                      {testing === sub.id ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleActive(sub); }}
                      className="p-2 rounded-lg hover:bg-gray-100 transition"
                      title={sub.is_active ? "Disable" : "Enable"}
                    >
                      {sub.is_active
                        ? <ToggleRight size={20} className="text-green-600" />
                        : <ToggleLeft size={20} className="text-gray-400" />
                      }
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSub(sub.id); }}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                    {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                    {/* Events */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Subscribed Events</label>
                      <div className="flex flex-wrap gap-1.5">
                        {sub.events.map((ev) => (
                          <span key={ev} className="px-2.5 py-1 rounded-full bg-blue-50 text-posterita-blue text-xs font-medium">
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Recent deliveries */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-2 block">Recent Deliveries</label>
                      {recentLogs.length > 0 ? (
                        <div className="space-y-1.5">
                          {recentLogs.map((log) => (
                            <div key={log.id} className="flex items-center gap-3 text-xs">
                              {log.status === "success" ? (
                                <CheckCircle size={14} className="text-green-500 shrink-0" />
                              ) : log.status === "failed" ? (
                                <XCircle size={14} className="text-red-500 shrink-0" />
                              ) : (
                                <Clock size={14} className="text-gray-400 shrink-0" />
                              )}
                              <span className="font-medium text-gray-700 w-28">{log.event}</span>
                              <span className={`w-10 ${log.status === "success" ? "text-green-600" : "text-red-600"}`}>
                                {log.status_code || "—"}
                              </span>
                              <span className="text-gray-400 flex-1 truncate">
                                {log.response_body?.substring(0, 80) || "—"}
                              </span>
                              <span className="text-gray-400 shrink-0">
                                {new Date(log.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">No deliveries yet — click the play button to send a test.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
