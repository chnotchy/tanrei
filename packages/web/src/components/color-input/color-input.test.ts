// <tanrei-color-input>, driven by specs/color-input.spec.json: every behaviour id (CLI-1 to CLI-44) starts the title of
// a test, every fixture has a baseline, and every length and color is read back from the tokens — never from a number
// written here. What a sentence says of "the Field that frames it" is tested with a Field around the input (`frame()`), and the
// rows themselves — the label above, the requirement tag, the help, the error text — are the Field's sentences and the
// Field's tests (src/components/field/field.test.ts, FLD-2 to FLD-28). The reading of a text (color-text.ts) is also
// tested by itself, in Node.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, acmeSystemCss, loadSpec, missingWords, mountFixtures, resolveColor, resolveToken, setWords, tab, tabTo, inputBoxCopies, inputBoxSetApart, inputBoxToken, rootTokens } from '../../../test/harness.js';
import { PICKER_START, channels, fromChannels, given, isValue, picked, read as readText, readCommitted, sameColor, valueOf } from './color-text.js';

const spec = loadSpec('color-input');
type P = Page;
const TAG = 'tanrei-color-input';
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] ${TAG}`);
/** A part of the color input's own shadow root. The picker button has parts of its own, so the box is named with its parent. */
const OWN: Record<string, string> = { '.container': '.field > .container' };
const part = (page: P, id: string, selector: string) => host(page, id).locator(OWN[selector] ?? selector);
const container = (page: P, id: string) => part(page, id, '.container');
const input = (page: P, id: string) => part(page, id, '.input');
const swatch = (page: P, id: string) => part(page, id, '.swatch');
const pickerButton = (page: P, id: string) => part(page, id, '.picker-button');
// The box is drawn from the one set of tokens every input box is drawn from (CLI-45) — the swatch has the box's icon
// size — and the swatch's shape and hairline from the color input's own.
const T = inputBoxToken('color-input');
const token = (page: P, name: string) => resolveToken(page, T(name));
const duration = (page: P, name: string) => resolveToken(page, T(name), 'duration');
const color = (page: P, name: string) => resolveColor(page, T(name));
const box = async (locator: Locator) => (await locator.boundingBox())!;
const css = (locator: Locator, property: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
const px = async (locator: Locator, property: string) => Number.parseFloat(await css(locator, property));
const near = (actual: number, expected: number, message = '', tolerance = 0.6) => expect(Math.abs(actual - expected), `${message}: ${actual} ≈ ${expected}`).toBeLessThanOrEqual(tolerance);
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
const frames = (page: P, count = 3) =>
  page.evaluate(async (n) => {
    for (let i = 0; i < n; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  }, count);
/** A fixture of the test's own. */
const fx = (id: string, props: Fixture['props'], extra: Partial<Fixture> = {}): Fixture => ({ id, props: { label: 'Brand color', ...props }, ...extra });
const mount = (page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) => mountFixtures(page, spec, { icons: true, fixtures, ...options });
const mountSpec = (page: P, ids: string[], options: Parameters<typeof mountFixtures>[2] = {}) => mount(page, spec.fixtures.filter((f) => ids.includes(f.id)), options);
type Element_ = HTMLElement & { updateComplete: Promise<unknown>; value: string };
/**
 * A color input inside a Field, as a stage of its own added to the mounted page: what a sentence says of "the Field
 * that frames it". The Field is as wide as the fixtures are drawn; `field` and `props` are set as properties.
 */
async function frame(page: P, id: string, field: Record<string, unknown>, props: Record<string, unknown> = {}) {
  await page.evaluate(
    async ([stageId, fieldProps, inputProps]) => {
      const stage_ = Object.assign(document.createElement('div'), { className: 'stage' });
      stage_.dataset.fixture = stageId;
      const framing = Object.assign(document.createElement('tanrei-field'), fieldProps) as HTMLElement & { updateComplete: Promise<unknown> };
      framing.style.inlineSize = '280px';
      const framed = Object.assign(document.createElement('tanrei-color-input'), inputProps) as HTMLElement & { updateComplete: Promise<unknown> };
      framing.append(framed);
      stage_.append(framing);
      document.querySelector('main')!.append(stage_);
      for (let round = 0; round < 3; round++) await Promise.all([framing.updateComplete, framed.updateComplete]);
    },
    [id, field, props] as const,
  );
}
/** The Field that frames the input of the stage `id`. */
const fieldOf = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-field`);
/** A part of that Field — its own row, not a part of the input inside it. */
const row = (page: P, id: string, selector: string) => fieldOf(page, id).locator(selector);
/** Sets props of that Field, and waits for it and its input. */
const setField = (page: P, id: string, props: Record<string, unknown>) =>
  fieldOf(page, id).evaluate(async (el, p) => {
    Object.assign(el, p);
    const control = el.querySelector('tanrei-color-input') as Element_;
    for (let round = 0; round < 3; round++) await Promise.all([(el as Element_).updateComplete, control.updateComplete]);
  }, props);
/** The input's description: the text of the hidden element it is described by (an id cannot cross to the Field's rows). */
const description = (page: P, id: string) =>
  input(page, id).evaluate((el) => {
    const root = el.getRootNode() as ShadowRoot;
    return (el.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean).map((ref) => root.getElementById(ref)?.textContent?.trim() ?? '').join(' ');
  });
const settle = (page: P, id: string) =>
  host(page, id).evaluate(async (el) => {
    await (el as Element_).updateComplete;
    await (el as Element_).updateComplete;
  });
const set = (page: P, id: string, props: Record<string, unknown>) =>
  host(page, id).evaluate(async (el, p) => {
    Object.assign(el, p);
    await (el as Element_).updateComplete;
    await (el as Element_).updateComplete;
  }, props);
/** An sRGB color as the browser computes it, from a value: "rgb(15, 118, 110)". */
const rgb = (value: string) => `rgb(${channels(value)!.join(', ')})`;
/** What the color input is now, read from the element and from the elements that carry its semantics and its sample. */
const read = async (page: P, id: string) => {
  await settle(page, id);
  return host(page, id).evaluate((el) => {
    const root = el.shadowRoot!;
    const field = root.querySelector<HTMLInputElement>('.input')!;
    const sample = root.querySelector<HTMLElement>('.swatch')!;
    const button = root.querySelector<HTMLElement>('.picker-button');
    return {
      value: (el as Element_).value,
      text: field.value,
      focused: root.activeElement === field,
      onButton: !!button && root.activeElement === button,
      invalid: field.getAttribute('aria-invalid') === 'true',
      // The words below the box are the row of the Field that frames it, where one does.
      // What the Field's row says of the value: its error text while it shows one — below the help, which stays (FLD-7) — else its help.
      supporting: el.closest('tanrei-field')?.shadowRoot?.querySelector('.error-text, .supporting-text:not(:has(~ .error-text))')?.textContent ?? '',
      swatch: sample.hasAttribute('data-filled') ? getComputedStyle(sample).backgroundColor : '',
      caret: [field.selectionStart, field.selectionEnd],
    };
  });
};
/** Records `input`, `change`, `pickerrequest` and `entryerror` on the color input, in order, with what the element holds when each is heard. */
const listen = (page: P, id: string, { cancel = false } = {}) =>
  host(page, id).evaluate((el, prevent) => {
    const w = window as unknown as { __events: string[] };
    w.__events = [];
    const field = el as Element_;
    const flags = (event: Event) => (event.bubbles && event.composed ? '' : ' (not composed)');
    el.addEventListener('input', (event) => w.__events.push(`input ${field.value}${flags(event)}`));
    el.addEventListener('change', (event) => w.__events.push(`change ${field.value}${flags(event)}`));
    el.addEventListener('pickerrequest', (event) => {
      w.__events.push(`pickerrequest ${(event as CustomEvent<{ value: string }>).detail.value}${event.cancelable ? '' : ' (not cancelable)'}${flags(event)}`);
      if (prevent) event.preventDefault();
    });
    el.addEventListener('entryerror', (event) => {
      const detail = (event as CustomEvent<{ text: string; message: string }>).detail;
      w.__events.push(`entryerror ${detail.text}|${detail.message}${flags(event)}`);
    });
  }, cancel);
const heard = (page: P) => page.evaluate(() => (window as unknown as { __events: string[] }).__events.splice(0));
/** The browser's own picker is not opened by a test: what it was asked to show is recorded in its place. */
const stubPicker = (page: P, { missing = false, refuses = false } = {}) =>
  page.evaluate(
    ([none, throws]) => {
      const w = window as unknown as { __shown: string[] };
      w.__shown = [];
      const show = function (this: HTMLInputElement) {
        if (throws) throw new DOMException('no picker here', 'NotSupportedError');
        w.__shown.push(`${this.type} ${this.value}`);
      };
      Object.defineProperty(HTMLInputElement.prototype, 'showPicker', { configurable: true, writable: true, value: none ? undefined : show });
      if (none) HTMLInputElement.prototype.click = show;
    },
    [missing, refuses] as const,
  );
const shown = (page: P) => page.evaluate(() => (window as unknown as { __shown: string[] }).__shown.splice(0));
/** What the browser's picker reports: a pick (`input`), or its closing (`change`), with the color it holds. */
const report = async (page: P, id: string, type: 'input' | 'change', value?: string) => {
  await part(page, id, '.native-picker').evaluate(
    (el, [t, v]) => {
      if (v) (el as HTMLInputElement).value = v;
      el.dispatchEvent(new Event(t, { bubbles: true, composed: t === 'input' }));
    },
    [type, value] as const,
  );
  await settle(page, id);
};
/** A press of the pointer at the centre of `target`. */
const pressOn = async (target: Locator) => {
  await target.scrollIntoViewIfNeeded();
  const b = (await target.boundingBox())!;
  await target.page().mouse.click(b.x + b.width / 2, b.y + b.height / 2);
};
const focusInput = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    el.scrollIntoView({ block: 'nearest' });
    (el as HTMLElement).focus();
  });
const blurInput = async (page: P, id: string) => {
  await input(page, id).evaluate((el) => (el as HTMLElement).blur());
  await settle(page, id);
};
const selectAll = (page: P, id: string) => input(page, id).evaluate((el) => (el as HTMLInputElement).select());
/** Focuses the input, selects what it holds and types over it, one key at a time, as a person does. */
const retype = async (page: P, id: string, text: string) => {
  await focusInput(page, id);
  await selectAll(page, id);
  if (text) await page.keyboard.type(text);
  else await page.keyboard.press('Backspace');
  await settle(page, id);
};
/** Focuses the input, selects what it holds and pastes over it: the whole text arrives in one edit. */
const paste = async (page: P, id: string, text: string) => {
  await focusInput(page, id);
  await selectAll(page, id);
  await page.keyboard.insertText(text);
  await settle(page, id);
};
/** An input method composing in the input, as the platform reports it. */
const compose = (page: P, id: string, steps: string[]) =>
  input(page, id).evaluate((el, texts) => {
    const field = el as HTMLInputElement;
    field.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, composed: true }));
    for (const text of texts) {
      field.value = text;
      field.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, isComposing: true, inputType: 'insertCompositionText', data: text }));
    }
  }, steps);
const composingKey = (page: P, id: string, key: string) =>
  input(page, id).evaluate((el, k) => {
    const event = new KeyboardEvent('keydown', { key: k, bubbles: true, composed: true, cancelable: true, isComposing: true, keyCode: 229 });
    el.dispatchEvent(event);
    return event.defaultPrevented;
  }, key);
const endComposition = async (page: P, id: string, text: string) => {
  await input(page, id).evaluate((el, committed) => {
    const field = el as HTMLInputElement;
    field.value = committed;
    field.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, isComposing: true, inputType: 'insertCompositionText', data: committed }));
    field.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, composed: true, data: committed }));
  }, text);
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 20)));
  await settle(page, id);
};
/** The Chromium accessibility tree, over the DevTools protocol: what the browser computed. */
async function axTree(page: P) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  return nodes
    .filter((node) => !node.ignored)
    .map((node) => {
      const property = (name: string) => node.properties?.find((p) => p.name === name)?.value;
      return {
        role: (node.role?.value ?? '') as string,
        name: (node.name?.value ?? '') as string,
        description: (node.description?.value ?? '') as string,
        value: node.value?.value as string | number | undefined,
        invalid: property('invalid')?.value as string | undefined,
        required: property('required')?.value as boolean | undefined,
        disabled: property('disabled')?.value as boolean | undefined,
        focusable: property('focusable')?.value as boolean | undefined,
        hasPopup: property('hasPopup')?.value as string | undefined,
      };
    });
}
const axNodes = async (page: P, role: string) => (await axTree(page)).filter((node) => node.role === role);
/** Every custom property a stylesheet declares for a component, by name. */
const declared = (sheet: string, component: string) => [...new Set([...sheet.matchAll(new RegExp(`--tanrei-comp-${component}-[a-z0-9-]+(?=:)`, 'g'))].map((m) => m[0]))];
/** The computed value of each custom property, with every reference resolved, as the page's root has it now. */
const computed = (page: P, names: string[]) =>
  page.evaluate((list) => {
    const probe = document.createElement('div');
    document.body.append(probe);
    const out: Record<string, string> = {};
    for (const name of list) {
      probe.style.setProperty('--probe', `var(${name})`);
      out[name] = getComputedStyle(probe).getPropertyValue('--probe').trim();
    }
    probe.remove();
    return out;
  }, names);
const systemColor = (page: P, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.color = n;
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, name);
const SYSTEMS = [undefined, 'm3-like', 'm3-expressive-like', 'cupertino'] as const;
const THEMES = ['light', 'dark'] as const;
const VALUE = /^(#[0-9a-f]{6})?$/;

test.describe('the reading of a text (color-text.ts)', () => {
  const said = (text: string) => {
    const reading = readText(text);
    return reading.kind === 'color' ? reading.value : reading.kind;
  };

  test('CLI-18: a text reads as a color when, with the white space around it left out, it is exactly six hexadecimal digits in either case, with or without one number sign; every other text reads as no color — an empty one, fewer or more digits, a three-digit form, an alpha, a name, a functional notation, any other character', () => {
    expect([said(' #0F766E '), said('0f766e'), said('#0f766e'), said('0F766E'), said('\t#AbCdEf\n'), said('　#0f766e　'), said(' 000000')]).toEqual(['#0f766e', '#0f766e', '#0f766e', '#0f766e', '#abcdef', '#0f766e', '#000000']);
    expect([said(''), said('   '), said('\n\t')]).toEqual(['empty', 'empty', 'empty']);
    const not = ['#0f7', '#0f766e80', 'teal', 'rgb(15, 118, 110)', 'hsl(175 77% 26%)', 'oklch(0.5 0.1 180)', '#0f766', '#0f766e0', '##0f766e', '#0f766g', '#0f 766e', '0x0f766e', '#', '0f766e#', '#0f766e;', 'transparent', '＃０ｆ７６６ｅ', '‎#0f766e', '#0f76-6e', '#-f766e'];
    expect(not.map(said)).toEqual(not.map(() => 'invalid'));
  });

  test('CLI-19: a commit reads by the same rule, and three hexadecimal digits besides — in either case, with or without a number sign, white space around them left out — as the six digits made by writing each twice; nothing else more', () => {
    const committed = (text: string) => {
      const reading = readCommitted(text);
      return reading.kind === 'color' ? reading.value : reading.kind;
    };
    expect(['#fff', 'fff', ' #F0A ', '0f7', '#ABC'].map(committed)).toEqual(['#ffffff', '#ffffff', '#ff00aa', '#00ff77', '#aabbcc']);
    expect([committed(' #0F766E '), committed(''), committed('  ')]).toEqual(['#0f766e', 'empty', 'empty']);
    const not = ['#ff', '#ffff', '#fff0', '##fff', '#ffg', 'f f f', 'teal', '＃ｆｆｆ', '#fff;'];
    expect(not.map(committed)).toEqual(not.map(() => 'invalid'));
    // While typing, three digits are still no color (CLI-18).
    expect(readText('#fff').kind).toBe('invalid');
  });

  test('CLI-16: the value has one form — a number sign and six lowercase hexadecimal digits, or the empty string — so two values are the same color exactly when they are the same string, and a text in capitals or without its number sign is the color of its lowercase form', () => {
    expect([isValue('#0f766e'), isValue(''), isValue('#0F766E'), isValue('0f766e'), isValue('#0f7'), isValue('#0f766e80'), isValue(' #0f766e'), isValue('teal')]).toEqual([true, true, false, false, false, false, false, false]);
    expect([valueOf('0F766E'), valueOf(' #0f766e '), valueOf('#0f7'), valueOf(''), valueOf('teal')]).toEqual(['#0f766e', '#0f766e', '', '', '']);
    expect([sameColor('#0F766E', '0f766e'), sameColor('#0f766e', '#0f766f'), sameColor('', '#0f7'), sameColor('', '#000000')]).toEqual([true, false, true, false]);
    // Every value any reading gives is in the value's own form.
    for (const text of ['#ABCDEF', 'abcdef', ' 123456 ', '#12345', 'x', '']) expect(isValue(valueOf(text)), text).toBe(true);
    expect([channels('#0f766e'), channels('#ffffff'), channels(''), channels('#0F766E')]).toEqual([[15, 118, 110], [255, 255, 255], null, null]);
    expect([fromChannels(15, 118, 110), fromChannels(255.4, -3, 300), fromChannels(Number.NaN, 0.5, 0.49)]).toEqual(['#0f766e', '#ff00ff', '#000100']);
    for (const value of ['#000000', '#ffffff', '#0f766e', '#fde047']) expect(fromChannels(...channels(value)!), value).toBe(value);
  });

  test('CLI-21: what the product sets is held in the value’s own form — capitals and a missing number sign put right, an empty text or none no color — and a text that is not a color, or something that is not a text, is treated as empty and known to be so', () => {
    expect([given('#0F766E'), given('0f766e'), given(' #0f766e '), given(''), given(null), given(undefined)]).toEqual([
      { value: '#0f766e', valid: true },
      { value: '#0f766e', valid: true },
      { value: '#0f766e', valid: true },
      { value: '', valid: true },
      { value: '', valid: true },
      { value: '', valid: true },
    ]);
    expect([given('teal'), given('#0f7'), given('rgb(0 0 0)'), given(0x0f766e), given({})]).toEqual(Array(5).fill({ value: '', valid: false }));
  });

  test('CLI-29: a pick the platform reports is held in the value’s own form — a number sign and six digits, capitals put right — and a report that is not an opaque sRGB color in that form is no pick; while the field holds no color the picker starts from black', () => {
    expect([picked('#0f766e'), picked('#0F766E'), picked('#FFFFFF')]).toEqual(['#0f766e', '#0f766e', '#ffffff']);
    expect([picked(''), picked('#0f766e80'), picked('color(display-p3 0 1 0)'), picked('#0f7')]).toEqual([null, null, null, null]);
    expect([PICKER_START, isValue(PICKER_START)]).toEqual(['#000000', true]);
  });
});

test.describe('behavior: the box, its name and its Field', () => {
  test('CLI-1: the container is at least container.height of its size tall, its corners container.shape (a filled one’s bottom corners shape-bottom), and holds one centred row — the swatch padding-inline-with-icon from the start edge, the input container.gap after it, and the picker button at the end, container.gap after the input; without the button the input ends padding-inline from the end edge; the field is as wide as its layout gives it', async ({ page }) => {
    await mountSpec(page, ['stacked-filled', 'stacked-large', 'stacked-small', 'stacked-picker', 'stacked-picker-large', 'filled-filled']);
    for (const [id, size] of [['stacked-filled', 'medium'], ['stacked-large', 'large'], ['stacked-small', 'small'], ['stacked-picker', 'medium'], ['stacked-picker-large', 'large']] as const) {
      const [c, s, field] = [await box(container(page, id)), await box(swatch(page, id)), await box(input(page, id))];
      near(c.height, await token(page, `container-height-${size}`), `${id} height`);
      near(s.x - c.x, await token(page, `container-padding-inline-with-icon-${size}`), `${id}: the swatch from the start edge`);
      near(field.x - (s.x + s.width), await token(page, `container-gap-${size}`), `${id}: container.gap after the swatch`);
      near(s.y + s.height / 2, c.y + c.height / 2, `${id} swatch centred`);
      near(field.y + field.height / 2, c.y + c.height / 2, `${id} input centred`);
      expect((c.height - Math.max(s.height, field.height)) / 2, `${id} padding-block`).toBeGreaterThanOrEqual((await token(page, `container-padding-block-${size}`)) - 0.6);
      near(await px(container(page, id), 'border-top-left-radius'), await token(page, 'container-shape'), `${id} corner`);
      near(await px(container(page, id), 'border-bottom-right-radius'), await token(page, 'container-shape'), `${id} bottom corner`);
      if (id.includes('picker')) {
        const [slot, button] = [await box(part(page, id, '.picker')), await box(pickerButton(page, id))];
        near(slot.x - (field.x + field.width), await token(page, `container-gap-${size}`), `${id}: the input ends container.gap before the button’s glyph box`);
        near(c.x + c.width - (button.x + button.width / 2), s.x + s.width / 2 - c.x, `${id}: the glyph as far from the end edge as the swatch’s centre from the start edge`);
        near(button.y + button.height / 2, c.y + c.height / 2, `${id} button centred`);
      } else near(c.x + c.width - (field.x + field.width), await token(page, `container-padding-inline-${size}`), `${id}: the input ends padding-inline from the end edge`);
      near(c.width, (await box(host(page, id))).width, `${id}: as wide as the field`);
    }
    // The default system's numbers: 48 and 56 high; the swatch 24, 12 from the start edge; the value 16 after it.
    expect([await token(page, 'container-height-medium'), await token(page, 'container-height-large'), await token(page, 'icon-size-medium'), await token(page, 'container-padding-inline-with-icon-medium'), await token(page, 'container-gap-medium')]).toEqual([48, 56, 24, 12, 16]);
    // As wide as its layout gives it: the host is a block.
    expect(await css(host(page, 'stacked-filled'), 'display')).toBe('block');
    await host(page, 'stacked-filled').evaluate((el) => (el.parentElement!.style.inlineSize = '400px'));
    near((await box(container(page, 'stacked-filled'))).width, 400, 'it fills its layout');
    // Filled: the bottom corners take shape-bottom.
    near(await px(container(page, 'filled-filled'), 'border-top-left-radius'), await token(page, 'container-shape'), 'filled top corner');
    near(await px(container(page, 'filled-filled'), 'border-bottom-left-radius'), await token(page, 'container-shape-bottom'), 'filled bottom corner');
    expect(await container(page, 'stacked-filled').getAttribute('data-tanrei-shape'), 'eased by the corner smoothing').not.toBeNull();
  });

  test('CLI-2, CLI-45: the color input holds no token of the box under its own name — its own family is what it alone draws, in the default system and in each preset', async () => {
    const sheets = [fs.readFileSync(path.join(pkg, 'dist/tokens.css'), 'utf8'), ...SYSTEMS.filter((system): system is Exclude<(typeof SYSTEMS)[number], undefined> => system !== undefined).map((system) => fs.readFileSync(path.join(pkg, `dist/systems/${system}.css`), 'utf8'))];
    // No copy to hold equal: what the color input reads of the box is the one set every input box is drawn from.
    expect(inputBoxCopies(sheets, 'color-input')).toEqual([]);
    // Its own: the swatch's shape and its hairline (and the companion the emitter writes beside a shape). Its size is the box's icon size.
    expect(declared(sheets[0]!, 'color-input').map((name) => name.replace('--tanrei-comp-color-input-', '')).sort()).toEqual(['swatch-outline-color', 'swatch-outline-width', 'swatch-shape', 'swatch-shape-pill']);
  });

  test('CLI-45: a custom property of the box set on one color input changes that one alone; set on an ancestor, every color input in it', async ({ page }) => {
    await mount(page, [fx('one', {})]);
    const { rest, one, both } = await inputBoxSetApart(page, 'tanrei-color-input');
    expect(rest[0], 'the box has corners to lose').toBeGreaterThan(0);
    expect(rest[1]).toBe(rest[0]);
    expect(one, 'the one it is set on, and not its neighbour').toEqual([0, rest[1]]);
    expect(both, 'both, from their parent').toEqual([0, 0]);
  });

  test('CLI-2: a color field and a text field with a leading icon, of the same variant, size, label, value and supporting text, in one row share the tops and bottoms of their labels, containers, input lines and supporting rows — both rows are the one Field’s — the swatch stands where the leading icon stands and at its size, and the value starts where the text input’s text starts, in its text style', async ({ page }) => {
    for (const [system, variant, size] of [[undefined, 'stacked', 'small'], [undefined, 'stacked', 'medium'], [undefined, 'stacked', 'large'], ['m3-like', 'filled', 'small'], ['m3-like', 'filled', 'medium'], ['m3-like', 'outlined', 'large'], ['cupertino', 'stacked', 'medium']] as const) {
      await mount(page, [fx('pair', {})], { system, reducedMotion: true });
      await page.evaluate(
        ([v, s]) => {
          const stage = document.querySelector<HTMLElement>('[data-fixture="pair"]')!;
          stage.replaceChildren();
          stage.style.cssText = 'display: flex; gap: 16px; align-items: flex-start; inline-size: 600px';
          const shared = { variant: v, size: s, label: 'Brand color', value: '#0f766e', supportingText: 'Six hexadecimal digits.' };
          const mine = Object.assign(document.createElement('tanrei-color-field'), shared);
          const theirs = Object.assign(document.createElement('tanrei-text-field'), shared);
          const glyph = document.createElement('span');
          glyph.slot = 'leading-icon';
          glyph.textContent = 'palette';
          theirs.append(glyph);
          for (const element of [mine, theirs]) {
            element.style.inlineSize = '280px';
            stage.append(element);
          }
        },
        [variant, size] as const,
      );
      const [mine, theirs] = [page.locator('[data-fixture="pair"] > tanrei-color-field'), page.locator('[data-fixture="pair"] > tanrei-text-field')];
      await expect(mine.locator('.field > .container')).toBeVisible();
      await expect(theirs.locator('.field > .container')).toBeVisible();
      await frames(page, 4);
      const where = `${system ?? 'tanrei'} ${variant} ${size}`;
      const [mineHost, theirHost] = [await box(mine), await box(theirs)];
      const pairs: [string, Locator, Locator][] = [
        ['container', mine.locator('.field > .container'), theirs.locator('.field > .container')],
        ['supporting row', mine.locator('.supporting-text'), theirs.locator('.supporting-text')],
        ['label', variant === 'stacked' ? mine.locator('.label-row > .label') : mine.locator('.floating'), variant === 'stacked' ? theirs.locator('.label-row > .label') : theirs.locator('label.label')],
        ['swatch and leading icon', mine.locator('.swatch'), theirs.locator('.leading')],
      ];
      for (const [name, a_, b_] of pairs) {
        const [a, b] = [await box(a_), await box(b_)];
        near(a.y, b.y, `${where}: ${name} top`);
        near(a.y + a.height, b.y + b.height, `${where}: ${name} bottom`);
        // A floating label: the text input scales its label where the color input sets its size, so the two boxes may differ by a part of a pixel.
        near(a.x - mineHost.x, b.x - theirHost.x, `${where}: ${name} start edge`, name === 'label' && variant !== 'stacked' ? 1 : 0.6);
        if (name === 'label' || name === 'swatch and leading icon') near(a.width, b.width, `${where}: ${name} width`, name === 'label' ? 1.5 : 0.6);
      }
      const [value, text] = [mine.locator('.input'), theirs.locator('.input')];
      for (const property of ['font-size', 'font-family', 'font-weight', 'letter-spacing', 'color', 'caret-color']) expect(await css(value, property), `${where}: ${property}`).toBe(await css(text, property));
      const [a, b] = [await box(value), await box(text)];
      near(a.x - mineHost.x, b.x - theirHost.x, `${where}: text start edge`);
      near(a.y + a.height / 2, b.y + b.height / 2, `${where}: input line`);
      near(mineHost.height, theirHost.height, `${where}: the whole field`);
    }
  });

  test('CLI-2: the picker button stands where a date input’s picker button stands (TXI-32)', async ({ page }) => {
    await mountSpec(page, ['stacked-picker']);
    await page.evaluate(() => {
      const stage = document.querySelector<HTMLElement>('[data-fixture="stacked-picker"]')!;
      stage.style.cssText = 'display: flex; gap: 16px; align-items: flex-start; inline-size: 600px';
      stage.querySelector<HTMLElement>('tanrei-color-input')!.style.inlineSize = '280px';
      const field = document.createElement('tanrei-text-input');
      Object.assign(field, { type: 'date', label: 'Day', picker: true, pickerLabel: 'Choose date', segmentEmptyText: 'Empty', value: '2026-10-07' });
      field.style.inlineSize = '280px';
      stage.append(field);
    });
    const field = page.locator('[data-fixture="stacked-picker"] > tanrei-text-input');
    await expect(field.locator('.picker-button')).toBeVisible();
    await frames(page, 4);
    const [a, b] = [await box(pickerButton(page, 'stacked-picker')), await box(field.locator('.picker-button'))];
    near(a.x - (await box(host(page, 'stacked-picker'))).x, b.x - (await box(field)).x, 'the same place along the row');
    near(a.y, b.y, 'the same line');
    near(a.width, b.width, 'the same Button');
  });

  test('CLI-7: a filled or outlined color input draws the asterisk after its floating label while the Field that frames it gives it one — for requiredMark tag, asterisk, and auto under a system that marks a required control — requirement.asterisk-gap from the text, in the label’s style and place, in its required-asterisk color (the error part while in error), hidden from assistive technology; it draws no chip and no optional tag; with the mark none, a hidden label, a stacked look or no Field it draws no mark, and the required state is kept', async ({ page }) => {
    await mount(page, [fx('bare', { variant: 'outlined', value: '#0f766e' })], { reducedMotion: true });
    const framing = { label: 'Brand color', requirement: 'required', requiredText: 'Required' };
    for (const mark of ['auto', 'tag', 'asterisk', 'none'] as const) await frame(page, `outlined-${mark}`, { ...framing, requiredMark: mark }, { variant: 'outlined' });
    await frame(page, 'filled-auto', framing, { variant: 'filled', value: '#0f766e' });
    await frame(page, 'hidden', { ...framing, labelHidden: true, requiredMark: 'asterisk' }, { variant: 'outlined' });
    await frame(page, 'optional', { label: 'Accent color', requirement: 'optional', optionalText: 'Optional' }, { variant: 'outlined' });
    await frame(page, 'stacked', { ...framing, requiredMark: 'asterisk' }, {});
    await frame(page, 'in-error', { ...framing, requiredMark: 'asterisk', error: true }, { variant: 'outlined' });
    const star = (id: string) => part(page, id, '.floating .asterisk');
    expect(await css(page.locator('html'), '--tanrei-comp-field-requirement-mark'), 'the default system marks a required control with a tag').toBe('tag');
    // The Field names a tag, an asterisk, or the system's tag: the floating label draws the asterisk, and no tag.
    for (const id of ['outlined-auto', 'outlined-tag', 'outlined-asterisk', 'filled-auto', 'in-error']) {
      await expect(star(id), id).toHaveCount(1);
      expect(await part(page, id, '.floating').textContent(), id).toBe('Brand color*');
      expect(await input(page, id).getAttribute('aria-required'), id).toBe('true');
      await expect(row(page, id, '.label-row'), `${id}: the Field draws no label row`).toHaveCount(0);
      await expect(page.locator(`[data-fixture="${id}"] tanrei-tag`), `${id}: no chip anywhere`).toHaveCount(0);
    }
    const asterisk = star('outlined-asterisk');
    expect([await asterisk.textContent(), await asterisk.getAttribute('aria-hidden'), await asterisk.getAttribute('part')]).toEqual(['*', 'true', 'requirement-label']);
    expect(await css(asterisk, 'color')).toBe(await color(page, 'outlined-required-asterisk-color'));
    expect(await css(star('in-error'), 'color')).toBe(await color(page, 'outlined-error-required-asterisk-color'));
    expect(await css(star('filled-auto'), 'color')).toBe(await color(page, 'filled-required-asterisk-color'));
    expect(await css(asterisk, 'font-size'), 'in the label’s text style').toBe(await css(part(page, 'outlined-asterisk', '.floating'), 'font-size'));
    near(await px(asterisk, 'margin-left'), await token(page, 'requirement-asterisk-gap'), 'requirement.asterisk-gap');
    // It rests and floats with the label: after a value it is in the floated style.
    await set(page, 'outlined-asterisk', { value: '#0f766e' });
    near(await px(asterisk, 'font-size'), await token(page, 'label-floated-typescale-medium-font-size'), 'floated with the label');
    // No mark: the Field names none; the label is hidden; the look is stacked (the Field draws its own); no Field.
    await expect(star('outlined-none')).toHaveCount(0);
    await expect(part(page, 'hidden', '.floating')).toHaveCount(0);
    await expect(part(page, 'stacked', '.floating, .asterisk')).toHaveCount(0);
    await expect(row(page, 'stacked', '.label-row > .label > .asterisk'), 'above a stacked input the asterisk is the Field’s').toHaveCount(1);
    for (const id of ['outlined-none', 'hidden', 'stacked']) expect(await input(page, id).getAttribute('aria-required'), `${id}: the required state is kept`).toBe('true');
    await expect(star('bare')).toHaveCount(0);
    expect(await input(page, 'bare').getAttribute('aria-required')).toBeNull();
    // Optional: no tag, no mark, and the text in the description the Field gives.
    await expect(part(page, 'optional', '.asterisk')).toHaveCount(0);
    expect(await part(page, 'optional', '#description').textContent()).toBe('Optional');
    // Under auto the mark is the design system's, read by the Field: none draws nothing, an asterisk the asterisk.
    const redraw = (id: string, text: string) => fieldOf(page, id).evaluate(async (el, t) => (Object.assign(el, { supportingText: t }), await (el as Element_).updateComplete, await (el as Element_).updateComplete), text);
    await override(page, { '--tanrei-comp-field-requirement-mark': 'none' });
    for (const id of ['outlined-auto', 'outlined-tag']) await redraw(id, 'x');
    await settle(page, 'outlined-auto');
    await expect(star('outlined-auto')).toHaveCount(0);
    expect(await input(page, 'outlined-auto').getAttribute('aria-required')).toBe('true');
    await expect(star('outlined-tag'), 'a Field that says keeps its own').toHaveCount(1);
    await override(page, { '--tanrei-comp-field-requirement-mark': 'asterisk' });
    await redraw('outlined-auto', 'y');
    await settle(page, 'outlined-auto');
    await expect(star('outlined-auto')).toHaveCount(1);
    // The Field's token follows the system's one choice (sys.behavior.requirement-mark): set for the page instead, it
    // is followed the same.
    await rootTokens(page, { '--tanrei-comp-field-requirement-mark': '' });
    await override(page, { '--tanrei-sys-behavior-requirement-mark': 'none' });
    await redraw('outlined-auto', 'z');
    await settle(page, 'outlined-auto');
    await expect(star('outlined-auto')).toHaveCount(0);
  });

  test('CLI-9: in error — its own error, the error of the Field that frames it, or an entry error — the color input is exposed as invalid and draws every part of its container from the error parts of its variant — a stacked one a line inside its edge at rest — while the swatch and the picker button stay as they are; it never sets error itself and shows no error text of its own: the words are its Field’s row, and its description', async ({ page }) => {
    await mountSpec(page, ['stacked-error', 'stacked-filled', 'stacked-error-picker', 'stacked-picker']);
    await frame(page, 'framed', { label: 'Brand color', error: true, errorText: 'Too light for white text.' }, { value: '#fde047' });
    for (const id of ['stacked-error', 'framed']) {
      expect(await input(page, id).getAttribute('aria-invalid'), id).toBe('true');
      const edge = part(page, id, '.edge');
      expect(await css(edge, 'border-top-color'), id).toBe(await color(page, 'stacked-error-outline-color'));
      near(await px(edge, 'border-top-width'), await token(page, 'outline-width'), `${id}: outline.width`);
      expect(await css(container(page, id), 'background-color'), id).toBe(await color(page, 'stacked-error-container-color'));
      expect(await css(input(page, id), 'color'), id).toBe(await color(page, 'stacked-error-input-color'));
      // Under the default system the edge is drawn in the error role.
      expect(await css(edge, 'border-top-color'), id).toBe(await resolveColor(page, '--tanrei-sys-color-error'));
      // The edge takes no layout space: the container is as tall in error as at rest.
      near((await box(container(page, id))).height, (await box(container(page, 'stacked-filled'))).height, `${id}: the container’s height`);
      // The swatch stays as it is drawn: the value, and the one hairline.
      expect((await read(page, id)).swatch, id).toBe(rgb('#fde047'));
      expect(await css(swatch(page, id), 'border-top-color'), id).toBe(await css(swatch(page, 'stacked-filled'), 'border-top-color'));
    }
    expect(await input(page, 'stacked-filled').getAttribute('aria-invalid')).toBeNull();
    // The Field's error is the Field's: the input's own `error` is never set for it.
    expect(await host(page, 'framed').evaluate((el) => [(el as HTMLElement & { error: boolean }).error, el.hasAttribute('error')])).toEqual([false, false]);
    // No error text of its own: nothing it draws holds the words. They are the Field's row, and the input's description.
    expect(await host(page, 'framed').evaluate((el) => [...el.shadowRoot!.querySelectorAll<HTMLElement>('*')].filter((node) => !node.hidden && [...node.childNodes].some((child) => child.nodeType === Node.TEXT_NODE && child.textContent!.includes('Too light'))).length)).toBe(0);
    await expect(row(page, 'framed', '.error-text')).toHaveText('Too light for white text.');
    expect([await input(page, 'framed').getAttribute('aria-describedby'), await part(page, 'framed', '#description').textContent()]).toEqual(['description', 'Too light for white text.']);
    expect(await host(page, 'stacked-error').evaluate((el) => el.shadowRoot!.querySelectorAll('.supporting-text, .label-row, [role="status"], [aria-live]').length), 'bare: no row and no live region').toBe(0);
    // The picker button is not in error: drawn as that of an input at rest.
    const face = (fixture: string) => pickerButton(page, fixture).locator('[part="container"]');
    for (const property of ['color', 'background-color']) expect(await css(face('stacked-error-picker'), property), property).toBe(await css(face('stacked-picker'), property));
    // Never by itself: a color is never judged, and an empty input is no error.
    await retype(page, 'stacked-filled', '#ffffff');
    await blurInput(page, 'stacked-filled');
    await retype(page, 'stacked-filled', '');
    await blurInput(page, 'stacked-filled');
    expect(await host(page, 'stacked-filled').evaluate((el) => [(el as HTMLElement & { error: boolean }).error, el.hasAttribute('error')])).toEqual([false, false]);
    expect(await read(page, 'stacked-filled')).toMatchObject({ invalid: false, value: '' });
  });

  test('CLI-11: the accessible name of the input is the label of the Field that frames it, drawn or not, and its own label wins; the Field’s shown text and its optional text are its description; with neither name it still renders and is reported; while its Field says it is required it is exposed as required whichever mark is drawn, and reports a missing value to the form while value is empty — it has no requirement of its own and raises no error for an empty or a half-typed text', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('own', {}), fx('unnamed', { label: '' })]);
    await frame(page, 'framed', { label: 'Brand color', supportingText: 'Six hexadecimal digits.', requirement: 'optional', optionalText: 'Optional' }, {});
    await frame(page, 'hidden', { label: 'Brand color', labelHidden: true, requirement: 'required' }, {});
    await frame(page, 'both', { label: '' }, { label: 'Its own' });
    await frame(page, 'none', { label: 'Text', requirement: 'required', requiredMark: 'none' }, { value: '#000000' });
    const name = async (id: string) => (await input(page, id).getAttribute('aria-label')) ?? '';
    expect([await name('own'), await name('framed'), await name('hidden'), await name('both'), await name('none'), await name('unnamed')]).toEqual(['Brand color', 'Brand color', 'Brand color', 'Its own', 'Text', '']);
    expect(await input(page, 'framed').getAttribute('aria-labelledby'), 'named by one thing').toBeNull();
    // The description is what the Field gives, as a value: the shown text, then the optional text.
    expect([await input(page, 'framed').getAttribute('aria-describedby'), await description(page, 'framed')]).toEqual(['description', 'Six hexadecimal digits. Optional']);
    await setField(page, 'framed', { error: true, errorText: 'Too light.' });
    expect(await description(page, 'framed'), 'a change of the shown text is exposed at once: the error text in the help’s place (FLD-11)').toBe('Too light. Optional');
    expect([await input(page, 'own').getAttribute('aria-describedby'), await description(page, 'own')], 'bare: no description of its own').toEqual([null, '']);
    // Neither name: it renders, and is reported — once, and never for an input a Field frames.
    await expect(input(page, 'unnamed')).toBeVisible();
    await expect.poll(() => seen.some((w) => w.includes('CLI-11') && w.includes('accessible name'))).toBe(true);
    expect(seen.filter((w) => w.includes('CLI-11')).length).toBe(1);
    // Required is the Field's to say: the input has no requirement setting.
    expect(await host(page, 'own').evaluate((el) => ['requirement', 'requiredMark', 'requiredText', 'optionalText'].filter((prop) => prop in el))).toEqual([]);
    expect([await input(page, 'hidden').getAttribute('aria-required'), await input(page, 'none').getAttribute('aria-required'), await input(page, 'framed').getAttribute('aria-required'), await input(page, 'own').getAttribute('aria-required')]).toEqual(['true', 'true', null, null]);
    const validity = (id: string) => host(page, id).evaluate((el) => { const v = (el as unknown as HTMLInputElement).validity; return { valid: v.valid, missing: v.valueMissing, message: (el as unknown as HTMLInputElement).validationMessage }; });
    expect(await validity('hidden'), 'no value and required: missing').toMatchObject({ valid: false, missing: true });
    expect((await validity('hidden')).message, 'in the browser’s own words').not.toBe('');
    expect(await validity('none'), 'black is a value: not missing').toMatchObject({ valid: true, missing: false });
    expect(await validity('own'), 'not required: valid').toMatchObject({ valid: true });
    // A half-typed text is no value: it is missing still, and no error is drawn for it; emptied and left, none either.
    await retype(page, 'none', '#00');
    expect(await validity('none')).toMatchObject({ missing: true });
    expect((await read(page, 'none')).invalid).toBe(false);
    await retype(page, 'none', '');
    await page.keyboard.press('Enter');
    await blurInput(page, 'none');
    expect(await read(page, 'none')).toMatchObject({ value: '', invalid: false, supporting: '' });
  });

  test('CLI-13: the focus order is the input and then, while it is shown, the picker button, and no other stop — the swatch is not one; a press on the label row of the Field that frames it moves focus to the input and does nothing else — it asks for no picker and changes no value — and a press on that Field’s supporting row does nothing', async ({ page }) => {
    await mount(page, [fx('one', { value: '#0f766e', picker: true, pickerLabel: 'Choose color' }), fx('plain', { value: '#000000' }), fx('after', {})]);
    await frame(page, 'framed', { label: 'Brand color', requirement: 'required', requiredText: 'Required', supportingText: 'Help.' }, { value: '#0f766e', picker: true, pickerLabel: 'Choose color' });
    await stubPicker(page);
    await listen(page, 'framed');
    for (const selector of ['.label-row > .label', '.requirement-tag'] as const) {
      await pressOn(row(page, 'framed', selector));
      const now = await read(page, 'framed');
      expect(now, selector).toMatchObject({ focused: true, onButton: false, value: '#0f766e', text: '#0f766e' });
      expect(now.caret[0], `${selector}: nothing is selected`).toBe(now.caret[1]);
      await blurInput(page, 'framed');
    }
    await pressOn(row(page, 'framed', '.supporting-text'));
    expect((await read(page, 'framed')).focused, 'the supporting row does nothing').toBe(false);
    expect(await heard(page)).toEqual([]);
    expect(await shown(page), 'no picker was asked for').toEqual([]);
    expect(await container(page, 'framed').getAttribute('data-pressed'), 'no press answer').toBeNull();
    // The focus order: the input, the picker button, then what follows.
    await tabTo(page, input(page, 'one'));
    await tab(page);
    expect(await read(page, 'one'), 'the picker button after the input').toMatchObject({ focused: false, onButton: true });
    await tab(page);
    expect((await read(page, 'plain')).focused, 'then the next input').toBe(true);
    await tab(page);
    expect((await read(page, 'after')).focused, 'an input without the button is one stop').toBe(true);
    await tab(page);
    expect((await read(page, 'framed')).focused, 'a Field adds no stop: its input is next').toBe(true);
    await tab(page);
    expect((await read(page, 'framed')).onButton, 'and then its picker button').toBe(true);
    await tab(page, { back: true });
    await tab(page, { back: true });
    await tab(page, { back: true });
    await tab(page, { back: true });
    expect((await read(page, 'one')).onButton, 'and back').toBe(true);
    // The swatch is no stop and no control.
    expect(await swatch(page, 'one').evaluate((el) => [(el as HTMLElement).tabIndex, el.getAttribute('role')])).toEqual([-1, null]);
  });

  test('CLI-15: a filled or outlined label rests in the input line, after the swatch, in label.typescale while the input is empty and not focused, and floats otherwise — to the top of a filled container, onto an outlined one’s top edge with its gap — in label.floated-typescale, over motion.label-*; a filled color input keeps its height; a label that does not fit wraps and is never over the value, the swatch or the picker button; the label it floats is its accessible name — its Field’s where it has none of its own — and none is drawn while labelHidden is true, its own or its Field’s, without a name, or in a stacked input', async ({ page }) => {
    await mount(page, [fx('filled', { variant: 'filled' }), fx('outlined', { variant: 'outlined' }), fx('wrap', { variant: 'outlined', label: 'A label that is far too long for a field this narrow', picker: true, pickerLabel: 'Choose color' }), fx('own-hidden', { variant: 'outlined', labelHidden: true }), fx('nameless', { variant: 'filled', label: '' }), fx('stacked', {})], { reducedMotion: true });
    for (const id of ['filled', 'outlined'] as const) {
      const label = part(page, id, '.floating');
      const c = await box(container(page, id));
      const resting = await box(label);
      const s = await box(swatch(page, id));
      near(await px(label, 'font-size'), await token(page, 'label-typescale-medium-font-size'), `${id}: resting in label.typescale`);
      near(resting.y + resting.height / 2, c.y + c.height / 2, `${id}: resting in the input line`);
      near(resting.x - (s.x + s.width), await token(page, 'container-gap-medium'), `${id}: after the swatch`);
      const height = c.height;
      await focusInput(page, id);
      await frames(page);
      near(await px(label, 'font-size'), await token(page, 'label-floated-typescale-medium-font-size'), `${id}: floated in label.floated-typescale`);
      const floated = await box(label);
      expect(floated.y, `${id}: it moved up`).toBeLessThan(resting.y);
      near((await box(container(page, id))).height, height, `${id}: the height does not change`);
      // Never over the value or the swatch.
      expect(floated.y + floated.height, `${id}: above the input’s line`).toBeLessThanOrEqual((await box(input(page, id))).y + 0.6);
      if (id === 'outlined') expect(floated.y + floated.height, 'outlined: above the swatch').toBeLessThanOrEqual(s.y + 0.6);
      else expect(floated.x, 'filled: beside the swatch').toBeGreaterThanOrEqual(s.x + s.width - 0.6);
      await blurInput(page, id);
      // It stays floated while the input holds a text, focused or not — a text that is not a color too.
      await set(page, id, { value: '#0f766e' });
      await frames(page);
      near(await px(label, 'font-size'), await token(page, 'label-floated-typescale-medium-font-size'), `${id}: floated over a value`);
      await retype(page, id, '#0f');
      await blurInput(page, id);
      await frames(page);
      near(await px(label, 'font-size'), await token(page, 'label-floated-typescale-medium-font-size'), `${id}: floated over a text that is not a color`);
    }
    // Filled: at least twice padding-block-with-label plus one line of each text style.
    const ratio = async (name: string) => Number(await css(page.locator('html'), T(`${name}-line-height`)));
    const lines = (await token(page, 'label-floated-typescale-medium-font-size')) * (await ratio('label-floated-typescale-medium')) + (await token(page, 'input-typescale-medium-font-size')) * (await ratio('input-typescale-medium'));
    expect((await box(container(page, 'filled'))).height).toBeGreaterThanOrEqual(2 * (await token(page, 'container-padding-block-with-label-medium')) + lines - 0.6);
    // Outlined: the outline opens a gap of notch-padding on each side of the floated label.
    const notch = await box(part(page, 'outlined', '.outline-notch'));
    const floatedLabel = await box(part(page, 'outlined', '.floating'));
    near(notch.width, floatedLabel.width + 2 * (await token(page, 'outline-notch-padding')), 'the gap in the outline', 1.5);
    expect(await css(part(page, 'outlined', '.outline-notch'), 'border-top-color')).toBe('rgba(0, 0, 0, 0)');
    // A label that does not fit wraps, is never cut, and resting stands between the swatch and the picker button.
    await host(page, 'wrap').evaluate((el) => (el.style.inlineSize = '240px'));
    await frames(page, 6);
    await expect(part(page, 'wrap', '.field')).toHaveAttribute('data-label-wraps', '');
    expect(await part(page, 'wrap', '.floating').evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && getComputedStyle(el).textOverflow !== 'ellipsis')).toBe(true);
    const [resting, s, button] = [await box(part(page, 'wrap', '.floating')), await box(swatch(page, 'wrap')), await box(part(page, 'wrap', '.picker'))];
    expect(resting.x, 'the resting label starts after the swatch').toBeGreaterThanOrEqual(s.x + s.width - 0.6);
    expect(resting.x + resting.width, 'and ends before the picker button').toBeLessThanOrEqual(button.x + 0.6);
    // The label it floats is its accessible name: the Field's label, where it has none of its own (FLD-25).
    await frame(page, 'framed', { label: 'From the field' }, { variant: 'outlined' });
    expect([await part(page, 'framed', '.floating').textContent(), await input(page, 'framed').getAttribute('aria-label')]).toEqual(['From the field', 'From the field']);
    await expect(row(page, 'framed', '.label-row'), 'and the Field draws no row for it').toHaveCount(0);
    // None while labelHidden is true — its own, or its Field's — which stays the name; none without a name; none in a stacked input.
    await frame(page, 'field-hidden', { label: 'Kept as the name', labelHidden: true }, { variant: 'filled' });
    for (const id of ['own-hidden', 'field-hidden', 'nameless', 'stacked']) await expect(part(page, id, '.floating, .measure, .notch-label'), id).toHaveCount(0);
    expect([await input(page, 'own-hidden').getAttribute('aria-label'), await input(page, 'field-hidden').getAttribute('aria-label')]).toEqual(['Brand color', 'Kept as the name']);
    await expect(part(page, 'stacked', '.field')).toHaveAttribute('data-layout', 'stacked');
    // The motion: label-duration and label-easing, and none where motion is reduced.
    expect(await px(part(page, 'filled', '.floating'), 'transition-duration'), 'reduced: at once').toBe(0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    near((await px(part(page, 'filled', '.floating'), 'transition-duration')) * 1000, await duration(page, 'motion-label-duration'), 'motion.label-duration', 1);
  });
});

test.describe('behavior: the value and its text', () => {
  test('CLI-16: after any sequence of edits, picks and product writes, value — and what input and change carry — is a number sign and six lowercase hexadecimal digits, or empty', async ({ page }) => {
    await mount(page, [fx('one', { picker: true, pickerLabel: 'Choose color' })]);
    await stubPicker(page);
    await listen(page, 'one');
    const values: string[] = [];
    const note = async () => values.push((await read(page, 'one')).value);
    for (const text of ['0F766E', '#0f7', ' #ABCDEF ', 'teal', '#0f766e80', '', 'rgb(1, 2, 3)', '#FDE047']) {
      await retype(page, 'one', text);
      await note();
      await blurInput(page, 'one');
      await note();
    }
    for (const given of ['#0F766E', 'abcdef', 'teal', '', '#123', ' #FFFFFF ']) {
      await set(page, 'one', { value: given });
      await note();
    }
    await set(page, 'one', { value: null });
    await note();
    await pickerButton(page, 'one').click();
    for (const pick of ['#ff0000', '#00ff00']) {
      await report(page, 'one', 'input', pick);
      await note();
    }
    await report(page, 'one', 'change');
    await note();
    expect(values.filter((value) => !VALUE.test(value)), 'every value the field ever held').toEqual([]);
    expect(new Set(values).size, 'and it held several').toBeGreaterThan(5);
    const events = await heard(page);
    expect(events.length).toBeGreaterThan(8);
    expect(events.filter((event) => /^(input|change) /.test(event)).map((event) => event.split(' ')[1] ?? '').filter((value) => !VALUE.test(value)), 'every value an event carried').toEqual([]);
  });

  test('CLI-17: the value is shown as text in a native input, on one line, in input.typescale and the input color, and edited freely — nothing typed is refused, replaced or reformatted, there is no limit to its length and the caret is not moved; every edit reads the whole text, and input is emitted once when that changed value and not at all when it did not', async ({ page }) => {
    await mountSpec(page, ['stacked-filled']);
    const id = 'stacked-filled';
    const field = input(page, id);
    expect(await field.evaluate((el) => [el.localName, (el as HTMLInputElement).type, (el as HTMLInputElement).maxLength, el.getAttribute('pattern')])).toEqual(['input', 'text', -1, null]);
    expect(await read(page, id)).toMatchObject({ value: '#0f766e', text: '#0f766e' });
    near(await px(field, 'font-size'), await token(page, 'input-typescale-medium-font-size'), 'input.typescale');
    expect(await css(field, 'color')).toBe(await color(page, 'stacked-input-color'));
    await listen(page, id);
    // From #0f766e: deleting the last digit emits input once with the empty string; typing it back, once with #0f766e.
    await focusInput(page, id);
    await page.keyboard.press('End');
    await page.keyboard.press('Backspace');
    expect(await read(page, id)).toMatchObject({ value: '', text: '#0f766' });
    expect(await heard(page)).toEqual(['input ']);
    await page.keyboard.type('e');
    expect(await read(page, id)).toMatchObject({ value: '#0f766e', text: '#0f766e' });
    expect(await heard(page)).toEqual(['input #0f766e']);
    // A seventh digit: input with the empty string, and no error while the input has focus.
    await page.keyboard.type('8');
    expect(await read(page, id)).toMatchObject({ value: '', text: '#0f766e8', invalid: false, supporting: '' });
    expect(await heard(page)).toEqual(['input ']);
    // Edits that leave value as it was say nothing: more characters that are not a color, in any number.
    await page.keyboard.type('0 and a good many more characters, none of them refused');
    expect(await read(page, id)).toMatchObject({ value: '', text: '#0f766e80 and a good many more characters, none of them refused' });
    expect(await heard(page)).toEqual([]);
    // Capitals and no number sign are a color while they are typed, and are not rewritten under the person's hands.
    await retype(page, id, 'ABCDEF');
    expect(await read(page, id)).toMatchObject({ value: '#abcdef', text: 'ABCDEF' });
    expect(await heard(page), 'six keys: empty once, then the color once').toEqual(['input #abcdef']);
    // The caret stays where the person put it.
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.type('0');
    expect(await read(page, id)).toMatchObject({ text: 'ABCD0EF', caret: [5, 5], value: '' });
    // Cutting everything is an edit too.
    await retype(page, id, '');
    expect(await read(page, id)).toMatchObject({ value: '', text: '' });
    // The value is the new one before the event has reached the element: a capturing listener on an ancestor reads it
    // and hears the one `input` of an edit that changed the value — the browser's own, once.
    await page.evaluate(() => {
      const w = window as unknown as { __captured: string[] };
      w.__captured = [];
      document.body.addEventListener('input', (event) => w.__captured.push(`${(event.target as HTMLElement & { value: string }).value}|${(event.target as Element).localName}`), true);
    });
    await heard(page);
    await page.keyboard.insertText('#0f766e');
    await settle(page, id);
    expect(await page.evaluate(() => (window as unknown as { __captured: string[] }).__captured)).toEqual(['#0f766e|tanrei-color-input']);
    expect(await heard(page)).toEqual(['input #0f766e']);
    // On one line.
    near((await box(field)).height, (await px(field, 'font-size')) * Number(await css(page.locator('html'), T('input-typescale-medium-line-height'))), 'one line', 1);
  });

  test('CLI-17: while a Japanese input method composes the field reads nothing, says nothing and leaves every key to it; the committed text is read once, when the composition ends; a value the product sets meanwhile waits for the end', async ({ page }) => {
    await mount(page, [fx('one', { value: '#000000' }), fx('two', { value: '#000000' })]);
    await listen(page, 'one');
    await focusInput(page, 'one');
    await selectAll(page, 'one');
    await compose(page, 'one', ['＃', '＃ｆ', 'ffffff']);
    await settle(page, 'one');
    expect(await heard(page), 'nothing is said while it composes').toEqual([]);
    expect(await read(page, 'one')).toMatchObject({ text: 'ffffff', value: '#000000' });
    expect(await composingKey(page, 'one', 'Enter'), 'Enter is the input method’s').toBe(false);
    expect(await read(page, 'one'), 'no key committed').toMatchObject({ text: 'ffffff', value: '#000000' });
    expect(await heard(page)).toEqual([]);
    await endComposition(page, 'one', 'ffffff');
    expect(await heard(page), 'read once, when the composition ends').toEqual(['input #ffffff']);
    expect(await read(page, 'one'), 'and not rewritten').toMatchObject({ text: 'ffffff', value: '#ffffff' });
    await blurInput(page, 'one');
    expect(await read(page, 'one')).toMatchObject({ text: '#ffffff', value: '#ffffff' });
    expect(await heard(page)).toEqual(['change #ffffff']);
    // CLI-21: a value set during a composition is applied when it ends.
    await focusInput(page, 'two');
    await compose(page, 'two', ['あ']);
    await set(page, 'two', { value: '#fde047' });
    expect((await read(page, 'two')).text, 'the composition is left alone').toBe('あ');
    await endComposition(page, 'two', 'あ');
    expect(await read(page, 'two')).toMatchObject({ text: '#fde047', value: '#fde047' });
  });

  test('CLI-17: in Chromium a real composition, driven through the browser’s input method interface, is left to the native element and read when it is confirmed', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'the input method is driven over the DevTools protocol');
    await mount(page, [fx('one', {})]);
    await listen(page, 'one');
    await focusInput(page, 'one');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.imeSetComposition', { text: '0f766e', selectionStart: 6, selectionEnd: 6 });
    await settle(page, 'one');
    expect(await heard(page)).toEqual([]);
    expect((await read(page, 'one')).value).toBe('');
    await cdp.send('Input.insertText', { text: '0f766e' });
    await cdp.detach();
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 30)));
    expect(await read(page, 'one')).toMatchObject({ text: '0f766e', value: '#0f766e' });
    expect(await heard(page)).toEqual(['input #0f766e']);
    await page.keyboard.press('Enter');
    expect(await read(page, 'one')).toMatchObject({ text: '#0f766e', value: '#0f766e' });
  });

  test('CLI-18: " #0F766E ", "0f766e" and "#0f766e" read as #0f766e — typed, or pasted into the text as a text field takes a paste; "#0f7", "#0f766e80", "teal" and "rgb(15, 118, 110)" read as no color', async ({ page }) => {
    await mount(page, [fx('one', {})]);
    for (const text of [' #0F766E ', '0f766e', '#0f766e']) {
      await paste(page, 'one', text);
      expect(await read(page, 'one'), `pasted "${text}"`).toMatchObject({ value: '#0f766e', text });
      await retype(page, 'one', text);
      expect(await read(page, 'one'), `typed "${text}"`).toMatchObject({ value: '#0f766e', text });
    }
    for (const text of ['#0f7', '#0f766e80', 'teal', 'rgb(15, 118, 110)']) {
      await paste(page, 'one', text);
      expect(await read(page, 'one'), `pasted "${text}"`).toMatchObject({ value: '', text, swatch: '' });
    }
    // A paste is inserted where the caret is, and the WHOLE text is read: the digits pasted after a typed number sign.
    await retype(page, 'one', '#');
    await page.keyboard.insertText('0F766E');
    expect(await read(page, 'one')).toMatchObject({ value: '#0f766e', text: '#0F766E' });
    await page.keyboard.insertText('#0f766e');
    expect(await read(page, 'one'), 'a second color after the first is no color').toMatchObject({ value: '', text: '#0F766E#0f766e' });
  });

  test('CLI-19: when the input loses focus or Enter is pressed the text is committed — a color rewritten in the value’s own form, the number sign added, the digits in lowercase, the white space gone; a text that is not a color left as typed; change once while the value differs from the one last committed; inside a form Enter then asks for its submission', async ({ page }) => {
    await mount(page, [fx('one', { value: '#0f766e' }), fx('two', {})]);
    await listen(page, 'one');
    // Leaving with a color in another form: rewritten, and change once.
    await retype(page, 'one', ' ABCDEF ');
    expect(await read(page, 'one')).toMatchObject({ value: '#abcdef', text: ' ABCDEF ' });
    await blurInput(page, 'one');
    expect(await read(page, 'one')).toMatchObject({ value: '#abcdef', text: '#abcdef' });
    expect((await heard(page)).filter((event) => event.startsWith('change'))).toEqual(['change #abcdef']);
    // Enter commits too, and keeps focus; a second Enter and leaving say nothing more.
    await retype(page, 'one', '123456');
    await page.keyboard.press('Enter');
    expect(await read(page, 'one')).toMatchObject({ value: '#123456', text: '#123456', focused: true });
    await page.keyboard.press('Enter');
    await blurInput(page, 'one');
    expect((await heard(page)).filter((event) => event.startsWith('change'))).toEqual(['change #123456']);
    // Edited and brought back to the committed value: no change.
    await retype(page, 'one', '#000000');
    await retype(page, 'one', '#123456');
    await blurInput(page, 'one');
    expect((await heard(page)).filter((event) => !event.startsWith('input'))).toEqual([]);
    // The same color in another form is the same value: rewritten, and no change.
    await retype(page, 'one', '123456');
    await blurInput(page, 'one');
    expect(await read(page, 'one')).toMatchObject({ value: '#123456', text: '#123456' });
    expect((await heard(page)).filter((event) => !event.startsWith('input'))).toEqual([]);
    // Emptied: the value is empty, change once, and no error.
    await retype(page, 'one', '   ');
    await blurInput(page, 'one');
    expect(await read(page, 'one'), 'white space alone is no text').toMatchObject({ value: '', text: '', invalid: false });
    expect((await heard(page)).filter((event) => !event.startsWith('input'))).toEqual(['change ']);
    // Three digits: no color while typed, and on commit the six they stand for — rewritten, input, then change.
    await retype(page, 'one', '#F0a');
    expect(await read(page, 'one'), 'typed: no color yet').toMatchObject({ value: '', text: '#F0a', invalid: false });
    expect(await heard(page), 'and nothing said').toEqual([]);
    await blurInput(page, 'one');
    expect(await read(page, 'one')).toMatchObject({ value: '#ff00aa', text: '#ff00aa', invalid: false });
    expect(await heard(page)).toEqual(['input #ff00aa', 'change #ff00aa']);
    await retype(page, 'one', '');
    await blurInput(page, 'one');
    await heard(page);
    // A text that is not a color: left as typed; the value was empty already, so no change.
    await retype(page, 'one', '#12');
    await blurInput(page, 'one');
    expect(await read(page, 'one')).toMatchObject({ value: '', text: '#12', invalid: true });
    expect((await heard(page)).filter((event) => event.startsWith('change'))).toEqual([]);
    // Inside a form the action key commits and then asks for the submission, as a native input does.
    await page.evaluate(() => {
      document.body.insertAdjacentHTML('beforeend', '<form id="f"><tanrei-color-input id="in-form" name="brand" label="Brand"></tanrei-color-input></form>');
      const w = window as unknown as { __submitted: string[] };
      w.__submitted = [];
      document.querySelector('#f')!.addEventListener('submit', (event) => {
        event.preventDefault();
        w.__submitted.push([...new FormData(event.target as HTMLFormElement).entries()].map(([k, v]) => `${k}=${String(v)}`).join('&'));
      });
    });
    const inForm = page.locator('#in-form');
    await expect(inForm.locator('.input')).toBeVisible();
    await inForm.evaluate((el) => (el as HTMLElement).focus());
    await page.keyboard.type('0F766E');
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => (window as unknown as { __submitted: string[] }).__submitted), 'the committed value is what the form submits').toEqual(['brand=#0f766e']);
    expect(await inForm.locator('.input').evaluate((el) => (el as HTMLInputElement).value)).toBe('#0f766e');
  });

  test('CLI-20: a committed text that is not empty and is not a color is kept as typed, emits entryerror once with the text and invalidText, puts the input in its error condition and is reported to the Field that frames it, which shows and announces invalidText — its own errorText while that is empty; where no Field frames it invalidText is its description; the error ends with the next edit, when the product sets value or when a pick gives a color, and the report is withdrawn; an empty text raises none, and nothing is raised before a commit; without words it still marks itself, and is reported — by the Field when framed', async ({ page }) => {
    const seen = warnings(page);
    const WORDS = 'Enter six hexadecimal digits, like #0f766e.';
    await mount(page, [fx('bare', { invalidText: 'Enter six hexadecimal digits.' }), fx('bare-wordless', {})], { reducedMotion: true });
    await frame(page, 'one', { label: 'Brand color', supportingText: 'The color of the buttons.', requirement: 'required' }, { invalidText: WORDS, picker: true, pickerLabel: 'Choose color' });
    await frame(page, 'fallback', { label: 'Brand color', errorText: 'Check this color.' }, {});
    await frame(page, 'wordless', { label: 'Brand color', supportingText: 'The help.' }, {});
    await stubPicker(page);
    await listen(page, 'one');
    // Type "#0f76e": nothing while typing.
    await retype(page, 'one', '#0f76e');
    expect(await read(page, 'one'), 'a person who is still typing is not in error').toMatchObject({ invalid: false, supporting: 'The color of the buttons.' });
    expect(await heard(page)).toEqual([]);
    // Leave the input: the text stays, the input is invalid, the Field shows invalidText, entryerror carries the text.
    await blurInput(page, 'one');
    expect(await read(page, 'one')).toMatchObject({ text: '#0f76e', value: '', invalid: true, supporting: WORDS });
    expect(await heard(page)).toEqual([`entryerror #0f76e|${WORDS}`]);
    await expect(part(page, 'one', '.field')).toHaveAttribute('data-error', '');
    await expect(row(page, 'one', '.frame'), 'the Field is in its error condition').toHaveAttribute('data-error', '');
    expect(await css(row(page, 'one', '.error-text'), 'color'), 'drawn exactly as while error is true').toBe(await resolveColor(page, '--tanrei-comp-field-standard-error-text-color'));
    await expect(row(page, 'one', '.supporting-text'), 'in the help’s place (FLD-7)').toHaveCount(0);
    expect(await css(part(page, 'one', '.edge'), 'border-top-color')).toBe(await color(page, 'stacked-error-outline-color'));
    expect(await host(page, 'one').evaluate((el) => [(el as HTMLElement & { error: boolean }).error, el.hasAttribute('error')]), 'it never sets error').toEqual([false, false]);
    expect(await fieldOf(page, 'one').evaluate((el) => [(el as HTMLElement & { error: boolean }).error, el.hasAttribute('error')]), 'nor its Field’s').toEqual([false, false]);
    expect(await description(page, 'one'), 'the Field gives the words back in the description, once, in its help’s place').toBe(WORDS);
    const validity = () => host(page, 'one').evaluate((el) => { const v = (el as unknown as HTMLInputElement).validity; return { bad: v.badInput, missing: v.valueMissing, message: (el as unknown as HTMLInputElement).validationMessage }; });
    expect(await validity(), 'badInput while it lasts').toEqual({ bad: true, missing: true, message: WORDS });
    // Entering and leaving again without an edit raises nothing more.
    await focusInput(page, 'one');
    await page.keyboard.press('Enter');
    await blurInput(page, 'one');
    expect(await heard(page)).toEqual([]);
    expect((await read(page, 'one')).invalid).toBe(true);
    // One more character: the error is gone, and the Field shows its help again.
    await focusInput(page, 'one');
    await page.keyboard.press('End');
    await page.keyboard.type('x');
    expect(await read(page, 'one')).toMatchObject({ text: '#0f76ex', invalid: false, supporting: 'The color of the buttons.' });
    await expect(row(page, 'one', '.frame')).not.toHaveAttribute('data-error', '');
    expect((await validity()).bad).toBe(false);
    // By Enter, with focus in the input: the Field announces the words. Then ended by the product setting value.
    await page.keyboard.press('Enter');
    expect(await read(page, 'one')).toMatchObject({ invalid: true, focused: true });
    expect(await heard(page)).toEqual([`entryerror #0f76ex|${WORDS}`]);
    await expect.poll(() => row(page, 'one', '.announcer').evaluate((el) => el.textContent ?? '')).toBe(WORDS);
    await set(page, 'one', { value: '#0f766e' });
    expect(await read(page, 'one')).toMatchObject({ text: '#0f766e', value: '#0f766e', invalid: false, supporting: 'The color of the buttons.' });
    // Ended by a pick.
    await retype(page, 'one', 'nope');
    await blurInput(page, 'one');
    expect((await read(page, 'one')).invalid).toBe(true);
    await pickerButton(page, 'one').click();
    await report(page, 'one', 'input', '#ff0000');
    expect(await read(page, 'one')).toMatchObject({ text: '#ff0000', value: '#ff0000', invalid: false, supporting: 'The color of the buttons.' });
    // An empty text raises none, though its Field says it is required.
    await retype(page, 'one', '');
    await blurInput(page, 'one');
    expect(await read(page, 'one')).toMatchObject({ invalid: false, value: '' });
    expect((await heard(page)).filter((event) => event.startsWith('entryerror')), 'one entry error since the last look: "nope"').toEqual([`entryerror nope|${WORDS}`]);
    // The Field's errorText while invalidText is empty — and the event carries the input's own words: none.
    await listen(page, 'fallback');
    await retype(page, 'fallback', 'teal');
    await blurInput(page, 'fallback');
    expect(await read(page, 'fallback')).toMatchObject({ invalid: true, supporting: 'Check this color.' });
    expect(await heard(page)).toEqual(['entryerror teal|']);
    expect(await host(page, 'fallback').evaluate((el) => (el as unknown as HTMLInputElement).validationMessage), 'the form is told what the Field shows').toBe('Check this color.');
    // Neither: the input still marks itself, the help stays in the Field's row, and the Field says so in a debug build.
    await listen(page, 'wordless');
    await retype(page, 'wordless', 'teal');
    await blurInput(page, 'wordless');
    expect(await read(page, 'wordless')).toMatchObject({ invalid: true, supporting: 'The help.' });
    expect(await heard(page)).toEqual(['entryerror teal|']);
    expect(await host(page, 'wordless').evaluate((el) => (el as unknown as HTMLInputElement).validationMessage)).not.toBe('');
    await expect.poll(() => seen.some((w) => w.includes('FLD-28') && w.includes('words'))).toBe(true);
    expect(seen.filter((w) => w.includes('CLI-20')), 'framed, the report is the Field’s').toEqual([]);
    // No Field: invalidText is the input's description while the error lasts, and goes with it.
    await listen(page, 'bare');
    await retype(page, 'bare', 'teal');
    expect(await description(page, 'bare')).toBe('');
    await blurInput(page, 'bare');
    expect(await read(page, 'bare')).toMatchObject({ invalid: true, text: 'teal' });
    expect([await input(page, 'bare').getAttribute('aria-describedby'), await description(page, 'bare')]).toEqual(['description', 'Enter six hexadecimal digits.']);
    expect(await heard(page)).toEqual(['entryerror teal|Enter six hexadecimal digits.']);
    expect(await host(page, 'bare').evaluate((el) => { const v = (el as unknown as HTMLInputElement).validity; return [v.badInput, v.valueMissing, (el as unknown as HTMLInputElement).validationMessage]; })).toEqual([true, false, 'Enter six hexadecimal digits.']);
    await retype(page, 'bare', 'tea');
    expect([(await read(page, 'bare')).invalid, await description(page, 'bare')]).toEqual([false, '']);
    // No Field and no words: it marks itself, tells the form in the browser's own words, and says so in a debug build.
    await retype(page, 'bare-wordless', 'teal');
    await blurInput(page, 'bare-wordless');
    expect([(await read(page, 'bare-wordless')).invalid, await description(page, 'bare-wordless')]).toEqual([true, '']);
    expect(await host(page, 'bare-wordless').evaluate((el) => (el as unknown as HTMLInputElement).validationMessage)).not.toBe('');
    await expect.poll(() => seen.filter((w) => w.includes('CLI-20')).length).toBe(1);
  });

  test('CLI-21: a value the product sets is shown in the input and the swatch, ends an entry error and emits nothing; a color in another form is held in the value’s own; a text that is not a color is treated as empty and reported; a value that is what value already is leaves the text as the person typed it', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('one', { value: '#0f766e' })]);
    await listen(page, 'one');
    await set(page, 'one', { value: '#fde047' });
    expect(await read(page, 'one')).toMatchObject({ value: '#fde047', text: '#fde047', swatch: rgb('#fde047') });
    await set(page, 'one', { value: '0F766E' });
    expect(await read(page, 'one'), 'held in the value’s own form').toMatchObject({ value: '#0f766e', text: '#0f766e', swatch: rgb('#0f766e') });
    await host(page, 'one').evaluate((el) => el.setAttribute('value', ' #ABCDEF '));
    expect(await read(page, 'one'), 'the attribute too').toMatchObject({ value: '#abcdef', text: '#abcdef' });
    await set(page, 'one', { value: 'teal' });
    expect(await read(page, 'one'), 'not a color: empty').toMatchObject({ value: '', text: '', swatch: '' });
    await expect.poll(() => seen.some((w) => w.includes('CLI-21') && w.includes('teal'))).toBe(true);
    // An entry error ends.
    await retype(page, 'one', '#12');
    await blurInput(page, 'one');
    expect((await read(page, 'one')).invalid).toBe(true);
    await heard(page);
    await set(page, 'one', { value: '#123456' });
    expect(await read(page, 'one')).toMatchObject({ value: '#123456', text: '#123456', invalid: false });
    // The product echoes the empty value back while the person is half-way through a color: the text stays.
    await retype(page, 'one', '#0f7');
    expect((await heard(page)).filter((event) => event.startsWith('input'))).toEqual(['input ']);
    await set(page, 'one', { value: '' });
    expect(await read(page, 'one'), 'what was typed is kept').toMatchObject({ value: '', text: '#0f7', focused: true });
    // The same color in another form is what value already is.
    await retype(page, 'one', 'abcdef');
    await heard(page);
    await set(page, 'one', { value: '#ABCDEF' });
    expect(await read(page, 'one')).toMatchObject({ value: '#abcdef', text: 'abcdef' });
    await blurInput(page, 'one');
    await heard(page);
    // Nothing the product set was said.
    for (const value of ['#000000', '', '#ffffff', 'nope']) await set(page, 'one', { value });
    expect(await heard(page)).toEqual([]);
    // A set value is the one last committed: leaving without an edit says nothing.
    await set(page, 'one', { value: '#0f766e' });
    await focusInput(page, 'one');
    await blurInput(page, 'one');
    expect(await heard(page)).toEqual([]);
  });

  test('CLI-22: hovered and focused draw every part of the field from that state’s tokens, focused over hovered, however focus was gained and not while the picker button has it; a stacked color field draws no edge at rest and its focused line inside its edge, taking no room; the state layer is on the container and never on the swatch; selected text takes selection.color; states change over motion.state-*, at once where motion is reduced', async ({ page }) => {
    await mount(page, [fx('one', { value: '#0f766e', picker: true, pickerLabel: 'Choose color' }), fx('error', { value: '#0f766e', error: true }), fx('other', {})], { system: 'm3-like', reducedMotion: true });
    const edge = part(page, 'one', '.edge');
    const height = (await box(container(page, 'one'))).height;
    expect(await css(edge, 'border-top-color'), 'no edge at rest').toBe('rgba(0, 0, 0, 0)');
    // Hovered: the state layer on the container — and the swatch exactly the value still.
    const c = await box(container(page, 'one'));
    await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2);
    await expect.poll(() => css(container(page, 'one'), 'background-color')).toBe(await color(page, 'stacked-hovered-container-color'));
    expect(await color(page, 'stacked-hovered-container-color'), 'the hovered container differs: the state layer is in it').not.toBe(await color(page, 'stacked-container-color'));
    expect(await css(edge, 'border-top-color')).toBe(await color(page, 'stacked-hovered-outline-color'));
    expect((await read(page, 'one')).swatch, 'hovered: the swatch is the value').toBe(rgb('#0f766e'));
    // Focused by the keyboard, the pointer still over it: focused wins.
    await tabTo(page, input(page, 'one'));
    expect(await css(container(page, 'one'), 'background-color')).toBe(await color(page, 'stacked-focused-container-color'));
    expect(await css(edge, 'border-top-color')).toBe(await color(page, 'stacked-focused-outline-color'));
    near(await px(edge, 'border-top-width'), await token(page, 'focused-outline-width'), 'the focused width');
    expect(await css(input(page, 'one'), 'caret-color')).toBe(await color(page, 'stacked-focused-caret-color'));
    expect(await css(input(page, 'one'), 'color')).toBe(await color(page, 'stacked-focused-input-color'));
    near((await box(container(page, 'one'))).height, height, 'the line takes no layout space');
    expect((await read(page, 'one')).swatch, 'focused: the swatch is the value').toBe(rgb('#0f766e'));
    // The picker button's focus is its own: the field is not focused while it has it.
    await page.mouse.move(5, 5);
    await tab(page);
    expect((await read(page, 'one')).onButton).toBe(true);
    await expect(part(page, 'one', '.field')).not.toHaveAttribute('data-focused', '');
    expect(await css(edge, 'border-top-color')).toBe(await color(page, 'stacked-outline-color'));
    // By pointer: a press in the input selects the focused state too.
    await input(page, 'one').click();
    expect(await css(edge, 'border-top-color')).toBe(await color(page, 'stacked-focused-outline-color'));
    // In error: the error parts, at rest and focused, and the swatch as it is.
    expect(await css(part(page, 'error', '.edge'), 'border-top-color')).toBe(await color(page, 'stacked-error-outline-color'));
    near(await px(part(page, 'error', '.edge'), 'border-top-width'), await token(page, 'outline-width'), 'in error: outline.width at rest');
    await focusInput(page, 'error');
    expect(await css(input(page, 'error'), 'caret-color')).toBe(await color(page, 'stacked-focused-error-caret-color'));
    expect((await read(page, 'error')).swatch, 'in error: the swatch is the value').toBe(rgb('#0f766e'));
    // Selected text: selection.color under selection.content.color.
    expect(await input(page, 'one').evaluate((el) => [getComputedStyle(el, '::selection').backgroundColor, getComputedStyle(el, '::selection').color])).toEqual([await color(page, 'selection-color'), await color(page, 'selection-content-color')]);
    // The motion: the state duration, and none where motion is reduced.
    expect(await px(container(page, 'one'), 'transition-duration'), 'reduced: at once').toBe(0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    near((await px(container(page, 'one'), 'transition-duration')) * 1000, await duration(page, 'motion-state-duration'), 'the container', 1);
    near((await px(edge, 'transition-duration')) * 1000, await duration(page, 'motion-state-duration'), 'the edge', 1);
  });

  test('CLI-23: the focused edge is the focus indicator — under the default system the focus-ring role at the thick width, by keyboard and by pointer — and no ring is drawn around the container or the input; where the focus style is glow the glow is drawn around the container too', async ({ page }) => {
    await mount(page, [fx('one', { value: '#0f766e' }), fx('other', {})], { reducedMotion: true });
    const edge = part(page, 'one', '.edge');
    expect(await css(edge, 'border-top-color'), 'no edge at rest').toBe(await color(page, 'stacked-outline-color'));
    for (const how of ['keyboard', 'pointer'] as const) {
      if (how === 'keyboard') await tabTo(page, input(page, 'one'));
      else await input(page, 'one').click();
      expect(await css(edge, 'border-top-color'), how).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
      near(await px(edge, 'border-top-width'), await resolveToken(page, '--tanrei-sys-border-thick'), `${how}: the thick width`);
      expect([await css(input(page, 'one'), 'outline-style'), await css(container(page, 'one'), 'outline-style')], `${how}: no ring`).toEqual(['none', 'none']);
      await focusInput(page, 'other');
      expect(await css(edge, 'border-top-color'), `${how}: gone when focus leaves`).toBe(await color(page, 'stacked-outline-color'));
    }
    // Glow: the halo around the container while focused, and still no ring.
    await mount(page, [fx('one', { value: '#0f766e' })], { system: 'acme', systemCss: await acmeSystemCss() });
    await tabTo(page, input(page, 'one'));
    await expect.poll(() => container(page, 'one').evaluate((el) => getComputedStyle(el, '::after').boxShadow !== 'none' || getComputedStyle(el).boxShadow !== 'none')).toBe(true);
    expect(await css(container(page, 'one'), 'outline-style')).toBe('none');
    expect(await part(page, 'one', '.field').getAttribute('data-focus-style')).toBe('glow');
  });

  test('CLI-24: the hit area reaches the minimum target without changing the visual size; a press anywhere on the color input outside its picker button — the container’s padding, the swatch while no picker button is shown, a floating label — focuses the input, changes nothing and draws no press answer', async ({ page }) => {
    await mount(page, [fx('one', { value: '#0f766e', picker: true, pickerLabel: 'Choose color' }), fx('plain', { value: '#0f766e' }), fx('floating', { variant: 'outlined' })], { reducedMotion: true });
    await stubPicker(page);
    // The swatch, while no picker button is shown.
    await listen(page, 'plain');
    await pressOn(swatch(page, 'plain'));
    let now = await read(page, 'plain');
    expect(now, 'the swatch').toMatchObject({ focused: true, value: '#0f766e', text: '#0f766e' });
    expect(now.caret[0], 'nothing is selected').toBe(now.caret[1]);
    await blurInput(page, 'plain');
    expect([await heard(page), await shown(page)], 'a press on the swatch of a field without a picker button asks for no picker').toEqual([[], []]);
    expect(await css(swatch(page, 'plain'), 'pointer-events'), 'the swatch is no target of its own').toBe('none');
    await listen(page, 'one');
    // The container's padding: its first pixels, before the swatch.
    const c = await box(container(page, 'one'));
    await page.mouse.click(c.x + 3, c.y + c.height / 2);
    now = await read(page, 'one');
    expect(now, 'the padding').toMatchObject({ focused: true, value: '#0f766e' });
    await blurInput(page, 'one');
    // A floating label, resting in the input line: a press on it is a press on the box.
    await pressOn(part(page, 'floating', '.floating'));
    expect((await read(page, 'floating')).focused, 'the floating label').toBe(true);
    await blurInput(page, 'floating');
    // A press in the input places the caret.
    await input(page, 'one').click();
    expect((await read(page, 'one')).focused, 'the input').toBe(true);
    await blurInput(page, 'one');
    expect(await heard(page)).toEqual([]);
    expect(await shown(page)).toEqual([]);
    expect(await container(page, 'one').getAttribute('data-pressed'), 'no press answer').toBeNull();
    // The hit area: the container's ::before reaches the minimum target, and the container keeps its height.
    const target = await resolveToken(page, '--tanrei-sys-target-pointer');
    expect(await container(page, 'one').evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').height))).toBeGreaterThanOrEqual(target - 0.6);
    await override(page, { [T('container-height-medium')]: '32px', [T('container-padding-block-medium')]: '0px' });
    await frames(page);
    near((await box(container(page, 'one'))).height, 32, 'a short container stays short');
    expect(await container(page, 'one').evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').height)), 'and its hit area reaches the target').toBeGreaterThanOrEqual(target - 0.6);
    // The picker button keeps its own press.
    await pickerButton(page, 'one').click();
    expect(await heard(page)).toEqual(['pickerrequest #0f766e']);
  });
});

test.describe('behavior: the swatch and the picker', () => {
  test('CLI-25: the swatch is a square of swatch.size with corners swatch.shape, filled with exactly the value and edged inside its size by a line swatch.outline.width wide in swatch.outline.color, over the fill; empty it is that edge alone; nothing is mixed into its fill while hovered, focused or in error; it is not a control and is kept from assistive technology', async ({ page }) => {
    await mountSpec(page, ['stacked-filled', 'stacked-large', 'stacked-white', 'stacked-black', 'stacked-empty', 'stacked-error']);
    for (const [id, size, value] of [['stacked-filled', 'medium', '#0f766e'], ['stacked-large', 'large', '#0f766e'], ['stacked-white', 'medium', '#ffffff'], ['stacked-black', 'medium', '#000000'], ['stacked-error', 'medium', '#fde047']] as const) {
      const s = await box(swatch(page, id));
      near(s.width, await token(page, `icon-size-${size}`), `${id}: swatch.size`);
      near(s.height, await token(page, `icon-size-${size}`), `${id}: a square`);
      expect((await read(page, id)).swatch, `${id}: exactly the value`).toBe(rgb(value));
      near(await px(swatch(page, id), 'border-top-left-radius'), await token(page, 'swatch-shape'), `${id}: swatch.shape`);
      near(await px(swatch(page, id), 'border-top-width'), await token(page, 'swatch-outline-width'), `${id}: swatch.outline.width`);
      expect(await css(swatch(page, id), 'border-top-color'), `${id}: swatch.outline.color`).toBe(await color(page, 'swatch-outline-color'));
      // Inside its size, and over the fill: a border in a border box, which the fill runs under.
      expect([await css(swatch(page, id), 'box-sizing'), await css(swatch(page, id), 'border-top-style'), await css(swatch(page, id), 'background-clip')], id).toEqual(['border-box', 'solid', 'border-box']);
      // Nothing is mixed in: no opacity, no shadow, no filter, no image, no layer of its own, no motion.
      expect(await swatch(page, id).evaluate((el) => { const s = getComputedStyle(el); return [s.opacity, s.boxShadow, s.filter, s.backgroundImage, s.mixBlendMode, getComputedStyle(el, '::before').content, getComputedStyle(el, '::after').content]; }), id).toEqual(['1', 'none', 'none', 'none', 'normal', 'none', 'none']);
    }
    // The swatch's computed fill equals value while the field is hovered, focused and in error.
    const c = await box(container(page, 'stacked-filled'));
    await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2);
    await expect.poll(() => css(container(page, 'stacked-filled'), 'background-color')).toBe(await color(page, 'stacked-hovered-container-color'));
    expect((await read(page, 'stacked-filled')).swatch, 'hovered').toBe(rgb('#0f766e'));
    await focusInput(page, 'stacked-filled');
    expect((await read(page, 'stacked-filled')).swatch, 'focused').toBe(rgb('#0f766e'));
    await set(page, 'stacked-filled', { error: true });
    expect((await read(page, 'stacked-filled')).swatch, 'in error').toBe(rgb('#0f766e'));
    // The white swatch is bounded by its edge on the light scheme's container.
    expect(await css(swatch(page, 'stacked-white'), 'border-top-color'), 'the edge differs from white').not.toBe(rgb('#ffffff'));
    expect(await css(swatch(page, 'stacked-white'), 'border-top-color'), 'and from the container').not.toBe(await css(container(page, 'stacked-white'), 'background-color'));
    // Empty — no text, or a text that reads as no color: no fill, the container showing through, and the same edge.
    const empty = swatch(page, 'stacked-empty');
    expect([await css(empty, 'background-color'), await css(empty, 'background-image')], 'no fill').toEqual(['rgba(0, 0, 0, 0)', 'none']);
    near(await px(empty, 'border-top-width'), await token(page, 'swatch-outline-width'), 'the same edge');
    expect(await css(empty, 'border-top-color')).toBe(await color(page, 'swatch-outline-color'));
    await retype(page, 'stacked-filled', '#0f7');
    expect((await read(page, 'stacked-filled')).swatch, 'a text that is no color: empty').toBe('');
    expect(await css(swatch(page, 'stacked-filled'), 'background-color')).toBe('rgba(0, 0, 0, 0)');
    // Not a control, and not exposed.
    expect(await swatch(page, 'stacked-white').evaluate((el) => [el.localName, el.getAttribute('aria-hidden'), el.getAttribute('role'), (el as HTMLElement).tabIndex, el.getAttribute('data-tanrei-shape') !== null])).toEqual(['span', 'true', null, -1, true]);
    // The black swatch is bounded by its edge on the dark scheme's container.
    await mountSpec(page, ['stacked-black'], { theme: 'dark' });
    expect((await read(page, 'stacked-black')).swatch).toBe(rgb('#000000'));
    expect(await css(swatch(page, 'stacked-black'), 'border-top-color'), 'the edge differs from black').not.toBe(rgb('#000000'));
    expect(await css(swatch(page, 'stacked-black'), 'border-top-color')).not.toBe(await css(container(page, 'stacked-black'), 'background-color'));
  });

  test('CLI-25: while the picker button is shown, a press on the swatch does what a press on the picker button does — pickerrequest once, then the browser’s picker — and the swatch takes no focus and draws no answer; disabled, it does nothing; without the picker button it focuses the input (CLI-24)', async ({ page }) => {
    await mountSpec(page, ['stacked-picker', 'stacked-picker-disabled'], { reducedMotion: true });
    await stubPicker(page);
    const id = 'stacked-picker';
    await listen(page, id);
    const before = await swatch(page, id).evaluate((el) => { const s = getComputedStyle(el); return [s.backgroundColor, s.borderTopColor, s.opacity, s.outlineStyle]; });
    await pressOn(swatch(page, id));
    expect(await heard(page), 'the picker button’s request').toEqual(['pickerrequest #0f766e']);
    expect(await shown(page), 'and the browser’s picker').toEqual(['color #0f766e']);
    expect((await read(page, id)).focused, 'the input is not focused').toBe(false);
    expect(await host(page, id).evaluate((el) => el.shadowRoot!.activeElement?.classList.contains('swatch') ?? false), 'the swatch takes no focus').toBe(false);
    expect(await swatch(page, id).evaluate((el) => (el as HTMLElement).tabIndex), 'and is no stop').toBe(-1);
    expect(await swatch(page, id).evaluate((el) => { const s = getComputedStyle(el); return [s.backgroundColor, s.borderTopColor, s.opacity, s.outlineStyle]; }), 'no answer of its own').toEqual(before);
    expect(await container(page, id).getAttribute('data-pressed'), 'no press answer').toBeNull();
    // Disabled: nothing.
    await listen(page, 'stacked-picker-disabled');
    await pressOn(swatch(page, 'stacked-picker-disabled'));
    expect([await heard(page), await shown(page)]).toEqual([[], []]);
  });

  test('CLI-25: a swatch.shape of the full step draws the swatch round, never with a radius of more than half its side', async ({ page }) => {
    await mountSpec(page, ['stacked-filled']);
    await override(page, { [T('swatch-shape')]: '9999px', [T('swatch-shape-pill')]: '1' });
    await frames(page);
    const round = await swatch(page, 'stacked-filled').evaluate((el) => {
      const b = el.getBoundingClientRect();
      // A corner's own pixel is outside a round swatch: nothing of the swatch is hit there.
      const style = getComputedStyle(el);
      return { radius: Number.parseFloat(style.borderTopLeftRadius), side: b.width };
    });
    expect(round.radius, 'the browser holds the radius to half the side when it draws').toBeGreaterThanOrEqual(round.side / 2);
    near((await box(swatch(page, 'stacked-filled'))).width, await token(page, 'icon-size-medium'), 'and the swatch keeps its size');
  });

  test('CLI-26: when value changes — by an edit of the text, by a pick or because the product set it — the swatch is drawn in the new value at once, without a motion, so the sample and the text never disagree', async ({ page }) => {
    await mount(page, [fx('one', { value: '#0f766e', picker: true, pickerLabel: 'Choose color' })]);
    await stubPicker(page);
    expect(await swatch(page, 'one').evaluate((el) => { const s = getComputedStyle(el); return [s.transitionDuration, s.transitionDelay, s.animationName]; }), 'no motion of any kind').toEqual(['0s', '0s', 'none']);
    // Every keystroke: the sample is the color the text reads as, or empty — in the same task.
    await focusInput(page, 'one');
    await selectAll(page, 'one');
    const seen: [string, string][] = [];
    for (const key of '#fde047') {
      await page.keyboard.type(key);
      const now = await read(page, 'one');
      seen.push([now.text, now.swatch]);
    }
    expect(seen.map(([, sample]) => sample)).toEqual(['', '', '', '', '', '', rgb('#fde047')]);
    await page.keyboard.press('Backspace');
    expect((await read(page, 'one')).swatch).toBe('');
    await set(page, 'one', { value: '#123456' });
    expect(await read(page, 'one')).toMatchObject({ text: '#123456', swatch: rgb('#123456') });
    await pickerButton(page, 'one').click();
    await report(page, 'one', 'input', '#ff00ff');
    expect(await read(page, 'one')).toMatchObject({ text: '#ff00ff', swatch: rgb('#ff00ff') });
  });

  test('CLI-27: with picker the field draws a picker button at the end of its container — an icon-only text Button of the field’s size name showing the palette glyph, never mirrored — named by pickerLabel, exposed as opening a dialog, a focus stop after the input and disabled with the field; without picker there is none and pickerLabel is ignored; an empty pickerLabel is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      ...spec.fixtures.filter((f) => ['stacked-picker', 'stacked-picker-large', 'stacked-picker-disabled', 'stacked-picker-rtl', 'stacked-filled'].includes(f.id)),
      fx('ignored', { pickerLabel: 'Choose color' }),
      fx('unnamed', { picker: true }),
      fx('layer', { picker: true, pickerLabel: 'Choose color', size: 'huge' }),
    ]);
    for (const [id, size] of [['stacked-picker', 'medium'], ['stacked-picker-large', 'large'], ['layer', 'medium']] as const) {
      const button = pickerButton(page, id);
      expect(await button.evaluate((el) => [el.localName, el.getAttribute('variant'), el.getAttribute('size'), el.getAttribute('label')]), id).toEqual(['tanrei-button', 'text', size, 'Choose color']);
      const native = button.locator('button');
      expect(await native.evaluate((el) => [el.getAttribute('aria-label'), el.getAttribute('aria-haspopup'), (el as HTMLButtonElement).disabled, el.tabIndex]), id).toEqual(['Choose color', 'dialog', false, 0]);
      near((await box(button)).height, await resolveToken(page, `--tanrei-comp-button-container-height-${size}`), `${id}: Button’s own size`);
      await expect(button.locator('.picker-glyph .ink')).toHaveText('palette');
      await expect.poll(() => button.locator('.picker-glyph').evaluate((el) => el.hasAttribute('data-drawn')), { message: `${id}: the glyph is drawn` }).toBe(true);
    }
    // It is a Button in every respect: its own tokens, not the field's.
    expect(await css(pickerButton(page, 'stacked-picker').locator('[part="container"]'), 'color')).toBe(await resolveColor(page, '--tanrei-comp-button-text-label-color'));
    // At the end of the container, after the input.
    const [field, button, c] = [await box(input(page, 'stacked-picker')), await box(pickerButton(page, 'stacked-picker')), await box(container(page, 'stacked-picker'))];
    expect(button.x, 'after the input').toBeGreaterThanOrEqual(field.x + field.width - 0.6);
    expect(button.x + button.width / 2, 'in the container’s last part').toBeGreaterThan(c.x + c.width - 2 * (await token(page, 'icon-size-medium')));
    // The palette glyph is never mirrored, in a right-to-left layout either.
    const mirrored = (locator: Locator) => locator.evaluate((el) => getComputedStyle(el).transform !== 'none' || getComputedStyle(el).scale !== 'none');
    for (const selector of ['.picker-glyph', '.picker-glyph .ink']) expect(await mirrored(pickerButton(page, 'stacked-picker-rtl').locator(selector)), selector).toBe(false);
    // A focus stop after the input.
    await tabTo(page, input(page, 'stacked-picker'));
    await tab(page);
    expect((await read(page, 'stacked-picker')).onButton).toBe(true);
    // Disabled with the field.
    expect(await pickerButton(page, 'stacked-picker-disabled').locator('button').evaluate((el) => (el as HTMLButtonElement).disabled)).toBe(true);
    expect(await part(page, 'stacked-picker-disabled', '.native-picker').evaluate((el) => (el as HTMLInputElement).disabled)).toBe(true);
    // Without picker: no button, no native picker, and the input ends at the text padding (CLI-1).
    for (const id of ['stacked-filled', 'ignored']) {
      await expect(part(page, id, '.picker-button, .native-picker, .picker'), id).toHaveCount(0);
      const [b, f] = [await box(container(page, id)), await box(input(page, id))];
      near(b.x + b.width - (f.x + f.width), await token(page, 'container-padding-inline-medium'), `${id}: the end padding`);
    }
    await expect.poll(() => seen.some((w) => w.includes('CLI-27') && w.includes('pickerLabel'))).toBe(true);
    expect(seen.filter((w) => w.includes('CLI-27')).length, 'only the unnamed one').toBe(1);
  });

  test('CLI-28: activating the picker button — by a press, Enter or Space — emits pickerrequest exactly once with value and then presents the browser’s own color picker showing value, or black while the field holds none; with the request cancelled no picker opens, nothing changes and focus stays on the picker button; where the browser has no picker nothing is presented', async ({ page }) => {
    await mountSpec(page, ['stacked-picker', 'stacked-picker-empty', 'stacked-picker-disabled']);
    await stubPicker(page);
    const id = 'stacked-picker';
    await listen(page, id);
    await pickerButton(page, id).click();
    expect(await heard(page)).toEqual(['pickerrequest #0f766e']);
    expect(await shown(page), 'the browser’s picker, showing the value').toEqual(['color #0f766e']);
    expect(await read(page, id), 'nothing changed').toMatchObject({ value: '#0f766e', text: '#0f766e' });
    for (const key of ['Enter', 'Space']) {
      await pickerButton(page, id).locator('button').focus();
      await page.keyboard.press(key);
      expect(await heard(page), key).toEqual(['pickerrequest #0f766e']);
      expect(await shown(page), key).toEqual(['color #0f766e']);
    }
    // The browser's color input is under the picker button — where the browser anchors its picker — never seen, never a stop.
    const native = part(page, id, '.native-picker');
    expect(await native.evaluate((el) => [(el as HTMLInputElement).type, el.getAttribute('aria-hidden'), el.tabIndex, getComputedStyle(el).visibility, getComputedStyle(el).pointerEvents])).toEqual(['color', 'true', -1, 'hidden', 'none']);
    const [n, slot] = [await native.evaluate((el) => { const b = el.getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; }), await box(part(page, id, '.picker'))];
    expect(n.map((value) => Math.round(value))).toEqual([slot.x, slot.y, slot.width, slot.height].map((value) => Math.round(value)));
    // Empty: the picker's own starting color.
    await listen(page, 'stacked-picker-empty');
    await pickerButton(page, 'stacked-picker-empty').click();
    expect(await heard(page)).toEqual(['pickerrequest ']);
    expect(await shown(page)).toEqual(['color #000000']);
    expect(await read(page, 'stacked-picker-empty'), 'presenting it changes nothing').toMatchObject({ value: '', text: '', swatch: '' });
    // Disabled: nothing.
    await listen(page, 'stacked-picker-disabled');
    await pickerButton(page, 'stacked-picker-disabled').click({ force: true });
    expect([await heard(page), await shown(page)]).toEqual([[], []]);
    // Cancelled: the product presents its own surface. No picker opens, nothing changes, focus stays on the button.
    await mountSpec(page, ['stacked-picker']);
    await stubPicker(page);
    await listen(page, id, { cancel: true });
    await pickerButton(page, id).locator('button').focus();
    await page.keyboard.press('Enter');
    expect(await heard(page)).toEqual(['pickerrequest #0f766e']);
    expect(await shown(page), 'no browser picker').toEqual([]);
    expect(await read(page, id)).toMatchObject({ value: '#0f766e', text: '#0f766e', onButton: true });
    // …and sets value to what was picked (CLI-21): shown, and nothing said.
    await set(page, id, { value: '#fde047' });
    expect(await read(page, id)).toMatchObject({ value: '#fde047', text: '#fde047', swatch: rgb('#fde047'), onButton: true });
    expect(await heard(page)).toEqual([]);
    // A browser that refuses to present a picker: nothing is presented, nothing changes, no focus moves.
    await mountSpec(page, ['stacked-picker']);
    await stubPicker(page, { refuses: true });
    await listen(page, id);
    await pickerButton(page, id).locator('button').focus();
    await page.keyboard.press('Enter');
    expect(await heard(page)).toEqual(['pickerrequest #0f766e']);
    expect(await read(page, id)).toMatchObject({ value: '#0f766e', onButton: true });
    // A browser without showPicker(): the color input is activated in its place.
    await mountSpec(page, ['stacked-picker']);
    await stubPicker(page, { missing: true });
    await listen(page, id);
    await pickerButton(page, id).click();
    expect([await heard(page), await shown(page)]).toEqual([['pickerrequest #0f766e'], ['color #0f766e']]);
  });

  test('CLI-28: the browser’s own picker is asked for inside the press’s user activation, and the browser takes the request', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium’s picker is a part of the page a headless run can open and close');
    await mountSpec(page, ['stacked-picker']);
    const id = 'stacked-picker';
    // Recorded around the real call: what it was given, and whether the browser refused it.
    await page.evaluate(() => {
      const w = window as unknown as { __calls: string[] };
      w.__calls = [];
      const real = HTMLInputElement.prototype.showPicker;
      HTMLInputElement.prototype.showPicker = function (this: HTMLInputElement) {
        const active = navigator.userActivation?.isActive ?? '';
        try {
          real.call(this);
          w.__calls.push(`shown ${this.value} ${active}`);
        } catch (error) {
          w.__calls.push(`refused ${(error as Error).name}`);
          throw error;
        }
      };
    });
    await pickerButton(page, id).click();
    expect(await page.evaluate(() => (window as unknown as { __calls: string[] }).__calls)).toEqual(['shown #0f766e true']);
    await page.keyboard.press('Escape');
    expect(await read(page, id)).toMatchObject({ value: '#0f766e', text: '#0f766e' });
  });

  test('CLI-29: while the browser’s picker is open a pick is an edit by the person — written into the input in the value’s own form, drawn in the swatch, ending an entry error, input once for every pick that changed the value; when the picker closes change is emitted once while the value differs from the one last committed, and focus is on the picker button', async ({ page }) => {
    await mount(page, [fx('one', { value: '#0f766e', picker: true, pickerLabel: 'Choose color', invalidText: 'Not a color.' }), fx('other', {})]);
    await stubPicker(page);
    await listen(page, 'one');
    await pickerButton(page, 'one').click();
    await heard(page);
    // A drag across the picker: every pick is taken, and each one that changed the value is said once.
    for (const pick of ['#ff0000', '#ff8800', '#ff8800', '#ffff00']) await report(page, 'one', 'input', pick);
    expect(await heard(page)).toEqual(['input #ff0000', 'input #ff8800', 'input #ffff00']);
    expect(await read(page, 'one')).toMatchObject({ value: '#ffff00', text: '#ffff00', swatch: rgb('#ffff00') });
    // The picker closes: change once, and focus on the picker button.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await report(page, 'one', 'change');
    expect(await heard(page)).toEqual(['change #ffff00']);
    expect((await read(page, 'one')).onButton, 'focus is on the picker button').toBe(true);
    // Opened and closed without a pick: nothing is said.
    await pickerButton(page, 'one').click();
    await report(page, 'one', 'change');
    expect(await heard(page)).toEqual(['pickerrequest #ffff00']);
    // Picked back to the value last committed: input, and no change.
    await pickerButton(page, 'one').click();
    await report(page, 'one', 'input', '#000000');
    await report(page, 'one', 'input', '#ffff00');
    await report(page, 'one', 'change');
    expect(await heard(page)).toEqual(['pickerrequest #ffff00', 'input #000000', 'input #ffff00']);
    // A browser that reports the pick only as its picker closes: the pick is taken, then the change.
    await pickerButton(page, 'one').click();
    await report(page, 'one', 'change', '#00ff00');
    expect(await heard(page)).toEqual(['pickerrequest #ffff00', 'input #00ff00', 'change #00ff00']);
    // A pick ends an entry error, and is the text.
    await retype(page, 'one', 'lime');
    await blurInput(page, 'one');
    expect(await read(page, 'one')).toMatchObject({ invalid: true, value: '', text: 'lime' });
    await pickerButton(page, 'one').click();
    expect((await shown(page)).at(-1), 'no color: the picker starts from black').toBe('color #000000');
    await heard(page);
    await report(page, 'one', 'input', '#0000ff');
    expect(await read(page, 'one')).toMatchObject({ invalid: false, value: '#0000ff', text: '#0000ff', supporting: '' });
    // Where a browser gives no sign of the closing, the page's next focus counts as one — and focus stays where the person put it.
    await focusInput(page, 'other');
    expect(await heard(page)).toEqual(['input #0000ff', 'change #0000ff']);
    expect((await read(page, 'other')).focused, 'focus is not taken back').toBe(true);
    expect((await read(page, 'one')).onButton).toBe(false);
    // What the picker says is heard once, as the color input's: the browser's own `input` of a pick leaves the shadow
    // root by itself with the element as its target, and no second one is dispatched — a capturing listener on an
    // ancestor hears one too, with the value already new; the browser's `change` never leaves, and the element's does.
    await pickerButton(page, 'one').click();
    const outside = await host(page, 'one').evaluate((el) => {
      const seen: string[] = [];
      const note = (where: string) => (event: Event) => seen.push(`${where} ${event.type} ${event.target === el ? (el as HTMLElement & { value: string }).value : 'another target'}`);
      for (const type of ['input', 'change']) {
        document.body.addEventListener(type, note('capturing'), true);
        el.addEventListener(type, note('element'));
      }
      const native = el.shadowRoot!.querySelector<HTMLInputElement>('.native-picker')!;
      native.value = '#111111';
      native.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      // The same color reported again changes nothing, and says nothing to the element's listeners.
      native.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      native.dispatchEvent(new Event('change', { bubbles: true }));
      return seen;
    });
    expect(outside).toEqual(['capturing input #111111', 'element input #111111', 'capturing input #111111', 'capturing change #111111', 'element change #111111']);
  });

  test('CLI-30: the input is a text field with a general keyboard and no autocapitalization, autocorrection, spell checking, suggestions or autofill, laid out left to right; the color input announces nothing of its own when the value changes and adds no name of the color — a name the product wants is the supportingText of the Field that frames it', async ({ page }) => {
    await mount(page, [fx('one', { value: '#0f766e', picker: true, pickerLabel: 'Choose color' })]);
    await frame(page, 'named', { label: 'Brand color', supportingText: 'Teal' }, { value: '#0f766e' });
    await stubPicker(page);
    expect(await input(page, 'one').evaluate((el) => [el.localName, (el as HTMLInputElement).type, el.getAttribute('role'), el.getAttribute('inputmode'), el.getAttribute('autocomplete'), el.getAttribute('autocapitalize'), el.getAttribute('autocorrect'), el.getAttribute('spellcheck'), el.getAttribute('dir')])).toEqual(['input', 'text', null, 'text', 'off', 'none', 'off', 'false', 'ltr']);
    // Nothing is announced when the value changes — by an edit, by a pick or by the product: it has no live region at all.
    await retype(page, 'one', '#fde047');
    await pickerButton(page, 'one').click();
    await report(page, 'one', 'input', '#ff0000');
    await report(page, 'one', 'change');
    await set(page, 'one', { value: '#000000' });
    await frames(page);
    expect(await host(page, 'one').evaluate((el) => [...el.shadowRoot!.querySelectorAll('[aria-live], [role="status"], [role="alert"]')].length), 'no live region of its own').toBe(0);
    // No name of the color: the input's value is its text, and it has no description of its own.
    expect(await input(page, 'one').evaluate((el) => [el.getAttribute('aria-valuetext'), el.getAttribute('aria-description'), el.getAttribute('aria-describedby'), el.getAttribute('title')])).toEqual([null, null, null, null]);
    // The product's name of the color is its Field's help: drawn there, and the input's description.
    await expect(row(page, 'named', '.supporting-text')).toHaveText('Teal');
    expect(await description(page, 'named')).toBe('Teal');
    await retype(page, 'named', '#fde047');
    expect(await row(page, 'named', '.announcer').evaluate((el) => el.textContent ?? ''), 'and its Field announces nothing for a new value').toBe('');
  });

  test('CLI-30: Chromium’s accessibility tree, a Field around a color input — a text field named by the Field’s label whose value is the text it shows, described by the supporting or error text and the optional text, with its required, invalid and disabled states; the picker button a separate button named by pickerLabel that opens a dialog; the swatch, the label glyph, the tag and the browser’s color input not in it (CLI-11, CLI-25, CLI-27)', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'the accessibility tree is read over the DevTools protocol');
    await mount(page, [fx('one', { label: '', value: '#0f766e', picker: true, pickerLabel: 'Choose color', invalidText: 'Enter six hexadecimal digits.' })]);
    // The one input of the page, framed where it stands.
    await page.evaluate(async () => {
      const control = document.querySelector('tanrei-color-input')! as HTMLElement & { updateComplete: Promise<unknown> };
      const framing = Object.assign(document.createElement('tanrei-field'), { label: 'Brand color', supportingText: 'Six hexadecimal digits.', requirement: 'optional', optionalText: 'Optional' }) as HTMLElement & { updateComplete: Promise<unknown> };
      framing.innerHTML = '<span slot="label-icon">format_paint</span>';
      control.before(framing);
      framing.append(control);
      for (let round = 0; round < 2; round++) await Promise.all([framing.updateComplete, control.updateComplete]);
    });
    let [box_] = await axNodes(page, 'textbox');
    expect(box_).toMatchObject({ name: 'Brand color', description: 'Six hexadecimal digits. Optional', value: '#0f766e', focusable: true });
    expect([box_.required, box_.invalid, box_.disabled].map((state) => state ?? false), 'none of the states it does not have').toEqual([false, 'false', false]);
    let buttons = await axNodes(page, 'button');
    expect(buttons.map((b) => [b.name, b.hasPopup, b.disabled ?? false])).toEqual([['Choose color', 'dialog', false]]);
    // One text box and one button: nothing else of the two is a control, and nothing is exposed for the swatch.
    const tree = await axTree(page);
    const inField = tree.filter((node) => !['RootWebArea', 'none', 'generic', 'main', 'InlineTextBox'].includes(node.role));
    expect(inField.filter((node) => ['img', 'image', 'ColorWell', 'graphics-symbol'].includes(node.role)), 'no image and no color well').toEqual([]);
    expect(tree.filter((node) => node.role === 'StaticText').map((node) => node.name).filter((name) => ['format_paint', 'palette', 'Optional', '*'].includes(name)), 'the glyphs and the marks are not read as texts').toEqual([]);
    // The value is the text it shows — a half-typed one too.
    await retype(page, 'one', '#0f76e');
    [box_] = await axNodes(page, 'textbox');
    expect(box_.value).toBe('#0f76e');
    // Required and invalid — an entry error — then disabled.
    await setField(page, 'one', { requirement: 'required' });
    await blurInput(page, 'one');
    await settle(page, 'one');
    [box_] = await axNodes(page, 'textbox');
    expect(box_).toMatchObject({ required: true, invalid: 'true', description: 'Enter six hexadecimal digits.', value: '#0f76e' });
    await set(page, 'one', { value: '#000000' });
    await setField(page, 'one', { labelHidden: true, disabled: true });
    await settle(page, 'one');
    [box_] = await axNodes(page, 'textbox');
    expect(box_).toMatchObject({ disabled: true, name: 'Brand color', value: '#000000' });
    buttons = await axNodes(page, 'button');
    expect(buttons.map((b) => [b.name, b.disabled ?? false])).toEqual([['Choose color', true]]);
  });

  test('CLI-31: a disabled color input — by its own disabled, or by the Field that frames it — is not focusable or editable, nor its picker button, emits nothing, is exposed as disabled, and draws every part of its container, the floating label and its asterisk included, from the disabled tokens of its variant; the swatch’s fill is drawn at the disabled content opacity and its edge kept', async ({ page }) => {
    await mountSpec(page, ['stacked-disabled', 'stacked-picker-disabled', 'stacked-filled'], { reducedMotion: true });
    await frame(page, 'framed', { label: 'Brand color', disabled: true }, { value: '#0f766e', picker: true, pickerLabel: 'Choose color' });
    await frame(page, 'floating', { label: 'Brand color', disabled: true, requirement: 'required', requiredMark: 'asterisk' }, { variant: 'outlined', value: '#0f766e' });
    await stubPicker(page);
    const id = 'stacked-picker-disabled';
    await listen(page, id);
    expect(await input(page, id).evaluate((el) => (el as HTMLInputElement).disabled)).toBe(true);
    expect(await container(page, id).getAttribute('aria-disabled')).toBe('true');
    // No press focuses it, and no key reaches it.
    for (const target of [container(page, id), swatch(page, id)]) {
      const b = await box(target);
      await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
      expect(await read(page, id)).toMatchObject({ focused: false, onButton: false });
    }
    await pickerButton(page, id).click({ force: true });
    await tabTo(page, input(page, 'stacked-filled'));
    await tab(page, { back: true });
    await tab(page, { back: true });
    expect(await read(page, id), 'never a stop').toMatchObject({ focused: false, onButton: false });
    expect([await heard(page), await shown(page)]).toEqual([[], []]);
    // The disabled tokens of its variant.
    expect(await css(container(page, id), 'background-color')).toBe(await color(page, 'stacked-disabled-container-color'));
    expect(await css(input(page, id), 'color')).toBe(await color(page, 'stacked-disabled-input-color'));
    near(await px(part(page, id, '.field'), 'opacity'), Number(await css(page.locator('html'), T('disabled-opacity'))), 'the field’s opacity');
    // Disabled by its Field (FLD-14): the same, with its own `disabled` left as it was — and the picker button with it.
    expect(await host(page, 'framed').evaluate((el) => [(el as HTMLElement & { disabled: boolean }).disabled, el.hasAttribute('disabled')])).toEqual([false, false]);
    expect([await input(page, 'framed').evaluate((el) => (el as HTMLInputElement).disabled), await pickerButton(page, 'framed').locator('button').evaluate((el) => (el as HTMLButtonElement).disabled), await container(page, 'framed').getAttribute('aria-disabled')]).toEqual([true, true, 'true']);
    expect(await css(container(page, 'framed'), 'background-color')).toBe(await color(page, 'stacked-disabled-container-color'));
    // The floating label and its asterisk, from the disabled tokens of the variant.
    expect(await css(part(page, 'floating', '.floating'), 'color')).toBe(await color(page, 'outlined-disabled-label-color'));
    expect(await css(part(page, 'floating', '.floating .asterisk'), 'color')).toBe(await color(page, 'outlined-disabled-required-asterisk-color'));
    // The swatch: the value at the disabled content opacity, and the same edge.
    const opacity = Number(await css(page.locator('html'), '--tanrei-sys-state-disabled-content-opacity'));
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(1);
    const fill = await swatch(page, 'stacked-disabled').evaluate((el) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      context.fillStyle = getComputedStyle(el).backgroundColor;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data];
    });
    const [red, green, blue] = channels('#0f766e')!;
    // The canvas holds the color premultiplied: each channel comes back within a step or two of the value's.
    for (const [index, channel] of [red, green, blue].entries()) near(fill[index], channel, `the value’s channel ${index}`, 3);
    near(fill[3] / 255, opacity, 'at the disabled content opacity', 0.01);
    near(await px(swatch(page, 'stacked-disabled'), 'border-top-width'), await token(page, 'swatch-outline-width'), 'the edge is kept');
    expect(await css(swatch(page, 'stacked-disabled'), 'border-top-color')).toBe(await color(page, 'swatch-outline-color'));
    expect(await css(swatch(page, 'stacked-disabled'), 'opacity'), 'the swatch itself is not faded: its edge stays').toBe('1');
    // Enabled again: exactly the value.
    await set(page, 'stacked-disabled', { disabled: false });
    expect((await read(page, 'stacked-disabled')).swatch).toBe(rgb('#0f766e'));
  });
});

test.describe('behavior: forms, size, forced colors and direction', () => {
  test('CLI-31: a form-associated element — it takes name and submits value, the color in its own form or an empty string; an edit is the form’s at once; it resets to the value it was first given, is restored, follows a disabled fieldset and is left out while disabled; it reports a missing value while its Field says it is required and it is empty (CLI-11) and a bad input while an entry error lasts (CLI-20), in the product’s words or the browser’s', async ({ page }) => {
    await mount(page, [fx('base', {})]);
    await page.evaluate(async () => {
      document.body.insertAdjacentHTML(
        'beforeend',
        `<form id="f"><fieldset id="set">
           <tanrei-field label="Brand" requirement="required"><tanrei-color-input id="c" name="brand" value="0F766E" invalid-text="Sechs Hexadezimalziffern."></tanrei-color-input></tanrei-field>
           <tanrei-color-input id="off" name="off" label="Off" value="#000000" disabled></tanrei-color-input>
           <tanrei-color-input id="none" name="none" label="None"></tanrei-color-input></fieldset></form>`,
      );
      for (let round = 0; round < 2; round++) for (const element of document.querySelectorAll('#f tanrei-field, #f tanrei-color-input')) await (element as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    });
    const field = page.locator('#c');
    const data = () => page.evaluate(() => [...new FormData(document.querySelector<HTMLFormElement>('#f')!).entries()].map(([k, v]) => `${k}=${String(v)}`));
    const done = () => field.evaluate(async (el) => { await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete; await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete; });
    const validity = () => field.evaluate((el) => { const v = (el as unknown as HTMLInputElement).validity; return { valid: v.valid, missing: v.valueMissing, bad: v.badInput, message: (el as unknown as HTMLInputElement).validationMessage }; });
    const text = () => field.locator('.input').evaluate((el) => (el as HTMLInputElement).value);
    expect(await field.evaluate((el) => [(el.constructor as unknown as { formAssociated: boolean }).formAssociated, (el as unknown as HTMLInputElement).form?.id, (el as unknown as HTMLInputElement).willValidate])).toEqual([true, 'f', true]);
    expect(await text(), 'the attribute’s color in the value’s own form').toBe('#0f766e');
    expect(await data(), 'submitted in the value’s own form; disabled left out; empty submitted as an empty string').toEqual(['brand=#0f766e', 'none=']);
    // An edit is the form's at once — the value is the color the text reads as — and change bubbles to the form.
    await page.evaluate(() => ((window as unknown as { __changes: number }).__changes = 0, document.querySelector('#f')!.addEventListener('change', () => ((window as unknown as { __changes: number }).__changes += 1))));
    await field.evaluate((el) => (el as HTMLElement).focus());
    await field.locator('.input').evaluate((el) => (el as HTMLInputElement).select());
    await page.keyboard.type('FDE047');
    await done();
    expect((await data())[0]).toBe('brand=#fde047');
    await field.locator('.input').evaluate((el) => (el as HTMLElement).blur());
    await done();
    expect([(await data())[0], await page.evaluate(() => (window as unknown as { __changes: number }).__changes)]).toEqual(['brand=#fde047', 1]);
    // Reset: back to the value attribute, and the text with it — an edit under way is dropped.
    await field.evaluate((el) => (el as HTMLElement).focus());
    await page.keyboard.type('9');
    await page.evaluate(() => document.querySelector<HTMLFormElement>('#f')!.reset());
    await done();
    expect([await field.evaluate((el) => (el as unknown as { value: string }).value), await text(), (await data())[0]]).toEqual(['#0f766e', '#0f766e', 'brand=#0f766e']);
    // Restored on navigation: the browser hands the saved value back.
    await field.evaluate((el) => (el as unknown as { formStateRestoreCallback(state: string, mode: string): void }).formStateRestoreCallback('#abcdef', 'restore'));
    await done();
    expect([await field.evaluate((el) => (el as unknown as { value: string }).value), await text()]).toEqual(['#abcdef', '#abcdef']);
    expect(await validity()).toMatchObject({ valid: true });
    // A bad input while an entry error lasts, in the product's words; a missing value while required and empty, in the browser's.
    await field.locator('.input').evaluate((el) => (el as HTMLInputElement).select());
    await page.keyboard.type('gelb');
    await field.locator('.input').evaluate((el) => (el as HTMLElement).blur());
    await done();
    expect(await validity()).toMatchObject({ valid: false, bad: true, missing: true, message: 'Sechs Hexadezimalziffern.' });
    expect([(await data())[0], await page.evaluate(() => document.querySelector<HTMLFormElement>('#f')!.checkValidity())]).toEqual(['brand=', false]);
    await field.evaluate((el) => (el as HTMLElement).focus());
    await field.locator('.input').evaluate((el) => (el as HTMLInputElement).select());
    await page.keyboard.press('Backspace');
    await field.locator('.input').evaluate((el) => (el as HTMLElement).blur());
    await done();
    const empty = await validity();
    expect(empty).toMatchObject({ valid: false, bad: false, missing: true });
    expect(empty.message).not.toBe('');
    expect(await field.evaluate((el) => (el as unknown as { error: boolean }).error), 'it never sets error').toBe(false);
    // A disabled fieldset: disabled, drawn so, and left out.
    await page.evaluate(() => (document.querySelector<HTMLFieldSetElement>('#set')!.disabled = true));
    await done();
    expect(await field.locator('.input').evaluate((el) => (el as HTMLInputElement).disabled)).toBe(true);
    expect(await field.locator('.field').getAttribute('data-disabled')).not.toBeNull();
    expect(await data()).toEqual([]);
    expect(await page.evaluate(() => document.querySelector<HTMLFormElement>('#f')!.checkValidity()), 'a disabled color field is not validated').toBe(true);
    await page.evaluate(() => (document.querySelector<HTMLFieldSetElement>('#set')!.disabled = false));
    await done();
    expect(await field.locator('.input').evaluate((el) => (el as HTMLInputElement).disabled)).toBe(false);
    // Its own disabled, set by the attribute and unset by the property: enabled again, drawn so, and submitted.
    const off = page.locator('#off');
    await off.evaluate(async (el) => {
      (el as HTMLElement & { disabled: boolean }).disabled = false;
      await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    });
    expect(await off.evaluate((el) => [el.hasAttribute('disabled'), el.shadowRoot!.querySelector<HTMLInputElement>('.input')!.disabled, el.shadowRoot!.querySelector('.field')!.hasAttribute('data-disabled')])).toEqual([false, false, false]);
    expect(await data()).toEqual(['brand=', 'off=#000000', 'none=']);
  });

  test('CLI-33: with text enlarged the container grows with the input’s line, keeping the height of its size as a minimum; the swatch keeps swatch.size and the picker button its Button’s size, both centred on the line; the value stays on one line, and where the input is narrower than its text the text scrolls inside it with the caret kept in view', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await mount(page, [fx('one', { value: '#0f766e', picker: true, pickerLabel: 'Choose color' }), fx('narrow', { value: '#0f766e' })]);
    await page.addStyleTag({ content: '.stage:has(> tanrei-color-input) { box-sizing: border-box; inline-size: 100%; padding-inline: 0; }' });
    await frames(page);
    const before = (await box(container(page, 'one'))).height;
    near(before, await token(page, 'container-height-medium'), 'at its size’s height');
    await page.evaluate(() => (document.documentElement.style.fontSize = '300%'));
    await frames(page, 6);
    const [c, s, field, button] = [await box(container(page, 'one')), await box(swatch(page, 'one')), await box(input(page, 'one')), await box(pickerButton(page, 'one'))];
    expect(c.height, 'the container grew with the input’s line').toBeGreaterThan(before);
    near(field.height, (await px(input(page, 'one'), 'font-size')) * Number(await css(page.locator('html'), T('input-typescale-medium-line-height'))), 'the value stays on one line', 1);
    near(s.width, await token(page, 'icon-size-medium'), 'the swatch keeps swatch.size');
    near(s.height, await token(page, 'icon-size-medium'), 'the swatch keeps swatch.size');
    near(button.height, await resolveToken(page, '--tanrei-comp-button-container-height-medium'), 'the picker button keeps its Button’s size');
    for (const [name, b] of [['swatch', s], ['picker button', button], ['input', field]] as const) near(b.y + b.height / 2, c.y + c.height / 2, `${name} centred on the line`);
    // The row keeps its order and nothing lies over another part.
    const row = [s, field, await box(part(page, 'one', '.picker'))];
    for (let i = 1; i < row.length; i++) expect(row[i].x, 'nothing lies over another part').toBeGreaterThanOrEqual(row[i - 1].x + row[i - 1].width - 0.6);
    expect(c.x + c.width, 'inside the window').toBeLessThanOrEqual(320 + 0.6);
    // At 200% the minimum still holds where the line is shorter than it.
    await page.evaluate(() => (document.documentElement.style.fontSize = '100%'));
    await frames(page, 4);
    near((await box(container(page, 'one'))).height, await token(page, 'container-height-medium'), 'the height of its size is the minimum');
    // Narrower than its text: one line, scrolling inside the input, never cut with an ellipsis, the caret in view.
    await host(page, 'narrow').evaluate((el) => (el.style.inlineSize = '96px'));
    await frames(page);
    const narrow = input(page, 'narrow');
    expect(await narrow.evaluate((el) => el.scrollWidth > el.clientWidth), 'the text is wider than the input').toBe(true);
    expect([await css(narrow, 'text-overflow'), await css(narrow, 'white-space')].includes('ellipsis')).toBe(false);
    await focusInput(page, 'narrow');
    // The caret is walked with the arrow keys: Home and End are the caret's only where the platform gives them that.
    await narrow.evaluate((el) => (el as HTMLInputElement).setSelectionRange(0, 0));
    for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
    await expect.poll(() => narrow.evaluate((el) => el.scrollLeft), { message: 'scrolled to keep the caret in view' }).toBeGreaterThan(0);
    for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowLeft');
    await expect.poll(() => narrow.evaluate((el) => el.scrollLeft)).toBe(0);
    near((await box(container(page, 'narrow'))).height, await token(page, 'container-height-medium'), 'and the container keeps its height');
  });

  test('CLI-34: in forced colors the label that floats in the box and its asterisk are drawn in the text color, and no color of its own tells an error: the invalid state does, and the words of the Field that frames it', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'forced colors are emulated in Chromium');
    await page.emulateMedia({ forcedColors: 'active' });
    await mountFixtures(page, spec, { icons: true });
    await frame(page, 'star', { label: 'Brand color', requirement: 'required', requiredMark: 'asterisk', error: true, errorText: 'Too light.' }, { variant: 'outlined', value: '#0f766e' });
    const canvasText = await systemColor(page, 'CanvasText');
    const grayText = await systemColor(page, 'GrayText');
    // The floating label of every fixture that draws one is CanvasText (GrayText in a disabled one).
    let floating = 0;
    for (const f of spec.fixtures) {
      const target = part(page, f.id, '.floating');
      if ((await target.count()) === 0) continue;
      floating += 1;
      expect(await css(target, 'color'), f.id).toBe(f.props.disabled ? grayText : canvasText);
    }
    expect(floating, 'the filled and the outlined fixtures').toBe(spec.fixtures.filter((f) => f.props.variant === 'filled' || f.props.variant === 'outlined').length);
    for (const id of ['filled-filled', 'outlined-filled']) expect(await css(part(page, id, '.floating'), 'color'), id).toBe(canvasText);
    expect(await css(part(page, 'star', '.floating .asterisk'), 'color'), 'the asterisk').toBe(canvasText);
    // An error is no color of its own: the value and the label of an input in error are drawn as those of one at rest.
    expect(await css(input(page, 'stacked-error'), 'color')).toBe(await css(input(page, 'stacked-filled'), 'color'));
    expect(await css(part(page, 'outlined-error', '.floating'), 'color')).toBe(await css(part(page, 'outlined-filled', '.floating'), 'color'));
    expect(await css(part(page, 'star', '.floating'), 'color')).toBe(canvasText);
    expect([await input(page, 'stacked-error').getAttribute('aria-invalid'), await input(page, 'star').getAttribute('aria-invalid')]).toEqual(['true', 'true']);
    await expect(row(page, 'star', '.error-text')).toHaveText('Too light.');
    expect(await css(row(page, 'star', '.error-text'), 'color'), 'the Field’s words, in the text color (FLD-17)').toBe(canvasText);
  });

  test('CLI-35: in forced colors the container has an edge outline.width wide in the control text color in every variant, in the highlight color at the focused width while focused; the value is in the text color and a disabled field in the disabled text color; the swatch alone is kept out of the forced palette — still filled with the value’s own color — and its edge is the text color', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'forced colors are emulated in Chromium');
    await page.emulateMedia({ forcedColors: 'active' });
    await mountSpec(page, ['stacked-filled', 'filled-filled', 'outlined-filled', 'stacked-disabled', 'stacked-picker-disabled', 'stacked-white', 'stacked-black', 'stacked-empty', 'stacked-error', 'stacked-picker']);
    const canvasText = await systemColor(page, 'CanvasText');
    for (const id of ['stacked-filled', 'filled-filled', 'outlined-filled', 'stacked-error']) {
      expect(await css(container(page, id), 'border-top-color'), id).toBe(await systemColor(page, 'ButtonText'));
      near(await px(container(page, id), 'border-top-width'), await token(page, 'outline-width'), `${id} outline.width`);
      expect(await css(input(page, id), 'color'), `${id}: the value`).toBe(canvasText);
    }
    await focusInput(page, 'stacked-filled');
    expect(await css(container(page, 'stacked-filled'), 'outline-color')).toBe(await systemColor(page, 'Highlight'));
    near(await px(container(page, 'stacked-filled'), 'outline-width'), await token(page, 'focused-outline-width'), 'the focused width');
    expect(await css(container(page, 'stacked-disabled'), 'border-top-color')).toBe(await systemColor(page, 'GrayText'));
    expect(await css(input(page, 'stacked-disabled'), 'color')).toBe(await systemColor(page, 'GrayText'));
    // The swatch: the value's own color, and an edge in the text color.
    for (const [id, value] of [['stacked-filled', '#0f766e'], ['stacked-white', '#ffffff'], ['stacked-black', '#000000'], ['stacked-error', '#fde047']] as const) {
      expect((await read(page, id)).swatch, `${id}: the swatch keeps the value’s color`).toBe(rgb(value));
      expect(await css(swatch(page, id), 'forced-color-adjust'), id).toBe('none');
      expect(await css(swatch(page, id), 'border-top-color'), `${id}: its edge is the text color`).toBe(canvasText);
    }
    expect(await css(swatch(page, 'stacked-empty'), 'border-top-color'), 'an empty swatch is its edge').toBe(canvasText);
    expect(await css(swatch(page, 'stacked-empty'), 'background-color')).toBe('rgba(0, 0, 0, 0)');
    // On the swatch alone: nothing else the field draws leaves the forced palette. (The browser's own color input, which
    // is never drawn, is kept out of it by the browser's stylesheet.)
    const unforced = await host(page, 'stacked-picker').evaluate((el) =>
      [...el.shadowRoot!.querySelectorAll<HTMLElement>('*')].filter((node) => getComputedStyle(node).forcedColorAdjust === 'none' && getComputedStyle(node).visibility !== 'hidden').map((node) => node.className),
    );
    expect(unforced).toEqual(['swatch']);
    // The picker button is a Button, drawn as a Button is there; a disabled one in the disabled text color.
    await expect(pickerButton(page, 'stacked-picker')).toBeVisible();
    expect(await css(pickerButton(page, 'stacked-picker-disabled').locator('button'), 'color')).toBe(await systemColor(page, 'GrayText'));
  });

  test('CLI-37: in a right-to-left layout the swatch is at the right and the picker button at the left, the paddings applied by start and end, and a floating label floats from the right edge; the value is laid out left to right in every direction — beginning with its number sign — and aligned to the field’s start edge, the right', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => ['stacked-picker-rtl', 'stacked-error-rtl'].includes(f.id)), fx('outlined', { variant: 'outlined', value: '#0f766e', label: 'لون العلامة' }, { direction: 'rtl' }), fx('filled', { variant: 'filled', label: 'لون العلامة' }, { direction: 'rtl' })], { reducedMotion: true });
    const id = 'stacked-picker-rtl';
    const [c, s, field, slot, button] = [await box(container(page, id)), await box(swatch(page, id)), await box(input(page, id)), await box(part(page, id, '.picker')), await box(pickerButton(page, id))];
    near(c.x + c.width - (s.x + s.width), await token(page, 'container-padding-inline-with-icon-medium'), 'the swatch from the right edge');
    near(s.x - (field.x + field.width), await token(page, 'container-gap-medium'), 'container.gap between the swatch and the value');
    near(slot.x - c.x, await token(page, 'container-padding-inline-with-icon-medium'), 'the picker button from the left edge');
    near(field.x - (slot.x + slot.width), await token(page, 'container-gap-medium'), 'container.gap between the button and the value');
    near(button.x + button.width / 2 - c.x, c.x + c.width - (s.x + s.width / 2), 'the glyph as far from the left edge as the swatch’s centre from the right');
    // The value: left to right in every case, at the right edge.
    for (const rtl of [id, 'stacked-error-rtl', 'outlined']) {
      expect(await css(input(page, rtl), 'direction'), rtl).toBe('ltr');
      expect(await css(input(page, rtl), 'text-align'), `${rtl}: aligned to the right`).toBe('right');
    }
    expect((await read(page, id)).text).toBe('#0f766e');
    // It begins with its number sign: every character is drawn to the right of the one before it, and the last ends at the input's right edge.
    const drawn = await input(page, id).evaluate((el) => {
      const field = el as HTMLInputElement;
      const probe = document.createElement('span');
      const style = getComputedStyle(field);
      probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:${style.font};letter-spacing:${style.letterSpacing};direction:${style.direction};unicode-bidi:isolate`;
      probe.textContent = field.value;
      document.body.append(probe);
      const range = document.createRange();
      const lefts = [...field.value].map((_, i) => {
        range.setStart(probe.firstChild!, i);
        range.setEnd(probe.firstChild!, i + 1);
        return range.getBoundingClientRect().left;
      });
      const width = probe.getBoundingClientRect().width;
      probe.remove();
      return { lefts, width, scroll: field.scrollLeft, client: field.clientWidth };
    });
    expect(drawn.lefts, 'every character to the right of the one before it').toEqual([...drawn.lefts].sort((a, b) => a - b));
    expect(drawn.width, 'the value fits, so it stands whole at the right').toBeLessThan(drawn.client);
    // Without the picker button the value ends padding-inline from the left edge.
    const [c2, f2] = [await box(container(page, 'stacked-error-rtl')), await box(input(page, 'stacked-error-rtl'))];
    near(f2.x - c2.x, await token(page, 'container-padding-inline-medium'), 'the end padding, at the left');
    // A floating label floats from the right edge.
    const [oc, floated] = [await box(container(page, 'outlined')), await box(part(page, 'outlined', '.floating'))];
    near(oc.x + oc.width - (floated.x + floated.width), await token(page, 'container-padding-inline-medium'), 'outlined: floated from the right edge');
    const [fc, resting, fs] = [await box(container(page, 'filled')), await box(part(page, 'filled', '.floating')), await box(swatch(page, 'filled'))];
    near(fs.x - (resting.x + resting.width), await token(page, 'container-gap-medium'), 'filled: resting after the swatch, to its left');
    expect(resting.x, 'inside the container').toBeGreaterThan(fc.x);
  });

  test('CLI-38: the layout direction comes from the nearest ancestor that sets one, and a change of it while the color input is shown is drawn at once, keeping the value, the text as typed, the caret and focus; it has no direction setting of its own', async ({ page }) => {
    await mount(page, [fx('one', { value: '#0f766e', picker: true, pickerLabel: 'Choose color' })], { reducedMotion: true });
    await page.evaluate(() => {
      const wrap = document.createElement('div');
      wrap.id = 'wrap';
      wrap.dir = 'rtl';
      const field = document.querySelector('tanrei-color-input')!;
      field.before(wrap);
      wrap.append(field);
    });
    await frames(page);
    expect((await box(swatch(page, 'one'))).x, 'right to left, from an ancestor that is not the root').toBeGreaterThan((await box(input(page, 'one'))).x);
    expect((await box(pickerButton(page, 'one'))).x).toBeLessThan((await box(input(page, 'one'))).x);
    expect(await css(input(page, 'one'), 'text-align')).toBe('right');
    expect(await host(page, 'one').evaluate((el) => ['dir', 'direction'].some((name) => name in (el.constructor as unknown as { properties: object }).properties)), 'no direction setting of its own').toBe(false);
    await retype(page, 'one', '#abc');
    await input(page, 'one').evaluate((el) => (el as HTMLInputElement).setSelectionRange(2, 2));
    await page.evaluate(() => (document.querySelector<HTMLElement>('#wrap')!.dir = 'ltr'));
    await frames(page, 4);
    expect((await box(swatch(page, 'one'))).x, 'left to right now').toBeLessThan((await box(input(page, 'one'))).x);
    expect((await box(pickerButton(page, 'one'))).x).toBeGreaterThan((await box(input(page, 'one'))).x);
    expect(await css(input(page, 'one'), 'text-align')).toBe('left');
    expect(await read(page, 'one')).toMatchObject({ value: '', text: '#abc', focused: true, caret: [2, 2] });
    expect(await css(container(page, 'one'), 'transition-property'), 'no motion of its own for the direction').not.toContain('padding');
    expect(await css(swatch(page, 'one'), 'transition-duration')).toBe('0s');
  });

  test('CLI-39: in a right-to-left layout the color input mirrors no drawing of its own — the swatch is never mirrored, and the palette glyph of its picker button is not one the icon set marks; what changes with the direction is where its parts stand', async ({ page }) => {
    await mountSpec(page, ['stacked-picker', 'stacked-picker-rtl']);
    const mirrored = (locator: Locator) => locator.evaluate((el) => getComputedStyle(el).transform !== 'none' || getComputedStyle(el).scale !== 'none');
    for (const id of ['stacked-picker', 'stacked-picker-rtl']) {
      for (const selector of ['.swatch', '.container', '.picker', '.picker-glyph', '.picker-glyph .ink']) expect(await mirrored(part(page, id, selector)), `${id} ${selector}`).toBe(false);
      await expect(pickerButton(page, id).locator('.picker-glyph .ink')).toHaveText('palette');
      expect(await pickerButton(page, id).locator('.picker-glyph').getAttribute('data-mirror'), `${id}: not marked as mirrored`).toBeNull();
    }
    // Where its parts stand: the swatch at the start, the picker button at the end.
    const order = async (id: string) => [(await box(swatch(page, id))).x, (await box(input(page, id))).x, (await box(pickerButton(page, id))).x];
    const [ltr, rtl] = [await order('stacked-picker'), await order('stacked-picker-rtl')];
    expect(ltr, 'left to right').toEqual([...ltr].sort((a, b) => a - b));
    expect(rtl, 'right to left').toEqual([...rtl].sort((a, b) => b - a));
    // It holds no glyph slot of its own: the glyph before the label is the Field's (FLD-20).
    expect(await host(page, 'stacked-picker').evaluate((el) => el.shadowRoot!.querySelectorAll('slot').length)).toBe(0);
  });

  test('CLI-40: the label that floats in the box is a run of its own direction, isolated, placed and aligned by the layout direction: a left-to-right label keeps its own order in a right-to-left layout and stands at the right; the value stays left to right', async ({ page }) => {
    await mount(page, [fx('floated', { variant: 'outlined', label: 'Brand color (HEX)', value: '#0f766e' }, { direction: 'rtl' }), fx('resting', { variant: 'filled', label: 'Brand color (HEX)' }, { direction: 'rtl' })], { reducedMotion: true });
    for (const id of ['floated', 'resting']) {
      const label = part(page, id, '.floating');
      const [bidi, align] = await label.evaluate((el) => [getComputedStyle(el).unicodeBidi, getComputedStyle(el).textAlign]);
      expect(bidi, `${id}: a run of its own direction`).toBe('plaintext');
      expect(['right', 'end', 'start'], `${id}: aligned by the layout (${align})`).toContain(align);
      await expect(label).toHaveText('Brand color (HEX)');
      // Its last character — the closing parenthesis — is drawn at the right end, as in a left-to-right text.
      const order = await label.evaluate((el) => {
        const node = [...el.childNodes].find((child) => child.nodeType === Node.TEXT_NODE && child.textContent!.trim())!;
        const range = document.createRange();
        const at = (index: number) => {
          range.setStart(node, index);
          range.setEnd(node, index + 1);
          return range.getBoundingClientRect().left;
        };
        const textValue = node.textContent!;
        return [at(textValue.indexOf('B')), at(textValue.indexOf(')'))];
      });
      expect(order[1]!, `${id}: the label reads left to right`).toBeGreaterThan(order[0]!);
      expect(await css(input(page, id), 'direction'), `${id}: the value is laid out as CLI-37 says`).toBe('ltr');
    }
    // Placed by the layout direction: floated from the right edge; resting after the swatch, to its left.
    const [oc, floated] = [await box(container(page, 'floated')), await box(part(page, 'floated', '.floating'))];
    near(oc.x + oc.width - (floated.x + floated.width), await token(page, 'container-padding-inline-medium'), 'floated from the right edge');
    const [resting, s] = [await box(part(page, 'resting', '.floating')), await box(swatch(page, 'resting'))];
    near(s.x - (resting.x + resting.width), await token(page, 'container-gap-medium'), 'resting after the swatch, to its left');
  });

  test('CLI-41: a variant or size the active design system does not have is drawn with the default’s tokens and reported; a variant a layer added draws no label and its edge as a stacked color input does, with its own tokens; a requirement or a required mark is no setting of the color input: the Field answers it', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('plain', { value: '#0f766e' }), fx('odd', { variant: 'ghost', size: 'huge', value: '#0f766e' }), fx('layer', { variant: 'soft', value: '#0f766e' })], { reducedMotion: true });
    near((await box(container(page, 'odd'))).height, (await box(container(page, 'plain'))).height, 'the default size');
    near((await box(swatch(page, 'odd'))).width, (await box(swatch(page, 'plain'))).width, 'the default size’s swatch');
    expect(await css(container(page, 'odd'), 'background-color')).toBe(await css(container(page, 'plain'), 'background-color'));
    expect(await part(page, 'odd', '.field').getAttribute('data-layout'), 'laid out as stacked').toBe('stacked');
    await expect.poll(() => seen.filter((w) => w.includes('CLI-41')).some((w) => w.includes('ghost'))).toBe(true);
    await expect.poll(() => seen.filter((w) => w.includes('CLI-41')).some((w) => w.includes('huge'))).toBe(true);
    // A variant a layer added: its own tokens, no label and the edge inside.
    await override(page, { [T('soft-container-color')]: 'rgb(1, 2, 3)', [T('soft-input-color')]: 'rgb(4, 5, 6)' });
    await set(page, 'layer', { invalidText: 'x' });
    await expect.poll(() => css(container(page, 'layer'), 'background-color')).toBe('rgb(1, 2, 3)');
    expect(await css(input(page, 'layer'), 'color')).toBe('rgb(4, 5, 6)');
    expect(await part(page, 'layer', '.field').getAttribute('data-layout')).toBe('stacked');
    await expect(part(page, 'layer', '.edge')).toHaveCount(1);
    await expect(part(page, 'layer', '.floating'), 'no label').toHaveCount(0);
    expect((await read(page, 'layer')).swatch, 'and the swatch is the value in any variant').toBe(rgb('#0f766e'));
    // What it says to a Field follows a size it does not know by name: the default's lengths (CLI-43).
    await frame(page, 'framed-odd', { label: 'Brand color', supportingText: 'Help.' }, { size: 'huge', value: '#0f766e' });
    near((await box(row(page, 'framed-odd', '.supporting-text'))).x, (await box(input(page, 'framed-odd'))).x, 'the row starts at the value’s text');
    // A requirement, a required mark: not the input's to know (FLD-22).
    expect(await host(page, 'plain').evaluate((el) => ['requirement', 'requiredMark'].filter((prop) => prop in el))).toEqual([]);
  });
  test('CLI-42: the color input has no words of its own and reads none of the product’s — an input given no invalidText, pickerLabel or label draws and exposes no word, with the product’s words set and with none; an entry error without words still marks it, and a picker button without a name still asks', async ({ page }) => {
    await mount(page, [fx('one', { value: '#0f766e', picker: true }), fx('nameless', { label: '', picker: true })]);
    await stubPicker(page);
    // An element nobody gave a word: every text prop is empty.
    expect(await page.evaluate(() => ['label', 'invalidText', 'pickerLabel', 'value'].map((name) => (document.createElement('tanrei-color-input') as unknown as Record<string, string>)[name]))).toEqual(['', '', '', '']);
    // Every text in the input's own tree, and every name and description it gives.
    const words = (id: string) =>
      host(page, id).evaluate((el) => {
        const root = el.shadowRoot!;
        const texts = [...root.querySelectorAll('*')].flatMap((node) => [...node.childNodes].filter((child) => child.nodeType === Node.TEXT_NODE).map((child) => child.textContent!.trim())).filter(Boolean);
        const attributes = [...root.querySelectorAll('*')].flatMap((node) => ['aria-label', 'aria-description', 'title', 'placeholder', 'label', 'alt'].map((name) => node.getAttribute(name) ?? '')).filter(Boolean);
        return [...new Set([...texts, ...attributes])].sort();
      });
    expect(await missingWords(page), 'it reads no word of the product, so none is missing').toEqual([]);
    for (const product of ['none', 'set'] as const) {
      if (product === 'set') await setWords(page, { requiredText: 'Required', optionalText: 'Optional' });
      await retype(page, 'one', '#0f76e');
      await blurInput(page, 'one');
      // "palette" is the glyph's name in the icon set, drawn as its ligature and never as a word.
      expect(await words('one'), product).toEqual(['Brand color', 'palette']);
      expect(await words('nameless'), product).toEqual(['palette']);
      expect(await read(page, 'one'), `${product}: an entry error without words still marks the input`).toMatchObject({ invalid: true, text: '#0f76e', value: '' });
      await retype(page, 'one', '#0f766e');
      await blurInput(page, 'one');
    }
    await listen(page, 'nameless');
    await pickerButton(page, 'nameless').click();
    expect([await heard(page), await shown(page)]).toEqual([['pickerrequest '], ['color #000000']]);
  });

  test('CLI-43: the color input says to the Field that frames it that it draws the label while its variant floats one, how far the value’s text stands from its start edge — past the padding, the swatch and the gap — and the text padding at its end edge, with or without the picker button, and says it again when it changes; it gives no count; it takes the Field’s name, description and states, whether the label is hidden and whether an asterisk follows it', async ({ page }) => {
    await mount(page, [fx('bare', { value: '#0f766e' })], { reducedMotion: true });
    await frame(page, 'one', { label: 'Brand color', supportingText: 'Six hexadecimal digits, like #0f766e.' }, { value: '#0f766e' });
    await frame(page, 'rtl', { label: 'Brand color', supportingText: 'Six hexadecimal digits, like #0f766e.' }, { value: '#0f766e' });
    await stage(page, 'rtl').evaluate((el) => ((el as HTMLElement).dir = 'rtl'));
    await frames(page);
    // Stacked: the Field draws the label row, and its supporting row starts at the value's text, after the swatch.
    await expect(row(page, 'one', '.label-row > .label')).toHaveText('Brand color');
    await expect(part(page, 'one', '.floating')).toHaveCount(0);
    const text = row(page, 'one', '.supporting-text');
    const [f, t, c, s] = [await box(input(page, 'one')), await box(text), await box(container(page, 'one')), await box(swatch(page, 'one'))];
    near(t.x, f.x, 'the row starts where the value starts');
    near(t.x - c.x, (await token(page, 'container-padding-inline-with-icon-medium')) + (await token(page, 'icon-size-medium')) + (await token(page, 'container-gap-medium')), 'the padding beside the swatch, the swatch and the gap');
    expect(t.x, 'after the swatch').toBeGreaterThan(s.x + s.width);
    near(c.x + c.width - (t.x + t.width), await token(page, 'container-padding-inline-medium'), 'and ends at the text padding');
    // Showing the picker button moves neither end of the row.
    await set(page, 'one', { picker: true, pickerLabel: 'Choose color' });
    await frames(page);
    const withButton = await box(text);
    near(withButton.x, t.x, 'the start stays');
    near(withButton.x + withButton.width, t.x + t.width, 'the end stays');
    // Said again when it changes: another size, whose lengths another system may set apart.
    await override(page, { [T('container-gap-large')]: '40px' });
    await set(page, 'one', { size: 'large' });
    await frames(page);
    near((await box(text)).x, (await box(input(page, 'one'))).x, 'large: the row follows the value');
    expect((await box(text)).x, 'and it moved').toBeGreaterThan(t.x + 20);
    // Right to left: from the right, at the value's start edge.
    const [rf, rt, rc] = [await box(input(page, 'rtl')), await box(row(page, 'rtl', '.supporting-text')), await box(container(page, 'rtl'))];
    near(rt.x + rt.width, rf.x + rf.width, 'right to left: the row starts where the value starts');
    near(rt.x - rc.x, await token(page, 'container-padding-inline-medium'), 'and ends at the text padding, at the left');
    // A Field around a text input with a leading icon, of one width, starts its row at the same place.
    await page.evaluate(async () => {
      const stage_ = Object.assign(document.createElement('div'), { className: 'stage' });
      stage_.dataset.fixture = 'text';
      const framing = Object.assign(document.createElement('tanrei-field'), { label: 'Name', supportingText: 'Help.' }) as HTMLElement & { updateComplete: Promise<unknown> };
      framing.style.inlineSize = '280px';
      const control = Object.assign(document.createElement('tanrei-text-input'), { value: 'Ada' }) as HTMLElement & { updateComplete: Promise<unknown> };
      control.innerHTML = '<span slot="leading-icon">palette</span>';
      framing.append(control);
      stage_.append(framing);
      document.querySelector('main')!.append(stage_);
      for (let round = 0; round < 3; round++) await Promise.all([framing.updateComplete, control.updateComplete]);
    });
    await frames(page);
    near((await box(row(page, 'text', '.supporting-text'))).x - (await box(fieldOf(page, 'text'))).x, t.x - (await box(fieldOf(page, 'one'))).x, 'the same start as a text input with a leading icon');
    // It gives no count: the Field draws none.
    await expect(row(page, 'one', '.counter')).toHaveCount(0);
    // A floating look: the Field leaves its label row out at once, and the same text floats in the input.
    await set(page, 'one', { variant: 'outlined' });
    await settle(page, 'one');
    await expect(row(page, 'one', '.label-row')).toHaveCount(0);
    expect([await part(page, 'one', '.floating').textContent(), await input(page, 'one').getAttribute('aria-label')]).toEqual(['Brand color', 'Brand color']);
    // What it takes: the label hidden, an asterisk, the description, and the three states.
    await setField(page, 'one', { requirement: 'required', requiredMark: 'asterisk', error: true, errorText: 'Too light.' });
    await settle(page, 'one');
    expect(await part(page, 'one', '.floating').textContent()).toBe('Brand color*');
    expect([await input(page, 'one').getAttribute('aria-required'), await input(page, 'one').getAttribute('aria-invalid'), await description(page, 'one')]).toEqual(['true', 'true', 'Too light.']);
    await setField(page, 'one', { labelHidden: true, disabled: true });
    await settle(page, 'one');
    await expect(part(page, 'one', '.floating')).toHaveCount(0);
    expect([await input(page, 'one').getAttribute('aria-label'), await input(page, 'one').evaluate((el) => (el as HTMLInputElement).disabled)]).toEqual(['Brand color', true]);
    // Back to stacked: the Field draws its row again.
    await setField(page, 'one', { labelHidden: false, disabled: false });
    await set(page, 'one', { variant: 'stacked' });
    await settle(page, 'one');
    await expect(row(page, 'one', '.label-row > .label')).toContainText('Brand color');
    // No Field: nothing is said to anyone, and it is drawn as a bare input.
    await expect(part(page, 'bare', '.floating, .asterisk')).toHaveCount(0);
  });

  test('CLI-44: the color input draws no label row above itself, no requirement tag, no help and no error text; where no Field frames it, it is complete as a bare control and exactly as tall as its container; it is block-level, framed and bare alike — as wide as the place it stands in, with no width of its own', async ({ page }) => {
    await mountSpec(page, ['stacked-filled', 'stacked-error', 'stacked-picker', 'filled-filled', 'outlined-filled'], { reducedMotion: true });
    await frame(page, 'framed', { label: 'Brand color', supportingText: 'Help.' }, { value: '#0f766e' });
    for (const id of ['stacked-filled', 'stacked-error', 'stacked-picker', 'filled-filled', 'outlined-filled', 'framed']) {
      expect(await host(page, id).evaluate((el) => el.shadowRoot!.querySelectorAll('.label-row, .requirement-tag, tanrei-tag, .supporting-text, .counter, .announcer, slot').length), `${id}: no row of its own`).toBe(0);
      const [h, c] = [await box(host(page, id)), await box(container(page, id))];
      near(h.height, c.height, `${id}: exactly as tall as its container`);
      near(h.width, c.width, `${id}: the box fills it`);
      near(h.width, 280, `${id}: as wide as its place`);
      expect(await css(host(page, id), 'display'), id).toBe('block');
    }
    // It has none of the frame's settings.
    expect(await host(page, 'stacked-filled').evaluate((el) => ['supportingText', 'errorText', 'requirement', 'requiredMark', 'requiredText', 'optionalText'].filter((prop) => prop in el))).toEqual([]);
    // Complete bare: the box, the swatch, the value, the picker button, its states and its events.
    await listen(page, 'stacked-picker');
    await retype(page, 'stacked-picker', 'fde047');
    await blurInput(page, 'stacked-picker');
    expect(await heard(page)).toEqual(['input ', 'input #fde047', 'change #fde047']);
    expect(await read(page, 'stacked-picker')).toMatchObject({ value: '#fde047', text: '#fde047', swatch: rgb('#fde047') });
    // No width of its own: a wider place, a narrower place — narrower than a text element's own default width.
    for (const width of [400, 120]) {
      await stage(page, 'stacked-filled').evaluate((el, w) => ((el as HTMLElement).style.inlineSize = `${w}px`), width);
      await frames(page);
      near((await box(host(page, 'stacked-filled'))).width, width, `in a place ${width} wide`);
      near((await box(container(page, 'stacked-filled'))).width, width, `its box fills ${width}`);
    }
    // In a row that gives it less than its content it shrinks with the row.
    await stage(page, 'stacked-picker').evaluate((el) => ((el as HTMLElement).style.cssText += '; display: flex; inline-size: 100px'));
    await frames(page);
    expect((await box(host(page, 'stacked-picker'))).width).toBeLessThanOrEqual(100 + 0.6);
  });
});

test.describe('the frame around it', () => {
  test('a color input is a bare control: a Field around it is its frame and reports nothing; in a field group it follows the group’s disabled (CLI-31, CLI-44)', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('base', {})]);
    await page.evaluate(async () => {
      document.body.insertAdjacentHTML(
        'beforeend',
        `<tanrei-field-group id="g" label="Palette" disabled>
           <tanrei-color-input id="in-group" label="Primary" value="#0f766e" picker picker-label="Choose color"></tanrei-color-input>
         </tanrei-field-group>
         <tanrei-field id="fld" label="Outer"><tanrei-color-input id="in-field"></tanrei-color-input></tanrei-field>`,
      );
      await customElements.whenDefined('tanrei-field-group');
      await (document.querySelector('#in-group') as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    });
    const inGroup = page.locator('#in-group');
    await expect.poll(() => inGroup.locator('.input').evaluate((el) => (el as HTMLInputElement).disabled)).toBe(true);
    expect(await inGroup.locator('.picker-button').evaluate((el) => (el as HTMLElement & { disabled: boolean }).disabled)).toBe(true);
    expect(await inGroup.evaluate((el) => [el.hasAttribute('disabled'), el.shadowRoot!.querySelector('.input')!.getAttribute('aria-label')]), 'its own disabled and its own name are as they were').toEqual([false, 'Primary']);
    await page.evaluate(() => document.querySelector('#g')!.removeAttribute('disabled'));
    await expect.poll(() => inGroup.locator('.input').evaluate((el) => (el as HTMLInputElement).disabled)).toBe(false);
    await expect.poll(() => page.locator('#in-field').locator('.input').getAttribute('aria-label')).toBe('Outer');
    await frames(page, 4);
    expect(seen.filter((w) => w.includes('FLD-15') || w.includes('CLI-11')), 'a Field around a color input is what a Field is for').toEqual([]);
  });

  test('the default system leaves the filled and outlined color inputs out, and says so once per element in a debug build; they still render and work', async ({ page }) => {
    const seen = warnings(page);
    await mountSpec(page, ['filled-filled', 'outlined-filled', 'stacked-filled'], { reducedMotion: true });
    await expect.poll(() => seen.filter((w) => w.includes('(availability)')).length).toBe(2);
    await retype(page, 'filled-filled', 'fde047');
    await blurInput(page, 'filled-filled');
    expect(await read(page, 'filled-filled')).toMatchObject({ value: '#fde047', text: '#fde047', swatch: rgb('#fde047') });
  });

  test('a `<label for>` of the page activates the element: its input takes focus, and nothing changes (CLI-13)', async ({ page }) => {
    await mount(page, [fx('one', { value: '#0f766e', label: '' })]);
    await page.evaluate(() => {
      const field = document.querySelector('tanrei-color-input')!;
      field.id = 'brand';
      field.insertAdjacentHTML('beforebegin', '<label id="outside" for="brand">Brand color</label>');
    });
    await listen(page, 'one');
    await page.locator('#outside').click();
    expect(await read(page, 'one')).toMatchObject({ focused: true, value: '#0f766e', text: '#0f766e' });
    expect(await heard(page)).toEqual([]);
  });
});

test.describe('accessibility', () => {
  for (const theme of THEMES) {
    test(`axe: every fixture has no violations in ${theme}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true, theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`), theme).toEqual([]);
    });

    test(`axe: a focused field, one in an entry error and one whose picker was asked for have no violations in ${theme}`, async ({ page }) => {
      await mount(page, [fx('one', { value: '#0f766e' }), fx('wrong', { invalidText: 'Enter six hexadecimal digits.' }), fx('asked', { value: '#fde047', picker: true, pickerLabel: 'Choose color' })], { theme, reducedMotion: true });
      await stubPicker(page);
      await retype(page, 'wrong', '#0f76e');
      await blurInput(page, 'wrong');
      await pickerButton(page, 'asked').click();
      await focusInput(page, 'one');
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`), theme).toEqual([]);
    });
  }
});

test.describe('fixtures', () => {
  test('every fixture is mounted and visible, with its name, the value as text and as the swatch’s color, the floating label where its look floats one, and the picker button the spec gives it; it is as wide as its column and as tall as its box', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    expect(spec.fixtures).toHaveLength(26);
    for (const f of spec.fixtures) {
      await expect(host(page, f.id), f.id).toBeVisible();
      await expect(container(page, f.id), f.id).toBeVisible();
      const now = await read(page, f.id);
      const value = String(f.props.value ?? '');
      expect(now.value, `${f.id} value`).toBe(value);
      expect(now.text, `${f.id} text`).toBe(value);
      if (!value) expect(now.swatch, `${f.id}: an empty swatch`).toBe('');
      else if (!f.props.disabled) expect(now.swatch, `${f.id}: the swatch is the value`).toBe(rgb(value));
      expect(await input(page, f.id).getAttribute('aria-label'), `${f.id}: named by its own label`).toBe(String(f.props.label));
      const floats = (f.props.variant ?? 'stacked') !== 'stacked';
      expect(await part(page, f.id, '.floating').count(), `${f.id} floating label`).toBe(floats ? 1 : 0);
      if (floats) await expect(part(page, f.id, '.floating'), f.id).toHaveText(String(f.props.label));
      expect(now.invalid, `${f.id} invalid`).toBe(!!f.props.error);
      expect(await part(page, f.id, '.picker-button').count(), `${f.id} picker button`).toBe(f.props.picker ? 1 : 0);
      if (f.props.picker) {
        expect(await pickerButton(page, f.id).locator('button').getAttribute('aria-label'), f.id).toBe(String(f.props.pickerLabel));
        await expect.poll(() => pickerButton(page, f.id).locator('.picker-glyph').evaluate((el) => el.hasAttribute('data-drawn')), { message: `${f.id}: the glyph is drawn` }).toBe(true);
      }
      const [h, c] = [await box(host(page, f.id)), await box(container(page, f.id))];
      near(h.width, 280, `${f.id}: as wide as its column`);
      near(h.height, c.height, `${f.id}: exactly as tall as its container`);
      const s = await box(stage(page, f.id));
      expect(c.x >= s.x && c.x + c.width <= s.x + s.width + 0.6, `${f.id}: inside its stage`).toBe(true);
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true });
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
