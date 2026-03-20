import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import OttAuthBridge from "@/components/OttAuthBridge";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Suspense fallback={null}>
        <OttAuthBridge />
      </Suspense>
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-8 pt-16 lg:pt-8">{children}</main>
    </div>
  );
}
