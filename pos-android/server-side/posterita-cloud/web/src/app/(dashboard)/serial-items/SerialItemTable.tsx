"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";

interface SerialItem {
  id: number;
  serial_number: string;
  serial_type: string;
  status: string;
  product_id: number;
  product_name: string;
  store_id: number;
  store_name: string;
  customer_name: string | null;
  warranty_months: number | null;
  purchase_date: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  in_stock: "bg-green-100 text-green-700",
  sold: "bg-blue-100 text-blue-700",
  delivered: "bg-purple-100 text-purple-700",
  returned: "bg-orange-100 text-orange-700",
  received: "bg-gray-100 text-gray-600",
};

const TYPE_COLORS: Record<string, string> = {
  vin: "bg-indigo-100 text-indigo-700",
  imei: "bg-cyan-100 text-cyan-700",
  serial: "bg-gray-100 text-gray-600",
  certificate: "bg-amber-100 text-amber-700",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function warrantyStatus(
  purchaseDate: string | null,
  warrantyMonths: number | null
): { label: string; className: string } {
  if (!purchaseDate || !warrantyMonths) return { label: "-", className: "text-gray-400" };

  const start = new Date(purchaseDate);
  const expiry = new Date(start);
  expiry.setMonth(expiry.getMonth() + warrantyMonths);
  const now = new Date();

  if (now > expiry) {
    return { label: "Expired", className: "text-red-600" };
  }

  const monthsLeft = Math.ceil(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  if (monthsLeft <= 3) {
    return { label: `${monthsLeft}mo left`, className: "text-orange-600" };
  }
  return { label: `${monthsLeft}mo left`, className: "text-green-600" };
}

export default function SerialItemTable({ items }: { items: SerialItem[] }) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
        <p className="text-gray-400 text-lg">No serial items found</p>
        <p className="text-gray-400 text-sm mt-1">
          Receive stock to start tracking serialized items
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            <th>Serial Number</th>
            <th>Product</th>
            <th>Type</th>
            <th>Status</th>
            <th>Store</th>
            <th>Customer</th>
            <th>Warranty</th>
            <th className="w-12"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const warranty = warrantyStatus(item.purchase_date, item.warranty_months);
            return (
              <tr key={item.id} className="hover:bg-blue-50/50 transition">
                <td>
                  <span className="font-mono text-sm font-medium">
                    {item.serial_number}
                  </span>
                </td>
                <td>
                  <span className="text-gray-700">{item.product_name}</span>
                </td>
                <td>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      TYPE_COLORS[item.serial_type] || TYPE_COLORS.serial
                    }`}
                  >
                    {item.serial_type.toUpperCase()}
                  </span>
                </td>
                <td>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      STATUS_COLORS[item.status] || STATUS_COLORS.received
                    }`}
                  >
                    {item.status.replace("_", " ")}
                  </span>
                </td>
                <td className="text-gray-500">{item.store_name}</td>
                <td className="text-gray-500">{item.customer_name || "-"}</td>
                <td>
                  <span className={`text-sm font-medium ${warranty.className}`}>
                    {warranty.label}
                  </span>
                </td>
                <td>
                  <Link
                    href={`/customer/serial-items/${item.id}`}
                    className="text-gray-400 hover:text-posterita-blue p-1 inline-block"
                    aria-label={`Edit ${item.serial_number}`}
                  >
                    <Pencil size={16} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
