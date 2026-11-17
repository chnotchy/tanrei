// Typeahead compared as the filters compare (SEL-33, LST-17, MNU-7, TRV-23, MBR-12, as CMB-25): one walk that every
// component sharing the typeahead runs on its own items, so that they answer alike.
import type { Page } from '@playwright/test';
import { holdClock, releaseClock } from './page-clock.js';

/**
 * The items' labels, in this order: one that begins with a capital, one with a marked letter, one more with a capital,
 * and two in kana that differ by the sound mark of their first letter — the voiced one first, so that a comparison that
 * dropped the mark would find it for the unvoiced letter.
 */
export const TYPEAHEAD_LABELS = ['Apple', 'École', 'Zebra', 'がっこう', 'かばん'] as const;

/**
 * What each search finds, typed one search at a time with focus on Apple: "e" finds École (the marks on a letter do not
 * count), a full-width "ｚ" Zebra (nor does the width of a character, nor case), "か" かばん and not がっこう before it
 * (the kana sound marks are kept, as the filters keep them: "が" is not "か"), "が" がっこう, and "a" Apple.
 */
export const TYPEAHEAD_KEYS = ['e', 'ｚ', 'か', 'が', 'a'] as const;
export const TYPEAHEAD_FOUND = ['École', 'Zebra', 'かばん', 'がっこう', 'Apple'];

/**
 * A key typed. Playwright's keyboard is a US one, which has no "ｚ" or "か": the key of an input method that does not
 * compose (a full-width or a kana layout) is the `keydown` it sends with that `key`, to the element that has focus —
 * the event every component reads its typeahead from.
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
 * Types the searches of `TYPEAHEAD_KEYS` with the page's clock held, a second and a millisecond of it apart so that each
 * is a search of its own; returns what `found` reads after each.
 */
export async function typeaheadAsFiltered(page: Page, found: () => Promise<string | null>): Promise<(string | null)[]> {
  const seen: (string | null)[] = [];
  await holdClock(page);
  for (const key of TYPEAHEAD_KEYS) {
    await type(page, key);
    seen.push(await found());
    await page.clock.runFor(1001);
  }
  await releaseClock(page);
  return seen;
}
