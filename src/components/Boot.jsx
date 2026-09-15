import { useEffect, useRef, useState } from 'react';
import { nhash, easeOut } from '../lib/field';
import { isLand } from '../lib/world';

/**
 * Boot curtain.
 *
 * The page is composed, not revealed: everything marked `.asm` is held at a
 * scattered offset until the curtain lifts, then assembles into place on a
 * document-order stagger. The wordmark's particle assemble is armed by the
 * same signal, so the two read as one movement rather than two.
 *
 * The curtain carries a halftone globe turned in real 3D. It is the same
 * material as everything else on the page: the wordmark, the signature and
 * the contact backdrop are all dot screens, so the loader is the site
 * introducing itself rather than a spinner borrowed from somewhere else. The
 * dots arrive from a scatter and converge into the sphere, which is the page's
 * own assemble performed once before the page does it.
 *
 * The land is real. Every point is tested against the coarse continent
 * outlines in lib/world.js and drawn heavy if it falls on land, faint if it
 * falls on ocean, so the sphere reads as the Earth rather than as an abstract
 * ball of dots. Which matters for this particular site: the work on it is
 * about moving money between countries.
 *
 * SMOOTHNESS is a memory question here, not a maths one. The first version
 * built an array per point per frame and sorted those tuples, then issued one
 * beginPath/fill per dot: about 50,000 short-lived allocations a second and
 * 820 draw calls a frame, which is exactly the shape of GC stutter. Now the
 * projection lands in preallocated typed arrays, depth order falls out of a
 * counting sort into one flat index buffer, and dots are drawn in alpha bands
 * so a frame costs a couple of dozen fills instead of hundreds.
 *
 * Two hard rules, both learned the hard way:
 *   - the curtain must lift on a TIMER, not on a frame. A backgrounded tab
 *     never fires rAF, and a curtain that never lifts is a blank site. The
 *     sphere paints one frame synchronously for the same reason.
 *   - `data-boot` is written synchronously in main.jsx, so the hold is in
 *     place before first paint. If this component never mounts, the safety
 *     net in main.jsx still releases it.
 */
const HOLD = 1450;  // curtain on screen once fonts are ready
const FADE = 560;   // curtain fading out

// Enough points that continents resolve. Below about two thousand the
// landmasses read as noise, which defeats the point of testing for them.
// Ocean points are then thinned by OCEAN_KEEP, so the drawn count stays well
// under this while the land stays dense.
const N = 6400;     // points on the sphere
const OCEAN_KEEP = 0.42;
// The canvas is deliberately much larger than the sphere. The dots fly in
// from a scatter, and a box drawn tight to the sphere clips that flight: the
// dots appear at the edges instead of travelling in from outside.
const SIZE = 560;   // css px, the whole stage
const RADIUS = 152; // css px, the globe itself
const FOV = 2.6;    // smaller means more perspective
const BANDS = 16;   // alpha quantisation, and therefore fills per frame
const ENTER = 1000; // the sphere's own assemble

export function bootDone() {
  const root = document.documentElement;
  if (root.getAttribute('data-boot') === 'done') return;
  root.setAttribute('data-boot', 'done');
  dispatchEvent(new Event('boot:done'));
}

/**
 * Points spread evenly over a sphere by the Fibonacci lattice.
 *
 * Sampling latitude and longitude on a grid instead would bunch the dots at
 * the poles and thin them at the equator, and the sphere would read as a
 * wire globe rather than an even screen. This gives near-uniform spacing
 * with no seam and no clustering.
 */
function sphere(n) {
  const pts = new Float32Array(n * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = golden * i;
    pts[i * 3] = Math.cos(th) * r;
    pts[i * 3 + 1] = y;
    pts[i * 3 + 2] = Math.sin(th) * r;
  }
  return pts;
}

export default function Boot() {
  const [gone, setGone] = useState(false);
  const canvasRef = useRef(null);

  // --- the sphere -------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(SIZE * dpr);
    canvas.height = Math.round(SIZE * dpr);
    canvas.style.width = SIZE + 'px';
    canvas.style.height = SIZE + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pts = sphere(N);
    const cs = getComputedStyle(document.documentElement);
    const ink = cs.getPropertyValue('--fg').trim() || '#0C0C0C';
    const accent = cs.getPropertyValue('--accent').trim() || '#B4301F';
    const half = SIZE / 2;
    const R = RADIUS;
    // tilted off-axis so the rotation reads as a globe, not a turning disc
    const TILT = 0.42;
    const sinT = Math.sin(TILT), cosT = Math.cos(TILT);

    // Everything the draw loop touches is allocated once, here.
    const sx = new Float32Array(N);
    const sy = new Float32Array(N);
    const sr = new Float32Array(N);
    const band = new Uint8Array(N);
    const hot = new Uint8Array(N);          // on the accent latitude
    const land = new Uint8Array(N);         // over a continent
    const show = new Uint8Array(N);         // drawn at all
    let drawn = 0;
    for (let i = 0; i < N; i++) {
      const x = pts[i * 3], y = pts[i * 3 + 1], z = pts[i * 3 + 2];
      const lat = Math.asin(Math.max(-1, Math.min(1, y))) * 180 / Math.PI;
      const lon = Math.atan2(z, x) * 180 / Math.PI;
      const isL = isLand(lon, lat);
      land[i] = isL ? 1 : 0;
      // Every land point is kept; the ocean is thinned. That raises the
      // resolution of the continents without paying to draw the sea at the
      // same density, which is where most of the points would otherwise go.
      show[i] = (isL || nhash(i, 53) < OCEAN_KEEP) ? 1 : 0;
      if (show[i]) drawn++;
    }
    const count = new Uint32Array(BANDS);
    const start = new Uint32Array(BANDS);
    const cursor = new Uint32Array(BANDS);
    const sorted = new Uint32Array(N);
    // where each dot flies in from, fixed per point so the entrance is stable
    const ox = new Float32Array(N);
    const oy = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const a = nhash(i, 11) * Math.PI * 2;
      // capped so every dot starts inside the stage and is seen to travel
      const d = 130 + nhash(i, 29) * 138;
      ox[i] = Math.cos(a) * d;
      oy[i] = Math.sin(a) * d;
    }

    let raf = 0, t0 = 0, stop = false;

    const draw = (ms) => {
      const yaw = ms * 0.00042;
      const sinY = Math.sin(yaw), cosY = Math.cos(yaw);
      // the travelling latitude, in the same units as a point's own y
      const lat = Math.sin(ms * 0.0011) * 0.75;
      // the sphere's own assemble, once
      const e = ms >= ENTER ? 1 : easeOut(Math.max(0, ms) / ENTER);
      const away = 1 - e;

      ctx.clearRect(0, 0, SIZE, SIZE);
      count.fill(0);

      for (let i = 0; i < N; i++) {
        if (!show[i]) { band[i] = 0; hot[i] = 0; continue; }
        const x0 = pts[i * 3], y0 = pts[i * 3 + 1], z0 = pts[i * 3 + 2];
        // yaw about the vertical axis, then a fixed tilt about x
        const x1 = x0 * cosY - z0 * sinY;
        const z1 = x0 * sinY + z0 * cosY;
        const y2 = y0 * cosT - z1 * sinT;
        const z2 = y0 * sinT + z1 * cosT;

        // perspective: nearer points spread wider and draw larger
        const s = FOV / (FOV - z2);
        sx[i] = half + x1 * R * s + ox[i] * away;
        sy[i] = half + y2 * R * s + oy[i] * away;
        // depth cue, so the far side recedes rather than being hidden
        const depth = (z2 + 1) / 2;
        sr[i] = Math.max(0.3, (land[i] ? 0.85 + depth * 1.15 : 0.34 + depth * 0.4) * s);
        hot[i] = Math.abs(y0 - lat) < 0.055 ? 1 : 0;

        // Alpha is a function of depth, so quantising it also sorts by depth:
        // drawing the bands in order is the painter's algorithm for free.
        // Ocean points are pushed into the lower half of the band range, so
        // land always reads above the water it sits in.
        let b = ((land[i] ? depth : depth * 0.34) * (BANDS - 1) + 0.5) | 0;
        if (b < 0) b = 0; else if (b > BANDS - 1) b = BANDS - 1;
        band[i] = b;
        count[b]++;
      }

      // counting sort into one flat buffer, far band first
      let acc = 0;
      for (let b = 0; b < BANDS; b++) { start[b] = acc; cursor[b] = acc; acc += count[b]; }
      for (let i = 0; i < N; i++) if (show[i]) sorted[cursor[band[i]]++] = i;

      ctx.fillStyle = ink;
      for (let b = 0; b < BANDS; b++) {
        if (!count[b]) continue;
        const depth = b / (BANDS - 1);
        ctx.globalAlpha = (0.10 + depth * 0.70) * e;
        ctx.beginPath();
        let any = false;
        for (let k = start[b], end = start[b] + count[b]; k < end; k++) {
          const i = sorted[k];
          if (hot[i]) continue;                 // drawn in the accent pass
          any = true;
          ctx.moveTo(sx[i] + sr[i], sy[i]);
          ctx.arc(sx[i], sy[i], sr[i], 0, Math.PI * 2);
        }
        if (any) ctx.fill();
      }

      // the accent latitude last, so it reads above the screen it sits in
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.92 * e;
      ctx.beginPath();
      let anyHot = false;
      for (let i = 0; i < N; i++) {
        if (!hot[i] || !show[i]) continue;
        anyHot = true;
        ctx.moveTo(sx[i] + sr[i] * 1.15, sy[i]);
        ctx.arc(sx[i], sy[i], sr[i] * 1.15, 0, Math.PI * 2);
      }
      if (anyHot) ctx.fill();
      ctx.globalAlpha = 1;
    };

    const frame = (ts) => {
      raf = 0;
      if (stop) return;
      if (!t0) t0 = ts;
      draw(ts - t0);
      raf = requestAnimationFrame(frame);
    };

    // One frame synchronously. If rAF never runs, on a backgrounded tab or a
    // throttled first paint, the curtain still shows a finished sphere rather
    // than an empty box.
    draw(reduce ? ENTER : ENTER + nhash(Date.now() & 0xffff, 7) * 6000);
    if (!reduce) { t0 = 0; raf = requestAnimationFrame(frame); }

    return () => { stop = true; cancelAnimationFrame(raf); };
  }, []);

  // --- the curtain's own lifecycle --------------------------------------
  useEffect(() => {
    const root = document.documentElement;
    if (root.getAttribute('data-boot') === 'done') { setGone(true); return; }

    const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
    if (reduce) { bootDone(); setGone(true); return; }

    // Fonts first. Assembling the name in Georgia and re-flowing it into
    // Bodoni a beat later is worse than waiting 300ms.
    const fonts = document.fonts && document.fonts.ready
      ? document.fonts.ready
      : Promise.resolve();
    let t1 = 0, t2 = 0;
    const race = new Promise((res) => { t1 = setTimeout(res, 1400); });

    Promise.race([fonts, race]).then(() => {
      t2 = setTimeout(() => {
        bootDone();
        setTimeout(() => setGone(true), FADE);
      }, HOLD);
    });

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (gone) return null;
  return (
    <div className="boot" aria-hidden="true">
      <div className="boot-stage">
        <canvas className="boot-globe" ref={canvasRef} />
        <div className="boot-mark">
          <span className="m">Varun N</span>
          <span className="boot-rule"><i /></span>
          <span className="m">Portfolio 2026</span>
        </div>
      </div>
    </div>
  );
}
