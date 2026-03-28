"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Tag, Plus, ChevronDown, ChevronRight, X, Edit2, Trash2,
  RefreshCw, Palette, AlertCircle,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { logError } from "@/lib/error-logger";

interface TagItem {
  tag_id: number;
  name: string;
  color: string | null;
  position: number;
  is_active: boolean;
}

interface TagGroup {
  tag_group_id: number;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  tags: TagItem[];
}

const COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#10B981", "#06B6D4",
  "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899", "#6B7280",
];

export default function TagsPage() {
  const [groups, setGroups] = useState<TagGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showTagForm, setShowTagForm] = useState<number | null>(null); // group_id
  const [saving, setSaving] = useState(false);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<number | null>(null);
  const [confirmDeleteTag, setConfirmDeleteTag] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Group form
  const [gName, setGName] = useState("");
  const [gDesc, setGDesc] = useState("");
  const [gColor, setGColor] = useState("#3B82F6");

  // Tag form
  const [tName, setTName] = useState("");
  const [tColor, setTColor] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tags/groups");
      const data = await res.json();
      setGroups(data.groups || []);
      // Auto-expand all
      setExpanded(new Set((data.groups || []).map((g: TagGroup) => g.tag_group_id)));
    } catch (e: any) { logError("Tags", `Failed to load tags: ${e.message}`); console.error(e); setError("Failed to load tags. Please try again."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const createGroup = async () => {
    if (!gName.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/tags/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: gName, description: gDesc, color: gColor }),
      });
      setShowGroupForm(false);
      setGName(""); setGDesc(""); setGColor("#3B82F6");
      load();
      showFeedback("Tag group created");
    } catch (e: any) { logError("Tags", `Failed to create tag group: ${e.message}`); console.error(e); setError("Failed to create tag group. Please try again."); }
    finally { setSaving(false); }
  };

  const createTag = async (groupId: number) => {
    if (!tName.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag_group_id: groupId, name: tName, color: tColor || null }),
      });
      setShowTagForm(null);
      setTName(""); setTColor("");
      load();
      showFeedback("Tag created");
    } catch (e: any) { logError("Tags", `Failed to create tag: ${e.message}`); console.error(e); setError("Failed to create tag. Please try again."); }
    finally { setSaving(false); }
  };

  const deleteGroup = async (id: number) => {
    await fetch(`/api/tags/groups/${id}`, { method: "DELETE" });
    load();
    showFeedback("Tag group deleted");
  };

  const deleteTag = async (id: number) => {
    await fetch(`/api/tags/${id}`, { method: "DELETE" });
    load();
    showFeedback("Tag deleted");
  };

  if (loading && groups.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
        Loading tags...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Tags" }]} />
      {feedback && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-fade-in">
          {feedback}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600 shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag size={28} className="text-indigo-500" />
            Tags
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {groups.length} group{groups.length !== 1 ? "s" : ""}, {groups.reduce((s, g) => s + g.tags.length, 0)} tags
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/customer/tags/auto-rules"
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium shadow-sm transition-colors"
          >
            Auto-Tag Rules
          </a>
          <button
            onClick={() => setShowGroupForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-posterita-blue hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors"
          >
            <Plus size={16} /> New Group
          </button>
        </div>
      </div>

      {/* Tag Groups */}
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.tag_group_id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Group Header */}
            <div
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleExpand(g.tag_group_id)}
            >
              <div className="flex items-center gap-3">
                {expanded.has(g.tag_group_id)
                  ? <ChevronDown size={18} className="text-gray-400" />
                  : <ChevronRight size={18} className="text-gray-400" />}
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: g.color }} />
                <div>
                  <p className="font-semibold text-gray-900">{g.name}</p>
                  {g.description && <p className="text-xs text-gray-500">{g.description}</p>}
                </div>
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {g.tags.length} tag{g.tags.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setConfirmDeleteGroup(g.tag_group_id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Expanded: Tags + Add */}
            {expanded.has(g.tag_group_id) && (
              <div className="px-5 pb-4 pt-1 border-t border-gray-50">
                <div className="flex flex-wrap gap-2 mt-2">
                  {g.tags.map((t) => (
                    <span
                      key={t.tag_id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white shadow-sm"
                      style={{ backgroundColor: t.color || g.color }}
                    >
                      {t.name}
                      <button
                        onClick={() => setConfirmDeleteTag(t.tag_id)}
                        className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}

                  {/* Inline add tag */}
                  {showTagForm === g.tag_group_id ? (
                    <div className="inline-flex items-center gap-2">
                      <input
                        type="text"
                        value={tName}
                        onChange={(e) => setTName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && createTag(g.tag_group_id)}
                        placeholder="Tag name"
                        autoFocus
                        className="px-3 py-1.5 rounded-full border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20 focus:border-posterita-blue w-32"
                      />
                      <button
                        onClick={() => createTag(g.tag_group_id)}
                        disabled={saving || !tName.trim()}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-full text-sm font-medium disabled:opacity-50"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => { setShowTagForm(null); setTName(""); }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setShowTagForm(g.tag_group_id); setTName(""); }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                    >
                      <Plus size={14} /> Add Tag
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {groups.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400">
          <Tag size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No tag groups yet</p>
          <p className="text-sm mt-1">Create groups like "Season", "Margin Tier", or "Dietary" to classify products for reports.</p>
        </div>
      )}

      {/* Delete Group Confirmation */}
      {confirmDeleteGroup && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4">
            <h3 className="font-semibold text-gray-900">Delete Tag Group?</h3>
            <p className="text-sm text-gray-500 mt-2">This will permanently remove this tag group and all its tags. This action cannot be undone.</p>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setConfirmDeleteGroup(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={() => { deleteGroup(confirmDeleteGroup); setConfirmDeleteGroup(null); }} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Tag Confirmation */}
      {confirmDeleteTag && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4">
            <h3 className="font-semibold text-gray-900">Delete Tag?</h3>
            <p className="text-sm text-gray-500 mt-2">This will permanently remove this tag. This action cannot be undone.</p>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setConfirmDeleteTag(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={() => { deleteTag(confirmDeleteTag); setConfirmDeleteTag(null); }} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showGroupForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">New Tag Group</h2>
              <button onClick={() => setShowGroupForm(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name *</label>
                <input
                  type="text" value={gName} onChange={(e) => setGName(e.target.value)}
                  placeholder="e.g., Season, Margin Tier, Dietary"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20 focus:border-posterita-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text" value={gDesc} onChange={(e) => setGDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20 focus:border-posterita-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setGColor(c)}
                      className={`w-8 h-8 rounded-full transition-all ${gColor === c ? "ring-2 ring-offset-2 ring-indigo-500 scale-110" : "hover:scale-105"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => setShowGroupForm(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button
                onClick={createGroup}
                disabled={saving || !gName.trim()}
                className="px-6 py-2.5 bg-posterita-blue hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Group"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
