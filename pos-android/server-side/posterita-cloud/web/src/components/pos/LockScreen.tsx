"use client";

import { useState, useEffect, useCallback } from "react";
import { Lock, Delete } from "lucide-react";
import { validatePin } from "@/lib/pos/session";
import type { PosUser } from "@/lib/offline/schema";

/**
 * PIN lock screen — mirrors Android LockScreenActivity.
 * 4-digit PIN entry with numpad. Blocks POS access until correct PIN.
 */
export default function LockScreen({
  userName,
  onUnlock,
}: {
  userName?: string;
  onUnlock: (user: PosUser) => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleDigit = useCallback((digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    // Auto-submit when 4 digits entered
    if (newPin.length === 4) {
      setTimeout(async () => {
        const user = await validatePin(newPin);
        if (user) {
          onUnlock(user);
        } else {
          setError(true);
          setShake(true);
          setTimeout(() => { setShake(false); setPin(""); }, 500);
        }
      }, 100);
    }
  }, [pin, onUnlock]);

  const handleBackspace = useCallback(() => {
    setPin((p) => p.slice(0, -1));
    setError(false);
  }, []);

  // Physical keyboard support
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleDigit, handleBackspace]);

  const dots = Array.from({ length: 4 }, (_, i) => i < pin.length);

  return (
    <div className="fixed inset-0 bg-gray-900 z-[60] flex items-center justify-center">
      <div className="w-full max-w-xs text-center">
        {/* Icon + Title */}
        <div className="mb-8">
          <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={28} className="text-blue-400" />
          </div>
          {userName && (
            <p className="text-gray-300 text-sm mb-1">{userName}</p>
          )}
          <h1 className="text-xl font-bold text-white">Enter PIN</h1>
        </div>

        {/* PIN dots */}
        <div className={`flex justify-center gap-4 mb-8 ${shake ? "animate-shake" : ""}`}>
          {dots.map((filled, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all duration-150 ${
                filled
                  ? error ? "bg-red-500 scale-110" : "bg-blue-500 scale-110"
                  : "bg-gray-700"
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-400 text-sm mb-4">Incorrect PIN</p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              className="w-16 h-16 rounded-2xl bg-gray-800 text-white text-2xl font-semibold hover:bg-gray-700 active:bg-gray-600 transition mx-auto flex items-center justify-center"
            >
              {digit}
            </button>
          ))}
          <div /> {/* empty spacer */}
          <button
            onClick={() => handleDigit("0")}
            className="w-16 h-16 rounded-2xl bg-gray-800 text-white text-2xl font-semibold hover:bg-gray-700 active:bg-gray-600 transition mx-auto flex items-center justify-center"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="w-16 h-16 rounded-2xl bg-gray-800 text-gray-400 hover:bg-gray-700 active:bg-gray-600 transition mx-auto flex items-center justify-center"
          >
            <Delete size={22} />
          </button>
        </div>
      </div>

      {/* Shake animation */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          50% { transform: translateX(8px); }
          75% { transform: translateX(-4px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}
