import type { Metadata } from "next";
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { isKlarnaConfigured } from "@/lib/klarna/client";
import { currentUser } from "@/lib/session";
import { getTrustpilotSummary } from "@/lib/integrations/trustpilot";
import { prisma } from "@/lib/prisma";
import { CheckoutFlow } from "./checkout-flow";

export const metadata: Metadata = {
  title: "Kassa",
  robots: { index: false, follow: false },
  alternates: { canonical: "/checkout" },
};

export default async function CheckoutPage() {
  const user = await currentUser();
  const klarnaConfigured = isKlarnaConfigured();
  const trustpilot = await getTrustpilotSummary();
  const recommendations = (
    await prisma.product.findMany({
      where: { status: "PUBLISHED" },
      take: 3,
      orderBy: { createdAt: "desc" },
      select: {
        slug: true,
        name: true,
        shortDescription: true,
        imageUrl: true,
        price: true,
      },
    })
  ).map((p) => ({
    slug: p.slug,
    name: p.name,
    sub: p.shortDescription,
    imageUrl: p.imageUrl,
    priceKr: parseFloat(p.price.toString()),
  }));
  return (
    <>
      <TopBar />
      <Header />
      <main className="bg-surface min-h-[60vh]">
        <CheckoutFlow
          klarnaConfigured={klarnaConfigured}
          trustpilot={trustpilot}
          recommendations={recommendations}
          user={
            user
              ? {
                  email: user.email,
                  name: user.name ?? null,
                  // additionalFields from Better Auth config
                  firstName: (user as { firstName?: string | null }).firstName ?? null,
                  lastName: (user as { lastName?: string | null }).lastName ?? null,
                  phone: (user as { phone?: string | null }).phone ?? null,
                }
              : null
          }
        />
      </main>
      <Footer />
    </>
  );
}
