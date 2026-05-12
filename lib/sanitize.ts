/**
 * Sanitization helpers for WordPress-imported content.
 *
 * Two flavors:
 *  - stripHtml(): plain text only — for cards, meta tags, og:description.
 *  - sanitizeRichText(): keeps safe semantic markup (p, ul, ol, li, a, em,
 *    strong, br) — for long-form product detail pages.
 *
 * Source content is from biomax.nu's WordPress, which we control, so we don't
 * need a full parser like sanitize-html. Regex cleanup is sufficient.
 */
/**
 * Allow-list-based cleanup for product long descriptions. Strips inline
 * styles, classes, event handlers, empty wrappers, and font tags. Forces
 * external links to open safely. Does NOT remove p/ul/li/a/em/strong/br —
 * the editorial structure stays intact.
 */
export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";
  return (
    html
      // Drop style/script blocks entirely
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      // Strip inline style/class/id/event-handler attributes
      .replace(/\s*style="[^"]*"/gi, "")
      .replace(/\s*style='[^']*'/gi, "")
      .replace(/\s*class="[^"]*"/gi, "")
      .replace(/\s*id="[^"]*"/gi, "")
      .replace(/\s*on\w+="[^"]*"/gi, "")
      // Strip wrapping span/font tags that lost their attrs
      .replace(/<span\s*>([\s\S]*?)<\/span>/gi, "$1")
      .replace(/<font[^>]*>([\s\S]*?)<\/font>/gi, "$1")
      // Strip unwanted block tags (keep their content)
      .replace(/<\/?(div|section|article|header|footer|nav|aside|figure|figcaption)\b[^>]*>/gi, "")
      // Force noopener noreferrer on outbound links
      .replace(/<a\b([^>]*)>/gi, (match, attrs) => {
        if (/rel=/i.test(attrs)) return match;
        return `<a${attrs} rel="noopener noreferrer">`;
      })
      // Collapse multiple consecutive blank paragraphs
      .replace(/(<p[^>]*>\s*<\/p>\s*){2,}/gi, "<p></p>")
      .trim()
  );
}

export function stripHtml(html: string | null | undefined, maxLength?: number): string {
  if (!html) return "";
  const stripped = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

  if (!maxLength || stripped.length <= maxLength) return stripped;
  // Cut at the last whole word before maxLength to avoid mid-word truncation.
  const cut = stripped.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}
