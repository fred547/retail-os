"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { dataQuery, dataUpdate } from "@/lib/supabase/data-client";
import {
  Users,
  Search,
  Mail,
  Phone,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { SkeletonTable } from "@/components/Skeleton";
import Breadcrumb from "@/components/Breadcrumb";
import SortableHeader from "@/components/SortableHeader";
import { useToast } from "@/components/Toast";

interface Customer {
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
  created_at: string | null;
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

const PAGE_SIZE = 50;

export default function CustomersPage() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>({
    name: "",
    email: "",
    phone1: "",
    phone2: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    isactive: "Y",
  });
  const [saving, setSaving] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data } = await dataQuery<Customer>("customer", {
      select:
        "customer_id, name, email, phone1, phone2, address1, address2, city, state, zip, country, isactive, created_at",
      order: { column: "name" },
    });
    setCustomers(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone1?.includes(search) ||
        c.city?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const handleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  };

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    return [...filtered].sort((a, b) => {
      let aVal: any;
      let bVal: any;
      switch (sort.key) {
        case "name":
          aVal = a.name?.toLowerCase() ?? "";
          bVal = b.name?.toLowerCase() ?? "";
          break;
        case "email":
          aVal = a.email?.toLowerCase() ?? "";
          bVal = b.email?.toLowerCase() ?? "";
          break;
        case "phone":
          aVal = a.phone1 ?? "";
          bVal = b.phone1 ?? "";
          break;
        case "status":
          aVal = a.isactive ?? "";
          bVal = b.isactive ?? "";
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return sort.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sort.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, page]);

  const formatAddress = (c: Customer): string => {
    return [c.address1, c.address2, c.city, c.state, c.zip, c.country]
      .filter(Boolean)
      .join(", ");
  };

  // Edit modal
  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({
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
  };

  const closeEdit = () => {
    setEditingCustomer(null);
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && editingCustomer) {
        closeEdit();
      }
    },
    [editingCustomer]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleSave = async () => {
    if (!editingCustomer) return;
    if (!form.name.trim()) {
      toast({ title: "Customer name is required.", variant: "warning" });
      return;
    }

    setSaving(true);
    await dataUpdate(
      "customer",
      { column: "customer_id", value: editingCustomer.customer_id },
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
    closeEdit();
    await fetchCustomers();
  };

  const updateField = (field: keyof CustomerForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Dashboard", href: "/customer" }, { label: "Customers" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 mt-1">
            {customers.length} customer{customers.length !== 1 ? "s" : ""}
            {search && filtered.length !== customers.length && (
              <span>
                {" "}
                &middot; {filtered.length} matching &ldquo;{search}&rdquo;
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={18}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers by name, email, phone, or city..."
          aria-label="Search customers"
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={8} columns={5} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="mx-auto text-gray-400" size={64} />
          <h3 className="text-lg font-medium text-gray-700 mt-4">
            {search ? "No customers match your search" : "No customers yet"}
          </h3>
          <p className="text-gray-500 mt-1">
            {search
              ? "Try a different search term"
              : "Customers will appear here once added from the POS app"}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <SortableHeader label="Name" sortKey="name" currentSort={sort} onSort={handleSort} />
                  <SortableHeader label="Email" sortKey="email" currentSort={sort} onSort={handleSort} />
                  <SortableHeader label="Phone" sortKey="phone" currentSort={sort} onSort={handleSort} />
                  <th>Address</th>
                  <SortableHeader label="Status" sortKey="status" currentSort={sort} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {paginated.map((c) => (
                  <tr
                    key={c.customer_id}
                    onClick={() => openEdit(c)}
                    className="cursor-pointer hover:bg-blue-50/50 transition"
                    role="button"
                    tabIndex={0}
                    aria-label={`Edit customer ${c.name}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openEdit(c);
                      }
                    }}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-posterita-blue/10 rounded-full flex items-center justify-center">
                          <span className="text-posterita-blue font-semibold text-sm">
                            {c.name?.charAt(0)?.toUpperCase() ?? "?"}
                          </span>
                        </div>
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td>
                      {c.email ? (
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Mail size={14} />
                          <span className="text-sm">{c.email}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">&mdash;</span>
                      )}
                    </td>
                    <td>
                      {c.phone1 ? (
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Phone size={14} />
                          <span className="text-sm">{c.phone1}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">&mdash;</span>
                      )}
                    </td>
                    <td className="text-gray-500 text-sm max-w-xs truncate">
                      {formatAddress(c) || <span className="text-gray-400">&mdash;</span>}
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          c.isactive === "Y"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {c.isactive === "Y" ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * PAGE_SIZE + 1}&ndash;
                {Math.min(page * PAGE_SIZE, sorted.length)} of{" "}
                {sorted.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="Previous page"
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <span className="text-sm text-gray-600 px-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label="Next page"
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {editingCustomer && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={closeEdit}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-customer-title"
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-posterita-blue/10 rounded-full flex items-center justify-center">
                  <span className="text-posterita-blue font-bold text-lg">
                    {editingCustomer.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </span>
                </div>
                <div>
                  <h2
                    id="edit-customer-title"
                    className="text-lg font-semibold"
                  >
                    Edit Customer
                  </h2>
                  <p className="text-sm text-gray-500">
                    {editingCustomer.name}
                  </p>
                </div>
              </div>
              <button
                onClick={closeEdit}
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
                onClick={closeEdit}
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
      )}
    </div>
  );
}
