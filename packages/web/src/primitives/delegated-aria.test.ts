// ARIA a product sets on the host of a component whose role is carried by an element inside it is exposed on that
// element (src/primitives/delegated-aria.ts; each spec's accessibility notes, "WHEN the product sets an ARIA state or
// relationship on the host"): states as attributes, id references by ARIA element reflection, and — where an engine
// has no reflection — the text of what they name. What the component owns stays its own, and the host is left with no
// name, description or state of its own for them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { axTree } from '../../test/ax-tree.js';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file: string) => fs.readFileSync(path.join(web, file), 'utf8');

interface Subject {
  /** The control with `id="subject"`; `rest` is where the product's ARIA goes. */
  markup: (rest: string) => string;
  /** From the host down, one selector per shadow root: the element that carries the role. */
  path: string[];
  /** What the component owns: never taken from the host. */
  owns: string[];
  /** A name it gives itself that is its whole name, over the product's aria-labelledby (a Button's label, BTN-16). */
  ownName?: string;
}

const SUBJECTS: Record<string, Subject> = {
  button: { markup: (rest) => `<tanrei-button id="subject" ${rest}>Send</tanrei-button>`, path: ['button'], owns: ['aria-pressed', 'aria-disabled'] },
  'button-with-menu': {
    markup: (rest) => `<tanrei-button-with-menu id="subject" ${rest} label="Save" menu-label="More"><tanrei-menu-item label="One"></tanrei-menu-item></tanrei-button-with-menu>`,
    path: ['button.leading'],
    owns: ['aria-haspopup', 'aria-expanded', 'aria-controls', 'aria-disabled'],
  },
  'main-action-button': { markup: (rest) => `<tanrei-main-action-button id="subject" ${rest} label="New"><span slot="icon">add</span></tanrei-main-action-button>`, path: ['button'], owns: ['aria-disabled'] },
  'copy-button': { markup: (rest) => `<tanrei-copy-button id="subject" ${rest} value="a" label="Copy" copied-label="Copied"></tanrei-copy-button>`, path: ['tanrei-button', 'button'], owns: ['aria-pressed', 'aria-disabled'], ownName: 'Copy' },
  chip: { markup: (rest) => `<tanrei-chip id="subject" ${rest} label="Chip"></tanrei-chip>`, path: ['.container'], owns: ['aria-pressed', 'aria-disabled'] },
  card: { markup: (rest) => `<tanrei-card id="subject" ${rest} interactive label="Card">Card</tanrei-card>`, path: ['.container'], owns: ['aria-disabled'] },
  checkbox: { markup: (rest) => `<tanrei-checkbox id="subject" ${rest} label="Checkbox"></tanrei-checkbox>`, path: ['input'], owns: ['aria-checked', 'aria-pressed', 'aria-disabled'] },
  switch: { markup: (rest) => `<tanrei-switch id="subject" ${rest} label="Switch"></tanrei-switch>`, path: ['input'], owns: ['aria-checked', 'aria-pressed', 'aria-disabled'] },
  'radio-button': { markup: (rest) => `<tanrei-radio-button id="subject" ${rest} label="Radio" value="a"></tanrei-radio-button>`, path: ['input'], owns: ['aria-checked', 'aria-pressed', 'aria-disabled'] },
  slider: { markup: (rest) => `<tanrei-slider id="subject" ${rest} label="Slider" value="40"></tanrei-slider>`, path: ['[role="slider"]'], owns: ['aria-disabled'] },
  'text-input': { markup: (rest) => `<tanrei-text-input id="subject" ${rest} label="Text"></tanrei-text-input>`, path: ['input'], owns: ['aria-disabled'] },
  select: {
    markup: (rest) => `<tanrei-select id="subject" ${rest} label="Select"><tanrei-option value="a">Alpha</tanrei-option></tanrei-select>`,
    path: ['[role="combobox"]'],
    owns: ['aria-haspopup', 'aria-expanded', 'aria-controls', 'aria-disabled'],
  },
  combobox: {
    markup: (rest) => `<tanrei-combobox id="subject" ${rest} label="Combobox"><tanrei-option value="a">Alpha</tanrei-option></tanrei-combobox>`,
    path: ['input'],
    owns: ['aria-haspopup', 'aria-expanded', 'aria-controls', 'aria-disabled'],
  },
  search: { markup: (rest) => `<tanrei-search id="subject" ${rest} label="Search"></tanrei-search>`, path: ['input'], owns: ['aria-haspopup', 'aria-expanded', 'aria-controls', 'aria-keyshortcuts', 'aria-disabled'] },
  'number-input': { markup: (rest) => `<tanrei-number-input id="subject" ${rest} label="Number" increment-label="More" decrement-label="Less"></tanrei-number-input>`, path: ['input'], owns: ['aria-disabled'] },
  'color-input': { markup: (rest) => `<tanrei-color-input id="subject" ${rest} label="Color" value="#0f766e"></tanrei-color-input>`, path: ['input'], owns: ['aria-disabled'] },
};

/** The states the tests set on a host: each one the component does not own. */
const STATES: Record<string, string> = { 'aria-expanded': 'false', 'aria-haspopup': 'dialog', 'aria-current': 'page', 'aria-keyshortcuts': 'Alt+K', 'aria-invalid': 'true' };

const document_ = (body: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><style>${read('dist/tokens.css')}</style></head>
<body><p id="described">Described text</p><p id="other">Other text</p><p id="named">Named text</p><div id="controlled">Controlled</div>
<div id="stage">${body}</div><script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`;

/** A page that is loaded with the control in it, so that its attributes are there before it is defined. */
async function load(page: Page, tag: string, body: string, { withoutReflection = false } = {}) {
  if (withoutReflection) {
    // An engine without ARIA element reflection (before Chrome 135, Firefox 136, Safari 16.4).
    await page.addInitScript(() => {
      for (const name of ['ariaLabelledByElements', 'ariaDescribedByElements', 'ariaControlsElements', 'ariaDetailsElements', 'ariaErrorMessageElements']) delete (Element.prototype as unknown as Record<string, unknown>)[name];
    });
  }
  await page.route('http://delegated-aria.test/**', (route) => route.fulfill({ contentType: 'text/html', body: document_(body) }));
  await page.goto(`http://delegated-aria.test/${tag}`);
  await page.waitForFunction((t) => !!customElements.get(t), tag);
  await settle(page);
}

/** Every element updated, and the microtask in which a reference is drawn run, twice over. */
const settle = (page: Page) =>
  page.evaluate(async () => {
    type Updating = HTMLElement & { updateComplete?: Promise<unknown> };
    const all = (root: Document | ShadowRoot): Updating[] => [...root.querySelectorAll<Updating>('*')].flatMap((element) => [element, ...(element.shadowRoot ? all(element.shadowRoot) : [])]);
    for (let pass = 0; pass < 2; pass++) {
      for (const element of all(document)) await element.updateComplete;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
  });

/** What the element that carries the role says, and what is left on the host itself. */
function read_(page: Page, path: string[], names: string[]) {
  return page.evaluate(
    ({ path, names }) => {
      const host = document.querySelector<HTMLElement>('#subject')!;
      let at: Element = host;
      for (const selector of path) at = at.shadowRoot!.querySelector(selector)!;
      const inner = at as Element & Record<string, unknown>;
      const ids = (property: string) => ((inner[property] as Element[] | null | undefined) ?? []).map((element) => element.id || element.textContent);
      return {
        inner: Object.fromEntries(names.map((name) => [name, inner.getAttribute(name)])),
        describedBy: ids('ariaDescribedByElements'),
        labelledBy: ids('ariaLabelledByElements'),
        controls: ids('ariaControlsElements'),
        // The host's own attributes, not what it answers for.
        onHost: names.filter((name) => Element.prototype.hasAttribute.call(host, name)),
        answers: Object.fromEntries(names.map((name) => [name, host.getAttribute(name)])),
      };
    },
    { path, names },
  );
}

for (const [name, subject] of Object.entries(SUBJECTS)) {
  const states = Object.fromEntries(Object.entries(STATES).filter(([state]) => !subject.owns.includes(state)));
  const written = Object.entries(states)
    .map(([state, value]) => `${state}="${value}"`)
    .join(' ');
  const names = [...new Set([...Object.keys(STATES), 'aria-describedby', 'aria-controls', ...subject.owns])];

  test(`${name}: ARIA states and relationships the product sets on the host are exposed on the element that carries the role, and taken off the host, which still answers for them`, async ({ page }) => {
    const owned = subject.owns.map((state) => `${state}="${state === 'aria-disabled' ? 'true' : 'mixed'}"`).join(' ');
    const relations = subject.owns.includes('aria-controls') ? 'aria-describedby="described"' : 'aria-describedby="described" aria-controls="controlled"';
    await load(page, `tanrei-${name}`, subject.markup(`${written} ${relations} ${owned}`));
    const before = await read_(page, subject.path, names);
    for (const [state, value] of Object.entries(states)) expect(before.inner[state], `${state} is the element's`).toBe(value);
    expect(before.describedBy, 'aria-describedby reaches the element by reflection').toEqual(['described']);
    if (!subject.owns.includes('aria-controls')) expect(before.controls, 'aria-controls reaches the element by reflection').toEqual(['controlled']);
    // What it owns is its own: the product's stays on the host and is not the element's.
    for (const state of subject.owns) expect(before.inner[state], `${state} is the component's own`).not.toBe(state === 'aria-disabled' ? 'true' : 'mixed');
    expect(before.onHost.sort(), 'the host keeps nothing but what the component owns').toEqual([...subject.owns].sort());
    expect(before.answers['aria-describedby'], 'the host still answers for what it was given').toBe('described');
    for (const [state, value] of Object.entries(states)) expect(before.answers[state]).toBe(value);

    // Changed, removed, and set by property after the element has drawn.
    await page.evaluate(() => {
      const host = document.querySelector<HTMLElement & { ariaDescribedByElements: Element[] | null; ariaCurrent: string | null }>('#subject')!;
      host.setAttribute('aria-keyshortcuts', 'Alt+J');
      host.removeAttribute('aria-invalid');
      host.ariaCurrent = null;
      host.ariaDescribedByElements = [document.querySelector('#other')!];
    });
    await settle(page);
    const after = await read_(page, subject.path, names);
    if ('aria-keyshortcuts' in states) expect(after.inner['aria-keyshortcuts'], 'a changed state follows').toBe('Alt+J');
    expect(after.inner['aria-invalid'], 'a removed state leaves the element').not.toBe('true');
    expect(after.inner['aria-current'], 'a state set to null by property leaves the element').toBeNull();
    expect(after.describedBy, 'elements given by property').toEqual(['other']);
    expect(after.answers['aria-invalid']).toBeNull();
    expect(after.onHost.sort()).toEqual([...subject.owns].sort());
  });

  test(`${name}: where the engine has no ARIA element reflection, the text of the elements named stands in for them`, async ({ page }) => {
    await load(page, `tanrei-${name}`, subject.markup('aria-describedby="described" aria-labelledby="named"'), { withoutReflection: true });
    const said = await read_(page, subject.path, ['aria-label', 'aria-description']);
    if (subject.ownName) expect(said.inner['aria-label'], 'its own label is its whole name').toBe(subject.ownName);
    else expect(said.inner['aria-label'], 'the label’s text is the name').toBe('Named text');
    expect(said.inner['aria-description'] ?? '', 'the description’s text is in the description').toContain('Described text');
    expect(said.onHost, 'and the host keeps neither').toEqual([]);
  });
}

test('the host of a control is no second node with the name, the description or the state the product gave it, and the element that carries the role has them (Chromium’s accessibility tree)', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'only Chromium gives a test its accessibility tree');
  await load(page, 'tanrei-button', SUBJECTS.button!.markup('aria-label="Send the report" aria-describedby="described" aria-invalid="true"'));
  const tree = await axTree(page, '#stage');
  expect(tree.filter((line) => line.includes('Send the report') || line.includes('Described text')).map((line) => line.trim()), tree.join('\n')).toEqual(['button "Send the report" (Described text) focusable=true invalid=true']);
});

test('a relationship of the component’s own and the product’s are one list: a combobox in a field is described by its supporting text and by what the product names', async ({ page }) => {
  await load(page, 'tanrei-combobox', '<tanrei-field label="Fruit" supporting-text="Pick one"><tanrei-combobox id="subject" aria-describedby="described"><tanrei-option value="a">Alpha</tanrei-option></tanrei-combobox></tanrei-field>');
  const said = await read_(page, ['input'], []);
  expect(said.describedBy).toEqual(['description', 'described']);
});
