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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface NavItem { name: string; href: string; icon: any }
interface NavSection { label: string; items: NavItem[]; defaultOpen?: boolean }

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
      { name: "Tags", href: "/tags", icon: Tag },
      { name: "Price Review", href: "/price-review", icon: DollarSign },
      { name: "AI Import", href: "/ai-import", icon: Sparkles },
      { name: "Product Intake", href: "/intake", icon: Inbox },
      { name: "PDF Catalogue", href: "/catalogue", icon: FileText },
    ],
  },
  {
    label: "Sales",
    items: [
      { name: "Orders", href: "/orders", icon: ShoppingCart },
      { name: "Quotations", href: "/quotations", icon: FileText },
      { name: "Tills", href: "/tills", icon: Wallet },
      { name: "Customers", href: "/customers", icon: Users },
      { name: "Loyalty", href: "/loyalty", icon: Heart },
      { name: "Shifts", href: "/shifts", icon: Clock },
      { name: "Deliveries", href: "/deliveries", icon: Truck },
      { name: "Promotions", href: "/promotions", icon: Percent },
      { name: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Restaurant",
    items: [
      { name: "Tables", href: "/tables", icon: UtensilsCrossed },
      { name: "Stations", href: "/stations", icon: ChefHat },
      { name: "Menu Schedules", href: "/menu-schedules", icon: Clock },
    ],
  },
  {
    label: "Inventory",
    items: [
      { name: "Stock Counts", href: "/inventory", icon: ClipboardList },
      { name: "Serial Items", href: "/serial-items", icon: Tag },
      { name: "Suppliers", href: "/suppliers", icon: Truck },
      { name: "Purchase Orders", href: "/purchase-orders", icon: ClipboardList },
      { name: "Store Layout", href: "/store-layout", icon: MapPin },
    ],
  },
  {
    label: "Setup",
    items: [
      { name: "Stores", href: "/stores", icon: Store },
      { name: "Terminals", href: "/terminals", icon: Monitor },
      { name: "Users", href: "/users", icon: UserCog },
      { name: "Brands", href: "/brands", icon: Building2 },
      { name: "Integrations", href: "/integrations", icon: Link2 },
      { name: "Webhooks", href: "/webhooks", icon: Link2 },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
  {
    label: "System",
    items: [
      { name: "Errors", href: "/errors", icon: AlertTriangle },
      { name: "Sync Inbox", href: "/sync-inbox", icon: RefreshCw },
    ],
  },
];

// Flat list for portal mapping
const navigation = sections.flatMap(s => s.items);

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
  }, []);

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
          body: JSON.stringify({ table: "serial_item", select: "id", limit: 1 }) }).then(r => r.json()),
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
          // Hide Restaurant section items if no tables configured
          if (!features.restaurant && (item.name === "Tables" || item.name === "Stations" || item.name === "Menu Schedules")) return false;
          // Hide Serial Items if none exist
          if (!features.serialItems && item.name === "Serial Items") return false;
          // Hide Deliveries if none exist
          if (!features.deliveries && item.name === "Deliveries") return false;
          // Hide Suppliers if none exist
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
              {brandContext.store && brandContext.terminal && <span className="text-gray-600">›</span>}
              {brandContext.terminal && <span className="truncate text-gray-500">{brandContext.terminal}</span>}
            </div>
          )}
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
