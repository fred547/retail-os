"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Building2,
  Loader2,
  Mail,
  Phone,
  Key,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react";
import { logError } from "@/lib/error-logger";

type CreateAccountResult = {
  account_id: string;
  businessname: string;
  owner_email: string | null;
  owner_phone: string | null;
  temp_password: string | null;
  account_type: string;
  account_status: string;
  message: string;
};

export default function CreateAccountForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CreateAccountResult | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    businessname: "",
    phone: "",
    email: "",
    type: "trial",
    currency: "MUR",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    if (!form.phone.trim() && !form.email.trim()) {
      setError("Add at least a phone number or an email for the owner.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/platform/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create account");
        setLoading(false);
        return;
      }

      setResult(data);
      setLoading(false);

      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (e: any) {
      logError("Platform.CreateAccountForm", "Failed to create account", { businessname: form.businessname, error: e?.message });
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!result) return;

    const loginDetails =
      result.owner_email && result.temp_password
        ? `Email: ${result.owner_email}\nTemporary Password: ${result.temp_password}\nPortal: https://web.posterita.com/customer/login`
        : `Owner Phone: ${result.owner_phone || "Not provided"}\nPortal: https://web.posterita.com/customer/login`;

    const text = [
      "Posterita Customer Account",
      `Business: ${result.businessname}`,
      `Account ID: ${result.account_id}`,
      `Type: ${result.account_type}`,
      `Status: ${result.account_status}`,
      loginDetails,
    ].join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDone = () => {
    setResult(null);
    setForm({
      businessname: "",
      phone: "",
      email: "",
      type: "trial",
      currency: "MUR",
    });
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-white rounded-xl border-2 border-dashed border-gray-200 p-6 hover:border-posterita-blue hover:bg-blue-50/30 transition group"
      >
        <div className="flex items-center justify-center gap-3">
          <div className="bg-gray-100 group-hover:bg-posterita-blue/10 p-2 rounded-lg transition">
            <Plus
              size={20}
              className="text-gray-400 group-hover:text-posterita-blue transition"
            />
          </div>
          <span className="font-medium text-gray-500 group-hover:text-posterita-blue transition">
            Create Customer Account
          </span>
        </div>
      </button>
    );
  }

  if (result) {
    return (
      <div className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-green-100 bg-green-50 flex items-center gap-2">
          <Check size={18} className="text-green-600" />
          <h2 className="font-semibold text-green-900">
            Account Created Successfully
          </h2>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {result.businessname}
              </h3>
              <span className="text-xs text-gray-400 font-mono">
                {result.account_id}
              </span>
            </div>

            <div className="border-t border-gray-200 pt-3 space-y-2">
              {result.owner_email && (
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-gray-400" />
                  <div>
                    <span className="text-xs text-gray-500 block">
                      Owner Email
                    </span>
                    <span className="font-medium text-gray-900">
                      {result.owner_email}
                    </span>
                  </div>
                </div>
              )}
              {result.owner_phone && (
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-gray-400" />
                  <div>
                    <span className="text-xs text-gray-500 block">
                      Owner Phone
                    </span>
                    <span className="font-medium text-gray-900">
                      {result.owner_phone}
                    </span>
                  </div>
                </div>
              )}
              {result.temp_password && (
                <div className="flex items-center gap-3">
                  <Key size={16} className="text-gray-400" />
                  <div>
                    <span className="text-xs text-gray-500 block">
                      Temporary Password
                    </span>
                    <span className="font-mono font-bold text-lg text-posterita-blue">
                      {result.temp_password}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Building2 size={16} className="text-gray-400" />
                <div>
                  <span className="text-xs text-gray-500 block">
                    Lifecycle
                  </span>
                  <span className="font-medium text-gray-900 capitalize">
                    {result.account_type} /{" "}
                    {result.account_status.replaceAll("_", " ")}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>
                {result.temp_password
                  ? "Share these credentials with the owner. They will be asked to change their password on first login."
                  : "This account was created in testing mode without email login credentials yet. You can keep validating it and complete onboarding later."}
              </span>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={handleCopyCredentials}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              {copied ? (
                <Check size={16} className="text-green-600" />
              ) : (
                <Copy size={16} />
              )}
              {copied ? "Copied!" : "Copy Login Details"}
            </button>
            <button
              onClick={handleDone}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-posterita-blue text-white text-sm font-medium hover:bg-blue-700 transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-posterita-blue" />
          <h2 className="font-semibold text-gray-900">
            Create Customer Account
          </h2>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4 flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Name
            </label>
            <input
              type="text"
              value={form.businessname}
              onChange={(e) =>
                setForm({ ...form, businessname: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              placeholder="My Business"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Owner Phone
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              placeholder="+2301234567"
            />
            <p className="text-xs text-gray-400 mt-1">
              Best for testing and early onboarding
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Owner Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              placeholder="owner@business.com"
            />
            <p className="text-xs text-gray-400 mt-1">
              Optional now. Needed for full customer web login.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Type
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none bg-white"
            >
              <option value="demo">Demo</option>
              <option value="trial">Trial</option>
              <option value="live">Live</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
            >
              <option value="MUR">MUR - Mauritian Rupee</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="INR">INR - Indian Rupee</option>
              <option value="ZAR">ZAR - South African Rand</option>
              <option value="AUD">AUD - Australian Dollar</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-posterita-blue text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </div>
      </form>
    </div>
  );
}
