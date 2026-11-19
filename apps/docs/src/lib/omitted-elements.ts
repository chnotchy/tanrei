// Where the site defines an element of a component the default system does not have (browser and Node).
//
// `@tanrei/web` registers only the default system's components: a component another system ships — a layer left it
// out of the default system, or it lives in a layer the default system does not descend from — comes only from that
// system's entry (`@tanrei/web/<id>`), from `@tanrei/web/all`, or from its own module for a product that includes it in
// its own layer. The site's pages define what they draw from the package's modules (lib/define-on-demand.ts), so
// without this rule they would reach every component, as `@tanrei/web/all` does. They define one of those components
// only where they show a system that has it on purpose:
//
// - on its own page, in every language, where it is the subject: the page's frame names it (`data-docs-subject` on the
//   app shell, components/frame/PageFrame.astro), and so does a window of its gallery of fixtures (lib/fixture-stages.ts);
// - inside a frame pinned to a shipped system that has it (`data-docs-shows-system="<id>"`): an example a page pins to
//   a preset (components/visuals/Example.astro) and the galleries of every shipped system (SystemGallery.astro,
//   SystemButtons.astro).
//
// The design system a reader chooses in the header changes how the page is drawn, never what it may use. Anywhere else
// the element stays undefined, as it would in a product on `@tanrei/web`, and a debug build says so.

/** What a tag of a component the default system does not have is: `outside` of `virtual:tanrei-element-modules`. */
export interface Outside {
  component: string;
  /** The shipped systems that have it. */
  systems: readonly string[];
  /** What the default system uses instead. */
  insteadUse: readonly string[];
}

/** The attribute that names the component a page (or a window of its fixtures) is about. */
export const SUBJECT_ATTR = 'data-docs-subject';
/** The attribute of a frame pinned to a shipped system, which shows that system on purpose. */
export const SHOWS_ATTR = 'data-docs-shows-system';

/** Where an element stands: the component the page is about, and the system of the nearest pinned frame around it. */
export interface Place {
  subject?: string | null;
  shows?: string | null;
}

/** Whether the site defines an element of this tag here: always for the default system's own, else only where it is shown on purpose. */
export function mayDefine(outside: Outside | undefined, { subject, shows }: Place): boolean {
  if (!outside) return true;
  if (subject === outside.component) return true;
  return Boolean(shows && outside.systems.includes(shows));
}

/** The debug report for an element left undefined. */
export function leftUndefined(tag: string, outside: Outside, system: string): string {
  const instead = outside.insteadUse.length ? ` Use ${outside.insteadUse.join(', ')} instead.` : '';
  return `[tanrei docs] <${tag}> is left undefined: the design system "${system}" does not have ${outside.component}, and @tanrei/web registers only its components (it comes from ${outside.systems.map((id) => `@tanrei/web/${id}`).join(', ')}). The site defines it only on its own page and in a frame pinned to a system that has it.${instead}`;
}

/** The nearest element around `element` that matches `selector`, across shadow roots. */
export function closestAcross(element: Element, selector: string): Element | null {
  for (let at: Element | null = element; at; ) {
    const found = at.closest(selector);
    if (found) return found;
    const root = at.getRootNode();
    at = root instanceof ShadowRoot ? root.host : null;
  }
  return null;
}

/** Where an element of the page stands (`Place`). */
export function placeOf(element: Element): Place {
  return {
    subject: element.ownerDocument.querySelector(`[${SUBJECT_ATTR}]`)?.getAttribute(SUBJECT_ATTR),
    shows: closestAcross(element, `[${SHOWS_ATTR}]`)?.getAttribute(SHOWS_ATTR),
  };
}
