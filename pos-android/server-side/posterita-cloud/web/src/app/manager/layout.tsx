import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Sidebar from "@/components/Sidebar";
import { createServerSupabase } from "@/lib/supabase/server";
import { isAccountManager } from "@/lib/super-admin";

export default async function ManagerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") || "";

  if (pathname === "/manager/login") {
    return <>{children}</>;
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/manager/login");
  }

  if (!(await isAccountManager())) {
    redirect("/customer");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar portal="manager" />
      <main className="flex-1 lg:ml-64 p-8 pt-16 lg:pt-8 bg-slate-50">{children}</main>
    </div>
  );
}
