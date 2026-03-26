"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Heart, Trophy, ArrowUpCircle, ArrowDownCircle,
  Settings, Users, TrendingUp, Search, ChevronRight,
  Gift, Star, RefreshCw,
} from "lucide-react";

interface LoyaltyConfig {
  account_id: string;
  points_per_currency: number;
  redemption_rate: number;
  min_redeem_points: number;
  is_active: boolean;
  welcome_bonus: number;
}

interface Wallet {
  customer_id: number;
  name: string;
  phone1: string | null;
  email: string | null;
  loyaltypoints: number;
  isactive: string;
}

interface Transaction {
  id: number;
  customer_id: number;
  customer_name: string;
  order_id: number | null;
  type: string;
  points: number;
  balance_after: number;
  description: string;
  created_at: string;
}

type Tab = "overview" | "members" | "transactions" | "settings";

export default function LoyaltyPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [config, setConfig] = useState<LoyaltyConfig | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletSummary, setWalletSummary] = useState({ total_members: 0, total_points_outstanding: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Config form state
  const [formPointsPerCurrency, setFormPointsPerCurrency] = useState(1);
  const [formRedemptionRate, setFormRedemptionRate] = useState(0.01);
  const [formMinRedeem, setFormMinRedeem] = useState(100);
  const [formWelcomeBonus, setFormWelcomeBonus] = useState(0);
  const [formIsActive, setFormIsActive] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, walletsRes, txRes] = await Promise.all([
        fetch("/api/loyalty/config"),
        fetch("/api/loyalty/wallets"),
        fetch("/api/loyalty/transactions?page=1"),
      ]);
      const configData = await configRes.json();
      const walletsData = await walletsRes.json();
      const txData = await txRes.json();

      if (configData.config) {
        setConfig(configData.config);
        setFormPointsPerCurrency(configData.config.points_per_currency);
        setFormRedemptionRate(configData.config.redemption_rate);
        setFormMinRedeem(configData.config.min_redeem_points);
        setFormWelcomeBonus(configData.config.welcome_bonus);
        setFormIsActive(configData.config.is_active);
      }
      setWallets(walletsData.wallets || []);
      setWalletSummary(walletsData.summary || { total_members: 0, total_points_outstanding: 0 });
      setTransactions(txData.transactions || []);
    } catch (e) {
      console.error("Failed to load loyalty data", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/loyalty/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points_per_currency: formPointsPerCurrency,
          redemption_rate: formRedemptionRate,
          min_redeem_points: formMinRedeem,
          welcome_bonus: formWelcomeBonus,
          is_active: formIsActive,
        }),
      });
      const data = await res.json();
      if (data.config) setConfig(data.config);
    } catch (e) {
      console.error("Failed to save config", e);
    } finally {
      setSaving(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "overview", label: "Overview", icon: TrendingUp },
    { key: "members", label: "Members", icon: Users },
    { key: "transactions", label: "History", icon: Heart },
    { key: "settings", label: "Settings", icon: Settings },
  ];

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-400">
        <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
        Loading loyalty program...
      </div>
    );
  }

  const filteredWallets = wallets.filter(
    (w) =>
      !search ||
      w.name?.toLowerCase().includes(search.toLowerCase()) ||
      w.phone1?.includes(search) ||
      w.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalEarned = transactions
    .filter((t) => t.type === "earn" || t.type === "welcome")
    .reduce((sum, t) => sum + t.points, 0);
  const totalRedeemed = transactions
    .filter((t) => t.type === "redeem")
    .reduce((sum, t) => sum + Math.abs(t.points), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy size={28} className="text-yellow-500" />
            Loyalty Program
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {config?.is_active ? (
              <span className="text-green-600 font-medium">Active</span>
            ) : (
              <span className="text-gray-400">Inactive — enable in Settings</span>
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm text-gray-500">Members</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{walletSummary.total_members}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm text-gray-500">Points Outstanding</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">
                {walletSummary.total_points_outstanding.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm text-gray-500">Points Earned (recent)</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{totalEarned.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm text-gray-500">Points Redeemed (recent)</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{totalRedeemed.toLocaleString()}</p>
            </div>
          </div>

          {/* Config Summary */}
          {config?.is_active && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-100">
              <h3 className="font-semibold text-gray-900 mb-3">Program Rules</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Earn Rate</p>
                  <p className="font-bold text-gray-900">{config.points_per_currency} pts / 1 currency</p>
                </div>
                <div>
                  <p className="text-gray-500">Redemption Value</p>
                  <p className="font-bold text-gray-900">{config.redemption_rate} per point</p>
                </div>
                <div>
                  <p className="text-gray-500">Min. Redeem</p>
                  <p className="font-bold text-gray-900">{config.min_redeem_points} pts</p>
                </div>
                <div>
                  <p className="text-gray-500">Welcome Bonus</p>
                  <p className="font-bold text-gray-900">{config.welcome_bonus} pts</p>
                </div>
              </div>
            </div>
          )}

          {/* Top Members */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Top Members</h3>
              <button onClick={() => setTab("members")} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View all <ChevronRight size={14} />
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {wallets.slice(0, 5).map((w) => (
                <div key={w.customer_id} className="px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                      <Star size={14} className="text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{w.name || "Unknown"}</p>
                      <p className="text-xs text-gray-400">{w.phone1 || w.email || "—"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-yellow-600">{w.loyaltypoints.toLocaleString()} pts</p>
                  </div>
                </div>
              ))}
              {wallets.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-400 text-sm">
                  No loyalty members yet. Points are earned automatically when customers make purchases.
                </div>
              )}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Recent Activity</h3>
              <button onClick={() => setTab("transactions")} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View all <ChevronRight size={14} />
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {transactions.slice(0, 5).map((t) => (
                <div key={t.id} className="px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      t.points > 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                    }`}>
                      {t.points > 0 ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                    </div>
                    <div>
                      <p className="text-sm text-gray-800">{t.customer_name}</p>
                      <p className="text-xs text-gray-400">{t.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${t.points > 0 ? "text-green-600" : "text-red-600"}`}>
                      {t.points > 0 ? "+" : ""}{t.points}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(t.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-400 text-sm">
                  No transactions yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Members Tab */}
      {tab === "members" && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search members by name, phone, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {filteredWallets.map((w) => (
                <div key={w.customer_id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-100 to-orange-100 flex items-center justify-center">
                      <Star size={18} className="text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{w.name || "Unknown"}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {w.phone1 && <span>{w.phone1}</span>}
                        {w.email && <span>{w.email}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-yellow-600">{w.loyaltypoints.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">points</p>
                  </div>
                </div>
              ))}
              {filteredWallets.length === 0 && (
                <div className="px-6 py-12 text-center text-gray-400">
                  <Gift size={32} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No loyalty members found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {tab === "transactions" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {transactions.map((t) => (
              <div key={t.id} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    t.type === "earn" || t.type === "welcome"
                      ? "bg-green-50 text-green-600"
                      : t.type === "redeem"
                        ? "bg-red-50 text-red-600"
                        : "bg-gray-50 text-gray-600"
                  }`}>
                    {t.type === "earn" || t.type === "welcome" ? (
                      <ArrowUpCircle size={16} />
                    ) : t.type === "redeem" ? (
                      <ArrowDownCircle size={16} />
                    ) : (
                      <Settings size={16} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t.customer_name}</p>
                    <p className="text-xs text-gray-500">{t.description}</p>
                    {t.order_id && (
                      <p className="text-xs text-gray-400">Order #{t.order_id}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${
                    t.points > 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {t.points > 0 ? "+" : ""}{t.points} pts
                  </p>
                  <p className="text-xs text-gray-400">
                    bal: {t.balance_after.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(t.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="px-6 py-12 text-center text-gray-400">
                <Heart size={32} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No loyalty transactions yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {tab === "settings" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Loyalty Configuration</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-gray-600">{formIsActive ? "Active" : "Inactive"}</span>
              <button
                onClick={() => setFormIsActive(!formIsActive)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  formIsActive ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    formIsActive ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Points per Currency Unit
              </label>
              <input
                type="number"
                value={formPointsPerCurrency}
                onChange={(e) => setFormPointsPerCurrency(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                step="0.1"
                min="0"
              />
              <p className="text-xs text-gray-400 mt-1">How many points earned per 1 unit spent</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Redemption Rate (currency per point)
              </label>
              <input
                type="number"
                value={formRedemptionRate}
                onChange={(e) => setFormRedemptionRate(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                step="0.001"
                min="0"
              />
              <p className="text-xs text-gray-400 mt-1">Value of 1 point in currency (e.g., 0.01 = 100 pts = 1 unit)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Points to Redeem
              </label>
              <input
                type="number"
                value={formMinRedeem}
                onChange={(e) => setFormMinRedeem(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                min="0"
              />
              <p className="text-xs text-gray-400 mt-1">Customers need at least this many points to redeem</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Welcome Bonus
              </label>
              <input
                type="number"
                value={formWelcomeBonus}
                onChange={(e) => setFormWelcomeBonus(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                min="0"
              />
              <p className="text-xs text-gray-400 mt-1">Points awarded on customer&apos;s first purchase (0 = disabled)</p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
