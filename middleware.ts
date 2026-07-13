import { NextRequest, NextResponse } from "next/server";

/**
 * Coming-soon gate: while COMING_SOON_MODE is on, every route is rewritten
 * to the /coming-soon page. Flip the env var to "false" (and restart/redeploy)
 * to bring the shop back — no code changes needed.
 */

const ALLOWED_PATHS = new Set([
  "/coming-soon",
  "/impressum",
  "/datenschutz",
  "/confirm",
  "/danke",
  "/abmelden",
  "/api/subscribe",
  "/api/confirm",
  "/api/unsubscribe",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
]);

function comingSoonEnabled(): boolean {
  const flag = (process.env.COMING_SOON_MODE ?? "").trim().toLowerCase();
  // Fail safe: the unfinished shop stays hidden unless explicitly disabled.
  return flag !== "false" && flag !== "0";
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Art. 32 DSGVO: enforce HTTPS in production (behind a proxy/load balancer
  // the original scheme arrives via x-forwarded-proto).
  if (
    process.env.NODE_ENV === "production" &&
    req.headers.get("x-forwarded-proto") === "http"
  ) {
    const url = req.nextUrl.clone();
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  if (!comingSoonEnabled()) {
    // Shop mode: direct hits on the stub go back to the homepage.
    if (pathname === "/coming-soon") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  const allowed =
    ALLOWED_PATHS.has(pathname) ||
    pathname.startsWith("/_") || // /_next/*, framework internals
    pathname.startsWith("/opengraph-image") || // generated OG image route
    pathname.startsWith("/twitter-image") ||
    /\.[a-zA-Z0-9]+$/.test(pathname); // static files from /public

  if (allowed) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/coming-soon";
  url.search = "";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/).*)"],
};
