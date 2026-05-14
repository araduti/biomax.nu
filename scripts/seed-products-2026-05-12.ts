/**
 * Apply user-provided product descriptions (2026-05-12) for seven products.
 * Five are existing DRAFTs (Colon Aid, ALA, Chanca Piedra, DGL, Harpago)
 * — we update copy, price, ingredients, and dosing while preserving any
 * editor-set fields (imageUrl, stock, manageStock — these are intentionally
 * NOT touched on update).
 *
 * Two are new (NAC, Super Probiotika) — full create.
 *
 * Upsert by slug, re-run safe. After running, every product still needs an
 * image upload via the admin UI before publishing.
 *
 * Usage:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/seed-products-2026-05-12.ts
 */
import { prisma } from "@/lib/prisma";

const PLACEHOLDER_IMAGE = "/products/_placeholder.svg";

const STANDARD_STORAGE =
  "Förvaras torrt och svalt i rumstemperatur, utom räckhåll för små barn, ej i direkt solljus.";

const STANDARD_WARNINGS =
  "Rekommenderad daglig dos bör inte överskridas. Kosttillskott är inte avsett att ersätta en varierad och balanserad kost eller en hälsosam livsstil. Gravida, ammande och personer som tar läkemedel bör rådgöra med läkare innan användning.";

type Seed = {
  slug: string;
  sku: string;
  name: string;
  price: number;
  status?: "DRAFT" | "PUBLISHED";
  shortDescription: string;
  longDescription: string;
  ingredients: string;
  ingredientRows: { name: string; amount: string }[];
  perUnit: string;
  ingredientFootnote?: string;
  usage: string;
  storage?: string;
  warnings?: string;
  aiKeywords: string[];
  seoTitle: string;
  seoDescription: string;
  seoFocusKw: string;
  categorySlug: string;
};

const SEEDS: Seed[] = [
  // ── 1. Alpha Lipoic Acid ──────────────────────────────────────────
  {
    slug: "alpha-lipoic-acid-60-kapslar",
    sku: "ROCK-ALA-60",
    name: "Alpha Lipoic Acid 60 kapslar",
    price: 195,
    shortDescription:
      "Alfa-liponsyra — en svavelhaltig molekyl som cellerna själva bildar och som är verksam i både vatten- och fettlösliga miljöer.",
    longDescription:
      "<p>Alfa-liponsyra (ALA) är en kort fettsyra med två svavelatomer som kroppen själv bildar i mitokondrierna. Det är ett av få ämnen som fungerar som antioxidant i både vatten- och fettlösliga delar av cellen.</p><p>Alfa-liponsyra finns naturligt i små mängder i livsmedel som rött kött, spenat, broccoli och potatis. Kroppens egen produktion avtar med åldern, vilket är en av anledningarna till att många väljer att komplettera.</p><p>Rockland Alpha Lipoic Acid är ren formulering med 300 mg ALA per kapsel, i en vegetabilisk pullulankapsel utan onödiga tillsatser.</p>",
    ingredients:
      "Alfa-liponsyra, fyllnadsmedel (tapioka), vegetabilisk kapsel (pullulan), klumpförebyggande medel (kiseldioxid).",
    ingredientRows: [{ name: "Alfa-liponsyra", amount: "300 mg" }],
    perUnit: "kapsel",
    ingredientFootnote: "DRI ej fastställd.",
    usage:
      "1 kapsel före måltid, 1–2 gånger per dag. Svälj med ett glas vatten.",
    aiKeywords: [
      "alfa-liponsyra",
      "alpha lipoic acid",
      "ALA",
      "antioxidant",
      "fettlöslig antioxidant",
      "vattenlöslig antioxidant",
      "tioktinsyra",
      "rockland",
    ],
    seoTitle:
      "Alpha Lipoic Acid 60 kapslar — Rockland alfa-liponsyra 300 mg | Biomax",
    seoDescription:
      "Alfa-liponsyra (ALA) 300 mg per kapsel — en av få antioxidanter aktiv i både vatten- och fettlösliga miljöer. 60 vegetabiliska kapslar från Rockland.",
    seoFocusKw: "alfa-liponsyra",
    categorySlug: "hjarta-karl",
  },
  // ── 2. Chanca Piedra ──────────────────────────────────────────────
  {
    slug: "chanca-piedra-60-kapslar",
    sku: "ROCK-CHANCA-60",
    name: "Chanca Piedra 60 kapslar",
    price: 283,
    shortDescription:
      "Tropisk ört vars portugisiska namn betyder \"stenkrossaren\". Använd inom amazonsk och ayurvedisk tradition för lever och urinvägar.",
    longDescription:
      "<p>Chanca Piedra (Phyllanthus niruri) är en liten ört som växer vild i Amazonas, södra Indien, Sri Lanka och Filippinerna. Det portugisiska namnet betyder bokstavligen \"stenkrossaren\".</p><p>Inom ayurvedisk medicin är växten känd som bhumi amla och har sedan 2000 år tillbaka en plats i klassiska formuleringar för lever och urinvägar. Inom amazonsk folkmedicin har örten en motsvarande roll. Trots vad namnet antyder är det blad och stam som används medicinalt — inte stenar.</p><p>Rockland Chanca Piedra är ett fullspektrumextrakt med 500 mg per kapsel. Extraktionen bevarar växtens hela ämnesinnehåll i stället för att isolera ett enskilt ämne.</p>",
    ingredients:
      "Chanca Piedra (Phyllanthus niruri) (blad och stam), hypromellos (vegetabilisk kapsel), mikrokristallin cellulosa (växtfiber), magnesiumstearat, kisel.",
    ingredientRows: [
      { name: "Chanca Piedra (Phyllanthus niruri)", amount: "500 mg" },
    ],
    perUnit: "kapsel",
    ingredientFootnote: "DRI ej fastställd.",
    usage:
      "1 kapsel dagligen tillsammans med måltid. Drick rikligt med vatten under dagen.",
    aiKeywords: [
      "chanca piedra",
      "phyllanthus niruri",
      "stenkrossaren",
      "njurar tillskott",
      "lever tillskott",
      "amazonsk ört",
      "ayurveda",
      "rockland",
    ],
    seoTitle:
      "Chanca Piedra 60 kapslar — Rockland fullspektrumextrakt 500 mg | Biomax",
    seoDescription:
      "Chanca Piedra (Phyllanthus niruri) 500 mg per kapsel. Tropisk ört använd i amazonsk och ayurvedisk tradition. 60 kapslar från Rockland.",
    seoFocusKw: "chanca piedra",
    categorySlug: "urinvagsinfektion",
  },
  // ── 3. Colon Aid ──────────────────────────────────────────────────
  {
    slug: "colon-aid-60-kapslar",
    sku: "ROCK-COLON-60",
    name: "Colon Aid 60 kapslar",
    price: 226,
    shortDescription:
      "Örtformel med slemalm, aloe, vit ekbark, gentianarot och blå verbena — fem traditionella växter för mage och tarm.",
    longDescription:
      "<p>Colon Aid är en sammansatt örtformel där fem traditionella växter har valts för sina roller i ett klassiskt växtbaserat magstöd: två mjuka, slemhinnestödjande örter (slemalm och aloeblad), en garvämnesrik sammandragande del (vit ekbark), en europeisk bitterört (gentianarot) och ett amerikanskt nervlugnande tillskott (blå verbena).</p><p>Receptet bygger på en helhetssyn — flera samverkande växter snarare än ett isolerat aktivt ämne. Varje ingrediens har sin egen, väl etablerade plats inom traditionell örtmedicin från olika delar av världen.</p><p>Rockland Colon Aid kommer i vegetabilisk kapsel — två kapslar utgör en daglig dos.</p>",
    ingredients:
      "Slemalm (Ulmus rubra), Aloeblad (Aloe ferox), Vit ekbark (Quercus alba), Gentianarot (Gentiana lutea), Blå verbena (Verbena hastata, luftdelar), vegetabilisk cellulosa (kapselskal), risstärkelse, vegetabiliskt magnesiumstearat.",
    ingredientRows: [
      { name: "Slemalmsbark (Ulmus rubra)", amount: "292 mg" },
      { name: "Aloeblad (Aloe ferox)", amount: "290 mg" },
      { name: "Vit ekbark (Quercus alba)", amount: "144 mg" },
      { name: "Gentianarot (Gentiana lutea)", amount: "72 mg" },
      { name: "Blå verbena (Verbena hastata)", amount: "72 mg" },
    ],
    perUnit: "dagsdos (2 kapslar)",
    ingredientFootnote:
      "NRV (näringsreferensvärde, EU 1169/2011) ej fastställt. Inga deklarationspliktiga allergener.",
    usage:
      "2 kapslar dagligen, fördelat på 1 kapsel 2 gånger per dag i samband med måltid. Drick ett glas vatten till.",
    aiKeywords: [
      "colon aid",
      "slemalm slippery elm",
      "aloe ferox",
      "vit ekbark",
      "gentianarot",
      "blå verbena",
      "tarmhälsa örter",
      "matsmältning kosttillskott",
      "rockland",
    ],
    seoTitle:
      "Colon Aid 60 kapslar — örtblandning för mage och tarm | Biomax",
    seoDescription:
      "Fem traditionella örter i en formel: slemalm, aloeblad, vit ekbark, gentianarot, blå verbena. 60 vegetabiliska kapslar från Rockland.",
    seoFocusKw: "colon aid örter",
    categorySlug: "mage-tarm",
  },
  // ── 4. DGL ────────────────────────────────────────────────────────
  {
    slug: "dgl-90-tuggtabletter",
    sku: "ROCK-DGL-90",
    name: "DGL 90 tuggtabletter",
    price: 265,
    shortDescription:
      "Deglycyrrhiziniserad lakritsrot — lakritsens magstödjande tradition utan glycyrrhizinets påverkan på blodtrycket. Med extra glycin.",
    longDescription:
      "<p>DGL står för Deglycyrrhizinated Licorice. Det är lakritsrot där glycyrrhizinet har tagits bort — alltså det ämne som ger lakrits dess karaktäristiska söta smak, men som vid längre tids hög konsumtion också kan höja blodtrycket och sänka kaliumnivåerna.</p><p>Det som finns kvar är flavonoiderna och chalkonerna — de ämnen som förknippas med lakritsens traditionella användning för magslemhinnan inom både kinesisk medicin (gan cao) och europeisk fytoterapi.</p><p>Rockland DGL säljs som tuggtablett snarare än som kapsel — kontakten med saliv och munslemhinna anses bidra till effekten. Varje tablett innehåller 385 mg DGL-extrakt, kompletterat med 50 mg glycin.</p>",
    ingredients:
      "Deglycyrrhiziniserad lakritsrotsextrakt (Glycyrrhiza glabra), glycin, övriga hjälpämnen.",
    ingredientRows: [
      {
        name: "Deglycyrrhiziniserad lakritsrotsextrakt (Glycyrrhiza glabra)",
        amount: "770 mg",
      },
      { name: "Glycin", amount: "100 mg" },
    ],
    perUnit: "dagsdos (2 tuggtabletter)",
    ingredientFootnote: "NRV (EU 1169/2011) ej fastställt.",
    usage:
      "Tugga 2 tabletter före måltid, upp till 3 gånger dagligen. Tugga ordentligt innan tablettens innehåll sväljs.",
    aiKeywords: [
      "DGL",
      "deglycyrrhiziniserad lakrits",
      "lakritsrot",
      "magslemhinna kosttillskott",
      "glycin",
      "tuggtabletter mage",
      "glycyrrhiza glabra",
      "rockland",
    ],
    seoTitle:
      "DGL 90 tuggtabletter — deglycyrrhiziniserad lakritsrot med glycin | Biomax",
    seoDescription:
      "385 mg DGL-extrakt + 50 mg glycin per tuggtablett. Lakritsrotens magstödjande tradition utan glycyrrhizin. 90 tabletter från Rockland.",
    seoFocusKw: "DGL lakrits",
    categorySlug: "mage-tarm",
  },
  // ── 5. Harpago ────────────────────────────────────────────────────
  {
    slug: "harpago-devils-claw-100-kapslar",
    sku: "ROCK-HARPAGO-100",
    name: "Harpago Devil's Claw 100 kapslar",
    price: 378,
    shortDescription:
      "Sydafrikansk djävulsklo (Harpagophytum) — en av de mest studerade örterna inom ledhälsa. 500 mg fullspektrumextrakt per kapsel.",
    longDescription:
      "<p>Djävulsklo (Harpagophytum procumbens) är en sydafrikansk växt vars torkade sekundärrötter används medicinalt. Bland khoisanfolken i Kalahari har örten varit en del av traditionell medicin i flera hundra år, framför allt för leder och rörlighet.</p><p>Den togs upp i europeisk växtmedicin på 1950-talet och är idag en av de mest studerade örterna inom ledhälsa. EMA (Europeiska läkemedelsmyndigheten) har en monografi för traditionell användning. De aktiva ämnena är iridoidglykosider — främst harpagosid — samt fytosteroler och flavonoider.</p><p>Rockland Harpago är ett fullspektrumextrakt med 500 mg per kapsel. Fullspektrumextraktionen bevarar växtens hela ämnesinnehåll i stället för att isolera enskilda ämnen.</p>",
    ingredients:
      "Djävulsklo (Harpagophytum spp.) (rot), kapselskal (gelatin), rismjöl, magnesiumstearat.",
    ingredientRows: [
      { name: "Djävulsklo (Harpagophytum spp.)", amount: "500 mg" },
    ],
    perUnit: "kapsel",
    ingredientFootnote:
      "NRV (EU 1169/2011) ej fastställt. Allergeninformation ej tillgänglig i källdata.",
    usage:
      "1–2 kapslar dagligen tillsammans med måltid. Drick ett glas vatten till.",
    warnings:
      STANDARD_WARNINGS +
      " Bör inte användas vid magsår eller av personer som tar blodförtunnande läkemedel utan att rådgöra med läkare.",
    aiKeywords: [
      "harpago",
      "djävulsklo",
      "harpagophytum procumbens",
      "devils claw",
      "leder kosttillskott",
      "rörlighet",
      "fullspektrumextrakt",
      "rockland",
    ],
    seoTitle:
      "Harpago Devil's Claw 100 kapslar — djävulsklo 500 mg | Biomax",
    seoDescription:
      "Sydafrikansk djävulsklo (Harpagophytum procumbens) 500 mg fullspektrumextrakt per kapsel. En av de mest studerade örterna inom ledhälsa. 100 kapslar från Rockland.",
    seoFocusKw: "djävulsklo harpago",
    categorySlug: "leder",
  },
  // ── 6. NAC (NEW) ──────────────────────────────────────────────────
  {
    slug: "nac-60-kapslar",
    sku: "ROCK-NAC-60",
    name: "NAC 60 kapslar",
    price: 219,
    shortDescription:
      "N-acetylcystein — den acetylerade formen av cystein, kroppens hastighetsbegränsande byggsten för glutation. 600 mg per kapsel.",
    longDescription:
      "<p>N-acetylcystein (NAC) är cystein med en acetylgrupp tillagd på aminosidan. Den acetylerade formen är mer stabil och tas upp bättre än ren cystein, som lätt oxiderar.</p><p>Cystein har en central roll i kroppen som hastighetsbegränsande byggsten för glutation — en tripeptid (glutaminsyra + cystein + glycin) som finns i alla celler och utgör en av kroppens viktigaste interna antioxidanter. Glutationnivåerna sjunker med åldern och vid hög oxidativ belastning.</p><p>Rockland NAC innehåller 600 mg N-acetyl L-cystein per kapsel i en vegetabilisk pullulankapsel. Produkten har en naturlig svaveldoft som kan upplevas som stark — det är cysteinets svavelatom som ger doften, och det är ett tecken på att produkten är som den ska, inte en kvalitetsbrist.</p>",
    ingredients:
      "N-acetyl L-cystein, vegetabilisk kapsel (pullulan), fyllnadsmedel (tapiokapulver), leucin.",
    ingredientRows: [{ name: "N-acetyl L-cystein", amount: "600 mg" }],
    perUnit: "kapsel",
    ingredientFootnote: "DRI ej fastställd.",
    usage:
      "1–3 kapslar dagligen före måltid, uppdelat under dagen. Svälj med ett glas vatten.",
    warnings:
      STANDARD_WARNINGS +
      " Rådfråga läkare före intag om du tar läkemedel.",
    aiKeywords: [
      "NAC",
      "n-acetylcystein",
      "n-acetyl l-cystein",
      "cystein tillskott",
      "glutation byggsten",
      "antioxidant",
      "rockland",
    ],
    seoTitle: "NAC 60 kapslar — N-acetylcystein 600 mg | Biomax",
    seoDescription:
      "N-acetylcystein 600 mg per kapsel — den acetylerade, stabila formen av aminosyran cystein. Byggsten för glutation. 60 vegetabiliska kapslar från Rockland.",
    seoFocusKw: "NAC n-acetylcystein",
    categorySlug: "immunforsvar",
  },
  // ── 7. Super Probiotika (NEW) ─────────────────────────────────────
  {
    slug: "super-probiotika-60-kapslar",
    sku: "ROCK-PROBIO-60",
    name: "Super Probiotika 60 kapslar",
    price: 255,
    shortDescription:
      "16 probiotiska stammar och FOS som prebiotikum — 100 miljarder CFU per daglig dos. En multi-strain-formel för bred verkan i tarmfloran.",
    longDescription:
      "<p>Super Probiotika är en multi-strain-formel byggd kring 16 stammar av Lactobacillus, Bifidobacterium, Lactococcus och Streptococcus thermophilus — alla välkända släkten inom probiotisk forskning. Tillsammans ger de 100 miljarder CFU (kolonibildande enheter) per daglig dos om två kapslar.</p><p>Multi-strain-formler siktar mot en bred ekologisk effekt i tarmen — flera arter som samverkar — snarare än att maxa en enskild stams aktivitet. Produkten innehåller också FOS (frukto-oligosackarider), en prebiotisk fiber som fungerar som näring åt bakterierna efter intag. Kombinationen probiotika + prebiotika kallas synbiotika.</p><p>Rockland Super Probiotika kommer i vegetabilisk kapsel. Två kapslar utgör en daglig dos.</p>",
    ingredients:
      "FOS (frukto-oligosackarider), 16 mjölksyrabakteriestammar (se nedan), vegetabiliskt kapselskal (hydroxipropylmetylcellulosa).",
    ingredientRows: [
      { name: "FOS (frukto-oligosackarider)", amount: "50 mg" },
      { name: "Bifidobacterium longum", amount: "430 miljoner CFU" },
      { name: "Lactobacillus acidophilus", amount: "430 miljoner CFU" },
      { name: "Bifidobacterium bifidum", amount: "180 miljoner CFU" },
      { name: "Bifidobacterium breve", amount: "180 miljoner CFU" },
      { name: "Bifidobacterium lactis", amount: "180 miljoner CFU" },
      { name: "Lactobacillus brevis", amount: "180 miljoner CFU" },
      { name: "Lactobacillus casei", amount: "180 miljoner CFU" },
      { name: "Lactobacillus helveticus", amount: "180 miljoner CFU" },
      { name: "Lactobacillus paracasei", amount: "180 miljoner CFU" },
      { name: "Lactobacillus plantarum", amount: "180 miljoner CFU" },
      { name: "Lactobacillus reuteri", amount: "180 miljoner CFU" },
      { name: "Lactobacillus rhamnosus", amount: "180 miljoner CFU" },
      { name: "Lactobacillus salivarius", amount: "180 miljoner CFU" },
      { name: "Lactococcus lactis", amount: "180 miljoner CFU" },
      { name: "Streptococcus thermophilus", amount: "180 miljoner CFU" },
      { name: "Lactobacillus gasseri", amount: "90 miljoner CFU" },
    ],
    perUnit: "dagsdos (2 kapslar)",
    ingredientFootnote:
      "Total mängd: 100 miljarder CFU per dagsdos. NRV (EU 1169/2011) ej fastställt.",
    usage:
      "2 kapslar dagligen, helst på fastande mage eller mellan måltider. Drick ett glas vatten till.",
    aiKeywords: [
      "super probiotika",
      "probiotika 100 miljarder",
      "multi-strain probiotika",
      "lactobacillus bifidobacterium",
      "FOS prebiotika",
      "synbiotika",
      "tarmflora kosttillskott",
      "rockland",
    ],
    seoTitle:
      "Super Probiotika 60 kapslar — 16 stammar · 100 miljarder CFU | Biomax",
    seoDescription:
      "Multi-strain-probiotika med 16 stammar Lactobacillus och Bifidobacterium + FOS. 100 miljarder CFU per daglig dos. 60 vegetabiliska kapslar från Rockland.",
    seoFocusKw: "super probiotika",
    categorySlug: "mage-tarm",
  },
];

async function main() {
  for (const s of SEEDS) {
    const category = await prisma.category.findUnique({
      where: { slug: s.categorySlug },
      select: { id: true },
    });
    if (!category) {
      console.error(
        `Category "${s.categorySlug}" not found — skipping ${s.slug}`
      );
      continue;
    }

    const ingredientList = {
      rows: s.ingredientRows,
      perUnit: s.perUnit,
      footnote: s.ingredientFootnote ?? "",
    };

    await prisma.product.upsert({
      where: { slug: s.slug },
      create: {
        slug: s.slug,
        sku: s.sku,
        name: s.name,
        shortDescription: s.shortDescription,
        longDescription: s.longDescription,
        status: s.status ?? "DRAFT",
        price: s.price,
        stock: 0,
        manageStock: true,
        imageUrl: PLACEHOLDER_IMAGE,
        ingredients: s.ingredients,
        ingredientList,
        usage: s.usage,
        storage: s.storage ?? STANDARD_STORAGE,
        warnings: s.warnings ?? STANDARD_WARNINGS,
        aiKeywords: s.aiKeywords,
        seoTitle: s.seoTitle,
        seoDescription: s.seoDescription,
        seoFocusKw: s.seoFocusKw,
        ogTitle: s.seoTitle,
        ogDescription: s.seoDescription,
        internalNote:
          "Seedad 2026-05-12 från användarens .odt-fil. Att göra: lager, vikt + mått, ladda upp produktbild, publicera när kontrollerad.",
        categories: { connect: { id: category.id } },
      },
      update: {
        // Update editorial fields + price. Don't touch imageUrl, stock,
        // manageStock, status — those belong to the editor.
        name: s.name,
        shortDescription: s.shortDescription,
        longDescription: s.longDescription,
        price: s.price,
        ingredients: s.ingredients,
        ingredientList,
        usage: s.usage,
        storage: s.storage ?? STANDARD_STORAGE,
        warnings: s.warnings ?? STANDARD_WARNINGS,
        aiKeywords: s.aiKeywords,
        seoTitle: s.seoTitle,
        seoDescription: s.seoDescription,
        seoFocusKw: s.seoFocusKw,
        ogTitle: s.seoTitle,
        ogDescription: s.seoDescription,
        // Make sure category assignment is correct on re-run.
        categories: { set: [{ id: category.id }] },
      },
    });
    console.log(`✓ ${s.slug.padEnd(36)} ${s.price} kr`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
