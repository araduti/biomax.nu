"use client";

import { useState } from "react";

const SITE_HOST = "www.biomax.nu";

// Google's SERP truncation rules (approximate but battle-tested):
//   Title:       50–60 chars displayed, longer truncated with ellipsis
//   Description: 150–160 chars on desktop, ~120 on mobile
const TITLE_SWEET = { min: 30, max: 60, hard: 60 };
const DESC_SWEET = { min: 120, max: 160, hard: 160 };

/**
 * Live Google snippet preview, plus length counters with three-state colour
 * bands (too-short / sweet-spot / too-long). Renders both the desktop and
 * mobile width as Google shows them — same content, different truncation.
 *
 * `title` and `description` are the *effective* values (after fallbacks):
 * caller passes seoTitle || name and seoDescription || stripHtml(short, 160).
 */
export function SeoSnippetPreview({
  title,
  description,
  slug,
  seoTitleFilled,
  seoDescriptionFilled,
}: {
  title: string;
  description: string;
  slug: string;
  seoTitleFilled: boolean;
  seoDescriptionFilled: boolean;
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const widthClass = device === "desktop" ? "max-w-[600px]" : "max-w-[360px]";
  const breadcrumb = `${SITE_HOST} › produkter › ${slug}`;

  const titleStatus = bandStatus(title.length, TITLE_SWEET);
  const descStatus = bandStatus(description.length, DESC_SWEET);

  // Google truncates with ellipsis — visualise it.
  const displayTitle = truncate(title, TITLE_SWEET.hard);
  const displayDesc = truncate(
    description,
    device === "desktop" ? DESC_SWEET.hard : 120
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-sans text-[10px] uppercase tracking-[0.22em] font-semibold text-ink-mute">
          Google-förhandsvisning
        </p>
        <div className="flex rounded-md border border-border overflow-hidden text-[11px] font-sans font-semibold">
          <button
            type="button"
            onClick={() => setDevice("desktop")}
            className={`px-2.5 py-1 transition-colors ${
              device === "desktop"
                ? "bg-primary-deep text-surface"
                : "bg-surface-alt text-ink-mute hover:text-ink-body"
            }`}
          >
            Desktop
          </button>
          <button
            type="button"
            onClick={() => setDevice("mobile")}
            className={`px-2.5 py-1 border-l border-border transition-colors ${
              device === "mobile"
                ? "bg-primary-deep text-surface"
                : "bg-surface-alt text-ink-mute hover:text-ink-body"
            }`}
          >
            Mobil
          </button>
        </div>
      </div>

      <div
        className={`${widthClass} rounded-2xl bg-white border border-border-soft px-5 py-4 shadow-[0_1px_0_rgba(15,32,44,0.04)] transition-[max-width] duration-200`}
      >
        <p className="font-sans text-[12px] text-[#5f6368] leading-snug truncate">
          {breadcrumb}
        </p>
        <p className="mt-1 font-sans text-[18px] md:text-[20px] leading-snug text-[#1a0dab] hover:underline cursor-pointer">
          {displayTitle || (
            <span className="italic text-[#5f6368]">(Ingen titel)</span>
          )}
        </p>
        <p className="mt-1 font-sans text-[13px] leading-snug text-[#4d5156]">
          {displayDesc || (
            <span className="italic text-[#5f6368]">(Ingen beskrivning)</span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <CounterRow
          label="SEO-titel"
          status={titleStatus}
          length={title.length}
          band={TITLE_SWEET}
          fallbackNote={
            !seoTitleFilled ? "Använder produktnamnet (fallback)" : null
          }
        />
        <CounterRow
          label="SEO-beskrivning"
          status={descStatus}
          length={description.length}
          band={DESC_SWEET}
          fallbackNote={
            !seoDescriptionFilled
              ? "Använder kort beskrivning (fallback)"
              : null
          }
        />
      </div>
    </div>
  );
}

type Status = "empty" | "short" | "good" | "long";

function bandStatus(
  length: number,
  band: { min: number; max: number; hard: number }
): Status {
  if (length === 0) return "empty";
  if (length < band.min) return "short";
  if (length > band.hard) return "long";
  if (length > band.max) return "long";
  return "good";
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

const STATUS_COLOR: Record<Status, string> = {
  empty: "bg-[#B5523B]",
  short: "bg-[#C68A4F]",
  good: "bg-accent-deep",
  long: "bg-[#C68A4F]",
};

const STATUS_LABEL: Record<Status, string> = {
  empty: "tomt",
  short: "för kort",
  good: "ok",
  long: "för långt — kan trunkeras",
};

function CounterRow({
  label,
  status,
  length,
  band,
  fallbackNote,
}: {
  label: string;
  status: Status;
  length: number;
  band: { min: number; max: number };
  fallbackNote: string | null;
}) {
  const sweetWidth = `${Math.min(100, (length / band.max) * 100)}%`;
  return (
    <div className="bg-surface-alt border border-border rounded-xl p-3">
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="font-sans text-[11px] uppercase tracking-[0.18em] font-semibold text-ink-mute">
          {label}
        </span>
        <span className="font-sans text-[12px] tabular-nums">
          <span className="font-semibold text-ink-body">{length}</span>
          <span className="text-ink-mute">
            {" "}
            / {band.min}–{band.max}
          </span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className={`h-full transition-[width,background-color] duration-200 ${STATUS_COLOR[status]}`}
          style={{ width: sweetWidth }}
        />
      </div>
      <p className="mt-1.5 font-sans text-[11.5px] text-ink-mute">
        {STATUS_LABEL[status]}
        {fallbackNote && (
          <>
            <span aria-hidden> · </span>
            <span className="italic">{fallbackNote}</span>
          </>
        )}
      </p>
    </div>
  );
}
