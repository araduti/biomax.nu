/**
 * JSON-LD helpers for structured data.
 *
 * Server components inline these via:
 *   <script type="application/ld+json"
 *     dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
 *
 * Per ADR 0005 we use server-rendered JSON-LD (not next/script) so it's
 * present in initial HTML for crawlers and LLMs.
 */

const SITE = "https://www.biomax.nu";

export type Crumb = { label: string; href: string };

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Biomax",
    legalName: "Biomax Handelsbolag",
    identifier: "969676-7939",
    url: SITE,
    foundingDate: "2001-03-28",
    founder: { "@type": "Person", name: "Constantin Raduti" },
    address: {
      "@type": "PostalAddress",
      streetAddress: "Ekenleden 15A",
      postalCode: "428 36",
      addressLocality: "Kållered",
      addressRegion: "Västra Götalands län",
      addressCountry: "SE",
    },
    slogan: "Livskvalitet i fokus",
    description:
      "Vetenskapligt baserade naturpreparat från svensk familjeägd hälsofackhandel sedan 2001.",
  };
}

export function breadcrumbLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: c.href.startsWith("http") ? c.href : `${SITE}${c.href}`,
    })),
  };
}

type ProductLdInput = {
  name: string;
  slug: string;
  sku: string;
  description: string;
  imageUrl: string;
  galleryUrls?: string[];
  price: string | number;
  currency?: string;
  inStock: boolean;
  brand?: string;
  category?: string;
  averageRating?: number | null;
  reviewCount?: number | null;
  /** ISO date string — emitted as schema.org dateModified for E-E-A-T. */
  dateModified?: string | null;
};

export function productLd(p: ProductLdInput) {
  const offer: Record<string, unknown> = {
    "@type": "Offer",
    url: `${SITE}/produkter/${p.slug}`,
    priceCurrency: p.currency ?? "SEK",
    price: p.price.toString(),
    availability: p.inStock
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@type": "Organization", name: "Biomax" },
  };

  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.sku,
    description: p.description,
    image: [p.imageUrl, ...(p.galleryUrls ?? [])]
      .filter(Boolean)
      .map((u) => (u.startsWith("http") ? u : `${SITE}${u}`)),
    brand: { "@type": "Brand", name: p.brand ?? "Biomax" },
    offers: offer,
  };
  if (p.category) ld.category = p.category;
  if (p.dateModified) ld.dateModified = p.dateModified;
  if (p.averageRating && p.reviewCount && p.reviewCount > 0) {
    ld.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: p.averageRating,
      reviewCount: p.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return ld;
}

type ItemListInput = {
  name: string;
  url: string;
  items: { name: string; href: string }[];
};

export function itemListLd({ name, url, items }: ItemListInput) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url: url.startsWith("http") ? url : `${SITE}${url}`,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: it.href.startsWith("http") ? it.href : `${SITE}${it.href}`,
      name: it.name,
    })),
  };
}

export function collectionPageLd(input: {
  name: string;
  description: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url: input.url.startsWith("http") ? input.url : `${SITE}${input.url}`,
    isPartOf: { "@type": "WebSite", name: "Biomax", url: SITE },
  };
}

/**
 * DefinedTerm schema for the ingredient monographs. Avoids `MedicalEntity` /
 * `DietarySupplement` deliberately — those carry regulatory expectations we
 * don't want to assert. DefinedTerm is the same type Wikipedia exposes for
 * encyclopedic entries and is broadly accepted by Google, Bing and LLMs.
 */
export type DefinedTermReference = {
  title: string;
  url: string;
  cite?: string;
  /** Drives the schema.org @type for the citation entry. */
  kind: "pubmed" | "review" | "book" | "web";
};

export function definedTermLd(input: {
  name: string;
  slug: string;
  description: string;
  url: string;
  inLanguage?: string;
  alternateNames?: string[];
  references?: DefinedTermReference[];
}) {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "@id": `${SITE}/kunskap/ingredienser/${input.slug}#term`,
    name: input.name,
    termCode: input.slug,
    description: input.description,
    url: input.url.startsWith("http") ? input.url : `${SITE}${input.url}`,
    inLanguage: input.inLanguage ?? "sv-SE",
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      "@id": `${SITE}/kunskap/ingredienser#termset`,
      name: "Biomax kunskapsbank — Ingredienser",
      url: `${SITE}/kunskap/ingredienser`,
    },
    publisher: { "@type": "Organization", name: "Biomax", url: SITE },
  };
  if (input.alternateNames && input.alternateNames.length > 0) {
    ld.alternateName = input.alternateNames;
  }
  if (input.references && input.references.length > 0) {
    ld.citation = input.references.map((r) => ({
      "@type":
        r.kind === "pubmed"
          ? "ScholarlyArticle"
          : r.kind === "review"
            ? "ScholarlyArticle"
            : r.kind === "book"
              ? "Book"
              : "WebPage",
      name: r.title,
      url: r.url,
      ...(r.cite ? { author: r.cite } : {}),
    }));
  }
  return ld;
}

/**
 * WebSite + SearchAction for the homepage. Drives Google's sitelinks
 * searchbox — the in-SERP search input under our brand result. The
 * `urlTemplate` points at /sok which we wire below; the `{search_term_string}`
 * literal is the Schema.org-mandated placeholder.
 *
 * Render once, on the homepage, *not* on every page (per Google's
 * sitelinks searchbox guidelines).
 */
export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Biomax",
    url: SITE,
    inLanguage: "sv-SE",
    publisher: { "@type": "Organization", name: "Biomax", url: SITE },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE}/sok?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Per-review JSON-LD for a product page. Renders alongside the existing
 * Product+AggregateRating schema so individual reviews show up in
 * Google's review-snippet eligibility check.
 */
export function reviewLd(input: {
  productName: string;
  rating: number;
  body: string;
  authorName: string;
  /** ISO string. */
  datePublished: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "Product",
      name: input.productName,
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: input.rating,
      bestRating: 5,
      worstRating: 1,
    },
    author: { "@type": "Person", name: input.authorName },
    reviewBody: input.body,
    datePublished: input.datePublished,
  };
}

/**
 * FAQPage schema for product pages. Google rewards the rich result and LLMs
 * lift atomic Q&A pairs verbatim — both are well-served by structured FAQ.
 */
export function faqLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: it.answer,
      },
    })),
  };
}
