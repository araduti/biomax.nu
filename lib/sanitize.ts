/**
 * Sanitization helpers for product/editorial content.
 *
 * Two flavors:
 *  - stripHtml(): plain text only — for cards, meta tags, og:description.
 *  - sanitizeRichText(): keeps safe semantic markup — for long-form
 *    product detail pages, rendered via dangerouslySetInnerHTML.
 *
 * `sanitizeRichText` uses `sanitize-html` (a real HTML parser) rather
 * than regex: the content is editable through the admin CMS, so a
 * compromised/expanded author must not be able to land stored XSS on
 * every shopper. Regex "sanitizers" are bypassable (unquoted attrs,
 * `javascript:`/`data:` URIs, SVG/mutation-XSS); a parser is not.
 */
import sanitizeHtml from "sanitize-html";

const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  // Editorial structure we actually author: headings, paragraphs,
  // lists, inline emphasis, links, line breaks.
  allowedTags: [
    "h2", "h3", "h4",
    "p", "br", "hr",
    "ul", "ol", "li",
    "strong", "b", "em", "i", "sup", "sub",
    "a", "blockquote",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
  },
  // Only safe link schemes — blocks javascript:/data:/vbscript: etc.
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesAppliedToAttributes: ["href"],
  disallowedTagsMode: "discard",
  // Drop the contents of script/style entirely (default keeps text).
  nonTextTags: ["style", "script", "textarea", "option", "noscript"],
  transformTags: {
    // Every link opens safely regardless of authored attributes.
    a: (tagName, attribs) => ({
      tagName: "a",
      attribs: {
        ...attribs,
        rel: "noopener noreferrer",
        ...(attribs.target ? { target: attribs.target } : {}),
      },
    }),
  },
};

/**
 * Sanitize product long-description HTML for safe rendering. Parser-
 * based allow-list: anything outside the tag/attribute/scheme allow-
 * list is discarded, including all event handlers, inline styles, and
 * dangerous URL schemes.
 */
export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, RICH_TEXT_OPTIONS).trim();
}

export function stripHtml(html: string | null | undefined, maxLength?: number): string {
  if (!html) return "";
  const stripped = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    // Block boundaries become a visible separator so list items and
    // paragraphs don't run together when flattened (e.g. a bulleted
    // shortDescription rendered as a card teaser or meta description).
    .replace(/<\/(li|p|h[1-6]|tr|div)\s*>/gi, " · ")
    .replace(/<br\s*\/?>/gi, " · ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    // Tidy the separators: collapse repeats, drop any at the very
    // start/end, and remove the space that precedes one.
    .replace(/(?:\s*·\s*)+/g, " · ")
    .replace(/^\s*·\s*/, "")
    .replace(/\s*·\s*$/, "")
    .trim();

  if (!maxLength || stripped.length <= maxLength) return stripped;
  // Cut at the last whole word before maxLength to avoid mid-word truncation.
  const cut = stripped.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}
