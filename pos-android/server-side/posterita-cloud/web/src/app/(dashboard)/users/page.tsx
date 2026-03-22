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
  Pencil,
  ChevronRight,
  ArrowLeft,
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

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<PosUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sort, setSort] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // Detail / section editor state
  const [viewingUser, setViewingUser] = useState<PosUser | null>(null);
  const [editSection, setEditSection] = useState<string | null>(null);
  const [sectionForm, setSectionForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  // Create modal
  const [creatingUser, setCreatingUser] = useState(false);
  const [createForm, setCreateForm] = useState<Record<string, any>>({});

  const fetchData = async () => {
    setLoading(true);
    const res = await dataQuery<PosUser>("pos_user", {
      select:
        "user_id, username, firstname, lastname, email, phone1, phone2, role, isadmin, issalesrep, isactive, permissions, discountlimit, address1, city, created_at",
      order: { column: "firstname" },
    });
    setUsers(res.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editSection) setEditSection(null);
        else if (viewingUser) setViewingUser(null);
        else if (creatingUser) setCreatingUser(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [editSection, viewingUser, creatingUser]);

  // --- Filtering & sorting ---
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
      let aVal: any, bVal: any;
      switch (sort.key) {
        case "name":
          aVal = [a.firstname, a.lastname].filter(Boolean).join(" ").toLowerCase() || a.username?.toLowerCase() || "";
          bVal = [b.firstname, b.lastname].filter(Boolean).join(" ").toLowerCase() || b.username?.toLowerCase() || "";
          break;
        case "role":
          aVal = a.role?.toLowerCase() ?? "";
          bVal = b.role?.toLowerCase() ?? "";
          break;
        default: return 0;
      }
      if (aVal < bVal) return sort.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sort.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sort]);

  // --- Section editor ---
  const openSection = (section: string, data: Record<string, any>) => {
    setSectionForm(data);
    setEditSection(section);
  };

  const saveSection = async () => {
    if (!viewingUser) return;
    setSaving(true);

    const updates: Record<string, any> = {};

    if (editSection === "personal") {
      updates.firstname = sectionForm.firstname || null;
      updates.lastname = sectionForm.lastname || null;
      updates.username = sectionForm.username;
    } else if (editSection === "contact") {
      updates.email = sectionForm.email || null;
      updates.phone1 = sectionForm.phone1 || null;
      updates.phone2 = sectionForm.phone2 || null;
    } else if (editSection === "role") {
      const role = sectionForm.role?.toUpperCase() ?? "STAFF";
      if ((role === "OWNER" || role === "ADMIN") && !sectionForm.email && !viewingUser.email) {
        toast({ title: "Email is required for Admin and Owner roles.", variant: "warning" });
        setSaving(false);
        return;
      }
      updates.role = role;
      updates.isadmin = role === "ADMIN" || role === "OWNER" ? "Y" : "N";
      updates.issalesrep = sectionForm.issalesrep;
      updates.isactive = sectionForm.isactive;
      updates.discountlimit = Number(sectionForm.discountlimit) || 0;
    } else if (editSection === "location") {
      updates.address1 = sectionForm.address1 || null;
      updates.city = sectionForm.city || null;
    }

    await dataUpdate("pos_user", { column: "user_id", value: viewingUser.user_id }, updates);
    setSaving(false);
    setEditSection(null);

    // Refresh data and update the viewing user
    await fetchData();
    const refreshed = (await dataQuery<PosUser>("pos_user", {
      select: "user_id, username, firstname, lastname, email, phone1, phone2, role, isadmin, issalesrep, isactive, permissions, discountlimit, address1, city, created_at",
      filters: [{ column: "user_id", op: "eq", value: viewingUser.user_id }],
    })).data?.[0];
    if (refreshed) setViewingUser(refreshed);
  };

  // --- Create user ---
  const openCreate = () => {
    setCreateForm({ role: "STAFF", isactive: "Y", issalesrep: "N", discountlimit: 0 });
    setCreatingUser(true);
  };

  const handleCreate = async () => {
    if (!createForm.username?.trim()) return;
    const role = createForm.role?.toUpperCase() ?? "STAFF";
    if ((role === "OWNER" || role === "ADMIN") && !createForm.email?.trim()) {
      toast({ title: "Email is required for Admin and Owner roles.", variant: "warning" });
      return;
    }
    setSaving(true);
    await dataInsert("pos_user", {
      firstname: createForm.firstname || null,
      lastname: createForm.lastname || null,
      username: createForm.username,
      email: createForm.email || null,
      phone1: createForm.phone1 || null,
      role: role,
      isadmin: role === "ADMIN" || role === "OWNER" ? "Y" : "N",
      issalesrep: createForm.issalesrep ?? "N",
      isactive: "Y",
      discountlimit: Number(createForm.discountlimit) || 0,
    });
    setSaving(false);
    setCreatingUser(false);
    await fetchData();
  };

  // --- Helpers ---
  const getRoleBadge = (role: string, size: "sm" | "lg" = "sm") => {
    const r = role?.toUpperCase();
    const cls = size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs";
    if (r === "OWNER") return (
      <span className={`inline-flex items-center gap-1 ${cls} rounded-full font-medium bg-amber-100 text-amber-800`}>
        <Crown size={size === "lg" ? 16 : 12} /> Owner
      </span>
    );
    if (r === "ADMIN") return (
      <span className={`inline-flex items-center gap-1 ${cls} rounded-full font-medium bg-purple-100 text-purple-700`}>
        <ShieldCheck size={size === "lg" ? 16 : 12} /> Admin
      </span>
    );
    return (
      <span className={`inline-flex items-center gap-1 ${cls} rounded-full font-medium bg-gray-100 text-gray-600`}>
        <User size={size === "lg" ? 16 : 12} /> Staff
      </span>
    );
  };

  const fullName = (u: PosUser) =>
    [u.firstname, u.lastname].filter(Boolean).join(" ") || u.username;

  const roleColor = (role: string) => {
    const r = role?.toUpperCase();
    if (r === "OWNER") return { bg: "bg-amber-100", text: "text-amber-700" };
    if (r === "ADMIN") return { bg: "bg-purple-100", text: "text-purple-700" };
    return { bg: "bg-posterita-blue/10", text: "text-posterita-blue" };
  };

  const ownerCount = users.filter((u) => u.role?.toUpperCase() === "OWNER").length;
  const adminCount = users.filter((u) => u.role?.toUpperCase() === "ADMIN").length;
  const staffCount = users.filter((u) => u.role?.toUpperCase() === "STAFF" || !u.role).length;

  // ──────────────────────────────────────
  // DETAIL BROCHURE VIEW
  // ──────────────────────────────────────
  if (viewingUser) {
    const u = viewingUser;
    const rc = roleColor(u.role);

    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Back */}
        <button
          onClick={() => setViewingUser(null)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition"
        >
          <ArrowLeft size={16} /> Back to Users
        </button>

        {/* Hero Header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-white px-8 py-8 flex items-center gap-6">
            <div className={`w-20 h-20 rounded-2xl ${rc.bg} flex items-center justify-center`}>
              <span className={`text-3xl font-bold ${rc.text}`}>
                {(u.firstname ?? u.username)?.charAt(0)?.toUpperCase() ?? "?"}
              </span>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{fullName(u)}</h1>
              <p className="text-gray-500 mt-0.5">@{u.username}</p>
              <div className="flex items-center gap-2 mt-2">
                {getRoleBadge(u.role, "lg")}
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  u.isactive === "Y" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}>
                  {u.isactive === "Y" ? "Active" : "Inactive"}
                </span>
                {u.issalesrep === "Y" && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                    Sales Rep
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section: Personal Info */}
        <SectionCard
          title="Personal Info"
          icon={<User size={18} className="text-posterita-blue" />}
          onEdit={() => openSection("personal", {
            firstname: u.firstname ?? "",
            lastname: u.lastname ?? "",
            username: u.username ?? "",
          })}
        >
          <DetailRow label="First Name" value={u.firstname} />
          <DetailRow label="Last Name" value={u.lastname} />
          <DetailRow label="Username" value={u.username} mono />
        </SectionCard>

        {/* Section: Contact */}
        <SectionCard
          title="Contact"
          icon={<Mail size={18} className="text-green-600" />}
          onEdit={() => openSection("contact", {
            email: u.email ?? "",
            phone1: u.phone1 ?? "",
            phone2: u.phone2 ?? "",
          })}
        >
          <DetailRow label="Email" value={u.email} />
          <DetailRow label="Phone" value={u.phone1} />
          <DetailRow label="Phone 2" value={u.phone2} />
        </SectionCard>

        {/* Section: Role & Permissions */}
        <SectionCard
          title="Role & Permissions"
          icon={<Shield size={18} className="text-purple-600" />}
          onEdit={() => openSection("role", {
            role: u.role?.toUpperCase() ?? "STAFF",
            isactive: u.isactive ?? "Y",
            issalesrep: u.issalesrep ?? "N",
            discountlimit: u.discountlimit ?? 0,
          })}
        >
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-500">Role</span>
            {getRoleBadge(u.role)}
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-500">Portal Access</span>
            <ChipBool value={u.role?.toUpperCase() === "OWNER" || u.role?.toUpperCase() === "ADMIN"} />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-500">Sales Rep</span>
            <ChipBool value={u.issalesrep === "Y"} />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-500">Discount Limit</span>
            <span className="text-sm font-medium">{u.discountlimit ?? 0}%</span>
          </div>
        </SectionCard>

        {/* Section: Location */}
        <SectionCard
          title="Location"
          icon={<Store size={18} className="text-orange-600" />}
          onEdit={() => openSection("location", {
            address1: u.address1 ?? "",
            city: u.city ?? "",
          })}
        >
          <DetailRow label="Address" value={u.address1} />
          <DetailRow label="City" value={u.city} />
        </SectionCard>

        {/* Section Editor Modal */}
        {editSection && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setEditSection(null)}>
            <div
              className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-2">
                <h3 className="text-lg font-semibold">
                  {editSection === "personal" && "Edit Personal Info"}
                  {editSection === "contact" && "Edit Contact"}
                  {editSection === "role" && "Edit Role & Permissions"}
                  {editSection === "location" && "Edit Location"}
                </h3>
                <button onClick={() => setEditSection(null)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X size={20} />
                </button>
              </div>
              <div className="px-6 py-4 space-y-4">
                {editSection === "personal" && (
                  <>
                    <FormField label="First Name" value={sectionForm.firstname} onChange={(v) => setSectionForm((p) => ({ ...p, firstname: v }))} />
                    <FormField label="Last Name" value={sectionForm.lastname} onChange={(v) => setSectionForm((p) => ({ ...p, lastname: v }))} />
                    <FormField label="Username" value={sectionForm.username} onChange={(v) => setSectionForm((p) => ({ ...p, username: v }))} required />
                  </>
                )}
                {editSection === "contact" && (
                  <>
                    <FormField label="Email" type="email" value={sectionForm.email} onChange={(v) => setSectionForm((p) => ({ ...p, email: v }))} />
                    <FormField label="Phone" value={sectionForm.phone1} onChange={(v) => setSectionForm((p) => ({ ...p, phone1: v }))} />
                    <FormField label="Phone 2" value={sectionForm.phone2} onChange={(v) => setSectionForm((p) => ({ ...p, phone2: v }))} />
                  </>
                )}
                {editSection === "role" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <select
                        value={sectionForm.role}
                        onChange={(e) => setSectionForm((p) => ({ ...p, role: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                      >
                        <option value="OWNER">Owner</option>
                        <option value="ADMIN">Admin</option>
                        <option value="STAFF">Staff</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={sectionForm.isactive}
                        onChange={(e) => setSectionForm((p) => ({ ...p, isactive: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                      >
                        <option value="Y">Active</option>
                        <option value="N">Inactive</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sales Rep</label>
                      <select
                        value={sectionForm.issalesrep}
                        onChange={(e) => setSectionForm((p) => ({ ...p, issalesrep: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                      >
                        <option value="Y">Yes</option>
                        <option value="N">No</option>
                      </select>
                    </div>
                    <FormField label="Discount Limit (%)" type="number" value={sectionForm.discountlimit} onChange={(v) => setSectionForm((p) => ({ ...p, discountlimit: v }))} />
                  </>
                )}
                {editSection === "location" && (
                  <>
                    <FormField label="Address" value={sectionForm.address1} onChange={(v) => setSectionForm((p) => ({ ...p, address1: v }))} />
                    <FormField label="City" value={sectionForm.city} onChange={(v) => setSectionForm((p) => ({ ...p, city: v }))} />
                  </>
                )}
              </div>
              <div className="flex items-center justify-end gap-3 px-6 pb-6">
                <button onClick={() => setEditSection(null)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition text-sm font-medium">
                  Cancel
                </button>
                <button
                  onClick={saveSection}
                  disabled={saving}
                  className="flex items-center gap-2 bg-posterita-blue text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
                >
                  <Save size={16} />
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────
  // USER LIST VIEW
  // ──────────────────────────────────────
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Dashboard", href: "/customer" }, { label: "Users" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1">
            {users.length} users — {ownerCount} owners, {adminCount} admins, {staffCount} staff
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
          Only <strong>Owners</strong> and <strong>Admins</strong> can access this web portal. Email is required for these roles.
        </span>
      </div>

      {/* Search & Role Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
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
        <SkeletonTable rows={8} columns={6} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="mx-auto text-gray-400" size={64} />
          <h3 className="text-lg font-medium text-gray-700 mt-4">
            {search || roleFilter !== "all" ? "No users match your filters" : "No users yet"}
          </h3>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <SortableHeader label="User" sortKey="name" currentSort={sort} onSort={handleSort} />
                <th>Email</th>
                <th>Phone</th>
                <SortableHeader label="Role" sortKey="role" currentSort={sort} onSort={handleSort} />
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((u) => {
                const rc = roleColor(u.role);
                return (
                  <tr
                    key={u.user_id}
                    onClick={() => setViewingUser(u)}
                    className="cursor-pointer hover:bg-blue-50/50 transition"
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${rc.bg}`}>
                          <span className={`font-semibold text-sm ${rc.text}`}>
                            {(u.firstname ?? u.username)?.charAt(0)?.toUpperCase() ?? "?"}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">{fullName(u)}</span>
                          <div className="text-xs text-gray-500">@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {u.email ? (
                        <span className="text-sm text-gray-500">{u.email}</span>
                      ) : (
                        <span className="text-gray-400">&mdash;</span>
                      )}
                    </td>
                    <td>
                      {u.phone1 ? (
                        <span className="text-sm text-gray-500">{u.phone1}</span>
                      ) : (
                        <span className="text-gray-400">&mdash;</span>
                      )}
                    </td>
                    <td>{getRoleBadge(u.role)}</td>
                    <td>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.isactive === "Y" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {u.isactive === "Y" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="text-right">
                      <ChevronRight size={18} className="text-gray-400 inline" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      {creatingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setCreatingUser(false)}>
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h3 className="text-lg font-semibold">Add User</h3>
              <button onClick={() => setCreatingUser(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="First Name" value={createForm.firstname ?? ""} onChange={(v) => setCreateForm((p) => ({ ...p, firstname: v }))} />
                <FormField label="Last Name" value={createForm.lastname ?? ""} onChange={(v) => setCreateForm((p) => ({ ...p, lastname: v }))} />
              </div>
              <FormField label="Username" value={createForm.username ?? ""} onChange={(v) => setCreateForm((p) => ({ ...p, username: v }))} required />
              <FormField label="Email" type="email" value={createForm.email ?? ""} onChange={(v) => setCreateForm((p) => ({ ...p, email: v }))}
                hint={(createForm.role?.toUpperCase() === "OWNER" || createForm.role?.toUpperCase() === "ADMIN") ? "Required for this role" : undefined}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Phone" value={createForm.phone1 ?? ""} onChange={(v) => setCreateForm((p) => ({ ...p, phone1: v }))} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={createForm.role ?? "STAFF"}
                    onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  >
                    <option value="OWNER">Owner</option>
                    <option value="ADMIN">Admin</option>
                    <option value="STAFF">Staff</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <button onClick={() => setCreatingUser(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition text-sm font-medium">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !createForm.username?.trim()}
                className="flex items-center gap-2 bg-posterita-blue text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? "Creating..." : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────
// Reusable UI Components
// ──────────────────────────────────────

function SectionCard({
  title,
  icon,
  onEdit,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-gray-50 rounded-lg">{icon}</div>
          <h3 className="font-semibold text-gray-800">{title}</h3>
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 text-sm text-posterita-blue hover:text-blue-700 font-medium transition"
        >
          <Pencil size={14} />
          Edit
        </button>
      </div>
      <div className="px-6 py-3 divide-y divide-gray-50">{children}</div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-medium ${mono ? "font-mono" : ""} ${value ? "text-gray-900" : "text-gray-400"}`}>
        {value || "\u2014"}
      </span>
    </div>
  );
}

function ChipBool({ value }: { value: boolean }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
      value ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
    }`}>
      {value ? "Yes" : "No"}
    </span>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  required,
  hint,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
        {hint && <span className="text-xs text-orange-500 ml-1">({hint})</span>}
      </label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
      />
    </div>
  );
}
