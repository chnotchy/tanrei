// When each page of the site last changed, from git: the date the sitemap gives a page (`<lastmod>`), the one its
// head prints under its title ("Last updated"), its Markdown's `last_updated` and its structured data's
// `dateModified`, which are one value, read once.
//
// sitemaps.org: `lastmod` is the date the page was last modified, in W3C Datetime. Google reads it only while it is
// consistently and verifiably accurate, and only for a significant change to the page's content — not the build, not
// the frame around the content, not the copyright line. So a page's date is the newest commit that touched what the
// page says, and never the time of the build:
//
//   - its own source under `src/content/docs/` — a translated page's own file, so that each language carries its
//     own date; a translation that does not exist yet is the English page, which the site shows in its place;
//   - for a component's page, also its spec (`specs/<name>.spec.json`) and its component tokens — its own group's file
//     (`tokens/comp/`, or the layer's `tokens/systems/<layer>/comp/` for a component that lives in a layer) and every
//     shared set that names it among its readers: the tables, the facts under its head and its fixtures are drawn from
//     them in every language;
//   - for a page that draws tokens (it imports one of `src/components/tokens/`), the whole of `tokens/`, which those
//     tables and specimens read across every tier and system.
//
// The date of a change is the date it reached the branch the site is built from: the history is read along first
// parents, so a change merged from a pull request carries the date of its merge, not of the commit on its branch.
//
// The dates come from one `git log` over those paths when the site is built. A shallow clone knows only its last
// commit and would give every page that date, so the build stops there instead of writing a wrong date: a checkout
// that builds the site fetches the whole history of commits and trees (`fetch-depth: 0`, `filter: blob:none`).
// `astro dev` runs in any clone: in a shallow one it reads no dates, and no page prints one.
//
// A page's date is written in UTC (`2026-10-22T20:00:00.000Z`), whatever offset its commit was made in: the sitemap
// writes every date in UTC whatever it is given, so the page, its Markdown and its structured data write that same
// string, and the day the head prints is the day the sitemap names — not a day that hangs on the offset of whoever
// made the commit (a merge on GitHub and a commit on a laptop in Tokyo give two).
//
// The pages read the same dates through a virtual module, `virtual:tanrei-docs/last-updated` (declared in
// src/env.d.ts): its `lastUpdated(url)` is what the sitemap writes for that address.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The extensions a page's source may have, in the order the content loader prefers them. */
const EXTENSIONS = ['.mdx', '.md'];

/** A page that imports one of the components that draw tokens reads the whole of `tokens/`. */
const DRAWS_TOKENS = /^\s*import\b[^\n]*\/components\/tokens\//m;

/**
 * The files a page of the site is made from, relative to the repository's root. A folder (`tokens`) stands for every
 * file under it.
 *
 * @param {string} url The page's address (absolute, or a path from the site's root).
 * @param {{ repoRoot: string, contentDir: string, languages: string[] }} where The repository, the docs' content folder
 *   (relative to it) and the folders of the translations.
 * @returns {string[]} Its source first, then a component page's spec and component tokens, then `tokens` for a page
 *   that draws tokens; empty for an address with no source.
 */
export function pageSources(url, { repoRoot, contentDir, languages }) {
  const segments = new URL(url, 'https://site.invalid').pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const language = languages.includes(segments[0]) ? segments.shift() : '';
  const slug = segments.join('/');
  const candidates = (dir) => (slug ? [slug, `${slug}/index`] : ['index']).flatMap((name) => EXTENSIONS.map((ext) => path.posix.join(contentDir, dir, name + ext)));
  const source = [...(language ? candidates(language) : []), ...candidates('')].find((file) => fs.existsSync(path.join(repoRoot, file)));
  if (!source) return [];
  const sources = [source];
  const component = /^components\/([a-z0-9-]+)$/.exec(slug)?.[1];
  const spec = component && `specs/${component}.spec.json`;
  if (spec && fs.existsSync(path.join(repoRoot, spec))) sources.push(spec, ...componentTokenFiles(repoRoot, component, JSON.parse(fs.readFileSync(path.join(repoRoot, spec), 'utf8'))));
  if (DRAWS_TOKENS.test(fs.readFileSync(path.join(repoRoot, source), 'utf8'))) sources.push('tokens');
  return sources;
}

/**
 * The component tokens a component's page draws, as its Specs tab reads them: its own group's file, then each shared
 * set of `tokens/comp/` that names the component among its readers (`dev.<namespace>.shared.readers`).
 *
 * @param {string} repoRoot
 * @param {string} component
 * @param {{ tokens?: string, layer?: string }} spec
 * @returns {string[]}
 */
function componentTokenFiles(repoRoot, component, spec) {
  const group = spec.tokens?.replace(/^comp\./, '');
  const own = group && (spec.layer ? `tokens/systems/${spec.layer}/comp/${group}.tokens.json` : `tokens/comp/${group}.tokens.json`);
  const { namespace } = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tanrei.config.json'), 'utf8'));
  const folder = path.join(repoRoot, 'tokens/comp');
  const shared = (fs.existsSync(folder) ? fs.readdirSync(folder) : [])
    .filter((name) => name.endsWith('.tokens.json'))
    .sort()
    .map((name) => `tokens/comp/${name}`)
    .filter((file) => file !== own)
    .filter((file) => {
      const groups = Object.values(JSON.parse(fs.readFileSync(path.join(repoRoot, file), 'utf8'))[namespace]?.comp ?? {});
      return groups.some((tree) => tree?.$extensions?.[`dev.${namespace}.shared`]?.readers?.includes(component));
    });
  return [...(own && fs.existsSync(path.join(repoRoot, own)) ? [own] : []), ...shared];
}

/**
 * The commit date of the newest commit along first parents that touched each file under the given paths: one
 * `git log`, newest first, so a file's first appearance is its date — what
 * `git log -1 --first-parent --format=%cI -- <file>` prints for it. Each folder above a file is dated too, by the
 * newest file under it, as git dates a folder given as its path.
 *
 * @param {string} repoRoot
 * @param {string[]} paths Folders or files, relative to the repository's root.
 * @returns {Map<string, string>} File or folder (relative to the root, no trailing slash) → ISO 8601 date with its
 *   offset.
 */
export function commitDates(repoRoot, paths) {
  const git = (...args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (git('rev-parse', '--is-shallow-repository').trim() !== 'false') {
    throw new Error('The sitemap dates each page from git, and this clone is shallow: every page would get the date of its last commit. Fetch the history (actions/checkout: `fetch-depth: 0`, `filter: blob:none`; locally: `git fetch --unshallow --filter=blob:none`).');
  }
  const dates = new Map();
  let date;
  for (const line of git('log', '--first-parent', '--diff-merges=first-parent', '--format=%x1e%cI', '--name-only', '--no-renames', '--', ...paths).split('\n')) {
    if (line.startsWith('\x1e')) date = line.slice(1);
    else if (line) {
      // A file is dated by its first line in the log, and so is each folder above it that no file under it dated yet.
      for (let at = line.length; at > 0 && !dates.has(line.slice(0, at)); at = line.lastIndexOf('/', at - 1)) dates.set(line.slice(0, at), date);
    }
  }
  return dates;
}

/** The newest of the dates of some files, in UTC, or none where no commit holds any of them. */
const newest = (dates, files) => {
  const times = files.map((file) => dates.get(file)).filter(Boolean).map((date) => Date.parse(date));
  return times.length ? new Date(Math.max(...times)).toISOString() : undefined;
};

/** The virtual module the pages read the dates from. */
export const LAST_UPDATED_MODULE = 'virtual:tanrei-docs/last-updated';

/**
 * The source of the virtual module: the dates as they were read, where the pages are, and `lastUpdated(url)`, which
 * answers what the sitemap's `of(url)` answers.
 *
 * @param {Map<string, string>} dates
 * @param {{ repoRoot: string, contentDir: string, languages: string[] }} where
 * @returns {string}
 */
export function lastUpdatedModule(dates, where) {
  return [
    `import { pageDate } from ${JSON.stringify(fileURLToPath(import.meta.url))};`,
    `const dates = new Map(${JSON.stringify([...dates])});`,
    `const where = ${JSON.stringify(where)};`,
    '/** When the page at `url` last changed: what the sitemap writes for it (ISO 8601, UTC), or none. */',
    'export const lastUpdated = (url) => pageDate(dates, url, where);',
  ].join('\n');
}

/**
 * The date of a page: the newest of its sources' dates, in UTC (ISO 8601, as `Date#toISOString` writes it).
 *
 * @param {Map<string, string>} dates
 * @param {string} url
 * @param {{ repoRoot: string, contentDir: string, languages: string[] }} where
 * @returns {string | undefined}
 */
export const pageDate = (dates, url, where) => newest(dates, pageSources(url, where));

/**
 * The pages' dates: an integration that reads them from git once when the site is built (and, for `astro dev`, the
 * first time a page asks, without stopping a shallow clone), and gives them to the pages through the virtual module;
 * and the date of a page's address for the sitemap's `serialize`.
 *
 * @param {{ repoRoot: string, contentDir: string, languages: string[] }} where
 */
export function pageLastmod(where) {
  /** @type {Map<string, string> | undefined} */
  let dates;
  const read = () => commitDates(where.repoRoot, [where.contentDir, 'specs', 'tokens']);
  const resolved = `\0${LAST_UPDATED_MODULE}`;
  return {
    integration: {
      name: 'tanrei-docs:lastmod',
      hooks: {
        'astro:config:setup': ({ command, updateConfig, logger }) => {
          const plugin = {
            name: 'tanrei-docs:last-updated',
            resolveId: (id) => (id === LAST_UPDATED_MODULE ? resolved : undefined),
            load: (id) => {
              if (id !== resolved) return undefined;
              if (!dates && command === 'dev') {
                try {
                  dates = read();
                } catch (error) {
                  logger.warn(`${error.message} No page says when it last changed.`);
                  dates = new Map();
                }
              }
              if (!dates) throw new Error(`${LAST_UPDATED_MODULE} was loaded before the build read the dates`);
              return lastUpdatedModule(dates, where);
            },
          };
          updateConfig({ vite: { plugins: [plugin] } });
        },
        'astro:build:start': () => {
          dates = read();
        },
      },
    },
    /**
     * @param {string} url
     * @returns {string | undefined} The newest commit date of the page's sources; none for a page no commit holds yet.
     */
    of: (url) => (dates ? pageDate(dates, url, where) : undefined),
  };
}
