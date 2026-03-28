"use client";

import { useEffect, useState } from "react";
import { Calendar, Download, FileText, Clock, CreditCard, Banknote, ReceiptText, XCircle } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { logError } from "@/lib/error-logger";

interface ZReport {
  summary: {
    date: string;
    total_sales: number;
    total_subtotal: number;
    total_tax: number;
    total_discount: number;
    order_count: number;
    void_count: number;
    void_total: number;
    avg_order: number;
  };
  payment_breakdown: Array<{
    payment_type: string;
    count: number;
    total: number;
    percentage: number;
  }>;
  tills: Array<{
    till_id: number;
    documentno: string;
    status: string;
    opening_amt: number;
    closing_amt: number;
    cash_amt: number;
    card_amt: number;
    grand_total: number;
    date_opened: string;
    date_closed: string | null;
  }>;
  generated_at: string;
}

export default function ZReportPage() {
  const [date, setDate] = useState(getToday());
  const [report, setReport] = useState<ZReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReport();
  }, [date]);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/z-report?date=${date}`);
      if (!res.ok) throw new Error(await res.text());
      setReport(await res.json());
    } catch (e: any) {
      logError("ZReport", `Failed to fetch Z-report: ${e.message}`);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    window.open(`/api/reports/z-report?date=${date}&format=csv`, "_blank");
  };

  const s = report?.summary;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Reports", href: "/customer/reports" }, { label: "Z-Report" }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Z-Report</h1>
          <p className="text-gray-500 mt-1">End-of-day summary</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3">
            <Calendar size={16} className="text-gray-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="py-2 text-sm outline-none"
            />
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition text-sm"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-posterita-blue" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      {!loading && report && s && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={ReceiptText} color="bg-blue-100 text-blue-700" label="Total Sales" value={fmt(s.total_sales)} />
            <StatCard icon={FileText} color="bg-green-100 text-green-700" label="Orders" value={s.order_count.toString()} sub={`Avg ${fmt(s.avg_order)}`} />
            <StatCard icon={Banknote} color="bg-amber-100 text-amber-700" label="Tax Collected" value={fmt(s.total_tax)} />
            <StatCard icon={XCircle} color="bg-red-100 text-red-700" label="Voids" value={`${s.void_count}`} sub={s.void_count > 0 ? fmt(s.void_total) : "None"} />
          </div>

          {/* Two-column: Payment Breakdown + Till Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Breakdown */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <CreditCard size={18} className="text-posterita-blue" />
                <h2 className="font-semibold">Payment Breakdown</h2>
              </div>
              <div className="p-6 space-y-4">
                {report.payment_breakdown.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No payments for this day</p>
                )}
                {report.payment_breakdown.map((p) => (
                  <div key={p.payment_type}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium">{p.payment_type}</span>
                      <span className="text-gray-500">
                        {fmt(p.total)} <span className="text-gray-400">({p.percentage.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className="bg-posterita-blue rounded-full h-2.5 transition-all"
                        style={{ width: `${Math.min(p.percentage, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{p.count} transaction{p.count !== 1 ? "s" : ""}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Till Summary */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <Clock size={18} className="text-posterita-blue" />
                <h2 className="font-semibold">Till Sessions</h2>
              </div>
              <div className="p-0">
                {report.tills.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No tills opened on this day</p>
                )}
                {report.tills.map((t) => (
                  <div key={t.till_id} className="px-6 py-4 border-b border-gray-50 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{t.documentno ?? `Till #${t.till_id}`}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.status === "closed" ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-700 animate-pulse"
                      }`}>
                        {t.status === "closed" ? "Closed" : "Open"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-gray-400">Opening</span>
                        <div className="font-medium">{fmt(t.opening_amt)}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Cash</span>
                        <div className="font-medium">{fmt(t.cash_amt)}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Card</span>
                        <div className="font-medium">{fmt(t.card_amt)}</div>
                      </div>
                    </div>
                    {t.status === "closed" && (
                      <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between text-xs">
                        <span className="text-gray-400">Closing</span>
                        <span className="font-bold">{fmt(t.closing_amt)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Subtotals bar */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Subtotal</span>
                <div className="font-semibold text-lg">{fmt(s.total_subtotal)}</div>
              </div>
              <div>
                <span className="text-gray-400">Tax</span>
                <div className="font-semibold text-lg">{fmt(s.total_tax)}</div>
              </div>
              <div>
                <span className="text-gray-400">Discounts</span>
                <div className="font-semibold text-lg">{fmt(s.total_discount)}</div>
              </div>
              <div>
                <span className="text-gray-400">Grand Total</span>
                <div className="font-bold text-lg text-posterita-blue">{fmt(s.total_sales)}</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-gray-400 text-center">
            Generated {new Date(report.generated_at).toLocaleString()}
          </p>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value, sub }: {
  icon: any; color: string; label: string; value: string; sub?: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${color}`}><Icon size={14} /></div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "MUR", minimumFractionDigits: 2,
  }).format(n ?? 0);
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}
