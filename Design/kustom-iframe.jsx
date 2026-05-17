// kustom-iframe.jsx — mock of the Kustom Checkout (KCO) iframe.
// Everything inside this component represents what Kustom owns and renders
// inside #kustom-checkout-container. The MERCHANT cannot apply CSS to elements
// inside this; only a few colors + border radius are themable via API options:
//
//   color_button, color_button_text, color_checkbox, color_checkbox_checkmark,
//   color_header, color_link, radius_border
//
// Plus options.shipping_details (≤70 chars) and options.vat_removed.

function KustomIframe({ theme, applied, total, showOverlay, showTestBanner = true }) {
  const t = theme;
  const ringRadius = (t.radius_border || 8) + 'px';

  // KCO's internal type system (we infer it — they don't expose tokens).
  // Headers are rendered with color_header; links with color_link; buttons with
  // color_button + color_button_text; checkbox fill with color_checkbox.
  const headerStyle = { color: t.color_header, fontWeight: 600 };
  const linkStyle = { color: t.color_link, textDecoration: 'underline', cursor: 'pointer' };

  // Form chrome (the iframe's actual look — we don't get to restyle these)
  const radio = (on) => ({
    width: 20, height: 20, borderRadius: 999,
    border: '1.5px solid ' + (on ? t.color_checkbox : '#C8C8C8'),
    background: '#FFF', display: 'grid', placeItems: 'center', flexShrink: 0,
  });
  const radioDot = { width: 10, height: 10, borderRadius: 999, background: t.color_checkbox };

  return (
    <div style={{
      position: 'relative',
      background: '#FFFFFF',
      // KCO uses its own neutral system font stack — emulate it explicitly
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      color: '#1B1B1B',
      borderRadius: ringRadius,
      overflow: 'hidden',
      border: '1px solid #E5E5E5',
    }}>
      {/* Kustom test-mode banner (system) */}
      {showTestBanner && (
        <div style={{
          background: '#E9FF55', color: '#0B0B0B',
          padding: '8px 14px', fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <span style={{ width: 14, height: 14, background: '#0B0B0B', display: 'inline-block', borderRadius: 2 }} />
          Test Mode
        </div>
      )}

      <div style={{ padding: '22px 24px' }}>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: '#5C5C5C' }}>
          Fyll i dina uppgifter, välj leveranssätt och betala i kassan nedan.
        </p>

        {/* 1. Dina uppgifter */}
        <KSection title="Dina uppgifter" t={t}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ fontSize: 14, lineHeight: 1.5 }}>
              <div style={{ fontWeight: 500 }}>Adrian Raduti</div>
              <div style={{ color: '#5C5C5C' }}>Johannes Väg 3, 432 67, Veddige</div>
              <div style={{ color: '#5C5C5C' }}>adrian@raduti.com · 073-534 58 68</div>
            </div>
            <a style={linkStyle}>Ändra</a>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 12, color: '#5C5C5C' }}>
            <a style={linkStyle}>Kustoms villkor gäller</a>
            <span>·</span>
            <a style={linkStyle}>Hantera autofyllningsinställningar</a>
          </div>
        </KSection>

        {/* 2. Leverans */}
        <KSection title="Leverans" t={t}>
          <KCheck checked t={t} label="Samma adress som ovan" />
          <KOption checked t={t}
            title="Postlåda/dörr"
            tags={[
              <KTag key="t" bg="#E8F8B8" fg="#414C0B" label="Spårbar" />,
              <KIconLabel key="s" icon="leaf" label="Svanenmärkt leverans i Sverige" />
            ]}
            right={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="tnum" style={{ fontWeight: 500 }}>49 kr</span>
              <KBrand brand="pn" />
            </span>}>
            <div style={{ marginTop: 12, padding: '10px 12px', background: '#F1F7FE', border: '1px solid #D4E5F6', borderRadius: 6, fontSize: 12, color: '#1F4E7A' }}>
              Snabb, spårbar och Svanenmärkt leverans till din postlåda eller vid din dörr
            </div>
            <div style={{ marginTop: 8, padding: '10px 12px', background: '#F1F7FE', border: '1px solid #D4E5F6', borderRadius: 6, fontSize: 12, color: '#1F4E7A', display: 'flex', gap: 8 }}>
              <span style={{ flexShrink: 0 }}>ⓘ</span>
              <span>Om paketet inte får plats i din postlåda levereras det vid din dörr eller i en påse utanpå din postlåda och du notifieras via PostNord App och via sms/email.</span>
            </div>
          </KOption>
          <KOption t={t}
            title="Hämta i butik"
            right={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 500 }}>Gratis</span>
              <span style={{ fontSize: 16 }}>🏪</span>
            </span>}
          />
        </KSection>

        {/* 3. Betalsätt */}
        <KSection title="Betalsätt" t={t}>
          <KOption checked t={t}
            title="Direkt"
            sub="Kort, Swish och bank"
            right={<KBrand brand="klarna" />}>
            <div style={{ marginTop: 8, fontSize: 12, color: '#5C5C5C' }}>
              Betala säkert med Klarnas <a style={linkStyle}>köparskydd</a>.
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <KBrand brand="visa" /><KBrand brand="mc" /><KBrand brand="klarna" /><KBrand brand="bank" />
            </div>
          </KOption>
          <KOption t={t} title="Faktura" sub="30 dagar, månadsfaktura, 0 kr" right={<KBrand brand="klarna" />} />
          <KOption t={t} title="Delbetalning" sub="På 6–36 månader" right={<KBrand brand="klarna" />} />
          <KOption t={t} title="Betala med kort" sub="Fyll i kortuppgifter" right={<KBrand brand="card" />} />
          <KOption t={t} title="Swish" sub="Snabbt och säkert" right={<KBrand brand="swish" />} />
          <KOption t={t} title="Apple Pay" sub="Betala direkt" right={<KBrand brand="apple" />} />
        </KSection>

        {/* Totalbelopp */}
        <div style={{ marginTop: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <div style={{ ...headerStyle, fontSize: 22, fontWeight: 500 }}>Totalbelopp</div>
              <div style={{ fontSize: 11, color: '#5C5C5C' }}>Inkl. frakt & moms</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="tnum" style={{ fontSize: 22, fontWeight: 600 }}>{total} kr</div>
              <a style={{ ...linkStyle, fontSize: 12 }}>Dölj detaljer</a>
            </div>
          </div>

          <div style={{
            marginTop: 14, border: '1px solid #E5E5E5', borderRadius: 6,
            padding: '6px 12px', fontSize: 13,
          }}>
            <KRow label="2 × Björkglukos 40g" val="546 kr" />
            <KRow label="Frakt" val="49 kr" />
            {applied > 0 && <KRow label={`Poängrabatt (${applied} p)`} val={`−${ptsToKr(applied)} kr`} color={t.color_link} />}
            <KRow label="Totalbelopp" val={`${total} kr`} bold />
            <KRow label="Moms" val={`${(total * 0.06).toFixed(2).replace('.', ',')} kr`} />
          </div>

          {/* CTA — themed via color_button + color_button_text + radius_border */}
          <button style={{
            marginTop: 18, width: '100%',
            background: t.color_button, color: t.color_button_text,
            border: 0, padding: '16px 20px',
            borderRadius: ringRadius,
            fontSize: 16, fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}>
            Betala köp · {total} kr
          </button>

          <div style={{ fontSize: 11, color: '#5C5C5C', textAlign: 'center', marginTop: 10, lineHeight: 1.5 }}>
            Genom att klicka på "Betala köp" godkänner jag <a style={linkStyle}>Kustoms villkor</a>, bekräftar{' '}
            <a style={linkStyle}>dataskyddsinformationen</a> och godkänner Biomax <a style={linkStyle}>allmänna villkor</a>.
          </div>

          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            <KBrand brand="klarna" /><KBrand brand="visa" /><KBrand brand="mc" />
            <KBrand brand="amex" /><KBrand brand="discover" /><KBrand brand="diners" />
            <KBrand brand="apple" /><KBrand brand="gpay" /><KBrand brand="swish" />
          </div>

          <div style={{ textAlign: 'center', marginTop: 14, fontSize: 11, color: '#5C5C5C', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <span style={{ fontWeight: 700, color: '#0B0B0B' }}>kustom</span>
          </div>
        </div>
      </div>

      {showOverlay && <KustomOverlay theme={theme} />}
    </div>
  );
}

// ── KCO internal helpers ────────────────────────────────────────────────
function KSection({ title, t, children }) {
  return (
    <div style={{ padding: '18px 0', borderTop: '1px solid #EAEAEA' }}>
      <h4 style={{ color: t.color_header, margin: '0 0 14px', fontSize: 17, fontWeight: 600 }}>{title}</h4>
      {children}
    </div>
  );
}

function KOption({ checked, t, title, sub, tags, right, children }) {
  return (
    <div style={{ borderBottom: '1px solid #F0F0F0', padding: '12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{
          width: 20, height: 20, borderRadius: 999, marginTop: 1,
          border: '1.5px solid ' + (checked ? t.color_checkbox : '#C8C8C8'),
          background: '#FFF', display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          {checked && <span style={{ width: 10, height: 10, borderRadius: 999, background: t.color_checkbox }} />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{title}</span>
            {right}
          </div>
          {sub && <div style={{ fontSize: 12, color: '#5C5C5C', marginTop: 2 }}>{sub}</div>}
          {tags && <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>{tags}</div>}
          {checked && children}
        </div>
      </div>
    </div>
  );
}

function KCheck({ checked, label, t }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <span style={{
        width: 20, height: 20, borderRadius: 4,
        background: checked ? t.color_checkbox : '#FFF',
        border: '1.5px solid ' + (checked ? t.color_checkbox : '#C8C8C8'),
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L20 7" stroke={t.color_checkbox_checkmark} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </span>
      <span style={{ fontSize: 14 }}>{label}</span>
    </div>
  );
}

function KTag({ bg, fg, label }) {
  return <span style={{ background: bg, color: fg, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>{label}</span>;
}
function KIconLabel({ icon, label }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#5C5C5C' }}>
    <span style={{ width: 14, height: 14, borderRadius: 999, background: '#7DA62A', display: 'inline-block' }} /> {label}
  </span>;
}

function KBrand({ brand }) {
  const map = {
    klarna: { bg: '#FFA8CD', fg: '#0E0E0E', label: 'Klarna' },
    visa: { bg: '#1A1F71', fg: '#FFF', label: 'VISA' },
    mc: { bg: '#FFF', fg: '#16161A', label: 'MC', border: '1px solid #DDD' },
    amex: { bg: '#006FCF', fg: '#FFF', label: 'AMEX' },
    discover: { bg: '#FF6000', fg: '#FFF', label: 'DISC' },
    diners: { bg: '#0079BE', fg: '#FFF', label: 'DC' },
    apple: { bg: '#000', fg: '#FFF', label: '\uF8FF Pay' },
    gpay: { bg: '#FFF', fg: '#3C4043', label: 'G Pay', border: '1px solid #DDD' },
    swish: { bg: '#EE2A7B', fg: '#FFF', label: 'Swish' },
    pn: { bg: '#0073CF', fg: '#FFF', label: 'pn' },
    card: { bg: '#FFF', fg: '#3C4043', label: '💳', border: '1px solid #DDD' },
    bank: { bg: '#FFF', fg: '#16161A', label: '🏦', border: '1px solid #DDD' },
  };
  const b = map[brand]; if (!b) return null;
  return <span style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '3px 7px', borderRadius: 3,
    background: b.bg, color: b.fg, border: b.border || '0',
    fontSize: 10, fontWeight: 700, letterSpacing: '.02em',
    height: 18, minWidth: 32,
  }}>{b.label}</span>;
}

function KRow({ label, val, color, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #F0F0F0', color: color || 'inherit', fontWeight: bold ? 600 : 400 }}>
      <span>{label}</span>
      <span className="tnum">{val}</span>
    </div>
  );
}

// ── Annotation overlay — shows what Kustom owns vs theme API ────────────
function KustomOverlay({ theme }) {
  return (
    <>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        border: '2px dashed #B4732B',
        borderRadius: (theme.radius_border || 8) + 'px',
        boxShadow: 'inset 0 0 0 9999px rgba(180, 115, 43, .04)',
      }} />
      <div style={{
        position: 'absolute', top: 10, right: 10,
        background: '#1B1A14', color: '#EAE3D2',
        padding: '6px 10px', borderRadius: 6,
        fontSize: 11, fontWeight: 600, letterSpacing: '.04em',
        fontFamily: 'var(--sans)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: '#EAE3D2' }} />
        KUSTOM IFRAME · theme via API
      </div>
    </>
  );
}

Object.assign(window, { KustomIframe });
