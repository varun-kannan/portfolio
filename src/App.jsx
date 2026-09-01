import { useCallback, useEffect, useState } from 'react';
import { applyTheme } from './theme';
import { useReveal } from './hooks/useMotion';
import { useScene, useScrollSpy } from './hooks/useScene';
import { Texture, CursorGlow, Nav } from './components/Chrome';
import { Hero, Marquee, Work, Experience, Capabilities, Independent, Approach, Contact } from './components/Sections';
import { SECTIONS } from './data/content';

const STORE_KEY = 'v21-theme';
const IDS = SECTIONS.map(([id]) => id);

function initialTheme() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* storage blocked — fall through to the media query */ }
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [theme, setTheme] = useState(initialTheme);
  const [active, setActive] = useState('work');

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(STORE_KEY, theme); } catch { /* non-fatal */ }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);

  useReveal();
  useScene();
  useScrollSpy(IDS, setActive);

  return (
    <>
      <div id="scrollprog" aria-hidden="true" />
      <Texture />
      <CursorGlow />
      <Nav theme={theme} onToggle={toggle} active={active} />
      <Hero />
      <Marquee />
      <Work />
      <Experience />
      <Capabilities />
      <Independent />
      <Approach />
      <Contact />
    </>
  );
}
