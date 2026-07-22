import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Keep the admin panel out of search results even if a page ever gets
// linked/crawled — robots.txt alone only stops crawling, not indexing of
// an already-discovered URL.
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: "/admin/:path*",
};
