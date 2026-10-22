// When each page of the sitemap last changed (`<lastmod>`), from git.
//
// sitemaps.org: `lastmod` is the date the page was last modified, in W3C Datetime. Google reads it only while it is
// consistently and verifiably accurate, and only for a significant change to the page's content — not the build, not
// the frame around the content, not the copyright line. So a page's date is the newest commit that touched what the
// page says, and never the time of the build:
//
//   - its own source under `src/content/docs/` — a translated page's own file, so that each language carries its
//     own date; a translation that does not exist yet is the English page, which the site shows in its place;
//   - for a component's page, also its spec (`specs/<name>.spec.json`): the tables, the facts under its head and its
//     fixtures are drawn from it in every language.
//
// The date of a change is the date it reached the branch the site is built from: the history is read along first
// parents, so a change merged from a pull request carries the date of its merge, not of the commit on its branch.
//
// The dates come from one `git log` over those paths when the site is built. A shallow clone knows only its last
// commit and would give every page that date, so the build stops there instead of writing a wrong date: a checkout
// that builds the site fetches the whole history of commits and trees (`fetch-depth: 0`, `filter: blob:none`).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** The extensions a page's source may have, in the order the content loader prefers them. */
const EXTENSIONS = ['.mdx', '.md'];

/**
 * The files a page of the site is made from, relative to the repository's root.
 *
 * @param {string} url The page's address (absolute, or a path from the site's root).
 * @param {{ repoRoot: string, contentDir: string, languages: string[] }} where The repository, the docs' content folder
 *   (relative to it) and the folders of the translations.
 * @returns {string[]} Its source first, then the spec of a component's page; empty for an address with no source.
 */
export function pageSources(url, { repoRoot, contentDir, languages }) {
  const segments = new URL(url, 'https://site.invalid').pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const language = languages.includes(segments[0]) ? segments.shift() : '';
  const slug = segments.join('/');
  const candidates = (dir) => (slug ? [slug, `${slug}/index`] : ['index']).flatMap((name) => EXTENSIONS.map((ext) => path.posix.join(contentDir, dir, name + ext)));
  const source = [...(language ? candidates(language) : []), ...candidates('')].find((file) => fs.existsSync(path.join(repoRoot, file)));
  if (!source) return [];
  const component = /^components\/([a-z0-9-]+)$/.exec(slug)?.[1];
  const spec = component && `specs/${component}.spec.json`;
  return spec && fs.existsSync(path.join(repoRoot, spec)) ? [source, spec] : [source];
}

/**
 * The commit date of the newest commit along first parents that touched each file under the given paths: one
 * `git log`, newest first, so a file's first appearance is its date — what
 * `git log -1 --first-parent --format=%cI -- <file>` prints for it.
 *
 * @param {string} repoRoot
 * @param {string[]} paths Folders or files, relative to the repository's root.
 * @returns {Map<string, string>} File (relative to the root) → ISO 8601 date with its offset.
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
    else if (line && !dates.has(line)) dates.set(line, date);
  }
  return dates;
}

/**
 * The sitemap's dates: an integration that reads them from git when the site is built (and only then, so `astro dev`
 * runs in any clone), and the date of a page's address for the sitemap's `serialize`.
 *
 * @param {{ repoRoot: string, contentDir: string, languages: string[] }} where
 */
export function sitemapLastmod(where) {
  /** @type {Map<string, string> | undefined} */
  let dates;
  const latest = (files) => files.map((file) => dates?.get(file)).filter(Boolean).sort((a, b) => Date.parse(b) - Date.parse(a))[0];
  return {
    integration: {
      name: 'tanrei-docs:sitemap-lastmod',
      hooks: {
        'astro:build:start': () => {
          dates = commitDates(where.repoRoot, [where.contentDir, 'specs']);
        },
      },
    },
    /**
     * @param {string} url
     * @returns {string | undefined} The newest commit date of the page's sources; none for a page no commit holds yet.
     */
    of: (url) => latest(pageSources(url, where)),
  };
}
