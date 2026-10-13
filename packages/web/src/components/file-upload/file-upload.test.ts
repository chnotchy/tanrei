// <tanrei-file-upload>, driven by specs/file-upload.spec.json: a feature built from a file picker and file items.
// Every behaviour id of the spec (FUP-1, 2, 7, 9, 16, 17, 21 and 24 to 58) starts the title of a
// test, and every fixture has a baseline.
//
// What is held here is what the file upload ADDS — the arrangement, the kept files and the room, the one message, focus
// after a removal, the form, what it gives every file item — and that it passes on what is a member's. What a member
// draws and does by itself is held in the member's own file (`file-picker.test.ts`, FPK; `file-item.test.ts`, FIT), and
// that the file upload is the same picture and the same tree as the two written by hand is held, for every fixture, by
// the twin in `src/primitives/composed.test.ts` (W13-7) with the rest of the web's way of composing (W13-1 to W13-8).
//
// A file is chosen through the browser's own picker (Playwright's filechooser event), and a drag is a DragEvent that
// carries a DataTransfer the page made. Every length is read back from the tokens — never from a number written here.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, type TestInfo, expect, test } from '@playwright/test';
import { type Fixture, avatarPicture, loadSpec, missingWords, mountFixtures, resolveToken, setWords, tab, tabTo, withoutIconFont } from '../../../test/harness.js';

const spec = loadSpec('file-upload');
type P = Page;
const TAG = 'tanrei-file-upload';
const ITEM = 'tanrei-file-item';
const PICKER = 'tanrei-file-picker';
const WORDS = { removeLabel: 'Remove', retryLabel: 'Try again' };

const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] ${TAG}`);
/** FUP-56: its one file picker, in its shadow root. */
const picker = (page: P, id: string) => host(page, id).locator(PICKER);
/** The file picker's own parts, inside the file picker: its box, and what stands in it. */
const chooser = (page: P, id: string) => picker(page, id).locator('.group > .chooser');
const own = (page: P, id: string, name: 'icon' | 'label' | 'supporting' | 'line' | 'outline') => picker(page, id).locator(`.group > .chooser > .${name}`);
const emptyText = (page: P, id: string) => picker(page, id).locator('.group > .chooser > .line > .selection');
const list = (page: P, id: string) => host(page, id).locator('.group > tanrei-list.list');
const region = (page: P, id: string) => host(page, id).locator('.group > .announce');
const trigger = (page: P, id: string) => host(page, id).locator(':scope > [slot="trigger"]');
/** The rows the product gave: its own file items, in the light DOM. */
const rows = (page: P, id: string) => host(page, id).locator(`:scope > ${ITEM}`);
const row = (page: P, id: string, index: number) => rows(page, id).nth(index);
/** The parts of a file item, inside the file item. */
const inRow = (r: Locator, name: 'item' | 'body' | 'icon' | 'headline' | 'supporting' | 'said' | 'mark' | 'retry' | 'remove' | 'bar' | 'lead' | 'end' | 'text' | 'box' | 'preview') =>
  r.locator(
    {
      item: '.item',
      body: '.item > .body',
      icon: '.item > .body .media > .icon',
      headline: '.item > .body > .text > .headline',
      supporting: '.item > .body > .text > .supporting',
      said: '.item > .body > .text > .supporting > .said',
      mark: '.item > .body > .text > .supporting > .mark.status',
      retry: '.item > .end > .action.retry',
      remove: '.item > .end > .action.remove',
      bar: '.item tanrei-progress-indicator',
      lead: '.item > .body > .lead',
      end: '.item > .end',
      text: '.item > .body > .text',
      box: '.item > .over',
      preview: '.item > .body .media > img.preview',
    }[name],
  );
const T = (name: string) => `--tanrei-comp-file-upload-${name}`;
const token = (page: P, name: string) => resolveToken(page, T(name));
const box = async (locator: Locator) => (await locator.boundingBox())!;
const css = (locator: Locator, property: string, pseudo?: string) => locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p!), [property, pseudo ?? null] as const);
const near = (actual: number, expected: number, message = '', tolerance = 0.6) => expect(Math.abs(actual - expected), `${message}: ${actual} ≈ ${expected}`).toBeLessThanOrEqual(tolerance);
function logged(page: P, type: 'warning' | 'error' = 'warning') {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === type) seen.push(message.text());
  });
  return seen;
}
type Extra = Partial<Fixture>;
// The tests of the product's own rows give their rows, as the product does that owns them: `rows` is `given` unless a test says `own`.
const fx = (id: string, props: Fixture['props'], extra: Extra = {}): Fixture => ({ id, props: { rows: 'given', ...props }, slots: { trigger: 'Choose files' }, ...extra });
const file = (value: string, name: string, props: Record<string, string | number | boolean> = {}) => ({ kind: 'file', props: { value, name, ...props } });
/**
 * The picker is asked of the browser for the whole of a test, not at each wait. Playwright takes the browser's picker
 * over only while the page has a `filechooser` listener, and tells the browser so without waiting for its answer: a
 * wait that begins with a key press — which, unlike a click, is sent at once — can reach the page before the browser
 * has been told again. A listener held from the mount keeps it taken.
 */
const mount = (page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) => {
  page.on('filechooser', () => {});
  return mountFixtures(page, spec, { icons: true, fixtures, ...options });
};
const mountSpec = (page: P, ...ids: string[]) => mount(page, ids.length ? spec.fixtures.filter((f) => ids.includes(f.id)) : spec.fixtures);
const frames = (page: P, count = 3) =>
  page.evaluate(async (n) => {
    for (let i = 0; i < n; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  }, count);
/** One turn of the page: what the file upload collects in a turn has been said. */
const turn = (page: P) => page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 20)));
/** The deepest focused element, as `tag.class` through the shadow roots it is in. */
const focused = (page: P) =>
  page.evaluate(() => {
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    if (!active) return '';
    const within = (active.getRootNode() as ShadowRoot).host;
    return `${within ? `${within.localName}${within.getAttribute('value') ? `[${within.getAttribute('value')}]` : ''} ` : ''}${active.localName}${active.classList.length ? `.${[...active.classList].join('.')}` : ''}`;
  });

// ── What the product hears ───────────────────────────────────────────────────────────────────────────────────────
interface Heard {
  type: string;
  files?: string[];
  reasons?: string[];
  value?: string;
}
/** Records select, reject, change, click, remove and retry on the page, from now on. */
const listen = (page: P) =>
  page.evaluate(() => {
    const heard: unknown[] = [];
    (window as unknown as { __heard: unknown[] }).__heard = heard;
    document.addEventListener('select', (event) => {
      const detail = (event as CustomEvent<{ files: File[] }>).detail;
      if (detail?.files) heard.push({ type: 'select', files: detail.files.map((f) => f.name) });
    });
    document.addEventListener('reject', (event) => {
      const detail = (event as CustomEvent<{ files: { file: File; reason: string }[] }>).detail;
      heard.push({ type: 'reject', files: detail.files.map((f) => f.file.name), reasons: detail.files.map((f) => f.reason) });
    });
    for (const type of ['remove', 'retry']) document.addEventListener(type, (event) => heard.push({ type, value: (event as CustomEvent<{ value: string }>).detail.value }));
    // A file item's own click is a CustomEvent with the row's value; a native click is not one of the rows'.
    document.addEventListener('click', (event) => {
      if (event instanceof CustomEvent) heard.push({ type: 'click', value: (event as CustomEvent<{ value: string }>).detail.value });
    });
    // FUP-47: emitted only while rows is own.
    document.addEventListener('change', (event) => {
      const detail = (event as CustomEvent<{ files?: File[] }>).detail;
      if (detail?.files) heard.push({ type: 'change', files: detail.files.map((f) => f.name) });
    });
  });
const heard = (page: P) => page.evaluate(() => (window as unknown as { __heard: Heard[] }).__heard);
const forget = (page: P) => page.evaluate(() => void ((window as unknown as { __heard: Heard[] }).__heard.length = 0));

interface Given {
  name: string;
  type?: string;
  size?: number;
  /** The time of last change the browser reports: with the name and the size, what makes two files the same file (FUP-43). */
  modified?: number;
}
const payload = (files: Given[]) => files.map((f) => ({ name: f.name, mimeType: f.type ?? '', buffer: Buffer.alloc(f.size ?? 4, 1), ...(f.modified === undefined ? {} : { lastModified: f.modified }) }));
/** Chooses files in the browser's own picker, opened by `opener` (the trigger's click unless another is given). */
async function choose(page: P, id: string, files: Given[], opener: () => Promise<unknown> = () => trigger(page, id).click()) {
  const [chosen] = await Promise.all([page.waitForEvent('filechooser'), opener()]);
  await chosen.setFiles(payload(files));
  return chosen;
}
/**
 * A drag event on the file picker's area (or on a part inside it), carrying a DataTransfer the page made: files, or
 * text alone. Returns whether the area took the event and the effect it named.
 */
const drag = (page: P, id: string, type: 'dragenter' | 'dragover' | 'dragleave' | 'drop', files: Given[], { text = false, on = '' }: { text?: boolean; on?: string } = {}) =>
  host(page, id).evaluate(
    (el, [t, given, withText, where]) => {
      const data = new DataTransfer();
      // What the area names as the effect: a DataTransfer the page made keeps none outside a real drag, so it is recorded.
      let effect = 'unset';
      Object.defineProperty(data, 'dropEffect', { configurable: true, get: () => effect, set: (value: string) => void (effect = value) });
      for (const f of given) data.items.add(new File([new Uint8Array(f.size ?? 4)], f.name, { type: f.type ?? '' }));
      if (withText) data.setData('text/plain', 'words');
      const area = el.shadowRoot!.querySelector('tanrei-file-picker')!.shadowRoot!.querySelector('.chooser')!;
      const target = where === 'trigger' ? el.querySelector('[slot="trigger"]')! : where ? area.querySelector(where)! : area;
      const event = new DragEvent(t, { bubbles: true, cancelable: true, composed: true, dataTransfer: data });
      target.dispatchEvent(event);
      return { taken: event.defaultPrevented, effect, carried: !!event.dataTransfer };
    },
    [type, files, text, on] as const,
  );
const condition = (page: P, id: string) => chooser(page, id).getAttribute('data-drag');
const PDF: Given = { name: 'brief.pdf', type: 'application/pdf' };
const PNG: Given = { name: 'plan.png', type: 'image/png' };
const TXT: Given = { name: 'notes.txt', type: 'text/plain' };
/** The description the file picker gave the trigger: on the native button inside the product's own Button. */
const described = (page: P, id: string) => trigger(page, id).locator('[part="container"]').getAttribute('aria-description');
/** What the file upload's own shadow tree holds besides its members: every element that is not a member's, and the text among them. */
const ownTree = (page: P, id: string) =>
  host(page, id).evaluate((el) => ({
    elements: [...el.shadowRoot!.querySelectorAll('*')].filter((node) => !node.localName.includes('-')).map((node) => `${node.localName}${node.classList.length ? `.${[...node.classList].join('.')}` : ''}`),
    text: [...el.shadowRoot!.querySelectorAll('*')]
      .filter((node) => !node.localName.includes('-') && !node.classList.contains('announce') && !node.closest('.announce'))
      .flatMap((node) => [...node.childNodes].filter((child) => child.nodeType === Node.TEXT_NODE).map((child) => child.textContent!.trim()))
      .join(''),
  }));

/** Sets properties on an element and waits for its update. */
const set = (locator: Locator, props: Record<string, unknown>) =>
  locator.evaluate(async (el, given) => {
    Object.assign(el, given);
    await (el as Element & { updateComplete?: Promise<unknown> }).updateComplete;
  }, props);
/** Reads properties of an element. */
const get = (locator: Locator, names: string[]) => locator.evaluate((el, given) => given.map((name) => (el as unknown as Record<string, unknown>)[name]), names);
/** What the file upload gives every file item (FUP-58), as the file item's own props and attributes say them. */
const SHARED = ['form', 'preview', 'fit', 'nameHidden', 'width', 'height', 'removeLabel', 'retryLabel', 'disabled'];
/** A real picture as a `File`, made in the page from the package's own fixture picture: what a person chooses when they choose a photo. */
const addPictures = (page: P, id: string, names: string[], others: Given[] = []) =>
  host(page, id).evaluate(
    (el, [picture, pictures, rest]) => {
      const bytes = Uint8Array.from(atob(picture.slice(picture.indexOf(',') + 1)), (c) => c.charCodeAt(0));
      const files = [...pictures.map((name, index) => new File([bytes, new Uint8Array(index)], name, { type: 'image/png', lastModified: 1000 })), ...rest.map((f) => new File([new Uint8Array(f.size ?? 4)], f.name, { type: f.type ?? '', lastModified: 1000 }))];
      return (el as unknown as { add(files: File[]): { file: File; reason: string }[] }).add(files).map((refused) => `${refused.file.name}:${refused.reason}`);
    },
    [avatarPicture(), names, others] as const,
  );
/** Counts the addresses made for files and the ones released, from now on (FUP-51, FIT-7). */
const spyOnAddresses = (page: P) =>
  page.evaluate(() => {
    const made: string[] = [];
    const released: string[] = [];
    (window as unknown as { __addresses: { made: string[]; released: string[] } }).__addresses = { made, released };
    const [create, revoke] = [URL.createObjectURL.bind(URL), URL.revokeObjectURL.bind(URL)];
    URL.createObjectURL = (object: Blob | MediaSource) => {
      const address = create(object);
      made.push(address);
      return address;
    };
    URL.revokeObjectURL = (address: string) => {
      released.push(address);
      revoke(address);
    };
  });
/** The addresses made, the ones of them still held, and the ones the rows now draw. */
const addresses = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const { made, released } = (window as unknown as { __addresses: { made: string[]; released: string[] } }).__addresses;
    const drawn = [...el.shadowRoot!.querySelectorAll('tanrei-file-item'), ...el.querySelectorAll('tanrei-file-item')].map((item) => item.shadowRoot?.querySelector('img.preview')?.getAttribute('src') ?? '').filter(Boolean);
    return { made: made.length, held: made.filter((address) => !released.includes(address)).length, twice: released.length - new Set(released).size, drawn: drawn.length, drawnAreMade: drawn.every((address) => made.includes(address) && !released.includes(address)), one: new Set(drawn).size === drawn.length };
  });

test.describe('behavior', () => {
  test('FUP-1: its file picker at the top, as wide as the file upload, and — while it holds a row — the list list.gap below it; as wide as its layout gives it and as tall as its parts; no container, fill or edge around the whole, and no label, help, error text or requirement mark of its own', async ({ page }) => {
    await mountSpec(page, 'button-multiple', 'drop-area', 'own-many', 'button-rtl');
    const gap = await token(page, 'list-gap');
    for (const id of ['button-multiple', 'own-many', 'button-rtl']) {
      const [whole, above, below] = [await box(host(page, id)), await box(picker(page, id)), await box(list(page, id))];
      near(whole.width, 360, `${id}: as wide as its layout gives it`);
      near(above.x, whole.x, `${id}: the file picker from the start edge`);
      near(above.y, whole.y, `${id}: the file picker at the top`);
      near(above.width, whole.width, `${id}: the file picker across the width`);
      near(below.y - (above.y + above.height), gap, `${id}: list.gap`);
      near(below.x, whole.x, `${id}: the list from the start edge`);
      near(below.width, whole.width, `${id}: the list across the width`);
      near(whole.height, above.height + gap + below.height, `${id}: as tall as its parts`);
    }
    // No row: no list, and no room for one.
    near((await box(host(page, 'drop-area'))).height, (await box(picker(page, 'drop-area'))).height, 'as tall as its file picker');
    await expect(list(page, 'drop-area')).toBeHidden();
    for (const id of ['button-multiple', 'drop-area', 'own-many']) {
      // Nothing is drawn around the whole, or around or behind the rows.
      const around = await host(page, id).evaluate((el) =>
        [el, ...el.shadowRoot!.querySelectorAll('.group, .list, .rows')].map((node) => {
          const s = getComputedStyle(node);
          return [s.backgroundColor, s.backgroundImage, s.borderTopWidth, s.borderInlineStartWidth, s.boxShadow, s.outlineStyle, s.paddingTop, s.paddingInlineStart].join(' | ');
        }),
      );
      for (const each of around) expect(each, id).toBe('rgba(0, 0, 0, 0) | none | 0px | 0px | none | none | 0px | 0px');
      // Its own tree is the group, the list and the live region: no text, no label, no mark.
      const tree = await ownTree(page, id);
      expect(tree.elements.filter((name) => name !== 'slot'), id).toEqual(['div.group', 'div.announce']);
      expect(tree.text, `${id}: no word of its own`).toBe('');
    }
  });

  test('FUP-2: while the list holds no row the file picker is given emptyText as its selectionText — the instance’s, else the product’s words — and none while it holds a row, for the product’s rows and for its own; whether nothing is chosen is the file upload’s to know', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => ['button', 'button-chosen', 'own-one'].includes(f.id)), fx('words', { label: 'Attachment' }), fx('area', { label: 'Attachment', layout: 'drop-area', emptyText: 'No file chosen', dropText: 'Drag a file here' })]);
    const given = (id: string) => picker(page, id).evaluate((el) => (el as unknown as { selectionText: string }).selectionText);
    expect(await given('button')).toBe('No file chosen');
    await expect(emptyText(page, 'button')).toHaveText('No file chosen');
    expect(await given('button-chosen'), 'a row says what is chosen').toBe('');
    await expect(emptyText(page, 'button-chosen')).toHaveCount(0);
    // The product removes its row: nothing is chosen again, at once.
    await row(page, 'button-chosen', 0).evaluate((el) => el.remove());
    await expect.poll(() => given('button-chosen')).toBe('No file chosen');
    await expect(emptyText(page, 'button-chosen')).toHaveText('No file chosen');
    await host(page, 'button-chosen').evaluate((el) => el.insertAdjacentHTML('beforeend', '<tanrei-file-item value="n" name="new.pdf"></tanrei-file-item>'));
    await expect.poll(() => given('button-chosen')).toBe('');
    // Its own rows: a kept file is a row, and so is a refused one.
    expect(await given('own-one')).toBe('');
    await host(page, 'own-one').evaluate((el) => (el as Upload).clear());
    await expect.poll(() => given('own-one')).toBe('No file chosen');
    await give(page, 'own-one', [MOV]);
    await expect.poll(() => given('own-one'), { message: 'a refused file’s row is a row' }).toBe('');
    // The product's words where the instance gives none; with neither, nothing.
    expect(await given('words')).toBe('');
    await setWords(page, { noFileText: 'Nothing chosen yet' });
    await expect.poll(() => given('words')).toBe('Nothing chosen yet');
    expect(await given('button'), 'the instance’s own wins').toBe('No file chosen');
    // The drop-area layout is given it too: that it draws none there is the file picker's (FPK-3).
    expect(await given('area')).toBe('No file chosen');
  });

  test('FUP-7: it never uploads and never reads — choosing, dropping, a row’s click, remove and retry make no request, and no reader, stream or address is made: with itemPreview false no address is made for an image either, and the file upload itself makes none in any case', async ({ page }) => {
    const requests: string[] = [];
    await mount(page, [fx('given', { label: 'Attachments', layout: 'drop-area', multiple: true, dropText: 'Drag files here', ...WORDS }, { items: [file('a', 'photo.png', { interactive: true }), file('e', 'site.png', { status: 'error', errorText: 'Lost.', retryable: true })] })]);
    page.on('request', (request) => requests.push(request.url()));
    await spyOnReading(page);
    await listen(page);
    const id = 'given';
    // A product's row that is given a real picture, with no picture asked for.
    await row(page, id, 0).evaluate((el, picture) => {
      const bytes = Uint8Array.from(atob(picture.slice(picture.indexOf(',') + 1)), (c) => c.charCodeAt(0));
      (el as unknown as { file: File }).file = new File([bytes], 'photo.png', { type: 'image/png' });
    }, avatarPicture());
    await choose(page, id, [PNG, PDF]);
    if ((await drag(page, id, 'dragenter', [PNG])).carried) await drag(page, id, 'drop', [PNG]);
    await inRow(row(page, id, 0), 'body').click();
    await inRow(row(page, id, 1), 'retry').click();
    await inRow(row(page, id, 1), 'remove').click();
    await turn(page);
    expect((await heard(page)).map((h) => h.type).filter((type) => type !== 'reject')).toEqual(expect.arrayContaining(['select', 'click', 'retry', 'remove']));
    expect(requests).toEqual([]);
    expect(await used(page)).toEqual([]);
    // It keeps none of them while rows is given, and draws only what the product gave back.
    expect(await host(page, id).evaluate((el) => (el as Upload).files.length)).toBe(0);
    await expect(rows(page, id)).toHaveCount(2);
  });

  test('FUP-9: while rows is given it keeps none of what its file picker passed and judges the room that is left — beyond maxFiles less the rows the list holds, count — then emits select once with the files that found room and reject once with the files the file picker refused, in its order, and then those refused for want of room; no row is added, no error drawn and no word said', async ({ page }) => {
    await mount(page, [
      fx('room', { label: 'Attachments', multiple: true, maxFiles: 3, accept: ['.pdf'], maxSize: 10, constraintsText: 'PDF, 3 at most', ...WORDS }, { items: [file('a', 'one.pdf'), file('b', 'two.pdf')] }),
      fx('single', { label: 'Attachment', maxFiles: 1, constraintsText: 'One file', ...WORDS }, { items: [file('a', 'one.pdf')] }),
    ]);
    await listen(page);
    const id = 'room';
    await choose(page, id, [{ name: 'a.pdf', type: 'application/pdf' }, { name: 'big.pdf', type: 'application/pdf', size: 20 }, { name: 'c.pdf', type: 'application/pdf' }, TXT, { name: 'd.pdf', type: 'application/pdf' }]);
    await turn(page);
    // One file found room; the file picker's refusals come first, in its order, then those for want of room.
    expect(await heard(page)).toEqual([
      { type: 'select', files: ['a.pdf'] },
      { type: 'reject', files: ['big.pdf', 'notes.txt', 'c.pdf', 'd.pdf'], reasons: ['size', 'type', 'count', 'count'] },
    ]);
    // Nothing is kept, added, replaced, drawn as an error or said.
    await expect(rows(page, id)).toHaveCount(2);
    await expect(ownRows(page, id)).toHaveCount(0);
    expect(await get(host(page, id), ['error'])).toEqual([false]);
    expect(await host(page, id).evaluate((el) => (el as Upload).files.length)).toBe(0);
    expect(await said(page, id)).toEqual([]);
    // The room is measured against the rows the list holds now: the product added one, so none is left.
    await host(page, id).evaluate((el) => el.insertAdjacentHTML('beforeend', '<tanrei-file-item value="c" name="a.pdf"></tanrei-file-item>'));
    await forget(page);
    await choose(page, id, [{ name: 'e.pdf', type: 'application/pdf' }]);
    await turn(page);
    expect(await heard(page)).toEqual([{ type: 'reject', files: ['e.pdf'], reasons: ['count'] }]);
    // Without multiple maxFiles measures nothing: the product replaces the row it had.
    await forget(page);
    await choose(page, 'single', [PDF]);
    await turn(page);
    expect(await heard(page)).toEqual([{ type: 'select', files: ['brief.pdf'] }]);
    await expect(rows(page, 'single')).toHaveCount(1);
  });

  test('FUP-16: error is given to its file picker, which exposes the trigger as invalid, and nothing else is drawn for it — no file item changes; the file upload never sets error itself, not for a refused file, a failed row or a missing value', async ({ page }) => {
    await mount(page, [
      fx('rows', { label: 'Attachments', layout: 'drop-area', multiple: true, dropText: 'Drag files here', ...WORDS }, { items: [file('a', 'one.pdf'), file('e', 'site.png', { status: 'error', errorText: 'Lost.', retryable: true })] }),
      ownFx('own', { accept: ['.pdf'], constraintsText: 'PDF', typeErrorText: 'PDF only.', required: true }),
    ]);
    const id = 'rows';
    const itemsDrawn = () => rows(page, id).evaluateAll((els) => els.map((el) => el.shadowRoot!.innerHTML.replace(/<!--.*?-->/g, '')));
    const before = await itemsDrawn();
    await set(host(page, id), { error: true });
    expect(await get(picker(page, id), ['error'])).toEqual([true]);
    await expect(trigger(page, id).locator('[part="container"]')).toHaveAttribute('aria-invalid', 'true');
    expect(await chooser(page, id).getAttribute('data-error')).not.toBeNull();
    expect(await itemsDrawn(), 'no file item changes under the error condition').toEqual(before);
    await set(host(page, id), { error: false });
    expect(await get(picker(page, id), ['error'])).toEqual([false]);
    // Never set by itself: a failed row, a refused file, a missing value.
    expect(await get(host(page, id), ['error'])).toEqual([false]);
    await give(page, 'own', [MOV]);
    await expect(ownRows(page, 'own')).toHaveCount(1);
    expect(await host(page, 'own').evaluate((el) => [(el as unknown as { error: boolean }).error, (el as unknown as { validity: ValidityState }).validity.valueMissing])).toEqual([false, true]);
    expect(await get(picker(page, 'own'), ['error'])).toEqual([false]);
    expect(await chooser(page, 'own').getAttribute('data-error')).toBeNull();
  });

  test('FUP-17: each row is one file item, in the order the product gave them — as a column, the List’s small gap apart, each as wide as the file upload; or, with itemForm tile, as a strip from the start edge that wraps where the width ends, the List’s small gap apart along both directions, the tiles of one line aligned at their tops, each of the size itemWidth and itemHeight give; not sorted, grouped, numbered or counted; with no row there is no list, no room for one and none exposed; an itemForm it does not know is a column, and is reported', async ({ page }) => {
    const warnings = logged(page);
    await mount(page, [...spec.fixtures.filter((f) => ['button-multiple', 'tiles', 'tiles-sized', 'drop-area'].includes(f.id)), fx('unknown', { label: 'Attachments', multiple: true, itemForm: 'grid', ...WORDS }, { items: [file('a', 'one.pdf'), file('b', 'two.pdf')] })]);
    const gap = await resolveToken(page, '--tanrei-comp-list-gap-small');
    // A column.
    for (const id of ['button-multiple', 'unknown']) {
      const whole = await box(host(page, id));
      const each = await Promise.all((await rows(page, id).all()).map(box));
      for (const [index, one] of each.entries()) {
        near(one.x, whole.x, `${id} row ${index}: from the start edge`);
        near(one.width, whole.width, `${id} row ${index}: as wide as the file upload`);
        if (index) near(one.y - (each[index - 1]!.y + each[index - 1]!.height), gap, `${id} row ${index}: list.item-gap`);
      }
      await expect(list(page, id)).toHaveAttribute('data-form', 'row');
    }
    expect(await rows(page, 'button-multiple').evaluateAll((els) => els.map((el) => el.getAttribute('name'))), 'in the order given').toEqual(['brief.pdf', 'floor-plan.png', 'survey.pdf']);
    expect(await rows(page, 'unknown').evaluateAll((els) => els.map((el) => el.shadowRoot!.querySelector('.item')!.getAttribute('data-form')))).toEqual(['row', 'row']);
    await turn(page);
    expect(warnings.filter((w) => w.includes('FUP-17') && w.includes('"grid"'))).toHaveLength(1);
    // A strip of tiles: three on a line of 360, the fourth on the next.
    {
      const id = 'tiles';
      const whole = await box(host(page, id));
      const each = await Promise.all((await rows(page, id).all()).map(box));
      expect(each).toHaveLength(4);
      near(each[0]!.x, whole.x, 'the strip begins at the start edge');
      for (const index of [1, 2]) {
        near(each[index]!.y, each[0]!.y, `tile ${index}: aligned at the top`);
        near(each[index]!.x - (each[index - 1]!.x + each[index - 1]!.width), gap, `tile ${index}: list.item-gap along the line`);
      }
      expect(each[2]!.x + each[2]!.width, 'never past the width').toBeLessThanOrEqual(whole.x + whole.width + 0.6);
      near(each[3]!.x, whole.x, 'the next line begins at the start edge');
      near(each[3]!.y - Math.max(...each.slice(0, 3).map((one) => one.y + one.height)), gap, 'list.item-gap between the lines');
      // The tiles of one line are not stretched to the tallest.
      expect(new Set(each.slice(0, 3).map((one) => Math.round(one.height))).size, 'a tile is as tall as itself').toBeGreaterThan(1);
      await expect(list(page, id)).toHaveAttribute('data-form', 'tile');
    }
    // The size itemWidth and itemHeight give, for every tile.
    for (const one of await rows(page, 'tiles-sized').all()) {
      const size = await box(inRow(one, 'box'));
      near(size.width, 160, 'itemWidth');
      near(size.height, 90, 'itemHeight');
    }
    // Not numbered or counted: the list holds the items and nothing else.
    expect((await ownTree(page, 'tiles')).text).toBe('');
    // No row: no list, no room, none exposed — and one that comes is drawn at once.
    await expect(list(page, 'drop-area')).toBeHidden();
    await expect(stage(page, 'drop-area').getByRole('list')).toHaveCount(0);
    await host(page, 'drop-area').evaluate((el) => el.setAttribute('rows', 'given'));
    await host(page, 'drop-area').evaluate((el) => el.insertAdjacentHTML('beforeend', '<tanrei-file-item value="n" name="new.pdf" remove-label="Remove"></tanrei-file-item>'));
    await expect(list(page, 'drop-area')).toBeVisible();
    await expect(stage(page, 'drop-area').getByRole('list')).toHaveCount(1);
  });

  test('FUP-21: a product’s file item that emits click, remove or retry is heard by the product as the row’s own, with the row’s value, and the file upload does nothing else — no row is removed, no status changed, no focus moved; the stops of the rows follow the trigger in the order of the rows, each row’s as the file item gives them — its body where it is pressable, retry, remove — with no stop of the file upload’s own and no arrow key, Delete or Backspace handled', async ({ page }) => {
    await mount(page, [fx('rows', { label: 'Attachments', multiple: true, ...WORDS }, { items: [file('a', 'photo.png', { interactive: true }), file('e', 'site.png', { status: 'error', errorText: 'Lost.', retryable: true }), file('d', 'contract.pdf', { href: '#contract', readOnly: true })] })]);
    const id = 'rows';
    await page.evaluate(() => {
      const targets: string[] = [];
      (window as unknown as { __targets: string[] }).__targets = targets;
      for (const type of ['click', 'remove', 'retry']) document.addEventListener(type, (event) => event instanceof CustomEvent && targets.push(`${type}:${(event.target as Element).localName}[${(event.target as Element).getAttribute('value')}]`));
    });
    await listen(page);
    await inRow(row(page, id, 0), 'body').click();
    await inRow(row(page, id, 1), 'retry').click();
    await inRow(row(page, id, 1), 'remove').focus();
    await page.keyboard.press('Enter');
    await turn(page);
    expect(await heard(page)).toEqual([
      { type: 'click', value: 'a' },
      { type: 'retry', value: 'e' },
      { type: 'remove', value: 'e' },
    ]);
    expect(await page.evaluate(() => (window as unknown as { __targets: string[] }).__targets), 'the row’s own event').toEqual(['click:tanrei-file-item[a]', 'retry:tanrei-file-item[e]', 'remove:tanrei-file-item[e]']);
    // Nothing else: the rows, their statuses and the focus are as they were.
    await expect(rows(page, id)).toHaveCount(3);
    expect(await get(row(page, id, 1), ['status', 'retryable'])).toEqual(['error', true]);
    expect(await focused(page)).toBe('tanrei-file-item[e] button.action.remove');
    // No key of the file upload's own.
    await forget(page);
    for (const key of ['ArrowDown', 'ArrowUp', 'ArrowRight', 'Delete', 'Backspace', 'Home', 'End']) await page.keyboard.press(key);
    await turn(page);
    expect(await heard(page)).toEqual([]);
    expect(await focused(page)).toBe('tanrei-file-item[e] button.action.remove');
    await expect(rows(page, id)).toHaveCount(3);
    // The stops: the trigger, then each row's in order, and nothing of the file upload's own.
    expect(await host(page, id).evaluate((el) => [el.tabIndex, el.shadowRoot!.delegatesFocus, [...el.shadowRoot!.querySelectorAll('.group, .list, .rows, .announce')].some((node) => (node as HTMLElement).tabIndex >= 0)])).toEqual([-1, false, false]);
    await trigger(page, id).focus();
    const stops: string[] = [];
    for (let index = 0; index < 5; index++) {
      await tab(page);
      stops.push(await focused(page));
    }
    expect(stops).toEqual(['tanrei-file-item[a] button.body.pressable', 'tanrei-file-item[a] button.action.remove', 'tanrei-file-item[e] button.action.retry', 'tanrei-file-item[e] button.action.remove', 'tanrei-file-item[d] a.body.pressable']);
  });

  test('FUP-24: a group named by label holding what its file picker exposes and, while there are rows, a list of them; the file picker is given no name, so it is no second group inside this one; a group without a name still renders and is reported', async ({ page, browserName }) => {
    const warnings = logged(page);
    await mount(page, [...spec.fixtures.filter((f) => ['button', 'button-chosen', 'drop-area'].includes(f.id)), fx('nameless', { constraintsText: 'Any file' })]);
    const group = (id: string, name: string) => stage(page, id).getByRole('group', { name, exact: true });
    await expect(group('button', 'Attachment')).toHaveCount(1);
    await expect(group('drop-area', 'Attachments')).toHaveCount(1);
    for (const id of ['button', 'button-chosen', 'drop-area']) {
      // One group of its own; each row's file item is the group it is alone, inside its list item (FUP-25).
      await expect(stage(page, id).getByRole('group'), `${id}: one group, and one for each row`).toHaveCount(1 + (await rows(page, id).count()));
      expect(await get(picker(page, id), ['label']), `${id}: the file picker has no name`).toEqual(['']);
      expect(await picker(page, id).locator('.group').getAttribute('role'), `${id}: and is no group`).toBeNull();
    }
    await expect(stage(page, 'button').getByRole('list')).toHaveCount(0);
    await expect(stage(page, 'button-chosen').getByRole('list', { name: 'Attachment' })).toHaveCount(1);
    // The group holds what the file picker exposes (the tree assistive technology is given follows the slots).
    await expect(host(page, 'drop-area')).toMatchAriaSnapshot(`
      - group "Attachments":
        - text: Drag files here, or choose them
        - button "Choose files"
        - text: PDF or PNG, up to 10 MB each
    `);
    // The trigger's description is the file picker's to write (FPK-17): the limits, then emptyText while it is drawn (FUP-2).
    expect(await described(page, 'button')).toBe('PDF, up to 10 MB No file chosen');
    expect(await described(page, 'button-chosen'), 'emptyText only while the list holds no row').toBe('PDF, up to 10 MB');
    if (browserName === 'chromium') {
      // What the engine computes: the group holds the button and the list, and the list its item.
      const client = await page.context().newCDPSession(page);
      await client.send('Accessibility.enable');
      const { nodes } = await client.send('Accessibility.getFullAXTree');
      const byId = new Map(nodes.map((node) => [node.nodeId, node]));
      const below = (id: string): string[] => (byId.get(id)!.childIds ?? []).flatMap((child) => {
        const node = byId.get(child)!;
        const role = String(node.role?.value);
        return node.ignored || ['generic', 'none', 'StaticText', 'InlineTextBox'].includes(role) ? below(child) : [`${role}:${node.name?.value ?? ''}`, ...below(child).map((line) => `  ${line}`)];
      });
      const named = nodes.filter((node) => node.role?.value === 'group' && node.name?.value === 'Attachment');
      expect(named.map((node) => below(node.nodeId))).toEqual([['button:Choose a file'], ['button:Choose a file', 'list:Attachment', '  listitem:', '    group:brief.pdf', '      button:Remove brief.pdf']]);
    }
    await turn(page);
    expect(warnings.filter((text) => text.includes('<tanrei-file-upload>') && text.includes('FUP-24') && text.includes('no accessible name'))).toHaveLength(1);
    await expect(host(page, 'nameless')).toBeVisible();
  });

  test('FUP-25: the rows are one list that takes the group’s name, and each file item is one item of that list in the place of the group it is when it stands alone — the product’s own and the ones the file upload makes; what an item reads is the file item’s', async ({ page, browserName }) => {
    await mountSpec(page, 'drop-area-statuses', 'own-refused');
    for (const [id, drew, count] of [['drop-area-statuses', rows(page, 'drop-area-statuses'), 6], ['own-refused', ownRows(page, 'own-refused'), 4]] as const) {
      await expect(stage(page, id).getByRole('list', { name: 'Attachments', exact: true })).toHaveCount(1);
      await expect(stage(page, id).getByRole('list')).toHaveCount(1);
      await expect(drew).toHaveCount(count);
      // Each is held by an item of the List, and is itself the group named by its file that it is alone (FIT-19).
      expect(await drew.evaluateAll((els) => els.map((el) => [el.getAttribute('role'), (el.closest('tanrei-list-item') ?? el.assignedSlot?.closest('tanrei-list-item'))?.localName ?? ''].join(':'))), id).toEqual(Array(count).fill('group:tanrei-list-item'));
      await expect(stage(page, id).getByRole('listitem'), `${id}: one list item for each row`).toHaveCount(count);
      await expect(stage(page, id).getByRole('group'), `${id}: the file upload’s group and one for each row`).toHaveCount(1 + count);
    }
    if (browserName === 'chromium') {
      const client = await page.context().newCDPSession(page);
      await client.send('Accessibility.enable');
      const { nodes } = await client.send('Accessibility.getFullAXTree');
      const byId = new Map(nodes.map((node) => [node.nodeId, node]));
      const items = (node: (typeof nodes)[number]): string[] => (node.childIds ?? []).flatMap((child) => (byId.get(child)!.ignored || byId.get(child)!.role?.value === 'generic' ? items(byId.get(child)!) : [String(byId.get(child)!.role?.value)]));
      const lists = nodes.filter((node) => node.role?.value === 'list' && node.name?.value === 'Attachments');
      expect(lists.map((node) => items(node)), 'the items of each list, in order').toEqual([Array(6).fill('listitem'), Array(4).fill('listitem')]);
      // What an item reads is the file item's: each remove action is named with its file, in the order of the rows, and carries no description.
      const removes = nodes.filter((node) => node.role?.value === 'button' && String(node.name?.value ?? '').startsWith('Remove '));
      expect(removes.map((node) => node.name?.value)).toEqual(['brief.pdf', 'floor-plan.png', 'survey.pdf', 'contract.pdf', 'site-photo.png', 'scan-archive.pdf', 'brief.pdf', 'survey.pdf', 'holiday.mov', 'notes.pdf'].map((name) => `Remove ${name}`));
      expect(removes.map((node) => node.description?.value ?? '')).toEqual(Array(10).fill(''));
    }
  });

  test('FUP-26: exactly one live region, polite, says once and in the product’s words — a row that was added, a row that became done, a row that failed or whose error changed, and announcement when it is set or changed; one turn is one message in the order of the rows, and announcement set in that turn is said alone; progress, a removal, a drag and a refusal are not said, nor the rows it was first presented with', async ({ page }) => {
    await mountSpec(page, 'drop-area-statuses');
    const id = 'drop-area-statuses';
    await turn(page);
    const regions = await host(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('[aria-live]')].map((r) => r.getAttribute('aria-live')).concat([...el.querySelectorAll('tanrei-file-item')].flatMap((item) => [...item.shadowRoot!.querySelectorAll('[aria-live], [role="status"], [role="alert"]')].map(() => 'in a row'))));
    expect(regions).toEqual(['polite']);
    const said = () => region(page, id).evaluate((el) => [...el.children].map((line) => line.textContent));
    expect(await said(), 'the rows it was first presented with are not said').toEqual([]);
    const add = (items: [string, string, string][], announcement = '') =>
      host(page, id).evaluate(
        (el: HTMLElement & { announcement: string }, [list, sentence]) => {
          for (const [value, name, status] of list) {
            const item = document.createElement('tanrei-file-item');
            Object.assign(item, { value, name, statusText: status });
            el.append(item);
          }
          if (sentence) el.announcement = sentence;
        },
        [items, announcement] as const,
      );
    // Three rows in one task: one text.
    await add([['x', 'one.pdf', 'Waiting'], ['y', 'two.pdf', 'Waiting'], ['z', 'three.pdf', '']]);
    await expect.poll(said).toEqual(['one.pdf, Waiting', 'two.pdf, Waiting', 'three.pdf']);
    // With announcement in the same task: only it.
    await add([['p', 'four.pdf', 'Waiting'], ['q', 'five.pdf', 'Waiting']], '2 files added');
    await expect.poll(said).toEqual(['2 files added']);
    // Done, failed, and an error that changes — in the order of the rows, whatever the order they were set in.
    await host(page, id).evaluate((el) => {
      const items = [...el.querySelectorAll('tanrei-file-item')] as (HTMLElement & { status: string; statusText: string; errorText: string })[];
      Object.assign(items[2], { status: 'error', errorText: 'Refused by the server.' });
      Object.assign(items[0], { status: 'done', statusText: 'Uploaded' });
      items[4].errorText = 'Still no connection.';
    });
    await expect.poll(said).toEqual(['brief.pdf, Uploaded', 'survey.pdf, Refused by the server.', 'site-photo.png, Still no connection.']);
    // announcement alone, when it is changed.
    await host(page, id).evaluate((el: HTMLElement & { announcement: string }) => (el.announcement = '2 files were too large'));
    await expect.poll(said).toEqual(['2 files were too large']);
    // Not said: progress, a status that is neither done nor error, a removal, a drag, a refused file.
    await listen(page);
    await host(page, id).evaluate((el) => {
      const items = [...el.querySelectorAll('tanrei-file-item')] as (HTMLElement & { status: string; progress: number })[];
      items[1].progress = 0.9;
      items[5].status = 'uploading';
      items[3].remove();
    });
    await turn(page);
    await drag(page, id, 'dragenter', [PDF]);
    await drag(page, id, 'dragleave', []);
    await choose(page, id, [PDF]);
    await turn(page);
    expect(await said(), 'nothing new is written').toEqual(['2 files were too large']);
    expect(await css(region(page, id), 'position')).toBe('absolute');
    expect((await box(region(page, id))).width).toBeLessThanOrEqual(1);
    // No focus is moved to announce.
    expect(await focused(page)).not.toContain('announce');
  });

  test('FUP-27: no words of its own — emptyText is the instance’s, else the product’s (noFileText), else nothing is given to its file picker; removeLabel and retryLabel reach every file item as they were given, an empty one read from the product’s words and a missing one reported by the file item; a limit of maxFiles that is enforced and not said is reported; no sentence is built from accept, maxSize, maxFiles, a count of rows or a size', async ({ page }) => {
    const warnings = logged(page);
    await mount(page, [
      fx('bare', { label: 'Attachments', multiple: true, accept: ['.pdf'], maxSize: 1000, maxFiles: 2 }, { items: [file('e', 'site.png', { status: 'error', errorText: 'Lost.', retryable: true })] }),
      fx('named', { label: 'Attachments', multiple: true, removeLabel: 'Take away', retryLabel: 'Once more' }, { items: [file('e', 'site.png', { status: 'error', errorText: 'Lost.', retryable: true })] }),
      ownFx('own', { multiple: true, removeLabel: '' }),
    ]);
    await turn(page);
    const names = (id: string, drew = rows(page, id)) => drew.first().evaluate((el) => [...el.shadowRoot!.querySelectorAll('button.action')].map((button) => button.getAttribute('aria-label')));
    expect(await names('named'), 'as they were given').toEqual(['Once more', 'Take away']);
    expect(await get(row(page, 'named', 0), ['removeLabel', 'retryLabel']), 'through no prop of the item').toEqual(['', '']);
    // Nothing given: the actions are drawn unnamed, and the file item says so (FIT-20) — not the file upload.
    expect(await names('bare')).toEqual([null, null]);
    const missing = warnings.filter((w) => /removeLabel|retryLabel/.test(w) && w.includes('FIT-20'));
    expect(missing.length).toBeGreaterThan(0);
    expect(warnings.filter((w) => w.includes('<tanrei-file-upload>') && /removeLabel|retryLabel/.test(w)), 'the file upload reports no word of a file item’s').toEqual([]);
    // A limit of its own that is enforced and not said.
    expect(warnings.filter((w) => w.includes('<tanrei-file-upload>') && w.includes('FUP-27') && w.includes('max-files'))).toHaveLength(1);
    // No sentence is built: with every limit set and no text given, nothing is drawn but the trigger and the row.
    expect((await ownTree(page, 'bare')).text).toBe('');
    expect(await get(picker(page, 'bare'), ['selectionText', 'constraintsText', 'dropText', 'label'])).toEqual(['', '', '', '']);
    await expect(own(page, 'bare', 'supporting')).toHaveCount(0);
    expect(await described(page, 'bare'), 'nothing describes the trigger').toBeNull();
    // The product's words, for every instance that gives none — its own rows included.
    await setWords(page, { removeLabel: 'Remove', retryLabel: 'Try again', noFileText: 'No file' });
    await expect.poll(() => names('bare')).toEqual(['Try again', 'Remove']);
    expect(await names('named'), 'the instance’s own wins').toEqual(['Once more', 'Take away']);
    await expect.poll(() => get(picker(page, 'own'), ['selectionText'])).toEqual(['No file']);
    await give(page, 'own', [A]);
    await expect.poll(() => names('own', ownRows(page, 'own'))).toEqual(['Remove']);
  });

  test('FUP-28: disabled is given to its file picker, which disables the trigger, and to every file item — the product’s own, without changing a prop or an attribute of it, and the ones it makes — whose actions and body are disabled while what they show stays drawn and readable; neither select nor reject is emitted, and no row’s click, remove or retry', async ({ page }) => {
    await mount(page, [
      fx('given', { label: 'Attachments', layout: 'drop-area', multiple: true, dropText: 'Drag files here', ...WORDS }, { items: [file('a', 'photo.png', { interactive: true, sizeText: '2 MB' }), file('e', 'site.png', { status: 'error', errorText: 'Lost.', retryable: true })] }),
      ownFx('own', { multiple: true }),
    ]);
    await give(page, 'own', [A, B]);
    await listen(page);
    for (const id of ['given', 'own']) await set(host(page, id), { disabled: true });
    for (const [id, drew] of [['given', rows(page, 'given')], ['own', ownRows(page, 'own')]] as const) {
      expect(await get(picker(page, id), ['disabled']), `${id}: the file picker`).toEqual([true]);
      await expect(trigger(page, id).locator('[part="container"]'), id).toBeDisabled();
      for (const one of await drew.all()) {
        // Disabled through no prop of the item: the product's item says what it said.
        expect(await one.evaluate((el) => [(el as unknown as { disabled: boolean }).disabled, el.hasAttribute('disabled')]), id).toEqual([false, false]);
        for (const button of await one.locator('button').all()) await expect(button, id).toBeDisabled();
        await expect(inRow(one, 'headline'), `${id}: what was chosen is still readable`).toBeVisible();
        await expect(inRow(one, 'headline')).not.toHaveAttribute('aria-hidden', 'true');
      }
    }
    await expect(inRow(row(page, 'given', 0), 'supporting')).toHaveText('2 MB');
    // The person chooses, drops, presses and removes nothing.
    if ((await drag(page, 'given', 'dragenter', [PDF])).carried) await drag(page, 'given', 'drop', [PDF]);
    await inRow(row(page, 'given', 0), 'body').click({ force: true });
    await inRow(row(page, 'given', 1), 'retry').click({ force: true });
    await inRow(row(page, 'given', 1), 'remove').evaluate((el: HTMLElement) => el.click());
    await inRow(ownRow(page, 'own', 0), 'remove').evaluate((el: HTMLElement) => el.click());
    await turn(page);
    expect(await heard(page)).toEqual([]);
    await expect(ownRows(page, 'own')).toHaveCount(2);
    // Enabled again: each is as it was.
    for (const id of ['given', 'own']) await set(host(page, id), { disabled: false });
    await expect(trigger(page, 'given').locator('[part="container"]')).toBeEnabled();
    await expect(inRow(row(page, 'given', 1), 'remove')).toBeEnabled();
    await expect(inRow(ownRow(page, 'own', 0), 'remove')).toBeEnabled();
  });

  test('FUP-29: a row that is added, removed or changes its status is drawn at once, without a motion of the file upload’s own, and the rows after it take their new places at once — in a strip of tiles also where that moves a tile to another line', async ({ page }) => {
    await mountSpec(page, 'button-multiple', 'tiles');
    const moving = (id: string) =>
      host(page, id).evaluate((el) => {
        const mine = [el, ...el.shadowRoot!.querySelectorAll<HTMLElement>('.group, .list, .rows')];
        return { animations: el.shadowRoot!.getAnimations().length, transitions: mine.map((node) => getComputedStyle(node).transitionDuration).filter((duration) => duration.split(',').some((each) => Number.parseFloat(each) > 0)), animated: mine.map((node) => getComputedStyle(node).animationName).filter((name) => name !== 'none') };
      });
    // A column: the row after a removed one stands where it stood, in the same task that drew the change.
    {
      const id = 'button-multiple';
      const first = await box(row(page, id, 0));
      const after = await host(page, id).evaluate(async (el) => {
        el.querySelector('tanrei-file-item')!.remove();
        await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
        return el.querySelector('tanrei-file-item')!.getBoundingClientRect().y;
      });
      near(after, first.y, 'the next row takes its place at once');
      expect(await moving(id)).toEqual({ animations: 0, transitions: [], animated: [] });
      // Added, and its status changed.
      const added = await host(page, id).evaluate(async (el) => {
        el.insertAdjacentHTML('afterbegin', '<tanrei-file-item value="n" name="new.pdf" status="uploading"></tanrei-file-item>');
        await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
        const [one, two] = [...el.querySelectorAll('tanrei-file-item')].map((item) => item.getBoundingClientRect());
        return { y: one!.y, below: two!.y > one!.y };
      });
      near(added.y, first.y, 'a row that is added is drawn at once');
      expect(added.below).toBe(true);
      expect(await moving(id)).toEqual({ animations: 0, transitions: [], animated: [] });
    }
    // A strip: the fourth tile, on the second line, moves up to the first when a tile before it leaves.
    {
      const id = 'tiles';
      const [first, fourth] = [await box(row(page, id, 0)), await box(row(page, id, 3))];
      expect(fourth.y).toBeGreaterThan(first.y + first.height - 1);
      const now = await host(page, id).evaluate(async (el) => {
        el.querySelector('tanrei-file-item')!.remove();
        await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
        return [...el.querySelectorAll('tanrei-file-item')].map((item) => item.getBoundingClientRect().y);
      });
      expect(now).toHaveLength(3);
      for (const y of now) near(y, first.y, 'every tile on the first line, at once');
      expect(await moving(id)).toEqual({ animations: 0, transitions: [], animated: [] });
    }
  });

  test('FUP-30: when a row leaves while focus is on one of its stops, focus moves to the remove action of the row that followed, or of the one before where none follows, or to the trigger where no row is left; where that row has no remove action — a read-only file item — to its body where it is pressable, and otherwise on to the next such row or the trigger; a row added or changed otherwise moves no focus, and focus elsewhere is left alone', async ({ page }) => {
    await mountSpec(page, 'drop-area-statuses');
    const id = 'drop-area-statuses';
    // As a product does: on remove, the row is taken out.
    await page.evaluate(() => document.addEventListener('remove', (event) => (event.target as Element).remove()));
    const at = (value: string) => `tanrei-file-item[${value}] button.action.remove`;
    await inRow(row(page, id, 1), 'remove').focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => focused(page), { message: 'the row that followed' }).toBe(at('c'));
    // A person who removes several in a row goes on from where they were.
    await page.keyboard.press('Enter');
    await expect.poll(() => focused(page)).toBe(at('d'));
    // From the retry action too.
    await inRow(rows(page, id).filter({ has: page.locator('.action.retry') }), 'retry').focus();
    await rows(page, id).nth(2).evaluate((el) => el.remove());
    await expect.poll(() => focused(page)).toBe(at('f'));
    // The last row: the one before.
    await page.keyboard.press('Enter');
    await expect.poll(() => focused(page), { message: 'the row before, where none follows' }).toBe(at('d'));
    // A row added or changed moves no focus.
    await host(page, id).evaluate((el) => {
      el.insertAdjacentHTML('beforeend', '<tanrei-file-item value="n" name="new.pdf"></tanrei-file-item>');
      (el.querySelector('tanrei-file-item') as HTMLElement & { status: string }).status = 'uploading';
    });
    await turn(page);
    expect(await focused(page)).toBe(at('d'));
    // A product that writes the whole list again: the row that now stands where it stood.
    await host(page, id).evaluate((el) => {
      for (const item of [...el.querySelectorAll('tanrei-file-item')]) item.remove();
      el.insertAdjacentHTML('beforeend', '<tanrei-file-item value="a2" name="a.pdf"></tanrei-file-item><tanrei-file-item value="n2" name="n.pdf"></tanrei-file-item>');
    });
    await expect.poll(() => focused(page)).toBe(at('n2'));
    // No row is left: the trigger.
    await host(page, id).evaluate((el) => {
      for (const item of [...el.querySelectorAll('tanrei-file-item')]) item.remove();
    });
    await expect.poll(() => focused(page), { message: 'the trigger where no row is left' }).toContain('tanrei-button');
    // Focus elsewhere is left alone.
    await mountSpec(page, 'drop-area-statuses');
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<button id="start">start</button>'));
    await page.locator('#start').focus();
    await row(page, id, 0).evaluate((el) => el.remove());
    await turn(page);
    expect(await focused(page)).toBe('button');
    // A read-only neighbour has no remove action: its body where that is pressable.
    await mount(page, [
      fx('link', { label: 'Attachments', multiple: true, ...WORDS }, { items: [file('x', 'x.pdf'), file('r', 'kept.pdf', { href: '#kept', readOnly: true }), file('y', 'y.pdf')] }),
      fx('plain', { label: 'Attachments', multiple: true, ...WORDS }, { items: [file('x', 'x.pdf'), file('r', 'kept.pdf', { readOnly: true }), file('y', 'y.pdf')] }),
      fx('last', { label: 'Attachments', multiple: true, ...WORDS }, { items: [file('r', 'kept.pdf', { readOnly: true }), file('x', 'x.pdf')] }),
    ]);
    await page.evaluate(() => document.addEventListener('remove', (event) => (event.target as Element).remove()));
    await inRow(row(page, 'link', 0), 'remove').focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => focused(page), { message: 'the body of a read-only row that is a link' }).toBe('tanrei-file-item[r] a.body.pressable');
    // Neither a remove action nor a pressable body: on to the next row that has one.
    await inRow(row(page, 'plain', 0), 'remove').focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => focused(page), { message: 'on to the next row' }).toBe(at('y'));
    // And where no row can take it, the trigger.
    await inRow(row(page, 'last', 1), 'remove').focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => focused(page), { message: 'the trigger, where no row can take focus' }).toContain('tanrei-button button');
    await expect(rows(page, 'last')).toHaveCount(1);
  });

  test('FUP-31: in a form it is one control — under its name it submits, in the order of the rows, the file of every row that was given one, whatever the row’s status, and nothing while disabled, by itself or by its fieldset; it reports a missing value with the browser’s own message while required and no row carries a file; a reset and a restored state change nothing', async ({ page, browserName }) => {
    await mount(page, [fx('a', { label: 'Attachments', multiple: true, name: 'attachments', ...WORDS } as Fixture['props'], { items: [file('a', 'first.pdf'), file('b', 'none.pdf'), file('c', 'third.png', { status: 'error', errorText: 'Lost.' })] })]);
    const id = 'a';
    await page.evaluate(() => {
      const upload = document.querySelector('tanrei-file-upload')!;
      upload.setAttribute('name', 'attachments');
      const form = document.createElement('form');
      form.id = 'f';
      form.method = 'post';
      form.enctype = 'multipart/form-data';
      const set = document.createElement('fieldset');
      upload.before(form);
      set.append(upload);
      form.append(set, Object.assign(document.createElement('input'), { name: 'note', defaultValue: 'hello' }), Object.assign(document.createElement('button'), { type: 'reset', id: 'reset', textContent: 'Reset' }));
    });
    const submitted = () =>
      page.evaluate(() =>
        [...new FormData(document.querySelector('form')!).entries()].map(([name, value]) => (value instanceof File ? `${name}=${value.name}:${value.size}:${value.type}` : `${name}=${value}`)),
      );
    // No row carries a file yet: nothing of it is submitted.
    expect(await submitted()).toEqual(['note=hello']);
    // The product gives rows the files select carried — a property, never an attribute.
    await host(page, id).evaluate((el) => {
      const items = el.querySelectorAll('tanrei-file-item') as NodeListOf<HTMLElement & { file: File | null }>;
      items[0].file = new File(['one'], 'first.pdf', { type: 'application/pdf' });
      items[2].file = new File(['three'], 'third.png', { type: 'image/png' });
    });
    await expect.poll(submitted).toEqual(['attachments=first.pdf:3:application/pdf', 'attachments=third.png:5:image/png', 'note=hello']);
    expect(await row(page, id, 0).evaluate((el) => el.hasAttribute('file'))).toBe(false);
    expect(await host(page, id).evaluate((el: HTMLElement & { form: HTMLFormElement | null }) => el.form?.id)).toBe('f');
    // The order of the rows.
    await host(page, id).evaluate((el) => el.prepend(el.querySelectorAll('tanrei-file-item')[2]));
    await expect.poll(submitted).toEqual(['attachments=third.png:5:image/png', 'attachments=first.pdf:3:application/pdf', 'note=hello']);
    // What the browser sends: the form, submitted for real to a server of the test's own.
    const taken = await new Promise<{ type: string; body: string }>((resolve, reject) => {
      const server = http.createServer((request, response) => {
        const chunks: Buffer[] = [];
        request.on('data', (chunk: Buffer) => chunks.push(chunk));
        request.on('end', () => {
          response.writeHead(204).end();
          server.close();
          resolve({ type: String(request.headers['content-type']), body: Buffer.concat(chunks).toString('latin1') });
        });
      });
      server.on('error', reject);
      server.listen(0, '127.0.0.1', () => {
        const { port } = server.address() as { port: number };
        void page.evaluate((action) => {
          const form = document.querySelector('form')!;
          form.action = action;
          form.requestSubmit();
        }, `http://127.0.0.1:${port}/taken`);
      });
    });
    expect(taken.type).toContain('multipart/form-data');
    expect(taken.body.indexOf('filename="third.png"'), `${browserName}: the file of the first row`).toBeGreaterThan(-1);
    expect(taken.body.indexOf('filename="first.pdf"'), 'in the order of the rows').toBeGreaterThan(taken.body.indexOf('filename="third.png"'));
    expect(taken.body.match(/name="attachments"/g)?.length).toBe(2);
    expect(taken.body).toContain('three');
    expect(taken.body).not.toContain('none.pdf');
    // A reset changes nothing: the rows are the product's to clear.
    await page.locator('#reset').click();
    await expect(rows(page, id)).toHaveCount(3);
    expect(await submitted()).toEqual(['attachments=third.png:5:image/png', 'attachments=first.pdf:3:application/pdf', 'note=hello']);
    // A restored state changes nothing either, and none is kept with the form.
    await host(page, id).evaluate((el: HTMLElement & { formStateRestoreCallback: (state: unknown, mode: string) => void }) => {
      const state = new FormData();
      state.append('attachments', new File(['old'], 'restored.pdf'));
      el.formStateRestoreCallback(state, 'restore');
    });
    await expect(rows(page, id)).toHaveCount(3);
    expect(await submitted()).toEqual(['attachments=third.png:5:image/png', 'attachments=first.pdf:3:application/pdf', 'note=hello']);
    // Disabled by its fieldset: it is disabled, and submits nothing.
    await page.evaluate(() => (document.querySelector('fieldset')!.disabled = true));
    await expect(trigger(page, id).locator('[part="container"]')).toBeDisabled();
    await expect(inRow(row(page, id, 0), 'remove')).toBeDisabled();
    expect(await host(page, id).evaluate((el) => el.matches(':disabled'))).toBe(true);
    expect(await submitted()).toEqual(['note=hello']);
    await page.evaluate(() => (document.querySelector('fieldset')!.disabled = false));
    await expect(trigger(page, id).locator('[part="container"]')).toBeEnabled();
    await expect.poll(submitted).toHaveLength(3);
    // Disabled by itself.
    await host(page, id).evaluate((el: HTMLElement & { disabled: boolean }) => (el.disabled = true));
    await expect.poll(submitted).toEqual(['note=hello']);
    await host(page, id).evaluate((el: HTMLElement & { disabled: boolean }) => (el.disabled = false));
    await expect.poll(submitted).toHaveLength(3);
    // Required: a missing value while no row carries a file, with the browser's own words for a file input.
    const validity = () => host(page, id).evaluate((el: HTMLElement & { validity: ValidityState; validationMessage: string; checkValidity: () => boolean; willValidate: boolean }) => ({ missing: el.validity.valueMissing, valid: el.checkValidity(), message: el.validationMessage, will: el.willValidate }));
    await host(page, id).evaluate((el: HTMLElement & { required: boolean }) => (el.required = true));
    await expect.poll(async () => (await validity()).valid, { message: 'a row carries a file' }).toBe(true);
    await host(page, id).evaluate((el) => {
      for (const item of el.querySelectorAll('tanrei-file-item') as NodeListOf<HTMLElement & { file: File | null }>) item.file = null;
    });
    await expect.poll(async () => (await validity()).missing).toBe(true);
    const native = await page.evaluate(() => Object.assign(document.createElement('input'), { type: 'file', required: true }).validationMessage);
    const now = await validity();
    expect(now.valid).toBe(false);
    expect(now.will).toBe(true);
    expect(now.message).toBe(native || 'Attachments');
    expect(native, 'the browser has words for it').not.toBe('');
    expect(await page.evaluate(() => document.querySelector('form')!.checkValidity())).toBe(false);
    // A file under any status answers it; without the requirement nothing is missing.
    await row(page, id, 0).evaluate((el: HTMLElement & { file: File | null }) => (el.file = new File(['x'], 'x.png')));
    await expect.poll(async () => (await validity()).valid).toBe(true);
    // Without a name it submits nothing: a product that sends files itself gives none.
    await host(page, id).evaluate((el) => el.removeAttribute('name'));
    await expect.poll(submitted).toEqual(['note=hello']);
  });

  test('FUP-32: inside a Field the file upload takes the field’s label as the group’s name while its own is empty, the field’s help with, in error, the error text after it and optional text as the last part of the trigger’s description, the invalid state as its error condition, the required state as required and the disabled state as disabled; a press on the field’s label moves focus to the trigger and opens nothing', async ({ page }) => {
    const field = (attributes: string, upload = 'layout="drop-area" constraints-text="PDF, up to 10 MB"') =>
      `<tanrei-field ${attributes}><tanrei-file-upload ${upload}><tanrei-button slot="trigger" variant="outlined">Choose a file</tanrei-button></tanrei-file-upload></tanrei-field>`;
    await mount(page, [fx('holder', { label: 'unused' })]);
    await page.evaluate(
      (markup) => {
        document.querySelector('main')!.innerHTML = markup.map(([id, html]) => `<div class="stage" data-in="${id}" style="inline-size: 360px">${html}</div>`).join('');
      },
      [
        ['help', field('label="Attachment" supporting-text="We keep it for a year." requirement="optional" optional-text="Optional"')],
        ['error', field('label="Attachment" supporting-text="We keep it for a year." error error-text="Choose a PDF of 10 MB or less." requirement="required" required-text="Required"')],
        ['off', field('label="Attachment" disabled')],
        ['own', field('label="Attachment"', 'label="Supporting documents"')],
      ],
    );
    const inside = (id: string) => page.locator(`[data-in="${id}"] tanrei-file-upload`);
    const button = (id: string) => inside(id).locator(':scope > tanrei-button [part="container"]');
    // The name.
    await expect(page.locator('[data-in="help"]').getByRole('group', { name: 'Attachment', exact: true })).toHaveCount(1);
    await expect(page.locator('[data-in="own"]').getByRole('group', { name: 'Supporting documents', exact: true })).toHaveCount(1);
    // The description: the limits, then what the field gives.
    await expect.poll(() => button('help').getAttribute('aria-description')).toBe('PDF, up to 10 MB We keep it for a year. Optional');
    // The error condition, and the requirement: a button's role has no required state, so the field's word is said.
    // (In error the field's error text stands in its help's place, FLD-7.)
    await expect.poll(() => button('error').getAttribute('aria-description')).toBe('PDF, up to 10 MB Choose a PDF of 10 MB or less. Required');
    await expect(button('error')).toHaveAttribute('aria-invalid', 'true');
    expect(await inside('error').locator('.group > .chooser').getAttribute('data-error')).not.toBeNull();
    expect(await inside('error').evaluate((el: HTMLElement & { validity: ValidityState; error: boolean; required: boolean }) => [el.validity.valueMissing, el.error, el.required])).toEqual([true, false, false]);
    expect(await inside('help').evaluate((el: HTMLElement & { validity: ValidityState }) => el.validity.valueMissing)).toBe(false);
    // The field's error changes: the trigger is told at once.
    await page.locator('[data-in="error"] tanrei-field').evaluate((el: HTMLElement & { error: boolean }) => (el.error = false));
    await expect.poll(() => button('error').getAttribute('aria-description')).toBe('PDF, up to 10 MB We keep it for a year. Required');
    await expect(button('error')).not.toHaveAttribute('aria-invalid', 'true');
    // Disabled by the field.
    await expect(button('off')).toBeDisabled();
    expect(await inside('off').locator('.group > .chooser').getAttribute('data-disabled')).not.toBeNull();
    // A press on the label: focus on the trigger, and nothing opens.
    let pickers = 0;
    page.on('filechooser', () => pickers++);
    await page.locator('[data-in="help"] tanrei-field').locator('.label').first().click();
    expect(await inside('help').locator(':scope > tanrei-button').evaluate((el) => el.matches(':focus-within') || el === document.activeElement)).toBe(true);
    await turn(page);
    expect(pickers).toBe(0);
    const results = await new AxeBuilder({ page }).include('.stage').analyze();
    expect(results.violations).toEqual([]);
  });

  test('FUP-32: the Field’s one control is the file upload, and the file picker inside takes nothing from the Field directly — it is answered by the file upload, with no name; a Field that is defined after the file upload inside it still connects, and one that leaves gives back what it gave', async ({ page }) => {
    await mount(page, [fx('holder', { label: 'unused' })]);
    // A frame that is not defined yet: the file upload asked, and nobody answered.
    await page.evaluate(() => {
      document.querySelector('main')!.innerHTML =
        '<div class="stage" data-in="late" style="inline-size: 360px"><late-field label="Attachment" supporting-text="We keep it for a year." requirement="required" required-text="Required" error error-text="Choose a PDF."><tanrei-file-upload constraints-text="PDF, up to 10 MB"><tanrei-button slot="trigger" variant="outlined">Choose a file</tanrei-button></tanrei-file-upload></late-field></div>';
    });
    const inside = page.locator('[data-in="late"] tanrei-file-upload');
    const button = inside.locator(':scope > tanrei-button [part="container"]');
    await expect.poll(() => button.getAttribute('aria-description')).toBe('PDF, up to 10 MB');
    await expect(page.locator('[data-in="late"]').getByRole('group', { name: 'Attachment' })).toHaveCount(0);
    // It is defined now, as a module that loads later defines it: it asks what stands inside it to ask again.
    await page.evaluate(() => customElements.define('late-field', class extends (customElements.get('tanrei-field') as CustomElementConstructor) {}));
    await expect(page.locator('[data-in="late"]').getByRole('group', { name: 'Attachment', exact: true })).toHaveCount(1);
    await expect.poll(() => button.getAttribute('aria-description')).toBe('PDF, up to 10 MB Choose a PDF. Required');
    await expect(button).toHaveAttribute('aria-invalid', 'true');
    // One control: the Field framed the file upload, and the file picker was answered by the file upload — the three
    // states and the description, and no name, so it is no second group and reports no missing name.
    const inner = inside.locator('tanrei-file-picker');
    expect(await inner.locator('.group').getAttribute('role')).toBeNull();
    expect(await inner.evaluate((el) => [(el as unknown as { error: boolean }).error, (el as unknown as { required: boolean }).required, (el as unknown as { label: string }).label]), 'through the exchange, and through no prop').toEqual([false, false, '']);
    expect(await inner.locator('.group > .chooser').getAttribute('data-error')).not.toBeNull();
    expect(await inside.evaluate((el) => (el as unknown as { validity: ValidityState }).validity.valueMissing)).toBe(true);
    // The Field changes: the trigger is told at once, through the file upload.
    await page.locator('late-field').evaluate((el) => ((el as unknown as { disabled: boolean }).disabled = true));
    await expect(button).toBeDisabled();
    await page.locator('late-field').evaluate((el) => Object.assign(el, { disabled: false, error: false }));
    await expect(button).toBeEnabled();
    await expect.poll(() => button.getAttribute('aria-description')).toBe('PDF, up to 10 MB We keep it for a year. Required');
    // Taken out of the Field: what the Field gave is given back.
    await inside.evaluate((el) => document.querySelector('.stage')!.append(el));
    await expect.poll(() => button.getAttribute('aria-description')).toBe('PDF, up to 10 MB');
    await expect(page.locator('.stage').first().getByRole('group', { name: 'Attachment' })).toHaveCount(0);
  });

  test('FUP-33: with the text enlarged the file upload grows with its parts — at 200 % in a width of 320 a strip of tiles wraps sooner and never runs past the file upload’s width, no part lies over another, and nothing needs scrolling in two directions', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await mountSpec(page, 'tiles', 'long-text', 'own-many');
    // A page 320 wide with its own gutter, as a page has one: the file upload takes the 288 that are left.
    await page.addStyleTag({ content: `main { display: block !important; } .stage { box-sizing: border-box; inline-size: 320px !important; } .stage > ${TAG} { inline-size: auto !important; }` });
    const lines = async (id: string) => new Set((await Promise.all((await rows(page, id).all()).map(box))).map((one) => Math.round(one.y))).size;
    const before = await lines('tiles');
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    await frames(page);
    expect(await lines('tiles'), 'the strip wraps sooner').toBeGreaterThanOrEqual(before);
    for (const id of ['tiles', 'long-text', 'own-many']) {
      const whole = await box(host(page, id));
      near(whole.width, 288, `${id}: the width it is given`);
      const drew = id === 'own-many' ? ownRows(page, id) : rows(page, id);
      const each = await Promise.all((await drew.all()).map(box));
      for (const [index, one] of each.entries()) {
        expect(one.x, `${id} row ${index}: inside the start edge`).toBeGreaterThanOrEqual(whole.x - 0.6);
        expect(one.x + one.width, `${id} row ${index}: never past the width`).toBeLessThanOrEqual(whole.x + whole.width + 0.6);
        // No row lies over another: two rows either stand side by side or one below the other.
        for (const other of each.slice(0, index)) expect(one.y >= other.y + other.height - 0.6 || one.x >= other.x + other.width - 0.6 || other.x >= one.x + one.width - 0.6, `${id} row ${index} lies over none`).toBe(true);
      }
      // The list begins below the file picker, which grew.
      const [above, below] = [await box(picker(page, id)), await box(list(page, id))];
      expect(below.y, `${id}: the list below the file picker`).toBeGreaterThanOrEqual(above.y + above.height - 0.6);
      const past = await host(page, id).evaluate((el) => {
        const edge = el.getBoundingClientRect().right + 1;
        const found: string[] = [];
        const walk = (root: ParentNode, within: string) => {
          for (const node of root.querySelectorAll('*')) {
            const rect = node.getBoundingClientRect();
            if (rect.width && rect.right > edge && getComputedStyle(node).visibility !== 'hidden') found.push(`${within}${node.localName}.${[...node.classList].join('.')} ends ${Math.round(rect.right - edge + 1)} past`);
            if (node.shadowRoot) walk(node.shadowRoot, `${within}${node.localName} > `);
          }
        };
        walk(el.shadowRoot!, '');
        walk(el, '');
        return found;
      });
      expect(past, `${id}: no part runs past the file upload’s width`).toEqual([]);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'the page scrolls in one direction').toBe(true);
  });

  test('FUP-34: in forced colors the file upload draws nothing of its own that rests on a color — its own boxes have no fill, no edge and no shadow — and its file picker and its file items are drawn as they are alone', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit does not emulate forced colors');
    await page.emulateMedia({ forcedColors: 'active' });
    await mountSpec(page, 'drop-area-statuses', 'tiles-own');
    for (const id of ['drop-area-statuses', 'tiles-own']) {
      const mine = await host(page, id).evaluate((el) =>
        [el, ...el.shadowRoot!.querySelectorAll('.group, .list, .rows')].map((node) => {
          const s = getComputedStyle(node);
          // A fill of no opacity is no fill, whatever color the engine writes it in.
          return [/, 0\)$|^transparent$/.test(s.backgroundColor) ? 'no fill' : s.backgroundColor, s.backgroundImage, s.borderTopStyle, s.boxShadow, s.outlineStyle, s.forcedColorAdjust].join(' | ');
        }),
      );
      for (const each of mine) expect(each, id).toBe('no fill | none | none | none | none | auto');
      // The members are there, each drawn by itself (FIT-25, FPK-23).
      await expect(picker(page, id)).toBeVisible();
      await expect(host(page, id).locator(ITEM).first()).toBeVisible();
    }
    await page.emulateMedia({ forcedColors: 'none' });
  });

  test('FUP-35: in right-to-left the arrangement mirrors — a strip of tiles begins at the right and runs to the left on every line, a row is as wide as the file upload, and its file picker and its file items take the direction they stand in', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => ['tiles-rtl', 'button-rtl', 'own-rtl'].includes(f.id)), { ...spec.fixtures.find((f) => f.id === 'tiles')!, id: 'tiles-many-rtl', direction: 'rtl' }]);
    const gap = await resolveToken(page, '--tanrei-comp-list-gap-small');
    for (const id of ['tiles-rtl', 'tiles-many-rtl']) {
      const whole = await box(host(page, id));
      const each = await Promise.all((await rows(page, id).all()).map(box));
      near(each[0]!.x + each[0]!.width, whole.x + whole.width, `${id}: the strip begins at the right`);
      near(each[0]!.x - (each[1]!.x + each[1]!.width), gap, `${id}: and runs to the left, the List’s small gap apart`);
      near(each[1]!.y, each[0]!.y, `${id}: on one line`);
      if (each[3]) near(each[3].x + each[3].width, whole.x + whole.width, `${id}: the next line begins at the right too`);
    }
    for (const [id, drew] of [['button-rtl', rows(page, 'button-rtl')], ['own-rtl', ownRows(page, 'own-rtl')]] as const) {
      const whole = await box(host(page, id));
      for (const one of await drew.all()) near((await box(one)).width, whole.width, `${id}: a row across the width`);
      // The members stand in the direction and mirror themselves (FPK-24, FIT-26): the trigger at the right, a row's actions at the left.
      const t = await box(trigger(page, id));
      near(t.x + t.width, whole.x + whole.width, `${id}: the trigger at the right`);
      near((await box(inRow(drew.first(), 'remove'))).x, whole.x, `${id}: the remove action at the left`, 12);
      expect(await css(picker(page, id), 'direction')).toBe('rtl');
      expect(await css(drew.first(), 'direction')).toBe('rtl');
    }
  });

  test('FUP-36: the direction is the nearest ancestor’s, with no setting of the file upload’s own; when it changes while the file upload is shown it is drawn for the new direction at once, keeping its rows and its focus', async ({ page }) => {
    await mountSpec(page, 'button-multiple');
    const id = 'button-multiple';
    expect(await host(page, id).evaluate((el) => [el.hasAttribute('dir'), 'direction' in el])).toEqual([false, false]);
    const whole = await box(host(page, id));
    near((await box(trigger(page, id))).x, whole.x, 'left-to-right from the document');
    await inRow(row(page, id, 1), 'remove').focus();
    // The focused state has been drawn: what moves after this is the direction's doing.
    await expect.poll(() => row(page, id, 1).evaluate((el) => el.shadowRoot!.getAnimations({ subtree: true }).length)).toBe(0);
    // An ancestor's direction, not the root's.
    const moving = await stage(page, id).evaluate((el) => {
      el.setAttribute('dir', 'rtl');
      const upload = el.querySelector('tanrei-file-upload')!;
      void upload.getBoundingClientRect();
      return upload.getAnimations({ subtree: true }).length + [...upload.querySelectorAll('tanrei-file-item')].reduce((sum, item) => sum + item.shadowRoot!.getAnimations({ subtree: true }).length, 0);
    });
    expect(moving, 'without a motion of its own').toBe(0);
    const t = await box(trigger(page, id));
    near(t.x + t.width, whole.x + whole.width, 'drawn for the new direction at once');
    near((await box(inRow(row(page, id, 0), 'remove'))).x, whole.x, 'the actions at the left');
    await expect(rows(page, id)).toHaveCount(3);
    expect(await focused(page), 'the focus is kept').toBe('tanrei-file-item[b] button.action.remove');
    expect(await page.evaluate(() => document.documentElement.hasAttribute('dir'))).toBe(false);
  });

  test('FUP-37: the file upload mirrors no glyph and sets no direction itself — it draws none, gives its file picker and its file items no dir, and turns nothing; the direction of each text and the mirroring of each glyph are the members’', async ({ page }) => {
    await mountSpec(page, 'button-rtl', 'own-rtl', 'tiles-rtl');
    for (const id of ['button-rtl', 'own-rtl', 'tiles-rtl']) {
      const mine = await host(page, id).evaluate((el) => {
        const boxes = [el, ...el.shadowRoot!.querySelectorAll<HTMLElement>('.group, .list, .rows')];
        const members = [...el.shadowRoot!.querySelectorAll('tanrei-file-picker, tanrei-file-item'), ...el.querySelectorAll('tanrei-file-item')];
        return { dir: [...boxes, ...members].some((node) => node.hasAttribute('dir')), turned: boxes.map((node) => getComputedStyle(node).transform + getComputedStyle(node).scale).filter((value) => value !== 'nonenone'), bidi: boxes.map((node) => getComputedStyle(node).unicodeBidi).filter((value) => value !== 'normal' && value !== 'isolate') };
      });
      expect(mine, id).toEqual({ dir: false, turned: [], bidi: [] });
      // It has no glyph of its own to mirror: its own tree holds no text.
      expect((await ownTree(page, id)).text, id).toBe('');
    }
    // A file name in Latin letters keeps its order in a right-to-left row: laid out by the file item (FIT-28).
    await expect(inRow(ownRow(page, 'own-rtl', 0), 'headline')).toHaveText('brief.pdf');
  });

  test('FUP-38: maxFiles that is not a number above zero sets no limit, and two rows with one value are both drawn — each reported; a status, a fit or a size a row does not know is answered by the file item, and a layout it does not know by the file picker', async ({ page }) => {
    const warnings = logged(page);
    await mount(page, [
      fx('zero', { label: 'A', multiple: true, maxFiles: 0, ...WORDS }),
      fx('negative', { label: 'B', multiple: true, maxFiles: -2, ...WORDS }),
      fx('twice', { label: 'C', multiple: true, layout: 'grid', ...WORDS }, { items: [file('same', 'one.pdf', { status: 'sending' }), file('same', 'two.pdf')] }),
    ]);
    await host(page, 'negative').evaluate((el) => el.setAttribute('max-files', 'many'));
    await listen(page);
    for (const id of ['zero', 'negative']) {
      await choose(page, id, [A, B, C]);
      await turn(page);
    }
    expect(await heard(page), 'no limit: everything found room').toEqual([
      { type: 'select', files: ['a.pdf', 'b.pdf', 'c.pdf'] },
      { type: 'select', files: ['a.pdf', 'b.pdf', 'c.pdf'] },
    ]);
    const mine = warnings.filter((w) => w.includes('<tanrei-file-upload>') && w.includes('FUP-38'));
    expect(mine.filter((w) => w.includes('max-files "0"'))).toHaveLength(1);
    expect(mine.filter((w) => w.includes('max-files "-2"'))).toHaveLength(1);
    expect(mine.filter((w) => w.includes('max-files "NaN"'))).toHaveLength(1);
    // The file picker is given no maxFiles, so it reports none of them (FUP-56).
    expect(warnings.filter((w) => w.includes('<tanrei-file-picker>') && w.includes('max-files'))).toEqual([]);
    // Two rows with one value: both drawn, reported once.
    await expect(rows(page, 'twice')).toHaveCount(2);
    for (const one of await rows(page, 'twice').all()) await expect(inRow(one, 'headline')).toBeVisible();
    expect(mine.filter((w) => w.includes('"same"'))).toHaveLength(1);
    // What a member does not know, the member answers.
    expect(warnings.filter((w) => w.includes('<tanrei-file-item>') && w.includes('FIT-29') && w.includes('"sending"'))).toHaveLength(1);
    expect(warnings.filter((w) => w.includes('<tanrei-file-picker>') && w.includes('FPK-27') && w.includes('"grid"'))).toHaveLength(1);
    expect(warnings.filter((w) => w.includes('<tanrei-file-upload>') && (w.includes('"sending"') || w.includes('"grid"')))).toEqual([]);
  });

  test('FUP-39: a prop that changes while it is shown is given to the file picker where it is the file picker’s and to every file item where it is the file items’, in the same turn, keeping focus and announcing nothing; accept, maxSize, maxFiles and multiple judge the room from the next choice on and neither judge again, mark nor remove the rows it holds', async ({ page }) => {
    await mount(page, [fx('rows', { label: 'Attachments', multiple: true, maxFiles: 5, constraintsText: 'Five at most', ...WORDS }, { items: [file('a', 'one.png', { previewSrc: 'fixtures/avatar.png' }), file('b', 'two.pdf'), file('c', 'three.pdf')] })]);
    const id = 'rows';
    await turn(page);
    await inRow(row(page, id, 1), 'remove').focus();
    // The file picker's and the file items', in the turn of the file upload's own update.
    const after = await host(page, id).evaluate(async (el) => {
      Object.assign(el, { layout: 'drop-area', dropText: 'Drag files here', constraintsText: 'Three at most', error: true, itemForm: 'tile', itemFit: 'contain', itemPreview: true, removeLabel: 'Take away' });
      await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
      const inner = el.shadowRoot!.querySelector('tanrei-file-picker') as unknown as Record<string, unknown>;
      const items = [...el.querySelectorAll('tanrei-file-item')] as (Element & { updateComplete: Promise<unknown> })[];
      await Promise.all(items.map((item) => item.updateComplete));
      return {
        picker: [inner.layout, inner.dropText, inner.constraintsText, inner.error],
        items: items.map((item) => [item.shadowRoot!.querySelector('.item')!.getAttribute('data-form'), item.shadowRoot!.querySelector('.item')!.getAttribute('data-fit'), item.shadowRoot!.querySelector('.item')!.hasAttribute('data-preview'), item.shadowRoot!.querySelector('.action.remove')!.getAttribute('aria-label')].join(' ')),
      };
    });
    expect(after.picker).toEqual(['drop-area', 'Drag files here', 'Three at most', true]);
    expect(after.items).toEqual(Array(3).fill('tile contain true Take away'));
    await expect(list(page, id)).toHaveAttribute('data-form', 'tile');
    expect(await focused(page), 'the focus is kept').toBe('tanrei-file-item[b] button.action.remove');
    await turn(page);
    expect(await said(page, id), 'nothing is announced').toEqual([]);
    // The room, from the next choice on: three rows are held, and three is now the most.
    await listen(page);
    await set(host(page, id), { maxFiles: 3, accept: ['.png'] });
    await turn(page);
    await expect(rows(page, id)).toHaveCount(3);
    expect(await rows(page, id).evaluateAll((els) => els.map((el) => (el as unknown as { status: string }).status)), 'no row is judged again or marked').toEqual(['pending', 'pending', 'pending']);
    expect(await heard(page)).toEqual([]);
    await choose(page, id, [PNG]);
    await turn(page);
    expect(await heard(page)).toEqual([{ type: 'reject', files: ['plan.png'], reasons: ['count'] }]);
    await forget(page);
    await set(host(page, id), { maxFiles: 4 });
    await choose(page, id, [PNG, PDF]);
    await turn(page);
    expect(await heard(page)).toEqual([
      { type: 'select', files: ['plan.png'] },
      { type: 'reject', files: ['brief.pdf'], reasons: ['type'] },
    ]);
  });

  test('FUP-40: while the icon set cannot draw a glyph the file upload draws nothing of its own in a glyph’s place — it has no glyph: the glyphs of a row are the file item’s and the glyph of the drop area the file picker’s, each keeping its box', async ({ page }) => {
    await mountSpec(page, 'drop-area-statuses', 'tiles-own');
    await withoutIconFont(page);
    await frames(page);
    for (const id of ['drop-area-statuses', 'tiles-own']) {
      expect((await ownTree(page, id)).text, `${id}: no text of its own, so no glyph’s name`).toBe('');
      expect((await ownTree(page, id)).elements.filter((name) => name !== 'slot')).toEqual(['div.group', 'div.announce']);
      // The members' glyph boxes are there and undrawn: theirs to keep (FIT-31, FPK-29).
      const glyphs = host(page, id).locator(`${ITEM} .icon, ${ITEM} .glyph, ${PICKER} .icon`);
      expect(await glyphs.count(), id).toBeGreaterThan(0);
      for (const glyph of await glyphs.all()) await expect.poll(() => glyph.getAttribute('data-drawn'), { message: id }).toBeNull();
    }
  });

  test('FUP-41: a child that is neither the trigger, the glyph nor a file item is not drawn, takes no room — in a strip of tiles too — is not read, and is reported; a trigger that is not a Button is answered by the file picker', async ({ page, browserName }) => {
    const warnings = logged(page);
    await mount(page, [
      fx('clean', { label: 'A', multiple: true, ...WORDS }, { items: [file('a', 'one.pdf'), file('b', 'two.pdf')] }),
      fx('strays', { label: 'B', multiple: true, ...WORDS }, { items: [file('a', 'one.pdf'), file('b', 'two.pdf')] }),
      fx('tiles-clean', { label: 'C', multiple: true, itemForm: 'tile', ...WORDS }, { items: [file('a', 'one.pdf'), file('b', 'two.pdf')] }),
      fx('tiles-strays', { label: 'D', multiple: true, itemForm: 'tile', ...WORDS }, { items: [file('a', 'one.pdf'), file('b', 'two.pdf')] }),
      { id: 'plain', props: { label: 'E', rows: 'given' }, content: '<button slot="trigger">Choose</button>' },
      fx('tiles-wide', { label: 'F', multiple: true, itemForm: 'tile', itemWidth: 2000, ...WORDS }, { items: [file('a', 'one.pdf'), file('b', 'two.pdf')] }),
    ]);
    // (The strip's distances are its tiles' own: a tile wider than the file upload is still exactly as wide as it, from its start edge, and the next stands one distance below.)
    const [wideHost, wideA, wideB] = [await box(host(page, 'tiles-wide')), await box(rows(page, 'tiles-wide').nth(0)), await box(rows(page, 'tiles-wide').nth(1))];
    near(wideA.x, wideHost.x, 'a tile wider than the file upload begins at its start edge');
    near(wideA.width, wideHost.width, 'and is no wider than it (FIT-3)');
    near(wideB.y - (wideA.y + wideA.height), await resolveToken(page, '--tanrei-comp-list-gap-small'), 'the next, one distance below');
    for (const id of ['strays', 'tiles-strays']) {
      await host(page, id).evaluate((el) => {
        // Words between two file items and after the last, in a column and in a strip of tiles alike.
        el.querySelector('tanrei-file-item')!.insertAdjacentHTML('afterend', 'Loose words<div class="stray">A box of the product’s</div><p class="stray">A paragraph</p>');
        el.append('More loose words');
      });
    }
    await turn(page);
    for (const [clean, strays] of [['clean', 'strays'], ['tiles-clean', 'tiles-strays']] as const) {
      // Not drawn, and no room taken: every row stands where it stands without them.
      for (const stray of await host(page, strays).locator('.stray').all()) expect(await stray.evaluate((el) => el.getClientRects().length), strays).toBe(0);
      const [a, b] = [await box(host(page, clean)), await box(host(page, strays))];
      near(b.height, a.height, `${strays}: as tall as without them`);
      const place = async (id: string) => Promise.all((await rows(page, id).all()).map(async (one) => [(await box(one)).x - (await box(host(page, id))).x, (await box(one)).y - (await box(host(page, id))).y]));
      const [without, withThem] = [await place(clean), await place(strays)];
      for (const [index, [x, y]] of withThem.entries()) {
        near(x!, without[index]![0]!, `${strays} row ${index}: no room taken along the line`);
        near(y!, without[index]![1]!, `${strays} row ${index}: no room taken between the lines`);
      }
      // Not read: the list holds its two items and no text.
      if (browserName === 'chromium') {
        const client = await page.context().newCDPSession(page);
        await client.send('Accessibility.enable');
        const { nodes } = await client.send('Accessibility.getFullAXTree');
        expect(nodes.filter((node) => !node.ignored && /Loose words|A box of|A paragraph/.test(String(node.name?.value ?? ''))).map((node) => node.name?.value), `${strays}: not read`).toEqual([]);
        await client.detach();
      }
      // Assigned to no slot: the file upload's slots are assigned by hand, and only its rows, trigger and glyph are.
      expect(await host(page, strays).evaluate((el) => [...el.querySelectorAll('.stray')].map((stray) => stray.assignedSlot))).toEqual([null, null]);
      await expect(stage(page, strays).getByRole('listitem')).toHaveCount(2);
      expect(warnings.filter((w) => w.includes('<tanrei-file-upload>') && w.includes('FUP-41')).length, strays).toBeGreaterThan(0);
    }
    // A trigger that is not a Button: the file picker's to answer (FPK-30).
    expect(warnings.filter((w) => w.includes('<tanrei-file-picker>') && w.includes('FPK-30') && w.includes('<button>'))).toHaveLength(1);
    expect(warnings.filter((w) => w.includes('<tanrei-file-upload>') && w.includes('<button>'))).toEqual([]);
  });

  test('FUP-56: exactly one file picker, its member, and no choosing of its own — the product’s Button and glyph in the trigger and icon slots are the file picker’s; layout, multiple, accept, maxSize, constraintsText, dropText, disabled, error and required are given to it as they are given to the file upload; it is given no maxFiles and no label; and it is drawn from its own tokens, which a value set on the file upload reaches', async ({ page }) => {
    await mount(page, [
      { id: 'one', props: { label: 'Photos', layout: 'drop-area', multiple: true, maxFiles: 2, accept: ['.png', 'image/jpeg'], maxSize: 5000, constraintsText: 'PNG or JPEG, 2 at most', dropText: 'Drag photos here', required: true, ...WORDS }, content: '<tanrei-button slot="trigger" variant="outlined">Choose photos</tanrei-button><span slot="icon">image</span>' },
      fx('none', { label: 'Attachment', emptyText: 'No file chosen' }),
    ]);
    const id = 'one';
    // One, in its shadow root, as a part named for it; and nothing else that chooses.
    expect(await host(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('tanrei-file-picker')].map((inner) => `${inner.getAttribute('part')} in ${(inner.parentNode as Element).className}`))).toEqual(['file-picker in group']);
    expect(await host(page, id).evaluate((el) => [el.shadowRoot!.querySelectorAll('input, button, [role="button"]').length, el.querySelectorAll('tanrei-file-picker').length])).toEqual([0, 0]);
    // The nine, as they were given — and each again when it changes.
    const NINE = ['layout', 'multiple', 'accept', 'maxSize', 'constraintsText', 'dropText', 'disabled', 'error', 'required'];
    expect(await get(picker(page, id), NINE)).toEqual(['drop-area', true, ['.png', 'image/jpeg'], 5000, 'PNG or JPEG, 2 at most', 'Drag photos here', false, false, true]);
    await set(host(page, id), { layout: 'button', multiple: false, accept: ['.pdf'], maxSize: 9, constraintsText: 'PDF', dropText: 'Here', disabled: true, error: true, required: false });
    expect(await get(picker(page, id), NINE)).toEqual(['button', false, ['.pdf'], 9, 'PDF', 'Here', true, true, false]);
    // Its own maxFiles and label are never the file picker's.
    expect(await get(host(page, id), ['maxFiles', 'label'])).toEqual([2, 'Photos']);
    expect(await get(picker(page, id), ['maxFiles', 'label'])).toEqual([null, '']);
    expect(await picker(page, id).evaluate((el) => ['max-files', 'label'].map((name) => el.hasAttribute(name)))).toEqual([false, false]);
    await set(host(page, id), { layout: 'drop-area', multiple: true, disabled: false, error: false, maxFiles: 7, label: 'Pictures' });
    expect(await get(picker(page, id), ['maxFiles', 'label'])).toEqual([null, '']);
    // The product's Button and glyph are the file picker's trigger and glyph: the same elements, through the slots.
    const assigned = await host(page, id).evaluate((el) => {
      const inner = el.shadowRoot!.querySelector('tanrei-file-picker')!;
      const of = (name: string) => inner.shadowRoot!.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)!.assignedElements({ flatten: true });
      return [of('trigger').length === 1 && of('trigger')[0] === el.querySelector('tanrei-button'), of('icon').length === 1 && of('icon')[0] === el.querySelector('span[slot="icon"]'), el.querySelector('tanrei-button')!.getAttribute('variant')];
    });
    expect(assigned, 'the trigger, the glyph, and the Button left what it is').toEqual([true, true, 'outlined']);
    await choose(page, id, [PNG]);
    // selectionText: the file upload's to fill, from emptyText, while the list holds no row (FUP-2).
    expect(await get(picker(page, 'none'), ['selectionText'])).toEqual(['No file chosen']);
    // Its own tokens: a value set on the file upload is inherited, and the file upload writes none (W3).
    await host(page, id).evaluate((el) => el.style.setProperty('--tanrei-comp-file-picker-container-gap', '37px'));
    await expect.poll(() => css(chooser(page, id), 'row-gap')).toBe('37px');
    expect(await picker(page, id).evaluate((el) => (el as HTMLElement).style.length), 'nothing is written on the member').toBe(0);
  });

  test('FUP-57: its file picker’s select and reject are answered by the file upload and never reach a listener outside as they are — one choice is told once, by the file upload’s own select, reject and change, each with the file upload as its target, in a capturing listener on an ancestor and in a bubbling one', async ({ page }) => {
    await mount(page, [ownFx('own', { multiple: true, accept: ['.pdf'], maxFiles: 2, constraintsText: 'PDF, 2 at most', typeErrorText: 'PDF only.', countErrorText: 'Two at most.' }), fx('given', { label: 'Attachments', multiple: true, maxFiles: 1, constraintsText: 'One', ...WORDS })]);
    await page.evaluate(() => {
      const log: string[] = [];
      (window as unknown as { __log: string[] }).__log = log;
      const note = (where: string) => (event: Event) => {
        const detail = (event as CustomEvent<{ files?: (File | { file: File })[] }>).detail;
        const target = event.target as Element;
        const first = event.composedPath()[0] as Element;
        log.push(`${where} ${event.type} ${target.localName}/${first.localName} ${(detail?.files ?? []).map((f) => ('file' in f ? f.file.name : f.name)).join('+')}`);
      };
      for (const type of ['select', 'reject', 'change', 'tanrei-file-picker-arrival']) {
        window.addEventListener(type, note('capturing'), true);
        document.addEventListener(type, note('bubbling'));
      }
    });
    const log = () => page.evaluate(() => (window as unknown as { __log: string[] }).__log.splice(0));
    // rows own: three passed the file picker and one did not; two found room.
    await choose(page, 'own', [A, B, C, TXT]);
    await turn(page);
    expect(await log()).toEqual([
      'capturing select tanrei-file-upload/tanrei-file-upload a.pdf+b.pdf',
      'bubbling select tanrei-file-upload/tanrei-file-upload a.pdf+b.pdf',
      'capturing reject tanrei-file-upload/tanrei-file-upload notes.txt+c.pdf',
      'bubbling reject tanrei-file-upload/tanrei-file-upload notes.txt+c.pdf',
      'capturing change tanrei-file-upload/tanrei-file-upload a.pdf+b.pdf',
      'bubbling change tanrei-file-upload/tanrei-file-upload a.pdf+b.pdf',
    ]);
    // rows given: what the product hears is what found room — not what the file picker passed.
    await choose(page, 'given', [A, B]);
    await turn(page);
    expect(await log()).toEqual([
      'capturing select tanrei-file-upload/tanrei-file-upload a.pdf',
      'bubbling select tanrei-file-upload/tanrei-file-upload a.pdf',
      'capturing reject tanrei-file-upload/tanrei-file-upload b.pdf',
      'bubbling reject tanrei-file-upload/tanrei-file-upload b.pdf',
    ]);
    // On the file upload itself too: one of each, and none from inside.
    const onHost = await host(page, 'given').evaluate((el) => {
      const seen: string[] = [];
      for (const type of ['select', 'reject']) el.addEventListener(type, (event) => seen.push(`${event.type}:${event.eventPhase === Event.AT_TARGET}`));
      (window as unknown as { __seen: string[] }).__seen = seen;
    });
    void onHost;
    await choose(page, 'given', [A, B]);
    await turn(page);
    expect(await page.evaluate(() => (window as unknown as { __seen: string[] }).__seen)).toEqual(['select:true', 'reject:true']);
  });

  test('FUP-58: every row is a file item, and the file upload builds none of its own; it gives every file item it holds — the product’s included — form, preview, fit, nameHidden, width, height, removeLabel, retryLabel and disabled, and that the List’s item holds it, without changing an attribute or a property of it; an item that says one of them otherwise is drawn as the file upload says and reported once; everything else stays the row’s own; and an item taken out of the file upload is the group it is alone again', async ({ page }) => {
    const warnings = logged(page);
    await mount(page, [
      fx('given', { label: 'Photos', multiple: true }, { items: [file('a', 'entrance.png', { previewSrc: 'fixtures/avatar.png', href: '#entrance', statusText: 'Uploaded', status: 'done' }), file('e', 'site.png', { status: 'error', errorText: 'Lost.', retryable: true })] }),
      fx('says', { label: 'Files', multiple: true, ...WORDS }, { items: [file('a', 'one.pdf'), file('b', 'two.pdf')] }),
      ownFx('own', { multiple: true, accept: ['.pdf'], constraintsText: 'PDF', typeErrorText: 'PDF only.' }),
    ]);
    await host(page, 'says').evaluate((el) => {
      const item = el.querySelector('tanrei-file-item')!;
      item.setAttribute('form', 'tile');
      item.setAttribute('remove-label', 'Bin');
    });
    await give(page, 'own', [A, MOV]);
    // Every row is the file item's own element — given or made — and nothing else is a row.
    expect(await host(page, 'given').evaluate((el) => [...el.children].filter((child) => !child.slot).every((child) => child instanceof customElements.get('tanrei-file-item')!))).toBe(true);
    expect(await host(page, 'own').evaluate((el) => [...el.shadowRoot!.querySelectorAll('.list > tanrei-list-item > *')].map((child) => `${child.localName}:${child instanceof customElements.get('tanrei-file-item')!}:${child.getAttribute('part')}`))).toEqual(['tanrei-file-item:true:file-item', 'tanrei-file-item:true:file-item']);
    // What a product's item says of itself, before and after the file upload gives every row its form.
    const id = 'given';
    const says = () => rows(page, id).evaluateAll((els, shared) => els.map((el) => ({ attributes: [...el.attributes].filter((a) => !['role', 'aria-label', 'data-tile', 'preview-src'].includes(a.name)).map((a) => `${a.name}=${a.value}`).sort(), props: shared.map((name) => (el as unknown as Record<string, unknown>)[name]) })), SHARED);
    const before = await says();
    expect(before[0]!.props).toEqual(['row', false, 'cover', false, null, null, '', '', false]);
    await set(host(page, id), { itemForm: 'tile', itemPreview: true, itemFit: 'contain', itemNameHidden: true, itemWidth: 160, itemHeight: 90, removeLabel: 'Take away', retryLabel: 'Once more', disabled: true });
    const drawn = async (one: Locator) => ({
      form: await inRow(one, 'item').getAttribute('data-form'),
      fit: await inRow(one, 'item').getAttribute('data-fit'),
      preview: (await inRow(one, 'item').getAttribute('data-preview')) !== null,
      box: await inRow(one, 'box').evaluate((el) => `${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`),
      actions: await one.evaluate((el) => [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button.action')].map((button) => `${button.getAttribute('aria-label')}:${button.disabled}`)),
      role: await one.getAttribute('role'),
    });
    await expect.poll(() => drawn(row(page, id, 0))).toEqual({ form: 'tile', fit: 'contain', preview: true, box: '160x90', actions: ['Take away:true'], role: 'group' });
    await expect.poll(() => drawn(row(page, id, 1))).toEqual({ form: 'tile', fit: 'contain', preview: true, box: '160x90', actions: ['Once more:true', 'Take away:true'], role: 'group' });
    // The name is hidden behind a picture that is drawn, and drawn all the same where there is none (FIT-8).
    await expect.poll(() => inRow(row(page, id, 0), 'headline').evaluate((el) => el.classList.contains('unseen'))).toBe(true);
    expect(await inRow(row(page, id, 1), 'headline').evaluate((el) => el.classList.contains('unseen'))).toBe(false);
    expect(await says(), 'no attribute and no property of the product’s item was changed').toEqual(before);
    // Everything else stays the row's own: its texts, its status, its picture's address, that it is a link.
    await set(host(page, id), { disabled: false, itemForm: 'row' });
    await expect(inRow(row(page, id, 0), 'body')).toHaveAttribute('href', '#entrance');
    await expect(inRow(row(page, id, 0), 'supporting')).toContainText('Uploaded');
    expect(await get(row(page, id, 1), ['status', 'errorText', 'retryable', 'value'])).toEqual(['error', 'Lost.', true, 'e']);
    // An item that says a form of its own is drawn as the file upload says, and reported once.
    await turn(page);
    expect(await inRow(row(page, 'says', 0), 'item').getAttribute('data-form'), 'drawn as a row').toBe('row');
    expect(await row(page, 'says', 0).getAttribute('form'), 'and says what it said').toBe('tile');
    expect(await row(page, 'says', 0).evaluate((el) => el.shadowRoot!.querySelector('.action.remove')!.getAttribute('aria-label')), 'named as the file upload names every remove action').toBe('Remove');
    const reported = warnings.filter((w) => w.includes('<tanrei-file-upload>') && w.includes('FUP-58'));
    expect(reported.filter((w) => w.includes('form="tile"'))).toHaveLength(1);
    expect(reported.filter((w) => w.includes('remove-label="Bin"'))).toHaveLength(1);
    expect(reported, 'and nothing of an item that said nothing').toHaveLength(2);
    // Taken out of the file upload, it is the group it is alone, with what it says itself.
    const out = await row(page, 'says', 0).evaluate(async (el) => {
      document.querySelector('main')!.append(el);
      await new Promise((resolve) => setTimeout(resolve, 30));
      await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
      return [el.getAttribute('role'), el.getAttribute('aria-label'), el.shadowRoot!.querySelector('.item')!.getAttribute('data-form'), el.shadowRoot!.querySelector('.action.remove')!.getAttribute('aria-label')];
    });
    expect(out).toEqual(['group', 'one.pdf', 'tile', 'Bin']);
    await expect(rows(page, 'says')).toHaveCount(1);
    // A row it makes is given the same, and its remove is answered by the file upload (FUP-46).
    await set(host(page, 'own'), { itemForm: 'tile', itemWidth: 120, itemHeight: 80 });
    for (const one of await ownRows(page, 'own').all()) {
      await expect.poll(() => inRow(one, 'item').getAttribute('data-form')).toBe('tile');
      expect(await inRow(one, 'box').evaluate((el) => `${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`)).toBe('120x80');
      // The List's item is the item of the list; the file item in it is the group it is alone (FUP-25).
      expect(await one.getAttribute('role')).toBe('group');
    }
  });
});

// ── Its own rows: FUP-42 to FUP-55, and the six ids that hold "WHILE rows is given" ──────────────────
// A fixture made by `ownFx` gives no `rows`: it is a file upload that keeps its own files, as one placed in a form is.
const ownFx = (id: string, props: Fixture['props'] = {}, extra: Extra = {}): Fixture => ({ id, props: { label: 'Attachments', removeLabel: 'Remove {name}', ...props }, slots: { trigger: 'Choose files' }, ...extra });
/** The rows the file upload drew itself: in its shadow root, in the list. */
const ownRows = (page: P, id: string) => host(page, id).locator(`.group > .list > tanrei-list-item > ${ITEM}`);
const ownRow = (page: P, id: string, index: number) => ownRows(page, id).nth(index);
type Upload = HTMLElement & {
  files: File[];
  add: (files: Iterable<File>) => { file: File; reason: string }[];
  clear: () => void;
  formatSize: ((bytes: number) => string) | null;
  rows: string;
  disabled: boolean;
  multiple: boolean;
  required: boolean;
  announcement: string;
  updateComplete: Promise<unknown>;
};
/** The rows as they are drawn: each name, with its sentence after `!` where the row is a refused file's. */
const drawn = (page: P, id: string) =>
  ownRows(page, id).evaluateAll((els) => (els as (HTMLElement & { name: string; status: string; errorText: string })[]).map((el) => (el.status === 'error' ? `${el.name}!${el.errorText}` : el.name)));
const keptNames = (page: P, id: string) => host(page, id).evaluate((el) => (el as Upload).files.map((f) => f.name));
/** Hands files over with `add()`, as a product does; answers with the refused as `name:reason`. */
const give = (page: P, id: string, files: Given[]) =>
  host(page, id).evaluate(
    (el, given) =>
      (el as Upload)
        .add(given.map((f) => new File([new Uint8Array(f.size ?? 4)], f.name, { type: f.type ?? '', lastModified: f.modified ?? 1000 })))
        .map((refused) => `${refused.file.name}:${refused.reason}`),
    files,
  );
/**
 * Chooses files of the test's own from the disk, by name. The browser reports each one's own time of last change, so
 * the same file chosen again is the same file (FUP-43) — which a file made from a buffer is not: it is made anew, now.
 */
async function chooseFromDisk(page: P, id: string, testInfo: TestInfo, names: string[]) {
  const paths = names.map((name) => {
    const file = testInfo.outputPath('files', name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file)) fs.writeFileSync(file, name);
    return file;
  });
  const [picker] = await Promise.all([page.waitForEvent('filechooser'), trigger(page, id).click()]);
  await picker.setFiles(paths);
}
const said = (page: P, id: string) => region(page, id).evaluate((el) => [...el.children].map((line) => line.textContent));
const A: Given = { name: 'a.pdf', type: 'application/pdf', modified: 1000 };
const B: Given = { name: 'b.pdf', type: 'application/pdf', modified: 1000 };
const C: Given = { name: 'c.pdf', type: 'application/pdf', modified: 1000 };
const MOV: Given = { name: 'holiday.mov', type: 'video/quicktime', modified: 1000 };
/** Puts the first file upload of the page in a form of the test's own, with one other field and a reset button. */
const inForm = (page: P) =>
  page.evaluate(() => {
    const upload = document.querySelector('tanrei-file-upload')!;
    const form = document.createElement('form');
    form.id = 'f';
    form.method = 'post';
    form.enctype = 'multipart/form-data';
    const set = document.createElement('fieldset');
    upload.before(form);
    set.append(upload);
    form.append(set, Object.assign(document.createElement('input'), { name: 'note', defaultValue: 'hello' }), Object.assign(document.createElement('button'), { type: 'reset', id: 'reset', textContent: 'Reset' }));
  });
const submitted = (page: P) =>
  page.evaluate(() => [...new FormData(document.querySelector('form')!).entries()].map(([name, value]) => (value instanceof File ? `${name}=${value.name}:${value.size}` : `${name}=${value}`)));
/** Counts what would read a file or make an address for one, from now on (FUP-7, FUP-51). */
const spyOnReading = (page: P) =>
  page.evaluate(() => {
    const used: string[] = [];
    (window as unknown as { __used: string[] }).__used = used;
    const spy = (owner: Record<string, unknown>, name: string, label: string) => {
      const original = owner[name] as (...args: unknown[]) => unknown;
      if (typeof original !== 'function') return;
      owner[name] = function (this: unknown, ...args: unknown[]) {
        used.push(label);
        return original.apply(this, args);
      };
    };
    for (const name of ['arrayBuffer', 'text', 'stream', 'slice', 'bytes']) spy(Blob.prototype as unknown as Record<string, unknown>, name, `Blob.${name}`);
    for (const name of ['readAsArrayBuffer', 'readAsText', 'readAsDataURL', 'readAsBinaryString']) spy(FileReader.prototype as unknown as Record<string, unknown>, name, `FileReader.${name}`);
    spy(URL as unknown as Record<string, unknown>, 'createObjectURL', 'URL.createObjectURL');
    spy(window as unknown as Record<string, unknown>, 'fetch', 'fetch');
    spy(window as unknown as Record<string, unknown>, 'createImageBitmap', 'createImageBitmap');
    spy(XMLHttpRequest.prototype as unknown as Record<string, unknown>, 'send', 'XMLHttpRequest.send');
    const Reader = window.FileReader;
    (window as unknown as Record<string, unknown>).FileReader = function () {
      used.push('new FileReader');
      return new Reader();
    };
  });
const used = (page: P) => page.evaluate(() => (window as unknown as { __used: string[] }).__used);

test.describe('its own rows', () => {
  test('FUP-42: rows is own by default — also when absent or unknown, which is reported — and given only when the product says so, never guessed from the children; a row the product gives while rows is own is not drawn and is reported, naming rows; while rows is given no file is kept, files is empty, add() does nothing and is reported and clear() does nothing', async ({ page }) => {
    const warnings = logged(page);
    await mount(page, [
      ownFx('absent', { multiple: true }),
      ownFx('unknown', { multiple: true, rows: 'mine' }),
      ownFx('stray', { multiple: true }),
      fx('given', { label: 'Given', multiple: true, ...WORDS }),
      fx('given-rows', { label: 'Given', multiple: true, ...WORDS }, { items: [file('a', 'first.pdf')] }),
    ]);
    await host(page, 'stray').evaluate((el) => el.insertAdjacentHTML('beforeend', '<tanrei-file-item value="x" name="given.pdf"></tanrei-file-item>'));
    await turn(page);
    expect(await host(page, 'absent').evaluate((el) => (el as Upload).rows)).toBe('own');
    // Absent and unknown keep what was chosen and draw it.
    for (const id of ['absent', 'unknown']) {
      await choose(page, id, [A]);
      await expect.poll(() => drawn(page, id), { message: id }).toEqual(['a.pdf']);
      expect(await keptNames(page, id)).toEqual(['a.pdf']);
    }
    expect(warnings.filter((w) => w.includes('FUP-42') && w.includes('"mine"') && w.includes('own'))).toHaveLength(1);
    // A row the product gives while rows is own: not drawn, takes no room, is not exposed, and is reported.
    await expect(rows(page, 'stray')).toHaveCount(1);
    expect(await rows(page, 'stray').first().evaluate((el) => el.getClientRects().length)).toBe(0);
    await expect(stage(page, 'stray').getByRole('listitem')).toHaveCount(0);
    await expect(list(page, 'stray')).toBeHidden();
    const strays = warnings.filter((w) => w.includes('FUP-42') && w.includes('rows="given"'));
    expect(strays, 'reported once, naming rows').toHaveLength(1);
    // It never guesses: an empty one that is given keeps nothing, and its rows are the product's.
    await listen(page);
    await choose(page, 'given', [A]);
    await turn(page);
    expect((await heard(page)).map((h) => h.type)).toEqual(['select']);
    await expect(ownRows(page, 'given')).toHaveCount(0);
    expect(await keptNames(page, 'given')).toEqual([]);
    // What FUP-48 offers does nothing there, and a file handed over is reported.
    expect(await give(page, 'given', [B])).toEqual([]);
    expect(await keptNames(page, 'given')).toEqual([]);
    await expect(ownRows(page, 'given')).toHaveCount(0);
    expect(warnings.filter((w) => w.includes('FUP-42') && w.includes('add()'))).toHaveLength(1);
    await host(page, 'given-rows').evaluate((el) => (el as Upload).clear());
    await expect(rows(page, 'given-rows')).toHaveCount(1);
    await expect(inRow(row(page, 'given-rows', 0), 'headline')).toBeVisible();
    // A file upload that keeps its own files stays one when its last row goes.
    await inRow(ownRow(page, 'absent', 0), 'remove').click();
    await expect(ownRows(page, 'absent')).toHaveCount(0);
    expect(await host(page, 'absent').evaluate((el) => (el as Upload).rows)).toBe('own');
  });

  test('FUP-43: with multiple a second choice adds after the first and replaces nothing; a file it already keeps, and a second copy within one arrival, is passed over — not kept twice, not refused, in no event; the rest is judged by FUP-9 with maxFiles measured against the files kept; the rows of an earlier refusal leave before the new ones are drawn; without multiple a file that passed takes the place of the one kept and a refused choice replaces nothing; focus is not moved', async ({ page }, testInfo) => {
    await mount(page, [ownFx('many', { multiple: true, maxFiles: 2, constraintsText: 'x', countErrorText: 'Two at most.' }), ownFx('one', { accept: ['.pdf'], constraintsText: 'x', typeErrorText: 'PDF only.', countErrorText: 'One file.' })]);
    await listen(page);
    const id = 'many';
    await chooseFromDisk(page, id, testInfo, ['a.pdf']);
    await expect.poll(() => drawn(page, id)).toEqual(['a.pdf']);
    await chooseFromDisk(page, id, testInfo, ['b.pdf']);
    await expect.poll(() => drawn(page, id), { message: 'a second choice adds' }).toEqual(['a.pdf', 'b.pdf']);
    expect((await heard(page)).map((h) => `${h.type}:${h.files?.join('+')}`)).toEqual(['select:a.pdf', 'change:a.pdf', 'select:b.pdf', 'change:a.pdf+b.pdf']);
    // The same file again — the same name, size and time of last change: still two rows, and no event.
    await forget(page);
    await chooseFromDisk(page, id, testInfo, ['a.pdf']);
    await turn(page);
    expect(await drawn(page, id)).toEqual(['a.pdf', 'b.pdf']);
    expect(await heard(page)).toEqual([]);
    // Another file of the same name is another file.
    await host(page, id).evaluate((el) => ((el as Upload & { maxFiles: number | null }).maxFiles = 3));
    await choose(page, id, [{ ...A, size: 99 }]);
    await expect.poll(() => drawn(page, id)).toEqual(['a.pdf', 'b.pdf', 'a.pdf']);
    await inRow(ownRow(page, id, 2), 'remove').click();
    await host(page, id).evaluate((el) => ((el as Upload & { maxFiles: number | null }).maxFiles = 2));
    // Beyond maxFiles less the files kept: refused, with the reason count.
    await forget(page);
    await choose(page, id, [C]);
    await expect.poll(() => drawn(page, id)).toEqual(['a.pdf', 'b.pdf', 'c.pdf!Two at most.']);
    expect(await heard(page)).toEqual([{ type: 'reject', files: ['c.pdf'], reasons: ['count'] }]);
    expect(await keptNames(page, id)).toEqual(['a.pdf', 'b.pdf']);
    // The next arrival: the refused row is gone — also when everything that arrived is passed over.
    await chooseFromDisk(page, id, testInfo, ['a.pdf']);
    await expect.poll(() => drawn(page, id), { message: 'the refused row left' }).toEqual(['a.pdf', 'b.pdf']);
    // A second copy within one arrival is one file; what is handed over is judged the same way.
    await ownRow(page, id, 1).evaluate((el) => el.shadowRoot!.querySelector<HTMLElement>('.action.remove')!.click());
    await expect(ownRows(page, id)).toHaveCount(1);
    expect(await give(page, id, [C, C])).toEqual([]);
    await expect.poll(() => drawn(page, id)).toEqual(['a.pdf', 'c.pdf']);
    expect(await give(page, id, [C]), 'a file it already keeps is not refused').toEqual([]);
    expect(await drawn(page, id)).toEqual(['a.pdf', 'c.pdf']);
    // Without multiple: a file that passed takes the place of the one kept.
    await forget(page);
    await choose(page, 'one', [A]);
    await expect.poll(() => drawn(page, 'one')).toEqual(['a.pdf']);
    await choose(page, 'one', [B]);
    await expect.poll(() => drawn(page, 'one'), { message: 'one row, the new file' }).toEqual(['b.pdf']);
    expect((await heard(page)).map((h) => `${h.type}:${h.files?.join('+')}`)).toEqual(['select:a.pdf', 'change:a.pdf', 'select:b.pdf', 'change:b.pdf']);
    // A refused choice replaces nothing.
    await forget(page);
    await choose(page, 'one', [MOV]);
    await expect.poll(() => drawn(page, 'one')).toEqual(['b.pdf', 'holiday.mov!PDF only.']);
    expect(await keptNames(page, 'one')).toEqual(['b.pdf']);
    expect((await heard(page)).map((h) => h.type)).toEqual(['reject']);
    // More than one where one is asked: all refused, and none chosen for the person.
    expect(await give(page, 'one', [A, C])).toEqual(['a.pdf:count', 'c.pdf:count']);
    await expect.poll(() => drawn(page, 'one')).toEqual(['b.pdf', 'a.pdf!One file.', 'c.pdf!One file.']);
    // Files that arrive move no focus.
    await trigger(page, 'one').focus();
    await give(page, 'one', [A]);
    await expect.poll(() => drawn(page, 'one')).toEqual(['a.pdf']);
    expect(await focused(page)).toContain('tanrei-button');
  });

  test('FUP-44: a file it keeps is drawn as a pending file item — the glyph of its format, the name whole, no status in words, no bar, the remove action and never a retry action — with the size the product’s function writes for its bytes, and none where no function was given, which is not reported', async ({ page }) => {
    const warnings = logged(page);
    await mount(page, [ownFx('a', { multiple: true })]);
    const id = 'a';
    await give(page, id, [{ ...A, size: 820 }, { ...B, size: 12 }]);
    await expect(ownRows(page, id)).toHaveCount(2);
    const first = ownRow(page, id, 0);
    expect(await first.evaluate((el) => (el as HTMLElement & { status: string }).status)).toBe('pending');
    await expect(inRow(first, 'headline')).toHaveText('a.pdf');
    await expect(inRow(first, 'item')).toHaveAttribute('data-status', 'pending');
    await expect(inRow(first, 'mark')).toHaveCount(0);
    // No function: no second line at all; no bar; no retry.
    await expect(inRow(first, 'supporting')).toHaveCount(0);
    await expect(inRow(first, 'bar')).toHaveCount(0);
    await expect(inRow(first, 'retry')).toHaveCount(0);
    await expect(inRow(first, 'remove')).toBeVisible();
    await expect(first.getByRole('progressbar')).toHaveCount(0);
    // The product's function: given the size in bytes, its text is the row's size — at once, for the rows it holds.
    await host(page, id).evaluate((el) => {
      const seen: unknown[] = [];
      (window as unknown as { __sizes: unknown[] }).__sizes = seen;
      (el as Upload).formatSize = (bytes) => {
        seen.push(bytes);
        return `${bytes} B`;
      };
    });
    await expect(inRow(first, 'supporting')).toHaveText('820 B');
    await expect(inRow(ownRow(page, id, 1), 'supporting')).toHaveText('12 B');
    expect(await page.evaluate(() => (window as unknown as { __sizes: unknown[] }).__sizes.every((bytes) => typeof bytes === 'number'))).toBe(true);
    expect(await host(page, id).evaluate((el) => el.hasAttribute('format-size') || el.hasAttribute('formatsize'))).toBe(false);
    // The same row as the product's: one drawing.
    expect(await first.evaluate((el) => el.localName)).toBe(ITEM);
    await turn(page);
    expect(warnings.filter((w) => /formatSize|size/i.test(w)), 'a function that was not given is not reported').toEqual([]);
  });

  test('FUP-45: a file the last arrival refused is a failed file item after the kept ones — first the files its file picker refused, then those refused for want of room — with the error mark, its name, the remove action and the product’s sentence for its reason; it is not kept, not read by files, not submitted, does not count toward maxFiles and does not satisfy required; it stays until it is removed, files next arrive or the list is cleared; the error condition is never set; a drag over a refusing area that ends without a drop draws no row; without a sentence the row is still drawn and the missing word reported once', async ({ page }) => {
    const warnings = logged(page);
    await mount(page, [
      ownFx('a', { multiple: true, accept: ['.pdf'], maxSize: 100, maxFiles: 2, name: 'attachments', required: true, constraintsText: 'x', typeErrorText: 'Only PDF files can be added.', sizeErrorText: 'This file is too large.', countErrorText: 'No more than 2 files can be added.' }),
      ownFx('bare', { multiple: true, accept: ['.pdf'], constraintsText: 'x' }),
      ownFx('area', { layout: 'drop-area', accept: ['image/*'], constraintsText: 'x', typeErrorText: 'Pictures only.' }),
    ]);
    await inForm(page);
    const id = 'a';
    await listen(page);
    // Refused alone: rows, and nothing kept — not for files, the form, maxFiles or required.
    await choose(page, id, [MOV, { name: 'big.pdf', size: 500, modified: 1000 }]);
    await expect.poll(() => drawn(page, id)).toEqual(['holiday.mov!Only PDF files can be added.', 'big.pdf!This file is too large.']);
    expect(await keptNames(page, id)).toEqual([]);
    expect(await submitted(page)).toEqual(['note=hello']);
    expect(await host(page, id).evaluate((el) => (el as HTMLElement & { validity: ValidityState }).validity.valueMissing), 'a refused file does not satisfy required').toBe(true);
    expect((await heard(page)).map((h) => h.type), 'no change: nothing is kept').toEqual(['reject']);
    expect(await host(page, id).evaluate((el) => el.hasAttribute('error')), 'FUP-16: it sets no error condition').toBe(false);
    // The two refused rows do not count toward maxFiles: two files still fit, and the third is refused by count.
    await choose(page, id, [A, MOV, B, C]);
    await expect.poll(() => drawn(page, id), { message: 'kept first, then refused, each in the order given' }).toEqual(['a.pdf', 'b.pdf', 'holiday.mov!Only PDF files can be added.', 'c.pdf!No more than 2 files can be added.']);
    const refused = ownRow(page, id, 2);
    expect(await refused.evaluate((el) => (el as HTMLElement & { status: string; retryable: boolean }).status)).toBe('error');
    await expect(inRow(refused, 'mark')).toHaveCount(1);
    await expect(inRow(refused, 'headline')).toHaveText('holiday.mov');
    await expect(inRow(refused, 'said')).toHaveText('Only PDF files can be added.');
    await expect(inRow(refused, 'retry')).toHaveCount(0);
    await expect(inRow(refused, 'remove')).toBeVisible();
    expect(await submitted(page)).toEqual(['attachments=a.pdf:4', 'attachments=b.pdf:4', 'note=hello']);
    // It stays until the person removes it …
    await turn(page);
    expect(await drawn(page, id)).toHaveLength(4);
    await inRow(refused, 'remove').click();
    await expect.poll(() => drawn(page, id)).toEqual(['a.pdf', 'b.pdf', 'c.pdf!No more than 2 files can be added.']);
    // … or the list is cleared.
    await host(page, id).evaluate((el) => (el as Upload).clear());
    await expect(ownRows(page, id)).toHaveCount(0);
    // A drag the area refuses and that ends without a drop — which is what a browser delivers when the person lets go
    // there — draws no row and says nothing.
    const carried = (await drag(page, 'area', 'dragenter', [TXT])).carried;
    if (carried) expect(await condition(page, 'area')).toBe('refusing');
    await drag(page, 'area', 'dragleave', []);
    await turn(page);
    await expect(ownRows(page, 'area')).toHaveCount(0);
    expect(await said(page, 'area')).toEqual([]);
    // What could not be judged beforehand arrives, and is a row.
    await drag(page, 'area', 'dragenter', [PNG]);
    await host(page, 'area').evaluate((el) => ((el as Upload & { maxSize: number | null }).maxSize = 2));
    await drag(page, 'area', 'drop', [PNG]);
    if (carried) await expect.poll(() => drawn(page, 'area')).toEqual(['plan.png!']);
    // Without a sentence: the row with its glyph and its name, and the missing word reported, once.
    expect(await missingWords(page)).not.toContain('fileTypeErrorText');
    await give(page, 'bare', [MOV, { name: 'clip.mov', modified: 1000 }]);
    await expect.poll(() => drawn(page, 'bare')).toEqual(['holiday.mov!', 'clip.mov!']);
    await expect(inRow(ownRow(page, 'bare', 0), 'mark')).toHaveCount(1);
    await expect(inRow(ownRow(page, 'bare', 0), 'said')).toHaveCount(0);
    await turn(page);
    expect(await missingWords(page)).toContain('fileTypeErrorText');
    expect(warnings.filter((w) => w.includes('fileTypeErrorText')), 'once per page').toHaveLength(1);
    expect(warnings.filter((w) => w.includes('FIT-4')), 'the row itself asks for no error-text: the sentence is the file upload’s prop').toEqual([]);
  });

  test('FUP-46: the remove action of a row it drew removes the row at once, by pointer, Enter or Space — a kept file is let go and change is emitted once, a refused one emits nothing — and focus moves to the remove action of the row that followed, or of the one before where none follows, or to the trigger where no row is left; neither remove nor retry is emitted', async ({ page }) => {
    await mount(page, [ownFx('a', { multiple: true, accept: ['.pdf'], constraintsText: 'x', typeErrorText: 'PDF only.' })]);
    const id = 'a';
    await give(page, id, [A, B, C, { name: 'd.pdf', modified: 1000 }, MOV]);
    await expect(ownRows(page, id)).toHaveCount(5);
    await listen(page);
    await host(page, id).evaluate((el) => {
      // On the element itself too: the row's own events do not leave the shadow root.
      for (const type of ['remove', 'retry']) el.addEventListener(type, () => (window as unknown as { __heard: unknown[] }).__heard.push({ type: `host-${type}` }));
    });
    const heldBy = () =>
      host(page, id).evaluate((el) => {
        const active = el.shadowRoot!.activeElement as (HTMLElement & { name?: string }) | null;
        return active?.localName === 'tanrei-file-item' ? `${active.name}:${active.shadowRoot!.activeElement?.className}` : (document.activeElement?.localName ?? '');
      });
    // By pointer: the row is gone at once, and change carries the files now kept.
    await inRow(ownRow(page, id, 1), 'remove').click();
    await expect.poll(() => drawn(page, id)).toEqual(['a.pdf', 'c.pdf', 'd.pdf', 'holiday.mov!PDF only.']);
    expect(await heard(page)).toEqual([{ type: 'change', files: ['a.pdf', 'c.pdf', 'd.pdf'] }]);
    // By Enter, from the keyboard: focus goes to the remove action of the row that followed.
    await forget(page);
    await inRow(ownRow(page, id, 0), 'remove').focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => drawn(page, id)).toEqual(['c.pdf', 'd.pdf', 'holiday.mov!PDF only.']);
    await expect.poll(heldBy, { message: 'the row that followed' }).toBe('c.pdf:action remove');
    expect(await heard(page)).toEqual([{ type: 'change', files: ['c.pdf', 'd.pdf'] }]);
    // A refused row, by Space: gone, and nothing is emitted. It was the last: the row before.
    await forget(page);
    await inRow(ownRow(page, id, 2), 'remove').focus();
    await page.keyboard.press('Space');
    await expect.poll(() => drawn(page, id)).toEqual(['c.pdf', 'd.pdf']);
    await expect.poll(heldBy, { message: 'the row before, where none follows' }).toBe('d.pdf:action remove');
    expect(await heard(page), 'the kept files did not change').toEqual([]);
    // The last rows: then the trigger.
    await page.keyboard.press('Enter');
    await expect.poll(heldBy).toBe('c.pdf:action remove');
    await page.keyboard.press('Enter');
    await expect(ownRows(page, id)).toHaveCount(0);
    await expect.poll(() => focused(page), { message: 'the trigger where no row is left' }).toContain('tanrei-button');
    expect(await heard(page)).toEqual([
      { type: 'change', files: ['c.pdf'] },
      { type: 'change', files: [] },
    ]);
  });

  test('FUP-47: one choice or one drop emits select with the files newly kept, then reject with the refused and their reasons, then change once with the files now kept — each with the rows already as they will be — and no change where the kept files are the same; a removal of a kept file emits change alone; nothing is emitted for add(), clear(), a form reset or a change of rows', async ({ page }) => {
    await mount(page, [ownFx('a', { layout: 'drop-area', multiple: true, accept: ['.pdf', '.png'], constraintsText: 'x', typeErrorText: 'No.' })]);
    await inForm(page);
    const id = 'a';
    await page.evaluate(() => {
      const seen: string[] = [];
      (window as unknown as { __order: string[] }).__order = seen;
      const upload = document.querySelector('tanrei-file-upload') as HTMLElement & { files: File[] };
      const rows = () => [...upload.shadowRoot!.querySelectorAll('.list > tanrei-list-item > tanrei-file-item')].map((row) => (row as HTMLElement & { name: string }).name).join('+');
      for (const type of ['select', 'reject', 'change']) {
        document.addEventListener(type, (event) => {
          const detail = (event as CustomEvent<{ files: (File | { file: File; reason: string })[] }>).detail;
          const names = detail.files.map((each) => (each instanceof File ? each.name : `${each.file.name}:${each.reason}`)).join('+');
          seen.push(`${type}(${names}) target=${(event.target as Element).localName} bubbles=${event.bubbles} handles=${detail.files.every((each) => (each instanceof File ? each : each.file) instanceof File)} rows=${rows()} files=${upload.files.map((f) => f.name).join('+')}`);
        });
      }
    });
    const order = () => page.evaluate(() => (window as unknown as { __order: string[] }).__order.splice(0));
    await choose(page, id, [A, MOV, B]);
    await expect.poll(() => drawn(page, id)).toHaveLength(3);
    const state = 'rows=a.pdf+b.pdf+holiday.mov files=a.pdf+b.pdf';
    expect(await order()).toEqual([
      `select(a.pdf+b.pdf) target=tanrei-file-upload bubbles=true handles=true ${state}`,
      `reject(holiday.mov:type) target=tanrei-file-upload bubbles=true handles=true ${state}`,
      `change(a.pdf+b.pdf) target=tanrei-file-upload bubbles=true handles=true ${state}`,
    ]);
    // A drop: the same three, in the same order; select carries only what is newly kept.
    const carried = (await drag(page, id, 'drop', [{ ...PNG, modified: 1000 }, A, MOV])).carried;
    if (carried) {
      // (A file the page made carries its own time of last change: `a.pdf` of the drop is another file than the one kept.)
      await expect.poll(() => drawn(page, id)).toHaveLength(5);
      expect((await order()).map((line) => line.split(' ')[0])).toEqual(['select(plan.png+a.pdf)', 'reject(holiday.mov:type)', 'change(a.pdf+b.pdf+plan.png+a.pdf)']);
    }
    // Only refused: reject alone — the kept files are the same.
    await choose(page, id, [MOV]);
    await expect.poll(async () => (await drawn(page, id)).at(-1)).toBe('holiday.mov!No.');
    expect((await order()).map((line) => line.split(' ')[0])).toEqual(['reject(holiday.mov:type)']);
    // A kept file removed: change, and nothing else. A refused one: nothing.
    await inRow(ownRow(page, id, 0), 'remove').click();
    await expect.poll(async () => (await order()).map((line) => line.split('(')[0])).toEqual(['change']);
    await inRow(ownRows(page, id).last(), 'remove').click();
    await turn(page);
    expect(await order()).toEqual([]);
    // What the product did itself: nothing.
    expect(await give(page, id, [C, MOV])).toEqual(['holiday.mov:type']);
    await expect.poll(async () => (await drawn(page, id)).includes('c.pdf')).toBe(true);
    await host(page, id).evaluate((el) => (el as Upload).clear());
    await give(page, id, [C]);
    await page.locator('#reset').click();
    await expect(ownRows(page, id)).toHaveCount(0);
    await give(page, id, [C]);
    await host(page, id).evaluate((el) => ((el as Upload).rows = 'given'));
    await turn(page);
    await host(page, id).evaluate((el) => ((el as Upload).rows = 'own'));
    await turn(page);
    expect(await order(), 'a control’s events tell what a person did').toEqual([]);
  });

  test('FUP-48: files reads the kept files as File handles in a new array on each read, and changing it changes nothing kept; add() is an arrival — judged, kept or refused, drawn and announced — that answers with the refused and their reasons and emits nothing; clear() lets go of every file and removes every row, announces nothing and moves focus from a row to the trigger; all three work while disabled', async ({ page }) => {
    await mount(page, [ownFx('a', { multiple: true, accept: ['.pdf'], name: 'attachments', required: true, constraintsText: 'x', typeErrorText: 'PDF only.' })]);
    await inForm(page);
    const id = 'a';
    await turn(page);
    await listen(page);
    const answer = await host(page, id).evaluate((el) => {
      const upload = el as Upload;
      const given = [new File(['aa'], 'a.pdf', { lastModified: 1 }), new File(['m'], 'holiday.mov', { lastModified: 1 }), new File(['bbb'], 'b.pdf', { lastModified: 1 })];
      const refused = upload.add(given);
      const first = upload.files;
      const second = upload.files;
      first.pop();
      first.push(new File(['x'], 'pushed.pdf'));
      return {
        refused: refused.map((each) => ({ same: each.file === given[1], reason: each.reason, keys: Object.keys(each).sort() })),
        isArray: Array.isArray(refused),
        fresh: first !== second,
        handles: second.every((f, index) => f === [given[0], given[2]][index]),
        after: upload.files.map((f) => f.name),
      };
    });
    expect(answer).toEqual({ refused: [{ same: true, reason: 'type', keys: ['file', 'reason'] }], isArray: true, fresh: true, handles: true, after: ['a.pdf', 'b.pdf'] });
    await expect.poll(() => drawn(page, id)).toEqual(['a.pdf', 'b.pdf', 'holiday.mov!PDF only.']);
    // Announced as a choice is, and without an event.
    await expect.poll(() => said(page, id)).toEqual(['a.pdf', 'b.pdf', 'holiday.mov, PDF only.']);
    expect(await heard(page)).toEqual([]);
    expect(await submitted(page)).toEqual(['attachments=a.pdf:2', 'attachments=b.pdf:3', 'note=hello']);
    // Anything iterable is taken; what is no file is passed over.
    expect(await host(page, id).evaluate((el) => (el as Upload).add(new Set([new File(['c'], 'c.pdf', { lastModified: 1 }), 'words' as unknown as File])).length)).toBe(0);
    await expect.poll(() => keptNames(page, id)).toEqual(['a.pdf', 'b.pdf', 'c.pdf']);
    // clear(): no row, an empty form value and, with required, a missing value; nothing is said; focus on a row goes to the trigger.
    await turn(page);
    const before = await said(page, id);
    await inRow(ownRow(page, id, 1), 'remove').focus();
    await host(page, id).evaluate((el) => (el as Upload).clear());
    await expect(ownRows(page, id)).toHaveCount(0);
    await expect(list(page, id)).toBeHidden();
    expect(await keptNames(page, id)).toEqual([]);
    expect(await submitted(page)).toEqual(['note=hello']);
    expect(await host(page, id).evaluate((el) => (el as HTMLElement & { validity: ValidityState }).validity.valueMissing)).toBe(true);
    await expect.poll(() => focused(page)).toContain('tanrei-button');
    await turn(page);
    expect(await said(page, id), 'a clearing is not announced').toEqual(before);
    expect(await heard(page)).toEqual([]);
    // Disabled stops the person, not the product.
    await host(page, id).evaluate((el) => ((el as Upload).disabled = true));
    expect(await give(page, id, [A, MOV])).toEqual(['holiday.mov:type']);
    await expect.poll(() => drawn(page, id)).toEqual(['a.pdf', 'holiday.mov!PDF only.']);
    expect(await keptNames(page, id)).toEqual(['a.pdf']);
    await host(page, id).evaluate((el) => (el as Upload).clear());
    await expect(ownRows(page, id)).toHaveCount(0);
    expect(await heard(page)).toEqual([]);
  });

  test('FUP-49: in a form it submits under its name every file it keeps, in order — never a refused file, and no empty entry while it keeps none — and nothing while disabled, by itself or by its fieldset, when the rows stay readable; it reports a missing value with the browser’s own message while required and nothing is kept; a reset does what clear() does and emits no change; after a submission the files and rows stay; nothing is restored; without a name it submits nothing and still keeps and draws its files', async ({ page, browserName }) => {
    await mount(page, [ownFx('a', { label: 'Attachments', multiple: true, accept: ['.pdf', '.png'], name: 'attachments', constraintsText: 'x', typeErrorText: 'No.' })]);
    await inForm(page);
    const id = 'a';
    // It keeps none: no entry at all — a native file input would submit one empty entry.
    expect(await submitted(page)).toEqual(['note=hello']);
    expect(await host(page, id).evaluate((el) => (el as HTMLElement & { form: HTMLFormElement | null }).form?.id)).toBe('f');
    // Chosen by a person, with nothing written by the product: the form has the files.
    await choose(page, id, [{ name: 'first.pdf', type: 'application/pdf', size: 3, modified: 1000 }, MOV, { name: 'second.png', type: 'image/png', size: 5, modified: 1000 }]);
    await expect.poll(() => submitted(page)).toEqual(['attachments=first.pdf:3', 'attachments=second.png:5', 'note=hello']);
    await expect(ownRows(page, id)).toHaveCount(3);
    // What the browser sends: the form, submitted for real to a server of the test's own.
    await listen(page);
    const taken = await new Promise<{ type: string; body: string }>((resolve, reject) => {
      const server = http.createServer((request, response) => {
        const chunks: Buffer[] = [];
        request.on('data', (chunk: Buffer) => chunks.push(chunk));
        request.on('end', () => {
          response.writeHead(204).end();
          server.close();
          resolve({ type: String(request.headers['content-type']), body: Buffer.concat(chunks).toString('latin1') });
        });
      });
      server.on('error', reject);
      server.listen(0, '127.0.0.1', () => {
        const { port } = server.address() as { port: number };
        void page.evaluate((action) => {
          const form = document.querySelector('form')!;
          form.action = action;
          form.requestSubmit();
        }, `http://127.0.0.1:${port}/taken`);
      });
    });
    expect(taken.type).toContain('multipart/form-data');
    expect(taken.body.indexOf('filename="first.pdf"'), `${browserName}: the first kept file`).toBeGreaterThan(-1);
    expect(taken.body.indexOf('filename="second.png"'), 'in the order they are kept').toBeGreaterThan(taken.body.indexOf('filename="first.pdf"'));
    expect(taken.body.match(/name="attachments"/g)?.length).toBe(2);
    expect(taken.body, 'never a refused file').not.toContain('holiday.mov');
    // After the submission the files and the rows stay: what follows is the product's.
    await turn(page);
    expect(await drawn(page, id)).toEqual(['first.pdf', 'second.png', 'holiday.mov!No.']);
    expect(await keptNames(page, id)).toEqual(['first.pdf', 'second.png']);
    // Disabled by its fieldset: it submits nothing; the rows stay readable and their remove actions are disabled.
    await page.evaluate(() => (document.querySelector('fieldset')!.disabled = true));
    await expect(inRow(ownRow(page, id, 0), 'remove')).toBeDisabled();
    expect(await host(page, id).evaluate((el) => el.matches(':disabled'))).toBe(true);
    expect(await submitted(page)).toEqual(['note=hello']);
    await expect(inRow(ownRow(page, id, 0), 'headline')).toBeVisible();
    expect(await keptNames(page, id)).toEqual(['first.pdf', 'second.png']);
    await page.evaluate(() => (document.querySelector('fieldset')!.disabled = false));
    await expect.poll(() => submitted(page)).toHaveLength(3);
    // Disabled by itself.
    await host(page, id).evaluate((el) => ((el as Upload).disabled = true));
    await expect.poll(() => submitted(page)).toEqual(['note=hello']);
    await host(page, id).evaluate((el) => ((el as Upload).disabled = false));
    await expect.poll(() => submitted(page)).toHaveLength(3);
    // Without a name it submits nothing, and still keeps and draws its files.
    await host(page, id).evaluate((el) => el.removeAttribute('name'));
    await expect.poll(() => submitted(page)).toEqual(['note=hello']);
    expect(await keptNames(page, id)).toEqual(['first.pdf', 'second.png']);
    await expect(ownRows(page, id)).toHaveCount(3);
    await host(page, id).evaluate((el) => el.setAttribute('name', 'attachments'));
    // Required: answered while a file is kept; a missing value, with the browser's own words, once none is.
    const validity = () => host(page, id).evaluate((el: HTMLElement & { validity: ValidityState; validationMessage: string; checkValidity: () => boolean }) => ({ missing: el.validity.valueMissing, valid: el.checkValidity(), message: el.validationMessage }));
    await host(page, id).evaluate((el) => ((el as Upload).required = true));
    await expect.poll(async () => (await validity()).valid, { message: 'a file is kept' }).toBe(true);
    // A reset does what clear() does: no file, no row — and no change.
    await forget(page);
    await page.locator('#reset').click();
    await expect(ownRows(page, id)).toHaveCount(0);
    expect(await keptNames(page, id)).toEqual([]);
    expect(await submitted(page)).toEqual(['note=hello']);
    await turn(page);
    expect(await heard(page), 'a reset is not a person’s act on this control').toEqual([]);
    const native = await page.evaluate(() => Object.assign(document.createElement('input'), { type: 'file', required: true }).validationMessage);
    const now = await validity();
    expect(now.missing).toBe(true);
    expect(now.valid).toBe(false);
    expect(now.message).toBe(native || 'Attachments');
    expect(await page.evaluate(() => document.querySelector('form')!.checkValidity())).toBe(false);
    // A refused file does not answer it; a kept one does.
    await give(page, id, [MOV]);
    expect((await validity()).missing).toBe(true);
    await give(page, id, [A]);
    await expect.poll(async () => (await validity()).valid).toBe(true);
    // Nothing is restored: a state the browser brings back is not taken, and none is given to it.
    await host(page, id).evaluate((el) => (el as Upload).clear());
    await host(page, id).evaluate((el: HTMLElement & { formStateRestoreCallback: (state: unknown, mode: string) => void }) => {
      const state = new FormData();
      state.append('attachments', new File(['old'], 'restored.pdf'));
      el.formStateRestoreCallback(state, 'restore');
    });
    await turn(page);
    await expect(ownRows(page, id)).toHaveCount(0);
    expect(await keptNames(page, id)).toEqual([]);
    expect((await validity()).missing, 'invalid again, as an empty one is').toBe(true);
  });

  test('FUP-50: one arrival is one polite message through the one live region — the name of each file newly kept, then each refused file’s name and its sentence, in the order of the rows — and announcement set in the answer to select, reject or change is said alone; a removal, a clearing, a reset and a file passed over say nothing, and no count is built', async ({ page }, testInfo) => {
    await mount(page, [ownFx('a', { multiple: true, accept: ['.pdf'], constraintsText: 'x', typeErrorText: 'Only PDF files can be added.' })]);
    await inForm(page);
    const id = 'a';
    await turn(page);
    await expect(host(page, id).locator('[aria-live]')).toHaveCount(1);
    expect(await region(page, id).getAttribute('aria-live')).toBe('polite');
    expect(await said(page, id)).toEqual([]);
    // Two files: one text holding both names.
    await chooseFromDisk(page, id, testInfo, ['a.pdf', 'b.pdf']);
    await expect.poll(() => said(page, id)).toEqual(['a.pdf', 'b.pdf']);
    // A refused file adds its name and its sentence — after the kept ones, as the rows stand.
    await choose(page, id, [MOV, C]);
    await expect.poll(() => said(page, id)).toEqual(['c.pdf', 'holiday.mov, Only PDF files can be added.']);
    // A file passed over is not said, and writes nothing.
    await chooseFromDisk(page, id, testInfo, ['a.pdf']);
    await turn(page);
    expect(await said(page, id)).toEqual(['c.pdf', 'holiday.mov, Only PDF files can be added.']);
    // A removal writes nothing.
    await inRow(ownRow(page, id, 0), 'remove').click();
    await expect(ownRows(page, id)).toHaveCount(2);
    await turn(page);
    expect(await said(page, id), 'a removal is not announced').toEqual(['c.pdf', 'holiday.mov, Only PDF files can be added.']);
    // The product's sentence, set in its answer to change: said alone.
    await host(page, id).evaluate((el) => el.addEventListener('change', () => ((el as Upload).announcement = `${(el as Upload).files.length} files in the list`), { once: true }));
    await choose(page, id, [{ name: 'd.pdf', modified: 1000 }, MOV]);
    await expect.poll(() => said(page, id)).toEqual(['3 files in the list']);
    // A clearing and a reset say nothing.
    await host(page, id).evaluate((el) => (el as Upload).clear());
    await turn(page);
    await give(page, id, [A]);
    await expect.poll(() => said(page, id)).toEqual(['a.pdf']);
    await page.locator('#reset').click();
    await turn(page);
    expect(await said(page, id)).toEqual(['a.pdf']);
    // No word of its own and no count: every line is a name, or a name and the product's sentence.
    expect((await region(page, id).textContent()) ?? '').not.toMatch(/\d|added|removed/i);
    expect(await focused(page)).not.toContain('announce');
  });

  test('FUP-51: a kept file is the browser’s own handle and nothing more — no reader, arrayBuffer, text, stream, slice or object URL is used for it while it is chosen, handed over, drawn with its size, submitted and removed — and the files are kept while the element is taken out of the page and put back', async ({ page }) => {
    await mount(page, [ownFx('a', { multiple: true, name: 'attachments' })]);
    await inForm(page);
    const id = 'a';
    await spyOnReading(page);
    await host(page, id).evaluate((el) => ((el as Upload).formatSize = (bytes) => `${bytes} B`));
    await choose(page, id, [{ ...A, size: 2000 }, B]);
    await give(page, id, [C]);
    await expect(ownRows(page, id)).toHaveCount(3);
    await expect(inRow(ownRow(page, id, 0), 'supporting')).toHaveText('2000 B');
    expect(await submitted(page)).toHaveLength(4);
    await inRow(ownRow(page, id, 1), 'remove').click();
    await expect(ownRows(page, id)).toHaveCount(2);
    await turn(page);
    expect(await used(page)).toEqual([]);
    // Taken out of the page and put back: the same handles, drawn again, as a control keeps its value.
    const same = await host(page, id).evaluate(async (el) => {
      const upload = el as Upload;
      const before = upload.files;
      const parent = upload.parentElement!;
      upload.remove();
      const out = upload.files.length;
      parent.append(upload);
      await upload.updateComplete;
      return { out, same: upload.files.every((f, index) => f === before[index]), count: upload.files.length };
    });
    expect(same).toEqual({ out: 2, same: true, count: 2 });
    await expect.poll(() => drawn(page, id)).toEqual(['a.pdf', 'c.pdf']);
    expect(await submitted(page)).toEqual(['attachments=a.pdf:2000', 'attachments=c.pdf:4', 'note=hello']);
    // Let go: on clear, nothing of it is left to read.
    await host(page, id).evaluate((el) => (el as Upload).clear());
    expect(await keptNames(page, id)).toEqual([]);
    expect(await used(page)).toEqual([]);
  });

  test('FUP-52: rows changing from own to given lets go of every kept file, removes every row it drew and draws the product’s rows from then on; from given to own it begins with none and stops drawing the product’s rows; in both directions nothing is emitted or announced, focus a leaving row held goes to the trigger, and no file is carried across', async ({ page }) => {
    await mount(page, [ownFx('a', { multiple: true, name: 'attachments', accept: ['.pdf'], constraintsText: 'x', typeErrorText: 'No.', retryLabel: 'Try again' })]);
    await inForm(page);
    const id = 'a';
    // The product's rows are written, and not drawn while rows is own.
    await host(page, id).evaluate((el) => {
      el.insertAdjacentHTML('beforeend', '<tanrei-file-item value="p" name="product.pdf" status-text="Waiting"></tanrei-file-item>');
      (el.querySelector('tanrei-file-item') as HTMLElement & { file: File | null }).file = new File(['p'], 'product.pdf');
    });
    await give(page, id, [A, B, MOV]);
    await expect(ownRows(page, id)).toHaveCount(3);
    await turn(page);
    const before = await said(page, id);
    await listen(page);
    // own → given, with focus on a row it drew.
    await inRow(ownRow(page, id, 1), 'remove').focus();
    await host(page, id).evaluate((el) => ((el as Upload).rows = 'given'));
    await expect(ownRows(page, id)).toHaveCount(0);
    await expect(inRow(row(page, id, 0), 'headline')).toBeVisible();
    await expect(stage(page, id).getByRole('listitem')).toHaveCount(1);
    expect(await keptNames(page, id)).toEqual([]);
    await expect.poll(() => submitted(page), { message: 'the product’s rows are the form’s value now' }).toEqual(['attachments=product.pdf:1', 'note=hello']);
    await expect.poll(() => focused(page), { message: 'focus a leaving row held goes to the trigger' }).toContain('tanrei-button');
    await turn(page);
    expect(await said(page, id), 'nothing is announced — not the product’s row either').toEqual(before);
    // given → own, with focus on a row of the product's: it begins with none.
    await inRow(row(page, id, 0), 'remove').focus();
    await host(page, id).evaluate((el) => ((el as Upload).rows = 'own'));
    await expect(list(page, id)).toBeHidden();
    await expect(stage(page, id).getByRole('listitem')).toHaveCount(0);
    expect(await rows(page, id).first().evaluate((el) => el.getClientRects().length), 'the product’s row is no longer drawn').toBe(0);
    expect(await keptNames(page, id), 'no file is carried across').toEqual([]);
    await expect.poll(() => submitted(page)).toEqual(['note=hello']);
    await expect.poll(() => focused(page)).toContain('tanrei-button');
    await turn(page);
    expect(await said(page, id)).toEqual(before);
    expect(await heard(page), 'nothing is emitted').toEqual([]);
    // It keeps its own files again from then on.
    await give(page, id, [C]);
    await expect.poll(() => drawn(page, id)).toEqual(['c.pdf']);
    // Said by its property before it was first drawn: the product's rows are drawn, as with the attribute.
    const hidden = await page.evaluate(async () => {
      const upload = document.createElement('tanrei-file-upload') as Upload & { label: string };
      upload.label = 'Late';
      upload.innerHTML = '<tanrei-button slot="trigger">Choose</tanrei-button><tanrei-file-item value="a" name="a.pdf"></tanrei-file-item>';
      document.querySelector('main')!.append(upload);
      upload.rows = 'given';
      await upload.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 30));
      return upload.shadowRoot!.querySelector<HTMLElement>('.list')!.hidden;
    });
    expect(hidden).toBe(false);
  });

  test('FUP-53: the three sentences are the instance’s prop and, while that is empty, the product’s words (fileTypeErrorText, fileSizeErrorText, fileCountErrorText), and nothing else — none is built from accept, maxSize, maxFiles or a file’s kind or size; they are read only while rows is own, and needed only once a file was refused for that reason', async ({ page }) => {
    const warnings = logged(page);
    await mount(page, [
      ownFx('a', { multiple: true, accept: ['.pdf'], maxSize: 100, maxFiles: 1, constraintsText: 'PDF, 100 bytes, one file', sizeErrorText: 'Larger than 100 bytes.' }),
      fx('given', { label: 'Given', multiple: true, accept: ['.pdf'], maxSize: 100, maxFiles: 1, constraintsText: 'x', ...WORDS }),
    ]);
    const id = 'a';
    // Kept files need none of the three.
    await give(page, id, [A]);
    await turn(page);
    for (const key of ['fileTypeErrorText', 'fileSizeErrorText', 'fileCountErrorText']) expect(await missingWords(page), 'needed only once a file was refused').not.toContain(key);
    // Refused, with neither the prop nor the product's words: no sentence — nothing made from the limits.
    await give(page, id, [MOV, { name: 'big.pdf', size: 500, modified: 1000 }, B]);
    await expect.poll(() => drawn(page, id)).toEqual(['a.pdf', 'holiday.mov!', 'big.pdf!Larger than 100 bytes.', 'b.pdf!']);
    await expect(inRow(ownRow(page, id, 1), 'said')).toHaveCount(0);
    await expect(inRow(ownRow(page, id, 1), 'mark')).toHaveCount(1);
    await turn(page);
    expect(await missingWords(page)).toEqual(expect.arrayContaining(['fileCountErrorText', 'fileTypeErrorText']));
    expect(await missingWords(page)).not.toContain('fileSizeErrorText');
    // The product's words, given once for every file upload: drawn at once.
    await setWords(page, { fileTypeErrorText: 'This kind of file cannot be added.', fileSizeErrorText: 'This file is too large.', fileCountErrorText: 'No more files can be added.' });
    await expect.poll(() => drawn(page, id)).toEqual(['a.pdf', 'holiday.mov!This kind of file cannot be added.', 'big.pdf!Larger than 100 bytes.', 'b.pdf!No more files can be added.']);
    // The instance's prop wins, by its attribute.
    await host(page, id).evaluate((el) => {
      el.setAttribute('type-error-text', 'Only PDF files can be added.');
      el.setAttribute('count-error-text', 'One file at most.');
    });
    await expect.poll(() => drawn(page, id)).toEqual(['a.pdf', 'holiday.mov!Only PDF files can be added.', 'big.pdf!Larger than 100 bytes.', 'b.pdf!One file at most.']);
    expect(await host(page, id).evaluate((el) => (el as Upload & { typeErrorText: string; sizeErrorText: string; countErrorText: string }).typeErrorText)).toBe('Only PDF files can be added.');
    // While rows is given they are not read: a refusal there needs no word of these, and reports none.
    await setWords(page, { fileTypeErrorText: '', fileSizeErrorText: '', fileCountErrorText: '' });
    await host(page, id).evaluate((el) => (el as Upload).clear());
    await choose(page, 'given', [MOV, { name: 'big.pdf', size: 500 }]);
    await turn(page);
    await expect(host(page, 'given').locator(ITEM)).toHaveCount(0);
    expect(await missingWords(page)).not.toContain('fileSizeErrorText');
    expect(warnings.filter((w) => w.includes('fileSizeErrorText'))).toEqual([]);
  });

  test('FUP-54: what the spec says of a row, of the list and of what stands around them holds for the rows it drew itself — the column, the List’s small gap apart, each as wide as the file upload, a name that wraps and is never cut; emptyText while there is no row; disabled rows that stay readable with their remove actions disabled and out of the focus order, and no change; rows that come and go at once; enlarged text; forced colors; and right-to-left, with a Latin name keeping its order', async ({ page, browserName }) => {
    const long = 'quarterly-report-with-a-very-long-name-that-cannot-fit-on-one-line-of-the-row-2026-final-version-reviewed.pdf';
    await mount(page, [ownFx('a', { multiple: true, emptyText: 'No file chosen', accept: ['.pdf'], constraintsText: 'x', typeErrorText: 'Only PDF files can be added.' }), ownFx('rtl', { multiple: true }, { direction: 'rtl' })]);
    const id = 'a';
    await expect(emptyText(page, id)).toHaveText('No file chosen');
    await expect(list(page, id)).toBeHidden();
    await give(page, id, [{ name: long, modified: 1000 }, B, MOV]);
    await expect(ownRows(page, id)).toHaveCount(3);
    // FUP-2: emptyText is drawn only while the list holds no row; the trigger's description follows.
    await expect(emptyText(page, id)).toHaveCount(0);
    // FUP-17: one column, item-gap apart, as wide as the file upload; the name whole.
    const [outer, first, second] = [await box(host(page, id)), await box(ownRow(page, id, 0)), await box(ownRow(page, id, 1))];
    near(first.width, outer.width, 'as wide as the file upload');
    near(second.y - (first.y + first.height), await resolveToken(page, '--tanrei-comp-list-gap-small'), 'the List’s small gap');
    near((await box(list(page, id))).y - ((await box(chooser(page, id))).y + (await box(chooser(page, id))).height), await token(page, 'list-gap'), 'list.gap');
    const name = inRow(ownRow(page, id, 0), 'headline');
    expect((await box(name)).height, 'the name wraps').toBeGreaterThan(Number.parseFloat(await css(name, 'line-height')) * 1.5);
    expect(await name.evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && getComputedStyle(el).textOverflow !== 'ellipsis')).toBe(true);
    await expect(name).toHaveText(long);
    // FUP-25: a list of as many items, each read with its name.
    await expect(stage(page, id).getByRole('list')).toHaveCount(1);
    await expect(stage(page, id).getByRole('listitem')).toHaveCount(3);
    await expect(inRow(ownRow(page, id, 1), 'remove')).toHaveAttribute('aria-label', 'Remove b.pdf');
    // FUP-29: a row appears and leaves at once, without a motion.
    expect(await ownRow(page, id, 1).evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
    // FUP-34: in forced colors the rows are drawn in the system's colors.
    if (browserName !== 'webkit') {
      await page.emulateMedia({ forcedColors: 'active' });
      await expect(inRow(ownRow(page, id, 2), 'supporting')).toBeVisible();
      await page.emulateMedia({ forcedColors: 'none' });
    }
    // FUP-28: disabled — readable, the remove actions disabled and no stops, nothing removed, no change.
    await listen(page);
    await host(page, id).evaluate((el) => ((el as Upload).disabled = true));
    await expect(inRow(ownRow(page, id, 0), 'remove')).toBeDisabled();
    await expect(inRow(ownRow(page, id, 0), 'headline')).toBeVisible();
    expect(await host(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('.list > tanrei-list-item > tanrei-file-item')].filter((r) => !r.shadowRoot!.querySelector<HTMLButtonElement>('.action.remove')!.disabled).length)).toBe(0);
    await ownRow(page, id, 0).evaluate((el) => el.shadowRoot!.querySelector<HTMLElement>('.action.remove')!.click());
    await ownRow(page, id, 0).evaluate((el) => el.dispatchEvent(new CustomEvent('remove', { bubbles: true, detail: { value: '' } })));
    await turn(page);
    await expect(ownRows(page, id)).toHaveCount(3);
    expect(await heard(page), 'no change while disabled').toEqual([]);
    // FUP-35, FUP-37: right-to-left — the glyph at the right, the remove action at the left, a Latin name in its own order.
    await give(page, 'rtl', [{ name: 'brief.pdf', modified: 1000 }]);
    const r = ownRow(page, 'rtl', 0);
    await expect(r).toBeVisible();
    const [icon, remove, headline] = [await box(inRow(r, 'icon')), await box(inRow(r, 'remove')), await box(inRow(r, 'headline'))];
    expect(icon.x, 'the glyph at the right').toBeGreaterThan(headline.x);
    expect(remove.x, 'the remove action at the left').toBeLessThan(headline.x);
    await expect(inRow(r, 'headline')).toHaveText('brief.pdf');
    expect(await inRow(r, 'headline').evaluate((el) => getComputedStyle(el).unicodeBidi)).toMatch(/isolate|plaintext/);
    // FUP-33: the page as a reader with text at 200 % loads it, in a width of 320 — nothing is cut and nothing scrolls sideways.
    await page.setViewportSize({ width: 320, height: 2400 });
    await mount(page, [ownFx('a', { multiple: true, accept: ['.pdf'], constraintsText: 'x', typeErrorText: 'Only PDF files can be added.' })], {
      lead: `<style>html { font-size: 200%; } main { display: block !important; } .stage { box-sizing: border-box; inline-size: 320px !important; } .stage > ${TAG} { inline-size: auto !important; }</style>`,
    });
    await give(page, id, [{ name: long, modified: 1000 }, MOV]);
    await expect(ownRows(page, id)).toHaveCount(2);
    await frames(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'nothing scrolls sideways').toBe(true);
    for (const index of [0, 1]) {
      const whole = await box(ownRow(page, id, index));
      expect(whole.x + whole.width, `row ${index}`).toBeLessThanOrEqual(320.5);
      for (const part of ['headline', 'supporting'] as const) {
        const line = inRow(ownRow(page, id, index), part);
        if (await line.count()) expect(await line.evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && getComputedStyle(el).textOverflow !== 'ellipsis'), `row ${index} ${part} is not cut`).toBe(true);
      }
    }
  });

  test('FUP-55: accept, maxSize, maxFiles or multiple changing while files are kept judges from the next arrival on and neither judges again, marks nor lets go of a kept file — files kept under multiple stay when it becomes false, and the next file that passes takes the place of them all; a changed size function or sentence is drawn at once on the rows it holds, and announces nothing', async ({ page }) => {
    await mount(page, [ownFx('a', { multiple: true, constraintsText: 'x', typeErrorText: 'No.' })]);
    const id = 'a';
    await give(page, id, [A, MOV, { name: 'big.pdf', size: 500, modified: 1000 }]);
    await expect.poll(() => drawn(page, id)).toEqual(['a.pdf', 'holiday.mov', 'big.pdf']);
    await turn(page);
    const before = await said(page, id);
    await listen(page);
    // The limits change: every kept file stays, unmarked.
    await host(page, id).evaluate((el) => Object.assign(el as Upload & { accept: string[]; maxSize: number | null; maxFiles: number | null }, { accept: ['.pdf'], maxSize: 100, maxFiles: 1 }));
    await turn(page);
    expect(await drawn(page, id)).toEqual(['a.pdf', 'holiday.mov', 'big.pdf']);
    // The next arrival is judged by the new values.
    expect(await give(page, id, [{ name: 'clip.mov', modified: 1000 }, { name: 'huge.pdf', size: 900, modified: 1000 }, B])).toEqual(['clip.mov:type', 'huge.pdf:size', 'b.pdf:count']);
    expect(await keptNames(page, id)).toEqual(['a.pdf', 'holiday.mov', 'big.pdf']);
    // multiple becomes false: the files stay …
    await host(page, id).evaluate((el) => Object.assign(el as Upload & { maxFiles: number | null }, { multiple: false, maxFiles: null }));
    await turn(page);
    expect(await keptNames(page, id)).toEqual(['a.pdf', 'holiday.mov', 'big.pdf']);
    // … and the next file that passes takes the place of them all.
    await give(page, id, [B]);
    await expect.poll(() => drawn(page, id)).toEqual(['b.pdf']);
    // A sentence and the size function: drawn at once, and nothing is said.
    await give(page, id, [MOV]);
    await expect.poll(() => drawn(page, id)).toEqual(['b.pdf', 'holiday.mov!No.']);
    await turn(page);
    const spoken = await said(page, id);
    await host(page, id).evaluate((el) => Object.assign(el as Upload & { typeErrorText: string }, { typeErrorText: 'Only PDF files can be added.', formatSize: (bytes: number) => `${bytes} bytes` }));
    await expect.poll(() => drawn(page, id)).toEqual(['b.pdf', 'holiday.mov!Only PDF files can be added.']);
    await expect(inRow(ownRow(page, id, 0), 'supporting')).toHaveText('4 bytes');
    await expect(inRow(ownRow(page, id, 1), 'supporting')).toContainText('4 bytes');
    await host(page, id).evaluate((el) => ((el as Upload).formatSize = null));
    await expect(inRow(ownRow(page, id, 0), 'supporting')).toHaveCount(0);
    await turn(page);
    expect(await said(page, id), 'announces nothing').toEqual(spoken);
    expect(spoken).not.toEqual(before);
    expect(await heard(page)).toEqual([]);
  });

  // ── The six ids that gained "WHILE rows is given": what each says of rows own ──

  test('FUP-7: while rows is own it still never uploads and never reads — choosing, dropping, handing over, removing and submitting make no request and use no reader, stream or object URL — and it keeps of a file only the browser’s handle, drawing its name and the size the product’s function writes', async ({ page }) => {
    await mount(page, [ownFx('a', { layout: 'drop-area', multiple: true, accept: ['.pdf', 'image/*'], maxSize: 1000, name: 'attachments', constraintsText: 'x', typeErrorText: 'No.', sizeErrorText: 'Too large.' })]);
    await inForm(page);
    const id = 'a';
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await spyOnReading(page);
    await listen(page);
    await choose(page, id, [A, TXT, { name: 'big.pdf', type: 'application/pdf', size: 5000, modified: 1000 }]);
    for (const type of ['dragenter', 'dragover', 'drop'] as const) await drag(page, id, type, [PNG, TXT]);
    await give(page, id, [C]);
    await inRow(ownRow(page, id, 0), 'remove').click();
    expect(await submitted(page)).not.toHaveLength(0);
    await turn(page);
    expect((await heard(page)).map((h) => h.type).filter((type) => type !== 'change')).toEqual(expect.arrayContaining(['select', 'reject']));
    expect(await used(page)).toEqual([]);
    expect(requests).toEqual([]);
    // The picker holds nothing after the choice: what is kept is the handle select carried, and nothing was copied.
    expect(await host(page, id).evaluate((el) => el.shadowRoot!.querySelector('tanrei-file-picker')!.shadowRoot!.querySelector<HTMLInputElement>('input')!.files!.length)).toBe(0);
    expect(await host(page, id).evaluate((el) => (el as Upload).files.every((f) => f instanceof File))).toBe(true);
  });

  test('FUP-9: while rows is own its file picker judges what arrives by the same rule and the room is measured against the files kept — and the file upload keeps what passed', async ({ page }) => {
    await mount(page, [ownFx('a', { multiple: true, accept: ['.pdf', 'image/*'], maxSize: 100, maxFiles: 3, constraintsText: 'x', typeErrorText: 'T', sizeErrorText: 'S', countErrorText: 'C' })]);
    const id = 'a';
    await listen(page);
    await choose(page, id, [A]);
    await expect(ownRows(page, id)).toHaveCount(1);
    await forget(page);
    await choose(page, id, [TXT, { name: 'big.pdf', type: 'application/pdf', size: 500, modified: 1000 }, { ...PNG, modified: 1000 }, { name: 'UPPER.PDF', modified: 1000 }, C, { name: 'huge.txt', size: 900, modified: 1000 }]);
    await expect.poll(() => drawn(page, id)).toEqual(['a.pdf', 'plan.png', 'UPPER.PDF', 'notes.txt!T', 'big.pdf!S', 'huge.txt!T', 'c.pdf!C']);
    expect(await heard(page)).toEqual([
      { type: 'select', files: ['plan.png', 'UPPER.PDF'] },
      { type: 'reject', files: ['notes.txt', 'big.pdf', 'huge.txt', 'c.pdf'], reasons: ['type', 'size', 'type', 'count'] },
      { type: 'change', files: ['a.pdf', 'plan.png', 'UPPER.PDF'] },
    ]);
  });

  test('FUP-17: while rows is own the rows are the kept files in the order they are kept and then the refused ones, added and removed by the file upload itself; with none it draws no list, keeps no room for one and exposes none', async ({ page }) => {
    await mount(page, [ownFx('a', { multiple: true, accept: ['.pdf'], constraintsText: 'x', typeErrorText: 'No.' })]);
    const id = 'a';
    await expect(list(page, id)).toBeHidden();
    await expect(stage(page, id).getByRole('list')).toHaveCount(0);
    const empty = (await box(host(page, id))).height;
    await give(page, id, [MOV, B, A]);
    await expect.poll(() => drawn(page, id)).toEqual(['b.pdf', 'a.pdf', 'holiday.mov!No.']);
    const tops = await ownRows(page, id).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
    expect([...tops].sort((x, y) => x - y)).toEqual(tops);
    await give(page, id, [C]);
    await expect.poll(() => drawn(page, id), { message: 'kept after the files it already keeps' }).toEqual(['b.pdf', 'a.pdf', 'c.pdf']);
    // The product wrote no row, and none is in its light DOM.
    await expect(rows(page, id)).toHaveCount(0);
    await host(page, id).evaluate((el) => (el as Upload).clear());
    await expect(list(page, id)).toBeHidden();
    near((await box(host(page, id))).height, empty, 'no room is kept for a list');
  });

  test('FUP-21: while rows is own a row ends in the remove action alone — never a retry action — and activating it removes the row itself; the action is a stop in the focus order after the trigger, in the order of the rows', async ({ page }) => {
    await mount(page, [ownFx('a', { multiple: true, accept: ['.pdf'], constraintsText: 'x', typeErrorText: 'No.', retryLabel: 'Try again' })]);
    const id = 'a';
    await give(page, id, [A, B, MOV]);
    await expect(ownRows(page, id)).toHaveCount(3);
    await expect(host(page, id).locator('.action.retry')).toHaveCount(0);
    await expect(host(page, id).locator('.action.remove')).toHaveCount(3);
    const stop = () =>
      host(page, id).evaluate((el) => {
        const active = el.shadowRoot!.activeElement as (HTMLElement & { name?: string }) | null;
        return active?.localName === 'tanrei-file-item' ? String(active.name) : document.activeElement === el.querySelector('[slot="trigger"]') ? 'trigger' : '';
      });
    await tabTo(page, trigger(page, id));
    expect(await stop()).toBe('trigger');
    const order: string[] = [];
    for (let i = 0; i < 3; i++) {
      await tab(page);
      order.push(await stop());
    }
    expect(order).toEqual(['a.pdf', 'b.pdf', 'holiday.mov']);
    await inRow(ownRow(page, id, 0), 'remove').click();
    await expect.poll(() => drawn(page, id)).toEqual(['b.pdf', 'holiday.mov!No.']);
  });

  test('FUP-26: while rows is own a refused file is announced, with the files newly kept, through the same one polite live region; while rows is given a refused file is not announced by itself', async ({ page }) => {
    await mount(page, [ownFx('a', { multiple: true, accept: ['.pdf'], constraintsText: 'x', typeErrorText: 'Only PDF files can be added.' }), fx('given', { label: 'Given', multiple: true, accept: ['.pdf'], constraintsText: 'x', ...WORDS })]);
    await turn(page);
    await choose(page, 'given', [MOV]);
    await turn(page);
    expect(await said(page, 'given')).toEqual([]);
    await choose(page, 'a', [MOV, A]);
    await expect.poll(() => said(page, 'a')).toEqual(['a.pdf', 'holiday.mov, Only PDF files can be added.']);
    for (const id of ['a', 'given']) {
      await expect(host(page, id).locator('[aria-live]')).toHaveCount(1);
      expect(await region(page, id).getAttribute('aria-live')).toBe('polite');
    }
  });

  test('FUP-31: while rows is own the form is given the files the file upload keeps, and no row of the product’s gives it one', async ({ page }) => {
    await mount(page, [ownFx('a', { multiple: true, name: 'attachments' })]);
    await inForm(page);
    const id = 'a';
    await host(page, id).evaluate((el) => {
      el.insertAdjacentHTML('beforeend', '<tanrei-file-item value="p" name="product.pdf"></tanrei-file-item>');
      (el.querySelector('tanrei-file-item') as HTMLElement & { file: File | null }).file = new File(['p'], 'product.pdf');
    });
    await choose(page, id, [A, B]);
    await expect.poll(() => submitted(page)).toEqual(['attachments=a.pdf:4', 'attachments=b.pdf:4', 'note=hello']);
  });
  test('FUP-45: the order of judging — its file picker first (the kind, the size, the rule of one file), then a file it already keeps and a second copy passed over, then the room that is left — so the refused rows stand after the kept ones: first the files the file picker refused, in its order, then those refused for want of room, as reject carries them', async ({ page }, testInfo) => {
    await mount(page, [ownFx('order', { multiple: true, accept: ['.pdf'], maxSize: 10, maxFiles: 2, constraintsText: 'x', typeErrorText: 'PDF only.', sizeErrorText: 'Too large.', countErrorText: 'Two at most.' }), ownFx('one', { accept: ['.pdf'], maxFiles: 1, constraintsText: 'x', typeErrorText: 'PDF only.', countErrorText: 'One file.' })]);
    const id = 'order';
    const D: Given = { name: 'd.pdf', type: 'application/pdf', modified: 1000 };
    // Files from the disk: the browser reports each one's own time of last change, so a.pdf chosen again is the same file.
    await chooseFromDisk(page, id, testInfo, ['a.pdf']);
    await expect.poll(() => drawn(page, id)).toEqual(['a.pdf']);
    fs.mkdirSync(testInfo.outputPath('files'), { recursive: true });
    fs.writeFileSync(testInfo.outputPath('files', 'big.pdf'), Buffer.alloc(20, 1));
    await listen(page);
    // a.pdf is kept already and is passed over without taking room; c.pdf takes the room that is left; d.pdf finds none.
    await chooseFromDisk(page, id, testInfo, ['a.pdf', 'c.pdf', 'big.pdf', 'd.pdf', 'notes.txt']);
    await expect.poll(() => drawn(page, id)).toEqual(['a.pdf', 'c.pdf', 'big.pdf!Too large.', 'notes.txt!PDF only.', 'd.pdf!Two at most.']);
    expect(await heard(page)).toEqual([
      { type: 'select', files: ['c.pdf'] },
      { type: 'reject', files: ['big.pdf', 'notes.txt', 'd.pdf'], reasons: ['size', 'type', 'count'] },
      { type: 'change', files: ['a.pdf', 'c.pdf'] },
    ]);
    expect(await keptNames(page, id)).toEqual(['a.pdf', 'c.pdf']);
    // What is handed over is judged in the same order, and a second copy within one arrival is one file.
    await host(page, id).evaluate((el) => (el as Upload).clear());
    expect(await give(page, id, [{ name: 'movie.mov', type: 'video/quicktime' }, B, B, C, D])).toEqual(['movie.mov:type', 'd.pdf:count']);
    expect(await drawn(page, id)).toEqual(['b.pdf', 'c.pdf', 'movie.mov!PDF only.', 'd.pdf!Two at most.']);
    // The rule of one file is the file picker's, and comes before everything the file upload judges: more than one
    // where one is asked refuses them all, a file it already keeps among them.
    expect(await give(page, 'one', [A])).toEqual([]);
    expect(await give(page, 'one', [A, B])).toEqual(['a.pdf:count', 'b.pdf:count']);
    expect(await drawn(page, 'one')).toEqual(['a.pdf', 'a.pdf!One file.', 'b.pdf!One file.']);
    expect(await keptNames(page, 'one')).toEqual(['a.pdf']);
  });

  test('FUP-17: while rows is own a strip of tiles is the kept files and then the refused ones — the staged fixture tiles-own is two kept tiles and one refused — from the start edge, the List’s small gap apart, aligned at their tops; the refused one draws no picture', async ({ page }) => {
    await mountSpec(page, 'tiles-own');
    const id = 'tiles-own';
    expect(await drawn(page, id)).toEqual(['entrance.jpeg', 'floor-plan.png', 'brief.pdf!Only pictures can be added.']);
    expect(await keptNames(page, id)).toEqual(['entrance.jpeg', 'floor-plan.png']);
    const gap = await resolveToken(page, '--tanrei-comp-list-gap-small');
    const whole = await box(host(page, id));
    const each = await Promise.all((await ownRows(page, id).all()).map(box));
    near(each[0]!.x, whole.x, 'from the start edge');
    for (const index of [1, 2]) {
      near(each[index]!.y, each[0]!.y, `tile ${index}: aligned at the top`);
      near(each[index]!.x - (each[index - 1]!.x + each[index - 1]!.width), gap, `tile ${index}: list.item-gap`);
    }
    expect(await ownRows(page, id).evaluateAll((els) => els.map((el) => el.shadowRoot!.querySelector('.item')!.getAttribute('data-form')))).toEqual(['tile', 'tile', 'tile']);
    // FUP-45: a refused file is given no handle, so no picture of it is asked for.
    expect(await ownRows(page, id).evaluateAll((els) => els.map((el) => (el as unknown as { file: File | null }).file !== null))).toEqual([true, true, false]);
  });

  test('FUP-51: with itemPreview each image row that came into view makes exactly one address — made and drawn by its file item, never by the file upload — and it is released when its row is removed, when the kept files are cleared, when the form is reset and when rows becomes given; a file that is no image makes none, and none is made while itemPreview is false; two hundred pictures added, of which only those near what is in view make one, leave none held once they are removed and cleared', async ({ page }) => {
    await mount(page, [ownFx('pictures', { multiple: true, itemPreview: true, itemForm: 'tile' }), ownFx('plain', { multiple: true })]);
    await spyOnAddresses(page);
    const id = 'pictures';
    const state = () => addresses(page, id);
    // itemPreview false: a hundred files kept cost a hundred handles — no address, for an image either.
    await addPictures(page, 'plain', ['one.png', 'two.png'], [A]);
    await expect(ownRows(page, 'plain')).toHaveCount(3);
    await frames(page, 6);
    expect((await state()).made).toBe(0);
    // Three pictures and a document: three addresses, each drawn by one file item.
    expect(await addPictures(page, id, ['one.png', 'two.png', 'three.png'], [A])).toEqual([]);
    await expect.poll(async () => (await state()).drawn).toBe(3);
    await frames(page, 6);
    expect(await state()).toEqual({ made: 3, held: 3, twice: 0, drawn: 3, drawnAreMade: true, one: true });
    // The file upload draws no picture itself: its own tree holds none.
    expect(await host(page, id).evaluate((el) => el.shadowRoot!.querySelectorAll('img, canvas, picture').length)).toBe(0);
    // Its row is removed.
    await inRow(ownRow(page, id, 0), 'remove').click();
    await expect.poll(async () => (await state()).held, { message: 'released with its row' }).toBe(2);
    expect((await state()).made, 'no row makes a second one').toBe(3);
    // The kept files are cleared.
    await host(page, id).evaluate((el) => (el as Upload).clear());
    await expect.poll(async () => (await state()).held, { message: 'released when cleared' }).toBe(0);
    // rows becomes given.
    await addPictures(page, id, ['four.png', 'five.png']);
    await expect.poll(async () => (await state()).held).toBe(2);
    await set(host(page, id), { rows: 'given' });
    await expect.poll(async () => (await state()).held, { message: 'released when rows becomes given' }).toBe(0);
    await set(host(page, id), { rows: 'own' });
    // The form is reset.
    await inForm(page);
    await addPictures(page, id, ['six.png', 'seven.png']);
    await expect.poll(async () => (await state()).held).toBe(2);
    await page.locator('#reset').click();
    await expect(ownRows(page, id)).toHaveCount(0);
    await expect.poll(async () => (await state()).held, { message: 'released when the form is reset' }).toBe(0);
    // Two hundred pictures: only the rows in or near what is in view make an address.
    const before = (await state()).made;
    await addPictures(page, id, Array.from({ length: 200 }, (_, index) => `photo-${index}.png`));
    await expect(ownRows(page, id)).toHaveCount(200);
    await expect.poll(async () => (await state()).held).toBeGreaterThan(0);
    await frames(page, 6);
    const near = (await state()).made - before;
    expect(near, 'not one for every file kept').toBeLessThan(200);
    // The last rows come into view: theirs are made then, one each.
    await ownRow(page, id, 199).scrollIntoViewIfNeeded();
    await expect.poll(async () => (await state()).made - before).toBeGreaterThan(near);
    await frames(page, 6);
    const all = await state();
    expect(all.made - before, 'at most one for a row').toBeLessThanOrEqual(200);
    expect([all.held, all.drawnAreMade, all.one]).toEqual([all.made - before, true, true]);
    // A hundred removed one by one, the rest cleared: none is held, and none was released twice.
    await host(page, id).evaluate(async (el) => {
      for (let index = 0; index < 100; index++) el.shadowRoot!.querySelector('tanrei-file-item')!.shadowRoot!.querySelector<HTMLElement>('.action.remove')!.click();
      await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    });
    await expect(ownRows(page, id)).toHaveCount(100);
    await host(page, id).evaluate((el) => (el as Upload).clear());
    await expect(ownRows(page, id)).toHaveCount(0);
    await expect.poll(async () => (await state()).held, { message: 'no address outlives its row' }).toBe(0);
    expect((await state()).twice).toBe(0);
  });

  test('FUP-48: files handed over before the file upload was first drawn are judged by the same rule — by what it says of accept, maxSize and multiple then — kept or refused, and drawn when it is', async ({ page }) => {
    await mount(page, [ownFx('holder', {})]);
    const result = await page.evaluate(async () => {
      const upload = document.createElement('tanrei-file-upload') as HTMLElement & { add(files: File[]): { file: File; reason: string }[]; files: File[]; updateComplete: Promise<unknown> };
      Object.assign(upload, { label: 'Early', multiple: true, accept: ['.pdf'], maxSize: 10, maxFiles: 2, removeLabel: 'Remove', typeErrorText: 'PDF only.', sizeErrorText: 'Too large.', countErrorText: 'Two at most.', constraintsText: 'PDF' });
      upload.innerHTML = '<tanrei-button slot="trigger">Choose</tanrei-button>';
      const file = (name: string, size = 4, type = 'application/pdf') => new File([new Uint8Array(size)], name, { type, lastModified: 1000 });
      // Not in the page, never drawn: there is no file picker of its own yet.
      const refused = upload.add([file('a.pdf'), file('big.pdf', 20), file('notes.txt', 4, 'text/plain'), file('b.pdf'), file('c.pdf')]).map((each) => `${each.file.name}:${each.reason}`);
      const kept = upload.files.map((each) => each.name);
      document.querySelector('.stage')!.append(upload);
      await upload.updateComplete;
      const rows = [...upload.shadowRoot!.querySelectorAll('tanrei-file-item')] as (HTMLElement & { name: string; status: string; errorText: string; updateComplete: Promise<unknown> })[];
      await Promise.all(rows.map((row) => row.updateComplete));
      return { refused, kept, drawn: rows.map((row) => (row.status === 'error' ? `${row.name}!${row.errorText}` : row.name)), pickers: upload.shadowRoot!.querySelectorAll('tanrei-file-picker').length };
    });
    expect(result).toEqual({ refused: ['big.pdf:size', 'notes.txt:type', 'c.pdf:count'], kept: ['a.pdf', 'b.pdf'], drawn: ['a.pdf', 'b.pdf', 'big.pdf!Too large.', 'notes.txt!PDF only.', 'c.pdf!Two at most.'], pickers: 1 });
  });
});

// ── A reorderable file upload: FUP-59 ───────────────────────────────────────────────────────────────────────────
const MOVE_WORDS = {
  dragHandleLabel: 'Reorder {label}',
  moveToStartLabel: 'Move to start',
  moveBeforeLabel: 'Move up',
  moveAfterLabel: 'Move down',
  moveToEndLabel: 'Move to end',
  liftedText: '{label} lifted: {position} of {count}',
  movedText: '{label}: {position} of {count}',
  cancelledText: '{label} returned to {position} of {count}',
};
/** The handle of the List's item that holds row `index`, in the file upload's shadow root. */
const handleOf = (page: P, id: string, index: number) => host(page, id).locator('.group > .list > tanrei-list-item').nth(index).locator('.handle');
/** The file upload's own `move` and `change` events, from now on. */
const listenMoves = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const log: { moves: unknown[]; changes: string[][] } = ((window as unknown as { fup: typeof log }).fup = { moves: [], changes: [] });
    el.addEventListener('move', (event) => log.moves.push((event as CustomEvent).detail));
    el.addEventListener('change', (event) => log.changes.push((event as CustomEvent<{ files: File[] }>).detail.files.map((f) => f.name)));
  });
const moveLog = (page: P) => page.evaluate(() => (window as unknown as { fup: { moves: unknown[]; changes: string[][] } }).fup);
/** Lifts row `index` with the keyboard from its handle, carries it by `steps` presses of Down Arrow and drops it. */
async function carry(page: P, id: string, index: number, steps: number) {
  await handleOf(page, id, index).focus();
  await page.keyboard.press('Space');
  for (let n = 0; n < steps; n++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
}

test.describe('reorderable', () => {
  test('FUP-59: while rows is given, a reorderable file upload makes its List reorderable — a handle on every row named with its file — and a move by the keyboard or the menu emits move once with from and to, and changes nothing', async ({ page }) => {
    await mount(page, [fx('given', { label: 'Files', multiple: true, reorderable: true, ...WORDS, ...MOVE_WORDS }, { items: [file('a', 'one.pdf'), file('b', 'two.pdf'), file('c', 'three.pdf')] })]);
    await expect(host(page, 'given').locator('.group > .list')).toHaveJSProperty('reorderable', true);
    await expect(stage(page, 'given').getByRole('button', { name: 'Reorder two.pdf', exact: true })).toHaveCount(1);
    await listenMoves(page, 'given');
    await carry(page, 'given', 0, 2);
    await expect.poll(async () => (await moveLog(page)).moves).toEqual([{ from: 0, to: 2 }]);
    // The product's rows are the product's to move: the file upload changed nothing.
    expect(await rows(page, 'given').evaluateAll((els) => els.map((el) => (el as HTMLElement & { name: string }).name))).toEqual(['one.pdf', 'two.pdf', 'three.pdf']);
    // The menu of the handle: one move, once.
    await handleOf(page, 'given', 2).click();
    await host(page, 'given').locator('.group > .list > tanrei-list-item').nth(2).locator('tanrei-menu-item').first().click();
    await expect.poll(async () => (await moveLog(page)).moves).toEqual([{ from: 0, to: 2 }, { from: 2, to: 0 }]);
    expect((await moveLog(page)).changes).toEqual([]);
    // The product answers by moving its own file item, and the List draws the new order.
    await host(page, 'given').evaluate((el) => el.prepend(el.querySelectorAll('tanrei-file-item')[2]!));
    await expect.poll(() => host(page, 'given').locator('.group > .list > tanrei-list-item').evaluateAll((els) => els.map((el) => (el as HTMLElement & { label: string }).label))).toEqual(['three.pdf', 'one.pdf', 'two.pdf']);
  });

  test('FUP-59: while rows is own the kept file takes its new place — drawn, submitted and read by files in the new order — and change is emitted once; a refused row cannot be moved among the kept ones; while disabled nothing moves', async ({ page }) => {
    await mount(page, [ownFx('own', { multiple: true, accept: ['.pdf'], constraintsText: 'PDF', typeErrorText: 'PDF only.', reorderable: true, name: 'attachments', ...MOVE_WORDS })]);
    await inForm(page);
    await give(page, 'own', [A, B, C, MOV]);
    await expect.poll(() => drawn(page, 'own')).toEqual(['a.pdf', 'b.pdf', 'c.pdf', 'holiday.mov!PDF only.']);
    await listenMoves(page, 'own');
    await carry(page, 'own', 0, 2);
    await expect.poll(() => keptNames(page, 'own')).toEqual(['b.pdf', 'c.pdf', 'a.pdf']);
    await expect.poll(() => drawn(page, 'own')).toEqual(['b.pdf', 'c.pdf', 'a.pdf', 'holiday.mov!PDF only.']);
    expect(await moveLog(page)).toEqual({ moves: [], changes: [['b.pdf', 'c.pdf', 'a.pdf']] });
    expect(await submitted(page)).toEqual(['attachments=b.pdf:4', 'attachments=c.pdf:4', 'attachments=a.pdf:4', 'note=hello']);
    // A kept file after the refused one, or the refused one among the kept: nothing changes, nothing is emitted.
    await carry(page, 'own', 2, 1);
    await carry(page, 'own', 3, 0);
    await handleOf(page, 'own', 3).focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('Home');
    await page.keyboard.press('Space');
    await page.waitForTimeout(700);
    expect(await keptNames(page, 'own')).toEqual(['b.pdf', 'c.pdf', 'a.pdf']);
    expect(await drawn(page, 'own')).toEqual(['b.pdf', 'c.pdf', 'a.pdf', 'holiday.mov!PDF only.']);
    expect((await moveLog(page)).changes).toHaveLength(1);
    // Disabled: the List is not reorderable, and nothing moves.
    await set(host(page, 'own'), { disabled: true });
    await expect(host(page, 'own').locator('.group > .list')).toHaveJSProperty('reorderable', false);
    expect(await handleOf(page, 'own', 0).count()).toBe(0);
  });
});

test.describe('accessibility', () => {
  // Three fixtures show what a product must not ship, and say so (FIT-20, FPK-18): actions nobody named, and a limit
  // that is enforced and not said. The first two are drawn without names by design; axe sees their unnamed buttons.
  const UNNAMED = ['without-words', 'own-without-words'];

  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { icons: true, theme, fixtures: spec.fixtures.filter((f) => !UNNAMED.includes(f.id)) });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, theme).toEqual([]);
    }
  });

  test('the fixtures without words fail only for the names they lack', async ({ page }) => {
    for (const id of UNNAMED) {
      await mountSpec(page, id);
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations.map((violation) => violation.id), id).toEqual(['button-name']);
    }
  });

  test('every fixture is a named group holding one trigger and, where it has rows, a list of as many items — the product’s own or the ones it made, never both; the keyboard reaches the trigger, each pressable body and each enabled action, and nothing else', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    for (const f of spec.fixtures) {
      await expect(stage(page, f.id).getByRole('group', { name: String(f.props.label), exact: true }), f.id).toHaveCount(1);
      await expect(stage(page, f.id).getByRole('button', { name: String(f.slots!.trigger), exact: true }), f.id).toHaveCount(1);
      // The rows the product gave, or — while rows is own — the rows the file upload made for the files it was handed.
      await expect(stage(page, f.id).getByRole('listitem'), f.id).toHaveCount(f.items?.length ?? 0);
      await expect(f.props.rows === 'own' ? rows(page, f.id) : ownRows(page, f.id), `${f.id}: rows are the product’s or its own, never both`).toHaveCount(0);
      await expect(stage(page, f.id).getByRole('list'), f.id).toHaveCount(f.items?.length ? 1 : 0);
      const stops = await host(page, f.id).evaluate((el) => {
        const found: string[] = [];
        const walk = (root: ParentNode) => {
          for (const node of root.querySelectorAll('*')) {
            if (node.shadowRoot) walk(node.shadowRoot);
            if (node instanceof HTMLElement && node.tabIndex >= 0 && !(node as HTMLButtonElement).disabled && !node.shadowRoot) found.push(node.localName);
          }
        };
        walk(el.shadowRoot!);
        walk(el);
        return found.length;
      });
      // A row's stops are the file item's (FIT-11 to FIT-13): its body where it is pressable, retry while it failed and can be tried again, remove unless it is read-only.
      const ofRow = (item: NonNullable<Fixture['items']>[number]) => (item.props.interactive || item.props.href ? 1 : 0) + (item.props.readOnly ? 0 : 1 + (item.props.status === 'error' && item.props.retryable ? 1 : 0));
      // A reorderable file upload's List adds one stop to every row: its handle (LST-32, FUP-59).
      const handles = f.props.reorderable ? (f.items?.length ?? 0) : 0;
      expect(stops, `${f.id}: the stops`).toBe(f.props.disabled ? 0 : 1 + handles + (f.items ?? []).reduce((sum, item) => sum + ofRow(item), 0));
    }
  });
});

test.describe('fixtures', () => {
  test('every fixture is mounted and visible, with the layout, the texts and the rows the spec gives it — as file items, in the form the file upload gives every row', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    expect(spec.fixtures).toHaveLength(25);
    // FUP-44, FUP-45: while rows is own the kept files come first, then the refused, each in its order.
    const OWN: Record<string, string[]> = { 'own-refused': ['brief.pdf', 'survey.pdf', 'holiday.mov', 'notes.pdf'], 'tiles-own': ['entrance.jpeg', 'floor-plan.png', 'brief.pdf'] };
    for (const f of spec.fixtures) {
      await expect(host(page, f.id), f.id).toBeVisible();
      near((await box(host(page, f.id))).width, 360, `${f.id}: its stage’s column`);
      const area = f.props.layout === 'drop-area';
      expect(await chooser(page, f.id).evaluate((el) => el.classList.contains('area')), f.id).toBe(area);
      await expect(trigger(page, f.id), f.id).toHaveText(String(f.slots!.trigger));
      const drew = f.props.rows === 'own' ? ownRows(page, f.id) : rows(page, f.id);
      await expect(drew, f.id).toHaveCount(f.items?.length ?? 0);
      if (f.props.constraintsText) await expect(own(page, f.id, 'supporting'), f.id).toHaveText(String(f.props.constraintsText));
      if (area && f.props.dropText) await expect(own(page, f.id, 'label'), f.id).toHaveText(String(f.props.dropText));
      const names = OWN[f.id] ?? (f.items ?? []).map((item) => String(item.props.name));
      expect(await drew.evaluateAll((els) => els.map((el) => `${el.localName}:${(el as unknown as { name: string }).name}`)), `${f.id}: file items, in order`).toEqual(names.map((name) => `tanrei-file-item:${name}`));
      const form = f.props.itemForm === 'tile' ? 'tile' : 'row';
      expect(await drew.evaluateAll((els) => els.map((el) => el.shadowRoot!.querySelector('.item')!.getAttribute('data-form'))), `${f.id}: one form for every row`).toEqual(names.map(() => form));
      // A kept or refused file's size is its item's sizeText, written by the stage's size function (FUP-44).
      if (f.props.rows === 'own') for (const item of f.items ?? []) if (item.props.sizeText) await expect(inRow(drew.filter({ hasText: String(item.props.name) }), 'supporting'), `${f.id} ${String(item.props.name)}`).toContainText(String(item.props.sizeText));
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true, reducedMotion: true });
      // Every picture has been drawn, or has failed and left its place to the glyph.
      await page.waitForFunction(() => {
        const all = (root: Document | ShadowRoot): Element[] => [...root.querySelectorAll('*')].flatMap((el) => [el, ...(el.shadowRoot ? all(el.shadowRoot) : [])]);
        return all(document).every((el) => !(el instanceof HTMLImageElement) || el.complete);
      });
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
