"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Send, ArrowRight, Download, Trash2, Clock,
  CheckCircle, XCircle, User, FileText, Copy,
} from "lucide-react";

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  draft:     { bg: "bg-gray-100", text: "text-gray-600", label: "Draft" },
  sent:      { bg: "bg-blue-100", text: "text-blue-700", label: "Sent" },
  accepted:  { bg: "bg-green-100", text: "text-green-700", label: "Accepted" },
  converted: { bg: "bg-purple-100", text: "text-purple-700", label: "Converted" },
  expired:   { bg: "bg-amber-100", text: "text-amber-700", label: "Expired" },
  cancelled: { bg: "bg-red-100", text: "text-red-600", label: "Cancelled" },
};

export default function QuotationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    fetch(`/api/quotations/${id}`).then((r) => r.json()).then((d) => {
      setQuotation(d.quotation);
      setLoading(false);
    });
  }, [id]);

  const handleSend = async () => {
    setActing(true);
    await fetch(`/api/quotations/${id}/send`, { method: "POST" });
    setQuotation((q: any) => ({ ...q, status: "sent", sent_at: new Date().toISOString() }));
    setActing(false);
  };

  const handleAccept = async () => {
    setActing(true);
    await fetch(`/api/quotations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "accepted" }),
    });
    setQuotation((q: any) => ({ ...q, status: "accepted", accepted_at: new Date().toISOString() }));
    setActing(false);
  };

  const handleConvert = async () => {
    setActing(true);
    const res = await fetch(`/api/quotations/${id}/convert`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      setQuotation((q: any) => ({ ...q, status: "converted", converted_order_id: data.order_id }));
    }
    setActing(false);
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this quotation?")) return;
    setActing(true);
    await fetch(`/api/quotations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    setQuotation((q: any) => ({ ...q, status: "cancelled" }));
    setActing(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this quotation?")) return;
    await fetch(`/api/quotations/${id}`, { method: "DELETE" });
    router.push("/customer/quotations");
  };

  const handleDownloadPdf = async () => {
    const res = await fetch(`/api/quotations/${id}/pdf?template=${quotation?.template_id || "classic"}`, { method: "POST" });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Quote-${quotation?.document_no || id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  if (!quotation) {
    return <div className="text-center py-32 text-gray-500">Quotation not found</div>;
  }

  const sc = statusConfig[quotation.status] ?? statusConfig.draft;
  const lines = quotation.lines ?? [];
  const isEditable = quotation.status === "draft" || quotation.status === "sent";

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/customer/quotations" className="text-gray-400 hover:text-gray-600 p-1">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">{quotation.document_no || `Quote #${quotation.quotation_id}`}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
              {sc.label}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Created {fmtDate(quotation.created_at)}
            {quotation.valid_until && <> — Valid until {fmtDate(quotation.valid_until)}</>}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button onClick={handleDownloadPdf} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
          <Download size={14} /> PDF
        </button>
        {quotation.status === "draft" && (
          <button onClick={handleSend} disabled={acting} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
            <Send size={14} /> Mark as Sent
          </button>
        )}
        {quotation.status === "sent" && (
          <button onClick={handleAccept} disabled={acting} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50">
            <CheckCircle size={14} /> Accept
          </button>
        )}
        {(quotation.status === "accepted" || quotation.status === "sent") && (
          <button onClick={handleConvert} disabled={acting} className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition disabled:opacity-50">
            <ArrowRight size={14} /> Convert to Order
          </button>
        )}
        {isEditable && (
          <button onClick={handleCancel} disabled={acting} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition disabled:opacity-50">
            <XCircle size={14} /> Cancel
          </button>
        )}
        {quotation.status === "converted" && quotation.converted_order_id && (
          <Link href={`/customer/orders?search=${quotation.converted_order_id}`} className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-sm font-medium text-purple-700 hover:bg-purple-100 transition">
            <ArrowRight size={14} /> View Order #{quotation.converted_order_id}
          </Link>
        )}
        <div className="flex-1" />
        <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-2 text-gray-400 hover:text-red-500 transition text-sm">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Customer card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
            <User size={18} className="text-blue-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{quotation.customer_name || "No customer"}</p>
            <p className="text-sm text-gray-500">
              {[quotation.customer_email, quotation.customer_phone].filter(Boolean).join(" — ") || "—"}
            </p>
          </div>
        </div>
        {quotation.customer_address && (
          <p className="text-sm text-gray-500 ml-12">{quotation.customer_address}</p>
        )}
      </div>

      {/* Line items */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Price</th>
              {lines.some((l: any) => l.discount_percent > 0) && <th className="text-right">Disc</th>}
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line: any, i: number) => (
              <tr key={line.line_id || i}>
                <td className="text-gray-400">{i + 1}</td>
                <td>
                  <p className="font-medium">{line.product_name}</p>
                  {line.description && <p className="text-xs text-gray-500">{line.description}</p>}
                </td>
                <td className="text-right">{line.quantity}</td>
                <td className="text-right">{fmtCur(line.unit_price)}</td>
                {lines.some((l: any) => l.discount_percent > 0) && (
                  <td className="text-right">{line.discount_percent > 0 ? `${line.discount_percent}%` : ""}</td>
                )}
                <td className="text-right font-medium">{fmtCur(line.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t border-gray-100 px-5 py-4 space-y-1">
          <div className="flex justify-end gap-8 text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium w-24 text-right">{fmtCur(quotation.subtotal)}</span>
          </div>
          {quotation.tax_total > 0 && (
            <div className="flex justify-end gap-8 text-sm">
              <span className="text-gray-500">Tax</span>
              <span className="font-medium w-24 text-right">{fmtCur(quotation.tax_total)}</span>
            </div>
          )}
          <div className="flex justify-end gap-8 text-base pt-2 border-t border-gray-100">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-bold text-gray-900 w-24 text-right">{fmtCur(quotation.grand_total)}</span>
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      {(quotation.notes || quotation.terms) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
          {quotation.notes && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{quotation.notes}</p>
            </div>
          )}
          {quotation.terms && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Terms & Conditions</p>
              <p className="text-sm text-gray-500 whitespace-pre-wrap">{quotation.terms}</p>
            </div>
          )}
        </div>
      )}

      {/* Template badge */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <FileText size={12} />
        Template: {quotation.template_id || "classic"}
      </div>
    </div>
  );
}

function fmtCur(n: number): string {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);
}
function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return ""; }
}
