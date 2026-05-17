# Accessibility Review (WCAG 2.1 AA) — biomax.nu

- **Agent:** accessibility-tester
- **Date:** 2026-05-18 · **Commit:** 2fb7538 · **Mode:** read-only (static analysis)

## Summary

**Strong foundation, ~70–75% AA.** Solid semantic HTML, thoughtful landmarks, documented color-contrast discipline, `lang="sv"`. Gaps are in *interactive behavior*: (1) focus indicators on custom widgets, (2) form error association, (3) ARIA for complex widgets, (4) `dangerouslySetInnerHTML` content. Moderate, not critical — but material for the Swedish 45–70+ AT/keyboard demographic and formal audits.

## Strengths

- Proper `<header>/<nav>/<main>/<footer>/<article>`, `lang="sv"`, list-based breadcrumb.
- Tokens enforce AA (4.5:1 body, documented in `globals.css:39–44`); eyebrow darkened to 4.5:1; Trustpilot green `aria-hidden`.
- Input component wraps `<label htmlFor>`, `aria-invalid` + `aria-describedby`, auto-generated error IDs.
- Mobile drawer: Escape-to-close, scroll lock, focus mgmt. Product tabs use `role="tab"`/`aria-selected` + hash sync.
- Global `prefers-reduced-motion` honored (`globals.css:84–94`).
- 44px touch targets; native `<select>` for sort; Next `<Link>` (no onClick-as-link); sanitizer forces `rel="noopener noreferrer"`.

## Findings

### Critical
None in static analysis.

### High
- **1 — Focus indicators missing on custom radio/button widgets.** WCAG 2.4.7. `variant-selector.tsx:63–86`, `buy-options-panel.tsx:92–100`, `behov-nav.tsx:45–65` — `role="radio"`/`role="tab"` buttons lack `:focus-visible`. Add `focus-visible:outline-2/offset-2` or central utility.
- **2 — Product tab panel association fragile.** WCAG 4.1.2. `product-tabs.tsx:85–91` — hardcoded `tab-` id prefix; hidden tabs DOM-removed (valid but document; consider `aria-live` on dynamic change).
- **3 — Ingredient tooltip keyboard access.** WCAG 1.4.13. `ingredient-table.tsx:69–94` — `group-focus-within` present but may clip under `overflow:hidden` on mobile; no dismiss pattern. Verify Tab reveals; mobile-safe fallback.

### Medium
- **4 — Form errors not reliably field-associated.** WCAG 3.3.1. `login-form.tsx:64–71` form-level `role="alert"` not tied to a field. Route through `<Input error>`.
- **5 — Rich-text descriptions bypass a11y checks.** WCAG 1.3.1. Sanitizer strips `<h3>/<h4>` → flat hierarchy; no link-text validation ("här"/"click here"); ol/li nesting untested. Demote headings instead of stripping; warn on bad link text.
- **6 — Mobile drawer focus not trapped.** WCAG 2.1.2. `mobile-nav.tsx:62–145` — Tab can escape to page beneath. Add focus-trap.
- **7 — "Efter behov" dropdown not fully keyboardable.** WCAG 2.1.1. `behov-nav.tsx:43–98` — no arrow/Home/End nav; menuitems are `<Link>`.
- **8 — Buy-options radiogroup lacks descriptive help.** WCAG 1.3.1. `buy-options-panel.tsx:86–110` — discount/interval visual-only; add `aria-describedby`.

### Low
- **9** Breadcrumb — confirm `<ol>` not `<ul>`. **10** Product card alt = name (acceptable, document). **11** Cart icon button — verify `aria-label` incl. count.

## Project Direction

70–75% AA on static analysis; design system is thoughtful, semantics well-applied. Gaps are interactive behavior — fixable in ~5–7 points. Strategic: adopt a focus-trap library; make Input the single source of field validation; document+test keyboard nav for dropdown/variant; lint WordPress import for a11y; add automated a11y (axe/Playwright/Pa11y) in CI. Production-ready for most users but will fail formal audits until keyboard/focus is completed — a material business risk given the 50+ demographic.

## Top 3 Priorities

1. Focus indicators on custom buttons/radios (`variant-selector`, `buy-options-panel`, `behov-nav`, `product-tabs`) — high impact, ~2–3 h.
2. Keyboard nav for "Efter behov" dropdown + variant pills (arrow/Home/End/Escape) — ~4–5 h.
3. Form error association via Input `error` prop everywhere — ~3–4 h.
