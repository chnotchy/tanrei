// Defines the Tanrei elements of a page's live demos (browser only): those the page draws, and no others
// (define-on-demand.ts).
//
// The page-wide scripts of `@tanrei/web` — what its entry runs besides defining elements — run as they did when the
// page imported the entry: the marks of mirrored glyphs on bare `.tanrei-icon`s and the text links' behaviour on every
// such page, and the scripts of the steps, the timelines and the previous and next links on a page that has them.
//
// The docs' link forms hold a plain anchor until their element is defined (link-fallback.ts): it goes first.
import './link-fallback';
import '@tanrei/web/icons';
import '@tanrei/web/link';
import { type TanreiWords, setWords } from '@tanrei/web/words';
import './define-on-demand';

// The page's own words (components/ProductWords.astro): the documentation is the product on its pages,
// and a page that shows a `setWords()` call runs it — with the words that page wrote, for the language it wrote them
// in. Nothing is set for a page that shows none: a sample that forgot a word shows the gap. They are set now, before
// the module of any demo's element has arrived, so an element reads them when it first draws.
for (const given of document.querySelectorAll<HTMLScriptElement>('script[data-tanrei-product-words]')) {
  setWords(JSON.parse(given.textContent || '{}') as TanreiWords, { lang: given.dataset.lang });
}

// The site writes these where the page is built (Steps.astro, PreviousNextLinks.astro, a page's Markdown).
const PAGE_SCRIPTS: Record<string, () => Promise<unknown>> = {
  'tanrei-steps': () => import('@tanrei/web/steps'),
  'tanrei-timeline': () => import('@tanrei/web/timeline'),
  'tanrei-previous-next-links': () => import('@tanrei/web/previous-next-links'),
};
for (const [name, load] of Object.entries(PAGE_SCRIPTS)) if (document.querySelector(`.${name}`)) void load();

// The whole package, for a person at the browser's console: `await tanrei`. It is fetched only when it is asked for.
declare global {
  interface Window {
    readonly tanrei: Promise<typeof import('@tanrei/web')>;
  }
}
Object.defineProperty(window, 'tanrei', { configurable: true, get: () => import('@tanrei/web') });
