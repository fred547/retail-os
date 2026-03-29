"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Clock, Play, Square, Coffee } from "lucide-react";
import Link from "next/link";
import { getOfflineDb, getSyncMeta } from "@/lib/offline/db";
import type { Shift } from "@/lib/offline/schema";
import { getSession } from "@/lib/pos/session";

/** Format duration in hours and minutes */
function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Format time from ISO string */
function formatTime(dateStr: string | null): string {
  if (!dateStr) return "--:--";
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Format date from ISO string */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

/**
 * Shifts Page — Clock in/out, today's summary, recent shifts.
 * All data from IndexedDB. Works fully offline.
 */
export default function ShiftsPage() {
  const [ready, setReady] = useState(false);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [elapsed, setElapsed] = useState("");
  const [accountId, setAccountId] = useState("");
  const [storeId, setStoreId] = useState(0);
  const [userId, setUserId] = useState(0);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const acctId = await getSyncMeta("account_id");
        const sId = parseInt(await getSyncMeta("store_id") || "0");
        const session = getSession();
        const uId = session?.userId || parseInt(await getSyncMeta("user_id") || "0");
        const uName = session?.userName || "Staff";

        if (!acctId) { setReady(true); return; }
        setAccountId(acctId);
        setStoreId(sId);
        setUserId(uId);
        setUserName(uName);

        const db = getOfflineDb();
        const allShifts = await db.shift.where("user_id").equals(uId).reverse().sortBy("clock_in");

        // Find active shift (status === "active")
        const active = allShifts.find(s => s.status === "active");
        setActiveShift(active || null);

        // Last 7 days of shifts
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recent = allShifts.filter(s => new Date(s.clock_in) >= sevenDaysAgo);
        setShifts(recent);

        setReady(true);
      } catch (e: any) {
        console.error("[SHIFTS] init failed:", e);
        setReady(true);
      }
    }
    init();
  }, []);

  // Elapsed time ticker for active shift
  useEffect(() => {
    if (!activeShift) { setElapsed(""); return; }
    function tick() {
      const start = new Date(activeShift!.clock_in).getTime();
      const now = Date.now();
      const diffH = (now - start) / 3_600_000;
      setElapsed(formatDuration(diffH));
    }
    tick();
    const interval = setInterval(tick, 30_000); // update every 30s
    return () => clearInterval(interval);
  }, [activeShift]);

  const handleClockIn = useCallback(async () => {
    const db = getOfflineDb();
    const now = new Date().toISOString();
    const newShift: Shift = {
      shift_id: 0, // auto-increment
      account_id: accountId,
      store_id: storeId,
      user_id: userId,
      clock_in: now,
      clock_out: null,
      hours_worked: 0,
      status: "active",
      break_start: null,
      break_end: null,
      break_minutes: 0,
      note: null,
      is_sync: false,
      created_at: now,
    };
    const id = await db.shift.add(newShift);
    const saved = { ...newShift, shift_id: id as number };
    setActiveShift(saved);
    setShifts(prev => [saved, ...prev]);
  }, [accountId, storeId, userId]);

  const handleClockOut = useCallback(async () => {
    if (!activeShift) return;
    const db = getOfflineDb();
    const now = new Date().toISOString();
    const start = new Date(activeShift.clock_in).getTime();
    const hoursWorked = Math.round(((Date.now() - start) / 3_600_000) * 100) / 100;

    await db.shift.update(activeShift.shift_id, {
      clock_out: now,
      hours_worked: hoursWorked,
      status: "completed",
    });

    const updated = { ...activeShift, clock_out: now, hours_worked: hoursWorked, status: "completed" };
    setActiveShift(null);
    setShifts(prev => prev.map(s => s.shift_id === updated.shift_id ? updated : s));
  }, [activeShift]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading shifts...</p>
        </div>
      </div>
    );
  }

  // Today's summary
  const today = new Date().toDateString();
  const todayShifts = shifts.filter(s => new Date(s.clock_in).toDateString() === today);
  const todayHours = todayShifts.reduce((sum, s) => {
    if (s.status === "completed") return sum + s.hours_worked;
    if (s.status === "active") return sum + (Date.now() - new Date(s.clock_in).getTime()) / 3_600_000;
    return sum;
  }, 0);
  const weekHours = shifts.reduce((sum, s) => {
    if (s.status === "completed") return sum + s.hours_worked;
    if (s.status === "active") return sum + (Date.now() - new Date(s.clock_in).getTime()) / 3_600_000;
    return sum;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
        <Link href="/pos/home" className="text-gray-400 hover:text-white p-1.5 hover:bg-gray-800 rounded-lg transition">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-sm font-semibold flex-1">Shifts</h1>
        <span className="text-xs text-gray-500">{userName}</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Current status card */}
        <div className={`rounded-2xl p-6 text-center ${activeShift ? "bg-green-900/30 border border-green-800/50" : "bg-gray-800"}`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${activeShift ? "bg-green-600" : "bg-gray-700"}`}>
            <Clock size={28} className={activeShift ? "text-white" : "text-gray-400"} />
          </div>

          {activeShift ? (
            <>
              <p className="text-sm text-green-400 font-medium mb-1">Clocked In</p>
              <p className="text-3xl font-bold mb-1">{elapsed}</p>
              <p className="text-xs text-gray-400">Since {formatTime(activeShift.clock_in)}</p>
              <button
                onClick={handleClockOut}
                className="mt-5 flex items-center gap-2 mx-auto bg-red-600 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-red-700 transition"
              >
                <Square size={16} /> Clock Out
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-400 font-medium mb-1">Not Clocked In</p>
              <p className="text-xs text-gray-500 mb-4">Tap below to start your shift</p>
              <button
                onClick={handleClockIn}
                className="flex items-center gap-2 mx-auto bg-green-600 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-green-700 transition"
              >
                <Play size={16} /> Clock In
              </button>
            </>
          )}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{formatDuration(todayHours)}</p>
            <p className="text-xs text-gray-500 mt-1">Today</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-purple-400">{formatDuration(weekHours)}</p>
            <p className="text-xs text-gray-500 mt-1">This Week</p>
          </div>
        </div>

        {/* Recent shifts */}
        <div>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Recent Shifts</h2>
          {shifts.length === 0 ? (
            <div className="text-center py-8 bg-gray-800 rounded-2xl">
              <Clock size={28} className="text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No shifts recorded</p>
            </div>
          ) : (
            <div className="space-y-2">
              {shifts.map(s => (
                <div key={s.shift_id} className="bg-gray-800 rounded-xl p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    s.status === "active" ? "bg-green-600/20 text-green-400" : "bg-gray-700 text-gray-400"
                  }`}>
                    <Clock size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{formatDate(s.clock_in)}</p>
                      {s.status === "active" && (
                        <span className="text-[10px] bg-green-600/20 text-green-400 px-1.5 py-0.5 rounded-full font-medium">ACTIVE</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatTime(s.clock_in)} {s.clock_out ? `- ${formatTime(s.clock_out)}` : "- In progress"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold">
                      {s.status === "completed" ? formatDuration(s.hours_worked) : elapsed || "--"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
