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
    bg: "bg-[#C68A4F]/15",
    fg: "text-[#8A5A2C]",
  },
  "needs-work": {
    label: "Åtgärd",
    icon: "⚠",
    bg: "bg-[#B5523B]/12",
    fg: "text-[#B5523B]",
  },
};

export function SeoHealthDot({ level }: { level: SeoHealthLevel }) {
  const s = PALETTE[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-sans text-[12.5px] font-semibold whitespace-nowrap ${s.bg} ${s.fg}`}
    >
      <span aria-hidden className="text-[13px] leading-none">
        {s.icon}
      </span>
      <span>{s.label}</span>
      <span className="sr-only">SEO-status: {s.label}</span>
    </span>
  );
}
