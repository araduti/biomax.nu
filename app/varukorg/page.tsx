import type { Metadata } from "next";
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { CartPageContents } from "@/components/cart/cart-page-contents";

export const metadata: Metadata = {
  title: "Varukorg",
  robots: { index: false, follow: false },
  alternates: { canonical: "/varukorg" },
};

export default function CartPage() {
  return (
    <>
      <TopBar />
      <Header />
      <main className="bg-surface min-h-[60vh]">
        <CartPageContents />
      </main>
      <Footer />
    </>
  );
}
