"use client";

import { useEffect, useState } from "react";
import { dataQuery, dataUpdate } from "@/lib/supabase/data-client";
import {
  Monitor,
  RefreshCw,
  Save,
  X,
  Hash,
  MapPin,
  Banknote,
  ListOrdered,
  QrCode,
  Copy,
  Check,
  Pencil,
  ChefHat,
  Smartphone,
  ScreenShare,
  Plus,
  Lock,
  Unlock,
} from "lucide-react";
import { SkeletonTable } from "@/components/Skeleton";
import Breadcrumb from "@/components/Breadcrumb";

interface Terminal {
  terminal_id: number;
  account_id: string;
  store_id: number;
  name: string;
  prefix: string | null;
  floatamt: number;
  areacode: string | null;
  isactive: string;
  sequence: number;
  terminal_type: string;
  zone: string | null;
  locked_device_id: string | null;
  locked_device_name: string | null;
  locked_at: string | null;
}

interface Store {
  store_id: number;
  name: string;
}

const TERMINAL_TYPES = [
  { value: "pos_retail", label: "POS — Retail", icon: Monitor, color: "bg-blue-100 text-blue-700" },
  { value: "pos_restaurant", label: "POS — Restaurant", icon: ChefHat, color: "bg-orange-100 text-orange-700" },
  { value: "kds", label: "Kitchen Display", icon: ScreenShare, color: "bg-green-100 text-green-700" },
  { value: "mobile_staff", label: "Staff Device", icon: Smartphone, color: "bg-purple-100 text-purple-700" },
  { value: "customer_display", label: "Customer Display", icon: Monitor, color: "bg-gray-100 text-gray-600" },
  { value: "self_service", label: "Self-Service Kiosk", icon: Monitor, color: "bg-teal-100 text-teal-700" },
];

const typeInfo = (type: string) => TERMINAL_TYPES.find((t) => t.value === type) ?? TERMINAL_TYPES[0];

export default function TerminalsPage() {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Terminal>>({});
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);

  // Create state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStoreId, setNewStoreId] = useState(0);
  const [newType, setNewType] = useState("pos_retail");
  const [creating, setCreating] = useState(false);

  // QR modal
  const [qrTerminal, setQrTerminal] = useState<Terminal | null>(null);
  const [copied, setCopied] = useState(false);

  // Unlock
  const [unlocking, setUnlocking] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [tRes, sRes] = await Promise.all([
      dataQuery<Terminal>("terminal", {
        select: "terminal_id, account_id, store_id, name, prefix, floatamt, areacode, isactive, sequence, terminal_type, zone, locked_device_id, locked_device_name, locked_at",
        order: { column: "name" },
      }),
      dataQuery<Store>("store", {
        select: "store_id, name",
        filters: [{ column: "isactive", op: "eq", value: "Y" }],
        order: { column: "name" },
      }),
    ]);
    setTerminals(tRes.data ?? []);
    setStores(sRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const storeMap = Object.fromEntries(stores.map((s) => [s.store_id, s.name]));

  const openEdit = (t: Terminal) => {
    setEditId(t.terminal_id);
    setForm({ ...t });
    setSaveOk(false);
  };

  const closeEdit = () => { setEditId(null); setForm({}); };

  const updateField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaveOk(false);
  };

  const saveTerminal = async () => {
    if (!editId) return;
    setSaving(true);
    await dataUpdate("terminal", { column: "terminal_id", value: editId }, {
      name: form.name,
      prefix: form.prefix || null,
      floatamt: Number(form.floatamt) || 0,
      areacode: form.areacode || null,
      isactive: form.isactive,
      sequence: Number(form.sequence) || 0,
      terminal_type: form.terminal_type || "pos_retail",
      zone: form.zone || null,
      store_id: Number(form.store_id) || 0,
    });
    setSaving(false);
    setSaveOk(true);
    setTimeout(() => setSaveOk(false), 2000);
    await fetchData();
  };

  const createTerminal = async () => {
    if (!newName.trim() || !newStoreId) return;
    setCreating(true);
    await fetch("/api/data/insert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "terminal",
        data: {
          name: newName.trim(),
          store_id: newStoreId,
          terminal_type: newType,
          isactive: "Y",
          sequence: 0,
          prefix: null,
          floatamt: 0,
        },
      }),
    });
    setCreating(false);
    setShowCreate(false);
    setNewName("");
    await fetchData();
  };

  const handleUnlock = async (terminalId: number) => {
    if (!confirm("Unlock this terminal? Any device will be able to enroll on it.")) return;
    setUnlocking(terminalId);
    await fetch(`/api/terminals/${terminalId}/unlock`, { method: "POST" });
    setUnlocking(null);
    await fetchData();
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Terminals" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Terminals</h1>
          <p className="text-gray-500 mt-1">Configure devices for deployment</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowCreate(true); setNewStoreId(stores[0]?.store_id || 0); }}
            className="flex items-center gap-2 bg-posterita-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            <Plus size={16} />
            Add Terminal
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Create panel */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-green-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">New Terminal</h3>
            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Terminal Name</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Register 1"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Store</label>
              <select value={newStoreId} onChange={(e) => setNewStoreId(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue outline-none">
                {stores.map((s) => <option key={s.store_id} value={s.store_id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Type</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue outline-none">
                {TERMINAL_TYPES.map((tt) => <option key={tt.value} value={tt.value}>{tt.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={createTerminal} disabled={creating || !newName.trim()}
              className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50">
              <Plus size={16} /> {creating ? "Creating..." : "Create Terminal"}
            </button>
          </div>
        </div>
      )}

      {/* Edit panel */}
      {editId && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-lg">Edit Terminal</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={saveTerminal}
                disabled={saving}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition ${
                  saveOk
                    ? "bg-green-600 text-white"
                    : "bg-posterita-blue text-white hover:bg-blue-700"
                } disabled:opacity-50`}
              >
                <Save size={16} />
                {saveOk ? "Saved!" : saving ? "Saving..." : "Save"}
              </button>
              <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Terminal Type — prominent selector */}
          <div className="mb-5">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Terminal Type</label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {TERMINAL_TYPES.map((tt) => {
                const Icon = tt.icon;
                const selected = form.terminal_type === tt.value;
                return (
                  <button
                    key={tt.value}
                    onClick={() => updateField("terminal_type", tt.value)}
                    className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 transition text-center ${
                      selected
                        ? "border-posterita-blue bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <Icon size={22} className={selected ? "text-posterita-blue" : "text-gray-400"} />
                    <span className={`text-xs font-medium ${selected ? "text-posterita-blue" : "text-gray-600"}`}>
                      {tt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                <Monitor size={14} /> Terminal Name
              </label>
              <input
                type="text"
                value={form.name ?? ""}
                onChange={(e) => updateField("name", e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Store</label>
              <select
                value={form.store_id ?? 0}
                onChange={(e) => updateField("store_id", Number(e.target.value))}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              >
                {stores.map((s) => (
                  <option key={s.store_id} value={s.store_id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Zone</label>
              <input
                type="text"
                value={form.zone ?? ""}
                onChange={(e) => updateField("zone", e.target.value)}
                placeholder="e.g. Ground Floor, Kitchen, Patio"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                <Hash size={14} /> Invoice Prefix
              </label>
              <input
                type="text"
                value={form.prefix ?? ""}
                onChange={(e) => updateField("prefix", e.target.value)}
                placeholder="e.g. INV, T1"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                <Banknote size={14} /> Float Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={form.floatamt ?? 0}
                onChange={(e) => updateField("floatamt", e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
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

          {/* Device Lock */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">Device Lock</p>
            {form.locked_device_id ? (
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Locked to: {form.locked_device_name || form.locked_device_id}
                    </p>
                    <p className="text-xs text-amber-600">
                      Since {form.locked_at ? new Date(form.locked_at).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleUnlock(editId!)}
                  disabled={unlocking === editId}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-50 transition disabled:opacity-50"
                >
                  <Unlock size={14} />
                  {unlocking === editId ? "Unlocking..." : "Unlock"}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Unlock size={14} className="text-green-500" />
                <span>No device lock — any device can enroll on this terminal</span>
              </div>
            )}
          </div>

          {/* System Info */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">System</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>ID: <span className="font-mono font-medium text-gray-700">{editId}</span></span>
              <span>Sequence: <span className="font-mono font-medium text-gray-700">{form.sequence ?? 0}</span></span>
              {form.areacode && <span>Area: <span className="font-mono font-medium text-gray-700">{form.areacode}</span></span>}
            </div>
          </div>
        </div>
      )}

      {/* Terminal list */}
      {loading ? (
        <SkeletonTable rows={5} columns={5} />
      ) : terminals.length === 0 ? (
        <div className="text-center py-16">
          <Monitor className="mx-auto text-gray-400" size={64} />
          <h3 className="text-lg font-medium text-gray-700 mt-4">No terminals registered</h3>
          <p className="text-gray-500 mt-1">Terminals appear here once they sync with the cloud</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Terminal</th>
                <th>Type</th>
                <th>Store</th>
                <th>Zone</th>
                <th>Prefix</th>
                <th className="text-center">Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {terminals.map((t) => {
                const ti = typeInfo(t.terminal_type);
                const Icon = ti.icon;
                return (
                  <tr key={t.terminal_id} className={editId === t.terminal_id ? "bg-blue-50" : ""}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${ti.color.split(" ")[0]}`}>
                          <Icon size={16} className={ti.color.split(" ")[1]} />
                        </div>
                        <div>
                          <span className="font-medium">{t.name}</span>
                          {t.locked_device_id && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Lock size={10} className="text-amber-500" />
                              <span className="text-[10px] text-amber-600">{t.locked_device_name || t.locked_device_id}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${ti.color}`}>
                        {ti.label}
                      </span>
                    </td>
                    <td className="text-gray-500 text-sm">
                      {storeMap[t.store_id] ?? `Store ${t.store_id}`}
                    </td>
                    <td className="text-gray-500 text-sm">{t.zone || "—"}</td>
                    <td className="font-mono text-sm text-gray-500">{t.prefix || "—"}</td>
                    <td className="text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        t.isactive === "Y" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {t.isactive === "Y" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(t)}
                          className="p-1.5 text-gray-400 hover:text-posterita-blue transition"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => { setQrTerminal(t); setCopied(false); }}
                          className="p-1.5 text-gray-400 hover:text-posterita-blue transition"
                          title="Enrollment QR"
                        >
                          <QrCode size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* QR Enrollment Modal */}
      {qrTerminal && (() => {
        const qrString = `POSTERITA:1:${qrTerminal.account_id}:${qrTerminal.store_id}:${qrTerminal.terminal_id}`;
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrString)}`;
        return (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setQrTerminal(null)}
          >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-semibold">Enroll Device</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {qrTerminal.name} &middot; {storeMap[qrTerminal.store_id] ?? "Store"}
                  </p>
                </div>
                <button onClick={() => setQrTerminal(null)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 flex flex-col items-center gap-4">
                <p className="text-sm text-gray-600 text-center">
                  Scan this QR code from the POS app to enroll a device to this terminal.
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrImageUrl} alt={`QR code for ${qrTerminal.name}`} width={250} height={250} className="rounded-xl border border-gray-200 p-2" />
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2 w-full">
                  <code className="text-xs text-gray-600 flex-1 truncate">{qrString}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(qrString); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    className="text-gray-400 hover:text-posterita-blue p-1"
                  >
                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
              <div className="p-6 pt-0">
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <p className="text-xs text-blue-700">
                    <strong>How to enroll:</strong> Open the POS app → scan this QR code. The device will automatically configure itself for this terminal.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
