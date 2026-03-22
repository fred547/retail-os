"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, FileText, ShoppingCart, Receipt, Search, Upload, Loader2, ArrowRight } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

type Source = "website" | "catalogue" | "purchase_order" | "invoice" | "ai_search";

const SOURCE_OPTIONS: { id: Source; label: string; desc: string; icon: typeof Globe; color: string }[] = [
  { id: "website", label: "Website", desc: "Scrape products from a business website or online menu", icon: Globe, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { id: "ai_search", label: "AI Search", desc: "Search the web for a business and extract their products", icon: Search, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  { id: "catalogue", label: "Supplier Catalogue", desc: "Upload a PDF or CSV catalogue from a supplier", icon: FileText, color: "text-purple-600 bg-purple-50 border-purple-200" },
  { id: "purchase_order", label: "Purchase Order", desc: "Upload a PO to import ordered items into your catalog", icon: ShoppingCart, color: "text-green-600 bg-green-50 border-green-200" },
  { id: "invoice", label: "Invoice", desc: "Upload an invoice to extract products and cost prices", icon: Receipt, color: "text-orange-600 bg-orange-50 border-orange-200" },
];

export default function NewIntakePage() {
  const router = useRouter();
  const [source, setSource] = useState<Source | null>(null);
  const [sourceRef, setSourceRef] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const needsUrl = source === "website" || source === "ai_search";
  const needsFile = source === "catalogue" || source === "purchase_order" || source === "invoice";

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "posterita_unsigned");
      formData.append("folder", "posterita/intake/documents");

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dp2u3pwiy";
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.secure_url) {
        setFileUrl(data.secure_url);
        setSourceRef(file.name);
      } else {
        setError("Upload failed. Please try again.");
      }
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!source) return;
    if (needsUrl && !sourceRef.trim()) return;
    if (needsFile && !fileUrl) return;

    setCreating(true);
    setError("");

    try {
      // Create the batch
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          source_ref: sourceRef.trim() || null,
          source_file_url: fileUrl || null,
          supplier_name: supplierName.trim() || null,
        }),
      });

      const { data: batch, error: apiError } = await res.json();
      if (apiError) {
        setError(apiError);
        setCreating(false);
        return;
      }

      // Start processing (fire-and-forget — we'll navigate to the batch page which will poll)
      fetch(`/api/intake/${batch.batch_id}/process`, { method: "POST" });

      // Navigate to batch review page
      router.push(`/customer/intake/${batch.batch_id}`);
    } catch (e: any) {
      setError(e.message || "Failed to create intake batch");
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Breadcrumb items={[
        { label: "Product Intake", href: "/customer/intake" },
        { label: "New Intake" },
      ]} />

      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Product Intake</h1>
        <p className="text-gray-500 mt-1">Choose a source and let AI extract your products</p>
      </div>

      {/* Source selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Where are the products coming from?</label>
        <div className="grid grid-cols-1 gap-3">
          {SOURCE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const selected = source === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => { setSource(opt.id); setSourceRef(""); setFileUrl(""); setError(""); }}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition ${
                  selected
                    ? "border-posterita-blue bg-blue-50/50 ring-2 ring-posterita-blue/20"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className={`p-2.5 rounded-lg ${opt.color}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{opt.label}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{opt.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Source-specific input */}
      {source && (
        <div className="space-y-4 bg-white rounded-xl border border-gray-200 p-6">
          {needsUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {source === "website" ? "Website URL" : "Business name and location"}
              </label>
              <input
                type="text"
                value={sourceRef}
                onChange={(e) => setSourceRef(e.target.value)}
                placeholder={source === "website" ? "https://example.com/menu" : "Pizza Palace, Port Louis"}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              />
            </div>
          )}

          {needsFile && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload {source === "catalogue" ? "catalogue" : source === "purchase_order" ? "purchase order" : "invoice"} (PDF, CSV, or image)
              </label>
              {fileUrl ? (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <FileText size={20} className="text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800">{sourceRef}</p>
                    <p className="text-xs text-green-600">Uploaded successfully</p>
                  </div>
                  <button
                    onClick={() => { setFileUrl(""); setSourceRef(""); }}
                    className="text-sm text-green-700 hover:text-green-900 font-medium"
                  >
                    Replace
                  </button>
                </div>
              ) : (
                <label className={`flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed transition cursor-pointer ${
                  uploading ? "border-blue-300 bg-blue-50" : "border-gray-300 hover:border-posterita-blue hover:bg-blue-50/30"
                }`}>
                  {uploading ? (
                    <>
                      <Loader2 size={32} className="text-posterita-blue animate-spin mb-2" />
                      <p className="text-sm text-gray-600">Uploading...</p>
                    </>
                  ) : (
                    <>
                      <Upload size={32} className="text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, CSV, XLSX, PNG, JPG</p>
                    </>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}

          {/* Supplier name (optional, shown for PO/invoice/catalogue) */}
          {needsFile && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier name (optional)
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. ABC Wholesale"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={creating || (needsUrl && !sourceRef.trim()) || (needsFile && !fileUrl)}
            className="flex items-center justify-center gap-2 w-full bg-posterita-blue text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Starting...
              </>
            ) : (
              <>
                Extract Products
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
