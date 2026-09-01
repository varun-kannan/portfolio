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

/** Scroll-reveal. Falls back to visible if the observer never fires. */
export function useReveal() {
  useEffect(() => {
    const els = [...document.querySelectorAll('.rv')];
    const showAll = () => els.forEach((el) => el.classList.add('in'));
    if (q('(prefers-reduced-motion:reduce)').matches || !('IntersectionObserver' in window)) {
      showAll();
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('in');
            io.unobserve(en.target);
          }
        }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }
    );
    els.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i, 4) * 60}ms`;
      io.observe(el);
    });
    // visibility must never depend on the observer firing
    const t1 = setTimeout(() => {
      if (!els.some((el) => el.classList.contains('in'))) showAll();
    }, 320);
    const t2 = setTimeout(showAll, 2600);
    return () => {
      io.disconnect();
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
