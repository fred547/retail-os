"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { LogOut, UserPlus } from "lucide-react";

const DEMO_COOKIE = "posterita_demo_session";
const HEARTBEAT_INTERVAL_MS = 60_000; // 1 minute
const TIMER_INTERVAL_MS = 30_000; // 30 seconds

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export default function DemoBanner() {
  const router = useRouter();
  const [isDemo, setIsDemo] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [industry, setIndustry] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check for demo session and fetch initial status
  useEffect(() => {
    const cookie = getCookie(DEMO_COOKIE);
    if (!cookie) {
      setIsDemo(false);
      return;
    }

    // Fetch current session info
    async function fetchStatus() {
      try {
        const res = await fetch("/api/demo/status");
        if (!res.ok) return;
        const data = await res.json();
        if (data.current_session && data.current_session.time_remaining_seconds > 0) {
          setIsDemo(true);
          setTimeRemaining(data.current_session.time_remaining_seconds);
          // Industry/country come from the pool record if the status endpoint returns them
          if (data.current_session.industry) setIndustry(data.current_session.industry);
          if (data.current_session.country) setCountry(data.current_session.country);
        }
      } catch (_) {
        /* ignore */
      }
    }

    fetchStatus();
  }, []);

  // Heartbeat — extends session every 60 seconds while page is visible
  useEffect(() => {
    if (!isDemo) return;

    async function sendHeartbeat() {
      if (document.hidden) return; // Skip if tab not visible
      try {
        const res = await fetch("/api/demo/heartbeat", { method: "POST" });
        const data = await res.json();
        if (!res.ok || data.expired) {
          setIsDemo(false);
          router.push("/demo?expired=true");
          return;
        }
        if (data.time_remaining_seconds) {
          setTimeRemaining(data.time_remaining_seconds);
        }
      } catch (_) {
        /* ignore network blips */
      }
    }

    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [isDemo, router]);

  // Countdown display — update every 30 seconds
  useEffect(() => {
    if (!isDemo || timeRemaining <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - 30;
        if (next <= 0) {
          setIsDemo(false);
          router.push("/demo?expired=true");
          return 0;
        }
        return next;
      });
    }, TIMER_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isDemo, timeRemaining > 0, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const endDemo = useCallback(async () => {
    try {
      await fetch("/api/demo/release", { method: "POST" });
    } catch (_) {
      /* best effort */
    }
    setIsDemo(false);
    router.push("/demo");
  }, [router]);

  if (!isDemo) return null;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const contextParts: string[] = [];
  if (industry) contextParts.push(industry.charAt(0).toUpperCase() + industry.slice(1));
  if (country) contextParts.push(country);
  const contextLabel = contextParts.length > 0 ? contextParts.join(" · ") : "Demo";

  return (
    <div className="sticky top-0 z-50 bg-amber-400 text-amber-900 px-4 py-2 flex items-center justify-between text-sm font-medium">
      <div className="flex items-center gap-2">
        <span className="inline-block w-2.5 h-2.5 bg-amber-600 rounded-full" />
        <span>
          Demo Mode — {contextLabel} — {formatTime(timeRemaining)} remaining
        </span>
      </div>
      <div className="flex items-center gap-3">
        <a
          href="/customer/signup"
          className="inline-flex items-center gap-1 underline hover:no-underline font-semibold"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Sign Up
        </a>
        <button
          onClick={endDemo}
          className="inline-flex items-center gap-1 bg-amber-600 text-white px-3 py-1 rounded hover:bg-amber-700 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          End Demo
        </button>
      </div>
    </div>
  );
}
