import Link from "next/link";
import { hostTenantScope } from "@/lib/tenant/db";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ReviewModerationRow } from "@/components/admin/review-moderation-row";
import type { ReviewStatus } from "@prisma/client";

export const metadata = { title: "Recensioner" };
export const dynamic = "force-dynamic";

type Tab = "pending" | "approved" | "rejected" | "all";

const TABS: { id: Tab; label: string; status: ReviewStatus | null }[] = [
  { id: "pending", label: "Väntar granskning", status: "PENDING" },
  { id: "approved", label: "Godkända", status: "APPROVED" },
  { id: "rejected", label: "Avvisade", status: "REJECTED" },
  { id: "all", label: "Alla", status: null },
];

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab: Tab =
    rawTab === "approved" || rawTab === "rejected" || rawTab === "all"
      ? rawTab
      : "pending";

  const activeTab = TABS.find((t) => t.id === tab)!;
  const where = activeTab.status ? { status: activeTab.status } : {};

  const { counts, reviews } = await hostTenantScope(async (tx) => {
    const [counts, reviews] = await Promise.all([
      // Tab counts — single grouped query keeps the badge numbers cheap.
      tx.review.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      tx.review.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          rating: true,
          title: true,
          body: true,
          authorName: true,
          verified: true,
          status: true,
          storeResponse: true,
          storeRespondedAt: true,
          createdAt: true,
          product: { select: { slug: true, name: true } },
          user: { select: { name: true, email: true } },
        },
      }),
    ]);
    return { counts, reviews };
  });
  const countByStatus: Record<string, number> = {};
  let total = 0;
  for (const c of counts) {
    countByStatus[c.status] = c._count.status;
    total += c._count.status;
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Innehåll & SEO"
        title="Recensioner"
        subtitle="Granska och moderera kundrecensioner innan de publiceras. Endast godkända recensioner syns publikt och räknas i stjärnbetyget. Avvisa spam, godkänn ärliga åsikter — även kritiska."
        crumbs={[
          { label: "Innehåll & SEO", href: "/admin" },
          { label: "Recensioner" },
        ]}
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => {
          const count =
            t.status === null
              ? total
              : countByStatus[t.status] ?? 0;
          const active = t.id === tab;
          return (
            <Link
              key={t.id}
              href={
                t.id === "pending"
                  ? "/admin/recensioner"
                  : `/admin/recensioner?tab=${t.id}`
              }
              className={
                "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border font-sans text-small transition-colors " +
                (active
                  ? "bg-primary-deep text-surface border-primary-deep"
                  : "bg-surface text-ink-body border-border hover:border-border-soft hover:bg-surface-warm")
              }
            >
              <span>{t.label}</span>
              <span
                className={
                  "tabular-nums text-micro " +
                  (active ? "opacity-80" : "text-ink-soft")
                }
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {reviews.length === 0 ? (
        <p className="font-sans text-body text-ink-mute italic">
          Inga recensioner i denna kategori.
        </p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id}>
              <ReviewModerationRow
                review={{
                  id: r.id,
                  rating: r.rating,
                  title: r.title,
                  body: r.body ?? "",
                  authorDisplay:
                    r.authorName?.trim() ||
                    r.user?.name ||
                    r.user?.email ||
                    "Anonym",
                  authorEmail: r.user?.email ?? null,
                  verified: r.verified,
                  status: r.status,
                  storeResponse: r.storeResponse,
                  storeRespondedAt: r.storeRespondedAt,
                  createdAt: r.createdAt,
                  product: r.product,
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
