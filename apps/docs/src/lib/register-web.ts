// Registers every Tanrei custom element for live demos (browser only).
//
// Importing the package's entries defines every element: the main entry the core's components, and a layer's entry
// those that live in that layer (`@tanrei/web/m3-like`: the FAB menu, whose demos draw under that system). The
// entries are in the package's `sideEffects` list, so a bundler keeps them (and each component module they import)
// even where nothing is used.
//
// The docs' link forms hold a plain anchor until their element is defined (link-fallback.ts): it goes first.
import './link-fallback';
import * as tanrei from '@tanrei/web';
import '@tanrei/web/m3-like';

declare global {
  interface Window {
    tanrei?: typeof tanrei;
  }
}
window.tanrei = tanrei;

// The page's own words (components/ProductWords.astro): the documentation is the product on its pages,
// and a page that shows a `setWords()` call runs it — with the words that page wrote, for the language it wrote them
// in. Nothing is set for a page that shows none: a sample that forgot a word shows the gap.
for (const given of document.querySelectorAll<HTMLScriptElement>('script[data-tanrei-product-words]')) {
  tanrei.setWords(JSON.parse(given.textContent || '{}') as tanrei.TanreiWords, { lang: given.dataset.lang });
}
