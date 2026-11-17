// Typeahead compared as the element's language compares (SEL-33, LST-17, MNU-7, TRV-23, MBR-12): one walk that every
// component sharing the typeahead runs on its own items, so that they answer alike.
import type { Page } from '@playwright/test';
import { holdClock, releaseClock } from './page-clock.js';

/**
 * The items' labels, in this order: two that only a Turkish reader tells apart by their first letter (a dotless and a
 * dotted capital I), one that begins with a marked letter, and one that begins with a capital.
 */
export const TYPEAHEAD_LABELS = ['Irmak', 'İzmir', 'École', 'Zebra'] as const;

/**
 * What each of these keys finds, typed one search at a time with focus on Irmak: "e" finds École (the marks on a letter
 * do not count) and "Z" Zebra (nor does case); in English "i" finds Irmak. Then in Turkish, where i is İ in lower case
 * and ı is I: "i" finds İzmir, typed again finds nothing else (focus stays), and "ı" finds Irmak.
 */
export const TYPEAHEAD_FOUND = ['École', 'Zebra', 'Irmak', 'İzmir', 'İzmir', 'Irmak'];

/**
 * A key typed. Playwright's keyboard is a US one, which has no "ı": a Turkish keyboard's key is the `keydown` it sends
 * with that `key`, to the element that has focus — the event every component reads its typeahead from.
 */
async function type(page: Page, key: string) {
  if (/^[\x20-\x7e]$/.test(key)) return page.keyboard.press(key);
  await page.evaluate((k) => {
    let at = document.activeElement;
    while (at?.shadowRoot?.activeElement) at = at.shadowRoot.activeElement;
    for (const name of ['keydown', 'keyup']) (at ?? document.body).dispatchEvent(new KeyboardEvent(name, { key: k, bubbles: true, composed: true, cancelable: true }));
  }, key);
}

/**
 * Types the searches of `TYPEAHEAD_FOUND` with the page's clock held, a second and a millisecond of it apart so that each
 * is a search of its own, with the component's `lang` set as each needs; returns what `found` reads after each.
 */
export async function typeaheadByLanguage(page: Page, setLang: (lang: string) => Promise<unknown>, found: () => Promise<string | null>): Promise<(string | null)[]> {
  const seen: (string | null)[] = [];
  await holdClock(page);
  for (const [lang, key] of [['en', 'e'], ['en', 'Z'], ['en', 'i'], ['tr', 'i'], ['tr', 'i'], ['tr', 'ı']]) {
    await setLang(lang);
    await type(page, key);
    seen.push(await found());
    await page.clock.runFor(1001);
  }
  await releaseClock(page);
  return seen;
}
