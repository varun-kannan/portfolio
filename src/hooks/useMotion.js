import { useEffect, useRef, useState } from 'react';

const q = (m) => (typeof matchMedia === 'function' ? matchMedia(m) : { matches: false, addEventListener() {}, removeEventListener() {} });

/** Motion is opt-out: reduced-motion users and coarse pointers get the static layout. */
export function useMotionAllowed() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const reduce = q('(prefers-reduced-motion:reduce)');
    const fine = q('(pointer:fine)');
    const sync = () => setOk(!reduce.matches && fine.matches);
    sync();
    reduce.addEventListener?.('change', sync);
    fine.addEventListener?.('change', sync);
    return () => {
      reduce.removeEventListener?.('change', sync);
      fine.removeEventListener?.('change', sync);
    };
  }, []);
  return ok;
}

/**
 * The assemble.
 *
 * One motion for the whole portfolio. Every block marked `.asm` is held
 * scattered — dropped, scaled back and defocused — and composes into place
 * when it is released. The first screen is released by the boot curtain;
 * everything below it is released as it scrolls into view.
 *
 * Blocks RE-ARM. A block that has left the viewport is put back into its
 * held state, so it assembles again the next time it is scrolled past, in
 * either direction. That needs two observers, not one: resetting on the same
 * boundary that triggers the entrance would make blocks flicker in and out
 * at the edge of the screen. The entrance fires just inside the viewport,
 * and the reset only once a block is more than half a screen clear of it —
 * far enough that the reset itself is never visible.
 *
 * Nothing may compose while the curtain is still up: an entrance played
 * behind an opaque panel is an entrance nobody sees, which is exactly how
 * the wordmark's assemble went missing.
 *
 * Timers back the whole thing up. Held content that is never released is an
 * invisible site, which is a far worse failure than a missed animation.
 */
export function useReveal() {
  useEffect(() => {
    const els = [...document.querySelectorAll('.asm')];
    const showAll = () => els.forEach((el) => el.classList.add('in'));

    if (q('(prefers-reduced-motion:reduce)').matches || !('IntersectionObserver' in window)) {
      showAll();
      return;
    }

    // Blocks whose beat the markup states explicitly — the hero cascade —
    // keep it. Everything else is given one on arrival.
    const fixed = new Set(els.filter((el) => el.style.getPropertyValue('--d')));

    /**
     * The bottom of the document is a dead zone for the entry observer.
     *
     * Entry fires against a root whose bottom is pulled in by 8%, so a block
     * only assembles once it is properly in view rather than at the instant
     * it clips the edge. But the last row on the page LIVES in that 8% strip
     * — there is no scrolling left to carry it any higher, so it can never
     * satisfy the test. It was not merely failing to animate: it was staying
     * held, at opacity 0, permanently invisible.
     *
     * So: on reaching the end of the document, release anything still held
     * that is actually on screen. Hung off several independent triggers on
     * purpose — scroll, either observer, resize, and once at start — because
     * content must never be invisible for want of one event arriving.
     */
    const atEnd = () => {
      const doc = document.documentElement;
      if (scrollY + innerHeight < doc.scrollHeight - 4) return;
      const vh = innerHeight;
      els.forEach((el) => {
        if (el.classList.contains('in')) return;
        const r = el.getBoundingClientRect();
        if (r.top < vh && r.bottom > 0) el.classList.add('in');
      });
    };

    // Whether the observer has ever produced a hit. The blanket fallback
    // below must fire only when the observer is BROKEN — an unconditional
    // "show everything after N seconds" releases the whole page while the
    // reader is still on the hero.
    let fired = false;

    const ioIn = new IntersectionObserver(
      (entries) => {
        // Stagger by position WITHIN THE BATCH that just arrived, not by
        // document order: a group of five cards entering together should
        // cascade, while a lone row further down should not sit waiting out
        // a delay it inherited from its index on the page.
        let k = 0;
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const el = en.target;
          if (fixed.has(el)) {
            // The hero's long opening cascade is tuned to follow the
            // wordmark assembling, and is a one-time thing. Re-entering it
            // on a scroll back up with an 800ms delay would just look
            // broken, so after the first pass it re-arms like everything
            // else, on the ordinary group stagger.
            fixed.delete(el);
          } else {
            el.style.setProperty('--d', `${Math.min(k, 7) * 75}ms`);
          }
          k += 1;
          fired = true;
          el.classList.add('in');
        });
        atEnd();
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );

    const ioOut = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) en.target.classList.remove('in');
        });
        atEnd();
      },
      { rootMargin: '60% 0px 60% 0px', threshold: 0 }
    );

    let started = false, t2 = 0;
    const start = () => {
      if (started) return;
      started = true;
      els.forEach((el) => { ioIn.observe(el); ioOut.observe(el); });
      atEnd();
      // Measured from here, not from mount: the observer only has work to do
      // once it is observing, and hanging the fallback off the page load
      // meant several extra seconds of held content on a slow font load.
      t2 = setTimeout(() => { if (!fired) showAll(); }, 1500);
    };
    if (document.documentElement.getAttribute('data-boot') === 'done') start();
    else addEventListener('boot:done', start);


    addEventListener('scroll', atEnd, { passive: true });
    addEventListener('resize', atEnd);

    // release even if the curtain signal never lands
    const t1 = setTimeout(start, 3600);

    return () => {
      ioIn.disconnect();
      ioOut.disconnect();
      removeEventListener('scroll', atEnd);
      removeEventListener('resize', atEnd);
      removeEventListener('boot:done', start);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
}

/**
 * Pointer-driven 3D tilt. `depth` scales the rotation; `lift` is the z-translation
 * on hover. Children marked [data-layer] are pushed to their own z-plane so the
 * card parallaxes internally rather than tilting as one flat plate.
 */
export function useTilt({ depth = 1, lift = 26 } = {}) {
  const ref = useRef(null);
  const allowed = useMotionAllowed();
  useEffect(() => {
    const el = ref.current;
    if (!el || !allowed) return;
    let raf = 0;
    let target = { x: 0, y: 0, on: false };

    const layers = [...el.querySelectorAll('[data-layer]')];
    const paint = () => {
      raf = 0;
      const { x, y, on } = target;
      // Where the light lands. A tilting rectangle reads as a rectangle
      // rotating; a tilting rectangle with a highlight that slides across it
      // reads as a solid catching the light — same transform, different
      // object. The sheen is the paper's specular term, applied to a card.
      el.style.setProperty('--sx', `${((x + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty('--sy', `${((y + 0.5) * 100).toFixed(1)}%`);
      el.style.transform = on
        ? `translateY(-5px) translateZ(${lift}px) rotateY(${(x * 7 * depth).toFixed(2)}deg) rotateX(${(-y * 5.5 * depth).toFixed(2)}deg)`
        : '';
      layers.forEach((l) => {
        const d = parseFloat(l.dataset.layer) || 0;
        l.style.transform = on ? `translate3d(${(-x * d * 5).toFixed(1)}px,${(-y * d * 4).toFixed(1)}px,${d * 16}px)` : '';
      });
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const move = (e) => {
      const r = el.getBoundingClientRect();
      target = { x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5, on: true };
      queue();
    };
    const leave = () => {
      target = { x: 0, y: 0, on: false };
      queue();
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      cancelAnimationFrame(raf);
    };
  }, [allowed, depth, lift]);
  return ref;
}

/** Magnetic button: the element leans toward the cursor in 3D and pulls back on exit. */
export function useMagnetic({ strength = 12 } = {}) {
  const ref = useRef(null);
  const allowed = useMotionAllowed();
  useEffect(() => {
    const el = ref.current;
    if (!el || !allowed) return;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(700px) translate3d(${(x * strength).toFixed(1)}px,${(y * strength * 0.6).toFixed(1)}px,20px) rotateX(${(-y * 10).toFixed(1)}deg) rotateY(${(x * 12).toFixed(1)}deg)`;
    };
    const leave = () => {
      el.style.transform = '';
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [allowed, strength]);
  return ref;
}
