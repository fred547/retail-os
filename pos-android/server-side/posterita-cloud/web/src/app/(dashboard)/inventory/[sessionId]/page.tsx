"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  PlayCircle,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { SkeletonTable } from "@/components/Skeleton";

interface SessionDetail {
  session_id: number;
  account_id: string;
  store_id: number;
  type: string;
  status: string;
  name: string | null;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: number;
  entries: AggregatedEntry[];
  unique_products: number;
  total_quantity: number;
}

interface AggregatedEntry {
  product_id: number;
  product_name: string | null;
  upc: string | null;
  total_quantity: number;
  scanned_by: number;
  last_scanned_at: string;
}

const STATUS_META: Record<string, { label: string; color: string; bgColor: string }> = {
  created: { label: "Created", color: "text-gray-700", bgColor: "bg-gray-100" },
  active: { label: "Active", color: "text-blue-700", bgColor: "bg-blue-100" },
  completed: { label: "Completed", color: "text-green-700", bgColor: "bg-green-100" },
  cancelled: { label: "Cancelled", color: "text-red-700", bgColor: "bg-red-100" },
};

export default function InventorySessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSession = async () => {
    setLoading(true);
    const res = await fetch(`/api/inventory/sessions/${sessionId}`);
    const data = await res.json();
    setSession(data.data ?? null);
    setLoading(false);
  };

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  const updateStatus = async (newStatus: string) => {
    setActionLoading(true);
    await fetch(`/api/inventory/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await fetchSession();
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Inventory", href: "/inventory" }, { label: "Session" }]} />
        <SkeletonTable rows={5} columns={4} />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Inventory", href: "/inventory" }, { label: "Not Found" }]} />
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold text-gray-900">Session not found</h2>
          <Link href="/inventory" className="text-posterita-blue mt-4 inline-block">
            Back to Inventory
          </Link>
        </div>
      </div>
    );
  }

  const st = STATUS_META[session.status] ?? STATUS_META.created;
  const duration = session.started_at
    ? (() => {
        const end = session.completed_at ? new Date(session.completed_at) : new Date();
        const start = new Date(session.started_at);
        const mins = Math.round((end.getTime() - start.getTime()) / 60000);
        if (mins < 60) return `${mins}m`;
        return `${Math.floor(mins / 60)}h ${mins % 60}m`;
      })()
    : null;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Inventory", href: "/inventory" }, { label: session.name || `Session #${session.session_id}` }]} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/inventory" className="p-2 text-gray-400 hover:text-gray-600 transition">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {session.name || `Session #${session.session_id}`}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${st.bgColor} ${st.color}`}>
                {st.label}
              </span>
              <span className="text-sm text-gray-500">
                {session.type === "spot_check" ? "Spot Check" : "Full Count"}
              </span>
              {duration && (
                <span className="text-sm text-gray-400 flex items-center gap-1">
                  <Clock size={14} />
                  {duration}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSession}
            className="flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          {session.status === "created" && (
            <button
              onClick={() => updateStatus("active")}
              disabled={actionLoading}
              className="flex items-center gap-2 bg-posterita-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <PlayCircle size={16} />
              {actionLoading ? "..." : "Start"}
            </button>
          )}

          {session.status === "active" && (
            <>
              <button
                onClick={() => updateStatus("completed")}
                disabled={actionLoading}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                <CheckCircle size={16} />
                {actionLoading ? "..." : "Complete"}
              </button>
              <button
                onClick={() => updateStatus("cancelled")}
                disabled={actionLoading}
                className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition disabled:opacity-50"
              >
                <XCircle size={16} />
                {actionLoading ? "..." : "Cancel"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notes */}
      {session.notes && (
        <div className="bg-gray-50 rounded-xl px-5 py-3 text-sm text-gray-600">
          {session.notes}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Package size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{session.unique_products}</p>
              <p className="text-sm text-gray-500">Unique Products</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <BarChart3 size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{session.total_quantity}</p>
              <p className="text-sm text-gray-500">Total Quantity</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Clock size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{duration ?? "—"}</p>
              <p className="text-sm text-gray-500">Duration</p>
            </div>
          </div>
        </div>
      </div>

      {/* Entries Table */}
      {session.entries.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto text-gray-400" size={48} />
          <h3 className="text-lg font-medium text-gray-700 mt-4">No products counted yet</h3>
          <p className="text-gray-500 mt-1">
            Scan products on the Android POS to add them to this session
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>UPC</th>
                <th className="text-center">Quantity</th>
                <th>Last Scanned</th>
              </tr>
            </thead>
            <tbody>
              {session.entries.map((e) => (
                <tr key={e.product_id}>
                  <td className="font-medium">{e.product_name ?? `Product #${e.product_id}`}</td>
                  <td className="text-sm text-gray-500">{e.upc ?? "—"}</td>
                  <td className="text-center font-semibold">{e.total_quantity}</td>
                  <td className="text-sm text-gray-500">
                    {new Date(e.last_scanned_at).toLocaleString()}
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
