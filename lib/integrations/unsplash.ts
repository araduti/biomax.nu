/**
 * Unsplash API client — server-side only.
 *
 * Used by the hero-editor's "Sök bild"-tab so editors can browse a real
 * thumbnail grid instead of pasting URLs. Same mode-boundary pattern as
 * Klarna/Brevo/GSC: works as a stub locally when no key is set, comes
 * alive in production when `UNSPLASH_ACCESS_KEY` is configured.
 *
 * Setup (one-time):
 *   1. unsplash.com/developers → "Your apps" → "New Application"
 *   2. Accept the API guidelines
 *   3. Copy the "Access Key" (NOT the "Secret key" — we use public reads)
 *   4. Set UNSPLASH_ACCESS_KEY in .env.local + production env
 *   5. Restart `next dev` / redeploy
 *
 * Compliance notes:
 *   - Photographer attribution is required on every surface displaying
 *     Unsplash photos. The client returns `photographer.name + link` and
 *     the UI must show it.
 *   - When a photo is actually used (saved to a hero), we MUST hit the
 *     `links.download_location` endpoint. That's how Unsplash tracks
 *     real downloads vs preview-only browsing. `triggerDownload()` does
 *     this.
 */

const API_BASE = "https://api.unsplash.com";

export function isUnsplashConfigured(): boolean {
  return !!process.env.UNSPLASH_ACCESS_KEY?.trim();
}

export type UnsplashPhoto = {
  id: string;
  /** Full-size URL — what we want to mirror when an editor picks a photo. */
  fullUrl: string;
  /** Small thumbnail for the picker grid. */
  thumbUrl: string;
  alt: string;
  width: number;
  height: number;
  photographer: {
    name: string;
    /** Profile URL — must be shown alongside the photo. */
    profileUrl: string;
  };
  /** Internal — caller MUST POST to this when the photo is actually used. */
  downloadLocation: string;
};

export type UnsplashSearchResult = {
  photos: UnsplashPhoto[];
  total: number;
  totalPages: number;
};

type RawUnsplashPhoto = {
  id: string;
  width: number;
  height: number;
  alt_description: string | null;
  description: string | null;
  urls: { raw: string; full: string; regular: string; small: string };
  user: { name: string; links: { html: string } };
  links: { download_location: string };
};

type RawSearchResponse = {
  total: number;
  total_pages: number;
  results: RawUnsplashPhoto[];
};

function authHeader(): { Authorization: string } {
  return { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` };
}

function normalize(raw: RawUnsplashPhoto): UnsplashPhoto {
  return {
    id: raw.id,
    // `regular` is only ~1080px wide — far too small for a full-bleed
    // 4K hero master. Build a high-res URL off the imgix `raw` base
    // instead (it already carries an `?ixid=…` query, so append with
    // `&`). The mirror pipeline downsizes/re-encodes from this.
    fullUrl: `${raw.urls.raw}&w=3840&q=90&fit=crop&crop=entropy&fm=jpg`,
    thumbUrl: raw.urls.small,
    alt: raw.alt_description ?? raw.description ?? "",
    width: raw.width,
    height: raw.height,
    photographer: {
      name: raw.user.name,
      profileUrl: `${raw.user.links.html}?utm_source=biomax&utm_medium=referral`,
    },
    downloadLocation: raw.links.download_location,
  };
}

/**
 * Search Unsplash. Returns up to `perPage` landscape-orientation photos
 * matching `query`. Landscape because the hero is a wide band — portraits
 * pad ugly.
 *
 * On any error (including misconfiguration), returns an empty result
 * rather than throwing — the UI's empty-state then nudges the editor.
 */
export async function searchUnsplashPhotos(
  query: string,
  page = 1,
  perPage = 12
): Promise<UnsplashSearchResult> {
  if (!isUnsplashConfigured()) {
    return { photos: [], total: 0, totalPages: 0 };
  }
  const q = query.trim();
  if (!q) return { photos: [], total: 0, totalPages: 0 };

  const url = new URL(`${API_BASE}/search/photos`);
  url.searchParams.set("query", q);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("content_filter", "high"); // strict

  try {
    const res = await fetch(url, {
      headers: { ...authHeader(), "Accept-Version": "v1" },
      // Cache for 5 minutes server-side — the same query in two
      // successive editor sessions doesn't hit Unsplash twice.
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      console.warn("[unsplash] search failed:", res.status);
      return { photos: [], total: 0, totalPages: 0 };
    }
    const json = (await res.json()) as RawSearchResponse;
    return {
      photos: json.results.map(normalize),
      total: json.total,
      totalPages: json.total_pages,
    };
  } catch (err) {
    console.warn("[unsplash] search errored:", err);
    return { photos: [], total: 0, totalPages: 0 };
  }
}

/**
 * Tell Unsplash "this photo was actually used" — required by their API
 * guidelines. Fire-and-forget; don't block the editor's save on this.
 */
export async function triggerDownload(downloadLocation: string): Promise<void> {
  if (!isUnsplashConfigured()) return;
  if (!downloadLocation.startsWith("https://api.unsplash.com/")) return;
  try {
    await fetch(downloadLocation, {
      headers: { ...authHeader(), "Accept-Version": "v1" },
    });
  } catch {
    // Best-effort. A missed download-track doesn't break the editor.
  }
}
