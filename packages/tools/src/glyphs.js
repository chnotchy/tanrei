// The glyph names of the icon set that Tanrei's components and our docs site draw, written as generated lists:
//
//   packages/web/src/generated/glyphs.json   what the components draw — the names in the specs and in the web
//                                            components' code — and the axis values the shipped systems use.
//                                            `tanrei build` prints it, so a product can cut its own icon font
//                                            down to these names and its own.
//   apps/docs/src/generated/glyphs.json      what the docs site's own sources draw besides: its pages and
//                                            components, and the Theme Studio it hosts.
//
//   node packages/tools/src/glyphs.js        (pnpm generate runs it; pnpm drift fails while a list is stale)
//
// A list is read from the sources, never kept by hand: a word of the sources is a glyph name when the icon set draws
// it as a glyph (the font is asked, by shaping it) AND it stands where a name is written —
//   - in a spec, a fixture's or a default's value of a glyph prop (`icon`, `leadingIcon`, `glyph`…), of a slot, or
//     of an item's content;
//   - in code (TypeScript, JavaScript, CSS), a string that is the whole word, `'expand_more'` or `content: 'check'`,
//     or the whole text of an element of a template, `<slot>expand_more</slot>` (comments are not read);
//   - in a page (MDX, Astro), the same, and an attribute's value, `icon="favorite"`.
// That is an upper bound: a word such as `start` or `label` that the icon set also draws is kept wherever code
// writes it as a string. A kept word costs the subset a glyph (about half a kilobyte, with its filled twin); a name
// left out would draw as its letters, so the lists err on the side of keeping.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fontFiles } from './font-faces.js';
import { iconFont } from './icon-font.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export const COMPONENT_GLYPHS = 'packages/web/src/generated/glyphs.json';
export const DOCS_GLYPHS = 'apps/docs/src/generated/glyphs.json';

/** The family whose font answers which words are glyph names: the default system's icon family (ref.typeface.icon). */
export const NAMING_FAMILY = 'Material Symbols Rounded';

/** The places read, relative to the repository: [directory, file pattern, what is left out]. */
const COMPONENT_SOURCES = [
  // highlight/ (the code highlighter's grammars) and links/ (the link checker) draw no glyph; generated/ is read
  // from its own sources.
  ['packages/web/src', /\.(ts|css)$/, /(^|\/)(generated|links|highlight)\/|\.test\.ts$|\.d\.ts$/],
];
const DOCS_SOURCES = [
  ['apps/docs/src', /\.(mdx|md|astro|ts|mjs|js)$/, /(^|\/)generated\//],
  ['packages/studio/src', /\.(ts|js)$/, /\.test\.(ts|js)$|\.d\.ts$/],
];

const WORD = /^[a-z0-9_]+$/;

function files(root, [dir, pattern, skip]) {
  const out = [];
  const walk = (rel) => {
    if (!fs.existsSync(path.join(root, rel))) return;
    for (const entry of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
      const child = `${rel}/${entry.name}`;
      if (entry.name === 'node_modules' || skip.test(`${child.slice(dir.length + 1)}${entry.isDirectory() ? '/' : ''}`)) continue;
      if (entry.isDirectory()) walk(child);
      else if (pattern.test(entry.name)) out.push(child);
    }
  };
  walk(dir);
  return out.sort();
}

/** Comments out of code: block comments, and line comments that begin a line or follow code (never `//` inside a URL string). */
const uncommented = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[\s;,{}()])\/\/.*$/gm, '$1').replace(/<!--[\s\S]*?-->/g, '');

/**
 * The words of `text` that stand where a glyph name is written (see the head of this file). `code`: a template
 * literal that is the whole word counts too — in code; in Markdown a word between backticks is inline code.
 */
export function writtenWords(text, { code = true } = {}) {
  const words = new Set();
  const source = uncommented(text);
  const pattern = code ? /'([a-z0-9_]+)'|"([a-z0-9_]+)"|`([a-z0-9_]+)`|>\s*([a-z0-9_]+)\s*</g : /'([a-z0-9_]+)'|"([a-z0-9_]+)"|()>\s*([a-z0-9_]+)\s*</g;
  for (const m of source.matchAll(pattern)) words.add(m[1] || m[2] || m[3] || m[4]);
  return words;
}

const GLYPH_KEY = /^(icon|glyph|content)$|[a-z](Icon|Glyph)$/;

/** The words a spec gives a glyph prop, a slot or an item's content: in its fixtures, and as a prop's default. */
export function specWords(spec) {
  const words = new Set();
  const take = (value) => {
    if (typeof value === 'string') words.add(value);
    else if (Array.isArray(value)) value.forEach(take);
  };
  const walk = (value) => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== 'object') return;
    for (const [key, inner] of Object.entries(value)) {
      if (key === 'slots' && inner && typeof inner === 'object' && !Array.isArray(inner)) Object.values(inner).forEach(take);
      else if (GLYPH_KEY.test(key)) take(inner);
      walk(inner);
    }
  };
  walk(spec.fixtures ?? []);
  const props = [spec.props ?? [], ...Object.values(spec.items ?? {}).map((item) => item?.props ?? [])].flat();
  for (const prop of props) if (prop && GLYPH_KEY.test(prop.name ?? '') && typeof prop.default === 'string') words.add(prop.default);
  return words;
}

/**
 * The axis values the shipped systems draw icons at, read from the resolved tokens (design/tokens/, every system and
 * scheme): the fills (sys.icon.fill.*), the weights (sys.icon.weight, sys.icon.mark.weight and the component tokens of
 * a control's own mark, which alias them) and the optical sizes (sys.icon.optical-size.*). The grade is the one the
 * web's glyph rule writes (packages/web/src/styles/icons.ts): no token moves it.
 * @returns {Record<'FILL'|'wght'|'GRAD'|'opsz', [number, number]>} each axis's lowest and highest value
 */
export function iconAxes(root = ROOT) {
  const seen = { FILL: [], wght: [], opsz: [] };
  const walk = (node, at) => {
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('$') || !value || typeof value !== 'object') continue;
      const id = at ? `${at}.${key}` : key;
      if (!('$value' in value)) {
        walk(value, id);
        continue;
      }
      if (typeof value.$value !== 'number') continue;
      if (/\.sys\.icon\.fill\./.test(id)) seen.FILL.push(value.$value);
      else if (/\.sys\.icon\.optical-size\./.test(id)) seen.opsz.push(value.$value);
      else if (/\.sys\.icon\.(mark\.)?weight$|\.comp\..*\.weight$/.test(id)) seen.wght.push(value.$value);
    }
  };
  const dir = path.join(root, 'design/tokens');
  const documents = (rel) => fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? documents(path.join(rel, e.name)) : e.name.endsWith('.tokens.json') ? [path.join(rel, e.name)] : []));
  for (const file of documents('.')) walk(JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')), '');
  const icons = fs.readFileSync(path.join(root, 'packages/web/src/styles/icons.ts'), 'utf8');
  const grade = icons.match(/'GRAD' (-?\d+(?:\.\d+)?)/);
  if (!grade) throw new Error("glyphs: packages/web/src/styles/icons.ts writes no 'GRAD' value — say which grade icons are drawn at");
  const span = (axis) => {
    if (!seen[axis].length) throw new Error(`glyphs: no token of design/tokens gives the icon axis ${axis}`);
    return [Math.min(...seen[axis]), Math.max(...seen[axis])];
  };
  return { FILL: span('FILL'), wght: span('wght'), GRAD: [Number(grade[1]), Number(grade[1])], opsz: span('opsz') };
}

/** The font that answers which words are glyph names: the default icon family's full file, from packages/web's development dependencies (in this repository, whatever tree is read). */
export function namingFont() {
  const [file] = fontFiles(NAMING_FAMILY, path.join(ROOT, 'packages/web'));
  return fs.readFileSync(file);
}

/**
 * The two lists, as the files hold them.
 * @returns {Promise<Record<string, object>>} repository path → document
 */
export async function glyphLists(root = ROOT) {
  const font = await iconFont(namingFont());
  const names = font.names();
  const found = (words) => [...words].filter((word) => WORD.test(word) && names.has(word)).sort();
  const read = (sources) => {
    const words = new Set();
    for (const source of sources) for (const file of files(root, source)) for (const word of writtenWords(fs.readFileSync(path.join(root, file), 'utf8'), { code: !/\.mdx?$/.test(file) })) words.add(word);
    return words;
  };
  const specWordSet = new Set();
  const specs = path.join(root, 'specs');
  for (const file of fs.existsSync(specs) ? fs.readdirSync(specs).filter((f) => f.endsWith('.spec.json')).sort() : []) for (const word of specWords(JSON.parse(fs.readFileSync(path.join(specs, file), 'utf8')))) specWordSet.add(word);
  const components = found(new Set([...specWordSet, ...read(COMPONENT_SOURCES)]));
  const docs = found(read(DOCS_SOURCES));
  return {
    [COMPONENT_GLYPHS]: {
      $comment: 'GENERATED by packages/tools/src/glyphs.js (pnpm generate) — do not edit. The glyph names of the icon set that Tanrei\'s components may draw: every name in specs/*.spec.json and in the web components\' code, an upper bound. `axes` are the values the shipped systems draw icons at (the resolved tokens). A product that cuts its icon font down keeps these names, its own, and these axes.',
      iconSet: 'material-symbols',
      axes: iconAxes(root),
      glyphs: components,
    },
    [DOCS_GLYPHS]: {
      $comment: 'GENERATED by packages/tools/src/glyphs.js (pnpm generate) — do not edit. The glyph names the docs site\'s own sources draw (its pages and components, and the Theme Studio it hosts); with packages/web/src/generated/glyphs.json, the names its icon font is cut down to.',
      glyphs: docs,
    },
  };
}

/** A list as its file holds it: one name to a line, so that two changes that add names merge. */
export const serialize = (doc) => `${JSON.stringify(doc, null, 2).replace(/\[\n\s+(-?[\d.]+),\n\s+(-?[\d.]+)\n\s+\]/g, '[$1, $2]')}\n`;

/** The names a glyph list file holds (either file). */
export const readGlyphs = (file) => JSON.parse(fs.readFileSync(file, 'utf8')).glyphs;

// Run from the root of the tree it reads and writes (pnpm generate and pnpm drift run it from the repository's).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.cwd();
  for (const [rel, doc] of Object.entries(await glyphLists(root))) {
    const file = path.join(root, rel);
    const text = serialize(doc);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) fs.writeFileSync(file, text);
    console.log(`✔ glyphs: ${rel} (${doc.glyphs.length} names)`);
  }
}
