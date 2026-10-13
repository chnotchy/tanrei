// <tanrei-file-item>, driven by specs/file-item.spec.json: every behaviour id (FIT-1…33) starts the title of a test,
// every fixture has a baseline, and every length and color is read back from the tokens — never from a number written
// here. The closed table of formats (FIT-5) is read from the sentence itself. The row's tests hold the row the file
// upload draws; the others hold the tile, the format's glyph, the picture and the pressable body. A file is a `File` the page makes: the element reads none of its bytes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, acmeSystemCss, iconFaceArrives, loadSpec, missingWords, mountFixtures, resolveToken, setWords, tab, tabTo, withoutIconFont, rootTokens } from '../../../test/harness.js';

const spec = loadSpec('file-item');
type P = Page;
const TAG = 'tanrei-file-item';
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const WORDS = { removeLabel: 'Remove {name}', retryLabel: 'Retry {name}' };
/** The package's own small picture (112 by 112), as the bytes of a `File`. */
const PNG = fs.readFileSync(path.join(pkg, 'test/fixtures/avatar.png')).toString('base64');
const PICTURE = `data:image/png;base64,${PNG}`;

const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > ${TAG}`);
const PARTS = {
  item: '.item',
  body: '.item > .body',
  lead: '.item > .body > .lead',
  media: '.item > .body > .lead > .media',
  icon: '.item > .body > .lead > .media > .icon',
  preview: '.item > .body > .lead > .media > .preview',
  text: '.item > .body > .text',
  headline: '.item > .body > .text > .headline',
  supporting: '.item > .body > .text > .supporting',
  mark: '.item > .body > .text > .supporting > .mark.status',
  opens: '.item > .body > .open > .mark.new',
  layer: '.item > .body .layer',
  bar: '.item tanrei-progress-indicator',
  over: '.item > .over',
  end: '.item > .end',
  retry: '.item > .end > .action.retry',
  remove: '.item > .end > .action.remove',
} as const;
type Part = keyof typeof PARTS;
const part = (item: Locator, name: Part) => item.locator(PARTS[name]);
const own = (page: P, id: string, name: Part) => part(host(page, id), name);
const T = (name: string) => `--tanrei-comp-file-item-${name}`;
const token = (page: P, name: string) => resolveToken(page, T(name));
const box = async (locator: Locator) => (await locator.boundingBox())!;
/** The box of a part that may not be drawn: null where it is not. */
const boxOrNull = async (locator: Locator) => ((await locator.count()) ? locator.boundingBox() : null);
const css = (locator: Locator, property: string, pseudo?: string) => locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p!), [property, pseudo ?? null] as const);
const near = (actual: number, expected: number, message = '', tolerance = 0.6) => expect(Math.abs(actual - expected), `${message}: ${actual} ≈ ${expected}`).toBeLessThanOrEqual(tolerance);
// A token the root already declares, written alone, is restyled for seconds in WebKit (README, "A single token set on
// the root from script"): FIT-16's forty such writes would take its test to its time limit. `rootTokens()` changes the number of names with the write, which is not compared.
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
function logged(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error') seen.push(message.text());
  });
  return seen;
}
type Extra = Partial<Fixture>;
const fx = (id: string, props: Fixture['props'], extra: Extra = {}): Fixture => ({ id, props: { value: id, ...props }, ...extra });
const mount = (page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) => mountFixtures(page, spec, { icons: true, fixtures, ...options });
const mountSpec = (page: P, ...ids: string[]) => mount(page, ids.length ? spec.fixtures.filter((f) => ids.includes(f.id)) : spec.fixtures);
const frames = (page: P, count = 3) =>
  page.evaluate(async (n) => {
    for (let i = 0; i < n; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  }, count);
/** One turn of the page: what is done in a turn, and what watches the viewport, has been done. */
const turn = (page: P, ms = 20) => page.evaluate((wait) => new Promise((resolve) => setTimeout(resolve, wait)), ms);
/** Sets props on a file item and waits until it has drawn them. */
const set = (item: Locator, props: Record<string, unknown>) => item.evaluate(async (el: HTMLElement & { updateComplete: Promise<unknown> }, p) => (Object.assign(el, p), await el.updateComplete, await el.updateComplete), props);
/** Gives a file item a `File` the page makes: a real small picture unless `bytes` says otherwise. */
const give = (item: Locator, name: string, type: string, bytes: 'picture' | 'garbage' = 'picture') =>
  item.evaluate(
    async (el: HTMLElement & { file: File | null; updateComplete: Promise<unknown> }, [n, t, data]) => {
      const raw = data === null ? new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]) : Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      el.file = new File([raw], n!, { type: t! });
      await el.updateComplete;
    },
    [name, type, bytes === 'picture' ? PNG : null] as const,
  );
const start = (page: P) => page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<button id="start">start</button>'));
const acme = async (page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) => mount(page, fixtures, { systemCss: await acmeSystemCss(), system: 'acme', ...options });

/** A CSS color expression as the browser draws it: [r, g, b, a] with the channels in 0–255. */
const colorOf = (page: P, expression: string) =>
  page.evaluate((e) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;color:${e}`;
    document.body.append(probe);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    context.fillStyle = getComputedStyle(probe).color;
    context.fillRect(0, 0, 1, 1);
    probe.remove();
    return [...context.getImageData(0, 0, 1, 1).data];
  }, expression);
const painted = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate(
    (el, [p, ps]) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      context.fillStyle = getComputedStyle(el, ps ?? undefined).getPropertyValue(p!);
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data];
    },
    [property, pseudo ?? null] as const,
  );
const sameColor = (actual: number[], expected: number[], message = '') => {
  for (let i = 0; i < 4; i++) expect(Math.abs(actual[i] - expected[i]), `${message}: ${actual.join(',')} ≈ ${expected.join(',')}`).toBeLessThanOrEqual(2);
};
const tokenColor = (page: P, name: string) => colorOf(page, `var(${T(name)})`);
const isColor = async (page: P, locator: Locator, property: string, name: string, message = name) => sameColor(await painted(locator, property), await tokenColor(page, name), message);
const role = (page: P, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;font:var(${n}-font);letter-spacing:var(${n}-letter-spacing)`;
    document.body.append(probe);
    const s = getComputedStyle(probe);
    const out = { fontSize: s.fontSize, lineHeight: s.lineHeight, fontWeight: s.fontWeight, letterSpacing: s.letterSpacing, fontFamily: s.fontFamily.replaceAll('"', '') };
    probe.remove();
    return out;
  }, T(name));
const textStyle = (locator: Locator) =>
  locator.evaluate((el) => {
    const s = getComputedStyle(el);
    return { fontSize: s.fontSize, lineHeight: s.lineHeight, fontWeight: s.fontWeight, letterSpacing: s.letterSpacing, fontFamily: s.fontFamily.replaceAll('"', '') };
  });
/** The deepest focused element, as `host[value] tag.class`. */
const focused = (page: P) =>
  page.evaluate(() => {
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    if (!active) return '';
    const within = (active.getRootNode() as ShadowRoot).host;
    return `${within ? `${within.localName}${within.getAttribute('value') ? `[${within.getAttribute('value')}]` : ''} ` : ''}${active.localName}${active.classList.length ? `.${[...active.classList].join('.')}` : ''}`;
  });
/** The name as assistive technology is given it: a row's first line, and the whole of a tile's name — which is drawn cut, or not drawn. */
const nameText = (page: P, id: string) => host(page, id).evaluate((el) => (el.shadowRoot!.querySelector('.headline > .whole') ?? el.shadowRoot!.querySelector('.headline'))?.textContent ?? null);
const mirrored = (glyph: Locator) => glyph.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).a === -1);

// ── What the product hears ───────────────────────────────────────────────────────────────────────────────────────
interface Heard {
  type: string;
  value?: string;
  cancelable?: boolean;
  native?: boolean;
}
/** Records click, remove and retry on the document, from now on: what leaves a file item. */
const listen = (page: P, { cancel = false }: { cancel?: boolean } = {}) =>
  page.evaluate((stop) => {
    const heard: unknown[] = [];
    (window as unknown as { __heard: unknown[] }).__heard = heard;
    for (const type of ['click', 'remove', 'retry']) {
      document.addEventListener(type, (event) => {
        // Only what comes from a file item: the page's own controls click too.
        if (!(event.target instanceof Element) || event.target.localName !== 'tanrei-file-item') return;
        const detail = (event as CustomEvent<{ value: string } | undefined>).detail;
        heard.push({ type, value: detail && typeof detail === 'object' ? detail.value : undefined, ...(type === 'click' ? { cancelable: event.cancelable, native: !(event instanceof CustomEvent) } : {}) });
        if (stop && type === 'click') event.preventDefault();
      });
    }
  }, cancel);
const heard = (page: P) => page.evaluate(() => (window as unknown as { __heard: Heard[] }).__heard);
const forget = (page: P) => page.evaluate(() => void ((window as unknown as { __heard: Heard[] }).__heard.length = 0));

// ── What a file costs (FIT-7, FIT-33) ────────────────────────────────────────────────────────────────────────────
interface Cost {
  created: string[];
  revoked: string[];
  read: string[];
}
/** Counts every object URL made and revoked, and every way a script could read a file, from now on. */
const watchCost = (page: P) =>
  page.evaluate(() => {
    const cost = { created: [] as string[], revoked: [] as string[], read: [] as string[] };
    (window as unknown as { __cost: typeof cost }).__cost = cost;
    const [create, revoke] = [URL.createObjectURL.bind(URL), URL.revokeObjectURL.bind(URL)];
    URL.createObjectURL = (object: Blob | MediaSource) => {
      const made = create(object);
      cost.created.push(made);
      return made;
    };
    URL.revokeObjectURL = (address: string) => {
      cost.revoked.push(address);
      revoke(address);
    };
    const spy = (target: Record<string, unknown>, name: string, label: string) => {
      const original = target[name];
      if (typeof original !== 'function') return;
      target[name] = function (this: unknown, ...args: unknown[]) {
        cost.read.push(label);
        return (original as (...a: unknown[]) => unknown).apply(this, args);
      };
    };
    for (const name of ['arrayBuffer', 'text', 'stream', 'slice', 'bytes']) spy(Blob.prototype as unknown as Record<string, unknown>, name, `Blob.${name}`);
    for (const name of ['readAsArrayBuffer', 'readAsText', 'readAsDataURL', 'readAsBinaryString']) spy(FileReader.prototype as unknown as Record<string, unknown>, name, `FileReader.${name}`);
    spy(window as unknown as Record<string, unknown>, 'createImageBitmap', 'createImageBitmap');
    spy(window as unknown as Record<string, unknown>, 'fetch', 'fetch');
    spy(XMLHttpRequest.prototype as unknown as Record<string, unknown>, 'open', 'XMLHttpRequest.open');
    spy(navigator as unknown as Record<string, unknown>, 'sendBeacon', 'sendBeacon');
  });
const cost = (page: P) => page.evaluate(() => (window as unknown as { __cost: Cost }).__cost);
/** The addresses made and not yet revoked. */
const live = (c: Cost) => c.created.filter((address) => !c.revoked.includes(address));
/** Every request that leaves the page for another place: a `data:` or `blob:` address goes nowhere. */
function requests(page: P) {
  const seen: string[] = [];
  page.on('request', (request) => {
    if (!/^(data|blob|about):/.test(request.url())) seen.push(request.url());
  });
  return seen;
}

// ── FIT-5: the closed table, read from the sentence ──────────────────────────────────────────────────────────────
const KINDS = ['pdf', 'spreadsheet', 'presentation', 'archive', 'code', 'image', 'video', 'audio', 'document', 'other'] as const;
type Kind = (typeof KINDS)[number];
interface Rule {
  kind: Kind;
  types: string[];
  family?: string;
  endings: string[];
}
function formatTable(): { rules: Rule[]; glyphs: Record<Kind, string> } {
  const text = spec.behavior.find((b) => b.id === 'FIT-5')!.text;
  const rules: Rule[] = [];
  for (const kind of KINDS.slice(0, -1)) {
    const found = new RegExp(`(?:: |; )${kind} \\(([^;)]*); ([^)]*)\\)`).exec(text);
    if (!found) throw new Error(`FIT-5 names no list for ${kind}`);
    const types = found[1].split(', ').map((entry) => entry.trim());
    const family = /every media type that begins with (\S+?\/)/.exec(found[1])?.[1];
    rules.push({ kind, family, types: types.filter((entry) => /^[a-z]+\/[\w.+-]+$/.test(entry)), endings: found[2].split(', ').map((entry) => entry.trim()) });
  }
  const names = /through the platform's icon helper: ([\w, ]+?) and (\w+), in the order of the kinds/.exec(text);
  if (!names) throw new Error('FIT-5 names no glyphs');
  const list = [...names[1].split(', ').map((name) => name.trim()), names[2]];
  return { rules, glyphs: Object.fromEntries(KINDS.map((kind, index) => [kind, list[index]])) as Record<Kind, string> };
}
/** The glyph a file item draws for each of many files, in one page: `[mediaType, name]` each. */
const glyphsFor = (page: P, files: (readonly [string, string])[]) =>
  page.evaluate(async (list) => {
    const holder = document.createElement('div');
    document.body.append(holder);
    const items = list.map(([type, name]) => {
      const item = document.createElement('tanrei-file-item') as HTMLElement & { name: string; mediaType: string; readOnly: boolean; updateComplete: Promise<unknown> };
      Object.assign(item, { name, mediaType: type, readOnly: true });
      holder.append(item);
      return item;
    });
    await Promise.all(items.map((item) => item.updateComplete));
    const drawn = items.map((item) => item.shadowRoot!.querySelector('.icon > .ink')!.textContent!);
    holder.remove();
    return drawn;
  }, files);

test.describe('behavior', () => {
  test('FIT-1: one file in the form that form names — a row or a tile — with the same parts from the same props in both: the glyph or the picture, the name, the second line, the bar and the actions; no container, fill or edge around the whole; one file, never a list', async ({ page }) => {
    const props = { name: 'floor-plan.png', formatText: 'PNG', sizeText: '3.4 MB', status: 'uploading', statusText: 'Uploading', progress: 0.4, ...WORDS };
    const failed = { name: 'site-photo.png', sizeText: '6.8 MB', status: 'error', errorText: 'The connection was lost.', retryable: true, ...WORDS };
    await mount(page, [fx('row', props), fx('tile', { form: 'tile', ...props }), fx('row-failed', failed), fx('tile-failed', { form: 'tile', ...failed }), fx('row-picture', { ...props, preview: true, previewSrc: PICTURE }), fx('tile-picture', { form: 'tile', ...props, preview: true, previewSrc: PICTURE })]);
    const read = (id: string) =>
      host(page, id).evaluate((el) => {
        const root = el.shadowRoot!;
        const text = (selector: string) => root.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
        return {
          form: root.querySelector('.item')!.getAttribute('data-form'),
          glyph: text('.icon > .ink'),
          picture: !!root.querySelector('img.preview'),
          name: text('.headline > .whole') ?? text('.headline'),
          second: text('.supporting'),
          mark: text('.mark.status'),
          bar: root.querySelector('tanrei-progress-indicator')?.getAttribute('aria-valuenow') ?? null,
          actions: [...root.querySelectorAll('.end > .action')].map((action) => `${action.classList[1]}:${action.getAttribute('aria-label')}`),
        };
      });
    for (const [row, tile] of [['row', 'tile'], ['row-failed', 'tile-failed'], ['row-picture', 'tile-picture']] as const) {
      const [a, b] = [await read(row), await read(tile)];
      expect(a.form).toBe('row');
      expect(b.form).toBe('tile');
      expect({ ...b, form: 'row' }, `${tile} draws what ${row} draws`).toEqual(a);
    }
    expect(await read('row')).toEqual({ form: 'row', glyph: 'image', picture: false, name: 'floor-plan.png', second: 'PNG · 3.4 MB · Uploading', mark: null, bar: '0.4', actions: ['remove:Remove floor-plan.png'] });
    expect((await read('row-failed')).actions).toEqual(['retry:Retry site-photo.png', 'remove:Remove site-photo.png']);
    expect((await read('row-picture')).picture).toBe(true);
    // A form changes where the parts stand and how large they are.
    expect((await box(own(page, 'tile', 'headline'))).y, 'a tile’s name is beneath its box').toBeGreaterThanOrEqual((await box(own(page, 'tile', 'media'))).y + (await box(own(page, 'tile', 'media'))).height);
    expect((await box(own(page, 'row', 'headline'))).x, 'a row’s name is beside its glyph').toBeGreaterThanOrEqual((await box(own(page, 'row', 'media'))).x + (await box(own(page, 'row', 'media'))).width);
    expect((await box(own(page, 'tile', 'icon'))).width).toBeGreaterThan((await box(own(page, 'row', 'icon'))).width);
    // No container, fill or edge around the whole — and nothing of a list.
    for (const id of ['row', 'tile']) {
      for (const whole of [host(page, id), own(page, id, 'item')]) {
        expect((await painted(whole, 'background-color'))[3], id).toBe(0);
        expect(await css(whole, 'border-top-width')).toBe('0px');
        expect(await css(whole, 'box-shadow')).toBe('none');
        expect(Number.parseFloat(await css(whole, 'padding-top')) + Number.parseFloat(await css(whole, 'padding-left'))).toBe(0);
      }
      expect(await host(page, id).evaluate((el) => [el.getAttribute('role'), el.shadowRoot!.querySelectorAll('[role="list"], ul, ol, [role="listitem"], li').length, el.shadowRoot!.querySelectorAll('.headline').length])).toEqual(['group', 0, 1]);
    }
  });

  test('FIT-2: a row is as wide as its layout gives it and as tall as its parts — the glyph in a box of row.icon.size or, with preview, a square of row.media.height on row.media.shape and the ground media.color; the texts taking the room that is left; the actions; row.container.gap apart, the glyph or the square and the actions centred on the first two lines; a name is drawn whole and never cut; width, height and nameHidden are not read, and nameHidden is reported', async ({ page }) => {
    const warnings = logged(page);
    await mount(page, [...spec.fixtures.filter((f) => ['row', 'row-long-text', 'row-preview', 'row-preview-glyph', 'kind-pdf'].includes(f.id)), fx('underscored', { name: 'municipal_planning_application_supporting_statement_revision_14_final.pdf', ...WORDS }), fx('sized', { name: 'brief.pdf', sizeText: '820 KB', width: 200, height: 200, nameHidden: true, ...WORDS })]);
    const id = 'row';
    const whole = await box(host(page, id));
    near(whole.width, 360, 'as wide as its layout gives it');
    const [gap, iconSize, actionSize] = [await token(page, 'row-container-gap'), await token(page, 'row-icon-size'), await token(page, 'action-size')];
    const [icon, text, remove, name, second] = [await box(own(page, id, 'icon')), await box(own(page, id, 'text')), await box(own(page, id, 'remove')), await box(own(page, id, 'headline')), await box(own(page, id, 'supporting'))];
    near(icon.x, whole.x, 'the glyph at the start');
    near(icon.width, iconSize, 'row.icon.size');
    near(icon.height, iconSize, 'row.icon.size');
    near(text.x - (icon.x + icon.width), gap, 'row.container.gap after the glyph');
    near(remove.x - (text.x + text.width), gap, 'row.container.gap before the actions');
    near(remove.x + remove.width, whole.x + whole.width, 'the actions at the end');
    near(remove.width, actionSize, 'action.size');
    const lines = (name.y + second.y + second.height) / 2;
    near(icon.y + icon.height / 2, lines, 'the glyph centred on the first two lines');
    near(remove.y + remove.height / 2, lines, 'the action centred on the first two lines');
    near(whole.height, second.y + second.height - name.y, 'as tall as its parts');
    expect(await textStyle(own(page, id, 'headline'))).toEqual(await role(page, 'headline-typescale'));
    await isColor(page, own(page, id, 'headline'), 'color', 'headline-color');
    // A long name wraps — inside a word where it must — and is never cut; the glyph and the actions stay beside its first lines.
    const longName = own(page, 'row-long-text', 'headline');
    const [longIcon, longRemove] = [await box(own(page, 'row-long-text', 'icon')), await box(own(page, 'row-long-text', 'remove'))];
    const lineHeight = Number.parseFloat((await textStyle(longName)).lineHeight);
    expect((await box(longName)).height).toBeGreaterThan(lineHeight * 2.5);
    expect(await longName.evaluate((el) => [el.scrollWidth <= el.clientWidth + 1, getComputedStyle(el).textOverflow, getComputedStyle(el).overflow])).toEqual([true, 'clip', 'visible']);
    await expect(longName).toHaveText('municipal-planning-application-supporting-statement-revision-14-final-signed-by-all-parties.pdf');
    expect((await box(own(page, 'underscored', 'headline'))).height, 'a name without a break breaks inside the word').toBeGreaterThan(lineHeight * 1.5);
    expect(await own(page, 'underscored', 'headline').evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    const top = (await box(longName)).y;
    near(longIcon.y + longIcon.height / 2, top + (lineHeight + Number.parseFloat((await role(page, 'supporting-text-typescale')).lineHeight)) / 2, 'the glyph beside the first two lines');
    near(longRemove.y + longRemove.height / 2, longIcon.y + longIcon.height / 2, 'the actions beside the first two lines');
    // A row with one line still holds its actions.
    expect((await box(host(page, 'kind-pdf'))).height).toBeGreaterThanOrEqual(actionSize);
    // With preview: a square in the glyph's place, holding the picture — or the glyph centred, so that a column's names stay aligned.
    const side = await token(page, 'row-media-height');
    for (const fixture of ['row-preview', 'row-preview-glyph']) {
      const [square, itsText, itsHost] = [await box(own(page, fixture, 'media')), await box(own(page, fixture, 'text')), await box(host(page, fixture))];
      near(square.width, side, `${fixture}: row.media.height`);
      near(square.height, side, `${fixture}: a square`);
      near(square.x, itsHost.x, 'at the start');
      near(itsText.x - (square.x + square.width), gap, 'row.container.gap after the square');
      near(square.y + square.height / 2, itsHost.y + (await box(own(page, fixture, 'text'))).height / 2, 'centred on the two lines');
      await isColor(page, own(page, fixture, 'media'), 'background-color', 'media-color');
      near(Number.parseFloat(await css(own(page, fixture, 'media'), 'border-top-left-radius')), await token(page, 'row-media-shape'), 'row.media.shape');
      expect(await css(own(page, fixture, 'media'), 'overflow')).toBe('hidden');
    }
    const [square, glyph] = [await box(own(page, 'row-preview-glyph', 'media')), await box(own(page, 'row-preview-glyph', 'icon'))];
    near(glyph.width, iconSize, 'the glyph keeps row.icon.size in the square');
    near(glyph.x + glyph.width / 2, square.x + square.width / 2, 'the glyph centred in the square');
    near(glyph.y + glyph.height / 2, square.y + square.height / 2, 'the glyph centred in the square');
    near((await box(own(page, 'row-preview', 'text'))).x, (await box(own(page, 'row-preview-glyph', 'text'))).x, 'a column’s names stay aligned');
    // Without preview the glyph has no ground and no square.
    expect((await painted(own(page, id, 'media'), 'background-color'))[3]).toBe(0);
    // width, height and nameHidden are a tile's: a row reads none of them.
    const [sized, plain] = [await box(host(page, 'sized')), whole];
    expect([sized.width, sized.height]).toEqual([plain.width, plain.height]);
    await expect(own(page, 'sized', 'headline')).toBeVisible();
    near((await box(own(page, 'sized', 'headline'))).width, name.width, 'the name is drawn as in any row');
    expect(await host(page, 'sized').evaluate((el) => el.hasAttribute('data-tile'))).toBe(false);
    expect(warnings.filter((text) => text.includes('FIT-2') && text.includes('name-hidden')).length).toBe(1);
  });

  test('FIT-3: a tile draws a box height high and width wide — tile.media.height where there is no height, a square where there is no width — on tile.container.shape and the ground media.color, holding the picture or the glyph centred at tile.icon.size, with the name and the second line beneath it, tile.container.gap from it and as wide as it; it is exactly as wide as the box; the actions inside the box at its top end corner, each on a disc; the box no smaller than its actions need, which is reported; and where its layout gives less room, as wide as that room, keeping its proportion', async ({ page }) => {
    const warnings = logged(page);
    const tile = { form: 'tile', name: 'floor-plan.png', ...WORDS };
    const failed = { status: 'error', errorText: 'Lost.', retryable: true };
    await mount(page, [
      ...spec.fixtures.filter((f) => ['tile', 'tile-preview', 'tile-size-cover', 'tile-error-retryable'].includes(f.id)),
      fx('height-alone', { ...tile, height: 120 }),
      fx('width-alone', { ...tile, width: 160 }),
      fx('small', { ...tile, ...failed, width: 20, height: 10 }),
      fx('narrow', { ...tile, width: 40 }),
      fx('low', { ...tile, height: 12 }),
      fx('squeezed', { ...tile, preview: true, previewSrc: PICTURE, width: 160, height: 90 }),
      fx('squeezed-square', { ...tile, sizeText: '3.4 MB' }),
      fx('bad', { ...tile, width: -4, height: 0 }),
    ]);
    const [high, gap, glyphSize, inset, actionSize, actionGap] = [await token(page, 'tile-media-height'), await token(page, 'tile-container-gap'), await token(page, 'tile-icon-size'), await token(page, 'tile-action-inset'), await token(page, 'action-size'), await token(page, 'action-gap')];
    const sizes = async (id: string) => {
      const [b, h] = [await box(own(page, id, 'media')), await box(host(page, id))];
      near(h.width, b.width, `${id}: the file item is exactly as wide as the box`);
      near(h.x, b.x, `${id}: the box at its start`);
      return [b.width, b.height];
    };
    // The defaults: the token's height, and as wide as it is high.
    for (const [id, width, height] of [['tile', high, high], ['tile-size-cover', 160, 90], ['height-alone', 120, 120], ['width-alone', 160, high], ['bad', high, high]] as const) {
      const [w, h] = await sizes(id);
      near(w, width, `${id}: the width`);
      near(h, height, `${id}: the height`);
    }
    const id = 'tile';
    const [media, icon, text, name, second] = [await box(own(page, id, 'media')), await box(own(page, id, 'icon')), await box(own(page, id, 'text')), await box(own(page, id, 'headline')), await box(own(page, id, 'supporting'))];
    near(Number.parseFloat(await css(own(page, id, 'media'), 'border-top-left-radius')), await token(page, 'tile-container-shape'), 'tile.container.shape');
    await isColor(page, own(page, id, 'media'), 'background-color', 'media-color');
    near(icon.width, glyphSize, 'tile.icon.size');
    near(icon.x + icon.width / 2, media.x + media.width / 2, 'the glyph centred');
    near(icon.y + icon.height / 2, media.y + media.height / 2, 'the glyph centred');
    near(text.y - (media.y + media.height), gap, 'tile.container.gap beneath the box');
    near(text.width, media.width, 'the texts as wide as the box');
    near(name.height, Number.parseFloat((await role(page, 'headline-typescale')).lineHeight), 'the name on one line');
    expect(second.y).toBeGreaterThanOrEqual(name.y + name.height - 0.5);
    near((await box(host(page, id))).height, second.y + second.height - media.y, 'as tall as the box and its texts, and no taller', 1);
    // The picture is clipped to the box's corners.
    expect(await css(own(page, 'tile-preview', 'media'), 'overflow')).toBe('hidden');
    const picture = await box(own(page, 'tile-preview', 'preview'));
    const itsBox = await box(own(page, 'tile-preview', 'media'));
    expect([picture.x, picture.y, picture.width, picture.height]).toEqual([itsBox.x, itsBox.y, itsBox.width, itsBox.height]);
    // The actions inside the box at its top end corner, retry before remove, each on an opaque disc.
    const f = 'tile-error-retryable';
    const [fbox, retry, remove] = [await box(own(page, f, 'media')), await box(own(page, f, 'retry')), await box(own(page, f, 'remove'))];
    near(remove.y - fbox.y, inset, 'tile.action.inset from the top');
    near(fbox.x + fbox.width - (remove.x + remove.width), inset, 'tile.action.inset from the end edge');
    near(remove.x - (retry.x + retry.width), Math.max(actionGap, 2 * Math.max(0, (await resolveToken(page, '--tanrei-sys-target-pointer')) - actionSize)), 'action.gap, or twice what the target exceeds action.size by (FIT-18)');
    near(retry.y, remove.y, 'on one line');
    for (const action of [own(page, f, 'retry'), own(page, f, 'remove')]) {
      await isColor(page, action, 'background-color', 'tile-action-container-color');
      expect((await painted(action, 'background-color'))[3], 'a disc that is read over any picture').toBe(255);
      near((await box(action)).width, actionSize, 'action.size');
    }
    expect(await host(page, f).evaluate((el) => [...el.shadowRoot!.querySelectorAll('.item > *')].map((node) => node.classList[0])), 'the actions come after the body: the order of focus is the order read').toEqual(['body', 'over', 'end']);
    // No narrower than both actions, the space between them and the inset on each side; no lower than one action and the inset above and below.
    const [leastWidth, leastHeight] = [2 * actionSize + Math.max(actionGap, 2 * Math.max(0, (await resolveToken(page, '--tanrei-sys-target-pointer')) - actionSize)) + 2 * inset, actionSize + 2 * inset];
    expect(await sizes('small')).toEqual([leastWidth, leastHeight]);
    near((await sizes('narrow'))[0], leastWidth, 'a width that is less');
    near((await sizes('low'))[1], leastHeight, 'a height that is less');
    const [sbox, sretry, sremove] = [await box(own(page, 'small', 'media')), await box(own(page, 'small', 'retry')), await box(own(page, 'small', 'remove'))];
    expect(sretry.x, 'both actions are inside the least box').toBeGreaterThanOrEqual(sbox.x + inset - 0.5);
    expect(sremove.y + sremove.height).toBeLessThanOrEqual(sbox.y + sbox.height - inset + 0.5);
    const reported = (needle: string) => warnings.filter((text) => text.includes('FIT-3') && text.includes(needle)).length;
    expect(reported('width 20 is less'), 'small: its width').toBe(1);
    expect(reported('height 10 is less'), 'small: its height').toBe(1);
    expect(reported('width 40 is less')).toBe(1);
    expect(reported('height 12 is less')).toBe(1);
    expect(warnings.filter((text) => text.includes('FIT-3')).length, 'a box that is large enough is not reported').toBe(4);
    // Less room than its width: as wide as that room, as high as keeps the proportion, and never wider than its layout.
    for (const [fixture, room, height] of [['squeezed', 120, (120 * 90) / 160], ['squeezed-square', 90, 90]] as const) {
      await stage(page, fixture).evaluate((el: HTMLElement, w) => (el.style.cssText += `;box-sizing:content-box;inline-size:${w}px;`), room);
      const [w, h] = await sizes(fixture);
      near(w, room, `${fixture}: as wide as the room`);
      near(h, height, `${fixture}: keeping its proportion`);
      const layout = await stage(page, fixture).evaluate((el) => el.scrollWidth <= el.clientWidth);
      expect(layout, `${fixture}: never wider than its layout`).toBe(true);
      near((await box(own(page, fixture, 'text'))).width, room, 'its texts follow');
    }
    // Room again: its own width again.
    await stage(page, 'squeezed').evaluate((el: HTMLElement) => (el.style.inlineSize = '400px'));
    expect(await sizes('squeezed')).toEqual([160, 90]);
    // A width with no height takes the token's height when the token changes, too.
    await override(page, { [T('tile-media-height')]: '80px' });
    await set(host(page, 'width-alone'), { width: 200 });
    expect(await sizes('width-alone')).toEqual([200, 80]);
  });

  test('FIT-4: below the name one line that wraps and is never cut — formatText, sizeText and statusText in that order with a middle dot between two that are drawn, or errorText in the status’s place in the error role; before the words of a done or failed file a mark of status.icon.size in the status’s color, kept from assistive technology; with nothing to hold there is no line; a done or failed file without words still renders with the mark alone and is reported; the line is drawn in every form, whatever nameHidden says', async ({ page }) => {
    const warnings = logged(page);
    await mount(page, [
      ...spec.fixtures.filter((f) => ['row-format', 'row-done', 'row-error-retryable', 'row-long-text', 'row-without-words', 'kind-pdf', 'tile-done', 'tile-error-retryable'].includes(f.id)),
      fx('size', { name: 'size.pdf', sizeText: '1 MB', ...WORDS }),
      fx('status', { name: 'status.pdf', statusText: 'Waiting', ...WORDS }),
      fx('format', { name: 'format.pdf', formatText: 'PDF', ...WORDS }),
      fx('failed', { name: 'failed.pdf', status: 'error', formatText: 'PDF', sizeText: '1 MB', statusText: 'Never drawn', errorText: 'Lost.', ...WORDS }),
      fx('done-bare', { name: 'done.pdf', status: 'done', ...WORDS }),
      fx('pending-error', { name: 'kept.pdf', status: 'pending', statusText: 'Waiting', errorText: 'Not drawn while it has not failed', ...WORDS }),
    ]);
    const second = (id: string) => own(page, id, 'supporting');
    await expect(second('row-format')).toHaveText(/^\s*PDF\s+·\s+820 KB\s+·\s+Waiting\s*$/);
    expect(await textStyle(second('row-format'))).toEqual(await role(page, 'supporting-text-typescale'));
    await isColor(page, second('row-format'), 'color', 'supporting-text-color');
    const [name, line] = [await box(own(page, 'row-format', 'headline')), await box(second('row-format'))];
    near(line.y, name.y + name.height, 'below the name');
    await expect(second('row-error-retryable')).toHaveText(/^\s*6\.8 MB\s+·\s+error\s*The connection was lost\.\s*$/);
    await isColor(page, second('row-error-retryable'), 'color', 'error-supporting-text-color');
    // The dot stands between two texts only, and is not read.
    await expect(second('size')).toHaveText(/^\s*1 MB\s*$/);
    await expect(second('status')).toHaveText(/^\s*Waiting\s*$/);
    await expect(second('format')).toHaveText(/^\s*PDF\s*$/);
    await expect(second('failed')).toHaveText(/^\s*PDF\s+·\s+1 MB\s+·\s+error\s*Lost\.\s*$/);
    await expect(second('pending-error')).toHaveText(/^\s*Waiting\s*$/);
    expect(await second('row-format').locator('[aria-hidden="true"]').allTextContents()).toEqual(['·', '·']);
    // The mark: before the words, in the status's color, a glyph of the icon set, kept from assistive technology.
    const [size, markGap] = [await token(page, 'status-icon-size'), await token(page, 'status-icon-gap')];
    for (const [id, glyph, color] of [['row-done', 'check_circle', 'done-icon-color'], ['row-error-retryable', 'error', 'error-icon-color'], ['tile-done', 'check_circle', 'done-icon-color'], ['tile-error-retryable', 'error', 'error-icon-color']] as const) {
      const mark = own(page, id, 'mark');
      await expect(mark, id).toHaveText(glyph);
      await isColor(page, mark, 'color', color);
      expect(await mark.getAttribute('aria-hidden')).toBe('true');
      await expect.poll(() => mark.getAttribute('data-drawn'), { message: `${id}: ${glyph} is drawn by the icon set` }).not.toBeNull();
      const [m, words] = [await box(mark), await box(second(id).locator('.said').last())];
      // Where the words begin: the first of their lines (an error wraps beneath a tile).
      const begin = await second(id).locator('.said').last().evaluate((el) => el.getClientRects()[0].left);
      near(m.width, size, 'status.icon.size');
      near(m.height, size, 'status.icon.size');
      near(begin - (m.x + m.width), markGap, 'status.icon.gap before the words');
      // It stands on the words' first line and makes it no taller.
      const lineHeight = Number.parseFloat((await textStyle(second(id))).lineHeight);
      near(m.y + m.height / 2, (await box(second(id))).y + lineHeight / 2, 'on the words’ first line', 1);
      expect(Math.abs(words.y + words.height / 2 - (m.y + m.height / 2)) < lineHeight / 2 || words.height > lineHeight, 'beside the words').toBe(true);
    }
    near((await box(second('row-done'))).height, Number.parseFloat((await textStyle(second('row-done'))).lineHeight), 'the mark makes the line no taller');
    await expect(own(page, 'row-format', 'mark'), 'no mark while pending').toHaveCount(0);
    // Nothing to hold: no line and no room for one.
    await expect(second('kind-pdf')).toHaveCount(0);
    near((await box(own(page, 'kind-pdf', 'text'))).height, (await box(own(page, 'kind-pdf', 'headline'))).height, 'no room for a line that is not drawn');
    // It wraps and is never cut.
    const long = second('row-long-text');
    expect((await box(long)).height).toBeGreaterThan(Number.parseFloat((await textStyle(long)).lineHeight) * 1.5);
    expect(await long.evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && getComputedStyle(el).textOverflow !== 'ellipsis' && getComputedStyle(el).overflow === 'visible')).toBe(true);
    // A status told by the mark alone is reported, and the file item is still drawn, with the mark alone on the line.
    for (const [id, glyph] of [['row-without-words', 'error'], ['done-bare', 'check_circle']] as const) {
      await expect(host(page, id)).toBeVisible();
      await expect(second(id)).toHaveText(glyph);
      await expect(second(id).locator('.said')).toHaveCount(0);
    }
    expect(warnings.filter((text) => text.includes('FIT-4') && text.includes('error-text')).length).toBe(1);
    expect(warnings.filter((text) => text.includes('FIT-4') && text.includes('status-text')).length).toBe(1);
    // In every form, and whatever nameHidden says: what went wrong is never hidden.
    const hidden = 'tile-error-retryable';
    await expect(own(page, hidden, 'preview')).toHaveAttribute('data-drawn', '');
    expect((await box(own(page, hidden, 'headline'))).width, 'the name is not drawn').toBeLessThanOrEqual(1);
    await expect(second(hidden)).toBeVisible();
    await expect(second(hidden)).toContainText('The connection was lost.');
    expect(await second(hidden).evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && getComputedStyle(el).overflow === 'visible')).toBe(true);
    // A status changes the line at once, and never the glyph before the name (FIT-5).
    await set(host(page, 'size'), { status: 'done', statusText: 'Uploaded' });
    await expect(second('size')).toHaveText(/^\s*1 MB\s+·\s+check_circle\s*Uploaded\s*$/);
    await expect(own(page, 'size', 'icon')).toHaveText('picture_as_pdf');
  });

  test('FIT-5: the glyph is chosen from the file’s format, in ten kinds — by mediaType, read without case, parameter or white space, and where that is empty, says nothing or is on no list by the end of name — each kind by the closed lists of the sentence, in its order; glyph names another and the icon slot holds one in the place of both; every glyph is drawn by the icon set in icon.color, whatever the format and the status, and kept from assistive technology', async ({ page }) => {
    const { rules, glyphs } = formatTable();
    expect(glyphs).toEqual({ pdf: 'picture_as_pdf', spreadsheet: 'table', presentation: 'slideshow', archive: 'folder_zip', code: 'code', image: 'image', video: 'movie', audio: 'music_note', document: 'description', other: 'draft' });
    expect(rules.map((rule) => rule.kind)).toEqual(KINDS.slice(0, -1));
    // The table is the sentence's: nothing here is a list of its own.
    expect(rules.reduce((sum, rule) => sum + rule.types.length, 0), 'the media types the sentence lists').toBe(69);
    expect(rules.reduce((sum, rule) => sum + rule.endings.length, 0), 'the endings the sentence lists').toBe(78);
    expect(rules.filter((rule) => rule.family).map((rule) => `${rule.kind}:${rule.family}`)).toEqual(['image:image/', 'video:video/', 'audio:audio/', 'document:text/']);
    await mountSpec(page, ...KINDS.map((kind) => `kind-${kind}`), 'row-media-type', 'row-glyph', 'row-icon-slot', 'row-done', 'row-error', 'row-link-new');
    // The ten fixtures draw the ten glyphs, each in icon.color, in a box of row.icon.size, drawn by the icon set and kept from assistive technology.
    for (const kind of KINDS) {
      const glyph = own(page, `kind-${kind}`, 'icon');
      await expect(glyph, kind).toHaveText(glyphs[kind]);
      await isColor(page, glyph, 'color', 'icon-color', `${kind}: a format has no color of its own`);
      await expect.poll(() => glyph.getAttribute('data-drawn'), { message: `${glyphs[kind]} is drawn by the icon set` }).not.toBeNull();
      expect(await glyph.locator('.ink').evaluate((el: HTMLElement) => el.offsetWidth), `${glyphs[kind]} is one glyph`).toBeLessThanOrEqual((await box(glyph)).width * 1.5);
      expect(await own(page, `kind-${kind}`, 'media').getAttribute('aria-hidden')).toBe('true');
    }
    // The other five glyphs the file item draws are names of the set too.
    for (const [glyph, name] of [
      [own(page, 'row-done', 'mark'), 'check_circle'],
      [own(page, 'row-error', 'mark'), 'error'],
      [own(page, 'row-done', 'remove').locator('.glyph'), 'close'],
      [own(page, 'row-link-new', 'opens'), 'open_in_new'],
    ] as const) {
      await expect(glyph).toHaveText(name);
      await expect.poll(() => glyph.getAttribute('data-drawn'), { message: name }).not.toBeNull();
    }
    await set(host(page, 'row-error'), { retryable: true });
    await expect(own(page, 'row-error', 'retry').locator('.glyph')).toHaveText('refresh');
    await expect.poll(() => own(page, 'row-error', 'retry').locator('.glyph').getAttribute('data-drawn'), { message: 'refresh' }).not.toBeNull();
    // Every media type the sentence lists, on a file named `export`; and one of each family.
    const byType: [string, string, Kind][] = rules.flatMap((rule) => rule.types.map((type) => [type, 'export', rule.kind] as [string, string, Kind]));
    const families: [string, string, Kind][] = [['image/heic', 'export', 'image'], ['image/x-of-tomorrow', 'export', 'image'], ['video/quicktime', 'export', 'video'], ['audio/mpeg', 'export', 'audio'], ['text/plain', 'export', 'document'], ['text/markdown', 'export', 'document'], ['text/x-of-tomorrow', 'export', 'document']];
    // Every ending the sentence lists, with no media type — in lower and in upper case.
    const byEnding: [string, string, Kind][] = rules.flatMap((rule) => rule.endings.flatMap((ending) => [['', `file.${ending}`, rule.kind], ['', `FILE.${ending.toUpperCase()}`, rule.kind]] as [string, string, Kind][]));
    // The sentence's `verify`, line by line.
    const verify: [string, string, Kind][] = [
      ['', 'IMG_0412.HEIC', 'image'],
      ['', 'archive.tar.gz', 'archive'],
      ['', 'README', 'other'],
      ['', '.gitignore', 'other'],
      ['', 'notes.txt', 'document'],
      ['application/pdf', 'export', 'pdf'],
      ['text/csv', 'export', 'spreadsheet'],
      ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'export', 'spreadsheet'],
      ['application/vnd.ms-powerpoint', 'export', 'presentation'],
      ['application/gzip', 'export', 'archive'],
      ['application/x-tar', 'export', 'archive'],
      ['text/html', 'export', 'code'],
      ['application/json', 'export', 'code'],
      ['application/x-sh', 'export', 'code'],
      ['image/heic', 'export', 'image'],
      ['video/quicktime', 'export', 'video'],
      ['audio/mpeg', 'export', 'audio'],
      ['text/plain', 'export', 'document'],
      ['text/markdown', 'export', 'document'],
      ['application/rtf', 'export', 'document'],
      ['application/x-unknown', 'export', 'other'],
      // The media type wins over the ending.
      ['application/pdf', 'notes.txt', 'pdf'],
      // A media type on no list leaves the ending to decide.
      ['application/x-unknown', 'budget.xlsx', 'spreadsheet'],
      ['application/octet-stream', 'budget.xlsx', 'spreadsheet'],
      ['', 'budget.xlsx', 'spreadsheet'],
      // Case, a parameter and white space are not read.
      [' Text/CSV; charset=utf-8 ', 'export', 'spreadsheet'],
      // video/mp2t is guessed from the ending .ts, which TypeScript shares: it chooses nothing, and the ending decides.
      ['video/mp2t', 'index.ts', 'code'],
      ['', 'index.ts', 'code'],
      ['video/mp2t', 'clip.mp4', 'video'],
      ['video/mp2t', 'stream', 'other'],
    ];
    // What the lists leave out: a media type on no list chooses nothing, an ending on no list is other, and the ending is what follows the LAST dot.
    const beyond: [string, string, Kind][] = [
      ['application/octet-stream', 'export', 'other'],
      ['application/x-unknown', 'notes.txt', 'document'],
      ['application/vnd.of-tomorrow', 'export.sheet', 'other'],
      ['', 'file.unknown', 'other'],
      ['', 'file.', 'other'],
      ['', 'pdf', 'other'],
      ['', 'photo.png.zip', 'archive'],
      ['', 'archive.zip.png', 'image'],
      ['APPLICATION/PDF', 'export', 'pdf'],
      ['\tapplication/json ;charset=utf-8', 'export', 'code'],
      ['image/svg+xml', 'export', 'image'],
      // The order: the specific kinds stand before the families.
      ['text/csv', 'notes.txt', 'spreadsheet'],
      ['text/tab-separated-values', 'export', 'spreadsheet'],
      ['text/html', 'notes.txt', 'code'],
      ['text/css', 'export', 'code'],
      ['text/x-python', 'export', 'code'],
      ['text/markdown', 'page.html', 'document'],
    ];
    const cases = [...byType, ...families, ...byEnding, ...verify, ...beyond];
    const drawn = await glyphsFor(page, cases.map(([type, name]) => [type, name] as const));
    const wrong = cases.map(([type, name, kind], index) => (drawn[index] === glyphs[kind] ? '' : `${JSON.stringify(type)} ${name}: ${drawn[index]}, not ${glyphs[kind]} (${kind})`)).filter(Boolean);
    expect(wrong, 'every media type and every ending of the sentence').toEqual([]);
    expect(cases.length).toBeGreaterThan(69 + 2 * 78);
    // By the media type of a fixture: `export` with text/csv.
    await expect(own(page, 'row-media-type', 'icon')).toHaveText('table');
    // glyph names another glyph of the set, in the format's place; the icon slot holds one in the place of both.
    await expect(own(page, 'row-glyph', 'icon')).toHaveText('key');
    await isColor(page, own(page, 'row-glyph', 'icon'), 'color', 'icon-color');
    await expect.poll(() => own(page, 'row-glyph', 'icon').getAttribute('data-drawn')).not.toBeNull();
    const slotted = host(page, 'row-icon-slot').locator(':scope > [slot="icon"]');
    await expect(slotted).toHaveText('deployed_code');
    await expect(own(page, 'row-icon-slot', 'icon').locator('.ink'), 'the format’s glyph is not drawn beside the slot’s').toHaveCount(0);
    const [given, itsBox] = [await box(slotted), await box(own(page, 'row-icon-slot', 'icon'))];
    near(given.x + given.width / 2, itsBox.x + itsBox.width / 2, 'the slot’s glyph in the glyph’s box');
    near(itsBox.width, await token(page, 'row-icon-size'), 'row.icon.size');
    sameColor(await painted(slotted, 'color'), await tokenColor(page, 'icon-color'), 'the slot’s glyph in icon.color');
    await set(host(page, 'row-icon-slot'), { glyph: 'key' });
    await expect(own(page, 'row-icon-slot', 'icon').locator('.ink'), 'the slot wins over glyph').toHaveCount(0);
    await slotted.evaluate((el) => el.remove());
    await expect(own(page, 'row-icon-slot', 'icon')).toHaveText('key');
    await set(host(page, 'row-icon-slot'), { glyph: '' });
    await expect(own(page, 'row-icon-slot', 'icon'), 'the format chooses again: a name with an ending on no list').toHaveText('draft');
    // The status never changes the glyph.
    for (const status of ['uploading', 'done', 'error', 'pending']) {
      await set(host(page, 'kind-pdf'), { status, statusText: 'Said', errorText: 'Said' });
      await expect(own(page, 'kind-pdf', 'icon'), status).toHaveText('picture_as_pdf');
      await isColor(page, own(page, 'kind-pdf', 'icon'), 'color', 'icon-color', status);
    }
    // A change of the name or of the media type is a change of the glyph, at once.
    await set(host(page, 'kind-pdf'), { name: 'brief.zip' });
    await expect(own(page, 'kind-pdf', 'icon')).toHaveText('folder_zip');
    await set(host(page, 'kind-pdf'), { mediaType: 'audio/ogg' });
    await expect(own(page, 'kind-pdf', 'icon')).toHaveText('music_note');
  });

  test('FIT-5: in right-to-left, of the fifteen glyphs the file item draws only draft and open_in_new are mirrored — by the icon set’s own list', async ({ page }) => {
    const { glyphs } = formatTable();
    const set_ = JSON.parse(fs.readFileSync(path.resolve(pkg, '../../tokens/icon-sets/material-symbols.icon-set.json'), 'utf8')) as { mirrored: string[] };
    const all = [...Object.values(glyphs), 'check_circle', 'error', 'close', 'refresh', 'open_in_new'];
    expect(all.filter((name) => set_.mirrored.includes(name)).sort(), 'what the icon set marks').toEqual(['draft', 'open_in_new']);
    const names: Record<Kind, string> = { pdf: 'a.pdf', spreadsheet: 'a.csv', presentation: 'a.key', archive: 'a.zip', code: 'a.ts', image: 'a.png', video: 'a.mov', audio: 'a.mp3', document: 'a.txt', other: 'a' };
    await mount(page, [
      ...KINDS.map((kind) => fx(`rtl-${kind}`, { name: names[kind], ...WORDS }, { direction: 'rtl' })),
      fx('rtl-marks', { name: 'a.pdf', status: 'error', errorText: 'Lost.', retryable: true, href: '/files/a.pdf', target: 'new', targetLabel: 'opens in a new tab', ...WORDS }, { direction: 'rtl' }),
      fx('rtl-done', { name: 'a.pdf', status: 'done', statusText: 'Uploaded', ...WORDS }, { direction: 'rtl' }),
      fx('ltr-other', { name: 'a', href: '/files/a', target: 'new', targetLabel: 'opens in a new tab', ...WORDS }),
    ]);
    const seen: [string, boolean][] = [];
    for (const kind of KINDS) {
      const glyph = own(page, `rtl-${kind}`, 'icon');
      await expect(glyph).toHaveText(glyphs[kind]);
      await expect.poll(() => glyph.getAttribute('data-drawn')).not.toBeNull();
      seen.push([glyphs[kind], await mirrored(glyph)]);
    }
    for (const [glyph, name] of [
      [own(page, 'rtl-done', 'mark'), 'check_circle'],
      [own(page, 'rtl-marks', 'mark'), 'error'],
      [own(page, 'rtl-marks', 'remove').locator('.glyph'), 'close'],
      [own(page, 'rtl-marks', 'retry').locator('.glyph'), 'refresh'],
      [own(page, 'rtl-marks', 'opens'), 'open_in_new'],
    ] as const) {
      await expect(glyph).toHaveText(name);
      seen.push([name, await mirrored(glyph)]);
    }
    expect(seen.filter(([, flipped]) => flipped).map(([name]) => name).sort(), 'mirrored in right-to-left').toEqual(['draft', 'open_in_new']);
    expect(seen.map(([name]) => name)).toEqual(all);
    // Left to right, nothing is mirrored.
    expect(await mirrored(own(page, 'ltr-other', 'icon'))).toBe(false);
    expect(await mirrored(own(page, 'ltr-other', 'opens'))).toBe(false);
  });

  test('FIT-6: with preview the picture stands in the glyph’s place — the one at previewSrc whatever the format, else a picture of the file itself for an image — filling the box as fit names, never stretched and never larger than the box, and kept from assistive technology; until it can be drawn, and if it cannot, the glyph of the format stands there with no sign of loading or of the failure, no event and no change of status, and a previewSrc that could not be drawn is reported once; it is drawn at once and changes the size of nothing', async ({ page }) => {
    const warnings = logged(page);
    const seen = requests(page);
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route('http://pictures.tanrei.test/**', async (route) => {
      if (route.request().url().endsWith('slow.png')) await held;
      await route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from(PNG, 'base64') });
    });
    const tile = { form: 'tile', ...WORDS };
    await mount(page, [
      ...spec.fixtures.filter((f) => ['row-preview', 'row-preview-glyph', 'tile-preview', 'tile-preview-pending', 'tile-size-cover', 'tile-size-contain', 'row'].includes(f.id)),
      fx('slow', { ...tile, name: 'slow.png', preview: true }),
      fx('broken', { ...tile, name: 'broken.png', status: 'uploading', statusText: 'Uploading', preview: true, previewSrc: 'data:image/png;base64,AAAA' }),
      fx('any-format', { name: 'report.pdf', preview: true, previewSrc: PICTURE, ...WORDS }),
      fx('off', { ...tile, name: 'photo.png', previewSrc: PICTURE }),
      fx('from-file', { ...tile, name: 'photo.png', preview: true }),
      fx('from-file-row', { name: '', preview: true, ...WORDS }),
      fx('not-a-picture', { ...tile, name: 'liar.png', preview: true }),
      fx('a-document', { ...tile, name: 'report.pdf', preview: true }),
      fx('a-video', { ...tile, name: 'walk.mp4', preview: true }),
    ]);
    // An address that has not answered yet, given once the page has loaded (a page waits for its pictures).
    await set(host(page, 'slow'), { previewSrc: 'http://pictures.tanrei.test/slow.png' });
    const drawn = (id: string) => own(page, id, 'preview').getAttribute('data-drawn');
    const glyphShown = async (id: string) => (await css(own(page, id, 'icon'), 'visibility')) === 'visible';
    // The picture at previewSrc, in the glyph's place: in a row's square and in a tile's box.
    for (const id of ['row-preview', 'tile-preview', 'any-format']) {
      await expect.poll(() => drawn(id), { message: id }).toBe('');
      const [picture, media] = [await box(own(page, id, 'preview')), await box(own(page, id, 'media'))];
      expect([picture.x, picture.y, picture.width, picture.height], `${id}: the picture fills its box and is no larger`).toEqual([media.x, media.y, media.width, media.height]);
      expect(await glyphShown(id), `${id}: the glyph gives way`).toBe(false);
      expect(await own(page, id, 'preview').evaluate((el: HTMLImageElement) => [el.alt, el.getAttribute('alt'), el.decoding, el.draggable, el.closest('[aria-hidden="true"]') !== null, el.naturalWidth > 0])).toEqual(['', '', 'async', false, true, true]);
      expect(await css(own(page, id, 'preview'), 'object-fit')).toBe('cover');
      expect(await css(own(page, id, 'preview'), 'object-position')).toBe('50% 50%');
    }
    await expect(own(page, 'any-format', 'icon'), 'whatever the file’s format').toHaveText('picture_as_pdf');
    await expect(stage(page, 'tile-preview').getByRole('img')).toHaveCount(0);
    // fit: cover fills the box and is cut at its edges; contain stands whole inside it, on the box's ground. Never stretched.
    expect(await css(own(page, 'tile-size-cover', 'preview'), 'object-fit')).toBe('cover');
    expect(await css(own(page, 'tile-size-contain', 'preview'), 'object-fit')).toBe('contain');
    await expect.poll(() => drawn('tile-size-contain')).toBe('');
    const shown = (id: string) =>
      own(page, id, 'preview').evaluate((el: HTMLImageElement) => {
        const [w, h, fit] = [el.clientWidth, el.clientHeight, getComputedStyle(el).objectFit];
        const scale = fit === 'contain' ? Math.min(w / el.naturalWidth, h / el.naturalHeight) : Math.max(w / el.naturalWidth, h / el.naturalHeight);
        return { box: [w, h], drawn: [el.naturalWidth * scale, el.naturalHeight * scale], natural: [el.naturalWidth, el.naturalHeight] };
      });
    const [cover, contain] = [await shown('tile-size-cover'), await shown('tile-size-contain')];
    expect(cover.box).toEqual([160, 90]);
    expect(cover.natural[0], 'a square picture in a box that is not').toBe(cover.natural[1]);
    expect(cover.drawn, 'cover: scaled to fill the box, cut above and below').toEqual([160, 160]);
    expect(contain.drawn, 'contain: whole inside the box').toEqual([90, 90]);
    await isColor(page, own(page, 'tile-size-contain', 'media'), 'background-color', 'media-color', 'on the box’s ground');
    // A fit it does not know is cover (FIT-29).
    await set(host(page, 'tile-size-contain'), { fit: 'cover' });
    expect(await css(own(page, 'tile-size-contain', 'preview'), 'object-fit')).toBe('cover');
    // Until it can be drawn: the glyph, no sign of loading — and then the picture, at once, moving nothing.
    await expect(own(page, 'slow', 'preview')).toHaveCount(1);
    expect(await drawn('slow')).toBeNull();
    expect(await css(own(page, 'slow', 'preview'), 'visibility')).toBe('hidden');
    expect(await glyphShown('slow')).toBe(true);
    await expect(own(page, 'slow', 'icon')).toHaveText('image');
    expect(await host(page, 'slow').evaluate((el) => [el.shadowRoot!.querySelectorAll('tanrei-progress-indicator, [role="progressbar"], [aria-busy]').length, el.shadowRoot!.getAnimations({ subtree: true }).length]), 'no sign of loading').toEqual([0, 0]);
    const before = [await box(host(page, 'slow')), await box(own(page, 'slow', 'media')), await box(own(page, 'slow', 'headline'))];
    await listen(page);
    await page.evaluate(() => {
      const w = window as unknown as { __other: string[] };
      w.__other = [];
      for (const type of ['load', 'error', 'change', 'input', 'select']) document.addEventListener(type, (event) => w.__other.push(`${type}:${(event.target as Element).localName ?? ''}`));
    });
    release();
    await expect.poll(() => drawn('slow')).toBe('');
    expect(await glyphShown('slow')).toBe(false);
    expect(await host(page, 'slow').evaluate((el) => el.shadowRoot!.getAnimations({ subtree: true }).length), 'without a motion').toBe(0);
    expect(Number.parseFloat(await css(own(page, 'slow', 'preview'), 'transition-duration'))).toBe(0);
    expect([await box(host(page, 'slow')), await box(own(page, 'slow', 'media')), await box(own(page, 'slow', 'headline'))], 'the size of nothing changes').toEqual(before);
    // It cannot be drawn: the glyph, no sign of the failure, no event, the status as it was — and one report for the address.
    await expect(own(page, 'broken', 'preview')).toHaveCount(0);
    expect(await glyphShown('broken')).toBe(true);
    await expect(own(page, 'broken', 'icon')).toHaveText('image');
    expect(await host(page, 'broken').evaluate((el: HTMLElement & { status: string }) => [el.status, el.getAttribute('status'), el.shadowRoot!.querySelector('.item')!.getAttribute('data-status'), el.shadowRoot!.querySelectorAll('.mark.status').length])).toEqual(['uploading', 'uploading', 'uploading', 0]);
    near((await box(own(page, 'broken', 'media'))).width, (await box(own(page, 'tile-preview', 'media'))).width, 'the box keeps its size');
    expect(warnings.filter((text) => text.includes('FIT-6')).length, 'one report for a previewSrc that could not be drawn').toBe(1);
    expect(warnings.find((text) => text.includes('FIT-6'))).toContain('preview-src');
    // Another address is another picture: it is tried again, and drawn.
    await set(host(page, 'broken'), { previewSrc: PICTURE });
    await expect.poll(() => drawn('broken')).toBe('');
    // The picture of the file itself, for an image: in a tile, and in a row whose name and kind are the file's own.
    await give(host(page, 'from-file'), 'photo.png', 'image/png');
    await give(host(page, 'from-file-row'), 'holiday.png', 'image/png');
    for (const id of ['from-file', 'from-file-row']) {
      // A picture of a file is made once the file item is in or near what is in view (FIT-7).
      await host(page, id).scrollIntoViewIfNeeded();
      await expect.poll(() => drawn(id), { message: id }).toBe('');
      expect(await own(page, id, 'preview').evaluate((el: HTMLImageElement) => [el.src.startsWith('blob:'), el.naturalWidth, el.alt])).toEqual([true, 112, '']);
      expect(await glyphShown(id)).toBe(false);
    }
    // A file that is not a picture after all: the glyph, with no report (no address was the product's) and no event.
    await host(page, 'not-a-picture').scrollIntoViewIfNeeded();
    await host(page, 'not-a-picture').evaluate((el) => el.shadowRoot!.addEventListener('error', () => ((window as unknown as { __refused: boolean }).__refused = true), true));
    await give(host(page, 'not-a-picture'), 'liar.png', 'image/png', 'garbage');
    await expect.poll(() => page.evaluate(() => (window as unknown as { __refused?: boolean }).__refused === true), { message: 'the browser was given the file to draw, and could not' }).toBe(true);
    await expect.poll(async () => (await own(page, 'not-a-picture', 'preview').count()) === 0 && (await glyphShown('not-a-picture'))).toBe(true);
    await expect(own(page, 'not-a-picture', 'icon')).toHaveText('image');
    // A file that is not an image, and a video: the glyph — nothing is opened to draw a picture of it.
    await give(host(page, 'a-document'), 'report.pdf', 'application/pdf');
    await give(host(page, 'a-video'), 'walk.mp4', 'video/mp4');
    await turn(page, 100);
    for (const [id, glyph] of [['a-document', 'picture_as_pdf'], ['a-video', 'movie'], ['row-preview-glyph', 'picture_as_pdf'], ['tile-preview-pending', 'image']] as const) {
      await expect(own(page, id, 'preview'), id).toHaveCount(0);
      await expect(own(page, id, 'icon')).toHaveText(glyph);
      expect(await glyphShown(id), id).toBe(true);
    }
    // preview false: the glyph, also for an image with an address.
    await expect(own(page, 'off', 'preview')).toHaveCount(0);
    await expect(own(page, 'row', 'preview')).toHaveCount(0);
    expect(await glyphShown('off')).toBe(true);
    // Nothing was emitted for any of it, nothing reported but the one address, and the only requests were the browser's own for previewSrc.
    await turn(page, 50);
    expect(await heard(page)).toEqual([]);
    expect(await page.evaluate(() => (window as unknown as { __other: string[] }).__other), 'a picture’s load and error never leave the element').toEqual([]);
    expect(warnings.filter((text) => text.includes('FIT-6')).length).toBe(1);
    expect(warnings.filter((text) => text.includes('FIT-29'))).toEqual([]);
    expect(seen).toEqual(['http://pictures.tanrei.test/slow.png']);
  });

  test('FIT-7: it reads no file — with preview absent, or with previewSrc, a file costs no address; with preview and an image file exactly one object URL is made, only once the file item is in or near what is in view, given to its own picture alone, and revoked when the file item is taken out of the page, given another file or none, and when preview becomes false, previewSrc is given or the kind is no longer image; after two hundred are added and removed none is left; no reader, arrayBuffer, text, stream, slice or createImageBitmap is called and no request leaves', async ({ page }) => {
    const seen = requests(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    const tile = { form: 'tile', ...WORDS };
    await mount(page, [fx('plain', { name: 'photo.png', ...WORDS }), fx('with-src', { ...tile, name: 'photo.png', preview: true, previewSrc: PICTURE }), fx('one', { ...tile, name: 'photo.png', preview: true }), fx('far', { ...tile, name: 'far.png', preview: true })], {
      lead: '<style>[data-fixture="far"] { margin-block-start: 6000px; }</style>',
    });
    await watchCost(page);
    const settled = async () => {
      await turn(page, 60);
      await frames(page, 2);
      return cost(page);
    };
    // preview absent, or previewSrc given: a file costs its handle, and no address.
    await give(host(page, 'plain'), 'photo.png', 'image/png');
    await give(host(page, 'with-src'), 'photo.png', 'image/png');
    expect((await settled()).created, 'no address without preview, and none beside previewSrc').toEqual([]);
    await expect(own(page, 'plain', 'preview')).toHaveCount(0);
    expect(await own(page, 'with-src', 'preview').evaluate((el: HTMLImageElement) => el.src.startsWith('data:'))).toBe(true);
    // Far out of view: none, however long it waits.
    await give(host(page, 'far'), 'far.png', 'image/png');
    expect((await settled()).created, 'none while it is far out of view').toEqual([]);
    await expect(own(page, 'far', 'preview')).toHaveCount(0);
    await expect(own(page, 'far', 'icon')).toHaveText('image');
    // In view: exactly one, given to its own picture and to nothing else.
    const one = host(page, 'one');
    await give(one, 'photo.png', 'image/png');
    await expect.poll(async () => (await cost(page)).created.length).toBe(1);
    await expect.poll(() => own(page, 'one', 'preview').getAttribute('data-drawn')).toBe('');
    let c = await settled();
    expect(c.created.length, 'exactly one, however long it is shown').toBe(1);
    expect(c.revoked).toEqual([]);
    const first = c.created[0];
    expect(await one.evaluate((el, address) => [el.shadowRoot!.querySelector<HTMLImageElement>('img.preview')!.src === address, el.outerHTML.includes(address), [...el.attributes].some((attribute) => attribute.value === address)], first), 'its own picture has it, and no attribute of the element').toEqual([true, false, false]);
    // A prop that changes nothing about the picture makes no second one.
    await set(one, { statusText: 'Waiting', status: 'uploading', progress: 0.5, name: 'renamed.png' });
    expect((await settled()).created.length).toBe(1);
    // Near what is in view: the far one, scrolled to.
    await host(page, 'far').evaluate((el) => el.scrollIntoView());
    await expect.poll(async () => (await cost(page)).created.length, { message: 'made when it comes into view' }).toBe(2);
    await page.evaluate(() => window.scrollTo(0, 0));
    // Taken out of the page: revoked. Put back: a new one, when it is next in view.
    const released = async (address: string, message: string) => {
      await expect.poll(async () => (await cost(page)).revoked.includes(address), { message }).toBe(true);
      expect((await cost(page)).revoked.filter((each) => each === address).length, `${message}: once`).toBe(1);
    };
    await one.evaluate((el) => {
      (window as unknown as { __kept: Element; __where: Element }).__kept = el;
      (window as unknown as { __where: Element }).__where = el.parentElement!;
      el.remove();
    });
    await released(first, 'on disconnect');
    await page.evaluate(() => (window as unknown as { __where: Element; __kept: Element }).__where.append((window as unknown as { __kept: Element }).__kept));
    await expect.poll(async () => (await cost(page)).created.length, { message: 'put back: a new one' }).toBe(3);
    await expect.poll(() => own(page, 'one', 'preview').getAttribute('data-drawn')).toBe('');
    const next = async () => {
      const now = await cost(page);
      const open = live(now).filter((address) => address !== now.created[1]);
      expect(open.length, 'at most one per file item').toBe(1);
      return open[0];
    };
    // Another file: the old address is revoked and a new one made.
    let address = await next();
    await give(one, 'second.png', 'image/png');
    await released(address, 'on a new file');
    await expect.poll(async () => (await cost(page)).created.length).toBe(4);
    // No file: revoked, and none made.
    address = await next();
    await set(one, { file: null });
    await released(address, 'on no file');
    await expect(own(page, 'one', 'preview')).toHaveCount(0);
    expect((await settled()).created.length).toBe(4);
    // preview removed.
    await give(one, 'third.png', 'image/png');
    await expect.poll(async () => (await cost(page)).created.length).toBe(5);
    address = await next();
    await one.evaluate((el) => el.removeAttribute('preview'));
    await released(address, 'on preview removed');
    await expect(own(page, 'one', 'preview')).toHaveCount(0);
    // preview again: a new one. previewSrc given: revoked, and the product's picture drawn.
    await set(one, { preview: true });
    await expect.poll(async () => (await cost(page)).created.length).toBe(6);
    address = await next();
    await set(one, { previewSrc: PICTURE });
    await released(address, 'on previewSrc given');
    expect(await own(page, 'one', 'preview').evaluate((el: HTMLImageElement) => el.src.startsWith('data:'))).toBe(true);
    // previewSrc gone: a new one. The kind no longer image: revoked.
    await set(one, { previewSrc: '' });
    await expect.poll(async () => (await cost(page)).created.length).toBe(7);
    address = await next();
    await set(one, { mediaType: 'application/pdf' });
    await released(address, 'when the kind is no longer image');
    await expect(own(page, 'one', 'preview')).toHaveCount(0);
    await expect(own(page, 'one', 'icon')).toHaveText('picture_as_pdf');
    c = await settled();
    expect(live(c), 'only the far one’s is left').toEqual([c.created[1]]);
    await host(page, 'far').evaluate((el) => el.remove());
    await released(c.created[1], 'the far one, on disconnect');
    // Two hundred, added, drawn and removed: every address made is revoked.
    await page.setViewportSize({ width: 2000, height: 2400 });
    const made = (await cost(page)).created.length;
    await page.evaluate(
      async ([count, data]) => {
        const strip = document.createElement('div');
        strip.id = 'strip';
        strip.style.cssText = 'display:flex;flex-wrap:wrap;';
        const raw = Uint8Array.from(atob(data as string), (ch) => ch.charCodeAt(0));
        for (let i = 0; i < (count as number); i++) {
          const item = document.createElement('tanrei-file-item') as HTMLElement & Record<string, unknown>;
          Object.assign(item, { form: 'tile', preview: true, value: String(i), removeLabel: 'Remove {name}', width: 88, height: 40, nameHidden: true, file: new File([raw], `photo-${i}.png`, { type: 'image/png' }) });
          strip.append(item);
        }
        document.querySelector('main')!.prepend(strip);
        await Promise.all([...strip.children].map((item) => (item as unknown as { updateComplete: Promise<unknown> }).updateComplete));
      },
      [200, PNG] as const,
    );
    await expect.poll(async () => (await cost(page)).created.length - made, { message: 'two hundred in view: two hundred addresses, one each', timeout: 20000 }).toBe(200);
    await expect.poll(() => page.locator('#strip > tanrei-file-item').evaluateAll((items) => items.filter((item) => item.shadowRoot!.querySelector('img.preview[data-drawn]')).length), { timeout: 20000 }).toBe(200);
    expect(live(await cost(page)).length).toBe(200);
    await page.evaluate(() => document.querySelector('#strip')!.replaceChildren());
    await expect.poll(async () => live(await cost(page)).length, { message: 'none is left' }).toBe(0);
    // Added and removed before any came into view, and removed one by one while others are added: still none.
    await page.evaluate(async (data) => {
      const strip = document.querySelector('#strip')!;
      const raw = Uint8Array.from(atob(data), (ch) => ch.charCodeAt(0));
      const add = (i: number) => {
        const item = document.createElement('tanrei-file-item') as HTMLElement & Record<string, unknown>;
        Object.assign(item, { form: 'tile', preview: true, removeLabel: 'Remove {name}', file: new File([raw], `again-${i}.png`, { type: 'image/png' }) });
        strip.append(item);
      };
      for (let i = 0; i < 50; i++) add(i);
      strip.replaceChildren();
      for (let i = 0; i < 50; i++) {
        add(i);
        await new Promise((resolve) => setTimeout(resolve, 4));
        if (i % 2) strip.firstElementChild!.remove();
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
      strip.replaceChildren();
    }, PNG);
    c = await settled();
    expect(c.created.length, 'every address made was revoked').toBe(c.revoked.length);
    expect(live(c)).toEqual([]);
    expect([...c.revoked].sort(), 'each exactly once').toEqual([...c.created].sort());
    // Nothing read a file, and nothing left the page.
    expect(c.read, 'no reader, arrayBuffer, text, stream, slice, createImageBitmap, fetch or request').toEqual([]);
    expect(seen).toEqual([]);
  });

  test('FIT-8: a tile whose nameHidden is true does not draw its name beneath a picture that is drawn and keeps no room for it; while no picture is drawn — preview false, not drawn yet, cannot be drawn — the name is drawn whatever nameHidden says; the name stays the file item’s name for assistive technology and the second line is drawn; an empty name still renders and is reported', async ({ page, browserName }) => {
    const warnings = logged(page);
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route('http://pictures.tanrei.test/**', async (route) => {
      await held;
      await route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from(PNG, 'base64') });
    });
    const tile = { form: 'tile', nameHidden: true, ...WORDS };
    await mount(page, [
      ...spec.fixtures.filter((f) => ['tile-name-hidden', 'tile-name-hidden-glyph', 'tile-preview', 'tile-error-retryable'].includes(f.id)),
      fx('waiting', { ...tile, name: 'slow.png', preview: true }),
      fx('broken', { ...tile, name: 'broken.png', preview: true, previewSrc: 'data:image/png;base64,AAAA' }),
      fx('nameless', { form: 'tile', name: '', ...WORDS }),
      fx('nameless-row', { name: '', sizeText: '1 MB', ...WORDS }),
    ]);
    await set(host(page, 'waiting'), { previewSrc: 'http://pictures.tanrei.test/slow.png' });
    const id = 'tile-name-hidden';
    await expect(own(page, id, 'preview')).toHaveAttribute('data-drawn', '');
    const [name, media, whole] = [await box(own(page, id, 'headline')), await box(own(page, id, 'media')), await box(host(page, id))];
    expect(name.width * name.height, 'the name is not drawn').toBeLessThanOrEqual(1);
    expect(await own(page, id, 'headline').evaluate((el) => [getComputedStyle(el).position, getComputedStyle(el).overflow, getComputedStyle(el).clipPath !== 'none'])).toEqual(['absolute', 'hidden', true]);
    near(whole.height, media.height, 'no room is kept beneath the box', 1);
    expect((await box(host(page, 'tile-preview'))).height, 'a tile that draws its name is taller').toBeGreaterThan(whole.height + 10);
    // It stays the name: the whole of it in the tree, the group's name, and what fills the actions' names.
    await expect(own(page, id, 'headline')).toHaveText('floor-plan.png');
    expect(await own(page, id, 'headline').evaluate((el) => [el.closest('[aria-hidden="true"]'), getComputedStyle(el).display !== 'none', getComputedStyle(el).visibility])).toEqual([null, true, 'visible']);
    await expect(stage(page, id).getByRole('group', { name: 'floor-plan.png', exact: true })).toHaveCount(1);
    await expect(own(page, id, 'remove')).toHaveAttribute('aria-label', 'Remove floor-plan.png');
    if (browserName === 'chromium') {
      const client = await page.context().newCDPSession(page);
      await client.send('Accessibility.enable');
      const { nodes } = await client.send('Accessibility.getFullAXTree');
      const groups = nodes.filter((node) => node.role?.value === 'group' && !node.ignored).map((node) => node.name?.value);
      expect(groups.filter((each) => each === 'floor-plan.png').length, 'the group of a tile that hides its name is still named by it').toBeGreaterThanOrEqual(1);
      expect(nodes.some((node) => node.role?.value === 'StaticText' && node.name?.value === 'floor-plan.png' && !node.ignored), 'the name is read, where it is not drawn').toBe(true);
    }
    // The second line is drawn beneath a tile whose name is hidden.
    const failed = 'tile-error-retryable';
    await expect(own(page, failed, 'supporting')).toBeVisible();
    near((await box(own(page, failed, 'supporting'))).y - ((await box(own(page, failed, 'media'))).y + (await box(own(page, failed, 'media'))).height), await token(page, 'tile-container-gap'), 'tile.container.gap beneath the box, with no room for the name');
    // No picture is drawn: the name is drawn, whatever nameHidden says.
    const shown = async (fixture: string) => {
      const b = await box(own(page, fixture, 'headline'));
      return b.width > 10 && b.height > 10;
    };
    expect(await shown('tile-name-hidden-glyph'), 'preview is false').toBe(true);
    expect(await shown('waiting'), 'the picture is not drawn yet').toBe(true);
    expect(await shown('broken'), 'the picture cannot be drawn').toBe(true);
    await expect(own(page, 'broken', 'headline').locator('.cut')).toHaveText('broken.png');
    expect(await nameText(page, 'broken')).toBe('broken.png');
    const tall = (await box(host(page, 'waiting'))).height;
    release();
    await expect.poll(() => shown('waiting'), { message: 'the picture is drawn: the name is not' }).toBe(false);
    expect((await box(host(page, 'waiting'))).height).toBeLessThan(tall);
    // The picture goes: the name is drawn again.
    await set(host(page, id), { preview: false });
    expect(await shown(id)).toBe(true);
    await set(host(page, id), { preview: true, nameHidden: false });
    await expect(own(page, id, 'preview')).toHaveAttribute('data-drawn', '');
    expect(await shown(id), 'nameHidden false').toBe(true);
    // An empty name: it still renders, with its box and its actions, has no name — and is reported.
    for (const fixture of ['nameless', 'nameless-row']) {
      await expect(host(page, fixture)).toBeVisible();
      await expect(own(page, fixture, 'remove')).toBeVisible();
      expect(await host(page, fixture).evaluate((el) => [el.getAttribute('role'), el.hasAttribute('aria-label')])).toEqual(['group', false]);
    }
    expect(warnings.filter((text) => text.includes('FIT-8') && text.includes('name is empty')).length).toBe(2);
  });

  test('FIT-9: a tile draws its name on one line, no wider than the box; a name that does not fit is cut in the middle and never at its end — its ending, from its last dot where that dot is not its first character and is among its last eight, stays drawn, the start gives way and an ellipsis stands between; a name with no such ending is cut at its end; the whole name reaches assistive technology and name is not changed; the second line wraps inside the box and is never cut', async ({ page }) => {
    const tile = { form: 'tile', ...WORDS };
    await mount(page, [
      ...spec.fixtures.filter((f) => ['tile-long-name', 'tile-preview', 'tile-error-retryable', 'tile-disabled'].includes(f.id)),
      fx('no-ending', { ...tile, name: 'a_very_long_name_of_a_file_without_any_ending_at_all' }),
      fx('far-dot', { ...tile, name: 'version-1.of_a_long_name_that_goes_on' }),
      fx('eight', { ...tile, name: 'a_long_name_of_a_file_with_an_ending.abcdefg' }),
      fx('nine', { ...tile, name: 'a_long_name_of_a_file_with_an_ending.abcdefgh' }),
      fx('dot-first', { ...tile, name: '.gitignore' }),
      fx('two-dots', { ...tile, name: 'a_long_name_of_an_archive_of_site_photos.tar.gz' }),
      fx('wide', { ...tile, name: 'IMG_20260914_103322_HDR_edited_copy_2.jpeg', width: 400 }),
    ]);
    const id = 'tile-long-name';
    const NAME = 'IMG_20260914_103322_HDR_edited_copy_2.jpeg';
    const cut = (fixture: string) =>
      own(page, fixture, 'headline').evaluate((el) => {
        const [start, ending] = [el.querySelector<HTMLElement>('.start')!, el.querySelector<HTMLElement>('.ending')];
        const [line, s, e] = [el.getBoundingClientRect(), start.getBoundingClientRect(), ending?.getBoundingClientRect()];
        const style = getComputedStyle(start);
        // The start as it would be drawn whole.
        const range = document.createRange();
        range.selectNodeContents(start);
        return {
          line: [line.left, line.right, line.height],
          start: { text: start.textContent, shown: s.width, whole: range.getBoundingClientRect().width, left: s.left, right: s.right, overflow: style.overflow, ellipsis: style.textOverflow },
          ending: ending && e ? { text: ending.textContent, left: e.left, right: e.right, shown: e.width, whole: ending.scrollWidth, overflow: getComputedStyle(ending).overflow } : null,
          text: el.querySelector('.whole')!.textContent,
          drawn: el.querySelector('.cut')!.textContent,
          hidden: el.querySelector('.cut')!.getAttribute('aria-hidden'),
          whole: el.querySelector('.whole')!.getBoundingClientRect().width,
        };
      });
    const long = await cut(id);
    const media = await box(own(page, id, 'media'));
    // One line, no wider than the box.
    near(long.line[2], Number.parseFloat((await role(page, 'headline-typescale')).lineHeight), 'one line');
    expect(await textStyle(own(page, id, 'headline'))).toEqual(await role(page, 'headline-typescale'));
    await isColor(page, own(page, id, 'headline'), 'color', 'headline-color');
    expect(long.line[0]).toBeGreaterThanOrEqual(media.x - 0.5);
    expect(long.line[1], 'no wider than the box').toBeLessThanOrEqual(media.x + media.width + 0.5);
    expect((await box(host(page, id))).width, 'the name does not widen the tile').toBe(media.width);
    // Cut in the middle: the ending is whole and inside the box, the start is cut, with an ellipsis, and ends where the ending begins.
    expect(long.ending!.text).toBe('.jpeg');
    expect(long.ending!.shown, 'the ending is drawn whole').toBeGreaterThanOrEqual(long.ending!.whole - 0.5);
    expect(long.ending!.overflow).toBe('visible');
    expect(long.ending!.right, 'the ending is inside the box').toBeLessThanOrEqual(media.x + media.width + 0.5);
    near(long.ending!.right, media.x + media.width, 'the ending stands at the end of the line', 1);
    expect(long.start.text).toBe('IMG_20260914_103322_HDR_edited_copy_2');
    expect(long.start.shown, 'the start is cut').toBeLessThan(long.start.whole - 20);
    expect(long.start.shown, 'as far as the room that is left allows').toBeGreaterThan(20);
    expect([long.start.overflow, long.start.ellipsis]).toEqual(['hidden', 'ellipsis']);
    near(long.start.left, media.x, 'the start begins at the box’s start');
    near(long.start.right, long.ending!.left, 'the ellipsis stands between the two');
    // The cut is the drawing's alone: the whole name is in the tree, is the group's name, and name is not changed.
    expect(long.text, 'the whole name, as one text, for assistive technology').toBe(NAME);
    expect([long.drawn, long.hidden], 'what is drawn is the same name in two boxes, kept from assistive technology').toEqual([NAME, 'true']);
    expect(long.whole, 'the whole name is drawn nowhere').toBeLessThanOrEqual(1);
    expect(await host(page, id).evaluate((el: HTMLElement & { name: string }) => [el.name, el.getAttribute('name'), el.getAttribute('aria-label'), el.shadowRoot!.querySelector('.action.remove')!.getAttribute('aria-label')])).toEqual([NAME, NAME, NAME, `Remove ${NAME}`]);
    await expect(stage(page, id).getByRole('group', { name: NAME, exact: true })).toHaveCount(1);
    expect(await host(page, id).evaluate((el) => el.shadowRoot!.querySelector('.headline')!.textContent!.includes('…')), 'the ellipsis is a mark of the text layout, not a character').toBe(false);
    // A name that fits is not cut; with room, the long one is whole too.
    for (const fixture of ['tile-preview', 'wide']) {
      const fits = await cut(fixture);
      expect(fits.start.shown, `${fixture}: whole`).toBeGreaterThanOrEqual(fits.start.whole - 0.5);
      near(fits.start.right, fits.ending!.left, 'the ending follows the start');
    }
    // Which names have an ending that stays.
    const parts = async (fixture: string) => {
      const c = await cut(fixture);
      return [c.start.text, c.ending?.text ?? null];
    };
    expect(await parts('two-dots'), 'from its LAST dot').toEqual(['a_long_name_of_an_archive_of_site_photos.tar', '.gz']);
    expect(await parts('eight'), 'a dot among the last eight').toEqual(['a_long_name_of_a_file_with_an_ending', '.abcdefg']);
    expect(await parts('nine'), 'a dot that is not among the last eight').toEqual(['a_long_name_of_a_file_with_an_ending.abcdefgh', null]);
    expect(await parts('far-dot')).toEqual(['version-1.of_a_long_name_that_goes_on', null]);
    expect(await parts('dot-first'), 'a dot that is the first character').toEqual(['.gitignore', null]);
    expect(await parts('no-ending')).toEqual(['a_very_long_name_of_a_file_without_any_ending_at_all', null]);
    // No such ending: cut at its end, with an ellipsis, inside the box.
    for (const fixture of ['no-ending', 'nine', 'far-dot']) {
      const c = await cut(fixture);
      const b = await box(own(page, fixture, 'media'));
      expect(c.start.shown, `${fixture}: cut`).toBeLessThan(c.start.whole - 20);
      expect([c.start.overflow, c.start.ellipsis]).toEqual(['hidden', 'ellipsis']);
      near(c.start.left, b.x, 'its start is drawn');
      near(c.start.right, b.x + b.width, 'cut at its end');
      expect(c.text).toBe(await host(page, fixture).getAttribute('name'));
    }
    for (const fixture of ['two-dots', 'eight']) {
      const c = await cut(fixture);
      const b = await box(own(page, fixture, 'media'));
      expect(c.ending!.shown).toBeGreaterThanOrEqual(c.ending!.whole - 0.5);
      near(c.ending!.right, b.x + b.width, `${fixture}: its ending stays`, 1);
      expect(c.start.shown).toBeLessThan(c.start.whole - 20);
    }
    // The second line wraps inside the box's width and is never cut.
    for (const fixture of ['tile-error-retryable', 'tile-disabled']) {
      const second = own(page, fixture, 'supporting');
      const [s, b] = [await box(second), await box(own(page, fixture, 'media'))];
      expect(s.height).toBeGreaterThan(Number.parseFloat((await textStyle(second)).lineHeight) * 1.5);
      expect(s.x).toBeGreaterThanOrEqual(b.x - 0.5);
      expect(s.x + s.width).toBeLessThanOrEqual(b.x + b.width + 0.5);
      expect(await second.evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && getComputedStyle(el).textOverflow !== 'ellipsis' && getComputedStyle(el).overflow === 'visible' && getComputedStyle(el).whiteSpace !== 'nowrap')).toBe(true);
    }
  });

  test('FIT-10: an uploading file item draws a bar progress.thickness high — the track, and the indicator across the fraction progress gives, clamped, moving over motion.progress-duration: in a row progress.gap below the texts and as wide as them, with rounded ends; in a tile along the bottom edge of the box, inside it and as wide as it, clipped by its corners; null draws the indeterminate form once per motion.cycle-duration, paused while it is not visible; reduced motion shows a value at once; no other status has a bar, and nothing moves it but progress', async ({ page }) => {
    await mountSpec(page, 'row-uploading', 'row-uploading-indeterminate', 'tile-uploading', 'row', 'row-done', 'row-error', 'tile-done', 'row-interactive');
    const id = 'row-uploading';
    const bar = own(page, id, 'bar');
    const [text, b, second] = [await box(own(page, id, 'text')), await box(bar), await box(own(page, id, 'supporting'))];
    const thickness = await token(page, 'progress-thickness');
    near(b.y - (second.y + second.height), await token(page, 'progress-gap'), 'progress.gap below the texts');
    near(b.x, text.x, 'it begins where the texts begin');
    near(b.width, text.width, 'as wide as the texts');
    near(b.height, thickness, 'progress.thickness');
    near((await box(host(page, id))).height, b.y + b.height - (await box(host(page, id))).y, 'the row is as tall as its texts and its bar');
    const [track, indicator] = [bar.locator('.bar > .track.under'), bar.locator('.bar > .indicator')];
    await isColor(page, track, 'background-color', 'progress-track-color');
    await isColor(page, indicator, 'background-color', 'progress-indicator-color');
    near((await box(indicator)).width, 0.4 * b.width, 'the fraction progress gives');
    near((await box(indicator)).x, b.x, 'from the track’s start');
    expect(Number.parseFloat(await css(indicator, 'border-top-left-radius')), 'ends rounded by progress.shape').toBeGreaterThanOrEqual(b.height / 2);
    near(Number.parseFloat(await css(indicator, 'transition-duration')) * 1000, await resolveToken(page, T('motion-progress-duration'), 'duration'), 'motion.progress-duration', 1);
    // The divider form: the track whole under the indicator, no gap and no stop indicator.
    await expect(bar.locator('.bar > .stop')).toBeHidden();
    // Clamped to 0 and 1, and the product's number alone moves it.
    for (const [value, share] of [[1.5, 1], [-1, 0], [0.75, 0.75]] as const) {
      await set(host(page, id), { progress: value });
      await expect.poll(async () => (await bar.locator('.bar > .indicator').boundingBox())?.width ?? 0, { message: `progress ${value}` }).toBeCloseTo(share * b.width, 0);
    }
    const settled = (await box(indicator)).width;
    await page.waitForTimeout(300);
    expect((await box(indicator)).width, 'it never moves by itself').toBe(settled);
    expect(await host(page, id).evaluate((el: HTMLElement & { progress: number }) => el.progress), 'it sets no progress itself').toBe(0.75);
    // Null: the indeterminate form, once per cycle; not run while the file item is not visible.
    const under = own(page, 'row-uploading-indeterminate', 'bar');
    await expect(under.locator('.bar')).toHaveClass(/indeterminate/);
    near(Number.parseFloat(await css(under.locator('.bar > .indicator'), 'animation-duration')) * 1000, await resolveToken(page, T('motion-cycle-duration'), 'duration'), 'motion.cycle-duration', 1);
    expect(await css(under.locator('.bar > .indicator'), 'animation-play-state')).toBe('running');
    await host(page, 'row-uploading-indeterminate').evaluate((el) => (el.style.display = 'none'));
    await expect.poll(() => under.locator('.bar').getAttribute('class')).toContain('paused');
    await host(page, 'row-uploading-indeterminate').evaluate((el) => (el.style.display = ''));
    await expect.poll(() => under.locator('.bar').getAttribute('class')).not.toContain('paused');
    // A tile: along the bottom edge of the box, inside it and as wide as it, clipped by the box's corners, over the picture.
    const t = 'tile-uploading';
    const [tbar, tbox, over] = [await box(own(page, t, 'bar')), await box(own(page, t, 'media')), own(page, t, 'over')];
    near(tbar.height, thickness, 'progress.thickness');
    near(tbar.x, tbox.x, 'as wide as the box');
    near(tbar.width, tbox.width, 'as wide as the box');
    near(tbar.y + tbar.height, tbox.y + tbox.height, 'along the bottom edge, inside the box');
    expect([await box(over)].map((o) => [o.x, o.y, o.width, o.height])[0], 'the box the bar lies in is the picture’s').toEqual([tbox.x, tbox.y, tbox.width, tbox.height]);
    expect(await css(over, 'overflow'), 'clipped by the box’s corners').toBe('hidden');
    expect(await css(over, 'border-top-left-radius')).toBe(await css(own(page, t, 'media'), 'border-top-left-radius'));
    expect(await css(over, 'pointer-events'), 'it takes no press from the box under it').toBe('none');
    const tindicator = own(page, t, 'bar').locator('.bar > .indicator');
    expect(Number.parseFloat(await css(tindicator, 'border-top-left-radius')), 'clipped by nothing of its own').toBe(0);
    near((await box(tindicator)).width, 0.4 * tbox.width, 'the fraction progress gives');
    await isColor(page, own(page, t, 'bar').locator('.bar > .track.under'), 'background-color', 'progress-track-color');
    expect((await painted(own(page, t, 'bar').locator('.bar > .track.under'), 'background-color'))[3], 'a track that is read over any picture').toBe(255);
    await expect(own(page, t, 'preview'), 'over the picture').toHaveAttribute('data-drawn', '');
    near((await box(own(page, t, 'text'))).y - (tbox.y + tbox.height), await token(page, 'tile-container-gap'), 'a tile keeps no room for the bar');
    // Every other status: no bar and, in a row, no room.
    for (const fixture of ['row', 'row-done', 'row-error', 'tile-done']) await expect(own(page, fixture, 'bar'), fixture).toHaveCount(0);
    near((await box(host(page, 'row-done'))).height, (await box(own(page, 'row-done', 'text'))).height, 'no room for a bar');
    await set(host(page, id), { status: 'done' });
    await expect(bar).toHaveCount(0);
    await set(host(page, 'tile-uploading'), { status: 'pending' });
    await expect(own(page, t, 'bar')).toHaveCount(0);
    // The bar is no part of a pressable body: a button would hide it from assistive technology.
    await set(host(page, 'row-interactive'), { status: 'uploading', progress: 0.5 });
    expect(await own(page, 'row-interactive', 'bar').evaluate((el) => [el.closest('button') === null, el.getAttribute('role')])).toEqual([true, 'progressbar']);
    near((await box(own(page, 'row-interactive', 'bar'))).x, (await box(own(page, 'row-interactive', 'text'))).x, 'beneath the texts of a row with a picture');
    // Reduced motion: a new value at once, and the indeterminate bar as PRG-7 says.
    await mountSpec(page, 'row-uploading', 'row-uploading-indeterminate');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(own(page, 'row-uploading', 'bar').locator('.bar > .indicator'), 'transition-duration')).toBe('0s');
    expect(await css(own(page, 'row-uploading-indeterminate', 'bar').locator('.bar > .indicator'), 'animation-name')).toBe('pulse');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  test('FIT-11: every file item that is not read-only ends in a remove action, with a retry action before it while it failed and can be tried again — icon-only buttons of action.size on action.shape, filled with the action container color of their form; activating one by pointer, Enter or Space emits its event exactly once with value and does nothing else; they are beside the body, never inside it, and stops after it, retry before remove; no arrow key, Delete or Backspace is handled, nothing is selected and nothing is dragged', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => ['row', 'row-error-retryable', 'row-error', 'tile-error-retryable', 'row-read-only'].includes(f.id)), fx('pressable', { name: 'site-photo.png', status: 'error', errorText: 'Lost.', retryable: true, interactive: true, ...WORDS })]);
    await start(page);
    const id = 'row-error-retryable';
    await expect(own(page, 'row', 'remove')).toHaveCount(1);
    await expect(own(page, 'row', 'retry')).toHaveCount(0);
    // A failure that trying again cannot cure has no retry.
    await expect(own(page, 'row-error', 'retry')).toHaveCount(0);
    const [retry, remove] = [own(page, id, 'retry'), own(page, id, 'remove')];
    const [a, b, size] = [await box(retry), await box(remove), await token(page, 'action-size')];
    for (const side of [a.width, a.height, b.width, b.height]) near(side, size, 'action.size');
    near(b.x - (a.x + a.width), Math.max(await token(page, 'action-gap'), 2 * Math.max(0, (await resolveToken(page, '--tanrei-sys-target-pointer')) - (await token(page, 'action-size')))), 'action.gap, or twice what the target exceeds action.size by (FIT-18)');
    expect(a.x, 'retry before remove').toBeLessThan(b.x);
    for (const [form, fixture] of [['row', id], ['tile', 'tile-error-retryable']] as const) {
      for (const [name, glyph] of [['retry', 'refresh'], ['remove', 'close']] as const) {
        const action = own(page, fixture, name);
        await isColor(page, action, 'background-color', `${form}-action-container-color`, `${form} ${name}: the container`);
        await isColor(page, action, 'color', `${form}-action-icon-color`, `${form} ${name}: the glyph`);
        await expect(action.locator('.glyph')).toHaveText(glyph);
        expect(await action.locator('.glyph').getAttribute('aria-hidden')).toBe('true');
        near((await box(action.locator('.glyph'))).width, await token(page, 'action-icon-size'), 'action.icon.size');
        near((await box(action)).width, size, 'action.size');
        expect(Number.parseFloat(await css(action, 'border-top-left-radius')), 'action.shape: the full step').toBeGreaterThanOrEqual(size / 2);
        expect(await action.evaluate((el) => [el.localName, (el as HTMLButtonElement).type, el.textContent!.trim() !== '', el.closest('.body')])).toEqual(['button', 'button', true, null]);
      }
    }
    // Each input emits once, with the value, and nothing else happens.
    await listen(page);
    await retry.click();
    await remove.click();
    await retry.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await remove.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    expect(await heard(page)).toEqual([
      { type: 'retry', value: 'e' },
      { type: 'remove', value: 'e' },
      { type: 'retry', value: 'e' },
      { type: 'retry', value: 'e' },
      { type: 'remove', value: 'e' },
      { type: 'remove', value: 'e' },
    ]);
    await expect(host(page, id), 'it does not take itself away').toHaveCount(1);
    expect(await host(page, id).evaluate((el: HTMLElement & { status: string; retryable: boolean }) => [el.status, el.retryable, el.isConnected])).toEqual(['error', true, true]);
    expect(await focused(page), 'the activation moves no focus').toBe('tanrei-file-item[e] button.action.remove');
    // The events bubble and are composed, with the value as their detail.
    const shape = await remove.evaluate(
      (el) =>
        new Promise<unknown>((resolve) => {
          document.addEventListener('remove', (event) => resolve([event instanceof CustomEvent, event.bubbles, event.composed, (event.target as Element).localName, (event as CustomEvent).detail]), { once: true });
          (el as HTMLElement).click();
        }),
    );
    expect(shape).toEqual([true, true, true, TAG, { value: 'e' }]);
    // Beside a pressable body: an action never activates it, and the order of the stops is the body, retry, remove.
    await forget(page);
    await own(page, 'pressable', 'retry').click();
    await own(page, 'pressable', 'remove').click();
    expect(await heard(page)).toEqual([
      { type: 'retry', value: 'pressable' },
      { type: 'remove', value: 'pressable' },
    ]);
    await page.locator('#start').focus();
    const order: string[] = [];
    for (let i = 0; i < 9; i++) {
      await tab(page);
      order.push(await focused(page));
    }
    const at = (value: string, what: string) => `tanrei-file-item[${value}] ${what}`;
    expect(order).toEqual([at('a', 'button.action.remove'), at('e', 'button.action.retry'), at('e', 'button.action.remove'), at('f', 'button.action.remove'), at('e', 'button.action.retry'), at('e', 'button.action.remove'), at('pressable', 'button.body.pressable'), at('pressable', 'button.action.retry'), at('pressable', 'button.action.remove')]);
    // No arrow key, Delete or Backspace is handled; nothing is selected, has a handle or is dragged.
    await remove.focus();
    await forget(page);
    for (const key of ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Delete', 'Backspace', 'Home', 'End']) {
      expect(await remove.evaluate((el, k) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, composed: true, cancelable: true })), key), key).toBe(true);
      await page.keyboard.press(key);
    }
    expect(await focused(page)).toBe(at('e', 'button.action.remove'));
    expect(await heard(page)).toEqual([]);
    expect(await host(page, id).evaluate((el) => [el.draggable, el.hasAttribute('aria-selected'), el.shadowRoot!.querySelectorAll('[draggable="true"], [aria-selected], [aria-grabbed], [role="checkbox"], input').length])).toEqual([false, false, 0]);
  });

  test('FIT-12: with interactive and no href the body — the glyph or the picture, and the texts — is exactly one button, before the actions in the focus order, and emits click exactly once with value by pointer, Enter or Space, opening nothing itself; without interactive the body is no stop, emits no click and answers no pointer; in a tile the body is the box and the texts beneath it, and a press on an action’s visible bounds is that action’s', async ({ page }) => {
    const seen = requests(page);
    await mountSpec(page, 'row-interactive', 'tile-interactive', 'row', 'tile-preview', 'row-preview');
    await start(page);
    await page.evaluate(() => {
      (window as unknown as { __opened: number }).__opened = 0;
      window.open = () => ((window as unknown as { __opened: number }).__opened++, null);
    });
    for (const id of ['row-interactive', 'tile-interactive']) {
      const body = own(page, id, 'body');
      expect(await host(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('.body')].map((node) => [node.localName, (node as HTMLButtonElement).type, node.getAttribute('part')])), id).toEqual([['button', 'button', 'container']]);
      await expect(stage(page, id).getByRole('button', { name: 'floor-plan.png', exact: true }), 'one element with the button role').toHaveCount(1);
      // The body holds the glyph or the picture, and the texts — and no action.
      expect(await body.evaluate((el) => [!!el.querySelector('.media'), !!el.querySelector('.headline'), el.querySelectorAll('button, a, .action').length])).toEqual([true, true, 0]);
      await listen(page);
      const b = await box(own(page, id, 'headline'));
      await page.mouse.click(b.x + 5, b.y + b.height / 2);
      const m = await box(own(page, id, 'media'));
      await page.mouse.click(m.x + 8, m.y + m.height - 8);
      await body.focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Space');
      const click = { type: 'click', value: 'b', cancelable: true, native: false };
      expect(await heard(page), `${id}: once for each activation, on the name, on the picture, by Enter and by Space`).toEqual([click, click, click, click]);
      // Before the actions in the focus order.
      await page.locator('#start').focus();
      await tabTo(page, body);
      await tab(page);
      expect(await focused(page), id).toBe('tanrei-file-item[b] button.action.remove');
      // A press on an action's visible bounds goes to the action, never to the body under or beside it.
      await forget(page);
      const r = await box(own(page, id, 'remove'));
      for (const [x, y] of [[r.x + r.width / 2, r.y + r.height / 2], [r.x + 2, r.y + r.height / 2], [r.x + r.width / 2, r.y + r.height - 2]]) await page.mouse.click(x, y);
      expect((await heard(page)).map((h) => h.type), `${id}: an action’s visible bounds`).toEqual(['remove', 'remove', 'remove']);
    }
    // In a tile the actions lie over the box: just beside one, the press is the body's.
    await forget(page);
    const [tbox, tremove] = [await box(own(page, 'tile-interactive', 'media')), await box(own(page, 'tile-interactive', 'remove'))];
    expect(tremove.x).toBeGreaterThan(tbox.x);
    await page.mouse.click(tbox.x + 6, tbox.y + tbox.height / 2);
    expect((await heard(page)).map((h) => h.type)).toEqual(['click']);
    // It opens nothing itself.
    expect(await page.evaluate(() => [(window as unknown as { __opened: number }).__opened, location.href])).toEqual([0, 'about:blank']);
    expect(seen).toEqual([]);
    // Not interactive: the body is no stop, emits no click, and answers nothing.
    await forget(page);
    for (const id of ['row', 'tile-preview', 'row-preview']) {
      const body = own(page, id, 'body');
      expect(await body.evaluate((el: HTMLElement) => [el.localName, el.tabIndex, el.getAttribute('role'), el.querySelector('.layer'), getComputedStyle(el).cursor]), id).toEqual(['div', -1, null, null, 'auto']);
      const b = await box(own(page, id, 'headline'));
      await page.mouse.click(b.x + 5, b.y + b.height / 2);
      const m = await box(own(page, id, 'media'));
      await page.mouse.move(m.x + m.width / 2, m.y + m.height - 4);
      expect(await body.evaluate((el) => [el.matches(':hover'), el.hasAttribute('data-pressed')])).toEqual([true, false]);
      await page.mouse.down();
      expect(await body.getAttribute('data-pressed')).toBeNull();
      await page.mouse.up();
    }
    expect(await heard(page), 'a press on a body that is not pressable is no click of the file item’s').toEqual([]);
    await page.locator('#start').focus();
    await tab(page);
    expect(await focused(page), 'a body that is not pressable is skipped: the first stop is its remove action').toBe('tanrei-file-item[a] button.action.remove');
    // interactive set while it is shown: the body becomes the button.
    await set(host(page, 'row'), { interactive: true });
    await expect(stage(page, 'row').getByRole('button', { name: 'brief.pdf', exact: true })).toHaveCount(1);
    await set(host(page, 'row'), { interactive: false });
    await expect(stage(page, 'row').getByRole('button', { name: 'brief.pdf', exact: true })).toHaveCount(0);
  });

  test('FIT-13: with href the body is a link — the browser’s own, with the link role, whether interactive is set or not; followed by pointer or Enter and not by Space; click is emitted once with value before the address opens, and cancelling it holds the navigation; target new opens a new context, exposes targetLabel after the name and, in a row, draws open_in_new after the texts; download and rel reach the anchor; a disabled link keeps its role, has no destination and is no stop; an href of white space, a script or an unreadable address leaves what interactive makes it, the last two reported', async ({ page }) => {
    const warnings = logged(page);
    const seen = requests(page);
    await mount(page, [
      ...spec.fixtures.filter((f) => ['row-link', 'row-link-new', 'tile-read-only', 'row-rtl-error'].includes(f.id)),
      fx('here', { name: 'here.pdf', sizeText: '1 MB', href: '#opened', ...WORDS }),
      fx('both', { name: 'both.pdf', href: '#both', interactive: true, ...WORDS }),
    ]);
    await start(page);
    // The browser's own link, with the link role and not the button role.
    for (const [id, name] of [['row-link', 'contract.pdf'], ['tile-read-only', 'floor-plan.png'], ['here', 'here.pdf'], ['both', 'both.pdf']] as const) {
      expect(await own(page, id, 'body').evaluate((el) => [el.localName, el.getAttribute('role'), el.hasAttribute('type'), el.getAttribute('part'), el.classList.contains('pressable')]), id).toEqual(['a', null, false, 'container', true]);
      await expect(stage(page, id).getByRole('link', { name, exact: true })).toHaveCount(1);
      await expect(stage(page, id).getByRole('button', { name, exact: true }), `${id}: no button of that name`).toHaveCount(0);
    }
    expect(await own(page, 'row-link', 'body').getAttribute('href')).toBe('/files/contract.pdf');
    expect(await own(page, 'here', 'body').evaluate((el) => ['target', 'rel', 'download'].map((name) => el.getAttribute(name)))).toEqual([null, null, null]);
    // Enter follows it: click first, once, cancelable — then the browser, at once and not after press-hold.
    await listen(page);
    const here = own(page, 'here', 'body');
    await tabTo(page, here);
    // The activation is left to the browser as it arrived: nothing holds it back for press-hold, and nothing cancels it.
    const followed = await here.evaluate(
      (el) =>
        new Promise<boolean[]>((resolve) => {
          el.addEventListener('click', (event) => queueMicrotask(() => resolve([event.defaultPrevented, event.isTrusted])), { once: true });
          el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true, cancelable: true }));
          (el as HTMLElement).click();
        }),
    );
    expect(followed, 'the browser’s own click goes on to the address, in its own turn').toEqual([false, false]);
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#opened');
    const click = (value: string) => ({ type: 'click', value, cancelable: true, native: false });
    expect(await heard(page)).toEqual([click('here')]);
    await page.evaluate(() => (location.hash = ''));
    await forget(page);
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => location.hash), { message: 'Enter follows the link' }).toBe('#opened');
    expect(await heard(page)).toEqual([click('here')]);
    // Space does what it does on any link: it does not follow it, emits no click and presses nothing.
    await page.evaluate(() => (location.hash = ''));
    await forget(page);
    await expect.poll(() => here.getAttribute('data-pressed'), { message: 'Enter’s press has ended' }).toBeNull();
    await page.keyboard.down('Space');
    expect(await here.getAttribute('data-pressed'), 'a link is not pressed by Space (FIT-15)').toBeNull();
    await page.keyboard.up('Space');
    await turn(page);
    expect(await heard(page)).toEqual([]);
    expect(await page.evaluate(() => location.hash)).toBe('');
    // A pointer follows it, on the name as on the glyph.
    await here.click();
    expect(await page.evaluate(() => location.hash)).toBe('#opened');
    expect(await heard(page)).toEqual([click('here')]);
    // interactive beside href: still the link, and one click.
    await forget(page);
    await own(page, 'both', 'body').click();
    expect(await heard(page)).toEqual([click('both')]);
    expect(await page.evaluate(() => location.hash)).toBe('#both');
    // The product takes the navigation: the click is cancelled and the address does not open.
    await mount(page, [fx('here', { name: 'here.pdf', href: '#opened', ...WORDS })]);
    await page.evaluate(() => (location.hash = ''));
    await listen(page, { cancel: true });
    await own(page, 'here', 'body').click();
    await own(page, 'here', 'body').focus();
    await page.keyboard.press('Enter');
    await turn(page);
    expect(await heard(page)).toEqual([click('here'), click('here')]);
    expect(await page.evaluate(() => location.hash), 'a cancelled click opens nothing').toBe('');
    await mount(page, [
      ...spec.fixtures.filter((f) => ['row-link', 'row-link-new', 'tile-read-only', 'row-rtl-error'].includes(f.id)),
      fx('tile-new', { form: 'tile', name: 'new.png', href: '#tile', target: 'new', targetLabel: 'opens in a new tab', ...WORDS }),
      fx('unsaid', { name: 'unsaid.pdf', href: '#unsaid', target: 'new', ...WORDS }),
      fx('off', { name: 'off.pdf', sizeText: '1 MB', href: '#off', target: 'new', targetLabel: 'opens in a new tab', disabled: true, ...WORDS }),
      fx('saved', { name: 'saved.pdf', href: '#saved', download: 'report.pdf', rel: 'nofollow', ...WORDS }),
      fx('saved-new', { name: 'saved.pdf', href: '#saved', target: 'new', targetLabel: 'opens in a new tab', download: '', rel: 'nofollow', ...WORDS }),
      fx('blank', { name: 'blank.pdf', href: '   ', ...WORDS }),
      fx('blank-interactive', { name: 'blank.pdf', href: '   ', interactive: true, ...WORDS }),
      fx('script', { name: 'script.pdf', href: 'javascript:void(document.title="ran")', ...WORDS }),
      fx('unreadable', { name: 'unreadable.pdf', href: 'http://', interactive: true, ...WORDS }),
    ]);
    await start(page);
    await page.evaluate(() => (location.hash = ''));
    // target new: a new context, said by targetLabel after the name — after the second line's texts — and marked in a row.
    const fresh = own(page, 'row-link-new', 'body');
    expect(await fresh.evaluate((el) => ['href', 'target', 'rel', 'aria-label', 'aria-description'].map((name) => el.getAttribute(name)))).toEqual(['/files/contract.pdf', '_blank', 'noopener', 'contract.pdf', '2.0 MB, opens in a new tab']);
    const mark = own(page, 'row-link-new', 'opens');
    await expect(mark).toHaveText('open_in_new');
    expect(await mark.getAttribute('aria-hidden')).toBe('true');
    await expect.poll(() => mark.getAttribute('data-drawn')).not.toBeNull();
    const [m, text, remove, gap] = [await box(mark), await box(own(page, 'row-link-new', 'text')), await box(own(page, 'row-link-new', 'remove')), await token(page, 'row-container-gap')];
    near(m.width, await token(page, 'action-icon-size'), 'action.icon.size');
    near(m.x - (text.x + text.width), gap, 'row.container.gap after the texts');
    near(remove.x - (m.x + m.width), gap, 'row.container.gap before the actions');
    near(m.y + m.height / 2, text.y + text.height / 2, 'centred on the two lines');
    await isColor(page, mark, 'color', 'icon-color');
    expect(await mark.evaluate((el) => el.closest('a') !== null), 'the mark is part of the link').toBe(true);
    // A link to the same context draws none; a tile has no such place and draws none, and still says it.
    await expect(own(page, 'row-link', 'opens')).toHaveCount(0);
    await expect(own(page, 'tile-new', 'opens')).toHaveCount(0);
    expect(await host(page, 'tile-new').evaluate((el) => el.shadowRoot!.querySelectorAll('.mark.new, .open').length)).toBe(0);
    expect(await own(page, 'tile-new', 'body').evaluate((el) => ['target', 'rel', 'aria-description'].map((name) => el.getAttribute(name)))).toEqual(['_blank', 'noopener', 'opens in a new tab']);
    // A new context nobody said is reported, and still opens anew.
    expect(await own(page, 'unsaid', 'body').evaluate((el) => [el.getAttribute('target'), el.getAttribute('aria-description')])).toEqual(['_blank', null]);
    expect(warnings.filter((text) => text.includes('FIT-13') && text.includes('targetLabel is empty')).length).toBeGreaterThanOrEqual(1);
    // The product's words give it, once for every link.
    await setWords(page, { targetLabel: 'opens in a new tab' });
    await expect(own(page, 'unsaid', 'body')).toHaveAttribute('aria-description', 'opens in a new tab');
    // download and rel are the anchor's; noopener is added to the product's rel for a new context.
    expect(await own(page, 'saved', 'body').evaluate((el) => ['download', 'rel', 'target'].map((name) => el.getAttribute(name)))).toEqual(['report.pdf', 'nofollow', null]);
    expect(await own(page, 'saved-new', 'body').evaluate((el) => ['download', 'rel', 'target'].map((name) => el.getAttribute(name)))).toEqual(['', 'nofollow noopener', '_blank']);
    // Disabled: the link role with the disabled state, no destination, no stop, and nothing follows it.
    const off = own(page, 'off', 'body');
    expect(await off.evaluate((el: HTMLAnchorElement) => [el.localName, el.getAttribute('role'), el.getAttribute('aria-disabled'), el.hasAttribute('href'), el.hasAttribute('target'), el.hasAttribute('download'), el.matches(':any-link'), el.hasAttribute('tabindex'), getComputedStyle(el).cursor])).toEqual(['a', 'link', 'true', false, false, false, false, false, 'default']);
    await expect(stage(page, 'off').getByRole('link', { name: 'off.pdf', exact: true, disabled: true })).toHaveCount(1);
    await listen(page);
    await off.click({ force: true });
    await off.evaluate((el: HTMLElement) => {
      el.click();
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    });
    await turn(page);
    expect(await heard(page)).toEqual([]);
    expect(await page.evaluate(() => location.hash)).toBe('');
    await page.locator('#start').focus();
    await tabTo(page, own(page, 'saved', 'body'));
    await tab(page, { back: true });
    expect(await focused(page), 'a disabled link, and its disabled actions, are no stop: the stop before is the unsaid link’s remove action').toBe('tanrei-file-item[unsaid] button.action.remove');
    // White space, a script, an address that cannot be read: what interactive makes it, without a destination.
    expect(await own(page, 'blank', 'body').evaluate((el) => el.localName)).toBe('div');
    expect(await own(page, 'blank-interactive', 'body').evaluate((el) => el.localName)).toBe('button');
    expect(await own(page, 'script', 'body').evaluate((el) => [el.localName, el.hasAttribute('href')])).toEqual(['div', false]);
    expect(await own(page, 'unreadable', 'body').evaluate((el) => [el.localName, el.hasAttribute('href')])).toEqual(['button', false]);
    await forget(page);
    await own(page, 'unreadable', 'body').click();
    await own(page, 'script', 'body').click();
    expect(await heard(page), 'the button it is emits click; the script is never run').toEqual([click('unreadable')]);
    expect(await page.title()).not.toBe('ran');
    const refused = (needle: string) => warnings.filter((text) => text.includes('FIT-13') && text.includes(needle)).length;
    expect(refused('names a script to run')).toBe(1);
    expect(refused('cannot be read as an address')).toBe(1);
    expect(warnings.filter((text) => text.includes('blank.pdf') || text.includes('href "   "')), 'white space is no address and no finding').toEqual([]);
    // It loads nothing from href, and learns nothing from it: the name, the size and the glyph are the props'.
    await expect(own(page, 'row-link', 'headline')).toHaveText('contract.pdf');
    await expect(own(page, 'row-link', 'supporting')).toHaveText(/^\s*PDF\s+·\s+2\.0 MB\s*$/);
    await set(host(page, 'row-link'), { name: 'renamed', href: '/files/picture.png' });
    await expect(own(page, 'row-link', 'icon'), 'the glyph is not read from the address').toHaveText('draft');
    expect(seen).toEqual([]);
  });

  test('FIT-14: under the acme system a pressable body paints its layer from the highest-precedence state — pressed over focused over hovered — in a row over the body’s bounds grown by row.container.outset on row.container.shape, taking no room, in a tile over the box; an action paints its container, glyph and opacity likewise; pointer focus does not select focused; nothing else of the file item changes; and keyboard focus shows the focus indicator around the body or the action at once, pointer focus none', async ({ page, browserName }) => {
    const fixtures = [
      fx('row', { name: 'site.png', sizeText: '1 MB', status: 'error', errorText: 'Lost.', retryable: true, interactive: true, ...WORDS }),
      fx('tile', { form: 'tile', name: 'site.png', status: 'error', errorText: 'Lost.', retryable: true, interactive: true, preview: true, previewSrc: PICTURE, ...WORDS }),
      fx('plain', { name: 'site.png', sizeText: '1 MB', ...WORDS }),
    ];
    await acme(page, fixtures, { reducedMotion: true });
    await start(page);
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'overlay' });
    // The acme system values the three states differently: read from the tokens, never written here.
    for (const form of ['row', 'tile']) {
      const three = await Promise.all(['hovered', 'focused', 'pressed'].map((state) => tokenColor(page, `${form}-${state}-container-color`)));
      expect(new Set(three.map((color) => color.join())).size, `${form}: three different layers under acme`).toBe(3);
      const actions = await Promise.all(['hovered', 'focused', 'pressed'].map((state) => tokenColor(page, `${form}-${state}-action-container-color`)));
      expect(new Set(actions.map((color) => color.join())).size, `${form}: three different action containers under acme`).toBe(3);
    }
    for (const form of ['row', 'tile'] as const) {
      const [body, layer, retry, remove] = [own(page, form, 'body'), own(page, form, 'layer'), own(page, form, 'retry'), own(page, form, 'remove')];
      const layerIs = async (state: string) => {
        await expect.poll(async () => (await painted(layer, 'background-color')).join(), { message: `${form} body ${state || 'at rest'}` }).toBe((await tokenColor(page, `${form}-${state ? `${state}-` : ''}container-color`)).join());
      };
      const actionIs = async (action: Locator, state: string) => {
        const prefix = `${form}-${state ? `${state}-` : ''}action`;
        await expect.poll(async () => (await painted(action, 'background-color')).join(), { message: `${form} action ${state || 'at rest'}: container` }).toBe((await tokenColor(page, `${prefix}-container-color`)).join());
        sameColor(await painted(action, 'color'), await tokenColor(page, `${prefix}-icon-color`), `${form} action ${state}: glyph`);
        if (state) near(Number.parseFloat(await css(action, 'opacity')), Number.parseFloat(await page.evaluate((name) => getComputedStyle(document.documentElement).getPropertyValue(name), T(`${state}-opacity`))), `${state}.opacity`, 0.01);
      };
      const still = async () => ({
        name: await painted(own(page, form, 'headline'), 'color'),
        second: await painted(own(page, form, 'supporting'), 'color'),
        mark: await painted(own(page, form, 'mark'), 'color'),
        glyph: await painted(own(page, form, 'icon'), 'color'),
        nameOpacity: await css(own(page, form, 'headline'), 'opacity'),
        bodyOpacity: await css(body, 'opacity'),
        size: await box(host(page, form)),
      });
      const rest = await still();
      const restOf = async (action: Locator) => [await painted(action, 'background-color'), await painted(action, 'color'), await css(action, 'opacity')];
      const [retryRest, removeRest] = [await restOf(retry), await restOf(remove)];
      await layerIs('');
      // The layer's bounds.
      const [l, b, media] = [await box(layer), await box(body), await box(own(page, form, 'media'))];
      if (form === 'row') {
        const outset = await token(page, 'row-container-outset');
        const [lead, text] = [await box(own(page, form, 'lead')), await box(own(page, form, 'text'))];
        near(l.x, lead.x - outset, 'grown by row.container.outset at the start');
        near(l.x + l.width, text.x + text.width + outset, 'grown by row.container.outset at the end');
        near(l.y, text.y - outset, 'grown above');
        near(l.y + l.height, text.y + text.height + outset, 'grown below');
        near(Number.parseFloat(await css(layer, 'border-top-left-radius')), await token(page, 'row-container-shape'), 'row.container.shape');
        // Taking no room: a row with a pressable body is the size of a row without one, and its parts stand where they stood.
        const plain = await box(host(page, 'plain'));
        near((await box(own(page, form, 'lead'))).x - (await box(host(page, form))).x, (await box(own(page, 'plain', 'lead'))).x - plain.x, 'the glyph stands where it stood');
        near((await box(own(page, form, 'headline'))).x - (await box(host(page, form))).x, (await box(own(page, 'plain', 'headline'))).x - plain.x, 'the name stands where it stood');
        near((await box(host(page, form))).width, plain.width, 'the row is no wider');
        expect([b.x, b.y, b.width, b.height], 'the body is the layer’s bounds').toEqual([l.x, l.y, l.width, l.height]);
      } else {
        expect([l.x, l.y, l.width, l.height], 'over the box').toEqual([media.x, media.y, media.width, media.height]);
        expect(await css(layer, 'border-top-left-radius')).toBe(await css(own(page, form, 'media'), 'border-top-left-radius'));
      }
      expect(await css(layer, 'pointer-events')).toBe('none');
      // Hovered, then pressed over hovered.
      const at = form === 'row' ? await box(own(page, form, 'headline')) : { x: media.x, y: media.y + media.height - 20, width: 20, height: 20 };
      await page.mouse.move(at.x + 6, at.y + at.height / 2);
      await layerIs('hovered');
      expect(await restOf(retry), 'the part that is not under the pointer does not change').toEqual(retryRest);
      expect(await restOf(remove)).toEqual(removeRest);
      expect(await still(), 'the name, the second line, the mark and the glyph do not change').toEqual(rest);
      await page.mouse.down();
      await layerIs('pressed');
      expect(await still()).toEqual(rest);
      await page.mouse.up();
      // Focus gained by the pointer: hovered, not focused, and no indicator.
      await layerIs('hovered');
      if (browserName !== 'webkit') expect(await body.evaluate((el) => el === (el.getRootNode() as ShadowRoot).activeElement)).toBe(true);
      expect(await body.evaluate((el) => el.matches(':focus-visible'))).toBe(false);
      expect((await painted(body, 'outline-color'))[3] === 0 || (await css(body, 'outline-style')) === 'none', 'no ring').toBe(true);
      expect(await css(body, 'box-shadow', '::after'), 'no glow').toBe('none');
      await page.mouse.move(2, 2);
      await layerIs('');
      // Keyboard focus: focused; pressed over focused; hovered while focused is focused.
      await page.locator('#start').focus();
      await tabTo(page, body);
      await layerIs('focused');
      await page.keyboard.down('Enter');
      await layerIs('pressed');
      await page.keyboard.up('Enter');
      await layerIs('focused');
      await page.mouse.move(at.x + 6, at.y + at.height / 2);
      await layerIs('focused');
      expect(await still()).toEqual(rest);
      await page.mouse.move(2, 2);
      // An action, the same three: its container, its glyph and its opacity.
      const r = await box(remove);
      await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
      await actionIs(remove, 'hovered');
      expect(await restOf(retry), 'the other action does not change').toEqual(retryRest);
      await page.mouse.down();
      await actionIs(remove, 'pressed');
      await page.mouse.up();
      await actionIs(remove, 'hovered');
      expect(await remove.evaluate((el) => el.matches(':focus-visible'))).toBe(false);
      await page.mouse.move(2, 2);
      await page.locator('#start').focus();
      await tabTo(page, remove);
      await actionIs(remove, 'focused');
      await page.keyboard.down('Space');
      await actionIs(remove, 'pressed');
      await page.keyboard.up('Space');
      await actionIs(remove, 'focused');
      await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
      await actionIs(remove, 'focused');
      expect(await still()).toEqual(rest);
      await page.mouse.move(2, 2);
      await page.locator('#start').focus();
      await actionIs(remove, '');
    }
    // The focus indicator, under the default system: a ring around the part, sys.focus.offset from it and following its corners, never animated.
    await mount(page, fixtures, { reducedMotion: true });
    await start(page);
    const [outer, offset, inner] = [await resolveToken(page, '--tanrei-sys-focus-outer-width'), await resolveToken(page, '--tanrei-sys-focus-offset'), await resolveToken(page, '--tanrei-sys-focus-inner-width')];
    for (const form of ['row', 'tile'] as const) {
      for (const name of ['body', 'remove'] as const) {
        const target = own(page, form, name);
        await page.locator('#start').focus();
        await tabTo(page, target);
        near(Number.parseFloat(await css(target, 'outline-width')), outer, `${form} ${name}: sys.focus.outer-width`);
        expect(await css(target, 'outline-style')).toBe('solid');
        sameColor(await painted(target, 'outline-color'), await colorOf(page, 'var(--tanrei-sys-color-focus-ring)'), 'the focus-ring role');
        near(Number.parseFloat(await css(target, 'outline-offset')), offset + inner, 'sys.focus.offset');
        near(Number.parseFloat(await css(target, 'border-top-width', '::after')), inner, 'the inner stroke of sys.focus.inner-width');
        expect(await css(target, 'transition-property'), 'never animated').not.toContain('outline');
        expect((await css(target, 'transition-property')) !== 'all' || Number.parseFloat(await css(target, 'transition-duration')) === 0, 'nothing of the indicator is in a transition').toBe(true);
      }
      // The ring is drawn around what answers: the layer's bounds in a row, the whole body — the box and its texts — in a tile.
      const [b, l] = [await box(own(page, form, 'body')), await box(own(page, form, 'layer'))];
      if (form === 'row') expect([b.x, b.y, b.width, b.height]).toEqual([l.x, l.y, l.width, l.height]);
      else expect(b.height).toBeGreaterThan(l.height);
      expect(await css(own(page, form, 'body'), 'border-top-left-radius'), 'following its corners').toBe(await css(own(page, form, 'layer'), 'border-top-left-radius'));
    }
  });

  test('FIT-15: a press on a pressable body or on an action — by pointer, Enter or Space — shows the pressed state without delay and keeps it for at least press-hold, even when the press ends at once; a body that is a link is not pressed by Space', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => ['row-interactive', 'tile-interactive', 'row-error-retryable', 'tile-error-retryable'].includes(f.id)), fx('link', { name: 'here.pdf', href: '#here', ...WORDS }), fx('plain', { name: 'plain.pdf', ...WORDS })]);
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    expect(hold).toBeGreaterThan(0);
    const cases: [string, Locator, string[]][] = [
      ['a row’s body', own(page, 'row-interactive', 'body'), ['pointer', 'Enter', ' ']],
      ['a tile’s body', own(page, 'tile-interactive', 'body'), ['pointer', 'Enter', ' ']],
      ['a row’s remove action', own(page, 'row-error-retryable', 'remove'), ['pointer', 'Enter', ' ']],
      ['a row’s retry action', own(page, 'row-error-retryable', 'retry'), ['pointer', 'Enter', ' ']],
      ['a tile’s remove action', own(page, 'tile-error-retryable', 'remove'), ['pointer', 'Enter', ' ']],
      ['a link', own(page, 'link', 'body'), ['pointer', 'Enter']],
    ];
    for (const [what, target, inputs] of cases) {
      for (const how of inputs) {
        const held = await target.evaluate(
          (el: HTMLElement, [input, ms]) =>
            new Promise<{ immediate: string | undefined; kept: number }>((resolve) => {
              const r = el.getBoundingClientRect();
              const at = { clientX: r.left + 6, clientY: r.top + 6, bubbles: true, composed: true };
              const start = performance.now();
              if (input === 'pointer') el.dispatchEvent(new PointerEvent('pointerdown', { ...at, button: 0, pointerType: 'mouse' }));
              else el.dispatchEvent(new KeyboardEvent('keydown', { key: input as string, bubbles: true, composed: true }));
              const immediate = el.dataset.pressed;
              if (input === 'pointer') el.dispatchEvent(new PointerEvent('pointerup', { ...at, button: 0, pointerType: 'mouse' }));
              else el.dispatchEvent(new KeyboardEvent('keyup', { key: input as string, bubbles: true, composed: true }));
              const stillThere = el.dataset.pressed;
              const look = () => {
                if (el.dataset.pressed === undefined) resolve({ immediate: immediate && stillThere, kept: performance.now() - start });
                else if (performance.now() - start > (ms as number) * 20 + 2000) resolve({ immediate, kept: Number.POSITIVE_INFINITY });
                else setTimeout(look, 1);
              };
              look();
            }),
          [how, hold] as const,
        );
        expect(held.immediate, `${what}, ${how}: pressed without delay, and still pressed when the press ends`).toBeTruthy();
        expect(held.kept, `${what}, ${how}: kept for press-hold`).toBeGreaterThanOrEqual(hold - 1);
        expect(held.kept).toBeLessThan(hold * 20 + 2000);
      }
    }
    // The pressed layer appears without a transition in.
    const body = own(page, 'row-interactive', 'body');
    const b = await box(own(page, 'row-interactive', 'headline'));
    await page.mouse.move(b.x + 4, b.y + 4);
    await page.mouse.down();
    expect(Number.parseFloat(await css(own(page, 'row-interactive', 'layer'), 'transition-duration')), 'without delay').toBe(0);
    expect(await body.getAttribute('data-pressed')).not.toBeNull();
    await page.mouse.up();
    // A link is not pressed by Space; a body that is not pressable is pressed by nothing.
    expect(await own(page, 'link', 'body').evaluate((el: HTMLElement) => (el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, composed: true })), el.dataset.pressed))).toBeUndefined();
    expect(await own(page, 'plain', 'body').evaluate((el: HTMLElement) => (el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, button: 0 })), el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true })), el.dataset.pressed))).toBeUndefined();
    // A press on an action is not a press of the body beside or under it.
    const r = await box(own(page, 'tile-interactive', 'remove'));
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    await page.mouse.down();
    expect(await own(page, 'tile-interactive', 'body').getAttribute('data-pressed')).toBeNull();
    expect(await own(page, 'tile-interactive', 'remove').getAttribute('data-pressed')).not.toBeNull();
    await page.mouse.up();
  });

  test('FIT-16: a pressable body and an action answer a press as sys.behavior.pressed-feedback names — overlay paints the pressed tokens at once, ripple grows the pressed layer from the point of contact (the centre for a key), dim keeps the container color and takes the pressed opacity, none changes nothing; the ripple runs over motion.feedback-duration and appears whole where motion is reduced; m3-like is ripple, cupertino is dim and the default is overlay', async ({ page }) => {
    const fixtures = [fx('row', { name: 'brief.pdf', sizeText: '1 MB', interactive: true, ...WORDS }), fx('tile', { form: 'tile', name: 'brief.pdf', interactive: true, ...WORDS })];
    for (const reduced of [false, true]) {
      await mount(page, fixtures, { reducedMotion: reduced });
      const colors: Record<string, string> = { [T('pressed-opacity')]: '0.5' };
      for (const form of ['row', 'tile']) {
        colors[T(`${form}-pressed-container-color`)] = 'rgb(1, 2, 3)';
        colors[T(`${form}-pressed-action-container-color`)] = 'rgb(1, 2, 3)';
        colors[T(`${form}-pressed-action-icon-color`)] = 'rgb(4, 5, 6)';
        colors[T(`${form}-container-color`)] = 'rgb(9, 9, 9)';
        colors[T(`${form}-action-container-color`)] = 'rgb(9, 9, 9)';
      }
      await override(page, colors);
      // [what, the pressed element, the element that paints the container color, whether it is an action]
      const targets: [string, Locator, Locator, boolean][] = [
        ['a row’s body', own(page, 'row', 'body'), own(page, 'row', 'layer'), false],
        ['a tile’s body', own(page, 'tile', 'body'), own(page, 'tile', 'layer'), false],
        ['a row’s action', own(page, 'row', 'remove'), own(page, 'row', 'remove'), true],
        ['a tile’s action', own(page, 'tile', 'remove'), own(page, 'tile', 'remove'), true],
      ];
      for (const [name, target, container, action] of targets) {
        const press = (key: string | null) =>
          target.evaluate(
            (el, [k, inLayer]) => {
              const r = (inLayer ? el.querySelector('.layer')! : el).getBoundingClientRect();
              if (k === null) el.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + 4, clientY: r.top + 6, button: 0, pointerType: 'mouse', bubbles: true, composed: true }));
              else el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, composed: true }));
            },
            [key, !action] as const,
          );
        const release = async () => {
          await target.evaluate((el) => {
            el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true }));
            el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true, composed: true }));
          });
          await expect.poll(() => target.getAttribute('data-pressed'), { message: `${name}: the press ends` }).toBeNull();
          await expect(target.locator('.ripple')).toHaveCount(0);
          // At rest again before the next press: the way back from a state is a motion (FIT-23).
          await expect.poll(() => target.evaluate((el) => el.getAnimations({ subtree: true }).length), { message: `${name}: at rest` }).toBe(0);
        };
        const feedback = async (value: string) => override(page, { '--tanrei-sys-behavior-pressed-feedback': value });
        const opacity = async () => Number.parseFloat(await css(target, 'opacity'));
        // overlay (the default, and what an unknown name is): the pressed tokens on the whole container at once.
        for (const value of ['overlay', 'something-else']) {
          await feedback(value);
          await press(null);
          expect(await target.getAttribute('data-pressed'), name).toBe('overlay');
          sameColor(await painted(container, 'background-color'), [1, 2, 3, 255], `${name} overlay container`);
          if (action) {
            sameColor(await painted(target, 'color'), [4, 5, 6, 255], `${name} overlay glyph`);
            expect(await opacity()).toBe(0.5);
          }
          await expect(target.locator('.ripple')).toHaveCount(0);
          await release();
        }
        // ripple: the container color stays; the layer is the pressed color, from the point of contact.
        await feedback('ripple');
        await press(null);
        expect(await target.getAttribute('data-pressed')).toBe('ripple');
        sameColor(await painted(container, 'background-color'), [9, 9, 9, 255], `${name} ripple keeps the container color`);
        if (action) sameColor(await painted(target, 'color'), [4, 5, 6, 255], `${name} ripple: the glyph is still the pressed one`);
        const layer = target.locator('.ripple');
        await expect(layer).toHaveCount(1);
        sameColor(await painted(layer, 'background-color'), [1, 2, 3, 255], `${name} ripple layer`);
        const origin = await layer.evaluate((el) => [Number.parseFloat(el.style.getPropertyValue('--_x')), Number.parseFloat(el.style.getPropertyValue('--_y'))]);
        near(origin[0], 4, `${name}: from the point of contact`, 1.5);
        near(origin[1], 6, `${name}: from the point of contact`, 1.5);
        if (reduced) expect(await css(layer, 'animation-name'), 'whole where motion is reduced').toBe('none');
        else near(Number.parseFloat(await css(layer, 'animation-duration')) * 1000, await resolveToken(page, T('motion-feedback-duration'), 'duration'), 'motion.feedback-duration', 1);
        if (!action) expect(await layer.evaluate((el) => el.parentElement!.classList.contains('layer')), 'the body’s ripple is drawn in its layer, over the glyph or the picture and the texts').toBe(true);
        await release();
        await press('Enter');
        const centre = await target.locator('.ripple').evaluate((el) => [Number.parseFloat(el.style.getPropertyValue('--_x')), el.parentElement!.getBoundingClientRect().width / 2]);
        near(centre[0], centre[1], `${name}: from the centre for a key`, 1);
        await release();
        // dim: no layer, the container color stays, the pressed opacity on the whole part.
        await feedback('dim');
        await press(null);
        expect(await target.getAttribute('data-pressed')).toBe('dim');
        sameColor(await painted(container, 'background-color'), [9, 9, 9, 255], `${name} dim keeps the container color`);
        if (action) expect(await opacity()).toBe(0.5);
        await expect(target.locator('.ripple')).toHaveCount(0);
        await release();
        // none: nothing answers.
        await feedback('none');
        await expect.poll(opacity, { message: 'at rest again' }).toBe(1);
        await press(null);
        expect(await target.getAttribute('data-pressed')).toBe('none');
        sameColor(await painted(container, 'background-color'), [9, 9, 9, 255], `${name} none`);
        expect(await opacity()).toBe(1);
        await release();
      }
    }
    // What the systems name.
    for (const [system, expected] of [[undefined, 'overlay'], ['m3-like', 'ripple'], ['cupertino', 'dim']] as const) {
      await mount(page, fixtures, { system, reducedMotion: true });
      for (const target of [own(page, 'row', 'body'), own(page, 'tile', 'remove')]) {
        await target.evaluate((el) => el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 5, clientY: 5, button: 0, pointerType: 'mouse', bubbles: true, composed: true })));
        expect(await target.getAttribute('data-pressed'), `${system ?? 'the default'}`).toBe(expected);
        await target.evaluate((el) => el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true })));
      }
    }
  });

  test('FIT-17: the corners of a tile’s box, of a row’s picture, of the body’s layer and of the actions are eased by sys.shape.corner-smoothing through the shared rule — cupertino is continuous — and the keyboard focus of the body and of an action is drawn as sys.behavior.focus-style names: a ring, or a glow under the acme system', async ({ page }) => {
    const fixtures = [fx('row', { name: 'brief.png', sizeText: '1 MB', interactive: true, preview: true, previewSrc: PICTURE, ...WORDS }), fx('tile', { form: 'tile', name: 'brief.png', interactive: true, preview: true, previewSrc: PICTURE, ...WORDS })];
    await mount(page, fixtures);
    await start(page);
    const shaped = [own(page, 'tile', 'media'), own(page, 'row', 'media'), own(page, 'row', 'layer'), own(page, 'tile', 'layer'), own(page, 'row', 'body'), own(page, 'tile', 'body'), own(page, 'row', 'remove'), own(page, 'tile', 'remove'), own(page, 'tile', 'over')];
    for (const el of shaped) expect(await el.getAttribute('data-tanrei-shape')).not.toBeNull();
    const radius = async (el: Locator) => Number.parseFloat(await css(el, 'border-top-left-radius'));
    const rounds = await Promise.all(shaped.slice(0, 4).map(radius));
    near(rounds[0], await token(page, 'tile-container-shape'), 'tile.container.shape');
    near(rounds[1], await token(page, 'row-media-shape'), 'row.media.shape');
    near(rounds[2], await token(page, 'row-container-shape'), 'row.container.shape');
    await override(page, { '--tanrei-sys-shape-corner-smoothing': '0.6' });
    const curve = await css(shaped[0], 'corner-shape');
    for (const [index, el] of shaped.slice(0, 4).entries()) {
      if (curve && curve !== 'round') expect(await radius(el), `part ${index}: eased`).toBeGreaterThan(rounds[index]);
      else near(await radius(el), rounds[index], 'a quarter circle where the curve cannot be drawn');
    }
    // An action's shape is the full step: a pill is round whatever the smoothing.
    for (const action of [own(page, 'row', 'remove'), own(page, 'tile', 'remove')]) expect(await radius(action), 'a round action').toBeGreaterThanOrEqual((await box(action)).width / 2);
    await override(page, { '--tanrei-sys-shape-corner-smoothing': '0' });
    // focus-style: a ring under the default system.
    const targets = [own(page, 'row', 'body'), own(page, 'row', 'remove'), own(page, 'tile', 'body'), own(page, 'tile', 'remove')];
    for (const target of targets) {
      await page.locator('#start').focus();
      await tabTo(page, target);
      expect((await painted(target, 'outline-color'))[3], 'a ring').not.toBe(0);
      expect(await css(target, 'box-shadow', '::after')).toBe('none');
    }
    // The acme system names glow: a halo and no line.
    await acme(page, fixtures);
    await start(page);
    for (const target of targets) {
      await page.locator('#start').focus();
      await tabTo(page, target);
      expect((await painted(target, 'outline-color'))[3], 'no ring under glow').toBe(0);
      expect(await css(target, 'box-shadow', '::after')).not.toBe('none');
    }
    // cupertino names the continuous corner.
    await mount(page, fixtures, { system: 'cupertino' });
    expect(Number.parseFloat(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-shape-corner-smoothing')))).toBeGreaterThan(0);
    const continuous = await css(own(page, 'tile', 'media'), 'corner-shape');
    if (continuous) expect(continuous, 'the box’s corners are eased under cupertino').not.toBe('round');
  });

  test('FIT-18: the hit area of an action and of a pressable body reaches the minimum target on both axes without changing its visual size — the touch target for a coarse pointer — and no further toward a neighbour than half of what lies between them: a press on a part’s visible bounds is that part’s, on an action’s also where it lies over the body, and a press between two actions goes to the nearer one', async ({ page }) => {
    await mount(page, [
      ...spec.fixtures.filter((f) => ['row-error-retryable', 'row-error', 'tile-error-retryable'].includes(f.id)),
      fx('pressable', { name: 'a.pdf', status: 'error', errorText: 'Lost.', retryable: true, interactive: true, ...WORDS }),
      fx('small', { name: 'a', interactive: true, readOnly: true }),
      fx('tile-pressable', { form: 'tile', name: 'a.png', status: 'error', errorText: 'Lost.', retryable: true, interactive: true, ...WORDS }),
    ]);
    const id = 'row-error-retryable';
    const [retry, remove] = [own(page, id, 'retry'), own(page, id, 'remove')];
    const [size, pointer, touch, actionGap, inset] = [await token(page, 'action-size'), await resolveToken(page, '--tanrei-sys-target-pointer'), await resolveToken(page, '--tanrei-sys-target-touch'), await token(page, 'action-gap'), await token(page, 'tile-action-inset')];
    const target = (el: Locator) => el.evaluate((node) => [Number.parseFloat(getComputedStyle(node, '::before').width), Number.parseFloat(getComputedStyle(node, '::before').height), getComputedStyle(node, '::before').position] as const);
    const [w, h, position] = await target(remove);
    // Two actions side by side stand action.gap apart, or twice what the target exceeds their size by where that is more.
    const between = (goal: number) => Math.max(actionGap, 2 * Math.max(0, goal - size));
    near((await box(remove)).x - ((await box(retry)).x + (await box(retry)).width), between(pointer), 'the space between the two actions');
    near(w, Math.max(size, pointer), 'the pointer target along the row, whole: the action at the row’s end reaches toward the one before it, and never past the row’s end');
    near((await target(retry))[0], size + Math.max(0, pointer - size) / 2 + between(pointer) / 2, 'the action before it: half of what the target lacks toward the texts, and half the space toward the action after it');
    const twoLines = Number.parseFloat((await role(page, 'headline-typescale')).lineHeight) + Number.parseFloat((await role(page, 'supporting-text-typescale')).lineHeight);
    near(h, Math.min(Math.max(size, pointer), twoLines), 'the pointer target across the row: alone, nothing lies between it and a neighbour');
    expect(position).toBe('absolute');
    near((await box(remove)).width, size, 'the visual size is unchanged');
    near((await box(remove)).height, size, 'the visual size is unchanged');
    // A pressable body below the minimum target is reached likewise.
    const small = own(page, 'small', 'body');
    const [sw, sh] = await target(small);
    const sb = await box(small);
    expect(sh, 'a body lower than the target is reached across it').toBeGreaterThanOrEqual(Math.max(sb.height, pointer) - 0.6);
    expect(sw).toBeGreaterThanOrEqual(sb.width - 0.6);
    // The rule for a coarse pointer names the touch target, for the actions and for the body.
    const coarse = await host(page, id).evaluate((el) => {
      const found: string[] = [];
      for (const sheet of el.shadowRoot!.adoptedStyleSheets) for (const rule of sheet.cssRules) if (rule instanceof CSSMediaRule && rule.conditionText.includes('pointer: coarse')) found.push(rule.cssText);
      return found.join('\n');
    });
    expect(coarse).toContain('.action::before');
    expect(coarse).toContain('.body.pressable::before');
    expect(coarse).toContain('--tanrei-sys-target-touch');
    // However large the target, the two actions stand far enough apart that each reaches it, and the two hit areas still do not overlap.
    const large = touch + 40;
    await override(page, { '--tanrei-sys-target-pointer': `${large}px` });
    const [tw, th] = await target(remove);
    near((await box(remove)).x - ((await box(retry)).x + (await box(retry)).width), between(large), 'set apart by twice what the target exceeds their size by');
    near(tw, large, 'the whole target toward the action before it, and none past the row’s end');
    near((await target(retry))[0], size + (large - size) / 2 + between(large) / 2, 'at least the whole target: half the space toward the action after it');
    near(th, twoLines, 'held to the row’s two lines');
    const [, tileHeight] = await target(own(page, 'tile-error-retryable', 'remove'));
    near(tileHeight, size + 2 * inset, 'in a tile, held to the inset around it');
    await listen(page);
    const [a, b] = [await box(retry), await box(remove)];
    const y = a.y + a.height / 2;
    const middle = (a.x + a.width + b.x) / 2;
    for (const [x, type] of [[a.x + a.width - 1, 'retry'], [b.x + 1, 'remove'], [middle - 2, 'retry'], [middle + 2, 'remove']] as const) {
      await forget(page);
      await page.mouse.click(x, y);
      expect((await heard(page)).map((each) => each.type), `a press at ${x - middle} from the middle`).toEqual([type]);
    }
    // What a holder says lies between two file items is shared: half to each (the file upload gives it, FUP-54).
    const [upper, lower] = [await box(own(page, id, 'remove')), await box(own(page, 'row-error', 'remove'))];
    expect(lower.y).toBeGreaterThan(upper.y + upper.height);
    for (const [py, value] of [[upper.y + upper.height - 1, 'e'], [lower.y + 1, 'f']] as const) {
      await forget(page);
      await page.mouse.click(upper.x + upper.width / 2, py);
      expect((await heard(page)).map((each) => each.value), 'a press on an action’s visible bounds is that action’s').toEqual([value]);
    }
    // An action and the body beside it: a press on either's visible bounds is its own.
    for (const fixture of ['pressable', 'tile-pressable']) {
      // The large target set above spaces the actions widely, and a row stands its actions below its texts: in view first.
      await own(page, fixture, 'remove').scrollIntoViewIfNeeded();
      const [body, first, last] = [await box(own(page, fixture, fixture === 'pressable' ? 'text' : 'media')), await box(own(page, fixture, 'retry')), await box(own(page, fixture, 'remove'))];
      const presses: [number, number, string][] = [
        [first.x + 1, first.y + first.height / 2, 'retry'],
        [first.x + first.width / 2, first.y + 1, 'retry'],
        [first.x + first.width / 2, first.y + first.height - 1, 'retry'],
        [last.x + last.width - 1, last.y + last.height / 2, 'remove'],
        [last.x + last.width / 2, last.y + last.height - 1, 'remove'],
        [fixture === 'pressable' ? body.x + body.width - 1 : body.x + 3, fixture === 'pressable' ? body.y + body.height / 2 : body.y + body.height - 3, 'click'],
      ];
      for (const [x, py, type] of presses) {
        await forget(page);
        await page.mouse.click(x, py);
        expect((await heard(page)).map((each) => each.type), `${fixture}: a press at ${Math.round(x)}, ${Math.round(py)}`).toEqual([type]);
      }
    }
  });

  test('FIT-18: the hit area of the action at a file item’s end reaches no further than the item’s own end edge, in both directions and at 200 % text — it takes what it lacks toward the start, as far as half of what lies between it and another action or as what lies between it and the texts — so a file item that ends at the edge of a window 320 wide widens nothing and the page does not scroll sideways (FIT-24)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 1200 });
    const fixtures = spec.fixtures.filter((f) => ['row-format', 'row-error-retryable', 'tile-error-retryable'].includes(f.id));
    for (const [dir, percent] of [['ltr', 100], ['rtl', 100], ['ltr', 200], ['rtl', 200]] as const) {
      // A page with no gutter of its own: each row ends where the window does.
      await mount(page, fixtures, { lead: `<style>html { font-size: ${percent}%; } body, main { margin: 0 !important; padding: 0 !important; } main { display: block !important; } .stage { box-sizing: border-box; padding: 0 !important; margin: 0 !important; inline-size: 320px !important; } .stage > ${TAG}:not([data-tile]) { inline-size: auto !important; }</style>`, dir });
      await frames(page);
      const [size, actionGap, rowGap, pointer] = [await token(page, 'action-size'), await token(page, 'action-gap'), await token(page, 'row-container-gap'), await resolveToken(page, '--tanrei-sys-target-pointer')];
      const message = `${dir} at ${percent} %`;
      expect(await page.evaluate(() => [document.documentElement.scrollWidth, document.scrollingElement!.scrollLeft]), `${message}: the page does not scroll sideways`).toEqual([320, 0]);
      for (const id of fixtures.map((f) => f.id)) {
        expect(await host(page, id).evaluate((el) => el.scrollWidth - el.clientWidth), `${message}, ${id}: nothing reaches past the file item’s own box`).toBe(0);
        if (id.startsWith('tile')) continue;
        // The hit area, as the browser lays it out: [toward the start past the action, toward the end past it].
        const reach = (el: Locator) =>
          el.evaluate((node) => {
            const [style, action] = [getComputedStyle(node, '::before'), node.getBoundingClientRect()];
            const rtl = getComputedStyle(node).direction === 'rtl';
            const matrix = new DOMMatrixReadOnly(style.transform === 'none' ? undefined : style.transform);
            const left = Number.parseFloat(style.left) + matrix.m41;
            const right = action.width - left - Number.parseFloat(style.width);
            return rtl ? [-right, -left] : [-left, -right];
          });
        const remove = own(page, id, 'remove');
        const [start, end] = await reach(remove);
        near(end, 0, `${message}, ${id}: no further than the end edge`);
        const lacks = Math.max(0, pointer - size);
        const between = Math.max(actionGap, 2 * lacks);
        near(start, id === 'row-format' ? Math.min(lacks, rowGap) : Math.min(lacks, between / 2), `${message}, ${id}: what it lacks, toward the start`);
        const [a, itsHost] = [await box(remove), await box(host(page, id))];
        near(dir === 'ltr' ? a.x + a.width : a.x, dir === 'ltr' ? itsHost.x + itsHost.width : itsHost.x, `${message}, ${id}: the action at the end edge`);
        if (id === 'row-error-retryable') {
          // The action before it reaches half of what lies between them, and as far on its other side.
          const [retryStart, retryEnd] = await reach(own(page, id, 'retry'));
          near(retryEnd, between / 2, `${message}: retry toward remove, half the space between them`);
          near(retryStart, Math.min(lacks / 2, between / 2), `${message}: retry toward the texts`);
        }
      }
    }
  });

  test('FIT-19: a group named by name, in every form and whatever nameHidden says, read in order — the name; the format, the size, then the status or the error; while uploading, a progress bar named by the file whose value is progress, or busy; then the retry and remove actions, buttons whose names hold the file’s name in the product’s sentence and that carry no description; a pressable body is a button or a link named by name and described by the second line; held by a file upload it is an item of that list in the group’s place; the glyph, the picture and the marks are kept from assistive technology, and nothing is announced', async ({ page, browserName }) => {
    await mountSpec(page, 'row-format', 'row-uploading', 'row-uploading-indeterminate', 'row-done', 'row-error-retryable', 'row-interactive', 'row-link-new', 'tile-name-hidden', 'tile-uploading', 'tile-error-retryable', 'row-read-only');
    // Each is one group, named by its name, and reads in this order.
    const read = (id: string) =>
      host(page, id).evaluate((el) => {
        const out: string[] = [`${el.getAttribute('role')}:${el.getAttribute('aria-label')}`];
        const walk = (node: Node) => {
          if (node instanceof Element && node.getAttribute('aria-hidden') === 'true') return;
          if (node instanceof HTMLImageElement) out.push('img');
          else if (node instanceof Element && node.matches('button.action')) out.push(`button:${node.getAttribute('aria-label')}(${node.getAttribute('aria-description')})`);
          else if (node instanceof Element && node.matches('.body.pressable')) out.push(`${node.localName === 'a' ? 'link' : 'button'}:${node.getAttribute('aria-label')}(${node.getAttribute('aria-description')})`);
          else if (node instanceof Element && node.getAttribute('role') === 'progressbar') out.push(`progressbar:${node.getAttribute('aria-label')}`);
          else if (node.nodeType === Node.TEXT_NODE && node.textContent!.trim()) out.push(node.textContent!.trim());
          else for (const child of node.childNodes) walk(child);
        };
        walk(el.shadowRoot!);
        return out.join(' | ');
      });
    expect(await read('row-format')).toBe('group:brief.pdf | brief.pdf | PDF | 820 KB | Waiting | button:Remove brief.pdf(null)');
    expect(await read('row-uploading')).toBe('group:floor-plan.png | floor-plan.png | 3.4 MB | Uploading | progressbar:floor-plan.png | button:Remove floor-plan.png(null)');
    expect(await read('row-done')).toBe('group:contract.pdf | contract.pdf | 2.0 MB | Uploaded | button:Remove contract.pdf(null)');
    expect(await read('row-error-retryable')).toBe('group:site-photo.png | site-photo.png | 6.8 MB | The connection was lost. | button:Retry site-photo.png(null) | button:Remove site-photo.png(null)');
    expect(await read('row-interactive')).toBe('group:floor-plan.png | button:floor-plan.png(3.4 MB) | button:Remove floor-plan.png(null)');
    expect(await read('row-link-new')).toBe('group:contract.pdf | link:contract.pdf(2.0 MB, opens in a new tab) | button:Remove contract.pdf(null)');
    expect(await read('tile-name-hidden'), 'whatever nameHidden says').toBe('group:floor-plan.png | floor-plan.png | button:Remove floor-plan.png(null)');
    expect(await read('tile-uploading')).toBe('group:floor-plan.png | floor-plan.png | Uploading | progressbar:floor-plan.png | button:Remove floor-plan.png(null)');
    expect(await read('tile-error-retryable')).toBe('group:site-photo.png | site-photo.png | The connection was lost. | button:Retry site-photo.png(null) | button:Remove site-photo.png(null)');
    expect(await read('row-read-only')).toBe('group:contract.pdf | contract.pdf | 2.0 MB | Uploaded');
    for (const f of ['row-format', 'tile-name-hidden', 'tile-error-retryable']) await expect(stage(page, f).getByRole('group', { name: String(spec.fixtures.find((each) => each.id === f)!.props.name), exact: true })).toHaveCount(1);
    // The bar: named by the file, its value a share of 0 to 1, or busy.
    expect(await own(page, 'row-uploading', 'bar').evaluate((el) => ['role', 'aria-label', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-busy'].map((name) => el.getAttribute(name)))).toEqual(['progressbar', 'floor-plan.png', '0', '1', '0.4', null]);
    expect(await own(page, 'row-uploading-indeterminate', 'bar').evaluate((el) => ['aria-label', 'aria-valuenow', 'aria-busy'].map((name) => el.getAttribute(name)))).toEqual(['survey.pdf', null, 'true']);
    // The glyph, the picture, the status mark and the mark of a new context are kept from assistive technology.
    for (const [id, name] of [['row-format', 'media'], ['row-interactive', 'preview'], ['row-done', 'mark'], ['row-link-new', 'opens'], ['tile-name-hidden', 'preview'], ['tile-name-hidden', 'icon']] as const) expect(await own(page, id, name).evaluate((el) => el.closest('[aria-hidden="true"]') !== null), `${id} ${name}`).toBe(true);
    await expect(page.getByRole('img')).toHaveCount(0);
    // No live region: nothing is announced, not an appearance and not a change of status or of progress.
    const live_ = () => page.evaluate(() => [...document.querySelectorAll('tanrei-file-item')].flatMap((el) => [el, ...el.shadowRoot!.querySelectorAll('*')]).filter((node) => node.hasAttribute('aria-live') || ['status', 'alert', 'log', 'marquee', 'timer'].includes(node.getAttribute('role') ?? '') || node.localName === 'output').length);
    expect(await live_()).toBe(0);
    await set(host(page, 'row-uploading'), { progress: 0.9 });
    await set(host(page, 'row-uploading'), { status: 'error', errorText: 'Lost.' });
    await set(host(page, 'row-format'), { status: 'done', statusText: 'Uploaded' });
    expect(await live_()).toBe(0);
    // A role or a name the product wrote is the product's: the file item leaves it.
    await mount(page, [{ id: 'given-role', props: {}, content: '' }]);
    await page.evaluate(() => {
      document.querySelector('main')!.insertAdjacentHTML(
        'beforeend',
        `<div class="stage" data-fixture="own-role"><tanrei-file-item role="row" aria-label="A row of the product" name="kept.pdf" remove-label="Remove {name}"></tanrei-file-item></div>
         <div class="stage" data-fixture="held"><tanrei-file-upload label="Attachments" rows="given" multiple remove-label="Remove {name}" retry-label="Retry {name}"><tanrei-button slot="trigger">Choose files</tanrei-button>
           <tanrei-file-item value="a" name="brief.pdf" size-text="820 KB" status-text="Waiting"></tanrei-file-item>
           <tanrei-file-item value="b" name="floor-plan.png" size-text="3.4 MB" status="uploading" status-text="Uploading" progress="0.4"></tanrei-file-item>
           <tanrei-file-item value="e" name="site-photo.png" size-text="6.8 MB" status="error" error-text="The connection was lost." retryable interactive></tanrei-file-item>
         </tanrei-file-upload></div>`,
      );
    });
    await expect.poll(() => page.locator('[data-fixture="held"] tanrei-file-item').first().getAttribute('role')).toBe('listitem');
    expect(await page.locator('[data-fixture="own-role"] tanrei-file-item').evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label')])).toEqual(['row', 'A row of the product']);
    // Held by a file upload: an item of its list in the group's place — by the upload's word, through no prop or attribute of its own.
    const items = page.locator('[data-fixture="held"] tanrei-file-item');
    expect(await items.evaluateAll((all) => all.map((el) => [el.getAttribute('role'), el.hasAttribute('aria-label'), 'listItem' in el, el.hasAttribute('list-item')]))).toEqual(Array(3).fill(['listitem', false, false, false]));
    await expect(stage(page, 'held').getByRole('listitem')).toHaveCount(3);
    await expect(stage(page, 'held').getByRole('group', { name: 'brief.pdf' })).toHaveCount(0);
    // Taken out of the upload and put alone: a group named by its name again.
    await page.evaluate(() => document.querySelector('[data-fixture="own-role"]')!.append(document.querySelector('[data-fixture="held"] tanrei-file-item[value="a"]')!));
    await expect.poll(() => page.locator('[data-fixture="own-role"] tanrei-file-item[value="a"]').evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label')])).toEqual(['group', 'brief.pdf']);
    await page.evaluate(() => document.querySelector('[data-fixture="held"] tanrei-file-upload')!.prepend(document.querySelector('[data-fixture="own-role"] tanrei-file-item[value="a"]')!));
    await expect.poll(() => page.locator('[data-fixture="held"] tanrei-file-item[value="a"]').evaluate((el) => [el.getAttribute('role'), el.hasAttribute('aria-label')])).toEqual(['listitem', false]);
    // What the browser computes for assistive technology (Chromium's accessibility tree).
    if (browserName === 'chromium') {
      await mountSpec(page, 'row-format', 'row-uploading', 'row-uploading-indeterminate', 'row-error-retryable', 'row-interactive', 'row-link-new', 'tile-name-hidden', 'tile-uploading');
      await page.evaluate(() => {
        document.querySelector('main')!.insertAdjacentHTML(
          'beforeend',
          `<div class="stage" data-fixture="held"><tanrei-file-upload label="Attachments" rows="given" multiple remove-label="Remove {name}" retry-label="Retry {name}"><tanrei-button slot="trigger">Choose files</tanrei-button>
             <tanrei-file-item value="a" name="held.pdf" size-text="820 KB" status-text="Waiting"></tanrei-file-item>
             <tanrei-file-item value="e" name="held-photo.png" size-text="6.8 MB" status="error" error-text="The connection was lost." retryable interactive></tanrei-file-item>
           </tanrei-file-upload></div>`,
        );
      });
      await expect.poll(() => page.locator('[data-fixture="held"] tanrei-file-item').last().getAttribute('role')).toBe('listitem');
      await frames(page);
      const client = await page.context().newCDPSession(page);
      await client.send('Accessibility.enable');
      const { nodes } = await client.send('Accessibility.getFullAXTree');
      const byId = new Map(nodes.map((node) => [node.nodeId, node]));
      const tree = (nodeId: string): string[] => {
        const node = byId.get(nodeId)!;
        const below = (node.childIds ?? []).flatMap(tree);
        const itsRole = String(node.role?.value);
        if (node.ignored || ['generic', 'InlineTextBox', 'none'].includes(itsRole)) return below;
        // The white space between two texts of the second line is no text of its own.
        if (itsRole === 'StaticText') return String(node.name?.value).trim() ? [String(node.name?.value).trim()] : [];
        const value = node.properties?.find((property) => property.name === 'busy')?.value?.value ? ' busy' : node.value?.value !== undefined ? ` ${Math.round(Number(node.value.value) * 100) / 100}` : '';
        return [`${itsRole}:${node.name?.value ?? ''}${node.description?.value ? ` (${node.description.value})` : ''}${value}`, ...below];
      };
      const groupOf = (name: string) => {
        const found = nodes.filter((node) => node.role?.value === 'group' && node.name?.value === name && !node.ignored);
        expect(found.length, `one group named ${name}`).toBe(1);
        return tree(found[0].nodeId);
      };
      expect(groupOf('brief.pdf')).toEqual(['group:brief.pdf', 'brief.pdf', 'PDF', '820 KB', 'Waiting', 'button:Remove brief.pdf']);
      expect(groupOf('site-photo.png')).toEqual(['group:site-photo.png', 'site-photo.png', '6.8 MB', 'The connection was lost.', 'button:Retry site-photo.png', 'button:Remove site-photo.png']);
      expect(groupOf('survey.pdf')).toEqual(['group:survey.pdf', 'survey.pdf', '1.1 MB', 'Uploading', 'progressbar:survey.pdf busy', 'button:Remove survey.pdf']);
      // A link's own texts are read inside it, where a button's are its name alone.
      expect(groupOf('contract.pdf')).toEqual(['group:contract.pdf', 'link:contract.pdf (2.0 MB, opens in a new tab)', 'contract.pdf', '2.0 MB', 'button:Remove contract.pdf']);
      // Three fixtures are named floor-plan.png: the uploading row, the pressable row, and the two tiles.
      const plans = nodes.filter((node) => node.role?.value === 'group' && node.name?.value === 'floor-plan.png' && !node.ignored).map((node) => tree(node.nodeId));
      expect(plans).toEqual([
        ['group:floor-plan.png', 'floor-plan.png', '3.4 MB', 'Uploading', 'progressbar:floor-plan.png 0.4', 'button:Remove floor-plan.png'],
        // A pressable body's own texts are in the tree inside it; its name and its description are what is announced.
        ['group:floor-plan.png', 'button:floor-plan.png (3.4 MB)', 'floor-plan.png', '3.4 MB', 'button:Remove floor-plan.png'],
        ['group:floor-plan.png', 'floor-plan.png', 'button:Remove floor-plan.png'],
        ['group:floor-plan.png', 'floor-plan.png', 'Uploading', 'progressbar:floor-plan.png 0.4', 'button:Remove floor-plan.png'],
      ]);
      // In the upload: the list holds two items, each in the group's place, with what the upload gave every item.
      const listNode = nodes.find((node) => node.role?.value === 'list' && node.name?.value === 'Attachments')!;
      expect(listNode, 'the upload’s list').toBeTruthy();
      const direct = (listNode.childIds ?? []).flatMap(function items_(child): typeof nodes {
        const node = byId.get(child)!;
        return node.ignored || ['generic', 'none'].includes(String(node.role?.value)) ? (node.childIds ?? []).flatMap(items_) : [node];
      });
      expect(direct.map((node) => tree(node.nodeId))).toEqual([
        ['listitem:', 'held.pdf', '820 KB', 'Waiting', 'button:Remove held.pdf'],
        ['listitem:', 'button:held-photo.png (6.8 MB, The connection was lost.)', 'held-photo.png', '6.8 MB', 'The connection was lost.', 'button:Retry held-photo.png', 'button:Remove held-photo.png'],
      ]);
      expect(nodes.filter((node) => node.role?.value === 'group' && String(node.name?.value).startsWith('held')).length, 'no group in the item’s place').toBe(0);
      expect(nodes.filter((node) => ['image', 'img'].includes(String(node.role?.value)) && !node.ignored).length, 'no picture and no glyph is exposed').toBe(0);
    }
  });

  test('FIT-20: removeLabel and retryLabel are the instance’s, else the product’s words, else nothing — an unnamed action is still drawn and works, and the missing word is reported once per page; the place {name} is filled by the file’s name, and a word without it is reported; every other text is the product’s alone, and no word is built from a media type, an ending or a number', async ({ page }) => {
    const warnings = logged(page);
    await mount(page, [
      ...spec.fixtures.filter((f) => f.id === 'row-without-words'),
      fx('second', { name: 'more.pdf', status: 'error', errorText: 'Lost.', retryable: true }),
      fx('own', { name: 'site.png', status: 'error', errorText: 'Lost.', retryable: true, removeLabel: '{name}: take away', retryLabel: 'Once more' }),
      fx('quiet', { name: 'archive.tar.gz', mediaType: 'application/gzip', status: 'uploading', progress: 0.42, readOnly: true }),
      fx('tile', { form: 'tile', name: 'IMG_0412.HEIC', preview: true, status: 'uploading', readOnly: true }),
      fx('no-retry', { name: 'kept.pdf' }),
    ]);
    await turn(page);
    const id = 'row-without-words';
    const [retry, remove] = [own(page, id, 'retry'), own(page, id, 'remove')];
    // Without the words: drawn, working, unnamed — and the file's name is not said as a description either.
    for (const action of [retry, remove]) {
      await expect(action).toBeVisible();
      expect(await action.getAttribute('aria-label')).toBeNull();
      expect(await action.getAttribute('aria-description')).toBeNull();
      expect(await action.getAttribute('title')).toBeNull();
    }
    await listen(page);
    await remove.click();
    await retry.click();
    expect(await heard(page)).toEqual([
      { type: 'remove', value: 'e' },
      { type: 'retry', value: 'e' },
    ]);
    expect(await missingWords(page)).toEqual(['removeLabel', 'retryLabel']);
    for (const key of ['remove-label', 'retry-label']) expect(warnings.filter((text) => text.includes('FIT-20') && text.includes(`${key} is empty`)).length, `${key}: reported once per page, though three file items lack it`).toBe(1);
    // No word of its own: every text it draws or exposes is one the product wrote.
    for (const fixture of ['quiet', 'tile', id]) {
      const said = await host(page, fixture).evaluate((el) => {
        const root = el.shadowRoot!;
        const texts: string[] = [];
        const walk = (node: Node) => {
          if (node instanceof Element && (node.getAttribute('aria-hidden') === 'true' || node.matches('.ink'))) return;
          if (node.nodeType === Node.TEXT_NODE && node.textContent!.trim()) texts.push(node.textContent!.trim());
          for (const child of node.childNodes) walk(child);
        };
        walk(root);
        const exposed = [...root.querySelectorAll('*')].flatMap((node) => ['aria-label', 'aria-description', 'aria-valuetext', 'title', 'alt', 'placeholder'].map((name) => node.getAttribute(name)).filter((value): value is string => !!value));
        return [...texts, ...exposed];
      });
      const name = await host(page, fixture).getAttribute('name');
      expect(said.filter((text) => text !== name), `${fixture}: nothing but the name is said — no format, no size and no share in words`).toEqual([]);
    }
    await expect(own(page, 'quiet', 'supporting'), 'no second line is made of the media type or the progress').toHaveCount(0);
    expect(await own(page, 'quiet', 'bar').evaluate((el) => [el.getAttribute('aria-valuenow'), el.getAttribute('aria-valuetext')])).toEqual(['0.42', null]);
    // The product's words.
    await setWords(page, WORDS);
    await expect(remove).toHaveAttribute('aria-label', 'Remove site-photo.png');
    await expect(retry).toHaveAttribute('aria-label', 'Retry site-photo.png');
    await expect(own(page, 'second', 'remove')).toHaveAttribute('aria-label', 'Remove more.pdf');
    await expect(own(page, 'no-retry', 'remove')).toHaveAttribute('aria-label', 'Remove kept.pdf');
    // The order of the words is the product's language's; the place is filled wherever it stands.
    await setWords(page, { removeLabel: '{name}を削除', retryLabel: '{name}を再試行' });
    await expect(remove).toHaveAttribute('aria-label', 'site-photo.pngを削除');
    await expect(retry).toHaveAttribute('aria-label', 'site-photo.pngを再試行');
    await setWords(page, WORDS);
    // The instance's own win.
    await expect(own(page, 'own', 'remove')).toHaveAttribute('aria-label', 'site.png: take away');
    // A word without the place names every file's action alike: used as it is written, and reported.
    await expect(own(page, 'own', 'retry')).toHaveAttribute('aria-label', 'Once more');
    expect(warnings.filter((text) => text.includes('FIT-20') && text.includes('retryLabel has no place {name}')).length, 'a word without its place is reported').toBe(1);
    await set(host(page, id), { removeLabel: 'Delete {name}' });
    await expect(remove).toHaveAttribute('aria-label', 'Delete site-photo.png');
    await set(host(page, id), { removeLabel: '' });
    await expect(remove).toHaveAttribute('aria-label', 'Remove site-photo.png');
    // A word that is not needed is not missed: a read-only file item names no action, and one that cannot be retried no retry.
    await mount(page, [fx('read-only', { name: 'kept.pdf', status: 'error', errorText: 'Lost.', retryable: true, readOnly: true }), fx('no-retry', { name: 'kept.pdf', removeLabel: 'Remove {name}' })]);
    await turn(page);
    expect(await missingWords(page)).toEqual([]);
  });

  test('FIT-21: disabled renders each action from the disabled tokens of its form — each keeps the container it has at rest, none in a row and the opaque disc in a tile, and only its glyph fades — and disables it; makes the body not pressable and not focusable, with no hover, focus or press answer; and emits neither click, remove nor retry — while the name, the second line, the glyph, the picture, the mark and the bar stay as they are and readable', async ({ page }) => {
    await mount(page, [
      ...spec.fixtures.filter((f) => ['row-disabled', 'row-error-retryable', 'tile-disabled', 'tile-rtl'].includes(f.id)),
      fx('pressable', { name: 'floor-plan.png', sizeText: '3.4 MB', status: 'uploading', statusText: 'Uploading', progress: 0.4, interactive: true, preview: true, previewSrc: PICTURE, disabled: true, ...WORDS }),
      fx('pressable-on', { name: 'floor-plan.png', sizeText: '3.4 MB', status: 'uploading', statusText: 'Uploading', progress: 0.4, interactive: true, preview: true, previewSrc: PICTURE, ...WORDS }),
      fx('tile-pressable', { form: 'tile', name: 'floor-plan.png', interactive: true, disabled: true, ...WORDS }),
    ]);
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<button id="start">start</button>'));
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('beforeend', '<button id="end">end</button>'));
    // The disabled tokens of each form.
    for (const [form, id] of [['row', 'row-disabled'], ['tile', 'tile-disabled']] as const) {
      for (const name of ['retry', 'remove'] as const) {
        const action = own(page, id, name);
        await expect(action, `${id} ${name}`).toBeDisabled();
        await isColor(page, action, 'background-color', `${form}-disabled-action-container-color`, `${form}: the disabled action container`);
        await isColor(page, action, 'color', `${form}-disabled-action-icon-color`, `${form}: the disabled action glyph`);
        near(Number.parseFloat(await css(action, 'opacity')), Number.parseFloat(await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n), T('disabled-opacity'))), 'disabled.opacity', 0.01);
        expect(await css(action, 'cursor')).toBe('default');
      }
    }
    // A row's disabled action grows no ground, as an enabled one has none: a quiet icon-only button stays quiet when disabled…
    for (const name of ['retry', 'remove'] as const) expect((await painted(own(page, 'row-disabled', name), 'background-color'))[3], `a row’s disabled ${name} has no ground`).toBe(0);
    expect((await painted(own(page, 'row-error-retryable', 'remove'), 'background-color'))[3]).toBe(0);
    expect((await painted(own(page, 'row-disabled', 'remove'), 'color')).join(), 'its glyph fades').not.toBe((await painted(own(page, 'row-error-retryable', 'remove'), 'color')).join());
    // …and a tile's keeps its opaque disc, so that it is read over any picture.
    const tileDisc = await painted(own(page, 'tile-disabled', 'remove'), 'background-color');
    expect(tileDisc[3]).toBe(255);
    sameColor(tileDisc, await painted(own(page, 'tile-rtl', 'remove'), 'background-color'), 'a tile’s disabled disc is its resting disc');
    expect((await painted(own(page, 'tile-disabled', 'remove'), 'color')).join()).not.toBe((await painted(own(page, 'tile-rtl', 'remove'), 'color')).join());
    // What the file item shows stays as it is, and readable.
    for (const [off, on] of [['row-disabled', 'row-error-retryable'], ['tile-disabled', 'tile-rtl'], ['pressable', 'pressable-on']] as const) {
      for (const name of ['headline', 'supporting', 'icon'] as const) expect(await painted(own(page, off, name), 'color'), `${off} ${name}`).toEqual(await painted(own(page, on, name), 'color'));
      expect(await css(own(page, off, 'item'), 'opacity')).toBe('1');
      expect(await css(own(page, off, 'body'), 'opacity')).toBe('1');
      expect(await nameText(page, off)).toBe(await host(page, on).getAttribute('name'));
      await expect(own(page, off, 'supporting')).toHaveText((await own(page, on, 'supporting').textContent())!);
    }
    for (const id of ['row-disabled', 'tile-disabled']) {
      await expect(own(page, id, 'mark'), 'the status mark stays in its color').toHaveText('error');
      await isColor(page, own(page, id, 'mark'), 'color', 'error-icon-color');
    }
    await expect(own(page, 'tile-disabled', 'preview'), 'the picture stays').toHaveAttribute('data-drawn', '');
    expect(await css(own(page, 'tile-disabled', 'preview'), 'opacity')).toBe('1');
    await expect(own(page, 'pressable', 'bar'), 'the bar stays').toHaveCount(1);
    await isColor(page, own(page, 'pressable', 'bar').locator('.bar > .indicator'), 'background-color', 'progress-indicator-color');
    await expect(stage(page, 'row-disabled').getByRole('group', { name: 'site-photo.png', exact: true })).toHaveCount(1);
    expect(await host(page, 'row-disabled').evaluate((el) => [el.hasAttribute('aria-disabled'), el.hasAttribute('aria-hidden'), el.hasAttribute('inert')]), 'the group itself is not disabled: what was chosen is still read').toEqual([false, false, false]);
    // The body: a disabled button — not pressable, not focusable, and answering nothing.
    for (const id of ['pressable', 'tile-pressable']) {
      const body = own(page, id, 'body');
      await expect(body).toBeDisabled();
      expect(await css(body, 'cursor')).toBe('default');
      const b = await box(id === 'pressable' ? own(page, id, 'headline') : own(page, id, 'media'));
      const resting = await painted(own(page, id, 'layer'), 'background-color');
      await page.mouse.move(b.x + 6, b.y + b.height - 6);
      await frames(page);
      expect(await painted(own(page, id, 'layer'), 'background-color'), `${id}: no hover answer`).toEqual(resting);
      await page.mouse.down();
      expect(await body.getAttribute('data-pressed'), 'no press answer').toBeNull();
      expect(await painted(own(page, id, 'layer'), 'background-color')).toEqual(resting);
      await page.mouse.up();
      expect(await body.evaluate((el: HTMLElement) => (el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true })), el.dataset.pressed))).toBeUndefined();
    }
    // Nothing is emitted.
    await listen(page);
    for (const id of ['row-disabled', 'tile-disabled', 'pressable', 'tile-pressable']) {
      for (const name of ['retry', 'remove', 'body'] as const) {
        const target = own(page, id, name);
        if (!(await target.count())) continue;
        await target.click({ force: true });
        await target.evaluate((el: HTMLElement) => el.click());
        await target.dispatchEvent('click');
      }
    }
    await turn(page);
    expect(await heard(page)).toEqual([]);
    // Nothing of a disabled file item is a stop.
    await page.evaluate(() => {
      const off = document.querySelector('[data-fixture="row-disabled"]')!;
      off.before(document.querySelector('#start')!);
      off.after(document.querySelector('#end')!);
    });
    await page.locator('#start').focus();
    await tab(page);
    expect(await focused(page), 'nothing of a disabled file item is a stop').toBe('button');
    expect(await page.evaluate(() => document.activeElement!.id)).toBe('end');
    expect(await page.locator('tanrei-file-item[disabled]').evaluateAll((items) => items.flatMap((el) => [...el.shadowRoot!.querySelectorAll<HTMLElement>('button, a, [tabindex]')]).filter((node) => node.tabIndex >= 0 && !(node as HTMLButtonElement).disabled).length)).toBe(0);
    // Given back: the actions and the body answer again.
    await set(host(page, 'pressable'), { disabled: false });
    await expect(own(page, 'pressable', 'remove')).toBeEnabled();
    await own(page, 'pressable', 'body').click();
    await own(page, 'pressable', 'remove').click();
    expect((await heard(page)).map((each) => each.type)).toEqual(['click', 'remove']);
  });

  test('FIT-22: readOnly draws neither the remove action nor the retry action and keeps no room for them — a row’s texts reach its end edge — and emits neither remove nor retry; everything else holds: the status, the bar and the error are drawn, and the body is pressable where interactive or href makes it so', async ({ page }) => {
    await mount(page, [
      ...spec.fixtures.filter((f) => ['row-read-only', 'row-done', 'row-link', 'tile-read-only', 'tile-preview'].includes(f.id)),
      fx('failed', { name: 'site-photo.png', sizeText: '6.8 MB', status: 'error', errorText: 'The connection was lost.', retryable: true, readOnly: true }),
      fx('sending', { name: 'floor-plan.png', sizeText: '3.4 MB', status: 'uploading', statusText: 'Uploading', progress: 0.4, readOnly: true }),
      fx('pressable', { name: 'floor-plan.png', sizeText: '3.4 MB', interactive: true, readOnly: true }),
    ]);
    await start(page);
    for (const id of ['row-read-only', 'row-link', 'tile-read-only', 'failed', 'sending', 'pressable']) {
      await expect(own(page, id, 'end'), `${id}: no actions, and no place for them`).toHaveCount(0);
      expect(await host(page, id).evaluate((el) => el.shadowRoot!.querySelectorAll('.action, .end').length)).toBe(0);
    }
    // No room: a row's texts reach its end edge.
    for (const id of ['row-read-only', 'failed', 'sending']) {
      const [whole, text] = [await box(host(page, id)), await box(own(page, id, 'text'))];
      near(text.x + text.width, whole.x + whole.width, `${id}: the texts reach the end edge`);
    }
    expect((await box(own(page, 'row-read-only', 'text'))).width).toBeGreaterThan((await box(own(page, 'row-done', 'text'))).width + (await token(page, 'action-size')));
    const [bar, text] = [await box(own(page, 'sending', 'bar')), await box(own(page, 'sending', 'text'))];
    near(bar.x + bar.width, text.x + text.width, 'the bar is as wide as the texts, to the end edge');
    near(bar.x, text.x, 'the bar begins where the texts begin');
    // A read-only tile is the box and its texts.
    near((await box(host(page, 'tile-read-only'))).width, (await box(host(page, 'tile-preview'))).width, 'a tile’s box is the same');
    // Everything else holds: the status, the mark, the bar and the error.
    await expect(own(page, 'row-read-only', 'mark')).toHaveText('check_circle');
    await expect(own(page, 'row-read-only', 'supporting')).toContainText('Uploaded');
    await expect(own(page, 'failed', 'supporting')).toContainText('The connection was lost.');
    await isColor(page, own(page, 'failed', 'supporting'), 'color', 'error-supporting-text-color');
    await expect(own(page, 'sending', 'bar')).toHaveAttribute('aria-valuenow', '0.4');
    // Neither event can be emitted; the body is pressable where interactive or href says so.
    await listen(page);
    await own(page, 'pressable', 'body').click();
    await own(page, 'failed', 'body').click();
    expect(await heard(page)).toEqual([{ type: 'click', value: 'pressable', cancelable: true, native: false }]);
    expect(await own(page, 'row-link', 'body').evaluate((el) => [el.localName, el.getAttribute('href')])).toEqual(['a', '/files/contract.pdf']);
    expect(await own(page, 'tile-read-only', 'body').evaluate((el) => [el.localName, el.getAttribute('href')])).toEqual(['a', '/files/floor-plan.png']);
    const whole = await box(host(page, 'row-link'));
    const layer = await box(own(page, 'row-link', 'layer'));
    near(layer.x + layer.width - (whole.x + whole.width), await token(page, 'row-container-outset'), 'a read-only row’s layer is its texts’ bounds grown by the outset');
    // The stops: a read-only file item that is not pressable is none at all.
    await page.locator('#start').focus();
    const stops: string[] = [];
    for (let i = 0; i < 5; i++) {
      await tab(page);
      stops.push(await focused(page));
    }
    expect(stops).toEqual(['tanrei-file-item[d] button.action.remove', 'tanrei-file-item[d] a.body.pressable', 'tanrei-file-item[b] button.action.remove', 'tanrei-file-item[b] a.body.pressable', 'tanrei-file-item[pressable] button.body.pressable']);
    // readOnly set while it is shown: the actions go, and come back.
    await set(host(page, 'row-done'), { readOnly: true });
    await expect(own(page, 'row-done', 'end')).toHaveCount(0);
    await set(host(page, 'row-done'), { readOnly: false });
    await expect(own(page, 'row-done', 'remove')).toHaveCount(1);
  });

  test('FIT-23: the colors of the body’s layer and of an action change over motion.state-duration with motion.state-easing, and at once where motion is reduced; a change of form, of status, of a text, of the glyph or of the picture is drawn at once, with no motion of the file item’s own; a picture is the browser’s image element', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => ['row-interactive', 'tile-interactive', 'row-error-retryable'].includes(f.id)), fx('changing', { name: 'brief.pdf', sizeText: '1 MB', ...WORDS })]);
    const duration = await resolveToken(page, T('motion-state-duration'), 'duration');
    expect(duration).toBeGreaterThan(0);
    const easing = await page.evaluate((name) => {
      const probe = document.createElement('div');
      probe.style.cssText = `transition-timing-function: var(${name})`;
      document.body.append(probe);
      const value = getComputedStyle(probe).transitionTimingFunction;
      probe.remove();
      return value;
    }, T('motion-state-easing'));
    const moving: [string, Locator, string[]][] = [
      ['a row’s layer', own(page, 'row-interactive', 'layer'), ['background-color']],
      ['a tile’s layer', own(page, 'tile-interactive', 'layer'), ['background-color']],
      ['a row’s action', own(page, 'row-error-retryable', 'remove'), ['background-color', 'color', 'opacity']],
      ['a tile’s action', own(page, 'tile-interactive', 'remove'), ['background-color', 'color', 'opacity']],
    ];
    for (const [name, target, properties] of moving) {
      const moves = await target.evaluate((el) => ({ property: getComputedStyle(el).transitionProperty, duration: getComputedStyle(el).transitionDuration, easing: getComputedStyle(el).transitionTimingFunction }));
      for (const property of properties) expect(moves.property, `${name}: ${property}`).toContain(property);
      expect(moves.property).not.toContain('all');
      near(Number.parseFloat(moves.duration) * 1000, duration, `${name}: motion.state-duration`, 1);
      expect(moves.easing.startsWith(easing), `${name}: motion.state-easing (${moves.easing})`).toBe(true);
    }
    // The change is a motion: hovered, the layer is on its way for a moment.
    const b = await box(own(page, 'row-interactive', 'headline'));
    await page.mouse.move(b.x + 5, b.y + 5);
    await expect.poll(async () => (await painted(own(page, 'row-interactive', 'layer'), 'background-color')).join(), { message: 'it arrives at the hovered layer' }).toBe((await tokenColor(page, 'row-hovered-container-color')).join());
    await page.mouse.move(2, 2);
    // Nothing else of the file item has a motion: no layout property, no text, no glyph, no picture.
    for (const id of ['row-interactive', 'tile-interactive']) {
      for (const name of ['item', 'body', 'media', 'icon', 'preview', 'headline', 'supporting', 'text', 'end'] as const) {
        if (!(await own(page, id, name).count())) continue;
        expect(Number.parseFloat(await css(own(page, id, name), 'transition-duration')) === 0 || (await css(own(page, id, name), 'transition-property')) === 'none', `${id} ${name}: no motion`).toBe(true);
        expect(await css(own(page, id, name), 'animation-name')).toBe('none');
      }
      expect(await css(host(page, id), 'transition-duration')).toBe('0s');
    }
    // A change of form, of status, of a text, of the glyph and of the picture: drawn at once.
    const item = host(page, 'changing');
    const still = () => item.evaluate((el) => el.shadowRoot!.getAnimations({ subtree: true }).filter((animation) => !(animation instanceof CSSAnimation)).length);
    for (const change of [{ form: 'tile' }, { status: 'done', statusText: 'Uploaded' }, { name: 'renamed.zip' }, { glyph: 'key' }, { preview: true, previewSrc: PICTURE }, { status: 'error', errorText: 'Lost.', retryable: true }, { form: 'row' }, { readOnly: true }]) {
      const drawn = await item.evaluate(async (el: HTMLElement & { updateComplete: Promise<unknown> }, props) => {
        Object.assign(el, props);
        await el.updateComplete;
        void el.getBoundingClientRect();
        return el.shadowRoot!.getAnimations({ subtree: true }).length;
      }, change);
      expect(drawn, `${JSON.stringify(change)}: without a motion`).toBe(0);
    }
    await expect(own(page, 'changing', 'preview')).toHaveAttribute('data-drawn', '');
    expect(await still()).toBe(0);
    // The picture is the browser's own image element — which plays a picture that moves; the file item runs nothing itself.
    expect(await own(page, 'changing', 'preview').evaluate((el) => [el.localName, el.getAnimations().length, getComputedStyle(el).animationName])).toEqual(['img', 0, 'none']);
    expect(await item.evaluate((el) => el.shadowRoot!.querySelectorAll('canvas, video, picture, source').length)).toBe(0);
    // Reduced motion: at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [name, target] of moving) expect(Number.parseFloat(await css(target, 'transition-duration')) === 0 || (await css(target, 'transition-property')) === 'none', `${name}: at once where motion is reduced`).toBe(true);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  test('FIT-24: with the text enlarged a row’s lines grow and wrap and are never cut, its glyph keeps its box, its picture row.media.height and its actions action.size; a tile’s box keeps the size given, its name stays one line and its second line wraps beneath it; at 200 % in a width of 320 no text is lost or lies over another part, a row’s actions stay at its end beside its first lines unless what stands beside its texts would leave them less than half the row — then they stand on a line of their own below the texts and the bar, at the row’s end, and the texts take the whole width — a tile is no wider than its layout, and nothing scrolls sideways', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 2400 });
    const rows = ['row-long-text', 'row-error-retryable', 'row-uploading', 'row-preview', 'row-link-new'];
    const tiles = ['tile-long-name', 'tile-error-retryable', 'tile-size-cover', 'tile-uploading'];
    const fixtures = [...spec.fixtures.filter((f) => [...rows, ...tiles].includes(f.id)), fx('wide', { form: 'tile', name: 'panorama-of-the-site.png', sizeText: '12 MB', preview: true, previewSrc: PICTURE, width: 480, height: 120, ...WORDS })];
    await mount(page, fixtures);
    const normal = { name: await textStyle(own(page, 'row-long-text', 'headline')), second: await textStyle(own(page, 'row-long-text', 'supporting')), tile: await box(own(page, 'tile-long-name', 'media')) };
    // The page as a reader with text at 200 % loads it.
    await mount(page, fixtures, { lead: `<style>html { font-size: 200%; } main { display: block !important; } .stage { box-sizing: border-box; inline-size: 320px !important; } .stage > ${TAG} { inline-size: auto !important; }</style>` });
    await frames(page);
    near(Number.parseFloat((await textStyle(own(page, 'row-long-text', 'headline'))).fontSize), 2 * Number.parseFloat(normal.name.fontSize), 'the name grows');
    near(Number.parseFloat((await textStyle(own(page, 'row-long-text', 'supporting'))).fontSize), 2 * Number.parseFloat(normal.second.fontSize), 'the second line grows');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'nothing scrolls sideways').toBe(true);
    const [rowIcon, actionSize, mediaSide] = [await token(page, 'row-icon-size'), await token(page, 'action-size'), await token(page, 'row-media-height')];
    // Whole: nothing is cut, and every line of it — each letter, where a column is one letter wide — lies inside its box.
    const whole = async (text: Locator) =>
      text.evaluate((el) => {
        const column = el.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(el);
        const inside = [...range.getClientRects()].every((line) => line.left >= column.left - 1 && line.right <= column.right + 1);
        return inside && getComputedStyle(el).textOverflow !== 'ellipsis' && getComputedStyle(el).overflow === 'visible' && getComputedStyle(el).whiteSpace !== 'nowrap';
      });
    for (const id of rows) {
      const itsHost = await box(host(page, id));
      expect(itsHost.x + itsHost.width, id).toBeLessThanOrEqual(320.5);
      const [name, second, lead, remove, text] = [await box(own(page, id, 'headline')), await own(page, id, 'supporting').boundingBox(), await box(own(page, id, 'media')), await box(own(page, id, 'remove')), await box(own(page, id, 'text'))];
      // Every text is whole and inside the row.
      for (const each of [own(page, id, 'headline'), own(page, id, 'supporting')]) {
        const b = await box(each);
        expect(b.x, `${id}: inside at the start`).toBeGreaterThanOrEqual(itsHost.x - 0.5);
        expect(b.x + b.width, `${id}: inside at the end`).toBeLessThanOrEqual(itsHost.x + itsHost.width + 0.5);
        expect(await whole(each), `${id}: never cut`).toBe(true);
      }
      near(lead.width, id === 'row-preview' ? mediaSide : rowIcon, `${id}: the glyph keeps its box, the picture row.media.height`);
      near(remove.width, actionSize, 'an action keeps action.size');
      near(remove.height, actionSize, 'an action keeps action.size');
      // The actions at the row's end; nothing lies over another part.
      near(remove.x + remove.width, itsHost.x + itsHost.width, `${id}: the actions at the end`);
      expect(text.x).toBeGreaterThanOrEqual(lead.x + lead.width - 0.5);
      const first = (await own(page, id, 'retry').count()) ? await box(own(page, id, 'retry')) : remove;
      const opens = (await own(page, id, 'opens').count()) ? await box(own(page, id, 'opens')) : null;
      // Beside or below, by what stands beside the texts: less than half the row left to them puts the actions on a line of their own.
      const [end, rowGap, gap] = [await box(own(page, id, 'end')), await token(page, 'row-container-gap'), await own(page, id, 'item').evaluate((el) => Number.parseFloat(getComputedStyle(el).columnGap))];
      const beside = lead.width + rowGap + (opens ? opens.width + rowGap : 0) + gap + end.width;
      const stacked = beside > itsHost.width / 2;
      expect(await own(page, id, 'item').getAttribute('data-stacked'), `${id}: ${Math.round(beside)} of ${Math.round(itsHost.width)} beside the texts`).toBe(stacked ? '' : null);
      if (id === 'row-error-retryable') expect(stacked, 'two actions leave a letter of the name at 200 % in 320: they go below').toBe(true);
      if (stacked) {
        const below = Math.max(text.y + text.height, (await own(page, id, 'bar').count()) ? (await box(own(page, id, 'bar'))).y + (await box(own(page, id, 'bar'))).height : 0);
        expect(first.y, `${id}: the actions below the texts and the bar`).toBeGreaterThanOrEqual(below - 0.5);
        near(first.y, remove.y, `${id}: the actions on one line`);
        if (first !== remove) expect(first.x + first.width).toBeLessThanOrEqual(remove.x + 0.5);
        expect(text.x + text.width, `${id}: the texts take the whole width`).toBeGreaterThanOrEqual(itsHost.x + itsHost.width - (opens ? opens.width + rowGap : 0) - 0.5);
      } else {
        expect(remove.y + remove.height / 2, `${id}: beside its first lines`).toBeLessThanOrEqual(name.y + Number.parseFloat((await textStyle(own(page, id, 'headline'))).lineHeight) + Number.parseFloat((await role(page, 'supporting-text-typescale')).lineHeight));
        const last = opens ?? first;
        expect(text.x + text.width, `${id}: the texts end before what follows them`).toBeLessThanOrEqual(last.x + 0.5);
        expect(last.x + last.width).toBeLessThanOrEqual(first.x + first.width + 0.5);
      }
      if (second) expect(second.y).toBeGreaterThanOrEqual(name.y + name.height - 0.5);
      if (await own(page, id, 'bar').count()) expect((await box(own(page, id, 'bar'))).y).toBeGreaterThanOrEqual(second!.y + second!.height - 0.5);
    }
    expect((await box(own(page, 'row-long-text', 'headline'))).height, 'a long name wraps').toBeGreaterThan(Number.parseFloat((await textStyle(own(page, 'row-long-text', 'headline'))).lineHeight) * 3);
    // Tiles: the box keeps the size the product gave or the token gives; the name one line, grown; the second line wraps beneath; never wider than the layout.
    const room = await stage(page, 'wide').evaluate((el) => el.clientWidth - Number.parseFloat(getComputedStyle(el).paddingLeft) - Number.parseFloat(getComputedStyle(el).paddingRight));
    for (const id of [...tiles, 'wide']) {
      const [itsHost, media, name] = [await box(host(page, id)), await box(own(page, id, 'media')), await boxOrNull(own(page, id, 'headline'))];
      expect(itsHost.x + itsHost.width, `${id}: inside the window`).toBeLessThanOrEqual(320.5);
      expect(itsHost.width, `${id}: no wider than its layout`).toBeLessThanOrEqual(room + 0.5);
      near(itsHost.width, media.width, 'exactly as wide as its box');
      const second = await boxOrNull(own(page, id, 'supporting'));
      if (second) {
        expect(second.y, `${id}: the second line beneath`).toBeGreaterThanOrEqual(media.y + media.height - 0.5);
        expect(second.x + second.width).toBeLessThanOrEqual(media.x + media.width + 0.5);
        expect(await whole(own(page, id, 'supporting')), `${id}: the second line is never cut`).toBe(true);
      }
      if (name && name.width > 1) {
        near(name.height, Number.parseFloat((await textStyle(own(page, id, 'headline'))).lineHeight), `${id}: the name stays one line`);
        near(Number.parseFloat((await textStyle(own(page, id, 'headline'))).fontSize), 2 * Number.parseFloat(normal.name.fontSize), 'and grows');
        expect(name.y).toBeGreaterThanOrEqual(media.y + media.height - 0.5);
        expect(name.x + name.width).toBeLessThanOrEqual(media.x + media.width + 0.5);
        if (second) expect(second.y).toBeGreaterThanOrEqual(name.y + name.height - 0.5);
      }
      const remove = await box(own(page, id, 'remove'));
      near(remove.width, actionSize, 'a tile’s action keeps action.size');
      expect(remove.x + remove.width).toBeLessThanOrEqual(media.x + media.width + 0.5);
    }
    // A box the product sized keeps its size — but for what its actions, which grew with the text, now need (FIT-3).
    const sized = await box(own(page, 'tile-size-cover', 'media'));
    const least = [2 * actionSize + Math.max(await token(page, 'action-gap'), 2 * Math.max(0, (await resolveToken(page, '--tanrei-sys-target-pointer')) - actionSize)) + 2 * (await token(page, 'tile-action-inset')), actionSize + 2 * (await token(page, 'tile-action-inset'))];
    expect([sized.width, sized.height], 'a box the product sized keeps its size').toEqual([Math.max(160, least[0]), Math.max(90, least[1])]);
    expect(least[1], 'its height is the product’s still').toBeLessThan(90);
    near((await box(own(page, 'tile-long-name', 'media'))).height, await token(page, 'tile-media-height'), 'a box the token sizes keeps the token’s height');
    const squeezed = await box(own(page, 'wide', 'media'));
    near(squeezed.width, room, 'a tile wider than its layout is as wide as the layout');
    near(squeezed.height, Math.max((room * 120) / 480, least[1]), 'and keeps its proportion, down to what one action needs', 1);
    expect((await box(own(page, 'tile-error-retryable', 'supporting'))).height, 'a tile’s second line wraps').toBeGreaterThan(Number.parseFloat((await textStyle(own(page, 'tile-error-retryable', 'supporting'))).lineHeight) * 1.5);
    // The text enlarged while the page is open: what was drawn follows.
    await mountSpec(page, 'row-error-retryable', 'tile-long-name');
    const drawn = (id: string) => Promise.all([textStyle(own(page, id, 'headline')), box(own(page, id, 'icon')), box(own(page, id, 'remove'))]);
    const before = { row: await drawn('row-error-retryable'), tile: await drawn('tile-long-name') };
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    await frames(page);
    for (const [key, id] of [['row', 'row-error-retryable'], ['tile', 'tile-long-name']] as const) {
      const [name, glyph, action] = await drawn(id);
      near(Number.parseFloat(name.fontSize), 2 * Number.parseFloat(before[key][0].fontSize), `${id}: the name follows`);
      near(glyph.width, 2 * before[key][1].width, 'its glyph follows');
      near(action.width, 2 * before[key][2].width, 'its actions follow');
    }
    near((await box(own(page, 'tile-long-name', 'media'))).width, 2 * normal.tile.width, 'a box the token sizes follows the token');
  });

  test('FIT-25: in forced colors the texts and the glyphs are the text color and a link’s name the link color; the bar’s indicator is the highlight color on a track edged in the text color; a tile’s box and a row’s picture box have an edge in the text color; a tile’s action stands on the surface color with an edge; disabled actions are the disabled text color; a picture is left as it is; and no color tells a failed file from another', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit does not emulate forced colors');
    await mount(page, spec.fixtures.filter((f) => ['row', 'row-uploading', 'row-done', 'row-error-retryable', 'row-preview', 'row-link-new', 'row-disabled', 'row-interactive', 'tile', 'tile-preview', 'tile-uploading', 'tile-error-retryable', 'tile-disabled'].includes(f.id)), { reducedMotion: true });
    const sizes = [await box(host(page, 'row-preview')), await box(own(page, 'row-preview', 'text')), await box(host(page, 'tile-preview'))];
    await page.emulateMedia({ forcedColors: 'active' });
    const system = (name: string) => colorOf(page, name);
    const [canvasText, highlight, gray, link, canvas, buttonText] = [await system('CanvasText'), await system('Highlight'), await system('GrayText'), await system('LinkText'), await system('Canvas'), await system('ButtonText')];
    // The texts and the glyphs: the text color — also of a failed file, whose words and whose mark's shape say it.
    for (const id of ['row', 'row-done', 'row-error-retryable', 'tile', 'tile-error-retryable', 'row-disabled']) {
      for (const name of ['headline', 'supporting', 'icon', 'mark'] as const) {
        if (!(await own(page, id, name).count())) continue;
        sameColor(await painted(own(page, id, name), 'color'), canvasText, `${id} ${name}`);
      }
    }
    expect(await painted(own(page, 'row-error-retryable', 'supporting'), 'color'), 'no color tells a failed file from another').toEqual(await painted(own(page, 'row-done', 'supporting'), 'color'));
    await expect(own(page, 'row-error-retryable', 'mark')).toHaveText('error');
    await expect(own(page, 'row-done', 'mark')).toHaveText('check_circle');
    await expect(own(page, 'row-error-retryable', 'supporting')).toContainText('The connection was lost.');
    // A link's name: the link color.
    sameColor(await painted(own(page, 'row-link-new', 'headline'), 'color'), link, 'a link’s name');
    sameColor(await painted(own(page, 'row-link-new', 'opens'), 'color'), canvasText, 'the mark of a new context');
    sameColor(await painted(own(page, 'row-interactive', 'headline'), 'color'), canvasText, 'a button’s name is text');
    // The bar: the indicator in the highlight color, on a track edged in the text color.
    for (const id of ['row-uploading', 'tile-uploading']) {
      const bar = own(page, id, 'bar');
      sameColor(await painted(bar.locator('.bar > .indicator'), 'background-color'), highlight, `${id}: the indicator`);
      sameColor(await painted(bar.locator('.bar > .track.under'), 'outline-color'), canvasText, `${id}: the track’s edge`);
      expect(await css(bar.locator('.bar > .track.under'), 'outline-style')).toBe('solid');
    }
    // A tile's box and a row's picture box: an edge in the text color, since their ground is gone.
    const hairline = await resolveToken(page, '--tanrei-sys-border-hairline');
    for (const id of ['tile', 'tile-preview', 'row-preview']) {
      const media = own(page, id, 'media');
      sameColor(await painted(media, 'border-top-color'), canvasText, `${id}: the box’s edge`);
      expect(await css(media, 'border-top-style')).toBe('solid');
      near(Number.parseFloat(await css(media, 'border-top-width')), hairline, 'a hairline');
    }
    expect(await css(own(page, 'row', 'media'), 'border-top-style'), 'a glyph alone has no box').toBe('none');
    // The edge is inside the box: nothing changes its size.
    expect([await box(host(page, 'row-preview')), await box(own(page, 'row-preview', 'text')), await box(host(page, 'tile-preview'))], 'the edge moves nothing').toEqual(sizes);
    // A tile's action: on the surface color, with an edge. A row's: an edge.
    for (const name of ['retry', 'remove'] as const) {
      const action = own(page, 'tile-error-retryable', name);
      sameColor(await painted(action, 'background-color'), canvas, `a tile’s ${name}: the surface color`);
      sameColor(await painted(action, 'border-top-color'), buttonText, 'with an edge');
      sameColor(await painted(action, 'color'), buttonText, 'its glyph');
      expect(await css(action, 'border-top-style')).toBe('solid');
    }
    sameColor(await painted(own(page, 'row-error-retryable', 'remove'), 'border-top-color'), buttonText, 'a row’s action has an edge');
    near((await box(own(page, 'tile-error-retryable', 'remove'))).width, await token(page, 'action-size'), 'the edge is inside action.size');
    // Disabled actions: the disabled text color, fully drawn.
    for (const id of ['row-disabled', 'tile-disabled']) {
      for (const name of ['retry', 'remove'] as const) {
        sameColor(await painted(own(page, id, name), 'color'), gray, `${id} ${name}`);
        sameColor(await painted(own(page, id, name), 'border-top-color'), gray, 'its edge');
        expect(await css(own(page, id, name), 'opacity')).toBe('1');
      }
    }
    // A picture is left as it is.
    expect(await css(own(page, 'tile-preview', 'preview'), 'forced-color-adjust')).toBe('none');
    await expect(own(page, 'tile-preview', 'preview')).toHaveAttribute('data-drawn', '');
    // The state layer draws no color of its own; the keyboard focus is still shown.
    await start(page);
    const body = own(page, 'row-interactive', 'body');
    await tabTo(page, body);
    expect((await painted(own(page, 'row-interactive', 'layer'), 'background-color'))[3], 'no layer').toBe(0);
    expect(await css(body, 'outline-style')).toBe('solid');
    expect(Number.parseFloat(await css(body, 'outline-width'))).toBeGreaterThan(0);
    await page.emulateMedia({ forcedColors: 'none' });
  });

  test('FIT-26: in right-to-left the layout mirrors — a row’s glyph or picture at the right, its texts after it toward the left, the mark of a new context and the actions at the left with remove outermost; a tile’s actions at the top left corner of its box with remove outermost; the status mark at the right of its words; a bar that fills from the right — a picture is never mirrored, and a ripple still grows from the point of contact', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => ['row-rtl', 'row-rtl-error', 'tile-rtl'].includes(f.id)), fx('picture', { name: 'floor-plan.png', sizeText: '3.4 MB', preview: true, previewSrc: PICTURE, interactive: true, ...WORDS }, { direction: 'rtl' }), fx('tile-bar', { form: 'tile', name: 'floor-plan.png', status: 'uploading', progress: 0.25, interactive: true, ...WORDS }, { direction: 'rtl' })]);
    const id = 'row-rtl-error';
    const whole = await box(host(page, id));
    const [icon, text, opens, retry, remove] = [await box(own(page, id, 'icon')), await box(own(page, id, 'text')), await box(own(page, id, 'opens')), await box(own(page, id, 'retry')), await box(own(page, id, 'remove'))];
    const gap = await token(page, 'row-container-gap');
    near(icon.x + icon.width, whole.x + whole.width, 'the glyph at the right');
    near(icon.x - (text.x + text.width), gap, 'the texts after it, toward the left');
    near(remove.x, whole.x, 'remove outermost, at the left');
    const between = Math.max(await token(page, 'action-gap'), 2 * Math.max(0, (await resolveToken(page, '--tanrei-sys-target-pointer')) - (await token(page, 'action-size'))));
    near(retry.x - (remove.x + remove.width), between, 'retry beside it');
    near(opens.x - (retry.x + retry.width), gap, 'the mark of a new context after the actions, toward the right');
    near(text.x - (opens.x + opens.width), gap, 'and before the texts');
    // The status mark at the right of its words.
    const [mark, words] = [await box(own(page, id, 'mark')), await box(own(page, id, 'supporting').locator('.said').last())];
    const firstLine = await own(page, id, 'supporting').locator('.said').last().evaluate((el) => {
      const first = el.getClientRects()[0];
      return [first.left, first.right];
    });
    near(mark.x - firstLine[1], await token(page, 'status-icon-gap'), 'the status mark at the right of its words, status.icon.gap from them');
    expect(mark.x).toBeGreaterThanOrEqual(words.x);
    // A row with a picture: the square at the right.
    const [square, ptext, phost] = [await box(own(page, 'picture', 'media')), await box(own(page, 'picture', 'text')), await box(host(page, 'picture'))];
    near(square.x + square.width, phost.x + phost.width, 'the picture at the right');
    expect(ptext.x + ptext.width).toBeLessThan(square.x);
    // A picture is never mirrored.
    for (const picture of [own(page, 'picture', 'preview'), own(page, 'tile-rtl', 'preview')]) {
      await expect(picture).toHaveAttribute('data-drawn', '');
      expect(await picture.evaluate((el) => [getComputedStyle(el).transform, getComputedStyle(el).scale, getComputedStyle(el).objectPosition])).toEqual(['none', 'none', '50% 50%']);
    }
    expect(await css(own(page, 'tile-rtl', 'media'), 'transform')).toBe('none');
    // The bar fills from the right, and its indeterminate segment moves from right to left.
    const bar = own(page, 'row-rtl', 'bar');
    const [b, indicator, rtext] = [await box(bar), await box(bar.locator('.bar > .indicator')), await box(own(page, 'row-rtl', 'text'))];
    near(b.x + b.width, rtext.x + rtext.width, 'the bar ends where the texts begin, at the right');
    near(b.width, rtext.width, 'as wide as the texts');
    near(indicator.x + indicator.width, b.x + b.width, 'the indicator from the right');
    near(indicator.width, 0.4 * b.width, 'across the fraction');
    await set(host(page, 'row-rtl'), { progress: null });
    expect(await bar.locator('.bar').evaluate((el) => getComputedStyle(el).getPropertyValue('--_way').trim()), 'the segment moves from right to left').toBe('-1');
    const [tb, tindicator] = [await box(own(page, 'tile-bar', 'bar')), await box(own(page, 'tile-bar', 'bar').locator('.bar > .indicator'))];
    near(tindicator.x + tindicator.width, tb.x + tb.width, 'a tile’s bar fills from the right');
    // A tile: the actions at the top left corner of its box, remove outermost; its texts from the right.
    const [tbox, tretry, tremove, inset] = [await box(own(page, 'tile-rtl', 'media')), await box(own(page, 'tile-rtl', 'retry')), await box(own(page, 'tile-rtl', 'remove')), await token(page, 'tile-action-inset')];
    near(tremove.x - tbox.x, inset, 'remove outermost, tile.action.inset from the left edge');
    near(tremove.y - tbox.y, inset, 'tile.action.inset from the top');
    near(tretry.x - (tremove.x + tremove.width), between, 'retry after it');
    const tname = await own(page, 'tile-rtl', 'headline').locator('.cut').evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return range.getBoundingClientRect().right;
    });
    near(tname, tbox.x + tbox.width, 'a tile’s name from the right', 1);
    expect(await css(own(page, 'tile-rtl', 'supporting'), 'text-align')).toMatch(/^(start|right)$/);
    // The hit area of the action at the end ends where the action does in this direction too — at its left edge — and reaches toward the start, the right.
    const target = await own(page, id, 'remove').evaluate((el) => {
      const before = getComputedStyle(el, '::before');
      const m = new DOMMatrixReadOnly(before.transform);
      return { right: Number.parseFloat(before.right), left: Number.parseFloat(before.left), width: Number.parseFloat(before.width), shift: m.m41, own: el.getBoundingClientRect().width };
    });
    near(target.left + target.shift, 0, 'the target ends at the action’s end edge, the left one');
    expect(target.left + target.shift + target.width, 'and reaches past its start edge, the right one').toBeGreaterThan(target.own);
    // A ripple from the point of contact.
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'ripple' });
    for (const fixture of ['picture', 'tile-bar']) {
      const origin = await own(page, fixture, 'body').evaluate((el) => {
        const r = el.querySelector('.layer')!.getBoundingClientRect();
        el.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + 10, clientY: r.top + 12, button: 0, pointerType: 'mouse', bubbles: true, composed: true }));
        const layer = el.querySelector<HTMLElement>('.ripple')!;
        return [Number.parseFloat(layer.style.getPropertyValue('--_x')), Number.parseFloat(layer.style.getPropertyValue('--_y'))];
      });
      near(origin[0], 10, `${fixture}: the point of contact`, 1.5);
      near(origin[1], 12, `${fixture}: the point of contact`, 1.5);
    }
  });

  test('FIT-27: the direction is the nearest ancestor’s, with no setting of the file item’s own; when it changes while the file item is shown it is drawn for the new direction at once, without a motion, keeping its focus', async ({ page }) => {
    await mountSpec(page, 'row-error-retryable', 'tile-error-retryable');
    for (const [id, part_] of [['row-error-retryable', 'icon'], ['tile-error-retryable', 'media']] as const) {
      expect(await host(page, id).evaluate((el) => [el.hasAttribute('dir'), 'direction' in el, el.shadowRoot!.querySelectorAll('[dir]:not(bdi)').length])).toEqual([false, false, 0]);
      const whole = await box(host(page, id));
      const remove = own(page, id, 'remove');
      near((await box(own(page, id, part_))).x, whole.x, `${id}: left-to-right from the document`);
      const before = await box(remove);
      near(before.x + before.width, whole.x + whole.width - (id.startsWith('tile') ? await token(page, 'tile-action-inset') : 0), 'the actions at the right');
      await remove.focus();
      // The focused state has been drawn: what moves after this is the direction's doing.
      await expect.poll(() => host(page, id).evaluate((el) => el.shadowRoot!.getAnimations({ subtree: true }).length)).toBe(0);
      // An ancestor's direction, not the root's.
      const moving = await stage(page, id).evaluate((el) => {
        el.setAttribute('dir', 'rtl');
        const item = el.querySelector('tanrei-file-item')!;
        void item.getBoundingClientRect();
        return item.shadowRoot!.getAnimations({ subtree: true }).length;
      });
      expect(moving, 'without a motion of its own').toBe(0);
      const now = await box(host(page, id));
      near((await box(remove)).x, now.x + (id.startsWith('tile') ? await token(page, 'tile-action-inset') : 0), `${id}: drawn for the new direction at once — the actions at the left`);
      const lead = await box(own(page, id, part_));
      near(lead.x + lead.width, now.x + now.width, 'the glyph or the box at the right');
      expect(await focused(page), 'the focus is kept').toBe('tanrei-file-item[e] button.action.remove');
      // And back.
      await stage(page, id).evaluate((el) => el.setAttribute('dir', 'ltr'));
      near((await box(remove)).x, before.x, 'and back');
      expect(await focused(page)).toBe('tanrei-file-item[e] button.action.remove');
    }
    expect(await page.evaluate(() => document.documentElement.hasAttribute('dir'))).toBe(false);
  });

  test('FIT-28: each text is laid out as text of its own direction, isolated — a file name in Latin letters keeps its order, its dot and its extension in a right-to-left row, and the cut of a tile’s name keeps the name’s own ending — and in right-to-left a glyph is mirrored exactly when the icon set marks its name or the product forces it, by the icon helper and inside its own box', async ({ page }) => {
    const rtl: Extra = { direction: 'rtl' };
    await mount(page, [
      ...spec.fixtures.filter((f) => ['row-rtl', 'row-rtl-error', 'row', 'kind-other'].includes(f.id)),
      fx('mixed', { name: 'report (final).pdf', formatText: 'PDF', sizeText: '1.2 MB', statusText: 'تم الرفع', status: 'done', ...WORDS }, rtl),
      fx('arabic', { name: 'تقرير.pdf', sizeText: '820 KB', ...WORDS }, rtl),
      fx('arabic-ltr', { name: 'تقرير نهائي.pdf', sizeText: '820 KB', status: 'error', errorText: 'انقطع الاتصال.', ...WORDS }),
      fx('other', { name: 'README', ...WORDS }, rtl),
      fx('slot', { name: 'next.bin', ...WORDS }, { ...rtl, slots: { icon: 'arrow_forward' } }),
      fx('tile-latin', { form: 'tile', name: 'IMG_20260914_103322_HDR_edited_copy_2.jpeg', ...WORDS }, rtl),
      fx('tile-arabic', { form: 'tile', name: 'صورة الموقع بعد الانتهاء من أعمال البناء.jpeg', ...WORDS }),
    ]);
    // Every text is isolated, by its first strong character.
    const said = own(page, 'mixed', 'supporting').locator('.said');
    await expect(said).toHaveCount(3);
    for (const text of [own(page, 'mixed', 'headline'), ...(await said.all())]) expect(await css(text, 'unicode-bidi')).toBe('plaintext');
    expect(await own(page, 'tile-latin', 'headline').locator('bdi').evaluate((el) => [getComputedStyle(el).unicodeBidi, getComputedStyle(el).direction])).toEqual(['isolate', 'ltr']);
    expect(await own(page, 'tile-arabic', 'headline').locator('bdi').evaluate((el) => getComputedStyle(el).direction), 'an Arabic name is right-to-left in a left-to-right tile').toBe('rtl');
    // A Latin name in a right-to-left row: its letters run left to right, the extension last, at the visual right.
    const name = own(page, 'mixed', 'headline');
    const order = await name.evaluate((el) => {
      const node = [...el.childNodes].find((child) => child.nodeType === Node.TEXT_NODE && child.textContent!.trim()) as Text;
      const text = node.textContent!;
      const at = (index: number) => {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + 1);
        return range.getBoundingClientRect().left;
      };
      return { first: at(0), paren: at(text.indexOf('(')), close: at(text.indexOf(')')), dot: at(text.lastIndexOf('.')), last: at(text.length - 1) };
    });
    expect(order.first).toBeLessThan(order.paren);
    expect(order.paren).toBeLessThan(order.close);
    expect(order.close).toBeLessThan(order.dot);
    expect(order.dot).toBeLessThan(order.last);
    // It is still placed by the layout: at the right of its column.
    const [n, text] = [await box(name), await box(own(page, 'mixed', 'text'))];
    near(n.x + n.width, text.x + text.width, 'the name’s box fills its column');
    expect(await css(name, 'text-align')).toBe('right');
    expect(await css(own(page, 'arabic-ltr', 'headline'), 'text-align'), 'an Arabic name in a left-to-right row is aligned by the row').toBe('left');
    // The size keeps its order beside a status in another script.
    const ltr = (el: Locator) =>
      el.evaluate((node_) => {
        const node = [...node_.childNodes].find((child) => child.nodeType === Node.TEXT_NODE) as Text;
        const at = (index: number) => {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + 1);
          return range.getBoundingClientRect().left;
        };
        return at(0) < at(node.textContent!.length - 1);
      });
    expect(await ltr(said.nth(1)), 'the size runs left to right').toBe(true);
    expect(await ltr(said.nth(0)), 'the format runs left to right').toBe(true);
    expect(await ltr(said.nth(2)), 'an Arabic status runs right to left').toBe(false);
    expect(await ltr(own(page, 'arabic-ltr', 'supporting').locator('.said').last()), 'an Arabic error in a left-to-right row runs right to left').toBe(false);
    // The cut of a tile's name keeps the name's own ending: at the right for a Latin name in a right-to-left tile, at the left for an Arabic one.
    for (const [id, endingAt] of [['tile-latin', 'right'], ['tile-arabic', 'left']] as const) {
      const cut = await own(page, id, 'headline').evaluate((el) => {
        const [start, ending] = [el.querySelector<HTMLElement>('.start')!, el.querySelector<HTMLElement>('.ending')!];
        const range = document.createRange();
        range.selectNodeContents(start);
        return { start: start.getBoundingClientRect(), whole: range.getBoundingClientRect().width, ending: ending.getBoundingClientRect(), endingWhole: ending.scrollWidth, text: ending.textContent, line: el.getBoundingClientRect() };
      });
      expect(cut.text).toBe('.jpeg');
      expect(cut.start.width, `${id}: the start is cut`).toBeLessThan(cut.whole - 20);
      expect(cut.ending.width, `${id}: the ending is whole`).toBeGreaterThanOrEqual(cut.endingWhole - 0.5);
      expect(cut.ending.left, 'inside the box').toBeGreaterThanOrEqual(cut.line.left - 0.5);
      expect(cut.ending.right).toBeLessThanOrEqual(cut.line.right + 0.5);
      if (endingAt === 'right') expect(cut.ending.left, `${id}: the ending after the start, in the name’s own direction`).toBeGreaterThanOrEqual(cut.start.right - 0.5);
      else expect(cut.ending.right, `${id}: the ending after the start, in the name’s own direction`).toBeLessThanOrEqual(cut.start.left + 0.5);
    }
    // Mirroring: draft and open_in_new are on the set's list; no other glyph the file item draws is (FIT-5 has all fifteen).
    await expect(own(page, 'other', 'icon')).toHaveText('draft');
    expect(await mirrored(own(page, 'other', 'icon')), 'draft is mirrored').toBe(true);
    near((await box(own(page, 'other', 'icon'))).width, await token(page, 'row-icon-size'), 'inside its own box');
    near((await box(own(page, 'other', 'icon'))).x + (await box(own(page, 'other', 'icon'))).width, (await box(host(page, 'other'))).x + (await box(host(page, 'other'))).width, 'where it stood');
    expect(await mirrored(own(page, 'row-rtl-error', 'opens')), 'open_in_new is mirrored').toBe(true);
    for (const [glyph, what] of [
      [own(page, 'row-rtl', 'icon'), 'image'],
      [own(page, 'row-rtl-error', 'mark'), 'error'],
      [own(page, 'mixed', 'mark'), 'check_circle'],
      [own(page, 'row-rtl-error', 'retry').locator('.glyph'), 'refresh'],
      [own(page, 'row-rtl-error', 'remove').locator('.glyph'), 'close'],
    ] as const) {
      await expect(glyph).toHaveText(what);
      expect(await mirrored(glyph), `${what} is not mirrored`).toBe(false);
    }
    // Left to right, nothing is mirrored.
    expect(await mirrored(own(page, 'kind-other', 'icon'))).toBe(false);
    // The file item mirrors nothing itself: no box of its own is turned.
    expect(await host(page, 'other').evaluate((el) => ['.item', '.body', '.lead', '.media', '.end'].map((selector) => getComputedStyle(el.shadowRoot!.querySelector(selector)!).transform))).toEqual(Array(5).fill('none'));
    // The product's glyph: the set marks arrow_forward; data-mirror decides for one use.
    const product = host(page, 'slot').locator(':scope > [slot="icon"]');
    await expect.poll(() => mirrored(product)).toBe(true);
    await product.evaluate((el) => el.setAttribute('data-mirror', 'never'));
    await expect.poll(() => mirrored(product)).toBe(false);
    await host(page, 'row-rtl').evaluate((el) => el.shadowRoot!.querySelector('.icon')!.setAttribute('data-mirror', 'always'));
    await expect.poll(() => mirrored(own(page, 'row-rtl', 'icon')), { message: 'forced by the product' }).toBe(true);
  });

  test('FIT-29: a form it does not know is row, a status pending, a fit cover and a target same; a width or a height that is not a number above zero is as if it were not given; a glyph the icon set does not have draws nothing and keeps its box; each is reported — and preview without an address or a file draws the glyph and reports nothing', async ({ page }) => {
    const warnings = logged(page);
    await mount(page, [
      fx('a', { form: 'chip' as never, status: 'paused' as never, statusText: 'Paused', name: 'one.png', sizeText: '1 MB', ...WORDS }),
      fx('fit', { form: 'tile', name: 'two.png', preview: true, previewSrc: PICTURE, fit: 'stretch' as never, width: -5, height: 0, ...WORDS }),
      fx('target', { name: 'three.pdf', href: '#three', target: 'popup' as never, targetLabel: 'opens in a new tab', ...WORDS }),
      fx('glyph', { name: 'four.bin', glyph: 'no_such_glyph_of_the_set', sizeText: '1 MB', ...WORDS }),
      fx('glyph-tile', { form: 'tile', name: 'four.bin', glyph: 'no_such_glyph_of_the_set', ...WORDS }),
      fx('known', { name: 'keys.pem', glyph: 'key', ...WORDS }),
      fx('later', { form: 'tile', name: 'five.png', preview: true, ...WORDS }),
      fx('later-row', { name: 'six.pdf', preview: true, ...WORDS }),
      ...spec.fixtures.filter((f) => ['tile', 'row', 'row-glyph'].includes(f.id)),
    ]);
    await turn(page, 50);
    // row and pending: the glyph of the format, no bar, no retry, no mark — and the words it was given.
    const first = host(page, 'a');
    expect(await own(page, 'a', 'item').evaluate((el) => [el.getAttribute('data-form'), el.getAttribute('data-status')])).toEqual(['row', 'pending']);
    expect(await first.evaluate((el) => el.hasAttribute('data-tile'))).toBe(false);
    near((await box(first)).width, (await box(host(page, 'row'))).width, 'drawn as a row');
    near((await box(own(page, 'a', 'icon'))).width, await token(page, 'row-icon-size'), 'row.icon.size');
    await expect(own(page, 'a', 'icon')).toHaveText('image');
    await expect(own(page, 'a', 'bar')).toHaveCount(0);
    await expect(own(page, 'a', 'retry')).toHaveCount(0);
    await expect(own(page, 'a', 'mark')).toHaveCount(0);
    await expect(own(page, 'a', 'supporting')).toHaveText(/^\s*1 MB\s+·\s+Paused\s*$/);
    // cover; and a width and a height that are no numbers above zero: the token's box.
    await expect(own(page, 'fit', 'preview')).toHaveAttribute('data-drawn', '');
    expect(await css(own(page, 'fit', 'preview'), 'object-fit')).toBe('cover');
    expect(await own(page, 'fit', 'item').getAttribute('data-fit')).toBe('cover');
    const [bad, plain] = [await box(own(page, 'fit', 'media')), await box(own(page, 'tile', 'media'))];
    expect([bad.width, bad.height]).toEqual([plain.width, plain.height]);
    await set(host(page, 'fit'), { width: Number.NaN, height: Number.POSITIVE_INFINITY });
    expect([(await box(own(page, 'fit', 'media'))).width, (await box(own(page, 'fit', 'media'))).height]).toEqual([plain.width, plain.height]);
    // same: the link opens where the person is, and draws no mark of a new context.
    expect(await own(page, 'target', 'body').evaluate((el) => [el.localName, el.getAttribute('target'), el.getAttribute('rel'), el.getAttribute('aria-description')])).toEqual(['a', null, null, null]);
    await expect(own(page, 'target', 'opens')).toHaveCount(0);
    // A glyph the set does not have: nothing is drawn in its box — never its name — and the box is kept.
    for (const [id, size] of [['glyph', 'row-icon-size'], ['glyph-tile', 'tile-icon-size']] as const) {
      const glyph = own(page, id, 'icon');
      await expect.poll(() => glyph.getAttribute('data-drawn'), { message: id }).toBeNull();
      expect(await css(glyph, 'visibility'), 'nothing is drawn').toBe('hidden');
      const b = await box(glyph);
      near(b.width, await token(page, size), `${id}: the box is kept`);
      near(b.height, await token(page, size), `${id}: the box is kept`);
    }
    near((await box(own(page, 'glyph', 'text'))).x, (await box(own(page, 'row', 'text'))).x - (await box(host(page, 'row'))).x + (await box(host(page, 'glyph'))).x, 'the texts stand where they stand beside a glyph');
    await expect(own(page, 'glyph', 'remove').locator('.glyph'), 'the set draws its other glyphs').toHaveAttribute('data-drawn', '');
    // Each is reported, once.
    const reported = (needle: string, id = 'FIT-29') => warnings.filter((text) => text.includes(id) && text.includes(needle)).length;
    await expect.poll(() => reported('glyph "no_such_glyph_of_the_set"'), { message: 'a glyph the set lacks is reported for each file item' }).toBe(2);
    expect(reported('form "chip"')).toBe(1);
    expect(reported('status "paused"')).toBe(1);
    expect(reported('fit "stretch"')).toBe(1);
    expect(reported('width "-5"')).toBe(1);
    expect(reported('height "0"')).toBe(1);
    expect(reported('width "NaN"')).toBe(1);
    expect(reported('height "Infinity"')).toBe(1);
    expect(reported('target "popup"', 'FIT-'), 'an unknown target is reported').toBe(1);
    // A glyph the set has is not reported — also where it is given while the file item is shown.
    await expect(own(page, 'known', 'icon')).toHaveAttribute('data-drawn', '');
    await set(host(page, 'row'), { glyph: 'key' });
    await expect(own(page, 'row', 'icon')).toHaveAttribute('data-drawn', '');
    await set(host(page, 'row'), { glyph: 'another_that_is_not_there' });
    await expect.poll(() => reported('glyph "another_that_is_not_there"')).toBe(1);
    await turn(page, 50);
    expect(warnings.filter((text) => text.includes('glyph "key"')), 'a glyph of the set is never reported').toEqual([]);
    // preview with neither an address nor a file: the glyph, and nothing reported — the product may give the file later.
    for (const [id, glyph] of [['later', 'image'], ['later-row', 'picture_as_pdf']] as const) {
      await expect(own(page, id, 'preview')).toHaveCount(0);
      await expect(own(page, id, 'icon')).toHaveText(glyph);
      await expect(own(page, id, 'icon')).toHaveAttribute('data-drawn', '');
    }
    expect(warnings.filter((text) => /preview/.test(text)), 'nothing is said of a preview that has nothing to draw yet').toEqual([]);
    await give(host(page, 'later'), 'five.png', 'image/png');
    await expect(own(page, 'later', 'preview')).toHaveAttribute('data-drawn', '');
    // Values it knows are not reported.
    expect(warnings.filter((text) => text.includes('FIT-29')).length).toBe(10);
  });

  test('FIT-30: a prop that changes while the file item is shown is drawn and exposed at once, keeping its focus, and nothing is announced; when the retry action leaves while focus is on it — the status is no longer error, retryable or readOnly changed — focus moves to the remove action, or to the body where that is pressable and no remove action is drawn; focus moves at no other time', async ({ page }) => {
    await mount(page, [
      fx('a', { name: 'kept.txt', sizeText: '1 KB', status: 'error', errorText: 'Lost.', retryable: true, ...WORDS }),
      fx('b', { name: 'also.txt', status: 'error', errorText: 'Lost.', retryable: true, interactive: true, ...WORDS }),
      fx('c', { name: 'last.txt', status: 'error', errorText: 'Lost.', retryable: true, ...WORDS }),
    ]);
    await start(page);
    const id = 'a';
    const item = host(page, id);
    await own(page, id, 'remove').focus();
    // Every prop, drawn and exposed at once.
    await set(item, { name: 'renamed.txt', formatText: 'Text', sizeText: '2 KB', status: 'uploading', statusText: 'Uploading', progress: 0.5, removeLabel: 'Delete {name}' });
    await expect(own(page, id, 'headline')).toHaveText('renamed.txt');
    await expect(own(page, id, 'supporting')).toHaveText(/^\s*Text\s+·\s+2 KB\s+·\s+Uploading\s*$/);
    expect(await item.getAttribute('aria-label')).toBe('renamed.txt');
    await expect(own(page, id, 'bar')).toHaveAttribute('aria-label', 'renamed.txt');
    await expect(own(page, id, 'bar')).toHaveAttribute('aria-valuenow', '0.5');
    await expect(own(page, id, 'remove')).toHaveAttribute('aria-label', 'Delete renamed.txt');
    await expect(own(page, id, 'icon')).toHaveText('description');
    expect(await focused(page), 'the focus is kept').toBe('tanrei-file-item[a] button.action.remove');
    await set(item, { form: 'tile', preview: true, previewSrc: PICTURE, width: 120, height: 80 });
    await expect(own(page, id, 'preview')).toHaveAttribute('data-drawn', '');
    expect([(await box(own(page, id, 'media'))).width, (await box(own(page, id, 'media'))).height]).toEqual([120, 80]);
    expect(await focused(page), 'across a change of form').toBe('tanrei-file-item[a] button.action.remove');
    await set(item, { form: 'row', preview: false, interactive: true });
    await expect(stage(page, id).getByRole('button', { name: 'renamed.txt', exact: true })).toHaveCount(1);
    expect(await focused(page), 'across the body becoming a button').toBe('tanrei-file-item[a] button.action.remove');
    await set(item, { href: '#renamed' });
    await expect(stage(page, id).getByRole('link', { name: 'renamed.txt', exact: true })).toHaveCount(1);
    await set(item, { href: '', interactive: false, disabled: true });
    await expect(own(page, id, 'remove')).toBeDisabled();
    await set(item, { disabled: false, status: 'error', errorText: 'The connection was lost.', retryable: true });
    await expect(own(page, id, 'supporting')).toContainText('The connection was lost.');
    await expect(own(page, id, 'retry')).toHaveCount(1);
    // Nothing is announced: the file item has no live region to say it in.
    expect(await item.evaluate((el) => [el, ...el.shadowRoot!.querySelectorAll('*')].filter((node) => node.hasAttribute('aria-live') || ['status', 'alert', 'log'].includes(node.getAttribute('role') ?? '')).length)).toBe(0);
    // The retry action leaves while focus is on it: the remove action.
    const at = (value: string, what: string) => `tanrei-file-item[${value}] ${what}`;
    await own(page, id, 'retry').focus();
    await set(item, { status: 'uploading' });
    await expect.poll(() => focused(page), { message: 'the status is no longer error' }).toBe(at('a', 'button.action.remove'));
    await set(item, { status: 'error' });
    await own(page, id, 'retry').focus();
    await set(item, { retryable: false });
    await expect.poll(() => focused(page), { message: 'retryable changed' }).toBe(at('a', 'button.action.remove'));
    // readOnly: no remove action is drawn — the body, where it is pressable.
    await own(page, 'b', 'retry').focus();
    await set(host(page, 'b'), { readOnly: true });
    await expect.poll(() => focused(page), { message: 'readOnly, with a pressable body' }).toBe(at('b', 'button.body.pressable'));
    // …and nowhere of its own where there is neither: where focus goes then is the page's.
    await own(page, 'c', 'retry').focus();
    await set(host(page, 'c'), { readOnly: true });
    await turn(page);
    expect(await page.evaluate(() => document.activeElement?.localName), 'no part of the file item takes the focus').toBe('body');
    // Focus is moved at no other time: not when focus is elsewhere, and not when the remove action is the one focused.
    await set(host(page, 'c'), { readOnly: false });
    await page.locator('#start').focus();
    await set(host(page, 'c'), { status: 'done', statusText: 'Uploaded' });
    await set(host(page, 'c'), { status: 'error', retryable: true });
    await turn(page);
    expect(await focused(page)).toBe('button');
    await own(page, 'c', 'remove').focus();
    await set(host(page, 'c'), { status: 'pending' });
    expect(await focused(page)).toBe(at('c', 'button.action.remove'));
    // focus() goes to the first stop: the body where it is pressable, else the retry action, else the remove action.
    await host(page, 'b').evaluate((el: HTMLElement) => el.focus());
    expect(await focused(page)).toBe(at('b', 'button.body.pressable'));
    await set(host(page, 'c'), { status: 'error' });
    await host(page, 'c').evaluate((el: HTMLElement) => el.focus());
    expect(await focused(page)).toBe(at('c', 'button.action.retry'));
    await host(page, 'a').evaluate((el: HTMLElement) => el.focus());
    expect(await focused(page)).toBe(at('a', 'button.action.remove'));
  });

  test('FIT-31: while the icon set cannot draw a glyph the file item draws nothing in its place — never the glyph’s name — and keeps the glyph’s box; it draws the glyph once the set can; removeLabel and retryLabel still reach assistive technology', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: spec.fixtures.filter((f) => ['row-error-retryable', 'row-done', 'row-link-new', 'tile', 'tile-error-retryable'].includes(f.id)) });
    await withoutIconFont(page);
    const glyphs: [Locator, string][] = [
      [own(page, 'row-error-retryable', 'icon'), 'row-icon-size'],
      [own(page, 'row-error-retryable', 'mark'), 'status-icon-size'],
      [own(page, 'row-done', 'mark'), 'status-icon-size'],
      [own(page, 'row-error-retryable', 'retry').locator('.glyph'), 'action-icon-size'],
      [own(page, 'row-error-retryable', 'remove').locator('.glyph'), 'action-icon-size'],
      [own(page, 'row-link-new', 'opens'), 'action-icon-size'],
      [own(page, 'tile', 'icon'), 'tile-icon-size'],
      [own(page, 'tile-error-retryable', 'remove').locator('.glyph'), 'action-icon-size'],
    ];
    const places = [await box(own(page, 'row-error-retryable', 'text')), await box(own(page, 'row-error-retryable', 'remove')), await box(host(page, 'tile'))];
    for (const [i, [glyph, size]] of glyphs.entries()) {
      await expect.poll(() => glyph.getAttribute('data-drawn'), { message: `glyph ${i}` }).toBeNull();
      expect(await css(glyph, 'visibility'), 'never the glyph’s name as text').toBe('hidden');
      const b = await box(glyph);
      near(b.width, await token(page, size), `glyph ${i}: the box is kept`);
      near(b.height, await token(page, size), `glyph ${i}: the box is kept`);
      expect(await css(glyph, 'overflow'), 'a name spelled out widens nothing').toBe('hidden');
    }
    expect([await box(own(page, 'row-error-retryable', 'text')), await box(own(page, 'row-error-retryable', 'remove')), await box(host(page, 'tile'))], 'everything stands where it will stand').toEqual(places);
    // The names still reach assistive technology, and the actions still work.
    await expect(stage(page, 'row-error-retryable').getByRole('button', { name: 'Remove site-photo.png' })).toHaveCount(1);
    await expect(stage(page, 'row-error-retryable').getByRole('button', { name: 'Retry site-photo.png' })).toHaveCount(1);
    await expect(stage(page, 'tile-error-retryable').getByRole('button', { name: 'Retry site-photo.png' })).toHaveCount(1);
    await listen(page);
    await own(page, 'row-error-retryable', 'remove').click();
    expect(await heard(page)).toEqual([{ type: 'remove', value: 'e' }]);
    // The face arrives: the glyphs are drawn.
    await iconFaceArrives(page);
    for (const [i, [glyph]] of glyphs.entries()) {
      await expect.poll(() => glyph.getAttribute('data-drawn'), { message: `glyph ${i}` }).not.toBeNull();
      expect(await css(glyph, 'visibility')).toBe('visible');
    }
    expect([await box(own(page, 'row-error-retryable', 'text')), await box(own(page, 'row-error-retryable', 'remove')), await box(host(page, 'tile'))], 'and nothing moved').toEqual(places);
  });

  test('FIT-32: a child that is not the glyph of the icon slot is not drawn, takes no room and is reported; the icon slot’s glyph is drawn', async ({ page }) => {
    const warnings = logged(page);
    const props = { name: 'kept.pdf', sizeText: '1 MB', ...WORDS };
    await mount(page, [
      { id: 'stray', props, content: 'Loose text<p id="para">A paragraph</p><tanrei-button id="menu">More</tanrei-button><input id="check" type="checkbox" /><span slot="caption" id="caption">A caption</span>' },
      { id: 'stray-tile', props: { ...props, form: 'tile' }, content: '<div id="box">A box</div>' },
      { id: 'slotted', props, content: '<span slot="icon">key</span>' },
      { id: 'blank', props, content: '  \n  <!-- a comment -->  ' },
      fx('clean', props),
      fx('clean-tile', { ...props, form: 'tile' }),
    ]);
    await turn(page);
    // What does not belong is not drawn, takes no room and is not read.
    for (const selector of ['#para', '#menu', '#check', '#caption', '#box']) {
      await expect(page.locator(selector)).toBeHidden();
      expect(await page.locator(selector).evaluate((el) => [el.getBoundingClientRect().width, el.getBoundingClientRect().height, el.assignedSlot])).toEqual([0, 0, null]);
    }
    const loose = await host(page, 'stray').evaluate((el) => {
      const node = [...el.childNodes].find((child) => child.nodeType === Node.TEXT_NODE && child.textContent!.includes('Loose'))!;
      const range = document.createRange();
      range.selectNodeContents(node);
      return range.getBoundingClientRect().height;
    });
    expect(loose).toBe(0);
    for (const [stray, clean] of [['stray', 'clean'], ['stray-tile', 'clean-tile']] as const) {
      const [a, b] = [await box(host(page, stray)), await box(host(page, clean))];
      expect([a.width, a.height], `${stray}: no room for what is not drawn`).toEqual([b.width, b.height]);
    }
    expect(await host(page, 'stray').evaluate((el) => [...el.shadowRoot!.querySelectorAll('slot')].map((slot) => slot.name)), 'the file item has one slot, for the glyph').toEqual(['icon']);
    await expect(stage(page, 'stray').getByRole('checkbox')).toHaveCount(0);
    await expect(stage(page, 'stray').getByRole('button')).toHaveCount(1);
    await start(page);
    await page.locator('#start').focus();
    await tab(page);
    expect(await focused(page), 'what is not drawn is no stop: the first is the file item’s own action').toBe('tanrei-file-item button.action.remove');
    // Each is reported, once; the icon slot's glyph, white space and a comment are not.
    const reported = warnings.filter((text) => text.includes('FIT-32'));
    expect(reported.length).toBe(2);
    expect(reported[0]).toContain('not the glyph of its icon slot');
    await expect(host(page, 'slotted').locator(':scope > [slot="icon"]')).toBeVisible();
    // A child added while it is shown is reported too.
    await host(page, 'clean').evaluate(async (el: HTMLElement & { updateComplete: Promise<unknown>; requestUpdate: () => void }) => {
      el.insertAdjacentHTML('beforeend', '<em id="late">late</em>');
      el.requestUpdate();
      await el.updateComplete;
    });
    await expect(page.locator('#late')).toBeHidden();
    expect(warnings.filter((text) => text.includes('FIT-32')).length).toBe(3);
  });

  test('FIT-33: it does not upload and knows no more of a file than its props say — showing, pressing, removing and retrying a file item make no request other than the browser’s own for previewSrc and read no file; it sets neither status nor progress; name and mediaType left empty are what the browser reports of the file it was given, and nothing else is taken from it; nothing is loaded about a destination', async ({ page }) => {
    const seen: string[] = [];
    page.on('request', (request) => {
      if (!/^(data|blob|about):/.test(request.url())) seen.push(request.url());
    });
    await page.route('http://pictures.tanrei.test/**', (route) => route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from(PNG, 'base64') }));
    await page.route('http://files.tanrei.test/**', (route) => route.fulfill({ status: 200, contentType: 'text/plain', body: 'never asked for' }));
    await mount(page, [
      fx('a', { name: '', status: 'uploading', statusText: 'Uploading', progress: 0.2, ...WORDS }),
      fx('b', { name: 'given-name.txt', mediaType: 'text/plain', status: 'error', errorText: 'Lost.', retryable: true, interactive: true, ...WORDS }),
      fx('c', { form: 'tile', name: 'remote.png', preview: true, previewSrc: 'http://pictures.tanrei.test/small.png', href: 'http://files.tanrei.test/remote.png', target: 'new', targetLabel: 'opens in a new tab', download: 'remote.png', ...WORDS }),
      fx('d', { form: 'tile', name: '', preview: true, ...WORDS }),
    ]);
    await watchCost(page);
    await listen(page);
    // The file itself, as the browser's handle: its name and its kind are read where the props are empty — and nothing else.
    const taken = await host(page, 'a').evaluate(async (el: HTMLElement & { file: File | null; updateComplete: Promise<unknown> }) => {
      const read: string[] = [];
      const file = new File([new Uint8Array(2048)], 'quarterly-budget.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', lastModified: 1767225600000 });
      const watched = new Proxy(file, {
        get(target, key) {
          if (typeof key === 'string') read.push(key);
          const value = Reflect.get(target, key, target);
          return typeof value === 'function' ? value.bind(target) : value;
        },
        getPrototypeOf: () => File.prototype,
      });
      el.file = watched as File;
      await el.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { read: [...new Set(read)].sort(), same: el.file === watched };
    });
    expect(taken.same, 'it keeps the handle it was given, and no copy').toBe(true);
    expect(taken.read, 'only the name and the type are read of a file').toEqual(['name', 'type']);
    await expect(own(page, 'a', 'headline')).toHaveText('quarterly-budget.xlsx');
    await expect(own(page, 'a', 'icon')).toHaveText('table');
    expect(await host(page, 'a').getAttribute('aria-label')).toBe('quarterly-budget.xlsx');
    await expect(own(page, 'a', 'remove')).toHaveAttribute('aria-label', 'Remove quarterly-budget.xlsx');
    await expect(own(page, 'a', 'supporting'), 'no size is taken from the file').toHaveText(/^\s*Uploading\s*$/);
    expect(await host(page, 'a').evaluate((el: HTMLElement & { name: string; mediaType: string }) => [el.name, el.mediaType, el.getAttribute('name')]), 'its props stay as the product left them').toEqual(['', '', '']);
    // The props win over what the file says.
    await give(host(page, 'b'), 'on-disk.png', 'image/png');
    await expect(own(page, 'b', 'headline')).toHaveText('given-name.txt');
    await expect(own(page, 'b', 'icon')).toHaveText('description');
    // An image file with preview: drawn by the browser from its handle, with its name.
    await give(host(page, 'd'), 'holiday.png', 'image/png');
    await expect(own(page, 'd', 'preview')).toHaveAttribute('data-drawn', '');
    expect(await nameText(page, 'd')).toBe('holiday.png');
    await expect(own(page, 'c', 'preview')).toHaveAttribute('data-drawn', '');
    // Pressing, retrying and removing: events, and nothing else — no status, no progress, no request.
    await own(page, 'b', 'body').click();
    await own(page, 'b', 'retry').click();
    await own(page, 'b', 'remove').click();
    await own(page, 'a', 'remove').click();
    await own(page, 'd', 'remove').click();
    await own(page, 'c', 'body').hover();
    await own(page, 'c', 'body').focus();
    await turn(page, 300);
    expect((await heard(page)).map((each) => `${each.type}:${each.value}`)).toEqual(['click:b', 'retry:b', 'remove:b', 'remove:a', 'remove:d']);
    expect(await host(page, 'a').evaluate((el: HTMLElement & { status: string; progress: number }) => [el.status, el.progress, el.getAttribute('status'), el.getAttribute('progress'), el.isConnected]), 'it sets neither status nor progress, and removes nothing').toEqual(['uploading', 0.2, 'uploading', '0.2', true]);
    expect(await host(page, 'b').evaluate((el: HTMLElement & { status: string; retryable: boolean }) => [el.status, el.retryable])).toEqual(['error', true]);
    await expect(page.locator(TAG)).toHaveCount(4);
    // It is no form control and submits nothing.
    expect(await page.evaluate(() => [(customElements.get('tanrei-file-item') as unknown as { formAssociated?: boolean }).formAssociated ?? false, document.querySelectorAll('tanrei-file-item').length, [...document.querySelectorAll('tanrei-file-item')].flatMap((el) => [...el.shadowRoot!.querySelectorAll('input, form, iframe, object, embed')]).length])).toEqual([false, 4, 0]);
    // Taken out of the page.
    await host(page, 'd').evaluate((el) => el.remove());
    await turn(page, 50);
    const c = await cost(page);
    expect(c.read, 'no reader, no stream, no fetch').toEqual([]);
    expect(c.created.length, 'one address, for the one picture drawn of a file').toBe(1);
    expect(live(c)).toEqual([]);
    // The only request is the browser's own for previewSrc; nothing is loaded about the destination.
    expect(seen).toEqual(['http://pictures.tanrei.test/small.png']);
    expect(await own(page, 'c', 'body').evaluate((el) => [el.getAttribute('href'), el.getAttribute('download'), el.getAttribute('target')]), 'following href is the browser’s navigation').toEqual(['http://files.tanrei.test/remote.png', 'remote.png', '_blank']);
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      // `row-without-words` shows what a product must not ship: actions nobody named (FIT-20 reports them).
      await mountFixtures(page, spec, { icons: true, theme, fixtures: spec.fixtures.filter((f) => f.id !== 'row-without-words') });
      for (const f of spec.fixtures.filter((each) => each.props.previewSrc)) await expect(own(page, f.id, 'preview'), f.id).toHaveAttribute('data-drawn', '');
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, theme).toEqual([]);
    }
  });

  test('no axe violations while a body and an action are hovered, focused and disabled, in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mount(page, spec.fixtures.filter((f) => ['row-interactive', 'row-link-new', 'tile-interactive', 'tile-read-only', 'row-disabled', 'tile-disabled', 'row-error-retryable'].includes(f.id)), { theme, reducedMotion: true });
      await start(page);
      for (const [id, name] of [['row-interactive', 'body'], ['row-error-retryable', 'remove'], ['tile-interactive', 'body'], ['row-link-new', 'body']] as const) {
        await page.locator('#start').focus();
        await tabTo(page, own(page, id, name));
        const b = await box(own(page, 'tile-read-only', 'media'));
        await page.mouse.move(b.x + 8, b.y + b.height - 8);
        const results = await new AxeBuilder({ page }).include('.stage').analyze();
        expect(results.violations, `${theme}: ${id} ${name} focused`).toEqual([]);
      }
      await page.mouse.move(2, 2);
    }
  });

  test('the fixture without words fails only for the names it lacks', async ({ page }) => {
    await mountSpec(page, 'row-without-words');
    const results = await new AxeBuilder({ page }).include('.stage').analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual(['button-name']);
  });

  test('every fixture is a group named by its file, and the keyboard reaches its pressable body and each enabled action, in that order, and nothing else', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    for (const f of spec.fixtures) {
      await expect(stage(page, f.id).getByRole('group', { name: String(f.props.name), exact: true }), f.id).toHaveCount(1);
      const stops = await host(page, f.id).evaluate((el) => [...el.shadowRoot!.querySelectorAll<HTMLElement>('*')].filter((node) => node.tabIndex >= 0 && !(node as HTMLButtonElement).disabled).map((node) => node.classList[1] === 'pressable' ? 'body' : node.classList[1]));
      const expected = f.props.disabled ? [] : [...(f.props.interactive || f.props.href ? ['body'] : []), ...(f.props.readOnly ? [] : [...(f.props.status === 'error' && f.props.retryable ? ['retry'] : []), 'remove'])];
      expect(stops, `${f.id}: the stops`).toEqual(expected);
    }
  });
});

test.describe('fixtures', () => {
  test('every fixture is mounted and visible, with the form, the texts, the glyph, the picture and the actions the spec gives it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    expect(spec.fixtures).toHaveLength(46);
    const { glyphs } = formatTable();
    for (const f of spec.fixtures) {
      const item = host(page, f.id);
      await expect(item, f.id).toBeVisible();
      const tile = f.props.form === 'tile';
      expect(await own(page, f.id, 'item').getAttribute('data-form'), f.id).toBe(tile ? 'tile' : 'row');
      if (!tile) near((await box(item)).width, 360, `${f.id}: its stage’s column`);
      else near((await box(item)).width, (await box(own(page, f.id, 'media'))).width, `${f.id}: as wide as its box`);
      expect(await stage(page, f.id).getAttribute('dir'), f.id).toBe(f.direction ?? null);
      expect(await nameText(page, f.id), `${f.id}: the name`).toBe(String(f.props.name));
      for (const prop of ['formatText', 'sizeText'] as const) if (f.props[prop]) await expect(own(page, f.id, 'supporting'), `${f.id}: ${prop}`).toContainText(String(f.props[prop]));
      if (f.props.status === 'error' && f.props.errorText) await expect(own(page, f.id, 'supporting'), f.id).toContainText(String(f.props.errorText));
      else if (f.props.statusText) await expect(own(page, f.id, 'supporting'), f.id).toContainText(String(f.props.statusText));
      await expect(own(page, f.id, 'bar'), f.id).toHaveCount(f.props.status === 'uploading' ? 1 : 0);
      await expect(own(page, f.id, 'remove'), f.id).toHaveCount(f.props.readOnly ? 0 : 1);
      await expect(own(page, f.id, 'retry'), f.id).toHaveCount(!f.props.readOnly && f.props.status === 'error' && f.props.retryable ? 1 : 0);
      expect(await own(page, f.id, 'body').evaluate((el) => el.localName), `${f.id}: the body`).toBe(f.props.href ? 'a' : f.props.interactive ? 'button' : 'div');
      // The picture where the fixture gives an address; the glyph where it gives none.
      await expect(own(page, f.id, 'preview'), f.id).toHaveCount(f.props.preview && f.props.previewSrc ? 1 : 0);
      if (f.props.preview && f.props.previewSrc) await expect(own(page, f.id, 'preview'), `${f.id}: the picture is drawn`).toHaveAttribute('data-drawn', '');
      const kind = /^kind-(\w+)$/.exec(f.id)?.[1] as Kind | undefined;
      if (kind) await expect(own(page, f.id, 'icon'), f.id).toHaveText(glyphs[kind]);
      if (f.props.glyph) await expect(own(page, f.id, 'icon'), f.id).toHaveText(String(f.props.glyph));
      if (f.slots?.icon) await expect(item.locator(':scope > [slot="icon"]'), f.id).toHaveText(String(f.slots.icon));
      // Every glyph is drawn by the icon set.
      const drawn = item.locator('.icon:not(.given), .glyph, .mark');
      for (const glyph of await drawn.all()) await expect.poll(() => glyph.getAttribute('data-drawn'), { message: `${f.id}: ${await glyph.textContent()}` }).not.toBeNull();
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true, reducedMotion: true });
      if (f.props.preview && f.props.previewSrc) await expect(own(page, f.id, 'preview')).toHaveAttribute('data-drawn', '');
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
