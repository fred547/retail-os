"use client";

import { useState, useEffect } from "react";
import { Settings, Search, Gift, Clock, X, Check, Loader2 } from "lucide-react";

interface Constraint {
  id: number;
  plan: string;
  constraint_key: string;
  constraint_value: string;
  description: string | null;
}

interface GroupedConstraints {
  [plan: string]: Constraint[];
}

export default function PlanManagement() {
  const [tab, setTab] = useState<"constraints" | "trials">("constraints");

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("constraints")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === "constraints" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <Settings size={14} />
          Constraint Editor
        </button>
        <button
          onClick={() => setTab("trials")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === "trials" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <Gift size={14} />
          Trial Manager
        </button>
      </div>

      {tab === "constraints" && <ConstraintEditor />}
      {tab === "trials" && <TrialManager />}
    </div>
  );
}

// ─── Constraint Editor ──────────────────────────────────────

function ConstraintEditor() {
  const [constraints, setConstraints] = useState<GroupedConstraints>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [filterKey, setFilterKey] = useState("");

  useEffect(() => {
    loadConstraints();
  }, []);

  const loadConstraints = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/plan-constraints");
      const data = await res.json();
      setConstraints(data.constraints ?? {});
    } catch (_) {}
    setLoading(false);
  };

  const [saveResult, setSaveResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const saveConstraint = async (c: Constraint) => {
    const editKey = `${c.plan}:${c.constraint_key}`;
    const newValue = editValues[editKey];
    if (newValue === undefined || newValue === c.constraint_value) return;

    setSaving(editKey);
    setSaveResult(null);
    try {
      const res = await fetch("/api/platform/plan-constraints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: c.plan,
          constraint_key: c.constraint_key,
          constraint_value: newValue,
          description: c.description,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setSaveResult({ type: "error", message: err.error ?? `Failed to save ${c.constraint_key}` });
        setSaving(null);
        return;
      }
      await loadConstraints();
      setEditValues((prev) => {
        const next = { ...prev };
        delete next[editKey];
        return next;
      });
      setSaveResult({ type: "success", message: `Saved ${c.constraint_key} for ${c.plan}` });
    } catch (_) {
      setSaveResult({ type: "error", message: "Network error" });
    }
    setSaving(null);
  };

  const saveAllDirty = async () => {
    const dirtyEntries = Object.entries(editValues).filter(([editKey, val]) => {
      const [plan, ...keyParts] = editKey.split(":");
      const key = keyParts.join(":");
      const c = (constraints[plan] ?? []).find((x) => x.constraint_key === key);
      return c && val !== c.constraint_value;
    });
    if (dirtyEntries.length === 0) return;

    setSaving("all");
    setSaveResult(null);
    let saved = 0;
    let failed = 0;
    for (const [editKey, val] of dirtyEntries) {
      const [plan, ...keyParts] = editKey.split(":");
      const key = keyParts.join(":");
      const c = (constraints[plan] ?? []).find((x) => x.constraint_key === key);
      if (!c) continue;
      try {
        const res = await fetch("/api/platform/plan-constraints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: c.plan,
            constraint_key: c.constraint_key,
            constraint_value: val,
            description: c.description,
          }),
        });
        if (res.ok) saved++;
        else failed++;
      } catch (_) {
        failed++;
      }
    }
    await loadConstraints();
    setEditValues({});
    setSaveResult({
      type: failed > 0 ? "error" : "success",
      message: failed > 0 ? `Saved ${saved}, failed ${failed}` : `Saved ${saved} constraint${saved !== 1 ? "s" : ""}`,
    });
    setSaving(null);
  };

  const dirtyCount = Object.entries(editValues).filter(([editKey, val]) => {
    const [plan, ...keyParts] = editKey.split(":");
    const key = keyParts.join(":");
    const c = (constraints[plan] ?? []).find((x) => x.constraint_key === key);
    return c && val !== c.constraint_value;
  }).length;

  // Group constraints by key for cross-plan view
  const allKeys = new Set<string>();
  for (const plan of Object.keys(constraints)) {
    for (const c of constraints[plan] ?? []) {
      allKeys.add(c.constraint_key);
    }
  }
  const sortedKeys = [...allKeys].sort().filter((k) =>
    filterKey ? k.toLowerCase().includes(filterKey.toLowerCase()) : true
  );

  const planOrder = ["free", "starter", "growth", "business"];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 className="animate-spin mr-2" size={16} />
        Loading constraints...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Save banner */}
      {saveResult && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm ${
          saveResult.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}>
          {saveResult.type === "success" ? <Check size={14} /> : <X size={14} />}
          {saveResult.message}
          <button onClick={() => setSaveResult(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Search size={14} className="text-gray-400" />
        <input
          type="text"
          placeholder="Filter by constraint key..."
          value={filterKey}
          onChange={(e) => setFilterKey(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-64"
        />
        <span className="text-xs text-gray-400">{sortedKeys.length} keys</span>
        <div className="flex-1" />
        {dirtyCount > 0 && (
          <button
            onClick={saveAllDirty}
            disabled={saving === "all"}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            {saving === "all" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Save All Changes ({dirtyCount})
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Key</th>
              {planOrder.map((p) => (
                <th key={p} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{p}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedKeys.map((key) => (
              <tr key={key} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-700 whitespace-nowrap">{key}</td>
                {planOrder.map((plan) => {
                  const c = (constraints[plan] ?? []).find((x) => x.constraint_key === key);
                  if (!c) return <td key={plan} className="px-4 py-2.5 text-gray-300">-</td>;
                  const editKey = `${plan}:${key}`;
                  const currentVal = editValues[editKey] ?? c.constraint_value;
                  const isDirty = editValues[editKey] !== undefined && editValues[editKey] !== c.constraint_value;
                  const isSaving = saving === editKey;

                  // Boolean toggle for feature flags
                  if (key.startsWith("feature_")) {
                    return (
                      <td key={plan} className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              const newVal = currentVal === "true" ? "false" : "true";
                              setEditValues((prev) => ({ ...prev, [editKey]: newVal }));
                            }}
                            className={`w-8 h-5 rounded-full transition relative ${
                              currentVal === "true" ? "bg-green-500" : "bg-gray-300"
                            }`}
                          >
                            <div
                              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                                currentVal === "true" ? "left-3.5" : "left-0.5"
                              }`}
                            />
                          </button>
                          {isDirty && (
                            <button
                              onClick={() => saveConstraint(c)}
                              disabled={isSaving}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  }

                  // Text/number input
                  return (
                    <td key={plan} className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={currentVal}
                          onChange={(e) => setEditValues((prev) => ({ ...prev, [editKey]: e.target.value }))}
                          className={`w-20 border rounded px-2 py-1 text-xs font-mono ${
                            isDirty ? "border-blue-400 bg-blue-50" : "border-gray-200"
                          }`}
                        />
                        {isDirty && (
                          <button
                            onClick={() => saveConstraint(c)}
                            disabled={isSaving}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Trial Manager ──────────────────────────────────────────

function TrialManager() {
  const [search, setSearch] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const searchAccounts = async () => {
    if (!search.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "account",
          select: "account_id, businessname, plan, subscription_status, trial_plan, trial_ends_at, type, status",
          filters: [
            { column: "businessname", op: "ilike", value: `%${search}%` },
          ],
          limit: 20,
        }),
      });
      const data = await res.json();
      setAccounts(data.data ?? []);
    } catch (_) {
      setAccounts([]);
    }
    setLoading(false);
  };

  const handleTrial = async (accountId: string, action: string, trialPlan?: string, trialDays?: number) => {
    setActionLoading(accountId);
    setResult(null);
    try {
      const res = await fetch("/api/platform/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          action,
          trial_plan: trialPlan ?? "growth",
          trial_days: trialDays ?? 14,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ type: "success", message: `Trial ${action} successful for ${accountId}` });
        await searchAccounts(); // Refresh
      } else {
        setResult({ type: "error", message: data.error ?? "Failed" });
      }
    } catch (_) {
      setResult({ type: "error", message: "Request failed" });
    }
    setActionLoading(null);
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by business name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchAccounts()}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <button
          onClick={searchAccounts}
          disabled={loading}
          className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 transition"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {/* Result banner */}
      {result && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm ${
          result.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}>
          {result.type === "success" ? <Check size={14} /> : <X size={14} />}
          {result.message}
        </div>
      )}

      {/* Account list */}
      {accounts.length > 0 && (
        <div className="space-y-3">
          {accounts.map((acc) => {
            const hasActiveTrial = acc.trial_plan && acc.trial_ends_at && new Date(acc.trial_ends_at) > new Date();
            const isActioning = actionLoading === acc.account_id;

            return (
              <div key={acc.account_id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 text-sm">{acc.businessname || acc.account_id}</h3>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">
                        {acc.type}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        acc.status === "active" ? "bg-green-100 text-green-700" :
                        acc.status === "onboarding" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {acc.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{acc.account_id}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>Plan: <span className="font-semibold text-gray-700">{acc.plan ?? "free"}</span></span>
                      <span>Sub: <span className="font-medium">{acc.subscription_status ?? "none"}</span></span>
                    </div>
                    {hasActiveTrial && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Clock size={12} className="text-blue-500" />
                        <span className="text-xs text-blue-600 font-medium">
                          Active trial: {acc.trial_plan} until {new Date(acc.trial_ends_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {!hasActiveTrial && (
                      <>
                        {[14, 30, 60].map((days) => (
                          <button
                            key={days}
                            onClick={() => handleTrial(acc.account_id, "grant", "growth", days)}
                            disabled={isActioning}
                            className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition whitespace-nowrap"
                          >
                            {isActioning ? "..." : `Grant ${days}d Growth`}
                          </button>
                        ))}
                        <button
                          onClick={() => handleTrial(acc.account_id, "grant", "business", 14)}
                          disabled={isActioning}
                          className="px-3 py-1 text-xs font-medium bg-purple-50 text-purple-700 rounded hover:bg-purple-100 transition whitespace-nowrap"
                        >
                          {isActioning ? "..." : "Grant 14d Business"}
                        </button>
                      </>
                    )}
                    {hasActiveTrial && (
                      <>
                        <button
                          onClick={() => handleTrial(acc.account_id, "extend", acc.trial_plan, 14)}
                          disabled={isActioning}
                          className="px-3 py-1 text-xs font-medium bg-green-50 text-green-700 rounded hover:bg-green-100 transition whitespace-nowrap"
                        >
                          {isActioning ? "..." : "Extend +14d"}
                        </button>
                        <button
                          onClick={() => handleTrial(acc.account_id, "extend", acc.trial_plan, 30)}
                          disabled={isActioning}
                          className="px-3 py-1 text-xs font-medium bg-green-50 text-green-700 rounded hover:bg-green-100 transition whitespace-nowrap"
                        >
                          {isActioning ? "..." : "Extend +30d"}
                        </button>
                        <button
                          onClick={() => handleTrial(acc.account_id, "revoke")}
                          disabled={isActioning}
                          className="px-3 py-1 text-xs font-medium bg-red-50 text-red-700 rounded hover:bg-red-100 transition whitespace-nowrap"
                        >
                          {isActioning ? "..." : "Revoke Trial"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {accounts.length === 0 && search && !loading && (
        <p className="text-sm text-gray-400 text-center py-8">No accounts found matching &ldquo;{search}&rdquo;</p>
      )}
    </div>
  );
}
