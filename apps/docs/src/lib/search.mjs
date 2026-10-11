// What the docs' search does between the site's search index and Tanrei's Search (components/frame/Search.astro), as
// functions with no browser in them, so that Node can test them (test/search.test.mjs).
//
// The Search component searches nothing (SRC-51) and parses no string as markup: the page's script asks the index —
// the files the framework's build writes under `/pagefind/`, with their own script interface — and hands the component
// values. These functions are that hand-over:
//
//   excerptRuns   the index's excerpt, a string of escaped text with `<mark>` around each match, as the runs a result's
//                 `excerpt` takes (SRC-43): plain, match, plain, match…
//   pageGroup     one page the index found, as a result group: the page is the group's linked heading, and the
//                 sections of it that matched are its results (the page's own part is the heading's excerpt);
//   countWords    the status text for a number of results, in the form the language's plural rule asks for;
//   fillWords     a sentence of the dictionary with its `{place}`s filled, as text;
//   answersAsTyped, exactQuestions
//                 whether an answer is for the words as they were typed. The index answers a word it does not have
//                 with the pages of the longest beginning of it that it does have — «jjjjjj» with the pages of a lone
//                 «j», «carousle» with those of «car» — and its answer does not say so. What it does give is the
//                 matches it marked and a second way of asking: a word between quotation marks is looked up as that
//                 word alone. The first says an answer is honest wherever a marked word begins with a typed one; the
//                 second is asked only where none does (a word found in another of its forms: «comboboxes» on pages
//                 that say «combobox»), and an answer that neither stands behind is no answer.

/** The named character references the index's excerpts are written with, and what each stands for. */
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** Escaped text as the text it stands for: `&lt;tanrei-button&gt;` is `<tanrei-button>`. An unknown reference stays as written. */
function text(escaped) {
  return escaped.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (written, name) => {
    if (name[0] !== '#') return NAMED[name.toLowerCase()] ?? written;
    const code = name[1] === 'x' || name[1] === 'X' ? Number.parseInt(name.slice(2), 16) : Number.parseInt(name.slice(1), 10);
    return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : written;
  });
}

/**
 * An excerpt of the index as runs of text in order: the first, third, fifth… is plain text and the second, fourth… is
 * a match (SRC-43). A passage that begins with a match begins with an empty run; a passage without a match is one run;
 * no passage is no run. Any other tag is dropped and its text kept: nothing of the string is ever markup again.
 *
 * @param {string | null | undefined} excerpt
 * @returns {string[]}
 */
export function excerptRuns(excerpt) {
  if (!excerpt) return [];
  const runs = String(excerpt)
    .split(/<\/?mark\b[^>]*>/i)
    .map((run) => text(run.replace(/<[^>]*>/g, '')));
  // A passage that ends with a match ends with an empty plain run: it says nothing.
  while (runs.length > 1 && runs.at(-1) === '') runs.pop();
  return runs.some(Boolean) ? runs : [];
}

/**
 * @typedef {{ title?: string, url: string, excerpt?: string, locations?: number[] }} IndexPart  A part of a page the index found (`sub_results`).
 * @typedef {{ url: string, excerpt?: string, meta?: { title?: string, level?: string, onrequest?: string }, sub_results?: IndexPart[] }} IndexPage  A page the index found (a result's `data()`). A component's page carries its level and, where a list shows it only on request, that mark — both as words of the page's language (components/frame/PageTitle.astro).
 * @typedef {{ value: string, headline: string, href: string, excerpt: string[] }} Row  What a result, or a group's linked heading, is given.
 * @typedef {Row & { results: Row[] }} Group  What a result group is given.
 */

/**
 * One page the index found, as a result group (SRC-44): the page is the group's heading and a link, and its sections
 * that matched are the group's results, each a link to that section. The page's own part — what matched above its
 * first heading — is the heading's excerpt. A page with many sections that matched shows the `parts` of them that
 * matched most, in the page's order. Every `value` is the address the row goes to, which no other row has. A
 * component's page says its level after its name, and that it is shown on request where it is: the
 * search finds every component, and says which kind it found.
 *
 * @param {IndexPage} page
 * @param {{ parts?: number }} [options]
 * @returns {Group}
 */
export function pageGroup(page, { parts = 3 } = {}) {
  const sections = page.sub_results ?? [];
  const title = page.meta?.title;
  // The page's own part is the one at the page's address — or at its title's own anchor, where the page's first
  // heading has an id: the part named as the page is, at the page's address with a fragment.
  const own = sections.find((section) => section.url === page.url) ?? sections.find((section) => !!title && section.title === title && section.url.split('#')[0] === page.url);
  const seen = new Set([page.url]);
  const others = sections.filter((section) => section !== own && section.url && !seen.has(section.url) && seen.add(section.url));
  const most = [...others].sort((a, b) => (b.locations?.length ?? 0) - (a.locations?.length ?? 0)).slice(0, Math.max(0, parts));
  const shown = others.filter((section) => most.includes(section));
  return {
    value: page.url,
    headline: [title || own?.title || page.url, page.meta?.level, page.meta?.onrequest].filter(Boolean).join(' · '),
    href: page.url,
    // A page found only by its sections has no words of its own to show; one found with no part at all shows its excerpt.
    excerpt: excerptRuns(own ? own.excerpt : shown.length ? '' : page.excerpt),
    results: shown.map((section) => ({ value: section.url, headline: section.title || title || section.url, href: section.url, excerpt: excerptRuns(section.excerpt) })),
  };
}

/** First strong isolate and pop directional isolate: a value written into a sentence keeps its own direction and reorders nothing beside it. */
const FSI = '⁨';
const PDI = '⁩';

/**
 * A sentence of the dictionary with its `{place}`s filled. The result is text, never markup; each value is isolated
 * from the sentence's direction, so a Latin query reads in its own order inside an Arabic sentence.
 *
 * @param {string} template
 * @param {Record<string, string | number>} values
 */
export function fillWords(template, values) {
  return template.replace(/\{(\w+)\}/g, (place, name) => (name in values ? `${FSI}${values[name]}${PDI}` : place));
}

/**
 * The status text for `count` results of `query`: the dictionary's sentence for the plural form `lang` asks for
 * (`one`, `two`, `few`, `many`), or its `other`.
 *
 * @param {Record<string, string>} forms
 * @param {number} count
 * @param {string} query
 * @param {string} lang
 */
export function countWords(forms, count, query, lang) {
  let form = 'other';
  try {
    form = new Intl.PluralRules(lang).select(count);
  } catch {
    // A language tag the runtime does not know: the general form.
  }
  return fillWords(forms[form] ?? forms.other, { count, query });
}

/** Text as the index compares it: lower case, and without the marks written over or under a letter (as the index's own script folds a query). */
const folded = (text) => text.toLocaleLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

/**
 * The words of a text, as the index compares them: runs of letters and digits, and — in a language that writes no
 * space between its words — the words its own rules find in a run. A language tag the runtime does not know, or a
 * runtime without the segmenter, leaves each run whole.
 *
 * @param {string | null | undefined} text
 * @param {string} lang
 * @returns {string[]}
 */
export function wordsOf(text, lang) {
  const runs = String(text ?? '').match(/[\p{L}\p{N}\p{M}]+/gu) ?? [];
  let segmenter;
  try {
    segmenter = new Intl.Segmenter(lang, { granularity: 'word' });
  } catch {
    return runs.map(folded);
  }
  return runs.flatMap((run) => {
    const words = [...segmenter.segment(run)].filter((part) => part.isWordLike).map((part) => part.segment);
    return (words.length > 0 ? words : [run]).map(folded);
  });
}

/**
 * Whether the index's answer holds a match of a word as it was typed: among the words it marked in the excerpts of
 * `pages` — each page's own and its sections' — one begins with a word of `query`. A query with no word in it (signs
 * alone) asks for nothing the index could have replaced, and its answer stands.
 *
 * @param {string} query
 * @param {IndexPage[]} pages
 * @param {string} lang
 */
export function answersAsTyped(query, pages, lang) {
  const typed = wordsOf(query, lang);
  if (typed.length === 0) return true;
  const marked = (excerpt) => excerptRuns(excerpt).filter((_, index) => index % 2 === 1);
  return pages.some((page) =>
    [page.excerpt, ...(page.sub_results ?? []).map((section) => section.excerpt)]
      .flatMap(marked)
      .flatMap((match) => wordsOf(match, lang))
      .some((match) => typed.some((word) => match.startsWith(word))),
  );
}

/**
 * The questions that say whether the index has a word of `query` at all: each word between quotation marks, which the
 * index looks up as that word alone — in any of its forms, and never as a shorter beginning of it.
 *
 * @param {string} query
 * @param {string} lang
 * @returns {string[]}
 */
export function exactQuestions(query, lang) {
  return [...new Set(wordsOf(query, lang))].map((word) => `"${word}"`);
}
