"use client";

import { useEffect, useState, useCallback } from "react";
import { Save, X } from "lucide-react";
import { dataUpdate } from "@/lib/supabase/data-client";
import { useToast } from "@/components/Toast";
import { useRouter } from "next/navigation";

export interface Customer {
  customer_id: number;
  name: string;
  email: string | null;
  phone1: string | null;
  phone2: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  isactive: string;
  loyaltypoints: number;
}

interface CustomerForm {
  name: string;
  email: string;
  phone1: string;
  phone2: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  isactive: string;
}

export default function CustomerEditModal({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CustomerForm>({
    name: customer.name ?? "",
    email: customer.email ?? "",
    phone1: customer.phone1 ?? "",
    phone2: customer.phone2 ?? "",
    address1: customer.address1 ?? "",
    address2: customer.address2 ?? "",
    city: customer.city ?? "",
    state: customer.state ?? "",
    zip: customer.zip ?? "",
    country: customer.country ?? "",
    isactive: customer.isactive ?? "Y",
  });

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Customer name is required.", variant: "warning" });
      return;
    }

    setSaving(true);
    await dataUpdate(
      "customer",
      { column: "customer_id", value: customer.customer_id },
      {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone1: form.phone1.trim() || null,
        phone2: form.phone2.trim() || null,
        address1: form.address1.trim() || null,
        address2: form.address2.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        zip: form.zip.trim() || null,
        country: form.country.trim() || null,
        isactive: form.isactive,
      }
    );
    setSaving(false);
    onClose();
    router.refresh();
  };

  const updateField = (field: keyof CustomerForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-customer-title"
        className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4 md:hidden" />
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-posterita-blue/10 rounded-full flex items-center justify-center">
              <span className="text-posterita-blue font-bold text-lg">
                {customer.name?.charAt(0)?.toUpperCase() ?? "?"}
              </span>
            </div>
            <div>
              <h2
                id="edit-customer-title"
                className="text-lg font-semibold"
              >
                Edit Customer
              </h2>
              <p className="text-sm text-gray-500">{customer.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              aria-required="true"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="customer@example.com"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
            />
          </div>

          {/* Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={form.phone1}
                onChange={(e) => updateField("phone1", e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone 2
              </label>
              <input
                type="text"
                value={form.phone2}
                onChange={(e) => updateField("phone2", e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              />
            </div>
          </div>

          {/* Address */}
          <fieldset>
            <legend className="text-sm font-medium text-gray-700 mb-2">
              Address
            </legend>
            <div className="space-y-3">
              <input
                type="text"
                value={form.address1}
                onChange={(e) => updateField("address1", e.target.value)}
                placeholder="Street address"
                aria-label="Street address"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              />
              <input
                type="text"
                value={form.address2}
                onChange={(e) => updateField("address2", e.target.value)}
                placeholder="Address line 2"
                aria-label="Address line 2"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder="City"
                  aria-label="City"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                />
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => updateField("state", e.target.value)}
                  placeholder="State / Region"
                  aria-label="State or region"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={form.zip}
                  onChange={(e) => updateField("zip", e.target.value)}
                  placeholder="Zip / Postal code"
                  aria-label="Zip or postal code"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                />
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  placeholder="Country"
                  aria-label="Country"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                />
              </div>
            </div>
          </fieldset>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={form.isactive}
              onChange={(e) => updateField("isactive", e.target.value)}
              aria-label="Customer status"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
            >
              <option value="Y">Active</option>
              <option value="N">Inactive</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-200 transition text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            aria-label="Save customer changes"
            className="flex items-center gap-2 bg-posterita-blue text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
