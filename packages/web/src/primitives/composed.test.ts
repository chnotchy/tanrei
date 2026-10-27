// The web's way of composing, tested once — over
// EVERY spec that takes a prop, an event or a slot from a member (`from`) and has an element, read resolved
// (`resolveFrom`, through the harness's `loadSpec`). A composed element's own test file adds only what its own spec
// adds; what a composed element is, is held here:
//
//   W13-1 declarations · W13-2 passing · W13-3 parts · W13-4 events and the value · W13-5 the form · W13-6 focus ·
//   W13-7 the twin · W13-8 reports
//
// and, before them, the primitives themselves: `exported()`, `FormSays`, `formOf()`, and the list of parts each class
// that can be a member keeps.
//
// **The next composed element adds one entry to `DRIVEN`** — how a person causes each of its events — and nothing else.
//
// A feature is built the same way (W14, last row) and is held here too. Where it has no value member and no frame member
// (the file upload: its control is the product's own trigger, and the form's value is its own state), the tests that
// need one — the value, the form, focus through the value member — are not defined for it, and its own test file holds
// those of its sentences; where a prop reaches members that are not one element of its shadow root (the file upload's
// file items, given through an internal channel), `DRIVEN` says how the prop is read; and where its spec's fixtures name
// no twin, `DRIVEN` writes one by hand for every fixture.
//
// Where the members that hold the value are the product's own children (a checkbox group's checkboxes, a radio group's
// radio buttons: `placed`) and the fixtures name twins, W13-7 compares the set and not one control: what the frame's
// own element says of the set, what each control of the set says of itself, in order, and — in Chromium — the two
// accessibility trees, which hold one group.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { forwards } from '../../../tools/src/from.js';
import { type Fixture, type MadeFileRow, type Spec, avatarPicture, fileUploadTwin, loadSpec, mountFixtures, tab, twinOf } from '../../test/harness.js';
import { axTree, insideHost } from '../../test/ax-tree.js';
import { decodePng } from '../../test/png.js';
import { exported } from './composed.js';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repo = path.resolve(pkg, '../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

interface Declared {
  name: string;
  tagName?: string;
  description?: string;
  cssParts?: { name: string; description?: string }[];
  slots?: { name: string; description?: string }[];
  events?: { name: string; description?: string; type?: { text: string } }[];
  members?: { kind: string; name: string; description?: string; type?: { text: string }; default?: string; attribute?: string; static?: boolean }[];
  attributes?: { name: string; fieldName?: string; description?: string; type?: { text: string }; default?: string }[];
}
const manifest = JSON.parse(read('custom-elements.json')) as { modules: { path: string; declarations?: Declared[] }[] };
const declarations = manifest.modules.flatMap((module) => (module.declarations ?? []).map((declaration) => ({ ...declaration, path: module.path })));
const declared = (tag: string) => declarations.find((declaration) => declaration.tagName === tag);

/** Every spec that forwards something and has an element on the web: the composed elements built this way. */
const COMPOSED: Spec[] = fs
  .readdirSync(path.join(repo, 'specs'))
  .filter((file) => file.endsWith('.spec.json'))
  .map((file) => file.replace('.spec.json', ''))
  .filter((name) => forwards(JSON.parse(fs.readFileSync(path.join(repo, `specs/${name}.spec.json`), 'utf8'))))
  .map(loadSpec)
  .filter((spec) => declared(spec.platforms.web.name));

type Forwarded = { name: string; type?: string; default?: unknown; from?: string; values?: string[] };
type Resolved = Spec & { props?: Forwarded[]; events?: { name: string; from?: string }[]; slots?: { name: string; from?: string; fixture?: string }[] | null; items?: unknown[] };

/** Where a forwarded entry is from: the member's spec name, its tag, and the entry's name there. */
const from = (entry: { from?: string }) => {
  const [component, name] = [entry.from!.slice(0, entry.from!.indexOf('.')), entry.from!.slice(entry.from!.indexOf('.') + 1)];
  const member = loadSpec(component);
  return { component, name, tag: member.platforms.web.name, property: member.platforms.web.props?.[name] ?? name };
};
const forwardedProps = (spec: Resolved) => (spec.props ?? []).filter((prop) => prop.from);
const property = (spec: Spec, name: string) => spec.platforms.web.props?.[name] ?? name;
/** The value member: the member the component's `value` is from. */
const valueMember = (spec: Resolved) => from(forwardedProps(spec).find((prop) => prop.name === 'value') ?? forwardedProps(spec).find((prop) => prop.from!.endsWith('.value'))!);
/** The frame member: the member the component's `label` is from. */
const frameMember = (spec: Resolved) => from(forwardedProps(spec).find((prop) => prop.name === 'label')!);

/**
 * What only the component knows: how a person causes each event of its spec, once, and what its value then is; and an
 * instance in which every exported part is drawn. `start` is run with the element in the page and nothing focused.
 */
interface Driven {
  /** Attributes of a plain instance, besides `id` and `name`: the frame member's and the value member's, as a product writes them one level down. */
  attributes: { frame: string; member: string };
  /** The children of a plain instance, where the element is not whole without one (the file upload's trigger). */
  children?: string;
  /**
   * W13-2, for props that are not a property of one member element of the shadow root: the instance they are read in,
   * and for each such prop the value given and what the members then draw of it — polled, since the members that take
   * it may be the product's own children, which the element's `updateComplete` does not wait for.
   */
  passing?: { attributes: string; children: string; given?: Record<string, unknown>; reads: Record<string, { given: unknown; read: (element: Locator) => Promise<unknown>; drawn: unknown }> };
  /**
   * For each event of the spec: what is set up unheard, the one act, and the element's value in every listener.
   * `bubbles: false` for an event that is composed and does not bubble, as the platform's own `toggle` (a select's or a
   * combobox's list opening): it is heard on the element and by capturing listeners above it, and by no bubbling one on an ancestor.
   */
  events: Record<string, { before?: (page: Page, element: Locator) => Promise<void>; act: (page: Page, element: Locator) => Promise<void>; value: unknown; detail?: unknown; bubbles?: false; /** The event is a member's own and leaves as it is, though the spec writes it whole and names no `from` (the chat composer's `input`). */ member?: boolean }>;
  /** A value the value member changes when it is given it, and what it keeps (W5). Only where the spec forwards `value`. */
  kept?: { given: unknown; kept: unknown };
  /** A value for the forms: the `value` attribute, and another the product sets later. Only where the spec forwards `value`. */
  values?: [string, string];
  /** What `value` reads as after a reset to the first of `values` and a restore of the second, where it is not the string itself (a number input's value is a number). */
  valuesRead?: [unknown, unknown];
  /**
   * Attributes, children and an act after which every exported part is drawn — or several such instances that draw
   * every part between them, where no one instance draws them all: two parts that are never drawn at once (W4, item 2:
   * a label the frame draws in one look and the control in another), or a layout that has a part another has not.
   * The instances stand in one page, and each act is given its own.
   */
  allParts: Instance | Instance[];
  /** Exported parts that no instance of the element can draw, each with why: held by the member's `exportparts` alone. */
  neverDrawn?: Record<string, string>;
  /** Whether Enter in the control presses the form's default button (W6, item 7). */
  enterSubmits?: boolean;
  /** The value member is never empty and so never invalid (a slider always has a value): the steps of W13-5 that empty a required control are not taken. */
  neverEmpty?: boolean;
  /** What the platform hands back to restore a value, where the value member's state is not the value itself (a slider's is its two values). */
  restoreState?: (value: string) => string;
  /**
   * A feature that forwards `value` and `label` from one member and still has no value member and no frame member
   * (the chat composer, W14: it sets its own form value, and its capsule is its own part): the tests of a value
   * member — the value read back, the form by hand, focus through the member — are not defined for it, and it holds
   * those of its own sentences in its own test file.
   */
  noValueMember?: boolean;
  /**
   * Events of the spec's names that are heard beside the one an act causes, and are not the element's: each with why.
   * (The chat composer's `input`: a file chosen in its file picker fires the browser's own composed `input` on the
   * picker's native file input, which the picker stops where it bubbles and a capturing listener on an ancestor still
   * hears.)
   */
  strays?: Record<string, string>;
  /** The fixtures that report by design (a fixture of missing words): W13-8 holds that they do, and that no other fixture does. */
  reporting?: string[];
  /**
   * W13-7 where the spec's fixtures name no twin: the twin of EVERY fixture, written by hand. `mount` adds its stage
   * (`data-twin-of`) to the page the fixture is mounted in; `control` is, as source, a function from a stage to the
   * native element a person operates; `tree` reads a stage's accessibility tree without what the element adds and its
   * twin cannot have (`ours`), and the twin's with what stands in its place there (`twin`), so that the rest is compared.
   */
  twin?: { mount: (page: Page, fixture: Fixture) => Promise<void>; control: string; tree: (stage: Locator, of: 'ours' | 'twin') => Promise<string> };
  /**
   * The members that hold the value are the product's own children, passed through a slot (W1: "a member the product
   * places stays the product's child"; a checkbox group's checkboxes, given as `children`), and the value is the
   * element's own: no prop of the spec is `from` a value member, so the tests of a value member are not defined for it
   * and its own test file holds what they hold, for its case.
   */
  placed?: {
    /** Props of the spec that are properties only, with no attribute. */
    propertyOnly: string[];
    /** Events the spec's web note names beside the spec's own. */
    events: string[];
    /** A member whose part is not named for its component: the anatomy id it is named by (W4, item 1). */
    parts: Record<string, string>;
    /**
     * Members that stand among the product's own children and nowhere in the shadow root (a radio group's radio
     * buttons): no part of the element is one, and none of their parts is exported — they are styled as anywhere.
     */
    light?: string[];
  };
  /**
   * W13-7 where the spec's fixtures name their twins and the element adds to the accessibility tree what its twin
   * cannot have (the chip field's list around its entries, CHF-21): a stage's tree without that, in place of the whole.
   */
  tree?: (stage: Locator, of: 'ours' | 'twin') => Promise<string>;
}
interface Instance {
  attributes: string;
  children: string;
  act?: (page: Page, element: Locator) => Promise<void>;
}
const focus = (element: Locator) => element.evaluate((el: HTMLElement) => el.focus());
/** A combobox field's options, as a product writes them: its own children. */
const CITIES = '<tanrei-option value="kyoto">Kyoto</tanrei-option><tanrei-option value="lisbon">Lisbon</tanrei-option><tanrei-option value="tokyo">Tokyo</tanrei-option>';
/** The file upload's trigger, as a product writes it. */
const TRIGGER = '<tanrei-button slot="trigger" variant="outlined">Choose files</tanrei-button>';
/** Chooses files in the browser's own picker, opened by the trigger of the file upload. */
async function chooseFiles(page: Page, element: Locator, files: { name: string; mimeType: string }[]) {
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), element.locator(':scope > [slot="trigger"]').click()]);
  await chooser.setFiles(files.map((file, index) => ({ ...file, buffer: Buffer.alloc(index + 1, 1) })));
}
/** Chooses files in the browser's own picker, opened by the attach button the chat composer brings. */
async function attachFiles(page: Page, element: Locator, files: { name: string; mimeType: string }[]) {
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), element.locator('[part~="attach-button"]').click()]);
  await chooser.setFiles(files.map((file, index) => ({ ...file, buffer: Buffer.alloc(index + 1, 1) })));
}
/** Sets props of the element and waits for its update. */
const give = (element: Locator, props: Record<string, unknown>) =>
  element.evaluate(async (el, given) => {
    Object.assign(el, given);
    await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
  }, props);
/**
 * FUP-24, FUP-25: the accessibility tree of a file upload's stage, or of its twin's, without what the file upload adds
 * and its twin cannot have — the group named by `label` around everything and the list of that name around the rows:
 * the file picker's tree, then each row's, where a row is the group named by its file (FIT-19), held by an item of a
 * List in the file upload and in its twin alike, and is one line here. (Each is read from its own element: a tree read from
 * the stage stops at the box around the rows, which is drawn for nothing so that a stray text among them is not.)
 */
async function fileUploadTree(stage: Locator, of: 'ours' | 'twin'): Promise<string> {
  // A row is the group named by its file in both: in the file upload a List's item holds it, as in its twin (FUP-25).
  const row = /^- group "(?:[^"\\]|\\.)*"(?=:|$)/;
  const rows = await stage.locator('tanrei-file-item').all();
  return [await stage.locator('tanrei-file-picker').ariaSnapshot(), ...(await Promise.all(rows.map(async (each) => (await each.ariaSnapshot()).replace(row, '- row'))))].join('\n');
}
/**
 * CHF-21: the accessibility tree of a chip field's stage, or of its twin's, line by line and without its nesting —
 * and, of the chip field's, without what it adds and its twin cannot have: the list named by the label around the
 * entries, and the item around each (one level down the chips stand in the box as themselves).
 */
async function chipFieldTree(stage: Locator, of: 'ours' | 'twin'): Promise<string> {
  const lines = (await stage.ariaSnapshot()).split('\n').map((line) => line.trim());
  return (of === 'ours' ? lines.filter((line) => !/^- list(item)?(?= |:|$)/.test(line)) : lines).join('\n');
}
const DRIVEN: Record<string, Driven> = {
  // The chip field: a Field, a Text input and a Chip for each entry. Its `value` is its own — the
  // list — and `inputValue` is its Text input's `value`; `change`, `check` and `reject` are its own events.
  'chip-field': {
    attributes: { frame: 'label="Recipients" supporting-text="Separate addresses with a comma."', member: 'type="email" remove-label="Remove {entry}" added-text="{entry} added" removed-text="{entry} removed" duplicate-text="That one is already in the list."' },
    // CHF-26: a type that is no type of an entry is answered by the chip field itself, so a type it has is given.
    passing: { attributes: '', children: '', given: { type: 'url' }, reads: {} },
    events: {
      input: { act: async (page, element) => (await focus(element), await page.keyboard.type('a')), value: [] },
      change: { before: async (page, element) => (await focus(element), await page.keyboard.type('a')), act: async (page) => page.keyboard.press('Enter'), value: ['a'] },
      // Asked before the entry is made: the list is still what it was.
      check: { before: async (page, element) => (await focus(element), await page.keyboard.type('a')), act: async (page) => page.keyboard.press('Enter'), value: [] },
      reject: {
        before: async (page, element) => (await element.evaluate((el: HTMLElement & { value: string[] }) => (el.value = ['a'])), await focus(element), await page.keyboard.type('a')),
        act: async (page) => page.keyboard.press('Enter'),
        value: ['a'],
      },
      // The Text input's own, on an empty typing part: its detail carries its text, and the element's value is the list.
      action: { act: async (page, element) => (await focus(element), await page.keyboard.press('Enter')), value: [], detail: '' },
    },
    // The label is the Field's row in the stacked look and the input's own in a floating one (FLD-25): two instances.
    allParts: [
      { attributes: `label="Recipients" supporting-text="Help" required required-text="Required" error error-text="Wrong" remove-label="Remove {entry}" value='["ada@example.com"]'`, children: '<span slot="label-icon">mail</span>' },
      { attributes: `variant="outlined" label="Recipients" required required-mark="asterisk" remove-label="Remove {entry}" value='["ada@example.com"]'`, children: '' },
    ],
    neverDrawn: {
      'clear-button': 'the chip field does not make its text input clearable: its entries are removed one by one (each chip\'s remove action), so the part is exported as the text input documents it',
      'reveal-button': 'the chip field\'s text input takes addresses and names, never a password, so it draws no reveal button; the part is exported as the text input documents it',
    },
    tree: chipFieldTree,
  },
  'one-time-code-field': {
    attributes: { frame: 'label="Verification code" supporting-text="Enter the 6-digit code we sent to your phone."', member: 'group-size="3"' },
    events: {
      input: { act: async (page, element) => (await focus(element), await page.keyboard.type('1')), value: '1' },
      complete: {
        before: async (_page, element) => element.evaluate((el: HTMLElement & { value: string }) => (el.value = '12345')),
        act: async (page, element) => (await focus(element), await page.keyboard.type('6')),
        value: '123456',
      },
      change: {
        before: async (page, element) => (await focus(element), await page.keyboard.type('1')),
        act: async (_page, element) => element.evaluate((el: HTMLElement) => el.blur()),
        value: '1',
      },
      action: { act: async (page, element) => (await focus(element), await page.keyboard.press('Enter')), value: '' },
    },
    kept: { given: 'ab 12-34 x', kept: '1234' },
    values: ['12', '3456'],
    allParts: {
      attributes: 'label="Verification code" supporting-text="Help" required required-text="Required" error error-text="Wrong" group-size="3" value="12"',
      children: '<span slot="label-icon">lock</span>',
      act: async (_page, element) => focus(element),
    },
    enterSubmits: true,
  },
  // The file upload: a feature of a file picker and file items. Its events are its own (FUP-57: its
  // file picker's two never leave it), it has no `value`, and what it gives every file item travels by the internal
  // channel — so each such prop is read through what a file item then draws.
  'file-upload': {
    attributes: { frame: 'label="Attachments"', member: 'multiple accept=".pdf" remove-label="Remove" type-error-text="Only PDF files can be added."' },
    children: TRIGGER,
    passing: {
      attributes: 'rows="given"',
      children: `<tanrei-file-item value="a" name="floor-plan.png" preview-src="${avatarPicture()}" status="error" error-text="The connection was lost." retryable></tanrei-file-item>`,
      // A list, as the member's type is: one entry it can read and one it cannot.
      given: { accept: ['.pdf', 'not a kind'] },
      reads: {
        itemForm: { given: 'tile', read: (element) => element.locator('tanrei-file-item .item').getAttribute('data-form'), drawn: 'tile' },
        itemPreview: { given: true, read: (element) => element.locator('tanrei-file-item .item').getAttribute('data-preview'), drawn: '' },
        itemFit: { given: 'contain', read: (element) => element.locator('tanrei-file-item .item').getAttribute('data-fit'), drawn: 'contain' },
        itemNameHidden: { given: true, read: (element) => element.locator('tanrei-file-item .headline').evaluate((el) => el.classList.contains('unseen')), drawn: true },
        itemWidth: { given: 200, read: async (element) => Math.round((await element.locator('tanrei-file-item .over').boundingBox())!.width), drawn: 200 },
        itemHeight: { given: 100, read: async (element) => Math.round((await element.locator('tanrei-file-item .over').boundingBox())!.height), drawn: 100 },
        removeLabel: { given: 'not-a-value-of-removeLabel', read: (element) => element.locator('tanrei-file-item .action.remove').getAttribute('aria-label'), drawn: 'not-a-value-of-removeLabel' },
        retryLabel: { given: 'not-a-value-of-retryLabel', read: (element) => element.locator('tanrei-file-item .action.retry').getAttribute('aria-label'), drawn: 'not-a-value-of-retryLabel' },
      },
    },
    events: {
      select: { act: (page, element) => chooseFiles(page, element, [{ name: 'brief.pdf', mimeType: 'application/pdf' }]), value: undefined },
      reject: { act: (page, element) => chooseFiles(page, element, [{ name: 'notes.txt', mimeType: 'text/plain' }]), value: undefined },
      change: {
        before: (page, element) => chooseFiles(page, element, [{ name: 'brief.pdf', mimeType: 'application/pdf' }]),
        act: async (_page, element) => element.locator('tanrei-file-item .action.remove').click(),
        value: undefined,
      },
      // FUP-59: while rows is given, a row lifted from its handle and dropped one place further on.
      move: {
        before: async (_page, element) =>
          element.evaluate(async (el) => {
            Object.assign(el, { rows: 'given', reorderable: true, dragHandleLabel: 'Reorder {label}' });
            el.insertAdjacentHTML('beforeend', '<tanrei-file-item value="a" name="a.pdf"></tanrei-file-item><tanrei-file-item value="b" name="b.pdf"></tanrei-file-item>');
            await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
          }),
        act: async (page, element) => {
          await element.locator('tanrei-list-item').first().locator('.handle').focus();
          await page.keyboard.press('Space');
          await page.keyboard.press('ArrowDown');
          await page.keyboard.press('Space');
        },
        value: undefined,
      },
    },
    allParts: [
      // The button layout: the text beside the trigger.
      { attributes: 'label="Attachment" empty-text="No file chosen" constraints-text="PDF, up to 10 MB"', children: TRIGGER },
      // The drop area: its container, its glyph and its prompt.
      { attributes: 'label="Attachments" layout="drop-area" drop-text="Drag files here, or choose them" constraints-text="PDF or PNG, up to 10 MB each"', children: TRIGGER },
      // Rows of its own: a real picture, kept and drawn, and a refused file with its mark and its sentence.
      {
        attributes: 'label="Photos" multiple item-preview accept="image/*" remove-label="Remove" type-error-text="Only pictures can be added."',
        children: TRIGGER,
        act: async (_page, element) => {
          await element.evaluate((el, picture) => {
            const bytes = Uint8Array.from(atob(picture.slice(picture.indexOf(',') + 1)), (c) => c.charCodeAt(0));
            (el as HTMLElement & { add(files: File[]): unknown }).add([new File([bytes], 'entrance.png', { type: 'image/png' }), new File([new Uint8Array(1)], 'brief.pdf', { type: 'application/pdf' })]);
          }, avatarPicture());
          await expect(element.locator('tanrei-file-item img[part="preview"]')).toHaveCount(1);
        },
      },
    ],
    neverDrawn: { 'item-progress': 'a row the file upload makes itself is never being sent (FUP-44: no status, no progress), and a product\'s own rows are styled as themselves' },
    // Two fixtures lack their words by design. `tiles-own` takes pictures alone (`accept`) and has no line of limits to
    // say so, which its file picker reports (FPK-18) — the fixture's own, and its twin's file picker says the same
    //.
    reporting: ['without-words', 'own-without-words', 'tiles-own'],
    twin: {
      mount: async (page, fixture) => {
        const stage = page.locator(`[data-fixture="${fixture.id}"]`);
        // FUP-44, FUP-45: what the rows it made say, written by hand on the twin's.
        const made = await stage.locator('tanrei-file-upload').evaluate((el) =>
          [...el.shadowRoot!.querySelectorAll('tanrei-file-item')].map((row) => {
            const { name, mediaType, sizeText, status, errorText } = row as unknown as MadeFileRow;
            return { name, mediaType, sizeText, status, errorText };
          }),
        );
        await stage.evaluate((el, markup) => el.insertAdjacentHTML('afterend', markup), fileUploadTwin(fixture, made));
      },
      // The trigger: the native button inside the product's own Button.
      control: `(stage) => stage.querySelector('[slot="trigger"]').shadowRoot.querySelector('button')`,
      tree: fileUploadTree,
    },
  },
  // The slider field: a Field and a Slider. Its value is a number and is never empty, so it is never
  // invalid; a key on the handle is one change, an `input` and then a `change`; and what the platform restores it from
  // is the Slider's two values. The range of W13-2 is named at both handles, so that neither member has a case to report.
  'slider-field': {
    attributes: { frame: 'label="Volume" supporting-text="Applies to alerts and media."', member: 'min="0" max="100"' },
    passing: { attributes: 'start-label="Lowest volume" end-label="Highest volume"', children: '', reads: {} },
    events: {
      input: { before: async (_page, element) => element.evaluate((el: HTMLElement & { value: number }) => void (el.value = 40)), act: async (page, element) => (await focus(element), await page.keyboard.press('ArrowRight')), value: 41 },
      change: { before: async (_page, element) => element.evaluate((el: HTMLElement & { value: number }) => void (el.value = 40)), act: async (page, element) => (await focus(element), await page.keyboard.press('ArrowRight')), value: 41 },
    },
    // A slider keeps the number it is given, and draws and exposes it within its scale (SLD-22).
    kept: { given: 37.5, kept: 37.5 },
    values: ['40', '60'],
    neverEmpty: true,
    restoreState: (value) => `0 ${value}`,
    allParts: {
      attributes: 'label="Volume" supporting-text="Help" required required-text="Required" error error-text="Wrong" step="25" stops value="50" value-indicator="always"',
      children: '<span slot="label-icon">volume_up</span>',
    },
  },
  // The chat composer: a feature of an embedded text input, a file picker, file items and Buttons,
  // around a capsule of its own. It forwards `value` and `label` from its typing area and has no value member (W14):
  // it sets its own form value. Its events are its own — but `input`, which is the typing area's and leaves as it is —
  // and its file picker's two never leave it. It has no twin that is a picture: its own
  // test file compares each member, box for box.
  'chat-composer': {
    attributes: { frame: 'label="Message" send-label="Send"', member: 'placeholder="Write a message" accept=".pdf" attach-label="Attach files" remove-label="Remove" type-error-text="Only PDF files can be added."' },
    noValueMember: true,
    passing: {
      attributes: 'attachments="given" retry-label="Try again"',
      children: `<tanrei-file-item value="a" name="floor-plan.png" status="error" error-text="The connection was lost." retryable></tanrei-file-item>`,
      // A list, as the member's type is: one entry it can read and one it cannot.
      given: { accept: ['.pdf', 'not a kind'] },
      reads: {
        removeLabel: { given: 'not-a-value-of-removeLabel', read: (element) => element.locator('tanrei-file-item .action.remove').getAttribute('aria-label'), drawn: 'not-a-value-of-removeLabel' },
        retryLabel: { given: 'not-a-value-of-retryLabel', read: (element) => element.locator('tanrei-file-item .action.retry').getAttribute('aria-label'), drawn: 'not-a-value-of-retryLabel' },
      },
    },
    events: {
      input: { act: async (page, element) => (await focus(element), await page.keyboard.type('a')), value: 'a', member: true },
      send: { before: async (page, element) => (await focus(element), await page.keyboard.type('a')), act: async (page) => page.keyboard.press('Enter'), value: 'a' },
      stop: { before: (_page, element) => give(element, { sending: true, stoppable: true, stopLabel: 'Stop' }), act: async (_page, element) => element.locator('[part~="stop-button"]').click(), value: '' },
      sendableChange: { act: async (page, element) => (await focus(element), await page.keyboard.type('a')), value: 'a' },
      sendBlocked: {
        before: async (page, element) => (await give(element, { blocked: true }), await focus(element), await page.keyboard.type('a')),
        act: async (page) => page.keyboard.press('Enter'),
        value: 'a',
      },
      select: { before: (_page, element) => give(element, { attachments: 'own' }), act: (page, element) => attachFiles(page, element, [{ name: 'brief.pdf', mimeType: 'application/pdf' }]), value: '' },
      reject: { before: (_page, element) => give(element, { attachments: 'own' }), act: (page, element) => attachFiles(page, element, [{ name: 'notes.txt', mimeType: 'text/plain' }]), value: '' },
      attachmentsChange: { before: (_page, element) => give(element, { attachments: 'own' }), act: (page, element) => attachFiles(page, element, [{ name: 'brief.pdf', mimeType: 'application/pdf' }]), value: '' },
    },
    allParts: [
      // The capsule with its counter, the typing area, the attach and the send button, and a strip of its own: a real
      // picture, kept and drawn as a tile, and a refused file with its mark and its sentence.
      {
        attributes: 'label="Message" send-label="Send" counter max-length="20" value="Hello" attachments="own" accept="image/*" attach-label="Attach files" remove-label="Remove" type-error-text="Only pictures can be added."',
        children: '',
        act: async (_page, element) => {
          await element.evaluate((el, picture) => {
            const bytes = Uint8Array.from(atob(picture.slice(picture.indexOf(',') + 1)), (c) => c.charCodeAt(0));
            (el as HTMLElement & { addFiles(files: File[]): unknown }).addFiles([new File([bytes], 'entrance.png', { type: 'image/png' }), new File([new Uint8Array(1)], 'brief.pdf', { type: 'application/pdf' })]);
          }, avatarPicture());
          await expect(element.locator('tanrei-file-item img[part="preview"]')).toHaveCount(1);
        },
      },
      // The stop button, in the send button's place.
      { attributes: 'label="Message" stop-label="Stop" sending stoppable', children: '' },
    ],
    neverDrawn: {
      'picker-container': 'its file picker is in the button layout, which draws nothing but its trigger (FPK-2)',
      'picker-icon': 'its file picker is in the button layout, which draws nothing but its trigger (FPK-2)',
      'picker-label': 'its file picker is in the button layout, which draws nothing but its trigger (FPK-2)',
      'picker-supporting-text': 'its file picker is given no line of limits: the chat composer has none to give',
      'picker-selection-text': 'its file picker is given no text of what is chosen: the strip shows it',
      'item-progress': 'a File item the chat composer draws itself is never being sent (CCM-22: its status is pending or error), and a product\'s own items are styled as themselves',
    },
    strays: { input: 'a file chosen in the file picker fires the browser\'s own input on its native file input, which a capturing listener hears' },
    // `without-words` lacks its words by design. `attachments-refused` takes two kinds alone (`accept`) and its file
    // picker has no line of limits to say so, which it reports (FPK-18): the chat composer has no prop to give one
    //.
    reporting: ['without-words', 'attachments-refused'],
  },
  'text-field': {
    attributes: { frame: 'label="Email" supporting-text="We never share your address."', member: 'placeholder="you@example.com"' },
    passing: {
      attributes: '',
      children: '',
      reads: {
        // The text input hides a shown value while it is disabled (TXI-72), and the props before this one have disabled
        // it: `revealed` is given again to an enabled password field, and read on the input.
        revealed: {
          given: true,
          read: (element) =>
            element.evaluate(async (el) => {
              const field = el as HTMLElement & { disabled: boolean; type: string; revealed: boolean; updateComplete: Promise<unknown> };
              Object.assign(field, { disabled: false, type: 'password' });
              await field.updateComplete;
              field.revealed = true;
              await field.updateComplete;
              return (el.shadowRoot!.querySelector('tanrei-text-input') as unknown as { revealed: boolean }).revealed;
            }),
          drawn: true,
        },
      },
    },
    events: {
      input: { act: async (page, element) => (await focus(element), await page.keyboard.type('a')), value: 'a' },
      change: {
        before: async (page, element) => (await focus(element), await page.keyboard.type('a')),
        act: async (_page, element) => element.evaluate((el: HTMLElement) => el.blur()),
        value: 'a',
      },
      action: { act: async (page, element) => (await focus(element), await page.keyboard.press('Enter')), value: '' },
      // A date field with its picker button: the button asks, and changes nothing.
      pickerRequest: {
        before: async (_page, element) => element.evaluate((el: HTMLElement) => Object.assign(el, { type: 'date', picker: true, pickerLabel: 'Choose date' })),
        act: async (_page, element) => element.locator('[part~="picker-button"]').click(),
        value: '',
      },
      // A date field left half-filled: the commit raises the entry error, and the value stays empty.
      entryError: {
        before: async (_page, element) => element.evaluate((el: HTMLElement) => Object.assign(el, { type: 'date', locale: 'en-US' })),
        act: async (page, element) => (await focus(element), await page.keyboard.type('9'), await element.evaluate((el: HTMLElement) => el.blur())),
        value: '',
      },
      // A multi-line field resized by hand: a step of its input's handle shows one line more (TXI-41, TXI-69), and the
      // value does not change.
      resizeEnd: {
        before: async (_page, element) => element.evaluate((el: HTMLElement) => Object.assign(el, { multiline: true, resize: 'manual', resizeLabel: 'Resize' })),
        act: async (page, element) => (await element.locator('.resize-handle .container').focus(), await page.keyboard.press('ArrowDown')),
        value: '',
      },
      // A password field's reveal button shows the value (TXI-72): the value does not change.
      revealChange: {
        before: async (_page, element) => element.evaluate((el: HTMLElement) => Object.assign(el, { type: 'password', revealable: true, revealLabel: 'Show password', value: 'pw' })),
        act: async (_page, element) => element.locator('[part~="reveal-button"]').click(),
        value: 'pw',
      },
    },
    // A text input keeps a text as it is given (a date input that is given no ISO date keeps none: text-field.test.ts).
    kept: { given: 'Ada  Lovelace ', kept: 'Ada  Lovelace ' },
    values: ['ada@example.com', 'grace@example.com'],
    // The label is the Field's row in the stacked look and the input's own in a floating one (FLD-25): two instances.
    allParts: [
      {
        attributes: 'label="Notes" supporting-text="Help" required required-text="Required" error error-text="Wrong" counter maxlength="40" multiline resize="manual" resize-label="Resize" prefix-text="$" suffix-text="USD" value="a"',
        children: '<span slot="label-icon">notes</span><span slot="leading-icon">search</span><span slot="trailing-icon">close</span>',
      },
      { attributes: 'variant="outlined" type="date" picker picker-label="Choose date" label="Start date" required required-mark="asterisk" value="2026-09-27"', children: '' },
      // The clear button is drawn by a single-line field with a value (TXI-71), the reveal button by a password field (TXI-72).
      { attributes: 'type="password" label="Password" clearable clear-label="Clear" revealable reveal-label="Show password" value="a"', children: '' },
    ],
    enterSubmits: true,
  },
  'checkbox-group': {
    attributes: { frame: 'label="Notify me by" supporting-text="Choose all that apply."', member: '' },
    children: '<tanrei-checkbox value="email" label="Email"></tanrei-checkbox><tanrei-checkbox value="text" label="Text message"></tanrei-checkbox>',
    events: { change: { act: async (_page, element) => element.locator('tanrei-checkbox').first().click(), value: ['email'] } },
    allParts: { attributes: 'label="Notify me by" supporting-text="Help" required required-text="Required" error error-text="Wrong" select-all-label="All of these"', children: '<tanrei-checkbox value="email" label="Email" checked></tanrei-checkbox>' },
    enterSubmits: false,
    placed: { propertyOnly: ['value'], events: ['input'], parts: { checkbox: 'select-all' } },
  },
  // The combobox field: its options are its own children, which reach the combobox through a slot.
  // `toggle` is composed and does not bubble. `value` is the committed choice: it does not move while a person types.
  'combobox-field': {
    attributes: { frame: 'label="City" supporting-text="Where the order is sent."', member: 'placeholder="Type a city"' },
    children: CITIES,
    events: {
      input: { act: async (page, element) => (await focus(element), await page.keyboard.type('k')), value: '' },
      // Typing made the first match the active option: Enter chooses it.
      change: {
        before: async (page, element) => (await focus(element), await page.keyboard.type('kyo')),
        act: async (page) => page.keyboard.press('Enter'),
        value: 'kyoto',
      },
      toggle: { act: async (page, element) => (await focus(element), await page.keyboard.press('ArrowDown')), value: '', bubbles: false },
      action: { act: async (page, element) => (await focus(element), await page.keyboard.press('Enter')), value: '' },
    },
    // A combobox keeps a value as it is given, whether or not an option names it.
    kept: { given: 'tokyo', kept: 'tokyo' },
    values: ['tokyo', 'kyoto'],
    // The label is the Field's row in the stacked look and the combobox's own in a floating one (FLD-25): two instances.
    allParts: [
      {
        attributes: 'label="City" supporting-text="Help" required required-text="Required" error error-text="Wrong" value="tokyo" clearable clear-label="Clear" open inline status-text="2 shown" separation="divider"',
        children:
          '<span slot="label-icon">place</span><span slot="leading-icon">search</span><tanrei-option value="kyoto" supporting-text="Japan" leading-icon="location_on">Kyoto</tanrei-option><tanrei-option-group label="More"><tanrei-option value="tokyo">Tokyo</tanrei-option></tanrei-option-group>',
      },
      { attributes: 'variant="filled" label="City" required required-mark="asterisk" value="tokyo"', children: CITIES },
    ],
    enterSubmits: true,
  },
  // The color field: a Field around a color input. The browser's own picker is not opened by a test.
  'color-field': {
    attributes: { frame: 'label="Brand color" supporting-text="Six hexadecimal digits, like #0f766e."', member: 'invalid-text="Enter six hexadecimal digits."' },
    events: {
      // One edit that makes the text a color: a paste. (An edit that leaves the value as it was says nothing to the
      // element's listeners — color-input.test.ts, CLI-17.)
      input: { act: async (page, element) => (await focus(element), await page.keyboard.insertText('0f766e')), value: '#0f766e' },
      change: {
        before: async (page, element) => (await focus(element), await page.keyboard.insertText('0f766e')),
        act: async (_page, element) => element.evaluate((el: HTMLElement) => el.blur()),
        value: '#0f766e',
      },
      // The picker button asks, and changes nothing.
      pickerRequest: {
        before: async (page, element) => {
          await page.evaluate(() => Object.defineProperty(HTMLInputElement.prototype, 'showPicker', { configurable: true, writable: true, value() {} }));
          await element.evaluate((el: HTMLElement) => Object.assign(el, { picker: true, pickerLabel: 'Choose color' }));
        },
        act: async (_page, element) => element.locator('[part~="picker-button"]').click(),
        value: '',
      },
      // A text that is not a color, committed as focus leaves: the entry error, and the value stays empty.
      entryError: {
        before: async (page, element) => (await focus(element), await page.keyboard.insertText('teal')),
        act: async (_page, element) => element.evaluate((el: HTMLElement) => el.blur()),
        value: '',
      },
    },
    // A color input holds a color in the value's own form (CLI-21).
    kept: { given: '0F766E', kept: '#0f766e' },
    values: ['#0f766e', '#fde047'],
    // The label is the Field's row in the stacked look and the input's own in a floating one (FLD-25): two instances.
    allParts: [
      { attributes: 'label="Brand color" supporting-text="Help" required required-text="Required" error error-text="Wrong" value="#0f766e" picker picker-label="Choose color"', children: '<span slot="label-icon">format_paint</span>' },
      { attributes: 'variant="filled" label="Brand color" required required-mark="asterisk" value="#0f766e"', children: '' },
    ],
    enterSubmits: true,
  },
  // The number field: a Field around a number input. Its value is a number, or null while it holds none.
  'number-field': {
    attributes: { frame: 'label="Quantity" supporting-text="Up to 99 per order."', member: 'min="1" max="99" increment-label="Increase" decrement-label="Decrease"' },
    events: {
      // A step: `input` carries the stepped number, which is the value already (typing says what the text reads as, and commits nothing).
      input: { act: async (page, element) => (await focus(element), await page.keyboard.press('ArrowUp')), value: 1 },
      change: {
        before: async (page, element) => (await focus(element), await page.keyboard.type('4')),
        act: async (_page, element) => element.evaluate((el: HTMLElement) => el.blur()),
        value: 4,
      },
      action: { act: async (page, element) => (await focus(element), await page.keyboard.press('Enter')), value: null },
      // A text that is not a number, committed: the entry error is raised, and the value is empty.
      entryError: {
        before: async (page, element) => (await focus(element), await page.keyboard.type('x')),
        act: async (_page, element) => element.evaluate((el: HTMLElement) => el.blur()),
        value: null,
      },
    },
    // A number input keeps a number as it is given: limits and digits apply to what a person commits (NMI-30).
    kept: { given: 120.5, kept: 120.5 },
    values: ['12', '34'],
    valuesRead: [12, 34],
    // The label is the Field's row in the stacked look and the input's own in a floating one (FLD-25): two instances.
    allParts: [
      {
        attributes: 'label="Amount" supporting-text="Help" required required-text="Required" error error-text="Wrong" prefix-text="$" suffix-text="USD" value="1" increment-label="Increase" decrement-label="Decrease"',
        children: '<span slot="label-icon">timer</span>',
      },
      { attributes: 'variant="filled" label="Amount" required required-mark="asterisk" value="1" increment-label="Increase" decrement-label="Decrease"', children: '' },
    ],
    enterSubmits: true,
  },
  // The select field: a Field around a select. Its options are the product's children, which reach the
  // select through the default slot; `toggle` leaves composed and does not bubble.
  'select-field': {
    attributes: { frame: 'label="Country" supporting-text="Where your invoices are addressed."', member: 'placeholder="Choose a country"' },
    children: '<tanrei-option value="ca">Canada</tanrei-option><tanrei-option value="fr">France</tanrei-option><tanrei-option value="jp">Japan</tanrei-option>',
    events: {
      // Enter opens the list with the first option active; Enter again chooses it, and the list closes (`toggle` follows).
      change: {
        before: async (page, element) => (await focus(element), await page.keyboard.press('Enter')),
        act: async (page) => page.keyboard.press('Enter'),
        value: 'ca',
      },
      toggle: { act: async (page, element) => (await focus(element), await page.keyboard.press('Enter')), value: '', bubbles: false },
    },
    // A select keeps a value that names no option as it was given (SEL-17).
    kept: { given: 'not an option', kept: 'not an option' },
    values: ['ca', 'jp'],
    // The label is the Field's row in the stacked look and the select's own in a floating one (FLD-25): two instances.
    allParts: [
      {
        attributes: 'label="Time zone" supporting-text="Help" required required-text="Required" error error-text="Wrong" value="Asia/Tokyo" separation="divider" open',
        children:
          '<span slot="label-icon">schedule</span><span slot="leading-icon">public</span><tanrei-option-group label="Asia"><tanrei-option value="Asia/Tokyo" leading-icon="schedule" supporting-text="UTC+9">Tokyo</tanrei-option></tanrei-option-group><tanrei-option-group label="Europe"><tanrei-option value="Europe/Lisbon">Lisbon</tanrei-option></tanrei-option-group>',
      },
      { attributes: 'variant="outlined" label="Country" required required-mark="asterisk" placeholder="Choose a country"', children: '<tanrei-option value="jp">Japan</tanrei-option>' },
      // The clear button is drawn while a value is chosen (SEL-72).
      { attributes: 'label="Country" clearable clear-label="Clear" value="jp"', children: '<tanrei-option value="jp">Japan</tanrei-option>' },
    ],
    neverDrawn: { counter: 'a select keeps no count (SEL-63), so the select field gives its Field none; the part is exported as the Field documents it' },
  },
  'radio-group': {
    attributes: { frame: 'label="Delivery" supporting-text="You can change this until the order ships."', member: '' },
    children: '<tanrei-radio-button value="standard" label="Standard"></tanrei-radio-button><tanrei-radio-button value="express" label="Express"></tanrei-radio-button>',
    events: { change: { act: async (_page, element) => element.locator('tanrei-radio-button').first().click(), value: 'standard' } },
    allParts: { attributes: 'label="Delivery" supporting-text="Help" required required-text="Required" error error-text="Wrong"', children: '<tanrei-radio-button value="standard" label="Standard"></tanrei-radio-button>' },
    enterSubmits: false,
    placed: { propertyOnly: [], events: ['input'], parts: {}, light: ['radio-button'] },
  },
};

const document_ = (body: string, head = '') => `<!doctype html>
<html lang="en" data-tanrei-theme="light"><head><meta charset="utf-8" /><style>${read('dist/tokens.css')}</style>${head}</head>
<body>${body}<script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`;
async function mount(page: Page, body: string, tag: string, head = '') {
  await page.setContent(document_(body, head));
  await page.waitForFunction((t) => !!customElements.get(t), tag);
  await settle(page);
}
/** Every element of the page, through shadow roots, has updated. */
const settle = (page: Page) =>
  page.evaluate(async () => {
    const all = (root: Document | ShadowRoot | Element): Element[] => [...root.querySelectorAll('*')].flatMap((el) => [el, ...(el.shadowRoot ? all(el.shadowRoot) : [])]);
    for (let round = 0; round < 3; round++) await Promise.all(all(document).map((el) => (el as Element & { updateComplete?: Promise<unknown> }).updateComplete));
  });
/** The focused element's tag at each level: the document's, then each shadow root's inside it. */
const focusPath = (page: Page) =>
  page.evaluate(() => {
    const path: string[] = [];
    for (let at: Element | null = document.activeElement; at; at = at.shadowRoot?.activeElement ?? null) path.push(at.localName + (at.id ? `#${at.id}` : ''));
    return path;
  });
/**
 * A debug report that is about the composed element or its members. That the active design system leaves a value out
 * is said of a fixture that draws such a value — under the composed element, for the member it draws, and by its twin
 * alike — and is not a case a composed element cannot be in.
 */
const reports = (seen: string[]) => seen.filter((text) => text.includes('[tanrei]') && !text.includes('is left out of the active design system'));
function warnings(page: Page) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error') seen.push(message.text());
  });
  return seen;
}

// ─── The primitives ──────────────────────────────────────────────────────────────────────────────────────────────

test.describe('the primitives of a composed element', () => {
  test('exported(): a member\'s parts as an exportparts value — under their own names, and for a name two members share, the prefixed name always and the bare name only where it is asked (W4)', () => {
    const member = { parts: ['label', 'label-icon', 'supporting-text'] };
    expect(exported(member)).toEqual({ attribute: 'label, label-icon, supporting-text', names: ['label', 'label-icon', 'supporting-text'] });
    // A part the composed element never draws is left out.
    expect(exported(member, {}, ['label-icon'])).toEqual({ attribute: 'label, supporting-text', names: ['label', 'supporting-text'] });
    expect(exported(member, { label: { as: 'field-label', bare: true }, 'supporting-text': { as: 'field-supporting-text' } })).toEqual({
      attribute: 'label, label: field-label, label-icon, supporting-text: field-supporting-text',
      names: ['label', 'field-label', 'label-icon', 'field-supporting-text'],
    });
  });

  test('exportparts names one part twice (`label, label: field-label`): both names style it, in every engine; a part exported under another name only is not reached by its own (W4, item 2)', async ({ page }) => {
    const twice = exported({ parts: ['label', 'supporting-text'] }, { label: { as: 'field-label', bare: true }, 'supporting-text': { as: 'field-help' } }).attribute;
    expect(twice).toBe('label, label: field-label, supporting-text: field-help');
    await mount(
      page,
      `<div id="bare"></div><div id="prefixed"></div>
       <script>for (const id of ['bare', 'prefixed']) document.getElementById(id).attachShadow({ mode: 'open' }).innerHTML = '<tanrei-field exportparts="${twice}" label="Code" supporting-text="Help"><tanrei-slider></tanrei-slider></tanrei-field>';</script>`,
      'tanrei-field',
      `<style>#bare::part(label) { color: rgb(255, 0, 0); } #prefixed::part(field-label) { color: rgb(0, 0, 255); } #bare::part(supporting-text) { color: rgb(0, 255, 0); } #prefixed::part(field-help) { color: rgb(0, 255, 255); }</style>`,
    );
    const colors = await page.evaluate(() =>
      ['bare', 'prefixed'].map((id) => {
        const field = document.getElementById(id)!.shadowRoot!.querySelector('tanrei-field')!.shadowRoot!;
        return { label: getComputedStyle(field.querySelector('[part~="label"]')!).color, help: getComputedStyle(field.querySelector('[part~="supporting-text"]')!).color };
      }),
    );
    expect(colors[0]!.label).toBe('rgb(255, 0, 0)');
    expect(colors[1]!.label).toBe('rgb(0, 0, 255)');
    expect(colors[1]!.help).toBe('rgb(0, 255, 255)');
    expect(colors[0]!.help, 'exported as field-help only').not.toBe('rgb(0, 255, 0)');
  });

  test('every class that lists its parts lists exactly the parts it documents (W4, item 3): the list a composed element exports from is the manifest\'s', async ({ page }) => {
    await mount(page, '', 'tanrei-field');
    const tags = declarations.filter((declaration) => declaration.tagName).map((declaration) => declaration.tagName!);
    const listed = await page.evaluate((all) => Object.fromEntries(all.map((tag) => [tag, (customElements.get(tag) as unknown as { parts?: string[] } | undefined)?.parts]).filter(([, parts]) => parts)), tags);
    // The members of every composed element list theirs, and so does each composed element.
    for (const spec of COMPOSED) for (const tag of [spec.platforms.web.name, ...(spec.builtFrom ?? []).map((name) => loadSpec(name).platforms.web.name)]) expect(listed[tag], `<${tag}> lists its parts`).toBeTruthy();
    for (const [tag, parts] of Object.entries(listed)) expect([...(parts as string[])].sort(), `<${tag}>`).toEqual((declared(tag)!.cssParts ?? []).map((part) => part.name).sort());
  });

  test('FormSays: what a control tells its form is heard by whoever listens — the last word at once, then each later one, with the value, the state, the flags, the message and the control\'s own anchor (W6, items 2 and 3)', async ({ page }) => {
    await mount(page, `<form><tanrei-field label="Code" required><tanrei-one-time-code-input id="c" name="code" value="12"></tanrei-one-time-code-input></tanrei-field></form>`, 'tanrei-one-time-code-input');
    const heard = await page.evaluate(async () => {
      const control = document.getElementById('c') as HTMLElement & { value: string; updateComplete: Promise<unknown>; validity: ValidityState };
      type Word = { value: unknown; state: unknown; flags: ValidityStateFlags; message: string; anchor?: HTMLElement };
      const says = (control as unknown as Record<symbol, { hear: (hearer: (word: Word) => void) => () => void }>)[Symbol.for('tanrei.form-says')]!;
      const words: { value: unknown; state: unknown; missing: boolean; message: boolean; anchor: string | null }[] = [];
      const stop = says.hear((word) => words.push({ value: word.value, state: word.state, missing: !!word.flags.valueMissing, message: word.message !== '', anchor: word.anchor ? `${(word.anchor.getRootNode() as ShadowRoot).host.localName} ${word.anchor.localName}` : null }));
      const atOnce = words.length;
      control.value = '';
      await control.updateComplete;
      const empty = words.at(-1);
      stop();
      const told = words.length;
      control.value = '34';
      await control.updateComplete;
      return { atOnce, first: words[0], empty, later: words.length - told, own: { missing: control.validity.valueMissing, form: [...new FormData(control.closest('form')!).entries()] } };
    });
    expect(heard.atOnce, 'the last word, at once').toBe(1);
    expect(heard.first).toEqual({ value: '12', state: '12', missing: false, message: false, anchor: null });
    expect(heard.empty).toEqual({ value: '', state: '', missing: true, message: true, anchor: 'tanrei-one-time-code-input input' });
    expect(heard.later, 'nothing after it stopped listening').toBe(0);
    // The control's own internals were told the same: outside a composed element it behaves as before.
    expect(heard.own).toEqual({ missing: false, form: [['code', '34']] });
  });

  test('formOf(): Enter in a control submits its own form; in the shadow root of an element that is not form-associated it has none, as before (W6, item 7)', async ({ page }) => {
    await mount(
      page,
      `<form id="own"><tanrei-one-time-code-input id="in" label="Code"></tanrei-one-time-code-input><button>Send</button></form>
       <form id="around"><div id="plain"></div><button>Send</button></form>
       <script>
         document.getElementById('plain').attachShadow({ mode: 'open' }).innerHTML = '<tanrei-one-time-code-input label="Code"></tanrei-one-time-code-input>';
         window.submitted = [];
         for (const form of document.forms) form.addEventListener('submit', (event) => { event.preventDefault(); window.submitted.push(form.id); });
       </script>`,
      'tanrei-one-time-code-input',
    );
    await page.locator('#in').evaluate((el: HTMLElement) => el.focus());
    await page.keyboard.press('Enter');
    await page.locator('#plain').evaluate((el) => (el.shadowRoot!.querySelector('tanrei-one-time-code-input') as HTMLElement).focus());
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => (window as unknown as { submitted: string[] }).submitted)).toEqual(['own']);
  });
});

// ─── W13, for every composed element ─────────────────────────────────────────────────────────────────────────────

test('the tests of the mechanism run over at least the first composed element, and each has its entry', () => {
  expect(COMPOSED.map((spec) => spec.name)).toEqual(expect.arrayContaining(['one-time-code-field', 'text-field', 'file-upload']));
  for (const spec of COMPOSED) expect(DRIVEN[spec.name], `${spec.name}: an entry in DRIVEN`).toBeTruthy();
});

for (const written of COMPOSED) {
  // A spec that forwards and whose element is not composed yet has no entry: the test above says so, by name, and the
  // tests of the others still run.
  if (!DRIVEN[written.name]) continue;
  const spec = written as Resolved;
  const tag = spec.platforms.web.name;
  const driven = DRIVEN[spec.name]!;
  const element = (page: Page) => page.locator('#composed');
  const plain = (rest = '', children = '') => `<${tag} id="composed" ${driven.attributes.frame} ${driven.attributes.member} ${rest}>${driven.children ?? ''}${children}</${tag}>`;
  // W5, W6, W7: the tests of a value member — the value, the form's message, focus through the member — are defined
  // only where the spec forwards `value`, and the one that places the pair in a form by hand only where it also
  // forwards `label` (a frame member). A feature without them holds those of its own sentences in its own test file.
  const forwardsFrom = (name: string) => forwardedProps(spec).some((prop) => prop.name === name);
  const valued: typeof test = forwardsFrom('value') && !driven.noValueMember ? test : (((..._: unknown[]) => {}) as unknown as typeof test);
  const framed: typeof test = forwardsFrom('value') && forwardsFrom('label') && !driven.noValueMember ? test : (((..._: unknown[]) => {}) as unknown as typeof test);
  const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  /** The part a member's host is: named for its component, or by the anatomy id the entry gives. */
  const memberPart = (name: string) => driven.placed?.parts[name] ?? name;
  /** The members that stand in the shadow root: all of them, but those that are the product's own children alone. */
  const shadowMembers = (spec.builtFrom ?? []).filter((name) => !driven.placed?.light?.includes(name));

  test.describe(`${spec.name}: the web's way of composing`, () => {
    test(`${spec.name} W13-1 declarations: each forwarded prop is a property with its member's attribute name, type, reflection and default, and the manifest shows it with the member's description, type and default; each event, slot and part is there with the member's (W2, W11)`, async ({ page }) => {
      await mount(page, '', tag);
      const ours = declared(tag)!;
      for (const prop of forwardedProps(spec)) {
        const at = from(prop);
        const name = property(spec, prop.name);
        const both = await page.evaluate(
          ([composedTag, composedProp, memberTag, memberProp]) => {
            const read = (elementTag: string, propertyName: string) => {
              const options = (customElements.get(elementTag) as unknown as { elementProperties: Map<string, { attribute?: string | boolean; type?: { name: string }; reflect?: boolean; state?: boolean }> }).elementProperties.get(propertyName);
              return options ? { attribute: options.attribute ?? null, type: options.type?.name ?? null, reflect: !!options.reflect, state: !!options.state, initial: (document.createElement(elementTag) as unknown as Record<string, unknown>)[propertyName] } : null;
            };
            return [read(composedTag!, composedProp!), read(memberTag!, memberProp!)];
          },
          [tag, name, at.tag, at.property],
        );
        expect(both[1], `<${at.tag}> declares ${at.property}`).not.toBeNull();
        // A prop the component names otherwise than its member does (`itemForm` from `file-item.form`) has the
        // attribute of its own name; everything else — type, reflection, default — is the member's.
        const renamed = name !== at.property;
        expect(both[0], `${prop.name} is declared as ${prop.from} is`).toEqual(renamed ? { ...both[1]!, attribute: kebab(name) } : both[1]);
        // W11: the manifest's entry is the member's own.
        const theirs = declared(at.tag)!;
        const [mine, member] = [ours.members?.find((m) => m.name === name), theirs.members?.find((m) => m.name === at.property)];
        expect(member?.description, `${prop.from} is documented`).toBeTruthy();
        expect({ description: mine?.description, type: mine?.type, default: mine?.default, attribute: mine?.attribute }, `the manifest's ${name}`).toEqual({ description: member?.description, type: member?.type, default: member?.default, attribute: renamed ? kebab(name) : member?.attribute });
        const [attribute, memberAttribute] = [ours.attributes?.find((a) => a.fieldName === name), theirs.attributes?.find((a) => a.fieldName === at.property)];
        expect({ name: attribute?.name, description: attribute?.description, type: attribute?.type, default: attribute?.default }, `the manifest's attribute of ${name}`).toEqual({ name: renamed ? kebab(name) : memberAttribute?.name, description: memberAttribute?.description, type: memberAttribute?.type, default: memberAttribute?.default });
      }
      // Every prop of the spec is forwarded or the component's own, and the element has no attribute the spec does not name — but the platform's `name` and `form`.
      const withAttribute = (spec.props ?? []).map((p) => property(spec, p.name)).filter((name) => !driven.placed?.propertyOnly.includes(name));
      expect((ours.attributes ?? []).filter((a) => a.fieldName).map((a) => a.fieldName).sort()).toEqual([...withAttribute, 'name'].sort());
      for (const name of driven.placed?.propertyOnly ?? []) expect(ours.members?.find((m) => m.name === name), `${name} is a property`).toBeTruthy();
      expect(ours.attributes?.find((a) => a.name === 'form'), '@attr form').toBeTruthy();
      for (const event of (spec.events ?? []).filter((e) => e.from)) {
        // The web's name of an event is the member's (`pickerRequest` is `pickerrequest`), as its spec's mapping has it.
        const theirName = (loadSpec(from(event).component).platforms.web as { events?: Record<string, string> }).events?.[from(event).name] ?? from(event).name;
        const theirs = declared(from(event).tag)!.events!.find((e) => e.name === theirName)!;
        expect(theirs, `<${from(event).tag}> documents ${theirName}`).toBeTruthy();
        expect(ours.events?.find((e) => e.name === eventName(event.name)), `the event ${event.name}`).toEqual(theirs);
      }
      expect((ours.events ?? []).map((e) => e.name).sort(), 'no event the spec does not name').toEqual([...(spec.events ?? []).map((e) => eventName(e.name)), ...(driven.placed?.events ?? [])].sort());
      for (const slot of (spec.slots ?? []).filter((s) => s.from)) {
        const theirs = declared(from(slot).tag)!.slots!.find((s) => s.name === from(slot).name)!;
        expect(ours.slots?.find((s) => s.name === slot.name), `the slot ${slot.name}`).toEqual(theirs);
      }
      // A component whose items are the product's own children (R7) has the default slot they stand in.
      expect((ours.slots ?? []).map((s) => s.name).sort(), 'no slot the spec does not name').toEqual([...(spec.slots ?? []).map((s) => s.name), ...(spec.items?.length ? [''] : [])].sort());
      // The member parts, named for the members (W4, item 1), and every part each member documents, with its description.
      for (const name of shadowMembers) {
        expect(ours.cssParts?.find((part) => part.name === memberPart(name)), `the member part ${memberPart(name)}`).toBeTruthy();
        // (But a part the element says it never draws: its own list of parts, which the manifest is held equal to.)
        const own = new Set(await page.evaluate((elementTag) => (customElements.get(elementTag) as unknown as { parts: string[] }).parts, tag));
        for (const part of declared(loadSpec(name).platforms.web.name)!.cssParts ?? []) {
          const exportedAs = (ours.cssParts ?? []).filter((p) => p.description === part.description);
          if (exportedAs.length === 0) expect(own.has(part.name), `the part ${part.name} of ${name} is exported, or left out by the element's own list`).toBe(false);
          else expect(exportedAs.every((p) => own.has(p.name)), `the part ${part.name} of ${name}`).toBe(true);
        }
      }
      // The first paragraph says what it is built from.
      for (const name of spec.builtFrom ?? []) expect(ours.description!.split(/\n\s*\n/)[0], 'the first paragraph names each member').toContain(`<${loadSpec(name).platforms.web.name}>`);
    });

    test(`${spec.name} W13-2 passing: each prop set on the element is on its member after the update, as a property and unchanged — a value the member does not know too — and the element writes no custom property (W2, W3)`, async ({ page }) => {
      const seen = warnings(page);
      await mount(page, plain(driven.passing?.attributes, driven.passing?.children), tag);
      for (const prop of forwardedProps(spec).filter((p) => p.name !== 'value')) {
        const at = from(prop);
        // A prop given to members that are not one element of the shadow root is read through what they draw of it.
        const through = driven.passing?.reads[prop.name];
        if (through) {
          await element(page).evaluate((el, [name, value]) => void ((el as unknown as Record<string, unknown>)[name as string] = value), [property(spec, prop.name), through.given] as const);
          await expect.poll(() => through.read(element(page)), `${prop.name} reaches every ${at.tag}`).toEqual(through.drawn);
          continue;
        }
        // A value the member's type does not hold where it has a list of values, the other boolean, another number, another text.
        const given = driven.passing?.given?.[prop.name] ?? (prop.type === 'boolean' ? prop.default !== true : prop.type === 'number' || prop.type === 'integer' ? 4 : `not-a-value-of-${prop.name}`);
        const got = await element(page).evaluate(
          async (el, [name, memberTag, memberProp, value]) => {
            (el as unknown as Record<string, unknown>)[name as string] = value;
            await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
            return (el.shadowRoot!.querySelector(memberTag as string) as unknown as Record<string, unknown>)[memberProp as string];
          },
          [property(spec, prop.name), at.tag, at.property, given] as const,
        );
        expect(got, `${prop.name} reaches ${prop.from}`).toEqual(given);
      }
      // W3: nothing in the element's own tree sets a custom property, and its own sheet writes none and reads none
      // of a member's: only its own group (`--tanrei-comp-<its name>-…`), where it has one, and the system's.
      const written = await element(page).evaluate(
        (el, own) => ({
          inline: [...el.shadowRoot!.querySelectorAll<HTMLElement>('*')].flatMap((child) => [...child.style]).filter((name) => name.startsWith('--')),
          sheet: [...(el.shadowRoot!.adoptedStyleSheets ?? [])]
            .flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText))
            .filter((text) => /(^|[{;\s])--[\w-]+\s*:/.test(text) || [...text.matchAll(/var\(\s*(--[\w-]+)/g)].some(([, name]) => !name!.startsWith(own) && !name!.startsWith('--tanrei-sys-'))),
        }),
        `--tanrei-comp-${spec.name}-`,
      );
      expect(written).toEqual({ inline: [], sheet: [] });
      // The members answered the values they do not know (a report each), and the element reported nothing itself.
      expect(seen.filter((text) => text.includes(`<${tag}>`))).toEqual([]);
    });

    test(`${spec.name} W13-3 parts: each member's host is a part named for its component, and each documented part of each member is styled from outside under its exported name — a name two members share reaches the drawn one of the two, and a name with a member's before it that member's alone (W4)`, async ({ page }) => {
      const names = declared(tag)!.cssParts!.map((part) => part.name);
      expect(new Set(names).size, 'each exported name once').toBe(names.length);
      // Each instance draws some of the parts; together they draw every part an instance can draw.
      const instances = [driven.allParts].flat();
      const id = (index: number) => (index === 0 ? 'composed' : `composed-${index}`);
      // An instance with a help and an error text draws both under the design system's `append` (FLD-7): the default,
      // `replace`, draws the error text in the help's place.
      const append = '<style>:root { --tanrei-comp-field-error-text-placement: append; }</style>';
      await mount(page, append + instances.map((one, index) => `<${tag} id="${id(index)}" ${one.attributes}>${one.children}</${tag}>`).join('\n'), tag);
      for (const [index, one] of instances.entries()) await one.act?.(page, page.locator(`#${id(index)}`));
      await settle(page);
      // One name at a time: a part exported under two names would take the later of two rules.
      const reached = await page.evaluate(
        ([elementTag, partNames, memberNames]) => {
          const sheet = document.head.appendChild(document.createElement('style'));
          const all = (root: ShadowRoot, depth: number): { el: Element; depth: number }[] => [...root.querySelectorAll('*')].flatMap((el) => [{ el, depth }, ...(el.shadowRoot ? all(el.shadowRoot, depth + 1) : [])]);
          const elements = [...document.querySelectorAll(elementTag as string)];
          // A part is known on the element by the name its member exports it under (`exportparts`: `icon`, or
          // `icon: item-icon`), through each shadow root between them; what a member does not export is not reached.
          const named: Record<string, Element[]> = {};
          const exported = new Set<string>();
          const walk = (top: ShadowRoot, root: ShadowRoot, known: (name: string) => string[]) => {
            for (const child of root.querySelectorAll('*')) {
              for (const name of child.part ?? []) for (const outer of known(name)) (named[outer] ??= []).push(child);
              if (!child.shadowRoot) continue;
              const entries = (child.getAttribute('exportparts') ?? '').split(',').map((entry) => entry.split(':').map((name) => name.trim())).filter(([inner]) => inner);
              if (root === top) for (const [inner, outer] of entries) exported.add(outer ?? inner!);
              walk(top, child.shadowRoot, (name) => entries.filter(([inner]) => inner === name).flatMap(([inner, outer]) => known(outer ?? inner!)));
            }
          };
          for (const el of elements) walk(el.shadowRoot!, el.shadowRoot!, (name) => [name]);
          const parts: Record<string, { hits: { depth: number; tag: string; member: string }[]; named: number; same: boolean }> = {};
          for (const name of partNames as string[]) {
            sheet.textContent = `${elementTag as string}::part(${name}) { outline: 1px dashed rgb(1, 2, 3); }`;
            const styled = elements.flatMap((host) => all(host.shadowRoot!, 1)).filter(({ el }) => getComputedStyle(el).outlineColor === 'rgb(1, 2, 3)' && getComputedStyle(el).outlineStyle === 'dashed');
            const known = named[name] ?? [];
            parts[name] = {
              hits: styled.map(({ el, depth }) => ({ depth, tag: el.localName, member: ((el.getRootNode() as ShadowRoot).host as Element).localName })),
              named: known.length,
              same: styled.length === known.length && styled.every(({ el }) => known.includes(el)),
            };
          }
          sheet.remove();
          // Each member's host, in each instance: the element of the shadow root that is the part of its name.
          const hosts = elements.map((el) => (memberNames as string[]).map((name) => el.shadowRoot!.querySelector(`[part~="${name}"]`)?.localName ?? null));
          return { parts, exported: [...exported], hosts };
        },
        [tag, names, shadowMembers.map(memberPart)] as const,
      );
      // A member is known here by the part its host is: its component's name, or the anatomy id the entry gives.
      const members = shadowMembers.map((name) => ({ name: memberPart(name), tag: loadSpec(name).platforms.web.name }));
      for (const name of names) {
        const host = members.find((member) => member.name === name);
        const part = reached.parts[name]!;
        // A part no instance of the element can draw is held by the member's `exportparts` naming it.
        if (driven.neverDrawn?.[name]) {
          expect(reached.exported, `${name} is exported, and never drawn: ${driven.neverDrawn[name]}`).toContain(name);
          expect(part.hits, `${name} is never drawn`).toEqual([]);
          continue;
        }
        // Each exported name reaches something that is drawn in one of the instances.
        expect(part.hits.length, `::part(${name}) reaches a part`).toBeGreaterThan(0);
        // And what it reaches is what the members export under that name, read through `exportparts`, and nothing
        // else: a member's own part of the same name (the Field's Tag has a `label` of its own) is not reached.
        expect({ styled: part.hits.length, named: part.named, same: part.same }, `::part(${name}) styles exactly what is exported under it`).toEqual({ styled: part.named, named: part.named, same: true });
        for (const hit of part.hits) {
          // A member's host is a part of the element itself; a part a member exports is one level down, in a member —
          // and no further; and a part that is the element's own (the file upload's list) is in its own shadow root.
          if (host) expect(hit, `::part(${name})`).toEqual({ depth: 1, tag: host.tag, member: tag });
          else if (reached.exported.includes(name)) expect({ depth: hit.depth, inAMember: members.some((member) => member.tag === hit.member) }, `::part(${name})`).toEqual({ depth: 2, inAMember: true });
          else expect({ depth: hit.depth, member: hit.member }, `::part(${name}), the element's own`).toEqual({ depth: 1, member: tag });
          // A name with a member's name before it is that member's part alone.
          const owner = members.find((member) => name.startsWith(`${member.name}-`) && !host);
          if (owner) expect(hit.member, `::part(${name}) is a part of <${owner.tag}>`).toBe(owner.tag);
        }
      }
      for (const name of Object.keys(driven.neverDrawn ?? {})) expect(names, `${name} is a part of the element`).toContain(name);
      // Each member's host is its own element: in every instance of an element with a value member (its frame and its
      // control are always there), and in one of the instances at least where a member is drawn only when there is
      // something of it to draw (the file upload's file items).
      const tags = members.map((member) => member.tag);
      for (const hosts of reached.hosts) expect(hosts.map((host, index) => host ?? tags[index]), 'a host that is drawn is the member\'s element').toEqual(tags);
      if (forwardsFrom('value') && !driven.noValueMember) for (const hosts of reached.hosts) expect(hosts).toEqual(tags);
      expect(members.map((_, index) => reached.hosts.map((hosts) => hosts[index]).find(Boolean))).toEqual(tags);
    });

    const eventName = (name: string) => (spec.platforms.web as { events?: Record<string, string> }).events?.[name] ?? name;
    for (const event of spec.events ?? []) {
      test(`${spec.name} W13-4 events: ${event.name} is heard once on the element for one act, with the element as its target and its value already new — in a bubbling listener and in a capturing one on an ancestor — and nothing is heard twice (W5)`, async ({ page }) => {
        const how = driven.events[event.name];
        expect(how, `DRIVEN says how ${event.name} is caused`).toBeTruthy();
        await mount(page, `<div id="around">${plain()}</div>`, tag);
        await how!.before?.(page, element(page));
        await settle(page);
        await page.evaluate(
          ([names]) => {
            const heard: { name: string; where: string; target: boolean; value: unknown; detail: unknown; composed: boolean; custom: boolean }[] = [];
            (window as unknown as { heard: typeof heard }).heard = heard;
            const el = document.getElementById('composed') as HTMLElement & { value: unknown };
            const note = (where: string) => (e: Event) => heard.push({ name: e.type, where, target: e.target === el, value: (e.target as typeof el).value, detail: (e as CustomEvent).detail, composed: e.composed, custom: e instanceof CustomEvent });
            for (const name of names!) {
              window.addEventListener(name, note('window, capturing'), true);
              document.getElementById('around')!.addEventListener(name, note('ancestor, capturing'), true);
              el.addEventListener(name, note('element'));
              document.getElementById('around')!.addEventListener(name, note('ancestor, bubbling'));
            }
          },
          [(spec.events ?? []).map((e) => eventName(e.name))],
        );
        await how!.act(page, element(page));
        await settle(page);
        const heard = await page.evaluate(() => (window as unknown as { heard: { name: string; where: string; target: boolean; value: unknown; detail: { value?: unknown } | null; composed: boolean; custom: boolean }[] }).heard);
        const mine = heard.filter((entry) => entry.name === eventName(event.name));
        // (An event that does not bubble is heard by no bubbling listener on an ancestor: `bubbles: false` in DRIVEN.)
        const quiet = new Set(Object.entries(driven.events).filter(([, each]) => each.bubbles === false).map(([name]) => eventName(name)));
        const LISTENERS = ['window, capturing', 'ancestor, capturing', 'element', 'ancestor, bubbling'];
        const listeners = (name: string) => (quiet.has(name) ? LISTENERS.slice(0, 3) : LISTENERS);
        expect(mine.map((entry) => entry.where), 'once in each listener').toEqual(listeners(eventName(event.name)));
        for (const entry of mine) {
          expect(entry.target, `${entry.where}: the target is the element`).toBe(true);
          expect(entry.value, `${entry.where}: event.target.value is the new value`).toEqual(how!.value);
          // An event from a member is the member's own, as it left the member: composed — a CustomEvent, or the
          // browser's own `input` of a native text element (a text input's), which no element can dispatch in its
          // place. An event that is the element's own (the file upload's three, FUP-57: its file picker's never leave
          // it) is the CustomEvent the element dispatches on itself.
          if (event.from || how!.member) expect(entry.composed, 'the member\'s own composed event').toBe(true);
          else expect(entry.custom, 'the element\'s own CustomEvent').toBe(true);
          if (entry.detail && 'value' in entry.detail) expect(entry.detail.value).toEqual('detail' in how! ? how!.detail : how!.value);
        }
        // No event of the spec is heard more often than its act causes it: none is dispatched again by the element.
        for (const name of new Set(heard.map((entry) => entry.name))) {
          if (driven.strays?.[name] && name !== eventName(event.name)) continue;
          expect(heard.filter((entry) => entry.name === name).length, `${name} once in each of its listeners`).toBe(listeners(name).length);
        }
      });
    }

    valued(`${spec.name} W13-4 the value: a value set on the element is read back at once as it was set and, after its update, as the value member holds it — changed where the member changed it — with no event; the same value set again changes nothing (W5)`, async ({ page }) => {
      await mount(page, plain(), tag);
      const member = valueMember(spec);
      const read = await element(page).evaluate(
        async (el, [memberTag, given, names]) => {
          const control = el as HTMLElement & { value: unknown; updateComplete: Promise<unknown> };
          let events = 0;
          for (const name of names as string[]) control.addEventListener(name, () => events++);
          control.value = given;
          const atOnce = control.value;
          await control.updateComplete;
          const inner = control.shadowRoot!.querySelector(memberTag as string) as HTMLElement & { value: unknown };
          const after = { element: control.value, member: inner.value };
          // What the member holds, set again: nothing to take.
          control.value = inner.value;
          const same = control.value;
          // Before the element has rendered, what was set is what is read.
          const fresh = document.createElement(control.localName) as typeof control;
          fresh.value = given;
          return { atOnce, after, same, fresh: fresh.value, events };
        },
        [member.tag, driven.kept!.given, (spec.events ?? []).map((e) => eventName(e.name))] as const,
      );
      expect(read.atOnce, 'what was last set, until the member has taken it').toEqual(driven.kept!.given);
      expect(read.after).toEqual({ element: driven.kept!.kept, member: driven.kept!.kept });
      expect(read.same).toEqual(driven.kept!.kept);
      expect(read.fresh).toEqual(driven.kept!.given);
      expect(read.events, 'no event for a value the product set').toBe(0);
    });

    framed(`${spec.name} W13-5 form: under its name the element submits exactly what its value member submits when it is placed in the form by hand, and no member adds an entry; reset, restore, a disabled fieldset, checkValidity() and the validation message are the member's by hand (W6)`, async ({ page }) => {
      const [frame, member] = [frameMember(spec), valueMember(spec)];
      const [first, second] = driven.values!;
      const byHand = (id: string, rest: string) => `<${frame.tag} ${driven.attributes.frame} required><${member.tag} id="${id}" name="code" ${driven.attributes.member} ${rest}>${driven.children ?? ''}</${member.tag}></${frame.tag}>`;
      await mount(
        page,
        `<form id="composed-form"><fieldset>${plain(`name="code" value="${first}" required`)}</fieldset></form>
         <form id="hand-form"><fieldset>${byHand('hand', `value="${first}"`)}</fieldset></form>`,
        tag,
      );
      const snapshot = () =>
        page.evaluate(async () => {
          const all = (root: Document | ShadowRoot | Element): Element[] => [...root.querySelectorAll('*')].flatMap((el) => [el, ...(el.shadowRoot ? all(el.shadowRoot) : [])]);
          for (let round = 0; round < 3; round++) await Promise.all(all(document).map((el) => (el as Element & { updateComplete?: Promise<unknown> }).updateComplete));
          return ['composed', 'hand'].map((id) => {
            const el = document.getElementById(id) as HTMLElement & { value: unknown; form: HTMLFormElement; checkValidity(): boolean; validationMessage: string; validity: ValidityState; willValidate: boolean };
            const flags: string[] = [];
            for (const key in el.validity) if (key !== 'valid' && (el.validity as unknown as Record<string, boolean>)[key]) flags.push(key);
            return { value: el.value, entries: [...new FormData(el.form).entries()].map(([key, value]) => `${key}=${String(value)}`), listed: [...el.form.elements].filter((control) => control.localName !== 'fieldset').length, valid: el.checkValidity(), flags, message: el.validationMessage, willValidate: el.willValidate, disabled: el.matches(':disabled') };
          });
        });
      const same = async (what: string) => {
        const [composed, hand] = await snapshot();
        expect(composed, what).toEqual(hand);
        return composed!;
      };
      expect((await same('as first given')).entries).toEqual([`code=${first}`]);
      // The form meets one control: the element. Its members are in no form.
      expect((await same('one control')).listed).toBe(1);
      // (A slot the element passes on — a combobox field's unnamed one, for its options — is no member.)
      expect(await element(page).evaluate((el) => [...el.shadowRoot!.querySelectorAll('*')].filter((inner) => inner.localName !== 'slot').map((inner) => (inner as HTMLElement & { form?: unknown }).form ?? null))).toEqual((spec.builtFrom ?? []).map(() => null));
      // A value the product sets later.
      await page.evaluate((value) => ['composed', 'hand'].forEach((id) => ((document.getElementById(id) as HTMLElement & { value: unknown }).value = value)), second);
      expect((await same('a value set later')).entries).toEqual([`code=${second}`]);
      // Reset: to the value attribute.
      await page.evaluate(() => [...document.forms].forEach((form) => form.reset()));
      // What `value` reads as: the string itself, or what a member of another type holds for it (`valuesRead`).
      const read = (value: unknown, index: 0 | 1) => (driven.valuesRead ? [value, driven.valuesRead[index]] : [String(value), index === 0 ? first : second]);
      const afterReset = read((await same('after reset')).value, 0);
      expect(afterReset[0]).toEqual(afterReset[1]);
      // Restore: what the platform hands back on navigation.
      await page.evaluate((value) => ['composed', 'hand'].forEach((id) => (document.getElementById(id) as HTMLElement & { formStateRestoreCallback(state: string, mode: string): void }).formStateRestoreCallback(value, 'restore')), driven.restoreState?.(second) ?? second);
      const afterRestore = read((await same('after restore')).value, 1);
      expect(afterRestore[0]).toEqual(afterRestore[1]);
      // Empty and required: a missing value, with the member's message.
      await page.evaluate(() => ['composed', 'hand'].forEach((id) => ((document.getElementById(id) as HTMLElement & { value: unknown }).value = '')));
      const empty = await same('empty and required');
      // (A value member that is never empty is valid still, as it is by hand.)
      expect(empty.flags).toEqual(driven.neverEmpty ? [] : ['valueMissing']);
      if (!driven.neverEmpty) expect(empty.message).not.toBe('');
      // A disabled fieldset: nothing is submitted, nothing is validated, and the frame follows.
      await page.evaluate((value) => {
        ['composed', 'hand'].forEach((id) => ((document.getElementById(id) as HTMLElement & { value: unknown }).value = value));
        document.querySelectorAll('fieldset').forEach((set) => (set.disabled = true));
      }, second);
      const off = await same('in a disabled fieldset');
      expect(off).toMatchObject({ entries: [], disabled: true, willValidate: false });
      expect(await element(page).evaluate((el, frameTag) => (el.shadowRoot!.querySelector(frameTag) as HTMLElement & { disabled: boolean }).disabled, frame.tag), 'the frame member is given the fieldset\'s disabled').toBe(true);
      expect(await element(page).evaluate((el) => (el as HTMLElement & { disabled: boolean }).disabled), 'the element\'s own property does not change').toBe(false);
      await page.evaluate(() => document.querySelectorAll('fieldset').forEach((set) => (set.disabled = false)));
      expect(await same('enabled again')).toMatchObject({ entries: [`code=${second}`], disabled: false });
      // Its own disabled: nothing is submitted; unset, it is submitted again.
      await element(page).evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = true));
      expect((await snapshot())[0]).toMatchObject({ entries: [], disabled: true });
      await element(page).evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = false));
      expect((await snapshot())[0]).toMatchObject({ entries: [`code=${second}`], disabled: false });
    });

    (driven.neverEmpty ? (((..._: unknown[]) => {}) as unknown as typeof test) : valued)(`${spec.name} W13-5 form: the browser's message is anchored to the member's own native element, two shadow roots down — reportValidity() is false, tells the element it is invalid and focuses the control, and the form is not submitted (W6, item 3)`, async ({ page }) => {
      await mount(page, `<form id="form">${plain('name="code" required')}<button id="send">Send</button></form><script>window.submitted = 0; document.getElementById('form').addEventListener('submit', (event) => { event.preventDefault(); window.submitted++; });</script>`, tag);
      const member = valueMember(spec);
      const reported = await element(page).evaluate((el) => {
        let invalid = 0;
        el.addEventListener('invalid', () => invalid++);
        return { reported: (el as HTMLElement & { reportValidity(): boolean }).reportValidity(), invalid };
      });
      expect(reported).toEqual({ reported: false, invalid: 1 });
      const path = await focusPath(page);
      expect(path.slice(0, 2), 'focus is in the control').toEqual([`${tag}#composed`, member.tag]);
      expect(path.length, 'on the native element inside it').toBe(3);
      await page.locator('#send').click();
      expect(await page.evaluate(() => (window as unknown as { submitted: number }).submitted)).toBe(0);
    });

    if (driven.enterSubmits) {
      test(`${spec.name} W13-5 form: Enter in the control presses the default button of the element's form — its click, then the submission — and nothing while action is cancelled (W6, item 7)`, async ({ page }) => {
        await mount(
          page,
          `<form id="form">${plain(`name="code" value="${driven.values![0]}"`)}<button id="send" name="via" value="send">Send</button></form>
           <script>window.log = []; const form = document.getElementById('form'); document.getElementById('send').addEventListener('click', () => window.log.push('click')); form.addEventListener('submit', (event) => { event.preventDefault(); window.log.push('submit ' + [...new FormData(form, event.submitter).entries()].join('|')); });</script>`,
          tag,
        );
        await focus(element(page));
        await page.keyboard.press('Enter');
        expect(await page.evaluate(() => (window as unknown as { log: string[] }).log)).toEqual(['click', `submit code,${driven.values![0]}|via,send`]);
        if ((spec.events ?? []).some((event) => event.name === 'action')) {
          await element(page).evaluate((el) => el.addEventListener('action', (event) => event.preventDefault()));
          await page.keyboard.press('Enter');
          expect(await page.evaluate(() => (window as unknown as { log: string[] }).log), 'action cancelled: nothing more').toHaveLength(2);
        }
      });
    }

    valued(`${spec.name} W13-6 focus: focus() on the element focuses the control and blur() takes it away; Tab makes one stop; a press on text that is not a control moves no focus; a page's label for the element moves focus to the control, once; the shadow root delegates nothing and the host is not focusable (W7)`, async ({ page }) => {
      await mount(page, `<button id="before">Before</button><label id="label" for="composed">The page's own label</label>${plain()}<button id="after">After</button>`, tag);
      const member = valueMember(spec);
      expect(await element(page).evaluate((el) => ({ delegates: el.shadowRoot!.delegatesFocus, tabindex: el.getAttribute('tabindex'), tabIndex: el.tabIndex }))).toEqual({ delegates: false, tabindex: null, tabIndex: -1 });
      await focus(element(page));
      expect((await focusPath(page)).slice(0, 2)).toEqual([`${tag}#composed`, member.tag]);
      expect(await element(page).evaluate((el) => el.matches(':focus-within'))).toBe(true);
      await element(page).evaluate((el: HTMLElement) => el.blur());
      expect(await focusPath(page)).toEqual(['body']);
      // One stop.
      await page.locator('#before').focus();
      await tab(page);
      expect((await focusPath(page))[0]).toBe(`${tag}#composed`);
      await tab(page);
      expect(await focusPath(page)).toEqual(['button#after']);
      await tab(page, { back: true });
      expect((await focusPath(page))[0]).toBe(`${tag}#composed`);
      await tab(page, { back: true });
      expect(await focusPath(page)).toEqual(['button#before']);
      // A press on the help text: no focus arrives, and focus elsewhere is not taken into the control.
      await element(page).evaluate((el: HTMLElement) => el.blur());
      await page.locator('#before').evaluate((el: HTMLElement) => el.blur());
      const help = element(page).locator('[part~="supporting-text"]').first();
      const box = (await help.boundingBox())!;
      await page.mouse.click(box.x + 4, box.y + box.height / 2);
      expect((await focusPath(page))[0], 'a press on the help').not.toBe(`${tag}#composed`);
      // The page's own label: a click arrives on the host itself, and the control is focused exactly once.
      await page.evaluate(() => {
        const log: string[] = [];
        (window as unknown as { log: string[] }).log = log;
        const el = document.getElementById('composed')!;
        el.addEventListener('click', (event) => log.push(`click ${event.composedPath()[0] === el ? 'on the host' : 'inside'}`));
        el.addEventListener('focusin', () => log.push('focusin'));
        el.addEventListener('focusout', () => log.push('focusout'));
      });
      await page.locator('#label').click();
      expect(await page.evaluate(() => (window as unknown as { log: string[] }).log)).toEqual(['focusin', 'click on the host']);
      expect((await focusPath(page)).slice(0, 2)).toEqual([`${tag}#composed`, member.tag]);
    });

    for (const fixture of spec.fixtures.filter((f) => f.twin)) {
      test(`${spec.name} W13-7 the twin: ${fixture.id} and ${fixture.twin}, mounted in one run, are the same pixels and the same control to assistive technology — role, name, description, invalid, required, disabled, read-only (R6)`, async ({ page, browserName }) => {
        const seen = warnings(page);
        await mountFixtures(page, spec, { fixtures: [fixture], twins: true, icons: true });
        await settle(page);
        // A loading indicator draws and exposes nothing until its show delay has passed (LDG-11): the two stages are
        // read once every one in them has shown itself — never one before and the other after.
        await page.waitForFunction(() => {
          const all = (root: Document | ShadowRoot): Element[] => [...root.querySelectorAll('*')].flatMap((el) => [el, ...(el.shadowRoot ? all(el.shadowRoot) : [])]);
          return all(document).filter((el) => el.localName === 'tanrei-loading-indicator').every((el) => el.getAttribute('aria-hidden') !== 'true');
        });
        const [ours, theirs] = [page.locator(`[data-fixture="${fixture.id}"]`), page.locator(`[data-twin-of="${fixture.id}"]`)];
        await expect(theirs).toHaveCount(1);
        // A Field framed by hand shows what its product writes into `value-text`, and for a slider that is what the
        // Slider says (`shownValueText`, SLD-18) — a number in the page's locale, with the digits this engine's locale
        // data gives that language: WebKit on Linux writes 40 in Arabic as ٤٠, where the fixture, written once for
        // every engine, says 40. The twin is given its Slider's words, as the product gives them; they are the
        // fixture's own but for the digits.
        const words = await theirs.evaluate((stage) => {
          const field = stage.querySelector<HTMLElement & { valueText: string }>('tanrei-field');
          const slider = field?.querySelector<HTMLElement & { shownValueText: string; range: boolean }>(':scope > tanrei-slider');
          if (!field || !slider || slider.range || !field.valueText || slider.shownValueText === field.valueText) return null;
          const written = field.valueText;
          field.valueText = slider.shownValueText;
          const digits = new Intl.NumberFormat(slider.closest('[lang]')?.getAttribute('lang') ?? undefined, { useGrouping: false }).format(9876543210);
          return { written, inAscii: [...slider.shownValueText].map((letter) => (digits.includes(letter) ? '9876543210'[[...digits].indexOf(letter)] : letter)).join('') };
        });
        if (words) {
          expect(words.inAscii, 'the slider says the fixture’s number, in the digits of its language').toBe(words.written);
          await settle(page);
        }
        if (driven.placed) {
          // Members the product places on both sides: not one control but a set, in the frame's own element. The frame
          // says the same of the set, and each control of the set the same of itself, in the same order.
          const frame = frameMember(spec);
          const saidOfSet = (stage: Locator) =>
            stage.evaluate(
              (el, [frameTag, elementTag]) => {
                const group = el.querySelector(frameTag!) ?? el.querySelector(elementTag!)!.shadowRoot!.querySelector(frameTag!)!;
                const root = group.shadowRoot!;
                const set = root.querySelector('fieldset, [role]')!;
                const texts = (ids: string | null) => (ids ?? '').split(/\s+/).filter(Boolean).map((id) => root.getElementById(id)?.textContent?.replace(/\s+/g, ' ').trim() ?? null);
                return {
                  set: {
                    element: set.localName,
                    role: set.getAttribute('role'),
                    named: texts(set.getAttribute('aria-labelledby')),
                    legend: set.querySelector('legend')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
                    described: texts(set.getAttribute('aria-describedby')),
                    required: set.getAttribute('aria-required'),
                    invalid: set.getAttribute('aria-invalid'),
                    orientation: set.getAttribute('aria-orientation'),
                    disabled: set.getAttribute('aria-disabled'),
                  },
                  controls: root
                    .querySelector('slot')!
                    .assignedElements({ flatten: true })
                    .map((control) => {
                      const input = control.shadowRoot!.querySelector('input')!;
                      return {
                        element: control.localName,
                        type: input.type,
                        name: input.getAttribute('aria-label'),
                        description: input.getAttribute('aria-description'),
                        invalid: input.getAttribute('aria-invalid'),
                        required: input.getAttribute('aria-required') ?? input.required,
                        disabled: input.disabled,
                        checked: input.checked,
                        mixed: input.indeterminate,
                        position: input.getAttribute('aria-posinset'),
                        size: input.getAttribute('aria-setsize'),
                        stop: input.tabIndex === 0,
                      };
                    }),
                };
              },
              [frame.tag, tag] as const,
            );
          const mine = await saidOfSet(ours);
          expect(mine.controls.length, 'the controls of the set are the frame\'s, read through its slot').toBeGreaterThan(0);
          for (const control of mine.controls) expect(control.name, 'each control has a name').toBeTruthy();
          expect(mine).toEqual(await saidOfSet(theirs));
          expect(await ours.ariaSnapshot(), 'the accessibility tree of the stage').toBe(await theirs.ariaSnapshot());
          if (browserName === 'chromium') {
            const [engineMine, engineTwin] = [await axTree(page, `[data-fixture="${fixture.id}"]`), await axTree(page, `[data-twin-of="${fixture.id}"]`)];
            // One set, once: a group or a radio group, never one inside the other.
            expect(engineMine.filter((line) => /^(group|radiogroup) /.test(line.trimStart())), 'one group').toHaveLength(1);
            expect(insideHost(engineMine)).toEqual(engineTwin);
          }
        }
        // The same control: what its native element says, and what the engine computes from it.
        const member = driven.placed ? { tag: '' } : valueMember(spec);
        const said = (stage: Locator) =>
          stage.evaluate((el, memberTag) => {
            const find = (root: Element | ShadowRoot): Element | null => {
              for (const child of root.querySelectorAll('*')) {
                if (child.localName === memberTag) return child;
                const inside = child.shadowRoot ? find(child.shadowRoot) : null;
                if (inside) return inside;
              }
              return null;
            };
            const control = find(el)!.shadowRoot!.querySelector<HTMLInputElement>('input, textarea, select, [role]:not([role="presentation"]):not([role="none"])')!;
            return {
              element: control.localName,
              role: control.getAttribute('role'),
              type: control.getAttribute('type'),
              name: control.getAttribute('aria-label'),
              description: control.getAttribute('aria-description'),
              invalid: control.getAttribute('aria-invalid'),
              required: control.getAttribute('aria-required') ?? control.required ?? null,
              disabled: control.getAttribute('aria-disabled') ?? control.disabled ?? null,
              readonly: control.getAttribute('aria-readonly') ?? control.readOnly ?? null,
              value: control.value ?? null,
            };
          }, member.tag);
        if (!driven.placed) {
          const [mine, twin] = [await said(ours), await said(theirs)];
          expect(mine.name, 'the control has a name').toBeTruthy();
          expect(mine).toEqual(twin);
          const tree = (stage: Locator, of: 'ours' | 'twin') => (driven.tree ? driven.tree(stage, of) : stage.ariaSnapshot());
          expect(await tree(ours, 'ours'), 'the accessibility tree of the stage').toBe(await tree(theirs, 'twin'));
        }
        if (browserName === 'chromium' && !driven.placed) {
          const cdp = await page.context().newCDPSession(page);
          await cdp.send('Accessibility.enable');
          const node = async (selector: string) => {
            const { result } = await cdp.send('Runtime.evaluate', {
              expression: `(() => { const find = (root) => { for (const child of root.querySelectorAll('*')) { if (child.localName === ${JSON.stringify(member.tag)}) return child; const inside = child.shadowRoot ? find(child.shadowRoot) : null; if (inside) return inside; } return null; }; return find(document.querySelector(${JSON.stringify(selector)})).shadowRoot.querySelector('input, textarea, select, [role]'); })()`,
            });
            const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { objectId: result.objectId!, fetchRelatives: false });
            const found = nodes[0]!;
            return { ignored: found.ignored, role: found.role?.value, name: found.name?.value, description: found.description?.value, properties: Object.fromEntries((found.properties ?? []).map((p) => [p.name, p.value.value])) };
          };
          const [engineMine, engineTwin] = [await node(`[data-fixture="${fixture.id}"]`), await node(`[data-twin-of="${fixture.id}"]`)];
          expect(engineMine.ignored).toBe(false);
          expect(engineMine.name, 'the engine computes a name').toBeTruthy();
          expect(engineMine).toEqual(engineTwin);
        }
        // The same pixels: the two stages, drawn in one page, are one picture. Each is drawn in the same place — the
        // other taken out of the flow for the picture — because a stage that begins on a fraction of a pixel is cut,
        // and its text set, on another grid than one that begins at the top.
        // A picture that has loaded is not yet one that is drawn: a picture asked for with `decoding="async"` (a file
        // item's is) is decoded off the page's turn, and the first picture taken of a stage can show the ground where
        // the picture comes a frame later — in one stage and not in the other. Each picture is decoded before any is
        // taken (one that cannot be decoded draws what stands in its place, in the fixture and in its twin alike).
        await page.evaluate(async () => {
          const all = (root: Document | ShadowRoot): Element[] => [...root.querySelectorAll('*')].flatMap((el) => [el, ...(el.shadowRoot ? all(el.shadowRoot) : [])]);
          await Promise.all(all(document).filter((el): el is HTMLImageElement => el instanceof HTMLImageElement).map((img) => img.decode().catch(() => undefined)));
        });
        const alone = async (shown: Locator, other: Locator) => {
          await other.evaluate((el: HTMLElement) => (el.style.display = 'none'));
          const picture = decodePng(await shown.screenshot({ animations: 'disabled' }));
          await other.evaluate((el: HTMLElement) => el.style.removeProperty('display'));
          return picture;
        };
        // Each is first taken out of the flow and put back once, as the other will have been when it is drawn: WebKit
        // draws the bullets of a password differently after that — the same element differs from its own first
        // picture — which is no difference between the two.
        await alone(ours, theirs);
        await alone(theirs, ours);
        const [a, b] = [await alone(ours, theirs), await alone(theirs, ours)];
        expect(a.width * a.height, 'the stage is drawn').toBeGreaterThan(0);
        expect({ width: a.width, height: a.height }, 'the two stages are one size').toEqual({ width: b.width, height: b.height });
        let different = 0;
        for (let index = 0; index < a.data.length; index++) if (a.data[index] !== b.data[index]) different++;
        expect(different, 'differing color channels').toBe(0);
        // W13-8: and neither said anything the other did not.
        expect(reports(seen)).toEqual([]);
      });
    }

    for (const fixture of driven.twin ? spec.fixtures : []) {
      test(`${spec.name} W13-7 the twin by hand: ${fixture.id} and the same thing written one level down, mounted in one run, are the same pixels, the same control to assistive technology — name, description, invalid, required, disabled — and, apart from what the element adds, the same accessibility tree (R6)`, async ({ page, browserName }) => {
        const twin = driven.twin!;
        const seen = warnings(page);
        await mountFixtures(page, spec, { fixtures: [fixture], icons: true });
        await twin.mount(page, fixture);
        await settle(page);
        // Every picture has been drawn, or has failed and left its place to what stands there.
        await page.waitForFunction(() => {
          const all = (root: Document | ShadowRoot): Element[] => [...root.querySelectorAll('*')].flatMap((el) => [el, ...(el.shadowRoot ? all(el.shadowRoot) : [])]);
          return all(document).every((el) => !(el instanceof HTMLImageElement) || el.complete);
        });
        await settle(page);
        const [ours, theirs] = [page.locator(`[data-fixture="${fixture.id}"]`), page.locator(`[data-twin-of="${fixture.id}"]`)];
        await expect(theirs).toHaveCount(1);
        // The same control: what its native element says, and what the engine computes from it.
        const said = (stage: Locator) =>
          stage.evaluate((el, source) => {
            const control = (0, eval)(source)(el) as HTMLButtonElement;
            return {
              element: control.localName,
              name: control.getAttribute('aria-label') ?? control.textContent?.trim() ?? null,
              description: control.getAttribute('aria-description'),
              invalid: control.getAttribute('aria-invalid'),
              required: control.getAttribute('aria-required'),
              disabled: control.getAttribute('aria-disabled') ?? control.disabled ?? null,
            };
          }, twin.control);
        const [mine, hand] = [await said(ours), await said(theirs)];
        expect(mine).toEqual(hand);
        const tree = await twin.tree(ours, 'ours');
        expect(tree, 'the stage has an accessibility tree').not.toBe('');
        expect(tree, 'the accessibility tree of the stage, without what the element adds').toBe(await twin.tree(theirs, 'twin'));
        if (browserName === 'chromium') {
          const cdp = await page.context().newCDPSession(page);
          await cdp.send('Accessibility.enable');
          const node = async (selector: string) => {
            const { result } = await cdp.send('Runtime.evaluate', { expression: `(${twin.control})(document.querySelector(${JSON.stringify(selector)}))` });
            const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { objectId: result.objectId!, fetchRelatives: false });
            const found = nodes[0]!;
            return { ignored: found.ignored, role: found.role?.value, name: found.name?.value, description: found.description?.value, properties: Object.fromEntries((found.properties ?? []).map((p) => [p.name, p.value.value])) };
          };
          const [engineMine, engineTwin] = [await node(`[data-fixture="${fixture.id}"]`), await node(`[data-twin-of="${fixture.id}"]`)];
          expect(engineMine.ignored).toBe(false);
          expect(engineMine.name, 'the engine computes a name').toBeTruthy();
          expect(engineMine).toEqual(engineTwin);
        }
        // The same pixels, each stage drawn alone in the same place (as the twin of a fixture that names one is compared).
        // A picture that has loaded is not yet one that is drawn: a picture asked for with `decoding="async"` (a file
        // item's is) is decoded off the page's turn, and the first picture taken of a stage can show the ground where
        // the picture comes a frame later — in one stage and not in the other. Each picture is decoded before any is
        // taken (one that cannot be decoded draws what stands in its place, in the fixture and in its twin alike).
        await page.evaluate(async () => {
          const all = (root: Document | ShadowRoot): Element[] => [...root.querySelectorAll('*')].flatMap((el) => [el, ...(el.shadowRoot ? all(el.shadowRoot) : [])]);
          await Promise.all(all(document).filter((el): el is HTMLImageElement => el instanceof HTMLImageElement).map((img) => img.decode().catch(() => undefined)));
        });
        const alone = async (shown: Locator, other: Locator) => {
          await other.evaluate((el: HTMLElement) => (el.style.display = 'none'));
          const picture = decodePng(await shown.screenshot({ animations: 'disabled' }));
          await other.evaluate((el: HTMLElement) => el.style.removeProperty('display'));
          return picture;
        };
        const [a, b] = [await alone(ours, theirs), await alone(theirs, ours)];
        expect(a.width * a.height, 'the stage is drawn').toBeGreaterThan(0);
        expect({ width: a.width, height: a.height }, 'the two stages are one size').toEqual({ width: b.width, height: b.height });
        let different = 0;
        for (let index = 0; index < a.data.length; index += 4) if (a.data[index] !== b.data[index] || a.data[index + 1] !== b.data[index + 1] || a.data[index + 2] !== b.data[index + 2] || a.data[index + 3] !== b.data[index + 3]) different++;
        expect(different, 'differing pixels').toBe(0);
        // W13-8: the element said nothing — but in a fixture that lacks its words by design, where each says what it lacks.
        if (!driven.reporting?.includes(fixture.id)) expect(seen.filter((text) => text.includes('[tanrei]'))).toEqual([]);
      });
    }

    test(`${spec.name} W13-8 reports: no member reports a case the composed element cannot be in, in any fixture; the element itself reports only an ARIA name on its host (W8, W10)`, async ({ page }) => {
      const seen = warnings(page);
      // A fixture that reports by design — one drawn without its words — is mounted last, by itself.
      const byDesign = spec.fixtures.filter((fixture) => driven.reporting?.includes(fixture.id));
      await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((fixture) => !byDesign.includes(fixture)) });
      await settle(page);
      expect(reports(seen), 'no report from a fixture').toEqual([]);
      await page.locator(tag).first().evaluate(async (el) => {
        el.setAttribute('aria-label', 'A name on the host');
        (el as HTMLElement & { requestUpdate(): void; updateComplete: Promise<unknown> }).requestUpdate();
        await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      });
      // A fixture of a value the system leaves out is reported under the composed element too (AVL-1): not this report.
      expect(reports(seen).filter((text) => text.includes(`<${tag}>`))).toHaveLength(1);
      expect(reports(seen).find((text) => text.includes(`<${tag}>`))).toContain('aria-label');
      for (const fixture of byDesign) {
        seen.length = 0;
        await mountFixtures(page, spec, { icons: true, fixtures: [fixture] });
        await settle(page);
        expect(seen.filter((text) => text.includes('[tanrei]')).length, `${fixture.id} reports what it lacks`).toBeGreaterThan(0);
      }
    });
  });
}
