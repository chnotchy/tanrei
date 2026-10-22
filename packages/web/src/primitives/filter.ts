// How a typed text is compared with a label, and which runs of the label answered it: the combobox's filter (CMB-25,
// CMB-29, CMB-38) and the filter field of the navigation drawer and the tree view (NVD-81, NVD-85, TRV-56).
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

/** A run of a label, as offsets into the label's own string (UTF-16 code units): `[start, end)`. */
export type Run = readonly [number, number];

/**
 * NVD-81, NVD-85, TRV-56: whether `label` holds every word — each anywhere in it, in any order — and, where it
 * does, every run of the label that a word matched, merged where they touch or overlap, in order. Null where a word is
 * missing. `folded` may be given where the caller keeps the label folded.
 */
export function wordRuns(label: string, words: readonly string[], folded: Folded = fold(label)): Run[] | null {
  if (!words.length) return null;
  // Where each letter of the label begins in its string.
  const starts: number[] = [];
  let offset = 0;
  for (const cluster of folded.clusters) {
    starts.push(offset);
    offset += cluster.length;
  }
  starts.push(offset);
  const spans: [number, number][] = [];
  for (const word of words) {
    let found = false;
    for (let at = folded.text.indexOf(word); at >= 0; at = folded.text.indexOf(word, at + 1)) {
      found = true;
      const first = folded.from[at];
      const last = folded.from[at + word.length - 1];
      spans.push([starts[first], starts[last + 1]]);
    }
    if (!found) return null;
  }
  spans.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: [number, number][] = [];
  for (const span of spans) {
    const last = merged.at(-1);
    if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
    else merged.push([span[0], span[1]]);
  }
  return merged;
}

/** The pieces of `label` between and at `runs`, in order: plain, run, plain, run, … (the first piece may be empty). */
export function runPieces(label: string, runs: readonly Run[]): string[] {
  const pieces: string[] = [];
  let at = 0;
  for (const [start, end] of runs) {
    pieces.push(label.slice(at, start), label.slice(start, end));
    at = end;
  }
  pieces.push(label.slice(at));
  return pieces;
}

/**
 * NVD-91, TRV-66: the pause after which a filter's result is said — the pause that ends a type-ahead run (TRV-23), so
 * that a count is said once typing stops and not at every key.
 */
export const FILTER_SETTLE_MS = 1000;
