// points-widgets.jsx — 5 patterns for redeeming Biomax loyalty points
//
// Contract:
//   balance: number   total available points (e.g. 796)
//   value: number     currently applied points (multiple of step)
//   onChange(n)
//   step: number      redemption granularity (default 100)
//   rate: number      kr per `step` points (default 10)  → 100 pts = 10 kr
//   compact: bool     denser look inside summary
//
// All five share a tiny "applied" preview row.

const POINTS_STEP = 100;
const POINTS_RATE = 10; // kr per 100 pts

function ptsToKr(p) { return Math.floor(p / POINTS_STEP) * POINTS_RATE; }
function maxRedeemable(balance) { return Math.floor(balance / POINTS_STEP) * POINTS_STEP; }

// ── shared chrome around any pattern ────────────────────────────────────
function PointsShell({ balance, applied, children, footer, accent = 'amber', tone = 'inline' }) {
  const isHero = tone === 'hero';
  const bg = isHero
    ? 'linear-gradient(180deg, #F4F0E8 0%, #EAE3D2 100%)'
    : 'var(--surface-warm)';
  const border = isHero ? '1px solid var(--amber-100)' : '1px solid var(--line)';

  return (
    <div style={{
      background: bg,
      border,
      borderRadius: 'var(--r-lg)',
      padding: isHero ? '22px 24px' : '16px 18px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Header row: greeting + balance */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 22, height: 22, borderRadius: 999,
              background: 'var(--amber-700)', color: '#FFF',
              display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700,
              fontFamily: 'var(--serif)',
            }}>B</span>
            <span className="eyebrow" style={{ color: 'var(--amber-900)' }}>Familjen Biomax</span>
          </div>
          <div style={{
            fontFamily: 'var(--serif)',
            fontSize: isHero ? 26 : 18,
            fontWeight: 500,
            letterSpacing: '-.01em',
            color: 'var(--ink)',
            marginTop: 8, lineHeight: 1.2,
          }}>
            {isHero ? 'Välkommen tillbaka — använd dina poäng' : 'Lös in dina poäng'}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, whiteSpace: 'nowrap' }}>
          <div style={{ fontSize: 11, color: 'var(--mute)', letterSpacing: '.04em', textTransform: 'uppercase' }}>Saldo</div>
          <div className="tnum" style={{ fontSize: isHero ? 22 : 17, fontWeight: 600, marginTop: 2 }}>
            {balance.toLocaleString('sv-SE')} <span style={{ color: 'var(--mute)', fontWeight: 400, fontSize: '.7em' }}>poäng</span>
          </div>
          <div className="tnum" style={{ fontSize: 11, color: 'var(--mute)', marginTop: 2 }}>
            ≈ {ptsToKr(balance)} kr i rabatt
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>{children}</div>

      {applied > 0 && (
        <div style={{
          marginTop: 14,
          padding: '10px 12px',
          background: 'var(--blue-deep)',
          color: '#F4ECDC',
          borderRadius: 'var(--r-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 13, whiteSpace: 'nowrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="check" size={16} />
            <span><b className="tnum">{applied.toLocaleString('sv-SE')}</b> poäng inlösta</span>
          </div>
          <span className="tnum" style={{ fontWeight: 600 }}>−{ptsToKr(applied)} kr</span>
        </div>
      )}

      {footer}
    </div>
  );
}

function EmptyState({ balance, tone }) {
  const isHero = tone === 'hero';
  return (
    <div style={{
      background: isHero ? 'linear-gradient(180deg, #F4F0E8 0%, #EAE3D2 100%)' : 'var(--surface-warm)',
      border: '1px solid ' + (isHero ? 'var(--amber-100)' : 'var(--line)'),
      borderRadius: 'var(--r-lg)',
      padding: isHero ? '22px 24px' : '16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 22, height: 22, borderRadius: 999,
          background: 'var(--amber-700)', color: '#FFF',
          display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700,
          fontFamily: 'var(--serif)',
        }}>B</span>
        <span className="eyebrow" style={{ color: 'var(--amber-900)' }}>Familjen Biomax</span>
      </div>
      <div style={{
        fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 500,
        marginTop: 10, letterSpacing: '-.01em',
      }}>
        Du börjar samla poäng på det här köpet
      </div>
      <div style={{ fontSize: 13, color: 'var(--mute)', marginTop: 4, lineHeight: 1.45 }}>
        Du får <b style={{ color: 'var(--ink)' }}>cirka 55 poäng</b> tillbaka — använd dem nästa gång för rabatt direkt i kassan.
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// A. SLIDER
// ───────────────────────────────────────────────────────────────────────
function PointsSlider({ balance, value, onChange, compact, tone }) {
  const max = maxRedeemable(balance);
  if (balance < POINTS_STEP) return <EmptyState balance={balance} tone={tone} />;

  // snap to step
  const handle = (raw) => {
    const snapped = Math.round(raw / POINTS_STEP) * POINTS_STEP;
    onChange(Math.max(0, Math.min(max, snapped)));
  };
  const pct = max === 0 ? 0 : (value / max) * 100;

  return (
    <PointsShell balance={balance} applied={value} tone={tone}
      footer={
        <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 10 }}>
          Dra för att välja. 100 poäng = 10 kr rabatt.
        </div>
      }>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className="tnum" style={{ fontFamily: 'var(--serif)', fontSize: 32, fontWeight: 500, letterSpacing: '-.02em' }}>
            {value.toLocaleString('sv-SE')}
          </span>
          <span style={{ color: 'var(--mute)', fontSize: 13 }}>poäng</span>
        </div>
        <div className="tnum" style={{ color: 'var(--green-900)', fontWeight: 600, fontSize: 16 }}>
          −{ptsToKr(value)} kr
        </div>
      </div>

      <div style={{ marginTop: 12, position: 'relative' }}>
        {/* track */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 11,
          height: 6, borderRadius: 999, background: 'var(--line)',
        }} />
        <div style={{
          position: 'absolute', left: 0, top: 11,
          width: pct + '%', height: 6, borderRadius: 999,
          background: 'var(--amber-700)',
        }} />
        <input
          type="range" min={0} max={max} step={POINTS_STEP} value={value}
          onChange={(e) => handle(+e.target.value)}
          style={{
            appearance: 'none', WebkitAppearance: 'none',
            width: '100%', height: 28, background: 'transparent',
            margin: 0, position: 'relative', zIndex: 1, cursor: 'pointer',
          }}
        />
        <style>{`
          input[type=range]::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:24px;height:24px;border-radius:999px;background:#1B1A14;border:3px solid #F4ECDC;box-shadow:0 1px 3px rgba(0,0,0,.25);cursor:grab;margin-top:0;}
          input[type=range]::-moz-range-thumb{width:24px;height:24px;border-radius:999px;background:#1B1A14;border:3px solid #F4ECDC;box-shadow:0 1px 3px rgba(0,0,0,.25);cursor:grab;}
          input[type=range]::-webkit-slider-runnable-track{background:transparent;height:28px;}
          input[type=range]::-moz-range-track{background:transparent;height:28px;}
        `}</style>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 11, color: 'var(--mute)', marginTop: 2,
      }}>
        <span>0</span>
        <span className="tnum">Max {max.toLocaleString('sv-SE')}</span>
      </div>
    </PointsShell>
  );
}

// ───────────────────────────────────────────────────────────────────────
// B. CHIPS
// ───────────────────────────────────────────────────────────────────────
function PointsChips({ balance, value, onChange, tone }) {
  const max = maxRedeemable(balance);
  if (balance < POINTS_STEP) return <EmptyState balance={balance} tone={tone} />;

  const presets = [100, 300, 500].filter(p => p <= max);
  const opts = [0, ...presets, max].filter((p, i, a) => a.indexOf(p) === i);

  return (
    <PointsShell balance={balance} applied={value} tone={tone}
      footer={
        <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 10 }}>
          Välj hur mycket du vill lösa in. 100 poäng = 10 kr.
        </div>
      }>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {opts.map((p) => {
          const active = value === p;
          const label = p === 0 ? 'Ingen' : p === max ? 'Max' : p.toLocaleString('sv-SE');
          const sub = p === 0 ? null : `−${ptsToKr(p)} kr`;
          return (
            <button key={p} onClick={() => onChange(p)} style={{
              display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start',
              gap: 3,
              padding: '10px 14px',
              borderRadius: 12,
              background: active ? 'var(--ink)' : 'var(--surface)',
              color: active ? 'var(--paper)' : 'var(--ink)',
              border: '1px solid ' + (active ? 'var(--ink)' : 'var(--line-2)'),
              cursor: 'pointer', fontWeight: 500, fontSize: 13,
              transition: 'all .12s',
              minWidth: 70,
            }}>
              <span className="tnum">{label}{p > 0 && p !== max ? ' p' : ''}</span>
              {sub && <span style={{ fontSize: 11, opacity: .65, fontWeight: 400 }} className="tnum">{sub}</span>}
            </button>
          );
        })}
      </div>
    </PointsShell>
  );
}

// ───────────────────────────────────────────────────────────────────────
// C. STEPPER
// ───────────────────────────────────────────────────────────────────────
function PointsStepper({ balance, value, onChange, tone }) {
  const max = maxRedeemable(balance);
  if (balance < POINTS_STEP) return <EmptyState balance={balance} tone={tone} />;

  const dec = () => onChange(Math.max(0, value - POINTS_STEP));
  const inc = () => onChange(Math.min(max, value + POINTS_STEP));

  const btn = (dis) => ({
    width: 40, height: 40, borderRadius: 999,
    border: '1px solid var(--line-2)',
    background: dis ? 'var(--paper-2)' : 'var(--surface)',
    color: dis ? 'var(--mute-2)' : 'var(--ink)',
    display: 'grid', placeItems: 'center',
    cursor: dis ? 'default' : 'pointer',
  });

  return (
    <PointsShell balance={balance} applied={value} tone={tone}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: 'var(--mute)' }}>
          <span>Steg om 100 poäng (10 kr).</span>
          <button onClick={() => onChange(max)} style={{
            background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
            color: 'var(--amber-900)', fontWeight: 600, fontSize: 12, textDecoration: 'underline',
          }}>Använd max</button>
        </div>
      }>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 14, padding: '10px 12px',
      }}>
        <button onClick={dec} style={btn(value === 0)} aria-label="Minska">
          <Icon name="minus" size={18} />
        </button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div className="tnum" style={{
            fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 500,
            letterSpacing: '-.02em', lineHeight: 1,
          }}>
            {value.toLocaleString('sv-SE')} <span style={{ fontSize: 13, color: 'var(--mute)', fontFamily: 'var(--sans)', fontWeight: 400 }}>poäng</span>
          </div>
          <div className="tnum" style={{ marginTop: 4, fontSize: 12, color: value > 0 ? 'var(--green-900)' : 'var(--mute)', fontWeight: 600 }}>
            {value > 0 ? `−${ptsToKr(value)} kr rabatt` : 'Tryck + för att börja'}
          </div>
        </div>
        <button onClick={inc} style={btn(value === max)} aria-label="Öka">
          <Icon name="plus" size={18} />
        </button>
      </div>
    </PointsShell>
  );
}

// ───────────────────────────────────────────────────────────────────────
// D. TOGGLE (single switch — apply max)
// ───────────────────────────────────────────────────────────────────────
function PointsToggle({ balance, value, onChange, tone }) {
  const max = maxRedeemable(balance);
  if (balance < POINTS_STEP) return <EmptyState balance={balance} tone={tone} />;

  const on = value > 0;
  const flip = () => onChange(on ? 0 : max);

  const isHero = tone === 'hero';
  return (
    <div style={{
      background: isHero ? 'linear-gradient(180deg, #F4F0E8 0%, #EAE3D2 100%)' : 'var(--surface-warm)',
      border: '1px solid ' + (isHero ? 'var(--amber-100)' : 'var(--line)'),
      borderRadius: 'var(--r-lg)',
      padding: isHero ? '20px 22px' : '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 36, height: 36, borderRadius: 999,
            background: 'var(--amber-700)', color: '#FFF',
            display: 'grid', placeItems: 'center', fontFamily: 'var(--serif)',
            fontSize: 16, fontWeight: 600,
          }}>B</span>
          <div>
            <div className="eyebrow" style={{ color: 'var(--amber-900)' }}>Familjen Biomax</div>
            <div style={{
              fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 500,
              marginTop: 2, letterSpacing: '-.01em',
            }}>
              Använd <span className="tnum">{max.toLocaleString('sv-SE')}</span> poäng
            </div>
            <div className="tnum" style={{ fontSize: 12, color: 'var(--mute)', marginTop: 2 }}>
              Spara <b style={{ color: 'var(--green-900)' }}>−{ptsToKr(max)} kr</b> · saldo {balance.toLocaleString('sv-SE')}
            </div>
          </div>
        </div>
        <button onClick={flip} role="switch" aria-checked={on} style={{
          width: 52, height: 30, borderRadius: 999,
          background: on ? 'var(--green-900)' : 'var(--line-2)',
          border: 0, padding: 3, cursor: 'pointer',
          position: 'relative',
          transition: 'background .15s',
        }}>
          <span style={{
            display: 'block', width: 24, height: 24, borderRadius: 999,
            background: '#FFF', transform: `translateX(${on ? 22 : 0}px)`,
            transition: 'transform .18s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,.2)',
          }} />
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// E. HERO (full banner above checkout, paired with any inner pattern)
//    – this component is the BANNER itself, used when placement="hero"
// ───────────────────────────────────────────────────────────────────────
function PointsHero({ balance, value, onChange }) {
  const max = maxRedeemable(balance);

  return (
    <div style={{
      borderRadius: 'var(--r-xl)',
      padding: '26px 28px',
      background: 'linear-gradient(135deg, #0F2440 0%, #1E3A5F 100%)',
      color: '#F4ECDC',
      display: 'grid',
      gridTemplateColumns: '1.1fr 1fr',
      gap: 36,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* decorative leaf */}
      <svg viewBox="0 0 200 200" style={{
        position: 'absolute', right: -40, top: -40,
        width: 240, height: 240, opacity: .14,
      }}>
        <path d="M20 180c0-90 70-160 170-160-10 110-80 170-160 160z" fill="#EAE3D2"/>
        <path d="M20 180l120-120" stroke="#EAE3D2" strokeWidth="2" fill="none"/>
      </svg>

      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 22, height: 22, borderRadius: 999,
            background: '#EAE3D2', color: '#0F2440',
            display: 'grid', placeItems: 'center',
            fontFamily: 'var(--serif)', fontSize: 12, fontWeight: 700,
          }}>B</span>
          <span className="eyebrow" style={{ color: '#EAE3D2' }}>Familjen Biomax</span>
        </div>
        <div style={{
          fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 500,
          marginTop: 12, lineHeight: 1.15, letterSpacing: '-.015em',
        }}>
          Välkommen tillbaka, Adrian.<br/>
          <span style={{ color: '#EAE3D2' }}>Använd dina {balance.toLocaleString('sv-SE')} poäng nu.</span>
        </div>
        <div style={{ fontSize: 13, color: 'rgba(244,236,220,.75)', marginTop: 8, maxWidth: 380 }}>
          Som familjekund får du 10 kr rabatt per 100 poäng. Du har samlat sedan {new Date().getFullYear() - 2} år.
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{
          background: 'rgba(244,236,220,.08)',
          border: '1px solid rgba(244,223,177,.25)',
          borderRadius: 'var(--r-lg)',
          padding: 18,
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, opacity: .7, textTransform: 'uppercase', letterSpacing: '.1em' }}>Du löser in</span>
            <span className="tnum" style={{ fontSize: 12, opacity: .7 }}>av {max.toLocaleString('sv-SE')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
            <span className="tnum" style={{ fontFamily: 'var(--serif)', fontSize: 38, fontWeight: 500, letterSpacing: '-.02em' }}>
              {value.toLocaleString('sv-SE')}
            </span>
            <span style={{ fontSize: 14, opacity: .7 }}>poäng</span>
            <span className="tnum" style={{ marginLeft: 'auto', fontSize: 15, fontWeight: 600, color: '#EAE3D2' }}>−{ptsToKr(value)} kr</span>
          </div>
          {/* slider */}
          <div style={{ position: 'relative', marginTop: 14, height: 28 }}>
            <div style={{
              position: 'absolute', left: 0, right: 0, top: 11,
              height: 6, borderRadius: 999, background: 'rgba(244,236,220,.18)',
            }} />
            <div style={{
              position: 'absolute', left: 0, top: 11,
              width: max ? (value / max) * 100 + '%' : 0, height: 6, borderRadius: 999,
              background: '#EAE3D2',
            }} />
            <input
              type="range" min={0} max={max} step={POINTS_STEP} value={value}
              onChange={(e) => onChange(Math.round(+e.target.value / POINTS_STEP) * POINTS_STEP)}
              style={{
                appearance: 'none', WebkitAppearance: 'none',
                width: '100%', height: 28, background: 'transparent',
                margin: 0, position: 'absolute', inset: 0, cursor: 'pointer',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => onChange(0)} style={chipBtnDark(value === 0)}>Ingen</button>
            <button onClick={() => onChange(Math.min(max, 300))} style={chipBtnDark(value === 300)}>300 p</button>
            <button onClick={() => onChange(max)} style={chipBtnDark(value === max)}>Max · {ptsToKr(max)} kr</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function chipBtnDark(active) {
  return {
    flex: 1,
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid ' + (active ? '#EAE3D2' : 'rgba(244,223,177,.25)'),
    background: active ? '#EAE3D2' : 'transparent',
    color: active ? '#0F2440' : '#F4ECDC',
    fontSize: 12, fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  };
}

// ───────────────────────────────────────────────────────────────────────
// Router: render whichever pattern is chosen
// ───────────────────────────────────────────────────────────────────────
function PointsWidget({ pattern, ...props }) {
  if (pattern === 'slider') return <PointsSlider {...props} />;
  if (pattern === 'chips') return <PointsChips {...props} />;
  if (pattern === 'stepper') return <PointsStepper {...props} />;
  if (pattern === 'toggle') return <PointsToggle {...props} />;
  return <PointsSlider {...props} />;
}

Object.assign(window, {
  PointsWidget, PointsSlider, PointsChips, PointsStepper, PointsToggle, PointsHero,
  POINTS_STEP, POINTS_RATE, ptsToKr, maxRedeemable,
});
