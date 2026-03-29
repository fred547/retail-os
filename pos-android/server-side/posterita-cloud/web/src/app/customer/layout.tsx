import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import Sidebar from "@/components/Sidebar";
import DemoBanner from "@/components/DemoBanner";
import { createServerSupabase } from "@/lib/supabase/server";
import { getAccountManagerInfo } from "@/lib/super-admin";

export default async function CustomerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") || "";

  if (pathname === "/customer/login" || pathname === "/customer/signup") {
    return <>{children}</>;
  }

  // Check OTT cookie (Android WebView session) — skip Supabase Auth if present
  const cookieStore = await cookies();
  const ottCookie = cookieStore.get("posterita_ott_session");
  const hasOttSession = !!ottCookie?.value;

  // Check demo session cookie — skip Supabase Auth for demo visitors
  const demoCookie = cookieStore.get("posterita_demo_session");
  const hasDemoSession = !!demoCookie?.value;

  if (!hasOttSession && !hasDemoSession) {
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
  }

  return (
    <div className="flex flex-col min-h-screen">
      {hasDemoSession && <DemoBanner />}
      <div className="flex flex-1">
        {!hasOttSession && <Sidebar portal="customer" />}
        <main className={`flex-1 p-8 ${hasOttSession ? "pt-4" : "lg:ml-64 pt-16 lg:pt-8"}`}>{children}</main>
      </div>
    </div>
  );
}
