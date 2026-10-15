// A page's reset leaves a component's spacing as it is. A page's own rules beat the rules a shadow root gives the
// elements it slots (`::slotted()`), whatever their cascade layer, so a reset such as `* { margin: 0; padding: 0 }`
// (a documentation site's, Tailwind's preflight) takes away any margin or padding a component puts on the product's
// elements. The spacing between slotted elements is the parent's: its gap, its grid tracks, spacers of its own.
//
// Every fixture of each component that lays out the product's elements close together is measured — each element of
// the product's and each part of the component, from the component's own box — and then measured again under the
// reset: everything stands where it stood. (The navigation drawer's main action, placed by the drawer's own box, is
// measured in both forms by its own test, NVD-39.)
import { expect, test } from '@playwright/test';
import { type Fixture, type FixtureItem, loadSpec, mountFixtures } from '../test/harness.js';

const RESET = '* { margin: 0; padding: 0 }';

const tool = (content: string, props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'action', props: { label: content, ...props }, content });
const toolbar = loadSpec('toolbar');
const avatar = loadSpec('avatar');
const search = loadSpec('search');

/** The fixtures of each subject: the spec's own, and rows whose neighbours differ in length (TBR-16, SRC-34). */
const SUBJECTS: { spec: ReturnType<typeof loadSpec>; fixtures: Fixture[] }[] = [
  {
    // AVT-16, AVT-17: the members' and the overflow box's overlap.
    spec: avatar,
    fixtures: avatar.fixtures.filter((f) => f.id.startsWith('group')),
  },
  {
    // TBR-2: the docked spread and its one centred item; TBR-16: the floating space between items, along a row and a
    // column, between items of different lengths, right to left.
    spec: toolbar,
    fixtures: [
      ...toolbar.fixtures,
      {
        id: 'floating-mixed',
        props: { label: 'Mixed', variant: 'floating' },
        items: [tool('format_bold', { icon: 'format_bold', size: 'small' }), tool('Reply'), tool('format_italic', { icon: 'format_italic', size: 'large' }), tool('format_underlined', { icon: 'format_underlined' })],
      },
      { id: 'floating-rtl', direction: 'rtl', props: { label: 'Mixed', variant: 'floating' }, items: [tool('Reply'), tool('format_bold', { icon: 'format_bold', size: 'small' }), tool('format_italic', { icon: 'format_italic' })] },
      { id: 'floating-one', props: { label: 'One', variant: 'floating' }, items: [tool('Reply')] },
      { id: 'vertical-mixed', props: { label: 'Mixed', variant: 'floating', orientation: 'vertical' }, items: [tool('format_bold', { icon: 'format_bold', size: 'small' }), tool('format_italic', { icon: 'format_italic' }), tool('format_underlined', { icon: 'format_underlined', size: 'large' })] },
    ],
  },
  {
    // SRC-34: the clear button and the trailing slot's buttons.
    spec: search,
    fixtures: search.fixtures.filter((f) => ['bar-slots', 'bar-value-slots'].includes(f.id)),
  },
];

/** Runs in the page: every element of the product's in each fixture's component and every part of the component, from the component's box. */
function geometry(tag: string) {
  const round = (v: number) => Math.round(v * 100) / 100;
  return Object.fromEntries(
    [...document.querySelectorAll<HTMLElement>('[data-fixture]')].map((stage) => {
      const host = stage.querySelector(tag)!;
      const origin = host.getBoundingClientRect();
      const box = (el: Element) => {
        const r = el.getBoundingClientRect();
        return [round(r.left - origin.left), round(r.top - origin.top), round(r.width), round(r.height)];
      };
      const parts = [...(host.shadowRoot?.querySelectorAll('[part], [class]') ?? [])].filter((el) => !el.closest('style'));
      return [
        stage.dataset.fixture!,
        {
          host: [round(origin.width), round(origin.height)],
          product: [...host.querySelectorAll('*')].map((el) => `${el.localName} ${box(el).join(' ')}`),
          parts: parts.map((el) => `${el.getAttribute('part') ?? el.getAttribute('class')} ${box(el).join(' ')}`),
        },
      ];
    }),
  );
}

/** Two frames and the observers' passes in between: what a component measures has been written and laid out. */
const settled = (page: import('@playwright/test').Page) => page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))));

test.describe('under a page’s reset', () => {
  for (const { spec, fixtures } of SUBJECTS) {
    test(`${spec.name}: under * { margin: 0; padding: 0 } every element of the product’s and every part stands where it stood (${fixtures.map((f) => f.id).join(', ')})`, async ({ page }) => {
      const tag = spec.platforms.web.name;
      await mountFixtures(page, spec, { fixtures, icons: true });
      await settled(page);
      const before = await page.evaluate(geometry, tag);
      expect(Object.keys(before).sort()).toEqual(fixtures.map((f) => f.id).sort());
      await page.addStyleTag({ content: RESET });
      await settled(page);
      const after = await page.evaluate(geometry, tag);
      for (const f of fixtures) expect(after[f.id], f.id).toEqual(before[f.id]);
    });
  }

  test('TBR-16: a floating toolbar’s items carry no margin of the toolbar’s and nothing written on them: the container spaces them', async ({ page }) => {
    await mountFixtures(page, toolbar, { fixtures: toolbar.fixtures.filter((f) => f.id.startsWith('floating')), icons: true });
    await settled(page);
    const margins = await page.evaluate(() => [...document.querySelectorAll('tanrei-toolbar > *')].map((el) => [getComputedStyle(el).marginInlineStart, getComputedStyle(el).marginBlockStart, (el as HTMLElement).style.cssText]));
    for (const [inline, block, style] of margins) expect([inline, block, style]).toEqual(['0px', '0px', expect.not.stringContaining('margin')]);
  });
});
