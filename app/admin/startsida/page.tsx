import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { HomepageBlocksEditor } from "@/components/admin/homepage-blocks-editor";
import { DEFAULT_BLOCKS } from "@/lib/homepage/blocks";

export const metadata = { title: "Startsidan" };
export const dynamic = "force-dynamic";

export default async function AdminHomepagePage() {
  const blocks = await prisma.homepageBlock.findMany({
    orderBy: { position: "asc" },
  });

  return (
    <>
      <AdminPageHeader
        eyebrow="Innehåll & SEO"
        title="Startsidan"
        subtitle="Styr ordningen och vilka block som visas på startsidan. Tom tabell = startsidan renderas från koden (samma utseende som idag). Klicka &quot;Seed from defaults&quot; för att börja redigera."
        crumbs={[
          { label: "Innehåll & SEO", href: "/admin" },
          { label: "Startsidan" },
        ]}
      />

      <div className="mb-8 bg-surface-warm border border-accent/30 rounded-2xl p-5 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[280px]">
          <p className="font-display text-[18px] font-medium tracking-tight text-primary-deep">
            Hero-bilder
          </p>
          <p className="font-sans text-[13.5px] text-ink-mute mt-1 leading-relaxed">
            Bilden överst på startsidan. Hanteras separat med säsonger och
            kampanjdatum — t.ex. en bild för midsommar eller jul.
          </p>
        </div>
        <Link
          href="/admin/startsida/hero"
          className="inline-flex items-center gap-2 h-12 px-5 rounded-lg bg-primary-deep text-surface font-sans text-[15px] font-semibold hover:bg-primary transition-colors"
        >
          Hantera hero-bilder →
        </Link>
      </div>

      <HomepageBlocksEditor
        blocks={blocks.map((b) => ({
          id: b.id,
          kind: b.kind as (typeof DEFAULT_BLOCKS)[number]["kind"],
          position: b.position,
          active: b.active,
        }))}
      />
    </>
  );
}
