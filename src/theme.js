// Palette tokens, set on :root at runtime by applyTheme().
//
// light — the warm paper stock and rust accent from the v20 boards.
// dark  — v9's colour format: near-black #08080a with the #30d158 green.
// The contact slab is always dark and always uses the v9 surface.

// Punchier red-orange, per the studio references — still the red/rust family,
// just more saturated so it reads as a signal against a neutral ground.
export const ACCENT = {
  // Same signal in both schemes; the light variant is deepened so 11px mono
  // labels still clear contrast against a near-white ground (#FF5B3A on
  // #F8F8F8 is only ~2.8:1 — fine for display, unreadable for small text).
  light: '#DC4527', lightAlt: '#E8613F',
  dark:  '#FF5B3A', darkAlt:  '#FF7C5F',
};

export const THEMES = {
  // Greyscale system from the references:
  // #222222 primary · #7B7B7B secondary · #F8F8F8 ground · #FFFFFF surface.
  light: {
    bg: '#F8F8F8', surface: '#FFFFFF', panel: '#F1F1F1',
    fg: '#222222', muted: '#7B7B7B',
    rule: '#DEDEDE', hair: '#E8E8E8',
    'bg-image':
      'radial-gradient(90% 60% at 18% -10%,#FFFFFF 0%,rgba(255,255,255,0) 60%),' +
      'linear-gradient(180deg,#FBFBFB 0%,#F8F8F8 45%,#F1F1F1 100%)',
    // texture kept legible — the ruled grid and halftone are part of the look
    dot: 'rgba(34,34,34,.085)',
    grid: 'rgba(34,34,34,.07)',
    wash2: 'rgba(34,34,34,.03)',
    hatch: 'rgba(34,34,34,.04)', vig: 'rgba(34,34,34,.045)',
    grain: '.06', 'grain-blend': 'multiply',
    stain: 'rgba(120,120,120,.022)', stain2: 'rgba(110,110,110,.018)',
    fibreline: 'rgba(120,120,120,.014)', fibre: '.55',
    seam: 'rgba(34,34,34,.12)', fade: '.1',
    shadow: 'rgba(20,20,20,.15)', emboss: 'rgba(255,255,255,.8)',
    'tex-alpha': '.85', 'ghost-alpha': '.06',
  },
  // Approved carbon palette: #0A0A0A / #151515 / #F2F2F2 / #FF5B3A / #7B7B7B.
  // Colour only — the layout and texture structure are unchanged.
  dark: {
    bg: '#0A0A0A', surface: '#151515', panel: '#151515',
    fg: '#F2F2F2', muted: '#7B7B7B',
    rule: 'rgba(242,242,242,.14)', hair: 'rgba(242,242,242,.075)',
    'bg-image':
      'radial-gradient(90% 60% at 18% -12%,#151515 0%,rgba(21,21,21,0) 58%),' +
      'radial-gradient(60% 45% at -10% 72%,rgba(255,91,58,.05) 0%,rgba(255,91,58,0) 62%),' +
      'linear-gradient(180deg,#0D0D0D 0%,#0A0A0A 45%,#070707 100%)',
    dot: 'rgba(242,242,242,.10)',
    grid: 'rgba(242,242,242,.075)',
    wash2: 'rgba(242,242,242,.03)',
    hatch: 'rgba(242,242,242,.055)', vig: 'rgba(0,0,0,.5)',
    grain: '.07', 'grain-blend': 'overlay',
    stain: 'rgba(150,150,150,.025)', stain2: 'rgba(123,123,123,.02)',
    fibreline: 'rgba(242,242,242,.01)', fibre: '.7',
    seam: 'rgba(242,242,242,.09)', fade: '0',
    shadow: 'rgba(0,0,0,.75)', emboss: 'rgba(242,242,242,.04)',
    'tex-alpha': '.8', 'ghost-alpha': '.075',
  },
};

// Shared surface for the always-dark contact slab — v9's near-black.
export const INVERTED = {
  'inv-bg': '#0A0A0A',
  'inv-surface': '#151515',
  'inv-fg': '#F2F2F2',
  'inv-muted': '#7B7B7B',
  'inv-rule': 'rgba(242,242,242,.13)',
  'inv-dot': 'rgba(242,242,242,.06)',
};

/** #rrggbb -> "r,g,b" so the accent can drive rgba() washes. */
function rgbOf(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

export function applyTheme(name) {
  const dark = name === 'dark';
  const accent = dark ? ACCENT.dark : ACCENT.light;
  const accent2 = dark ? ACCENT.darkAlt : ACCENT.lightAlt;
  const rgb = rgbOf(accent);

  const vars = {
    ...INVERTED,
    ...(THEMES[name] || THEMES.light),
    accent,
    accent2,
    glow: `rgba(${rgb},${dark ? '.12' : '.10'})`,
    wash: `rgba(${rgb},.07)`,
    // the contact slab is always dark, so it always takes the dark variant
    'inv-accent': ACCENT.dark,
    'inv-wash': `rgba(${rgbOf(ACCENT.dark)},.13)`,
  };

  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty('--' + k, v));
  root.style.colorScheme = name;
  // colour only — the gradient lives in CSS via --bg-image
  root.style.backgroundColor = vars.bg;
  root.setAttribute('data-theme', name);
  return vars;
}
