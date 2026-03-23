"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { dataQuery } from "@/lib/supabase/data-client";
import { ClipboardList, ArrowLeft } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import Link from "next/link";

interface Store {
  store_id: number;
  name: string;
}

export default function NewInventorySessionPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [storeId, setStoreId] = useState<number>(0);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    const res = await dataQuery<Store>("store", {
      select: "store_id, name",
      filters: [{ column: "isactive", op: "eq", value: "Y" }],
      order: { column: "name" },
    });
    setStores(res.data ?? []);
    if (res.data?.[0]) setStoreId(res.data[0].store_id);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!storeId) return;
    setSaving(true);

    const res = await fetch("/api/inventory/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        store_id: storeId,
        type: "spot_check",
        name: name.trim() || null,
        notes: notes.trim() || null,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (data.data?.session_id) {
      router.push(`/inventory/${data.data.session_id}`);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Inventory", href: "/inventory" }, { label: "New Session" }]} />

      <div className="flex items-center gap-4">
        <Link href="/inventory" className="p-2 text-gray-400 hover:text-gray-600 transition">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Inventory Session</h1>
          <p className="text-gray-500 mt-1">
            Create a spot check session — scan products on Android POS to record quantities
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-amber-50 rounded-lg">
            <ClipboardList size={24} className="text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold">Spot Check</h3>
            <p className="text-sm text-gray-500">Walk the store, scan barcodes, record quantities</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Store</label>
            {loading ? (
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ) : (
              <select
                value={storeId}
                onChange={(e) => setStoreId(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              >
                {stores.map((s) => (
                  <option key={s.store_id} value={s.store_id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Session Name <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekly spot check, Aisle 3"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any instructions or notes for this count..."
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleCreate}
            disabled={saving || !storeId}
            className="flex items-center gap-2 bg-posterita-blue text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Session"}
          </button>
        </div>
      </div>
    </div>
  );
}
