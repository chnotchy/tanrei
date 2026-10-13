// What a page meets when a component is written open in its markup: the reader is shown the top of the page, and focus
// is where the page left it. Focus moves in answer to a person's act (POP-19: «a popover mounted with open
// true SHALL NOT move focus»; SSH-3 and BSH-3 for a standard sheet), so a surface that is drawn in place — the `inline`
// attribute, a standard sheet or drawer, a snackbar, a callout, a tooltip — takes none when the page is read, and the
// browser has nothing to scroll into view. A modal surface written open is the one exception the specs make (SSH-3,
// BSH-3: it makes everything behind it unfocusable, so focus must be somewhere it can reach): it takes focus, and being
// in the top layer it still moves nothing.
//
// Each subject is a spec's fixtures that start open, mounted below a lead taller than the window: a surface that took
// focus at load would scroll the page down to it.
import { type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures } from '../test/harness.js';

/** The page's own content above the fixtures: taller than any window a test runs in. */
const LEAD = '<p style="block-size: 4000px; margin: 0">A page</p>';

type Pick = (fixture: Fixture) => boolean;
type Change = (fixture: Fixture) => Fixture;
const withProps =
  (props: Fixture['props']): Change =>
  (fixture) => ({ ...fixture, props: { ...fixture.props, ...props } });
const opened: Pick = (fixture) => fixture.props.open === true;

interface Subject {
  spec: string;
  /** What is mounted, in the title. */
  form: string;
  pick: Pick;
  change?: Change;
}

/**
 * Drawn where the page wrote it, and no overlay: nothing takes focus. The pickers' and the search's modal forms are
 * here as their fixtures and the docs draw them — `inline`, a `<dialog>` that is open and not modal.
 */
const IN_PLACE: Subject[] = [
  { spec: 'date-time-picker', form: 'a modal picker drawn in place', pick: (f) => opened(f) && f.props.presentation !== 'docked', change: withProps({ inline: true }) },
  { spec: 'date-time-picker', form: 'a docked picker drawn in place', pick: (f) => f.props.presentation === 'docked' },
  { spec: 'search', form: 'an expanded view drawn in place (docked, full-screen and dialog)', pick: (f) => f.props.expanded === true },
  { spec: 'popover', form: 'a popover drawn in place', pick: opened },
  { spec: 'menu', form: 'a menu drawn in place', pick: opened },
  { spec: 'fab-menu', form: 'a FAB menu drawn in place', pick: opened },
  { spec: 'select', form: 'a list drawn in place', pick: opened },
  { spec: 'combobox', form: 'a list drawn in place', pick: opened },
  { spec: 'side-sheet', form: 'a standard sheet', pick: (f) => opened(f) && f.props.variant !== 'modal' },
  { spec: 'bottom-sheet', form: 'a standard sheet', pick: (f) => opened(f) && f.props.variant === 'standard' },
  { spec: 'navigation-drawer', form: 'a standard drawer', pick: (f) => opened(f) && f.props.variant !== 'modal' },
  { spec: 'tooltip', form: 'a tooltip', pick: opened },
  { spec: 'snackbar', form: 'a snackbar', pick: () => true },
  { spec: 'callout', form: 'a live callout', pick: (f) => f.props.live === true },
];

/**
 * Overlays in the top layer that are not modal, written open: the popover's rule (POP-19) is the one the specs state,
 * and the select, the combobox and the search's docked view keep focus on their field by their own (SEL-26, CMB-24,
 * SRC-8).
 */
const OVERLAYS: Subject[] = [
  { spec: 'popover', form: 'a popover', pick: opened, change: (f) => withProps({ anchor: `anchor-${f.id}` })(f) },
  { spec: 'select', form: 'a list', pick: opened, change: withProps({ inline: false }) },
  { spec: 'combobox', form: 'a list', pick: opened, change: withProps({ inline: false }) },
  { spec: 'search', form: 'a docked view', pick: (f) => f.props.expanded === true && !f.props.presentation, change: withProps({ inline: false }) },
];

/**
 * Overlays that are not modal and move focus in when they open (MNU-1, FBM's items, DTM-3 for a docked picker), written
 * open. Their specs speak of «when open becomes true» and say nothing of a surface the page was written with; each
 * takes focus at load as if a person had opened it, and whether it should is not decided. What is asked here is only what no reading of those sentences allows: that the page is moved.
 */
const UNDECIDED: Subject[] = [
  { spec: 'menu', form: 'a menu', pick: opened, change: (f) => withProps({ anchor: `anchor-${f.id}` })(f) },
  { spec: 'fab-menu', form: 'a FAB menu', pick: opened, change: withProps({ inline: false }) },
  { spec: 'date-time-picker', form: 'a docked picker', pick: (f) => f.props.presentation === 'docked', change: (f) => withProps({ inline: false, anchor: `anchor-${f.id}` })(f) },
];

/** Modal, written open: focus moves in as if it had just opened (MDL-3, SSH-3, BSH-3), one to a page. */
const MODAL: Subject[] = [
  { spec: 'modal-layer', form: 'a modal layer', pick: opened },
  { spec: 'dialog', form: 'a dialog', pick: opened },
  { spec: 'side-sheet', form: 'a modal sheet', pick: (f) => opened(f) && f.props.variant === 'modal' },
  { spec: 'bottom-sheet', form: 'a modal sheet', pick: (f) => opened(f) && f.props.variant !== 'standard' },
  { spec: 'navigation-drawer', form: 'a modal drawer', pick: (f) => opened(f) && f.props.variant === 'modal' },
  { spec: 'date-time-picker', form: 'a modal picker', pick: (f) => opened(f) && f.props.presentation !== 'docked' },
  { spec: 'search', form: 'a full-screen view', pick: (f) => f.props.expanded === true && !!f.props.presentation, change: withProps({ inline: false }) },
  { spec: 'image-preview', form: 'an image preview', pick: opened },
];

/** Mounts the subject's fixtures below the lead and returns their ids. */
async function mount(page: Page, subject: Subject, first = false): Promise<string[]> {
  const spec = loadSpec(subject.spec);
  let fixtures = spec.fixtures.filter(subject.pick).map(subject.change ?? ((f) => f));
  if (first) fixtures = fixtures.slice(0, 1);
  expect(fixtures.length, `${subject.spec} has fixtures that start as ${subject.form}`).toBeGreaterThan(0);
  await mountFixtures(page, spec, { fixtures, lead: LEAD, icons: true });
  return fixtures.map((f) => f.id);
}

/**
 * The page at rest: every element of the spec's has updated, two frames have been drawn and the time a page takes to
 * settle has passed. Returns where the window is and what has focus (the fixture it is in, and its path through the
 * shadow roots).
 */
const rest = (page: Page, tag: string) =>
  page.evaluate(async (name) => {
    const hosts = [...document.querySelectorAll<HTMLElement & { updateComplete?: Promise<unknown> }>(name)];
    await Promise.all(hosts.map((host) => host.updateComplete));
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await new Promise((resolve) => setTimeout(resolve, 400));
    const path: string[] = [];
    for (let at: Element | null = document.activeElement; at; at = at.shadowRoot?.activeElement ?? null) path.push(at.localName);
    const stage = document.activeElement?.closest<HTMLElement>('[data-fixture]');
    return { scrollY: Math.round(window.scrollY), body: document.activeElement === document.body, focus: path.join(' > '), fixture: stage?.dataset.fixture ?? null, tall: document.documentElement.scrollHeight > window.innerHeight };
  }, tag);

test.describe('open at load', () => {
  for (const subject of IN_PLACE) {
    test(`${subject.spec}: ${subject.form} written open takes no focus and does not scroll the page`, async ({ page }) => {
      await mount(page, subject);
      const at = await rest(page, loadSpec(subject.spec).platforms.web.name);
      expect(at.tall).toBe(true);
      expect(at, `focus is on ${at.focus}, in the fixture ${at.fixture}`).toMatchObject({ body: true, scrollY: 0 });
    });
  }

  for (const subject of OVERLAYS) {
    test(`${subject.spec}: ${subject.form} written open in the top layer takes no focus and does not scroll the page`, async ({ page }) => {
      await mount(page, subject);
      const at = await rest(page, loadSpec(subject.spec).platforms.web.name);
      expect(at.tall).toBe(true);
      expect(at, `focus is on ${at.focus}, in the fixture ${at.fixture}`).toMatchObject({ body: true, scrollY: 0 });
    });
  }

  for (const subject of UNDECIDED) {
    test(`${subject.spec}: ${subject.form} written open in the top layer does not scroll the page`, async ({ page }) => {
      await mount(page, subject);
      const at = await rest(page, loadSpec(subject.spec).platforms.web.name);
      expect(at.tall).toBe(true);
      expect(at.scrollY, `focus is on ${at.focus || 'nothing'}, in the fixture ${at.fixture}`).toBe(0);
    });
  }

  for (const subject of MODAL) {
    test(`${subject.spec}: ${subject.form} written open takes focus, being modal, and does not scroll the page`, async ({ page }) => {
      const [id] = await mount(page, subject, true);
      const at = await rest(page, loadSpec(subject.spec).platforms.web.name);
      expect(at.tall).toBe(true);
      expect(at, `focus is on ${at.focus}`).toMatchObject({ body: false, fixture: id, scrollY: 0 });
    });
  }
});
