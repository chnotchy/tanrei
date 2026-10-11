// What `components/MarkdownContent.astro` says in Tanrei's words in a page's rendered content: the rewriting itself,
// as a function of the HTML and of the page's language's words, so that Node can run it without the site
// (test/markdown-content.test.mjs). The component's comment says why each of the six is done; this file is how.
//
// The content is rewritten as text because it arrives rendered, from Markdown and from components alike.

/** What `externalLinks` of lib/markdown.mjs leaves on an anchor, where its description belongs. */
export const EXTERNAL_WORDS = 'data-docs-words';

const attribute = (/** @type {string} */ value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');

const HEADING = /<div class="sl-heading-wrapper level-h[1-6]">(<h([1-6])\b[\s\S]*?<\/h\2>)<a class="sl-anchor-link" href="([^"]*)">[\s\S]*?<span class="sr-only"[^>]*>([\s\S]*?)<\/span><\/a><\/div>/g;
const anchor = (/** @type {string} */ _, /** @type {string} */ heading, /** @type {string} */ _level, /** @type {string} */ href, /** @type {string} */ label) =>
  `<div class="tanrei-prose-heading">${heading}<a class="tanrei-prose-anchor" href="${href}" aria-label="${label.replaceAll('"', '&quot;')}" data-pagefind-ignore><span class="tanrei-icon" aria-hidden="true">link</span></a></div>`;

const ISLANDS = new Set(['not-content', 'card', 'card-grid', 'sl-link-card']);
const CLASS = /(<[a-z][a-z0-9-]*)(\s(?:[^<>"]|"[^"]*")*?)class="([^"]*)"/g;
const island = (/** @type {string} */ _, /** @type {string} */ tag, /** @type {string} */ before, /** @type {string} */ classes) =>
  classes.split(/\s+/).some((name) => ISLANDS.has(name)) && !classes.includes('tanrei-not-prose') ? `${tag}${before}class="${classes} tanrei-not-prose"` : `${tag}${before}class="${classes}"`;

const KIND = /(<tanrei-callout\b(?:[^<>"]|"[^"]*")*?) data-kind="(note|tip|caution|danger)" data-title="([^"]*)"/g;
const unescaped = (/** @type {string} */ text) =>
  text
    .replace(/&#x([0-9a-f]+);/gi, (_, /** @type {string} */ hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, /** @type {string} */ n) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const CODE_BLOCK = /<tanrei-code-block\b((?:[^<>"]|"[^"]*")*)>/g;
const COPIES = /\scopy(?=[\s=]|$)(?!="false")/;

// The mark the pipeline left on an external link (`EXTERNAL_WORDS`), read inside an anchor's tag only.
const EXTERNAL_LINK = new RegExp(`(<a\\b(?:[^<>"]|"[^"]*")*?) ${EXTERNAL_WORDS}="externalLink"`, 'g');

// A `pre` is passed over whole, so the `code` of a block is never taken for inline code.
const INLINE_CODE = /<pre\b[\s\S]*?<\/pre>|<code\b((?:[^<>"]|"[^"]*")*)>/g;
const inlineCode = (/** @type {string} */ match, /** @type {string | undefined} */ attributes) => {
  if (attributes === undefined) return match;
  const named = /\sclass="([^"]*)"/.exec(attributes);
  let out = named ? (named[1].split(/\s+/).includes('tanrei-code') ? attributes : attributes.replace(named[0], ` class="tanrei-code ${named[1]}"`)) : ` class="tanrei-code"${attributes}`;
  if (!/\stranslate=/.test(out)) out += ' translate="no"';
  if (!/\sspellcheck=/.test(out)) out += ' spellcheck="false"';
  return `<code${out}>`;
};

/**
 * @typedef {'note' | 'tip' | 'caution' | 'danger'} NoticeKind
 * @typedef {object} ContentWords The page's language's words.
 * @property {(kind: NoticeKind) => string} kind A notice's kind, by name (Starlight's `aside.<kind>`).
 * @property {{ copy: string, copied: string, copyFailed: string, highlighted: string, added: string, removed: string }} code A code block's words (lib/i18n.ts, `code`).
 * @property {string} externalLink What is said of a link that leaves the site (lib/i18n.ts, `externalLink`).
 */

/**
 * A page's rendered content, said in Tanrei's words: headings with their links, a notice's kind, a code block's words,
 * an external link's words, inline code, and the parts that are not prose — in that order.
 * @param {string} html
 * @param {ContentWords} words
 * @returns {string}
 */
export function tanreiContent(html, words) {
  const kind = (/** @type {string} */ _, /** @type {string} */ before, /** @type {NoticeKind} */ name, /** @type {string} */ title) => {
    const kindName = words.kind(name);
    return name === 'tip' || unescaped(title) === kindName ? before : `${before} status-label="${attribute(kindName)}"`;
  };

  /** @type {[needs: RegExp, name: string, value: string][]} */
  const codeWordsOf = [
    [COPIES, 'copy-label', words.code.copy],
    [COPIES, 'copied-label', words.code.copied],
    [COPIES, 'copy-failed-label', words.code.copyFailed],
    [/\shighlighted-lines="/, 'highlighted-label', words.code.highlighted],
    [/\sadded-lines="/, 'added-label', words.code.added],
    [/\sremoved-lines="/, 'removed-label', words.code.removed],
  ];
  const codeWords = (/** @type {string} */ _, /** @type {string} */ attributes) =>
    `<tanrei-code-block${attributes}${codeWordsOf.filter(([needs, name]) => needs.test(attributes) && !attributes.includes(` ${name}="`)).map(([, name, value]) => ` ${name}="${attribute(value)}"`).join('')}>`;

  const externalLink = (/** @type {string} */ _, /** @type {string} */ before) => `${before} aria-description="${attribute(words.externalLink)}"`;

  return html.replace(HEADING, anchor).replace(KIND, kind).replace(CODE_BLOCK, codeWords).replace(EXTERNAL_LINK, externalLink).replace(INLINE_CODE, inlineCode).replace(CLASS, island);
}
