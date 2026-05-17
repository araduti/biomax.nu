"use server";

import { writeFile, unlink, mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./guard";
import {
  searchUnsplashPhotos as _searchUnsplash,
  triggerDownload as _triggerDownload,
  isUnsplashConfigured,
  type UnsplashSearchResult,
} from "@/lib/integrations/unsplash";

/**
 * Hero photography editor actions.
 *
 * Two responsibilities:
 *   1. Upload + normalize a hero photo. Wide-aspect (16:9 at 1920×1080)
 *      progressive JPEG so it loads fast as the LCP image.
 *   2. CRUD for `HomepageHero` rows — create, update, set status, delete.
 *
 * Every mutation calls `revalidatePath("/")` so editors see the change
 * land on the live site within seconds.
 */

const HERO_DIR = "public/uploads/hero";
const HERO_URL_PREFIX = "/uploads/hero/";
const MAX_BYTES = 12 * 1024 * 1024; // 12 MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const TARGET_WIDTH = 1920;
const TARGET_HEIGHT = 1080;
const REMOTE_FETCH_TIMEOUT_MS = 15_000;

export type HeroPhotoUploadResult =
  | { ok: true; photoUrl: string }
  | { ok: false; error: string };

/**
 * Upload a hero photo. Stores at /uploads/hero/{slug}-{timestamp}.jpg
 * and returns the public URL for the caller to persist alongside other
 * fields. We DO NOT mutate the `HomepageHero` row here — the form's
 * save action handles persistence so partial uploads don't leave dangling
 * DB references.
 */
export async function uploadHeroPhoto(
  formData: FormData
): Promise<HeroPhotoUploadResult> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Ingen bild bifogad." };
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return {
      ok: false,
      error: `Filtypen stöds inte (${file.type}). Använd JPG, PNG eller WebP.`,
    };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: `Bilden är för stor (${Math.round(
        file.size / 1024 / 1024
      )} MB). Max ${Math.round(MAX_BYTES / 1024 / 1024)} MB.`,
    };
  }

  // Process: resize to wide-aspect, JPEG. We `cover`-fit so the photo
  // fills the hero band without letterboxing. Subject placement is the
  // editor's responsibility — pick a photo whose subject is centred.
  let processed: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    processed = await sharp(input)
      .resize(TARGET_WIDTH, TARGET_HEIGHT, {
        fit: "cover",
        position: "centre",
      })
      .jpeg({ quality: 86, progressive: true, mozjpeg: true })
      .toBuffer();
  } catch (err) {
    console.error("[admin hero] image processing failed:", err);
    return { ok: false, error: "Kunde inte bearbeta bilden." };
  }

  if (!existsSync(HERO_DIR)) {
    await mkdir(HERO_DIR, { recursive: true });
  }

  const timestamp = Date.now();
  const filename = `hero-${timestamp}.jpg`;
  const dest = join(HERO_DIR, filename);
  try {
    await writeFile(dest, processed);
  } catch (err) {
    console.error("[admin hero] write failed:", err);
    return { ok: false, error: "Kunde inte spara bilden på servern." };
  }

  return { ok: true, photoUrl: `/uploads/hero/${filename}` };
}

/**
 * Mirror a remote photo (any http(s) URL) into `/uploads/hero/`.
 *
 * Why we do this on save: external URLs can disappear (Unsplash photos
 * get deleted, hotlinks rot). Mirroring once on save makes the brand-
 * pillar hero our own asset forever. The editor can paste any Unsplash
 * link as a *preview*; the moment they save, it becomes a local file.
 *
 * The pipeline matches `uploadHeroPhoto` (1920×1080 progressive JPEG)
 * so a mirrored Unsplash photo and an uploaded laptop file render
 * identically.
 *
 * Returns the new local URL, or NULL on any failure — callers should
 * fall back to keeping the original URL so the editor sees what went
 * wrong instead of silently losing data.
 */
async function mirrorRemotePhoto(url: string): Promise<string | null> {
  if (!/^https?:\/\//i.test(url)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REMOTE_FETCH_TIMEOUT_MS);
  let buf: Buffer;
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      // Some CDNs (Unsplash, Cloudflare) gate without a UA — set a
      // friendly one so we're not blocked.
      headers: { "User-Agent": "biomax.nu/admin (image mirror)" },
    });
    if (!res.ok) {
      console.warn(
        `[admin hero] mirror fetch failed: ${res.status} for ${url}`
      );
      return null;
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      console.warn(
        `[admin hero] mirror got non-image content-type: ${contentType}`
      );
      return null;
    }
    const ab = await res.arrayBuffer();
    if (ab.byteLength > MAX_BYTES) {
      console.warn(
        `[admin hero] mirror payload too large: ${ab.byteLength} bytes`
      );
      return null;
    }
    buf = Buffer.from(ab);
  } catch (err) {
    console.warn("[admin hero] mirror fetch errored:", err);
    return null;
  } finally {
    clearTimeout(timer);
  }

  let processed: Buffer;
  try {
    processed = await sharp(buf)
      .resize(TARGET_WIDTH, TARGET_HEIGHT, { fit: "cover", position: "centre" })
      .jpeg({ quality: 86, progressive: true, mozjpeg: true })
      .toBuffer();
  } catch (err) {
    console.warn("[admin hero] mirror sharp failed:", err);
    return null;
  }

  if (!existsSync(HERO_DIR)) {
    await mkdir(HERO_DIR, { recursive: true });
  }
  const filename = `mirror-${Date.now()}.jpg`;
  const dest = join(HERO_DIR, filename);
  try {
    await writeFile(dest, processed);
  } catch (err) {
    console.warn("[admin hero] mirror write failed:", err);
    return null;
  }
  return `${HERO_URL_PREFIX}${filename}`;
}

// ── Picker server actions ──────────────────────────────────────────

export type UnsplashSearchResponse =
  | { ok: true; configured: true; result: UnsplashSearchResult }
  | { ok: true; configured: false; result: null }
  | { ok: false; error: string };

/**
 * Server-side proxy for Unsplash search. Hides the API key from the
 * browser and lets us cache + rate-limit per-admin if needed later.
 */
export async function adminSearchUnsplash(
  query: string,
  page = 1
): Promise<UnsplashSearchResponse> {
  await requireAdmin();
  if (!isUnsplashConfigured()) {
    return { ok: true, configured: false, result: null };
  }
  try {
    const result = await _searchUnsplash(query, page, 12);
    return { ok: true, configured: true, result };
  } catch (err) {
    console.error("[admin hero] unsplash search failed:", err);
    return { ok: false, error: "Sökning misslyckades." };
  }
}

/**
 * Tell Unsplash a photo was actually used (their API guideline). Called
 * from the form when the editor saves with an Unsplash-sourced photo.
 * Fire-and-forget; the save shouldn't wait on the network round-trip.
 */
export async function adminTrackUnsplashDownload(
  downloadLocation: string
): Promise<{ ok: true }> {
  await requireAdmin();
  void _triggerDownload(downloadLocation);
  return { ok: true };
}

export type LocalHeroPhoto = {
  url: string;
  modifiedAt: number;
};

/**
 * List previously-uploaded hero photos sitting at /uploads/hero/.
 * Newest first. Used by the picker's "Bibliotek"-tab so editors can
 * reuse past photos without re-uploading.
 */
export async function listLocalHeroPhotos(): Promise<LocalHeroPhoto[]> {
  await requireAdmin();
  try {
    if (!existsSync(HERO_DIR)) return [];
    const entries = await readdir(HERO_DIR);
    const out: LocalHeroPhoto[] = [];
    for (const name of entries) {
      if (!/\.(jpe?g|png|webp)$/i.test(name)) continue;
      const path = join(HERO_DIR, name);
      try {
        const s = await stat(path);
        if (!s.isFile()) continue;
        out.push({
          url: `${HERO_URL_PREFIX}${name}`,
          modifiedAt: s.mtimeMs,
        });
      } catch {
        /* ignore */
      }
    }
    out.sort((a, b) => b.modifiedAt - a.modifiedAt);
    return out;
  } catch (err) {
    console.error("[admin hero] list local failed:", err);
    return [];
  }
}

/** Best-effort delete of a previously-mirrored hero file we're replacing. */
async function cleanupOldHeroFile(photoUrl: string | null | undefined) {
  if (!photoUrl?.startsWith(HERO_URL_PREFIX)) return;
  const path = join("public", photoUrl);
  if (!existsSync(path)) return;
  try {
    await unlink(path);
  } catch {
    /* ignore */
  }
}

// ── CRUD ────────────────────────────────────────────────────────────

export type HeroSeason = "var" | "sommar" | "host" | "vinter";
export type HeroStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type HeroFormInput = {
  id?: string;
  name: string;
  motif: string;
  caption: string;
  accent: string;
  photoUrl: string;
  photoAlt: string;
  season: HeroSeason | null;
  startsAt: string | null; // ISO date or YYYY-MM-DD
  endsAt: string | null;
  priority: number;
  status: HeroStatus;
};

export type HeroSaveResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function validate(input: HeroFormInput): string | null {
  if (!input.name.trim()) return "Namn saknas.";
  if (!input.motif.trim()) return "Rubrik saknas.";
  if (!input.caption.trim()) return "Underrubrik saknas.";
  if (!input.photoUrl.trim()) return "Bild saknas.";
  if (!input.photoAlt.trim()) return "Bildtext (alt) saknas.";
  if (!/^#[0-9a-fA-F]{6}$/.test(input.accent)) {
    return "Färgton måste vara hex (#xxxxxx).";
  }
  if (!input.season && !input.startsAt && !input.endsAt) {
    return "Välj antingen en säsong eller ett datumfönster.";
  }
  const startsAt = parseDate(input.startsAt);
  const endsAt = parseDate(input.endsAt);
  if (startsAt && endsAt && startsAt > endsAt) {
    return "Slutdatum måste vara efter startdatum.";
  }
  return null;
}

export async function saveHero(
  input: HeroFormInput
): Promise<HeroSaveResult> {
  await requireAdmin();
  const error = validate(input);
  if (error) return { ok: false, error };

  // Snapshot the existing row's photoUrl so we can (a) skip re-mirroring
  // an unchanged URL on every edit, and (b) clean up the old mirrored
  // file if the editor swapped to a new photo.
  let previousPhotoUrl: string | null = null;
  if (input.id) {
    const existing = await prisma.homepageHero.findUnique({
      where: { id: input.id },
      select: { photoUrl: true },
    });
    previousPhotoUrl = existing?.photoUrl ?? null;
  }

  let photoUrl = input.photoUrl.trim();

  // Auto-mirror remote URLs into /uploads/hero/ so we own the asset.
  // Skip when:
  //  - photoUrl is already a local /uploads/hero/ path (saved before)
  //  - photoUrl is identical to the existing row's value (no-op edit)
  // On mirror failure, keep the original URL so the editor sees the
  // broken-link symptom rather than the save silently dropping their
  // input. They can fix and re-save.
  const isLocal = photoUrl.startsWith(HERO_URL_PREFIX);
  const isUnchanged = previousPhotoUrl === photoUrl;
  if (!isLocal && !isUnchanged && /^https?:\/\//i.test(photoUrl)) {
    const mirrored = await mirrorRemotePhoto(photoUrl);
    if (mirrored) {
      photoUrl = mirrored;
    } else {
      console.warn(
        `[admin hero] could not mirror ${input.photoUrl} — keeping external URL`
      );
    }
  }

  const data = {
    name: input.name.trim(),
    motif: input.motif.trim(),
    caption: input.caption.trim(),
    accent: input.accent.trim(),
    photoUrl,
    photoAlt: input.photoAlt.trim(),
    season: input.season,
    startsAt: parseDate(input.startsAt),
    endsAt: parseDate(input.endsAt),
    priority: Math.round(input.priority),
    status: input.status,
  };

  try {
    if (input.id) {
      await prisma.homepageHero.update({
        where: { id: input.id },
        data,
      });
    } else {
      const created = await prisma.homepageHero.create({ data });
      revalidatePath("/");
      revalidatePath("/admin/startsida/hero");
      return { ok: true, id: created.id };
    }
  } catch (err) {
    console.error("[admin hero] save failed:", err);
    return { ok: false, error: "Kunde inte spara." };
  }

  // If we just replaced a previously-mirrored file with a new one,
  // delete the old asset. Only fires when both old and new are local
  // and they differ.
  if (
    previousPhotoUrl &&
    previousPhotoUrl !== photoUrl &&
    previousPhotoUrl.startsWith(HERO_URL_PREFIX)
  ) {
    void cleanupOldHeroFile(previousPhotoUrl);
  }

  revalidatePath("/");
  revalidatePath("/admin/startsida/hero");
  return { ok: true, id: input.id! };
}

export async function setHeroStatus(
  id: string,
  status: HeroStatus
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  try {
    await prisma.homepageHero.update({ where: { id }, data: { status } });
  } catch (err) {
    console.error("[admin hero] status update failed:", err);
    return { ok: false, error: "Kunde inte uppdatera status." };
  }
  revalidatePath("/");
  revalidatePath("/admin/startsida/hero");
  return { ok: true };
}

export async function deleteHero(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  // Best-effort delete of uploaded file. Don't fail the DB delete if
  // unlink throws — the row going away is what matters.
  try {
    const row = await prisma.homepageHero.findUnique({
      where: { id },
      select: { photoUrl: true },
    });
    await prisma.homepageHero.delete({ where: { id } });
    if (row?.photoUrl?.startsWith("/uploads/hero/")) {
      const path = join("public", row.photoUrl);
      if (existsSync(path)) {
        try {
          await unlink(path);
        } catch {
          /* ignore */
        }
      }
    }
  } catch (err) {
    console.error("[admin hero] delete failed:", err);
    return { ok: false, error: "Kunde inte ta bort." };
  }
  revalidatePath("/");
  revalidatePath("/admin/startsida/hero");
  return { ok: true };
}
