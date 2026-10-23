// How a typed text is compared with a label: the combobox's filter (CMB-25, CMB-29), with the run of the label that
// answered it (CMB-38), the filter field of the navigation drawer and the tree view (NVD-81, TRV-56), which marks
// no run (NVD-85, TRV-60), and the search's completion of what was typed (SRC-55, SRC-56).
//
// Without regard to case, to the width of a character or to the marks on a letter: each letter with the marks that
// follow it is folded by itself — its compatibility form (a full-width "ｔ" is "t", a half-width "ｶ" is "カ"), without
// its marks (an "á" is "a"), in lower case — so that a place in the folded text is a place in the label, and the run
// that matched can be drawn. The two sound marks of kana are letters' own and are kept: "が" is not "か".

const CLUSTER = /\P{M}\p{M}*|\p{M}+/gu;
const KANA_SOUND_MARKS = new Set(['゙', '゚']);
const foldCluster = (cluster: string) =>
  cluster
    .normalize('NFKD')
    .replace(/\p{M}/gu, (mark) => (KANA_SOUND_MARKS.has(mark) ? mark : ''))
    .normalize('NFKC')
    .toLowerCase();

/** A label as it is compared: its letters, the folded text, and where each folded character came from. */
export interface Folded {
  /** The label's letters, each with its marks. */
  clusters: string[];
  /** The folded text. */
  text: string;
  /** For each character of the folded text, the letter of the label it came from. */
  from: number[];
}

/** Folds a label letter by letter (see the header). */
export function fold(label: string): Folded {
  const clusters = label.match(CLUSTER) ?? [];
  let text = '';
  const from: number[] = [];
  clusters.forEach((cluster, index) => {
    const folded = foldCluster(cluster);
    text += folded;
    for (let i = 0; i < folded.length; i++) from.push(index);
  });
  return { clusters, text, from };
}

/** A text as it is compared: folded, without the spaces around it. */
export const foldText = (text: string) => fold(text.trim()).text;

/** CMB-38: the first run of `label` that matched `query` (already folded), as the three pieces of the label; null when none did. */
export function matchRun(folded: Folded, query: string): [string, string, string] | null {
  if (!query) return null;
  const at = folded.text.indexOf(query);
  if (at < 0) return null;
  const first = folded.from[at];
  const last = folded.from[at + query.length - 1];
  const { clusters } = folded;
  return [clusters.slice(0, first).join(''), clusters.slice(first, last + 1).join(''), clusters.slice(last + 1).join('')];
}

/**
 * NVD-81, TRV-56: the words of a filter text — the runs of characters between white space, each folded. None while the
 * text holds nothing but white space: then no filter is applied.
 */
export function filterWords(text: string): string[] {
  return text
    .split(/\s+/u)
    .filter(Boolean)
    .map((word) => fold(word).text)
    .filter(Boolean);
}

/**
 * NVD-81, TRV-56: whether `label` holds every word — each anywhere in it, in any order. `folded` may be given where the
 * caller keeps the label folded.
 */
export function holdsWords(label: string, words: readonly string[], folded: Folded = fold(label)): boolean {
  return words.length > 0 && words.every((word) => folded.text.includes(word));
}

/**
 * NVD-91, TRV-66: the pause after which a filter's result is said — the pause that ends a type-ahead run (TRV-23), so
 * that a count is said once typing stops and not at every key.
 */
export const FILTER_SETTLE_MS = 1000;

/**
 * SRC-55, SRC-56: where `label` begins with `typed`, compared as above, the label in two pieces — the letters that
 * answer what was typed, and the rest, its completion (possibly empty); null where it does not begin with it. A typed
 * text that ends inside a letter of the label (half of a ligature's fold) does not begin it.
 */
export function completionOf(label: string, typed: string): [string, string] | null {
  if (!typed) return null;
  const query = fold(typed).text;
  if (!query) return null;
  const folded = fold(label);
  if (!folded.text.startsWith(query)) return null;
  const last = folded.from[query.length - 1];
  // The typed text must end where a letter of the label ends.
  if (query.length < folded.text.length && folded.from[query.length] === last) return null;
  const { clusters } = folded;
  return [clusters.slice(0, last + 1).join(''), clusters.slice(last + 1).join('')];
}
