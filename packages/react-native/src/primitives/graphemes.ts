// User-perceived characters (grapheme clusters): what a text field's counter counts and what its maxLength limits
// (TXF-18, TXF-19). An emoji — a ZWJ sequence, a flag, a skin tone — or a letter with its accents counts once, as a
// person sees it, on every platform; React Native's own `maxLength` counts UTF-16 code units and is not used.
//
// `Intl.Segmenter` is the reference. Hermes does not ship it, so without it a smaller set of the Unicode rules (UAX #29)
// is applied: CR LF, combining marks and variation selectors, ZWJ sequences, emoji modifiers, tag sequences, regional
// indicator pairs and Hangul jamo. Package-internal.

type Segmenter = { segment: (text: string) => Iterable<{ segment: string }> };
type SegmenterConstructor = new (locale?: string, options?: { granularity: 'grapheme' }) => Segmenter;

let segmenter: Segmenter | null | undefined;
function platformSegmenter(): Segmenter | null {
  if (segmenter === undefined) {
    const Constructor = (Intl as unknown as { Segmenter?: SegmenterConstructor }).Segmenter;
    segmenter = typeof Constructor === 'function' ? new Constructor(undefined, { granularity: 'grapheme' }) : null;
  }
  return segmenter;
}
/** Test hook: look for `Intl.Segmenter` again (a test removes it to exercise the fallback). */
export function resetGraphemeSegmenter(): void {
  segmenter = undefined;
}

const inRange = (cp: number, from: number, to: number) => cp >= from && cp <= to;
let markPattern: RegExp | null | undefined;
/** A code point that extends the cluster before it: a combining mark, a variation selector, an emoji modifier, a tag. */
function extends_(cp: number): boolean {
  if (markPattern === undefined) {
    try {
      markPattern = new RegExp('^\\p{M}$', 'u');
    } catch {
      markPattern = null;
    }
  }
  if (markPattern ? markPattern.test(String.fromCodePoint(cp)) : false) return true;
  return (
    inRange(cp, 0x0300, 0x036f) || // combining diacritical marks
    inRange(cp, 0x1ab0, 0x1aff) ||
    inRange(cp, 0x1dc0, 0x1dff) ||
    inRange(cp, 0x20d0, 0x20ff) || // combining marks for symbols (the keycap)
    inRange(cp, 0x3099, 0x309a) || // kana voiced sound marks
    inRange(cp, 0xfe00, 0xfe0f) || // variation selectors
    inRange(cp, 0xfe20, 0xfe2f) ||
    inRange(cp, 0x1f3fb, 0x1f3ff) || // emoji modifiers (skin tones)
    inRange(cp, 0xe0020, 0xe007f) || // tags (subdivision flags)
    inRange(cp, 0xe0100, 0xe01ef) // variation selectors supplement
  );
}
const ZWJ = 0x200d;
const isRegionalIndicator = (cp: number) => inRange(cp, 0x1f1e6, 0x1f1ff);
const isJamoL = (cp: number) => inRange(cp, 0x1100, 0x115f);
const isJamoV = (cp: number) => inRange(cp, 0x1160, 0x11a7);
const isJamoT = (cp: number) => inRange(cp, 0x11a8, 0x11ff);

function fallbackGraphemes(text: string): string[] {
  const out: string[] = [];
  let previous = -1;
  let regional = 0;
  for (const char of text) {
    const cp = char.codePointAt(0)!;
    const joins =
      out.length > 0 &&
      ((previous === 0x0d && cp === 0x0a) ||
        cp === ZWJ ||
        previous === ZWJ ||
        extends_(cp) ||
        (isRegionalIndicator(cp) && isRegionalIndicator(previous) && regional % 2 === 1) ||
        ((isJamoV(cp) || isJamoT(cp)) && (isJamoL(previous) || isJamoV(previous))) ||
        (isJamoL(cp) && isJamoL(previous)));
    if (joins) out[out.length - 1] += char;
    else out.push(char);
    regional = isRegionalIndicator(cp) ? regional + 1 : 0;
    previous = cp;
  }
  return out;
}

/** The text as user-perceived characters, in order. */
export function graphemes(text: string): string[] {
  const platform = platformSegmenter();
  if (platform) return Array.from(platform.segment(text), (each) => each.segment);
  return fallbackGraphemes(text);
}

/** How many user-perceived characters the text has. */
export function graphemeCount(text: string): number {
  return graphemes(text).length;
}

/**
 * TXF-18: the value a user edit from `previous` to `next` may produce under a limit of `max` characters (0: none).
 * An edit that does not make the value longer than the limit — or not longer than it was — passes as it is. Otherwise
 * what the edit inserted is shortened to fit (a paste keeps its start; a typed character is refused), and the rest of
 * the edit (a replaced selection) still applies. A value the product set is never shortened here.
 */
export function limitEdit(previous: string, next: string, max: number): string {
  if (max <= 0) return next;
  const after = graphemes(next);
  if (after.length <= max) return next;
  const before = graphemes(previous);
  if (after.length <= before.length) return next;
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start += 1;
  let end = 0;
  while (end < before.length - start && end < after.length - start && before[before.length - 1 - end] === after[after.length - 1 - end]) end += 1;
  const inserted = after.slice(start, after.length - end);
  const room = Math.max(0, max - (start + end));
  return [...before.slice(0, start), ...inserted.slice(0, room), ...before.slice(before.length - end)].join('');
}
