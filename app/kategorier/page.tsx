import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { hostTenantScope } from "@/lib/tenant/db";
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Display, Eyebrow, Accent } from "@/components/ui/typography";
import { categoryMetaByName } from "@/lib/categories";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbLd } from "@/lib/jsonld";
import { publicProductWhere } from "@/lib/products/availability";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Hälsoområden — alla kategorier",
  description:
    "Bläddra Biomax sortiment efter hälsoområde — sömn & oro, urinvägsinfektion, immunförsvar, leder, hjärta-kärl, mage-tarm, vitaminer & mineraler, kognition.",
  alternates: { canonical: "/kategorier" },
};

export default async function CategoriesIndex() {
  const categories = await hostTenantScope((tx) =>
    tx.category.findMany({
      where: {
        slug: { not: "uncategorized" },
        products: { some: publicProductWhere() },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        _count: { select: { products: { where: publicProductWhere() } } },
      },
      orderBy: { name: "asc" },
    })
  );

  const crumbs = [
    { label: "Hem", href: "/" },
    { label: "Hälsoområden", href: "/kategorier" },
  ];

  return (
    <>
      <TopBar />
      <Header />
      <JsonLd data={breadcrumbLd(crumbs)} />
      <main className="bg-surface min-h-screen">
        <div className="max-w-[1240px] mx-auto px-6 md:px-8 pt-8 pb-4">
          <Breadcrumb crumbs={crumbs} />
        </div>

        <section className="px-6 md:px-8 pb-12">
          <div className="max-w-[1240px] mx-auto">
            <Eyebrow>Sortiment</Eyebrow>
            <Display as="h1" size="xl" className="mt-3 mb-4">
              Hitta efter <Accent>hälsoområde</Accent>
            </Display>
            <p className="font-sans text-base md:text-lg text-ink-mute max-w-[640px]">
              Varje hälsoområde representeras av sin signaturväxt — den ört
              vetenskapen och Biomax återkommer till.
            </p>
          </div>
        </section>

        <section className="px-6 md:px-8 pb-24">
          <div className="max-w-[1240px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
            {categories.map((c) => {
              const meta = categoryMetaByName(c.name);
              if (!meta) return null;
              return (
                <Link
                  key={c.id}
                  href={`/kategorier/${c.slug}`}
                  className="group flex gap-6 items-start"
                >
                  <div className="relative w-[140px] h-[180px] md:w-[180px] md:h-[220px] rounded-2xl overflow-hidden flex-shrink-0 bg-surface-warm border border-border">
                    <Image
                      src={meta.photoUrl}
                      alt={meta.alt}
                      fill
                      sizes="(max-width: 768px) 140px, 180px"
                      quality={85}
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  </div>
                  <div className="flex-1 min-w-0 pt-2">
                    <span className="font-display italic text-sm text-accent-deep">
                      {meta.latin}
                    </span>
                    <Display size="md" className="mt-1 mb-2">
                      {c.name}
                    </Display>
                    <p className="font-sans text-body text-ink-mute leading-relaxed line-clamp-3">
                      {meta.description}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1.5 font-sans text-small font-semibold text-primary border-b border-primary/30 pb-0.5 group-hover:border-primary transition-colors">
                      Utforska {c._count.products} produkt{c._count.products === 1 ? "" : "er"}
                      <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                        →
                      </span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
