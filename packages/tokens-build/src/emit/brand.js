// The brand marks (design/brand/): the symbol and the wordmark, each one flat shape in one color.
//
// The source of each mark is `design/brand/<mark>.svg`, written by `pnpm brand:pull` from the Figma library and never
// by hand: its shapes in `currentColor`, so a page that draws it inline paints it with a token (`color:
// var(--tanrei-sys-color-on-surface)`). Everything else is derived from that file and the tokens, here, by `pnpm
// generate`: a copy painted in each scheme's on-surface (for an image that cannot inherit a color — a README, a raster
// export) and the favicon, which follows the reader's scheme and contrast by itself.
import fs from 'node:fs';
import path from 'node:path';

/** The marks, by file name under design/brand/. */
export const MARKS = ['symbol', 'wordmark'];

/** The schemes a painted copy is made for, and the media query each answers in the favicon. */
const ADAPTIVE = [
  ['light', null],
  ['dark', '(prefers-color-scheme: dark)'],
  ['light-high', '(prefers-contrast: more)'],
  ['dark-high', '(prefers-color-scheme: dark) and (prefers-contrast: more)'],
];

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

/**
 * A mark as an SVG file exports it from Figma, made into the repository's source: the root's size and viewBox, then
 * each path with its geometry and `fill="currentColor"`. What an export adds and the mark is not — the canvas's
 * background rectangle behind the frame, layer ids, a group without attributes — is left out. Anything a flat,
 * one-color mark cannot hold (a second color, a stroke, a gradient, an image, text, a style, a transform, opacity) is
 * refused with what was found: a mark that changes in kind is a decision, not a refresh.
 * @param {string} svg the exported file
 * @param {{ source?: string }} [options] where it came from, written into the file's comment
 * @returns {string}
 */
export function normalizeMark(svg, { source } = {}) {
  const text = svg.replace(/<\?xml[^>]*\?>/g, '').replace(/<!--[\s\S]*?-->/g, '').trim();
  const root = text.match(/^<svg\b[^>]*>/)?.[0];
  if (!root || !/<\/svg>$/.test(text)) throw new Error('brand: not one <svg> element');
  const viewBox = attr(root, 'viewBox');
  const box = viewBox?.split(/[\s,]+/).map(Number);
  if (!box || box.length !== 4 || box.some(Number.isNaN)) throw new Error(`brand: the root has no usable viewBox (${viewBox})`);
  const [, , w, h] = box;
  const width = attr(root, 'width') ?? String(w);
  const height = attr(root, 'height') ?? String(h);

  const body = text.slice(root.length, -'</svg>'.length);
  const paths = [];
  const colors = new Set();
  for (const [tag, name] of body.matchAll(/<\/?([a-zA-Z][\w:-]*)\b[^>]*>/g)) {
    if (tag.startsWith('</')) continue;
    if (name === 'g') {
      const extra = [...tag.matchAll(/\s([\w:-]+)="/g)].map((m) => m[1]).filter((a) => a !== 'id');
      if (extra.length) throw new Error(`brand: a group carries ${extra.join(', ')}; a mark is flat shapes`);
      continue;
    }
    if (name === 'rect') {
      // The canvas behind the frame, which an export from the editor includes: exactly the viewBox, nothing else.
      const background = ['x', 'y'].every((a) => Number(attr(tag, a) ?? 0) === 0) && Number(attr(tag, 'width')) === w && Number(attr(tag, 'height')) === h && !/\s(rx|ry|transform|opacity|stroke)=/.test(tag);
      if (background) continue;
      throw new Error('brand: a rectangle that is not the export\'s background; draw it as a path in the mark');
    }
    if (name !== 'path') throw new Error(`brand: <${name}> in a mark; a mark is paths in one color`);
    const forbidden = [...tag.matchAll(/\s([\w:-]+)="/g)].map((m) => m[1]).filter((a) => !['id', 'd', 'fill', 'fill-rule', 'clip-rule'].includes(a));
    if (forbidden.length) throw new Error(`brand: a path carries ${forbidden.join(', ')}; a mark is flat shapes in one color`);
    const fill = attr(tag, 'fill');
    if (!fill || fill === 'none') throw new Error('brand: a path without a fill');
    if (fill.startsWith('url(')) throw new Error('brand: a path filled with a gradient or a pattern; a mark is one flat color');
    colors.add(fill.toLowerCase());
    const d = attr(tag, 'd');
    if (!d) throw new Error('brand: a path without geometry');
    const rule = attr(tag, 'fill-rule');
    paths.push(`<path d="${d}"${rule ? ` fill-rule="${rule}" clip-rule="${rule}"` : ''} fill="currentColor"/>`);
  }
  if (!paths.length) throw new Error('brand: no shape in the mark');
  if (colors.size > 1) throw new Error(`brand: the mark has ${colors.size} colors (${[...colors].join(', ')}); a mark is one color, painted by a token`);
  const note = `Pulled from ${source ?? 'the Figma library'} by \`pnpm brand:pull\`. Change the mark in Figma, not here.`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}" fill="none">\n<!-- ${note} -->\n${paths.join('\n')}\n</svg>\n`;
}

/** The mark painted in one color. */
export const paintMark = (svg, color) => svg.replaceAll('fill="currentColor"', `fill="${color}"`);

/**
 * The mark painted by a stylesheet of its own, one color for each scheme the reader's settings ask for: a file the
 * browser draws as an image (a favicon) inherits no color, and asks the media queries itself.
 * @param {string} svg the mark's source
 * @param {Record<string, string>} colors on-surface by scheme name
 */
export function adaptiveMark(svg, colors) {
  const rules = ADAPTIVE.filter(([scheme]) => colors[scheme]).map(([scheme, media]) => (media ? `@media ${media} { path { fill: ${colors[scheme]} } }` : `path { fill: ${colors[scheme]} }`));
  return paintMark(svg, colors.light).replace(/(<svg\b[^>]*>\n)/, `$1<style>${rules.join(' ')}</style>\n`);
}

const hex = (color) => color?.hex ?? (typeof color === 'string' ? color : undefined);

/**
 * Every derived file, by path from the repository root, for the marks found in `root/design/brand/`: each mark painted
 * in each scheme's on-surface, and the symbol as the favicon. A mark without its source is left out (the repository
 * before its first pull).
 * @param {string} root the repository root
 * @param {Record<string, Record<string, { value: unknown }>>} colors the model's colors by scheme, by role
 */
export function brandFiles(root, colors) {
  const onSurface = Object.fromEntries(Object.entries(colors).map(([scheme, roles]) => [scheme, hex(roles['on-surface']?.value)]));
  const files = {};
  for (const mark of MARKS) {
    const file = path.join(root, 'design/brand', `${mark}.svg`);
    if (!fs.existsSync(file)) continue;
    const svg = fs.readFileSync(file, 'utf8');
    // A source edited by hand is refused as an export would be.
    if (normalizeMark(svg, { source: svg.match(/Pulled from (.*?) by `pnpm brand:pull`/)?.[1] }) !== svg) throw new Error(`brand: design/brand/${mark}.svg is not as \`pnpm brand:pull\` writes it; pull it again`);
    const derived = svg.replace(/<!--[\s\S]*?-->/, `<!-- Generated by \`pnpm generate\` from design/brand/${mark}.svg and sys.color.on-surface. Do not edit. -->`);
    for (const scheme of ['light', 'dark']) files[`design/brand/generated/${mark}.${scheme}.svg`] = paintMark(derived, onSurface[scheme]);
    if (mark === 'symbol') files['design/brand/generated/symbol.adaptive.svg'] = adaptiveMark(derived, onSurface);
  }
  return files;
}
