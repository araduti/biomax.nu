/**
 * Seed the five Rockland products provided in chat on 2026-05-11.
 *
 * Each product is created as DRAFT with:
 *   - placeholder price/stock (editor fills in)
 *   - placeholder imageUrl (editor uploads via /admin/produkter/[slug])
 *   - drafted copy in traditional-use framing (no medical claims)
 *   - structured ingredientList rows with empty `amount` (editor fills mg/cap)
 *   - mapped to a single primary category per product
 *
 * Re-run safe: upserts by slug.
 *
 * Usage:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/seed-rockland-2026-05.ts
 */
import { prisma } from "@/lib/prisma";

type Seed = {
  slug: string;
  sku: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  ingredients: string;
  ingredientRows: { name: string; amount: string }[];
  perUnit: string;
  usage: string;
  storage: string;
  warnings: string;
  aiKeywords: string[];
  seoTitle: string;
  seoDescription: string;
  seoFocusKw: string;
  categorySlug: string;
};

const PLACEHOLDER_IMAGE = "/products/_placeholder.svg";

const STANDARD_STORAGE =
  "Förvaras torrt och svalt vid rumstemperatur, utom räckhåll för barn.";

const STANDARD_WARNINGS =
  "Rekommenderad daglig dos bör inte överskridas. Kosttillskott är inte avsett att ersätta en varierad och balanserad kost eller en hälsosam livsstil. Gravida, ammande och personer som tar läkemedel bör rådgöra med läkare innan användning.";

const SEEDS: Seed[] = [
  {
    slug: "alpha-lipoic-acid-60-kapslar",
    sku: "ROCK-ALA-60",
    name: "Alpha Lipoic Acid 60 kapslar",
    shortDescription:
      "Alfaliponsyra — en kraftfull antioxidant som kroppen själv producerar i små mängder.",
    longDescription:
      "<p>Alfaliponsyra är ett ämne som finns naturligt i varje cell i kroppen. Det är en av få antioxidanter som är både vatten- och fettlöslig, vilket innebär att den kan arbeta i alla delar av kroppens vävnader.</p><p>Kroppen producerar små mängder själv, men nivåerna sjunker med åldern. Många väljer att komplettera med alfaliponsyra som en del av sin dagliga rutin.</p><p>Rockland Alpha Lipoic Acid är ett rent kosttillskott utan onödiga tillsatser, formulerat för daglig användning.</p>",
    ingredients: "Alfaliponsyra, gelatinkapsel, rismjöl",
    ingredientRows: [
      { name: "Alfaliponsyra", amount: "" },
    ],
    perUnit: "kapsel",
    usage:
      "1 kapsel dagligen, helst på fastande mage eller mellan måltider. Svälj med ett glas vatten.",
    storage: STANDARD_STORAGE,
    warnings: STANDARD_WARNINGS,
    aiKeywords: [
      "alfaliponsyra",
      "alpha lipoic acid",
      "antioxidant",
      "ALA tillskott",
      "fettlöslig antioxidant",
      "vattenlöslig antioxidant",
      "rockland",
    ],
    seoTitle: "Alpha Lipoic Acid 60 kapslar — Rockland alfaliponsyra | Biomax",
    seoDescription:
      "Alfaliponsyra — en universell antioxidant som arbetar i både vatten- och fettlösliga miljöer. 60 kapslar från Rockland. Fri frakt över 599 kr.",
    seoFocusKw: "alfaliponsyra",
    categorySlug: "hjarta-karl",
  },
  {
    slug: "chanca-piedra-60-kapslar",
    sku: "ROCK-CHANCA-60",
    name: "Chanca Piedra 60 kapslar",
    shortDescription:
      "Traditionell sydamerikansk ört som länge använts inom folkmedicinen för urinvägarna.",
    longDescription:
      "<p>Chanca Piedra (Phyllanthus niruri) är en växt som växer vild i Amazonas regnskogar och i delar av Sydamerika. Det portugisiska namnet betyder bokstavligen \"stenkrossaren\" och avspeglar dess långa traditionella användning.</p><p>Inom amazonsk folkmedicin har örten använts i generationer av lokala läkekunniga. Idag är den populär som kosttillskott bland personer som vill stötta sina urinvägar med växtbaserade alternativ.</p><p>Rockland Chanca Piedra erbjuder ren ört-extrakt i kapselform, utan tillsatta sötningsmedel eller färger.</p>",
    ingredients: "Chanca Piedra extrakt, gelatinkapsel, rismjöl",
    ingredientRows: [
      { name: "Chanca Piedra-extrakt (Phyllanthus niruri)", amount: "" },
    ],
    perUnit: "kapsel",
    usage:
      "1–2 kapslar dagligen, helst i samband med måltid. Drick rikligt med vatten under dagen.",
    storage: STANDARD_STORAGE,
    warnings: STANDARD_WARNINGS,
    aiKeywords: [
      "chanca piedra",
      "phyllanthus niruri",
      "njursten naturligt",
      "urinvägar tillskott",
      "stenkrossaren",
      "amazonsk ört",
      "rockland",
    ],
    seoTitle:
      "Chanca Piedra 60 kapslar — traditionell sydamerikansk ört | Biomax",
    seoDescription:
      "Chanca Piedra (Phyllanthus niruri) — en växtbaserad tradition från Amazonas. 60 kapslar från Rockland. Fri frakt över 599 kr.",
    seoFocusKw: "chanca piedra",
    categorySlug: "urinvagsinfektion",
  },
  {
    slug: "colon-aid-60-kapslar",
    sku: "ROCK-COLON-60",
    name: "Colon Aid 60 kapslar",
    shortDescription:
      "Örtblandning för mage och tarm — rödalm, aloe vera, vit ekbark, gentianarot och verbena.",
    longDescription:
      "<p>Colon Aid är en växtbaserad blandning som kombinerar fem traditionella örter med lång användning inom örtmedicinen för mage och tarm: rödalm, aloe vera, vit ekbark, gentianarot och verbena.</p><p>Rödalm (slippery elm) har varit en stapelvara hos nordamerikanska urfolk. Aloe vera och vit ekbark används traditionellt för att stötta tarmens slemhinna. Gentianarot är välkänd inom europeisk växtmedicin som bittermedel. Verbena (järnört) har en plats i både asiatisk och europeisk tradition.</p><p>Rockland Colon Aid erbjuder denna kombination i kapselform med rismjöl och gelatinkapsel som bärare.</p>",
    ingredients:
      "Rödalm, Aloe vera, Vit ekbark, Gentianarot, Verbena, kapsel av gelatin, rismjöl, silica",
    ingredientRows: [
      { name: "Rödalm (Ulmus rubra)", amount: "" },
      { name: "Aloe vera", amount: "" },
      { name: "Vit ekbark (Quercus alba)", amount: "" },
      { name: "Gentianarot (Gentiana lutea)", amount: "" },
      { name: "Verbena (järnört)", amount: "" },
    ],
    perUnit: "kapsel",
    usage:
      "1 kapsel 1–2 gånger dagligen i samband med måltid. Drick ett glas vatten till.",
    storage: STANDARD_STORAGE,
    warnings: STANDARD_WARNINGS,
    aiKeywords: [
      "colon aid",
      "tarmflora tillskott",
      "rödalm slippery elm",
      "vit ekbark",
      "gentianarot",
      "verbena",
      "växtbaserad mage",
      "rockland",
    ],
    seoTitle:
      "Colon Aid 60 kapslar — örtblandning för mage och tarm | Biomax",
    seoDescription:
      "Fem traditionella örter i en kapsel — rödalm, aloe vera, vit ekbark, gentianarot och verbena. Rockland Colon Aid. Fri frakt över 599 kr.",
    seoFocusKw: "colon aid",
    categorySlug: "mage-tarm",
  },
  {
    slug: "dgl-90-tuggtabletter",
    sku: "ROCK-DGL-90",
    name: "DGL 90 tuggtabletter",
    shortDescription:
      "Deglycyrrhiziniserad lakritsrot — lakritsens magstöd utan blodtryckspåverkan.",
    longDescription:
      "<p>DGL står för deglycyrrhiziniserad lakritsrot — en form av lakritsextrakt där ämnet glycyrrhizin har avlägsnats. Glycyrrhizin är det som ger vanlig lakrits dess intensiva smak, men också det som kan påverka blodtryck och kaliumnivåer vid längre tids användning.</p><p>Lakritsrot har använts i traditionell örtmedicin för magslemhinnan i tusentals år, både i Kina och i Europa. DGL-formen bevarar de delar av roten som är förknippade med detta traditionella bruk, samtidigt som de glycyrrhizinrelaterade biverkningarna minimeras.</p><p>Rockland DGL kommer som tuggtablett — många föredrar att tugga lakritstillskott eftersom smaken anses bidra till effekten i mun- och magslemhinnan.</p>",
    ingredients:
      "Deglycyrrhiziniserad lakritsrotsextrakt, magnesiumstearat, cellulosa, silica",
    ingredientRows: [
      {
        name: "Deglycyrrhiziniserad lakritsrotsextrakt (DGL)",
        amount: "",
      },
    ],
    perUnit: "tuggtablett",
    usage:
      "1 tuggtablett 20 minuter före måltid, upp till 3 gånger dagligen. Tugga ordentligt innan den sväljs.",
    storage: STANDARD_STORAGE,
    warnings: STANDARD_WARNINGS,
    aiKeywords: [
      "DGL",
      "deglycyrrhiziniserad lakrits",
      "lakritsrot magslemhinna",
      "lakrits tillskott",
      "tuggtabletter mage",
      "rockland",
    ],
    seoTitle: "DGL 90 tuggtabletter — deglycyrrhiziniserad lakrits | Biomax",
    seoDescription:
      "Lakritsrot i den glycyrrhizinfria DGL-formen. 90 tuggtabletter från Rockland. Fri frakt över 599 kr.",
    seoFocusKw: "DGL lakrits",
    categorySlug: "mage-tarm",
  },
  {
    slug: "harpago-devils-claw-100-kapslar",
    sku: "ROCK-HARPAGO-100",
    name: "Harpago Devil's Claw 100 kapslar",
    shortDescription:
      "Harpagofyt (djävulsklo) med BioPerine — en afrikansk ört med lång användning vid leder.",
    longDescription:
      "<p>Harpagofyt (Harpagophytum procumbens), också kallad djävulsklo eller Devil's Claw, är en växt som växer i Kalahariöknen i södra Afrika. Namnet kommer från fruktens karakteristiska krokar.</p><p>Inom traditionell afrikansk örtmedicin har roten använts i generationer. På 1900-talet introducerades den i Europa och har sedan dess studerats inom modern växtmedicin, främst i samband med leder och rörlighet.</p><p>Rockland Harpago kombinerar harpagofytextrakt med BioPerine, ett standardiserat svartpepparextrakt som traditionellt används för att stötta upptaget av andra växtämnen.</p>",
    ingredients:
      "Harpagofytextrakt (Harpagophytum procumbens), BioPerine svartpepparextrakt, cellulosa, silica, magnesiumstearat, gelatinkapsel",
    ingredientRows: [
      { name: "Harpagofytextrakt (Harpagophytum procumbens)", amount: "" },
      { name: "BioPerine (svartpepparextrakt)", amount: "" },
    ],
    perUnit: "kapsel",
    usage:
      "1–3 kapslar dagligen tillsammans med måltid. Drick ett glas vatten till.",
    storage: STANDARD_STORAGE,
    warnings:
      STANDARD_WARNINGS +
      " Bör inte användas vid magsår eller av personer som tar blodförtunnande läkemedel utan att rådgöra med läkare.",
    aiKeywords: [
      "harpago",
      "devils claw",
      "djävulsklo",
      "harpagophytum procumbens",
      "leder tillskott",
      "rörlighet",
      "bioperine",
      "rockland",
    ],
    seoTitle:
      "Harpago Devil's Claw 100 kapslar — med BioPerine | Biomax",
    seoDescription:
      "Harpagofyt från Kalahari kombinerat med BioPerine svartpepparextrakt. 100 kapslar från Rockland. Fri frakt över 599 kr.",
    seoFocusKw: "harpago devils claw",
    categorySlug: "leder",
  },
];

async function main() {
  for (const s of SEEDS) {
    const category = await prisma.category.findUnique({
      where: { slug: s.categorySlug },
      select: { id: true },
    });
    if (!category) {
      console.error(`Category "${s.categorySlug}" not found — skipping ${s.slug}`);
      continue;
    }

    const ingredientList = {
      rows: s.ingredientRows,
      perUnit: s.perUnit,
      footnote: "",
    };

    await prisma.product.upsert({
      where: { slug: s.slug },
      create: {
        slug: s.slug,
        sku: s.sku,
        name: s.name,
        shortDescription: s.shortDescription,
        longDescription: s.longDescription,
        status: "DRAFT",
        // Placeholders — editor fills in via /admin/produkter/<slug>
        price: 0,
        stock: 0,
        manageStock: true,
        imageUrl: PLACEHOLDER_IMAGE,
        ingredients: s.ingredients,
        ingredientList,
        usage: s.usage,
        storage: s.storage,
        warnings: s.warnings,
        aiKeywords: s.aiKeywords,
        seoTitle: s.seoTitle,
        seoDescription: s.seoDescription,
        seoFocusKw: s.seoFocusKw,
        ogTitle: s.seoTitle,
        ogDescription: s.seoDescription,
        internalNote:
          "Seeded 2026-05-11 from chat. TODO för redaktör: pris, lager, vikt + mått, mg per kapsel/tablett, ladda upp produktbild.",
        categories: { connect: { id: category.id } },
      },
      update: {
        // Update only the fields we're confident about — leave editor's
        // in-flight changes alone. Notably we do NOT touch price/stock/imageUrl
        // on update because those get filled by the editor.
        name: s.name,
        shortDescription: s.shortDescription,
        longDescription: s.longDescription,
        ingredients: s.ingredients,
        ingredientList,
        usage: s.usage,
        storage: s.storage,
        warnings: s.warnings,
        aiKeywords: s.aiKeywords,
        seoTitle: s.seoTitle,
        seoDescription: s.seoDescription,
        seoFocusKw: s.seoFocusKw,
      },
    });
    console.log(`✓ ${s.slug}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
