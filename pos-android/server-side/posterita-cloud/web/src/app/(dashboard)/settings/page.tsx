"use client";

import { useEffect, useState } from "react";
import { dataQuery, dataUpdate } from "@/lib/supabase/data-client";
import { Settings, Store, CreditCard, Receipt, Save, Check, Bot, Eye, EyeOff, Shield } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { useToast } from "@/components/Toast";

interface StoreInfo {
  store_id: number;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  currency: string | null;
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

  // Tax compliance (MRA)
  interface TaxConfig {
    account_id: string;
    country: string;
    tax_system: string;
    brn: string;
    tan: string;
    vat_reg_no: string;
    api_username: string;
    api_password: string;
    ebs_machine_id: string;
    area_code: string;
    is_enabled: boolean;
  }
  const [taxConfig, setTaxConfig] = useState<Partial<TaxConfig>>({});
  const [taxSaving, setTaxSaving] = useState(false);
  const [taxSaved, setTaxSaved] = useState(false);
  const [taxPasswordVisible, setTaxPasswordVisible] = useState(false);
  const [countryModules, setCountryModules] = useState<string[]>([]);

  const fetchSettings = async () => {
    setLoading(true);

    // Fetch country modules from billing plan (non-blocking)
    try {
      const planRes = await fetch("/api/billing/plan");
      if (planRes.ok) {
        const planData = await planRes.json();
        setCountryModules(planData.country_modules ?? []);
      }
    } catch (_) { /* non-blocking */ }

    const [storeRes, prefRes, taxRes] = await Promise.all([
      dataQuery<StoreInfo>("store", {
        select: "store_id, name, address, city, country, currency",
      }),
      dataQuery<PreferenceInfo>("preference", {
        select: "preference_id, ai_api_key",
      }),
      dataQuery<TaxConfig>("account_tax_config", {
        select: "account_id, country, tax_system, brn, tan, vat_reg_no, api_username, api_password, ebs_machine_id, area_code, is_enabled",
      }),
    ]);
    const s = storeRes.data?.[0] ?? null;
    setStore(s);
    if (s) setForm(s);
    const p = prefRes.data?.[0] ?? null;
    setPreference(p);
    if (p) setAiKey(p.ai_api_key ?? "");
    const t = taxRes.data?.[0] ?? null;
    if (t) setTaxConfig(t);
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
        country: form.country,
        currency: form.currency,
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
        </div>
      </div>

      {/* Tax Compliance (MRA) — only visible for Mauritius accounts */}
      {countryModules.includes("mra_einvoicing") && <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-red-50 rounded-lg">
            <Shield size={20} className="text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Tax Compliance</h2>
            <p className="text-sm text-gray-500">
              MRA e-invoicing for Mauritius — connect to submit invoices automatically
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={taxConfig.is_enabled ?? false}
              onChange={(e) => setTaxConfig({ ...taxConfig, is_enabled: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-posterita-blue focus:ring-posterita-blue"
            />
            <span className="text-sm font-medium text-gray-700">Enable MRA e-invoicing</span>
          </label>
          {taxConfig.is_enabled && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
          )}
        </div>

        {taxConfig.is_enabled && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">BRN</label>
                <input
                  type="text"
                  value={taxConfig.brn ?? ""}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase();
                    setTaxConfig({ ...taxConfig, brn: v });
                  }}
                  placeholder="C07062336"
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none font-mono ${
                    taxConfig.brn && !/^[IC]\d{7,9}$/.test(taxConfig.brn)
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-200 focus:border-posterita-blue focus:ring-posterita-blue/20"
                  }`}
                />
                {taxConfig.brn && !/^[IC]\d{7,9}$/.test(taxConfig.brn) ? (
                  <p className="text-xs text-red-500 mt-1">BRN must start with I or C followed by 7-9 digits</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">Business Registration Number (e.g. C07062336)</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TAN</label>
                <input
                  type="text"
                  value={taxConfig.tan ?? ""}
                  onChange={(e) => setTaxConfig({ ...taxConfig, tan: e.target.value.replace(/\D/g, "").slice(0, 8) })}
                  placeholder="20351590"
                  maxLength={8}
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none font-mono ${
                    taxConfig.tan && !/^\d{8}$/.test(taxConfig.tan)
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-200 focus:border-posterita-blue focus:ring-posterita-blue/20"
                  }`}
                />
                {taxConfig.tan && !/^\d{8}$/.test(taxConfig.tan) ? (
                  <p className="text-xs text-red-500 mt-1">TAN must be exactly 8 digits</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">Tax Account Number (8 digits)</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">MRA Username</label>
                <input
                  type="text"
                  value={taxConfig.api_username ?? ""}
                  onChange={(e) => setTaxConfig({ ...taxConfig, api_username: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">MRA Password</label>
                <div className="relative">
                  <input
                    type={taxPasswordVisible ? "text" : "password"}
                    value={taxConfig.api_password ?? ""}
                    onChange={(e) => setTaxConfig({ ...taxConfig, api_password: e.target.value })}
                    className="w-full px-4 py-2 pr-10 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setTaxPasswordVisible(!taxPasswordVisible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {taxPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">EBS Machine ID</label>
                <input
                  type="text"
                  value={taxConfig.ebs_machine_id ?? ""}
                  onChange={(e) => setTaxConfig({ ...taxConfig, ebs_machine_id: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none font-mono text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">Registered with MRA for this outlet</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area Code</label>
                <input
                  type="text"
                  value={taxConfig.area_code ?? ""}
                  onChange={(e) => setTaxConfig({ ...taxConfig, area_code: e.target.value })}
                  placeholder="100"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={async () => {
                  setTaxSaving(true);
                  // Upsert via fetch to handle both create and update
                  const res = await fetch("/api/data/insert", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      table: "account_tax_config",
                      data: {
                        country: taxConfig.country || "MU",
                        tax_system: taxConfig.tax_system || "mra_ebs",
                        brn: taxConfig.brn || null,
                        tan: taxConfig.tan || null,
                        api_username: taxConfig.api_username || null,
                        api_password: taxConfig.api_password || null,
                        ebs_machine_id: taxConfig.ebs_machine_id || null,
                        area_code: taxConfig.area_code || null,
                        is_enabled: taxConfig.is_enabled ?? false,
                        updated_at: new Date().toISOString(),
                      },
                    }),
                  });
                  if (!res.ok) {
                    // Insert failed (already exists) — try update
                    await dataUpdate("account_tax_config", { column: "account_id", value: taxConfig.account_id || "" }, {
                      brn: taxConfig.brn || null,
                      tan: taxConfig.tan || null,
                      api_username: taxConfig.api_username || null,
                      api_password: taxConfig.api_password || null,
                      ebs_machine_id: taxConfig.ebs_machine_id || null,
                      area_code: taxConfig.area_code || null,
                      is_enabled: taxConfig.is_enabled ?? false,
                      updated_at: new Date().toISOString(),
                    });
                  }
                  setTaxSaving(false);
                  setTaxSaved(true);
                  setTimeout(() => setTaxSaved(false), 2000);
                }}
                disabled={taxSaving}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50 text-sm"
              >
                {taxSaved ? <><Check size={16} /> Saved</> : <><Save size={16} /> {taxSaving ? "Saving..." : "Save Tax Config"}</>}
              </button>
            </div>
          </>
        )}
      </div>}

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
