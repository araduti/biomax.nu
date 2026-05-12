import type { Dose } from "@/lib/products/dose";

/**
 * Glanceable summary chips above the free-text dosering body.
 * Renders nothing when no signal exists — silent beats wrong.
 *
 * Consumes a resolved `Dose` (manual override → parser fallback), so the
 * caller decides where the values came from. See `getEffectiveDose()`.
 */
export function DoseChips({ dose }: { dose: Dose }) {
  const { amount, frequency, timing } = dose;
  if (!amount && !frequency && !timing) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {amount && (
        <Chip icon={<DoseIcon />} label={amount} />
      )}
      {frequency && (
        <Chip icon={<RepeatIcon />} label={frequency} />
      )}
      {timing && (
        <Chip
          icon={<MealIcon />}
          label={timing.label}
          tone={timing.tone === "before" ? "amber" : "sage"}
        />
      )}
    </div>
  );
}

function Chip({
  icon,
  label,
  tone = "sage",
}: {
  icon: React.ReactNode;
  label: string;
  tone?: "sage" | "amber";
}) {
  const palette =
    tone === "amber"
      ? "bg-[#C68A4F]/10 text-[#7A4D2A] border-[#C68A4F]/30"
      : "bg-accent/12 text-accent-deep border-accent/25";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-sans text-[12.5px] font-medium tracking-tight ${palette}`}
    >
      <span aria-hidden className="flex-shrink-0">
        {icon}
      </span>
      {label}
    </span>
  );
}

function DoseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 20.5L20.5 10.5C22.16 8.84 22.16 6.16 20.5 4.5C18.84 2.84 16.16 2.84 14.5 4.5L4.5 14.5C2.84 16.16 2.84 18.84 4.5 20.5C6.16 22.16 8.84 22.16 10.5 20.5Z" />
      <line x1="7.5" y1="11.5" x2="13.5" y2="17.5" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function MealIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h2v11" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z" />
    </svg>
  );
}
