"use client";

import { useEffect, useState } from "react";
import { dataQuery, dataUpdate } from "@/lib/supabase/data-client";
import { Settings, Store, CreditCard, Receipt, Save, Check, Bot, Eye, EyeOff } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { useToast } from "@/components/Toast";

interface StoreInfo {
  store_id: number;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  currency: string | null;
  tax_number: string | null;
}

interface PreferenceInfo {
  preference_id: number;
  ai_api_key: string | null;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<Partial<StoreInfo>>({});
  const [preference, setPreference] = useState<PreferenceInfo | null>(null);
  const [aiKey, setAiKey] = useState("");
  const [aiKeyVisible, setAiKeyVisible] = useState(false);
  const [aiKeySaving, setAiKeySaving] = useState(false);
  const [aiKeySaved, setAiKeySaved] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    const [storeRes, prefRes] = await Promise.all([
      dataQuery<StoreInfo>("store", {
        select: "store_id, name, address, city, phone, email, currency, tax_number",
      }),
      dataQuery<PreferenceInfo>("preference", {
        select: "preference_id, ai_api_key",
      }),
    ]);
    const s = storeRes.data?.[0] ?? null;
    setStore(s);
    if (s) setForm(s);
    const p = prefRes.data?.[0] ?? null;
    setPreference(p);
    if (p) setAiKey(p.ai_api_key ?? "");
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!store) return;
    setSaving(true);
    await dataUpdate(
      "store",
      { column: "store_id", value: store.store_id },
      {
        name: form.name,
        address: form.address,
        city: form.city,
        phone: form.phone,
        email: form.email,
        currency: form.currency,
        tax_number: form.tax_number,
      }
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveAiKey = async () => {
    if (!preference) return;
    if (aiKey && !aiKey.startsWith("sk-ant-")) {
      toast({ title: "Invalid key", description: "Claude API keys start with sk-ant-", variant: "error" });
      return;
    }
    setAiKeySaving(true);
    await dataUpdate(
      "preference",
      { column: "preference_id", value: preference.preference_id },
      { ai_api_key: aiKey }
    );
    setAiKeySaving(false);
    setAiKeySaved(true);
    setTimeout(() => setAiKeySaved(false), 2000);
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">Loading...</div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Breadcrumb items={[{ label: "Settings" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">
            Manage your store configuration
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-posterita-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {saved ? (
            <>
              <Check size={18} />
              Saved
            </>
          ) : (
            <>
              <Save size={18} />
              {saving ? "Saving..." : "Save Changes"}
            </>
          )}
        </button>
      </div>

      {/* Store Information */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Store size={20} className="text-posterita-blue" />
          </div>
          <h2 className="text-lg font-semibold">Store Information</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store Name
            </label>
            <input
              type="text"
              value={form.name ?? ""}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              value={form.city ?? ""}
              onChange={(e) => updateField("city", e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <input
            type="text"
            value={form.address ?? ""}
            onChange={(e) => updateField("address", e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
          />
        </div>
      </div>

      {/* Contact Details */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-50 rounded-lg">
            <CreditCard size={20} className="text-green-600" />
          </div>
          <h2 className="text-lg font-semibold">Contact Details</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => updateField("email", e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="text"
              value={form.phone ?? ""}
              onChange={(e) => updateField("phone", e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Tax & Currency */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-orange-50 rounded-lg">
            <Receipt size={20} className="text-orange-600" />
          </div>
          <h2 className="text-lg font-semibold">Tax & Currency</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <input
              type="text"
              value={form.currency ?? ""}
              onChange={(e) => updateField("currency", e.target.value)}
              placeholder="e.g. MUR, USD, EUR"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tax Registration Number
            </label>
            <input
              type="text"
              value={form.tax_number ?? ""}
              onChange={(e) => updateField("tax_number", e.target.value)}
              placeholder="VAT / TIN number"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
            />
          </div>
        </div>
      </div>

      {/* AI Configuration */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-50 rounded-lg">
            <Bot size={20} className="text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">AI Configuration</h2>
            <p className="text-sm text-gray-500">
              Required for AI product scan and website import on POS terminals
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Claude API Key
          </label>
          <div className="relative">
            <input
              type={aiKeyVisible ? "text" : "password"}
              value={aiKey}
              onChange={(e) => {
                setAiKey(e.target.value);
                setAiKeySaved(false);
              }}
              placeholder="sk-ant-..."
              className="w-full px-4 py-2 pr-10 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setAiKeyVisible(!aiKeyVisible)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {aiKeyVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSaveAiKey}
            disabled={aiKeySaving || !preference}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 text-sm"
          >
            {aiKeySaved ? (
              <>
                <Check size={16} />
                Saved
              </>
            ) : (
              <>
                <Save size={16} />
                {aiKeySaving ? "Saving..." : "Save API Key"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
