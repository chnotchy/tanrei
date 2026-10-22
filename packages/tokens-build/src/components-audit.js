// What a product's code uses that its design system does not have: the one check behind `tanrei audit` (packages/cli)
// and the MCP server's `check_usage` (packages/mcp). It reads two things and nothing else — the system's components
// manifest (components-manifest.js) and the component catalog — so it can never disagree with what `tanrei build`
// writes or with the entries a product imports.
//
// It reads code as text, the way a person scanning it would, and finds:
//   - an element (`<tanrei-fab-menu>` in HTML, a lit template, JSX, or a string such as createElement's) of a
//     component the system does not have, or one Tanrei has no component for;
//   - a React wrapper imported (and then written) of a component the system does not have;
//   - an import of an entry that does not fit the system (`@tanrei/react/all` or `@tanrei/web/m3-like` in a product of
//     the default system), or of a component's module the system does not have;
//   - a static `variant="…"` on one of the system's components that the system leaves out, or that does not exist;
//   - a CSS selector (a stylesheet, `<style>`, lit's css``) that names the element of a component the system does not
//     have.
// Comments are not code: `//`, `/* */` and `<!-- -->` are skipped. What it cannot see, and says so in its docs: a
// variant held in a variable or computed, an element built from a string that is not the whole tag name, a class name
// of a component drawn as a class (`tanrei-link`), and code that is not in the files it is given.
//
// Every finding says what to write instead: the components the system ships for the same job (`insteadUse`), the
// systems that have it (`availableIn`), the layer line that takes it into a product (`howToInclude`), the entry to
// import (`use`) or the variant values the system offers (`values`).
import { CONFIG } from './config.js';
import { REACT_ALL, reactEntryOf, webEntryOf } from './components-manifest.js';

const PREFIX = `${CONFIG.web.tagPrefix}-`;
const WEB = `${CONFIG.packages.npmScope}/web`;
const REACT = `${CONFIG.packages.npmScope}/react`;
const TAG = `${PREFIX}[a-z0-9]+(?:-[a-z0-9]+)*`;
const pascal = (name) => name.split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join('');

/**
 * The kind of text a file holds, by its extension: a stylesheet (`scss`: one whose `//` starts a comment, as in Sass
 * and Less), markup (HTML and the templates written like it), or script.
 */
export function textKind(file) {
  const ext = /\.([a-z0-9]+)$/i.exec(file ?? '')?.[1]?.toLowerCase();
  if (['scss', 'less'].includes(ext)) return 'scss';
  if (['css', 'pcss'].includes(ext)) return 'css';
  if (['html', 'htm', 'vue', 'svelte', 'astro'].includes(ext)) return 'html';
  return 'script';
}

/** The extensions `tanrei audit` reads in a directory it is given: script, markup and stylesheets. */
export const AUDITED_EXTENSIONS = ['js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'mts', 'cts', 'html', 'htm', 'vue', 'svelte', 'astro', 'css', 'scss', 'less'];

// ── reading the text ─────────────────────────────────────────────────────
// The text is never rewritten, only its comments blanked (each character a space, its line breaks kept), so that every
// offset, line and column is the file's own.

const blank = (chars, from, to) => {
  for (let i = from; i < to; i++) if (chars[i] !== '\n' && chars[i] !== '\r') chars[i] = ' ';
};

/** `<!-- … -->` blanked in chars[from, to). */
function blankHtmlComments(chars, text, from, to) {
  for (let at = text.indexOf('<!--', from); at !== -1 && at < to; at = text.indexOf('<!--', at + 4)) {
    const end = text.indexOf('-->', at + 4);
    const stop = end === -1 || end + 3 > to ? to : end + 3;
    blank(chars, at, stop);
    at = stop - 4;
  }
}

// After these, a `/` starts a regular expression; after anything else (a name, a number, `)`, `]`, `}`), it divides.
const BEFORE_REGEX = new Set(['', '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', ';', '+', '-', '*', '%', '<', '>', '~', '^']);
const KEYWORDS_BEFORE_REGEX = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);

/**
 * Script (JS, TS, JSX) in text[from, to): its comments blanked in `chars`, and the template literals it holds, each with
 * the tag written before it (`html`, `css`, or none) and the range of its text. A string or a template's text is not
 * code, so a `//` in it is no comment; markup comments in a string or a template are blanked, as in markup.
 *
 * It is a reader, not a parser: where JSX text holds a quote (`Don't`), the rest of that line reads as a string, so a
 * comment there is read as code — it is checked, never the other way round.
 */
function readScript(chars, text, from = 0, to = text.length) {
  const templates = [];
  const open = []; // per template literal whose `${` is open: the brace depth it opened at, and the template
  let depth = 0;
  let last = ''; // the last significant character, or the word it ends
  let i = from;
  // A template's text from `at`: to its closing backtick, or to a `${`, where script starts again.
  const templateText = (template, at) => {
    let j = at;
    while (j < to && text[j] !== '`' && !(text[j] === '$' && text[j + 1] === '{')) j += text[j] === '\\' ? 2 : 1;
    blankHtmlComments(chars, text, at, Math.min(j, to));
    if (j < to && text[j] === '$') {
      open.push({ depth, template });
      depth++;
      last = '{';
      i = j + 2;
    } else {
      template.end = Math.min(j, to);
      last = '`';
      i = j + 1;
    }
  };
  while (i < to) {
    const c = text[i];
    const next = text[i + 1];
    // `//` after a colon is a URL's (`https://` in JSX text), and `/` after `<` closes a tag.
    if (c === '/' && next === '/' && text[i - 1] !== ':' && last !== '<') {
      const end = text.indexOf('\n', i);
      const stop = end === -1 || end > to ? to : end;
      blank(chars, i, stop);
      i = stop;
    } else if (c === '/' && next === '*' && last !== '<') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 || end + 2 > to ? to : end + 2;
      blank(chars, i, stop);
      i = stop;
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < to && text[j] !== c && text[j] !== '\n') j += text[j] === '\\' ? 2 : 1;
      blankHtmlComments(chars, text, i + 1, Math.min(j, to));
      i = j + 1;
      last = c;
    } else if (c === '`') {
      // The tag written before it (`html`, `css`, `lit.css`), or none.
      const template = { tag: /([\w$]+)\s*$/.exec(text.slice(Math.max(from, i - 40), i))?.[1] ?? '', start: i + 1, end: to };
      templates.push(template);
      templateText(template, i + 1);
    } else if (c === '/' && last !== '<' && next !== '>' && (BEFORE_REGEX.has(last) || KEYWORDS_BEFORE_REGEX.has(last))) {
      // A regular expression: to its closing `/` (not one in a class), on its line.
      let j = i + 1;
      let inClass = false;
      while (j < to && text[j] !== '\n') {
        if (text[j] === '\\') j++;
        else if (text[j] === '[') inClass = true;
        else if (text[j] === ']') inClass = false;
        else if (text[j] === '/' && !inClass) break;
        j++;
      }
      i = j + 1;
      last = 'regex';
    } else if (c === '{') {
      depth++;
      last = '{';
      i++;
    } else if (c === '}') {
      depth--;
      if (open.length && open.at(-1).depth === depth) templateText(open.pop().template, i + 1);
      else {
        last = '}';
        i++;
      }
    } else if (/\s/.test(c)) i++;
    else if (/[\w$]/.test(c)) {
      let j = i + 1;
      while (j < to && /[\w$]/.test(text[j])) j++;
      last = text.slice(i, j);
      i = j;
    } else {
      last = c;
      i++;
    }
  }
  return templates;
}

/** A stylesheet in text[from, to): its comments blanked (and `//` lines, in Sass and Less). */
function readCss(chars, text, from, to, { lineComments = false } = {}) {
  let i = from;
  while (i < to) {
    const c = text[i];
    if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 || end + 2 > to ? to : end + 2;
      blank(chars, i, stop);
      i = stop;
    } else if (lineComments && c === '/' && text[i + 1] === '/' && text[i - 1] !== ':' && text[i - 1] !== '(') {
      const end = text.indexOf('\n', i);
      blank(chars, i, end === -1 || end > to ? to : end);
      i = end === -1 || end > to ? to : end;
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < to && text[j] !== c && text[j] !== '\n') j += text[j] === '\\' ? 2 : 1;
      i = j + 1;
    } else i++;
  }
}

/**
 * The text with its comments blanked, and where its stylesheets are: a whole stylesheet, the `<style>` elements of
 * markup, and the css`` and `<style>` of script.
 */
export function readText(text, kind) {
  const chars = text.split('');
  const styles = [];
  if (kind === 'css' || kind === 'scss') {
    readCss(chars, text, 0, text.length, { lineComments: kind === 'scss' });
    styles.push([0, text.length]);
  } else if (kind === 'html') {
    // Script and style elements first: a `<!--` in either is not a markup comment.
    const blocks = [...text.matchAll(/<(script|style)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi)].map((match) => {
      const start = match.index + match[0].indexOf('>') + 1;
      return { name: match[1].toLowerCase(), start, end: start + match[2].length, outer: [match.index, match.index + match[0].length] };
    });
    // An Astro component's frontmatter is script.
    const frontmatter = /^---\r?\n[\s\S]*?\r?\n---(?=\r?\n|$)/.exec(text);
    if (frontmatter) blocks.unshift({ name: 'script', start: 3, end: frontmatter[0].length - 3, outer: [0, frontmatter[0].length] });
    let at = 0;
    for (const block of blocks) {
      blankHtmlComments(chars, text, at, block.outer[0]);
      at = block.outer[1];
      if (block.name === 'style') {
        readCss(chars, text, block.start, block.end);
        styles.push([block.start, block.end]);
      } else {
        for (const template of readScript(chars, text, block.start, block.end)) {
          if (template.tag !== 'css') continue;
          readCss(chars, text, template.start, template.end);
          styles.push([template.start, template.end]);
        }
      }
    }
    blankHtmlComments(chars, text, at, text.length);
  } else {
    for (const template of readScript(chars, text)) {
      if (template.tag === 'css') {
        readCss(chars, text, template.start, template.end);
        styles.push([template.start, template.end]);
      }
    }
    // A `<style>` element in a template or in JSX.
    for (const match of chars.join('').matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) {
      const start = match.index + match[0].indexOf('>') + 1;
      readCss(chars, text, start, start + match[1].length);
      styles.push([start, start + match[1].length]);
    }
  }
  return { code: chars.join(''), styles };
}

/** The type selectors naming an element in a stylesheet's text[from, to) (comments already blanked): `tanrei-x` in `tanrei-x::part(y), .a > tanrei-x {`. */
function selectorTags(code, from, to) {
  const found = [];
  let start = from;
  for (let i = from; i < to; i++) {
    const c = code[i];
    if (c === '"' || c === "'") {
      const end = code.indexOf(c, i + 1);
      i = end === -1 || end > to ? to : end;
    } else if (c === ';' || c === '}') start = i + 1;
    else if (c === '{') {
      const prelude = code.slice(start, i);
      if (!/^\s*@/.test(prelude)) {
        for (const match of prelude.matchAll(new RegExp(`(?<![\\w\\-.#:\\[\\\\@$%'"=])(${TAG})(?![\\w-])`, 'g'))) {
          // In `::part(…)` or `:state(…)` a name is not an element.
          const before = prelude.slice(0, match.index);
          if (/::?(?:part|state|lang|dir|nth-[a-z-]+|highlight)\(\s*[^)]*$/.test(before)) continue;
          found.push({ offset: start + match.index, tag: match[1] });
        }
      }
      start = i + 1;
    }
  }
  return found;
}

/** Line and column (1-based) of each offset in a text. */
function positions(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  return (at) => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (starts[mid] <= at) low = mid;
      else high = mid - 1;
    }
    return { line: low + 1, column: at - starts[low] + 1 };
  };
}

/** The end of an opening tag that starts at `from`: the first `>` outside quotes and braces. */
function openingTagEnd(text, from) {
  let quote = null;
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '{') depth++;
    else if (c === '}') depth = Math.max(0, depth - 1);
    else if (c === '>' && depth === 0) return i;
  }
  return text.length;
}

// `variant="x"`, `variant='x'`, `variant=x` (markup), `variant={"x"}`, `variant={'x'}`, variant={`x`} (JSX).
const VARIANT = /(?<![\w.:-])variant\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*(?:"([^"]*)"|'([^']*)'|`([^`$]*)`)\s*\}|([^\s"'=<>`{}$]+))/g;
const IMPORT = /\b(?:import|export)\s*(?:type\s+)?([\w$*\s{},]*?)\s*from\s*(['"])([^'"]+)\2|\bimport\s*\(?\s*(['"])([^'"]+)\4|\brequire\s*\(\s*(['"])([^'"]+)\6/g;

// ── what the check knows ─────────────────────────────────────────────────

const indexes = new WeakMap();
/**
 * Every element of the catalog with the components it is: a component's own element is that component's alone; an
 * element a component draws among its children (`web.items`) is the components' that draw it. And the same by React
 * name: React wraps every element under the PascalCase of its name without the prefix (packages/react/scripts/generate.js).
 */
export function elementIndex(catalog) {
  if (indexes.has(catalog)) return indexes.get(catalog);
  const byTag = new Map();
  for (const component of catalog.components) if (component.web?.tag) byTag.set(component.web.tag, { components: [component.name], own: true });
  for (const component of catalog.components) {
    for (const tag of component.web?.items ?? []) {
      const at = byTag.get(tag) ?? { components: [], own: false };
      if (!at.components.includes(component.name)) at.components.push(component.name);
      byTag.set(tag, at);
    }
  }
  const byReactName = new Map([...byTag].map(([tag, at]) => [pascal(tag.slice(PREFIX.length)), { ...at, tag }]));
  indexes.set(catalog, { byTag, byReactName });
  return indexes.get(catalog);
}

/**
 * What a check needs, worked out once per system.
 * @param {{ components: object[] }} catalog the component catalog (components-manifest.js `readComponentCatalog`)
 * @param {object} manifest the components manifest of the system checked against
 * @param {Map<string, object>} shipped every shipped system's manifest, by id: which systems have a component, and which
 *   entry registers what
 * @param {{ product?: boolean }} [options] product: the system is a product's own (its layer may take a component in)
 */
export function auditContext(catalog, manifest, shipped, { product = false } = {}) {
  const { byTag, byReactName } = elementIndex(catalog);
  // The web modules that register components: a component's own module and a stylesheet of a class, each shipped
  // system's entry (what its manifest lists), and the entry of every component.
  const byWebModule = new Map();
  const webEntries = new Map(); // entry → the system it is the entry of ('*' for all)
  const register = (specifier, name) => byWebModule.set(specifier, [...new Set([...(byWebModule.get(specifier) ?? []), name])]);
  for (const component of catalog.components) {
    if (component.web?.module) register(component.web.module, component.name);
    if (component.web?.stylesheet) register(component.web.stylesheet, component.name);
    if (component.web?.tag) register(`${WEB}/all`, component.name);
  }
  webEntries.set(`${WEB}/all`, '*');
  for (const [id, each] of shipped) {
    webEntries.set(webEntryOf(id), id);
    for (const { name, web } of each.components) if (web?.tag) register(webEntryOf(id), name);
  }
  // Each React entry the shipped manifests name, with the components it holds (`@tanrei/react/all` holds every one).
  const reactEntries = new Map();
  for (const each of shipped.values()) for (const { name, react } of each.components) if (react) reactEntries.set(react.import, (reactEntries.get(react.import) ?? new Set()).add(name));
  const listed = new Map(manifest.components.map((component) => [component.name, component]));
  // The entries that register this system's components: the one a product of it imports.
  const ownEntries = new Set(manifest.components.map((component) => component.web?.import).filter((specifier) => webEntries.has(specifier)));
  return { catalog, manifest, shipped, product, byTag, byReactName, byWebModule, webEntries, reactEntries, listed, ownEntries };
}

/** A component of the manifest, compact: what an agent needs to write it. */
export function briefComponent(entry) {
  return { name: entry.name, title: entry.title, ...(entry.web ? { web: entry.web } : {}), ...(entry.react ? { react: entry.react } : {}) };
}

/** The variant values a system offers for a component, and those it leaves out. */
export const variantsOf = (manifest, name) => ({ values: manifest.components.find((c) => c.name === name)?.variants, omitted: manifest.omittedVariants[name] ?? [] });

/**
 * What to do about a component the system does not have: why (the layer that left it out, with its reason, or the
 * layer it lives in), the components the system ships for the same job (`insteadUse`, with their names), the shipped
 * systems that have it, and — for a product — the line of its own layer that would take it.
 * @param {{ manifest: object, shipped: Map<string, object>, product: boolean }} context
 */
export function standInsFor({ manifest, shipped, product }, name) {
  const omitted = manifest.omitted.find((o) => o.name === name);
  if (!omitted) return null;
  const listed = new Map(manifest.components.map((c) => [c.name, c]));
  const { name: _name, title: _title, ...why } = omitted;
  const take = omitted.providedBy ? { name, from: omitted.providedBy } : name;
  return {
    ...why,
    ...(omitted.insteadUse ? { insteadUse: omitted.insteadUse.filter((other) => listed.has(other)).map((other) => briefComponent(listed.get(other))) } : {}),
    availableIn: [...shipped].filter(([, each]) => each.components.some((c) => c.name === name)).map(([id]) => id),
    // A layer that left it out itself takes it back by no longer leaving it out; a later layer includes it.
    howToInclude:
      product && omitted.omittedBy === manifest.system
        ? { note: `Remove "${name}" from components.omit in ${manifest.system}.system.json.` }
        : { ...(product ? {} : { note: `A shipped system is not edited: a product layer that extends "${manifest.system}" may take it.` }), write: { components: { include: [take] } } },
  };
}

/** The edit distance of two names: how a name that is almost one is told apart from a name that is none. */
export function distance(a, b) {
  let row = [...Array(b.length + 1).keys()];
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}

/** The plain name of an element or a wrapper: `tanrei-text-field` and `TextField` are `text-field`. */
export const plainName = (name) => name.replace(new RegExp(`^${PREFIX}`), '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** The system's components spelled almost like a name that is none (`tanrei-buton`): at most two letters apart. */
export function spelledLike({ manifest }, name, limit = 3) {
  const plain = plainName(name);
  return manifest.components
    .map((component) => [component.name, distance(plain, component.name)])
    .filter(([, d]) => d <= 2)
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([other]) => other);
}

// ── the check ────────────────────────────────────────────────────────────

/**
 * The findings in one text, in the order they occur.
 * @param {ReturnType<typeof auditContext>} context
 * @param {string} text
 * @param {{ file?: string, kind?: 'script' | 'html' | 'css' | 'scss', near?: (tag: string) => string[] }} [options] kind: how to
 *   read it (by default, from the file's extension); near: the components to suggest for a tag Tanrei has none of
 */
export function auditText(context, text, { file, kind = textKind(file), near } = {}) {
  const { manifest, byTag, byReactName, byWebModule, webEntries, reactEntries, listed, ownEntries } = context;
  const { code, styles } = readText(text, kind);
  const at = positions(text);
  const findings = [];
  const add = (offset, finding) => findings.push({ ...(file ? { file } : {}), ...at(offset), ...finding });
  const unavailable = (names) => names.filter((name) => !listed.has(name));
  const missing = (offset, kind, found, names) => {
    for (const name of names) add(offset, { kind, found, component: name, problem: `"${manifest.system}" does not have ${name}`, ...standInsFor(context, name) });
  };
  const unknownTag = (offset, kind, found, tag) => add(offset, { kind, found, problem: `Tanrei has no element <${tag}>`, near: (near ?? ((name) => spelledLike(context, name)))(tag) });
  const inStyle = (offset) => styles.some(([from, to]) => offset >= from && offset < to);

  // Imports: an entry of another system (or of every component), a web module that registers only components the
  // system does not have, a React wrapper it does not have, or a wrapper taken from another entry than the one the
  // manifest names for this system.
  const local = new Map(); // a local name bound to a React wrapper → { components, imported }
  for (const match of code.matchAll(IMPORT)) {
    const specifier = match[3] ?? match[5] ?? match[7];
    const offset = match.index + match[0].lastIndexOf(specifier);
    if (specifier === WEB || specifier.startsWith(`${WEB}/`)) {
      const names = byWebModule.get(specifier);
      if (!names) continue;
      if (webEntries.has(specifier) && ownEntries.size && !ownEntries.has(specifier)) {
        const of = webEntries.get(specifier);
        const extra = unavailable(names);
        const use = [...ownEntries][0];
        add(offset, {
          kind: 'import',
          found: specifier,
          problem: `'${specifier}' registers ${of === '*' ? 'every component' : `what "${of}" ships`}${extra.length ? `, with ${extra.join(', ')}, which "${manifest.system}" does not have` : ''}: in "${manifest.system}", the components are registered by '${use}'`,
          ...(extra.length ? { notInThisSystem: extra } : {}),
          use,
        });
      } else if (!webEntries.has(specifier) && unavailable(names).length === names.length) missing(offset, 'import', specifier, names);
      continue;
    }
    if (specifier !== REACT && !specifier.startsWith(`${REACT}/`)) continue;
    const named = /\{([^}]*)\}/.exec(match[1] ?? '')?.[1];
    if (!named) continue;
    let cursor = match.index + match[0].indexOf('{');
    for (const part of named.split(',')) {
      const [, typeOnly, imported, alias] = /^\s*(type\s+)?([\w$]+)(?:\s+as\s+([\w$]+))?\s*$/.exec(part) ?? [];
      const partAt = code.indexOf(imported ?? part.trim(), cursor);
      cursor = partAt + part.length;
      const wrapper = imported && byReactName.get(imported);
      if (!wrapper) continue;
      if (!typeOnly) local.set(alias ?? imported, { components: wrapper.components, imported });
      const names = unavailable(wrapper.components);
      if (names.length === wrapper.components.length) missing(partAt, 'import', imported, names);
      else {
        const owner = listed.get(wrapper.components.find((name) => listed.has(name)));
        const expected = owner.react?.import;
        if (!expected || specifier === expected) continue;
        // An entry that does not hold the wrapper fails to import it; another that does types it for another system.
        const holds = specifier === REACT_ALL || reactEntries.get(specifier)?.has(owner.name);
        const entryOf = [...context.shipped.keys()].find((id) => reactEntryOf(id) === specifier);
        const typedFor = specifier === REACT_ALL ? 'every system' : entryOf ? `"${entryOf}"` : 'another system';
        add(partAt, { kind: 'import', found: `${imported} from '${specifier}'`, component: owner.name, problem: holds ? `in "${manifest.system}", ${imported} is imported from '${expected}': '${specifier}' types it for ${typedFor}` : `'${specifier}' does not export ${imported}`, use: expected });
      }
    }
  }

  // Elements: markup (HTML, lit templates, JSX of the elements themselves), a tag named in a string (createElement),
  // the React wrappers imported above, and the selectors of stylesheets.
  const element = (offset, found, components, own, end) => {
    const names = unavailable(components);
    if (names.length === components.length) return missing(offset, 'element', found, names);
    if (!own) return;
    const name = components[0];
    const { values, omitted } = variantsOf(manifest, name);
    if (!values) return;
    for (const value of code.slice(offset, end).matchAll(VARIANT)) {
      const chosen = value.slice(1).find((v) => v !== undefined);
      // A value a template computes (`variant="${…}"`) is not static: it is not seen.
      if (values.includes(chosen) || chosen.includes('${')) continue;
      const gone = omitted.includes(chosen);
      add(offset + value.index, { kind: 'variant', found: `variant="${chosen}"`, component: name, problem: gone ? `"${manifest.system}" leaves the ${chosen} ${name} out` : `${name} has no variant "${chosen}"`, values });
    }
  };
  for (const match of code.matchAll(new RegExp(`<(${TAG})(?![\\w-])`, 'g'))) {
    const tag = match[1];
    const known = byTag.get(tag);
    if (known) element(match.index + 1, `<${tag}>`, known.components, known.own, openingTagEnd(code, match.index));
    else unknownTag(match.index + 1, 'element', `<${tag}>`, tag);
  }
  for (const match of code.matchAll(new RegExp(`(['"\`])(${TAG})\\1`, 'g'))) {
    const known = byTag.get(match[2]);
    if (known && !inStyle(match.index)) element(match.index + 1, `'${match[2]}'`, known.components, false, match.index);
  }
  if (local.size) {
    for (const match of code.matchAll(/<([A-Z][\w$]*)(?![\w$])/g)) {
      const bound = local.get(match[1]);
      if (bound) element(match.index + 1, `<${match[1]}>`, bound.components, byTag.get(byReactName.get(bound.imported).tag).own, openingTagEnd(code, match.index));
    }
  }
  for (const [from, to] of styles) {
    for (const { offset, tag } of selectorTags(code, from, to)) {
      const known = byTag.get(tag);
      if (!known) unknownTag(offset, 'selector', tag, tag);
      else if (unavailable(known.components).length === known.components.length) missing(offset, 'selector', tag, known.components);
    }
  }
  return findings.sort((a, b) => a.line - b.line || a.column - b.column);
}

/**
 * The report on several texts: what `tanrei audit --format json` prints and `check_usage` returns.
 * @param {ReturnType<typeof auditContext>} context
 * @param {{ file?: string, text: string, kind?: string }[]} texts
 * @param {{ near?: (tag: string) => string[] }} [options]
 */
export function auditTexts(context, texts, options = {}) {
  const findings = texts.flatMap(({ file, text, kind }) => auditText(context, text, { file, kind, ...options }));
  return {
    system: context.manifest.system,
    ...(context.product ? { product: true } : {}),
    checked: texts.length,
    clean: findings.length === 0,
    errors: findings.length,
    findings,
    ...(findings.length ? { next: "Replace each finding with what it names (insteadUse, use, values), or take the component into the product's layer (howToInclude) and run `tanrei build`." } : {}),
  };
}
