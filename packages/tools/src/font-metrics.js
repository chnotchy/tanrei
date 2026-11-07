// What a web font's fallback must be told so that text set in it takes the room the web font will take.
//
// Our sites register their faces `font-display: swap` (font-faces.js): text is drawn at once in the stack's next
// family and drawn again when the file arrives. Arial does not set a line of English to Inter's width, and its ascent
// and descent are not Inter's, so a paragraph drawn in it wraps differently and stands at another height — and
// everything under it moves when Inter arrives. A face registered from the platform's own file (`local()`) with
// `size-adjust`, `ascent-override`, `descent-override` and `line-gap-override` draws the fallback at the web font's
// average width and line height: the method of Next.js's `next/font`, Fontaine and Capsize, whose formula this is.
//
//   size-adjust      = (the web font's average advance / its em) ÷ (the fallback's average advance / its em)
//   ascent-override  = the web font's ascent ÷ (its em × size-adjust)      (descent and line gap alike)
//
// The overrides are fractions of the size the fallback is drawn at after `size-adjust`, so they depend on the
// fallback's widths only: two fallbacks with the same advances (Arial and Liberation Sans, which is drawn to Arial's
// metrics; Courier New and Liberation Mono; every Japanese face's full-width characters) take one face, with one
// `src` list.
//
// The web font's metrics are read here from the files our sites register (a small reader of the SFNT tables below):
// `head` for the em, `hhea` (or `OS/2`'s typographic metrics, where the font asks for them with USE_TYPO_METRICS, as
// browsers honour it) for ascent, descent and line gap, `cmap` and `hmtx` for the advances — at the font's default
// instance, which is the regular weight for Inter and Roboto Mono (Noto Sans JP's is its thinnest, and its kana and
// kanji are a full em at every weight). The fallback's are constants (FALLBACKS): the platform's file is not in the
// repository, and its metrics do not change.
//
// One face stands in for every weight, as Next.js's does: bold text is drawn in the regular face made bold by the
// browser, at the regular face's widths, where the web font's bold is a little wider.
import fs from 'node:fs';

// ── An SFNT reader: the few tables the metrics come from ─────────────────────────────────────────────────────────

/**
 * The tables of a TrueType or OpenType font, by tag.
 * @param {Uint8Array} bytes SFNT bytes (a WOFF2 file is decompressed first: icon-font.js `sfnt()`)
 */
export function sfntTables(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint16(4);
  const tables = {};
  for (let i = 0; i < count; i += 1) {
    const at = 12 + i * 16;
    const tag = String.fromCharCode(...bytes.subarray(at, at + 4));
    tables[tag] = new DataView(bytes.buffer, bytes.byteOffset + view.getUint32(at + 8), view.getUint32(at + 12));
  }
  return tables;
}

/** The glyph a code point maps to in a `cmap` table (format 4 or 12), or 0. */
function cmapLookup(cmap) {
  const count = cmap.getUint16(2);
  let best;
  for (let i = 0; i < count; i += 1) {
    const platform = cmap.getUint16(4 + i * 8);
    const encoding = cmap.getUint16(6 + i * 8);
    const offset = cmap.getUint32(8 + i * 8);
    const format = cmap.getUint16(offset);
    const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (!unicode || (format !== 4 && format !== 12)) continue;
    if (!best || format === 12) best = { offset, format };
  }
  if (!best) throw new Error('font-metrics: the font has no Unicode cmap of format 4 or 12');
  const { offset, format } = best;
  if (format === 12) {
    const groups = cmap.getUint32(offset + 12);
    return (cp) => {
      for (let g = 0; g < groups; g += 1) {
        const at = offset + 16 + g * 12;
        const start = cmap.getUint32(at);
        if (cp >= start && cp <= cmap.getUint32(at + 4)) return cmap.getUint32(at + 8) + (cp - start);
      }
      return 0;
    };
  }
  const segments = cmap.getUint16(offset + 6) / 2;
  const ends = offset + 14;
  const starts = ends + segments * 2 + 2;
  const deltas = starts + segments * 2;
  const ranges = deltas + segments * 2;
  return (cp) => {
    if (cp > 0xffff) return 0;
    for (let s = 0; s < segments; s += 1) {
      if (cp > cmap.getUint16(ends + s * 2)) continue;
      const start = cmap.getUint16(starts + s * 2);
      if (cp < start) return 0;
      const delta = cmap.getInt16(deltas + s * 2);
      const range = cmap.getUint16(ranges + s * 2);
      if (!range) return (cp + delta) & 0xffff;
      const glyph = cmap.getUint16(ranges + s * 2 + range + (cp - start) * 2);
      return glyph ? (glyph + delta) & 0xffff : 0;
    }
    return 0;
  };
}

/**
 * A font's vertical metrics, and the advance of each character of `text` it holds (at its default instance, for a
 * variable font).
 * @param {Uint8Array} bytes SFNT bytes
 * @param {string} [text]
 * @returns {{ unitsPerEm: number, ascent: number, descent: number, lineGap: number, useTypoMetrics: boolean, advances: Record<string, number> }}
 *   `descent` is negative, as the tables write it
 */
export function readMetrics(bytes, text = '') {
  const { head, hhea, hmtx, cmap, 'OS/2': os2 } = sfntTables(bytes);
  if (!head || !hhea) throw new Error('font-metrics: the font has no head or hhea table');
  // OS/2 fsSelection bit 7: the typographic metrics are the font's line metrics (browsers honour it on every platform).
  const useTypoMetrics = !!os2 && os2.byteLength >= 74 && (os2.getUint16(62) & 0x80) !== 0;
  const [ascent, descent, lineGap] = useTypoMetrics ? [os2.getInt16(68), os2.getInt16(70), os2.getInt16(72)] : [hhea.getInt16(4), hhea.getInt16(6), hhea.getInt16(8)];
  const advances = {};
  if (text) {
    const glyphOf = cmapLookup(cmap);
    const metrics = hhea.getUint16(34);
    for (const ch of new Set(text)) {
      const glyph = glyphOf(ch.codePointAt(0));
      if (!glyph) continue;
      advances[ch] = hmtx.getUint16(Math.min(glyph, metrics - 1) * 4);
    }
  }
  return { unitsPerEm: head.getUint16(18), ascent, descent, lineGap, useTypoMetrics, advances };
}

// ── The fallbacks ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * How often each character stands in running English text: the letters a–z by their frequency in English, and the
 * space between words (about one character in six). The average advance of a font is its advances weighted by these.
 */
export const LATIN_WEIGHTS = {
  ' ': 0.18, a: 0.0670, b: 0.0123, c: 0.0230, d: 0.0353, e: 0.1040, f: 0.0182, g: 0.0165, h: 0.0500, i: 0.0571, j: 0.0013, k: 0.0063, l: 0.0330,
  m: 0.0197, n: 0.0553, o: 0.0615, p: 0.0158, q: 0.0008, r: 0.0491, s: 0.0519, t: 0.0743, u: 0.0227, v: 0.0080, w: 0.0193, x: 0.0012, y: 0.0162, z: 0.0006,
};

/** Characters of running Japanese — kana, the commonest kanji, the full stop and comma — each weighted alike. */
export const JAPANESE_WEIGHTS = Object.fromEntries([...'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんアイウエオカキクケコサシスセソタチツテトンー日本語人一大年中出事、。'].map((ch, _, all) => [ch, 1 / all.length]));

/**
 * The platform faces a web font falls back to while its file loads, by kind. `local` names the faces (full name and
 * PostScript name, as `local()` matches them), in the order a platform is likely to have them; every face of a kind
 * has the same advances, so one set of overrides fits them all. `advances` are the faces' own, in their em:
 *   sans — Arial (Windows, macOS; Liberation Sans on Linux is drawn to Arial's metrics). Next.js's `next/font` falls
 *          back to Arial alone, and Fontaine and Capsize list it among theirs; Arial's widths are Helvetica's.
 *   mono — Courier New (Windows, macOS; Liberation Mono on Linux, to Courier New's metrics), as Fontaine falls back
 *          for a monospaced family: every character 0.6 em wide. Next.js gives a monospaced family Arial, whose
 *          proportional widths no monospaced font has.
 *   cjk  — the Japanese face of each platform: Hiragino Sans (macOS, iOS), Yu Gothic and Meiryo (Windows), Noto Sans
 *          CJK JP (Linux, Android). Next.js and Fontaine know Latin faces only and would hand a Japanese family Arial,
 *          which draws none of the characters the family is in the stack for — they would fall to the platform's
 *          face, unadjusted. Every one of these draws kana and kanji a full em wide, as Noto Sans JP does: what an
 *          adjusted face changes is the line's ascent and descent.
 */
export const FALLBACKS = {
  sans: {
    local: ['Arial', 'ArialMT', 'Liberation Sans', 'LiberationSans'],
    unitsPerEm: 2048,
    weights: LATIN_WEIGHTS,
    advances: { ' ': 569, a: 1139, b: 1139, c: 1024, d: 1139, e: 1139, f: 569, g: 1139, h: 1139, i: 455, j: 455, k: 1024, l: 455, m: 1706, n: 1139, o: 1139, p: 1139, q: 1139, r: 682, s: 1024, t: 569, u: 1139, v: 1024, w: 1479, x: 1024, y: 1024, z: 1024 },
  },
  mono: {
    local: ['Courier New', 'CourierNewPSMT', 'Liberation Mono', 'LiberationMono'],
    unitsPerEm: 2048,
    weights: LATIN_WEIGHTS,
    advances: Object.fromEntries(Object.keys(LATIN_WEIGHTS).map((ch) => [ch, 1229])),
  },
  cjk: {
    local: ['Hiragino Sans', 'HiraginoSans-W3', 'Hiragino Kaku Gothic ProN', 'HiraKakuProN-W3', 'Yu Gothic', 'YuGothic-Regular', 'Meiryo', 'Noto Sans CJK JP', 'NotoSansCJKjp-Regular'],
    unitsPerEm: 1000,
    weights: JAPANESE_WEIGHTS,
    advances: Object.fromEntries(Object.keys(JAPANESE_WEIGHTS).map((ch) => [ch, 1000])),
  },
};

/** The kind of fallback each family of our sites' default stacks takes (FALLBACKS), and the name of its face. */
export const METRIC_FALLBACKS = { Inter: 'sans', 'Noto Sans JP': 'cjk', 'Roboto Mono': 'mono' };
export const fallbackFamily = (family) => `${family} Fallback`;

/**
 * A font's average advance, as a fraction of its em, weighted by `weights` over the characters it holds.
 * @param {{ unitsPerEm: number, advances: Record<string, number> }} metrics
 * @param {Record<string, number>} weights
 */
export function averageAdvance({ unitsPerEm, advances }, weights) {
  let sum = 0;
  let weight = 0;
  for (const [ch, w] of Object.entries(weights)) {
    if (advances[ch] === undefined) continue;
    sum += advances[ch] * w;
    weight += w;
  }
  if (!weight) throw new Error('font-metrics: the font holds none of the characters its average advance is weighed over');
  return sum / weight / unitsPerEm;
}

/**
 * The descriptors of a fallback face that draws at the web font's average width and line height.
 * @param {{ unitsPerEm: number, ascent: number, descent: number, lineGap: number, average: number }} web the web font's metrics, `average` its average advance per em
 * @param {number} fallbackAverage the fallback's average advance per em
 * @returns {{ sizeAdjust: number, ascentOverride: number, descentOverride: number, lineGapOverride: number }} fractions (1 is 100%)
 */
export function overrides(web, fallbackAverage) {
  const sizeAdjust = web.average / fallbackAverage;
  const em = web.unitsPerEm * sizeAdjust;
  return { sizeAdjust, ascentOverride: web.ascent / em, descentOverride: Math.abs(web.descent) / em, lineGapOverride: web.lineGap / em };
}

/** A fraction as a CSS percentage, to four decimals: `107.3469%`. */
export const percent = (value) => `${Number((value * 100).toFixed(4))}%`;

/**
 * The fallback face of a family, from the files it is registered from.
 * @param {string} family a family of METRIC_FALLBACKS
 * @param {{ file: string, ranges: [number, number][] }[]} faces the family's faces: the file each is drawn from and the code points it holds
 * @param {(bytes: Uint8Array) => Promise<Uint8Array>} toSfnt decompresses a WOFF2 file (icon-font.js `sfnt()`)
 * @returns {Promise<{ family: string, local: string[], sizeAdjust: number, ascentOverride: number, descentOverride: number, lineGapOverride: number }>}
 */
export async function fallbackFace(family, faces, toSfnt) {
  const kind = FALLBACKS[METRIC_FALLBACKS[family]];
  if (!kind) throw new Error(`font-metrics: no fallback is known for "${family}" (METRIC_FALLBACKS)`);
  // Each character is read from the file whose range holds it (a family split by Unicode range keeps kana in one
  // file and Latin in another); the vertical metrics are the same in every file of a family.
  const holds = (face, cp) => face.ranges.some(([first, last]) => cp >= first && cp <= last);
  const read = new Map();
  const metricsOf = async (file) => {
    if (!read.has(file)) read.set(file, readMetrics(await toSfnt(fs.readFileSync(file)), Object.keys(kind.weights).join('')));
    return read.get(file);
  };
  const first = await metricsOf(faces[0].file);
  const advances = {};
  for (const ch of Object.keys(kind.weights)) {
    const face = faces.find((f) => holds(f, ch.codePointAt(0)));
    if (!face) continue;
    const metrics = await metricsOf(face.file);
    if (metrics.unitsPerEm !== first.unitsPerEm) throw new Error(`font-metrics: the files of "${family}" have different ems`);
    if (metrics.advances[ch] !== undefined) advances[ch] = metrics.advances[ch];
  }
  const web = { ...first, average: averageAdvance({ unitsPerEm: first.unitsPerEm, advances }, kind.weights) };
  return { family: fallbackFamily(family), local: kind.local, ...overrides(web, averageAdvance(kind, kind.weights)) };
}
