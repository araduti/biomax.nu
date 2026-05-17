import { resolveAllergens } from "@/lib/products/allergens";

/**
 * EU 1169/2011 Annex II allergen declaration. Rendered in the
 * Innehåll-tab section of the PDP whenever `Product.allergens` has at
 * least one entry. Visually emphasised — the regulation calls for
 * highlighted typeset.
 */
export function AllergenCallout({ allergens }: { allergens: string[] }) {
  const resolved = resolveAllergens(allergens);
  if (resolved.length === 0) return null;

  return (
    <aside
      role="note"
      aria-label="Allergeninformation"
      className="bg-status-warn/8 border border-status-warn/40 rounded-2xl p-5 my-6"
    >
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] font-semibold text-status-low mb-2">
        Innehåller
      </p>
      <p className="font-sans text-[14.5px] text-ink-body leading-relaxed">
        {resolved.map((a, i) => (
          <span key={a.slug}>
            <strong className="font-semibold text-primary-deep">
              {a.label}
            </strong>
            {a.examples && (
              <span className="text-ink-mute"> ({a.examples})</span>
            )}
            {i < resolved.length - 1 && <span>, </span>}
          </span>
        ))}
        .
      </p>
      <p className="mt-2 font-sans text-[11.5px] text-ink-soft leading-relaxed">
        Allergener deklarerade enligt EU 1169/2011 bilaga II. Kontrollera
        alltid den fullständiga innehållsförteckningen om du har en känd
        allergi eller intolerans.
      </p>
    </aside>
  );
}
