// <tanrei-number-input>, driven by specs/number-input.spec.json: every behaviour id (NMI-1 to NMI-46) starts the title
// of a test, every fixture has a baseline, and every length and color is read back from the tokens — never from a
// number written here. What a sentence says of "the Field that frames it" is tested with a Field around the input
// (`frame()`), and the rows themselves — the label above, the requirement tag, the help, the error text and its
// announcement — are the Field's sentences and the Field's tests (src/components/field/field.test.ts, FLD-2 to FLD-9
// and FLD-25 to FLD-28). The arithmetic and the reading of a text (number-text.ts) are also tested by themselves.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, acmeSystemCss, loadSpec, missingWords, mountFixtures, resolveColor, resolveToken, setWords, tab, tabTo, inputBoxCopies, inputBoxSetApart, inputBoxToken, rootTokens, mountFixtureAsInAll } from '../../../test/harness.js';
import { motionEnded } from '../../../test/motions.js';
import { holdClock, releaseClock } from '../../../test/page-clock.js';
import { firstStrong, runDirection } from '../../styles/product-text.js';
import { ZERO, canonical, clamp, decimalFromString, decimalOf, format, numberForm, numberOf, read as readText, round, stepped } from './number-text.js';

const spec = loadSpec('number-input');
type P = Page;
const TAG = 'tanrei-number-input';
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] ${TAG}`);
/** A part of the number input's own shadow root. The steppers are Buttons with a container of their own, so the input's is named with its parent. */
const OWN: Record<string, string> = { '.container': '.field > .container' };
const part = (page: P, id: string, selector: string) => host(page, id).locator(OWN[selector] ?? selector);
/**
 * A number input inside a Field, as a stage of its own added to the mounted page: what a sentence says of "the Field
 * that frames it". The Field is as wide as the fixtures are drawn; `field` and `props` are set as properties.
 */
async function frame(page: P, id: string, field: Record<string, unknown>, props: Record<string, unknown> = {}) {
  await page.evaluate(
    async ([stageId, fieldProps, inputProps]) => {
      const stage = Object.assign(document.createElement('div'), { className: 'stage' });
      stage.dataset.fixture = stageId;
      const framing = Object.assign(document.createElement('tanrei-field'), fieldProps) as HTMLElement & { updateComplete: Promise<unknown> };
      framing.style.inlineSize = '280px';
      const framed = Object.assign(document.createElement('tanrei-number-input'), { incrementLabel: 'Increase', decrementLabel: 'Decrease', ...inputProps }) as HTMLElement & { updateComplete: Promise<unknown> };
      framing.append(framed);
      stage.append(framing);
      document.querySelector('main')!.append(stage);
      for (let round = 0; round < 3; round++) await Promise.all([framing.updateComplete, framed.updateComplete]);
    },
    [id, field, props] as const,
  );
}
/** The Field that frames the input of the stage `id`: its own rows are its parts, not parts of the input inside it. */
const row = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-field`);
/** Sets properties on the Field of the stage `id` and waits for it and for its input. */
const setField = (page: P, id: string, props: Record<string, unknown>) =>
  row(page, id).evaluate(async (el, p) => {
    Object.assign(el, p);
    const inner = el.querySelector('tanrei-number-input') as unknown as { updateComplete: Promise<unknown> };
    for (let round = 0; round < 3; round++) await Promise.all([(el as unknown as { updateComplete: Promise<unknown> }).updateComplete, inner.updateComplete]);
  }, props);
/** What the spin button is described by: the texts its `aria-describedby` names, in its own shadow root. */
const described = (page: P, id: string) =>
  input(page, id).evaluate((el) => {
    const root = el.getRootNode() as ShadowRoot;
    return (el.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean).map((ref) => root.getElementById(ref)?.textContent?.trim() ?? '').join(' ');
  });
const container = (page: P, id: string) => part(page, id, '.container');
const input = (page: P, id: string) => part(page, id, '.input');
const stepper = (page: P, id: string, which: 'down' | 'up') => part(page, id, `.stepper.${which}`);
// The box is drawn from the one set of tokens every input box is drawn from (NMI-47); where the steppers stand and how a hold repeats from the number input's own.
const T = inputBoxToken('number-input');
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
/** The words of this file's own fixtures: a test is the product there and gives them itself (NMI-44). */
const WORDS = { incrementLabel: 'Increase', decrementLabel: 'Decrease' };
const fx = (id: string, props: Fixture['props'], extra: Partial<Fixture> = {}): Fixture => ({ id, props: { label: 'Quantity', ...WORDS, ...props }, ...extra });
const mount = (page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) => mountFixtures(page, spec, { icons: true, fixtures, ...options });
const mountSpec = (page: P, ids: string[], options: Parameters<typeof mountFixtures>[2] = {}) => mount(page, spec.fixtures.filter((f) => ids.includes(f.id)), options);
type Element_ = HTMLElement & { updateComplete: Promise<unknown>; value: number | null };
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
/** What the number input is now, read from the element and from the element that carries its semantics. */
const read = async (page: P, id: string) => {
  await settle(page, id);
  return host(page, id).evaluate((el) => {
    const root = el.shadowRoot!;
    const field = root.querySelector<HTMLInputElement>('.input')!;
    const disabled = (which: string) => root.querySelector<HTMLElement & { disabled: boolean }>(`.stepper.${which}`)?.disabled ?? null;
    return {
      value: (el as Element_).value,
      text: field.value,
      focused: root.activeElement === field,
      now: field.getAttribute('aria-valuenow'),
      min: field.getAttribute('aria-valuemin'),
      max: field.getAttribute('aria-valuemax'),
      valueText: field.getAttribute('aria-valuetext'),
      invalid: field.getAttribute('aria-invalid') === 'true',
      down: disabled('down'),
      up: disabled('up'),
      caret: [field.selectionStart, field.selectionEnd],
    };
  });
};
/** Records `input`, `change`, `action` and `entryerror` on the number input, in order, with what the element holds when each is heard. */
const listen = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const w = window as unknown as { __events: string[] };
    w.__events = [];
    const field = el as Element_;
    const flags = (event: Event) => (event.bubbles && event.composed ? '' : ' (not composed)');
    el.addEventListener('input', (event) => w.__events.push(`input ${String((event as CustomEvent<{ value: number | null }>).detail?.value)}${flags(event)}`));
    el.addEventListener('change', (event) => w.__events.push(`change ${String(field.value)}${flags(event)}`));
    el.addEventListener('action', (event) => w.__events.push(`action ${String(field.value)}${flags(event)}`));
    el.addEventListener('entryerror', (event) => {
      const detail = (event as CustomEvent<{ reason: string; text: string }>).detail;
      w.__events.push(`entryerror ${detail.reason} ${detail.text}${flags(event)}`);
    });
  });
const heard = (page: P) => page.evaluate(() => (window as unknown as { __events: string[] }).__events.splice(0));
/** A press of the pointer at the centre of `target`. */
const pressOn = async (target: Locator) => {
  await target.scrollIntoViewIfNeeded();
  const b = (await target.boundingBox())!;
  await target.page().mouse.click(b.x + b.width / 2, b.y + b.height / 2);
};
const centre = async (target: Locator) => {
  await target.scrollIntoViewIfNeeded();
  const b = (await target.boundingBox())!;
  return [b.x + b.width / 2, b.y + b.height / 2] as const;
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
/** The Chromium accessibility nodes of a role, over the DevTools protocol: what the browser computed. */
async function axNodes(page: P, role: string) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  return nodes
    .filter((node) => !node.ignored && node.role?.value === role)
    .map((node) => {
      const property = (name: string) => node.properties?.find((p) => p.name === name)?.value;
      return {
        name: (node.name?.value ?? '') as string,
        description: (node.description?.value ?? '') as string,
        value: node.value?.value as string | number | undefined,
        valuemin: property('valuemin')?.value as number | undefined,
        valuemax: property('valuemax')?.value as number | undefined,
        valuetext: property('valuetext')?.value as string | undefined,
        invalid: property('invalid')?.value as string | undefined,
        required: property('required')?.value as boolean | undefined,
        disabled: property('disabled')?.value as boolean | undefined,
        readonly: property('readonly')?.value as boolean | undefined,
        focusable: property('focusable')?.value as boolean | undefined,
      };
    });
}
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

test.describe('the arithmetic and the reading of a text (number-text.ts)', () => {
  const en = numberForm('en-US');
  const de = numberForm('de-DE');
  const ar = numberForm('ar-EG');
  const said = (text: string, form = en, affixes = {}) => {
    const reading = readText(text, form, affixes);
    return reading.kind === 'number' ? canonical(reading.value) : reading.kind;
  };
  const d = (value: number) => decimalOf(value)!;

  test('NMI-18: a text is read leniently by the locale’s form — spaces, a hyphen-minus, a minus sign or a plus sign, ASCII, the locale’s and full-width digits, the locale’s separator once, its grouping separator between digits, a typed prefix and suffix; an empty text is no value; letters, an exponent, two separators and a sign alone are not numbers; and it never guesses between two locales’ forms', () => {
    expect([said(' 1,234.50 '), said('−3'), said('-3'), said('+3'), said('１２'), said('12 px', en, { suffix: 'px' }), said('$5', en, { prefix: '$' }), said('-$ 5.5 USD', en, { prefix: '$', suffix: 'USD' })]).toEqual(['1234.5', '-3', '-3', '3', '12', '12', '5', '-5.5']);
    expect([said('1e3'), said('1.2.3'), said('-'), said('abc'), said('12 apples'), said('.'), said(',5'), said('1,,2'), said('5-'), said('px', en, { suffix: 'px' })]).toEqual(Array(10).fill('invalid'));
    expect([said(''), said('   '), said(' ')]).toEqual(['empty', 'empty', 'empty']);
    expect([said('.5'), said('5.'), said('007')]).toEqual(['0.5', '5', '7']);
    // German: the comma is the separator, and a period is a grouping separator — never another locale's decimal one.
    expect([said('1,5', de), said('1.500', de), said('1.5', de), said('1.234.567,89', de), said('5.', de)]).toEqual(['1.5', '1500', '15', '1234567.89', 'invalid']);
    // Egyptian Arabic: its own digits and separator; ASCII digits too, and a period where the locale does not group with it.
    expect([said('١٢٫٥', ar), said('-١٢', ar), said('١٬٢٣٤', ar), said('12.5', ar), said('12,5', ar)]).toEqual(['12.5', '-12', '1234', '12.5', 'invalid']);
    // A digit is a digit in every locale: Devanagari, Arabic-Indic and full-width digits typed into an English form.
    expect([said('१२'), said('٣٤'), said('１２．５'), said('－５'), said('1 234')]).toEqual(['12', '34', '12.5', '-5', '1234']);
    // Marks of direction say nothing.
    expect(said('‎-12‏')).toBe('-12');
    // A number no JavaScript number can hold is not one.
    expect(said('9'.repeat(400))).toBe('invalid');
  });

  test('NMI-17: a number is written in the locale’s digits and separator, a minus sign before a negative one, between the fewest and the most digits after the separator with no other trailing zeros, without an exponent or grouping separators — what is shown can be typed back', () => {
    expect([format(d(1234.5), en, 0, 3), format(d(12), en, 2, 3), format(d(1.5), de, 0, 3), format(d(8336817000), en, 0, 3), format(d(1e21), en, 0, 3), format(d(1e-7), en, 0, 8)]).toEqual(['1234.5', '12.00', '1,5', '8336817000', '1000000000000000000000', '0.0000001']);
    expect([format(d(12), ar, 0, 3), format(d(-12.5), ar, 0, 3), format(d(-12.5), numberForm('he'), 0, 3)]).toEqual(['١٢', '-١٢٫٥', '-12.5']);
    expect([format(d(1.25), en, 0, 1), format(d(-0.0001), en, 0, 3), format(d(120), en, 2, 2), format(d(0.5), en, 0, 0)]).toEqual(['1.3', '0', '120.00', '1']);
    for (const [locale, value] of [['en-US', -1234.56], ['de-DE', 0.125], ['ar-EG', -98.7], ['fa-IR', 12.5], ['hi-IN', 7], ['fr-FR', 1234.5], ['de-CH', -0.5]] as const) {
      const form = numberForm(locale);
      const reading = readText(format(d(value), form, 0, 3), form);
      expect(reading.kind === 'number' && numberOf(reading.value), locale).toBe(value);
    }
    // The sign carries no mark of direction: the field lays its number out left to right itself (NMI-39).
    expect(/[؜‎‏]/.test(ar.minus + numberForm('he').minus + numberForm('fa-IR').minus)).toBe(false);
  });

  test('NMI-20: a commit’s rounding is a half away from zero, on the digits a person typed, and its limits raise and lower', () => {
    const r = (value: string, digits: number) => canonical(round(decimalFromString(value)!, digits));
    expect([r('2.5', 0), r('-2.5', 0), r('1.005', 2), r('1.2345', 3), r('-1.2345', 3), r('0.0004', 3), r('12', 3)]).toEqual(['3', '-3', '1.01', '1.235', '-1.235', '0', '12']);
    expect([canonical(clamp(d(250), d(0), d(100))), canonical(clamp(d(-5), d(0), d(100))), canonical(clamp(d(5), null, null)), canonical(clamp(d(5), d(10), null))]).toEqual(['100', '0', '5', '10']);
    expect([decimalFromString('abc'), decimalFromString(''), decimalFromString('1,5')]).toEqual([null, null, null]);
    expect([canonical(decimalFromString('1e3')!), canonical(decimalFromString('-.5')!), canonical(decimalFromString('12.50')!)]).toEqual(['1000', '-0.5', '12.5']);
  });

  test('NMI-22: a step goes to the next number, in its direction, that is the base plus a whole multiple of the amount — a number between two goes to the nearer one in that direction — and is computed in decimal', () => {
    const s = (from: number, base: number, amount: number, direction: 1 | -1) => canonical(stepped(d(from), base ? d(base) : ZERO, d(amount), direction));
    expect([s(12, 0, 5, 1), s(12, 0, 5, -1), s(10, 0, 5, 1), s(10, 0, 5, -1), s(-12, 0, 5, 1), s(-12, 0, 5, -1)]).toEqual(['15', '10', '15', '5', '-10', '-15']);
    expect([s(0.2, 0, 0.1, 1), s(0.3, 0, 0.1, -1), s(0.7, 0, 0.1, 1), s(1.1, 0, 2.2, 1), s(4.35, 0, 0.01, 1)]).toEqual(['0.3', '0.2', '0.8', '2.2', '4.36']);
    // Counted from the base (min): from 1.5 with min 0.25 and step 0.5 the grid is 0.25, 0.75, 1.25, 1.75.
    expect([s(1.5, 0.25, 0.5, 1), s(1.5, 0.25, 0.5, -1), s(0.25, 0.25, 0.5, -1)]).toEqual(['1.75', '1.25', '-0.25']);
    expect(0.1 + 0.2, 'what binary arithmetic gives').not.toBe(0.3);
    expect(numberOf(stepped(stepped(d(0.1), ZERO, d(0.1), 1), ZERO, d(0.1), 1))).toBe(0.3);
    // NMI-23: a count of steps stays on the same grid — the first to the nearer number in the direction, each further
    // one an amount more.
    const n = (from: number, base: number, amount: number, direction: 1 | -1, count: number) => canonical(stepped(d(from), base ? d(base) : ZERO, d(amount), direction, count));
    expect([n(42, 0, 2, 1, 10), n(62, 0, 2, 1, 10), n(42, 0, 2, -1, 10), n(43, 0, 2, 1, 10), n(43, 0, 2, -1, 10), n(1.5, 0.25, 0.5, 1, 10), n(0.2, 0, 0.1, 1, 10)]).toEqual(['62', '82', '22', '62', '24', '6.25', '1.2']);
  });
});

test.describe('behavior: the box', () => {
  test('NMI-1: the container is at least container.height of its size tall, its corners container.shape (a filled one’s bottom corners shape-bottom), and holds one centred row — the prefix, the input, the suffix and the two steppers, container.gap after the input line — text padding-inline from the edge and at least padding-block above and below the line', async ({ page }) => {
    await mountSpec(page, ['stacked-value', 'stacked-large', 'stacked-small', 'stacked-prefix', 'stacked-no-steppers', 'filled-value']);
    for (const [id, size] of [['stacked-value', 'medium'], ['stacked-large', 'large'], ['stacked-small', 'small']] as const) {
      const c = await box(container(page, id));
      near(c.height, await token(page, `container-height-${size}`), `${id} height`);
      const field = await box(input(page, id));
      const down = await box(stepper(page, id, 'down'));
      near(field.x - c.x, await token(page, `container-padding-inline-${size}`), `${id} text padding`);
      near(down.x - (field.x + field.width), await token(page, `container-gap-${size}`), `${id} container.gap after the input line`);
      near(field.y + field.height / 2, c.y + c.height / 2, `${id} input centred`);
      near(down.y + down.height / 2, c.y + c.height / 2, `${id} steppers centred`);
      expect((c.height - field.height) / 2, `${id} padding-block`).toBeGreaterThanOrEqual((await token(page, `container-padding-block-${size}`)) - 0.6);
      near(await px(container(page, id), 'border-top-left-radius'), await token(page, 'container-shape'), `${id} corner`);
      near(await px(container(page, id), 'border-bottom-right-radius'), await token(page, 'container-shape'), `${id} bottom corner`);
    }
    // The default system's numbers: the text input's 48 and 56, and 16.
    expect([await token(page, 'container-height-medium'), await token(page, 'container-height-large'), await token(page, 'container-padding-inline-medium')]).toEqual([48, 56, 16]);
    // The row: the prefix, the input, the suffix, the steppers — in that order, on one line.
    const id = 'stacked-prefix';
    const [prefix, field, suffix, down, up] = [await box(part(page, id, '.prefix')), await box(input(page, id)), await box(part(page, id, '.suffix')), await box(stepper(page, id, 'down')), await box(stepper(page, id, 'up'))];
    const order = [prefix, field, suffix, down, up].map((b) => b.x);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    near(prefix.x - (await box(container(page, id))).x, await token(page, 'container-padding-inline-medium'), 'the prefix at the text padding');
    near(down.x - (suffix.x + suffix.width), await token(page, 'container-gap-medium'), 'container.gap after the suffix');
    // Without steppers the input line reaches the text padding at the end.
    const [c, bare] = [await box(container(page, 'stacked-no-steppers')), await box(input(page, 'stacked-no-steppers'))];
    near(c.x + c.width - (bare.x + bare.width), await token(page, 'container-padding-inline-medium'), 'the end padding');
    // Filled: the bottom corners take shape-bottom.
    near(await px(container(page, 'filled-value'), 'border-top-left-radius'), await token(page, 'container-shape'), 'filled top corner');
    near(await px(container(page, 'filled-value'), 'border-bottom-left-radius'), await token(page, 'container-shape-bottom'), 'filled bottom corner');
    expect(await container(page, 'stacked-value').getAttribute('data-tanrei-shape'), 'eased by the corner smoothing').not.toBeNull();
  });

  test('NMI-2, NMI-47: the number input holds no token of the box under its own name — its own family is what it alone draws, in the default system and in each preset', async () => {
    const sheets = [fs.readFileSync(path.join(pkg, 'dist/tokens.css'), 'utf8'), ...SYSTEMS.filter((system): system is Exclude<(typeof SYSTEMS)[number], undefined> => system !== undefined).map((system) => fs.readFileSync(path.join(pkg, `dist/systems/${system}.css`), 'utf8'))];
    // No copy to hold equal: what the number input reads of the box is the one set every input box is drawn from.
    expect(inputBoxCopies(sheets, 'number-input')).toEqual([]);
    // Its own: where the steppers stand and how a hold repeats (NMI-25, NMI-27).
    expect(declared(sheets[0]!, 'number-input').map((name) => name.replace('--tanrei-comp-number-input-', '')).sort()).toEqual(['motion-repeat-delay', 'motion-repeat-interval', 'motion-repeat-interval-fast', 'stepper-gap', 'stepper-inset']);
  });

  test('NMI-47: a custom property of the box set on one number input changes that one alone; set on an ancestor, every number input in it', async ({ page }) => {
    await mount(page, [fx('one', {})]);
    const { rest, one, both } = await inputBoxSetApart(page, 'tanrei-number-input');
    expect(rest[0], 'the box has corners to lose').toBeGreaterThan(0);
    expect(rest[1]).toBe(rest[0]);
    expect(one, 'the one it is set on, and not its neighbour').toEqual([0, rest[1]]);
    expect(both, 'both, from their parent').toEqual([0, 0]);
  });

  test('NMI-2: a number input and a text input of the same variant, size, label and value in one row share the tops and bottoms of their containers, floating labels and input lines, their start edges and their input’s text style; in the same Field each is as tall as the other', async ({ page }) => {
    for (const [system, variant, size] of [[undefined, 'stacked', 'small'], [undefined, 'stacked', 'medium'], [undefined, 'stacked', 'large'], ['m3-like', 'filled', 'small'], ['m3-like', 'filled', 'medium'], ['m3-like', 'outlined', 'large']] as const) {
      await mount(page, [fx('pair', { variant, size, value: 12 })], { system });
      await page.evaluate(
        ([v, s]) => {
          const stage = document.querySelector<HTMLElement>('[data-fixture="pair"]')!;
          stage.style.cssText = 'display: flex; gap: 16px; align-items: flex-start; inline-size: 600px';
          const mine = stage.querySelector<HTMLElement>('tanrei-number-input')!;
          mine.style.inlineSize = '280px';
          const field = document.createElement('tanrei-text-input');
          Object.assign(field, { variant: v, size: s, label: 'Quantity', value: '12' });
          field.style.inlineSize = '280px';
          stage.append(field);
        },
        [variant, size] as const,
      );
      const field = page.locator('[data-fixture="pair"] > tanrei-text-input');
      await expect(field.locator('.container')).toBeVisible();
      await frames(page);
      const where = `${system ?? 'tanrei'} ${variant} ${size}`;
      const pairs: [string, Locator, Locator][] = [['container', container(page, 'pair'), field.locator('.container')]];
      if (variant !== 'stacked') pairs.push(['label', part(page, 'pair', '.floating'), field.locator('label.label')]);
      for (const [name, mine, theirs] of pairs) {
        const [a, b] = [await box(mine), await box(theirs)];
        near(a.y, b.y, `${where}: ${name} top`);
        near(a.y + a.height, b.y + b.height, `${where}: ${name} bottom`);
        near(a.x - (await box(host(page, 'pair'))).x, b.x - (await box(field)).x, `${where}: ${name} start edge`);
      }
      const [mine, theirs] = [input(page, 'pair'), field.locator('.input')];
      for (const property of ['font-size', 'font-family', 'font-weight', 'letter-spacing', 'color', 'caret-color']) expect(await css(mine, property), `${where}: ${property}`).toBe(await css(theirs, property));
      const [a, b] = [await box(mine), await box(theirs)];
      near(a.x - (await box(host(page, 'pair'))).x, b.x - (await box(field)).x, `${where}: text start edge`);
      near(a.y + a.height / 2, b.y + b.height / 2, `${where}: input line`);
      near((await box(host(page, 'pair'))).height, (await box(field)).height, `${where}: the whole input`);
    }
  });

  test('NMI-7: in a Field a filled or outlined number input draws "*" after its floating label exactly while the Field gives it an asterisk — for the mark asterisk, and for a tag, which reaches a floating label as the asterisk — in the label’s style, its own color and hidden from assistive technology; it draws no chip and no optional label; bare, under the mark none, or with no label drawn it draws no mark; a stacked input draws none: the mark is its Field’s', async ({ page }) => {
    await mount(page, [fx('bare', { variant: 'outlined' })], { system: 'm3-like', reducedMotion: true });
    const required = { label: 'Quantity', required: true, requiredText: 'Required' };
    await frame(page, 'tag', { ...required, requiredMark: 'tag' }, { variant: 'outlined' });
    await frame(page, 'asterisk', { ...required, requiredMark: 'asterisk' }, { variant: 'outlined' });
    await frame(page, 'filled', { ...required, requiredMark: 'asterisk' }, { variant: 'filled' });
    await frame(page, 'none', { ...required, requiredMark: 'none' }, { variant: 'outlined' });
    await frame(page, 'hidden', { ...required, requiredMark: 'asterisk', labelHidden: true }, { variant: 'outlined' });
    await frame(page, 'optional', { label: 'Quantity', required: false, optional: true, optionalText: 'Optional' }, { variant: 'filled' });
    await frame(page, 'wrong', { ...required, requiredMark: 'asterisk', error: true }, { variant: 'outlined' });
    await frame(page, 'stacked', { ...required, requiredMark: 'asterisk' }, {});
    const drawn = (id: string) => host(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll<HTMLElement>('.floating .asterisk')].some((node) => getComputedStyle(node).display !== 'none' && node.getClientRects().length > 0));
    expect(await drawn('tag'), 'a tag reaches a floating label as the asterisk').toBe(true);
    expect(await drawn('asterisk')).toBe(true);
    expect(await drawn('filled')).toBe(true);
    expect(await drawn('none'), 'the mark none').toBe(false);
    expect(await drawn('hidden'), 'no label drawn').toBe(false);
    expect(await drawn('optional'), 'no optional mark').toBe(false);
    expect(await drawn('bare'), 'no Field frames it').toBe(false);
    await expect(part(page, 'stacked', '.asterisk, .floating'), 'a stacked input draws no label and no mark').toHaveCount(0);
    for (const id of ['tag', 'asterisk', 'filled', 'none', 'hidden', 'optional', 'wrong']) await expect(part(page, id, 'tanrei-tag, .requirement-tag'), `${id}: no tag`).toHaveCount(0);
    const asterisk = part(page, 'asterisk', '.floating .asterisk');
    expect(await part(page, 'asterisk', '.floating').textContent()).toBe('Quantity*');
    expect(await asterisk.getAttribute('aria-hidden')).toBe('true');
    expect(await css(asterisk, 'color')).toBe(await color(page, 'outlined-required-asterisk-color'));
    expect(await css(part(page, 'wrong', '.floating .asterisk'), 'color'), 'in error').toBe(await color(page, 'outlined-error-required-asterisk-color'));
    expect(await css(part(page, 'filled', '.floating .asterisk'), 'color')).toBe(await color(page, 'filled-required-asterisk-color'));
    expect(await css(asterisk, 'font-size')).toBe(await css(part(page, 'asterisk', '.floating'), 'font-size'));
    near(await px(asterisk, 'margin-left'), await token(page, 'requirement-asterisk-gap'), 'asterisk-gap');
    // It rests and floats with the label: at the label's place in both positions.
    const resting = await box(asterisk);
    await focusInput(page, 'asterisk');
    await frames(page, 6);
    expect((await box(asterisk)).y, 'floated with the label').toBeLessThan(resting.y);
    expect(await css(asterisk, 'font-size')).toBe(await css(part(page, 'asterisk', '.floating'), 'font-size'));
    // Whatever is drawn, the required state is exposed — where no label is drawn too.
    for (const id of ['tag', 'asterisk', 'filled', 'none', 'hidden', 'wrong', 'stacked']) expect(await input(page, id).getAttribute('aria-required'), id).toBe('true');
    expect(await input(page, 'optional').getAttribute('aria-required')).toBeNull();
    expect(await input(page, 'bare').getAttribute('aria-required')).toBeNull();
    // Under auto the Field gives what the design system names — the system's one choice (sys.behavior.requirement-mark),
    // which the Field's token follows: m3-like names the asterisk; set to none for the page, none is drawn.
    await frame(page, 'auto', required, { variant: 'outlined' });
    expect(await drawn('auto')).toBe(true);
    await override(page, { '--tanrei-sys-behavior-requirement-mark': 'none' });
    await setField(page, 'auto', { supportingText: 'x' });
    expect(await drawn('auto')).toBe(false);
    expect(await input(page, 'auto').getAttribute('aria-required')).toBe('true');
  });

  test('NMI-8: a filled or outlined label rests in the input line in label.typescale while the input is empty and not focused, and floats otherwise — to the top of a filled container, onto an outlined one’s top edge with its gap — in label.floated-typescale, over motion.label-*; a filled number input keeps its height; the placeholder, the prefix and the suffix show only while the label is not in the input line; a label that does not fit wraps and ends before the steppers; the label it floats is its Field’s, or its own; labelHidden — its own or its Field’s — draws none, and a stacked input draws none at all', async ({ page }) => {
    await mount(page, [fx('filled', { variant: 'filled', placeholder: '1 to 99', suffixText: 'kg' }), fx('outlined', { variant: 'outlined', placeholder: '1 to 99', suffixText: 'kg' }), fx('stacked', { placeholder: '1 to 99' }), fx('wrap', { variant: 'outlined', label: 'A label that is far too long for a field this narrow' }), fx('own-hidden', { variant: 'outlined', labelHidden: true, placeholder: '1 to 99' })], { reducedMotion: true });
    const placeholder = (id: string) => input(page, id).evaluate((el) => getComputedStyle(el, '::placeholder').color);
    for (const id of ['filled', 'outlined'] as const) {
      const label = part(page, id, '.floating');
      const c = await box(container(page, id));
      const resting = await box(label);
      near(await px(label, 'font-size'), await token(page, 'label-typescale-medium-font-size'), `${id}: resting in label.typescale`);
      near(resting.y + resting.height / 2, c.y + c.height / 2, `${id}: resting in the input line`);
      expect(await placeholder(id), `${id}: no placeholder under a resting label`).toBe('rgba(0, 0, 0, 0)');
      await expect(part(page, id, '.suffix'), `${id}: no suffix beside a resting label`).toBeHidden();
      const height = c.height;
      await focusInput(page, id);
      await frames(page);
      near(await px(label, 'font-size'), await token(page, 'label-floated-typescale-medium-font-size'), `${id}: floated in label.floated-typescale`);
      const floated = await box(label);
      expect(floated.y, `${id}: it moved up`).toBeLessThan(resting.y);
      expect(await placeholder(id), `${id}: the placeholder shows once the label has floated`).toBe(await color(page, `${id}-focused-placeholder-color`));
      await expect(part(page, id, '.suffix'), `${id}: the suffix shows once the label has floated`).toBeVisible();
      near((await box(container(page, id))).height, height, `${id}: the height does not change`);
      // Never over the input text.
      expect(floated.y + floated.height, `${id}: above the input’s line`).toBeLessThanOrEqual((await box(input(page, id))).y + 0.6);
      await blurInput(page, id);
      // It stays floated while the input holds a text, focused or not.
      await set(page, id, { value: 12 });
      await frames(page);
      near(await px(label, 'font-size'), await token(page, 'label-floated-typescale-medium-font-size'), `${id}: floated over a value`);
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
    // Stacked: no label at all — the label above it is its Field's row — and the placeholder shows, in the placeholder color.
    await expect(part(page, 'stacked', '.floating, .label-row')).toHaveCount(0);
    expect(await placeholder('stacked')).toBe(await color(page, 'stacked-placeholder-color'));
    // Its own labelHidden: no label is drawn, the name stays, and the placeholder shows.
    await expect(part(page, 'own-hidden', '.floating')).toHaveCount(0);
    expect(await input(page, 'own-hidden').getAttribute('aria-label')).toBe('Quantity');
    expect(await placeholder('own-hidden')).toBe(await color(page, 'outlined-placeholder-color'));
    // A label that does not fit wraps, is never cut, and resting ends before the steppers.
    await host(page, 'wrap').evaluate((el) => (el.style.inlineSize = '240px'));
    await frames(page, 6);
    await expect(part(page, 'wrap', '.field')).toHaveAttribute('data-label-wraps', '');
    expect(await part(page, 'wrap', '.floating').evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && getComputedStyle(el).textOverflow !== 'ellipsis')).toBe(true);
    const [resting, down] = [await box(part(page, 'wrap', '.floating')), await box(stepper(page, 'wrap', 'down'))];
    expect(resting.x + resting.width, 'the resting label ends before the steppers').toBeLessThanOrEqual(down.x + 0.6);
    // The motion: label-duration and label-easing, and none where motion is reduced.
    expect(await px(part(page, 'filled', '.floating'), 'transition-duration'), 'reduced: at once').toBe(0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    near((await px(part(page, 'filled', '.floating'), 'transition-duration')) * 1000, await duration(page, 'motion-label-duration'), 'motion.label-duration', 1);
    // In a Field: the label it floats is the Field's — its own wins — and the Field's labelHidden draws none.
    await frame(page, 'framed', { label: 'Weight' }, { variant: 'outlined' });
    await frame(page, 'framed-own', { label: 'Weight' }, { variant: 'filled', label: 'Net weight' });
    await frame(page, 'framed-hidden', { label: 'Weight', labelHidden: true }, { variant: 'outlined' });
    await frame(page, 'framed-stacked', { label: 'Weight' }, {});
    await expect(part(page, 'framed', '.floating')).toHaveText('Weight');
    await expect(part(page, 'framed-own', '.floating')).toHaveText('Net weight');
    await expect(part(page, 'framed-hidden', '.floating')).toHaveCount(0);
    expect(await input(page, 'framed-hidden').getAttribute('aria-label')).toBe('Weight');
    await expect(part(page, 'framed-stacked', '.floating')).toHaveCount(0);
    // The Field's name changes: the floated label follows.
    await row(page, 'framed').evaluate(async (el) => {
      (el as HTMLElement & { label: string }).label = 'Gross weight';
      await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    });
    await expect(part(page, 'framed', '.floating')).toHaveText('Gross weight');
  });

  test('NMI-10: in error — its own, or its Field’s — the number input is exposed as invalid and draws every part of its container from the error parts of its variant — a stacked one a line inside its edge at rest — while its steppers stay as they are; it shows no error text of its own and never sets error itself', async ({ page }) => {
    await mountSpec(page, ['stacked-error', 'stacked-value', 'stacked-unit']);
    const id = 'stacked-error';
    expect(await input(page, id).getAttribute('aria-invalid')).toBe('true');
    expect(await input(page, 'stacked-value').getAttribute('aria-invalid')).toBeNull();
    const edge = part(page, id, '.edge');
    expect(await css(edge, 'border-top-color')).toBe(await color(page, 'stacked-error-outline-color'));
    near(await px(edge, 'border-top-width'), await token(page, 'outline-width'), 'outline.width');
    expect(await css(container(page, id), 'background-color')).toBe(await color(page, 'stacked-error-container-color'));
    expect(await css(input(page, id), 'color')).toBe(await color(page, 'stacked-error-input-color'));
    await set(page, 'stacked-unit', { error: true });
    expect(await css(part(page, 'stacked-unit', '.suffix'), 'color')).toBe(await color(page, 'stacked-error-affix-color'));
    // The edge takes no layout space: the container is as tall in error as at rest.
    near((await box(container(page, id))).height, (await box(container(page, 'stacked-value'))).height, 'the container’s height');
    // The steppers are not in error: drawn as those of an input at rest.
    const glyph = (fixture: string) => stepper(page, fixture, 'up').locator('[part="container"]');
    for (const property of ['color', 'background-color']) expect(await css(glyph(id), property), property).toBe(await css(glyph('stacked-value'), property));
    // No words of its own: nothing is drawn below the container, and the input is exactly as tall as it.
    near((await box(host(page, id))).height, (await box(container(page, id))).height, 'no row below the box');
    // Never by itself: a number outside the limits is corrected, not marked.
    await set(page, 'stacked-value', { min: 1, max: 99 });
    await retype(page, 'stacked-value', '500');
    await blurInput(page, 'stacked-value');
    expect(await host(page, 'stacked-value').evaluate((el) => (el as HTMLElement & { error: boolean }).error)).toBe(false);
    expect(await read(page, 'stacked-value')).toMatchObject({ invalid: false, value: 99 });
    // Its Field's error (FLD-8): the same box, the same state — and the input's own `error` is not set by it.
    await frame(page, 'framed', { label: 'Quantity', error: true, errorText: 'Order at least 1.' }, { value: 0 });
    expect(await input(page, 'framed').getAttribute('aria-invalid')).toBe('true');
    expect(await css(part(page, 'framed', '.edge'), 'border-top-color')).toBe(await color(page, 'stacked-error-outline-color'));
    expect(await css(container(page, 'framed'), 'background-color')).toBe(await color(page, 'stacked-error-container-color'));
    expect(await host(page, 'framed').evaluate((el) => (el as HTMLElement & { error: boolean }).error)).toBe(false);
    // The words are the Field's row, and the input's description (FLD-7, FLD-11).
    await expect(row(page, 'framed').locator('.error-text')).toHaveText('Order at least 1.');
    expect(await described(page, 'framed')).toBe('Order at least 1.');
  });

  test('NMI-12: the Field’s label is the accessible name of the input whether or not any label is drawn, and the Field’s shown text its description; its own label wins, and names an input no Field frames; the placeholder never is the name; it is exposed as required exactly while its Field says so, whichever mark is drawn, and reports a missing value to the form while it holds none; with neither name it still renders and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('own', { placeholder: '1 to 99' }), fx('unnamed', { label: '', placeholder: '1 to 99' })]);
    const name = async (id: string) => (await input(page, id).getAttribute('aria-label')) ?? '';
    expect(await name('own')).toBe('Quantity');
    expect(await input(page, 'own').getAttribute('aria-labelledby'), 'named by one thing').toBeNull();
    expect(await name('unnamed'), 'the placeholder is never the name').toBe('');
    await expect(input(page, 'unnamed')).toBeVisible();
    await expect.poll(() => seen.some((w) => w.includes('NMI-12') && w.includes('accessible name'))).toBe(true);
    expect(await input(page, 'own').getAttribute('aria-required'), 'no requirement of its own').toBeNull();
    expect(await host(page, 'own').evaluate((el) => (el as unknown as HTMLInputElement).validity.valid), 'not required: valid').toBe(true);
    await frame(page, 'framed', { label: 'Weight', supportingText: 'In kilograms.' }, { placeholder: '1 to 99' });
    await frame(page, 'hidden', { label: 'Weight', labelHidden: true, required: true, requiredText: 'Required' }, {});
    await frame(page, 'wins', { label: 'Weight' }, { label: 'Net weight' });
    await frame(page, 'none', { label: 'Weight', required: true, requiredMark: 'none', requiredText: 'Required' }, { value: 0 });
    await frame(page, 'optional', { label: 'Weight', required: false, optional: true, optionalText: 'Optional' }, {});
    expect(await name('framed')).toBe('Weight');
    expect(await name('hidden')).toBe('Weight');
    expect(await name('wins')).toBe('Net weight');
    expect(await described(page, 'framed')).toBe('In kilograms.');
    // A change of the Field's text is the description at once.
    await row(page, 'framed').evaluate(async (el) => {
      Object.assign(el, { error: true, errorText: 'Too heavy.' });
      await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    });
    await expect.poll(() => described(page, 'framed')).toBe('Too heavy.');
    expect(await input(page, 'hidden').getAttribute('aria-required')).toBe('true');
    expect(await input(page, 'none').getAttribute('aria-required')).toBe('true');
    expect(await input(page, 'framed').getAttribute('aria-required')).toBeNull();
    expect(await input(page, 'optional').getAttribute('aria-required')).toBeNull();
    expect(await described(page, 'optional'), 'the optional text is in the Field’s description').toContain('Optional');
    expect(await host(page, 'hidden').evaluate((el) => (el as unknown as HTMLInputElement).validity.valueMissing), 'no value and required: missing').toBe(true);
    expect(await host(page, 'none').evaluate((el) => (el as unknown as HTMLInputElement).validity.valueMissing), 'zero is a value: not missing').toBe(false);
    // It never validates because of the requirement: entered and left empty, it is not put in error.
    await focusInput(page, 'hidden');
    await page.keyboard.press('Enter');
    await blurInput(page, 'hidden');
    expect(await input(page, 'hidden').getAttribute('aria-invalid')).toBeNull();
    // Only the unnamed, unframed input was reported.
    expect(seen.filter((w) => w.includes('NMI-12')).length).toBe(1);
  });

  test('NMI-14: a press on a floating label, the prefix, the suffix or the container’s padding moves focus to the input and does nothing else — it changes nothing, selects nothing and draws no press answer; a press on its Field’s label row focuses the input too, and one on that Field’s supporting row does nothing; the hit area meets the minimum target; the input is the one stop, and the steppers are none', async ({ page }) => {
    await mount(page, [fx('one', { value: 12, prefixText: '$', suffixText: 'USD' }), fx('after', {}), fx('floating', { variant: 'outlined' })]);
    await listen(page, 'one');
    for (const selector of ['.prefix', '.suffix'] as const) {
      await pressOn(part(page, 'one', selector));
      const now = await read(page, 'one');
      expect(now, selector).toMatchObject({ focused: true, value: 12, text: '12' });
      expect(now.caret[0], `${selector}: nothing is selected`).toBe(now.caret[1]);
      await blurInput(page, 'one');
    }
    // The container's padding: its first pixels, before the prefix.
    const c = await box(container(page, 'one'));
    await page.mouse.click(c.x + 3, c.y + c.height / 2);
    expect(await read(page, 'one'), 'the padding').toMatchObject({ focused: true, value: 12 });
    await blurInput(page, 'one');
    // A press in the input places the caret.
    await input(page, 'one').click();
    expect((await read(page, 'one')).focused, 'the input').toBe(true);
    await blurInput(page, 'one');
    expect(await heard(page)).toEqual([]);
    expect(await container(page, 'one').getAttribute('data-pressed'), 'no press answer').toBeNull();
    // A floating label, resting in the input line.
    await pressOn(part(page, 'floating', '.floating'));
    expect(await read(page, 'floating'), 'the floating label').toMatchObject({ focused: true, value: null, text: '' });
    await blurInput(page, 'floating');
    // The hit area: the container's ::before reaches the minimum target.
    const target = await resolveToken(page, '--tanrei-sys-target-pointer');
    expect(await container(page, 'one').evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').height))).toBeGreaterThanOrEqual(target - 0.6);
    // The focus order: the input, then what follows — never a stepper.
    await tabTo(page, input(page, 'one'));
    await tab(page);
    expect((await read(page, 'after')).focused, 'one stop').toBe(true);
    await tab(page, { back: true });
    expect((await read(page, 'one')).focused, 'and back').toBe(true);
    await blurInput(page, 'one');
    // The rows are the Field's (FLD-12): its label row focuses the input, its supporting row does nothing.
    await frame(page, 'framed', { label: 'Weight', supportingText: 'In kilograms.' }, { value: 12 });
    await pressOn(row(page, 'framed').locator('.label-row > .label'));
    const now = await read(page, 'framed');
    expect(now, 'the Field’s label row').toMatchObject({ focused: true, value: 12, text: '12' });
    expect(now.caret[0], 'nothing is selected').toBe(now.caret[1]);
    await blurInput(page, 'framed');
    await pressOn(row(page, 'framed').locator('.supporting-text'));
    expect((await read(page, 'framed')).focused, 'the Field’s supporting row does nothing').toBe(false);
  });

  test('NMI-15: hovered and focused draw every part of the box from that state’s tokens, focused over hovered, however focus was gained; a stacked number input shows focus by a line inside its edge at the focused width and never by a ring, with the glow where the focus style is glow; selected text takes selection.color; states change over motion.state-*, at once where motion is reduced', async ({ page }) => {
    await mount(page, [fx('one', { value: 12, suffixText: 'kg' }), fx('float', { variant: 'filled', value: 12 }), fx('wrong', { variant: 'filled', value: 12, error: true }), fx('other', {})], { system: 'm3-like', reducedMotion: true });
    const label = part(page, 'float', '.floating');
    const edge = part(page, 'one', '.edge');
    const rest = await color(page, 'filled-label-color');
    const focused = await color(page, 'filled-focused-label-color');
    expect(focused, 'm3-like’s primary is chromatic: the focused label differs').not.toBe(rest);
    expect(await css(label, 'color')).toBe(rest);
    const height = (await box(container(page, 'one'))).height;
    // Hovered: the state layer on the container, and no edge.
    const c = await box(container(page, 'one'));
    await page.mouse.move(c.x + 40, c.y + c.height / 2);
    await expect.poll(() => css(container(page, 'one'), 'background-color')).toBe(await color(page, 'stacked-hovered-container-color'));
    expect(await css(edge, 'border-top-color')).toBe(await color(page, 'stacked-hovered-outline-color'));
    // Focused by the keyboard, the pointer still over it: focused wins.
    await tabTo(page, input(page, 'one'));
    expect(await css(container(page, 'one'), 'background-color')).toBe(await color(page, 'stacked-focused-container-color'));
    expect(await css(edge, 'border-top-color')).toBe(await color(page, 'stacked-focused-outline-color'));
    near(await px(edge, 'border-top-width'), await token(page, 'focused-outline-width'), 'the focused width');
    expect(await css(input(page, 'one'), 'caret-color')).toBe(await color(page, 'stacked-focused-caret-color'));
    expect(await css(part(page, 'one', '.suffix'), 'color')).toBe(await color(page, 'stacked-focused-affix-color'));
    near((await box(container(page, 'one'))).height, height, 'the line takes no layout space');
    // No ring: neither the input nor the container draws an outline.
    expect([await css(input(page, 'one'), 'outline-style'), await css(container(page, 'one'), 'outline-style')]).toEqual(['none', 'none']);
    // The floating label and the active indicator of a filled input: by the keyboard, and by pointer — a press in the input selects the focused state too.
    await page.mouse.move(5, 5);
    await tabTo(page, input(page, 'float'));
    expect(await css(label, 'color')).toBe(focused);
    expect(await css(part(page, 'float', '.indicator'), 'background-color')).toBe(await color(page, 'filled-focused-active-indicator-color'));
    near((await box(part(page, 'float', '.indicator'))).height, await token(page, 'focused-active-indicator-width'), 'the focused indicator width');
    await focusInput(page, 'other');
    expect(await css(label, 'color')).toBe(rest);
    await input(page, 'float').click();
    expect(await css(label, 'color')).toBe(focused);
    // In error the floating label keeps its error color while focused.
    await focusInput(page, 'wrong');
    expect(await css(part(page, 'wrong', '.floating'), 'color')).toBe(await color(page, 'filled-focused-error-label-color'));
    // Selected text: selection.color under selection.content.color.
    expect(await input(page, 'one').evaluate((el) => [getComputedStyle(el, '::selection').backgroundColor, getComputedStyle(el, '::selection').color])).toEqual([await color(page, 'selection-color'), await color(page, 'selection-content-color')]);
    // The motion: the state duration, and none where motion is reduced.
    expect(await px(container(page, 'one'), 'transition-duration'), 'reduced: at once').toBe(0);
    expect(await px(edge, 'transition-duration'), 'reduced: at once').toBe(0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    near((await px(container(page, 'one'), 'transition-duration')) * 1000, await duration(page, 'motion-state-duration-medium'), 'the container', 1);
    near((await px(edge, 'transition-duration')) * 1000, await duration(page, 'motion-state-duration-medium'), 'the edge', 1);
    // Glow: the halo around the container while focused, and still no ring.
    await mount(page, [fx('one', { value: 12 })], { system: 'acme', systemCss: await acmeSystemCss() });
    await tabTo(page, input(page, 'one'));
    await expect.poll(() => container(page, 'one').evaluate((el) => getComputedStyle(el, '::after').boxShadow !== 'none' || getComputedStyle(el).boxShadow !== 'none')).toBe(true);
    expect(await css(container(page, 'one'), 'outline-style')).toBe('none');
    expect(await part(page, 'one', '.field').getAttribute('data-focus-style')).toBe('glow');
  });

  test('NMI-15: under the default system the focused edge takes the focus-ring role at the thick width, by keyboard and by pointer', async ({ page }) => {
    await mount(page, [fx('one', { value: 12 }), fx('other', {})], { reducedMotion: true });
    const edge = part(page, 'one', '.edge');
    expect(await css(edge, 'border-top-color'), 'no edge at rest').toBe(await color(page, 'stacked-outline-color'));
    for (const how of ['keyboard', 'pointer'] as const) {
      if (how === 'keyboard') await tabTo(page, input(page, 'one'));
      else await input(page, 'one').click();
      expect(await css(edge, 'border-top-color'), how).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
      near(await px(edge, 'border-top-width'), await resolveToken(page, '--tanrei-sys-border-thick'), `${how}: the thick width`);
      await focusInput(page, 'other');
      expect(await css(edge, 'border-top-color'), `${how}: gone when focus leaves`).toBe(await color(page, 'stacked-outline-color'));
    }
  });
});

test.describe('behavior: the number', () => {
  test('NMI-16: the number is edited as text in a native input, on one line: nothing typed is rewritten, reformatted, clamped, rounded or refused, and the caret is not moved; the keyboard is numeric — with a separator while a fraction may be typed — without autocapitalization, autocorrection or suggestions', async ({ page }) => {
    await mount(page, [fx('one', { value: 5, min: 0, max: 10 }), fx('whole', { maxFractionDigits: 0 })]);
    const field = input(page, 'one');
    expect(await field.evaluate((el) => [el.localName, (el as HTMLInputElement).type, el.getAttribute('inputmode'), el.getAttribute('autocomplete'), el.getAttribute('autocapitalize'), el.getAttribute('autocorrect'), el.getAttribute('spellcheck')])).toEqual(['input', 'text', 'decimal', 'off', 'none', 'off', 'false']);
    expect(await input(page, 'whole').getAttribute('inputmode'), 'whole numbers: no separator').toBe('numeric');
    await retype(page, 'one', '12a');
    expect(await read(page, 'one'), 'the text is the person’s until the field is committed').toMatchObject({ text: '12a', value: 5 });
    await retype(page, 'one', '1234.56789');
    expect(await read(page, 'one')).toMatchObject({ text: '1234.56789', value: 5 });
    // The caret stays where the person put it.
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.type('0');
    expect(await read(page, 'one')).toMatchObject({ text: '1234.567089', caret: [9, 9] });
  });

  test('NMI-16: while a Japanese input method composes full-width digits the field reads nothing, says nothing and leaves every key to it; the committed text is read once, when the composition ends; a value the product sets meanwhile waits for the end', async ({ page }) => {
    await mount(page, [fx('one', { value: 5 }), fx('two', { value: 5 })]);
    await listen(page, 'one');
    await focusInput(page, 'one');
    await selectAll(page, 'one');
    await compose(page, 'one', ['１', '１２']);
    await settle(page, 'one');
    expect(await heard(page), 'nothing is said while it composes').toEqual([]);
    expect(await read(page, 'one')).toMatchObject({ text: '１２', value: 5 });
    for (const key of ['ArrowUp', 'ArrowDown', 'PageUp', 'Enter']) expect(await composingKey(page, 'one', key), key).toBe(false);
    expect(await read(page, 'one'), 'no key stepped or committed').toMatchObject({ text: '１２', value: 5 });
    expect(await heard(page)).toEqual([]);
    await endComposition(page, 'one', '１２');
    expect(await heard(page), 'read once, when the composition ends').toEqual(['input 12']);
    expect(await read(page, 'one'), 'and not touched').toMatchObject({ text: '１２', value: 5 });
    await blurInput(page, 'one');
    expect(await read(page, 'one')).toMatchObject({ text: '12', value: 12 });
    // NMI-31: a value set during a composition is applied when it ends.
    await focusInput(page, 'two');
    await compose(page, 'two', ['７']);
    await set(page, 'two', { value: 40 });
    expect((await read(page, 'two')).text, 'the composition is left alone').toBe('７');
    await endComposition(page, 'two', '７');
    expect(await read(page, 'two')).toMatchObject({ text: '40', value: 40 });
  });

  test('NMI-16: in Chromium a real composition, driven through the browser’s input method interface, is left to the native element and read when it is confirmed', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'the input method is driven over the DevTools protocol');
    await mount(page, [fx('one', {})]);
    await listen(page, 'one');
    await focusInput(page, 'one');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.imeSetComposition', { text: '１２', selectionStart: 2, selectionEnd: 2 });
    await settle(page, 'one');
    expect(await heard(page)).toEqual([]);
    await cdp.send('Input.insertText', { text: '１２' });
    await cdp.detach();
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 30)));
    expect(await read(page, 'one')).toMatchObject({ text: '１２', value: null });
    expect(await heard(page)).toEqual(['input 12']);
    await page.keyboard.press('Enter');
    expect(await read(page, 'one')).toMatchObject({ text: '12', value: 12 });
  });

  test('NMI-17: a committed or a set value is written in the locale’s form — its digits and its separator, a minus sign, minFractionDigits to maxFractionDigits digits, no exponent and no grouping — in input.typescale and the input color, on one line that scrolls inside the input and is never cut; an empty value is an empty input', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => ['stacked-locale-de', 'stacked-locale-ar', 'stacked-prefix', 'stacked-long-number', 'stacked-negative-decimal', 'stacked-empty'].includes(f.id)), fx('en', { value: 1234.5, locale: 'en-US' }), fx('lang', { value: 1.5 }), fx('narrow', { value: 8336817000, steppers: false })]);
    expect((await read(page, 'stacked-locale-de')).text).toBe('1,5');
    expect((await read(page, 'stacked-locale-ar')).text).toBe('١٢');
    expect((await read(page, 'stacked-prefix')).text, 'two fixed decimals').toBe('120.00');
    expect((await read(page, 'stacked-negative-decimal')).text).toBe('-0.25');
    expect((await read(page, 'stacked-long-number')).text).toBe('8336817000');
    expect((await read(page, 'stacked-empty')).text).toBe('');
    expect((await read(page, 'en')).text, 'never "1,234.5"').toBe('1234.5');
    await set(page, 'en', { value: 12, minFractionDigits: 2 });
    expect((await read(page, 'en')).text).toBe('12.00');
    await set(page, 'en', { value: 1e21, minFractionDigits: 0 });
    expect((await read(page, 'en')).text, 'no exponent').toBe('1000000000000000000000');
    // A commit writes the number back in the form.
    await retype(page, 'stacked-locale-de', '2,50');
    await blurInput(page, 'stacked-locale-de');
    expect(await read(page, 'stacked-locale-de')).toMatchObject({ text: '2,5', value: 2.5 });
    // Without `locale`: the nearest `lang` attribute.
    await host(page, 'lang').evaluate((el) => {
      const wrap = document.createElement('div');
      wrap.lang = 'de';
      el.before(wrap);
      wrap.append(el);
    });
    await set(page, 'lang', { value: 2.5 });
    expect((await read(page, 'lang')).text).toBe('2,5');
    // The text style and color; one line, scrolled and not cut.
    const field = input(page, 'stacked-empty');
    near(await px(field, 'font-size'), await token(page, 'input-typescale-medium-font-size'), 'input.typescale');
    expect(await css(field, 'color')).toBe(await color(page, 'stacked-input-color'));
    // (Without steppers, which would take a row of their own and leave the number the whole width: NMI-36.)
    await host(page, 'narrow').evaluate((el) => (el.style.inlineSize = '80px'));
    await frames(page);
    expect(await input(page, 'narrow').evaluate((el) => [el.scrollWidth > el.clientWidth, getComputedStyle(el).textOverflow, getComputedStyle(el).whiteSpace.includes('pre') || el.localName === 'input'])).toEqual([true, 'clip', true]);
  });

  test('NMI-18: a text is read by the field’s locale — "1,234.50", a minus sign, full-width digits and a pasted unit in English; "1,5" and "1.500" in German — and a text that is not a number is not one', async ({ page }) => {
    await mount(page, [fx('en', { locale: 'en-US', suffixText: 'px', prefixText: '$' }), fx('de', { locale: 'de-DE' }), fx('ar', { locale: 'ar-EG' })]);
    const reads = async (id: string, text: string) => {
      await listen(page, id);
      await focusInput(page, id);
      await input(page, id).evaluate((el, t) => {
        const field = el as HTMLInputElement;
        field.select();
        // Pasted, whole.
        field.setRangeText(t, 0, field.value.length, 'end');
        field.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertFromPaste' }));
      }, text);
      const [said] = await heard(page);
      await blurInput(page, id);
      const now = await read(page, id);
      return [said, now.value, now.invalid];
    };
    expect(await reads('en', ' 1,234.50 ')).toEqual(['input 1234.5', 1234.5, false]);
    expect(await reads('en', '−3')).toEqual(['input -3', -3, false]);
    expect(await reads('en', '-3')).toEqual(['input -3', -3, false]);
    expect(await reads('en', '１２')).toEqual(['input 12', 12, false]);
    expect(await reads('en', '12 px')).toEqual(['input 12', 12, false]);
    expect(await reads('en', '$5')).toEqual(['input 5', 5, false]);
    for (const text of ['1e3', '1.2.3', '-', 'abc']) expect(await reads('en', text), text).toEqual(['input null', null, true]);
    expect(await reads('en', '   ')).toEqual(['input null', null, false]);
    expect(await reads('de', '1,5')).toEqual(['input 1.5', 1.5, false]);
    expect(await reads('de', '1.500')).toEqual(['input 1500', 1500, false]);
    expect(await reads('ar', '١٢٫٥')).toEqual(['input 12.5', 12.5, false]);
    expect((await read(page, 'ar')).text).toBe('١٢٫٥');
  });

  test('NMI-19: input is emitted once per change of the text with the number it reads as — not clamped, not rounded — or null, and once per step; never when the product sets value; value stays the committed number until the next commit', async ({ page }) => {
    await mount(page, [fx('one', { value: 5, min: 0, max: 10 })]);
    await listen(page, 'one');
    await retype(page, 'one', '25');
    expect(await heard(page)).toEqual(['input 2', 'input 25']);
    expect((await read(page, 'one')).value, 'value is still the committed number').toBe(5);
    await page.keyboard.type('.4567');
    expect((await heard(page)).at(-1), 'not rounded').toBe('input 25.4567');
    await page.keyboard.type('x');
    expect(await heard(page), 'not a number: null').toEqual(['input null']);
    await blurInput(page, 'one');
    await heard(page);
    await set(page, 'one', { value: 7 });
    expect(await heard(page), 'the product’s value says nothing').toEqual([]);
    await retype(page, 'one', '25');
    await heard(page);
    await blurInput(page, 'one');
    expect(await heard(page), 'the commit clamps, and change carries 10').toEqual(['change 10']);
    await focusInput(page, 'one');
    await page.keyboard.press('ArrowDown');
    expect(await heard(page), 'a step: input once, then change').toEqual(['input 9', 'change 9']);
    // The native element's own input stops at the shadow root: every `input` heard carries a number or null.
    expect(await host(page, 'one').evaluate((el) => new Promise((resolve) => {
      el.addEventListener('input', (event) => resolve(event instanceof CustomEvent && event.target === el), { once: true });
      const field = el.shadowRoot!.querySelector<HTMLInputElement>('.input')!;
      field.value = '3';
      field.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    }))).toBe(true);
  });

  test('NMI-20: when focus leaves or Enter is pressed the text is committed — raised to min, lowered to max, rounded to maxFractionDigits a half away from zero, made the value and written back; an empty text makes the value empty; change once while the value differs; never moved to a multiple of step; Enter emits action after the change and asks the form to submit unless action is cancelled', async ({ page }) => {
    await mount(page, [fx('one', { value: 12, min: 0, max: 100, step: 5 }), fx('low', { min: 50, value: 60 }), fx('form', { value: 1, name: 'n' })]);
    await listen(page, 'one');
    const inputs = (events: string[]) => events.filter((e) => !e.startsWith('input'));
    await retype(page, 'one', '250');
    await blurInput(page, 'one');
    expect(await read(page, 'one')).toMatchObject({ text: '100', value: 100 });
    expect(inputs(await heard(page)), 'change once, with 100').toEqual(['change 100']);
    // The same value again: no change.
    await retype(page, 'one', '100.0');
    await blurInput(page, 'one');
    expect(await read(page, 'one')).toMatchObject({ text: '100', value: 100 });
    expect(inputs(await heard(page))).toEqual([]);
    // Not snapped to the step; rounded a half away from zero.
    await retype(page, 'one', '12');
    await blurInput(page, 'one');
    expect((await read(page, 'one')).value, 'a typed 12 with step 5 commits as 12').toBe(12);
    await retype(page, 'one', '1.0005');
    await page.keyboard.press('Enter');
    expect(await read(page, 'one')).toMatchObject({ text: '1.001', value: 1.001, focused: true });
    expect(inputs(await heard(page)), 'action follows the change').toEqual(['change 12', 'change 1.001', 'action 1.001']);
    await retype(page, 'one', '-4');
    await page.keyboard.press('Enter');
    expect(await read(page, 'one')).toMatchObject({ text: '0', value: 0 });
    // Emptied: the value is empty.
    await retype(page, 'one', '');
    await blurInput(page, 'one');
    expect(await read(page, 'one')).toMatchObject({ text: '', value: null, now: null });
    expect(inputs(await heard(page))).toEqual(['change 0', 'action 0', 'change null']);
    // Enter without an edit: action alone.
    await focusInput(page, 'one');
    await page.keyboard.press('Enter');
    expect(await heard(page)).toEqual(['action null']);
    // Never while the person types: "1" on the way to "100" above a minimum of 50.
    await retype(page, 'low', '1');
    expect(await read(page, 'low')).toMatchObject({ text: '1', value: 60 });
    await page.keyboard.type('00');
    await blurInput(page, 'low');
    expect(await read(page, 'low')).toMatchObject({ text: '100', value: 100 });
    // In a form: Enter asks it to submit, after action — unless action was cancelled.
    await host(page, 'form').evaluate((el) => {
      const form = document.createElement('form');
      el.before(form);
      form.append(el);
      const w = window as unknown as { __submits: string[] };
      w.__submits = [];
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        w.__submits.push(new FormData(form).get('n') as string);
      });
    });
    const submits = () => page.evaluate(() => (window as unknown as { __submits: string[] }).__submits.splice(0));
    await retype(page, 'form', '2.50');
    await page.keyboard.press('Enter');
    expect(await submits(), 'the committed value, as a plain decimal').toEqual(['2.5']);
    await host(page, 'form').evaluate((el) => el.addEventListener('action', (event) => event.preventDefault()));
    await retype(page, 'form', '3');
    await page.keyboard.press('Enter');
    expect([await submits(), (await read(page, 'form')).value], 'cancelled: committed, not submitted').toEqual([[], 3]);
  });

  test('NMI-21: a committed text that is not a number is kept as the person left it, makes the value empty, puts the input in the error condition and emits entryerror once with the reason invalid and invalidText; unframed, invalidText is its description; in a Field the refusal is reported to the Field, which shows invalidText in its supporting row — its errorText while that is empty, its help in the error color while both are — and gives it back as the description; the error ends, without an event, when the text is edited into a number or emptied, when a step gives a value, or when the product sets value, and the report is withdrawn; the product’s own error and its Field’s are untouched', async ({ page }) => {
    await mount(page, [fx('one', { value: 5, invalidText: 'Enter a number.' }), fx('wordless', {}), fx('own', { error: true, invalidText: 'Enter a number.' })], { reducedMotion: true });
    await listen(page, 'one');
    await retype(page, 'one', '12 apples');
    await heard(page);
    await blurInput(page, 'one');
    expect(await read(page, 'one')).toMatchObject({ text: '12 apples', value: null, invalid: true, now: null });
    expect(await heard(page)).toEqual(['entryerror invalid Enter a number.', 'change null']);
    expect(await described(page, 'one'), 'unframed: invalidText is its description').toBe('Enter a number.');
    expect(await css(part(page, 'one', '.edge'), 'border-top-color'), 'the error condition, as error puts it').toBe(await color(page, 'stacked-error-outline-color'));
    expect(await host(page, 'one').evaluate((el) => (el as HTMLElement & { error: boolean }).error), 'the product’s error is untouched').toBe(false);
    // Left again without an edit: nothing more is said.
    await focusInput(page, 'one');
    await blurInput(page, 'one');
    expect(await heard(page)).toEqual([]);
    // Delete " apples": the error ends and input carries 12.
    await focusInput(page, 'one');
    await input(page, 'one').evaluate((el) => (el as HTMLInputElement).setSelectionRange(9, 9));
    for (let i = 0; i < 7; i++) await page.keyboard.press('Backspace');
    expect((await heard(page)).at(-1)).toBe('input 12');
    expect(await read(page, 'one')).toMatchObject({ text: '12', invalid: false, value: null });
    expect(await described(page, 'one'), 'the description goes with the error').toBe('');
    await blurInput(page, 'one');
    expect(await heard(page)).toEqual(['change 12']);
    // Ended by a step, by an emptied text and by the product's value.
    for (const end of ['step', 'empty', 'product'] as const) {
      await retype(page, 'one', 'abc');
      await blurInput(page, 'one');
      expect((await read(page, 'one')).invalid, end).toBe(true);
      await heard(page);
      if (end === 'step') {
        await focusInput(page, 'one');
        await page.keyboard.press('ArrowUp');
        expect(await read(page, 'one')).toMatchObject({ invalid: false, text: '0', value: 0 });
        expect(await heard(page), 'no event of its own').toEqual(['input 0', 'change 0']);
      } else if (end === 'empty') {
        await retype(page, 'one', '');
        expect(await read(page, 'one')).toMatchObject({ invalid: false, text: '' });
        expect(await heard(page)).toEqual(['input null']);
      } else {
        await set(page, 'one', { value: 8 });
        expect(await read(page, 'one')).toMatchObject({ invalid: false, text: '8', value: 8 });
        expect(await heard(page)).toEqual([]);
      }
    }
    // No words for it: the event carries an empty text, and an unframed input has no description.
    await listen(page, 'wordless');
    await retype(page, 'wordless', 'x');
    await heard(page);
    await blurInput(page, 'wordless');
    expect(await heard(page)).toEqual(['entryerror invalid ']);
    expect(await read(page, 'wordless')).toMatchObject({ invalid: true, text: 'x' });
    expect(await described(page, 'wordless')).toBe('');
    // The product's own error stays when the entry error ends.
    await retype(page, 'own', 'x');
    await blurInput(page, 'own');
    expect(await described(page, 'own')).toBe('Enter a number.');
    await retype(page, 'own', '4');
    expect((await read(page, 'own')).invalid).toBe(true);
    expect(await described(page, 'own')).toBe('');

    // In a Field (FLD-28): the Field shows the words, in its error color, and they are the input's description — once.
    const help = 'Up to 99 per order.';
    await frame(page, 'framed', { label: 'Quantity', supportingText: help, errorText: 'Order at least 1.' }, { value: 5, invalidText: 'Enter a number.' });
    await frame(page, 'fallback', { label: 'Quantity', supportingText: help, errorText: 'Order at least 1.' }, {});
    await frame(page, 'help', { label: 'Quantity', supportingText: help }, {});
    await frame(page, 'field-error', { label: 'Quantity', error: true, errorText: 'Order at least 1.' }, { invalidText: 'Enter a number.' });
    // The help, which stays, and the error text below it (FLD-7, FLD-28, FLD-31).
    const shown = (id: string) => row(page, id).locator('.supporting-text');
    const wrong = (id: string) => row(page, id).locator('.error-text');
    const errorColor = await resolveColor(page, '--tanrei-comp-field-standard-error-text-color');
    await expect(shown('framed')).toHaveText(help);
    expect(await described(page, 'framed')).toBe(help);
    for (const [id, text] of [['framed', 'Enter a number.'], ['fallback', 'Order at least 1.'], ['help', '']] as const) {
      await retype(page, id, 'x');
      await blurInput(page, id);
      // FLD-7: with words, the error text stands in the help's place; without, the help stays.
      if (text) await expect(shown(id), `${id}: the error text in the help’s place`).toHaveCount(0);
      else await expect(shown(id), `${id}: no words, the help stays`).toHaveText(help);
      if (text) {
        await expect(wrong(id), id).toHaveText(text);
        await expect.poll(() => css(wrong(id), 'color'), { message: id }).toBe(errorColor);
      } else await expect(wrong(id), `${id}: no words, no error text`).toHaveCount(0);
      await expect.poll(() => described(page, id), { message: `${id}: what the row draws, said once` }).toBe(text || help);
      expect(await read(page, id), id).toMatchObject({ invalid: true, text: 'x', value: null });
      expect(await row(page, id).evaluate((el) => (el as HTMLElement & { error: boolean }).error), `${id}: the Field’s error is untouched`).toBe(false);
    }
    // The report is withdrawn with the error: the help is back, in its own color.
    await retype(page, 'framed', '7');
    await expect(wrong('framed')).toHaveCount(0);
    await expect(shown('framed')).toHaveText(help);
    await expect.poll(() => css(shown('framed'), 'color')).toBe(await resolveColor(page, '--tanrei-comp-field-standard-focused-supporting-text-color'));
    expect((await read(page, 'framed')).invalid).toBe(false);
    // The Field's own error and errorText stay when the entry error ends.
    await retype(page, 'field-error', 'x');
    await blurInput(page, 'field-error');
    await expect(wrong('field-error')).toHaveText('Enter a number.');
    await retype(page, 'field-error', '4');
    await expect(wrong('field-error')).toHaveText('Order at least 1.');
    expect((await read(page, 'field-error')).invalid).toBe(true);
  });

  test('NMI-22: a step starts from the number the text reads as and goes to the next number on the step’s grid counted from min, held within min and max and computed in decimal; it becomes the value, is written with the caret at its end, and emits input and then change; an empty field takes the number nearest to zero the limits allow; a step that would not change the value does and emits nothing; a step of 0 or less steps by 1 and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('five', { value: 12, min: 0, step: 5 }), fx('tenth', { value: 0.2, step: 0.1 }), fx('from-ten', { min: 10, max: 20 }), fx('around', { min: -5, max: 5 }), fx('free', {}), fx('bad', { value: 3, step: 0 }), fx('typed', { value: 1, max: 100 })]);
    const step = async (id: string, key: string) => {
      await focusInput(page, id);
      await page.keyboard.press(key);
      return read(page, id);
    };
    await listen(page, 'five');
    expect(await step('five', 'ArrowUp')).toMatchObject({ value: 15, text: '15', caret: [2, 2] });
    expect(await heard(page)).toEqual(['input 15', 'change 15']);
    await set(page, 'five', { value: 12 });
    expect((await step('five', 'ArrowDown')).value, 'between two: to the nearer one in the direction').toBe(10);
    expect(await step('five', 'ArrowDown')).toMatchObject({ value: 5 });
    expect(await step('five', 'ArrowDown')).toMatchObject({ value: 0 });
    await heard(page);
    expect(await step('five', 'ArrowDown'), 'down at min').toMatchObject({ value: 0, text: '0' });
    expect(await heard(page), 'nothing is emitted').toEqual([]);
    expect(await step('tenth', 'ArrowUp'), '0.2 stepped by 0.1').toMatchObject({ value: 0.3, text: '0.3' });
    expect((await step('tenth', 'ArrowUp')).value).toBe(0.4);
    expect((await step('from-ten', 'ArrowDown')).value, 'empty, min 10, max 20: the first step gives 10').toBe(10);
    expect((await step('around', 'ArrowUp')).value, 'empty, min -5, max 5: the first step gives 0').toBe(0);
    expect((await step('free', 'ArrowDown')).value, 'empty and free: zero, and nothing more').toBe(0);
    expect((await step('bad', 'ArrowUp')).value, 'a step of 0 steps by 1').toBe(4);
    await expect.poll(() => seen.some((w) => w.includes('NMI-22'))).toBe(true);
    // From what the text reads as, not from the committed value; a text that is not a number steps from the value.
    await listen(page, 'typed');
    await retype(page, 'typed', '41.5');
    await heard(page);
    await page.keyboard.press('ArrowUp');
    expect(await read(page, 'typed')).toMatchObject({ value: 42, text: '42' });
    expect(await heard(page)).toEqual(['input 42', 'change 42']);
    await retype(page, 'typed', 'abc');
    await page.keyboard.press('ArrowUp');
    expect(await read(page, 'typed')).toMatchObject({ value: 43, text: '43' });
    // Held within the limits.
    await retype(page, 'typed', '250');
    await page.keyboard.press('ArrowUp');
    expect(await read(page, 'typed')).toMatchObject({ value: 100, text: '100' });
    await heard(page);
    await page.keyboard.press('ArrowUp');
    expect(await heard(page), 'up at max').toEqual([]);
  });

  test('NMI-23: Up Arrow and Down Arrow step by step, Page Up and Page Down by ten times step, once for each repeat of a held key; Home, End, Left Arrow and Right Arrow and every arrow or page key with a modifier are the text’s and change nothing; there is no key for min and max', async ({ page, browserName }) => {
    await mount(page, [fx('one', { value: 40, min: 0, max: 200, step: 2 })]);
    await focusInput(page, 'one');
    const press = async (key: string) => {
      await page.keyboard.press(key);
      return (await read(page, 'one')).value;
    };
    expect(await press('ArrowUp')).toBe(42);
    expect(await press('ArrowDown')).toBe(40);
    expect(await press('PageUp'), 'ten times step: 20').toBe(60);
    expect(await press('PageDown')).toBe(40);
    // A page step is ten steps on the step's own grid — min plus a whole multiple of step (NMI-22), as a slider's page
    // key and HTML's stepUp(10) go: from 42, 62 and then 82, never the next multiple of 20.
    expect(await press('ArrowUp')).toBe(42);
    expect(await press('PageUp'), 'from 42, ten steps of 2').toBe(62);
    expect(await press('PageUp')).toBe(82);
    expect(await press('PageDown')).toBe(62);
    expect(await press('PageDown')).toBe(42);
    expect(await press('ArrowDown')).toBe(40);
    // From a number between two of the grid: the nearer one in the direction is the first of the ten steps.
    await set(page, 'one', { value: 43 });
    expect(await press('PageUp'), 'from 43: 44 and nine steps more').toBe(62);
    await set(page, 'one', { value: 43 });
    expect(await press('PageDown'), 'from 43: 42 and nine steps less').toBe(24);
    await set(page, 'one', { value: 50 });
    // A key the platform repeats steps once for each repeat.
    await page.keyboard.down('ArrowUp');
    await page.keyboard.down('ArrowUp');
    await page.keyboard.down('ArrowUp');
    await page.keyboard.up('ArrowUp');
    expect((await read(page, 'one')).value).toBe(56);
    // The text's own keys.
    for (const key of ['Home', 'End', 'ArrowLeft', 'ArrowRight', 'Shift+ArrowUp', 'Shift+ArrowDown', 'Alt+ArrowUp', 'Control+ArrowDown', 'Shift+PageUp', 'Meta+ArrowUp', 'Shift+Home', 'Shift+End']) {
      // (Meta with an arrow is a history shortcut in some engines' test builds; it is still not a step.)
      if (key.startsWith('Meta') && browserName === 'firefox') continue;
      expect(await press(key), key).toBe(56);
    }
    expect((await read(page, 'one')).text).toBe('56');
    // Home and End move the caret, where the platform's text input gives them that (Chromium's does on every platform).
    if (browserName === 'chromium') {
      await page.keyboard.press('Home');
      expect((await read(page, 'one')).caret).toEqual([0, 0]);
      await page.keyboard.press('End');
      expect((await read(page, 'one')).caret).toEqual([2, 2]);
    }
    // The arrows a step takes are not also the caret's.
    const prevented = await input(page, 'one').evaluate((el) => ['ArrowUp', 'PageDown', 'Home', 'ArrowLeft'].map((key) => !el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }))));
    expect(prevented).toEqual([true, true, false, false]);
  });

  test('NMI-24: the wheel, a trackpad scroll or a swipe over the field changes neither the value nor the text, focused or not — the page scrolls instead — and a drag along the field, its label or its unit changes nothing', async ({ page, browserName }) => {
    await page.setViewportSize({ width: 600, height: 400 });
    await mount(page, [fx('one', { variant: 'outlined', value: 12, suffixText: 'kg' }), fx('tall', {})], { system: 'm3-like' });
    await stage(page, 'tall').evaluate((el) => (el.style.blockSize = '2000px'));
    await listen(page, 'one');
    const [x, y] = await centre(input(page, 'one'));
    await page.mouse.move(x, y);
    for (const focused of [false, true]) {
      if (focused) await focusInput(page, 'one');
      await page.evaluate(() => window.scrollTo(0, 0));
      // (WebKit's test build has no wheel for a mobile-less page beyond the event: the event is dispatched there.)
      if (browserName === 'webkit') await input(page, 'one').evaluate((el) => el.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, composed: true, cancelable: true })));
      else {
        await page.mouse.wheel(0, 120);
        await expect.poll(() => page.evaluate(() => window.scrollY), { message: `focused ${focused}: the page scrolled` }).toBeGreaterThan(0);
      }
      expect(await read(page, 'one'), `focused ${focused}`).toMatchObject({ value: 12, text: '12' });
    }
    // The field cancels no wheel: scrolling is the page's.
    expect(await input(page, 'one').evaluate((el) => el.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, composed: true, cancelable: true })))).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    // A drag along the label, the unit and the field.
    for (const selector of ['.floating', '.suffix', '.container'] as const) {
      const b = await box(part(page, 'one', selector));
      await page.mouse.move(b.x + 2, b.y + b.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + 60, b.y + b.height / 2 - 30, { steps: 4 });
      await page.mouse.up();
      expect(await read(page, 'one'), selector).toMatchObject({ value: 12, text: '12' });
    }
    expect(await heard(page)).toEqual([]);
  });
});

test.describe('behavior: the steppers, the unit and what the product sets', () => {
  test('NMI-25: two steppers stand at the end of the container after the suffix — first the one that steps down, showing remove, then the one that steps up, showing add — each an icon-only text Button of the medium size, each keeping the touch target’s length along the row, the last stepper.inset from the end edge; they are not focus stops and are buttons named by decrementLabel and incrementLabel; the one that has nowhere to go is disabled; without steppers, or read-only, none is drawn and no room kept; an empty name is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [...spec.fixtures.filter((f) => ['stacked-value', 'stacked-at-min', 'stacked-at-max', 'stacked-no-steppers', 'stacked-read-only', 'stacked-disabled', 'stacked-unit'].includes(f.id)), fx('ja', { label: '数量', value: 12, incrementLabel: '増やす', decrementLabel: '減らす' }), fx('unnamed', { incrementLabel: '', value: 1 }), fx('after', {})]);
    const id = 'stacked-unit';
    const [c, suffix, down, up] = [await box(container(page, id)), await box(part(page, id, '.suffix')), await box(stepper(page, id, 'down')), await box(stepper(page, id, 'up'))];
    expect(suffix.x + suffix.width, 'after the suffix').toBeLessThanOrEqual(down.x);
    expect(down.x, 'down first, then up').toBeLessThan(up.x);
    expect(await stepper(page, id, 'down').evaluate((el) => [el.localName, el.getAttribute('variant'), (el as HTMLElement & { size: string }).size, (el as HTMLElement & { width: string }).width, el.textContent?.trim()])).toEqual(['tanrei-button', 'text', 'medium', 'default', 'remove']);
    expect(await stepper(page, id, 'up').evaluate((el) => el.textContent?.trim())).toBe('add');
    const button = await resolveToken(page, '--tanrei-comp-button-container-height-medium');
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    for (const b of [down, up]) {
      near(b.width, button, 'Button’s medium size, as wide as it is high');
      near(b.height, button, 'Button’s medium size');
      near(b.y + b.height / 2, c.y + c.height / 2, 'centred vertically');
    }
    // Each keeps the touch target along the row: two buttons narrower than it stand apart by what is missing.
    near(up.x - (down.x + down.width), Math.max(await token(page, 'stepper-gap'), touch - button), 'the two stand apart by what their targets lack');
    near(c.x + c.width - (up.x + up.width), await token(page, 'stepper-inset'), 'stepper.inset from the end edge');
    // Under the default system: 40 each, 8 apart — 88 of the container's width — and 4 from its end.
    expect([button, up.x + up.width - down.x, await token(page, 'stepper-inset')]).toEqual([40, 88, 4]);
    // Buttons, named, outside the focus order: the native button carries tabindex -1 and is still a button.
    for (const [which, name] of [['down', 'Decrease'], ['up', 'Increase']] as const) {
      const native = stepper(page, id, which).locator('button');
      expect(await native.evaluate((el) => [el.getAttribute('aria-label'), el.tabIndex, (el as HTMLButtonElement).disabled, el.getAttribute('aria-hidden')]), which).toEqual([name, -1, false, null]);
    }
    expect(await stepper(page, 'ja', 'up').locator('button').getAttribute('aria-label')).toBe('増やす');
    await tabTo(page, input(page, id));
    await tab(page);
    expect(await host(page, id).evaluate((el) => el.shadowRoot!.activeElement), 'Tab leaves the field: no stepper is a stop').toBeNull();
    // Disabled where there is nowhere to go.
    expect(await read(page, 'stacked-at-min')).toMatchObject({ down: true, up: false });
    expect(await read(page, 'stacked-at-max')).toMatchObject({ down: false, up: true });
    expect(await read(page, 'stacked-value')).toMatchObject({ down: false, up: false });
    expect(await read(page, 'stacked-disabled')).toMatchObject({ down: true, up: true });
    expect(await stepper(page, 'stacked-at-min', 'down').locator('button').evaluate((el) => (el as HTMLButtonElement).disabled)).toBe(true);
    // A value past a limit, set by the product: that stepper is disabled too.
    await set(page, 'stacked-at-max', { value: 150 });
    expect(await read(page, 'stacked-at-max')).toMatchObject({ down: false, up: true, text: '150' });
    // None drawn, and no room kept.
    for (const bare of ['stacked-no-steppers', 'stacked-read-only']) {
      await expect(part(page, bare, '.stepper'), bare).toHaveCount(0);
      const [bc, field] = [await box(container(page, bare)), await box(input(page, bare))];
      near(bc.x + bc.width - (field.x + field.width), await token(page, 'container-padding-inline-medium'), `${bare}: the input line reaches the end padding`);
    }
    await expect(stepper(page, 'unnamed', 'up'), 'still drawn').toBeVisible();
    await expect.poll(() => seen.some((w) => w.includes('NMI-44') && w.includes('incrementLabel'))).toBe(true);
    // A Button in its press: the pressed state shows on the stepper itself.
    const [x, y] = await centre(stepper(page, 'stacked-value', 'up'));
    await page.mouse.move(x, y);
    await page.mouse.down();
    expect(await stepper(page, 'stacked-value', 'up').locator('button').getAttribute('data-pressed')).not.toBeNull();
    await page.mouse.up();
  });

  test('NMI-26: a press on a stepper steps once when the press begins and moves no focus — an unfocused field stays unfocused, a focused input keeps its focus; it emits input and then change and ends an entry error; a stepper activated through assistive technology steps once too', async ({ page }) => {
    await mount(page, [fx('one', { value: 12, min: 0, max: 99 }), fx('other', {})]);
    await listen(page, 'one');
    await focusInput(page, 'other');
    const [x, y] = await centre(stepper(page, 'one', 'up'));
    await page.mouse.move(x, y);
    // The press lasts no page time: the clock is held from before it begins until it has ended, so however long the
    // machine takes between the reads, the press is not held past motion.repeat-delay (NMI-27 is the held press).
    await holdClock(page);
    await page.mouse.down();
    expect(await read(page, 'one'), 'stepped when the press began').toMatchObject({ value: 13, text: '13', focused: false });
    expect(await heard(page)).toEqual(['input 13']);
    await page.mouse.up();
    expect(await heard(page), 'change when the press ends').toEqual(['change 13']);
    expect(await read(page, 'one'), 'one step, not two').toMatchObject({ value: 13, focused: false });
    expect((await read(page, 'other')).focused, 'focus stayed where it was').toBe(true);
    await releaseClock(page);
    // A focused input keeps its focus.
    await focusInput(page, 'one');
    await pressOn(stepper(page, 'one', 'down'));
    expect(await read(page, 'one')).toMatchObject({ value: 12, text: '12', focused: true, caret: [2, 2] });
    expect(await heard(page)).toEqual(['input 12', 'change 12']);
    // A touch: the same, and the field stays unfocused.
    await blurInput(page, 'one');
    await stepper(page, 'one', 'up').evaluate((el) => {
      const b = el.getBoundingClientRect();
      const at = { clientX: b.x + b.width / 2, clientY: b.y + b.height / 2, bubbles: true, composed: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0 };
      const target = el.shadowRoot!.querySelector('button')!;
      target.dispatchEvent(new PointerEvent('pointerdown', at));
      window.dispatchEvent(new PointerEvent('pointerup', at));
    });
    expect(await read(page, 'one')).toMatchObject({ value: 13, focused: false });
    expect(await heard(page)).toEqual(['input 13', 'change 13']);
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 20)));
    // Assistive technology: a click no press began.
    await stepper(page, 'one', 'up').locator('button').evaluate((el) => (el as HTMLElement).click());
    expect(await read(page, 'one')).toMatchObject({ value: 14, focused: false });
    expect(await heard(page)).toEqual(['input 14', 'change 14']);
    // It ends an entry error.
    await retype(page, 'one', 'abc');
    await blurInput(page, 'one');
    expect((await read(page, 'one')).invalid).toBe(true);
    await pressOn(stepper(page, 'one', 'up'));
    expect(await read(page, 'one')).toMatchObject({ invalid: false, value: 0, text: '0' });
    // The other button of the pointer does nothing.
    await heard(page);
    await stepper(page, 'one', 'up').click({ button: 'right' });
    await page.keyboard.press('Escape');
    expect((await read(page, 'one')).value).toBe(0);
  });

  test('NMI-27: a held stepper repeats its step after motion.repeat-delay, then once every motion.repeat-interval, and after its tenth repeated step once every motion.repeat-interval-fast, until the press ends, the pointer leaves the stepper or the value reaches a limit; every step is one step; input for each and change once, when the hold ends; the waits are kept where motion is reduced', async ({ page }) => {
    await mount(page, [fx('one', { value: 0, step: 1 }), fx('limit', { value: 0, max: 3 }), fx('leave', { value: 0 })], { reducedMotion: true });
    expect([await duration(page, 'motion-repeat-delay'), await duration(page, 'motion-repeat-interval'), await duration(page, 'motion-repeat-interval-fast')], 'the default system’s waits').toEqual([500, 100, 50]);
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 5000));
    await listen(page, 'one');
    const value = async (id: string) => (await read(page, id)).value;
    const [x, y] = await centre(stepper(page, 'one', 'up'));
    await page.mouse.move(x, y);
    await page.mouse.down();
    expect(await value('one'), 'the press gives 1').toBe(1);
    await page.clock.runFor(499);
    expect(await value('one'), 'nothing before repeat-delay').toBe(1);
    await page.clock.runFor(1);
    expect(await value('one'), 'at 500 ms').toBe(2);
    await page.clock.runFor(99);
    expect(await value('one')).toBe(2);
    await page.clock.runFor(1);
    expect(await value('one'), 'at 600 ms').toBe(3);
    await page.clock.runFor(800);
    expect(await value('one'), 'the repeats at 500, 600 … 1400 ms give 2 to 11').toBe(11);
    await page.clock.runFor(50);
    expect(await value('one'), 'at 1450 ms').toBe(12);
    await page.clock.runFor(50);
    expect(await value('one'), 'at 1500 ms').toBe(13);
    const before = await heard(page);
    expect(before, 'input for each step, and no change yet').toEqual(Array.from({ length: 13 }, (_, i) => `input ${i + 1}`));
    await page.mouse.up();
    expect(await heard(page), 'one change, with 13').toEqual(['change 13']);
    await page.clock.runFor(2000);
    expect(await value('one'), 'released: no more steps').toBe(13);
    // Until the value reaches the limit: the hold ends there, and says so once.
    await listen(page, 'limit');
    const [lx, ly] = await centre(stepper(page, 'limit', 'up'));
    await page.mouse.move(lx, ly);
    await page.mouse.down();
    await page.clock.runFor(5000);
    expect(await read(page, 'limit')).toMatchObject({ value: 3, up: true });
    expect(await heard(page)).toEqual(['input 1', 'input 2', 'input 3', 'change 3']);
    await page.mouse.up();
    expect(await heard(page)).toEqual([]);
    // Until the pointer leaves the stepper.
    await listen(page, 'leave');
    const [vx, vy] = await centre(stepper(page, 'leave', 'up'));
    await page.mouse.move(vx, vy);
    await page.mouse.down();
    await page.clock.runFor(600);
    expect(await value('leave')).toBe(3);
    await page.mouse.move(vx, vy + 120, { steps: 3 });
    await page.clock.runFor(2000);
    expect(await value('leave'), 'left: no more steps').toBe(3);
    expect((await heard(page)).at(-1)).toBe('change 3');
    await page.mouse.up();
  });

  test('NMI-28: the prefix stands before the number and the suffix after the input, affix.gap from it, on the input’s line and in its text style, in the affix color, never cut — the input gives up its width first; they are not selected or edited, a press on them focuses the input, and they are kept from being read as texts of their own', async ({ page }) => {
    await mountSpec(page, ['stacked-prefix', 'stacked-unit', 'stacked-percent', 'stacked-error']);
    const id = 'stacked-prefix';
    const [prefix, field, suffix] = [await box(part(page, id, '.prefix')), await box(input(page, id)), await box(part(page, id, '.suffix'))];
    near(field.x - (prefix.x + prefix.width), await token(page, 'affix-gap'), 'affix.gap after the prefix');
    near(suffix.x - (field.x + field.width), await token(page, 'affix-gap'), 'affix.gap before the suffix');
    near(prefix.y + prefix.height / 2, field.y + field.height / 2, 'on the input’s line', 1);
    for (const [selector, text] of [['.prefix', '$'], ['.suffix', 'USD']] as const) {
      const affix = part(page, id, selector);
      await expect(affix).toHaveText(text);
      expect(await css(affix, 'color'), selector).toBe(await color(page, 'stacked-affix-color'));
      for (const property of ['font-size', 'font-family', 'letter-spacing']) expect(await css(affix, property), `${selector} ${property}`).toBe(await css(input(page, id), property));
      expect(await affix.evaluate((el) => [el.getAttribute('aria-hidden'), getComputedStyle(el).userSelect === 'none' || getComputedStyle(el).webkitUserSelect === 'none']), selector).toEqual(['true', true]);
    }
    await expect(part(page, 'stacked-unit', '.suffix')).toHaveText('px');
    await expect(part(page, 'stacked-percent', '.suffix')).toHaveText('%');
    await expect(part(page, 'stacked-unit', '.prefix'), 'no prefix: no box, no gap').toBeHidden();
    await expect(part(page, 'stacked-error', '.suffix')).toBeHidden();
    // Never cut: in a field too narrow for everything, the input gives up its width and the affixes keep theirs.
    const widths = [prefix.width, suffix.width];
    await host(page, id).evaluate((el) => (el.style.inlineSize = '60px'));
    await frames(page);
    near((await box(part(page, id, '.prefix'))).width, widths[0], 'the prefix keeps its width', 0.1);
    near((await box(part(page, id, '.suffix'))).width, widths[1], 'the suffix keeps its width', 0.1);
    expect((await box(input(page, id))).width).toBeLessThan(field.width);
    // No control for choosing a unit.
    expect(await host(page, id).evaluate((el) => el.shadowRoot!.querySelectorAll('select, [role="combobox"], [role="listbox"]').length)).toBe(0);
  });

  test('NMI-29: the number stands at the field’s start edge while align is start and at the end of its run, against the suffix, while it is end — the right edge for a left-to-right run and the left for a right-to-left one, in every layout direction; the number, the placeholder, the prefix and the suffix are drawn with tabular figures', async ({ page }) => {
    await mount(page, spec.fixtures.filter((f) => ['stacked-align-end', 'stacked-value', 'beside-slider'].includes(f.id)));
    expect(await css(input(page, 'stacked-value'), 'text-align')).toBe('left');
    expect(await css(input(page, 'stacked-align-end'), 'text-align')).toBe('right');
    expect(await css(input(page, 'beside-slider'), 'text-align')).toBe('right');
    // The four rows of layout and run, for both values: start is the layout's start edge; end is the run's end, so where
    // the run runs against the layout the two are one edge. The placeholder stands where the number would.
    const ROWS = [
      ['ltr', 'px', 'left', 'right'],
      ['rtl', 'كغم', 'right', 'left'],
      ['rtl', 'px', 'right', 'right'],
      ['rtl', '', 'right', 'right'],
      ['ltr', 'ק״ג', 'left', 'left'],
    ] as const;
    await mount(
      page,
      ROWS.flatMap(([direction, suffixText, start, end], i) => [fx(`row-${i}-start`, { suffixText, placeholder: '0', align: 'start' }, { direction }), fx(`row-${i}-end`, { suffixText, placeholder: '0', align: 'end' }, { direction })]),
    );
    for (const [i, [direction, suffixText, start, end]] of ROWS.entries()) {
      for (const [align, edge] of [['start', start], ['end', end]] as const) {
        const row = `row-${i}-${align}`;
        expect(await css(input(page, row), 'text-align'), `${direction} layout, suffix "${suffixText}", ${align}`).toBe(edge);
        expect(await input(page, row).evaluate((el) => getComputedStyle(el, '::placeholder').textAlign), `${row}: the placeholder`).toBe(edge);
      }
    }
    await mount(page, [...spec.fixtures.filter((f) => ['stacked-prefix'].includes(f.id)), fx('ones', { value: 111, align: 'end' }), fx('zeros', { value: 800, align: 'end' })]);
    for (const selector of ['.input', '.prefix', '.suffix']) expect(await css(part(page, 'stacked-prefix', selector), 'font-variant-numeric'), selector).toBe('tabular-nums');
    expect(await input(page, 'stacked-prefix').evaluate((el) => getComputedStyle(el, '::placeholder').fontVariantNumeric)).toBe('tabular-nums');
    // Where the digits are: the text's own width, measured with the input's font, against the input's edges.
    const ink = (id: string) =>
      input(page, id).evaluate((el) => {
        const field = el as HTMLInputElement;
        const probe = document.createElement('span');
        const style = getComputedStyle(field);
        probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font-family:${style.fontFamily};font-size:${style.fontSize};font-weight:${style.fontWeight};font-variant-numeric:${style.fontVariantNumeric};letter-spacing:${style.letterSpacing}`;
        probe.textContent = field.value;
        document.body.append(probe);
        const width = probe.getBoundingClientRect().width;
        probe.remove();
        return width;
      });
    // Two numbers of three digits are as wide as each other: the digits of two fields stand under each other.
    near(await ink('ones'), await ink('zeros'), 'tabular figures', 0.1);
    expect(await ink('ones')).toBeLessThan((await box(input(page, 'ones'))).width);
  });

  test('NMI-30: a min above max makes max empty and is reported; a value the product sets below min, above max or with more digits than maxFractionDigits is not corrected — the value stays the product’s — and a minFractionDigits above maxFractionDigits uses maxFractionDigits for both and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('crossed', { value: 5, min: 10, max: 2 }), fx('outside', { value: 150, min: 0, max: 100 }), fx('below', { value: -20, min: 0, max: 100 }), fx('digits', { value: 1.23456, maxFractionDigits: 2 }), fx('swapped', { value: 1.5, minFractionDigits: 4, maxFractionDigits: 1 })]);
    // max is empty: the spin button has no maximum, and a commit keeps a number above it.
    expect(await read(page, 'crossed')).toMatchObject({ min: '10', max: null });
    await retype(page, 'crossed', '500');
    await blurInput(page, 'crossed');
    expect((await read(page, 'crossed')).value).toBe(500);
    await expect.poll(() => seen.some((w) => w.includes('NMI-30') && w.includes('max'))).toBe(true);
    // Not corrected: shown and held as given, and entering and leaving the field changes nothing.
    for (const [id, value, text] of [['outside', 150, '150'], ['below', -20, '-20'], ['digits', 1.23456, '1.23']] as const) {
      await listen(page, id);
      expect(await read(page, id), id).toMatchObject({ value, text });
      await focusInput(page, id);
      await blurInput(page, id);
      await focusInput(page, id);
      await page.keyboard.press('Enter');
      expect(await read(page, id), `${id}: left as it was`).toMatchObject({ value, text });
      expect((await heard(page)).filter((e) => !e.startsWith('action')), id).toEqual([]);
    }
    expect((await read(page, 'outside')).now, 'exposed as it is').toBe('150');
    expect((await read(page, 'swapped')).text, 'maxFractionDigits for both').toBe('1.5');
    await expect.poll(() => seen.some((w) => w.includes('NMI-30') && w.includes('minFractionDigits'))).toBe(true);
  });

  test('NMI-26, NMI-25: a stepper that holds focus itself — given by a script or by assistive technology, never by Tab or a press — and steps to the limit is disabled under that focus, and focus goes to the input, the number input’s one stop, within the turn: no focus is heard going nowhere', async ({ page }) => {
    await mount(page, [fx('one', { value: 9, min: 0, max: 10 })]);
    await page.evaluate(() => {
      const log: string[] = ((window as unknown as { __left: string[] }).__left = []);
      window.addEventListener('focusout', (event) => log.push(event.relatedTarget ? 'on' : 'nowhere'), true);
    });
    const left = () => page.evaluate(() => (window as unknown as { __left: string[] }).__left.splice(0));
    for (const [which, from, to] of [['up', 9, 10], ['down', 1, 0]] as const) {
      await set(page, 'one', { value: from });
      await stepper(page, 'one', which).evaluate((el) => (el as HTMLElement).focus());
      expect(await host(page, 'one').evaluate((el) => el.shadowRoot!.activeElement?.className), 'focus is on the stepper').toContain(which);
      await left();
      await page.keyboard.press('Enter');
      await frames(page, 4);
      expect(await read(page, 'one'), `${which}: stepped to the limit, and the input has focus`).toMatchObject({ value: to, focused: true, [which]: true });
      expect(await host(page, 'one').evaluate((el) => el.shadowRoot!.activeElement?.localName)).toBe('input');
      // Focus that moves inside the number input is not heard outside it; focus that went to nothing would be.
      expect(await left(), 'focus went on to the input, never to nothing').toEqual([]);
    }
    // A step that does not reach the limit leaves focus on the stepper.
    await set(page, 'one', { value: 5 });
    await stepper(page, 'one', 'up').evaluate((el) => (el as HTMLElement).focus());
    await page.keyboard.press('Enter');
    await frames(page, 4);
    expect((await read(page, 'one')).value).toBe(6);
    expect(await host(page, 'one').evaluate((el) => el.shadowRoot!.activeElement?.className)).toContain('up');
  });
  test('NMI-31: a value the product sets that is the value the input holds already still replaces a text the person typed over it and ends an entry error — an entry error leaves the value empty, and the product that clears the field sets it empty — and emits nothing', async ({ page }) => {
    await mount(page, [fx('one', { value: 5, min: 0, max: 10 })]);
    await listen(page, 'one');
    // An entry error: the value is empty, the text stays. The product sets the value empty.
    await retype(page, 'one', 'abc');
    await blurInput(page, 'one');
    expect(await read(page, 'one')).toMatchObject({ text: 'abc', value: null, invalid: true });
    await heard(page);
    await set(page, 'one', { value: null });
    expect(await read(page, 'one'), 'the text and the error are gone').toMatchObject({ text: '', value: null, invalid: false });
    // A text still being edited over the value the product sets again.
    await set(page, 'one', { value: 5 });
    await retype(page, 'one', '77');
    await heard(page);
    await set(page, 'one', { value: 5 });
    expect(await read(page, 'one')).toMatchObject({ text: '5', value: 5 });
    await blurInput(page, 'one');
    expect(await heard(page), 'the typed text is gone, and nothing was said').toEqual([]);
    // The input's own commit into an entry error is not the product's set: the error lasts.
    await retype(page, 'one', '');
    await blurInput(page, 'one');
    await retype(page, 'one', 'abc');
    await blurInput(page, 'one');
    expect(await read(page, 'one')).toMatchObject({ text: 'abc', value: null, invalid: true });
    // The same value set where nothing was typed changes nothing and draws nothing again.
    await set(page, 'one', { value: 3 });
    await set(page, 'one', { value: 3 });
    expect(await read(page, 'one')).toMatchObject({ text: '3', value: 3, invalid: false });
  });
  test('NMI-31: a value the product sets is written into the input whatever the person had typed, ends an entry error and emits nothing; a change of min, max, step, the digits or the locale shows the value again in the new form and enables and disables the steppers, without changing the value or emitting anything', async ({ page }) => {
    await mount(page, [fx('one', { value: 5, min: 0, max: 10 })]);
    await listen(page, 'one');
    await retype(page, 'one', '77');
    await heard(page);
    await set(page, 'one', { value: 3 });
    expect(await read(page, 'one')).toMatchObject({ text: '3', value: 3 });
    await blurInput(page, 'one');
    expect(await heard(page), 'the typed text is gone, and nothing was said').toEqual([]);
    await retype(page, 'one', 'abc');
    await blurInput(page, 'one');
    await heard(page);
    await set(page, 'one', { value: 4 });
    expect(await read(page, 'one')).toMatchObject({ text: '4', value: 4, invalid: false });
    await set(page, 'one', { value: null });
    expect(await read(page, 'one')).toMatchObject({ text: '', value: null });
    // The attribute is a plain decimal string.
    await host(page, 'one').evaluate((el) => el.setAttribute('value', '2.5'));
    expect(await read(page, 'one')).toMatchObject({ text: '2.5', value: 2.5 });
    // The form: digits, then the locale.
    await set(page, 'one', { value: 2.5, minFractionDigits: 2 });
    expect((await read(page, 'one')).text).toBe('2.50');
    await set(page, 'one', { locale: 'de-DE' });
    expect(await read(page, 'one')).toMatchObject({ text: '2,50', value: 2.5 });
    await set(page, 'one', { locale: 'ar-EG', minFractionDigits: 0, maxFractionDigits: 0 });
    expect(await read(page, 'one')).toMatchObject({ text: '٣', value: 2.5 });
    // The limits: the steppers follow, the value does not.
    await set(page, 'one', { locale: '', maxFractionDigits: 3, max: 2 });
    expect(await read(page, 'one')).toMatchObject({ text: '2.5', value: 2.5, up: true, down: false, max: '2' });
    await set(page, 'one', { min: 2.5, max: null });
    expect(await read(page, 'one')).toMatchObject({ value: 2.5, up: false, down: true });
    await set(page, 'one', { step: 0.5, min: 0 });
    expect(await read(page, 'one')).toMatchObject({ value: 2.5, up: false, down: false });
    expect(await heard(page)).toEqual([]);
  });

  test('NMI-32: a disabled number input — disabled by the product, or by the Field that frames it — is not focusable or editable, steps by no input, emits nothing, is exposed as disabled, disables both steppers and draws every part from the disabled tokens of its variant', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => ['stacked-disabled'].includes(f.id)), fx('unit', { value: 8, suffixText: 'px', disabled: true }), fx('wrong', { value: 8, disabled: true, error: true }), fx('after', {})]);
    const id = 'stacked-disabled';
    await listen(page, id);
    expect(await input(page, id).evaluate((el) => [(el as HTMLInputElement).disabled, el.matches(':disabled')])).toEqual([true, true]);
    await host(page, id).evaluate((el) => (el as HTMLElement).focus());
    expect((await read(page, id)).focused, 'takes no focus').toBe(false);
    await pressOn(container(page, id));
    expect((await read(page, id)).focused).toBe(false);
    await pressOn(stepper(page, id, 'up'));
    await stepper(page, id, 'up').evaluate((el) => (el as HTMLElement).click());
    expect(await read(page, id)).toMatchObject({ value: 12, text: '12', down: true, up: true });
    expect(await heard(page)).toEqual([]);
    expect(await css(container(page, id), 'background-color')).toBe(await color(page, 'stacked-disabled-container-color'));
    expect(await css(input(page, id), 'color')).toBe(await color(page, 'stacked-disabled-input-color'));
    expect(await css(part(page, 'unit', '.suffix'), 'color')).toBe(await color(page, 'stacked-disabled-affix-color'));
    expect(await css(container(page, 'wrong'), 'background-color'), 'of its error parts while in error').toBe(await color(page, 'stacked-disabled-error-container-color'));
    expect(await css(part(page, 'wrong', '.edge'), 'border-top-color'), 'of its error parts while in error').toBe(await color(page, 'stacked-disabled-error-outline-color'));
    near(Number(await css(part(page, id, '.field'), 'opacity')), Number(await css(page.locator('html'), T('disabled-opacity'))), 'the disabled opacity', 0.001);
    expect(await container(page, id).getAttribute('aria-disabled')).toBe('true');
    // Out of the focus order.
    await tabTo(page, input(page, 'after'));
    await tab(page, { back: true });
    for (const disabled of [id, 'unit', 'wrong']) expect((await read(page, disabled)).focused, disabled).toBe(false);
    // Disabled by its Field (FLD-14): the spin button and both steppers, by the one exchange; its own `disabled` is not set.
    await frame(page, 'framed', { label: 'Quantity', disabled: true }, { value: 12 });
    expect(await input(page, 'framed').evaluate((el) => (el as HTMLInputElement).disabled)).toBe(true);
    expect(await read(page, 'framed')).toMatchObject({ down: true, up: true });
    expect(await host(page, 'framed').evaluate((el) => (el as HTMLElement & { disabled: boolean }).disabled)).toBe(false);
    expect(await css(container(page, 'framed'), 'background-color')).toBe(await color(page, 'stacked-disabled-container-color'));
    await listen(page, 'framed');
    await pressOn(row(page, 'framed').locator('.label-row > .label'));
    await pressOn(stepper(page, 'framed', 'up'));
    expect(await read(page, 'framed')).toMatchObject({ focused: false, value: 12, text: '12' });
    expect(await heard(page)).toEqual([]);
    await setField(page, 'framed', { disabled: false });
    expect(await input(page, 'framed').evaluate((el) => (el as HTMLInputElement).disabled)).toBe(false);
    expect(await read(page, 'framed')).toMatchObject({ down: false, up: false });
  });

  test('NMI-33: a read-only number input stays focusable, selectable and copyable, lets no typing and no key change the number, draws no steppers, emits no input or change, is exposed as read-only and renders as an enabled field with its hovered and focused states', async ({ page }) => {
    await mountSpec(page, ['stacked-read-only', 'stacked-value'], { reducedMotion: true });
    const id = 'stacked-read-only';
    await listen(page, id);
    await focusInput(page, id);
    expect((await read(page, id)).focused).toBe(true);
    await selectAll(page, id);
    expect(await input(page, id).evaluate((el) => [(el as HTMLInputElement).selectionStart, (el as HTMLInputElement).selectionEnd, (el as HTMLInputElement).readOnly, el.getAttribute('aria-readonly')])).toEqual([0, 2, true, 'true']);
    await page.keyboard.type('5');
    for (const key of ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Backspace']) await page.keyboard.press(key);
    await blurInput(page, id);
    expect(await read(page, id)).toMatchObject({ value: 12, text: '12' });
    expect(await heard(page)).toEqual([]);
    await expect(part(page, id, '.stepper')).toHaveCount(0);
    // Drawn as an enabled field: at rest as the editable one, and focused from the focused tokens.
    for (const property of ['background-color']) expect(await css(container(page, id), property)).toBe(await css(container(page, 'stacked-value'), property));
    expect(await css(input(page, id), 'color')).toBe(await color(page, 'stacked-input-color'));
    await focusInput(page, id);
    expect(await css(part(page, id, '.edge'), 'border-top-color')).toBe(await color(page, 'stacked-focused-outline-color'));
    await blurInput(page, id);
    const [x, y] = await centre(container(page, id));
    await page.mouse.move(x, y);
    await expect.poll(() => css(container(page, id), 'background-color')).toBe(await color(page, 'stacked-hovered-container-color'));
  });

  test('NMI-44: the number input has no words of its own — without incrementLabel and decrementLabel both steppers are still drawn and step for a pointer, each is kept from assistive technology — the spin button steps by itself — and the report names both props; the product’s words name them, and an instance’s own prop wins; it reads no other word: the words of a requirement are its Field’s', async ({ page, browserName }) => {
    const seen = warnings(page);
    const bare = (id: string, props: Fixture['props']): Fixture => ({ id, props: { label: 'Quantity', value: 5, ...props } });
    await mount(page, [bare('wordless', {}), bare('half', { incrementLabel: 'More' }), bare('own', { incrementLabel: 'More', decrementLabel: 'Fewer' })]);
    const exposure = (id: string, which: 'down' | 'up') => stepper(page, id, which).evaluate((el) => [el.getAttribute('aria-hidden'), el.shadowRoot!.querySelector('button')!.getAttribute('aria-label'), el.shadowRoot!.querySelector('button')!.tabIndex]);
    // Drawn, and kept from assistive technology; never a focus stop.
    for (const which of ['down', 'up'] as const) {
      await expect(stepper(page, 'wordless', which), which).toBeVisible();
      expect(await exposure('wordless', which), which).toEqual(['true', null, -1]);
    }
    // The one that has a name is exposed; the one that has none is not.
    expect(await exposure('half', 'up')).toEqual([null, 'More', -1]);
    expect(await exposure('half', 'down')).toEqual(['true', null, -1]);
    // A press on each steps the value.
    await pressOn(stepper(page, 'wordless', 'up'));
    await expect.poll(async () => (await read(page, 'wordless')).value).toBe(6);
    await pressOn(stepper(page, 'wordless', 'down'));
    await pressOn(stepper(page, 'wordless', 'down'));
    await expect.poll(async () => (await read(page, 'wordless')).value).toBe(4);
    // The spin button still steps from the keyboard.
    await tabTo(page, input(page, 'wordless'));
    await page.keyboard.press('ArrowUp');
    await expect.poll(async () => (await read(page, 'wordless')).value).toBe(5);
    // Neither is in the accessibility tree; the spin button is, with its value.
    if (browserName === 'chromium') {
      await mount(page, [bare('wordless', {})]);
      expect(await axNodes(page, 'button')).toEqual([]);
      const [spin] = await axNodes(page, 'spinbutton');
      expect(spin).toMatchObject({ name: 'Quantity', focusable: true });
      await mount(page, [bare('wordless', {}), bare('half', { incrementLabel: 'More' }), bare('own', { incrementLabel: 'More', decrementLabel: 'Fewer' })]);
    }
    // The report names both props, each once for the page — and the Button says nothing of a stepper its host hides.
    await expect.poll(() => seen.filter((w) => w.includes('NMI-44')).length).toBeGreaterThanOrEqual(2);
    expect(seen.find((w) => w.includes('NMI-44') && w.includes('incrementLabel'))).toContain('increment-label is empty');
    expect(seen.find((w) => w.includes('NMI-44') && w.includes('decrementLabel'))).toContain('decrement-label is empty');
    expect(seen.filter((w) => w.includes('BTN-16'))).toEqual([]);
    expect(await missingWords(page)).toEqual(['decrementLabel', 'incrementLabel']);
    expect(await page.evaluate((tag) => [...document.querySelectorAll(tag)].map((el) => [...el.shadowRoot!.querySelectorAll('tanrei-button')].map((button) => button.getAttribute('label')).join(' ')).join(' '), TAG)).not.toMatch(/Increase|Decrease/);
    // The product's words, set once: both steppers are named and exposed, at once.
    await setWords(page, { incrementLabel: 'Increase', decrementLabel: 'Decrease' });
    await expect.poll(() => exposure('wordless', 'up')).toEqual([null, 'Increase', -1]);
    expect(await exposure('wordless', 'down')).toEqual([null, 'Decrease', -1]);
    expect(await exposure('half', 'down')).toEqual([null, 'Decrease', -1]);
    // An instance's own prop wins.
    expect(await exposure('half', 'up')).toEqual([null, 'More', -1]);
    expect(await exposure('own', 'down')).toEqual([null, 'Fewer', -1]);
    expect(await missingWords(page)).toEqual([]);
    // The words of a requirement are the Field's (FLD-24): the input reads none of them, and holds none.
    await setWords(page, { incrementLabel: 'Increase', decrementLabel: 'Decrease', requiredText: 'Required', optionalText: 'Optional' });
    expect(await host(page, 'own').evaluate((el) => el.shadowRoot!.textContent)).not.toMatch(/Required|Optional/);
    expect(await host(page, 'own').evaluate((el) => ['requiredText', 'optionalText', 'optional', 'requiredMark', 'supportingText', 'errorText'].filter((name) => name in el))).toEqual([]);
  });
});

test.describe('behavior: exposure, forms, size and direction', () => {
  test('NMI-34: the input is a spin button named by label — its value the committed number, its limits min and max while each is given, its value text valueText or the number as shown with the prefix before and the suffix after it, each parted by a space; a field that holds no value exposes neither; the steppers are buttons named by decrementLabel and incrementLabel, and the prefix and suffix are not read a second time', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => ['stacked-unit', 'stacked-prefix', 'stacked-percent', 'beside-slider', 'stacked-empty', 'stacked-locale-ar'].includes(f.id)), fx('px', { value: 12, min: 0, max: 100, suffixText: 'px' })]);
    expect(await input(page, 'px').getAttribute('role')).toBe('spinbutton');
    expect(await read(page, 'px')).toMatchObject({ now: '12', min: '0', max: '100', valueText: '12 px' });
    await set(page, 'px', { valueText: '12 pixels' });
    expect((await read(page, 'px')).valueText).toBe('12 pixels');
    expect(await read(page, 'stacked-prefix')).toMatchObject({ now: '120', valueText: '$ 120.00 USD', min: null, max: null });
    expect((await read(page, 'stacked-percent')).valueText).toBe('40 %');
    expect(await read(page, 'stacked-unit')).toMatchObject({ now: '8', min: '0', max: null, valueText: '8 px' });
    expect(await read(page, 'beside-slider')).toMatchObject({ now: '1.5', min: '0.25', max: '4', valueText: '1.5 times' });
    expect(await read(page, 'stacked-empty')).toMatchObject({ now: null, valueText: null });
    expect(await read(page, 'stacked-locale-ar'), 'the value is a plain number; the text is as shown').toMatchObject({ now: '12', valueText: '١٢' });
    // The value is the committed number, not the text being typed.
    await retype(page, 'px', '55');
    expect((await read(page, 'px')).now).toBe('12');
    await page.keyboard.press('Enter');
    expect((await read(page, 'px')).now).toBe('55');
    for (const selector of ['.prefix', '.suffix']) expect(await part(page, 'stacked-prefix', selector).getAttribute('aria-hidden')).toBe('true');
  });

  test('NMI-34: Chromium’s accessibility tree — a spin button with its name, description, value, minimum, maximum and value text, its required, invalid, read-only and disabled states; the two steppers as named buttons with their disabled state; the prefix and the suffix not in it', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'the accessibility tree is read over the DevTools protocol');
    // In a Field, which names and describes it (FLD-10, FLD-11) — and alone on the page.
    await mount(page, [fx('base', {})]);
    await frame(page, 'one', { label: 'Corner radius', supportingText: 'In pixels.', required: false, optional: true, optionalText: 'Optional' }, { value: 12, min: 0, max: 100, suffixText: 'px', prefixText: '~' });
    await stage(page, 'base').evaluate((el) => el.remove());
    let [spin] = await axNodes(page, 'spinbutton');
    expect(spin).toMatchObject({ name: 'Corner radius', description: 'In pixels. Optional', valuemin: 0, valuemax: 100, focusable: true });
    expect(await input(page, 'one').getAttribute('aria-valuetext'), 'what the browser is given').toBe('~ 12 px');
    expect(Number(spin.value), 'valuenow').toBe(12);
    expect([spin.required, spin.invalid, spin.readonly, spin.disabled].map((state) => state ?? false), 'none of the states it does not have').toEqual([false, 'false', false, false]);
    let buttons = await axNodes(page, 'button');
    expect(buttons.map((b) => [b.name, b.disabled ?? false])).toEqual([['Decrease', false], ['Increase', false]]);
    // The affixes are no nodes of their own.
    const cdp = await page.context().newCDPSession(page);
    const { nodes } = await cdp.send('Accessibility.getFullAXTree');
    await cdp.detach();
    const texts = nodes.filter((node) => !node.ignored && node.role?.value === 'StaticText').map((node) => node.name?.value);
    expect(texts.filter((text) => text === 'px' || text === '~'), 'the prefix and the suffix are not read as texts of their own').toEqual([]);
    // A step is exposed at once; at the limit the stepper is a disabled button.
    await set(page, 'one', { value: 100, valueText: 'one hundred pixels' });
    [spin] = await axNodes(page, 'spinbutton');
    expect(Number(spin.value)).toBe(100);
    expect(await input(page, 'one').getAttribute('aria-valuetext')).toBe('one hundred pixels');
    buttons = await axNodes(page, 'button');
    // By name: the tree is listed by depth, and a disabled Button's host — a form-associated element,
    // disabled to the platform with its `disabled` attribute — is left out of it, one level above its button.
    expect(buttons.map((b) => [b.name, b.disabled ?? false]).sort()).toEqual([['Decrease', false], ['Increase', true]]);
    // No value: no value and no value text.
    await set(page, 'one', { value: null, valueText: '' });
    [spin] = await axNodes(page, 'spinbutton');
    expect(await read(page, 'one'), 'no value: nothing is given').toMatchObject({ now: null, valueText: null });
    expect(spin.valuetext ?? '', 'and no value text is computed').toBe('');
    // Required and invalid — an entry error too — then read-only, then disabled.
    await setField(page, 'one', { required: true, requiredText: 'Required' });
    await set(page, 'one', { invalidText: 'Enter a number.' });
    await retype(page, 'one', 'wide');
    await blurInput(page, 'one');
    [spin] = await axNodes(page, 'spinbutton');
    expect(spin).toMatchObject({ required: true, invalid: 'true', description: 'Enter a number.' });
    await set(page, 'one', { value: 4, readOnly: true });
    // Read-only: the protocol's tree has no read-only property for a text input (the combobox's test found the same),
    // so what the browser is given is read instead — the native state and aria-readonly — and the tree must still call
    // it a spin button of that name.
    expect(await input(page, 'one').evaluate((el) => [(el as HTMLInputElement).readOnly, el.getAttribute('aria-readonly')])).toEqual([true, 'true']);
    expect((await axNodes(page, 'spinbutton'))[0]).toMatchObject({ name: 'Corner radius' });
    expect(await axNodes(page, 'button'), 'read-only: no steppers').toEqual([]);
    await set(page, 'one', { readOnly: false, disabled: true });
    [spin] = await axNodes(page, 'spinbutton');
    expect(spin).toMatchObject({ disabled: true, name: 'Corner radius' });
  });

  test('NMI-34: Chromium’s accessibility tree gives the spin button the value text the field names — the number with its unit, or valueText', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'the accessibility tree is read over the DevTools protocol');
    // Known, and not the field's to put right: Chromium computes the value text of a text input from the text in it,
    // and passes over the aria-valuetext of an editable spin button — so the unit is not read with the value there.
    // When the browser honors it this test passes, which fails the run: then the expectation is turned around.
    test.fail(true, 'Chromium passes over the aria-valuetext of an editable spin button');
    await mount(page, [fx('one', { value: 12, suffixText: 'px' })]);
    expect((await axNodes(page, 'spinbutton'))[0].valuetext).toBe('12 px');
  });

  test('NMI-35: a form-associated element: it takes name and submits its value as a decimal number with ASCII digits and a period whatever the locale shows — an empty string while it holds none — resets to the value it was first given, is restored, follows a disabled fieldset and is left out while disabled (NMI-32), is submitted while read-only (NMI-33), and reports a missing value while required and empty and a bad input while an entry error lasts', async ({ page }) => {
    await mount(page, [fx('base', {})]);
    await page.evaluate(async () => {
      document.body.insertAdjacentHTML(
        'beforeend',
        `<form id="f"><fieldset id="set">
           <tanrei-field id="frame" label="Weight" required required-text="Required"><tanrei-number-input id="n" name="weight" value="1.5" locale="de-DE" invalid-text="Zahl eingeben."></tanrei-number-input></tanrei-field>
           <tanrei-number-input id="ar" name="count" label="Count" value="12" locale="ar-EG"></tanrei-number-input>
           <tanrei-number-input id="ro" name="fixed" label="Fixed" value="7" readonly></tanrei-number-input>
           <tanrei-number-input id="off" name="off" label="Off" value="3" disabled></tanrei-number-input>
           <tanrei-number-input id="none" name="none" label="None"></tanrei-number-input></fieldset></form>`,
      );
      for (let round = 0; round < 3; round++) for (const id of ['#frame', '#n']) await (document.querySelector(id) as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    });
    const field = page.locator('#n');
    const data = () => page.evaluate(() => [...new FormData(document.querySelector<HTMLFormElement>('#f')!).entries()].map(([k, v]) => `${k}=${String(v)}`));
    const done = () =>
      field.evaluate(async (el) => {
        for (let round = 0; round < 2; round++) for (const each of [el.closest('tanrei-field')!, el]) await (each as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      });
    const validity = () => field.evaluate((el) => { const v = (el as unknown as HTMLInputElement).validity; return { valid: v.valid, missing: v.valueMissing, bad: v.badInput, message: (el as unknown as HTMLInputElement).validationMessage }; });
    expect(await field.evaluate((el) => [(el.constructor as unknown as { formAssociated: boolean }).formAssociated, (el as unknown as HTMLInputElement).form?.id, (el as unknown as HTMLInputElement).willValidate])).toEqual([true, 'f', true]);
    expect(await field.locator('.input').evaluate((el) => (el as HTMLInputElement).value), 'shown in German').toBe('1,5');
    expect(await data(), 'submitted plain; disabled left out; read-only and empty submitted').toEqual(['weight=1.5', 'count=12', 'fixed=7', 'none=']);
    // An edit that was not committed is not submitted; committed, it is — and change bubbles to the form.
    await page.evaluate(() => ((window as unknown as { __changes: number }).__changes = 0, document.querySelector('#f')!.addEventListener('change', () => ((window as unknown as { __changes: number }).__changes += 1))));
    await field.evaluate((el) => (el as HTMLElement).focus());
    await field.locator('.input').evaluate((el) => (el as HTMLInputElement).select());
    await page.keyboard.type('-2,25');
    await done();
    expect((await data())[0]).toBe('weight=1.5');
    await field.locator('.input').evaluate((el) => (el as HTMLElement).blur());
    await done();
    expect([(await data())[0], await page.evaluate(() => (window as unknown as { __changes: number }).__changes)]).toEqual(['weight=-2.25', 1]);
    // Reset: back to the value attribute, and the text with it — an edit under way is dropped.
    await field.evaluate((el) => (el as HTMLElement).focus());
    await page.keyboard.type('9');
    await page.evaluate(() => document.querySelector<HTMLFormElement>('#f')!.reset());
    await done();
    expect([await field.evaluate((el) => (el as unknown as { value: number }).value), await field.locator('.input').evaluate((el) => (el as HTMLInputElement).value), (await data())[0]]).toEqual([1.5, '1,5', 'weight=1.5']);
    // Restored on navigation: the browser hands the saved value back.
    await field.evaluate((el) => (el as unknown as { formStateRestoreCallback(state: string, mode: string): void }).formStateRestoreCallback('42.125', 'restore'));
    await done();
    expect([await field.evaluate((el) => (el as unknown as { value: number }).value), await field.locator('.input').evaluate((el) => (el as HTMLInputElement).value)]).toEqual([42.125, '42,125']);
    expect(await validity()).toMatchObject({ valid: true });
    // A bad input while an entry error lasts; a missing value while required and empty.
    await field.locator('.input').evaluate((el) => (el as HTMLInputElement).select());
    await page.keyboard.type('viel');
    await field.locator('.input').evaluate((el) => (el as HTMLElement).blur());
    await done();
    expect(await validity()).toMatchObject({ valid: false, bad: true, missing: true, message: 'Zahl eingeben.' });
    expect([(await data())[0], await page.evaluate(() => document.querySelector<HTMLFormElement>('#f')!.checkValidity())]).toEqual(['weight=', false]);
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
    expect(await field.locator('.stepper.up').evaluate((el) => (el as HTMLElement & { disabled: boolean }).disabled)).toBe(true);
    expect(await data()).toEqual([]);
    expect(await page.evaluate(() => document.querySelector<HTMLFormElement>('#f')!.checkValidity()), 'a disabled number input is not validated').toBe(true);
  });

  test('NMI-36: the number input is block-level, framed and bare alike: exactly as wide as the place it stands in — in a Field the Field’s whole width — with no width of its own and never a native text element’s default width; it is never narrower than its paddings, its prefix and suffix and room for three digits, nor than its steppers, which then stand on a row of their own', async ({ page }) => {
    await mount(page, [fx('free', {}), fx('value', { value: 8336817000 }), fx('least', { value: 5, prefixText: '$', suffixText: 'USD' }), fx('bare', { value: 5, steppers: false })]);
    // A place 900 wide that gives its children no width of their own: the input fills it, whatever it holds.
    await page.addStyleTag({ content: '.stage:has(> tanrei-number-input) { inline-size: 900px; }' });
    await frames(page);
    expect(await css(host(page, 'free'), 'display'), 'block-level').toBe('flex');
    const native = await page.evaluate(() => {
      const probe = document.createElement('input');
      probe.type = 'text';
      probe.style.cssText = 'all: unset; display: inline-block; font: var(--tanrei-comp-input-box-input-typescale-medium-font); letter-spacing: var(--tanrei-comp-input-box-input-typescale-medium-letter-spacing);';
      document.body.append(probe);
      const width = probe.getBoundingClientRect().width;
      probe.remove();
      return width;
    });
    for (const id of ['free', 'value'] as const) {
      near((await box(host(page, id))).width, 900, `${id}: as wide as its place`);
      near((await box(container(page, id))).width, 900, `${id}: the box fills it`);
      expect((await box(input(page, id))).width, `${id}: never the native default width`).toBeGreaterThan(native + 100);
    }
    // A narrower place: a narrower box.
    await stage(page, 'free').evaluate((el) => (el.style.inlineSize = '400px'));
    near((await box(container(page, 'free'))).width, 400, 'as wide as its place gives it');
    // In a row that gives it a width (a flex item), it takes that width.
    await stage(page, 'value').evaluate((el) => (el.style.display = 'flex'));
    await host(page, 'value').evaluate((el) => (el.style.flex = '0 0 240px'));
    near((await box(container(page, 'value'))).width, 240, 'the width its row gives it');
    // In a Field: the Field's whole width (FLD-1), with and without rows around it.
    await frame(page, 'framed', { label: 'Quantity', supportingText: 'Up to 99 per order.' }, { value: 5 });
    near((await box(host(page, 'framed'))).width, (await box(row(page, 'framed'))).width, 'the Field’s whole width');
    near((await box(container(page, 'framed'))).width, 280, 'the box fills its Field');
    // Never narrower than what it holds: the paddings, the affixes, three digits and the steppers.
    const digit = await input(page, 'least').evaluate((el) => {
      const probe = document.createElement('span');
      const style = getComputedStyle(el);
      probe.style.cssText = `position:absolute;visibility:hidden;font-family:${style.fontFamily};font-size:${style.fontSize};font-weight:${style.fontWeight};font-variant-numeric:tabular-nums`;
      probe.textContent = '0';
      document.body.append(probe);
      const width = probe.getBoundingClientRect().width;
      probe.remove();
      return width;
    });
    for (const id of ['least', 'bare'] as const) {
      await host(page, id).evaluate((el) => (el.style.inlineSize = '10px'));
      await frames(page);
      const [h, c, field] = [await box(host(page, id)), await box(container(page, id)), await box(input(page, id))];
      if (id === 'bare') near(field.width, 3 * digit, `${id}: room for three digits`, 1);
      else {
        // The least of its two rows: the input's line (paddings, prefix, three digits, suffix) and, on a row of their
        // own below it (NMI-37), the steppers with their gap and inset — whichever is wider.
        expect(field.width, `${id}: room for three digits at least`).toBeGreaterThanOrEqual(3 * digit - 1);
        await expect.poll(() => part(page, id, '.field').evaluate((el) => el.hasAttribute('data-wrapped')), `${id}: the steppers on a row of their own`).toBe(true);
        const [steppers, prefix, suffix] = [await box(part(page, id, '.steppers')), await box(part(page, id, '.prefix')), await box(part(page, id, '.suffix'))];
        const [pad, gap, affix, inset] = [await token(page, 'container-padding-inline-medium'), await token(page, 'container-gap-medium'), await token(page, 'affix-gap'), await resolveToken(page, '--tanrei-comp-number-input-stepper-inset')];
        const line = pad + prefix.width + affix + 3 * digit + affix + suffix.width + inset;
        const row = pad + gap + steppers.width + inset;
        near(c.width, Math.max(line, row), `${id}: the wider of its two rows`, 1);
      }
      near(h.width, c.width, `${id}: the field is as wide as its container`);
      const parts = id === 'least' ? ['.prefix', '.suffix', '.stepper.down', '.stepper.up'] : [];
      for (const selector of parts) {
        const b = await box(part(page, id, selector));
        expect(b.x >= c.x - 0.6 && b.x + b.width <= c.x + c.width + 0.6, `${id}: ${selector} is inside the container`).toBe(true);
      }
      const pad = await token(page, 'container-padding-inline-medium');
      near(field.x - c.x - (id === 'least' ? (await box(part(page, id, '.prefix'))).width + (await token(page, 'affix-gap')) : 0), pad, `${id}: the start padding is kept`);
      if (id === 'bare') near(c.width, 2 * pad + 3 * digit, 'bare: its paddings and three digits', 1);
    }
  });

  test('NMI-37: with text enlarged to 200% a floating label wraps and never clips, the container grows with the input’s line and keeps the height of its size as a minimum, the number stays on one line, the prefix and the suffix grow with it and are not cut, and the steppers keep Button’s sizes — nothing is lost, overlaps or needs scrolling in two directions, at 320 wide', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    // At 200% in a window 320 wide an input holds its steppers or a prefix and a suffix (NMI-36: it is never narrower
    // than what it holds).
    await mount(page, [fx('one', { value: 120 }), fx('unit', { value: 120, prefixText: '$', suffixText: 'USD', steppers: false }), fx('float', { variant: 'outlined', label: 'How many copies of the printed report', steppers: false })], { system: 'm3-like' });
    // The input alone in the window: the stage's own padding is taken away.
    await page.addStyleTag({ content: '.stage:has(> tanrei-number-input) { box-sizing: border-box; inline-size: 100%; padding-inline: 0; }' });
    await frames(page);
    const before = { container: (await box(container(page, 'one'))).height, suffix: (await box(part(page, 'unit', '.suffix'))).width };
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    await frames(page, 6);
    const button = await resolveToken(page, '--tanrei-comp-button-container-height-medium');
    for (const id of ['one', 'unit'] as const) {
      const c = await box(container(page, id));
      expect(c.height, `${id}: the container grew with the input’s line`).toBeGreaterThan(before.container);
      expect(c.height, id).toBeGreaterThanOrEqual((await token(page, 'container-height-medium')) - 0.6);
      near((await box(input(page, id))).height, (await px(input(page, id), 'font-size')) * Number(await css(page.locator('html'), T('input-typescale-medium-line-height'))), `${id}: the number stays on one line`, 1);
      near((await box(host(page, id))).height, c.height, `${id}: exactly as tall as its container`);
      expect(c.x + c.width, `${id}: inside the window`).toBeLessThanOrEqual(320 + 0.6);
      // The row inside keeps its order, and nothing lies over another part.
      const line = await Promise.all((id === 'one' ? ['.input', '.stepper.down', '.stepper.up'] : ['.prefix', '.input', '.suffix']).map((selector) => box(part(page, id, selector))));
      for (let i = 1; i < line.length; i++) expect(line[i].x, `${id}: nothing lies over another part`).toBeGreaterThanOrEqual(line[i - 1].x + line[i - 1].width - 0.6);
      expect(line.at(-1)!.x + line.at(-1)!.width, `${id}: inside the container`).toBeLessThanOrEqual(c.x + c.width + 0.6);
    }
    for (const which of ['down', 'up'] as const) {
      const b = await box(stepper(page, 'one', which));
      near(b.width, button, 'the steppers keep Button’s sizes');
      near(b.height, button, 'the steppers keep Button’s sizes');
    }
    expect((await box(part(page, 'unit', '.suffix'))).width, 'the suffix grew with the text').toBeGreaterThan(before.suffix * 1.5);
    for (const selector of ['.prefix', '.suffix']) expect(await part(page, 'unit', selector).evaluate((el) => el.scrollWidth <= el.clientWidth + 1), `${selector} is not cut`).toBe(true);
    // The floating label wraps, resting and floated, and is never cut; the container holds its lines.
    const label = part(page, 'float', '.floating');
    await expect(part(page, 'float', '.field')).toHaveAttribute('data-label-wraps', '');
    const fits = () => label.evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && getComputedStyle(el).textOverflow !== 'ellipsis' && getComputedStyle(el).overflow === 'visible');
    expect(await fits(), 'resting').toBe(true);
    const [resting, c] = [await box(label), await box(container(page, 'float'))];
    expect(resting.height, 'on several lines').toBeGreaterThan(1.5 * (await px(label, 'font-size')));
    expect(resting.y >= c.y - 0.6 && resting.y + resting.height <= c.y + c.height + 0.6, 'the resting lines are inside the container').toBe(true);
    await focusInput(page, 'float');
    // Floated: the label's motion up to the edge has ended (eight frames saw it on its way where it ran slower).
    await motionEnded(host(page, 'float'));
    expect(await fits(), 'floated').toBe(true);
    expect((await box(label)).y + (await box(label)).height, 'never over the input’s line').toBeLessThanOrEqual((await box(input(page, 'float'))).y + 0.6);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'no scrolling sideways').toBe(true);
  });

  test('NMI-36, NMI-37: where the input’s line and the steppers do not fit on one row — a prefix, a suffix and the steppers at 200% in a window 320 wide — the steppers stand on a row of their own below the line, inside the container at its end, down before up, stepper.inset from the end and bottom edges; nothing overlaps or leaves the window, and made wider they come back beside the line', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await mount(page, [fx('both', { value: 120, prefixText: '$', suffixText: 'USD' }), fx('float', { value: 120, variant: 'outlined', prefixText: '$', suffixText: 'USD' }), fx('one', { value: 120 })]);
    await page.addStyleTag({ content: '.stage:has(> tanrei-number-input) { box-sizing: border-box; inline-size: 100%; padding-inline: 0; }' });
    await frames(page);
    const wrapped = (id: string) => part(page, id, '.field').evaluate((el) => el.hasAttribute('data-wrapped'));
    for (const id of ['both', 'float', 'one']) expect(await wrapped(id), `${id}: one row at 100%`).toBe(false);
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    await frames(page, 6);
    const inset = await resolveToken(page, '--tanrei-comp-number-input-stepper-inset');
    for (const id of ['both', 'float'] as const) {
      await expect.poll(() => wrapped(id), `${id}: wrapped`).toBe(true);
      const c = await box(container(page, id));
      const [line, down, up] = [await box(part(page, id, '.body')), await box(stepper(page, id, 'down')), await box(stepper(page, id, 'up'))];
      expect(c.x + c.width, `${id}: inside the window`).toBeLessThanOrEqual(320 + 0.6);
      expect(down.y, `${id}: the steppers below the input’s line`).toBeGreaterThanOrEqual(line.y + line.height - 0.6);
      expect(up.x, `${id}: down before up`).toBeGreaterThan(down.x);
      near(c.x + c.width - (up.x + up.width), inset, `${id}: stepper.inset from the end edge`, 1);
      near(c.y + c.height - (down.y + down.height), inset, `${id}: stepper.inset from the bottom edge`, 1);
      // The input's line holds its prefix, three digits at least and its suffix, in order, inside the container.
      const parts = await Promise.all(['.prefix', '.input', '.suffix'].map((selector) => box(part(page, id, selector))));
      for (let i = 1; i < parts.length; i++) expect(parts[i].x, `${id}: nothing overlaps`).toBeGreaterThanOrEqual(parts[i - 1].x + parts[i - 1].width - 0.6);
      expect(parts[2].x + parts[2].width, `${id}: the suffix inside the container`).toBeLessThanOrEqual(c.x + c.width + 0.6);
      for (const selector of ['.prefix', '.suffix']) expect(await part(page, id, selector).evaluate((el) => el.scrollWidth <= el.clientWidth + 1), `${id}: ${selector} is not cut`).toBe(true);
    }
    expect(await wrapped('one'), 'the steppers alone beside a number still fit on one row').toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'no scrolling sideways').toBe(true);
    // Wider: one row again.
    await page.setViewportSize({ width: 900, height: 900 });
    await expect.poll(() => wrapped('both'), 'back on one row').toBe(false);
    const [line, down] = [await box(part(page, 'both', '.body')), await box(stepper(page, 'both', 'down'))];
    expect(down.x, 'the steppers after the line').toBeGreaterThanOrEqual(line.x + line.width - 0.6);
  });

  test('NMI-38: in forced colors the number, the prefix, the suffix and the floating label with its asterisk are drawn in the text color; the container has an edge outline.width wide in the control text color in every variant, in the highlight color at the focused width while focused; an error is told by the invalid state alone, with no color of its own; a disabled input takes the disabled text color, and the steppers are drawn as Buttons are', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'forced colors are emulated in Chromium');
    await page.emulateMedia({ forcedColors: 'active' });
    await mount(page, [...spec.fixtures.filter((f) => ['stacked-error', 'stacked-value', 'filled-value', 'outlined-value', 'stacked-disabled', 'stacked-prefix'].includes(f.id))]);
    await frame(page, 'star', { label: 'Quantity', required: true, requiredMark: 'asterisk', requiredText: 'Required' }, { variant: 'outlined', value: 12 });
    const canvasText = await systemColor(page, 'CanvasText');
    for (const [id, selector] of [['stacked-prefix', '.input'], ['stacked-prefix', '.prefix'], ['stacked-prefix', '.suffix'], ['outlined-value', '.floating'], ['star', '.floating'], ['star', '.floating .asterisk'], ['stacked-error', '.input']] as const) {
      expect(await css(part(page, id, selector), 'color'), `${id} ${selector}`).toBe(canvasText);
    }
    // No color of its own tells the error: the box in error is drawn as the box at rest, and the state says it.
    for (const property of ['border-top-color', 'background-color']) expect(await css(container(page, 'stacked-error'), property), property).toBe(await css(container(page, 'stacked-value'), property));
    expect(await input(page, 'stacked-error').getAttribute('aria-invalid')).toBe('true');
    for (const id of ['stacked-value', 'filled-value', 'outlined-value']) {
      expect(await css(container(page, id), 'border-top-color'), id).toBe(await systemColor(page, 'ButtonText'));
      near(await px(container(page, id), 'border-top-width'), await token(page, 'outline-width'), `${id} outline.width`);
    }
    await focusInput(page, 'stacked-value');
    expect(await css(container(page, 'stacked-value'), 'outline-color')).toBe(await systemColor(page, 'Highlight'));
    near(await px(container(page, 'stacked-value'), 'outline-width'), await token(page, 'focused-outline-width'), 'the focused width');
    expect(await css(container(page, 'stacked-disabled'), 'border-top-color')).toBe(await systemColor(page, 'GrayText'));
    expect(await css(input(page, 'stacked-disabled'), 'color')).toBe(await systemColor(page, 'GrayText'));
    // The steppers are Buttons, drawn as Buttons are there; a disabled one in the disabled text color.
    expect(await css(stepper(page, 'stacked-disabled', 'up').locator('button'), 'color')).toBe(await systemColor(page, 'GrayText'));
    await expect(stepper(page, 'stacked-value', 'up')).toBeVisible();
  });

  test('NMI-39: the prefix, the number and the suffix are one run of writing, laid out in written order along the direction of the affixes’ first strong character — left to right where they have none — in every layout direction, and never by what is typed, the value or the locale; in a right-to-left layout everything that is not the run is mirrored: a floating label stands from the right edge with its asterisk to its left, the steppers are at the container’s left end, the one that steps down to the right of the one that steps up, and the input line stands between the start padding and the steppers; the number is not mirrored — laid out left to right, at the right edge for start and at the end of its run for end', async ({ page }) => {
    // The run each fixture's affixes make, and the edge its number stands at (NMI-29) — every one in a right-to-left
    // layout but the last, whose unit in Hebrew letters stands at the number's left on a left-to-right page.
    const RUNS: Record<string, ['ltr' | 'rtl', 'left' | 'right']> = {
      'stacked-unit-rtl': ['ltr', 'right'], // -12.5 px
      'stacked-unit-own-script-rtl': ['rtl', 'right'], // a unit in Arabic letters: at the number's left, as before
      'stacked-prefix-rtl': ['ltr', 'right'], // $ 120.00 USD
      'stacked-percent-rtl': ['ltr', 'right'], // 40 %: a sign alone is a left-to-right run
      'stacked-align-end-unit-rtl': ['ltr', 'right'], // 44 px, align end: against its unit, at the right
      'stacked-affixes-own-script-rtl': ['rtl', 'right'], // the prefix at the right, the unit at the left
      'stacked-align-end-own-script-rtl': ['rtl', 'left'], // align end: against its unit, at the left
      'stacked-locale-ar-percent': ['rtl', 'right'], // the Arabic percent sign with its letter mark
      'stacked-suffix-direction-mark-rtl': ['rtl', 'right'], // a right-to-left mark before a Latin code
      'stacked-unit-right-to-left-script': ['rtl', 'left'], // left-to-right layout
      money: ['ltr', 'right'], // $ -12.5 USD, align end
    };
    await mount(page, [...spec.fixtures.filter((f) => ['stacked-locale-ar', 'stacked-error-rtl', ...Object.keys(RUNS)].includes(f.id)), fx('money', { value: -12.5, prefixText: '$', suffixText: 'USD', align: 'end' }, { direction: 'rtl' })], { system: 'm3-like' });
    const id = 'stacked-error-rtl';
    const [c, field, down, up] = [await box(container(page, id)), await box(input(page, id)), await box(stepper(page, id, 'down')), await box(stepper(page, id, 'up'))];
    near(c.x + c.width - (field.x + field.width), await token(page, 'container-padding-inline-medium'), 'the text from the right edge');
    // The steppers: at the left end, up nearest the edge, down to its right — still the first in reading order.
    near(up.x - c.x, await token(page, 'stepper-inset'), 'stepper.inset from the left edge');
    expect(down.x, 'down to the right of up').toBeGreaterThan(up.x + up.width - 0.6);
    near(field.x - (down.x + down.width), await token(page, 'container-gap-medium'), 'container.gap before the input line');
    expect(await host(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('.stepper')].map((s) => s.classList.contains('down'))), 'down is first in reading order').toEqual([true, false]);
    // A floating label: from the right edge, at the text padding, its asterisk at its left end.
    await frame(page, 'float', { label: 'כמות', required: true, requiredMark: 'asterisk', requiredText: 'חובה' }, { variant: 'filled' });
    await stage(page, 'float').evaluate((el) => (el.dir = 'rtl'));
    await frames(page, 6);
    const [box_, label, asterisk] = [await box(container(page, 'float')), await box(part(page, 'float', '.floating')), await box(part(page, 'float', '.floating .asterisk'))];
    near(box_.x + box_.width - (label.x + label.width), await token(page, 'container-padding-inline-medium'), 'the label from the right edge');
    near(asterisk.x, label.x, 'the asterisk at the label’s left end', 1);
    // The run: what is drawn of the input line, from left to right, and the boxes around it.
    const drawn = (which: string) =>
      host(page, which).evaluate((el) => {
        const root = el.shadowRoot!;
        const rect = (selector: string) => {
          const r = root.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
          return r && r.width > 0 ? { left: r.left, right: r.right } : null;
        };
        return {
          run: root.querySelector('.body')!.getAttribute('dir'),
          own: getComputedStyle(root.querySelector('.body')!).direction,
          layout: getComputedStyle(el).direction,
          container: rect('.field > .container')!,
          body: rect('.body')!,
          prefix: rect('.prefix'),
          input: rect('.input')!,
          suffix: rect('.suffix'),
          down: rect('.stepper.down'),
          up: rect('.stepper.up'),
          edge: getComputedStyle(root.querySelector('.input')!).textAlign,
        };
      });
    const [gap, pad, before, inset] = [await token(page, 'affix-gap'), await token(page, 'container-padding-inline-medium'), await token(page, 'container-gap-medium'), await token(page, 'stepper-inset')];
    for (const [which, [run, edge]] of Object.entries(RUNS)) {
      const d = await drawn(which);
      expect([d.run, d.own], `${which}: the run’s direction, the row’s own`).toEqual([run, run]);
      expect(d.layout, which).toBe(which === 'stacked-unit-right-to-left-script' ? 'ltr' : 'rtl');
      // Written order along the run: the prefix before the number and the suffix after it, affix.gap from the input,
      // and the three fill the line from edge to edge.
      const [first, last] = run === 'ltr' ? [d.prefix, d.suffix] : [d.suffix, d.prefix];
      if (first) near(d.input.left - first.right, gap, `${which}: affix.gap after what stands at the left`);
      if (last) near(last.left - d.input.right, gap, `${which}: affix.gap before what stands at the right`);
      near((first ?? d.input).left, d.body.left, `${which}: the line begins at its left end`);
      near((last ?? d.input).right, d.body.right, `${which}: the line ends at its right end`);
      // The line itself is the layout's to place: from the start padding to the steppers, whatever its run's direction.
      if (d.layout === 'rtl') {
        near(d.container.right - d.body.right, pad, `${which}: the line from the right edge`);
        if (d.down && d.up) {
          near(d.up.left - d.container.left, inset, `${which}: the steppers at the left end`);
          expect(d.down.left, `${which}: down to the right of up`).toBeGreaterThan(d.up.right - 0.6);
          near(d.body.left - d.down.right, before, `${which}: container.gap between the steppers and the line`);
        } else near(d.body.left - d.container.left, pad, `${which}: no steppers — the line to the end padding`);
      } else {
        near(d.body.left - d.container.left, pad, `${which}: the line from the left edge`);
        near(d.down!.left - d.body.right, before, `${which}: container.gap before the steppers`);
        near(d.container.right - d.up!.right, inset, `${which}: the steppers at the right end`);
      }
      expect(d.edge, `${which}: where the number stands (NMI-29)`).toBe(edge);
    }
    // Each affix is still what the product wrote, a direction mark included, and what is said is in written order.
    await expect(part(page, 'stacked-prefix-rtl', '.prefix')).toHaveText('$');
    expect(await part(page, 'stacked-suffix-direction-mark-rtl', '.suffix').evaluate((el) => el.textContent)).toBe('‏USD');
    expect((await read(page, 'stacked-prefix-rtl')).valueText, 'said in written order (NMI-34)').toBe('$ 120.00 USD');
    // Never from what is typed, the value or the locale: Arabic-Indic digits and letters typed beside "px" move nothing…
    await set(page, 'stacked-unit-rtl', { locale: 'ar-EG', value: 7 });
    await input(page, 'stacked-unit-rtl').focus();
    await page.keyboard.type('كغم');
    await settle(page, 'stacked-unit-rtl');
    expect((await drawn('stacked-unit-rtl')).run, 'typed text and locale do not turn the run').toBe('ltr');
    // …and the two props alone do: the prefix is asked first, then the suffix.
    await set(page, 'stacked-unit-rtl', { suffixText: 'كغم' });
    expect((await drawn('stacked-unit-rtl')).run, 'a unit in Arabic letters').toBe('rtl');
    await set(page, 'stacked-unit-rtl', { prefixText: 'max' });
    expect((await drawn('stacked-unit-rtl')).run, 'the prefix is written first, and decides').toBe('ltr');
    await set(page, 'stacked-unit-rtl', { prefixText: '', suffixText: 'px', locale: '', value: -12.5 });
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await settle(page, 'stacked-unit-rtl');
    // The number: left to right in every case, at the right edge for start and the left for end.
    for (const rtl of ['stacked-unit-rtl', 'stacked-locale-ar', 'stacked-error-rtl', 'money']) expect(await css(input(page, rtl), 'direction'), rtl).toBe('ltr');
    expect(await css(input(page, 'stacked-unit-rtl'), 'text-align'), 'start: the right edge').toBe('right');
    expect(await css(input(page, 'money'), 'text-align'), 'end: the end of a left-to-right run, the right edge too').toBe('right');
    expect((await read(page, 'stacked-unit-rtl')).text, 'the sign before the digits, with no mark that would turn it').toBe('-12.5');
    expect((await read(page, 'stacked-locale-ar')).text).toBe('١٢');
    // Its sign is drawn at the left of its digits: the first character's box is the leftmost.
    const order = await input(page, 'stacked-unit-rtl').evaluate((el) => {
      const field = el as HTMLInputElement;
      const probe = document.createElement('span');
      const style = getComputedStyle(field);
      probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font-family:${style.fontFamily};font-size:${style.fontSize};direction:${style.direction};unicode-bidi:isolate`;
      probe.textContent = field.value;
      document.body.append(probe);
      const range = document.createRange();
      const lefts = [...field.value].map((_, i) => {
        range.setStart(probe.firstChild!, i);
        range.setEnd(probe.firstChild!, i + 1);
        return range.getBoundingClientRect().left;
      });
      probe.remove();
      return lefts;
    });
    expect(order, 'every character to the right of the one before it').toEqual([...order].sort((a, b) => a - b));
  });

  test('NMI-39, NMI-29: the table of cases every platform must give (the shared reference) — the run’s direction from the prefix, then the suffix, a direction mark counted as a strong character, and the edge the number stands at for start and for end in both layout directions — is what the function gives and what is drawn', async ({ page }) => {
    // prefix, suffix, the run — and, in a right-to-left layout, the edge for start and for end.
    const CASES: [string, string, 'ltr' | 'rtl', 'left' | 'right', 'left' | 'right'][] = [
      ['', '', 'ltr', 'right', 'right'], // a number alone
      ['', 'px', 'ltr', 'right', 'right'],
      ['$', 'USD', 'ltr', 'right', 'right'],
      ['$', '', 'ltr', 'right', 'right'], // signs alone
      ['', '%', 'ltr', 'right', 'right'],
      ['', '×', 'ltr', 'right', 'right'],
      ['', '個', 'ltr', 'right', 'right'], // any letter that is not of a right-to-left script
      ['', 'كغم', 'rtl', 'right', 'left'],
      ['', 'ק״ג', 'rtl', 'right', 'left'],
      ['حتى', 'كغم', 'rtl', 'right', 'left'],
      ['حتى', 'kg', 'rtl', 'right', 'left'], // the prefix is written first, and decides
      ['USD', 'كلمة', 'ltr', 'right', 'right'],
      ['$', 'ريال', 'rtl', 'right', 'left'], // a prefix of signs has no direction: the suffix decides
      ['', '‏USD', 'rtl', 'right', 'left'], // a right-to-left mark before a Latin code
      ['', '٪؜', 'rtl', 'right', 'left'], // the Arabic percent sign as a formatter writes it, with its mark
      ['', '٪', 'ltr', 'right', 'right'], // and without one: a sign alone
      ['‎', 'كغم', 'ltr', 'right', 'right'], // a left-to-right mark holds the written order from left to right
    ];
    for (const [prefix, suffix, run] of CASES) expect(runDirection(prefix, suffix), `"${prefix}" "${suffix}"`).toBe(run);
    expect([firstStrong(''), firstStrong(null), firstStrong('12 %'), firstStrong('1a'), firstStrong('1א')]).toEqual([null, null, null, 'ltr', 'rtl']);
    // Drawn: every case with both aligns, in a right-to-left layout and then in a left-to-right one.
    await mount(
      page,
      CASES.flatMap(([prefixText, suffixText], i) => (['start', 'end'] as const).map((align) => fx(`case-${i}-${align}`, { value: 12, prefixText, suffixText, align }, { direction: 'rtl' }))),
    );
    const edges = () =>
      page.evaluate(() =>
        Object.fromEntries(
          [...document.querySelectorAll<HTMLElement>('[data-fixture]')].map((stage) => {
            const root = stage.querySelector('tanrei-number-input')!.shadowRoot!;
            return [stage.dataset.fixture!, [root.querySelector('.body')!.getAttribute('dir'), getComputedStyle(root.querySelector('.input')!).textAlign]];
          }),
        ),
      );
    const rtl = await edges();
    for (const [i, [prefix, suffix, run, start, end]] of CASES.entries()) {
      expect(rtl[`case-${i}-start`], `right-to-left layout, "${prefix}" "${suffix}", start`).toEqual([run, start]);
      expect(rtl[`case-${i}-end`], `right-to-left layout, "${prefix}" "${suffix}", end`).toEqual([run, end]);
    }
    await page.evaluate(() => {
      for (const stage of document.querySelectorAll<HTMLElement>('[data-fixture]')) stage.dir = 'ltr';
    });
    await frames(page);
    const ltr = await edges();
    for (const [i, [prefix, suffix, run]] of CASES.entries()) {
      expect(ltr[`case-${i}-start`], `left-to-right layout, "${prefix}" "${suffix}", start`).toEqual([run, 'left']);
      expect(ltr[`case-${i}-end`], `left-to-right layout, "${prefix}" "${suffix}", end: the run’s end there too`).toEqual([run, run === 'ltr' ? 'right' : 'left']);
    }
  });

  test('NMI-40: the layout direction comes from the nearest ancestor that sets one, and a change of it while the number input is shown is drawn at once, keeping the value, the text, the caret and focus; it has no direction setting of its own', async ({ page }) => {
    await mount(page, [fx('one', { value: 1234, suffixText: 'kg' })], { reducedMotion: true });
    await page.evaluate(() => {
      const wrap = document.createElement('div');
      wrap.id = 'wrap';
      wrap.dir = 'rtl';
      const field = document.querySelector('tanrei-number-input')!;
      field.before(wrap);
      wrap.append(field);
    });
    await frames(page);
    expect((await box(stepper(page, 'one', 'up'))).x, 'right to left, from an ancestor that is not the root').toBeLessThan((await box(input(page, 'one'))).x);
    expect(await css(input(page, 'one'), 'text-align')).toBe('right');
    expect(await host(page, 'one').evaluate((el) => ['dir', 'direction'].some((name) => name in (el.constructor as unknown as { properties: object }).properties)), 'no direction setting of its own').toBe(false);
    await retype(page, 'one', '5678');
    await input(page, 'one').evaluate((el) => (el as HTMLInputElement).setSelectionRange(2, 2));
    await page.evaluate(() => (document.querySelector<HTMLElement>('#wrap')!.dir = 'ltr'));
    await frames(page, 4);
    expect((await box(stepper(page, 'one', 'up'))).x, 'left to right now').toBeGreaterThan((await box(input(page, 'one'))).x);
    expect(await css(input(page, 'one'), 'text-align')).toBe('left');
    expect(await read(page, 'one')).toMatchObject({ value: 1234, text: '5678', focused: true, caret: [2, 2] });
    expect(await css(container(page, 'one'), 'transition-property'), 'no motion of its own for the direction').not.toContain('padding');
  });

  test('NMI-41: in a right-to-left layout the steppers’ remove and add are drawn unmirrored, and their order is the whole of their mirroring; the number input has no slot and draws no other glyph — a glyph placed in it is not drawn', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => f.id === 'stacked-error-rtl'), fx('glyph', { value: 1 }, { direction: 'rtl', content: '<span slot="label-icon" data-mirror="always">receipt_long</span>' })]);
    const mirrored = (locator: Locator) => locator.evaluate((el) => getComputedStyle(el).transform !== 'none' || getComputedStyle(el).scale !== 'none');
    for (const id of ['stacked-error-rtl', 'glyph']) {
      for (const which of ['down', 'up'] as const) {
        expect(await stepper(page, id, which).evaluate((el) => el.textContent?.trim()), `${id} ${which}`).toBe(which === 'down' ? 'remove' : 'add');
        expect(await mirrored(stepper(page, id, which).locator('.stepper-glyph')), `${id} ${which}`).toBe(false);
        expect(await mirrored(stepper(page, id, which).locator('.ink')), `${id} ${which}`).toBe(false);
        expect(await stepper(page, id, which).locator('.stepper-glyph').getAttribute('data-mirrored'), `${id} ${which}: never marked`).toBeNull();
      }
    }
    // No slot: what a product places in the input is not drawn, and nothing but the two steppers holds a glyph.
    expect(await host(page, 'glyph').evaluate((el) => el.shadowRoot!.querySelectorAll('slot').length)).toBe(0);
    expect(await host(page, 'glyph').locator('[slot="label-icon"]').evaluate((el) => el.getBoundingClientRect().width)).toBe(0);
    expect(await host(page, 'glyph').evaluate((el) => el.shadowRoot!.querySelectorAll('.stepper-glyph').length)).toBe(2);
  });

  test('NMI-42: the floating label, the placeholder, the prefix and the suffix are each a run of their own direction, isolated; the floating label and the placeholder are placed and aligned by the layout direction, and a left-to-right label, a unit and a currency code keep their own order in a right-to-left layout', async ({ page, browserName }) => {
    await mount(page, [...spec.fixtures.filter((f) => ['stacked-unit-rtl'].includes(f.id)), fx('mixed', { variant: 'filled', label: 'Call +1 555 0100', placeholder: '1 to 99', prefixText: 'US$', suffixText: 'km/h' }, { direction: 'rtl' }), fx('stacked', { placeholder: '1 to 99' }, { direction: 'rtl' })], { system: 'm3-like' });
    const [bidi, align] = await part(page, 'mixed', '.floating').evaluate((el) => [getComputedStyle(el).unicodeBidi, getComputedStyle(el).textAlign]);
    expect(bidi, 'the floating label: a run of its own direction').toBe('plaintext');
    expect(['right', 'end', 'start'], `the floating label: aligned by the layout (${align})`).toContain(align);
    for (const selector of ['.prefix', '.suffix']) expect(await css(part(page, 'mixed', selector), 'unicode-bidi'), selector).toBe('plaintext');
    // A left-to-right label in a right-to-left layout keeps its order and stands from the right edge, at the text padding.
    const [c, label] = [await box(container(page, 'mixed')), await box(part(page, 'mixed', '.floating'))];
    near(c.x + c.width - (label.x + label.width), await token(page, 'container-padding-inline-medium'), 'placed by the layout direction');
    await expect(part(page, 'mixed', '.floating')).toHaveText('Call +1 555 0100');
    // The unit keeps its own order. Where it stands is the run's, which the same characters decide (NMI-39's test).
    await expect(part(page, 'stacked-unit-rtl', '.suffix')).toHaveText('px');
    // The placeholder: its own run, where the number would stand. (Firefox applies no unicode-bidi to a placeholder: README.)
    if (browserName !== 'firefox') expect(await input(page, 'stacked').evaluate((el) => getComputedStyle(el, '::placeholder').unicodeBidi)).toBe('plaintext');
    expect(await input(page, 'stacked').evaluate((el) => getComputedStyle(el, '::placeholder').textAlign), 'at the input’s start edge, the right').toBe('right');
  });

  test('NMI-43: a variant or size the active design system does not have is drawn with the default’s tokens and reported; a variant a layer added draws no label of its own and its edge as a stacked input does, with its own tokens; an align the number input does not know behaves as start and is reported; a locale the browser does not know falls back to the page’s and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('plain', { value: 12 }), fx('odd', { variant: 'ghost', size: 'huge', value: 12 }), fx('layer', { variant: 'soft', value: 12 }), fx('props', { align: 'middle', value: 1.5, locale: 'not a tag' })], { reducedMotion: true });
    near((await box(container(page, 'odd'))).height, (await box(container(page, 'plain'))).height, 'the default size');
    expect(await css(container(page, 'odd'), 'background-color')).toBe(await css(container(page, 'plain'), 'background-color'));
    expect(await part(page, 'odd', '.field').getAttribute('data-layout'), 'laid out as stacked').toBe('stacked');
    await expect.poll(() => seen.filter((w) => w.includes('NMI-43')).some((w) => w.includes('ghost'))).toBe(true);
    await expect.poll(() => seen.filter((w) => w.includes('NMI-43')).some((w) => w.includes('huge'))).toBe(true);
    // A variant a layer added: its own tokens, no label of its own and the edge inside.
    await override(page, { [T('soft-container-color')]: 'rgb(1, 2, 3)', [T('soft-input-color')]: 'rgb(4, 5, 6)' });
    await set(page, 'layer', { placeholder: 'x' });
    await expect.poll(() => css(container(page, 'layer'), 'background-color')).toBe('rgb(1, 2, 3)');
    expect(await css(input(page, 'layer'), 'color')).toBe('rgb(4, 5, 6)');
    expect(await part(page, 'layer', '.field').getAttribute('data-layout')).toBe('stacked');
    await expect(part(page, 'layer', '.edge')).toHaveCount(1);
    await expect(part(page, 'layer', '.floating'), 'no label of its own').toHaveCount(0);
    expect(await input(page, 'layer').getAttribute('aria-label'), 'and still named').toBe('Quantity');
    // The other props: the first value's behaviour, each reported.
    expect(await css(input(page, 'props'), 'text-align'), 'align: start').toBe('left');
    expect((await read(page, 'props')).text, 'the page’s locale').toBe('1.5');
    for (const word of ['middle', 'not a tag']) await expect.poll(() => seen.some((w) => w.includes('NMI-43') && w.includes(word)), { message: word }).toBe(true);
  });

  test('NMI-45: the number input says to the Field that frames it that it draws the label while its variant floats one, where its number’s line starts and ends — its inline padding at both edges, with and without steppers — and an entry error with its words, and says each again when it changes; it keeps no count; it takes the Field’s name, description and required, invalid and disabled states, whether the label is hidden and whether an asterisk follows it', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('base', {})], { system: 'm3-like' });
    const help = 'Up to 99 per order.';
    await frame(page, 'stacked', { label: 'Quantity', supportingText: help, required: true, requiredText: 'Required' }, { value: 12, invalidText: 'Enter a number.' });
    await frame(page, 'bare', { label: 'Quantity', supportingText: help }, { value: 12, noSteppers: true });
    await frame(page, 'large', { label: 'Quantity', supportingText: help }, { value: 12, size: 'large', prefixText: '$' });
    await frame(page, 'floating', { label: 'Quantity', supportingText: help, required: true, requiredMark: 'asterisk', requiredText: 'Required' }, { variant: 'outlined' });
    // FLD-25: it draws the label — the Field draws no label row and no tag; a stacked input draws none, and the Field does.
    await expect(row(page, 'floating').locator('.label-row')).toHaveCount(0);
    await expect(part(page, 'floating', '.floating')).toHaveText('Quantity*');
    await expect(row(page, 'stacked').locator('.label-row > .label')).toContainText('Quantity');
    await expect(part(page, 'stacked', '.floating')).toHaveCount(0);
    // Said again when it changes: stacked now, and the Field draws its row.
    await set(page, 'floating', { variant: 'stacked' });
    await expect(row(page, 'floating').locator('.label-row > .label')).toContainText('Quantity');
    await set(page, 'floating', { variant: 'filled' });
    await expect(row(page, 'floating').locator('.label-row')).toHaveCount(0);
    // FLD-26: the help starts where the number's line starts and ends at the inline padding — with and without
    // steppers, though the steppers stand closer to the edge — and follows the size.
    for (const [id, size] of [['stacked', 'medium'], ['bare', 'medium'], ['large', 'large']] as const) {
      const pad = await token(page, `container-padding-inline-${size}`);
      const [c, text] = [await box(container(page, id)), row(page, id).locator('.supporting-text')];
      const t = await box(text);
      near(t.x + (await px(text, 'padding-left')) - c.x, pad, `${id}: the help starts at the inline padding`);
      near(c.x + c.width - (t.x + t.width - (await px(text, 'padding-right'))), pad, `${id}: and ends at it`);
      if (id !== 'large') near(t.x + (await px(text, 'padding-left')), (await box(input(page, id))).x, `${id}: under the number’s line`);
    }
    near((await box(part(page, 'large', '.prefix'))).x, (await box(row(page, 'large').locator('.supporting-text'))).x + (await px(row(page, 'large').locator('.supporting-text'), 'padding-left')), 'where a prefix starts');
    await set(page, 'large', { size: 'medium' });
    const mediumPad = await token(page, 'container-padding-inline-medium');
    await expect.poll(async () => Math.round(((await box(row(page, 'large').locator('.supporting-text'))).x - (await box(container(page, 'large'))).x) * 10) / 10, { message: 'said again when the size changes' }).toBe(mediumPad);
    // FLD-28: an entry error, with its words; withdrawn when it ends.
    await retype(page, 'stacked', 'many');
    await blurInput(page, 'stacked');
    await expect(row(page, 'stacked').locator('.error-text')).toHaveText('Enter a number.');
    await expect(row(page, 'stacked').locator('.supporting-text'), 'the error text stands in the help’s place (FLD-7)').toHaveCount(0);
    await retype(page, 'stacked', '3');
    await expect(row(page, 'stacked').locator('.error-text')).toHaveCount(0);
    await expect(row(page, 'stacked').locator('.supporting-text')).toHaveText(help);
    // FLD-27: no count.
    await expect(row(page, 'stacked').locator('.counter')).toHaveCount(0);
    // What it takes: the name, the description, required, invalid, disabled, the hidden label and the asterisk.
    expect(await input(page, 'stacked').evaluate((el) => [el.getAttribute('aria-label'), el.getAttribute('aria-required'), el.getAttribute('aria-invalid'), (el as HTMLInputElement).disabled])).toEqual(['Quantity', 'true', null, false]);
    expect(await described(page, 'stacked')).toBe(help);
    await setField(page, 'stacked', { error: true, errorText: 'Order at least 1.', disabled: true, required: false, optional: false });
    expect(await input(page, 'stacked').evaluate((el) => [el.getAttribute('aria-label'), el.getAttribute('aria-required'), el.getAttribute('aria-invalid'), (el as HTMLInputElement).disabled])).toEqual(['Quantity', null, 'true', true]);
    expect(await described(page, 'stacked'), 'the error text in the help’s place (FLD-11)').toBe('Order at least 1.');
    await setField(page, 'floating', { labelHidden: true });
    await expect(part(page, 'floating', '.floating')).toHaveCount(0);
    await setField(page, 'floating', { labelHidden: false, requiredMark: 'none' });
    await expect(part(page, 'floating', '.floating')).toHaveText('Quantity');
    // A Field around a number input is what a Field is for: nothing is reported of it (FLD-15).
    expect(seen.filter((w) => w.includes('FLD-15'))).toEqual([]);
    // Taken out of its Field, it is a bare input again: no name but its own, no description, no state of the Field's.
    await host(page, 'stacked').evaluate(async (el) => {
      document.querySelector('main')!.append(el);
      await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    });
    await expect.poll(() => page.locator('main > tanrei-number-input .input').evaluate((el) => [el.getAttribute('aria-label'), el.getAttribute('aria-invalid'), (el as HTMLInputElement).disabled, el.getAttribute('aria-describedby')])).toEqual([null, null, false, null]);
  });

  test('NMI-46: the number input draws no label row above itself, no requirement tag, no help and no error text; bare, it is complete — its box, the label that floats in it, the number, its unit and its steppers, its states and its events — and exactly as tall as its container', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => ['stacked-value', 'stacked-error', 'beside-slider', 'stacked-large', 'filled-value', 'outlined-value'].includes(f.id)), fx('entry', { invalidText: 'Enter a number.' })], { system: 'm3-like' });
    await retype(page, 'entry', 'x');
    await blurInput(page, 'entry');
    for (const id of ['stacked-value', 'stacked-error', 'beside-slider', 'stacked-large', 'filled-value', 'outlined-value', 'entry']) {
      const [h, c] = [await box(host(page, id)), await box(container(page, id))];
      near(h.height, c.height, `${id}: exactly as tall as its container`);
      near(h.y, c.y, `${id}: the container at the top`);
      near(h.width, c.width, `${id}: and as wide`);
      // Nothing of a frame: no row, no tag, no text of its own, and nothing drawn outside the box.
      await expect(part(page, id, '.label-row, .requirement-tag, tanrei-tag, .supporting-text, .counter, [role="status"], [aria-live]'), id).toHaveCount(0);
      expect(await host(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll<HTMLElement>('.field > :not(.container)')].filter((node) => node.getClientRects().length > 0).length), `${id}: nothing is drawn beside the container`).toBe(0);
    }
    // The words of the entry error are heard, not drawn (NMI-21).
    expect(await described(page, 'entry')).toBe('Enter a number.');
    expect(await host(page, 'entry').evaluate((el) => (el.shadowRoot!.querySelector('#description') as HTMLElement).hidden)).toBe(true);
    // Complete bare: named by its own label, it floats it, steps, emits and takes its states.
    await expect(part(page, 'outlined-value', '.floating')).toHaveText('Quantity');
    expect(await input(page, 'beside-slider').evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('aria-valuetext')])).toEqual(['spinbutton', 'Scale', '1.5 times']);
    await listen(page, 'stacked-value');
    await pressOn(stepper(page, 'stacked-value', 'up'));
    await expect.poll(async () => (await read(page, 'stacked-value')).value).toBe(13);
    expect(await heard(page)).toEqual(['input 13', 'change 13']);
    await set(page, 'stacked-value', { disabled: true });
    expect(await read(page, 'stacked-value')).toMatchObject({ down: true, up: true });
  });
});

test.describe('the frame around it and the Button it places', () => {
  test('a number input is a control, not a field: a Field around it is what a Field is for and is not reported, and a field group that holds it directly disables it with the group (NMI-32, NMI-45)', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('base', {})]);
    await page.evaluate(async () => {
      document.body.insertAdjacentHTML(
        'beforeend',
        `<tanrei-field-group id="g" label="Size" disabled size="large" error error-text="Check both.">
           <tanrei-number-input id="in-group" label="Width" value="12"></tanrei-number-input>
         </tanrei-field-group>
         <tanrei-field id="fld" label="Outer"><tanrei-number-input id="in-field"></tanrei-number-input></tanrei-field>`,
      );
      await customElements.whenDefined('tanrei-field-group');
      await (document.querySelector('#in-group') as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    });
    const inGroup = page.locator('#in-group');
    await expect.poll(() => inGroup.locator('.input').evaluate((el) => (el as HTMLInputElement).disabled)).toBe(true);
    expect(await inGroup.locator('.stepper.up').evaluate((el) => (el as HTMLElement & { disabled: boolean }).disabled)).toBe(true);
    expect(await inGroup.evaluate((el) => [el.hasAttribute('error'), el.shadowRoot!.querySelector('.input')!.getAttribute('aria-label'), el.shadowRoot!.querySelector('.supporting-text')]), 'its own error is not set, its own name stays, and it draws no text').toEqual([false, 'Width', null]);
    await page.evaluate(() => document.querySelector('#g')!.removeAttribute('disabled'));
    await expect.poll(() => inGroup.locator('.input').evaluate((el) => (el as HTMLInputElement).disabled)).toBe(false);
    await expect.poll(() => page.locator('#in-field .input').getAttribute('aria-label')).toBe('Outer');
    expect(seen.filter((w) => w.includes('FLD-15'))).toEqual([]);
    expect(seen.filter((w) => w.includes('NMI-12'))).toEqual([]);
  });

  test('a Button a host takes out of the focus order is still a named button, pressable by a pointer, and a Button no host has spoken to is a stop (NMI-25)', async ({ page }) => {
    await mount(page, [fx('base', {})]);
    await page.evaluate(async () => {
      document.body.insertAdjacentHTML('beforeend', '<input id="a" /><tanrei-button id="out" label="Out"><span slot="icon">add</span></tanrei-button><tanrei-button id="in">In</tanrei-button><input id="z" />');
      const out = document.querySelector('#out') as HTMLElement & { outsideFocusOrder: boolean; updateComplete: Promise<unknown> };
      out.outsideFocusOrder = true;
      (window as unknown as { __clicks: number }).__clicks = 0;
      out.addEventListener('click', () => ((window as unknown as { __clicks: number }).__clicks += 1));
      await out.updateComplete;
    });
    expect(await page.locator('#out button').evaluate((el) => [el.tabIndex, el.getAttribute('aria-label'), el.getAttribute('aria-hidden')])).toEqual([-1, 'Out', null]);
    expect(await page.locator('#in button').evaluate((el) => [el.tabIndex, el.hasAttribute('tabindex')])).toEqual([0, false]);
    expect(await page.locator('#out').evaluate((el) => el.hasAttribute('tabindex') || el.getAttributeNames().some((name) => name.includes('focus'))), 'nothing on the host: no public surface').toBe(false);
    await page.locator('#a').focus();
    await tabTo(page, page.locator('#in'));
    await tab(page, { back: true });
    expect(await page.evaluate(() => document.activeElement?.id), 'Tab passes over it').toBe('a');
    await page.locator('#out').click();
    expect(await page.evaluate(() => (window as unknown as { __clicks: number }).__clicks)).toBe(1);
  });

  test('the default system leaves the filled and outlined number inputs out, and says so once per element in a debug build; they still render and work', async ({ page }) => {
    const seen = warnings(page);
    await mountSpec(page, ['filled-value', 'outlined-value', 'stacked-value'], { reducedMotion: true });
    await expect.poll(() => seen.filter((w) => w.includes('(availability)')).length).toBe(2);
    await focusInput(page, 'filled-value');
    await page.keyboard.press('ArrowUp');
    expect(await read(page, 'filled-value')).toMatchObject({ value: 13, text: '13' });
  });
});

test.describe('accessibility', () => {
  for (const theme of THEMES) {
    test(`axe: every fixture has no violations in ${theme}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true, theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`), theme).toEqual([]);
    });

    test(`axe: a focused field, one in an entry error and one at its limit have no violations in ${theme}`, async ({ page }) => {
      await mount(page, [fx('one', { value: 12, suffixText: 'px' }), fx('wrong', { invalidText: 'Enter a number.' }), fx('limit', { value: 99, min: 1, max: 99 })], { theme, reducedMotion: true });
      await frame(page, 'framed', { label: 'Quantity', supportingText: 'Up to 99 per order.', required: true, requiredText: 'Required' }, { invalidText: 'Enter a number.' });
      for (const id of ['wrong', 'framed']) {
        await retype(page, id, 'twelve');
        await blurInput(page, id);
      }
      await focusInput(page, 'one');
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`), theme).toEqual([]);
    });
  }
});

test.describe('fixtures', () => {
  test('every fixture is mounted and visible, with the name, the floating label, the number in its locale’s form, the affixes and the steppers the spec gives it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    expect(spec.fixtures).toHaveLength(42);
    const TEXTS: Record<string, string> = { 'stacked-prefix': '120.00', 'stacked-locale-de': '1,5', 'stacked-locale-ar': '١٢', 'stacked-prefix-rtl': '120.00', 'stacked-suffix-direction-mark-rtl': '120.00', 'stacked-locale-ar-percent': '٤٠' };
    for (const f of spec.fixtures) {
      await expect(host(page, f.id), f.id).toBeVisible();
      await expect(container(page, f.id), f.id).toBeVisible();
      const now = await read(page, f.id);
      const value = (f.props.value ?? null) as number | null;
      expect(now.value, `${f.id} value`).toBe(value);
      expect(now.text, `${f.id} text`).toBe(TEXTS[f.id] ?? (value === null ? '' : String(value)));
      if (f.props.placeholder) expect(await input(page, f.id).evaluate((el) => (el as HTMLInputElement).placeholder), f.id).toBe(String(f.props.placeholder));
      const variant = f.props.variant ?? 'stacked';
      // NMI-12, NMI-8: named by its own label; a filled or an outlined input floats it, a stacked one draws none.
      expect(await input(page, f.id).getAttribute('aria-label'), `${f.id} name`).toBe(String(f.props.label));
      const labelled = variant !== 'stacked' && !f.props.labelHidden;
      expect(await part(page, f.id, '.floating').count(), `${f.id} label`).toBe(labelled ? 1 : 0);
      if (labelled) await expect(part(page, f.id, '.floating'), f.id).toHaveText(String(f.props.label));
      await expect(part(page, f.id, '.label-row, .requirement-tag, .supporting-text'), `${f.id}: no row of a frame`).toHaveCount(0);
      expect(await part(page, f.id, '.stepper').count(), `${f.id} steppers`).toBe(f.props.steppers === false || f.props.readOnly ? 0 : 2);
      // In a filled or outlined field the affixes show only while the label is not in the input line.
      const inLine = labelled && value === null;
      for (const [selector, text] of [['.prefix', f.props.prefixText], ['.suffix', f.props.suffixText]] as const) {
        if (text && !inLine) await expect(part(page, f.id, selector), f.id).toHaveText(String(text));
        else await expect(part(page, f.id, selector), f.id).toBeHidden();
      }
      if (f.props.steppers !== false && !f.props.readOnly) await expect.poll(() => stepper(page, f.id, 'up').locator('.stepper-glyph').evaluate((el) => el.hasAttribute('data-drawn')), { message: `${f.id}: the glyph is drawn` }).toBe(true);
      near((await box(host(page, f.id))).width, 280, `${f.id}: as wide as its column`);
      const s = await box(stage(page, f.id));
      const c = await box(container(page, f.id));
      expect(c.x >= s.x && c.x + c.width <= s.x + s.width + 0.6, `${f.id}: inside its stage`).toBe(true);
    }
  });

  // One fixture is mounted for its picture, drawn as on the page of all of them (`mountFixtureAsInAll`): that page is
  // mounted once for a worker, not once for each picture.
  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtureAsInAll(page, spec, f, { icons: true });
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
