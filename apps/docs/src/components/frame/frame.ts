// What the parts of the page frame share (components/frame/): the frame's words in the page's language, and the
// page's place in the sidebar's own hierarchy.
import { strings } from '../../lib/i18n';

/** A sidebar entry as the framework gives it to every page (`Astro.locals.starlightRoute.sidebar`). */
export type Entry =
  | { type: 'link'; label: string; href: string; isCurrent: boolean; badge?: { text: string }; attrs?: Record<string, unknown>; /** Drawn only to a reader who asked for everything (lib/listing.mjs, `sidebarTree`). */ onRequest?: boolean }
  | { type: 'group'; label: string; entries: Entry[]; collapsed: boolean; badge?: { text: string } };

/** The frame's words: the language of the address (a page shown in English under `/ar/` keeps an Arabic frame). */
export const frameWords = (Astro: { locals: any }) => strings(Astro.locals.starlightRoute.lang).frame;

/**
 * The address of the first page of the page's language, as every other link of the site is written: ending with a
 * slash. The framework gives a translation's as its folder alone (`/ja`), and the site is built as folders with an
 * index (`ja/index.html`), so a host answers `/ja` with a redirect to `/ja/` — one more request on every press, to an
 * address that is not the page's own. The site's title, the breadcrumbs' first level and the not-found page's action
 * all go there, and all ask here.
 */
export const homeHref = (route: { siteTitleHref: string }) => (route.siteTitleHref.endsWith('/') ? route.siteTitleHref : `${route.siteTitleHref}/`);

const links = (entries: Entry[]): Extract<Entry, { type: 'link' }>[] => entries.flatMap((entry) => (entry.type === 'link' ? [entry] : links(entry.entries)));

/** The current page's sidebar address, as the sidebar writes it: the drawer's `value` (NVD-23). */
export const currentHref = (sidebar: Entry[]) => links(sidebar).find((entry) => entry.isCurrent)?.href ?? '';

/**
 * The groups above the current page, outermost first. A group's level is a link where the group holds the page its
 * others stand under (`/components/` for `/components/button/`), and that page is not the current one.
 */
export function trail(sidebar: Entry[]): { label: string; href?: string }[] {
  const walk = (entries: Entry[], above: { label: string; href?: string }[]): { label: string; href?: string }[] | undefined => {
    for (const entry of entries) {
      if (entry.type === 'link') {
        if (entry.isCurrent) return above;
        continue;
      }
      const own = links(entry.entries);
      const index = own.find((link) => own.every((other) => other.href.startsWith(link.href)));
      const found = walk(entry.entries, [...above, { label: entry.label, href: index && !index.isCurrent ? index.href : undefined }]);
      if (found) return found;
    }
    return undefined;
  };
  return walk(sidebar, []) ?? [];
}

/** The glyph of a top-level group of the sidebar, by the first folder of its pages: a collapsible drawer draws its
    column from them (NVD-49). A group of another folder gets the icon set's `folder`. */
const GROUP_ICONS: Record<string, string> = { 'getting-started': 'rocket_launch', foundations: 'category', tokens: 'data_object', components: 'widgets', status: 'info', project: 'info' };
export function groupIcon(entry: Extract<Entry, { type: 'group' }>, localeBase: string): string {
  const first = links(entry.entries)[0]?.href ?? '';
  const folder = first.slice(localeBase.length).split('/').filter(Boolean)[0] ?? '';
  return GROUP_ICONS[folder] ?? 'folder';
}
