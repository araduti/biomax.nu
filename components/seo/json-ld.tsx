/**
 * Inline JSON-LD script for structured data.
 * Use one per schema type per page (Product, BreadcrumbList, ItemList, etc.).
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
