// Registers every Tanrei custom element for live demos (browser only).
//
// A bare `import '@tanrei/web'` is tree-shaken away: the package's `sideEffects` list does not
// include its entry module, so a bundler drops the import and nothing gets defined. Using the
// namespace keeps the entry, and with it each component module that calls customElements.define.
//
// The docs' link forms hold a plain anchor until their element is defined (link-fallback.ts): it goes first.
import './link-fallback';
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
