# Portfolio

Personal site for Varun N — software engineer, payments infrastructure.

Built with React and Vite. No UI framework; the visual system is a small set of
CSS custom properties plus a few canvas components.

## Running it

```bash
npm install
npm run dev      # http://localhost:5000
npm run build    # → dist/
npm run preview  # serve the production build
```

## How it's put together

```
src/
  theme.js              palette tokens for both schemes, applied to :root at runtime
  styles.css            layout, type scale, texture and motion primitives
  data/content.js       all copy and case-study data, kept out of the components
  hooks/                motion primitives (reveal, 3D tilt, magnetic, scene loop)
  components/
    PaperSurface.jsx    generated paper ground — mottle, fibre, laid lines, foxing
    NameMark.jsx        the wordmark, halftone-screened and pointer reactive
    HalftoneBackdrop.jsx  screened artwork behind the contact slab
    SignatureMark.jsx   dotted signature that draws itself
    DotField.jsx        animated dot lattice with auth-trace pulses
    Chrome.jsx          nav, texture stack, shared section furniture
    Sections.jsx        the page itself
```

### Theming

`applyTheme(name)` writes every palette token onto `:root` as a custom property,
so a scheme change is one pass of `setProperty` and no component re-renders for
colour. Canvas components watch `data-theme` with a `MutationObserver` and repaint
themselves, since they can't inherit CSS variables.

The page ground lives on `html`, not `body` — `.tex` sits at `z-index: -3/-2`, and
negative-z descendants paint *before* block-level backgrounds, so a background on
`body` would cover the whole texture stack.

### Canvas work

Three components screen artwork into dot lattices. All of them size dots by ink
**coverage** rather than a threshold test: a Didone's hairlines are a fraction of
its stem width, so one sample per cell drops them entirely.

`PaperSurface` and `NameMark` debounce their `ResizeObserver` — both do
full-surface pixel work, and an undebounced window drag stalls on it.

### Motion

Everything is gated behind `prefers-reduced-motion` and, where it depends on a
cursor, `pointer: fine`. `useScene` drives every scroll-linked transform from a
single `requestAnimationFrame` loop; elements opt in by class and carry their own
coefficients as `data-*` attributes.
