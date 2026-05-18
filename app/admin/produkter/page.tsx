import Link from "next/link";
import Image from "next/image";
import { formatPriceSEK } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { SeoHealthDot } from "@/components/admin/seo-health-dot";
import { AdminStatusPill } from "@/components/admin/admin-status-pill";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getLowStockDefault } from "@/lib/site/settings";
import type {
  Prisma,
  ProductStatus,
  SeoHealthLevel,
} from "@prisma/client";

export const metadata = { title: "Produkter" };

// Map persisted enum → the UI level the existing dot component uses.
const PRISMA_TO_LEVEL = {
  COMPLETE: "complete",
  PARTIAL: "partial",
  NEEDS_WORK: "needs-work",
} as const;
type UiLevel = (typeof PRISMA_TO_LEVEL)[keyof typeof PRISMA_TO_LEVEL];

/**
 * Status filter — defaults to PUBLISHED so the morning view is the
 * live catalogue. Drafts show on demand; archived is reachable for
 * housekeeping but never the default.
 */
type StatusFilter = "published" | "draft" | "archived" | "all";

const STATUS_FILTERS: {
  slug: StatusFilter;
  label: string;
  status?: ProductStatus;
}[] = [
  { slug: "published", label: "Publicerade", status: "PUBLISHED" },
  { slug: "draft", label: "Utkast", status: "DRAFT" },
  { slug: "archived", label: "Arkiverade", status: "ARCHIVED" },
  { slug: "all", label: "Alla" },
];

/**
 * Health filter — surfaces products with SEO health gaps. "Behöver
 * åtgärd" is the action verb here (matches the chip on the dashboard);
 * choosing it isolates the work queue for content editing.
 */
type HealthFilter = "all" | "needs-work" | "partial" | "complete";

const HEALTH_FILTERS: {
  slug: HealthFilter;
  label: string;
  prisma?: SeoHealthLevel;
  color: string;
}[] = [
  { slug: "all", label: "Alla nivåer", color: "bg-ink-mute" },
  { slug: "needs-work", label: "Behöver åtgärd", prisma: "NEEDS_WORK", color: "bg-status-error" },
  { slug: "partial", label: "Delvis", prisma: "PARTIAL", color: "bg-status-warn" },
  { slug: "complete", label: "Komplett", prisma: "COMPLETE", color: "bg-accent-deep" },
];

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    health?: string;
    q?: string;
  }>;
}) {
  const { status: statusParam, health: healthParam, q } = await searchParams;
  const activeStatus =
    STATUS_FILTERS.find((f) => f.slug === statusParam) ?? STATUS_FILTERS[0];
  const activeHealth =
    HEALTH_FILTERS.find((f) => f.slug === healthParam) ?? HEALTH_FILTERS[0];

  const lowStockDefault = await getLowStockDefault();

  const where: Prisma.ProductWhereInput = {};
  if (activeStatus.status) where.status = activeStatus.status;
  if (activeHealth.prisma) where.seoHealthLevel = activeHealth.prisma;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
    ];
  }

  const [products, statusGroups, healthGroups, total] = await Promise.all([
    prisma.product.findMany({
      where,
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
    }),
    // Per-filter counts — render the chip badges without re-querying.
    // GroupBy stays cheap; we're paying for the data we're already
    // showing.
    prisma.product.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.product.groupBy({
      by: ["seoHealthLevel"],
      _count: { _all: true },
    }),
    prisma.product.count(),
  ]);

  const countByStatus = new Map<ProductStatus, number>();
  for (const g of statusGroups) countByStatus.set(g.status, g._count._all);
  const countByHealth = new Map<SeoHealthLevel | null, number>();
  for (const g of healthGroups)
    countByHealth.set(g.seoHealthLevel, g._count._all);

  const countForStatus = (f: (typeof STATUS_FILTERS)[number]) =>
    f.status ? (countByStatus.get(f.status) ?? 0) : total;
  const countForHealth = (f: (typeof HEALTH_FILTERS)[number]) => {
    if (!f.prisma) return total;
    // null seoHealthLevel rows roll into "needs-work" the same way the
    // row render does — keeps the chip count honest.
    if (f.prisma === "NEEDS_WORK")
      return (countByHealth.get("NEEDS_WORK") ?? 0) + (countByHealth.get(null) ?? 0);
    return countByHealth.get(f.prisma) ?? 0;
  };

  function buildHref(next: { status?: string; health?: string; q?: string }) {
    const params = new URLSearchParams();
    const status = next.status ?? activeStatus.slug;
    const health = next.health ?? activeHealth.slug;
    const search = next.q ?? q;
    if (status !== "published") params.set("status", status);
    if (health !== "all") params.set("health", health);
    if (search) params.set("q", search);
    const qs = params.toString();
    return qs ? `/admin/produkter?${qs}` : "/admin/produkter";
  }

  // Title is the surface name; live count moves to the muted `metric`
  // slot. When a filter narrows the list, the metric shows "X av Y" so
  // both the visible and total counts stay legible at a glance.
  const filteredSubtitle =
    products.length !== total
      ? "Aktivt filter — rensa för att se hela katalogen."
      : "Klicka på en produkt för att redigera pris, lager, beskrivning och SEO.";
  const metricLabel =
    total === 0
      ? "Inga"
      : products.length !== total
        ? `${products.length.toLocaleString("sv-SE")} av ${total.toLocaleString("sv-SE")}`
        : `${total.toLocaleString("sv-SE")} ${total === 1 ? "produkt" : "produkter"}`;

  return (
    <>
      <AdminPageHeader
        eyebrow="Katalog"
        title="Produkter"
        metric={metricLabel}
        subtitle={filteredSubtitle}
      />

      {/* Filter chips — status (publicerade / utkast / arkiverade / alla)
          on the leading row; health filter + search on the second row.
          Matches the ordrar list pattern so the muscle memory is one
          gesture across both surfaces. */}
      <div className="flex flex-col gap-3 mb-6">
        <nav aria-label="Status" className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => {
            const isActive = f.slug === activeStatus.slug;
            const count = countForStatus(f);
            return (
              <Link
                key={f.slug}
                href={buildHref({ status: f.slug })}
                className={
                  isActive
                    ? "inline-flex items-center gap-2 px-4 min-h-11 rounded-full bg-primary-deep text-surface font-sans text-small font-semibold"
                    : "inline-flex items-center gap-2 px-4 min-h-11 rounded-full bg-surface-alt border-2 border-border text-ink-body font-sans text-small font-semibold hover:border-primary/40"
                }
              >
                <span>{f.label}</span>
                {count > 0 && (
                  <span
                    className={
                      isActive
                        ? "inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded-full bg-surface/25 text-surface font-sans text-micro font-bold tabular-nums"
                        : "inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded-full bg-ink-mute/15 text-ink-mute font-sans text-micro font-bold tabular-nums"
                    }
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <nav
            aria-label="SEO-hälsa"
            className="flex flex-wrap gap-2"
          >
            {HEALTH_FILTERS.map((f) => {
              const isActive = f.slug === activeHealth.slug;
              const count = countForHealth(f);
              return (
                <Link
                  key={f.slug}
                  href={buildHref({ health: f.slug })}
                  className={
                    isActive
                      ? "inline-flex items-center gap-2 px-3 min-h-9 rounded-full border border-border bg-surface-warm text-ink-body font-sans text-caption font-semibold"
                      : "inline-flex items-center gap-2 px-3 min-h-9 rounded-full border border-border bg-surface-alt text-ink-mute font-sans text-caption font-semibold hover:text-ink-body hover:border-primary/30"
                  }
                >
                  <span
                    aria-hidden
                    className={`inline-block w-2 h-2 rounded-full ${f.color}`}
                  />
                  <span>{f.label}</span>
                  <span className="font-sans text-micro font-bold tabular-nums text-ink-soft">
                    {count}
                  </span>
                </Link>
              );
            })}
          </nav>
          <form action="/admin/produkter" method="get" className="md:ml-auto">
            {activeStatus.slug !== "published" && (
              <input type="hidden" name="status" value={activeStatus.slug} />
            )}
            {activeHealth.slug !== "all" && (
              <input type="hidden" name="health" value={activeHealth.slug} />
            )}
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Sök namn eller SKU"
              className="h-11 px-4 rounded-lg border-2 border-border bg-surface-alt font-sans text-body text-ink placeholder:text-ink-soft outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-w-[260px]"
            />
          </form>
        </div>
      </div>

      <div className="bg-surface-alt border border-border rounded-xl overflow-hidden">
        {products.length === 0 ? (
          <p className="px-5 py-12 text-center font-sans text-body text-ink-mute">
            Inga produkter matchar filtret.
          </p>
        ) : (
          <ul>
            {products.map((p, i) => {
              const threshold = p.lowStockThreshold ?? lowStockDefault;
              const lowStock = p.manageStock && p.stock <= threshold;
              const oos = p.manageStock && p.stock === 0;
              const level: UiLevel = p.seoHealthLevel
                ? PRISMA_TO_LEVEL[p.seoHealthLevel]
                : "needs-work";
              return (
                <li
                  key={p.id}
                  className={i > 0 ? "border-t border-border-soft" : ""}
                >
                  <Link
                    href={`/admin/produkter/${p.slug}`}
                    className="grid grid-cols-[auto_36px_1fr_auto_auto_auto] items-center gap-4 px-5 py-2 hover:bg-surface-warm transition-colors min-h-[52px]"
                  >
                    <SeoHealthDot level={level} />
                    <div className="relative w-9 h-9 rounded-md overflow-hidden bg-surface-warm flex-shrink-0">
                      <Image
                        src={p.imageUrl || "/products/_placeholder.svg"}
                        alt=""
                        fill
                        sizes="36px"
                        className="object-cover mix-blend-darken"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-sans text-body font-semibold tracking-tight text-primary-deep">
                        {p.name}
                      </p>
                      <p className="font-sans text-small text-ink-mute mt-1">
                        {p.sku} · {p.categories[0]?.name ?? "Okategoriserad"} ·{" "}
                        {p.totalSales.toLocaleString("sv-SE")} sålda
                      </p>
                    </div>
                    <AdminStatusPill
                      kind={p.status === "PUBLISHED" ? "ok" : "muted"}
                      icon={p.status === "PUBLISHED" ? "✓" : "◌"}
                    >
                      {p.status === "PUBLISHED" ? "Publicerad" : "Utkast"}
                    </AdminStatusPill>
                    <span
                      className={
                        oos
                          ? "font-sans text-body font-semibold text-status-error whitespace-nowrap tabular-nums"
                          : lowStock
                            ? "font-sans text-body font-semibold text-status-low whitespace-nowrap tabular-nums"
                            : "font-sans text-body text-ink-mute whitespace-nowrap tabular-nums"
                      }
                    >
                      {!p.manageStock ? "∞" : `${p.stock} st`}
                    </span>
                    <span className="font-sans text-body font-semibold text-primary-deep tracking-tight whitespace-nowrap min-w-[80px] text-right tabular-nums">
                      {formatPriceSEK(p.price.toString())}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
