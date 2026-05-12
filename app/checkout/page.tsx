import type { Metadata } from "next";
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { isKlarnaConfigured } from "@/lib/klarna/client";
import { currentUser } from "@/lib/session";
import { CheckoutFlow } from "./checkout-flow";

export const metadata: Metadata = {
  title: "Kassa",
  robots: { index: false, follow: false },
  alternates: { canonical: "/checkout" },
};

export default async function CheckoutPage() {
  const user = await currentUser();
  const klarnaConfigured = isKlarnaConfigured();
  return (
    <>
      <TopBar />
      <Header />
      <main className="bg-surface min-h-[60vh]">
        <CheckoutFlow
          klarnaConfigured={klarnaConfigured}
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
