"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { seasons } from "@/lib/seasons";
import { confirmDialog } from "@/components/admin/confirm-dialog";
import {
  saveHero,
  setHeroStatus,
  deleteHero,
  adminTrackUnsplashDownload,
  type HeroFormInput,
  type HeroSeason,
  type HeroStatus,
} from "@/lib/admin/hero-actions";
import { HeroPhotoPicker } from "./hero-photo-picker";
import type { SuggestionKey } from "@/lib/admin/hero-suggestions";

/**
 * Hero create/edit form — designed for our 50–60+ year-old editors.
 *
 * Decisions:
 *  - Large input heights inherit from the admin shell's
 *    `data-density="comfortable"` tokens (48 px hit floor).
 *  - Colour-picker is a swatch palette (brand colours) instead of a
 *    raw hex field. "Annan färg…"-toggle reveals the hex input only
 *    when an editor specifically asks for one off-palette.
 *  - "Säsong eller datum"-radio prevents the common mistake of setting
 *    both, which would be confusing.
 *  - "Aktiv nu"-state is reflected after save via revalidatePath("/")
 *    in the server action.
 *  - File uploader prefers drag-drop; tap-to-browse fallback for touch
 *    devices and older users who prefer the file dialog.
 */

const BRAND_SWATCHES = [
  { hex: "#7A8B6F", label: "Salviagrön" },
  { hex: "#4A6B5C", label: "Mörkgrön" },
  { hex: "#D4A574", label: "Bärnsten" },
  { hex: "#C68A4F", label: "Honungsgul" },
  { hex: "#B5523B", label: "Rost" },
  { hex: "#7B97A3", label: "Stålblå" },
] as const;

/**
 * Computes the *next* occurrence of a Swedish high-season relative to
 * `from`. If the window for this year has already passed, advances to
 * next year. Returned dates are YYYY-MM-DD strings matching the format
 * native `<input type="date">` produces, so we can drop them straight
 * into the form state without re-parsing.
 */
type Preset = "midsommar" | "jul" | "black-week" | "pask";

function nextOccurrence(name: Preset, from: Date = new Date()) {
  const yyyy = (y: number, m: number, d: number) =>
    `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const dayMs = 86_400_000;
  const year = from.getUTCFullYear();

  if (name === "midsommar") {
    // Window June 18-26 covers Midsommarafton (third Fri 19-25) +
    // Midsommardagen (Sat) + decompression Sunday.
    const end = Date.UTC(year, 5, 26);
    const y = from.getTime() > end ? year + 1 : year;
    return { startsAt: yyyy(y, 6, 18), endsAt: yyyy(y, 6, 26) };
  }
  if (name === "jul") {
    const end = Date.UTC(year, 11, 26);
    const y = from.getTime() > end ? year + 1 : year;
    return { startsAt: yyyy(y, 12, 1), endsAt: yyyy(y, 12, 26) };
  }
  if (name === "black-week") {
    // Black Friday = 4th Friday of November. Monday-before through
    // Cyber Monday = 8-day campaign window.
    const fourthFridayNov = (y: number) => {
      const first = new Date(Date.UTC(y, 10, 1));
      const offset = (5 - first.getUTCDay() + 7) % 7;
      return new Date(Date.UTC(y, 10, 1 + offset + 21));
    };
    let bf = fourthFridayNov(year);
    if (from.getTime() > bf.getTime() + 3 * dayMs) bf = fourthFridayNov(year + 1);
    const start = new Date(bf.getTime() - 4 * dayMs);
    const end = new Date(bf.getTime() + 3 * dayMs);
    return {
      startsAt: yyyy(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate()),
      endsAt: yyyy(end.getUTCFullYear(), end.getUTCMonth() + 1, end.getUTCDate()),
    };
  }
  // pask — Gregorian Easter via Gauss's algorithm. Window: Skärtorsdag
  // (Thursday before) through Annandag påsk (Monday after).
  const easter = (y: number) => {
    const a = y % 19;
    const b = Math.floor(y / 100);
    const c = y % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(y, month - 1, day));
  };
  let candidate = easter(year);
  if (from.getTime() > candidate.getTime() + dayMs) candidate = easter(year + 1);
  const start = new Date(candidate.getTime() - 3 * dayMs);
  const end = new Date(candidate.getTime() + 1 * dayMs);
  return {
    startsAt: yyyy(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate()),
    endsAt: yyyy(end.getUTCFullYear(), end.getUTCMonth() + 1, end.getUTCDate()),
  };
}

const PRESETS: Array<{ id: Preset; label: string; hint: string }> = [
  { id: "midsommar", label: "Midsommar", hint: "Tredje helgen i juni" },
  { id: "pask", label: "Påsk", hint: "Skärtorsdag → annandag" },
  { id: "black-week", label: "Black Week", hint: "Måndag före Black Friday → Cyber Monday" },
  { id: "jul", label: "Jul", hint: "1–26 december" },
];

type Initial = Partial<HeroFormInput> & { id?: string };

export function HeroForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initial?.name ?? "");
  const [motif, setMotif] = useState(initial?.motif ?? "");
  const [caption, setCaption] = useState(initial?.caption ?? "");
  const [accent, setAccent] = useState(initial?.accent ?? "#7A8B6F");
  const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl ?? "");
  const [photoAlt, setPhotoAlt] = useState(initial?.photoAlt ?? "");
  const initialTimingKind: "season" | "dates" =
    initial?.season ? "season" : "dates";
  const [timingKind, setTimingKind] = useState<"season" | "dates">(
    initialTimingKind
  );
  const [season, setSeason] = useState<HeroSeason | "">(
    (initial?.season as HeroSeason | null) ?? ""
  );
  const [startsAt, setStartsAt] = useState(initial?.startsAt ?? "");
  const [endsAt, setEndsAt] = useState(initial?.endsAt ?? "");
  const [priority, setPriority] = useState(initial?.priority ?? 0);
  const [status, setStatus] = useState<HeroStatus>(
    (initial?.status as HeroStatus | undefined) ?? "DRAFT"
  );
  const [showHex, setShowHex] = useState(
    !BRAND_SWATCHES.some((s) => s.hex === (initial?.accent ?? "#7A8B6F"))
  );
  // When the editor picks an Unsplash photo we hang onto its download
  // endpoint. On successful save we tell Unsplash "this was actually
  // used" (their API guideline). Cleared once we've called it so a
  // re-save doesn't double-track.
  const [pendingUnsplashDownload, setPendingUnsplashDownload] = useState<
    string | null
  >(null);

  // Suggest which Unsplash chip to highlight based on the editor's
  // current timing choices. Date-window presets win over plain season
  // because the editor was more specific.
  const suggestedKey: SuggestionKey | null =
    timingKind === "season" && season
      ? (season as SuggestionKey)
      : timingKind === "dates" && startsAt
      ? guessCampaignKey(startsAt)
      : null;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const input: HeroFormInput = {
        id: initial?.id,
        name,
        motif,
        caption,
        accent,
        photoUrl,
        photoAlt,
        season: timingKind === "season" ? (season || null) as HeroSeason | null : null,
        startsAt: timingKind === "dates" ? startsAt || null : null,
        endsAt: timingKind === "dates" ? endsAt || null : null,
        priority: Number(priority) || 0,
        status,
      };
      const res = await saveHero(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Unsplash compliance: tell them this photo was actually used.
      // Fire-and-forget so the redirect isn't delayed by the round-trip.
      if (pendingUnsplashDownload) {
        void adminTrackUnsplashDownload(pendingUnsplashDownload);
        setPendingUnsplashDownload(null);
      }
      if (!initial?.id) {
        // Created — bounce to the edit page so a follow-up edit doesn't
        // accidentally create another row.
        router.push(`/admin/startsida/hero/${res.id}`);
      } else {
        router.refresh();
      }
    });
  }

  async function onArchive() {
    if (!initial?.id) return;
    const ok = await confirmDialog({
      title: "Arkivera hero-bilden?",
      body: "Den slutar visas direkt. Du kan publicera den igen senare.",
      confirmLabel: "Arkivera",
    });
    if (!ok) return;
    const res = await setHeroStatus(initial.id, "ARCHIVED");
    if (res.ok) router.push("/admin/startsida/hero");
    else setError(res.error);
  }

  async function onDelete() {
    if (!initial?.id) return;
    const ok = await confirmDialog({
      title: "Ta bort permanent?",
      body: "Hero-bilden tas bort från databasen och den uppladdade bilden raderas. Detta går inte att ångra.",
      confirmLabel: "Ta bort",
      intent: "destructive",
    });
    if (!ok) return;
    const res = await deleteHero(initial.id);
    if (res.ok) router.push("/admin/startsida/hero");
    else setError(res.error);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8 max-w-[820px]">
      {error && (
        <div className="bg-status-error/8 border border-status-error/30 rounded-xl px-5 py-4 font-sans text-body text-status-error">
          {error}
        </div>
      )}

      <Field label="Namn (intern)" hint="Bara du och dina kollegor ser detta. T.ex. ”Midsommar 2026”.">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
          className="h-12 w-full px-4 rounded-lg border border-border bg-surface font-sans text-body-lg text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </Field>

      <Field
        label="Rubrik (visas stor i bilden)"
        hint="Kort, poetisk. T.ex. ”När häggen blommar”."
      >
        <input
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          required
          maxLength={60}
          className="h-12 w-full px-4 rounded-lg border border-border bg-surface font-sans text-body-lg text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </Field>

      <Field
        label="Underrubrik (mindre text)"
        hint="Förklarar bilden. T.ex. ”Vit hägg mot djupgrön skog, mitten av maj”."
      >
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          required
          maxLength={120}
          className="h-12 w-full px-4 rounded-lg border border-border bg-surface font-sans text-body-lg text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </Field>

      <Field
        label="Bild"
        hint="Sök på Unsplash, välj från biblioteket med tidigare bilder, eller ladda upp din egen. Bilder som väljs sparas automatiskt lokalt — de försvinner inte om originalet tas bort."
      >
        <HeroPhotoPicker
          photoUrl={photoUrl}
          suggestedKey={suggestedKey}
          onPick={({ url, unsplashDownloadLocation }) => {
            setPhotoUrl(url);
            setPendingUnsplashDownload(unsplashDownloadLocation ?? null);
          }}
        />
      </Field>

      {/* Live hero-shaped preview — shows what the homepage will look
          like as the editor types. Mirrors the geometry of
          components/marketing/hero.tsx so the editor can verify subject
          placement, text legibility, and accent contrast before saving. */}
      <Field
        label="Förhandsvisning"
        hint="Så ser hero-bilden ut på startsidan med dina ändringar."
      >
        <HeroPreview
          photoUrl={photoUrl}
          motif={motif}
          caption={caption}
          accent={accent}
        />
      </Field>

      <Field
        label="Bildtext för skärmläsare"
        hint="Beskriver bilden för personer med skärmläsare. T.ex. ”Häggens vita blomklasar mot djupgrön vårskog”."
      >
        <input
          value={photoAlt}
          onChange={(e) => setPhotoAlt(e.target.value)}
          required
          maxLength={200}
          className="h-12 w-full px-4 rounded-lg border border-border bg-surface font-sans text-body-lg text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </Field>

      <Field
        label="Färgton för kursiv text"
        hint="Färgen på det kursiva ordet i rubriken på startsidan."
      >
        <div className="flex flex-wrap gap-3 mb-3">
          {BRAND_SWATCHES.map((s) => (
            <button
              key={s.hex}
              type="button"
              onClick={() => {
                setAccent(s.hex);
                setShowHex(false);
              }}
              className={`flex flex-col items-center gap-1.5 transition-all ${
                accent === s.hex ? "scale-110" : "hover:scale-105"
              }`}
              aria-pressed={accent === s.hex}
              aria-label={`Välj ${s.label}`}
            >
              <span
                className={`w-12 h-12 rounded-full border-2 ${
                  accent === s.hex
                    ? "border-primary-deep ring-2 ring-primary-deep/30"
                    : "border-border"
                }`}
                style={{ backgroundColor: s.hex }}
              />
              <span className="font-sans text-micro text-ink-mute">
                {s.label}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowHex(!showHex)}
            className="font-sans text-caption text-primary-deep underline decoration-accent/40 underline-offset-[3px] self-center ml-2"
          >
            {showHex ? "Dölj annan färg" : "Annan färg…"}
          </button>
        </div>
        {showHex && (
          <input
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            placeholder="#7A8B6F"
            pattern="#[0-9a-fA-F]{6}"
            className="h-11 w-[140px] px-3 rounded-lg border border-border bg-surface font-mono text-body text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        )}
      </Field>

      <Field
        label="När ska bilden visas?"
        hint="Antingen en hel årstid (för vanlig vårbild, sommarbild osv) eller ett specifikt datumfönster (för kampanjer som midsommar, jul, Black Week)."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <RadioCard
              checked={timingKind === "season"}
              onChange={() => setTimingKind("season")}
              label="En hel årstid"
              sub="Vår · Sommar · Höst · Vinter"
            />
            <RadioCard
              checked={timingKind === "dates"}
              onChange={() => setTimingKind("dates")}
              label="Datumfönster"
              sub="T.ex. midsommar, jul, Black Week"
            />
          </div>

          {timingKind === "season" && (
            <div className="flex flex-wrap gap-2 pt-2">
              {(Object.keys(seasons) as HeroSeason[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeason(s)}
                  aria-pressed={season === s}
                  className={`h-11 px-5 rounded-lg border-2 font-sans text-body font-semibold transition-colors ${
                    season === s
                      ? "border-primary-deep bg-primary-deep text-surface"
                      : "border-border bg-surface text-primary-deep hover:bg-surface-warm"
                  }`}
                >
                  {seasons[s].label}
                </button>
              ))}
            </div>
          )}

          {timingKind === "dates" && (
            <div className="pt-2 space-y-4">
              <div>
                <p className="font-sans text-small text-ink-mute font-semibold mb-2">
                  Snabbval för svenska högsäsonger
                </p>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      title={p.hint}
                      onClick={() => {
                        const occ = nextOccurrence(p.id);
                        setStartsAt(occ.startsAt);
                        setEndsAt(occ.endsAt);
                        // Campaigns should beat the seasonal default.
                        // Only bump if the editor hasn't already chosen
                        // something specific (keep their override intact).
                        if (priority === 0) setPriority(10);
                      }}
                      className="h-11 px-4 rounded-lg border-2 border-border bg-surface font-sans text-body font-semibold text-primary-deep hover:border-primary-deep hover:bg-surface-warm transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <p className="font-sans text-caption text-ink-mute mt-2 italic">
                  Klick fyller i nästa datum automatiskt och sätter prioritet 10 så att kampanjen vinner över årstiden.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="font-sans text-small text-ink-mute font-semibold mb-1.5 block">
                    Aktiv från
                  </span>
                  <input
                    type="date"
                    value={startsAt ? startsAt.slice(0, 10) : ""}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="h-12 w-full px-3 rounded-lg border border-border bg-surface font-sans text-body-lg text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </label>
                <label className="block">
                  <span className="font-sans text-small text-ink-mute font-semibold mb-1.5 block">
                    Aktiv till och med
                  </span>
                  <input
                    type="date"
                    value={endsAt ? endsAt.slice(0, 10) : ""}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="h-12 w-full px-3 rounded-lg border border-border bg-surface font-sans text-body-lg text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </Field>

      <Field
        label="Prioritet"
        hint="Om flera bilder är aktiva samtidigt visas den med högst siffra. Lämna 0 om du inte vet — kampanjer brukar ligga på 10."
      >
        <input
          type="number"
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
          min={0}
          max={100}
          className="h-12 w-[120px] px-3 rounded-lg border border-border bg-surface font-sans text-body-lg text-ink tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </Field>

      <Field
        label="Status"
        hint="Bara ”Publicerad” visas på startsidan. ”Utkast” kan du jobba på ostört. ”Arkiverad” gömmer den utan att radera."
      >
        <div className="flex flex-wrap gap-2">
          {(["DRAFT", "PUBLISHED", "ARCHIVED"] as HeroStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              aria-pressed={status === s}
              className={`h-11 px-5 rounded-lg border-2 font-sans text-body font-semibold transition-colors ${
                status === s
                  ? "border-primary-deep bg-primary-deep text-surface"
                  : "border-border bg-surface text-primary-deep hover:bg-surface-warm"
              }`}
            >
              {s === "DRAFT"
                ? "Utkast"
                : s === "PUBLISHED"
                ? "Publicerad"
                : "Arkiverad"}
            </button>
          ))}
        </div>
      </Field>

      <div className="pt-6 border-t border-border flex flex-wrap items-center gap-3 sticky bottom-0 bg-surface-warm/95 backdrop-blur-sm py-4 -mx-5 px-5 md:-mx-10 md:px-10 lg:relative lg:bg-transparent lg:backdrop-blur-none lg:p-0 lg:border-t lg:mt-0">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-primary-deep text-surface font-sans text-body-lg font-semibold hover:bg-primary disabled:opacity-60 transition-colors"
        >
          {pending ? "Sparar…" : "Spara ändringar"}
        </button>
        {initial?.id && (
          <>
            <button
              type="button"
              onClick={onArchive}
              className="inline-flex items-center justify-center h-12 px-5 rounded-lg border border-border bg-surface font-sans text-body font-semibold text-primary-deep hover:bg-surface-warm transition-colors"
            >
              Arkivera
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center justify-center h-12 px-5 rounded-lg font-sans text-body font-semibold text-status-error hover:bg-status-error/8 transition-colors"
            >
              Ta bort permanent
            </button>
          </>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block font-display text-[18px] font-medium tracking-tight text-primary-deep mb-1">
        {label}
      </label>
      <p className="font-sans text-small text-ink-mute leading-relaxed mb-3 max-w-[640px]">
        {hint}
      </p>
      {children}
    </div>
  );
}

function RadioCard({
  checked,
  onChange,
  label,
  sub,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      className={`flex-1 min-w-[200px] text-left p-4 rounded-xl border-2 transition-colors ${
        checked
          ? "border-primary-deep bg-primary-deep/5"
          : "border-border bg-surface hover:bg-surface-warm"
      }`}
    >
      <p className="font-display text-body-lg font-semibold text-primary-deep">
        {checked && <span className="text-accent-deep mr-1">●</span>}
        {label}
      </p>
      <p className="font-sans text-caption text-ink-mute mt-0.5">{sub}</p>
    </button>
  );
}

/**
 * Live preview that mirrors the geometry of `components/marketing/hero.tsx`
 * at ~half size. Shows the actual headline ("Livskvalitet, i fokus.")
 * with the editor's chosen accent on the italic word, the chosen photo
 * scaled to cover, the left-darkening gradient for headline contrast,
 * and the motif italic at bottom-left. Updates as the editor types.
 */
function HeroPreview({
  photoUrl,
  motif,
  caption,
  accent,
}: {
  photoUrl: string;
  motif: string;
  caption: string;
  accent: string;
}) {
  return (
    <div className="space-y-3">
      <div
        className="relative overflow-hidden rounded-xl border border-border bg-primary-deep shadow-sm"
        style={{ aspectRatio: "16 / 9", maxHeight: 360 }}
      >
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 820px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-surface/50 font-sans text-small">
            (Lägg till en bild så visas förhandsvisningen)
          </div>
        )}

        {/* Left-darkening gradient — same recipe as hero.tsx */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(15,36,64,0.78) 0%, rgba(15,36,64,0.5) 38%, rgba(15,36,64,0) 70%)",
          }}
        />
        {/* Bottom vignette */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(15,36,64,0) 65%, rgba(15,36,64,0.35) 100%)",
          }}
        />

        {/* Headline overlay — text matches the actual hero.tsx render */}
        <div className="absolute inset-0 flex items-center px-5 md:px-6">
          <h2
            className="font-display font-medium tracking-tight leading-[1.02] text-surface m-0"
            style={{ fontSize: "clamp(28px, 5vw, 56px)" }}
          >
            Livskvalitet,{" "}
            <em
              className="not-italic"
              style={{ fontStyle: "italic", color: accent, fontWeight: 400 }}
            >
              i fokus.
            </em>
          </h2>
        </div>

        {/* Motif bottom-left — matches hero.tsx */}
        <div className="absolute bottom-4 left-5 md:left-6 font-display italic text-caption text-surface/70 pointer-events-none max-w-[60%]">
          {motif || <span className="text-surface/40">(skriv en rubrik)</span>}
        </div>
      </div>

      {caption && (
        <p className="font-sans text-caption text-ink-mute italic">
          Underrubrik (visas inte i bilden — för sökmotorer + andra
          kanaler): {caption}
        </p>
      )}
    </div>
  );
}

/**
 * Map a startsAt YYYY-MM-DD (or ISO) string to the suggestion chip we
 * should auto-highlight in the Unsplash search tab. Returns NULL when
 * the date doesn't fall in any of our known high-season windows — in
 * that case the picker just opens with no chip pre-active.
 */
function guessCampaignKey(startsAt: string): SuggestionKey | null {
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) return null;
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  // Midsommar window — mid-June
  if (m === 6 && day >= 15 && day <= 30) return "midsommar";
  // Påsk lands March-April. Without recomputing Easter here we treat
  // March 15 → April 30 as "påsk-ish" — good enough for chip surfacing.
  if ((m === 3 && day >= 15) || (m === 4 && day <= 30)) return "pask";
  // Black Week — late November
  if (m === 11 && day >= 20) return "black-week";
  // Jul — December
  if (m === 12) return "jul";
  return null;
}
