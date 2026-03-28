"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Zap, Plus, Trash2, ToggleLeft, ToggleRight, Play, X,
  FolderTree, DollarSign, Search, ArrowLeft, RefreshCw, Check,
} from "lucide-react";
import { dataQuery } from "@/lib/supabase/data-client";
import Breadcrumb from "@/components/Breadcrumb";
import { logError } from "@/lib/error-logger";

interface Rule {
  id: number;
  name: string;
  rule_type: string;
  category_ids: number[];
  min_price: number | null;
  max_price: number | null;
  keyword: string | null;
  tag_ids: number[];
  is_active: boolean;
  priority: number;
}

interface TagInfo { tag_id: number; name: string; color: string | null; tag_group_id: number }
interface TagGroupInfo { tag_group_id: number; name: string }
interface Category { productcategory_id: number; name: string }

const RULE_TYPES = [
  { id: "category", label: "By Category", icon: FolderTree, desc: "Tag all products in selected categories" },
  { id: "price_range", label: "By Price Range", icon: DollarSign, desc: "Tag products within a price range" },
  { id: "keyword", label: "By Keyword", icon: Search, desc: "Tag products whose name/description contains a word" },
];

export default function AutoTagRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [tagGroups, setTagGroups] = useState<TagGroupInfo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);

  // Form
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("category");
  const [formCatIds, setFormCatIds] = useState<number[]>([]);
  const [formMinPrice, setFormMinPrice] = useState("");
  const [formMaxPrice, setFormMaxPrice] = useState("");
  const [formKeyword, setFormKeyword] = useState("");
  const [formTagIds, setFormTagIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, tagsRes, groupsRes, catsRes] = await Promise.all([
        fetch("/api/tags/auto-rules").then(r => r.json()),
        fetch("/api/tags").then(r => r.json()),
        fetch("/api/tags/groups").then(r => r.json()),
        dataQuery<Category>("productcategory", {
          select: "productcategory_id, name",
          filters: [{ column: "isactive", op: "eq", value: "Y" }],
          order: { column: "name" },
        }),
      ]);
      setRules(rulesRes.rules || []);
      setTags(tagsRes.tags || []);
      setTagGroups(groupsRes.groups?.map((g: any) => ({ tag_group_id: g.tag_group_id, name: g.name })) || []);
      setCategories(catsRes.data ?? []);
    } catch (e: any) {
      logError("AutoTagRules", `Load failed: ${e.message}`);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setFormName(""); setFormType("category"); setFormCatIds([]); setFormMinPrice(""); setFormMaxPrice(""); setFormKeyword(""); setFormTagIds([]);
  };

  const createRule = async () => {
    if (!formName.trim() || !formTagIds.length) return;
    setSaving(true);
    try {
      await fetch("/api/tags/auto-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          rule_type: formType,
          category_ids: formType === "category" ? formCatIds : [],
          min_price: formType === "price_range" ? (parseFloat(formMinPrice) || null) : null,
          max_price: formType === "price_range" ? (parseFloat(formMaxPrice) || null) : null,
          keyword: formType === "keyword" ? formKeyword : null,
          tag_ids: formTagIds,
        }),
      });
      setShowCreate(false);
      resetForm();
      loadData();
    } catch (e: any) {
      logError("AutoTagRules", `Create failed: ${e.message}`);
    } finally { setSaving(false); }
  };

  const toggleRule = async (rule: Rule) => {
    await fetch("/api/tags/auto-rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rule.id, is_active: !rule.is_active }),
    });
    loadData();
  };

  const deleteRule = async (id: number) => {
    if (!confirm("Delete this rule?")) return;
    await fetch("/api/tags/auto-rules", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadData();
  };

  const applyAllRules = async () => {
    setApplying(true);
    setApplyResult(null);
    try {
      const res = await fetch("/api/tags/auto-apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json();
      setApplyResult(data.message || `Applied ${data.applied} tags`);
    } catch (e: any) {
      setApplyResult(`Error: ${e.message}`);
    } finally { setApplying(false); }
  };

  const getTagName = (id: number) => tags.find(t => t.tag_id === id)?.name || `#${id}`;
  const getTagColor = (id: number) => tags.find(t => t.tag_id === id)?.color || "#6B7280";
  const getCatName = (id: number) => categories.find(c => c.productcategory_id === id)?.name || `#${id}`;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Tags", href: "/customer/tags" }, { label: "Auto-Tag Rules" }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap size={28} className="text-amber-500" /> Auto-Tag Rules
          </h1>
          <p className="text-sm text-gray-500 mt-1">Define rules to automatically tag products — no manual work</p>
        </div>
        <div className="flex gap-2">
          <button onClick={applyAllRules} disabled={applying || rules.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50">
            <Play size={16} /> {applying ? "Running..." : "Run All Rules"}
          </button>
          <button onClick={() => { resetForm(); setShowCreate(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-posterita-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
            <Plus size={16} /> New Rule
          </button>
        </div>
      </div>

      {applyResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <Check size={16} /> {applyResult}
        </div>
      )}

      {/* Rules list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400"><RefreshCw size={24} className="animate-spin mx-auto mb-2" /> Loading...</div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <Zap size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No auto-tag rules yet</p>
          <p className="text-sm text-gray-400 mt-1">Create rules to automatically tag products by category, price, or keyword</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => {
            const typeInfo = RULE_TYPES.find(t => t.id === rule.rule_type) || RULE_TYPES[0];
            const Icon = typeInfo.icon;
            return (
              <div key={rule.id} className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 ${!rule.is_active ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                      <Icon size={18} className="text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{rule.name}</p>
                      <p className="text-xs text-gray-500">{typeInfo.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleRule(rule)} className="text-gray-400 hover:text-gray-600">
                      {rule.is_active ? <ToggleRight size={24} className="text-green-500" /> : <ToggleLeft size={24} />}
                    </button>
                    <button onClick={() => deleteRule(rule.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Condition */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="text-xs text-gray-400 mr-1">IF</span>
                  {rule.rule_type === "category" && rule.category_ids.map(id => (
                    <span key={id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{getCatName(id)}</span>
                  ))}
                  {rule.rule_type === "price_range" && (
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">
                      {rule.min_price != null ? `${rule.min_price}` : "0"} – {rule.max_price != null ? `${rule.max_price}` : "∞"}
                    </span>
                  )}
                  {rule.rule_type === "keyword" && (
                    <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">contains &quot;{rule.keyword}&quot;</span>
                  )}

                  <span className="text-xs text-gray-400 mx-1">THEN</span>
                  {rule.tag_ids.map(id => (
                    <span key={id} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: `${getTagColor(id)}20`, color: getTagColor(id) }}>
                      {getTagName(id)}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Rule Sheet */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">New Auto-Tag Rule</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g., Beverages → Drinks tag"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-posterita-blue outline-none" />
              </div>

              {/* Rule type selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rule Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {RULE_TYPES.map(rt => {
                    const I = rt.icon;
                    return (
                      <button key={rt.id} onClick={() => setFormType(rt.id)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition ${
                          formType === rt.id ? "border-posterita-blue bg-blue-50" : "border-gray-200 hover:border-gray-300"
                        }`}>
                        <I size={20} className={formType === rt.id ? "text-posterita-blue" : "text-gray-400"} />
                        <span className="text-xs font-medium">{rt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Condition fields */}
              {formType === "category" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Categories (IF product is in...)</label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200">
                    {categories.map(cat => (
                      <button key={cat.productcategory_id} type="button"
                        onClick={() => setFormCatIds(prev => prev.includes(cat.productcategory_id) ? prev.filter(id => id !== cat.productcategory_id) : [...prev, cat.productcategory_id])}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition ${
                          formCatIds.includes(cat.productcategory_id) ? "bg-blue-100 border-blue-300 text-blue-700" : "bg-white border-gray-200 text-gray-500"
                        }`}>
                        {formCatIds.includes(cat.productcategory_id) && <Check size={10} className="inline mr-1" />}
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formType === "price_range" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
                    <input type="number" step="0.01" value={formMinPrice} onChange={e => setFormMinPrice(e.target.value)} placeholder="0"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-posterita-blue outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
                    <input type="number" step="0.01" value={formMaxPrice} onChange={e => setFormMaxPrice(e.target.value)} placeholder="No limit"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-posterita-blue outline-none" />
                  </div>
                </div>
              )}

              {formType === "keyword" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Keyword (product name or description contains...)</label>
                  <input type="text" value={formKeyword} onChange={e => setFormKeyword(e.target.value)} placeholder="e.g., organic, sugar-free"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-posterita-blue outline-none" />
                </div>
              )}

              {/* Tag selection (THEN apply these tags) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags to Apply (THEN assign...)</label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200">
                  {tags.map(tag => (
                    <button key={tag.tag_id} type="button"
                      onClick={() => setFormTagIds(prev => prev.includes(tag.tag_id) ? prev.filter(id => id !== tag.tag_id) : [...prev, tag.tag_id])}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition ${
                        formTagIds.includes(tag.tag_id) ? "border-transparent shadow-sm" : "bg-white border-gray-200 text-gray-500"
                      }`}
                      style={formTagIds.includes(tag.tag_id) ? { backgroundColor: `${tag.color ?? "#6B7280"}20`, color: tag.color ?? "#6B7280", borderColor: `${tag.color ?? "#6B7280"}40` } : undefined}>
                      {formTagIds.includes(tag.tag_id) && <Check size={10} className="inline mr-1" />}
                      {tag.name}
                    </button>
                  ))}
                  {tags.length === 0 && <p className="text-xs text-gray-400">No tags — <Link href="/customer/tags" className="underline">create some first</Link></p>}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={createRule} disabled={saving || !formName.trim() || !formTagIds.length}
                className="px-6 py-2.5 bg-posterita-blue hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-50">
                {saving ? "Creating..." : "Create Rule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
