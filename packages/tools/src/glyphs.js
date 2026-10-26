// The glyph names of the icon set that Tanrei's components and our docs site draw, written as generated lists:
//
//   packages/web/src/generated/glyphs.json   what the components draw — the glyphs the specs give and the web
//                                            components' code declares — and the axis values the shipped systems use.
//                                            `tanrei build` prints it, so a product can cut its own icon font
//                                            down to these names and its own.
//   apps/docs/src/generated/glyphs.json      what the docs site's own sources draw besides: its pages, their shared examples and
//                                            components, and the Theme Studio it hosts.
//
//   node packages/tools/src/glyphs.js        (pnpm generate runs it; pnpm drift fails while a list is stale)
//
// A list is read from the sources, never kept by hand: a word of the sources is a glyph name when the icon set draws
// it as a glyph (the font is asked, by shaping it) AND it stands where a glyph is written —
//   - in a spec, a fixture's or a default's value of a glyph prop (`icon`, `leadingIcon`, `glyph`…), of a slot, or
//     of an item's content;
//   - in any source (TypeScript, JavaScript, CSS, Astro, MDX, HTML; comments are not read):
//       a declared glyph constant: every string of the value of a `const` (or `readonly` field) whose name is
//         GLYPH, GLYPHS, ICON or ICONS, or ends in `_GLYPH`, `_ICONS`… — `const CLOSE_GLYPH = 'close'`,
//         `const GLYPHS = { up: 'arrow_upward' }` (an object's keys are not read);
//       a glyph prop or attribute: `icon="favorite"`, `leading-icon="search"`, `icon: 'schedule'`, `leadingIcon = 'tag'`;
//       the text of a glyph slot (`icon`, `<name>-icon`, `chevron…`, `media`) or of a bare icon:
//         `<span slot="icon">home</span>`, `<span class="tanrei-icon">home</span>`;
//       generated content: `content: 'check'`.
// Nothing else is read: a word such as `start`, `label` or `docs` that the icon set also draws is not a glyph because
// code writes it as a string. So a component spells the glyphs it draws in a declared constant (or a glyph prop's
// default, or its spec), never as a bare string or a template's text: a name left out draws as its letters.
// test/glyphs.test.js refuses a glyph name that the web components' code spells and the list leaves out (unless it is
// a word the code writes for something else and never draws), and the docs' browser test (icon-font.test.mjs) opens
// every page and fails on a drawn glyph that the cut-down file lacks.
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
  ['apps/docs/src', /\.(mdx|md|astro|ts|mjs|js|html)$/, /(^|\/)generated\//],
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

/** The name of a declared glyph constant: GLYPH, GLYPHS, ICON or ICONS, alone or as its last word (`CLOSE_GLYPH`, `GROUP_ICONS`). */
export const GLYPH_CONSTANT = /^(?:[A-Z][A-Z0-9]*_)*(?:GLYPHS?|ICONS?)$/;

/**
 * The strings of the value that starts at `from` and ends at the first `;`, `,` or line end outside brackets and
 * strings: each string literal that is not an object's key, as written.
 */
function valueStrings(source, from) {
  const strings = [];
  let depth = 0;
  for (let i = from; i < source.length; i++) {
    const c = source[i];
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1;
      while (j < source.length && source[j] !== c) j += source[j] === '\\' ? 2 : 1;
      // An object's key: after `{` or `,`, before `:` (a ternary's `? 'a' : 'b'` is not one).
      const key = /[{,]\s*$/.test(source.slice(Math.max(from, i - 40), i)) && /^\s*:/.test(source.slice(j + 1, j + 40));
      if (!key) strings.push(source.slice(i + 1, j));
      i = j;
    } else if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) {
      if (--depth < 0) break;
    } else if (depth === 0 && (c === ';' || c === ',' || (c === '\n' && i > from && /\S/.test(source.slice(from, i))))) break;
  }
  return strings;
}

/** The forms of a written glyph other than a constant (see the head of this file); each pattern's second group is the name. */
const GLYPH_FORMS = [
  // A glyph attribute of markup: `icon="favorite"`, `leading-icon="search"`, `glyph="check"`.
  /[\s{(,](?:icon|glyph|[a-z]+(?:-[a-z]+)*-(?:icon|glyph))=(["'])([a-z0-9_]+)\1/g,
  // A glyph prop of code, as a key or an assignment: `icon: 'schedule'`, `leadingIcon = 'tag'`, `this.glyph = 'add'`.
  /\b(?:icon|glyph|[a-z][A-Za-z0-9]*(?:Icon|Glyph))\s*(?::|=(?![=>]))\s*(["'`])([a-z0-9_]+)\1/g,
  // The text of a glyph slot, or of a bare icon (an element of the class `tanrei-icon`).
  /<[a-z][\w-]*\s[^<>]*?\b(?:slot=["'](?:icon|[a-z-]+-icon|chevron(?:-[a-z]+)?|media)["']|class=["'][^"']*\btanrei-icon\b[^"']*["'])[^<>]*>\s*()([a-z0-9_]+)\s*</g,
  // Generated content: `content: 'check'`.
  /\bcontent:\s*(["'])([a-z0-9_]+)\1/g,
];

/** The words of `text` that stand where a glyph is written (see the head of this file). */
export function writtenWords(text) {
  const words = new Set();
  const source = uncommented(text);
  for (const pattern of GLYPH_FORMS) for (const m of source.matchAll(pattern)) words.add(m[2]);
  for (const m of source.matchAll(/\b(?:const|readonly)\s+([A-Z][A-Z0-9_]*)\s*(?::[^=;]*)?=(?![=>])/g)) {
    if (GLYPH_CONSTANT.test(m[1])) for (const string of valueStrings(source, m.index + m[0].length)) words.add(string);
  }
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
  // A word the font draws as one glyph: an icon's own name, or another name it gives one (`draft` draws `note`).
  const found = (words) => [...words].filter((word) => WORD.test(word) && font.glyphOf(word) !== null).sort();
  const read = (sources) => {
    const words = new Set();
    for (const source of sources) for (const file of files(root, source)) for (const word of writtenWords(fs.readFileSync(path.join(root, file), 'utf8'))) words.add(word);
    return words;
  };
  const specWordSet = new Set();
  const specs = path.join(root, 'specs');
  for (const file of fs.existsSync(specs) ? fs.readdirSync(specs).filter((f) => f.endsWith('.spec.json')).sort() : []) for (const word of specWords(JSON.parse(fs.readFileSync(path.join(specs, file), 'utf8')))) specWordSet.add(word);
  const components = found(new Set([...specWordSet, ...read(COMPONENT_SOURCES)]));
  const docs = found(read(DOCS_SOURCES));
  return {
    [COMPONENT_GLYPHS]: {
      $comment: 'GENERATED by packages/tools/src/glyphs.js (pnpm generate) — do not edit. The glyph names of the icon set that Tanrei\'s components may draw: the glyphs specs/*.spec.json give and the web components\' code declares (packages/tools/src/glyphs.js says where it reads), and no other word. `axes` are the values the shipped systems draw icons at (the resolved tokens). A product that cuts its icon font down keeps these names, its own, and these axes.',
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
