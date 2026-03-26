"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Building2, Users, AlertTriangle, RefreshCw, FlaskConical,
  Gauge, Server, GitCommit, Map, Shield, Archive, Activity,
} from "lucide-react";

interface Tab { key: string; label: string; icon: any }
interface TabGroup { label: string; tabs: Tab[] }

const GROUPS: TabGroup[] = [
  {
    label: "Portfolio",
    tabs: [
      { key: "brands", label: "Brands", icon: Building2 },
      { key: "owners", label: "Owners", icon: Users },
    ],
  },
  {
    label: "Monitoring",
    tabs: [
      { key: "errors", label: "Errors", icon: AlertTriangle },
      { key: "sync", label: "Sync", icon: RefreshCw },
      { key: "mra", label: "MRA", icon: Shield },
    ],
  },
  {
    label: "Development",
    tabs: [
      { key: "tests", label: "Tests", icon: FlaskConical },
      { key: "benchmark", label: "Benchmark", icon: Gauge },
      { key: "changelog", label: "Changelog", icon: GitCommit },
      { key: "roadmap", label: "Roadmap", icon: Map },
    ],
  },
  {
    label: "System",
    tabs: [
      { key: "infra", label: "Infra", icon: Server },
      { key: "legacy", label: "Legacy", icon: Archive },
    ],
  },
];

export default function PlatformTabs() {
  const params = useSearchParams();
  const active = params.get("tab") || "brands";

  return (
    <div className="flex gap-0.5 border-b border-gray-200 mb-6 overflow-x-auto">
      {GROUPS.map((group) => (
        <div key={group.label} className="flex items-center">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-300 px-2 hidden md:block">
            {group.label}
          </span>
          {group.tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.key;
            return (
              <Link
                key={tab.key}
                href={`/platform?tab=${tab.key}`}
                prefetch={true}
                className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? "border-posterita-blue text-posterita-blue"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </Link>
            );
          })}
          <div className="w-px h-6 bg-gray-200 mx-1 hidden md:block" />
        </div>
      ))}
    </div>
  );
}
