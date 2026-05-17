// checkout-v2.jsx — Kustom-aware checkout layout.
//
// Layout principle: the Kustom iframe is a fixed-size "trust block" we can
// only theme via API (7 colors + radius). EVERY conversion lever lives in
// the surrounding chrome we fully control: express pay strip, member greeting,
// merchant cart panel with points widget, trust strip, recommendations,
// reviews, USP/FAQ.

// ── Top chrome ──────────────────────────────────────────────────────────
function V2TopBar() {
  return (
    <div style={{
      background: 'var(--ink)', color: 'rgba(244,236,220,.85)',
      fontSize: 12, padding: '8px 24px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      whiteSpace: 'nowrap',
    }}>
      <div style={{ display: 'flex', gap: 24 }}>
        <span>Fri frakt över 499 kr</span>
        <span>Familjen Biomax · 1 poäng per kr</span>
        <span>14 dagars öppet köp</span>
      </div>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
        <span>SE · SEK</span>
        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Mitt konto</a>
      </div>
    </div>
  );
}

function V2Nav() {
  const links = ['Produkter', 'Efter behov', 'Paket', 'Hjälp mig välja', 'Kunskap', 'Om oss'];
  return (
    <div style={{
      background: 'var(--surface)', borderBottom: '1px solid var(--line)',
      padding: '14px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        <BiomaxLogo />
        <nav style={{ display: 'flex', gap: 22, fontSize: 14, whiteSpace: 'nowrap' }}>
          {links.map((l) => <a key={l} href="#" style={{ color: 'var(--ink-2)', textDecoration: 'none' }}>{l}</a>)}
        </nav>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 14, whiteSpace: 'nowrap' }}>
        <a href="#" style={{ color: 'var(--ink-2)', textDecoration: 'none', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <Icon name="search" size={16} /> Sök
        </a>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 999,
          background: 'var(--amber-50)', color: 'var(--amber-900)',
          fontSize: 12, fontWeight: 600,
        }}>
          <span style={{
            width: 18, height: 18, borderRadius: 999,
            background: 'var(--amber-700)', color: '#FFF',
            display: 'grid', placeItems: 'center',
            fontFamily: 'var(--serif)', fontSize: 11, fontWeight: 600,
          }}>B</span>
          796 poäng
        </span>
      </div>
    </div>
  );
}

// ── Annotation chip used to label merchant-controlled zones ─────────────
function MerchantTag({ children, style }) {
  return (
    <span style={{
      position: 'absolute', top: 8, left: 8,
      background: 'rgba(26,51,38,.92)', color: '#EAE3D2',
      padding: '4px 8px', borderRadius: 4,
      fontSize: 10, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase',
      pointerEvents: 'none', zIndex: 2,
      ...style,
    }}>{children}</span>
  );
}

// ── Zone wrapper that draws an annotation outline when overlay is on ────
function Zone({ children, label, kind = 'merchant', overlay, style }) {
  const isKustom = kind === 'kustom';
  return (
    <div style={{ position: 'relative', ...style }}>
      {overlay && (
        <>
          <div style={{
            position: 'absolute', inset: -3, pointerEvents: 'none',
            border: '2px dashed ' + (isKustom ? '#B4732B' : '#2F5A3F'),
            borderRadius: 'var(--r-lg)',
            zIndex: 1,
          }} />
          <MerchantTag style={{
            background: isKustom ? '#1B1A14' : 'rgba(47,90,63,.95)',
            color: isKustom ? '#EAE3D2' : '#F4ECDC',
          }}>{label}</MerchantTag>
        </>
      )}
      {children}
    </div>
  );
}

// ── Express-pay strip (Kustom calls this out as the #1 conversion lever) ─
function ExpressPay() {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 'var(--r-lg)', padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div className="eyebrow">Snabb-betala</div>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500, margin: '4px 0 0', letterSpacing: '-.01em' }}>
            Hoppa över formuläret
          </h3>
        </div>
        <div style={{ fontSize: 12, color: 'var(--mute)', textAlign: 'right' }}>
          90% slutför snabbare<br/>med förifyllda uppgifter
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14 }}>
        <ExpressBtn bg="#000" color="#FFF" label="Pay" icon="apple" />
        <ExpressBtn bg="#FFF" color="#3C4043" border="1px solid #DADCE0" label="Pay" icon="google" />
        <ExpressBtn bg="#FFA8CD" color="#0E0E0E" label="Klarna Express" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 4px', color: 'var(--mute)', fontSize: 12 }}>
        <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        eller fyll i nedan
        <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      </div>
    </div>
  );
}

function ExpressBtn({ bg, color, border, label, icon }) {
  return (
    <button style={{
      background: bg, color, border: border || 0,
      padding: '14px 16px', borderRadius: 8,
      fontSize: 15, fontWeight: 600, cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      fontFamily: 'inherit',
    }}>
      {icon === 'apple' && <span style={{ fontSize: 17, lineHeight: 1 }}>{'\uF8FF'}</span>}
      {icon === 'google' && <span style={{ fontWeight: 700, letterSpacing: '-.02em' }}>G</span>}
      {label}
    </button>
  );
}

// ── Cart panel (merchant-controlled) ────────────────────────────────────
function CartPanel({ applied, total, children }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 'var(--r-lg)', padding: 22,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div className="eyebrow">Din beställning</div>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, margin: '6px 0 0', letterSpacing: '-.01em' }}>2 produkter</h3>
        </div>
        <a href="#" style={{ fontSize: 12, color: 'var(--mute)', textDecoration: 'underline' }}>Redigera kundvagn</a>
      </div>

      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <V2LineItem name="Björkglukos 40g" sub="Naturlig xylitol · 1 burk" qty={2} price={273} color="#EAEEE6" />
        <V2LineItem name="Omega-3 Vegan" sub="60 kapslar · 1 burk" qty={1} price={0} hide />
      </div>

      <div className="hr" style={{ margin: '16px 0' }} />

      {/* points slot */}
      {children}

      {/* totals — match what's inside iframe to build trust */}
      <div style={{ marginTop: 14, fontSize: 14, color: 'var(--ink-2)' }}>
        <V2SumRow label="Delsumma" val="546 kr" />
        <V2SumRow label="Frakt" val="49 kr" />
        {applied > 0 && <V2SumRow label={`Poängrabatt (${applied} p)`} val={`−${ptsToKr(applied)} kr`} green />}
        <div style={{ borderTop: '1px solid var(--line)', margin: '10px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500 }}>Totalt</span>
          <span className="tnum" style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 500, letterSpacing: '-.02em' }}>{total} kr</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--mute)', textAlign: 'right', marginTop: 2 }}>
          Slutför till vänster · säker betalning via Kustom
        </div>
      </div>

      {/* earn-back hint */}
      <div style={{
        marginTop: 16,
        background: 'var(--amber-50)', border: '1px solid var(--amber-100)',
        color: 'var(--amber-900)', padding: '10px 12px',
        borderRadius: 'var(--r-md)', fontSize: 12,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Icon name="sparkle" size={14} />
        <span>Du tjänar <b className="tnum">+{total}</b> poäng på det här köpet.</span>
      </div>
    </div>
  );
}

function V2LineItem({ name, sub, qty, price, color, hide }) {
  if (hide) return null;
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{
        width: 52, height: 60, borderRadius: 6,
        background: color || 'var(--paper-2)',
        flexShrink: 0, position: 'relative',
        display: 'grid', placeItems: 'center',
      }}>
        <svg width="20" height="38" viewBox="0 0 22 42">
          <rect x="6" y="0" width="10" height="6" rx="1.5" fill="#1E3A5F"/>
          <rect x="3" y="6" width="16" height="34" rx="3" fill="#FFF" stroke="#1E3A5F" strokeWidth="1"/>
          <rect x="5" y="14" width="12" height="14" rx="1" fill="#1E3A5F"/>
        </svg>
        <span style={{
          position: 'absolute', top: -6, right: -6,
          width: 20, height: 20, borderRadius: 999,
          background: 'var(--ink)', color: 'var(--paper)',
          display: 'grid', placeItems: 'center',
          fontSize: 11, fontWeight: 600,
        }} className="tnum">{qty}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 14 }}>{name}</div>
        <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 2 }}>{sub}</div>
        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--line-2)', borderRadius: 999 }}>
            <button style={qtyBtn}>−</button>
            <span style={{ padding: '0 8px', fontSize: 13, fontWeight: 500 }} className="tnum">{qty}</span>
            <button style={qtyBtn}>+</button>
          </div>
        </div>
      </div>
      <div className="tnum" style={{ fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap' }}>{qty * price} kr</div>
    </div>
  );
}
const qtyBtn = {
  width: 26, height: 26, border: 0, background: 'transparent',
  cursor: 'pointer', fontSize: 15, color: 'var(--ink-2)',
  display: 'grid', placeItems: 'center',
};

function V2SumRow({ label, val, green }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: green ? 'var(--green-900)' : 'inherit' }}>
      <span>{label}</span>
      <span className="tnum" style={{ fontWeight: green ? 600 : 400 }}>{val}</span>
    </div>
  );
}

// ── Trust strip ─────────────────────────────────────────────────────────
function TrustStrip() {
  const items = [
    { icon: 'truck', t: 'Snabb leverans', s: '1–3 vardagar med PostNord' },
    { icon: 'shield', t: '14 dagars öppet köp', s: 'Fri retur via Post­Nord' },
    { icon: 'leaf', t: 'Svanenmärkt frakt', s: 'Klimat­neutralt val' },
    { icon: 'check', t: '4,7 av 5 på Trustpilot', s: '12 400+ omdömen' },
  ];
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 'var(--r-lg)', padding: '16px 18px',
      display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14,
    }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{
            width: 32, height: 32, borderRadius: 999,
            background: 'var(--green-50)', color: 'var(--green-900)',
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>
            <Icon name={it.icon} size={16} />
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{it.t}</div>
            <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 1 }}>{it.s}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Recommendations (AOV lever per Kustom marketing) ────────────────────
function Recos() {
  const items = [
    { name: 'Magnesium', sub: 'Avslappning · 60 tab.', price: 189, color: '#F4F0E8' },
    { name: 'Probiotika', sub: 'Mage · 30 dagar', price: 269, color: '#EAEEE6' },
    { name: 'B-vitamin', sub: 'Energi · 90 tab.', price: 149, color: '#EAE3D2' },
  ];
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <div>
          <div className="eyebrow">Lägg till</div>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 500, margin: '4px 0 0', letterSpacing: '-.01em' }}>
            Andra köper också
          </h3>
        </div>
        <a href="#" style={{ fontSize: 12, color: 'var(--mute)' }}>Visa alla</a>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((it, i) => (
          <div key={i} style={{
            display: 'flex', gap: 12, alignItems: 'center',
            border: '1px solid var(--line)', borderRadius: 'var(--r-md)',
            padding: 10,
          }}>
            <div style={{ width: 44, height: 50, borderRadius: 4, background: it.color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <svg width="18" height="32" viewBox="0 0 22 42">
                <rect x="3" y="6" width="16" height="34" rx="3" fill="#FFF" stroke="#1E3A5F" strokeWidth="1"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{it.name}</div>
              <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 1 }}>{it.sub}</div>
            </div>
            <div className="tnum" style={{ fontSize: 13, fontWeight: 500 }}>{it.price} kr</div>
            <button style={{
              border: '1px solid var(--ink)', background: 'transparent',
              borderRadius: 999, padding: '6px 12px', fontSize: 12,
              fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}>+ Lägg till</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Member greeting strip (loyalty hero, optional) ──────────────────────
function MemberStrip({ balance }) {
  return (
    <div style={{
      background: 'linear-gradient(90deg, #F4F0E8 0%, #EAE3D2 100%)',
      border: '1px solid var(--amber-100)',
      borderRadius: 'var(--r-lg)',
      padding: '14px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{
          width: 38, height: 38, borderRadius: 999,
          background: 'var(--amber-700)', color: '#FFF',
          display: 'grid', placeItems: 'center', fontFamily: 'var(--serif)',
          fontSize: 18, fontWeight: 600,
        }}>B</span>
        <div>
          <div className="eyebrow" style={{ color: 'var(--amber-900)' }}>Familjen Biomax</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 500, marginTop: 2, letterSpacing: '-.01em' }}>
            Hej Adrian — du har <span className="tnum">{balance.toLocaleString('sv-SE')}</span> poäng att lösa in
          </div>
        </div>
      </div>
      <a href="#" style={{
        fontSize: 13, color: 'var(--amber-900)', textDecoration: 'none',
        padding: '8px 14px', borderRadius: 999, border: '1px solid var(--amber-700)',
        whiteSpace: 'nowrap', fontWeight: 500,
      }}>
        Använd poäng nedan ↓
      </a>
    </div>
  );
}

// ── Desktop v2 ──────────────────────────────────────────────────────────
function DesktopCheckoutV2({ pattern, balance, applied, onApplied, theme, overlay }) {
  const total = 546 + 49 - ptsToKr(applied);
  return (
    <div style={{ background: 'var(--paper)', minHeight: '100%', fontFamily: 'var(--sans)' }} data-screen-label="Desktop checkout v2">
      <V2TopBar />
      <V2Nav />

      <div style={{ maxWidth: 1220, margin: '0 auto', padding: '28px 24px 64px' }}>
        {/* breadcrumb */}
        <div style={{ fontSize: 12, color: 'var(--mute)', marginBottom: 16 }}>
          <a href="#" style={{ color: 'var(--mute)' }}>Varukorg</a> · <span style={{ color: 'var(--ink)' }}>Kassan</span> · Bekräftelse
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
          <div>
            <div className="eyebrow">Kassan</div>
            <h1 style={{
              fontFamily: 'var(--serif)', fontSize: 48, fontWeight: 500,
              margin: '4px 0 0', letterSpacing: '-.02em', lineHeight: 1.05,
            }}>Slutför ditt köp</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--mute)' }}>
            <Icon name="lock" size={14} /> Säker betalning via Kustom
          </div>
        </div>

        {/* Member loyalty hero */}
        <Zone overlay={overlay} label="Merchant · loyalty">
          <MemberStrip balance={balance} />
        </Zone>

        <div style={{
          marginTop: 24,
          display: 'grid',
          gridTemplateColumns: '1fr 400px',
          gap: 28,
          alignItems: 'flex-start',
        }}>
          {/* LEFT column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Zone overlay={overlay} label="Merchant · express pay">
              <ExpressPay />
            </Zone>

            <Zone overlay={overlay} label="Kustom iframe · themed via API" kind="kustom">
              <KustomIframe theme={theme} applied={applied} total={total} showOverlay={false} />
            </Zone>

            <div style={{ fontSize: 11, color: 'var(--mute)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon name="lock" size={12} /> Betalning hanteras av Kustom · alla data krypteras
            </div>
          </div>

          {/* RIGHT column */}
          <div style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Zone overlay={overlay} label="Merchant · cart panel">
              <CartPanel applied={applied} total={total}>
                <Zone overlay={overlay} label="Merchant · points (applies via API)">
                  <PointsWidget pattern={pattern} balance={balance} value={applied} onChange={onApplied} tone="inline" />
                </Zone>
                <div style={{ height: 14 }} />
              </CartPanel>
            </Zone>

            <Zone overlay={overlay} label="Merchant · trust">
              <TrustStrip />
            </Zone>

            <Zone overlay={overlay} label="Merchant · recs (AOV)">
              <Recos />
            </Zone>
          </div>
        </div>

        {/* Bottom: reviews + FAQ */}
        <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 28 }}>
          <Zone overlay={overlay} label="Merchant · reviews">
            <ReviewsBlock />
          </Zone>
          <Zone overlay={overlay} label="Merchant · FAQ">
            <FaqBlock />
          </Zone>
        </div>
      </div>
    </div>
  );
}

// ── Reviews + FAQ ───────────────────────────────────────────────────────
function ReviewsBlock() {
  const reviews = [
    { name: 'Emma L.', star: 5, t: 'Snabb leverans och fungerar fint för hela familjen. Beställer alltid härifrån.' },
    { name: 'Karl-Johan', star: 5, t: 'Bästa xylitol-tugummit på marknaden. 5 stjärnor varje gång.' },
    { name: 'Maria S.', star: 4, t: 'Bra produkter. Lite dyra men kvaliteten är värd det.' },
  ];
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '22px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <div>
          <div className="eyebrow">12 400 omdömen</div>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, margin: '4px 0 0', letterSpacing: '-.01em' }}>
            4,7 av 5 stjärnor
          </h3>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {[1,2,3,4,5].map(n => <span key={n} style={{ color: '#56654D' }}><Icon name="star" size={16} /></span>)}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {reviews.map((r, i) => (
          <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: 14 }}>
            <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
              {Array.from({length: r.star}).map((_, j) => <span key={j} style={{ color: '#56654D' }}><Icon name="star" size={12} /></span>)}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--ink-2)' }}>"{r.t}"</div>
            <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 8 }}>— {r.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FaqBlock() {
  const qs = [
    'När kommer paketet?',
    'Kan jag returnera?',
    'Hur fungerar Familjen Biomax-poäng?',
    'Vilka betalsätt finns?',
  ];
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '22px 24px' }}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>Vanliga frågor</div>
      <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, margin: '0 0 14px', letterSpacing: '-.01em' }}>
        Snabba svar
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {qs.map((q, i) => (
          <div key={i} style={{
            padding: '14px 0', borderTop: i === 0 ? '0' : '1px solid var(--line)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer',
          }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{q}</span>
            <Icon name="plus" size={16} />
          </div>
        ))}
      </div>
      <a href="#" style={{ fontSize: 13, color: 'var(--amber-900)', display: 'inline-flex', gap: 4, alignItems: 'center', marginTop: 6 }}>
        Visa alla frågor <Icon name="arrow-right" size={12} />
      </a>
    </div>
  );
}

// ── Mobile v2 ───────────────────────────────────────────────────────────
function MobileCheckoutV2({ pattern, balance, applied, onApplied, theme, overlay }) {
  const total = 546 + 49 - ptsToKr(applied);
  return (
    <div style={{
      background: 'var(--paper)', minHeight: '100%',
      fontFamily: 'var(--sans)', width: 390, maxWidth: '100%',
    }} data-screen-label="Mobile checkout v2">
      {/* mobile top */}
      <div style={{
        background: 'var(--ink)', color: 'rgba(244,236,220,.85)',
        padding: '6px 16px', fontSize: 11,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>Fri frakt över 499 kr</span>
        <span>4,7 ★</span>
      </div>
      <div style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--line)',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer' }}><Icon name="menu" size={20} /></button>
        <BiomaxLogo size={16} />
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 999,
          background: 'var(--amber-50)', color: 'var(--amber-900)',
          fontSize: 11, fontWeight: 600,
        }}>
          <span style={{
            width: 14, height: 14, borderRadius: 999, background: 'var(--amber-700)', color: '#FFF',
            display: 'grid', placeItems: 'center',
            fontFamily: 'var(--serif)', fontSize: 9, fontWeight: 600,
          }}>B</span>
          796p
        </span>
      </div>

      <div style={{ padding: '20px 16px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div className="eyebrow">Kassan</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 500, margin: '4px 0 0', letterSpacing: '-.015em', lineHeight: 1.05 }}>
            Slutför ditt köp
          </h1>
          <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 4 }}>2 produkter · 546 kr</div>
        </div>

        <Zone overlay={overlay} label="Loyalty">
          <MemberStrip balance={balance} />
        </Zone>

        {/* collapsed order summary */}
        <Zone overlay={overlay} label="Cart (collapsed)">
          <button style={{
            width: '100%', background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 'var(--r-md)', padding: '12px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', fontFamily: 'inherit', color: 'inherit',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 30, height: 36, borderRadius: 5, background: '#EAEEE6', display: 'grid', placeItems: 'center' }}>
                <svg width="14" height="22" viewBox="0 0 22 42"><rect x="3" y="6" width="16" height="34" rx="3" fill="#FFF" stroke="#1E3A5F" strokeWidth="1"/></svg>
              </span>
              <span style={{ fontSize: 13 }}>Visa beställning</span>
            </span>
            <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <span className="tnum" style={{ fontSize: 13, fontWeight: 500 }}>{total} kr</span>
              <Icon name="chev-down" size={16} />
            </span>
          </button>
        </Zone>

        {/* points widget */}
        <Zone overlay={overlay} label="Points">
          <PointsWidget pattern={pattern} balance={balance} value={applied} onChange={onApplied} tone="inline" />
        </Zone>

        {/* express pay */}
        <Zone overlay={overlay} label="Express pay">
          <ExpressPay />
        </Zone>

        {/* iframe */}
        <Zone overlay={overlay} label="Kustom iframe" kind="kustom">
          <KustomIframe theme={theme} applied={applied} total={total} showOverlay={false} />
        </Zone>

        <Zone overlay={overlay} label="Trust">
          <TrustStrip />
        </Zone>
      </div>
    </div>
  );
}

Object.assign(window, { DesktopCheckoutV2, MobileCheckoutV2, MemberStrip, ExpressPay, CartPanel, TrustStrip, Recos, Zone });
