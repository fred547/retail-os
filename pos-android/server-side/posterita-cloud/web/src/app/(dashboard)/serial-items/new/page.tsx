"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import { dataQuery } from "@/lib/supabase/data-client";
import { logError } from "@/lib/error-logger";

interface Product {
  product_id: number;
  name: string;
}

interface StoreOption {
  store_id: number;
  name: string;
}

export default function ReceiveSerialItemsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [productId, setProductId] = useState("");
  const [serialType, setSerialType] = useState("serial");
  const [serialNumbers, setSerialNumbers] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [warrantyMonths, setWarrantyMonths] = useState("");
  const [storeId, setStoreId] = useState("");
  // VIN-specific fields
  const [color, setColor] = useState("");
  const [year, setYear] = useState("");
  const [engineNumber, setEngineNumber] = useState("");

  useEffect(() => {
    async function loadData() {
      const [productsRes, storesRes] = await Promise.all([
        dataQuery<Product>("product", {
          select: "product_id, name",
          filters: [{ column: "isactive", op: "eq", value: "Y" }],
          order: { column: "name" },
          limit: 500,
        }),
        dataQuery<StoreOption>("store", {
          select: "store_id, name",
          order: { column: "name" },
          limit: 100,
        }),
      ]);
      setProducts(productsRes.data ?? []);
      setStores(storesRes.data ?? []);
      // Default to first store
      if (storesRes.data && storesRes.data.length > 0) {
        setStoreId(String(storesRes.data[0].store_id));
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const lines = serialNumbers
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      setError("Enter at least one serial number");
      return;
    }

    if (!productId) {
      setError("Select a product");
      return;
    }

    if (!storeId) {
      setError("Select a store");
      return;
    }

    setSubmitting(true);

    const items = lines.map((serial_number) => ({
      serial_number,
      product_id: parseInt(productId),
      store_id: parseInt(storeId),
      serial_type: serialType,
      supplier_name: supplierName || undefined,
      purchase_date: purchaseDate || undefined,
      cost_price: costPrice ? parseFloat(costPrice) : undefined,
      warranty_months: warrantyMonths ? parseInt(warrantyMonths) : undefined,
      color: serialType === "vin" && color ? color : undefined,
      year: serialType === "vin" && year ? parseInt(year) : undefined,
      engine_number: serialType === "vin" && engineNumber ? engineNumber : undefined,
    }));

    try {
      const res = await fetch("/api/serial-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Failed to receive items");
        setSubmitting(false);
        return;
      }

      setSuccess(`Successfully received ${result.count} serial item(s)`);
      setSubmitting(false);

      // Redirect after short delay
      setTimeout(() => {
        router.push("/customer/serial-items");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      logError("SerialItemCreate", `Failed to save: ${err.message}`);
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Serial Items", href: "/customer/serial-items" },
            { label: "Receive Stock" },
          ]}
        />
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-64 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Serial Items", href: "/customer/serial-items" },
          { label: "Receive Stock" },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Receive Serial Items</h1>
        <p className="text-gray-500 mt-1">
          Register new serialized items into inventory
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        {/* Product & Type */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Item Details
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Product
              </label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm"
              >
                <option value="">Select a product...</option>
                {products.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Serial Type
                </label>
                <select
                  value={serialType}
                  onChange={(e) => setSerialType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm"
                >
                  <option value="serial">Serial Number</option>
                  <option value="vin">VIN (Vehicle)</option>
                  <option value="imei">IMEI (Mobile Device)</option>
                  <option value="certificate">Certificate Number</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Store
                </label>
                <select
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm"
                >
                  <option value="">Select a store...</option>
                  {stores.map((s) => (
                    <option key={s.store_id} value={s.store_id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Serial Numbers (one per line)
              </label>
              <textarea
                value={serialNumbers}
                onChange={(e) => setSerialNumbers(e.target.value)}
                rows={6}
                required
                placeholder={
                  serialType === "vin"
                    ? "1HGBH41JXMN109186\n2FMDK3GC4CBA12345"
                    : serialType === "imei"
                    ? "353456789012345\n490154203237518"
                    : "SN-2024-00001\nSN-2024-00002"
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm font-mono resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                {serialNumbers.split("\n").filter((l) => l.trim()).length} serial
                number(s) entered
              </p>
            </div>
          </div>
        </div>

        {/* Supplier & Pricing */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Supplier & Pricing
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Supplier Name
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. ABC Motors"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Purchase Date
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Cost Price
              </label>
              <input
                type="number"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Warranty (months)
              </label>
              <input
                type="number"
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(e.target.value)}
                placeholder="12"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* VIN-specific fields */}
        {serialType === "vin" && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Vehicle Details
            </div>
            <div className="p-4 grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Color
                </label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="e.g. Midnight Blue"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Year
                </label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2024"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Engine Number
                </label>
                <input
                  type="text"
                  value={engineNumber}
                  onChange={(e) => setEngineNumber(e.target.value)}
                  placeholder="e.g. ENG-12345"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="bg-posterita-blue text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
          >
            {submitting ? "Receiving..." : "Receive Stock"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/customer/serial-items")}
            className="px-4 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 transition text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
