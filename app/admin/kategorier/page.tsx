import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CategoryCreateForm } from "@/components/admin/category-create-form";

export const metadata = { title: "Kategorier" };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: {
      slug: true,
      name: true,
      description: true,
      _count: { select: { products: true } },
    },
  });

  return (
    <>
      <AdminPageHeader
        eyebrow="Drift"
        title={`${categories.length} kategorier`}
        subtitle="Hälsoområden som styr filter, navigation och relaterade produkter. Tänk smalt — bredd kommer från ingredienssidor."
        crumbs={[
          { label: "Drift", href: "/admin" },
          { label: "Kategorier" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="bg-surface-alt border border-border rounded-xl overflow-hidden">
          {categories.length === 0 ? (
            <p className="p-6 font-sans text-[14px] text-ink-mute italic">
              Inga kategorier än — skapa den första till höger.
            </p>
          ) : (
            <ul>
              {categories.map((c, i) => (
                <li
                  key={c.slug}
                  className={i > 0 ? "border-t border-border-soft" : ""}
                >
                  <Link
                    href={`/admin/kategorier/${c.slug}`}
                    className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 hover:bg-surface-warm transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-sans text-[14.5px] font-semibold text-primary-deep truncate">
                        {c.name}
                      </p>
                      <p className="mt-0.5 font-mono text-[11.5px] text-ink-soft truncate">
                        /kategorier/{c.slug}
                      </p>
                    </div>
                    <span className="font-sans text-[12px] text-ink-soft tabular-nums">
                      {c._count.products}{" "}
                      {c._count.products === 1 ? "produkt" : "produkter"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside>
          <h2 className="font-sans text-[15px] font-semibold tracking-tight text-primary-deep">
            Ny kategori
          </h2>
          <p className="mt-1 mb-3 font-sans text-[12.5px] text-ink-mute leading-relaxed">
            Slug genereras från namnet om du lämnar det tomt.
          </p>
          <div className="border border-border-soft rounded-xl p-5">
            <CategoryCreateForm />
          </div>
        </aside>
      </div>
    </>
  );
}
