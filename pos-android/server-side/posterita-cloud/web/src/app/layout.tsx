import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import ErrorBoundary from "@/components/ErrorBoundary";
import Script from "next/script";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1976D2",
};

export const metadata: Metadata = {
  title: "Posterita Retail OS",
  description: "Offline-first POS for retail, restaurant & warehouse",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Posterita",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body className="antialiased">
        <ToastProvider>
          <ErrorBoundary>{children}</ErrorBoundary>
        </ToastProvider>
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then(function(reg) {
              reg.addEventListener('updatefound', function() {
                var newWorker = reg.installing;
                if (newWorker) {
                  newWorker.addEventListener('statechange', function() {
                    if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                      // New version available — user will get it on next navigation
                      console.log('[PWA] New version available');
                    }
                  });
                }
              });
            }).catch(function(err) {
              console.warn('[PWA] SW registration failed:', err);
            });
          }
        `}</Script>
      </body>
    </html>
  );
}
