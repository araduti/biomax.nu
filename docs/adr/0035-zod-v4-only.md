# ADR 0035 — Zod v4 only (no v3 API surface)

**Date:** 2026-05-20
**Status:** Accepted — enforced by ESLint rule + dep pin.
**Related:** ADR 0032 (validation lives at the trust boundary; one
shared schema seam in `lib/validation/shared.ts`). Code:
`package.json` (`zod ^4.4.3`), `eslint.config.mjs`
(`no-restricted-syntax` block "Zod v4 only"), `lib/validation/shared.ts`
(canonical example).

## Context

Every server action, route handler, and cross-trust-boundary helper
parses untrusted input through Zod. Zod 4 is not an incremental release
— it is a near-rewrite with material runtime and API differences from
v3:

- **Top-level format constructors.** `z.email()`, `z.url()`, `z.uuid()`,
  `z.cuid()`, `z.cuid2()`, `z.ulid()`, `z.nanoid()`, `z.ipv4()`,
  `z.ipv6()`, `z.cidrv4()`, `z.cidrv6()`, `z.base64()`, `z.base64url()`,
  `z.emoji()`, `z.iso.datetime()`, `z.iso.date()`, `z.iso.time()`,
  `z.iso.duration()`. The v3 string-method forms (`z.string().email()`
  etc.) are deprecated / removed.
- **Issue model.** `ZodError.errors` is gone; the field has always been
  called `issues`. v4 makes it the only accessor.
- **Error customisation.** v3's `errorMap:` option is replaced by a
  unified `error:` function (or string).
- **Error formatting.** `error.format()` and `error.flatten()` give
  way to `z.treeifyError(err)` / `z.prettifyError(err)` /
  `z.flattenError(err)`.
- **Object modes.** `.passthrough()` is replaced by `z.looseObject({})`;
  default object behaviour and `.strict()` / `.strip()` semantics
  tightened.
- **Record signature.** `z.record(K, V)` now requires the key schema —
  the single-arg v3 form is gone.
- **Performance.** v4's parser is several×faster on hot paths
  (checkout, cron, GDPR core). We see no point shipping a v3 polyfill
  surface while paying the v3 codepath cost.

Better Auth `^1.6.10` and every other dep in our tree already resolves
to `zod@4.4.3` (verified via `npm ls zod`: a single resolved version
across the graph). The runtime is v4 today. What we are *not* yet
guaranteed against is **silent re-introduction of v3-shape code** by
agents, contractors, or copy-pasted snippets — Zod's older API still
"compiles" in v4 for some surfaces (it returns the underlying string
schema and the chained method is undefined at the type level, but the
agent that wrote it won't notice if they don't run `tsc`).

This ADR turns that intent into a guardrail.

## Decision

**Zod v4 is the only supported version of Zod in this codebase.** v3
API surface is banned in source even where v4 still tolerates it.

### D1 — Dep pin

- `package.json` pins `zod` to a v4 caret range. A v3 lockfile entry
  fails CI by virtue of `npm ls zod` resolving to a non-4 version.
- Transitive v3 demands (e.g. an older `better-auth`) are not
  accommodated; we either upgrade the offender or fork.

### D2 — Banned API surface (ESLint)

`eslint.config.mjs` ships a `no-restricted-syntax` block — error, not
warning — that flags the following member-expression patterns on a
chain rooted at `z.string()`:

- `.email()` `.url()` `.uuid()` `.cuid()` `.cuid2()` `.ulid()`
  `.nanoid()` `.emoji()` `.ipv4()` `.ipv6()` `.cidr()` `.base64()`
  `.base64url()` `.datetime()` `.date()` `.time()` `.duration()`
- And the global pattern `.passthrough()` chained on any object schema
  builder.

Plus a literal-key scan for `errorMap:` inside object literals (v3
schema options shape).

Each rule's `message` names ADR 0035 and the v4 replacement (e.g.
"`z.string().email()` is v3 surface — use `z.email()` (ADR 0035)").

### D3 — Canonical example

`lib/validation/shared.ts` is the seam every other file copies from.
It is rewritten to use the modern constructors so reviewers have a
v4-shaped reference next to the lint rule:

- `emailSchema` uses `.trim().toLowerCase().max(320).pipe(z.email(…))`
  — `.pipe()` is the v4-canonical "transform then validate" idiom.
- `cuidSchema` collapses the v3-era min/max/regex chain into a single
  `z.cuid("Ogiltigt id.")` (Prisma's `@default(cuid())` produces v1
  cuids).

### D4 — Out of scope

This ADR is **not** a refactor mandate. The current codebase passed
the audit (`grep` for every banned pattern returned zero hits). The
ESLint rule is purely a regression guard against future v3 re-entry.

## Consequences

**Good**
- v3 patterns can't be merged silently; the rule fires at PR time.
- One Zod version in the dep graph (no v3↔v4 dual-resolution madness).
- `shared.ts` becomes a useful template — agents copying from it
  produce v4-shaped code by default.

**Risk**
- A new dep that demands `zod@^3.x` will break `npm install`. That is
  the intended behaviour; the resolution is to upgrade the dep or
  pick an alternative.
- `errorMap:` literal-key lint can false-positive on unrelated
  identifiers (e.g. a `map` of errors). The rule scopes to property
  positions in object expressions, but if it ever bites we narrow the
  selector — we do **not** broaden the allowance.
- Some Zod-adjacent libraries (e.g. `zod-validation-error`) have a v3
  major and a v4 major; pin to the v4 major explicitly when adopting.

## Verification

- `npm ls zod` shows exactly one resolved version, `4.x`.
- `npm run lint` exits 0 on the current tree (no banned patterns
  present) and exits ≠0 on a planted `z.string().email()` smoke test.
- `npx tsc --noEmit` clean after the `shared.ts` rewrite.
