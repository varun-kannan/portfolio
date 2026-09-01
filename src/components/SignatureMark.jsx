import { useEffect, useRef } from 'react';

/**
 * Dotted signature mark that writes itself.
 *
 * The wordmark is set in Bodoni Moda Italic — the display face already loaded
 * for the headings — rasterised to an offscreen buffer, then sampled on a fine
 * lattice so the glyphs are rebuilt out of dots. A hand-drawn flourish is
 * sampled along a bezier and appended.
 *
 * Dots are ordered left-to-right and revealed over time, with a bright nib at
 * the leading edge, so it reads as being written rather than fading in.
 */
const TEXT = 'Varun N';
const GAP = 3.3;          // fine enough that Bodoni's hairlines survive
const ALPHA_MIN = 95;   // catch antialiased thin strokes
const SPEED = 620;        // dots per second

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
      for (let y = 0; y < height; y += GAP) {
        for (let x = 0; x < width; x += GAP) {
          const o = ((y | 0) * width + (x | 0)) * 4;
          if (px[o + 3] > ALPHA_MIN) out.push([x, y]);
        }
      }

      // flourish sampled along the curve, at the same dot spacing
      const [f0, f1, f2, f3] = FLOURISH;
      let prev = null, carry = 0;
      for (let s = 0; s <= 220; s++) {
        const [nx, ny] = cubicAt(f0, f1, f2, f3, s / 220);
        const x = nx * width, y = ny * height * 0.86;
        if (y >= height) continue;
        if (!prev) { out.push([x, y]); prev = [x, y]; continue; }
        carry += Math.hypot(x - prev[0], y - prev[1]);
        if (carry >= GAP * 2.0) { out.push([x, y]); carry = 0; }
        prev = [x, y];
      }

      // written left to right
      out.sort((a, b) => a[0] - b[0]);
      return out;
    };

    const render = (count) => {
      const { ink, nib } = colors();
      ctx.clearRect(0, 0, width, height);
      const n = Math.min(count, dots.length);
      for (let i = 0; i < n; i++) {
        const [x, y] = dots[i];
        const fromHead = count - i;
        const isNib = !done && fromHead < 40;
        ctx.beginPath();
        ctx.fillStyle = isNib ? nib : ink;
        ctx.globalAlpha = isNib ? 0.95 : 0.85;
        ctx.arc(x, y, isNib ? 1.05 + (1 - fromHead / 40) * 0.85 : 0.98, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const frame = (ts) => {
      if (!started) started = ts;
      const count = Math.floor(((ts - started) / 1000) * SPEED);
      progressed = count;
      render(count);
      if (count < dots.length) raf = requestAnimationFrame(frame);
      else { done = true; render(dots.length); }
    };

    const start = () => {
      if (raf || done || !dots.length) return;
      started = 0;
      raf = requestAnimationFrame(frame);
    };

    let io = null, safety = 0, fallback = 0;

    const init = () => {
      if (cancelled) return;
      dots = buildDots();
      if (!dots.length) return;

      if (matchMedia('(prefers-reduced-motion:reduce)').matches) {
        done = true;
        render(dots.length);
        return;
      }
      render(0);

      if ('IntersectionObserver' in window) {
        io = new IntersectionObserver(
          (es) => es.forEach((en) => { if (en.isIntersecting) { start(); io.disconnect(); } }),
          { threshold: 0.35 }
        );
        io.observe(canvas);
      } else start();

      safety = setTimeout(start, 2600);
      // if frames never run (backgrounded tab), show it complete
      fallback = setTimeout(() => {
        if (!done && progressed === 0) { done = true; render(dots.length); }
      }, 4200);
    };

    // the glyphs are wrong unless the display face has actually loaded
    const font = `italic 600 ${Math.round(height * 0.62)}px "Bodoni Moda"`;
    if (document.fonts && document.fonts.load) {
      document.fonts.load(font, TEXT).then(init).catch(init);
    } else init();

    const mo = new MutationObserver(() => { if (dots.length) render(done ? dots.length : 0); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-accent'] });

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
