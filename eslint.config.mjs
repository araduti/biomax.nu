import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Standalone design prototypes / reference mockups — not part of
    // the app build (loose .jsx with undefined demo components).
    "**/Design/**",
    // Tooling state: spawned-task git worktrees are full repo copies;
    // never lint them as part of the main tree.
    ".claude/**",
  ]),
  {
    // The React-Compiler advisory rules (eslint-plugin-react-hooks
    // recommended-latest) flag widespread pre-existing patterns
    // (setState in a mount effect, etc.). Useful signal, but not worth
    // a broad risky effect refactor or a red merge gate — keep them as
    // warnings so drift stays visible without blocking.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
    },
  },
  {
    // ── Kine tenant data-access enforcement (ADR 0032 D2/D4) +
    //    Zod v4 only (ADR 0035) ──
    //
    // Both rule families live in one block because ESLint flat-config
    // resolves `no-restricted-syntax` by last-matching-block-wins (the
    // selector arrays do not merge across blocks). Splitting them
    // silently neutered whichever was declared first for any file
    // matched by both — exactly the trap that hid the tenant rule
    // until the cron-tenant slice surfaced it.
    //
    // Kine tenant rule: direct `prisma.<ownedModel>` and raw
    // `unstable_cache` for tenant data must go through the seam
    // (lib/tenant/db.ts → withTenantRLS) and lib/tenant/cache.ts.
    // Property names are the exact Prisma camelCase accessors of the
    // 32 tenant-owned models — User / Session / Account / Tenant /
    // PlatformAdmin / Organization / telemetry are intentionally NOT
    // listed (not tenant-scoped).
    //
    // Severity: tenant selectors are `warn` so the 3b-2 migration
    // backlog stays visible (CI not blocked). The lock-down (#3f)
    // flips them to `error`. Zod selectors are already `error` —
    // they catch zero callsites today and must stay zero.
    files: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    ignores: [
      "lib/tenant/**",
      "lib/prisma.ts",
      "**/*.test.ts",
      "**/*.integration.test.ts",
    ],
    rules: {
      "no-restricted-syntax": [
        "warn",
        // ── Kine tenant seam (ADR 0032 D2) ──
        {
          selector:
            "MemberExpression[object.name='prisma'][property.name=/^(category|product|productIngredient|productVariant|productCrossSell|review|blogCategory|blogPost|order|orderItem|address|wishlist|wishlistProduct|coupon|siteSetting|newsletterSubscriber|cartSnapshot|bundle|bundleItem|ingredientPin|homepageBlock|stockNotificationRequest|consentEvent|subscription|subscriptionLine|return|returnItem|homepageHero|loyaltyAccount|loyaltyTransaction|redirect|adminAuditEntry|tenantPaymentCredential)$/]",
          message:
            "Tenant-owned model accessed directly on `prisma`. Route it through lib/tenant/db.ts (tenantScope/currentTenantScope/hostTenantScope). ADR 0032 D2.",
        },
        // ── Zod v4 only (ADR 0035) ──
        // NOTE: the tenant-rule severity above is `warn`. ESLint
        // applies one severity per rule entry, so the Zod selectors
        // inherit `warn` here even though we want them at `error`.
        // CI catches them via the dedicated Zod block below (same
        // selector list, scoped to all *.ts/*.tsx, severity error)
        // — duplication is intentional to satisfy both severities
        // without flat-config rule-replacement collisions.
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name=/^(email|url|uuid|cuid|cuid2|ulid|nanoid|emoji|ipv4|ipv6|cidr|base64|base64url|datetime|date|time|duration)$/][callee.object.type='CallExpression'][callee.object.callee.type='MemberExpression'][callee.object.callee.object.name='z'][callee.object.callee.property.name='string']",
          message:
            "Zod v3 string-method format is banned. Use the top-level constructor (z.email(), z.uuid(), z.iso.datetime(), …). ADR 0035.",
        },
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='passthrough'][arguments.length=0]",
          message:
            "z.object().passthrough() is v3 surface. Use z.looseObject({…}) (ADR 0035).",
        },
        {
          selector:
            "Property[key.name='errorMap'][computed=false][shorthand=false]",
          message:
            "`errorMap:` is v3 schema-options surface. Use the v4 `error:` function/string (ADR 0035).",
        },
      ],
      "no-restricted-imports": [
        "warn",
        {
          paths: [
            {
              name: "next/cache",
              importNames: ["unstable_cache"],
              message:
                "Use tenantCache() from lib/tenant/cache.ts — a global cache key is cross-tenant poisoning. ADR 0032 D4.",
            },
          ],
        },
      ],
    },
  },
  {
    // ── Zod v4 only (ADR 0035), error severity, repo-wide ──
    //
    // Mirrors the Zod selectors in the block above at `error`
    // severity. The combined block scopes them to app/** + lib/**
    // at `warn` (because tenant selectors share that severity).
    // This block catches everything else (scripts/, components/,
    // prisma/seeds/, ...) AND elevates the same Zod selectors to
    // hard-fail CI inside app/ + lib/.
    //
    // ESLint flat-config behaviour we're relying on: when two blocks
    // both declare `no-restricted-syntax`, the LATER block's array
    // wins entirely for files matched by both — so the tenant-seam
    // selector here would be dropped. We DON'T re-declare the tenant
    // selector at error severity because the lock-down (#3f) will
    // do that as one atomic change, not in this slice.
    files: ["**/*.{ts,tsx}"],
    ignores: [
      "app/**",
      "lib/**",
      "**/*.test.ts",
      "**/*.integration.test.ts",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name=/^(email|url|uuid|cuid|cuid2|ulid|nanoid|emoji|ipv4|ipv6|cidr|base64|base64url|datetime|date|time|duration)$/][callee.object.type='CallExpression'][callee.object.callee.type='MemberExpression'][callee.object.callee.object.name='z'][callee.object.callee.property.name='string']",
          message:
            "Zod v3 string-method format is banned. Use the top-level constructor (z.email(), z.uuid(), z.iso.datetime(), …). ADR 0035.",
        },
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='passthrough'][arguments.length=0]",
          message:
            "z.object().passthrough() is v3 surface. Use z.looseObject({…}) (ADR 0035).",
        },
        {
          selector:
            "Property[key.name='errorMap'][computed=false][shorthand=false]",
          message:
            "`errorMap:` is v3 schema-options surface. Use the v4 `error:` function/string (ADR 0035).",
        },
      ],
    },
  },
]);

export default eslintConfig;
