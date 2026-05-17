import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { currentSeason, seasons } from "@/lib/seasons";

const dateFmt = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export const metadata = { title: "Hero-bilder" };
export const dynamic = "force-dynamic";

/**
 * Hero photo manager — list view.
 *
 * One row per `HomepageHero`. Shows thumbnail + name + active window
 * + status pill + "Aktiv nu"-indicator. Tap the row to edit.
 *
 * The "Aktiv nu"-state mirrors the selection logic in
 * `lib/homepage/hero.ts` so editors see the same thing the homepage
 * resolves to. If multiple rows look active here, the one with the
 * highest priority wins live.
 */
export default async function HeroListPage() {
  const heros = await prisma.homepageHero.findMany({
    orderBy: [{ status: "asc" }, { priority: "desc" }, { updatedAt: "desc" }],
  });
  const now = new Date();
  const seasonNow = currentSeason(now);

  // Resolve "active right now" the same way lib/homepage/hero.ts does
  // — exposed here so the editor sees the same answer.
  const activeIds = new Set<string>();
  const published = heros.filter((h) => h.status === "PUBLISHED");
  const eligible = published.filter((h) => {
    if (h.startsAt && h.startsAt > now) return false;
    if (h.endsAt && h.endsAt < now) return false;
    if (h.season && h.season !== seasonNow) return false;
    if (!h.season && !h.startsAt && !h.endsAt) return false;
    return true;
  });
  eligible.sort(
    (a, b) =>
      b.priority - a.priority ||
      b.updatedAt.getTime() - a.updatedAt.getTime()
  );
  if (eligible[0]) activeIds.add(eligible[0].id);

  return (
    <>
      <AdminPageHeader
        eyebrow="Startsidan"
        title="Hero-bilder"
        subtitle="Bilden överst på startsidan. Lägg till nya för säsonger (vår, sommar) eller kampanjer (midsommar, jul, Black Week). Den som matchar dagens datum visas — har du flera som matchar vinner den med högst prioritet."
        crumbs={[
          { label: "Startsidan", href: "/admin/startsida" },
          { label: "Hero-bilder" },
        ]}
      />

      <div className="mb-6">
        <Link
          href="/admin/startsida/hero/ny"
          className="inline-flex items-center gap-2 h-12 px-5 rounded-lg bg-primary-deep text-surface font-sans text-[15px] font-semibold hover:bg-primary transition-colors"
        >
          <span aria-hidden>+</span>
          Lägg till ny hero-bild
        </Link>
      </div>

      <ul className="bg-surface-alt border border-border rounded-xl divide-y divide-border-soft">
        {heros.map((h) => {
          const isActive = activeIds.has(h.id);
          return (
            <li key={h.id}>
              <Link
                href={`/admin/startsida/hero/${h.id}`}
                className="grid grid-cols-[80px_1fr_auto_auto] items-center gap-5 px-5 py-4 hover:bg-surface-warm transition-colors min-h-[88px]"
              >
                <div className="relative w-20 h-12 rounded-lg overflow-hidden bg-surface-warm flex-shrink-0 border border-border-soft">
                  {h.photoUrl && (
                    /* unoptimized: Next/Image can't optimize remote Unsplash
                       photos without an explicit remotePatterns entry; admin
                       thumbnails don't need it. */
                    <Image
                      src={h.photoUrl}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                      unoptimized
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-sans text-[14px] font-semibold tracking-tight text-primary-deep">
                    {h.name}
                  </p>
                  <p className="font-sans text-[13px] text-ink-mute mt-1 truncate">
                    “{h.motif}” · {h.caption}
                  </p>
                  <p className="font-sans text-[12px] text-ink-soft mt-1">
                    {h.season
                      ? `Säsong: ${seasons[h.season].label}`
                      : h.startsAt || h.endsAt
                      ? `${h.startsAt ? dateFmt.format(h.startsAt) : "—"} → ${
                          h.endsAt ? dateFmt.format(h.endsAt) : "—"
                        }`
                      : "Ingen tid satt"}
                    {h.priority > 0 && ` · prio ${h.priority}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isActive && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-deep text-surface font-sans text-[12px] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-surface" />
                      Aktiv nu
                    </span>
                  )}
                  <StatusPill status={h.status} />
                </div>
                <span aria-hidden className="text-primary text-lg">
                  →
                </span>
              </Link>
            </li>
          );
        })}
        {heros.length === 0 && (
          <li className="px-5 py-12 text-center font-sans text-[14px] text-ink-mute italic">
            Inga hero-bilder ännu. Klicka “Lägg till ny hero-bild” för att
            börja.
          </li>
        )}
      </ul>
    </>
  );
}

function StatusPill({ status }: { status: "DRAFT" | "PUBLISHED" | "ARCHIVED" }) {
  const map = {
    DRAFT: { label: "Utkast", bg: "bg-ink-mute/12", color: "text-ink-mute" },
    PUBLISHED: {
      label: "Publicerad",
      bg: "bg-accent-deep/12",
      color: "text-accent-deep",
    },
    ARCHIVED: {
      label: "Arkiverad",
      bg: "bg-status-error/12",
      color: "text-status-error",
    },
  } as const;
  const s = map[status];
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full font-sans text-[12px] font-semibold ${s.bg} ${s.color}`}
    >
      {s.label}
    </span>
  );
}
