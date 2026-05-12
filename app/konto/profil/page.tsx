import type { Metadata } from "next";
import { Display, Eyebrow } from "@/components/ui/typography";
import { currentUser } from "@/lib/session";
import { ProfileForm } from "@/components/account/profile-form";

export const metadata: Metadata = {
  title: "Profil",
  robots: { index: false, follow: false },
  alternates: { canonical: "/konto/profil" },
};

export default async function ProfilePage() {
  const user = (await currentUser())!;
  const u = user as {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  };
  return (
    <>
      <Eyebrow>Profil</Eyebrow>
      <Display as="h1" size="xl" className="mt-3 mb-3">
        Mina uppgifter
      </Display>
      <p className="font-sans text-base text-ink-mute leading-relaxed max-w-[640px] mb-8">
        Dina kontaktuppgifter används vid utcheckning och leveransaviseringar.
      </p>
      <ProfileForm
        email={user.email}
        initial={{
          firstName: u.firstName ?? "",
          lastName: u.lastName ?? "",
          phone: u.phone ?? "",
        }}
      />
    </>
  );
}
