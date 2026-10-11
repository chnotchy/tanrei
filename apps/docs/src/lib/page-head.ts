// What the head of a page (components/frame/PageTitle.astro) draws beside the title, from the page itself: the spec a
// component's page documents, whose facts stand under the head. A plain function of the page's id, so that Node can
// test it without the site (test/page-head.test.mjs).
import { strings } from './i18n';
import { isOnRequest, usedIn } from './listing.mjs';
import { componentHref, levels, listings, specs, type Spec } from './repo';

/**
 * The spec a page documents: the page `components/<name>` of any language (`ja/components/<name>`), where a spec of
 * that name exists. The components' index, a page under another folder and a name with no spec document none.
 */
export function specOfPage(id: string, known: Record<string, Spec> = specs): Spec | undefined {
  const name = /^(?:[a-z]{2}(?:-[a-z]{2})?\/)?components\/([a-z0-9-]+)$/.exec(id.replace(/\.mdx?$/, ''))?.[1];
  return name && Object.hasOwn(known, name) ? known[name] : undefined;
}

/**
 * Whether a page is the page that was not found, of any language (`404`, `ja/404`). It has no head of its own: its
 * heading is the title of the empty state that fills its main region (components/NotFound.astro).
 */
export const isNotFoundPage = (id: string) => /^(?:[a-z]{2}(?:-[a-z]{2})?\/)?404$/.test(id.replace(/\.(mdx?|html)$/, ''));

/**
 * The front matter of the page that was not found, in a language: its title — the document's and the heading's — in
 * that language's words, no "On this page", no previous and next page; left out of the site's search and marked for
 * crawlers as a page not to index.
 */
export const notFoundFrontmatter = (lang: string | undefined) => ({
  title: strings(lang).notFound.title,
  tableOfContents: false,
  pagefind: false,
  prev: false,
  next: false,
  head: [{ tag: 'meta' as const, attrs: { name: 'robots', content: 'noindex' } }],
});

/** A component a component is built from, as the head of a page names it: its title, and its page where it has one. */
export interface BuiltFromMember {
  name: string;
  title: string;
  href?: string;
}

/**
 * The level of the component a page documents and what it is built from, as the facts under the head
 * say them: the level in the page's language — the word for what the level is, found by which of the names the
 * spec carries, so that no name is written here — and each component of its `builtFrom` by its title, linked to its
 * page under the language's base where the site has one. A component built from none has an empty list, and the head
 * then draws no "Built from".
 */
export function levelFacts(
  spec: Pick<Spec, 'level' | 'builtFrom'>,
  lang: string | undefined,
  base = '',
  known: Record<string, Pick<Spec, 'title'>> = specs,
  hrefOf: (base: string, name: string) => string | undefined = componentHref,
  names: Record<string, string> = levels,
): { level: string; builtFrom: BuiltFromMember[] } {
  const role = Object.keys(names).find((key) => names[key] === spec.level);
  return {
    level: (role && strings(lang).level[role]) ?? spec.level,
    builtFrom: (spec.builtFrom ?? []).map((name) => {
      const href = hrefOf(base, name);
      return { name, title: known[name]?.title ?? name, ...(href ? { href } : {}) };
    }),
  };
}

/**
 * Where the component a page documents is used, and whether a list shows it only on request, as the head of its page says them: every component whose `builtFrom` names it
 * ("Used in"), by its title and linked to its page; and, for a component shown on request, the ones among them that
 * every list shows — what most products place in its stead, which the line the page leads with links to. Read from
 * the specs; no name of a listing is written here.
 */
export function listingFacts(
  spec: Pick<Spec, 'name' | 'listing'>,
  base = '',
  known: Record<string, Pick<Spec, 'name' | 'title' | 'listing' | 'builtFrom'>> = specs,
  hrefOf: (base: string, name: string) => string | undefined = componentHref,
  names: { listed: string; onRequest: string } = listings,
): { onRequest: boolean; usedIn: BuiltFromMember[]; placedInstead: BuiltFromMember[] } {
  const users = usedIn(Object.values(known), spec.name);
  const member = (user: Pick<Spec, 'name' | 'title'>): BuiltFromMember => {
    const href = hrefOf(base, user.name);
    return { name: user.name, title: user.title, ...(href ? { href } : {}) };
  };
  const onRequest = isOnRequest(spec, names);
  return { onRequest, usedIn: users.map(member), placedInstead: onRequest ? users.filter((user) => !isOnRequest(user, names)).map(member) : [] };
}

/** A sentence of the dictionary with one `{place}`, as what stands before the place and what stands after it: the page puts links between the two. */
export function aroundPlace(sentence: string, place: string): [string, string] {
  const at = sentence.indexOf(`{${place}}`);
  return at < 0 ? [sentence, ''] : [sentence.slice(0, at), sentence.slice(at + place.length + 2)];
}
