"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  adminSearchUnsplash,
  listLocalHeroPhotos,
  uploadHeroPhoto,
  type LocalHeroPhoto,
} from "@/lib/admin/hero-actions";
import {
  HERO_SUGGESTIONS,
  type SuggestionKey,
} from "@/lib/admin/hero-suggestions";
import type { UnsplashPhoto } from "@/lib/integrations/unsplash";

/**
 * Three-tabbed photo picker for the hero editor.
 *
 *   1. Sök på Unsplash — search a real thumbnail grid. Pick a photo with
 *      a single click. (Mirroring to /uploads/hero/ happens server-side
 *      on save, see `saveHero` in lib/admin/hero-actions.ts.)
 *   2. Bibliotek — previously-uploaded hero photos at /uploads/hero/.
 *      Lets editors reuse what we already have, newest first.
 *   3. Egen bild — drag-drop, file picker, or URL paste. Power-user
 *      fallback for when neither of the other two has what we need.
 *
 * The `onPick` callback receives the chosen URL plus an optional
 * `unsplashDownloadLocation` — that's the API endpoint we MUST hit when
 * the photo is actually used (Unsplash compliance). The parent form
 * holds onto it and fires `adminTrackUnsplashDownload` on save.
 *
 * `suggestedKey` lets the parent hint which season/campaign chip should
 * be auto-highlighted (e.g. when the timing-section already has
 * "Midsommar" selected, the search tab opens with that chip active).
 */

export type HeroPhotoPickerProps = {
  /** Current photo URL — drives the "current selection"-banner. */
  photoUrl: string;
  /** Hint which suggestion to highlight initially. */
  suggestedKey?: SuggestionKey | null;
  onPick: (next: { url: string; unsplashDownloadLocation?: string }) => void;
};

type Tab = "search" | "library" | "upload";

export function HeroPhotoPicker({
  photoUrl,
  suggestedKey,
  onPick,
}: HeroPhotoPickerProps) {
  const [tab, setTab] = useState<Tab>("search");

  return (
    <div>
      <div
        role="tablist"
        aria-label="Bildkälla"
        className="flex flex-wrap gap-2 mb-4 border-b border-border"
      >
        <TabButton active={tab === "search"} onClick={() => setTab("search")}>
          <span aria-hidden>🔍</span> Sök på Unsplash
        </TabButton>
        <TabButton active={tab === "library"} onClick={() => setTab("library")}>
          <span aria-hidden>📁</span> Bibliotek
        </TabButton>
        <TabButton active={tab === "upload"} onClick={() => setTab("upload")}>
          <span aria-hidden>⬆</span> Egen bild
        </TabButton>
      </div>

      {tab === "search" && (
        <UnsplashSearchTab
          suggestedKey={suggestedKey}
          onPick={onPick}
          currentPhotoUrl={photoUrl}
        />
      )}
      {tab === "library" && (
        <LibraryTab onPick={onPick} currentPhotoUrl={photoUrl} />
      )}
      {tab === "upload" && (
        <UploadTab onPick={onPick} currentPhotoUrl={photoUrl} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`h-12 px-5 -mb-px border-b-2 font-sans text-[15px] font-semibold flex items-center gap-2 transition-colors ${
        active
          ? "text-primary-deep border-primary-deep"
          : "text-ink-mute border-transparent hover:text-ink-body"
      }`}
    >
      {children}
    </button>
  );
}

/* ─── Unsplash search tab ─────────────────────────────────────── */

function UnsplashSearchTab({
  suggestedKey,
  onPick,
  currentPhotoUrl,
}: {
  suggestedKey?: SuggestionKey | null;
  onPick: HeroPhotoPickerProps["onPick"];
  currentPhotoUrl: string;
}) {
  const [query, setQuery] = useState(
    suggestedKey ? HERO_SUGGESTIONS[suggestedKey].query : ""
  );
  const [photos, setPhotos] = useState<UnsplashPhoto[] | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [searching, startSearch] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Auto-fire search on mount if we have a suggested key + query.
  useEffect(() => {
    if (suggestedKey) runSearch(HERO_SUGGESTIONS[suggestedKey].query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function runSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setError(null);
    setQuery(trimmed);
    startSearch(async () => {
      const res = await adminSearchUnsplash(trimmed);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setConfigured(res.configured);
      setPhotos(res.result?.photos ?? []);
    });
  }

  if (configured === false) {
    return <UnsplashNotConfigured />;
  }

  return (
    <div>
      {/* Suggestion chips — one-click jumps to a curated query */}
      <div className="mb-4">
        <p className="font-sans text-[12.5px] text-ink-mute font-semibold mb-2">
          Förslag — klicka för att söka
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(HERO_SUGGESTIONS) as SuggestionKey[]).map((k) => {
            const s = HERO_SUGGESTIONS[k];
            const active = suggestedKey === k && query === s.query;
            return (
              <button
                key={k}
                type="button"
                onClick={() => runSearch(s.query)}
                aria-pressed={active}
                className={`h-10 px-4 rounded-full border-2 font-sans text-[13px] font-semibold transition-colors ${
                  active
                    ? "border-primary-deep bg-primary-deep text-surface"
                    : "border-border bg-surface text-primary-deep hover:bg-surface-warm"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* NOT a <form> — this whole picker lives inside the HeroForm's
          outer <form>, and HTML forbids nesting forms. We catch Enter
          on the input manually and rely on a `type="button"` submit. */}
      <div className="flex gap-2 mb-5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runSearch(query);
            }
          }}
          placeholder="Sök t.ex. ”midsummer flowers”, ”winter forest”…"
          className="flex-1 h-12 px-4 rounded-lg border border-border bg-surface font-sans text-[15.5px] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        <button
          type="button"
          onClick={() => runSearch(query)}
          disabled={searching}
          className="h-12 px-5 rounded-lg bg-primary-deep text-surface font-sans text-[15px] font-semibold hover:bg-primary disabled:opacity-60 transition-colors"
        >
          {searching ? "Söker…" : "Sök"}
        </button>
      </div>

      {error && (
        <p className="mb-4 font-sans text-[14px] text-status-error">{error}</p>
      )}

      {photos === null && !searching && (
        <p className="font-sans text-[14px] text-ink-mute italic py-8">
          Skriv in vad du letar efter, eller klicka på ett förslag ovan.
        </p>
      )}

      {photos && photos.length === 0 && !searching && (
        <p className="font-sans text-[14px] text-ink-mute italic py-8">
          Inga träffar för ”{query}”. Prova en annan formulering.
        </p>
      )}

      {photos && photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {photos.map((p) => {
            const isSelected = currentPhotoUrl === p.fullUrl;
            return (
              <div key={p.id} className="flex flex-col">
                <button
                  type="button"
                  onClick={() =>
                    onPick({
                      url: p.fullUrl,
                      unsplashDownloadLocation: p.downloadLocation,
                    })
                  }
                  aria-pressed={isSelected}
                  className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all ${
                    isSelected
                      ? "border-primary-deep ring-4 ring-primary-deep/20"
                      : "border-border hover:border-primary"
                  }`}
                >
                  <Image
                    src={p.thumbUrl}
                    alt={p.alt}
                    fill
                    sizes="(max-width: 768px) 50vw, 240px"
                    className="object-cover"
                    unoptimized
                  />
                  {isSelected && (
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-deep text-surface font-sans text-[11.5px] font-semibold">
                      ✓ Vald
                    </span>
                  )}
                </button>
                <p className="font-sans text-[11px] text-ink-mute mt-1.5 truncate">
                  Foto:{" "}
                  <Link
                    href={p.photographer.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-ink-mute/40 hover:decoration-ink-mute"
                  >
                    {p.photographer.name}
                  </Link>{" "}
                  / Unsplash
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UnsplashNotConfigured() {
  return (
    <div className="bg-surface-warm border border-border rounded-xl p-6 max-w-[640px]">
      <p className="font-display text-[18px] font-medium tracking-tight text-primary-deep mb-3">
        Anslut Unsplash för att söka bilder härifrån
      </p>
      <p className="font-sans text-[14px] text-ink-body leading-relaxed mb-4">
        Unsplash har miljontals fria bilder som passar våra säsonger. Skaffa
        en gratis API-nyckel (tar två minuter) så kan du söka direkt i admin
        istället för att gå mellan flikar.
      </p>
      <ol className="font-sans text-[14px] text-ink-body leading-relaxed space-y-2 list-decimal pl-5 mb-4">
        <li>
          Gå till{" "}
          <Link
            href="https://unsplash.com/developers"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-deep underline decoration-accent/40 underline-offset-[3px]"
          >
            unsplash.com/developers
          </Link>{" "}
          och skapa ett konto.
        </li>
        <li>
          Klicka <strong>”Your apps” → ”New Application”</strong>, godkänn
          riktlinjerna.
        </li>
        <li>
          Kopiera <strong>”Access Key”</strong> (INTE Secret key).
        </li>
        <li>
          Lägg till i <code>.env.local</code>:{" "}
          <code className="font-mono text-[13px] bg-surface px-2 py-0.5 rounded">
            UNSPLASH_ACCESS_KEY=…
          </code>
        </li>
        <li>Starta om dev-servern.</li>
      </ol>
      <p className="font-sans text-[13px] text-ink-mute italic">
        Under tiden kan du använda flikarna <strong>Bibliotek</strong> eller{" "}
        <strong>Egen bild</strong>.
      </p>
    </div>
  );
}

/* ─── Library tab — previously-uploaded /uploads/hero/ ─────────── */

function LibraryTab({
  onPick,
  currentPhotoUrl,
}: {
  onPick: HeroPhotoPickerProps["onPick"];
  currentPhotoUrl: string;
}) {
  const [photos, setPhotos] = useState<LocalHeroPhoto[] | null>(null);

  useEffect(() => {
    (async () => {
      const res = await listLocalHeroPhotos();
      setPhotos(res);
    })();
  }, []);

  if (photos === null) {
    return (
      <p className="font-sans text-[14px] text-ink-mute italic py-8">
        Laddar bibliotek…
      </p>
    );
  }
  if (photos.length === 0) {
    return (
      <p className="font-sans text-[14px] text-ink-mute italic py-8">
        Inga sparade hero-bilder än. Sök på Unsplash eller ladda upp en
        egen — sedan dyker de upp här för återanvändning.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {photos.map((p) => {
        const isSelected = currentPhotoUrl === p.url;
        return (
          <button
            key={p.url}
            type="button"
            onClick={() => onPick({ url: p.url })}
            aria-pressed={isSelected}
            className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all ${
              isSelected
                ? "border-primary-deep ring-4 ring-primary-deep/20"
                : "border-border hover:border-primary"
            }`}
          >
            <Image
              src={p.url}
              alt=""
              fill
              sizes="(max-width: 768px) 50vw, 240px"
              className="object-cover"
              unoptimized
            />
            {isSelected && (
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-deep text-surface font-sans text-[11.5px] font-semibold">
                ✓ Vald
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Upload tab — drag/drop + file picker + URL paste ─────────── */

function UploadTab({
  onPick,
  currentPhotoUrl,
}: {
  onPick: HeroPhotoPickerProps["onPick"];
  currentPhotoUrl: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await uploadHeroPhoto(fd);
      if (!res.ok) setError(res.error);
      else onPick({ url: res.photoUrl });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5 max-w-[640px]">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className={`relative border-2 rounded-xl overflow-hidden transition-colors ${
          dragOver
            ? "border-primary border-solid bg-primary/5"
            : "border-border border-dashed bg-surface-warm hover:bg-surface-alt"
        }`}
        style={{ aspectRatio: "16 / 9", maxHeight: 320 }}
      >
        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-6 text-center">
          <span aria-hidden className="text-5xl text-ink-soft mb-3">
            🖼
          </span>
          <p className="font-display text-[17px] font-medium text-primary-deep">
            Dra hit en bild från datorn
          </p>
          <p className="font-sans text-[13.5px] text-ink-mute mt-1">
            eller klicka för att välja en fil
          </p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>
        {uploading && (
          <div className="absolute inset-0 bg-surface/90 backdrop-blur-sm flex items-center justify-center">
            <p className="font-display text-[16px] font-medium text-primary-deep">
              Laddar upp och bearbetar bilden…
            </p>
          </div>
        )}
      </div>
      {error && (
        <p className="font-sans text-[14px] text-status-error">{error}</p>
      )}

      <div>
        <p className="font-sans text-[12.5px] text-ink-mute font-semibold mb-2">
          Eller klistra in en bild-URL — vi laddar ner den åt dig vid Spara
        </p>
        <div className="flex gap-2">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://images.unsplash.com/photo-…"
            className="flex-1 h-12 px-3 rounded-lg border border-border bg-surface font-sans text-[14.5px] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <button
            type="button"
            disabled={!urlInput.trim()}
            onClick={() => {
              onPick({ url: urlInput.trim() });
              setUrlInput("");
            }}
            className="h-12 px-5 rounded-lg border border-border bg-surface font-sans text-[14px] font-semibold text-primary-deep hover:bg-surface-warm disabled:opacity-60 transition-colors"
          >
            Använd URL
          </button>
        </div>
        {currentPhotoUrl.startsWith("/uploads/hero/") && (
          <p className="mt-3 font-sans text-[12.5px] text-accent-deep font-semibold">
            ✓ Sparad lokalt på biomax.nu — förblir tillgänglig.
          </p>
        )}
      </div>
    </div>
  );
}
