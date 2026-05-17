import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CategoryEditForm } from "@/components/admin/category-edit-form";

export const metadata = { title: "Kategori" };
export const dynamic = "force-dynamic";

export default async function AdminCategoryEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      description: true,
      _count: { select: { products: true } },
    },
  });
  if (!category) notFound();

  const products = await prisma.product.findMany({
    where: { categories: { some: { slug } } },
    select: { slug: true, name: true, status: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <AdminPageHeader
        eyebrow="Kategori"
        title={category.name}
        crumbs={[
          { label: "Drift", href: "/admin" },
          { label: "Kategorier", href: "/admin/kategorier" },
          { label: category.name },
        ]}
        subtitle={
          <Link
            href={`/kategorier/${category.slug}`}
            target="_blank"
            className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent transition-colors"
          >
            Visa publik kategorisida ↗
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="bg-surface-alt border border-border rounded-xl p-6 md:p-8">
          <CategoryEditForm
            initial={{
              slug: category.slug,
              name: category.name,
              description: category.description ?? "",
            }}
            productCount={category._count.products}
          />
        </div>

        <aside className="bg-surface-alt border border-border rounded-xl p-5">
          <h2 className="font-sans text-[15px] font-semibold tracking-tight text-primary-deep mb-3">
            Produkter ({products.length})
          </h2>
          {products.length === 0 ? (
            <p className="font-sans text-[12.5px] text-ink-mute italic">
              Inga produkter i kategorin än.
            </p>
          ) : (
            <ul className="space-y-1">
              {products.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/admin/produkter/${p.slug}`}
                    className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-md hover:bg-surface-warm font-sans text-[12.5px]"
                  >
                    <span className="text-primary-deep truncate">{p.name}</span>
                    {p.status !== "PUBLISHED" && (
                      <span className="text-ink-soft text-[10.5px] uppercase tracking-[0.14em]">
                        {p.status === "DRAFT" ? "utkast" : "arkiv"}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </>
  );
}
