/**
 * POS layout — full-screen, no sidebar.
 * When installed as a PWA (display: standalone), this is the only chrome the user sees.
 */
export default function PosLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-900">{children}</div>;
}
