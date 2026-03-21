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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Products", href: "/products", icon: Package },
  { name: "Categories", href: "/categories", icon: FolderTree },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Stores", href: "/stores", icon: Store },
  { name: "Users", href: "/users", icon: UserCog },
  { name: "Terminals", href: "/terminals", icon: Monitor },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Price Review", href: "/price-review", icon: DollarSign },
  { name: "AI Import", href: "/ai-import", icon: Sparkles },
  { name: "Product Intake", href: "/intake", icon: Inbox },
  { name: "Settings", href: "/settings", icon: Settings },
];

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

  useEffect(() => {
    checkSuperAdmin();
  }, []);

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

  const portalNavigation =
    portal === "customer"
      ? navigation.map((item) => ({
          ...item,
          href: item.href === "/" ? "/customer" : `/customer${item.href}`,
        }))
      : navigation;

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

      <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
        {/* Super Admin: Platform link */}
        {superAdmin && (
          <>
            <Link
              href={portal === "manager" ? "/manager/platform" : "/platform"}
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

        {(portal !== "manager" && (!superAdmin || impersonating)) && portalNavigation.map((item) => {
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
              className={`sidebar-link ${isActive ? "active" : ""}`}
            >
              <Icon size={20} />
              {item.name}
            </Link>
          );
        })}

        {superAdmin && !impersonating && portal !== "manager" && (
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

      <div className="p-4 border-t border-white/10">
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
