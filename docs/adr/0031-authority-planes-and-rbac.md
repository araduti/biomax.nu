# ADR 0031 — Authority Planes & RBAC (platform owner / tenant / customer)

**Date:** 2026-05-19
**Status:** Proposed
**Related:** ADR 0026 §0 (Ampliosoft owns the platform; Biomax HB is a
tenant), **ADR 0028 D1** (RLS tenant isolation) + **D2** (Better Auth
organization plugin, Watchtower-proven), ADR 0030 (modular monolith),
memory `reference_watchtower_multitenant`

## Context

Slice 1 added tenants. Multi-tenant is not real without an
authorization model — and the current one is single-plane and wrong
for a platform:

- `prisma/schema.prisma`: `UserRole { customer, admin }` — one flat
  global role.
- `lib/admin/guard.ts` `requireAdmin()`: `user.role === "admin"`,
  mandatory 2FA, **no tenant scoping** (an admin is admin of
  *everything*).
- `lib/auth.ts`: only the `twoFactor` plugin — **no `organization`
  plugin**.

In a platform there are **three distinct authority planes**, and
conflating them is a cross-tenant breach waiting to happen:

1. **Platform (Ampliosoft)** — operates *across all tenants*: provision
   /suspend/offboard tenants, billing, platform config, support
   break-glass. This is the **"our own admin page"** — it does not
   exist today.
2. **Tenant (merchant)** — operates *within one tenant only*: the
   shop's products, orders, customers. Has roles *inside* the tenant.
3. **Customer (shopper)** — scoped to one tenant; not staff.

`role=admin` today means plane 2 (shop admin). Plane 1 is net-new and
must never be expressible as "a really powerful tenant admin".

## Decision

### D1 — Three planes, modelled separately (never one role ladder)

| Plane | Subject | Scope | Surface |
|---|---|---|---|
| **Platform** | Ampliosoft staff | ALL tenants (cross) | `admin.kine.se` (separate host) |
| **Tenant** | merchant staff | exactly one tenant | `{shop}.kine.se/admin` |
| **Customer** | shopper | one tenant | `{shop}.kine.se/konto` |

A user is *either* platform staff *or* tenant staff for a given
context — never both implicitly. A platform admin is **not** an
implicit tenant admin and vice versa; acting inside a tenant as
platform staff is an explicit, audited break-glass (D4).

### D2 — Tenant plane: Better Auth `organization` plugin (port Watchtower)

Per ADR 0028 D2: Organization 1:1 `Tenant`; `member.role` ∈ a small
fixed set — **`owner` · `admin` · `staff`** — via Better Auth
`organization` plugin + an access-controller (`ac`/roles) exactly like
Watchtower's `watchtowerRoles`. Authorization inside a tenant =
"is a member of *this* tenant with sufficient role", resolved from the
session's active organization → Tenant (Watchtower's
`activeOrganizationId` → workspace mapping). This **fixes the
ADR 0028 finding** that `requireAdmin()` has no tenant check.

### D3 — Platform plane: a separate, minimal, high-trust model

Platform staff are few and high-trust. Model as an explicit
**`PlatformAdmin`** record (userId + `platformRole` ∈ `superadmin` ·
`support`), **not** a `User.role` value and **not** an org membership.
Rationale: it must be impossible for a tenant-side role change to ever
grant platform power, and platform power must be greppable/auditable in
one table. Surface lives on a **separate host** (`admin.kine.se`) with
its own guard `requirePlatformAdmin()`. Mandatory 2FA (reuse the
existing posture in `guard.ts`). `support` is read-mostly + scoped
actions; `superadmin` is full.

### D4 — Cross-tenant access is explicit, escalated, and audited

Platform actions run *across* tenants, which means they must
deliberately step outside the ADR 0028 D1 RLS tenant context. This is
the single most dangerous capability in the system, so:

- Cross-tenant reads/writes go through an explicit
  platform-context that uses the **already-designed `SECURITY DEFINER`
  / BYPASSRLS** path (ADR 0028) — never ambient, never the default.
- Every cross-tenant action writes an `AdminAuditEntry` with
  `actorId` + target `tenantId` + action (ADR 0028's audit gap fix
  applies here first).
- "Act as tenant" (support break-glass) is time-boxed, reason-required,
  and logged as platform action, not silent tenant impersonation.

### D5 — Migration of the existing flat role (no overnight break)

1. Add `PlatformAdmin`, `Organization`/`member` (Better Auth), keep
   `UserRole` temporarily.
2. Backfill: the biomax tenant gets an `Organization`; existing
   `role=admin` users become biomax **`owner`/`admin` members**. The
   *actual Ampliosoft operators* are additionally inserted into
   `PlatformAdmin` (explicit, hand-picked — not derived from
   `role=admin`).
3. Introduce `requirePlatformAdmin()` and `requireTenantRole(min)`;
   migrate `/admin/*` call sites from `requireAdmin()` to
   `requireTenantRole("admin")`, and stand up `admin.kine.se` behind
   `requirePlatformAdmin()`.
4. Once all call sites move, `UserRole.admin` is retired (kept only as
   a dead column until a later cleanup migration).

### D6 — What the platform admin page does (scope, v1)

Tenant lifecycle (ADR 0030 D6): list/create/suspend/resume/offboard
tenants; per-tenant status + plan; impersonate-with-audit (D4);
platform-wide audit log; integration-credential management per tenant
(ADR 0028 D4). **Not** in v1: billing UI, analytics dashboards — scope
discipline (ADR 0026 §8 spirit).

## Consequences

**Positive**
- Cross-tenant breach via role confusion is structurally impossible:
  platform power lives in one explicit table, gated on a separate
  host, audited, and orthogonal to tenant roles.
- Fixes the real `requireAdmin()` no-tenant-scope hole as a side effect
  of D2.
- Aligns with ADR 0026 §0 (Ampliosoft ≠ a privileged Biomax) and the
  Watchtower org pattern (proven, ported, not invented).

**Negative / risk**
- Touches every `/admin/*` guard + the auth config — invasive but
  mechanical (D5 staged so nothing breaks overnight).
- The platform plane is the crown-jewel attack surface. Mandatory 2FA,
  separate host, least privilege, full audit, and break-glass-not-
  impersonation are non-negotiable, not later polish.
- Better Auth `organization` plugin is new to this codebase (proven in
  Watchtower; the port is the work, not the unknown — ADR 0028 D2).

## Open questions

- `PlatformAdmin` as its own table vs a Better Auth "platform org" with
  reserved roles — lean table (D3 rationale); confirm against
  Watchtower's actual platform-side pattern before building.
- Does `admin.kine.se` get its own Better Auth instance/cookie domain,
  or shared session with host-based guard? (Security review before
  build — cookie scoping across `*.kine.se` matters.)
- Sequencing: D2 (org plugin) is shared with the ADR 0028 D1/D2
  increment — build once, together, not twice.
