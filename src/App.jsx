import { useCallback, useEffect, useState } from 'react';
import { applyTheme } from './theme';
import { useReveal } from './hooks/useMotion';
import { useScene, useScrollSpy } from './hooks/useScene';
import Boot from './components/Boot';
import { Texture, Sheen, Nav } from './components/Chrome';
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

  const onTheme = useCallback((t) => setTheme(t), []);

  useReveal();
  useScene();
  useScrollSpy(IDS, setActive);

  return (
    <>
      <Boot />
      <div id="scrollprog" aria-hidden="true" />
      <Texture />
      <Sheen />
      <Nav theme={theme} onTheme={onTheme} active={active} />
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
