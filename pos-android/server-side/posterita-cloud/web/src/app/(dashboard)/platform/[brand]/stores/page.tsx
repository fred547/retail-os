export const dynamic = "force-dynamic";

import { createServerSupabaseAdmin } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Store, MapPin, Monitor, ArrowLeft, ChevronRight } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

export default async function StorePickerPage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand: accountId } = await params;
  const supabase = await createServerSupabaseAdmin();

  // Get the brand (account) name
  const { data: account } = await supabase
    .from("account")
    .select("account_id, businessname")
    .eq("account_id", accountId)
    .single();

  if (!account) redirect("/platform");

  // Get all active stores for this account
  const { data: stores } = await supabase
    .from("store")
    .select("store_id, name, address, city, state, country")
    .eq("account_id", accountId)
    .eq("isactive", "Y")
    .order("name", { ascending: true });

  // Get terminal counts per store
  const terminalCounts: Record<number, number> = {};
  for (const store of stores ?? []) {
    const { count } = await supabase
      .from("terminal")
      .select("terminal_id", { count: "exact", head: true })
      .eq("store_id", store.store_id)
      .eq("account_id", accountId)
      .eq("isactive", "Y");
    terminalCounts[store.store_id] = count ?? 0;
  }

  // Auto-redirect if only 1 store
  if ((stores ?? []).length === 1) {
    redirect(`/platform/${accountId}/${stores![0].store_id}/terminals`);
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Platform", href: "/platform" },
          { label: account.businessname ?? "Brand" },
          { label: "Stores" },
        ]}
      />

      <div>
        <Link
          href="/platform"
          className="inline-flex items-center gap-1.5 text-sm text-posterita-blue hover:underline mb-4"
        >
          <ArrowLeft size={16} />
          Back to brands
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Select a Store</h1>
        <p className="text-gray-500 mt-1">
          Choose a store for{" "}
          <span className="font-medium text-gray-700">
            {account.businessname}
          </span>
        </p>
      </div>

      {(stores ?? []).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Store size={24} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            No stores yet
          </h3>
          <p className="text-gray-500 text-sm">
            Create a store in the web console to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(stores ?? []).map((store: any) => {
            const terminalCount = terminalCounts[store.store_id] ?? 0;
            const addressParts = [store.address, store.city, store.state, store.country]
              .filter(Boolean)
              .join(", ");

            return (
              <Link
                key={store.store_id}
                href={`/platform/${accountId}/${store.store_id}/terminals`}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:border-posterita-blue hover:shadow-md transition group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition">
                      <Store
                        size={22}
                        className="text-posterita-blue"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 group-hover:text-posterita-blue transition">
                        {store.name}
                      </h3>
                      {addressParts && (
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                          <MapPin size={14} className="shrink-0" />
                          <span className="truncate">{addressParts}</span>
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                        <Monitor size={13} />
                        {terminalCount} terminal{terminalCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    size={20}
                    className="text-gray-300 group-hover:text-posterita-blue transition mt-1"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
