/**
 * Centralised cache-tag namespace + invalidation helper. Every
 * `unstable_cache` and matching `revalidateTag` call funnels through here
 * so a typo in one place doesn't silently stop invalidation from another.
 *
 * Pattern: `bumpTag(productCacheTag(slug))` on admin save → the PDP
 * `unstable_cache` entry tagged with that slug is marked stale within
 * seconds, even though the route is set to `revalidate = 600`.
 *
 * Next.js 16 made the `profile` argument to `revalidateTag` mandatory.
 * `"max"` gives stale-while-revalidate semantics (recommended for content
 * that tolerates a brief stale window — exactly our product/PDP case).
 */
import { revalidateTag } from "next/cache";

export const productCacheTag = (slug: string) => `product:${slug}`;
export const productListCacheTag = () => `product:list`;
export const categoryCacheTag = (slug: string) => `category:${slug}`;
export const homepageCacheTag = () => `homepage`;
export const siteSettingsCacheTag = () => `site-settings`;

/** Mark a tagged cache entry stale with SWR semantics. */
export function bumpTag(tag: string): void {
  revalidateTag(tag, "max");
}
