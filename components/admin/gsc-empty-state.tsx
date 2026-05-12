/**
 * Shown in place of GSC data cards when GSC isn't configured. Doubles as the
 * setup runbook so an employee can wire it up without opening an ADR.
 */
export function GscEmptyState({
  variant = "card",
}: {
  variant?: "card" | "inline";
}) {
  const inner = (
    <>
      <p className="font-sans text-[10.5px] uppercase tracking-[0.22em] font-semibold text-accent-deep mb-1">
        Google Search Console
      </p>
      <h2 className="font-display text-xl font-medium tracking-tight text-primary-deep mb-3">
        Anslut för riktiga sökdata
      </h2>
      <p className="font-sans text-[13.5px] text-ink-mute leading-relaxed mb-4">
        När GSC är anslutet visas verkliga söktermer, klick, visningar och
        positioner — sajtens egen rankningsdata, direkt i admin.
      </p>
      <ol className="space-y-2 font-sans text-[13.5px] text-ink-body list-decimal pl-5">
        <li>
          Skapa ett <strong>service account</strong> i Google Cloud Console
          och ladda ned dess JSON-nyckel.
        </li>
        <li>
          I Search Console &rarr; <em>Inställningar</em> &rarr;{" "}
          <em>Användare och behörigheter</em>: lägg till service-account-mejlen
          som <strong>Restricted user</strong> för den verifierade egendomen.
        </li>
        <li>
          Sätt <code className="px-1 rounded bg-surface-warm font-mono text-[12px]">GSC_SERVICE_ACCOUNT_KEY</code>{" "}
          (hela JSON-filens innehåll) och{" "}
          <code className="px-1 rounded bg-surface-warm font-mono text-[12px]">GSC_PROPERTY</code>{" "}
          (t.ex. <code className="font-mono text-[12px]">https://www.biomax.nu/</code>) i
          produktionsmiljöns env.
        </li>
        <li>Starta om appen — datat dyker upp inom någon minut.</li>
      </ol>
      <p className="mt-4 font-sans text-[12px] text-ink-soft italic">
        Detaljerad uppstart finns i ADR 0014.
      </p>
    </>
  );

  if (variant === "inline") {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface-warm/40 px-4 py-3 font-sans text-[13px] text-ink-mute">
        <strong className="font-semibold text-ink-body">
          Google Search Console är inte anslutet.
        </strong>{" "}
        När det är anslutet visas verkliga söktermer för den här produkten
        här. Se ADR 0014 för uppstart.
      </div>
    );
  }

  return (
    <section className="bg-surface-alt border border-dashed border-border rounded-2xl p-5 md:p-6 h-fit">
      {inner}
    </section>
  );
}
