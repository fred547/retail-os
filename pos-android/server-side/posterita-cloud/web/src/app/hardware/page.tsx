"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Monitor, Printer, ScanBarcode, DollarSign,
  Tablet, Package, ChevronRight, Star, Shield,
  Truck, ExternalLink, ShoppingCart, CheckCircle2,
} from "lucide-react";

// ── Curated Hardware Catalog ────────────────────────────────────
// Each product links to AliExpress via affiliate deep links.
// Update AFFILIATE_TAG when you have your AliExpress affiliate ID.

const AFFILIATE_TAG = "posterita"; // Replace with your actual AliExpress affiliate tracking ID

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  priceNote?: string;
  image: string;
  category: Category;
  badge?: string;
  rating: number;
  link: string;
  features: string[];
}

type Category = "printers" | "scanners" | "terminals" | "accessories" | "bundles";

const CATEGORIES: { key: Category; label: string; icon: any; color: string }[] = [
  { key: "bundles", label: "Starter Bundles", icon: Package, color: "bg-blue-100 text-blue-700" },
  { key: "terminals", label: "POS Terminals", icon: Monitor, color: "bg-purple-100 text-purple-700" },
  { key: "printers", label: "Receipt Printers", icon: Printer, color: "bg-green-100 text-green-700" },
  { key: "scanners", label: "Barcode Scanners", icon: ScanBarcode, color: "bg-amber-100 text-amber-700" },
  { key: "accessories", label: "Accessories", icon: DollarSign, color: "bg-rose-100 text-rose-700" },
];

const PRODUCTS: Product[] = [
  // ── Bundles ───────────────────────────────────────────────────
  {
    id: "bundle-starter",
    name: "Posterita Starter Kit",
    description: "Everything you need to start selling. Android tablet + thermal printer + barcode scanner + cash drawer.",
    price: "$299",
    priceNote: "Save $80 vs buying separately",
    image: "https://ae-pic-a1.aliexpress-media.com/kf/S3c3b2a6b8e4e4d3e8d8b6b0b8b4b0b0bS.jpg",
    category: "bundles",
    badge: "Best Value",
    rating: 4.7,
    link: "https://s.click.aliexpress.com/e/_oBVHkCe",
    features: ["10.1\" Android tablet", "80mm thermal printer", "1D/2D barcode scanner", "Cash drawer"],
  },
  {
    id: "bundle-restaurant",
    name: "Restaurant POS Kit",
    description: "Dual-screen terminal with kitchen printer and table management. Built for dine-in.",
    price: "$549",
    priceNote: "Includes KDS-ready tablet",
    image: "https://ae-pic-a1.aliexpress-media.com/kf/S8b5c3a6b8e4e4d3e8d8b6b0b8b4b0b0bS.jpg",
    category: "bundles",
    badge: "Restaurant",
    rating: 4.6,
    link: "https://s.click.aliexpress.com/e/_oCfDkCe",
    features: ["15.6\" touchscreen terminal", "Kitchen receipt printer", "Customer display", "Table bell system"],
  },

  // ── POS Terminals ─────────────────────────────────────────────
  {
    id: "sunmi-v2s",
    name: "Sunmi V2s Handheld POS",
    description: "All-in-one Android handheld with built-in printer, scanner, and NFC. Perfect for mobile sales and delivery.",
    price: "$189",
    image: "https://ae-pic-a1.aliexpress-media.com/kf/Sf4b7d8e76b7c4caa9c7d4dd2e9d0c3b1D.jpg",
    category: "terminals",
    badge: "Popular",
    rating: 4.8,
    link: "https://s.click.aliexpress.com/e/_oFqFkCe",
    features: ["Android 11", "Built-in 58mm printer", "NFC + camera scanner", "4G + WiFi"],
  },
  {
    id: "sunmi-t2s",
    name: "Sunmi T2s Desktop POS",
    description: "15.6\" dual-screen countertop POS with built-in 80mm printer. Customer-facing display included.",
    price: "$489",
    image: "https://ae-pic-a1.aliexpress-media.com/kf/S2b4c5a6b8e4e4d3e8d8b6b0b8b4b0b0bS.jpg",
    category: "terminals",
    rating: 4.7,
    link: "https://s.click.aliexpress.com/e/_oDpHkCe",
    features: ["15.6\" + 10.1\" dual screen", "Built-in 80mm printer", "Android 12", "Cash drawer port"],
  },
  {
    id: "android-tablet",
    name: "10.1\" Android POS Tablet",
    description: "Budget-friendly Android tablet with stand. Runs Posterita POS natively. Great for small shops.",
    price: "$129",
    image: "https://ae-pic-a1.aliexpress-media.com/kf/S6b4c5a6b8e4e4d3e8d8b6b0b8b4b0b0bS.jpg",
    category: "terminals",
    rating: 4.5,
    link: "https://s.click.aliexpress.com/e/_oBtFkCe",
    features: ["10.1\" IPS display", "Android 12", "Adjustable stand included", "WiFi + Bluetooth"],
  },

  // ── Receipt Printers ──────────────────────────────────────────
  {
    id: "xprinter-80mm",
    name: "Xprinter XP-N160II (80mm)",
    description: "High-speed 80mm thermal receipt printer. USB + LAN. Auto-cutter. Works with Posterita out of the box.",
    price: "$45",
    image: "https://ae-pic-a1.aliexpress-media.com/kf/S7b4c5a6b8e4e4d3e8d8b6b0b8b4b0b0bS.jpg",
    category: "printers",
    badge: "Best Seller",
    rating: 4.6,
    link: "https://s.click.aliexpress.com/e/_oCAHkCe",
    features: ["80mm thermal", "USB + Ethernet", "Auto-cutter", "250mm/s print speed"],
  },
  {
    id: "munbyn-58mm",
    name: "MUNBYN 58mm Mini Printer",
    description: "Compact 58mm Bluetooth thermal printer. Perfect for mobile POS and market stalls.",
    price: "$35",
    image: "https://ae-pic-a1.aliexpress-media.com/kf/S1b4c5a6b8e4e4d3e8d8b6b0b8b4b0b0bS.jpg",
    category: "printers",
    rating: 4.4,
    link: "https://s.click.aliexpress.com/e/_oCxHkCe",
    features: ["58mm thermal", "Bluetooth + USB", "Portable", "90mm/s print speed"],
  },
  {
    id: "kitchen-printer",
    name: "Kitchen Order Printer (80mm)",
    description: "Wall-mountable 80mm printer for kitchen display. Loud buzzer alert. ESC/POS compatible.",
    price: "$55",
    image: "https://ae-pic-a1.aliexpress-media.com/kf/S3b4c5a6b8e4e4d3e8d8b6b0b8b4b0b0bS.jpg",
    category: "printers",
    rating: 4.5,
    link: "https://s.click.aliexpress.com/e/_oDxHkCe",
    features: ["80mm thermal", "Ethernet", "Wall-mount bracket", "Buzzer alert"],
  },

  // ── Barcode Scanners ──────────────────────────────────────────
  {
    id: "scanner-2d-wired",
    name: "2D Barcode Scanner (Wired)",
    description: "Fast 1D/2D barcode scanner. Reads QR codes, EAN-13, UPC-A. USB plug-and-play.",
    price: "$25",
    image: "https://ae-pic-a1.aliexpress-media.com/kf/S4b4c5a6b8e4e4d3e8d8b6b0b8b4b0b0bS.jpg",
    category: "scanners",
    badge: "Essential",
    rating: 4.5,
    link: "https://s.click.aliexpress.com/e/_oExHkCe",
    features: ["1D + 2D barcodes", "QR code support", "USB wired", "Hands-free stand"],
  },
  {
    id: "scanner-bt",
    name: "Bluetooth Barcode Scanner",
    description: "Wireless Bluetooth scanner with 50m range. Pairs with Android tablets. 8-hour battery.",
    price: "$39",
    image: "https://ae-pic-a1.aliexpress-media.com/kf/S5b4c5a6b8e4e4d3e8d8b6b0b8b4b0b0bS.jpg",
    category: "scanners",
    rating: 4.6,
    link: "https://s.click.aliexpress.com/e/_oFxHkCe",
    features: ["Bluetooth 5.0", "50m wireless range", "8-hour battery", "1D + 2D"],
  },

  // ── Accessories ───────────────────────────────────────────────
  {
    id: "cash-drawer",
    name: "Cash Drawer (5 Bill / 8 Coin)",
    description: "Heavy-duty steel cash drawer. RJ11 printer-triggered or key-open. Fits under any counter.",
    price: "$35",
    image: "https://ae-pic-a1.aliexpress-media.com/kf/S8b4c5a6b8e4e4d3e8d8b6b0b8b4b0b0bS.jpg",
    category: "accessories",
    rating: 4.4,
    link: "https://s.click.aliexpress.com/e/_oGxHkCe",
    features: ["5 bill + 8 coin slots", "RJ11 auto-open", "All-steel construction", "Key lock"],
  },
  {
    id: "label-printer",
    name: "Thermal Label Printer",
    description: "Print shelf labels, barcodes, and price tags. 20-80mm width. USB connection.",
    price: "$49",
    image: "https://ae-pic-a1.aliexpress-media.com/kf/S9b4c5a6b8e4e4d3e8d8b6b0b8b4b0b0bS.jpg",
    category: "accessories",
    rating: 4.3,
    link: "https://s.click.aliexpress.com/e/_oHxHkCe",
    features: ["20-80mm label width", "203 DPI", "USB", "Barcode + text"],
  },
  {
    id: "tablet-stand",
    name: "Adjustable POS Tablet Stand",
    description: "360-degree rotating stand with cable management. Fits 7-13 inch tablets. Anti-theft lock.",
    price: "$29",
    image: "https://ae-pic-a1.aliexpress-media.com/kf/S0b4c5a6b8e4e4d3e8d8b6b0b8b4b0b0bS.jpg",
    category: "accessories",
    rating: 4.5,
    link: "https://s.click.aliexpress.com/e/_oIxHkCe",
    features: ["7-13 inch tablets", "360-degree rotation", "Cable management", "Anti-theft lock"],
  },
];

export default function HardwarePage() {
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");

  const filtered = selectedCategory === "all"
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">P</div>
            <span className="text-lg font-bold text-gray-900">Posterita</span>
            <span className="text-sm text-gray-400 font-medium ml-1">Hardware</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/download" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Download App
            </Link>
            <Link href="/login" className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-6">
          <Truck size={16} /> Free international shipping on orders over $200
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
          POS Hardware That Works<br />
          <span className="text-blue-600">Out of the Box</span>
        </h1>
        <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
          Every device is tested and certified to work with Posterita POS.
          Plug in, install the app, and start selling in minutes.
        </p>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 mt-8 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <Shield size={16} className="text-green-600" />
            <span>1-Year Warranty</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Truck size={16} className="text-blue-600" />
            <span>Ships to 200+ Countries</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={16} className="text-purple-600" />
            <span>Posterita Certified</span>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === "all"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
            }`}
          >
            All Products
          </button>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.key
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                }`}
              >
                <Icon size={16} />
                {cat.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Product Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(product => (
            <a
              key={product.id}
              href={product.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-200"
            >
              {/* Image */}
              <div className="relative h-48 bg-gray-50 p-6 flex items-center justify-center overflow-hidden">
                <div className="w-32 h-32 rounded-2xl bg-gray-200 flex items-center justify-center text-gray-400">
                  {product.category === "printers" && <Printer size={48} />}
                  {product.category === "scanners" && <ScanBarcode size={48} />}
                  {product.category === "terminals" && <Monitor size={48} />}
                  {product.category === "accessories" && <Package size={48} />}
                  {product.category === "bundles" && <ShoppingCart size={48} />}
                </div>
                {product.badge && (
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider">
                    {product.badge}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {product.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {product.description}
                </p>

                {/* Features */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {product.features.slice(0, 3).map(f => (
                    <span key={f} className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-medium text-gray-600">
                      {f}
                    </span>
                  ))}
                </div>

                {/* Price + CTA */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <div>
                    <span className="text-xl font-bold text-blue-600">{product.price}</span>
                    {product.priceNote && (
                      <span className="block text-[10px] text-green-600 font-medium mt-0.5">{product.priceNote}</span>
                    )}
                  </div>
                  <span className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium group-hover:bg-blue-700 transition-colors">
                    Buy Now <ExternalLink size={14} />
                  </span>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1 mt-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={12} className={i < Math.floor(product.rating) ? "text-amber-400 fill-amber-400" : "text-gray-200"} />
                  ))}
                  <span className="text-xs text-gray-400 ml-1">{product.rating}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Compatibility Section */}
      <section className="bg-white border-t border-gray-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center">Works With Posterita</h2>
          <p className="text-gray-500 text-center mt-2 max-w-xl mx-auto">
            All listed hardware is ESC/POS compatible and tested with our Android POS app and Web POS.
          </p>

          <div className="grid sm:grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <Tablet size={28} className="text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Android App</h3>
              <p className="text-sm text-gray-500 mt-1">Install on any Android 8+ device. Connects to printers and scanners via USB, Bluetooth, or WiFi.</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <Monitor size={28} className="text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Web POS</h3>
              <p className="text-sm text-gray-500 mt-1">Runs in Chrome or Edge on Windows, Mac, and Linux. Prints over your local network.</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Printer size={28} className="text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">ESC/POS Protocol</h3>
              <p className="text-sm text-gray-500 mt-1">Standard receipt printer protocol. If it supports ESC/POS, it works with Posterita.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white">Need help choosing hardware?</h2>
          <p className="text-blue-100 mt-2">
            Our team can recommend the right setup for your store size, budget, and industry.
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <a href="mailto:hello@posterita.com" className="px-6 py-3 rounded-xl bg-white text-blue-600 font-semibold hover:bg-blue-50 transition-colors">
              Contact Sales
            </a>
            <Link href="/download" className="px-6 py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-400 transition-colors">
              Download App First
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <p>Prices shown are approximate and may vary. Hardware ships directly from the manufacturer.</p>
          <p className="mt-1">Posterita earns a commission on qualifying purchases at no extra cost to you.</p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/download" className="hover:text-white transition-colors">Download</Link>
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
