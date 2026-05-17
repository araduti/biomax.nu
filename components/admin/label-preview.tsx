/**
 * Pixel-honest label mock at 1:1 mm scale. Renders the wrap-around
 * 145 × {40|60} mm format with all three panels visible: left (dosing
 * + contact), centre (hero), right (ingredients + warnings).
 *
 * The only design variable between the two `variant` values is the
 * hero typeface treatment — everything else (frame, colours, panel
 * layout, category strip) is identical so the user is comparing fonts,
 * not chrome.
 */
import { Fragment } from "react";

type Variant = "stamped" | "editorial";

/* Reference data — Colon Aid placeholder. Mirrors the worked example in
 * docs/label-system-brief.md. mg values are placeholders to be confirmed
 * from the Rockland declaration before any artwork goes to print. */
const PRODUCT = {
  subBrand: "Rockland ®",
  name: "Colon Aid",
  shortDescription: "Örtblandning för mage och tarm",
  category: "MAGE-TARM",
  categoryColor: "#C68A4F", // ochre
  perUnit: "kapsel",
  count: "60 kapslar",
  dosing: ["1 kapsel 1–2 ggr/dag", "med måltid", "drick ett glas vatten"],
  bbd: "Bäst före: NOV 2027",
  batch: "Lot: PIR8758",
  ingredients: [
    { name: "Rödalm (Ulmus rubra)", amount: "200 mg", dri: "*" },
    { name: "Aloe vera", amount: "100 mg", dri: "*" },
    { name: "Vit ekbark", amount: "100 mg", dri: "*" },
    { name: "Gentianarot", amount: "80 mg", dri: "*" },
    { name: "Verbena (järnört)", amount: "60 mg", dri: "*" },
  ],
  warning:
    "Rekommenderad daglig dos bör inte överskridas. Kosttillskott bör inte ersätta en varierad kost. Förvaras torrt och svalt, utom räckhåll för barn.",
};

const BIOMAX_LINES = [
  "Biomax HB · Ekenleden 15A",
  "428 36 Kållered",
  "Org.nr 969676-7939",
  "kontakt@biomax.nu",
  "biomax.nu/produkter/colon-aid",
];

export function Label({
  height,
  variant,
}: {
  height: 40 | 60;
  variant: Variant;
}) {
  return (
    <div>
      <p className="font-sans text-[11px] uppercase tracking-[0.16em] font-semibold text-ink-soft mb-2">
        145 × {height} mm — variant {variant === "stamped" ? "A" : "B"}
      </p>

      {/* 1:1 mm — set on outer wrapper so the whole thing scales together
          if the page is later viewed on a non-standard DPI screen. */}
      <div
        style={{
          width: "145mm",
          height: `${height}mm`,
          background: "var(--color-surface-warm, #F4ECDD)",
          color: "var(--color-primary-deep, #0F202C)",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          border: "0.5px solid #d8cdb6",
          boxShadow: "0 1px 4px rgba(15,32,44,0.08)",
          display: "grid",
          gridTemplateColumns: "38mm 37mm 70mm",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <LeftPanel height={height} />
        <CenterPanel height={height} variant={variant} />
        <RightPanel height={height} />

        {/* Category colour strip — 3 mm tall at the bottom edge across
            the full width, with category name reversed out. Cropped to
            the label by the parent's overflow:hidden. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "3mm",
            background: PRODUCT.categoryColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: "3mm",
            color: "#fff",
            fontSize: "1.6mm",
            fontWeight: 600,
            letterSpacing: "0.18em",
          }}
        >
          {PRODUCT.category}
        </div>
      </div>
    </div>
  );
}

function LeftPanel({ height }: { height: 40 | 60 }) {
  const isTall = height === 60;
  return (
    <div
      style={{
        padding: "2mm 2.5mm 5mm 2.5mm",
        borderRight: "0.3px solid #d8cdb6",
        fontSize: "1.7mm",
        lineHeight: 1.35,
        display: "flex",
        flexDirection: "column",
        gap: isTall ? "1.5mm" : "0.8mm",
      }}
    >
      <Eyebrow>Dosering</Eyebrow>
      <div>
        {PRODUCT.dosing.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>

      <Eyebrow>Biomax</Eyebrow>
      <div style={{ fontSize: "1.5mm", lineHeight: 1.35 }}>
        {BIOMAX_LINES.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>

      <div style={{ marginTop: "auto", fontSize: "1.4mm", color: "#5F6B73" }}>
        <div>{PRODUCT.bbd}</div>
        <div>{PRODUCT.batch}</div>
      </div>
    </div>
  );
}

function CenterPanel({
  height,
  variant,
}: {
  height: 40 | 60;
  variant: Variant;
}) {
  const isTall = height === 60;
  const heroSize = variant === "stamped" ? (isTall ? "9mm" : "6.5mm") : isTall ? "9.5mm" : "6.8mm";
  const heroWeight = variant === "stamped" ? 700 : 500;
  const heroTransform = variant === "stamped" ? "uppercase" : "none";
  const heroTracking = variant === "stamped" ? "0.02em" : "-0.01em";
  const heroFont = "var(--font-playfair), Georgia, serif";

  return (
    <div
      style={{
        background: "#3B5239", // deep sage frame
        padding: "1mm",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          background: "#EFE3C8", // warm cream inner
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isTall ? "3mm 2mm" : "1.5mm 2mm",
          textAlign: "center",
          color: "#0F202C",
        }}
      >
        <div
          style={{
            fontFamily: heroFont,
            fontStyle: "italic",
            fontSize: isTall ? "3.5mm" : "2.8mm",
            fontWeight: 500,
            letterSpacing: "0.04em",
          }}
        >
          {PRODUCT.subBrand}
        </div>

        <div style={{ width: "100%" }}>
          <div
            style={{
              fontFamily: heroFont,
              fontWeight: heroWeight,
              fontSize: heroSize,
              lineHeight: 1.02,
              letterSpacing: heroTracking,
              textTransform: heroTransform as "uppercase" | "none",
            }}
          >
            {variant === "stamped" ? PRODUCT.name.toUpperCase() : PRODUCT.name}
          </div>
          {isTall && (
            <div
              style={{
                marginTop: "1.5mm",
                fontSize: "1.9mm",
                fontStyle: "italic",
                color: "#3B5239",
                fontWeight: 400,
              }}
            >
              {PRODUCT.shortDescription}
            </div>
          )}
          <div
            style={{
              marginTop: isTall ? "2mm" : "1mm",
              fontSize: "1.7mm",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Kosttillskott
          </div>
        </div>

        <div
          style={{
            fontFamily: heroFont,
            fontWeight: 600,
            fontSize: isTall ? "3.5mm" : "2.6mm",
            background: "#3B5239",
            color: "#EFE3C8",
            padding: isTall ? "1mm 4mm" : "0.6mm 3mm",
            borderRadius: "0.6mm",
            letterSpacing: "0.02em",
          }}
        >
          {PRODUCT.count}
        </div>
      </div>
    </div>
  );
}

function RightPanel({ height }: { height: 40 | 60 }) {
  const isTall = height === 60;
  return (
    <div
      style={{
        padding: "2mm 3mm 5mm 2.5mm",
        borderLeft: "0.3px solid #d8cdb6",
        fontSize: "1.7mm",
        lineHeight: 1.35,
        display: "flex",
        flexDirection: "column",
        gap: isTall ? "1.5mm" : "1mm",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Eyebrow>Innehåll per dagsdos</Eyebrow>
        <span style={{ fontSize: "1.4mm", color: "#5F6B73" }}>DRI %</span>
      </div>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "1.7mm",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <tbody>
          {PRODUCT.ingredients.map((row, i) => (
            <Fragment key={i}>
              <tr>
                <td style={{ padding: "0.3mm 0" }}>{row.name}</td>
                <td style={{ padding: "0.3mm 0", textAlign: "right", whiteSpace: "nowrap" }}>
                  {row.amount}
                </td>
                <td
                  style={{
                    padding: "0.3mm 0 0.3mm 2mm",
                    textAlign: "right",
                    color: "#5F6B73",
                    width: "4mm",
                  }}
                >
                  {row.dri}
                </td>
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: "1.4mm", color: "#5F6B73" }}>
        Övriga ingredienser: gelatinkapsel, rismjöl, kiseldioxid. * Daglig referens­intag ej fastställt.
      </div>
      <div style={{ marginTop: "auto", fontSize: "1.4mm", color: "#5F6B73", lineHeight: 1.3 }}>
        {PRODUCT.warning}
      </div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "1.4mm",
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "#5F6B73",
      }}
    >
      {children}
    </div>
  );
}
