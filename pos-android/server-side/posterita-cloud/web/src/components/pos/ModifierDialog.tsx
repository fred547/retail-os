"use client";

import { useState, useMemo } from "react";
import { X, Check, ChevronRight } from "lucide-react";
import type { Product } from "@/lib/offline/schema";

interface Modifier {
  modifier_id: number;
  name: string;
  sellingprice: number;
  description: string | null;  // group name (e.g., "Sauce", "Size")
}

interface ModifierGroup {
  name: string;
  items: Modifier[];
  singleChoice: boolean;
}

// Sort order matching Android (ProductActivity line ~960)
const GROUP_ORDER = [
  "cooking", "preparation", "doneness", "salt", "sauce",
  "dressing", "topping", "extra", "add", "side", "size", "drink",
];

function groupModifiers(modifiers: Modifier[]): ModifierGroup[] {
  const groups: Record<string, Modifier[]> = {};
  for (const m of modifiers) {
    const key = m.description || "Options";
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  }

  return Object.entries(groups)
    .map(([name, items]) => {
      // Single-choice: ≤3 options with "No" prefix, or exactly 2 options
      const hasNoPrefix = items.some((i) => i.name.startsWith("No ") || i.name.startsWith("Without "));
      const singleChoice = (items.length <= 3 && hasNoPrefix) || items.length === 2;
      return { name, items, singleChoice };
    })
    .sort((a, b) => {
      const aIdx = GROUP_ORDER.findIndex((g) => a.name.toLowerCase().includes(g));
      const bIdx = GROUP_ORDER.findIndex((g) => b.name.toLowerCase().includes(g));
      if (aIdx === -1 && bIdx === -1) return a.name.localeCompare(b.name);
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
}

export default function ModifierDialog({
  product,
  modifiers,
  onConfirm,
  onCancel,
}: {
  product: Product;
  modifiers: Modifier[];
  onConfirm: (selected: { name: string; price: number }[]) => void;
  onCancel: () => void;
}) {
  const groups = useMemo(() => groupModifiers(modifiers), [modifiers]);
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<Record<number, boolean>>({});

  const currentGroup = groups[step];
  const isLast = step === groups.length - 1;

  const toggleModifier = (modId: number) => {
    if (currentGroup.singleChoice) {
      // Single choice: deselect all in this group, select clicked
      const newSel = { ...selections };
      for (const m of currentGroup.items) {
        delete newSel[m.modifier_id];
      }
      newSel[modId] = true;
      setSelections(newSel);
    } else {
      setSelections((prev) => ({
        ...prev,
        [modId]: !prev[modId],
      }));
    }
  };

  const selectedModifiers = modifiers.filter((m) => selections[m.modifier_id]);
  const extrasTotal = selectedModifiers.reduce((sum, m) => sum + m.sellingprice, 0);

  const handleNext = () => {
    if (isLast) {
      onConfirm(selectedModifiers.map((m) => ({ name: m.name, price: m.sellingprice })));
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-700"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-white">{product.name}</h2>
            <p className="text-xs text-gray-400">
              Step {step + 1} of {groups.length} — {currentGroup?.name}
            </p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-200 p-1">
            <X size={20} />
          </button>
        </div>

        {/* Group options */}
        <div className="px-5 py-4">
          <p className="text-sm text-gray-400 mb-3">
            {currentGroup?.singleChoice ? "Choose one:" : "Select options:"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {currentGroup?.items.map((mod) => {
              const selected = !!selections[mod.modifier_id];
              return (
                <button
                  key={mod.modifier_id}
                  onClick={() => toggleModifier(mod.modifier_id)}
                  className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-left transition ${
                    selected
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-gray-700 bg-gray-800 hover:border-gray-600"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                    selected ? "bg-blue-500" : "bg-gray-700"
                  }`}>
                    {selected && <Check size={12} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${selected ? "text-white" : "text-gray-300"}`}>
                      {mod.name}
                    </p>
                    {mod.sellingprice > 0 && (
                      <p className="text-xs text-blue-400">+{mod.sellingprice.toFixed(2)}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Extras total */}
        {extrasTotal > 0 && (
          <div className="px-5 pb-2">
            <p className="text-sm text-blue-400 text-right">
              Extras: +{extrasTotal.toFixed(2)}
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-700">
          <div className="flex gap-1.5">
            {groups.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${
                i === step ? "bg-blue-500" : i < step ? "bg-blue-800" : "bg-gray-700"
              }`} />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleNext}
              className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition bg-blue-600 text-white hover:bg-blue-700">
              {isLast ? "Add to Cart" : "Next"}
              {!isLast && <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
