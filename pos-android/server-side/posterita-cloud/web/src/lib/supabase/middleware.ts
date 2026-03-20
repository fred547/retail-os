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
  "/settings",
]);

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

  // Redirect unauthenticated users to login
  if (
    !user &&
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

  if (user) {
    const url = request.nextUrl.clone();

    if (url.pathname === "/platform") {
      url.pathname = "/manager/platform";
      return NextResponse.redirect(url);
    }

    if (LEGACY_CUSTOMER_PATHS.has(url.pathname)) {
      url.pathname = url.pathname === "/" ? "/customer" : `/customer${url.pathname}`;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
