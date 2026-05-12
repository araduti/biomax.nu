import Link from "next/link";
import Image from "next/image";
import { formatPriceSEK } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSeoHealth } from "@/lib/admin/seo-health";
import { SeoHealthDot } from "@/components/admin/seo-health-dot";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getLowStockDefault } from "@/lib/site/settings";

export const metadata = { title: "Produkter" };

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
      seoTitle: true,
      seoDescription: true,
      seoFocusKw: true,
      shortDescription: true,
      longDescription: true,
      ingredientList: true,
      usage: true,
      warnings: true,
      categories: { select: { name: true }, take: 1 },
    },
  });

  // Aggregate health counts for the header summary line.
  const healthCounts = { complete: 0, partial: 0, "needs-work": 0 };
  const healths = new Map<string, ReturnType<typeof getSeoHealth>>();
  for (const p of products) {
    const h = getSeoHealth(p);
    healths.set(p.id, h);
    healthCounts[h.level]++;
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
            const health = healths.get(p.id)!;
            return (
              <li
                key={p.id}
                className={i > 0 ? "border-t border-border-soft" : ""}
              >
                <Link
                  href={`/admin/produkter/${p.slug}`}
                  className="grid grid-cols-[24px_64px_1fr_auto_auto_auto] items-center gap-4 px-5 py-4 hover:bg-surface-warm transition-colors"
                >
                  <SeoHealthDot health={health} />
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-surface-warm">
                    <Image
                      src={p.imageUrl || "/products/_placeholder.svg"}
                      alt={p.name}
                      fill
                      sizes="64px"
                      className="object-cover mix-blend-darken"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-[15px] font-medium tracking-tight text-primary-deep">
                      {p.name}
                    </p>
                    <p className="font-sans text-[11px] text-ink-mute mt-0.5">
                      {p.sku} · {p.categories[0]?.name ?? "Okategoriserad"} ·{" "}
                      {p.totalSales.toLocaleString("sv-SE")} sålda
                    </p>
                  </div>
                  <span
                    className={
                      p.status === "PUBLISHED"
                        ? "font-sans text-[10px] uppercase tracking-[0.18em] font-bold px-2.5 py-1 rounded-full bg-accent/15 text-accent-deep"
                        : "font-sans text-[10px] uppercase tracking-[0.18em] font-bold px-2.5 py-1 rounded-full bg-surface-warm text-ink-mute"
                    }
                  >
                    {p.status === "PUBLISHED" ? "Publicerad" : p.status}
                  </span>
                  <span
                    className={
                      oos
                        ? "font-sans text-[12px] font-semibold text-[#B5523B] whitespace-nowrap"
                        : lowStock
                          ? "font-sans text-[12px] font-semibold text-accent-deep whitespace-nowrap"
                          : "font-sans text-[12px] text-ink-mute whitespace-nowrap"
                    }
                  >
                    {!p.manageStock ? "Obegränsat" : `${p.stock} st`}
                  </span>
                  <span className="font-display text-[14px] font-medium text-primary-deep tracking-tight whitespace-nowrap min-w-[70px] text-right">
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
