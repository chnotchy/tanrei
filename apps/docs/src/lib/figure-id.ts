// An id for a figure of the page being rendered, for the parts it is named by: the docs write `aria-labelledby` (and
// `aria-describedby`) on a figure with a title themselves, so that it is named by its title before `tanrei-figure` is
// defined and where no script runs — the element writes the same once it is defined, and leaves alone what a page
// wrote (FIG-16). The count is the page's own: `Astro.locals` is one object per page.
const counts = new WeakMap<object, number>();

export function figureId(Astro: { locals: object }): string {
  const count = (counts.get(Astro.locals) ?? 0) + 1;
  counts.set(Astro.locals, count);
  return `docs-figure-${count}`;
}

const firsts = new WeakMap<object, Set<string>>();

/**
 * Whether this is the first time the page being rendered asks for `what`: a component that writes something once for
 * the page (the one frame's shared actions) asks here, because its own frontmatter runs anew for every use.
 */
export function firstOnPage(Astro: { locals: object }, what: string): boolean {
  const asked = firsts.get(Astro.locals) ?? new Set<string>();
  firsts.set(Astro.locals, asked);
  if (asked.has(what)) return false;
  asked.add(what);
  return true;
}
