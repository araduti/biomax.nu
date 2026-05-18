import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { BundleCreateForm } from "@/components/admin/bundle-create-form";

export const metadata = { title: "Paket" };
export const dynamic = "force-dynamic";

export default async function AdminBundlesPage() {
  const bundles = await prisma.bundle.findMany({
    orderBy: [{ active: "desc" }, { position: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { items: true } } },
  });
  const allProducts = await prisma.product.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <AdminPageHeader
        eyebrow="Drift"
        title={`${bundles.length} paket`}
        subtitle="Kurerade flerproduktspaket på /paket. Bundle-rabatt räknas mot summan av produktpriserna; redaktionellt syfte att lyfta naturliga kombinationer (sömn-paket, mage-paket etc.)."
        crumbs={[
          { label: "Drift", href: "/admin" },
          { label: "Paket" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="bg-surface-alt border border-border rounded-xl overflow-hidden">
          {bundles.length === 0 ? (
            <p className="p-6 font-sans text-body text-ink-mute italic">
              Inga paket än — skapa det första till höger.
            </p>
          ) : (
            <ul>
              {bundles.map((b, i) => (
                <li
                  key={b.id}
                  className={i > 0 ? "border-t border-border-soft" : ""}
                >
                  <Link
                    href={`/admin/paket/${b.slug}`}
                    className={
                      "grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 hover:bg-surface-warm transition-colors " +
                      (b.active ? "" : "opacity-60")
                    }
                  >
                    <div className="min-w-0">
                      <p className="font-sans text-body font-semibold text-primary-deep truncate">
                        {b.name}
                      </p>
                      <p className="mt-0.5 font-mono text-micro text-ink-soft truncate">
                        /paket/{b.slug} · {b.discountPercent} % rabatt
                      </p>
                    </div>
                    <span className="font-sans text-caption text-ink-soft tabular-nums">
                      {b._count.items} produkter
                      {!b.active && (
                        <span className="ml-2 text-status-error uppercase tracking-[0.14em] text-micro font-semibold">
                          inaktiv
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside>
          <h2 className="font-sans text-body-lg font-semibold tracking-tight text-primary-deep">
            Nytt paket
          </h2>
          <p className="mt-1 mb-3 font-sans text-caption text-ink-mute leading-relaxed">
            Minst 2 produkter. Rabatten räknas mot summan av priserna.
          </p>
          <div className="border border-border-soft rounded-xl p-5">
            <BundleCreateForm
              allProducts={allProducts.map((p) => ({ slug: p.slug, name: p.name }))}
            />
          </div>
        </aside>
      </div>
    </>
  );
}
