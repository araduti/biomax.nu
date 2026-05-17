import { isKlarnaConfigured } from "@/lib/klarna/client";
import { isEmailConfigured } from "@/lib/email/client";
import { isGscConfigured } from "@/lib/integrations/gsc";
import { isUnsplashConfigured } from "@/lib/integrations/unsplash";
import { isPostNordConfigured } from "@/lib/postnord/service-points";
import { isPlausibleConfigured } from "@/lib/integrations/plausible";

/**
 * Snapshot of every external integration the admin needs to know about.
 * Powers the top-of-shell banner that nudges editors to finish setup
 * (e.g. "Klarna stub-läge — riktiga betalningar inaktiverade").
 *
 * Each entry has a `helpHref` so a click jumps to the place to fix it —
 * either the relevant admin surface or a settings anchor.
 */
export type IntegrationStatus = {
  id: string;
  label: string;
  /** True when the env config is present + the integration is live. */
  configured: boolean;
  /** One-line copy explaining what's missing when unconfigured. */
  warningCopy: string;
  helpHref: string;
};

export function getIntegrationStatus(): IntegrationStatus[] {
  return [
    {
      id: "klarna",
      label: "Klarna",
      configured: isKlarnaConfigured(),
      warningCopy:
        "Stub-läge — checkout använder en falsk betalsida, inga riktiga betalningar.",
      helpHref: "/admin/installningar",
    },
    {
      id: "brevo",
      label: "E-post (Brevo)",
      configured: isEmailConfigured(),
      warningCopy:
        "Ej anslutet — orderbekräftelser och nyhetsbrev skickas inte ut.",
      helpHref: "/admin/installningar",
    },
    {
      id: "postnord",
      label: "PostNord",
      configured: isPostNordConfigured(),
      warningCopy:
        "Ej anslutet — kunder kan inte välja ombud i kassan.",
      helpHref: "/admin/installningar",
    },
    {
      id: "gsc",
      label: "Google Search Console",
      configured: isGscConfigured(),
      warningCopy:
        "Ej anslutet — SEO-överblicken visar inte riktig söktrafikdata.",
      helpHref: "/admin/seo",
    },
    {
      id: "unsplash",
      label: "Unsplash",
      configured: isUnsplashConfigured(),
      warningCopy:
        "Ej anslutet — bildsök på hero-redigeraren visar en konfigurations­guide istället.",
      helpHref: "/admin/startsida/hero",
    },
    {
      id: "plausible",
      label: "Plausible",
      configured: isPlausibleConfigured(),
      warningCopy:
        "Ej anslutet — Besök/konvertering på Översikt visar “—” tills Stats-API:t kopplas.",
      helpHref: "/admin",
    },
  ];
}
