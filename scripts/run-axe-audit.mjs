#!/usr/bin/env node
/**
 * Stand-alone a11y audit using axe-core.
 *
 * Drives the same set of representative routes as Lighthouse CI, but with
 * the WCAG-focused axe ruleset. Lighthouse's a11y category is good but
 * axe surfaces more rules and is the industry-standard reference; running
 * both is cheap and catches different things.
 *
 * Usage (CI):
 *   node scripts/run-axe-audit.mjs http://localhost:3000
 *
 * Exits 1 if any "serious" or "critical" violations are found, 0 otherwise.
 * Writes a JSON summary to .lighthouseci/axe-results.json so it lands in
 * the same artefact bundle as the Lighthouse run.
 */
import { mkdir, writeFile } from "node:fs/promises";
import puppeteer from "puppeteer";
import { AxePuppeteer } from "@axe-core/puppeteer";

const BASE = process.argv[2] ?? "http://localhost:3000";

// Only routes that resolve on a freshly-migrated, EMPTY database.
// Dynamic [slug] detail pages (product, ingredient monograph, /kop,
// symptom) need production WordPress data CI never has — they 404/500
// on the empty CI DB and the audited error page produces spurious
// violations. Kept in sync with .lighthouserc.json (see the seed-step
// note + TODO in .github/workflows/lighthouse.yml: re-add detail
// routes once a deterministic CI seed exists).
const ROUTES = [
  "/",
  "/produkter",
  "/kunskap",
  "/om-oss",
  "/faq",
  "/hjalp",
  "/paket",
  "/hjalp-mig-valja",
  "/sok",
];

// Severities axe assigns: minor < moderate < serious < critical.
// Fail the build only on serious + critical — minor/moderate become warnings.
const FAIL_SEVERITIES = new Set(["serious", "critical"]);

async function main() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const summary = {
    base: BASE,
    runAt: new Date().toISOString(),
    routes: [],
    blocking: 0,
    warnings: 0,
  };

  for (const route of ROUTES) {
    const url = BASE.replace(/\/$/, "") + route;
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    let pageResult = { route, error: null, violations: [] };
    try {
      await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
      const results = await new AxePuppeteer(page)
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      pageResult.violations = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.length,
      }));
      for (const v of results.violations) {
        if (FAIL_SEVERITIES.has(v.impact ?? "")) summary.blocking++;
        else summary.warnings++;
      }
    } catch (err) {
      pageResult.error = err.message;
    } finally {
      await page.close();
    }
    summary.routes.push(pageResult);
    console.log(
      `[axe] ${route}: ${pageResult.violations.length} violations` +
        (pageResult.error ? ` (error: ${pageResult.error})` : "")
    );
  }

  await browser.close();
  await mkdir(".lighthouseci", { recursive: true });
  await writeFile(
    ".lighthouseci/axe-results.json",
    JSON.stringify(summary, null, 2)
  );

  console.log(
    `\n[axe] Done. ${summary.blocking} blocking, ${summary.warnings} warnings.`
  );
  process.exit(summary.blocking > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[axe] fatal:", err);
  process.exit(2);
});
