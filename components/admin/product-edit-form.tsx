"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ProductStatus } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
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
import type { Dose } from "@/lib/products/dose";
import { EditorAnchorRail } from "@/components/admin/editor-anchor-rail";
import { stripHtml } from "@/lib/sanitize";
import type { IngredientList } from "@/lib/products/ingredient-list";
import { updateProduct } from "@/lib/admin/product-actions";

const SECTIONS = [
  { id: "grunder", label: "Grunder" },
  { id: "pris-lager", label: "Pris & lager" },
  { id: "innehall", label: "Innehåll" },
  { id: "anvandning", label: "Användning" },
  { id: "sokoptimering", label: "Sökoptimering" },
  { id: "synlighet", label: "Synlighet" },
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
      className="bg-surface-alt border border-border rounded-2xl p-6 md:p-8 scroll-mt-6"
    >
      <header className="mb-5">
        <h2 className="font-display text-xl md:text-[22px] font-medium tracking-tight text-primary-deep">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 font-sans text-[13px] text-ink-mute leading-relaxed max-w-[640px]">
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
      categorySlugs: initial.categorySlugs,
    });
    return current !== baseline;
  }, [
    name, shortDescription, longDescription, ingredients, ingredientList,
    usage, dosing, storage, warnings, price, compareAtPrice, stock, manageStock,
    status, seoTitle, seoDescription, seoFocusKw, ogTitle, ogDescription,
    ogImageUrl, aiKeywords, faqItems, dateReviewed, availableFrom, availableUntil,
    weightInput, lengthCm, widthCm, heightCm, lowStockThreshold, internalNote,
    featured, badges, categorySlugs, initial,
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
      <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-8 lg:gap-10 pb-24">
        <EditorAnchorRail sections={[...SECTIONS]} />

        <div className="space-y-6 min-w-0">
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
                  Kategorier
                </p>
                <CategoryMultiselect
                  options={initial.allCategories}
                  value={categorySlugs}
                  onChange={setCategorySlugs}
                />
              </div>
              <div>
                <p className="font-sans text-[11px] uppercase tracking-[0.2em] font-semibold text-ink-soft mb-2">
                  Märken på kortet
                </p>
                <BadgesEditor values={badges} onChange={setBadges} />
              </div>
            </div>
          </FormSection>

          {/* ── Pris & lager ────────────────────────────────────── */}
          <FormSection
            id="pris-lager"
            title="Pris & lager"
            description="Visningspris i kassan och lagerstatus. Avaktivera lagerkontroll för obegränsade produkter."
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Pris (SEK)"
                name="price"
                type="number"
                step="0.01"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <Input
                label="Jämförpris (SEK)"
                name="compareAtPrice"
                type="number"
                step="0.01"
                min="0"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                hint="Tidigare pris vid kampanj. Lämna tom om ej rea."
              />
              <Input
                label="Lager"
                name="stock"
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                disabled={!manageStock}
                hint={manageStock ? "Antal i lager." : "Lagerkontroll inaktiverad."}
              />
            </div>
            <label className="flex items-center gap-2 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={manageStock}
                onChange={(e) => setManageStock(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="font-sans text-[13px] text-ink-body">
                Hantera lager
              </span>
            </label>

            <div className="mt-6 pt-6 border-t border-border-soft">
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
                <p className="font-sans text-[11px] uppercase tracking-[0.18em] font-semibold text-ink-soft mb-2">
                  Strukturerad tabell
                </p>
                <IngredientListEditor
                  value={ingredientList}
                  onChange={setIngredientList}
                />
              </div>
              <div>
                <p className="font-sans text-[11px] uppercase tracking-[0.18em] font-semibold text-ink-soft mb-2">
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

          {/* ── Synlighet ───────────────────────────────────────── */}
          <FormSection
            id="synlighet"
            title="Synlighet"
            description="Styr om produkten visas på sajten, ligger som utkast eller är arkiverad."
          >
            <div className="space-y-2">
              {(["PUBLISHED", "DRAFT", "ARCHIVED"] as ProductStatus[]).map(
                (s) => (
                  <label
                    key={s}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="status"
                      value={s}
                      checked={status === s}
                      onChange={() => setStatus(s)}
                      className="w-4 h-4"
                    />
                    <span className="font-sans text-[14px] text-ink-body">
                      {s === "PUBLISHED"
                        ? "Publicerad — synlig på sajten"
                        : s === "DRAFT"
                          ? "Utkast — dold"
                          : "Arkiverad — borttagen från katalogen"}
                    </span>
                  </label>
                )
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-border-soft">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="w-4 h-4 mt-0.5"
                />
                <span>
                  <span className="font-sans text-[14px] text-ink-body font-semibold">
                    Säsongsval
                  </span>
                  <span className="block font-sans text-[11.5px] text-ink-soft mt-0.5 leading-snug">
                    Lyfts på startsidan när aktuell säsong matchar produkten.
                    Senast uppdaterad valbar produkt vinner när flera är
                    markerade.
                  </span>
                </span>
              </label>
            </div>

            <div className="mt-6 pt-6 border-t border-border-soft grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="availableFrom"
                  className="block font-sans text-[12px] font-semibold text-ink-soft mb-1.5"
                >
                  Tillgänglig från
                </label>
                <Input
                  id="availableFrom"
                  type="datetime-local"
                  value={availableFrom}
                  onChange={(e) => setAvailableFrom(e.target.value)}
                />
                <p className="mt-1 font-sans text-[11.5px] text-ink-soft leading-snug">
                  Schemalägg lansering. Lämnas tom = visas direkt.
                </p>
              </div>
              <div>
                <label
                  htmlFor="availableUntil"
                  className="block font-sans text-[12px] font-semibold text-ink-soft mb-1.5"
                >
                  Tillgänglig till
                </label>
                <Input
                  id="availableUntil"
                  type="datetime-local"
                  value={availableUntil}
                  onChange={(e) => setAvailableUntil(e.target.value)}
                />
                <p className="mt-1 font-sans text-[11.5px] text-ink-soft leading-snug">
                  Säsongsdragning. Lämnas tom = ingen automatisk avpublicering.
                </p>
              </div>
            </div>
          </FormSection>
        </div>
      </div>

      {/* Sticky save bar — visible whenever there are unsaved changes,
          plus a brief moment after save so the confirmation isn't fleeting. */}
      <div
        className={
          dirty || pending || saved || error
            ? "fixed bottom-0 left-0 lg:left-[260px] right-0 bg-surface/95 backdrop-blur border-t border-border z-40 px-6 md:px-8 py-3 flex items-center justify-between gap-4 shadow-[0_-4px_20px_rgba(15,32,44,0.06)]"
            : "hidden"
        }
      >
        <div className="font-sans text-[13px] min-w-0 flex-1">
          {error ? (
            <span role="alert" className="text-[#B5523B] font-semibold">
              ⚠ {error}
            </span>
          ) : saved ? (
            <span role="status" className="text-accent-deep font-semibold">
              ✓ Sparat
            </span>
          ) : pending ? (
            <span className="text-ink-mute italic">Sparar…</span>
          ) : dirty ? (
            <span className="text-[#7A4D2A]">
              <span className="font-semibold">Osparade ändringar</span>
              <span className="hidden sm:inline">
                {" "}
                — glöm inte att spara innan du lämnar sidan.
              </span>
            </span>
          ) : null}
        </div>
        <Button type="submit" disabled={pending || (!dirty && !error)} size="lg">
          {pending ? "Sparar…" : "Spara"}
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
      <label className="font-sans text-[12px] uppercase tracking-[0.18em] font-semibold text-ink-mute">
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
