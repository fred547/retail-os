"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Truck, ExternalLink, RefreshCw, Package, MapPin } from "lucide-react";
import { getOfflineDb, getSyncMeta } from "@/lib/offline/db";
import { isSeeded } from "@/lib/offline/seed";
import type { Order } from "@/lib/offline/schema";
import Link from "next/link";
import { PosBottomNav } from "../home/page";

/**
 * Logistics — delivery tracking from IndexedDB.
 * IndexedDB has no dedicated delivery table, so we show orders with
 * delivery-related order_type and link to the web console for full management.
 */

type DeliveryOrder = Order & { customer_name?: string };

const STATUS_TABS = ["All", "Pending", "In Transit", "Delivered"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

function getDeliveryStatus(order: Order): "Pending" | "In Transit" | "Delivered" {
  if (order.doc_status === "delivered" || order.doc_status === "CO") return "Delivered";
  if (order.doc_status === "in_transit") return "In Transit";
  return "Pending";
}

function statusColor(status: string): string {
  switch (status) {
    case "Delivered": return "bg-green-900/40 text-green-400";
    case "In Transit": return "bg-blue-900/40 text-blue-400";
    case "Pending": return "bg-amber-900/40 text-amber-400";
    default: return "bg-gray-800 text-gray-400";
  }
}

export default function LogisticsPage() {
  const [ready, setReady] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [activeTab, setActiveTab] = useState<StatusTab>("All");
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const accountId = await getSyncMeta("account_id");
        if (!accountId) { setReady(true); return; }
        const seeded = await isSeeded(accountId);
        if (!seeded) { setReady(true); return; }

        const db = getOfflineDb();

        // Check for delivery-type orders
        const allOrders = await db.order.toArray();
        const deliveryOrders = allOrders.filter(
          (o) => o.order_type === "delivery" || o.order_type === "DELIVERY"
        );

        if (deliveryOrders.length > 0) {
          // Enrich with customer names
          const customers = await db.customer.toArray();
          const customerMap = new Map(customers.map((c) => [c.customer_id, c.name || "Walk-in"]));

          const enriched: DeliveryOrder[] = deliveryOrders
            .sort((a, b) => (b.date_ordered || "").localeCompare(a.date_ordered || ""))
            .map((o) => ({
              ...o,
              customer_name: customerMap.get(o.customer_id) || "Walk-in",
            }));

          setDeliveries(enriched);
          setHasData(true);
        }

        setReady(true);
      } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e));
        fetch("/api/errors/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tag: "POS_LOGISTICS",
            message: `Logistics init crash: ${err.message}`,
            stack_trace: err.stack,
            severity: "ERROR",
          }),
        }).catch(() => {});
        setReady(true);
      }
    }
    init();
  }, []);

  const filteredDeliveries = activeTab === "All"
    ? deliveries
    : deliveries.filter((d) => getDeliveryStatus(d) === activeTab);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <RefreshCw size={32} className="text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading logistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
        <Link href="/pos/home" className="text-gray-400 hover:text-white p-1.5 hover:bg-gray-800 rounded-lg transition">
          <ArrowLeft size={18} />
        </Link>
        <Truck size={18} className="text-blue-400" />
        <h1 className="text-sm font-semibold">Logistics</h1>
      </div>

      {!hasData ? (
        /* No delivery data — show coming soon card */
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Truck size={32} className="text-blue-400" />
            </div>
            <h2 className="text-lg font-bold mb-2">Delivery Tracking</h2>
            <p className="text-gray-400 text-sm mb-6">
              Delivery data is managed on the web console. Create and track deliveries from your dashboard for full status updates, driver assignment, and route management.
            </p>
            <a
              href="https://web.posterita.com/customer/deliveries"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-blue-700 transition"
            >
              Manage Deliveries
              <ExternalLink size={14} />
            </a>
            <Link
              href="/pos"
              className="block text-gray-500 text-sm mt-4 hover:text-gray-300 transition"
            >
              Back to POS
            </Link>
          </div>
        </div>
      ) : (
        /* Delivery list */
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          {/* Status filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {STATUS_TABS.map((tab) => {
              const count = tab === "All"
                ? deliveries.length
                : deliveries.filter((d) => getDeliveryStatus(d) === tab).length;
              return (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setSelectedOrder(null); }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    activeTab === tab
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {tab}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                    activeTab === tab ? "bg-blue-500" : "bg-gray-700"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Delivery cards */}
          {filteredDeliveries.length === 0 ? (
            <div className="text-center py-12">
              <Package size={32} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No {activeTab.toLowerCase()} deliveries</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDeliveries.map((d) => {
                const status = getDeliveryStatus(d);
                const isSelected = selectedOrder?.order_id === d.order_id;
                return (
                  <div key={d.order_id}>
                    <button
                      onClick={() => setSelectedOrder(isSelected ? null : d)}
                      className="w-full text-left bg-gray-800/50 border border-gray-800 rounded-xl p-4 hover:bg-gray-800 transition"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">
                          {d.document_no || `#${d.order_id}`}
                        </span>
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ${statusColor(status)}`}>
                          {status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{d.customer_name}</span>
                        <span>{d.currency || ""} {d.grand_total.toFixed(2)}</span>
                      </div>
                      {d.date_ordered && (
                        <p className="text-[11px] text-gray-500 mt-1">
                          {new Date(d.date_ordered).toLocaleDateString(undefined, {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      )}
                    </button>

                    {/* Detail view */}
                    {isSelected && (
                      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mt-1 space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-gray-500 mb-0.5">Customer</p>
                            <p className="text-white font-medium">{d.customer_name}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-0.5">Order Total</p>
                            <p className="text-white font-medium">{d.currency || ""} {d.grand_total.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-0.5">Items</p>
                            <p className="text-white font-medium">{d.qty_total}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-0.5">Ordered</p>
                            <p className="text-white font-medium">
                              {d.date_ordered
                                ? new Date(d.date_ordered).toLocaleString(undefined, {
                                    month: "short", day: "numeric", year: "numeric",
                                    hour: "2-digit", minute: "2-digit",
                                  })
                                : "—"}
                            </p>
                          </div>
                        </div>
                        {d.note && (
                          <div className="text-xs">
                            <p className="text-gray-500 mb-0.5">Notes</p>
                            <p className="text-gray-300">{d.note}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-500 pt-1 border-t border-gray-700">
                          <MapPin size={12} />
                          <span>Full delivery details available on the web console</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Web console link */}
          <div className="text-center pt-4 pb-8">
            <a
              href="https://web.posterita.com/customer/deliveries"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition"
            >
              Manage all deliveries on the web console
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}

      <PosBottomNav current="logistics" />
    </div>
  );
}
