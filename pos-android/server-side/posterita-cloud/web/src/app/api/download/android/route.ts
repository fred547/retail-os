import { NextResponse } from "next/server";

/**
 * GET /api/download/android — redirect to the latest APK from GitHub Releases.
 *
 * GitHub's /releases/latest/download/ always points to the most recent release.
 * When you create a new release (gh release create vX.Y.Z app-debug.apk --latest),
 * this URL automatically updates — no code change needed.
 */
export async function GET() {
  const APK_URL = process.env.APK_DOWNLOAD_URL
    || "https://github.com/fred547/retail-os/releases/latest/download/app-debug.apk";

  return NextResponse.redirect(APK_URL);
}
