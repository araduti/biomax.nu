import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductEditForm } from "@/components/admin/product-edit-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductImageUpload } from "@/components/admin/product-image-upload";
import { ProductGalleryEditor } from "@/components/admin/product-gallery-editor";
import { VariantsEditor } from "@/components/admin/variants-editor";
import { SlugRename } from "@/components/admin/slug-rename";
import {
  RelatedProductsEditor,
  type PinnedProduct,
} from "@/components/admin/related-products-editor";
import { ProductGscBlock } from "@/components/admin/product-gsc-block";
import { prisma } from "@/lib/prisma";
import {
  EMPTY_INGREDIENT_LIST,
  parseIngredientList,
} from "@/lib/products/ingredient-list";
import { isDose, type Dose } from "@/lib/products/dose";
import { buildProductFaq } from "@/lib/products/faq";
import { findIngredient } from "@/lib/knowledge/ingredients";
import {
  isGscConfigured,
  getQueriesForPage,
} from "@/lib/integrations/gsc";
import { getQueryHistoryMap } from "@/lib/integrations/gsc-history";
import { getIndexCheck } from "@/lib/integrations/gsc-index-coverage";
import { IndexStatusBadge } from "@/components/admin/index-status-badge";

const SITE = "https://www.biomax.nu";

// Route stays dynamic — admins are authenticated and edits should land
// immediately. The expensive GSC fetch is cached *inside*
// `getQueriesForPage` (30 min, since GSC data lags ~48h anyway), so a
// keystroke-induced re-render doesn't hit the GSC API.

export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      categories: { select: { name: true, slug: true } },
      variants: { orderBy: { position: "asc" } },
    },
  });
  if (!product) notFound();

  // All categories for the multiselect — exclude the synthetic "uncategorized"
  // bucket so editors can't intentionally re-route a product into it.
  const allCategories = await prisma.category.findMany({
    where: { slug: { not: "uncategorized" } },
    select: { slug: true, name: true },
    orderBy: { name: "asc" },
  });

  // Editor-pinned cross-sells, ordered by descending score so the editor sees
  // the same order the public page renders.
  const pinnedRows = await prisma.productCrossSell.findMany({
    where: { sourceProductId: product.id },
    orderBy: { score: "desc" },
    select: {
      targetProduct: {
        select: {
          slug: true,
          name: true,
          imageUrl: true,
          categories: { select: { name: true }, take: 1 },
        },
      },
    },
  });
  const initialPinned: PinnedProduct[] = pinnedRows.map((r) => ({
    slug: r.targetProduct.slug,
    name: r.targetProduct.name,
    imageUrl: r.targetProduct.imageUrl,
    primaryCategory: r.targetProduct.categories[0]?.name ?? null,
  }));

  // Manual FAQ items (if any) — we render as-is in the editor.
  const manualFaq = Array.isArray(product.seoFaqJson)
    ? (product.seoFaqJson as { question: string; answer: string }[]).filter(
        (f) =>
          f && typeof f.question === "string" && typeof f.answer === "string"
      )
    : [];

  // Auto-suggestions: the same FAQ shape the public page would synthesise.
  // Pass to the editor as a "load suggestions" preset.
  const faqSuggestions = buildProductFaq(product);

  // Suggestion chips for AI keywords: pull from category names + matched
  // ingredient slugs in the row list. Cheap, contextual, no LLM call needed.
  const ingredientList = parseIngredientList(product.ingredientList);
  const ingredientSlugSuggestions = ingredientList
    ? Array.from(
        new Set(
          ingredientList.rows
            .map((r) => findIngredient(r.name)?.name.toLowerCase())
            .filter((x): x is string => !!x)
        )
      )
    : [];
  const keywordSuggestions = [
    ...product.categories.map((c) => c.name.toLowerCase()),
    ...ingredientSlugSuggestions,
  ];

  // GSC data — single fetch, fanned out to both the inline analytics block
  // and the keyword-suggestion chips in the editor.
  const gscOn = isGscConfigured();
  const fullPageUrl = `${SITE}/produkter/${product.slug}`;
  const gscRows = gscOn ? await getQueriesForPage(fullPageUrl, 15) : [];

  // Persisted history (DB-backed snapshots) keyed on query string. Empty until
  // the daily cron has run for a few days. Sparklines render gracefully when
  // <2 data points exist.
  const allQueriesOnPage = gscRows
    .map((r) => r.query)
    .filter((q): q is string => !!q);
  const historyMap = gscOn
    ? await getQueryHistoryMap(fullPageUrl, allQueriesOnPage, 14)
    : new Map();

  // Latest URL Inspection verdict for this product. Read from DB only —
  // the live API is heavily rate-limited; the weekly cron writes the table.
  const indexCheck = await getIndexCheck(fullPageUrl);

  // Filter GSC queries to those that aren't already in aiKeywords[] and that
  // have minimal signal — at least one impression, at least 3 chars (Google
  // sometimes returns single-letter or empty queries).
  const existingKwSet = new Set(
    product.aiKeywords.map((k) => k.toLowerCase())
  );
  const gscKeywordSuggestions = gscRows
    .filter(
      (r) =>
        r.query &&
        r.query.length >= 3 &&
        r.impressions > 0 &&
        !existingKwSet.has(r.query.toLowerCase())
    )
    .slice(0, 12)
    .map((r) => ({
      keyword: r.query!,
      clicks: r.clicks,
      impressions: r.impressions,
      position: r.position,
      history: historyMap.get(r.query!) ?? [],
    }));

  const categoryLabel =
    product.categories.map((c) => c.name).join(", ") || "Okategoriserad";

  return (
    <>
      <AdminPageHeader
        eyebrow={`${product.sku} · ${categoryLabel}`}
        title={product.name}
        crumbs={[
          { label: "Drift", href: "/admin" },
          { label: "Produkter", href: "/admin/produkter" },
          { label: product.name },
        ]}
        subtitle={
          <>
            <Link
              href={`/produkter/${product.slug}`}
              target="_blank"
              className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent transition-colors"
            >
              Visa publik produktsida ↗
            </Link>
            {" · "}
            <span>
              {product.totalSales.toLocaleString("sv-SE")} sålda totalt
            </span>
          </>
        }
      />

      {/* All sub-sections flow as divider-separated chunks rather than
          nested bordered cards. The earlier 5-card stack (galleri /
          varianter / relaterade / GSC / edit form, each in a
          `border rounded-xl p-5` wrapper) read as five separate tools
          glued together. Replacing the boxes with hairline dividers
          makes the editor read as one coherent surface — much closer
          to Stripe's stacked-section pattern. */}

      <section className="pb-8 mb-8 border-b border-border-soft">
        <SlugRename currentSlug={product.slug} />
      </section>

      {indexCheck && (
        <section className="pb-8 mb-8 border-b border-border-soft">
          <IndexStatusBadge check={indexCheck} />
        </section>
      )}

      <section className="pb-8 mb-8 border-b border-border-soft">
        <ProductImageUpload
          slug={product.slug}
          initialUrl={product.imageUrl}
          productName={product.name}
        />
      </section>

      <section className="pb-8 mb-8 border-b border-border-soft">
        <h2 className="font-sans text-[15px] md:text-[16px] font-semibold tracking-tight text-primary-deep">
          Galleri
        </h2>
        <p className="mt-1.5 mb-4 font-sans text-[13px] text-ink-mute leading-relaxed max-w-[640px]">
          Extra produktbilder som visas under huvudbilden — t.ex. baksidans
          innehållsdeklaration, en livsstilsbild, eller en närbild på kapslarna.
        </p>
        <ProductGalleryEditor
          slug={product.slug}
          initialUrls={product.galleryUrls}
        />
      </section>

      <section className="pb-8 mb-8 border-b border-border-soft">
        <h2 className="font-sans text-[15px] md:text-[16px] font-semibold tracking-tight text-primary-deep">
          Varianter
        </h2>
        <p className="mt-1.5 mb-4 font-sans text-[13px] text-ink-mute leading-relaxed max-w-[640px]">
          Storlekar, smaker eller styrkor av samma produkt. När minst två
          varianter finns visar produktsidan en väljare i kassan.
        </p>
        <VariantsEditor
          productSlug={product.slug}
          initial={product.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            label: v.label,
            price: v.price.toString(),
            compareAtPrice: v.compareAtPrice ? v.compareAtPrice.toString() : null,
            stock: v.stock,
            manageStock: v.manageStock,
            weight: v.weight ? v.weight.toString() : null,
            isDefault: v.isDefault,
          }))}
        />
      </section>

      <section className="pb-8 mb-8 border-b border-border-soft">
        <h2 className="font-sans text-[15px] md:text-[16px] font-semibold tracking-tight text-primary-deep">
          Relaterade produkter
        </h2>
        <p className="mt-1.5 mb-4 font-sans text-[13px] text-ink-mute leading-relaxed max-w-[640px]">
          Manuellt valda kompletterar produktsidan i den ordning de listas.
          Lämnas listan tom väljs 3 ur samma kategori (mest sålda först).
        </p>
        <RelatedProductsEditor
          sourceSlug={product.slug}
          initialPinned={initialPinned}
        />
      </section>

      <section className="pb-8 mb-8 border-b border-border-soft">
        <ProductGscBlock
          configured={gscOn}
          rows={gscRows}
          histories={historyMap}
        />
      </section>

      <ProductEditForm
        initial={{
          slug: product.slug,
          name: product.name,
          shortDescription: product.shortDescription,
          longDescription: product.longDescription,
          ingredients: product.ingredients ?? "",
          ingredientList:
            parseIngredientList(product.ingredientList) ?? EMPTY_INGREDIENT_LIST,
          usage: product.usage ?? "",
          dosing: isDose(product.dosing) ? (product.dosing as Dose) : null,
          storage: product.storage ?? "",
          warnings: product.warnings ?? "",
          price: product.price.toString(),
          compareAtPrice: product.compareAtPrice
            ? product.compareAtPrice.toString()
            : "",
          stock: product.stock,
          manageStock: product.manageStock,
          status: product.status,
          seoTitle: product.seoTitle ?? "",
          seoDescription: product.seoDescription ?? "",
          seoFocusKw: product.seoFocusKw ?? "",
          ogTitle: product.ogTitle ?? "",
          ogDescription: product.ogDescription ?? "",
          ogImageUrl: product.ogImageUrl ?? "",
          imageUrl: product.imageUrl,
          aiKeywords: product.aiKeywords,
          faqItems: manualFaq,
          faqSuggestions,
          keywordSuggestions,
          gscKeywordSuggestions,
          dateReviewed: product.dateReviewed
            ? product.dateReviewed.toISOString().slice(0, 10)
            : null,
          availableFrom: product.availableFrom
            ? product.availableFrom.toISOString().slice(0, 16)
            : null,
          availableUntil: product.availableUntil
            ? product.availableUntil.toISOString().slice(0, 16)
            : null,
          weight: product.weight ? product.weight.toString() : null,
          lengthCm: product.lengthCm ? product.lengthCm.toString() : null,
          widthCm: product.widthCm ? product.widthCm.toString() : null,
          heightCm: product.heightCm ? product.heightCm.toString() : null,
          lowStockThreshold: product.lowStockThreshold,
          internalNote: product.internalNote,
          featured: product.featured,
          badges: product.badges,
          allergens: product.allergens,
          categorySlugs: product.categories.map((c) => c.slug),
          allCategories,
        }}
      />
    </>
  );
}
