"use client";

import { useEffect, useState } from "react";
import {
  Globe, Server, Database, Brain, Image, GitBranch, Flame,
  DollarSign, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  ExternalLink, TrendingUp, ArrowUpCircle, Info,
} from "lucide-react";
import { logError } from "@/lib/error-logger";

interface Recommendation {
  service: string;
  level: "info" | "warning" | "critical";
  message: string;
  action: string;
}

interface InfraData {
  services: Record<string, any>;
  usage?: Record<string, any>;
  recommendations?: Recommendation[];
  totalCost: Record<string, any>;
  timestamp: string;
}

const SERVICE_META: Record<string, { icon: any; color: string; url: string }> = {
  vercel: { icon: Globe, color: "bg-black text-white", url: "https://vercel.com/tamakgroup/posterita-cloud" },
  render: { icon: Server, color: "bg-purple-600 text-white", url: "https://dashboard.render.com" },
  supabase: { icon: Database, color: "bg-green-600 text-white", url: "https://supabase.com/dashboard/project/ldyoiexyqvklujvwcaqq" },
  anthropic: { icon: Brain, color: "bg-orange-600 text-white", url: "https://console.anthropic.com" },
  firebase: { icon: Flame, color: "bg-yellow-500 text-white", url: "https://console.firebase.google.com/project/posterita-retail-os/testlab" },
  cloudinary: { icon: Image, color: "bg-blue-500 text-white", url: "https://console.cloudinary.com" },
  github: { icon: GitBranch, color: "bg-gray-800 text-white", url: "https://github.com/fred547/retail-os" },
};

function statusIcon(status: string) {
  if (status === "active") return <CheckCircle size={16} className="text-green-500" />;
  if (status === "degraded") return <AlertTriangle size={16} className="text-yellow-500" />;
  return <XCircle size={16} className="text-red-500" />;
}

function levelIcon(level: string) {
  if (level === "critical") return <XCircle size={16} className="text-red-500" />;
  if (level === "warning") return <AlertTriangle size={16} className="text-yellow-500" />;
  return <Info size={16} className="text-blue-400" />;
}

function levelBorder(level: string) {
  if (level === "critical") return "border-red-200 bg-red-50/50";
  if (level === "warning") return "border-orange-200 bg-orange-50/50";
  return "border-gray-100";
}

function UsageBar({ pct, label }: { pct: number; label: string }) {
  const color = pct > 80 ? "bg-red-500" : pct > 50 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-medium text-gray-700">{pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

export default function Infrastructure() {
  const [data, setData] = useState<InfraData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/infrastructure");
      setData(await res.json());
    } catch (e: any) {
      logError("Platform.Infrastructure", "Failed to load infrastructure data", { error: e?.message });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-400">
        <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
        Loading infrastructure status...
      </div>
    );
  }

  if (!data) return <div className="text-center py-16 text-red-500">Failed to load</div>;

  const { services, usage, recommendations, totalCost } = data;
  const criticalCount = recommendations?.filter(r => r.level === "critical").length ?? 0;
  const warningCount = recommendations?.filter(r => r.level === "warning").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Total cost banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">Estimated Monthly Cost</p>
            <p className="text-4xl font-bold mt-1">{totalCost.estimated_total}</p>
          </div>
          <div className="text-right text-sm text-slate-400 space-y-1">
            <p>Vercel: ${totalCost.vercel}</p>
            <p>Render: ${totalCost.render}</p>
            <p>Claude: ${totalCost.anthropic}</p>
            <p>Supabase + Cloudinary + GitHub: $0</p>
          </div>
        </div>
      </div>

      {/* Upgrade Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ArrowUpCircle size={20} className="text-posterita-blue" />
            <h2 className="text-lg font-semibold text-gray-900">Upgrade Recommendations</h2>
            {criticalCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">{criticalCount} critical</span>
            )}
            {warningCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">{warningCount} warning</span>
            )}
          </div>
          <div className="space-y-2">
            {recommendations
              .sort((a, b) => {
                const order = { critical: 0, warning: 1, info: 2 };
                return (order[a.level] ?? 2) - (order[b.level] ?? 2);
              })
              .map((rec, i) => {
                const meta = SERVICE_META[rec.service];
                const Icon = meta?.icon || Globe;
                return (
                  <div key={i} className={`border rounded-xl p-4 ${levelBorder(rec.level)}`}>
                    <div className="flex items-start gap-3">
                      {levelIcon(rec.level)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-400 uppercase">{rec.service}</span>
                        </div>
                        <p className="text-sm text-gray-700">{rec.message}</p>
                        <p className="text-sm text-gray-500 mt-1">{rec.action}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Usage overview */}
      {usage && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {usage.supabase && (
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-green-600" />
                <span className="text-sm font-medium text-gray-700">Supabase Storage</span>
              </div>
              <UsageBar pct={usage.supabase.pct} label={`~${usage.supabase.estimatedMB}MB of ${usage.supabase.limitMB}MB`} />
            </div>
          )}
          {usage.activity && (
            <>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs text-gray-400">Syncs (7d)</p>
                <p className="text-2xl font-bold text-gray-900">{usage.activity.syncsLast7d.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">~{Math.round(usage.activity.syncsLast7d / 7)}/day</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs text-gray-400">Errors (7d)</p>
                <p className="text-2xl font-bold text-gray-900">{usage.activity.errorsLast7d.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">~{Math.round(usage.activity.errorsLast7d / 7)}/day</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs text-gray-400">Accounts / Orders</p>
                <p className="text-2xl font-bold text-gray-900">{usage.activity.totalAccounts}</p>
                <p className="text-xs text-gray-400 mt-1">{usage.activity.totalOrders.toLocaleString()} orders total</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Service cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(services).map(([key, svc]) => {
          const meta = SERVICE_META[key] || { icon: Globe, color: "bg-gray-600 text-white", url: "#" };
          const Icon = meta.icon;

          return (
            <div key={key} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${meta.color}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 capitalize">{key}</h3>
                    <p className="text-xs text-gray-400">{svc.plan || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {statusIcon(svc.status)}
                  <a href={meta.url} target="_blank" rel="noopener noreferrer"
                    className="text-gray-400 hover:text-posterita-blue transition">
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>

              {/* Details */}
              <div className="px-5 py-4 space-y-2 text-sm">
                {svc.url && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">URL</span>
                    <span className="text-gray-700 font-mono text-xs truncate max-w-[200px]">{svc.url}</span>
                  </div>
                )}
                {svc.cost && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cost</span>
                    <span className="font-medium text-gray-900">{svc.cost}</span>
                  </div>
                )}
                {svc.features && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Features</span>
                    <span className="text-gray-600 text-xs text-right max-w-[220px]">{svc.features}</span>
                  </div>
                )}
                {svc.model && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Model</span>
                    <span className="text-gray-700 font-mono text-xs">{svc.model}</span>
                  </div>
                )}
                {svc.pricing && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pricing</span>
                    <span className="text-gray-600 text-xs">{svc.pricing}</span>
                  </div>
                )}
                {svc.cloudName && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cloud Name</span>
                    <span className="text-gray-700 font-mono text-xs">{svc.cloudName}</span>
                  </div>
                )}
                {svc.regions && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Regions</span>
                    <span className="text-gray-600 text-xs">{svc.regions.join(", ")}</span>
                  </div>
                )}
                {svc.limits && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Limits</span>
                    <span className="text-gray-600 text-xs text-right max-w-[220px]">{svc.limits}</span>
                  </div>
                )}
                {svc.ci && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">CI/CD</span>
                    <span className="text-gray-600 text-xs text-right max-w-[220px]">{svc.ci}</span>
                  </div>
                )}
                {svc.uptime && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Uptime</span>
                    <span className="text-gray-700">{svc.uptime}</span>
                  </div>
                )}
              </div>

              {/* Supabase row counts */}
              {svc.tables && (
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs text-gray-400 font-medium uppercase mb-2">
                    Database: {svc.totalRows.toLocaleString()} total rows
                  </p>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    {Object.entries(svc.tables as Record<string, number>)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .slice(0, 9)
                      .map(([table, count]) => (
                        <div key={table} className="flex justify-between px-1">
                          <span className="text-gray-500 truncate">{table}</span>
                          <span className="font-mono text-gray-700">{(count as number).toLocaleString()}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
