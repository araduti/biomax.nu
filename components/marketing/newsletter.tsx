"use client";

import { useState, useTransition } from "react";
import { Display, Eyebrow, Accent } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { subscribeToNewsletter } from "@/lib/newsletter/actions";

type Status =
  | { kind: "idle" }
  | { kind: "success"; alreadySubscribed: boolean }
  | { kind: "error"; message: string };

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const result = await subscribeToNewsletter({
        email,
        source: "homepage",
        consentGiven: consent,
      });
      if (!result.ok) {
        setStatus({ kind: "error", message: result.error });
        return;
      }
      setStatus({
        kind: "success",
        alreadySubscribed: result.alreadySubscribed,
      });
    });
  }

  return (
    <section className="bg-surface-warm py-20 md:py-24 px-6 md:px-8">
      <div className="max-w-[880px] mx-auto text-center">
        <Eyebrow>Brev från Biomax</Eyebrow>
        <Display size="xl" className="mt-4 mb-4">
          Forskning, urval och <Accent>10 % rabatt</Accent> på första köpet.
        </Display>
        <p className="font-sans text-base md:text-lg leading-relaxed text-ink-mute max-w-[580px] mx-auto mb-9">
          Ett genomtänkt brev varannan vecka. Inga utskick i tid och otid. Lätt
          att avregistrera.
        </p>

        {status.kind === "success" ? (
          <div
            role="status"
            className="max-w-[560px] mx-auto rounded-2xl border border-accent-deep/40 bg-surface-alt px-6 py-5"
          >
            <p className="font-display text-lg text-primary-deep tracking-tight">
              {status.alreadySubscribed
                ? "Tack — du är redan med på listan."
                : "Tack — vi hörs snart."}
            </p>
            <p className="mt-2 font-sans text-[13.5px] text-ink-mute">
              {status.alreadySubscribed
                ? "Inga dubbletter — vi hör av oss i nästa utskick."
                : "Inom någon timme får du ditt välkomstbrev med rabattkoden. Kolla skräpposten om det dröjer."}
            </p>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="max-w-[480px] mx-auto"
            noValidate
          >
            <div className="flex gap-2 bg-surface-alt p-1.5 rounded-full border border-border">
              <label htmlFor="newsletter-email" className="sr-only">
                E-postadress
              </label>
              <input
                id="newsletter-email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="din@email.se"
                required
                disabled={pending}
                className="flex-1 bg-transparent border-0 outline-0 px-4 py-2 font-sans text-[15px] text-ink placeholder:text-ink-soft"
              />
              <Button
                type="submit"
                size="sm"
                disabled={pending || !email || !consent}
              >
                {pending ? "Sparar…" : "Prenumerera"}
              </Button>
            </div>

            <label className="mt-4 inline-flex items-start gap-2.5 cursor-pointer max-w-[420px] text-left">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                disabled={pending}
                className="mt-0.5 w-4 h-4"
              />
              <span className="font-sans text-[12.5px] text-ink-mute leading-relaxed">
                Jag vill få brev från Biomax. Avregistrera när som helst med
                länken i varje brev.
              </span>
            </label>

            {status.kind === "error" && (
              <p
                role="alert"
                className="mt-4 font-sans text-[12.5px] text-[#B5523B] bg-[#B5523B]/10 px-3 py-2 rounded-md max-w-[420px] mx-auto"
              >
                {status.message}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
