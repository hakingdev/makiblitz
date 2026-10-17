const isDev = process.env.NODE_ENV === "development";

// Art. 32 DSGVO — restrictive defaults. 'unsafe-inline' is required by
// Next.js hydration/styles; 'unsafe-eval' only by the dev tooling.
// The facebook/meta and Google Ads hosts allow the Meta Pixel and gtag.js to
// load and beacon — but only after consent injects them; the policy itself
// triggers no requests. Google hosts per Google's CSP guide for Ads tags.
const googleAds = [
  "https://www.googletagmanager.com",
  "https://www.googleadservices.com",
  "https://googleads.g.doubleclick.net",
  "https://ad.doubleclick.net",
  "https://www.google.com",
  "https://www.google.de",
];
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://connect.facebook.net ${googleAds.join(" ")}${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://www.facebook.com ${googleAds.join(" ")}`,
  "font-src 'self'",
  // Google Maps on /kontakt — only injected after the visitor clicks "Karte laden";
  // td.doubleclick.net is used by the Google Ads tag.
  "frame-src https://www.google.com https://maps.google.com https://td.doubleclick.net https://www.googletagmanager.com",
  `connect-src 'self' https://www.facebook.com https://connect.facebook.net ${googleAds.join(" ")} https://pagead2.googlesyndication.com`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // The former photo page is now part of /galerie.
    return [{ source: "/restaurant", destination: "/galerie", permanent: true }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
