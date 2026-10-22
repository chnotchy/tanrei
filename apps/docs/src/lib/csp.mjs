// Each page's script policy: the inline scripts it may run, by their hashes, and nothing else inline.
//
// The host sends one Content-Security-Policy for every page (public/_headers). A policy that named every inline script
// of the site by its hash would not fit in one header (the host takes 2,000 characters a line; the site has some twenty
// inline scripts and some fifty inline event handlers, and their hashes change whenever their text does), so the header
// allows `'unsafe-inline'` for scripts, and this step, run once the site is built, writes a second policy into each page:
// a `<meta http-equiv="Content-Security-Policy">` naming the hash of every inline script the page holds and of every
// event handler written in its markup (the demos' `onclick`). A browser enforces both policies, so a script runs only if
// both allow it: the header's directives hold for everything, and the page's take `'unsafe-inline'` away.
//
// The meta element stands right after the page's `<meta charset>`, before any script: a policy delivered in a meta
// element governs only what comes after it.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The origin of the analytics beacon the host adds to every page (Cloudflare Web Analytics). */
export const BEACON_ORIGIN = 'https://static.cloudflareinsights.com';

/** Script types that are data, not code: a policy does not govern them, and they are not hashed. */
const DATA_TYPES = new Set(['application/json', 'application/ld+json', 'importmap']);

const sha256 = (text) => `'sha256-${crypto.createHash('sha256').update(text, 'utf8').digest('base64')}'`;

const NAMED = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
/** An attribute's value as the browser reads it: its character references resolved. */
function decodeAttribute(value) {
  return value.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (reference, name) => {
    if (name[0] === '#') return String.fromCodePoint(name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10));
    const character = NAMED[name.toLowerCase()];
    if (character === undefined) throw new Error(`an event handler holds the character reference ${reference}, which the policy step does not resolve`);
    return character;
  });
}

/**
 * What a page runs inline: the text of each inline script (of a type that is code), and the value of each event handler
 * attribute in its markup. A `javascript:` address is refused: no policy here allows one.
 * @param {string} html
 * @returns {{ scripts: string[], handlers: string[] }}
 */
export function inlineCode(html) {
  const scripts = [];
  for (const [, attributes, text] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (/\ssrc\s*=/i.test(attributes)) continue;
    const type = attributes.match(/\stype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    if (type && DATA_TYPES.has((type[1] ?? type[2] ?? type[3]).trim().toLowerCase())) continue;
    scripts.push(text);
  }
  // The markup's tags, once the raw text of scripts and styles and the comments are out of the way: everywhere else a
  // `<` that opens no tag is written as `&lt;`, so the code shown in a code block is not read as markup.
  const markup = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  const handlers = [];
  for (const [tag] of markup.matchAll(/<[a-z][^\s/>]*(?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*\/?>/gi)) {
    for (const [, name, double, single, bare] of tag.matchAll(/\s([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
      const value = double ?? single ?? bare ?? '';
      if (/^on/i.test(name)) handlers.push(decodeAttribute(value));
      else if (/^(href|src|action|formaction)$/i.test(name) && /^\s*javascript:/i.test(decodeAttribute(value))) throw new Error(`a page links to a javascript: address (${tag.slice(0, 120)}), which no policy here allows`);
    }
  }
  return { scripts, handlers };
}

/**
 * The page's own policy: scripts from the site and the beacon's origin, WebAssembly, the inline scripts it holds by their
 * hashes, and the event handlers in its markup by theirs (`'unsafe-hashes'`), or none.
 * @param {string} html
 */
export function pagePolicy(html) {
  const { scripts, handlers } = inlineCode(html);
  const unique = (texts) => [...new Set(texts.map(sha256))].sort();
  // `'wasm-unsafe-eval'`: the search compiles its index's WebAssembly (Pagefind) in a worker, which keeps this policy.
  const elements = ["'self'", "'wasm-unsafe-eval'", BEACON_ORIGIN, ...unique(scripts)];
  const attributes = handlers.length ? ["'unsafe-hashes'", ...unique(handlers)] : ["'none'"];
  return `script-src ${elements.join(' ')}; script-src-attr ${attributes.join(' ')}`;
}

/**
 * The page with its policy written in, right after its `<meta charset>`, before any script.
 * @param {string} html
 */
export function withPagePolicy(html) {
  // A page with no `<meta charset>` is Astro's redirect for a moved address, which runs nothing: its policy stands
  // right after the doctype.
  const anchor = html.match(/<meta charset="[^"]*"\s*\/?>/i) ?? html.match(/^<!doctype html>/i);
  if (!anchor) throw new Error('a page has neither a <meta charset> nor a doctype, after which its policy would stand');
  const at = anchor.index + anchor[0].length;
  if (/<script\b/i.test(html.slice(0, at))) throw new Error('a page runs a script before its <meta charset>, where its policy would not govern it');
  return `${html.slice(0, at)}<meta http-equiv="Content-Security-Policy" content="${pagePolicy(html)}">${html.slice(at)}`;
}

async function* htmlFiles(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(file);
    else if (entry.name.endsWith('.html')) yield file;
  }
}

/**
 * Writes each built page's policy into it. Listed last of the integrations, so that it reads every page as it is
 * served, the copies of the not-found pages included.
 * @returns {{ name: string, hooks: { 'astro:build:done': (options: { dir: URL }) => Promise<void> } }}
 */
export function pagePolicies() {
  return {
    name: 'tanrei-docs:page-policies',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        for await (const file of htmlFiles(fileURLToPath(dir))) {
          const html = await fs.readFile(file, 'utf8');
          if (/http-equiv="Content-Security-Policy"/i.test(html)) throw new Error(`${file} already holds a policy`);
          await fs.writeFile(file, withPagePolicy(html));
        }
      },
    },
  };
}
