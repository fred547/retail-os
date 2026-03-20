"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Filter,
  PieChart,
  Users,
  Activity,
  Briefcase,
} from "lucide-react";
import AccountSwitcher from "./AccountSwitcher";

type AccountManager = {
  id: number;
  email: string;
  name: string;
};

type PortfolioAccount = {
  account_id: string;
  businessname: string;
  currency: string | null;
  type: string;
  status: string;
  isactive: string;
  store_count: number;
  terminal_count: number;
  product_count: number;
  order_count: number;
  user_count: number;
  total_revenue: number;
  owner?: {
    email?: string | null;
    phone?: string | null;
    name?: string | null;
    account_manager?: {
      id?: number | null;
      email?: string | null;
      name?: string | null;
    } | null;
  } | null;
};

export default function ManagerPortfolio({
  accounts,
  managers,
}: {
  accounts: PortfolioAccount[];
  managers: AccountManager[];
}) {
  const [query, setQuery] = useState("");
  const [managerFilter, setManagerFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pendingAccount, setPendingAccount] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      const managerId = String(account.owner?.account_manager?.id ?? "");
      const ownerContact = `${account.owner?.email || ""} ${account.owner?.phone || ""}`.toLowerCase();
      const matchesQuery =
        !query ||
        account.businessname?.toLowerCase().includes(query.toLowerCase()) ||
        account.account_id.toLowerCase().includes(query.toLowerCase()) ||
        ownerContact.includes(query.toLowerCase());
      const matchesManager = managerFilter === "all" || managerId === managerFilter;
      const matchesType = typeFilter === "all" || account.type === typeFilter;
      const matchesStatus = statusFilter === "all" || account.status === statusFilter;
      return matchesQuery && matchesManager && matchesType && matchesStatus;
    });
  }, [accounts, managerFilter, query, statusFilter, typeFilter]);

  const managerDistribution = useMemo(() => {
    return managers.map((manager) => ({
      ...manager,
      count: accounts.filter((account) => account.owner?.account_manager?.id === manager.id).length,
    }));
  }, [accounts, managers]);

  const typeDistribution = useMemo(() => {
    return ["demo", "trial", "live"].map((type) => ({
      type,
      count: accounts.filter((account) => account.type === type).length,
    }));
  }, [accounts]);

  const statusDistribution = useMemo(() => {
    return ["testing", "onboarding", "active", "failed"].map((status) => ({
      status,
      count: accounts.filter((account) => account.status === status).length,
    }));
  }, [accounts]);

  const handleAssign = (accountId: string, accountManagerId: string) => {
    startTransition(async () => {
      setPendingAccount(accountId);
      const res = await fetch(`/api/account-manager/accounts/${accountId}/assignment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_manager_id: Number(accountManagerId) }),
      });
      if (res.ok) {
        router.refresh();
      }
      setPendingAccount("");
    });
  };

  const summaryCards = [
    { label: "Accounts", value: accounts.length, icon: Building2 },
    { label: "Testing", value: accounts.filter((a) => a.status === "testing").length, icon: Activity },
    { label: "Onboarding", value: accounts.filter((a) => a.status === "onboarding").length, icon: Briefcase },
    { label: "Active", value: accounts.filter((a) => a.status === "active").length, icon: Users },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                <Icon size={18} className="text-slate-700" />
              </div>
              <div className="text-3xl font-bold text-slate-900">{card.value}</div>
              <div className="text-sm text-slate-500 mt-1">{card.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid xl:grid-cols-3 gap-4">
        <DistributionCard title="By Account Manager" icon={<Users size={16} />} items={managerDistribution.map((item) => ({
          label: item.name || item.email,
          value: item.count,
        }))} />
        <DistributionCard title="By Type" icon={<PieChart size={16} />} items={typeDistribution.map((item) => ({
          label: item.type,
          value: item.count,
        }))} />
        <DistributionCard title="By Status" icon={<Activity size={16} />} items={statusDistribution.map((item) => ({
          label: item.status,
          value: item.count,
        }))} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-semibold">
          <Filter size={16} />
          Filter Portfolio
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search business, account ID, owner..."
            className="px-4 py-3 rounded-xl border border-slate-200"
          />
          <select
            value={managerFilter}
            onChange={(e) => setManagerFilter(e.target.value)}
            className="px-4 py-3 rounded-xl border border-slate-200"
          >
            <option value="all">All managers</option>
            {managers.map((manager) => (
              <option key={manager.id} value={String(manager.id)}>
                {manager.name || manager.email}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-3 rounded-xl border border-slate-200"
          >
            <option value="all">All types</option>
            <option value="demo">Demo</option>
            <option value="trial">Trial</option>
            <option value="live">Live</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 rounded-xl border border-slate-200"
          >
            <option value="all">All statuses</option>
            <option value="testing">Testing</option>
            <option value="onboarding">Onboarding</option>
            <option value="active">Active</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Account Portfolio</h2>
          <span className="text-sm text-slate-500">{filteredAccounts.length} visible</span>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Business</th>
                <th>Owner</th>
                <th>Manager</th>
                <th>Type</th>
                <th>Status</th>
                <th className="text-center">Stores</th>
                <th className="text-center">Users</th>
                <th className="text-right">Revenue</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((account) => (
                <tr key={account.account_id}>
                  <td>
                    <div className="font-medium text-slate-900">{account.businessname || "Unnamed"}</div>
                    <div className="text-xs text-slate-400 font-mono">{account.account_id}</div>
                  </td>
                  <td className="text-sm text-slate-600">
                    {account.owner?.email || account.owner?.phone || "Unassigned"}
                  </td>
                  <td>
                    <select
                      value={String(account.owner?.account_manager?.id ?? managers[0]?.id ?? "")}
                      onChange={(e) => handleAssign(account.account_id, e.target.value)}
                      disabled={isPending && pendingAccount === account.account_id}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-sm min-w-[180px]"
                    >
                      {managers.map((manager) => (
                        <option key={manager.id} value={String(manager.id)}>
                          {manager.name || manager.email}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="capitalize">{account.type}</td>
                  <td className="capitalize">{account.status.replace("_", " ")}</td>
                  <td className="text-center">{account.store_count}</td>
                  <td className="text-center">{account.user_count}</td>
                  <td className="text-right font-medium">{formatCurrency(account.total_revenue)}</td>
                  <td>
                    <AccountSwitcher accountId={account.account_id} businessName={account.businessname} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DistributionCard({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: { label: string; value: number }[];
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 text-slate-800 font-semibold mb-4">
        {icon}
        {title}
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-sm">
            <span className="text-slate-600 capitalize">{item.label}</span>
            <span className="font-semibold text-slate-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatCurrency(amount: number): string {
  if (!amount) return "0";
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toFixed(0);
}
