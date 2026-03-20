"use client";
import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function OttAuthBridge() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const ott = searchParams.get("ott");
    if (!ott) return;

    async function validateOtt() {
      try {
        const res = await fetch("/api/auth/ott/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: ott }),
        });

        if (res.ok) {
          const data = await res.json();
          // Store the session context
          localStorage.setItem("posterita_session", JSON.stringify({
            account_id: data.account_id,
            user_id: data.user_id,
            user_role: data.user_role,
            store_id: data.store_id,
            terminal_id: data.terminal_id,
            source: "android_ott",
            authenticated_at: new Date().toISOString(),
          }));

          // Remove ott param from URL (clean up)
          const url = new URL(window.location.href);
          url.searchParams.delete("ott");
          router.replace(url.pathname + url.search);
        }
      } catch (e) {
        console.error("OTT validation failed:", e);
      }
    }

    validateOtt();
  }, [searchParams, router]);

  return null; // Invisible component
}
