import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { HeroForm } from "@/components/admin/hero-form";

export const dynamic = "force-dynamic";

export default async function EditHeroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hero = await prisma.homepageHero.findUnique({ where: { id } });
  if (!hero) notFound();

  return (
    <>
      <AdminPageHeader
        eyebrow="Startsidan"
        title={hero.name}
        subtitle="Ändra rubrik, bild, färgton eller när bilden ska visas. Ändringar landar på startsidan inom någon minut."
        crumbs={[
          { label: "Startsidan", href: "/admin/startsida" },
          { label: "Hero-bilder", href: "/admin/startsida/hero" },
          { label: hero.name },
        ]}
      />
      <HeroForm
        initial={{
          id: hero.id,
          name: hero.name,
          motif: hero.motif,
          caption: hero.caption,
          accent: hero.accent,
          photoUrl: hero.photoUrl,
          photoAlt: hero.photoAlt,
          season: hero.season,
          startsAt: hero.startsAt ? hero.startsAt.toISOString() : null,
          endsAt: hero.endsAt ? hero.endsAt.toISOString() : null,
          priority: hero.priority,
          status: hero.status,
        }}
      />
    </>
  );
}
