"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const COUNTRIES = [
  { code: "MU", name: "Mauritius", currency: "MUR", phone: "+230" },
  { code: "ZA", name: "South Africa", currency: "ZAR", phone: "+27" },
  { code: "KE", name: "Kenya", currency: "KES", phone: "+254" },
  { code: "NG", name: "Nigeria", currency: "NGN", phone: "+234" },
  { code: "GH", name: "Ghana", currency: "GHS", phone: "+233" },
  { code: "TZ", name: "Tanzania", currency: "TZS", phone: "+255" },
  { code: "UG", name: "Uganda", currency: "UGX", phone: "+256" },
  { code: "RW", name: "Rwanda", currency: "RWF", phone: "+250" },
  { code: "MG", name: "Madagascar", currency: "MGA", phone: "+261" },
  { code: "SC", name: "Seychelles", currency: "SCR", phone: "+248" },
  { code: "RE", name: "Réunion", currency: "EUR", phone: "+262" },
  { code: "GB", name: "United Kingdom", currency: "GBP", phone: "+44" },
  { code: "FR", name: "France", currency: "EUR", phone: "+33" },
  { code: "US", name: "United States", currency: "USD", phone: "+1" },
  { code: "IN", name: "India", currency: "INR", phone: "+91" },
  { code: "AE", name: "UAE", currency: "AED", phone: "+971" },
];

export default function CustomerSignupPage() {
  const [step, setStep] = useState(1);
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [country, setCountry] = useState("Mauritius");
  const [currency, setCurrency] = useState("MUR");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const selectedCountry = COUNTRIES.find((c) => c.name === country);

  const handleCountryChange = (name: string) => {
    setCountry(name);
    const c = COUNTRIES.find((x) => x.name === name);
    if (c) setCurrency(c.currency);
  };

  const goNext = () => {
    setError("");
    if (step === 1) {
      if (!firstname.trim()) { setError("First name is required."); return; }
      if (!email.trim()) { setError("Email is required."); return; }
      if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
      setStep(2);
    }
  };

  const goBack = () => {
    setError("");
    setStep(step - 1);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (pin && pin.length !== 4) {
      setError("PIN must be exactly 4 digits.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstname: firstname.trim(),
          lastname: lastname.trim(),
          email: email.trim(),
          phone: phone.trim() ? `${selectedCountry?.phone || ""}${phone.trim()}` : "",
          password,
          businessname: businessName.trim() || `${firstname.trim()}'s Store`,
          country,
          currency,
          pin,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed. Please try again.");
        setLoading(false);
        return;
      }

      // Auto-login after signup
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) {
        // Signup succeeded but auto-login failed — redirect to login
        router.push("/customer/login");
      } else {
        router.push("/customer");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/customer`,
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-posterita-dark to-gray-900 px-4 py-12">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-posterita-dark">Create Your Account</h1>
          <p className="text-gray-500 mt-2">
            Get started with Posterita POS — free forever.
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`w-2.5 h-2.5 rounded-full transition ${step >= 1 ? "bg-posterita-blue" : "bg-gray-200"}`} />
          <div className={`w-8 h-0.5 transition ${step >= 2 ? "bg-posterita-blue" : "bg-gray-200"}`} />
          <div className={`w-2.5 h-2.5 rounded-full transition ${step >= 2 ? "bg-posterita-blue" : "bg-gray-200"}`} />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {/* Step 1: Account details */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={firstname}
                  onChange={(e) => setFirstname(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none transition"
                  placeholder="John"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none transition"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-400">*</span>
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
                Password <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none transition"
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </div>

            <button
              onClick={goNext}
              className="w-full bg-posterita-blue text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Continue
            </button>

            {/* Divider */}
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-3 text-gray-400">or</span>
              </div>
            </div>

            {/* Google Sign Up */}
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              {googleLoading ? "Redirecting..." : "Sign up with Google"}
            </button>
          </div>
        )}

        {/* Step 2: Business details */}
        {step === 2 && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none transition"
                placeholder={`${firstname}'s Store`}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">Leave blank to use &quot;{firstname}&apos;s Store&quot;</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <select
                value={country}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none transition bg-white"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.name}>
                    {c.name} ({c.currency})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-gray-400 text-xs">(optional)</span>
              </label>
              <div className="flex gap-2">
                <span className="flex items-center px-3 py-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500 min-w-[70px] justify-center">
                  {selectedCountry?.phone || "+230"}
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none transition"
                  placeholder="5423 3016"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                POS PIN <span className="text-gray-400 text-xs">(4 digits, optional)</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none transition tracking-[0.5em] text-center font-mono text-lg"
                placeholder="••••"
              />
              <p className="text-xs text-gray-400 mt-1">Used to unlock the POS terminal. You can set this later.</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={goBack}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] bg-posterita-blue text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? "Creating your store..." : "Create Account"}
              </button>
            </div>

            {/* What you get */}
            <div className="bg-blue-50 rounded-xl p-4 mt-2">
              <p className="text-sm font-medium text-posterita-dark mb-2">Your free account includes:</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">&#10003;</span> Live store (ready for your products)</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">&#10003;</span> Demo store (15 sample products to explore)</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">&#10003;</span> Full POS, inventory, reports &amp; more</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">&#10003;</span> Works on Android, Windows, Mac &amp; web</li>
              </ul>
            </div>
          </form>
        )}

        {/* Footer links */}
        <div className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/customer/login" className="text-posterita-blue hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
