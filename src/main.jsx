import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { bootDone } from './components/Boot';
import './styles.css';

// Set before first paint, so nothing marked `.asm` flashes into place and is
// then yanked back to its start offset. CSS only holds elements while this
// attribute reads "run".
document.documentElement.setAttribute('data-boot', 'run');

// Safety net. If the curtain logic never completes — a thrown render, fonts
// that never resolve, a tab that is never painted — the page must still show
// itself. A hidden site is a far worse failure than a missed animation.
setTimeout(bootDone, 3200);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
