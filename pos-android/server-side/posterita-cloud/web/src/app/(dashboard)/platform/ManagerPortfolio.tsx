"use client";

import React, { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Filter, Users, Activity, Briefcase,
  ChevronLeft, ChevronRight, Search, FlaskConical,
  Rocket, Store, Trash2, User, ChevronDown, ChevronUp,
  Pencil, Archive, X, Check, AlertTriangle,
} from "lucide-react";
import AccountSwitcher from "./AccountSwitcher";

type AccountManager = { id: number; email: string; name: string };

type PortfolioAccount = {
  account_id: string;
  businessname: string;
  currency: string | null;
  type: string;
  status: string;
  isactive: string;
  store_count: number;
  product_count: number;
  order_count: number;
  user_count: number;
  total_revenue: number;
  owner_id: number | null;
  owner?: {
    id?: number | null;
    email?: string | null;
    phone?: string | null;
    name?: string | null;
    account_manager?: { id?: number | null; email?: string | null; name?: string | null } | null;
  } | null;
};

type SummaryCounts = {
  total: number; demo: number; live: number; trial: number;
  testing: number; onboarding: number; active: number;
};

const TYPE_COLORS: Record<string, string> = {
  live: "bg-green-100 text-green-700",
  demo: "bg-purple-100 text-purple-700",
  trial: "bg-blue-100 text-blue-700",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  testing: "bg-gray-100 text-gray-700",
  onboarding: "bg-yellow-100 text-yellow-700",
  active: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  suspended: "bg-orange-100 text-orange-700",
  archived: "bg-gray-100 text-gray-400",
};

export default function ManagerPortfolio({
  accounts, managers, totalCount, page, totalPages,
  typeFilter, statusFilter, search, summaryCounts,
}: {
  accounts: PortfolioAccount[]; managers: AccountManager[];
  totalCount: number; page: number; totalPages: number;
  typeFilter: string; statusFilter: string; search: string;
  summaryCounts: SummaryCounts;
}) {
  const [pendingAccount, setPendingAccount] = useState("");
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(search);
  const [expandedOwners, setExpandedOwners] = useState<Set<number>>(new Set());
  const [actionLoading, setActionLoading] = useState("");
  // Modal state
  const [modal, setModal] = useState<{ type: string; account?: PortfolioAccount; owner?: any } | null>(null);
  // Owner edit state
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const router = useRouter();

  const ownerGroups = useMemo(() => {
    const groups: Record<string, { owner: any; accounts: PortfolioAccount[] }> = {};
    for (const acc of accounts) {
      const ownerId = acc.owner?.id ?? acc.owner_id ?? 0;
      const key = String(ownerId || `orphan_${acc.account_id}`);
      if (!groups[key]) groups[key] = { owner: acc.owner, accounts: [] };
      groups[key].accounts.push(acc);
    }
    return Object.entries(groups).map(([key, group]) => ({
      key, ownerId: parseInt(key) || 0, ...group,
    }));
  }, [accounts]);

  const navigate = (overrides: Record<string, string>) => {
    const params = new URLSearchParams();
    params.set("tab", "brands");
    const merged = { type: typeFilter, status: statusFilter, q: search, page: String(page), ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "all" && v !== "1" && v !== "") params.set(k, v);
    }
    router.push(`/platform?${params.toString()}`);
  };

  const handleAssign = (accountId: string, accountManagerId: string) => {
    startTransition(async () => {
      setPendingAccount(accountId);
      await fetch(`/api/account-manager/accounts/${accountId}/assignment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_manager_id: Number(accountManagerId) }),
      });
      setPendingAccount("");
      router.refresh();
    });
  };

  const handleArchive = async (account: PortfolioAccount) => {
    setActionLoading(account.account_id);
    await fetch(`/api/account/${account.account_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived", reason: "Archived by account manager" }),
    });
    setActionLoading("");
    setModal(null);
    router.refresh();
  };

  const handleDelete = async (account: PortfolioAccount) => {
    setActionLoading(account.account_id);
    const res = await fetch(`/api/account/${account.account_id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      if (data.code === "ARCHIVE_REQUIRED") {
        setModal({ type: "archive_required", account });
      } else {
        alert(`Delete failed: ${data.error}`);
      }
    } else {
      setModal(null);
      router.refresh();
    }
    setActionLoading("");
  };

  const handleSaveOwner = async () => {
    if (!modal?.owner?.id) return;
    setActionLoading("owner");
    const res = await fetch(`/api/owner/${modal.owner.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, email: editEmail, phone: editPhone }),
    });
    const data = await res.json();
    setActionLoading("");
    if (res.ok) {
      setModal(null);
      router.refresh();
    } else {
      alert(data.error || "Failed to update owner");
    }
  };

  const openEditOwner = (owner: any) => {
    setEditName(owner?.name || "");
    setEditEmail(owner?.email || "");
    setEditPhone(owner?.phone || "");
    setModal({ type: "edit_owner", owner });
  };

  const openDeleteConfirm = (account: PortfolioAccount) => {
    if (account.type === "live" && account.status !== "archived") {
      setModal({ type: "archive_required", account });
    } else {
      setModal({ type: "confirm_delete", account });
    }
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); navigate({ q: searchInput, page: "1" }); };
  const toggleOwner = (id: number) => {
    setExpandedOwners(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const summaryCards = [
    { label: "Total", value: summaryCounts.total, icon: Building2, filter: {}, color: undefined },
    { label: "Live", value: summaryCounts.live, icon: Rocket, filter: { type: "live" }, color: "text-green-600" },
    { label: "Demo", value: summaryCounts.demo, icon: FlaskConical, filter: { type: "demo" }, color: "text-purple-600" },
    { label: "Trial", value: summaryCounts.trial, icon: Store, filter: { type: "trial" }, color: "text-blue-600" },
  ];

  const statusCards = [
    { label: "Testing", value: summaryCounts.testing },
    { label: "Onboarding", value: summaryCounts.onboarding },
    { label: "Active", value: summaryCounts.active },
  ];

  return (
    <div className="space-y-6">
      {/* Modal overlay */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {modal.type === "edit_owner" && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Edit Owner</h3>
                  <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Name</label>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Email</label>
                    <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} type="email"
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Phone</label>
                    <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} type="tel"
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-5">
                  <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                  <button onClick={handleSaveOwner} disabled={actionLoading === "owner"}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
                    <Check size={14} /> {actionLoading === "owner" ? "Saving..." : "Save"}
                  </button>
                </div>
              </>
            )}

            {modal.type === "archive_required" && modal.account && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <AlertTriangle size={20} className="text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Archive Required</h3>
                    <p className="text-sm text-slate-500">Live brands must be archived before deletion</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-4">
                  <strong>"{modal.account.businessname}"</strong> is a <strong>live</strong> brand with status <strong>"{modal.account.status}"</strong>.
                  You need to archive it first to confirm you intend to remove it permanently.
                </p>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                  <button onClick={() => handleArchive(modal.account!)} disabled={actionLoading === modal.account.account_id}
                    className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-1">
                    <Archive size={14} /> {actionLoading === modal.account.account_id ? "Archiving..." : "Archive Brand"}
                  </button>
                </div>
              </>
            )}

            {modal.type === "confirm_delete" && modal.account && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 size={20} className="text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Delete Brand</h3>
                    <p className="text-sm text-slate-500">This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-2">
                  Permanently delete <strong>"{modal.account.businessname}"</strong> and all its data?
                </p>
                <div className="bg-red-50 rounded-lg p-3 mb-4 text-xs text-red-700">
                  <p className="font-medium mb-1">This will delete:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>{modal.account.product_count} products</li>
                    <li>{modal.account.store_count} stores</li>
                    <li>{modal.account.user_count} users</li>
                    <li>All orders, tills, and transaction history</li>
                  </ul>
                  <p className="mt-2 font-medium">The owner account will be preserved.</p>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                  <button onClick={() => handleDelete(modal.account!)} disabled={actionLoading === modal.account.account_id}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1">
                    <Trash2 size={14} /> {actionLoading === modal.account.account_id ? "Deleting..." : "Delete Permanently"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          const isActive = (card.filter as any).type === typeFilter;
          return (
            <button key={card.label} onClick={() => navigate({ type: isActive ? "all" : (card.filter as any).type || "all", page: "1" })}
              className={`bg-white rounded-2xl border p-5 text-left transition hover:shadow-md ${isActive ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"}`}>
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                <Icon size={18} className={card.color || "text-slate-700"} />
              </div>
              <div className="text-3xl font-bold text-slate-900">{card.value}</div>
              <div className="text-sm text-slate-500 mt-1">{card.label}</div>
            </button>
          );
        })}
      </div>

      {/* Status pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-slate-500 mr-1">Status:</span>
        {[{ label: "All", value: "all" }, ...statusCards.map((s) => ({ label: s.label, value: s.label.toLowerCase() }))].map((s) => (
          <button key={s.value} onClick={() => navigate({ status: s.value === statusFilter ? "all" : s.value, page: "1" })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${s.value === statusFilter ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {s.label}
            {s.value !== "all" && <span className="ml-1 opacity-70">{statusCards.find((c) => c.label.toLowerCase() === s.value)?.value}</span>}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 text-slate-800 font-semibold mb-4"><Filter size={16} /> Filter Portfolio</div>
        <form onSubmit={handleSearch} className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search business name, owner email, or account ID..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200" />
        </form>
      </div>

      {/* Owner-grouped list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Owners & Brands</h2>
          <span className="text-sm text-slate-500">{totalCount} brand{totalCount !== 1 ? "s" : ""}{totalPages > 1 && ` · Page ${page}/${totalPages}`}</span>
        </div>

        {ownerGroups.length === 0 ? (
          <div className="text-center py-12 text-slate-400">No accounts match your filters</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Brand</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th className="text-center">Stores</th>
                  <th className="text-center">Products</th>
                  <th className="text-center">Orders</th>
                  <th className="text-center">Users</th>
                  <th>Manager</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
            {ownerGroups.map((group) => {
              const owner = group.owner;
              const ownerId = owner?.id ?? group.ownerId;
              const isExpanded = group.accounts.length <= 2 || expandedOwners.has(ownerId);
              const visible = isExpanded ? group.accounts : group.accounts.slice(0, 2);

              return (
                <React.Fragment key={group.key}>
                  {/* Owner header row */}
                  <tr className="bg-slate-50">
                    <td colSpan={9} className="!py-2 !px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
                          <User size={12} className="text-slate-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm text-slate-900">{owner?.name || "Unknown"}</span>
                          <span className="text-xs text-slate-400 ml-2">{[owner?.email, owner?.phone].filter(Boolean).join(" · ") || ""}</span>
                        </div>
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{group.accounts.length}</span>
                        {owner?.id && (
                          <button onClick={() => openEditOwner(owner)} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium">
                            <Pencil size={11} /> Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Brand rows */}
                  {visible.map((account) => (
                    <tr key={account.account_id} className={actionLoading === account.account_id ? "opacity-50" : ""}>
                      <td className="pl-10">
                        <div className="font-medium text-slate-900">{account.businessname || "Unnamed"}</div>
                        <div className="text-xs text-slate-400 font-mono">{account.account_id}</div>
                      </td>
                      <td>
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${TYPE_COLORS[account.type] || "bg-gray-100"}`}>
                          {account.type}
                        </span>
                      </td>
                      <td>
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[account.status] || "bg-gray-100"}`}>
                          {account.status}
                        </span>
                      </td>
                      <td className="text-center text-sm font-medium">{account.store_count}</td>
                      <td className="text-center text-sm font-medium">{account.product_count}</td>
                      <td className="text-center text-sm font-medium">{account.order_count}</td>
                      <td className="text-center text-sm font-medium">{account.user_count}</td>
                      <td>
                        <select value={String(account.owner?.account_manager?.id ?? managers[0]?.id ?? "")}
                          onChange={(e) => handleAssign(account.account_id, e.target.value)}
                          disabled={isPending && pendingAccount === account.account_id}
                          className="px-2 py-1 rounded-lg border border-slate-200 text-xs min-w-[100px]">
                          {managers.map((m) => (<option key={m.id} value={String(m.id)}>{m.name || m.email}</option>))}
                        </select>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <AccountSwitcher accountId={account.account_id} businessName={account.businessname} />
                          {account.type === "live" && account.status !== "archived" && (
                            <button onClick={() => setModal({ type: "archive_required", account })}
                              className="text-xs text-orange-600 hover:text-orange-800 px-1.5 py-1 rounded hover:bg-orange-50">
                              <Archive size={12} />
                            </button>
                          )}
                          <button onClick={() => openDeleteConfirm(account)}
                            className="text-xs text-red-500 hover:text-red-700 px-1.5 py-1 rounded hover:bg-red-50">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {group.accounts.length > 2 && (
                    <tr key={`${group.key}-expand`}>
                      <td colSpan={9} className="!p-0">
                        <button onClick={() => toggleOwner(ownerId)}
                          className="w-full px-6 py-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1">
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {isExpanded ? "Show less" : `Show ${group.accounts.length - 2} more`}
                        </button>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <button onClick={() => navigate({ page: String(page - 1) })} disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-30">
              <ChevronLeft size={16} /> Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pn: number;
                if (totalPages <= 7) pn = i + 1;
                else if (page <= 4) pn = i + 1;
                else if (page >= totalPages - 3) pn = totalPages - 6 + i;
                else pn = page - 3 + i;
                return (
                  <button key={pn} onClick={() => navigate({ page: String(pn) })}
                    className={`w-9 h-9 rounded-lg text-sm font-medium ${pn === page ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                    {pn}
                  </button>
                );
              })}
            </div>
            <button onClick={() => navigate({ page: String(page + 1) })} disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-30">
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
