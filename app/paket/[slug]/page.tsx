import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Display, Eyebrow, Accent } from "@/components/ui/typography";
import { formatPriceSEK } from "@/lib/format";
import { getBundleBySlug } from "@/lib/bundles/queries";
import { AddBundleButton } from "@/components/cart/add-bundle-button";

export const revalidate = 600;

type RouteParams = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await getBundleBySlug(slug);
  if (!bundle) return { title: "Paket hittades inte" };
  return {
    title: `${bundle.name} — paket`,
    description:
      bundle.description ||
      `Köp ${bundle.items.map((i) => i.name).join(", ")} tillsammans och spara ${bundle.discountPercent} %.`,
    alternates: { canonical: `/paket/${bundle.slug}` },
  };
}

export default async function BundleDetailPage({
  params,
}: {
  params: RouteParams;
}) {
  const { slug } = await params;
  const bundle = await getBundleBySlug(slug);
  if (!bundle) notFound();

  const crumbs = [
    { label: "Hem", href: "/" },
    { label: "Paket", href: "/paket" },
    { label: bundle.name, href: `/paket/${bundle.slug}` },
  ];

  return (
    <>
      <TopBar />
      <Header />
      <main>
        <div className="max-w-[1240px] mx-auto px-6 md:px-8 pt-8 pb-4">
          <Breadcrumb crumbs={crumbs} />
        </div>

        <section className="max-w-[1240px] mx-auto px-6 md:px-8 py-10 md:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-start">
            {/* Imagery */}
            <div className="bg-surface-warm rounded-2xl p-8 md:p-12">
              <div className="grid grid-cols-2 gap-4">
                {bundle.items.map((it) => (
                  <Link
                    key={it.slug}
                    href={`/produkter/${it.slug}`}
                    className="block aspect-square rounded-xl overflow-hidden bg-surface relative group"
                  >
                    <Image
                      src={it.imageUrl}
                      alt={it.name}
                      fill
                      sizes="(max-width: 768px) 40vw, 240px"
                      className="object-contain mix-blend-darken p-5 group-hover:scale-105 transition-transform"
                    />
                  </Link>
                ))}
              </div>
            </div>

            {/* Detail */}
            <div>
              <Eyebrow className="mb-3">Paket</Eyebrow>
              <Display as="h1" size="xl">
                {bundle.name}
              </Display>
              {bundle.description && (
                <p className="mt-5 font-sans text-base md:text-lg leading-relaxed text-ink-body max-w-[560px]">
                  {bundle.description}
                </p>
              )}

              <ul className="mt-8 space-y-3 font-sans text-[14.5px] text-ink-body border-y border-border py-5">
                {bundle.items.map((it) => (
                  <li
                    key={it.slug}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <Link
                      href={`/produkter/${it.slug}`}
                      className="hover:text-primary-deep underline decoration-accent/30 underline-offset-[3px] hover:decoration-accent"
                    >
                      {it.name}
                    </Link>
                    <span className="text-ink-soft tabular-nums">
                      {formatPriceSEK(it.listPriceSek.toString())}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex items-baseline gap-4">
                <span className="font-display text-4xl font-medium tracking-tight text-primary-deep tabular-nums">
                  {formatPriceSEK(bundle.bundlePriceSek.toString())}
                </span>
                {bundle.savingsSek > 0 && (
                  <span className="font-sans text-lg text-ink-soft line-through tabular-nums">
                    {formatPriceSEK(bundle.listTotalSek.toString())}
                  </span>
                )}
              </div>
              {bundle.savingsSek > 0 && (
                <p className="mt-2 font-sans text-[14px] text-accent-deep font-semibold">
                  Du sparar <Accent>{formatPriceSEK(bundle.savingsSek.toString())}</Accent>{" "}
                  jämfört med att köpa dem var för sig ({bundle.discountPercent} % rabatt).
                </p>
              )}

              <div className="mt-8">
                <AddBundleButton
                  size="lg"
                  bundle={{
                    id: bundle.id,
                    slug: bundle.slug,
                    name: bundle.name,
                    discountPercent: bundle.discountPercent,
                    items: bundle.items.map((it) => ({
                      productId: it.productId,
                      slug: it.slug,
                      name: it.name,
                      imageUrl: it.imageUrl,
                      price: it.listPriceSek.toString(),
                    })),
                  }}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
