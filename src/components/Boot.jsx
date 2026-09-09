import { useEffect, useState } from 'react';

/**
 * Boot curtain.
 *
 * The page is composed, not revealed: everything marked `.asm` is held at a
 * scattered offset until the curtain lifts, then assembles into place on a
 * document-order stagger. The wordmark's particle assemble is armed by the
 * same signal, so the two read as one movement rather than two.
 *
 * Two hard rules, both learned the hard way:
 *   - the curtain must lift on a TIMER, not on a frame. A backgrounded tab
 *     never fires rAF, and a curtain that never lifts is a blank site.
 *   - `data-boot` is written synchronously in main.jsx, so the hold is in
 *     place before first paint. If this component never mounts, the safety
 *     net in main.jsx still releases it.
 */
const HOLD = 620;   // curtain on screen
const FADE = 520;   // curtain fading out

export function bootDone() {
  const root = document.documentElement;
  if (root.getAttribute('data-boot') === 'done') return;
  root.setAttribute('data-boot', 'done');
  dispatchEvent(new Event('boot:done'));
}

export default function Boot() {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (root.getAttribute('data-boot') === 'done') { setGone(true); return; }

    const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
    if (reduce) { bootDone(); setGone(true); return; }

    // Fonts first — assembling the name in Georgia and re-flowing it into
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
      <div className="boot-mark">
        <span className="m">Varun N</span>
        <span className="boot-rule"><i /></span>
        <span className="m">Portfolio · 2026</span>
      </div>
    </div>
  );
}
