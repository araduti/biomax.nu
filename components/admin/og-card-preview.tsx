"use client";

import { useState } from "react";

const SITE_HOST = "biomax.nu";

// Open Graph truncation rules (cross-platform consensus):
//   Title:       60 chars on Facebook, 70 on LinkedIn, ~70 on Slack — 60 is safe
//   Description: 200 on Facebook (180 on mobile), 200 on LinkedIn — 180 is safe
const OG_TITLE_MAX = 60;
const OG_DESC_MAX = 180;

/**
 * Live preview of how a product link will appear when shared on Facebook /
 * Slack / WhatsApp / iMessage / LinkedIn / X. Provides a Slack-style toggle
 * since each platform crops slightly differently — Slack and Facebook are the
 * dominant share targets for a Swedish brand and they're representative of
 * the wider set.
 *
 * Caller passes the *effective* values (after fallbacks). The fallback notes
 * make it obvious when the OG-specific override wasn't filled.
 */
export function OgCardPreview({
  title,
  description,
  imageUrl,
  ogTitleFilled,
  ogDescriptionFilled,
  ogImageFilled,
}: {
  title: string;
  description: string;
  imageUrl: string;
  ogTitleFilled: boolean;
  ogDescriptionFilled: boolean;
  ogImageFilled: boolean;
}) {
  const [platform, setPlatform] = useState<"slack" | "facebook">("slack");

  const displayTitle = truncate(title, OG_TITLE_MAX);
  const displayDesc = truncate(description, OG_DESC_MAX);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-sans text-[10px] uppercase tracking-[0.16em] font-semibold text-ink-mute">
          Sociala kort — förhandsvisning
        </p>
        <div className="flex rounded-md border border-border overflow-hidden text-[11px] font-sans font-semibold">
          <button
            type="button"
            onClick={() => setPlatform("slack")}
            className={`px-2.5 py-1 transition-colors ${
              platform === "slack"
                ? "bg-primary-deep text-surface"
                : "bg-surface-alt text-ink-mute hover:text-ink-body"
            }`}
          >
            Slack / iMessage
          </button>
          <button
            type="button"
            onClick={() => setPlatform("facebook")}
            className={`px-2.5 py-1 border-l border-border transition-colors ${
              platform === "facebook"
                ? "bg-primary-deep text-surface"
                : "bg-surface-alt text-ink-mute hover:text-ink-body"
            }`}
          >
            Facebook / LinkedIn
          </button>
        </div>
      </div>

      {platform === "slack" ? (
        <SlackCard
          title={displayTitle}
          description={displayDesc}
          imageUrl={imageUrl}
        />
      ) : (
        <FacebookCard
          title={displayTitle}
          description={displayDesc}
          imageUrl={imageUrl}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FallbackChip
          label="OG-titel"
          length={title.length}
          max={OG_TITLE_MAX}
          filled={ogTitleFilled}
          fallback="Använder SEO-titel/produktnamn"
        />
        <FallbackChip
          label="OG-beskrivning"
          length={description.length}
          max={OG_DESC_MAX}
          filled={ogDescriptionFilled}
          fallback="Använder SEO/kort beskrivning"
        />
        <FallbackChip
          label="OG-bild"
          filled={ogImageFilled}
          fallback="Använder produktbild"
        />
      </div>
    </div>
  );
}

function SlackCard({
  title,
  description,
  imageUrl,
}: {
  title: string;
  description: string;
  imageUrl: string;
}) {
  return (
    <div className="max-w-[520px] flex gap-3 rounded-lg bg-white border border-border-soft p-3 shadow-[0_1px_0_rgba(15,32,44,0.04)]">
      <div className="border-l-[3px] border-[#3F0F40] pl-3 flex-1 min-w-0">
        <p className="font-sans text-[12px] font-semibold text-[#1d1c1d]">
          biomax.nu
        </p>
        <p className="mt-0.5 font-sans text-[14.5px] font-bold text-[#1264A3] leading-snug">
          {title || (
            <span className="italic font-normal text-[#616061]">(Ingen titel)</span>
          )}
        </p>
        <p className="mt-0.5 font-sans text-[13px] text-[#1d1c1d] leading-snug">
          {description || (
            <span className="italic text-[#616061]">(Ingen beskrivning)</span>
          )}
        </p>
      </div>
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          className="w-[72px] h-[72px] rounded object-cover bg-surface-warm"
        />
      )}
    </div>
  );
}

function FacebookCard({
  title,
  description,
  imageUrl,
}: {
  title: string;
  description: string;
  imageUrl: string;
}) {
  return (
    <div className="max-w-[500px] rounded-lg overflow-hidden bg-[#F2F3F5] border border-[#dadde1]">
      {imageUrl && (
        <div className="aspect-[1.91/1] bg-surface-warm overflow-hidden">
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="px-4 py-3">
        <p className="font-sans text-[12px] uppercase tracking-wide text-[#606770] truncate">
          {SITE_HOST}
        </p>
        <p className="mt-0.5 font-sans text-[16px] font-semibold text-[#050505] leading-snug">
          {title || (
            <span className="italic font-normal text-[#606770]">(Ingen titel)</span>
          )}
        </p>
        <p className="mt-0.5 font-sans text-[13px] text-[#606770] leading-snug line-clamp-2">
          {description || (
            <span className="italic text-[#606770]">(Ingen beskrivning)</span>
          )}
        </p>
      </div>
    </div>
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

function FallbackChip({
  label,
  length,
  max,
  filled,
  fallback,
}: {
  label: string;
  length?: number;
  max?: number;
  filled: boolean;
  fallback: string;
}) {
  return (
    <div className="bg-surface-alt border border-border rounded-xl p-3">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="font-sans text-[11px] uppercase tracking-[0.16em] font-semibold text-ink-mute">
          {label}
        </span>
        {length !== undefined && max !== undefined && (
          <span className="font-sans text-[12px] tabular-nums">
            <span
              className={`font-semibold ${
                length === 0 || length > max
                  ? "text-status-error"
                  : "text-ink-body"
              }`}
            >
              {length}
            </span>
            <span className="text-ink-mute"> / {max}</span>
          </span>
        )}
      </div>
      <p className="font-sans text-[11.5px]">
        {filled ? (
          <span className="text-accent-deep font-medium">Anpassad</span>
        ) : (
          <span className="text-ink-mute italic">{fallback}</span>
        )}
      </p>
    </div>
  );
}
