#!/usr/bin/env -S npx tsx

/**
 * One-shot: grant a service account Owner access to biomax.nu in
 * Google Search Console via DNS TXT verification.
 *
 * Why this exists
 * ───────────────
 * GSC's "Add User" dialog rejects service-account emails when the
 * shared-from Google account isn't allowed to share Drive/Workspace
 * with external principals. The documented workaround is to make the
 * service account itself a *verified owner* via the Site Verification
 * API — DNS TXT record, no human in the middle.
 *
 * Once the service account is a verified owner of the domain, it has
 * full read access to every GSC property under that domain (Domain
 * property AND URL-prefix property), which is everything our
 * /admin/seo surface needs.
 *
 * Usage
 * ─────
 *   # Step 1 — get the token. Adds an unverified ownership claim and
 *   # prints the DNS TXT record you need to publish.
 *   npx tsx scripts/gsc-verify-service-account.ts get-token \
 *     --key ./biomax-gsc-xxxx.json \
 *     --domain biomax.nu
 *
 *   # Step 2 — add the printed `google-site-verification=...` record
 *   # as a TXT record at the root of biomax.nu in your DNS provider.
 *   # Wait until `dig +short TXT biomax.nu` returns it (usually 1-5 min).
 *
 *   # Step 3 — complete verification.
 *   npx tsx scripts/gsc-verify-service-account.ts verify \
 *     --key ./biomax-gsc-xxxx.json \
 *     --domain biomax.nu
 *
 *   # Step 4 — add the property to the service account's Search
 *   # Console list. Verification grants ownership; this step makes the
 *   # property *queryable* by the service account. Run once per property
 *   # URL you want to read from (Domain + URL-prefix are separate).
 *   npx tsx scripts/gsc-verify-service-account.ts add-site \
 *     --key ./biomax-gsc-xxxx.json \
 *     --site 'sc-domain:biomax.nu'
 *
 *   npx tsx scripts/gsc-verify-service-account.ts add-site \
 *     --key ./biomax-gsc-xxxx.json \
 *     --site 'https://www.biomax.nu/'
 */

import fs from "node:fs";
import { JWT } from "google-auth-library";

const SCOPES = [
  "https://www.googleapis.com/auth/siteverification",
  "https://www.googleapis.com/auth/webmasters",
];

type Args = {
  command: string;
  key: string;
  domain: string;
  site: string;
};

function parseArgs(): Args {
  const a = process.argv.slice(2);
  const command = a[0] ?? "";
  const key = pick(a, "--key");
  const domain = pick(a, "--domain");
  const site = pick(a, "--site");
  if (!command || !key) {
    console.error(
      "Usage:\n" +
        "  gsc-verify-service-account.ts get-token  --key <path.json> --domain <example.com>\n" +
        "  gsc-verify-service-account.ts verify     --key <path.json> --domain <example.com>\n" +
        "  gsc-verify-service-account.ts add-site   --key <path.json> --site '<sc-domain:example.com or https://www.example.com/>'"
    );
    process.exit(1);
  }
  if ((command === "get-token" || command === "verify") && !domain) {
    console.error("Missing --domain");
    process.exit(1);
  }
  if (command === "add-site" && !site) {
    console.error("Missing --site");
    process.exit(1);
  }
  return { command, key, domain, site };
}

function pick(a: string[], flag: string): string {
  const i = a.indexOf(flag);
  return i >= 0 && a[i + 1] ? a[i + 1]! : "";
}

async function authedFetch(
  key: string,
  url: string,
  init?: RequestInit
): Promise<Response> {
  const creds = JSON.parse(fs.readFileSync(key, "utf8"));
  const jwt = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: SCOPES,
  });
  const { token } = await jwt.getAccessToken();
  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

async function getToken({ key, domain }: Args) {
  const res = await authedFetch(
    key,
    "https://www.googleapis.com/siteVerification/v1/token",
    {
      method: "POST",
      body: JSON.stringify({
        verificationMethod: "DNS_TXT",
        site: { type: "INET_DOMAIN", identifier: domain },
      }),
    }
  );
  if (!res.ok) {
    console.error("Failed:", res.status, await res.text());
    process.exit(1);
  }
  const json = (await res.json()) as { token: string };
  console.log("\n✓ Verification token received.\n");
  console.log("Add this as a TXT record at the root of your domain:\n");
  console.log(`  Name:  @  (or blank — i.e. ${domain} itself, no subdomain)`);
  console.log(`  Type:  TXT`);
  console.log(`  Value: ${json.token}`);
  console.log(`  TTL:   300  (or whatever your DNS host's minimum is)\n`);
  console.log("Then wait for propagation. Check with:");
  console.log(`  dig +short TXT ${domain}\n`);
  console.log(
    "When you see the value in dig output, re-run this script with `verify`."
  );
}

async function verify({ key, domain }: Args) {
  const res = await authedFetch(
    key,
    `https://www.googleapis.com/siteVerification/v1/webResource?verificationMethod=DNS_TXT`,
    {
      method: "POST",
      body: JSON.stringify({
        site: { type: "INET_DOMAIN", identifier: domain },
      }),
    }
  );
  if (!res.ok) {
    console.error("Verification failed:", res.status, await res.text());
    console.error(
      "\nLikely causes: TXT record not yet propagated (wait 5 more min) or wrong value.\n"
    );
    process.exit(1);
  }
  const json = (await res.json()) as { owners?: string[] };
  console.log("\n✓ Service account is now a verified owner of", domain);
  console.log("  Owners:", json.owners?.join(", ") ?? "(unknown)");
  console.log("\nNext: set production env and restart.");
  console.log(
    `  GSC_PROPERTY=sc-domain:${domain}    # Domain property — preferred`
  );
  console.log("  GSC_SERVICE_ACCOUNT_KEY=<entire JSON file contents>");
}

async function addSite({ key, site }: Args) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    site
  )}`;
  const res = await authedFetch(key, url, { method: "PUT" });
  if (!res.ok) {
    console.error("Failed to add site:", res.status, await res.text());
    console.error(
      "\nLikely causes: service account isn't a verified owner yet (run `verify` first), or the site URL has the wrong format. Domain properties are `sc-domain:example.com`; URL-prefix properties are full URLs with trailing slash."
    );
    process.exit(1);
  }
  console.log(`\n✓ Added ${site} to the service account's Search Console.`);
  console.log("  You can now use this value as GSC_PROPERTY in production env.");
}

async function main() {
  const args = parseArgs();
  if (args.command === "get-token") {
    await getToken(args);
  } else if (args.command === "verify") {
    await verify(args);
  } else if (args.command === "add-site") {
    await addSite(args);
  } else {
    console.error(`Unknown command: ${args.command}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
