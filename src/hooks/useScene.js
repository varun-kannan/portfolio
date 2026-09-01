import { useEffect } from 'react';
import { useMotionAllowed } from './useMotion';

/**
 * One rAF loop drives every scroll/pointer-derived 3D transform on the page.
 * Elements opt in by class; each reads its own data-* coefficients, so adding a
 * new parallax layer never means adding another listener.
 *
 *   .par        data-par (pointer px) / data-pn (scroll factor)  — background planes
 *   .ghost      oversized display type, drifts opposite the scroll
 *   .tilt-scroll  rotateX driven by distance from viewport centre
 *   .z-drift    pushed along z as it crosses the viewport
 *   .par-y      foreground content drifting against the scroll (data-py = px)
 */
export function useScene() {
  const allowed = useMotionAllowed();

  // Scroll-linked transforms run for everyone except reduced-motion users,
  // since they need no pointer. Pointer-linked ones need a fine pointer.
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
    if (reduce) return;

    const pars = [...document.querySelectorAll('.par')];
    const ghosts = [...document.querySelectorAll('.ghost')];
    const tilts = [...document.querySelectorAll('.tilt-scroll')];
    const drifts = [...document.querySelectorAll('.z-drift')];
    const pys = [...document.querySelectorAll('.par-y')];
    const prog = document.getElementById('scrollprog');

    let mx = 0, my = 0, raf = 0;

    const paint = () => {
      raf = 0;
      const vh = innerHeight || 1;
      const root = document.documentElement;
      const sy = root.scrollTop;

      if (prog) {
        const p = sy / (root.scrollHeight - root.clientHeight || 1);
        prog.style.transform = `scaleX(${p})`;
      }

      pars.forEach((p) => {
        const s = parseFloat(p.dataset.par) || 0;
        const n = parseFloat(p.dataset.pn) || 0;
        p.style.transform = `translate3d(${(mx * s * 0.5).toFixed(1)}px,${(my * s * 0.4 + sy * n * -0.04).toFixed(1)}px,0)`;
      });

      ghosts.forEach((g, i) => {
        const r = g.getBoundingClientRect();
        const p = (r.top + r.height / 2 - vh / 2) / vh;
        g.style.transform =
          `translate3d(${(p * (i % 2 ? -34 : 34) + mx * 20).toFixed(1)}px,${(p * -40).toFixed(1)}px,0)` +
          ` rotateY(${(mx * 5).toFixed(2)}deg) scale(${(1 + Math.abs(p) * 0.03).toFixed(3)})`;
      });

      tilts.forEach((t) => {
        const r = t.getBoundingClientRect();
        // -1 below the fold, 0 at centre, 1 above
        const p = Math.max(-1, Math.min(1, (vh / 2 - (r.top + r.height / 2)) / vh));
        const amt = parseFloat(t.dataset.tilt) || 6;
        t.style.transform = `rotateX(${(-p * amt).toFixed(2)}deg) translateZ(${(Math.abs(p) * -20).toFixed(1)}px)`;
      });

      // Foreground parallax. These are wrappers with no other transform, so
      // they can't fight the .rv reveal or the pointer tilt on their children.
      pys.forEach((el) => {
        const r = el.getBoundingClientRect();
        const p = Math.max(-1.4, Math.min(1.4, (r.top + r.height / 2 - vh / 2) / vh));
        const amt = parseFloat(el.dataset.py) || 22;
        el.style.transform = `translate3d(0,${(-p * amt).toFixed(1)}px,0)`;
      });

      drifts.forEach((d) => {
        const r = d.getBoundingClientRect();
        const p = Math.max(-1, Math.min(1, (vh / 2 - (r.top + r.height / 2)) / vh));
        const amt = parseFloat(d.dataset.drift) || 34;
        d.style.transform = `translateZ(${(-Math.abs(p) * amt).toFixed(1)}px) rotateX(${(-p * 2.5).toFixed(2)}deg)`;
      });
    };

    const queue = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onPointer = (e) => {
      mx = e.clientX / innerWidth - 0.5;
      my = e.clientY / innerHeight - 0.5;
      queue();
    };

    // A frame scheduled while the tab is backgrounded never runs, which would
    // latch the `if (!raf)` throttle shut. Clear it and repaint on the way back.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      raf = 0;
      paint();
    };

    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    document.addEventListener('visibilitychange', onVisible);
    if (allowed) addEventListener('pointermove', onPointer, { passive: true });
    queue();

    return () => {
      removeEventListener('scroll', queue);
      removeEventListener('resize', queue);
      document.removeEventListener('visibilitychange', onVisible);
      removeEventListener('pointermove', onPointer);
      cancelAnimationFrame(raf);
    };
  }, [allowed]);
}

/** Section-aware nav highlighting. */
export function useScrollSpy(ids, setActive) {
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) setActive(en.target.id);
        }),
      { rootMargin: '-45% 0px -45% 0px' }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [ids, setActive]);
}
