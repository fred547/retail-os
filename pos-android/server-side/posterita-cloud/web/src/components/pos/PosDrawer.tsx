"use client";

import { useState } from "react";
import {
  X, ShoppingCart, RotateCcw, DollarSign, Printer, Settings,
  ClipboardList, Menu, Lock, ExternalLink, Tag,
} from "lucide-react";
import { openCashDrawer, getPrinterConfig } from "@/lib/pos/network-print";
import { useSyncStatus } from "@/lib/offline/use-sync";

export default function PosDrawer({
  open,
  onClose,
  onRefund,
  onTill,
  onPrinter,
  onHoldOrders,
}: {
  open: boolean;
  onClose: () => void;
  onRefund: () => void;
  onTill: () => void;
  onPrinter: () => void;
  onHoldOrders: () => void;
}) {
  const sync = useSyncStatus();
  const [drawerOpening, setDrawerOpening] = useState(false);

  const handleOpenDrawer = async () => {
    if (!getPrinterConfig()) {
      alert("No printer configured. Set up a printer first to open the cash drawer.");
      return;
    }
    setDrawerOpening(true);
    try {
      await openCashDrawer();
    } catch (e: any) {
      alert(`Cash drawer failed: ${e.message}`);
    } finally {
      setDrawerOpening(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed left-0 top-0 bottom-0 w-72 bg-gray-900 border-r border-gray-700 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
          <span className="text-lg font-bold text-white">POS Menu</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 p-1">
            <X size={20} />
          </button>
        </div>

        {/* Menu items */}
        <nav className="flex-1 py-2 overflow-y-auto">
          <DrawerItem icon={ClipboardList} label="Hold Orders" onClick={() => { onHoldOrders(); onClose(); }} shortcut="F4" />
          <DrawerItem icon={RotateCcw} label="Refund" onClick={() => { onRefund(); onClose(); }} color="text-red-400" />
          <DrawerItem icon={DollarSign} label="Open Cash Drawer" onClick={handleOpenDrawer} loading={drawerOpening} />

          <div className="border-t border-gray-800 my-2 mx-4" />

          <DrawerItem icon={ShoppingCart} label="Till" onClick={() => { onTill(); onClose(); }} shortcut="F3" />
          <DrawerItem icon={Printer} label="Printer" onClick={() => { onPrinter(); onClose(); }} />
          <DrawerItem icon={Tag} label="Promotions" onClick={() => window.open("/customer/promotions", "_blank")} external />

          <div className="border-t border-gray-800 my-2 mx-4" />

          <DrawerItem icon={ShoppingCart} label="Orders" onClick={() => window.open("/customer/orders", "_blank")} external />
          <DrawerItem icon={Settings} label="Settings" onClick={() => window.open("/customer/settings", "_blank")} external />
        </nav>

        {/* Sync status */}
        <div className="px-4 py-3 border-t border-gray-800 text-xs text-gray-500">
          {sync.pendingOrders > 0 && (
            <p className="text-amber-400 mb-1">{sync.pendingOrders} orders pending sync</p>
          )}
          {sync.lastSyncAt && (
            <p>Last sync: {new Date(sync.lastSyncAt).toLocaleTimeString()}</p>
          )}
          {sync.lastError && (
            <p className="text-red-400">{sync.lastError}</p>
          )}
        </div>
      </div>
    </>
  );
}

function DrawerItem({
  icon: Icon,
  label,
  onClick,
  shortcut,
  color,
  loading,
  external,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  shortcut?: string;
  color?: string;
  loading?: boolean;
  external?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={loading}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800 transition disabled:opacity-50">
      <Icon size={18} className={color || "text-gray-400"} />
      <span className={`text-sm font-medium flex-1 ${color || "text-gray-200"}`}>
        {loading ? "Opening..." : label}
      </span>
      {shortcut && <span className="text-[10px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">{shortcut}</span>}
      {external && <ExternalLink size={12} className="text-gray-600" />}
    </button>
  );
}
