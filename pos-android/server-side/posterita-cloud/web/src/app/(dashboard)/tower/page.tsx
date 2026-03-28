"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Monitor, Smartphone, Users, Clock, AlertCircle, Wallet,
  RefreshCw, Shield, Lock, Unlock, Eye, Power, Radio,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

interface Session {
  id: number;
  device_id: string;
  terminal_id: number;
  terminal_name: string;
  user_id: number;
  user_name: string | null;
  store_id: number;
  started_at: string;
  last_seen_at: string;
  till_uuid: string | null;
  minutes_ago: number;
}

interface Terminal {
  terminal_id: number;
  name: string;
  terminal_type: string;
  lock_mode: string;
  locked_device_id: string | null;
  locked_device_name: string | null;
  isactive: string;
}

interface OpenTill {
  till_id: number;
  uuid: string;
  documentno: string;
  terminal_id: number;
  opening_amt: number;
  grand_total: number;
}

interface Device {
  device_id: string;
  device_name: string;
  device_model: string;
  app_version: string;
  terminal_id: number;
  last_sync_at: string;
}

interface TowerData {
  sessions: Session[];
  terminals: Terminal[];
  open_tills: OpenTill[];
  devices: Device[];
  recent_errors: any[];
  summary: {
    active_sessions: number;
    total_terminals: number;
    production_terminals: number;
    open_tills: number;
    active_devices: number;
    open_errors: number;
  };
}

export default function TowerPage() {
  const [data, setData] = useState<TowerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tower");
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    // Auto-refresh every 30 seconds
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const deployTerminal = async (id: number) => {
    await fetch(`/api/terminals/${id}/deploy`, { method: "POST" });
    load();
  };

  const unlockTerminal = async (id: number) => {
    await fetch(`/api/terminals/${id}/unlock`, { method: "POST" });
    load();
  };

  const forceEndSession = async (deviceId: string) => {
    await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "end", device_id: deviceId, end_reason: "force_logout" }),
    });
    load();
  };

  if (loading && !data) {
    return (
      <div className="text-center py-16 text-gray-400">
        <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
        Loading tower control...
      </div>
    );
  }

  const s = data?.summary;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Tower Control" }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Radio size={28} className="text-red-500" />
            Tower Control
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Live view — refreshes every 30s — last: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Active Sessions", value: s?.active_sessions, icon: Users, color: "text-green-600" },
          { label: "Terminals", value: s?.total_terminals, icon: Monitor, color: "text-blue-600" },
          { label: "Production", value: s?.production_terminals, icon: Lock, color: "text-purple-600" },
          { label: "Open Tills", value: s?.open_tills, icon: Wallet, color: "text-amber-600" },
          { label: "Devices", value: s?.active_devices, icon: Smartphone, color: "text-teal-600" },
          { label: "Errors", value: s?.open_errors, icon: AlertCircle, color: s?.open_errors ? "text-red-600" : "text-gray-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2">
              <Icon size={16} className={color} />
              <p className="text-xs text-gray-500">{label}</p>
            </div>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Active Sessions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-green-50 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h3 className="font-semibold text-green-800">Active Sessions ({data?.sessions.length || 0})</h3>
        </div>
        {data?.sessions.length ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Terminal</th>
                <th>Device</th>
                <th>Started</th>
                <th>Last Seen</th>
                <th>Till</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.sessions.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">{s.user_name || `User #${s.user_id}`}</td>
                  <td>{s.terminal_name}</td>
                  <td className="text-xs font-mono text-gray-400">{s.device_id.substring(0, 12)}...</td>
                  <td className="text-sm text-gray-500">{new Date(s.started_at).toLocaleTimeString()}</td>
                  <td>
                    <span className={`text-sm ${s.minutes_ago < 5 ? "text-green-600" : s.minutes_ago < 15 ? "text-amber-600" : "text-red-600"}`}>
                      {s.minutes_ago}m ago
                    </span>
                  </td>
                  <td>{s.till_uuid ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Open</span> : "—"}</td>
                  <td>
                    <button onClick={() => forceEndSession(s.device_id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium">
                      Force Logout
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">No active sessions</div>
        )}
      </div>

      {/* Terminals */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Terminal Fleet</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Terminal</th>
              <th>Type</th>
              <th>Lock Mode</th>
              <th>Locked To</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.terminals ?? []).map((t) => (
              <tr key={t.terminal_id}>
                <td className="font-medium">{t.name}</td>
                <td>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {t.terminal_type?.replace("_", " ")}
                  </span>
                </td>
                <td>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    t.lock_mode === "production" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {t.lock_mode === "production" ? "Production" : "Exploration"}
                  </span>
                </td>
                <td className="text-sm text-gray-500">
                  {t.locked_device_id
                    ? <span className="flex items-center gap-1"><Lock size={12} className="text-gray-400" /> {t.locked_device_name || t.locked_device_id.substring(0, 12)}</span>
                    : <span className="text-gray-400">Unlocked</span>}
                </td>
                <td className="flex gap-2">
                  {t.lock_mode === "exploration" && (
                    <button onClick={() => deployTerminal(t.terminal_id)}
                      className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                      <Shield size={12} /> Deploy
                    </button>
                  )}
                  {t.locked_device_id && (
                    <button onClick={() => unlockTerminal(t.terminal_id)}
                      className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
                      <Unlock size={12} /> Unlock
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Open Tills */}
      {(data?.open_tills?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-amber-100 bg-amber-50">
            <h3 className="font-semibold text-amber-800">Open Tills ({data?.open_tills.length})</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {data?.open_tills.map((t) => (
              <div key={t.till_id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{t.documentno}</p>
                  <p className="text-xs text-gray-500">Terminal #{t.terminal_id}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{t.grand_total?.toFixed(2) || "0.00"}</p>
                  <p className="text-xs text-gray-400">Opening: {t.opening_amt?.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Errors */}
      {(data?.recent_errors?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-red-100 bg-red-50">
            <h3 className="font-semibold text-red-800">Open Errors ({data?.recent_errors.length})</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {data?.recent_errors.map((e: any) => (
              <div key={e.id} className="px-6 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">{e.tag}</span>
                  <span className="text-xs text-gray-400">{new Date(e.created_at).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm text-gray-700 mt-1 truncate">{e.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
