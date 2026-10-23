// The day a page last changed, as its head says it to the reader (components/frame/PageTitle.astro): the day of the
// reader's own time zone. The markup holds the instant once, in UTC — the sitemap's `<lastmod>`, the `<time datetime>`,
// the Markdown's `last_updated` and the JSON-LD's `dateModified` are one string — and the build writes the UTC day as
// the `<time>`'s text, which is what a reader without script sees. A script inline right after the head, parsed before
// the first frame is drawn, writes the reader's day in its place: the same `Intl.DateTimeFormat` options, the page's
// language, the browser's zone. Where the two days are the same it changes nothing.
//
// `readerDay` is written into every page as the text of that script (`readerDayScript`), so it is self-contained: it
// names nothing outside its own body. The page's policy holds the script by its hash (src/lib/csp.mjs); the text is
// the same on every page. It defines no element, so the page's modules are what define-on-demand loads, as before.
// Node tests it with a time zone given (test/reader-day.test.mjs); a browser calls it with none, its own.

/** How a day is written, at build time and in the reader's browser. */
export const DAY_FORMAT = Object.freeze({ year: 'numeric', month: 'long', day: 'numeric' });

/**
 * The day of `iso` in `timeZone`, written for a reader of `lang`. The build writes the UTC day with it.
 * @param {string} iso
 * @param {string} lang
 * @param {string} [timeZone]
 */
export function dayText(iso, lang, timeZone) {
  const time = /^\d{4}-\d{2}-\d{2}T/.test(iso) ? Date.parse(iso) : Number.NaN;
  if (Number.isNaN(time)) throw new Error(`not an ISO 8601 date: ${iso}`);
  return new Intl.DateTimeFormat(lang, { ...DAY_FORMAT, timeZone }).format(time);
}

/**
 * Writes, in a page head's `<time>`, the day of its `datetime` in `timeZone` (the reader's own where none is given) in
 * place of the day the build wrote, which its `data-day` names: the words around the day stay as they are. A `<time>`
 * that is missing, names no day, or holds a `datetime` that is no date is left as it is, and so is one whose day is
 * already that day.
 * @param {{ getAttribute(name: string): string | null, setAttribute(name: string, value: string): void, closest(selector: string): { getAttribute(name: string): string | null } | null, textContent: string | null } | null | undefined} time
 * @param {string} [timeZone]
 */
export function readerDay(time, timeZone) {
  if (!time) return;
  const shown = time.getAttribute('data-day');
  const datetime = time.getAttribute('datetime') ?? '';
  const instant = /^\d{4}-\d{2}-\d{2}T/.test(datetime) ? Date.parse(datetime) : Number.NaN;
  if (!shown || Number.isNaN(instant)) return;
  const lang = time.closest('[lang]')?.getAttribute('lang') || undefined;
  let day;
  try {
    day = new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'long', day: 'numeric', timeZone }).format(instant);
  } catch {
    return;
  }
  const text = time.textContent ?? '';
  const at = text.indexOf(shown);
  if (day === shown || at < 0) return;
  time.textContent = text.slice(0, at) + day + text.slice(at + shown.length);
  time.setAttribute('data-day', day);
}

/** The text of the inline script that stands right after a page's head and calls `readerDay` on its date. */
export const readerDayScript = `(${readerDay})(document.currentScript.previousElementSibling?.querySelector(':scope > [data-part="meta"] > time'));`;
