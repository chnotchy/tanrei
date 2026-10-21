// <tanrei-one-time-code-input>, driven by specs/one-time-code-input.spec.json: every behaviour id (OTC-1…30) is cited by
// a test title, every fixture has a baseline, and every length and color is read back from the tokens — never from a
// number written here (the numbers of a spec's own `verify` are the default system's, and are named as such).
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, type FixtureItem, loadSpec, missingWords, mountFixtures, resolveColor, resolveToken, tab, tabTo, rootTokens } from '../../../test/harness.js';

const spec = loadSpec('one-time-code-input');
const fieldSpec = loadSpec('field');
type P = Page;
const TAG = 'tanrei-one-time-code-input';
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] ${TAG}`);
const native = (page: P, id: string) => host(page, id).locator('.input');
const cells = (page: P, id: string) => host(page, id).locator('.cell');
const T = (name: string) => `--tanrei-comp-one-time-code-input-${name}`;
const token = (page: P, name: string) => resolveToken(page, T(name));
const color = (page: P, name: string) => resolveColor(page, T(name));
const box = async (locator: Locator) => (await locator.boundingBox())!;
const near = (actual: number, expected: number, message = '', tolerance = 0.6) => expect(Math.abs(actual - expected), `${message}: ${actual} ≈ ${expected}`).toBeLessThanOrEqual(tolerance);
const LABEL = 'Verification code';
/** A fixture of the test's own. */
const fx = (id: string, props: Fixture['props'] = {}, extra: Partial<Fixture> = {}): Fixture => ({ id, props: { label: LABEL, ...props }, ...extra });
const mount = (page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) => mountFixtures(page, spec, { fixtures, ...options });
const code = (props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'one-time-code-input', props });
/** A field of the test's own around a one-time-code input. */
const framed = (id: string, props: Fixture['props'], inside: FixtureItem['props'] = {}): Fixture => ({ id, props, items: [code(inside)] });
const mountFramed = (page: P, fixtures: Fixture[]) => mountFixtures(page, fieldSpec, { fixtures });
const settled = (page: P, id: string) =>
  host(page, id).evaluate(async (el) => {
    await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    // What the element puts right a turn later (a browser's own selection on focus, the end of a composition).
    await new Promise((resolve) => setTimeout(resolve, 0));
    await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
  });
const set = async (page: P, id: string, props: Record<string, unknown>) => {
  await host(page, id).evaluate((el, p) => Object.assign(el, p), props);
  await settled(page, id);
};
/** What the element holds and draws: the value, the native element's text and selection, each cell's text, and which cells are active, composing, or hold the caret. */
const read = async (page: P, id: string) => {
  await settled(page, id);
  return host(page, id).evaluate((el) => {
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('.input')!;
    const all = [...el.shadowRoot!.querySelectorAll('.cell')];
    const where = (test: (cell: Element) => boolean) => all.flatMap((cell, index) => (test(cell) ? [index] : []));
    return {
      value: (el as HTMLElement & { value: string }).value,
      native: input.value,
      selection: [input.selectionStart, input.selectionEnd] as [number | null, number | null],
      drawn: all.map((cell) => cell.querySelector('.char')?.textContent ?? '').join('|'),
      active: where((cell) => cell.hasAttribute('data-active')),
      composing: where((cell) => !!cell.querySelector('.char[data-composing]')),
      caret: where((cell) => !!cell.querySelector('.caret')),
      focused: el.shadowRoot!.querySelector('.field')!.hasAttribute('data-focused'),
    };
  });
};
/** Every event the element fires from now on, as `type:value`, in order. */
const record = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const log: string[] = [];
    (window as unknown as { __events: string[] }).__events = log;
    for (const type of ['input', 'change', 'complete', 'action']) el.addEventListener(type, (event) => log.push(`${type}:${(event as CustomEvent<{ value: string }>).detail?.value ?? '(native)'}`));
  });
const events = (page: P) => page.evaluate(() => (window as unknown as { __events: string[] }).__events.splice(0));
const focus = async (page: P, id: string) => {
  await host(page, id).evaluate((el) => (el as HTMLElement).focus());
  await settled(page, id);
};
/** A press of the pointer at the centre of a cell (the native element lies over it). */
const pressCell = async (page: P, id: string, index: number) => {
  const b = await box(cells(page, id).nth(index));
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await settled(page, id);
};
/** Text that reaches the field in one piece, as the browser hands it over: `paste` and `drop` carry it, `fill` is an autofill (the element's text replaced, then `input`, with no `beforeinput`). */
const give = async (page: P, id: string, how: 'paste' | 'drop' | 'fill' | 'fill-untyped', text: string) => {
  await native(page, id).evaluate(
    (input, [h, t]) => {
      const element = input as HTMLInputElement;
      if (h === 'paste' || h === 'drop') {
        const event = new Event(h, { bubbles: true, cancelable: true, composed: true });
        Object.defineProperty(event, h === 'paste' ? 'clipboardData' : 'dataTransfer', { value: { getData: (type: string) => (type === 'text/plain' || type === 'text' ? t : ''), setData: () => {} } });
        element.dispatchEvent(event);
        return;
      }
      element.value = t;
      element.dispatchEvent(h === 'fill' ? new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertReplacementText' }) : new Event('input', { bubbles: true, composed: true }));
    },
    [how, text] as const,
  );
  await settled(page, id);
};
/** Copy or cut, as the browser's command fires it: what the element put on the clipboard (null: nothing), and whether it took the event. */
const clip = async (page: P, id: string, type: 'copy' | 'cut') => {
  const result = await native(page, id).evaluate((input, t) => {
    let taken: string | null = null;
    const event = new Event(t, { bubbles: true, cancelable: true, composed: true });
    Object.defineProperty(event, 'clipboardData', { value: { setData: (_: string, text: string) => (taken = text), getData: () => '' } });
    input.dispatchEvent(event);
    return { taken, prevented: event.defaultPrevented };
  }, type);
  await settled(page, id);
  return result;
};
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
/** The left edge, width and top of every cell, relative to `origin`. */
const layout = async (page: P, id: string, origin: Locator = host(page, id)) => {
  const o = await box(origin);
  const all = await cells(page, id).evaluateAll((list) => list.map((cell) => cell.getBoundingClientRect()).map((r) => ({ x: r.left, y: r.top, width: r.width, height: r.height })));
  return all.map((r) => ({ x: r.x - o.x, y: r.y - o.y, width: r.width, height: r.height }));
};
const rowsOf = (list: { y: number }[]) => [...new Set(list.map((cell) => Math.round(cell.y)))].map((y) => list.filter((cell) => Math.round(cell.y) === y).length);
const cellStyle = (page: P, id: string, index: number) =>
  cells(page, id)
    .nth(index)
    .evaluate((cell) => {
      const edge = getComputedStyle(cell, '::before');
      const own = getComputedStyle(cell);
      return { fill: own.backgroundColor, color: own.color, edge: edge.borderTopColor, edgeWidth: Number.parseFloat(edge.borderTopWidth), radius: Number.parseFloat(own.borderTopLeftRadius) };
    });
/** One Chromium accessibility node by role, over the DevTools protocol. */
async function axTree(page: P) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  return nodes
    .filter((node) => !node.ignored)
    .map((node) => {
      const property = (name: string) => node.properties?.find((p) => p.name === name)?.value.value;
      return {
        role: node.role?.value as string,
        name: (node.name?.value ?? '') as string,
        description: (node.description?.value ?? '') as string,
        value: (node.value?.value ?? '') as string,
        invalid: property('invalid'),
        required: property('required'),
        readonly: property('readonly'),
        disabled: property('disabled'),
        focusable: property('focusable'),
      };
    });
}
const textboxes = async (page: P) => (await axTree(page)).filter((node) => node.role === 'textbox');

// ── An input method ──────────────────────────────────────────────────────────────────────────────────────────────
// Chromium is driven by a real composition (CDP `Input.imeSetComposition`). Firefox and WebKit cannot be: no test API
// starts an input method in them, so the events a composition fires are dispatched by hand, in the order each engine
// documents and is known to use — which is what differs between them, and what the element must not depend on:
//
//   chromium  keydown(229) · compositionstart · [beforeinput · compositionupdate · input(insertCompositionText)]… ·
//             commit: beforeinput · compositionupdate · input(insertCompositionText) · compositionend · keyup
//   firefox   … the same while composing … commit: compositionend, THEN input(insertCompositionText, isComposing false)
//   webkit    … the same while composing … commit: input(deleteCompositionText) · input(insertFromComposition) ·
//             compositionend, THEN keydown(Enter, keyCode 229, isComposing FALSE)
//
// A real input method in Firefox and Safari is a check by hand.
type Order = 'chromium' | 'firefox' | 'webkit';
const ORDERS: Order[] = ['chromium', 'firefox', 'webkit'];
/** One composition dispatched by hand on the native element: the steps it shows, then a commit (a string), or a cancel (null). `enter` commits with the Enter key. */
const compose = async (page: P, id: string, order: Order, steps: string[], commit: string | null, { enter = true } = {}) => {
  await native(page, id).evaluate(
    (input, [o, s, c, e]) => {
      const element = input as HTMLInputElement;
      const start = element.selectionStart ?? element.value.length;
      const end = element.selectionEnd ?? start;
      const before = element.value.slice(0, start);
      const after = element.value.slice(end);
      const put = (text: string) => {
        element.value = before + text + after;
        element.setSelectionRange(before.length + text.length, before.length + text.length);
      };
      const key = (type: string, name: string, composing: boolean, code229: boolean) => {
        const event = new KeyboardEvent(type, { key: name, bubbles: true, cancelable: true, composed: true, isComposing: composing });
        if (code229) Object.defineProperty(event, 'keyCode', { value: 229 });
        element.dispatchEvent(event);
      };
      const composition = (type: string, data: string) => element.dispatchEvent(new CompositionEvent(type, { data, bubbles: true, composed: true }));
      const inputEvent = (type: 'beforeinput' | 'input', inputType: string, data: string | null, composing: boolean) =>
        element.dispatchEvent(new InputEvent(type, { inputType, data, isComposing: composing, bubbles: true, composed: true, cancelable: type === 'beforeinput' && inputType !== 'insertCompositionText' }));
      key('keydown', 'Process', false, true);
      composition('compositionstart', '');
      for (const text of s) {
        inputEvent('beforeinput', 'insertCompositionText', text, true);
        composition('compositionupdate', text);
        put(text);
        inputEvent('input', 'insertCompositionText', text, true);
      }
      const final = c ?? '';
      const name = c === null ? 'Escape' : e ? 'Enter' : 'Process';
      if (o === 'chromium') {
        key('keydown', name, true, true);
        inputEvent('beforeinput', 'insertCompositionText', final, true);
        composition('compositionupdate', final);
        put(final);
        inputEvent('input', 'insertCompositionText', final, true);
        composition('compositionend', final);
      } else if (o === 'firefox') {
        key('keydown', name, true, true);
        inputEvent('beforeinput', 'insertCompositionText', final, true);
        composition('compositionupdate', final);
        put(final);
        composition('compositionend', final);
        inputEvent('input', 'insertCompositionText', final, false);
      } else {
        inputEvent('beforeinput', 'deleteCompositionText', null, true);
        put('');
        inputEvent('input', 'deleteCompositionText', null, true);
        inputEvent('beforeinput', 'insertFromComposition', final, true);
        put(final);
        inputEvent('input', 'insertFromComposition', final, true);
        composition('compositionend', final);
        key('keydown', name, false, true);
      }
      key('keyup', name, false, false);
    },
    [order, steps, commit, enter] as const,
  );
  await settled(page, id);
};
/** The steps of a composition without its end, by hand (the same in every engine). */
const composing = async (page: P, id: string, steps: string[]) => {
  await native(page, id).evaluate((input, s) => {
    const element = input as HTMLInputElement;
    const start = element.selectionStart ?? element.value.length;
    const before = element.value.slice(0, start);
    const after = element.value.slice(element.selectionEnd ?? start);
    element.dispatchEvent(new CompositionEvent('compositionstart', { data: '', bubbles: true, composed: true }));
    for (const text of s) {
      element.dispatchEvent(new CompositionEvent('compositionupdate', { data: text, bubbles: true, composed: true }));
      element.value = before + text + after;
      element.dispatchEvent(new InputEvent('input', { inputType: 'insertCompositionText', data: text, isComposing: true, bubbles: true, composed: true }));
    }
  }, steps);
  await host(page, id).evaluate((el) => (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete);
};

test.describe('behavior', () => {
  test('OTC-1: one row of length cells in the order of the code, each container.height high and container.width wide with the container’s corners and fill, container.gap apart; the row starts at the start edge and is as wide as its cells need, the field as tall as its row; it draws no label, help, error text, placeholder or container — six cells are 270 by 48 under the default system', async ({ page }) => {
    await mountFixtures(page, spec);
    const [height, width, gap, radius] = [await token(page, 'container-height'), await token(page, 'container-width'), await token(page, 'container-gap'), await token(page, 'container-shape')];
    const fill = await color(page, 'standard-container-color');
    for (const [id, count] of [['empty', 6], ['complete', 6], ['length-4', 4]] as const) {
      const list = await layout(page, id);
      expect(list, id).toHaveLength(count);
      list.forEach((cell, index) => {
        near(cell.x, index * (width + gap), `${id} cell ${index} x`);
        near(cell.width, width, `${id} cell ${index} width`);
        near(cell.height, height, `${id} cell ${index} height`);
        near(cell.y, 0, `${id} cell ${index} y`);
      });
      const style = await cellStyle(page, id, 0);
      expect(style.fill, id).toBe(fill);
      near(style.radius, radius, `${id} corner`);
      // As tall as its row; the row as wide as its cells and gaps.
      near((await box(host(page, id))).height, height, `${id} height`);
      near((await box(native(page, id))).width, count * width + (count - 1) * gap, `${id} row width`);
    }
    // The default system's numbers (the spec's verify).
    expect([width, gap, height]).toEqual([40, 6, 48]);
    near((await box(native(page, 'empty'))).width, 270, 'six cells');
    // Where nothing gives it a width it is as wide as its row.
    await mount(page, [fx('free')]);
    await page.addStyleTag({ content: '.stage { inline-size: auto !important; }' });
    near((await box(host(page, 'free'))).width, 270, 'the field alone');
    // Nothing but the cells is drawn: no label, no placeholder, no text of any kind.
    expect(await host(page, 'free').evaluate((el) => el.shadowRoot!.querySelector('.field')!.textContent!.trim())).toBe('');
    expect(await native(page, 'free').getAttribute('placeholder')).toBeNull();
    expect(await host(page, 'free').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  });

  test('OTC-2: one field — exactly one native text element and no input per cell, one stop for Tab forwards and backwards, one text box whose value is the whole code; the cells, the caret and the group marks are hidden from assistive technology and take no focus', async ({ page, browserName }) => {
    await mount(page, [fx('code', { groupSize: 3, value: '1234' })]);
    await page.evaluate(() => {
      document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<button id="before">Before</button>');
      document.querySelector('main')!.insertAdjacentHTML('beforeend', '<button id="after">After</button>');
    });
    expect(await host(page, 'code').evaluate((el) => el.shadowRoot!.querySelectorAll('input, textarea, [contenteditable], [tabindex]').length)).toBe(1);
    expect(await native(page, 'code').getAttribute('type')).toBe('text');
    expect(await host(page, 'code').evaluate((el) => el.shadowRoot!.querySelector('.row')!.getAttribute('aria-hidden'))).toBe('true');
    expect(await host(page, 'code').evaluate((el) => [...el.shadowRoot!.querySelectorAll('.cell, .mark, .caret')].every((part) => !!part.closest('[aria-hidden="true"]')))).toBe(true);
    // Tab enters it once and leaves it once, both ways.
    const active = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.localName);
    await page.locator('#before').focus();
    await tabTo(page, host(page, 'code'));
    expect(await active()).toBe(TAG);
    await tabTo(page, page.locator('#after'));
    await tab(page, { back: true });
    expect(await active()).toBe(TAG);
    await tab(page, { back: true });
    expect(await active()).toBe('before');
    // The role tree as each engine's elements give it: one text box, named, holding the whole code.
    await expect(stage(page, 'code')).toMatchAriaSnapshot(`- textbox "${LABEL}": "1234"`);
    if (browserName === 'chromium') {
      const boxes = await textboxes(page);
      expect(boxes).toHaveLength(1);
      expect(boxes[0]).toMatchObject({ name: LABEL, value: '1234' });
      // Nothing of the drawing is a node: no digit and no mark is read a second time.
      const texts = (await axTree(page)).filter((node) => node.role === 'StaticText' || node.role === 'InlineTextBox').map((node) => node.name);
      expect(texts.filter((text) => /^[1-4•]$/.test(text))).toEqual([]);
    }
  });

  test('OTC-3: each character stands centred in the cell of its place, on one line, in input.typescale with tabular figures and the input color; cells past the end of the value are empty, and an empty cell and a filled one have the same box and fill', async ({ page }) => {
    await mountFixtures(page, spec);
    expect((await read(page, 'partial')).drawn).toBe('1|2|3|||');
    expect((await read(page, 'alphanumeric-grouped')).drawn).toBe('A|7|K|9|3|Q');
    const list = await layout(page, 'partial');
    expect(new Set(list.map((cell) => `${cell.width}x${cell.height}`)).size).toBe(1);
    expect((await cellStyle(page, 'partial', 0)).fill).toBe((await cellStyle(page, 'partial', 5)).fill);
    expect((await cellStyle(page, 'partial', 0)).color).toBe(await color(page, 'standard-input-color'));
    const char = cells(page, 'partial').nth(1).locator('.char');
    const [cell, glyph] = [await box(cells(page, 'partial').nth(1)), await box(char)];
    near(glyph.x + glyph.width / 2, cell.x + cell.width / 2, 'centred across');
    near(glyph.y + glyph.height / 2, cell.y + cell.height / 2, 'centred down');
    const style = await char.evaluate((el) => {
      const s = getComputedStyle(el);
      return { size: Number.parseFloat(s.fontSize), numeric: s.fontVariantNumeric, space: s.whiteSpace };
    });
    near(style.size, await resolveToken(page, T('input-typescale-font-size')), 'text size');
    expect(style.numeric).toBe('tabular-nums');
    near(glyph.height, style.size * Number(await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n), T('input-typescale-line-height'))), 'one line', 1);
  });

  test('OTC-4: the value holds only what its type permits, read leniently — digits of any script and full-width digits and letters as ASCII, lower case as upper case; a character that is not permitted is dropped without entering a cell, moving the active cell or firing an event', async ({ page }) => {
    await mount(page, [fx('n'), fx('a', { type: 'alphanumeric' })]);
    await record(page, 'n');
    await focus(page, 'n');
    // Arabic-Indic, full-width, Devanagari and Bengali digits, typed one by one.
    for (const char of ['١', '２', '३', '৪']) await page.keyboard.insertText(char);
    expect((await read(page, 'n')).value).toBe('1234');
    expect(await events(page)).toEqual(['input:1', 'input:12', 'input:123', 'input:1234']);
    // A letter, a symbol and a space typed into a numeric field change nothing.
    for (const char of ['a', 'Z', '-', ' ', '.', '①']) await page.keyboard.insertText(char);
    await page.keyboard.type('x+');
    expect(await read(page, 'n')).toMatchObject({ value: '1234', native: '1234', active: [4], selection: [4, 4] });
    expect(await events(page)).toEqual([]);
    await focus(page, 'a');
    await page.keyboard.type('a7k');
    for (const char of ['ｂ', 'Ｃ', '９', 'é', 'ß', 'あ']) await page.keyboard.insertText(char);
    expect((await read(page, 'a')).value).toBe('A7KBC9');
    // An input method that commits "１２３" gives "123" (the spec's verify).
    await set(page, 'n', { value: '' });
    await focus(page, 'n');
    await compose(page, 'n', 'chromium', ['１', '１２', '１２３'], '１２３');
    expect((await read(page, 'n')).value).toBe('123');
  });

  test('OTC-5: while focused one cell is active — the first empty cell, or the last while all are filled — when focus enters by the keyboard, from the product or by a field’s label, and none when it leaves; the native element’s insertion point stands at the active cell, before its character while it is filled', async ({ page }) => {
    await mount(page, [fx('empty'), fx('part', { value: '1234' }), fx('full', { value: '123456' })]);
    expect(await read(page, 'part')).toMatchObject({ active: [], focused: false });
    await tabTo(page, host(page, 'empty'));
    expect(await read(page, 'empty')).toMatchObject({ active: [0], selection: [0, 0], caret: [0] });
    await tabTo(page, host(page, 'part'));
    expect(await read(page, 'empty')).toMatchObject({ active: [], caret: [], focused: false });
    expect(await read(page, 'part')).toMatchObject({ active: [4], selection: [4, 4], caret: [4] });
    await tabTo(page, host(page, 'full'));
    // All filled: the last cell, and the insertion point before its character.
    expect(await read(page, 'full')).toMatchObject({ active: [5], selection: [5, 5], caret: [] });
    await focus(page, 'part');
    expect(await read(page, 'part')).toMatchObject({ active: [4], selection: [4, 4] });
    // The spec's verify: the second cell made active, the selection starts at 1; after a character typed there, at 2.
    await pressCell(page, 'part', 1);
    expect(await read(page, 'part')).toMatchObject({ active: [1], selection: [1, 1] });
    await page.keyboard.type('9');
    expect(await read(page, 'part')).toMatchObject({ value: '1934', active: [2], selection: [2, 2] });
  });

  test('OTC-6: a permitted character goes into the active cell in place of what it holds and the next cell becomes active; on the last cell it stays, so a further character replaces the last and nothing is typed past the end; focus never leaves because the code is complete', async ({ page }) => {
    await mount(page, [fx('code')]);
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('beforeend', '<button id="after">After</button>'));
    await focus(page, 'code');
    await page.keyboard.type('12345');
    expect(await read(page, 'code')).toMatchObject({ value: '12345', active: [5], caret: [5] });
    await page.keyboard.type('6');
    expect(await read(page, 'code')).toMatchObject({ value: '123456', active: [5], caret: [], selection: [5, 5], focused: true });
    await page.keyboard.type('78');
    expect(await read(page, 'code')).toMatchObject({ value: '123458', native: '123458', active: [5], focused: true });
    expect(await page.evaluate(() => document.activeElement?.localName)).toBe(TAG);
    // Replacing in the middle shifts nothing.
    await pressCell(page, 'code', 2);
    await page.keyboard.type('00');
    expect(await read(page, 'code')).toMatchObject({ value: '120058', active: [4] });
  });

  test('OTC-6: text an input method is composing is drawn in the cells from the active cell on, marked as composing, without a change of value or an event; committed, it is read character by character; cancelled, it leaves the cells — a real composition in Chromium', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium drives an input method from a test (CDP Input.imeSetComposition)');
    await mount(page, [fx('code', { value: '12' })]);
    await record(page, 'code');
    await focus(page, 'code');
    const cdp = await page.context().newCDPSession(page);
    for (const text of ['３', '３４', '３４５']) await cdp.send('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length });
    expect(await read(page, 'code')).toMatchObject({ value: '12', drawn: '1|2|3|4|5|', composing: [2, 3, 4], active: [5] });
    expect(await cells(page, 'code').nth(2).locator('.char').evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe('underline');
    expect(await events(page)).toEqual([]);
    await cdp.send('Input.insertText', { text: '３４５' }); // commit
    expect(await read(page, 'code')).toMatchObject({ value: '12345', native: '12345', drawn: '1|2|3|4|5|', composing: [], active: [5], selection: [5, 5] });
    expect(await events(page)).toEqual(['input:12345']);
    // A composition that is cancelled leaves nothing.
    await cdp.send('Input.imeSetComposition', { text: '９', selectionStart: 1, selectionEnd: 1 });
    expect(await read(page, 'code')).toMatchObject({ value: '12345', drawn: '1|2|3|4|5|9', composing: [5] });
    await cdp.send('Input.imeSetComposition', { text: '', selectionStart: 0, selectionEnd: 0 });
    await cdp.send('Input.insertText', { text: '' });
    expect(await read(page, 'code')).toMatchObject({ value: '12345', native: '12345', drawn: '1|2|3|4|5|', composing: [] });
    expect(await events(page)).toEqual([]);
    // What the method composes that a cell cannot hold (kana on the way to a digit) is not drawn and not taken.
    await cdp.send('Input.imeSetComposition', { text: 'ろく', selectionStart: 2, selectionEnd: 2 });
    expect(await read(page, 'code')).toMatchObject({ drawn: '1|2|3|4|5|', composing: [] });
    await cdp.send('Input.insertText', { text: '６' });
    expect(await read(page, 'code')).toMatchObject({ value: '123456', native: '123456' });
    expect(await events(page)).toEqual(['input:123456', 'complete:123456']);
    await cdp.detach();
  });

  for (const order of ORDERS) {
    test(`OTC-6: a composition whose events arrive in ${order}’s order draws its text in the cells while it composes, changes the value once when it commits — replacing from the active cell, character by character — and leaves nothing when it is cancelled`, async ({ page }) => {
      await mount(page, [fx('code', { value: '1234' })]);
      await record(page, 'code');
      await focus(page, 'code');
      await pressCell(page, 'code', 1);
      await composing(page, 'code', ['７', '７８']);
      expect(await read(page, 'code')).toMatchObject({ value: '1234', drawn: '1|7|8|4||', composing: [1, 2] });
      expect(await events(page)).toEqual([]);
      // The same composition from its start, to its commit.
      await set(page, 'code', { value: '1234' });
      await native(page, 'code').evaluate((input) => input.dispatchEvent(new CompositionEvent('compositionend', { data: '', bubbles: true, composed: true })));
      await pressCell(page, 'code', 1);
      await compose(page, 'code', order, ['７', '７８'], '７８');
      expect(await read(page, 'code')).toMatchObject({ value: '1784', native: '1784', drawn: '1|7|8|4||', composing: [], active: [3], selection: [3, 3] });
      expect(await events(page)).toEqual(['input:1784']);
      // Cancelled: the cells show the value again, and nothing fired.
      await compose(page, 'code', order, ['９'], null);
      expect(await read(page, 'code')).toMatchObject({ value: '1784', native: '1784', drawn: '1|7|8|4||', composing: [] });
      expect(await events(page)).toEqual([]);
      // Typing goes on as before.
      await page.keyboard.type('5');
      expect(await read(page, 'code')).toMatchObject({ value: '1785', native: '1785' });
    });
  }

  test('OTC-7: hovered, every cell reads the hovered tokens; focused — by pointer as by keyboard — the active cell alone reads the focused ones and draws the focused line inside its edge, with no state layer, no ring and no change of any box; focused wins over hovered', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount(page, [fx('code', { value: '123' }), fx('wrong', { value: '123', error: true })]);
    const [rest, hovered, focusLine, focusWidth, restWidth] = [
      await color(page, 'standard-container-color'),
      await color(page, 'standard-hovered-container-color'),
      await color(page, 'standard-focused-outline-color'),
      await token(page, 'focused-outline-width'),
      await token(page, 'outline-width'),
    ];
    expect(hovered).not.toBe(rest);
    const before = await layout(page, 'code');
    const b = await box(cells(page, 'code').nth(5));
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    for (let index = 0; index < 6; index++) expect(await cellStyle(page, 'code', index), `hovered ${index}`).toMatchObject({ fill: hovered, edge: 'rgba(0, 0, 0, 0)' });
    // Focus by the pointer selects the focused state too: a field shows where typing will go however it was focused.
    await page.mouse.down();
    await page.mouse.up();
    expect(await read(page, 'code')).toMatchObject({ active: [3] });
    expect(await cellStyle(page, 'code', 3)).toMatchObject({ fill: await color(page, 'standard-focused-container-color'), edge: focusLine, edgeWidth: focusWidth });
    expect(await cellStyle(page, 'code', 3)).toMatchObject({ fill: rest });
    for (const index of [0, 1, 2, 4, 5]) expect(await cellStyle(page, 'code', index), `still hovered ${index}`).toMatchObject({ fill: hovered, edge: 'rgba(0, 0, 0, 0)', edgeWidth: restWidth });
    expect(await layout(page, 'code')).toEqual(before);
    // No ring: the native element and the cells draw no outline.
    expect(await native(page, 'code').evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none');
    expect(await cells(page, 'code').nth(3).evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none');
    // By the keyboard: the same line on the active cell, the others at rest.
    await page.mouse.move(0, 0);
    await tabTo(page, host(page, 'wrong'));
    expect(await cellStyle(page, 'wrong', 3)).toMatchObject({ edge: await color(page, 'standard-focused-error-outline-color'), edgeWidth: focusWidth });
    expect(await cellStyle(page, 'wrong', 0)).toMatchObject({ edge: await color(page, 'standard-error-outline-color'), edgeWidth: restWidth });
    expect(await cellStyle(page, 'code', 3)).toMatchObject({ fill: rest, edge: 'rgba(0, 0, 0, 0)' });
    // The default system: the focus-ring role at the thick width.
    expect(focusLine).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    expect(focusWidth).toBe(await resolveToken(page, '--tanrei-sys-border-thick'));
  });

  test('OTC-7: an empty active cell draws a caret centred in it, one line of the input’s text style high, in the caret color (the error caret color in error), blinking, and steady where motion is reduced; a filled active cell and a read-only field draw none; colors and line widths change over motion.state-duration, and at once where motion is reduced', async ({ page }) => {
    await mount(page, [fx('code', { value: '12' }), fx('wrong', { error: true }), fx('ro', { readOnly: true, value: '12' })]);
    await focus(page, 'code');
    const caret = host(page, 'code').locator('.caret');
    const [cell, mark] = [await box(cells(page, 'code').nth(2)), await box(caret)];
    near(mark.x + mark.width / 2, cell.x + cell.width / 2, 'caret centred across');
    near(mark.y + mark.height / 2, cell.y + cell.height / 2, 'caret centred down');
    const line = (await resolveToken(page, T('input-typescale-font-size'))) * Number(await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n), T('input-typescale-line-height')));
    near(mark.height, line, 'one line high');
    near(mark.width, await token(page, 'caret-width'), 'caret.width wide');
    await rootTokens(page, { [T('caret-width')]: '3px' });
    near((await box(caret)).width, 3, 'a system that sets caret.width draws a caret that wide');
    await rootTokens(page, { [T('caret-width')]: '' });
    expect(await caret.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(await color(page, 'standard-focused-caret-color'));
    expect(await caret.evaluate((el) => getComputedStyle(el).animationName)).toBe('caret');
    expect(await caret.evaluate((el) => getComputedStyle(el).animationIterationCount)).toBe('infinite');
    // The native caret is not drawn: the element's is the only one.
    expect(await native(page, 'code').evaluate((el) => getComputedStyle(el).caretColor)).toBe('rgba(0, 0, 0, 0)');
    expect(await cells(page, 'code').nth(0).evaluate((el) => Number.parseFloat(getComputedStyle(el).transitionDuration) * 1000)).toBe(await resolveToken(page, T('motion-state-duration'), 'duration'));
    expect(await cells(page, 'code').nth(0).evaluate((el) => getComputedStyle(el, '::before').transitionProperty)).toBe('border-color, border-width');
    await pressCell(page, 'code', 0);
    expect((await read(page, 'code')).caret).toEqual([]);
    await focus(page, 'wrong');
    expect(await host(page, 'wrong').locator('.caret').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(await color(page, 'standard-focused-error-caret-color'));
    await focus(page, 'ro');
    expect(await read(page, 'ro')).toMatchObject({ active: [2], caret: [] });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await focus(page, 'code');
    expect(await host(page, 'code').locator('.caret').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    expect(await cells(page, 'code').nth(0).evaluate((el) => [getComputedStyle(el).transitionDuration, getComputedStyle(el, '::before').transitionDuration])).toEqual(['0s', '0s']);
  });

  test('OTC-7 (focus-style: glow): where the focus style is glow the active cell also draws the glow around it, and still no ring; with the default style it draws none', async ({ page }) => {
    await mount(page, [fx('code', { value: '12' })]);
    await focus(page, 'code');
    const halo = () => cells(page, 'code').nth(2).evaluate((el) => getComputedStyle(el, '::after').boxShadow);
    expect(await halo()).toBe('none');
    await rootTokens(page, { '--tanrei-sys-behavior-focus-style': 'glow' });
    await page.locator('body').evaluate(() => (document.activeElement as HTMLElement).blur());
    await focus(page, 'code');
    expect(await halo()).not.toBe('none');
    expect(await cells(page, 'code').nth(0).evaluate((el) => getComputedStyle(el, '::after').content)).toBe('none');
    expect(await native(page, 'code').evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none');
  });

  test('OTC-8: Left and Right Arrow move the active cell to the cell on that side, no further than the first cell and the first empty cell (the last while all are filled); Home and End go to those ends; Up, Down, Page Up and Page Down do nothing in the field and are left to the page; none changes the value', async ({ page }) => {
    await mount(page, [fx('code', { value: '1234' }), fx('full', { value: '123456' })]);
    await record(page, 'code');
    await focus(page, 'code');
    const at = async (id = 'code') => (await read(page, id)).active[0];
    expect(await at()).toBe(4);
    await page.keyboard.press('ArrowRight');
    expect(await at()).toBe(4);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    expect(await read(page, 'code')).toMatchObject({ active: [2], selection: [2, 2] });
    await page.keyboard.press('Home');
    expect(await at()).toBe(0);
    await page.keyboard.press('ArrowLeft');
    expect(await at()).toBe(0);
    await page.keyboard.press('ArrowRight');
    expect(await at()).toBe(1);
    await page.keyboard.press('End');
    expect(await read(page, 'code')).toMatchObject({ active: [4], selection: [4, 4] });
    // Left to the page: the key is not taken, and the active cell and the insertion point stay.
    await page.keyboard.press('ArrowLeft');
    await page.evaluate(() => {
      const seen: Record<string, boolean> = {};
      (window as unknown as { __keys: Record<string, boolean> }).__keys = seen;
      document.addEventListener('keydown', (event) => (seen[event.key] = event.defaultPrevented));
    });
    for (const key of ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown']) {
      await page.keyboard.press(key);
      expect(await read(page, 'code'), key).toMatchObject({ active: [3], selection: [3, 3], value: '1234' });
    }
    expect(await page.evaluate(() => (window as unknown as { __keys: Record<string, boolean> }).__keys)).toEqual({ ArrowUp: false, ArrowDown: false, PageUp: false, PageDown: false });
    expect(await events(page)).toEqual([]);
    await focus(page, 'full');
    expect(await at('full')).toBe(5);
    await page.keyboard.press('ArrowRight');
    expect(await at('full')).toBe(5);
    await page.keyboard.press('Home');
    await page.keyboard.press('End');
    expect(await at('full')).toBe(5);
  });

  test('OTC-9: Backspace removes the active cell’s character and stays while the cell is filled, and removes the one before and moves there while it is empty; Delete removes the active cell’s character; what follows moves up, so the value keeps no gap; on an empty field both do nothing', async ({ page }) => {
    await mount(page, [fx('full', { value: '123456' }), fx('part', { value: '1234' }), fx('empty')]);
    await record(page, 'full');
    await focus(page, 'full');
    // The spec's verify: six presses of Backspace empty the field and leave the first cell active.
    const seen: string[] = [];
    for (let press = 0; press < 6; press++) {
      await page.keyboard.press('Backspace');
      seen.push((await read(page, 'full')).value);
    }
    expect(seen).toEqual(['12345', '1234', '123', '12', '1', '']);
    expect(await read(page, 'full')).toMatchObject({ value: '', native: '', active: [0], caret: [0] });
    expect(await events(page)).toEqual(['input:12345', 'input:1234', 'input:123', 'input:12', 'input:1', 'input:']);
    // The spec's verify: "1234" with the second cell active, Delete leaves "134".
    await pressCell(page, 'part', 1);
    await page.keyboard.press('Delete');
    expect(await read(page, 'part')).toMatchObject({ value: '134', native: '134', active: [1], selection: [1, 1] });
    await page.keyboard.press('Backspace');
    expect(await read(page, 'part')).toMatchObject({ value: '14', active: [1] });
    // On the first empty cell Delete has nothing to remove.
    await page.keyboard.press('End');
    await page.keyboard.press('Delete');
    expect(await read(page, 'part')).toMatchObject({ value: '14', active: [2] });
    await record(page, 'empty');
    await focus(page, 'empty');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Delete');
    expect(await read(page, 'empty')).toMatchObject({ value: '', active: [0] });
    expect(await events(page)).toEqual([]);
  });

  test('OTC-10: the platform’s select all selects the whole value and draws every filled cell as the active one; a character typed then replaces the whole value, Backspace or Delete empties the field; copy takes the whole value whichever cell is active, cut takes it and empties the field; a drag and Shift with an arrow key select nothing', async ({ page }) => {
    await mount(page, [fx('code', { value: '1234', groupSize: 3 })]);
    await record(page, 'code');
    await focus(page, 'code');
    await page.keyboard.press('ControlOrMeta+a');
    expect(await read(page, 'code')).toMatchObject({ active: [0, 1, 2, 3], selection: [0, 4], caret: [] });
    await page.keyboard.type('7');
    expect(await read(page, 'code')).toMatchObject({ value: '7', active: [1], selection: [1, 1] });
    await page.keyboard.type('89');
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    expect(await read(page, 'code')).toMatchObject({ value: '', active: [0] });
    await page.keyboard.type('1234');
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    expect((await read(page, 'code')).value).toBe('');
    // An arrow key ends the selection at that side.
    await page.keyboard.type('1234');
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('ArrowLeft');
    expect(await read(page, 'code')).toMatchObject({ active: [0], selection: [0, 0] });
    await events(page);
    // Copy: the whole value, without the group mark, from any cell.
    await pressCell(page, 'code', 1);
    expect(await clip(page, 'code', 'copy')).toEqual({ taken: '1234', prevented: true });
    expect((await read(page, 'code')).value).toBe('1234');
    // Shift with an arrow key, and a drag across cells, select nothing.
    await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Shift+ArrowLeft');
    await page.keyboard.press('Shift+Home');
    expect(await read(page, 'code')).toMatchObject({ active: [1], selection: [1, 1] });
    const [from, to] = [await box(cells(page, 'code').nth(0)), await box(cells(page, 'code').nth(3))];
    await page.mouse.move(from.x + 4, from.y + 20);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width - 4, to.y + 20, { steps: 4 });
    await page.mouse.up();
    expect(await read(page, 'code')).toMatchObject({ active: [0], selection: [0, 0] });
    await page.mouse.dblclick(to.x + 10, to.y + 20);
    expect(await read(page, 'code')).toMatchObject({ active: [3], selection: [3, 3] });
    // The browser's own select all (its menu, a touch keyboard) is heard as a selection of the whole text.
    await native(page, 'code').evaluate((input) => (input as HTMLInputElement).select());
    await expect.poll(async () => (await read(page, 'code')).active).toEqual([0, 1, 2, 3]);
    // Cut: the whole value, and the field is empty.
    expect(await events(page)).toEqual([]);
    expect(await clip(page, 'code', 'cut')).toEqual({ taken: '1234', prevented: true });
    expect(await read(page, 'code')).toMatchObject({ value: '', native: '', active: [0] });
    expect(await events(page)).toEqual(['input:']);
  });

  test('OTC-10 (mask): while mask is true copy and cut give nothing, and cut changes nothing', async ({ page }) => {
    await mount(page, [fx('masked', { mask: true, value: '1234' })]);
    await record(page, 'masked');
    await focus(page, 'masked');
    expect(await clip(page, 'masked', 'copy')).toEqual({ taken: null, prevented: true });
    expect(await clip(page, 'masked', 'cut')).toEqual({ taken: null, prevented: true });
    await page.keyboard.press('ControlOrMeta+a');
    expect(await clip(page, 'masked', 'cut')).toEqual({ taken: null, prevented: true });
    expect(await read(page, 'masked')).toMatchObject({ value: '1234', native: '1234' });
    expect(await events(page)).toEqual([]);
  });

  test('OTC-11: a pasted text is read whole as one code wherever the active cell is — spaces, hyphens and dashes go, the first length characters are kept, and a message is searched for exactly one run of exactly length digits; anything else changes nothing and fires nothing; afterwards the first empty cell, or the last, is active', async ({ page }) => {
    await mount(page, [fx('code', { value: '99' }), fx('alpha', { type: 'alphanumeric' })]);
    await record(page, 'code');
    await focus(page, 'code');
    await pressCell(page, 'code', 0);
    // The spec's verify, length 6, numeric.
    for (const text of ['123456', ' 123 456 ', '123-456', '123–456', '１２３　４５６', 'Your code is 123456.', 'Code 123456, valid for 10 minutes', '1234567']) {
      await set(page, 'code', { value: '99' });
      await give(page, 'code', 'paste', text);
      expect(await read(page, 'code'), text).toMatchObject({ value: '123456', native: '123456', active: [5], selection: [5, 5] });
      expect(await events(page), text).toEqual(['input:123456', 'complete:123456']);
    }
    await set(page, 'code', { value: '99' });
    await give(page, 'code', 'paste', '12345');
    expect(await read(page, 'code')).toMatchObject({ value: '12345', active: [5], caret: [5] });
    expect(await events(page)).toEqual(['input:12345']);
    for (const text of ['call 0312345678', 'abc', '', '   ', 'codes 123456 and 654321', 'Your code is 123 456', '12a']) {
      await give(page, 'code', 'paste', text);
      expect(await read(page, 'code'), text).toMatchObject({ value: '12345', native: '12345' });
    }
    expect(await events(page)).toEqual([]);
    // Letters: read whole or not at all — a message is not searched for a code of letters.
    await focus(page, 'alpha');
    await give(page, 'alpha', 'paste', 'a7k-93q');
    expect((await read(page, 'alpha')).value).toBe('A7K93Q');
    await give(page, 'alpha', 'paste', 'Your code is B8L04R.');
    expect((await read(page, 'alpha')).value).toBe('A7K93Q');
  });

  test('OTC-11: a text that is dropped, given by the browser’s autofill or put in by dictation is read the same way, in one step, and paste is never blocked — masked or not', async ({ page }) => {
    await mount(page, [fx('code', { value: '12' }), fx('masked', { mask: true })]);
    await record(page, 'code');
    await focus(page, 'code');
    await give(page, 'code', 'drop', 'Your code is 654321.');
    expect(await read(page, 'code')).toMatchObject({ value: '654321', native: '654321', active: [5] });
    expect(await events(page)).toEqual(['input:654321', 'complete:654321']);
    // Autofill replaces the element's text and says so with `input` alone: with an input type, and without one.
    await give(page, 'code', 'fill', '123 456');
    expect(await read(page, 'code')).toMatchObject({ value: '123456', native: '123456' });
    await give(page, 'code', 'fill-untyped', '246-810');
    expect(await read(page, 'code')).toMatchObject({ value: '246810', native: '246810', active: [5] });
    expect(await events(page)).toEqual(['input:123456', 'complete:123456', 'input:246810', 'complete:246810']);
    // A fill that holds no code leaves the value, and the native element shows it again.
    await give(page, 'code', 'fill', 'no code here');
    expect(await read(page, 'code')).toMatchObject({ value: '246810', native: '246810' });
    expect(await events(page)).toEqual([]);
    // Dictation and a keyboard's suggestion put several characters in at once (insertText): one code.
    await set(page, 'code', { value: '12' });
    // (Dispatched by hand: Playwright's own insertText types character by character in Firefox.)
    await native(page, 'code').evaluate((input) => input.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: '987 654', bubbles: true, composed: true, cancelable: true })));
    expect((await read(page, 'code')).value).toBe('987654');
    await focus(page, 'masked');
    await give(page, 'masked', 'paste', '123456');
    expect(await read(page, 'masked')).toMatchObject({ value: '123456', drawn: '•|•|•|•|•|•' });
  });

  test('OTC-12: the native element is marked as a one-time code for the browser’s autofill, asks for a numeric keypad — or a general keyboard that capitalizes every character for alphanumeric — without autocorrection or spelling marks, and has no maxlength and no pattern; it keeps no history of its own', async ({ page }) => {
    await mount(page, [fx('n'), fx('a', { type: 'alphanumeric' }), fx('m', { mask: true })]);
    const attributes = (id: string) =>
      native(page, id).evaluate((input) => Object.fromEntries(['type', 'autocomplete', 'inputmode', 'autocapitalize', 'autocorrect', 'spellcheck', 'enterkeyhint', 'maxlength', 'pattern', 'list', 'name'].map((name) => [name, input.getAttribute(name)])));
    const shared = { autocomplete: 'one-time-code', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'done', maxlength: null, pattern: null, list: null, name: null };
    expect(await attributes('n')).toEqual({ ...shared, type: 'text', inputmode: 'numeric', autocapitalize: 'off' });
    expect(await attributes('a')).toEqual({ ...shared, type: 'text', inputmode: 'text', autocapitalize: 'characters' });
    expect(await attributes('m')).toEqual({ ...shared, type: 'password', inputmode: 'numeric', autocapitalize: 'off' });
  });

  test('OTC-13: input fires once for each change by the person, carrying the new value; change fires when focus leaves or Enter is pressed and the value differs from the last commit; Enter fires action and submits the enclosing form as from a text input, unless action is cancelled; none fires when the product sets value', async ({ page }) => {
    await mount(page, [fx('code', { name: 'code' })]);
    await page.evaluate(() => {
      const form = document.createElement('form');
      const stage = document.querySelector('.stage')!;
      stage.before(form);
      form.append(stage);
      form.insertAdjacentHTML('beforeend', '<button id="after" type="button">After</button>');
      (window as unknown as { __submitted: string[] }).__submitted = [];
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        (window as unknown as { __submitted: string[] }).__submitted.push(String(new FormData(form).get('code')));
      });
    });
    const submitted = () => page.evaluate(() => (window as unknown as { __submitted: string[] }).__submitted.splice(0));
    await record(page, 'code');
    await focus(page, 'code');
    await page.keyboard.type('12');
    expect(await events(page)).toEqual(['input:1', 'input:12']);
    // The events are composed and bubble; the native element's own input never leaves the shadow root.
    expect(await host(page, 'code').evaluate((el) => new Promise<string>((resolve) => {
      document.addEventListener('input', (event) => resolve(`${(event.target as Element).localName} ${event.composed} ${event.bubbles} ${event instanceof CustomEvent}`), { once: true });
      el.shadowRoot!.querySelector('.input')!.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: '3', bubbles: true, composed: true, cancelable: true }));
    }))).toBe(`${TAG} true true true`);
    expect(await events(page)).toEqual(['input:123']);
    await page.keyboard.press('Enter');
    expect(await events(page)).toEqual(['change:123', 'action:123']);
    expect(await submitted()).toEqual(['123']);
    // Enter again: nothing changed since the commit, so action alone.
    await page.keyboard.press('Enter');
    expect(await events(page)).toEqual(['action:123']);
    expect(await submitted()).toEqual(['123']);
    await page.keyboard.type('4');
    await page.locator('#after').focus();
    expect(await events(page)).toEqual(['input:1234', 'change:1234']);
    await focus(page, 'code');
    await page.locator('#after').focus();
    expect(await events(page)).toEqual([]);
    // A value the product sets fires nothing, and leaving after it is no change.
    await focus(page, 'code');
    await set(page, 'code', { value: '55' });
    await page.locator('#after').focus();
    expect(await events(page)).toEqual([]);
    // A cancelled action keeps the form from being submitted.
    await host(page, 'code').evaluate((el) => el.addEventListener('action', (event) => event.preventDefault()));
    await focus(page, 'code');
    await page.keyboard.press('Enter');
    expect(await events(page)).toEqual(['action:55']);
    expect(await submitted()).toEqual([]);
  });

  for (const order of ORDERS) {
    test(`OTC-13: the key that commits or cancels an input method’s text — its events in ${order}’s order — fires no action and does not submit the form; the next Enter does`, async ({ page }) => {
      await mount(page, [fx('code', { name: 'code' })]);
      await page.evaluate(() => {
        const form = document.createElement('form');
        const stage = document.querySelector('.stage')!;
        stage.before(form);
        form.append(stage);
        (window as unknown as { __submitted: number }).__submitted = 0;
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          (window as unknown as { __submitted: number }).__submitted++;
        });
      });
      const submitted = () => page.evaluate(() => (window as unknown as { __submitted: number }).__submitted);
      await record(page, 'code');
      await focus(page, 'code');
      await compose(page, 'code', order, ['１', '１２'], '１２', { enter: true });
      expect(await events(page)).toEqual(['input:12']);
      await compose(page, 'code', order, ['３'], null);
      expect(await events(page)).toEqual([]);
      expect(await submitted()).toBe(0);
      await page.keyboard.press('Enter');
      expect(await events(page)).toEqual(['change:12', 'action:12']);
      expect(await submitted()).toBe(1);
    });
  }

  test('OTC-13, OTC-6: after a composition committed with no key — a candidate picked with the pointer — a key pressed after its end is the field’s, though no timer has run: Backspace removes, Enter acts; the committing key, pressed no later than the end, is not', async ({ page }) => {
    await mount(page, [fx('code')]);
    await record(page, 'code');
    await focus(page, 'code');
    // One task: no timer can run between the end and the keys, as on a busy page, where input comes before timers.
    const commitThen = (keys: { key: string; after: number }[]) =>
      native(page, 'code').evaluate((input, list) => {
        const element = input as HTMLInputElement;
        element.dispatchEvent(new CompositionEvent('compositionstart', { data: '', bubbles: true, composed: true }));
        element.dispatchEvent(new CompositionEvent('compositionupdate', { data: '１２', bubbles: true, composed: true }));
        element.value = '１２';
        element.dispatchEvent(new InputEvent('input', { inputType: 'insertCompositionText', data: '１２', isComposing: true, bubbles: true, composed: true }));
        const end = new CompositionEvent('compositionend', { data: '１２', bubbles: true, composed: true });
        element.dispatchEvent(end);
        return list.map(({ key, after }) => {
          const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, composed: true });
          // When the key was pressed: at the end (the committing key a platform reports after it), or after it.
          Object.defineProperty(event, 'timeStamp', { value: end.timeStamp + after });
          element.dispatchEvent(event);
          return event.defaultPrevented;
        });
      }, keys);
    // Enter is left to the form either way (OTC-13): the events tell which Enter acted.
    expect(await commitThen([{ key: 'Enter', after: 0 }, { key: 'Backspace', after: 1 }, { key: 'Enter', after: 2 }])).toEqual([false, true, false]);
    expect(await events(page)).toEqual(['input:12', 'input:1', 'change:1', 'action:1']);
    expect((await read(page, 'code')).value).toBe('1');
  });

  test('OTC-13 (a real composition): in Chromium the Enter that commits a composition fires no action and submits nothing', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium drives an input method from a test (CDP Input.imeSetComposition)');
    await mount(page, [fx('code')]);
    await record(page, 'code');
    await focus(page, 'code');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.imeSetComposition', { text: '１２', selectionStart: 2, selectionEnd: 2 });
    // The key event an input method's Enter is: key code 229, composing.
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 229, nativeVirtualKeyCode: 229 });
    await cdp.send('Input.insertText', { text: '１２' });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await cdp.detach();
    expect((await read(page, 'code')).value).toBe('12');
    expect(await events(page)).toEqual(['input:12']);
  });

  test('OTC-14: complete fires once, after the input of the change that leaves the value length long — the last cell typed, a whole code pasted, a character of a complete code replaced — and never when the product sets value; nothing else happens: no submission, no move of focus, nothing disabled, nothing announced', async ({ page }) => {
    await mount(page, [fx('code', { name: 'code' })]);
    await page.evaluate(() => {
      const form = document.createElement('form');
      const stage = document.querySelector('.stage')!;
      stage.before(form);
      form.append(stage);
      form.insertAdjacentHTML('beforeend', '<button id="go">Go</button>');
      (window as unknown as { __submitted: number }).__submitted = 0;
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        (window as unknown as { __submitted: number }).__submitted++;
      });
    });
    await record(page, 'code');
    await focus(page, 'code');
    await page.keyboard.type('123456');
    expect(await events(page)).toEqual(['input:1', 'input:12', 'input:123', 'input:1234', 'input:12345', 'input:123456', 'complete:123456']);
    // Replacing the third digit of a complete code fires both again; the same digit typed over itself is no change.
    await pressCell(page, 'code', 2);
    await page.keyboard.type('9');
    expect(await events(page)).toEqual(['input:129456', 'complete:129456']);
    await pressCell(page, 'code', 2);
    await page.keyboard.type('9');
    expect(await events(page)).toEqual([]);
    await give(page, 'code', 'paste', '654 321');
    expect(await events(page)).toEqual(['input:654321', 'complete:654321']);
    await set(page, 'code', { value: '111111' });
    await set(page, 'code', { value: '' });
    await set(page, 'code', { value: '222222' });
    expect(await events(page)).toEqual([]);
    // Nothing else: the form is not submitted, focus has not moved, the field is not disabled or read-only, and the
    // element holds no live region.
    expect(await page.evaluate(() => (window as unknown as { __submitted: number }).__submitted)).toBe(0);
    expect(await read(page, 'code')).toMatchObject({ focused: true });
    expect(await page.evaluate(() => document.activeElement?.localName)).toBe(TAG);
    expect(await native(page, 'code').evaluate((input) => [(input as HTMLInputElement).disabled, (input as HTMLInputElement).readOnly])).toEqual([false, false]);
    expect(await host(page, 'code').evaluate((el) => el.shadowRoot!.querySelectorAll('[aria-live], [role="status"], [role="alert"]').length)).toBe(0);
  });

  test('OTC-15: with groupSize a mark stands after every groupSize cells — a line separator.width long and separator.thickness thick with round ends, centred on the cells’ height, container.gap from the cell on each side, in the separator color; it is no part of the value, takes no focus or press of its own and is hidden from assistive technology; with 0 there is none — two groups of three are 284 wide under the default system', async ({ page }) => {
    await mountFixtures(page, spec);
    const [width, gap, length, thickness] = [await token(page, 'container-width'), await token(page, 'container-gap'), await token(page, 'separator-width'), await token(page, 'separator-thickness')];
    const marks = (id: string) => host(page, id).locator('.mark');
    expect(await marks('grouped-partial').count()).toBe(1);
    expect(await marks('partial').count()).toBe(0);
    const list = await layout(page, 'grouped-partial');
    const mark = await box(marks('grouped-partial'));
    const origin = await box(host(page, 'grouped-partial'));
    near(mark.width, length, 'mark length');
    near(mark.height, thickness, 'mark thickness', 0.3);
    near(mark.x - origin.x, list[2].x + width + gap, 'a gap after the third cell');
    near(list[3].x, mark.x - origin.x + length + gap, 'a gap before the fourth cell');
    near(mark.y + mark.height / 2, origin.y + list[0].height / 2, 'centred on the cells');
    expect(await marks('grouped-partial').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(await color(page, 'standard-separator-color'));
    near(await marks('grouped-partial').evaluate((el) => Number.parseFloat(getComputedStyle(el).borderTopLeftRadius)), thickness / 2, 'round ends', 0.3);
    near((await box(native(page, 'grouped-partial'))).width, 6 * width + 4 * gap + length + 2 * gap, 'row width');
    near((await box(native(page, 'grouped-partial'))).width, 284, 'the default system');
    // The last group holds the cells that remain.
    await mount(page, [fx('seven', { length: 7, groupSize: 3, value: '1234567', name: 'code' })]);
    expect(await host(page, 'seven').evaluate((el) => [...el.shadowRoot!.querySelectorAll('.group')].map((group) => group.querySelectorAll('.cell').length))).toEqual([3, 3, 1]);
    // No part of the value, of what is copied or of what a form submits; a press on it is a press on the field.
    expect((await read(page, 'seven')).native).toBe('1234567');
    expect((await clip(page, 'seven', 'copy')).taken).toBe('1234567');
    expect(await host(page, 'seven').evaluate((el) => { const form = document.createElement('form'); el.before(form); form.append(el); return new FormData(form).get('code'); })).toBe('1234567');
    expect(await host(page, 'seven').locator('.mark').first().evaluate((el) => [getComputedStyle(el).pointerEvents, el.tabIndex, !!el.closest('[aria-hidden="true"]')])).toEqual(['none', -1, true]);
    // A system that sets the mark's thickness to nothing draws the groups a mark and two gaps apart, and no line.
    await mountFixtures(page, spec, { fixtures: spec.fixtures.filter((f) => f.id === 'grouped-partial') });
    await rootTokens(page, { [T('separator-thickness')]: '0px' });
    const apart = await layout(page, 'grouped-partial');
    near(apart[3].x - (apart[2].x + width), length + 2 * gap, 'the groups apart');
    expect(length + 2 * gap).toBe(20);
    expect((await box(marks('grouped-partial'))).height).toBe(0);
  });

  test('OTC-16: with mask each filled cell draws the browser’s password mark in place of its character, in the character’s color and text style and at once; the native element is a password field, keeps its keyboard and the code autofill, and the value, the events and what a form submits are the same as without mask', async ({ page, browserName }) => {
    await mount(page, [fx('masked', { mask: true, value: '12', name: 'code' }), fx('plain', { value: '12' })]);
    expect(await read(page, 'masked')).toMatchObject({ value: '12', native: '12', drawn: '•|•||||' });
    await record(page, 'masked');
    await focus(page, 'masked');
    await page.keyboard.type('3');
    // At once: the character is never drawn first.
    expect(await host(page, 'masked').evaluate((el) => [...el.shadowRoot!.querySelectorAll('.char')].map((c) => c.textContent).join(''))).toBe('•••');
    await page.keyboard.type('456');
    expect(await read(page, 'masked')).toMatchObject({ value: '123456', drawn: '•|•|•|•|•|•' });
    expect(await events(page)).toEqual(['input:123', 'input:1234', 'input:12345', 'input:123456', 'complete:123456']);
    expect(await host(page, 'masked').evaluate((el) => { const form = document.createElement('form'); el.before(form); form.append(el); return new FormData(form).get('code'); })).toBe('123456');
    const style = (id: string) => cells(page, id).nth(0).locator('.char').evaluate((el) => [getComputedStyle(el).color, getComputedStyle(el).font]);
    expect(await style('masked')).toEqual(await style('plain'));
    expect(await native(page, 'masked').evaluate((input) => [input.getAttribute('type'), input.getAttribute('inputmode'), input.getAttribute('autocomplete')])).toEqual(['password', 'numeric', 'one-time-code']);
    // A protected text entry: the platform's own password field, which is what keeps assistive technology from
    // reading the characters back (Chromium's protocol tree still carries the raw value; what a screen reader is given
    // is the platform's protected role — a check by hand).
    if (browserName === 'chromium') expect(await textboxes(page)).toHaveLength(2);
    // Switched off, the characters are drawn again and the value is what it was.
    await set(page, 'masked', { mask: false });
    expect(await read(page, 'masked')).toMatchObject({ value: '123456', drawn: '1|2|3|4|5|6' });
  });

  test('OTC-17: while error is true every cell draws a line outline.width wide inside its edge in the error outline color and the field is exposed as invalid; the field never sets error itself and does not empty, select or change the value because of it', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mountFixtures(page, spec);
    const [line, width] = [await color(page, 'standard-error-outline-color'), await token(page, 'outline-width')];
    for (const id of ['error', 'error-grouped-empty']) {
      for (let index = 0; index < 6; index++) expect(await cellStyle(page, id, index), `${id} ${index}`).toMatchObject({ edge: line, edgeWidth: width, fill: await color(page, 'standard-error-container-color') });
      expect(await native(page, id).getAttribute('aria-invalid')).toBe('true');
    }
    expect(await native(page, 'complete').getAttribute('aria-invalid')).toBeNull();
    expect((await cellStyle(page, 'complete', 0)).edge).toBe('rgba(0, 0, 0, 0)');
    // The characters keep their color: the code is still what the person typed.
    expect((await cellStyle(page, 'error', 0)).color).toBe(await color(page, 'standard-error-input-color'));
    // The line takes no room: the boxes are those of the plain field.
    expect((await layout(page, 'error')).map((c) => [c.x, c.width, c.height])).toEqual((await layout(page, 'complete')).map((c) => [c.x, c.width, c.height]));
    // Set and cleared by the product; the value, the selection and the events are untouched.
    await record(page, 'complete');
    await focus(page, 'complete');
    const before = await read(page, 'complete');
    await set(page, 'complete', { error: true });
    expect(await read(page, 'complete')).toEqual(before);
    expect((await cellStyle(page, 'complete', 0)).edge).toBe(line);
    await page.keyboard.type('7');
    expect(await host(page, 'complete').evaluate((el) => (el as HTMLElement & { error: boolean }).error)).toBe(true);
    await set(page, 'complete', { error: false });
    expect(await native(page, 'complete').getAttribute('aria-invalid')).toBeNull();
    expect(await events(page)).toEqual(['input:123457', 'complete:123457']);
  });

  test('OTC-18: a value the product sets is shown, read by OTC-4 and cut to its first length permitted characters, with a debug report when something was dropped, and fires no event; the same value again changes nothing — the active cell included; set while focused, the first empty cell, or the last, becomes active', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('code', { value: '12' })]);
    await record(page, 'code');
    await set(page, 'code', { value: '４５６' });
    expect(await read(page, 'code')).toMatchObject({ value: '456', native: '456', drawn: '4|5|6|||' });
    await set(page, 'code', { value: '12 34-56 78' });
    expect((await read(page, 'code')).value).toBe('123456');
    await set(page, 'code', { value: 'ab12' });
    expect((await read(page, 'code')).value).toBe('12');
    expect(seen.filter((line) => line.includes('OTC-18'))).toHaveLength(3);
    expect(seen.find((line) => line.includes('"ab12"'))).toContain('"12" is shown');
    await set(page, 'code', { value: '1234' });
    await focus(page, 'code');
    await pressCell(page, 'code', 1);
    await set(page, 'code', { value: '1234' });
    expect(await read(page, 'code')).toMatchObject({ active: [1], selection: [1, 1] });
    await set(page, 'code', { value: '98' });
    expect(await read(page, 'code')).toMatchObject({ value: '98', active: [2], selection: [2, 2] });
    await set(page, 'code', { value: '987654' });
    expect(await read(page, 'code')).toMatchObject({ active: [5], selection: [5, 5] });
    expect(await events(page)).toEqual([]);
  });

  test('OTC-19: a length that is not a whole number of 1 or more draws 6 cells and a groupSize that is not a whole number from 0 to length minus 1 draws one group, each reported in a debug build; a length that becomes smaller than the value keeps the first characters without an event; an unknown type behaves as numeric and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('zero', { length: 0 }), fx('half', { length: 4.5 }), fx('group', { groupSize: 6 }), fx('negative', { groupSize: -1 }), fx('kind', { type: 'hex' }), fx('code', { value: '123456' })]);
    expect(await cells(page, 'zero').count()).toBe(6);
    expect(await cells(page, 'half').count()).toBe(6);
    for (const id of ['group', 'negative']) expect(await host(page, id).locator('.group').count(), id).toBe(1);
    expect(seen.filter((line) => line.includes('is not a whole number of 1 or more'))).toHaveLength(2);
    expect(seen.filter((line) => line.includes('OTC-19') && line.includes('groupSize'))).toHaveLength(2);
    expect(seen.filter((line) => line.includes('type "hex"'))).toHaveLength(1);
    await focus(page, 'kind');
    await page.keyboard.type('a1b2');
    expect((await read(page, 'kind')).value).toBe('12');
    expect(await native(page, 'kind').getAttribute('inputmode')).toBe('numeric');
    await record(page, 'code');
    await set(page, 'code', { length: 4 });
    expect(await read(page, 'code')).toMatchObject({ value: '1234', native: '1234', drawn: '1|2|3|4' });
    expect(await events(page)).toEqual([]);
    // A group size that the new length no longer allows draws one group.
    await set(page, 'code', { groupSize: 3, length: 6 });
    expect(await host(page, 'code').locator('.group').count()).toBe(2);
    await set(page, 'code', { length: 3 });
    expect(await host(page, 'code').locator('.group').count()).toBe(1);
  });

  test('OTC-20: disabled — by its own prop, by a fieldset, or by its field — it takes no focus and no entry, has no active cell and no caret, fires nothing, is exposed as disabled, is left out of the form’s submission, and draws every cell, character and mark from the disabled tokens; in error it draws no line', async ({ page, browserName }) => {
    await mountFixtures(page, spec);
    for (const id of ['disabled-value', 'disabled-error']) {
      const error = id === 'disabled-error' ? 'error-' : '';
      expect(await cellStyle(page, id, 0), id).toMatchObject({ fill: await color(page, `standard-disabled-${error}container-color`), color: await color(page, `standard-disabled-${error}input-color`), edge: 'rgba(0, 0, 0, 0)' });
      expect(await native(page, id).isDisabled(), id).toBe(true);
    }
    expect(await host(page, 'disabled-value').locator('.mark').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(await color(page, 'standard-disabled-separator-color'));
    // The default system: the fill is kept, the content is faded.
    expect((await cellStyle(page, 'disabled-value', 0)).fill).toBe(await color(page, 'standard-container-color'));
    expect((await cellStyle(page, 'disabled-value', 0)).color).not.toBe(await color(page, 'standard-input-color'));
    if (browserName === 'chromium') expect((await textboxes(page)).filter((node) => node.disabled === true)).toHaveLength(3);
    await mount(page, [fx('off', { disabled: true, value: '12', name: 'a' }), fx('set', { value: '34', name: 'b' }), fx('on', { value: '56', name: 'c' })]);
    await page.evaluate(() => {
      const form = document.createElement('form');
      const set = document.createElement('fieldset');
      set.disabled = true;
      document.querySelector('main')!.append(form);
      form.append(...document.querySelectorAll('.stage'));
      document.querySelector('[data-fixture="set"]')!.before(set);
      set.append(document.querySelector('[data-fixture="set"]')!);
    });
    await settled(page, 'set');
    expect(await page.evaluate(() => [...new FormData(document.querySelector('form')!).entries()].map(([k, v]) => `${k}=${String(v)}`))).toEqual(['c=56']);
    for (const id of ['off', 'set']) {
      await record(page, id);
      await host(page, id).evaluate((el) => (el as HTMLElement).focus());
      await pressCell(page, id, 0);
      await page.keyboard.type('9');
      await give(page, id, 'paste', '123456');
      expect(await read(page, id), id).toMatchObject({ active: [], caret: [], focused: false });
      expect((await read(page, id)).value, id).toBe(id === 'off' ? '12' : '34');
      expect(await events(page), id).toEqual([]);
      expect(await native(page, id).isDisabled(), id).toBe(true);
    }
    // Tab passes it by.
    await page.evaluate(() => document.querySelector('form')!.insertAdjacentHTML('afterbegin', '<button id="before" type="button">Before</button>'));
    await page.locator('#before').focus();
    await tabTo(page, host(page, 'on'));
    await tab(page, { back: true });
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('before');
    // Enabled again while the product still holds it: it is a field again.
    await set(page, 'off', { disabled: false });
    await focus(page, 'off');
    await page.keyboard.type('9');
    expect((await read(page, 'off')).value).toBe('129');
  });

  test('OTC-21: read-only and not disabled it stays focusable with its active cell and its focused line, and copyable; typing, removing, cutting, pasting and autofill change nothing and fire no input, change or complete; it draws no caret, is exposed as read-only, is submitted with its form, and is drawn as an enabled field, hovered and focused states included', async ({ page, browserName }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount(page, [fx('ro', { readOnly: true, value: '12345', name: 'code' }), fx('plain', { value: '12345' })]);
    await record(page, 'ro');
    await tabTo(page, host(page, 'ro'));
    expect(await read(page, 'ro')).toMatchObject({ active: [5], caret: [], focused: true });
    expect(await cellStyle(page, 'ro', 5)).toMatchObject({ edge: await color(page, 'standard-focused-outline-color'), edgeWidth: await token(page, 'focused-outline-width') });
    await page.keyboard.type('6');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Delete');
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('9');
    await page.keyboard.press('Backspace');
    await give(page, 'ro', 'paste', '654321');
    await give(page, 'ro', 'drop', '654321');
    await give(page, 'ro', 'fill', '654321');
    expect(await clip(page, 'ro', 'cut')).toEqual({ taken: null, prevented: true });
    expect(await read(page, 'ro')).toMatchObject({ value: '12345', native: '12345' });
    expect(await clip(page, 'ro', 'copy')).toEqual({ taken: '12345', prevented: true });
    // The arrow keys still move the active cell.
    await page.keyboard.press('Home');
    expect((await read(page, 'ro')).active).toEqual([0]);
    await page.mouse.click(700, 500);
    expect(await events(page)).toEqual([]);
    expect(await native(page, 'ro').evaluate((input) => [(input as HTMLInputElement).readOnly, input.getAttribute('aria-readonly')])).toEqual([true, 'true']);
    if (browserName === 'chromium') expect((await textboxes(page))[0]).toMatchObject({ readonly: true, value: '12345' });
    expect(await host(page, 'ro').evaluate((el) => { const form = document.createElement('form'); el.before(form); form.append(el); return new FormData(form).get('code'); })).toBe('12345');
    // Drawn as an enabled field.
    expect(await cellStyle(page, 'ro', 1)).toEqual(await cellStyle(page, 'plain', 1));
    const b = await box(cells(page, 'ro').nth(1));
    await page.mouse.move(b.x + 10, b.y + 10);
    expect((await cellStyle(page, 'ro', 1)).fill).toBe(await color(page, 'standard-hovered-container-color'));
  });

  test('OTC-22: inside a field it takes its name, its description and its required state from the field — the label names it, the supporting text with, in error, the error text after it describes it — and a press on the field’s label focuses it with the first empty cell active; alone, label names it and is drawn nowhere; with neither it still works and a debug build reports the missing name', async ({ page, browserName }) => {
    const seen = warnings(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mountFramed(page, [
      framed('framed', { label: LABEL, supportingText: 'Enter the 6-digit code we sent you.', required: true, requiredText: 'Required', errorText: 'That code is not right.' }, { value: '12', groupSize: 3 }),
      framed('own', { label: 'Code', labelHidden: true }, { label: 'Sign-in code' }),
    ]);
    const semantics = (id: string) => native(page, id).evaluate((input) => Object.fromEntries(['aria-label', 'aria-description', 'aria-required', 'aria-invalid'].map((name) => [name, input.getAttribute(name)])));
    expect(await semantics('framed')).toEqual({ 'aria-label': LABEL, 'aria-description': 'Enter the 6-digit code we sent you.', 'aria-required': 'true', 'aria-invalid': null });
    await stage(page, 'framed').locator('tanrei-field').evaluate((el) => ((el as HTMLElement & { error: boolean }).error = true));
    await settled(page, 'framed');
    expect(await semantics('framed')).toEqual({ 'aria-label': LABEL, 'aria-description': 'That code is not right.', 'aria-required': 'true', 'aria-invalid': 'true' });
    expect((await cellStyle(page, 'framed', 0)).edge).toBe(await color(page, 'standard-error-outline-color'));
    if (browserName === 'chromium') expect((await textboxes(page))[0]).toMatchObject({ name: LABEL, description: 'That code is not right.', required: true, invalid: 'true', value: '12' });
    // The control's own label wins over the field's.
    expect((await semantics('own'))['aria-label']).toBe('Sign-in code');
    // A press on the field's label focuses the control: the first empty cell is active.
    const label = stage(page, 'framed').locator('tanrei-field').locator('.frame > .label-row > .label');
    await label.click();
    expect(await read(page, 'framed')).toMatchObject({ focused: true, active: [2], selection: [2, 2] });
    expect(seen.filter((line) => line.includes('OTC-22'))).toEqual([]);
    // Alone: label names it and is drawn nowhere; without one it works and says what is missing.
    await mount(page, [fx('alone'), { id: 'nameless', props: {} }]);
    await expect(stage(page, 'alone')).toMatchAriaSnapshot(`- textbox "${LABEL}"`);
    expect(await stage(page, 'alone').evaluate((el) => (el as HTMLElement).innerText.trim())).toBe('');
    expect(seen.filter((line) => line.includes('OTC-22'))).toHaveLength(1);
    expect(seen.find((line) => line.includes('OTC-22'))).toContain('no accessible name');
    await focus(page, 'nameless');
    await page.keyboard.type('12');
    expect((await read(page, 'nameless')).value).toBe('12');
    expect(await native(page, 'nameless').getAttribute('aria-label')).toBeNull();
  });

  test('OTC-23: never wider than its layout — the cells share the width equally and become narrower than container.width, never narrower than a character with the padding on each side; then the row wraps onto rows container.gap below, each from the start edge: between groups first, without the mark at the break, and between cells where there are no groups or a group alone does not fit; no cell is cut, laid over another or scrolled', async ({ page }) => {
    await mount(page, [fx('six', { groupSize: 3, value: '123456' }), fx('eight', { length: 8, groupSize: 4, value: '12345678' }), fx('plain', { value: '123456' })]);
    await page.addStyleTag({ content: 'main { display: block !important; } .stage { box-sizing: content-box; padding: 16px !important; inline-size: 288px !important; }' });
    const [width, gap, pad, length] = [await token(page, 'container-width'), await token(page, 'container-gap'), await token(page, 'container-padding-inline'), await token(page, 'separator-width')];
    // 288 wide (the spec's verify): six cells in two groups stand in one row at full width…
    let six = await layout(page, 'six');
    expect(rowsOf(six)).toEqual([6]);
    six.forEach((cell) => near(cell.width, width, 'full width'));
    // …and eight in two groups of four in one row of narrower cells, all of one width (29 in the default system).
    const eight = await layout(page, 'eight');
    expect(rowsOf(eight)).toEqual([8]);
    const shared = (288 - 6 * gap - (length + 2 * gap)) / 8;
    eight.forEach((cell) => near(cell.width, shared, 'a shared width'));
    expect(shared).toBe(29);
    near(eight[7].x + eight[7].width, 288, 'the row ends at the layout’s edge');
    expect(await host(page, 'eight').locator('.mark').isVisible()).toBe(true);
    const narrowest = await cells(page, 'six').nth(0).evaluate((cell, p) => {
      const probe = document.createElement('span');
      probe.textContent = '0';
      probe.style.cssText = 'position:absolute;visibility:hidden;font:inherit;font-variant-numeric:tabular-nums';
      cell.append(probe);
      const digit = probe.getBoundingClientRect().width;
      probe.remove();
      return digit + 2 * p;
    }, pad);
    const fits = (count: number, groups: number) => count * narrowest + (count - groups) * gap + (groups - 1) * (length + 2 * gap);
    // Just wide enough for six cells at their narrowest: one row, every cell at that width.
    await page.addStyleTag({ content: `.stage { inline-size: ${Math.ceil(fits(6, 2)) + 1}px !important; }` });
    six = await layout(page, 'six');
    expect(rowsOf(six)).toEqual([6]);
    six.forEach((cell) => expect(cell.width, 'never narrower than a character and its paddings').toBeGreaterThanOrEqual(narrowest - 0.1));
    // Narrower than that: two rows of three, each from the start edge, a gap apart, and no mark.
    await page.addStyleTag({ content: `.stage { inline-size: ${Math.floor(fits(6, 2)) - 2}px !important; }` });
    six = await layout(page, 'six');
    expect(rowsOf(six)).toEqual([3, 3]);
    near(six[0].x, 0, 'first row from the start edge');
    near(six[3].x, 0, 'second row from the start edge');
    near(six[3].y - (six[0].y + six[0].height), gap, 'a gap between the rows');
    expect(new Set(six.map((cell) => Math.round(cell.width * 10))).size).toBe(1);
    // The mark is hidden by the frame that draws the new rows, not by the task that asked for the width: the row's
    // ResizeObserver answers in the frame's own rendering step, after its animation callbacks and before its paint, so
    // no frame is painted with a mark at a row's start — and a read from a task between the width and that frame (this
    // one, when the machine is busy: six of twenty by two workers) still finds the mark of the row that was.
    await expect(host(page, 'six').locator('.mark')).toBeHidden();
    // One group wraps between cells — and a group that alone does not fit does too.
    await page.addStyleTag({ content: `.stage { inline-size: ${Math.ceil(2 * narrowest + gap) + 1}px !important; }` });
    const plain = await layout(page, 'plain');
    expect(rowsOf(plain)).toEqual([2, 2, 2]);
    near(plain[2].x, 0, 'a wrapped row starts at the start edge');
    six = await layout(page, 'six');
    expect(rowsOf(six)).toEqual([2, 1, 2, 1]);
    expect(new Set(six.map((cell) => Math.round(cell.width * 10))).size).toBe(1);
    // Nothing is cut, laid over another cell or scrolled: every cell is inside the field, and every digit inside its cell.
    for (const id of ['six', 'plain', 'eight']) {
      const field = await box(host(page, id));
      const list = await layout(page, id);
      list.forEach((cell, index) => {
        expect(cell.x, `${id} ${index} left`).toBeGreaterThanOrEqual(-0.5);
        expect(cell.x + cell.width, `${id} ${index} right`).toBeLessThanOrEqual(field.width + 0.5);
        expect(cell.y + cell.height, `${id} ${index} bottom`).toBeLessThanOrEqual(field.height + 0.5);
        for (const other of list.slice(index + 1)) expect(other.y >= cell.y + cell.height - 0.5 || other.x >= cell.x + cell.width - 0.5, `${id} ${index} overlaps`).toBe(true);
      });
      expect(await host(page, id).evaluate((el) => [el.scrollWidth <= el.clientWidth + 1, getComputedStyle(el.shadowRoot!.querySelector('.char')!).fontSize])).toEqual([true, `${await resolveToken(page, T('input-typescale-font-size'))}px`]);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    // Made wide again, the row is one row at full width and the mark is back.
    await page.addStyleTag({ content: '.stage { inline-size: 400px !important; }' });
    expect(rowsOf(await layout(page, 'six'))).toEqual([6]);
    await expect(host(page, 'six').locator('.mark')).toBeVisible();
  });

  test('OTC-24: with the text enlarged the cells grow with their characters — as high as the character’s line and never lower than container.height, all of one size — and the row narrows and wraps; at 200% in a layout 288 wide and in one 150 wide no character is lost, cut or laid over another part, and nothing scrolls sideways', async ({ page }) => {
    await mount(page, [fx('six', { groupSize: 3, value: '123456' }), fx('alpha', { type: 'alphanumeric', groupSize: 3, value: 'W7M93Q' })]);
    await page.addStyleTag({ content: 'main { display: block !important; } .stage { box-sizing: content-box; padding: 16px !important; inline-size: 288px !important; }' });
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    const check = async (id: string, message: string) => {
      const list = await layout(page, id);
      const [height, line] = [await token(page, 'container-height'), (await resolveToken(page, T('input-typescale-font-size'))) * 1.625];
      expect(new Set(list.map((cell) => `${Math.round(cell.width * 10)}x${Math.round(cell.height * 10)}`)).size, `${message}: one size`).toBe(1);
      list.forEach((cell) => expect(cell.height, `${message}: height`).toBeGreaterThanOrEqual(Math.max(height, line) - 0.5));
      const field = await box(host(page, id));
      list.forEach((cell) => expect(cell.x + cell.width, `${message}: inside`).toBeLessThanOrEqual(field.width + 0.5));
      // Every character whole, inside its own cell.
      const whole = await host(page, id).evaluate((el) =>
        [...el.shadowRoot!.querySelectorAll('.cell')].every((cell) => {
          const [outer, inner] = [cell.getBoundingClientRect(), cell.querySelector('.char')!.getBoundingClientRect()];
          return inner.width > 0 && inner.left >= outer.left - 0.5 && inner.right <= outer.right + 0.5 && inner.top >= outer.top - 0.5 && inner.bottom <= outer.bottom + 0.5;
        }),
      );
      expect(whole, `${message}: every character whole`).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${message}: no sideways scroll`).toBe(true);
      return list;
    };
    expect(await cells(page, 'six').nth(0).locator('.char').evaluate((el) => getComputedStyle(el).fontSize)).toBe('32px');
    // The house way to enlarge text is the root's size, which enlarges the paddings, the gaps and the mark with it (the
    // default system's lengths are in rem). Under the default system the six cells then need more than 288 in one row,
    // so they stand in two rows of three (OTC-23, OTC-24's verify).
    const [gap, pad, length] = [await token(page, 'container-gap'), await token(page, 'container-padding-inline'), await token(page, 'separator-width')];
    const digit = await cells(page, 'six').nth(0).locator('.char').evaluate((el) => el.getBoundingClientRect().width);
    expect(6 * (digit + 2 * pad) + 4 * gap + length + 2 * gap, 'one row would be wider than 288').toBeGreaterThan(288);
    const six = await check('six', 'six at 288');
    expect(rowsOf(six), 'two rows of three').toEqual([3, 3]);
    await check('alpha', 'letters at 288');
    await page.addStyleTag({ content: '.stage { inline-size: 150px !important; }' });
    expect(rowsOf(await check('six', 'six at 150'))).toEqual([3, 3]);
    await check('alpha', 'letters at 150');
    // The text alone enlarged (a layer that sets a larger text style): the spec's verify — one row at 288, cells at
    // least container.height high and of one width.
    await page.evaluate(() => (document.documentElement.style.fontSize = ''));
    await rootTokens(page, { [T('input-typescale-font')]: '400 32px/1.625 system-ui' });
    await rootTokens(page, { [T('input-typescale-font-size')]: '32px' });
    await page.addStyleTag({ content: '.stage { inline-size: 288px !important; }' });
    const enlarged = await check('six', 'text alone at 288');
    expect(rowsOf(enlarged)).toEqual([6]);
    enlarged.forEach((cell) => expect(cell.height).toBeGreaterThanOrEqual(48));
    await page.addStyleTag({ content: '.stage { inline-size: 150px !important; }' });
    expect(rowsOf(await check('six', 'text alone at 150'))).toEqual([3, 3]);
  });

  test('OTC-25: a press on a cell, a group mark or the space between cells focuses the field and makes the pressed cell active while it is filled, and otherwise the first empty cell; it changes nothing else and draws no press answer; where a cell is lower than the minimum target the row’s hit area reaches it above and below, without a change of the visual size', async ({ page }) => {
    await mount(page, [fx('code', { value: '1234', groupSize: 3 })]);
    await record(page, 'code');
    await pressCell(page, 'code', 1);
    expect(await read(page, 'code')).toMatchObject({ focused: true, active: [1], selection: [1, 1], value: '1234' });
    // An empty cell: the first empty one.
    await pressCell(page, 'code', 5);
    expect(await read(page, 'code')).toMatchObject({ active: [4], selection: [4, 4] });
    // The mark, and the space between two cells.
    await page.mouse.click(700, 500);
    const mark = await box(host(page, 'code').locator('.mark'));
    await page.mouse.click(mark.x + mark.width / 2, mark.y);
    expect(await read(page, 'code')).toMatchObject({ focused: true, active: [4] });
    const [first, second] = [await box(cells(page, 'code').nth(0)), await box(cells(page, 'code').nth(1))];
    await pressCell(page, 'code', 0);
    await page.mouse.click((first.x + first.width + second.x) / 2, first.y + 10);
    expect(await read(page, 'code')).toMatchObject({ focused: true, active: [4] });
    expect(await events(page)).toEqual([]);
    // No press answer: nothing is marked pressed, and there is no ripple.
    await page.mouse.move(first.x + 10, first.y + 10);
    await page.mouse.down();
    expect(await host(page, 'code').evaluate((el) => el.shadowRoot!.querySelectorAll('[data-pressed], .ripple').length)).toBe(0);
    await page.mouse.up();
    // The hit area: with cells lower than the target, the native element reaches the target's height, centred.
    await rootTokens(page, { [T('container-height')]: '24px' });
    await rootTokens(page, { [T('input-typescale-font')]: '400 12px/1.5 system-ui' });
    await rootTokens(page, { [T('input-typescale-font-size')]: '12px' });
    await rootTokens(page, { [T('input-typescale-line-height')]: '1.5' });
    const target = await resolveToken(page, '--tanrei-sys-target-pointer');
    const [cell, hit] = [await box(cells(page, 'code').nth(0)), await box(native(page, 'code'))];
    near(cell.height, 24, 'the cell keeps its visual size');
    near(hit.height, target, 'the hit area');
    near(hit.y + hit.height / 2, cell.y + cell.height / 2, 'centred on the row');
    await page.mouse.click(700, 500);
    await page.mouse.click(cell.x + 10, cell.y - (target - 24) / 2 + 2);
    expect(await read(page, 'code')).toMatchObject({ focused: true });
  });

  test('OTC-26: with forced colors every cell of every fixture has an edge outline.width wide in the control text color, the active cell that edge at the focused width in the highlight color; characters, masks, group marks and the caret are in the text color, and a disabled field in the disabled text color', async ({ page, browserName }) => {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await mountFixtures(page, spec);
    const system = (name: string) =>
      page.evaluate((n) => {
        const probe = document.createElement('div');
        probe.style.cssText = `position:absolute;visibility:hidden;forced-color-adjust:none;color:${n}`;
        document.body.append(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      }, name);
    const [buttonText, canvasText, grayText, highlight, width] = [await system('ButtonText'), await system('CanvasText'), await system('GrayText'), await system('Highlight'), await token(page, 'outline-width')];
    for (const f of spec.fixtures) {
      const disabled = !!f.props.disabled;
      const count = await cells(page, f.id).count();
      for (const index of [0, count - 1]) {
        const style = await cellStyle(page, f.id, index);
        expect(style.edge, `${f.id} edge`).toBe(disabled ? grayText : buttonText);
        expect(style.edgeWidth, `${f.id} edge width`).toBe(width);
        expect(style.color, `${f.id} character`).toBe(disabled ? grayText : canvasText);
      }
      const mark = host(page, f.id).locator('.mark');
      if (await mark.count()) expect(await mark.first().evaluate((el) => getComputedStyle(el).backgroundColor), `${f.id} mark`).toBe(disabled ? grayText : canvasText);
    }
    // WebKit has no forced-colors mode to emulate: there the rules above are read as written, and no cell is focused.
    test.skip(browserName === 'webkit' && buttonText === canvasText && (await page.evaluate(() => !matchMedia('(forced-colors: active)').matches)), 'this engine does not emulate forced colors');
    await focus(page, 'grouped-partial');
    expect(await cellStyle(page, 'grouped-partial', 4)).toMatchObject({ edge: highlight, edgeWidth: await token(page, 'focused-outline-width') });
    expect(await cellStyle(page, 'grouped-partial', 0)).toMatchObject({ edge: buttonText, edgeWidth: width });
    expect(await host(page, 'grouped-partial').locator('.caret').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(canvasText);
    // The error is carried by no color of the field's own: an error cell's edge is the plain one.
    expect((await cellStyle(page, 'error', 0)).edge).toBe(buttonText);
    expect(await native(page, 'error').getAttribute('aria-invalid')).toBe('true');
  });

  test('OTC-27: in a right-to-left layout the cells stay a left-to-right run — the first character in the leftmost cell, the mark between the same cells, Right Arrow to the cell on the right — and only the row’s place follows the layout: it ends at the right edge, and a wrapped code starts each row there and reads from the top row down', async ({ page }) => {
    await mountFixtures(page, spec);
    const [width, gap] = [await token(page, 'container-width'), await token(page, 'container-gap')];
    for (const id of ['grouped-partial-rtl', 'error-rtl']) {
      const list = await layout(page, id);
      const field = await box(host(page, id));
      near(list[5].x + list[5].width, field.width, `${id}: the row ends at the right edge`);
      for (let index = 1; index < 6; index++) expect(list[index].x, `${id}: left to right`).toBeGreaterThan(list[index - 1].x);
      // The field itself ends at the stage's right edge, inside its padding.
      const outer = await box(stage(page, id));
      near(field.x + field.width, outer.x + outer.width - 16, `${id}: the stage's right edge`);
    }
    // "123" stands in the three leftmost cells; the mark is between the third and the fourth cell.
    expect((await read(page, 'grouped-partial-rtl')).drawn).toBe('1|2|3|||');
    const list = await layout(page, 'grouped-partial-rtl');
    const mark = await box(host(page, 'grouped-partial-rtl').locator('.mark'));
    const origin = await box(host(page, 'grouped-partial-rtl'));
    near(mark.x - origin.x, list[2].x + width + gap, 'the mark after the third cell from the left');
    // The first empty cell — the fourth from the left — is the active one; the arrows move as they are drawn.
    await focus(page, 'grouped-partial-rtl');
    expect((await read(page, 'grouped-partial-rtl')).active).toEqual([3]);
    await page.keyboard.press('ArrowLeft');
    expect((await read(page, 'grouped-partial-rtl')).active).toEqual([2]);
    await page.keyboard.press('ArrowRight');
    expect((await read(page, 'grouped-partial-rtl')).active).toEqual([3]);
    await page.keyboard.press('Home');
    expect((await read(page, 'grouped-partial-rtl')).active).toEqual([0]);
    await page.keyboard.type('9');
    expect(await read(page, 'grouped-partial-rtl')).toMatchObject({ value: '923', drawn: '9|2|3|||', active: [1] });
    // The native element lies over the row and reads left to right.
    const [input, first, last] = [await box(native(page, 'grouped-partial-rtl')), await box(cells(page, 'grouped-partial-rtl').nth(0)), await box(cells(page, 'grouped-partial-rtl').nth(5))];
    near(input.x, first.x, 'the native element starts at the first cell');
    near(input.x + input.width, last.x + last.width, 'and ends at the last');
    expect(await native(page, 'grouped-partial-rtl').evaluate((el) => getComputedStyle(el).direction)).toBe('ltr');
    // Wrapped: each row from the right edge, the first characters in the top row.
    await page.addStyleTag({ content: '.stage { inline-size: 100px !important; }' });
    await set(page, 'grouped-partial-rtl', { value: '123456' });
    const wrapped = await layout(page, 'grouped-partial-rtl');
    const narrow = await box(host(page, 'grouped-partial-rtl'));
    expect(rowsOf(wrapped)).toEqual([3, 3]);
    near(wrapped[2].x + wrapped[2].width, narrow.width, 'the top row ends at the right edge');
    near(wrapped[5].x + wrapped[5].width, narrow.width, 'the second row too');
    expect(wrapped[0].y).toBeLessThan(wrapped[3].y);
    expect(wrapped[0].x).toBeLessThan(wrapped[1].x);
    // By the frame that draws the rows (see OTC-23).
    await expect(host(page, 'grouped-partial-rtl').locator('.mark')).toBeHidden();
  });

  test('OTC-28: it takes its direction from the nearest ancestor that sets one and has no direction setting of its own; when that direction changes while it is shown it is drawn for the new one at once, keeping its value, its active cell and its focus', async ({ page }) => {
    await mount(page, [fx('code', { value: '123', groupSize: 3 })]);
    await page.evaluate(() => {
      const wrapper = document.createElement('div');
      wrapper.id = 'wrapper';
      const el = document.querySelector('tanrei-one-time-code-input')!;
      el.before(wrapper);
      wrapper.append(el);
    });
    expect(await host(page, 'code').evaluate((el) => ['dir', 'direction'].some((name) => name in el.constructor.prototype && Object.getOwnPropertyNames(el.constructor.prototype).includes(name)))).toBe(false);
    await focus(page, 'code');
    await page.keyboard.press('ArrowLeft');
    const before = await read(page, 'code');
    const field = async () => box(host(page, 'code'));
    near((await layout(page, 'code'))[0].x, 0, 'left to right: from the left edge');
    await page.locator('#wrapper').evaluate((el) => el.setAttribute('dir', 'rtl'));
    const rtl = await layout(page, 'code');
    near(rtl[5].x + rtl[5].width, (await field()).width, 'right to left: to the right edge');
    expect(rtl[0].x).toBeLessThan(rtl[1].x);
    // At once: nothing of the row is in a transition of its place.
    expect(await host(page, 'code').evaluate((el) => el.shadowRoot!.querySelector('.row')!.getAnimations({ subtree: true }).filter((a) => a instanceof CSSTransition && !/color|border/.test(a.transitionProperty)).length)).toBe(0);
    expect(await read(page, 'code')).toEqual(before);
    expect(await page.evaluate(() => document.activeElement?.localName)).toBe(TAG);
    await page.locator('#wrapper').evaluate((el) => el.removeAttribute('dir'));
    near((await layout(page, 'code'))[0].x, 0, 'and back');
    expect(await read(page, 'code')).toEqual(before);
  });

  test('OTC-29: in a form it takes a name and submits the code alone — an empty string while it holds none — is reset to the value it was first given, is restored, and reports a missing value while its field says it is required and it is empty; a code shorter than length is reported as nothing', async ({ page }) => {
    await mountFramed(page, [
      framed('need', { label: LABEL, required: true, requiredText: 'Required' }, { groupSize: 3 }),
      framed('free', { label: 'Backup code' }, { groupSize: 3, value: '12' }),
    ]);
    await page.evaluate(() => {
      const form = document.createElement('form');
      document.querySelector('main')!.append(form);
      form.append(...document.querySelectorAll('.stage'));
      const [need, free] = [...document.querySelectorAll('tanrei-one-time-code-input')];
      need.setAttribute('name', 'code');
      free.setAttribute('name', 'backup');
    });
    await settled(page, 'need');
    const data = () => page.evaluate(() => [...new FormData(document.querySelector('form')!).entries()].map(([k, v]) => `${k}=${String(v)}`));
    type Checked = HTMLElement & { validity: ValidityState; validationMessage: string; willValidate: boolean; checkValidity(): boolean; form: HTMLFormElement | null };
    const validity = (id: string) => host(page, id).evaluate((el) => ({ missing: (el as Checked).validity.valueMissing, valid: (el as Checked).validity.valid, message: (el as Checked).validationMessage !== '', check: (el as Checked).checkValidity(), form: (el as Checked).form === document.querySelector('form') }));
    expect(await data()).toEqual(['code=', 'backup=12']);
    expect(await validity('need')).toEqual({ missing: true, valid: false, message: true, check: false, form: true });
    expect(await validity('free')).toEqual({ missing: false, valid: true, message: false, check: true, form: true });
    expect(await page.evaluate(() => document.querySelector('form')!.checkValidity())).toBe(false);
    // A code that is shorter than length is the product's to refuse.
    await focus(page, 'need');
    await page.keyboard.type('12');
    expect(await validity('need')).toMatchObject({ missing: false, valid: true });
    expect(await data()).toEqual(['code=12', 'backup=12']);
    expect(await page.evaluate(() => document.querySelector('form')!.checkValidity())).toBe(true);
    // Reset: the value it was first given (its attribute).
    await focus(page, 'free');
    await page.keyboard.type('3456');
    expect(await data()).toEqual(['code=12', 'backup=123456']);
    await page.evaluate(() => document.querySelector('form')!.reset());
    await settled(page, 'free');
    expect(await data()).toEqual(['code=', 'backup=12']);
    expect((await read(page, 'free')).drawn).toBe('1|2||||');
    // Restored: the browser hands back the state it kept.
    await host(page, 'need').evaluate((el) => (el as HTMLElement & { formStateRestoreCallback(state: string, mode: string): void }).formStateRestoreCallback('987', 'restore'));
    expect((await read(page, 'need')).value).toBe('987');
    expect(await data()).toEqual(['code=987', 'backup=12']);
    // No longer required: nothing is missing.
    await set(page, 'need', { value: '' });
    await stage(page, 'need').locator('tanrei-field').evaluate((el) => ((el as HTMLElement & { required: boolean }).required = false));
    await settled(page, 'need');
    expect(await validity('need')).toMatchObject({ missing: false, valid: true });
  });

  test('OTC-30: it has no words of its own — no fixture draws or exposes a word it was not given, in the rendering or in the role tree, and it reads no key of the product’s words', async ({ page }) => {
    await mountFixtures(page, spec);
    for (const f of spec.fixtures) {
      // Drawn: digits, upper-case letters of the value and the mask's mark, and nothing else.
      const drawn = await host(page, f.id).evaluate((el) => el.shadowRoot!.querySelector('.field')!.textContent!.replace(/\s/g, ''));
      expect(drawn, f.id).toBe(f.props.mask ? '•'.repeat(String(f.props.value ?? '').length) : String(f.props.value ?? ''));
      // Exposed: the label the fixture gave, and no attribute that holds a word of the element's.
      const said = await native(page, f.id).evaluate((input) => ['aria-label', 'aria-description', 'aria-roledescription', 'aria-valuetext', 'title', 'placeholder', 'aria-placeholder'].map((name) => input.getAttribute(name)).filter(Boolean));
      expect(said, f.id).toEqual([String(f.props.label)]);
      await expect(stage(page, f.id)).toMatchAriaSnapshot(`- textbox "${String(f.props.label)}"${f.props.disabled ? ' [disabled]' : ''}`);
    }
    expect(await missingWords(page)).toEqual([]);
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, theme).toEqual([]);
    }
  });

  test('no axe violations inside a field — with help, in error, required and disabled — and focused', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, fieldSpec, {
        theme,
        fixtures: [
          ...fieldSpec.fixtures.filter((f) => f.id === 'code-supporting' || f.id === 'code-error'),
          framed('required', { label: LABEL, required: true, requiredText: 'Required' }, { groupSize: 3 }),
          framed('off', { label: LABEL, disabled: true, supportingText: 'Sent to your phone.' }, { value: '123456' }),
        ],
      });
      await host(page, 'code-supporting').evaluate((el) => (el as HTMLElement).focus());
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, theme).toEqual([]);
    }
  });

  test('what a screen reader is given while a code is typed, replaced and pasted: one text box that keeps its name and its description, whose value is the whole code after every step and whose insertion point is at the active cell — and nothing is announced by the element itself', async ({ page, browserName }) => {
    await mountFramed(page, [framed('code', { label: LABEL, supportingText: 'Enter the 6-digit code we sent you.' }, { groupSize: 3 })]);
    const told = async () => {
      const state = await read(page, 'code');
      const snapshot = await stage(page, 'code').ariaSnapshot();
      const node = browserName === 'chromium' ? (await textboxes(page))[0] : null;
      return { snapshot, value: state.native, at: state.selection, chromium: node && { name: node.name, description: node.description, value: node.value } };
    };
    const box = (value: string) => `- textbox "${LABEL}"${value ? `: "${value}"` : ''}`;
    const chromium = (value: string) => (browserName === 'chromium' ? { name: LABEL, description: 'Enter the 6-digit code we sent you.', value } : null);
    await focus(page, 'code');
    expect(await told()).toMatchObject({ value: '', at: [0, 0], chromium: chromium('') });
    expect((await told()).snapshot).toContain(box(''));
    // Typed: after each digit the text box holds the code so far, the insertion point after it.
    const typed: string[] = [];
    for (const digit of '1234') {
      await page.keyboard.type(digit);
      const now = await told();
      typed.push(`${now.value}@${now.at[0]}`);
      expect(now.snapshot).toContain(box(now.value));
      expect(now.chromium).toEqual(chromium(now.value));
    }
    expect(typed).toEqual(['1@1', '12@2', '123@3', '1234@4']);
    // Replaced: the insertion point stands before the character the next key replaces, then after the new one.
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    expect(await told()).toMatchObject({ value: '1234', at: [2, 2] });
    await page.keyboard.type('9');
    expect(await told()).toMatchObject({ value: '1294', at: [3, 3], chromium: chromium('1294') });
    // Pasted: the whole code at once, the insertion point before the last character.
    await give(page, 'code', 'paste', '654 321');
    expect(await told()).toMatchObject({ value: '654321', at: [5, 5], chromium: chromium('654321') });
    expect((await told()).snapshot).toContain(box('654321'));
    // The element announces nothing: it holds no live region, and nothing but the text box is exposed.
    expect(await host(page, 'code').evaluate((el) => el.shadowRoot!.querySelectorAll('[aria-live], [role="status"], [role="alert"], [role="log"]').length)).toBe(0);
    if (browserName === 'chromium') expect((await axTree(page)).filter((node) => /^[0-9]$/.test(node.name))).toEqual([]);
  });
});

test.describe('fixtures', () => {
  test('every fixture is mounted and visible, with the cells, the groups, the characters and the states the spec gives it', async ({ page }) => {
    await mountFixtures(page, spec);
    expect(spec.fixtures).toHaveLength(19);
    for (const f of spec.fixtures) {
      await expect(host(page, f.id), f.id).toBeVisible();
      const length = Number(f.props.length ?? 6);
      const size = Number(f.props.groupSize ?? 0);
      expect(await cells(page, f.id).count(), f.id).toBe(length);
      expect(await host(page, f.id).locator('.group').count(), f.id).toBe(size ? Math.ceil(length / size) : 1);
      const value = String(f.props.value ?? '');
      expect((await read(page, f.id)).drawn.replaceAll('|', ''), f.id).toBe(f.props.mask ? '•'.repeat(value.length) : value);
      expect(await native(page, f.id).getAttribute('aria-label'), f.id).toBe(String(f.props.label));
      expect(await native(page, f.id).isDisabled(), f.id).toBe(!!f.props.disabled);
      expect(await native(page, f.id).evaluate((input) => (input as HTMLInputElement).readOnly), f.id).toBe(!!f.props.readOnly);
      expect(await native(page, f.id).getAttribute('aria-invalid'), f.id).toBe(f.props.error ? 'true' : null);
      expect(await stage(page, f.id).getAttribute('dir'), f.id).toBe(f.direction ?? null);
    }
    expect(await host(page, 'grouped-ja').getAttribute('lang')).toBe('ja');
  });

  test('the field’s two fixtures draw the frame and the control together: the label above, the cells, and below them the help or, in error, the error text in its place, with the control named and described by the field', async ({ page }) => {
    await mountFixtures(page, fieldSpec, { fixtures: fieldSpec.fixtures.filter((f) => f.id === 'code-supporting' || f.id === 'code-error') });
    for (const id of ['code-supporting', 'code-error']) {
      const f = fieldSpec.fixtures.find((fixture) => fixture.id === id)!;
      const field = stage(page, id).locator('tanrei-field');
      const [label, row, text] = [await box(field.locator('.label-row')), await box(host(page, id)), await box(field.locator(f.props.error ? '.error-text' : '.supporting-text'))];
      expect(label.y + label.height).toBeLessThanOrEqual(row.y + 0.5);
      expect(row.y + row.height).toBeLessThanOrEqual(text.y + 0.5);
      near(row.x, label.x, `${id}: the row starts where the label starts`);
      expect(await native(page, id).getAttribute('aria-label')).toBe(LABEL);
      expect(await native(page, id).getAttribute('aria-description')).toBe(String(f.props.error ? f.props.errorText : f.props.supportingText));
      expect(await native(page, id).getAttribute('aria-invalid')).toBe(f.props.error ? 'true' : null);
      expect(await host(page, id).locator('.group').count()).toBe(2);
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec);
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
