import { createServerSupabaseAdmin } from "@/lib/supabase/server";
import { getSessionAccountId } from "@/lib/account-context";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Store, Plus, ChevronRight, Users, Monitor, Package } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { logError } from "@/lib/error-logger";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  let accountId: string | null = null;
  try {
    accountId = await getSessionAccountId();
  } catch (e: any) {
    console.error("[brands] getSessionAccountId failed:", e.message);
    logError("BrandsPage", "getSessionAccountId failed", { error: e?.message });
  }
  if (!accountId) redirect("/manager/platform");

  const supabase = await createServerSupabaseAdmin();

  // Get the owner for this account
  const { data: account, error: accountError } = await supabase
    .from("account")
    .select("owner_id")
    .eq("account_id", accountId)
    .single();

  if (accountError) {
    console.error("[brands] Account lookup failed:", accountError.message, "accountId:", accountId);
    // Log to error_logs
    await supabase.from("error_logs").insert({
      account_id: accountId,
      severity: "ERROR",
      tag: "BrandsPage",
      message: `Account lookup failed: ${accountError.message}`,
      device_info: "web_server",
      app_version: "web",
    });
  }

  if (!account?.owner_id) redirect("/manager/platform");

  // Get ALL accounts for this owner (all brands)
  const { data: brands } = await supabase
    .from("account")
    .select("account_id, businessname, type, status, currency, created_at")
    .eq("owner_id", account.owner_id)
    .neq("status", "archived")
    .order("created_at", { ascending: true });

  // Get counts for each brand
  const brandStats: Record<string, { stores: number; terminals: number; products: number; users: number }> = {};
  for (const brand of brands ?? []) {
    const [stores, terminals, products, users] = await Promise.all([
      supabase.from("store").select("store_id", { count: "exact", head: true }).eq("account_id", brand.account_id).eq("isactive", "Y"),
      supabase.from("terminal").select("terminal_id", { count: "exact", head: true }).eq("account_id", brand.account_id).eq("isactive", "Y"),
      supabase.from("product").select("product_id", { count: "exact", head: true }).eq("account_id", brand.account_id).eq("isactive", "Y"),
      supabase.from("pos_user").select("user_id", { count: "exact", head: true }).eq("account_id", brand.account_id).eq("isactive", "Y"),
    ]);
    brandStats[brand.account_id] = {
      stores: stores.count ?? 0,
      terminals: terminals.count ?? 0,
      products: products.count ?? 0,
      users: users.count ?? 0,
    };
  }

  const typeBadge = (type: string) => {
    switch (type) {
      case "live": return "bg-green-100 text-green-700";
      case "demo": return "bg-orange-100 text-orange-700";
      case "trial": return "bg-blue-100 text-blue-700";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active": return "bg-green-50 text-green-600";
      case "onboarding": return "bg-blue-50 text-blue-600";
      case "testing": return "bg-orange-50 text-orange-600";
      default: return "bg-gray-50 text-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Brands" }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brands</h1>
          <p className="text-gray-500 mt-1">
            {(brands ?? []).length} brand{(brands ?? []).length !== 1 ? "s" : ""} under your account
          </p>
        </div>
      </div>

      {/* Current brand indicator */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3">
        <p className="text-sm text-blue-700">
          You are currently viewing data for <strong>{(brands ?? []).find(b => b.account_id === accountId)?.businessname ?? "this brand"}</strong>.
          Switch brands on the <Link href="/platform" className="underline font-medium">platform page</Link>.
        </p>
      </div>

      {/* Brand cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(brands ?? []).map((brand: any) => {
          const stats = brandStats[brand.account_id] ?? { stores: 0, terminals: 0, products: 0, users: 0 };
          const isCurrent = brand.account_id === accountId;

          return (
            <div
              key={brand.account_id}
              className={`bg-white rounded-xl border shadow-sm p-6 transition ${
                isCurrent ? "border-posterita-blue ring-2 ring-posterita-blue/20" : "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${isCurrent ? "bg-blue-50" : "bg-gray-100"}`}>
                    <Store size={20} className={isCurrent ? "text-posterita-blue" : "text-gray-500"} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{brand.businessname}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{brand.currency} &middot; {new Date(brand.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge(brand.type ?? "")}`}>
                    {(brand.type ?? "").toUpperCase() || "—"}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(brand.status ?? "")}`}>
                    {brand.status ?? "—"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 text-center">
                <div>
                  <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                    <Store size={14} />
                  </div>
                  <p className="text-lg font-semibold text-gray-900">{stats.stores}</p>
                  <p className="text-xs text-gray-500">Stores</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                    <Monitor size={14} />
                  </div>
                  <p className="text-lg font-semibold text-gray-900">{stats.terminals}</p>
                  <p className="text-xs text-gray-500">Terminals</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                    <Package size={14} />
                  </div>
                  <p className="text-lg font-semibold text-gray-900">{stats.products}</p>
                  <p className="text-xs text-gray-500">Products</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                    <Users size={14} />
                  </div>
                  <p className="text-lg font-semibold text-gray-900">{stats.users}</p>
                  <p className="text-xs text-gray-500">Users</p>
                </div>
              </div>

              {isCurrent && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <span className="text-xs text-posterita-blue font-medium">Currently active</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
