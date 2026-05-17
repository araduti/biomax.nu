"use client";

import Link from "next/link";

/**
 * Date filter + print trigger for the packlista page.
 *
 * Default behaviour (no date) shows every PAID order — that's the
 * "what do I need to pack right now?" view. The date input narrows
 * to a single day for audit / re-print scenarios; the "Visa alla att
 * packa"-link reverts to the default.
 */
export function PacklistaControls({
  defaultDate,
  showAllHref,
}: {
  defaultDate: string;
  showAllHref: string;
}) {
  const dateActive = defaultDate.length > 0;
  return (
    <div className="mb-6 flex flex-wrap gap-3 items-end print:hidden">
      <form className="flex flex-wrap gap-3 items-end" method="get">
        <label className="font-sans text-[13px] text-ink-mute flex flex-col gap-1.5">
          Filtrera per datum (valfritt)
          <input
            type="date"
            name="date"
            defaultValue={defaultDate}
            className="h-12 px-3 rounded-md border-2 border-border bg-surface font-sans text-[15px]"
          />
        </label>
        <button
          type="submit"
          className="h-12 px-5 rounded-md bg-primary-deep text-surface font-sans text-[14px] font-semibold hover:bg-primary-deep/90"
        >
          Visa
        </button>
        {dateActive && (
          <Link
            href={showAllHref}
            className="h-12 px-5 inline-flex items-center rounded-md border-2 border-border bg-surface font-sans text-[14px] font-semibold text-ink-body hover:bg-surface-warm"
          >
            Visa alla att packa
          </Link>
        )}
      </form>
      <button
        type="button"
        onClick={() => window.print()}
        className="ml-auto h-12 px-5 rounded-md border-2 border-border bg-surface font-sans text-[14px] font-semibold hover:bg-surface-warm"
      >
        Skriv ut
      </button>
    </div>
  );
}
