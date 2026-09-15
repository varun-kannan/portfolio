import { useEffect, useRef } from 'react';
import { afterBoot } from '../lib/field';

/**
 * Generated paper surface.
 *
 * Aged paper reads as a *surface* rather than a pattern because everything in
 * it is organic and low-contrast: nothing repeats, so the eye stops resolving
 * it and it drops behind the type. That is the opposite of a ruled grid,
 * which the eye keeps re-reading as information.
 *
 * The sheet is built from five things, in the order light actually encounters
 * a piece of paper:
 *
 *   COCKLE   very low frequency undulation - the sheet is not flat, and the
 *            broad soft waves in it catch the light. This is the single
 *            biggest cue that the surface has thickness.
 *   MOTTLE   the tonal drift of uneven pulp density across the sheet.
 *   TOOTH    high frequency micro-relief. Noise on its own is speckle; its
 *            GRADIENT is topography, so every fibre gets a lit face and a
 *            shadowed one.
 *   PULP     fine grain, laid streaks, and individual fibres and specks
 *            suspended in the stock.
 *   AGE      foxing blooms and an edge fall-off.
 *
 * Cost. The first two vary far too slowly to be worth a per-pixel noise
 * lookup, so they are computed once on a coarse grid and bilinearly sampled -
 * which cuts the per-pixel work by more than half and pays for everything
 * added here. Only the high-frequency layers run per pixel.
 */

// Integer hash. Deterministic, so the sheet is identical between paints and
// doesn't shimmer on resize.
//
// Math.imul is not decoration. Written with plain `*`, the intermediate
// products run past 2^53, lose their low bits to float rounding, and the
// following coercion to int32 clips the top bit - the result only ever
// covers [0, 0.5] with a mean of 0.25 instead of [0, 1] with a mean of 0.5.
// Every field built on it then ran at half amplitude AND carried a large
// negative DC offset, which is why the sheet used to render about 9% darker
// than the --paper-base it was supposedly made of.
function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
const fade = (t) => t * t * (3 - 2 * t);

function valueNoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = fade(xf), v = fade(yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

function fbm(x, y, octaves) {
  let sum = 0, amp = 0.5, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x, y) * amp;
    norm += amp;
    x *= 2.03; y *= 2.01; amp *= 0.5;
  }
  return sum / norm;
}

const LOW = 8;              // coarse-grid spacing, in CSS px
// Screen geometry: 7.5px pitch at 15°. The pitch is deliberately not near the
// wordmark's 3.6px dot gap, so the two cannot beat against each other.
const SCR_C = 0.96593, SCR_S = 0.25882;
const SCR_INV = 1 / 7.5, SCR_R2 = 0.085;
const BUDGET = 2.2e6;       // device pixels we are willing to generate
const SLICE_MS = 6;         // per slice, leaving the rest of a 16ms frame free

/**
 * @param scoped  fill the parent element instead of the viewport, so a slab
 *                with its own ground can carry the same surface rather than
 *                punching a flat hole in the page.
 * @param prefix  which family of --*-base / --*-mottle tokens to read.
 */
export default function PaperSurface({ scoped = false, prefix = 'paper' }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0, h = 0, raf = 0, generation = 0;
    // MessageChannel rather than rAF or setTimeout to yield between slices:
    // rAF never fires in a hidden tab, and nested setTimeouts get clamped to
    // 4ms each, which would stretch a sheet across a second or more.
    const chan = new MessageChannel();
    let next = null;
    chan.port1.onmessage = () => { const f = next; next = null; if (f) f(); };
    const yieldTo = (f) => { next = f; chan.port2.postMessage(0); };

    const readVars = () => {
      const cs = getComputedStyle(document.documentElement);
      const P = '--' + prefix + '-';
      const num = (n, d) => {
        const v = parseFloat(cs.getPropertyValue(P + n));
        return Number.isFinite(v) ? v : d;
      };
      const str = (n, d) => cs.getPropertyValue(P + n).trim() || d;
      return {
        base: str('base', '#EDE8DC'),
        ink: str('ink', '#8A7A5E'),
        // amplitudes stay small on purpose - this is a surface, not a pattern
        mottle: num('mottle', 0.055),
        fibre: num('fibre', 0.028),
        laid: num('laid', 0.018),
        chain: num('chain', 0.006),
        screen: num('screen', 0.012),
        relief: num('relief', 0.12),
        cockle: num('cockle', 0.10),
        spec: num('spec', 0.05),
        age: num('age', 0.5),
        tint: num('tint', 0.5),
        lift: num('lift', 0),
        fibres: num('fibres', 1),
        specks: num('specks', 1),
        foxing: num('foxing', 0.5),
        vig: num('vig', 0.09),
      };
    };

    const hexToRgb = (hex) => {
      const s = hex.replace('#', '');
      const n = parseInt(s.length === 3 ? s.split('').map((c) => c + c).join('') : s, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };

    const render = () => {
      if (!w || !h) return;
      const V = readVars();
      const [br, bg, bb] = hexToRgb(V.base);
      const [ir, ig, ib] = hexToRgb(V.ink);

      // Absolute lift.
      //
      // The texture is a MULTIPLIER on the base tone, which is right for
      // paper: a sheet reflects a proportion of the light falling on it. But
      // proportion is exactly the problem on a dark ground. A 5% swing on
      // limestone (base 239) is 12 levels and plainly visible; the same 5%
      // on carbon (base 21) is one level - under the quantisation step,
      // never mind the eye. Raising the dark amplitudes does almost nothing,
      // because they are being multiplied by a very small number.
      //
      // A dark surface catching light does not modulate proportionally; it
      // gains an added highlight. So the deviation also contributes in
      // ABSOLUTE levels, weighted by --paper-lift: zero on the light sheet,
      // which leaves it exactly as it was, and the dominant term on the dark
      // one. The slight per-channel bias makes those highlights read as
      // light rather than as grey.
      const liftR = V.lift * 1.06, liftG = V.lift, liftB = V.lift * 0.88;

      // Render scale. Generating at device resolution keeps the tooth crisp
      // on a retina screen, but the cost is quadratic, so it is capped by a
      // pixel budget rather than trusted to devicePixelRatio.
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const S = w * h * dpr * dpr <= BUDGET ? dpr : Math.max(1, Math.sqrt(BUDGET / (w * h)));
      const cw = Math.round(w * S), chh = Math.round(h * S);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';

      // --- coarse grid: cockle and mottle ---------------------------------
      const gw = Math.ceil(w / LOW) + 3;
      const gh = Math.ceil(h / LOW) + 3;
      const mot = new Float32Array(gw * gh);
      const ck = new Float32Array(gw * gh);
      const age = new Float32Array(gw * gh);
      for (let gy = 0; gy < gh; gy++) {
        const Y = (gy - 1) * LOW;
        for (let gx = 0; gx < gw; gx++) {
          const X = (gx - 1) * LOW;
          const i = gy * gw + gx;
          mot[i] = fbm(X / 260, Y / 260, 4) - 0.5;
          // anisotropic: cockle runs in soft ridges, not blobs
          ck[i] = fbm(X / 190 + 90, Y / 120 + 40, 3) - 0.5;
          // Discoloration. A sheet does not age evenly, and paper that has
          // only ever been made darker and lighter still reads as printed
          // card; paper that shifts in HUE across itself reads as old.
          age[i] = fbm(X / 420 + 300, Y / 380 + 210, 3) - 0.5;
        }
      }
      // shade the cockle by its slope, lit from the top left
      const ckShade = new Float32Array(gw * gh);
      let ckMax = 1e-6;
      for (let gy = 1; gy < gh - 1; gy++) {
        for (let gx = 1; gx < gw - 1; gx++) {
          const i = gy * gw + gx;
          const v = (ck[i - 1] - ck[i + 1]) + (ck[i - gw] - ck[i + gw]);
          ckShade[i] = v;
          const av = v < 0 ? -v : v;
          if (av > ckMax) ckMax = av;
        }
      }
      // The slope of a very low frequency field across an 8px step is tiny,
      // so the raw value is meaningless as an amplitude. Normalise it to
      // +-1 and let --paper-cockle state the luminance swing directly.
      for (let i = 0; i < ckShade.length; i++) ckShade[i] /= ckMax;
      // The three coarse channels are sampled at the same point every
      // pixel, so the index and the four interpolation weights are computed
      // once and shared, and the row half of that is hoisted out of the
      // inner loop. Measured 1.48x faster than three closure calls.

      // --- per-pixel pass --------------------------------------------------
      const img = ctx.createImageData(cw, chh);
      const px = img.data;
      const cxp = w / 2, cyp = h / 2;
      const maxR2 = cxp * cxp + cyp * cyp;
      const inv = 1 / S;

      // Sliced across tasks. Done in one go this pass held the main thread for
      // 125ms and more, which froze the loader for over half a second in a
      // measured trace, and froze the page again on every theme toggle. Each
      // slice runs a few milliseconds and yields; the canvas is only resized
      // and painted once the whole sheet is ready, so nothing half-drawn shows.
      const token = ++generation;
      let py = 0;
      const slice = () => {
        if (token !== generation) return;   // superseded, or unmounted
        const until = performance.now() + SLICE_MS;
      for (; py < chh; py++) {
        const y = py * inv;                 // CSS-space coordinate
        const dy = y - cyp;
        const fy = y / LOW + 1, gy0 = fy | 0, ty = fy - gy0;
        const rowA = gy0 * gw, rowB = rowA + gw;
        for (let pxi = 0; pxi < cw; pxi++) {
          const x = pxi * inv;
          const fx = x / LOW + 1, gx0 = fx | 0, tx = fx - gx0;
          const iA = rowA + gx0, iB = rowB + gx0;
          const wa = (1 - tx) * (1 - ty), wb = tx * (1 - ty);
          const wc = (1 - tx) * ty, wd = tx * ty;

          const m = mot[iA] * wa + mot[iA + 1] * wb + mot[iB] * wc + mot[iB + 1] * wd;
          const cs = ckShade[iA] * wa + ckShade[iA + 1] * wb + ckShade[iB] * wc + ckShade[iB + 1] * wd;
          const ag = age[iA] * wa + age[iA + 1] * wb + age[iB] * wc + age[iB + 1] * wd;

          // Laid streaks run vertically in real paper. Stretching the noise
          // along y (rather than x) produced horizontal bands that read as
          // scan lines instead of fibre. A warped sine was tried here and
          // reverted: one Math.sin per pixel cost more than the whole tooth.
          const l = valueNoise(x * 1.5, y * 0.04) - 0.5;

          // Chain lines - the widely spaced mould wires a laid sheet is
          // couched on, where the pulp lies thinner and the paper is a shade
          // brighter. A triangle wave raised to the eighth, which narrows it
          // to a hairline, and warped by the mottle field so it never runs
          // dead straight. No trig: Math.sin here measured more expensive
          // than the entire tooth.
          const cph = x * 0.0104 + m * 0.9;
          const cfr = cph - Math.floor(cph);
          const ctri = cfr < 0.5 ? cfr + cfr : 2 - cfr - cfr;
          const c2 = ctri * ctri, c4 = c2 * c2;

          // Screen dots.
          //
          // A sheet that has been PRINTED carries the screen it was printed
          // with. Rotated 15° so it never lines up with the layout, and its
          // strength ridden by the mottle field so the ink lies unevenly -
          // which is both what old printing looks like and what stops a beat
          // establishing itself against the wordmark's own halftone.
          const rx = (x * SCR_C - y * SCR_S) * SCR_INV;
          const ry = (x * SCR_S + y * SCR_C) * SCR_INV;
          const sdx = rx - Math.floor(rx) - 0.5;
          const sdy = ry - Math.floor(ry) - 0.5;
          const sdd = sdx * sdx + sdy * sdy;
          let scr = 0;
          if (sdd < SCR_R2) {
            const ink = 0.5 + m * 1.7;
            if (ink > 0) scr = (1 - sdd / SCR_R2) * ink;
          }

          // Tooth, in two octaves - a coarse weave under a fine grain.
          //
          // Inlined deliberately, and measured. Value noise is a bilinear
          // patch, so its exact partials fall out of the four corner hashes
          // this already needs: differencing separate samples costs several
          // times the hashing for a blurrier answer, and even wrapping it in
          // a helper gave back most of the win. The fine octave's VALUE is
          // the pulp grain, so the second octave of relief arrives for the
          // price of the grain lookup it replaces.
          const cx2 = x * 0.42, cy2 = y * 0.42;
          const cxi = Math.floor(cx2), cyi = Math.floor(cy2);
          const cxf = cx2 - cxi, cyf = cy2 - cyi;
          const cu = cxf * cxf * (3 - 2 * cxf), cv = cyf * cyf * (3 - 2 * cyf);
          const cdu = 6 * cxf * (1 - cxf), cdv = 6 * cyf * (1 - cyf);
          const h00 = hash2(cxi, cyi), h10 = hash2(cxi + 1, cyi);
          const h01 = hash2(cxi, cyi + 1), h11 = hash2(cxi + 1, cyi + 1);
          const k1 = h10 - h00, k2 = h01 - h00, k3 = h00 - h10 - h01 + h11;
          const cgx = cdu * (k1 + k3 * cv), cgy = cdv * (k2 + k3 * cu);

          const qx = x * 1.15, qy = y * 1.15;
          const qxi = Math.floor(qx), qyi = Math.floor(qy);
          const qxf = qx - qxi, qyf = qy - qyi;
          const qu = qxf * qxf * (3 - 2 * qxf), qv = qyf * qyf * (3 - 2 * qyf);
          const qdu = 6 * qxf * (1 - qxf), qdv = 6 * qyf * (1 - qyf);
          const j00 = hash2(qxi + 811, qyi + 57), j10 = hash2(qxi + 812, qyi + 57);
          const j01 = hash2(qxi + 811, qyi + 58), j11 = hash2(qxi + 812, qyi + 58);
          const m1 = j10 - j00, m2 = j01 - j00, m3 = j00 - j10 - j01 + j11;
          const f = (j00 + m1 * qu + m2 * qv + m3 * qu * qv) - 0.5;
          const qgx = qdu * (m1 + m3 * qv), qgy = qdv * (m2 + m3 * qu);

          // Facing the light, in the same top-left key as the cockle.
          const litc = -(cgx + cgy);

          // How far the STOCK deviates from its base tone. Kept separate
          // from the vignette below, because the two are different physical
          // things and must not be tinted alike.
          let tex = m * V.mottle * 2
            + f * V.fibre * 2
            + l * V.laid * 2
            + c4 * c4 * V.chain
            - scr * V.screen
            + cs * V.cockle
            + litc * 0.35 * V.relief
            - (qgx + qgy) * 0.16 * V.relief;

          // Specular. Where the tooth tilts toward the light it does not just
          // get brighter in proportion - it glints, and that non-linearity is
          // most of what separates a surface from a gradient.
          if (litc > 0) {
            const sc = litc > 1 ? 1 : litc;
            tex += sc * sc * sc * V.spec;
          }

          // edge fall-off. r^4 from squared distance - no hypot, no pow, and
          // it keeps the middle of the sheet clean.
          const dx = x - cxp;
          const r2 = (dx * dx + dy * dy) / maxR2;
          const dev = tex - r2 * r2 * V.vig;

          let R = br * (1 + dev) + dev * liftR;
          let G = bg * (1 + dev) + dev * liftG;
          let B = bb * (1 + dev) + dev * liftB;
          // Where the pulp is denser the sheet takes on the colour of the
          // pulp, not just less light - scaling one hue up and down gives a
          // grey sheet, and real stock warms as it thickens. The vignette is
          // deliberately excluded: that is illumination falling off, which is
          // neutral, and tinting it turned the corners of the page brown.
          if (tex < 0) {
            const k = -tex * V.tint * 4;
            R += (ir - br) * k;
            G += (ig - bg) * k;
            B += (ib - bb) * k;
          }
          // Broad hue drift: some of the sheet has yellowed further than the
          // rest. Warm patches gain red and lose blue; cool ones the reverse.
          const av = ag * V.age;
          R += av * 22;
          G += av * 8;
          B -= av * 16;

          const o = (py * cw + pxi) * 4;
          px[o] = R; px[o + 1] = G; px[o + 2] = B; px[o + 3] = 255;
        }
        if (performance.now() > until) { py++; yieldTo(slice); return; }
      }
      finish();
      };

      const finish = () => {
      canvas.width = cw;
      canvas.height = chh;
      ctx.putImageData(img, 0, 0);

      // --- inclusions, drawn over the field in CSS coordinates -------------
      ctx.setTransform(S, 0, 0, S, 0, 0);

      // Individual fibres suspended in the stock. Short, curved, some lighter
      // than the ground and some darker - this is what separates thick
      // handmade paper from a smooth machine sheet.
      const nf = Math.round((w * h) / 11000 * V.fibres);
      ctx.lineCap = 'round';
      for (let i = 0; i < nf; i++) {
        const fx = hash2(i * 31 + 2, 17) * w;
        const fy = hash2(i * 17 + 5, 91) * h;
        const ang = hash2(i * 13 + 7, 53) * Math.PI * 2;
        const len = 5 + hash2(i * 7 + 11, 29) * 17;
        const bow = (hash2(i * 3 + 19, 23) - 0.5) * len * 0.5;
        const a = 0.014 + hash2(i * 29 + 6, 43) * 0.030;
        const light = hash2(i * 23 + 3, 61) > 0.52;
        ctx.strokeStyle = light ? `rgba(255,255,255,${a})` : `rgba(${ir},${ig},${ib},${a})`;
        ctx.lineWidth = 0.55 + hash2(i * 5 + 13, 37) * 0.6;
        const ex = fx + Math.cos(ang) * len, ey = fy + Math.sin(ang) * len;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.quadraticCurveTo(
          (fx + ex) / 2 - Math.sin(ang) * bow,
          (fy + ey) / 2 + Math.cos(ang) * bow,
          ex, ey
        );
        ctx.stroke();
      }

      // Specks - the impurities that never got screened out of the pulp.
      const ns = Math.round((w * h) / 30000 * V.specks);
      for (let i = 0; i < ns; i++) {
        const sx = hash2(i * 41 + 8, 71) * w;
        const sy = hash2(i * 19 + 12, 13) * h;
        const s = 0.7 + hash2(i * 11 + 4, 89) * 1.1;
        ctx.fillStyle = `rgba(${ir},${ig},${ib},${0.10 + hash2(i * 7 + 21, 59) * 0.22})`;
        ctx.fillRect(sx, sy, s, s * (0.7 + hash2(i * 3 + 2, 31) * 0.8));
      }

      // Foxing - the sparse blooms of aged paper, at very low alpha.
      const nfox = Math.round((w * h) / 26000 * V.foxing);
      for (let i = 0; i < nfox; i++) {
        const fx = hash2(i * 7 + 1, 13) * w;
        const fy = hash2(i * 11 + 3, 29) * h;
        const fr = 6 + hash2(i * 3 + 5, 47) * 26;
        const a = 0.012 + hash2(i * 13 + 9, 71) * 0.022;
        const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
        g.addColorStop(0, `rgba(${ir},${ig},${ib},${a})`);
        g.addColorStop(1, `rgba(${ir},${ig},${ib},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(fx, fy, fr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      };

      slice();
    };

    let qt = 0;
    const paint = () => { raf = 0; clearTimeout(qt); qt = 0; render(); };
    // requestAnimationFrame never fires in a tab that is not being rendered,
    // and this canvas has to exist whether or not anyone watched it appear -
    // a hidden tab that is resized and then looked at must not show a blank
    // sheet. Every deferred paint here carries a timer behind it.
    const queue = () => {
      if (raf || qt) return;
      raf = requestAnimationFrame(paint);
      qt = setTimeout(() => { cancelAnimationFrame(raf); raf = 0; paint(); }, 160);
    };

    const resize = () => {
      let nw, nh;
      if (scoped) {
        const host = canvas.parentElement;
        if (!host) return;
        const r = host.getBoundingClientRect();
        nw = Math.round(r.width); nh = Math.round(r.height);
      } else {
        nw = document.documentElement.clientWidth || innerWidth || 0;
        nh = document.documentElement.clientHeight || innerHeight || 0;
      }
      if (!nw || !nh || (nw === w && nh === h)) return;
      w = nw; h = nh;
      render();
    };

    // A scoped sheet is below the fold AND behind an opaque curtain at load.
    // Generating it there costs ~125ms of synchronous main-thread time inside
    // the window the loader is animating in, for a surface nobody can see.
    let first = () => {};
    let ready = !scoped;
    if (scoped) first = afterBoot(() => { ready = true; resize(); if (!w || !h) queue(); }, 700);
    else { resize(); if (!w || !h) queue(); }

    // Regenerating the sheet is a full-viewport per-pixel pass, and a window
    // drag fires ResizeObserver on every frame. Debounce, or the drag stalls.
    let rt = 0;
    // The observer reports once on observe(). Unguarded, that report built the
    // scoped sheet at mount and undid its deferral.
    const ro = new ResizeObserver(() => {
      if (!ready) return;
      clearTimeout(rt);
      rt = setTimeout(resize, 160);
    });
    ro.observe(scoped && canvas.parentElement ? canvas.parentElement : document.documentElement);
    const mo = new MutationObserver(render);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      ro.disconnect();
      mo.disconnect();
      clearTimeout(rt);
      clearTimeout(qt);
      first();
      generation++;          // abandons any sheet still being sliced
      chan.port1.close();
      cancelAnimationFrame(raf);
    };
  }, [scoped, prefix]);

  return <canvas className={scoped ? 'paper paper-in' : 'paper'} ref={ref} aria-hidden="true" />;
}
