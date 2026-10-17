// Each page asks for every module its scripts import, in its head, at once.
//
// A page's scripts are modules (Astro bundles each component's `<script>` into `/_astro/`). A module is only seen to
// import another once it has arrived and been parsed, so without help the browser fetches a page's graph a level at a
// time: the scripts, then what they import, then what those import — five levels on a component page, one round trip
// each (562 ms apiece on a throttled mobile line). The bundler knows the whole graph; this step writes it into each
// built page as a `<link rel="modulepreload">` for every module the page's scripts import statically, so all of them
// are asked for together while the head is read. Cloudflare Pages also sends these links ahead of the page as Early
// Hints (a 103 response); a link with `crossorigin` is not sent, and none is needed here: every module is the site's
// own and is fetched the way a module script fetches it.
//
// Only static imports: a module the page imports with `import()` is fetched when it is asked for (Theme Studio's
// emitter, a language's search index), and preloading it would spend the slow line on what the first screen may
// never use.
//
// The links stand last in the head, after the stylesheets and the preloaded fonts, so that what blocks the first
// paint is asked for first.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The client environment's name in Astro's Vite build: the browser's bundle, the one the pages' scripts come from. */
const CLIENT = 'client';

/**
 * The modules a page's scripts import statically, each once: its scripts first, in the order the page names them,
 * then what they import, a level at a time — the order the browser would come to them without the links.
 *
 * @param {string[]} entries The bundle's file names of the page's module scripts (`_astro/Header.….js`).
 * @param {Map<string, string[]>} imports Each chunk of the client bundle and the chunks it imports statically.
 * @returns {string[]}
 */
export function staticGraph(entries, imports) {
  const seen = new Set();
  let level = entries;
  while (level.length) {
    const next = [];
    for (const file of level) {
      if (seen.has(file)) continue;
      const deps = imports.get(file);
      if (!deps) throw new Error(`module-preload: a page's script ${file} is not a chunk of the client bundle.`);
      seen.add(file);
      next.push(...deps);
    }
    level = next;
  }
  return [...seen];
}

/**
 * A built page with a `<link rel="modulepreload">` for each module its scripts import statically, before `</head>`.
 *
 * @param {string} html The page as built.
 * @param {Map<string, string[]>} imports The client bundle's static imports, by chunk file name.
 * @param {string} base The site's base path (`/`), which the scripts' addresses start with.
 * @returns {string} The page; unchanged when it has no module script from the bundle.
 */
export function withModulePreloads(html, imports, base = '/') {
  const entries = [];
  for (const [tag] of html.matchAll(/<script\b[^>]*>/g)) {
    if (!/\btype="module"/.test(tag)) continue;
    const src = tag.match(/\bsrc="([^"]+)"/)?.[1];
    if (!src?.startsWith(base)) continue;
    const file = src.slice(base.length);
    if (imports.has(file)) entries.push(file);
    else if (/^_astro\//.test(file)) throw new Error(`module-preload: the page names a script ${src} the client bundle did not emit.`);
  }
  if (!entries.length) return html;
  if (/<link\b[^>]*\brel="modulepreload"/.test(html)) throw new Error('module-preload: the page already has modulepreload links; it would be given them twice.');
  const end = html.indexOf('</head>');
  if (end < 0) throw new Error('module-preload: the page has no </head>.');
  const links = staticGraph(entries, imports).map((file) => `<link rel="modulepreload" href="${base}${file}">`).join('');
  return html.slice(0, end) + links + html.slice(end);
}

/** Every `.html` file under a folder. */
async function* htmlFiles(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(file);
    else if (entry.name.endsWith('.html')) yield file;
  }
}

/**
 * The integration: it reads the client bundle's import graph as the bundle is written, and when the site has been
 * built, writes the links into every page.
 *
 * @returns {import('astro').AstroIntegration}
 */
export function modulePreload() {
  /** @type {Map<string, string[]>} */
  const imports = new Map();
  let base = '/';
  return {
    name: 'tanrei-docs:module-preload',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        updateConfig({
          vite: {
            plugins: [
              {
                name: 'tanrei-docs:module-preload-graph',
                apply: 'build',
                applyToEnvironment: (environment) => environment.name === CLIENT,
                generateBundle(_options, bundle) {
                  for (const output of Object.values(bundle)) if (output.type === 'chunk') imports.set(output.fileName, [...output.imports]);
                },
              },
            ],
          },
        });
      },
      'astro:config:done': ({ config }) => {
        base = config.base.endsWith('/') ? config.base : `${config.base}/`;
      },
      'astro:build:done': async ({ dir }) => {
        if (!imports.size) throw new Error('module-preload: the client bundle was not seen; no page can be given its modules.');
        for await (const file of htmlFiles(fileURLToPath(dir))) {
          const html = await fs.readFile(file, 'utf8');
          const out = withModulePreloads(html, imports, base);
          if (out !== html) await fs.writeFile(file, out);
        }
      },
    },
  };
}
