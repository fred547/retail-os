"use client";

import { useState, useEffect } from "react";
import { Smartphone, Monitor, Apple, Download, CheckCircle } from "lucide-react";

export default function DownloadPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  useEffect(() => {
    // Listen for the PWA install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsPwaInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setIsPwaInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="max-w-3xl mx-auto px-4 pt-16 pb-8 text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/30">
          <span className="text-white text-3xl font-bold">P</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Get Posterita Retail OS</h1>
        <p className="text-gray-500 text-lg max-w-md mx-auto">
          Offline-first POS for retail, restaurant &amp; warehouse. Works on any device.
        </p>
      </div>

      {/* Download options */}
      <div className="max-w-3xl mx-auto px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-2">

          {/* Android */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Smartphone size={20} className="text-green-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Android</h2>
                <p className="text-xs text-gray-400">Phone &amp; tablet</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Native Android app with full offline POS, barcode scanning, Bluetooth printing,
              and kitchen display support.
            </p>
            <a
              href="https://github.com/fred547/retail-os/releases/latest/download/app-debug.apk"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 transition"
            >
              <Download size={16} />
              Download APK
            </a>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Requires Android 7.0+
            </p>
          </div>

          {/* Windows / Mac / Linux (PWA) */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Monitor size={20} className="text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Windows / Mac / Linux</h2>
                <p className="text-xs text-gray-400">Desktop app (PWA)</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Install as a desktop app from your browser. Same POS experience with offline mode,
              USB scanner support, and network printing.
            </p>
            {isPwaInstalled ? (
              <div className="flex items-center justify-center gap-2 w-full bg-green-50 text-green-700 px-4 py-2.5 rounded-xl text-sm font-medium">
                <CheckCircle size={16} />
                Installed
              </div>
            ) : deferredPrompt ? (
              <button
                onClick={handleInstallPwa}
                className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition"
              >
                <Download size={16} />
                Install App
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 w-full bg-gray-100 text-gray-500 px-4 py-2.5 rounded-xl text-sm font-medium">
                  Use Chrome or Edge to install
                </div>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2 text-center">
              Requires Chrome 96+ or Edge 96+
            </p>
          </div>
        </div>

        {/* Installation instructions */}
        <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">How to Install on Windows</h3>
          <ol className="space-y-3 text-sm text-gray-600">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span>Open <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> and go to <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">web.posterita.com</code></span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <span>Click the <strong>install icon</strong> in the address bar (looks like a monitor with a download arrow)</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <span>Click <strong>&quot;Install&quot;</strong> in the popup dialog</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <span>Posterita will open in its own window and appear in your taskbar / Start menu</span>
            </li>
          </ol>

          <h3 className="font-semibold text-gray-900 mt-6 mb-4">How to Install on Mac</h3>
          <ol className="space-y-3 text-sm text-gray-600">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span>Open <strong>Google Chrome</strong> and go to <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">web.posterita.com</code></span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <span>Click the <strong>install icon</strong> in the address bar, or go to Menu &rarr; &quot;Install Posterita Retail OS&quot;</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <span>The app will appear in your <strong>Dock</strong> and Applications folder</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
