import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getInventory } from "@/lib/admin/inventory";
import { InventoryRowEditor } from "@/components/admin/inventory-row-editor";

export const metadata = { title: "Lager" };
export const dynamic = "force-dynamic";

type RouteParams = {
  searchParams: Promise<{ filter?: string }>;
};

/**
 * Inventory view — every PUBLISHED product (and variant), sorted with
 * the most-urgent rows on top. Each row has an inline "Ändra"-step
 * with a number input + save button so the warehouse can adjust stock
 * without opening the product editor for every SKU.
 *
 * Filter chips: Att åtgärda (out + low) · Slut · Lågt · Allt.
 * Default = Att åtgärda — that's the morning question.
 *
 * For products with ≥2 variants we render one row per variant; the
 * parent product's own `stock` field is ignored for those, matching
 * how the public PDP + checkout already work.
 */
export default async function AdminInventoryPage({
  searchParams,
}: RouteParams) {
  const params = await searchParams;
  const filter = (params.filter ?? "needs-action") as
    | "needs-action"
    | "out"
    | "low"
    | "all";
  const snapshot = await getInventory();

  const visible = snapshot.rows.filter((r) => {
    if (filter === "all") return true;
    if (filter === "out") return r.severity === "out";
    if (filter === "low") return r.severity === "low";
    // "needs-action": out + low combined.
    return r.severity === "out" || r.severity === "low";
  });

  const filterTabs: Array<{
    slug: typeof filter;
    label: string;
    count: number;
  }> = [
    {
      slug: "needs-action",
      label: "Att åtgärda",
      count: snapshot.counts.out + snapshot.counts.low,
    },
    { slug: "out", label: "Slut i lager", count: snapshot.counts.out },
    { slug: "low", label: "Lågt", count: snapshot.counts.low },
    { slug: "all", label: "Allt", count: snapshot.counts.all },
  ];

  const headerTitle =
    visible.length === 0
      ? filter === "needs-action"
        ? "Inget i lagret kräver åtgärd"
        : `Inga produkter (${filter})`
      : `${visible.length} ${visible.length === 1 ? "produkt" : "produkter"}`;

  return (
    <>
      <AdminPageHeader
        eyebrow="Katalog"
        title={headerTitle}
        crumbs={[
          { label: "Katalog" },
          { label: "Lager" },
        ]}
        subtitle={
          filter === "needs-action" && visible.length === 0
            ? `Alla publicerade produkter har lager över sin tröskel (${snapshot.threshold} st).`
            : `Klicka "Ändra" på en rad för att uppdatera lagersaldot. Standardtröskel ${snapshot.threshold} st — sätts per produkt under Produkter.`
        }
      />

      <nav aria-label="Filter" className="flex flex-wrap gap-2 mb-6">
        {filterTabs.map((t) => {
          const isActive = t.slug === filter;
          const href = `/admin/lager?filter=${t.slug}`;
          return (
            <Link
              key={t.slug}
              href={href}
              className={
                isActive
                  ? "inline-flex items-center gap-2 px-4 min-h-11 rounded-full bg-primary-deep text-surface font-sans text-[13.5px] font-semibold"
                  : "inline-flex items-center gap-2 px-4 min-h-11 rounded-full bg-surface-alt border-2 border-border text-ink-body font-sans text-[13.5px] font-semibold hover:border-primary/40"
              }
            >
              <span>{t.label}</span>
              {t.count > 0 && (
                <span
                  className={
                    isActive
                      ? "inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded-full bg-surface/25 text-surface font-sans text-[11.5px] font-bold tabular-nums"
                      : "inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded-full bg-ink-mute/15 text-ink-mute font-sans text-[11.5px] font-bold tabular-nums"
                  }
                >
                  {t.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {visible.length === 0 ? (
        <p className="font-sans text-[14.5px] text-ink-mute italic">
          Inga rader att visa.
        </p>
      ) : (
        <div className="bg-surface-alt border border-border rounded-2xl overflow-hidden">
          <ul>
            {visible.map((row, i) => (
              <li
                key={row.rowId}
                className={i > 0 ? "border-t border-border-soft" : ""}
              >
                <InventoryRowEditor row={row} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
