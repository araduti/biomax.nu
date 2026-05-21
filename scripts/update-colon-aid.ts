/**
 * One-off content update for Colon Aid based on the real ingredient
 * declaration + price the user provided on 2026-05-12.
 *
 * Notable changes vs the initial seed:
 *   - Price 226 kr (was placeholder 0)
 *   - Vegan capsule (cellulose), not gelatin
 *   - Real per-daily-dose mg values
 *   - Slemalm (Slippery elm) instead of "Rödalm"
 *   - Blå verbena (Verbena hastata) — specifically, not just verbena
 *   - Aloe ferox specifically, not generic aloe vera
 *   - Filler: risstärkelse (rice starch), not rismjöl (rice flour)
 *   - Daily dose: 2 capsules
 *
 * Editorial choices:
 *   - Dropped the Swanson marketing bullet list — copy comes from a Swanson
 *     source page and that's the wrong brand to credit on a Rockland product.
 *   - Tightened five marketing paragraphs into four editorial paragraphs in
 *     the brand's traditional-use voice.
 *   - perUnit set to "dagsdos (2 kapslar)" so customers see the EU-preferred
 *     per-daily-intake disclosure rather than per-capsule maths.
 *
 * Usage:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/update-colon-aid.ts
 */
import { prisma } from "@/lib/prisma";
import type { Dose } from "@/lib/products/dose";

const SLUG = "colon-aid-60-kapslar";

const LONG_DESCRIPTION = `
<p>Colon Aid är en växtbaserad blandning som kombinerar fem traditionella örter med lång användning inom örtmedicinen för mage och tarm: slemalm, aloe, vit ekbark, gentianarot och blå verbena.</p>
<p>Slemalmsbark (slippery elm) har använts i generationer hos nordamerikanska ursprungsbefolkningar för att stötta matsmältningskanalens slemhinna. Aloeblad har en lång tradition inom asiatisk och europeisk växtmedicin. Vit ekbark och gentianarot kommer från den europeiska örtmedicinen — gentianan är välkänd som bittermedel. Blå verbena, även kallad järnört, har en plats i både nordamerikansk och asiatisk traditionell användning.</p>
<p>Formuleringen är vegansk. Kapseln är gjord av vegetabiliskt cellulosa, bäraren är risstärkelse, och alla aktiva ingredienser är växtbaserade. Inga deklarationspliktiga allergener.</p>
<p>Två kapslar dagligen ger en daglig dos om 292 mg slemalm, 290 mg aloe, 144 mg vit ekbark, samt 72 mg vardera av gentianarot och blå verbena.</p>
`.trim();

const INGREDIENTS_FREE_TEXT =
  "Slemalmsbark (Ulmus rubra), aloeblad (Aloe ferox), vit ekbark (Quercus alba), gentianarot (Gentiana lutea), blå verbena (Verbena hastata). Övriga ingredienser: vegetabiliskt cellulosa (kapselskal), risstärkelse, vegetabiliskt magnesiumstearat.";

const INGREDIENT_LIST = {
  rows: [
    { name: "Slemalmsbark (Ulmus rubra)", amount: "292 mg" },
    { name: "Aloeblad (Aloe ferox)", amount: "290 mg" },
    { name: "Vit ekbark (Quercus alba)", amount: "144 mg" },
    { name: "Gentianarot (Gentiana lutea)", amount: "72 mg" },
    { name: "Blå verbena (Verbena hastata)", amount: "72 mg" },
  ],
  perUnit: "dagsdos (2 kapslar)",
  footnote:
    "Övriga ingredienser: vegetabiliskt cellulosa (kapselskal), risstärkelse, vegetabiliskt magnesiumstearat. * Daglig referensintag (NRV) ej fastställt.",
};

const USAGE =
  "Rekommenderad daglig dos: 2 kapslar, gärna 1 kapsel på morgonen och 1 kapsel på kvällen i samband med måltid. Drick ett glas vatten till.";

const DOSING: Dose = {
  amount: "2 kapslar",
  frequency: "1–2× per dag",
  timing: { label: "Med måltid", tone: "with" },
  schedule: ["morgon", "kvall"],
};

const AI_KEYWORDS = [
  "colon aid",
  "tarmflora tillskott",
  "slemalm slippery elm",
  "aloe ferox",
  "vit ekbark",
  "gentianarot",
  "blå verbena",
  "vegansk kapsel mage",
  "växtbaserad mage",
  "rockland",
];

const SHORT_DESCRIPTION =
  "Vegansk örtblandning för mage och tarm — slemalm, aloe ferox, vit ekbark, gentianarot och blå verbena. Två kapslar per dag.";

async function main() {
  // After #3e: slug is no longer globally @unique — it's composite
  // (tenantId, slug). Lookup-then-update-by-id is the cleanest pattern.
  // This whole script is biomax-tenant content that #16 will flag for
  // SEED-DATA categorization.
  const existing = await prisma.product.findFirst({
    where: { slug: SLUG },
    select: { id: true },
  });
  if (!existing) {
    throw new Error(`Product slug "${SLUG}" not found.`);
  }
  const result = await prisma.product.update({
    where: { id: existing.id },
    data: {
      price: 226,
      shortDescription: SHORT_DESCRIPTION,
      longDescription: LONG_DESCRIPTION,
      ingredients: INGREDIENTS_FREE_TEXT,
      ingredientList: INGREDIENT_LIST,
      usage: USAGE,
      dosing: DOSING,
      aiKeywords: AI_KEYWORDS,
      // Bumping reviewed date so JSON-LD dateModified reflects the editorial pass.
      dateReviewed: new Date(),
      // Note: status stays whatever it currently is (likely DRAFT). The editor
      // flips it to PUBLISHED when the image + weight + dimensions are in.
    },
    select: { slug: true, status: true, price: true },
  });
  console.log(
    `✓ ${result.slug} — price now ${result.price.toString()} kr · status ${result.status}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
