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
  /** From the host down, one selector per shadow root — `light:` before one that is a light-DOM child instead (a tab view's row) — the element that carries the role. */
  path: string[];
  /** What the component owns: never taken from the host. */
  owns: string[];
  /** The name it gives itself — its label, which is its whole name over the product's aria-label and aria-labelledby (BTN-16, TXI-23…). */
  ownName?: string;
  /** The tag of the subject, where the page is loaded for another (a segment, in its set): `tanrei-<name>` otherwise. */
  tag?: string;
  /** How many nodes the product's name names: one, or more where the component names a part by the control (a group's list). */
  namedNodes?: number;
  /** What the component says on its host itself, where the host has a role of its own (a destination is a list item). */
  hostOwn?: string[];
  /** Its own page for axe: it covers the rest of the page (a modal drawer). */
  alone?: boolean;
  /** Its own name is ids of its own in aria-labelledby (a dialog's headline), not an aria-label. */
  ownLabelledBy?: boolean;
  /** The prop its own name comes from, where it is not `label` (a dialog's headline). */
  nameProp?: string;
}

/** A list item's position in its list, which a destination says on its host (NVB-*, NVD-23). */
const LIST_ITEM = ['aria-posinset', 'aria-setsize'];

/** What a composed field says itself: its name is its Field's label, and its disabled state its own. */
const FIELD_OWNS = ['aria-label', 'aria-labelledby', 'aria-disabled'];

/** What a field group says itself (FGR-27): its name, its states and its error message are its props. */
const GROUP_OWNS = [...FIELD_OWNS, 'aria-required', 'aria-invalid', 'aria-errormessage'];

const SUBJECTS: Record<string, Subject> = {
  button: { sentence: 'BTN-46', markup: (rest) => `<tanrei-button id="subject" ${rest}>Send</tanrei-button>`, path: ['button'], owns: ['aria-pressed', 'aria-disabled'] },
  'button-with-menu': { sentence: 'SPB-36', ownName: 'Save',
    markup: (rest) => `<tanrei-button-with-menu id="subject" ${rest} label="Save" menu-label="More"><tanrei-menu-item label="One"></tanrei-menu-item></tanrei-button-with-menu>`,
    path: ['button.leading'],
    owns: ['aria-haspopup', 'aria-expanded', 'aria-controls', 'aria-disabled'],
  },
  'main-action-button': { sentence: 'MAB-25', ownName: 'New', markup: (rest) => `<tanrei-main-action-button id="subject" ${rest} label="New"><span slot="icon">add</span></tanrei-main-action-button>`, path: ['button'], owns: ['aria-disabled'] },
  'copy-button': { sentence: 'CPY-20', markup: (rest) => `<tanrei-copy-button id="subject" ${rest} value="a" label="Copy" copied-label="Copied"></tanrei-copy-button>`, path: ['tanrei-button', 'button'], owns: ['aria-pressed', 'aria-disabled'], ownName: 'Copy' },
  chip: { sentence: 'CHP-40', ownName: 'Chip', markup: (rest) => `<tanrei-chip id="subject" ${rest} label="Chip"></tanrei-chip>`, path: ['.container'], owns: ['aria-pressed', 'aria-disabled'] },
  card: { sentence: 'CRD-24', ownName: 'Card', markup: (rest) => `<tanrei-card id="subject" ${rest} interactive label="Card">Card</tanrei-card>`, path: ['.container'], owns: ['aria-disabled'] },
  checkbox: { sentence: 'CHK-25', ownName: 'Checkbox', markup: (rest) => `<tanrei-checkbox id="subject" ${rest} label="Checkbox"></tanrei-checkbox>`, path: ['input'], owns: ['aria-checked', 'aria-pressed', 'aria-disabled'] },
  switch: { sentence: 'SWT-26', ownName: 'Switch', markup: (rest) => `<tanrei-switch id="subject" ${rest} label="Switch"></tanrei-switch>`, path: ['input'], owns: ['aria-checked', 'aria-pressed', 'aria-disabled'] },
  'radio-button': { sentence: 'RAD-29', ownName: 'Radio', markup: (rest) => `<tanrei-radio-button id="subject" ${rest} label="Radio" value="a"></tanrei-radio-button>`, path: ['input'], owns: ['aria-checked', 'aria-pressed', 'aria-disabled'] },
  slider: { sentence: 'SLD-27', ownName: 'Slider', markup: (rest) => `<tanrei-slider id="subject" ${rest} label="Slider" value="40"></tanrei-slider>`, path: ['[role="slider"]'], owns: ['aria-disabled'] },
  'text-input': { sentence: 'TXI-70', ownName: 'Text', markup: (rest) => `<tanrei-text-input id="subject" ${rest} label="Text"></tanrei-text-input>`, path: ['input'], owns: ['aria-disabled'] },
  select: { sentence: 'SEL-71', ownName: 'Select',
    markup: (rest) => `<tanrei-select id="subject" ${rest} label="Select"><tanrei-option value="a">Alpha</tanrei-option></tanrei-select>`,
    path: ['[role="combobox"]'],
    owns: ['aria-haspopup', 'aria-expanded', 'aria-controls', 'aria-disabled'],
  },
  combobox: { sentence: 'CMB-69', ownName: 'Combobox',
    markup: (rest) => `<tanrei-combobox id="subject" ${rest} label="Combobox"><tanrei-option value="a">Alpha</tanrei-option></tanrei-combobox>`,
    path: ['input'],
    owns: ['aria-haspopup', 'aria-expanded', 'aria-controls', 'aria-disabled'],
  },
  search: { sentence: 'SRC-54', ownName: 'Search', markup: (rest) => `<tanrei-search id="subject" ${rest} label="Search"></tanrei-search>`, path: ['input'], owns: ['aria-haspopup', 'aria-expanded', 'aria-controls', 'aria-keyshortcuts', 'aria-disabled'] },
  'number-input': { sentence: 'NMI-48', ownName: 'Number', markup: (rest) => `<tanrei-number-input id="subject" ${rest} label="Number" increment-label="More" decrement-label="Less"></tanrei-number-input>`, path: ['input'], owns: ['aria-disabled'] },
  'color-input': { sentence: 'CLI-46', ownName: 'Color', markup: (rest) => `<tanrei-color-input id="subject" ${rest} label="Color" value="#0f766e"></tanrei-color-input>`, path: ['input'], owns: ['aria-disabled'] },
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
  'one-time-code-input': { sentence: 'OTC-31', ownName: 'Code', markup: (rest) => `<tanrei-one-time-code-input id="subject" ${rest} label="Code"></tanrei-one-time-code-input>`, path: ['input'], owns: ['aria-disabled'] },
  segment: { sentence: 'SEG-29', ownName: 'Alpha',
    markup: (rest) => `<tanrei-segmented-button label="View"><tanrei-segment id="subject" ${rest} value="a" label="Alpha"></tanrei-segment><tanrei-segment value="b" label="Beta"></tanrei-segment></tanrei-segmented-button>`,
    path: ['button'],
    owns: ['aria-checked', 'aria-pressed', 'aria-disabled'],
    tag: 'tanrei-segment',
  },
  'fab-menu': { sentence: 'FBM-28', ownName: 'Create',
    markup: (rest) =>
      `<tanrei-fab-menu id="subject" ${rest} label="Create" inline><span slot="icon">add</span><tanrei-fab-menu-item label="Edit" icon="edit"></tanrei-fab-menu-item><tanrei-fab-menu-item label="Mail" icon="mail"></tanrei-fab-menu-item></tanrei-fab-menu>`,
    path: ['button'],
    owns: ['aria-haspopup', 'aria-expanded', 'aria-controls', 'aria-disabled'],
  },
  // The current destination is the component's own: the subject is never the bar's or the drawer's value.
  'navigation-bar-item': { sentence: 'NVB-34', ownName: 'Home',
    markup: (rest) =>
      `<tanrei-navigation-bar label="Main" value="b"><tanrei-navigation-bar-item id="subject" ${rest} value="a" label="Home" icon="home"></tanrei-navigation-bar-item><tanrei-navigation-bar-item value="b" label="Mail" icon="mail"></tanrei-navigation-bar-item></tanrei-navigation-bar>`,
    path: ['[part="cell"]'],
    owns: ['aria-current', 'aria-disabled'],
    hostOwn: LIST_ITEM,
  },
  'navigation-drawer-item': { sentence: 'NVD-78', ownName: 'Home',
    markup: (rest) =>
      `<tanrei-navigation-drawer open label="Side" value="b"><tanrei-navigation-drawer-item id="subject" ${rest} value="a" label="Home" icon="home"></tanrei-navigation-drawer-item><tanrei-navigation-drawer-item value="b" label="Mail" icon="mail"></tanrei-navigation-drawer-item></tanrei-navigation-drawer>`,
    path: ['[part="cell"]'],
    owns: ['aria-current', 'aria-disabled'],
    hostOwn: LIST_ITEM,
  },
  // The rail: the drawer's collapsed form draws the same item as an icon cell.
  'navigation-drawer-item (collapsed)': { sentence: 'NVD-78', ownName: 'Home',
    markup: (rest) =>
      `<tanrei-navigation-drawer open collapsible label="Rail" value="b"><tanrei-navigation-drawer-item id="subject" ${rest} value="a" label="Home" icon="home"></tanrei-navigation-drawer-item><tanrei-navigation-drawer-item value="b" label="Mail" icon="mail"></tanrei-navigation-drawer-item></tanrei-navigation-drawer>`,
    path: ['[part="cell"]'],
    owns: ['aria-current', 'aria-disabled'],
    tag: 'tanrei-navigation-drawer-item',
    hostOwn: LIST_ITEM,
  },
  'navigation-drawer-group': { sentence: 'NVD-78', ownName: 'Projects',
    markup: (rest) =>
      `<tanrei-navigation-drawer open label="Groups" value="b"><tanrei-navigation-drawer-group id="subject" ${rest} label="Projects" icon="folder" open><tanrei-navigation-drawer-item value="b" label="Atlas" icon="deployed_code"></tanrei-navigation-drawer-item></tanrei-navigation-drawer-group></tanrei-navigation-drawer>`,
    path: ['#row'],
    owns: ['aria-current', 'aria-expanded', 'aria-controls', 'aria-disabled'],
    // Its list is named by its row (NVD-44).
    namedNodes: 2,
    hostOwn: LIST_ITEM,
  },
  tabs: { sentence: 'TAB-62', ownName: 'Sections',
    markup: (rest) => `<tanrei-tabs id="subject" ${rest} label="Sections" value="a"><tanrei-tab value="a" label="Alpha"></tanrei-tab><tanrei-tab value="b" label="Beta"></tanrei-tab></tanrei-tabs>`,
    path: ['[role="tablist"]'],
    owns: [],
  },
  // The groups: the field group's own group, and the field group the checkbox group and the radio group are made of.
  'field-group': {
    sentence: 'FGR-27',
    markup: (rest) => `<tanrei-field-group id="subject" ${rest} label="Group"><tanrei-checkbox label="One"></tanrei-checkbox></tanrei-field-group>`,
    path: ['fieldset'],
    owns: [...GROUP_OWNS],
  },
  'checkbox-group': {
    sentence: 'CKG-15',
    markup: (rest) => `<tanrei-checkbox-group id="subject" ${rest} label="Group"><tanrei-checkbox value="a" label="One"></tanrei-checkbox></tanrei-checkbox-group>`,
    path: ['tanrei-field-group', 'fieldset'],
    owns: [...GROUP_OWNS],
  },
  'radio-group': {
    sentence: 'RGP-21',
    markup: (rest) => `<tanrei-radio-group id="subject" ${rest} label="Group"><tanrei-radio-button value="a" label="One"></tanrei-radio-button><tanrei-radio-button value="b" label="Two"></tanrei-radio-button></tanrei-radio-group>`,
    path: ['tanrei-field-group', '[role="radiogroup"]'],
    owns: [...GROUP_OWNS, 'aria-readonly'],
  },
  'chat-composer': {
    sentence: 'CCM-45',
    markup: (rest) => `<tanrei-chat-composer id="subject" ${rest} label="Message" send-label="Send"></tanrei-chat-composer>`,
    path: ['[role="group"]'],
    owns: ['aria-label', 'aria-labelledby', 'aria-busy', 'aria-disabled', 'aria-invalid', 'aria-errormessage'],
    ownName: 'Message',
  },
  'file-upload': {
    sentence: 'FUP-60',
    markup: (rest) => `<tanrei-file-upload id="subject" ${rest} label="Files"></tanrei-file-upload>`,
    path: ['[role="group"]'],
    owns: [...GROUP_OWNS],
    ownName: 'Files',
  },
  // A drawer's own host: its navigation landmark, or its dialog while it is a modal drawer that is shown (NVD-78).
  'navigation-drawer': {
    sentence: 'NVD-78',
    // A label of its own among the drawers of the axe page, which names each landmark once.
    markup: (rest) => `<tanrei-navigation-drawer id="subject" ${rest} open label="Landmark" value="a"><tanrei-navigation-drawer-item value="a" label="Home" icon="home"></tanrei-navigation-drawer-item></tanrei-navigation-drawer>`,
    path: ['nav'],
    owns: [],
    ownName: 'Landmark',
  },
  'navigation-drawer (modal)': {
    sentence: 'NVD-78',
    markup: (rest) =>
      `<tanrei-navigation-drawer id="subject" ${rest} variant="modal" open label="Side" value="a"><tanrei-navigation-drawer-item value="a" label="Home" icon="home"></tanrei-navigation-drawer-item></tanrei-navigation-drawer>`,
    path: ['dialog'],
    owns: [],
    tag: 'tanrei-navigation-drawer',
    ownName: 'Side',
    alone: true,
  },
  // The tab list of the row the view places in its light DOM (TBV-16), which moves and exposes what the view gives it.
  'tab-view': {
    sentence: 'TBV-24',
    markup: (rest) => `<tanrei-tab-view id="subject" ${rest} value="a"><tanrei-tab-panel value="a" label="Alpha">A</tanrei-tab-panel><tanrei-tab-panel value="b" label="Beta">B</tanrei-tab-panel></tanrei-tab-view>`,
    path: ['light:tanrei-tabs', '[role="tablist"]'],
    owns: [],
  },
  // The surfaces: each one's dialog, or its region while it is not modal.
  dialog: {
    sentence: 'DLG-29',
    markup: (rest) => `<tanrei-dialog id="subject" ${rest} open headline="Title"><tanrei-button slot="actions-last">OK</tanrei-button></tanrei-dialog>`,
    path: ['dialog'],
    owns: [],
    ownName: 'Title',
    ownLabelledBy: true,
    nameProp: 'headline',
    alone: true,
  },
  'modal-layer': { sentence: 'MDL-13', markup: (rest) => `<tanrei-modal-layer id="subject" ${rest} open label="Layer">Layer content</tanrei-modal-layer>`, path: ['dialog'], owns: [], ownName: 'Layer', alone: true },
  'image-preview': {
    sentence: 'IMP-44',
    markup: (rest) =>
      `<tanrei-image-preview id="subject" ${rest} open label="Photos" close-label="Close" zoom-in-label="Zoom in" zoom-out-label="Zoom out"><tanrei-image-preview-item src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" alt="A dot" width="1" height="1"></tanrei-image-preview-item></tanrei-image-preview>`,
    path: ['dialog'],
    owns: [],
    ownName: 'Photos',
    alone: true,
  },
  'side-sheet': {
    sentence: 'SSH-24',
    markup: (rest) => `<tanrei-side-sheet id="subject" ${rest} variant="modal" open headline="Filters" close-label="Close">Sheet content</tanrei-side-sheet>`,
    path: ['dialog'],
    owns: [],
    ownName: 'Filters',
    nameProp: 'headline',
    alone: true,
  },
  'bottom-sheet': { sentence: 'BSH-31', markup: (rest) => `<tanrei-bottom-sheet id="subject" ${rest} variant="standard" open label="Sheet">Sheet content</tanrei-bottom-sheet>`, path: ['section'], owns: [], ownName: 'Sheet' },
  'date-time-picker': {
    sentence: 'DTM-51',
    markup: (rest) =>
      `<tanrei-date-time-picker id="subject" ${rest} presentation="docked" inline open mode="date" value="2026-09-17" today="2026-09-24" locale="en-US" label="Date" date-label="Date" previous-month-label="Previous month" next-month-label="Next month" year-view-label="Choose a year" today-label="Today" confirm-label="OK" cancel-label="Cancel"></tanrei-date-time-picker>`,
    path: ['[role="dialog"]'],
    owns: [],
    ownName: 'Date',
  },
  popover: {
    sentence: 'POP-44',
    markup: (rest) => `<button id="popover-anchor" type="button">Open</button><tanrei-popover id="subject" ${rest} anchor="popover-anchor" open label="Info">Popover content</tanrei-popover>`,
    path: ['[part="container"]'],
    owns: [],
    ownName: 'Info',
  },
  // The landmarks.
  breadcrumbs: { sentence: 'BRC-31', markup: (rest) => `<tanrei-breadcrumbs id="subject" ${rest} label="Trail"><a href="#home">Home</a><span>Here</span></tanrei-breadcrumbs>`, path: ['nav'], owns: [], ownName: 'Trail' },
  pagination: {
    sentence: 'PGN-25',
    markup: (rest) => `<tanrei-pagination id="subject" ${rest} label="Pages" page="1" count="5" previous-label="Previous page" next-label="Next page" page-label="Page {page}"></tanrei-pagination>`,
    path: ['nav'],
    owns: [],
    ownName: 'Pages',
  },
  'table-of-contents': {
    sentence: 'TOC-41',
    markup: (rest) => `<tanrei-table-of-contents id="subject" ${rest} label="On this page"><ul><li><a href="#stage">Stage</a></li></ul></tanrei-table-of-contents>`,
    path: ['nav'],
    owns: [],
    ownName: 'On this page',
  },
  'tag-group': { sentence: 'TGR-22', markup: (rest) => `<tanrei-tag-group id="subject" ${rest} label="Tags"><tanrei-tag label="Alpha"></tanrei-tag></tanrei-tag-group>`, path: ['[role="list"]'], owns: [], ownName: 'Tags' },
  // A handle with a value is a separator; its disabled and expanded states are its own.
  handle: { sentence: 'HDL-26', markup: (rest) => `<tanrei-handle id="subject" ${rest} label="Resize" value="50"></tanrei-handle>`, path: ['[role="separator"]'], owns: ['aria-disabled', 'aria-expanded'], ownName: 'Resize' },
  // A group while it has a name, its own or the product's.
  calendar: {
    sentence: 'CAL-36',
    markup: (rest) => `<tanrei-calendar id="subject" ${rest} label="Dates" value="2026-09-17" today="2026-09-24" locale="en-US" previous-month-label="Previous month" next-month-label="Next month" year-view-label="Choose a year" today-label="Today"></tanrei-calendar>`,
    path: ['.calendar'],
    owns: [],
    ownName: 'Dates',
  },
  'code-block': { sentence: 'COD-34', markup: (rest) => `<tanrei-code-block id="subject" ${rest} label="Example" code="let a = 1;"></tanrei-code-block>`, path: ['[part="body"]'], owns: [], ownName: 'Example' },
  'file-picker': {
    sentence: 'FPK-32',
    markup: (rest) => `<tanrei-file-picker id="subject" ${rest} label="Files"><tanrei-button slot="trigger" variant="outlined">Choose a file</tanrei-button></tanrei-file-picker>`,
    path: ['.group'],
    owns: [],
    ownName: 'Files',
  },
};

/** The states the tests set on a host: each one the component does not own. */
const STATES: Record<string, string> = { 'aria-expanded': 'false', 'aria-haspopup': 'dialog', 'aria-current': 'page', 'aria-keyshortcuts': 'Alt+K', 'aria-invalid': 'true' };

/** The ARIA property that reflects each of those states. */
const PROPERTIES: Record<string, string> = { 'aria-expanded': 'ariaExpanded', 'aria-haspopup': 'ariaHasPopup', 'aria-current': 'ariaCurrent', 'aria-keyshortcuts': 'ariaKeyShortcuts', 'aria-invalid': 'ariaInvalid' };

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
      for (const selector of path) at = selector.startsWith('light:') ? at.querySelector(selector.slice(6))! : at.shadowRoot!.querySelector(selector)!;
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

  test(`${subject.sentence} ${name}: an ARIA property set on the host moves as its attribute does, and set to null takes it off the element that carries the role; the getter reads nothing on the host`, async ({ page }) => {
    await load(page, tag, subject.markup(''));
    const properties = Object.fromEntries(Object.entries(states).map(([state, value]) => [PROPERTIES[state]!, value]));
    const set = (to: 'values' | 'null' | 'read') =>
      page.evaluate(
        ({ properties, describes, to }) => {
          const host = document.querySelector('#subject') as unknown as Record<string, unknown>;
          if (to !== 'read') {
            for (const [property, value] of Object.entries(properties)) host[property] = to === 'values' ? value : null;
            if (describes) host.ariaDescribedByElements = to === 'values' ? [document.querySelector('#described')] : null;
          }
          return Object.fromEntries([...Object.keys(properties), 'ariaDescribedByElements'].map((property) => [property, host[property] ?? null]));
        },
        { properties, describes, to },
      );
    const read = async () => {
      await settle(page);
      return read_(page, subject.path, names, subject.hostOwn);
    };
    await set('values');
    const given = await read();
    // Read once the move has run (Firefox runs it after the setter has returned).
    const getters = await set('read');
    for (const [property, value] of Object.entries(getters)) expect(value, `host.${property} reads nothing: the host carries nothing`).toBeNull();
    for (const [state, value] of Object.entries(states)) {
      expect(given.inner[state], `${state} set by its property is the element's`).toBe(value);
      expect(given.data[`data-${state}`], `${state} moved`).toBe(value);
    }
    expect(given.described, 'aria-describedby set by its property').toBe(describes ? 'Described text' : '');
    expect(given.ariaOnHost).toEqual([]);

    await set('null');
    const taken = await read();
    for (const state of Object.keys(states)) {
      expect(taken.inner[state], `${state} set to null leaves the element`).not.toBe(states[state]);
      expect(taken.data[`data-${state}`], `${state} set to null leaves the host`).toBeUndefined();
    }
    expect(taken.described, 'ariaDescribedByElements set to null takes the description away').toBe('');
    expect(taken.data['data-aria-describedby']).toBeUndefined();
    expect(taken.ariaOnHost).toEqual([]);
  });

  test(`${subject.sentence} ${name}: where the engine has no ARIA element reflection, the text of the elements named stands in for them`, async ({ page }) => {
    await load(page, tag, subject.markup('aria-describedby="described" aria-labelledby="named"'), { withoutReflection: true });
    const said = await read_(page, subject.path, ['aria-label', 'aria-description'], subject.hostOwn);
    if (subject.ownName && subject.ownLabelledBy) expect(said.inner['aria-label'], 'its name is its own: the label’s text is not').not.toBe('Named text');
    else if (subject.ownName) expect(said.inner['aria-label'], 'its own label is its whole name').toBe(subject.ownName);
    else if (subject.owns.includes('aria-labelledby')) expect(said.inner['aria-label'], 'its name is its own: the label’s text is not').not.toBe('Named text');
    else expect(said.inner['aria-label'], 'the label’s text is the name').toBe('Named text');
    expect(said.described, 'the description’s text is the description').toBe(describes ? 'Described text' : '');
    expect(said.ariaOnHost, 'and the host keeps neither').toEqual([]);
  });

  test(`${subject.sentence} ${name}: the host is no second node in Chromium’s accessibility tree — the name and the description the product gives are the element’s that carries the role, once`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium gives a test its accessibility tree');
    await load(page, tag, subject.markup('aria-labelledby="named" aria-describedby="described" aria-current="page"'));
    // A modal surface leaves the rest of the page out of the tree, the stage and its own host too: read it from itself.
    const tree = subject.alone ? await axTree(page, '#subject', subject.path) : await axTree(page, '#stage');
    const dump = tree.join('\n');
    const named = subject.ownName || subject.owns.includes('aria-labelledby') ? 0 : (subject.namedNodes ?? 1);
    expect(tree.filter((line) => line.includes('"Named text"')), dump).toHaveLength(named);
    expect(tree.filter((line) => line.includes('Described text')), dump).toHaveLength(describes ? 1 : 0);
    expect(tree.filter((line) => /^\s*generic "[^"]|^\s*generic "[^"]*" \(/.test(line)), 'no node without a role has a name or a description').toEqual([]);
  });

  if (subject.ownName) {
    const ownName = subject.ownName;
    // The name a product gives reaches the element while the label is empty, unless the component owns it.
    const yields = !subject.owns.includes('aria-label');
    test(`${subject.sentence} ${name}: its own label is its whole name, over the product's aria-label and over its aria-labelledby${yields ? '; emptied, the product’s name is the name' : ''}`, async ({ page, browserName }) => {
      for (const given of ['aria-label="Product name"', 'aria-labelledby="named"']) {
        await load(page, tag, subject.markup(given));
        const element = exposedOn(page, subject.path);
        await expect(element, `${given}: the label is the name`).toHaveAccessibleName(ownName);
        const said = await read_(page, subject.path, ['aria-label'], subject.hostOwn);
        if (!subject.ownLabelledBy) expect(said.inner['aria-label'], 'the element says its own name').toBe(ownName);
        expect(said.labelledBy, 'and names no element of the product’s').toEqual(subject.ownLabelledBy ? ['headline'] : []);
        if (browserName === 'chromium') {
          const tree = subject.alone ? await axTree(page, '#subject', subject.path) : await axTree(page, '#stage');
          expect(tree.filter((line) => line.includes('Product name') || line.includes('"Named text"')), tree.join('\n')).toEqual([]);
        }
        if (!yields) continue;
        await page.evaluate((prop) => ((document.querySelector('#subject') as unknown as Record<string, string>)[prop] = ''), subject.nameProp ?? 'label');
        await settle(page);
        await expect(element, `${given}: label emptied, the product’s name is the name`).toHaveAccessibleName(given.startsWith('aria-label=') ? 'Product name' : 'Named text');
      }
    });
  }

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
    .filter((subject) => !subject.alone)
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

test('BTN-46 TXF-68: a Lit product’s property bindings (.ariaLabel, .ariaBusy, .ariaDescribedByElements) move as attributes do, and bound to nothing or null take the moved values away — on a control and on a composed field', async ({ page }) => {
  await load(page, 'tanrei-text-field', '<div id="lit"></div>');
  await page.addScriptTag({ content: lit() });
  const draw = (on: 'values' | 'nothing' | 'null') =>
    page.evaluate(
      async (on) => {
        type Lit = { html: (strings: TemplateStringsArray, ...values: unknown[]) => unknown; render: (value: unknown, into: Element) => void; nothing: unknown };
        const { html, render, nothing } = (window as unknown as { __lit: Lit }).__lit;
        const gone = on === 'nothing' ? nothing : null;
        const described = on === 'values' ? [document.querySelector('#described')] : gone;
        render(
          html`<tanrei-button id="subject" .ariaLabel=${on === 'values' ? 'Send the report' : gone} .ariaBusy=${on === 'values' ? 'true' : gone} .ariaDescribedByElements=${described}></tanrei-button
            ><tanrei-text-field id="field" label="Name" .ariaRequired=${on === 'values' ? 'true' : gone} .ariaDescribedByElements=${described}></tanrei-text-field>`,
          document.querySelector('#lit')!,
        );
        for (const element of document.querySelectorAll<HTMLElement & { updateComplete?: Promise<unknown> }>('#subject, #field')) await element.updateComplete;
      },
      on,
    );
  for (const off of ['nothing', 'null'] as const) {
    await draw('values');
    await settle(page);
    const button = await said(page, 'subject', ['button']);
    expect(button.host).toEqual(['data-aria-busy=true', 'data-aria-describedby=', 'data-aria-label=Send the report']);
    expect([button.label, button.busy, button.description]).toEqual(['Send the report', 'true', 'Described text']);
    const field = await said(page, 'field', ['tanrei-text-input', 'input']);
    expect(field.host).toEqual(['data-aria-describedby=', 'data-aria-required=true']);
    expect(field.required).toBe('true');
    expect(field.description).toContain('Described text');

    await draw(off);
    await settle(page);
    const gone = await said(page, 'subject', ['button']);
    expect(gone.host, `bound to ${off}, the moved values go`).toEqual([]);
    expect([gone.label, gone.busy, gone.description]).toEqual([null, null, '']);
    const fieldGone = await said(page, 'field', ['tanrei-text-input', 'input']);
    expect(fieldGone.host).toEqual([]);
    expect(fieldGone.required).toBeNull();
    expect(fieldGone.description).not.toContain('Described text');
  }
});

interface Unnamed {
  /** The id of the sentence that asks for the report of a missing name. */
  sentence: string;
  /** The control with `id="subject"` and no label; `rest` is where the product's name goes. */
  markup: (rest: string) => string;
  /** From the host down, one selector per shadow root: the element the name is exposed on (none: the host is it). */
  path: string[];
  /** What the report of the missing name says. */
  says: string;
  /** Another element of the same shadow root that the product's name reaches through the first (an open FAB menu's list, named by its toggle). */
  also?: string;
}

/** Controls whose report of a missing name counts the name the product gives on the element, as BTN-16 does. */
const UNNAMED: Record<string, Unnamed> = {
  'text-input': { sentence: 'TXI-23', markup: (rest) => `<tanrei-text-input id="subject" ${rest}></tanrei-text-input>`, path: ['input'], says: 'no accessible name' },
  checkbox: { sentence: 'CHK-16', markup: (rest) => `<tanrei-checkbox id="subject" ${rest}></tanrei-checkbox>`, path: ['input'], says: 'no accessible name' },
  'radio-button': {
    sentence: 'RAD-18',
    markup: (rest) => `<tanrei-radio-group label="Group"><tanrei-radio-button id="subject" value="a" ${rest}></tanrei-radio-button><tanrei-radio-button value="b" label="Beta"></tanrei-radio-button></tanrei-radio-group>`,
    path: ['input'],
    says: 'no accessible name',
  },
  switch: { sentence: 'SWT-16', markup: (rest) => `<tanrei-switch id="subject" ${rest}></tanrei-switch>`, path: ['input'], says: 'no accessible name' },
  slider: { sentence: 'SLD-19', markup: (rest) => `<tanrei-slider id="subject" value="40" ${rest}></tanrei-slider>`, path: ['[role="slider"]'], says: 'no accessible name' },
  select: { sentence: 'SEL-11', markup: (rest) => `<tanrei-select id="subject" ${rest}><tanrei-option value="a">Alpha</tanrei-option></tanrei-select>`, path: ['[role="combobox"]'], says: 'no accessible name' },
  'color-input': { sentence: 'CLI-11', markup: (rest) => `<tanrei-color-input id="subject" value="#0f766e" ${rest}></tanrei-color-input>`, path: ['input'], says: 'no accessible name' },
  'number-input': { sentence: 'NMI-12', markup: (rest) => `<tanrei-number-input id="subject" increment-label="More" decrement-label="Less" ${rest}></tanrei-number-input>`, path: ['input'], says: 'no accessible name' },
  combobox: { sentence: 'CMB-12', markup: (rest) => `<tanrei-combobox id="subject" ${rest}><tanrei-option value="a">Alpha</tanrei-option></tanrei-combobox>`, path: ['input'], says: 'no accessible name' },
  'one-time-code-input': { sentence: 'OTC-22', markup: (rest) => `<tanrei-one-time-code-input id="subject" ${rest}></tanrei-one-time-code-input>`, path: ['input'], says: 'no accessible name' },
  search: { sentence: 'SRC-27', markup: (rest) => `<tanrei-search id="subject" ${rest}></tanrei-search>`, path: ['input'], says: 'search field has no accessible name' },
  chip: { sentence: 'CHP-26', markup: (rest) => `<tanrei-chip id="subject" ${rest}></tanrei-chip>`, path: ['.container'], says: 'chip has no accessible name' },
  card: { sentence: 'CRD-14', markup: (rest) => `<tanrei-card id="subject" interactive ${rest}>Content</tanrei-card>`, path: ['.container'], says: 'has no label' },
  'copy-button': {
    sentence: 'CPY-17',
    markup: (rest) => `<tanrei-copy-button id="subject" value="a" icon-only copied-label="Copied" failed-label="Failed" ${rest}></tanrei-copy-button>`,
    path: ['tanrei-button', 'button'],
    says: 'icon-only button has no accessible name',
  },
  'main-action-button': { sentence: 'MAB-16', markup: (rest) => `<tanrei-main-action-button id="subject" ${rest}><span slot="icon">add</span></tanrei-main-action-button>`, path: ['button'], says: 'no accessible name' },
  'button-with-menu': {
    sentence: 'SPB-20',
    markup: (rest) => `<tanrei-button-with-menu id="subject" menu-label="More" ${rest}><tanrei-menu-item label="One"></tanrei-menu-item></tanrei-button-with-menu>`,
    path: ['button.leading'],
    says: 'leading half has no accessible name',
  },
  'fab-menu': {
    sentence: 'FBM-23',
    markup: (rest) =>
      `<tanrei-fab-menu id="subject" inline open ${rest}><span slot="icon">add</span><tanrei-fab-menu-item label="Edit" icon="edit"></tanrei-fab-menu-item><tanrei-fab-menu-item label="Mail" icon="mail"></tanrei-fab-menu-item></tanrei-fab-menu>`,
    path: ['button'],
    says: 'toggle and the list have no accessible name',
    also: '[role="menu"]',
  },
  // The host of a tab is the tab: the name is the host's own.
  tab: {
    sentence: 'TAB-22',
    markup: (rest) => `<tanrei-tabs label="Sections" value="a"><tanrei-tab id="subject" value="a" icon="home" ${rest}></tanrei-tab><tanrei-tab value="b" label="Beta"></tanrei-tab></tanrei-tabs>`,
    path: [],
    says: 'no accessible name',
  },
  'navigation-bar-item': {
    sentence: 'NVB-20',
    markup: (rest) =>
      `<tanrei-navigation-bar label="Main" value="b"><tanrei-navigation-bar-item id="subject" value="a" icon="home" ${rest}></tanrei-navigation-bar-item><tanrei-navigation-bar-item value="b" label="Mail" icon="mail"></tanrei-navigation-bar-item><tanrei-navigation-bar-item value="c" label="Chat" icon="chat"></tanrei-navigation-bar-item></tanrei-navigation-bar>`,
    path: ['[part="cell"]'],
    says: 'no accessible name',
  },
  'navigation-drawer-item': {
    sentence: 'NVD-24',
    markup: (rest) =>
      `<tanrei-navigation-drawer open label="Side" value="b"><tanrei-navigation-drawer-item id="subject" value="a" icon="home" ${rest}></tanrei-navigation-drawer-item><tanrei-navigation-drawer-item value="b" label="Mail" icon="mail"></tanrei-navigation-drawer-item></tanrei-navigation-drawer>`,
    path: ['[part="cell"]'],
    says: 'no accessible name',
  },
  'navigation-drawer-group': {
    sentence: 'NVD-46',
    markup: (rest) =>
      `<tanrei-navigation-drawer open label="Groups" value="b"><tanrei-navigation-drawer-group id="subject" icon="folder" open ${rest}><tanrei-navigation-drawer-item value="b" label="Atlas" icon="deployed_code"></tanrei-navigation-drawer-item></tanrei-navigation-drawer-group></tanrei-navigation-drawer>`,
    path: ['#row'],
    says: 'no accessible name',
  },
  dialog: { sentence: 'DLG-14', markup: (rest) => `<tanrei-dialog id="subject" open ${rest}>Words</tanrei-dialog>`, path: ['dialog'], says: 'no accessible name' },
  'modal-layer': { sentence: 'MDL-10', markup: (rest) => `<tanrei-modal-layer id="subject" open ${rest}>Words</tanrei-modal-layer>`, path: ['dialog'], says: 'no accessible name' },
  'side-sheet': { sentence: 'SSH-12', markup: (rest) => `<tanrei-side-sheet id="subject" variant="modal" open ${rest}>Words</tanrei-side-sheet>`, path: ['dialog'], says: 'no accessible name' },
  'bottom-sheet': { sentence: 'BSH-22', markup: (rest) => `<tanrei-bottom-sheet id="subject" variant="standard" open ${rest}>Words</tanrei-bottom-sheet>`, path: ['section'], says: 'no accessible name' },
  popover: { sentence: 'POP-29', markup: (rest) => `<button id="popover-anchor" type="button">Open</button><tanrei-popover id="subject" anchor="popover-anchor" open ${rest}>Words</tanrei-popover>`, path: ['[part="container"]'], says: 'no accessible name' },
  breadcrumbs: { sentence: 'BRC-1', markup: (rest) => `<tanrei-breadcrumbs id="subject" ${rest}><a href="#home">Home</a><span>Here</span></tanrei-breadcrumbs>`, path: ['nav'], says: 'no accessible name' },
  pagination: { sentence: 'PGN-1', markup: (rest) => `<tanrei-pagination id="subject" page="1" count="5" previous-label="Previous page" next-label="Next page" page-label="Page {page}" ${rest}></tanrei-pagination>`, path: ['nav'], says: 'no accessible name' },
  segment: {
    sentence: 'SEG-22',
    markup: (rest) => `<tanrei-segmented-button label="View"><tanrei-segment id="subject" value="a" ${rest}></tanrei-segment><tanrei-segment value="b" label="Beta"></tanrei-segment></tanrei-segmented-button>`,
    path: ['button'],
    says: 'has an empty label',
  },
  handle: { sentence: 'HDL-8', markup: (rest) => `<tanrei-handle id="subject" value="50" ${rest}></tanrei-handle>`, path: ['[role="separator"]'], says: 'no accessible name' },
  // A modal drawer is a dialog (NVD-23): the dialog takes the drawer's name.
  'navigation-drawer (modal)': {
    sentence: 'NVD-24',
    markup: (rest) => `<tanrei-navigation-drawer id="subject" variant="modal" open value="a" ${rest}><tanrei-navigation-drawer-item value="a" label="Home" icon="home"></tanrei-navigation-drawer-item></tanrei-navigation-drawer>`,
    path: ['dialog'],
    says: 'dialog without a name',
  },
};

/** The element the name is exposed on, from the host `#subject` down one selector per shadow root (Playwright's CSS goes through each). */
const exposedOn = (page: Page, path: string[]) => path.reduce((at, selector) => at.locator(selector).first(), page.locator('#subject'));

for (const [name, subject] of Object.entries(UNNAMED)) {
  test(`${subject.sentence} ${name}: with an empty label, the name the product gives the element — aria-label, or aria-labelledby naming an element — is its accessible name and nothing is reported missing; with neither, it is reported`, async ({ page }) => {
    const reported: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'warning' && message.text().includes(`(${subject.sentence})`) && message.text().includes(subject.says)) reported.push(message.text());
    });
    // What was reported since the page was loaded, after a turn for a report that would come late.
    const reports = async () => {
      await settle(page);
      return reported.splice(0);
    };
    const also = () => exposedOn(page, [...subject.path.slice(0, -1), subject.also!]);

    await load(page, 'tanrei-navigation-drawer', subject.markup(''));
    expect(await reports(), 'neither: the missing name is reported').not.toEqual([]);

    await load(page, 'tanrei-navigation-drawer', subject.markup('aria-label="Product name"'));
    await expect(exposedOn(page, subject.path)).toHaveAccessibleName('Product name');
    if (subject.also) await expect(also()).toHaveAccessibleName('Product name');
    expect(await reports(), 'aria-label: nothing is reported').toEqual([]);

    await load(page, 'tanrei-navigation-drawer', subject.markup('aria-labelledby="named"'));
    await expect(exposedOn(page, subject.path)).toHaveAccessibleName('Named text');
    if (subject.also) await expect(also()).toHaveAccessibleName('Named text');
    expect(await reports(), 'aria-labelledby: nothing is reported').toEqual([]);
  });
}

for (const [name, subject] of Object.entries(SUBJECTS).filter(([, each]) => each.alone)) {
  test(`${subject.sentence} ${name}: axe reports nothing on it with the aria-* the product gives it — its host carries none`, async ({ page }) => {
    await load(page, subject.tag ?? `tanrei-${name}`, `<main><h1>Controls</h1>${subject.markup('aria-describedby="described" aria-labelledby="named" aria-current="page" aria-invalid="true" aria-errormessage="error"')}</main>`);
    const result = await new AxeBuilder({ page }).include('#stage').analyze();
    expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' > ')).join(', ')}`)).toEqual([]);
  });
}

test('TBV-24 tab-view: linked to tabs placed elsewhere, the view draws no row, so the aria-* the product gives it reaches no element: it is moved all the same, reported once each in a debug build, and none reaches the linked tabs', async ({ page }) => {
  const reported: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning' && message.text().includes('(TBV-24)')) reported.push(message.text());
  });
  await load(
    page,
    'tanrei-tab-view',
    `<tanrei-tabs id="row" label="Sections" value="a"><tanrei-tab value="a" label="Alpha"></tanrei-tab><tanrei-tab value="b" label="Beta"></tanrei-tab></tanrei-tabs>
     <tanrei-tab-view id="subject" tabs="row" aria-describedby="described" aria-current="page"><tanrei-tab-panel value="a">A</tanrei-tab-panel><tanrei-tab-panel value="b">B</tanrei-tab-panel></tanrei-tab-view>`,
  );
  const said = await page.evaluate(() => {
    const host = document.querySelector('#subject')!;
    const row = document.querySelector('#row')!;
    const list = row.shadowRoot!.querySelector('[role="tablist"]')!;
    const attributes = (element: Element) => [...element.attributes].map((a) => a.name).filter((name) => name.includes('aria-')).sort();
    return { host: attributes(host), row: attributes(row), list: { current: list.getAttribute('aria-current'), describedby: list.getAttribute('aria-describedby') }, ownRow: !!host.querySelector('tanrei-tabs') };
  });
  expect(said.ownRow, 'linked: no row of its own').toBe(false);
  expect(said.host, 'moved, so the host is no second node').toEqual(['data-aria-current', 'data-aria-describedby']);
  expect(said.row, 'the linked tabs are not given it').toEqual([]);
  expect(said.list).toEqual({ current: null, describedby: null });
  expect(reported.filter((line) => line.includes('aria-current on the element reaches nothing'))).toHaveLength(1);
  expect(reported.filter((line) => line.includes('aria-describedby on the element reaches nothing'))).toHaveLength(1);
});

test('RGP-21 radio-group: its read-only state reaches the radio group through its field group as a product’s aria-readonly would, beside the product’s own ARIA, and leaves with it', async ({ page }) => {
  await load(page, 'tanrei-radio-group', SUBJECTS['radio-group']!.markup('readonly aria-describedby="described"'));
  const path = ['tanrei-field-group', '[role="radiogroup"]'];
  const first = await read_(page, path, ['aria-readonly']);
  expect(first.inner['aria-readonly']).toBe('true');
  expect(first.described).toBe('Described text');
  await page.evaluate(() => ((document.querySelector('#subject') as HTMLElement & { readOnly: boolean }).readOnly = false));
  await settle(page);
  const after = await read_(page, path, ['aria-readonly']);
  expect(after.inner['aria-readonly']).toBeNull();
  expect(after.described, 'the product’s description stays').toBe('Described text');
});

/** An element whose template draws the product's description on one element, then on another in its place. */
interface Redrawn {
  sentence: string;
  tag: string;
  markup: string;
  /** The elements it draws it on, the first before `turn`, the second after. */
  on: [string, string];
  /** The property that turns it from one to the other, and its two values. */
  turn: [string, unknown, unknown];
}

const REDRAWN: Record<string, Redrawn> = {
  // A part inside its template: the input in the place of the textarea.
  'text-input': { sentence: 'TXI-70', tag: 'tanrei-text-input', markup: '<tanrei-text-input id="subject" label="Text" aria-describedby="described"></tanrei-text-input>', on: ['input', 'textarea'], turn: ['multiline', false, true] },
  // The whole template: the navigation landmark in the place of the dialog.
  'navigation-drawer': { sentence: 'NVD-78', tag: 'tanrei-navigation-drawer', markup: SUBJECTS['navigation-drawer']!.markup('aria-describedby="described"'), on: ['nav[part="container"]', 'dialog'], turn: ['variant', 'standard', 'modal'] },
};

for (const [name, subject] of Object.entries(REDRAWN)) {
  test(`${subject.sentence} ${name}: an element its template no longer draws takes its copy of the product’s description with it, and a host taken out of the page and put back keeps its copy`, async ({ page }) => {
    await load(page, subject.tag, subject.markup);
    const said = () =>
      page.evaluate((on) => {
        const root = document.querySelector('#subject')!.shadowRoot!;
        const element = on.map((selector) => root.querySelector(selector)).find(Boolean)!;
        const described = (element.getAttribute('aria-describedby') ?? '')
          .split(/\s+/)
          .filter(Boolean)
          .map((id) => root.getElementById(id)?.textContent ?? '')
          .filter((text) => text === 'Described text')
          .join(' ');
        return { on: element.localName, described, copies: root.querySelectorAll('[id^="tanrei-described-"]').length };
      }, subject.on);
    const turn = async (value: unknown) => {
      await page.evaluate(([property, value]) => ((document.querySelector('#subject') as unknown as Record<string, unknown>)[property as string] = value), [subject.turn[0], value]);
      await settle(page);
    };
    const [first, second] = subject.on.map((selector) => selector.replace(/\[.*$/, ''));
    expect(await said()).toEqual({ on: first, described: 'Described text', copies: 1 });
    await turn(subject.turn[2]);
    expect(await said(), 'the first element’s copy went with it').toEqual({ on: second, described: 'Described text', copies: 1 });
    await turn(subject.turn[1]);
    expect(await said(), 'and back').toEqual({ on: first, described: 'Described text', copies: 1 });
    // Taken out of the page and put back, the element is drawn as it was, and its copy is back with it.
    await page.evaluate(() => {
      const host = document.querySelector('#subject')!;
      const parent = host.parentNode!;
      host.remove();
      parent.appendChild(host);
    });
    await settle(page);
    expect(await said(), 'put back').toEqual({ on: first, described: 'Described text', copies: 1 });
  });
}

test('TAB-22 TAB-62 tab: its host is the tab, and while its label is set the product’s aria-label and aria-labelledby on it are held, so that the label is its whole name; emptied, they are given back as written, and taking them away takes the held ones', async ({ page, browserName }) => {
  const markup = (rest: string) => `<tanrei-tabs label="Sections" value="a"><tanrei-tab id="subject" value="a" label="Alpha" ${rest}></tanrei-tab><tanrei-tab value="b" label="Beta"></tanrei-tab></tanrei-tabs>`;
  type Tab = HTMLElement & { label: string; ariaLabelledByElements: Element[] | null; ariaLabel: string | null };
  const host = () =>
    page.evaluate(() => {
      const tab = document.querySelector('#subject') as Tab;
      return { attributes: Object.fromEntries([...tab.attributes].filter((a) => a.name.includes('aria-label')).map((a) => [a.name, a.value])), labelledBy: (tab.ariaLabelledByElements ?? []).map((each) => each.id) };
    });
  const label = async (to: string) => {
    await page.evaluate((to) => ((document.querySelector('#subject') as Tab).label = to), to);
    await settle(page);
  };
  const tab = page.locator('#subject');

  await load(page, 'tanrei-tabs', markup('aria-label="Product name" aria-labelledby="named"'));
  await expect(tab, 'the label is the whole name').toHaveAccessibleName('Alpha');
  expect(await host(), 'held as their twins').toEqual({ attributes: { 'aria-label': 'Alpha', 'data-aria-label': 'Product name', 'data-aria-labelledby': 'named' }, labelledBy: [] });
  if (browserName === 'chromium') {
    const tree = await axTree(page, '#stage');
    expect(tree.filter((line) => line.includes('Product name') || line.includes('"Named text"')), tree.join('\n')).toEqual([]);
    expect(tree.filter((line) => /^\s*tab "Alpha"/.test(line)), tree.join('\n')).toHaveLength(1);
  }
  await label('');
  expect(await host(), 'emptied: given back as written').toEqual({ attributes: { 'aria-label': 'Product name', 'aria-labelledby': 'named' }, labelledBy: ['named'] });
  await expect(tab, 'the platform’s precedence: aria-labelledby').toHaveAccessibleName('Named text');
  await label('Gamma');
  expect(await host(), 'set again: held again').toEqual({ attributes: { 'aria-label': 'Gamma', 'data-aria-label': 'Product name', 'data-aria-labelledby': 'named' }, labelledBy: [] });
  await expect(tab).toHaveAccessibleName('Gamma');

  // Written while the label is set, and taken away while held: by the attribute, and by the property.
  await page.evaluate(() => {
    const element = document.querySelector('#subject') as Tab;
    element.setAttribute('aria-labelledby', 'other');
    element.ariaLabel = null;
  });
  await settle(page);
  expect(await host(), 'a new one held, and the aria-label taken away').toEqual({ attributes: { 'aria-label': 'Gamma', 'data-aria-labelledby': 'other' }, labelledBy: [] });
  await expect(tab).toHaveAccessibleName('Gamma');
  await page.evaluate(() => (document.querySelector('#subject') as Tab).removeAttribute('aria-labelledby'));
  await settle(page);
  expect(await host(), 'removeAttribute takes the held one away').toEqual({ attributes: { 'aria-label': 'Gamma' }, labelledBy: [] });

  // Elements given by the property are held, and given back by reference.
  await page.evaluate(() => ((document.querySelector('#subject') as Tab).ariaLabelledByElements = [document.querySelector('#named')!]));
  await settle(page);
  expect(await host(), 'elements held').toEqual({ attributes: { 'aria-label': 'Gamma', 'data-aria-labelledby': '' }, labelledBy: [] });
  await expect(tab).toHaveAccessibleName('Gamma');
  await label('');
  expect((await host()).labelledBy, 'given back by reference').toEqual(['named']);
  expect((await host()).attributes, 'and the tab’s own aria-label is gone').not.toHaveProperty('aria-label');
});

/** A host that carries its role itself and names itself, so that it holds the product's name while it does (`nameHost()`). */
interface Holding {
  /** The id of its spec's sentence that says so. */
  sentence: string;
  /** The page, with the subject `#subject`; `rest` is its own name's attribute (`label="Own"`) and the product's ARIA. */
  markup: (rest: string) => string;
  /** The attribute and the property its own name comes from, where it is not `label` (a callout's headline). */
  prop?: string;
  /** Its report of a missing name, where it has one: its id and what it says. */
  report?: { id: string; says: string };
}

const MENU = (item: string) => `<tanrei-menu open>${item}<tanrei-menu-item label="Copy"></tanrei-menu-item></tanrei-menu>`;
const TREE = `<ul><li data-value="a"><span>Alpha</span></li><li data-value="b"><span>Beta</span></li></ul>`;
const BOLD = `<tanrei-button label="Bold"><span slot="icon">format_bold</span></tanrei-button>`;

const HOLDING: Record<string, Holding> = {
  'loading-indicator': { sentence: 'LDG-18', markup: (rest) => `<tanrei-loading-indicator id="subject" show-delay="0" ${rest}></tanrei-loading-indicator>`, report: { id: 'LDG-10', says: 'no accessible name' } },
  'progress-indicator': { sentence: 'PRG-18', markup: (rest) => `<tanrei-progress-indicator id="subject" value="0.4" ${rest}></tanrei-progress-indicator>`, report: { id: 'PRG-15', says: 'no accessible name' } },
  meter: { sentence: 'MTR-16', markup: (rest) => `<tanrei-meter id="subject" value="0.4" ${rest}></tanrei-meter>`, report: { id: 'MTR-14', says: 'no accessible name' } },
  menubar: {
    sentence: 'MBR-48',
    markup: (rest) => `<tanrei-menubar id="subject" ${rest}><tanrei-menubar-menu label="File"><tanrei-menu-item label="New"></tanrei-menu-item></tanrei-menubar-menu></tanrei-menubar>`,
    report: { id: 'MBR-20', says: 'no accessible name' },
  },
  'menubar-item': {
    sentence: 'MBR-48',
    markup: (rest) => `<tanrei-menubar label="Application"><tanrei-menubar-menu label="File"><tanrei-menu-item label="New"></tanrei-menu-item></tanrei-menubar-menu><tanrei-menubar-item id="subject" ${rest}></tanrei-menubar-item></tanrei-menubar>`,
    report: { id: 'MBR-44', says: 'bar item has no accessible name' },
  },
  toolbar: { sentence: 'TBR-26', markup: (rest) => `<tanrei-toolbar id="subject" ${rest}>${BOLD}</tanrei-toolbar>`, report: { id: 'TBR-12', says: 'no accessible name' } },
  // A group the product names is a named group (TBR-26).
  'toolbar-group': { sentence: 'TBR-26', markup: (rest) => `<tanrei-toolbar label="Format"><tanrei-toolbar-group id="subject" ${rest}>${BOLD}</tanrei-toolbar-group></tanrei-toolbar>` },
  'button-group': { sentence: 'BGR-25', markup: (rest) => `<tanrei-button-group id="subject" ${rest}><tanrei-button>One</tanrei-button><tanrei-button>Two</tanrei-button></tanrei-button-group>` },
  stepper: {
    sentence: 'SPR-28',
    markup: (rest) => `<tanrei-stepper id="subject" value="a" ${rest}><tanrei-stepper-step value="a" label="Account"></tanrei-stepper-step><tanrei-stepper-step value="b" label="Payment"></tanrei-stepper-step></tanrei-stepper>`,
    report: { id: 'SPR-21', says: 'no accessible name' },
  },
  'segmented-button': {
    sentence: 'SEG-29',
    markup: (rest) => `<tanrei-segmented-button id="subject" ${rest}><tanrei-segment value="a" label="Alpha"></tanrei-segment><tanrei-segment value="b" label="Beta"></tanrei-segment></tanrei-segmented-button>`,
    report: { id: 'SEG-22', says: 'set has no accessible name' },
  },
  'navigation-bar': {
    sentence: 'NVB-34',
    markup: (rest) =>
      `<tanrei-navigation-bar id="subject" value="a" ${rest}><tanrei-navigation-bar-item value="a" label="Mail" icon="mail"></tanrei-navigation-bar-item><tanrei-navigation-bar-item value="b" label="Chat" icon="chat"></tanrei-navigation-bar-item></tanrei-navigation-bar>`,
  },
  // An image the product names is a named image (AVT-24, SWC-20).
  avatar: { sentence: 'AVT-24', markup: (rest) => `<tanrei-avatar id="subject" initials="AL" ${rest}></tanrei-avatar>`, report: { id: 'AVT-9', says: 'has no name' } },
  'avatar-group': {
    sentence: 'AVT-24',
    markup: (rest) => `<tanrei-avatar-group id="subject" ${rest}><tanrei-avatar label="Ada" initials="A"></tanrei-avatar><tanrei-avatar label="Grace" initials="G"></tanrei-avatar></tanrei-avatar-group>`,
    report: { id: 'AVT-19', says: 'without a group’s name' },
  },
  swatch: { sentence: 'SWC-20', markup: (rest) => `<tanrei-swatch id="subject" color="#0f766e" label-hidden ${rest}></tanrei-swatch>`, report: { id: 'SWC-12', says: 'without a name' } },
  'fab-menu-item': {
    sentence: 'FBM-28',
    markup: (rest) =>
      `<tanrei-fab-menu inline open label="Create"><span slot="icon">add</span><tanrei-fab-menu-item id="subject" icon="edit" ${rest}></tanrei-fab-menu-item><tanrei-fab-menu-item label="Mail" icon="mail"></tanrei-fab-menu-item></tanrei-fab-menu>`,
    report: { id: 'FBM-23', says: 'item has no accessible name' },
  },
  'menu-item': { sentence: 'MNU-65', markup: (rest) => MENU(`<tanrei-menu-item id="subject" ${rest}></tanrei-menu-item>`), report: { id: 'MNU-26', says: 'item has no accessible name' } },
  'menu-checkbox-item': { sentence: 'MNU-65', markup: (rest) => MENU(`<tanrei-menu-checkbox-item id="subject" ${rest}></tanrei-menu-checkbox-item>`), report: { id: 'MNU-26', says: 'item has no accessible name' } },
  submenu: { sentence: 'MNU-65', markup: (rest) => MENU(`<tanrei-submenu id="subject" ${rest}><tanrei-menu-item label="Deeper"></tanrei-menu-item></tanrei-submenu>`), report: { id: 'MNU-26', says: 'item has no accessible name' } },
  'menu-group': { sentence: 'MNU-65', markup: (rest) => MENU(`<tanrei-menu-group id="subject" ${rest}><tanrei-menu-item label="Cut"></tanrei-menu-item></tanrei-menu-group>`) },
  list: {
    sentence: 'LST-52',
    markup: (rest) => `<tanrei-list id="subject" selection="single" ${rest}><tanrei-list-item value="a" label="Alpha"></tanrei-list-item><tanrei-list-item value="b" label="Beta"></tanrei-list-item></tanrei-list>`,
    report: { id: 'LST-18', says: 'no accessible name' },
  },
  // While its label is empty, the product's name is the option's over the text of its content (LST-19).
  'list-item (option)': {
    sentence: 'LST-52',
    markup: (rest) => `<tanrei-list selection="single" label="Things"><tanrei-list-item id="subject" value="a" ${rest}>Alpha</tanrei-list-item><tanrei-list-item value="b">Beta</tanrei-list-item></tanrei-list>`,
  },
  callout: { sentence: 'CLO-32', prop: 'headline', markup: (rest) => `<tanrei-callout id="subject" open ${rest}>Body text</tanrei-callout>` },
  'tree-view': { sentence: 'TRV-54', markup: (rest) => `<tanrei-tree-view id="subject" ${rest}>${TREE}</tanrei-tree-view>`, report: { id: 'TRV-32', says: 'tree has no accessible name' } },
};

/** The naming attributes on the host `#subject`, held and not. */
const naming = (page: Page) =>
  page.evaluate(() => {
    const host = document.querySelector('#subject')!;
    return Object.fromEntries([...host.attributes].filter((a) => a.name.includes('aria-label')).map((a) => [a.name, a.value]));
  });

/** The warnings of a debug build that cite `id` and say `says`, from the page's console. */
function warnings(page: Page, id: string, says: string) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning' && message.text().includes(`(${id})`) && message.text().includes(says)) seen.push(message.text());
  });
  return async () => {
    await settle(page);
    return seen.splice(0);
  };
}

for (const [name, subject] of Object.entries(HOLDING)) {
  const prop = subject.prop ?? 'label';
  test(`${subject.sentence} ${name}: its host carries its role, and while its own name is set the product’s aria-label and aria-labelledby on it are held, so that its own is its whole name; emptied, they are given back as written and name it, not reported missing; taken away while held, they are gone`, async ({ page, browserName }) => {
    const host = page.locator('#subject');
    const own = async (to: string) => {
      await page.evaluate(([prop, to]) => ((document.querySelector('#subject') as unknown as Record<string, string>)[prop] = to), [prop, to]);
      await settle(page);
    };
    const reports = subject.report ? warnings(page, subject.report.id, subject.report.says) : null;

    await load(page, 'tanrei-list', subject.markup(`${prop}="Own" aria-label="Product name" aria-labelledby="named"`));
    await expect(host, 'its own name is its whole name').toHaveAccessibleName('Own');
    expect(await naming(page), 'the product’s are held as their twins').toEqual({ 'aria-label': 'Own', 'data-aria-label': 'Product name', 'data-aria-labelledby': 'named' });
    if (browserName === 'chromium') {
      const tree = await axTree(page, '#stage');
      expect(tree.filter((line) => line.includes('"Product name"') || line.includes('"Named text"')), tree.join('\n')).toEqual([]);
    }
    await own('');
    expect(await naming(page), 'emptied: given back as written').toEqual({ 'aria-label': 'Product name', 'aria-labelledby': 'named' });
    await expect(host, 'the platform’s precedence: aria-labelledby').toHaveAccessibleName('Named text');
    await own('Own');
    expect(await naming(page), 'set again: held again').toEqual({ 'aria-label': 'Own', 'data-aria-label': 'Product name', 'data-aria-labelledby': 'named' });
    await expect(host).toHaveAccessibleName('Own');
    await page.evaluate(() => {
      const element = document.querySelector('#subject') as HTMLElement;
      element.ariaLabel = null;
      element.removeAttribute('aria-labelledby');
    });
    await settle(page);
    expect(await naming(page), 'taken away while held, by the property and by the attribute').toEqual({ 'aria-label': 'Own' });
    await own('');
    expect(await naming(page), 'and nothing is given back').toEqual({});
    if (reports) await reports();

    // Named by the product alone from the start: the name is the product's, and nothing is reported missing.
    await load(page, 'tanrei-list', subject.markup('aria-label="Product name"'));
    await expect(host).toHaveAccessibleName('Product name');
    expect(await naming(page)).toEqual({ 'aria-label': 'Product name' });
    if (reports) expect(await reports(), 'named by the product: nothing is reported').toEqual([]);
    const result = await new AxeBuilder({ page }).include('#stage').analyze();
    expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' > ')).join(', ')}`)).toEqual([]);
    if (reports) {
      await load(page, 'tanrei-list', subject.markup(''));
      expect(await reports(), 'neither: the missing name is reported').not.toEqual([]);
    }
  });
}

/** A host that carries its role in one state and none in another, where a name would stand on nothing. */
interface Nameless {
  sentence: string;
  /** The page with the subject `#subject` in the state that carries no name; `rest` is the product's ARIA. */
  markup: (rest: string) => string;
  /** Puts it in the state in which it carries its role. */
  expose: string;
}

const NAMELESS: Record<string, Nameless> = {
  'loading-indicator (waiting)': { sentence: 'LDG-18', markup: (rest) => `<tanrei-loading-indicator id="subject" show-delay="100000" ${rest}></tanrei-loading-indicator>`, expose: '' },
  'avatar (decorative)': { sentence: 'AVT-24', markup: (rest) => `<tanrei-avatar id="subject" initials="AL" decorative ${rest}></tanrei-avatar>`, expose: 'decorative' },
  'swatch (its text drawn)': { sentence: 'SWC-20', markup: (rest) => `<tanrei-swatch id="subject" color="#0f766e" label="Teal" ${rest}></tanrei-swatch>`, expose: 'label' },
  'callout (closed)': { sentence: 'CLO-32', markup: (rest) => `<tanrei-callout id="subject" open="false" ${rest}>Body text</tanrei-callout>`, expose: 'open' },
  'menu (closed)': { sentence: 'MNU-65', markup: (rest) => `<tanrei-menu id="subject" ${rest}><tanrei-menu-item label="Cut"></tanrei-menu-item></tanrei-menu>`, expose: 'open' },
};

for (const [name, subject] of Object.entries(NAMELESS)) {
  test(`${subject.sentence} ${name}: with no role a name could stand on, the host holds the product’s name, and gives it back once it carries its role`, async ({ page }) => {
    await load(page, 'tanrei-list', subject.markup('aria-label="Product name"'));
    expect(await naming(page), 'held').toEqual({ 'data-aria-label': 'Product name' });
    const result = await new AxeBuilder({ page }).include('#stage').analyze();
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
    if (!subject.expose) return;
    await page.evaluate((expose) => {
      const element = document.querySelector('#subject') as unknown as Record<string, unknown>;
      if (expose === 'decorative') element.decorative = false;
      else if (expose === 'label') {
        element.label = '';
        element.labelHidden = true;
      } else element[expose] = true;
    }, subject.expose);
    await settle(page);
    expect(await naming(page), 'given back').toEqual({ 'aria-label': 'Product name' });
    await expect(page.locator('#subject')).toHaveAccessibleName('Product name');
  });
}

test('MNU-24 MNU-65 menu: an anchored menu is named by its anchor, over the product’s name, which it holds; closed, it still holds it', async ({ page }) => {
  await load(page, 'tanrei-menu', `<button id="opener" type="button">Open</button><tanrei-menu id="subject" anchor="opener" open aria-label="Product name" aria-labelledby="named"><tanrei-menu-item label="Cut"></tanrei-menu-item></tanrei-menu>`);
  const host = () =>
    page.evaluate(() => {
      const menu = document.querySelector('#subject')!;
      return Object.fromEntries([...menu.attributes].filter((a) => a.name.includes('aria-label')).map((a) => [a.name, a.value]));
    });
  await expect(page.locator('#subject')).toHaveAccessibleName('Open');
  expect(await host()).toEqual({ 'aria-labelledby': 'opener', 'data-aria-label': 'Product name', 'data-aria-labelledby': 'named' });
  await page.evaluate(() => ((document.querySelector('#subject') as HTMLElement & { open: boolean }).open = false));
  await settle(page);
  expect(await host(), 'closed: no name, the product’s held').toEqual({ 'data-aria-label': 'Product name', 'data-aria-labelledby': 'named' });
});

/** An element whose role is carried by its host in one mode and inside in another (LST-52, MNU-66). */
interface Moded {
  sentence: string;
  markup: (rest: string) => string;
  /** From the host down, the element that carries the role in the mode that moves. */
  path: string[];
  /** Turns the mode that moves on (true) or off (false). */
  mode: (element: HTMLElement & Record<string, unknown>, on: boolean) => void;
  /** Its own name in either mode. */
  own: string;
}

const MODED: Record<string, Moded> = {
  'list-item (interactive)': {
    sentence: 'LST-52',
    markup: (rest) => `<tanrei-list label="Things"><tanrei-list-item id="subject" interactive label="Own" ${rest}>Alpha</tanrei-list-item><tanrei-list-item interactive>Beta</tanrei-list-item></tanrei-list>`,
    path: ['[part="container"]'],
    mode: (element, on) => (element.interactive = on),
    own: 'Own',
  },
  'list-item (link)': {
    sentence: 'LST-52',
    markup: (rest) => `<tanrei-list label="Things"><tanrei-list-item id="subject" href="#a" label="Own" ${rest}>Alpha</tanrei-list-item><tanrei-list-item href="#b">Beta</tanrei-list-item></tanrei-list>`,
    path: ['[part="container"]'],
    mode: (element, on) => (on ? element.setAttribute('href', '#a') : element.removeAttribute('href')),
    own: 'Own',
  },
  'menu-item (link)': {
    sentence: 'MNU-66',
    markup: (rest) => MENU(`<tanrei-menu-item id="subject" href="#a" label="Own" ${rest}></tanrei-menu-item>`),
    path: ['[part="container"]'],
    mode: (element, on) => (on ? element.setAttribute('href', '#a') : element.removeAttribute('href')),
    own: 'Own',
  },
  'list (reorderable)': {
    sentence: 'LST-52',
    markup: (rest) => `<tanrei-list id="subject" reorderable label="Own" drag-handle-label="Move {label}" ${rest}><tanrei-list-item>Alpha</tanrei-list-item><tanrei-list-item>Beta</tanrei-list-item></tanrei-list>`,
    path: ['[part="items"]'],
    mode: (element, on) => (element.reorderable = on),
    own: 'Own',
  },
};

for (const [name, subject] of Object.entries(MODED)) {
  test(`${subject.sentence} ${name}: while the role is carried inside, the product’s aria-* on the host is moved to data-aria-* and exposed there, its own name over the product’s; out of that mode it is given back to the host, which carries its role, and moved again when the mode comes back`, async ({ page }) => {
    const carrier = () => exposedOn(page, subject.path);
    const host = page.locator('#subject');
    const aria = () =>
      page.evaluate(() => {
        const element = document.querySelector('#subject')!;
        return Object.fromEntries([...element.attributes].filter((a) => /^(data-)?aria-(label|describedby|invalid)/.test(a.name)).map((a) => [a.name, a.value]));
      });
    const mode = async (on: boolean) => {
      await host.evaluate(subject.mode, on);
      await settle(page);
    };
    await load(page, 'tanrei-list', subject.markup('aria-label="Product name" aria-describedby="described" aria-invalid="true"'));
    expect(await aria(), 'moved').toEqual({ 'data-aria-label': 'Product name', 'data-aria-describedby': 'described', 'data-aria-invalid': 'true' });
    await expect(carrier(), 'its own name is its whole name').toHaveAccessibleName(subject.own);
    await expect(carrier()).toHaveAccessibleDescription(/Described text/);
    // Out of the mode: given back, and the host — which carries its role now — holds the name under its own.
    await mode(false);
    expect(await aria(), 'given back').toMatchObject({ 'aria-describedby': 'described', 'aria-invalid': 'true' });
    expect(Object.keys(await aria()).filter((name) => name.startsWith('data-') && name !== 'data-aria-label'), 'nothing stays moved but a name the host holds').toEqual([]);
    await expect(host, 'the host carries the product’s description').toHaveAccessibleDescription(/Described text/);
    // Back in the mode: moved again, the host’s own name taken off it.
    await mode(true);
    expect(await aria(), 'moved again').toEqual({ 'data-aria-label': 'Product name', 'data-aria-describedby': 'described', 'data-aria-invalid': 'true' });
    await expect(carrier()).toHaveAccessibleName(subject.own);
    // Its own name emptied: the product’s.
    await host.evaluate((element) => ((element as unknown as { label: string }).label = ''));
    await settle(page);
    await expect(carrier(), 'emptied: the product’s name, over the text of its content').toHaveAccessibleName('Product name');
    const result = await new AxeBuilder({ page }).include('#stage').analyze();
    expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' > ')).join(', ')}`)).toEqual([]);
  });
}
