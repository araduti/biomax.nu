import { redirect } from "next/navigation";
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AccountSidebar } from "@/components/account/account-sidebar";
import { currentUser } from "@/lib/session";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/logga-in?redirect=/konto");

  const greetingName =
    (user as { firstName?: string | null }).firstName ||
    user.name?.split(" ")[0] ||
    null;

  return (
    <>
      <TopBar />
      <Header />
      <main className="bg-surface min-h-[60vh]">
        <div className="max-w-[1240px] mx-auto px-6 md:px-8 pt-8 pb-16">
          <Breadcrumb
            crumbs={[
              { label: "Hem", href: "/" },
              { label: "Mitt konto", href: "/konto" },
            ]}
          />
          <div className="mt-8 flex flex-col lg:flex-row gap-8 lg:gap-12">
            <AccountSidebar greetingName={greetingName} />
            <div className="flex-1 min-w-0">{children}</div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
