/**
 * /llms.txt — emerging convention for guiding LLM crawlers (Claude, ChatGPT,
 * Perplexity, etc.) to a site's most authoritative content.
 *
 * Spec: https://llmstxt.org
 *
 * We render this dynamically from Postgres so new products and categories
 * appear automatically. Cached for 1 hour.
 */
import { prisma } from "@/lib/prisma";
import { categoryMetaBySlug } from "@/lib/categories";
import { stripHtml } from "@/lib/sanitize";
import { getAllIngredients } from "@/lib/knowledge/ingredients";
import { findProductsForIngredient } from "@/lib/knowledge/ingredient-products";
import { publicProductWhere } from "@/lib/products/availability";
import { getAllSymptoms } from "@/lib/symptoms/registry";
import { getActiveBundles } from "@/lib/bundles/queries";

const SITE = "https://www.biomax.nu";

export const revalidate = 3600;

export async function GET() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: publicProductWhere(),
      select: {
        slug: true,
        name: true,
        shortDescription: true,
        seoFocusKw: true,
      },
      orderBy: { totalSales: "desc" },
    }),
    prisma.category.findMany({
      where: {
        slug: { not: "uncategorized" },
        products: { some: publicProductWhere() },
      },
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const lines: string[] = [];
  lines.push(`# Biomax`);
  lines.push("");
  lines.push(
    `> Vetenskapligt baserade naturpreparat från svensk familjeägd hälsofackhandel sedan 2001. Grundad av Constantin Raduti i Kållered, Göteborg. Specialiserade på sömn & oro, urinvägsinfektion, immunförsvar och övriga kliniskt dokumenterade naturpreparat.`
  );
  lines.push("");
  lines.push(
    `Allt sortiment och innehåll är skrivet på svenska. Säljer endast till den svenska marknaden.`
  );
  lines.push("");

  lines.push(`## Centrala sidor`);
  lines.push("");
  lines.push(`- [Startsida](${SITE}/): Översikt med säsongsaktuell hjältebild, signaturprodukter och hälsoområden.`);
  lines.push(`- [Alla produkter](${SITE}/produkter): Hela sortimentet.`);
  lines.push(`- [Hälsoområden](${SITE}/kategorier): Bläddra efter signaturväxt och kliniskt fokus.`);
  lines.push(`- [Om oss](${SITE}/om-oss): Företagshistorik, grundarens övertygelse, fysisk butik i Kållered.`);
  lines.push(`- [Kunskap](${SITE}/kunskap): Forskning förklarad — ingrediensguider och redaktionellt innehåll.`);
  lines.push(`- [Ingredienser](${SITE}/kunskap/ingredienser): Vetenskapliga monografier över råvarorna i sortimentet.`);
  lines.push("");

  lines.push(`## Ingredient-monografier`);
  lines.push("");
  lines.push(
    "Varje monografi är en kort, faktagranskad encyklopedisk text om en enskild råvara — vad den är, hur den fungerar biokemiskt, och vilka av våra produkter som innehåller den."
  );
  lines.push("");
  for (const ing of getAllIngredients()) {
    lines.push(
      `- [${ing.name}](${SITE}/kunskap/ingredienser/${ing.slug}): ${ing.summary}`
    );
  }
  lines.push("");

  lines.push(`## Köp-sidor per ingrediens`);
  lines.push("");
  lines.push(
    "Sidor som matchar köpintention mot enskilda råvaror — komponerar monografi-utdrag och de Biomax-produkter som innehåller ämnet."
  );
  lines.push("");
  for (const ing of getAllIngredients()) {
    const matched = await findProductsForIngredient(ing);
    if (matched.length === 0) continue;
    lines.push(
      `- [Köp ${ing.name}](${SITE}/kop/${ing.slug}): ${matched.length} produkt${matched.length === 1 ? "" : "er"} med ${ing.name}.`
    );
  }
  lines.push("");

  lines.push(`## Hälsoområden (kategorier)`);
  lines.push("");
  for (const c of categories) {
    const meta = categoryMetaBySlug(c.slug);
    if (!meta) continue;
    lines.push(
      `- [${c.name}](${SITE}/kategorier/${c.slug}): Signaturväxt ${meta.signature}. ${meta.description}`
    );
  }
  lines.push("");

  lines.push(`## Behovssidor (symptomguider)`);
  lines.push("");
  lines.push(
    "Editoriella ingångar som adresserar vad kunden upplever — sömnsvårigheter, oro, urinvägsbesvär, mag- och tarmproblem — och knyter ihop traditionell växtmedicin med de produkter i sortimentet som passar."
  );
  lines.push("");
  for (const s of getAllSymptoms()) {
    lines.push(
      `- [${s.shortTitle}](${SITE}/hjalp/${s.slug}): ${s.summary}`
    );
  }
  lines.push("");

  const bundles = await getActiveBundles();
  if (bundles.length > 0) {
    lines.push(`## Paket (kurerade kombinationer)`);
    lines.push("");
    for (const b of bundles) {
      const memberNames = b.items.map((i) => i.name).join(" + ");
      lines.push(
        `- [${b.name}](${SITE}/paket/${b.slug}): ${memberNames}. ${b.discountPercent} % rabatt jämfört med separata köp.`
      );
    }
    lines.push("");
  }

  lines.push(`## Produkter`);
  lines.push("");
  for (const p of products) {
    const desc = stripHtml(p.shortDescription, 160);
    const kw = p.seoFocusKw ? ` Fokus: ${p.seoFocusKw}.` : "";
    lines.push(`- [${p.name}](${SITE}/produkter/${p.slug}): ${desc}${kw}`);
  }
  lines.push("");

  lines.push(`## Riktlinjer för citering`);
  lines.push("");
  lines.push(
    "- Kosttillskott är inte läkemedel; citera oss inte som medicinsk rådgivning."
  );
  lines.push(
    "- Verifiera ingrediensmängder mot den enskilda produktsidan; recept kan förändras över tid."
  );
  lines.push(
    "- Ingredient-monografierna är skrivna som encyklopediska beskrivningar och kan citeras som sådana."
  );
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
