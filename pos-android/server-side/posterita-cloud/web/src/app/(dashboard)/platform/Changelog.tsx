"use client";

import { useEffect, useState } from "react";
import {
  GitCommit, Calendar, Server, Globe, Database, Smartphone,
  TestTube, Bug, Wrench, Sparkles, RefreshCw,
} from "lucide-react";

interface Commit {
  sha: string;
  date: string;
  message: string;
  author: string;
}

interface VersionInfo {
  web: string;
  android: string;
  api: string;
  backend: string;
  sha: string;
}

function categorize(msg: string): { category: string; icon: any; color: string } {
  const m = msg.toLowerCase();
  if (m.includes("test") || m.includes("smoke") || m.includes("benchmark")) return { category: "Tests", icon: TestTube, color: "text-purple-600 bg-purple-50" };
  if (m.includes("fix") || m.includes("bug") || m.includes("error") || m.includes("revert")) return { category: "Bug Fix", icon: Bug, color: "text-red-600 bg-red-50" };
  if (m.includes("render") || m.includes("backend") || m.includes("docker") || m.includes("cron")) return { category: "Backend", icon: Server, color: "text-orange-600 bg-orange-50" };
  if (m.includes("migration") || m.includes("schema") || m.includes("supabase") || m.includes("room") || m.includes("table ")) return { category: "Database", icon: Database, color: "text-green-600 bg-green-50" };
  if (m.includes("android") || m.includes("kds") || m.includes("kitchen") || m.includes("terminal") || m.includes("cart") || m.includes("pos")) return { category: "Android", icon: Smartphone, color: "text-blue-600 bg-blue-50" };
  if (m.includes("web") || m.includes("vercel") || m.includes("platform") || m.includes("page") || m.includes("console") || m.includes("sidebar")) return { category: "Web Console", icon: Globe, color: "text-indigo-600 bg-indigo-50" };
  if (m.includes("deploy") || m.includes("ci") || m.includes("build") || m.includes("claude.md") || m.includes("optimize")) return { category: "DevOps", icon: Wrench, color: "text-gray-600 bg-gray-50" };
  return { category: "Feature", icon: Sparkles, color: "text-yellow-600 bg-yellow-50" };
}

export default function Changelog() {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [version, setVersion] = useState<VersionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/changelog")
      .then((r) => r.json())
      .then((data) => {
        setCommits(data.commits || []);
        setVersion(data.version || null);
        if (data.error) setError(data.error);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-400">
        <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
        Loading changelog from GitHub...
      </div>
    );
  }

  // Group by date
  const grouped: Record<string, Commit[]> = {};
  for (const c of commits) {
    if (!grouped[c.date]) grouped[c.date] = [];
    grouped[c.date].push(c);
  }
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // Category counts
  const catCounts: Record<string, number> = {};
  for (const c of commits) {
    const cat = categorize(c.message).category;
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  }

  return (
    <div className="space-y-6">
      {/* Version banner */}
      {version && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-3">Current Versions</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-slate-400 text-xs">Web Console</p>
              <p className="text-2xl font-bold mt-0.5">{version.web}</p>
              <p className="text-xs text-slate-500">Vercel</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Android</p>
              <p className="text-2xl font-bold mt-0.5">{version.android}</p>
              <p className="text-xs text-slate-500">Room DB v30</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Sync API</p>
              <p className="text-2xl font-bold mt-0.5">{version.api}</p>
              <p className="text-xs text-slate-500">Protocol</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Backend</p>
              <p className="text-2xl font-bold mt-0.5">{version.backend}</p>
              <p className="text-xs text-slate-500">Render</p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-700 flex items-center gap-2">
            <GitCommit size={14} className="text-slate-500" />
            <span className="text-xs text-slate-400 font-mono">Latest: {version.sha}</span>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Total Commits</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{commits.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Days Active</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{dates.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Bug Fixes</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{catCounts["Bug Fix"] || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Features</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{catCounts["Feature"] || 0}</p>
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-700">
          GitHub API: {error}. Showing cached data.
        </div>
      )}

      {/* Category badges */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(catCounts).sort(([, a], [, b]) => b - a).map(([cat, count]) => {
          const info = categorize(cat.toLowerCase());
          return (
            <span key={cat} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${info.color}`}>
              {cat}: {count}
            </span>
          );
        })}
      </div>

      {/* Timeline */}
      {dates.map((date) => (
        <div key={date} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50">
            <Calendar size={16} className="text-gray-500" />
            <h3 className="font-semibold text-gray-900">
              {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </h3>
            <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">{grouped[date].length} commits</span>
          </div>
          <div className="divide-y divide-gray-50">
            {grouped[date].map((commit) => {
              const info = categorize(commit.message);
              const Icon = info.icon;
              return (
                <div key={commit.sha} className="px-6 py-3 flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${info.color}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{commit.message}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="font-mono text-xs text-gray-400">{commit.sha}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}>{info.category}</span>
                      {commit.author && <span className="text-xs text-gray-400">{commit.author}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
