import type { Metadata } from "next";
import Image from "next/image";
import { BiomaxLogo } from "@/components/brand/BiomaxLogo";
import { requireAdmin } from "@/lib/admin/guard";

export const metadata: Metadata = {
  title: "Design — biomax.nu",
  robots: { index: false, follow: false },
};

// Admin-only design-system preview. requireAdmin() throws/redirects for
// non-admins so the 1700-line client tree is never rendered for anonymous
// visitors. The robots noindex above is belt; this is suspenders.

const T = {
  primary: "#1E3A5F",
  primaryDeep: "#0F2440",
  primarySoft: "#2C5384",
  surface: "#FBFAF7",
  surfaceAlt: "#FFFFFF",
  surfaceWarm: "#F4F0E8",
  ink: "#0A0A0A",
  inkBody: "#1F2530",
  inkMute: "#525860",
  inkSoft: "#7A8290",
  accent: "#7A8B6F",
  accentDeep: "#5C6E55",
  border: "#E8E5DE",
  borderSoft: "#F0EDE5",
  fontDisplay: "var(--font-playfair)",
  fontBody: "var(--font-inter)",
};

function Logo({ color = T.primary, size = 36 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" aria-hidden style={{ flexShrink: 0 }}>
      <rect x="20" y="0" width="40" height="40" rx="8" fill={color} />
      <rect x="40" y="20" width="40" height="40" rx="8" fill={color} />
      <rect x="20" y="40" width="40" height="40" rx="8" fill={color} />
      <rect x="0" y="20" width="40" height="40" rx="8" fill={color} />
    </svg>
  );
}

function Lockup({ scale = 1, mono = false }: { scale?: number; mono?: boolean }) {
  const color = mono ? T.surface : T.primary;
  const muteColor = mono ? "rgba(251,250,247,0.55)" : T.inkMute;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 * scale }}>
      <BiomaxLogo height={Math.round(36 * scale)} style={{ color }} />
      <span
        style={{
          fontFamily: T.fontBody,
          fontSize: 9 * scale,
          letterSpacing: "0.24em",
          color: muteColor,
          textTransform: "uppercase",
          fontWeight: 500,
          paddingLeft: 2,
        }}
      >
        Sedan 2001 · Kållered
      </span>
    </div>
  );
}

function Display({
  children,
  size = 56,
  italic = false,
  weight = 500,
  color = T.primaryDeep,
  as: Tag = "h2",
  margin,
}: {
  children: React.ReactNode;
  size?: number;
  italic?: boolean;
  weight?: number;
  color?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p";
  margin?: string;
}) {
  return (
    <Tag
      style={{
        fontFamily: T.fontDisplay,
        fontWeight: weight,
        fontStyle: italic ? "italic" : "normal",
        fontSize: size,
        color,
        letterSpacing: "-0.025em",
        lineHeight: 1.05,
        margin: margin ?? 0,
      }}
    >
      {children}
    </Tag>
  );
}

function Eyebrow({ children, color = T.inkMute }: { children: React.ReactNode; color?: string }) {
  return (
    <p
      style={{
        fontFamily: T.fontBody,
        fontSize: 11,
        letterSpacing: "0.24em",
        textTransform: "uppercase",
        color,
        fontWeight: 600,
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

function Button({
  children,
  variant = "primary",
  size = "md",
}: {
  children: React.ReactNode;
  variant?: "primary" | "outline" | "ghost";
  size?: "md" | "sm";
}) {
  const padding = size === "sm" ? "10px 20px" : "14px 28px";
  const fontSize = size === "sm" ? 13 : 15;
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: T.primary, color: "#fff", border: "1.5px solid transparent" },
    outline: { background: "transparent", color: T.primaryDeep, border: `1.5px solid ${T.primary}` },
    ghost: { background: "transparent", color: T.primary, border: "1.5px solid transparent" },
  };
  return (
    <button
      style={{
        fontFamily: T.fontBody,
        fontWeight: 600,
        fontSize,
        padding,
        borderRadius: 999,
        cursor: "pointer",
        letterSpacing: "0.01em",
        ...styles[variant],
      }}
    >
      {children}
    </button>
  );
}

// ───────────────────────────────────────────────────────── sections

function PaletteReference() {
  const swatches = [
    { hex: T.primary, label: "Primary", desc: "Deep clinical blue", textColor: "#fff" },
    { hex: T.primaryDeep, label: "Deep", desc: "Midnight ink", textColor: "#fff" },
    { hex: T.accent, label: "Accent", desc: "Sage", textColor: T.primaryDeep },
    { hex: T.surface, label: "Surface", desc: "Pure off-white", textColor: T.ink },
    { hex: T.surfaceWarm, label: "Surface · Warm", desc: "Cream", textColor: T.ink },
    { hex: T.ink, label: "Ink", desc: "Near-black", textColor: "#fff" },
  ];
  return (
    <section
      style={{
        background: T.surface,
        padding: "64px 32px",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <Eyebrow>Locked direction</Eyebrow>
        <Display size={44} margin="12px 0 8px">
          Nordic Steel · <em style={{ fontStyle: "italic", color: T.accentDeep }}>refined</em>
        </Display>
        <p
          style={{
            fontFamily: T.fontBody,
            fontSize: 16,
            color: T.inkMute,
            maxWidth: 640,
            margin: "0 0 40px",
            lineHeight: 1.6,
          }}
        >
          Deep clinical blue + sage + off-white. Playfair Display (display) +
          Inter (body). The full biomax.nu homepage simulated below in the
          locked palette.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {swatches.map((s) => (
            <div
              key={s.label}
              style={{
                background: s.hex,
                color: s.textColor,
                borderRadius: 12,
                padding: "20px 16px",
                minHeight: 110,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                gap: 4,
                border: `1px solid ${T.border}`,
                fontFamily: T.fontBody,
              }}
            >
              <span style={{ fontSize: 12, opacity: 0.85 }}>{s.desc}</span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{s.label}</span>
              <span style={{ fontSize: 11, opacity: 0.75, fontVariantNumeric: "tabular-nums" }}>
                {s.hex.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 32,
            padding: 28,
            background: T.surfaceAlt,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
          }}
        >
          <div>
            <Eyebrow>Display · Playfair Display</Eyebrow>
            <p
              style={{
                fontFamily: T.fontDisplay,
                fontSize: 56,
                fontWeight: 500,
                letterSpacing: "-0.025em",
                color: T.primaryDeep,
                margin: "12px 0 0",
                lineHeight: 1,
              }}
            >
              Aa Bb 0123
            </p>
          </div>
          <div>
            <Eyebrow>Body · Inter</Eyebrow>
            <p
              style={{
                fontFamily: T.fontBody,
                fontSize: 32,
                fontWeight: 400,
                color: T.ink,
                margin: "12px 0 0",
                lineHeight: 1.1,
              }}
            >
              Aa Bb 0123
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TopBar() {
  return (
    <div
      style={{
        background: T.primaryDeep,
        color: "rgba(251,250,247,0.78)",
        fontFamily: T.fontBody,
        fontSize: 12,
        letterSpacing: "0.04em",
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "10px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: 24 }}>
          <span>Fri frakt över 499 kr</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>Klarna · Faktura 30 dagar</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>Snabb leverans i hela Sverige</span>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <span>Mitt konto</span>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header
      style={{
        background: T.surface,
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 32,
        }}
      >
        <Lockup />
        <nav
          style={{
            display: "flex",
            gap: 32,
            fontFamily: T.fontBody,
            fontSize: 15,
            color: T.inkBody,
            fontWeight: 500,
          }}
        >
          {["Produkter", "Kategorier", "Behandlingar", "Kunskap", "Om oss"].map((l) => (
            <a key={l} href="#" style={{ color: T.inkBody, textDecoration: "none" }}>
              {l}
            </a>
          ))}
        </nav>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontFamily: T.fontBody,
            fontSize: 14,
            color: T.inkBody,
          }}
        >
          <span>Sök</span>
          <span
            style={{
              padding: "8px 14px",
              border: `1.5px solid ${T.primary}`,
              borderRadius: 999,
              color: T.primary,
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Varukorg · 0
          </span>
        </div>
      </div>
    </header>
  );
}

type Season = "var" | "sommar" | "host" | "vinter";

const seasons: Record<
  Season,
  {
    label: string;
    sub: string;
    motif: string;
    accent: string;
    photoUrl: string;
    photoAlt: string;
    photoCredit: string;
  }
> = {
  var: {
    label: "Vår",
    sub: "På spång genom lövsprickningen · Maj 2026",
    motif: "Våren vaknar",
    accent: "#7A8B6F",
    photoUrl: "https://images.unsplash.com/photo-1715756603568-6b30b8933071",
    photoAlt: "Person på träspång genom vårskog",
    photoCredit: "Unsplash",
  },
  sommar: {
    label: "Sommar",
    sub: "Vid vattnet i juli · Midsommarljus",
    motif: "Långa ljusa kvällar",
    accent: "#D4A574",
    photoUrl: "https://images.unsplash.com/photo-1660063846374-8f98fd32cbc3",
    photoAlt: "Sommarstämning vid vattnet i nordisk natur",
    photoCredit: "Unsplash",
  },
  host: {
    label: "Höst",
    sub: "Lönn och berberis · Oktober",
    motif: "Höstens glöd",
    accent: "#B5523B",
    photoUrl: "https://images.unsplash.com/photo-1665513849007-0974b3ccec81",
    photoAlt: "Person promenerar i höstskog med gyllene löv",
    photoCredit: "Unsplash",
  },
  vinter: {
    label: "Vinter",
    sub: "Hand i hand genom snöbarrskogen · Januari",
    motif: "Hand i hand i snön",
    accent: "#7B97A3",
    photoUrl: "https://images.unsplash.com/photo-1764773964890-c00c7082b90d",
    photoAlt: "Par går hand i hand genom snötäckt barrskog",
    photoCredit: "Unsplash",
  },
};

const HERO_OVERLAY =
  "linear-gradient(90deg, rgba(15,36,64,0.78) 0%, rgba(15,36,64,0.5) 38%, rgba(15,36,64,0) 70%)";

function SeasonalImage({
  season,
  priority = false,
  sizes = "100vw",
  showLabel = false,
}: {
  season: Season;
  priority?: boolean;
  sizes?: string;
  showLabel?: boolean;
}) {
  const s = seasons[season];
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: T.primaryDeep,
      }}
    >
      <Image
        src={s.photoUrl}
        alt={s.photoAlt}
        fill
        sizes={sizes}
        priority={priority}
        quality={85}
        style={{ objectFit: "cover" }}
      />
      {showLabel && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            padding: "6px 12px",
            background: "rgba(15,36,64,0.7)",
            backdropFilter: "blur(6px)",
            color: T.surface,
            fontFamily: T.fontBody,
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            fontWeight: 600,
            borderRadius: 999,
            zIndex: 1,
          }}
        >
          {s.label}
        </div>
      )}
    </div>
  );
}

function Hero({ season = "var" as Season }: { season?: Season }) {
  const s = seasons[season];
  return (
    <section
      style={{
        background: T.primaryDeep,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          height: "62svh",
          minHeight: 560,
          maxHeight: 780,
        }}
      >
        <SeasonalImage season={season} priority sizes="100vw" />

        {/* Dark gradient overlay for legibility on the left */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: HERO_OVERLAY,
            pointerEvents: "none",
          }}
        />

        {/* Subtle bottom vignette to anchor the image */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(15,36,64,0) 65%, rgba(15,36,64,0.35) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Content overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              maxWidth: 1240,
              margin: "0 auto",
              padding: "0 32px",
              width: "100%",
            }}
          >
            <div style={{ maxWidth: 640 }}>
              <h1
                style={{
                  fontFamily: T.fontDisplay,
                  fontWeight: 500,
                  fontSize: "clamp(56px, 8vw, 112px)",
                  letterSpacing: "-0.025em",
                  lineHeight: 1.02,
                  color: T.surface,
                  margin: "0 0 24px",
                }}
              >
                Livskvalitet,{" "}
                <em
                  style={{
                    fontStyle: "italic",
                    color: s.accent,
                    fontWeight: 400,
                  }}
                >
                  i fokus.
                </em>
              </h1>
              <p
                style={{
                  fontFamily: T.fontBody,
                  fontSize: 19,
                  lineHeight: 1.55,
                  color: "rgba(251,250,247,0.88)",
                  maxWidth: 540,
                  margin: "0 0 36px",
                }}
              >
                Vetenskapligt baserade naturpreparat. Kliniskt dokumenterade ingredienser.
                Tydligt deklarerat innehåll. Det är så vi har gjort det i tjugofem år.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  style={{
                    background: T.surface,
                    color: T.primaryDeep,
                    fontFamily: T.fontBody,
                    fontWeight: 700,
                    fontSize: 15,
                    padding: "14px 28px",
                    borderRadius: 999,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Utforska produkter
                </button>
                <button
                  style={{
                    background: "transparent",
                    color: T.surface,
                    fontFamily: T.fontBody,
                    fontWeight: 600,
                    fontSize: 15,
                    padding: "14px 28px",
                    borderRadius: 999,
                    border: `1.5px solid rgba(251,250,247,0.55)`,
                    cursor: "pointer",
                  }}
                >
                  Vår berättelse
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Säsongens favorit — featured product card (commerce signal) */}
        <a
          href="#"
          style={{
            position: "absolute",
            bottom: 32,
            right: 32,
            width: 360,
            background: "rgba(251,250,247,0.96)",
            backdropFilter: "blur(16px)",
            borderRadius: 16,
            padding: 18,
            border: `1px solid rgba(251,250,247,0.4)`,
            boxShadow: "0 12px 40px rgba(15,36,64,0.25)",
            display: "flex",
            gap: 16,
            alignItems: "center",
            textDecoration: "none",
            color: T.ink,
          }}
        >
          <div
            style={{
              position: "relative",
              width: 84,
              height: 84,
              borderRadius: 10,
              overflow: "hidden",
              background: T.surfaceWarm,
              flexShrink: 0,
            }}
          >
            <Image
              src="https://images.unsplash.com/photo-1763667926453-6a992d38ac43"
              alt="Björkglukos 40g produktbild"
              fill
              sizes="84px"
              quality={85}
              style={{ objectFit: "cover" }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                fontFamily: T.fontBody,
                fontSize: 9,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: T.accentDeep,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: 999, background: T.accent }} />
              Säsongens favorit
            </span>
            <h3
              style={{
                fontFamily: T.fontDisplay,
                fontSize: 20,
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: T.primaryDeep,
                margin: "4px 0 6px",
                lineHeight: 1.1,
              }}
            >
              Björkglukos 40g
            </h3>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontFamily: T.fontDisplay,
                  fontSize: 18,
                  fontWeight: 500,
                  color: T.primaryDeep,
                  letterSpacing: "-0.02em",
                }}
              >
                273 kr
              </span>
              <span
                style={{
                  background: T.primary,
                  color: "#fff",
                  fontFamily: T.fontBody,
                  fontWeight: 600,
                  fontSize: 12,
                  padding: "8px 14px",
                  borderRadius: 999,
                  whiteSpace: "nowrap",
                }}
              >
                Lägg i varukorg
              </span>
            </div>
          </div>
        </a>

        {/* Subtle motif caption — Swedish, single line */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 32,
            fontFamily: T.fontDisplay,
            fontStyle: "italic",
            fontSize: 14,
            color: "rgba(251,250,247,0.7)",
            pointerEvents: "none",
          }}
        >
          {s.motif}
        </div>
      </div>
    </section>
  );
}


function TrustpilotStars({ rating, size = 18 }: { rating: number; size?: number }) {
  const stars = [0, 1, 2, 3, 4];
  return (
    <div
      style={{ display: "flex", gap: 2 }}
      role="img"
      aria-label={`${rating.toString().replace(".", ",")} av 5 stjärnor på Trustpilot`}
    >
      {stars.map((i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        const gradientId = `tp-star-${i}-${rating.toString().replace(".", "")}`;
        return (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            aria-hidden
            style={{ display: "block" }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
                <stop offset={`${fill * 100}%`} stopColor="#00B67A" />
                <stop offset={`${fill * 100}%`} stopColor="#D9E0DD" />
              </linearGradient>
            </defs>
            <path
              d="M12 2 L14.85 8.85 L22 9.5 L16.5 14.5 L18 22 L12 18 L6 22 L7.5 14.5 L2 9.5 L9.15 8.85 Z"
              fill={`url(#${gradientId})`}
            />
          </svg>
        );
      })}
    </div>
  );
}

function TrustpilotBar() {
  const rating = 4.4;
  const reviewCount = 53;
  return (
    <section
      style={{
        background: T.surfaceAlt,
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <a
        href="https://se.trustpilot.com/review/biomax.nu"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: "14px 32px",
          textDecoration: "none",
          color: T.ink,
          fontFamily: T.fontBody,
          flexWrap: "wrap",
        }}
      >
        <TrustpilotStars rating={rating} size={18} />
        <span
          style={{
            fontFamily: T.fontDisplay,
            fontSize: 18,
            fontWeight: 500,
            color: T.primaryDeep,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          {rating.toString().replace(".", ",")}{" "}
          <span style={{ fontSize: 13, color: T.inkMute, fontWeight: 400 }}>av 5</span>
        </span>
        <span style={{ width: 1, height: 16, background: T.border }} aria-hidden />
        <span style={{ fontSize: 13, color: T.inkBody, fontWeight: 600, letterSpacing: "0.02em" }}>
          <span style={{ color: "#00B67A" }}>Utmärkt</span> på Trustpilot
        </span>
        <span style={{ width: 1, height: 16, background: T.border }} aria-hidden />
        <span style={{ fontSize: 13, color: T.inkMute }}>
          {reviewCount} omdömen <span style={{ color: T.primary, marginLeft: 4 }}>→</span>
        </span>
      </a>
    </section>
  );
}

function Categories() {
  const cats = [
    {
      name: "Hjärna & Minne",
      count: 7,
      latin: "Cognitio",
      signature: "Ginkgo biloba",
      photoUrl: "https://images.unsplash.com/photo-1586170045339-9dde28320a9b",
      alt: "Ginkgo-blad i mjukt ljus",
    },
    {
      name: "Hjärta-Kärl",
      count: 9,
      latin: "Cardio",
      signature: "Crataegus · Hagtorn",
      photoUrl: "https://images.unsplash.com/photo-1631634176620-1aba7ab10346",
      alt: "Hagtornsbär på gren",
    },
    {
      name: "Immunförsvar",
      count: 6,
      latin: "Defensio",
      signature: "Echinacea purpurea",
      photoUrl: "https://images.unsplash.com/photo-1508007226633-b7de6a10cb16",
      alt: "Solhatt i sommarljus",
    },
    {
      name: "Leder",
      count: 5,
      latin: "Articulus",
      signature: "Curcuma longa · Gurkmeja",
      photoUrl: "https://images.unsplash.com/photo-1768729341078-9da4e0ea959e",
      alt: "Färsk gurkmejarot",
    },
    {
      name: "Mage-Tarm",
      count: 4,
      latin: "Digestio",
      signature: "Foeniculum vulgare · Fänkål",
      photoUrl: "https://images.unsplash.com/photo-1760393339694-11ba13df03d0",
      alt: "Färsk fänkål",
    },
    {
      name: "Energi",
      count: 8,
      latin: "Vitalis",
      signature: "Rhodiola rosea",
      photoUrl: "https://images.unsplash.com/photo-1775935010895-73cbb88a439c",
      alt: "Rosenrot · alpin medicinalväxt",
    },
  ];
  return (
    <section style={{ background: T.surface, padding: "112px 32px" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 56,
            flexWrap: "wrap",
            gap: 24,
          }}
        >
          <div>
            <Eyebrow>Sortiment</Eyebrow>
            <Display size={56} margin="12px 0 0">
              Hitta efter <em style={{ fontStyle: "italic", color: T.accentDeep }}>hälsoområde</em>
            </Display>
          </div>
          <a
            href="#"
            style={{
              fontFamily: T.fontBody,
              fontSize: 14,
              color: T.primary,
              textDecoration: "none",
              fontWeight: 600,
              borderBottom: `1px solid ${T.primary}`,
              paddingBottom: 2,
            }}
          >
            Se alla produkter →
          </a>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          {cats.map((c) => (
            <a
              key={c.name}
              href="#"
              style={{
                background: T.surfaceAlt,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: 16,
                textDecoration: "none",
                color: T.ink,
                display: "flex",
                alignItems: "center",
                gap: 18,
                transition: "border-color 0.2s, transform 0.2s",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: 88,
                  height: 88,
                  borderRadius: 10,
                  overflow: "hidden",
                  flexShrink: 0,
                  background: T.surfaceWarm,
                }}
              >
                <Image
                  src={c.photoUrl}
                  alt={c.alt}
                  fill
                  sizes="88px"
                  quality={85}
                  style={{ objectFit: "cover" }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: T.fontDisplay,
                    fontStyle: "italic",
                    fontSize: 12,
                    color: T.accentDeep,
                    letterSpacing: "0.02em",
                    display: "block",
                  }}
                >
                  {c.latin}
                </span>
                <h3
                  style={{
                    fontFamily: T.fontDisplay,
                    fontSize: 22,
                    fontWeight: 500,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.1,
                    color: T.primaryDeep,
                    margin: "2px 0 6px",
                  }}
                >
                  {c.name}
                </h3>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    fontFamily: T.fontBody,
                    fontSize: 12,
                    color: T.inkMute,
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontFamily: T.fontDisplay,
                      fontStyle: "italic",
                      fontSize: 13,
                      color: T.inkBody,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {c.signature}
                  </span>
                  <span style={{ flexShrink: 0 }}>{c.count} produkter</span>
                </div>
              </div>
              <span
                style={{
                  fontFamily: T.fontBody,
                  fontSize: 16,
                  color: T.primary,
                  flexShrink: 0,
                  marginRight: 4,
                }}
                aria-hidden
              >
                →
              </span>
            </a>
          ))}
        </div>
        <p
          style={{
            marginTop: 20,
            fontFamily: T.fontBody,
            fontSize: 12,
            color: T.inkSoft,
            textAlign: "center",
            letterSpacing: "0.04em",
          }}
        >
          Varje hälsoområde representeras av sin signaturväxt — den ört vetenskapen och Biomax återkommer till.
        </p>
      </div>
    </section>
  );
}

function Bestsellers() {
  const products = [
    {
      name: "Balans",
      sub: "90 kapslar",
      blurb:
        "Adaptogen formulering för stresshantering och mental balans. Den jämnaste vägen till lugn.",
      price: "311 kr",
      tag: "5/5 omdömen",
    },
    {
      name: "Björkglukos",
      sub: "40g xylitol",
      blurb:
        "Naturlig sötning från svensk björk. Glykemiskt index 7. Stödjer tandhälsa och blodsockerbalans.",
      price: "273 kr",
      tag: "Bästsäljare",
    },
    {
      name: "Beta Glucan",
      sub: "600mg · 60 kapslar",
      blurb:
        "Aktiverar immunförsvarets makrofager. Utvunnet från jästcellsväggar med klinisk dokumentation.",
      price: "330 kr",
      tag: "Kliniskt dokumenterat",
    },
  ];
  return (
    <section
      style={{
        background: T.surfaceWarm,
        padding: "44px 32px 96px",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
            <Display size={32} weight={500}>
              Signaturprodukter
            </Display>
            <span
              style={{
                fontFamily: T.fontDisplay,
                fontStyle: "italic",
                fontSize: 16,
                color: T.accentDeep,
              }}
            >
              tre formuleringar som definierar Biomax
            </span>
          </div>
          <a
            href="#"
            style={{
              fontFamily: T.fontBody,
              fontSize: 13,
              color: T.primary,
              textDecoration: "none",
              fontWeight: 600,
              borderBottom: `1px solid ${T.primary}`,
              paddingBottom: 2,
            }}
          >
            Se alla produkter →
          </a>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
          }}
        >
          {products.map((p) => (
            <article
              key={p.name}
              style={{
                background: T.surfaceAlt,
                border: `1px solid ${T.border}`,
                borderRadius: 20,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  aspectRatio: "1/1",
                  background: `linear-gradient(160deg, ${T.surface} 0%, ${T.surfaceWarm} 100%)`,
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderBottom: `1px solid ${T.border}`,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 16,
                    left: 16,
                    background: T.accent,
                    color: T.primaryDeep,
                    fontFamily: T.fontBody,
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    padding: "5px 12px",
                    borderRadius: 999,
                  }}
                >
                  {p.tag}
                </span>
                <Logo color={T.primary} size={96} />
              </div>
              <div style={{ padding: "24px 24px 28px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                <Eyebrow>{p.sub}</Eyebrow>
                <Display size={30} margin="2px 0 0">
                  {p.name}
                </Display>
                <p
                  style={{
                    fontFamily: T.fontBody,
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: T.inkMute,
                    margin: "8px 0 0",
                  }}
                >
                  {p.blurb}
                </p>
                <div
                  style={{
                    marginTop: "auto",
                    paddingTop: 20,
                    borderTop: `1px solid ${T.borderSoft}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontFamily: T.fontDisplay,
                      fontSize: 24,
                      fontWeight: 500,
                      color: T.primaryDeep,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {p.price}
                  </span>
                  <Button size="sm">Lägg i varukorg</Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FounderBand() {
  return (
    <section style={{ background: T.primaryDeep, padding: "120px 32px", color: T.surface }}>
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr 1.2fr",
          gap: 80,
          alignItems: "center",
        }}
      >
        <div
          style={{
            aspectRatio: "4/5",
            borderRadius: 24,
            position: "relative",
            overflow: "hidden",
            border: `1px solid rgba(251,250,247,0.08)`,
            background: T.primaryDeep,
          }}
        >
          <Image
            src="/brand/founder/constantin.jpg"
            alt="Constantin Raduti, grundare av Biomax 2001"
            fill
            sizes="(max-width: 1240px) 45vw, 540px"
            quality={85}
            priority={false}
            style={{
              objectFit: "cover",
              objectPosition: "center 22%",
              filter: "contrast(1.04) saturate(0.78) brightness(0.96)",
            }}
          />
          {/* Warm tone overlay — pulls the photo toward the brand temperature */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(180deg, rgba(15,36,64,0.35) 0%, rgba(15,36,64,0.05) 30%, rgba(15,36,64,0.05) 60%, rgba(15,36,64,0.55) 100%)`,
              pointerEvents: "none",
            }}
          />
          {/* Edge vignette — pushes the busy industrial background into shadow */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse 80% 70% at 50% 38%, transparent 0%, transparent 45%, rgba(15,36,64,0.55) 100%)",
              pointerEvents: "none",
            }}
          />
          {/* Subtle sage tint to harmonize with the brand accent */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: T.accent,
              mixBlendMode: "soft-light",
              opacity: 0.14,
              pointerEvents: "none",
            }}
          />
          {/* Caption */}
          <div
            style={{
              position: "absolute",
              left: 24,
              right: 24,
              bottom: 24,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span
              style={{
                fontFamily: T.fontBody,
                fontSize: 10,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: T.accent,
                fontWeight: 700,
              }}
            >
              Grundare · Sedan 2001
            </span>
            <span
              style={{
                fontFamily: T.fontDisplay,
                fontSize: 26,
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: T.surface,
                lineHeight: 1.05,
              }}
            >
              Constantin Raduti
            </span>
          </div>
        </div>
        <div>
          <Eyebrow color={T.accent}>Vår berättelse · Sedan 2001</Eyebrow>
          <Display
            size={64}
            margin="20px 0 28px"
            color={T.surface}
          >
            <em style={{ fontStyle: "italic", color: T.accent }}>
              &ldquo;För varje läkemedel
            </em>{" "}
            som gynnar patienten finns ett naturligt ämne som kan uppnå samma effekt.&rdquo;
          </Display>
          <p
            style={{
              fontFamily: T.fontBody,
              fontSize: 18,
              lineHeight: 1.65,
              color: "rgba(251,250,247,0.78)",
              maxWidth: 560,
              margin: "0 0 32px",
            }}
          >
            Det var övertygelsen som fick Constantin Raduti att grunda Biomax 2001. Sedan dess har vi sökt efter
            naturpreparat med klinisk dokumentation — från de länder som ligger längst fram inom alternativ medicin.
            Vi väljer hellre färre produkter med riktig forskning bakom, än hela hyllor utan substans.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              style={{
                background: T.accent,
                color: T.primaryDeep,
                fontFamily: T.fontBody,
                fontWeight: 700,
                fontSize: 14,
                padding: "14px 28px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
              }}
            >
              Läs hela berättelsen
            </button>
            <button
              style={{
                background: "transparent",
                color: T.surface,
                fontFamily: T.fontBody,
                fontWeight: 600,
                fontSize: 14,
                padding: "14px 28px",
                borderRadius: 999,
                border: `1.5px solid rgba(251,250,247,0.4)`,
                cursor: "pointer",
              }}
            >
              Boka konsultation
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Knowledge() {
  const articles = [
    {
      cat: "Forskning",
      title: "Beta-glukan och immunmodulering — vad säger studierna?",
      read: "8 min läsning",
    },
    {
      cat: "Ingrediens",
      title: "Xylitol från björk: glykemiskt index, tandhälsa och tarmflora",
      read: "6 min läsning",
    },
    {
      cat: "Guide",
      title: "Adaptogener vid stress — så väljer du rätt formulering",
      read: "10 min läsning",
    },
  ];
  return (
    <section style={{ background: T.surface, padding: "112px 32px" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 56,
            flexWrap: "wrap",
            gap: 24,
          }}
        >
          <div>
            <Eyebrow>Kunskap</Eyebrow>
            <Display size={56} margin="12px 0 0">
              Forskning, <em style={{ fontStyle: "italic", color: T.accentDeep }}>förklarad</em>
            </Display>
          </div>
          <a
            href="#"
            style={{
              fontFamily: T.fontBody,
              fontSize: 14,
              color: T.primary,
              textDecoration: "none",
              fontWeight: 600,
              borderBottom: `1px solid ${T.primary}`,
              paddingBottom: 2,
            }}
          >
            Alla artiklar →
          </a>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
          }}
        >
          {articles.map((a) => (
            <a
              key={a.title}
              href="#"
              style={{
                textDecoration: "none",
                color: T.ink,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  aspectRatio: "16/10",
                  background: `linear-gradient(135deg, ${T.surfaceWarm} 0%, ${T.surface} 100%)`,
                  borderRadius: 16,
                  border: `1px solid ${T.border}`,
                  marginBottom: 20,
                }}
              />
              <Eyebrow color={T.accentDeep}>{a.cat}</Eyebrow>
              <Display size={26} margin="10px 0 0">
                {a.title}
              </Display>
              <p
                style={{
                  fontFamily: T.fontBody,
                  fontSize: 13,
                  color: T.inkMute,
                  margin: "12px 0 0",
                  letterSpacing: "0.04em",
                }}
              >
                {a.read}
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function Newsletter() {
  return (
    <section style={{ background: T.surfaceWarm, padding: "96px 32px" }}>
      <div
        style={{
          maxWidth: 880,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <Eyebrow>Brev från Biomax</Eyebrow>
        <Display size={56} margin="16px 0 16px">
          Forskning, urval och {""}
          <em style={{ fontStyle: "italic", color: T.accentDeep }}>10 % rabatt</em>{" "}
          på första köpet.
        </Display>
        <p
          style={{
            fontFamily: T.fontBody,
            fontSize: 17,
            lineHeight: 1.6,
            color: T.inkMute,
            margin: "0 0 36px",
            maxWidth: 580,
            marginInline: "auto",
          }}
        >
          Ett genomtänkt brev varannan vecka. Inga utskick i tid och otid. Lätt att avregistrera.
        </p>
        <form
          style={{
            display: "flex",
            gap: 8,
            maxWidth: 480,
            margin: "0 auto",
            background: T.surfaceAlt,
            padding: 6,
            borderRadius: 999,
            border: `1px solid ${T.border}`,
          }}
        >
          <input
            type="email"
            placeholder="din@email.se"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              padding: "12px 18px",
              fontFamily: T.fontBody,
              fontSize: 15,
              color: T.ink,
            }}
          />
          <Button size="sm">Prenumerera</Button>
        </form>
      </div>
    </section>
  );
}

function Footer() {
  const cols = [
    {
      title: "Sortiment",
      links: ["Alla produkter", "Bästsäljare", "Nyheter", "Erbjudanden"],
    },
    {
      title: "Hälsoområden",
      links: ["Hjärna & Minne", "Hjärta-Kärl", "Immunförsvar", "Leder", "Mage-Tarm"],
    },
    {
      title: "Biomax",
      links: ["Vår berättelse", "Behandlingar", "Butik i Kållered", "Kontakt"],
    },
    {
      title: "Hjälp",
      links: ["Frakt & retur", "Vanliga frågor", "Integritet", "GDPR"],
    },
  ];
  return (
    <footer style={{ background: T.primaryDeep, color: T.surface, padding: "80px 32px 32px" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr repeat(4, 1fr)",
            gap: 48,
            marginBottom: 56,
          }}
        >
          <div>
            <Lockup mono />
            <p
              style={{
                fontFamily: T.fontBody,
                fontSize: 14,
                lineHeight: 1.65,
                color: "rgba(251,250,247,0.7)",
                margin: "24px 0 0",
                maxWidth: 320,
              }}
            >
              Biomax HB · Eken Hälsobutik. Ekenleden 15A, 428 36 Kållered. Familjeägt sedan 2001.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <p
                style={{
                  fontFamily: T.fontBody,
                  fontSize: 11,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: T.accent,
                  fontWeight: 600,
                  margin: "0 0 16px",
                }}
              >
                {c.title}
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {c.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      style={{
                        fontFamily: T.fontBody,
                        fontSize: 14,
                        color: "rgba(251,250,247,0.78)",
                        textDecoration: "none",
                      }}
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div
          style={{
            paddingTop: 32,
            borderTop: "1px solid rgba(251,250,247,0.12)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: T.fontBody,
            fontSize: 12,
            color: "rgba(251,250,247,0.5)",
          }}
        >
          <span>© 2026 Biomax Handelsbolag · Org.nr 969676-7939 · Alla rättigheter förbehålls</span>
          <span>Klarna · Visa · Mastercard · Swish</span>
        </div>
      </div>
    </footer>
  );
}

export default async function DesignPage() {
  await requireAdmin();
  return (
    <main style={{ background: T.surface, fontFamily: T.fontBody, color: T.ink }}>
      <PaletteReference />
      <TopBar />
      <Header />
      <Hero season="var" />
      <TrustpilotBar />
      <Bestsellers />
      <Categories />
      <FounderBand />
      <Knowledge />
      <Newsletter />
      <Footer />
    </main>
  );
}
