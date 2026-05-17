// components.jsx — Biomax shared UI primitives
// Radios, inputs, buttons, badges, payment method rows, etc.
// All Swedish-language copy. Warm Nordic supplement vibe.

// ── Logo ────────────────────────────────────────────────────────────────
function BiomaxLogo({ size = 22 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect x="2" y="2" width="28" height="28" rx="7" fill="#1E3A5F" />
        <path d="M11 9h6.4c2.5 0 4 1.2 4 3.3 0 1.5-.9 2.5-2.2 2.9 1.7.4 2.7 1.5 2.7 3.3 0 2.3-1.7 3.6-4.5 3.6H11V9zm5.8 5.4c1.2 0 1.9-.5 1.9-1.5s-.7-1.5-1.9-1.5h-2.9v3h2.9zm.4 5.4c1.4 0 2.2-.6 2.2-1.7s-.8-1.7-2.2-1.7h-3.3v3.4h3.3z" fill="#F4ECDC"/>
      </svg>
      <div style={{ lineHeight: 1 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, letterSpacing: '-.01em' }}>biomax</div>
        <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--mute)', marginTop: 2 }}>sedan 2001 · källered</div>
      </div>
    </div>
  );
}

// ── Section wrapper ─────────────────────────────────────────────────────
function Section({ eyebrow, title, children, dense, style }) {
  return (
    <section style={{
      paddingBottom: dense ? 20 : 28,
      borderBottom: '1px solid var(--line)',
      marginBottom: dense ? 20 : 28,
      ...style,
    }}>
      {eyebrow && <div className="eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</div>}
      {title && (
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, margin: '0 0 14px', letterSpacing: '-.01em' }}>
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}

// ── Radio row (selectable card-row) ─────────────────────────────────────
function RadioRow({ checked, onClick, title, sub, right, badge, expanded, children }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        borderTop: '1px solid var(--line)',
        padding: '14px 4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}>
      <div style={{
        flex: '0 0 18px',
        width: 18, height: 18, borderRadius: 999,
        border: '1.5px solid ' + (checked ? 'var(--ink)' : 'var(--line-2)'),
        background: 'var(--surface)',
        display: 'grid', placeItems: 'center',
        marginTop: 2,
      }}>
        {checked && <div style={{ width: 9, height: 9, borderRadius: 999, background: 'var(--ink)' }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 500, fontSize: 15, color: 'var(--ink)' }}>{title}</span>
            {badge}
          </div>
          {right}
        </div>
        {sub && <div style={{ fontSize: 13, color: 'var(--mute)', marginTop: 2 }}>{sub}</div>}
        {checked && expanded && <div style={{ marginTop: 12 }}>{expanded}</div>}
      </div>
    </div>
  );
}

// ── Buttons ─────────────────────────────────────────────────────────────
function Button(props) {
  const { children, variant = 'primary', size = 'md', block, style, ...rest } = props;
  delete rest.block; // belt-and-braces — Babel sometimes leaks rest props
  const base = {
    border: 0, borderRadius: 999, cursor: 'pointer',
    fontWeight: 600, letterSpacing: '-.005em',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    transition: 'transform .12s, background .15s, color .15s',
    width: block ? '100%' : 'auto',
  };
  const sizes = {
    sm: { padding: '8px 14px', fontSize: 13 },
    md: { padding: '14px 22px', fontSize: 15 },
    lg: { padding: '18px 26px', fontSize: 16 },
  };
  const variants = {
    primary: { background: 'var(--ink)', color: 'var(--paper)' },
    green: { background: 'var(--blue-deep)', color: '#F4ECDC' },
    amber: { background: 'var(--amber-700)', color: '#FFF' },
    ghost: { background: 'transparent', color: 'var(--ink)', border: '1px solid var(--line-2)' },
    quiet: { background: 'var(--paper-2)', color: 'var(--ink)' },
  };
  return (
    <button {...rest} style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

// ── Chip ────────────────────────────────────────────────────────────────
function Chip({ active, onClick, children, sub }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
        padding: '8px 14px',
        borderRadius: 12,
        background: active ? 'var(--ink)' : 'var(--surface)',
        color: active ? 'var(--paper)' : 'var(--ink)',
        border: '1px solid ' + (active ? 'var(--ink)' : 'var(--line-2)'),
        cursor: 'pointer',
        fontWeight: 500, fontSize: 13,
        transition: 'all .12s',
        minWidth: 64,
      }}>
      <span>{children}</span>
      {sub && <span style={{ fontSize: 11, opacity: .65 }}>{sub}</span>}
    </button>
  );
}

// ── Icon: tiny svgs ─────────────────────────────────────────────────────
function Icon({ name, size = 18 }) {
  const s = size;
  const common = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (name === 'mailbox') return (
    <svg {...common}><path d="M3 10v9h18v-9a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4z"/><path d="M7 14v-4M16 10h2"/></svg>
  );
  if (name === 'store') return (
    <svg {...common}><path d="M3 7l2-3h14l2 3"/><path d="M4 7v13h16V7"/><path d="M9 20v-6h6v6"/></svg>
  );
  if (name === 'leaf') return (
    <svg {...common}><path d="M5 19c0-7 5-12 14-12-1 9-6 14-13 13z"/><path d="M5 19l8-8"/></svg>
  );
  if (name === 'card') return (
    <svg {...common}><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></svg>
  );
  if (name === 'check') return (
    <svg {...common}><path d="M4 12l5 5 11-11"/></svg>
  );
  if (name === 'plus') return (
    <svg {...common}><path d="M12 5v14M5 12h14"/></svg>
  );
  if (name === 'minus') return (
    <svg {...common}><path d="M5 12h14"/></svg>
  );
  if (name === 'lock') return (
    <svg {...common}><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
  );
  if (name === 'sparkle') return (
    <svg {...common}><path d="M12 3v6M12 15v6M3 12h6M15 12h6M6 6l3 3M15 15l3 3M6 18l3-3M15 9l3-3"/></svg>
  );
  if (name === 'gift') return (
    <svg {...common}><rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 12h18M12 8v13M12 8c-3 0-4-1-4-2.5S9 3 10.5 3 12 4 12 5.5C12 4 12.5 3 14 3s2.5 1 2.5 2.5S15 8 12 8z"/></svg>
  );
  if (name === 'chev-down') return (
    <svg {...common}><path d="M6 9l6 6 6-6"/></svg>
  );
  if (name === 'arrow-right') return (
    <svg {...common}><path d="M5 12h14M13 6l6 6-6 6"/></svg>
  );
  if (name === 'info') return (
    <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg>
  );
  if (name === 'truck') return (
    <svg {...common}><path d="M3 7h11v9H3zM14 11h4l3 3v2h-7"/><circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/></svg>
  );
  if (name === 'shield') return (
    <svg {...common}><path d="M12 3l8 3v6c0 4-3.5 7.5-8 9-4.5-1.5-8-5-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>
  );
  if (name === 'menu') return (
    <svg {...common}><path d="M4 7h16M4 12h16M4 17h16"/></svg>
  );
  if (name === 'bag') return (
    <svg {...common}><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8a3 3 0 1 1 6 0"/></svg>
  );
  if (name === 'search') return (
    <svg {...common}><circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/></svg>
  );
  if (name === 'star') return (
    <svg {...common}><path d="M12 3l2.7 5.5 6 .9-4.4 4.3 1 6L12 17l-5.4 2.7 1-6L3.3 9.4l6-.9z"/></svg>
  );
  return null;
}

// ── Brand pill (payment-method right-side badge) ────────────────────────
function BrandPill({ brand }) {
  const map = {
    klarna: { bg: '#FFA8CD', fg: '#0E0E0E', label: 'Klarna' },
    visa: { bg: '#1A1F71', fg: '#FFF', label: 'VISA' },
    mc: { bg: '#16161A', fg: '#FFF', label: 'MC' },
    swish: { bg: '#EE2A7B', fg: '#FFF', label: 'Swish' },
    apple: { bg: '#000', fg: '#FFF', label: '\uF8FF Pay' },
    google: { bg: '#FFF', fg: '#3C4043', label: 'G Pay', border: '1px solid var(--line-2)' },
    amazon: { bg: '#232F3E', fg: '#FF9900', label: 'a-pay' },
    pn: { bg: '#0073CF', fg: '#FFF', label: 'PostNord' },
    instabox: { bg: '#FF4FA2', fg: '#FFF', label: 'Instabox' },
    schenker: { bg: '#7DA62A', fg: '#FFF', label: 'DB' },
  };
  const b = map[brand];
  if (!b) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '3px 8px', borderRadius: 4,
      background: b.bg, color: b.fg, border: b.border || '0',
      fontSize: 10, fontWeight: 700, letterSpacing: '.04em', lineHeight: 1,
      height: 18,
    }}>{b.label}</span>
  );
}

// ── Badge ───────────────────────────────────────────────────────────────
function Badge({ tone = 'amber', children, soft }) {
  const tones = {
    amber: { bg: soft ? 'var(--amber-50)' : 'var(--amber-100)', fg: 'var(--amber-900)' },
    green: { bg: 'var(--green-50)', fg: 'var(--green-900)' },
    paper: { bg: 'var(--paper-2)', fg: 'var(--ink)' },
    ink:   { bg: 'var(--ink)', fg: 'var(--paper)' },
  };
  const t = tones[tone] || tones.amber;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 999,
      background: t.bg, color: t.fg,
      fontSize: 11, fontWeight: 600, letterSpacing: '.02em',
      lineHeight: 1,
    }}>{children}</span>
  );
}

// expose
Object.assign(window, {
  BiomaxLogo, Section, RadioRow, Button, Chip, Icon, BrandPill, Badge,
});
