import { createServerSupabaseAdmin } from "@/lib/supabase/server";
import { isAccountManager } from "@/lib/super-admin";
import { redirect } from "next/navigation";
import CreateAccountForm from "./CreateAccountForm";
import ManagerPortfolio from "./ManagerPortfolio";

export default async function PlatformPage() {
  const isManager = await isAccountManager();
  if (!isManager) redirect("/customer");

  const admin = await createServerSupabaseAdmin();

  const { data: accounts } = await admin
    .from("account")
    .select("*, owner:owner_id(id, email, phone, name, account_manager:account_manager_id(id, email, name))")
    .order("created_at", { ascending: false });

  const { data: managers } = await admin
    .from("account_manager")
    .select("id, email, name")
    .eq("is_active", true)
    .order("email", { ascending: true });

  const accountStats = await Promise.all(
    (accounts ?? []).map(async (account: any) => {
      const [stores, terminals, products, orders, users] = await Promise.all([
        admin.from("store").select("store_id", { count: "exact", head: true }).eq("account_id", account.account_id),
        admin.from("terminal").select("terminal_id", { count: "exact", head: true }).eq("account_id", account.account_id),
        admin.from("product").select("product_id", { count: "exact", head: true }).eq("account_id", account.account_id),
        admin.from("orders").select("order_id, grand_total", { count: "exact" }).eq("account_id", account.account_id),
        admin.from("pos_user").select("user_id", { count: "exact", head: true }).eq("account_id", account.account_id),
      ]);

      const totalRevenue = (orders.data ?? []).reduce((sum: number, o: any) => sum + (o.grand_total ?? 0), 0);

      return {
        ...account,
        store_count: stores.count ?? 0,
        terminal_count: terminals.count ?? 0,
        product_count: products.count ?? 0,
        order_count: orders.count ?? 0,
        user_count: users.count ?? 0,
        total_revenue: totalRevenue,
      };
    })
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-red-50 text-red-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            Account Manager Portal
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mt-4">Portfolio Oversight</h1>
          <p className="text-slate-500 mt-2 max-w-2xl">
            See how accounts are distributed across managers, track where each customer sits in the lifecycle, and jump into any customer portal when support is needed.
          </p>
        </div>
      </div>

      <CreateAccountForm />
      <ManagerPortfolio accounts={accountStats as any[]} managers={(managers ?? []) as any[]} />
    </div>
  );
}
