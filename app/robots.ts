import type { MetadataRoute } from "next";

const SITE = "https://www.biomax.nu";

/**
 * Robots policy. Public surfaces are open to all crawlers — including LLM
 * training crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) — so
 * the editorial knowledge base shows up in AI search and ChatGPT/Claude/
 * Perplexity citations. Auth and checkout surfaces stay private.
 *
 * Note: AI-bots respect different headers than classic crawlers. Allowing
 * them is a deliberate marketing decision (cited > obscure for a Swedish
 * niche brand). If we ever change posture, narrow the public allow-list
 * to specific user-agents.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = [
    "/admin",
    "/api/",
    "/checkout",
    "/varukorg",
    "/konto",
    "/logga-in",
    "/skapa-konto",
    "/glomt-losenord",
    "/aterstall-losenord",
    "/design",
  ];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      // Explicit allow for the major LLM/AI crawlers — same surface area as
      // generic search bots. Listing them by name documents the policy and
      // gives us a single place to revoke if needed.
      { userAgent: "GPTBot", allow: "/", disallow },
      { userAgent: "ChatGPT-User", allow: "/", disallow },
      { userAgent: "OAI-SearchBot", allow: "/", disallow },
      { userAgent: "ClaudeBot", allow: "/", disallow },
      { userAgent: "Claude-Web", allow: "/", disallow },
      { userAgent: "anthropic-ai", allow: "/", disallow },
      { userAgent: "PerplexityBot", allow: "/", disallow },
      { userAgent: "Perplexity-User", allow: "/", disallow },
      { userAgent: "Google-Extended", allow: "/", disallow },
      { userAgent: "CCBot", allow: "/", disallow },
      { userAgent: "Applebot-Extended", allow: "/", disallow },
      { userAgent: "Bytespider", allow: "/", disallow },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
