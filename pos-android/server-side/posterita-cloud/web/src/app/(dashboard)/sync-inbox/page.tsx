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

  // Get inbox entries for this account (last 100) — include payload for JSON view
  const { data: entries, error } = await supabase
    .from("sync_inbox")
    .select("id, account_id, terminal_id, device_id, sync_version, status, payload, items_summary, error_message, errors, retry_count, received_at, processed_at")
    .eq("account_id", accountId)
    .order("received_at", { ascending: false })
    .limit(100);

  // Handle missing table gracefully
  if (error) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Sync Inbox" }]} />
        <div className="text-center py-16">
          <p className="text-gray-500">Sync inbox not available yet.</p>
          <p className="text-sm text-gray-400 mt-2">Table may not be created. Error: {error.message}</p>
        </div>
      </div>
    );
  }

  const all = entries ?? [];
  const synced = all.filter(e => e.status === "processed").length;
  const failed = all.filter(e => e.status === "failed").length;
  const partial = all.filter(e => e.status === "partial").length;
  const pending = all.filter(e => e.status === "processing" || e.status === "received").length;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Sync Inbox" }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sync Inbox</h1>
          <p className="text-gray-500 mt-1">
            Sync payloads from devices — replay failed syncs to recover data
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold">{all.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-green-100 p-4">
          <p className="text-sm text-green-600">Synced</p>
          <p className="text-2xl font-bold text-green-700">{synced}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-100 p-4">
          <p className="text-sm text-red-600">Failed</p>
          <p className="text-2xl font-bold text-red-700">{failed}</p>
        </div>
        <div className="bg-white rounded-xl border border-orange-100 p-4">
          <p className="text-sm text-orange-600">Partial</p>
          <p className="text-2xl font-bold text-orange-700">{partial}</p>
        </div>
        <div className="bg-white rounded-xl border border-blue-100 p-4">
          <p className="text-sm text-blue-600">Pending</p>
          <p className="text-2xl font-bold text-blue-700">{pending}</p>
        </div>
      </div>

      <SyncInboxTable entries={all} />
    </div>
  );
}
