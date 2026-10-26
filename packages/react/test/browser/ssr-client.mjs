// The browser's side of `ssr.test.mjs`: every wrapper's element is defined (the `/all` entry imports each element's
// module), the server's HTML is hydrated, and `window.read` reads what an element takes from server-written HTML.
import { createElement } from 'react';
import { hydrateRoot } from 'react-dom/client';
import * as wrappers from '@tanrei/react/all';
import { App } from './ssr-app.mjs';

// Kept, so the bundler keeps every wrapper's module and the element it defines (the package is free of side effects).
window.wrappers = wrappers;
window.hydrationErrors = [];
/** Each element of `html` (one element each), upgraded where it stands — out of the document, so it never renders — and its `prop`. */
window.read = (cases) =>
  cases.map(([html, prop]) => {
    const holder = document.createElement('div');
    holder.innerHTML = html;
    customElements.upgrade(holder);
    return holder.firstElementChild[prop];
  });
if (document.getElementById('root')) {
  hydrateRoot(document.getElementById('root'), createElement(App), {
    onRecoverableError: (error) => window.hydrationErrors.push(String(error?.message ?? error)),
  });
}
