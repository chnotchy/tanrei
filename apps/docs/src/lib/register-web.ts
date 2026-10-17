// Registers every Tanrei custom element for live demos (browser only).
//
// Importing the package's entry defines every element: the entry is in the package's `sideEffects`
// list, so a bundler keeps it (and each component module it imports) even where nothing is used.
//
// The docs' link forms hold a plain anchor until their element is defined: lib/link-fallback.ts takes it away, from
// the head of every page (components/frame/Head.astro), not from here — a module this one's whole graph holds back.
import * as tanrei from '@tanrei/web';

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
