import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { BundleEditForm } from "@/components/admin/bundle-edit-form";

export const metadata = { title: "Paket" };
export const dynamic = "force-dynamic";

export default async function AdminBundleEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const bundle = await prisma.bundle.findUnique({
    where: { slug },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { product: { select: { slug: true, name: true } } },
      },
    },
  });
  if (!bundle) notFound();

  const allProducts = await prisma.product.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <AdminPageHeader
        eyebrow="Paket"
        title={bundle.name}
        crumbs={[
          { label: "Drift", href: "/admin" },
          { label: "Paket", href: "/admin/paket" },
          { label: bundle.name },
        ]}
        subtitle={
          <Link
            href={`/paket`}
            target="_blank"
            className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent transition-colors"
          >
            Visa publik paketsida ↗
          </Link>
        }
      />

      <div className="bg-surface-alt border border-border rounded-2xl p-6 md:p-8 max-w-[720px]">
        <BundleEditForm
          initial={{
            slug: bundle.slug,
            name: bundle.name,
            description: bundle.description ?? "",
            discountPercent: bundle.discountPercent,
            active: bundle.active,
            productSlugs: bundle.items.map((it) => it.product.slug),
          }}
          allProducts={allProducts}
        />
      </div>
    </>
  );
}
