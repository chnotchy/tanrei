// A choice of kind is drawn from an element's first frame, where the browser answers style queries and where it does
// not. Without them the element reads the choice from the cascade and names it for the stylesheet (`data-separation`,
// `data-inverse`, `data-animation`, `data-mark`, `data-tanrei-underline`); a name written after the element was first
// styled draws the default form first and moves what transitions into the form the system chose — the snackbar's
// controls, for one, each time one appears (SNK-30).
//
// Each subject is one fixture of a spec, appended to a page whose system chooses the form that is not the default one:
// when the element has updated nothing is in transition, in the first frame it is in the form it rests in, and where
// there are no style queries it carries the name. The titles carry the ids the `firefox-no-style-queries` project runs.
import { type Page, expect, test } from '@playwright/test';
import { type Fixture, fixturesDocument, loadSpec, mountFixtures } from '../test/harness.js';

interface Subject {
  /** The behaviour the choice belongs to. */
  id: string;
  spec: string;
  fixture: string | ((fixture: Fixture) => boolean);
  /** The page's system: the declarations on the root that choose the other form. */
  choice: Record<string, string>;
  /** Where there are no style queries: the attribute, and its value, on at least one element of the subject. */
  named: [attribute: string, value: string];
  /** The subject's own entrance, which is no move into a form: the properties it runs on (a tooltip written open fades and grows in). */
  enters?: string[];
}

const GAP = { '--tanrei-sys-behavior-separation': 'gap' };
const SUBJECTS: Subject[] = [
  { id: 'ACC-10', spec: 'accordion', fixture: (f) => !f.props.separation, choice: GAP, named: ['data-separation', 'gap'] },
  { id: 'FIG-12', spec: 'figure', fixture: (f) => !f.props.separation, choice: GAP, named: ['data-separation', 'gap'] },
  { id: 'DSL-13', spec: 'description-list', fixture: (f) => !f.props.separation, choice: GAP, named: ['data-separation', 'gap'] },
  { id: 'TBL-9', spec: 'table', fixture: (f) => !f.props.separation, choice: GAP, named: ['data-separation', 'gap'] },
  { id: 'APS-18', spec: 'app-shell', fixture: (f) => !f.props.separation, choice: GAP, named: ['data-separation', 'gap'] },
  { id: 'BGR-21', spec: 'button-group', fixture: (f) => f.props.variant === 'connected' && !f.props.separation, choice: GAP, named: ['data-separation', 'gap'] },
  { id: 'SPB-30', spec: 'button-with-menu', fixture: (f) => !f.props.separation, choice: GAP, named: ['data-separation', 'gap'] },
  { id: 'PRG-17', spec: 'progress-indicator', fixture: (f) => !f.props.separation && f.props.value !== undefined, choice: GAP, named: ['data-separation', 'gap'] },
  { id: 'MNU-35', spec: 'menu', fixture: (f) => !f.props.separation && !!f.items?.some((item) => item.kind === 'group'), choice: GAP, named: ['data-separation', 'gap'] },
  { id: 'MNU-38', spec: 'menu', fixture: 'checkbox-checked', choice: { '--tanrei-comp-menu-checkbox-item-mark': 'check' }, named: ['data-mark', 'check'] },
  { id: 'TIP-26', spec: 'tooltip', fixture: (f) => f.props.variant === 'rich' && f.props.inverse === undefined, choice: { '--tanrei-comp-tooltip-rich-container-inverse': 'on' }, named: ['data-inverse', 'on'], enters: ['opacity', 'transform'] },
  { id: 'TIP-26', spec: 'tooltip', fixture: (f) => f.props.variant !== 'rich' && f.props.inverse === undefined, choice: { '--tanrei-comp-tooltip-plain-container-inverse': 'off' }, named: ['data-inverse', 'off'], enters: ['opacity', 'transform'] },
  { id: 'SNK-30', spec: 'snackbar', fixture: (f) => f.props.inverse === undefined && !!f.props.action, choice: { '--tanrei-comp-snackbar-container-inverse': 'on' }, named: ['data-inverse', 'on'] },
  { id: 'SKL-12', spec: 'skeleton', fixture: () => true, choice: { '--tanrei-comp-skeleton-motion-animation': 'none' }, named: ['data-animation', 'none'] },
  { id: 'BRC-30', spec: 'breadcrumbs', fixture: () => true, choice: { '--tanrei-comp-breadcrumbs-underline-visibility': 'hover' }, named: ['data-tanrei-underline', 'hover'] },
  { id: 'FPK-4', spec: 'file-picker', fixture: 'drop-area', choice: { '--tanrei-comp-file-picker-outline-style': 'solid' }, named: ['data-outline', 'solid'] },
];

/** What is compared between the first frame and rest: what a form's rules set, on every element of the subject. */
const PROPERTIES = ['display', 'color', 'background-color', 'border-top-width', 'border-top-color', 'border-bottom-width', 'border-bottom-color', 'border-left-width', 'border-right-width', 'border-top-left-radius', 'border-bottom-right-radius', 'box-shadow', 'opacity', 'row-gap', 'column-gap', 'margin-top', 'margin-left', 'padding-top', 'padding-left', 'text-decoration-line', 'outline-width', 'width', 'height', 'animation-name', 'visibility'];

/** The stages of a fixtures document, as a page that is already there would be given them. */
const stagesOf = (document: string) => document.slice(document.indexOf('<body>') + '<body>'.length, document.indexOf('<script type="module">', document.indexOf('<body>'))).replace(/^<(main|div)[^>]*>|<\/(main|div)>$/g, '');

async function appear(page: Page, subject: Subject) {
  const spec = loadSpec(subject.spec);
  const fixture = spec.fixtures.find(typeof subject.fixture === 'string' ? (f) => f.id === subject.fixture : subject.fixture);
  expect(fixture, `${subject.spec} has a fixture for ${subject.id}`).toBeTruthy();
  // The page is there first — its tokens, its system's choice, the elements' definitions and, with one of the subject
  // already on it, the faces its text is set in (a face that arrives later would move every width) — and is drawn.
  await mountFixtures(page, spec, { fixtures: [fixture!], icons: true });
  await page.addStyleTag({ content: `:root { ${Object.entries(subject.choice).map(([name, value]) => `${name}: ${value};`).join(' ')} }` });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const markup = stagesOf(await fixturesDocument(spec, { fixtures: [fixture!], icons: true }));
  return page.evaluate(
    async ({ markup, properties, named, enters }) => {
      const holder = document.body.firstElementChild as HTMLElement;
      holder.insertAdjacentHTML('beforeend', markup);
      const stage = holder.lastElementChild as HTMLElement;
      const within = (root: ParentNode, out: Element[] = []) => {
        for (const el of root.querySelectorAll('*')) {
          out.push(el);
          if (el.shadowRoot) within(el.shadowRoot, out);
        }
        return out;
      };
      const path = (el: Element) => `${(el.getRootNode() as ShadowRoot).host?.localName ?? ''}>${el.localName}${typeof el.className === 'string' && el.className ? `.${el.className.replace(/\s+/g, '.')}` : ''}`;
      /** The transitions running in the stage, through its shadow roots (a document's list leaves those out in Firefox). */
      const moving = () => {
        const roots: (Document | ShadowRoot)[] = [document, ...within(stage).flatMap((el) => (el.shadowRoot ? [el.shadowRoot] : []))];
        const seen = new Set<string>();
        for (const root of roots) {
          for (const animation of root.getAnimations()) {
            if (!(animation instanceof CSSTransition)) continue;
            const target = (animation.effect as KeyframeEffect | null)?.target;
            if (enters.includes(animation.transitionProperty)) continue;
            if (target && within(stage).includes(target)) seen.add(`${path(target)} ${animation.transitionProperty}`);
          }
        }
        return [...seen].sort();
      };
      const drawn = () => within(stage).map((el) => {
        const style = getComputedStyle(el);
        return [path(el), ...properties.map((property) => style.getPropertyValue(property))];
      });
      const hosts = within(stage).filter((el) => el.localName.startsWith('tanrei-')) as (Element & { updateComplete?: Promise<unknown> })[];
      await Promise.all(hosts.map((host) => host.updateComplete));
      const atUpdate = moving();
      // The first frame as it is painted: after its layout, and after the observers of sizes the elements made before
      // this one have written what they measure (a joined button's outer radius, a glyph's mark).
      await new Promise<void>((resolve) => {
        const laidOut = new ResizeObserver(() => {
          laidOut.disconnect();
          resolve();
        });
        laidOut.observe(stage);
      });
      const atFrame = moving();
      const first = drawn();
      await new Promise((resolve) => setTimeout(resolve, 700));
      const last = drawn();
      const differs: string[] = [];
      first.forEach((row, index) => {
        const then = last[index];
        if (!then || then[0] !== row[0]) return differs.push(`${row[0]} is not what stands there at rest`);
        row.forEach((value, at) => {
          if (at && value !== then[at]) differs.push(`${row[0]} ${properties[at - 1]}: ${value} → ${then[at]}`);
        });
      });
      return { atUpdate, atFrame, differs, named: within(stage).filter((el) => el.getAttribute(named[0]) === named[1]).length, elements: first.length };
    },
    { markup, properties: PROPERTIES.filter((property) => !subject.enters?.includes(property)), named: subject.named, enters: subject.enters ?? [] },
  );
}

test.describe('the first frame', () => {
  for (const subject of SUBJECTS) {
    test(`${subject.id}: a ${subject.spec} that appears is in the form its system chose (${subject.named.join(' ')}) from its first frame, and nothing moves into it`, async ({ page }, info) => {
      const seen = await appear(page, subject);
      expect(seen.elements).toBeGreaterThan(0);
      if (info.project.name === 'firefox-no-style-queries') expect(seen.named, `elements named ${subject.named.join('=')}`).toBeGreaterThan(0);
      expect({ atUpdate: seen.atUpdate, atFrame: seen.atFrame, differs: seen.differs }).toEqual({ atUpdate: [], atFrame: [], differs: [] });
    });
  }
});
