// Addresses in the source repository that the frame links to: a file on GitHub, and a new issue about a page. The
// repository is `tanrei.config.json`'s (`repository.public`); nothing here writes its name. Plain functions, so that
// Node can test them without the site (test/repository.test.mjs).
import config from '../../../../tanrei.config.json';

/** The repository on GitHub. */
export const repositoryHref = `https://github.com/${config.repository.public}`;

/** The branch the site is built from, and so the one whose files a page is made of. */
export const SITE_BRANCH = 'main';

/** A file of the repository (a path from its root: `specs/button.spec.json`) as GitHub shows it on the site's branch. */
export const fileHref = (file: string) => `${repositoryHref}/blob/${SITE_BRANCH}/${file.split('/').map(encodeURIComponent).join('/')}`;

/**
 * What the foot of a page links to in the repository, from the files the page is made of (`pageSources` of
 * lib/lastmod.mjs: its own source first, then a component page's spec and tokens): the page's source, and on a
 * component's page its spec. A page with no source of the content (the page that was not found) links to neither.
 */
export function pageSourceLinks(sources: readonly string[]): { source?: string; spec?: string } {
  const [source] = sources;
  const spec = sources.find((file) => /^specs\/[a-z0-9-]+\.spec\.json$/.test(file));
  return { ...(source ? { source: fileHref(source) } : {}), ...(spec ? { spec: fileHref(spec) } : {}) };
}

/** The issue form a problem with a page is reported in (`.github/ISSUE_TEMPLATE/<template>`), and its fields' ids and the platform it names. */
export const ISSUE_FORM = { template: 'bug.yml', platform: { field: 'platform', value: 'Docs' }, component: 'component', what: 'what' } as const;

/**
 * A new issue about a page, in the repository's bug form: its title and its first field carry the page's address,
 * its platform is the docs, and on a component's page it names the component. GitHub fills a form's fields from the
 * address's parameters of the same ids.
 */
export function reportProblemHref(pageUrl: string, component?: string): string {
  const url = new URL(`${repositoryHref}/issues/new`);
  url.searchParams.set('template', ISSUE_FORM.template);
  url.searchParams.set('title', `Docs: ${pageUrl}`);
  url.searchParams.set(ISSUE_FORM.platform.field, ISSUE_FORM.platform.value);
  if (component) url.searchParams.set(ISSUE_FORM.component, component);
  url.searchParams.set(ISSUE_FORM.what, `Page: ${pageUrl}\n\n`);
  return url.href;
}
