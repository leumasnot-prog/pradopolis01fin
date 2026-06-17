import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Exclude static assets, files and auth api routes
  if (
    pathname.startsWith("/_next") || 
    pathname.startsWith("/static") ||
    pathname.includes(".") || // files like favicon.ico, pdf, etc.
    pathname.startsWith("/api/auth") // allow auth API endpoints
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = await verifySession(token);

  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (!session) {
    // If not authenticated and not on an auth page, redirect to login
    if (!isAuthPage) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  } else {
    // If authenticated and on an auth page, redirect to home
    if (isAuthPage) {
      const homeUrl = new URL("/", request.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|estudo-receitas2026.pdf).*)"],
};
