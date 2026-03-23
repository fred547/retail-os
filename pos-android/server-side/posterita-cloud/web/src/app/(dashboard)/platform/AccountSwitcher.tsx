"use client";

import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { useState } from "react";

export default function AccountSwitcher({
  accountId,
  businessName,
}: {
  accountId: string;
  businessName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSwitch = async () => {
    setLoading(true);
    const res = await fetch("/api/super-admin/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_id: accountId }),
    });

    if (res.ok) {
      // Go directly to the brand's dashboard — AM can see all data
      router.push("/");
      router.refresh();
    } else {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSwitch}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs text-posterita-blue hover:text-blue-800 font-medium transition px-2 py-1 rounded hover:bg-blue-50 disabled:opacity-50"
      title={`Open ${businessName}`}
    >
      <LogIn size={14} />
      {loading ? "..." : "Open"}
    </button>
  );
}
