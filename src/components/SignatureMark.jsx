import { useEffect, useRef } from 'react';
import { nhash, scatter, easeOut } from '../lib/field';

/**
 * Dotted signature mark that assembles.
 *
 * The wordmark is set in Bodoni Moda Italic — the display face already loaded
 * for the headings — rasterised to an offscreen buffer, then sampled on a fine
 * lattice so the glyphs are rebuilt out of dots. A hand-drawn flourish is
 * sampled along a bezier and appended.
 *
 * The dots arrive from a coherent scatter field and converge, the same
 * movement as the wordmark in the hero. Position is closed-form rather than
 * integrated: there are a few thousand dots here and no reason to carry
 * velocity state for a motion that only ever plays forwards. Dots still in
 * flight are drawn in the accent, settling to ink as they land, which keeps
 * the ink-developing idea from the hero mark.
 *
 * It replays every time it scrolls back into view.
 */
const TEXT = 'Varun N';
const GAP = 3.3;          // fine enough that Bodoni's hairlines survive
const ALPHA_MIN = 95;     // catch antialiased thin strokes
const DUR = 950;          // travel time for one dot
const STAGGER = 780;      // spread of release times across the mark

// terminal flourish, in normalised 0..1 space
const FLOURISH = [
  [0.06, 0.90], [0.32, 1.02], [0.68, 0.99], [0.98, 0.82],
];

function cubicAt(p0, c1, c2, p1, t) {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [
    a * p0[0] + b * c1[0] + c * c2[0] + d * p1[0],
    a * p0[1] + b * c1[1] + c * c2[1] + d * p1[1],
  ];
}

export default function SignatureMark({ width = 520, height = 190 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0, started = 0, done = false, progressed = 0;
    let dots = [];
    let cancelled = false;

    const colors = () => {
      const cs = getComputedStyle(document.documentElement);
      return {
        ink: cs.getPropertyValue('--inv-fg').trim() || '#f2f2f4',
        nib: cs.getPropertyValue('--inv-accent').trim() || '#d9764f',
      };
    };

    /** Rasterise the wordmark, then rebuild it as a dot lattice. */
    const buildDots = () => {
      const off = document.createElement('canvas');
      off.width = width;
      off.height = height;
      const g = off.getContext('2d', { willReadFrequently: true });
      if (!g) return [];

      // fit the type to the box
      let size = height * 0.62;
      g.textBaseline = 'alphabetic';
      const setFont = (s) => { g.font = `italic 600 ${s}px "Bodoni Moda", Georgia, serif`; };
      setFont(size);
      const maxW = width * 0.94;
      let m = g.measureText(TEXT);
      if (m.width > maxW) { size *= maxW / m.width; setFont(size); m = g.measureText(TEXT); }

      g.fillStyle = '#fff';
      g.fillText(TEXT, (width - m.width) / 2, height * 0.62);

      const px = g.getImageData(0, 0, width, height).data;
      const out = [];
      const add = (x, y) => {
        const [ox, oy] = scatter(x, y, 55, 150);
        out.push({
          hx: x, hy: y, ox, oy,
          hold: (x / width) * STAGGER + nhash(x | 0, y | 0) * 180,
        });
      };
      for (let y = 0; y < height; y += GAP) {
        for (let x = 0; x < width; x += GAP) {
          const o = ((y | 0) * width + (x | 0)) * 4;
          if (px[o + 3] > ALPHA_MIN) add(x, y);
        }
      }

      // flourish sampled along the curve, at the same dot spacing
      const [f0, f1, f2, f3] = FLOURISH;
      let prev = null, carry = 0;
      for (let s = 0; s <= 220; s++) {
        const [nx, ny] = cubicAt(f0, f1, f2, f3, s / 220);
        const x = nx * width, y = ny * height * 0.86;
        if (y >= height) continue;
        if (!prev) { add(x, y); prev = [x, y]; continue; }
        carry += Math.hypot(x - prev[0], y - prev[1]);
        if (carry >= GAP * 2.0) { add(x, y); carry = 0; }
        prev = [x, y];
      }
      return out;
    };

    /**
     * @param at  ms since the run began; Infinity draws the settled mark.
     * @returns   whether anything is still moving
     */
    const render = (at) => {
      const { ink, nib } = colors();
      ctx.clearRect(0, 0, width, height);
      let busy = false;
      // in flight, collected so the two colours are each one path and one fill
      const flying = [];

      ctx.beginPath();
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        const p = (at - d.hold) / DUR;
        if (p <= 0) { busy = true; continue; }
        const e = p >= 1 ? 1 : easeOut(p);
        if (p < 1) busy = true;
        const x = d.hx + d.ox * (1 - e);
        const y = d.hy + d.oy * (1 - e);
        const r = 0.98 * e;
        if (e < 0.84) { flying.push(x, y, r); continue; }
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
      ctx.fillStyle = ink;
      ctx.globalAlpha = 0.85;
      ctx.fill();

      if (flying.length) {
        ctx.beginPath();
        for (let i = 0; i < flying.length; i += 3) {
          ctx.moveTo(flying[i] + flying[i + 2], flying[i + 1]);
          ctx.arc(flying[i], flying[i + 1], flying[i + 2], 0, Math.PI * 2);
        }
        ctx.fillStyle = nib;
        ctx.globalAlpha = 0.95;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      return busy;
    };

    const frame = (ts) => {
      raf = 0;
      if (!started) started = ts;
      progressed = ts - started;
      const busy = render(progressed);
      if (busy) raf = requestAnimationFrame(frame);
      else done = true;
    };

    const start = () => {
      if (!dots.length) return;
      if (raf) cancelAnimationFrame(raf);
      started = 0;
      done = false;
      progressed = 0;
      raf = requestAnimationFrame(frame);
    };

    let io = null, safety = 0, fallback = 0;

    const init = () => {
      if (cancelled) return;
      dots = buildDots();
      if (!dots.length) return;

      if (matchMedia('(prefers-reduced-motion:reduce)').matches) {
        done = true;
        render(Infinity);
        return;
      }
      render(0);

      if ('IntersectionObserver' in window) {
        let was = false;
        io = new IntersectionObserver((es) => es.forEach((en) => {
          // Replays on every entry rather than disconnecting after the first,
          // so it behaves like every other mark on the page.
          if (en.isIntersecting && !was) start();
          was = en.isIntersecting;
        }), { threshold: 0.35 });
        io.observe(canvas);
      } else start();

      safety = setTimeout(start, 2600);
      // if frames never run (backgrounded tab), show it complete
      fallback = setTimeout(() => {
        if (!done && progressed === 0) { done = true; render(Infinity); }
      }, 4200);
    };

    // the glyphs are wrong unless the display face has actually loaded
    const font = `italic 600 ${Math.round(height * 0.62)}px "Bodoni Moda"`;
    if (document.fonts && document.fonts.load) {
      document.fonts.load(font, TEXT).then(init).catch(init);
    } else init();

    const mo = new MutationObserver(() => { if (dots.length) render(done ? Infinity : progressed); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      if (io) io.disconnect();
      clearTimeout(safety);
      clearTimeout(fallback);
      mo.disconnect();
    };
  }, [width, height]);

  return <canvas className="signature" ref={ref} role="img" aria-label="Varun N signature" />;
}
