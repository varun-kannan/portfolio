import { useEffect, useRef } from 'react';
import DotField from './DotField';
import { useMotionAllowed, useMagnetic } from '../hooks/useMotion';
import { SECTIONS } from '../data/content';

/** Fixed multi-plane paper texture. Each plane parallaxes at its own rate. */
export function Texture() {
  return (
    <div className="tex" aria-hidden="true">
      <div className="par" data-par="10" data-pn="-0.8"><div className="tex-glow" /></div>
      <DotField />
      <div className="tex-cols">
        {Array.from({ length: 6 }, (_, i) => <span key={i} />)}
      </div>
      <div className="par" data-par="16" data-pn="0.6"><div className="tex-fibre" /></div>
      <div className="par" data-par="8" data-pn="-0.4"><div className="tex-grid" /></div>
      <div className="tex-hatch" />
      <div className="tex-vig" />
      <div className="tex-grain" />
    </div>
  );
}

/** Texture for the always-dark contact slab. */
export function TextureInverted() {
  return (
    <div className="tex-in" aria-hidden="true">
      <div className="tex-glow" />
      <div className="tex-fibre" />
      <div className="tex-dots" />
      <div className="tex-cols">
        {Array.from({ length: 6 }, (_, i) => <span key={i} />)}
      </div>
      <div className="tex-hatch" />
      <div className="tex-grain" />
    </div>
  );
}

export function CursorGlow() {
  const ref = useRef(null);
  const allowed = useMotionAllowed();
  useEffect(() => {
    const el = ref.current;
    if (!el || !allowed) return;
    let raf = 0, x = 0, y = 0;
    const paint = () => { raf = 0; el.style.transform = `translate3d(${x}px,${y}px,0)`; };
    const move = (e) => {
      x = e.clientX; y = e.clientY;
      el.style.opacity = '1';
      if (!raf) raf = requestAnimationFrame(paint);
    };
    addEventListener('pointermove', move, { passive: true });
    return () => { removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, [allowed]);
  return <div className="glow" ref={ref} aria-hidden="true" />;
}

export function Nav({ theme, onToggle, active }) {
  const btnRef = useMagnetic({ strength: 8 });
  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--bg)', borderBottom: '1px solid var(--fg)' }}>
      <div className="wrap" style={{ paddingTop: 14, paddingBottom: 14, display: 'flex', alignItems: 'center', gap: 34, flexWrap: 'wrap', rowGap: 12 }}>
        <a href="#top" style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.02em' }}>VN</a>
        <div className="navlinks m" style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {SECTIONS.map(([id, label]) => (
            <a key={id} className="navlink" href={`#${id}`} data-on={active === id ? '1' : undefined}>
              {label}
            </a>
          ))}
        </div>
        <div className="navmeta m" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 22, color: 'var(--muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="dot" />Open to work</span>
          <span>Chennai, India · UTC+5:30</span>
        </div>
        <div className="navright" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          ref={btnRef}
          className="themebtn m"
          type="button"
          onClick={onToggle}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          <span className="dot" />
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
        </div>
      </div>
    </nav>
  );
}

export function SectionHead({ index, title, em, aside }) {
  return (
    <div className="rv dev" style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 34, flexWrap: 'wrap' }}>
      <span className="m" style={{ color: 'var(--muted)', minWidth: 170 }}>{index}</span>
      <h2 style={{ fontSize: 'clamp(30px,4.2vw,62px)' }}>
        {title} <em style={{ fontStyle: 'italic', fontWeight: 400 }}>{em}</em>.
      </h2>
      {aside && <span className="m" style={{ marginLeft: 'auto', color: 'var(--muted)' }}>{aside}</span>}
    </div>
  );
}

export function Tags({ items }) {
  return (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 16 }}>
      {items.map((t) => <span key={t} className="m tag">{t}</span>)}
    </div>
  );
}
