import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const LEGACY_CUSTOMER_PATHS = new Set([
  "/",
  "/products",
  "/categories",
  "/orders",
  "/customers",
  "/stores",
  "/users",
  "/terminals",
  "/reports",
  "/price-review",
  "/ai-import",
  "/intake",
  "/settings",
  "/errors",
  "/brands",
  "/tables",
  "/sync-inbox",
]);

/** Also redirect sub-paths like /intake/new, /intake/123 */
const LEGACY_CUSTOMER_PREFIXES = ["/intake/"];

const OTT_COOKIE = "posterita_ott_session";

function isLegacyCustomerPath(pathname: string): boolean {
  if (LEGACY_CUSTOMER_PATHS.has(pathname)) return true;
  return LEGACY_CUSTOMER_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── OTT handling: validate token in middleware, set cookie, redirect ──
  const ott = request.nextUrl.searchParams.get("ott");
  if (ott) {
    try {
      // Validate OTT server-to-server
      const validateUrl = new URL("/api/auth/ott/validate", request.nextUrl.origin);
      const validateRes = await fetch(validateUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: ott }),
      });

      if (validateRes.ok) {
        const data = await validateRes.json();

        // Redirect to the same path without ?ott, with cookie set
        const cleanUrl = request.nextUrl.clone();
        cleanUrl.searchParams.delete("ott");

        // Apply legacy path redirect for OTT users too
        if (isLegacyCustomerPath(cleanUrl.pathname)) {
          cleanUrl.pathname = cleanUrl.pathname === "/" ? "/customer" : `/customer${cleanUrl.pathname}`;
        }

        const response = NextResponse.redirect(cleanUrl);

        // Set httpOnly cookie with session context (24h expiry)
        response.cookies.set(OTT_COOKIE, JSON.stringify({
          account_id: data.account_id,
          user_id: data.user_id,
          user_role: data.user_role,
          store_id: data.store_id,
          terminal_id: data.terminal_id,
        }), {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: 86400, // 24 hours
          path: "/",
        });

        return response;
      }
    } catch (e) {
      console.error("OTT middleware validation failed:", e);
    }
    // If OTT validation failed, fall through to normal auth check
  }

  // Check if user has a valid OTT cookie (Android WebView session)
  const hasOttCookie = request.cookies.has(OTT_COOKIE);

  // Redirect unauthenticated users to login
  if (
    !user &&
    !hasOttCookie &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/customer/login") &&
    !request.nextUrl.pathname.startsWith("/manager/login") &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    !request.nextUrl.pathname.startsWith("/api")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = request.nextUrl.pathname.startsWith("/manager")
      ? "/manager/login"
      : request.nextUrl.pathname.startsWith("/customer")
      ? "/customer/login"
      : "/login";
    return NextResponse.redirect(url);
  }

  // Legacy path redirects (for both Supabase Auth users and OTT users)
  if (user || hasOttCookie) {
    const url = request.nextUrl.clone();

    if (url.pathname === "/platform") {
      url.pathname = "/manager/platform";
      return NextResponse.redirect(url);
    }

    if (isLegacyCustomerPath(url.pathname)) {
      url.pathname = url.pathname === "/" ? "/customer" : `/customer${url.pathname}`;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
