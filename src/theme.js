// Palette tokens, set on :root at runtime by applyTheme().
//
// One accent, two schemes. Everything else in the site reads from the tokens.

/**
 * Rust — deepened and pulled toward red.
 *
 * The old #DC4527 sat at ~10° hue and 51% lightness, which read orange. This
 * is the same pigment taken to ~6° and 41%: still rust, but brick rather than
 * flame. The two variants are the SAME hue at different lightness — a red
 * that holds on limestone is too dark to read on carbon, and the 11px mono
 * labels have to clear contrast on both grounds. `alt` is the lifted variant
 * used for hovers and secondary marks.
 */
export const ACCENT = {
  light: '#B4301F', lightAlt: '#C94330',
  dark:  '#E5412E', darkAlt:  '#F06450',
};

export const THEMES = {
  // Limestone. Cooler and lighter than the old oatmeal ground: the paper
  // still reads as paper, but the sheet is bleached rather than aged, so
  // black type sits on it at full contrast instead of through a yellow cast.
  light: {
    bg: '#EFEEE9', surface: '#FAF9F6', panel: '#E7E5DF',
    fg: '#0C0C0C', muted: '#5B5952',
    rule: '#D9D6CE', hair: '#E5E2DA',
    'bg-image': 'linear-gradient(180deg,#F3F2EE 0%,#EFEEE9 52%,#E8E6E0 100%)',
    // paper surface: still organic, but a cleaner stock — less foxing, less cast
    'paper-base': '#EFEEE9', 'paper-ink': '#948E80',
    'paper-mottle': '.030', 'paper-fibre': '.010', 'paper-laid': '.005',
    'paper-chain': '.005', 'paper-screen': '.007',
    'paper-relief': '.038', 'paper-cockle': '.042',
    'paper-spec': '.016', 'paper-age': '.42', 'paper-tint': '.45',
    // limestone reflects proportionally; no absolute lift needed
    'paper-lift': '0',
    'paper-fibres': '.55', 'paper-specks': '.45',
    'paper-foxing': '.45', 'paper-vig': '.085',
    dot: 'rgba(19,19,19,.075)',
    grid: 'rgba(19,19,19,.06)',
    wash2: 'rgba(19,19,19,.028)',
    hatch: 'rgba(19,19,19,.038)', vig: 'rgba(19,19,19,.05)',
    grain: '.05', 'grain-blend': 'multiply',
    stain: 'rgba(120,120,120,.02)', stain2: 'rgba(110,110,110,.016)',
    fibreline: 'rgba(120,120,120,.012)', fibre: '.55',
    seam: 'rgba(19,19,19,.12)', fade: '.1',
    shadow: 'rgba(20,20,20,.14)', emboss: 'rgba(255,255,255,.85)',
    // light falling across the sheet, rather than a coloured halo
    sheen: 'rgba(255,255,255,.55)', 'sheen-blend': 'soft-light', 'card-sheen': 'rgba(255,255,255,.12)',
    // availability signal — deliberately not the accent, so it stays legible
    // whichever accent is selected
    live: '#2E9E5B', 'live-glow': 'rgba(46,158,91,.30)',
    'tex-alpha': '.85', 'ghost-alpha': '.055',
  },
  // Approved carbon palette: #0A0A0A / #151515 / #F2F2F2 / #7B7B7B.
  dark: {
    bg: '#0A0A0A', surface: '#151515', panel: '#151515',
    fg: '#F7F7F7', muted: '#949494',
    rule: 'rgba(242,242,242,.14)', hair: 'rgba(242,242,242,.075)',
    'bg-image': 'linear-gradient(180deg,#0C0C0C 0%,#0A0A0A 50%,#070707 100%)',
    'paper-base': '#151515', 'paper-ink': '#4A4A4A',
    // Amplitudes are back near the light sheet's, because on carbon they are
    // no longer multiplied into nothing — --paper-lift carries them in
    // absolute levels instead. Tint is off: the pulp colour is LIGHTER than
    // this base, so tinting the shadows toward it would flatten them.
    'paper-mottle': '.046', 'paper-fibre': '.018', 'paper-laid': '.009',
    'paper-chain': '.008', 'paper-screen': '.022',
    'paper-relief': '.070', 'paper-cockle': '.062',
    'paper-spec': '.030', 'paper-age': '.30', 'paper-tint': '.06',
    'paper-lift': '104',
    'paper-fibres': '.6', 'paper-specks': '.5',
    'paper-foxing': '.3', 'paper-vig': '.085',
    dot: 'rgba(242,242,242,.10)',
    grid: 'rgba(242,242,242,.075)',
    wash2: 'rgba(242,242,242,.03)',
    hatch: 'rgba(242,242,242,.055)', vig: 'rgba(0,0,0,.5)',
    grain: '.05', 'grain-blend': 'screen',
    stain: 'rgba(150,150,150,.025)', stain2: 'rgba(123,123,123,.02)',
    fibreline: 'rgba(242,242,242,.01)', fibre: '.7',
    seam: 'rgba(242,242,242,.09)', fade: '0',
    shadow: 'rgba(0,0,0,.75)', emboss: 'rgba(242,242,242,.04)',
    sheen: 'rgba(255,255,255,.055)', 'sheen-blend': 'screen', 'card-sheen': 'rgba(255,255,255,.055)',
    live: '#3ADB86', 'live-glow': 'rgba(58,219,134,.32)',
    'tex-alpha': '.8', 'ghost-alpha': '.075',
  },
};

// Shared surface for the always-dark contact slab.
export const INVERTED = {
  'inv-bg': '#0A0A0A',
  'inv-surface': '#151515',
  'inv-fg': '#F7F7F7',
  'inv-muted': '#949494',
  'inv-rule': 'rgba(242,242,242,.13)',
  'inv-dot': 'rgba(242,242,242,.06)',
  'inv-live': '#3ADB86',
  'inv-live-glow': 'rgba(58,219,134,.32)',

  // The slab carries its own sheet rather than punching a flat hole in the
  // page. Same generator, same values as the dark scheme — so in dark mode
  // the surface simply continues through it, and in light mode it reads as a
  // darker stock laid on the page instead of a void.
  'inv-paper-base': '#151515',
  'inv-paper-ink': '#4A4A4A',
  'inv-paper-mottle': '.046',
  'inv-paper-fibre': '.018',
  'inv-paper-laid': '.009',
  'inv-paper-chain': '.008',
  'inv-paper-screen': '.022',
  'inv-paper-relief': '.070',
  'inv-paper-cockle': '.062',
  'inv-paper-spec': '.030',
  'inv-paper-age': '.30',
  'inv-paper-tint': '.06',
  'inv-paper-lift': '104',
  'inv-paper-fibres': '.6',
  'inv-paper-specks': '.5',
  'inv-paper-foxing': '.3',
  'inv-paper-vig': '.09',
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
    'accent-rgb': rgb,
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
