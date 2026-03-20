import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Sidebar from "@/components/Sidebar";
import { createServerSupabase } from "@/lib/supabase/server";
import { getAccountManagerInfo } from "@/lib/super-admin";

export default async function CustomerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") || "";

  if (pathname === "/customer/login") {
    return <>{children}</>;
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/customer/login");
  }

  const managerInfo = await getAccountManagerInfo();
  if (managerInfo && !managerInfo.impersonating) {
    redirect("/manager/platform");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar portal="customer" />
      <main className="flex-1 lg:ml-64 p-8 pt-16 lg:pt-8">{children}</main>
    </div>
  );
}
