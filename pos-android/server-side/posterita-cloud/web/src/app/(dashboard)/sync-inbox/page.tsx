import { createServerSupabaseAdmin } from "@/lib/supabase/server";
import { getSessionAccountId } from "@/lib/account-context";
import { redirect } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import SyncInboxTable from "./SyncInboxTable";

export const dynamic = "force-dynamic";

export default async function SyncInboxPage() {
  const accountId = await getSessionAccountId();
  if (!accountId) redirect("/manager/platform");

  const supabase = await createServerSupabaseAdmin();

  // Get inbox entries for this account (last 100)
  const { data: entries } = await supabase
    .from("sync_inbox")
    .select("id, account_id, terminal_id, device_id, sync_version, status, items_summary, error_message, errors, retry_count, received_at, processed_at")
    .eq("account_id", accountId)
    .order("received_at", { ascending: false })
    .limit(100);

  // Stats
  const total = entries?.length ?? 0;
  const processed = entries?.filter(e => e.status === "processed").length ?? 0;
  const failed = entries?.filter(e => e.status === "failed").length ?? 0;
  const partial = entries?.filter(e => e.status === "partial").length ?? 0;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Sync Inbox" }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sync Inbox</h1>
          <p className="text-gray-500 mt-1">
            Raw sync payloads — replay failed syncs to recover data
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        <div className="bg-white rounded-xl border border-green-100 p-4">
          <p className="text-sm text-green-600">Processed</p>
          <p className="text-2xl font-bold text-green-700">{processed}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-100 p-4">
          <p className="text-sm text-red-600">Failed</p>
          <p className="text-2xl font-bold text-red-700">{failed}</p>
        </div>
        <div className="bg-white rounded-xl border border-orange-100 p-4">
          <p className="text-sm text-orange-600">Partial</p>
          <p className="text-2xl font-bold text-orange-700">{partial}</p>
        </div>
      </div>

      <SyncInboxTable entries={entries ?? []} />
    </div>
  );
}
