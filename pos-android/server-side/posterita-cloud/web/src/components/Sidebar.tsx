"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Monitor,
  BarChart3,
  Settings,
  Sparkles,
  DollarSign,
  LogOut,
  FolderTree,
  Shield,
  ArrowLeftRight,
  X,
  Store,
  UserCog,
  Menu,
  Inbox,
  UtensilsCrossed,
  AlertTriangle,
  FileText,
  ClipboardList,
  Building2,
  ChevronRight,
  ChevronDown,
  ChefHat,
  RefreshCw,
  Wallet,
  Tag,
  Heart,
  Truck,
  Clock,
  MapPin,
  Link2,
  Download,
  Smartphone,
  Percent,
  CalendarOff,
  Calendar,
  CreditCard,
  Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  /** If set, item requires this plan constraint to be 'true'. Key without 'feature_' prefix. */
  feature?: string;
}
interface NavSection { label: string; items: NavItem[]; defaultOpen?: boolean }

/** Maps a feature key to the minimum plan that includes it */
const FEATURE_MIN_PLAN: Record<string, string> = {
  loyalty: "Growth",
  promotions: "Growth",
  restaurant: "Growth",
  ai_import: "Growth",
  suppliers: "Growth",
  quotations: "Growth",
  tags: "Growth",
  delivery: "Growth",
  analytics: "Growth",
  inventory_counts: "Growth",
  serialized_items: "Business",
  warehouse: "Business",
  xero: "Business",
  webhooks: "Business",
  tower_control: "Business",
  staff_scheduling: "Business",
  qr_actions: "Business",
};

const sections: NavSection[] = [
  {
    label: "",
    defaultOpen: true,
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { name: "Products", href: "/products", icon: Package },
      { name: "Categories", href: "/categories", icon: FolderTree },
      { name: "Tags", href: "/tags", icon: Tag, feature: "tags" },
      { name: "Price Review", href: "/price-review", icon: DollarSign },
      { name: "AI Import", href: "/ai-import", icon: Sparkles, feature: "ai_import" },
      { name: "Product Intake", href: "/intake", icon: Inbox, feature: "ai_import" },
      { name: "PDF Catalogue", href: "/catalogue", icon: FileText },
    ],
  },
  {
    label: "Sales",
    items: [
      { name: "Orders", href: "/orders", icon: ShoppingCart },
      { name: "Quotations", href: "/quotations", icon: FileText, feature: "quotations" },
      { name: "Tills", href: "/tills", icon: Wallet },
      { name: "Customers", href: "/customers", icon: Users },
      { name: "Loyalty", href: "/loyalty", icon: Heart, feature: "loyalty" },
      { name: "Shifts", href: "/shifts", icon: Clock },
      { name: "Deliveries", href: "/deliveries", icon: Truck, feature: "delivery" },
      { name: "Promotions", href: "/promotions", icon: Percent, feature: "promotions" },
      { name: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Restaurant",
    items: [
      { name: "Tables", href: "/tables", icon: UtensilsCrossed, feature: "restaurant" },
      { name: "Stations", href: "/stations", icon: ChefHat, feature: "restaurant" },
      { name: "Menu Schedules", href: "/menu-schedules", icon: Clock, feature: "restaurant" },
    ],
  },
  {
    label: "Inventory",
    items: [
      { name: "Spot Checks", href: "/inventory", icon: ClipboardList, feature: "inventory_counts" },
      { name: "Full Count", href: "/stock-count", icon: ClipboardList, feature: "inventory_counts" },
      { name: "Serial Items", href: "/serial-items", icon: Tag, feature: "serialized_items" },
      { name: "Suppliers", href: "/suppliers", icon: Truck, feature: "suppliers" },
      { name: "Purchase Orders", href: "/purchase-orders", icon: ClipboardList, feature: "suppliers" },
      { name: "Store Layout", href: "/store-layout", icon: MapPin, feature: "warehouse" },
    ],
  },
  {
    label: "Staff",
    items: [
      { name: "Staff Hub", href: "/staff", icon: Users, feature: "staff_scheduling" },
      { name: "Schedule", href: "/staff/schedule", icon: Calendar, feature: "staff_scheduling" },
      { name: "Roster", href: "/staff/roster", icon: ClipboardList, feature: "staff_scheduling" },
      { name: "Timesheets", href: "/staff/timesheets", icon: Clock, feature: "staff_scheduling" },
      { name: "Leave", href: "/staff/leave", icon: CalendarOff, feature: "staff_scheduling" },
      { name: "Holidays", href: "/staff/holidays", icon: Calendar, feature: "staff_scheduling" },
      { name: "Operating Hours", href: "/staff/operating-hours", icon: Clock, feature: "staff_scheduling" },
    ],
  },
  {
    label: "Setup",
    items: [
      { name: "Stores", href: "/stores", icon: Store },
      { name: "Terminals", href: "/terminals", icon: Monitor },
      { name: "Users", href: "/users", icon: UserCog },
      { name: "Brands", href: "/brands", icon: Building2 },
      { name: "Integrations", href: "/integrations", icon: Link2, feature: "xero" },
      { name: "Webhooks", href: "/webhooks", icon: Link2, feature: "webhooks" },
      { name: "Settings", href: "/settings", icon: Settings },
      { name: "Billing", href: "/billing", icon: CreditCard },
    ],
  },
  {
    label: "System",
    items: [
      { name: "Tower Control", href: "/tower", icon: Monitor, feature: "tower_control" },
      { name: "Fraud Monitor", href: "/fraud", icon: Shield },
      { name: "Errors", href: "/errors", icon: AlertTriangle },
      { name: "Sync Inbox", href: "/sync-inbox", icon: RefreshCw },
    ],
  },
];

// Flat list for portal mapping
const navigation = sections.flatMap(s => s.items);

// Plan billing info cache key
const PLAN_CACHE_KEY = "posterita_plan_cache";
const PLAN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface PlanInfo {
  plan: string;
  isTrial: boolean;
  trialEndsAt: string | null;
  constraints: Record<string, string>;
  countryCode: string | null;
  countryModules: string[];
}

export default function Sidebar({
  portal = "root",
}: {
  portal?: "root" | "customer" | "manager";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [superAdmin, setSuperAdmin] = useState<any>(null);
  const [impersonating, setImpersonating] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [brandContext, setBrandContext] = useState<{ brand: string; store: string; terminal: string } | null>(null);
  const [features, setFeatures] = useState<Record<string, boolean>>({
    restaurant: true,
    serialItems: true,
    suppliers: true,
    deliveries: true,
  });
  const [showAll, setShowAll] = useState(false);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [upgradePrompt, setUpgradePrompt] = useState<{ feature: string; minPlan: string } | null>(null);

  // Collapsible sections — open the section that contains the current page
  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    // Always open the top (no-label) section
    initial.add("");
    return initial;
  });

  // Auto-open the section containing the current page
  useEffect(() => {
    const portalPrefix = portal === "customer" ? "/customer" : "";
    for (const section of sections) {
      const match = section.items.some(item => {
        const href = portalPrefix ? (item.href === "/" ? portalPrefix : `${portalPrefix}${item.href}`) : item.href;
        return href === "/" || href === "/customer"
          ? pathname === href
          : pathname.startsWith(href);
      });
      if (match) {
        setOpenSections(prev => {
          const next = new Set(prev);
          next.add(section.label);
          return next;
        });
      }
    }
  }, [pathname, portal]);

  const toggleSection = (label: string) => {
    if (!label) return; // Don't collapse the top section
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  useEffect(() => {
    checkSuperAdmin().finally(() => setAuthChecked(true));
    fetchBrandContext();
    fetchFeatureFlags();
    fetchPlanInfo();
  }, []);

  const fetchPlanInfo = async () => {
    try {
      // Check sessionStorage cache
      const cached = sessionStorage.getItem(PLAN_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < PLAN_CACHE_TTL) {
          setPlanInfo(parsed.data);
          return;
        }
      }
    } catch (_) {}

    try {
      const res = await fetch("/api/billing/plan");
      if (!res.ok) return;
      const data = await res.json();
      const info: PlanInfo = {
        plan: data.plan,
        isTrial: data.isTrial,
        trialEndsAt: data.trialEndsAt,
        constraints: data.constraints ?? {},
        countryCode: data.country_code ?? null,
        countryModules: data.country_modules ?? [],
      };
      setPlanInfo(info);
      try {
        sessionStorage.setItem(PLAN_CACHE_KEY, JSON.stringify({ data: info, ts: Date.now() }));
      } catch (_) {}
    } catch (_) {
      // If fetch fails, leave planInfo null (all items visible)
    }
  };

  const fetchBrandContext = async () => {
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "account", select: "account_id, businessname", limit: 1 }),
      });
      const { data } = await res.json();
      const brand = data?.[0]?.businessname || "";

      const storeRes = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "store", select: "name", filters: [{ column: "isactive", op: "eq", value: "Y" }], limit: 1 }),
      });
      const storeData = await storeRes.json();
      const store = storeData?.data?.[0]?.name || "";

      const termRes = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "terminal", select: "name", filters: [{ column: "isactive", op: "eq", value: "Y" }], limit: 1 }),
      });
      const termData = await termRes.json();
      const terminal = termData?.data?.[0]?.name || "";

      if (brand) setBrandContext({ brand, store, terminal });
    } catch (_) {}
  };

  const fetchFeatureFlags = async () => {
    try {
      const checks = await Promise.all([
        fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "restaurant_table", select: "table_id", limit: 1 }) }).then(r => r.json()),
        fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "serial_item", select: "serial_item_id", limit: 1 }) }).then(r => r.json()),
        fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "supplier", select: "supplier_id", limit: 1 }) }).then(r => r.json()),
        fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "delivery", select: "id", limit: 1 }) }).then(r => r.json()),
      ]);

      setFeatures({
        restaurant: (checks[0].data?.length ?? 0) > 0,
        serialItems: (checks[1].data?.length ?? 0) > 0,
        suppliers: (checks[2].data?.length ?? 0) > 0,
        deliveries: (checks[3].data?.length ?? 0) > 0,
      });
    } catch (_) {
      // If checks fail, show everything
      setFeatures({ restaurant: true, serialItems: true, suppliers: true, deliveries: true });
    }
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const checkSuperAdmin = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const res = await fetch("/api/super-admin/status");
    if (res.ok) {
      const data = await res.json();
      if (data.is_super_admin) {
        setSuperAdmin(data);
        setImpersonating(data.impersonating);
      }
    }
  };

  const handleExitAccount = async () => {
    await fetch("/api/super-admin/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_id: null }),
    });
    setImpersonating(null);
    router.push(portal === "customer" ? "/manager/platform" : "/platform");
    router.refresh();
  };

  const handleSignOut = async () => {
    if (superAdmin) {
      await fetch("/api/super-admin/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: null }),
      });
    }
    await supabase.auth.signOut();
    router.push(portal === "manager" ? "/manager/login" : portal === "customer" ? "/customer/login" : "/login");
  };

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  /**
   * Check if a feature is accessible on the current plan.
   * Returns true if no plan info loaded yet (permissive fallback).
   */
  const isFeatureAccessible = (featureKey: string): boolean => {
    if (!planInfo) return true; // No plan info = show everything (loading or error)
    if (superAdmin) return true; // Super admins see everything
    const constraintKey = `feature_${featureKey}`;
    const val = planInfo.constraints[constraintKey];
    if (val === undefined) return true; // Unknown constraint = don't gate
    return val === "true";
  };

  const portalSections =
    portal === "customer"
      ? sections.map((section) => ({
          ...section,
          items: section.items.map((item) => ({
            ...item,
            href: item.href === "/" ? "/customer" : `/customer${item.href}`,
          })),
        }))
      : sections;

  const filteredSections = showAll
    ? portalSections
    : portalSections.map(section => ({
        ...section,
        items: section.items.filter(item => {
          // Hide Restaurant section items if no tables configured (data-based)
          if (!features.restaurant && (item.name === "Tables" || item.name === "Stations" || item.name === "Menu Schedules")) return false;
          // Hide Serial Items if none exist (data-based)
          if (!features.serialItems && item.name === "Serial Items") return false;
          // Hide Deliveries if none exist (data-based)
          if (!features.deliveries && item.name === "Deliveries") return false;
          // Hide Suppliers if none exist (data-based)
          if (!features.suppliers && (item.name === "Suppliers" || item.name === "Purchase Orders")) return false;
          // Always show everything else
          return true;
        }),
      })).filter(section => {
        // Remove sections that have no visible items (except the unlabeled top section)
        if (!section.label) return true;
        return section.items.length > 0;
      });

  const sidebarContent = (
    <>
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Posterita</h1>
          <p className="text-xs text-gray-400 mt-1">Cloud Admin</p>
        </div>
        {/* Close button: visible only on mobile */}
        <button
          onClick={closeMobile}
          className="lg:hidden p-1 text-gray-400 hover:text-white transition-colors"
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>
      </div>

      {/* Brand > Store > Terminal context */}
      {brandContext && !superAdmin && (
        <div className="mx-3 mt-3 px-3 py-2.5 bg-white/5 rounded-lg">
          <div className="text-xs text-white font-semibold truncate">{brandContext.brand}</div>
          {(brandContext.store || brandContext.terminal) && (
            <div className="flex items-center gap-1 mt-0.5 text-[11px] text-gray-400">
              {brandContext.store && <span className="truncate">{brandContext.store}</span>}
              {brandContext.store && brandContext.terminal && <span className="text-gray-600">&rsaquo;</span>}
              {brandContext.terminal && <span className="truncate text-gray-500">{brandContext.terminal}</span>}
            </div>
          )}
        </div>
      )}

      {/* Trial banner */}
      {planInfo?.isTrial && planInfo.trialEndsAt && (
        <div className="mx-3 mt-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="text-[11px] text-blue-300 font-medium">
            {planInfo.plan.charAt(0).toUpperCase() + planInfo.plan.slice(1)} Trial
          </div>
          <div className="text-[10px] text-blue-400/70 mt-0.5">
            Ends {new Date(planInfo.trialEndsAt).toLocaleDateString()}
          </div>
        </div>
      )}

      {/* Super Admin Impersonation Banner */}
      {impersonating && (
        <div className="mx-2 mt-3 bg-amber-500/20 border border-amber-500/30 rounded-lg px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowLeftRight size={14} className="text-amber-400" />
              <span className="text-xs text-amber-200 font-medium">
                Viewing as
              </span>
            </div>
            <button
              onClick={handleExitAccount}
              className="text-amber-300 hover:text-white transition"
              title="Exit account"
              aria-label="Exit account"
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-sm text-white font-semibold mt-0.5 truncate">
            {impersonating.businessname || impersonating.account_id}
          </p>
        </div>
      )}

      <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
        {/* Super Admin: Platform link */}
        {superAdmin && (
          <>
            <Link
              href={portal === "manager" ? "/manager/platform" : "/platform"}
              prefetch={true}
              className={`sidebar-link ${
                pathname === "/platform" || pathname === "/manager/platform" ? "active !bg-red-600" : ""
              }`}
            >
              <Shield size={20} />
              <span>{portal === "manager" ? "Account Manager" : "Platform"}</span>
              <span className="ml-auto text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                AM
              </span>
            </Link>
            <div className="border-b border-white/10 mx-4 my-2" />
          </>
        )}

        {(portal !== "manager" && authChecked && (!superAdmin || impersonating)) && filteredSections.map((section) => {
          const isOpen = openSections.has(section.label);
          const hasLabel = !!section.label;

          return (
            <div key={section.label || "top"}>
              {hasLabel ? (
                <button
                  onClick={() => toggleSection(section.label)}
                  className="w-full flex items-center justify-between px-4 pt-3 pb-1 group"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 group-hover:text-gray-300 transition-colors">
                    {section.label}
                  </span>
                  {isOpen
                    ? <ChevronDown size={12} className="text-gray-600 group-hover:text-gray-400" />
                    : <ChevronRight size={12} className="text-gray-600 group-hover:text-gray-400" />}
                </button>
              ) : null}
              {(isOpen || !hasLabel) && section.items.map((item) => {
                const isActive =
                  item.href === "/customer"
                    ? pathname === "/customer"
                    : item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                const featureKey = item.feature;
                const locked = featureKey ? !isFeatureAccessible(featureKey) : false;
                const minPlan = featureKey ? FEATURE_MIN_PLAN[featureKey] : undefined;

                if (locked) {
                  return (
                    <button
                      key={item.name}
                      onClick={() => setUpgradePrompt({ feature: item.name, minPlan: minPlan ?? "Growth" })}
                      className="sidebar-link w-full text-gray-500 opacity-60 hover:opacity-80 cursor-pointer"
                    >
                      <Icon size={18} />
                      <span>{item.name}</span>
                      <span className="ml-auto flex items-center gap-1">
                        <Lock size={12} className="text-gray-600" />
                        <span className="text-[9px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded-full font-medium">
                          {minPlan}
                        </span>
                      </span>
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    prefetch={true}
                    className={`sidebar-link ${isActive ? "active" : ""}`}
                  >
                    <Icon size={18} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          );
        })}

        {authChecked && superAdmin && !impersonating && portal !== "manager" && (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-gray-500">
              Select an account from the account manager portal to view its data.
            </p>
          </div>
        )}

        {portal === "manager" && (
          <div className="px-4 py-6 text-sm text-gray-400">
            Review the whole account portfolio, assign managers, and open customer portals from one place.
          </div>
        )}
      </nav>

      {/* Show all toggle */}
      {!showAll && (
        <div className="px-4 pb-1">
          <button
            onClick={() => setShowAll(true)}
            className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
          >
            Show all menu items
          </button>
        </div>
      )}

      {/* POS + Download + Sign Out */}
      <div className="border-t border-white/10">
        {/* Open Web POS */}
        <a
          href="/pos"
          className="sidebar-link mx-2 mt-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
        >
          <Monitor size={18} />
          Open Web POS
          <ChevronRight size={14} className="ml-auto" />
        </a>

        {/* Downloads */}
        <a
          href="/download"
          className="sidebar-link mx-2 text-green-400 hover:text-green-300 hover:bg-green-500/10"
        >
          <Download size={18} />
          Download Apps
          <ChevronRight size={14} className="ml-auto" />
        </a>

        <div className="p-4 pt-2">
          {superAdmin && (
            <div className="text-xs text-gray-500 px-4 pb-2">
              {superAdmin.email}
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="sidebar-link w-full text-red-300 hover:text-red-200 hover:bg-red-500/10"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Upgrade prompt modal */}
      {upgradePrompt && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setUpgradePrompt(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-800 border border-slate-600 rounded-xl p-6 max-w-sm w-[90%] shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Lock size={20} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Upgrade Required</h3>
                <p className="text-gray-400 text-xs">{upgradePrompt.feature} needs {upgradePrompt.minPlan} plan</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              This feature is available on the <span className="font-semibold text-white">{upgradePrompt.minPlan}</span> plan and above.
              Upgrade to unlock it for your team.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setUpgradePrompt(null)}
                className="flex-1 px-3 py-2 text-sm text-gray-400 hover:text-white border border-slate-600 rounded-lg transition"
              >
                Maybe later
              </button>
              <Link
                href="/billing"
                onClick={() => setUpgradePrompt(null)}
                className="flex-1 px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg text-center transition"
              >
                View Plans
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );

  return (
    <>
      {/* Hamburger button for mobile/tablet */}
      <button
        onClick={() => setMobileOpen(true)}
        className="sidebar-hamburger"
        aria-label="Open menu"
      >
        <Menu size={24} />
      </button>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Desktop sidebar (always visible at lg+) */}
      <aside className="sidebar sidebar-desktop">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar (overlay, slides in) */}
      <aside
        className={`sidebar sidebar-mobile ${mobileOpen ? "sidebar-mobile-open" : ""}`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
