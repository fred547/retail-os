"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Plus, Star, Phone, Mail, ChevronRight, X, User, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getOfflineDb, getSyncMeta } from "@/lib/offline/db";
import type { Customer, Order, LoyaltyConfig } from "@/lib/offline/schema";
import { PosBottomNav } from "../home/page";

/**
 * CRM Page — Customer list, detail, loyalty, and add customer.
 * All data from IndexedDB. Works fully offline.
 */
export default function CrmPage() {
  const [ready, setReady] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [accountId, setAccountId] = useState("");

  // Add form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formNote, setFormNote] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    async function init() {
      try {
        const acctId = await getSyncMeta("account_id");
        if (!acctId) { setReady(true); return; }
        setAccountId(acctId);

        const db = getOfflineDb();
        const [custs, ords, configs] = await Promise.all([
          db.customer.where("account_id").equals(acctId).toArray(),
          db.order.toArray(),
          db.loyalty_config.where("account_id").equals(acctId).toArray(),
        ]);

        setCustomers(custs.filter(c => c.isactive === "Y").sort((a, b) => (a.name || "").localeCompare(b.name || "")));
        setOrders(ords);
        setLoyaltyConfig(configs.find(c => c.is_active) || null);
        setReady(true);
      } catch (e: any) {
        console.error("[CRM] init failed:", e);
        setReady(true);
      }
    }
    init();
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(c =>
      (c.name?.toLowerCase().includes(q)) ||
      (c.phone1?.toLowerCase().includes(q)) ||
      (c.email?.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  // Orders for selected customer
  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return orders
      .filter(o => o.customer_id === selectedCustomer.customer_id)
      .sort((a, b) => (b.date_ordered || "").localeCompare(a.date_ordered || ""));
  }, [selectedCustomer, orders]);

  const handleSaveCustomer = useCallback(async () => {
    if (!formName.trim()) return;
    setSaveStatus("saving");
    try {
      const db = getOfflineDb();
      const newCustomer: Customer = {
        customer_id: Date.now(), // temp local ID, server reassigns on sync
        account_id: accountId,
        name: formName.trim(),
        identifier: null,
        phone1: formPhone.trim() || null,
        phone2: null,
        mobile: null,
        email: formEmail.trim() || null,
        address1: null,
        address2: null,
        city: null,
        state: null,
        zip: null,
        country: null,
        gender: null,
        dob: null,
        regno: null,
        note: formNote.trim() || null,
        allowcredit: "N",
        creditlimit: 0,
        creditterm: 0,
        openbalance: 0,
        isactive: "Y",
        loyaltypoints: 0,
        discountcode_id: 0,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      };
      await db.customer.put(newCustomer);
      setCustomers(prev => [...prev, newCustomer].sort((a, b) => (a.name || "").localeCompare(b.name || "")));
      setSaveStatus("saved");
      setTimeout(() => {
        setShowAddForm(false);
        setFormName(""); setFormEmail(""); setFormPhone(""); setFormNote("");
        setSaveStatus("idle");
      }, 1000);
    } catch {
      setSaveStatus("error");
    }
  }, [formName, formEmail, formPhone, formNote, accountId]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading customers...</p>
        </div>
      </div>
    );
  }

  // Customer detail view
  if (selectedCustomer) {
    const totalSpent = customerOrders.reduce((s, o) => s + (o.grand_total || 0), 0);
    return (
      <div className="min-h-screen flex flex-col bg-gray-900 text-white">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
          <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-white p-1.5 hover:bg-gray-800 rounded-lg transition">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-sm font-semibold flex-1">Customer Details</h1>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
            {/* Profile card */}
            <div className="bg-gray-800 rounded-2xl p-6 text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold">{(selectedCustomer.name || "?")[0].toUpperCase()}</span>
              </div>
              <h2 className="text-lg font-bold">{selectedCustomer.name}</h2>
              {selectedCustomer.email && (
                <p className="text-sm text-gray-400 flex items-center justify-center gap-1 mt-1">
                  <Mail size={14} /> {selectedCustomer.email}
                </p>
              )}
              {selectedCustomer.phone1 && (
                <p className="text-sm text-gray-400 flex items-center justify-center gap-1 mt-1">
                  <Phone size={14} /> {selectedCustomer.phone1}
                </p>
              )}
            </div>

            {/* Loyalty card */}
            <div className="bg-gray-800 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Loyalty</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-purple-400">{selectedCustomer.loyaltypoints || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Points</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">{customerOrders.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Orders</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-400">{totalSpent.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Spent</p>
                </div>
              </div>
              {loyaltyConfig && (
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Earn {loyaltyConfig.points_per_currency} pt per {loyaltyConfig.redemption_rate > 0 ? `unit | Redeem at ${loyaltyConfig.min_redeem_points} pts min` : "unit"}
                </p>
              )}
            </div>

            {/* Details */}
            {(selectedCustomer.address1 || selectedCustomer.city || selectedCustomer.note) && (
              <div className="bg-gray-800 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Details</h3>
                {selectedCustomer.address1 && <p className="text-sm text-gray-400">{selectedCustomer.address1}</p>}
                {(selectedCustomer.city || selectedCustomer.state || selectedCustomer.zip) && (
                  <p className="text-sm text-gray-400">{[selectedCustomer.city, selectedCustomer.state, selectedCustomer.zip].filter(Boolean).join(", ")}</p>
                )}
                {selectedCustomer.note && <p className="text-sm text-gray-400 mt-2 italic">{selectedCustomer.note}</p>}
              </div>
            )}

            {/* Purchase history */}
            <div className="bg-gray-800 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Purchase History</h3>
              {customerOrders.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No orders yet</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {customerOrders.slice(0, 20).map(o => (
                    <div key={o.order_id} className="flex items-center justify-between py-2 px-3 bg-gray-700/50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium">{o.document_no || `#${o.order_id}`}</p>
                        <p className="text-xs text-gray-500">
                          {o.date_ordered ? new Date(o.date_ordered).toLocaleDateString() : "Unknown date"}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">{(o.grand_total || 0).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>

        <PosBottomNav current="crm" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
        <Link href="/pos/home" className="text-gray-400 hover:text-white p-1.5 hover:bg-gray-800 rounded-lg transition">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-sm font-semibold flex-1">Customers</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-purple-700 transition"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      <main className="flex-1 overflow-y-auto">
        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, or email..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="px-4 pb-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-purple-400">{customers.length}</p>
              <p className="text-xs text-gray-500">Total Customers</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-400">
                {customers.filter(c => (c.loyaltypoints || 0) > 0).length}
              </p>
              <p className="text-xs text-gray-500">With Loyalty Points</p>
            </div>
          </div>
        </div>

        {/* Customer list */}
        <div className="px-4 pb-4 space-y-1.5">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <User size={32} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">{searchQuery ? "No customers match your search" : "No customers yet"}</p>
            </div>
          ) : (
            filteredCustomers.map(c => (
              <button
                key={c.customer_id}
                onClick={() => setSelectedCustomer(c)}
                className="w-full flex items-center gap-3 bg-gray-800 hover:bg-gray-750 rounded-xl p-3 text-left transition group"
              >
                <div className="w-10 h-10 bg-purple-600/20 text-purple-400 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold">{(c.name || "?")[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {[c.phone1, c.email].filter(Boolean).join(" | ") || "No contact info"}
                  </p>
                </div>
                {(c.loyaltypoints || 0) > 0 && (
                  <div className="flex items-center gap-1 text-xs text-amber-400 flex-shrink-0">
                    <Star size={12} /> {c.loyaltypoints}
                  </div>
                )}
                <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400 flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      </main>

      <PosBottomNav current="crm" />

      {/* Add Customer Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowAddForm(false)}>
          <div className="bg-gray-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Add Customer</h2>
              <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name *</label>
                <input
                  type="text" value={formName} onChange={e => setFormName(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 outline-none"
                  placeholder="Customer name"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Email</label>
                <input
                  type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 outline-none"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Phone</label>
                <input
                  type="tel" value={formPhone} onChange={e => setFormPhone(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 outline-none"
                  placeholder="+1 234 567 890"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Note</label>
                <textarea
                  value={formNote} onChange={e => setFormNote(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 outline-none resize-none"
                  rows={2} placeholder="Optional note"
                />
              </div>
              <button
                onClick={handleSaveCustomer}
                disabled={!formName.trim() || saveStatus === "saving"}
                className="w-full bg-purple-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-purple-700 transition disabled:opacity-50"
              >
                {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved!" : saveStatus === "error" ? "Error — Try Again" : "Save Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
