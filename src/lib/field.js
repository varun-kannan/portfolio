/**
 * The coherent scatter field shared by every mark that assembles.
 *
 * One copy, deliberately. The hash below was written three times in this
 * project and carried the same defect in each: with plain `*` the
 * intermediate products overflow into float, lose their low bits, and the
 * following coercion to int32 clips the top bit - the result only ever
 * covers [0, 0.5] with a mean of 0.25 instead of [0, 1] with a mean of 0.5.
 * Fixing it twice was enough.
 */
export function nhash(x, y) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

export function smoothNoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return nhash(xi, yi) * (1 - u) * (1 - v) + nhash(xi + 1, yi) * u * (1 - v)
       + nhash(xi, yi + 1) * (1 - u) * v + nhash(xi + 1, yi + 1) * u * v;
}

/**
 * Where a dot at (x, y) starts from before it assembles.
 *
 * Neighbours read the same smooth field, so they leave in similar
 * directions and the mark breaks into drifting clusters. Math.random() here
 * would average out to uniform fuzz - every dot its own direction is the
 * same as no direction at all.
 */
export function scatter(x, y, near = 70, spread = 200) {
  const ang = smoothNoise(x * 0.018, y * 0.018) * Math.PI * 4;
  const mag = near + smoothNoise(x * 0.009 + 40, y * 0.009 + 40) * spread;
  return [Math.cos(ang) * mag, Math.sin(ang) * mag * 0.72];
}

/** Ease-out cubic: fast departure, long settle. */
export const easeOut = (p) => 1 - (1 - p) * (1 - p) * (1 - p);

/**
 * Run heavy one-time work after the boot curtain has lifted.
 *
 * The generated sheets and the screened globe each cost on the order of a
 * hundred milliseconds of synchronous main-thread time. Running them at mount
 * puts all of that inside the window the loader is animating in, and the
 * loader loses a third of its frames to work the viewer cannot even see yet,
 * because it is all below the fold behind an opaque curtain.
 *
 * `delay` staggers the callers so they do not simply collide with each other
 * the instant the curtain goes. Returns a cancel function.
 */
export function afterBoot(fn, delay = 0) {
  let t = 0;
  const run = () => { t = setTimeout(fn, delay); };
  if (document.documentElement.getAttribute('data-boot') === 'done') {
    run();
    return () => clearTimeout(t);
  }
  const on = () => { removeEventListener('boot:done', on); clearTimeout(t); run(); };
  addEventListener('boot:done', on);
  // never let visible content wait on a signal that might not arrive
  t = setTimeout(() => { removeEventListener('boot:done', on); fn(); }, 4000);
  return () => { removeEventListener('boot:done', on); clearTimeout(t); };
}
