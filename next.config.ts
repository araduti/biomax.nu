import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: "standalone",
  // Allow access to Next.js dev resources (HMR, JS bundles) from LAN hosts.
  // Without this, Next.js 16 blocks the JS bundles cross-origin, the page
  // renders without React hydration, and forms fall back to default browser
  // submission (PUTTING PASSWORDS IN THE URL BAR — never again).
  allowedDevOrigins: [
    "10.12.10.14",
    "127.0.0.1",
    "*.local",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    qualities: [75, 85, 90],
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
