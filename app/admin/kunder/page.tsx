import Link from "next/link";
import { Prisma } from "@prisma/client";
import { formatPriceSEK } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { hostTenantScope } from "@/lib/tenant/db";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

const dateFmt = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export const metadata = { title: "Kunder" };

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
        ],
        role: "customer",
      }
    : { role: "customer" };

  const [customers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        legacyWpId: true,
        _count: { select: { orders: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  // Compute lifetime spend per customer in one go for the visible list
  const userIds = customers.map((c) => c.id);
  const emails = customers.map((c) => c.email.toLowerCase());
  const orders = await hostTenantScope((tx) =>
    tx.order.findMany({
      where: {
        OR: [
          { userId: { in: userIds } },
          { email: { in: emails } },
        ],
      },
      select: { userId: true, email: true, totalAmount: true },
    })
  );
  const lifetimeByUser = new Map<string, number>();
  for (const c of customers) {
    const total = orders
      .filter(
        (o) => o.userId === c.id || o.email.toLowerCase() === c.email.toLowerCase()
      )
      .reduce((sum, o) => sum + parseFloat(o.totalAmount.toString()), 0);
    lifetimeByUser.set(c.id, total);
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Beställningar"
        title="Kunder"
        metric={`${total.toLocaleString("sv-SE")} ${total === 1 ? "kund" : "kunder"}`}
        subtitle='Sök på namn eller e-post. Importerade kunder från gamla biomax.nu märks med "arkiverad".'
      />

      <form action="/admin/kunder" method="get" className="mb-6">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Sök på namn eller e-post"
          className="h-12 px-4 rounded-lg border-2 border-border bg-surface-alt font-sans text-body-lg text-ink placeholder:text-ink-soft outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-w-[320px] w-full md:w-auto"
        />
      </form>

      <div className="bg-surface-alt border border-border rounded-xl overflow-hidden">
        <ul>
          {customers.map((c, i) => {
            const fullName =
              c.name ||
              [c.firstName, c.lastName].filter(Boolean).join(" ") ||
              null;
            const lifetime = lifetimeByUser.get(c.id) ?? 0;
            return (
              <li
                key={c.id}
                className={i > 0 ? "border-t border-border-soft" : ""}
              >
                <Link
                  href={`/admin/kunder/${c.id}`}
                  className="grid grid-cols-[1.4fr_2fr_auto_auto_auto] items-center gap-4 px-5 py-2.5 hover:bg-surface-warm transition-colors min-h-[44px]"
                >
                  <div className="min-w-0">
                    <p className="font-sans text-small font-semibold tracking-tight text-primary-deep truncate">
                      {fullName ?? "—"}
                    </p>
                    <p className="font-sans text-caption text-ink-mute mt-1">
                      Skapad {dateFmt.format(c.createdAt)}
                      {c.legacyWpId ? " · arkiverad" : ""}
                    </p>
                  </div>
                  <p className="font-sans text-body text-ink-body truncate">
                    {c.email}
                  </p>
                  <p className="font-sans text-small text-ink-mute whitespace-nowrap tabular-nums">
                    {c._count.orders} ordrar
                  </p>
                  <p className="font-sans text-small font-semibold text-primary-deep tabular-nums whitespace-nowrap min-w-[88px] text-right">
                    {formatPriceSEK(lifetime)}
                  </p>
                  <span aria-hidden className="text-primary text-lg">
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        {total > customers.length && (
          <p className="px-5 py-3 border-t border-border-soft font-sans text-caption text-ink-mute text-center">
            Visar {customers.length} av {total.toLocaleString("sv-SE")}. Sök
            för att hitta en specifik kund.
          </p>
        )}
      </div>
    </>
  );
}
