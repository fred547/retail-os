"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Monitor, ChevronRight, Loader2 } from "lucide-react";

type Terminal = {
  terminal_id: number;
  name: string;
  prefix: string | null;
};

export default function TerminalSelector({
  terminals,
  accountId,
  storeId,
}: {
  terminals: Terminal[];
  accountId: string;
  storeId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectingId, setSelectingId] = useState<number | null>(null);

  const handleSelect = (terminal: Terminal) => {
    setSelectingId(terminal.terminal_id);
    startTransition(async () => {
      const res = await fetch("/api/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          store_id: Number(storeId),
          terminal_id: terminal.terminal_id,
        }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setSelectingId(null);
      }
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {terminals.map((terminal) => {
        const isSelecting = selectingId === terminal.terminal_id;

        return (
          <button
            key={terminal.terminal_id}
            onClick={() => handleSelect(terminal)}
            disabled={isPending}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:border-posterita-blue hover:shadow-md transition group text-left disabled:opacity-60"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-purple-50 group-hover:bg-purple-100 transition">
                  <Monitor
                    size={22}
                    className="text-purple-600"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-posterita-blue transition">
                    {terminal.name}
                  </h3>
                  {terminal.prefix && (
                    <p className="text-sm text-gray-500 mt-1">
                      Prefix: <span className="font-mono">{terminal.prefix}</span>
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1 font-mono">
                    ID: {terminal.terminal_id}
                  </p>
                </div>
              </div>
              {isSelecting ? (
                <Loader2
                  size={20}
                  className="text-posterita-blue animate-spin mt-1"
                />
              ) : (
                <ChevronRight
                  size={20}
                  className="text-gray-300 group-hover:text-posterita-blue transition mt-1"
                />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
