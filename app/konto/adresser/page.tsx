import type { Metadata } from "next";
import { Display, Eyebrow } from "@/components/ui/typography";
import { ButtonLink } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Adresser",
  robots: { index: false, follow: false },
  alternates: { canonical: "/konto/adresser" },
};

export default async function AddressesPage() {
  const user = (await currentUser())!;
  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <>
      <Eyebrow>Adresser</Eyebrow>
      <Display as="h1" size="xl" className="mt-3 mb-3">
        Sparade adresser
      </Display>
      <p className="font-sans text-base text-ink-mute leading-relaxed max-w-[640px] mb-8">
        Adresser du använt vid utcheckning sparas här för snabbare köp nästa
        gång.
      </p>

      {addresses.length === 0 ? (
        <div className="bg-surface-alt border border-border rounded-2xl p-10 text-center max-w-[640px]">
          <p className="font-display italic text-xl text-primary-deep mb-3">
            Inga adresser ännu
          </p>
          <p className="font-sans text-[14px] text-ink-mute mb-6 max-w-[420px] mx-auto leading-relaxed">
            När du genomför din första beställning sparas leveransadressen här.
          </p>
          <ButtonLink href="/produkter" variant="primary" size="md">
            Utforska produkter
          </ButtonLink>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[920px]">
          {addresses.map((a) => (
            <li
              key={a.id}
              className="bg-surface-alt border border-border rounded-2xl p-6"
            >
              <p className="font-display text-[16px] font-medium tracking-tight text-primary-deep mb-2">
                {a.fullName}
              </p>
              <p className="font-sans text-[14px] text-ink-body leading-relaxed">
                {a.street}
                <br />
                {a.postalCode} {a.city}
                {a.countryCode !== "SE" && (
                  <>
                    <br />
                    {a.countryCode}
                  </>
                )}
                {a.phone && (
                  <>
                    <br />
                    <span className="text-ink-mute">{a.phone}</span>
                  </>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
