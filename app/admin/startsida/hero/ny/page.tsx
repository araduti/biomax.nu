import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { HeroForm } from "@/components/admin/hero-form";

export const metadata = { title: "Ny hero-bild" };

export default function NewHeroPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Startsidan"
        title="Ny hero-bild"
        subtitle="Lägg till en ny bild för startsidan. Spara som ”Utkast” först om du vill se hur den ser ut innan den går live."
        crumbs={[
          { label: "Startsidan", href: "/admin/startsida" },
          { label: "Hero-bilder", href: "/admin/startsida/hero" },
          { label: "Ny" },
        ]}
      />
      <HeroForm />
    </>
  );
}
