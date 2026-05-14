import Link from "next/link";
import Image from "next/image";
import { formatPriceSEK } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { SeoHealthDot } from "@/components/admin/seo-health-dot";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getLowStockDefault } from "@/lib/site/settings";

export const metadata = { title: "Produkter" };

// Map persisted enum → the UI level the existing dot component uses.
const PRISMA_TO_LEVEL = {
  COMPLETE: "complete",
  PARTIAL: "partial",
  NEEDS_WORK: "needs-work",
} as const;
type UiLevel = (typeof PRISMA_TO_LEVEL)[keyof typeof PRISMA_TO_LEVEL];

export default async function AdminProductsPage() {
  const lowStockDefault = await getLowStockDefault();
  const products = await prisma.product.findMany({
    orderBy: [{ status: "asc" }, { totalSales: "desc" }],
    select: {
      id: true,
      slug: true,
      sku: true,
      name: true,
      imageUrl: true,
      price: true,
      stock: true,
      manageStock: true,
      lowStockThreshold: true,
      totalSales: true,
      status: true,
      // Persisted on product save (see lib/admin/post-save-sync.ts).
      // Lets the list render the health dot without re-fetching
      // longDescription + ingredientList JSON for every row.
      seoHealthLevel: true,
      categories: { select: { name: true }, take: 1 },
    },
  });

  // Aggregate health counts for the header summary line. Rows where the
  // level is still null (pre-backfill / freshly seeded) are treated as
  // "needs-work" so they get attention.
  const healthCounts = { complete: 0, partial: 0, "needs-work": 0 };
  const levels = new Map<string, UiLevel>();
  for (const p of products) {
    const level: UiLevel = p.seoHealthLevel
      ? PRISMA_TO_LEVEL[p.seoHealthLevel]
      : "needs-work";
    levels.set(p.id, level);
    healthCounts[level]++;
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Drift"
        title={`${products.length} produkter`}
        subtitle="Klicka på en produkt för att redigera pris, lager, beskrivning och SEO. SEO-statusprick visas till vänster om varje rad."
      />

      <div className="flex flex-wrap gap-2 mb-6 font-sans text-[12px]">
        <HealthChip color="bg-accent-deep" label="Komplett" count={healthCounts.complete} />
        <HealthChip color="bg-[#C68A4F]" label="Delvis" count={healthCounts.partial} />
        <HealthChip color="bg-[#B5523B]" label="Behöver åtgärd" count={healthCounts["needs-work"]} />
      </div>

      <div className="bg-surface-alt border border-border rounded-2xl overflow-visible">
        <ul>
          {products.map((p, i) => {
            const threshold = p.lowStockThreshold ?? lowStockDefault;
            const lowStock = p.manageStock && p.stock <= threshold;
            const oos = p.manageStock && p.stock === 0;
            const level = levels.get(p.id) ?? "needs-work";
            return (
              <li
                key={p.id}
                className={i > 0 ? "border-t border-border-soft" : ""}
              >
                <Link
                  href={`/admin/produkter/${p.slug}`}
                  className="admin-row-h grid grid-cols-[110px_80px_1fr_auto_auto_auto] items-center gap-4 px-5 py-3 hover:bg-surface-warm transition-colors"
                >
                  <SeoHealthDot level={level} />
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-surface-warm">
                    <Image
                      src={p.imageUrl || "/products/_placeholder.svg"}
                      alt={p.name}
                      fill
                      sizes="80px"
                      className="object-cover mix-blend-darken"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-[16px] font-medium tracking-tight text-primary-deep">
                      {p.name}
                    </p>
                    <p className="font-sans text-[13px] text-ink-mute mt-1">
                      {p.sku} · {p.categories[0]?.name ?? "Okategoriserad"} ·{" "}
                      {p.totalSales.toLocaleString("sv-SE")} sålda
                    </p>
                  </div>
                  <span
                    className={
                      p.status === "PUBLISHED"
                        ? "inline-flex items-center gap-1.5 font-sans text-[12.5px] font-semibold px-2.5 py-1 rounded-full bg-accent/15 text-accent-deep"
                        : "inline-flex items-center gap-1.5 font-sans text-[12.5px] font-semibold px-2.5 py-1 rounded-full bg-ink-mute/15 text-ink-mute"
                    }
                  >
                    <span aria-hidden>
                      {p.status === "PUBLISHED" ? "✓" : "◌"}
                    </span>
                    {p.status === "PUBLISHED" ? "Publicerad" : "Utkast"}
                  </span>
                  <span
                    className={
                      oos
                        ? "font-sans text-[14px] font-semibold text-[#B5523B] whitespace-nowrap tabular-nums"
                        : lowStock
                          ? "font-sans text-[14px] font-semibold text-[#8A5A2C] whitespace-nowrap tabular-nums"
                          : "font-sans text-[14px] text-ink-mute whitespace-nowrap tabular-nums"
                    }
                  >
                    {!p.manageStock ? "∞" : `${p.stock} st`}
                  </span>
                  <span className="font-display text-[16px] font-medium text-primary-deep tracking-tight whitespace-nowrap min-w-[80px] text-right tabular-nums">
                    {formatPriceSEK(p.price.toString())}
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

function HealthChip({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-alt px-3 py-1.5">
      <span aria-hidden className={`inline-block w-2 h-2 rounded-full ${color}`} />
      <span className="font-sans font-semibold text-ink-body">{count}</span>
      <span className="font-sans text-ink-mute">{label}</span>
    </span>
  );
}
