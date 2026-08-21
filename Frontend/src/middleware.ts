import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // app.exofe.com is the dashboard app, exofe.com is the marketing site
  // — same deployment, split by hostname. Root visits to the app
  // subdomain land on the dashboard; the dashboard layout's own auth
  // check takes it from there (bounces to /login if there's no token).
  if (request.nextUrl.hostname === "app.exofe.com" && request.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/dashboard", request.url));
  }

  // Keep the admin panel out of search results even if a page ever gets
  // linked/crawled — robots.txt alone only stops crawling, not indexing of
  // an already-discovered URL.
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/"],
};
