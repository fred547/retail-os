export const dynamic = "force-dynamic";

import { createServerSupabaseAdmin } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Monitor, ArrowLeft } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import TerminalSelector from "./TerminalSelector";

export default async function TerminalPickerPage({
  params,
}: {
  params: Promise<{ brand: string; store: string }>;
}) {
  const { brand: accountId, store: storeId } = await params;
  const supabase = await createServerSupabaseAdmin();

  // Get the brand (account) name
  const { data: account } = await supabase
    .from("account")
    .select("account_id, businessname")
    .eq("account_id", accountId)
    .single();

  if (!account) redirect("/platform");

  // Get the store
  const { data: store } = await supabase
    .from("store")
    .select("store_id, name, address, city")
    .eq("store_id", Number(storeId))
    .eq("account_id", accountId)
    .single();

  if (!store) redirect(`/platform/${accountId}/stores`);

  // Get all active terminals for this store
  const { data: terminals } = await supabase
    .from("terminal")
    .select("terminal_id, name, prefix, isactive")
    .eq("store_id", Number(storeId))
    .eq("account_id", accountId)
    .eq("isactive", "Y")
    .order("name", { ascending: true });

  // If only 1 terminal, auto-select it
  if ((terminals ?? []).length === 1) {
    // We can't call the API from a server component, so redirect to a handler
    redirect(
      `/api/context?account_id=${accountId}&store_id=${storeId}&terminal_id=${terminals![0].terminal_id}&redirect=/`
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Platform", href: "/platform" },
          { label: account.businessname ?? "Brand", href: `/platform/${accountId}/stores` },
          { label: store.name ?? "Store" },
          { label: "Terminals" },
        ]}
      />

      <div>
        <Link
          href={`/platform/${accountId}/stores`}
          className="inline-flex items-center gap-1.5 text-sm text-posterita-blue hover:underline mb-4"
        >
          <ArrowLeft size={16} />
          Back to stores
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Select a Terminal</h1>
        <p className="text-gray-500 mt-1">
          Choose a terminal at{" "}
          <span className="font-medium text-gray-700">{store.name}</span>
          {" "}
          <span className="text-gray-400">({account.businessname})</span>
        </p>
      </div>

      {(terminals ?? []).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Monitor size={24} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            No terminals yet
          </h3>
          <p className="text-gray-500 text-sm">
            Create a terminal in the web console to get started.
          </p>
        </div>
      ) : (
        <TerminalSelector
          terminals={(terminals ?? []).map((t: any) => ({
            terminal_id: t.terminal_id,
            name: t.name,
            prefix: t.prefix,
          }))}
          accountId={accountId}
          storeId={storeId}
        />
      )}
    </div>
  );
}
