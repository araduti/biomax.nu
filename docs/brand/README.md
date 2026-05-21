# docs/brand

Brand assets and usage rules for **kine**.

| Path | Purpose |
|---|---|
| `identity.md` | **Canonical brand guidelines.** Read this first. |
| `sheet.svg` | Single-page brand overview. Open in a browser for a visual reference of the whole system. |
| `logos/kine-lockup.svg` | **Default lockup.** Horizontal mark + wordmark. Use this unless a specific surface demands a variant. |
| `logos/kine-lockup-inverse.svg` | Same, for dark backgrounds. |
| `logos/kine-lockup-stacked.svg` | Vertical lockup for square contexts. |
| `logos/kine-mark.svg` | Mark alone — app icons, watermarks, favicons. |
| `logos/kine-mark-inverse.svg` | Mark alone for dark backgrounds. |
| `logos/kine-wordmark.svg` | Wordmark alone — body-copy contexts, tenant-footer credits. |
| `logos/kine-wordmark-inverse.svg` | Wordmark alone, dark. |
| `favicon/favicon-32.svg` | Browser tab favicon. Use as the `<link rel="icon">` source. |
| `favicon/favicon-64.svg` | Header favicon, medium UI surfaces. |
| `favicon/favicon-256.svg` | App icon, Apple touch icon. |

## Quick-start in code

```html
<link rel="icon" type="image/svg+xml" href="/brand/favicon/favicon-32.svg">
<link rel="apple-touch-icon" sizes="256x256" href="/brand/favicon/favicon-256.svg">
<link rel="mask-icon" href="/brand/logos/kine-mark.svg" color="#1B4332">
```

```tsx
// Tenant storefront footer credit
<a href="https://kine.se" className="footer-credit">
  <span className="eyebrow">Powered by</span>
  <img src="/brand/logos/kine-wordmark.svg" alt="kine" width="80" />
</a>
```

## What's NOT in here yet

- PNG/ICO exports — use `rsvg-convert` on the SVG masters when needed
- Application mockups (business card, hero banner, etc.)
- Motion specs (deferred to designer engagement)
- Swedish-language voice samples
- Trademark filings

See `identity.md` §12 for the full pending list.
