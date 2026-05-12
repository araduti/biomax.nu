import Script from "next/script";

/**
 * Plausible analytics — privacy-first, EU-hosted, no cookies and therefore no
 * consent banner required for it specifically. We mount the script tag here so
 * it loads on every page in the app router, but only when configured.
 *
 * Env vars (all optional — missing any = analytics off):
 *   NEXT_PUBLIC_PLAUSIBLE_DOMAIN — domain registered in your Plausible account
 *     (e.g. "biomax.nu"). Required.
 *   NEXT_PUBLIC_PLAUSIBLE_SCRIPT — defaults to "script.js" (basic plan).
 *     Override with e.g. "script.outbound-links.tagged-events.js" to enable
 *     plugin extensions; see https://plausible.io/docs/script-extensions.
 *   NEXT_PUBLIC_PLAUSIBLE_HOST — defaults to "https://plausible.io".
 *     Override if self-hosting or using a custom CNAME for ad-blocker resilience.
 */
export function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;

  const scriptName =
    process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT ?? "script.outbound-links.js";
  const host =
    process.env.NEXT_PUBLIC_PLAUSIBLE_HOST ?? "https://plausible.io";

  return (
    <Script
      src={`${host}/js/${scriptName}`}
      data-domain={domain}
      strategy="afterInteractive"
      defer
    />
  );
}
