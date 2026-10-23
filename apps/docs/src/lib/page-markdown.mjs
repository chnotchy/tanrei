// Every page of the site as Markdown, beside it: `<path>.md` for the page at `<path>/` — `/foundations/color.md`,
// `/ja/components/button.md` — and `/index.md` for the home page of each language (`/ja/index.md`). Each page's head
// links to its version (`<link rel="alternate" type="text/markdown">`, components/frame/Head.astro, from
// `markdownPathOf` below), so a program that reads a page finds it there.
//
// A page's Markdown is what the page says, not what its source says: the source of a page is MDX, whose components
// are tags until the site draws them, and whose tables of tokens and specs the site generates. So the file is written
// from the built page, when the site is built (`astro:build:done`), over the same part of it the site's search reads:
// the element marked `data-pagefind-body` (the main region), less every element marked `data-pagefind-ignore` (the
// stages of the examples, the anchor links, the breadcrumbs). The page's own words stay in its language; nothing is
// translated here.
//
// What the conversion keeps, and how:
//
//   - The page's head (the page header) gives the file its title and description, written once, at the top: in a
//     front matter, with the page's address and the date it last changed, and again as the H1 and a quote under it.
//     The date is the sitemap's (lib/lastmod.mjs): the same function, read once when the site is built.
//   - Headings, paragraphs, lists, description lists, quotes, links and images as Markdown has them; a link or an image
//     by its absolute address.
//   - Tanrei's code block as a fenced block with its language; Tanrei's table (and any table) as a GFM table; a callout
//     as a quote, with GitHub's alert mark for its status and its title in bold; each panel of a set of tabs under its
//     label, in bold; a link card as a list item, its title linked and its description after it.
//   - No figure but its images: a figure is an example the page draws (its stage is left out of the search), and its
//     title and caption speak of what the file does not have.
//   - Nothing that is no text: scripts, styles, icons, anything hidden from assistive technology, and the navigation.
//
// A component's page is its own prose — the overview, the usage, the guidelines, the accessibility notes — with the
// component's current spec in place of the tables the site draws from it: the Specs section holds the Markdown
// `lib/llms.ts` writes from the spec (`/components/<name>.md` as the build first writes it, src/pages/components/
// [slug].md.ts), its headings one level down, in English as the spec is written in every language. The parts of the
// page drawn from the spec say so with a pair of HTML comments around them (`markdownMark` below; a comment, so that
// the page's own layout is not touched): `spec <name>` where the spec stands, `skip` where the spec already holds what
// is drawn there (the availability at the head of the overview, the accessibility tables).
//
// The functions are plain, so that Node can run them without the site (test/page-markdown.test.mjs);
// test/browser/page-markdown.test.mjs reads the built site: every page has its file and its link.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMMENT_NODE, ELEMENT_NODE, TEXT_NODE, parse } from 'ultrahtml';

// ── Where a page's Markdown is ───────────────────────────────────────────

/**
 * The address of a page's Markdown, from the page's address: `/foundations/color/` → `/foundations/color.md`; the home
 * page of a language, `/` or `/ja/`, → `/index.md`, `/ja/index.md`.
 *
 * @param {string} pathname The page's address under the site (with or without its trailing slash).
 * @param {string[]} languages The folders of the translations (`ja`, `zh-cn`…).
 */
export function markdownPathOf(pathname, languages) {
  const trimmed = pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/+$/, '');
  if (trimmed === '') return '/index.md';
  if (languages.includes(trimmed.slice(1))) return `${trimmed}/index.md`;
  return `${trimmed}.md`;
}

// ── The marks a page's parts leave for this file ─────────────────────────

const MARK = 'tanrei-markdown';

/**
 * The comments a part of a page drawn from a spec stands between: `markdownMark.spec(name)` where the component's
 * spec stands in the Markdown, `markdownMark.skip` where the spec holds what is drawn, and `markdownMark.end` after
 * either. A component writes them with `<Fragment set:html={…} />`.
 */
export const markdownMark = {
  /** @param {string} name */
  spec: (name) => `<!--${MARK}:spec ${name}-->`,
  skip: `<!--${MARK}:skip-->`,
  end: `<!--/${MARK}-->`,
};

/** What a comment of the page says to this file, if it is one of its marks. */
function markOf(/** @type {string} */ comment) {
  const text = comment.trim();
  if (text === `/${MARK}`) return { kind: 'end' };
  if (text === `${MARK}:skip`) return { kind: 'skip' };
  const spec = new RegExp(`^${MARK}:spec ([a-z0-9-]+)$`).exec(text);
  return spec ? { kind: 'spec', name: spec[1] } : undefined;
}

// ── Reading the built page ───────────────────────────────────────────────

/** The character references the site's HTML is written with, by name; any other stays as written. */
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', copy: '©', reg: '®', hellip: '…', mdash: '—', ndash: '–', laquo: '«', raquo: '»', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', times: '×', middot: '·', rarr: '→', larr: '←' };

/** Escaped text as the text it stands for. */
export function decodeEntities(/** @type {string} */ text) {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (written, name) => {
    if (name[0] !== '#') return NAMED[/** @type {keyof typeof NAMED} */ (name.toLowerCase())] ?? written;
    const code = name[1] === 'x' || name[1] === 'X' ? Number.parseInt(name.slice(2), 16) : Number.parseInt(name.slice(1), 10);
    return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : written;
  });
}

/** @typedef {{ type: number, name?: string, value?: string, attributes?: Record<string, string>, children?: Node[] }} Node */

const isElement = (/** @type {Node} */ node) => node.type === ELEMENT_NODE;
const has = (/** @type {Node} */ node, /** @type {string} */ name) => Boolean(node.attributes && name in node.attributes);
const attr = (/** @type {Node} */ node, /** @type {string} */ name) => (node.attributes?.[name] === undefined ? undefined : decodeEntities(String(node.attributes[name])));

/** The first element under a node (the node itself included) that a test holds for. */
function find(/** @type {Node} */ node, /** @type {(node: Node) => boolean} */ test) {
  if (isElement(node) && test(node)) return node;
  for (const child of node.children ?? []) {
    const found = find(child, test);
    if (found) return found;
  }
  return undefined;
}

/** A node's text, as a reader of the page reads it: what is hidden or ignored is left out. */
function textOf(/** @type {Node} */ node) {
  if (node.type === TEXT_NODE) return decodeEntities(node.value ?? '');
  if (!isElement(node) || dropped(node)) return '';
  if (node.name === 'br') return ' ';
  return (node.children ?? []).map(textOf).join('');
}

const squash = (/** @type {string} */ text) => text.replace(/\s+/g, ' ').trim();

/** Elements that hold no text a reader reads, and the navigation (the previous and next page at the foot of a page). */
const NOT_TEXT = new Set(['script', 'style', 'template', 'noscript', 'svg', 'math', 'button', 'input', 'select', 'textarea', 'iframe', 'canvas', 'video', 'audio', 'object', 'head', 'link', 'meta', 'nav']);

/** Whether an element is left out of the Markdown, with everything in it. */
function dropped(/** @type {Node} */ node) {
  return (
    NOT_TEXT.has(/** @type {string} */ (node.name)) ||
    has(node, 'data-pagefind-ignore') ||
    has(node, 'hidden') ||
    attr(node, 'aria-hidden') === 'true' ||
    // An image with no words is decoration (a link's site icon).
    (node.name === 'img' && !attr(node, 'alt')) ||
    attr(node, 'slot') === 'icon' ||
    /(^|\s)tanrei-icon(\s|$)/.test(attr(node, 'class') ?? '')
  );
}

/**
 * What the built page says of itself: its address (the canonical link), its language, its title and description (from
 * the page header, which also leaves the body), and the body the search reads. No body: a page the search does not
 * read (the page that was not found, the redirects) has no Markdown.
 *
 * @param {string} html
 * @returns {{ url?: string, lang?: string, title: string, description?: string, body: Node } | undefined}
 */
export function readPage(html) {
  /** @type {Node} */
  const document = parse(html);
  const body = find(document, (node) => has(node, 'data-pagefind-body'));
  if (!body) return undefined;
  const canonical = find(document, (node) => node.name === 'link' && attr(node, 'rel') === 'canonical');
  const htmlElement = find(document, (node) => node.name === 'html');
  const header = find(body, (node) => node.name === 'tanrei-page-header');
  const heading = header ? find(header, (node) => node.name === 'h1') : find(body, (node) => node.name === 'h1');
  const description = header && (header.children ?? []).find((child) => isElement(child) && child.name === 'p' && attr(child, 'data-part') !== 'eyebrow');
  const metaDescription = find(document, (node) => node.name === 'meta' && attr(node, 'name') === 'description');
  const ogTitle = find(document, (node) => node.name === 'meta' && attr(node, 'property') === 'og:title');
  const title = squash(heading ? textOf(heading) : attr(ogTitle ?? { type: ELEMENT_NODE }, 'content') ?? '');
  // The header has been read: what is left of it (the breadcrumbs, the page's facts) is not part of the body.
  if (header) header.attributes = { ...header.attributes, hidden: '' };
  else if (heading) heading.attributes = { ...heading.attributes, hidden: '' };
  for (const facts of findAll(body, (node) => /(^|\s)docs-page-facts(\s|$)/.test(attr(node, 'class') ?? ''))) facts.attributes = { ...facts.attributes, hidden: '' };
  return {
    url: canonical && attr(canonical, 'href'),
    lang: (htmlElement && attr(htmlElement, 'lang')) || undefined,
    title,
    description: squash(description ? textOf(description) : attr(metaDescription ?? { type: ELEMENT_NODE }, 'content') ?? '') || undefined,
    body,
  };
}

/** The images under a node that a reader of the page reads: none in a part that is left out. */
function imagesOf(/** @type {Node} */ node, /** @type {Node[]} */ out = []) {
  if (isElement(node) && dropped(node)) return out;
  if (node.name === 'img') out.push(node);
  for (const child of node.children ?? []) imagesOf(child, out);
  return out;
}

/** Every element under a node that a test holds for. */
function findAll(/** @type {Node} */ node, /** @type {(node: Node) => boolean} */ test, /** @type {Node[]} */ out = []) {
  if (isElement(node) && test(node)) out.push(node);
  for (const child of node.children ?? []) findAll(child, test, out);
  return out;
}

// ── Markdown ─────────────────────────────────────────────────────────────

/** Elements that stand as blocks of their own; any other element is inline unless a block stands in it. */
const BLOCKS = new Set([
  'address', 'article', 'aside', 'blockquote', 'dd', 'details', 'dialog', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'summary', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul',
]);

/** Whether a node stands as a block: one of the block elements, or an element a block stands in. */
function isBlock(/** @type {Node} */ node) {
  if (!isElement(node) || dropped(node)) return false;
  if (BLOCKS.has(/** @type {string} */ (node.name)) || CUSTOM_BLOCKS.has(/** @type {string} */ (node.name))) return true;
  return (node.children ?? []).some(isBlock);
}

/** Tanrei's elements that are drawn as blocks of their own, whatever is in them. */
const CUSTOM_BLOCKS = new Set(['tanrei-code-block', 'tanrei-table', 'tanrei-callout', 'tanrei-tab-view', 'tanrei-tab-panel', 'tanrei-link-card', 'tanrei-card', 'tanrei-figure', 'tanrei-description-list', 'tanrei-accordion']);

/** Text as Markdown reads it literally: the characters that would start markup are escaped. */
function escapeText(/** @type {string} */ text) {
  return text.replace(/[\\`*[\]<]/g, '\\$&').replace(/(^|[\s(])_|_(?=$|[\s).,;:!?])/g, (match) => match.replace('_', '\\_'));
}

/** Inline code: in as many backticks as it needs, so that a backtick in it stays text. */
function inlineCode(/** @type {string} */ text) {
  const value = text.replace(/\s+/g, ' ');
  const longest = Math.max(0, ...[...value.matchAll(/`+/g)].map(([run]) => run.length));
  const fence = '`'.repeat(longest + 1);
  const pad = value.startsWith('`') || value.endsWith('`') ? ' ' : '';
  return `${fence}${pad}${value}${pad}${fence}`;
}

/**
 * The context the conversion runs in: the page's address, which every link and image is made absolute against.
 *
 * @typedef {{ base: string }} Context
 */

/** An address of the page, absolute. A link to a place in this page stays a link to that place in the HTML page. */
function absolute(/** @type {string | undefined} */ href, /** @type {Context} */ context) {
  if (!href) return undefined;
  try {
    return new URL(href, context.base).href;
  } catch {
    return href;
  }
}

/** A run of inline content as Markdown, on one line. */
function inline(/** @type {Node[]} */ nodes, /** @type {Context} */ context) {
  return nodes
    .map((node) => inlineOf(node, context))
    .join('')
    .replace(/[ \t\n\r\f]+/g, ' ');
}

function inlineOf(/** @type {Node} */ node, /** @type {Context} */ context) {
  if (node.type === TEXT_NODE) return escapeText(decodeEntities(node.value ?? ''));
  if (!isElement(node) || dropped(node)) return '';
  const children = node.children ?? [];
  switch (node.name) {
    case 'br':
      return ' ';
    case 'code':
    case 'kbd':
    case 'samp': {
      const text = textOf(node);
      return text.trim() ? inlineCode(text) : '';
    }
    case 'strong':
    case 'b': {
      const text = inline(children, context).trim();
      return text ? `**${text}**` : '';
    }
    case 'em':
    case 'i':
    case 'cite':
    case 'dfn': {
      const text = inline(children, context).trim();
      return text ? `_${text}_` : '';
    }
    case 'del':
    case 's': {
      const text = inline(children, context).trim();
      return text ? `~~${text}~~` : '';
    }
    case 'a': {
      const text = inline(children, context).trim() || escapeText(attr(node, 'aria-label') ?? '');
      const href = absolute(attr(node, 'href'), context);
      return href && text ? `[${text}](${href.replace(/[()\s]/g, encodeURIComponent)})` : text;
    }
    case 'img': {
      const src = absolute(attr(node, 'src'), context);
      return src ? `![${escapeText(attr(node, 'alt') ?? '')}](${src})` : '';
    }
    case 'tanrei-tag':
    case 'tanrei-chip':
    case 'tanrei-badge': {
      // A tag's word is its label, an attribute; what stands in it is an icon.
      const text = inline(children, context).trim();
      return text || escapeText(attr(node, 'label') ?? '');
    }
    default:
      return inline(children, context);
  }
}

/**
 * A block of the Markdown: its lines; the list it is an item of, if it is one (an item stands next to the item of the
 * same list before it, with no empty line between); and a heading's level.
 *
 * @typedef {{ text: string, item?: object, heading?: number }} Block
 */

/** The blocks of a node's children: runs of inline content become paragraphs, block elements their own blocks. */
function blocksOf(/** @type {Node[]} */ nodes, /** @type {Context} */ context) {
  /** @type {Block[]} */
  const out = [];
  /** @type {Node[]} */
  let run = [];
  const flush = () => {
    const text = inline(run, context).trim();
    if (text) out.push({ text: guardParagraph(text) });
    run = [];
  };
  for (const node of marked(nodes, context)) {
    if ('block' in node) {
      flush();
      out.push(node.block);
    } else if (isBlock(node)) {
      flush();
      out.push(...blockOf(node, context));
    } else run.push(node);
  }
  flush();
  return out;
}

/**
 * The children of a node with the marks of the parts drawn from a spec followed: what stands between `skip` and its
 * end is left out, and what stands between `spec <name>` and its end is replaced with that component's spec.
 *
 * @returns {(Node | { block: Block })[]}
 */
function marked(/** @type {Node[]} */ nodes, /** @type {Context & { spec?: (name: string) => string }} */ context) {
  /** @type {(Node | { block: Block })[]} */
  const out = [];
  let skipping = false;
  for (const node of nodes) {
    const mark = node.type === COMMENT_NODE ? markOf(node.value ?? '') : undefined;
    if (mark?.kind === 'end') skipping = false;
    else if (mark?.kind === 'skip') skipping = true;
    else if (mark?.kind === 'spec') {
      skipping = true;
      if (!context.spec) throw new Error(`The page marks the spec of "${mark.name}", and no spec was given to write there.`);
      out.push({ block: { text: context.spec(mark.name) } });
    } else if (!skipping) out.push(node);
  }
  if (skipping) throw new Error('A part of the page marked for the Markdown has no end mark.');
  return out;
}

/** A paragraph that would read as other markup at the start of a line — a heading, a quote, a list — is kept a paragraph. */
function guardParagraph(/** @type {string} */ text) {
  return text.replace(/^(#{1,6}\s|>|[-+]\s)/, '\\$1').replace(/^(\d+)([.)]\s)/, '$1\\$2');
}

/** Lines indented under the marker of a list item. */
const indent = (/** @type {string} */ text, /** @type {string} */ by) => text.split('\n').map((line, i) => (i === 0 || line === '' ? line : by + line)).join('\n');

/** Blocks joined as Markdown: an empty line between blocks, none between the items of a list. */
export function joinBlocks(/** @type {Block[]} */ blocks) {
  let out = '';
  blocks.forEach((block, i) => {
    if (i > 0) out += block.item && block.item === blocks[i - 1].item ? '\n' : '\n\n';
    out += block.text;
  });
  return out;
}

function blockOf(/** @type {Node} */ node, /** @type {Context} */ context) {
  const children = node.children ?? [];
  /** @type {Block[]} */
  const none = [];
  switch (node.name) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const text = inline(children, context).trim();
      const level = Number(node.name[1]);
      return text ? [{ text: `${'#'.repeat(level)} ${text}`, heading: level }] : none;
    }
    case 'p': {
      const text = inline(children, context).trim();
      return text ? [{ text: guardParagraph(text) }] : none;
    }
    case 'hr':
      return [{ text: '---' }];
    case 'pre':
      return codeBlock(node, undefined);
    case 'tanrei-code-block':
      return codeBlock(find(node, (each) => each.name === 'pre') ?? node, attr(node, 'language'));
    case 'ul':
    case 'ol':
      return list(node, context);
    case 'dl':
      return descriptionList(node, context);
    case 'table':
      return table(node, context);
    case 'blockquote':
      return quote(blocksOf(children, context));
    case 'tanrei-callout':
      return callout(node, context);
    case 'tanrei-tab-panel': {
      const label = attr(node, 'label');
      const blocks = blocksOf(children, context);
      return blocks.length ? [...(label ? [{ text: `**${escapeText(label)}**` }] : []), ...blocks] : none;
    }
    case 'tanrei-link-card': {
      const link = find(node, (each) => each.name === 'a');
      const title = link && find(link, (each) => attr(each, 'data-part') === 'title');
      const description = link && find(link, (each) => attr(each, 'data-part') === 'description');
      const href = absolute(link && attr(link, 'href'), context);
      if (!title || !href) return blocksOf(children, context);
      const words = description ? escapeText(squash(textOf(description))) : '';
      return [{ text: `- [${escapeText(squash(textOf(title)))}](${href})${words ? `: ${words}` : ''}`, item: LINK_CARDS }];
    }
    case 'figure': {
      // An example the page draws: its title and caption speak of a stage the file does not have. An image stays.
      return imagesOf(node).map((image) => ({ text: inlineOf(image, context) })).filter((block) => block.text);
    }
    case 'details': {
      const summary = children.find((child) => child.name === 'summary');
      const rest = children.filter((child) => child !== summary);
      const head = summary ? inline(summary.children ?? [], context).trim() : '';
      return [...(head ? [{ text: `**${head}**` }] : []), ...blocksOf(rest, context)];
    }
    default:
      return blocksOf(children, context);
  }
}

/** The list the link cards of a page make: one after another, they are items of one list. */
const LINK_CARDS = {};

/** A fenced block of code, with its language, in a fence longer than any run of backticks in it. */
function codeBlock(/** @type {Node} */ pre, /** @type {string | undefined} */ language) {
  const lines = findAll(pre, (node) => has(node, 'data-line'));
  // A line of Tanrei's code block holds its own line break.
  const text = (lines.length ? lines.map((line) => textOf(line).replace(/\r?\n$/, '')).join('\n') : textOf(pre)).replace(/\n+$/, '');
  if (!text.trim()) return [];
  const code = find(pre, (node) => node.name === 'code');
  const lang = language ?? (code && /(?:^|\s)language-(\S+)/.exec(attr(code, 'class') ?? '')?.[1]) ?? (code && attr(code, 'data-syntax-of')) ?? '';
  const longest = Math.max(2, ...[...text.matchAll(/^`{3,}/gm)].map(([run]) => run.length));
  const fence = '`'.repeat(longest + 1);
  return [{ text: `${fence}${lang}\n${text}\n${fence}` }];
}

/** A list, each item's blocks under its marker; an ordered list counts from its `start`. */
function list(/** @type {Node} */ node, /** @type {Context} */ context) {
  const ordered = node.name === 'ol';
  const group = {};
  let n = Number(attr(node, 'start') ?? 1) || 1;
  /** @type {Block[]} */
  const out = [];
  for (const item of node.children ?? []) {
    if (!isElement(item) || item.name !== 'li' || dropped(item)) continue;
    const marker = ordered ? `${n++}. ` : '- ';
    const blocks = blocksOf(item.children ?? [], context);
    // In an item whose text is no paragraph of its own, a list follows its text on the next line (a tight list).
    const tight = !(item.children ?? []).some((child) => isElement(child) && child.name === 'p');
    const body = blocks.map((block, i) => (i === 0 ? '' : tight && block.item ? '\n' : '\n\n') + block.text).join('');
    out.push({ text: `${marker}${indent(body, ' '.repeat(marker.length))}`.trimEnd(), item: group });
  }
  // A list whose items hold more than one block is loose: an empty line between its items.
  return out.some((block) => block.text.includes('\n\n')) ? out.map((block) => ({ text: block.text })) : out;
}

/** A description list: each term in bold, its descriptions after it. */
function descriptionList(/** @type {Node} */ node, /** @type {Context} */ context) {
  const group = {};
  /** @type {Block[]} */
  const out = [];
  /** @type {string[]} */
  let terms = [];
  const each = (/** @type {Node[]} */ nodes) => {
    for (const child of nodes) {
      if (!isElement(child) || dropped(child)) continue;
      if (child.name === 'div') each(child.children ?? []);
      else if (child.name === 'dt') terms.push(inline(child.children ?? [], context).trim());
      else if (child.name === 'dd') {
        const text = joinBlocks(blocksOf(child.children ?? [], context));
        const term = terms.filter(Boolean).join(', ');
        if (term || text) out.push({ text: `- ${term ? `**${term}**` : ''}${term && text ? ': ' : ''}${indent(text, '  ')}`, item: group });
        terms = [];
      }
    }
  };
  each(node.children ?? []);
  return out;
}

/** A table as GFM has one: its first row is its head, each cell on one line with its pipes escaped. */
function table(/** @type {Node} */ node, /** @type {Context} */ context) {
  const rows = findAll(node, (each) => each.name === 'tr').map((row) =>
    (row.children ?? [])
      .filter((cell) => isElement(cell) && (cell.name === 'td' || cell.name === 'th'))
      .map((cell) => {
        const text = joinBlocks(blocksOf(cell.children ?? [], context)).replace(/\s*\n+\s*/g, ' ');
        const span = Math.max(1, Number(attr(cell, 'colspan') ?? 1) || 1);
        return Array.from({ length: span }, (_, i) => (i === 0 ? text.replace(/\|/g, '\\|') : ''));
      })
      .flat(),
  );
  if (!rows.length) return [];
  const width = Math.max(...rows.map((row) => row.length));
  const line = (/** @type {string[]} */ row) => `| ${Array.from({ length: width }, (_, i) => row[i] ?? '').join(' | ')} |`;
  const caption = find(node, (each) => each.name === 'caption');
  return [
    ...(caption && squash(textOf(caption)) ? [{ text: `**${escapeText(squash(textOf(caption)))}**` }] : []),
    { text: [line(rows[0]), `| ${Array.from({ length: width }, () => '---').join(' | ')} |`, ...rows.slice(1).map(line)].join('\n') },
  ];
}

/** Blocks as a quote. */
function quote(/** @type {Block[]} */ blocks) {
  const text = joinBlocks(blocks);
  return text ? [{ text: text.replace(/^/gm, '> ').replace(/^> $/gm, '>') }] : [];
}

/** GitHub's alert marks, by a callout's status. A callout with no status (a tip) is its title alone. */
const ALERTS = { info: 'NOTE', success: 'TIP', warning: 'WARNING', error: 'CAUTION' };

/** A callout as a quote: its status's alert mark, its title in bold, its body. */
function callout(/** @type {Node} */ node, /** @type {Context} */ context) {
  const children = node.children ?? [];
  const title = children.find((child) => isElement(child) && attr(child, 'slot') === 'title');
  const body = children.filter((child) => child !== title && !(isElement(child) && attr(child, 'slot') && attr(child, 'slot') !== 'title'));
  const alert = ALERTS[/** @type {keyof typeof ALERTS} */ (attr(node, 'status') ?? '')];
  const head = title ? inline(title.children ?? [], context).trim() : '';
  return quote([...(alert ? [{ text: `[!${alert}]` }] : []), ...(head ? [{ text: `**${head}**` }] : []), ...blocksOf(body, context)]).map((block) => ({
    // The alert mark and the title are one paragraph of the quote: the mark's own line, then the title.
    text: block.text.replace(/^> (\[![A-Z]+\])\n>\n> /, '> $1\n> '),
  }));
}

/** Headings, each a level further down: a part of one page set under one of its headings. Code is left as it is. */
export function demoteHeadings(/** @type {string} */ markdown, by = 1) {
  /** @type {string | undefined} */
  let fence;
  return markdown
    .split('\n')
    .map((line) => {
      const run = /^(`{3,}|~{3,})/.exec(line)?.[1];
      if (run && !fence) fence = run;
      else if (run && fence && run[0] === fence[0] && run.length >= fence.length && line.trim() === run) fence = undefined;
      else if (!fence && /^#{1,6} /.test(line)) return `${'#'.repeat(by)}${line}`;
      return line;
    })
    .join('\n');
}

/**
 * A component's spec as the Markdown of its page holds it: the file `lib/llms.ts` writes from the spec, less its own
 * title and summary (the page's title and description stand at the top), its headings set under the page's Specs
 * heading.
 */
export function specSection(/** @type {string} */ markdown) {
  const body = markdown.replace(/^# [^\n]*\n+(?:> [^\n]*\n+)?/, '');
  return demoteHeadings(body.trimEnd(), 1);
}

/**
 * Sections that say nothing are left out: a heading with nothing under it before the next heading of its level or
 * above (a heading whose part was all examples, or all drawn from the spec where the spec stands elsewhere).
 */
export function dropEmptySections(/** @type {Block[]} */ blocks) {
  return blocks.filter((block, i) => {
    if (!block.heading) return true;
    for (const next of blocks.slice(i + 1)) {
      if (!next.heading) return true;
      if (next.heading <= block.heading) return false;
    }
    return false;
  });
}


/** A value of the front matter: a string in YAML's double quotes (JSON's form, which YAML reads as written). */
const yaml = (/** @type {string} */ value) => (/^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : JSON.stringify(value));

/**
 * The front matter at the top of a page's Markdown: its title, description, address and the date it last changed, in
 * that order; a field the page has no value for is left out.
 *
 * @param {{ title: string, description?: string, url?: string, last_updated?: string }} fields
 */
export function frontMatter(fields) {
  const lines = Object.entries(fields)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${yaml(/** @type {string} */ (value))}`);
  return `---\n${lines.join('\n')}\n---`;
}

/**
 * A built page as Markdown.
 *
 * @param {string} html The page as the site serves it.
 * @param {{ url: string, lastmod?: (url: string) => string | undefined, spec?: (name: string) => string }} options The
 *   page's absolute address (its canonical link wins where it has one), the date a page last changed by its address,
 *   and the Markdown of a component's spec by
 *   its name, for the part of the page that marks it.
 * @returns {string | undefined} None for a page the search does not read.
 */
export function pageMarkdown(html, { url, lastmod, spec }) {
  const page = readPage(html);
  if (!page) return undefined;
  const address = page.url ?? url;
  const context = { base: address, spec: spec && ((/** @type {string} */ name) => specSection(spec(name))) };
  const body = joinBlocks(dropEmptySections(blocksOf(page.body.children ?? [], context)));
  const head = [frontMatter({ title: page.title, description: page.description, url: address, last_updated: lastmod?.(address) }), '', `# ${escapeText(page.title)}`];
  if (page.description) head.push('', `> ${escapeText(page.description)}`);
  return `${head.join('\n')}\n\n${body}\n`.replace(/\n{3,}/g, '\n\n');
}

// ── The build ────────────────────────────────────────────────────────────

/**
 * The integration that writes every page's Markdown beside it when the site is built.
 *
 * @param {{ languages: string[], lastmod: (url: string) => string | undefined }} options The translations' folders, and
 *   the date a page last changed by its address — the sitemap's own (`sitemapLastmod().of`), so that the two agree.
 */
export function pageMarkdownFiles({ languages, lastmod }) {
  /** @type {URL} */
  let site;
  return {
    name: 'tanrei-docs:page-markdown',
    hooks: {
      'astro:config:done': (/** @type {{ config: { site?: string } }} */ { config }) => {
        if (!config.site) throw new Error('The page Markdown needs the site\'s address (`site` in astro.config.mjs).');
        site = new URL(config.site);
      },
      'astro:build:done': async (/** @type {{ dir: URL, logger: { info: (message: string) => void } }} */ { dir, logger }) => {
        const root = fileURLToPath(dir);
        const pages = fs
          .readdirSync(root, { recursive: true, encoding: 'utf8' })
          .filter((file) => file.endsWith('.html'))
          .map((file) => file.split(path.sep).join('/'));
        // Each component's spec as the build first wrote it, read before any page's Markdown is written over it.
        /** @type {Map<string, string>} */
        const specs = new Map();
        const specOf = (/** @type {string} */ name) => {
          if (!specs.has(name)) {
            const file = path.join(root, 'components', `${name}.md`);
            if (!fs.existsSync(file)) throw new Error(`The page marks the spec of "${name}", and the build wrote no /components/${name}.md from it.`);
            specs.set(name, fs.readFileSync(file, 'utf8'));
          }
          return /** @type {string} */ (specs.get(name));
        };
        /** @type {[string, string][]} */
        const written = [];
        for (const file of pages) {
          const pathname = `/${file.replace(/(^|\/)index\.html$/, '$1')}`;
          const url = new URL(pathname, site).href;
          const markdown = pageMarkdown(fs.readFileSync(path.join(root, file), 'utf8'), { url, lastmod, spec: specOf });
          if (markdown) written.push([markdownPathOf(pathname, languages), markdown]);
        }
        for (const [address, markdown] of written) {
          const file = path.join(root, address);
          fs.mkdirSync(path.dirname(file), { recursive: true });
          fs.writeFileSync(file, markdown);
        }
        logger.info(`${written.length} pages as Markdown`);
      },
    },
  };
}
