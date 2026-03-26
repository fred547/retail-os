"use client";

const phases = [
  {
    name: "Phase 0",
    status: "done" as const,
    label: "Android Cleanup",
    items: ["UI consistency", "Offline POS", "Room DB foundation"],
  },
  {
    name: "Phase 1",
    status: "done" as const,
    label: "Web Console & API",
    items: ["CRUD + Auth + Sync", "Device enrollment (QR)", "Product intake pipeline"],
  },
  {
    name: "Phase 2",
    status: "done" as const,
    label: "Core Features",
    items: [
      "Inventory count (spot check)",
      "Kitchen & restaurant (tables, KDS, stations)",
      "Serialized inventory (VIN/IMEI)",
      "Multi-module architecture",
      "Sync hardening (6 features)",
      "Printer behavior (receipt/kitchen/queue)",
      "Till sync (two-pass, UUID linking)",
      "PDF catalogue (grid/list/loyalty cards)",
    ],
  },
  {
    name: "Phase 3",
    status: "current" as const,
    label: "Compliance, Loyalty & Analytics",
    items: [
      { name: "MRA e-invoicing", detail: "BRN, VAT ID, unique transaction ID on receipts. Required by law.", priority: "critical" },
      { name: "Stock deduction on sale", detail: "Auto-decrement qty when order completes", priority: "high" },
      { name: "Customer loyalty", detail: "Wallet, points, earn/redeem at POS", priority: "high" },
      { name: "Z-report / daily summary", detail: "End-of-day totals, payment breakdown, tax summary", priority: "high" },
      { name: "WhatsApp receipt sharing", detail: "Send receipt via WhatsApp after payment. Blocked: need phone + Meta verification", priority: "medium" },
      { name: "Supplier & Purchase Orders", detail: "Supplier management, PO, goods received note, cost tracking", priority: "medium" },
      { name: "Promotions engine", detail: "Auto-apply, time-based, buy-X-get-Y", priority: "medium" },
      { name: "Peach Payments SDK", detail: "Card terminal integration (Mauritius)", priority: "medium" },
      { name: "Menu scheduling", detail: "Breakfast/lunch/dinner by time of day", priority: "low" },
      { name: "Delivery tracking", detail: "Driver assignment, status updates", priority: "low" },
      { name: "Shift clock in/out", detail: "Staff time tracking, timesheets", priority: "low" },
    ],
  },
  {
    name: "Phase 4+",
    status: "future" as const,
    label: "Future",
    items: [
      "Shelf labels (Zebra ZPL)",
      "Self-checkout kiosks",
      "Franchise / multi-store analytics",
      "Segment extensions (pharmacy, salon, freelancers)",
      "Google Sign-In",
    ],
  },
];

const priorityBadge = (p: string) => {
  switch (p) {
    case "critical": return "bg-red-100 text-red-700";
    case "high": return "bg-orange-100 text-orange-700";
    case "medium": return "bg-blue-100 text-blue-700";
    case "low": return "bg-gray-100 text-gray-500";
    default: return "bg-gray-100 text-gray-500";
  }
};

const statusColor = (s: string) => {
  switch (s) {
    case "done": return "bg-green-500";
    case "current": return "bg-blue-500 animate-pulse";
    case "future": return "bg-gray-300";
    default: return "bg-gray-300";
  }
};

export default function Roadmap() {
  return (
    <div className="space-y-6">
      {phases.map((phase) => (
        <div key={phase.name} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
            <div className={`w-3 h-3 rounded-full ${statusColor(phase.status)}`} />
            <h3 className="font-semibold text-gray-900">{phase.name}</h3>
            <span className="text-sm text-gray-500">— {phase.label}</span>
            {phase.status === "done" && (
              <span className="ml-auto text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Complete</span>
            )}
            {phase.status === "current" && (
              <span className="ml-auto text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">In Progress</span>
            )}
          </div>
          <div className="px-6 py-4">
            <ul className="space-y-2">
              {phase.items.map((item, i) => {
                if (typeof item === "string") {
                  return (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      {phase.status === "done" ? (
                        <span className="text-green-500">✓</span>
                      ) : (
                        <span className="text-gray-300">○</span>
                      )}
                      {item}
                    </li>
                  );
                }
                return (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-gray-300 mt-0.5">○</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{item.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityBadge(item.priority)}`}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5">{item.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
