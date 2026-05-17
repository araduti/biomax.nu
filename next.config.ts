import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/**
 * Security headers applied to every response.
 *
 * CSP is the load-bearing one. We allow:
 *   - `self` for our own scripts/styles/connects
 *   - `'unsafe-inline'` for styles only (Tailwind v4 + JSON-LD inline tags
 *     require it; nonces would need a middleware that we can add later if
 *     CSP grading becomes a priority)
 *   - Plausible + Klarna + Brevo CDN domains for legitimate third-party loads
 *   - `data:` for inline SVGs / fonts we render via `data:` URLs
 *   - frame-ancestors none → blocks clickjacking
 *
 * HSTS only kicks in over HTTPS; harmless in dev.
 */
// Turbopack / React Fast Refresh use eval() in dev only; production
// bundles never do, and no third party we load (Plausible, Klarna,
// Kustom) requires it. So `'unsafe-eval'` is dev-only — removing it
// from the production CSP restores script-src as a real XSS control.
const IS_PROD = process.env.NODE_ENV === "production";

const SECURITY_HEADERS: { key: string; value: string }[] = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // Disable powerful features we never use. Lock down the surface.
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Tailwind v4 emits inline <style> on RSC streaming. `unsafe-inline`
      // is the realistic option for styles short of nonce middleware.
      // api.fontshare.com serves the General Sans @font-face stylesheet
      // (Direction D admin UI font — no exact Google equivalent).
      "style-src 'self' 'unsafe-inline' https://api.fontshare.com",
      // Scripts: self + Plausible + Klarna on-site messaging. `unsafe-inline`
      // for the JSON-LD <script type="application/ld+json"> tags we render
      // server-side. (LD-JSON isn't executable JS so the practical risk is
      // tiny; future hardening: SHA hashes per ld+json block.)
      // `'unsafe-eval'` is dev-only (Turbopack/Fast Refresh) — never prod.
      `script-src 'self' 'unsafe-inline'${IS_PROD ? "" : " 'unsafe-eval'"} https://plausible.io https://*.klarna.com https://x.klarnacdn.net https://*.kustom.co`,
      "img-src 'self' data: blob: https://images.unsplash.com https://*.klarnacdn.net https://*.kustom.co",
      // cdn.fontshare.com hosts the General Sans woff2 files referenced
      // by the api.fontshare.com stylesheet above.
      "font-src 'self' data: https://cdn.fontshare.com",
      "connect-src 'self' https://plausible.io https://*.sentry.io https://*.klarna.com https://api.brevo.com https://*.kustom.co",
      "frame-src 'self' https://*.klarna.com https://*.kustom.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // Hide the floating "N" build-activity pill in the bottom-right corner
  // of every dev page. It overlapped the admin's sticky bulk-action
  // toolbar and the publish rail on /admin/produkter/[slug], and it's
  // of no use during regular admin work — when we actually need to see
  // dev-build state we read the terminal.
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
  // Allow access to Next.js dev resources (HMR, JS bundles) from LAN hosts.
  // Without this, Next.js 16 blocks the JS bundles cross-origin, the page
  // renders without React hydration, and forms fall back to default browser
  // submission (PUTTING PASSWORDS IN THE URL BAR — never again).
  // Derive the dev tunnel host from KUSTOM_MERCHANT_BASE_URL (the
  // HTTPS tunnel we already point Kustom at) so it stays correct
  // across ngrok restarts instead of hardcoding a rotating host.
  allowedDevOrigins: [
    "10.12.10.14",
    "127.0.0.1",
    "*.local",
    ...(() => {
      try {
        const h = process.env.KUSTOM_MERCHANT_BASE_URL;
        return h ? [new URL(h).hostname] : [];
      } catch {
        return [];
      }
    })(),
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    // AVIF first: for photographic hero/product imagery it delivers
    // noticeably cleaner gradients and foliage than WebP at equal or
    // smaller byte size. WebP kept as fallback for older clients.
    formats: ["image/avif", "image/webp"],
    // Adds a 2560 step and keeps the 3840 ceiling so wide high-DPR
    // displays get a candidate close to their device-pixel width
    // instead of upscaling a 1920 source.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2560, 3840],
    // 82 is the LCP-tuned setting for product hero images — see
    // components/product/product-hero.tsx for the trade-off rationale.
    qualities: [75, 82, 85, 90],
    minimumCacheTTL: 31536000,
  },
  experimental: {
    serverActions: {
      // Default is 1 MB which fails any decent product photo. Our admin
      // image-upload action already caps the file at MAX_BYTES = 10 MB
      // (lib/admin/image-actions.ts) so 12 MB here leaves room for FormData
      // overhead without letting larger blobs reach the action layer.
      bodySizeLimit: "12mb",
    },
  },
};

// Wrap with Sentry config — only does meaningful work at build time when
// SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT are all set (CI / prod).
// Otherwise we export the bare config so dev builds stay fast.
const sentryEnabled =
  !!process.env.SENTRY_AUTH_TOKEN &&
  !!process.env.SENTRY_ORG &&
  !!process.env.SENTRY_PROJECT;

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      // Auth token (NEVER commit) gates source-map upload.
      authToken: process.env.SENTRY_AUTH_TOKEN,
      // Source maps upload to Sentry (so stack traces are readable in their
      // UI) but stay out of the public bundle. `widenClientFileUpload` makes
      // sure our turbopack bundle paths get included.
      sourcemaps: { disable: false },
      widenClientFileUpload: true,
      silent: !process.env.CI,
      // Auto-instrument server functions so the request timeline in Sentry
      // is meaningful out of the box.
      autoInstrumentServerFunctions: true,
      autoInstrumentMiddleware: true,
      disableLogger: true,
    })
  : nextConfig;
