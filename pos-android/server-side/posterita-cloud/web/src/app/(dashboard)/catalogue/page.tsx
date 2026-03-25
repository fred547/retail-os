"use client";

import { useEffect, useState } from "react";
import { dataQuery } from "@/lib/supabase/data-client";
import {
  Download,
  Loader2,
  LayoutGrid,
  List,
  Table2,
  Eye,
  EyeOff,
  CreditCard,
  FileText,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

type Template = "grid" | "list" | "price-list" | "loyalty-card";
type PageSize = "a4" | "a5" | "a6" | "dl" | "business-card" | "square";

const TEMPLATES: { id: Template; label: string; desc: string; icon: typeof LayoutGrid }[] = [
  { id: "grid", label: "Grid", desc: "Cards with images", icon: LayoutGrid },
  { id: "list", label: "List", desc: "Full-width rows", icon: List },
  { id: "price-list", label: "Price List", desc: "Compact table", icon: Table2 },
  { id: "loyalty-card", label: "Loyalty Cards", desc: "Business cards for loyalty signup", icon: CreditCard },
];

const PAGE_SIZES: { id: PageSize; label: string; desc: string }[] = [
  { id: "a4", label: "A4", desc: "210 x 297mm" },
  { id: "a5", label: "A5", desc: "148 x 210mm" },
  { id: "a6", label: "A6 Postcard", desc: "105 x 148mm" },
  { id: "dl", label: "DL Flyer", desc: "99 x 210mm" },
  { id: "business-card", label: "Business Card", desc: "89 x 51mm" },
  { id: "square", label: "Square", desc: "127 x 127mm" },
];

interface Category {
  productcategory_id: number;
  name: string;
}

export default function CataloguePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [template, setTemplate] = useState<Template>("grid");
  const [pageSize, setPageSize] = useState<PageSize>("a5");
  const [categoryId, setCategoryId] = useState<string>("");
  const [showTitle, setShowTitle] = useState(false);
  const [showCost, setShowCost] = useState(false);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showDescription, setShowDescription] = useState(true);
  const [showImages, setShowImages] = useState(true);
  const [showQrCode, setShowQrCode] = useState(false);
  const [loyaltyMessage, setLoyaltyMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [productCount, setProductCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await dataQuery<Category>("productcategory", {
        select: "productcategory_id, name",
        filters: [{ column: "isactive", op: "eq", value: "Y" }],
        order: { column: "name" },
      });
      setCategories(data ?? []);
    })();
    loadCount();
  }, []);

  useEffect(() => { loadCount(); }, [categoryId]);

  // Auto-set page size for loyalty cards
  useEffect(() => {
    if (template === "loyalty-card") setPageSize("a4");
  }, [template]);

  const loadCount = async () => {
    const filters: any[] = [{ column: "isactive", op: "eq", value: "Y" }];
    if (categoryId) filters.push({ column: "productcategory_id", op: "eq", value: Number(categoryId) });
    const { count } = await dataQuery("product", { select: "product_id", filters, count: "exact", head: true });
    setProductCount(count);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/catalogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template,
          pageSize: template === "loyalty-card" ? "a4" : pageSize,
          category_id: categoryId ? Number(categoryId) : undefined,
          showTitle,
          showCost,
          showBarcode,
          showDescription,
          showImages,
          showQrCode,
          loyaltyMessage: loyaltyMessage.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to generate");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `catalogue-${template}-${pageSize}-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || "Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  const isLoyalty = template === "loyalty-card";

  return (
    <div className="space-y-6 max-w-3xl">
      <Breadcrumb items={[{ label: "Catalogue" }]} />

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Print Catalogue</h1>
        <p className="text-gray-500 mt-1">
          Generate printer-friendly PDFs — product catalogues, price lists, or loyalty cards
        </p>
      </div>

      {/* Template Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Format</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TEMPLATES.map((t) => {
            const Icon = t.icon;
            const selected = template === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-center transition ${
                  selected
                    ? "border-posterita-blue bg-blue-50/50 ring-2 ring-posterita-blue/20"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className={`p-2 rounded-lg ${selected ? "bg-blue-100 text-posterita-blue" : "bg-gray-100 text-gray-500"}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">{t.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{t.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Page Size Selection (not for loyalty cards — those are always A4 with multiple cards) */}
      {!isLoyalty && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Paper Size</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {PAGE_SIZES.map((sz) => {
              const selected = pageSize === sz.id;
              return (
                <button
                  key={sz.id}
                  onClick={() => setPageSize(sz.id)}
                  className={`p-2 rounded-lg border-2 text-center transition ${
                    selected
                      ? "border-posterita-blue bg-blue-50/50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="font-medium text-xs text-gray-900">{sz.label}</div>
                  <div className="text-[9px] text-gray-500">{sz.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Options */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        {/* Loyalty message (only for loyalty cards) */}
        {isLoyalty && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loyalty Message
            </label>
            <input
              type="text"
              value={loyaltyMessage}
              onChange={(e) => setLoyaltyMessage(e.target.value)}
              placeholder="Scan to earn points on every purchase!"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.productcategory_id} value={c.productcategory_id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Toggle options (not for loyalty cards) */}
        {!isLoyalty && (
          <div className="flex flex-wrap gap-2">
            {[
              { key: "showTitle", label: "Title", value: showTitle, set: setShowTitle },
              { key: "showImages", label: "Images", value: showImages, set: setShowImages, disabled: template === "price-list" },
              { key: "showDescription", label: "Descriptions", value: showDescription, set: setShowDescription },
              { key: "showBarcode", label: "Barcodes", value: showBarcode, set: setShowBarcode },
              { key: "showQrCode", label: "QR Codes", value: showQrCode, set: setShowQrCode },
              { key: "showCost", label: "Cost Price", value: showCost, set: setShowCost },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => !opt.disabled && opt.set(!opt.value)}
                disabled={opt.disabled}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  opt.disabled
                    ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                    : opt.value
                      ? "bg-blue-50 text-posterita-blue border border-posterita-blue/30"
                      : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                {opt.value && !opt.disabled ? <Eye size={12} /> : <EyeOff size={12} />}
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center justify-center gap-2 w-full bg-posterita-blue text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 text-sm"
        >
          {generating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download size={16} />
              {isLoyalty ? "Download Loyalty Cards" : `Download ${pageSize.toUpperCase()} PDF`}
              {productCount !== null && !isLoyalty && (
                <span className="text-blue-200 ml-1">({productCount} products)</span>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
