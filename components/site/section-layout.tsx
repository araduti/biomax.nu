import type { ReactNode } from "react";
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { SectionNav } from "@/components/site/section-nav";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbLd } from "@/lib/jsonld";
import { getSection, type SectionId } from "@/lib/site/sections";

/**
 * Shared shell for grouped content pages. Renders TopBar/Header/breadcrumb,
 * then a 2-column grid: sticky left-rail SectionNav + page content. Footer at
 * the bottom. Pages just provide the inner content + their crumbs.
 *
 * The grid collapses to single-column on mobile, where SectionNav becomes a
 * horizontal pill scroll-strip above the content.
 */
export function SectionLayout({
  section,
  crumbs,
  children,
}: {
  section: SectionId;
  crumbs: { label: string; href: string }[];
  children: ReactNode;
}) {
  const sect = getSection(section);

  return (
    <>
      <TopBar />
      <Header />
      <JsonLd data={breadcrumbLd(crumbs)} />

      <main>
        <div className="max-w-[1100px] mx-auto px-6 md:px-8 pt-8 pb-4">
          <Breadcrumb crumbs={crumbs} />
        </div>

        <div className="max-w-[1100px] mx-auto px-6 md:px-8 pt-4 md:pt-6 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 md:gap-14">
            <SectionNav section={sect} />
            <div className="min-w-0 max-w-[760px]">{children}</div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
