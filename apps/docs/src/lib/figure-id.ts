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
