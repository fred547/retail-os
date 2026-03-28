"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, ChevronRight, FileText, Send } from "lucide-react";
import { logError } from "@/lib/error-logger";

interface Line {
  product_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
  product_id: number | null;
}

const EMPTY_LINE: Line = { product_name: "", description: "", quantity: 1, unit_price: 0, discount_percent: 0, tax_rate: 15, product_id: null };

const TEMPLATES = [
  { id: "classic", name: "Classic", color: "#1976D2" },
  { id: "modern", name: "Modern", color: "#6366F1" },
  { id: "minimal", name: "Minimal", color: "#111827" },
  { id: "bold", name: "Bold", color: "#DC2626" },
  { id: "elegant", name: "Elegant", color: "#92400E" },
];

export default function CreateQuotationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Customer
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  // Step 2: Items
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }]);

  // Step 3: Review
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [validDays, setValidDays] = useState(30);
  const [templateId, setTemplateId] = useState("classic");

  // Products for autocomplete
  const [products, setProducts] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "product", select: "product_id, name, sellingprice, tax_id", filters: [{ column: "isactive", op: "eq", value: "Y" }], limit: 500 }),
    }).then((r) => r.json()).then((d) => setProducts(d.data ?? [])).catch((e: any) => { logError("CreateQuotation", `Failed to load products: ${e.message}`); });

    // Load default terms from template config
    fetch("/api/quotations/templates").then((r) => r.json()).then((d) => {
      const defaultTpl = d.templates?.find((t: any) => t.is_default) ?? d.templates?.[0];
      if (defaultTpl?.config) {
        if (defaultTpl.config.default_terms) setTerms(defaultTpl.config.default_terms);
        if (defaultTpl.config.default_valid_days) setValidDays(defaultTpl.config.default_valid_days);
        setTemplateId(defaultTpl.id);
      }
    }).catch((e: any) => { logError("CreateQuotation", `Failed to load templates: ${e.message}`); });
  }, []);

  const updateLine = (i: number, field: keyof Line, value: any) => {
    setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  };

  const addLine = () => setLines((prev) => [...prev, { ...EMPTY_LINE }]);
  const removeLine = (i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  const selectProduct = (i: number, product: any) => {
    setLines((prev) => prev.map((l, idx) => idx === i ? {
      ...l,
      product_id: product.product_id,
      product_name: product.name,
      unit_price: product.sellingprice,
    } : l));
  };

  // Calculations
  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unit_price * (1 - l.discount_percent / 100), 0);
  const taxTotal = lines.reduce((sum, l) => {
    const lt = l.quantity * l.unit_price * (1 - l.discount_percent / 100);
    return sum + lt * l.tax_rate / 100;
  }, 0);
  const grandTotal = subtotal + taxTotal;
  const validUntil = new Date(Date.now() + validDays * 86400000).toISOString().substring(0, 10);

  const handleCreate = async (andSend: boolean = false) => {
    if (lines.length === 0 || !lines.some((l) => l.product_name.trim())) return;
    setSaving(true);

    const res = await fetch("/api/quotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: customerName || null,
        customer_email: customerEmail || null,
        customer_phone: customerPhone || null,
        customer_address: customerAddress || null,
        notes: notes || null,
        terms: terms || null,
        valid_until: validUntil,
        template_id: templateId,
        lines: lines.filter((l) => l.product_name.trim()).map((l) => ({
          product_id: l.product_id,
          product_name: l.product_name,
          description: l.description || null,
          quantity: l.quantity,
          unit_price: l.unit_price,
          discount_percent: l.discount_percent,
          tax_rate: l.tax_rate,
        })),
      }),
    });

    const data = await res.json();
    if (data.quotation) {
      if (andSend) {
        await fetch(`/api/quotations/${data.quotation.quotation_id}/send`, { method: "POST" });
      }
      router.push(`/customer/quotations/${data.quotation.quotation_id}`);
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/customer/quotations" className="text-gray-400 hover:text-gray-600 p-1">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold text-gray-900">New Quotation</h1>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <button key={s} onClick={() => setStep(s)}
            className={`w-8 h-8 rounded-full text-sm font-bold transition ${
              step === s ? "bg-posterita-blue text-white" : step > s ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
            }`}>
            {s}
          </button>
        ))}
      </div>

      {/* Step 1: Customer */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Customer Details</h2>
          <p className="text-sm text-gray-500">Optional — you can create a quote without a customer.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Name</label>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="John Doe"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
              <input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="john@example.com" type="email"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Phone</label>
              <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+230 5XXX XXXX"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Address</label>
              <textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} rows={2} placeholder="Street, City, Country"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm resize-none" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={() => setStep(2)} className="flex items-center gap-1 bg-posterita-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Line Items */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Line Items</h2>

          <div className="space-y-3">
            {lines.map((line, i) => (
              <div key={i} className="flex gap-2 items-start bg-gray-50 rounded-lg p-3">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <input value={line.product_name} onChange={(e) => updateLine(i, "product_name", e.target.value)} placeholder="Product name"
                      list={`products-${i}`}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-posterita-blue outline-none" />
                    <datalist id={`products-${i}`}>
                      {products.map((p) => <option key={p.product_id} value={p.name} />)}
                    </datalist>
                    <input type="number" value={line.quantity} onChange={(e) => updateLine(i, "quantity", parseFloat(e.target.value) || 0)} placeholder="Qty"
                      className="w-16 px-2 py-2 rounded-lg border border-gray-200 text-sm text-center focus:border-posterita-blue outline-none" />
                    <input type="number" step="0.01" value={line.unit_price || ""} onChange={(e) => updateLine(i, "unit_price", parseFloat(e.target.value) || 0)} placeholder="Price"
                      className="w-24 px-2 py-2 rounded-lg border border-gray-200 text-sm text-right focus:border-posterita-blue outline-none" />
                  </div>
                  <div className="flex gap-2">
                    <input value={line.description} onChange={(e) => updateLine(i, "description", e.target.value)} placeholder="Description (optional)"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 focus:border-posterita-blue outline-none" />
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">Disc</span>
                      <input type="number" value={line.discount_percent || ""} onChange={(e) => updateLine(i, "discount_percent", parseFloat(e.target.value) || 0)} placeholder="%"
                        className="w-14 px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-center focus:border-posterita-blue outline-none" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">Tax</span>
                      <input type="number" value={line.tax_rate} onChange={(e) => updateLine(i, "tax_rate", parseFloat(e.target.value) || 0)} placeholder="%"
                        className="w-14 px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-center focus:border-posterita-blue outline-none" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 pt-1">
                  <span className="text-sm font-bold text-gray-900 w-20 text-right">
                    {(line.quantity * line.unit_price * (1 - line.discount_percent / 100)).toFixed(2)}
                  </span>
                  {lines.length > 1 && (
                    <button onClick={() => removeLine(i)} className="text-gray-300 hover:text-red-500 transition p-1">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button onClick={addLine} className="flex items-center gap-1 text-posterita-blue text-sm font-medium hover:underline">
            <Plus size={14} /> Add line item
          </button>

          {/* Running total */}
          <div className="border-t border-gray-200 pt-3 space-y-1 text-right">
            <div className="flex justify-end gap-6 text-sm"><span className="text-gray-500">Subtotal</span><span className="font-medium w-24">{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-end gap-6 text-sm"><span className="text-gray-500">Tax</span><span className="font-medium w-24">{taxTotal.toFixed(2)}</span></div>
            <div className="flex justify-end gap-6 text-base font-bold"><span>Total</span><span className="w-24">{grandTotal.toFixed(2)}</span></div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="text-gray-500 text-sm hover:underline">Back</button>
            <button onClick={() => setStep(3)} disabled={!lines.some((l) => l.product_name.trim())}
              className="flex items-center gap-1 bg-posterita-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-40">
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Template */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Template picker */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Choose Template</h2>
            <div className="flex gap-2">
              {TEMPLATES.map((t) => (
                <button key={t.id} onClick={() => setTemplateId(t.id)}
                  className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition ${
                    templateId === t.id ? "border-posterita-blue bg-blue-50" : "border-gray-100 hover:border-gray-200"
                  }`}>
                  <div className="w-8 h-10 rounded" style={{ backgroundColor: t.color }} />
                  <span className="text-xs font-medium">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Notes & Terms</h2>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Notes (visible on PDF)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any notes for the customer..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-posterita-blue outline-none resize-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Terms & Conditions</label>
              <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} placeholder="Payment terms, delivery conditions..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-posterita-blue outline-none resize-none" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500">Valid for</label>
              <input type="number" value={validDays} onChange={(e) => setValidDays(parseInt(e.target.value) || 30)}
                className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-center" />
              <span className="text-xs text-gray-500">days (until {validUntil})</span>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-2">Summary</h2>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Customer: {customerName || "—"}</p>
              <p>Items: {lines.filter((l) => l.product_name.trim()).length}</p>
              <p className="text-lg font-bold text-gray-900">Total: {grandTotal.toFixed(2)}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="text-gray-500 text-sm hover:underline">Back</button>
            <div className="flex gap-2">
              <button onClick={() => handleCreate(false)} disabled={saving}
                className="flex items-center gap-1 bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-40">
                <FileText size={14} /> Save as Draft
              </button>
              <button onClick={() => handleCreate(true)} disabled={saving}
                className="flex items-center gap-1 bg-posterita-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-40">
                <Send size={14} /> Create & Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
