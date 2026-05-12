import { Display, Eyebrow, Accent } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";

/**
 * Newsletter capture — V1 visual placeholder.
 * Wired to the database + email provider in Phase 7.
 */
export function Newsletter() {
  return (
    <section className="bg-surface-warm py-20 md:py-24 px-6 md:px-8">
      <div className="max-w-[880px] mx-auto text-center">
        <Eyebrow>Brev från Biomax</Eyebrow>
        <Display size="xl" className="mt-4 mb-4">
          Forskning, urval och <Accent>10 % rabatt</Accent> på första köpet.
        </Display>
        <p className="font-sans text-base md:text-lg leading-relaxed text-ink-mute max-w-[580px] mx-auto mb-9">
          Ett genomtänkt brev varannan vecka. Inga utskick i tid och otid. Lätt att
          avregistrera.
        </p>
        <form
          className="flex gap-2 max-w-[480px] mx-auto bg-surface-alt p-1.5 rounded-full border border-border"
          action="#"
          method="post"
        >
          <label htmlFor="newsletter-email" className="sr-only">
            E-postadress
          </label>
          <input
            id="newsletter-email"
            type="email"
            name="email"
            placeholder="din@email.se"
            required
            className="flex-1 bg-transparent border-0 outline-0 px-4 py-2 font-sans text-[15px] text-ink placeholder:text-ink-soft"
          />
          <Button type="submit" size="sm">
            Prenumerera
          </Button>
        </form>
      </div>
    </section>
  );
}
