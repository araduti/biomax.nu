import Link from "next/link";
import { BiomaxLogo } from "@/components/brand/BiomaxLogo";

const COLS = [
  {
    title: "Sortiment",
    links: [
      { label: "Alla produkter", href: "/produkter" },
      { label: "Bästsäljare", href: "/produkter?sort=bestsellers" },
      { label: "Nyheter", href: "/produkter?sort=newest" },
      { label: "Erbjudanden", href: "/produkter?sort=sale" },
    ],
  },
  {
    title: "Hälsoområden",
    links: [
      { label: "Sömn & Oro", href: "/kategorier/somn-oro" },
      { label: "Urinvägsinfektion", href: "/kategorier/urinvagsinfektion" },
      { label: "Immunförsvar", href: "/kategorier/immunforsvar" },
      { label: "Leder", href: "/kategorier/leder" },
      { label: "Hjärta-Kärl", href: "/kategorier/hjarta-karl" },
    ],
  },
  {
    title: "Biomax",
    links: [
      { label: "Vår berättelse", href: "/om-oss" },
      { label: "Behandlingar", href: "/behandlingar" },
      { label: "Butik i Kållered", href: "/butik" },
      { label: "Kontakt", href: "/kontakt" },
    ],
  },
  {
    title: "Hjälp",
    links: [
      { label: "Frakt & retur", href: "/frakt-och-retur" },
      { label: "Vanliga frågor", href: "/faq" },
      { label: "Integritet", href: "/integritet" },
      { label: "GDPR", href: "/gdpr" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-primary-deep text-surface pt-20 pb-8 px-6 md:px-8">
      <div className="max-w-[1240px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-[1.4fr_repeat(4,1fr)] gap-10 mb-14">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex flex-col gap-1" aria-label="Biomax">
              <BiomaxLogo height={32} className="text-surface" />
              <span className="font-sans text-[9px] uppercase tracking-[0.24em] text-surface/55 font-medium pl-0.5">
                Sedan 2001 · Kållered
              </span>
            </Link>
            <p className="mt-6 font-sans text-sm text-surface/70 leading-relaxed max-w-[320px]">
              Biomax HB · Eken Hälsobutik. Ekenleden 15A, 428 36 Kållered.
              Familjeägt sedan 2001.
            </p>
          </div>
          {COLS.map((c) => (
            <div key={c.title}>
              <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-accent font-semibold mb-4">
                {c.title}
              </p>
              <ul className="flex flex-col gap-2.5">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="font-sans text-sm text-surface/80 hover:text-surface transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t border-surface/15 flex flex-col md:flex-row gap-3 justify-between items-start md:items-center font-sans text-xs text-surface/55">
          <span>
            © {new Date().getFullYear()} Biomax Handelsbolag · Org.nr 969676-7939
            · Alla rättigheter förbehålls
          </span>
          <span>Klarna · Visa · Mastercard · Swish</span>
        </div>
      </div>
    </footer>
  );
}
