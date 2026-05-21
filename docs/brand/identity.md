# kine — Brand Identity

**Version:** v1 · 2026-05-21
**Status:** Direction-locked. Production-grade refinement (custom letterforms, licensed type, motion specs) deferred to a real designer engagement when GTM Gate 2 fires.

This document is the canonical brand reference. Files in `docs/brand/logos/` and `docs/brand/favicon/` are the source SVGs; this document explains how to use them.

---

## 1. Brand essence

**kine builds the e-commerce platform Swedish small shops actually deserve.**

The name comes from the Greek/Latin root *kine-* meaning *motion* — as in *kinetic*, *kinesis*. The mark visualises that motion: an orbital path with a single node travelling along it. The node is the small merchant; the path is the platform carrying them.

The full positioning lives in `docs/adr/0036-consolidated-bill-of-materials.md`. In one line for the brand:

> The AI-native commerce platform for small Swedish shops — sovereign infrastructure, calm intelligence, built for the people who built their shops by hand.

---

## 2. Voice & tone

**To the merchant:** warm, direct, Swedish. Talk like a competent friend who has built shops before. No jargon. No "synergy." No "leverage." No "leverage your synergies."

**To the investor / partner:** confident, infrastructure-grade, factual. Talk like the company already runs critical systems. Numbers, posture, sovereignty. No hype.

**To the platform itself (internal):** calm intelligence. The product helps, the product does not perform. The AI is the mechanism, not the personality.

---

## 3. The mark

The mark is two concentric arcs and a single node:

- **Inner arc** — forest green, the thicker stroke. The platform foundation. Stable, present, supporting.
- **Outer arc** — sage green, a thinner stroke. The orbital path. The journey the merchant is on.
- **Node** — sage green, on the outer arc. The merchant in motion along the path.
- **Tilt** — the whole mark rotates -120° so the opening points up-and-right (the direction of growth).

**Why an i-stem looks like there is no dot above it:** the i's dot has migrated onto the outer arc. The mark and the wordmark are one concept — you cannot remove either half without breaking the other. The "missing" dot is a feature, not an absence.

### Construction

Local coordinate system, center at origin, before rotation:

```
Inner arc:  R=36, stroke 6,  forest #1B4332, endpoints (±29.5, 20.66)
Outer arc:  R=52, stroke 2.5, sage   #4A7C5C, endpoints (±43, 30)
Node:       cx=43, cy=30, r=5, sage #4A7C5C
Rotation:   -120° around origin
Gap angle:  110° (centered at bottom before rotation)
```

These numbers are exact. Both arc endpoints lie precisely on their respective circles — no SVG silent re-centering.

---

## 4. The wordmark

Lowercase `kine` in **Inter Light 300**, with **letter-spacing -3** (and **-3.8 between i and n**) to close the optical gap that the rounded `n` shoulder creates next to the straight `i`.

### The dotless `i`

The `i` is **NOT a stock keystroke**. It is a custom shape:

- Stem width: 6px at font-size 120 (matches the Inter Light stem of `k`, `n`)
- Stem height: 63-67px (x-height only — clearly shorter than the ascender of `k`, so the eye reads it as `i` not `l`)
- Top edge: subtle diagonal cut sloping up-right (3px slope), suggesting "the dot has lifted off toward the orbital path"

```
polygon points="60,105 66,105 66,38 60,42"
```

(coordinates assume font-size 120 with baseline at y=105)

**This is the single most fragile element in the wordmark.** At thinner weights or smaller sizes the custom stem stops reading. See §7 Minimum Sizes.

---

## 5. Logo system files

All files in `docs/brand/logos/`. Use the SVG masters; export PNG/PDF/ICO only when a specific surface requires it.

| File | Use |
|---|---|
| `kine-lockup.svg` | Primary lockup. Horizontal. Use as the default. |
| `kine-lockup-inverse.svg` | Same, on dark backgrounds. |
| `kine-lockup-stacked.svg` | Vertical lockup for square contexts (social profiles, business cards). |
| `kine-mark.svg` | Mark alone. App icon, favicon source, watermarks. |
| `kine-mark-inverse.svg` | Mark on dark. |
| `kine-wordmark.svg` | Wordmark only. For body copy contexts where the mark would distract. |
| `kine-wordmark-inverse.svg` | Wordmark on dark. |

Favicons in `docs/brand/favicon/` at 32/64/256 — pre-baked for direct use in `<link rel="icon">`.

---

## 6. Colour system

Four colours. Use them in this hierarchy:

| Name | Hex | RGB | Role |
|---|---|---|---|
| **Forest** | `#1B4332` | `27, 67, 50` | Primary ink. 90% of all type. Inner arc. |
| **Sage** | `#4A7C5C` | `74, 124, 92` | Orbital path (outer arc). Accent dot. Sparingly elsewhere. |
| **Sand** | `#E8DFC8` | `232, 223, 200` | Secondary surfaces. Card borders, dividers. Replaces sage on dark backgrounds when sage would lack contrast. |
| **Paper** | `#F8F5F0` | `248, 245, 240` | Primary canvas. Light-mode background. Inverse-mode text. |

**Rules:**

- Forest is the workhorse. When in doubt, use forest.
- Sage is precious. One accent per layout, not three. The orbiting dot is the canonical sage use.
- No gradients between palette colours. No third-party "kine green."
- The palette is closed. New colours require an ADR.

**Contrast notes (WCAG AA / AAA):**

- Forest `#1B4332` on Paper `#F8F5F0`: ~14:1 (AAA for both small and large text)
- Forest on Sand `#E8DFC8`: ~10:1 (AAA)
- Sage `#4A7C5C` on Paper: ~5.2:1 (AA — for large text and UI, not body copy)
- Paper on Forest (inverse): ~14:1 (AAA)

Body copy should always be Forest on Paper or Paper on Forest. Sage for body copy fails AAA.

---

## 7. Typography

**Inter** for everything until we license a display face.

| Use | Weight | Notes |
|---|---|---|
| Display | Inter Light 300 | Hero headings, brand surfaces. Lowercase preferred. Letter-spacing -1.5 to -3 depending on size. |
| Heading | Inter Regular 400 | Section headers, body H1-H3. Sentence case. |
| Body | Inter Regular 400 | Paragraphs. Standard UI text. Line-height 1.55-1.65. |
| UI | Inter Medium 500 | Buttons, form labels, dense UI. Letter-spacing slight positive (0.2-0.5) for small sizes. |
| Eyebrow | Inter Semibold 600 | All-caps section markers. Letter-spacing 2-3px. Use sparingly. Opacity 55-60% so it recedes. |
| Mono | JetBrains Mono Regular 400 | Code, hashes, technical reference. |

Inter is free, OFL-licensed, multiple weights cover everything. Self-host the WOFF2 files; do not depend on Google Fonts (sovereignty wedge).

**When kine raises a seed round and budgets for brand identity**, evaluate licensed display faces from Klim, Lineto, ABC Dinamo. Custom letterform work for the dotless-i variant of the wordmark is part of that engagement.

---

## 8. Clear space and minimum sizes

**Clear space around the lockup:** at least the height of the `e` in the wordmark on all four sides. The mark's tilt does not extend the bounding box — clear space follows the visual bounding box of the lockup, not the rotated mark.

**Minimum sizes (the production constraints):**

| Surface | Minimum lockup width | Notes |
|---|---|---|
| Print | 30mm | Below this the i-stem custom diagonal cut disappears |
| Web header | 100px | Below this use mark-only |
| Web body | 80px | Use mark-only or wordmark-only |
| Favicon | n/a | Mark only, never lockup. Use `favicon-32.svg` as the floor. |

**The mark survives smaller than the lockup** because it has no typography. Single-color black version of the mark works to 16px in principle, but use 24px+ in production.

---

## 9. Don'ts

- **Do not rotate the lockup.** The -120° tilt is *inside* the mark, not applied to the whole logo. The wordmark always sits horizontally.
- **Do not recolor the mark.** Forest inner, sage outer + dot, period. Single-color black is allowed for legal forms / press / fax where colour is unavailable.
- **Do not stretch.** Lock the aspect ratio.
- **Do not remove the orbiting dot.** It is the brand's animating idea, not decoration. A dot-less mark with a dotless wordmark is unfinished work.
- **Do not put the dot back on the i.** The dot lives on the arc now. Putting it back unmakes the brand.
- **Do not change the tilt angle.** -120° is the spec.
- **Do not place the lockup on busy photography.** Lockup goes on solid colour (Paper, Forest, Sand) or photography with a calm, single-tone area.
- **Do not pair with another logo without clear space between.** When co-branding (e.g. Stripe partnership materials), use the lockup-mark separation distance × 2 between marks.

---

## 10. Application

### Browser / web

```html
<link rel="icon" type="image/svg+xml" href="/brand/favicon/favicon-32.svg">
<link rel="apple-touch-icon" sizes="256x256" href="/brand/favicon/favicon-256.svg">
<link rel="mask-icon" href="/brand/logos/kine-mark.svg" color="#1B4332">
```

In the navigation header, use `kine-lockup.svg` at 100-140px wide. In the footer (per-tenant storefronts) use `kine-wordmark.svg` at 60-80px wide, opacity 50-60%, with a small "powered by" eyebrow.

### Tenant credit footer pattern

```
[eyebrow tracked 2px @ 55% opacity]  POWERED BY
[wordmark @ 60-80px wide]  kine
```

Never use the full lockup as a tenant footer — it would compete with the tenant's own brand. Wordmark + eyebrow is correct.

### Dark mode

Detect via media query; swap the lockup SVG. Don't apply CSS filters to invert — the result wrecks the colour balance (sage shifts pink, etc.).

```css
@media (prefers-color-scheme: dark) {
  .brand-lockup { content: url("/brand/logos/kine-lockup-inverse.svg"); }
}
```

---

## 11. Motion (forward-looking, not yet implemented)

When the brand surface justifies it, the orbiting dot should subtly travel along the outer arc — a 12-15 second loop, ease-in-ease-out, paused on hover. Production motion specs are deferred to a real designer engagement.

Until then: the mark is static. Do not attempt to animate the dot with hand-tuned SVG SMIL or CSS without a designer-spec'd timing curve — bad motion is worse than no motion.

---

## 12. What's still pending (honest)

- **Custom letterforms.** The current SVGs use stock Inter via `font-family`. A real designer would custom-draw all four letters in Glyphs/RoboFont so optical compensation, overshoot, and the i-stem diagonal cut are designed, not approximated.
- **Type license.** Inter is fine for direction-setting; a licensed display face from Klim / Lineto / ABC Dinamo elevates the brand visibly. Budget €2-5k.
- **Motion specs.** §11.
- **Trademark filing.** EUIPO + PRV in Nice classes 9, 35, 36, 42. Run formal FTO clearance before filing. Budget €1-2k incl. attorney.
- **Production exports.** PNG transparencies at 1x/2x/3x, ICO file for legacy browsers, full vector PDF for print. Out of scope here; trivial to generate from the SVG masters with `rsvg-convert` or similar.
- **Brand voice in Swedish.** This doc is in English. A Swedish-native version with proper voice samples (homepage copy, onboarding microcopy, error messages) is its own deliverable.

---

## Changelog

- **2026-05-21 · v1** — initial direction lock. Forest + sage palette, -120° tilt, orbiting dot, custom dotless-i polygon. Files in `docs/brand/logos/` and `docs/brand/favicon/`.
