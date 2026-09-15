import { useEffect, useRef } from 'react';

/**
 * The dot matrix in the primary call to action.
 *
 * There is no arrow drawn here. The lattice is fixed, and an arrow-shaped
 * region sweeps across it: dots inside that region light up and swell, then
 * decay once it has passed, so the arrow is made OF the field rather than
 * laid on top of it and it leaves a wake behind it. That is the same
 * developed-ink idea the wordmark uses under the cursor, which is why the
 * button ends up looking like it belongs to the same site.
 *
 * Two earlier attempts are worth remembering. Clipping a text arrow with
 * background-clip lost it almost entirely, because a glyph arrow's strokes
 * are about two pixels wide and a dot grid at that pitch misses them. A
 * clip-path polygon filled with dots read better but still moved as one
 * solid object across an unrelated background, which is exactly the seam
 * this version removes.
 */
const GAP = 4.6;        // lattice pitch
const CYCLE = 2300;     // one pass, including the pause after it
const SWEEP = 1500;     // how much of that the arrow is travelling for
const HW = 13;          // arrow half width
const HH = 7.2;         // arrow half height at the back of the head
const SHAFT = 2;        // where the shaft ends and the head begins
// The shaft has to be at least half a lattice pitch tall or it can fall
// cleanly between two rows and light nothing at all. At GAP 4.6 the rows sit
// +-2.3 either side of the centre line, and a 2.2 half-height missed both.
const SHAFT_HALF = 3.4;
const DECAY = 0.855;    // how fast a lit dot falls back to the resting field

export default function DotArrow() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
    let w = 0, h = 0, xs = null, ys = null, vs = null;
    let raf = 0, t0 = 0, stop = false, painted = false;
    let dotColor = '#EFEEE9';

    const readColor = () => {
      const host = canvas.parentElement;
      // the field is the button's own text colour, whatever the theme makes it
      dotColor = host ? getComputedStyle(host).color : dotColor;
    };

    const build = () => {
      // offsetWidth, not getBoundingClientRect: the rect is the VISUAL box, so
      // while an `.asm` ancestor is still held under a scale and a blur it
      // reports a shrunken size. offset* is the layout box and ignores
      // ancestor transforms entirely.
      w = canvas.offsetWidth || 64;
      h = canvas.offsetHeight || 48;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      // The CSS owns the layout size. Writing the measurement back as an
      // inline style overrides that CSS with whatever was measured, and any
      // bad first reading then locks itself in: the observer sees no further
      // change, because the element now matches what it was told to be.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Round rather than floor, so the lattice fills the box instead of
      // leaving a dead band top and bottom: flooring 48/4.6 gives 10 rows
      // spanning 36.8px of a 48px box, which reads as a stripe of dots rather
      // than a field. Odd, so one row lands exactly on the centre line the
      // arrow runs along.
      const cols = Math.max(2, Math.round(w / GAP));
      let rows = Math.max(3, Math.round(h / GAP));
      if (rows % 2 === 0) rows += 1;
      const offX = (w - (cols - 1) * GAP) / 2;
      const offY = (h - (rows - 1) * GAP) / 2;
      const n = cols * rows;
      xs = new Float32Array(n);
      ys = new Float32Array(n);
      vs = new Float32Array(n);
      for (let r2 = 0, i = 0; r2 < rows; r2++) {
        for (let c = 0; c < cols; c++, i++) {
          xs[i] = offX + c * GAP;
          ys[i] = offY + r2 * GAP;
        }
      }
    };

    /** Is (lx, ly), relative to the arrow's centre, inside the arrow? */
    const inArrow = (lx, ly) => {
      if (lx < -HW || lx > HW) return false;
      const ay = ly < 0 ? -ly : ly;
      if (lx <= SHAFT) return ay <= SHAFT_HALF;
      return ay <= HH * ((HW - lx) / (HW - SHAFT));
    };

    /**
     * @param ms       elapsed; null means "settled", used for the static frame
     * @param advance  whether to integrate the wake this call
     */
    const draw = (ms, advance) => {
      if (!w || !h || !xs) return;
      const n = xs.length;
      const cy = h / 2;

      // The arrow is parked off the left edge for the tail of the cycle, so
      // the wake has time to fade before the next pass begins.
      let ax = null;
      if (ms === null) ax = w / 2;
      else {
        const p = (ms % CYCLE) / SWEEP;
        if (p <= 1) ax = -HW - 6 + (w + HW * 2 + 12) * p;
      }

      for (let i = 0; i < n; i++) {
        if (ax !== null && inArrow(xs[i] - ax, ys[i] - cy)) vs[i] = 1;
        else if (advance) vs[i] *= DECAY;
      }

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = dotColor;

      // resting field: one path, one fill
      ctx.globalAlpha = 0.26;
      ctx.beginPath();
      let anyRest = false;
      for (let i = 0; i < n; i++) {
        if (vs[i] > 0.04) continue;
        anyRest = true;
        ctx.moveTo(xs[i] + 1.05, ys[i]);
        ctx.arc(xs[i], ys[i], 1.05, 0, Math.PI * 2);
      }
      if (anyRest) ctx.fill();

      // The wake, in four bands so it stays a handful of fills.
      //
      // The band is derived per dot and clamped, rather than tested against a
      // half-open range. A `v < hi` test on the top band silently dropped
      // every dot at exactly v = 1, which is the value a dot takes the moment
      // the arrow touches it: the wake drew but the arrow's own core did not,
      // so the shape never appeared at all.
      for (let b = 3; b >= 0; b--) {
        const mid = b / 4 + 0.125;
        ctx.globalAlpha = 0.26 + mid * 0.74;
        const rr = 1.05 + mid * 0.95;
        ctx.beginPath();
        let any = false;
        for (let i = 0; i < n; i++) {
          const v = vs[i];
          if (v <= 0.04) continue;
          let bi = (v * 4) | 0;
          if (bi > 3) bi = 3;
          if (bi !== b) continue;
          any = true;
          ctx.moveTo(xs[i] + rr, ys[i]);
          ctx.arc(xs[i], ys[i], rr, 0, Math.PI * 2);
        }
        if (any) ctx.fill();
      }
      ctx.globalAlpha = 1;
      painted = true;
    };

    const frame = (ts) => {
      raf = 0;
      if (stop) return;
      if (!t0) t0 = ts;
      draw(ts - t0, true);
      raf = requestAnimationFrame(frame);
    };

    readColor();
    build();
    // A synchronous settled frame first: if rAF never runs, on a backgrounded
    // tab or a throttled first paint, the button still shows its arrow rather
    // than an empty black box.
    draw(null, false);
    if (!reduce) raf = requestAnimationFrame(frame);

    let rt = 0;
    const ro = new ResizeObserver(() => {
      clearTimeout(rt);
      rt = setTimeout(() => { build(); draw(null, false); }, 120);
    });
    ro.observe(canvas);
    const mo = new MutationObserver(() => {
      readColor();
      if (painted) draw(null, false);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      clearTimeout(rt);
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  return <canvas className="dotmx" ref={ref} aria-hidden="true" />;
}
