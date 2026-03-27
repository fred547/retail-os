"use client";

import { useEffect, useState, useCallback } from "react";
import {
  MapPin, Plus, Trash2, X, RefreshCw, Grid3X3, Package, ChevronDown, ChevronRight,
} from "lucide-react";

interface Zone {
  zone_id: number;
  name: string | null;
  shelf_start: number;
  shelf_end: number;
  height_labels: string[];
  position: number;
}

interface ProductLoc {
  product_id: number;
  name: string;
  upc: string | null;
  sellingprice: number;
  shelf_location: string;
  quantity_on_hand: number;
}

const DEFAULT_HEIGHTS = ["A", "B", "C", "D", "E", "F", "G"];

export default function StoreLayoutPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [products, setProducts] = useState<ProductLoc[]>([]);
  const [locationCounts, setLocationCounts] = useState<Record<string, number>>({});
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddZone, setShowAddZone] = useState(false);
  const [expandedZone, setExpandedZone] = useState<number | null>(null);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Zone form
  const [fName, setFName] = useState("");
  const [fStart, setFStart] = useState(1);
  const [fEnd, setFEnd] = useState(20);
  const [fHeights, setFHeights] = useState<string[]>([...DEFAULT_HEIGHTS]);
  const [fNewHeight, setFNewHeight] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/store-layout");
      const data = await res.json();
      setZones(data.zones || []);
      setProducts(data.products || []);
      setLocationCounts(data.location_counts || {});
      setUnassignedCount(data.unassigned_count || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createZone = async () => {
    if (fStart > fEnd || fHeights.length === 0) return;
    setSaving(true);
    try {
      await fetch("/api/store-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fName || null,
          shelf_start: fStart,
          shelf_end: fEnd,
          height_labels: fHeights,
          position: zones.length,
        }),
      });
      setShowAddZone(false);
      setFName(""); setFStart(1); setFEnd(20); setFHeights([...DEFAULT_HEIGHTS]);
      load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const deleteZone = async (zoneId: number) => {
    await fetch(`/api/store-layout?zone_id=${zoneId}`, { method: "DELETE" });
    load();
  };

  const removeHeight = (h: string) => setFHeights(fHeights.filter(x => x !== h));
  const addHeight = () => {
    if (fNewHeight.trim() && !fHeights.includes(fNewHeight.trim().toUpperCase())) {
      setFHeights([...fHeights, fNewHeight.trim().toUpperCase()]);
      setFNewHeight("");
    }
  };

  // Products at a specific location
  const productsAtLocation = (loc: string) =>
    products.filter(p => p.shelf_location === loc);

  // Total slots across all zones
  const totalSlots = zones.reduce((sum, z) =>
    sum + (z.shelf_end - z.shelf_start + 1) * z.height_labels.length, 0);
  const occupiedSlots = Object.keys(locationCounts).length;

  if (loading && zones.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
        Loading store layout...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Grid3X3 size={28} className="text-teal-500" />
            Store Layout
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {zones.length} zone{zones.length !== 1 ? "s" : ""} &middot; {totalSlots} slots &middot; {occupiedSlots} occupied &middot; {unassignedCount} products unassigned
          </p>
        </div>
        <button
          onClick={() => setShowAddZone(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors"
        >
          <Plus size={16} /> Add Zone
        </button>
      </div>

      {/* Zones */}
      {zones.map((zone) => {
        const shelfCount = zone.shelf_end - zone.shelf_start + 1;
        const isExpanded = expandedZone === zone.zone_id;

        return (
          <div key={zone.zone_id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Zone Header */}
            <div
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedZone(isExpanded ? null : zone.zone_id)}
            >
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                <MapPin size={18} className="text-teal-500" />
                <div>
                  <p className="font-semibold text-gray-900">
                    {zone.name || `Shelves ${zone.shelf_start}–${zone.shelf_end}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    Shelves {zone.shelf_start}–{zone.shelf_end} &middot; Heights: {zone.height_labels.join(", ")} &middot; {shelfCount * zone.height_labels.length} slots
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => deleteZone(zone.zone_id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Grid */}
            {isExpanded && (
              <div className="px-5 pb-5 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="px-2 py-1 text-left text-gray-500 font-medium sticky left-0 bg-white">Shelf</th>
                      {zone.height_labels.map(h => (
                        <th key={h} className="px-2 py-1 text-center text-gray-500 font-medium min-w-[40px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: shelfCount }, (_, i) => zone.shelf_start + i).map(shelf => (
                      <tr key={shelf} className="border-t border-gray-50">
                        <td className="px-2 py-1 font-mono font-medium text-gray-700 sticky left-0 bg-white">
                          {String(shelf).padStart(3, "0")}
                        </td>
                        {zone.height_labels.map(h => {
                          const loc = `${shelf}-${h}`;
                          const count = locationCounts[loc] || 0;
                          const isSelected = selectedCell === loc;
                          return (
                            <td key={h} className="px-1 py-1 text-center">
                              <button
                                onClick={() => setSelectedCell(isSelected ? null : loc)}
                                className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                                  count > 0
                                    ? isSelected
                                      ? "bg-teal-600 text-white shadow-sm"
                                      : "bg-teal-100 text-teal-700 hover:bg-teal-200"
                                    : "bg-gray-50 text-gray-300 hover:bg-gray-100"
                                }`}
                              >
                                {count > 0 ? count : "·"}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Selected cell detail */}
                {selectedCell && productsAtLocation(selectedCell).length > 0 && (
                  <div className="mt-3 bg-teal-50 rounded-lg p-3 border border-teal-100">
                    <p className="text-xs font-semibold text-teal-800 mb-2">
                      Location {selectedCell} — {productsAtLocation(selectedCell).length} product{productsAtLocation(selectedCell).length !== 1 ? "s" : ""}
                    </p>
                    <div className="space-y-1.5">
                      {productsAtLocation(selectedCell).map(p => (
                        <div key={p.product_id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{p.name}</p>
                            {p.upc && <p className="text-xs text-gray-400 font-mono">{p.upc}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">{p.sellingprice.toFixed(2)}</p>
                            <p className="text-xs text-gray-400">qty: {p.quantity_on_hand}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Unassigned */}
      {unassignedCount > 0 && (
        <div className="bg-orange-50 rounded-xl border border-orange-200 p-5">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-orange-500" />
            <p className="text-sm font-medium text-orange-800">
              {unassignedCount} product{unassignedCount !== 1 ? "s" : ""} without shelf location
            </p>
          </div>
          <p className="text-xs text-orange-600 mt-1">Use Put-Away on the Android warehouse app to assign locations by scanning.</p>
        </div>
      )}

      {zones.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400">
          <Grid3X3 size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No layout configured</p>
          <p className="text-sm mt-1">Add zones to define your shelf numbering and heights.</p>
          <p className="text-xs mt-3 text-gray-400">Example: Shelves 1–20 with heights A, B, C, D, E, F</p>
        </div>
      )}

      {/* Add Zone Modal */}
      {showAddZone && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add Zone</h2>
              <button onClick={() => setShowAddZone(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zone Name</label>
                <input
                  type="text" value={fName} onChange={e => setFName(e.target.value)}
                  placeholder="e.g., Main Floor, Back Room"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shelf Start</label>
                  <input
                    type="number" value={fStart} onChange={e => setFStart(parseInt(e.target.value) || 0)} min={0} max={999}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shelf End</label>
                  <input
                    type="number" value={fEnd} onChange={e => setFEnd(parseInt(e.target.value) || 0)} min={0} max={999}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Heights</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {fHeights.map(h => (
                    <span key={h} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-100 text-teal-700 text-sm font-medium">
                      {h}
                      <button onClick={() => removeHeight(h)} className="hover:bg-teal-200 rounded-full p-0.5"><X size={12} /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text" value={fNewHeight} onChange={e => setFNewHeight(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addHeight()}
                    placeholder="Add height (e.g., H)"
                    maxLength={3}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                  <button onClick={addHeight} className="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-200">Add</button>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Preview: {fEnd - fStart + 1} shelves &times; {fHeights.length} heights = {(fEnd - fStart + 1) * fHeights.length} slots</p>
                <p className="text-xs text-gray-400 mt-1">Location format: <span className="font-mono">{fStart}-{fHeights[0] || "A"}</span> to <span className="font-mono">{fEnd}-{fHeights[fHeights.length - 1] || "G"}</span></p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => setShowAddZone(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button
                onClick={createZone}
                disabled={saving || fStart > fEnd || fHeights.length === 0}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Zone"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
