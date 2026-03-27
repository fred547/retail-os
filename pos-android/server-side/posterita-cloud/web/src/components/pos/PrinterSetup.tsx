"use client";

import { useState, useEffect } from "react";
import { X, Printer, Check, AlertCircle, Wifi } from "lucide-react";
import {
  getPrinterConfig, savePrinterConfig, clearPrinterConfig,
  testPrinter, type PrinterConfig,
} from "@/lib/pos/network-print";

export default function PrinterSetup({ onClose }: { onClose: () => void }) {
  const [ip, setIp] = useState("");
  const [port, setPort] = useState("9100");
  const [name, setName] = useState("Receipt Printer");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const saved = getPrinterConfig();
    if (saved) {
      setIp(saved.ip);
      setPort(saved.port.toString());
      setName(saved.name);
    }
  }, []);

  const handleTest = async () => {
    if (!ip.trim()) return;
    setTesting(true);
    setTestResult(null);
    setErrorMsg("");

    try {
      const config: PrinterConfig = { ip: ip.trim(), port: parseInt(port) || 9100, name };
      await testPrinter(config);
      setTestResult("success");
    } catch (e: any) {
      setTestResult("error");
      setErrorMsg(e.message || "Connection failed");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (!ip.trim()) return;
    savePrinterConfig({
      ip: ip.trim(),
      port: parseInt(port) || 9100,
      name: name.trim() || "Receipt Printer",
    });
    onClose();
  };

  const handleRemove = () => {
    clearPrinterConfig();
    setIp("");
    setPort("9100");
    setName("Receipt Printer");
    setTestResult(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-gray-400" />
            <h2 className="text-lg font-bold text-white">Printer Setup</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 p-1">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1.5">Printer Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-400 block mb-1.5">IP Address</label>
              <input
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="192.168.1.100"
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 block mb-1.5">Port</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Test result */}
          {testResult === "success" && (
            <div className="flex items-center gap-2 bg-green-900/30 text-green-400 rounded-xl px-4 py-2.5 text-sm">
              <Check size={16} /> Test page sent successfully
            </div>
          )}
          {testResult === "error" && (
            <div className="flex items-center gap-2 bg-red-900/30 text-red-400 rounded-xl px-4 py-2.5 text-sm">
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}

          <p className="text-xs text-gray-600">
            The printer must be on the same network. Standard ESC/POS port is 9100.
          </p>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          {getPrinterConfig() && (
            <button
              onClick={handleRemove}
              className="px-4 py-2.5 text-red-400 text-sm hover:bg-red-900/20 rounded-xl transition"
            >
              Remove
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={handleTest}
            disabled={!ip.trim() || testing}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-700 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-600 transition disabled:opacity-40"
          >
            <Wifi size={14} />
            {testing ? "Testing..." : "Test"}
          </button>
          <button
            onClick={handleSave}
            disabled={!ip.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
