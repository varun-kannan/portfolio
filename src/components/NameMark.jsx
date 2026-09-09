import { useEffect, useRef } from 'react';

/**
 * Type screened into a halftone and simulated as a particle field.
 *
 * Two ideas do the work here.
 *
 * LEGIBILITY. Bodoni is a Didone — hairlines a fraction of the stem width —
 * so a threshold test at one sample per cell drops the thin diagonals of V and
 * N entirely. Instead the glyphs are rasterised supersampled and stroked as
 * well as filled, every cell is averaged for ink COVERAGE, and dot area is set
 * proportional to that coverage (radius ∝ √coverage), the way a real halftone
 * screen reproduces tone. Hairlines become runs of small dots.
 *
 * BEHAVIOUR. Dots are not positioned by formula each frame; they are particles
 * with velocity, sprung to their home cell and damped. Everything else is a
 * force applied to that system:
 *   - the intro is just dots released from scattered positions and pulled home
 *   - the cursor repels, and also transfers its own velocity, so a fast swipe
 *     throws the field and a slow pass barely disturbs it
 *   - a lingering `dev` value per dot swells it toward its neighbours, so the
 *     screen resolves into solid ink and re-screens behind the cursor
 * One simulation, several behaviours, rather than several special cases.
 *
 * The mark replays every time it scrolls back into view, so it behaves like
 * the rest of the page rather than being a one-off at load.
 */
const GAP = 3.6;
const SS = 2;
const MAX_R = GAP * 0.68;
const SOLID_R = GAP * 0.8;
const MIN_COVER = 0.04;

const INFLUENCE = 142;
const REPEL = 2.4;      // outward impulse
const WAKE = 0.32;      // how much cursor momentum is transferred
const SPRING = 0.082;   // pull home
const DAMP = 0.888;     // velocity retained per frame
const DEV_DECAY = 0.935; // how long developed ink lingers behind the cursor
const RELEASE = 980;    // stagger of the intro sweep

// Math.imul keeps the intermediate products in int32. Written with plain
// `*` they overflow into float and the result collapses to [0, 0.5] with a
// mean of 0.25 — which biased every scatter angle, travel distance and
// release time in the intro toward the low end of its intended range.
function nhash(x, y) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
function smoothNoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return nhash(xi, yi) * (1 - u) * (1 - v) + nhash(xi + 1, yi) * u * (1 - v)
       + nhash(xi, yi + 1) * (1 - u) * v + nhash(xi + 1, yi + 1) * u * v;
}

/**
 * @param text     single line, the original form
 * @param lines    [{ t, italic, weight, tone }] for a multi-line lockup;
 *                 `tone` is 'fg' or 'accent' and picks the dot colour
 * @param autoFit  size the type so the widest line fills the container,
 *                 rather than taking a fixed fraction of its width
 * @param tokens   which CSS custom properties supply the two tones — the
 *                 contact slab is always dark, so it reads the --inv-* set
 */
export default function NameMark({
  text = '',
  lines,
  ariaLabel,
  weight = 900,
  scale = 0.163,
  maxSize = 190,
  lineGap = 0.93,
  autoFit = false,
  tokens,
  tilt = 0,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const LINES = lines && lines.length ? lines : [{ t: text }];
  const key = JSON.stringify([LINES, weight, scale, maxSize, lineGap, autoFit, tokens]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fgVar = (tokens && tokens.fg) || '--fg';
    const accVar = (tokens && tokens.accent) || '--accent';

    const reduce = matchMedia('(prefers-reduced-motion:reduce)');
    const fine = matchMedia('(pointer:fine)');

    let w = 0, h = 0, dots = [], raf = 0, cancelled = false, visible = false;
    let t0 = performance.now();
    // cursor: target, smoothed position, and the velocity between frames
    let tx = -9999, ty = -9999, cx = -9999, cy = -9999, cvx = 0, cvy = 0;

    const parse = (hex) => {
      const c = hex.replace('#', '').trim();
      const n = parseInt(c.length === 3 ? c.split('').map((q) => q + q).join('') : c, 16);
      return Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [34, 34, 34];
    };
    // group 0 = the body tone, group 1 = the accent tone
    let toneRGB = [[34, 34, 34], [180, 48, 31]];
    let toneCSS = ['#222222', '#B4301F'];
    let introGuard = 0, blankGuard = 0, bootGuard = 0, rt = 0;
    let armed = false, played = false;

    const readColors = () => {
      const cs = getComputedStyle(document.documentElement);
      const fg = cs.getPropertyValue(fgVar).trim() || toneCSS[0];
      const ac = cs.getPropertyValue(accVar).trim() || toneCSS[1];
      toneCSS = [fg, ac];
      toneRGB = [parse(fg), parse(ac)];
    };

    const font = (L, px) =>
      `${L.italic ? 'italic ' : ''}${L.weight || weight} ${px}px "Bodoni Moda", Georgia, serif`;

    const build = () => {
      if (cancelled) return;
      const rect = wrap.getBoundingClientRect();
      w = Math.max(240, Math.round(rect.width));

      // Measured on a scratch context: the offscreen cannot be sized until
      // the type size is known, and the type size comes from measuring.
      const scratch = document.createElement('canvas').getContext('2d');
      if (!scratch) return;
      let size;
      if (autoFit) {
        let widest = 1;
        for (const L of LINES) {
          scratch.font = font(L, 100);
          widest = Math.max(widest, scratch.measureText(L.t).width);
        }
        size = Math.min(maxSize, (w * 0.99) / (widest / 100));
      } else {
        size = Math.min(w * scale, maxSize);
      }
      const pad = size * 0.17;
      h = Math.round(pad * 2 + size * lineGap * LINES.length);

      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const off = document.createElement('canvas');
      off.width = Math.round(w * SS);
      off.height = Math.round(h * SS);
      const g = off.getContext('2d', { willReadFrequently: true });
      if (!g) return;
      g.scale(SS, SS);
      g.textBaseline = 'middle';

      const still = reduce.matches;
      const block = Math.max(1, Math.round(GAP * SS));
      dots = [];

      // One pass per line, sampling only that line's own band. Assigning a
      // dot to a line by its y alone would be wrong: a descender drops far
      // enough past the band boundary to be handed to the line below, and
      // would then be drawn in that line's colour.
      for (let li = 0; li < LINES.length; li++) {
        const L = LINES[li];
        const tone = L.tone === 'accent' ? 1 : 0;
        const cyLine = pad + size * lineGap * (li + 0.5);

        g.clearRect(0, 0, w, h);
        g.font = font(L, size);
        g.fillStyle = '#fff';
        g.fillText(L.t, 0, cyLine);
        // fortify hairlines so they survive the screen at all
        g.strokeStyle = '#fff';
        g.lineWidth = Math.max(1, size * 0.014);
        g.lineJoin = 'round';
        g.strokeText(L.t, 0, cyLine);

        const yTop = Math.max(0, Math.floor(cyLine - size * 0.82));
        const yBot = Math.min(h, Math.ceil(cyLine + size * 0.82));
        const lw = Math.min(g.measureText(L.t).width + GAP * 2, w);

        const sy0 = Math.max(0, Math.floor(yTop * SS));
        const sh = Math.min(off.height - sy0, Math.ceil((yBot - yTop) * SS) + block);
        if (sh <= 0) continue;
        const px = g.getImageData(0, sy0, off.width, sh).data;
        const stride = off.width;

        for (let y = yTop; y < yBot; y += GAP) {
          for (let x = 0; x < lw; x += GAP) {
            const sx = Math.round(x * SS), syAbs = Math.round(y * SS) - sy0;
            let sum = 0, n = 0;
            for (let by = 0; by < block; by++) {
              const yy = syAbs + by;
              if (yy < 0 || yy >= sh) break;
              for (let bx = 0; bx < block; bx++) {
                const xx = sx + bx;
                if (xx >= stride) break;
                sum += px[(yy * stride + xx) * 4 + 3];
                n++;
              }
            }
            if (!n) continue;
            const cover = sum / n / 255;
            if (cover < MIN_COVER) continue;

            // coherent scatter: neighbours leave in similar directions, so the
            // mark breaks into clusters instead of uniform fuzz
            const ang = smoothNoise(x * 0.018, y * 0.018) * Math.PI * 4;
            const mag = 75 + smoothNoise(x * 0.009 + 40, y * 0.009 + 40) * 240;
            const spin = (smoothNoise(x * 0.02 + 9, y * 0.02 + 9) - 0.5) * 4.5;
            const r0 = MAX_R * Math.sqrt(cover);

            dots.push({
              hx: x, hy: y,
              x, y,
              vx: 0, vy: 0,
              // the scatter is stored, not recomputed, so a replay is cheap
              ox: Math.cos(ang) * mag,
              oy: Math.sin(ang) * mag * 0.72,
              ivx: -Math.sin(ang) * spin,
              ivy: Math.cos(ang) * spin,
              r: r0, rr: r0,
              dev: 0,
              h0: still ? 0 : (x / Math.max(1, w)) * RELEASE
                             + ((y - yTop) / Math.max(1, size)) * 130
                             + nhash(x | 0, y | 0) * 90,
              hold: 0,
              ph: nhash((x | 0) + 7, (y | 0) + 3) * Math.PI * 2,
              g: tone,
            });
          }
        }
      }

      if (armed && visible) play();
      // A rebuild resizes the canvas, which clears it. If the mark has
      // already had its entrance, it has to be redrawn immediately —
      // deferring to settleSoon() would not, because that is guarded on
      // never having played, and the mark would simply vanish on any resize
      // that happened while it was off screen.
      else if (played) settle();
      else if (armed) settleSoon();
    };

    /** Scatter every dot back out and run the intro. */
    const play = () => {
      if (!dots.length) return;
      if (reduce.matches) { settle(); return; }
      played = true;
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        d.x = d.hx + d.ox; d.y = d.hy + d.oy;
        d.vx = d.ivx; d.vy = d.ivy;
        d.dev = 0;
        d.hold = d.h0;
      }
      t0 = performance.now();
      clearTimeout(blankGuard);
      // Dots are held back until their stagger elapses, and only reach their
      // home position by being integrated frame by frame. If frames never run
      // — backgrounded tab, throttled rAF — every dot stays held and the mark
      // renders empty. Guarantee the settled state on a timer instead.
      clearTimeout(introGuard);
      introGuard = setTimeout(settle, RELEASE + 2200);
      step();
    };

    /** Snap every dot home and repaint. Safe to call at any point. */
    const settle = () => {
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        d.x = d.hx; d.y = d.hy;
        d.vx = 0; d.vy = 0;
        d.hold = 0;
      }
      played = true;
      t0 = performance.now() - RELEASE - 3000;
      step();
    };

    // Armed but never reported visible: something is stopping the observer.
    // Draw the mark statically rather than leave a blank space — it can still
    // replay later if it does come into view.
    const settleSoon = () => {
      clearTimeout(blankGuard);
      blankGuard = setTimeout(() => { if (!played) settle(); }, 1600);
    };

    const step = () => {
      raf = 0;
      if (!w || !h) return;
      const now = performance.now();
      const t = (now - t0) / 1000;
      const still = reduce.matches;

      // smooth the cursor and derive its velocity — a fast swipe should throw
      // the field, a slow pass should barely move it
      if (cx < -9000) { cx = tx; cy = ty; cvx = 0; cvy = 0; }
      else {
        const nx = cx + (tx - cx) * 0.2;
        const ny = cy + (ty - cy) * 0.2;
        cvx = nx - cx; cvy = ny - cy;
        cx = nx; cy = ny;
      }
      const speed = Math.min(1, Math.hypot(cvx, cvy) / 26);

      ctx.clearRect(0, 0, w, h);
      const hot = [];
      let busy = false;

      // pass 1 — physics. rr < 0 marks a dot that is not to be drawn as part
      // of the resting field this frame (still held, or gone hot).
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        d.rr = -1;

        if (!still) {
          if (now - t0 < d.hold) { busy = true; continue; }

          if (cx > -9000) {
            const dx = d.x - cx, dy = d.y - cy;
            const dist = Math.hypot(dx, dy);
            if (dist < INFLUENCE) {
              const f = 1 - dist / INFLUENCE;
              const ff = f * f;
              if (dist > 0.001) {
                d.vx += (dx / dist) * ff * REPEL * (0.5 + speed);
                d.vy += (dy / dist) * ff * REPEL * (0.5 + speed);
              }
              // carry momentum, so the field trails behind the cursor
              d.vx += cvx * ff * WAKE;
              d.vy += cvy * ff * WAKE;
              if (ff > d.dev) d.dev = ff;
            }
          }
          d.dev *= DEV_DECAY;

          // spring home, damped
          d.vx += (d.hx - d.x) * SPRING;
          d.vy += (d.hy - d.y) * SPRING;
          d.vx *= DAMP;
          d.vy *= DAMP;
          d.x += d.vx;
          d.y += d.vy;

          if (Math.abs(d.vx) + Math.abs(d.vy) > 0.02 || d.dev > 0.01) busy = true;
        }

        let rr = d.r;
        if (!still) rr *= 1 + Math.sin(t * 1.15 - d.hx * 0.013 + d.ph * 0.35) * 0.055;

        if (d.dev > 0.02) {
          hot.push({ x: d.x, y: d.y, r: rr + (SOLID_R - rr) * d.dev, e: d.dev, g: d.g });
          continue;
        }
        d.rr = rr;
      }

      // pass 2 — the resting field: one path and one fill per tone. Radii may
      // vary within a path; only the fill colour has to be shared.
      for (let tone = 0; tone < 2; tone++) {
        let any = false;
        ctx.beginPath();
        for (let i = 0; i < dots.length; i++) {
          const d = dots[i];
          if (d.g !== tone || d.rr < 0) continue;
          any = true;
          ctx.moveTo(d.x + d.rr, d.y);
          ctx.arc(d.x, d.y, d.rr, 0, Math.PI * 2);
        }
        if (!any) continue;
        ctx.fillStyle = toneCSS[tone];
        ctx.fill();
      }

      // developed ink ramps toward the OTHER tone, so the field inverts under
      // the cursor rather than merely brightening
      for (let i = 0; i < hot.length; i++) {
        const a = hot[i];
        const from = toneRGB[a.g], to = toneRGB[a.g ? 0 : 1];
        const k = Math.min(1, a.e * 1.5);
        ctx.beginPath();
        ctx.fillStyle = `rgb(${Math.round(from[0] + (to[0] - from[0]) * k)},${Math.round(from[1] + (to[1] - from[1]) * k)},${Math.round(from[2] + (to[2] - from[2]) * k)})`;
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!still && (busy || visible)) queue();
    };

    const queue = () => { if (!raf) raf = requestAnimationFrame(step); };

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      tx = e.clientX - r.left;
      ty = e.clientY - r.top;
      queue();
    };
    const onLeave = () => { tx = -9999; ty = -9999; queue(); };

    const onBoot = () => {
      if (armed) return;
      armed = true;
      if (visible) play();
      else settleSoon();
    };

    readColors();

    let io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((es) => es.forEach((en) => {
        const was = visible;
        visible = en.isIntersecting;
        // Re-entering the viewport replays the assemble, so the mark behaves
        // like every other block on the page instead of being a one-off.
        if (visible && !was && armed && dots.length) play();
        else if (visible) queue();
      }), { threshold: 0.12 });
      io.observe(canvas);
    } else {
      visible = true;
    }

    if (document.documentElement.getAttribute('data-boot') === 'done') armed = true;
    else addEventListener('boot:done', onBoot);
    // never let the mark depend on a signal that might not arrive
    bootGuard = setTimeout(onBoot, 4200);

    if (document.fonts && document.fonts.load) {
      document.fonts.load('900 120px "Bodoni Moda"', LINES.map((L) => L.t).join(''))
        .then(build).catch(build);
    } else build();

    if (!reduce.matches && fine.matches) {
      addEventListener('pointermove', onMove, { passive: true });
      canvas.addEventListener('pointerleave', onLeave);
    }

    // rasterise + sample is heavy; don't run it on every frame of a drag
    const ro = new ResizeObserver(() => {
      clearTimeout(rt);
      rt = setTimeout(build, 140);
    });
    ro.observe(wrap);
    const mo = new MutationObserver(() => { readColors(); queue(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      cancelled = true;
      clearTimeout(introGuard);
      clearTimeout(blankGuard);
      clearTimeout(bootGuard);
      clearTimeout(rt);
      removeEventListener('boot:done', onBoot);
      removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      if (io) io.disconnect();
      ro.disconnect();
      mo.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [key]);

  return (
    <div className="namemark" ref={wrapRef}>
      <span className="sr-only">{ariaLabel || LINES.map((L) => L.t).join(' ')}</span>
      <canvas
        ref={canvasRef}
        className={tilt ? 'plane' : undefined}
        data-plane={tilt || undefined}
        aria-hidden="true"
      />
    </div>
  );
}
