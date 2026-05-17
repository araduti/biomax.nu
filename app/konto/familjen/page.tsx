import type { Metadata } from "next";
import Link from "next/link";
import { Display, Eyebrow } from "@/components/ui/typography";
import { formatPriceSEK } from "@/lib/format";
import { currentUser } from "@/lib/session";
import { ensureAccount, getAccountBalance } from "@/lib/loyalty/account";
import { getAccountHistory, labelForKind } from "@/lib/loyalty/queries";
import {
  LOYALTY_PROGRAM_NAME,
  KR_PER_EARNED_POINT,
  ORE_PER_POINT,
  MIN_REDEMPTION_POINTS,
  WELCOME_BONUS_POINTS,
  pointsToKr,
} from "@/lib/loyalty/constants";

export const metadata: Metadata = {
  title: `${LOYALTY_PROGRAM_NAME} — Mitt konto`,
  robots: { index: false, follow: false },
  alternates: { canonical: "/konto/familjen" },
};

const dateFmt = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

/**
 * Customer-facing loyalty home: balance, how-it-works, full transaction
 * history. The "Använd poäng vid kassan" affordance is intentionally
 * absent in Phase 1 — redemption ships in Phase 2 once the checkout
 * math + Klarna handoff are wired. Today the page is read-only.
 */
export default async function LoyaltyAccountPage() {
  const user = (await currentUser())!;
  let balance = await getAccountBalance(user.id);
  if (!balance) {
    await ensureAccount(user.id);
    balance = await getAccountBalance(user.id);
  }
  const history = await getAccountHistory(user.id, 50);

  return (
    <>
      <Eyebrow className="text-accent-deep">{LOYALTY_PROGRAM_NAME}</Eyebrow>
      <Display as="h1" size="xl" className="mt-3 mb-3">
        Dina poäng
      </Display>
      <p className="font-sans text-base text-ink-mute leading-relaxed max-w-[640px]">
        Du tjänar poäng på varje order. Snart kommer du också kunna använda
        dem som rabatt direkt i kassan — fram tills dess samlas de på ditt
        konto.
      </p>

      {/* Balance summary */}
      <section className="mt-8 bg-surface-warm border border-accent/30 rounded-2xl p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="font-sans text-[11px] uppercase tracking-[0.22em] font-semibold text-ink-soft">
              Saldo
            </p>
            <p className="mt-2 font-display text-[40px] md:text-[48px] font-medium tracking-tight text-primary-deep leading-none">
              {balance ? balance.balance.toLocaleString("sv-SE") : "0"}
            </p>
            <p className="mt-1 font-sans text-[13px] text-ink-mute">poäng</p>
          </div>
          <div>
            <p className="font-sans text-[11px] uppercase tracking-[0.22em] font-semibold text-ink-soft">
              Värde just nu
            </p>
            <p className="mt-2 font-display text-[28px] md:text-[32px] font-medium tracking-tight text-primary-deep">
              {formatPriceSEK(balance ? pointsToKr(balance.balance) : 0)}
            </p>
            <p className="mt-1 font-sans text-[13px] text-ink-mute">
              {MIN_REDEMPTION_POINTS} poäng ={" "}
              {formatPriceSEK((MIN_REDEMPTION_POINTS * ORE_PER_POINT) / 100)}
            </p>
          </div>
          <div>
            <p className="font-sans text-[11px] uppercase tracking-[0.22em] font-semibold text-ink-soft">
              Totalt tjänat
            </p>
            <p className="mt-2 font-display text-[28px] md:text-[32px] font-medium tracking-tight text-primary-deep">
              {balance
                ? balance.lifetimeEarned.toLocaleString("sv-SE")
                : "0"}
            </p>
            <p className="mt-1 font-sans text-[13px] text-ink-mute">
              poäng sedan{" "}
              {balance ? dateFmt.format(balance.enrolledAt) : "starten"}
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-medium tracking-tight text-primary-deep mb-5">
          Så fungerar det
        </h2>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <li className="bg-surface-alt border border-border rounded-2xl p-5">
            <p className="font-display text-[15px] font-semibold text-accent-deep mb-2">
              Tjäna
            </p>
            <p className="font-sans text-[14.5px] text-ink-body leading-relaxed">
              Du får{" "}
              <strong className="font-semibold text-primary-deep">
                1 poäng per {KR_PER_EARNED_POINT} kr
              </strong>{" "}
              du handlar för hos Biomax. Poängen registreras när din
              betalning är genomförd.
            </p>
          </li>
          <li className="bg-surface-alt border border-border rounded-2xl p-5">
            <p className="font-display text-[15px] font-semibold text-accent-deep mb-2">
              Använd
            </p>
            <p className="font-sans text-[14.5px] text-ink-body leading-relaxed">
              <strong className="font-semibold text-primary-deep">
                {MIN_REDEMPTION_POINTS} poäng ={" "}
                {formatPriceSEK((MIN_REDEMPTION_POINTS * ORE_PER_POINT) / 100)}{" "}
                rabatt
              </strong>{" "}
              i kassan. (Tillgängligt inom kort — fram tills dess samlas
              poängen.)
            </p>
          </li>
          <li className="bg-surface-alt border border-border rounded-2xl p-5">
            <p className="font-display text-[15px] font-semibold text-accent-deep mb-2">
              Behåll
            </p>
            <p className="font-sans text-[14.5px] text-ink-body leading-relaxed">
              Poängen gäller så länge du är aktiv. Får du en order tillbaka
              eller säger upp den justerar vi saldot automatiskt.
            </p>
          </li>
        </ul>
        {WELCOME_BONUS_POINTS > 0 && (
          <p className="mt-5 font-sans text-[13.5px] text-ink-mute italic">
            Som tack för att du skapade konto fick du{" "}
            {WELCOME_BONUS_POINTS} poäng i välkomstbonus.
          </p>
        )}
      </section>

      {/* History */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-medium tracking-tight text-primary-deep mb-5">
          Historik
        </h2>
        {history.length === 0 ? (
          <p className="font-sans text-[14.5px] text-ink-mute italic">
            Inga händelser ännu. När du gör din första order dyker den upp
            här.
          </p>
        ) : (
          <ul className="bg-surface-alt border border-border rounded-2xl overflow-hidden">
            {history.map((row, i) => {
              const positive = row.points > 0;
              return (
                <li
                  key={row.id}
                  className={i > 0 ? "border-t border-border-soft" : ""}
                >
                  <div className="flex items-center justify-between gap-4 px-5 md:px-6 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-[15px] font-medium tracking-tight text-primary-deep">
                        {labelForKind(row.kind)}
                        {row.orderNumber && (
                          <>
                            {" · "}
                            <Link
                              href={`/konto/ordrar/${row.orderNumber}`}
                              className="text-primary underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
                            >
                              {row.orderNumber}
                            </Link>
                          </>
                        )}
                      </p>
                      <p className="font-sans text-[12.5px] text-ink-mute mt-0.5">
                        {row.description} · {dateFmt.format(row.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`font-display text-[16px] font-medium tabular-nums whitespace-nowrap ${
                        positive ? "text-accent-deep" : "text-status-error"
                      }`}
                    >
                      {positive ? "+" : ""}
                      {row.points.toLocaleString("sv-SE")}
                      <span className="font-sans text-[12px] text-ink-mute font-normal ml-1">
                        p
                      </span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
