"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText, Share2, Users, MessageSquare,
  Plus, Check, X, Copy, Eye, Send, Trash2,
  ChevronDown, ChevronUp, RefreshCw, Loader2,
} from "lucide-react";

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════

interface BlogPost {
  id: number;
  slug: string;
  title: string;
  meta_description?: string;
  keyword?: string;
  author?: string;
  html_content?: string;
  status: string;
  published_at?: string;
  created_at: string;
}

interface SocialPost {
  id: number;
  platform: string;
  content: string;
  post_type?: string;
  status: string;
  scheduled_at?: string;
  published_at?: string;
  created_at: string;
}

interface Subscriber {
  id: number;
  email: string;
  name?: string;
  source?: string;
  brevo_synced: boolean;
  drip_step: number;
  drip_next_at?: string;
  unsubscribed: boolean;
  created_at: string;
}

interface ChatSession {
  session_id: string;
  messages: Array<{
    id: number;
    role: string;
    content: string;
    visitor_email?: string;
    created_at: string;
  }>;
  visitor_email?: string;
  last_message_at: string;
}

type SubTab = "blog" | "social" | "subscribers" | "chat";

// ═══════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════

export default function MarketingHub() {
  const [subTab, setSubTab] = useState<SubTab>("blog");

  const tabs: { key: SubTab; label: string; icon: typeof FileText }[] = [
    { key: "blog", label: "Blog", icon: FileText },
    { key: "social", label: "Social", icon: Share2 },
    { key: "subscribers", label: "Subscribers", icon: Users },
    { key: "chat", label: "Chat", icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                subTab === t.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {subTab === "blog" && <BlogTab />}
      {subTab === "social" && <SocialTab />}
      {subTab === "subscribers" && <SubscribersTab />}
      {subTab === "chat" && <ChatTab />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Blog Tab
// ═══════════════════════════════════════════════════════

function BlogTab() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketing/blog");
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  async function generatePost() {
    if (!keyword.trim() || generating) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/marketing/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim() }),
      });
      const data = await res.json();
      if (data.post) {
        setPosts((prev) => [data.post, ...prev]);
        setKeyword("");
      }
    } catch { /* ignore */ }
    setGenerating(false);
  }

  async function updateStatus(id: number, status: string) {
    try {
      await fetch(`/api/marketing/blog/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status } : p))
      );
    } catch { /* ignore */ }
  }

  async function viewPost(id: number) {
    if (previewId === id) {
      setPreviewId(null);
      return;
    }
    try {
      const res = await fetch(`/api/marketing/blog/${id}`);
      const data = await res.json();
      setPreviewHtml(data.post?.html_content ?? "");
      setPreviewId(id);
    } catch { /* ignore */ }
  }

  const statusColor: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800",
    published: "bg-green-100 text-green-800",
    archived: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-4">
      {/* Generate form */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Generate Blog Post
          </label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Enter target keyword (e.g. 'best POS system for small business')"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            onKeyDown={(e) => e.key === "Enter" && generatePost()}
          />
        </div>
        <button
          onClick={generatePost}
          disabled={generating || !keyword.trim()}
          className="flex items-center gap-1.5 bg-posterita-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {generating ? "Generating..." : "Generate"}
        </button>
      </div>

      {/* Posts list */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading posts...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No blog posts yet. Generate your first one above.
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <div key={post.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 p-3 bg-white">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[post.status] ?? "bg-gray-100"}`}>
                      {post.status}
                    </span>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {post.title}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    /{post.slug} &middot; {post.keyword} &middot; {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => viewPost(post.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 transition"
                    title="Preview"
                  >
                    <Eye size={14} />
                  </button>
                  {post.status === "draft" && (
                    <button
                      onClick={() => updateStatus(post.id, "published")}
                      className="p-1.5 text-green-500 hover:text-green-700 transition"
                      title="Publish"
                    >
                      <Send size={14} />
                    </button>
                  )}
                  {post.status === "published" && (
                    <button
                      onClick={() => updateStatus(post.id, "archived")}
                      className="p-1.5 text-gray-400 hover:text-gray-600 transition"
                      title="Archive"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              {previewId === post.id && previewHtml && (
                <div className="border-t border-gray-100 p-4 bg-gray-50 max-h-96 overflow-y-auto">
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Social Tab
// ═══════════════════════════════════════════════════════

function SocialTab() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketing/social");
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  async function generateWeek() {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/marketing/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 7 }),
      });
      const data = await res.json();
      if (data.posts) {
        setPosts((prev) => [...data.posts, ...prev]);
      }
    } catch { /* ignore */ }
    setGenerating(false);
  }

  async function updateStatus(id: number, status: string) {
    try {
      await fetch(`/api/marketing/social/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status } : p))
      );
    } catch { /* ignore */ }
  }

  async function deletePost(id: number) {
    try {
      await fetch(`/api/marketing/social/${id}`, { method: "DELETE" });
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch { /* ignore */ }
  }

  function copyContent(id: number, content: string) {
    navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const platformBadge: Record<string, string> = {
    twitter: "bg-sky-100 text-sky-800",
    linkedin: "bg-blue-100 text-blue-800",
    facebook: "bg-indigo-100 text-indigo-800",
    instagram: "bg-pink-100 text-pink-800",
  };

  const statusIcon: Record<string, typeof Check> = {
    draft: RefreshCw,
    approved: Check,
    rejected: X,
    published: Send,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {posts.length} posts &middot;{" "}
          {posts.filter((p) => p.status === "draft").length} drafts
        </p>
        <button
          onClick={generateWeek}
          disabled={generating}
          className="flex items-center gap-1.5 bg-posterita-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {generating ? "Generating..." : "Generate Week"}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading posts...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No social posts yet. Click &quot;Generate Week&quot; to create some.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {posts.map((post) => {
            const StatusIcon = statusIcon[post.status] ?? RefreshCw;
            return (
              <div
                key={post.id}
                className="border border-gray-200 rounded-lg p-3 bg-white"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${platformBadge[post.platform] ?? "bg-gray-100 text-gray-600"}`}>
                    {post.platform}
                  </span>
                  {post.post_type && (
                    <span className="text-xs text-gray-400">{post.post_type}</span>
                  )}
                  <span className="ml-auto">
                    <StatusIcon size={14} className={
                      post.status === "approved" ? "text-green-500" :
                      post.status === "rejected" ? "text-red-500" :
                      post.status === "published" ? "text-blue-500" :
                      "text-gray-400"
                    } />
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-4">
                  {post.content}
                </p>
                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => copyContent(post.id, post.content)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 transition"
                    title="Copy"
                  >
                    {copied === post.id ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                  </button>
                  {post.status === "draft" && (
                    <>
                      <button
                        onClick={() => updateStatus(post.id, "approved")}
                        className="p-1.5 text-green-500 hover:text-green-700 transition"
                        title="Approve"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={() => updateStatus(post.id, "rejected")}
                        className="p-1.5 text-red-400 hover:text-red-600 transition"
                        title="Reject"
                      >
                        <X size={13} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => deletePost(post.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition ml-auto"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Subscribers Tab
// ═══════════════════════════════════════════════════════

function SubscribersTab() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/marketing/subscribe/list");
        const data = await res.json();
        setSubscribers(data.subscribers ?? []);
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  const active = subscribers.filter((s) => !s.unsubscribed);
  const dripSteps = [0, 1, 2, 3, 4, 5];
  const stepCounts = dripSteps.map(
    (step) => active.filter((s) => s.drip_step === step).length
  );

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900">{subscribers.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600">{active.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-500">Unsubscribed</p>
          <p className="text-2xl font-bold text-red-500">{subscribers.length - active.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-500">Brevo Synced</p>
          <p className="text-2xl font-bold text-blue-600">
            {subscribers.filter((s) => s.brevo_synced).length}
          </p>
        </div>
      </div>

      {/* Drip funnel */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Drip Funnel</h4>
        <div className="flex items-end gap-2 h-24">
          {stepCounts.map((count, i) => {
            const maxCount = Math.max(...stepCounts, 1);
            const height = Math.max((count / maxCount) * 100, 4);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-600 font-medium">{count}</span>
                <div
                  className="w-full bg-blue-200 rounded-t"
                  style={{ height: `${height}%` }}
                />
                <span className="text-xs text-gray-400">Step {i}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading subscribers...</div>
      ) : subscribers.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No subscribers yet.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Email</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Name</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Source</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Drip</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Signed up</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.slice(0, 50).map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-2 text-gray-900">{s.email}</td>
                    <td className="px-3 py-2 text-gray-600">{s.name ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {s.source}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600">{s.drip_step}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Chat Tab
// ═══════════════════════════════════════════════════════

function ChatTab() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/marketing/chat/sessions");
        const data = await res.json();
        setSessions(data.sessions ?? []);
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  const leadCount = sessions.filter((s) => s.visitor_email).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-500">Sessions</p>
          <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-500">Leads (email captured)</p>
          <p className="text-2xl font-bold text-green-600">{leadCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-500">Total Messages</p>
          <p className="text-2xl font-bold text-blue-600">
            {sessions.reduce((sum, s) => sum + s.messages.length, 0)}
          </p>
        </div>
      </div>

      {/* Sessions list */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading chat sessions...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No chat sessions yet.</div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.session_id}
              className="border border-gray-200 rounded-lg overflow-hidden bg-white"
            >
              <button
                onClick={() =>
                  setExpandedSession(
                    expandedSession === session.session_id
                      ? null
                      : session.session_id
                  )
                }
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition"
              >
                <MessageSquare size={16} className="text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {session.session_id.slice(0, 20)}...
                    </span>
                    {session.visitor_email && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        {session.visitor_email}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {session.messages.length} messages &middot;{" "}
                    {new Date(session.last_message_at).toLocaleString()}
                  </p>
                </div>
                {expandedSession === session.session_id ? (
                  <ChevronUp size={14} className="text-gray-400" />
                ) : (
                  <ChevronDown size={14} className="text-gray-400" />
                )}
              </button>

              {expandedSession === session.session_id && (
                <div className="border-t border-gray-100 p-3 space-y-2 bg-gray-50 max-h-80 overflow-y-auto">
                  {session.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                          msg.role === "user"
                            ? "bg-posterita-blue text-white"
                            : "bg-white border border-gray-200 text-gray-700"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
