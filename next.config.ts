import type { NextConfig } from "next";

// Content-Security-Policy. Tailored to this app's third parties:
// - Paddle.js checkout: loads its script + opens its overlay in an iframe, and
//   calls back to *.paddle.com (script-src / frame-src / connect-src).
// - R2 images: served from presigned https URLs (img-src https:).
// `'unsafe-inline'`/`'unsafe-eval'` in script-src are required by Next's runtime
// (React hydration + Turbopack); the value still blocks arbitrary external script
// origins and, via frame-ancestors, clickjacking.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.paddle.com https://cdn.paddle.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.paddle.com",
  "frame-src https://*.paddle.com",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Belt-and-suspenders with frame-ancestors for older browsers.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // Force HTTPS for 2 years incl. subdomains. Safe only once the prod origin is
  // fully HTTPS (it is behind Vercel/Cloudflare); ignored over plain-HTTP dev.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // Prisma 7's generated client must not be bundled by Turbopack (avoids the
  // ".prisma/client/default" resolution error).
  serverExternalPackages: ["@prisma/client"],

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
