"use client";

import { useState, useRef, type ChangeEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  uploadGalleryImage,
  setGalleryUrls,
} from "@/lib/admin/image-actions";

const MAX_IMAGES = 12;

/**
 * Multi-image gallery for a product. Three editorial gestures:
 *   1. Upload — one or more files at once; each is normalised server-side
 *      (same pipeline as the primary image)
 *   2. Reorder — left/right arrows (mobile-friendly; we don't need full
 *      drag-and-drop for ≤12 items)
 *   3. Delete — × button per tile
 *
 * State lives client-side and pushes to the server on save via
 * `setGalleryUrls`. Upload is immediate (file → server → URL → appended).
 */
export function ProductGalleryEditor({
  slug,
  initialUrls,
}: {
  slug: string;
  initialUrls: string[];
}) {
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remaining = MAX_IMAGES - urls.length;

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setError(null);
    setSaved(false);
    setPending(true);

    const accepted: string[] = [];
    for (const file of files) {
      if (urls.length + accepted.length >= MAX_IMAGES) break;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slug", slug);
      const result = await uploadGalleryImage(fd);
      if (!result.ok) {
        setError(result.error);
        break;
      }
      accepted.push(result.imageUrl);
    }

    if (accepted.length > 0) {
      setUrls((prev) => [...prev, ...accepted]);
    }
    setPending(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function persist(next: string[]) {
    setError(null);
    setSaved(false);
    setPending(true);
    setUrls(next); // optimistic
    const result = await setGalleryUrls(slug, next);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setUrls(result.galleryUrls);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function move(idx: number, dir: -1 | 1) {
    const next = [...urls];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    void persist(next);
  }

  function remove(idx: number) {
    if (!confirm("Ta bort den här bilden från galleriet?")) return;
    void persist(urls.filter((_, i) => i !== idx));
  }

  return (
    <div>
      {urls.length === 0 ? (
        <p className="font-sans text-[13px] text-ink-mute italic mb-3">
          Inga galleribilder än. Lägg till för att visa fler vinklar — t.ex.
          baksidans innehållsdeklaration, en livsstilsbild, eller en närbild
          på kapslarna.
        </p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
          {urls.map((url, i) => (
            <li
              key={url}
              className="relative aspect-square rounded-xl overflow-hidden bg-surface-warm border border-border group"
            >
              <Image
                src={url}
                alt=""
                fill
                sizes="(min-width: 768px) 200px, (min-width: 640px) 33vw, 50vw"
                className="object-cover mix-blend-darken"
              />
              {/* Hover/focus chrome: order arrows + delete */}
              <div className="absolute inset-0 bg-primary-deep/0 group-hover:bg-primary-deep/30 transition-colors pointer-events-none" />
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                <div className="flex gap-1">
                  <IconButton
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || pending}
                    aria-label="Flytta vänster"
                  >
                    ←
                  </IconButton>
                  <IconButton
                    onClick={() => move(i, 1)}
                    disabled={i === urls.length - 1 || pending}
                    aria-label="Flytta höger"
                  >
                    →
                  </IconButton>
                </div>
                <IconButton
                  onClick={() => remove(i)}
                  disabled={pending}
                  aria-label="Ta bort"
                  variant="danger"
                >
                  ✕
                </IconButton>
              </div>
              <span className="absolute top-1.5 left-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-deep/80 text-surface font-sans text-[10px] font-semibold tabular-nums">
                {i + 1}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={handleFiles}
          disabled={pending || remaining <= 0}
          className="hidden"
          id={`gallery-upload-${slug}`}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={pending || remaining <= 0}
        >
          {pending ? "Bearbetar…" : "+ Lägg till bilder"}
        </Button>
        <p className="font-sans text-[12px] text-ink-mute">
          {remaining > 0
            ? `${remaining} kvar (max ${MAX_IMAGES})`
            : `Galleriet är fullt (${MAX_IMAGES} bilder)`}
        </p>
        {saved && (
          <span
            role="status"
            className="font-sans text-[12px] text-accent-deep font-semibold"
          >
            ✓ Sparat
          </span>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 font-sans text-[12.5px] text-[#B5523B] bg-[#B5523B]/10 px-3 py-2 rounded-md"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function IconButton({
  onClick,
  disabled,
  children,
  variant = "default",
  ...rest
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "default" | "danger";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "inline-flex items-center justify-center w-7 h-7 rounded-md font-sans text-[14px] font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed";
  const palette =
    variant === "danger"
      ? "bg-[#B5523B] text-white hover:bg-[#7A331E]"
      : "bg-surface text-primary-deep hover:bg-surface-warm";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${palette}`}
      {...rest}
    >
      {children}
    </button>
  );
}
