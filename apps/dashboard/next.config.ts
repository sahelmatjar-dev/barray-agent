import type { NextConfig } from "next";

// Baseline security headers for every response. CSP here is a pragmatic
// default (allows 'unsafe-inline' for Next.js's own hydration scripts/styles
// since there's no per-request nonce wiring yet — see docs/PRODUCTION_READINESS.md
// for the recommended follow-up) but still blocks third-party script/style/
// image/connect origins and all iframe embedding, which is the bulk of the
// real-world benefit against XSS payload delivery and clickjacking.
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self'",
      "font-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@barray/shared", "@barray/database", "@barray/ai", "@barray/integrations"],
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
