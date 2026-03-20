"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { dataQuery, dataUpdate, dataInsert } from "@/lib/supabase/data-client";
import {
  Users,
  Search,
  Shield,
  ShieldCheck,
  User,
  Mail,
  Phone,
  Save,
  X,
  Crown,
  Store,
  Plus,
} from "lucide-react";
import { SkeletonTable } from "@/components/Skeleton";
import Breadcrumb from "@/components/Breadcrumb";
import SortableHeader from "@/components/SortableHeader";
import { useToast } from "@/components/Toast";

interface PosUser {
  user_id: number;
  username: string;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  phone1: string | null;
  phone2: string | null;
  role: string;
  isadmin: string;
  issalesrep: string;
  isactive: string;
  permissions: string | null;
  discountlimit: number;
  address1: string | null;
  city: string | null;
  created_at: string | null;
}

interface StoreInfo {
  store_id: number;
  name: string;
}

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<PosUser[]>([]);
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<PosUser | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [form, setForm] = useState<Partial<PosUser>>({});
  const [saving, setSaving] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sort, setSort] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [usersRes, storesRes] = await Promise.all([
      dataQuery<PosUser>("pos_user", {
        select:
          "user_id, username, firstname, lastname, email, phone1, phone2, role, isadmin, issalesrep, isactive, permissions, discountlimit, address1, city, created_at",
        order: { column: "firstname" },
      }),
      dataQuery<StoreInfo>("store", {
        select: "store_id, name",
        order: { column: "name" },
      }),
    ]);
    setUsers(usersRes.data ?? []);
    setStores(storesRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = users.filter((u) => {
    const matchesSearch =
      !search ||
      u.firstname?.toLowerCase().includes(search.toLowerCase()) ||
      u.lastname?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone1?.includes(search) ||
      u.username?.toLowerCase().includes(search.toLowerCase());

    const matchesRole =
      roleFilter === "all" || u.role?.toUpperCase() === roleFilter;

    return matchesSearch && matchesRole;
  });

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
          aVal = [a.firstname, a.lastname].filter(Boolean).join(" ").toLowerCase() || a.username?.toLowerCase() || "";
          bVal = [b.firstname, b.lastname].filter(Boolean).join(" ").toLowerCase() || b.username?.toLowerCase() || "";
          break;
        case "username":
          aVal = a.username?.toLowerCase() ?? "";
          bVal = b.username?.toLowerCase() ?? "";
          break;
        case "email":
          aVal = a.email?.toLowerCase() ?? "";
          bVal = b.email?.toLowerCase() ?? "";
          break;
        case "role":
          aVal = a.role?.toLowerCase() ?? "";
          bVal = b.role?.toLowerCase() ?? "";
          break;
        case "store":
          aVal = a.city?.toLowerCase() ?? "";
          bVal = b.city?.toLowerCase() ?? "";
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return sort.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sort.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sort]);

  const openEdit = (user: PosUser) => {
    setEditingUser(user);
    setForm({
      firstname: user.firstname,
      lastname: user.lastname,
      username: user.username,
      email: user.email,
      phone1: user.phone1,
      phone2: user.phone2,
      role: user.role,
      isadmin: user.isadmin,
      issalesrep: user.issalesrep,
      isactive: user.isactive,
      discountlimit: user.discountlimit,
      address1: user.address1,
      city: user.city,
    });
  };

  const closeEdit = () => {
    setEditingUser(null);
    setForm({});
  };

  const openCreate = () => {
    setCreatingUser(true);
    setForm({ role: "STAFF", isactive: "Y", issalesrep: "N", discountlimit: 0 });
  };

  const closeCreate = () => {
    setCreatingUser(false);
    setForm({});
  };

  const handleCreate = async () => {
    if (!form.username?.trim()) return;

    const role = form.role?.toUpperCase() ?? "STAFF";
    if ((role === "OWNER" || role === "ADMIN") && !form.email?.trim()) {
      toast({ title: "Email is required for Admin and Owner roles.", variant: "warning" });
      return;
    }

    setSaving(true);
    await dataInsert("pos_user", {
      firstname: form.firstname || null,
      lastname: form.lastname || null,
      username: form.username,
      email: form.email || null,
      phone1: form.phone1 || null,
      role: role,
      isadmin: role === "ADMIN" || role === "OWNER" ? "Y" : "N",
      issalesrep: form.issalesrep ?? "N",
      isactive: "Y",
      discountlimit: Number(form.discountlimit) || 0,
    });
    setSaving(false);
    closeCreate();
    await fetchData();
  };

  // Escape key to close modals
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingUser) closeEdit();
        if (creatingUser) closeCreate();
      }
    },
    [editingUser, creatingUser]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleSave = async () => {
    if (!editingUser) return;

    // Validate: Admin & Owner must have email
    const role = form.role?.toUpperCase();
    if ((role === "OWNER" || role === "ADMIN") && !form.email?.trim()) {
      toast({ title: "Email is required for Admin and Owner roles.", variant: "warning" });
      return;
    }

    setSaving(true);
    await dataUpdate(
      "pos_user",
      { column: "user_id", value: editingUser.user_id },
      {
        firstname: form.firstname || null,
        lastname: form.lastname || null,
        username: form.username,
        email: form.email || null,
        phone1: form.phone1 || null,
        phone2: form.phone2 || null,
        role: form.role?.toUpperCase(),
        isadmin:
          form.role?.toUpperCase() === "ADMIN" ||
          form.role?.toUpperCase() === "OWNER"
            ? "Y"
            : "N",
        issalesrep: form.issalesrep,
        isactive: form.isactive,
        discountlimit: Number(form.discountlimit) || 0,
        address1: form.address1 || null,
        city: form.city || null,
      }
    );
    setSaving(false);
    closeEdit();
    await fetchData();
  };

  const updateField = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const getRoleBadge = (role: string) => {
    const r = role?.toUpperCase();
    if (r === "OWNER") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          <Crown size={12} />
          Owner
        </span>
      );
    }
    if (r === "ADMIN") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
          <ShieldCheck size={12} />
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        <User size={12} />
        Staff
      </span>
    );
  };

  const canAccessPortal = (role: string) => {
    const r = role?.toUpperCase();
    return r === "OWNER" || r === "ADMIN";
  };

  const ownerCount = users.filter(
    (u) => u.role?.toUpperCase() === "OWNER"
  ).length;
  const adminCount = users.filter(
    (u) => u.role?.toUpperCase() === "ADMIN"
  ).length;
  const staffCount = users.filter(
    (u) => u.role?.toUpperCase() === "STAFF" || !u.role
  ).length;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Dashboard", href: "/customer" }, { label: "Users" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1">
            {users.length} users — {ownerCount} owners, {adminCount} admins,{" "}
            {staffCount} staff
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-posterita-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Add User
        </button>
      </div>

      {/* Portal Access Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-3 text-sm text-blue-700 flex items-center gap-2">
        <Shield size={16} />
        <span>
          Only <strong>Owners</strong> and <strong>Admins</strong> can access
          this web portal. Email is required for these roles.
        </span>
      </div>

      {/* Search & Role Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, or username..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: "all", label: "All" },
            { key: "OWNER", label: "Owners" },
            { key: "ADMIN", label: "Admins" },
            { key: "STAFF", label: "Staff" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setRoleFilter(f.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                roleFilter === f.key
                  ? "bg-posterita-blue text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={8} columns={8} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="mx-auto text-gray-400" size={64} />
          <h3 className="text-lg font-medium text-gray-700 mt-4">
            {search || roleFilter !== "all"
              ? "No users match your filters"
              : "No users yet"}
          </h3>
          <p className="text-gray-500 mt-1">
            {search || roleFilter !== "all"
              ? "Try different search terms or filters"
              : "Users will appear once synced from the POS app"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <SortableHeader label="User" sortKey="name" currentSort={sort} onSort={handleSort} />
                <SortableHeader label="Username" sortKey="username" currentSort={sort} onSort={handleSort} />
                <SortableHeader label="Email" sortKey="email" currentSort={sort} onSort={handleSort} />
                <th>Phone</th>
                <SortableHeader label="Role" sortKey="role" currentSort={sort} onSort={handleSort} />
                <th className="text-center">Portal Access</th>
                <th className="text-center">Sales Rep</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((u) => (
                <tr
                  key={u.user_id}
                  onClick={() => openEdit(u)}
                  className="cursor-pointer hover:bg-blue-50/50 transition"
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          u.role?.toUpperCase() === "OWNER"
                            ? "bg-amber-100"
                            : u.role?.toUpperCase() === "ADMIN"
                            ? "bg-purple-100"
                            : "bg-posterita-blue/10"
                        }`}
                      >
                        <span
                          className={`font-semibold text-sm ${
                            u.role?.toUpperCase() === "OWNER"
                              ? "text-amber-700"
                              : u.role?.toUpperCase() === "ADMIN"
                              ? "text-purple-700"
                              : "text-posterita-blue"
                          }`}
                        >
                          {(u.firstname ?? u.username)
                            ?.charAt(0)
                            ?.toUpperCase() ?? "?"}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">
                          {[u.firstname, u.lastname].filter(Boolean).join(" ") ||
                            u.username}
                        </span>
                        {u.city && (
                          <div className="text-xs text-gray-500">{u.city}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="text-gray-500 font-mono text-sm">
                    {u.username}
                  </td>
                  <td>
                    {u.email ? (
                      <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                        <Mail size={14} />
                        {u.email}
                      </div>
                    ) : (
                      <span className="text-gray-400">&mdash;</span>
                    )}
                  </td>
                  <td>
                    {u.phone1 ? (
                      <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                        <Phone size={14} />
                        {u.phone1}
                      </div>
                    ) : (
                      <span className="text-gray-400">&mdash;</span>
                    )}
                  </td>
                  <td>{getRoleBadge(u.role)}</td>
                  <td className="text-center">
                    {canAccessPortal(u.role) ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        No
                      </span>
                    )}
                  </td>
                  <td className="text-center">
                    {u.issalesrep === "Y" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        Yes
                      </span>
                    ) : (
                      <span className="text-gray-400">&mdash;</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.isactive === "Y"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {u.isactive === "Y" ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {creatingUser && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={closeCreate}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-user-title"
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-posterita-blue/10">
                  <Plus size={24} className="text-posterita-blue" />
                </div>
                <div>
                  <h2 id="create-user-title" className="text-lg font-semibold">Add User</h2>
                  <p className="text-sm text-gray-500">Create a new POS user</p>
                </div>
              </div>
              <button
                onClick={closeCreate}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={form.firstname ?? ""}
                    onChange={(e) => updateField("firstname", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={form.lastname ?? ""}
                    onChange={(e) => updateField("lastname", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={form.username ?? ""}
                  onChange={(e) => updateField("username", e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email{" "}
                  {(form.role?.toUpperCase() === "OWNER" ||
                    form.role?.toUpperCase() === "ADMIN") && (
                    <span className="text-red-500">
                      * (required for {form.role})
                    </span>
                  )}
                </label>
                <input
                  type="email"
                  value={form.email ?? ""}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={form.phone1 ?? ""}
                    onChange={(e) => updateField("phone1", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    value={form.role?.toUpperCase() ?? "STAFF"}
                    onChange={(e) => updateField("role", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  >
                    <option value="OWNER">Owner</option>
                    <option value="ADMIN">Admin</option>
                    <option value="STAFF">Staff</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button
                onClick={closeCreate}
                className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-200 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.username?.trim()}
                className="flex items-center gap-2 bg-posterita-blue text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? "Creating..." : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={closeEdit}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-title"
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    editingUser.role?.toUpperCase() === "OWNER"
                      ? "bg-amber-100"
                      : editingUser.role?.toUpperCase() === "ADMIN"
                      ? "bg-purple-100"
                      : "bg-posterita-blue/10"
                  }`}
                >
                  <span className="font-bold text-lg">
                    {(editingUser.firstname ?? editingUser.username)
                      ?.charAt(0)
                      ?.toUpperCase() ?? "?"}
                  </span>
                </div>
                <div>
                  <h2 id="edit-user-title" className="text-lg font-semibold">Edit User</h2>
                  <p className="text-sm text-gray-500">
                    ID: {editingUser.user_id} &middot; @{editingUser.username}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={form.firstname ?? ""}
                    onChange={(e) => updateField("firstname", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={form.lastname ?? ""}
                    onChange={(e) => updateField("lastname", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={form.username ?? ""}
                  onChange={(e) => updateField("username", e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email{" "}
                  {(form.role?.toUpperCase() === "OWNER" ||
                    form.role?.toUpperCase() === "ADMIN") && (
                    <span className="text-red-500">
                      * (required for {form.role})
                    </span>
                  )}
                </label>
                <input
                  type="email"
                  value={form.email ?? ""}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={form.phone1 ?? ""}
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
                    value={form.phone2 ?? ""}
                    onChange={(e) => updateField("phone2", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    value={form.role?.toUpperCase() ?? "STAFF"}
                    onChange={(e) => updateField("role", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  >
                    <option value="OWNER">Owner</option>
                    <option value="ADMIN">Admin</option>
                    <option value="STAFF">Staff</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={form.isactive ?? "Y"}
                    onChange={(e) => updateField("isactive", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  >
                    <option value="Y">Active</option>
                    <option value="N">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sales Rep
                  </label>
                  <select
                    value={form.issalesrep ?? "N"}
                    onChange={(e) => updateField("issalesrep", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  >
                    <option value="Y">Yes</option>
                    <option value="N">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Limit (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={form.discountlimit ?? 0}
                    onChange={(e) =>
                      updateField("discountlimit", e.target.value)
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={form.address1 ?? ""}
                    onChange={(e) => updateField("address1", e.target.value)}
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

              {/* Role Info Box */}
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                <p className="font-medium text-gray-700 mb-2">
                  Role Permissions:
                </p>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    <Crown size={14} className="text-amber-600" />
                    <strong>Owner</strong> — Full access, web portal, PIN
                    recovery, manage all users
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-purple-600" />
                    <strong>Admin</strong> — Web portal access, manage staff,
                    settings
                  </li>
                  <li className="flex items-center gap-2">
                    <User size={14} className="text-gray-500" />
                    <strong>Staff</strong> — POS app only, assigned to specific
                    stores
                  </li>
                </ul>
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
                disabled={saving || !form.username?.trim()}
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
