// ARIA a product sets on the host of a component whose role is carried by an element inside it moves to data-aria-* on
// the host and is exposed on that element (src/primitives/delegated-aria.ts; the sentence of each spec that begins "WHERE
// the platform has ARIA attributes (the web)", whose id each subject names and each report cites): states as attributes, id references by ARIA element reflection (and,
// where an engine has none, the text of what they name), the error message in the description while invalid. What the
// component owns moves too, is not exposed and is reported in a debug build. The host carries no aria-* of the
// product's, and getAttribute('aria-X') on it is null: the value is data-aria-X. Each control is a subject in every
// engine; a composed field passes the product's ARIA on to its control, and a Lit product's bindings are followed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { buildSync } from 'esbuild';
import { axTree } from '../../test/ax-tree.js';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file: string) => fs.readFileSync(path.join(web, file), 'utf8');

interface Subject {
  /** The id of its spec's sentence that states the rule, which a report cites. */
  sentence: string;
  /** The control with `id="subject"`; `rest` is where the product's ARIA goes. */
  markup: (rest: string) => string;
  /** From the host down, one selector per shadow root: the element that carries the role. */
  path: string[];
  /** What the component owns: never taken from the host. */
  owns: string[];
  /** A name it gives itself that is its whole name, over the product's aria-labelledby (a Button's label, BTN-16). */
  ownName?: string;
  /** The tag of the subject, where the page is loaded for another (a segment, in its set): `tanrei-<name>` otherwise. */
  tag?: string;
  /** How many nodes the product's name names: one, or more where the component names a part by the control (a group's list). */
  namedNodes?: number;
  /** What the component says on its host itself, where the host has a role of its own (a destination is a list item). */
  hostOwn?: string[];
}

/** A list item's position in its list, which a destination says on its host (NVB-*, NVD-23). */
const LIST_ITEM = ['aria-posinset', 'aria-setsize'];

/** What a composed field says itself: its name is its Field's label, and its disabled state its own. */
const FIELD_OWNS = ['aria-label', 'aria-labelledby', 'aria-disabled'];

const SUBJECTS: Record<string, Subject> = {
  button: { sentence: 'BTN-46', markup: (rest) => `<tanrei-button id="subject" ${rest}>Send</tanrei-button>`, path: ['button'], owns: ['aria-pressed', 'aria-disabled'] },
  'button-with-menu': { sentence: 'SPB-36',
    markup: (rest) => `<tanrei-button-with-menu id="subject" ${rest} label="Save" menu-label="More"><tanrei-menu-item label="One"></tanrei-menu-item></tanrei-button-with-menu>`,
    path: ['button.leading'],
    owns: ['aria-haspopup', 'aria-expanded', 'aria-controls', 'aria-disabled'],
  },
  'main-action-button': { sentence: 'MAB-25', markup: (rest) => `<tanrei-main-action-button id="subject" ${rest} label="New"><span slot="icon">add</span></tanrei-main-action-button>`, path: ['button'], owns: ['aria-disabled'] },
  'copy-button': { sentence: 'CPY-20', markup: (rest) => `<tanrei-copy-button id="subject" ${rest} value="a" label="Copy" copied-label="Copied"></tanrei-copy-button>`, path: ['tanrei-button', 'button'], owns: ['aria-pressed', 'aria-disabled'], ownName: 'Copy' },
  chip: { sentence: 'CHP-40', markup: (rest) => `<tanrei-chip id="subject" ${rest} label="Chip"></tanrei-chip>`, path: ['.container'], owns: ['aria-pressed', 'aria-disabled'] },
  card: { sentence: 'CRD-24', markup: (rest) => `<tanrei-card id="subject" ${rest} interactive label="Card">Card</tanrei-card>`, path: ['.container'], owns: ['aria-disabled'] },
  checkbox: { sentence: 'CHK-25', markup: (rest) => `<tanrei-checkbox id="subject" ${rest} label="Checkbox"></tanrei-checkbox>`, path: ['input'], owns: ['aria-checked', 'aria-pressed', 'aria-disabled'] },
  switch: { sentence: 'SWT-26', markup: (rest) => `<tanrei-switch id="subject" ${rest} label="Switch"></tanrei-switch>`, path: ['input'], owns: ['aria-checked', 'aria-pressed', 'aria-disabled'] },
  'radio-button': { sentence: 'RAD-29', markup: (rest) => `<tanrei-radio-button id="subject" ${rest} label="Radio" value="a"></tanrei-radio-button>`, path: ['input'], owns: ['aria-checked', 'aria-pressed', 'aria-disabled'] },
  slider: { sentence: 'SLD-27', markup: (rest) => `<tanrei-slider id="subject" ${rest} label="Slider" value="40"></tanrei-slider>`, path: ['[role="slider"]'], owns: ['aria-disabled'] },
  'text-input': { sentence: 'TXI-70', markup: (rest) => `<tanrei-text-input id="subject" ${rest} label="Text"></tanrei-text-input>`, path: ['input'], owns: ['aria-disabled'] },
  select: { sentence: 'SEL-71',
    markup: (rest) => `<tanrei-select id="subject" ${rest} label="Select"><tanrei-option value="a">Alpha</tanrei-option></tanrei-select>`,
    path: ['[role="combobox"]'],
    owns: ['aria-haspopup', 'aria-expanded', 'aria-controls', 'aria-disabled'],
  },
  combobox: { sentence: 'CMB-69',
    markup: (rest) => `<tanrei-combobox id="subject" ${rest} label="Combobox"><tanrei-option value="a">Alpha</tanrei-option></tanrei-combobox>`,
    path: ['input'],
    owns: ['aria-haspopup', 'aria-expanded', 'aria-controls', 'aria-disabled'],
  },
  search: { sentence: 'SRC-54', markup: (rest) => `<tanrei-search id="subject" ${rest} label="Search"></tanrei-search>`, path: ['input'], owns: ['aria-haspopup', 'aria-expanded', 'aria-controls', 'aria-keyshortcuts', 'aria-disabled'] },
  'number-input': { sentence: 'NMI-48', markup: (rest) => `<tanrei-number-input id="subject" ${rest} label="Number" increment-label="More" decrement-label="Less"></tanrei-number-input>`, path: ['input'], owns: ['aria-disabled'] },
  'color-input': { sentence: 'CLI-46', markup: (rest) => `<tanrei-color-input id="subject" ${rest} label="Color" value="#0f766e"></tanrei-color-input>`, path: ['input'], owns: ['aria-disabled'] },
  // A composed field passes the product's ARIA on to its control, which moves and exposes it; its name is label.
  'text-field': { sentence: 'TXF-68', markup: (rest) => `<tanrei-text-field id="subject" ${rest} label="Text"></tanrei-text-field>`, path: ['tanrei-text-input', 'input'], owns: [...FIELD_OWNS], ownName: 'Text' },
  'number-field': { sentence: 'NUM-52',
    markup: (rest) => `<tanrei-number-field id="subject" ${rest} label="Number" increment-label="More" decrement-label="Less"></tanrei-number-field>`,
    path: ['tanrei-number-input', 'input'],
    owns: [...FIELD_OWNS],
    ownName: 'Number',
  },
  'select-field': { sentence: 'SEF-6',
    markup: (rest) => `<tanrei-select-field id="subject" ${rest} label="Select"><tanrei-option value="a">Alpha</tanrei-option></tanrei-select-field>`,
    path: ['tanrei-select', '[role="combobox"]'],
    owns: [...FIELD_OWNS, 'aria-haspopup', 'aria-expanded', 'aria-controls'],
    ownName: 'Select',
  },
  'combobox-field': { sentence: 'CBF-8',
    markup: (rest) => `<tanrei-combobox-field id="subject" ${rest} label="Combobox"><tanrei-option value="a">Alpha</tanrei-option></tanrei-combobox-field>`,
    path: ['tanrei-combobox', 'input'],
    owns: [...FIELD_OWNS, 'aria-haspopup', 'aria-expanded', 'aria-controls'],
    ownName: 'Combobox',
  },
  'color-field': { sentence: 'CLF-48', markup: (rest) => `<tanrei-color-field id="subject" ${rest} label="Color" value="#0f766e"></tanrei-color-field>`, path: ['tanrei-color-input', 'input'], owns: [...FIELD_OWNS], ownName: 'Color' },
  'slider-field': { sentence: 'SLF-14', markup: (rest) => `<tanrei-slider-field id="subject" ${rest} label="Slider" value="40"></tanrei-slider-field>`, path: ['tanrei-slider', '[role="slider"]'], owns: [...FIELD_OWNS], ownName: 'Slider' },
  'chip-field': { sentence: 'CHF-31', markup: (rest) => `<tanrei-chip-field id="subject" ${rest} label="Chips" remove-label="Remove {entry}"></tanrei-chip-field>`, path: ['tanrei-text-input', 'input'], owns: [...FIELD_OWNS], ownName: 'Chips' },
  'one-time-code-field': { sentence: 'OTF-9', markup: (rest) => `<tanrei-one-time-code-field id="subject" ${rest} label="Code"></tanrei-one-time-code-field>`, path: ['tanrei-one-time-code-input', 'input'], owns: [...FIELD_OWNS], ownName: 'Code' },
  // ETI-13: its name, its description and its states reach it as props.
  'embedded-text-input': { sentence: 'ETI-29',
    markup: (rest) => `<tanrei-embedded-text-input id="subject" ${rest} label="Message"></tanrei-embedded-text-input>`,
    path: ['input'],
    owns: ['aria-label', 'aria-labelledby', 'aria-description', 'aria-describedby', 'aria-errormessage', 'aria-invalid', 'aria-required', 'aria-readonly', 'aria-disabled'],
    ownName: 'Message',
  },
  'one-time-code-input': { sentence: 'OTC-31', markup: (rest) => `<tanrei-one-time-code-input id="subject" ${rest} label="Code"></tanrei-one-time-code-input>`, path: ['input'], owns: ['aria-disabled'] },
  segment: { sentence: 'SEG-29',
    markup: (rest) => `<tanrei-segmented-button label="View"><tanrei-segment id="subject" ${rest} value="a" label="Alpha"></tanrei-segment><tanrei-segment value="b" label="Beta"></tanrei-segment></tanrei-segmented-button>`,
    path: ['button'],
    owns: ['aria-checked', 'aria-pressed', 'aria-disabled'],
    tag: 'tanrei-segment',
  },
  'fab-menu': { sentence: 'FBM-28',
    markup: (rest) =>
      `<tanrei-fab-menu id="subject" ${rest} label="Create" inline><span slot="icon">add</span><tanrei-fab-menu-item label="Edit" icon="edit"></tanrei-fab-menu-item><tanrei-fab-menu-item label="Mail" icon="mail"></tanrei-fab-menu-item></tanrei-fab-menu>`,
    path: ['button'],
    owns: ['aria-haspopup', 'aria-expanded', 'aria-controls', 'aria-disabled'],
  },
  // The current destination is the component's own: the subject is never the bar's or the drawer's value.
  'navigation-bar-item': { sentence: 'NVB-34',
    markup: (rest) =>
      `<tanrei-navigation-bar label="Main" value="b"><tanrei-navigation-bar-item id="subject" ${rest} value="a" label="Home" icon="home"></tanrei-navigation-bar-item><tanrei-navigation-bar-item value="b" label="Mail" icon="mail"></tanrei-navigation-bar-item></tanrei-navigation-bar>`,
    path: ['[part="cell"]'],
    owns: ['aria-current', 'aria-disabled'],
    hostOwn: LIST_ITEM,
  },
  'navigation-drawer-item': { sentence: 'NVD-78',
    markup: (rest) =>
      `<tanrei-navigation-drawer open label="Side" value="b"><tanrei-navigation-drawer-item id="subject" ${rest} value="a" label="Home" icon="home"></tanrei-navigation-drawer-item><tanrei-navigation-drawer-item value="b" label="Mail" icon="mail"></tanrei-navigation-drawer-item></tanrei-navigation-drawer>`,
    path: ['[part="cell"]'],
    owns: ['aria-current', 'aria-disabled'],
    hostOwn: LIST_ITEM,
  },
  // The rail: the drawer's collapsed form draws the same item as an icon cell.
  'navigation-drawer-item (collapsed)': { sentence: 'NVD-78',
    markup: (rest) =>
      `<tanrei-navigation-drawer open collapsible label="Rail" value="b"><tanrei-navigation-drawer-item id="subject" ${rest} value="a" label="Home" icon="home"></tanrei-navigation-drawer-item><tanrei-navigation-drawer-item value="b" label="Mail" icon="mail"></tanrei-navigation-drawer-item></tanrei-navigation-drawer>`,
    path: ['[part="cell"]'],
    owns: ['aria-current', 'aria-disabled'],
    tag: 'tanrei-navigation-drawer-item',
    hostOwn: LIST_ITEM,
  },
  'navigation-drawer-group': { sentence: 'NVD-78',
    markup: (rest) =>
      `<tanrei-navigation-drawer open label="Groups" value="b"><tanrei-navigation-drawer-group id="subject" ${rest} label="Projects" icon="folder" open><tanrei-navigation-drawer-item value="b" label="Atlas" icon="deployed_code"></tanrei-navigation-drawer-item></tanrei-navigation-drawer-group></tanrei-navigation-drawer>`,
    path: ['#row'],
    owns: ['aria-current', 'aria-expanded', 'aria-controls', 'aria-disabled'],
    // Its list is named by its row (NVD-44).
    namedNodes: 2,
    hostOwn: LIST_ITEM,
  },
  tabs: { sentence: 'TAB-62',
    markup: (rest) => `<tanrei-tabs id="subject" ${rest} label="Sections" value="a"><tanrei-tab value="a" label="Alpha"></tanrei-tab><tanrei-tab value="b" label="Beta"></tanrei-tab></tanrei-tabs>`,
    path: ['[role="tablist"]'],
    owns: [],
  },
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
function read_(page: Page, path: string[], names: string[], hostOwn: string[] = []) {
  return page.evaluate(
    ({ path, names, hostOwn }) => {
      const host = document.querySelector<HTMLElement>('#subject')!;
      let at: Element = host;
      for (const selector of path) at = at.shadowRoot!.querySelector(selector)!;
      const inner = at as Element & Record<string, unknown>;
      const ids = (property: string) => ((inner[property] as Element[] | null | undefined) ?? []).map((element) => element.id || element.textContent);
      return {
        inner: Object.fromEntries(names.map((name) => [name, inner.getAttribute(name)])),
        // The description is the text of what the element's aria-describedby names in its own tree: the component's own
        // ids, and the copy of the product's text it keeps there.
        described: (inner.getAttribute('aria-describedby') ?? '')
          .split(/\s+/)
          .filter(Boolean)
          .map((id) => ((inner.getRootNode() as ShadowRoot).getElementById(id)?.textContent ?? '').trim())
          .join(' '),
        labelledBy: ids('ariaLabelledByElements'),
        controls: ids('ariaControlsElements'),
        errormessage: inner.getAttribute('aria-errormessage'),
        // What the host carries: no aria-* of the product's, and each one moved to data-aria-*.
        ariaOnHost: [...host.attributes].map((a) => a.name).filter((name) => name.startsWith('aria-') && !hostOwn.includes(name)),
        data: Object.fromEntries([...host.attributes].filter((a) => a.name.startsWith('data-aria-')).map((a) => [a.name, a.value])),
        getAttribute: Object.fromEntries(names.map((name) => [name, host.getAttribute(name)])),
      };
    },
    { path, names, hostOwn },
  );
}

for (const [name, subject] of Object.entries(SUBJECTS)) {
  const states = Object.fromEntries(Object.entries(STATES).filter(([state]) => !subject.owns.includes(state)));
  const written = Object.entries(states)
    .map(([state, value]) => `${state}="${value}"`)
    .join(' ');
  const names = [...new Set([...Object.keys(STATES), 'aria-describedby', 'aria-controls', ...subject.owns])];
  const tag = subject.tag ?? `tanrei-${name}`;
  // A description given by the product reaches the element unless the component owns it (an embedded text input's is its prop).
  const describes = !subject.owns.includes('aria-describedby');

  test(`${subject.sentence} ${name}: the product's aria-* on the host moves to data-aria-* and is exposed on the element that carries the role; what the component owns moves and is not exposed`, async ({ page }) => {
    const owned = subject.owns.map((state) => `${state}="${state === 'aria-disabled' ? 'true' : 'mixed'}"`).join(' ');
    const relations = [describes && 'aria-describedby="described"', !subject.owns.includes('aria-controls') && 'aria-controls="controlled"'].filter(Boolean).join(' ');
    await load(page, tag, subject.markup(`${written} ${relations} ${owned}`));
    const before = await read_(page, subject.path, names, subject.hostOwn);
    for (const [state, value] of Object.entries(states)) expect(before.inner[state], `${state} is the element's`).toBe(value);
    expect(before.described, 'aria-describedby reaches the element').toBe(describes ? 'Described text' : '');
    if (!subject.owns.includes('aria-controls')) expect(before.controls, 'aria-controls reaches the element by reflection').toEqual(['controlled']);
    for (const state of subject.owns) expect(before.inner[state], `${state} is the component's own`).not.toBe(state === 'aria-disabled' ? 'true' : 'mixed');
    expect(before.ariaOnHost, 'the host carries no aria-* of the product’s').toEqual([]);
    for (const [state, value] of Object.entries(states)) expect(before.data[`data-${state}`], `${state} moved as written`).toBe(value);
    expect(before.data['data-aria-describedby']).toBe(describes ? 'described' : 'mixed');
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
    const after = await read_(page, subject.path, names, subject.hostOwn);
    if ('aria-keyshortcuts' in states) expect(after.inner['aria-keyshortcuts'], 'a changed state follows').toBe('Alt+J');
    expect(after.inner['aria-invalid'], 'removeAttribute of the moved name takes it off the element').not.toBe('true');
    expect(after.data['data-aria-invalid'], '…and off the host').toBeUndefined();
    expect(after.inner['aria-current'], 'toggleAttribute(name, false) takes it off').toBeNull();
    expect(after.data['data-aria-current']).toBeUndefined();
    expect(after.described, 'elements given by property').toBe(describes ? 'Other text' : '');
    expect(after.ariaOnHost).toEqual([]);

    // The property, and the moved attribute removed by the product itself.
    await page.evaluate(() => {
      const host = document.querySelector<HTMLElement & { ariaCurrent: string | null }>('#subject')!;
      host.ariaCurrent = 'page';
      host.removeAttribute('data-aria-describedby');
    });
    await settle(page);
    const last = await read_(page, subject.path, names, subject.hostOwn);
    if ('aria-current' in states) expect(last.inner['aria-current'], 'a state set by its property moves too').toBe('page');
    expect(last.data['data-aria-current']).toBe('page');
    expect(last.described, 'data-aria-* removed by the product takes it off').toBe('');
    expect(last.inner['aria-describedby'], 'no reference is left behind').toBeNull();
    expect(last.ariaOnHost).toEqual([]);
  });

  test(`${subject.sentence} ${name}: where the engine has no ARIA element reflection, the text of the elements named stands in for them`, async ({ page }) => {
    await load(page, tag, subject.markup('aria-describedby="described" aria-labelledby="named"'), { withoutReflection: true });
    const said = await read_(page, subject.path, ['aria-label', 'aria-description'], subject.hostOwn);
    if (subject.ownName) expect(said.inner['aria-label'], 'its own label is its whole name').toBe(subject.ownName);
    else expect(said.inner['aria-label'], 'the label’s text is the name').toBe('Named text');
    expect(said.described, 'the description’s text is the description').toBe(describes ? 'Described text' : '');
    expect(said.ariaOnHost, 'and the host keeps neither').toEqual([]);
  });

  test(`${subject.sentence} ${name}: the host is no second node in Chromium’s accessibility tree — the name and the description the product gives are the element’s that carries the role, once`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium gives a test its accessibility tree');
    await load(page, tag, subject.markup('aria-labelledby="named" aria-describedby="described" aria-current="page"'));
    const tree = await axTree(page, '#stage');
    const dump = tree.join('\n');
    const named = subject.ownName || subject.owns.includes('aria-labelledby') ? 0 : (subject.namedNodes ?? 1);
    expect(tree.filter((line) => line.includes('"Named text"')), dump).toHaveLength(named);
    expect(tree.filter((line) => line.includes('Described text')), dump).toHaveLength(describes ? 1 : 0);
    expect(tree.filter((line) => /^\s*generic "[^"]|^\s*generic "[^"]*" \(/.test(line)), 'no node without a role has a name or a description').toEqual([]);
  });

  test(`${subject.sentence} ${name}: in a debug build, each name the component owns that the product sets is reported, once, citing the sentence; a name it exposes is not`, async ({ page }) => {
    const reported: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'warning' && message.text().includes("is the component's own to say")) reported.push(message.text());
    });
    const owned = subject.owns.map((state) => `${state}="${state === 'aria-disabled' ? 'true' : 'mixed'}"`).join(' ');
    await load(page, tag, subject.markup(`${written} ${owned}`));
    // Set again by the product after it has drawn: still once.
    await page.evaluate((owns) => {
      const host = document.querySelector('#subject')!;
      for (const state of owns) host.setAttribute(state, 'false');
    }, subject.owns);
    await settle(page);
    const said = (state: string) => reported.filter((line) => line.includes(`<${tag}>: ${state} on the element`));
    for (const state of subject.owns) {
      expect(said(state), `${state} is reported once`).toHaveLength(1);
      expect(said(state)[0], 'citing the spec sentence of the rule').toContain(`(${subject.sentence})`);
    }
    for (const state of Object.keys(states)) expect(said(state), `${state} is exposed, not reported`).toEqual([]);
    expect(reported.filter((line) => !line.includes(`<${tag}>`)), 'what a component writes on a member it holds is not the product’s').toEqual([]);
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
  expect(said.described).toBe('Pick one Described text');
});

test('aria-errormessage joins the description while the control is invalid, after aria-describedby, once; it is never written on the element', async ({ page }) => {
  await load(page, 'tanrei-text-input', '<tanrei-text-input id="subject" label="Name" aria-invalid="true" aria-describedby="described" aria-errormessage="error"></tanrei-text-input>');
  const invalid = await read_(page, ['input'], []);
  expect(invalid.described).toBe('Described text Error text');
  expect(invalid.errormessage, 'no aria-errormessage on the element').toBeNull();
  await page.evaluate(() => document.querySelector('#subject')!.setAttribute('aria-describedby', 'error'));
  await settle(page);
  expect((await read_(page, ['input'], [])).described, 'the same element once').toBe('Error text');
  await page.evaluate(() => document.querySelector('#subject')!.setAttribute('aria-invalid', 'false'));
  await settle(page);
  expect((await read_(page, ['input'], [])).described, 'valid: the error message is not described').toBe('Error text');
  await page.evaluate(() => document.querySelector('#subject')!.removeAttribute('aria-describedby'));
  await settle(page);
  const valid = await read_(page, ['input'], []);
  expect(valid.described).toBe('');
  expect(valid.errormessage).toBeNull();
});

test('the elements a reference names are followed: one added after the control, its text changed, removed, and replaced by another of the same id', async ({ page }) => {
  await load(page, 'tanrei-button', '<tanrei-button id="subject" aria-labelledby="later-name" aria-describedby="later">Send</tanrei-button><div id="home"></div>');
  const said = () => read_(page, ['button'], ['aria-label', 'aria-describedby']);
  expect((await said()).described, 'nothing yet').toBe('');
  await page.evaluate(() => (document.querySelector('#home')!.innerHTML = '<p id="later">Later text</p><p id="later-name">Later name</p>'));
  await settle(page);
  expect((await said()).described, 'added later').toBe('Later text');
  expect((await said()).labelledBy).toEqual(['later-name']);
  // The name's text is also the element's aria-label, for Playwright, which does not follow reflected references.
  expect((await said()).inner['aria-label']).toBe('Later name');
  await expect(page.getByRole('button', { name: 'Later name', exact: true })).toHaveCount(1);
  await page.evaluate(() => (document.querySelector('#later-name')!.textContent = 'Changed name'));
  await settle(page);
  expect((await said()).inner['aria-label'], 'its text changed').toBe('Changed name');
  await expect(page.getByRole('button', { name: 'Changed name', exact: true })).toHaveCount(1);
  await page.evaluate(() => document.querySelector('#later')!.remove());
  await settle(page);
  const removed = await said();
  expect(removed.described, 'removed').toBe('');
  expect(removed.inner['aria-describedby'], 'the reference is taken off, not left holding the removed element').toBeNull();
  await page.evaluate(() => document.querySelector('#home')!.insertAdjacentHTML('beforeend', '<p id="later">Replacement text</p>'));
  await settle(page);
  expect((await said()).described, 'replaced by another of the same id').toBe('Replacement text');
  await page.evaluate(() => (document.querySelector('#later')!.textContent = 'Changed text'));
  await settle(page);
  expect((await said()).described, 'its text changed').toBe('Changed text');
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
    const of = (host: Element) => {
      const button = host.shadowRoot!.querySelector('button')!;
      return (button.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean).map((id) => host.shadowRoot!.getElementById(id)?.textContent);
    };
    return { held: of(held), far: of(far) };
  });
  expect(result.held).toEqual(['Inside text']);
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

test('a name given by aria-labelledby and a description given by aria-describedby are seen by Playwright too: getByRole({ name }), getByLabel(), ariaSnapshot() and toHaveAccessibleDescription()', async ({ page }) => {
  await load(page, 'tanrei-button', '<tanrei-button id="subject" aria-labelledby="named">Send</tanrei-button><tanrei-text-input id="field" aria-labelledby="named"></tanrei-text-input>');
  await expect(page.getByRole('button', { name: 'Named text', exact: true })).toHaveCount(1);
  await expect(page.getByRole('textbox', { name: 'Named text', exact: true })).toHaveCount(1);
  await expect(page.getByLabel('Named text', { exact: true })).toHaveCount(2);
  expect(await page.locator('#subject').ariaSnapshot()).toContain('button "Named text"');
  await page.evaluate(() => {
    const host = document.querySelector('#subject')!;
    host.setAttribute('aria-invalid', 'true');
    host.setAttribute('aria-describedby', 'described');
    host.setAttribute('aria-errormessage', 'error');
  });
  await settle(page);
  await expect(page.locator('#subject').getByRole('button')).toHaveAccessibleDescription('Described text Error text');
  await page.evaluate(() => (document.querySelector('#described')!.textContent = 'Described again'));
  await expect(page.locator('#subject').getByRole('button')).toHaveAccessibleDescription('Described again Error text');
});

/** Reads, from the host `#<id>` down one selector per shadow root, what the element that carries the role says. */
const said = (page: Page, id: string, path: string[]) =>
  page.evaluate(
    ({ id, path }) => {
      const host = document.getElementById(id)!;
      let at: Element = host;
      for (const selector of path) at = at.shadowRoot!.querySelector(selector)!;
      const root = at.getRootNode() as ShadowRoot;
      const described = (at.getAttribute('aria-describedby') ?? '')
        .split(/\s+/)
        .filter(Boolean)
        .map((each) => (root.getElementById(each)?.textContent ?? '').trim());
      return {
        label: at.getAttribute('aria-label'),
        busy: at.getAttribute('aria-busy'),
        required: at.getAttribute('aria-required'),
        haspopup: at.getAttribute('aria-haspopup'),
        expanded: at.getAttribute('aria-expanded'),
        // The whole description: the element's own aria-description, then what its aria-describedby names.
        description: [at.getAttribute('aria-description') ?? '', ...described].filter(Boolean).join(' '),
        host: [...host.attributes].filter((a) => a.name.startsWith('aria-') || a.name.startsWith('data-aria-')).map((a) => `${a.name}=${a.value}`).sort(),
      };
    },
    { id, path },
  );

test('a composed field passes the product’s description on beside its Field’s, and the Field keeps what it wrote when the field draws again', async ({ page }) => {
  await load(page, 'tanrei-text-field', '<tanrei-text-field id="subject" label="Name" supporting-text="Help words" aria-description="Product words" aria-describedby="described"></tanrei-text-field>');
  const path = ['tanrei-text-input', 'input'];
  const first = await said(page, 'subject', path);
  for (const words of ['Help words', 'Product words', 'Described text']) expect(first.description, words).toContain(words);
  expect(first.label, 'its name is its label').toBe('Name');
  expect(first.host).toEqual(['data-aria-describedby=described', 'data-aria-description=Product words']);
  // It draws again (another label): the Field's description and the product's are both still there.
  await page.evaluate(() => ((document.querySelector('#subject') as HTMLElement & { label: string }).label = 'Full name'));
  await settle(page);
  const again = await said(page, 'subject', path);
  for (const words of ['Help words', 'Product words', 'Described text']) expect(again.description, words).toContain(words);
  expect(again.label).toBe('Full name');
  await page.evaluate(() => document.querySelector('#subject')!.removeAttribute('aria-description'));
  await settle(page);
  const taken = await said(page, 'subject', path);
  expect(taken.description, 'the product’s words go').not.toContain('Product words');
  expect(taken.description, 'the Field’s stay').toContain('Help words');
});

test('a search drawn as an icon writes what its trigger says on its Button’s host, which moves it and exposes it on its native button; nothing is reported', async ({ page }) => {
  const reported: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning' && message.text().includes("is the component's own to say")) reported.push(message.text());
  });
  await load(page, 'tanrei-search', '<tanrei-search id="subject" bar="icon" label="Search the docs" aria-describedby="described"></tanrei-search>');
  const trigger = await page.evaluate(() => {
    const button = document.querySelector('#subject')!.shadowRoot!.querySelector('tanrei-button.trigger-icon')!;
    return [...button.attributes].filter((a) => a.name.startsWith('aria-') || a.name.startsWith('data-aria-')).map((a) => `${a.name}=${a.value}`).sort();
  });
  expect(trigger, 'on the Button’s host, moved as a product’s').toEqual(['data-aria-describedby=', 'data-aria-expanded=false', 'data-aria-haspopup=dialog']);
  const native = await page.evaluate(() => {
    const button = document.querySelector('#subject')!.shadowRoot!.querySelector('tanrei-button.trigger-icon')!.shadowRoot!.querySelector('button')!;
    const root = button.getRootNode() as ShadowRoot;
    return {
      haspopup: button.getAttribute('aria-haspopup'),
      expanded: button.getAttribute('aria-expanded'),
      label: button.getAttribute('aria-label'),
      described: (button.getAttribute('aria-describedby') ?? '')
        .split(/\s+/)
        .filter(Boolean)
        .map((id) => root.getElementById(id)?.textContent)
        .join(' '),
    };
  });
  expect(native).toEqual({ haspopup: 'dialog', expanded: 'false', label: 'Search the docs', described: 'Described text' });
  expect(reported).toEqual([]);
});

/** Lit as a product imports it, built for a page: `window.__lit` holds `html`, `render` and `nothing`. */
let litBundle: string | undefined;
const lit = () =>
  (litBundle ??= buildSync({
    stdin: { contents: "import { html, render, nothing } from 'lit';\nwindow.__lit = { html, render, nothing };\n", resolveDir: web, loader: 'js' },
    bundle: true,
    write: false,
    format: 'iife',
  }).outputFiles[0]!.text);

test('a Lit product’s bindings take away what they wrote: an attribute bound to nothing, and a boolean attribute (?aria-busy) turned off — on a control and on a composed field', async ({ page }) => {
  await load(page, 'tanrei-text-field', '<div id="lit"></div>');
  await page.addScriptTag({ content: lit() });
  const draw = (label: string | null, on: boolean) =>
    page.evaluate(
      async ({ label, on }) => {
        type Lit = { html: (strings: TemplateStringsArray, ...values: unknown[]) => unknown; render: (value: unknown, into: Element) => void; nothing: unknown };
        const { html, render, nothing } = (window as unknown as { __lit: Lit }).__lit;
        render(
          html`<tanrei-button id="subject" aria-label=${label ?? nothing} aria-describedby=${label ? 'described' : nothing} ?aria-busy=${on}></tanrei-button
            ><tanrei-text-field id="field" label="Name" aria-describedby=${label ? 'described' : nothing} ?aria-required=${on}></tanrei-text-field>`,
          document.querySelector('#lit')!,
        );
        for (const element of document.querySelectorAll<HTMLElement & { updateComplete?: Promise<unknown> }>('#subject, #field')) await element.updateComplete;
      },
      { label, on },
    );
  await draw('Send the report', true);
  await settle(page);
  const button = await said(page, 'subject', ['button']);
  expect(button.host).toEqual(['data-aria-busy=', 'data-aria-describedby=described', 'data-aria-label=Send the report']);
  expect([button.label, button.busy, button.description]).toEqual(['Send the report', '', 'Described text']);
  const field = await said(page, 'field', ['tanrei-text-input', 'input']);
  expect(field.host).toEqual(['data-aria-describedby=described', 'data-aria-required=']);
  expect(field.required).toBe('');
  expect(field.description).toContain('Described text');

  await draw(null, false);
  await settle(page);
  const gone = await said(page, 'subject', ['button']);
  expect(gone.host, 'nothing and a boolean attribute turned off take the moved values away').toEqual([]);
  expect([gone.label, gone.busy, gone.description]).toEqual([null, null, '']);
  const fieldGone = await said(page, 'field', ['tanrei-text-input', 'input']);
  expect(fieldGone.host).toEqual([]);
  expect(fieldGone.required).toBeNull();
  expect(fieldGone.description).not.toContain('Described text');
});
