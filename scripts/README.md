# scripts/

One-off and recurring scripts for biomax.nu data operations.

## `import-wordpress.ts`

WordPress (WooCommerce) → Postgres migration. Reads a WXR XML export at the project root and idempotently upserts categories, products, customers, and orders into the Prisma-managed database.

**Usage:**

```bash
# default — reads biomax.WordPress.2026-05-10.xml
npm run db:import-wp

# custom path
npm run db:import-wp -- /path/to/biomax.WordPress.2026-XX-XX.xml
```

**What it imports:**

| Entity | Source in WP | Notes |
|---|---|---|
| Category | `wp:term` blocks with `taxonomy=product_cat` | Many-to-many to Product |
| Product | `wp:post_type=product` items | Full Yoast SEO migrated; thumbnail + gallery downloaded to `public/products/` |
| User | Unique billing emails across all orders | `emailVerified=false` so they reset password on first login |
| Order | `wp:post_type=shop_order` items | Metadata only (no line items — see limitation below) |

**What it does NOT import:**

- **Order line items**: WooCommerce stores line items in `wc_order_items` / `wc_order_itemmeta` tables, which are NOT included in the standard WXR XML export. The `Order.legacySource` field is set to the export filename so we can backfill later if a separate WooCommerce CSV becomes available.
- **Customer addresses beyond name/phone**: same reason — full billing addresses are stored in WooCommerce-specific tables.
- **Reviews / comments**: WordPress comments are in the XML but disabled in this script for now (the brand will collect new reviews going forward via post-purchase email flow in Phase 7).

**Idempotency:**

- Categories upsert by `legacyWpId`
- Products upsert by `legacyWpId`
- Users upsert by `email` (canonical key — `legacyWpId` intentionally not set; can collide across email changes)
- Orders use `createMany` with `skipDuplicates: true` keyed on `orderNumber` (= `WP-{postId}`)

Re-running the script on the same export should be a no-op for existing rows and only add new ones.

**Before launch:**

Re-export from production WordPress to capture orders/customers placed during the build window. Filename convention: `biomax.WordPress.YYYY-MM-DD.xml`. The script will pick up new records and skip existing ones via the idempotency keys above.

**Performance:**

~6,200 orders insert in ~13 batches of 500 via `createMany`, completes in seconds. Image downloads (~93 attachments) are sequential and the slowest step at roughly 1-2 minutes depending on biomax.nu CDN response time. Subsequent runs skip images that already exist in `public/products/`.
