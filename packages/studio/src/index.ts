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
import * as components from '@tanrei/web';
// `.tanrei-icon`: the preview draws icons with the system's icon tokens. The HOST loads the icon font the tokens name
// (the docs site and the standalone app register Material Symbols Rounded from @fontsource-variable).
import '@tanrei/web/icons.css';
// The token tree is a tree view around the Studio's own lists: its stylesheet draws it.
import '@tanrei/web/tree-view.css';
// What opens and closes is an accordion, and a token's facts a description list: each around the Studio's own
// elements, drawn by its stylesheet. Loaded with the page, so that the first fold a level
// draws does not give the whole document — the preview with it — another sheet to be styled by.
import '@tanrei/web/accordion.css';
import '@tanrei/web/description-list.css';
import './studio.css';

export { mountStudio, type StudioAdapter, type StudioOptions } from './ui';
// The languages the Studio is translated into, for a host that offers a choice; `studioStrings` for its own chrome.
export { offeredLanguages as studioLanguages, studioDirection, studioLanguage, studioStrings, type StudioLanguage } from './strings';
export { AdapterError, createHttpAdapter, takeToken, tokenFromHash } from './adapter-http.js';
export { studio } from './data';
export { components };
