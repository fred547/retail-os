"use client";

import { useState, useMemo } from "react";
import { Users, Building2, Pencil, X, Save, KeyRound, Search } from "lucide-react";
import { dataUpdate } from "@/lib/supabase/data-client";

interface Owner {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  brand_count: number;
}

export default function OwnerList({ owners }: { owners: Owner[] }) {
  const [search, setSearch] = useState("");
  const [hideTestAccounts, setHideTestAccounts] = useState(true);

  const filtered = useMemo(() => {
    let list = owners;
    if (hideTestAccounts) {
      list = list.filter((o) => !o.email.includes("@test.posterita.com"));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          (o.name || "").toLowerCase().includes(q) ||
          o.email.toLowerCase().includes(q) ||
          (o.phone || "").includes(q)
      );
    }
    return list;
  }, [owners, search, hideTestAccounts]);

  const active = filtered.filter((o) => o.is_active).length;
  const withPhone = filtered.filter((o) => o.phone).length;

  const [editOwner, setEditOwner] = useState<Owner | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const openEdit = (o: Owner) => {
    setEditOwner(o);
    setForm({ name: o.name || "", email: o.email || "", phone: o.phone || "" });
    setSaveOk(false);
    setResetSent(false);
  };

  const saveOwner = async () => {
    if (!editOwner) return;
    setSaving(true);
    // Use dedicated owner API (not data proxy — owner table blocked for security)
    await fetch(`/api/owner/${editOwner.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name || null, email: form.email, phone: form.phone || null }),
    });
    setSaving(false);
    setSaveOk(true);
    setTimeout(() => setSaveOk(false), 2000);
  };

  const resetPassword = async () => {
    if (!editOwner) return;
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      if (res.ok) {
        setResetSent(true);
        setTimeout(() => setResetSent(false), 5000);
      }
    } catch (_) {}
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Total Owners</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{owners.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{active}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">With Phone</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{withPhone}</p>
        </div>
      </div>

      {/* Edit panel */}
      {editOwner && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Edit Owner</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={saveOwner}
                disabled={saving}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition ${
                  saveOk ? "bg-green-600 text-white" : "bg-posterita-blue text-white hover:bg-blue-700"
                } disabled:opacity-50`}
              >
                <Save size={16} />
                {saveOk ? "Saved!" : saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setEditOwner(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+230 5XXX XXXX"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={resetPassword}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                resetSent
                  ? "bg-green-100 text-green-700"
                  : "bg-orange-50 text-orange-700 hover:bg-orange-100"
              }`}
            >
              <KeyRound size={16} />
              {resetSent ? "Reset email sent!" : "Send Password Reset"}
            </button>
            <span className="text-xs text-gray-400">Owner ID: {editOwner.id}</span>
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={hideTestAccounts}
            onChange={(e) => setHideTestAccounts(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-posterita-blue focus:ring-posterita-blue"
          />
          Hide test accounts
        </label>
      </div>

      {/* Owner list */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Owner</th>
              <th>Email</th>
              <th>Phone</th>
              <th className="text-center">Brands</th>
              <th>Joined</th>
              <th className="text-center">Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className={editOwner?.id === o.id ? "bg-blue-50" : ""}>
                <td className="font-medium">{o.name || "—"}</td>
                <td className="text-sm text-gray-500">{o.email}</td>
                <td className="text-sm text-gray-500">{o.phone || "—"}</td>
                <td className="text-center">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    <Building2 size={12} />
                    {o.brand_count}
                  </span>
                </td>
                <td className="text-sm text-gray-500">
                  {new Date(o.created_at).toLocaleDateString()}
                </td>
                <td className="text-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      o.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {o.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="text-right">
                  <button
                    onClick={() => openEdit(o)}
                    className="p-1.5 text-gray-400 hover:text-posterita-blue transition"
                    title="Edit owner"
                  >
                    <Pencil size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
