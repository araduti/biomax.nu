import Link from "next/link";
import { hostTenantScope } from "@/lib/tenant/db";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getAllIngredients } from "@/lib/knowledge/ingredients";

export const metadata = { title: "Pinnade produkter per ingrediens" };
export const dynamic = "force-dynamic";

export default async function AdminIngredientPinsIndexPage() {
  const ingredients = getAllIngredients();
  const pinCounts = await hostTenantScope((tx) =>
    tx.ingredientPin.groupBy({
      by: ["ingredientSlug"],
      _count: { _all: true },
    })
  );
  const countBySlug = new Map(
    pinCounts.map((r) => [r.ingredientSlug, r._count._all])
  );

  return (
    <>
      <AdminPageHeader
        eyebrow="Innehåll & SEO"
        title="Pinnade produkter per ingrediens"
        subtitle="Styr vilka produkter som visas på /kop/[ingrediens]. Tomma listor faller tillbaka på den automatiska matchningen baserat på ingredienstabellen."
        crumbs={[
          { label: "Innehåll & SEO", href: "/admin" },
          { label: "Ingredienspinnar" },
        ]}
      />

      <div className="bg-surface-alt border border-border rounded-xl overflow-hidden">
        <ul>
          {ingredients.map((ing, i) => {
            const count = countBySlug.get(ing.slug) ?? 0;
            return (
              <li
                key={ing.slug}
                className={i > 0 ? "border-t border-border-soft" : ""}
              >
                <Link
                  href={`/admin/ingredient-pins/${ing.slug}`}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-surface-warm transition-colors"
                >
                  <div>
                    <p className="font-sans text-body font-semibold text-primary-deep">
                      {ing.name}
                    </p>
                    <p className="mt-0.5 font-mono text-micro text-ink-soft">
                      /kop/{ing.slug}
                    </p>
                  </div>
                  <span
                    className={
                      "font-sans text-caption tabular-nums " +
                      (count > 0
                        ? "text-accent-deep font-semibold"
                        : "text-ink-soft italic")
                    }
                  >
                    {count > 0 ? `${count} pinnade` : "auto"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
