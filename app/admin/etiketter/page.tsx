/**
 * Label-system typography preview. Admin-only (auth-gated by /admin
 * layout). Renders the new label system at real 1:1 millimetre scale
 * so we can compare the Stamped vs Editorial typography directions
 * without committing to artwork.
 *
 * Width fixed at 145 mm (the current Balans label width). Two heights
 * shown — 40 mm (today's format) and 60 mm (the proposed roomier
 * variant). Hero font is the only variable between A and B.
 */
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Label } from "@/components/admin/label-preview";

export const metadata = { title: "Etikett — typografival" };

export default function LabelPreviewPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="System"
        title="Etikett — typografival"
        subtitle="Två typografiska riktningar för det nya etikettsystemet, renderade i 1:1 skala. Allt utom hero-typsnittet är identiskt mellan A och B så jämförelsen handlar bara om bokstavsformen. Höjder 40 mm (nuvarande) och 60 mm (förslag)."
        crumbs={[
          { label: "System", href: "/admin" },
          { label: "Etikett" },
        ]}
      />

      <div className="space-y-12">
        <section>
          <h2 className="font-display text-2xl font-medium text-primary-deep mb-1">
            Variant A — &quot;Stamped&quot;
          </h2>
          <p className="font-sans text-[13.5px] text-ink-mute mb-6 max-w-[640px] leading-relaxed">
            Playfair Display <strong>Bold</strong>, versalt namn, tightare tracking. Behåller
            den stämplade, äldre apotekskänslan från dagens Balans-etikett men i
            modern utförande. Mer karaktär, mer värme, något mer kommersiellt.
          </p>
          <div className="space-y-6">
            <Label height={40} variant="stamped" />
            <Label height={60} variant="stamped" />
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl font-medium text-primary-deep mb-1">
            Variant B — &quot;Editorial&quot;
          </h2>
          <p className="font-sans text-[13.5px] text-ink-mute mb-6 max-w-[640px] leading-relaxed">
            Playfair Display <strong>Medium</strong>, gemen namn, loose tracking. Matchar
            sajtens rubriker exakt. Lugnare, mer redaktionellt, mer dyrt. Tappar
            något av apotekssvalet men vinner i konsekvens mot biomax.nu.
          </p>
          <div className="space-y-6">
            <Label height={40} variant="editorial" />
            <Label height={60} variant="editorial" />
          </div>
        </section>

        <section className="border-t border-border-soft pt-10">
          <h2 className="font-display text-lg font-medium text-primary-deep mb-3">
            Noter
          </h2>
          <ul className="font-sans text-[13px] text-ink-mute leading-relaxed list-disc pl-5 space-y-1.5 max-w-[680px]">
            <li>
              Allt utöver heroteckenformen är identiskt: panelstruktur, färger,
              ingredienstabell, regulatoriska block, kategoristrip-färg.
            </li>
            <li>
              Skalan är 1:1 mm i CSS — om din skärm är kalibrerad ska linjalen
              i din webbinspektör visa 145 mm bredd.
            </li>
            <li>
              Innehållet är platshållartext baserad på Colon Aid-spec i
              <code className="font-mono text-[11.5px] mx-1">docs/label-system-brief.md</code>.
              mg-värden ska bekräftas av Rockland-deklaration innan tryck.
            </li>
            <li>
              Kategoristripens färg på den här sidan är <em>mage-tarm</em>-okra
              (#C68A4F). Andra produkter får andra stripfärger enligt brief §5.
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
