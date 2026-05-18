"use client";

import { useState, useRef, useTransition, type DragEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { uploadProductImage } from "@/lib/admin/image-actions";
import { cn } from "@/lib/utils";

const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_MB = 10;

export function ProductImageUpload({
  slug,
  initialUrl,
  productName,
}: {
  slug: string;
  initialUrl: string;
  productName: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [imageUrl, setImageUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  function validateFile(file: File): string | null {
    if (!ALLOWED_MIME.includes(file.type)) {
      return `Filtyp stöds inte. Använd JPG, PNG, WebP eller GIF.`;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      return `Bilden är ${Math.round(file.size / 1024 / 1024)} MB. Max ${MAX_MB} MB.`;
    }
    return null;
  }

  function upload(file: File) {
    const err = validateFile(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSuccess(false);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("slug", slug);
    startTransition(async () => {
      const result = await uploadProductImage(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setImageUrl(result.imageUrl);
      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 2500);
    });
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave() {
    setIsDragging(false);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }

  return (
    <div className="bg-surface-alt border border-border rounded-xl p-6 md:p-8">
      <p className="font-sans text-micro uppercase tracking-[0.16em] font-semibold text-ink-mute mb-4">
        Produktbild
      </p>

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Klicka eller släpp en bild för att ladda upp"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={cn(
          "relative aspect-square w-full max-w-[360px] rounded-xl overflow-hidden cursor-pointer transition-all",
          "border-2 border-dashed",
          isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/40 bg-surface-warm"
        )}
      >
        {imageUrl ? (
          <Image
            key={imageUrl}
            src={imageUrl}
            alt={productName}
            fill
            sizes="360px"
            priority
            className="object-cover mix-blend-darken"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-sans text-small text-ink-mute">
              Ingen bild ännu
            </p>
          </div>
        )}

        {/* Hover / dragging overlay */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-2 transition-all",
            "bg-primary-deep/0 hover:bg-primary-deep/60 text-surface",
            isDragging && "bg-primary-deep/70",
            pending && "bg-primary-deep/70"
          )}
        >
          <p
            className={cn(
              "font-display italic text-xl text-center px-6 transition-opacity",
              isDragging || pending
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100"
            )}
            style={
              isDragging || pending
                ? { opacity: 1 }
                : { opacity: 0 }
            }
          >
            {pending
              ? "Bearbetar…"
              : isDragging
                ? "Släpp bilden"
                : "Byt bild"}
          </p>
          <p
            className="font-sans text-caption uppercase tracking-[0.16em] font-semibold"
            style={
              isDragging || pending
                ? { opacity: 0.9 }
                : { opacity: 0 }
            }
          >
            {pending ? "" : "Klicka eller släpp en bild"}
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_MIME.join(",")}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
        className="sr-only"
      />

      <div className="mt-4 flex flex-wrap gap-3 items-center">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-full font-sans font-semibold text-small tracking-tight bg-primary text-surface hover:bg-primary-deep border border-transparent transition-colors disabled:opacity-50 px-5 h-10"
        >
          {pending ? "Bearbetar…" : "Välj bild"}
        </button>
        {success && (
          <span className="font-sans text-small text-accent-deep font-semibold">
            Sparat ✓
          </span>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 font-sans text-small text-status-error bg-status-error/10 px-3 py-2 rounded-md"
        >
          {error}
        </p>
      )}

      <p className="mt-4 font-sans text-caption text-ink-soft leading-relaxed max-w-[420px]">
        Bilden trimmas och centreras automatiskt mot vit bakgrund i 1000×1000 px.
        Helst en bild av flaskan/burken på vit eller nära-vit bakgrund —
        resten sköter vi.
      </p>
    </div>
  );
}
