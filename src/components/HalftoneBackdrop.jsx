import { useEffect, useRef } from 'react';

const SPACING = 6;                         // screen ruling
const MAX_R = SPACING * 0.78;              // dot radius at full white
const SCREEN_ANGLE = (17 * Math.PI) / 180; // printers rotate the screen off-axis
const FLOOR = 0.05;

// SHARED ARTWORK MATH — kept identical between the component and the offline preview.
// Returns luminance 0..1 for a pixel. Subject: a wireframe globe, lit from the
// upper left, tilted on its axis, bleeding off the right edge.
function artworkLuma(x, y, w, h) {
  const R = Math.min(w, h) * 0.78;
  const cx = w * 0.70;
  const cy = h * 0.52;

  const dx = (x - cx) / R;
  const dy = (y - cy) / R;
  const d2 = dx * dx + dy * dy;
  if (d2 > 1) return 0;

  const nz = Math.sqrt(1 - d2);

  // key light, upper-left and slightly toward the viewer
  const lx = -0.46, ly = -0.56, lz = 0.69;
  const lambert = Math.max(0, dx * lx + dy * ly + nz * lz);
  let lum = 0.10 + 0.86 * Math.pow(lambert, 0.85);

  // limb light so the sphere separates from the ground
  const rim = Math.pow(1 - nz, 3.2);
  lum = Math.min(1, lum + rim * 0.42);

  // axial tilt, then read lat/long off the tilted normal
  const tilt = -0.41;
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  const ny2 = dy * ct - nz * st;
  const nz2 = dy * st + nz * ct;

  const lat = Math.asin(Math.max(-1, Math.min(1, ny2)));
  const lon = Math.atan2(dx, nz2);

  // graticule: distance to the nearest ruled line, in angle space
  const near = (v, n) => {
    const t = (v * n) / Math.PI;
    return Math.abs(t - Math.round(t));
  };
  if (near(lat, 9) < 0.05) lum *= 0.45;
  if (near(lon, 12) < 0.05) lum *= 0.45;

  return Math.max(0, Math.min(1, lum));
}

/**
 * Halftone backdrop for the contact slab.
 *
 * A real screening pipeline: artwork is rasterised into an offscreen buffer,
 * then that buffer's luminance is sampled through a rotated dot lattice, each
 * dot's radius set by the tone underneath it. Because the source is pixels,
 * `paintArtwork` can be replaced with `drawImage(photo, …)` and a real
 * photograph screens through exactly the same path.
 */
function paintArtwork(g, w, h) {
  const img = g.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = (artworkLuma(x, y, w, h) * 255) | 0;
      const o = (y * w + x) * 4;
      d[o] = v; d[o + 1] = v; d[o + 2] = v; d[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
}

export default function HalftoneBackdrop() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0, h = 0, dpr = 1;
    let ink = '#f2f2f4';

    const readInk = () => {
      const cs = getComputedStyle(document.documentElement);
      ink = cs.getPropertyValue('--inv-fg').trim() || ink;
    };

    const draw = () => {
      if (!w || !h) return;

      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const g = off.getContext('2d', { willReadFrequently: true });
      if (!g) return;
      paintArtwork(g, w, h);
      const px = g.getImageData(0, 0, w, h).data;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = ink;
      ctx.beginPath();

      const cos = Math.cos(SCREEN_ANGLE);
      const sin = Math.sin(SCREEN_ANGLE);
      const diag = Math.hypot(w, h);
      const hw = w / 2, hh = h / 2;

      for (let u = -diag; u <= diag; u += SPACING) {
        for (let v = -diag; v <= diag; v += SPACING) {
          const x = u * cos - v * sin + hw;
          const y = u * sin + v * cos + hh;
          if (x < 0 || y < 0 || x >= w || y >= h) continue;
          const o = ((y | 0) * w + (x | 0)) * 4;
          const lum = (px[o] * 0.2126 + px[o + 1] * 0.7152 + px[o + 2] * 0.0722) / 255;
          if (lum < FLOOR) continue;
          const r = lum * MAX_R;
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, Math.PI * 2);
        }
      }
      ctx.fill();
    };

    const resize = () => {
      const host = canvas.parentElement;
      if (!host) return;
      const rect = host.getBoundingClientRect();
      const nw = Math.round(rect.width);
      const nh = Math.round(rect.height);
      if (!nw || !nh || (nw === w && nh === h)) return;
      w = nw; h = nh;
      dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    readInk();
    resize();

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    const mo = new MutationObserver(() => { readInk(); draw(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => { ro.disconnect(); mo.disconnect(); };
  }, []);

  return <canvas className="halftone-bg" ref={ref} aria-hidden="true" />;
}
