# Biomax Label System — Designer Brief

**Date:** 2026-05-12
**Audience:** Whoever produces the next label artwork (in-house or external designer).
**Purpose:** A single document containing the brand decisions, regulatory floor, and layout system so the designer can produce on-brand artwork without re-litigating every decision.

This is a brief, not a final design. It defines the *system*; the designer produces the *artwork* in Figma/Illustrator.

---

## 1 · Brand premise

Biomax is a family-owned Swedish supplement business in Kållered, sedan 2001. **Rockland®** is Biomax's own trademarked product line — the brand printed on the bottles is the same business that runs biomax.nu. Two names, one company.

The website voice is editorial, warm, and quiet — traditional-use framing, Playfair Display headlines, warm cream surfaces, deep navy accents. The current Rockland labels don't reflect any of this. They look like a clinical house-brand from 2002 and contain zero visible link back to Biomax, the family, or Kållered.

This brief moves the label system into the same visual world as biomax.nu so a customer who finds the product on the shelf and one who finds it on the site see *the same brand family*.

## 2 · Brand architecture (Biomax → Rockland)

This is a master-brand / sub-brand structure, **not** a co-brand or contract-manufacturer setup. The analogue is Coop → Änglamark or Apotek Hjärtat → Apoliva: the retail/family business owns the product line.

| Surface | Biomax | Rockland® |
|---|---|---|
| Website | The retailer brand. "biomax.nu", "Sedan 2001 · Kållered". | The product line, surfaced as a product mark in the editor and on the product page. |
| Bottle front | Small endorsed mark — wordmark + "Kållered · sedan 2001" tagline at the top of the label. | Dominant brand mark above the ingredient name, with the ® preserved. |
| Bottle back | Legal entity in the regulatory block: "Biomax Handelsbolag · Ekenleden 15A · 428 36 Kållered · Org.nr 969676-7939". A short family-story line. | "Rockland® är ett varumärke som tillhör Biomax HB." |

The intent: Rockland keeps its identity (and its trademark protection), Biomax becomes visibly the family behind it. A new customer who picks up a bottle should immediately understand both halves of the relationship.

**No action item from Rockland's side** — it's your own trademark, no third-party contract to renegotiate.

## 3 · Regulatory floor (Livsmedelsverket + EU 1169/2011)

Every label must include the following. The designer cannot omit or shrink these below the minimum sizes. This is the legal floor — not the design ceiling.

**Front of pack (mandatory):**
- Sales name / produktnamn
- "Kosttillskott" designation
- Net quantity ("60 kapslar", "254 g")
- Recommended daily portion (can be on side panel if space-constrained)

**Back / side panel (mandatory):**
- Full ingredient list in descending order by weight (including additives, capsule material, carriers)
- Allergens in **bold** or highlighted (EU 1169/2011 Annex II)
- Nutritional declaration per recommended daily dose
- Active substance amount per daily dose (mg / µg / IU as appropriate)
- Daily dose instruction
- "Rekommenderad daglig dos bör inte överskridas"
- "Kosttillskott bör inte ersätta en varierad och balanserad kost"
- "Förvaras utom räckhåll för barn"
- Storage conditions
- "Bäst före" date
- Lot / batch number
- Name + address of food business operator (Biomax Handelsbolag, Ekenleden 15A, 428 36 Kållered) + org-nr (969676-7939)
- Manufacturer reference where required ("Tillverkad av Rockland AB för Biomax HB")
- Country of origin where omission would mislead (typically not required for EU manufacture)
- Specific ingredient warnings where mandated (e.g., licorice extract warnings, Harpagophytum + blood-thinner warning)

**Minimum font size for mandatory info:**
- Surface ≥ 80 cm²: x-height ≥ 1.2 mm
- Surface < 80 cm²: x-height ≥ 0.9 mm

(EU 1169/2011 Article 13(2). Don't go smaller. It's an actual legal limit, not a recommendation.)

**Pregnancy / breastfeeding / medication advice** — standard line, applied to all products: "Gravida, ammande och personer som tar läkemedel bör rådgöra med läkare innan användning."

## 4 · Typography system

Match the website typesystem so the shelf and the screen feel like the same brand.

| Role | Typeface | Weight | Size guidance |
|---|---|---|---|
| Product name (hero) | **Playfair Display** | 500 (medium) | 22–28 pt on a 250 ml bottle label |
| Form + count ("60 kapslar") | Inter | 600 (semibold) | 11–13 pt, uppercase, tracked +20 |
| One-line traditional-use framing | Inter | 400 italic | 9–10 pt |
| "Kosttillskott" designation | Inter | 500 | 8–9 pt, uppercase, tracked +30 |
| Biomax wordmark | Existing brand mark (SVG) | — | — |
| "Kållered · sedan 2001" tag | Inter | 400 | 7–8 pt |
| Regulatory body text | Inter | 400 | 7–8 pt (respect 0.9 mm x-height minimum) |
| Allergens | Inter | 700 (bold) | Same as surrounding body |
| Numerical values (mg, µg) | Inter | 500 tabular-nums | Match body |

**Important:** Playfair is for the product name and possibly the brand mark only. *Do not* use Playfair for regulatory text — Inter is the workhorse there.

## 5 · Colour system

Anchor palette (matches the website's `@theme` tokens):

| Token | Hex | Use on label |
|---|---|---|
| `primary-deep` | `#0F202C` | Biomax wordmark, product name, body text |
| `surface-warm` | `#F4ECDD` | Label background |
| `accent` (sage) | `#7A9C7E` | Default category strip if no override |
| `ink-mute` | `#5F6B73` | Secondary body, regulatory fine print |

**Per-category colour strip** (a 6 mm horizontal band at the bottom edge of the front-of-pack, or as a thin top stripe — designer's call):

| Hälsoområde | Hex | Notes |
|---|---|---|
| Sömn & Oro | `#7B6A8D` | Dusty plum, rest, evening |
| Urinvägsinfektion | `#7A9C9E` | Sage-blue, cool, hygienic |
| Mage-Tarm | `#C68A4F` | Ochre, digestive earth |
| Leder | `#5A7B5F` | Deep moss, rootedness |
| Hjärta-Kärl | `#9B4F4F` | Muted wine, warmth |
| Immunförsvar | `#B07A4F` | Terracotta, protection |
| Hjärna och Minne | `#5A6B83` | Slate blue, thought |
| Vitaminer & Mineraler | `#A89060` | Warm grey-gold, neutral |

These are starting points. A designer with a Pantone fan will refine. Each category colour should pass AA contrast against `surface-warm` for any small text placed on it.

Goal: a shelf of eight Biomax bottles reads as a *line* (same skeleton, same typography, same brand mark), with each product instantly placeable by its colour strip.

## 6 · Layout system

Three horizontal bands on the front-of-pack, applied identically across every product. The Biomax mark endorses; the Rockland mark brands the product line.

```
┌──────────────────────────────────────────────────────────┐
│  ◆ biomax                          Kållered · sedan 2001 │  ← Band A (~12%)
│  ──────────────────────────────────────────────────────  │
│                                                          │
│              Rockland ®                                  │  ← Band B-top (~10%)
│                                                          │
│              Colon Aid                                   │
│              Örtblandning för mage                       │  ← Band B-hero (~45%)
│              och tarm                                    │
│                                                          │
│              60 kapslar · kosttillskott                  │
│                                                          │
│  ──────────────────────────────────────────────────────  │
│                                                          │
│  Traditionellt använt vid mage och tarm.                 │  ← Band C (~25%)
│                                                          │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ MAGE-TARM         │  ← Category strip
└──────────────────────────────────────────────────────────┘
```

**Band A — Biomax endorsement** (~12% of label height)
- Biomax wordmark, top-left, ~12 mm wide
- "Kållered · sedan 2001" right-aligned in Inter 7 pt
- Hairline rule below in `ink-mute` 0.25 pt
- Purpose: signal the family/retail brand behind the line

**Band B — Rockland product hero** (~55%)
- "Rockland ®" sub-band at top in Playfair 14 pt, primary-deep, with the registered mark preserved. Treats Rockland as a sub-brand mark, not a manufacturer credit.
- Product name (the ingredient) in Playfair 22–28 pt, left-aligned, the largest type on the label
- Sub-name / one-line ingredient framing in Inter 11 pt regular, below the product name
- "60 kapslar · kosttillskott" in Inter 9 pt uppercase tracked, near band bottom

**Band C — promise + category cue** (~25%)
- One line of traditional-use framing in Inter 9 pt italic, left-aligned
- 6 mm category colour strip at bottom edge, with the category name reversed out in Inter 7 pt uppercase letterspaced

**Side panel / back of pack** (separate label or wrap-around):
- Ingredient table (10 pt minimum, not 7 pt like Rockland's current side label)
- Dosing schedule that mirrors the dose chips on the website ("1 kapsel · 1× per dag · med måltid")
- Regulatory block (food business operator info, batch, BBE, allergens)
- Final line: "Mer information på biomax.nu/produkter/colon-aid"
- Optional QR code to the product page (~12 mm square, lower-right)

## 7 · Material & finish

| Element | Spec | Why |
|---|---|---|
| Substrate | Uncoated or matte-coated paper label | Glossy reads pharmaceutical; matte reads herbal/editorial. Aligns with the website's warm-cream tone. |
| Adhesive | Standard removable for HDPE bottles | Standard ask of any Swedish label printer |
| Print method | 4-colour process (CMYK) + brand spot for Biomax navy if budget allows | Spot ensures the brand navy is identical across all SKUs |
| Bottle | Keep the existing white HDPE | Don't change two variables at once; bottle stays, label changes |
| Cap | White (unchanged) | Same reason |

## 8 · Sample spec — Colon Aid 60 kapslar

Use this as the worked example. The other products follow the same skeleton with only the ingredient-specific lines changing.

**Band A**
- Biomax wordmark
- "Kållered · sedan 2001"

**Band B**
- Sub-brand mark: `Rockland ®` (Playfair 14 pt, primary-deep, ® preserved at 60% scale)
- Product name: `Colon Aid` (Playfair 26 pt, primary-deep)
- Sub-name: `Örtblandning för mage och tarm` (Inter 11 pt regular, ink-mute)
- Form line: `60 KAPSLAR · KOSTTILLSKOTT` (Inter 9 pt uppercase, tracked +30, primary-deep)

**Band C**
- Promise: `Traditionellt använt vid mage och tarm.` (Inter 9 pt italic, primary-deep)
- Category strip: `#C68A4F` ochre, 6 mm tall, label `MAGE-TARM` reversed out in `surface-warm`

**Back / side panel**

```
INNEHÅLL (per 2 kapslar)
Rödalm (Ulmus rubra)              200 mg
Aloe vera                          100 mg
Vit ekbark (Quercus alba)          100 mg
Gentianarot (Gentiana lutea)        80 mg
Verbena (järnört)                   60 mg

Övriga ingredienser: gelatinkapsel, rismjöl, kiseldioxid.

DOSERING
1 kapsel 1–2 gånger dagligen i samband med måltid.
Drick ett glas vatten till.

Rekommenderad daglig dos bör inte överskridas.
Kosttillskott bör inte ersätta en varierad och balanserad kost.
Förvaras torrt och svalt vid rumstemperatur, utom räckhåll för barn.
Gravida, ammande och personer som tar läkemedel bör rådgöra
med läkare innan användning.

Bäst före: se botten              Lot: se botten

Biomax Handelsbolag · Ekenleden 15A · 428 36 Kållered
Org.nr 969676-7939 · kontakt@biomax.nu
Rockland® är ett varumärke som tillhör Biomax HB.

Mer information på biomax.nu/produkter/colon-aid
```

(The mg values above are placeholders. Replace with Rockland's actual per-portion declaration.)

## 9 · Production checklist for the designer

Before sending artwork to print:

- [ ] Bottle dimensions measured: front-label area in mm × mm, side-label / wrap-around area in mm × mm. Confirm with the printer.
- [ ] All mandatory regulatory text from §3 present and at compliant size (x-height check).
- [ ] Allergens bolded in the ingredient list.
- [ ] Numerical values use Inter tabular-nums so columns align.
- [ ] Category colour passes AA contrast against `surface-warm` for any small text placed on it.
- [ ] All eight SKUs mocked side-by-side to confirm the system reads as a line, not eight independent labels.
- [ ] Bleed: 3 mm on all edges (standard for paper labels).
- [ ] CMYK + spot navy if budget allows; otherwise CMYK only.
- [ ] Print proof on actual substrate before mass-printing — paper matters more than the screen mock.

## 10 · Out of scope

- The bottle itself (we keep the existing white HDPE).
- The cap (we keep white).
- Multi-language labels — biomax sells sv-SE only.
- A logo redesign — the current Biomax wordmark stays as-is.
- Photography on the label — too small a surface, and our brand photography is editorial, not product-cutout. The bottle's category strip and typography do the differentiation.

---

## Handoff

When this brief has been turned into Figma/Illustrator artwork:

1. Drop the master Figma link into this file (replace this paragraph).
2. Add the eight bottle mocks as PNGs in `docs/assets/labels/` for reference.
3. Cross-link from `TODO.md` §2 "Content & assets" so the launch checklist knows label artwork is in flight.

This brief stays the source of truth for typography, colour, regulatory floor, and layout. Artwork files are the implementation.
