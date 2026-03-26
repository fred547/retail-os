"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Truck, Plus, Search, Phone, Mail, MapPin,
  Edit2, Trash2, X, RefreshCw, ChevronRight,
} from "lucide-react";

interface Supplier {
  supplier_id: number;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  tax_id: string | null;
  payment_terms: string | null;
  notes: string | null;
  is_active: boolean;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formCountry, setFormCountry] = useState("");
  const [formTaxId, setFormTaxId] = useState("");
  const [formTerms, setFormTerms] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      setSuppliers(data.suppliers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  const resetForm = () => {
    setFormName(""); setFormContact(""); setFormPhone(""); setFormEmail("");
    setFormAddress(""); setFormCity(""); setFormCountry("");
    setFormTaxId(""); setFormTerms(""); setFormNotes("");
  };

  const openCreate = () => {
    resetForm();
    setEditing(null);
    setShowCreate(true);
  };

  const openEdit = (s: Supplier) => {
    setFormName(s.name || "");
    setFormContact(s.contact_name || "");
    setFormPhone(s.phone || "");
    setFormEmail(s.email || "");
    setFormAddress(s.address || "");
    setFormCity(s.city || "");
    setFormCountry(s.country || "");
    setFormTaxId(s.tax_id || "");
    setFormTerms(s.payment_terms || "");
    setFormNotes(s.notes || "");
    setEditing(s);
    setShowCreate(true);
  };

  const saveSupplier = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: formName, contact_name: formContact, phone: formPhone, email: formEmail,
        address: formAddress, city: formCity, country: formCountry,
        tax_id: formTaxId, payment_terms: formTerms, notes: formNotes,
      };

      if (editing) {
        await fetch(`/api/suppliers/${editing.supplier_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setShowCreate(false);
      loadSuppliers();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const deleteSupplier = async (id: number) => {
    try {
      await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
      loadSuppliers();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading && suppliers.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
        Loading suppliers...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck size={28} className="text-blue-500" />
            Suppliers
          </h1>
          <p className="text-sm text-gray-500 mt-1">{suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors"
        >
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, contact, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
      </div>

      {/* Supplier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suppliers.map((s) => (
          <div key={s.supplier_id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <Truck size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{s.name}</p>
                  {s.contact_name && <p className="text-xs text-gray-500">{s.contact_name}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => deleteSupplier(s.supplier_id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-1">
              {s.phone && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Phone size={12} /> {s.phone}
                </div>
              )}
              {s.email && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Mail size={12} /> {s.email}
                </div>
              )}
              {(s.city || s.country) && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <MapPin size={12} /> {[s.city, s.country].filter(Boolean).join(", ")}
                </div>
              )}
            </div>

            {(s.payment_terms || s.tax_id) && (
              <div className="mt-3 flex items-center gap-2">
                {s.payment_terms && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{s.payment_terms}</span>
                )}
                {s.tax_id && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Tax: {s.tax_id}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {suppliers.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400">
          <Truck size={40} className="mx-auto mb-3 text-gray-300" />
          <p>No suppliers yet. Add your first supplier to start creating purchase orders.</p>
        </div>
      )}

      {/* Create/Edit Bottom Sheet */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing ? "Edit Supplier" : "Add Supplier"}
              </h2>
              <button onClick={() => setShowCreate(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                <input type="text" value={formContact} onChange={(e) => setFormContact(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input type="text" value={formAddress} onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input type="text" value={formCity} onChange={(e) => setFormCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input type="text" value={formCountry} onChange={(e) => setFormCountry(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
                  <input type="text" value={formTaxId} onChange={(e) => setFormTaxId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                  <input type="text" value={formTerms} onChange={(e) => setFormTerms(e.target.value)} placeholder="e.g., Net 30"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button
                onClick={saveSupplier}
                disabled={saving || !formName.trim()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
