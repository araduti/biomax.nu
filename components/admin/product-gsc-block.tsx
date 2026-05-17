import {
  type GscRow,
  fmtCtr,
  fmtPosition,
} from "@/lib/integrations/gsc";
import type { HistoryPoint } from "@/lib/integrations/gsc-history";
import { GscEmptyState } from "@/components/admin/gsc-empty-state";
import { Sparkline } from "@/components/admin/sparkline";

/**
 * Inline GSC card embedded in /admin/produkter/[slug]. Presentational —
 * the parent page does the fetch (so the same data can fan out to both
 * this block AND the keyword-suggestion chips in the editor without a
 * second API round-trip).
 */
export function ProductGscBlock({
  configured,
  rows,
  histories,
}: {
  configured: boolean;
  rows: GscRow[];
  /** Optional per-query history map keyed on the query string. */
  histories?: Map<string, HistoryPoint[]>;
}) {
  if (!configured) {
    return (
      <fieldset className="bg-surface-alt border border-border rounded-xl p-6 md:p-8">
        <legend className="px-2 -ml-2 font-sans text-[11px] uppercase tracking-[0.16em] font-semibold text-ink-mute">
          Sökanalys (Google Search Console)
        </legend>
        <div className="mt-4">
          <GscEmptyState variant="inline" />
        </div>
      </fieldset>
    );
  }

  return (
    <fieldset className="bg-surface-alt border border-border rounded-xl p-6 md:p-8">
      <legend className="px-2 -ml-2 font-sans text-[11px] uppercase tracking-[0.16em] font-semibold text-ink-mute">
        Sökanalys (Google Search Console)
      </legend>
      <p className="mt-3 mb-5 font-sans text-[13px] text-ink-mute leading-relaxed">
        Söktermer som visat den här produkten i Googles resultat de senaste 28
        dagarna. Använd för att hitta intent du inte täckt än — lägg till som
        AI-nyckelord nedan eller skriv en FAQ för att fånga frågan.
      </p>

      {rows.length === 0 ? (
        <p className="font-sans text-[13.5px] text-ink-mute italic">
          Ingen sökdata för den här sidan ännu — kan ta upp till 48 h efter
          publicering. Säkerställ att produkten är publicerad och indexerad.
        </p>
      ) : (
        <ul className="divide-y divide-border-soft -mx-1">
          {rows.map((r, i) => {
            const hist = r.query ? histories?.get(r.query) : undefined;
            return (
              <li
                key={i}
                className="px-1 py-2 grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3"
              >
                <span className="font-sans text-[13.5px] text-ink-body truncate">
                  {r.query ?? "—"}
                </span>
                <Sparkline
                  history={hist ?? []}
                  metric="impressions"
                  width={64}
                  height={18}
                />
                <span className="font-sans text-[12px] tabular-nums text-ink-mute whitespace-nowrap min-w-[44px] text-right">
                  {r.clicks} klick
                </span>
                <span className="font-sans text-[12px] tabular-nums text-ink-mute whitespace-nowrap min-w-[44px] text-right">
                  {fmtCtr(r.ctr)}
                </span>
                <span className="font-sans text-[12px] tabular-nums font-semibold text-primary-deep whitespace-nowrap min-w-[48px] text-right">
                  pos {fmtPosition(r.position)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </fieldset>
  );
}
