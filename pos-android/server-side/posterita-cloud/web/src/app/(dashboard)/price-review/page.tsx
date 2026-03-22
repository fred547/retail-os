"use client";

import { useEffect, useState } from "react";
import { dataQuery, dataUpdate } from "@/lib/supabase/data-client";
import { Check, CheckCheck, DollarSign } from "lucide-react";
import { SkeletonTable } from "@/components/Skeleton";
import Image from "next/image";
import Breadcrumb from "@/components/Breadcrumb";

interface ReviewProduct {
  product_id: number;
  name: string;
  sellingprice: number;
  image: string | null;
  price_set_by: number;
  updated_at: string;
  set_by_name: string;
  category_name: string;
}

export default function PriceReviewPage() {
  const [products, setProducts] = useState<ReviewProduct[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await dataQuery<ReviewProduct>("v_price_review", {
      order: { column: "updated_at", ascending: false },
    });
    setProducts(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const toggleSelect = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.product_id)));
    }
  };

  const approveSelected = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    for (const id of ids) {
      await dataUpdate("product", { column: "product_id", value: id }, { needs_price_review: null });
    }

    setSelected(new Set());
    await fetchProducts();
  };

  const approveAll = async () => {
    // Approve each product individually through the proxy
    for (const p of products) {
      await dataUpdate("product", { column: "product_id", value: p.product_id }, { needs_price_review: null });
    }
    setSelected(new Set());
    await fetchProducts();
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Price Review" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Price Review</h1>
          <p className="text-gray-500 mt-1">
            Products with prices set by staff members
          </p>
        </div>
        <div className="flex gap-3">
          {selected.size > 0 && (
            <button
              onClick={approveSelected}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              <Check size={18} />
              Approve Selected ({selected.size})
            </button>
          )}
          {products.length > 0 && (
            <button
              onClick={approveAll}
              className="flex items-center gap-2 bg-posterita-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <CheckCheck size={18} />
              Approve All
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={6} columns={7} />
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <DollarSign className="mx-auto text-green-300" size={64} />
          <h3 className="text-lg font-medium text-gray-700 mt-4">
            All prices approved
          </h3>
          <p className="text-gray-500 mt-1">
            No products need price review at this time
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-12">
                  <input
                    type="checkbox"
                    checked={selected.size === products.length}
                    onChange={selectAll}
                    className="rounded"
                  />
                </th>
                <th className="w-16">Image</th>
                <th>Product</th>
                <th>Category</th>
                <th className="text-right">Price Set</th>
                <th>Set By</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.product_id}
                  className={selected.has(p.product_id) ? "bg-blue-50" : ""}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(p.product_id)}
                      onChange={() => toggleSelect(p.product_id)}
                      className="rounded"
                    />
                  </td>
                  <td>
                    {p.image ? (
                      <Image
                        src={p.image}
                        alt={p.name ?? ""}
                        width={40}
                        height={40}
                        className="rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                        <DollarSign size={18} className="text-orange-400" />
                      </div>
                    )}
                  </td>
                  <td className="font-medium">{p.name}</td>
                  <td className="text-gray-500">{p.category_name ?? "—"}</td>
                  <td className="text-right font-bold text-green-600">
                    {formatCurrency(p.sellingprice)}
                  </td>
                  <td className="text-gray-500">{p.set_by_name ?? "Staff"}</td>
                  <td className="text-gray-500 text-sm">
                    {new Date(p.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "MUR",
    minimumFractionDigits: 2,
  }).format(amount ?? 0);
}
