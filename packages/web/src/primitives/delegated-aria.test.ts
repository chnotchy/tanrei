// ARIA a product sets on the host of a component whose role is carried by an element inside it moves to data-aria-* on
// the host and is exposed on that element (src/primitives/delegated-aria.ts; each spec's accessibility notes, "WHEN the
// product sets an aria- attribute on the host"): states as attributes, id references by ARIA element reflection (and,
// where an engine has none, the text of what they name), the error message in the description while invalid. What the
// component owns moves too and is not exposed. The host carries no aria-* of the product's, and getAttribute('aria-X')
// on it is null: the value is data-aria-X.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
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
<p id="error">Error text</p><div id="stage">${body}</div><script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`;

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

/** What the element that carries the role says, and what the host carries. */
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
        errormessage: inner.getAttribute('aria-errormessage'),
        // What the host carries: no aria-* of the product's, and each one moved to data-aria-*.
        ariaOnHost: [...host.attributes].map((a) => a.name).filter((name) => name.startsWith('aria-')),
        data: Object.fromEntries([...host.attributes].filter((a) => a.name.startsWith('data-aria-')).map((a) => [a.name, a.value])),
        getAttribute: Object.fromEntries(names.map((name) => [name, host.getAttribute(name)])),
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

  test(`${name}: the product's aria-* on the host moves to data-aria-* and is exposed on the element that carries the role; what the component owns moves and is not exposed`, async ({ page }) => {
    const owned = subject.owns.map((state) => `${state}="${state === 'aria-disabled' ? 'true' : 'mixed'}"`).join(' ');
    const relations = subject.owns.includes('aria-controls') ? 'aria-describedby="described"' : 'aria-describedby="described" aria-controls="controlled"';
    await load(page, `tanrei-${name}`, subject.markup(`${written} ${relations} ${owned}`));
    const before = await read_(page, subject.path, names);
    for (const [state, value] of Object.entries(states)) expect(before.inner[state], `${state} is the element's`).toBe(value);
    expect(before.describedBy, 'aria-describedby reaches the element by reflection').toEqual(['described']);
    if (!subject.owns.includes('aria-controls')) expect(before.controls, 'aria-controls reaches the element by reflection').toEqual(['controlled']);
    for (const state of subject.owns) expect(before.inner[state], `${state} is the component's own`).not.toBe(state === 'aria-disabled' ? 'true' : 'mixed');
    expect(before.ariaOnHost, 'the host carries no aria-* of the product’s').toEqual([]);
    for (const [state, value] of Object.entries(states)) expect(before.data[`data-${state}`], `${state} moved as written`).toBe(value);
    expect(before.data['data-aria-describedby']).toBe('described');
    for (const state of subject.owns) expect(before.data[`data-${state}`], `${state} moved too`).toBeDefined();
    for (const each of names) expect(before.getAttribute[each], `getAttribute('${each}') is null: the host does not have it`).toBeNull();

    // After it has drawn: set, changed, removed, toggled, and set by the ARIA properties.
    await page.evaluate(() => {
      const host = document.querySelector<HTMLElement & { ariaDescribedByElements: Element[] | null; ariaCurrent: string | null }>('#subject')!;
      host.setAttribute('aria-keyshortcuts', 'Alt+J');
      host.removeAttribute('aria-invalid');
      host.toggleAttribute('aria-current', false);
      host.ariaDescribedByElements = [document.querySelector('#other')!];
    });
    await settle(page);
    const after = await read_(page, subject.path, names);
    if ('aria-keyshortcuts' in states) expect(after.inner['aria-keyshortcuts'], 'a changed state follows').toBe('Alt+J');
    expect(after.inner['aria-invalid'], 'removeAttribute of the moved name takes it off the element').not.toBe('true');
    expect(after.data['data-aria-invalid'], '…and off the host').toBeUndefined();
    expect(after.inner['aria-current'], 'toggleAttribute(name, false) takes it off').toBeNull();
    expect(after.data['data-aria-current']).toBeUndefined();
    expect(after.describedBy, 'elements given by property').toEqual(['other']);
    expect(after.ariaOnHost).toEqual([]);

    // The property, and the moved attribute removed by the product itself.
    await page.evaluate(() => {
      const host = document.querySelector<HTMLElement & { ariaCurrent: string | null }>('#subject')!;
      host.ariaCurrent = 'page';
      host.removeAttribute('data-aria-describedby');
    });
    await settle(page);
    const last = await read_(page, subject.path, names);
    if ('aria-current' in states) expect(last.inner['aria-current'], 'a state set by its property moves too').toBe('page');
    expect(last.data['data-aria-current']).toBe('page');
    expect(last.describedBy, 'data-aria-* removed by the product takes it off').toEqual([]);
    expect(last.inner['aria-describedby'], 'no reference is left behind').toBeNull();
    expect(last.ariaOnHost).toEqual([]);
  });

  test(`${name}: where the engine has no ARIA element reflection, the text of the elements named stands in for them`, async ({ page }) => {
    await load(page, `tanrei-${name}`, subject.markup('aria-describedby="described" aria-labelledby="named"'), { withoutReflection: true });
    const said = await read_(page, subject.path, ['aria-label', 'aria-description']);
    if (subject.ownName) expect(said.inner['aria-label'], 'its own label is its whole name').toBe(subject.ownName);
    else expect(said.inner['aria-label'], 'the label’s text is the name').toBe('Named text');
    expect(said.inner['aria-description'] ?? '', 'the description’s text is in the description').toContain('Described text');
    expect(said.ariaOnHost, 'and the host keeps neither').toEqual([]);
  });
}

test('the host of a control is no second node with the name, the description or the state the product gave it, and the element that carries the role has them (Chromium’s accessibility tree)', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'only Chromium gives a test its accessibility tree');
  await load(page, 'tanrei-button', SUBJECTS.button!.markup('aria-label="Send the report" aria-describedby="described" aria-invalid="true" aria-current="page"'));
  const tree = await axTree(page, '#stage');
  expect(tree.filter((line) => line.includes('Send the report') || line.includes('Described text')).map((line) => line.trim()), tree.join('\n')).toEqual(['button "Send the report" (Described text) focusable=true invalid=true']);
});

test('a relationship of the component’s own and the product’s are one list: a combobox in a field is described by its supporting text and by what the product names', async ({ page }) => {
  await load(page, 'tanrei-combobox', '<tanrei-field label="Fruit" supporting-text="Pick one"><tanrei-combobox id="subject" aria-describedby="described"><tanrei-option value="a">Alpha</tanrei-option></tanrei-combobox></tanrei-field>');
  const said = await read_(page, ['input'], []);
  expect(said.describedBy).toEqual(['description', 'described']);
});

test('aria-errormessage joins the description while the control is invalid, after aria-describedby, once; it is never written on the element', async ({ page }) => {
  await load(page, 'tanrei-text-input', '<tanrei-text-input id="subject" label="Name" aria-invalid="true" aria-describedby="described" aria-errormessage="error"></tanrei-text-input>');
  const invalid = await read_(page, ['input'], []);
  expect(invalid.describedBy).toEqual(['described', 'error']);
  expect(invalid.errormessage, 'no aria-errormessage on the element').toBeNull();
  await page.evaluate(() => document.querySelector('#subject')!.setAttribute('aria-describedby', 'error'));
  await settle(page);
  expect((await read_(page, ['input'], [])).describedBy, 'the same element once').toEqual(['error']);
  await page.evaluate(() => document.querySelector('#subject')!.setAttribute('aria-invalid', 'false'));
  await settle(page);
  expect((await read_(page, ['input'], [])).describedBy, 'valid: the error message is not described').toEqual(['error']);
  await page.evaluate(() => document.querySelector('#subject')!.removeAttribute('aria-describedby'));
  await settle(page);
  const valid = await read_(page, ['input'], []);
  expect(valid.describedBy).toEqual([]);
  expect(valid.errormessage).toBeNull();
});

test('the elements a reference names are followed: one added after the control, its text changed, removed, and replaced by another of the same id', async ({ page }) => {
  await load(page, 'tanrei-button', '<tanrei-button id="subject" aria-labelledby="later-name" aria-describedby="later">Send</tanrei-button><div id="home"></div>');
  const said = () => read_(page, ['button'], ['aria-label', 'aria-describedby']);
  expect((await said()).describedBy, 'nothing yet').toEqual([]);
  await page.evaluate(() => (document.querySelector('#home')!.innerHTML = '<p id="later">Later text</p><p id="later-name">Later name</p>'));
  await settle(page);
  expect((await said()).describedBy, 'added later').toEqual(['later']);
  expect((await said()).labelledBy).toEqual(['later-name']);
  await page.evaluate(() => document.querySelector('#later')!.remove());
  await settle(page);
  const removed = await said();
  expect(removed.describedBy, 'removed').toEqual([]);
  expect(removed.inner['aria-describedby'], 'the reference is taken off, not left holding the removed element').toBeNull();
  await page.evaluate(() => document.querySelector('#home')!.insertAdjacentHTML('beforeend', '<p id="later">Replacement text</p>'));
  await settle(page);
  const replaced = await page.evaluate(() => ((document.querySelector('#subject')!.shadowRoot!.querySelector('button') as unknown as { ariaDescribedByElements: Element[] }).ariaDescribedByElements ?? []).map((e) => e.textContent));
  expect(replaced, 'replaced by another of the same id').toEqual(['Replacement text']);
});

test('a reference reaches an element of the tree around the control (the shadow root that holds it), and never one inside a sibling component’s shadow root', async ({ page }) => {
  await load(page, 'tanrei-button', '<div id="outer"></div><div id="sibling"></div>');
  const result = await page.evaluate(async () => {
    const outer = document.querySelector('#outer')!.attachShadow({ mode: 'open' });
    outer.innerHTML = '<p id="inside">Inside text</p><tanrei-button id="held" aria-describedby="inside">Held</tanrei-button>';
    const sibling = document.querySelector('#sibling')!.attachShadow({ mode: 'open' });
    sibling.innerHTML = '<p id="apart">Apart text</p>';
    document.body.insertAdjacentHTML('beforeend', '<tanrei-button id="far" aria-describedby="apart">Far</tanrei-button>');
    const held = outer.querySelector('#held') as HTMLElement & { updateComplete: Promise<unknown> };
    const far = document.querySelector('#far') as HTMLElement & { updateComplete: Promise<unknown> };
    await held.updateComplete;
    await far.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const of = (host: Element) => ((host.shadowRoot!.querySelector('button') as unknown as { ariaDescribedByElements: Element[] | null }).ariaDescribedByElements ?? []).map((e) => e.id);
    return { held: of(held), far: of(far) };
  });
  expect(result.held).toEqual(['inside']);
  expect(result.far, 'another component’s shadow root is out of reach').toEqual([]);
});

test('a product selects the control by data-aria-*: the selected look of an icon on a Button the product marks aria-current="page"', async ({ page }) => {
  await load(page, 'tanrei-button', '<tanrei-button id="subject" aria-current="page"><span slot="icon" class="tanrei-icon">home</span>Home</tanrei-button><tanrei-button id="plain"><span slot="icon" class="tanrei-icon">home</span>Home</tanrei-button><span id="selected" class="tanrei-icon" data-selected>home</span>');
  await page.addStyleTag({ content: read('dist/icons.css') });
  const look = await page.evaluate(() => {
    const value = (selector: string) => getComputedStyle(document.querySelector(selector)!).getPropertyValue('--_fill').trim();
    return { current: value('#subject .tanrei-icon'), plain: value('#plain .tanrei-icon'), selected: value('#selected'), matches: document.querySelector('#subject')!.matches('[data-aria-current="page"]') };
  });
  expect(look.matches).toBe(true);
  expect(look.current, 'the icon of the current page is drawn selected').toBe(look.selected);
  expect(look.plain).not.toBe(look.selected);
});

test('axe reports nothing on controls the product gives aria-* — the hosts carry none, and no element carries an empty aria-errormessage', async ({ page }) => {
  const markup = Object.values(SUBJECTS)
    .map((subject, at) => subject.markup('aria-describedby="described" aria-labelledby="named" aria-current="page" aria-invalid="true" aria-errormessage="error"').replace('id="subject"', `id="subject-${at}"`))
    .join('');
  await load(page, 'tanrei-button', `<main><h1>Controls</h1>${markup}</main>`);
  const result = await new AxeBuilder({ page }).include('#stage').analyze();
  expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' > ')).join(', ')}`)).toEqual([]);
});
