import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, isValidSessionCookieValue } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const username = process.env.SITE_USERNAME;
  const password = process.env.SITE_PASSWORD;

  // Auth isn't configured — don't lock anyone out (matches CRON_SECRET's
  // opt-in behavior for the check-prices endpoint).
  if (!username || !password) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (isValidSessionCookieValue(cookie)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // /api is protected separately by CRON_SECRET and isn't meant to redirect
  // to an HTML login page (it's a JSON endpoint hit by curl/Netlify).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};
