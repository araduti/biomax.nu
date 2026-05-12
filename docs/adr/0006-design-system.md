# ADR 0006 — Design System

**Date:** 2026-05-10  
**Status:** Deferred

## Context

The design system will define the visual identity, component library, typography, color tokens, spacing scale, and interaction patterns for biomax.nu. This decision has significant long-term consequences and should be made deliberately, grounded in the company's history, brand values, and competitive positioning.

## Decision

**Deferred to a dedicated design system session.**

The session will cover:
- Brand audit: existing visual assets, tone of voice, color history
- Competitive landscape: how Swedish health supplement brands present themselves
- Component library choice: Tailwind-only tokens, shadcn/ui as a base, or fully custom
- Design tokens: CSS custom properties defined in Tailwind v4's `@theme` block
- Typography: font selection, scale, and line-height system
- Color system: primary palette, semantic tokens (success, warning, danger), dark mode consideration
- Motion/interaction: hover states, transitions, reduced-motion support

## What is already in place

- Tailwind CSS v4 is configured with a green (`emerald`) palette in the placeholder homepage.
- `lib/utils.ts` exports `cn()` (clsx + tailwind-merge) — a foundation compatible with both shadcn/ui and a custom system.
- `globals.css` has minimal global resets.

## Consequences

Until this ADR is resolved, new UI work should use the placeholder emerald palette and avoid deeply nesting design decisions that would be expensive to reverse. Component structure (not styling) decisions can proceed.
