"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Building2, Users, AlertTriangle, RefreshCw, FlaskConical,
  Gauge, Server, GitCommit, Map, Shield, Archive, ChevronDown,
} from "lucide-react";
import { useState } from "react";

interface Tab { key: string; label: string; icon: any }

const ALL_TABS: Tab[] = [
  { key: "brands", label: "Brands", icon: Building2 },
  { key: "owners", label: "Owners", icon: Users },
  { key: "errors", label: "Errors", icon: AlertTriangle },
  { key: "sync", label: "Sync", icon: RefreshCw },
  { key: "mra", label: "MRA", icon: Shield },
  { key: "tests", label: "Tests", icon: FlaskConical },
  { key: "benchmark", label: "Bench", icon: Gauge },
  { key: "changelog", label: "Log", icon: GitCommit },
  { key: "roadmap", label: "Roadmap", icon: Map },
  { key: "infra", label: "Infra", icon: Server },
  { key: "legacy", label: "Legacy", icon: Archive },
];

export default function PlatformTabs() {
  const params = useSearchParams();
  const active = params.get("tab") || "brands";
  const [moreOpen, setMoreOpen] = useState(false);

  // Show first 6 inline, rest in "More" dropdown
  const inlineTabs = ALL_TABS.slice(0, 6);
  const overflowTabs = ALL_TABS.slice(6);
  const activeInOverflow = overflowTabs.some(t => t.key === active);
  const activeOverflowTab = overflowTabs.find(t => t.key === active);

  return (
    <div className="flex items-center border-b border-gray-200 mb-6">
      {inlineTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        return (
          <Link
            key={tab.key}
            href={`/platform?tab=${tab.key}`}
            prefetch={true}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              isActive
                ? "border-posterita-blue text-posterita-blue"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon size={14} />
            {tab.label}
          </Link>
        );
      })}

      {/* More dropdown */}
      <div className="relative ml-auto">
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className={`flex items-center gap-1 px-3 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            activeInOverflow
              ? "border-posterita-blue text-posterita-blue"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {activeInOverflow && activeOverflowTab ? (
            <>
              {(() => { const I = activeOverflowTab.icon; return <I size={14} />; })()}
              {activeOverflowTab.label}
            </>
          ) : (
            "More"
          )}
          <ChevronDown size={12} className={moreOpen ? "rotate-180 transition" : "transition"} />
        </button>

        {moreOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} />
            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[160px]">
              {overflowTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = active === tab.key;
                return (
                  <Link
                    key={tab.key}
                    href={`/platform?tab=${tab.key}`}
                    prefetch={true}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm transition ${
                      isActive ? "text-posterita-blue bg-blue-50" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
