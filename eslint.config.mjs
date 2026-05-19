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
    // ── Korg tenant data-access enforcement (ADR 0032 D2/D4) ──
    // Direct `prisma.<ownedModel>` and raw `unstable_cache` for tenant
    // data must go through the seam (lib/tenant/db.ts → withTenantRLS)
    // and lib/tenant/cache.ts. Property names are the exact Prisma
    // camelCase accessors of the 32 tenant-owned models — User /
    // Session / Account / Tenant / PlatformAdmin / Organization /
    // telemetry are intentionally NOT listed (not tenant-scoped).
    //
    // WARNING for now: the 3b-3d migration backlog is intentionally
    // visible (eslint exits 0 on warnings → CI not blocked). The 3b-2
    // lock-down flips both to "error" once every domain routes through
    // the seam — that is the CI guarantee.
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
        {
          selector:
            "MemberExpression[object.name='prisma'][property.name=/^(category|product|productIngredient|productVariant|productCrossSell|review|blogCategory|blogPost|order|orderItem|address|wishlist|wishlistProduct|coupon|siteSetting|newsletterSubscriber|cartSnapshot|bundle|bundleItem|ingredientPin|homepageBlock|stockNotificationRequest|consentEvent|subscription|subscriptionLine|return|returnItem|homepageHero|loyaltyAccount|loyaltyTransaction|redirect|adminAuditEntry)$/]",
          message:
            "Tenant-owned model accessed directly on `prisma`. Route it through lib/tenant/db.ts (tenantScope/currentTenantScope/hostTenantScope). ADR 0032 D2.",
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
    // ── Zod v4 only (ADR 0035) ──
    // The dep is already pinned to ^4 in package.json; this guard
    // stops copy-pasted v3 snippets from re-entering. Each message
    // points at the canonical v4 replacement.
    files: ["**/*.{ts,tsx}"],
    ignores: ["**/*.test.ts", "**/*.integration.test.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          // z.string().email() / .url() / .uuid() / .cuid() / … — v3
          // string-method format constructors.
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name=/^(email|url|uuid|cuid|cuid2|ulid|nanoid|emoji|ipv4|ipv6|cidr|base64|base64url|datetime|date|time|duration)$/][callee.object.type='CallExpression'][callee.object.callee.type='MemberExpression'][callee.object.callee.object.name='z'][callee.object.callee.property.name='string']",
          message:
            "Zod v3 string-method format is banned. Use the top-level constructor (z.email(), z.uuid(), z.iso.datetime(), …). ADR 0035.",
        },
        {
          // .passthrough() — v3 object mode; v4 uses z.looseObject({}).
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='passthrough'][arguments.length=0]",
          message:
            "z.object().passthrough() is v3 surface. Use z.looseObject({…}) (ADR 0035).",
        },
        {
          // errorMap: …  — v3 schema-options key; v4 uses `error:`.
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
