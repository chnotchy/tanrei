// <tanrei-combobox>, the bare control, driven by specs/combobox.spec.json: every behaviour id is cited
// by a test title, every fixture has a baseline, and every length and color is read back from the tokens — never from a
// number written here. What the frame does (the label, the help, the error text) is the Field's and is tested there
// (field.test.ts); what a sentence says of "the Field that frames it" is tested with a Field around the combobox
// (`frame()`), and that a combobox field is that pair by the twins (primitives/composed.test.ts).
// CMB-69: the product's ARIA on the host is tested with every other control's, in every engine, in
// src/primitives/delegated-aria.test.ts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { appearProbe, bezierOf, expectAppearStart, expectExitEnd, resolveEasing } from '../../../test/appear.js';
import { expectNoFlicker, sampleFrames } from '../../../test/frames.js';
import { motionEnded } from '../../../test/motions.js';
import { holdClock } from '../../../test/page-clock.js';
import { expectPressShownAndHeld, watchPress } from '../../../test/watched-press.js';
import { type Fixture, type FixtureItem, acmeSystemCss, loadSpec, missingWords, mountFixtures, resolveColor, resolveToken, setWords, tab, tabTo, inputBoxCopies, inputBoxOwn, inputBoxSetApart, inputBoxToken, rootTokens, mountFixtureAsInAll } from '../../../test/harness.js';

const spec = loadSpec('combobox');
type P = Page;
const TAG = 'tanrei-combobox';
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] ${TAG}`);
/** A part of the combobox's own shadow root. The clear button has a container of its own, so the combobox's is named with its parent. */
const OWN: Record<string, string> = { '.container': '.field > .container' };
const part = (page: P, id: string, selector: string) => host(page, id).locator(OWN[selector] ?? selector);
const container = (page: P, id: string) => part(page, id, '.container');
const input = (page: P, id: string) => part(page, id, '.input');
const rows = (page: P, id: string) => part(page, id, '.scroll .row');
const row = (page: P, id: string, label: string) => part(page, id, '.scroll .row').filter({ has: page.locator('.option-label', { hasText: new RegExp(`^${label}$`) }) });
// The box is drawn from the one set of tokens every input box is drawn from (CMB-63); the list and the status row from the combobox's own.
const T = inputBoxToken('combobox');
/** The combobox's own family, for the names the rows of its list keep beside the box (motion.state-*, <state>.opacity). */
const ROW = inputBoxOwn('combobox');
/** A token of the Field: the rows around a framed combobox are the Field's, in its one look (`standard`). */
const F = (name: string) => `--tanrei-comp-field-${name}`;
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
const option = (label: string, value: string, extra: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'option', props: { label, value, ...extra } });
const group = (title: string, items: FixtureItem[]): FixtureItem => ({ kind: 'option-group', props: title ? { title } : {}, items });
const CITIES = [option('Kyoto', 'kyoto'), option('Lisbon', 'lisbon'), option('Nairobi', 'nairobi'), option('Tokyo', 'tokyo'), option('Toronto', 'toronto')];
const ALL = ['Kyoto', 'Lisbon', 'Nairobi', 'Tokyo', 'Toronto'];
const MANY = Array.from({ length: 24 }, (_, i) => option(`Option ${i + 1}`, `o${i + 1}`));
/** A fixture of the test's own: props, then its options (the five cities unless given), or markup of the product's. */
const fx = (id: string, props: Fixture['props'], inside: FixtureItem[] | string = CITIES, extra: Partial<Fixture> = {}): Fixture => ({
  id,
  // The words are this file's own: a test is the product there and gives them itself (CMB-60).
  props: { label: 'City', emptyText: 'No matches', ...props },
  ...(typeof inside === 'string' ? { content: inside } : { items: inside }),
  ...extra,
});
const mount = (page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) => mountFixtures(page, spec, { icons: true, fixtures, ...options });
/** The five cities as the markup of a combobox's children. */
const CITY_OPTIONS = ALL.map((label) => `<tanrei-option value="${label.toLowerCase()}">${label}</tanrei-option>`).join('');
/**
 * A combobox inside a Field, as a stage of its own added to the mounted page: what a sentence says of "the Field that
 * frames it". The Field is as wide as the fixtures are drawn; `field` and `props` are set as properties, `inside` is
 * the combobox's children (the five cities unless given), and `direction` the stage's.
 */
async function frame(page: P, id: string, field: Record<string, unknown>, props: Record<string, unknown> = {}, inside = CITY_OPTIONS, direction = '') {
  await page.evaluate(
    async ([stageId, fieldProps, comboboxProps, children, dir]) => {
      const stage = Object.assign(document.createElement('div'), { className: 'stage' });
      stage.dataset.fixture = stageId;
      if (dir) stage.dir = dir;
      const framing = Object.assign(document.createElement('tanrei-field'), fieldProps) as HTMLElement & { updateComplete: Promise<unknown> };
      framing.style.inlineSize = '280px';
      const framed = Object.assign(document.createElement('tanrei-combobox'), { emptyText: 'No matches', ...comboboxProps }) as HTMLElement & { updateComplete: Promise<unknown> };
      framed.innerHTML = children;
      framing.append(framed);
      stage.append(framing);
      document.querySelector('main')!.append(stage);
      for (let round = 0; round < 3; round++) await Promise.all([framing.updateComplete, framed.updateComplete]);
    },
    [id, field, props, inside, direction] as const,
  );
}
/** The Field that frames the combobox of the stage `id`, and a part of that Field's own — a row, never a part of the combobox inside it. */
const framing = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > tanrei-field`);
const fieldRow = (page: P, id: string, selector: string) => framing(page, id).locator(selector);
/** Sets properties on the Field that frames the combobox of the stage `id`, and waits for both. */
const setFrame = (page: P, id: string, props: Record<string, unknown>) =>
  framing(page, id).evaluate(async (el, p) => {
    Object.assign(el, p);
    const framed = el.querySelector('tanrei-combobox') as HTMLElement & { updateComplete: Promise<unknown> };
    for (let round = 0; round < 3; round++) await Promise.all([(el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete, framed.updateComplete]);
  }, props);
/** What the input is described by: the texts its `aria-describedby` names, in its own shadow root. */
const description = (page: P, id: string) =>
  input(page, id).evaluate((el) => {
    const root = el.getRootNode() as ShadowRoot;
    return (el.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean).map((ref) => root.getElementById(ref)?.textContent?.trim() ?? '').join(' ');
  });
const mountSpec = (page: P, ids: string[], options: Parameters<typeof mountFixtures>[2] = {}) => mount(page, spec.fixtures.filter((f) => ids.includes(f.id)), options);
const settle = (page: P, id: string) =>
  host(page, id).evaluate(async (el) => {
    await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
  });
const set = async (page: P, id: string, props: Record<string, unknown>) => {
  await host(page, id).evaluate(async (el, p) => {
    Object.assign(el, p);
    await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
  }, props);
};
/** What the combobox is now, read from the element and from the element that carries its semantics. */
const read = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const combobox = el as HTMLElement & { value: string; inputValue: string; open: boolean };
    const root = el.shadowRoot!;
    const field = root.querySelector<HTMLInputElement>('.input')!;
    const active = field.getAttribute('aria-activedescendant');
    const surface = root.querySelector<HTMLElement>('.surface')!;
    const label = (r: Element) => r.querySelector('.option-label')!.textContent;
    return {
      value: combobox.value,
      inputValue: combobox.inputValue,
      text: field.value,
      open: combobox.open,
      expanded: field.getAttribute('aria-expanded'),
      controls: field.getAttribute('aria-controls'),
      shown: surface.matches(':popover-open') || surface.classList.contains('inline'),
      active: active ? (root.getElementById(active)?.querySelector('.option-label')?.textContent ?? null) : null,
      ring: [...root.querySelectorAll('.row.kf')].map(label),
      selected: [...root.querySelectorAll('.row[aria-selected="true"]')].map(label),
      rows: [...root.querySelectorAll('.scroll .row')].map(label),
      status: [...root.querySelectorAll('.status .said')].map((said) => said.textContent ?? ''),
      focused: root.activeElement === field,
    };
  });
/** Records `input`, `change`, `toggle` and `action` on the combobox, in order, with what the element holds when each is heard. */
const listen = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const w = window as unknown as { __events: string[] };
    w.__events = [];
    const combobox = el as HTMLElement & { value: string; inputValue: string; open: boolean };
    el.addEventListener('input', (event) => w.__events.push(`input ${combobox.inputValue}${event.bubbles && event.composed ? '' : ' (not composed)'}`));
    el.addEventListener('change', (event) => {
      const detail = (event as CustomEvent<{ value: string; inputValue: string }>).detail;
      w.__events.push(`change ${combobox.value}${detail.value === combobox.value && detail.inputValue === combobox.inputValue && event.bubbles && event.composed ? '' : ' (detail differs)'}`);
    });
    el.addEventListener('toggle', (event) => {
      const detail = (event as CustomEvent<{ open: boolean; reason?: string }>).detail;
      w.__events.push(`toggle ${detail.open}${detail.reason ? ` ${detail.reason}` : ''}${combobox.open === detail.open ? '' : ' (open not set)'}`);
    });
    el.addEventListener('action', () => w.__events.push(`action ${combobox.value}`));
  });
const heard = (page: P) => page.evaluate(() => (window as unknown as { __events: string[] }).__events.splice(0));
const inputs = (events: string[]) => events.filter((e) => e.startsWith('input'));
const others = (events: string[]) => events.filter((e) => !e.startsWith('input'));
/** A press of the pointer at the centre of `target`, whatever it says of itself (a disabled option is still pressed). */
const pressOn = async (target: Locator) => {
  // Where it is once it has stopped moving: a list grows in.
  await (await target.elementHandle())!.waitForElementState('stable');
  const b = (await target.boundingBox())!;
  await target.page().mouse.click(b.x + b.width / 2, b.y + b.height / 2);
};
/** Focus by the product, in view: a list whose field is out of sight closes (CMB-22), and not every engine scrolls to what script focuses. */
const focusInput = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    el.scrollIntoView({ block: 'nearest' });
    (el as HTMLElement).focus();
  });
const blurInput = (page: P, id: string) => input(page, id).evaluate((el) => (el as HTMLElement).blur());
const selectAll = (page: P, id: string) => input(page, id).evaluate((el) => (el as HTMLInputElement).select());
const shownList = (page: P, id: string) => expect.poll(async () => (await read(page, id)).shown);
const closedList = async (page: P, id: string) => {
  await expect.poll(async () => (await read(page, id)).open).toBe(false);
  await expect.poll(() => part(page, id, '.surface').evaluate((el) => el.matches(':popover-open'))).toBe(false);
};
/** Types into the focused input, one key at a time, as a person does. */
const type = (page: P, text: string) => page.keyboard.type(text);
/**
 * An input method composing in the combobox's input, as the platform reports it: `compositionstart`, then for each
 * step the element's text and an `input` that is composing. `endComposition()` commits a text with `compositionend`.
 */
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
  // The committed composition reaches the combobox in a task of its own.
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 20)));
  await settle(page, id);
};
/** The Chromium accessibility nodes of a role, over the DevTools protocol: what the browser computed. */
async function axNodes(page: P, role: string) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  const byId = new Map(nodes.map((node) => [node.nodeId, node]));
  const byElement = new Map(nodes.filter((node) => node.backendDOMNodeId !== undefined).map((node) => [node.backendDOMNodeId, node]));
  return nodes
    .filter((node) => !node.ignored && node.role?.value === role)
    .map((node) => {
      const property = (name: string) => node.properties?.find((p) => p.name === name)?.value;
      // A relation's other end, by the name the browser computed for it.
      const related = (name: string) => (property(name)?.relatedNodes ?? []).map((r: { text?: string; idref?: string; backendDOMNodeId?: number }) => (byElement.get(r.backendDOMNodeId)?.name?.value as string | undefined) ?? r.text ?? r.idref ?? '');
      return {
        name: (node.name?.value ?? '') as string,
        description: (node.description?.value ?? '') as string,
        value: (node.value?.value ?? '') as string,
        expanded: property('expanded')?.value as boolean | undefined,
        invalid: property('invalid')?.value as string | undefined,
        required: property('required')?.value as boolean | undefined,
        disabled: property('disabled')?.value as boolean | undefined,
        readonly: property('readonly')?.value as boolean | undefined,
        selected: property('selected')?.value as boolean | undefined,
        editable: property('editable')?.value as string | undefined,
        autocomplete: property('autocomplete')?.value as string | undefined,
        haspopup: property('hasPopup')?.value as string | undefined,
        busy: property('busy')?.value as boolean | undefined,
        live: property('live')?.value as string | undefined,
        focusable: property('focusable')?.value as boolean | undefined,
        active: related('activedescendant'),
        controls: related('controls'),
        children: (node.childIds ?? []).map((id) => byId.get(id)).filter((child) => child && !child.ignored).map((child) => child!.role?.value as string),
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
/** A system color as a background takes it, unforced (Mark is a background's color). */
const systemBackground = (page: P, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.cssText = `forced-color-adjust: none; background-color: ${n}`;
    document.body.append(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  }, name);
const systemColor = (page: P, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.color = n;
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, name);
/** Puts the combobox of a fixture in a form of its own that records its submissions and never navigates. */
const inForm = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const form = document.createElement('form');
    el.before(form);
    form.append(el);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      ((window as unknown as { __events?: string[] }).__events ??= []).push('submit');
    });
  });
const SYSTEMS = [undefined, 'm3-like', 'm3-expressive-like', 'cupertino'] as const;
const THEMES = ['light', 'dark'] as const;

test.describe('behavior: the box, and what it takes from the Field that frames it', () => {
  test('CMB-1: the container is at least container.height of its size tall, its corners container.shape (a filled one’s bottom corners shape-bottom), and holds one centred row — the leading glyph, the input, the clear button and the chevron, action-gap apart and container.gap from the input — text padding-inline from the edge and a glyph padding-inline-with-icon', async ({ page }) => {
    await mountSpec(page, ['stacked-value', 'stacked-large', 'stacked-small', 'stacked-clearable', 'stacked-leading-icon', 'filled-value']);
    for (const [id, size] of [['stacked-value', 'medium'], ['stacked-large', 'large'], ['stacked-small', 'small']] as const) {
      const c = await box(container(page, id));
      near(c.height, await token(page, `stacked-container-height-${size}`), `${id} height`);
      const field = await box(input(page, id));
      const chevron = await box(part(page, id, '.chevron-glyph'));
      near(field.x - c.x, await token(page, `container-padding-inline-${size}`), `${id} text padding`);
      near(c.x + c.width - (chevron.x + chevron.width), await token(page, `container-padding-inline-with-icon-${size}`), `${id} glyph padding`);
      near(chevron.width, await token(page, `icon-size-${size}`), `${id} chevron`);
      near(chevron.x - (field.x + field.width), await token(page, `container-gap-${size}`), `${id} container.gap after the input`);
      near(chevron.y + chevron.height / 2, c.y + c.height / 2, `${id} chevron centred`);
      near(field.y + field.height / 2, c.y + c.height / 2, `${id} input centred`);
      expect((c.height - field.height) / 2, `${id} padding-block`).toBeGreaterThanOrEqual((await token(page, `stacked-container-padding-block-${size}`)) - 0.6);
      near(await px(container(page, id), 'border-top-left-radius'), await token(page, 'container-shape'), `${id} corner`);
      near(await px(container(page, id), 'border-bottom-right-radius'), await token(page, 'container-shape'), `${id} bottom corner`);
    }
    // The default system's numbers: a stacked box 40 and 56, as tall as a Button of its size, 16 and 12, and a 24 glyph.
    expect([await token(page, 'stacked-container-height-medium'), await token(page, 'stacked-container-height-large')]).toEqual([40, 56]);
    expect([await token(page, 'container-padding-inline-medium'), await token(page, 'container-padding-inline-with-icon-medium'), await token(page, 'icon-size-medium')]).toEqual([16, 12, 24]);
    // The clear button's box, then the chevron: action-gap apart, the first of them container.gap after the input.
    const clear = await box(part(page, 'stacked-clearable', '.clear-box'));
    const chevron = await box(part(page, 'stacked-clearable', '.chevron-glyph'));
    const field = await box(input(page, 'stacked-clearable'));
    near(chevron.x - (clear.x + clear.width), await token(page, 'container-action-gap'), 'action-gap');
    near(clear.x - (field.x + field.width), await token(page, 'container-gap-medium'), 'container.gap before the clear button');
    const c = await box(container(page, 'stacked-clearable'));
    near(clear.y + clear.height / 2, c.y + c.height / 2, 'the clear button centred');
    // A leading glyph: padding-inline-with-icon from the start edge, and container.gap before the input.
    const lead = await box(part(page, 'stacked-leading-icon', '.leading-slot'));
    const lc = await box(container(page, 'stacked-leading-icon'));
    near(lead.x - lc.x, await token(page, 'container-padding-inline-with-icon-medium'), 'the glyph’s padding');
    near((await box(input(page, 'stacked-leading-icon'))).x - (lead.x + lead.width), await token(page, 'container-gap-medium'), 'container.gap before the input');
    // Filled: the bottom corners take shape-bottom.
    near(await px(container(page, 'filled-value'), 'border-top-left-radius'), await token(page, 'container-shape'), 'filled top corner');
    near(await px(container(page, 'filled-value'), 'border-bottom-left-radius'), await token(page, 'container-shape-bottom'), 'filled bottom corner');
    expect(await container(page, 'stacked-value').getAttribute('data-tanrei-shape'), 'eased by the corner smoothing').not.toBeNull();
  });

  test('CMB-2, CMB-63: the combobox holds no token of the box under its own name — its own family is what it alone draws, in the default system and in each preset', async () => {
    const sheets = [fs.readFileSync(path.join(pkg, 'dist/tokens.css'), 'utf8'), ...SYSTEMS.filter((system): system is Exclude<(typeof SYSTEMS)[number], undefined> => system !== undefined).map((system) => fs.readFileSync(path.join(pkg, `dist/systems/${system}.css`), 'utf8'))];
    // No copy to hold equal: what the combobox reads of the box is the one set every input box is drawn from.
    expect(inputBoxCopies(sheets, 'combobox')).toEqual([]);
    const mine = declared(sheets[0]!, 'combobox').map((name) => name.replace('--tanrei-comp-combobox-', ''));
    expect(mine.filter((name) => !/^(list|option|group|divider|separation|status|motion-(feedback|open|close))|-(selected-)?option-/.test(name)).sort()).toEqual(['container-action-gap', 'disabled-opacity', 'focused-opacity', 'hovered-opacity', 'motion-state-duration', 'motion-state-easing', 'pressed-opacity']);
  });

  test('CMB-63: a custom property of the box set on one combobox changes that one alone; set on an ancestor, every combobox in it', async ({ page }) => {
    await mount(page, [fx('one', {})]);
    const { rest, one, both } = await inputBoxSetApart(page, 'tanrei-combobox');
    expect(rest[0], 'the box has corners to lose').toBeGreaterThan(0);
    expect(rest[1]).toBe(rest[0]);
    expect(one, 'the one it is set on, and not its neighbour').toEqual([0, rest[1]]);
    expect(both, 'both, from their parent').toEqual([0, 0]);
  });

  test('CMB-2: a combobox in a Field and a text field of the same variant, size, label, value and supporting text in one row share the tops and bottoms of their labels, containers, input lines and supporting rows, their start edges and their input’s text style', async ({ page }) => {
    for (const [system, variant, size] of [[undefined, 'stacked', 'small'], [undefined, 'stacked', 'medium'], [undefined, 'stacked', 'large'], ['m3-like', 'filled', 'small'], ['m3-like', 'filled', 'medium'], ['m3-like', 'outlined', 'large']] as const) {
      await mount(page, [fx('base', {})], { system });
      await frame(page, 'pair', { label: 'City', supportingText: 'Where the order is sent.' }, { variant, size, value: 'tokyo' });
      await page.evaluate(
        ([v, s]) => {
          const stage = document.querySelector<HTMLElement>('[data-fixture="pair"]')!;
          stage.style.cssText = 'display: flex; gap: 16px; align-items: flex-start; inline-size: 600px';
          const field = document.createElement('tanrei-text-field');
          Object.assign(field, { variant: v, size: s, label: 'City', value: 'Tokyo', supportingText: 'Where the order is sent.' });
          field.style.inlineSize = '280px';
          stage.append(field);
        },
        [variant, size] as const,
      );
      const field = page.locator('[data-fixture="pair"] > tanrei-text-field');
      await expect(field.locator('.container')).toBeVisible();
      await frames(page);
      const where = `${system ?? 'tanrei'} ${variant} ${size}`;
      // The rows are the same Field's in both (FLD-1, FLD-26); a floating label is each box's own.
      const pairs: [string, Locator, Locator][] = [
        ['container', container(page, 'pair'), field.locator('.container')],
        ['supporting row', fieldRow(page, 'pair', '.supporting-text'), field.locator('.supporting-text')],
        ['label', variant === 'stacked' ? fieldRow(page, 'pair', '.label-row > .label') : part(page, 'pair', '.floating'), variant === 'stacked' ? field.locator('.label-row > .label') : field.locator('label.label')],
      ];
      for (const [name, mine, theirs] of pairs) {
        const [a, b] = [await box(mine), await box(theirs)];
        near(a.y, b.y, `${where}: ${name} top`);
        near(a.y + a.height, b.y + b.height, `${where}: ${name} bottom`);
        near(a.x - (await box(framing(page, 'pair'))).x, b.x - (await box(field)).x, `${where}: ${name} start edge`);
      }
      const [mine, theirs] = [input(page, 'pair'), field.locator('.input')];
      for (const property of ['font-size', 'font-family', 'font-weight', 'letter-spacing', 'color', 'caret-color']) expect(await css(mine, property), `${where}: ${property}`).toBe(await css(theirs, property));
      const [a, b] = [await box(mine), await box(theirs)];
      near(a.x - (await box(framing(page, 'pair'))).x, b.x - (await box(field)).x, `${where}: text start edge`);
      near(a.y + a.height / 2, b.y + b.height / 2, `${where}: input line`);
      near((await box(framing(page, 'pair'))).height, (await box(field)).height, `${where}: the whole field`);
    }
  });

  test('CMB-7: a filled or outlined combobox draws "*" after its floating label exactly while the Field that frames it gives an asterisk — for a tag too, and never for the mark none — requirement.asterisk-gap from the text, in the label’s style and its variant’s required-asterisk color (the error part while in error), hidden from assistive technology; it draws no tag and no optional label; with no Field, no mark or no drawn label it draws no mark', async ({ page }) => {
    await mount(page, [fx('bare', { variant: 'outlined' })]);
    for (const mark of ['auto', 'tag', 'asterisk', 'none'] as const) await frame(page, `outlined-${mark}`, { label: 'City', required: true, requiredMark: mark, requiredText: 'Required' }, { variant: 'outlined' });
    await frame(page, 'filled', { label: 'City', required: true, requiredText: 'Required' }, { variant: 'filled', value: 'tokyo' });
    await frame(page, 'hidden', { label: 'City', labelHidden: true, required: true, requiredMark: 'asterisk' }, { variant: 'outlined' });
    await frame(page, 'optional', { label: 'City', required: false, optional: true, optionalText: 'Optional' }, { variant: 'outlined' });
    await frame(page, 'stacked', { label: 'City', required: true, requiredMark: 'asterisk' }, {});
    await frame(page, 'error', { label: 'City', required: true, requiredMark: 'asterisk', error: true }, { variant: 'outlined' });
    const star = (id: string) => part(page, id, '.floating .asterisk');
    // The Field's answer: an asterisk for the tag too (the default system marks with the tag), none for the mark none.
    expect(await css(page.locator('html'), F('requirement-mark'))).toBe('tag');
    for (const id of ['outlined-auto', 'outlined-tag', 'outlined-asterisk', 'filled', 'error']) {
      await expect(star(id), id).toHaveCount(1);
      expect(await part(page, id, '.floating').textContent(), id).toBe('City*');
    }
    await expect(star('outlined-none')).toHaveCount(0);
    const asterisk = star('outlined-asterisk');
    expect(await asterisk.textContent()).toBe('*');
    expect(await asterisk.getAttribute('aria-hidden')).toBe('true');
    expect(await css(asterisk, 'color')).toBe(await color(page, 'outlined-required-asterisk-color'));
    expect(await css(star('error'), 'color')).toBe(await color(page, 'outlined-error-required-asterisk-color'));
    expect(await css(star('filled'), 'color')).toBe(await color(page, 'filled-required-asterisk-color'));
    expect(await css(asterisk, 'font-size')).toBe(await css(part(page, 'outlined-asterisk', '.floating'), 'font-size'));
    near(await px(asterisk, 'margin-left'), await token(page, 'requirement-asterisk-gap'), 'asterisk-gap');
    // It floats and rests with the label: the gap in the outline is measured with it.
    await expect(part(page, 'outlined-asterisk', '.notch-label')).toHaveText('City*');
    // Whatever is drawn, the required state is exposed (CMB-12).
    for (const id of ['outlined-auto', 'outlined-tag', 'outlined-asterisk', 'outlined-none', 'filled', 'hidden', 'stacked']) expect(await input(page, id).getAttribute('aria-required'), id).toBe('true');
    // No drawn label, no Field, a stacked look: no mark of the combobox's. No tag and no optional label, ever.
    await expect(part(page, 'hidden', '.floating, .asterisk')).toHaveCount(0);
    await expect(part(page, 'bare', '.asterisk')).toHaveCount(0);
    await expect(part(page, 'stacked', '.floating, .asterisk'), 'the asterisk above a stacked combobox is its Field’s').toHaveCount(0);
    await expect(fieldRow(page, 'stacked', '.label-row .asterisk')).toHaveCount(1);
    await expect(star('optional')).toHaveCount(0);
    expect(await part(page, 'optional', '.floating').textContent()).toBe('City');
    expect(await description(page, 'optional'), 'the optional text stays in the description').toBe('Optional');
    for (const id of ['outlined-tag', 'optional', 'stacked', 'bare']) expect(await host(page, id).evaluate((el) => el.shadowRoot!.querySelectorAll('tanrei-tag, .requirement-tag').length), `${id}: no tag`).toBe(0);
    // The design system's answer is the Field's to read: where it marks a required control with nothing, none.
    await override(page, { [F('requirement-mark')]: 'none' });
    await setFrame(page, 'outlined-auto', { supportingText: 'x' });
    await expect(star('outlined-auto')).toHaveCount(0);
    await setFrame(page, 'outlined-tag', { supportingText: 'x' });
    await expect(star('outlined-tag'), 'a Field that says keeps its own').toHaveCount(1);
    // The Field's token follows the system's one choice (sys.behavior.requirement-mark): set for the page instead, it
    // is followed the same.
    await rootTokens(page, { [F('requirement-mark')]: '' });
    await setFrame(page, 'outlined-auto', { supportingText: 'y' });
    await expect(star('outlined-auto')).toHaveCount(1);
    await override(page, { '--tanrei-sys-behavior-requirement-mark': 'none' });
    await setFrame(page, 'outlined-auto', { supportingText: 'z' });
    await expect(star('outlined-auto')).toHaveCount(0);
  });

  test('CMB-8: a filled or outlined label rests in the input line in label.typescale while the input is empty and not focused, and floats otherwise — to the top of a filled container, onto an outlined one’s top edge with its gap — in label.floated-typescale, over motion.label-*; a filled combobox keeps its height; the placeholder shows only while the label is not in the input line', async ({ page }) => {
    await mount(page, [fx('filled', { variant: 'filled', placeholder: 'Type a city' }), fx('outlined', { variant: 'outlined', placeholder: 'Type a city' }), fx('stacked', { placeholder: 'Type a city' }), fx('wrap', { variant: 'outlined', label: 'A label that is far too long for a field this narrow' })], { reducedMotion: true });
    const placeholder = (id: string) => input(page, id).evaluate((el) => getComputedStyle(el, '::placeholder').color);
    for (const id of ['filled', 'outlined'] as const) {
      const label = part(page, id, '.floating');
      const c = await box(container(page, id));
      const resting = await box(label);
      near(await px(label, 'font-size'), await token(page, 'label-typescale-medium-font-size'), `${id}: resting in label.typescale`);
      near(resting.y + resting.height / 2, c.y + c.height / 2, `${id}: resting in the input line`);
      expect(await placeholder(id), `${id}: no placeholder under a resting label`).toBe('rgba(0, 0, 0, 0)');
      const height = c.height;
      await focusInput(page, id);
      await frames(page);
      near(await px(label, 'font-size'), await token(page, 'label-floated-typescale-medium-font-size'), `${id}: floated in label.floated-typescale`);
      const floated = await box(label);
      expect(floated.y, `${id}: it moved up`).toBeLessThan(resting.y);
      expect(await placeholder(id), `${id}: the placeholder shows once the label has floated`).toBe(await color(page, `${id}-focused-placeholder-color`));
      near((await box(container(page, id))).height, height, `${id}: the height does not change`);
      // Never over the input text.
      expect(floated.y + floated.height, `${id}: above the input’s line`).toBeLessThanOrEqual((await box(input(page, id))).y + 0.6);
      await blurInput(page, id);
      // It stays floated while the input holds a text, focused or not.
      await set(page, id, { value: 'tokyo' });
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
    // Stacked: the placeholder shows, in the placeholder color.
    expect(await placeholder('stacked')).toBe(await color(page, 'stacked-placeholder-color'));
    // A label that does not fit wraps and is never cut.
    await host(page, 'wrap').evaluate((el) => (el.style.inlineSize = '140px'));
    await frames(page, 6);
    await expect(part(page, 'wrap', '.field')).toHaveAttribute('data-label-wraps', '');
    expect(await part(page, 'wrap', '.floating').evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && getComputedStyle(el).textOverflow !== 'ellipsis')).toBe(true);
    // A stacked combobox draws no label at all: the label above it is the row of its Field.
    await expect(part(page, 'stacked', '.floating, .label-row, .label')).toHaveCount(0);
    // Framed: the label it floats is its name — the Field's label — and the Field draws no row; the Field's labelHidden
    // draws none, and the name stays.
    await frame(page, 'framed', { label: 'Country' }, { variant: 'outlined' });
    await frame(page, 'framed-hidden', { label: 'Country', labelHidden: true }, { variant: 'outlined' });
    await frame(page, 'framed-stacked', { label: 'Country' }, {});
    await expect(part(page, 'framed', '.floating')).toHaveText('Country');
    await expect(fieldRow(page, 'framed', '.label-row')).toHaveCount(0);
    await expect(part(page, 'framed-hidden', '.floating')).toHaveCount(0);
    expect(await input(page, 'framed-hidden').getAttribute('aria-label')).toBe('Country');
    await expect(part(page, 'framed-stacked', '.floating')).toHaveCount(0);
    await expect(fieldRow(page, 'framed-stacked', '.label-row > .label')).toHaveText('Country');
    // Its own labelHidden hides its own floating label too.
    await set(page, 'outlined', { labelHidden: true });
    await expect(part(page, 'outlined', '.floating')).toHaveCount(0);
    expect(await input(page, 'outlined').getAttribute('aria-label')).toBe('City');
    // The motion: label-duration and label-easing, and none where motion is reduced.
    expect(await px(part(page, 'filled', '.floating'), 'transition-duration'), 'reduced: at once').toBe(0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    near((await px(part(page, 'filled', '.floating'), 'transition-duration')) * 1000, await duration(page, 'motion-label-duration'), 'motion.label-duration', 1);
  });

  test('CMB-10: in error — its own error, or the Field’s that frames it — the combobox is exposed as invalid and draws every part of its container from the error parts of its variant — a stacked one a line inside its edge at rest, a floating label its error part — while its list and options stay as they are; it shows no error text of its own, which is its Field’s and its description, and never sets error itself', async ({ page }) => {
    await mountSpec(page, ['stacked-error', 'stacked-error-value', 'stacked-value']);
    await frame(page, 'framed', { label: 'City', error: true, errorText: 'We do not deliver there yet.' }, { value: 'tokyo' });
    await frame(page, 'floating', { label: 'City', error: true }, { variant: 'outlined', value: 'tokyo' });
    expect(await input(page, 'stacked-value').getAttribute('aria-invalid')).toBeNull();
    for (const id of ['stacked-error-value', 'framed']) {
      expect(await input(page, id).getAttribute('aria-invalid'), id).toBe('true');
      const edge = part(page, id, '.edge');
      expect(await css(edge, 'border-top-color'), id).toBe(await color(page, 'stacked-error-outline-color'));
      near(await px(edge, 'border-top-width'), await token(page, 'outline-width'), `${id} outline.width`);
      expect(await css(container(page, id), 'background-color'), id).toBe(await color(page, 'stacked-error-container-color'));
      expect(await css(input(page, id), 'color'), id).toBe(await color(page, 'stacked-error-input-color'));
      expect(await css(part(page, id, '.chevron-glyph'), 'color'), id).toBe(await color(page, 'stacked-error-trailing-icon-color'));
      // The edge takes no layout space: the container is as tall in error as at rest.
      near((await box(container(page, id))).height, (await box(container(page, 'stacked-value'))).height, `${id}: the container’s height`);
    }
    expect(await css(part(page, 'floating', '.floating'), 'color')).toBe(await color(page, 'outlined-error-label-color'));
    // The words are the Field's: it draws them, and gives them to the combobox as its description. The combobox draws none.
    await expect(fieldRow(page, 'framed', '.error-text')).toHaveText('We do not deliver there yet.');
    expect(await description(page, 'framed')).toBe('We do not deliver there yet.');
    expect(await description(page, 'stacked-error-value'), 'bare: no words').toBe('');
    for (const id of ['framed', 'stacked-error-value']) {
      expect(await host(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('.field > :not(.container)')].every((node) => (node as HTMLElement).hidden)), `${id}: nothing drawn outside the container`).toBe(true);
    }
    // The list is the same list.
    const id = 'stacked-error-value';
    await set(page, id, { open: true });
    await set(page, 'stacked-value', { open: true });
    for (const property of ['background-color', 'box-shadow']) expect(await css(part(page, id, '.list'), property)).toBe(await css(part(page, 'stacked-value', '.list'), property));
    expect(await css(row(page, id, 'Kyoto').locator('.option-label'), 'color')).toBe(await css(row(page, 'stacked-value', 'Kyoto').locator('.option-label'), 'color'));
    // Never by itself: a text that names nothing is given up, and the combobox is not in error.
    await mount(page, [fx('one', {})]);
    await focusInput(page, 'one');
    await type(page, 'zzz');
    await blurInput(page, 'one');
    await settle(page, 'one');
    expect(await host(page, 'one').evaluate((el) => (el as HTMLElement & { error: boolean }).error)).toBe(false);
    expect(await input(page, 'one').getAttribute('aria-invalid')).toBeNull();
    expect((await read(page, 'one')).text).toBe('');
  });

  test('CMB-12: the name, the description and the required state are the Field’s that frames it — its label names the input whether or not a label is drawn, its shown text describes it — and the combobox’s own label wins; the placeholder is never the name; the same name names its list and its chevron; while its Field says required it is exposed as required whichever mark is drawn and reports a missing value to the form while value is empty, and it is never required by itself; with neither name it still renders and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('own', { placeholder: 'Type to find a city' }), fx('unnamed', { label: '', placeholder: 'Type to find a city' })]);
    await frame(page, 'framed', { label: 'Country', supportingText: 'Where the order is sent.', required: true, requiredText: 'Required' }, { placeholder: 'Type' });
    await frame(page, 'hidden', { label: 'Country', labelHidden: true, required: true, requiredMark: 'none' }, { value: 'tokyo' });
    await frame(page, 'both', { label: '' }, { label: 'Its own' });
    await frame(page, 'optional', { label: 'Company', required: false, optional: true, optionalText: 'Optional', supportingText: 'Help.' }, {});
    const name = async (id: string) => (await input(page, id).getAttribute('aria-label')) ?? '';
    expect([await name('own'), await name('framed'), await name('hidden'), await name('both'), await name('unnamed')]).toEqual(['City', 'Country', 'Country', 'Its own', '']);
    expect(await input(page, 'framed').getAttribute('aria-labelledby'), 'named by one thing').toBeNull();
    expect(await fieldRow(page, 'framed', '.label-row > .label').getAttribute('aria-hidden'), 'the drawn label is not read a second time').toBe('true');
    await expect(input(page, 'unnamed')).toBeVisible();
    // The description: the Field's shown text, and its optional text; a change is exposed at once.
    expect(await description(page, 'framed')).toBe('Where the order is sent.');
    expect(await description(page, 'optional')).toBe('Help. Optional');
    expect(await description(page, 'own'), 'bare: none').toBe('');
    await setFrame(page, 'framed', { supportingText: 'Where the invoice is sent.' });
    expect(await description(page, 'framed')).toBe('Where the invoice is sent.');
    // The same name names the chevron's button and the list.
    expect(await part(page, 'framed', '.chevron').getAttribute('aria-label')).toBe('Country');
    expect(await host(page, 'framed').evaluate((el) => el.shadowRoot!.getElementById(el.shadowRoot!.querySelector('[role="listbox"]')!.getAttribute('aria-labelledby')!)!.textContent)).toBe('Country');
    // Required is the Field's to say: exposed whichever mark is drawn, and a missing value reported to the form.
    expect(await input(page, 'framed').getAttribute('aria-required')).toBe('true');
    expect(await input(page, 'hidden').getAttribute('aria-required'), 'the mark none keeps the state').toBe('true');
    expect(await input(page, 'optional').getAttribute('aria-required')).toBeNull();
    const validity = (id: string) => host(page, id).evaluate((el) => [(el as unknown as HTMLInputElement).validity.valueMissing, (el as unknown as HTMLInputElement).validity.valid]);
    expect(await validity('framed'), 'empty and required: missing').toEqual([true, false]);
    expect(await validity('hidden'), 'a value: not missing').toEqual([false, true]);
    await setFrame(page, 'framed', { required: false, optional: false });
    expect([await input(page, 'framed').getAttribute('aria-required'), await validity('framed')]).toEqual([null, [false, true]]);
    // Never by itself: the attribute of the frame it was says nothing to a bare combobox.
    await host(page, 'own').evaluate((el) => el.setAttribute('required', ''));
    await settle(page, 'own');
    expect([await input(page, 'own').getAttribute('aria-required'), await validity('own')]).toEqual([null, [false, true]]);
    // Neither name: it renders, and says so once; a combobox its Field names says nothing.
    await expect.poll(() => seen.filter((w) => w.includes('CMB-12') && w.includes('accessible name')).length).toBe(1);
  });

  test('CMB-14: a press on its floating label, a decorative leading glyph or the container’s padding moves focus to the input and does nothing else — it opens nothing and changes nothing — and so does a press on the label row of the Field that frames it, while a press on that Field’s supporting row does nothing; the hit area meets the minimum target; the input is one stop, the clear button a second, the chevron and the options none', async ({ page }) => {
    await mount(page, [fx('one', { value: 'tokyo', clearable: true, clearLabel: 'Clear city' }, CITIES, { slots: { 'leading-icon': 'location_on' } }), fx('after', {}), fx('floating', { variant: 'outlined', value: 'tokyo' })]);
    await frame(page, 'framed', { label: 'Country', required: true, requiredText: 'Required', supportingText: 'Help.' }, { value: 'tokyo' });
    await listen(page, 'one');
    await listen(page, 'framed');
    await pressOn(part(page, 'one', '.leading-slot'));
    expect(await read(page, 'one'), 'the leading glyph').toMatchObject({ focused: true, open: false, value: 'tokyo' });
    await blurInput(page, 'one');
    await pressOn(part(page, 'floating', '.floating'));
    expect(await read(page, 'floating'), 'the floating label').toMatchObject({ focused: true, open: false, value: 'tokyo' });
    await blurInput(page, 'floating');
    // The container's padding: its first pixels, before the leading glyph.
    const c = await box(container(page, 'one'));
    await page.mouse.click(c.x + 3, c.y + c.height / 2);
    expect(await read(page, 'one'), 'the padding').toMatchObject({ focused: true, open: false });
    await blurInput(page, 'one');
    // A press in the input places the caret and opens nothing.
    await input(page, 'one').click();
    expect(await read(page, 'one'), 'the input').toMatchObject({ focused: true, open: false });
    await blurInput(page, 'one');
    // The rows are the Field's: a press on its label or its tag focuses the input (FLD-12), one on its help does nothing.
    for (const selector of ['.label-row > .label', '.requirement-tag'] as const) {
      await pressOn(fieldRow(page, 'framed', selector));
      expect(await read(page, 'framed'), selector).toMatchObject({ focused: true, open: false, value: 'tokyo' });
      await blurInput(page, 'framed');
    }
    await pressOn(fieldRow(page, 'framed', '.supporting-text'));
    expect((await read(page, 'framed')).focused, 'the supporting row does nothing').toBe(false);
    expect(await heard(page)).toEqual([]);
    expect(await container(page, 'one').getAttribute('data-pressed'), 'no press answer').toBeNull();
    // The hit area: the container's ::before reaches the minimum target.
    const target = await resolveToken(page, '--tanrei-sys-target-pointer');
    expect(await container(page, 'one').evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').height))).toBeGreaterThanOrEqual(target - 0.6);
    // The focus order: the input, then the clear button, then what follows; never the chevron.
    await tabTo(page, input(page, 'one'));
    await tab(page);
    expect(await host(page, 'one').evaluate((el) => el.shadowRoot!.activeElement?.classList.contains('clear'))).toBe(true);
    await tab(page);
    expect((await read(page, 'after')).focused).toBe(true);
    expect(await part(page, 'one', '.chevron').getAttribute('tabindex')).toBe('-1');
  });

  test('CMB-15: hovered and focused draw every part of the box from that state’s tokens, focused over hovered, however focus was gained and for as long as the list is open — and the rows of the Field that frames it are drawn focused with it; a stacked combobox shows focus by a line inside its edge at the focused width and never by a ring, with the glow where the focus style is glow; selected text takes selection.color; states change over motion.state-*, at once where motion is reduced', async ({ page }) => {
    await mount(page, [fx('one', { value: 'tokyo' }), fx('error', { value: 'tokyo', error: true }), fx('other', {}), fx('floating', { variant: 'outlined' })], { system: 'm3-like', reducedMotion: true });
    await frame(page, 'framed', { label: 'Country', supportingText: 'Help.' }, { value: 'tokyo' });
    const edge = part(page, 'one', '.edge');
    const height = (await box(container(page, 'one'))).height;
    // Hovered: the state layer on the container.
    const c = await box(container(page, 'one'));
    await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2);
    await expect.poll(() => css(container(page, 'one'), 'background-color')).toBe(await color(page, 'stacked-hovered-container-color'));
    expect(await css(edge, 'border-top-color')).toBe(await color(page, 'stacked-hovered-outline-color'));
    // Focused by the keyboard, the pointer still over it: focused wins.
    await tabTo(page, input(page, 'one'));
    expect(await css(container(page, 'one'), 'background-color')).toBe(await color(page, 'stacked-focused-container-color'));
    expect(await css(edge, 'border-top-color')).toBe(await color(page, 'stacked-focused-outline-color'));
    near(await px(edge, 'border-top-width'), await token(page, 'focused-outline-width'), 'the focused width');
    expect(await css(input(page, 'one'), 'caret-color')).toBe(await color(page, 'stacked-focused-caret-color'));
    expect(await css(part(page, 'one', '.chevron-glyph'), 'color')).toBe(await color(page, 'stacked-focused-trailing-icon-color'));
    near((await box(container(page, 'one'))).height, height, 'the line takes no layout space');
    // No ring: neither the input nor the container draws an outline.
    expect([await css(input(page, 'one'), 'outline-style'), await css(container(page, 'one'), 'outline-style')]).toEqual(['none', 'none']);
    // By pointer: a press in the input selects the focused state too.
    await page.mouse.move(5, 5);
    await focusInput(page, 'other');
    expect(await css(edge, 'border-top-color')).toBe(await color(page, 'stacked-outline-color'));
    await input(page, 'one').click();
    expect(await css(edge, 'border-top-color')).toBe(await color(page, 'stacked-focused-outline-color'));
    // Open, with focus elsewhere: the list keeps the box in the focused state.
    await focusInput(page, 'other');
    await set(page, 'one', { open: true });
    expect((await read(page, 'one')).shown).toBe(true);
    expect(await css(edge, 'border-top-color'), 'open: still focused').toBe(await color(page, 'stacked-focused-outline-color'));
    await set(page, 'one', { open: false });
    // A floating label is a part of the box: its focused color, and its error part in error.
    const floating = part(page, 'floating', '.floating');
    expect(await css(floating, 'color')).toBe(await color(page, 'outlined-label-color'));
    await focusInput(page, 'floating');
    expect(await css(floating, 'color')).toBe(await color(page, 'outlined-focused-label-color'));
    // The Field's rows are drawn focused with it — while focus is inside, and for as long as its list is open.
    const [label, help] = [fieldRow(page, 'framed', '.label-row > .label'), fieldRow(page, 'framed', '.supporting-text')];
    const [rest, focused] = [await resolveColor(page, F('standard-label-color')), await resolveColor(page, F('standard-focused-label-color'))];
    expect(focused, 'm3-like’s primary is chromatic: the focused label differs').not.toBe(rest);
    expect(await css(label, 'color')).toBe(rest);
    await focusInput(page, 'framed');
    expect(await css(label, 'color')).toBe(focused);
    expect(await css(help, 'color')).toBe(await resolveColor(page, F('standard-focused-supporting-text-color')));
    await focusInput(page, 'other');
    expect(await css(label, 'color')).toBe(rest);
    await set(page, 'framed', { open: true });
    await expect.poll(() => css(label, 'color'), { message: 'open: the rows are focused with the box' }).toBe(focused);
    await set(page, 'framed', { open: false });
    await expect.poll(() => css(label, 'color')).toBe(rest);
    // In error the edge keeps its error color while focused.
    await focusInput(page, 'error');
    expect(await css(part(page, 'error', '.edge'), 'border-top-color')).toBe(await color(page, 'stacked-focused-error-outline-color'));
    // Selected text: selection.color under selection.content.color.
    expect(await input(page, 'one').evaluate((el) => [getComputedStyle(el, '::selection').backgroundColor, getComputedStyle(el, '::selection').color])).toEqual([await color(page, 'selection-color'), await color(page, 'selection-content-color')]);
    // The motion: the state duration, and none where motion is reduced.
    expect(await px(container(page, 'one'), 'transition-duration'), 'reduced: at once').toBe(0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    near((await px(container(page, 'one'), 'transition-duration')) * 1000, await duration(page, 'motion-state-duration-medium'), 'the container', 1);
    near((await px(edge, 'transition-duration')) * 1000, await duration(page, 'motion-state-duration-medium'), 'the edge', 1);
    // Glow: the halo around the container while focused, and still no ring.
    await mount(page, [fx('one', { value: 'tokyo' })], { system: 'acme', systemCss: await acmeSystemCss() });
    await tabTo(page, input(page, 'one'));
    await expect.poll(() => container(page, 'one').evaluate((el) => getComputedStyle(el, '::after').boxShadow !== 'none' || getComputedStyle(el).boxShadow !== 'none')).toBe(true);
    expect(await css(container(page, 'one'), 'outline-style')).toBe('none');
  });

  test('CMB-16: the text is typed in a native input, on one line, without autocorrection; input is emitted once per change by the person and never when the product sets inputValue or value or when a choice writes its label; the text is drawn in input.typescale and the input color with its caret in the caret color, and scrolls inside the input', async ({ page }) => {
    await mountSpec(page, ['stacked-empty', 'long-value']);
    const id = 'stacked-empty';
    expect(await input(page, id).evaluate((el) => [el.localName, (el as HTMLInputElement).type, el.getAttribute('autocomplete'), el.getAttribute('autocapitalize'), el.getAttribute('autocorrect'), el.getAttribute('spellcheck')])).toEqual(['input', 'text', 'off', 'none', 'off', 'false']);
    await listen(page, id);
    await focusInput(page, id);
    await type(page, 'to');
    expect(inputs(await heard(page))).toEqual(['input t', 'input to']);
    await page.keyboard.press('Backspace');
    expect(inputs(await heard(page))).toEqual(['input t']);
    // Pasting is one change.
    await input(page, id).evaluate((el) => {
      const field = el as HTMLInputElement;
      field.setRangeText('oronto', 1, 1, 'end');
      field.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertFromPaste' }));
    });
    expect(inputs(await heard(page))).toEqual(['input toronto']);
    // The product's own writes, and a choice's label, emit none.
    await set(page, id, { inputValue: 'ky' });
    await set(page, id, { value: 'lisbon' });
    expect((await read(page, id)).text).toBe('Lisbon');
    await page.keyboard.press('Escape');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    expect((await read(page, id)).text).toBe('Nairobi');
    expect(inputs(await heard(page))).toEqual([]);
    near(await px(input(page, id), 'font-size'), await token(page, 'input-typescale-medium-font-size'), 'input.typescale');
    expect(await css(input(page, id), 'color')).toBe(await color(page, 'stacked-focused-input-color'));
    expect(await css(input(page, id), 'caret-color')).toBe(await color(page, 'stacked-focused-caret-color'));
    // A text longer than the input stays on one line and scrolls inside it.
    const long = input(page, 'long-value');
    expect(await long.evaluate((el) => el.scrollWidth > el.clientWidth), 'it scrolls').toBe(true);
    near((await box(long)).height, (await box(input(page, id))).height, 'one line');
  });


  test('CMB-16: inputValue is the new text in every listener of input — a capturing one on an ancestor, which hears the native event before the combobox itself, too — and is the combobox’s own again once it has taken the text', async ({ page }) => {
    await mount(page, [fx('one', { value: 'tokyo' })], { reducedMotion: true });
    await page.evaluate(() => {
      const w = window as unknown as { __texts: string[] };
      w.__texts = [];
      const combobox = document.querySelector('tanrei-combobox') as HTMLElement & { inputValue: string };
      document.addEventListener('input', () => w.__texts.push(`capture ${combobox.inputValue}`), true);
      combobox.addEventListener('input', () => w.__texts.push(`target ${combobox.inputValue}`));
      document.addEventListener('input', () => w.__texts.push(`bubble ${combobox.inputValue}`));
    });
    await focusInput(page, 'one');
    await selectAll(page, 'one');
    await type(page, 'ky');
    expect(await page.evaluate(() => (window as unknown as { __texts: string[] }).__texts)).toEqual(['capture k', 'target k', 'bubble k', 'capture ky', 'target ky', 'bubble ky']);
    expect(await read(page, 'one')).toMatchObject({ inputValue: 'ky', text: 'ky', value: 'tokyo', rows: ['Kyoto', 'Tokyo'] });
    // A text the product sets is the product's until the person edits again.
    await set(page, 'one', { inputValue: 'lis' });
    expect(await read(page, 'one')).toMatchObject({ inputValue: 'lis', text: 'lis', rows: ['Lisbon'] });
  });
  test('CMB-16: while a Japanese input method composes "にほん" the list filters by the text the element reports and no option is active; Enter, Escape and the arrow keys are the input method’s — Enter confirms the conversion and neither chooses, commits nor submits — and the next Enter is the combobox’s', async ({ page }) => {
    const JAPAN = [option('にほんご', 'ja-kana'), option('日本', 'jp'), option('日本語', 'ja'), option('韓国', 'kr')];
    await mount(page, [fx('one', { label: '国' }, JAPAN)]);
    await inForm(page, 'one');
    await listen(page, 'one');
    await focusInput(page, 'one');
    await compose(page, 'one', ['に', 'にほ', 'にほん']);
    await settle(page, 'one');
    expect(await read(page, 'one'), 'the list is filtered by the composing text, and nothing is active').toMatchObject({ shown: true, rows: ['にほんご'], active: null, inputValue: 'にほん', text: 'にほん', value: '' });
    expect(others(await heard(page)), 'opened, and nothing chosen').toEqual(['toggle true']);
    // Every key belongs to the input method: none is prevented, none acts.
    for (const key of ['ArrowDown', 'ArrowUp', 'PageDown', 'Escape', 'Enter']) expect(await composingKey(page, 'one', key), key).toBe(false);
    await settle(page, 'one');
    expect(await read(page, 'one'), 'the keys moved, closed and chose nothing').toMatchObject({ shown: true, active: null, value: '', text: 'にほん' });
    expect(await heard(page)).toEqual([]);
    // A text the product sets during the composition is not written into it: it is applied when the composition ends.
    await set(page, 'one', { inputValue: '韓' });
    expect(await input(page, 'one').evaluate((el) => (el as HTMLInputElement).value), 'the element is the input method’s').toBe('にほん');
    await set(page, 'one', { inputValue: 'にほん' });
    // The conversion is confirmed: the text is the element's, the first match becomes active, nothing was chosen or submitted.
    await endComposition(page, 'one', '日本');
    expect(await read(page, 'one')).toMatchObject({ shown: true, rows: ['日本', '日本語'], active: '日本', value: '', inputValue: '日本' });
    const after = await heard(page);
    expect(others(after)).toEqual([]);
    expect(after.at(-1), 'one input that is not composing ends it').toBe('input 日本');
    // The next Enter is the combobox's: it chooses the active option, and does not submit.
    await page.keyboard.press('Enter');
    expect(await read(page, 'one')).toMatchObject({ value: 'jp', text: '日本', open: false });
    expect(await heard(page)).toEqual(['change jp', 'toggle false select']);
  });

  test('CMB-16: in Chromium a real composition, driven through the browser’s input method interface, filters, makes nothing active, and its confirmation chooses nothing', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'the input method is driven over the DevTools protocol');
    await mount(page, [fx('one', { label: '国' }, [option('にほんご', 'ja-kana'), option('日本', 'jp'), option('日本語', 'ja')])]);
    await listen(page, 'one');
    await focusInput(page, 'one');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.imeSetComposition', { text: 'にほん', selectionStart: 3, selectionEnd: 3 });
    await settle(page, 'one');
    expect(await read(page, 'one')).toMatchObject({ shown: true, rows: ['にほんご'], active: null, value: '' });
    await cdp.send('Input.insertText', { text: '日本' });
    await cdp.detach();
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 30)));
    await settle(page, 'one');
    expect(await read(page, 'one')).toMatchObject({ shown: true, rows: ['日本', '日本語'], active: '日本', value: '', text: '日本' });
    expect(others(await heard(page))).toEqual(['toggle true']);
  });

  test('CMB-17: value and inputValue are two things: while the person is not editing the text is the chosen option’s label, a value that names no option shows itself where a custom value is allowed and an empty input otherwise; typing and moving through the list never change value; an option whose value is empty cannot be chosen', async ({ page }) => {
    await mount(page, [fx('one', { value: 'tokyo' }), fx('custom', { value: 'Recursive', allowCustomValue: true, label: 'Font family' }, [option('Inter', 'Inter'), option('Roboto Mono', 'Roboto Mono')]), fx('unknown', { value: 'berlin', placeholder: 'Type to find a city' }), fx('none', {}, [option('None', ''), option('Kyoto', 'kyoto')])], { reducedMotion: true });
    expect(await read(page, 'one')).toMatchObject({ value: 'tokyo', inputValue: 'Tokyo', text: 'Tokyo' });
    expect(await read(page, 'custom')).toMatchObject({ value: 'Recursive', text: 'Recursive' });
    expect(await read(page, 'unknown'), 'kept, and nothing shown').toMatchObject({ value: 'berlin', text: '' });
    expect(await input(page, 'unknown').evaluate((el) => (el as HTMLInputElement).placeholder)).toBe('Type to find a city');
    // Typing and the arrow keys: the text and the active option change, the value does not.
    await listen(page, 'one');
    await focusInput(page, 'one');
    await selectAll(page, 'one');
    await type(page, 'ky');
    await page.keyboard.press('ArrowDown');
    expect(await read(page, 'one')).toMatchObject({ value: 'tokyo', inputValue: 'ky', text: 'ky', shown: true });
    expect((await heard(page)).some((e) => e.startsWith('change'))).toBe(false);
    // The options arrive after the value: the label is shown once they are there.
    await host(page, 'unknown').evaluate((el) => el.insertAdjacentHTML('beforeend', '<tanrei-option value="berlin">Berlin</tanrei-option>'));
    await expect.poll(async () => (await read(page, 'unknown')).text).toBe('Berlin');
    // The empty value is "nothing chosen": its option is drawn, never marked and never chosen.
    await focusInput(page, 'none');
    await listen(page, 'none');
    await page.keyboard.press('ArrowDown');
    expect(await read(page, 'none')).toMatchObject({ shown: true, rows: ['None', 'Kyoto'], selected: [] });
    await pressOn(row(page, 'none', 'None'));
    expect(await heard(page)).toEqual(['toggle true']);
    expect(await read(page, 'none'), 'not chosen: the list stays').toMatchObject({ value: '', open: true });
  });

  test('CMB-18: a glyph in the leading-icon slot is drawn at the start of the container; otherwise the chosen option’s own while the person is not editing; otherwise none — at icon.size, unselected, in the leading-icon color, hidden from assistive technology', async ({ page }) => {
    await mountSpec(page, ['stacked-leading-icon', 'stacked-option-icon', 'stacked-value']);
    const slot = part(page, 'stacked-leading-icon', '.leading-slot');
    near((await box(slot)).width, await token(page, 'icon-size-medium'), 'icon.size');
    expect(await css(slot, 'color')).toBe(await color(page, 'stacked-leading-icon-color'));
    expect(await slot.getAttribute('aria-hidden')).toBe('true');
    expect(await css(slot, 'font-family')).toContain((await css(page.locator('html'), '--tanrei-sys-icon-family-unselected')).replaceAll('"', '').trim());
    // The chosen option's own glyph.
    const own = part(page, 'stacked-option-icon', '.leading-own');
    await expect(own).toBeVisible();
    await expect(own).toHaveText('train');
    near((await box(own)).width, await token(page, 'icon-size-medium'), 'icon.size');
    expect(await own.getAttribute('aria-hidden')).toBe('true');
    // …not while the person edits: the text no longer stands for that option.
    await focusInput(page, 'stacked-option-icon');
    await page.keyboard.press('End');
    await type(page, 's');
    await expect(own).toBeHidden();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect(own).toBeVisible();
    // The slot's glyph takes the place of an option's own.
    await host(page, 'stacked-option-icon').evaluate((el) => el.insertAdjacentHTML('beforeend', '<span slot="leading-icon">commute</span>'));
    await expect(own).toBeHidden();
    await expect(part(page, 'stacked-option-icon', '.leading-slot')).toBeVisible();
    // Neither: no glyph, and the text starts at the text padding.
    await expect(part(page, 'stacked-value', '.leading-slot')).toBeHidden();
    await expect(part(page, 'stacked-value', '.leading-own')).toBeHidden();
  });

  test('CMB-19: the chevron is the icon set’s expand_more at the end of the container, at icon.size in the trailing-icon color, the same glyph closed and open and never mirrored; its hit area reaches from the container’s end edge to the input over the whole height; a press opens and closes the list, keeps focus in the input and draws no press answer; it is no focus stop and is a button named by label with its expanded state; chevron false or read-only draws none', async ({ page }) => {
    await mountSpec(page, ['stacked-value', 'stacked-no-chevron', 'stacked-read-only', 'stacked-error', 'stacked-required-rtl']);
    const id = 'stacked-value';
    const glyph = part(page, id, '.chevron-glyph');
    const button = part(page, id, '.chevron');
    await expect(glyph).toHaveText('expand_more');
    near((await box(glyph)).width, await token(page, 'icon-size-medium'), 'icon.size');
    expect(await css(glyph, 'color')).toBe(await color(page, 'stacked-trailing-icon-color'));
    expect(await css(part(page, 'stacked-error', '.chevron-glyph'), 'color')).toBe(await color(page, 'stacked-error-trailing-icon-color'));
    expect(await button.evaluate((el) => [el.localName, el.getAttribute('tabindex'), el.getAttribute('aria-label'), el.getAttribute('aria-expanded')])).toEqual(['button', '-1', 'City', 'false']);
    // The hit area: every point from the input's end to the container's end edge, top to bottom, is the chevron's.
    const c = await box(container(page, id));
    const field = await box(input(page, id));
    const at = (x: number, y: number) =>
      page.evaluate(
        ([px_, py]) => {
          let node: Element | null = document.elementFromPoint(px_, py);
          while (node?.shadowRoot) {
            const inner = node.shadowRoot.elementFromPoint(px_, py);
            if (!inner || inner === node) break;
            node = inner;
          }
          return node?.closest('.chevron') ? 'chevron' : String(node?.className ?? '');
        },
        [x, y],
      );
    for (const [x, y] of [[c.x + c.width - 1, c.y + 1], [c.x + c.width - 1, c.y + c.height - 1], [field.x + field.width + 2, c.y + c.height / 2]]) expect(await at(x, y), `${x},${y}`).toBe('chevron');
    expect(await button.evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').width))).toBeGreaterThanOrEqual((await resolveToken(page, '--tanrei-sys-target-pointer')) - 0.6);
    // A press opens, a second closes with the reason press; focus is the input's; nothing turns, nothing is pressed.
    await listen(page, id);
    await page.mouse.click(c.x + c.width - 4, c.y + 4);
    await shownList(page, id).toBe(true);
    expect(await read(page, id)).toMatchObject({ focused: true, active: 'Tokyo', rows: ALL });
    expect(await button.getAttribute('aria-expanded')).toBe('true');
    expect(await glyph.evaluate((el) => [getComputedStyle(el).transform, getComputedStyle(el).rotate, el.textContent])).toEqual(['none', 'none', 'expand_more']);
    expect(await button.getAttribute('data-pressed')).toBeNull();
    await page.mouse.click(c.x + c.width - 4, c.y + 4);
    await closedList(page, id);
    expect(await heard(page)).toEqual(['toggle true', 'toggle false press']);
    expect((await read(page, id)).focused).toBe(true);
    // Right to left: at the left, and not mirrored.
    const rtl = 'stacked-required-rtl';
    expect((await box(part(page, rtl, '.chevron-glyph'))).x).toBeLessThan((await box(input(page, rtl))).x);
    expect(await part(page, rtl, '.chevron-glyph').evaluate((el) => [getComputedStyle(el).transform, getComputedStyle(el).scale, el.hasAttribute('data-tanrei-mirrored')])).toEqual(['none', 'none', false]);
    // No chevron: none is drawn, and the list opens by typing and by the arrow keys alone.
    await expect(part(page, 'stacked-no-chevron', '.chevron')).toHaveCount(0);
    await expect(part(page, 'stacked-read-only', '.chevron')).toHaveCount(0);
    await focusInput(page, 'stacked-no-chevron');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'stacked-no-chevron').toBe(true);
  });

  test('CMB-20: a clearable combobox with a text draws a clear button before the chevron — an icon-only text Button of the small size showing close, named by clearLabel, a focus stop after the input; activating it empties the text and the value, emits input once and change once while the value was not empty, moves focus to the input and leaves the list as it is; an empty clearLabel is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [...spec.fixtures.filter((f) => ['stacked-clearable', 'stacked-required-rtl'].includes(f.id)), fx('empty', { clearable: true, clearLabel: 'Clear' }), fx('unnamed', { clearable: true, value: 'tokyo' }), fx('off', { clearable: true, value: 'tokyo', disabled: true }), fx('ro', { clearable: true, value: 'tokyo', readOnly: true })]);
    const id = 'stacked-clearable';
    const clear = part(page, id, '.clear');
    expect(await clear.evaluate((el) => [el.localName, el.getAttribute('variant'), el.getAttribute('size'), el.getAttribute('label'), el.textContent?.trim()])).toEqual(['tanrei-button', 'text', 'small', 'Clear city', 'close']);
    expect(await clear.locator('button').getAttribute('aria-label')).toBe('Clear city');
    expect((await box(part(page, id, '.clear-box'))).x, 'after the input').toBeGreaterThanOrEqual((await box(input(page, id))).x + (await box(input(page, id))).width - 0.6);
    expect((await box(part(page, id, '.clear-box'))).x, 'before the chevron').toBeLessThan((await box(part(page, id, '.chevron-glyph'))).x);
    for (const none of ['empty', 'off', 'ro']) await expect(part(page, none, '.clear'), none).toHaveCount(0);
    // Right to left: at the left, the chevron nearest the edge.
    const rtl = 'stacked-required-rtl';
    expect((await box(part(page, rtl, '.chevron-glyph'))).x).toBeLessThan((await box(part(page, rtl, '.clear-box'))).x);
    expect((await box(part(page, rtl, '.clear-box'))).x).toBeLessThan((await box(input(page, rtl))).x);
    // Activated with the list open: one input, one change, focus in the input, the list still open with every option.
    await listen(page, id);
    await focusInput(page, id);
    await page.keyboard.press('ArrowDown');
    await shownList(page, id).toBe(true);
    await heard(page);
    await clear.click();
    await settle(page, id);
    expect(await heard(page)).toEqual(['input ', 'change ']);
    expect(await read(page, id)).toMatchObject({ value: '', text: '', focused: true, open: true, shown: true, rows: ALL, selected: [] });
    await expect(clear).toHaveCount(0);
    // By the keyboard, over a text that was never committed: input alone, since the value was already empty.
    await page.keyboard.press('Escape');
    await type(page, 'ky');
    await page.keyboard.press('Escape');
    await heard(page);
    await tab(page);
    expect(await host(page, id).evaluate((el) => el.shadowRoot!.activeElement?.classList.contains('clear'))).toBe(true);
    await page.keyboard.press('Enter');
    await settle(page, id);
    expect(await heard(page)).toEqual(['input ']);
    expect(await read(page, id)).toMatchObject({ value: '', text: '', focused: true, open: false });
    // Without a name it is still drawn, and reported.
    await expect(part(page, 'unnamed', '.clear')).toHaveCount(1);
    await expect.poll(() => seen.some((w) => w.includes('CMB-20'))).toBe(true);
  });

  test('CMB-60: the combobox has no words of its own — clearLabel and emptyText are the instance’s, else the product’s words, else nothing: without a clear label the button is drawn, works and is reported; the words of a requirement are not the combobox’s — it reads none and draws none', async ({ page }) => {
    const bare = (id: string, props: Fixture['props']): Fixture => ({ id, props: { label: 'City', ...props }, items: CITIES });
    const seen = warnings(page);
    await mount(page, [
      bare('wordless', { value: 'tokyo', clearable: true }),
      bare('second', { value: 'tokyo', clearable: true }),
      bare('own', { value: 'tokyo', clearable: true, clearLabel: 'Clear city' }),
      // The attributes of the frame it was: a bare combobox knows none of them.
      bare('old', { required: true, requiredMark: 'tag', requiredText: 'Required', optionalText: 'Optional', supportingText: 'Help.', errorText: 'No.' }),
    ]);
    const named = (id: string) => part(page, id, '.clear').evaluate((el) => (el as HTMLElement & { label: string }).label);
    // No words: the button is drawn with no name, works, and is reported.
    await expect(part(page, 'wordless', '.clear')).toHaveCount(1);
    expect([await named('wordless'), await named('own')]).toEqual(['', 'Clear city']);
    await expect.poll(() => seen.filter((w) => w.includes('CMB-20') && w.includes('clearLabel')).length).toBeGreaterThanOrEqual(1);
    await part(page, 'wordless', '.clear').click();
    expect(await read(page, 'wordless')).toMatchObject({ value: '', text: '', focused: true });
    // The product's words, set once: every instance without the prop takes them, at once; an instance's own wins.
    await setWords(page, { clearLabel: 'Clear' });
    await expect.poll(() => named('second')).toBe('Clear');
    expect(await named('own')).toBe('Clear city');
    // The words of a requirement are the Field's (FLD-24): the combobox reads none, draws none and says none.
    await setWords(page, { clearLabel: 'Clear', requiredText: 'Required', optionalText: 'Optional' });
    await settle(page, 'old');
    expect(await host(page, 'old').evaluate((el) => `${el.shadowRoot!.textContent} ${[...el.shadowRoot!.querySelectorAll('tanrei-tag, [aria-label], [aria-description]')].map((each) => `${each.getAttribute('label') ?? ''} ${each.getAttribute('aria-label') ?? ''}`).join(' ')}`)).not.toMatch(/Required|Optional|Help|No\./);
    expect([await input(page, 'old').getAttribute('aria-required'), await description(page, 'old')]).toEqual([null, '']);
    expect(seen.filter((w) => /requiredText|optionalText/.test(w)), 'nothing is asked of a word it does not read').toEqual([]);
  });

  test('CMB-32, CMB-60: a text that matches nothing draws emptyText in the status row’s place — the instance’s, else the product’s words; with neither, no row is drawn, nothing is announced, and the report names emptyText', async ({ page }) => {
    const seen = warnings(page);
    const none = spec.fixtures.find((f) => f.id === 'open-filtered-none')!;
    const { emptyText: _given, ...withoutWords } = none.props;
    await mount(page, [{ ...none, id: 'wordless', props: withoutWords }, { ...none, id: 'own', props: { ...withoutWords, emptyText: 'Nothing here' } }], { reducedMotion: true });
    const status = (id: string) => host(page, id).evaluate(async (el) => (await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete, { shown: el.shadowRoot!.querySelector('.status')!.hasAttribute('data-shown'), said: el.shadowRoot!.querySelector('.status [role="status"]')!.textContent ?? '' }));
    // No words: no row for it, and nothing said.
    expect(await status('wordless')).toEqual({ shown: false, said: '' });
    expect(await status('own')).toEqual({ shown: true, said: 'Nothing here' });
    await expect.poll(() => seen.filter((w) => w.includes('CMB-32') && w.includes('emptyText')).length).toBe(1);
    expect(seen.find((w) => w.includes('CMB-32') && w.includes('emptyText'))).toContain('empty-text is empty');
    expect(await missingWords(page)).toEqual(['emptyText']);
    expect(await host(page, 'wordless').evaluate((el) => el.shadowRoot!.textContent)).not.toContain('No matches');
    // The product's words, set once; an instance's own prop wins.
    await setWords(page, { emptyText: 'No matches' });
    expect(await status('wordless')).toEqual({ shown: true, said: 'No matches' });
    expect(await status('own')).toEqual({ shown: true, said: 'Nothing here' });
    expect(await missingWords(page)).toEqual([]);
  });
});

test.describe('behavior: the list', () => {
  test('CMB-21: a change of the text, Down Arrow or Up Arrow in the input — with or without Alt — or a press on the chevron sets open, emits toggle once and presents the list; opened by a key it shows every option until the text is edited; focus arriving, a press on the input, a pointer over it and time passing open nothing; with nothing to show nothing opens; opening changes no value', async ({ page }) => {
    await mount(page, [fx('one', { value: 'tokyo' }), fx('bare', {}, [])], { reducedMotion: true });
    await listen(page, 'one');
    // Focus by Tab, a press in the input, a pointer resting on it: nothing opens.
    await tabTo(page, input(page, 'one'));
    await input(page, 'one').click();
    await input(page, 'one').hover();
    await frames(page, 6);
    expect(await read(page, 'one')).toMatchObject({ open: false, expanded: 'false', shown: false, controls: null });
    expect(await heard(page)).toEqual([]);
    // The arrow keys, with or without Alt: every option, whatever the input holds.
    for (const key of ['ArrowDown', 'ArrowUp', 'Alt+ArrowDown', 'Alt+ArrowUp']) {
      await page.keyboard.press(key);
      await shownList(page, 'one').toBe(true);
      expect(await read(page, 'one'), key).toMatchObject({ open: true, expanded: 'true', controls: 'list', rows: ALL, value: 'tokyo', text: 'Tokyo' });
      expect(await heard(page), key).toEqual(['toggle true']);
      await page.keyboard.press('Escape');
      await closedList(page, 'one');
      await heard(page);
    }
    // Until the person edits the text: then it is filtered.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Backspace');
    expect((await read(page, 'one')).rows, '"Toky"').toEqual(['Tokyo']);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await heard(page);
    // A change of the text opens it, once.
    await selectAll(page, 'one');
    await type(page, 'ky');
    expect(others(await heard(page))).toEqual(['toggle true']);
    expect(await read(page, 'one')).toMatchObject({ shown: true, rows: ['Kyoto', 'Tokyo'], value: 'tokyo' });
    // The product's own open, for a list on focus: no toggle.
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await heard(page);
    await set(page, 'one', { open: true });
    expect(await read(page, 'one')).toMatchObject({ shown: true, expanded: 'true' });
    expect(await heard(page)).toEqual([]);
    // Nothing to show: no option, no status, nothing to say — no key opens a list.
    await focusInput(page, 'bare');
    await listen(page, 'bare');
    await page.keyboard.press('ArrowDown');
    expect(await read(page, 'bare')).toMatchObject({ open: false, shown: false });
    expect(await heard(page)).toEqual([]);
  });

  test('CMB-22: the open list is in the overlay layer, list.offset below the container with the start edges together and exactly as wide as it; above it where below has no room; it follows the container, and closes with the reason anchor-hidden when the container goes out of sight; it is filled with list.color, raised by list.elevation, rounded by list.shape and insets its rows by its paddings', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 700 });
    await mount(page, [fx('one', { value: 'lisbon' })], { reducedMotion: true });
    await listen(page, 'one');
    await focusInput(page, 'one');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'one').toBe(true);
    const offset = await token(page, 'list-offset');
    const list = part(page, 'one', '.list');
    let [c, l] = [await box(container(page, 'one')), await box(list)];
    near(l.y - (c.y + c.height), offset, 'list.offset below');
    near(l.x, c.x, 'start edges together');
    near(l.width, c.width, 'exactly as wide as the container');
    expect(await part(page, 'one', '.surface').evaluate((el) => [el.matches(':popover-open'), el.dataset.side, getComputedStyle(el).position])).toEqual([true, 'bottom', 'fixed']);
    // The sheet.
    expect(await css(list, 'background-color')).toBe(await color(page, 'list-color'));
    expect(await css(list, 'box-shadow')).not.toBe('none');
    near(await px(list, 'border-top-left-radius'), await token(page, 'list-shape'), 'list.shape');
    expect(await css(list, 'overflow-x'), 'its rows are clipped to its shape').toBe('hidden');
    near(await px(part(page, 'one', '.scroll'), 'padding-top'), await token(page, 'list-padding-block'), 'list.padding-block');
    near(await px(part(page, 'one', '.scroll'), 'padding-left'), await token(page, 'list-padding-inline'), 'list.padding-inline');
    expect(await host(page, 'one').evaluate((el) => 'placement' in el), 'no placement prop').toBe(false);
    // It follows the container.
    await page.evaluate(() => document.body.insertAdjacentHTML('afterbegin', '<div data-moved style="block-size: 40px"></div>'));
    await expect.poll(async () => Math.round((await box(list)).y - (await box(container(page, 'one'))).y - (await box(container(page, 'one'))).height)).toBe(Math.round(offset));
    await page.keyboard.press('Escape');
    await closedList(page, 'one');
    // No room below, room above: it stands above.
    await page.evaluate(() => (document.querySelector<HTMLElement>('[data-moved]')!.style.blockSize = '560px'));
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'one').toBe(true);
    [c, l] = [await box(container(page, 'one')), await box(list)];
    near(c.y - (l.y + l.height), offset, 'list.offset above');
    expect(await part(page, 'one', '.surface').getAttribute('data-side')).toBe('top');
    await page.keyboard.press('Escape');
    await closedList(page, 'one');
    // The container goes out of sight while the list is open: closed, with the reason.
    await blurInput(page, 'one');
    await set(page, 'one', { open: true });
    await shownList(page, 'one').toBe(true);
    await heard(page);
    await host(page, 'one').evaluate((el) => (el.style.display = 'none'));
    await expect.poll(() => heard(page)).toEqual(['toggle false anchor-hidden']);
    expect((await read(page, 'one')).open).toBe(false);
  });

  test('CMB-23: the list is as tall as its rows, no taller than list.max-height and the room its side leaves, and scrolls beyond that, vertically only, its paddings scrolling with the rows; opening it brings the whole of the chosen option into view; a long label or supporting text wraps, and the list is never wider than the container', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    await mount(page, [fx('few', { value: 'tokyo' }), fx('many', { value: 'o20' }, MANY), ...spec.fixtures.filter((f) => f.id === 'open-long-options')], { reducedMotion: true });
    // As tall as its rows.
    await focusInput(page, 'few');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'few').toBe(true);
    const rowHeight = (await box(rows(page, 'few').first())).height;
    near((await box(part(page, 'few', '.list'))).height, 5 * rowHeight + 2 * (await token(page, 'list-padding-block')), 'five rows and the paddings', 1);
    await page.keyboard.press('Escape');
    // Twenty-four rows: the greatest height, scrolling vertically only, the chosen option in view.
    await focusInput(page, 'many');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'many').toBe(true);
    const scroll = part(page, 'many', '.scroll');
    near((await box(part(page, 'many', '.list'))).height, await token(page, 'list-max-height'), 'list.max-height', 1);
    expect(await scroll.evaluate((el) => [getComputedStyle(el).overflowY, getComputedStyle(el).overflowX, el.scrollHeight > el.clientHeight, el.scrollWidth <= el.clientWidth])).toEqual(['auto', 'hidden', true, true]);
    const [s, chosen] = [await box(scroll), await box(row(page, 'many', 'Option 20'))];
    expect(chosen.y, 'the chosen option’s top is in view').toBeGreaterThanOrEqual(s.y - 0.6);
    expect(chosen.y + chosen.height, 'and its bottom').toBeLessThanOrEqual(s.y + s.height + 0.6);
    // The paddings scroll with the rows: at the end, the last row stands padding-block above the sheet's edge.
    await scroll.evaluate((el) => (el.scrollTop = el.scrollHeight));
    const last = await box(rows(page, 'many').last());
    near(s.y + s.height - (last.y + last.height), await token(page, 'list-padding-block'), 'the end padding', 1);
    // The room: in a short window the list is shorter than its greatest height, and stays an anchored list.
    await page.setViewportSize({ width: 800, height: 420 });
    await expect.poll(async () => (await box(part(page, 'many', '.list'))).height).toBeLessThan((await token(page, 'list-max-height')) - 1);
    // Long texts wrap; the list is as wide as the container.
    const id = 'open-long-options';
    const long = rows(page, id).first();
    expect((await box(long)).height, 'the row grew').toBeGreaterThan(2 * rowHeight);
    expect(await long.locator('.option-supporting').evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && getComputedStyle(el).textOverflow !== 'ellipsis')).toBe(true);
    near((await box(part(page, id, '.list'))).width, (await box(container(page, id))).width, 'as wide as the container');
  });

  test('CMB-24: while the list is open focus stays in the input — it is not moved into the list, nothing is trapped or inert and no scrim is drawn — and a press on a disabled option, on a group title, on the status row or on the list’s surface does not take it, so typing goes on; one option at most is the active one', async ({ page }) => {
    await mount(page, [fx('one', { statusText: '3 shown' }, [group('Asia', [option('Kyoto', 'kyoto'), option('Tokyo', 'tokyo', { disabled: true })]), option('Lisbon', 'lisbon')]), fx('other', {})], { reducedMotion: true });
    await listen(page, 'one');
    await focusInput(page, 'one');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'one').toBe(true);
    for (const selector of ['.group-title', '.status', '.row.d']) {
      await pressOn(part(page, 'one', selector));
      expect(await read(page, 'one'), selector).toMatchObject({ focused: true, open: true, value: '' });
    }
    // The sheet's own padding.
    const l = await box(part(page, 'one', '.list'));
    await page.mouse.click(l.x + l.width / 2, l.y + 2);
    expect(await read(page, 'one'), 'the surface').toMatchObject({ focused: true, open: true });
    await type(page, 'k');
    expect(await read(page, 'one'), 'typing goes on editing the text').toMatchObject({ text: 'k', rows: ['Kyoto', 'Tokyo'] });
    expect(others(await heard(page))).toEqual(['toggle true']);
    // Nothing is inert, nothing is trapped, no scrim: the rest of the page is there and takes focus.
    expect(await page.evaluate(() => [document.querySelectorAll('[inert]').length, document.querySelector('dialog')])).toEqual([0, null]);
    expect(await part(page, 'one', '.surface').evaluate((el) => getComputedStyle(el, '::backdrop').backgroundColor)).toBe('rgba(0, 0, 0, 0)');
    expect(await part(page, 'one', '.row.active').count(), 'one active option at most').toBeLessThanOrEqual(1);
    await tab(page);
    expect((await read(page, 'other')).focused).toBe(true);
  });

  test('CMB-25: under filter contains the list shows, in their order, the options whose label contains the typed text — whatever the case, the width of a character or the marks on a letter — and every option for an empty text; a group left empty is not drawn; under filter none every option stays; neither the supporting text nor the value is searched', async ({ page }) => {
    await mount(page, [
      fx('one', {}, [option('Tokyo', 'tokyo'), option('Toronto', 'toronto'), option('Kyoto', 'kyoto'), option('Bogotá', 'bog', { supportingText: 'Colombia' }), option('がまごおり', 'gamagori'), option('かまくら', 'kamakura')]),
      fx('none', { filter: 'none' }, [option('Tokyo', 'tokyo'), option('Toronto', 'toronto'), option('Kyoto', 'kyoto')]),
      ...spec.fixtures.filter((f) => ['open-filtered', 'open-groups-filtered'].includes(f.id)),
    ], { reducedMotion: true });
    const typed = async (id: string, text: string) => {
      await focusInput(page, id);
      await selectAll(page, id);
      if (text) await type(page, text);
      else await page.keyboard.press('Backspace');
      await settle(page, id);
      return (await read(page, id)).rows;
    };
    expect(await typed('one', 'to')).toEqual(['Tokyo', 'Toronto', 'Kyoto']);
    expect(await typed('one', 'TO'), 'whatever the case').toEqual(['Tokyo', 'Toronto', 'Kyoto']);
    expect(await typed('one', 'ｔｏ'), 'whatever the width').toEqual(['Tokyo', 'Toronto', 'Kyoto']);
    expect(await typed('one', 'bogota'), 'whatever the marks').toEqual(['Bogotá']);
    expect(await typed('one', 'bogotá')).toEqual(['Bogotá']);
    expect(await typed('one', 'か'), 'a sound mark of kana is the letter’s own').toEqual(['かまくら']);
    expect(await typed('one', 'colombia'), 'the supporting text is not searched').toEqual([]);
    expect(await typed('one', 'bog '), 'the value is not searched').toEqual([]);
    expect(await typed('one', ''), 'an empty text shows every option').toHaveLength(6);
    // Filter none: every option, whatever is typed.
    expect(await typed('none', 'zz')).toEqual(['Tokyo', 'Toronto', 'Kyoto']);
    // The fixtures: "to" over the five cities, and "in" over three groups — the groups keep their titles, and none is empty.
    expect((await read(page, 'open-filtered')).rows).toEqual(['Kyoto', 'Tokyo', 'Toronto']);
    const groups = 'open-groups-filtered';
    expect((await read(page, groups)).rows).toEqual(['Singapore', 'Berlin', 'Coordinated Universal Time']);
    await expect(part(page, groups, '.group-title')).toHaveText(['Asia', 'Europe']);
    await set(page, groups, { inputValue: 'seo' });
    expect((await read(page, groups)).rows).toEqual(['Seoul']);
    await expect(part(page, groups, '.group'), 'a group left without an option is not drawn').toHaveCount(1);
    await expect(part(page, groups, '.group-title')).toHaveText(['Asia']);
    await expect(part(page, groups, '.scroll .divider'), 'nor its separation').toHaveCount(0);
  });

  test('CMB-26: typing makes the first shown option that is not disabled active, and none where a custom value is allowed; a list opened by a key makes the chosen option active, or the first enabled one; Down and Up Arrow move by one across groups and stop at the ends — Up Arrow on the first leaves none where a custom value is allowed — Page Down and Page Up by ten; Home, End, Left and Right Arrow are the text’s; a disabled option is reached; a pointer makes an option active without the ring, the keyboard with it; nothing here changes value or the text', async ({ page }) => {
    await mount(page, [
      fx('one', { value: 'lisbon' }, [group('A', [option('Kyoto', 'kyoto', { disabled: true }), option('Kobe', 'kobe')]), group('B', [option('Lisbon', 'lisbon'), option('Tokyo', 'tokyo', { disabled: true })]), option('Toronto', 'toronto')]),
      fx('custom', { allowCustomValue: true }),
      fx('many', {}, MANY),
    ], { reducedMotion: true });
    await listen(page, 'one');
    // Typing: the first shown option that is not disabled.
    await focusInput(page, 'one');
    await selectAll(page, 'one');
    await type(page, 'k');
    expect(await read(page, 'one'), 'Kyoto is disabled: Kobe').toMatchObject({ rows: ['Kyoto', 'Kobe', 'Tokyo'], active: 'Kobe', ring: ['Kobe'] });
    await type(page, 'y');
    expect(await read(page, 'one'), 'only disabled options are shown: none').toMatchObject({ rows: ['Kyoto', 'Tokyo'], active: null });
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    // Opened by a key: the chosen option; the arrows move across groups, through disabled options, and stop at the ends.
    await page.keyboard.press('ArrowDown');
    expect(await read(page, 'one')).toMatchObject({ active: 'Lisbon', ring: ['Lisbon'] });
    await page.keyboard.press('ArrowDown');
    expect((await read(page, 'one')).active, 'a disabled option is reached').toBe('Tokyo');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    expect((await read(page, 'one')).active, 'stops at the last').toBe('Toronto');
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowUp');
    expect((await read(page, 'one')).active, 'stops at the first').toBe('Kyoto');
    // Home, End and the horizontal arrows are the text's: the combobox prevents none of them and the active option
    // stays; the caret moves as the platform moves it (Home and End move no caret in a field on every platform).
    const caret = () => input(page, 'one').evaluate((el) => (el as HTMLInputElement).selectionStart);
    await host(page, 'one').evaluate((el) => {
      (window as unknown as { __prevented: string[] }).__prevented = [];
      el.addEventListener('keydown', (event) => {
        if ((event as KeyboardEvent).defaultPrevented) (window as unknown as { __prevented: string[] }).__prevented.push((event as KeyboardEvent).key);
      });
    });
    await input(page, 'one').evaluate((el) => (el as HTMLInputElement).setSelectionRange(3, 3));
    for (const key of ['Home', 'End', 'ArrowLeft', 'ArrowRight']) {
      await page.keyboard.press(key);
      expect((await read(page, 'one')).active, key).toBe('Kyoto');
    }
    await input(page, 'one').evaluate((el) => (el as HTMLInputElement).setSelectionRange(3, 3));
    await page.keyboard.press('ArrowRight');
    expect(await caret()).toBe(4);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    expect(await caret()).toBe(2);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    expect(await page.evaluate(() => (window as unknown as { __prevented: string[] }).__prevented), 'only the keys that move the active option are taken').toEqual(['ArrowDown', 'ArrowUp']);
    // A pointer that moves onto an option makes it active, hovered and without the ring; the arrow keys go on from it.
    await rows(page, 'one').nth(2).hover();
    await page.mouse.move((await box(rows(page, 'one').nth(2))).x + 20, (await box(rows(page, 'one').nth(2))).y + 10);
    expect(await read(page, 'one')).toMatchObject({ active: 'Lisbon', ring: [] });
    await page.keyboard.press('ArrowDown');
    expect(await read(page, 'one')).toMatchObject({ active: 'Tokyo', ring: ['Tokyo'] });
    expect(await rows(page, 'one').nth(3).evaluate((el) => getComputedStyle(el).transitionProperty.includes('outline')), 'the ring is not animated').toBe(false);
    expect(await read(page, 'one'), 'nothing was chosen, nothing written').toMatchObject({ value: 'lisbon', text: 'Lisbon' });
    expect(others(await heard(page)).filter((e) => e.startsWith('change'))).toEqual([]);
    // The options change while the list is open: the active option stays where its value is still shown…
    await host(page, 'one').evaluate((el) => el.querySelector('[value="kobe"]')!.remove());
    await settle(page, 'one');
    expect((await read(page, 'one')).active).toBe('Tokyo');
    // …and is otherwise the first shown that is not disabled.
    await host(page, 'one').evaluate((el) => el.querySelector('[value="tokyo"]')!.remove());
    await settle(page, 'one');
    expect((await read(page, 'one')).active).toBe('Lisbon');
    // A custom value: typing leaves none active; Down Arrow the first, Up Arrow from none the last, Up Arrow on the first none again.
    await page.mouse.move(700, 5);
    await focusInput(page, 'custom');
    await type(page, 'o');
    expect(await read(page, 'custom')).toMatchObject({ rows: ['Kyoto', 'Lisbon', 'Nairobi', 'Tokyo', 'Toronto'], active: null });
    await page.keyboard.press('ArrowDown');
    expect((await read(page, 'custom')).active).toBe('Kyoto');
    await page.keyboard.press('ArrowUp');
    expect((await read(page, 'custom')).active, 'Enter is the text’s again').toBeNull();
    await page.keyboard.press('ArrowUp');
    expect((await read(page, 'custom')).active).toBe('Toronto');
    await page.keyboard.press('Escape');
    // Page Down and Page Up: by ten, or to the end where fewer remain; an option scrolled out of view is brought into it.
    await focusInput(page, 'many');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'many').toBe(true);
    expect((await read(page, 'many')).active).toBe('Option 1');
    await page.keyboard.press('PageDown');
    expect((await read(page, 'many')).active).toBe('Option 11');
    await page.keyboard.press('PageDown');
    await page.keyboard.press('PageDown');
    expect((await read(page, 'many')).active).toBe('Option 24');
    const [s, active] = [await box(part(page, 'many', '.scroll')), await box(row(page, 'many', 'Option 24'))];
    expect(active.y + active.height, 'scrolled into view').toBeLessThanOrEqual(s.y + s.height + 0.6);
    await page.keyboard.press('PageUp');
    expect((await read(page, 'many')).active).toBe('Option 14');
    await page.keyboard.press('PageUp');
    await page.keyboard.press('PageUp');
    expect((await read(page, 'many')).active).toBe('Option 1');
  });

  test('CMB-26, CMB-27, CMB-28, CMB-48: where the combobox filters and takes no custom value, the first match is the input’s active descendant from the first key — one Enter chooses it; where a custom value is allowed none is, and one Enter commits the text as typed', async ({ page }) => {
    await mount(page, [fx('one', {}), fx('custom', { allowCustomValue: true })], { reducedMotion: true });
    await listen(page, 'one');
    await focusInput(page, 'one');
    await type(page, 'to');
    expect(await read(page, 'one'), 'the first match, at once').toMatchObject({ rows: ['Kyoto', 'Tokyo', 'Toronto'], active: 'Kyoto', focused: true });
    await type(page, 'r');
    expect(await read(page, 'one'), 'the list changed: its first match').toMatchObject({ rows: ['Toronto'], active: 'Toronto' });
    await page.keyboard.press('Enter');
    expect(await read(page, 'one')).toMatchObject({ value: 'toronto', text: 'Toronto', open: false });
    expect(others(await heard(page))).toEqual(['toggle true', 'change toronto', 'toggle false select']);
    await listen(page, 'custom');
    await focusInput(page, 'custom');
    await type(page, 'to');
    expect(await read(page, 'custom'), 'the options are suggestions: none is active, and Enter keeps the text').toMatchObject({ rows: ['Kyoto', 'Tokyo', 'Toronto'], active: null });
    await page.keyboard.press('Enter');
    expect(await read(page, 'custom')).toMatchObject({ value: 'to', text: 'to', open: false });
    expect(others(await heard(page))).toEqual(['toggle true', 'change to', 'toggle false commit', 'action to']);
  });

  test('CMB-27: a press on an option, or Enter on the active one, sets value, emits change once with the new value, writes the option’s label with the caret at its end without emitting input, then closes the list with the reason select, so toggle follows change; the chosen option chosen again emits no change and still closes; an Enter that chooses emits no action and submits no form; setting value from the product emits nothing', async ({ page }) => {
    await mount(page, [fx('one', { value: 'tokyo' })], { reducedMotion: true });
    await inForm(page, 'one');
    await listen(page, 'one');
    await focusInput(page, 'one');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'one').toBe(true);
    await heard(page);
    await pressOn(row(page, 'one', 'Lisbon'));
    expect(await heard(page)).toEqual(['change lisbon', 'toggle false select']);
    expect(await read(page, 'one')).toMatchObject({ value: 'lisbon', inputValue: 'Lisbon', text: 'Lisbon', open: false, focused: true });
    expect(await input(page, 'one').evaluate((el) => [(el as HTMLInputElement).selectionStart, (el as HTMLInputElement).selectionEnd]), 'the caret at its end').toEqual([6, 6]);
    // Enter on the active option, found by typing.
    await selectAll(page, 'one');
    await type(page, 'nai');
    await heard(page);
    await page.keyboard.press('Enter');
    expect(await heard(page), 'no input, no action, no submission').toEqual(['change nairobi', 'toggle false select']);
    expect(await read(page, 'one')).toMatchObject({ value: 'nairobi', text: 'Nairobi' });
    // The chosen option again: no change, and the list still closes with its label written.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    expect(await heard(page)).toEqual(['toggle true', 'toggle false select']);
    expect(await read(page, 'one')).toMatchObject({ value: 'nairobi', text: 'Nairobi', open: false });
    // The product's own value: nothing is emitted.
    await set(page, 'one', { value: 'kyoto' });
    expect(await heard(page)).toEqual([]);
    expect((await read(page, 'one')).text).toBe('Kyoto');
  });

  test('CMB-28: Enter with no option active commits the text and closes an open list with the reason commit, then emits action after any change and asks the form to submit unless action was cancelled; where no custom value is allowed a text that names nothing is kept, the list is kept or opened with the empty text, and nothing more happens', async ({ page }) => {
    await mount(page, [fx('custom', { label: 'Font family', allowCustomValue: true }, [option('Inter', 'Inter'), option('Roboto Mono', 'Roboto Mono')]), fx('closed', { value: 'tokyo' })], { reducedMotion: true });
    await inForm(page, 'custom');
    await inForm(page, 'closed');
    // A custom value, the list open with suggestions and none active.
    await listen(page, 'custom');
    await focusInput(page, 'custom');
    await type(page, 'Ro');
    expect(await read(page, 'custom')).toMatchObject({ shown: true, rows: ['Roboto Mono'], active: null });
    await heard(page);
    await page.keyboard.press('Enter');
    expect(await heard(page)).toEqual(['change Ro', 'toggle false commit', 'action Ro', 'submit']);
    expect(await read(page, 'custom')).toMatchObject({ value: 'Ro', text: 'Ro', open: false });
    // The list closed (the filter left nothing): "Recursive" becomes the value as typed.
    await selectAll(page, 'custom');
    await type(page, 'Recursive');
    await settle(page, 'custom');
    await heard(page);
    await page.keyboard.press('Enter');
    expect(await heard(page)).toEqual(['change Recursive', 'action Recursive', 'submit']);
    // A cancelled action: no submission.
    await host(page, 'custom').evaluate((el) => el.addEventListener('action', (event) => event.preventDefault(), { once: true }));
    await page.keyboard.press('Enter');
    expect(await heard(page), 'nothing changed, and nothing submitted').toEqual(['action Recursive']);
    // No custom value, a text that names nothing: nothing is chosen, no action, and the list says so.
    await focusInput(page, 'closed');
    await listen(page, 'closed');
    await selectAll(page, 'closed');
    await type(page, 'zzz');
    expect(await read(page, 'closed')).toMatchObject({ shown: true, rows: [], status: ['No matches', ''] });
    await heard(page);
    await page.keyboard.press('Enter');
    expect(await heard(page)).toEqual([]);
    expect(await read(page, 'closed')).toMatchObject({ value: 'tokyo', text: 'zzz', open: true });
    // …closed, the same Enter opens it.
    await page.keyboard.press('Escape');
    await heard(page);
    await page.keyboard.press('Enter');
    expect(await heard(page)).toEqual(['toggle true']);
    expect(await read(page, 'closed')).toMatchObject({ value: 'tokyo', text: 'zzz', shown: true, status: ['No matches', ''] });
    // A whole label typed and the list closed: Enter chooses its option, then acts.
    await page.keyboard.press('Escape');
    await selectAll(page, 'closed');
    await type(page, 'kyoto');
    await page.keyboard.press('Escape');
    await heard(page);
    await page.keyboard.press('Enter');
    expect(await heard(page)).toEqual(['change kyoto', 'action kyoto', 'submit']);
    expect(await read(page, 'closed')).toMatchObject({ value: 'kyoto', text: 'Kyoto' });
  });

  test('CMB-29: when focus leaves, the text is resolved — an empty text empties the value, the whole label of an option that is not disabled chooses it whatever the case and the spaces around it, any other text becomes the value where a custom value is allowed and is otherwise given up — change is emitted once while the value differs, and an open list closes with the reason tab or focus-out; the active option is never chosen', async ({ page }) => {
    await mount(page, [fx('one', { value: 'tokyo' }, [...CITIES, option('Osaka', 'osaka', { disabled: true })]), fx('custom', { value: 'Inter', allowCustomValue: true, label: 'Font family' }, [option('Inter', 'Inter'), option('Roboto Mono', 'roboto-mono')]), fx('after', {})], { reducedMotion: true });
    await listen(page, 'one');
    const retype = async (id: string, text: string) => {
      await focusInput(page, id);
      await selectAll(page, id);
      if (text) await type(page, text);
      else await page.keyboard.press('Backspace');
      await settle(page, id);
      await heard(page);
    };
    // A text that names nothing: given up, the committed text written back, no change. Tab says tab.
    await retype('one', 'kyo');
    expect((await read(page, 'one')).active, 'Kyoto is active, by typing').toBe('Kyoto');
    await tab(page);
    await settle(page, 'one');
    expect(await heard(page)).toEqual(['toggle false tab']);
    expect(await read(page, 'one'), 'the active option was not chosen').toMatchObject({ value: 'tokyo', text: 'Tokyo', inputValue: 'Tokyo', open: false });
    // A whole label, in another case and with spaces around it: its option.
    await retype('one', '  LISBON ');
    await tab(page);
    await settle(page, 'one');
    expect(await heard(page)).toEqual(['change lisbon', 'toggle false tab']);
    expect(await read(page, 'one')).toMatchObject({ value: 'lisbon', text: 'Lisbon' });
    // A disabled option's label: not chosen.
    await retype('one', 'Osaka');
    await tab(page);
    await settle(page, 'one');
    expect(await read(page, 'one')).toMatchObject({ value: 'lisbon', text: 'Lisbon' });
    expect(others(await heard(page)).filter((e) => e.startsWith('change'))).toEqual([]);
    // An empty text: the value is empty.
    await retype('one', '');
    await tab(page);
    await settle(page, 'one');
    expect((await heard(page)).filter((e) => e.startsWith('change'))).toEqual(['change ']);
    expect(await read(page, 'one')).toMatchObject({ value: '', text: '' });
    // Focus moved by the product, or by a press elsewhere: focus-out.
    await retype('one', 'nai');
    await focusInput(page, 'after');
    await settle(page, 'one');
    expect(await heard(page)).toEqual(['toggle false focus-out']);
    expect(await read(page, 'one')).toMatchObject({ value: '', text: '' });
    // Leaving without having edited changes nothing.
    await focusInput(page, 'one');
    await tab(page);
    expect(await heard(page)).toEqual([]);
    // A custom value: any other text becomes the value as it was typed; a label still chooses its option.
    await listen(page, 'custom');
    await retype('custom', 'Recursive ');
    await tab(page);
    await settle(page, 'custom');
    expect(await heard(page)).toEqual(['change Recursive ']);
    expect(await read(page, 'custom')).toMatchObject({ value: 'Recursive ', text: 'Recursive ' });
    await retype('custom', 'roboto mono');
    await tab(page);
    await settle(page, 'custom');
    expect((await heard(page)).filter((e) => e.startsWith('change'))).toEqual(['change roboto-mono']);
    expect(await read(page, 'custom')).toMatchObject({ value: 'roboto-mono', text: 'Roboto Mono' });
  });

  test('CMB-29: the reason tab belongs to the focus move of the Tab press itself — a focus move that follows it, by the product or after a Tab that moved nothing, is focus-out, however late the page runs its timers', async ({ page }) => {
    await mount(page, [fx('one', { value: 'tokyo' }), fx('clear', { value: 'tokyo', clearable: true, clearLabel: 'Clear' }), fx('after', {})], { reducedMotion: true });
    await listen(page, 'one');
    await host(page, 'clear').evaluate((el) => el.addEventListener('toggle', (event) => (window as unknown as { __events: string[] }).__events.push(`clear: toggle ${(event as CustomEvent<{ open: boolean; reason?: string }>).detail.open} ${(event as CustomEvent<{ reason?: string }>).detail.reason ?? ''}`.trim())));
    // The page's timers stand still for the whole test: a Tab's mark that only a timer took back would still be there
    // at every later focus move, as it was when the browser ran other tasks first (a run of the test page in Chromium).
    await holdClock(page);
    const typed = async (id: string, text: string) => {
      await focusInput(page, id);
      await selectAll(page, id);
      await type(page, text);
      await settle(page, id);
      expect(others(await heard(page)), `${id}'s list opens`).toEqual([id === 'one' ? 'toggle true' : 'clear: toggle true']);
    };
    // Tab out of the field, then the product moves focus out of it again: tab, then focus-out.
    await typed('one', 'kyo');
    await tab(page);
    await settle(page, 'one');
    expect(others(await heard(page))).toEqual(['toggle false tab']);
    await typed('one', 'nai');
    await focusInput(page, 'after');
    await settle(page, 'one');
    expect(others(await heard(page)), 'the earlier Tab is over').toEqual(['toggle false focus-out']);
    // Tab to the clear button keeps focus in the field and the list open; then the product moves focus: focus-out.
    await typed('clear', 'lis');
    await tab(page);
    await settle(page, 'clear');
    expect(await host(page, 'clear').evaluate((el) => !!el.shadowRoot!.activeElement?.closest('.clear-box')), 'the clear button has focus').toBe(true);
    expect(others(await heard(page)), 'focus is still in the field').toEqual([]);
    await focusInput(page, 'after');
    await settle(page, 'clear');
    expect(others(await heard(page))).toEqual(['clear: toggle false focus-out']);
    // From the clear button, Tab leaves the field: tab.
    await typed('clear', 'tor');
    await tab(page);
    await tab(page);
    await settle(page, 'clear');
    expect(others(await heard(page))).toEqual(['clear: toggle false tab']);
    // A Tab that the product cancelled moved nothing; the product moves focus after it: focus-out.
    await page.evaluate(() => {
      const cancel = (event: KeyboardEvent) => {
        if (event.key !== 'Tab') return;
        event.preventDefault();
        document.removeEventListener('keydown', cancel);
      };
      document.addEventListener('keydown', cancel);
    });
    await typed('one', 'ky');
    await tab(page);
    await settle(page, 'one');
    expect(await read(page, 'one'), 'the cancelled Tab left focus and the list as they were').toMatchObject({ focused: true, open: true });
    expect(others(await heard(page))).toEqual([]);
    await focusInput(page, 'after');
    await settle(page, 'one');
    expect(others(await heard(page))).toEqual(['toggle false focus-out']);
  });

  test('CMB-30: Escape with the list open closes it, keeps the text and goes no further; with the list closed and the text edited it writes the committed value’s text back, emits input once and stops; otherwise it passes on, and never empties a value; a press outside closes with the reason outside and resolves the text; a list with nothing left to show closes with the reason empty and opens again when there is', async ({ page }) => {
    await mount(page, [fx('one', { value: 'tokyo' }), fx('custom', { allowCustomValue: true }), fx('remote', { filter: 'none', noChevron: true }, [option('Aiko Tanaka', 'aiko')])], { reducedMotion: true });
    await page.evaluate(() => {
      (window as unknown as { __escapes: number }).__escapes = 0;
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') (window as unknown as { __escapes: number }).__escapes += 1;
      });
    });
    const escapes = () => page.evaluate(() => (window as unknown as { __escapes: number }).__escapes);
    await listen(page, 'one');
    await focusInput(page, 'one');
    await selectAll(page, 'one');
    await type(page, 'ky');
    await heard(page);
    // Open: closed, the text kept, the key stopped.
    await page.keyboard.press('Escape');
    expect(await heard(page)).toEqual(['toggle false escape']);
    expect(await read(page, 'one')).toMatchObject({ open: false, text: 'ky', value: 'tokyo' });
    expect(await escapes()).toBe(0);
    // Closed, the text edited: the committed value's text, one input, the key stopped.
    await page.keyboard.press('Escape');
    expect(await heard(page)).toEqual(['input Tokyo']);
    expect(await read(page, 'one')).toMatchObject({ text: 'Tokyo', value: 'tokyo' });
    expect(await escapes()).toBe(0);
    // Closed, the text the committed one: not the combobox's key.
    await page.keyboard.press('Escape');
    expect(await heard(page)).toEqual([]);
    expect(await read(page, 'one'), 'never clears').toMatchObject({ text: 'Tokyo', value: 'tokyo' });
    expect(await escapes()).toBe(1);
    // A press outside the list and the container: outside; it takes focus, so the text is resolved.
    await selectAll(page, 'one');
    await type(page, 'lisbon');
    await heard(page);
    await page.mouse.click(700, 500);
    await settle(page, 'one');
    expect(await heard(page)).toEqual(['toggle false outside', 'change lisbon']);
    expect(await read(page, 'one')).toMatchObject({ value: 'lisbon', text: 'Lisbon', open: false });
    // A custom value: the filter leaves no option, so nothing is left to show — empty; it opens again when there is.
    await listen(page, 'custom');
    await focusInput(page, 'custom');
    await type(page, 'to');
    expect(others(await heard(page))).toEqual(['toggle true']);
    await type(page, 'x');
    await settle(page, 'custom');
    expect(others(await heard(page))).toEqual(['toggle false empty']);
    expect(await read(page, 'custom')).toMatchObject({ open: false, text: 'tox' });
    await page.keyboard.press('Backspace');
    await settle(page, 'custom');
    expect(others(await heard(page))).toEqual(['toggle true']);
    await page.keyboard.press('Escape');
    // The product empties the options and the status: empty.
    await focusInput(page, 'remote');
    await listen(page, 'remote');
    await set(page, 'remote', { allowCustomValue: true });
    await type(page, 'ai');
    expect(others(await heard(page))).toEqual(['toggle true']);
    await host(page, 'remote').evaluate((el) => el.replaceChildren());
    await settle(page, 'remote');
    await expect.poll(() => heard(page)).toEqual(['toggle false empty']);
    expect(await read(page, 'remote')).toMatchObject({ open: false, text: 'ai' });
  });

  test('CMB-31: the product’s value shows its text and moves the fill and the check without change, input or toggle; its inputValue is shown and filters an open list without input and without changing value; its open shows and removes the list without toggle; options that change touch neither value nor a text being edited; a combobox that becomes disabled or read-only while open closes without toggle', async ({ page }) => {
    await mount(page, [fx('one', { value: 'tokyo', open: true, inline: false }), fx('two', { value: 'tokyo' })], { reducedMotion: true });
    await listen(page, 'one');
    await shownList(page, 'one').toBe(true);
    expect(await read(page, 'one')).toMatchObject({ selected: ['Tokyo'], text: 'Tokyo' });
    await set(page, 'one', { value: 'lisbon' });
    expect(await read(page, 'one')).toMatchObject({ selected: ['Lisbon'], text: 'Lisbon', inputValue: 'Lisbon', open: true });
    await expect(row(page, 'one', 'Lisbon').locator('.check')).toBeVisible();
    await set(page, 'one', { inputValue: 'to' });
    expect(await read(page, 'one'), 'filtered as by typed text').toMatchObject({ text: 'to', rows: ['Kyoto', 'Tokyo', 'Toronto'], value: 'lisbon' });
    await set(page, 'one', { open: false });
    await closedList(page, 'one');
    await set(page, 'one', { open: true });
    await shownList(page, 'one').toBe(true);
    expect(await heard(page), 'nothing was emitted').toEqual([]);
    // Options that arrive while a person types are an answer to the typing: the value and the text stay.
    await focusInput(page, 'two');
    await listen(page, 'two');
    await selectAll(page, 'two');
    await type(page, 'os');
    await heard(page);
    await host(page, 'two').evaluate((el) => el.insertAdjacentHTML('beforeend', '<tanrei-option value="osaka">Osaka</tanrei-option>'));
    await settle(page, 'two');
    expect(await read(page, 'two')).toMatchObject({ value: 'tokyo', text: 'os', rows: ['Osaka'], active: 'Osaka' });
    await host(page, 'two').evaluate((el) => el.querySelector('[value="tokyo"]')!.remove());
    await settle(page, 'two');
    expect(await read(page, 'two'), 'the chosen option is gone: the value is kept').toMatchObject({ value: 'tokyo', text: 'os' });
    expect(await heard(page)).toEqual([]);
    // Disabled, or read-only, while open: closed, and nothing said.
    await set(page, 'two', { disabled: true });
    await closedList(page, 'two');
    await set(page, 'two', { disabled: false, open: true });
    await shownList(page, 'two').toBe(true);
    await set(page, 'two', { readOnly: true });
    await closedList(page, 'two');
    expect(await heard(page)).toEqual([]);
  });

  test('CMB-32: with a status the list draws a status row after the last option, inset and padded as an option, taking no input and never active — statusText in status.typescale and status.color, in status.error.color while the source failed, and while loading one small loading indicator named by statusText in the text’s place, the row one line tall; the options left in the list stay usable; a text that matches nothing draws emptyText in its place, and an empty emptyText draws no row and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [...spec.fixtures.filter((f) => ['open-loading', 'open-status', 'open-status-error', 'open-filtered-none', 'stacked-open'].includes(f.id)), fx('quiet', { emptyText: '' })], { reducedMotion: true });
    const status = (id: string) => part(page, id, '.status');
    // Idle: the text, after the last option.
    let row_ = status('open-status');
    await expect(row_.locator('.said').first()).toHaveText('2 of 48 people shown. Keep typing to narrow.');
    expect((await box(row_)).y, 'after the last option').toBeGreaterThanOrEqual((await box(rows(page, 'open-status').last())).y + (await box(rows(page, 'open-status').last())).height - 0.6);
    near(await px(row_, 'padding-left'), await token(page, 'option-padding-inline-regular'), 'option.padding-inline');
    near(await px(row_, 'padding-top'), await token(page, 'option-padding-block-regular'), 'option.padding-block');
    near(await px(row_, 'font-size'), await token(page, 'status-typescale-font-size'), 'status.typescale');
    expect(await css(row_, 'color')).toBe(await color(page, 'status-color'));
    expect(await row_.evaluate((el) => [el.getAttribute('role'), el.tabIndex, el.closest('[role="listbox"]')]), 'not an option, and not in the list box').toEqual([null, -1, null]);
    expect(await row_.locator('.said').first().evaluate((el) => el.scrollWidth <= el.clientWidth + 1), 'it wraps').toBe(true);
    // Error: the same row in the error color.
    expect(await css(status('open-status-error'), 'color')).toBe(await color(page, 'status-error-color'));
    await expect(status('open-status-error').locator('[role="alert"]')).toHaveText('People could not be loaded. Check your connection.');
    // Loading: the indicator, named, at the row's start, and no text; the row as tall as one line of text.
    row_ = status('open-loading');
    const spinner = row_.locator('tanrei-loading-indicator');
    expect(await spinner.evaluate((el) => [el.getAttribute('size'), el.getAttribute('label')])).toEqual(['small', 'Loading people']);
    expect(await row_.locator('.said').allTextContents()).toEqual(['', '']);
    near((await box(spinner)).x - (await box(row_)).x, await token(page, 'option-padding-inline-regular'), 'at the row’s start', 1);
    await set(page, 'open-status', { statusText: 'x' });
    near((await box(row_)).height, (await box(status('open-status'))).height, 'one line of text tall');
    // The option left in the list while loading is drawn and usable.
    await set(page, 'open-loading', { inline: false, open: false });
    await focusInput(page, 'open-loading');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'open-loading').toBe(true);
    expect((await read(page, 'open-loading')).status, 'still loading').toEqual(['', '']);
    await pressOn(row(page, 'open-loading', 'Aiko Tanaka'));
    expect((await read(page, 'open-loading')).value).toBe('aiko');
    // The empty text, in the status row's place and style.
    row_ = status('open-filtered-none');
    await expect(row_.locator('[role="status"]')).toHaveText('No matches');
    expect(await css(row_, 'color')).toBe(await color(page, 'status-color'));
    await expect(rows(page, 'open-filtered-none')).toHaveCount(0);
    // No status: no row, and no room.
    expect((await box(status('stacked-open'))).height).toBe(0);
    // A press on the row is no input; an arrow key never makes it active.
    await set(page, 'open-status', { inline: false, open: false });
    await focusInput(page, 'open-status');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'open-status').toBe(true);
    await page.keyboard.press('End');
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown');
    expect((await read(page, 'open-status')).active).toBe('Bao Nguyen');
    await pressOn(status('open-status'));
    expect(await read(page, 'open-status')).toMatchObject({ open: true, value: '' });
    // An empty emptyText: no row — the list has nothing to show — and a report.
    await focusInput(page, 'quiet');
    await type(page, 'zz');
    await settle(page, 'quiet');
    expect(await read(page, 'quiet')).toMatchObject({ shown: false, status: ['', ''] });
    await expect.poll(() => seen.some((w) => w.includes('CMB-32'))).toBe(true);
  });

  test('CMB-33: the status row’s live regions are there from the moment the list opens: while idle statusText, or the empty text, is in the polite one (role status); while the source failed it is in the assertive one (role alert); while loading both are empty and the list box is busy; the combobox composes no text of its own', async ({ page }) => {
    await mount(page, [fx('one', { filter: 'none', noChevron: true, open: true, inline: false, inputValue: 'a' }, [option('Aiko Tanaka', 'aiko')])], { reducedMotion: true });
    await shownList(page, 'one').toBe(true);
    const regions = () =>
      part(page, 'one', '.status').evaluate((el) => ({
        polite: el.querySelector('[role="status"]')!.textContent,
        assertive: el.querySelector('[role="alert"]')!.textContent,
        busy: (el.getRootNode() as ShadowRoot).querySelector('[role="listbox"]')!.getAttribute('aria-busy'),
      }));
    // Present, and empty, before there is anything to say: a text that arrives is a change, and is read.
    expect(await regions()).toEqual({ polite: '', assertive: '', busy: null });
    const polite = await part(page, 'one', '.status [role="status"]').elementHandle();
    await set(page, 'one', { status: 'loading', statusText: 'Loading people' });
    expect(await regions(), 'loading announces nothing, and the list is busy').toEqual({ polite: '', assertive: '', busy: 'true' });
    await set(page, 'one', { status: 'idle', statusText: '1 of 48 people shown' });
    expect(await regions()).toEqual({ polite: '1 of 48 people shown', assertive: '', busy: null });
    expect(await part(page, 'one', '.status [role="status"]').evaluate((el, before) => el === before, polite), 'the same region: its text changed').toBe(true);
    await set(page, 'one', { status: 'error', statusText: 'People could not be loaded.' });
    expect(await regions()).toEqual({ polite: '', assertive: 'People could not be loaded.', busy: null });
    // The empty text is said the same way; the number of options is the list's to expose, not the row's.
    await host(page, 'one').evaluate((el) => el.replaceChildren());
    await set(page, 'one', { status: 'idle', statusText: '' });
    expect(await regions()).toEqual({ polite: 'No matches', assertive: '', busy: null });
  });

  test('CMB-34: an option is one row — option.padding-inline from each edge, the leading icon column as CMB-67 says, the label with the supporting text below it, and the check’s box at the end, option.gap apart — at least option.height and the minimum target tall, wrapping and growing rather than cutting; the whole row is its target', async ({ page }) => {
    await mountSpec(page, ['stacked-open', 'open-icons', 'open-supporting-text', 'open-long-options'], { reducedMotion: true });
    const plain = row(page, 'stacked-open', 'Kyoto');
    const b = await box(plain);
    const [label, markBox] = [await box(plain.locator('.option-label')), await box(plain.locator('.row-column.mark'))];
    near(label.x - b.x, await token(page, 'option-padding-inline-regular'), 'padding-inline before the label');
    near(b.x + b.width - (markBox.x + markBox.width), await token(page, 'option-padding-inline-regular'), 'padding-inline after the box');
    near(markBox.width, await token(page, 'option-mark-size-regular'), 'the check’s box');
    near(markBox.height, await token(page, 'option-mark-size-regular'), 'the check’s box');
    expect(b.height).toBeGreaterThanOrEqual((await token(page, 'option-height-regular')) - 0.6);
    expect(b.height).toBeGreaterThanOrEqual((await resolveToken(page, '--tanrei-sys-target-pointer')) - 0.6);
    near(await px(plain, 'padding-top'), await token(page, 'option-padding-block-regular'), 'padding-block');
    near(await px(plain.locator('.option-label'), 'font-size'), await token(page, 'option-label-typescale-font-size'), 'the label’s text style');
    // The icon column: kept in every row of a list where any option has a glyph, so that labels align.
    const [withIcon, without] = [row(page, 'open-icons', 'Bus'), row(page, 'open-icons', 'On foot')];
    const icon = await box(withIcon.locator('.option-icon'));
    near(icon.width, await token(page, 'option-leading-icon-size-regular'), 'the glyph');
    near((await box(withIcon.locator('.option-label'))).x - (icon.x + icon.width), await token(page, 'option-gap-regular'), 'option.gap');
    near((await box(without.locator('.option-label'))).x, (await box(withIcon.locator('.option-label'))).x, 'the labels align');
    await expect(row(page, 'stacked-open', 'Kyoto').locator('.row-column.leading')).toHaveCount(0);
    // The supporting text: below the label, in its own text style.
    const two = rows(page, 'open-supporting-text').first();
    const [l, s] = [await box(two.locator('.option-label')), await box(two.locator('.option-supporting'))];
    expect(s.y).toBeGreaterThanOrEqual(l.y + l.height - 0.6);
    near(s.x, l.x, 'under the label');
    near(await px(two.locator('.option-supporting'), 'font-size'), await token(page, 'option-supporting-text-typescale-font-size'), 'its text style');
    // Wrapping: the row grows, nothing is cut.
    const long = rows(page, 'open-long-options').first();
    expect(await long.evaluate((el) => [...el.querySelectorAll<HTMLElement>('.option-label, .option-supporting')].every((text) => text.scrollWidth <= text.clientWidth + 1 && getComputedStyle(text).textOverflow !== 'ellipsis' && getComputedStyle(text).whiteSpace !== 'nowrap'))).toBe(true);
    expect((await box(long)).height).toBeGreaterThan(2 * b.height);
    // The whole row is the target: a press on its padding chooses.
    await set(page, 'stacked-open', { inline: false, open: false });
    await focusInput(page, 'stacked-open');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'stacked-open').toBe(true);
    const target = await box(row(page, 'stacked-open', 'Lisbon'));
    await page.mouse.click(target.x + 3, target.y + 3);
    expect((await read(page, 'stacked-open')).value).toBe('lisbon');
  });

  test('CMB-35: an option is drawn from the condition it is in — selected-option for the chosen one, option for every other — and the state it is in, pressed over focused over hovered: its row’s fill within option.shape, its label, supporting text and leading icon in that condition’s colors, the same under every variant; the colors change over motion.state-*', async ({ page }) => {
    await mount(page, [fx('one', { value: 'tokyo', open: true }), fx('filled', { variant: 'filled', value: 'tokyo', open: true })]);
    const [plain, chosen] = [row(page, 'one', 'Kyoto'), row(page, 'one', 'Tokyo')];
    expect(await css(plain, 'background-color')).toBe(await color(page, 'stacked-option-container-color'));
    expect(await css(plain.locator('.option-label'), 'color')).toBe(await color(page, 'stacked-option-label-color'));
    expect(await css(chosen, 'background-color')).toBe(await color(page, 'stacked-selected-option-container-color'));
    expect(await css(chosen.locator('.option-label'), 'color')).toBe(await color(page, 'stacked-selected-option-label-color'));
    near(await px(plain, 'border-top-left-radius'), await token(page, 'option-shape'), 'option.shape');
    expect(await plain.getAttribute('data-tanrei-shape'), 'eased by the corner smoothing').not.toBeNull();
    near((await px(plain, 'transition-duration')) * 1000, await resolveToken(page, ROW('motion-state-duration'), 'duration'), 'motion.state-duration', 1);
    // Hovered, then focused (the keyboard's active option) over hovered.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await plain.hover();
    await expect.poll(() => css(plain, 'background-color')).toBe(await color(page, 'stacked-hovered-option-container-color'));
    await chosen.hover();
    await expect.poll(() => css(chosen, 'background-color')).toBe(await color(page, 'stacked-hovered-selected-option-container-color'));
    await set(page, 'one', { inline: false, open: false });
    await focusInput(page, 'one');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'one').toBe(true);
    await page.keyboard.press('ArrowUp');
    const focused = row(page, 'one', 'Nairobi');
    await focused.hover();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowDown');
    expect(await css(focused, 'background-color'), 'focused over hovered').toBe(await color(page, 'stacked-focused-option-container-color'));
    expect(await css(focused.locator('.option-label'), 'color')).toBe(await color(page, 'stacked-focused-option-label-color'));
    // The option parts hold the same values under every variant, and a filled combobox's list is drawn alike.
    const names = declared(fs.readFileSync(path.join(pkg, 'dist/tokens.css'), 'utf8'), 'combobox').filter((name) => /-stacked-(?:[a-z]+-)?(?:selected-)?option-/.test(name));
    expect(names.length).toBeGreaterThan(40);
    const values = await computed(page, names.flatMap((name) => [name, name.replace('-stacked-', '-filled-'), name.replace('-stacked-', '-outlined-')]));
    expect(names.filter((name) => values[name] !== values[name.replace('-stacked-', '-filled-')] || values[name] !== values[name.replace('-stacked-', '-outlined-')])).toEqual([]);
    expect(await css(row(page, 'filled', 'Tokyo'), 'background-color')).toBe(await color(page, 'filled-selected-option-container-color'));
  });

  test('CMB-36: the chosen option’s row is filled with the selected-option container color and draws the icon set’s check centred in the box at its end, in the mark color, in the selected family and fill; no other row draws anything there; the check is never mirrored, is always drawn with the fill, and stays while the list is filtered', async ({ page }) => {
    await mountSpec(page, ['stacked-open', 'open-filtered', 'open-rtl']);
    const id = 'stacked-open';
    const chosen = row(page, id, 'Tokyo');
    const check = chosen.locator('.check');
    await expect(check).toBeVisible();
    await expect(check).toHaveText('check');
    expect(await css(check, 'color')).toBe(await color(page, 'stacked-selected-option-mark-color'));
    expect(await css(check, 'font-family')).toContain((await css(page.locator('html'), '--tanrei-sys-icon-family-selected')).replaceAll('"', '').trim());
    const [c, m] = [await box(check), await box(chosen.locator('.row-column.mark'))];
    near(c.x + c.width / 2, m.x + m.width / 2, 'centred in its box');
    near(c.y + c.height / 2, m.y + m.height / 2, 'centred in its box');
    expect(await chosen.locator('.row-column.mark').getAttribute('aria-hidden')).toBe('true');
    // Every other row: the box is kept, and nothing is drawn in it.
    for (const label of ['Kyoto', 'Lisbon']) {
      await expect(row(page, id, label).locator('.check'), label).toBeHidden();
      near((await box(row(page, id, label).locator('.row-column.mark'))).width, m.width, `${label}: the box is kept`);
    }
    expect(await read(page, id)).toMatchObject({ selected: ['Tokyo'] });
    // Filtered: the chosen option is still marked among the options shown.
    expect(await read(page, 'open-filtered')).toMatchObject({ rows: ['Kyoto', 'Tokyo', 'Toronto'], selected: ['Tokyo'] });
    await expect(row(page, 'open-filtered', 'Tokyo').locator('.check')).toBeVisible();
    expect(await css(row(page, 'open-filtered', 'Tokyo'), 'background-color')).toBe(await color(page, 'stacked-selected-option-container-color'));
    // Right to left: at the left of the row, and not mirrored.
    const rtl = part(page, 'open-rtl', '.row.selected');
    expect((await box(rtl.locator('.check'))).x).toBeLessThan((await box(rtl.locator('.option-label'))).x);
    expect(await rtl.locator('.check').evaluate((el) => [getComputedStyle(el).transform, getComputedStyle(el).scale, el.hasAttribute('data-tanrei-mirrored')])).toEqual(['none', 'none', false]);
  });

  test('CMB-37: an option’s leadingIcon is drawn at option.leading-icon.size by the icon helper, in the family and fill of the option’s condition — selected for the chosen option — in the leading-icon color of its condition, hidden from assistive technology; an empty name draws nothing', async ({ page }) => {
    await mountSpec(page, ['open-icons']);
    const id = 'open-icons';
    const [bus, train, foot] = [row(page, id, 'Bus').locator('.option-icon'), row(page, id, 'Train').locator('.option-icon'), row(page, id, 'On foot').locator('.option-icon')];
    await expect(bus).toHaveText('directions_bus');
    near((await box(bus)).width, await token(page, 'option-leading-icon-size-regular'), 'option.leading-icon.size');
    expect(await css(bus, 'color')).toBe(await color(page, 'stacked-option-leading-icon-color'));
    expect(await css(train, 'color')).toBe(await color(page, 'stacked-selected-option-leading-icon-color'));
    const family = async (name: string) => (await css(page.locator('html'), `--tanrei-sys-icon-family-${name}`)).replaceAll('"', '').trim();
    expect(await css(bus, 'font-family')).toContain(await family('unselected'));
    expect(await css(train, 'font-family')).toContain(await family('selected'));
    expect(await css(train, 'font-variation-settings')).toContain((await css(page.locator('html'), '--tanrei-sys-icon-fill-selected')).trim());
    expect(await row(page, id, 'Bus').locator('.row-column.leading').getAttribute('aria-hidden')).toBe('true');
    expect((await foot.textContent())?.trim(), 'an empty name draws nothing').toBe('');
  });

  test('CMB-38: under filter contains with a text typed, the first run of each shown label that matched is marked as the search marks a match — in option.match.color, heavier by option.match.emphasis, over option.match.container.color, and in the chosen option the selected pair — wrapping with the label as one text; the label’s accessible name is the whole label; under filter none nothing is marked', async ({ page }) => {
    await mount(page, [
      ...spec.fixtures.filter((f) => ['open-filtered', 'open-filtered-ja', 'stacked-open'].includes(f.id)),
      fx('none', { filter: 'none', inputValue: 'to', open: true }),
      fx('marks', { inputValue: 'ogotaa', open: true }, [option('Bogotáa', 'b')]),
      fx('chosen', { value: 'tokyo', inputValue: 'to', open: true }),
    ]);
    const id = 'open-filtered';
    const marked = (fixture: string, label: string) => row(page, fixture, label).locator('.option-label').evaluate((el) => [...el.childNodes].map((node) => (node.nodeName === 'MARK' ? `[${node.textContent}]` : node.nodeType === Node.TEXT_NODE ? node.textContent : '')).join(''));
    expect(await marked(id, 'Toronto'), 'the first run only').toBe('[To]ronto');
    expect(await marked(id, 'Kyoto')).toBe('Kyo[to]');
    expect(await marked(id, 'Tokyo')).toBe('[To]kyo');
    expect(await marked('open-filtered-ja', '京都')).toBe('[京]都');
    expect(await marked('marks', 'Bogotáa'), 'the letters of the label, with their marks').toBe('B[ogotáa]');
    const mark = row(page, id, 'Toronto').locator('mark');
    const label = row(page, id, 'Toronto').locator('.option-label');
    expect(Number(await css(mark, 'font-weight'))).toBe(Number(await css(label, 'font-weight')) + Number(await css(page.locator('html'), T('option-match-emphasis'))));
    expect(Number(await css(page.locator('html'), T('option-match-emphasis')))).toBeGreaterThan(0);
    const own = (name: string) => resolveColor(page, `--tanrei-comp-combobox-option-match-${name}`);
    expect(await css(mark, 'color')).toBe(await own('color'));
    expect(await css(mark, 'background-color')).toBe(await own('container-color'));
    expect([await css(mark, 'border-radius'), await css(mark, 'padding')], 'square and unpadded: the fill moves no text').toEqual(['0px', '0px']);
    expect(await css(mark, 'display'), 'one text with the label').toBe('inline');
    // In the chosen option, whose own fill is the quiet one, the selected pair.
    const chosen = row(page, 'chosen', 'Tokyo');
    await expect(chosen).toHaveClass(/selected/);
    expect(await css(chosen.locator('mark'), 'color')).toBe(await own('selected-color'));
    expect(await css(chosen.locator('mark'), 'background-color')).toBe(await own('selected-container-color'));
    // One text for assistive technology: the option is named by the whole label.
    expect(await row(page, id, 'Toronto').evaluate((el) => (el.getRootNode() as ShadowRoot).getElementById(el.getAttribute('aria-labelledby')!)!.textContent)).toBe('Toronto');
    // Nothing typed, or the product filters: nothing is marked.
    await expect(part(page, 'stacked-open', 'mark')).toHaveCount(0);
    await expect(part(page, 'none', 'mark')).toHaveCount(0);
    expect((await read(page, 'none')).rows).toEqual(ALL);
  });

  test('CMB-39: a disabled option is not chosen by a press, by Enter or by its label typed in full, and leaves the list open when it is pressed or Enter is pressed on it; it is exposed as disabled and drawn from the disabled tokens of its condition; a disabled option whose value is the combobox’s is still the chosen one, with the fill and the check from the disabled tokens', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => f.id === 'open-disabled-chosen'), fx('one', {}, [option('Kyoto', 'kyoto'), option('Osaka', 'osaka', { disabled: true })]), fx('after', {})], { reducedMotion: true });
    await listen(page, 'one');
    await focusInput(page, 'one');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'one').toBe(true);
    const osaka = row(page, 'one', 'Osaka');
    expect(await osaka.getAttribute('aria-disabled')).toBe('true');
    await pressOn(osaka);
    expect(await read(page, 'one'), 'pressed').toMatchObject({ value: '', open: true });
    await page.keyboard.press('ArrowDown');
    expect((await read(page, 'one')).active).toBe('Osaka');
    await page.keyboard.press('Enter');
    expect(await read(page, 'one'), 'Enter').toMatchObject({ value: '', open: true });
    expect(await osaka.getAttribute('data-pressed'), 'no press answer').toBeNull();
    expect(await heard(page)).toEqual(['toggle true']);
    // Drawn from the disabled tokens — read while the list is shown: a closed list draws no row.
    expect(await css(osaka.locator('.option-label'), 'color')).toBe(await color(page, 'stacked-disabled-option-label-color'));
    near(Number(await css(osaka, 'opacity')), Number(await css(page.locator('html'), ROW('disabled-opacity'))), 'the disabled opacity', 0.01);
    await type(page, 'osaka');
    await page.keyboard.press('Enter');
    expect(await read(page, 'one'), 'its label typed in full, and Enter').toMatchObject({ value: '', text: 'osaka', open: true });
    await tab(page);
    await settle(page, 'one');
    expect(await read(page, 'one'), 'and leaving').toMatchObject({ value: '', text: '' });
    // Chosen and disabled: the input shows its label, the row its fill and check, from the disabled tokens.
    const id = 'open-disabled-chosen';
    expect(await read(page, id)).toMatchObject({ text: 'sys.color.secondary', selected: ['sys.color.secondary'] });
    const chosen = part(page, id, '.row.selected');
    expect(await chosen.getAttribute('aria-disabled')).toBe('true');
    expect(await css(chosen, 'background-color')).toBe(await color(page, 'stacked-disabled-selected-option-container-color'));
    expect(await css(chosen.locator('.check'), 'color')).toBe(await color(page, 'stacked-disabled-selected-option-mark-color'));
    await expect(chosen.locator('.check')).toBeVisible();
  });

  test('CMB-40: a pressed option shows the pressed state without delay and keeps it for at least press-hold, even when the press ends sooner — by pointer and by Enter', async ({ page }) => {
    await mount(page, [fx('one', { value: 'lisbon' })], { reducedMotion: false });
    // A long hold, so that the state is still there to be read on a busy machine.
    // …and a closing motion longer than the hold: the rows are drawn while the list is shown, so the pressed row is
    // there to be read for as long as the list fades out.
    await override(page, { '--tanrei-sys-motion-duration-press-hold': '800ms', [T('motion-close-duration')]: '2400ms' });
    const nairobi = row(page, 'one', 'Nairobi');
    for (const by of ['pointer', 'key'] as const) {
      await focusInput(page, 'one');
      await page.keyboard.press('ArrowDown');
      await shownList(page, 'one').toBe(true);
      // Grown in (a list closed as it opens has nothing to fade, and is gone at once); this opening's row is watched.
      await part(page, 'one', '.motion').evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished.catch(() => undefined))));
      await watchPress(nairobi);
      if (by === 'pointer') await pressOn(nairobi);
      else {
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
      }
      // Set in the turn of the event (the press has ended already), and there for press-hold from that event on —
      // counted from the event, not from when an observer hears of it: Enter chooses and closes before it returns.
      expect((await expectPressShownAndHeld(page, 800, by)).feedback, by).toBe('overlay');
      await closedList(page, 'one');
      await set(page, 'one', { value: 'lisbon' });
    }
  });

  test('CMB-41: a pressed option answers as sys.behavior.pressed-feedback names — overlay, ripple (from the point of contact, from the centre for the keyboard), dim or none — with the ripple growing over motion.feedback-duration and appearing whole where motion is reduced', async ({ page }) => {
    for (const feedback of ['overlay', 'ripple', 'dim', 'none'] as const) {
      await mount(page, [fx('one', { value: 'lisbon', open: true })], { reducedMotion: true });
      await override(page, { '--tanrei-sys-behavior-pressed-feedback': feedback, '--tanrei-sys-motion-duration-press-hold': '400ms' });
      const nairobi = row(page, 'one', 'Nairobi');
      const b = await box(nairobi);
      await page.mouse.move(b.x + 30, b.y + b.height / 2);
      const hovered = await css(nairobi, 'background-color');
      await page.mouse.down();
      expect(await nairobi.getAttribute('data-pressed'), feedback).toBe(feedback);
      const fill = await css(nairobi, 'background-color');
      if (feedback === 'overlay') expect(fill).toBe(await color(page, 'stacked-pressed-option-container-color'));
      else expect(fill, `${feedback}: the fill stays with the state under the press`).toBe(hovered);
      if (feedback === 'ripple') {
        const ripple = nairobi.locator('.ripple');
        await expect(ripple).toHaveCount(1);
        expect(await css(ripple, 'background-color')).toBe(await color(page, 'stacked-pressed-option-container-color'));
        near(Number.parseFloat(await ripple.evaluate((el) => el.style.getPropertyValue('--_x'))), 30, 'from the point of contact', 1);
        expect(await css(ripple, 'animation-name'), 'whole at once where motion is reduced').toBe('none');
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        expect(await css(ripple, 'animation-name')).not.toBe('none');
        near((await px(ripple, 'animation-duration')) * 1000, await duration(page, 'motion-feedback-duration'), 'motion.feedback-duration', 1);
        await page.emulateMedia({ reducedMotion: 'reduce' });
      } else await expect(nairobi.locator('.ripple')).toHaveCount(0);
      if (feedback !== 'none') expect(await css(nairobi.locator('.option-label'), 'color')).toBe(await color(page, 'stacked-pressed-option-label-color'));
      await page.mouse.move(700, 600);
      await page.mouse.up();
    }
    // The keyboard: the ripple grows from the row's centre.
    await mount(page, [fx('one', { value: 'kyoto' }, [option('Kyoto', 'kyoto'), option('Nairobi', 'nairobi')])], { reducedMotion: false });
    // (20 s each: the layer is read an answer after Enter, which chooses and closes — it is there for press-hold, in a
    // row that is drawn while the list fades out, and 500 ms and 800 ms are one answer of a slow runner.)
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'ripple', '--tanrei-sys-motion-duration-press-hold': '20000ms', [T('motion-close-duration')]: '20000ms' });
    await focusInput(page, 'one');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'one').toBe(true);
    await page.keyboard.press('ArrowDown');
    const nairobi = row(page, 'one', 'Nairobi');
    // Grown in: the list then closes by fading out, with the pressed row in it (a list closed as it opens is gone at once).
    await part(page, 'one', '.motion').evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished.catch(() => undefined))));
    const width = (await box(nairobi)).width;
    await page.keyboard.press('Enter');
    near(Number.parseFloat(await nairobi.locator('.ripple').evaluate((el) => el.style.getPropertyValue('--_x'))), width / 2, 'from the centre', 1);
  });

  test('CMB-42: an option’s corners are eased by sys.shape.corner-smoothing and its keyboard focus is shown as sys.behavior.focus-style names — the ring, or the glow inside its row', async ({ page }) => {
    await mount(page, [fx('one', { value: 'lisbon' })], { system: 'cupertino' });
    await focusInput(page, 'one');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'one').toBe(true);
    const lisbon = row(page, 'one', 'Lisbon');
    const smoothing = Number((await css(page.locator('html'), '--tanrei-sys-shape-corner-smoothing')).trim());
    expect(smoothing).toBeGreaterThan(0);
    const supported = await page.evaluate(() => CSS.supports('corner-shape', 'superellipse(2)'));
    if (supported) near(await px(lisbon, 'border-top-left-radius'), (await token(page, 'option-shape')) * (1 + 0.4 * smoothing), 'the eased radius');
    else near(await px(lisbon, 'border-top-left-radius'), await token(page, 'option-shape'), 'the quarter circle where the curve cannot be drawn');
    expect(await css(lisbon, 'outline-style'), 'the ring').toBe('solid');
    // Glow: the halo inside the row, and no line.
    await mount(page, [fx('one', { value: 'lisbon' })], { system: 'acme', systemCss: await acmeSystemCss() });
    await focusInput(page, 'one');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'one').toBe(true);
    const glowing = row(page, 'one', 'Lisbon');
    expect(await glowing.getAttribute('data-focus-style')).toBe('glow');
    expect(await glowing.evaluate((el) => [getComputedStyle(el).outlineColor, getComputedStyle(el, '::after').boxShadow !== 'none'])).toEqual(['rgba(0, 0, 0, 0)', true]);
  });

  test('CMB-43: a group’s title is drawn above its options in group-title.typescale and color, inset by group-title.padding-inline, with option.padding-block above and below, wrapping; it takes no focus, is never the active option, is not matched by the filter and scrolls with its options; a group inside a group gives its options to the outer one, and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      ...spec.fixtures.filter((f) => f.id === 'open-groups'),
      fx('nested', { value: 'a', open: true }, '<tanrei-option-group label="Outer"><tanrei-option value="a">A</tanrei-option><tanrei-option-group label="Inner"><tanrei-option value="b">B</tanrei-option></tanrei-option-group><tanrei-option value="c">C</tanrei-option></tanrei-option-group>'),
    ], { reducedMotion: true });
    const id = 'open-groups';
    const title = part(page, id, '.group-title').first();
    await expect(title).toHaveText('Asia');
    expect(await css(title, 'color')).toBe(await color(page, 'group-title-color'));
    near(await px(title, 'font-size'), await token(page, 'group-title-typescale-font-size'), 'group-title.typescale');
    near(await px(title, 'padding-left'), await token(page, 'group-title-padding-inline-regular'), 'padding-inline');
    near(await px(title, 'padding-top'), await token(page, 'option-padding-block-regular'), 'padding-block');
    near((await box(title)).x, (await box(rows(page, id).first())).x, 'from the rows’ start edge');
    expect((await box(title)).y + (await box(title)).height).toBeLessThanOrEqual((await box(rows(page, id).first())).y + 0.6);
    expect(await title.evaluate((el) => [el.tabIndex, el.getAttribute('role'), getComputedStyle(el).overflowWrap, el.closest('.scroll') !== null])).toEqual([-1, 'presentation', 'break-word', true]);
    await expect(part(page, id, '.group-title')).toHaveCount(2);
    // Never active, and not matched by the filter: "asia" finds no option although a title is that word.
    await set(page, id, { inline: false, open: false });
    await focusInput(page, id);
    await page.keyboard.press('ArrowDown');
    await shownList(page, id).toBe(true);
    for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowUp');
    expect((await read(page, id)).active).toBe('Tokyo');
    await title.hover();
    expect((await read(page, id)).active).toBe('Tokyo');
    await selectAll(page, id);
    await type(page, 'asia');
    await settle(page, id);
    expect((await read(page, id)).rows).toEqual([]);
    // Nested: one group, one title, the inner group's option in order among the outer's.
    await expect(part(page, 'nested', '.group')).toHaveCount(1);
    await expect(part(page, 'nested', '.group-title')).toHaveText(['Outer']);
    expect(await rows(page, 'nested').locator('.option-label').allTextContents()).toEqual(['A', 'B', 'C']);
    await expect(part(page, 'nested', '.divider')).toHaveCount(0);
    await expect.poll(() => seen.some((w) => w.includes('CMB-43'))).toBe(true);
  });

  test('CMB-44: a group is told from an adjacent group or option outside any group as separation names — auto takes comp.combobox.separation, divider draws a line of divider.thickness in divider.color with divider.space above and below, gap leaves group.gap and no line — never before the first or after the last element, nor before the status row; an unknown value is auto, reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      ...spec.fixtures.filter((f) => ['open-groups', 'open-groups-divider', 'open-groups-gap'].includes(f.id)),
      fx('mixed', { value: 'x', open: true, statusText: '4 shown' }, [option('X', 'x'), option('Y', 'y'), group('G', [option('Z', 'z')]), option('W', 'w')]),
      fx('odd', { value: 'x', open: true, separation: 'sometimes' }, [group('G', [option('X', 'x')]), group('H', [option('Y', 'y')])]),
    ]);
    const drawn = (id: string) =>
      host(page, id).evaluate((el) => {
        const all = (selector: string) => [...el.shadowRoot!.querySelectorAll<HTMLElement>(selector)];
        const shown = (node: HTMLElement) => getComputedStyle(node).display !== 'none';
        return { dividers: all('.scroll > .divider').filter(shown).length, gaps: all('.scroll > .gap').filter(shown).length, places: all('.scroll > .divider').length };
      });
    expect((await css(page.locator('html'), T('separation'))).trim()).toBe((await css(page.locator('html'), '--tanrei-sys-behavior-separation')).trim());
    expect(await drawn('open-groups'), 'auto: the system’s divider').toEqual({ dividers: 2, gaps: 0, places: 2 });
    expect(await drawn('open-groups-divider')).toEqual({ dividers: 2, gaps: 0, places: 2 });
    expect(await drawn('open-groups-gap')).toEqual({ dividers: 0, gaps: 2, places: 2 });
    const divider = part(page, 'open-groups-divider', '.divider').first();
    near((await box(divider)).height, await token(page, 'divider-thickness'), 'divider.thickness');
    expect(await css(divider, 'background-color')).toBe(await color(page, 'divider-color'));
    near(await px(divider, 'margin-top'), await token(page, 'divider-space'), 'divider.space');
    near(await px(divider, 'margin-bottom'), await token(page, 'divider-space'), 'divider.space');
    const [l, d] = [await box(part(page, 'open-groups-divider', '.list')), await box(divider)];
    near(d.x - l.x, await token(page, 'list-padding-inline'), 'inside the list’s padding');
    near(l.x + l.width - (d.x + d.width), await token(page, 'list-padding-inline'), 'inside the list’s padding');
    near((await box(part(page, 'open-groups-gap', '.gap').first())).height, await token(page, 'group-gap'), 'group.gap');
    expect(await part(page, 'open-groups-gap', '.gap').first().getAttribute('aria-hidden')).toBe('true');
    expect(await divider.getAttribute('aria-hidden'), 'takes no focus, and is not an option').toBe('true');
    // Between two options outside any group: nothing. Around a group: one on each side. Never first or last, and none before the status row.
    expect(await drawn('mixed')).toEqual({ dividers: 2, gaps: 0, places: 2 });
    expect(await part(page, 'mixed', '.scroll').evaluate((el) => [el.firstElementChild!.classList.contains('row'), el.lastElementChild!.classList.contains('row'), el.nextElementSibling!.classList.contains('status')])).toEqual([true, true, true]);
    // The token, whatever the attribute's absence says; then the attribute over the token.
    await override(page, { [T('separation')]: 'gap' });
    await set(page, 'open-groups', { placeholder: 'x' });
    expect(await drawn('open-groups')).toEqual({ dividers: 0, gaps: 2, places: 2 });
    expect(await drawn('open-groups-divider'), 'the attribute wins').toEqual({ dividers: 2, gaps: 0, places: 2 });
    expect(await drawn('odd'), 'an unknown value is auto').toEqual({ dividers: 0, gaps: 1, places: 1 });
    await expect.poll(() => seen.some((w) => w.includes('CMB-44') && w.includes('sometimes'))).toBe(true);
  });

  test('CMB-45: the list appears from where the appearance starts it — opacity 0 and scale 0.96 — grown from the edge that faces the container, and leaves the same way back on the accelerating curve, its last frame leaving no more than that curve does; nothing flickers', async ({ page }) => {
    await mount(page, [fx('one', { value: 'lisbon' })], { reducedMotion: false });
    await focusInput(page, 'one');
    const opening = await sampleFrames(host(page, 'one'), () => page.keyboard.press('ArrowDown'), { probe: appearProbe });
    expectAppearStart(opening.frames[0]!, { opacity: 0, scale: 0.96 });
    expect(String(opening.frames[0]!.probe.origin)).toMatch(/ 0px$/);
    expect(opening.rest.probe).toMatchObject({ opacity: 1, sx: 1, sy: 1 });
    expectNoFlicker(opening);
    const closing = await sampleFrames(host(page, 'one'), () => page.keyboard.press('Escape'), { probe: appearProbe });
    expect(closing.rest.probe).toMatchObject({ opacity: 0, sx: 0.96, sy: 0.96 });
    expectNoFlicker(closing);
    const exit = await resolveEasing(page, T('motion-close-easing'));
    expect(exit).toBe(await resolveEasing(page, '--tanrei-sys-motion-easing-standard-accelerate'));
    expectExitEnd(closing, { duration: await resolveToken(page, T('motion-close-duration'), 'duration'), easing: bezierOf(exit) });
  });

  test('CMB-67: iconSpace — auto keeps the leading icon column, empty, in a section where another shown option has an icon, and none in a section without icons; an option the filter hides does not count; always in every option; never only in an option that has an icon; a section is a group or a run of options outside any group; decided again when an option changes; an unknown value is auto, reported', async ({ page }) => {
    const seen = warnings(page);
    const spaced = spec.fixtures.filter((f) => f.id.startsWith('icon-space-'));
    expect(spaced.map((f) => f.id)).toEqual(['icon-space-auto', 'icon-space-always', 'icon-space-never']);
    const auto = spaced[0];
    await mount(page, [
      ...spaced,
      // Typing leaves Copy link alone in its group: Mail and Messages, which have the icons, are hidden.
      { ...auto, id: 'typed', props: { ...auto.props, value: '', inputValue: 'link' } },
      fx('runs', { value: 'a', open: true }, [option('A', 'a', { leadingIcon: 'mail' }), option('B', 'b'), group('G', [option('C', 'c'), option('D', 'd')]), option('E', 'e')]),
      fx('odd', { value: 'a', open: true, iconSpace: 'sometimes' } as Fixture['props'], [group('G', [option('A', 'a', { leadingIcon: 'mail' }), option('B', 'b')]), group('H', [option('C', 'c')])]),
    ]);
    const [pad, gap, size] = [await token(page, 'option-padding-inline-regular'), await token(page, 'option-gap-regular'), await token(page, 'option-leading-icon-size-regular')];
    const none = pad;
    const kept = pad + size + gap;
    /** Where an option's label starts, from its row's start edge. */
    const at = async (id: string, label: string) => (await box(row(page, id, label).locator('.option-label'))).x - (await box(row(page, id, label))).x;
    const expectStarts = async (id: string, starts: Record<string, number>) => {
      for (const [label, start] of Object.entries(starts)) near(await at(id, label), start, `${id}: ${label}`);
    };
    expect(await host(page, 'icon-space-auto').evaluate((el: any) => el.iconSpace)).toBe('auto');
    // auto: the group Apps keeps the column on Copy link; the group Files has no icon and keeps none.
    await expectStarts('icon-space-auto', { Mail: kept, Messages: kept, 'Copy link': kept, Print: none, 'Save as PDF': none });
    await expect(row(page, 'icon-space-auto', 'Copy link').locator('.row-column.leading[aria-hidden="true"]')).toHaveCount(1);
    await expect(row(page, 'icon-space-auto', 'Print').locator('.row-column.leading')).toHaveCount(0);
    const titles = part(page, 'icon-space-auto', '.group-title');
    near((await box(titles.nth(0))).x, (await box(titles.nth(1))).x, 'the titles start alike');
    await expectStarts('icon-space-always', { Mail: kept, 'Copy link': kept, Print: kept, 'Save as PDF': kept });
    await expectStarts('icon-space-never', { Mail: kept, Messages: kept, 'Copy link': none, Print: none, 'Save as PDF': none });
    // The options the filter hides do not count: Copy link, alone in its group, keeps no column.
    await expect(rows(page, 'typed')).toHaveCount(1);
    await expectStarts('typed', { 'Copy link': none });
    // Options outside any group are a section of their own, each run apart from the next.
    await expectStarts('runs', { A: kept, B: kept, C: none, D: none, E: none });
    // An unknown value is auto, reported.
    await expectStarts('odd', { A: kept, B: kept, C: none });
    await expect.poll(() => seen.some((w) => w.includes('(CMB-67)') && w.includes('sometimes'))).toBe(true);
    // Decided again: an icon given to Print keeps the column on Save as PDF; taken away, the group keeps none.
    await host(page, 'icon-space-auto').evaluate((el) => el.querySelector('[value="print"]')!.setAttribute('leading-icon', 'print'));
    await expect.poll(() => at('icon-space-auto', 'Save as PDF')).toBeCloseTo(kept, 0);
    await host(page, 'icon-space-auto').evaluate((el) => el.querySelector('[value="print"]')!.removeAttribute('leading-icon'));
    await expect.poll(() => at('icon-space-auto', 'Save as PDF')).toBeCloseTo(none, 0);
    // iconSpace changed while the list is shown.
    await host(page, 'icon-space-auto').evaluate((el: any) => (el.iconSpace = 'never'));
    await expect.poll(() => at('icon-space-auto', 'Copy link')).toBeCloseTo(none, 0);
    await host(page, 'icon-space-auto').evaluate((el) => el.setAttribute('icon-space', 'always'));
    await expect.poll(() => at('icon-space-auto', 'Print')).toBeCloseTo(kept, 0);
  });

  test('CMB-68: a compact combobox draws its options and group titles from the compact tokens — lower, set in less, smaller glyphs, the same text — as low as its density gives for a mouse and the touch target for touch, the field’s box unchanged; an unknown density is regular and reported, an added one is drawn from its tokens, and a change is drawn at once', async ({ page, browserName }) => {
    const seen = warnings(page);
    const compact = spec.fixtures.find((f) => f.id === 'density-compact')!;
    await mount(page, [
      compact,
      { ...compact, id: 'density-regular', props: { ...compact.props, density: 'regular' } },
      { ...compact, id: 'density-odd', props: { ...compact.props, density: 'huge' } as Fixture['props'] },
      { ...compact, id: 'density-added', props: { ...compact.props, density: 'roomy' } as Fixture['props'] },
    ]);
    const sizes = async (density: string) => {
      const [height, padBlock, padInline, gap, icon, mark, title] = await Promise.all(
        ['option-height', 'option-padding-block', 'option-padding-inline', 'option-gap', 'option-leading-icon-size', 'option-mark-size', 'group-title-padding-inline'].map((n) => token(page, `${n}-${density}`)),
      );
      return { height, padBlock, padInline, gap, icon, mark, title };
    };
    const [regular, small] = [await sizes('regular'), await sizes('compact')];
    // The default system's compact option: the menu's compact row, 32 high with 20 glyphs, 8 from its edges.
    expect([small.height, small.icon, small.mark, small.padInline]).toEqual([32, 20, 20, 8]);
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    const drawn = async (id: string, label: string) => {
      const r = row(page, id, label);
      const [b, l, icon, font] = [await box(r), await box(r.locator('.option-label')), await px(r.locator('.option-icon'), 'font-size'), await css(r.locator('.option-label'), 'font-size')];
      return { height: b.height, start: l.x - b.x, icon, font };
    };
    const mail = await drawn('density-compact', 'Mail');
    const mailRegular = await drawn('density-regular', 'Mail');
    near(mail.height, small.height, 'a compact option');
    expect(mail.height).toBeLessThan(pointer);
    near(mail.icon, small.icon, 'its glyph');
    near(mail.start, small.padInline + small.icon + small.gap, 'its label after the padding, the glyph and the gap');
    near(mailRegular.height, Math.max(regular.height, pointer), 'a regular option');
    near(mailRegular.start, regular.padInline + regular.icon + regular.gap, 'a regular label');
    // The density never changes a text style; the check's box and a group's title take the density.
    expect(mail.font).toBe(mailRegular.font);
    const titles = part(page, 'density-compact', '.group-title');
    near(await px(titles.first(), 'padding-inline-start'), small.title, 'a group title’s inset');
    // The field's own box is size's, not the density's.
    near((await box(container(page, 'density-compact'))).height, (await box(container(page, 'density-regular'))).height, 'the field’s box');
    // An unknown density is drawn as regular, and a debug build says so.
    near((await drawn('density-odd', 'Mail')).height, mailRegular.height, 'an unknown density');
    await expect.poll(() => seen.filter((w) => w.includes('CMB-68') && w.includes('"huge"')).length).toBe(1);
    // A density a design system adds is drawn from its tokens, the default's where it has none.
    await rootTokens(page, { [T('option-height-roomy')]: '60px', [T('option-leading-icon-size-roomy')]: '28px' });
    await expect.poll(async () => (await drawn('density-added', 'Mail')).height).toBeCloseTo(60, 0);
    near((await drawn('density-added', 'Mail')).icon, 28, 'an added density’s glyph');
    // A change is drawn at once.
    await host(page, 'density-regular').evaluate((el: any) => (el.density = 'compact'));
    await expect.poll(async () => (await drawn('density-regular', 'Mail')).height).toBeCloseTo(mail.height, 0);
    // CMB-34: for touch a compact option is the touch target.
    if (browserName !== 'chromium') return;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    await expect.poll(async () => (await drawn('density-compact', 'Mail')).height).toBeCloseTo(await resolveToken(page, '--tanrei-sys-target-touch'), 0);
  });

  test('CMB-45: the list appears as a popover\'s container does over motion.open-*, leaves the same way over motion.close-*, and only fades, over role.reduced, where motion is reduced; closing it takes no input; a change of the options shown changes its height at once; the value, the text and the open state change when it closes, not when its motion ends', async ({ page }) => {
    await mount(page, [fx('one', { value: 'lisbon' })], { reducedMotion: false });
    // The motions at 40 s, each ended by hand: what is read 'still fading' is read some round trips after the change that
    // begins the fade, and at 400 ms a runner that takes 150 ms an answer read a list that had arrived. The durations are
    // read from the list after the override, so the binding to the tokens is still what is proved.
    await override(page, { [T('motion-open-duration')]: '40s', [T('motion-close-duration')]: '40s' });
    await listen(page, 'one');
    const motion = part(page, 'one', '.motion');
    const arrive = () => motion.evaluate((el) => el.getAnimations().forEach((animation) => animation.finish()));
    await focusInput(page, 'one');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'one').toBe(true);
    expect(await motion.evaluate((el) => [getComputedStyle(el).transitionProperty, getComputedStyle(el).transitionDuration, getComputedStyle(el).transformOrigin.endsWith(' 0px')])).toEqual(['opacity, scale, translate, filter, display, overlay', '40s', true]);
    expect(Number(await css(motion, 'opacity')), 'still fading in').toBeLessThan(1);
    await arrive();
    await expect.poll(async () => Number(await css(motion, 'opacity'))).toBe(1);
    // The options shown change: the height follows at once, with no motion of its own.
    const tall = (await box(part(page, 'one', '.list'))).height;
    await selectAll(page, 'one');
    await type(page, 'nai');
    await settle(page, 'one');
    expect((await box(part(page, 'one', '.list'))).height).toBeLessThan(tall / 2);
    expect(await css(part(page, 'one', '.list'), 'transition-property')).not.toContain('height');
    // Choosing: the value, the text and open change at once, while the list is still fading out and takes no input.
    await heard(page);
    await page.keyboard.press('Enter');
    expect(await read(page, 'one')).toMatchObject({ value: 'nairobi', text: 'Nairobi', open: false, expanded: 'false' });
    expect(await heard(page)).toEqual(['change nairobi', 'toggle false select']);
    expect(await part(page, 'one', '.surface').evaluate((el) => [el.matches(':popover-open'), getComputedStyle(el).pointerEvents, el.inert]), 'still drawn, taking no input').toEqual([true, 'none', true]);
    expect(await css(motion, 'transition-duration')).toBe('40s');
    // Told to open while still closing: it turns round from where it is. (It had faded for a few answers of 40 s: from
    // nothing it would be near 0 now, from where it was it is near 1.)
    await page.keyboard.press('ArrowDown');
    expect((await read(page, 'one')).open).toBe(true);
    expect(Number(await css(motion, 'opacity')), 'not started again from nothing').toBeGreaterThan(0.5);
    await arrive();
    await expect.poll(async () => Number(await css(motion, 'opacity'))).toBe(1);
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await read(page, 'one')).open).toBe(false);
    await arrive();
    await closedList(page, 'one');
    // Reduced motion: only a fade, over role.reduced — no scale, no distance.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.press('ArrowDown');
    expect(await motion.evaluate((el) => [getComputedStyle(el).transitionProperty, Number.parseFloat(getComputedStyle(el).transitionDuration) * 1000, getComputedStyle(el).scale])).toEqual(['opacity, display, overlay', await resolveToken(page, '--tanrei-sys-motion-role-reduced', 'duration'), 'none']);
    await expect.poll(async () => Number(await css(motion, 'opacity'))).toBe(1);
    await page.keyboard.press('Escape');
    await expect.poll(() => part(page, 'one', '.surface').evaluate((el) => el.matches(':popover-open'))).toBe(false);
  });
});

test.describe('behavior: conditions, exposure, size and direction', () => {
  test('CMB-46: a disabled combobox — by its own disabled, or by the Field that frames it — is not focusable or editable, does not open, emits nothing, is exposed as disabled, is left out of form submission, draws no clear button and draws every part of its box, the chevron and a floating label included, from the disabled tokens of its variant', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => f.id === 'stacked-disabled'), fx('clear', { value: 'tokyo', disabled: true, clearable: true, clearLabel: 'Clear', name: 'city' }), fx('floating', { variant: 'outlined', value: 'tokyo', disabled: true }), fx('error', { value: 'tokyo', disabled: true, error: true }), fx('before', {})], { reducedMotion: true });
    await frame(page, 'framed', { label: 'Country', disabled: true }, { value: 'tokyo' });
    for (const id of ['stacked-disabled', 'framed']) {
      await listen(page, id);
      expect(await input(page, id).evaluate((el) => [(el as HTMLInputElement).disabled, el.matches(':disabled')]), id).toEqual([true, true]);
      await focusInput(page, id);
      expect((await read(page, id)).focused, `${id}: not focusable`).toBe(false);
      await pressOn(container(page, id));
      await pressOn(part(page, id, '.chevron'));
      if (id === 'framed') await pressOn(fieldRow(page, id, '.label-row > .label'));
      await set(page, id, { open: true });
      expect(await read(page, id), id).toMatchObject({ focused: false, shown: false, expanded: 'false', value: 'tokyo' });
      expect(await heard(page), id).toEqual([]);
      // Drawn from the disabled tokens.
      expect(await css(container(page, id), 'background-color'), id).toBe(await color(page, 'stacked-disabled-container-color'));
      expect(await css(input(page, id), 'color'), id).toBe(await color(page, 'stacked-disabled-input-color'));
      expect(await css(part(page, id, '.chevron-glyph'), 'color'), id).toBe(await color(page, 'stacked-disabled-trailing-icon-color'));
      near(Number(await css(part(page, id, '.field'), 'opacity')), Number(await css(page.locator('html'), T('disabled-opacity'))), `${id}: the disabled opacity`, 0.01);
      expect(await part(page, id, '.chevron').evaluate((el) => (el as HTMLButtonElement).disabled), id).toBe(true);
    }
    const id = 'stacked-disabled';
    // Tab passes it by.
    await tabTo(page, input(page, 'before'));
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.closest('[data-fixture]')?.getAttribute('data-fixture') ?? null)).not.toBe(id);
    // Left out of the form, and no clear button.
    await inForm(page, 'clear');
    expect(await page.evaluate(() => [...new FormData(document.querySelector('form')!).keys()])).toEqual([]);
    await expect(part(page, 'clear', '.clear')).toHaveCount(0);
    // A floating label, and the error parts while in error.
    expect(await css(part(page, 'floating', '.floating'), 'color')).toBe(await color(page, 'outlined-disabled-label-color'));
    expect(await css(part(page, 'error', '.edge'), 'border-top-color')).toBe(await color(page, 'stacked-disabled-error-outline-color'));
    // The Field enables it again.
    await setFrame(page, 'framed', { disabled: false });
    expect(await input(page, 'framed').evaluate((el) => (el as HTMLInputElement).disabled)).toBe(false);
  });

  test('CMB-47: a read-only combobox stays focusable and shows its value, selectable, lets nothing change the text or the value, does not open by any input, draws neither the chevron nor the clear button, emits neither input, change nor toggle, is exposed as read-only, is submitted with its form, and is drawn as an enabled combobox, hovered and focused states included', async ({ page }) => {
    await mount(page, [fx('one', { value: 'tokyo', readOnly: true, clearable: true, clearLabel: 'Clear', name: 'city' }), fx('plain', { value: 'tokyo' })], { reducedMotion: true });
    await inForm(page, 'one');
    await listen(page, 'one');
    await tabTo(page, input(page, 'one'));
    expect(await read(page, 'one')).toMatchObject({ focused: true, text: 'Tokyo' });
    expect(await input(page, 'one').evaluate((el) => [(el as HTMLInputElement).readOnly, el.getAttribute('aria-readonly')])).toEqual([true, 'true']);
    await selectAll(page, 'one');
    expect(await input(page, 'one').evaluate((el) => (el as HTMLInputElement).value.slice((el as HTMLInputElement).selectionStart!, (el as HTMLInputElement).selectionEnd!)), 'selectable').toBe('Tokyo');
    await type(page, 'ky');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Alt+ArrowDown');
    await pressOn(container(page, 'one'));
    await set(page, 'one', { open: true });
    expect(await read(page, 'one')).toMatchObject({ value: 'tokyo', text: 'Tokyo', shown: false, expanded: 'false' });
    expect(await heard(page)).toEqual([]);
    await expect(part(page, 'one', '.chevron, .clear')).toHaveCount(0);
    expect(await page.evaluate(() => [...new FormData(document.querySelector('form')!).entries()].map(([k, v]) => `${k}=${String(v)}`))).toEqual(['city=tokyo']);
    // Drawn as an enabled one: the focused state now, the resting and hovered ones as a plain combobox's.
    expect(await css(part(page, 'one', '.edge'), 'border-top-color')).toBe(await color(page, 'stacked-focused-outline-color'));
    await blurInput(page, 'one');
    await page.mouse.move(700, 600);
    await expect.poll(() => css(container(page, 'one'), 'background-color')).toBe(await css(container(page, 'plain'), 'background-color'));
    expect(await css(input(page, 'one'), 'color')).toBe(await css(input(page, 'plain'), 'color'));
    await container(page, 'one').hover();
    await expect.poll(() => css(container(page, 'one'), 'background-color')).toBe(await color(page, 'stacked-hovered-container-color'));
  });

  test('CMB-48: the input is an editable combobox named by label, with aria-autocomplete list, aria-haspopup listbox, aria-expanded, aria-controls naming the list while it is open and aria-activedescendant naming the active option while there is one; the list is a listbox named by label whose options are named by their label and described by their supporting text, each with its selected state, its disabled state, its position and the number shown, and whose groups are named by their title; typing moves the active descendant to the first match, and leaves it absent where a custom value is allowed', async ({ page }) => {
    await mount(page, [fx('one', { label: 'Token', value: 'b' }, [group('Colors', [option('Alpha', 'a', { supportingText: '#111' }), option('Beta', 'b', { leadingIcon: 'palette' })]), option('Gamma', 'g', { disabled: true })]), fx('custom', { allowCustomValue: true })], { reducedMotion: true });
    const field = input(page, 'one');
    expect(await field.evaluate((el) => ['role', 'aria-autocomplete', 'aria-haspopup', 'aria-expanded', 'aria-controls', 'aria-activedescendant', 'aria-label'].map((name) => el.getAttribute(name)))).toEqual(['combobox', 'list', 'listbox', 'false', null, null, 'Token']);
    await focusInput(page, 'one');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'one').toBe(true);
    const tree = await host(page, 'one').evaluate((el) => {
      const root = el.shadowRoot!;
      const text = (ids: string | null) => (ids ?? '').split(' ').filter(Boolean).map((id) => root.getElementById(id)?.textContent?.trim() ?? '').join(' ');
      const field_ = root.querySelector('.input')!;
      const list = root.getElementById(field_.getAttribute('aria-controls')!)!;
      return {
        expanded: field_.getAttribute('aria-expanded'),
        active: text(`${field_.getAttribute('aria-activedescendant')}-label`),
        list: [list.getAttribute('role'), text(list.getAttribute('aria-labelledby'))],
        options: [...list.querySelectorAll('[role="option"]')].map((o) => [text(o.getAttribute('aria-labelledby')), text(o.getAttribute('aria-describedby')), o.getAttribute('aria-selected'), o.getAttribute('aria-disabled'), o.getAttribute('aria-posinset'), o.getAttribute('aria-setsize')]),
        groups: [...list.querySelectorAll('[role="group"]')].map((g) => text(g.getAttribute('aria-labelledby'))),
        hidden: [...root.querySelectorAll('.row-column, .divider, .icon')].every((node) => node.closest('[aria-hidden="true"]') !== null),
        chevron: [root.querySelector('.chevron')!.localName, root.querySelector('.chevron')!.getAttribute('aria-label'), root.querySelector('.chevron')!.getAttribute('aria-expanded')],
      };
    });
    expect(tree).toEqual({
      expanded: 'true',
      active: 'Beta',
      list: ['listbox', 'Token'],
      options: [['Alpha', '#111', 'false', null, '1', '3'], ['Beta', '', 'true', null, '2', '3'], ['Gamma', '', 'false', 'true', '3', '3']],
      groups: ['Colors'],
      hidden: true,
      chevron: ['button', 'Token', 'true'],
    });
    // Filtered: the positions and the count are those of the options shown.
    await selectAll(page, 'one');
    await type(page, 'a');
    expect(await rows(page, 'one').evaluateAll((all) => all.map((o) => `${o.getAttribute('aria-posinset')}/${o.getAttribute('aria-setsize')}`))).toEqual(['1/3', '2/3', '3/3']);
    await type(page, 'l');
    expect(await rows(page, 'one').evaluateAll((all) => all.map((o) => `${o.getAttribute('aria-posinset')}/${o.getAttribute('aria-setsize')}`))).toEqual(['1/1']);
    expect((await read(page, 'one')).active, 'typing moves the active descendant to the first match').toBe('Alpha');
    await page.keyboard.press('Escape');
    expect(await field.evaluate((el) => [el.getAttribute('aria-expanded'), el.getAttribute('aria-controls'), el.getAttribute('aria-activedescendant')]), 'closed').toEqual(['false', null, null]);
    // A custom value: typing leaves the active descendant absent.
    await focusInput(page, 'custom');
    await type(page, 'to');
    expect(await input(page, 'custom').evaluate((el) => [el.getAttribute('aria-expanded'), el.getAttribute('aria-activedescendant')])).toEqual(['true', null]);
  });

  test('CMB-48: Chromium’s accessibility tree — the combobox’s role, name, description, value, editable and autocomplete, expanded state, the list it controls, its active option, required, invalid, read-only and disabled states; the list box, its options with their names, descriptions, selected and disabled states, and its groups; the status row’s live regions; the chevron’s and the clear button’s buttons', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'the accessibility tree is read over the DevTools protocol');
    // Framed, as a form holds it: the name, the description and the states are the Field's, carried by the input.
    await mount(page, [], { reducedMotion: true });
    await frame(
      page,
      'one',
      { label: 'Token', supportingText: 'Used by the theme.', required: false, optional: true, optionalText: 'Optional' },
      { value: 'b', clearable: true, clearLabel: 'Clear token', statusText: '3 of 12 shown' },
      '<tanrei-option-group label="Colors"><tanrei-option value="a" supporting-text="#111">Alpha</tanrei-option><tanrei-option value="b">Beta</tanrei-option></tanrei-option-group><tanrei-option value="g" disabled>Gamma</tanrei-option>',
    );
    let [box_] = await axNodes(page, 'combobox');
    expect(box_).toMatchObject({ name: 'Token', description: 'Used by the theme. Optional', value: 'Beta', expanded: false, haspopup: 'listbox', autocomplete: 'list', editable: 'plaintext', focusable: true });
    expect([box_.required, box_.invalid, box_.readonly, box_.disabled].map((state) => state ?? false), 'none of the states it does not have').toEqual([false, 'false', false, false]);
    expect(box_.active).toEqual([]);
    // Open, filtered by typing: expanded, controlling the list box, the first match its active option.
    await focusInput(page, 'one');
    await selectAll(page, 'one');
    await type(page, 'a');
    await settle(page, 'one');
    [box_] = await axNodes(page, 'combobox');
    expect(box_).toMatchObject({ name: 'Token', value: 'a', expanded: true });
    expect(box_.controls, 'the list box, named by the label').toEqual(['Token']);
    expect(box_.active, 'the active option').toEqual(['Alpha']);
    const [list] = await axNodes(page, 'listbox');
    expect(list.name).toBe('Token');
    expect(list.children.filter((role) => role !== 'option' && role !== 'group'), 'a list box of options and groups only').toEqual([]);
    const options = await axNodes(page, 'option');
    expect(options.map((o) => [o.name, o.description, o.selected ?? false, o.disabled ?? false]).sort((x, y) => String(x[0]).localeCompare(String(y[0])))).toEqual([['Alpha', '#111', false, false], ['Beta', '', true, false], ['Gamma', '', false, true]]);
    expect((await axNodes(page, 'group')).map((g) => g.name)).toContain('Colors');
    // The match is drawn heavier and read as one text: no node of its own in the tree.
    await expect(row(page, 'one', 'Alpha').locator('mark')).toHaveText('A');
    expect(await axNodes(page, 'mark')).toEqual([]);
    // The status row: a polite live region with the text, and an assertive one that is empty.
    const status = await axNodes(page, 'status');
    expect(status.map((s) => s.live)).toContain('polite');
    expect(await page.evaluate(() => document.querySelector('tanrei-combobox')!.shadowRoot!.querySelector('.status [role="status"]')!.textContent)).toBe('3 of 12 shown');
    expect((await axNodes(page, 'alert')).map((a) => a.live)).toEqual(['assertive']);
    // The buttons: the chevron named by the label with its expanded state, the clear button by clearLabel.
    const buttons = await axNodes(page, 'button');
    expect(buttons.map((b) => [b.name, b.expanded])).toEqual(expect.arrayContaining([['Clear token', undefined], ['Token', true]]));
    // Loading: the list box is busy. Failed: the alert holds the text.
    await set(page, 'one', { status: 'loading', statusText: 'Loading tokens' });
    expect((await axNodes(page, 'listbox'))[0].busy, 'busy').toBeTruthy();
    // Required, invalid, read-only, then disabled.
    await page.keyboard.press('Escape');
    await set(page, 'one', { status: 'idle', statusText: '', inputValue: 'Beta' });
    await setFrame(page, 'one', { required: true, error: true, errorText: 'Choose a token of the list.' });
    [box_] = await axNodes(page, 'combobox');
    expect(box_).toMatchObject({ required: true, invalid: 'true', description: 'Choose a token of the list.', expanded: false });
    await set(page, 'one', { readOnly: true });
    // Read-only: the protocol's tree has no read-only property for a text input that is a combobox (it has one for a
    // select's trigger), so what the browser is given is read instead — the native state and aria-readonly — and the
    // tree must still call it a combobox of that name.
    expect(await input(page, 'one').evaluate((el) => [(el as HTMLInputElement).readOnly, el.getAttribute('aria-readonly')])).toEqual([true, 'true']);
    expect((await axNodes(page, 'combobox'))[0]).toMatchObject({ name: 'Token', value: 'Beta' });
    await set(page, 'one', { readOnly: false });
    await setFrame(page, 'one', { disabled: true });
    expect((await axNodes(page, 'combobox'))[0]).toMatchObject({ disabled: true, name: 'Token' });
  });

  test('CMB-49: the combobox is a block exactly as wide as its place, framed and bare alike — inside a Field, the Field’s whole width — with no width of its own: never the platform’s default width for a text element, never the width of its options or of its value; a narrower place gives a narrower box', async ({ page }) => {
    const long = [option('An option whose label is far longer than any text input is wide by default', 'long')];
    await mount(page, [fx('free', {}, long), fx('value', { value: 'long' }, long), fx('short', {}, [option('A', 'a')])]);
    await page.addStyleTag({ content: '.stage:has(> tanrei-combobox) { inline-size: 900px; }' });
    await frame(page, 'framed', { label: 'City', supportingText: 'A line of help.' }, { value: 'tokyo' });
    await framing(page, 'framed').evaluate((el) => ((el as HTMLElement).style.inlineSize = '333px'));
    await frames(page);
    const native = await page.evaluate(() => {
      const probe = document.createElement('input');
      probe.type = 'text';
      probe.style.cssText = 'all: unset; display: inline-block; font: var(--tanrei-comp-input-box-input-typescale-medium-font); letter-spacing: var(--tanrei-comp-input-box-input-typescale-medium-letter-spacing);';
      document.body.append(probe);
      const width = probe.getBoundingClientRect().width;
      probe.remove();
      return width;
    });
    expect(await css(host(page, 'free'), 'display')).toBe('block');
    for (const id of ['free', 'value', 'short']) {
      near((await box(host(page, id))).width, 900, `${id}: as wide as its place`);
      near((await box(container(page, id))).width, 900, `${id}: the box fills it`);
    }
    expect(Math.abs((await box(input(page, 'free'))).width - native), 'not the platform’s default width').toBeGreaterThan(100);
    // Inside a Field: the Field's whole width.
    near((await box(host(page, 'framed'))).width, 333, 'the Field’s width');
    near((await box(container(page, 'framed'))).width, 333, 'the box fills its Field');
    // A narrower place, a narrower box.
    await host(page, 'free').evaluate((el) => (el.style.inlineSize = '400px'));
    near((await box(container(page, 'free'))).width, 400, 'as wide as its layout gives it');
    await host(page, 'free').evaluate((el) => (el.style.inlineSize = '90px'));
    near((await box(container(page, 'free'))).width, 90, 'and as narrow');
  });

  test('CMB-50: with text enlarged to 200% the container grows with the input’s line and keeps it on one line, and with a floating label that wraps and is never cut; the glyphs grow with the text they stand in, options, titles and the status row wrap, and the list scrolls where they no longer fit — nothing is lost, overlaps or needs scrolling in two directions', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await mount(page, [
      fx('one', { value: 'tokyo', open: true, statusText: '5 of 340 cities shown. Keep typing to narrow.' }, [group('Places we deliver to today', CITIES)]),
      fx('floating', { variant: 'outlined', label: 'The city we deliver to, once the order is paid', value: 'tokyo' }),
    ]);
    const before = { container: (await box(container(page, 'one'))).height, row: (await box(rows(page, 'one').first())).height, floating: (await box(container(page, 'floating'))).height };
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    await frames(page, 6);
    const c = await box(container(page, 'one'));
    expect(c.height, 'the container grew with the input’s line').toBeGreaterThan(before.container * 1.5);
    near((await box(input(page, 'one'))).height, (await px(input(page, 'one'), 'font-size')) * Number(await css(page.locator('html'), T('input-typescale-medium-line-height'))), 'the text stays on one line', 1);
    expect((await box(rows(page, 'one').first())).height).toBeGreaterThan(before.row * 1.5);
    const fits = (id: string, selector: string) => part(page, id, selector).first().evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && getComputedStyle(el).textOverflow !== 'ellipsis');
    for (const selector of ['.option-label', '.group-title', '.status .said']) expect(await fits('one', selector), selector).toBe(true);
    // A floating label that wraps is given its room: never cut, never over the input's text.
    await expect(part(page, 'floating', '.field')).toHaveAttribute('data-label-wraps', '');
    expect(await fits('floating', '.floating'), 'the floating label').toBe(true);
    expect((await box(container(page, 'floating'))).height).toBeGreaterThan(before.floating * 1.5);
    const [label, text] = [await box(part(page, 'floating', '.floating')), await box(input(page, 'floating'))];
    expect(label.y + label.height, 'the label ends above the input’s line').toBeLessThanOrEqual(text.y + 0.6);
    // The combobox is exactly as tall as its box, and the room an outlined one keeps above it for the label's lines.
    const [h, fc] = [await box(host(page, 'floating')), await box(container(page, 'floating'))];
    near(h.y + h.height, fc.y + fc.height, 'nothing below the container');
    // The list scrolls one way only.
    expect(await part(page, 'one', '.scroll').evaluate((el) => [el.scrollWidth <= el.clientWidth, getComputedStyle(el).overflowX])).toEqual([true, 'hidden']);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('CMB-51: in forced colors a floating label and the asterisk after it are drawn in the text color; the container has an edge outline.width wide in the control text color in every variant, in the highlight color at the focused width while focused, and no color of its own shows an error — the invalid state does; the list has an edge in the text color, the active option the highlight colors, the matched run the colors for marked text with its weight raised, a disabled combobox and a disabled option the disabled text color; the chosen option is shown by its check', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'forced colors are emulated in Chromium');
    await page.emulateMedia({ forcedColors: 'active' });
    await mount(page, [...spec.fixtures.filter((f) => ['stacked-value', 'stacked-error-value', 'filled-value', 'outlined-value', 'stacked-disabled', 'open-supporting-text', 'open-status-error'].includes(f.id))]);
    await frame(page, 'required', { label: 'City', required: true, requiredMark: 'asterisk', error: true, errorText: 'Choose a city.' }, { variant: 'outlined', value: 'tokyo' });
    const canvasText = await systemColor(page, 'CanvasText');
    for (const [id, selector] of [['required', '.floating'], ['required', '.floating .asterisk'], ['outlined-value', '.floating'], ['open-status-error', '.status']] as const) {
      expect(await css(part(page, id, selector), 'color'), `${id} ${selector}`).toBe(canvasText);
    }
    // An error is carried by the invalid state and by the words its Field shows — by no color of the box's own.
    expect(await css(container(page, 'stacked-error-value'), 'border-top-color'), 'the edge in error is the edge at rest').toBe(await css(container(page, 'stacked-value'), 'border-top-color'));
    expect(await input(page, 'stacked-error-value').getAttribute('aria-invalid')).toBe('true');
    expect(await input(page, 'required').getAttribute('aria-invalid')).toBe('true');
    await expect(fieldRow(page, 'required', '.error-text')).toHaveText('Choose a city.');
    for (const id of ['stacked-value', 'filled-value', 'outlined-value']) {
      expect(await css(container(page, id), 'border-top-color'), id).toBe(await systemColor(page, 'ButtonText'));
      near(await px(container(page, id), 'border-top-width'), await token(page, 'outline-width'), `${id} outline.width`);
    }
    await focusInput(page, 'stacked-value');
    expect(await css(container(page, 'stacked-value'), 'outline-color')).toBe(await systemColor(page, 'Highlight'));
    near(await px(container(page, 'stacked-value'), 'outline-width'), await token(page, 'focused-outline-width'), 'the focused width');
    expect(await css(container(page, 'stacked-disabled'), 'border-top-color')).toBe(await systemColor(page, 'GrayText'));
    expect(await css(input(page, 'stacked-disabled'), 'color')).toBe(await systemColor(page, 'GrayText'));
    const id = 'open-supporting-text';
    expect(await css(part(page, id, '.list'), 'border-top-color')).toBe(canvasText);
    near(await px(part(page, id, '.list'), 'border-top-width'), await resolveToken(page, '--tanrei-sys-border-hairline'), 'a hairline');
    const active = part(page, id, '.row.active');
    expect(await css(active, 'background-color')).toBe(await systemColor(page, 'Highlight'));
    expect(await css(active.locator('.option-label'), 'color')).toBe(await systemColor(page, 'HighlightText'));
    await expect(part(page, id, '.row.selected .check')).toBeVisible();
    // The matched run: heavier, in the colors for marked text.
    const plain = part(page, id, '.row:not(.active):not(.selected)').first();
    const mark = plain.locator('mark');
    expect(await css(mark, 'color')).toBe(await systemColor(page, 'MarkText'));
    expect(await css(mark, 'background-color')).toBe(await systemBackground(page, 'Mark'));
    expect(Number(await css(mark, 'font-weight'))).toBeGreaterThan(Number(await css(plain.locator('.option-label'), 'font-weight')));
    expect(await css(active.locator('mark'), 'color')).toBe(await systemColor(page, 'MarkText'));
    // A disabled option, in the disabled text color.
    await set(page, id, { inputValue: 'sys' });
    expect(await css(part(page, id, '.row.d .option-label'), 'color')).toBe(await systemColor(page, 'GrayText'));
  });

  test('CMB-52: in a right-to-left layout the leading glyph is at the right of the container, the clear button and the chevron at its left with the chevron nearest the edge, the text and a floating label start from the right; the list is aligned to the container, and in each option the leading icon is at the right and the check at the left', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => ['stacked-required-rtl', 'open-rtl', 'outlined-rtl'].includes(f.id)), fx('lead', { value: 'tokyo' }, CITIES, { direction: 'rtl', slots: { 'leading-icon': 'location_on' } })]);
    const id = 'stacked-required-rtl';
    const [c, field] = [await box(container(page, id)), await box(input(page, id))];
    near(c.x + c.width - (field.x + field.width), await token(page, 'container-padding-inline-medium'), 'the text from the right edge');
    const [chevron, clear] = [await box(part(page, id, '.chevron-glyph')), await box(part(page, id, '.clear-box'))];
    near(chevron.x - c.x, await token(page, 'container-padding-inline-with-icon-medium'), 'the chevron nearest the left edge');
    near(clear.x - (chevron.x + chevron.width), await token(page, 'container-action-gap'), 'then the clear button');
    // A floating label: from the right, where the text starts.
    const [oc, floating] = [await box(container(page, 'outlined-rtl')), await box(part(page, 'outlined-rtl', '.floating'))];
    near(oc.x + oc.width - (floating.x + floating.width), await token(page, 'container-padding-inline-medium'), 'the floating label from the right edge');
    // A leading glyph: at the right.
    const lead = await box(part(page, 'lead', '.leading-slot'));
    const lc = await box(container(page, 'lead'));
    near(lc.x + lc.width - (lead.x + lead.width), await token(page, 'container-padding-inline-with-icon-medium'), 'the leading glyph at the right');
    expect((await box(input(page, 'lead'))).x + (await box(input(page, 'lead'))).width).toBeLessThanOrEqual(lead.x + 0.6);
    // The list: aligned to the container's edges; in each row the glyph at the right and the check at the left.
    const open = 'open-rtl';
    const [opened, list] = [await box(container(page, open)), await box(part(page, open, '.list'))];
    near(list.x, opened.x, 'the list’s left edge');
    near(list.x + list.width, opened.x + opened.width, 'the list’s right edge');
    const chosen = part(page, open, '.row.selected');
    const [glyph, name, check] = [await box(chosen.locator('.option-icon')), await box(chosen.locator('.option-label')), await box(chosen.locator('.check'))];
    expect(glyph.x, 'the glyph at the right of the label').toBeGreaterThanOrEqual(name.x + name.width - 0.6);
    expect(check.x + check.width, 'the check at the left').toBeLessThanOrEqual(name.x + 0.6);
    near((await box(chosen)).x + (await box(chosen)).width - (glyph.x + glyph.width), await token(page, 'option-padding-inline-regular'), 'logical paddings');
  });

  test('CMB-53: the layout direction comes from the nearest ancestor that sets one, and a change of it while the combobox is shown — its list open — is drawn at once, keeping the value, the text, the open state, the active option and focus, the list placed again by the new direction', async ({ page }) => {
    await mount(page, [fx('one', { value: 'tokyo', clearable: true, clearLabel: 'Clear' })], { reducedMotion: true });
    await page.evaluate(() => {
      const wrap = document.createElement('div');
      wrap.id = 'wrap';
      wrap.dir = 'rtl';
      const combobox = document.querySelector('tanrei-combobox')!;
      combobox.before(wrap);
      wrap.append(combobox);
    });
    await frames(page);
    expect((await box(part(page, 'one', '.chevron-glyph'))).x, 'right to left, from an ancestor that is not the root').toBeLessThan((await box(input(page, 'one'))).x);
    expect(await host(page, 'one').evaluate((el) => ['dir', 'direction'].some((name) => name in (el.constructor as unknown as { properties: object }).properties)), 'no direction setting of its own').toBe(false);
    await focusInput(page, 'one');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'one').toBe(true);
    await page.keyboard.press('ArrowUp');
    const before = await read(page, 'one');
    expect(before).toMatchObject({ active: 'Nairobi', value: 'tokyo', text: 'Tokyo' });
    await page.evaluate(() => (document.querySelector<HTMLElement>('#wrap')!.dir = 'ltr'));
    await frames(page, 4);
    expect((await box(part(page, 'one', '.chevron-glyph'))).x, 'left to right now').toBeGreaterThan((await box(input(page, 'one'))).x);
    expect(await read(page, 'one')).toMatchObject({ active: 'Nairobi', value: 'tokyo', text: 'Tokyo', open: true, shown: true, focused: true });
    const [c, l] = [await box(container(page, 'one')), await box(part(page, 'one', '.list'))];
    near(l.x, c.x, 'the list placed again');
    near(l.width, c.width, 'as wide as the container');
    expect(await css(container(page, 'one'), 'transition-property'), 'no motion of its own for the direction').not.toContain('padding');
  });

  test('CMB-54: in a right-to-left layout a glyph of the leading-icon slot and an option’s leadingIcon is mirrored exactly when the icon set marks its name or the product forces it, inside its own box; the chevron, the clear button’s close and the check never are, and nothing mirrors an image of the product’s', async ({ page }) => {
    await mount(page, [
      ...spec.fixtures.filter((f) => ['open-rtl', 'stacked-required-rtl'].includes(f.id)),
      fx('slots', { value: 'a', label: 'Next' }, '<tanrei-option value="a" leading-icon="arrow_forward">A</tanrei-option><span slot="leading-icon">arrow_forward</span>', { direction: 'rtl' }),
      fx('own', { value: 'a' }, '<tanrei-option value="a" leading-icon="arrow_forward">A</tanrei-option>', { direction: 'rtl' }),
      fx('forced', { value: 'a' }, '<tanrei-option value="a">A</tanrei-option><span slot="leading-icon" data-mirror="always">schedule</span>', { direction: 'rtl' }),
      fx('forbidden', { value: 'a' }, '<tanrei-option value="a">A</tanrei-option><span slot="leading-icon" data-mirror="never">arrow_forward</span>', { direction: 'rtl' }),
      fx('image', { value: 'a' }, '<tanrei-option value="a">A</tanrei-option><svg slot="leading-icon" viewBox="0 0 24 24"><path d="M4 12h16"/></svg>', { direction: 'rtl' }),
      fx('ltr', { value: 'a' }, '<tanrei-option value="a" leading-icon="arrow_forward">A</tanrei-option>'),
    ]);
    const mirrored = (locator: Locator) => locator.evaluate((el) => getComputedStyle(el).transform !== 'none' || getComputedStyle(el).scale !== 'none');
    const open = 'open-rtl';
    const arrow = part(page, open, '.row.selected .option-icon');
    await expect(arrow).toHaveText('arrow_forward');
    expect(await arrow.getAttribute('data-tanrei-mirrored'), 'arrow_forward is in the icon set’s list').not.toBeNull();
    expect(await mirrored(arrow)).toBe(true);
    near((await box(arrow)).width, await token(page, 'option-leading-icon-size-regular'), 'the same box');
    expect(await mirrored(part(page, open, '.row.selected .check'))).toBe(false);
    expect(await mirrored(part(page, open, '.chevron-glyph'))).toBe(false);
    expect(await mirrored(part(page, 'stacked-required-rtl', '.clear-glyph'))).toBe(false);
    // The chosen option's glyph in the container, and the slots.
    expect(await mirrored(part(page, 'own', '.leading-own'))).toBe(true);
    expect(await mirrored(host(page, 'slots').locator('[slot="leading-icon"]'))).toBe(true);
    expect(await mirrored(host(page, 'forced').locator('[slot="leading-icon"]'))).toBe(true);
    expect(await mirrored(host(page, 'forbidden').locator('[slot="leading-icon"]'))).toBe(false);
    expect(await mirrored(host(page, 'image').locator('[slot="leading-icon"]'))).toBe(false);
    // Left to right: marked all the same, and not mirrored.
    expect(await mirrored(part(page, 'ltr', '.leading-own'))).toBe(false);
  });

  test('CMB-55: a floating label, the placeholder, an option’s label and supporting text, a group’s title and the status row’s text are each a run of their own direction, isolated, placed and aligned by the layout direction; the text in the input is laid out by its own direction, and an empty input by the layout’s, so its caret and placeholder stand at its start edge', async ({ page, browserName }) => {
    await mount(page, [
      ...spec.fixtures.filter((f) => ['long-value-rtl', 'open-rtl'].includes(f.id)),
      fx('mixed', { variant: 'outlined', label: 'Call +1 555 0100', open: true, statusText: '2 of 48 shown', placeholder: 'Type a name' }, [group('Group A', [option('Option 1.5 kg', 'x', { supportingText: 'SKU 42-A' })])], { direction: 'rtl' }),
      fx('empty', { placeholder: 'ابحث' }, CITIES, { direction: 'rtl' }),
    ]);
    for (const selector of ['.floating', '.option-label', '.option-supporting', '.group-title', '.status .said']) {
      const [bidi, align] = await part(page, 'mixed', selector).first().evaluate((el) => [getComputedStyle(el).unicodeBidi, getComputedStyle(el).textAlign]);
      expect(bidi, `${selector}: a run of its own direction`).toBe('plaintext');
      expect(['right', 'end', 'start'], `${selector}: aligned by the layout (${align})`).toContain(align);
    }
    // A left-to-right label in a right-to-left layout keeps its order and stands at the right: floated (the list is
    // open), padding-inline from the container's right edge.
    const [c, label] = [await box(container(page, 'mixed')), await box(part(page, 'mixed', '.floating'))];
    near(c.x + c.width - (label.x + label.width), await token(page, 'container-padding-inline-medium'), 'placed by the layout direction');
    // The input: a left-to-right value in a right-to-left layout is laid out left to right, from its own start.
    const long = input(page, 'long-value-rtl');
    expect(await long.evaluate((el) => [el.getAttribute('dir'), getComputedStyle(el).direction, (el as HTMLInputElement).scrollLeft])).toEqual(['auto', 'ltr', 0]);
    expect((await box(long)).x, 'the chevron is still at the layout’s end: the left').toBeGreaterThan((await box(part(page, 'long-value-rtl', '.chevron-glyph'))).x);
    // An empty input keeps the layout's direction: the caret and the placeholder at its start edge, the right.
    expect(await input(page, 'empty').evaluate((el) => [el.getAttribute('dir'), getComputedStyle(el).direction])).toEqual([null, 'rtl']);
    // (Firefox applies neither property to a placeholder: there it is laid out by the input's direction alone — README.)
    if (browserName !== 'firefox') expect(await input(page, 'mixed').evaluate((el) => [getComputedStyle(el, '::placeholder').unicodeBidi, getComputedStyle(el, '::placeholder').textAlign]), 'a left-to-right hint, its own run, at the right').toEqual(['plaintext', 'right']);
    expect(await css(input(page, 'mixed'), 'direction'), 'the empty input has the layout’s direction').toBe('rtl');
    // Digits have no direction of their own: the layout's.
    await set(page, 'empty', { inputValue: '123' });
    expect(await input(page, 'empty').getAttribute('dir')).toBeNull();
    await set(page, 'empty', { inputValue: 'abc' });
    expect(await input(page, 'empty').getAttribute('dir')).toBe('auto');
  });

  test('CMB-55, CMB-48: an option’s row, and the text in the input while it is the chosen option’s label, are in the language the option says (lang) and its words in the direction it says (dir) — its own or its group’s; the row is not turned; a match is still marked inside those words; text the person types is theirs', async ({ page, browserName }) => {
    const LANGUAGES = `<tanrei-option value="en" lang="en">English</tanrei-option><tanrei-option value="ja" lang="ja">日本語</tanrei-option><tanrei-option value="zh-CN" lang="zh-CN">简体中文</tanrei-option><tanrei-option value="hi" lang="hi">हिन्दी</tanrei-option><tanrei-option value="es" lang="es">Español</tanrei-option><tanrei-option value="ar" lang="ar" dir="rtl">العربية (AR)</tanrei-option><tanrei-option value="none">Other</tanrei-option><tanrei-option-group label="Deutsch (DE)" lang="de" dir="ltr"><tanrei-option value="de-AT">Österreich</tanrei-option><tanrei-option value="de-CH" lang="de-CH" supporting-text="Schwiiz">Schweiz</tanrei-option></tanrei-option-group>`;
    await mount(page, [fx('languages', { label: 'Language', value: 'ja', open: true }, LANGUAGES), fx('closed', { label: 'Language', value: 'ar' }, LANGUAGES), fx('plain', { value: 'tokyo' })], { reducedMotion: true });
    await page.locator('.stage').evaluateAll((all) => all.forEach((el) => el.setAttribute('lang', 'fr')));
    await expect.poll(() => part(page, 'languages', '.scroll .row').count()).toBe(9);
    // The option is data and is never drawn, so nothing
    // inherits its `lang` and `dir`; the row drawn from it takes them.
    const rows = () =>
      part(page, 'languages', '.scroll .row').evaluateAll((all) =>
        all.map((el) => {
          const [label, said] = [el.querySelector('.option-label')!, el.querySelector('.option-label > .said')];
          return {
            label: label.textContent,
            lang: el.getAttribute('lang'),
            // What the browser takes the words to be in: the selector that asks.
            spoken: ['en', 'ja', 'zh-CN', 'hi', 'es', 'ar', 'de', 'de-CH', 'fr'].filter((lang) => label.matches(`:lang(${lang})`)).join(' '),
            dir: said?.getAttribute('dir') ?? null,
            // The row itself is never turned: its columns are the layout's.
            row: [el.getAttribute('dir'), getComputedStyle(el).direction],
            words: getComputedStyle(said ?? label).direction,
          };
        }),
      );
    expect(await rows()).toEqual([
      { label: 'English', lang: 'en', spoken: 'en', dir: null, row: [null, 'ltr'], words: 'ltr' },
      { label: '日本語', lang: 'ja', spoken: 'ja', dir: null, row: [null, 'ltr'], words: 'ltr' },
      { label: '简体中文', lang: 'zh-CN', spoken: 'zh-CN', dir: null, row: [null, 'ltr'], words: 'ltr' },
      { label: 'हिन्दी', lang: 'hi', spoken: 'hi', dir: null, row: [null, 'ltr'], words: 'ltr' },
      { label: 'Español', lang: 'es', spoken: 'es', dir: null, row: [null, 'ltr'], words: 'ltr' },
      { label: 'العربية (AR)', lang: 'ar', spoken: 'ar', dir: 'rtl', row: [null, 'ltr'], words: 'rtl' },
      // An option that says nothing carries nothing: it is in the field's language — the stage's here, French, where
      // the engine hands an ancestor's language down into a shadow root (Chromium does; Firefox and WebKit answer
      // `:lang()` there from the document's or with none, which is theirs and not the row's).
      { label: 'Other', lang: null, spoken: browserName === 'chromium' ? 'fr' : expect.any(String), dir: null, row: [null, 'ltr'], words: 'ltr' },
      // A group's are its options' unless one says its own.
      { label: 'Österreich', lang: 'de', spoken: 'de', dir: 'ltr', row: [null, 'ltr'], words: 'ltr' },
      { label: 'Schweiz', lang: 'de-CH', spoken: 'de de-CH', dir: 'ltr', row: [null, 'ltr'], words: 'ltr' },
    ]);
    const swiss = row(page, 'languages', 'Schweiz');
    expect(await swiss.locator('.option-supporting').evaluate((el) => [el.matches(':lang(de-CH)'), el.querySelector('.said')?.getAttribute('dir')])).toEqual([true, 'ltr']);
    // The group's title is in the group's language and direction.
    expect(await part(page, 'languages', '.group').evaluate((el) => [el.getAttribute('lang'), el.getAttribute('dir'), el.querySelector('.group-title')!.matches(':lang(de)'), el.querySelector('.group-title > .said')?.getAttribute('dir')])).toEqual(['de', null, true, 'ltr']);
    // The words that say their direction are still placed by the layout: the Arabic name begins at the row's start
    // edge, the left, and its check is at the right — and "(AR)" stands at the LEFT of the name, as its direction has it.
    const arabic = row(page, 'languages', 'العربية \\(AR\\)');
    const [name, english, mark] = [await box(arabic.locator('.option-label')), await box(row(page, 'languages', 'English').locator('.option-label')), await box(arabic.locator('.mark'))];
    near(name.x, english.x, 'the same start edge as every row');
    expect(mark.x).toBeGreaterThan(name.x + name.width - 1);
    const ends = await arabic.locator('.said').evaluate((el) => {
      const text = [...el.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent!.trim())!;
      const at = (from: number, to: number) => {
        const range = document.createRange();
        range.setStart(text, from);
        range.setEnd(text, to);
        return range.getBoundingClientRect().x;
      };
      return { arabic: at(0, 7), latin: at(text.textContent!.indexOf('AR'), text.textContent!.indexOf('AR') + 2) };
    });
    expect(ends.latin, 'right to left: what is written last stands at the left').toBeLessThan(ends.arabic);
    // The text in the input is the chosen option's label until the person changes it: its language, and its direction
    // where the option says one (else the text's own, CMB-55).
    const shown = (id: string) => input(page, id).evaluate((el) => [(el as HTMLInputElement).value, el.getAttribute('lang'), el.getAttribute('dir'), getComputedStyle(el).direction]);
    expect(await shown('languages')).toEqual(['日本語', 'ja', 'auto', 'ltr']);
    expect(await shown('closed')).toEqual(['العربية (AR)', 'ar', 'rtl', 'rtl']);
    expect(await shown('plain'), 'an option that says neither: as before').toEqual(['Tokyo', null, 'auto', 'ltr']);
    if (browserName === 'chromium') {
      const cdp = await page.context().newCDPSession(page);
      const { nodes } = await cdp.send('Accessibility.getFullAXTree');
      await cdp.detach();
      expect(nodes.filter((node) => !node.ignored && node.role?.value === 'option').map((node) => node.name?.value)).toEqual(['English', '日本語', '简体中文', 'हिन्दी', 'Español', 'العربية (AR)', 'Other', 'Österreich', 'Schweiz']);
    }
    // What the person types is theirs: no language is claimed for it, and its direction is its own.
    await input(page, 'closed').fill('Esp');
    expect(await shown('closed')).toEqual(['Esp', null, 'auto', 'ltr']);
    // The match is marked inside the option's words, in their language and direction.
    await input(page, 'closed').fill('الع');
    const found = part(page, 'closed', '.scroll .row');
    await expect(found).toHaveCount(1);
    expect(await found.evaluate((el) => [el.getAttribute('lang'), el.querySelector('.option-label > .said')?.getAttribute('dir'), el.querySelector('.option-label > .said')?.textContent, !!el.querySelector('.option-label > .said > *')])).toEqual(['ar', 'rtl', 'العربية (AR)', true]);
    // Chosen again, the text is the option's again.
    await input(page, 'closed').press('Enter');
    expect(await shown('closed')).toEqual(['العربية (AR)', 'ar', 'rtl', 'rtl']);
  });

  test('CMB-56: a variant or size the active design system does not have is drawn with the default’s tokens and reported; a variant a layer added draws no label of its own and its edge as a stacked combobox does, with its own tokens; a filter the combobox does not know behaves as contains and a status as idle, each reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('plain', { value: 'tokyo' }), fx('odd', { variant: 'ghost', size: 'huge', value: 'tokyo' }), fx('layer', { variant: 'soft', value: 'tokyo' }), fx('props', { filter: 'fuzzy', status: 'waiting', statusText: 'x' })], { reducedMotion: true });
    // Unknown to the system: the default's tokens.
    near((await box(container(page, 'odd'))).height, (await box(container(page, 'plain'))).height, 'the default size');
    expect(await css(container(page, 'odd'), 'background-color')).toBe(await css(container(page, 'plain'), 'background-color'));
    expect(await part(page, 'odd', '.field').getAttribute('data-layout'), 'laid out as stacked').toBe('stacked');
    await expect(part(page, 'odd', '.floating'), 'no label of its own').toHaveCount(0);
    await expect.poll(() => seen.filter((w) => w.includes('CMB-56')).some((w) => w.includes('ghost'))).toBe(true);
    await expect.poll(() => seen.filter((w) => w.includes('CMB-56')).some((w) => w.includes('huge'))).toBe(true);
    // A variant a layer added: its own tokens, no label and the edge inside. Its Field draws the label row (CMB-61).
    await override(page, { [T('soft-container-color')]: 'rgb(1, 2, 3)', [T('soft-input-color')]: 'rgb(4, 5, 6)' });
    await set(page, 'layer', { placeholder: 'x' });
    await expect.poll(() => css(container(page, 'layer'), 'background-color')).toBe('rgb(1, 2, 3)');
    expect(await css(input(page, 'layer'), 'color')).toBe('rgb(4, 5, 6)');
    expect(await part(page, 'layer', '.field').getAttribute('data-layout')).toBe('stacked');
    await expect(part(page, 'layer', '.edge')).toHaveCount(1);
    await expect(part(page, 'layer', '.floating')).toHaveCount(0);
    await frame(page, 'layered', { label: 'Country' }, { variant: 'soft' });
    await expect(fieldRow(page, 'layered', '.label-row > .label'), 'the Field draws the label of a variant laid out as stacked').toHaveText('Country');
    // The other props: the first value's behaviour, each reported.
    await focusInput(page, 'props');
    await type(page, 'ky');
    expect(await read(page, 'props'), 'filter: contains; status: idle').toMatchObject({ rows: ['Kyoto', 'Tokyo'], status: ['x', ''] });
    expect(await part(page, 'props', '[role="listbox"]').getAttribute('aria-busy')).toBeNull();
    for (const word of ['fuzzy', 'waiting']) await expect.poll(() => seen.some((w) => w.includes('CMB-56') && w.includes(word)), { message: word }).toBe(true);
  });

  test('CMB-57: a combobox that holds no option, no status and nothing to say draws its field as it is, stays focusable and editable, and does not open by any input or because open is true; two options that share a value stand for the first; an option without a label still renders; an option whose value is empty is drawn and not chosen — each reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('bare', { open: true, inline: false, allowCustomValue: true }, []), fx('twice', { value: 'x' }, [option('First', 'x'), option('Second', 'x'), option('', 'y'), option('None', '')])], { reducedMotion: true });
    await listen(page, 'bare');
    await expect(container(page, 'bare')).toBeVisible();
    expect(await read(page, 'bare'), 'open is true, and no list is drawn').toMatchObject({ shown: false, expanded: 'false' });
    await focusInput(page, 'bare');
    await page.keyboard.press('ArrowDown');
    await type(page, 'abc');
    await settle(page, 'bare');
    expect(await read(page, 'bare'), 'focusable and editable').toMatchObject({ focused: true, text: 'abc', shown: false });
    expect(others(await heard(page))).toEqual([]);
    await expect(rows(page, 'bare')).toHaveCount(0);
    expect((await box(part(page, 'bare', '.list'))) ?? null, 'no empty list').toBeNull();
    // Repeated values: the first; an empty label and an empty value still render.
    expect(await read(page, 'twice')).toMatchObject({ text: 'First' });
    await focusInput(page, 'twice');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'twice').toBe(true);
    expect(await read(page, 'twice')).toMatchObject({ rows: ['First', 'Second', '', 'None'], selected: ['First'], active: 'First' });
    await page.keyboard.press('End');
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
    expect((await read(page, 'twice')).active).toBe('None');
    await page.keyboard.press('Enter');
    expect(await read(page, 'twice'), 'the empty value is not a choice').toMatchObject({ value: 'x', open: true });
    for (const words of ['share the value', 'empty label', 'empty value']) await expect.poll(() => seen.some((w) => w.includes('CMB-57') && w.includes(words)), { message: words }).toBe(true);
  });

  test('CMB-58: in a narrow window the list narrows with its container, shortens to the room it has and scrolls, and stays an anchored list; where the browser reports an on-screen keyboard, its top edge is the window’s edge for the list', async ({ page }) => {
    // A window in which the room below a box at the top is less than list.max-height.
    await page.setViewportSize({ width: 320, height: 380 });
    await mount(page, [fx('one', { value: 'o2' }, MANY)], { reducedMotion: true });
    await host(page, 'one').evaluate((el) => (el.style.inlineSize = '100%'));
    await page.addStyleTag({ content: '.stage:has(> tanrei-combobox) { box-sizing: border-box; inline-size: 240px; }' });
    await focusInput(page, 'one');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'one').toBe(true);
    const margin = await token(page, 'list-viewport-margin');
    const [c, l] = [await box(container(page, 'one')), await box(part(page, 'one', '.list'))];
    near(l.width, c.width, 'as narrow as its container');
    expect(l.y + l.height, 'inside the window’s margin').toBeLessThanOrEqual(380 - margin + 0.6);
    expect(l.height).toBeLessThan((await token(page, 'list-max-height')) - 1);
    expect(await part(page, 'one', '.scroll').evaluate((el) => el.scrollHeight > el.clientHeight), 'it scrolls').toBe(true);
    expect(await part(page, 'one', '.surface').evaluate((el) => [el.matches(':popover-open'), el.localName, getComputedStyle(el).position]), 'still an anchored list: no sheet, no dialog').toEqual([true, 'div', 'fixed']);
    expect(await page.evaluate(() => document.querySelector('dialog, [role="dialog"]'))).toBeNull();
    await page.keyboard.press('Escape');
    await closedList(page, 'one');
    // The keyboard: the visual viewport loses its lower 400 pixels (the layout viewport keeps its size), and its top
    // edge is the window's edge for the list.
    await page.setViewportSize({ width: 320, height: 700 });
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'one').toBe(true);
    const before = await box(part(page, 'one', '.list'));
    await page.evaluate((cover) => {
      const fake = { height: window.innerHeight - cover, width: window.innerWidth, offsetTop: 0, offsetLeft: 0, scale: 1, addEventListener() {}, removeEventListener() {} };
      Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => fake });
      window.dispatchEvent(new Event('resize'));
    }, 400);
    await expect.poll(async () => (await box(part(page, 'one', '.list'))).y + (await box(part(page, 'one', '.list'))).height).toBeLessThanOrEqual(300 - margin + 0.6);
    expect((await box(part(page, 'one', '.list'))).height, 'shorter than before the keyboard').toBeLessThan(before.height);
    expect((await read(page, 'one')).shown).toBe(true);
  });

  test('CMB-59: a form-associated element: it takes name and submits value — the chosen option’s value or the custom value, never the text of an edit that was not committed — resets to the value it was first given, is restored, follows a disabled fieldset, and reports a missing value while the Field that frames it says it is required and its value is empty', async ({ page }) => {
    await mount(page, [fx('base', {})]);
    await page.evaluate(async () => {
      document.body.insertAdjacentHTML(
        'beforeend',
        `<form id="f"><fieldset id="set"><tanrei-field label="City" required required-text="Required"><tanrei-combobox id="c" name="city" value="tokyo">
           <tanrei-option value="kyoto">Kyoto</tanrei-option><tanrei-option value="lisbon">Lisbon</tanrei-option><tanrei-option value="tokyo">Tokyo</tanrei-option></tanrei-combobox></tanrei-field>
           <tanrei-combobox id="font" name="font" label="Font" allow-custom-value><tanrei-option value="Inter">Inter</tanrei-option></tanrei-combobox></fieldset></form>`,
      );
      await (document.querySelector('#c') as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    });
    const combobox = page.locator('#c');
    const data = () => page.evaluate(() => [...new FormData(document.querySelector<HTMLFormElement>('#f')!).entries()].map(([k, v]) => `${k}=${String(v)}`));
    const done = () => combobox.evaluate((el) => (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete);
    expect(await combobox.evaluate((el) => [(el.constructor as unknown as { formAssociated: boolean }).formAssociated, (el as unknown as HTMLInputElement).form?.id, (el as unknown as HTMLInputElement).willValidate])).toEqual([true, 'f', true]);
    expect(await data()).toEqual(['city=tokyo', 'font=']);
    // An edit that was not committed is not submitted.
    await combobox.evaluate((el) => (el as HTMLElement).focus());
    await combobox.locator('.input').evaluate((el) => (el as HTMLInputElement).select());
    await type(page, 'lis');
    await done();
    expect(await data(), 'the text is "lis", the value still tokyo').toEqual(['city=tokyo', 'font=']);
    // Committed by Enter on the active option: the option's value, and change bubbles to the form.
    await page.evaluate(() => ((window as unknown as { __changes: number }).__changes = 0, document.querySelector('#f')!.addEventListener('change', () => ((window as unknown as { __changes: number }).__changes += 1))));
    await page.keyboard.press('Enter');
    await done();
    expect([await data(), await page.evaluate(() => (window as unknown as { __changes: number }).__changes)]).toEqual([['city=lisbon', 'font='], 1]);
    // A custom value is submitted as it was typed.
    await page.locator('#font').evaluate((el) => (el as HTMLElement).focus());
    await type(page, 'Recursive');
    await combobox.evaluate((el) => (el as HTMLElement).focus());
    await page.locator('#font').evaluate((el) => (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete);
    expect(await data()).toEqual(['city=lisbon', 'font=Recursive']);
    // Reset: back to the value attribute, and the text with it — an edit under way is dropped.
    await combobox.locator('.input').evaluate((el) => (el as HTMLInputElement).select());
    await type(page, 'ky');
    await page.evaluate(() => document.querySelector<HTMLFormElement>('#f')!.reset());
    await done();
    expect([await combobox.evaluate((el) => (el as unknown as { value: string }).value), await combobox.locator('.input').evaluate((el) => (el as HTMLInputElement).value), (await data())[0]]).toEqual(['tokyo', 'Tokyo', 'city=tokyo']);
    // Restored on navigation: the browser hands the saved value back.
    await combobox.evaluate((el) => (el as unknown as { formStateRestoreCallback(state: string, mode: string): void }).formStateRestoreCallback('kyoto', 'restore'));
    await done();
    expect([await combobox.evaluate((el) => (el as unknown as { value: string }).value), await combobox.locator('.input').evaluate((el) => (el as HTMLInputElement).value)]).toEqual(['kyoto', 'Kyoto']);
    // Required and empty: the form does not validate; the combobox never sets error itself.
    await combobox.evaluate((el) => ((el as unknown as { value: string }).value = ''));
    await done();
    expect(await page.evaluate(() => [document.querySelector<HTMLFormElement>('#f')!.checkValidity(), (document.querySelector('#c') as unknown as HTMLInputElement).validity.valueMissing, (document.querySelector('#c') as unknown as HTMLInputElement).validationMessage !== ''])).toEqual([false, true, true]);
    expect(await combobox.evaluate((el) => (el as unknown as { error: boolean }).error), 'it never sets error').toBe(false);
    // The message's anchor is the input: what the form reports focuses it.
    await page.evaluate(() => document.querySelector<HTMLFormElement>('#f')!.reportValidity());
    expect(await combobox.evaluate((el) => el.shadowRoot!.activeElement?.classList.contains('input'))).toBe(true);
    // A bare combobox is never required by itself: the other one, empty, is valid.
    expect(await page.evaluate(() => (document.querySelector('#font') as unknown as HTMLInputElement).validity.valid)).toBe(true);
    // A disabled fieldset: disabled, drawn so, and left out.
    await page.evaluate(() => (document.querySelector<HTMLFieldSetElement>('#set')!.disabled = true));
    await done();
    expect(await combobox.locator('.input').evaluate((el) => (el as HTMLInputElement).disabled)).toBe(true);
    expect(await combobox.locator('.field').getAttribute('data-disabled')).not.toBeNull();
    expect(await data()).toEqual([]);
    expect(await page.evaluate(() => document.querySelector<HTMLFormElement>('#f')!.checkValidity()), 'a disabled combobox is not validated').toBe(true);
  });
});

test.describe('the Field around it, the option elements and the options through a slot', () => {
  test('CMB-61: the combobox says to the Field that frames it that it draws the label while its variant floats one — the Field then draws no label row —, where its input text starts and the padding it keeps at its end — the Field’s supporting row starts and ends there, after a leading glyph too —, and that it is drawn focused for as long as its list is open, whether or not it has focus; it says each again when it changes, takes the Field’s name, description and states, and gives no count and no refusal', async ({ page }) => {
    await mount(page, [fx('other', {})], { reducedMotion: true });
    await frame(page, 'stacked', { label: 'City', supportingText: 'Where the order is sent, once it is paid for.' }, { value: 'tokyo' });
    await frame(page, 'outlined', { label: 'City', supportingText: 'Help.' }, { variant: 'outlined' });
    await frame(page, 'glyph', { label: 'Assignee', supportingText: 'Anyone in the workspace, by name.' }, {}, `${CITY_OPTIONS}<span slot="leading-icon">person_search</span>`);
    await frame(page, 'plain', { label: 'Postcode', supportingText: 'As it is written on the envelope.' }, { noChevron: true });
    await frame(page, 'rtl', { label: 'المدينة', supportingText: 'إلى أين يُرسل الطلب.' }, { value: 'tokyo' }, CITY_OPTIONS, 'rtl');
    // That it draws the label: the Field's row is there above a stacked combobox, and left out around one that floats.
    await expect(fieldRow(page, 'stacked', '.label-row > .label')).toHaveText('City');
    await expect(fieldRow(page, 'outlined', '.label-row')).toHaveCount(0);
    await expect(part(page, 'outlined', '.floating')).toHaveText('City');
    // …said again when the variant changes.
    await set(page, 'stacked', { variant: 'filled' });
    await expect(fieldRow(page, 'stacked', '.label-row')).toHaveCount(0);
    await set(page, 'stacked', { variant: 'stacked' });
    await expect(fieldRow(page, 'stacked', '.label-row > .label')).toHaveText('City');
    // Where its input text starts and ends: the supporting row starts at the text — after a leading glyph too — and
    // ends at the padding the box keeps at its end: beside a glyph before the chevron, the text's own without one.
    for (const [id, end] of [['stacked', 'container-padding-inline-with-icon-medium'], ['glyph', 'container-padding-inline-with-icon-medium'], ['plain', 'container-padding-inline-medium']] as const) {
      const [row, text, c] = [await box(fieldRow(page, id, '.supporting-text')), await box(input(page, id)), await box(container(page, id))];
      near(row.x, text.x, `${id}: the row starts where the input text starts`);
      near(c.x + c.width - (row.x + row.width), await token(page, end), `${id}: and ends at the box’s end padding`);
    }
    expect((await box(input(page, 'glyph'))).x - (await box(container(page, 'glyph'))).x, 'after the glyph, its padding and its gap').toBeGreaterThan((await token(page, 'container-padding-inline-with-icon-medium')) + (await token(page, 'icon-size-medium')));
    const [rtlRow, rtlText] = [await box(fieldRow(page, 'rtl', '.supporting-text')), await box(input(page, 'rtl'))];
    near(rtlRow.x + rtlRow.width, rtlText.x + rtlText.width, 'right to left: from the text’s start, the right');
    // …said again when a glyph comes: the clear button changes nothing at the start, the leading glyph does.
    const before = (await box(fieldRow(page, 'plain', '.supporting-text'))).x;
    await host(page, 'plain').evaluate((el) => el.insertAdjacentHTML('beforeend', '<span slot="leading-icon">location_on</span>'));
    await expect.poll(async () => (await box(fieldRow(page, 'plain', '.supporting-text'))).x).toBeGreaterThan(before + 1);
    near((await box(fieldRow(page, 'plain', '.supporting-text'))).x, (await box(input(page, 'plain'))).x, 'the row follows the text');
    // That it is drawn focused: for as long as its list is open, with focus elsewhere.
    const drawnFocused = (id: string) => fieldRow(page, id, '.frame').evaluate((el) => el.hasAttribute('data-focused'));
    await focusInput(page, 'other');
    expect(await drawnFocused('stacked')).toBe(false);
    await set(page, 'stacked', { open: true });
    await expect.poll(() => drawnFocused('stacked'), { message: 'open: the rows are drawn focused' }).toBe(true);
    expect((await read(page, 'stacked')).focused, 'and it has no focus').toBe(false);
    await set(page, 'stacked', { open: false });
    await expect.poll(() => drawnFocused('stacked')).toBe(false);
    // An open over nothing to show is no list (CMB-57), and is not said.
    await host(page, 'outlined').evaluate((el) => el.replaceChildren());
    await set(page, 'outlined', { open: true });
    expect([await drawnFocused('outlined'), (await read(page, 'outlined')).shown]).toEqual([false, false]);
    // What it takes: the name, the description and the states (CMB-10, CMB-12, CMB-46 hold each in full).
    await setFrame(page, 'stacked', { error: true, errorText: 'We do not deliver there yet.', required: true, requiredText: 'Required' });
    expect(await input(page, 'stacked').evaluate((el) => [el.getAttribute('aria-label'), el.getAttribute('aria-invalid'), el.getAttribute('aria-required')])).toEqual(['City', 'true', 'true']);
    expect(await description(page, 'stacked'), 'the error text in the help’s place (FLD-11)').toBe('We do not deliver there yet.');
    // No count, and no refusal: a text that names no option is given up, and the Field is not put in error by it.
    await focusInput(page, 'plain');
    await type(page, 'zzz');
    await blurInput(page, 'plain');
    await settle(page, 'plain');
    expect(await fieldRow(page, 'plain', '.frame').evaluate((el) => el.hasAttribute('data-error'))).toBe(false);
    await expect(fieldRow(page, 'plain', '.counter')).toHaveCount(0);
    await expect(fieldRow(page, 'plain', '.supporting-text')).toHaveText('As it is written on the envelope.');
  });

  test('CMB-62: the combobox draws no label row above itself, no requirement tag, no help and no error text — given the attributes of the frame it was, it draws none of it; bare it is complete: named by its own label, as wide as its place and exactly as tall as its container; a Field around it is the supported pair and reports nothing, and in a field group it follows the group’s disabled', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      fx('bare', { value: 'tokyo' }),
      fx('large', { size: 'large' }),
      fx('floating', { variant: 'filled', value: 'tokyo' }),
      fx('old', { required: true, requiredMark: 'tag', requiredText: 'Required', optionalText: 'Optional', supportingText: 'Help.', errorText: 'No.' }, `${CITY_OPTIONS}<span slot="label-icon">schedule</span>`),
    ]);
    for (const id of ['bare', 'large', 'floating', 'old']) {
      const [h, c] = [await box(host(page, id)), await box(container(page, id))];
      near(h.y, c.y, `${id}: nothing above the container`);
      near(h.height, c.height, `${id}: exactly as tall as its container`);
      near(h.width, c.width, `${id}: exactly as wide`);
      await expect(part(page, id, '.label-row, .supporting-text, .requirement-tag, tanrei-tag, .label-icon, .counter, .announcer'), id).toHaveCount(0);
      expect(await input(page, id).getAttribute('aria-label'), `${id}: named by its own label`).toBe('City');
    }
    // What it was given as a frame is not drawn — the slot it no longer has is not rendered either.
    expect(await host(page, 'old').evaluate((el) => el.shadowRoot!.textContent ?? '')).not.toMatch(/Required|Optional|Help|No\.|schedule/);
    expect(await host(page, 'old').locator('[slot="label-icon"]').evaluate((el) => el.getBoundingClientRect().width)).toBe(0);
    // Complete bare: it opens, chooses and reports as one control.
    await listen(page, 'bare');
    await focusInput(page, 'bare');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'bare').toBe(true);
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    expect(await read(page, 'bare')).toMatchObject({ value: 'nairobi', text: 'Nairobi', open: false });
    expect(others(await heard(page))).toEqual(['toggle true', 'change nairobi', 'toggle false select']);
    // A Field around it is the pair a combobox field is: nothing is reported. In a field group it follows `disabled`.
    await page.evaluate(async () => {
      document.body.insertAdjacentHTML(
        'beforeend',
        `<tanrei-field-group id="g" label="Delivery" disabled>
           <tanrei-combobox id="in-group" label="City" value="tokyo"><tanrei-option value="tokyo">Tokyo</tanrei-option></tanrei-combobox>
         </tanrei-field-group>
         <tanrei-field id="fld" label="Outer"><tanrei-combobox id="in-field"><tanrei-option value="tokyo">Tokyo</tanrei-option></tanrei-combobox></tanrei-field>`,
      );
      await customElements.whenDefined('tanrei-field-group');
      await (document.querySelector('#in-group') as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      await (document.querySelector('#fld') as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    });
    const inGroup = page.locator('#in-group');
    await expect.poll(() => inGroup.locator('.input').evaluate((el) => (el as HTMLInputElement).disabled)).toBe(true);
    await page.evaluate(() => document.querySelector('#g')!.removeAttribute('disabled'));
    await expect.poll(() => inGroup.locator('.input').evaluate((el) => (el as HTMLInputElement).disabled)).toBe(false);
    await expect.poll(() => page.locator('#in-field .input').getAttribute('aria-label')).toBe('Outer');
    await frames(page, 4);
    expect(seen.filter((w) => w.includes('FLD-15') || w.includes('CMB-12')), 'the pair is supported, and named').toEqual([]);
  });

  test('CMB-21, CMB-30: toggle is composed and does not bubble — it is heard on the combobox, and on an element whose shadow root holds the combobox with that element as its target and open already the new one, and by no ancestor of either', async ({ page }) => {
    await mount(page, [fx('one', {})], { reducedMotion: true });
    await page.evaluate(async () => {
      const w = window as unknown as { __toggles: string[] };
      w.__toggles = [];
      const hear = (who: string) => (event: Event) => w.__toggles.push(`${who} ${(event.target as Element).localName} ${String((event as CustomEvent<{ open: boolean }>).detail.open)} ${String(event.composed)} ${String(event.bubbles)}`);
      const one = document.querySelector('tanrei-combobox')!;
      one.addEventListener('toggle', hear('combobox'));
      one.closest('.stage')!.addEventListener('toggle', hear('ancestor'));
      // A product's own element around a combobox.
      const outer = document.createElement('div');
      outer.id = 'outer';
      const holder = document.createElement('x-holder');
      holder.attachShadow({ mode: 'open' }).innerHTML = '<tanrei-combobox label="Plan"><tanrei-option value="free">Free</tanrei-option><tanrei-option value="team">Team</tanrei-option></tanrei-combobox>';
      outer.append(holder);
      document.querySelector('main')!.append(outer);
      holder.addEventListener('toggle', (event) => w.__toggles.push(`holder ${(event.target as Element).localName} ${String((holder.shadowRoot!.querySelector('tanrei-combobox') as HTMLElement & { open: boolean }).open)}`));
      outer.addEventListener('toggle', hear('outer'));
      await (holder.shadowRoot!.querySelector('tanrei-combobox') as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    });
    const toggles = () => page.evaluate(() => (window as unknown as { __toggles: string[] }).__toggles.splice(0));
    await focusInput(page, 'one');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'one').toBe(true);
    await page.keyboard.press('Escape');
    await closedList(page, 'one');
    expect(await toggles()).toEqual(['combobox tanrei-combobox true true false', 'combobox tanrei-combobox false true false']);
    await page.locator('x-holder').evaluate((el) => (el.shadowRoot!.querySelector('tanrei-combobox') as HTMLElement).focus());
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => page.locator('x-holder').evaluate((el) => (el.shadowRoot!.querySelector('tanrei-combobox') as HTMLElement & { open: boolean }).open)).toBe(true);
    expect(await toggles(), 'heard on the host around it, as its own; by no ancestor').toEqual(['holder x-holder true']);
  });

  test('CMB-31: a <slot> among its children stands for the elements assigned to it — options a host of its own gives it through a slot, at any depth, are read in the slot’s place and are the product’s own elements, never copies; every change that a combobox with options as children answers is answered alike through a slot; a slot that names one of its own slots passes no option; an option’s own lang and dir are looked for up to its owner; a value set before its options are there shows its option when they come, with no change', async ({ page }) => {
    await mount(page, [fx('direct', { open: true, label: 'Plan' }, '<tanrei-option value="first">First</tanrei-option>')], { reducedMotion: true });
    await page.evaluate(async () => {
      // A product's own element that passes its children to a combobox, and one that passes its own to that one.
      customElements.define(
        'x-pass',
        class extends HTMLElement {
          constructor() {
            super();
            this.attachShadow({ mode: 'open' }).innerHTML = '<tanrei-combobox label="Plan" open inline><tanrei-option value="first">First</tanrei-option><slot></slot><slot name="leading-icon" slot="leading-icon"></slot></tanrei-combobox>';
          }
        },
      );
      customElements.define(
        'x-deep',
        class extends HTMLElement {
          constructor() {
            super();
            this.attachShadow({ mode: 'open' }).innerHTML = '<x-pass><slot></slot></x-pass>';
          }
        },
      );
      for (const tag of ['x-pass', 'x-deep']) {
        const stage = Object.assign(document.createElement('div'), { className: 'stage' });
        stage.style.cssText = 'position: relative; inline-size: 280px; block-size: 440px;';
        stage.append(document.createElement(tag));
        document.querySelector('main')!.append(stage);
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    // The three readers: the combobox itself, one behind a slot, and one behind two.
    const READERS = { direct: `document.querySelector('[data-fixture="direct"] tanrei-combobox')`, pass: `document.querySelector('x-pass').shadowRoot.querySelector('tanrei-combobox')`, deep: `document.querySelector('x-deep').shadowRoot.querySelector('x-pass').shadowRoot.querySelector('tanrei-combobox')` } as const;
    const OWNERS = { direct: READERS.direct, pass: `document.querySelector('x-pass')`, deep: `document.querySelector('x-deep')` } as const;
    const list = (which: keyof typeof READERS) =>
      page.evaluate(async (expression) => {
        const combobox = (0, eval)(expression) as HTMLElement & { updateComplete: Promise<unknown> };
        await combobox.updateComplete;
        await combobox.updateComplete;
        const root = combobox.shadowRoot!;
        return [...root.querySelectorAll('.scroll .row, .scroll .group-title')].map((el) => (el.classList.contains('group-title') ? `[${el.textContent}]` : `${el.querySelector('.option-label')!.textContent}${el.querySelector('.option-supporting') ? ` (${el.querySelector('.option-supporting')!.textContent})` : ''}${el.getAttribute('aria-disabled') === 'true' ? ' ×' : ''}${el.getAttribute('lang') ? ` @${el.getAttribute('lang')}` : ''}`));
      }, READERS[which]);
    const change = (which: keyof typeof OWNERS, script: string) => page.evaluate(([owner, body]) => new Function('owner', body)((0, eval)(owner)), [OWNERS[which], script] as const);
    // One list of cases, run for each reader: an option added, removed and moved; its label by text and by attribute;
    // value, supporting-text, leading-icon and disabled; lang; a group, its label, and an option into and out of it.
    const CASES: [string, string[]][] = [
      [`owner.insertAdjacentHTML('beforeend', '<tanrei-option value="a">Alpha</tanrei-option><tanrei-option value="b">Beta</tanrei-option>')`, ['First', 'Alpha', 'Beta']],
      [`owner.querySelector('[value="a"]').textContent = 'Aleph'`, ['First', 'Aleph', 'Beta']],
      [`owner.querySelector('[value="b"]').setAttribute('label', 'Bet')`, ['First', 'Aleph', 'Bet']],
      [`owner.querySelector('[value="b"]').setAttribute('supporting-text', 'Second'); owner.querySelector('[value="b"]').setAttribute('disabled', '')`, ['First', 'Aleph', 'Bet (Second) ×']],
      [`owner.append(owner.querySelector('[value="a"]'))`, ['First', 'Bet (Second) ×', 'Aleph']],
      [`owner.querySelector('[value="a"]').setAttribute('lang', 'he')`, ['First', 'Bet (Second) ×', 'Aleph @he']],
      [`owner.insertAdjacentHTML('beforeend', '<tanrei-option-group label="More" lang="ja"><tanrei-option value="c">Gamma</tanrei-option></tanrei-option-group>')`, ['First', 'Bet (Second) ×', 'Aleph @he', '[More]', 'Gamma @ja']],
      [`owner.querySelector('tanrei-option-group').setAttribute('label', 'Others')`, ['First', 'Bet (Second) ×', 'Aleph @he', '[Others]', 'Gamma @ja']],
      [`owner.querySelector('tanrei-option-group').insertAdjacentHTML('beforeend', '<tanrei-option value="d">Delta</tanrei-option>')`, ['First', 'Bet (Second) ×', 'Aleph @he', '[Others]', 'Gamma @ja', 'Delta @ja']],
      [`owner.querySelector('[value="c"]').remove(); owner.querySelector('[value="b"]').remove()`, ['First', 'Aleph @he', '[Others]', 'Delta @ja']],
      [`owner.querySelector('tanrei-option-group').remove()`, ['First', 'Aleph @he']],
    ];
    for (const which of ['direct', 'pass', 'deep'] as const) {
      expect(await list(which), `${which}: at first`).toEqual(['First']);
      for (const [script, expected] of CASES) {
        await change(which, script);
        await expect.poll(() => list(which), { message: `${which}: ${script}` }).toEqual(expected);
      }
    }
    // The option read is the product's own element, never a copy; and its children are still its owner's.
    for (const which of ['pass', 'deep'] as const) {
      expect(await page.evaluate(([reader, owner]) => {
        const combobox = (0, eval)(reader) as HTMLElement;
        const mine = (0, eval)(owner) as HTMLElement;
        const option = mine.querySelector('[value="a"]')!;
        // Choosing its row sets the value its element holds.
        const row = [...combobox.shadowRoot!.querySelectorAll<HTMLElement>('.scroll .row')].find((each) => each.textContent!.includes('Aleph'))!;
        row.click();
        return [option.parentElement === mine, combobox.querySelectorAll('tanrei-option').length, (combobox as unknown as { value: string }).value];
      }, [READERS[which], OWNERS[which]] as const), which).toEqual([true, 1, 'a']);
    }
    // A slot that names a slot of the combobox's own passes a glyph: its content is not an option.
    await change('pass', `owner.insertAdjacentHTML('beforeend', '<tanrei-option slot="leading-icon" value="z">Not an option</tanrei-option>')`);
    await change('pass', `owner.shadowRoot.querySelector('tanrei-combobox').open = true`);
    await expect.poll(() => list('pass')).toEqual(['First', 'Aleph @he']);
    // The owner's own language is inherited, and is not written on a row: only what an option or its group says.
    await change('deep', `owner.lang = 'fr'; owner.shadowRoot.querySelector('x-pass').shadowRoot.querySelector('tanrei-combobox').open = true; owner.insertAdjacentHTML('beforeend', '<tanrei-option value="e">Epsilon</tanrei-option>')`);
    await expect.poll(() => list('deep')).toEqual(['First', 'Aleph @he', 'Epsilon']);
    // A value set before its options are there: nothing is chosen until they are read, then the option, with no change.
    const late = await page.evaluate(async () => {
      const holder = document.createElement('x-pass');
      const combobox = holder.shadowRoot!.querySelector('tanrei-combobox') as HTMLElement & { value: string; inputValue: string; updateComplete: Promise<unknown> };
      let changes = 0;
      holder.addEventListener('change', () => (changes += 1));
      combobox.value = 'late';
      document.querySelector('main')!.append(holder);
      await combobox.updateComplete;
      const before = combobox.inputValue;
      holder.insertAdjacentHTML('beforeend', '<tanrei-option value="late">Later</tanrei-option>');
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await combobox.updateComplete;
      return [before, combobox.inputValue, combobox.value, changes];
    });
    expect(late).toEqual(['', 'Later', 'late', 0]);
  });

  test('the option elements are the select’s, defined once: the combobox reads them again when an attribute, a property, the text or the children change (CMB-17, CMB-31)', async ({ page }) => {
    await mount(page, [fx('one', { value: 'a', open: true }, '<tanrei-option value="a">Alpha</tanrei-option><tanrei-option value="b" label="Beta">ignored</tanrei-option>')]);
    expect(await page.evaluate(() => [customElements.get('tanrei-option'), customElements.get('tanrei-option-group')].map((defined) => typeof defined))).toEqual(['function', 'function']);
    expect(await read(page, 'one')).toMatchObject({ rows: ['Alpha', 'Beta'], text: 'Alpha' });
    await host(page, 'one').evaluate((el) => {
      el.querySelector('[value="a"]')!.textContent = 'Aleph';
      (el.querySelector('[value="b"]') as HTMLElement & { supportingText: string }).supportingText = 'Second';
      el.insertAdjacentHTML('beforeend', '<tanrei-option-group label="More"><tanrei-option value="c" disabled>Gamma</tanrei-option></tanrei-option-group>');
    });
    await settle(page, 'one');
    await expect.poll(async () => (await read(page, 'one')).rows).toEqual(['Aleph', 'Beta', 'Gamma']);
    expect((await read(page, 'one')).text, 'the chosen option’s new label').toBe('Aleph');
    await expect(row(page, 'one', 'Beta').locator('.option-supporting')).toHaveText('Second');
    await expect(part(page, 'one', '.group-title')).toHaveText(['More']);
    expect(await row(page, 'one', 'Gamma').getAttribute('aria-disabled')).toBe('true');
  });

  test('the default system leaves the filled and outlined comboboxes out, and says so once per element in a debug build; they still render and work', async ({ page }) => {
    const seen = warnings(page);
    await mountSpec(page, ['filled-value', 'outlined-value', 'stacked-value'], { reducedMotion: true });
    await expect.poll(() => seen.filter((w) => w.includes('(availability)')).length).toBe(2);
    await focusInput(page, 'filled-value');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    expect(await read(page, 'filled-value')).toMatchObject({ value: 'nairobi', text: 'Nairobi' });
  });
});

// The rows are drawn while the list is shown and at no other time, and
// a list of more than a hundred options draws the rows near its scroll box. Counted, never timed.
test.describe('the rows: drawn while the list is shown, and in a long list those near the box that scrolls', () => {
  test('CMB-22: a list drawn open in place and turned to the overlay while it stays open (the test attribute inline, taken away) is presented in the top layer with every row drawn', async ({ page }) => {
    const id = 'stacked-open';
    await mountSpec(page, [id], { reducedMotion: true });
    await shownList(page, id).toBe(true);
    expect(await part(page, id, '.surface').evaluate((el) => [el.classList.contains('inline'), el.matches(':popover-open')])).toEqual([true, false]);
    await set(page, id, { inline: false });
    await expect.poll(() => part(page, id, '.surface').evaluate((el) => [el.classList.contains('inline'), el.matches(':popover-open')])).toEqual([false, true]);
    expect((await read(page, id)).open).toBe(true);
    const rows = part(page, id, '.scroll .row');
    expect(await rows.count()).toBeGreaterThan(0);
    await expect.poll(() => rows.evaluateAll((all) => all.every((el) => el.getBoundingClientRect().height > 0))).toBe(true);
    // And back, in place again.
    await set(page, id, { inline: true });
    await expect.poll(() => part(page, id, '.surface').evaluate((el) => [el.classList.contains('inline'), el.matches(':popover-open')])).toEqual([true, false]);
    await expect.poll(() => rows.evaluateAll((all) => all.length > 0 && all.every((el) => el.getBoundingClientRect().height > 0))).toBe(true);
  });

  const many = (count: number) => Array.from({ length: count }, (_, i) => option(`Option ${i + 1}`, `o${i + 1}`));
  /** What the combobox's shadow root holds, counted. */
  const counted = (page: P, id: string) =>
    host(page, id).evaluate((el) => {
      const root = el.shadowRoot!;
      return { elements: root.querySelectorAll('*').length, rows: root.querySelectorAll('[role="option"]').length, rooms: root.querySelectorAll('.skipped').length };
    });
  /** The option `aria-activedescendant` names — an element of the shadow root, or null — with what it says of its place and whether the whole of it is in the box that scrolls. */
  const activeRow = (page: P, id: string) =>
    host(page, id).evaluate((el) => {
      const root = el.shadowRoot!;
      const named = root.querySelector('.input')!.getAttribute('aria-activedescendant');
      const row = named ? root.getElementById(named) : null;
      if (!row) return null;
      const [r, s] = [row.getBoundingClientRect(), root.querySelector('.scroll')!.getBoundingClientRect()];
      return { label: row.querySelector('.option-label')!.textContent, position: row.getAttribute('aria-posinset'), size: row.getAttribute('aria-setsize'), inView: r.top >= s.top - 0.6 && r.bottom <= s.bottom + 0.6 };
    });
  const scrollBox = (page: P, id: string) => part(page, id, '.scroll').evaluate((el) => ({ top: el.scrollTop, height: el.scrollHeight, view: el.clientHeight }));
  /** Turns the wheel over the list, a part of a page at a time (an engine may scroll no further for one turn), until the box has scrolled past `past` and stands still. */
  const wheelPast = async (page: P, id: string, past: number) => {
    for (let turn = 0; turn < 400 && (await scrollBox(page, id)).top <= past; turn++) {
      const before = (await scrollBox(page, id)).top;
      await page.mouse.wheel(0, 200);
      await expect.poll(async () => (await scrollBox(page, id)).top, { message: `turn ${turn}` }).toBeGreaterThan(before);
    }
    // …and has come to rest. An engine may take a turn of the wheel over many frames (WebKit on Linux: 200 px in
    // about ten steps over 230 ms), and the loop above ends at the first of them: what is read of the rows, and a
    // press, would otherwise meet a list still moving under the pointer.
    await part(page, id, '.scroll').evaluate(
      (el) =>
        new Promise<void>((resolve) => {
          let [last, still] = [el.scrollTop, 0];
          const look = () => {
            still = el.scrollTop === last ? still + 1 : 0;
            last = el.scrollTop;
            if (still >= 8) resolve();
            else requestAnimationFrame(look);
          };
          requestAnimationFrame(look);
        }),
    );
  };

  test('CMB-17, CMB-21, CMB-48: a closed combobox draws no row, and the number of elements in its shadow root does not grow with its options; it still shows the chosen option’s label and names no list; opening draws the rows and closing takes them away', async ({ page }) => {
    await mount(page, [fx('few', { value: 'o3' }, many(5)), fx('some', { value: 'o30' }, many(60)), fx('many', { value: 'o1200' }, many(1632))], { reducedMotion: true });
    const [few, some, lots] = [await counted(page, 'few'), await counted(page, 'some'), await counted(page, 'many')];
    expect(few.rows).toBe(0);
    expect(some).toEqual(few);
    expect(lots).toEqual(few);
    expect(few.elements).toBeLessThan(40);
    expect(await read(page, 'many')).toMatchObject({ value: 'o1200', text: 'Option 1200', expanded: 'false', controls: null, active: null });
    // Opened: a short list draws every row, each in its place.
    await focusInput(page, 'some');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'some').toBe(true);
    expect(await counted(page, 'some')).toMatchObject({ rows: 60, rooms: 0 });
    expect(await activeRow(page, 'some')).toEqual({ label: 'Option 30', position: '30', size: '60', inView: true });
    expect((await read(page, 'some')).controls).toBe('list');
    await page.keyboard.press('Escape');
    await closedList(page, 'some');
    await expect.poll(() => counted(page, 'some')).toEqual(few);
  });

  test('CMB-23, CMB-25, CMB-26, CMB-48: a long list draws the rows near the box that scrolls — a number that does not grow with its options — and opens on its chosen option, whole and in view; the page keys reach options that were not drawn; a text that keeps many options keeps the window, with the first match active, and one that keeps few draws them all — every drawn option saying its position and the number of options shown', async ({ page }) => {
    await mount(page, [fx('long', { value: 'o450' }, many(600)), fx('longer', { value: 'o1200' }, many(1632))], { reducedMotion: true });
    const opened: Record<string, Awaited<ReturnType<typeof counted>>> = {};
    for (const [id, chosen, size] of [
      ['long', 450, 600],
      ['longer', 1200, 1632],
    ] as const) {
      await focusInput(page, id);
      await page.keyboard.press('ArrowDown');
      await shownList(page, id).toBe(true);
      await expect.poll(() => activeRow(page, id), { message: id }).toEqual({ label: `Option ${chosen}`, position: String(chosen), size: String(size), inView: true });
      opened[id] = await counted(page, id);
      expect(opened[id].rows, `${id}: far fewer rows than options`).toBeLessThan(80);
      const rowHeight = (await box(row(page, id, `Option ${chosen}`))).height;
      near((await scrollBox(page, id)).height, size * rowHeight + (await token(page, 'list-padding-block')), `${id}: the box scrolls over the whole list`, 2 + (await token(page, 'list-padding-block')));
      if (id === 'long') {
        await page.keyboard.press('Escape');
        await closedList(page, id);
      }
    }
    expect(opened.longer.rows, 'the rows drawn do not grow with the options').toBe(opened.long.rows);
    expect(opened.longer.elements).toBe(opened.long.elements);
    // The page keys, to options that were not drawn.
    for (let i = 0; i < 20; i++) await page.keyboard.press('PageDown');
    await expect.poll(() => activeRow(page, 'longer')).toEqual({ label: 'Option 1400', position: '1400', size: '1632', inView: true });
    for (let i = 0; i < 30; i++) await page.keyboard.press('PageDown');
    await expect.poll(() => activeRow(page, 'longer')).toEqual({ label: 'Option 1632', position: '1632', size: '1632', inView: true });
    // A text every label contains: still a window, from the first match.
    await page.keyboard.press('ControlOrMeta+a');
    await type(page, 'opt');
    await expect.poll(() => activeRow(page, 'longer')).toEqual({ label: 'Option 1', position: '1', size: '1632', inView: true });
    expect((await scrollBox(page, 'longer')).top, 'the box is at its start, but for the padding before the first option').toBeLessThanOrEqual((await token(page, 'list-padding-block')) + 1);
    expect((await counted(page, 'longer')).rows).toBeLessThan(80);
    await expect(row(page, 'longer', 'Option 1').locator('mark')).toHaveText('Opt');
    // A text few labels contain: every one of them is drawn, and says its place among them.
    await type(page, 'ion 16');
    const kept = ['Option 16', ...Array.from({ length: 10 }, (_, i) => `Option ${160 + i}`), ...Array.from({ length: 33 }, (_, i) => `Option ${1600 + i}`)];
    await expect.poll(async () => (await read(page, 'longer')).rows).toEqual(kept);
    expect(await counted(page, 'longer')).toMatchObject({ rows: 44, rooms: 0 });
    expect(await activeRow(page, 'longer')).toEqual({ label: 'Option 16', position: '1', size: '44', inView: true });
    expect(await part(page, 'longer', '.row').last().evaluate((el) => [el.getAttribute('aria-posinset'), el.getAttribute('aria-setsize')])).toEqual(['44', '44']);
  });

  test('CMB-23, CMB-24, CMB-27, CMB-48: a long list scrolled by the wheel draws the rows it comes to, and a press chooses one of them; the active option stays an element of the list however far the box is scrolled from it', async ({ page }) => {
    await mount(page, [fx('long', { value: 'o3' }, many(1632))], { reducedMotion: true });
    await focusInput(page, 'long');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'long').toBe(true);
    await expect.poll(() => activeRow(page, 'long')).toMatchObject({ label: 'Option 3', inView: true });
    const list = await box(part(page, 'long', '.list'));
    const at = [list.x + list.width / 2, list.y + list.height / 2] as const;
    const under = () => host(page, 'long').evaluate((el, [x, y]) => (el.shadowRoot!.elementFromPoint(x, y)?.closest('.row')?.getAttribute('aria-posinset') ?? null) as string | null, at);
    // Scrolled with the pointer elsewhere (as its scroll bar does): the rows it comes to are drawn, and the active
    // option — far above now — is still an element of the list, as aria-activedescendant needs.
    await part(page, 'long', '.scroll').evaluate((el) => (el.scrollTop = 9000));
    await expect.poll(under).not.toBeNull();
    expect(Number(await under())).toBeGreaterThan(140);
    expect((await counted(page, 'long')).rows).toBeLessThan(80);
    expect(await activeRow(page, 'long')).toEqual({ label: 'Option 3', position: '3', size: '1632', inView: false });
    // By the wheel, a part of a page at a time: the row under the pointer is always one that is drawn.
    await page.mouse.move(at[0], at[1]);
    await wheelPast(page, 'long', 12000);
    await expect.poll(under).not.toBeNull();
    const position = Number(await under());
    expect(position).toBeGreaterThan(190);
    expect((await counted(page, 'long')).rows).toBeLessThan(80);
    await page.mouse.move(at[0], at[1] + 1);
    const hovered = await activeRow(page, 'long');
    expect(Number(hovered!.position)).toBeGreaterThanOrEqual(position);
    await page.mouse.click(at[0], at[1] + 1);
    await closedList(page, 'long');
    expect(await read(page, 'long')).toMatchObject({ value: `o${hovered!.position}`, text: hovered!.label });
  });
});

test.describe('accessibility', () => {
  for (const theme of THEMES) {
    test(`axe: every fixture, closed and open, has no violations in ${theme}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true, theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`), theme).toEqual([]);
    });

    test(`axe: the list in the top layer — filtered by typing, an option active, one disabled, groups, a status — has no violations in ${theme}`, async ({ page }) => {
      await mount(page, [fx('one', { label: 'Plan', value: 'team', clearable: true, clearLabel: 'Clear plan', statusText: '3 plans' }, [group('Plans', [option('Free', 'free', { supportingText: 'One project' }), option('Team', 'team', { leadingIcon: 'group' })]), option('Enterprise', 'enterprise', { disabled: true })])], { theme, reducedMotion: true });
      await focusInput(page, 'one');
      await selectAll(page, 'one');
      await type(page, 'e');
      await shownList(page, 'one').toBe(true);
      await page.keyboard.press('ArrowDown');
      // The list fades in, even where motion is reduced (MOT-6): its colors are read once it is whole.
      await motionEnded(page);
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`), theme).toEqual([]);
    });
  }
});

test.describe('fixtures', () => {
  test('every fixture is mounted and visible, with the floating label where its look has one, the text, the glyphs and — where it is open — the list, the rows and the status row the spec gives it, and with no row of a frame', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    expect(spec.fixtures).toHaveLength(53);
    const flat = (items: FixtureItem[] = []): FixtureItem[] => items.flatMap((item) => (item.kind === 'option' ? [item] : flat(item.items)));
    const folded = (text: string) => text.normalize('NFKD').toLowerCase();
    for (const f of spec.fixtures) {
      await expect(host(page, f.id), f.id).toBeVisible();
      await expect(container(page, f.id), f.id).toBeVisible();
      const options = flat(f.items);
      const chosen = options.find((o) => o.props.value !== '' && o.props.value === (f.props.value ?? ''));
      // The text: what the fixture gives it, else the chosen option's label, else a custom value, else nothing.
      const text = f.props.inputValue !== undefined ? String(f.props.inputValue) : chosen ? String(chosen.props.label) : f.props.allowCustomValue ? String(f.props.value ?? '') : '';
      expect((await read(page, f.id)).text, `${f.id} text`).toBe(text);
      if (f.props.placeholder) expect(await input(page, f.id).evaluate((el) => (el as HTMLInputElement).placeholder), f.id).toBe(String(f.props.placeholder));
      // CMB-8, CMB-62: a filled or an outlined combobox floats its name; a stacked one draws no label, and none draws a row.
      const variant = f.props.variant ?? 'stacked';
      const floats = variant !== 'stacked' && !f.props.labelHidden;
      expect(await part(page, f.id, '.floating').count(), `${f.id} floating label`).toBe(floats ? 1 : 0);
      if (floats) await expect(part(page, f.id, '.floating'), f.id).toHaveText(String(f.props.label));
      expect(await input(page, f.id).getAttribute('aria-label'), `${f.id} name`).toBe(String(f.props.label));
      await expect(part(page, f.id, '.label-row, .requirement-tag, .asterisk, .supporting-text'), `${f.id}: no row of a frame`).toHaveCount(0);
      expect(await part(page, f.id, '.chevron').count(), `${f.id} chevron`).toBe(f.props.readOnly || f.props.chevron === false ? 0 : 1);
      expect(await part(page, f.id, '.clear').count(), `${f.id} clear button`).toBe(f.props.clearable && text && !f.props.disabled && !f.props.readOnly ? 1 : 0);
      // The rows: every option, or under the combobox's own filter those whose label contains the text.
      const filtered = f.props.inputValue && f.props.filter !== 'none' ? options.filter((o) => folded(String(o.props.label)).includes(folded(String(f.props.inputValue)))) : options;
      const open = f.props.open === true && !f.props.disabled;
      // …drawn while the list is shown, and at no other time.
      expect((await read(page, f.id)).rows, `${f.id} options`).toEqual(open ? filtered.map((o) => String(o.props.label)) : []);
      expect((await read(page, f.id)).shown, `${f.id} list`).toBe(open);
      if (open) {
        await expect(part(page, f.id, '.list'), f.id).toBeVisible();
        const [s, l] = [await box(stage(page, f.id)), await box(part(page, f.id, '.list'))];
        expect(l.y + l.height, `${f.id}: the list is inside its stage`).toBeLessThanOrEqual(s.y + s.height);
        expect(l.x + l.width, `${f.id}: the list is inside its stage`).toBeLessThanOrEqual(s.x + s.width + 0.6);
        const said = f.props.status === 'loading' ? ['', ''] : f.props.status === 'error' ? ['', String(f.props.statusText)] : [String(f.props.statusText ?? (filtered.length === 0 ? (f.props.emptyText ?? 'No matches') : '')), ''];
        expect((await read(page, f.id)).status, `${f.id} status row`).toEqual(said);
        await expect(part(page, f.id, '.status tanrei-loading-indicator'), f.id).toHaveCount(f.props.status === 'loading' ? 1 : 0);
      }
      if (f.slots?.['leading-icon']) await expect.poll(() => host(page, f.id).locator('[slot="leading-icon"]').evaluate((el) => el.getBoundingClientRect().width > 0), { message: f.id }).toBe(true);
      near((await box(host(page, f.id))).width, 280, `${f.id}: as wide as its column`);
      near((await box(host(page, f.id))).height, (await box(container(page, f.id))).height, `${f.id}: exactly as tall as its container`);
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
