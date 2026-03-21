"use client";

import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { dataUpdate } from "@/lib/supabase/data-client";
import { useRouter } from "next/navigation";

export default function ApproveAllButton({ productIds }: { productIds: number[] }) {
  const router = useRouter();
  const [approving, setApproving] = useState(false);

  const handleApproveAll = async () => {
    if (approving || productIds.length === 0) return;
    setApproving(true);
    try {
      await Promise.all(
        productIds.map((id) =>
          dataUpdate("product", { column: "product_id", value: id }, {
            product_status: "live",
            needs_price_review: null,
          })
        )
      );
      router.refresh();
    } finally {
      setApproving(false);
    }
  };

  return (
    <button
      onClick={handleApproveAll}
      disabled={approving}
      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium disabled:opacity-50"
    >
      <CheckCircle size={16} />
      {approving ? "Approving..." : `Approve All (${productIds.length})`}
    </button>
  );
}
