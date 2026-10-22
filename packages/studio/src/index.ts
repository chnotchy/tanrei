// @tanrei/studio — Theme Studio as a package.
//
//   import { mountStudio } from '@tanrei/studio';
//   mountStudio(document.querySelector('#studio'), { lang: 'en' });                 // browser storage + import/export
//   mountStudio(root, { lang: 'ja', adapter: createHttpAdapter({ token }) });       // edits a file through a server
//
// `lang` is any BCP 47 tag; a language without a translation (src/strings/) is hosted in English.
//
// The host page provides Tanrei's default tokens on :root (`@tanrei/web/tokens.css`) — the Studio's own chrome is
// drawn with them — loads the fonts the tokens name, and bundles with Vite using the plugin from `@tanrei/studio/vite`.
// The namespace import keeps the entry module (and with it every customElements.define) through tree-shaking.
//
// The host also loads the Studio's stylesheets, with the page that mounts it (app/main.ts says which and why):
// `@tanrei/web/icons.css`, `tree-view.css`, `accordion.css` and `description-list.css`, and `@tanrei/studio/studio.css`.
// This module imports none of them: a bundler gives a stylesheet a script imports to every page the script's bundle
// reaches, and a site that hosts the Studio on one page would carry them on all of its pages.
import * as components from '@tanrei/web';

export { mountStudio, type StudioAdapter, type StudioOptions } from './ui';
// The languages the Studio is translated into, for a host that offers a choice; `studioStrings` for its own chrome.
export { offeredLanguages as studioLanguages, studioDirection, studioLanguage, studioStrings, type StudioLanguage } from './strings';
export { AdapterError, createHttpAdapter, takeToken, tokenFromHash } from './adapter-http.js';
export { studio } from './data';
export { components };
