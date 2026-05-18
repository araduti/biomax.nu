import type { SeoHealthLevel } from "@/lib/admin/seo-health";

/**
 * SEO health chip — text + icon, no colour-only encoding.
 *
 * Replaces the previous 10 px coloured dot, which relied on colour
 * recognition at small sizes — a poor pattern for the older audience
 * the admin is built for. Now a labelled chip ("✓ Komplett",
 * "⚠ Behöver åtgärd") that reads at distance with reading glasses.
 */
const PALETTE: Record<
  SeoHealthLevel,
  { label: string; icon: string; bg: string; fg: string }
> = {
  complete: {
    label: "Komplett",
    icon: "✓",
    bg: "bg-accent/15",
    fg: "text-accent-deep",
  },
  partial: {
    label: "Delvis",
    icon: "○",
    bg: "bg-status-warn/15",
    fg: "text-status-low",
  },
  "needs-work": {
    label: "Åtgärd",
    icon: "⚠",
    bg: "bg-status-error/12",
    fg: "text-status-error",
  },
};

export function SeoHealthDot({ level }: { level: SeoHealthLevel }) {
  const s = PALETTE[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-sans text-caption font-semibold whitespace-nowrap ${s.bg} ${s.fg}`}
    >
      <span aria-hidden className="text-small leading-none">
        {s.icon}
      </span>
      <span>{s.label}</span>
      <span className="sr-only">SEO-status: {s.label}</span>
    </span>
  );
}
