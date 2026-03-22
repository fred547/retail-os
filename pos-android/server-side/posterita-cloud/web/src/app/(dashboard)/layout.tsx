export const dynamic = "force-dynamic";

import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-8 pt-16 lg:pt-8">{children}</main>
    </div>
  );
}
