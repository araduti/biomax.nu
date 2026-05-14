import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { Display, Eyebrow } from "@/components/ui/typography";
import { formatPriceSEK } from "@/lib/format";
import { RoutineLineRemove } from "@/components/account/routine-line-remove";

export const metadata = { title: "Min rutin" };

export default async function RoutinePage() {
  const user = await currentUser();
  if (!user) return null;

  const wl = await prisma.wishlist.findUnique({
    where: { userId: user.id },
    include: {
      items: {
        orderBy: { createdAt: "desc" },
        include: {
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
              imageUrl: true,
              price: true,
              status: true,
            },
          },
        },
      },
    },
  });

  // Hide unpublished products silently — admin may have unpublished one
  // after the customer saved it. We don't delete the WishlistProduct row
  // because the product could come back.
  const visible =
    wl?.items.filter((it) => it.product.status === "PUBLISHED") ?? [];

  return (
    <>
      <Eyebrow>Min rutin</Eyebrow>
      <Display as="h1" size="lg" className="mt-2">
        Min rutin
      </Display>
      <p className="mt-3 font-sans text-[14.5px] text-ink-mute max-w-[620px] leading-relaxed">
        Produkter du tar — eller funderar på att lägga till. Spara dem här så
        hittar du tillbaka utan att börja om från sökrutan varje gång.
      </p>

      {visible.length === 0 ? (
        <div className="mt-10 p-8 rounded-2xl border border-border bg-surface-warm/60 text-center">
          <p className="font-display text-xl text-primary-deep">
            Din rutin är tom
          </p>
          <p className="mt-2 font-sans text-[14px] text-ink-mute max-w-[440px] mx-auto leading-relaxed">
            Tryck på &quot;Spara i min rutin&quot; på en produktsida för att lägga
            till den här.
          </p>
          <Link
            href="/produkter"
            className="mt-5 inline-flex items-center px-5 py-2.5 rounded-md bg-primary-deep text-surface font-sans text-[13.5px] font-semibold hover:bg-primary-deep/90 transition-colors"
          >
            Utforska produkter
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visible.map((it) => (
            <li
              key={it.id}
              className="flex gap-4 items-center bg-surface-alt border border-border rounded-2xl p-4"
            >
              <Link
                href={`/produkter/${it.product.slug}`}
                className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-surface-warm"
              >
                <Image
                  src={it.product.imageUrl || "/products/_placeholder.svg"}
                  alt={it.product.name}
                  fill
                  sizes="80px"
                  className="object-cover mix-blend-darken"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/produkter/${it.product.slug}`}
                  className="font-display text-[15px] md:text-base font-medium text-primary-deep hover:text-primary transition-colors line-clamp-2"
                >
                  {it.product.name}
                </Link>
                <p className="mt-1 font-sans text-[13px] text-ink-mute">
                  {formatPriceSEK(it.product.price.toString())}
                </p>
                <RoutineLineRemove productId={it.product.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
