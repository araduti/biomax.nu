import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getIngredient } from "@/lib/knowledge/ingredients";
import {
  IngredientPinsEditor,
  type PinnedProduct,
} from "@/components/admin/ingredient-pins-editor";

export const metadata = { title: "Pinnade produkter" };
export const dynamic = "force-dynamic";

export default async function AdminIngredientPinPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ing = getIngredient(slug);
  if (!ing) notFound();

  const pins = await prisma.ingredientPin.findMany({
    where: { ingredientSlug: ing.slug },
    orderBy: { position: "asc" },
    select: {
      product: {
        select: {
          slug: true,
          name: true,
          imageUrl: true,
          categories: { select: { name: true }, take: 1 },
        },
      },
    },
  });
  const initialPinned: PinnedProduct[] = pins.map((p) => ({
    slug: p.product.slug,
    name: p.product.name,
    imageUrl: p.product.imageUrl,
    primaryCategory: p.product.categories[0]?.name ?? null,
  }));

  return (
    <>
      <AdminPageHeader
        eyebrow="Ingredienspinnar"
        title={ing.name}
        crumbs={[
          { label: "Innehåll & SEO", href: "/admin" },
          {
            label: "Ingredienspinnar",
            href: "/admin/ingredient-pins",
          },
          { label: ing.name },
        ]}
        subtitle={
          <Link
            href={`/kop/${ing.slug}`}
            target="_blank"
            className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent transition-colors"
          >
            Visa publik /kop-sida ↗
          </Link>
        }
      />

      <div className="bg-surface-alt border border-border rounded-2xl p-6 md:p-8 max-w-[720px]">
        <p className="font-sans text-[13.5px] text-ink-mute mb-5 leading-relaxed">
          Pinnade produkter visas i den ordning de listas. Lämnas listan tom
          faller sidan tillbaka på den automatiska matchningen — alla
          produkter vars ingredienstabell innehåller{" "}
          <em>{ing.name.toLowerCase()}</em> eller någon av dess alias.
        </p>
        <IngredientPinsEditor
          ingredientSlug={ing.slug}
          initialPinned={initialPinned}
        />
      </div>
    </>
  );
}
