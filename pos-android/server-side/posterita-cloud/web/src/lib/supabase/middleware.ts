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
  "/stations",
  "/tills",
  "/inventory",
  "/catalogue",
  "/sync-inbox",
  "/serial-items",
  "/deliveries",
  "/loyalty",
  "/shifts",
  "/suppliers",
  "/purchase-orders",
  "/promotions",
  "/menu-schedules",
  "/tags",
  "/store-layout",
  "/integrations",
  "/tower",
]);

/** Also redirect sub-paths like /intake/new, /intake/123, /inventory/new, /inventory/123 */
const LEGACY_CUSTOMER_PREFIXES = ["/intake/", "/inventory/", "/serial-items/"];

const OTT_COOKIE = "posterita_ott_session";

function isLegacyCustomerPath(pathname: string): boolean {
  if (LEGACY_CUSTOMER_PATHS.has(pathname)) return true;
  return LEGACY_CUSTOMER_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const pathname = request.nextUrl.pathname;
  requestHeaders.set("x-pathname", pathname);

  // CSRF protection: verify Origin on mutations
  if (pathname.startsWith("/api/") && ["POST", "PATCH", "PUT", "DELETE"].includes(request.method)) {
    const origin = request.headers.get("origin");
    // Allow: same-origin, mobile apps (no origin), and server-to-server (no origin)
    if (origin && !origin.endsWith(".posterita.com") && origin !== "http://localhost:3000" && origin !== "http://localhost:3001") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Skip auth check for API routes — they handle auth themselves
  if (pathname.startsWith("/api")) {
    return supabaseResponse;
  }

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

  // Use getSession() — reads JWT from cookie, no network call (fast for Edge)
  // Server components/API routes do full getUser() validation separately
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

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
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/customer/login") &&
    !pathname.startsWith("/manager/login") &&
    !pathname.startsWith("/auth") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/pos") &&
    pathname !== "/docs"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith("/manager")
      ? "/manager/login"
      : pathname.startsWith("/customer")
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
