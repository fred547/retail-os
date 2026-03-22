"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Package,
  ArrowLeft,
  Merge,
  Check,
  X,
  Globe,
  FileText,
  ShoppingCart,
  Receipt,
  Search,
  Rss,
  AlertCircle,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

interface IntakeItem {
  item_id: number;
  batch_id: number;
  name: string;
  description: string | null;
  selling_price: number | null;
  cost_price: number | null;
  image_url: string | null;
  image_cdn_url: string | null;
  barcode: string | null;
  category_name: string | null;
  unit: string | null;
  supplier_sku: string | null;
  quantity: number | null;
  match_product_id: number | null;
  match_confidence: number | null;
  match_type: string | null;
  status: string;
  override_name: string | null;
  override_price: number | null;
  committed_product_id: number | null;
}

interface MatchedProduct {
  product_id: number;
  name: string;
  sellingprice: number;
  costprice: number;
  image: string | null;
  upc: string | null;
  productcategory_id: number | null;
}

interface Batch {
  batch_id: number;
  source: string;
  source_ref: string | null;
  status: string;
  item_count: number;
  approved_count: number;
  rejected_count: number;
  supplier_name: string | null;
  created_at: string;
}

const SOURCE_META: Record<string, { label: string; icon: typeof Globe }> = {
  website: { label: "Website", icon: Globe },
  catalogue: { label: "Catalogue", icon: FileText },
  purchase_order: { label: "Purchase Order", icon: ShoppingCart },
  invoice: { label: "Invoice", icon: Receipt },
  ai_search: { label: "AI Search", icon: Search },
  supplier_feed: { label: "Supplier Feed", icon: Rss },
};

export default function BatchReviewPage() {
  const router = useRouter();
  const params = useParams();
  const batchId = params.batchId as string;

  const [batch, setBatch] = useState<Batch | null>(null);
  const [items, setItems] = useState<IntakeItem[]>([]);
  const [matchedProducts, setMatchedProducts] = useState<MatchedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [reviewingAll, setReviewingAll] = useState(false);

  const fetchBatch = useCallback(async () => {
    const res = await fetch(`/api/intake/${batchId}`);
    const data = await res.json();
    if (data.batch) setBatch(data.batch);
    if (data.items) setItems(data.items);
    if (data.matchedProducts) setMatchedProducts(data.matchedProducts);
    setLoading(false);

    // If still processing, poll
    if (data.batch?.status === "processing") {
      setProcessing(true);
    } else {
      setProcessing(false);
    }
  }, [batchId]);

  useEffect(() => {
    fetchBatch();
  }, [fetchBatch]);

  // Poll while processing
  useEffect(() => {
    if (!processing) return;
    const interval = setInterval(fetchBatch, 3000);
    return () => clearInterval(interval);
  }, [processing, fetchBatch]);

  // Show a progress message while processing
  useEffect(() => {
    if (processing && progress.length === 0) {
      setProgress(["AI is extracting products and matching against your catalog..."]);
    }
  }, [processing, progress.length]);

  const getMatchedProduct = (id: number | null): MatchedProduct | undefined => {
    if (!id) return undefined;
    return matchedProducts.find((p) => p.product_id === id);
  };

  const reviewItem = async (itemId: number, action: "approve" | "reject" | "merge") => {
    const res = await fetch(`/api/intake/${batchId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actions: [{ item_id: itemId, action }] }),
    });
    if (res.ok) fetchBatch();
  };

  const reviewAll = async (action: "approve" | "reject") => {
    setReviewingAll(true);
    const pendingItems = items.filter((i) => i.status === "pending");
    const actions = pendingItems.map((i) => ({
      item_id: i.item_id,
      action: action === "approve" && i.match_product_id ? "merge" as const : action,
    }));

    await fetch(`/api/intake/${batchId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actions }),
    });
    await fetchBatch();
    setReviewingAll(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={32} className="text-posterita-blue animate-spin" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Batch not found.</p>
      </div>
    );
  }

  const srcMeta = SOURCE_META[batch.source] ?? SOURCE_META.website;
  const SrcIcon = srcMeta.icon;
  const pendingItems = items.filter((i) => i.status === "pending");
  const newItems = items.filter((i) => i.match_type === "new" && i.status === "pending");
  const matchedItems = items.filter((i) => i.match_type !== "new" && i.match_product_id && i.status === "pending");

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: "Product Intake", href: "/customer/intake" },
        { label: `Batch #${batch.batch_id}` },
      ]} />

      {/* Batch header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/customer/intake")} className="p-2 rounded-lg hover:bg-gray-100 transition">
            <ArrowLeft size={20} className="text-gray-500" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-gray-100">
              <SrcIcon size={22} className="text-gray-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{srcMeta.label} Intake</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {batch.source_ref || batch.supplier_name || `Batch #${batch.batch_id}`}
                {" "}
                &middot; {new Date(batch.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Summary chips */}
        <div className="flex items-center gap-3 text-sm">
          <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 font-medium">
            {batch.item_count} items
          </span>
          {batch.approved_count > 0 && (
            <span className="px-3 py-1.5 rounded-full bg-green-100 text-green-700 font-medium">
              {batch.approved_count} approved
            </span>
          )}
          {batch.rejected_count > 0 && (
            <span className="px-3 py-1.5 rounded-full bg-red-100 text-red-700 font-medium">
              {batch.rejected_count} rejected
            </span>
          )}
          {pendingItems.length > 0 && (
            <span className="px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 font-medium">
              {pendingItems.length} pending
            </span>
          )}
        </div>
      </div>

      {/* Processing state */}
      {processing && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-6 py-5">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 size={20} className="text-posterita-blue animate-spin" />
            <span className="font-semibold text-blue-800">Processing...</span>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {progress.map((msg, i) => (
              <p key={i} className="text-sm text-blue-700">{msg}</p>
            ))}
          </div>
        </div>
      )}

      {/* Bulk actions */}
      {pendingItems.length > 0 && !processing && (
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-5 py-3">
          <AlertCircle size={18} className="text-gray-400" />
          <span className="text-sm text-gray-600 flex-1">
            <strong>{pendingItems.length}</strong> items pending review
            {newItems.length > 0 && <span> ({newItems.length} new, {matchedItems.length} matched)</span>}
          </span>
          <button
            onClick={() => reviewAll("approve")}
            disabled={reviewingAll}
            className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium disabled:opacity-50"
          >
            {reviewingAll ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            Approve All
          </button>
          <button
            onClick={() => reviewAll("reject")}
            disabled={reviewingAll}
            className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 transition text-sm font-medium disabled:opacity-50"
          >
            <XCircle size={14} />
            Reject All
          </button>
        </div>
      )}

      {/* Item cards */}
      {items.length === 0 && !processing ? (
        <div className="text-center py-12 text-gray-500">
          No items extracted yet. Processing may still be starting.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const matched = getMatchedProduct(item.match_product_id);
            const imgSrc = item.image_cdn_url || item.image_url;
            const isPending = item.status === "pending";

            return (
              <div
                key={item.item_id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition ${
                  item.status === "approved" || item.status === "merged"
                    ? "border-green-200 bg-green-50/30"
                    : item.status === "rejected"
                    ? "border-red-200 bg-red-50/30 opacity-60"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-stretch">
                  {/* Image */}
                  <div className="w-20 h-20 flex-shrink-0 bg-gray-100 flex items-center justify-center">
                    {imgSrc && imgSrc.startsWith("http") ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={imgSrc} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={24} className="text-gray-400" />
                    )}
                  </div>

                  {/* Extracted data */}
                  <div className="flex-1 px-4 py-3 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">{item.name}</span>
                      {item.match_type === "exact" && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 rounded">EXACT MATCH</span>
                      )}
                      {item.match_type === "fuzzy" && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-yellow-100 text-yellow-700 rounded">
                          FUZZY {item.match_confidence ? `${Math.round(item.match_confidence * 100)}%` : ""}
                        </span>
                      )}
                      {item.match_type === "new" && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded">NEW</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      {item.selling_price != null && (
                        <span>Sell: <strong className="text-gray-700">{formatCurrency(item.selling_price)}</strong></span>
                      )}
                      {item.cost_price != null && (
                        <span>Cost: {formatCurrency(item.cost_price)}</span>
                      )}
                      {item.category_name && <span>{item.category_name}</span>}
                      {item.barcode && <span className="font-mono text-xs">{item.barcode}</span>}
                      {item.quantity != null && <span>Qty: {item.quantity}</span>}
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{item.description}</p>
                    )}
                  </div>

                  {/* Matched product comparison */}
                  {matched && (
                    <div className="w-64 border-l border-gray-100 bg-gray-50 px-4 py-3 flex-shrink-0">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Existing Product</p>
                      <div className="flex items-center gap-2">
                        {matched.image && matched.image.startsWith("http") ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={matched.image} alt={matched.name} className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                            <Package size={14} className="text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{matched.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(matched.sellingprice)}
                            {matched.costprice > 0 && <span className="ml-2">cost: {formatCurrency(matched.costprice)}</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 px-4 flex-shrink-0">
                    {isPending ? (
                      <>
                        <button
                          onClick={() => reviewItem(item.item_id, item.match_product_id ? "merge" : "approve")}
                          className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition text-sm"
                          title={item.match_product_id ? "Merge with existing product" : "Create new product"}
                        >
                          {item.match_product_id ? <Merge size={14} /> : <Check size={14} />}
                          {item.match_product_id ? "Merge" : "Approve"}
                        </button>
                        <button
                          onClick={() => reviewItem(item.item_id, "reject")}
                          className="flex items-center gap-1 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition text-sm"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        item.status === "approved" || item.status === "merged"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {item.status === "approved" && <><CheckCircle size={12} /> Created</>}
                        {item.status === "merged" && <><Merge size={12} /> Merged</>}
                        {item.status === "rejected" && <><XCircle size={12} /> Rejected</>}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Committed summary */}
      {batch.status === "committed" && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-5 text-center">
          <CheckCircle size={32} className="text-green-600 mx-auto mb-2" />
          <h2 className="text-lg font-semibold text-green-800">Batch Complete</h2>
          <p className="text-sm text-green-600 mt-1">
            {batch.approved_count} product{batch.approved_count !== 1 ? "s" : ""} approved
            {batch.rejected_count > 0 && `, ${batch.rejected_count} rejected`}.
            Approved products are now live and will sync to POS devices.
          </p>
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
  }).format(amount);
}
