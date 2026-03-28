"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Tag, Plus, Percent, Gift, Ticket, Clock,
  ToggleLeft, ToggleRight, Edit2, Trash2, X, RefreshCw, AlertCircle,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { logError } from "@/lib/error-logger";

interface Promotion {
  id: number;
  name: string;
  description: string | null;
  type: string;
  discount_value: number;
  buy_quantity: number | null;
  get_quantity: number | null;
  applies_to: string;
  promo_code: string | null;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  max_uses: number | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_active: boolean;
  priority: number;
  usage_count: number;
}

const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
  percentage_off: { icon: Percent, color: "bg-green-50 text-green-600", label: "% Off" },
  fixed_off: { icon: Tag, color: "bg-blue-50 text-blue-600", label: "Fixed Off" },
  buy_x_get_y: { icon: Gift, color: "bg-purple-50 text-purple-600", label: "Buy X Get Y" },
  promo_code: { icon: Ticket, color: "bg-orange-50 text-orange-600", label: "Promo Code" },
};

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Form
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formType, setFormType] = useState("percentage_off");
  const [formValue, setFormValue] = useState(10);
  const [formBuyQty, setFormBuyQty] = useState(2);
  const [formGetQty, setFormGetQty] = useState(1);
  const [formCode, setFormCode] = useState("");
  const [formMinOrder, setFormMinOrder] = useState(0);
  const [formMaxDiscount, setFormMaxDiscount] = useState(0);
  const [formMaxUses, setFormMaxUses] = useState(0);
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");

  const loadPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/promotions");
      const data = await res.json();
      setPromotions(data.promotions || []);
    } catch (e: any) {
      logError("Promotions", `Failed to load promotions: ${e.message}`);
      console.error(e);
      setError("Failed to load promotions. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPromotions(); }, [loadPromotions]);

  const createPromo = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          description: formDesc,
          type: formType,
          discount_value: formValue,
          buy_quantity: formType === "buy_x_get_y" ? formBuyQty : null,
          get_quantity: formType === "buy_x_get_y" ? formGetQty : null,
          promo_code: formType === "promo_code" ? formCode : null,
          min_order_amount: formMinOrder || null,
          max_discount_amount: formMaxDiscount || null,
          max_uses: formMaxUses || null,
          start_date: formStartDate || null,
          end_date: formEndDate || null,
        }),
      });
      setShowCreate(false);
      resetForm();
      loadPromotions();
      showFeedback("Promotion created");
    } catch (e: any) {
      logError("Promotions", `Failed to create promotion: ${e.message}`);
      console.error(e);
      setError("Failed to create promotion. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormName(""); setFormDesc(""); setFormType("percentage_off");
    setFormValue(10); setFormCode(""); setFormMinOrder(0);
    setFormMaxDiscount(0); setFormMaxUses(0);
    setFormStartDate(""); setFormEndDate("");
  };

  const toggleActive = async (id: number, current: boolean) => {
    await fetch(`/api/promotions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !current }),
    });
    loadPromotions();
    showFeedback("Promotion updated");
  };

  const deletePromo = async (id: number) => {
    await fetch(`/api/promotions/${id}`, { method: "DELETE" });
    loadPromotions();
    showFeedback("Promotion deleted");
  };

  if (loading && promotions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
        Loading promotions...
      </div>
    );
  }

  const active = promotions.filter((p) => p.is_active);
  const inactive = promotions.filter((p) => !p.is_active);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Promotions" }]} />
      {feedback && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-fade-in">
          {feedback}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600 shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag size={28} className="text-green-500" />
            Promotions
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {active.length} active, {inactive.length} inactive
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowCreate(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-posterita-blue hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors">
          <Plus size={16} /> New Promotion
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(typeConfig).map(([key, tc]) => {
          const count = promotions.filter((p) => p.type === key && p.is_active).length;
          const Icon = tc.icon;
          return (
            <div key={key} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tc.color}`}>
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{tc.label}</p>
                  <p className="text-xl font-bold text-gray-900">{count}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Promotion Cards */}
      <div className="space-y-3">
        {promotions.map((p) => {
          const tc = typeConfig[p.type] || typeConfig.percentage_off;
          const Icon = tc.icon;
          return (
            <div key={p.id} className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 ${!p.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tc.color}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tc.color}`}>
                        {tc.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {p.type === "percentage_off" && `${p.discount_value}% off`}
                      {p.type === "fixed_off" && `${p.discount_value} off`}
                      {p.type === "buy_x_get_y" && `Buy ${p.buy_quantity}, get ${p.get_quantity} free`}
                      {p.type === "promo_code" && `Code: ${p.promo_code} — ${p.discount_value} off`}
                      {p.min_order_amount ? ` (min ${p.min_order_amount})` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{p.usage_count} uses</span>
                  <button onClick={() => toggleActive(p.id, p.is_active)} className="text-gray-400 hover:text-gray-600">
                    {p.is_active ? <ToggleRight size={24} className="text-green-500" /> : <ToggleLeft size={24} />}
                  </button>
                  <button onClick={() => setConfirmDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {(p.start_date || p.end_date || p.start_time) && (
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                  <Clock size={12} />
                  {p.start_date && <span>From {new Date(p.start_date).toLocaleDateString()}</span>}
                  {p.end_date && <span>Until {new Date(p.end_date).toLocaleDateString()}</span>}
                  {p.start_time && p.end_time && <span>{p.start_time}–{p.end_time}</span>}
                </div>
              )}
              {p.description && <p className="mt-1 text-xs text-gray-400">{p.description}</p>}
            </div>
          );
        })}
      </div>

      {promotions.length === 0 && !loading && (
        <div className="text-center py-16">
          <Tag size={48} className="mx-auto text-gray-300" />
          <h3 className="text-lg font-medium text-gray-700 mt-4">No promotions yet</h3>
          <p className="text-gray-500 mt-1">
            Create promotions to offer discounts, buy-one-get-one deals, or promo codes to your customers.
          </p>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4">
            <h3 className="font-semibold text-gray-900">Delete Promotion?</h3>
            <p className="text-sm text-gray-500 mt-2">This will permanently remove this promotion. This action cannot be undone.</p>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={() => { deletePromo(confirmDelete); setConfirmDelete(null); }} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Sheet */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">New Promotion</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Happy Hour 20% Off"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={formType} onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20">
                  <option value="percentage_off">Percentage Off (%)</option>
                  <option value="fixed_off">Fixed Amount Off</option>
                  <option value="buy_x_get_y">Buy X Get Y Free</option>
                  <option value="promo_code">Promo Code</option>
                </select>
              </div>

              {formType !== "buy_x_get_y" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formType === "percentage_off" ? "Discount (%)" : "Discount Amount"}
                  </label>
                  <input type="number" value={formValue} onChange={(e) => setFormValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" min={0} step={formType === "percentage_off" ? 1 : 0.01} />
                </div>
              )}

              {formType === "buy_x_get_y" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Buy Quantity</label>
                    <input type="number" value={formBuyQty} onChange={(e) => setFormBuyQty(parseInt(e.target.value) || 1)} min={1}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Get Free</label>
                    <input type="number" value={formGetQty} onChange={(e) => setFormGetQty(parseInt(e.target.value) || 1)} min={1}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
                  </div>
                </div>
              )}

              {formType === "promo_code" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Promo Code</label>
                  <input type="text" value={formCode} onChange={(e) => setFormCode(e.target.value.toUpperCase())} placeholder="e.g., SUMMER20"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Amount</label>
                  <input type="number" value={formMinOrder} onChange={(e) => setFormMinOrder(parseFloat(e.target.value) || 0)} min={0} step={0.01}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses (0=unlimited)</label>
                  <input type="number" value={formMaxUses} onChange={(e) => setFormMaxUses(parseInt(e.target.value) || 0)} min={0}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={createPromo} disabled={saving || !formName.trim()}
                className="px-6 py-2.5 bg-posterita-blue hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors disabled:opacity-50">
                {saving ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
