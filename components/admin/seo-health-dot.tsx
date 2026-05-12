import type { SeoHealth } from "@/lib/admin/seo-health";

const PALETTE: Record<SeoHealth["level"], { dot: string; label: string }> = {
  complete: { dot: "bg-accent-deep", label: "Komplett" },
  partial: { dot: "bg-[#C68A4F]", label: "Delvis" },
  "needs-work": { dot: "bg-[#B5523B]", label: "Behöver åtgärd" },
};

/**
 * Single-character SEO-health indicator with a hover/focus tooltip listing
 * exactly what's missing or thin. Designed to fit inline in the product list.
 */
export function SeoHealthDot({ health }: { health: SeoHealth }) {
  const { dot, label } = PALETTE[health.level];
  const allItems = [
    ...health.missing.map((m) => ({ kind: "missing" as const, text: m })),
    ...health.warnings.map((w) => ({ kind: "warning" as const, text: w })),
  ];
  const hasDetails = allItems.length > 0;

  return (
    <span className="group/dot relative inline-flex items-center">
      <span
        aria-hidden
        className={`inline-block w-2.5 h-2.5 rounded-full ${dot}`}
      />
      <span className="sr-only">SEO-status: {label}</span>
      {hasDetails && (
        <span
          role="tooltip"
          className="invisible opacity-0 group-hover/dot:visible group-hover/dot:opacity-100 group-focus-within/dot:visible group-focus-within/dot:opacity-100 transition-opacity duration-150 absolute right-0 top-full mt-2 z-30 w-[260px] rounded-xl bg-primary-deep text-white text-[12px] leading-snug font-sans px-4 py-3 shadow-xl pointer-events-none text-left"
        >
          <span className="block font-display text-[13px] font-medium tracking-tight mb-2">
            SEO-status: {label}
          </span>
          <ul className="space-y-1">
            {allItems.map((it, i) => (
              <li
                key={i}
                className={`flex gap-2 items-baseline ${
                  it.kind === "missing" ? "text-[#F2A99A]" : "text-white/85"
                }`}
              >
                <span aria-hidden className="flex-shrink-0">
                  {it.kind === "missing" ? "●" : "○"}
                </span>
                <span>{it.text}</span>
              </li>
            ))}
          </ul>
        </span>
      )}
    </span>
  );
}
