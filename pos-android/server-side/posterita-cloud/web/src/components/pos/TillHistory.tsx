"use client";

import { useState, useEffect } from "react";
import { X, Wallet, Clock } from "lucide-react";
import { getOfflineDb } from "@/lib/offline/db";
import type { Till } from "@/lib/offline/schema";

export default function TillHistory({ onClose }: { onClose: () => void }) {
  const [tills, setTills] = useState<Till[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOfflineDb().till.orderBy("till_id").reverse().limit(20).toArray().then((t) => {
      setTills(t);
      setLoading(false);
    });
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-700 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-green-400" />
            <h2 className="text-lg font-bold text-white">Till History</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 p-1">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && <div className="text-center py-12 text-gray-500 text-sm">Loading...</div>}
          {!loading && tills.length === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">No till sessions</div>
          )}
          {tills.map((t) => {
            const isOpen = !t.date_closed;
            return (
              <div key={t.till_id} className="bg-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${isOpen ? "bg-green-500" : "bg-gray-500"}`} />
                    <span className="text-sm font-medium text-white">
                      Till #{t.till_id}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      isOpen ? "bg-green-900/50 text-green-400" : "bg-gray-700 text-gray-400"
                    }`}>
                      {isOpen ? "Open" : "Closed"}
                    </span>
                  </div>
                  <span className={`text-xs ${t.is_sync ? "text-green-500" : "text-amber-500"}`}>
                    {t.is_sync ? "Synced" : "Pending"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Opened</span>
                    <p className="text-gray-300">{fmtDate(t.date_opened)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Closed</span>
                    <p className="text-gray-300">{t.date_closed ? fmtDate(t.date_closed) : "—"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Opening</span>
                    <p className="text-white font-medium">{fmtPrice(t.opening_amt)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Closing</span>
                    <p className="text-white font-medium">{t.closing_amt > 0 ? fmtPrice(t.closing_amt) : "—"}</p>
                  </div>
                </div>

                {!isOpen && t.grand_total > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-700 flex justify-between text-sm">
                    <div className="flex gap-3">
                      <span className="text-gray-500">Cash: <span className="text-white">{fmtPrice(t.cash_amt)}</span></span>
                      <span className="text-gray-500">Card: <span className="text-white">{fmtPrice(t.card_amt)}</span></span>
                    </div>
                    <span className="font-bold text-white">{fmtPrice(t.grand_total)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function fmtPrice(n: number): string {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);
}
function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}
