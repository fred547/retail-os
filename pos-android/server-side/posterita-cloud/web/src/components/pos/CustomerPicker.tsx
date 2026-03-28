"use client";

import { useState, useEffect } from "react";
import { X, Search, User, UserPlus } from "lucide-react";
import { getOfflineDb } from "@/lib/offline/db";
import { setCustomer } from "@/lib/pos/cart-store";
import type { Customer } from "@/lib/offline/schema";

export default function CustomerPicker({ onClose }: { onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filtered, setFiltered] = useState<Customer[]>([]);

  useEffect(() => {
    getOfflineDb().customer.where("isactive").equals("Y").toArray().then((c) => {
      const sorted = c.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setCustomers(sorted);
      setFiltered(sorted.slice(0, 50));
    });
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(customers.slice(0, 50));
      return;
    }
    const q = search.toLowerCase();
    setFiltered(
      customers.filter((c) =>
        (c.name?.toLowerCase().includes(q)) ||
        (c.phone1?.includes(q)) ||
        (c.email?.toLowerCase().includes(q))
      ).slice(0, 50)
    );
  }, [search, customers]);

  const handleSelect = (c: Customer) => {
    setCustomer(c.customer_id, c.name);
    onClose();
  };

  const handleClear = () => {
    setCustomer(0, null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-700 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">Select Customer</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 p-1">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, email..."
              autoFocus
              className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Clear customer button */}
        <button onClick={handleClear}
          className="mx-4 mb-2 flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-750 transition">
          <X size={14} /> No customer (walk-in)
        </button>

        {/* Customer list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
          {filtered.map((c) => (
            <button key={c.customer_id} onClick={() => handleSelect(c)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 transition text-left group">
              <div className="w-8 h-8 bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <User size={14} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{c.name || "No name"}</p>
                <p className="text-xs text-gray-500 truncate">
                  {[c.phone1, c.email].filter(Boolean).join(" — ") || "—"}
                </p>
              </div>
              {c.loyaltypoints > 0 && (
                <span className="text-xs text-purple-400 font-medium">{c.loyaltypoints} pts</span>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              {search ? "No customers found" : "No customers yet"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
