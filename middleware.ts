import { NextRequest, NextResponse } from "next/server";

/**
 * Art. 32 DSGVO: enforce HTTPS in production (behind a proxy/load balancer
 * the original scheme arrives via x-forwarded-proto).
 *
 * The former coming-soon gate (COMING_SOON_MODE) is gone — the reservation
 * site is the public site; the variable is no longer read.
 */
export function middleware(req: NextRequest) {
  if (
    process.env.NODE_ENV === "production" &&
    req.headers.get("x-forwarded-proto") === "http"
  ) {
    const url = req.nextUrl.clone();
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/).*)"],
};
