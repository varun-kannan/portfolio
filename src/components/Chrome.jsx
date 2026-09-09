import { useEffect, useRef } from 'react';
import PaperSurface from './PaperSurface';
import { useMotionAllowed } from '../hooks/useMotion';
import { SECTIONS } from '../data/content';

/**
 * The ground.
 *
 * There is no lattice here any more. A dot grid is geometry, and the eye keeps
 * re-reading geometry as information — it competed with the type, and its
 * pointer halo read as a separate effect sitting on top of the page rather
 * than as the surface the page is printed on. What is left is a generated
 * sheet, a grain pass, and an edge fall-off: all organic, none of it
 * repeating, so it stops being looked at and starts being stood on.
 */
export function Texture() {
  return (
    <>
      <PaperSurface />
      <div className="tex" aria-hidden="true">
        <div className="tex-grain" />
        <div className="tex-vig" />
      </div>
      {/* The margin frame: two dashed verticals standing exactly on the
          content column's edges, so the page reads as printed inside a
          measured area rather than floating on it. */}
      <div className="frame" aria-hidden="true"><div><span /><span /></div></div>
    </>
  );
}

/** Texture for the always-dark contact slab. */
export function TextureInverted() {
  return (
    <div className="tex-in" aria-hidden="true">
      <div className="tex-glow" />
      <div className="tex-fibre" />
      <div className="tex-dots" />
      <div className="tex-hatch" />
      <div className="tex-grain" />
    </div>
  );
}

/**
 * A soft light travelling over the sheet with the pointer.
 *
 * Not a coloured halo — white, blended soft-light — so it reads as a lamp
 * above paper rather than as a glow drawn on the page. It lifts the grain it
 * passes over and leaves the type untouched.
 */
export function Sheen() {
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
  return <div className="sheen" ref={ref} aria-hidden="true" />;
}

/**
 * Availability light. A steady core with two expanding rings on a long,
 * offset cycle — the cadence of a status LED rather than a blink. It is
 * green in both schemes and deliberately NOT the accent: "available" has to
 * read the same whichever accent is selected.
 */
export function Beacon({ children = 'Open to work', inverted }) {
  return (
    <span className={`avail${inverted ? ' avail-inv' : ''}`}>
      <span className="beacon" aria-hidden="true"><i /></span>
      {children}
    </span>
  );
}

function ModeSwitch({ theme, onTheme }) {
  return (
    <div className="modesw" role="radiogroup" aria-label="Colour scheme">
      {/* the thumb is the moving part; the labels never move */}
      <span className="modesw-thumb" data-at={theme} aria-hidden="true" />
      {['light', 'dark'].map((k) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={theme === k}
          aria-label={`${k === 'dark' ? 'Dark' : 'Light'} theme`}
          className="m modesw-opt"
          data-on={theme === k ? '1' : undefined}
          onClick={() => onTheme(k)}
        >
          <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true" focusable="false">
            {k === 'light' ? (
              <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
                <circle cx="6" cy="6" r="2.4" />
                <path d="M6 .8v1.3M6 9.9v1.3M11.2 6H9.9M2.1 6H.8M9.7 2.3l-.9.9M3.2 8.8l-.9.9M9.7 9.7l-.9-.9M3.2 3.2l-.9-.9" />
              </g>
            ) : (
              <path fill="currentColor" d="M10.4 7.6A4.8 4.8 0 0 1 4.4 1.6a4.9 4.9 0 1 0 6 6Z" />
            )}
          </svg>
          <span>{k === 'dark' ? 'Dark' : 'Light'}</span>
        </button>
      ))}
    </div>
  );
}

export function Nav({ theme, onTheme, active }) {
  return (
    <nav className="topnav">
      <div className="wrap topnav-in">
        <a href="#top" className="asm" style={{ '--d': '0ms', fontSize: 17, fontWeight: 700, letterSpacing: '-.02em' }}>VN</a>

        <div className="navlinks m asm" style={{ '--d': '60ms' }}>
          {SECTIONS.map(([id, label]) => (
            <a key={id} className="navlink" href={`#${id}`} data-on={active === id ? '1' : undefined}>
              {label}
            </a>
          ))}
        </div>

        <div className="navright asm" style={{ '--d': '120ms' }}>
          <Beacon />
          <span className="m navplace">Chennai · UTC+5:30</span>
          <ModeSwitch theme={theme} onTheme={onTheme} />
        </div>
      </div>
    </nav>
  );
}

export function SectionHead({ index, title, em, aside }) {
  return (
    <div className="asm" style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 34, flexWrap: 'wrap' }}>
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
