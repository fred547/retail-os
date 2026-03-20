import { NextResponse } from "next/server";
import { getSuperAdminInfo } from "@/lib/super-admin";

export async function GET() {
  try {
    const info = await getSuperAdminInfo();

    if (!info) {
      return NextResponse.json({ is_super_admin: false });
    }

    return NextResponse.json({
      is_super_admin: true,
      is_account_manager: true,
      email: info.email,
      name: info.name,
      impersonating: info.impersonating,
    });
  } catch (error) {
    console.error("Super admin status check failed:", error);
    return NextResponse.json({ is_super_admin: false });
  }
}
