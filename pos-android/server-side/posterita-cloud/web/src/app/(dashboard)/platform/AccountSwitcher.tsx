"use client";

import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

export default function AccountSwitcher({
  accountId,
  businessName,
}: {
  accountId: string;
  businessName: string;
}) {
  const router = useRouter();

  const handleSwitch = async () => {
    const res = await fetch("/api/super-admin/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_id: accountId }),
    });

    if (res.ok) {
      // Redirect into the customer portal — now viewing as this account
      router.push("/customer");
      router.refresh();
    }
  };

  return (
    <button
      onClick={handleSwitch}
      className="flex items-center gap-1.5 text-xs text-posterita-blue hover:text-blue-800 font-medium transition"
      title={`Open ${businessName}`}
    >
      <LogIn size={14} />
      Open
    </button>
  );
}
