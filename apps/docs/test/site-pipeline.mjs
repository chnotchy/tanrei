// The site's own Markdown pipeline, for a test: `astro.config.mjs` is read and its integrations' `astro:config:setup`
// hooks are run by Astro's own code, exactly as `astro build` begins — Starlight registers its steps, then
// `tanreiMarkdown()` (src/lib/markdown.mjs) registers Tanrei's — and the configured processor makes the renderers the
// build makes. Nothing of the pipeline is declared again here, so a test reads what the site would write.
//
// Astro gives a build no public way to stop after its configuration, so two of its internal modules are imported by
// path (`core/config`, `integrations/hooks`). If an upgrade moves them, this file is the one place to follow it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const docsRoot = fileURLToPath(new URL('..', import.meta.url));
const astro = path.join(docsRoot, 'node_modules/astro/dist');
const internal = (file) => import(pathToFileURL(path.join(astro, file)).href);

/** The name of the integration that registers Tanrei's passes (src/lib/markdown.mjs). */
export const TANREI = 'tanrei-docs-markdown';

/**
 * The site's configuration after `astro:config:setup`, and what its integrations warned of on the way.
 * `without` leaves integrations out by name: `[TANREI]` gives the pipeline as the engine and Starlight alone make it.
 */
export async function configure({ without = [] } = {}) {
  const [{ resolveConfig, createSettings }, { runHookConfigSetup }, { AstroLogger }] = await Promise.all([internal('core/config/index.js'), internal('integrations/hooks.js'), internal('core/logger/core.js')]);
  const messages = [];
  const logger = new AstroLogger({ level: 'warn', destination: { write: (event) => (messages.push(event), true) } });
  const { astroConfig } = await resolveConfig({ root: docsRoot, logLevel: 'warn' }, 'build');
  astroConfig.integrations = astroConfig.integrations.filter((integration) => !without.includes(integration.name));
  const settings = await createSettings(astroConfig, 'warn', docsRoot);
  const config = (await runHookConfigSetup({ settings, command: 'build', logger })).config;
  return { config, messages };
}

/** A page's address in the site's content, where Starlight's steps run: `pageURL('guide.md')`, `pageURL('ja/guide.md')`. */
export const pageURL = (name) => pathToFileURL(path.join(docsRoot, 'src/content/docs', name));

/**
 * The renderers of a configuration, made as the build makes them (astro's `vite-plugin-markdown` and the MDX
 * integration's `vite-plugin-mdx`): `md()` gives a `.md` page's HTML, `mdx()` a `.mdx` page's compiled module.
 */
export async function renderers({ config, messages }) {
  const { markdown, image } = config;
  const shared = { syntaxHighlight: markdown.syntaxHighlight, shikiConfig: markdown.shikiConfig, gfm: markdown.gfm, smartypants: markdown.smartypants };
  const renderer = await markdown.processor.createRenderer({ image, ...shared });
  const mdxRenderer = await markdown.processor.createMdxRenderer(shared, { optimize: false, srcDir: config.srcDir, sourcemap: false });
  return {
    config,
    messages,
    plugins: markdown.processor.options,
    async md(source, { page = 'test-page.md', frontmatter = {} } = {}) {
      return (await renderer.render(source, { fileURL: pageURL(page), frontmatter })).code;
    },
    async mdx(source, { page = 'test-page.mdx', frontmatter = {} } = {}) {
      return (await mdxRenderer.process(source, fileURLToPath(pageURL(page)), frontmatter)).code;
    },
  };
}

// ── Reading what was rendered ───────────────────────────────────────────────────────────────────────────────────────

const VOID = new Set(['img', 'br', 'hr', 'input', 'path']);
const escapeText = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const escapeAttribute = (value) => escapeText(value).replaceAll('"', '&quot;');

/**
 * A compiled `.mdx` module as the HTML its content renders to, with a JSX runtime of a few lines in place of Astro's
 * (elements and fragments as text, `set:html` as it is, a component as the function `components` gives for its name;
 * `Fragment`, which Astro gives every page, is given here too).
 * The module must import nothing but the runtime: a test's page names its components and the test supplies them.
 */
export function mdxHtml(code, components = {}) {
  const Fragment = Symbol('fragment');
  const children = (value) => (Array.isArray(value) ? value.map(children).join('') : value === undefined || value === null || value === false || value === true ? '' : typeof value === 'object' ? value.html : escapeText(value));
  const jsx = (type, { children: inner, 'set:html': html, ...properties } = {}) => {
    if (typeof type === 'function') return { html: children(type({ ...properties, 'set:html': html, children: inner === undefined ? undefined : { html: children(inner) } })) };
    const content = html === undefined ? children(inner) : String(html);
    if (type === Fragment) return { html: content };
    const attributes = Object.entries(properties).filter(([, value]) => value !== false && value !== undefined && value !== null).map(([name, value]) => (value === true ? ` ${name}` : ` ${name}="${escapeAttribute(value)}"`)).join('');
    return { html: VOID.has(type) ? `<${type}${attributes}>` : `<${type}${attributes}>${content}</${type}>` };
  };
  const [runtime, ...others] = [...code.matchAll(/^import .*$/gm)].map((match) => match[0]);
  if (!runtime?.includes('astro/jsx-runtime') || others.length) throw new Error(`A test's .mdx page imports nothing of its own (found: ${others.join(' ') || runtime})`);
  const body = code.replace(runtime, '').replace(/^export /gm, '');
  const content = new Function('_Fragment', '_jsx', '_jsxs', `${body}\nreturn MDXContent;`)(Fragment, jsx, jsx);
  const fragment = ({ 'set:html': html, children: inner }) => (html === undefined ? inner : { html: String(html) });
  return children(content({ components: { Fragment: fragment, ...components } }));
}

/** Every opening tag of an element in a piece of HTML, in order: its attributes as a Map (a bare attribute is `''`). */
export function elements(html, name) {
  return [...html.matchAll(new RegExp(`<${name}((?:\\s+[^\\s=<>"]+(?:="[^"]*")?)*)\\s*>`, 'g'))].map((tag) => new Map([...tag[1].matchAll(/\s+([^\s=<>"]+)(?:="([^"]*)")?/g)].map((found) => [found[1], unescape(found[2] ?? '')])));
}

/** The one element of a name in a piece of HTML; anything else is the test's failure. */
export function element(html, name) {
  const found = elements(html, name);
  if (found.length !== 1) throw new Error(`Expected one <${name}> and found ${found.length} in:\n${html}`);
  return found[0];
}

function unescape(value) {
  return value.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
}

/** The text of a piece of HTML: what is left when the tags go. */
export const text = (html) => unescape(html.replace(/<[^>]*>/g, ''));
