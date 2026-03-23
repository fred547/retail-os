"use client";

import { useEffect, useState } from "react";
import { dataQuery } from "@/lib/supabase/data-client";
import {
  FileText,
  Download,
  Loader2,
  LayoutGrid,
  List,
  Table2,
  Eye,
  EyeOff,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

type Template = "grid" | "list" | "price-list";

const TEMPLATES: { id: Template; label: string; desc: string; icon: typeof LayoutGrid }[] = [
  { id: "grid", label: "Grid", desc: "2-column cards with images", icon: LayoutGrid },
  { id: "list", label: "List", desc: "Full-width rows with images", icon: List },
  { id: "price-list", label: "Price List", desc: "Compact table, no images", icon: Table2 },
];

interface Category {
  productcategory_id: number;
  name: string;
}

export default function CataloguePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [template, setTemplate] = useState<Template>("grid");
  const [categoryId, setCategoryId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [showCost, setShowCost] = useState(false);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showDescription, setShowDescription] = useState(true);
  const [showImages, setShowImages] = useState(true);
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

  useEffect(() => {
    loadCount();
  }, [categoryId]);

  const loadCount = async () => {
    const filters: any[] = [
      { column: "isactive", op: "eq", value: "Y" },
    ];
    if (categoryId) filters.push({ column: "productcategory_id", op: "eq", value: Number(categoryId) });

    const { count } = await dataQuery("product", {
      select: "product_id",
      filters,
      count: "exact",
      head: true,
    });
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
          category_id: categoryId ? Number(categoryId) : undefined,
          title: title.trim() || undefined,
          showCost,
          showBarcode,
          showDescription,
          showImages,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to generate catalogue");
        return;
      }

      // Download the PDF
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `catalogue-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || "Failed to generate catalogue");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Breadcrumb items={[{ label: "Catalogue" }]} />

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Product Catalogue</h1>
        <p className="text-gray-500 mt-1">
          Generate a PDF catalogue of your products to share or print
        </p>
      </div>

      {/* Template Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Template</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TEMPLATES.map((t) => {
            const Icon = t.icon;
            const selected = template === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition ${
                  selected
                    ? "border-posterita-blue bg-blue-50/50 ring-2 ring-posterita-blue/20"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className={`p-2 rounded-lg ${selected ? "bg-blue-100 text-posterita-blue" : "bg-gray-100 text-gray-500"}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{t.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Options */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catalogue Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Store Catalogue"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category Filter</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.productcategory_id} value={c.productcategory_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Toggle options */}
        <div className="flex flex-wrap gap-3">
          {[
            { key: "showImages", label: "Images", value: showImages, set: setShowImages, disabled: template === "price-list" },
            { key: "showDescription", label: "Descriptions", value: showDescription, set: setShowDescription },
            { key: "showBarcode", label: "Barcodes", value: showBarcode, set: setShowBarcode },
            { key: "showCost", label: "Cost Price", value: showCost, set: setShowCost },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => !opt.disabled && opt.set(!opt.value)}
              disabled={opt.disabled}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                opt.disabled
                  ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                  : opt.value
                    ? "bg-blue-50 text-posterita-blue border border-posterita-blue/30"
                    : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              {opt.value && !opt.disabled ? <Eye size={14} /> : <EyeOff size={14} />}
              {opt.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center justify-center gap-2 w-full bg-posterita-blue text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
        >
          {generating ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download size={18} />
              Download Catalogue
              {productCount !== null && (
                <span className="text-blue-200 ml-1">({productCount} products)</span>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
