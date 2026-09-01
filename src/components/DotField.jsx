import { useEffect, useRef } from 'react';

const SPACING = 30;      // sparser than the old 24px — the field is ground, not pattern
const BASE_R = 1.05;
const CURSOR_R = 190;    // pointer influence radius
const TAIL = 14;         // dots lit behind a trace head
const MAX_PULSES = 3;
const SPAWN_MS = 2200;

/**
 * The dot field, drawn on one canvas instead of a CSS background, so the dots
 * can respond to things:
 *   - a pointer halo that brightens and swells nearby dots
 *   - "auth trace" pulses that route across the lattice like a payment moving
 *     through the system, leaving a decaying tail
 *
 * The base lattice is painted synchronously on mount, so the field still looks
 * correct if animation never runs (reduced motion, backgrounded tab).
 */
export default function DotField() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduce = matchMedia('(prefers-reduced-motion:reduce)');
    const fine = matchMedia('(pointer:fine)');

    let w = 0, h = 0, cols = 0, rows = 0, dpr = 1;
    let dotColor = 'rgba(36,31,25,.13)';
    let accent = '#a8492a';
    let pointer = { x: -9999, y: -9999, active: false };
    let pulses = [];
    let raf = 0, lastSpawn = 0, scrollShift = 0;

    const readColors = () => {
      const cs = getComputedStyle(document.documentElement);
      dotColor = cs.getPropertyValue('--dot').trim() || dotColor;
      accent = cs.getPropertyValue('--accent').trim() || accent;
    };

    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      // documentElement is the reliable source; innerWidth reads 0 while the
      // viewport is collapsed (hidden tab, zero-sized pane).
      w = document.documentElement.clientWidth || innerWidth || 0;
      h = document.documentElement.clientHeight || innerHeight || 0;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / SPACING) + 2;
      rows = Math.ceil(h / SPACING) + 2;
    };

    // A route walks left→right one column at a time, stepping a row now and
    // then — it reads like a packet being switched rather than a straight line.
    const makeRoute = () => {
      let row = 1 + Math.floor(Math.random() * Math.max(rows - 2, 1));
      const pts = [];
      for (let c = 0; c < cols; c++) {
        if (c > 0 && Math.random() < 0.16) row += Math.random() < 0.5 ? -1 : 1;
        row = Math.max(0, Math.min(rows - 1, row));
        pts.push([c, row]);
      }
      return pts;
    };

    const spawn = () => {
      if (pulses.length >= MAX_PULSES) return;
      pulses.push({ route: makeRoute(), head: 0, speed: 0.42 + Math.random() * 0.34 });
    };

    const drawBase = () => {
      if (!w || !h) return; // nothing to paint into yet
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = dotColor;
      const off = scrollShift % SPACING;
      ctx.beginPath();
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const x = c * SPACING;
          const y = r * SPACING - off;
          ctx.moveTo(x + BASE_R, y);
          ctx.arc(x, y, BASE_R, 0, Math.PI * 2);
        }
      }
      ctx.fill();
    };

    // Energised dots are drawn over the base lattice.
    const drawLive = () => {
      const off = scrollShift % SPACING;

      if (pointer.active) {
        const c0 = Math.max(0, Math.floor((pointer.x - CURSOR_R) / SPACING));
        const c1 = Math.min(cols - 1, Math.ceil((pointer.x + CURSOR_R) / SPACING));
        const r0 = Math.max(0, Math.floor((pointer.y + off - CURSOR_R) / SPACING));
        const r1 = Math.min(rows - 1, Math.ceil((pointer.y + off + CURSOR_R) / SPACING));
        for (let c = c0; c <= c1; c++) {
          for (let r = r0; r <= r1; r++) {
            const x = c * SPACING;
            const y = r * SPACING - off;
            const dx = x - pointer.x, dy = y - pointer.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > CURSOR_R) continue;
            const k = 1 - d / CURSOR_R;
            const e = k * k;
            ctx.globalAlpha = e * 0.55;
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.arc(x, y, BASE_R + e * 1.7, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      for (const p of pulses) {
        const headIdx = Math.floor(p.head);
        for (let i = 0; i < TAIL; i++) {
          const idx = headIdx - i;
          if (idx < 0 || idx >= p.route.length) continue;
          const [c, r] = p.route[idx];
          const k = 1 - i / TAIL;
          const e = k * k;
          const x = c * SPACING;
          const y = r * SPACING - off;
          ctx.globalAlpha = e * 0.7;
          ctx.fillStyle = accent;
          ctx.beginPath();
          ctx.arc(x, y, BASE_R + e * 2.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };

    const frame = (ts) => {
      raf = 0;
      if (document.visibilityState !== 'visible') return;

      if (ts - lastSpawn > SPAWN_MS) {
        lastSpawn = ts;
        spawn();
      }
      for (const p of pulses) p.head += p.speed;
      pulses = pulses.filter((p) => p.head - TAIL < p.route.length);

      drawBase();
      drawLive();
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (raf || reduce.matches) return;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const onResize = () => {
      resize();
      drawBase();
    };
    const onScroll = () => {
      scrollShift = document.documentElement.scrollTop * 0.06;
      if (reduce.matches) drawBase();
    };
    const onPointer = (e) => {
      pointer = { x: e.clientX, y: e.clientY, active: true };
    };
    const onLeave = () => {
      pointer.active = false;
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') { onResize(); start(); }
      else stop();
    };
    const onTheme = () => {
      readColors();
      drawBase();
    };

    readColors();
    resize();
    drawBase(); // paint synchronously so the field is correct without animation

    // A canvas that mounts at zero size (collapsed pane, display:none ancestor)
    // must re-fit itself once it actually gets a box — resize events alone
    // don't reliably cover that.
    const ro = new ResizeObserver(() => {
      const cw = document.documentElement.clientWidth;
      const ch = document.documentElement.clientHeight;
      if (cw !== w || ch !== h) onResize();
    });
    ro.observe(document.documentElement);

    addEventListener('resize', onResize);
    addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisible);
    if (fine.matches) {
      addEventListener('pointermove', onPointer, { passive: true });
      document.addEventListener('pointerleave', onLeave);
    }
    const mo = new MutationObserver(onTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    start();

    return () => {
      stop();
      removeEventListener('resize', onResize);
      removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisible);
      removeEventListener('pointermove', onPointer);
      document.removeEventListener('pointerleave', onLeave);
      mo.disconnect();
      ro.disconnect();
    };
  }, []);

  return <canvas className="dotfield" ref={ref} aria-hidden="true" />;
}
