// `required`, HTML's name for `requirement="required"`, on the Field, the Field group and every component built from
// one (FLD-32, FGR-26); and `requirement` on the controls that had only `required` — the embedded text input, the file
// picker and the file upload (ETI-29, FPK-32). Each is held to the name it stands beside: the element written with
// one draws and exposes what the same element written with the other does — the same tree of elements and attributes
// through every shadow root (but for the two names themselves and the ids that tie parts together), the same
// validity, and in Chromium the same accessibility tree. No picture is compared: the look is the DOM's.
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
  const SKIPPED = new Set(['required', 'requirement', 'data-fixture', 'style']);
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

for (const { name, props, items } of FRAMED) {
  const label = `${name}${props.kind ? ` (${props.kind})` : ''}`;
  test(`${label}: required draws and exposes what requirement required does, and wins over optional; false leaves requirement alone (FLD-32, FGR-26)`, async ({ page, browserName }) => {
    const spec = loadSpec(name);
    const stage = (id: string, extra: Props): Fixture => ({ id, props: { ...props, ...extra }, ...(items ? { items } : {}) });
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        stage('requirement', { requirement: 'required' }),
        stage('required', { required: true }),
        stage('over-optional', { required: true, requirement: 'optional' }),
        stage('optional', { requirement: 'optional' }),
        stage('false-optional', { required: false, requirement: 'optional' }),
      ],
    });
    await settle(page);
    const by = await page.evaluate((f) => Object.fromEntries(['requirement', 'required', 'over-optional', 'optional', 'false-optional'].map((id) => [id, (new Function(`return (${f})`)() as (id: string) => string[])(id)])), described.toString());
    expect(by.required).toEqual(by.requirement);
    expect(by['over-optional']).toEqual(by.requirement);
    expect(by['false-optional']).toEqual(by.optional);
    // The two are told apart at all: an optional one is drawn otherwise.
    expect(by.optional).not.toEqual(by.requirement);
    // The element's own property reads what it was given.
    expect(await page.locator(`[data-fixture="required"] > ${tag(name)}, [data-fixture="required"] ${tag(name)}`).first().evaluate((el) => (el as HTMLElement & { required: boolean }).required)).toBe(true);
    if (browserName === 'chromium') {
      expect(await axTree(page, '[data-fixture="required"]')).toEqual(await axTree(page, '[data-fixture="requirement"]'));
      expect(await axTree(page, '[data-fixture="over-optional"]')).toEqual(await axTree(page, '[data-fixture="requirement"]'));
    }
  });
}

/** The controls that had only `required`: `requirement="required"` is the same; optional and none change nothing. */
const CONTROLS: { name: string; props: Props; slots?: Fixture['slots'] }[] = [
  { name: 'embedded-text-input', props: { label: 'Message' } },
  { name: 'file-picker', props: { label: 'Attachment', constraintsText: 'Any file' }, slots: { trigger: 'Choose a file' } },
  { name: 'file-upload', props: { label: 'Attachments', constraintsText: 'Any file' }, slots: { trigger: 'Choose a file' } },
];
for (const { name, props, slots } of CONTROLS) {
  test(`${name}: requirement required is required true; optional and none change nothing, and an unknown value behaves as none and is reported (ETI-29, FPK-32)`, async ({ page, browserName }) => {
    const warnings: string[] = [];
    page.on('console', (message) => message.type() === 'warning' && warnings.push(message.text()));
    const spec = loadSpec(name);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        { id: 'required', props: { ...props, required: true }, ...(slots ? { slots } : {}) },
        { id: 'requirement', props: { ...props, requirement: 'required' }, ...(slots ? { slots } : {}) },
        { id: 'both', props: { ...props, required: true, requirement: 'optional' }, ...(slots ? { slots } : {}) },
        { id: 'none', props, ...(slots ? { slots } : {}) },
        { id: 'optional', props: { ...props, requirement: 'optional' }, ...(slots ? { slots } : {}) },
        { id: 'unknown', props: { ...props, requirement: 'mandatory' }, ...(slots ? { slots } : {}) },
      ],
    });
    await settle(page);
    const by = await page.evaluate((f) => Object.fromEntries(['required', 'requirement', 'both', 'none', 'optional', 'unknown'].map((id) => [id, (new Function(`return (${f})`)() as (id: string) => string[])(id)])), described.toString());
    expect(by.requirement).toEqual(by.required);
    expect(by.both).toEqual(by.required);
    expect(by.optional).toEqual(by.none);
    expect(by.unknown).toEqual(by.none);
    // Told apart at all, where the platform has a required state for the control: a button has none on the web, so
    // the file picker's required changes nothing it draws or exposes there (FPK-21: a Field says it in words).
    if (name !== 'file-picker') expect(by.none).not.toEqual(by.required);
    expect(warnings.filter((line) => line.includes('requirement "mandatory"'))).toHaveLength(1);
    if (browserName === 'chromium') expect(await axTree(page, '[data-fixture="requirement"]')).toEqual(await axTree(page, '[data-fixture="required"]'));
  });
}
