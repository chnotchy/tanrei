// An icon font cut down to the glyphs a site draws, built with HarfBuzz (its WebAssembly build: no Python, no native
// code) — for our own sites, which register Material Symbols from a development-only @fontsource package
// (font-faces.js). The full file of Material Symbols Rounded is 5.4 MB, every glyph at every value of four axes; a page
// of the docs draws a few dozen of them at the values the tokens name.
//
// What a ligature icon font needs, and why each step is here:
//   - a glyph is reached by shaping its NAME: `expand_more` becomes one glyph through the font's ligature lookups
//     (Material Symbols writes them in `rlig` and `rclt`). The subset keeps the letters, the lookups and the glyphs the
//     names become — and nothing that layout closure would add (every icon is reachable from the letters a–z, so with
//     closure on the subset is the whole font);
//   - the FILL axis swaps a glyph for its `.fill` twin through the font's feature variations: each name is shaped at
//     both ends of the axis, and both glyphs are kept;
//   - an axis the tokens never move is pinned, a range they stay within is cut to it (`iconAxes()` in glyphs.js says
//     which), so the variation data of the rest is not shipped.
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const HB_MEMORY_MODE_WRITABLE = 2;
const HB_SUBSET_SETS_LAYOUT_FEATURE_TAG = 6;
const HB_SUBSET_FLAGS_NO_LAYOUT_CLOSURE = 0x00000200;
const tag = (name) => [...name].reduce((value, ch) => (value << 8) + ch.charCodeAt(0), 0) >>> 0;

/** The layout features a ligature icon font is drawn with: Material Symbols has `rlig` and `rclt`; the others are kept where a font of the same kind has them. */
export const LIGATURE_FEATURES = ['liga', 'rlig', 'calt', 'rclt', 'ccmp'];

let shaping;
const harfbuzz = () => (shaping ??= import('harfbuzzjs'));

let subsetting;
async function subsetter() {
  subsetting ??= (async () => {
    const { instance } = await WebAssembly.instantiate(fs.readFileSync(require.resolve('harfbuzzjs/dist/harfbuzz-subset.wasm')));
    instance.exports._initialize();
    return instance.exports;
  })();
  return subsetting;
}

// The WOFF2 coder hands back a view of its own memory, which its next call writes over: one call at a time, each
// result copied out before the next begins.
let woff2Queue = Promise.resolve();
const woff2 = (method, data) => {
  const run = woff2Queue.then(async () => new Uint8Array(await require('wawoff2')[method](data)).slice());
  woff2Queue = run.catch(() => {});
  return run;
};

/** A WOFF2 (or TrueType) file as TrueType bytes: HarfBuzz reads SFNT only. */
export async function sfnt(bytes) {
  const data = new Uint8Array(bytes.buffer ?? bytes, bytes.byteOffset ?? 0, bytes.byteLength);
  const isWoff2 = data[0] === 0x77 && data[1] === 0x4f && data[2] === 0x46 && data[3] === 0x32; // 'wOF2'
  return isWoff2 ? woff2('decompress', data) : data;
}

/**
 * An icon font, ready to shape names with.
 * @param {Uint8Array | Buffer} bytes the font file (WOFF2 or TrueType)
 */
export async function iconFont(bytes) {
  const hb = await harfbuzz();
  const ttf = await sfnt(bytes);
  const face = new hb.Face(new hb.Blob(ttf.slice().buffer));
  const font = new hb.Font(face);
  /** The glyphs `text` is shaped to, at these axis values (`{ FILL: 1 }`). */
  const shape = (text, axes = {}) => {
    const buffer = new hb.Buffer();
    buffer.addText(text);
    buffer.guessSegmentProperties();
    font.setVariations(Object.entries(axes).map(([axis, value]) => new hb.Variation(axis, value)));
    hb.shape(font, buffer);
    return buffer.getGlyphInfos().map((info) => info.codepoint);
  };
  const glyphName = (gid) => font.glyphName(gid);
  /**
   * The glyph `name` is drawn as — one glyph, other than .notdef: a name of two letters or more that shapes to one
   * glyph is a ligature, the glyph's own name or another name the font gives it (`draft` draws the glyph `note`,
   * `location_on` the glyph `place`) — or null.
   */
  const glyphOf = (name, axes = {}) => {
    const glyphs = shape(name, axes);
    return name.length > 1 && glyphs.length === 1 && glyphs[0] !== 0 ? glyphs[0] : null;
  };
  /**
   * The icon glyphs' own names, confirmed by shaping (a name that starts with a digit is written `_360`). The font
   * draws other names too, as one of these glyphs (`draft`, `location_on`): ask `glyphOf()` whether it draws a word.
   */
  const names = () => {
    const out = new Set();
    const maxp = face.referenceTable('maxp');
    const count = (maxp[4] << 8) | maxp[5]; // maxp.numGlyphs
    for (let gid = 1; gid < count; gid += 1) {
      const name = glyphName(gid);
      if (!name || name.includes('.')) continue;
      const word = name.replace(/^_(?=\d)/, '');
      if (/^[a-z0-9_]+$/.test(word) && word.length > 1 && glyphOf(word) === gid) out.add(word);
    }
    return out;
  };
  return { face, font, shape, glyphOf, glyphName, names, axes: () => face.getAxisInfos() };
}

/**
 * The font cut down to `names`.
 * @param {Uint8Array | Buffer} bytes the full font (WOFF2 or TrueType)
 * @param {Iterable<string>} names the glyph names to keep; one the font does not draw as a glyph is an error
 * @param {{ pin?: Record<string, number>, ranges?: Record<string, [number, number]>, format?: 'woff2' | 'sfnt' }} [options]
 *   `pin` — axes fixed at one value (`{ GRAD: 0 }`); `ranges` — axes cut to a range (`{ wght: [300, 500] }`)
 * @returns {Promise<Uint8Array>}
 */
export async function subsetIconFont(bytes, names, { pin = {}, ranges = {}, format = 'woff2' } = {}) {
  const ttf = await sfnt(bytes);
  const shaper = await iconFont(ttf);
  const axes = shaper.axes();
  const glyphs = new Set([0]); // .notdef
  const unknown = [];
  const codepoints = new Set();
  for (const name of new Set(names)) {
    const rest = shaper.glyphOf(name, { FILL: axes.FILL?.min ?? 0 });
    if (rest === null) {
      unknown.push(name);
      continue;
    }
    glyphs.add(rest);
    if (axes.FILL) glyphs.add(shaper.glyphOf(name, { FILL: axes.FILL.max }) ?? rest);
    for (const ch of name) codepoints.add(ch.codePointAt(0));
  }
  if (unknown.length) throw new Error(`icon-font: the font draws no glyph named ${unknown.map((n) => `"${n}"`).join(', ')}`);

  const hb = await subsetter();
  const heap = () => new Uint8Array(hb.memory.buffer);
  const pointer = hb.malloc(ttf.byteLength);
  heap().set(ttf, pointer);
  const blob = hb.hb_blob_create(pointer, ttf.byteLength, HB_MEMORY_MODE_WRITABLE, 0, 0);
  const face = hb.hb_face_create(blob, 0);
  hb.hb_blob_destroy(blob);
  const input = hb.hb_subset_input_create_or_fail();
  try {
    if (!input) throw new Error('icon-font: hb_subset_input_create_or_fail failed');
    const unicodes = hb.hb_subset_input_unicode_set(input);
    for (const codepoint of codepoints) hb.hb_set_add(unicodes, codepoint);
    const gids = hb.hb_subset_input_glyph_set(input);
    for (const gid of glyphs) hb.hb_set_add(gids, gid);
    const features = hb.hb_subset_input_set(input, HB_SUBSET_SETS_LAYOUT_FEATURE_TAG);
    hb.hb_set_clear(features);
    for (const feature of LIGATURE_FEATURES) hb.hb_set_add(features, tag(feature));
    hb.hb_subset_input_set_flags(input, hb.hb_subset_input_get_flags(input) | HB_SUBSET_FLAGS_NO_LAYOUT_CLOSURE);
    for (const [axis, value] of Object.entries(pin)) {
      if (!hb.hb_subset_input_pin_axis_location(input, face, tag(axis), value)) throw new Error(`icon-font: cannot pin ${axis} at ${value}`);
    }
    for (const [axis, [min, max]] of Object.entries(ranges)) {
      if (!hb.hb_subset_input_set_axis_range(input, face, tag(axis), min, max, Number.NaN)) throw new Error(`icon-font: cannot cut ${axis} to ${min}–${max}`);
    }
    const subset = hb.hb_subset_or_fail(face, input);
    if (!subset) throw new Error('icon-font: hb_subset_or_fail failed');
    const result = hb.hb_face_reference_blob(subset);
    const offset = hb.hb_blob_get_data(result, 0);
    const out = heap().slice(offset, offset + hb.hb_blob_get_length(result));
    hb.hb_blob_destroy(result);
    hb.hb_face_destroy(subset);
    if (!out.byteLength) throw new Error('icon-font: the subset is empty');
    return format === 'sfnt' ? out : await woff2('compress', out);
  } finally {
    if (input) hb.hb_subset_input_destroy(input);
    hb.hb_face_destroy(face);
    hb.free(pointer);
  }
}
