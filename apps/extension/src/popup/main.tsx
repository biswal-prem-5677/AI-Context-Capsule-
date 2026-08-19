/**
 * Extension popup page entry point (Document 14 §1).
 *
 * Mounts the `<Popup />` component into `#root` element in `popup.html`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '../ui/tokens.css';
import './popup.css';
import { Popup } from './Popup.js';

const rootElement = document.getElementById('root');

if (rootElement !== null) {
  createRoot(rootElement).render(
    <StrictMode>
      <Popup />
    </StrictMode>,
  );
}
