// <tanrei-text-input>, driven by specs/text-input.spec.json: every behaviour id (TXI-1 to TXI-68) starts the title of a
// test, every fixture has a baseline, and every part, state and look is read back from the tokens — never from a number
// written here. What a sentence says of "the Field that frames it" is tested with a Field around the input (`frame()`), and
// the rows themselves — the label above, the requirement tag, the help, the error text, the drawn count — are the
// Field's sentences and the Field's tests (src/components/field/field.test.ts, FLD-2 to FLD-9 and FLD-25 to FLD-28).
import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, acmeSystemCss, loadSpec, missingWords, mountFixtures, requirementDrawn, resolveColor, resolveToken, setWords, tab, tabTo, inputBoxCopies, inputBoxSetApart, inputBoxToken, rootTokens, mountFixtureAsInAll } from '../../../test/harness.js';
import { appearingFixture } from '../../../test/first-frame.js';
import { expectFirstFrameAtRest } from '../../../test/frames.js';
import { opticalSize } from '../../../test/icons.js';
import { holdClock } from '../../../test/page-clock.js';
import { decodePng } from '../../../test/png.js';

const spec = loadSpec('text-input');
type P = Page;
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-text-input`);
const input = (page: P, id: string) => host(page, id).locator('.input');
const part = (page: P, id: string, selector: string) => host(page, id).locator(selector);
/** The resize handle's box: the Handle's container, a separator with the lines as its value (TXI-39, TXI-41). */
const GRIP = '.resize-handle .container';
const css = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
// The box is drawn from the one set of tokens every input box is drawn from (TXI-68); a segment, the
// code face, the entries place and the motion of a height from the text input's own.
const T = inputBoxToken('text-input');
/**
 * An icon's box in a slot is as wide as its glyph, and an engine measures a glyph's advance in its own unit: WebKit on
 * Linux scales the face's advance in 16.16 fixed point (24.00009 for an em of 24) and rounds a box up to its layout
 * unit, a 64th of a pixel (24.015625). A glyph is its em within that unit; its name set as text is several ems.
 */
const GLYPH_UNIT = 1 / 64;
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => { if (message.type() === 'warning') seen.push(message.text()); });
  return seen;
}
/**
 * A text input inside a Field, as a stage of its own added to the mounted page: what a sentence says of "the Field
 * that frames it". The Field is as wide as the fixtures are drawn; `field` and `props` are set as properties.
 */
async function frame(page: P, id: string, field: Record<string, unknown>, props: Record<string, unknown> = {}) {
  await page.evaluate(
    async ([stageId, fieldProps, inputProps]) => {
      const stage = Object.assign(document.createElement('div'), { className: 'stage' });
      stage.dataset.fixture = stageId;
      const framing = Object.assign(document.createElement('tanrei-field'), fieldProps) as HTMLElement & { updateComplete: Promise<unknown> };
      framing.style.inlineSize = '280px';
      const framed = Object.assign(document.createElement('tanrei-text-input'), { segmentEmptyText: 'Empty', resizeLabel: 'Resize', ...inputProps }) as HTMLElement & { updateComplete: Promise<unknown> };
      framing.append(framed);
      stage.append(framing);
      document.querySelector('main')!.append(stage);
      for (let round = 0; round < 2; round++) await Promise.all([framing.updateComplete, framed.updateComplete]);
    },
    [id, field, props] as const,
  );
}
/** A part of the Field that frames the input of the stage `id` — its own row, not a part of the input inside it. */
const row = (page: P, id: string, selector: string) => page.locator(`[data-fixture="${id}"] tanrei-field`).locator(selector);
/** The words of this file's own fixtures: a test is the product there and gives them itself (TXI-52). */
const WORDS = { resizeLabel: 'Resize', segmentEmptyText: 'Empty' };
const fixture = (id: string, props: Fixture['props'], content?: string): Fixture => ({ id, props: { ...WORDS, ...props }, ...(content === undefined ? {} : { content }) });
/** A fixture with no words but the ones it names (TXI-52). */
const wordless = (id: string, props: Fixture['props']): Fixture => ({ id, props: { variant: 'stacked', ...props } });
/** The spec's fixtures whose id matches: a page of fewer fields, where a test walks to one with Tab or the mouse. */
const only = (...ids: RegExp[]) => spec.fixtures.filter((f) => ids.some((id) => id.test(f.id)));
/** A page of the product's own markup (a form), with the default system and every element. */
async function mountHtml(page: P, body: string) {
  const read = (file: string) => fs.readFileSync(new URL(`../../../dist/${file}`, import.meta.url), 'utf8');
  await page.setContent(`<!doctype html><html lang="en"><head><style>${read('tokens.css')}</style></head><body>${body}<script type="module">${read('tanrei.bundle.js')}</script></body></html>`);
  await page.waitForFunction(() => !!customElements.get('tanrei-text-input'));
}
/** Records the element's input, change and action events, with the value each one saw. */
const listen = (locator: Locator) =>
  locator.evaluate((el) => {
    const log = ((window as any).events = [] as [string, string, boolean?][]);
    for (const type of ['input', 'change', 'action']) {
      el.addEventListener(type, (event) => log.push([type, (el as any).value, (event as InputEvent).isComposing]));
    }
  });
const events = (page: P) => page.evaluate(() => ((window as any).events as [string, string, boolean?][]).map(([t, v]) => `${t}:${v}`));
/** A length token in px, or a typescale's line as a length (its line height is a ratio of its size). */
const line = async (page: P, typescale: string) =>
  Number(await token(page, `${typescale}-line-height`)) * (await resolveToken(page, `${typescale}-font-size`));
/**
 * Everything a look paints in a state, as drawn: the parts that are always there. A stacked field has no active
 * indicator and no label, and its edge is the inner line (TXI-26); a filled or outlined field's edge is the outline.
 */
const drawn = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const root = el.shadowRoot!;
    const s = (selector: string, pseudo?: string) => getComputedStyle(root.querySelector(selector)!, pseudo);
    const stacked = !!root.querySelector('.edge');
    return {
      container: s('.field > .container').backgroundColor,
      indicator: stacked ? null : s('.indicator').backgroundColor,
      outline: stacked ? s('.edge').borderTopColor : s('.outline-end').borderTopColor,
      label: root.querySelector('.label') ? s('.label').color : null,
      input: s('.input').color,
      caret: s('.input').caretColor,
      opacity: s('.field').opacity,
    };
  });
const expected = async (page: P, variant: string, state = '', error = false) => {
  const name = (p: string) => T(`${variant}-${state ? `${state}-` : ''}${error ? 'error-' : ''}${p}`);
  return {
    container: await resolveColor(page, name('container-color')),
    indicator: variant === 'stacked' ? null : await resolveColor(page, name('active-indicator-color')),
    outline: await resolveColor(page, name('outline-color')),
    // A stacked input draws no label: the label above it is its Field's row (TXI-13).
    label: variant === 'stacked' ? null : await resolveColor(page, name('label-color')),
    input: await resolveColor(page, name('input-color')),
    caret: await resolveColor(page, name('caret-color')),
    opacity: state ? await token(page, T(`${state}-opacity`)) : '1',
  };
};
/** Records the element's pickerrequest and entryerror events with their details. */
const listenDates = (locator: Locator) =>
  locator.evaluate((el) => {
    const log = ((window as any).dates = [] as string[]);
    for (const type of ['input', 'change', 'pickerrequest', 'entryerror']) {
      el.addEventListener(type, (event) => log.push(`${type}:${type === 'input' || type === 'change' ? (el as any).value : JSON.stringify((event as CustomEvent).detail)}`));
    }
  });
const dateEvents = (page: P) => page.evaluate(() => (window as any).dates as string[]);
/** Replaces the text as a person does: select everything, then type. */
async function retype(page: P, target: Locator, text: string) {
  await target.focus();
  await target.evaluate((el) => (el as HTMLInputElement).select());
  if (text) await page.keyboard.type(text);
  else await page.keyboard.press('Backspace');
}
const blurAll = (page: P) => page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
/** What takes the typing in a field: its native element, or the first segment of a date or time field. */
const entry = (page: P, id: string) => host(page, id).locator(':is(.input, .segment)').first();
/** A date or time field's segments (TXI-42): all of them in the row's order, or the one of a unit. */
const segs = (page: P, id: string) => host(page, id).locator('.segment');
const seg = (page: P, id: string, unit: string) => host(page, id).locator(`.segment[data-unit="${unit}"]`);
/** A date or time field's row as drawn: each segment's text (an empty one's placeholder left out) and the text between them. */
const rowText = (page: P, id: string) => host(page, id).evaluate((el) => Array.from(el.shadowRoot!.querySelectorAll('.row > .literal, .row .segment'), (node) => node.textContent).join(''));
const valueOf = (page: P, id: string) => host(page, id).evaluate((el) => (el as any).value as string);
/** The unit of the segment that has focus in the field, or null when none has. */
const focusedUnit = (page: P, id: string) => host(page, id).evaluate((el) => (el.shadowRoot!.activeElement as HTMLElement | null)?.dataset.unit ?? null);
/**
 * Hands a segment a paste of `text`: a `paste` event carrying it where the browser lets a test build one with data, and
 * otherwise the editing command a paste becomes (`beforeinput`, insertFromPaste) — the field reads either whole (TXI-29).
 */
const paste = (target: Locator, text: string) =>
  target.evaluate((el, pasted) => {
    try {
      const data = new DataTransfer();
      data.setData('text/plain', pasted);
      const event = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true, composed: true });
      if (event.clipboardData?.getData('text/plain') === pasted) {
        el.dispatchEvent(event);
        return 'paste';
      }
    } catch {
      // A browser that cannot build the event: the editing command below.
    }
    el.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertFromPaste', data: pasted, bubbles: true, cancelable: true, composed: true }));
    return 'beforeinput';
  }, text);
/** What a copy or a cut on a segment puts on the clipboard — null where the browser lets no test build the event with a clipboard. */
const copied = (target: Locator, type: 'copy' | 'cut') =>
  target.evaluate((el, kind) => {
    try {
      const event = new ClipboardEvent(kind, { clipboardData: new DataTransfer(), bubbles: true, cancelable: true, composed: true });
      if (!event.clipboardData) return null;
      el.dispatchEvent(event);
      return event.clipboardData.getData('text/plain');
    } catch {
      return null;
    }
  }, type);
/** Puts the caret at the end of the text (End is not the line end on macOS). */
const caretToEnd = (target: Locator) =>
  target.evaluate((el) => {
    const field = el as HTMLInputElement;
    field.setSelectionRange(field.value.length, field.value.length);
  });

test.describe('behavior', () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await acmeSystemCss();
  });
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
  });

  test('TXI-1: every user edit emits input once with the new value; a value the product sets is shown and emits nothing', async ({ page }) => {
    const id = 'outlined-empty';
    await listen(host(page, id));
    await input(page, id).click();
    await page.keyboard.type('ab');
    await page.keyboard.press('Backspace');
    await page.keyboard.insertText('cd'); // a paste, dictation or autofill arrives as one insertion
    expect(await events(page)).toEqual(['input:a', 'input:ab', 'input:a', 'input:acd']);
    await host(page, id).evaluate((el) => ((el as any).value = 'set by the product'));
    await expect(input(page, id)).toHaveValue('set by the product');
    expect(await events(page)).toHaveLength(4);
    // The events leave the shadow root: a listener on the element hears them with the element as target.
    expect(await host(page, id).evaluate((el) => new Promise((resolve) => {
      el.addEventListener('input', (event) => resolve(event.target === el && event.composed), { once: true });
      (el.shadowRoot!.querySelector('.input') as HTMLInputElement).focus();
      document.execCommand('insertText', false, 'x');
    }))).toBe(true);
  });

  test('TXI-2: change is emitted once when focus leaves, or on the action key, with a value different from the one last committed', async ({ page }) => {
    const id = 'outlined-filled';
    await listen(host(page, id));
    await input(page, id).click();
    await page.locator('body').click({ position: { x: 1, y: 1 } }); // focus leaves with nothing changed
    expect(await events(page)).toEqual([]);
    await input(page, id).click();
    await caretToEnd(input(page, id)); // (a click lands the caret where it lands in the text)
    await page.keyboard.type('m');
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    expect(await events(page)).toEqual(['input:ada@example.comm', 'change:ada@example.comm']);
    await input(page, id).click();
    await caretToEnd(input(page, id));
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Enter'); // the action key commits…
    await page.locator('body').click({ position: { x: 1, y: 1 } }); // …so leaving has nothing left to commit
    expect(await events(page)).toEqual(['input:ada@example.comm', 'change:ada@example.comm', 'input:ada@example.com', 'change:ada@example.com', 'action:ada@example.com']);
    // The browser's own change never reaches the page.
    expect((await events(page)).filter((e) => e.startsWith('change'))).toHaveLength(2);
  });

  test('TXI-3: the action key emits action after the change, then submits the form unless cancelled; a multi-line field takes a line break', async ({ page }) => {
    await mountHtml(page, `<form><tanrei-text-input name="q" label="Query"></tanrei-text-input><tanrei-text-input name="m" label="Message" multiline></tanrei-text-input></form>`);
    const [single, multi] = [page.locator('tanrei-text-input').first(), page.locator('tanrei-text-input').last()];
    await page.evaluate(() => {
      const log = ((window as any).log = [] as string[]);
      const form = document.querySelector('form')!;
      form.addEventListener('submit', (event) => { event.preventDefault(); log.push(`submit:${new FormData(form).get('q')}`); });
      for (const el of document.querySelectorAll('tanrei-text-input')) for (const type of ['change', 'action']) el.addEventListener(type, () => log.push(`${type}:${(el as any).value}`));
    });
    await single.locator('.input').click();
    await page.keyboard.type('tanrei');
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => (window as any).log)).toEqual(['change:tanrei', 'action:tanrei', 'submit:tanrei']);
    // A cancelled action keeps the form from being submitted.
    await single.evaluate((el) => el.addEventListener('action', (event) => event.preventDefault()));
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => (window as any).log)).toEqual(['change:tanrei', 'action:tanrei', 'submit:tanrei', 'action:tanrei']);
    // Multi-line: Enter is a line break, with no action and no submission.
    await multi.locator('.input').click();
    await page.keyboard.type('a');
    await page.keyboard.press('Enter');
    await page.keyboard.type('b');
    expect(await multi.evaluate((el) => (el as any).value)).toBe('a\nb');
    expect((await page.evaluate(() => (window as any).log as string[])).filter((e) => e.startsWith('action') || e.startsWith('submit'))).toHaveLength(3);
  });

  test('TXI-4: a composition is left to the input method — nothing written back, cut or committed — and a value set meanwhile waits for its end', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium drives an input method from a test (CDP Input.imeSetComposition)');
    await mountFixtures(page, spec, { fixtures: [fixture('ime', { label: 'Name', maxLength: 3 })] });
    const target = host(page, 'ime');
    await target.evaluate((el) => {
      const log = ((window as any).events = [] as string[]);
      // A product that echoes the value back on every input, as a controlled field does.
      el.addEventListener('input', (event) => { log.push(`input:${(el as any).value}:${(event as InputEvent).isComposing}`); (el as any).value = (el as any).value; });
      el.addEventListener('change', () => log.push('change'));
    });
    await input(page, 'ime').focus();
    const cdp = await page.context().newCDPSession(page);
    for (const text of ['か', 'かん', 'かんじ', 'かんじに']) await cdp.send('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length });
    // Four characters in the element while composing: maxLength does not cut a composition in progress.
    await expect(input(page, 'ime')).toHaveValue('かんじに');
    // A value the product sets during the composition does not reach the element yet.
    await target.evaluate((el) => ((el as any).value = 'かな'));
    await expect(input(page, 'ime')).toHaveValue('かんじに');
    await cdp.send('Input.imeSetComposition', { text: 'かんじにゅ', selectionStart: 5, selectionEnd: 5 });
    await expect(input(page, 'ime')).toHaveValue('かんじにゅ');
    await cdp.send('Input.insertText', { text: '漢字に' }); // commit
    // At the end, the value the product set is applied, and the commit produced an input that is not composing.
    await expect(input(page, 'ime')).toHaveValue('かな');
    await expect.poll(() => page.evaluate(() => (window as any).events.at(-1))).toBe('input:かな:false');
    expect(await page.evaluate(() => (window as any).events.filter((e: string) => e.endsWith(':true')).length)).toBeGreaterThan(0);
    expect(await page.evaluate(() => (window as any).events)).not.toContain('change');

    // Without a value from the product, the limit applies when the composition is committed.
    await mountFixtures(page, spec, { fixtures: [fixture('ime', { label: 'Name', maxLength: 3 })] });
    await input(page, 'ime').focus();
    const again = await page.context().newCDPSession(page);
    await again.send('Input.imeSetComposition', { text: 'かんじにゅ', selectionStart: 5, selectionEnd: 5 });
    await expect(input(page, 'ime')).toHaveValue('かんじにゅ');
    await again.send('Input.insertText', { text: '漢字入力' });
    await expect(input(page, 'ime')).toHaveValue('漢字入');
    await expect.poll(() => host(page, 'ime').evaluate((el) => (el as any).value)).toBe('漢字入');
  });

  test('TXI-5: a disabled field is not focusable or editable, emits nothing, is exposed disabled, is left out of its form and draws its disabled tokens', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...only(/^(outlined|filled)-(?!date|multiline)/, /^stacked-disabled$/), fixture('disabled-error', { variant: 'outlined', label: 'Email', value: 'ada@', error: true, disabled: true })] });
    for (const [id, variant, error] of [['outlined-disabled', 'outlined', false], ['filled-disabled', 'filled', false], ['stacked-disabled', 'stacked', false], ['disabled-error', 'outlined', true]] as const) {
      await listen(host(page, id));
      await host(page, id).click({ force: true });
      await page.keyboard.type('x');
      expect(await events(page), id).toEqual([]);
      await expect(input(page, id), id).not.toBeFocused();
      await expect(host(page, id).getByRole('textbox', { disabled: true }), id).toHaveCount(1);
      await expect.poll(() => drawn(page, id), id).toEqual(await expected(page, variant, 'disabled', error));
    }
    // A disabled field looks the same with or without error.
    expect(await drawn(page, 'disabled-error')).toEqual(await drawn(page, 'outlined-disabled'));
    // Tab passes over it.
    await tabTo(page, host(page, 'filled-error'));
    await tab(page);
    await expect(input(page, 'outlined-read-only')).toBeFocused();
    // Form: a disabled field submits nothing — its own disabled, or a fieldset's.
    await mountHtml(page, `<form><tanrei-text-input name="a" value="1" disabled label="A"></tanrei-text-input><fieldset disabled><tanrei-text-input name="b" value="2" label="B"></tanrei-text-input></fieldset><tanrei-text-input name="c" value="3" label="C"></tanrei-text-input></form>`);
    expect(await page.evaluate(() => [...new FormData(document.querySelector('form')!).entries()])).toEqual([['c', '3']]);
    await expect(page.locator('fieldset tanrei-text-input').getByRole('textbox', { disabled: true })).toHaveCount(1);
  });

  test('TXI-6: hovered and focused render every part from their tokens, focused over hovered; pointer focus selects focused', async ({ page }) => {
    for (const [id, variant] of [['filled-empty', 'filled'], ['outlined-empty', 'outlined'], ['stacked-empty', 'stacked']] as const) {
      await page.mouse.move(0, 0);
      await expect.poll(() => drawn(page, id), id).toEqual(await expected(page, variant));
      await host(page, id).hover();
      await expect.poll(() => drawn(page, id), `${id} hovered`).toEqual(await expected(page, variant, 'hovered'));
      await input(page, id).click(); // pointer focus, still hovered: focused wins
      await expect.poll(() => drawn(page, id), `${id} focused`).toEqual(await expected(page, variant, 'focused'));
      // The focused edge is thicker than the resting one.
      const width = (await resolveToken(page, T('focused-outline-width')));
      expect(width).toBeGreaterThan(await resolveToken(page, T('outline-width')));
      // The edge widens over the state transition: read it once it has arrived, as for stacked.
      if (variant === 'outlined') await expect.poll(() => css(part(page, id, '.outline-end'), 'border-top-width').then(Number.parseFloat)).toBe(width);
      else if (variant === 'stacked') await expect.poll(() => css(part(page, id, '.edge'), 'border-top-width').then(Number.parseFloat)).toBe(width);
      else expect((await bounds(part(page, id, '.indicator'))).height).toBe(await resolveToken(page, T('focused-active-indicator-width')));
      await page.locator('body').click({ position: { x: 1, y: 1 } });
    }
    // The default system: a hovered filled container carries the state layer; an outlined one stays clear; focus never tints it.
    expect(await resolveColor(page, T('filled-hovered-container-color'))).not.toBe(await resolveColor(page, T('filled-container-color')));
    expect(await resolveColor(page, T('outlined-hovered-container-color'))).toBe(await resolveColor(page, T('outlined-container-color')));
    expect(await resolveColor(page, T('filled-focused-container-color'))).toBe(await resolveColor(page, T('filled-container-color')));
    expect(await resolveColor(page, T('stacked-hovered-container-color'))).not.toBe(await resolveColor(page, T('stacked-container-color')));
    expect(await resolveColor(page, T('stacked-focused-container-color'))).toBe(await resolveColor(page, T('stacked-container-color')));
    // The rest of the parts follow the state too: the affixes, the icons.
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('all', { variant: 'filled', label: 'Amount', value: '1', prefixText: '$', suffixText: 'USD' }, 'leading-icon=search trailing-icon=close'),
      ],
    });
    const every = { '.prefix': 'affix', '.suffix': 'affix', '.leading': 'leading-icon', '.trailing': 'trailing-icon' };
    const parts = [...new Set(Object.values(every))];
    await override(page, Object.fromEntries(parts.map((p, i) => [T(`filled-focused-${p}-color`), `rgb(${i + 1}, 0, 0)`])));
    await input(page, 'all').focus();
    for (const [selector, p] of Object.entries(every)) {
      await expect.poll(() => css(part(page, 'all', selector), 'color'), selector).toBe(`rgb(${parts.indexOf(p) + 1}, 0, 0)`);
    }
    // Selected text is highlighted in selection.color and drawn in selection.content.color, in every variant and state
    // (a pair: the highlight carries its own text color).
    const selection = await resolveColor(page, T('selection-color'));
    expect(await css(input(page, 'all'), 'background-color', '::selection')).toBe(selection);
    expect(await css(input(page, 'all'), 'color', '::selection')).toBe(await resolveColor(page, T('selection-content-color')));
    expect(await css(input(page, 'all'), '-webkit-text-fill-color', '::selection')).toBe(await resolveColor(page, T('selection-content-color')));
  });

  test('TXI-6: under acme, where hovered and focused differ, focused wins over hovered', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    const id = 'filled-empty';
    const [hovered, focused] = await Promise.all(['hovered', 'focused'].map((s) => resolveColor(page, T(`filled-${s}-active-indicator-color`))));
    await host(page, id).hover();
    await expect.poll(() => css(part(page, id, '.indicator'), 'background-color')).toBe(hovered);
    await tabTo(page, host(page, id));
    await expect.poll(() => css(part(page, id, '.indicator'), 'background-color')).toBe(focused);
  });

  test('TXI-7: focus is the focused edge, never a ring; under glow the container also glows', async ({ page }) => {
    const id = 'outlined-empty';
    await tabTo(page, host(page, id));
    await expect(input(page, id)).toBeFocused();
    for (const target of [input(page, id), part(page, id, '.field > .container')]) expect(await css(target, 'outline-style')).toBe('none');
    expect(await css(part(page, id, '.field > .container'), 'content', '::after')).toBe('none');
    // A stacked field: its inner line is the focus indicator (TXI-26), and no ring is drawn either.
    await tabTo(page, host(page, 'stacked-empty'));
    await expect.poll(() => css(part(page, 'stacked-empty', '.edge'), 'border-top-color')).toBe(await resolveColor(page, T('stacked-focused-outline-color')));
    for (const target of [input(page, 'stacked-empty'), part(page, 'stacked-empty', '.field > .container')]) expect(await css(target, 'outline-style')).toBe('none');
    expect(await css(part(page, 'stacked-empty', '.field > .container'), 'content', '::after')).toBe('none');
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('ring');

    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('glow');
    await input(page, id).click(); // pointer focus shows it too: a field is focused however it was focused
    const ring = await resolveColor(page, '--tanrei-sys-color-focus-ring');
    await expect.poll(() => css(part(page, id, '.field > .container'), 'box-shadow', '::after')).toContain(ring);
    expect(await css(input(page, id), 'outline-style')).toBe('none');
    // The fallback for browsers without style queries names the same choice.
    expect(await part(page, id, '.field').getAttribute('data-focus-style')).toBe('glow');
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    expect(await css(part(page, id, '.field > .container'), 'content', '::after')).toBe('none');
  });

  test('TXI-8: a press anywhere on the field focuses the input and draws no press answer; the hit area meets the target vertically', async ({ page }) => {
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    for (const id of ['outlined-affixes', 'outlined-icons', 'outlined-empty']) {
      await host(page, id).scrollIntoViewIfNeeded(); // the mouse does not scroll
      const box = await bounds(part(page, id, '.field > .container'));
      expect(box.height, id).toBe(await resolveToken(page, T('container-height-medium')));
      const hit = await part(page, id, '.field > .container').evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').height));
      expect(hit, id).toBe(Math.max(box.height, pointer));
      // The label, the padding, the prefix, a decorative icon, and just outside the visual bounds inside the target.
      const spots = [
        [box.x + 4, box.y + box.height / 2],
        [box.x + box.width - 4, box.y + box.height / 2],
        [box.x + box.width / 2, box.y - (pointer - box.height) / 4],
        [box.x + box.width / 2, box.y + box.height + (pointer - box.height) / 4],
      ];
      const blur = () => page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      for (const [x, y] of spots) {
        await blur(); // (a click on the body would scroll the page back)
        await page.mouse.click(x, y);
        await expect(input(page, id), `${id} at ${x - box.x}, ${y - box.y}`).toBeFocused();
      }
      for (const selector of id === 'outlined-icons' ? ['.label', '.leading'] : ['.label']) {
        await blur();
        await part(page, id, selector).click({ force: true });
        await expect(input(page, id), `${id}: ${selector}`).toBeFocused();
      }
      // No ripple, no pressed state, no dim.
      await page.mouse.down();
      expect(await host(page, id).locator('.ripple, [data-pressed]').count()).toBe(0);
      await page.mouse.up();
    }
  });

  test('TXI-8: a press on the box outside its controls — its padding, a floating label, the prefix, the suffix, a decorative icon — focuses the input; in a date field, a segment; a press on the picker button or on the resize handle does not; focus given to the element goes where a press goes', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...spec.fixtures] });
    const blur = () => blurAll(page);
    // The container's padding, at its start edge.
    await blur();
    await part(page, 'stacked-empty', '.field > .container').click({ position: { x: 3, y: 3 } });
    await expect(input(page, 'stacked-empty')).toBeFocused();
    // A floating label, resting in the input line.
    await blur();
    await part(page, 'outlined-empty', 'label.label').scrollIntoViewIfNeeded();
    const resting = await bounds(part(page, 'outlined-empty', 'label.label'));
    await page.mouse.click(resting.x + resting.width / 2, resting.y + resting.height / 2);
    await expect(input(page, 'outlined-empty')).toBeFocused();
    // The prefix, the suffix and a decorative icon.
    for (const [id, selector] of [['stacked-affixes', '.prefix'], ['stacked-affixes', '.suffix'], ['stacked-icons', '.leading'], ['stacked-icons', '.trailing']] as const) {
      await blur();
      await part(page, id, selector).click();
      await expect(input(page, id), `${id} ${selector}`).toBeFocused();
    }
    // A date field has no input: the press focuses the segment TXI-43 names (the first empty one).
    await blur();
    await part(page, 'stacked-date-empty', '.field > .container').click({ position: { x: 3, y: 3 } });
    expect(await focusedUnit(page, 'stacked-date-empty')).toBe('month');
    await blur();
    await part(page, 'stacked-date-picker', '.picker-button').click();
    expect(await focusedUnit(page, 'stacked-date-picker')).toBeNull();
    await blur();
    await part(page, 'stacked-multiline-manual', GRIP).click();
    await expect(input(page, 'stacked-multiline-manual')).not.toBeFocused();
    // Focus given to the element — by the product, or by the Field that frames it for a press on its label row
    // (FLD-12) — goes where a press goes: the input, and in a date field the segment TXI-43 names (the last, in a
    // filled row).
    await blur();
    await host(page, 'stacked-filled').evaluate((el: HTMLElement) => el.focus());
    await expect(input(page, 'stacked-filled')).toBeFocused();
    await blur();
    await host(page, 'stacked-date').evaluate((el: HTMLElement) => el.focus());
    expect(await focusedUnit(page, 'stacked-date')).toBe(await segs(page, 'stacked-date').last().getAttribute('data-unit'));
    await blur();
    await host(page, 'stacked-date-empty').evaluate((el: HTMLElement) => el.focus());
    expect(await focusedUnit(page, 'stacked-date-empty')).toBe('month');
    // The container of a stacked field at 48 is the touch target itself.
    const box = await bounds(part(page, 'stacked-empty', '.field > .container'));
    const hit = await part(page, 'stacked-empty', '.field > .container').evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').height));
    expect(hit).toBe(Math.max(box.height, await resolveToken(page, '--tanrei-sys-target-pointer')));
  });

  test('TXI-8: a coarse pointer extends the hit area to sys.target.touch', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium can emulate a coarse pointer (touch emulation over CDP)');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    const hit = await part(page, 'outlined-empty', '.field > .container').evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').height));
    expect(hit).toBe(touch);
  });

  test('TXI-10: a read-only field is focusable and selectable, cannot be changed, emits nothing, is exposed read-only, submits, and draws hover and focus', async ({ page }) => {
    const id = 'outlined-read-only';
    await listen(host(page, id));
    await tabTo(page, host(page, id));
    await expect(input(page, id)).toBeFocused();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('xyz');
    await page.keyboard.press('Backspace');
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    expect(await events(page)).toEqual([]);
    await expect(input(page, id)).toHaveValue('ada@example.com');
    await expect(input(page, id)).toHaveJSProperty('readOnly', true);
    // Rendered as an enabled field, hovered and focused included.
    await host(page, id).hover();
    await expect.poll(() => drawn(page, id)).toEqual(await expected(page, 'outlined', 'hovered'));
    await input(page, id).click();
    await expect.poll(() => drawn(page, id)).toEqual(await expected(page, 'outlined', 'focused'));
    // Submitted with its form.
    await mountHtml(page, `<form><tanrei-text-input name="r" value="kept" readonly label="R"></tanrei-text-input></form>`);
    expect(await page.evaluate(() => [...new FormData(document.querySelector('form')!).entries()])).toEqual([['r', 'kept']]);
  });

  test('TXI-11: error — its own, or its Field’s — draws the error parts in every state and is exposed invalid; the input shows no error text of its own, and the words that say what is wrong are its Field’s, which describe it', async ({ page }) => {
    await mountFixtures(page, spec);
    for (const [id, variant] of [['outlined-error', 'outlined'], ['filled-error', 'filled'], ['stacked-error', 'stacked']] as const) {
      await page.mouse.move(0, 0);
      await expect.poll(() => drawn(page, id), id).toEqual(await expected(page, variant, '', true));
      await host(page, id).hover();
      await expect.poll(() => drawn(page, id), `${id} hovered`).toEqual(await expected(page, variant, 'hovered', true));
      await input(page, id).click();
      await expect.poll(() => drawn(page, id), `${id} focused`).toEqual(await expected(page, variant, 'focused', true));
      await page.locator('body').click({ position: { x: 1, y: 1 } });
      await expect(input(page, id)).toHaveAttribute('aria-invalid', 'true');
      // No text of its own: nothing but the box is drawn, and a bare input has no words for the error.
      await expect(part(page, id, '.supporting-text')).toHaveCount(0);
      await expect(host(page, id).getByRole('textbox')).toHaveAccessibleDescription('');
      expect((await bounds(host(page, id))).height, `${id}: as tall as its container`).toBeCloseTo((await bounds(part(page, id, '.field > .container'))).height, 1);
    }
    // The error label and edge are the error role in the default system.
    expect(await resolveColor(page, T('outlined-error-outline-color'))).toBe(await resolveColor(page, '--tanrei-sys-color-error'));
    await expect(input(page, 'outlined-filled')).not.toHaveAttribute('aria-invalid');
    // Its Field's error (FLD-8): the same error parts and the invalid state, with the Field's words as the description
    // (FLD-7, FLD-11). The input's own `error` is not set: the Field said it.
    for (const variant of ['stacked', 'outlined'] as const) {
      const id = `framed-${variant}`;
      await frame(page, id, { label: 'Email', error: true, errorText: 'Enter a complete email address.' }, { variant, value: 'ada@' });
      await page.mouse.move(0, 0);
      await expect.poll(() => drawn(page, id), id).toEqual(await expected(page, variant, '', true));
      await expect(input(page, id)).toHaveAttribute('aria-invalid', 'true');
      await expect(host(page, id).getByRole('textbox', { name: 'Email' })).toHaveAccessibleDescription('Enter a complete email address.');
      expect(await host(page, id).evaluate((el) => (el as any).error)).toBe(false);
      await host(page, id).evaluate((el) => ((el.parentElement as any).error = false));
      await expect(input(page, id)).not.toHaveAttribute('aria-invalid');
      await expect.poll(() => drawn(page, id), `${id}: no error`).toEqual(await expected(page, variant));
    }
  });

  test('TXI-13: the label rests centred in the container and floats — onto the outline’s top edge with a gap, or to the top of a filled container — in the floated style', async ({ page }) => {
    const label = (id: string) => part(page, id, '.label');
    const size = (id: string) => css(label(id), 'font-size').then(Number.parseFloat);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const [resting, floated] = [await resolveToken(page, T('label-typescale-medium-font-size')), await resolveToken(page, T('label-floated-typescale-medium-font-size'))];
    for (const id of ['outlined-empty', 'filled-empty']) {
      const c = await bounds(part(page, id, '.field > .container'));
      const l = await bounds(label(id));
      expect(l.y + l.height / 2, `${id} resting: centred`).toBeCloseTo(c.y + c.height / 2, 0);
      expect(await size(id)).toBe(resting);
    }
    // Floated by a value…
    const outline = await resolveToken(page, T('outline-width'));
    const o = await bounds(part(page, 'outlined-filled', '.field > .container'));
    const ol = await bounds(label('outlined-filled'));
    expect(ol.y + ol.height / 2, 'outlined: centred on the top edge').toBeCloseTo(o.y + outline / 2, 0);
    expect(await size('outlined-filled')).toBe(floated);
    const f = await bounds(part(page, 'filled-filled', '.field > .container'));
    const fl = await bounds(label('filled-filled'));
    expect(fl.y - f.y, 'filled: at the top of the container').toBeCloseTo(await resolveToken(page, T('container-padding-block-with-label-medium')), 0);
    expect(fl.y + fl.height).toBeLessThanOrEqual((await bounds(input(page, 'filled-filled'))).y + 1);
    // …and by focus.
    await input(page, 'outlined-empty').focus();
    await expect.poll(() => size('outlined-empty')).toBe(floated);
    // The gap: notch-padding on each side of the floated label, and the top edge is not drawn there.
    const pad = await resolveToken(page, T('outline-notch-padding'));
    const notch = await bounds(part(page, 'outlined-filled', '.outline-notch'));
    expect(notch.x).toBeCloseTo(ol.x - pad, 0);
    expect(notch.width).toBeCloseTo(ol.width + 2 * pad, 0);
    expect(await css(part(page, 'outlined-filled', '.outline-notch'), 'border-top-color')).toBe('rgba(0, 0, 0, 0)');
    // No gap while the label rests.
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    expect((await bounds(part(page, 'outlined-empty', '.outline-notch'))).width).toBe(0);
    // Beside a leading icon: an outlined field floats its label to padding-inline, over the icon; a filled one keeps it at the text.
    // The icon set's face is loaded, so the glyph is drawn at icon.size (TXI-22) — not its name spelled out in the text
    // face, wider than the icon, on a machine that does not have the icon font installed.
    await mountFixtures(page, spec, { reducedMotion: true, icons: true, fixtures: [fixture('o', { variant: 'outlined', label: 'Search' }, 'leading-icon=search'), fixture('f', { variant: 'filled', label: 'Search' }, 'leading-icon=search')] });
    const padding = await resolveToken(page, T('container-padding-inline-medium'));
    const textStart = async (id: string) => (await bounds(input(page, id))).x;
    const box = async (id: string) => bounds(part(page, id, '.field > .container'));
    expect((await bounds(label('o'))).x, 'outlined resting: at the text').toBeCloseTo(await textStart('o'), 0);
    await input(page, 'o').focus();
    await expect.poll(async () => (await bounds(label('o'))).x - (await box('o')).x, 'outlined floated: at padding-inline').toBeCloseTo(padding, 0);
    for (const focus of [false, true]) {
      if (focus) await input(page, 'f').focus();
      await expect.poll(async () => (await bounds(label('f'))).x, `filled ${focus ? 'floated' : 'resting'}: at the text`).toBeCloseTo(await textStart('f'), 0);
    }
  });

  test('TXI-13, TXI-22, TXI-62: beside a slotted element wider than an icon — the product’s icon button, which keeps its own size — the label still starts at the input text and ends before the trailing box, resting in an outlined field and in both positions in a filled one, and the supporting row of the Field that frames it starts at the text; a glyph sets nothing', async ({ page }) => {
    const BUTTONS = '<tanrei-button variant="text" slot="leading-icon" label="Scan"><span slot="icon">search</span></tanrei-button><tanrei-button variant="text" slot="trailing-icon" label="Clear"><span slot="icon">close</span></tanrei-button>';
    const LONG = 'A label long enough to reach the trailing button of a field this wide';
    await mountFixtures(page, spec, {
      reducedMotion: true,
      icons: true,
      fixtures: [fixture('o', { variant: 'outlined', label: 'Search' }, BUTTONS), fixture('f', { variant: 'filled', label: 'Search' }, BUTTONS), fixture('long', { variant: 'outlined', label: LONG }, BUTTONS), fixture('glyph', { variant: 'outlined', label: 'Search' }, 'leading-icon=search')],
    });
    const label = (id: string) => part(page, id, 'label.label');
    const textStart = async (id: string) => (await bounds(input(page, id))).x;
    const icon = await resolveToken(page, T('icon-size-medium'));
    expect((await bounds(part(page, 'o', '.leading'))).width, 'the button is wider than an icon').toBeGreaterThan(icon + 4);
    await expect.poll(async () => (await bounds(label('o'))).x, 'outlined resting: at the text').toBeCloseTo(await textStart('o'), 0);
    await expect.poll(async () => (await bounds(label('f'))).x, 'filled resting: at the text').toBeCloseTo(await textStart('f'), 0);
    await input(page, 'f').focus();
    await expect.poll(async () => (await bounds(label('f'))).x, 'filled floated: at the text').toBeCloseTo(await textStart('f'), 0);
    // A long resting label ends before the trailing box: it wraps there, and never runs under the button.
    const [long, trailing] = [await bounds(label('long')), await bounds(part(page, 'long', '.trailing'))];
    expect(long.x + long.width, 'the label ends before the trailing box').toBeLessThanOrEqual(trailing.x + 0.5);
    expect(long.x).toBeCloseTo(await textStart('long'), 0);
    // A glyph is an icon wide: nothing is measured into the field, which is laid out by its tokens as it always was.
    expect(await part(page, 'glyph', '.field').evaluate((el) => [(el as HTMLElement).style.getPropertyValue('--_lead'), (el as HTMLElement).style.getPropertyValue('--_trail')])).toEqual(['', '']);
    // TXI-62, FLD-26: the Field's supporting row starts where the text starts.
    await frame(page, 'pair', { label: 'Search', supportingText: 'By name or by number.' }, {});
    await host(page, 'pair').evaluate((el) => el.insertAdjacentHTML('beforeend', '<tanrei-button variant="text" slot="leading-icon" label="Scan"><span slot="icon">search</span></tanrei-button>'));
    await expect.poll(async () => (await bounds(part(page, 'pair', '.leading'))).width).toBeGreaterThan(icon + 4);
    await expect.poll(async () => Math.abs((await bounds(row(page, 'pair', '.supporting-text'))).x - (await textStart('pair'))), 'the row starts at the text').toBeLessThan(0.6);
    // The button goes and a glyph comes: the tokens again.
    await host(page, 'pair').evaluate((el) => {
      el.querySelector('tanrei-button')!.remove();
      el.insertAdjacentHTML('beforeend', '<span slot="leading-icon">search</span>');
    });
    await expect.poll(() => part(page, 'pair', '.field').evaluate((el) => (el as HTMLElement).style.getPropertyValue('--_lead'))).toBe('');
    await expect.poll(async () => Math.abs((await bounds(row(page, 'pair', '.supporting-text'))).x - (await textStart('pair')))).toBeLessThan(0.6);
  });

  test('TXI-13: in a field 96 wide a label that needs two lines wraps, resting and floated, in both variants: every line is drawn, none reaches the input line, the field grows and keeps one height, and an outlined gap is as wide as the widest line', async ({ page }) => {
    await mountFixtures(page, spec, {
      reducedMotion: true,
      fixtures: [
        fixture('outlined-one', { variant: 'outlined', label: 'Email' }),
        fixture('outlined-two', { variant: 'outlined', label: 'Email address' }),
        fixture('filled-one', { variant: 'filled', label: 'Email' }),
        fixture('filled-two', { variant: 'filled', label: 'Email address' }),
      ],
    });
    // The element counts the label's lines when its ResizeObserver reports the new width — in the next rendering update,
    // before that frame is painted. Read before it, the lines have wrapped but their room is not yet given (and read
    // across it, the lines and the container disagree): wait until a frame has run after that update.
    await page.evaluate(async () => {
      document.querySelectorAll('tanrei-text-input').forEach((el) => ((el as HTMLElement).style.inlineSize = '96px'));
      for (let frame = 0; frame < 2; frame++) await new Promise(requestAnimationFrame);
    });
    /** The drawn label's lines (the runs of its text that share a band), as the page shows them. */
    const lines = (id: string) =>
      part(page, id, '.label').evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const out: { top: number; bottom: number; left: number; right: number }[] = [];
        for (const r of Array.from(range.getClientRects()).filter((r) => r.width > 0).sort((a, b) => a.top - b.top)) {
          const line = out.find((l) => (r.top + r.bottom) / 2 >= l.top && (r.top + r.bottom) / 2 <= l.bottom);
          if (line) [line.left, line.right] = [Math.min(line.left, r.left), Math.max(line.right, r.right)];
          else out.push({ top: r.top, bottom: r.bottom, left: r.left, right: r.right });
        }
        const style = getComputedStyle(el);
        return { lines: out, text: range.toString(), cut: style.textOverflow === 'ellipsis' || el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1 };
      });
    const extent = async (id: string) => (await bounds(host(page, id))).height;
    const pad = await resolveToken(page, T('outline-notch-padding'));
    for (const variant of ['outlined', 'filled']) {
      const [one, two] = [`${variant}-one`, `${variant}-two`];
      // Resting: both lines drawn, whole, inside the container.
      const resting = await lines(two);
      expect(resting.lines, `${variant} resting: two lines`).toHaveLength(2);
      expect(resting.text).toBe('Email address');
      expect(resting.cut, `${variant} resting: not cut`).toBe(false);
      const c = await bounds(part(page, two, '.field > .container'));
      for (const l of resting.lines) {
        expect(l.top, `${variant} resting: inside the container`).toBeGreaterThanOrEqual(c.y - 0.5);
        expect(l.bottom).toBeLessThanOrEqual(c.y + c.height + 0.5);
      }
      // The field is taller than with a one-line label.
      const restingHeight = await extent(two);
      expect(restingHeight, `${variant}: taller than with a one-line label`).toBeGreaterThan(await extent(one));

      // Floated: both lines drawn, none reaching the input line, and the field keeps its height.
      await input(page, one).focus();
      const oneLine = (await lines(one)).lines;
      expect(oneLine).toHaveLength(1);
      await input(page, two).focus();
      const floated = await lines(two);
      expect(floated.lines, `${variant} floated: two lines`).toHaveLength(2);
      expect(floated.cut, `${variant} floated: not cut`).toBe(false);
      expect(await extent(two), `${variant}: one height, resting and floated`).toBeCloseTo(restingHeight, 1);
      const field = await bounds(host(page, two));
      const box = await bounds(part(page, two, '.field > .container'));
      const [first, last] = [floated.lines[0], floated.lines[1]];
      if (variant === 'filled') {
        // Inside the field, above the input line, in the band the container holds for them.
        expect(first.top, 'filled floated: inside the field').toBeGreaterThanOrEqual(field.y - 0.5);
        expect(last.bottom, 'filled floated: above the input line').toBeLessThanOrEqual((await bounds(input(page, two))).y + 0.5);
        expect((await bounds(part(page, two, '.label'))).y - box.y).toBeCloseTo(await resolveToken(page, T('container-padding-block-with-label-medium')), 0);
      } else {
        // The last line sits on the top edge where a one-line label does; the line above it in the room above the container.
        const [edge, oneBox] = [box.y, await bounds(part(page, one, '.field > .container'))];
        expect(last.bottom - edge, 'outlined floated: the last line on the top edge').toBeCloseTo(oneLine[0].bottom - oneBox.y, 0);
        expect(first.bottom, 'outlined floated: the line above in the room above the container').toBeLessThanOrEqual(edge + 0.5);
        // That room is reserved: the label reaches above the field only as far as a one-line label does.
        expect(first.top - field.y, 'outlined floated: room reserved above the container').toBeCloseTo(oneLine[0].top - (await bounds(host(page, one))).y, 0);
        // The gap is as wide as the widest line, notch-padding on each side.
        const widest = Math.max(...floated.lines.map((l) => l.right - l.left));
        const notch = await bounds(part(page, two, '.outline-notch'));
        expect(notch.width, 'outlined: the gap opens by the widest line').toBeCloseTo(widest + 2 * pad, 0);
        expect(notch.x).toBeCloseTo(Math.min(...floated.lines.map((l) => l.left)) - pad, 0);
      }
      await page.locator('body').click({ position: { x: 1, y: 1 } });
    }
  });

  test('TXI-14: the label moves over motion.label-*, colors and widths over motion.state-*, and both at once where motion is reduced', async ({ page }) => {
    const id = 'outlined-empty';
    const [labelDuration, stateDuration] = [await resolveToken(page, T('motion-label-duration'), 'duration'), await resolveToken(page, T('motion-state-duration-medium'), 'duration')];
    /**
     * Focuses the input and reads the transitions each part runs, in one task: getAnimations() flushes the style change,
     * so every transition the focus starts is read before any of them can finish — however long a busy machine takes
     * between two calls, where a motion.label-duration transition read in a later call may already be over.
     */
    const focusAndRead = () =>
      host(page, id).evaluate((el) => {
        const root = el.shadowRoot!;
        root.querySelector<HTMLElement>('.input')!.focus();
        const read = (selector: string) =>
          // Whole milliseconds, as the token is: Firefox reports a token of 200 ms as 200.000015 (a float of seconds).
          root.querySelector(selector)!.getAnimations().map((a) => [(a as CSSTransition).transitionProperty, Math.round(Number(a.effect!.getTiming().duration))] as const);
        return { label: read('.label'), notch: read('.outline-notch'), end: read('.outline-end') };
      });
    const idle = () => host(page, id).evaluate((el) => ['.label', '.outline-notch', '.outline-end'].every((s) => el.shadowRoot!.querySelector(s)!.getAnimations().length === 0));
    await expect.poll(idle).toBe(true);
    const focused = await focusAndRead();
    // (Chromium names a logical property's transition by its physical side.)
    const moves = focused.label.map(([p, d]) => [p === 'top' ? 'inset-block-start' : p, d]);
    expect(moves).toContainEqual(['inset-block-start', labelDuration]);
    expect(moves).toContainEqual(['font-size', labelDuration]);
    expect(focused.notch).toContainEqual(['grid-template-columns', labelDuration]);
    expect(focused.end).toContainEqual(['border-top-color', stateDuration]);
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    // The label settles back before motion is reduced: what runs after the focus below is the focus's alone.
    await expect.poll(idle).toBe(true);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reduced = await focusAndRead();
    expect(reduced.label).toEqual([]);
    expect(reduced.notch).toEqual([]);
    expect(reduced.end).toEqual([]);
    expect(await css(part(page, id, '.label'), 'font-size')).toBe(`${await resolveToken(page, T('label-floated-typescale-medium-font-size'))}px`);
  });

  test('TXI-15: a hidden or empty label is not drawn; the placeholder, prefix and suffix show only while the label is floated or not drawn', async ({ page }) => {
    await mountFixtures(page, spec, {
      reducedMotion: true,
      fixtures: [
        ...spec.fixtures,
        fixture('hint', { variant: 'outlined', label: 'Email', placeholder: 'name@example.com' }),
        fixture('affixes-empty', { variant: 'outlined', label: 'Amount', prefixText: '$', suffixText: 'USD' }),
        fixture('stacked-affixes-empty', { label: 'Amount', prefixText: '$', suffixText: 'USD' }),
      ],
    });
    await expect(part(page, 'outlined-label-hidden', '.label')).toHaveCount(0);
    await expect(host(page, 'outlined-label-hidden').getByRole('searchbox', { name: 'Search' })).toHaveCount(1);
    expect(await css(input(page, 'outlined-label-hidden'), 'color', '::placeholder')).toBe(await resolveColor(page, T('outlined-placeholder-color')));
    // The label rests: no placeholder, no affixes. It floats: both.
    expect(await css(input(page, 'hint'), 'color', '::placeholder')).toBe('rgba(0, 0, 0, 0)');
    await expect(part(page, 'affixes-empty', '.prefix')).toBeHidden();
    await input(page, 'hint').focus();
    await expect.poll(() => css(input(page, 'hint'), 'color', '::placeholder')).toBe(await resolveColor(page, T('outlined-focused-placeholder-color')));
    await input(page, 'affixes-empty').focus();
    await expect(part(page, 'affixes-empty', '.prefix')).toBeVisible();
    // The prefix is affix.gap before the value; the suffix is at the end of the input line, affix.gap after the input.
    const gap = await resolveToken(page, T('affix-gap'));
    const [prefix, field, suffix, container] = await Promise.all(['.prefix', '.input', '.suffix', '.field > .container'].map((s) => bounds(part(page, 'outlined-affixes', s))));
    expect(field.x - (prefix.x + prefix.width)).toBeCloseTo(gap, 1);
    expect(suffix.x - (field.x + field.width)).toBeCloseTo(gap, 1);
    expect(container.x + container.width - (suffix.x + suffix.width)).toBeCloseTo(await resolveToken(page, T('container-padding-inline-medium')), 1);
    expect(await css(part(page, 'outlined-affixes', '.prefix'), 'font-size')).toBe(await css(input(page, 'outlined-affixes'), 'font-size'));
    // While shown, they are read with the value: part of the input's description.
    await expect(host(page, 'outlined-affixes').getByRole('textbox', { name: 'Amount' })).toHaveAccessibleDescription('$ USD');
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await expect(input(page, 'affixes-empty')).not.toHaveAttribute('aria-describedby');
    // A stacked label is never in the input line: the placeholder and the affixes show at rest, and describe the input.
    expect(await css(input(page, 'stacked-placeholder'), 'color', '::placeholder')).toBe(await resolveColor(page, T('stacked-placeholder-color')));
    await expect(part(page, 'stacked-affixes-empty', '.prefix')).toBeVisible();
    await expect(part(page, 'stacked-affixes-empty', '.suffix')).toBeVisible();
    await expect(host(page, 'stacked-affixes-empty').getByRole('textbox', { name: 'Amount' })).toHaveAccessibleDescription('$ USD');
    // A hidden label is not drawn, with no label row.
    await expect(part(page, 'stacked-label-hidden', '.label-row')).toHaveCount(0);
  });

  test('TXI-16: heights, padding and corners come from the size tokens — small, medium and large; a labelled filled field keeps room for the floated label from the start', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...spec.fixtures, fixture('filled-hidden', { variant: 'filled', label: 'Search', labelHidden: true })] });
    for (const [id, size] of [['outlined-empty', 'medium'], ['outlined-large', 'large'], ['filled-hidden', 'medium']] as const) {
      expect((await bounds(part(page, id, '.field > .container'))).height, id).toBe(await resolveToken(page, T(`container-height-${size}`)));
    }
    for (const [id, size] of [['filled-empty', 'medium'], ['filled-filled', 'medium'], ['filled-large', 'large']] as const) {
      const min = 2 * (await resolveToken(page, T(`container-padding-block-with-label-${size}`))) + (await line(page, T(`label-floated-typescale-${size}`))) + (await line(page, T(`input-typescale-${size}`)));
      expect((await bounds(part(page, id, '.field > .container'))).height, id).toBeCloseTo(Math.max(min, await resolveToken(page, T(`container-height-${size}`))), 1);
    }
    // The empty filled field has the same height as the filled one: nothing jumps when the label floats.
    expect((await bounds(part(page, 'filled-empty', '.field > .container'))).height).toBe((await bounds(part(page, 'filled-filled', '.field > .container'))).height);
    // Padding: the text at padding-inline, beside an icon the icon at padding-inline-with-icon.
    const c = await bounds(part(page, 'outlined-filled', '.field > .container'));
    expect((await bounds(input(page, 'outlined-filled'))).x - c.x).toBeCloseTo(await resolveToken(page, T('container-padding-inline-medium')), 1);
    const ci = await bounds(part(page, 'outlined-icons', '.field > .container'));
    expect((await bounds(part(page, 'outlined-icons', '.leading'))).x - ci.x).toBeCloseTo(await resolveToken(page, T('container-padding-inline-with-icon-medium')), 1);
    // Corners: all four by container.shape outlined; a filled field's bottom two by shape-bottom.
    const radius = (id: string, corner: string) => css(part(page, id, '.field > .container'), `border-${corner}-radius`).then(Number.parseFloat);
    const [shape, bottom] = [await resolveToken(page, T('container-shape')), await resolveToken(page, T('container-shape-bottom'))];
    expect(await radius('outlined-filled', 'bottom-left')).toBe(shape);
    expect(await radius('outlined-filled', 'bottom-right')).toBe(shape);
    expect(await radius('filled-filled', 'top-left')).toBe(shape);
    expect(await radius('filled-filled', 'bottom-left')).toBe(bottom);
    expect(await radius('filled-filled', 'bottom-right')).toBe(bottom);
    for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) expect(await radius('stacked-filled', corner), `stacked ${corner}`).toBe(shape);
    for (const [id, size] of [['stacked-filled', 'medium'], ['stacked-large', 'large'], ['stacked-small', 'small']] as const) {
      expect((await bounds(part(page, id, '.field > .container'))).height, id).toBe(await resolveToken(page, T(`stacked-container-height-${size}`)));
    }
    // Small: the box's small step — as tall as a small Button (32 high, 12 of padding, the body text style) — for a bar or a toolbar;
    // its hit area still meets the minimum target.
    {
      const small = await bounds(part(page, 'stacked-small', '.field > .container'));
      expect([small.height, (await bounds(input(page, 'stacked-small'))).x - small.x]).toEqual([await resolveToken(page, T('stacked-container-height-small')), await resolveToken(page, T('container-padding-inline-small'))]);
      expect([await resolveToken(page, T('stacked-container-height-small')), await resolveToken(page, T('container-padding-inline-small'))]).toEqual([32, 12]);
      expect(Number.parseFloat(await css(input(page, 'stacked-small'), 'font-size'))).toBe(await resolveToken(page, T('input-typescale-small-font-size')));
      const target = await part(page, 'stacked-small', '.field > .container').evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').height));
      expect(target).toBe(Math.max(small.height, await resolveToken(page, '--tanrei-sys-target-pointer')));
    }
    // It grows with enlarged text and never clips it.
    const before = (await bounds(part(page, 'outlined-filled', '.field > .container'))).height;
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    expect((await bounds(part(page, 'outlined-filled', '.field > .container'))).height).toBeGreaterThan(before * 1.5);
    expect(await input(page, 'outlined-filled').evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
  });

  test('TXI-16: the corners ease by sys.shape.corner-smoothing (cupertino), and the outline follows', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-shape-corner-smoothing')).toBe('0.6');
    const supported = await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'));
    test.skip(!supported, 'corner-shape is not supported by this browser: circular fallback (README)');
    const shape = await css(part(page, 'outlined-filled', '.field > .container'), 'corner-top-left-shape');
    expect(Number.parseFloat(shape.replace(/^superellipse\(|\)$/g, ''))).toBeCloseTo(Math.log2(2.6), 3);
    expect(await css(part(page, 'outlined-filled', '.outline-start'), 'corner-top-left-shape')).toBe(shape);
  });

  test('TXI-17: a multi-line field shows lines of the input style at the height resize names — auto follows the text, manual starts at minRows with a handle, fixed stays at minRows whatever maxRows is — and aligns its label and icons with the first line; unknown values behave as auto and vertical and are reported; a password or a date stays single-line', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      reducedMotion: true,
      fixtures: [
        ...spec.fixtures,
        fixture('grow', { label: 'Notes', multiline: true, minRows: 2, maxRows: 4 }, 'leading-icon=edit'),
        fixture('fixed', { label: 'Notes', multiline: true, resize: 'fixed', minRows: 2, maxRows: 6, value: '1\n2\n3\n4' }),
        fixture('zero', { label: 'Notes', multiline: true, minRows: 0 }),
        fixture('odd', { label: 'Notes', multiline: true, resize: 'sideways', resizeAxis: 'diagonal', value: '1\n2\n3' }),
        fixture('single', { label: 'Notes', resize: 'manual', minRows: 4 }),
        fixture('secret', { type: 'password', label: 'PIN', multiline: true }),
        fixture('when', { type: 'date', locale: 'en-US', label: 'When', multiline: true }),
      ],
    });
    const lineOf = await line(page, T('input-typescale-medium'));
    const height = (id = 'grow') => bounds(input(page, id)).then((b) => b.height);
    expect(await height()).toBeCloseTo(2 * lineOf, 0);
    expect(await input(page, 'grow').evaluate((el) => el.localName)).toBe('textarea');
    expect(Number.parseFloat(await css(input(page, 'grow'), 'line-height'))).toBeCloseTo(lineOf, 1);
    await input(page, 'grow').click();
    await page.keyboard.type('1');
    for (const n of [2, 3]) {
      await page.keyboard.press('Enter'); // a line break, not an action (TXI-3)
      await page.keyboard.type(String(n));
    }
    await expect.poll(height).toBeCloseTo(3 * lineOf, 0);
    for (const n of [4, 5, 6]) {
      await page.keyboard.press('Enter');
      await page.keyboard.type(String(n));
    }
    await expect.poll(height).toBeCloseTo(4 * lineOf, 0);
    expect(await input(page, 'grow').evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    // The caret is kept in view: the text is scrolled to its last line.
    expect(await input(page, 'grow').evaluate((el) => el.scrollTop > 0 && el.scrollTop + el.clientHeight >= el.scrollHeight - Number.parseFloat(getComputedStyle(el).lineHeight) / 2)).toBe(true);
    expect(await host(page, 'grow').evaluate((el) => (el as any).value)).toBe('1\n2\n3\n4\n5\n6');
    // The icon and the resting label sit on the first line, which keeps its place at the top of the container (TXI-51).
    const first = (await bounds(input(page, 'outlined-multiline'))).y + lineOf / 2;
    const icon = await bounds(part(page, 'grow', '.leading'));
    expect(icon.y + icon.height / 2).toBeCloseTo((await bounds(input(page, 'grow'))).y + lineOf / 2, 0);
    await host(page, 'outlined-multiline').evaluate((el) => ((el as any).value = ''));
    const resting = await bounds(part(page, 'outlined-multiline', '.label'));
    expect(resting.y + resting.height / 2).toBeCloseTo(first, 0);
    // Fixed: minRows lines whatever maxRows and the text are; it scrolls, and has no grip.
    expect(await height('fixed')).toBeCloseTo(2 * lineOf, 0);
    expect(await input(page, 'fixed').evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    await expect(part(page, 'fixed', GRIP)).toHaveCount(0);
    expect(await height('stacked-multiline-fixed')).toBeCloseTo(3 * lineOf, 0);
    // Manual: it starts at minRows lines, with the grip.
    expect(await height('stacked-multiline-manual')).toBeCloseTo(3 * lineOf, 0);
    await expect(part(page, 'stacked-multiline-manual', GRIP)).toHaveCount(1);
    // A minRows below 1 is 1.
    expect(await height('zero')).toBeCloseTo(lineOf, 0);
    // Unknown values: auto (the height follows the three lines) and no handle; reported.
    expect(await height('odd')).toBeCloseTo(3 * lineOf, 0);
    await expect(part(page, 'odd', GRIP)).toHaveCount(0);
    // Not multiline: resize, resizeAxis, minRows and maxRows are ignored.
    expect(await input(page, 'single').evaluate((el) => el.localName)).toBe('input');
    await expect(part(page, 'single', GRIP)).toHaveCount(0);
    expect((await bounds(part(page, 'single', '.field > .container'))).height).toBe(await resolveToken(page, T('stacked-container-height-medium')));
    // Password: one line, reported. A date, time or date-time too.
    expect(await input(page, 'secret').evaluate((el) => el.localName)).toBe('input');
    await expect(host(page, 'when').locator('textarea')).toHaveCount(0);
    await expect(segs(page, 'when')).toHaveCount(3);
    await expect.poll(() => seen.filter((w) => w.includes('TXI-17')).length).toBe(4);
    expect(seen).toEqual(expect.arrayContaining([expect.stringMatching(/resize "sideways".*behaves as "auto"/), expect.stringMatching(/resizeAxis "diagonal".*behaves as "vertical"/)]));
  });

  test('TXI-18: maxLength counts user-perceived characters, refuses an edit past it, shortens a paste, and never cuts a value the product sets', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('max', { label: 'Code', maxLength: 3 })] });
    await listen(host(page, 'max'));
    await input(page, 'max').click();
    await page.keyboard.insertText('👍🏽é'); // two characters, six UTF-16 code units
    await page.keyboard.type('a');
    await page.keyboard.type('b'); // refused
    expect(await host(page, 'max').evaluate((el) => (el as any).value)).toBe('👍🏽éa');
    expect(await events(page)).toEqual(['input:👍🏽é', 'input:👍🏽éa']);
    // A paste in the middle is shortened to fit.
    await page.keyboard.press('Backspace');
    await input(page, 'max').evaluate((el) => (el as HTMLInputElement).setSelectionRange(0, 0)); // (Home is not the line start on macOS)
    await page.keyboard.insertText('xyz');
    expect(await host(page, 'max').evaluate((el) => (el as any).value)).toBe('x👍🏽é');
    // The product may set more.
    await host(page, 'max').evaluate((el) => ((el as any).value = 'abcdef'));
    await expect(input(page, 'max')).toHaveValue('abcdef');
  });

  test('TXI-19: with counter the input keeps a count — the user-perceived characters of the value, a slash and maxLength — which is read as countText at every moment, new in its own input event and with a value or a maxLength the product sets; the count is part of its description, is announced once typing pauses, and is drawn nowhere by the input', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('count', { variant: 'outlined', label: 'Display name', value: 'Ada Lovelace', maxLength: 40, counter: true }),
        fixture('emoji', { label: 'Bio', value: 'Hi 👋🏽', counter: true, maxLength: 40 }),
        fixture('open', { label: 'Notes', value: 'abc', counter: true }),
        fixture('none', { label: 'Plain', value: 'abc', maxLength: 40 }),
      ],
    });
    const count = (id: string) => host(page, id).evaluate((el) => (el as any).countText as string);
    expect(await count('count')).toBe('12/40');
    expect(await count('emoji'), 'an emoji with its skin tone is one character').toBe('4/40');
    expect(await count('open'), 'no maxLength: the count alone').toBe('3');
    expect(await count('none'), 'no counter: no count').toBe('');
    // Read-only: what holds the input reads it, and never writes it.
    expect(await host(page, 'count').evaluate((el) => { try { (el as any).countText = '1'; } catch { /* a getter alone */ } return (el as any).countText; })).toBe('12/40');
    // Not drawn: nothing in the input shows the count, and the input is as tall as its container.
    await expect(part(page, 'count', '.counter')).toHaveCount(0);
    expect(await host(page, 'count').evaluate((el) => [...el.shadowRoot!.querySelectorAll('*')].filter((node) => node.textContent === '12/40' && (node as HTMLElement).getClientRects().length > 0).length)).toBe(0);
    expect((await bounds(host(page, 'count'))).height).toBeCloseTo((await bounds(part(page, 'count', '.field > .container'))).height, 1);
    // Part of its own description; none without a counter.
    await expect(host(page, 'count').getByRole('textbox')).toHaveAccessibleDescription('12/40');
    await expect(host(page, 'none').getByRole('textbox')).toHaveAccessibleDescription('');
    // Before the description its Field gives (FLD-11).
    await frame(page, 'framed', { label: 'Bio', supportingText: 'A few words about yourself.' }, { value: 'Hi', counter: true, maxLength: 40 });
    await expect(host(page, 'framed').getByRole('textbox')).toHaveAccessibleDescription('2/40 A few words about yourself.');
    // New with every change of the value, in the input's own event; announced as shown, once, after a one-second pause
    // — not on every keystroke.
    await host(page, 'count').evaluate((el) => {
      (window as any).counts = [];
      el.addEventListener('input', () => (window as any).counts.push((el as any).countText));
    });
    const announcer = part(page, 'count', '.announcer');
    await expect(announcer).toHaveAttribute('aria-live', 'polite');
    await input(page, 'count').click();
    await page.keyboard.press('End');
    for (const key of ['!', '!', '!']) {
      await page.keyboard.type(key);
      await page.waitForTimeout(200);
      await expect(announcer).toHaveText('');
    }
    expect(await page.evaluate(() => (window as any).counts)).toEqual(['13/40', '14/40', '15/40']);
    await expect(announcer).toHaveText('15/40', { timeout: 3000 });
    // …and with a value or a maxLength the product sets, at once.
    expect(await host(page, 'count').evaluate((el) => (Object.assign(el, { value: 'Ada', maxLength: 10 }), (el as any).countText))).toBe('3/10');
    await expect(host(page, 'count').getByRole('textbox')).toHaveAccessibleDescription('3/10');
  });

  test('TXI-19: with the product’s sentence the count is said as a sentence — counterText with {count}, {limit} and {remaining} while there is a limit, counterNoLimitText with {count} while there is none, from the prop or the product’s words, numbers in the locale’s digits — in the description and the announcement, while countText stays the digits; past the limit, and without a sentence, the digits are said', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('limited', { label: 'Display name', value: 'Ada Lovelace', maxLength: 40, counter: true }),
        fixture('open', { label: 'Notes', value: 'abc', counter: true }),
        fixture('own', { label: 'Bio', value: 'Hi', maxLength: 40, counter: true, counterText: '{limit}文字中{count}文字' }),
        fixture('arabic', { label: 'الاسم', value: 'abc', maxLength: 40, counter: true, locale: 'ar-EG', counterText: '{remaining} متبقية' }),
      ],
    });
    // Without a sentence: the digits, as before.
    await expect(host(page, 'limited').getByRole('textbox')).toHaveAccessibleDescription('12/40');
    // The product's words, written once.
    await setWords(page, { characterCountText: '{remaining} characters left', characterCountNoLimitText: '{count} characters' });
    await expect(host(page, 'limited').getByRole('textbox')).toHaveAccessibleDescription('28 characters left');
    await expect(host(page, 'open').getByRole('textbox')).toHaveAccessibleDescription('3 characters');
    // The instance's own wins, in its language's order; the numbers are written in the input's locale.
    await expect(host(page, 'own').getByRole('textbox')).toHaveAccessibleDescription('40文字中2文字');
    const arabic = await host(page, 'arabic').evaluate(() => new Intl.NumberFormat('ar-EG').format(37));
    await expect(host(page, 'arabic').getByRole('textbox')).toHaveAccessibleDescription(`${arabic} متبقية`);
    // What a holder reads, and the Field draws, stays the digits.
    expect(await host(page, 'limited').evaluate((el) => (el as any).countText)).toBe('12/40');
    // The announcement is the sentence, once, after the pause.
    const announcer = part(page, 'limited', '.announcer');
    await input(page, 'limited').click();
    await page.keyboard.press('End');
    await page.keyboard.type('!');
    await expect(announcer).toHaveText('27 characters left', { timeout: 3000 });
    // A value the product set past the limit: a sentence of what is left cannot say it, so the digits are said.
    await host(page, 'limited').evaluate((el) => Object.assign(el, { value: 'x'.repeat(45) }));
    await expect(host(page, 'limited').getByRole('textbox')).toHaveAccessibleDescription('45/40');
    // Another text between braces is said as written, and reported.
    await host(page, 'own').evaluate((el) => Object.assign(el, { counterText: '{used} of {limit}' }));
    await expect(host(page, 'own').getByRole('textbox')).toHaveAccessibleDescription('{used} of 40');
    await expect.poll(() => seen.filter((text) => text.includes('TXI-19') && text.includes('{used}')).length).toBe(1);
  });

  test('TXI-20: each type gets its keyboard and semantics, and the value stays the string typed; a date or a time asks for the numeric keypad on each number segment', async ({ page }) => {
    const types = ['text', 'email', 'password', 'number', 'search', 'tel', 'url', 'code', 'date', 'time', 'date-time'] as const;
    await mountFixtures(page, spec, { fixtures: types.map((type) => fixture(type, { type, label: type, locale: 'en-US' })) });
    const attrs = (id: string) => input(page, id).evaluate((el) => Object.fromEntries(['type', 'inputmode', 'enterkeyhint', 'autocapitalize', 'autocorrect', 'spellcheck'].map((a) => [a, el.getAttribute(a)])));
    expect(await attrs('text')).toMatchObject({ type: 'text', inputmode: null });
    expect(await attrs('email')).toMatchObject({ type: 'text', inputmode: 'email', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false' });
    expect(await attrs('password')).toMatchObject({ type: 'password', autocorrect: 'off' });
    expect(await attrs('number')).toMatchObject({ type: 'text', inputmode: 'decimal' });
    expect(await attrs('search')).toMatchObject({ type: 'search', enterkeyhint: 'search' });
    expect(await attrs('tel')).toMatchObject({ type: 'tel', inputmode: 'tel' });
    expect(await attrs('url')).toMatchObject({ type: 'text', inputmode: 'url', autocapitalize: 'none' });
    // code: a general keyboard (no inputmode, no action key of its own) with nothing the browser would do to prose (TXI-55).
    expect(await attrs('code')).toMatchObject({ type: 'text', inputmode: null, enterkeyhint: null, autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false' });
    // Dates and times: never the native date and time inputs. Each number segment asks for the numeric keypad, without
    // autocapitalization, autocorrection or suggestions; a day period takes letters.
    for (const type of ['date', 'time', 'date-time']) {
      await expect(host(page, type).locator('input, textarea'), type).toHaveCount(0);
      const keyboards = await segs(page, type).evaluateAll((all) => all.map((el) => [el.getAttribute('data-unit'), el.getAttribute('inputmode'), el.getAttribute('autocapitalize'), el.getAttribute('autocorrect'), el.getAttribute('spellcheck'), el.getAttribute('contenteditable')]));
      for (const [unit, inputmode, ...rest] of keyboards) {
        expect(inputmode, `${type} ${unit}`).toBe(unit === 'period' ? null : 'numeric');
        expect(rest, `${type} ${unit}`).toEqual(['none', 'off', 'false', 'true']);
      }
    }
    expect(await segs(page, 'date-time').evaluateAll((all) => all.map((el) => el.getAttribute('data-unit')))).toEqual(['month', 'day', 'year', 'hour', 'minute', 'period']);
    await expect(host(page, 'search').getByRole('searchbox', { name: 'search' })).toHaveCount(1);
    // number does not parse, round or validate.
    await input(page, 'number').click();
    await page.keyboard.type('1,5e3 ');
    expect(await host(page, 'number').evaluate((el) => (el as any).value)).toBe('1,5e3 ');
    await input(page, 'email').click();
    await page.keyboard.type(' not an email ');
    expect(await host(page, 'email').evaluate((el) => [(el as any).value, (el as any).validity.valid])).toEqual([' not an email ', true]);
    // A date holds the ISO 8601 form of TXI-28: a string.
    await seg(page, 'date', 'month').click();
    await page.keyboard.type('09272026');
    expect(await valueOf(page, 'date')).toBe('2026-09-27');
  });

  test('TXI-21: autocomplete is the input’s autofill hint; an autofilled value floats the label, and a field the browser marks autofilled floats it before script sees the value', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: true, fixtures: [fixture('auto', { variant: 'outlined', label: 'Email', autocomplete: 'email' })] });
    await expect(input(page, 'auto')).toHaveAttribute('autocomplete', 'email');
    await listen(host(page, 'auto'));
    // Autofill writes the value and fires input, without focus.
    await input(page, 'auto').evaluate((el) => {
      (el as HTMLInputElement).value = 'ada@example.com';
      el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertReplacementText' }));
    });
    expect(await events(page)).toEqual(['input:ada@example.com']);
    await expect.poll(() => css(part(page, 'auto', '.label'), 'font-size')).toBe(`${await resolveToken(page, T('label-floated-typescale-medium-font-size'))}px`);
    // The browser's autofilled mark floats the label by itself: the floated rule names :autofill.
    const rule = await host(page, 'auto').evaluate((el) =>
      [...el.shadowRoot!.adoptedStyleSheets].flatMap((sheet) => [...sheet.cssRules]).map((r) => (r as CSSStyleRule).selectorText ?? '').find((s) => /autofill/.test(s) && / \.label$/.test(s)),
    );
    expect(rule).toBeTruthy();
  });

  test('TXI-22: icons are drawn at the icon size in the unselected family and fill, colored by their part; every glyph is at a step of sys.icon; an icon button in the slot keeps its own size and is its own tab stop; the browser’s own buttons are hidden', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      // (Its own fixture first: Tab reaches it from the top of the page — a date field is several stops.)
      fixtures: [
        fixture('with-button', { type: 'search', label: 'Search', value: 'x' }, '<span slot="leading-icon">search</span><tanrei-button variant="text" slot="trailing-icon" label="Clear"><span slot="icon">close</span></tanrei-button>'),
        ...spec.fixtures,
      ],
    });
    const size = await resolveToken(page, T('icon-size-medium'));
    for (const selector of ['.leading', '.trailing']) {
      const box = await bounds(part(page, 'outlined-icons', selector));
      // The box is as wide as its glyph, whose advance an engine reports within a unit of its layout (GLYPH_UNIT).
      expect(Math.abs(box.width - size), `${selector}: ${box.width} wide`).toBeLessThanOrEqual(GLYPH_UNIT);
      expect(box.height, selector).toBe(size);
    }
    expect(await css(part(page, 'outlined-icons', '.leading'), 'color')).toBe(await resolveColor(page, T('outlined-leading-icon-color')));
    expect(await css(part(page, 'outlined-icons', '.trailing'), 'color')).toBe(await resolveColor(page, T('outlined-trailing-icon-color')));
    expect(await css(part(page, 'outlined-icons', '.leading'), 'font-variation-settings')).toContain(`"FILL" ${await token(page, '--tanrei-sys-icon-fill-unselected')}`);
    expect(await css(part(page, 'outlined-icons', '.leading'), 'font-variation-settings')).toContain(`"wght" ${await token(page, '--tanrei-sys-icon-weight')}`);
    // The optical size is the box's, clamped to sys.icon.optical-size (test/icons.ts).
    const opsz = await opticalSize(page, size);
    if (opsz === undefined) expect(await css(part(page, 'outlined-icons', '.leading'), 'font-variation-settings')).not.toContain('"opsz"');
    else expect(await css(part(page, 'outlined-icons', '.leading'), 'font-variation-settings')).toContain(`"opsz" ${opsz}`);
    expect(await css(part(page, 'outlined-icons', '.leading'), 'font-optical-sizing')).toBe('auto');
    // Every glyph the input draws — the slots' and the picker button's — is at a step of sys.icon.
    const steps = await Promise.all(['extra-small', 'small', 'medium', 'large'].map((step) => resolveToken(page, `--tanrei-sys-icon-${step}`)));
    const glyphs = [
      (await bounds(part(page, 'outlined-icons', '.leading'))).width,
      (await bounds(part(page, 'stacked-date-picker', '.picker-button').locator('.icon'))).width,
    ];
    for (const width of glyphs) expect(Math.min(...steps.map((step) => Math.abs(step - width))), `${width} is a step of sys.icon`).toBeLessThanOrEqual(GLYPH_UNIT);
    // gap from the text on both sides.
    const gap = await resolveToken(page, T('container-gap-medium'));
    const [lead, field, trail] = await Promise.all(['.leading', '.input', '.trailing'].map((s) => bounds(part(page, 'outlined-icons', s))));
    expect(field.x - (lead.x + lead.width)).toBeCloseTo(gap, 1);
    expect(trail.x - (field.x + field.width)).toBeCloseTo(gap, 1);
    // A product's icon-only Button keeps its own size and its own focus stop, after the input.
    const button = host(page, 'with-button').locator('tanrei-button');
    expect((await bounds(button.locator('button'))).width).toBe(await resolveToken(page, '--tanrei-comp-button-container-height-medium'));
    await tabTo(page, host(page, 'with-button'));
    await expect(input(page, 'with-button')).toBeFocused();
    await tab(page);
    await expect(button.locator('button')).toBeFocused();
    // A press on it is its own, not the field's.
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await button.click();
    await expect(input(page, 'with-button')).not.toBeFocused();
    // The browser's own search cancel and password reveal buttons are not drawn (a computed style cannot reach a UA
    // pseudo-element, so the rule itself is read).
    const hidden = await host(page, 'with-button').evaluate((el) =>
      [...el.shadowRoot!.adoptedStyleSheets].flatMap((sheet) => [...sheet.cssRules]).filter((r) => /::-webkit-search-cancel-button/.test((r as CSSStyleRule).selectorText ?? '')).map((r) => (r as CSSStyleRule).style.display),
    );
    expect(hidden).toContain('none');
  });

  test('TXI-23: the name is its own label, else the label of the Field that frames it — drawn or not, never the placeholder; with neither it renders and is reported; its description is its own and then its Field’s; and while its Field says it is required it is exposed as required and a missing value fails the form’s validation, whichever mark is drawn — it has no requirement of its own', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [...spec.fixtures, fixture('nameless', { placeholder: 'Type here' })] });
    await expect(host(page, 'outlined-filled').getByRole('textbox', { name: 'Email' })).toHaveCount(1);
    await expect(host(page, 'outlined-label-hidden').getByRole('searchbox', { name: 'Search' })).toHaveCount(1);
    // A stacked input draws no label, and its own label still names it.
    await expect(host(page, 'stacked-filled').getByRole('textbox', { name: 'Email', exact: true })).toHaveCount(1);
    await expect(part(page, 'stacked-filled', 'label')).toHaveCount(0);
    await expect(input(page, 'nameless')).not.toHaveAttribute('aria-label');
    expect(await host(page, 'nameless').getByRole('textbox').evaluate((el) => (el as HTMLInputElement).labels?.length ?? 0)).toBe(0);
    expect((await bounds(part(page, 'nameless', '.field > .container'))).height).toBe(await resolveToken(page, T('stacked-container-height-medium')));
    await expect.poll(() => seen.filter((w) => w.includes('TXI-23')).length).toBe(1);
    expect(seen.find((w) => w.includes('TXI-23'))).toContain('no accessible name');
    // A bare input is never required, and has no requirement to set.
    await expect(input(page, 'stacked-empty')).toHaveJSProperty('required', false);
    expect(await host(page, 'stacked-empty').evaluate((el) => ['optional', 'requiredMark', 'supportingText', 'errorText'].filter((name) => name in el))).toEqual([]);
    // In a Field: the Field's label is the name, drawn or hidden; the input's own label wins.
    await frame(page, 'named', { label: 'City', supportingText: 'Where you live.' }, { prefixText: 'JP', counter: true, maxLength: 20 });
    await frame(page, 'hidden', { label: 'Hidden', labelHidden: true }, {});
    await frame(page, 'own', { label: '' }, { label: 'Its own' });
    await expect(host(page, 'named').getByRole('textbox', { name: 'City', exact: true })).toHaveCount(1);
    await expect(host(page, 'hidden').getByRole('textbox', { name: 'Hidden', exact: true })).toHaveCount(1);
    await expect(host(page, 'own').getByRole('textbox', { name: 'Its own', exact: true })).toHaveCount(1);
    // Its own description first — the prefix, the count — then its Field's.
    await expect(host(page, 'named').getByRole('textbox')).toHaveAccessibleDescription('JP 0/20 Where you live.');
    // Required because its Field says so: under no mark, the tag and the asterisk alike, and a floating label's.
    for (const [id, field, props] of [
      ['req-none', { requiredMark: 'none' }, {}],
      ['req-tag', { requiredMark: 'tag', requiredText: 'Required' }, {}],
      ['req-asterisk', { requiredMark: 'asterisk' }, {}],
      ['req-outlined', {}, { variant: 'outlined' }],
    ] as const) {
      await frame(page, id, { label: 'City', required: true, ...field }, { name: 'city', ...props });
      await expect(input(page, id), id).toHaveJSProperty('required', true);
      expect(await host(page, id).evaluate((el) => [(el as any).validity.valueMissing, (el as any).validationMessage !== '']), id).toEqual([true, true]);
    }
    // It never validates because of it beyond the missing value, and a value ends that.
    await host(page, 'req-none').evaluate((el) => ((el as any).value = 'Kyoto'));
    await expect.poll(() => host(page, 'req-none').evaluate((el) => (el as any).validity.valid)).toBe(true);
    await expect(input(page, 'req-none')).not.toHaveAttribute('aria-invalid');
    // Optional: not required; the Field adds its optional text to the description.
    await frame(page, 'optional', { label: 'Company', required: false, optional: true, optionalText: 'Optional' }, {});
    await expect(input(page, 'optional')).toHaveJSProperty('required', false);
    await expect(host(page, 'optional').getByRole('textbox')).toHaveAccessibleDescription('Optional');
    // The Field takes its requirement back: the input is not required any more.
    await host(page, 'req-tag').evaluate((el) => ((el.parentElement as any).required = false));
    await expect(input(page, 'req-tag')).toHaveJSProperty('required', false);
    expect(seen.filter((w) => w.includes('TXI-23')), 'a framed input is named by its Field').toHaveLength(1);
  });

  test('TXI-24: in RTL the layout mirrors, the typed text follows its own direction, and an email value reads left to right at the start edge', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...spec.fixtures, fixture('mail', { type: 'email', label: 'Email', value: 'ada@example.com' }), fixture('file', { variant: 'outlined', label: 'File', value: 'report', prefixText: '~/', suffixText: '.pdf' })] });
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    const c = await bounds(part(page, 'outlined-icons', '.field > .container'));
    const [lead, trail] = await Promise.all(['.leading', '.trailing'].map((s) => bounds(part(page, 'outlined-icons', s))));
    expect(lead.x, 'leading icon on the right').toBeGreaterThan(trail.x);
    expect(c.x + c.width - (lead.x + lead.width)).toBeCloseTo(await resolveToken(page, T('container-padding-inline-with-icon-medium')), 1);
    const label = await bounds(part(page, 'outlined-filled', '.label'));
    const cf = await bounds(part(page, 'outlined-filled', '.field > .container'));
    expect(cf.x + cf.width - (label.x + label.width), 'the label floats from the right edge').toBeCloseTo(await resolveToken(page, T('container-padding-inline-medium')), 1);
    // Beside a value laid out by its own direction the prefix is at the field's start edge and the suffix at its end edge…
    const [prefix, suffix] = await Promise.all(['.prefix', '.suffix'].map((s) => bounds(part(page, 'file', s))));
    expect(prefix.x, 'prose: the prefix on the right').toBeGreaterThan(suffix.x);
    // …and beside one that is always left-to-right they stand as TXI-67 says: "$ 120 USD" as it is written.
    const [sign, code] = await Promise.all(['.prefix', '.suffix'].map((s) => bounds(part(page, 'outlined-affixes', s))));
    expect(sign.x, 'a number: the prefix before it, from the left').toBeLessThan(code.x);
    // Typed text by its own direction; an email value left to right, at the field's start (right) edge.
    await expect(input(page, 'outlined-filled')).toHaveAttribute('dir', 'auto');
    await expect(input(page, 'mail')).toHaveAttribute('dir', 'ltr');
    expect(await css(input(page, 'mail'), 'text-align')).toBe('right');
    expect(await css(input(page, 'mail'), 'direction')).toBe('ltr');
  });

  test('TXI-24: in RTL the picker button is on the left, the resize handle is in the bottom-left corner, and a date is one left-to-right row at the field’s start edge', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...spec.fixtures, fixture('ar', { type: 'date', locale: 'ar-EG', label: 'التاريخ', value: '2026-09-27' })] });
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    const c = await bounds(part(page, 'stacked-date-picker', '.field > .container'));
    const [picker, text] = await Promise.all([bounds(part(page, 'stacked-date-picker', '.picker')), bounds(part(page, 'stacked-date-picker', '.row'))]);
    expect(picker.x, 'the picker button on the left').toBeLessThan(text.x);
    expect(picker.x - c.x).toBeCloseTo(await resolveToken(page, T('container-padding-inline-with-icon-medium')), 1);
    // The handle in the container's bottom-left corner, its box against both edges (TXI-39).
    for (const id of ['stacked-multiline-manual-rtl', 'stacked-multiline-manual']) {
      const [grip, box] = [await bounds(part(page, id, GRIP)), await bounds(part(page, id, '.field > .container'))];
      expect(grip.x - box.x, `${id}: against the left edge`).toBeCloseTo(0, 1);
      expect(box.y + box.height - (grip.y + grip.height), `${id}: against the bottom edge`).toBeCloseTo(0, 1);
    }
    // A date is one left-to-right row at the field's start (right) edge, in the order its locale's form gives: Hebrew
    // and Arabic write day, month, year — drawn left to right, as a date in digits is.
    const pad = await resolveToken(page, T('container-padding-inline-medium'));
    for (const [id, order] of [['stacked-date', ['month', 'day', 'year']], ['stacked-date-rtl', ['day', 'month', 'year']], ['ar', ['day', 'month', 'year']]] as const) {
      await expect(part(page, id, '.row'), id).toHaveAttribute('dir', 'ltr');
      expect(await css(part(page, id, '.row'), 'direction'), id).toBe('ltr');
      const drawn = await segs(page, id).evaluateAll((all) => all.map((el) => ({ unit: el.getAttribute('data-unit'), x: el.getBoundingClientRect().x })).sort((a, b) => a.x - b.x).map((s) => s.unit));
      expect(drawn, `${id}: drawn left to right`).toEqual(order);
      const [row, box] = [await bounds(part(page, id, '.row')), await bounds(part(page, id, '.field > .container'))];
      expect(box.x + box.width - (row.x + row.width), `${id}: at the right edge`).toBeCloseTo(pad, 1);
    }
    expect(await rowText(page, 'stacked-date-rtl')).toBe('27.09.2026');
  });

  test('TXI-26: a stacked field has no edge at rest; focused, a line inside its edge in the focused color and width that moves nothing; in error the error line at rest; hovered, the state layer and no edge', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    expect(await resolveColor(page, T('stacked-outline-color'))).toBe('rgba(0, 0, 0, 0)');
    /** The boxes of the parts that must not move, relative to the host. */
    const layout = (id: string) =>
      host(page, id).evaluate((el) => {
        const origin = el.getBoundingClientRect();
        const root = el.shadowRoot!;
        return ['.field > .container', '.input', '.row', '.leading', '.trailing', '.picker', '.edge'].map((selector) => {
          const node = root.querySelector(selector);
          const r = node?.getBoundingClientRect();
          if (!r || (r.width === 0 && r.height === 0)) return null;
          return [selector, r.x - origin.x, r.y - origin.y, r.width, r.height];
        });
      });
    const [focusedColor, focusedWidth] = [await resolveColor(page, T('stacked-focused-outline-color')), await resolveToken(page, T('focused-outline-width'))];
    for (const id of ['stacked-icons', 'stacked-date-picker']) {
      const edge = part(page, id, '.edge');
      expect(await css(edge, 'border-top-color'), `${id} at rest`).toBe('rgba(0, 0, 0, 0)');
      const before = await layout(id);
      // The line is drawn over the container, not around it: its box is the container's.
      expect(before.find((b) => b?.[0] === '.edge')!.slice(1)).toEqual(before.find((b) => b?.[0] === '.field > .container')!.slice(1));
      await entry(page, id).focus();
      await expect.poll(() => css(edge, 'border-top-color'), `${id} focused`).toBe(focusedColor);
      await expect.poll(() => css(edge, 'border-top-width').then(Number.parseFloat)).toBe(focusedWidth);
      expect(await layout(id), `${id}: nothing moved`).toEqual(before);
      await blurAll(page);
    }
    // It changes over motion.state-*.
    const duration = await resolveToken(page, T('motion-state-duration-medium'), 'duration');
    const running = await host(page, 'stacked-empty').evaluate((el) => {
      const root = el.shadowRoot!;
      root.querySelector<HTMLElement>('.input')!.focus();
      return root.querySelector('.edge')!.getAnimations().map((a) => [(a as CSSTransition).transitionProperty, Math.round(Number(a.effect!.getTiming().duration))]);
    });
    expect(running).toContainEqual(['border-top-color', duration]);
    await blurAll(page);
    // In error: the error line at rest, at outline.width.
    const error = part(page, 'stacked-error', '.edge');
    expect(await css(error, 'border-top-color')).toBe(await resolveColor(page, T('stacked-error-outline-color')));
    expect(await resolveColor(page, T('stacked-error-outline-color'))).toBe(await resolveColor(page, '--tanrei-sys-color-error'));
    expect(Number.parseFloat(await css(error, 'border-top-width'))).toBe(await resolveToken(page, T('outline-width')));
    // Hovered: the state layer on the container, and no edge.
    await part(page, 'stacked-empty', '.field > .container').hover();
    await expect.poll(() => css(part(page, 'stacked-empty', '.field > .container'), 'background-color')).toBe(await resolveColor(page, T('stacked-hovered-container-color')));
    expect(await css(part(page, 'stacked-empty', '.edge'), 'border-top-color')).toBe('rgba(0, 0, 0, 0)');
  });

  test('TXI-28: a date, time or date-time value is the ISO 8601 form of what its segments give, drawn as a row in the locale’s numeric form; placeholder, maxLength, prefixText and suffixText are ignored and reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        ...spec.fixtures,
        fixture('de', { type: 'date', locale: 'de-DE', label: 'Datum', value: '2026-09-27' }),
        fixture('early', { type: 'date', locale: 'en-US', label: 'Early', value: '0987-01-02' }),
        fixture('date-time-empty', { type: 'date-time', locale: 'en-US', label: 'When' }),
        fixture('ignored', { type: 'date', locale: 'en-US', label: 'Birthday', placeholder: 'Your birthday', prefixText: 'on', suffixText: 'UTC', maxLength: 4 }),
      ],
    });
    const written: [string, string, string][] = [
      ['stacked-date', '09/27/2026', '2026-09-27'],
      ['stacked-date-ja', '2026/09/27', '2026-09-27'],
      ['de', '27.09.2026', '2026-09-27'],
      ['early', '01/02/0987', '0987-01-02'],
      ['stacked-time-picker', '2:30 PM', '14:30'],
      ['stacked-time-24h', '14:30', '14:30'],
      ['stacked-date-time-picker', '09/27/2026, 2:30 PM', '2026-09-27T14:30'],
    ];
    for (const [id, text, value] of written) {
      expect(await rowText(page, id), id).toBe(text);
      expect(await valueOf(page, id), id).toBe(value);
      // Not one editable text: no native element holds it.
      await expect(host(page, id).locator('input, textarea'), id).toHaveCount(0);
    }
    // Empty: the value is the empty string, and every empty segment shows its own placeholder.
    for (const [id, placeholders] of [['stacked-date-empty', ['mm', 'dd', 'yyyy']], ['stacked-time-empty', ['hh', 'mm', 'AM']], ['date-time-empty', ['mm', 'dd', 'yyyy', 'hh', 'mm', 'AM']]] as const) {
      expect(await valueOf(page, id), id).toBe('');
      expect(await segs(page, id).evaluateAll((all) => all.map((el) => getComputedStyle(el, '::before').content.replace(/^"|"$/g, ''))), id).toEqual(placeholders);
    }
    // placeholder, prefixText, suffixText and maxLength are ignored, and reported.
    expect(await segs(page, 'ignored').evaluateAll((all) => all.map((el) => getComputedStyle(el, '::before').content.replace(/^"|"$/g, '')))).toEqual(['mm', 'dd', 'yyyy']);
    await expect(part(page, 'ignored', '.prefix')).toBeHidden();
    await expect(part(page, 'ignored', '.suffix')).toBeHidden();
    await seg(page, 'ignored', 'month').click();
    await page.keyboard.type('09272026');
    expect(await valueOf(page, 'ignored')).toBe('2026-09-27');
    await expect.poll(() => seen.filter((w) => w.includes('TXI-28')).length).toBe(4);
    // Without locale: the nearest lang attribute.
    await mountHtml(page, `<div lang="de-DE"><tanrei-text-input type="date" label="Datum" value="2026-09-27"></tanrei-text-input></div>`);
    await expect.poll(() => page.locator('tanrei-text-input').evaluate((el) => Array.from(el.shadowRoot!.querySelectorAll('.row > .literal, .row .segment'), (n) => n.textContent).join(''))).toBe('27.09.2026');
  });

  test('TXI-29: text pasted, dictated or autofilled onto any segment is read whole by the locale’s rules and fills the row, with focus on the last segment; text that reads as nothing changes nothing; copy takes the whole row as drawn, and cut empties it unless the field is read-only', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('d', { type: 'date', locale: 'en-US', label: 'D', max: '2026-12-31' }),
        fixture('t', { type: 'time', locale: 'en-US', label: 'T' }),
        fixture('ja', { type: 'time', locale: 'ja-JP', label: 'J' }),
        fixture('dt', { type: 'date-time', locale: 'en-US', label: 'DT' }),
        fixture('ro', { type: 'date', locale: 'en-US', label: 'RO', value: '2026-09-07', readOnly: true }),
      ],
    });
    /** Pastes onto a segment of the field, emptied first; returns the row as drawn and the value. */
    const pasted = async (id: string, unit: string, text: string, keep = false) => {
      if (!keep) await host(page, id).evaluate((el) => (el as HTMLFormElement & { formResetCallback(): void }).formResetCallback());
      await seg(page, id, unit).click();
      await paste(seg(page, id, unit), text);
      return [await rowText(page, id), await valueOf(page, id)];
    };
    const cases: [string, string, string, string, string][] = [
      // the verify line: pasting onto the day segment, en-US
      ['d', 'day', '9/7/2026', '09/07/2026', '2026-09-07'],
      ['d', 'day', '09-07-2026', '09/07/2026', '2026-09-07'],
      ['d', 'day', '2026.9.7', '09/07/2026', '2026-09-07'],
      ['d', 'year', '  9/7/2026 ', '09/07/2026', '2026-09-07'],
      ['d', 'month', '1/5/2027', '01/05/2027', ''], // it reads, and fills the row; after max, so the value is not available (TXI-46)
      ['t', 'minute', '2:30 pm', '2:30 PM', '14:30'],
      ['t', 'hour', '14:30', '2:30 PM', '14:30'],
      ['t', 'period', '12:05 AM', '12:05 AM', '00:05'],
      ['t', 'hour', '12:30 PM', '12:30 PM', '12:30'],
      ['ja', 'hour', '午後2:30', '14:30', '14:30'],
      ['ja', 'minute', '9時05', '9:05', '09:05'],
      ['dt', 'day', '9/27/2026 14:30', '09/27/2026, 2:30 PM', '2026-09-27T14:30'],
      ['dt', 'hour', '09/27/2026, 2:30 PM', '09/27/2026, 2:30 PM', '2026-09-27T14:30'],
      ['dt', 'year', '2026-09-27T14:30', '09/27/2026, 2:30 PM', '2026-09-27T14:30'],
    ];
    for (const [id, unit, text, row, value] of cases) expect(await pasted(id, unit, text), `${id}: ${text}`).toEqual([row, value]);
    // Focus is on the last segment afterwards.
    await pasted('d', 'month', '9/7/2026');
    expect(await focusedUnit(page, 'd')).toBe('year');
    // Text that reads as nothing leaves every segment as it was — a filled row, and a half-filled one.
    for (const text of ['9/7/26', '2/30/2026', '9/7', 'soon']) expect(await pasted('d', 'day', text, true), text).toEqual(['09/07/2026', '2026-09-07']);
    for (const text of ['13:30 pm', '24:00']) expect(await pasted('t', 'hour', text), text).toEqual([': ', '']);
    expect(await pasted('dt', 'day', '9/27/2026'), 'a date alone in a date-time field').toEqual(['//, : ', '']);
    // Dictation and autofill hand the field a whole text through the editing command: read by the same rules, and input is emitted once.
    await host(page, 'd').evaluate((el) => (el as HTMLFormElement & { formResetCallback(): void }).formResetCallback());
    await listen(host(page, 'd'));
    await seg(page, 'd', 'day').click();
    await seg(page, 'd', 'day').evaluate((el) => el.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: '9/7/2026', bubbles: true, cancelable: true, composed: true })));
    expect([await rowText(page, 'd'), await valueOf(page, 'd')]).toEqual(['09/07/2026', '2026-09-07']);
    expect(await events(page)).toEqual(['input:2026-09-07']);
    // Copy puts the whole row on the clipboard as drawn, whichever segment has focus; a read-only field can be copied from.
    for (const id of ['d', 'ro']) {
      await seg(page, id, 'day').click();
      const text = await copied(seg(page, id, 'day'), 'copy');
      if (text !== null) expect(text, id).toBe('09/07/2026');
      expect(await rowText(page, id)).toBe('09/07/2026');
    }
    // A half-filled row is copied without its placeholders.
    await seg(page, 'd', 'day').click();
    await page.keyboard.press('Backspace');
    const half = await copied(seg(page, 'd', 'day'), 'copy');
    if (half !== null) expect(half).toBe('09//2026');
    // Cut does the same and then empties every segment — not a read-only field's.
    const cut = await copied(seg(page, 'ro', 'day'), 'cut');
    expect(await rowText(page, 'ro')).toBe('09/07/2026');
    if (cut !== null) expect(cut).toBe('09/07/2026');
    await pasted('d', 'day', '9/7/2026');
    const taken = await copied(seg(page, 'd', 'day'), 'cut');
    if (taken !== null) {
      expect(taken).toBe('09/07/2026');
      expect([await rowText(page, 'd'), await valueOf(page, 'd')]).toEqual(['//', '']);
    }
  });

  test('TXI-29: the keyboard’s copy, paste and cut shortcuts on a segment take and give the whole row through the real clipboard', async ({ page, browserName, headless }) => {
    // Headless Chromium keeps a clipboard of its own; a headed browser would read and write the machine's.
    test.skip(browserName !== 'chromium' || !headless, 'only headless Chromium has a clipboard a test may use');
    await mountFixtures(page, spec, { fixtures: [fixture('d', { type: 'date', locale: 'en-US', label: 'D', value: '2026-09-07' })] });
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<textarea id="pad" aria-label="Pad"></textarea>'));
    const pad = page.locator('#pad');
    /** What the clipboard holds: pasted into a plain textarea of the page's. */
    const clipboard = async () => {
      await pad.evaluate((el) => ((el as HTMLTextAreaElement).value = ''));
      await pad.focus();
      await page.keyboard.press('ControlOrMeta+v');
      return pad.inputValue();
    };
    await seg(page, 'd', 'month').click();
    await page.keyboard.press('ControlOrMeta+c');
    expect(await clipboard()).toBe('09/07/2026');
    // A date written another way, copied from the page, pasted onto the day.
    await pad.evaluate((el) => {
      (el as HTMLTextAreaElement).value = '3/4/2025';
      (el as HTMLTextAreaElement).select();
    });
    await page.keyboard.press('ControlOrMeta+c');
    await seg(page, 'd', 'day').click();
    await page.keyboard.press('ControlOrMeta+v');
    await expect.poll(() => valueOf(page, 'd')).toBe('2025-03-04');
    expect(await rowText(page, 'd')).toBe('03/04/2025');
    await page.keyboard.press('ControlOrMeta+x');
    await expect.poll(() => rowText(page, 'd')).toBe('//');
    expect(await clipboard()).toBe('03/04/2025');
  });

  test('TXI-30: a field committed half-filled, or filled with a value that is not available, keeps its segments, empties no more than its value, emits entryError once with the reason and the row as drawn, and is in error until the next edit or a value the product sets; an empty field commits without one', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [
        // Bare: no Field frames it, so the words of its refusal are part of its own description.
        fixture('t', { type: 'time', locale: 'en-US', label: 'At', min: '09:00', unavailableText: 'Too early.' }),
      ],
    });
    // In a Field, which shows the words of the refusal in its supporting row and announces them (FLD-28).
    await frame(page, 'd', { label: 'Due', supportingText: 'By the end of the year.' }, { type: 'date', locale: 'en-US', max: '2026-12-31', invalidText: 'Finish the date.', unavailableText: 'Too late.' });
    await frame(page, 'listed', { label: 'On', errorText: 'Check the date.' }, { type: 'date', locale: 'en-US', disabledDates: ['2026-09-27'] });
    await frame(page, 'req', { label: 'Born', required: true }, { type: 'date', locale: 'en-US' });
    const id = 'd';
    await listenDates(host(page, id));
    const committed = async () => (await dateEvents(page)).filter((e) => !e.startsWith('input:'));
    // An untouched empty field: leaving it emits nothing, whether or not its Field says it is required (TXI-23).
    for (const empty of ['d', 'req']) {
      await seg(page, empty, 'month').click();
      await blurAll(page);
      await expect(seg(page, empty, 'month'), empty).not.toHaveAttribute('aria-invalid');
    }
    expect(await dateEvents(page)).toEqual([]);
    // Half-filled: the month and the day, then focus leaves. The segments stay; entryError, the error look, the invalid
    // text, badInput. (The value was empty and stays empty: no change.)
    await seg(page, id, 'month').click();
    await page.keyboard.type('0927');
    await blurAll(page);
    expect(await rowText(page, id)).toBe('09/27/');
    expect(await valueOf(page, id)).toBe('');
    expect(await committed()).toEqual(['entryerror:{"reason":"invalid","text":"09/27/"}']);
    for (const unit of ['month', 'day', 'year']) await expect(seg(page, id, unit), unit).toHaveAttribute('aria-invalid', 'true');
    await expect(row(page, id, '.error-text')).toHaveText('Finish the date.');
    await expect(row(page, id, '.supporting-text'), 'the error text stands in the help’s place (FLD-7)').toHaveCount(0);
    await expect(host(page, id).getByRole('spinbutton', { name: 'year, Due' })).toHaveAccessibleDescription('Finish the date.');
    await expect.poll(() => host(page, id).evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('.edge')!).borderTopColor)).toBe(await resolveColor(page, T('stacked-error-outline-color')));
    expect(await part(page, id, '.field').getAttribute('data-error')).not.toBeNull();
    expect(await host(page, id).evaluate((el) => [(el as any).validity.badInput, (el as any).validity.valid])).toEqual([true, false]);
    // Committing the same row again begins no second entry error.
    await seg(page, id, 'month').focus();
    await blurAll(page);
    expect(await committed()).toHaveLength(1);
    // The next edit of a segment ends it.
    await seg(page, id, 'year').click();
    await page.keyboard.type('2');
    await expect(seg(page, id, 'year')).not.toHaveAttribute('aria-invalid');
    await expect(row(page, id, '.error-text')).toHaveCount(0);
    await expect(row(page, id, '.supporting-text')).toHaveText('By the end of the year.');
    expect(await host(page, id).evaluate((el) => (el as any).validity.valid)).toBe(true);
    // A short year is half-filled too.
    await blurAll(page);
    expect((await committed()).at(-1)).toBe('entryerror:{"reason":"invalid","text":"09/27/0002"}');
    // After max, committed by the action key: unavailable, rangeOverflow, and announced (the field has focus).
    await seg(page, id, 'month').click();
    await page.keyboard.type('01052027');
    expect(await valueOf(page, id)).toBe('');
    await page.keyboard.press('Enter');
    expect((await committed()).at(-1)).toBe('entryerror:{"reason":"unavailable","text":"01/05/2027"}');
    expect(await rowText(page, id)).toBe('01/05/2027');
    await expect(row(page, id, '.error-text')).toHaveText('Too late.');
    expect(await host(page, id).evaluate((el) => (el as any).validity.rangeOverflow)).toBe(true);
    await expect(row(page, id, '.frame > .announcer')).toHaveText('Too late.');
    // A value that becomes available again is a changed value: change, once, on the next commit.
    await page.keyboard.press('ArrowDown'); // the year, 2026
    await blurAll(page);
    expect((await committed()).at(-1)).toBe('change:2026-01-05');
    // Before min: rangeUnderflow.
    await seg(page, 't', 'hour').click();
    await page.keyboard.type('800a');
    await blurAll(page);
    expect(await rowText(page, 't')).toBe('8:00 AM');
    expect(await host(page, 't').evaluate((el) => [(el as any).value, (el as any).validity.rangeUnderflow])).toEqual(['', true]);
    // No Field frames it: the words of the refusal are part of the input's own description, on every segment.
    for (const segment of await host(page, 't').getByRole('spinbutton').all()) await expect(segment).toHaveAccessibleDescription('Too early.');
    expect(await host(page, 't').evaluate((el) => (el as any).validationMessage)).toBe('Too early.');
    // A listed date: unavailable, a custom error; without its own text, errorText is shown.
    await listenDates(host(page, 'listed'));
    await seg(page, 'listed', 'month').click();
    await page.keyboard.type('09272026');
    await blurAll(page);
    expect(await dateEvents(page)).toEqual(['entryerror:{"reason":"unavailable","text":"09/27/2026"}']);
    expect(await host(page, 'listed').evaluate((el) => [(el as any).value, (el as any).validity.customError])).toEqual(['', true]);
    await expect(row(page, 'listed', '.error-text')).toHaveText('Check the date.');
    // A value the product sets ends it too (TXI-31).
    await host(page, 'listed').evaluate((el) => ((el as any).value = '2026-09-28'));
    await expect(seg(page, 'listed', 'day')).not.toHaveAttribute('aria-invalid');
    expect(await host(page, 'listed').evaluate((el) => (el as any).validity.valid)).toBe(true);
  });

  test('TXI-31: a value the product sets fills every segment — an empty one empties them — ends an entry error, emits nothing and is not checked against min, max and disabledDates; a malformed value, min, max or listed date is treated as empty or absent and reported, and so is a min later than max', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('d', { type: 'date', locale: 'en-US', label: 'Due', max: '2026-12-31', disabledDates: ['2026-03-04', 'next week'], invalidText: 'Finish the date.' }),
        fixture('bad', { type: 'date', locale: 'en-US', label: 'Bad', value: '27/09/2026', min: 'soon' }),
        fixture('crossed', { type: 'time', locale: 'en-US', label: 'Crossed', min: '18:00', max: '09:00' }),
      ],
    });
    await listenDates(host(page, 'd'));
    await seg(page, 'd', 'month').click();
    await page.keyboard.type('09');
    await blurAll(page);
    await expect(seg(page, 'd', 'month')).toHaveAttribute('aria-invalid', 'true');
    const before = (await dateEvents(page)).length;
    // After max, set by the product: every segment filled, not validated, and the entry error ends.
    await host(page, 'd').evaluate((el) => ((el as any).value = '2027-03-04'));
    await expect.poll(() => rowText(page, 'd')).toBe('03/04/2027');
    await expect(seg(page, 'd', 'month')).not.toHaveAttribute('aria-invalid');
    expect(await host(page, 'd').evaluate((el) => [(el as any).value, (el as any).validity.valid])).toEqual(['2027-03-04', true]);
    // A listed date too; and leaving the field with it raises no entry error (the field validates what the person enters).
    await host(page, 'd').evaluate((el) => ((el as any).value = '2026-03-04'));
    await expect.poll(() => rowText(page, 'd')).toBe('03/04/2026');
    await seg(page, 'd', 'day').click();
    await blurAll(page);
    await expect(seg(page, 'd', 'day')).not.toHaveAttribute('aria-invalid');
    // An empty value empties every segment.
    await host(page, 'd').evaluate((el) => ((el as any).value = ''));
    await expect.poll(() => rowText(page, 'd')).toBe('//');
    expect(await dateEvents(page)).toHaveLength(before);
    // Malformed: treated as empty or absent, and reported — the value, min, the listed entry, and a min later than max.
    expect(await rowText(page, 'bad')).toBe('//');
    expect(await valueOf(page, 'bad')).toBe('');
    await expect.poll(() => seen.filter((w) => w.includes('TXI-31')).length).toBe(4);
    expect(seen).toEqual(expect.arrayContaining([expect.stringMatching(/min "18:00" is later than max "09:00"/), expect.stringMatching(/the entry "next week" of disabledDates/)]));
  });

  test('TXI-32: with picker a date, time or date-time field draws an icon-only text Button — its glyph where a trailing icon’s would be, the Button size of the field’s size, named by pickerLabel, opening a dialog, a focus stop after the last segment and a slotted button, disabled with the field; other types ignore picker and report it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      // (Its own fixtures first: Tab reaches them from the top of the page.)
      fixtures: [
        fixture('both', { type: 'date', locale: 'en-US', label: 'Due', picker: true, pickerLabel: 'Choose date' }, '<tanrei-button variant="text" slot="trailing-icon" label="Clear"><span slot="icon">close</span></tanrei-button>'),
        fixture('text-picker', { label: 'Name', picker: true, pickerLabel: 'Pick' }),
        fixture('nameless-picker', { type: 'time', locale: 'en-US', label: 'At', picker: true }),
        fixture('read-only-picker', { type: 'date', locale: 'en-US', label: 'Read', picker: true, pickerLabel: 'Choose date', readOnly: true, value: '2026-09-27' }),
        fixture('no-picker', { type: 'date', locale: 'en-US', label: 'None' }),
        ...spec.fixtures,
      ],
    });
    const button = (id: string) => part(page, id, '.picker-button');
    for (const [id, name, glyph] of [
      ['stacked-date-picker', 'Choose date', 'calendar_month'],
      ['stacked-time-picker', 'Choose time', 'schedule'],
      ['stacked-date-time-picker', 'Choose date and time', 'calendar_month'],
      ['stacked-date-ja', '日付を選択', 'calendar_month'],
      ['outlined-date-picker', 'Choose date', 'calendar_month'],
    ]) {
      await expect(button(id), id).toHaveAttribute('variant', 'text');
      await expect(button(id).locator('[slot="icon"]'), id).toHaveText(glyph);
      const native = host(page, id).getByRole('button', { name, exact: true });
      await expect(native, id).toHaveCount(1);
      await expect(native, id).toHaveAttribute('aria-haspopup', 'dialog');
    }
    for (const [id, size] of [['stacked-date-picker', 'medium'], ['stacked-date-picker-large', 'large']] as const) {
      await expect(button(id)).toHaveAttribute('size', size);
      expect((await bounds(button(id).locator('button'))).height, id).toBe(await resolveToken(page, `--tanrei-comp-button-container-height-${size}`));
      // Its glyph is centred where a trailing icon's would be.
      const c = await bounds(part(page, id, '.field > .container'));
      const g = await bounds(button(id).locator('.icon'));
      const [padding, icon] = [await resolveToken(page, T(`container-padding-inline-with-icon-${size}`)), await resolveToken(page, T(`icon-size-${size}`))];
      expect(c.x + c.width - (g.x + g.width / 2), `${id}: across`).toBeCloseTo(padding + icon / 2, 0);
      expect(g.y + g.height / 2, `${id}: down`).toBeCloseTo(c.y + c.height / 2, 0);
    }
    // The trailing slot's content comes before it, container.gap away; Tab: every segment in turn, the slotted button, the picker button.
    const [trailing, picker] = await Promise.all([bounds(part(page, 'both', '.trailing')), bounds(part(page, 'both', '.picker'))]);
    expect(picker.x - (trailing.x + trailing.width)).toBeCloseTo(await resolveToken(page, T('container-gap-medium')), 1);
    await tabTo(page, seg(page, 'both', 'month'));
    for (const unit of ['day', 'year']) {
      await tab(page);
      expect(await focusedUnit(page, 'both'), unit).toBe(unit);
    }
    await tab(page);
    await expect(host(page, 'both').locator('tanrei-button[slot="trailing-icon"] button')).toBeFocused();
    await tab(page);
    await expect(button('both').locator('button')).toBeFocused();
    // Disabled with the field; not drawn while read-only, without picker, or for another type.
    await expect(host(page, 'stacked-date-disabled').getByRole('button', { name: 'Choose date' })).toBeDisabled();
    for (const id of ['read-only-picker', 'no-picker', 'text-picker']) await expect(button(id), id).toHaveCount(0);
    // Reported: picker on a text field, and a picker button without a name.
    await expect.poll(() => seen.filter((w) => w.includes('TXI-32')).length).toBe(2);
  });

  test('TXI-33: the picker button emits pickerRequest once with the value, type, min and max — the empty value while the row is half-filled, without an entry error, a commit or a change of its own — and moves no focus; the picked value the product sets fills the segments without input or change', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [fixture('p', { type: 'date', locale: 'en-US', label: 'Start', picker: true, pickerLabel: 'Choose date', min: '2026-01-01', max: '2026-12-31', invalidText: 'Finish the date.' })],
    });
    await listenDates(host(page, 'p'));
    const request = (value: string) => `pickerrequest:${JSON.stringify({ value, type: 'date', min: '2026-01-01', max: '2026-12-31' })}`;
    // Half-filled: the request carries the empty value, and no entry error is raised — the picker is about to give a whole value.
    await seg(page, 'p', 'month').click();
    await page.keyboard.type('09');
    await part(page, 'p', '.picker-button').click();
    expect(await dateEvents(page)).toEqual([request('')]);
    await expect(seg(page, 'p', 'month')).not.toHaveAttribute('aria-invalid');
    expect(await rowText(page, 'p')).toBe('09//');
    // Focus leaves for the picker the product presents: still no entry error. The picked value fills the segments, with
    // no input and no change.
    await blurAll(page);
    await expect(seg(page, 'p', 'month')).not.toHaveAttribute('aria-invalid');
    await host(page, 'p').evaluate((el) => ((el as any).value = '2026-10-31'));
    await expect.poll(() => rowText(page, 'p')).toBe('10/31/2026');
    expect(await dateEvents(page)).toEqual([request('')]);
    // By keyboard: the focus stays on the picker button, nothing is committed, and the value is untouched.
    const native = part(page, 'p', '.picker-button').locator('button');
    await seg(page, 'p', 'day').click();
    await page.keyboard.press('ArrowDown'); // 30: input, and nothing committed yet
    await tabTo(page, native);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await expect(native).toBeFocused();
    expect(await dateEvents(page)).toEqual([request(''), 'input:2026-10-30', request('2026-10-30'), request('2026-10-30')]);
    expect(await valueOf(page, 'p')).toBe('2026-10-30');
    // Leaving the field afterwards — not for a picker it asked for and got: focus came back first — commits as ever.
    await seg(page, 'p', 'day').click();
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await blurAll(page);
    expect((await dateEvents(page)).slice(4)).toEqual(['input:2026-10-03', 'input:', 'change:', 'entryerror:{"reason":"invalid","text":"10//2026"}']);
  });


  // ── Resize (TXI-37 … TXI-41), segments (TXI-42 … TXI-47), requirement (TXI-48 … TXI-50) ─────────────

  test('TXI-2: a date field emits change once when focus leaves its segments with a changed value, or on the action key — never while focus moves between its segments', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('d', { type: 'date', locale: 'en-US', label: 'Due' })] });
    await listenDates(host(page, 'd'));
    await seg(page, 'd', 'month').click();
    await blurAll(page); // focus leaves with nothing changed
    expect(await dateEvents(page)).toEqual([]);
    await seg(page, 'd', 'month').click();
    await page.keyboard.type('09272026');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    expect(await dateEvents(page)).toEqual(['input:2026-09-27']);
    await blurAll(page);
    expect(await dateEvents(page)).toEqual(['input:2026-09-27', 'change:2026-09-27']);
    // The action key on a segment commits (and emits action, TXI-3); leaving then has nothing left to commit.
    await host(page, 'd').evaluate((el) => el.addEventListener('action', (event) => ((window as any).dates as string[]).push(`action:${(event as CustomEvent).detail.value}`)));
    await seg(page, 'd', 'year').click();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    await blurAll(page);
    expect((await dateEvents(page)).slice(2)).toEqual(['input:2027-09-27', 'change:2027-09-27', 'action:2027-09-27']);
  });

  test('TXI-6: a floating label’s asterisk and the segments are drawn from the tokens of the highest-precedence state, and the focused segment is highlighted in selection.color', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    await frame(page, 'required', { label: 'Email', required: true, requiredMark: 'asterisk' }, { variant: 'outlined' });
    const colors = { 'required-asterisk': 'rgb(5, 0, 0)' };
    // At rest: the plain parts.
    expect(await css(part(page, 'required', '.label .asterisk'), 'color')).toBe(await resolveColor(page, T('outlined-required-asterisk-color')));
    // Focused over hovered: each part reads the focused token of its variant.
    await override(page, {
      [T('outlined-focused-required-asterisk-color')]: colors['required-asterisk'],
      [T('outlined-hovered-required-asterisk-color')]: 'rgb(9, 9, 9)',
    });
    const focused: [string, string, string, string][] = [
      ['required', '.label .asterisk', 'color', colors['required-asterisk']],
    ];
    for (const [id, selector, property, color] of focused) {
      await host(page, id).hover();
      await expect.poll(() => css(part(page, id, selector), property), `${id} ${selector} hovered`).toBe('rgb(9, 9, 9)');
      await input(page, id).click();
      await expect.poll(() => css(part(page, id, selector), property), `${id} ${selector} focused`).toBe(color);
      await blurAll(page);
    }
    // A date field's segments: the input color, focused while any segment has focus; the focused one drawn as selected text.
    const id = 'stacked-date-picker';
    await expect.poll(() => css(part(page, id, '.row'), 'color')).toBe(await resolveColor(page, T('stacked-input-color')));
    await seg(page, id, 'day').click();
    await expect.poll(() => css(part(page, id, '.edge'), 'border-top-color')).toBe(await resolveColor(page, T('stacked-focused-outline-color')));
    await expect.poll(() => css(part(page, id, '.row'), 'color')).toBe(await resolveColor(page, T('stacked-focused-input-color')));
    expect(await css(seg(page, id, 'day'), 'background-color')).toBe(await resolveColor(page, T('selection-color')));
    expect(await css(seg(page, id, 'day'), 'color')).toBe(await resolveColor(page, T('selection-content-color')));
    expect(await css(seg(page, id, 'month'), 'background-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(seg(page, id, 'month'), 'color')).toBe(await resolveColor(page, T('stacked-focused-input-color')));
    expect(await css(seg(page, id, 'day'), 'caret-color')).toBe('rgba(0, 0, 0, 0)');
    // Disabled: the disabled input color and opacity.
    await expect.poll(() => css(part(page, 'stacked-date-disabled', '.row'), 'color')).toBe(await resolveColor(page, T('stacked-disabled-input-color')));
    expect(await css(part(page, 'stacked-date-disabled', '.field'), 'opacity')).toBe(await token(page, T('disabled-opacity')));
  });

  test('TXI-15: the segments of a date field are shown by the placeholder’s rule — not while a filled or outlined field’s label rests in the input line', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: true, fixtures: [...spec.fixtures, fixture('o', { variant: 'outlined', type: 'date', locale: 'en-US', label: 'Start date' }), fixture('hidden', { variant: 'outlined', type: 'date', locale: 'en-US', label: 'Start date', labelHidden: true })] });
    // The first segment (month) takes focus below, and a focused segment's placeholder is the text on the highlight (TXI-43),
    // so the placeholder's rule is read from the next one, which is not being set.
    const shown = (id: string) => host(page, id).evaluate((el) => [getComputedStyle(el.shadowRoot!.querySelectorAll('.segment')[1]!, '::before').color, getComputedStyle(el.shadowRoot!.querySelector('.literal')!).color]);
    const placeholder = await resolveColor(page, T('outlined-placeholder-color'));
    // The label rests in the input line: neither the placeholders nor the separators are drawn.
    expect(await shown('o')).toEqual(['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)']);
    // Focus floats the label, and the row shows.
    await seg(page, 'o', 'month').focus();
    const focusedPlaceholder = await resolveColor(page, T('outlined-focused-placeholder-color'));
    await expect.poll(() => shown('o')).toEqual([focusedPlaceholder, focusedPlaceholder]);
    expect(await css(seg(page, 'o', 'month'), 'color', '::before'), 'the focused segment’s placeholder').toBe(await resolveColor(page, T('selection-content-color')));
    await expect.poll(() => css(part(page, 'o', 'label.label'), 'font-size')).toBe(`${await resolveToken(page, T('label-floated-typescale-medium-font-size'))}px`);
    // A filled segment keeps the label floated after focus leaves.
    await page.keyboard.type('9');
    await blurAll(page);
    await expect.poll(() => css(part(page, 'o', 'label.label'), 'font-size')).toBe(`${await resolveToken(page, T('label-floated-typescale-medium-font-size'))}px`);
    // A label that is not drawn, or stands above: the row shows at rest.
    expect(await shown('hidden')).toEqual([placeholder, placeholder]);
    expect((await shown('stacked-date-empty'))[0]).toBe(await resolveColor(page, T('stacked-placeholder-color')));
    // A filled outlined date: its label is floated and the row drawn.
    expect(await rowText(page, 'outlined-date-picker')).toBe('09/27/2026');
    expect(await css(part(page, 'outlined-date-picker', 'label.label'), 'font-size')).toBe(`${await resolveToken(page, T('label-floated-typescale-medium-font-size'))}px`);
  });

  test('TXI-37: an auto-resized field places no handle and is exactly as tall as its lines, between minRows and maxRows; beyond maxRows it scrolls, and it shows no scrollbar while every line fits; the height follows typing, a value the product sets, a changed width and enlarged text, and what follows the field moves with it', async ({ page }) => {
    await mountFixtures(page, spec, {
      reducedMotion: true,
      fixtures: [...spec.fixtures, fixture('wrap', { label: 'Notes', multiline: true, value: 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty' }), fixture('upside', { label: 'Notes', multiline: true, minRows: 3, maxRows: 2, value: '1\n2\n3\n4\n5' })],
    });
    const lineOf = await line(page, T('input-typescale-medium'));
    const lines = (id: string) => bounds(input(page, id)).then((b) => b.height / lineOf);
    const scrolls = (id: string) => input(page, id).evaluate((el) => [el.scrollHeight > el.clientHeight + 1, getComputedStyle(el).overflowY]);
    // The fixtures: minRows (three lines of room for two of text), grown (five lines, no limit), and maxRows 3 (scrolled).
    expect(await lines('stacked-multiline')).toBeCloseTo(3, 1);
    expect(await lines('stacked-multiline-auto-grown')).toBeCloseTo(5, 1);
    expect(await lines('stacked-multiline-auto-max')).toBeCloseTo(3, 1);
    for (const id of ['stacked-multiline', 'stacked-multiline-auto-grown', 'stacked-multiline-auto-max']) await expect(part(page, id, GRIP), id).toHaveCount(0);
    expect(await scrolls('stacked-multiline-auto-grown')).toEqual([false, 'hidden']);
    expect(await scrolls('stacked-multiline')).toEqual([false, 'hidden']);
    expect(await scrolls('stacked-multiline-auto-max')).toEqual([true, 'auto']);
    // maxRows smaller than minRows: exactly minRows lines.
    expect(await lines('upside')).toBeCloseTo(3, 1);
    // A line the text wraps onto counts as a line.
    const wrapped = await lines('wrap');
    expect(wrapped).toBeGreaterThanOrEqual(2.9);
    expect(Math.abs(wrapped - Math.round(wrapped))).toBeLessThan(0.05);
    expect(await input(page, 'wrap').evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    // A changed width: narrower wraps onto more lines, wider onto fewer — and the supporting row and the next field move with it.
    const id = 'stacked-multiline-auto-grown';
    const below = async () => (await bounds(page.locator('[data-fixture="stacked-multiline-auto-max"]'))).y;
    const [before, belowBefore] = [await lines(id), await below()];
    await host(page, id).evaluate((el) => ((el as HTMLElement).style.inlineSize = '140px'));
    await expect.poll(() => lines(id)).toBeGreaterThan(before + 0.9);
    const narrow = await lines(id);
    expect(await input(page, id).evaluate((el) => el.scrollHeight <= el.clientHeight + 1), 'every line fits').toBe(true);
    expect((await below()) - belowBefore).toBeCloseTo((narrow - before) * lineOf, 0);
    await host(page, id).evaluate((el) => ((el as HTMLElement).style.inlineSize = '280px'));
    await expect.poll(() => lines(id)).toBeCloseTo(before, 1);
    // A value the product sets, and deleting.
    await host(page, id).evaluate((el) => ((el as any).value = 'one\ntwo\nthree'));
    await expect.poll(() => lines(id)).toBeCloseTo(3, 1);
    await host(page, id).evaluate((el) => ((el as any).value = ''));
    await expect.poll(() => lines(id)).toBeCloseTo(2, 1); // minRows, the default
    // Pasting.
    await input(page, id).click();
    await page.keyboard.insertText('a\nb\nc\nd');
    await expect.poll(() => lines(id)).toBeCloseTo(4, 1);
    // Enlarged text: the lines are taller and the height is still exactly the lines.
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    const large = await line(page, T('input-typescale-medium'));
    expect(large).toBeCloseTo(2 * lineOf, 0);
    // (At this size each of the two paragraphs of stacked-multiline wraps: four lines, past its minRows of three.)
    await expect.poll(async () => (await bounds(input(page, 'stacked-multiline'))).height / large).toBeCloseTo(4, 1);
    await expect.poll(async () => (await bounds(input(page, 'stacked-multiline-fixed'))).height / large).toBeCloseTo(3, 1);
    for (const grown of ['stacked-multiline', id]) await expect.poll(() => input(page, grown).evaluate((el) => el.scrollHeight <= el.clientHeight + 1), grown).toBe(true);
  });

  test('TXI-38: a change of height that follows the value moves over motion.resize-* from the height then shown; the first drawing, a changed width, minRows or maxRows, and reduced motion change it at once', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [fixture('a', { label: 'Notes', multiline: true, value: '1\n2' }), fixture('five', { label: 'Notes', multiline: true, value: '1\n2\n3\n4\n5' }), fixture('b', { label: 'Notes', multiline: true, value: '1\n2' })] });
    const lineOf = await line(page, T('input-typescale-medium'));
    const [duration, easing] = [await resolveToken(page, T('motion-resize-duration'), 'duration'), await token(page, T('motion-resize-easing'))];
    expect(duration).toBe(await resolveToken(page, '--tanrei-sys-motion-role-resize-default', 'duration'));
    // A five-line value on the first render shows five lines with no motion.
    expect(await input(page, 'five').evaluate((el) => [el.getAnimations().length, el.hasAttribute('data-resizing')])).toEqual([0, false]);
    expect((await bounds(input(page, 'five'))).height).toBeCloseTo(5 * lineOf, 0);
    /**
     * Types a line break at the end of the text and samples the motion it starts, in one task: getAnimations() flushes the
     * style change, so the transition is read — and stepped by hand — before it can run out on a busy machine.
     */
    const typeAndSample = (id: string) =>
      input(page, id).evaluate((el) => {
        const field = el as HTMLTextAreaElement;
        // The height the input shows: the room it takes in the container — its box, and what its bottom margin still
        // takes back or holds while the change moves (TXI-51: the box itself is as tall as its text at once).
        const height = () => Number.parseFloat(getComputedStyle(field).height) + Number.parseFloat(getComputedStyle(field).marginBottom);
        const resize = (a: Animation) => /^margin-(bottom|block-end)$/.test((a as CSSTransition).transitionProperty);
        const container = field.closest('.field > .container')!;
        const first = () => field.getBoundingClientRect().y - field.scrollTop - container.getBoundingClientRect().y;
        field.focus();
        field.setSelectionRange(field.value.length, field.value.length);
        const from = height();
        const firstFrom = first();
        document.execCommand('insertText', false, '\n');
        const running = field.getAnimations().filter(resize);
        const motion = running[0] as CSSTransition | undefined;
        if (!motion) return { from, running: 0, to: height() };
        const timing = motion.effect!.getComputedTiming();
        for (const animation of field.getAnimations()) animation.pause();
        const firsts = [firstFrom];
        const samples: number[] = [];
        for (const part of [0, 0.25, 0.5, 0.75]) {
          for (const animation of field.getAnimations()) animation.currentTime = Number(timing.duration) * part;
          samples.push(height());
          firsts.push(first());
        }
        const half = samples[2];
        // A change that arrives while one is running continues from the height then shown.
        document.execCommand('insertText', false, '\n');
        const next = field.getAnimations().filter(resize)[0] as CSSTransition;
        for (const animation of field.getAnimations()) { animation.pause(); animation.currentTime = 0; }
        const continued = height();
        firsts.push(first());
        for (const animation of field.getAnimations()) animation.finish();
        firsts.push(first());
        return { from, running: running.length, duration: Math.round(Number(timing.duration)), easing: (motion.effect as KeyframeEffect).getTiming().easing, samples, half, continued, to: height(), first: field.getBoundingClientRect().y, firsts, scrolled: field.scrollTop, next: !!next };
      });
    const top = (await bounds(input(page, 'a'))).y;
    const moved = await typeAndSample('a');
    expect(moved.running).toBe(1);
    expect(moved.duration).toBe(duration);
    expect(moved.easing!.replace(/\s/g, '')).toBe(easing.replace(/\s/g, ''));
    expect(moved.from).toBeCloseTo(2 * lineOf, 0);
    // It passes through heights between two and three lines…
    expect(moved.half!).toBeGreaterThan(2 * lineOf + 1);
    expect(moved.half!).toBeLessThan(3 * lineOf - 1);
    // …a second line break continues from there, and ends at four lines.
    expect(moved.continued!).toBeCloseTo(moved.samples![3], 0);
    expect(moved.to).toBeCloseTo(4 * lineOf, 0);
    expect(moved.samples![0]).toBeCloseTo(2 * lineOf, 0);
    expect([...moved.samples!].sort((x, y) => x - y)).toEqual(moved.samples);
    // The first line stays where it is: the field grows downward, and — TXI-38's verify — the first line's distance from
    // the container's top edge is the same in every sample: before, through the motion, when a second change arrives
    // and at the end. Nothing was scrolled to do it.
    expect(moved.first!).toBeCloseTo(top, 0);
    expect(new Set(moved.firsts!.map((value) => Math.round(value * 100) / 100)).size).toBe(1);
    expect(moved.scrolled).toBe(0);
    // Afterwards the mark of the motion is gone, so nothing else that changes the height moves it.
    await expect.poll(() => input(page, 'a').evaluate((el) => el.hasAttribute('data-resizing'))).toBe(false);
    // A value the product sets moves too.
    const set = await host(page, 'b').evaluate((el) => {
      const field = el.shadowRoot!.querySelector('textarea')!;
      (el as any).value = '1\n2\n3\n4';
      return (el as any).updateComplete.then(() => field.getAnimations().filter((a: Animation) => /^margin-(bottom|block-end)$/.test((a as CSSTransition).transitionProperty)).length);
    });
    expect(set).toBe(1);
    await expect.poll(async () => (await bounds(input(page, 'b'))).height).toBeCloseTo(4 * lineOf, 0);
    // A changed width, minRows and maxRows change the height at once: no motion is started.
    const at = (change: string) =>
      host(page, 'five').evaluate(async (el, what) => {
        const field = el.shadowRoot!.querySelector('textarea')!;
        if (what === 'width') (el as HTMLElement).style.inlineSize = '120px';
        else if (what === 'minRows') (el as any).minRows = 8;
        else (el as any).maxRows = 2;
        await (el as any).updateComplete;
        for (let frame = 0; frame < 3; frame++) await new Promise(requestAnimationFrame);
        return { running: field.getAnimations().filter((a) => /^margin-(bottom|block-end)$/.test((a as CSSTransition).transitionProperty)).length, height: field.getBoundingClientRect().height };
      }, change);
    const narrow = await at('width');
    expect(narrow.running).toBe(0);
    expect(narrow.height).toBeCloseTo(5 * lineOf, 0); // short lines: still five
    const taller = await at('minRows');
    expect(taller).toEqual({ running: 0, height: 8 * lineOf });
    const capped = await at('maxRows');
    expect(capped.running).toBe(0);
    expect(capped.height).toBeCloseTo(8 * lineOf, 0); // maxRows smaller than minRows: exactly minRows
    // Reduced motion: the next frame is three lines.
    await mountFixtures(page, spec, { reducedMotion: true, fixtures: [fixture('a', { label: 'Notes', multiline: true, value: '1\n2' })] });
    const reduced = await input(page, 'a').evaluate((el) => {
      const field = el as HTMLTextAreaElement;
      field.focus();
      field.setSelectionRange(field.value.length, field.value.length);
      document.execCommand('insertText', false, '\n');
      return { running: field.getAnimations().length, height: Number.parseFloat(getComputedStyle(field).height) + Number.parseFloat(getComputedStyle(field).marginBottom), scrolled: field.scrollTop };
    });
    expect(reduced).toEqual({ running: 0, height: 3 * lineOf, scrolled: 0 });
  });

  test('TXI-38: a letter typed while the motion of a line break runs continues that motion — the motion it replaces reports its cancellation a frame later, and that report ends nothing: the height still moves from the one shown to the end height through heights on its curve, with no step of more than 35 % of the whole change', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [fixture('a', { label: 'Notes', multiline: true, value: '1\n2' })] });
    const lineOf = await line(page, T('input-typescale-medium'));
    for (const id of ['a']) {
      const run = await input(page, id).evaluate(async (el) => {
        const field = el as HTMLTextAreaElement;
        // The height the input shows: its box, and what its bottom margin still takes back while the change moves.
        const height = () => Number.parseFloat(getComputedStyle(field).height) + Number.parseFloat(getComputedStyle(field).marginBottom);
        const resizing = () => field.getAnimations().filter((a) => /^margin-(bottom|block-end)$/.test((a as CSSTransition).transitionProperty));
        const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        let cancelled = 0;
        field.addEventListener('transitioncancel', () => cancelled++);
        field.focus();
        field.setSelectionRange(field.value.length, field.value.length);
        const from = height();
        const hold = (at: (duration: number) => number) => {
          const held = resizing();
          const duration = Number(held[0]?.effect?.getComputedTiming().duration ?? 0);
          for (const motion of field.getAnimations()) {
            motion.pause();
            motion.currentTime = at(duration);
          }
          return held.length;
        };
        // A line break: its motion runs for a rendered frame, held a thirteenth of the way (every read below follows a
        // rendered frame).
        document.execCommand('insertText', false, '\n');
        const first = hold((duration) => duration / 13);
        await frame();
        const mid = height();
        // A letter, a moment later: its change replaces that motion with one from the height then shown, and the replaced
        // one is cancelled — which is reported with the next frame's events. The new motion is held at its start and then
        // stepped by hand, so what is read does not depend on the machine's speed.
        document.execCommand('insertText', false, 'b');
        const motions = field.getAnimations();
        for (const motion of motions) {
          motion.pause();
          motion.currentTime = 0;
        }
        const resize = resizing()[0];
        const duration = Number(resize?.effect?.getComputedTiming().duration ?? 0);
        await frame();
        const after = { motions: resizing().length, marked: field.getAttribute('data-resizing'), cancelled };
        const heights = [from, mid, height()];
        // The eased progress at each read, from the motion itself: where the height should be, whatever the curve.
        const progress = [Number.NaN, 0, Number(resize?.effect?.getComputedTiming().progress ?? 1)];
        for (let step = 1; step < 13; step++) {
          for (const motion of motions) motion.currentTime = (duration * step) / 13;
          await frame();
          heights.push(height());
          progress.push(Number(resize?.effect?.getComputedTiming().progress ?? 1));
        }
        for (const motion of motions) motion.finish();
        await frame();
        heights.push(height());
        progress.push(1);
        return { first, held: motions.filter((a) => /^margin-(bottom|block-end)$/.test((a as CSSTransition).transitionProperty)).length, after, heights, progress };
      });
      expect(run.first, `${id}: the line break starts one motion`).toBe(1);
      expect(run.held, `${id}: one motion runs after the letter`).toBe(1);
      expect(run.after.cancelled, `${id}: the replaced motion reported its cancellation`).toBeGreaterThanOrEqual(1);
      expect({ motions: run.after.motions, marked: run.after.marked }, `${id}: after that report the motion still runs`).toEqual({ motions: 1, marked: '' });
      const whole = run.heights.at(-1)! - run.heights[0]!;
      expect(whole, `${id}: one line more`).toBeCloseTo(lineOf, 0);
      // The letter's motion, from the height shown when it came: at each read where its curve has brought it.
      const rest = run.heights.at(-1)! - run.heights[1]!;
      expect(rest, `${id}: the letter's motion goes on from the height then shown`).toBeGreaterThan(1);
      run.heights.forEach((h, i) => i >= 1 && expect(Math.abs(h - (run.heights[1]! + run.progress[i]! * rest)), `${id}: read ${i} on the curve (${run.heights.join(' → ')})`).toBeLessThanOrEqual(1));
      // And in the measure of a motion that jumps: at 13 evenly spaced times no step is more than 35 % of the change (the
      // standard curve's largest is 28 %; a motion ended by the report moves 100 % at once).
      for (let i = 1; i < run.heights.length; i++) {
        const step = run.heights[i]! - run.heights[i - 1]!;
        expect(step, `${id}: never lower than the one before (${run.heights.join(' → ')})`).toBeGreaterThanOrEqual(-0.01);
        expect(step / whole, `${id}: step ${i} is no more than 35 % of the change (${run.heights.join(' → ')})`).toBeLessThanOrEqual(0.35);
      }
    }
  });

  // ── TXI-51: a multi-line field is set from the top ────────────────────────────────────────────
  /** Where the parts of a field stand, from its container's top edge (and, for what belongs to the bottom, from its bottom edge). */
  const placesOf = (page: P, id: string) =>
    host(page, id).evaluate((el) => {
      const root = el.shadowRoot!;
      const container = root.querySelector('.field > .container')!.getBoundingClientRect();
      const round = (value: number) => Math.round(value * 100) / 100;
      const top = (selector: string) => {
        const part = root.querySelector<HTMLElement>(selector);
        const box = part?.getBoundingClientRect();
        return box && (box.width || box.height) ? round(box.top - container.top) : null;
      };
      const middle = (selector: string) => {
        const box = root.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
        return box && (box.width || box.height) ? round(box.top + box.height / 2 - container.top) : null;
      };
      const field = root.querySelector<HTMLTextAreaElement | HTMLInputElement>('.input')!;
      const slotted = (name: string) => {
        const box = (root.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)?.assignedElements()[0] as HTMLElement | undefined)?.getBoundingClientRect();
        return box ? round(box.top + box.height / 2 - container.top) : null;
      };
      const grip = root.querySelector('.resize-handle')?.getBoundingClientRect();
      const supporting = root.querySelector('.supporting')?.getBoundingClientRect();
      const counter = root.querySelector('.counter')?.getBoundingClientRect();
      return {
        height: round(container.height),
        // The first line of the text: the native element's top, less whatever is scrolled inside it.
        text: round(field.getBoundingClientRect().top - field.scrollTop - container.top),
        scrolled: field.scrollTop,
        leading: slotted('leading-icon'),
        trailing: slotted('trailing-icon'),
        prefix: top('.prefix'),
        suffix: top('.suffix'),
        label: middle('.label'),
        gripFromBottom: grip ? round(container.bottom - grip.bottom) : null,
        supportingBelow: supporting ? round(supporting.top - container.bottom) : null,
        counterBelow: counter ? round(counter.top - container.bottom) : null,
      };
    });
  const TOP = ['text', 'leading', 'trailing', 'prefix', 'suffix', 'label'] as const;
  const BOTTOM = ['gripFromBottom', 'supportingBelow', 'counterBelow'] as const;
  /**
   * Starts a sampler that records `placesOf` once every frame, and returns what stops it and reads the samples.
   *
   * `held`: the height's motion is also held and read at three of its moments, in the task that begins it (the input
   * is told to move by its `data-resizing`, which an observer hears before any frame). The frames a machine draws of a
   * motion of 200 ms are none where a frame takes longer than that, and then nothing was read on the way.
   */
  const everyFrame = async (page: P, id: string, held = false) => {
    await host(page, id).evaluate((el, held) => {
      const root = el.shadowRoot!;
      const round = (value: number) => Math.round(value * 100) / 100;
      const samples: Record<string, number | null>[] = ((window as any).txf51 = []);
      (window as any).txf51Run = true;
      const read = () => {
        const container = root.querySelector('.field > .container')!.getBoundingClientRect();
        const field = root.querySelector<HTMLTextAreaElement>('.input')!;
        const slotted = (name: string) => {
          const box = (root.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)?.assignedElements()[0] as HTMLElement | undefined)?.getBoundingClientRect();
          return box ? round(box.top + box.height / 2 - container.top) : null;
        };
        const edge = (selector: string, from: 'top' | 'bottom') => {
          const box = root.querySelector(selector)?.getBoundingClientRect();
          if (!box || !(box.width || box.height)) return null;
          return from === 'top' ? round(box.top - container.top) : selector === '.resize-handle' ? round(container.bottom - box.bottom) : round(box.top - container.bottom);
        };
        samples.push({
          height: round(container.height),
          text: round(field.getBoundingClientRect().top - field.scrollTop - container.top),
          scrolled: field.scrollTop,
          leading: slotted('leading-icon'),
          trailing: slotted('trailing-icon'),
          prefix: edge('.prefix', 'top'),
          suffix: edge('.suffix', 'top'),
          label: edge('.label', 'top'),
          gripFromBottom: edge('.resize-handle', 'bottom'),
          supportingBelow: edge('.supporting', 'bottom'),
          counterBelow: edge('.counter', 'bottom'),
        });
      };
      const sample = () => {
        read();
        if ((window as any).txf51Run) requestAnimationFrame(sample);
      };
      sample();
      if (!held) return;
      const field = root.querySelector<HTMLTextAreaElement>('.input')!;
      const moved: number[] = ((window as any).txf51Held = []);
      new MutationObserver(() => {
        if (!(window as any).txf51Run || field.getAttribute('data-resizing') !== '') return;
        // The style is asked for, so the transitions the attribute begins exist now; each is put at a moment of its
        // time, read there, and then left to run from its beginning as it would have.
        void getComputedStyle(field).marginBlockEnd;
        const moving = field.getAnimations().filter((animation) => ['margin-block-end', 'margin-bottom', 'clip-path'].includes((animation as CSSTransition).transitionProperty));
        if (moving.length === 0) return;
        moved.push(moving.length);
        for (const part of [0.25, 0.5, 0.75]) {
          for (const animation of moving) {
            animation.pause();
            animation.currentTime = part * Number(animation.effect!.getTiming().duration);
          }
          read();
        }
        for (const animation of moving) {
          animation.currentTime = 0;
          animation.play();
        }
      }).observe(field, { attributes: true, attributeFilter: ['data-resizing'] });
    }, held);
    return () => page.evaluate(() => { (window as any).txf51Run = false; return (window as any).txf51 as Record<string, number | null>[]; });
  };
  const BUTTON = '<tanrei-button slot="trailing-icon" variant="text" label="Clear"><span slot="icon" class="tanrei-icon">close</span></tanrei-button>';
  /** Markup is staged as it is given: beside the Button, the leading glyph is written out too. */
  const LEAD = '<span slot="leading-icon">search</span>';
  const FIVE = 'Thanks for the review.\nThe new tokens are in.\nThe web is green.\nThe others follow.\nMore tomorrow.';

  for (const reducedMotion of [false, true]) {
    test(`TXI-51, TXI-38: while a line break is typed and while one is deleted, the leading icon, the trailing icon and the first line of the text keep their distance from the container’s top edge to the pixel in every frame — and the prefix, the suffix, a slot’s Button and the supporting row and counter theirs — ${reducedMotion ? 'with reduced motion' : 'through the motion'}`, async ({ page }) => {
      await mountFixtures(page, spec, {
        icons: true,
        reducedMotion,
        fixtures: [
          ...only(/^stacked-multiline-auto-grown-icons$/),
          fixture('outlined', { variant: 'outlined', label: 'Message', multiline: true, value: FIVE, prefixText: '>', suffixText: 'end', supportingText: 'Shown to your team', counter: true, maxLength: 400 }, `${LEAD}${BUTTON}`),
          fixture('filled', { variant: 'filled', label: 'Message', multiline: true, value: FIVE, supportingText: 'Shown to your team', counter: true }, 'leading-icon=search trailing-icon=close'),
        ],
      });
      const lineOf = await line(page, T('input-typescale-medium'));
      for (const id of ['stacked-multiline-auto-grown-icons', 'outlined', 'filled']) {
        const field = input(page, id);
        await field.focus();
        await field.evaluate((el) => (el as HTMLTextAreaElement).setSelectionRange(1e4, 1e4));
        // Focus has its own motion (the state's colors, an outlined field's edge): it is over before the samples begin.
        await expect.poll(() => host(page, id).evaluate((el) => el.shadowRoot!.querySelector('.field > .container')!.getAnimations({ subtree: true }).length), id).toBe(0);
        const rest = await placesOf(page, id);
        expect(rest.scrolled, id).toBe(0);
        // Both icons are on the first of the five lines.
        expect(rest.leading, id).toBeCloseTo(rest.text + lineOf / 2, 1);
        expect(rest.trailing, id).toBeCloseTo(rest.text + lineOf / 2, 1);
        const stop = await everyFrame(page, id, true);
        // A line break is typed, as a person types it…
        await page.keyboard.press('Enter');
        await expect.poll(async () => (await placesOf(page, id)).height, id).toBeCloseTo(rest.height + lineOf, 1);
        await page.waitForTimeout(80);
        // …and deleted.
        await page.keyboard.press('Backspace');
        await expect.poll(async () => (await placesOf(page, id)).height, id).toBeCloseTo(rest.height, 1);
        await page.waitForTimeout(80);
        const samples = await stop();
        const heights = [...new Set(samples.map((sample) => sample.height))];
        // The samples saw the change: six lines, and five again — and, with motion, heights between the two.
        expect(Math.max(...(heights as number[])), id).toBeCloseTo(rest.height + lineOf, 1);
        expect(samples.at(-1)!.height, id).toBeCloseTo(rest.height, 1);
        const between = (heights as number[]).filter((height) => height > rest.height + 0.5 && height < rest.height + lineOf - 0.5);
        if (reducedMotion) expect(between, `${id}: no motion`).toEqual([]);
        else expect(between.length, `${id}: the motion was sampled`).toBeGreaterThan(1);
        // Held in the task that began it, twice — the line typed and the line deleted — where there is a motion.
        expect(await page.evaluate(() => ((window as any).txf51Held as number[]).length), `${id}: the motions held`).toBe(reducedMotion ? 0 : 2);
        // Nothing above moved, in any frame; nothing was scrolled inside the input.
        for (const key of TOP) expect([...new Set(samples.map((sample) => sample[key]))], `${id}: ${key} from the top edge`).toEqual([samples[0][key]]);
        for (const key of ['text', 'leading', 'trailing', 'prefix', 'suffix'] as const) expect(samples[0][key], `${id}: ${key} is where it rested`).toBe(rest[key]);
        expect([...new Set(samples.map((sample) => sample.scrolled))], `${id}: scrolled`).toEqual([0]);
        // What belongs to the bottom edge moved with it.
        for (const key of BOTTOM) expect([...new Set(samples.map((sample) => sample[key]))], `${id}: ${key}`).toEqual([rest[key]]);
      }
    });
  }

  test('TXI-51: the first line of a multi-line field stands where a single-line field of the same variant, size, label and text size draws its line — half of container.height below the top edge for a stacked or an outlined field, under the label’s band for a filled one, lower with enlarged text — with its icons, a slot’s Button, the prefix, the suffix, the placeholder and an outlined field’s resting label on it, and a filled field’s label resting where a single-line one rests it; one line of text is drawn as a single-line field is', async ({ page }) => {
    const pairs: Fixture[] = [];
    const cases: { id: string; variant: string; size: string }[] = [];
    for (const variant of ['stacked', 'outlined', 'filled']) {
      for (const size of ['medium', 'large']) {
        const id = `${variant}-${size}`;
        cases.push({ id, variant, size });
        for (const [suffix, extra, content] of [
          ['one', { value: 'One line', prefixText: '$', suffixText: 'kg' }, `${LEAD}${BUTTON}`],
          ['empty', { placeholder: 'Write here' }, 'leading-icon=search trailing-icon=close'],
        ] as const) {
          pairs.push(fixture(`${id}-${suffix}-single`, { variant, size, label: 'Message', ...extra }, content));
          pairs.push(fixture(`${id}-${suffix}-multi`, { variant, size, label: 'Message', multiline: true, minRows: 1, ...extra }, content));
          pairs.push(fixture(`${id}-${suffix}-tall`, { variant, size, label: 'Message', multiline: true, minRows: 4, ...extra }, content));
        }
      }
    }
    await mountFixtures(page, spec, { icons: true, reducedMotion: true, fixtures: pairs });
    const check = async (note: string) => {
      for (const { id, variant, size } of cases) {
        const lineOf = await line(page, T(`input-typescale-${size}`));
        const height = await resolveToken(page, T(`${variant === 'stacked' ? 'stacked-' : ''}container-height-${size}`));
        for (const suffix of ['one', 'empty']) {
          const [single, multi, tall] = [await placesOf(page, `${id}-${suffix}-single`), await placesOf(page, `${id}-${suffix}-multi`), await placesOf(page, `${id}-${suffix}-tall`)];
          const name = `${id}-${suffix} ${note}`;
          // A single-line field centres its line in the room of its container (TXI-16); here its native element is the
          // line, so its middle is the line's.
          const singleLine = single.text + (await bounds(input(page, `${id}-${suffix}-single`))).height / 2;
          // A multi-line field of one line is as high as the single-line one, and its first line is where that one's is…
          expect(multi.height, name).toBeCloseTo(single.height, 1);
          expect(multi.text + lineOf / 2, name).toBeCloseTo(singleLine, 1);
          // …at a distance that more height does not change: four rows of room start there, and what the container is
          // higher by lies below the first line — down to the block padding under the last row.
          expect(tall.text, name).toBe(multi.text);
          const below = await resolveToken(page, T(variant === 'filled' ? `container-padding-block-with-label-${size}` : `${variant === 'stacked' ? 'stacked-' : ''}container-padding-block-${size}`));
          expect(tall.height, name).toBeCloseTo(tall.text + 4 * lineOf + below, 1);
          expect(tall.height, name).toBeGreaterThan(multi.height + 2 * lineOf);
          // Half of container.height below the top edge in a stacked and an outlined field (or lower, where the text is
          // enlarged and the field taller); lower by the label's band in a filled one.
          if (variant !== 'filled') expect(multi.text + lineOf / 2, name).toBeCloseTo(Math.max(height, single.height) / 2, 1);
          else expect(multi.text + lineOf / 2, name).toBeGreaterThan(single.height / 2);
          for (const places of [multi, tall]) {
            // The icons and a slot's Button are centred on the first line; the prefix and the suffix are on it.
            expect(places.leading, name).toBeCloseTo(places.text + lineOf / 2, 1);
            expect(places.trailing, name).toBeCloseTo(places.text + lineOf / 2, 1);
            if (suffix === 'one') {
              expect(places.prefix, name).toBeCloseTo(places.text, 1);
              expect(places.suffix, name).toBeCloseTo(places.text, 1);
            }
          }
          // The same icons as a single-line field's, where that one centres them on its line (stacked, outlined).
          if (variant !== 'filled') {
            expect(multi.leading, name).toBeCloseTo(single.leading!, 1);
            expect(multi.trailing, name).toBeCloseTo(single.trailing!, 1);
          }
          if (suffix === 'empty' && variant !== 'stacked') {
            // The resting label: an outlined field's on the first line; a filled field's where a single-line one rests it.
            if (variant === 'outlined') expect(tall.label, name).toBeCloseTo(tall.text + lineOf / 2, 1);
            expect(multi.label, name).toBeCloseTo(single.label!, 1);
            expect(tall.label, name).toBeCloseTo(single.label!, 1);
          }
        }
      }
    };
    await check('');
    // The first line of the placeholder is the first line: the native element draws it from its top.
    expect(await input(page, 'stacked-medium-empty-tall').evaluate((el) => [getComputedStyle(el).paddingTop, getComputedStyle(el, '::placeholder').display !== 'none'])).toEqual(['0px', true]);
    // Enlarged text: a single-line field grows, and the first line stays where its line is.
    // (The fields are widened first, so that the one line is still one line.)
    await page.addStyleTag({ content: '.stage > tanrei-text-input { inline-size: 720px !important; }' });
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    await expect.poll(async () => (await placesOf(page, 'stacked-medium-one-single')).height).toBeGreaterThan(await resolveToken(page, T('stacked-container-height-medium')) - 1);
    await check('at 200 %');
  });

  test('TXI-51: all the height a container has beyond one line lies below the first — the spare row of the three multi-line fixtures, the lines of an auto-grown one, the height given with the handle, a changed minRows — and the first line, the icons and the label keep their distance from the top edge through each change; the handle keeps its distance from the bottom and the end edge', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      reducedMotion: false,
      // The field whose handle is dragged comes first, inside the window.
      fixtures: [
        fixture('manual', { label: 'Message', multiline: true, resize: 'manual', minRows: 2, resizeLabel: 'Resize', value: 'One\nTwo', supportingText: 'Shown to your team' }, 'leading-icon=search trailing-icon=close'),
        ...only(/^(stacked|filled|outlined)-multiline$/, /^stacked-multiline-auto-grown-icons$/),
        fixture('single', { label: 'Message', value: 'One' }, 'leading-icon=search trailing-icon=close'), fixture('single-outlined', { label: 'Message', value: 'One', variant: 'outlined' }, 'leading-icon=search trailing-icon=close'),
      ],
    });
    const lineOf = await line(page, T('input-typescale-medium'));
    const [pad, stackedPad] = [await resolveToken(page, T('container-padding-block-medium')), await resolveToken(page, T('stacked-container-padding-block-medium'))];
    const [single, singleOutlined] = [await placesOf(page, 'single'), await placesOf(page, 'single-outlined')];
    // The fixtures: two lines of text in three rows of room — the text starts at the top and the spare row is below it; the first line is where a single-line field of its variant draws its one line.
    for (const id of ['stacked-multiline', 'outlined-multiline']) {
      const places = await placesOf(page, id);
      expect(places.text, id).toBe((id.startsWith('stacked') ? single : singleOutlined).text);
      expect(places.height, id).toBeCloseTo(places.text + 3 * lineOf + (id.startsWith('stacked') ? stackedPad : pad), 1);
    }
    const filled = await placesOf(page, 'filled-multiline');
    expect(filled.height).toBeCloseTo(filled.text + 3 * lineOf + (await resolveToken(page, T('container-padding-block-with-label-medium'))), 1);
    // Both icons on the first of five lines.
    const grown = await placesOf(page, 'stacked-multiline-auto-grown-icons');
    expect([grown.leading, grown.trailing]).toEqual([single.leading, single.trailing]);
    expect(grown.text).toBe(single.text);
    expect(grown.height).toBeCloseTo(grown.text + 5 * lineOf + stackedPad, 1);
    // The handle: against the bottom edge and the end edge, before, during and after a drag and the keys' motion.
    const inset = 0;
    const rest = await placesOf(page, 'manual');
    expect(rest.gripFromBottom).toBeCloseTo(inset, 1);
    const fromEnd = () => host(page, 'manual').evaluate((el) => el.shadowRoot!.querySelector('.field > .container')!.getBoundingClientRect().right - el.shadowRoot!.querySelector('.resize-handle')!.getBoundingClientRect().right);
    expect(await fromEnd()).toBeCloseTo(inset, 1);
    const stop = await everyFrame(page, 'manual');
    const grip = await bounds(part(page, 'manual', GRIP));
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    for (const step of [10, 30, 52, 78]) await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2 + step);
    await page.mouse.up();
    await expect.poll(async () => (await placesOf(page, 'manual')).height).toBeCloseTo(rest.height + 3 * lineOf, 1);
    // The keys move it over the motion (TXI-41).
    await part(page, 'manual', GRIP).focus();
    await page.keyboard.press('ArrowUp');
    await expect.poll(async () => (await placesOf(page, 'manual')).height).toBeCloseTo(rest.height + 2 * lineOf, 1);
    // minRows changed by the product: at once.
    await host(page, 'manual').evaluate(async (el: any) => { el.minRows = 6; await el.updateComplete; });
    await expect.poll(async () => (await placesOf(page, 'manual')).height).toBeCloseTo(rest.height + 4 * lineOf, 1);
    await page.waitForTimeout(50);
    const samples = await stop();
    expect(new Set(samples.map((sample) => sample.height)).size).toBeGreaterThan(3);
    for (const key of ['text', 'leading', 'trailing'] as const) expect([...new Set(samples.map((sample) => sample[key]))], key).toEqual([rest[key]]);
    for (const key of ['gripFromBottom', 'supportingBelow'] as const) expect([...new Set(samples.map((sample) => sample[key]))], key).toEqual([rest[key]]);
    expect(await fromEnd()).toBeCloseTo(inset, 1);
  });

  test('TXI-51: while the text scrolls inside the input only the text moves — beyond maxRows the caret is kept in view, and the icons, the container and the first line’s place stay', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, reducedMotion: false, fixtures: [fixture('max', { label: 'Message', multiline: true, maxRows: 3, value: 'One\nTwo\nThree' }, 'leading-icon=search trailing-icon=close')] });
    const rest = await placesOf(page, 'max');
    const box = await bounds(input(page, 'max'));
    await input(page, 'max').focus();
    await input(page, 'max').evaluate((el) => (el as HTMLTextAreaElement).setSelectionRange(1e4, 1e4));
    await page.keyboard.press('Enter');
    await page.keyboard.type('Four');
    await expect.poll(() => input(page, 'max').evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    const scrolled = await placesOf(page, 'max');
    expect([scrolled.height, scrolled.leading, scrolled.trailing]).toEqual([rest.height, rest.leading, rest.trailing]);
    expect(await bounds(input(page, 'max'))).toEqual(box);
    // The caret's line is in view.
    expect(await input(page, 'max').evaluate((el) => el.scrollTop + el.clientHeight >= el.scrollHeight - Number.parseFloat(getComputedStyle(el).lineHeight) / 2)).toBe(true);
  });

  test('TXI-51, TXI-16: a single-line field is laid out as it was — its one line centred in the container — and a multi-line field with minRows 1 and one line of text overlays stacked-filled pixel for pixel', async ({ page }) => {
    const base = spec.fixtures.find((f) => f.id === 'stacked-filled')!;
    const shots: Buffer[] = [];
    for (const multiline of [false, true]) {
      // Each alone at the same place in its own page, so that the two are rasterized alike.
      await mountFixtures(page, spec, { icons: true, reducedMotion: true, fixtures: [{ ...base, id: 'field', props: { ...base.props, ...(multiline ? { multiline: true, minRows: 1 } : {}) } }] });
      expect(await input(page, 'field').evaluate((el) => el.localName)).toBe(multiline ? 'textarea' : 'input');
      if (!multiline) {
        // TXI-16: the single input line is centred in a container of container.height.
        const [container, field] = [await bounds(part(page, 'field', '.field > .container')), await bounds(input(page, 'field'))];
        expect(container.height).toBe(await resolveToken(page, T('stacked-container-height-medium')));
        expect(field.y + field.height / 2).toBeCloseTo(container.y + container.height / 2, 1);
        expect(await css(part(page, 'field', '.body'), 'align-items')).toBe('center');
      }
      shots.push(await page.locator('[data-fixture="field"]').screenshot({ animations: 'disabled' }));
    }
    expect(shots[1].equals(shots[0]), 'the two screenshots are the same bytes').toBe(true);
  });

  test('TXI-42: a date or a time is drawn as one segment per unit in the order and with the separators of the locale’s numeric form; a filled segment shows its number in the input color and an empty one its placeholder; separators are no segments; a segment is as wide as the wider of its placeholder and its widest filled form, whatever it holds; the row starts where the input text starts and runs left to right', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        ...spec.fixtures,
        fixture('de', { type: 'date', locale: 'de-DE', label: 'Datum', value: '2026-09-27' }),
        fixture('ar', { type: 'date', locale: 'ar-EG', label: 'التاريخ', value: '2026-09-27' }),
        fixture('ko', { type: 'time', locale: 'ko-KR', label: '시간', value: '14:30' }),
        fixture('dt-empty', { type: 'date-time', locale: 'en-US', label: 'When' }),
        fixture('morning', { type: 'time', locale: 'en-US', label: 'At', value: '09:05' }),
      ],
    });
    /** The row's parts in order: a segment as [unit, text], the text between two as a string. */
    const parts = (id: string) => part(page, id, '.row').evaluate((row) => Array.from(row.children, (child) => (child.classList.contains('literal') ? child.textContent : [child.querySelector('.segment')!.getAttribute('data-unit'), child.querySelector('.segment')!.textContent])));
    expect(await parts('stacked-date')).toEqual([['month', '09'], '/', ['day', '27'], '/', ['year', '2026']]);
    expect(await parts('stacked-date-ja')).toEqual([['year', '2026'], '/', ['month', '09'], '/', ['day', '27']]);
    expect(await parts('de')).toEqual([['day', '27'], '.', ['month', '09'], '.', ['year', '2026']]);
    expect(await parts('stacked-time-picker')).toEqual([['hour', '2'], ':', ['minute', '30'], ' ', ['period', 'PM']]);
    expect(await parts('stacked-time-24h')).toEqual([['hour', '14'], ':', ['minute', '30']]);
    expect(await parts('stacked-date-time-picker')).toEqual([['month', '09'], '/', ['day', '27'], '/', ['year', '2026'], ', ', ['hour', '2'], ':', ['minute', '30'], ' ', ['period', 'PM']]);
    expect(await parts('morning')).toEqual([['hour', '9'], ':', ['minute', '05'], ' ', ['period', 'AM']]);
    // The locale's digits, and a day period where the locale writes it (before the hour in Korean).
    expect(await rowText(page, 'ar')).toBe('٢٧/٠٩/٢٠٢٦');
    expect((await parts('ko')).map((p) => (Array.isArray(p) ? p[0] : p))).toEqual(['period', ' ', 'hour', ':', 'minute']);
    // Empty segments show their placeholders, in the placeholder color; so do the separators while every segment is empty.
    const placeholders = (id: string) => segs(page, id).evaluateAll((all) => all.map((el) => [el.textContent, getComputedStyle(el, '::before').content.replace(/^"|"$/g, ''), getComputedStyle(el, '::before').color]));
    const [inputColor, hint] = [await resolveColor(page, T('stacked-input-color')), await resolveColor(page, T('stacked-placeholder-color'))];
    expect(await placeholders('stacked-date-empty')).toEqual([['', 'mm', hint], ['', 'dd', hint], ['', 'yyyy', hint]]);
    expect(await placeholders('stacked-time-empty')).toEqual([['', 'hh', hint], ['', 'mm', hint], ['', 'AM', hint]]);
    expect((await placeholders('dt-empty')).map((p) => p[1])).toEqual(['mm', 'dd', 'yyyy', 'hh', 'mm', 'AM']);
    const literals = (id: string) => part(page, id, '.row').locator('.literal').evaluateAll((all) => all.map((el) => getComputedStyle(el).color));
    expect(new Set(await literals('stacked-date-empty'))).toEqual(new Set([hint]));
    expect(new Set(await literals('stacked-date'))).toEqual(new Set([inputColor]));
    expect(await css(seg(page, 'stacked-date', 'month'), 'color')).toBe(inputColor);
    // In the input's text style.
    expect(await css(seg(page, 'stacked-date', 'month'), 'font-size')).toBe(`${await resolveToken(page, T('input-typescale-medium-font-size'))}px`);
    // Half filled: the others stay placeholders, and the separators take the input color.
    await seg(page, 'stacked-date-empty', 'month').click();
    await page.keyboard.type('9');
    expect(await parts('stacked-date-empty')).toEqual([['month', '09'], '/', ['day', ''], '/', ['year', '']]);
    await expect.poll(async () => new Set(await literals('stacked-date-empty'))).toEqual(new Set([await resolveColor(page, T('stacked-focused-input-color'))]));
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await blurAll(page);
    // Separators are not segments: no focus stop, and kept from assistive technology with the copies that size the cells.
    for (const hiddenPart of await part(page, 'stacked-date-time-picker', '.row').locator('.literal, .sizer').all()) {
      await expect(hiddenPart).toHaveAttribute('aria-hidden', 'true');
      await expect(hiddenPart).not.toHaveAttribute('tabindex');
    }
    // Each segment is as wide as the wider of its placeholder and its widest filled form, segment.padding-inline on each
    // side, whatever it holds — empty, half typed or filled — so the row never shifts as it fills or empties ("mm" is
    // wider than two digits in this face: the month's cell is the placeholder's width filled too).
    const widths = (id: string) => segs(page, id).evaluateAll((all) => all.map((el) => el.getBoundingClientRect().width));
    const pad = await resolveToken(page, T('segment-padding-inline'));
    const [emptyWidths, filledWidths] = [await widths('stacked-date-empty'), await widths('stacked-date')];
    const inked = (id: string, unit: string) =>
      seg(page, id, unit).evaluate((el) => {
        const text = el.textContent || getComputedStyle(el, '::before').content.replace(/^"|"$/g, '');
        const probe = Object.assign(document.createElement('span'), { textContent: text });
        probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
        el.parentElement!.append(probe);
        const width = probe.getBoundingClientRect().width;
        probe.remove();
        return width;
      });
    for (const [index, unit] of (['month', 'day', 'year'] as const).entries()) {
      const wider = Math.max(await inked('stacked-date', unit), await inked('stacked-date-empty', unit)) + 2 * pad;
      expect(filledWidths[index], `${unit} filled`).toBeCloseTo(wider, 1);
      expect(emptyWidths[index], `${unit} empty: as wide as filled`).toBe(filledWidths[index]);
    }
    expect(Number.parseFloat(await css(seg(page, 'stacked-date', 'day'), 'padding-left'))).toBe(pad);
    expect(Number.parseFloat(await css(seg(page, 'stacked-date', 'day'), 'padding-right'))).toBe(pad);
    // Half typed: one digit of a month, and one, two and three of a year, are as wide as the filled form and the empty one.
    await seg(page, 'stacked-date-empty', 'month').click();
    await page.keyboard.type('1');
    expect((await widths('stacked-date-empty'))[0], 'a month of one digit').toBe(filledWidths[0]);
    await seg(page, 'stacked-date-empty', 'year').click();
    for (const digit of '202') {
      await page.keyboard.type(digit);
      expect((await widths('stacked-date-empty'))[2], `year after ${digit}`).toBe(filledWidths[2]);
    }
    await blurAll(page);
    // No placeholder touches the separator beside it: every empty segment's placeholder lies inside its own box.
    for (const id of ['stacked-time-empty', 'dt-empty']) {
      for (const [index, width] of (await widths(id)).entries()) expect(width, `${id} segment ${index}`).toBeGreaterThanOrEqual((await segs(page, id).nth(index).evaluate((el) => {
        const probe = Object.assign(document.createElement('span'), { textContent: getComputedStyle(el, '::before').content.replace(/^"|"$/g, '') });
        probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
        el.parentElement!.append(probe);
        const inkWidth = probe.getBoundingClientRect().width;
        probe.remove();
        return inkWidth;
      })) - 0.01);
    }
    // The row starts where the input text starts, at the field's start edge.
    const textStart = (await bounds(input(page, 'stacked-filled'))).x - (await bounds(part(page, 'stacked-filled', '.field > .container'))).x;
    for (const id of ['stacked-date', 'stacked-date-empty', 'stacked-time-picker', 'stacked-time-empty']) {
      expect((await bounds(part(page, id, '.row'))).x - (await bounds(part(page, id, '.field > .container'))).x, id).toBeCloseTo(textStart, 1);
      // …and so does its first cell: an hour of one digit stands at the end of a cell two digits wide (TXI-42).
      expect((await bounds(seg(page, id, id.includes('time') ? 'hour' : 'month'))).x - (await bounds(part(page, id, '.field > .container'))).x, id).toBeCloseTo(textStart, 1);
    }
    // Laid out left to right in every layout direction, the day period isolated in its own direction.
    await expect(part(page, 'stacked-date-rtl', '.row')).toHaveAttribute('dir', 'ltr');
    expect(await parts('stacked-date-rtl')).toEqual([['day', '27'], '.', ['month', '09'], '.', ['year', '2026']]);
    const xs = await segs(page, 'stacked-date-rtl').evaluateAll((all) => all.map((el) => el.getBoundingClientRect().x));
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    await expect(seg(page, 'stacked-time-picker', 'period')).toHaveAttribute('dir', 'auto');
    expect(await css(seg(page, 'stacked-time-picker', 'period'), 'unicode-bidi')).toBe('isolate');
  });

  test('TXI-43: the focused segment is drawn as selected text from selection.color and selection.content.color — its placeholder too — and in the default system the highlight stands 3:1 or more from the container and its text 4.5:1 or more from it, light and dark', async ({ page }) => {
    // The segment that is being set is the one that is chosen now, a primary fill under on-primary text, so that a
    // segment focused by keyboard can be seen against the container in the default system.
    const ratio = (a: string, b: string) => {
      const l = (color: string) => {
        const [r, g, b2] = color.match(/[\d.]+/g)!.slice(0, 3).map((v) => { const c = Number(v) / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b2;
      };
      const [hi, lo] = [l(a), l(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, fixtures: only(/^stacked-date-picker$/, /^stacked-date-empty$/) });
      for (const id of ['stacked-date-picker', 'stacked-date-empty']) {
        // By keyboard: Tab lands on the row's first segment.
        await blurAll(page);
        await tabTo(page, part(page, id, '.segment').first());
        const first = part(page, id, '.segment').first();
        const [highlight, text] = [await css(first, 'background-color'), await css(first, 'color')];
        expect(highlight, `${theme} ${id}: selection.color`).toBe(await resolveColor(page, T('selection-color')));
        expect(text, `${theme} ${id}: selection.content.color`).toBe(await resolveColor(page, T('selection-content-color')));
        // An empty segment's placeholder is the text on the highlight, not the placeholder color.
        if (id === 'stacked-date-empty') expect(await css(first, 'color', '::before'), `${theme}: the placeholder`).toBe(text);
        const container = await css(part(page, id, '.field > .container'), 'background-color');
        expect(ratio(highlight, container), `${theme} ${id}: the highlight against the container (${highlight} on ${container})`).toBeGreaterThanOrEqual(3);
        expect(ratio(text, highlight), `${theme} ${id}: the text on the highlight (${text} on ${highlight})`).toBeGreaterThanOrEqual(4.5);
        // The segments that are not being set keep the input's color and no fill.
        expect(await css(part(page, id, '.segment').nth(1), 'background-color')).toBe('rgba(0, 0, 0, 0)');
      }
    }
  });

  test('TXI-43: each segment is a focus stop in the row’s order — Tab and Shift+Tab, Right and Left Arrow, stopping at the ends, the same in right-to-left; a press on a segment focuses it and a press elsewhere the first empty one, or the last; the field counts as focused while a segment has focus, drawn as selected text; moving between segments and the picker button commits nothing', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: only(/date|time/) });
    const id = 'stacked-date-time-picker';
    const order = ['month', 'day', 'year', 'hour', 'minute', 'period'];
    await listenDates(host(page, id));
    // Tab from the previous control lands on the first segment and visits each in turn, then the picker button.
    await tabTo(page, seg(page, id, 'month'));
    for (const unit of order.slice(1)) {
      await tab(page);
      expect(await focusedUnit(page, id), unit).toBe(unit);
    }
    await tab(page);
    await expect(part(page, id, '.picker-button').locator('button')).toBeFocused();
    // Shift+Tab the other way.
    await tab(page, { back: true });
    expect(await focusedUnit(page, id)).toBe('period');
    await tab(page, { back: true });
    expect(await focusedUnit(page, id)).toBe('minute');
    // Left Arrow and Right Arrow move to the segment drawn on that side, stopping at the row's ends.
    for (const unit of ['hour', 'year', 'day', 'month', 'month']) {
      await page.keyboard.press('ArrowLeft');
      expect(await focusedUnit(page, id), `left to ${unit}`).toBe(unit);
    }
    for (const unit of [...order.slice(1), 'period']) {
      await page.keyboard.press('ArrowRight');
      expect(await focusedUnit(page, id), `right to ${unit}`).toBe(unit);
    }
    // None of that committed the field, though it stepped a value on the way.
    await page.keyboard.press('ArrowDown'); // PM → AM
    await page.keyboard.press('ArrowLeft');
    await tab(page);
    await tab(page);
    await tab(page, { back: true });
    expect(await dateEvents(page)).toEqual(['input:2026-09-27T02:30']);
    // Leaving for anything else does.
    await blurAll(page);
    expect(await dateEvents(page)).toEqual(['input:2026-09-27T02:30', 'change:2026-09-27T02:30']);
    // The same segments in a right-to-left layout: the row runs left to right there too (day, month, year in he-IL).
    const rtl = 'stacked-date-rtl';
    await seg(page, rtl, 'month').click();
    await page.keyboard.press('ArrowRight');
    expect(await focusedUnit(page, rtl)).toBe('year');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    expect(await focusedUnit(page, rtl)).toBe('day');
    expect((await bounds(seg(page, rtl, 'day'))).x).toBeLessThan((await bounds(seg(page, rtl, 'year'))).x);
    // The field counts as focused while any segment has focus, and draws the focused one as selected text, with no caret.
    await seg(page, id, 'day').click();
    expect(await focusedUnit(page, id)).toBe('day');
    await expect.poll(() => css(part(page, id, '.edge'), 'border-top-color')).toBe(await resolveColor(page, T('stacked-focused-outline-color')));
    expect(await css(seg(page, id, 'day'), 'background-color')).toBe(await resolveColor(page, T('selection-color')));
    expect(await css(seg(page, id, 'day'), 'outline-style')).toBe('none');
    const [cell, text] = await seg(page, id, 'day').evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return [el.getBoundingClientRect().width, range.getBoundingClientRect().width];
    });
    expect(cell, 'the highlight spans the segment’s width').toBeGreaterThanOrEqual(text);
    // The picker button's focus is not the field's.
    await part(page, id, '.picker-button').locator('button').focus();
    await expect.poll(() => css(part(page, id, '.edge'), 'border-top-color')).toBe('rgba(0, 0, 0, 0)');
    // A press on the field anywhere else: the first empty segment — or the last while none is empty.
    const press = async (of: string, where: 'padding' | 'separator') => {
      await blurAll(page);
      await host(page, of).scrollIntoViewIfNeeded(); // the mouse does not scroll
      if (where === 'separator') await part(page, of, '.row').locator('.literal').first().click();
      else {
        const c = await bounds(part(page, of, '.field > .container'));
        await page.mouse.click(c.x + 4, c.y + c.height / 2);
      }
      return focusedUnit(page, of);
    };
    expect(await press('stacked-date-empty', 'padding')).toBe('month');
    expect(await press('stacked-date', 'padding')).toBe('year');
    expect(await press('stacked-date', 'separator')).toBe('year');
    await seg(page, 'stacked-date-empty', 'month').click();
    await page.keyboard.type('9'); // the month is filled, and focus moved to the day
    expect(await press('stacked-date-empty', 'padding')).toBe('day');
    expect(await press('stacked-date-empty', 'separator')).toBe('day');
    // Disabled: no segment is a focus stop.
    expect(await segs(page, 'stacked-date-disabled').evaluateAll((all) => all.map((el) => el.getAttribute('tabindex')))).toEqual([null, null, null]);
    await host(page, 'stacked-date-disabled').click({ force: true });
    expect(await focusedUnit(page, 'stacked-date-disabled')).toBeNull();
  });

  test('TXI-44: Up and Down Arrow step a segment by one within its own range, wrapping, and change no other — except a day beyond the last of a newly chosen month; an empty segment takes the device’s date or time; Page Up and Page Down step further and Home and End go to the ends; min and max do not limit a step', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('d', { type: 'date', locale: 'en-US', label: 'D', max: '2026-12-31' }),
        fixture('t', { type: 'time', locale: 'en-US', label: 'T' }),
        fixture('t24', { type: 'time', locale: 'ja-JP', label: 'T' }),
        fixture('ro', { type: 'date', locale: 'en-US', label: 'RO', value: '2026-09-27', readOnly: true }),
      ],
    });
    await page.clock.setFixedTime(new Date(2026, 9, 6, 15, 7));
    const press = async (id: string, unit: string, ...keys: string[]) => {
      await seg(page, id, unit).click();
      for (const key of keys) await page.keyboard.press(key);
      return rowText(page, id);
    };
    const set = (id: string, value: string) => host(page, id).evaluate((el, v) => ((el as any).value = v), value);
    /** Empties every segment, whatever the row held (a value set to the empty one it already is would keep them: TXI-46). */
    const clear = (id: string) => host(page, id).evaluate((el) => (el as HTMLFormElement & { formResetCallback(): void }).formResetCallback());
    // On an empty segment either key fills it with the clock's value for that unit: 2026-10-06, 3:07 PM.
    expect(await press('d', 'month', 'ArrowUp')).toBe('10//');
    expect(await press('d', 'day', 'ArrowDown')).toBe('10/06/');
    expect(await press('d', 'year', 'ArrowUp')).toBe('10/06/2026');
    expect(await press('t', 'hour', 'ArrowDown')).toBe('3: ');
    expect(await press('t', 'minute', 'ArrowUp')).toBe('3:07 ');
    expect(await press('t', 'period', 'ArrowUp')).toBe('3:07 PM');
    expect(await press('t24', 'hour', 'ArrowUp')).toBe('15:');
    // Up Arrow on 12 gives 01 and leaves the year; Down Arrow on 01 gives 12.
    await set('d', '2026-12-15');
    expect(await press('d', 'month', 'ArrowUp')).toBe('01/15/2026');
    expect(await press('d', 'month', 'ArrowDown')).toBe('12/15/2026');
    // With day 31, stepping the month from 01 to 02 in 2026 makes the day 28; nothing else changes.
    await set('d', '2026-01-31');
    expect(await press('d', 'month', 'ArrowUp')).toBe('02/28/2026');
    // A day wraps within its month: 28 → 01 in February 2026, and 29 exists in 2028.
    expect(await press('d', 'day', 'ArrowUp')).toBe('02/01/2026');
    expect(await press('d', 'day', 'ArrowDown')).toBe('02/28/2026');
    await set('d', '2028-02-29');
    expect(await press('d', 'year', 'ArrowUp')).toBe('02/28/2029');
    // 31 while the month is empty, 29 for a February whose year is empty.
    await clear('d');
    await press('d', 'day', 'ArrowUp'); // the 6th
    expect(await press('d', 'day', 'End')).toBe('/31/');
    await seg(page, 'd', 'month').click();
    await page.keyboard.type('02');
    expect(await rowText(page, 'd')).toBe('02/29/');
    // A year from 1 to 9999.
    await set('d', '9999-06-15');
    expect(await press('d', 'year', 'ArrowUp')).toBe('06/15/0001');
    expect(await press('d', 'year', 'ArrowDown')).toBe('06/15/9999');
    // Hours and minutes: 1 to 12 beside a day period, 0 to 23 without one, 0 to 59.
    await set('t', '12:59');
    expect(await press('t', 'hour', 'ArrowUp')).toBe('1:59 PM');
    expect(await press('t', 'hour', 'ArrowDown')).toBe('12:59 PM');
    expect(await press('t', 'minute', 'ArrowUp')).toBe('12:00 PM');
    expect(await press('t', 'minute', 'ArrowDown')).toBe('12:59 PM');
    // Down Arrow on PM gives AM, and Up Arrow gives it back.
    expect(await press('t', 'period', 'ArrowDown')).toBe('12:59 AM');
    expect(await valueOf(page, 't')).toBe('00:59');
    expect(await press('t', 'period', 'ArrowUp')).toBe('12:59 PM');
    await set('t24', '23:30');
    expect(await press('t24', 'hour', 'ArrowUp')).toBe('0:30');
    expect(await press('t24', 'hour', 'ArrowDown')).toBe('23:30');
    // Page Up and Page Down: 5 years, 2 months, 7 days, 2 hours, 15 minutes.
    await set('d', '2020-06-10');
    expect(await press('d', 'year', 'PageUp')).toBe('06/10/2025');
    expect(await press('d', 'month', 'PageDown')).toBe('04/10/2025');
    expect(await press('d', 'day', 'PageUp')).toBe('04/17/2025');
    await set('t', '10:30');
    expect(await press('t', 'hour', 'PageUp')).toBe('12:30 AM');
    expect(await press('t', 'minute', 'PageDown')).toBe('12:15 AM');
    // Home and End: the first and the last value of a month, day, hour or minute.
    expect(await press('d', 'month', 'End')).toBe('12/17/2025');
    expect(await press('d', 'month', 'Home')).toBe('01/17/2025');
    expect(await press('d', 'day', 'End')).toBe('01/31/2025');
    expect(await press('d', 'day', 'Home')).toBe('01/01/2025');
    expect(await press('t', 'hour', 'Home')).toBe('1:15 AM');
    expect(await press('t', 'minute', 'End')).toBe('1:59 AM');
    // min and max do not limit a step: past max the row still shows the step, and the value is refused as a whole (TXI-46).
    await set('d', '2026-06-10');
    expect(await press('d', 'year', 'ArrowUp')).toBe('06/10/2027');
    expect(await valueOf(page, 'd')).toBe('');
    expect(await press('d', 'year', 'ArrowDown')).toBe('06/10/2026');
    expect(await valueOf(page, 'd')).toBe('2026-06-10');
    // Read-only: nothing steps.
    expect(await press('ro', 'month', 'ArrowUp', 'PageDown', 'Home')).toBe('09/27/2026');
  });

  test('TXI-45: a digit is the next digit of the focused segment’s number while it stays in range, and starts it again otherwise; focus moves on when no digit could extend it, or at a separator’s character; a or p set the day period; Backspace removes a digit, and on an empty segment moves back; a short year counts as empty; other characters are ignored, and a read-only field does not change', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('d', { type: 'date', locale: 'en-US', label: 'D' }),
        fixture('t', { type: 'time', locale: 'en-US', label: 'T' }),
        fixture('ar', { type: 'date', locale: 'ar-EG', label: 'A' }),
        fixture('ro', { type: 'date', locale: 'en-US', label: 'RO', value: '2026-09-27', readOnly: true }),
      ],
    });
    const state = async (id: string) => [await rowText(page, id), await focusedUnit(page, id)];
    const fresh = async (id: string, unit: string) => {
      await host(page, id).evaluate((el) => (el as HTMLFormElement & { formResetCallback(): void }).formResetCallback());
      await seg(page, id, unit).click();
    };
    // 9 on the month shows 09 and focus moves to the day.
    await fresh('d', 'month');
    await page.keyboard.type('9');
    expect(await state('d')).toEqual(['09//', 'day']);
    // 1 then 2 gives 12 and moves.
    await fresh('d', 'month');
    await page.keyboard.type('1');
    expect(await state('d')).toEqual(['01//', 'month']); // one digit, in its filled form
    await page.keyboard.type('2');
    expect(await state('d')).toEqual(['12//', 'day']);
    // 1 then 5 gives 05 and moves: 15 is no month, so the number starts again.
    await fresh('d', 'month');
    await page.keyboard.type('15');
    expect(await state('d')).toEqual(['05//', 'day']);
    // A leading zero waits for its digit.
    await fresh('d', 'month');
    await page.keyboard.type('0');
    expect(await state('d')).toEqual(['//', 'month']);
    await page.keyboard.type('7');
    expect(await state('d')).toEqual(['07//', 'day']);
    // A day: 3 may become 30 or 31; 4 cannot begin a two-digit day.
    await page.keyboard.type('3');
    expect(await state('d')).toEqual(['07/03/', 'day']);
    await page.keyboard.type('1');
    expect(await state('d')).toEqual(['07/31/', 'year']);
    // 2026 on the year completes the value; three digits do not (a short year counts as empty).
    await page.keyboard.type('202');
    expect([await rowText(page, 'd'), await valueOf(page, 'd')]).toEqual(['07/31/0202', '']);
    await page.keyboard.type('6');
    expect([await rowText(page, 'd'), await valueOf(page, 'd')]).toEqual(['07/31/2026', '2026-07-31']);
    // A fifth digit starts the year again.
    await page.keyboard.type('1');
    expect([await rowText(page, 'd'), await valueOf(page, 'd')]).toEqual(['07/31/0001', '']);
    // "/" after 1 on the month moves to the day with 01; so do ".", "-" and a space; on an empty segment it does nothing.
    for (const separator of ['/', '.', '-', ' ']) {
      await fresh('d', 'month');
      await page.keyboard.type(separator);
      expect(await state('d'), `"${separator}" on an empty month`).toEqual(['//', 'month']);
      await page.keyboard.type(`1${separator}`);
      expect(await state('d'), `"${separator}" after 1`).toEqual(['01//', 'day']);
    }
    // A whole date typed with its separators, as a person writes it.
    await fresh('d', 'month');
    await page.keyboard.type('9/7/2026');
    expect([await rowText(page, 'd'), await valueOf(page, 'd')]).toEqual(['09/07/2026', '2026-09-07']);
    // Backspace on 12 leaves 01, again empties it, again moves to the previous segment without clearing it.
    await fresh('d', 'month');
    await page.keyboard.type('0912');
    expect(await state('d')).toEqual(['09/12/', 'year']);
    await page.keyboard.press('Backspace'); // the year is empty: back to the day
    expect(await state('d')).toEqual(['09/12/', 'day']);
    await page.keyboard.press('Backspace');
    expect(await state('d')).toEqual(['09/01/', 'day']);
    await page.keyboard.press('Backspace');
    expect(await state('d')).toEqual(['09//', 'day']);
    await page.keyboard.press('Backspace');
    expect(await state('d')).toEqual(['09//', 'month']);
    // Delete removes a digit too, and does not move.
    await page.keyboard.press('Delete');
    await page.keyboard.press('Delete');
    expect(await state('d')).toEqual(['//', 'month']);
    // A digit typed after a Backspace continues the number that is left.
    await page.keyboard.type('12');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('1');
    expect(await rowText(page, 'd')).toBe('11//');
    // Every other character is ignored.
    await fresh('d', 'month');
    await page.keyboard.type('x!é');
    expect(await state('d')).toEqual(['//', 'month']);
    // The day period: p gives PM, A gives AM; Backspace removes the whole of it; a digit there is ignored.
    await fresh('t', 'hour');
    await page.keyboard.type('230');
    expect(await state('t')).toEqual(['2:30 ', 'period']);
    await page.keyboard.type('p');
    expect([await rowText(page, 't'), await valueOf(page, 't')]).toEqual(['2:30 PM', '14:30']);
    await page.keyboard.type('A');
    expect([await rowText(page, 't'), await valueOf(page, 't')]).toEqual(['2:30 AM', '02:30']);
    await page.keyboard.type('7');
    expect(await rowText(page, 't')).toBe('2:30 AM');
    await page.keyboard.press('Backspace');
    expect([await rowText(page, 't'), await valueOf(page, 't')]).toEqual(['2:30 ', '']);
    // An hour: 1 may become 10, 11 or 12; ":" moves on; a minute's 0 is a value.
    await fresh('t', 'hour');
    await page.keyboard.type('1:0');
    expect(await state('t')).toEqual(['1:00 ', 'minute']);
    await page.keyboard.type('5');
    expect(await state('t')).toEqual(['1:05 ', 'period']);
    // The locale's digits are taken as digits (an insertion, or — as Firefox hands a test's inserted text — a composition's commit).
    await fresh('ar', 'day');
    await page.keyboard.insertText('٢');
    await expect.poll(() => rowText(page, 'ar')).toBe('٠٢//');
    await page.keyboard.insertText('٧');
    await expect.poll(() => state('ar')).toEqual(['٢٧//', 'month']);
    // Read-only: the segments take focus and do not change.
    await seg(page, 'ro', 'month').click();
    expect(await focusedUnit(page, 'ro')).toBe('month');
    await page.keyboard.type('12');
    await page.keyboard.press('Backspace');
    expect([await rowText(page, 'ro'), await valueOf(page, 'ro')]).toEqual(['09/27/2026', '2026-09-27']);
    await expect(seg(page, 'ro', 'month')).toHaveAttribute('contenteditable', 'false');
  });

  test('TXI-45: with an input method, full-width digits committed by the composition are taken, and nothing is taken before the commit', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium drives an input method from a test (CDP Input.imeSetComposition)');
    await mountFixtures(page, spec, { fixtures: [fixture('ime', { type: 'date', locale: 'ja-JP', label: '日付' })] });
    await listen(host(page, 'ime'));
    await seg(page, 'ime', 'year').click();
    const cdp = await page.context().newCDPSession(page);
    for (const text of ['２', '２０', '２０２', '２０２６']) await cdp.send('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length });
    // Composing: nothing is taken — every segment is still empty to the field, and no value was emitted.
    expect(await host(page, 'ime').evaluate((el) => (el.shadowRoot!.querySelector('.segment') as HTMLElement).getAttribute('aria-valuenow'))).toBeNull();
    expect(await events(page)).toEqual([]);
    await cdp.send('Input.insertText', { text: '２０２６' }); // commit
    await expect.poll(() => rowText(page, 'ime')).toBe('2026//');
    expect(await focusedUnit(page, 'ime')).toBe('month');
    // The month and the day the same way. The row gives a value from the day's first digit (02), and another with its second.
    for (const text of ['０９', '２７']) {
      await cdp.send('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length });
      expect(await events(page), 'nothing is taken before the commit').toEqual([]);
      await cdp.send('Input.insertText', { text });
    }
    await expect.poll(() => rowText(page, 'ime')).toBe('2026/09/27');
    expect(await events(page)).toEqual(['input:2026-09-02', 'input:2026-09-27']);
    // What the composition drew in the segments is gone: each shows the field's own text.
    expect(await segs(page, 'ime').evaluateAll((all) => all.map((el) => el.textContent))).toEqual(['2026', '09', '27']);
  });

  test('TXI-45: a composition on a segment is taken when it commits — by a key or by a candidate picked with the pointer — so the next composition, or a digit typed, goes on in the segment focus moved to, though no timer has run', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium drives an input method from a test (CDP Input.imeSetComposition)');
    await mountFixtures(page, spec, { fixtures: [fixture('ime', { type: 'date', locale: 'ja-JP', label: '日付' })] });
    await listen(host(page, 'ime'));
    await seg(page, 'ime', 'year').click();
    // A busy page: an engine handles input before timers, so nothing may wait for one. With the clock held none runs.
    await holdClock(page);
    const cdp = await page.context().newCDPSession(page);
    // Each commit is Input.insertText alone, with no key: what a candidate picked with the pointer sends.
    const commit = async (text: string) => {
      await cdp.send('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length });
      await cdp.send('Input.insertText', { text });
    };
    await commit('２０２６');
    expect([await rowText(page, 'ime'), await focusedUnit(page, 'ime')]).toEqual(['2026//', 'month']);
    // The next composition begins at once: on the month, where focus moved in the commit, not on the year.
    await commit('０９');
    expect([await rowText(page, 'ime'), await focusedUnit(page, 'ime')]).toEqual(['2026/09/', 'day']);
    await commit('２');
    // A digit typed straight after a commit is the day's next digit, not text the browser writes into the segment.
    await page.keyboard.type('7');
    expect(await rowText(page, 'ime')).toBe('2026/09/27');
    expect(await events(page)).toEqual(['input:2026-09-02', 'input:2026-09-27']);
    expect(await segs(page, 'ime').evaluateAll((all) => all.map((el) => el.textContent))).toEqual(['2026', '09', '27']);
    await cdp.detach();
  });

  test('TXI-45, TXI-3: the key that committed a composition on a segment, reported after its end as WebKit reports it — with key code 229, or pressed no later than the end — is not the field’s: no action; a key pressed after the end is, though no timer has run', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('d', { type: 'date', locale: 'en-US', label: 'D', value: '2026-09-27' })] });
    await listen(host(page, 'd'));
    await seg(page, 'd', 'day').click();
    await events(page);
    // In one task, so no timer can run between the end and the key; the cancelled keydown says the field took it.
    const commitThen = (keys: { key: string; mark?: boolean; after?: number }[]) =>
      seg(page, 'd', 'day').evaluate((segment, list) => {
        segment.dispatchEvent(new CompositionEvent('compositionstart', { data: '', bubbles: true, composed: true }));
        const end = new CompositionEvent('compositionend', { data: '', bubbles: true, composed: true });
        segment.dispatchEvent(end);
        return list.map(({ key, mark, after }) => {
          const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, composed: true });
          if (mark) Object.defineProperty(event, 'keyCode', { value: 229 });
          // When the key was pressed: at the end (the committing key), or after it.
          Object.defineProperty(event, 'timeStamp', { value: end.timeStamp + (after ?? 0) });
          segment.dispatchEvent(event);
          return event.defaultPrevented;
        });
      }, keys);
    expect(await commitThen([{ key: 'Enter', mark: true, after: 1 }, { key: 'Enter' }]), 'the committing Enter is left to the platform').toEqual([false, false]);
    expect(await events(page)).toEqual([]);
    expect(await commitThen([{ key: 'ArrowUp', after: 1 }, { key: 'Enter', after: 2 }])).toEqual([true, true]);
    expect(await events(page)).toEqual(['input:2026-09-28', 'change:2026-09-28', 'action:2026-09-28']);
  });

  test('TXI-46: the value is not empty only while every segment is filled and what they give is available; input is emitted once when an edit changes the value and never for one that leaves it as it was; a value set to what it already is leaves the segments alone', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('d', { type: 'date', locale: 'en-US', label: 'D', max: '2026-12-31', disabledDates: ['2026-09-28'] }),
        fixture('t', { type: 'time', locale: 'en-US', label: 'T', min: '09:00', disabledDates: ['2026-09-27'] }),
        fixture('dt', { type: 'date-time', locale: 'en-US', label: 'DT', disabledDates: ['2026-09-27'], min: '2026-01-01T09:00' }),
      ],
    });
    await listen(host(page, 'd'));
    // A product that echoes the value back on every input and whenever it likes, as a controlled field does.
    await host(page, 'd').evaluate((el) => el.addEventListener('input', () => ((el as any).value = (el as any).value)));
    // Filling 09, 27 and 2026 emits input exactly once, with 2026-09-27.
    await seg(page, 'd', 'month').click();
    await page.keyboard.type('0927');
    expect(await events(page)).toEqual([]);
    // Setting value to the empty string it already is, while only some segments are filled, keeps them.
    await host(page, 'd').evaluate((el) => ((el as any).value = ''));
    await host(page, 'd').evaluate((el) => (el as any).updateComplete);
    expect(await rowText(page, 'd')).toBe('09/27/');
    await page.keyboard.type('202');
    expect(await events(page)).toEqual([]);
    await page.keyboard.type('6');
    expect(await events(page)).toEqual(['input:2026-09-27']);
    expect(await rowText(page, 'd')).toBe('09/27/2026');
    // A segment of a filled row typed over or stepped: once each.
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowDown');
    expect(await events(page)).toEqual(['input:2026-09-27', 'input:2026-09-26']);
    // Clearing the day emits input once with the empty value — and the second Backspace, which changes nothing, emits none.
    await page.keyboard.press('Backspace');
    expect(await events(page)).toEqual(['input:2026-09-27', 'input:2026-09-26', 'input:2026-09-02']);
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    expect(await events(page)).toEqual(['input:2026-09-27', 'input:2026-09-26', 'input:2026-09-02', 'input:']);
    // What the row gives stops being available, and becomes available again: the listed date, and the year past max.
    await seg(page, 'd', 'day').click();
    await page.keyboard.press('ArrowUp'); // an empty day takes the clock's
    await page.keyboard.press('Home');
    for (let day = 1; day < 27; day++) await page.keyboard.press('ArrowUp');
    await listen(host(page, 'd'));
    expect(await valueOf(page, 'd')).toBe('2026-09-27');
    await page.keyboard.press('ArrowUp'); // the 28th is listed
    expect([await rowText(page, 'd'), await valueOf(page, 'd')]).toEqual(['09/28/2026', '']);
    await page.keyboard.press('ArrowUp');
    expect(await valueOf(page, 'd')).toBe('2026-09-29');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowUp'); // 2027 is after max
    expect([await rowText(page, 'd'), await valueOf(page, 'd')]).toEqual(['09/29/2027', '']);
    expect(await events(page)).toEqual(['input:', 'input:2026-09-29', 'input:']);
    // A time field ignores disabledDates and keeps min; a date-time checks its date against the list and the whole against min.
    await seg(page, 't', 'hour').click();
    await page.keyboard.type('830a');
    expect(await valueOf(page, 't')).toBe('');
    await page.keyboard.press('ArrowUp');
    expect(await valueOf(page, 't')).toBe('20:30');
    await seg(page, 'dt', 'month').click();
    await page.keyboard.type('09272026230p');
    expect([await rowText(page, 'dt'), await valueOf(page, 'dt')]).toEqual(['09/27/2026, 2:30 PM', '']);
    await seg(page, 'dt', 'day').click();
    await page.keyboard.press('ArrowUp');
    expect(await valueOf(page, 'dt')).toBe('2026-09-28T14:30');
  });

  test('TXI-47: the row is a group named by the label and each segment a spin button named by its unit and the label, with its range, its value and its value text — segmentEmptyText while empty; the description, the invalid, required, read-only and disabled states are on the segments; separators and placeholders are kept from assistive technology', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        ...spec.fixtures,
        fixture('ro', { type: 'date', locale: 'en-US', label: 'Read', value: '2026-09-27', readOnly: true }),
        fixture('ja', { type: 'date', locale: 'ja-JP', label: '開始日', segmentEmptyText: '未入力' }),
      ],
    });
    // In a Field: its help is the description, its requirement the required state, and its error the invalid one.
    await frame(page, 'help', { label: 'Due', supportingText: 'A working day.', required: true, requiredText: 'Required' }, { type: 'date', locale: 'en-US' });
    await frame(page, 'refused', { label: 'Start date', error: true, errorText: 'Choose a date after today.' }, { type: 'date', locale: 'en-US', value: '2026-09-27' });
    // The accessibility tree of stacked-date: a group named "Start date" with three spin buttons.
    const group = host(page, 'stacked-date').getByRole('group', { name: 'Start date', exact: true });
    await expect(group).toHaveCount(1);
    await expect(group.getByRole('spinbutton')).toHaveCount(3);
    const spin = (id: string, name: string) => host(page, id).getByRole('spinbutton', { name, exact: true });
    const aria = (locator: Locator) => locator.evaluate((el) => Object.fromEntries(['aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext'].map((a) => [a.slice(5), el.getAttribute(a)])));
    expect(await aria(spin('stacked-date', 'month, Start date'))).toEqual({ valuemin: '1', valuemax: '12', valuenow: '9', valuetext: '9 – September' });
    expect(await aria(spin('stacked-date', 'day, Start date'))).toEqual({ valuemin: '1', valuemax: '30', valuenow: '27', valuetext: null });
    expect(await aria(spin('stacked-date', 'year, Start date'))).toEqual({ valuemin: '1', valuemax: '9999', valuenow: '2026', valuetext: null });
    // A time: the hour with its day period, and the period's name.
    expect(await aria(spin('stacked-time-picker', 'hour, Start time'))).toEqual({ valuemin: '1', valuemax: '12', valuenow: '2', valuetext: '2 PM' });
    expect(await aria(spin('stacked-time-picker', 'minute, Start time'))).toEqual({ valuemin: '0', valuemax: '59', valuenow: '30', valuetext: null });
    expect(await aria(spin('stacked-time-picker', 'AM/PM, Start time'))).toEqual({ valuemin: '0', valuemax: '1', valuenow: '1', valuetext: 'PM' });
    expect(await aria(host(page, 'stacked-time-24h').getByRole('spinbutton').first())).toEqual({ valuemin: '0', valuemax: '23', valuenow: '14', valuetext: null });
    // In stacked-date-empty each has no value and the value text "Empty"; the product's own word where it gives one.
    for (const name of ['month', 'day', 'year']) expect(await aria(spin('stacked-date-empty', `${name}, Start date`)), name).toMatchObject({ valuenow: null, valuetext: 'Empty' });
    expect((await aria(host(page, 'ja').getByRole('spinbutton').first())).valuetext).toBe('未入力');
    // The units' names are the locale's own.
    expect(await host(page, 'ja').getByRole('spinbutton').evaluateAll((all) => all.map((el) => el.getAttribute('aria-label')))).toEqual(['年, 開始日', '月, 開始日', '日, 開始日']);
    // The value follows an edit, with no announcement of the field's own.
    await seg(page, 'stacked-date-empty', 'month').click();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Home');
    expect(await aria(spin('stacked-date-empty', 'month, Start date'))).toMatchObject({ valuenow: '1', valuetext: '1 – January' });
    await expect(part(page, 'stacked-date-empty', '.announcer')).toHaveText('');
    await page.keyboard.press('Backspace');
    await blurAll(page);
    // The description: the first segment's — and every segment's while the field is in error.
    await expect(spin('help', 'month, Due')).toHaveAccessibleDescription('A working day.');
    await expect(spin('help', 'day, Due')).toHaveAccessibleDescription('');
    for (const name of ['month', 'day', 'year']) {
      await expect(spin('refused', `${name}, Start date`), name).toHaveAccessibleDescription('Choose a date after today.');
      await expect(spin('refused', `${name}, Start date`), name).toHaveAttribute('aria-invalid', 'true');
      // Its own error marks every segment too, and a bare input has no words for it.
      await expect(spin('stacked-date-error', `${name}, Start date`), name).toHaveAttribute('aria-invalid', 'true');
      await expect(spin('help', `${name}, Due`), name).toHaveAttribute('aria-required', 'true');
      await expect(spin('help', `${name}, Due`), name).not.toHaveAttribute('aria-invalid');
      await expect(spin('ro', `${name}, Read`), name).toHaveAttribute('aria-readonly', 'true');
      await expect(spin('stacked-date', `${name}, Start date`), name).not.toHaveAttribute('aria-required');
    }
    // Disabled: exposed as disabled, and out of the focus order.
    for (const segment of await segs(page, 'stacked-date-disabled').all()) {
      await expect(segment).toHaveAttribute('aria-disabled', 'true');
      await expect(segment).not.toHaveAttribute('tabindex');
    }
    await expect(host(page, 'stacked-date-disabled').getByRole('spinbutton', { disabled: true })).toHaveCount(3);
    // The separators, the joining text and the placeholders are not in the tree: the row holds nothing but its spin buttons.
    expect(await part(page, 'stacked-date-time-picker', '.row').evaluate((row) => Array.from(row.querySelectorAll('*')).filter((el) => !el.closest('[aria-hidden="true"]') && el.getAttribute('role') !== 'spinbutton' && !el.classList.contains('unit')).length)).toBe(0);
    expect(await seg(page, 'stacked-date-empty', 'day').evaluate((el) => el.textContent)).toBe('');
    // An automated audit passes on both.
    const results = await new AxeBuilder({ page }).include('[data-fixture="stacked-date"]').include('[data-fixture="stacked-date-empty"]').include('[data-fixture="stacked-date-error"]').include('[data-fixture="ro"]').include('[data-fixture="help"]').include('[data-fixture="refused"]').analyze();
    expect(results.violations, results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`).join('\n')).toEqual([]);
  });

  test('TXI-50: a floating label is followed by an asterisk exactly while the Field that frames the input gives one — for its tag and its asterisk alike, and under auto for the mark the design system names; none where the Field or the system says none, where the label is not drawn or the input is stacked, and never outside a Field; the asterisk follows the label’s text in its style and place, resting and floated, from the input’s own tokens, and is kept from assistive technology', async ({ page }) => {
    const marks = ['auto', 'tag', 'asterisk', 'none'] as const;
    await mountFixtures(page, spec, { reducedMotion: true, fixtures: [fixture('bare', { variant: 'outlined', label: 'Email' }), fixture('plain', { variant: 'outlined', label: 'Email' })] });
    for (const mark of marks) await frame(page, `outlined-${mark}`, { label: 'Email', required: true, requiredMark: mark, requiredText: 'Required' }, { variant: 'outlined' });
    await frame(page, 'filled-auto', { label: 'Email', required: true, requiredText: 'Required' }, { variant: 'filled', value: 'ada@example.com' });
    await frame(page, 'hidden', { label: 'Email', labelHidden: true, required: true, requiredMark: 'asterisk' }, { variant: 'outlined' });
    await frame(page, 'not-required', { label: 'Email' }, { variant: 'outlined' });
    await frame(page, 'stacked', { label: 'Email', required: true, requiredMark: 'asterisk' }, {});
    await frame(page, 'in-error', { label: 'Email', required: true, requiredMark: 'asterisk', error: true }, { variant: 'outlined' });
    await frame(page, 'optional', { label: 'Company', required: false, optional: true, optionalText: 'Optional' }, { variant: 'outlined' });
    await frame(page, 'optional-wordless', { label: 'Company', required: false, optional: true, optionalText: '' }, { variant: 'filled' });
    await frame(page, 'optional-stacked', { label: 'Company', required: false, optional: true, optionalText: 'Optional' }, {});
    const asterisks = (id: string) => host(page, id).locator('label.label .asterisk');
    // Under the default system the Field's mark is the tag: a floating label draws it as the asterisk.
    expect(await token(page, '--tanrei-comp-field-requirement-mark')).toBe('tag');
    for (const mark of ['auto', 'tag', 'asterisk']) await expect(asterisks(`outlined-${mark}`), mark).toHaveCount(1);
    await expect(asterisks('outlined-none')).toHaveCount(0);
    await expect(asterisks('filled-auto')).toHaveCount(1);
    // No mark where the label is not drawn, where the Field asks for none, outside a Field, and in a stacked input —
    // whose mark is the Field's row (FLD-6).
    for (const id of ['hidden', 'not-required', 'bare', 'stacked']) await expect(host(page, id).locator('.asterisk'), id).toHaveCount(0);
    // The optional word: the Field's optionalText one word space after the label's text, in the label's style and color,
    // resting and floated with it, kept from assistive technology — the description says it; none without words, none in
    // a stacked input (the Field's row has the tag), and no asterisk with it.
    {
      const word = host(page, 'optional').locator('label.label .optional');
      await expect(part(page, 'optional', 'label.label')).toHaveText('Company Optional');
      await expect(word).toHaveAttribute('aria-hidden', 'true');
      await expect(asterisks('optional')).toHaveCount(0);
      expect(await css(word, 'color')).toBe(await css(part(page, 'optional', 'label.label'), 'color'));
      expect(await css(word, 'font')).toBe(await css(part(page, 'optional', 'label.label'), 'font'));
      await expect(input(page, 'optional')).toHaveAccessibleDescription('Optional');
      await expect(input(page, 'optional')).toHaveJSProperty('required', false);
      await expect(host(page, 'optional-wordless').locator('.optional')).toHaveCount(0);
      await expect(host(page, 'optional-stacked').locator('.optional')).toHaveCount(0);
      await expect(row(page, 'optional-stacked', '.optional-tag')).toHaveCount(1);
      // Resting in the label's resting style, floated in its floated style: it moves with the label.
      expect(await css(word, 'font-size')).toBe(`${await resolveToken(page, T('label-typescale-medium-font-size'))}px`);
      await input(page, 'optional').focus();
      await expect.poll(() => css(word, 'font-size')).toBe(`${await resolveToken(page, T('label-floated-typescale-medium-font-size'))}px`);
      await blurAll(page);
    }
    // It draws no tag; the Field draws no row of its own beside a floating label (FLD-25).
    for (const mark of marks) {
      await expect(host(page, `outlined-${mark}`).locator('tanrei-tag, .chip'), mark).toHaveCount(0);
      await expect(row(page, `outlined-${mark}`, '.label-row'), mark).toHaveCount(0);
      // The required state is exposed whichever mark is drawn, and where none is.
      await expect(input(page, `outlined-${mark}`), mark).toHaveJSProperty('required', true);
    }
    await expect(input(page, 'hidden')).toHaveJSProperty('required', true);
    // After the label's text, asterisk-gap from it, in the label's style and its own color; hidden from assistive technology.
    const star = asterisks('outlined-asterisk');
    await expect(star).toHaveText('*');
    await expect(star).toHaveAttribute('aria-hidden', 'true');
    expect(await css(star, 'color')).toBe(await resolveColor(page, T('outlined-required-asterisk-color')));
    expect(await css(asterisks('filled-auto'), 'color')).toBe(await resolveColor(page, T('filled-required-asterisk-color')));
    expect(await css(asterisks('in-error'), 'color')).toBe(await resolveColor(page, T('outlined-error-required-asterisk-color')));
    expect(Number.parseFloat(await css(star, 'margin-inline-start'))).toBe(await resolveToken(page, T('requirement-asterisk-gap')));
    expect(await css(star, 'font-size')).toBe(`${await resolveToken(page, T('label-typescale-medium-font-size'))}px`);
    const label = await bounds(part(page, 'outlined-asterisk', 'label.label'));
    const mark = await bounds(star);
    expect(mark.x + mark.width, 'the last thing in the label').toBeCloseTo(label.x + label.width, 0);
    // It floats with the label, in the floated style, and the outline's gap opens for the two together.
    // (Measured from the container: focus may scroll the page.)
    const above = async () => (await bounds(star)).y - (await bounds(part(page, 'outlined-asterisk', '.field > .container'))).y;
    const resting = await above();
    await input(page, 'outlined-asterisk').focus();
    await expect.poll(above).toBeLessThan(resting - 4);
    expect(await css(star, 'font-size')).toBe(`${await resolveToken(page, T('label-floated-typescale-medium-font-size'))}px`);
    const notch = (await bounds(part(page, 'outlined-asterisk', '.outline-notch'))).width;
    await input(page, 'plain').focus();
    await expect.poll(async () => (await bounds(part(page, 'plain', '.outline-notch'))).width).toBeGreaterThan(0);
    expect(notch).toBeGreaterThan((await bounds(part(page, 'plain', '.outline-notch'))).width);
    await blurAll(page);
    // auto under a system whose mark is the asterisk, and one whose is none; the Field's own mark against each.
    for (const [system, expected] of [['asterisk', [1, 1, 1, 0]], ['none', [0, 1, 1, 0]]] as const) {
      await override(page, { '--tanrei-comp-field-requirement-mark': system });
      await expect.poll(() => Promise.all(marks.map((each) => asterisks(`outlined-${each}`).count())), system).toEqual(expected);
      for (const each of marks) await expect(input(page, `outlined-${each}`), `${system}: ${each}`).toHaveJSProperty('required', true);
    }
    // The Field's token follows the system's one choice (sys.behavior.requirement-mark): set for the page instead, it
    // is followed the same.
    await rootTokens(page, { '--tanrei-comp-field-requirement-mark': '' });
    for (const [system, expected] of [['none', [0, 1, 1, 0]], ['asterisk', [1, 1, 1, 0]]] as const) {
      await override(page, { '--tanrei-sys-behavior-requirement-mark': system });
      await expect.poll(() => Promise.all(marks.map((each) => asterisks(`outlined-${each}`).count())), `the system’s ${system}`).toEqual(expected);
    }
  });

  test('TXI-52, TXI-41: without resizeLabel the handle is drawn, works and has no accessible name, and without segmentEmptyText an empty segment has no value and no value text; the reports name both props; the product’s words give them, and an instance’s own prop wins', async ({ page }) => {
    const seen = warnings(page);
    const given = (id: string) => spec.fixtures.find((f) => f.id === id)!;
    const without = (id: string, as: string, ...names: string[]): Fixture => ({ ...given(id), id: as, props: Object.fromEntries(Object.entries(given(id).props).filter(([name]) => !names.includes(name))) as Fixture['props'] });
    await mountFixtures(page, spec, {
      icons: true,
      reducedMotion: true,
      fixtures: [
        without('stacked-multiline-manual', 'grip', 'resizeLabel'),
        without('stacked-date-empty', 'date', 'segmentEmptyText'),
        { ...given('stacked-multiline-manual'), id: 'grip-own', props: { ...given('stacked-multiline-manual').props, resizeLabel: 'Resize the message' } },
        { ...given('stacked-date-empty'), id: 'date-own', props: { ...given('stacked-date-empty').props, segmentEmptyText: 'Not set' } },
      ],
    });
    const grip = (id: string) => part(page, id, GRIP);
    const segments = (id: string) => host(page, id).getByRole('spinbutton').evaluateAll((all) => all.map((el) => [el.getAttribute('aria-valuenow'), el.getAttribute('aria-valuetext')]));
    // The handle: drawn, a focus stop, a window splitter with its value — and no name.
    await expect(grip('grip')).toBeVisible();
    expect(await grip('grip').evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('aria-labelledby'), (el as HTMLElement).tabIndex, el.getAttribute('aria-valuenow')])).toEqual(['separator', null, null, 0, '3']);
    // It works: Down Arrow makes the input one line taller.
    await grip('grip').focus();
    await page.keyboard.press('ArrowDown');
    await expect(grip('grip')).toHaveAttribute('aria-valuenow', '4');
    // An empty segment: no value, no value text; the unit's name is the locale's own, from the browser.
    expect(await segments('date')).toEqual([[null, null], [null, null], [null, null]]);
    await expect(host(page, 'date').getByRole('spinbutton', { name: 'month, Start date', exact: true })).toHaveCount(1);
    // Reported once each, naming the prop.
    await expect.poll(() => seen.filter((w) => w.includes('resizeLabel') || w.includes('segmentEmptyText')).length).toBe(2);
    expect(seen.find((w) => w.includes('resizeLabel'))).toContain('resize-label is empty');
    expect(seen.find((w) => w.includes('resizeLabel'))).toContain('(TXI-41)');
    expect(seen.find((w) => w.includes('segmentEmptyText'))).toContain('segment-empty-text is empty');
    expect(seen.find((w) => w.includes('segmentEmptyText'))).toContain('(TXI-52)');
    expect(await missingWords(page)).toEqual(['resizeLabel', 'segmentEmptyText']);
    // An instance's own words, with no set of the product's.
    await expect(grip('grip-own')).toHaveAttribute('aria-label', 'Resize the message');
    expect((await segments('date-own'))[0]).toEqual([null, 'Not set']);
    // The product's words, set once; an instance's own prop wins.
    await setWords(page, { resizeLabel: 'Resize', segmentEmptyText: 'Empty' });
    await expect(grip('grip')).toHaveAttribute('aria-label', 'Resize');
    expect(await segments('date')).toEqual([[null, 'Empty'], [null, 'Empty'], [null, 'Empty']]);
    await expect(grip('grip-own')).toHaveAttribute('aria-label', 'Resize the message');
    expect((await segments('date-own'))[0]).toEqual([null, 'Not set']);
    expect(await missingWords(page)).toEqual([]);
  });
});

// The resize handle (TXI-39 … TXI-41, TXI-69). Each test mounts its own page once: these pages hold little but the
// fields, and Firefox leaves `document.fonts.ready` pending on such a page when it is the second document written into one
// window (the suite above mounts every fixture before each test) until something restyles it.
test.describe('the resize handle', () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await acmeSystemCss();
  });

  test('TXI-39: the resize handle is a Handle — size small, its axis resizeAxis’s, its corner bottom-end — drawn by the Handle and never by a glyph of the icon set, and revealed while a pointer is over the field or the input has focus', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: only(/multiline/) });
    for (const [id, axis] of [['stacked-multiline-manual', 'vertical'], ['stacked-multiline-manual-both', 'both'], ['outlined-multiline-manual', 'vertical']]) {
      const handle = part(page, id, '.resize-handle');
      expect(await handle.evaluate((el: any) => [el.localName, el.size, el.axis, el.corner]), id).toEqual(['tanrei-handle', 'small', axis, 'bottom-end']);
      // No glyph: nothing of the field's own is drawn for it, and the Handle draws a line or an arc.
      expect(await host(page, id).evaluate((el) => el.shadowRoot!.textContent ?? ''), id).not.toMatch(/drag_handle|drag_indicator/);
      await expect(handle.locator(axis === 'both' ? 'svg.arc' : '.capsule'), id).toHaveCount(1);
    }
    // Out of sight at rest under a pointer that hovers (HDL-23); revealed while the pointer is over the field, and while
    // the input has focus.
    const id = 'stacked-multiline-manual';
    const revealed = () => part(page, id, '.resize-handle').evaluate((el: any) => el.revealed);
    await page.mouse.move(0, 0);
    expect(await revealed()).toBe(false);
    await host(page, id).scrollIntoViewIfNeeded();
    await input(page, id).hover();
    await expect.poll(revealed).toBe(true);
    await page.mouse.move(0, 0);
    await expect.poll(revealed).toBe(false);
    await input(page, id).focus();
    await expect.poll(revealed).toBe(true);
    await blurAll(page);
    await expect.poll(revealed).toBe(false);
  });

  test('TXI-39: a manually resized field starts at minRows, does not follow its content, and draws the handle in the bottom end corner; a drag follows the pointer between minRows and maxRows — and sideways only where it resizes both ways — keeps the size, and moves neither the caret nor the focus; read-only keeps the handle and disabled draws none', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      reducedMotion: true,
      fixtures: [
        ...only(/multiline/),
        fixture('capped', { label: 'Notes', multiline: true, resize: 'manual', minRows: 2, maxRows: 4, resizeLabel: 'Resize', value: 'a\nb\nc\nd\ne\nf' }),
        fixture('read', { label: 'Notes', multiline: true, resize: 'manual', readOnly: true, value: 'kept' }),
        fixture('off', { label: 'Notes', multiline: true, resize: 'manual', disabled: true, value: 'kept' }),
        fixture('error', { label: 'Notes', multiline: true, resize: 'manual', error: true }),
      ],
    });
    const lineOf = await line(page, T('input-typescale-medium'));
    const id = 'stacked-multiline-manual';
    const grip = (of: string) => part(page, of, GRIP);
    const height = (of: string) => bounds(input(page, of)).then((b) => b.height);
    // Its place and size: the box of a small Handle against the container's bottom edge and its end edge.
    const [length, breadth] = await Promise.all(['--tanrei-comp-handle-container-length-small', '--tanrei-comp-handle-container-breadth-small'].map((n) => resolveToken(page, n)));
    for (const [of, size] of [[id, [length, breadth]], ['outlined-multiline-manual', [length, breadth]], ['stacked-multiline-manual-both', [breadth, breadth]]] as const) {
      const [g, c] = [await bounds(grip(of)), await bounds(part(page, of, '.field > .container'))];
      expect([g.width, g.height], of).toEqual(size);
      expect(c.x + c.width - (g.x + g.width), `${of}: against the end edge`).toBeCloseTo(0, 1);
      expect(c.y + c.height - (g.y + g.height), `${of}: against the bottom edge`).toBeCloseTo(0, 1);
    }
    // The field gives it no color of its own: in error it is drawn as it is without.
    const lineColor = (of: string) => css(part(page, of, '.resize-handle .capsule'), 'background-color');
    expect(await lineColor("error")).toBe(await lineColor(id));
    // Over the text and inside the stacked field's inner line: it is the topmost thing at its centre.
    await host(page, id).scrollIntoViewIfNeeded();
    expect(await grip(id).evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = (el.getRootNode() as ShadowRoot).elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return hit === el || el.contains(hit);
    })).toBe(true);
    // It starts at minRows lines and does not change its height with its content.
    expect(await height(id)).toBeCloseTo(3 * lineOf, 0);
    await input(page, id).click();
    await input(page, id).evaluate((el) => (el as HTMLTextAreaElement).setSelectionRange(3, 3));
    for (let n = 0; n < 4; n++) await page.keyboard.press('Enter');
    expect(await height(id)).toBeCloseTo(3 * lineOf, 0);
    expect(await input(page, id).evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    // A drag of two lines downward makes the input two lines taller, and moves neither the caret nor the focus.
    const drag = async (of: string, dx: number, dy: number) => {
      await host(page, of).scrollIntoViewIfNeeded(); // the mouse does not scroll
      const g = await bounds(grip(of));
      const [x, y] = [g.x + g.width / 2, g.y + g.height / 2];
      // (A pointer does not leave the window: a drag further left than its edge ends there.)
      const to = Math.max(2, x + dx);
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move((x + to) / 2, y + dy / 2, { steps: 3 });
      await page.mouse.move(to, y + dy, { steps: 3 });
      await page.mouse.up();
    };
    const caret = await input(page, id).evaluate((el) => [(el as HTMLTextAreaElement).selectionStart, (el as HTMLTextAreaElement).selectionEnd]);
    const width = (await bounds(host(page, id))).width;
    await drag(id, 0, 2 * lineOf);
    expect(await height(id)).toBeCloseTo(5 * lineOf, 0);
    await expect(input(page, id)).toBeFocused();
    expect(await input(page, id).evaluate((el) => [(el as HTMLTextAreaElement).selectionStart, (el as HTMLTextAreaElement).selectionEnd])).toEqual(caret);
    expect(await page.evaluate(() => getSelection()?.toString() ?? '')).toBe('');
    // No motion: the height is the pointer's at once (no transition was started).
    expect(await input(page, id).evaluate((el) => el.hasAttribute('data-resizing'))).toBe(false);
    // Vertical only: a horizontal movement changes nothing.
    await drag(id, 60, 0);
    expect(await height(id)).toBeCloseTo(5 * lineOf, 0);
    expect((await bounds(host(page, id))).width).toBe(width);
    // The size is kept as the text changes…
    await page.keyboard.type('more');
    expect(await height(id)).toBeCloseTo(5 * lineOf, 0);
    // …until minRows, maxRows, resize or resizeAxis changes.
    await host(page, id).evaluate((el) => ((el as any).maxRows = 9));
    await expect.poll(() => height(id)).toBeCloseTo(3 * lineOf, 0);
    // Never shorter than minRows nor taller than maxRows.
    await drag('capped', 0, 10 * lineOf);
    expect(await height('capped')).toBeCloseTo(4 * lineOf, 0);
    await drag('capped', 0, -10 * lineOf);
    expect(await height('capped')).toBeCloseTo(2 * lineOf, 0);
    // Both ways: the end edge follows the pointer, the text wraps to the new width; never narrower than its paddings and sys.target.touch.
    const both = 'stacked-multiline-manual-both';
    const start = await bounds(host(page, both));
    await drag(both, 40, lineOf);
    expect(await height(both)).toBeCloseTo(4 * lineOf, 0);
    expect((await bounds(host(page, both))).width).toBeCloseTo(start.width + 40, 0);
    expect((await bounds(host(page, both))).x).toBeCloseTo(start.x, 0);
    await drag(both, -1000, 0);
    const least = (await bounds(host(page, both))).width;
    expect(least).toBeCloseTo(2 * (await resolveToken(page, T('container-padding-inline-medium'))) + (await resolveToken(page, '--tanrei-sys-target-touch')), 0);
    expect((await bounds(input(page, both))).width).toBeCloseTo(await resolveToken(page, '--tanrei-sys-target-touch'), 0);
    // Right-to-left: the handle is at the left, and a drag to the left widens.
    const rtl = 'stacked-multiline-manual-rtl';
    const startRtl = await bounds(host(page, rtl));
    await drag(rtl, -12, 0);
    expect((await bounds(host(page, rtl))).width).toBeCloseTo(startRtl.width + 12, 0);
    await drag(rtl, 12, 0);
    expect((await bounds(host(page, rtl))).width).toBeCloseTo(startRtl.width, 0);
    // Read-only keeps the handle; disabled draws none and keeps its size.
    await expect(grip('read')).toHaveCount(1);
    await drag('read', 0, lineOf);
    expect(await height('read')).toBeCloseTo(3 * lineOf, 0);
    await expect(grip('off')).toHaveCount(0);
    expect(await height('off')).toBeCloseTo(2 * lineOf, 0);
  });

  test('TXI-40: the handle’s hit area is the Handle’s, at least the minimum target, centred on its box and reaching past the container’s edges, without changing its drawn size; a press inside it belongs to the handle and places no caret; a fine pointer over it shows the resize cursor of its axes', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, reducedMotion: true, fixtures: only(/multiline/) });
    const id = 'stacked-multiline-manual';
    await host(page, id).scrollIntoViewIfNeeded(); // the mouse does not scroll
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    const area = (of: string) =>
      part(page, of, GRIP).evaluate((el) => {
        const [g, style] = [el.getBoundingClientRect(), getComputedStyle(el, '::before')];
        return { width: Number.parseFloat(style.width), height: Number.parseFloat(style.height), box: [g.width, g.height], centre: [g.x + g.width / 2, g.y + g.height / 2] };
      });
    const hit = await area(id);
    expect([hit.width, hit.height]).toEqual([pointer, pointer]);
    expect(hit.box).toEqual(await Promise.all(['--tanrei-comp-handle-container-length-small', '--tanrei-comp-handle-container-breadth-small'].map((n) => resolveToken(page, n))));
    // It reaches past the container's bottom and end edges, and nothing in the layout moved for it.
    const c = await bounds(part(page, id, '.field > .container'));
    expect(hit.centre[0] + pointer / 2).toBeGreaterThan(c.x + c.width);
    expect(hit.centre[1] + pointer / 2).toBeGreaterThan(c.y + c.height);
    expect(c.height).toBeCloseTo((await bounds(part(page, 'stacked-multiline-fixed', '.field > .container'))).height, 1);
    // A press inside the area but off the box — over the text's corner, and just past the container — is the handle's:
    // it neither focuses the input nor places the caret, and it resizes.
    const lineOf = await line(page, T('input-typescale-medium'));
    for (const [dx, dy] of [[-(pointer / 2 - 3), -(pointer / 2 - 3)], [pointer / 2 - 3, pointer / 2 - 3]]) {
      await blurAll(page);
      const before = (await bounds(input(page, id))).height;
      const [x, y] = [hit.centre[0] + dx, hit.centre[1] + dy];
      const centre = (await area(id)).centre;
      const [px, py] = [centre[0] + dx, centre[1] + dy];
      await page.mouse.move(px, py);
      await page.mouse.down();
      await expect(input(page, id), `press at ${x}, ${y}`).not.toBeFocused();
      await page.mouse.move(px, py + lineOf, { steps: 4 });
      await page.mouse.up();
      expect((await bounds(input(page, id))).height).toBeCloseTo(before + lineOf, 0);
      await expect(input(page, id)).not.toBeFocused();
    }
    // The text under it stays reachable from the keyboard.
    await tabTo(page, input(page, id));
    await page.keyboard.type('x');
    expect(await valueOf(page, id)).toContain('x');
    // The cursor: the axes it resizes.
    expect(await css(part(page, id, GRIP), 'cursor')).toBe('ns-resize');
    expect(await css(part(page, 'stacked-multiline-manual-both', GRIP), 'cursor')).toBe('nwse-resize');
    expect(await css(part(page, 'stacked-multiline-manual-rtl', GRIP), 'cursor')).toBe('nesw-resize');
  });

  test('TXI-40: a coarse pointer extends the handle’s hit area to sys.target.touch', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium can emulate a coarse pointer (touch emulation over CDP)');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    await mountFixtures(page, spec, { icons: true, fixtures: only(/multiline/) });
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    expect(await part(page, 'stacked-multiline-manual', GRIP).evaluate((el) => [getComputedStyle(el, '::before').width, getComputedStyle(el, '::before').height].map(Number.parseFloat))).toEqual([touch, touch]);
  });

  test('TXI-41: the handle is a focus stop after the input, a window splitter named by resizeLabel whose value is the lines shown and whose limits are minRows and maxRows (or the lines the text needs); the arrows resize by a line and Page Down and Page Up by minRows, Home and End go to the limits, Enter, Space or a click fit the height to the text and back; a horizontal arrow toward the end edge widens a field that resizes both ways; keyboard focus is shown and pointer focus is not', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      reducedMotion: true,
      fixtures: [
        ...only(/multiline-manual/),
        fixture('six', { label: 'Notes', multiline: true, resize: 'manual', minRows: 2, resizeLabel: 'Resize notes', value: '1\n2\n3\n4\n5\n6' }, '<tanrei-button variant="text" slot="trailing-icon" label="Clear"><span slot="icon">close</span></tanrei-button>'),
        fixture('capped', { label: 'Notes', multiline: true, resize: 'manual', minRows: 2, maxRows: 4, resizeLabel: 'Resize', value: '1\n2\n3\n4\n5\n6' }),
        fixture('nameless', { label: 'Notes', multiline: true, resize: 'manual', resizeLabel: '' }),
      ],
    });
    const lineOf = await line(page, T('input-typescale-medium'));
    const lines = (id: string) => bounds(input(page, id)).then((b) => Math.round((b.height / lineOf) * 100) / 100);
    const grip = (id: string) => part(page, id, GRIP);
    // Semantics: a focusable separator with a value, named by resizeLabel; its value the lines, its limits minRows and maxRows.
    const splitter = host(page, 'six').getByRole('separator', { name: 'Resize notes' });
    await expect(splitter).toHaveCount(1);
    for (const [name, value] of [['tabindex', '0'], ['aria-orientation', 'horizontal'], ['aria-valuenow', '2'], ['aria-valuemin', '2'], ['aria-valuemax', '6']]) await expect(splitter, name).toHaveAttribute(name, value); // maxRows 0: the lines the text needs
    await expect(grip('capped')).toHaveAttribute('aria-valuemax', '4');
    await expect(host(page, 'stacked-multiline-manual').getByRole('separator', { name: 'Resize' })).toHaveAttribute('aria-valuenow', '3');
    // A handle without a name still renders, and is reported.
    await expect(grip('nameless')).toHaveCount(1);
    await expect.poll(() => seen.filter((w) => w.includes('TXI-41')).length).toBe(1);
    // Tab: the input, the slotted button, then the handle.
    await tabTo(page, input(page, 'six'));
    await tab(page);
    await expect(host(page, 'six').locator('tanrei-button[slot="trailing-icon"] button')).toBeFocused();
    await tab(page);
    await expect(grip('six')).toBeFocused();
    // Keyboard focus is shown around the handle's box, as the focus style names (the ring, HDL-14).
    expect(await css(grip('six'), 'outline-style')).toBe('solid');
    expect(await css(grip('six'), 'outline-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    // Down Arrow three times adds three lines, and the exposed value follows; Up Arrow takes one back.
    for (let n = 0; n < 3; n++) await page.keyboard.press('ArrowDown');
    await expect.poll(() => lines('six')).toBe(5);
    await expect(grip('six')).toHaveAttribute('aria-valuenow', '5');
    await page.keyboard.press('ArrowUp');
    await expect.poll(() => lines('six')).toBe(4);
    // Page Down and Shift with Down Arrow add minRows lines (a large step), Page Up takes them back.
    await page.keyboard.press('PageDown');
    await expect.poll(() => lines('six')).toBe(6);
    await page.keyboard.press('PageUp');
    await expect.poll(() => lines('six')).toBe(4);
    await page.keyboard.press('Shift+ArrowDown');
    await expect.poll(() => lines('six')).toBe(6);
    // Home returns to minRows; never below it.
    await page.keyboard.press('Home');
    await expect.poll(() => lines('six')).toBe(2);
    await page.keyboard.press('ArrowUp');
    await expect.poll(() => lines('six')).toBe(2);
    // End: without maxRows, the height that shows every line of the text.
    await page.keyboard.press('End');
    await expect.poll(() => lines('six')).toBe(6);
    await page.keyboard.press('Home');
    // Enter on a field whose text needs six lines shows six; Enter again returns to minRows. Space does the same.
    await page.keyboard.press('Enter');
    await expect.poll(() => lines('six')).toBe(6);
    await expect(grip('six')).toHaveAttribute('aria-valuenow', '6');
    await page.keyboard.press('Enter');
    await expect.poll(() => lines('six')).toBe(2);
    await page.keyboard.press('Space');
    await expect.poll(() => lines('six')).toBe(6);
    await page.keyboard.press('Space');
    await expect.poll(() => lines('six')).toBe(2);
    expect(await valueOf(page, 'six'), 'the keys are the handle’s, not the text’s').toBe('1\n2\n3\n4\n5\n6');
    await expect(grip('six')).toBeFocused();
    // Within maxRows: End and the fit stop at four lines.
    await tabTo(page, grip('capped'));
    await page.keyboard.press('End');
    await expect.poll(() => lines('capped')).toBe(4);
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => lines('capped')).toBe(4);
    await page.keyboard.press('Home');
    await page.keyboard.press('Enter');
    await expect.poll(() => lines('capped')).toBe(4);
    // A click that ends where it began fits the height too, and back — and shows no focus indicator (pointer focus).
    await blurAll(page);
    await grip('six').click();
    await expect.poll(() => lines('six')).toBe(6);
    expect(await css(grip('six'), 'outline-style')).toBe('none');
    await grip('six').click();
    await expect.poll(() => lines('six')).toBe(2);
    // An activation with no pointer (a click assistive technology makes) does the same.
    await grip('six').evaluate((el) => (el as HTMLElement).click());
    await expect.poll(() => lines('six')).toBe(6);
    // Both ways: Right Arrow widens by one line height of the input text and Left Arrow narrows by as much.
    const both = 'stacked-multiline-manual-both';
    const width = async (id: string) => (await bounds(host(page, id))).width;
    const start = await width(both);
    await tabTo(page, grip(both));
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => width(both)).toBeCloseTo(start + lineOf, 0);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => width(both)).toBeCloseTo(start - lineOf, 0);
    // In a right-to-left layout Left Arrow widens.
    const rtl = 'stacked-multiline-manual-rtl';
    const startRtl = await width(rtl);
    await tabTo(page, grip(rtl));
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => width(rtl)).toBeCloseTo(startRtl + lineOf, 0);
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => width(rtl)).toBeCloseTo(startRtl, 0);
    // A field that resizes vertically ignores the horizontal arrows.
    const vertical = await width('stacked-multiline-manual');
    await tabTo(page, grip('stacked-multiline-manual'));
    await page.keyboard.press('ArrowRight');
    expect(await width('stacked-multiline-manual')).toBe(vertical);
  });

  test('TXI-41: where the field resizes both ways an activation of the handle also makes it as wide as its place, and the next one gives back the width it had — the width, too, never depends on a drag; a field that resizes vertically keeps its width', async ({ page }) => {
    const manual = { variant: 'stacked', label: 'Notes', multiline: true, resize: 'manual', value: 'One line' };
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('both', { ...manual, resizeAxis: 'both' }), fixture('vertical', { ...manual })] });
    for (const id of ['both', 'vertical']) {
      await page.locator(`[data-fixture="${id}"]`).evaluate((el) => (el.style.inlineSize = '400px'));
      await host(page, id).evaluate((el) => (el.style.inlineSize = '240px'));
    }
    const width = async (id: string) => (await bounds(host(page, id))).width;
    expect(await width('both')).toBeCloseTo(240, 0);
    // A click that ends where it began: as wide as its place…
    await part(page, 'both', GRIP).click();
    await expect.poll(() => width('both')).toBeCloseTo(400, 0);
    // …and the next one gives back the width it had.
    await part(page, 'both', GRIP).click();
    await expect.poll(() => width('both')).toBeCloseTo(240, 0);
    // Enter on the handle, and a click assistive technology makes, do the same.
    await tabTo(page, part(page, 'both', GRIP));
    await page.keyboard.press('Enter');
    await expect.poll(() => width('both')).toBeCloseTo(400, 0);
    await part(page, 'both', GRIP).evaluate((el) => (el as HTMLElement).click());
    await expect.poll(() => width('both')).toBeCloseTo(240, 0);
    // Never wider than the field's own maximum width.
    await host(page, 'both').evaluate((el) => (el.style.maxInlineSize = '320px'));
    await part(page, 'both', GRIP).click();
    await expect.poll(() => width('both')).toBeCloseTo(320, 0);
    await part(page, 'both', GRIP).click();
    await expect.poll(() => width('both')).toBeCloseTo(240, 0);
    // A field that resizes vertically keeps its width.
    await part(page, 'vertical', GRIP).click();
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(await width('vertical')).toBeCloseTo(240, 0);
  });

  test('TXI-69: resizeend says the size the person gave the field — once at the end of a drag, after a step or an activation that changed it, never for one that changed nothing — with its width while it resizes both ways; it leaves the shadow root', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      reducedMotion: true,
      fixtures: [...only(/^stacked-multiline-manual(-both)?$/), fixture('capped', { label: 'Notes', multiline: true, resize: 'manual', minRows: 2, maxRows: 3, resizeLabel: 'Resize' })],
    });
    await page.evaluate(() => {
      const log: unknown[] = ((window as any).resized = []);
      document.addEventListener('resizeend', (e) => log.push([(e.target as HTMLElement).closest('[data-fixture]')!.getAttribute('data-fixture'), (e as CustomEvent).detail]));
    });
    const log = () => page.evaluate(() => (window as any).resized.splice(0) as [string, { lines: number; width: number | null }][]);
    const lineOf = await line(page, T('input-typescale-medium'));
    const id = 'stacked-multiline-manual';
    // A drag: one event, at its release, with the lines it left.
    await host(page, id).scrollIntoViewIfNeeded();
    const g = await bounds(part(page, id, GRIP));
    await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
    await page.mouse.down();
    for (const step of [10, 26, 2 * lineOf]) await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2 + step);
    expect(await log()).toEqual([]);
    await page.mouse.up();
    expect(await log()).toEqual([[id, { lines: 5, width: null }]]);
    // A key: one more line.
    await tabTo(page, part(page, id, GRIP));
    await page.keyboard.press('ArrowDown');
    expect(await log()).toEqual([[id, { lines: 6, width: null }]]);
    // A step that changes nothing says nothing: End on a field already at maxRows.
    await tabTo(page, part(page, 'capped', GRIP));
    await page.keyboard.press('End');
    expect(await log()).toEqual([['capped', { lines: 3, width: null }]]);
    await page.keyboard.press('End');
    expect(await log()).toEqual([]);
    // Both ways: the width comes with it.
    const both = 'stacked-multiline-manual-both';
    await tabTo(page, part(page, both, GRIP));
    await page.keyboard.press('ArrowRight');
    const [[from, detail]] = await log();
    expect(from).toBe(both);
    expect(detail.width).toBe(Math.round((await bounds(host(page, both))).width));
    // A size given back by the product says nothing.
    await host(page, id).evaluate(async (el: any) => { el.minRows = 4; await el.updateComplete; });
    expect(await log()).toEqual([]);
  });

  test('TXI-41: a change made from the handle’s keys moves as TXI-38 says, and under glow the handle’s keyboard focus is the glow', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, reducedMotion: false, system: 'acme', systemCss: await acmeSystemCss(), fixtures: only(/multiline-manual/) });
    const id = 'stacked-multiline-manual';
    const grip = part(page, id, GRIP);
    await tabTo(page, grip);
    const moved = await host(page, id).evaluate((el) => {
      const [field, handle] = [el.shadowRoot!.querySelector('textarea')!, el.shadowRoot!.querySelector('.resize-handle')!.shadowRoot!.querySelector<HTMLElement>('.container')!];
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
      return field.getAnimations().filter((a) => /^margin-(bottom|block-end)$/.test((a as CSSTransition).transitionProperty)).map((a) => Math.round(Number(a.effect!.getTiming().duration)));
    });
    expect(moved).toEqual([await resolveToken(page, T('motion-resize-duration'), 'duration')]);
    // Glow: the halo around the handle's box instead of the ring's line.
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('glow');
    await expect.poll(() => css(grip, 'box-shadow', '::after')).toContain(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    expect(await grip.getAttribute('data-focus-style')).toBe('glow');
  });
});

// ── A design system may add sizes and variants, and a type may be unknown ────────────
// ── The text field holds code (TXI-53 … TXI-61, and TXI-17, 24, 36, 37) ─────────────────────────────────────────────
/** A code field of this file's own. */
const code = (id: string, props: Fixture['props'] = {}, direction?: 'rtl'): Fixture => ({ id, ...(direction ? { direction } : {}), props: { ...WORDS, variant: 'stacked', type: 'code', label: id, ...props } });
/** A spec fixture drawn again under another id, with some props changed and in the direction given (none: the page's). */
const twin = (of: string, id: string, props: Fixture['props'] = {}, direction?: 'rtl'): Fixture => {
  const found = spec.fixtures.find((f) => f.id === of)!;
  return { id, ...(direction ? { direction } : {}), props: { ...WORDS, ...found.props, ...props }, ...(found.content === undefined ? {} : { content: found.content }) };
};
/**
 * Where a native element's text is drawn: the first and the last column of its box that are not the color of its
 * top-left pixel, in CSS px from the box's left edge. The characters of an input or a text area have no boxes a range
 * could give, so what was painted is looked at.
 */
async function ink(target: Locator) {
  const box = await bounds(target);
  const png = decodePng(await target.screenshot({ animations: 'disabled', caret: 'hide' }));
  const scale = png.width / box.width;
  const ground = png.at(0, 0);
  let [left, right] = [-1, -1];
  for (let x = 0; x < png.width; x++) {
    let painted = false;
    for (let y = 0; y < png.height && !painted; y++) painted = png.at(x, y) !== ground;
    if (!painted) continue;
    if (left < 0) left = x;
    right = x;
  }
  return { left: left / scale, right: (right + 1) / scale, width: box.width, empty: left < 0, pixel: 1 / scale };
}
/** What the native element's box and scrolling say. */
const boxOf = (target: Locator) =>
  target.evaluate((el) => {
    const style = getComputedStyle(el);
    const field = el as HTMLTextAreaElement;
    return {
      scrollWidth: field.scrollWidth,
      clientWidth: field.clientWidth,
      scrollHeight: field.scrollHeight,
      clientHeight: field.clientHeight,
      offsetHeight: field.offsetHeight,
      scrollLeft: field.scrollLeft,
      scrollTop: field.scrollTop,
      line: Number.parseFloat(style.lineHeight),
      paddingBottom: Number.parseFloat(style.paddingBottom),
      top: field.getBoundingClientRect().top,
    };
  });
/** The key that takes the caret to the end of its line (End scrolls the page on macOS). */
const LINE_END = process.platform === 'darwin' ? 'Meta+ArrowRight' : 'End';
const setValue = (page: P, id: string, value: string) => host(page, id).evaluate((el, v) => (((el as any).value = v), (el as any).updateComplete), value);
const setProp = (page: P, id: string, name: string, value: unknown) => host(page, id).evaluate((el, [n, v]) => (((el as any)[n as string] = v), (el as any).updateComplete), [name, value] as const);
const settled = (page: P) => page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

test.describe('a field that holds code', () => {
  test('TXI-17: a code field may be multi-line — a text area — where a password field stays one line, and a single-line code field ignores wrap', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [code('many', { multiline: true, value: 'a\nb' }), code('one', { wrap: false, value: 'a' }), fixture('secret', { type: 'password', multiline: true, label: 'Secret' })] });
    expect(await input(page, 'many').evaluate((el) => el.localName)).toBe('textarea');
    expect(await input(page, 'secret').evaluate((el) => el.localName)).toBe('input');
    // Enter in a multi-line code field is a line break, as in every multi-line field.
    await input(page, 'many').focus();
    await caretToEnd(input(page, 'many'));
    await page.keyboard.press('Enter');
    expect(await valueOf(page, 'many')).toBe('a\nb\n');
    // One line: no-wrap is read by nothing — the native element is an input, and the field is not marked.
    expect(await input(page, 'one').evaluate((el) => [el.localName, el.getAttribute('wrap')])).toEqual(['input', null]);
    await expect(part(page, 'one', '.field')).not.toHaveAttribute('data-nowrap', /.*/);
  });

  test('TXI-24: a code field never takes the direction of its first letter — not for a value that changes and not when type changes on a live element — while an email value keeps the field’s start edge', async ({ page }) => {
    const arabic = 'مرحبا بالعالم';
    await mountFixtures(page, spec, {
      fixtures: [
        { id: 'prose', direction: 'rtl', props: { ...WORDS, variant: 'stacked', multiline: true, label: 'Prose', value: arabic } },
        { id: 'line', direction: 'rtl', props: { ...WORDS, variant: 'stacked', label: 'Line', value: arabic } },
        { id: 'mail', direction: 'rtl', props: { ...WORDS, variant: 'stacked', type: 'email', label: 'Email', value: 'ada@example.com' } },
        { id: 'ltr-prose', props: { ...WORDS, variant: 'stacked', multiline: true, label: 'Prose', value: arabic } },
      ],
    });
    // (The last: whether each paragraph takes the direction of its own first letter — `unicode-bidi: plaintext`.)
    const laid = (id: string) => input(page, id).evaluate((el) => [el.getAttribute('dir'), getComputedStyle(el).direction, getComputedStyle(el).textAlign, getComputedStyle(el).unicodeBidi === 'plaintext']);
    // Prose: by its own first strong character (the accepted sentence).
    expect(await laid('prose')).toEqual(['auto', 'rtl', 'start', true]);
    for (const id of ['prose', 'line', 'ltr-prose']) {
      // The type changes on a live element: the same native element, no longer laid out by its letters.
      await setProp(page, id, 'type', 'code');
      expect(await laid(id), `${id} as code`).toEqual(['ltr', 'ltr', 'left', false]);
      // A value that begins with a right-to-left string, one that holds a bracket alone, and none.
      for (const value of [`["${arabic}"]`, '{', '', arabic]) {
        await setValue(page, id, value);
        expect(await laid(id), `${id} holding ${JSON.stringify(value)}`).toEqual(['ltr', 'ltr', 'left', false]);
      }
      await expect(part(page, id, '.body')).toHaveAttribute('dir', 'ltr');
      // And back: prose again, by its letters.
      await setProp(page, id, 'type', 'text');
      expect((await laid(id))[0], `${id} as text again`).toBe('auto');
      await expect(part(page, id, '.body')).not.toHaveAttribute('dir', /.*/);
    }
    // The other left-to-right types are not changed: left to right, at the field's start edge — the right.
    expect(await laid('mail')).toEqual(['ltr', 'ltr', 'right', false]);
    expect((await ink(input(page, 'mail'))).right).toBeGreaterThan((await bounds(input(page, 'mail'))).width - 4);
  });

  test('TXI-36: in a code field the placeholder, the prefix and the suffix are code — left to right whatever their first letter — and a floating label keeps its own direction', async ({ page }) => {
    const props = { label: 'نمط', placeholder: 'مثال', prefixText: 'م', suffixText: 'ن' };
    await mountFixtures(page, spec, { fixtures: [code('c', props), fixture('t', { variant: 'stacked', ...props }), code('floating', { ...props, variant: 'outlined' })] });
    const bidi = (id: string, selector: string, pseudo?: string) => css(part(page, id, selector), 'unicode-bidi', pseudo);
    // Code: the row's direction, never the text's own.
    expect(await bidi('c', '.input', '::placeholder')).not.toBe('plaintext');
    expect(await css(input(page, 'c'), 'text-align', '::placeholder')).toBe('left');
    for (const affix of ['.prefix', '.suffix']) {
      expect(await bidi('c', affix), affix).toBe('isolate');
      expect(await css(part(page, 'c', affix), 'direction'), affix).toBe('ltr');
    }
    // The same texts in a text field are each laid out by their own first letter.
    for (const selector of ['.prefix', '.suffix']) expect(await bidi('t', selector), selector).toBe('plaintext');
    // What is not the input line stays as TXI-36 says, in a code field too: the floating label.
    expect(await bidi('floating', 'label.label')).toBe('plaintext');
    // The prefix is at the left of the value and the suffix at its right.
    const [prefix, value, suffix] = await Promise.all(['.prefix', '.input', '.suffix'].map((selector) => bounds(part(page, 'c', selector))));
    expect(prefix.x + prefix.width).toBeLessThanOrEqual(value.x);
    expect(value.x + value.width).toBeLessThanOrEqual(suffix.x);
  });

  test('TXI-37: in a code field whose lines do not wrap only the lines of the code count for the height — a long line adds none, each line break adds one — and wrapped, a row the code wraps onto counts', async ({ page }) => {
    const long = 'x '.repeat(200);
    await mountFixtures(page, spec, { fixtures: [code('rows', { multiline: true, wrap: false, minRows: 1, value: long }), code('wrapped', { multiline: true, minRows: 1, value: long })] });
    const lines = async (id: string) => {
      const box = await boxOf(input(page, id));
      return box.clientHeight / box.line;
    };
    expect(await lines('rows')).toBeCloseTo(1, 1);
    expect(await lines('wrapped')).toBeGreaterThan(2);
    await setValue(page, 'rows', `${long}\n${long}\nc`);
    await expect.poll(() => lines('rows')).toBeCloseTo(3, 1);
    await input(page, 'rows').focus();
    await caretToEnd(input(page, 'rows'));
    await page.keyboard.press('Enter');
    await expect.poll(() => lines('rows')).toBeCloseTo(4, 1);
    // No line stands under a scrollbar and none is scrolled up or down: everything fits in the height.
    const box = await boxOf(input(page, 'rows'));
    expect(box.scrollHeight).toBeLessThanOrEqual(box.clientHeight + 1);
    await expect(input(page, 'rows')).not.toHaveAttribute('data-overflows', /.*/);
  });

  test('TXI-53: in a right-to-left stage a code field is laid out alike empty, holding one bracket and beginning with an Arabic string — left to right from the left padding edge, on one line and on many — where an email value begins at the right', async ({ page }) => {
    // (What was painted is read from a screenshot of each field.)
    test.setTimeout(120_000);
    const rtl = only(/^stacked-code.*-rtl$/);
    await mountFixtures(page, spec, {
      fixtures: [
        ...rtl,
        twin('stacked-code-multiline-arabic-first-rtl', 'arabic-ltr'),
        twin('stacked-code-multiline-brace-rtl', 'brace-ltr'),
        twin('stacked-code-rtl', 'one-ltr'),
        // A value shorter than the field, as code and as an email address, in the same right-to-left stage.
        twin('stacked-code-rtl', 'short', { value: 'sys.color' }, 'rtl'),
        twin('stacked-code-rtl', 'mail', { type: 'email', value: 'a@b.example' }, 'rtl'),
      ],
    });
    for (const id of ['stacked-code-multiline-empty-rtl', 'stacked-code-multiline-brace-rtl', 'stacked-code-multiline-arabic-first-rtl', 'stacked-code-rtl', 'stacked-code-empty-rtl', 'short']) {
      expect(await css(host(page, id), 'direction'), `${id}: the page is right to left`).toBe('rtl');
      expect(await input(page, id).evaluate((el) => [el.getAttribute('dir'), getComputedStyle(el).direction, getComputedStyle(el).textAlign, getComputedStyle(el).unicodeBidi === 'plaintext']), id).toEqual(['ltr', 'ltr', 'left', false]);
      // The first character — of the value, or of the placeholder, which is code too — is drawn at the input's left
      // edge (the input has no padding of its own: the container's is outside it), and nothing reaches its right edge.
      const drawn = await ink(input(page, id));
      expect(drawn.empty, id).toBe(false);
      expect(drawn.left, `${id}: from the left`).toBeLessThan(4);
      // (The fixture's own pattern is longer than its line: it is cut at the right, which is where it ends.)
      if (id !== 'stacked-code-rtl') expect(drawn.right, `${id}: not at the right`).toBeLessThan(drawn.width - 8);
      expect(await boxOf(input(page, id)).then((box) => box.scrollLeft), id).toBe(0);
    }
    // The measured failures, each drawn exactly where the same field of a left-to-right page draws it.
    for (const [there, here] of [['stacked-code-multiline-arabic-first-rtl', 'arabic-ltr'], ['stacked-code-multiline-brace-rtl', 'brace-ltr'], ['stacked-code-rtl', 'one-ltr']]) {
      // (Within one device pixel on each side: Chromium on Linux smooths the text of one field by the three colors
      // of a pixel and of the other in gray — the same glyphs at the same place, whose faint fringe then reaches one
      // device pixel further. The failures this holds off were the width of the field apart.)
      const [a, b] = [await ink(input(page, there)), await ink(input(page, here))];
      expect(Math.abs(a.left - b.left), `${there}: ${a.left} and ${b.left}`).toBeLessThanOrEqual(a.pixel);
      expect(Math.abs(a.right - b.right), `${there}: ${a.right} and ${b.right}`).toBeLessThanOrEqual(a.pixel);
    }
    // The placeholder of an empty field, and the caret: typing begins at the left.
    for (const id of ['stacked-code-multiline-empty-rtl', 'stacked-code-empty-rtl']) {
      expect(await css(input(page, id), 'text-align', '::placeholder'), id).toBe('left');
      expect(await css(input(page, id), 'unicode-bidi', '::placeholder'), id).not.toBe('plaintext');
      await input(page, id).focus();
      await page.keyboard.type('{');
      const typed = await ink(input(page, id));
      expect(typed.left, `${id}: the first character typed`).toBeLessThan(4);
      expect(typed.right, id).toBeLessThan(typed.width / 2);
    }
    // An email value of the same stage is at the right (TXI-24, unchanged).
    const mail = await ink(input(page, 'mail'));
    expect(mail.right).toBeGreaterThan(mail.width - 4);
    expect(mail.left).toBeGreaterThan(8);
  });

  test('TXI-53: the prefix, the value and the suffix are one left-to-right row between mirrored icons', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...only(/^stacked-code-affixes-rtl$/, /^stacked-code-multiline-rtl$/, /^stacked-code-rtl$/), twin('stacked-code-affixes-rtl', 'affixes-ltr')] });
    const id = 'stacked-code-affixes-rtl';
    const [trailing, prefix, value, suffix, leading, container] = await Promise.all(['.trailing', '.prefix', '.input', '.suffix', '.leading', '.field > .container'].map((selector) => bounds(part(page, id, selector))));
    const order = [trailing, prefix, value, suffix, leading];
    for (let i = 1; i < order.length; i++) expect(order[i].x, `part ${i} stands to the right of part ${i - 1}`).toBeGreaterThanOrEqual(order[i - 1].x + order[i - 1].width - 0.5);
    // The icons keep the layout's paddings and gap: the leading icon at the right edge, the row a gap from each.
    const gap = await resolveToken(page, T('container-gap-medium'));
    const padIcon = await resolveToken(page, T('container-padding-inline-with-icon-medium'));
    expect(container.x + container.width - (leading.x + leading.width)).toBeCloseTo(padIcon, 1);
    expect(trailing.x - container.x).toBeCloseTo(padIcon, 1);
    expect(leading.x - (suffix.x + suffix.width), 'the gap to the leading icon, at the row’s right').toBeCloseTo(gap, 1);
    expect(prefix.x - (trailing.x + trailing.width), 'the gap to the trailing icon, at the row’s left').toBeCloseTo(gap, 1);
    // The row is the mirror image of nothing: it is where a left-to-right page has it, between the other icons.
    const [prefixLtr, suffixLtr, containerLtr] = await Promise.all(['.prefix', '.suffix', '.field > .container'].map((selector) => bounds(part(page, 'affixes-ltr', selector))));
    expect(prefix.x - container.x).toBeCloseTo(prefixLtr.x - containerLtr.x, 1);
    expect(suffix.x - container.x).toBeCloseTo(suffixLtr.x - containerLtr.x, 1);
  });

  test('TXI-53: a right-to-left code field resized by hand has its handle in the bottom-left corner, is exactly as tall as in a left-to-right layout, and keeps the handle’s box as room after its last line that it scrolls through; no other field has that room', async ({ page }) => {
    const id = 'stacked-code-multiline-manual-rtl';
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [...only(/^stacked-code-multiline-manual-rtl$/), twin(id, 'manual-ltr'), twin(id, 'auto-rtl', { resize: 'auto' }, 'rtl'), twin(id, 'fixed-rtl', { resize: 'fixed' }, 'rtl'), twin(id, 'disabled-rtl', { disabled: true }, 'rtl'), twin(id, 'prose-rtl', { type: 'text' }, 'rtl')],
    });
    const room = await resolveToken(page, '--tanrei-comp-handle-container-breadth-small');
    const [grip, container] = await Promise.all([GRIP, '.field > .container'].map((selector) => bounds(part(page, id, selector))));
    expect(grip.x - container.x, 'the handle in the bottom-left corner').toBeCloseTo(0, 1);
    expect(grip.height).toBeCloseTo(room, 1);
    // As tall as the same field of a left-to-right page: the room is not height.
    expect((await bounds(host(page, id))).height).toBe((await bounds(host(page, 'manual-ltr'))).height);
    const [rtl, ltr] = [await boxOf(input(page, id)), await boxOf(input(page, 'manual-ltr'))];
    expect(rtl.offsetHeight).toBe(ltr.offsetHeight);
    expect(rtl.paddingBottom).toBeCloseTo(room, 1);
    expect(rtl.scrollHeight - ltr.scrollHeight, 'the left-to-right field scrolls through that much less').toBeCloseTo(room, 0);
    // Scrolled to its end, the last line stands wholly above the handle.
    await input(page, id).evaluate((el) => (el.scrollTop = el.scrollHeight));
    const end = await boxOf(input(page, id));
    expect(end.scrollTop).toBeGreaterThan(0);
    const lastLineBottom = end.top + end.scrollHeight - end.paddingBottom - end.scrollTop;
    expect(lastLineBottom).toBeLessThanOrEqual((await bounds(part(page, id, GRIP))).y + 0.5);
    // Nothing is added in a left-to-right layout, while resize is auto or fixed, without a handle, or for prose.
    for (const other of ['manual-ltr', 'auto-rtl', 'fixed-rtl', 'disabled-rtl', 'prose-rtl']) expect((await boxOf(input(page, other))).paddingBottom, other).toBe(0);
    // The handle's activation fits the height to the lines of the code — four — not to the lines and the room.
    await part(page, id, GRIP).focus();
    await page.keyboard.press('Enter');
    await expect(part(page, id, GRIP)).toHaveAttribute('aria-valuenow', '4');
  });

  test('TXI-53: when the layout direction changes, the row keeps its direction, its scroll offsets, its selection and its caret', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { fixtures: only(/^stacked-code-multiline-nowrap$/) });
    const id = 'stacked-code-multiline-nowrap';
    // TODO: the spec does not yet say what Firefox should keep here. Firefox lays a text area out anew when the
    // direction of anything above it changes, and the new box starts unscrolled — the browser's own text area does the
    // same. There the offset is not compared; the direction, the selection, the caret and the focus are.
    const offsetKept = browserName !== 'firefox';
    const state = () => input(page, id).evaluate((el, offset) => { const field = el as HTMLTextAreaElement; return [field.getAttribute('dir'), getComputedStyle(field).direction, getComputedStyle(field).textAlign, offset ? field.scrollLeft : null, field.selectionStart, field.selectionEnd, field === (field.getRootNode() as ShadowRoot).activeElement]; }, offsetKept);
    await input(page, id).focus();
    await input(page, id).evaluate((el) => (el as HTMLTextAreaElement).setSelectionRange(60, 70));
    // (Where the browser brings a new selection into view, it has done so before the offset is set.)
    await settled(page);
    await input(page, id).evaluate((el) => (el.scrollLeft = 120));
    await settled(page);
    const before = await state();
    expect(before.slice(0, 3)).toEqual(['ltr', 'ltr', 'left']);
    if (offsetKept) expect(before[3]).toBeGreaterThan(0);
    expect(before.slice(4)).toEqual([60, 70, true]);
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    await settled(page);
    expect(await css(host(page, id), 'direction')).toBe('rtl');
    expect(await state()).toEqual(before);
    await page.evaluate(() => document.documentElement.removeAttribute('dir'));
    await settled(page);
    expect(await state()).toEqual(before);
  });

  test('TXI-54: the code face is the family, weight and letter spacing of code.typescale at the input’s own size and line height — a code field is as tall as a text field and sets its first line where one does — with tabs to code.tab-size columns, no ligature, and the variant’s colors', async ({ page }) => {
    test.setTimeout(120_000);
    await mountFixtures(page, spec, {
      fixtures: [
        ...only(/^stacked-code$/, /^stacked-code-large$/, /^stacked-code-multiline$/, /^outlined-code-multiline$/, /^filled-code-multiline$/, /^stacked-code-affixes$/, /^stacked-code-empty$/, /^stacked-code-multiline-tabs$/),
        ...['stacked-code', 'stacked-code-large', 'stacked-code-multiline', 'outlined-code-multiline', 'filled-code-multiline', 'stacked-code-affixes', 'stacked-code-empty'].map((id) => twin(id, `${id}-as-text`, { type: 'text' })),
        code('tab', { multiline: true, value: '\tx\n\t\tx' }),
        code('spaces', { multiline: true, value: '  x\n    x' }),
        code('ligature', { value: '!= => fi' }),
      ],
    });
    // What the tokens say, serialized by the same engine that serializes the element's style.
    const face = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.cssText = 'font-family: var(--tanrei-comp-text-input-code-typescale-font-family); font-weight: var(--tanrei-comp-text-input-code-typescale-font-weight); letter-spacing: var(--tanrei-comp-text-input-code-typescale-letter-spacing); tab-size: var(--tanrei-comp-text-input-code-tab-size)';
      document.body.append(probe);
      const style = getComputedStyle(probe);
      const read = { fontFamily: style.fontFamily, fontWeight: style.fontWeight, letterSpacing: style.letterSpacing, tabSize: style.tabSize };
      probe.remove();
      return read;
    });
    const faceOf = (locator: Locator, pseudo?: string) =>
      locator.evaluate((el, ps) => { const style = getComputedStyle(el, ps ?? undefined); return { fontFamily: style.fontFamily, fontWeight: style.fontWeight, letterSpacing: style.letterSpacing, fontSize: style.fontSize, lineHeight: style.lineHeight, color: style.color }; }, pseudo ?? null);
    for (const id of ['stacked-code', 'stacked-code-large', 'stacked-code-multiline', 'outlined-code-multiline', 'filled-code-multiline', 'stacked-code-affixes', 'stacked-code-empty']) {
      const [own, prose] = [await faceOf(input(page, id)), await faceOf(input(page, `${id}-as-text`))];
      expect({ fontFamily: own.fontFamily, fontWeight: own.fontWeight, letterSpacing: own.letterSpacing }, id).toEqual({ fontFamily: face.fontFamily, fontWeight: face.fontWeight, letterSpacing: face.letterSpacing });
      expect(own.fontFamily, `${id}: not the body face`).not.toBe(prose.fontFamily);
      // The size and the line height are the input's own, and so is the color: nothing is colored by what it means.
      expect([own.fontSize, own.lineHeight, own.color], id).toEqual([prose.fontSize, prose.lineHeight, prose.color]);
      // Exactly as tall as the text field of its variant and size, with the first line where that field sets it.
      const [a, b] = [await bounds(host(page, id)), await bounds(host(page, `${id}-as-text`))];
      expect(a.height, id).toBe(b.height);
      const [line, proseLine, top, proseTop] = [await bounds(input(page, id)), await bounds(input(page, `${id}-as-text`)), await bounds(part(page, id, '.field > .container')), await bounds(part(page, `${id}-as-text`, '.field > .container'))];
      expect(line.y - top.y, `${id}: the first line`).toBeCloseTo(proseLine.y - proseTop.y, 1);
      expect(await css(input(page, id), 'font-variant-ligatures'), id).toBe('none');
      // The label keeps its own text style.
      const label = part(page, id, 'label.label');
      if (await label.count()) {
        expect((await faceOf(label)).fontFamily, id).toBe((await faceOf(part(page, `${id}-as-text`, 'label.label'))).fontFamily);
        expect((await faceOf(label)).fontFamily, `${id}: the floating label is not code`).not.toBe(face.fontFamily);
      }
    }
    // The placeholder, the prefix and the suffix are in the code face.
    expect((await faceOf(input(page, 'stacked-code-empty'), '::placeholder')).fontFamily).toBe(face.fontFamily);
    for (const affix of ['.prefix', '.suffix']) expect((await faceOf(part(page, 'stacked-code-affixes', affix))).fontFamily, affix).toBe(face.fontFamily);
    // Characters as they are held: a tab reaches the next multiple of code.tab-size columns — where that many spaces
    // end — and every space is kept, with nothing transformed or hyphenated.
    expect(await css(input(page, 'stacked-code-multiline-tabs'), 'tab-size')).toBe(face.tabSize);
    expect(face.tabSize).toBe(await token(page, T('code-tab-size')));
    expect(await css(input(page, 'tab'), 'white-space-collapse').then((value) => value || 'preserve')).toMatch(/preserve/);
    const [tabbed, spaced] = [await ink(input(page, 'tab')), await ink(input(page, 'spaces'))];
    expect(tabbed.left).toBeCloseTo(spaced.left, 0);
    expect(tabbed.right).toBeCloseTo(spaced.right, 0);
    expect(spaced.left, 'two columns of the face in').toBeGreaterThan(8);
    expect(await input(page, 'ligature').evaluate((el) => [getComputedStyle(el).textTransform, getComputedStyle(el).fontVariantLigatures])).toEqual(['none', 'none']);
  });

  test('TXI-55: the native element itself is asked to leave code alone — no spelling check, autocorrection, capitals or translation, and no remembered entry unless the product names an autofill hint — and the value is held exactly as entered', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [code('one'), code('many', { multiline: true }), code('hinted', { autocomplete: 'username' }), code('hinted-many', { multiline: true, autocomplete: 'username' }), fixture('prose', { variant: 'stacked', multiline: true, label: 'Prose' })] });
    const names = ['dir', 'spellcheck', 'autocorrect', 'autocapitalize', 'translate', 'autocomplete', 'inputmode'];
    const attrs = (id: string) => input(page, id).evaluate((el, list) => Object.fromEntries(list.map((name) => [name, el.getAttribute(name)])), names);
    const asked = { dir: 'ltr', spellcheck: 'false', autocorrect: 'off', autocapitalize: 'none', translate: 'no', inputmode: null };
    expect(await attrs('one')).toEqual({ ...asked, autocomplete: 'off' });
    expect(await attrs('many')).toEqual({ ...asked, autocomplete: 'off' });
    expect(await attrs('hinted')).toEqual({ ...asked, autocomplete: 'username' });
    expect(await attrs('hinted-many')).toEqual({ ...asked, autocomplete: 'username' });
    // What the browser then says of the element: not spell-checked, not translated.
    expect(await input(page, 'many').evaluate((el) => [(el as HTMLTextAreaElement).spellcheck, (el as HTMLElement).translate])).toEqual([false, false]);
    // A field of prose is asked nothing of the kind.
    expect(await attrs('prose')).toMatchObject({ spellcheck: null, autocorrect: null, autocapitalize: null, translate: null, autocomplete: null });
    // Held exactly: not trimmed, not normalized, not parsed, never invalid for what it holds.
    for (const id of ['one', 'many']) {
      await input(page, id).focus();
      await page.keyboard.type('  {"a":  \'b\' -- ...}  ');
      expect(await valueOf(page, id), id).toBe('  {"a":  \'b\' -- ...}  ');
      const exact = ' e\u0301\u00a0\u2003x\t ';
      await setValue(page, id, exact);
      expect(await input(page, id).inputValue(), id).toBe(exact);
      expect(await host(page, id).evaluate((el) => [(el as any).value, (el as any).validity.valid]), id).toEqual([exact, true]);
      await expect(input(page, id), id).not.toHaveAttribute('aria-invalid', /.*/);
    }
  });

  test('TXI-56: text that arrives whole in a code field is taken character for character — tabs, no-break spaces and other spaces as they are, each CRLF one line break — and a single line takes its line breaks as an input does, emitting no action and submitting nothing', async ({ page, browserName }) => {
    await mountHtml(page, `<form id="form"><tanrei-text-input id="many" name="many" type="code" multiline label="Many"></tanrei-text-input><tanrei-text-input id="one" name="one" type="code" label="One"></tanrei-text-input></form>`);
    await page.evaluate(() => {
      (window as any).seen = [];
      document.getElementById('form')!.addEventListener('submit', (event) => { event.preventDefault(); (window as any).seen.push('submit'); });
      document.addEventListener('action', () => (window as any).seen.push('action'));
    });
    // (WebKit's editing command writes four spaces for a carriage return — its real paste does not, and no test can
    // reach its clipboard — so there the text arrives with the line breaks a text area holds.)
    const given = browserName === 'webkit' ? 'a\tb\u00a0c\u2003d\n\te  f \n' : 'a\tb\u00a0c\u2003d\r\n\te  f \r\n';
    /** The editing command a paste, a drop and dictation become: text handed to the focused element whole. */
    const insert = (text: string) => page.evaluate((t) => document.execCommand('insertText', false, t), text);
    await page.locator('#many .input').focus();
    await insert(given);
    expect(await page.locator('#many').evaluate((el) => (el as any).value)).toBe('a\tb\u00a0c\u2003d\n\te  f \n');
    await page.locator('#one .input').focus();
    await insert(given);
    const one = await page.locator('#one').evaluate((el) => (el as any).value as string);
    // (What a one-line element does with a line break is its browser's: none of them is kept, and nothing else is touched.)
    expect(one).not.toMatch(/[\r\n]/);
    expect(one.replace(/ /g, '')).toBe('a\tb\u00a0c\u2003d\tef');
    expect(await page.evaluate(() => (window as any).seen)).toEqual([]);
  });

  test('TXI-56: a paste from a formatted source through the real clipboard is its plain text alone, and a copy from a wrapped field gives the value with no line break that wrapping added', async ({ page, browserName, headless }) => {
    // Headless Chromium keeps a clipboard of its own; a headed browser would read and write the machine's.
    test.skip(browserName !== 'chromium' || !headless, 'only headless Chromium has a clipboard a test may use');
    await mountFixtures(page, spec, { fixtures: [code('many', { multiline: true }), code('one'), ...only(/^stacked-code-multiline-wrap$/)] });
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<textarea id="pad" aria-label="Pad">source</textarea>'));
    const pad = page.locator('#pad');
    const plain = 'a\tb\u00a0c\r\n\td  e';
    // A copy from a formatted source: a bold word, a link and a table beside the plain text.
    await page.evaluate((text) => {
      document.addEventListener('copy', (event) => {
        event.preventDefault();
        event.clipboardData!.setData('text/html', '<p><b style="font-size: 40px; color: red">a</b> <a href="https://example.test/">b</a></p><table><tr><td>c</td><td>d</td></tr></table><ul><li>e</li></ul>');
        event.clipboardData!.setData('text/plain', text);
      }, { once: true });
    }, plain);
    await pad.focus();
    await pad.evaluate((el) => (el as HTMLTextAreaElement).select());
    await page.keyboard.press('ControlOrMeta+c');
    await listen(host(page, 'one'));
    await input(page, 'many').focus();
    await page.keyboard.press('ControlOrMeta+v');
    await expect.poll(() => valueOf(page, 'many')).toBe('a\tb\u00a0c\n\td  e');
    expect(await host(page, 'many').evaluate((el) => el.shadowRoot!.querySelectorAll('.input *').length)).toBe(0);
    await input(page, 'one').focus();
    await page.keyboard.press('ControlOrMeta+v');
    await expect.poll(() => valueOf(page, 'one')).toMatch(/^a\tb\u00a0c/);
    expect(await valueOf(page, 'one')).not.toMatch(/[\r\n]/);
    expect((await events(page)).filter((event) => event.startsWith('action'))).toEqual([]);
    // Copy: the selected characters of the value, with its own line breaks and none for the rows it wraps onto.
    const wrapped = 'stacked-code-multiline-wrap';
    const value = await valueOf(page, wrapped);
    expect((await boxOf(input(page, wrapped))).clientHeight).toBeGreaterThan((await boxOf(input(page, wrapped))).line * 1.5);
    await input(page, wrapped).focus();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('ControlOrMeta+c');
    await pad.evaluate((el) => ((el as HTMLTextAreaElement).value = ''));
    await pad.focus();
    await page.keyboard.press('ControlOrMeta+v');
    expect(await pad.inputValue()).toBe(value);
    expect(value).not.toContain('\n');
  });

  test('TXI-57: with wrap a line of code continues on following rows — at its spaces first, and anywhere inside a part with no space — without scrolling sideways and without changing the value; a field that is not multi-line code ignores no-wrap, and says so once', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [...only(/^stacked-code-multiline-wrap$/), code('unbroken', { multiline: true, value: 'x'.repeat(400) }), fixture('prose', { variant: 'stacked', multiline: true, wrap: false, label: 'Prose', value: 'word '.repeat(60) }), code('one', { wrap: false, value: 'x'.repeat(400) })],
    });
    // A container 320 wide.
    await page.addStyleTag({ content: '.stage { box-sizing: border-box; inline-size: 320px; padding: 0; } .stage > tanrei-text-input { inline-size: 100%; }' });
    await settled(page);
    for (const id of ['stacked-code-multiline-wrap', 'unbroken']) {
      const box = await boxOf(input(page, id));
      expect(box.scrollWidth, `${id}: no sideways scrolling`).toBe(box.clientWidth);
      expect(box.clientHeight / box.line, `${id}: more than one row`).toBeGreaterThan(1.5);
      // Every row is in the height (TXI-37) and the value holds the line breaks of the code alone: none.
      expect(box.scrollHeight, id).toBeLessThanOrEqual(box.clientHeight + 1);
      expect(await valueOf(page, id), id).not.toContain('\n');
      expect(await input(page, id).inputValue(), id).not.toContain('\n');
    }
    // At the spaces first: the fixture's line breaks before a part, never inside its first one.
    expect(await css(input(page, 'stacked-code-multiline-wrap'), 'overflow-wrap')).toBe('anywhere');
    // Prose with wrap false wraps as it always did, and a single line scrolls in its line.
    const prose = await boxOf(input(page, 'prose'));
    expect(prose.scrollWidth).toBe(prose.clientWidth);
    expect(prose.clientHeight / prose.line).toBeGreaterThan(1.5);
    await expect(input(page, 'prose')).not.toHaveAttribute('wrap', /.*/);
    await expect(part(page, 'prose', '.field')).not.toHaveAttribute('data-nowrap', /.*/);
    expect((await bounds(host(page, 'one'))).width).toBe(320);
    // Reported once for each element, however often it draws again.
    for (const id of ['prose', 'one']) {
      await setProp(page, id, 'label', 'Again');
      await setProp(page, id, 'noWrap', false);
      await setProp(page, id, 'noWrap', true);
    }
    expect(seen.filter((message) => message.includes('TXI-57')).length).toBe(2);
    expect(seen.filter((message) => message.includes('TXI-57') && message.includes('no-wrap is ignored')).length).toBe(2);
  });

  test('TXI-58: with no-wrap no line is broken — the input scrolls sideways inside the container from the left and only the code moves; a long line widens nothing; the height is the lines of the code and a scrollbar’s room where it takes any; the input stays the one text stop with focus shown on the container; read-only, it still scrolls from the keyboard', async ({ page, browserName }) => {
    const id = 'stacked-code-multiline-nowrap';
    await mountFixtures(page, spec, {
      fixtures: [...only(/^stacked-code-multiline-nowrap$/, /^stacked-code-multiline-read-only$/), twin(id, 'empty', { value: '' }), twin(id, 'long', { value: `${'x'.repeat(400)}\nshort` }), code('after', { label: 'After' })],
    });
    await page.addStyleTag({ content: '.stage { box-sizing: border-box; inline-size: 320px; padding: 0; } .stage > tanrei-text-input { inline-size: 100%; }' });
    await settled(page);
    await expect(input(page, id)).toHaveAttribute('wrap', 'off');
    expect(await css(input(page, id), 'white-space-collapse').then((value) => value || 'preserve')).toMatch(/preserve/);
    for (const each of [id, 'long']) {
      const box = await boxOf(input(page, each));
      expect(box.scrollWidth, `${each}: a line wider than the input`).toBeGreaterThan(box.clientWidth);
      expect(box.scrollLeft, `${each}: from the left`).toBe(0);
      // The lines of the code — three (minRows), with nothing to scroll up or down — and, besides them, exactly the
      // room the browser's sideways scrollbar takes (none where it is drawn over the content).
      expect(box.clientHeight / box.line, `${each}: three lines clear of the scrollbar`).toBeCloseTo(3, 1);
      expect(box.scrollHeight, each).toBeLessThanOrEqual(box.clientHeight + 1);
      // The length of a line changes the width of nothing.
      for (const selector of ['', '.field > .container', '.body']) {
        const [a, b] = [await bounds(selector ? part(page, each, selector) : host(page, each)), await bounds(selector ? part(page, 'empty', selector) : host(page, 'empty'))];
        expect(a.width, `${each} ${selector || 'host'}`).toBe(b.width);
      }
    }
    expect((await bounds(host(page, 'long'))).width).toBe(320);
    expect(await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]).then(([scroll, client]) => scroll - client)).toBe(0);
    // An empty field has no scrollbar and no room for one.
    const empty = await boxOf(input(page, 'empty'));
    expect(empty.offsetHeight / empty.line).toBeCloseTo(3, 1);
    // At the far end of a region that scrolls, the long line adds nothing to the region's width or the page's.
    const widths = await page.evaluate(async (longId) => {
      const box = document.createElement('div');
      box.style.cssText = 'inline-size: 300px; overflow: auto;';
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; align-items: flex-start; inline-size: max-content;';
      const before = document.createElement('div');
      before.style.cssText = 'flex: none; inline-size: 2000px; block-size: 1px;';
      const stage = document.querySelector(`[data-fixture="${longId}"]`)!;
      const place = document.createComment('stage');
      stage.replaceWith(place);
      row.append(before, stage);
      box.append(row);
      document.body.append(box);
      const frames = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      await frames();
      const held = [box.scrollWidth, document.documentElement.scrollWidth - document.documentElement.clientWidth];
      const field = stage.querySelector('tanrei-text-input') as any;
      const value = field.value;
      field.value = '';
      await field.updateComplete;
      await frames();
      const without = [box.scrollWidth, document.documentElement.scrollWidth - document.documentElement.clientWidth];
      field.value = value;
      await field.updateComplete;
      place.replaceWith(stage);
      box.remove();
      await frames();
      return { held, without };
    }, 'long');
    expect(widths.held).toEqual(widths.without);
    expect(widths.held[1]).toBe(0);
    // The caret scrolls the input and moves no other part.
    const places = async (of: string) => Promise.all(['.field > .container', '.above', '.supporting-text'].map(async (selector) => ((await part(page, of, selector).count()) ? bounds(part(page, of, selector)) : null)));
    // Read-only (TXI-10), the keys are the browser's for a text it does not edit: Firefox keeps the caret and scrolls
    // with it; Chromium draws no caret and scrolls with the arrows; WebKit scrolls with Option and the arrows.
    const readOnlyKey = browserName === 'firefox' ? LINE_END : browserName === 'webkit' ? 'Alt+ArrowRight' : 'ArrowRight';
    for (const each of [id, 'stacked-code-multiline-read-only']) {
      const before = await places(each);
      const value = await valueOf(page, each);
      await input(page, each).click();
      await input(page, each).evaluate((el) => { (el as HTMLTextAreaElement).setSelectionRange(0, 0); el.scrollLeft = 0; });
      if (each === id) await page.keyboard.press(LINE_END);
      else for (let presses = 0; presses < 4; presses++) await page.keyboard.press(readOnlyKey);
      await expect.poll(() => boxOf(input(page, each)).then((box) => box.scrollLeft), each).toBeGreaterThan(0);
      // The input's padding after the longest line scrolls with it: the last character can be brought to the end.
      const box = await boxOf(input(page, each));
      if (each === id) expect(box.scrollLeft, each).toBeCloseTo(box.scrollWidth - box.clientWidth, 0);
      expect(await places(each), each).toEqual(before);
      expect(await valueOf(page, each), each).toBe(value);
      // Focus is shown on the container, which does not scroll (TXI-7): the stacked field's inner line, in the focused color.
      await expect.poll(async () => (await drawn(page, each)).outline, each).toBe((await expected(page, 'stacked', 'focused')).outline);
      expect(await css(input(page, each), 'outline-style'), each).toBe('none');
    }
    // One text stop: Tab arrives on the input once, and the next Tab leaves the field.
    await tabTo(page, input(page, id));
    await tab(page);
    expect(await host(page, id).evaluate((el) => el.matches(':focus-within'))).toBe(false);
    expect(await host(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('*')].filter((node) => (node as HTMLElement).tabIndex >= 0).map((node) => node.className))).toEqual(['input']);
  });

  test('TXI-58: an auto-resized field whose lines do not wrap is taller by exactly the room its box loses to a sideways scrollbar — three lines stay clear of it — and no taller once the room is gone; a field resized by hand or fixed adds none', async ({ page }) => {
    // TODO: observe a real scrollbar's room. A headless browser draws no scrollbar that takes
    // room (the machine's are drawn over the content, and the test browsers hide theirs), so the room is given to the
    // native element here as what a scrollbar is to its box: block size that is neither content nor padding — a bottom
    // edge 12 thick, which `offsetHeight - clientHeight` reads exactly as it reads a scrollbar.
    const id = 'stacked-code-multiline-nowrap';
    await mountFixtures(page, spec, { fixtures: [...only(/^stacked-code-multiline-nowrap$/), twin(id, 'empty', { value: '' }), twin(id, 'fixed', { resize: 'fixed' }), twin(id, 'manual', { resize: 'manual' }), twin(id, 'wrapped', { wrap: true })] });
    const before = (await bounds(host(page, id))).height;
    expect(before).toBe((await bounds(host(page, 'empty'))).height);
    expect(await boxOf(input(page, id)).then((box) => box.offsetHeight - box.clientHeight), 'no scrollbar takes room here').toBe(0);
    const edge = (thick: number) =>
      page.evaluate((px) => {
        for (const field of document.querySelectorAll('tanrei-text-input')) {
          const sheet = new CSSStyleSheet();
          sheet.replaceSync(`textarea { border-block-end: ${px}px solid transparent !important; }`);
          field.shadowRoot!.adoptedStyleSheets = [...field.shadowRoot!.adoptedStyleSheets.filter((each) => !(each as any).standIn), Object.assign(sheet, { standIn: true })];
        }
      }, thick);
    await edge(12);
    // The height follows the next cause of a fit: the value.
    const value = await valueOf(page, id);
    const refit = async (text: string) => { for (const each of [id, 'fixed', 'manual', 'wrapped']) await setValue(page, each, text); };
    await refit(`${value} `);
    await expect.poll(async () => (await bounds(host(page, id))).height).toBe(before + 12);
    const box = await boxOf(input(page, id));
    expect(box.offsetHeight - box.clientHeight).toBe(12);
    expect(box.clientHeight / box.line, 'three lines clear of it').toBeCloseTo(3, 1);
    expect(box.scrollHeight, 'no line is scrolled up or down for its sake').toBeLessThanOrEqual(box.clientHeight);
    expect(await input(page, id).evaluate((el) => (el as HTMLElement).style.getPropertyValue('--_bar'))).toBe('12px');
    // A field that is fixed, resized by hand, or wrapped reads no such room: it keeps its height.
    for (const each of ['fixed', 'manual']) expect((await bounds(host(page, each))).height, each).toBe(before);
    expect(await input(page, 'wrapped').evaluate((el) => (el as HTMLElement).style.getPropertyValue('--_bar'))).toBe('');
    // A line break more is a line more, with the same room.
    await setValue(page, id, `${value}\nmore\nand more`);
    await expect.poll(async () => { const now = await boxOf(input(page, id)); return [Math.round((now.clientHeight / now.line) * 10) / 10, now.offsetHeight - now.clientHeight]; }).toEqual([4, 12]);
    // The room gone, the field is its lines again.
    await edge(0);
    await setValue(page, id, value);
    await expect.poll(async () => (await bounds(host(page, id))).height).toBe(before);
    expect(await input(page, id).evaluate((el) => (el as HTMLElement).style.getPropertyValue('--_bar'))).toBe('');
  });

  test('TXI-59: no key changes meaning in a code field — Tab and Shift+Tab move focus and insert nothing, Enter adds a line break and no indent, a bracket or a quotation mark is that one character, and a tab character is removed as one', async ({ page }) => {
    await mountHtml(page, `<button id="before">Before</button><tanrei-text-input id="field" type="code" multiline label="Code"></tanrei-text-input><button id="after">After</button>`);
    const field = page.locator('#field');
    const native = field.locator('.input');
    const value = () => field.evaluate((el) => (el as any).value as string);
    await field.evaluate((el) => (((el as any).value = '  indented'), (el as any).updateComplete));
    await native.focus();
    await caretToEnd(native);
    await tab(page);
    await expect(page.locator('#after')).toBeFocused();
    await native.focus();
    await tab(page, { back: true });
    await expect(page.locator('#before')).toBeFocused();
    expect(await value()).toBe('  indented');
    // Enter after an indented line: a line break and no other character.
    await native.focus();
    await caretToEnd(native);
    await page.keyboard.press('Enter');
    expect(await value()).toBe('  indented\n');
    // No matching bracket or quotation mark.
    await page.keyboard.type('(');
    await page.keyboard.type('"');
    await page.keyboard.type('{');
    expect(await value()).toBe('  indented\n("{');
    // A tab character that came with the value is kept, and Backspace after it removes it alone.
    await field.evaluate((el) => (((el as any).value = '\tx'), (el as any).updateComplete));
    expect(await native.inputValue()).toBe('\tx');
    await native.focus();
    await native.evaluate((el) => (el as HTMLTextAreaElement).setSelectionRange(1, 1));
    await page.keyboard.press('Backspace');
    expect(await value()).toBe('x');
    // The same on one line: Tab leaves, and the value is as it was.
    await field.evaluate((el) => (((el as any).multiline = false), ((el as any).value = 'a'), (el as any).updateComplete));
    await field.locator('.input').focus();
    await tab(page);
    await expect(page.locator('#after')).toBeFocused();
    expect(await value()).toBe('a');
  });

  test('TXI-60: a code field is exposed exactly as the text field of any other type — a text box, multi-line with multiline, named by the label, described, invalid, required and read-only as its props say — with no role, role description or word for holding code', async ({ page, browserName }) => {
    const props = { multiline: true, minRows: 3, label: 'Layer', value: '{\n  "id": "acme"\n}', error: true, readOnly: true, counter: true, maxLength: 200 };
    await mountFixtures(page, spec, { fixtures: [code('code', props), fixture('text', { variant: 'stacked', ...props }), code('one', { label: 'Pattern', value: 'a.*' }), fixture('one-text', { variant: 'stacked', label: 'Pattern', value: 'a.*' })] });
    const exposed = (id: string) =>
      input(page, id).evaluate((el) => Object.fromEntries([...el.attributes].filter((a) => a.name === 'role' || a.name.startsWith('aria-') || ['required', 'readonly', 'disabled', 'id'].includes(a.name)).map((a) => [a.name, a.value])));
    for (const [own, other] of [['code', 'text'], ['one', 'one-text']]) {
      expect(await exposed(own), own).toEqual(await exposed(other));
      expect(await exposed(own), own).not.toHaveProperty('aria-roledescription');
      expect(await exposed(own), own).not.toHaveProperty('role');
      expect(await input(page, own).evaluate((el) => el.localName), own).toBe(await input(page, other).evaluate((el) => el.localName));
    }
    await expect(host(page, 'code').getByRole('textbox', { name: 'Layer', exact: true })).toHaveCount(1);
    await expect(host(page, 'code').getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    expect(await input(page, 'code').inputValue()).toBe(props.value);
    // No live region speaks for wrapping or scrolling: the field's one polite region is empty.
    expect(await part(page, 'code', '.announcer').textContent()).toBe('');
    // What the browser computed (Chromium's accessibility tree): the two text boxes are the same node but for nothing.
    test.skip(browserName !== 'chromium', 'the accessibility tree is read over the DevTools protocol');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Accessibility.enable');
    const { nodes } = await cdp.send('Accessibility.getFullAXTree');
    await cdp.detach();
    const boxes = nodes
      .filter((node) => !node.ignored && node.role?.value === 'textbox')
      .map((node) => ({
        name: node.name?.value,
        description: node.description?.value,
        value: node.value?.value,
        properties: Object.fromEntries((node.properties ?? []).filter((p) => !['focusable', 'editable', 'settable', 'describedby', 'labelledby'].includes(p.name)).map((p) => [p.name, p.value.value])),
        roledescription: (node.properties ?? []).find((p) => p.name === 'roledescription')?.value.value,
      }));
    expect(boxes).toHaveLength(4);
    const [asCode, asText, oneCode, oneText] = boxes;
    expect(asCode).toEqual(asText);
    expect(oneCode).toEqual(oneText);
    expect(asCode).toMatchObject({ name: 'Layer', value: props.value, roledescription: undefined, properties: { multiline: true, invalid: 'true', readonly: true } });
    expect(asCode.description, 'its count, as any text input’s').toContain('/200');
    expect(asCode.properties).not.toHaveProperty('roledescription');
  });

  test('TXI-61: under forced colors a code field differs from the text field of its variant in its font family alone, and at 200 % text in a container 320 wide it wraps or scrolls inside its container, cuts nothing, and the page does not scroll sideways', async ({ page }) => {
    const ids = ['stacked-code-multiline-wrap', 'stacked-code-multiline-nowrap', 'stacked-code'];
    await mountFixtures(page, spec, { fixtures: [...only(/^stacked-code-multiline-wrap$/, /^stacked-code-multiline-nowrap$/, /^stacked-code$/, /^stacked-code-multiline$/, /^stacked-code-rtl$/), twin('stacked-code-multiline', 'as-text', { type: 'text' })] });
    // Twice the text size, in a container 320 wide.
    await page.addStyleTag({ content: '.stage { box-sizing: border-box; inline-size: 320px; padding: 0; } .stage > tanrei-text-input { inline-size: 100%; }' });
    const single = (await boxOf(input(page, 'stacked-code'))).offsetHeight;
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    await settled(page);
    await settled(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 'the page does not scroll sideways').toBe(0);
    for (const id of ids) {
      expect((await bounds(host(page, id))).width, id).toBe(320);
      const box = await boxOf(input(page, id));
      // The code face keeps the input's size, which grew with the text.
      expect(box.line, id).toBeCloseTo((await line(page, T('input-typescale-medium'))), 0);
      // Nothing is cut up or down: every line is inside the input, and the input inside its container.
      expect(box.scrollHeight, `${id}: no line is cut`).toBeLessThanOrEqual(box.clientHeight + 1);
      const [inner, outer] = [await bounds(input(page, id)), await bounds(part(page, id, '.field > .container'))];
      expect(inner.y, id).toBeGreaterThanOrEqual(outer.y);
      expect(inner.y + inner.height, id).toBeLessThanOrEqual(outer.y + outer.height + 0.5);
      expect(inner.x, id).toBeGreaterThanOrEqual(outer.x);
      expect(inner.x + inner.width, id).toBeLessThanOrEqual(outer.x + outer.width + 0.5);
    }
    // Wrapped: no sideways scrolling at all. Not wrapped, and on one line: what does not fit is reached by scrolling inside the field.
    const wrapped = await boxOf(input(page, 'stacked-code-multiline-wrap'));
    expect(wrapped.scrollWidth).toBe(wrapped.clientWidth);
    expect((await boxOf(input(page, 'stacked-code-multiline-nowrap'))).scrollWidth).toBeGreaterThan((await boxOf(input(page, 'stacked-code-multiline-nowrap'))).clientWidth);
    expect((await boxOf(input(page, 'stacked-code'))).scrollWidth).toBeGreaterThan((await boxOf(input(page, 'stacked-code'))).clientWidth);
    expect((await boxOf(input(page, 'stacked-code'))).offsetHeight, 'the field grew with its text').toBeGreaterThan(single);
    // Forced colors: where the engine has the mode, everything that is drawn is the text field's, but for the face.
    await page.evaluate(() => (document.documentElement.style.fontSize = ''));
    await page.emulateMedia({ forcedColors: 'active' });
    const forced = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'rgb(1, 2, 3)';
      document.body.appendChild(probe);
      const repainted = getComputedStyle(probe).color !== 'rgb(1, 2, 3)';
      probe.remove();
      return repainted;
    });
    test.skip(!forced, 'forced colors are not emulated by this browser');
    const look = (id: string) =>
      host(page, id).evaluate((el) => {
        const read: Record<string, string> = {};
        for (const selector of ['.field > .container', '.input', '.edge']) {
          const style = getComputedStyle(el.shadowRoot!.querySelector(selector)!);
          for (const name of ['color', 'background-color', 'border-top-color', 'border-top-style', 'border-top-width', 'outline-color', 'outline-style', 'display', 'caret-color', 'font-family', 'font-size', 'line-height']) read[`${selector} ${name}`] = style.getPropertyValue(name);
        }
        return read;
      });
    const [own, prose] = [await look('stacked-code-multiline'), await look('as-text')];
    const differing = Object.keys(own).filter((name) => own[name] !== prose[name]);
    expect(differing).toEqual(['.input font-family']);
    expect(own['.field > .container border-top-style']).toBe('solid');
    await input(page, 'stacked-code-multiline').focus();
    await expect.poll(() => css(part(page, 'stacked-code-multiline', '.field > .container'), 'outline-style')).toBe('solid');
  });
});

test.describe('the input and the Field that frames it', () => {
  test('TXI-62: the input says to the Field that frames it that it draws the label while its variant floats one, how far its text stands from its edges, and — with TXI-30 — its entry error; it says so again when any of them changes, and takes from the Field its name, whether the label is hidden and the asterisk; a frame that answers none of the new values, and no frame at all, leave it drawn as a bare input', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, reducedMotion: true, fixtures: [] });
    await frame(page, 'pair', { label: 'Email', supportingText: 'We never share your address.' }, { value: 'ada@example.com' });
    const labelRow = row(page, 'pair', '.label-row');
    const starts = async () => (await bounds(row(page, 'pair', '.supporting-text'))).x - (await bounds(host(page, 'pair'))).x;
    const ends = async () => {
      const [box, help] = [await bounds(host(page, 'pair')), await bounds(row(page, 'pair', '.supporting'))];
      return Number.parseFloat(await css(row(page, 'pair', '.supporting'), 'padding-inline-end')) + (box.x + box.width - (help.x + help.width));
    };
    const textAt = async () => (await bounds(input(page, 'pair'))).x - (await bounds(host(page, 'pair'))).x;
    // Stacked: the Field draws the label row, and the input no label.
    await expect(labelRow).toHaveCount(1);
    await expect(host(page, 'pair').locator('label')).toHaveCount(0);
    // The supporting row starts where the text starts — the inline padding — and ends at the end padding (FLD-26).
    const pad = await resolveToken(page, T('container-padding-inline-medium'));
    expect(await starts()).toBeCloseTo(pad, 1);
    expect(await starts()).toBeCloseTo(await textAt(), 1);
    expect(await ends()).toBeCloseTo(pad, 1);
    // A leading icon comes: the start moves to the text, past the icon and its gap. A trailing one: the end padding is the icon's.
    const padIcon = await resolveToken(page, T('container-padding-inline-with-icon-medium'));
    await host(page, 'pair').evaluate((el) => el.insertAdjacentHTML('beforeend', '<span slot="leading-icon">mail</span>'));
    await expect.poll(starts).toBeCloseTo(padIcon + (await resolveToken(page, T('icon-size-medium'))) + (await resolveToken(page, T('container-gap-medium'))), 1);
    expect(await starts()).toBeCloseTo(await textAt(), 1);
    await host(page, 'pair').evaluate((el) => el.insertAdjacentHTML('beforeend', '<span slot="trailing-icon">close</span>'));
    await expect.poll(ends).toBeCloseTo(padIcon, 1);
    // The size changes: the row follows.
    await host(page, 'pair').evaluate((el) => ((el as any).size = 'large'));
    await expect.poll(async () => Math.abs((await starts()) - (await textAt()))).toBeLessThan(0.5);
    // The variant floats a label: the Field's row goes, and the same name floats in the input (FLD-25).
    await host(page, 'pair').evaluate((el) => ((el as any).variant = 'outlined'));
    await expect(labelRow).toHaveCount(0);
    await expect(part(page, 'pair', 'label.label')).toHaveText('Email');
    await expect(host(page, 'pair').getByRole('textbox', { name: 'Email', exact: true })).toHaveCount(1);
    // The Field's label is hidden: the input draws none either, and keeps the name.
    await host(page, 'pair').evaluate((el) => ((el.parentElement as any).labelHidden = true));
    await expect(part(page, 'pair', 'label.label')).toHaveCount(0);
    await expect(host(page, 'pair').getByRole('textbox', { name: 'Email', exact: true })).toHaveCount(1);
    await host(page, 'pair').evaluate((el) => ((el.parentElement as any).labelHidden = false));
    // Required: the asterisk the Field gives, after the floating label.
    await host(page, 'pair').evaluate((el) => Object.assign(el.parentElement as any, { required: true, requiredText: 'Required' }));
    await expect(part(page, 'pair', 'label.label .asterisk')).toHaveCount(1);
    // Back to stacked: the Field's row again, with its own mark, and no label in the input.
    await host(page, 'pair').evaluate((el) => ((el as any).variant = 'stacked'));
    await expect(labelRow).toHaveCount(1);
    await expect(row(page, 'pair', '.label-row tanrei-tag')).toHaveCount(1);
    await expect(host(page, 'pair').locator('label')).toHaveCount(0);
    // A frame of an earlier day answers with the name, the description and the three states alone: the input floats
    // that name with no asterisk, as a bare one does, and is required as it says.
    await page.evaluate(() => {
      const old = document.createElement('div');
      old.id = 'old-frame';
      old.addEventListener('tanrei-field-connect', (event) => {
        event.stopPropagation();
        (event as CustomEvent).detail.update({ label: 'An older frame', description: 'Its help.', invalid: false, required: true, requiredText: 'Required', disabled: false });
      });
      old.innerHTML = '<tanrei-text-input variant="outlined"></tanrei-text-input>';
      document.querySelector('main')!.append(old);
    });
    const older = page.locator('#old-frame tanrei-text-input');
    await expect(older.locator('label.label')).toHaveText('An older frame');
    await expect(older.locator('.asterisk')).toHaveCount(0);
    await expect(older.getByRole('textbox', { name: 'An older frame', exact: true })).toHaveAccessibleDescription('Its help.');
    await expect(older.locator('.input')).toHaveJSProperty('required', true);
  });

  test('TXI-63: the input draws no label row, no requirement tag, no help, no error text and no count; bare it is complete; and it is a block exactly as wide as its place, framed and bare alike — never the platform’s default width, never the width of what it holds — and exactly as tall as its container', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [] });
    await page.evaluate(() =>
      document.querySelector('main')!.insertAdjacentHTML(
        'beforeend',
        `<div style="inline-size: 420px"><tanrei-text-input id="bare" label="Filter tokens" placeholder="Filter"></tanrei-text-input></div>
         <div style="inline-size: 137px"><tanrei-text-input id="narrow" label="Filter" value="a value much wider than the place it stands in"></tanrei-text-input></div>
         <div style="inline-size: 137px"><tanrei-text-input id="code" label="Layer" type="code" multiline no-wrap value="a line of code much wider than the place it stands in"></tanrei-text-input></div>
         <div style="display: flex; align-items: center; inline-size: 500px"><span id="beside" style="flex: none; inline-size: 120px">Beside</span><tanrei-text-input id="in-a-row" label="Beside" style="flex: 1"></tanrei-text-input></div>
         <tanrei-field label="Email" supporting-text="Help." required required-text="Required" count-text="0/40" style="inline-size: 300px"><tanrei-text-input id="framed" counter maxlength="40"></tanrei-text-input></tanrei-field>
         <tanrei-field label="Email" style="inline-size: 300px"><tanrei-text-input id="framed-outlined" variant="outlined"></tanrei-text-input></tanrei-field>`,
      ),
    );
    const one = (id: string) => page.locator(`#${id}`);
    await expect(one('framed-outlined').locator('label.label')).toHaveText('Email');
    for (const [id, width] of [['bare', 420], ['narrow', 137], ['code', 137], ['in-a-row', 380], ['framed', 300], ['framed-outlined', 300]] as const) {
      expect(await css(one(id), 'display'), id).toBe('block');
      expect((await bounds(one(id))).width, `${id}: as wide as its place`).toBeCloseTo(width, 1);
      expect((await bounds(one(id).locator('.field > .container'))).width, `${id}: the box fills it`).toBeCloseTo(width, 1);
      // Exactly as tall as its container.
      expect((await bounds(one(id))).height, `${id}: as tall as its container`).toBeCloseTo((await bounds(one(id).locator('.field > .container'))).height, 1);
      // No row of its own, in any look.
      expect(await one(id).evaluate((el) => el.shadowRoot!.querySelectorAll('.label-row, .above, tanrei-tag, .chip, .supporting, .supporting-text, .counter, [name="label-icon"]').length), id).toBe(0);
    }
    expect((await bounds(one('bare'))).height).toBe(await resolveToken(page, T('stacked-container-height-medium')));
    // Bare it is complete: named by its own label, with its placeholder, typed in, and heard.
    await expect(one('bare').getByRole('textbox', { name: 'Filter tokens', exact: true })).toHaveCount(1);
    await listen(one('bare'));
    await one('bare').locator('.input').click();
    await page.keyboard.type('ab');
    expect(await events(page)).toEqual(['input:a', 'input:ab']);
    // What a person gives it with the resize handle is the one width of its own (TXI-39): nothing else writes one.
    expect(await one('bare').evaluate((el) => (el as HTMLElement).style.inlineSize)).toBe('');
  });

  // ── A place for what was entered already (TXI-64 to TXI-66) ──────────────────────────────────────
  /** A text input 280 wide whose entries slot holds one small input chip for each label, as a product writes them. */
  const withEntries = (id: string, labels: string[], attributes = '') =>
    `<div style="inline-size: 280px; margin-block: 24px"><tanrei-text-input id="${id}" label="Recipients" ${attributes}>${labels.map((label) => `<tanrei-chip slot="entries" kind="input" size="small" label="${label}" remove-label="Remove ${label}"></tanrei-chip>`).join('')}</tanrei-text-input></div>`;
  const entriesPage = async (page: P, markup: string) => {
    await mountFixtures(page, spec, { fixtures: [] });
    await page.evaluate((html) => document.querySelector('main')!.insertAdjacentHTML('beforeend', html), markup);
    await page.waitForFunction(() => !!customElements.get('tanrei-chip'));
    await page.evaluate(async () => {
      for (let round = 0; round < 3; round++) await Promise.all([...document.querySelectorAll('tanrei-text-input, tanrei-chip')].map((el) => (el as unknown as { updateComplete: Promise<unknown> }).updateComplete));
    });
  };

  test('TXI-64: content of the entries slot and the typing part stand inside the container in lines from the start edge — entries.gap between two items, entries.row-gap between two lines, every item centred on its line, an item that does not fit going whole to the next line and never wider than one; the typing part takes what is left of the last line while that is entries.typing-min-width at least, and a line of its own otherwise; the container keeps its height for one line and grows by whole lines', async ({ page }) => {
    const long = 'the-team-that-keeps-the-design-system-and-its-five-platforms-in-step@subdomain.of.a.long.example.org';
    await entriesPage(
      page,
      withEntries('none', []) + withEntries('one', ['ada@example.com']) + withEntries('two', ['ada', 'grace']) + withEntries('wrapped', ['ada@example.com', 'grace.hopper@example.org']) + withEntries('long', ['ada', long]) + withEntries('rtl', ['ada', 'grace'], 'dir="rtl"'),
    );
    const one = (id: string) => page.locator(`#${id}`);
    const [gap, rowGap, least, height] = [await resolveToken(page, T('entries-gap')), await resolveToken(page, T('entries-row-gap')), await resolveToken(page, T('entries-typing-min-width')), await resolveToken(page, T('stacked-container-height-medium'))];
    const chipsOf = async (id: string) => Promise.all((await one(id).locator('tanrei-chip').all()).map((each) => bounds(each)));
    const body = async (id: string) => {
      const box = await bounds(one(id).locator('.body'));
      const pad = await one(id).locator('.body').evaluate((el) => [parseFloat(getComputedStyle(el).paddingTop), parseFloat(getComputedStyle(el).paddingBottom)]);
      return { ...box, top: box.y + pad[0]!, bottom: box.y + box.height - pad[1]! };
    };
    // One line: the container keeps the height of its size, the item is centred on the line and stands at the text's start.
    expect((await bounds(one('none').locator('div.container'))).height).toBe(height);
    expect((await bounds(one('one').locator('div.container'))).height, 'one line keeps the height').toBe(height);
    const [chip] = await chipsOf('one');
    const container = await bounds(one('one').locator('div.container'));
    expect(chip!.y + chip!.height / 2).toBeCloseTo(container.y + container.height / 2, 1);
    expect(chip!.x).toBeCloseTo((await body('one')).x, 1);
    // The typing part follows the last item on its line, entries.gap after it, and takes what is left.
    const typed = await bounds(one('one').locator('input.input'));
    expect(typed.x).toBeCloseTo(chip!.x + chip!.width + gap, 1);
    expect(typed.x + typed.width).toBeCloseTo((await body('one')).x + (await body('one')).width, 1);
    expect(typed.width).toBeGreaterThanOrEqual(least);
    // Two items on a line: entries.gap apart.
    const two = await chipsOf('two');
    expect(two[1]!.x).toBeCloseTo(two[0]!.x + two[0]!.width + gap, 1);
    expect(two[1]!.y).toBe(two[0]!.y);
    // An item that does not fit goes whole to the next line, entries.row-gap below; the typing part, left with less
    // than entries.typing-min-width, takes a line of its own; the container grows by whole lines.
    const wrapped = await chipsOf('wrapped');
    const inner = await body('wrapped');
    expect(wrapped[1]!.y).toBeCloseTo(wrapped[0]!.y + wrapped[0]!.height + rowGap, 1);
    expect(wrapped[1]!.x).toBeCloseTo(inner.x, 1);
    const last = wrapped.at(-1)!;
    const typedBelow = await bounds(one('wrapped').locator('input.input'));
    const left = inner.x + inner.width - (last.x + last.width + gap);
    expect(left, 'this fixture leaves the typing part too little beside its last item').toBeLessThan(least);
    expect(typedBelow.y).toBeGreaterThanOrEqual(last.y + last.height);
    expect(typedBelow.x).toBeCloseTo(inner.x, 1);
    expect(typedBelow.width).toBeCloseTo(inner.width, 1);
    const lines = 1 + new Set(wrapped.map((each) => each.y)).size;
    expect((await bounds(one('wrapped').locator('div.container'))).height, 'whole lines, the paddings unchanged').toBeCloseTo(height + (lines - 1) * (wrapped[0]!.height + rowGap), 1);
    // Never wider than a line: an item that is wider is as wide as the line, on a line of its own.
    const [short, wide] = await chipsOf('long');
    const line = await body('long');
    expect(wide!.width).toBeCloseTo(line.width, 1);
    expect(wide!.y).toBeGreaterThan(short!.y);
    // Right-to-left: the lines start at the right.
    const [first, second] = await chipsOf('rtl');
    const mirrored = await body('rtl');
    expect(first!.x + first!.width).toBeCloseTo(mirrored.x + mirrored.width, 1);
    expect(second!.x + second!.width).toBeCloseTo(first!.x - gap, 1);
    // The slot's box is none: its part draws nothing.
    expect(await css(one('one').locator('[part~="entries"]'), 'display')).toBe('contents');
  });

  test('TXI-64: read-only with no typed text the typing part takes no room on a line and no line of its own — the entries end the content — and stays focusable; disabled, it keeps its room, so the field keeps its enabled shape; typed text brings the room back', async ({ page }) => {
    const labels = ['ada@example.com', 'grace.hopper@example.org'];
    await entriesPage(page, withEntries('open', labels) + withEntries('read', labels, 'readonly') + withEntries('off', labels, 'disabled'));
    const one = (id: string) => page.locator(`#${id}`);
    const heightOf = async (id: string) => (await bounds(one(id).locator('div.container'))).height;
    const chips = await Promise.all((await one('read').locator('tanrei-chip').all()).map((each) => bounds(each)));
    // Enabled, the typing part takes a line of its own below the last item (TXI-64's verify); read-only, it takes none:
    // the last line of chips stands as far from the container's bottom as the first stands from its top.
    const typing = await bounds(one('open').locator('input.input'));
    const openChips = await Promise.all((await one('open').locator('tanrei-chip').all()).map((each) => bounds(each)));
    expect(typing.y).toBeGreaterThanOrEqual(openChips.at(-1)!.y + openChips.at(-1)!.height);
    const box = await bounds(one('read').locator('div.container'));
    expect(box.y + box.height - (chips.at(-1)!.y + chips.at(-1)!.height)).toBeCloseTo(chips[0]!.y - box.y, 1);
    expect(await heightOf('read')).toBeLessThan(await heightOf('open'));
    await expect(one('read').locator('.field')).toHaveAttribute('data-no-typing', '');
    expect((await bounds(one('read').locator('input.input'))).width).toBe(0);
    // Still the text input: focusable, and exposed with its name.
    await one('read').locator('input.input').focus();
    expect(await page.evaluate(() => (document.activeElement as HTMLElement | null)?.id)).toBe('read');
    await expect(one('read').getByRole('textbox', { name: 'Recipients' })).toHaveAttribute('readonly', '');
    // Disabled keeps the enabled shape: the field does not change height when it is enabled again.
    expect(await heightOf('off')).toBeCloseTo(await heightOf('open'), 1);
    await expect(one('off').locator('.field')).not.toHaveAttribute('data-no-typing', /.*/);
    // Text the product put in the typing part is shown: its room comes back.
    await one('read').evaluate((el: any) => (el.value = 'alan@'));
    await expect(one('read').locator('.field')).not.toHaveAttribute('data-no-typing', /.*/);
    await expect.poll(() => heightOf('read')).toBeCloseTo(await heightOf('open'), 1);
  });

  test('TXI-65: while the entries slot holds content the input is not empty for its label — a filled and an outlined input float it — and its placeholder is not shown; with the slot empty again the label rests and the placeholder is back', async ({ page }) => {
    await entriesPage(page, withEntries('filled', ['ada'], 'variant="filled" placeholder="name@example.com"') + withEntries('outlined', ['ada'], 'variant="outlined" placeholder="name@example.com"') + withEntries('stacked', ['ada'], 'placeholder="name@example.com"') + withEntries('empty', [], 'variant="filled" placeholder="name@example.com"'));
    const one = (id: string) => page.locator(`#${id}`);
    await expect(one('empty').locator('.field')).not.toHaveAttribute('data-has-value', /.*/);
    const resting = (await bounds(one('empty').locator('label.label'))).y - (await bounds(one('empty').locator('div.container'))).y;
    for (const id of ['filled', 'outlined']) {
      await expect(one(id).locator('.field'), id).toHaveAttribute('data-has-value', '');
      const floated = (await bounds(one(id).locator('label.label'))).y - (await bounds(one(id).locator('div.container'))).y;
      expect(floated, `${id}: the label floats`).toBeLessThan(resting);
      expect(await one(id).locator('input.input').evaluate((el: HTMLInputElement) => el.placeholder), id).toBe('');
    }
    expect(await one('stacked').locator('input.input').evaluate((el: HTMLInputElement) => el.placeholder)).toBe('');
    // The product's own `placeholder` is untouched, and shown again when the slot is empty.
    await expect(one('filled')).toHaveJSProperty('placeholder', 'name@example.com');
    await one('filled').evaluate((el) => el.querySelector('tanrei-chip')!.remove());
    await expect(one('filled').locator('.field')).not.toHaveAttribute('data-has-value', /.*/);
    await expect.poll(() => one('filled').locator('input.input').evaluate((el: HTMLInputElement) => el.placeholder)).toBe('name@example.com');
  });

  // An input whose entries slot holds content when it appears floats its label from its first frame: the label is not
  // drawn over the chips and then moved up (as a page that is already drawn shows a Field, or a Chip field, of entries).
  for (const [name, ids] of [
    ['field', ['entries-email-filled', 'entries-email-outlined']],
    ['chip-field', ['email-filled', 'email-outlined']],
  ] as const) {
    for (const id of ids) {
      test(`TXI-65: the ${name} fixture ${id} floats its label over its entries from its first frame, with nothing moving into place`, async ({ page }) => {
        expectFirstFrameAtRest(await appearingFixture(page, loadSpec(name), id));
      });
    }
  }

  test('TXI-67: beside a value that is always left-to-right — one line of email, url, tel, number or password — the prefix, the value and the suffix are one run of writing, in that order along the direction of the affixes’ first strong character and left-to-right where they have none, in every layout direction and never from the value; the value, and an empty field’s placeholder, stand against the prefix where there is one and at the field’s start edge where there is none, and the icons, the label and the paddings follow the layout; beside every other value the prefix stays at the field’s start edge and the suffix at its end edge', async ({ page }) => {
    const rtl = (id: string, props: Fixture['props'], content?: string): Fixture => ({ ...fixture(id, { variant: 'stacked', label: 'Label', ...props }, content), direction: 'rtl' });
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        ...only(/^stacked-affixes-rtl$/, /^stacked-url-prefix-rtl$/, /^stacked-email-suffix-rtl$/, /^stacked-number-unit-own-script-rtl$/, /^stacked-text-suffix-rtl$/),
        rtl('tel', { type: 'tel', value: '555 0100', prefixText: '+1' }),
        rtl('secret', { type: 'password', value: 'abc', suffixText: 'PIN' }),
        rtl('marked', { type: 'number', value: '120', suffixText: '‏USD' }),
        rtl('icons', { type: 'url', value: 'example.com', prefixText: 'https://' }, 'leading-icon=search trailing-icon=close'),
        rtl('search', { type: 'search', value: 'x', prefixText: 'in:', suffixText: 'kg' }),
        rtl('lines', { type: 'email', multiline: true, value: 'a', prefixText: 'To', suffixText: 'cc' }),
        fixture('hebrew-unit', { variant: 'stacked', type: 'number', label: 'Weight', value: '12', suffixText: 'ק״ג' }, 'leading-icon=search'),
      ],
    });
    const drawn = (id: string) =>
      host(page, id).evaluate((el) => {
        const root = el.shadowRoot!;
        const rect = (selector: string) => {
          const r = root.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
          return r && r.width > 0 ? { left: r.left, right: r.right } : null;
        };
        return {
          run: root.querySelector('.body')!.getAttribute('dir'),
          layout: getComputedStyle(el).direction,
          container: rect('.field > .container')!,
          body: rect('.body')!,
          prefix: rect('.prefix'),
          input: rect('.input')!,
          suffix: rect('.suffix'),
          leading: rect('.leading'),
          trailing: rect('.trailing'),
          edge: getComputedStyle(root.querySelector('.input')!).textAlign,
        };
      });
    const affix = await resolveToken(page, T('affix-gap'));
    const pad = await resolveToken(page, T('container-padding-inline-medium'));
    // The five types, and the run their affixes make. Written order along the run, affix.gap from the value; the line
    // from the start padding to the end padding; the value against the prefix, or at the field's start edge, the right.
    const RUNS: Record<string, 'ltr' | 'rtl'> = { 'stacked-affixes-rtl': 'ltr', 'stacked-url-prefix-rtl': 'ltr', 'stacked-email-suffix-rtl': 'ltr', 'stacked-number-unit-own-script-rtl': 'rtl', tel: 'ltr', secret: 'ltr', marked: 'rtl' };
    for (const [id, run] of Object.entries(RUNS)) {
      const d = await drawn(id);
      expect(d.run, `${id}: the run`).toBe(run);
      const [first, last] = run === 'ltr' ? [d.prefix, d.suffix] : [d.suffix, d.prefix];
      expect(!!first || !!last, `${id}: an affix is drawn`).toBe(true);
      if (first) expect(d.input.left - first.right, `${id}: affix.gap after what stands at the left`).toBeCloseTo(affix, 1);
      if (last) expect(last.left - d.input.right, `${id}: affix.gap before what stands at the right`).toBeCloseTo(affix, 1);
      expect(d.container.right - (last ?? d.input).right, `${id}: the line ends at the start padding, the right`).toBeCloseTo(pad, 1);
      expect((first ?? d.input).left - d.container.left, `${id}: and begins at the end padding`).toBeCloseTo(pad, 1);
      // Beside a prefix the value stands against it, at the start of the run — "https://example.com" reads as one string;
      // without one, at the field's start edge, the right.
      expect(d.edge, `${id}: ${d.prefix ? 'the value against the prefix' : 'the value at the field’s start edge'}`).toBe(d.prefix && run === 'ltr' ? 'left' : 'right');
    }
    // An empty field's placeholder stands where its value would.
    expect(await host(page, 'icons').evaluate(async (el: HTMLElement & { value: string; placeholder: string; updateComplete: Promise<unknown> }) => {
      Object.assign(el, { value: '', placeholder: 'example.com' });
      await el.updateComplete;
      const input = el.shadowRoot!.querySelector('.input')!;
      const aligned = [getComputedStyle(input).textAlign, getComputedStyle(input, '::placeholder').textAlign];
      Object.assign(el, { value: 'example.com', placeholder: '' });
      await el.updateComplete;
      return aligned;
    })).toEqual(['left', 'left']);
    // The icons keep the layout's sides, paddings and gap around a row that runs against it.
    const gap = await resolveToken(page, T('container-gap-medium'));
    const padIcon = await resolveToken(page, T('container-padding-inline-with-icon-medium'));
    const icons = await drawn('icons');
    expect(icons.run).toBe('ltr');
    expect(icons.container.right - icons.leading!.right, 'the leading icon at the right edge').toBeCloseTo(padIcon, 1);
    expect(icons.trailing!.left - icons.container.left, 'the trailing icon at the left edge').toBeCloseTo(padIcon, 1);
    expect(icons.prefix!.left - icons.trailing!.right, 'the gap to the trailing icon, at the row’s left').toBeCloseTo(gap, 1);
    expect(icons.leading!.left - icons.input.right, 'the gap to the leading icon, at the row’s right').toBeCloseTo(gap, 1);
    expect(icons.input.left - icons.prefix!.right).toBeCloseTo(affix, 1);
    // In a left-to-right layout too: a unit in Hebrew letters stands at the value's left, after the leading icon.
    const hebrew = await drawn('hebrew-unit');
    expect([hebrew.layout, hebrew.run]).toEqual(['ltr', 'rtl']);
    expect(['left', 'start'], `the value at the field’s start edge, the left (${hebrew.edge}: the native element is left-to-right)`).toContain(hebrew.edge);
    expect(hebrew.suffix!.left - hebrew.leading!.right, 'the gap to the leading icon, at the row’s left').toBeCloseTo(gap, 1);
    expect(hebrew.input.left - hebrew.suffix!.right).toBeCloseTo(affix, 1);
    expect(hebrew.container.right - hebrew.input.right, 'the line to the end padding').toBeCloseTo(pad, 1);
    // Every other value is the person's: the row is the layout's, the prefix at the start edge and the suffix at the end edge.
    for (const id of ['stacked-text-suffix-rtl', 'search', 'lines']) {
      const d = await drawn(id);
      expect(d.run, `${id}: no direction of its own`).toBeNull();
      if (d.prefix) expect(d.prefix.left, `${id}: the prefix at the right`).toBeGreaterThanOrEqual(d.input.right - 0.5);
      expect(d.suffix!.right, `${id}: the suffix at the left`).toBeLessThanOrEqual(d.input.left + 0.5);
    }
    // Never from the value: letters of another direction typed beside "$" and "USD" move nothing…
    const set = (id: string, props: Record<string, unknown>) =>
      host(page, id).evaluate(async (el, p) => {
        Object.assign(el, p);
        await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
      }, props);
    await set('stacked-affixes-rtl', { value: 'كغم' });
    expect((await drawn('stacked-affixes-rtl')).run).toBe('ltr');
    // …the two props alone do, the prefix asked first…
    await set('stacked-affixes-rtl', { suffixText: 'ريال' });
    expect((await drawn('stacked-affixes-rtl')).run, 'a prefix of signs has no direction: the suffix decides').toBe('rtl');
    await set('stacked-affixes-rtl', { prefixText: 'max' });
    expect((await drawn('stacked-affixes-rtl')).run, 'the prefix is written first').toBe('ltr');
    // …and the type, on a live element: the same affix beside an address joins its run, and leaves it again.
    await set('stacked-text-suffix-rtl', { type: 'url' });
    const address = await drawn('stacked-text-suffix-rtl');
    expect(address.run).toBe('ltr');
    expect(address.suffix!.left - address.input.right, 'the suffix after the value, from the left').toBeCloseTo(affix, 1);
    await set('stacked-text-suffix-rtl', { type: 'text' });
    expect((await drawn('stacked-text-suffix-rtl')).run).toBeNull();
    // A row that holds entries is lines from the field's start edge (TXI-64): the layout's, beside an email too.
    await page.evaluate((html) => document.querySelector('main')!.insertAdjacentHTML('beforeend', html), withEntries('held', ['ada'], 'dir="rtl" type="email" suffix-text="@example.com"'));
    await page.waitForFunction(() => !!customElements.get('tanrei-chip'));
    await page.evaluate(async () => {
      for (let round = 0; round < 3; round++) await Promise.all([...document.querySelectorAll('tanrei-text-input, tanrei-chip')].map((el) => (el as unknown as { updateComplete: Promise<unknown> }).updateComplete));
    });
    const held = await page.locator('#held').evaluate((el) => {
      const root = el.shadowRoot!;
      return { run: root.querySelector('.body')!.getAttribute('dir'), chip: el.querySelector('tanrei-chip')!.getBoundingClientRect().right, input: root.querySelector('.input')!.getBoundingClientRect().right };
    });
    expect(held.run, 'entries: no direction of its own').toBeNull();
    expect(held.chip, 'the entry at the start edge, the right').toBeGreaterThan(held.input);
  });

  test('TXI-66: a press on the container outside every item of the entries slot focuses the typing part, in the gap between two items too; the items get no role, no focus order and no key from the input — Tab reaches each as the item itself decides, and a press on one is its own', async ({ page }) => {
    await entriesPage(page, withEntries('field', ['ada@example.com', 'grace.hopper@example.org']) + '<button id="after">After</button>');
    const one = page.locator('#field');
    const chipBoxes = await Promise.all((await one.locator('tanrei-chip').all()).map((each) => bounds(each)));
    const container = await bounds(one.locator('div.container'));
    // Beside the first item, on its line; and in the corner of the box.
    for (const [x, y] of [[container.x + container.width - 6, chipBoxes[0]!.y + chipBoxes[0]!.height / 2], [container.x + 3, container.y + container.height - 3]] as const) {
      await page.locator('#after').focus();
      await page.mouse.click(x, y);
      await expect(one.locator('input.input')).toBeFocused();
    }
    // No role and no tabindex is given to an item, and the slot has none.
    expect(await one.evaluate((el) => [...el.querySelectorAll('tanrei-chip')].map((chip) => [chip.getAttribute('role'), chip.getAttribute('tabindex')]))).toEqual([[null, null], [null, null]]);
    expect(await one.locator('[part~="entries"]').evaluate((el) => [el.getAttribute('role'), el.getAttribute('tabindex')])).toEqual([null, null]);
    // Tab reaches each item as the item decides: an input chip is one stop (its remove action is not), then the typing part.
    await page.locator('#after').focus();
    const stops: string[] = [];
    for (let press = 0; press < 3; press++) {
      await tab(page, { back: true });
      stops.unshift(await one.evaluate((el) => {
        const active = document.activeElement;
        if (active !== el && !el.contains(active)) return 'outside';
        const inside = el.shadowRoot!.activeElement;
        if (inside) return 'typing';
        return `${(active as HTMLElement & { label: string }).label}:${active!.shadowRoot!.activeElement!.className.split(' ')[0]}`;
      }));
    }
    expect(stops).toEqual(['ada@example.com:container', 'grace.hopper@example.org:container', 'typing']);
    // A key on an item is the item's: Backspace asks for its removal and the input does nothing; a press on it is its own.
    await one.evaluate((el) => {
      (window as any).asked = [] as string[];
      el.addEventListener('remove', (event) => (window as any).asked.push((event.target as HTMLElement & { label: string }).label));
      el.addEventListener('click', (event) => (window as any).asked.push(`click ${(event.target as HTMLElement & { label: string }).label}`));
    });
    await one.locator('tanrei-chip').first().evaluate((el: HTMLElement) => el.focus());
    await page.keyboard.press('Backspace');
    await one.locator('tanrei-chip').nth(1).locator('.label').click();
    expect(await page.evaluate(() => (window as any).asked)).toEqual(['ada@example.com', 'click grace.hopper@example.org']);
    await expect(one.locator('tanrei-chip')).toHaveCount(2);
    await expect(one.locator('input.input')).not.toBeFocused();
  });
});

test.describe('values a design system adds', () => {
  const layer = {
    id: 'wide-fields',
    name: 'Wide fields',
    extends: 'tanrei',
    description: 'A test layer that adds a size and a look to the input box, which the text input reads (TXI-68).',
    vocabulary: {
      'tanrei.comp.input-box.size.xl': { from: 'large', scale: 1.5, rationale: 'A hero search.' },
      'tanrei.comp.input-box.variant.underlined': { from: 'filled', rationale: 'A line only.' },
    },
    tokens: { 'tanrei.comp.input-box.underlined.container.color': { $value: '{tanrei.sys.color.surface}' } },
  };
  let layerCss: Promise<string> | undefined;
  const sheet = () =>
    (layerCss ??= (async () => {
      const { resolveSystem } = await import('@tanrei/tokens-build/resolve');
      const { emitCss } = await import('@tanrei/tokens-build/emit/css');
      return emitCss(await (await resolveSystem({ layers: [layer] })).model(), { scope: layer.id }) as string;
    })());
  const fixtures = [
    fixture('xl', { size: 'xl', label: 'A', labelHidden: true }),
    fixture('underlined', { variant: 'underlined', label: 'B' }),
    fixture('unknown-size', { size: 'colossal', label: 'C' }),
    fixture('unknown-variant', { variant: 'sparkly', label: 'D' }),
    fixture('unknown-type', { type: 'color', label: 'E' }),
    fixture('plain', { label: 'F' }),
  ];
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await sheet();
  });

  test('a size and a variant a layer adds render from their tokens, with no report', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { system: layer.id, systemCss: await sheet(), fixtures });
    expect((await bounds(part(page, 'xl', '.field > .container'))).height).toBe(await resolveToken(page, T('container-height-xl')));
    expect(await css(part(page, 'underlined', '.field > .container'), 'background-color')).toBe(await resolveColor(page, '--tanrei-sys-color-surface'));
    // TXI-9: a variant the input does not know by name is laid out as stacked: no label of its own — the name it is
    // given still names it — and the inner line as its edge.
    await expect(part(page, 'underlined', 'label')).toHaveCount(0);
    await expect(host(page, 'underlined').getByRole('textbox', { name: 'B', exact: true })).toHaveCount(1);
    expect(await host(page, 'underlined').evaluate((el) => (el as any).variant)).toBe('underlined');
    await expect(part(page, 'underlined', '.edge')).toHaveCount(1);
    await expect(part(page, 'underlined', '.indicator')).toHaveCount(0);
    expect(seen.filter((w) => /size "xl"|variant "underlined"/.test(w))).toEqual([]);
  });

  test('TXI-9: a size or variant the active design system does not have renders as the default (stacked), an unknown type behaves as text, and a debug build reports each', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures });
    expect((await bounds(part(page, 'unknown-size', '.field > .container'))).height).toBe((await bounds(part(page, 'plain', '.field > .container'))).height);
    expect(await drawn(page, 'unknown-variant')).toEqual(await drawn(page, 'plain'));
    await expect(part(page, 'unknown-variant', 'label')).toHaveCount(0);
    await expect(host(page, 'unknown-variant').getByRole('textbox', { name: 'D', exact: true })).toHaveCount(1);
    expect(await input(page, 'unknown-type').getAttribute('type')).toBe('text');
    await expect.poll(() => seen.filter((w) => w.includes('TXI-9')).length).toBe(5); // xl, underlined, colossal, sparkly, color
    expect(seen).toEqual(expect.arrayContaining([expect.stringMatching(/type "color" is not a type of the text input; it behaves as "text" \(TXI-9\)/)]));
  });
});

test.describe('the box is the one set every input box is drawn from', () => {
  test('TXI-68: the text input holds no token of the box under its own name — its own family is a segment, the code face, the entries place and the motion of a height, in the default system and in each preset', async () => {
    const dist = new URL('../../../dist/', import.meta.url);
    const sheets = ['tokens.css', 'systems/m3-like.css', 'systems/m3-expressive-like.css', 'systems/cupertino.css'].map((file) => fs.readFileSync(new URL(file, dist), 'utf8'));
    expect(inputBoxCopies(sheets, 'text-input')).toEqual([]);
    const mine = [...new Set([...sheets[0]!.matchAll(/--tanrei-comp-text-input-([a-z0-9-]+)(?=:)/g)].map((m) => m[1]!))];
    expect(mine.filter((name) => !/^(entries-|motion-resize-|code-|segment-)/.test(name))).toEqual([]);
    expect(mine.length).toBeGreaterThan(10);
  });

  test('TXI-68: a custom property of the box set on one text input changes that one alone; set on an ancestor, every text input in it', async ({ page }) => {
    await mountHtml(page, '<tanrei-text-input label="Name"></tanrei-text-input>');
    const { rest, one, both } = await inputBoxSetApart(page, 'tanrei-text-input');
    expect(rest[0], 'the box has corners to lose').toBeGreaterThan(0);
    expect(rest[1]).toBe(rest[0]);
    expect(one, 'the one it is set on, and not its neighbour').toEqual([0, rest[1]]);
    expect(both, 'both, from their parent').toEqual([0, 0]);
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    // (Ninety fixtures, twice: nine seconds alone in Firefox, and past the default thirty beside another worker.)
    test.setTimeout(120_000);
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true });
      await page.waitForTimeout(300);
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
  });

  test('every fixture is one named text box (a search box for search) — a date or time field one group named by its label, holding its segments — exposing its conditions', async ({ page }) => {
    await mountFixtures(page, spec);
    for (const f of spec.fixtures) {
      if (['date', 'time', 'date-time'].includes(String(f.props.type))) {
        const group = host(page, f.id).getByRole('group', { name: String(f.props.label), exact: true });
        await expect(group, f.id).toHaveCount(1);
        await expect(host(page, f.id).getByRole('textbox'), f.id).toHaveCount(0);
        expect(await group.getByRole('spinbutton').count(), f.id).toBeGreaterThanOrEqual(2);
        continue;
      }
      const role = f.props.type === 'search' ? 'searchbox' : 'textbox';
      await expect(host(page, f.id).getByRole(role, { name: String(f.props.label), exact: true }), f.id).toHaveCount(1);
    }
    await expect(host(page, 'outlined-error').getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    // The drawn label is not read a second time.
    await expect(part(page, 'outlined-filled', '.label')).toHaveAttribute('aria-hidden', 'true');
  });

  test('keyboard: Tab moves through the enabled fields in order, Shift+Tab back', async ({ page }) => {
    await mountFixtures(page, spec);
    const enabled = spec.fixtures.filter((f) => !f.props.disabled).map((f) => f.id);
    await tabTo(page, host(page, enabled[0]));
    for (const id of enabled.slice(1, 5)) {
      await tab(page);
      await expect(input(page, id), id).toBeFocused();
    }
    await tab(page, { back: true });
    await expect(input(page, enabled[3])).toBeFocused();
  });

  test('forced colors: the field keeps a visible border where the engine has the mode', async ({ page }) => {
    await mountFixtures(page, spec);
    await page.emulateMedia({ forcedColors: 'active' });
    const forced = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'rgb(1, 2, 3)';
      document.body.appendChild(probe);
      const repainted = getComputedStyle(probe).color !== 'rgb(1, 2, 3)';
      probe.remove();
      return repainted;
    });
    test.skip(!forced, 'forced colors are not emulated by this browser');
    for (const id of ['filled-filled', 'outlined-filled', 'stacked-filled']) expect(await css(part(page, id, '.field > .container'), 'border-top-style'), id).toBe('solid');
  });
});

test.describe('fixtures', () => {
  test('the icon faces are loaded, so the icons fixture draws glyphs, not ligature text', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const width = (await bounds(part(page, 'outlined-icons', '.leading'))).width;
    // A glyph is one em wide, within a unit of the engine's layout; its name set as text is several.
    expect(Math.abs(width - (await resolveToken(page, T('icon-size-medium')))), `${width} wide`).toBeLessThanOrEqual(GLYPH_UNIT);
  });

  // One fixture is mounted for its picture, drawn as on the page of all of them (`mountFixtureAsInAll`): that page is
  // mounted once for a worker, not once for each picture.
  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtureAsInAll(page, spec, f, { icons: true });
      await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
