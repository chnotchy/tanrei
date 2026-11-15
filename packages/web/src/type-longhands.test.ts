// A type role's longhand token, overridden on one instance or on a section of the page, changes that property of the
// component's text and nothing else (src/styles/type.ts).
//
// The tokens are declared on the root, and a custom property's var() is resolved where it is declared: the composite
// `<role>-font` is the root's, whatever an element sets below it. A component that set its text with
// `font: var(<role>-font)` therefore ignored a product's `<role>-font-size` on one button. Every component reads the
// longhands where it draws its text instead. Here, for a component of each way of reading them — a size member held
// in private properties (Button, Chip, Text input), a token read directly (Tabs, Menu, Tooltip, Snackbar), a primitive
// given the component's prefix (Checkbox, through the selection primitive), a density member a drawer hands its cells
// (Navigation drawer) and a light-DOM stylesheet (Accordion) — each longhand is overridden on the element and then on
// its fixture's stage, and the text is read before and after.
import { type Page, expect, test } from '@playwright/test';
import { loadSpec, mountFixtures } from '../test/harness.js';

interface Case {
  /** The spec, and the fixture whose element is overridden. */
  name: string;
  fixture: string;
  /** The role's token, without the longhand: `<base>-font-size` is overridden. */
  base: string;
  /** The element that draws the text, inside the component (a selector that pierces its shadow roots). */
  text: string;
}

const CASES: readonly Case[] = [
  { name: 'button', fixture: 'filled-medium', base: '--tanrei-comp-button-label-typescale-medium', text: '[part="container"]' },
  { name: 'chip', fixture: 'action-outlined', base: '--tanrei-comp-chip-label-typescale-medium', text: '[part="label"]' },
  { name: 'text-input', fixture: 'outlined-filled', base: '--tanrei-comp-input-box-input-typescale-medium', text: '[part="input"]' },
  { name: 'tabs', fixture: 'primary', base: '--tanrei-comp-tabs-label-typescale', text: '[part="label"]' },
  { name: 'menu', fixture: 'actions', base: '--tanrei-comp-menu-label-typescale', text: '[part="label"]' },
  { name: 'tooltip', fixture: 'plain', base: '--tanrei-comp-tooltip-plain-supporting-text-typescale', text: '[part="supporting-text"]' },
  { name: 'snackbar', fixture: 'message', base: '--tanrei-comp-snackbar-supporting-text-typescale', text: '[part="supporting-text"]' },
  { name: 'checkbox', fixture: 'unselected', base: '--tanrei-comp-checkbox-label-typescale', text: '[part="label"]' },
  { name: 'navigation-drawer', fixture: 'standard', base: '--tanrei-comp-navigation-drawer-item-label-typescale-regular', text: '[part="label"]' },
  { name: 'accordion', fixture: 'plain', base: '--tanrei-comp-accordion-label-typescale-medium', text: 'summary' },
];

/** What a role sets on the text, as computed: the four the `font` shorthand composes and the letter spacing. */
interface Text {
  family: string;
  size: number;
  weight: string;
  line: number;
  tracking: number;
}

/** The value each longhand is overridden to, and what the text then has. */
const LONGHANDS = {
  'font-family': { value: 'serif', expect: (t: Text) => expect(t.family).toBe('serif') },
  'font-size': { value: '41px', expect: (t: Text) => expect(t.size).toBe(41) },
  'font-weight': { value: '777', expect: (t: Text) => expect(t.weight).toBe('777') },
  'line-height': { value: '2.5', expect: (t: Text) => expect(t.line / t.size).toBeCloseTo(2.5, 2) },
  'letter-spacing': { value: '0.25em', expect: (t: Text) => expect(t.tracking / t.size).toBeCloseTo(0.25, 2) },
} as const;
type Longhand = keyof typeof LONGHANDS;

/**
 * Sets `name: value` on the fixture's element (or on its stage, a section of the page around it), reads the text's
 * computed style, and takes the override off again.
 */
async function textWith(page: Page, { fixture, name, text }: Case, on: 'element' | 'stage', override: [string, string] | null): Promise<Text> {
  return page.evaluate(
    ([id, tag, selector, where, set]) => {
      const stage = document.querySelector(`[data-fixture="${id}"]`) as HTMLElement;
      const host = stage.querySelector(tag) as HTMLElement;
      const target = where === 'stage' ? stage : host;
      /** The first element matching `selector` in the host's light tree or any shadow root inside it. */
      const find = (root: ParentNode): Element | null => {
        const here = root.querySelector(selector);
        if (here) return here;
        for (const el of root.querySelectorAll('*')) {
          const inner = el.shadowRoot && find(el.shadowRoot);
          if (inner) return inner;
        }
        return null;
      };
      const el = (host.shadowRoot && find(host.shadowRoot)) || find(host);
      if (!el) throw new Error(`no ${selector} in ${tag}`);
      if (set) target.style.setProperty(set[0], set[1]);
      const s = getComputedStyle(el);
      const px = (v: string) => Number.parseFloat(v) || 0;
      const read = { family: s.fontFamily, size: px(s.fontSize), weight: s.fontWeight, line: px(s.lineHeight), tracking: px(s.letterSpacing) };
      if (set) target.style.removeProperty(set[0]);
      return read;
    },
    [fixture, `tanrei-${name}`, text, on, override] as const,
  );
}

for (const c of CASES) {
  test(`${c.name}: each longhand of its text role, overridden on the element or on a section around it, changes that property of its text and nothing else`, async ({ page }) => {
    // Reduced motion: a weight that changes with the state (a selected tab's) is drawn at once, not through a transition.
    await mountFixtures(page, loadSpec(c.name), { reducedMotion: true });
    for (const on of ['element', 'stage'] as const) {
      const rest = await textWith(page, c, on, null);
      for (const [longhand, { value, expect: changed }] of Object.entries(LONGHANDS) as [Longhand, (typeof LONGHANDS)[Longhand]][]) {
        const now = await textWith(page, c, on, [`${c.base}-${longhand}`, value]);
        const where = `${c.base}-${longhand}: ${value} on the ${on}`;
        await test.step(where, () => {
          changed(now);
          // Nothing else moves: the size alone also scales the line height and the tracking, which are its ratios.
          if (longhand !== 'font-family') expect(now.family, where).toBe(rest.family);
          if (longhand !== 'font-weight') expect(now.weight, where).toBe(rest.weight);
          if (longhand !== 'font-size') expect(now.size, where).toBe(rest.size);
          if (longhand !== 'line-height') expect(now.line / now.size, where).toBeCloseTo(rest.line / rest.size, 2);
          if (longhand !== 'letter-spacing') expect(now.tracking / now.size, where).toBeCloseTo(rest.tracking / rest.size, 2);
        });
      }
      // Taken off, the text is as it was.
      expect(await textWith(page, c, on, null)).toEqual(rest);
    }
  });
}
