// How a typed text is compared with a label: the combobox's filter (CMB-25, CMB-29), with the run of the label that
// answered it (CMB-38), the filter field of the navigation drawer and the tree view (NVD-81, TRV-56), which marks
// no run (NVD-85, TRV-60), the search's completion of what was typed (SRC-55, SRC-56), and the typeahead of a column
// of items (SEL-33, LST-17, MNU-7, TRV-23, MBR-12), so that typing to an item and filtering for it find the same labels.
//
// As the label's language compares: by the collator of that language (`ambientLocale()` of the element the label is
// read from — its nearest `lang` — given here as `lang`), for searching, at its base strength: without regard to case,
// to the width of a character or to the marks on a letter, and with the letters the language tells apart told apart
// (in Turkish "i" is not "ı", whose capital is "I"; in German "ß" is "ss"). A label is compared a run of its letters
// (grapheme clusters) at a time with the whole typed text, so that a place where they compare equal is a place in the
// label, and the run that matched can be drawn.
//
// The two sound marks of kana are letters' own and are kept: "が" is not "か", nor "ば" "ぱ". Chromium's and Firefox's
// collators take them for marks at base strength and drop them (WebKit's keeps them), so two texts a collator finds
// equal must also carry the same marks on the same kana (a check of the web's own, `sameKanaMarks`). Kana in hiragana
// and in katakana, full or half width, large or small compare equal in every engine ("か" is "カ" and "ｶ", "ゃ" "や").

/** The collator of each language a label was compared in, made once. */
const collators = new Map<string, Intl.Collator>();

function collatorOf(lang: string | undefined): Intl.Collator {
  const key = lang ?? '';
  let collator = collators.get(key);
  if (!collator) {
    try {
      collator = new Intl.Collator(lang || undefined, { usage: 'search', sensitivity: 'base' });
    } catch {
      // A tag `Intl` cannot read: the browser's own language.
      collator = new Intl.Collator(undefined, { usage: 'search', sensitivity: 'base' });
    }
    collators.set(key, collator);
  }
  return collator;
}

let graphemes: Intl.Segmenter | null = null;

/** A text's letters: its grapheme clusters, each letter with its marks (a half-width kana with its sound mark). */
export function letters(text: string): string[] {
  graphemes ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  return Array.from(graphemes.segment(text), (part) => part.segment);
}

const KANA = /[\p{Script=Hiragana}\p{Script=Katakana}]/u;
const SOUND_MARKS = new Set(['゙', '゚']);

/**
 * The kana of a text and the sound marks on them, in order (a kana written `k`): decomposed for compatibility, so that a
 * precomposed "が", "か" with a combining mark and a half-width "ｶﾞ" read alike.
 */
function kanaMarks(text: string): string {
  let out = '';
  for (const character of text.normalize('NFKD')) {
    if (SOUND_MARKS.has(character)) out += character;
    else if (KANA.test(character)) out += 'k';
  }
  return out;
}

/** Whether two texts the collator finds equal carry the same sound marks on the same kana (see the header). */
const sameKanaMarks = (a: string, b: string) => kanaMarks(a) === kanaMarks(b);

/** Whether `a` and `b` compare equal in `lang` (see the header). */
export function sameText(a: string, b: string, lang?: string): boolean {
  return collatorOf(lang).compare(a, b) === 0 && sameKanaMarks(a, b);
}

/** Whether a text compares equal to no text at all in `lang`: empty, or only what the collator ignores. */
const blank = (text: string, lang?: string) => !text || collatorOf(lang).compare(text, '') === 0;

/**
 * The most letters of a label a run that compares equal to a typed text of `count` letters is looked for in: a letter
 * may stand for several typed ones ("ß" for "ss") or several for one ("ss" for "ß", "ffi" for "ﬃ"), and the label may
 * hold a letter the collator ignores (a soft hyphen).
 */
const runLimit = (count: number) => 2 * count + 2;

/**
 * The first run of `label`'s letters that compares equal to `text` in `lang`, starting at a letter from `from` up to
 * `until` (exclusive), shortest first, as the index of its first letter and the index after its last; `[0, 0]` for a
 * text that compares equal to no text; null where none does.
 */
function runOf(label: readonly string[], text: string, lang: string | undefined, until = label.length): [number, number] | null {
  if (blank(text, lang)) return [0, 0];
  const { compare } = collatorOf(lang);
  const limit = runLimit(letters(text).length);
  for (let first = 0; first < until; first++) {
    let run = '';
    for (let last = first; last < label.length && last - first < limit; last++) {
      run += label[last];
      if (compare(run, text) === 0 && sameKanaMarks(run, text)) return [first, last + 1];
    }
  }
  return null;
}

/**
 * SEL-33, LST-17, MNU-7, TRV-23, MBR-12: whether `label`, without the spaces around it, begins with the typed `text`,
 * compared in the label's language `lang` as above (typed "e" begins "École", "か" does not begin "がっこう", and in
 * Turkish "i" does not begin "Isparta"). The comparison typeahead gives `RovingKeys.target`.
 */
export const labelBegins = (label: string, text: string, lang?: string): boolean => runOf(letters(label.trim()), text, lang, 1) !== null;

/** CMB-25: where `label` (its letters) contains `text` in `lang`: the first run that compares equal, or null. */
export function containsText(label: readonly string[], text: string, lang?: string): [number, number] | null {
  return runOf(label, text, lang);
}

/** CMB-38: `label` (its letters) in three pieces around `run` — before it, the run, after it; null for an empty run. */
export function matchRun(label: readonly string[], run: readonly [number, number] | null): [string, string, string] | null {
  if (!run || run[0] === run[1]) return null;
  return [label.slice(0, run[0]).join(''), label.slice(run[0], run[1]).join(''), label.slice(run[1]).join('')];
}

/**
 * NVD-81, TRV-56: the words of a filter text — the runs of characters between white space. None while the text holds
 * nothing but white space: then no filter is applied.
 */
export function filterWords(text: string): string[] {
  return text.split(/\s+/u).filter(Boolean);
}

/**
 * NVD-81, TRV-56: whether `label` holds every word — each anywhere in it, in any order — compared in the label's
 * language `lang`.
 */
export function holdsWords(label: string, words: readonly string[], lang?: string): boolean {
  if (!words.length) return false;
  const all = letters(label);
  return words.every((word) => runOf(all, word, lang) !== null);
}

/**
 * NVD-91, TRV-66: the pause after which a filter's result is said — the pause that ends a type-ahead run (TRV-23), so
 * that a count is said once typing stops and not at every key.
 */
export const FILTER_SETTLE_MS = 1000;

/**
 * SRC-55, SRC-56: where `label` begins with `typed`, compared in the label's language `lang` as above, the label in two
 * pieces — the letters that answer what was typed, and the rest, its completion (possibly empty); null where it does
 * not begin with it. Only whole letters of the label answer: a typed text that would end inside one (half of what a
 * ligature stands for) does not begin it.
 */
export function completionOf(label: string, typed: string, lang?: string): [string, string] | null {
  if (blank(typed, lang)) return null;
  const all = letters(label);
  const run = runOf(all, typed, lang, 1);
  if (!run) return null;
  return [all.slice(0, run[1]).join(''), all.slice(run[1]).join('')];
}
