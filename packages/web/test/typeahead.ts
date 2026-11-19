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
 * Types each of `searches` with the page's clock held — its characters within the same instant, so that they are one
 * search, and the searches a second and a millisecond of it apart, so that each is a search of its own; returns what
 * `found` reads after each.
 */
async function typeSearches(page: Page, searches: readonly string[], found: () => Promise<string | null>): Promise<(string | null)[]> {
  const seen: (string | null)[] = [];
  await holdClock(page);
  for (const search of searches) {
    for (const key of search) await type(page, key);
    seen.push(await found());
    await page.clock.runFor(1001);
  }
  await releaseClock(page);
  return seen;
}

/** Types the searches of `TYPEAHEAD_KEYS`, one character each; returns what `found` reads after each. */
export const typeaheadAsFiltered = (page: Page, found: () => Promise<string | null>) => typeSearches(page, TYPEAHEAD_KEYS, found);

/**
 * Labels compared in their language (SEL-33, LST-17, MNU-7, as CMB-25): two that begin with a capital I — dotless in
 * Turkish, whose dotted capital is "İ" — around one that begins with "İ"; one that a typed "ss" must reach past one
 * that begins with "Stras"; one with a marked capital; a full-width one behind one that also begins with "t"; and the
 * two in kana that differ by the sound mark of their first letter, the voiced one first.
 */
export const LANGUAGE_LABELS = ['Apple', 'Isparta', 'İzmir', 'Ilgaz', 'Strasbourg', 'Straße', 'Évora', 'Tanrei', 'ＴＯＫＹＯ', 'がっこう', 'かばん'] as const;

/**
 * The searches, each typed as one, with focus on Apple: "i" (in Turkish "I" is the capital of "ı", not of "i"), "ı",
 * "strass" ("ß" compares as "ss": past Strasbourg, which "stras" reaches first), "e" (the marks on a letter do not count),
 * "to" (nor the width of a character: past Tanrei, which "t" reaches first), "か" and "が" (the kana sound marks are
 * kept).
 */
export const LANGUAGE_SEARCHES = ['i', 'ı', 'strass', 'e', 'to', 'か', 'が'] as const;

/**
 * What each search finds, by the language the labels are in: in Turkish "i" finds İzmir and "ı" Ilgaz; in German (as in
 * English) "i" finds Isparta, and "ı" nothing, so focus stays there.
 */
export const LANGUAGE_FOUND = {
  tr: ['İzmir', 'Ilgaz', 'Straße', 'Évora', 'ＴＯＫＹＯ', 'かばん', 'がっこう'],
  de: ['Isparta', 'Isparta', 'Straße', 'Évora', 'ＴＯＫＹＯ', 'かばん', 'がっこう'],
} as const;

/** The languages `LANGUAGE_FOUND` holds an answer for. */
export const LANGUAGES = Object.keys(LANGUAGE_FOUND) as (keyof typeof LANGUAGE_FOUND)[];

/** Types the searches of `LANGUAGE_SEARCHES`; returns what `found` reads after each. */
export const typeaheadByLanguage = (page: Page, found: () => Promise<string | null>) => typeSearches(page, LANGUAGE_SEARCHES, found);
