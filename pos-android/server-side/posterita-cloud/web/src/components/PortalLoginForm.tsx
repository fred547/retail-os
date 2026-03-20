"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PortalType = "manager" | "customer";

export default function PortalLoginForm({
  portal,
  title,
  subtitle,
  redirectPath,
  alternateHref,
  alternateLabel,
}: {
  portal: PortalType;
  title: string;
  subtitle: string;
  redirectPath: string;
  alternateHref: string;
  alternateLabel: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/super-admin/status");
      const data = res.ok ? await res.json() : { is_account_manager: false };

      if (data.is_account_manager) {
        if (portal === "customer") {
          router.push("/manager/platform");
        } else {
          router.push("/manager/platform");
        }
      } else if (portal === "manager") {
        setError("This login is only for Posterita account managers.");
        await supabase.auth.signOut();
      } else {
        router.push(redirectPath);
      }
    } catch {
      router.push(redirectPath);
    } finally {
      setLoading(false);
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-posterita-dark to-gray-900 px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-posterita-dark">{title}</h1>
          <p className="text-gray-500 mt-2">{subtitle}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none transition"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none transition"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-posterita-blue text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <Link href={alternateHref} className="text-posterita-blue hover:underline">
            {alternateLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
