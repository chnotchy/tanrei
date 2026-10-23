// The image a shared link of a page shows (1200 × 630, `og:image`), made where the site is built: the wordmark, the
// page's title and description in the page's language, and on a component's page the five platforms' status. Every
// value it is drawn with comes from somewhere else — the colors from the light scheme's `sys.color.*`, the type from
// `sys.typescale.*` (its family, weight, tracking and leading; the image sets it larger, by one factor for each
// role), the words from the page and from lib/i18n.ts — and the text is set as outlines, so the image is the same on
// every machine that builds it: no system font is asked for.
//
// The text is shaped by HarfBuzz (its WebAssembly build) from the font files the site already registers, read from
// their @fontsource packages: Inter for Latin, Noto Sans JP for Japanese. A language whose script none of those draws
// names its face in i18n/locales.mjs (`imageFaces`); a language with no face at all is given the English page's image.
//
// The wordmark is the only mark (design/brand/README.md: one mark at a time, and the wordmark wherever the name is
// read); it is the generated copy painted in the light scheme's on-surface, drawn as it is.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import * as hb from 'harfbuzzjs';
import sharp from 'sharp';
import { FONT_PACKAGES } from '../../../../packages/tools/src/font-faces.js';
import { sfnt } from '../../../../packages/tools/src/icon-font.js';
import { SOCIAL } from './brand.mjs';

export { SOCIAL };

/**
 * Where a family's package is a dependency, when it is not one of the site's own: the site registers no Arabic face
 * for its pages (styles/tanrei-theme.css gives them the reader's own, and a dependency of the site would be registered
 * for every page by packages/tools/src/font-faces.js), so the image takes the face the Theme Studio app registers for
 * its Arabic interface.
 */
const FACE_FROM = { 'Noto Sans Arabic': 'packages/studio' };

// ── Fonts ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** `U+0041-005A,U+00C0` → [[0x41, 0x5a], [0xc0, 0xc0]] */
const ranges = (text) =>
  text.split(',').map((part) => {
    const [from, to] = part.trim().replace(/^U\+/i, '').split('-');
    if (from.includes('?')) return [parseInt(from.replaceAll('?', '0'), 16), parseInt(from.replaceAll('?', 'F'), 16)];
    return [parseInt(from, 16), parseInt(to ?? from, 16)];
  });

/**
 * A family as its package's stylesheet registers it: one file for each subset, with the characters it covers. A file
 * is read and decompressed only when a character it covers is set.
 */
function familyFiles(family, repoRoot) {
  const entry = FONT_PACKAGES[family];
  if (!entry) throw new Error(`social image: no package is known for "${family}" (packages/tools/src/font-faces.js)`);
  const from = path.join(repoRoot, FACE_FROM[family] ?? 'apps/docs');
  const sheet = createRequire(path.join(from, 'package.json')).resolve(`${entry[0]}/${entry[1]}`);
  const css = fs.readFileSync(sheet, 'utf8');
  return [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)]
    .map(([, body]) => ({ file: body.match(/url\(\.\/([^)]+)\)/)?.[1], range: body.match(/unicode-range:\s*([^;]+);/)?.[1], style: body.match(/font-style:\s*(\w+)/)?.[1] }))
    .filter((face) => face.file && face.style !== 'italic')
    .map((face) => ({ family, file: path.join(path.dirname(sheet), face.file), ranges: face.range ? ranges(face.range) : [[0, 0x10ffff]], loaded: undefined }));
}

async function load(face) {
  face.loaded ??= (async () => {
    const data = await sfnt(fs.readFileSync(face.file));
    const hbFace = new hb.Face(new hb.Blob(data.slice().buffer));
    const fonts = new Map();
    /** The face at a weight (its `wght` axis), and the outlines of its glyphs at that weight. */
    const at = (weight) => {
      if (!fonts.has(weight)) {
        const font = new hb.Font(hbFace);
        if (hbFace.getAxisInfos().wght) font.setVariations([new hb.Variation('wght', weight)]);
        fonts.set(weight, { font, paths: new Map() });
      }
      return fonts.get(weight);
    };
    return { upem: hbFace.upem, at, has: (cp) => at(400).font.nominalGlyph(cp) !== undefined };
  })();
  return face.loaded;
}

/**
 * The fonts text is set in, first to last: each character is set in the first face that has it (a face that covers
 * it by its range is read, then asked).
 * @param {string[]} families the families, in the order of a `font-family` list (one with no package is skipped)
 * @param {string} repoRoot the repository's root
 */
export function fontStack(families, repoRoot) {
  const key = `${repoRoot}\n${families.join('\n')}`;
  if (!stacks.has(key)) stacks.set(key, makeStack(families, repoRoot));
  return stacks.get(key);
}

/** The stacks made, by their families: a build makes one image for each page, and reads each font file once. */
const stacks = new Map();
const familiesRead = new Map();

function makeStack(families, repoRoot) {
  const filesOf = (family) => {
    const key = `${repoRoot}\n${family}`;
    if (!familiesRead.has(key)) familiesRead.set(key, familyFiles(family, repoRoot));
    return familiesRead.get(key);
  };
  const faces =families.filter((family) => FONT_PACKAGES[family] && !/^Material/.test(family)).flatMap(filesOf);
  const found = new Map();
  /** The face that sets `cp`, or undefined. */
  const faceOf = async (cp) => {
    if (found.has(cp)) return found.get(cp);
    let chosen;
    for (const face of faces) {
      if (!face.ranges.some(([a, b]) => cp >= a && cp <= b)) continue;
      if ((await load(face)).has(cp)) {
        chosen = face;
        break;
      }
    }
    found.set(cp, chosen);
    return chosen;
  };
  return { faces, faceOf };
}

// ── Setting text ─────────────────────────────────────────────────────────────────────────────────────────────────

// Arabic by its script extensions: the tatweel and the Arabic comma are of the common script, used by Arabic.
const ARABIC = /\p{Script_Extensions=Arabic}/u;
const STRONG = /[\p{L}\p{N}]/u;
const MARK = /[\p{M}‌‍︀-️]/u;
const SPACE = /\s/u;
// Where a line of Japanese may break: between two characters of which one is Japanese, except before a closing mark,
// a small kana or a prolonged sound mark, and after an opening one (JIS X 4051's line-start and line-end rules).
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}　-〿＀-￯]/u;
const NO_START = /[、。，．・：；？！ー」』）］｝〕〉》】ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶ々〻‐゠–〜～…‥]/u;
const NO_END = /[「『（［｛〔〈《【]/u;

/** The text as the units a line may break between, each with the space that follows it. */
export function breakUnits(text) {
  const units = [];
  let unit = '';
  let previous = '';
  for (const ch of text) {
    const breaks =
      unit !== '' &&
      ((SPACE.test(previous) && !SPACE.test(ch)) ||
        (!SPACE.test(ch) && !SPACE.test(previous) && (CJK.test(ch) || CJK.test(previous)) && !NO_START.test(ch) && !NO_END.test(previous) && !MARK.test(ch)));
    if (breaks) {
      units.push(unit);
      unit = '';
    }
    unit += ch;
    previous = ch;
  }
  if (unit) units.push(unit);
  return units;
}

/**
 * A line's runs in visual order, each of one direction (`rtl`: Arabic): in a right-to-left paragraph a run of Latin
 * letters and digits keeps its own order, and the runs stand from right to left. A neutral character (a space, a
 * mark of punctuation) between two runs of one direction takes theirs, and the paragraph's otherwise — the rule the
 * Unicode Bidirectional Algorithm gives the text these pages hold.
 */
export function bidiRuns(text, paragraph) {
  const chars = [...text];
  const strong = chars.map((ch) => (ARABIC.test(ch) ? 'rtl' : STRONG.test(ch) ? 'ltr' : undefined));
  const dirs = strong.map((dir, i) => {
    if (dir) return dir;
    const before = strong.slice(0, i).reverse().find(Boolean);
    const after = strong.slice(i + 1).find(Boolean);
    return before && before === after ? before : paragraph;
  });
  const runs = [];
  for (const [i, ch] of chars.entries()) {
    const last = runs.at(-1);
    if (last && last.dir === dirs[i]) last.text += ch;
    else runs.push({ dir: dirs[i], text: ch });
  }
  return paragraph === 'rtl' ? runs.reverse() : runs;
}

/**
 * Text set in one line: its glyphs as outlines placed from x = 0 on the baseline, and its width.
 * @param {ReturnType<typeof fontStack>} stack
 * @param {{ size: number, weight: number, tracking: number, lang: string, dir: 'ltr' | 'rtl' }} style `tracking` in em, given to Latin text only
 */
export async function setLine(text, stack, style) {
  const glyphs = [];
  let x = 0;
  for (const run of bidiRuns(text, style.dir)) {
    // The run in pieces of one face each, in logical order; a mark or a neutral character stays with the face before it
    // where that face has it.
    const pieces = [];
    for (const ch of run.text) {
      const cp = ch.codePointAt(0);
      const last = pieces.at(-1);
      const keep = last && (MARK.test(ch) || !STRONG.test(ch)) && (await load(last.face)).has(cp);
      const face = keep ? last.face : await stack.faceOf(cp);
      if (!face) throw new Error(`social image: no face of ${stack.faces.map((f) => f.family).filter((f, i, all) => all.indexOf(f) === i).join(', ')} sets “${ch}” (U+${cp.toString(16).toUpperCase().padStart(4, '0')}) in “${text}”`);
      if (last && last.face === face) last.text += ch;
      else pieces.push({ face, text: ch });
    }
    for (const piece of run.dir === 'rtl' ? pieces.reverse() : pieces) {
      const font = await load(piece.face);
      const { font: hbFont, paths } = font.at(style.weight);
      const buffer = new hb.Buffer();
      buffer.addText(piece.text);
      buffer.guessSegmentProperties();
      buffer.setDirection(run.dir === 'rtl' ? hb.Direction.RTL : hb.Direction.LTR);
      buffer.setLanguage(style.lang);
      hb.shape(hbFont, buffer);
      const scale = style.size / font.upem;
      const tracking = piece.face.family === 'Inter' ? style.tracking * style.size : 0;
      for (const glyph of buffer.getGlyphInfosAndPositions()) {
        if (!paths.has(glyph.codepoint)) paths.set(glyph.codepoint, hbFont.glyphToPath(glyph.codepoint));
        const d = paths.get(glyph.codepoint);
        if (d) glyphs.push({ d, x: x + (glyph.xOffset ?? 0) * scale, y: -(glyph.yOffset ?? 0) * scale, scale });
        x += (glyph.xAdvance ?? 0) * scale + tracking;
      }
    }
  }
  return { glyphs, width: x };
}

/**
 * Text set in lines at most `width` wide: broken between units (`breakUnits`), at most `maxLines` of them, the last
 * one cut short with an ellipsis where the text goes on.
 */
export async function setLines(text, stack, style, { width, maxLines }) {
  const units = breakUnits(text.replace(/\s+/g, ' ').trim());
  // Each unit is measured once, with and without the space after it; a line is as wide as its units (a unit ends at a
  // space or between two characters that no pair kerning joins), and is shaped whole once it is chosen.
  const measured = [];
  for (const unit of units) measured.push({ full: (await setLine(unit, stack, style)).width, end: (await setLine(unit.trimEnd(), stack, style)).width });
  const lines = [];
  let at = 0;
  while (at < units.length && lines.length < maxLines) {
    let end = at + 1;
    let used = measured[at].full;
    while (end < units.length && used + measured[end].end <= width) {
      used += measured[end].full;
      end += 1;
    }
    lines.push({ ...(await setLine(units.slice(at, end).join('').trimEnd(), stack, style)), end });
    at = end;
  }
  const cut = at < units.length || (lines.length > 0 && lines.at(-1).width > width);
  if (cut && lines.length > 0) {
    // The last line, shortened until it holds the ellipsis.
    const last = lines.length - 1;
    const start = last === 0 ? 0 : lines[last - 1].end;
    let end = lines[last].end;
    let line;
    do {
      line = await setLine(`${units.slice(start, end).join('').trimEnd().replace(/[\s,.、。:;،]+$/u, '')}…`, stack, style);
      end -= 1;
    } while (line.width > width && end > start);
    lines[last] = { ...line, end: lines[last].end };
  }
  return { lines, cut };
}

// ── The image ────────────────────────────────────────────────────────────────────────────────────────────────────

const number = (value) => Math.round(value * 100) / 100;
const escape = (text) => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

/** A set line as SVG paths at (x, baseline), filled with `color`. */
const linePaths = (line, x, baseline, color) =>
  `<g fill="${color}">${line.glyphs.map((g) => `<path transform="matrix(${g.scale} 0 0 ${-g.scale} ${number(x + g.x)} ${number(baseline + g.y)})" d="${g.d}"/>`).join('')}</g>`;

/** The mark's root viewBox and its drawing. */
function markParts(svg) {
  const root = svg.match(/<svg\b[^>]*>/)?.[0];
  const viewBox = root?.match(/\sviewBox="([^"]*)"/)?.[1];
  if (!viewBox) throw new Error('social image: the wordmark has no viewBox');
  const [, , width, height] = viewBox.split(/[\s,]+/).map(Number);
  return { viewBox, width, height, body: svg.slice(svg.indexOf(root) + root.length, svg.lastIndexOf('</svg>')).replace(/<!--[\s\S]*?-->/g, '').trim() };
}

/**
 * A type role of `sys.typescale` as the image sets it: its family list, weight, tracking (in em) and leading, at
 * `factor` times its size.
 * @param {{ fontFamily: string[] | string, fontSize: { value: number }, fontWeight: number, letterSpacing: { value: number }, lineHeight: number }} value the token's resolved value
 */
export const typeRole = (value, factor) => ({
  families: [value.fontFamily].flat(),
  size: value.fontSize.value * factor,
  weight: value.fontWeight,
  tracking: value.letterSpacing.value / value.fontSize.value,
  leading: value.lineHeight,
});

/**
 * The status band's look of each status, as the status tags of the docs draw it: a filled dot in the status color, a
 * ring where nothing ships yet.
 */
const STATUS_COLOR = { planned: 'outline', lagging: 'warning', alpha: 'on-surface-variant', beta: 'on-surface-variant', stable: 'success', deprecated: 'error' };

/**
 * Where the baseline of a line of `size` stands in a line box of `leading` (CSS's rule: the font's ascent and descent,
 * centred in the box), from the first face of the stack.
 */
async function baselineIn(stack, size, leading) {
  const first = await load(stack.faces[0]);
  const { ascender, descender } = first.at(400).font.hExtents();
  const [ascent, descent] = [(ascender / first.upem) * size, (-descender / first.upem) * size];
  return (leading * size - ascent - descent) / 2 + ascent;
}

/**
 * The image as SVG.
 * @param {object} page
 * @param {string} [page.heading] the page's title; none on the first page of a language, whose title the wordmark is
 * @param {string} [page.description] the page's description
 * @param {string} page.lang the page's BCP 47 tag
 * @param {'ltr' | 'rtl'} page.dir
 * @param {string[]} [page.faces] the families of the language's script, beside the type tokens' (i18n/locales.mjs, `imageFaces`)
 * @param {{ label: string, status: string, word: string }[]} [page.statuses] a component's status on each platform
 * @param {object} look
 * @param {string} look.wordmark the wordmark, painted
 * @param {Record<string, string>} look.colors `sys.color.*` of the light scheme, by name, as CSS colors
 * @param {{ display: ReturnType<typeof typeRole>, body: ReturnType<typeof typeRole>, label: ReturnType<typeof typeRole> }} look.type the type roles
 * @param {string} look.host the site's host name
 * @param {{ x: number, width: number }} [look.markInk] where the wordmark's ink lies across its frame, in frame units (lib/brand-geometry.mjs, `inkBox`)
 * @param {string} repoRoot
 */
export async function socialSvg(page, look, repoRoot) {
  const { width: W, height: H } = SOCIAL;
  const pad = 80;
  const column = W - 2 * pad;
  const rtl = page.dir === 'rtl';
  const home = !page.heading;
  // A script's face stands after the first family, as the docs' theme puts it: the first (Inter) keeps Latin and digits.
  const stackOf = (role) => fontStack([role.families[0], ...(page.faces ?? []), ...role.families.slice(1)], repoRoot);
  const style = (role, size = role.size) => ({ size, weight: role.weight, tracking: role.tracking, lang: page.lang, dir: page.dir });
  const color = (name) => {
    const value = look.colors[name];
    if (!value) throw new Error(`social image: the light scheme has no sys.color.${name}`);
    return value;
  };
  /** Where a line of `width` starts: at the start edge of the page's direction, or centred on the first page. */
  const lineX = (width) => (home ? (W - width) / 2 : rtl ? W - pad - width : pad);
  const parts = [`<rect width="${W}" height="${H}" fill="${color('surface')}"/>`];

  // The wordmark: large and centred on the first page, at the start of the head on the others.
  const mark = markParts(look.wordmark);
  const markHeight = home ? 132 : 56;
  const markWidth = (markHeight * mark.width) / mark.height;
  const markTop = home ? 140 : 72;
  // Placed by its ink, not its frame: the frame has room beside the letters, and the text's edge is its ink's.
  const k = markHeight / mark.height;
  const ink = look.markInk ? { x: look.markInk.x * k, width: look.markInk.width * k } : { x: 0, width: markWidth };
  const markX = home ? (W - ink.width) / 2 - ink.x : rtl ? W - pad - ink.x - ink.width : pad - ink.x;
  parts.push(`<svg x="${number(markX)}" y="${markTop}" width="${number(markWidth)}" height="${markHeight}" viewBox="${mark.viewBox}">${mark.body}</svg>`);

  // The site's host name: at the end of the head, across from the wordmark; at the foot of the first page.
  const labelStack = stackOf(look.type.label);
  const host = await setLine(look.host, labelStack, { ...style(look.type.label), dir: 'ltr' });
  const hostBaseline = home ? H - 72 : markTop + markHeight / 2 + look.type.label.size * 0.36;
  parts.push(linePaths(host, home ? (W - host.width) / 2 : rtl ? pad : W - pad - host.width, hostBaseline, color('on-surface-variant')));

  // A component's status on each platform, in a band at the foot: the platform's name, and under it a dot of the
  // status's color and the status's word. The cells stand from the start edge and share the column's width.
  const band = page.statuses?.length ? { top: H - 72 - 84 } : undefined;
  if (band) {
    const role = look.type.label;
    const leading = role.size * role.leading;
    const nameBaseline = band.top + 20 + (await baselineIn(labelStack, role.size, role.leading));
    const wordBaseline = nameBaseline + leading;
    const dot = role.size * 0.5;
    const cells = [];
    for (const cell of page.statuses) {
      const name = await setLine(cell.label, labelStack, style(role));
      const word = await setLine(cell.word, labelStack, style({ ...role, weight: look.type.body.weight }));
      cells.push({ ...cell, name, word, width: Math.max(name.width, dot * 1.6 + word.width) });
    }
    const gap = (column - cells.reduce((sum, cell) => sum + cell.width, 0)) / (cells.length - 1);
    if (gap < role.size) throw new Error(`social image: the status band does not fit ${column} px (${cells.map((c) => c.label).join(', ')})`);
    parts.push(`<rect x="${pad}" y="${band.top}" width="${column}" height="1" fill="${color('outline')}"/>`);
    let x = rtl ? W - pad : pad;
    for (const cell of cells) {
      const left = rtl ? x - cell.width : x;
      parts.push(linePaths(cell.name, rtl ? left + cell.width - cell.name.width : left, nameBaseline, color('on-surface')));
      const dotCenter = rtl ? left + cell.width - dot / 2 : left + dot / 2;
      const wordX = rtl ? dotCenter - dot * 1.1 - cell.word.width : dotCenter + dot * 1.1;
      const tone = color(STATUS_COLOR[cell.status] ?? 'on-surface-variant');
      const cy = wordBaseline - role.size * 0.36;
      parts.push(
        cell.status === 'planned'
          ? `<circle cx="${number(dotCenter)}" cy="${number(cy)}" r="${number(dot / 2 - 1)}" fill="none" stroke="${tone}" stroke-width="2"/>`
          : `<circle cx="${number(dotCenter)}" cy="${number(cy)}" r="${number(dot / 2)}" fill="${tone}"/>`,
      );
      parts.push(linePaths(cell.word, wordX, wordBaseline, color('on-surface-variant')));
      x += (rtl ? -1 : 1) * (cell.width + gap);
    }
  }
  const bottom = band ? band.top - 32 : H - 72 - (home ? 48 : 0);

  // The title, in the display role: a step smaller each time it would take more than two lines.
  let y = home ? markTop + markHeight + 48 : markTop + markHeight + 64;
  if (page.heading) {
    const role = look.type.display;
    const stack = stackOf(role);
    let set;
    let size;
    for (size of [role.size, role.size * 0.84, role.size * 0.7]) {
      set = await setLines(page.heading, stack, style(role, size), { width: column, maxLines: 2 });
      if (!set.cut) break;
    }
    const baseline = await baselineIn(stack, size, role.leading);
    for (const line of set.lines) {
      parts.push(linePaths(line, lineX(line.width), y + baseline, color('on-surface')));
      y += size * role.leading;
    }
    y += 24;
  }

  // The description, in the body role, in the lines left above the foot.
  if (page.description) {
    const role = look.type.body;
    const stack = stackOf(role);
    const leading = role.size * role.leading;
    const maxLines = Math.min(3, Math.floor((bottom - y) / leading));
    if (maxLines > 0) {
      const set = await setLines(page.description, stack, style(role), { width: home ? column - 2 * pad : column, maxLines });
      const baseline = await baselineIn(stack, role.size, role.leading);
      for (const line of set.lines) {
        parts.push(linePaths(line, lineX(line.width), y + baseline, color('on-surface-variant')));
        y += leading;
      }
    }
  }

  const title = escape([page.heading, page.description].filter(Boolean).join(' — '));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><title>${title}</title>${parts.join('')}</svg>`;
}

/** The image as a PNG. */
export async function socialPng(page, look, repoRoot) {
  // zlib's level 6: a file 1 % larger than at level 9, written in a third of the time — the build writes one for each page.
  return sharp(Buffer.from(await socialSvg(page, look, repoRoot))).png({ compressionLevel: 6 }).toBuffer();
}

