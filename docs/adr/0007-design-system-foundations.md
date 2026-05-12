# ADR 0007 — Design System Foundations

**Date:** 2026-05-10
**Status:** Accepted
**Supersedes:** ADR 0006 (which deferred this decision)

## Context

The biomax.nu rebuild needs a coherent visual system rooted in the brand's strongest equity: 25 years of family-owned naturalist conviction (founded 2001 by Constantin Raduti in Kållered, Gothenburg) and a category-leading position as a clinical-yet-approachable Swedish supplement house. The system must serve two audiences simultaneously: the *informed health investor* (45–70, ingredient-literate, returning customer) and the *next-generation health-conscious* (30–45, discovers brands through editorial content) — without alienating either.

Three full visual directions were prototyped and reviewed at `/design`:
- **A — Nordic Steel** (heritage editorial, classical serif, copper accent)
- **B — Pharmacy Blue** (clinical, restrained, sage accent)
- **C — Cyan Apothecary** (contemporary DTC, sans-only)

Direction B was selected and refined into a single locked system, hereafter called "Biomax 2026."

## Decision

### 1. Color tokens

All colors below ship as Tailwind v4 `@theme` CSS custom properties (e.g. `--color-primary`). Hex values are the source of truth.

| Role | Token | Hex | Usage |
|---|---|---|---|
| Primary | `--color-primary` | `#1E3A5F` | Buttons, links, brand surfaces, logo default fill |
| Primary deep | `--color-primary-deep` | `#0F2440` | Headers/footers, founder band, hover states |
| Primary soft | `--color-primary-soft` | `#2C5384` | Subtle gradients, hover surfaces |
| Surface | `--color-surface` | `#FBFAF7` | Default page background |
| Surface alt | `--color-surface-alt` | `#FFFFFF` | Cards, elevated surfaces |
| Surface warm | `--color-surface-warm` | `#F4F0E8` | Featured product sections, callout bands |
| Ink | `--color-ink` | `#0A0A0A` | Body text base |
| Ink body | `--color-ink-body` | `#1F2530` | Long-form prose |
| Ink mute | `--color-ink-mute` | `#525860` | Captions, secondary text |
| Ink soft | `--color-ink-soft` | `#7A8290` | Footnotes, disabled |
| Accent | `--color-accent` | `#7A8B6F` | Lichen sage — badges, dots, hover affordance |
| Accent deep | `--color-accent-deep` | `#5C6E55` | Italic accent text in display contexts |
| Border | `--color-border` | `#E8E5DE` | Card borders, dividers |
| Border soft | `--color-border-soft` | `#F0EDE5` | Internal dividers within cards |

The lichen sage `#7A8B6F` (rather than spring sage `#9DAD8E`) was selected for accent: more sophisticated, tighter tonal range against the brand blue, and a closer visual relationship to Björkglukos (the hero birch product).

### 2. Seasonal accent system

The hero photograph rotates four times a year. The `accent` color used in the hero italic ("*i fokus*") shifts with the season — the only chrome change in the system. All other UI stays stable year-round.

| Season | Months | Accent hex | Motif |
|---|---|---|---|
| Vår | Mar–May | `#7A8B6F` (lichen) | *Våren vaknar* |
| Sommar | Jun–Aug | `#D4A574` (warm honey) | *Långa ljusa kvällar* |
| Höst | Sep–Nov | `#B5523B` (rust) | *Höstens glöd* |
| Vinter | Dec–Feb | `#7B97A3` (ice blue) | *Hand i hand i snön* |

### 3. Typography

| Role | Family | Source | Notes |
|---|---|---|---|
| Display | **Playfair Display** | `next/font/google` | Headlines, product names, italic accents. High-contrast Didone serif, editorial-classical voice. |
| Body / UI | **Inter** | `next/font/google` | Body text, buttons, navigation, captions. |

**Rules:**
- Letter-spacing: display headings tighten to `-0.025em`; body stays at default.
- Italic display in accent color is the recurring brand signature (e.g. *i fokus*, *signaturprodukter*, *hälsoområde*, *förklarad*). Use sparingly — at most one italic accent per heading.
- Eyebrow labels: Inter 11px, `letter-spacing: 0.24em`, uppercase, weight 600.
- All copy is sv-SE per ADR 0005. No English fallbacks anywhere.

### 4. Logo & lockup

- **Source of truth:** `public/brand/biomax-logo.svg` (full lockup: symbol + wordmark, fill via `currentColor`).
- **React component:** `components/brand/BiomaxLogo.tsx` for inline use (color via CSS).
- **Header lockup:** logo at `height={36}` in `--color-primary`, with `Sedan 2001 · Kållered` tagline below in Inter 9px, `letter-spacing: 0.24em`, `--color-ink-mute`.
- **Inverted contexts** (founder band, footer): logo in `--color-surface`, tagline in `rgba(251,250,247,0.55)`.
- **Heritage tagline** (`Sedan 2001`) only appears under the logo. Do **not** repeat it as a hero pill, badge, or section eyebrow — single source of truth.

### 5. Seasonal photography (hero)

The seasonal hero photograph is the brand's strongest visual differentiator (see memory: *seasonal photography is the brand pillar*).

**Compositional brief** (use when commissioning real photography):
- Low horizon, ~60% sky / atmospheric depth
- Soft directional light — golden hour or overcast, never harsh midday
- Native Swedish nature: birch (spring), meadow (summer), maple/berberis (autumn), pine (winter)
- People in scene, but never as models — *at home in nature*, not *posed on location*
- Format: 16:9 horizontal master, with safe headline-overlay zones in the left third and right third
- Output: full-resolution master + responsive sizes via Next.js `<Image>` pipeline

**Hero pattern:**
- Height: `75svh` (with featured product card) or `100svh` (campaign mode without featured product)
- Headline: Playfair Display, `clamp(56px, 8vw, 112px)`, weight 500, white
- Italic accent on one phrase (uses season's accent color)
- Subhead: Inter 19px, `rgba(251,250,247,0.88)`
- Featured product card: bottom-right, frosted glass (`rgba(251,250,247,0.96)`, `backdrop-blur(16px)`), real product photo + price + "Lägg i varukorg"
- Motif caption: bottom-left, Playfair italic 14px, `rgba(251,250,247,0.7)`

### 6. Information architecture (homepage)

Locked section order:
1. **Top utility bar** — shipping / Klarna / "Mitt konto"
2. **Header** — logo + nav (Produkter, Kategorier, Behandlingar, Kunskap, Om oss) + Sök + cart
3. **Hero** — seasonal photograph + brand text + featured product card
4. **Trustpilot bar** — single slim row (4,4 av 5 · Utmärkt · 53 omdömen)
5. **Signaturprodukter** — three signature products (Balans, Björkglukos, Beta Glucan) with prices and add-to-cart
6. **Kategorier** — six botanical horizontal cards (Cognitio · Ginkgo, Cardio · Hagtorn, Defensio · Echinacea, Articulus · Gurkmeja, Digestio · Fänkål, Vitalis · Rosenrot)
7. **Founder band** — Constantin Raduti portrait + quote on deep-blue inverted surface
8. **Kunskap** — 3 editorial article teasers
9. **Newsletter** — centered, "10 % rabatt"
10. **Footer**

Sections that previously existed and were retired: stand-alone "trust strip" (4-column generic), "seasonal rotation" 4-up grid (the hero alone carries the seasonal ritual).

### 7. Botanical category signature

Each health-area category is paired with its signature herb. This is a brand-level decision, not a styling one:

| Category | Latin | Signature herb |
|---|---|---|
| Hjärna & Minne | *Cognitio* | Ginkgo biloba |
| Hjärta-Kärl | *Cardio* | Crataegus (Hagtorn) |
| Immunförsvar | *Defensio* | Echinacea purpurea |
| Leder | *Articulus* | Curcuma longa (Gurkmeja) |
| Mage-Tarm | *Digestio* | Foeniculum vulgare (Fänkål) |
| Energi | *Vitalis* | Rhodiola rosea |

Use the signature herb on the category landing page hero, in the category card thumbnail, and as a recurring motif in editorial content for that area.

### 8. Component primitives (Phase 1 build-out)

To be implemented at `components/ui/`:
- `Button` — variants: `primary`, `outline`, `ghost`. Sizes: `sm`, `md`. All pill-shaped (border-radius 999).
- `Eyebrow` — uppercase Inter label
- `Display` — Playfair heading with optional italic accent
- `Card` — surface card with consistent padding/border tokens
- `ProductCard` — vertical product card (hero card, bestsellers card, featured card)
- `CategoryCard` — horizontal navigation card with botanical thumbnail
- `TrustpilotBar` — slim rating row with stars
- `BiomaxLogo` — already exists at `components/brand/BiomaxLogo.tsx`

### 9. Accessibility

- **WCAG AAA** (7:1) for primary body text on warm-cream surface. Verified: `#1E3A5F` on `#F4F0E8` = **9.9:1** ✓
- **WCAG AA** (4.5:1) minimum for `--color-ink-mute` on warm-cream. Verified: `#525860` on `#F4F0E8` = **6.3:1** ✓
- **Visible designed focus rings** in `--color-primary` (not browser default) — to be implemented in component primitives
- **No motion-only signals**; respect `prefers-reduced-motion`
- **Min 44×44px touch targets** across the entire site
- **Skip-to-content link** in the header (to be implemented)
- **Color is never the only carrier of meaning** — icons + color for badges, errors

### 10. Live data dependencies

Some values currently hardcoded in `/design` need to come from live sources in production:
- **Trustpilot rating + review count** — fetch from Trustpilot API or scrape the public profile periodically (cache 24h)
- **Active season** — derive from current date (`Date.now()`) with optional admin override
- **Featured "Säsongens favorit" product** — pinned per season in admin, with seasonal product mapping default

## Consequences

- A second design pass at the design system as a whole is **not expected** before implementation. The system is locked. Future iteration happens at the component level, not the foundation level.
- Tailwind v4 `@theme` block in `app/globals.css` becomes the single source of truth for tokens. The `T = {...}` literal currently used in `app/design/page.tsx` will be removed when the system is ported.
- Real photography will replace the Unsplash placeholders for the seasonal hero, founder portrait, product shots, and category botanicals. Until then, the placeholder URLs in `seasons` and `cats` data are acceptable.
- Dark mode is **not** in scope for v1. The `@media (prefers-color-scheme: dark)` block in `globals.css` will be retained as a stub but not actively designed against until a future ADR.
- Brand application beyond the website (email, packaging, social) inherits this system. Email templates use the same Playfair + Inter, same tokens, same seasonal photography ritual. See memory: *seasonal photography is the brand pillar*.
