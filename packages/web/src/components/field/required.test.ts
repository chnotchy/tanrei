// `required` and `optional`, the two booleans of the Field, the Field group and every component built from one (FLD-4,
// FLD-32, FGR-4, FGR-26): `required` alone says the form asks for an answer, `optional` alone draws the optional tag,
// and with both the element is required, `optional` is ignored and a debug build says so once. The old name,
// `requirement`, is no attribute any more: written on an element it changes nothing. The look is held by the DOM —
// the same tree of elements and attributes through every shadow root, but for the two names themselves and the ids
// that tie parts together — the same validity, and in Chromium the same accessibility tree. No picture is compared.
import { type Page, expect, test } from '@playwright/test';
import { axTree } from '../../../test/ax-tree.js';
import { type Fixture, loadSpec, mountFixtures } from '../../../test/harness.js';

type Props = Fixture['props'];
const WORDS = { requiredText: 'Required', optionalText: 'Optional' };

/** The components built from a Field or a Field group, each with props that draw it whole, and the items it holds. */
const FRAMED: { name: string; props: Props; items?: Fixture['items'] }[] = [
  { name: 'field', props: { label: 'Volume', ...WORDS }, items: [{ kind: 'slider', props: { value: 40 } }] },
  { name: 'field-group', props: { label: 'Notify me by', ...WORDS }, items: [{ kind: 'checkbox', props: { label: 'Email' } }, { kind: 'checkbox', props: { label: 'Text' } }] },
  { name: 'field-group', props: { label: 'Delivery', kind: 'radio-group', ...WORDS }, items: [{ kind: 'radio-button', props: { label: 'Standard', value: 'standard' } }, { kind: 'radio-button', props: { label: 'Express', value: 'express' } }] },
  { name: 'text-field', props: { label: 'Email', ...WORDS } },
  { name: 'number-field', props: { label: 'Seats', ...WORDS } },
  { name: 'select-field', props: { label: 'Country', ...WORDS }, items: [{ kind: 'option', props: { value: 'jp', label: 'Japan' } }] },
  { name: 'combobox-field', props: { label: 'City', ...WORDS }, items: [{ kind: 'option', props: { value: 'kyoto', label: 'Kyoto' } }] },
  { name: 'color-field', props: { label: 'Accent', ...WORDS } },
  { name: 'slider-field', props: { label: 'Volume', value: 40, ...WORDS } },
  { name: 'one-time-code-field', props: { label: 'Code', ...WORDS } },
  { name: 'chip-field', props: { label: 'Recipients', ...WORDS } },
  { name: 'checkbox-group', props: { label: 'Notify me by', ...WORDS }, items: [{ kind: 'checkbox', props: { label: 'Email', value: 'email' } }] },
  { name: 'radio-group', props: { label: 'Delivery', ...WORDS }, items: [{ kind: 'radio-button', props: { label: 'Standard', value: 'standard' } }] },
];

/**
 * Runs in the page: the stage's tree, through every shadow root — each element with its attributes, the two names of
 * the requirement left out, and the ids that tie parts together written as whether they are there — and the validity
 * of each element that has one.
 */
function described(id: string): string[] {
  const lines: string[] = [];
  const SKIPPED = new Set(['required', 'optional', 'requirement', 'data-fixture', 'style']);
  const TIES = new Set(['id', 'for', 'aria-describedby', 'aria-labelledby', 'aria-controls', 'aria-activedescendant', 'aria-owns', 'list', 'popovertarget', 'anchor', 'name']);
  const walk = (root: Element | ShadowRoot, depth: number) => {
    for (const el of root.children) {
      const attributes = [...el.attributes]
        .filter((a) => !SKIPPED.has(a.name))
        .map((a) => (TIES.has(a.name) ? `${a.name}` : `${a.name}=${a.value}`))
        .sort()
        .join(' ');
      const validity = (el as Element & { validity?: ValidityState }).validity;
      lines.push(`${'  '.repeat(depth)}<${el.localName}${attributes ? ` ${attributes}` : ''}>${validity ? ` valueMissing=${validity.valueMissing} valid=${validity.valid}` : ''}`);
      if (el.shadowRoot) walk(el.shadowRoot, depth + 1);
      walk(el, depth + 1);
    }
  };
  walk(document.querySelector(`[data-fixture="${id}"]`)!, 0);
  return lines;
}

async function settle(page: Page) {
  // Every element of the page has rendered and given its parts what they take (a frame's channel answers in an update).
  for (let round = 0; round < 3; round++) {
    await page.evaluate(async () => {
      const all: Element[] = [];
      const collect = (root: Document | ShadowRoot) => {
        for (const el of root.querySelectorAll('*')) {
          all.push(el);
          if (el.shadowRoot) collect(el.shadowRoot);
        }
      };
      collect(document);
      await Promise.all(all.map((el) => (el as Element & { updateComplete?: Promise<unknown> }).updateComplete));
      await new Promise(requestAnimationFrame);
    });
  }
}

const tag = (name: string) => `tanrei-${name}`;
const IDS = ['none', 'required', 'optional', 'both'];

for (const { name, props, items } of FRAMED) {
  const label = `${name}${props.kind ? ` (${props.kind})` : ''}`;
  test(`${label}: required and optional are two booleans — with both, it is required, optional is ignored and reported once — and requirement is no attribute (FLD-4, FLD-32, FGR-4, FGR-26)`, async ({ page, browserName }) => {
    const warnings: string[] = [];
    page.on('console', (message) => message.type() === 'warning' && warnings.push(message.text()));
    const spec = loadSpec(name);
    const stage = (id: string, extra: Props): Fixture => ({ id, props: { ...props, ...extra }, ...(items ? { items } : {}) });
    await mountFixtures(page, spec, { icons: true, fixtures: [stage('none', {}), stage('required', { required: true }), stage('optional', { optional: true }), stage('both', { required: true, optional: true })] });
    await settle(page);
    const read = () => page.evaluate(([f, ids]) => Object.fromEntries(ids.map((id) => [id, (new Function(`return (${f})`)() as (id: string) => string[])(id)])), [described.toString(), IDS] as const);
    const by = await read();
    // Each draws and exposes something of its own, and both together are required alone.
    expect(by.required).not.toEqual(by.none);
    expect(by.optional).not.toEqual(by.none);
    expect(by.optional).not.toEqual(by.required);
    expect(by.both).toEqual(by.required);
    expect(warnings.filter((line) => line.includes('required and optional are both true'))).toHaveLength(1);
    // The element's own properties read what it was given.
    const host = (id: string) => page.locator(`[data-fixture="${id}"] > ${tag(name)}, [data-fixture="${id}"] ${tag(name)}`).first();
    expect(await host('both').evaluate((el) => [(el as HTMLElement & { required: boolean }).required, (el as HTMLElement & { optional: boolean }).optional])).toEqual([true, true]);
    // The old name is no attribute: written on an element, it asks nothing.
    await host('none').evaluate(async (el) => {
      el.setAttribute('requirement', 'required');
      await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    });
    await settle(page);
    expect((await read()).none).toEqual(by.none);
    if (browserName === 'chromium') expect(await axTree(page, '[data-fixture="both"]')).toEqual(await axTree(page, '[data-fixture="required"]'));
  });
}
