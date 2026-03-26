"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Building2, Users, AlertTriangle, RefreshCw, FlaskConical, Gauge, Server, GitCommit, Map } from "lucide-react";

const TABS = [
  { key: "brands", label: "Brands", icon: Building2 },
  { key: "owners", label: "Owners", icon: Users },
  { key: "errors", label: "Errors", icon: AlertTriangle },
  { key: "sync", label: "Sync", icon: RefreshCw },
  { key: "tests", label: "Tests", icon: FlaskConical },
  { key: "benchmark", label: "Benchmark", icon: Gauge },
  { key: "infra", label: "Infrastructure", icon: Server },
  { key: "changelog", label: "Changelog", icon: GitCommit },
  { key: "roadmap", label: "Roadmap", icon: Map },
];

export default function PlatformTabs() {
  const params = useSearchParams();
  const active = params.get("tab") || "brands";

  return (
    <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        return (
          <Link
            key={tab.key}
            href={`/platform?tab=${tab.key}`}
            prefetch={true}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              isActive
                ? "border-posterita-blue text-posterita-blue"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Icon size={16} />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
