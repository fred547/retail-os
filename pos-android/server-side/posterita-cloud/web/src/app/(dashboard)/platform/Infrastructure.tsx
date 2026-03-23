"use client";

import { useEffect, useState } from "react";
import {
  Globe, Server, Database, Brain, Image, GitBranch,
  DollarSign, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  ExternalLink,
} from "lucide-react";

interface InfraData {
  services: Record<string, any>;
  totalCost: Record<string, any>;
  timestamp: string;
}

const SERVICE_META: Record<string, { icon: any; color: string; url: string }> = {
  vercel: { icon: Globe, color: "bg-black text-white", url: "https://vercel.com/tamakgroup/posterita-cloud" },
  render: { icon: Server, color: "bg-purple-600 text-white", url: "https://dashboard.render.com" },
  supabase: { icon: Database, color: "bg-green-600 text-white", url: "https://supabase.com/dashboard/project/ldyoiexyqvklujvwcaqq" },
  anthropic: { icon: Brain, color: "bg-orange-600 text-white", url: "https://console.anthropic.com" },
  cloudinary: { icon: Image, color: "bg-blue-500 text-white", url: "https://console.cloudinary.com" },
  github: { icon: GitBranch, color: "bg-gray-800 text-white", url: "https://github.com/fred547/retail-os" },
};

function statusIcon(status: string) {
  if (status === "active") return <CheckCircle size={16} className="text-green-500" />;
  if (status === "degraded") return <AlertTriangle size={16} className="text-yellow-500" />;
  return <XCircle size={16} className="text-red-500" />;
}

export default function Infrastructure() {
  const [data, setData] = useState<InfraData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/infrastructure");
      setData(await res.json());
    } catch (_) {}
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

  const { services, totalCost } = data;

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
