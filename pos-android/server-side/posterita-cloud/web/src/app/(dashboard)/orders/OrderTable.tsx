"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Package,
  Receipt,
} from "lucide-react";
import { dataQuery } from "@/lib/supabase/data-client";
import { SkeletonOrderLines } from "@/components/Skeleton";

interface Order {
  order_id: number;
  document_no: string | null;
  order_type: string | null;
  date_ordered: string;
  qty_total: number;
  tax_total: number;
  grand_total: number;
  is_paid: boolean;
  is_sync: boolean;
  store?: { name: string } | null;
  terminal?: { name: string } | null;
}

interface OrderLine {
  orderline_id: number;
  product_id: number;
  productname: string;
  qtyentered: number;
  priceentered: number;
  lineamt: number;
  linenetamt: number;
  costamt: number;
}

export default function OrderTable({ orders }: { orders: Order[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [linesLoading, setLinesLoading] = useState(false);

  const toggleExpand = async (orderId: number) => {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);
    setLinesLoading(true);

    const { data } = await dataQuery<OrderLine>("orderline", {
      select:
        "orderline_id, product_id, productname, qtyentered, priceentered, lineamt, linenetamt, costamt",
      filters: [{ column: "order_id", op: "eq", value: orderId }],
      order: { column: "orderline_id" },
    });

    setOrderLines(data ?? []);
    setLinesLoading(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            <th className="w-10"></th>
            <th>Order #</th>
            <th>Store</th>
            <th>Type</th>
            <th>Date</th>
            <th className="text-right">Items</th>
            <th className="text-right">Tax</th>
            <th className="text-right">Total</th>
            <th>Status</th>
            <th>Sync</th>
          </tr>
        </thead>
        <tbody>
          {orders?.map((o: any) => {
            const isExpanded = expandedId === o.order_id;
            return (
              <>
                <tr
                  key={o.order_id}
                  onClick={() => toggleExpand(o.order_id)}
                  className="cursor-pointer hover:bg-blue-50/50 transition"
                >
                  <td className="text-center">
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </td>
                  <td className="font-medium font-mono">
                    {o.document_no || `#${o.order_id}`}
                  </td>
                  <td className="text-gray-500">{o.store?.name ?? "—"}</td>
                  <td className="text-gray-500">{o.order_type ?? "Sale"}</td>
                  <td className="text-gray-500 text-sm">
                    {new Date(o.date_ordered).toLocaleString()}
                  </td>
                  <td className="text-right text-gray-500">{o.qty_total}</td>
                  <td className="text-right text-gray-500">
                    {formatCurrency(o.tax_total)}
                  </td>
                  <td className="text-right font-bold">
                    {formatCurrency(o.grand_total)}
                  </td>
                  <td>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        o.is_paid
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {o.is_paid ? "Paid" : "Pending"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        o.is_sync
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {o.is_sync ? "Synced" : "Pending"}
                    </span>
                  </td>
                </tr>

                {/* Order Lines */}
                {isExpanded && (
                  <tr key={`lines-${o.order_id}`}>
                    <td colSpan={10} className="!p-0">
                      <div className="bg-gray-50 border-y border-gray-100">
                        {linesLoading ? (
                          <SkeletonOrderLines />
                        ) : orderLines.length === 0 ? (
                          <div className="text-center py-6 text-gray-500 text-sm">
                            <Package
                              className="mx-auto mb-2 text-gray-400"
                              size={24}
                            />
                            No order lines found
                          </div>
                        ) : (
                          <div className="px-6 py-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Receipt size={16} className="text-gray-500" />
                              <span className="text-sm font-medium text-gray-700">
                                Order Lines ({orderLines.length} items)
                              </span>
                            </div>
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                                  <th className="pb-2 font-medium">Product</th>
                                  <th className="pb-2 font-medium text-right">
                                    Unit Price
                                  </th>
                                  <th className="pb-2 font-medium text-right">
                                    Qty
                                  </th>
                                  <th className="pb-2 font-medium text-right">
                                    Subtotal
                                  </th>
                                  <th className="pb-2 font-medium text-right">
                                    Tax
                                  </th>
                                  <th className="pb-2 font-medium text-right">
                                    Line Total
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {orderLines.map((line) => (
                                  <tr
                                    key={line.orderline_id}
                                    className="border-t border-gray-100"
                                  >
                                    <td className="py-2 font-medium text-gray-800">
                                      {line.productname}
                                    </td>
                                    <td className="py-2 text-right text-gray-500">
                                      {formatCurrency(line.priceentered)}
                                    </td>
                                    <td className="py-2 text-right text-gray-600">
                                      {line.qtyentered}
                                    </td>
                                    <td className="py-2 text-right text-gray-500">
                                      {formatCurrency(line.lineamt)}
                                    </td>
                                    <td className="py-2 text-right text-gray-500">
                                      {formatCurrency(line.linenetamt - line.lineamt)}
                                    </td>
                                    <td className="py-2 text-right font-medium text-gray-800">
                                      {formatCurrency(line.linenetamt)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t-2 border-gray-200">
                                  <td
                                    colSpan={5}
                                    className="py-2 text-right font-semibold text-gray-600"
                                  >
                                    Order Total:
                                  </td>
                                  <td className="py-2 text-right font-bold text-gray-900">
                                    {formatCurrency(o.grand_total)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
          {(!orders || orders.length === 0) && (
            <tr>
              <td colSpan={10} className="text-center py-12">
                <ShoppingCart className="mx-auto text-gray-400" size={48} />
                <p className="text-gray-500 mt-2">No orders found</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
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
