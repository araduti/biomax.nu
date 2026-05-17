"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { ProductStatus } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// TipTap + ProseMirror is ~150KB gzipped. Lazy-load so the admin product
// list and other admin routes don't pull it; this form is the only caller.
// ssr:false because TipTap touches `window` during init.
const RichTextEditor = dynamic(
  () =>
    import("@/components/ui/rich-text-editor").then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[160px] rounded-lg border border-border bg-surface-alt animate-pulse" />
    ),
  }
);
import { IngredientListEditor } from "@/components/admin/ingredient-list-editor";
import { SeoSnippetPreview } from "@/components/admin/seo-snippet-preview";
import { OgCardPreview } from "@/components/admin/og-card-preview";
import {
  KeywordChipsEditor,
  type GscSuggestion,
} from "@/components/admin/keyword-chips-editor";
import { FaqEditor, type FaqItem } from "@/components/admin/faq-editor";
import { DosingEditor } from "@/components/admin/dosing-editor";
import {
  CategoryMultiselect,
  type CategoryOption,
} from "@/components/admin/category-multiselect";
import { BadgesEditor } from "@/components/admin/badges-editor";
import { AllergenPicker } from "@/components/admin/allergen-picker";
import type { Dose } from "@/lib/products/dose";
import { EditorAnchorRail } from "@/components/admin/editor-anchor-rail";
import { stripHtml } from "@/lib/sanitize";
import type { IngredientList } from "@/lib/products/ingredient-list";
import { updateProduct } from "@/lib/admin/product-actions";

// Anchor-rail sections — order matches the visual flow. "Synlighet"
// was removed when its contents (status + featured + schedule) moved
// to the publish rail on the right. "Pris & lager" was renamed to
// "Lager & frakt" since price/stock now live in the rail; the section
// itself still holds threshold + logistics + internal notes.
const SECTIONS = [
  { id: "grunder", label: "Grunder" },
  { id: "lager-frakt", label: "Lager & frakt" },
  { id: "innehall", label: "Innehåll" },
  { id: "anvandning", label: "Användning" },
  { id: "sokoptimering", label: "Sökoptimering" },
] as const;

const SEO_TABS = [
  { id: "sok", label: "Sök" },
  { id: "social", label: "Sociala kort" },
  { id: "ai", label: "AI-nyckelord" },
  { id: "faq", label: "FAQ" },
] as const;
type SeoTab = (typeof SEO_TABS)[number]["id"];

function FormSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="bg-surface-alt border border-border rounded-xl p-6 md:p-8 scroll-mt-24"
    >
      <header className="mb-6">
        <h2 className="font-display text-[22px] md:text-[26px] font-medium tracking-tight text-primary-deep">
          {title}
        </h2>
        {description && (
          <p className="mt-2 font-sans text-[14.5px] text-ink-mute leading-relaxed max-w-[640px]">
            {description}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}

type Initial = {
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  ingredients: string;
  ingredientList: IngredientList;
  usage: string;
  dosing: Dose | null;
  storage: string;
  warnings: string;
  price: string;
  compareAtPrice: string;
  stock: number;
  manageStock: boolean;
  status: ProductStatus;
  seoTitle: string;
  seoDescription: string;
  seoFocusKw: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  imageUrl: string;
  aiKeywords: string[];
  faqItems: { question: string; answer: string }[];
  faqSuggestions: { question: string; answer: string }[];
  keywordSuggestions: string[];
  gscKeywordSuggestions: GscSuggestion[];
  dateReviewed: string | null;
  availableFrom: string | null;
  availableUntil: string | null;
  weight: string | null;
  lengthCm: string | null;
  widthCm: string | null;
  heightCm: string | null;
  lowStockThreshold: number | null;
  internalNote: string | null;
  featured: boolean;
  badges: string[];
  allergens: string[];
  categorySlugs: string[];
  allCategories: CategoryOption[];
};

export function ProductEditForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [shortDescription, setShortDescription] = useState(initial.shortDescription);
  const [longDescription, setLongDescription] = useState(initial.longDescription);
  const [ingredients, setIngredients] = useState(initial.ingredients);
  const [ingredientList, setIngredientList] = useState<IngredientList>(
    initial.ingredientList
  );
  const [usage, setUsage] = useState(initial.usage);
  const [dosing, setDosing] = useState<Dose | null>(initial.dosing);
  const [storage, setStorage] = useState(initial.storage);
  const [warnings, setWarnings] = useState(initial.warnings);
  const [price, setPrice] = useState(initial.price);
  const [compareAtPrice, setCompareAtPrice] = useState(initial.compareAtPrice);
  const [stock, setStock] = useState(initial.stock.toString());
  const [manageStock, setManageStock] = useState(initial.manageStock);
  const [status, setStatus] = useState<ProductStatus>(initial.status);
  const [seoTitle, setSeoTitle] = useState(initial.seoTitle);
  const [seoDescription, setSeoDescription] = useState(initial.seoDescription);
  const [seoFocusKw, setSeoFocusKw] = useState(initial.seoFocusKw);
  const [ogTitle, setOgTitle] = useState(initial.ogTitle);
  const [ogDescription, setOgDescription] = useState(initial.ogDescription);
  const [ogImageUrl, setOgImageUrl] = useState(initial.ogImageUrl);
  const [aiKeywords, setAiKeywords] = useState<string[]>(initial.aiKeywords);
  const [faqItems, setFaqItems] = useState<FaqItem[]>(initial.faqItems);
  const [dateReviewed, setDateReviewed] = useState<string>(initial.dateReviewed ?? "");
  const [availableFrom, setAvailableFrom] = useState<string>(initial.availableFrom ?? "");
  const [availableUntil, setAvailableUntil] = useState<string>(initial.availableUntil ?? "");
  const [weightInput, setWeightInput] = useState<string>(initial.weight ?? "");
  const [lengthCm, setLengthCm] = useState<string>(initial.lengthCm ?? "");
  const [widthCm, setWidthCm] = useState<string>(initial.widthCm ?? "");
  const [heightCm, setHeightCm] = useState<string>(initial.heightCm ?? "");
  const [lowStockThreshold, setLowStockThreshold] = useState<string>(
    initial.lowStockThreshold !== null ? String(initial.lowStockThreshold) : ""
  );
  const [internalNote, setInternalNote] = useState<string>(initial.internalNote ?? "");
  const [featured, setFeatured] = useState<boolean>(initial.featured);
  const [badges, setBadges] = useState<string[]>(initial.badges);
  const [allergens, setAllergens] = useState<string[]>(initial.allergens);
  const [categorySlugs, setCategorySlugs] = useState<string[]>(initial.categorySlugs);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [seoTab, setSeoTab] = useState<SeoTab>("sok");

  // Dirty tracking — JSON-serialise the working set vs initial. State shape
  // is small enough that the cost is negligible, and this naturally handles
  // "user typed and reverted" → not dirty.
  const dirty = useMemo(() => {
    const current = JSON.stringify({
      name,
      shortDescription,
      longDescription,
      ingredients,
      ingredientList,
      usage,
      dosing,
      storage,
      warnings,
      price,
      compareAtPrice,
      stock,
      manageStock,
      status,
      seoTitle,
      seoDescription,
      seoFocusKw,
      ogTitle,
      ogDescription,
      ogImageUrl,
      aiKeywords,
      faqItems,
      dateReviewed,
      availableFrom,
      availableUntil,
      weightInput,
      lengthCm,
      widthCm,
      heightCm,
      lowStockThreshold,
      internalNote,
      featured,
      badges,
      allergens,
      categorySlugs,
    });
    const baseline = JSON.stringify({
      name: initial.name,
      shortDescription: initial.shortDescription,
      longDescription: initial.longDescription,
      ingredients: initial.ingredients,
      ingredientList: initial.ingredientList,
      usage: initial.usage,
      dosing: initial.dosing,
      storage: initial.storage,
      warnings: initial.warnings,
      price: initial.price,
      compareAtPrice: initial.compareAtPrice,
      stock: initial.stock.toString(),
      manageStock: initial.manageStock,
      status: initial.status,
      seoTitle: initial.seoTitle,
      seoDescription: initial.seoDescription,
      seoFocusKw: initial.seoFocusKw,
      ogTitle: initial.ogTitle,
      ogDescription: initial.ogDescription,
      ogImageUrl: initial.ogImageUrl,
      aiKeywords: initial.aiKeywords,
      faqItems: initial.faqItems,
      dateReviewed: initial.dateReviewed ?? "",
      availableFrom: initial.availableFrom ?? "",
      availableUntil: initial.availableUntil ?? "",
      weightInput: initial.weight ?? "",
      lengthCm: initial.lengthCm ?? "",
      widthCm: initial.widthCm ?? "",
      heightCm: initial.heightCm ?? "",
      lowStockThreshold:
        initial.lowStockThreshold !== null ? String(initial.lowStockThreshold) : "",
      internalNote: initial.internalNote ?? "",
      featured: initial.featured,
      badges: initial.badges,
      allergens: initial.allergens,
      categorySlugs: initial.categorySlugs,
    });
    return current !== baseline;
  }, [
    name, shortDescription, longDescription, ingredients, ingredientList,
    usage, dosing, storage, warnings, price, compareAtPrice, stock, manageStock,
    status, seoTitle, seoDescription, seoFocusKw, ogTitle, ogDescription,
    ogImageUrl, aiKeywords, faqItems, dateReviewed, availableFrom, availableUntil,
    weightInput, lengthCm, widthCm, heightCm, lowStockThreshold, internalNote,
    featured, badges, allergens, categorySlugs, initial,
  ]);

  // Browser-level "you have unsaved changes" guard — fires on tab close,
  // not on internal Next.js navigation (that's a deeper concern we can pick
  // up later when it bites someone).
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);

    const result = await updateProduct({
      slug: initial.slug,
      name,
      shortDescription,
      longDescription,
      ingredients,
      ingredientList,
      usage,
      dosing,
      storage,
      warnings,
      price,
      compareAtPrice: compareAtPrice || null,
      stock: parseInt(stock, 10),
      manageStock,
      status,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      seoFocusKw: seoFocusKw || null,
      ogTitle: ogTitle || null,
      ogDescription: ogDescription || null,
      ogImageUrl: ogImageUrl || null,
      aiKeywords,
      faqItems,
      dateReviewed: dateReviewed ? new Date(dateReviewed) : null,
      availableFrom: availableFrom ? new Date(availableFrom) : null,
      availableUntil: availableUntil ? new Date(availableUntil) : null,
      weight: weightInput || null,
      lengthCm: lengthCm || null,
      widthCm: widthCm || null,
      heightCm: heightCm || null,
      lowStockThreshold:
        lowStockThreshold === "" ? null : parseInt(lowStockThreshold, 10),
      internalNote: internalNote || null,
      featured,
      badges,
      allergens,
      categorySlugs,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <form onSubmit={onSubmit} method="post" action="#" noValidate>
      {/*
        Three-column layout (xl+):
          [anchor rail 140px] [main editor 1fr] [publish rail 280px]

        At `lg` (1024–1279 px) the anchor rail hides — the right rail
        is the highest-leverage column for daily edits (publish state,
        price, stock, category) and 660 px is the smallest comfortable
        main width with a 280 px rail next to it. Anchor reappears at
        `xl` where there's room for all three columns.

        Below `lg` everything stacks: rail first (so high-frequency
        publish controls land above the long edit form), main second,
        anchor hidden entirely (anchors aren't useful on a phone).

        The rail is `sticky` on lg+, pinned 24 px below the topbar.
      */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] xl:grid-cols-[140px_1fr_280px] gap-8 lg:gap-10 pb-24">
        <aside
          aria-label="Publicering & nyckelfält"
          className="lg:order-3 lg:col-start-2 xl:col-start-3 lg:sticky lg:top-20 lg:self-start"
        >
          <PublishRail
            status={status}
            setStatus={setStatus}
            price={price}
            setPrice={setPrice}
            compareAtPrice={compareAtPrice}
            setCompareAtPrice={setCompareAtPrice}
            stock={stock}
            setStock={setStock}
            manageStock={manageStock}
            setManageStock={setManageStock}
            categorySlugs={categorySlugs}
            setCategorySlugs={setCategorySlugs}
            allCategories={initial.allCategories}
            featured={featured}
            setFeatured={setFeatured}
            availableFrom={availableFrom}
            setAvailableFrom={setAvailableFrom}
            availableUntil={availableUntil}
            setAvailableUntil={setAvailableUntil}
          />
        </aside>
        <div className="hidden xl:block xl:order-1">
          <EditorAnchorRail sections={[...SECTIONS]} />
        </div>

        <div className="space-y-6 min-w-0 lg:order-2 xl:order-2">
          {/* ── Grunder ─────────────────────────────────────────── */}
          <FormSection
            id="grunder"
            title="Grunder"
            description="Produktnamn och beskrivningar — det här är basen för både kortet i listan och sidans rubrik."
          >
            <div className="space-y-4">
              <Input
                label="Namn"
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <RichTextEditor
                label="Kort beskrivning"
                value={shortDescription}
                onChange={setShortDescription}
                minHeight="min-h-[120px]"
                placeholder="En till två meningar. Visas i produktkort och Google."
                hint="Håll det kort — visas i produktlistor, sökresultat och delade länkar."
              />
              <RichTextEditor
                label="Lång beskrivning"
                value={longDescription}
                onChange={setLongDescription}
                minHeight="min-h-[360px]"
                placeholder="Skriv ut hela produktbeskrivningen — använd rubriker, punktlistor och länkar."
                hint="Visas på produktsidan. Använd verktygsraden för rubriker, fet/kursiv, listor och länkar."
              />
              <div>
                <p className="font-sans text-[11px] uppercase tracking-[0.2em] font-semibold text-ink-soft mb-2">
                  Märken på kortet
                </p>
                <BadgesEditor values={badges} onChange={setBadges} />
              </div>
              <div className="md:col-span-2">
                <p className="font-sans text-[11px] uppercase tracking-[0.2em] font-semibold text-ink-soft mb-1.5">
                  Allergener (EU 1169/2011)
                </p>
                <p className="font-sans text-[12px] text-ink-mute mb-2.5 leading-snug">
                  Markera alla allergener i produkten. Visas som en framhävd
                  &quot;Innehåller:&quot;-ruta på produktsidan — krävs enligt EU-lag.
                </p>
                <AllergenPicker values={allergens} onChange={setAllergens} />
              </div>
            </div>
          </FormSection>

          {/* ── Pris & lager ────────────────────────────────────── */}
          <FormSection
            id="lager-frakt"
            title="Lager & frakt"
            description="Lågnivå-tröskel, logistikmått och interna anteckningar. Pris, lagersaldo och publiceringsstatus styrs i högerpanelen."
          >
            <div>
              <p className="font-sans text-[11px] uppercase tracking-[0.2em] font-semibold text-ink-soft mb-3">
                Lågnivå-tröskel
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <Input
                  label="Visa &quot;Få kvar&quot; vid"
                  type="number"
                  min="0"
                  value={lowStockThreshold}
                  onChange={(e) =>
                    setLowStockThreshold(
                      e.target.value.replace(/[^0-9]/g, "")
                    )
                  }
                  hint="Lämna tom = använd sajtens standard."
                />
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border-soft">
              <p className="font-sans text-[11px] uppercase tracking-[0.2em] font-semibold text-ink-soft mb-3">
                Logistik (för frakt)
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Input
                  label="Vikt (kg)"
                  type="number"
                  step="0.001"
                  min="0"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                />
                <Input
                  label="Längd (cm)"
                  type="number"
                  step="0.1"
                  min="0"
                  value={lengthCm}
                  onChange={(e) => setLengthCm(e.target.value)}
                />
                <Input
                  label="Bredd (cm)"
                  type="number"
                  step="0.1"
                  min="0"
                  value={widthCm}
                  onChange={(e) => setWidthCm(e.target.value)}
                />
                <Input
                  label="Höjd (cm)"
                  type="number"
                  step="0.1"
                  min="0"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border-soft">
              <p className="font-sans text-[11px] uppercase tracking-[0.2em] font-semibold text-ink-soft mb-2">
                Interna anteckningar
              </p>
              <textarea
                rows={3}
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="t.ex. nästa batch v.24, leverantörsbyte Q3, varningar för support…"
                className="w-full px-3 py-2 bg-surface border border-border rounded-md font-sans text-[13.5px] text-ink-body placeholder:text-ink-soft focus:outline-none focus:border-accent"
              />
              <p className="mt-1.5 font-sans text-[11.5px] text-ink-soft">
                Visas bara i admin — aldrig publikt.
              </p>
            </div>
          </FormSection>

          {/* ── Innehåll ─────────────────────────────────────────── */}
          <FormSection
            id="innehall"
            title="Innehåll"
            description={`Strukturerad innehållsförteckning visas på produktsidans "Innehåll"-flik. Fritext används bara som fallback.`}
          >
            <div className="space-y-6">
              <div>
                <p className="font-sans text-[11px] uppercase tracking-[0.16em] font-semibold text-ink-soft mb-2">
                  Strukturerad tabell
                </p>
                <IngredientListEditor
                  value={ingredientList}
                  onChange={setIngredientList}
                />
              </div>
              <div>
                <p className="font-sans text-[11px] uppercase tracking-[0.16em] font-semibold text-ink-soft mb-2">
                  Fritext (fallback)
                </p>
                <TextArea
                  label="Ingredienser (plain text)"
                  value={ingredients}
                  onChange={(v) => setIngredients(v)}
                  rows={4}
                  hint="Används bara om strukturerad tabell ovan är tom — t.ex. för importerade produkter."
                />
              </div>
            </div>
          </FormSection>

          {/* ── Användning ──────────────────────────────────────── */}
          <FormSection
            id="anvandning"
            title="Användning"
            description="Tre informationsrutor + chips och tidsaxel under Dosering. Tomma rutor visas inte alls; chips och tidsaxel parsas automatiskt från fritexten — eller styrs manuellt nedan."
          >
            <div className="space-y-6">
              <TextArea
                label="Dosering (fritext)"
                value={usage}
                onChange={(v) => setUsage(v)}
                rows={3}
                hint='Visas i Dosering-rutan. Ex.: "1 kapsel dagligen i samband med måltid."'
              />
              <div>
                <p className="font-sans text-[11px] uppercase tracking-[0.2em] font-semibold text-ink-soft mb-2">
                  Chips &amp; tidsaxel
                </p>
                <DosingEditor
                  value={dosing}
                  onChange={setDosing}
                  usageText={usage}
                />
              </div>
              <TextArea
                label="Förvaring"
                value={storage}
                onChange={(v) => setStorage(v)}
                rows={3}
                hint='Ex.: "Förvaras torrt och svalt."'
              />
              <TextArea
                label="Observera"
                value={warnings}
                onChange={(v) => setWarnings(v)}
                rows={3}
                hint='Varningstext / kontraindikationer. Ex.: "Dagsdosen bör ej överskridas."'
              />
            </div>
          </FormSection>

          {/* ── Sökoptimering (super-section with sub-tabs) ─────── */}
          <FormSection
            id="sokoptimering"
            title="Sökoptimering"
            description="Allt som styr hur produkten hittas: Google-snippet, sociala kort, AI-sök och FAQ-strukturerad data."
          >
            <div
              role="tablist"
              aria-label="Sökoptimering-flikar"
              className="flex flex-wrap gap-1 mb-6 border-b border-border-soft"
            >
              {SEO_TABS.map((t) => {
                const isActive = t.id === seoTab;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setSeoTab(t.id)}
                    className={
                      isActive
                        ? "px-3 py-2 -mb-px border-b-2 border-primary font-sans text-[13px] font-semibold text-primary-deep"
                        : "px-3 py-2 -mb-px border-b-2 border-transparent font-sans text-[13px] font-medium text-ink-mute hover:text-ink-body transition-colors"
                    }
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {seoTab === "sok" && (
              <div className="space-y-5">
                <SeoSnippetPreview
                  slug={initial.slug}
                  title={seoTitle.trim() || name}
                  description={
                    seoDescription.trim() ||
                    stripHtml(shortDescription, 160)
                  }
                  seoTitleFilled={!!seoTitle.trim()}
                  seoDescriptionFilled={!!seoDescription.trim()}
                />
                <Input
                  label="SEO-titel"
                  name="seoTitle"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  hint="Visas i Googles sökresultat. Lämna tom för att använda produktnamnet."
                />
                <TextArea
                  label="SEO-beskrivning"
                  value={seoDescription}
                  onChange={(v) => setSeoDescription(v)}
                  rows={3}
                  hint="140–160 tecken är optimalt — kortare faller tillbaka på den korta beskrivningen."
                />
                <Input
                  label="Fokusnyckelord"
                  name="seoFocusKw"
                  value={seoFocusKw}
                  onChange={(e) => setSeoFocusKw(e.target.value)}
                  hint="Det viktigaste sökordet för produkten — internt redaktionellt fält."
                />
                <Input
                  label="Senast granskad"
                  name="dateReviewed"
                  type="date"
                  value={dateReviewed}
                  onChange={(e) => setDateReviewed(e.target.value)}
                  hint="Drives JSON-LD dateModified — Google och LLMs belönar regelbundet granskat innehåll."
                />
              </div>
            )}

            {seoTab === "social" && (
              <div className="space-y-5">
                <p className="font-sans text-[13px] text-ink-mute leading-relaxed">
                  Visas när någon delar produktlänken på Facebook, Slack,
                  LinkedIn, WhatsApp eller iMessage. Lämna tomma för att falla
                  tillbaka på SEO-fälten + produktbilden — eller skriv punchigare
                  för sociala flöden.
                </p>
                <OgCardPreview
                  title={ogTitle.trim() || seoTitle.trim() || name}
                  description={
                    ogDescription.trim() ||
                    seoDescription.trim() ||
                    stripHtml(shortDescription, 200)
                  }
                  imageUrl={ogImageUrl.trim() || initial.imageUrl}
                  ogTitleFilled={!!ogTitle.trim()}
                  ogDescriptionFilled={!!ogDescription.trim()}
                  ogImageFilled={!!ogImageUrl.trim()}
                />
                <Input
                  label="OG-titel (anpassad)"
                  name="ogTitle"
                  value={ogTitle}
                  onChange={(e) => setOgTitle(e.target.value)}
                  hint="Konkurrerar i ett socialt flöde — kan vara mer emotionell än SEO-titeln."
                />
                <TextArea
                  label="OG-beskrivning (anpassad)"
                  value={ogDescription}
                  onChange={(v) => setOgDescription(v)}
                  rows={2}
                  hint="Up till 200 tecken. Skiljer sig från meta-beskrivningen — sociala kort tål mer säljande copy."
                />
                <Input
                  label="OG-bild URL (anpassad)"
                  name="ogImageUrl"
                  value={ogImageUrl}
                  onChange={(e) => setOgImageUrl(e.target.value)}
                  hint="1200×630 idealt. Lämna tom för att använda produktbilden."
                />
              </div>
            )}

            {seoTab === "ai" && (
              <div className="space-y-4">
                <p className="font-sans text-[13px] text-ink-mute leading-relaxed">
                  Intent-kluster för AI-sök (ChatGPT, Claude, Perplexity, Google
                  AI Overviews). Komplement till fokusnyckelordet — här listar
                  du frågor och avsikter som leder en användare till produkten.
                </p>
                <KeywordChipsEditor
                  label="Nyckelord (Enter eller komma för att lägga till)"
                  values={aiKeywords}
                  onChange={setAiKeywords}
                  hint="Exempel: sömnstöd, naturlig stress, återhämtning, magnesiumbrist"
                  suggestions={initial.keywordSuggestions}
                  gscSuggestions={initial.gscKeywordSuggestions}
                />
              </div>
            )}

            {seoTab === "faq" && (
              <div className="space-y-4">
                <p className="font-sans text-[13px] text-ink-mute leading-relaxed">
                  Anpassade FAQ-poster ersätter de automatiskt genererade
                  frågorna i FAQPage-strukturerad data. Skriv som om en kund
                  frågat dig direkt.
                </p>
                <FaqEditor
                  items={faqItems}
                  onChange={setFaqItems}
                  suggestions={initial.faqSuggestions}
                />
              </div>
            )}
          </FormSection>

          {/* "Synlighet" section removed — status, featured-toggle, and
              schedule fields all moved to the publish rail on the right.
              The rail makes those the most-prominent controls on the
              page (matching Stripe's "publish state always visible"
              pattern), and folding them out of the long form removes a
              redundant bottom section. */}
        </div>
      </div>

      {/* Sticky save bar — visible whenever there are unsaved changes,
          plus a brief moment after save so the confirmation isn't fleeting.
          Sidebar is 280 px on lg+; the offset matches the AdminLayout
          shell so the bar doesn't slide under the nav. Visual weight
          deliberately stronger than the public-site equivalent — the
          older audience needs the dirty state to be impossible to miss. */}
      <div
        className={
          dirty || pending || saved || error
            ? "fixed bottom-0 left-0 lg:left-[280px] right-0 bg-surface-alt border-t-2 border-status-warn z-40 px-6 md:px-10 py-4 flex items-center justify-between gap-4 shadow-[0_-6px_24px_rgba(15,32,44,0.12)]"
            : "hidden"
        }
        role="region"
        aria-label="Spara ändringar"
      >
        <div className="font-sans text-[15px] min-w-0 flex-1">
          {error ? (
            <span role="alert" className="text-status-error font-semibold">
              ⚠ {error}
            </span>
          ) : saved ? (
            <span role="status" className="text-accent-deep font-semibold">
              ✓ Sparat
            </span>
          ) : pending ? (
            <span className="text-ink-mute italic">Sparar…</span>
          ) : dirty ? (
            <span className="text-status-warn-text">
              <span className="font-semibold">Osparade ändringar</span>
              <span className="hidden sm:inline text-ink-mute font-normal">
                {" "}
                — glöm inte att spara innan du lämnar sidan.
              </span>
            </span>
          ) : null}
        </div>
        <Button type="submit" disabled={pending || (!dirty && !error)} size="lg">
          {pending ? "Sparar…" : "Spara ändringar"}
        </Button>
      </div>
    </form>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-sans text-[12px] uppercase tracking-[0.16em] font-semibold text-ink-mute">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="px-4 py-3 rounded-lg border border-border bg-surface-alt font-sans text-[14px] text-ink leading-relaxed outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-y"
      />
      {hint && (
        <p className="font-sans text-[12px] text-ink-soft">{hint}</p>
      )}
    </div>
  );
}

/**
 * Publish rail — sticky aside on /admin/produkter/[slug].
 *
 * Surfaces the highest-frequency edit targets (status, price, stock,
 * category, schedule) at all times so they don't sit at the bottom of
 * a 6-section form. The Stripe dashboard pattern: publish state is
 * always visible, supporting edits flow next to it, content edits get
 * the main column.
 *
 * State is passed in from the parent form rather than lifted to a
 * context — the form owns the single source of truth for dirty
 * tracking and the save action, and the rail's fields are part of the
 * same persisted record. Prop-drilling is fine at one level deep.
 *
 * Compact eyebrow + control rhythm; `.admin-shell` already enforces
 * the 44 px input minimum so we don't repeat sizing here.
 */
function PublishRail({
  status,
  setStatus,
  price,
  setPrice,
  compareAtPrice,
  setCompareAtPrice,
  stock,
  setStock,
  manageStock,
  setManageStock,
  categorySlugs,
  setCategorySlugs,
  allCategories,
  featured,
  setFeatured,
  availableFrom,
  setAvailableFrom,
  availableUntil,
  setAvailableUntil,
}: {
  status: ProductStatus;
  setStatus: (s: ProductStatus) => void;
  price: string;
  setPrice: (v: string) => void;
  compareAtPrice: string;
  setCompareAtPrice: (v: string) => void;
  stock: string;
  setStock: (v: string) => void;
  manageStock: boolean;
  setManageStock: (v: boolean) => void;
  categorySlugs: string[];
  setCategorySlugs: (v: string[]) => void;
  allCategories: CategoryOption[];
  featured: boolean;
  setFeatured: (v: boolean) => void;
  availableFrom: string;
  setAvailableFrom: (v: string) => void;
  availableUntil: string;
  setAvailableUntil: (v: string) => void;
}) {
  return (
    <div className="bg-surface-alt border border-border rounded-xl overflow-hidden divide-y divide-border-soft">
      {/* ── Status ─────────────────────────────────────────────── */}
      <RailSection label="Publicering">
        <div className="space-y-1.5">
          {(
            [
              { v: "PUBLISHED", label: "Publicerad", hint: "Synlig på sajten" },
              { v: "DRAFT", label: "Utkast", hint: "Dold för kunder" },
              { v: "ARCHIVED", label: "Arkiverad", hint: "Borttagen från katalogen" },
            ] as { v: ProductStatus; label: string; hint: string }[]
          ).map((opt) => {
            const active = status === opt.v;
            return (
              <label
                key={opt.v}
                className={`flex items-start gap-2.5 px-2.5 py-2 rounded-md cursor-pointer transition-colors ${
                  active ? "bg-surface-warm" : "hover:bg-surface-warm/60"
                }`}
              >
                <input
                  type="radio"
                  name="rail-status"
                  value={opt.v}
                  checked={active}
                  onChange={() => setStatus(opt.v)}
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                />
                <span className="min-w-0">
                  <span className="block font-sans text-[13.5px] font-semibold text-ink-body leading-tight">
                    {opt.label}
                  </span>
                  <span className="block font-sans text-[11.5px] text-ink-soft mt-0.5 leading-snug">
                    {opt.hint}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </RailSection>

      {/* ── Pris ───────────────────────────────────────────────── */}
      <RailSection label="Pris">
        <div className="space-y-3">
          <RailField label="Pris (SEK)" htmlFor="rail-price">
            <input
              id="rail-price"
              type="number"
              step="0.01"
              min="0"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full h-11 px-3 rounded-md border border-border bg-surface font-sans text-[14.5px] tabular-nums text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </RailField>
          <RailField label="Jämförpris" htmlFor="rail-compare">
            <input
              id="rail-compare"
              type="number"
              step="0.01"
              min="0"
              value={compareAtPrice}
              onChange={(e) => setCompareAtPrice(e.target.value)}
              placeholder="Lämna tom om ej rea"
              className="w-full h-11 px-3 rounded-md border border-border bg-surface font-sans text-[14.5px] tabular-nums text-ink placeholder:text-ink-soft outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </RailField>
        </div>
      </RailSection>

      {/* ── Lager ──────────────────────────────────────────────── */}
      <RailSection label="Lager">
        <div className="space-y-3">
          <RailField label="Antal i lager" htmlFor="rail-stock">
            <input
              id="rail-stock"
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              disabled={!manageStock}
              className="w-full h-11 px-3 rounded-md border border-border bg-surface font-sans text-[14.5px] tabular-nums text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-surface-warm disabled:text-ink-soft"
            />
          </RailField>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={manageStock}
              onChange={(e) => setManageStock(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="font-sans text-[12.5px] text-ink-body">
              Hantera lager
            </span>
          </label>
        </div>
      </RailSection>

      {/* ── Kategorier ─────────────────────────────────────────── */}
      <RailSection label="Kategori">
        <CategoryMultiselect
          options={allCategories}
          value={categorySlugs}
          onChange={setCategorySlugs}
        />
      </RailSection>

      {/* ── Schemalägg / framhäv ──────────────────────────────── */}
      <RailSection label="Schemalägg">
        <div className="space-y-3">
          <RailField label="Tillgänglig från" htmlFor="rail-from">
            <input
              id="rail-from"
              type="datetime-local"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
              className="w-full h-11 px-3 rounded-md border border-border bg-surface font-sans text-[13.5px] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </RailField>
          <RailField label="Tillgänglig till" htmlFor="rail-until">
            <input
              id="rail-until"
              type="datetime-local"
              value={availableUntil}
              onChange={(e) => setAvailableUntil(e.target.value)}
              className="w-full h-11 px-3 rounded-md border border-border bg-surface font-sans text-[13.5px] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </RailField>
          <label className="flex items-start gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="w-4 h-4 mt-0.5 flex-shrink-0"
            />
            <span className="min-w-0">
              <span className="block font-sans text-[12.5px] font-semibold text-ink-body leading-tight">
                Säsongsval
              </span>
              <span className="block font-sans text-[11px] text-ink-soft mt-0.5 leading-snug">
                Lyfts på startsidan när säsongen matchar.
              </span>
            </span>
          </label>
        </div>
      </RailSection>
    </div>
  );
}

function RailSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-4">
      <p className="font-sans text-[10.5px] uppercase tracking-[0.16em] font-semibold text-ink-soft mb-3">
        {label}
      </p>
      {children}
    </div>
  );
}

function RailField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="font-sans text-[11.5px] font-semibold text-ink-soft"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
