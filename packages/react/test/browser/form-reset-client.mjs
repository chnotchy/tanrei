// The browser's side of `form-reset.test.mjs`: the form the server rendered is hydrated, or, where the page holds no
// server HTML, the client renders it alone.
import { createElement } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './form-reset-app.mjs';

window.hydrationErrors = [];
const root = document.getElementById('root');
if (root.firstElementChild) {
  hydrateRoot(root, createElement(App), { onRecoverableError: (error) => window.hydrationErrors.push(String(error?.message ?? error)) });
} else {
  createRoot(root).render(createElement(App));
}
