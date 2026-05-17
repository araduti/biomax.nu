import Image from "next/image";
import Link from "next/link";
import type { Category } from "@prisma/client";
import { Display, Eyebrow, Accent } from "@/components/ui/typography";
import { categoryMetaByName } from "@/lib/categories";
import { Section } from "@/components/ui/section";

type CategoryWithCount = Pick<Category, "id" | "name" | "slug"> & {
  _count: { products: number };
};

export function Categories({ categories }: { categories: CategoryWithCount[] }) {
  // Sort: largest categories first; Uncategorized always excluded earlier.
  const visible = categories
    .filter((c) => c._count.products > 0)
    .sort((a, b) => b._count.products - a._count.products);

  return (
    <Section>
      <>
        <div className="flex flex-wrap justify-between items-end gap-6 mb-12">
          <div>
            <Eyebrow>Sortiment</Eyebrow>
            <Display size="xl" className="mt-3">
              Hitta efter <Accent>hälsoområde</Accent>
            </Display>
          </div>
          <Link
            href="/produkter"
            className="font-sans text-sm font-semibold text-primary border-b border-primary pb-0.5 hover:text-primary-deep hover:border-primary-deep transition-colors"
          >
            Se alla produkter →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((c) => {
            const meta = categoryMetaByName(c.name);
            return (
              <Link
                key={c.id}
                href={`/kategorier/${c.slug}`}
                className="group bg-surface-alt border border-border rounded-2xl p-4 flex items-center gap-5 hover:border-primary/40 transition-colors"
              >
                <div className="relative w-[88px] h-[88px] rounded-xl overflow-hidden flex-shrink-0 bg-surface-warm">
                  {meta && (
                    <Image
                      src={meta.photoUrl}
                      alt={meta.alt}
                      fill
                      sizes="88px"
                      quality={85}
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {meta && (
                    <span className="font-display italic text-xs text-accent-deep tracking-wide block">
                      {meta.latin}
                    </span>
                  )}
                  <h3 className="font-display text-xl md:text-[22px] font-medium tracking-tight text-primary-deep leading-tight my-0.5">
                    {c.name}
                  </h3>
                  <div className="flex justify-between items-baseline gap-2 font-sans text-xs text-ink-mute">
                    {meta && (
                      <span className="font-display italic text-[13px] text-ink-body truncate">
                        {meta.signature}
                      </span>
                    )}
                    <span className="flex-shrink-0">
                      {c._count.products} produkt{c._count.products === 1 ? "" : "er"}
                    </span>
                  </div>
                </div>
                <span aria-hidden className="text-base text-primary flex-shrink-0">
                  →
                </span>
              </Link>
            );
          })}
        </div>
        <p className="mt-6 font-sans text-xs text-ink-soft text-center tracking-wide">
          Varje hälsoområde representeras av sin signaturväxt — den ört vetenskapen och
          Biomax återkommer till.
        </p>
      </>
    </Section>
  );
}
