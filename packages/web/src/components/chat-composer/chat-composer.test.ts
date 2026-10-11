// <tanrei-chat-composer>, driven by specs/chat-composer.spec.json: every behaviour id (CCM-1…44) is cited by a test
// title, every fixture has a baseline, and every length and color is read back from the tokens — never from a number
// written here. What the web's way of composing asks of every composed element (W13) is held by the shared test
// (src/primitives/composed.test.ts); this file holds the chat composer's own sentences — the capsule, the two
// layouts, what can be sent, the files, the form — and, in the twin's place, the comparison of each
// member with the same member written by hand.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, type FixtureItem, acmeSystemCss, loadSpec, missingWords, mountFixtures, resolveColor, resolveToken, setWords, tab, tabTo } from '../../../test/harness.js';
import { decodePng } from '../../../test/png.js';

const spec = loadSpec('chat-composer');
const fieldSpec = loadSpec('field');
type P = Page;
const TAG = 'tanrei-chat-composer';
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] ${TAG}`);
const capsule = (page: P, id: string) => host(page, id).locator('.capsule');
const typing = (page: P, id: string) => host(page, id).locator('tanrei-embedded-text-input');
const native = (page: P, id: string) => typing(page, id).locator('.input');
const send = (page: P, id: string) => host(page, id).locator('.send > tanrei-button');
const attach = (page: P, id: string) => host(page, id).locator('tanrei-file-picker > tanrei-button');
const ownItems = (page: P, id: string) => host(page, id).locator('.strip > tanrei-file-item');
const T = (name: string) => `--tanrei-comp-chat-composer-${name}`;
const token = (page: P, name: string) => resolveToken(page, T(name));
const color = (page: P, name: string) => resolveColor(page, T(name));
const box = async (locator: Locator) => (await locator.boundingBox())!;
const near = (actual: number, expected: number, message = '', tolerance = 0.6) => expect(Math.abs(actual - expected), `${message}: ${actual} ≈ ${expected}`).toBeLessThanOrEqual(tolerance);
const WORDS = { label: 'Message', sendLabel: 'Send' };
const FILES = { attachLabel: 'Attach files', removeLabel: 'Remove', retryLabel: 'Try again' };
/** A fixture of the test's own. */
const fx = (id: string, props: Fixture['props'] = {}, extra: Partial<Fixture> = {}): Fixture => ({ id, props: { ...WORDS, ...props }, ...extra });
const file = (props: FixtureItem['props']): FixtureItem => ({ kind: 'file', props });
const mount = (page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) => mountFixtures(page, spec, { icons: true, reducedMotion: true, fixtures, ...options });
type El = HTMLElement & {
  value: string;
  files: File[];
  sendable: boolean;
  updateComplete: Promise<unknown>;
  addFiles(files: File[]): { file: File; reason: string }[];
  clear(): void;
};
/** Every element of the page, through shadow roots, has updated — and what follows a turn later has too. */
const settle = (page: P) =>
  page.evaluate(async () => {
    const all = (root: Document | ShadowRoot | Element): Element[] => [...root.querySelectorAll('*')].flatMap((el) => [el, ...(el.shadowRoot ? all(el.shadowRoot) : [])]);
    for (let round = 0; round < 3; round++) {
      await Promise.all(all(document).map((el) => (el as Element & { updateComplete?: Promise<unknown> }).updateComplete));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });
const set = async (page: P, id: string, props: Record<string, unknown>) => {
  await host(page, id).evaluate((el, p) => Object.assign(el, p), props);
  await settle(page);
};
const focus = async (page: P, id: string) => {
  await host(page, id).evaluate((el) => (el as HTMLElement).focus());
  await settle(page);
};
/** Every event of the spec the element fires from now on, in order: its name, and what it carries. */
const record = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const log: string[] = [];
    (window as unknown as { __events: string[] }).__events = log;
    const names = (files: (File | { file: File; reason: string })[] | undefined) => (files ?? []).map((each) => (each instanceof File ? each.name : `${each.file.name}=${each.reason}`)).join('+');
    for (const type of ['input', 'change', 'action', 'rowschange', 'send', 'stop', 'sendablechange', 'sendblocked', 'select', 'reject', 'attachmentschange', 'remove', 'retry']) {
      el.addEventListener(type, (event) => {
        const d = (event as CustomEvent<{ value?: string; attachments?: (File | string)[]; sendable?: boolean; reasons?: string[]; files?: File[] }>).detail;
        if (type === 'input') log.push(`input:${(el as El).value}`);
        else if (type === 'send') log.push(`send:${d.value}|${(d.attachments ?? []).map((a) => (typeof a === 'string' ? a : a.name)).join('+')}`);
        else if (type === 'sendablechange' || type === 'sendblocked') log.push(`${type}:${d.sendable}:${(d.reasons ?? []).join('+')}`);
        else if (type === 'select' || type === 'reject' || type === 'attachmentschange') log.push(`${type}:${names(d.files)}`);
        else if (type === 'remove' || type === 'retry') log.push(`${type}:${d.value}`);
        else log.push(type);
      });
    }
  });
const events = (page: P) => page.evaluate(() => (window as unknown as { __events: string[] }).__events.splice(0));
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error') seen.push(message.text());
  });
  return seen;
}
/** Hands files to the composer as a product does: named, of a kind, each of another size. */
const hand = async (page: P, id: string, names: string[]) => {
  const refused = await host(page, id).evaluate((el, list) => {
    const kinds: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', csv: 'text/csv', mov: 'video/quicktime', txt: 'text/plain' };
    const files = list.map((name, index) => new File([new Uint8Array(index + 1)], name, { lastModified: 1767225600000, type: kinds[name.slice(name.lastIndexOf('.') + 1)] ?? '' }));
    return (el as El).addFiles(files).map((each) => `${each.file.name}=${each.reason}`);
  }, names);
  await settle(page);
  return refused;
};
/** Chooses files in the browser's own picker, opened by the attach button. */
const choose = async (page: P, id: string, files: { name: string; mimeType: string }[]) => {
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), attach(page, id).click()]);
  await chooser.setFiles(files.map((each, index) => ({ ...each, buffer: Buffer.alloc(index + 1, 1) })));
  await settle(page);
};
/** A drag, a drop or a paste as the browser fires it, carrying files (and text). Answers whether the element took it. */
const carry = async (page: P, id: string, type: 'dragenter' | 'dragover' | 'dragleave' | 'drop' | 'paste', names: string[], text = '') => {
  const taken = await host(page, id).evaluate(
    (el, [t, list, words]) => {
      const files = list.map((name, index) => new File([new Uint8Array(index + 7)], name, { lastModified: 1767225600000, type: name.endsWith('.png') ? 'image/png' : name.endsWith('.pdf') ? 'application/pdf' : 'text/plain' }));
      const data = { types: [...(files.length ? ['Files'] : []), ...(words ? ['text/plain'] : [])], files, dropEffect: 'none', getData: (kind: string) => (kind === 'text/plain' ? words : '') };
      const event = new Event(t, { bubbles: true, cancelable: true, composed: true });
      Object.defineProperty(event, t === 'paste' ? 'clipboardData' : 'dataTransfer', { value: data });
      const target = t === 'paste' ? el.shadowRoot!.querySelector('tanrei-embedded-text-input')!.shadowRoot!.querySelector('.input')! : el.shadowRoot!.querySelector('.capsule')!;
      target.dispatchEvent(event);
      return event.defaultPrevented;
    },
    [type, names, text] as const,
  );
  await settle(page);
  return taken;
};
/** What the capsule draws: its fill, its lift, its opacity, its corner, and its edge. */
const drawn = (page: P, id: string) =>
  capsule(page, id).evaluate((el) => {
    const s = getComputedStyle(el);
    const o = getComputedStyle(el.querySelector('.outline')!);
    return { fill: s.backgroundColor, shadow: s.boxShadow, opacity: s.opacity, radius: Number.parseFloat(s.borderTopLeftRadius), edge: o.borderTopColor, width: Number.parseFloat(o.borderTopWidth), cursor: s.cursor };
  });
/** The boxes of the capsule's parts, relative to the capsule: each present part's left, top, right and bottom. */
const places = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const root = el.shadowRoot!;
    const c = root.querySelector('.capsule')!.getBoundingClientRect();
    const at = (element: Element | null | undefined) => {
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return { left: r.left - c.left, top: r.top - c.top, right: c.right - r.right, bottom: c.bottom - r.bottom, width: r.width, height: r.height, x: r.left - c.left + r.width / 2, y: r.top - c.top + r.height / 2 };
    };
    return {
      capsule: { width: c.width, height: c.height },
      layout: root.querySelector('.capsule')!.getAttribute('data-layout'),
      strip: at(root.querySelector('.strip:not([hidden])')),
      attach: at(root.querySelector('tanrei-file-picker > tanrei-button') ?? el.querySelector('[slot="attach"]')),
      leading: [...el.querySelectorAll('[slot="leading"]')].map((each) => at(each)!),
      typing: at(root.querySelector('.typing')),
      input: at(root.querySelector('tanrei-embedded-text-input')),
      counter: at(root.querySelector('.counter')),
      trailing: [...el.querySelectorAll('[slot="trailing"]')].map((each) => at(each)!),
      send: at(root.querySelector('.send > tanrei-button') ?? el.querySelector('[slot="send"], [slot="stop"]')),
      row: at(root.querySelector('.row')),
    };
  });
/** The path of focus: the focused element at each level, by a name a test can read. */
const focused = (page: P) =>
  page.evaluate(() => {
    const path: string[] = [];
    for (let at: Element | null = document.activeElement; at; at = at.shadowRoot?.activeElement ?? null) path.push(at.getAttribute('part')?.split(' ').pop() || at.getAttribute('slot') || at.className?.toString().split(' ').pop() || at.localName.replace('tanrei-', ''));
    return path.join('>');
  });
/** Chromium's accessibility tree of the page, flat: role, name, description and the states a test reads. */
async function axTree(page: P) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  return nodes
    .filter((node) => !node.ignored)
    .map((node) => {
      const property = (name: string) => node.properties?.find((p) => p.name === name)?.value.value;
      return { role: node.role?.value as string, name: (node.name?.value ?? '') as string, description: (node.description?.value ?? '') as string, invalid: property('invalid'), disabled: property('disabled'), busy: property('busy'), multiline: property('multiline') };
    });
}
const one = (id: string, ...ids: string[]) => spec.fixtures.filter((f) => [id, ...ids].includes(f.id));
const bundle = () => fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../dist/tanrei.bundle.js'), 'utf8');
const tokensCss = () => fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../dist/tokens.css'), 'utf8');
/** Where focus is while the typing area has it. */
const TYPING = 'chat-composer>embedded-text-input>input';
const NOTES = 'One\nTwo\nThree\nFour\nFive\nSix\nSeven\nEight';

test.describe('behavior', () => {
  test('CCM-1: one capsule holds everything — the strip at its top while there are File items, the line being written below it — as wide as its layout gives it, as tall as what it holds and never less than container.height; nothing is drawn outside it, it draws no label, help or error text of its own, and it stands where it is placed', async ({ page }) => {
    await mount(page, one('inline-empty', 'inline-uploading', 'inline-lines-at-maximum'));
    const height = await token(page, 'container-height');
    for (const id of ['inline-empty', 'inline-uploading', 'inline-lines-at-maximum']) {
      const [outer, inner, stageBox] = [await box(host(page, id)), await box(capsule(page, id)), await box(stage(page, id))];
      expect(inner, id).toEqual(outer);
      near(inner.width, stageBox.width - 32, `${id} width`);
      expect(inner.height, id).toBeGreaterThanOrEqual(height - 0.5);
      expect(await host(page, id).evaluate((el) => [getComputedStyle(el).position, getComputedStyle(el.shadowRoot!.querySelector('.capsule')!).position, getComputedStyle(el).overflow]), id).toEqual(['static', 'relative', 'visible']);
      // Everything it holds is inside its box.
      expect(await host(page, id).evaluate((el) => {
        const c = el.shadowRoot!.querySelector('.capsule')!.getBoundingClientRect();
        return [...el.shadowRoot!.querySelectorAll('.strip:not([hidden]), .line, .row'), ...el.children].every((part) => {
          const r = part.getBoundingClientRect();
          return r.width === 0 || (r.left >= c.left - 0.5 && r.right <= c.right + 0.5 && r.top >= c.top - 0.5 && r.bottom <= c.bottom + 0.5);
        });
      }), id).toBe(true);
    }
    const [empty, strip] = [await places(page, 'inline-empty'), await places(page, 'inline-uploading')];
    expect(empty.strip).toBeNull();
    expect(strip.strip!.top).toBeLessThan(strip.typing!.top);
    expect(strip.strip!.top + strip.strip!.height).toBeLessThanOrEqual(strip.typing!.top + 0.5);
    // No row of a field: no label, no help, no error text.
    expect(await host(page, 'inline-empty').evaluate((el) => el.shadowRoot!.querySelectorAll('label, .label, .supporting, .supporting-text, .error-text, .requirement-tag').length)).toBe(0);
  });

  test('CCM-2: inline — one row in reading order: the attach button, the leading Buttons, the typing area taking the room the others leave, the counter, the trailing Buttons and the send button; neighbours of a group actions.gap apart and each group container.gap from the typing area; the paddings by what is outermost; every Button centred on one line and, as the text grows, at the bottom edge at the distance it had', async ({ page }) => {
    await mount(page, [...one('inline-actions', 'inline-empty', 'inline-lines-at-maximum', 'counter'), fx('grown', { attachments: 'own', ...FILES, counter: true, value: NOTES }, { slots: { leading: ['mood'], trailing: ['mic'] } }), fx('flat', { attachments: 'own', ...FILES, counter: true, value: 'One' }, { slots: { leading: ['mood'], trailing: ['mic'] } })]);
    const [pb, pi, pib, gap, ag, ipb] = [await token(page, 'container-padding-block'), await token(page, 'container-padding-inline'), await token(page, 'container-padding-inline-with-button'), await token(page, 'container-gap'), await token(page, 'actions-gap'), await token(page, 'input-padding-block')];
    const a = await places(page, 'inline-actions');
    expect(a.layout).toBe('inline');
    const order = [a.attach!, ...a.leading, a.typing!, ...a.trailing, a.send!];
    for (let i = 1; i < order.length; i++) expect(order[i]!.left, `part ${i} follows part ${i - 1}`).toBeGreaterThanOrEqual(order[i - 1]!.left + order[i - 1]!.width - 0.5);
    near(a.attach!.left, pib, 'a Button outermost at the start');
    near(a.send!.right, pib, 'the send button outermost at the end');
    near(a.leading[0]!.left - (a.attach!.left + a.attach!.width), ag, 'within the group before');
    near(a.leading[1]!.left - (a.leading[0]!.left + a.leading[0]!.width), ag, 'within the group before');
    near(a.typing!.left - (a.leading[1]!.left + a.leading[1]!.width), gap, 'the group before, from the typing area');
    near(a.trailing[0]!.left - (a.typing!.left + a.typing!.width), gap, 'the group after, from the typing area');
    near(a.send!.left - (a.trailing[0]!.left + a.trailing[0]!.width), ag, 'within the group after');
    near(a.typing!.top, pb, 'the row from the top edge');
    near(a.typing!.bottom, pb, 'the row from the bottom edge');
    near(a.input!.top - a.typing!.top, ipb, 'above the first line');
    near(a.typing!.top + a.typing!.height - (a.input!.top + a.input!.height), ipb, 'below the last line');
    for (const part of [a.attach!, ...a.leading, ...a.trailing, a.send!]) near(part.y, a.input!.y, 'centred on the one line');
    // With no Button before it the typing area is outermost at the start.
    const e = await places(page, 'inline-empty');
    near(e.typing!.left, pi, 'the typing area outermost at the start');
    near(e.send!.left - (e.typing!.left + e.typing!.width), gap, 'the send button alone after the typing area');
    // The counter stands before the trailing actions, in the group after the typing area.
    const c = await places(page, 'counter');
    near(c.counter!.left - (c.typing!.left + c.typing!.width), gap, 'the counter from the typing area');
    near(c.send!.left - (c.counter!.left + c.counter!.width), ag, 'the counter from the send button');
    near(c.counter!.y, c.input!.y, 'the counter on the line', 1);
    // Grown: every Button and the counter at the bottom edge, at the distance from it they had with one line.
    const [flat, grown] = [await places(page, 'flat'), await places(page, 'grown')];
    expect(grown.capsule.height).toBeGreaterThan(flat.capsule.height + 100);
    for (const key of ['attach', 'counter', 'send'] as const) near(grown[key]!.bottom, flat[key]!.bottom, `${key} keeps its distance from the bottom edge`);
    near(grown.leading[0]!.bottom, flat.leading[0]!.bottom, 'a leading Button');
    near(grown.trailing[0]!.bottom, flat.trailing[0]!.bottom, 'a trailing Button');
  });

  test('CCM-3: stacked — the typing area and the send button on one line, the send button at its end, centred on one line of text and at the line’s bottom edge as the text grows; everything else in a row beneath, container.row-gap below, the attach button and the leading Buttons at its start and the counter and the trailing Buttons at its end; never the send button; with nothing for the row there is no row and it is box for box an inline one; in 240 with six leading actions the start group wraps and the send button stays on the typing line', async ({ page }) => {
    await mount(page, [
      ...one('stacked-typed', 'stacked-lines-at-maximum', 'stacked-actions', 'inline-typed'),
      fx('bare', { layout: 'stacked', value: 'Could you send the floor plan before Friday?' }),
      fx('counted', { layout: 'stacked', counter: true, attachments: 'own', ...FILES }, { slots: { trailing: ['mic'] } }),
      fx('many', { layout: 'stacked', attachments: 'own', ...FILES }, { slots: { leading: ['mood', 'alternate_email', 'format_bold', 'format_list_bulleted', 'mic', 'add'] } }),
    ]);
    await page.addStyleTag({ content: '[data-fixture="many"] { inline-size: 240px !important; }' });
    await settle(page);
    const [pb, pi, pib, gap, ag, rg] = [await token(page, 'container-padding-block'), await token(page, 'container-padding-inline'), await token(page, 'container-padding-inline-with-button'), await token(page, 'container-gap'), await token(page, 'actions-gap'), await token(page, 'container-row-gap')];
    const s = await places(page, 'stacked-typed');
    expect(s.layout).toBe('stacked');
    near(s.typing!.left, pi, 'the typing area from the start edge');
    near(s.typing!.top, pb, 'the line from the top edge');
    near(s.send!.left - (s.typing!.left + s.typing!.width), gap, 'the send button from the typing area');
    near(s.send!.right, pib, 'the send button from the end edge');
    near(s.send!.y, s.input!.y, 'the send button centred on the line');
    near(s.row!.top - (s.typing!.top + s.typing!.height), rg, 'the row beneath');
    near(s.attach!.left, pib, 'the attach button at the row’s start');
    near(s.attach!.bottom, pb, 'the row from the bottom edge');
    expect(s.attach!.top).toBeGreaterThanOrEqual(s.typing!.top + s.typing!.height);
    // Grown: the send button at the bottom edge of the line, at the distance from the row beneath it had.
    const g = await places(page, 'stacked-lines-at-maximum');
    expect(g.typing!.height).toBeGreaterThan(s.typing!.height + 100);
    near(g.row!.top - (g.send!.top + g.send!.height), s.row!.top - (s.send!.top + s.send!.height), 'the send button keeps its distance from the row beneath');
    near(g.attach!.bottom, s.attach!.bottom, 'the row beneath where it was');
    // Both groups in the row beneath; the send button not among them.
    const a = await places(page, 'stacked-actions');
    for (const part of [a.attach!, ...a.leading, ...a.trailing]) near(part.y, a.attach!.y, 'one line of the row');
    near(a.leading[0]!.left - (a.attach!.left + a.attach!.width), ag, 'the start group');
    near(a.trailing[0]!.right, pib, 'the end group at the row’s end');
    expect(a.send!.y).toBeLessThan(a.attach!.top);
    const c = await places(page, 'counted');
    near(c.trailing[0]!.left - (c.counter!.left + c.counter!.width), ag, 'the counter before the trailing actions');
    expect(c.counter!.top).toBeGreaterThan(c.typing!.top + c.typing!.height);
    // Nothing for the row: no row, and the same boxes as an inline composer.
    const [bare, inline] = [await places(page, 'bare'), await places(page, 'inline-typed')];
    expect(bare.row).toBeNull();
    expect(bare).toEqual(inline);
    // Too short for all it holds: the start group wraps, nothing is cut, and the send button is on the typing line.
    const m = await places(page, 'many');
    const tops = [...new Set([m.attach!, ...m.leading].map((part) => Math.round(part.top)))];
    expect(tops.length).toBeGreaterThan(1);
    for (const part of [m.attach!, ...m.leading]) {
      expect(part.left).toBeGreaterThanOrEqual(pib - 0.5);
      expect(part.right).toBeGreaterThanOrEqual(pib - 0.5);
      near(part.width, m.attach!.width, 'no Button shrinks');
    }
    near(m.send!.y, m.input!.y, 'the send button on the typing line');
  });

  test('CCM-4: a capsule narrower than layout.inline-min-width is laid out stacked whatever layout says, and inline again when it is that wide — by its own width, never the window’s; the number of lines and the attachments never change the layout; a layout it does not know is inline, and reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('a', { attachments: 'own', ...FILES }), fx('odd', { layout: 'sideways', attachments: 'own', ...FILES })]);
    const least = await token(page, 'layout-inline-min-width');
    const layout = (id: string) => capsule(page, id).getAttribute('data-layout');
    expect(await layout('a')).toBe('inline');
    const wide = async (width: number) => {
      await stage(page, 'a').evaluate((el, w) => ((el as HTMLElement).style.inlineSize = `${w}px`), width);
      await settle(page);
    };
    await wide(least - 2);
    await expect.poll(() => layout('a')).toBe('stacked');
    await wide(least + 2);
    await expect.poll(() => layout('a')).toBe('inline');
    // The window is not what is read.
    await page.setViewportSize({ width: 300, height: 700 });
    await settle(page);
    expect(await layout('a')).toBe('inline');
    // Lines and attachments change nothing.
    await set(page, 'a', { value: NOTES });
    await hand(page, 'a', ['brief.pdf']);
    expect(await layout('a')).toBe('inline');
    // The width under which it stacks grows with the text size.
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    await expect.poll(() => layout('a')).toBe('stacked');
    await page.evaluate(() => (document.documentElement.style.fontSize = ''));
    await expect.poll(() => layout('a')).toBe('inline');
    expect(await layout('odd')).toBe('inline');
    expect(seen.filter((text) => text.includes('CCM-4'))).toHaveLength(1);
  });

  test('CCM-5: it holds exactly one embedded text input, multi-line, left as it is — no container, edge or padding of its own — given value and placeholder and named by label; a press on the capsule’s own ground gives it focus with the caret at the nearest point of the text and shows no pressed state, and a press on a Button, a File item or the counter does not; minRows below 1 is 1 and a maxRows that is neither 0 nor at least minRows is minRows', async ({ page }) => {
    await mount(page, [...one('inline-typed', 'inline-uploading'), fx('rows', { minRows: 0, maxRows: -3, value: NOTES }), fx('low', { minRows: 3, maxRows: 2, value: NOTES }), fx('free', { maxRows: 0, value: NOTES }), fx('count', { counter: true, value: 'Hello there' })]);
    expect(await host(page, 'inline-typed').evaluate((el) => el.shadowRoot!.querySelectorAll('tanrei-embedded-text-input').length)).toBe(1);
    expect(await typing(page, 'inline-typed').evaluate((el) => {
      const input = el as HTMLElement & { multiline: boolean; value: string; placeholder: string; label: string };
      const s = getComputedStyle(el);
      return [input.multiline, input.value, input.placeholder, input.label, s.backgroundColor, s.padding, s.borderTopWidth];
    })).toEqual([true, 'Could you send the floor plan before Friday?', 'Write a message', 'Message', 'rgba(0, 0, 0, 0)', '0px', '0px']);
    const line = await native(page, 'rows').evaluate((el) => Number.parseFloat(getComputedStyle(el).lineHeight));
    near((await box(typing(page, 'rows'))).height, line, 'minRows 0 and maxRows -3: one line');
    near((await box(typing(page, 'low'))).height, 3 * line, 'maxRows below minRows: minRows');
    near((await box(typing(page, 'free'))).height, 8 * line, 'maxRows 0: no limit');
    // The ground: the padding at the start, and the room beside a short text.
    const id = 'inline-typed';
    const [c, t] = [await box(capsule(page, id)), await box(typing(page, id))];
    await page.mouse.click(c.x + 4, c.y + c.height / 2);
    expect(await focused(page)).toContain('embedded-text-input');
    expect(await native(page, id).evaluate((el) => (el as HTMLTextAreaElement).selectionStart)).toBe(0);
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    await page.mouse.click(t.x + t.width - 4, c.y + c.height - 2);
    expect(await focused(page)).toContain('embedded-text-input');
    expect(await native(page, id).evaluate((el) => (el as HTMLTextAreaElement).selectionStart)).toBe('Could you send the floor plan before Friday?'.length);
    expect(await capsule(page, id).evaluate((el) => [el.hasAttribute('data-pressed'), !!el.querySelector('.ripple')])).toEqual([false, false]);
    // The strip's gaps are ground; a File item and the counter are not.
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    const strip = await box(host(page, 'inline-uploading').locator('.strip'));
    await page.mouse.click(strip.x + strip.width - 6, strip.y + strip.height - 6);
    expect(await focused(page)).toContain('embedded-text-input');
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    const item = await box(host(page, 'inline-uploading').locator('tanrei-file-item').first());
    await page.mouse.click(item.x + 60, item.y + item.height / 2);
    expect(await focused(page)).not.toContain('embedded-text-input');
    const counter = await box(host(page, 'count').locator('.counter'));
    await page.mouse.click(counter.x + counter.width / 2, counter.y + counter.height / 2);
    expect(await focused(page)).not.toContain('embedded-text-input');
  });

  test('CCM-6: exactly one send button — the one it brings: an icon-only Button of the medium size and of the variant send-button.variant names, showing the send glyph and named by sendLabel — or the product’s own in the send slot, left as it is; either is drawn from the Button’s own tokens', async ({ page }) => {
    await mount(page, [...one('inline-typed', 'own-buttons'), fx('tonal', { value: 'Hi' })]);
    const brought = await send(page, 'inline-typed').evaluate((el) => {
      const button = el as HTMLElement & { label: string; size: string; variant: string };
      const inner = el.shadowRoot!.querySelector('button')!;
      return { count: el.parentElement!.children.length, label: button.label, size: button.size, attribute: el.getAttribute('variant'), glyph: el.querySelector('[slot="icon"]')!.textContent, text: el.textContent!.trim(), name: inner.getAttribute('aria-label'), width: inner.getBoundingClientRect().width, height: inner.getBoundingClientRect().height };
    });
    expect(brought).toMatchObject({ count: 1, label: 'Send', size: 'medium', attribute: null, glyph: 'send', text: 'send', name: 'Send' });
    near(brought.width, brought.height, 'icon-only: as wide as it is high');
    near(brought.height, await resolveToken(page, '--tanrei-comp-button-container-height-medium'), 'the medium size');
    // The variant the token names: filled in the default system; another when a layer says so.
    const fill = (id: string) => send(page, id).evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('button')!).backgroundColor);
    expect(await fill('inline-typed')).toBe(await resolveColor(page, '--tanrei-comp-button-filled-container-color'));
    await host(page, 'tonal').evaluate((el) => el.style.setProperty('--tanrei-comp-chat-composer-send-button-variant', 'tonal'));
    await set(page, 'tonal', { value: 'Hello' });
    expect(await fill('tonal')).toBe(await resolveColor(page, '--tanrei-comp-button-tonal-container-color'));
    // The product's own: drawn as it is, and it sends.
    const own = host(page, 'own-buttons').locator('[slot="send"]');
    expect(await host(page, 'own-buttons').evaluate((el) => el.shadowRoot!.querySelectorAll('.send > tanrei-button').length)).toBe(0);
    expect(await own.evaluate((el) => [el.getAttribute('variant'), el.textContent, (el as HTMLElement & { disabled: boolean }).disabled])).toEqual(['filled', 'Send', false]);
    await record(page, 'own-buttons');
    await own.click();
    expect((await events(page)).filter((e) => e.startsWith('send:'))).toEqual(['send:Could you send the floor plan before Friday?|']);
  });

  test('CCM-7: while attachments is not none it holds one File picker, given accept, multiple, maxSize and maxFiles, whose trigger is the Button it brings — icon-only, text, medium, the attach_file glyph, named by attachLabel — or the product’s own in the attach slot; activating it opens the browser’s picker; while attachments is none there is no picker, no attach button and no strip, and an element in the attach slot is not drawn and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('own', { attachments: 'own', ...FILES, accept: ['.pdf', 'image/*'], maxSize: 1000, maxFiles: 3 }), ...one('own-buttons', 'inline-empty'), fx('none', {}, { slots: { attach: 'add' } })]);
    expect(await host(page, 'own').evaluate((el) => {
      const picker = el.shadowRoot!.querySelector('tanrei-file-picker') as HTMLElement & { accept: string[]; multiple: boolean; maxSize: number; maxFiles: number; layout: string };
      return [el.shadowRoot!.querySelectorAll('tanrei-file-picker').length, picker.accept, picker.multiple, picker.maxSize, picker.maxFiles, picker.layout];
    })).toEqual([1, ['.pdf', 'image/*'], true, 1000, 3, 'button']);
    expect(await attach(page, 'own').evaluate((el) => [el.getAttribute('variant'), (el as HTMLElement & { size: string }).size, el.querySelector('[slot="icon"]')!.textContent, el.shadowRoot!.querySelector('button')!.getAttribute('aria-label')])).toEqual(['text', 'medium', 'attach_file', 'Attach files']);
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), attach(page, 'own').click()]);
    expect(chooser.isMultiple()).toBe(true);
    await chooser.setFiles([]);
    // The product's own trigger opens it too.
    const [second] = await Promise.all([page.waitForEvent('filechooser'), host(page, 'own-buttons').locator('[slot="attach"]').click()]);
    await second.setFiles([]);
    expect(await host(page, 'own-buttons').evaluate((el) => el.shadowRoot!.querySelectorAll('tanrei-file-picker > tanrei-button').length)).toBe(0);
    // None: nothing of it.
    for (const id of ['inline-empty', 'none']) expect(await host(page, id).evaluate((el) => [el.shadowRoot!.querySelectorAll('tanrei-file-picker, tanrei-file-item').length, el.shadowRoot!.querySelector('.strip')!.hasAttribute('hidden')]), id).toEqual([0, true]);
    expect((await box(host(page, 'none').locator('[slot="attach"]')).catch(() => null))?.width ?? 0).toBe(0);
    await settle(page);
    expect(seen.filter((text) => text.includes('CCM-7'))).toHaveLength(1);
  });

  test('CCM-8: the Buttons of the leading and the trailing slot are laid out in the order given, each at the size, the variant and the width the product gave it, with no name, role, state or look added; an element that is not a Button is laid out in its place as it is, and reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [...one('inline-actions'), fx('odd', {}, { content: '<span slot="leading" id="chip">Draft</span><tanrei-button slot="trailing" variant="outlined" size="small" width="wide" label="Record"><span slot="icon">mic</span></tanrei-button>' })]);
    // Nothing the product did not write, or the Button does not write on itself, is on it.
    expect(await host(page, 'inline-actions').evaluate((el) => {
      const button = el.querySelector('[slot="leading"]')!;
      return [button.getAttribute('variant'), button.getAttribute('label'), button.getAttributeNames().filter((name) => /^(aria-|role$|style$|class$|disabled$|part$)/.test(name))];
    })).toEqual(['text', 'alternate_email', []]);
    const a = await places(page, 'inline-actions');
    expect(a.leading[0]!.left).toBeLessThan(a.leading[1]!.left);
    const odd = host(page, 'odd');
    expect(await odd.locator('[slot="trailing"]').evaluate((el) => [el.getAttribute('variant'), el.getAttribute('size'), el.getAttribute('width'), el.getAttribute('role'), el.getAttribute('aria-label'), (el as HTMLElement & { disabled: boolean }).disabled])).toEqual(['outlined', 'small', 'wide', null, null, false]);
    const [chip, text] = [await box(odd.locator('#chip')), await box(typing(page, 'odd'))];
    expect(chip.width).toBeGreaterThan(0);
    expect(chip.x + chip.width).toBeLessThanOrEqual(text.x);
    await settle(page);
    expect(seen.filter((text) => text.includes('CCM-8'))).toHaveLength(1);
  });

  test('CCM-9: whether it can be sent is its own state — yes only while it is not disabled, not sending, not blocked, has something to send, is within maxLength, and no File item is uploading or failed and retryable — with a reason by name for each that is not true; sendablechange is emitted once with both when the answer or the reasons change, by a person or by the product, and not when it is first presented', async ({ page }) => {
    const lead = `<script>window.__first = []; document.addEventListener('sendablechange', (event) => window.__first.push(event.detail.reasons.join('+')));</script>`;
    await mount(page, [fx('a', { attachments: 'given', ...FILES, maxLength: 5 }), ...one('inline-typed', 'inline-uploading', 'inline-failed', 'inline-disabled', 'inline-sending', 'blocked', 'inline-over-limit')], { lead });
    await settle(page);
    expect(await page.evaluate(() => (window as unknown as { __first: string[] }).__first), 'none when first presented').toEqual([]);
    const sendable = (id: string) => host(page, id).evaluate((el) => (el as El).sendable);
    expect(await Promise.all(['inline-typed', 'inline-uploading', 'inline-failed', 'inline-disabled', 'inline-sending', 'blocked', 'inline-over-limit', 'a'].map(sendable))).toEqual([true, false, false, false, false, false, false, false]);
    await record(page, 'a');
    const step = async (act: () => Promise<unknown>) => {
      await act();
      await settle(page);
      return (await events(page)).filter((e) => e.startsWith('sendablechange'));
    };
    await focus(page, 'a');
    expect(await step(() => page.keyboard.type(' '))).toEqual([]);
    expect(await step(() => page.keyboard.type('a'))).toEqual(['sendablechange:true:']);
    expect(await step(() => page.keyboard.type('b'))).toEqual([]);
    expect(await step(() => page.keyboard.type('cdef'))).toEqual(['sendablechange:false:length']);
    expect(await step(() => host(page, 'a').evaluate((el) => ((el as El).value = 'abc')))).toEqual(['sendablechange:true:']);
    expect(await step(() => set(page, 'a', { blocked: true, sending: true }))).toEqual(['sendablechange:false:sending+blocked']);
    expect(await step(() => set(page, 'a', { blocked: false, sending: false, disabled: true }))).toEqual(['sendablechange:false:disabled']);
    expect(await step(() => set(page, 'a', { disabled: false, value: '' }))).toEqual(['sendablechange:false:empty']);
    // The File items: one that would be carried is something to send; one on its way, or failed and retryable, holds it back.
    const add = (attributes: string) => host(page, 'a').evaluate((el, a) => el.insertAdjacentHTML('beforeend', `<tanrei-file-item ${a}></tanrei-file-item>`), attributes);
    expect(await step(() => add('value="a" name="a.pdf" status="done"'))).toEqual(['sendablechange:true:']);
    expect(await step(() => add('value="b" name="b.pdf" status="uploading"'))).toEqual(['sendablechange:false:uploading']);
    expect(await step(() => host(page, 'a').locator('tanrei-file-item').nth(1).evaluate((el) => Object.assign(el, { status: 'error', retryable: true, errorText: 'Lost' })))).toEqual(['sendablechange:false:failed']);
    expect(await step(() => host(page, 'a').locator('tanrei-file-item').nth(1).evaluate((el) => Object.assign(el, { retryable: false })))).toEqual(['sendablechange:true:']);
    // A failed item that cannot be retried is not carried: alone, there is nothing to send.
    expect(await step(() => host(page, 'a').locator('tanrei-file-item').first().evaluate((el) => el.remove()))).toEqual(['sendablechange:false:empty']);
  });

  test('CCM-10: while it cannot be sent the send button is a disabled Button — drawn, exposed and out of the focus order as the Button says — and enabled again when it can; a Button in the send slot that the product disabled itself is never enabled; nothing else is added to it', async ({ page }) => {
    await mount(page, [...one('inline-empty', 'own-buttons'), fx('mine', { value: 'Hi' }, { content: '<tanrei-button slot="send" variant="filled" disabled>Send</tanrei-button>' })]);
    const state = (id: string) => send(page, id).evaluate((el) => [(el as HTMLElement & { disabled: boolean }).disabled, el.shadowRoot!.querySelector('button')!.disabled, el.getAttributeNames().filter((name) => name.startsWith('aria-') || name.startsWith('data-state')).length]);
    expect(await state('inline-empty')).toEqual([true, true, 0]);
    await focus(page, 'inline-empty');
    await tab(page);
    expect(await host(page, 'inline-empty').evaluate((el) => el.matches(':focus-within')), 'a disabled send button is not a stop').toBe(false);
    await focus(page, 'inline-empty');
    await page.keyboard.type('x');
    await settle(page);
    expect(await state('inline-empty')).toEqual([false, false, 0]);
    await page.keyboard.press('Backspace');
    await settle(page);
    expect((await state('inline-empty'))[0]).toBe(true);
    // The product's own Button: disabled while nothing can be sent, and given back.
    const own = host(page, 'own-buttons').locator('[slot="send"]');
    const off = () => own.evaluate((el) => (el as HTMLElement & { disabled: boolean }).disabled);
    expect(await off()).toBe(false);
    await set(page, 'own-buttons', { value: '' });
    expect(await off()).toBe(true);
    await set(page, 'own-buttons', { value: 'Again' });
    expect(await off()).toBe(false);
    // One the product disabled itself stays disabled though the message can be sent.
    expect(await host(page, 'mine').evaluate((el) => [(el as El).sendable, (el.querySelector('[slot="send"]') as HTMLElement & { disabled: boolean }).disabled])).toEqual([true, true]);
    await set(page, 'mine', { value: '' });
    await set(page, 'mine', { value: 'Hi again' });
    expect(await host(page, 'mine').locator('[slot="send"]').evaluate((el) => (el as HTMLElement & { disabled: boolean }).disabled)).toBe(true);
  });

  test('CCM-11: activating the send button, or asking by the keyboard, while it can be sent emits send exactly once with value exactly as it stands — nothing trimmed — and the attachments in the order of the strip: the kept files while attachments is own, the value of every File item that has not failed while it is given; it opens no connection itself', async ({ page }) => {
    await mount(page, [fx('own', { attachments: 'own', ...FILES, keepAfterSend: true }), fx('given', { attachments: 'given', ...FILES, keepAfterSend: true, value: '  two\n\nlines \t' }, { items: [file({ value: 'a', name: 'a.pdf', status: 'done' }), file({ value: 'e', name: 'e.pdf', status: 'error', errorText: 'Too large' }), file({ value: 'p', name: 'p.pdf' })] })]);
    const requests: string[] = [];
    page.on('request', (request) => !/^(blob|data):/.test(request.url()) && requests.push(request.url()));
    await record(page, 'given');
    await send(page, 'given').click();
    expect((await events(page)).filter((e) => e.startsWith('send'))).toEqual(['send:  two\n\nlines \t|a+p']);
    await focus(page, 'given');
    await page.keyboard.press('Enter');
    expect((await events(page)).filter((e) => e.startsWith('send'))).toEqual(['send:  two\n\nlines \t|a+p']);
    await hand(page, 'own', ['brief.pdf', 'plan.png']);
    await record(page, 'own');
    const sent = await host(page, 'own').evaluate((el) => {
      let detail: { value: string; attachments: File[] } | undefined;
      el.addEventListener('send', (event) => (detail = (event as CustomEvent).detail), { once: true });
      (el.shadowRoot!.querySelector('.send > tanrei-button')!.shadowRoot!.querySelector('button') as HTMLButtonElement).click();
      return { value: detail!.value, files: detail!.attachments.map((each) => [each instanceof File, each.name]), same: detail!.attachments.every((each, index) => each === (el as El).files[index]) };
    });
    expect(sent).toEqual({ value: '', files: [[true, 'brief.pdf'], [true, 'plan.png']], same: true });
    expect((await events(page)).filter((e) => e.startsWith('send'))).toHaveLength(1);
    expect(requests).toEqual([]);
  });

  test('CCM-12: the embedded text input’s action is a request to send — with sendKey enter, Enter sends and inserts no line break and Shift+Enter begins a line; with modifier, Enter begins a line; Ctrl+Enter and Command+Enter send under both and insert nothing; the on-screen keyboard is asked for a return key; a sendKey it does not know is enter, and reported; no other key sends and Escape does nothing', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('enter', { value: 'ab', keepAfterSend: true }), fx('modifier', { sendKey: 'modifier', value: 'ab', keepAfterSend: true }), fx('odd', { sendKey: 'tab', value: 'ab', keepAfterSend: true })]);
    const press = async (id: string, key: string) => {
      await record(page, id);
      await focus(page, id);
      await native(page, id).evaluate((el) => (el as HTMLTextAreaElement).setSelectionRange(1, 1));
      await page.keyboard.press(key);
      await settle(page);
      const heard = (await events(page)).filter((e) => e.startsWith('send') || e.startsWith('input'));
      const value = await host(page, id).evaluate((el) => (el as El).value);
      if (value !== 'ab') await set(page, id, { value: 'ab' });
      return [...heard, value].join(' / ');
    };
    expect(await typing(page, 'enter').evaluate((el) => (el as HTMLElement & { enterKey: string }).enterKey)).toBe('action');
    expect(await typing(page, 'modifier').evaluate((el) => (el as HTMLElement & { enterKey: string }).enterKey)).toBe('line-break');
    expect(await native(page, 'enter').getAttribute('enterkeyhint')).toBe('enter');
    expect(await press('enter', 'Enter')).toBe('send:ab| / ab');
    expect(await press('enter', 'Shift+Enter')).toBe('input:a\nb / a\nb');
    expect(await press('enter', 'Control+Enter')).toBe('send:ab| / ab');
    expect(await press('enter', 'Meta+Enter')).toBe('send:ab| / ab');
    expect(await press('modifier', 'Enter')).toBe('input:a\nb / a\nb');
    expect(await press('modifier', 'Shift+Enter')).toBe('input:a\nb / a\nb');
    expect(await press('modifier', 'Control+Enter')).toBe('send:ab| / ab');
    expect(await press('modifier', 'Meta+Enter')).toBe('send:ab| / ab');
    expect(await press('odd', 'Enter')).toBe('send:ab| / ab');
    expect(await press('enter', 'Escape')).toBe('ab');
    expect(await press('enter', 'Tab')).toBe('ab');
    // The embedded text input's own events of the key do not leave the element.
    await record(page, 'enter');
    await focus(page, 'enter');
    await page.keyboard.type('c');
    await page.keyboard.press('Enter');
    await host(page, 'enter').evaluate((el) => (el as HTMLElement).blur());
    expect((await events(page)).filter((e) => ['change', 'action', 'rowschange'].includes(e))).toEqual([]);
    expect(seen.filter((text) => text.includes('CCM-12'))).toHaveLength(1);
  });

  for (const order of ['chromium', 'firefox', 'webkit'] as const) {
    test(`CCM-13: an input method’s Enter never sends, in the order ${order} reports a composition’s events — the committing Enter emits no send, is not counted as a request, and leaves the committed text in the typing area; the first Enter after the composition has ended sends`, async ({ page }) => {
      await mount(page, [fx('a', { keepAfterSend: true })]);
      await record(page, 'a');
      await focus(page, 'a');
      const prevented = await native(page, 'a').evaluate((input, o) => {
        const element = input as HTMLTextAreaElement;
        const key = (name: string, composing: boolean, code229: boolean) => {
          const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, composed: true, isComposing: composing });
          if (code229) Object.defineProperty(event, 'keyCode', { value: 229 });
          element.dispatchEvent(event);
          return event.defaultPrevented;
        };
        const composition = (type: string, data: string) => element.dispatchEvent(new CompositionEvent(type, { data, bubbles: true, composed: true }));
        const typed = (inputType: string, data: string, composing: boolean) => element.dispatchEvent(new InputEvent('input', { inputType, data, isComposing: composing, bubbles: true, composed: true }));
        key('Process', false, true);
        composition('compositionstart', '');
        element.value = 'かんじ';
        typed('insertCompositionText', 'かんじ', true);
        let stopped = false;
        if (o === 'webkit') {
          element.value = '漢字';
          typed('insertFromComposition', '漢字', true);
          composition('compositionend', '漢字');
          stopped = key('Enter', false, true);
        } else {
          stopped = key('Enter', true, true);
          element.value = '漢字';
          if (o === 'chromium') typed('insertCompositionText', '漢字', true);
          composition('compositionend', '漢字');
          if (o === 'firefox') typed('insertCompositionText', '漢字', false);
        }
        return stopped;
      }, order);
      await settle(page);
      expect(prevented, 'the key is left to the platform').toBe(false);
      expect((await events(page)).filter((e) => e.startsWith('send:') || e.startsWith('sendblocked'))).toEqual([]);
      expect(await host(page, 'a').evaluate((el) => (el as El).value)).toBe('漢字');
      await page.keyboard.press('Enter');
      expect((await events(page)).filter((e) => e.startsWith('send:'))).toEqual(['send:漢字|']);
    });
  }

  test('CCM-13: a real composition in Japanese — the Enter that commits sends nothing and leaves the committed text; the next Enter sends it; and the chat composer has no key listener of its own that could send', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium drives an input method from a test (CDP Input.imeSetComposition)');
    await mount(page, [fx('a', { keepAfterSend: true })]);
    await record(page, 'a');
    await focus(page, 'a');
    const cdp = await page.context().newCDPSession(page);
    for (const text of ['か', 'かん', 'かんじ']) await cdp.send('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length });
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Process', windowsVirtualKeyCode: 229, nativeVirtualKeyCode: 229 });
    await cdp.send('Input.insertText', { text: '漢字' });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', windowsVirtualKeyCode: 13 });
    await cdp.detach();
    await settle(page);
    expect((await events(page)).filter((e) => e.startsWith('send:'))).toEqual([]);
    expect(await host(page, 'a').evaluate((el) => (el as El).value)).toBe('漢字');
    await page.keyboard.press('Enter');
    expect((await events(page)).filter((e) => e.startsWith('send:'))).toEqual(['send:漢字|']);
    // A keydown that reaches the element and not the typing area's own reading of it sends nothing.
    await host(page, 'a').evaluate((el) => el.shadowRoot!.querySelector('.capsule')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true, cancelable: true })));
    expect((await events(page)).filter((e) => e.startsWith('send:'))).toEqual([]);
  });

  test('CCM-14: a request to send by the keyboard while it cannot be sent emits no send, inserts no line break, and keeps the text, the attachments and the focus; while a reason other than empty holds it emits sendblocked exactly once with the reasons; while the only reason is empty it does nothing at all', async ({ page }) => {
    await mount(page, [fx('a', { blocked: true, value: 'Hello', maxLength: 3 }), fx('empty', {})]);
    await record(page, 'a');
    await focus(page, 'a');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Control+Enter');
    expect((await events(page)).filter((e) => !e.startsWith('sendablechange'))).toEqual(['sendblocked:false:blocked+length', 'sendblocked:false:blocked+length']);
    expect(await host(page, 'a').evaluate((el) => [(el as El).value, el.matches(':focus-within')])).toEqual(['Hello', true]);
    await record(page, 'empty');
    await focus(page, 'empty');
    await page.keyboard.press('Enter');
    await page.keyboard.type('  ');
    await page.keyboard.press('Enter');
    expect((await events(page)).filter((e) => !e.startsWith('input'))).toEqual([]);
    expect(await host(page, 'empty').evaluate((el) => (el as El).value)).toBe('  ');
  });

  test('CCM-15: once send has been emitted it empties itself at once — the text, every file it keeps and every File item it drew, refused ones too — emitting neither input nor attachmentschange; the product’s own File items are left; with keepAfterSend it keeps everything, and clear() then does the same emptying', async ({ page }) => {
    await mount(page, [fx('own', { attachments: 'own', ...FILES, accept: ['.pdf'], typeErrorText: 'Only PDF files.', value: 'Here' }), fx('keep', { attachments: 'own', ...FILES, keepAfterSend: true, value: 'Kept' }), fx('given', { attachments: 'given', ...FILES, value: 'With one' }, { items: [file({ value: 'a', name: 'a.pdf', status: 'done' })] })]);
    await hand(page, 'own', ['brief.pdf', 'notes.txt']);
    expect(await ownItems(page, 'own').count()).toBe(2);
    await record(page, 'own');
    const seen = await host(page, 'own').evaluate((el) => {
      let during = '';
      el.addEventListener('send', () => (during = `${(el as El).value}|${(el as El).files.length}`), { once: true });
      (el.shadowRoot!.querySelector('.send > tanrei-button')!.shadowRoot!.querySelector('button') as HTMLButtonElement).click();
      return { during, value: (el as El).value, files: (el as El).files.length };
    });
    expect(seen).toEqual({ during: 'Here|1', value: '', files: 0 });
    await settle(page);
    expect(await ownItems(page, 'own').count()).toBe(0);
    expect(await native(page, 'own').evaluate((el) => (el as HTMLTextAreaElement).value)).toBe('');
    expect((await events(page)).filter((e) => e.startsWith('input') || e.startsWith('attachmentschange'))).toEqual([]);
    // The product's items are the product's.
    await send(page, 'given').click();
    await settle(page);
    expect(await host(page, 'given').evaluate((el) => [(el as El).value, el.querySelectorAll('tanrei-file-item').length])).toEqual(['', 1]);
    // keepAfterSend, and the way to empty it.
    await hand(page, 'keep', ['brief.pdf']);
    await record(page, 'keep');
    await send(page, 'keep').click();
    await settle(page);
    expect(await host(page, 'keep').evaluate((el) => [(el as El).value, (el as El).files.length])).toEqual(['Kept', 1]);
    await host(page, 'keep').evaluate((el) => (el as El).clear());
    await settle(page);
    expect(await host(page, 'keep').evaluate((el) => [(el as El).value, (el as El).files.length, el.shadowRoot!.querySelectorAll('tanrei-file-item').length])).toEqual(['', 0, 0]);
    expect((await events(page)).filter((e) => e.startsWith('input') || e.startsWith('attachmentschange'))).toEqual([]);
  });

  test('CCM-16: once send has been emitted focus is in the typing area — whether the person sent with the send button or with a key — and nowhere new while it is disabled', async ({ page }) => {
    await mount(page, [fx('a', { value: 'One' }), fx('b', { value: 'Two' })]);
    await send(page, 'a').click();
    await settle(page);
    expect(await focused(page)).toBe(TYPING);
    await set(page, 'a', { value: 'Again' });
    await page.keyboard.press('Enter');
    await settle(page);
    expect(await focused(page)).toBe(TYPING);
    // Sent, and disabled by the product in its handler: focus is moved nowhere — from the send on, none arrives in it.
    // Where the engine gives focus to a button that is pressed (WebKit on Linux), focus is on the send button when send
    // is emitted, and the platform takes it from the button, disabled now, at its next frame: that frame is waited for.
    await host(page, 'b').evaluate((el) =>
      el.addEventListener('send', () => {
        (el as El & { disabled: boolean }).disabled = true;
        const arrived: string[] = ((window as unknown as { __arrived: string[] }).__arrived = []);
        el.addEventListener('focusin', (event) => arrived.push((event.composedPath()[0] as Element).localName));
      }),
    );
    await send(page, 'b').click();
    await settle(page);
    await expect.poll(() => host(page, 'b').evaluate((el) => el.matches(':focus-within'))).toBe(false);
    expect(await page.evaluate(() => (window as unknown as { __arrived: string[] }).__arrived)).toEqual([]);
  });

  test('CCM-17: while sending nothing more is sent, the typing area and the attachments stay open and it is exposed as busy; with stoppable a stop button stands in the send button’s place — the one it brings, with the stop glyph and stopLabel, or the product’s in the stop slot — enabled, and activating it emits stop once and changes nothing; no key stops; when the button there changes while it has focus, focus stays on the one now there, or goes to the typing area where that one is disabled', async ({ page }) => {
    await mount(page, [...one('inline-sending', 'inline-stoppable'), fx('slot', { sending: true, stoppable: true }, { slots: { stop: 'Stop now' } }), fx('flip', { value: 'Hi', stopLabel: 'Stop' })]);
    expect(await capsule(page, 'inline-sending').getAttribute('aria-busy')).toBe('true');
    expect(await send(page, 'inline-sending').evaluate((el) => [(el as HTMLElement & { disabled: boolean }).disabled, el.querySelector('[slot="icon"]')!.textContent])).toEqual([true, 'send']);
    await focus(page, 'inline-sending');
    await page.keyboard.type('!');
    expect(await host(page, 'inline-sending').evaluate((el) => (el as El).value)).toBe('And one more thing!');
    const stop = send(page, 'inline-stoppable');
    expect(await stop.evaluate((el) => [el.getAttribute('part'), (el as HTMLElement & { disabled: boolean }).disabled, el.querySelector('[slot="icon"]')!.textContent, el.shadowRoot!.querySelector('button')!.getAttribute('aria-label')])).toEqual(['button stop-button', false, 'stop', 'Stop']);
    await record(page, 'inline-stoppable');
    await stop.click();
    await focus(page, 'inline-stoppable');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Enter');
    // (Enter asks to send, which a sending under way holds back: CCM-14. It stops nothing.)
    expect(await events(page)).toEqual(['stop', 'sendblocked:false:sending+empty']);
    expect(await host(page, 'inline-stoppable').evaluate((el) => (el as El & { sending: boolean }).sending)).toBe(true);
    await record(page, 'slot');
    await host(page, 'slot').locator('[slot="stop"]').click();
    expect(await events(page)).toEqual(['stop']);
    // The send button has focus when the product begins a stoppable sending: focus stays in that place.
    await send(page, 'flip').evaluate((el) => (el as HTMLElement).focus());
    await set(page, 'flip', { sending: true, stoppable: true });
    expect(await focused(page)).toContain('stop-button');
    // …and when it ends with nothing to send, the button there is disabled: focus goes to the typing area.
    await set(page, 'flip', { sending: false, value: '' });
    expect(await focused(page)).toBe(TYPING);
  });

  test('CCM-18: with maxLength it counts user-perceived characters — an emoji or a letter with its accents once — and keeps the limit to itself: no edit is refused, no paste shortened and no value cut; over the limit it holds the reason length, draws the capsule in its error condition and exposes the typing area as invalid, and ends both when the count is within the limit again; a maxLength that is not a number above zero sets none', async ({ page }) => {
    await mount(page, [fx('a', { maxLength: 4, counter: true }), fx('none', { maxLength: -2, counter: true, value: 'abcdefgh' })]);
    await record(page, 'a');
    await focus(page, 'a');
    await page.keyboard.insertText('👍🏽éáx');
    await settle(page);
    expect(await host(page, 'a').locator('.counter').textContent()).toBe('4/4');
    expect(await capsule(page, 'a').evaluate((el) => el.hasAttribute('data-error'))).toBe(false);
    await page.keyboard.insertText('yz and a paste that is far too long');
    await settle(page);
    expect(await host(page, 'a').evaluate((el) => (el as El).value)).toBe('👍🏽éáxyz and a paste that is far too long');
    expect(await capsule(page, 'a').evaluate((el) => el.hasAttribute('data-error'))).toBe(true);
    expect((await drawn(page, 'a')).edge).toBe(await color(page, 'error-focused-outline-color'));
    expect(await native(page, 'a').getAttribute('aria-invalid')).toBe('true');
    expect((await events(page)).filter((e) => e.startsWith('sendablechange'))).toEqual(['sendablechange:true:', 'sendablechange:false:length']);
    expect(await host(page, 'a').evaluate((el) => [(el as El & { error: boolean }).error, el.hasAttribute('error')]), 'it never sets its own error prop').toEqual([false, false]);
    await set(page, 'a', { value: 'abcd' });
    expect(await capsule(page, 'a').evaluate((el) => el.hasAttribute('data-error'))).toBe(false);
    expect(await native(page, 'a').getAttribute('aria-invalid')).toBeNull();
    expect(await host(page, 'none').evaluate((el) => [el.shadowRoot!.querySelector('.counter')!.textContent, (el as El).sendable])).toEqual(['8', true]);
  });

  test('CCM-19: the counter is drawn while counter is true and it is not disabled — the count, then a slash and maxLength where one is set, on one line in counter.typescale and counter.color, isolated, in digits of equal width, and in counter.error.color while over; what it shows is the first part of the typing area’s description; it is no live region', async ({ page }) => {
    await mount(page, [...one('counter', 'inline-over-limit', 'inline-disabled'), fx('plain', { counter: true, value: 'abc' })]);
    const read = (id: string) =>
      host(page, id).locator('.counter').evaluate((el) => {
        const s = getComputedStyle(el);
        return { text: el.textContent, color: s.color, size: s.fontSize, numeric: s.fontVariantNumeric, bidi: s.unicodeBidi, wrap: s.whiteSpace, live: el.closest('[aria-live]') !== null || el.hasAttribute('aria-live') };
      });
    const counter = await read('counter');
    expect(counter).toMatchObject({ text: '44/280', color: await color(page, 'counter-color'), numeric: 'tabular-nums', bidi: 'isolate', wrap: 'nowrap', live: false });
    near(Number.parseFloat(counter.size), await token(page, 'counter-typescale-font-size'), 'the counter’s text style');
    const long = [...String(one('inline-over-limit')[0]!.props.value)].length;
    expect(long).toBeGreaterThan(80);
    expect(await read('inline-over-limit')).toMatchObject({ text: `${long}/80`, color: await color(page, 'counter-error-color') });
    expect((await read('plain')).text).toBe('3');
    expect(await host(page, 'inline-disabled').locator('.counter').count()).toBe(0);
    expect(await native(page, 'counter').getAttribute('aria-description')).toBe('44/280');
    await focus(page, 'counter');
    await page.keyboard.type('!');
    await settle(page);
    expect(await native(page, 'counter').getAttribute('aria-description')).toBe('45/280');
  });

  test('CCM-20: each attachment is one File item in the strip and nothing else — drawn, exposed and answered as the File item says, from its own tokens, with removeLabel and retryLabel as the names of its actions; the chat composer restyles none and keeps the order given', async ({ page }) => {
    await mount(page, one('inline-failed'));
    const items = host(page, 'inline-failed').locator('tanrei-file-item');
    expect(await items.evaluateAll((list) => list.map((el) => [el.getAttribute('value'), el.getAttribute('style'), el.getAttribute('class')]))).toEqual([['a', null, null], ['e', null, null], ['f', null, null]]);
    expect(await items.nth(1).evaluate((el) => [...el.shadowRoot!.querySelectorAll('.action')].map((action) => action.getAttribute('aria-label')))).toEqual(['Try again', 'Remove']);
    expect(await items.nth(0).evaluate((el) => el.shadowRoot!.querySelector('.action.remove')!.getAttribute('aria-label'))).toBe('Remove');
    // An item's own name of an action stands where the chat composer gives none.
    await set(page, 'inline-failed', { removeLabel: '' });
    await items.nth(0).evaluate((el) => el.setAttribute('remove-label', 'Take away'));
    await settle(page);
    expect(await items.nth(0).evaluate((el) => el.shadowRoot!.querySelector('.action.remove')!.getAttribute('aria-label'))).toBe('Take away');
    // Their order in the strip is the order given.
    const tops = await items.evaluateAll((list) => list.map((el) => el.getBoundingClientRect().top));
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
  });

  test('CCM-21: while attachments is given it keeps no file and lays out the product’s File items as they are — files that arrive are judged by its file picker and told by select and reject, and none is drawn until the product gives it back as a File item; an item’s remove and retry reach the product with its value and change nothing', async ({ page }) => {
    await mount(page, [fx('a', { attachments: 'given', ...FILES, accept: ['.pdf'], value: 'x' }, { items: [file({ value: 'e', name: 'e.pdf', status: 'error', errorText: 'Lost', retryable: true })] })]);
    await record(page, 'a');
    await choose(page, 'a', [{ name: 'brief.pdf', mimeType: 'application/pdf' }, { name: 'notes.txt', mimeType: 'text/plain' }]);
    expect((await events(page)).filter((e) => !e.startsWith('sendablechange'))).toEqual(['select:brief.pdf', 'reject:notes.txt=type']);
    expect(await host(page, 'a').evaluate((el) => [(el as El).files.length, el.querySelectorAll('tanrei-file-item').length, el.shadowRoot!.querySelectorAll('tanrei-file-item').length])).toEqual([0, 1, 0]);
    const item = host(page, 'a').locator('tanrei-file-item');
    await item.locator('.action.retry').click();
    await item.locator('.action.remove').click();
    expect(await events(page)).toEqual(['retry:e', 'remove:e']);
    expect(await item.count()).toBe(1);
    // addFiles() keeps nothing here, and says so.
    const seen = warnings(page);
    expect(await hand(page, 'a', ['more.pdf'])).toEqual([]);
    expect(seen.filter((text) => text.includes('CCM-22'))).toHaveLength(1);
  });

  test('CCM-22: while attachments is own it keeps the files itself — an arrival first removes the File items an earlier one refused, passes over a file it already keeps, keeps each that passed after the others and refuses for the count each beyond the room maxFiles leaves, or without multiple puts the new file in the kept one’s place; each kept file is a pending File item given the file, each refused one a failed row with the product’s sentence; select, reject and attachmentschange are emitted once each, in that order; files, addFiles() and clear() are the product’s', async ({ page }) => {
    await mount(page, [fx('a', { attachments: 'own', ...FILES, accept: ['.pdf', '.png'], maxFiles: 3, typeErrorText: 'Only PDF and PNG.', countErrorText: 'Three at most.' }), fx('single', { attachments: 'own', ...FILES, multiple: false })]);
    await record(page, 'a');
    await carry(page, 'a', 'drop', ['brief.pdf', 'holiday.mov']);
    expect((await events(page)).filter((e) => !e.startsWith('sendablechange'))).toEqual(['select:brief.pdf', 'reject:holiday.mov=type', 'attachmentschange:brief.pdf']);
    const rows = () => ownItems(page, 'a').evaluateAll((list) => list.map((el) => {
      const item = el as HTMLElement & { name: string; status: string; errorText: string; retryable: boolean; file: File | null; interactive: boolean };
      return `${item.name}:${item.status}:${item.errorText}:${item.file instanceof File}:${item.retryable}:${item.interactive}`;
    }));
    expect(await rows()).toEqual(['brief.pdf:pending::true:false:false', 'holiday.mov:error:Only PDF and PNG.:false:false:false']);
    expect(await host(page, 'a').evaluate((el) => (el.shadowRoot!.querySelector('tanrei-file-picker') as HTMLElement & { maxFiles: number }).maxFiles), 'the room that is left').toBe(2);
    // The next arrival: the refused row leaves; the file it keeps is passed over; one too many is refused for the count.
    await carry(page, 'a', 'drop', ['brief.pdf']);
    expect((await events(page)).filter((e) => !e.startsWith('sendablechange'))).toEqual([]);
    expect(await rows()).toEqual(['brief.pdf:pending::true:false:false']);
    expect(await hand(page, 'a', ['one.png', 'two.png', 'three.png'])).toEqual(['three.png=count']);
    expect(await rows()).toEqual(['brief.pdf:pending::true:false:false', 'one.png:pending::true:false:false', 'two.png:pending::true:false:false', 'three.png:error:Three at most.:false:false:false']);
    expect((await events(page)).filter((e) => !e.startsWith('sendablechange')), 'nothing for what the product handed over').toEqual([]);
    expect(await host(page, 'a').evaluate((el) => [(el as El).files.map((each) => each.name), (el as El).files !== (el as El).files])).toEqual([['brief.pdf', 'one.png', 'two.png'], true]);
    // The remove action of a kept file's item, and of a refused one's.
    await ownItems(page, 'a').nth(1).locator('.action.remove').click();
    await ownItems(page, 'a').nth(2).locator('.action.remove').click();
    await settle(page);
    expect((await events(page)).filter((e) => !e.startsWith('sendablechange'))).toEqual(['attachmentschange:brief.pdf+two.png']);
    await host(page, 'a').evaluate((el) => (el as El).clear());
    await settle(page);
    expect(await host(page, 'a').evaluate((el) => [(el as El).files.length, el.shadowRoot!.querySelectorAll('tanrei-file-item').length])).toEqual([0, 0]);
    // Without multiple: the new file takes the kept one's place.
    await record(page, 'single');
    await choose(page, 'single', [{ name: 'first.pdf', mimeType: 'application/pdf' }]);
    await choose(page, 'single', [{ name: 'second.pdf', mimeType: 'application/pdf' }]);
    expect((await events(page)).filter((e) => e.startsWith('attachmentschange'))).toEqual(['attachmentschange:first.pdf', 'attachmentschange:second.pdf']);
    expect(await host(page, 'single').evaluate((el) => (el as El).files.map((each) => each.name))).toEqual(['second.pdf']);
  });

  test('CCM-23: while files are dragged over any part of the capsule it is drawn as receiving — receiving.container.color, its edge receiving.outline.width wide in receiving.outline.color, at its own shape and inside its own box, so that nothing moves; letting go ends the condition, takes the drop and has the files judged as a choice is; a drag that holds no file draws nothing; while attachments is none or it is disabled nothing is taken', async ({ page }) => {
    await mount(page, [fx('a', { attachments: 'own', ...FILES, accept: ['.pdf'], typeErrorText: 'Only PDF.' }), fx('none', {}), fx('off', { attachments: 'own', ...FILES, disabled: true })]);
    const rest = await drawn(page, 'a');
    const before = await places(page, 'a');
    expect(await carry(page, 'a', 'dragenter', ['brief.pdf'])).toBe(true);
    expect(await carry(page, 'a', 'dragover', ['brief.pdf'])).toBe(true);
    expect(await capsule(page, 'a').evaluate((el) => el.hasAttribute('data-receiving'))).toBe(true);
    const receiving = await drawn(page, 'a');
    expect(receiving).toMatchObject({ fill: await color(page, 'receiving-container-color'), edge: await color(page, 'receiving-outline-color'), radius: rest.radius });
    near(receiving.width, await token(page, 'receiving-outline-width'), 'the receiving edge');
    expect(await places(page, 'a')).toEqual(before);
    await record(page, 'a');
    expect(await carry(page, 'a', 'drop', ['brief.pdf', 'notes.txt'])).toBe(true);
    expect(await capsule(page, 'a').evaluate((el) => el.hasAttribute('data-receiving'))).toBe(false);
    expect((await events(page)).filter((e) => !e.startsWith('sendablechange'))).toEqual(['select:brief.pdf', 'reject:notes.txt=type', 'attachmentschange:brief.pdf']);
    expect(await focused(page), 'a drop moves focus nowhere').not.toContain('embedded-text-input');
    // Leaving ends it too.
    await carry(page, 'a', 'dragenter', ['brief.pdf']);
    await carry(page, 'a', 'dragleave', ['brief.pdf']);
    expect(await capsule(page, 'a').evaluate((el) => el.hasAttribute('data-receiving'))).toBe(false);
    // A drag of text is the typing area's and the platform's.
    expect(await carry(page, 'a', 'dragover', [], 'some text')).toBe(false);
    expect(await capsule(page, 'a').evaluate((el) => el.hasAttribute('data-receiving'))).toBe(false);
    for (const id of ['none', 'off']) {
      expect(await carry(page, id, 'dragover', ['brief.pdf']), id).toBe(false);
      expect(await carry(page, id, 'drop', ['brief.pdf']), id).toBe(false);
      expect(await capsule(page, id).evaluate((el) => el.hasAttribute('data-receiving')), id).toBe(false);
      expect(await host(page, id).evaluate((el) => (el as El).files.length), id).toBe(0);
    }
  });

  test('CCM-24: a paste into the typing area that holds files and no plain text is an arrival and inserts nothing; one that holds plain text — with or without a file beside it — is left to the typing area and no file is taken; while attachments is none every paste is the typing area’s', async ({ page }) => {
    await mount(page, [fx('a', { attachments: 'own', ...FILES }), fx('none', {})]);
    await record(page, 'a');
    expect(await carry(page, 'a', 'paste', ['shot.png'])).toBe(true);
    expect((await events(page)).filter((e) => !e.startsWith('sendablechange'))).toEqual(['select:shot.png', 'attachmentschange:shot.png']);
    expect(await carry(page, 'a', 'paste', ['table.png'], 'A\tB')).toBe(false);
    expect(await carry(page, 'a', 'paste', [], 'words')).toBe(false);
    expect(await host(page, 'a').evaluate((el) => (el as El).files.map((each) => each.name))).toEqual(['shot.png']);
    expect(await carry(page, 'none', 'paste', ['shot.png'])).toBe(false);
  });

  test('CCM-25: when the browser’s picker closes with a file kept or handed over focus goes to the typing area, and with every file refused it stays on the attach button; when a File item leaves the strip while focus is in it focus goes to the remove action of the item that followed, or of the one before where none follows, or to the typing area where none is left', async ({ page }) => {
    await mount(page, [fx('own', { attachments: 'own', ...FILES, accept: ['.pdf'], typeErrorText: 'Only PDF.' }), fx('given', { attachments: 'given', ...FILES }, { items: [file({ value: 'a', name: 'a.pdf' }), file({ value: 'b', name: 'b.pdf' }), file({ value: 'c', name: 'c.pdf' })] })]);
    // By the keyboard, so that focus is on the attach button in every engine (a press of a pointer focuses no button in one).
    await attach(page, 'own').locator('button').focus();
    const [refused] = await Promise.all([page.waitForEvent('filechooser'), page.keyboard.press('Enter')]);
    await refused.setFiles([{ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.alloc(1, 1) }]);
    await settle(page);
    expect(await focused(page)).toContain('attach-button');
    await choose(page, 'own', [{ name: 'a.pdf', mimeType: 'application/pdf' }]);
    expect(await focused(page)).toBe(TYPING);
    await hand(page, 'own', ['b.pdf', 'c.pdf']);
    // Its own items: the following one, then the one before, then the typing area.
    const name = () => page.evaluate(() => {
      const item = document.activeElement?.shadowRoot?.activeElement;
      return item?.localName === 'tanrei-file-item' ? `${(item as HTMLElement & { name: string }).name}:${item.shadowRoot!.activeElement?.className}` : (document.activeElement?.shadowRoot?.activeElement?.localName ?? '');
    });
    await ownItems(page, 'own').nth(1).locator('.action.remove').focus();
    await page.keyboard.press('Enter');
    await settle(page);
    expect(await name()).toMatch(/^c\.pdf:.*remove/);
    await page.keyboard.press('Enter');
    await settle(page);
    expect(await name()).toMatch(/^a\.pdf:.*remove/);
    await page.keyboard.press('Enter');
    await settle(page);
    expect(await name()).toBe('tanrei-embedded-text-input');
    // The product's items: the product removes the one whose remove was asked for.
    await host(page, 'given').evaluate((el) => el.addEventListener('remove', (event) => (event.target as Element).remove()));
    const given = host(page, 'given').locator('tanrei-file-item');
    await given.nth(2).locator('.action.remove').focus();
    await page.keyboard.press('Enter');
    await settle(page);
    expect(await page.evaluate(() => (document.activeElement as HTMLElement & { value?: string }).value)).toBe('b');
    await page.keyboard.press('Enter');
    await settle(page);
    expect(await page.evaluate(() => (document.activeElement as HTMLElement & { value?: string }).value)).toBe('a');
    await page.keyboard.press('Enter');
    await settle(page);
    expect(await focused(page)).toBe(TYPING);
  });

  test('CCM-26: disabled — every member is disabled as its own disabled does, and every Button in a slot, each given back as it was and none the product disabled itself enabled; the capsule is drawn from the disabled tokens; no counter; no drop, no paste, no press passed on; no send, stop, select, reject or attachmentschange; it is exposed as disabled, and the text and the File items stay', async ({ page }) => {
    await mount(page, [...one('inline-disabled'), fx('a', { attachments: 'own', ...FILES, counter: true, value: 'Kept', sending: true, stoppable: true, stopLabel: 'Stop' }, { content: '<tanrei-button slot="leading" variant="text" label="Mood"><span slot="icon">mood</span></tanrei-button><tanrei-button slot="trailing" variant="text" label="Record" disabled><span slot="icon">mic</span></tanrei-button>' })]);
    await hand(page, 'a', ['brief.pdf']);
    const state = () =>
      host(page, 'a').evaluate((el) => {
        const root = el.shadowRoot!;
        const off = (selector: string, from: ParentNode = root) => (from.querySelector(selector) as (HTMLElement & { disabled: boolean }) | null)?.disabled;
        return { typing: off('tanrei-embedded-text-input'), picker: off('tanrei-file-picker'), attach: off('tanrei-file-picker > tanrei-button'), place: off('.send > tanrei-button'), item: !!root.querySelector('tanrei-file-item')!.shadowRoot!.querySelector('.action.remove:disabled'), leading: off('[slot="leading"]', el), trailing: off('[slot="trailing"]', el), counter: !!root.querySelector('.counter'), group: root.querySelector('.capsule')!.getAttribute('aria-disabled') };
      });
    expect(await state()).toEqual({ typing: false, picker: false, attach: false, place: false, item: false, leading: false, trailing: true, counter: true, group: null });
    await set(page, 'a', { disabled: true });
    expect(await state()).toEqual({ typing: true, picker: true, attach: true, place: true, item: true, leading: true, trailing: true, counter: false, group: 'true' });
    expect(await drawn(page, 'a')).toMatchObject({ fill: await color(page, 'standard-disabled-container-color'), cursor: 'default' });
    near(Number((await drawn(page, 'a')).opacity), await page.evaluate((name) => Number(getComputedStyle(document.documentElement).getPropertyValue(name)), T('disabled-opacity')), 'the group’s disabled opacity');
    await record(page, 'a');
    const c = await box(capsule(page, 'a'));
    await page.mouse.click(c.x + 4, c.y + c.height - 4);
    expect(await host(page, 'a').evaluate((el) => el.matches(':focus-within'))).toBe(false);
    expect(await carry(page, 'a', 'drop', ['more.pdf'])).toBe(false);
    await host(page, 'a').evaluate((el) => (el.shadowRoot!.querySelector('.send > tanrei-button')!.shadowRoot!.querySelector('button') as HTMLButtonElement).click());
    expect((await events(page)).filter((e) => !e.startsWith('sendablechange'))).toEqual([]);
    expect(await host(page, 'a').evaluate((el) => [(el as El).value, (el as El).files.length, el.shadowRoot!.querySelectorAll('tanrei-file-item').length])).toEqual(['Kept', 1, 1]);
    await set(page, 'a', { disabled: false });
    expect(await state()).toEqual({ typing: false, picker: false, attach: false, place: false, item: false, leading: false, trailing: true, counter: true, group: null });
    // The fixture: the product's own File item and Button are disabled with it.
    expect(await host(page, 'inline-disabled').evaluate((el) => [(el.querySelector('[slot="leading"]') as HTMLElement & { disabled: boolean }).disabled, !!el.querySelector('tanrei-file-item')!.shadowRoot!.querySelector('.action.remove:disabled')])).toEqual([true, true]);
  });

  test('CCM-27: in error the capsule is drawn in its error condition — its edge at rest in error.outline.color — and error is given to the embedded text input, which exposes the typing area as invalid and draws nothing for it; nothing else is drawn, and a message is not held back for error alone', async ({ page }) => {
    await mount(page, one('error', 'inline-typed'));
    const [plain, error] = [await drawn(page, 'inline-typed'), await drawn(page, 'error')];
    expect(error.edge).toBe(await color(page, 'error-outline-color'));
    expect(error.fill).toBe(await color(page, 'error-container-color'));
    expect(plain.edge).toBe(await color(page, 'standard-outline-color'));
    near(error.width, await token(page, 'outline-width'), 'the resting edge');
    expect(await typing(page, 'error').evaluate((el) => (el as HTMLElement & { error: boolean }).error)).toBe(true);
    expect(await native(page, 'error').getAttribute('aria-invalid')).toBe('true');
    const paint = (id: string) => native(page, id).evaluate((el) => [getComputedStyle(el).color, getComputedStyle(el).caretColor]);
    expect(await paint('error')).toEqual(await paint('inline-typed'));
    expect(await host(page, 'error').evaluate((el) => (el as El).sendable)).toBe(true);
    expect(await places(page, 'error')).toEqual(await places(page, 'inline-typed'));
  });

  test('CCM-28: as the control of a Field it takes what the Field gives and passes it on to the embedded text input — the Field’s label as its own name and the typing area’s, the Field’s help with, in error, the error text after it as the last part of the typing area’s description, error and disabled — and draws none of the Field’s rows itself', async ({ page }) => {
    await mountFixtures(page, fieldSpec, { icons: true, reducedMotion: true, fixtures: [...fieldSpec.fixtures.filter((f) => f.id === 'chat-composer-supporting'), { id: 'own', props: { label: 'Reply', supportingText: 'Be kind.', error: true, errorText: 'Too long.' }, content: `<${TAG} label="Message" send-label="Send" counter max-length="3" value="Hello" attachments="own" attach-label="Attach files"></${TAG}>` }] });
    await settle(page);
    const said = (id: string) =>
      host(page, id).evaluate((el) => {
        const input = el.shadowRoot!.querySelector('tanrei-embedded-text-input')!.shadowRoot!.querySelector('.input')!;
        const capsule = el.shadowRoot!.querySelector('.capsule')!;
        return { group: capsule.getAttribute('aria-label'), name: input.getAttribute('aria-label'), description: input.getAttribute('aria-description'), invalid: input.getAttribute('aria-invalid'), error: capsule.hasAttribute('data-error'), disabled: capsule.hasAttribute('data-disabled'), rows: el.shadowRoot!.querySelectorAll('.label-row, .supporting').length };
      });
    expect(await said('chat-composer-supporting')).toEqual({ group: 'Message', name: 'Message', description: 'Everyone in this channel can read it.', invalid: null, error: false, disabled: false, rows: 0 });
    // The field's own rows are the field's: its label above the capsule, its help below.
    const field = stage(page, 'chat-composer-supporting').locator('tanrei-field');
    expect(await field.evaluate((el) => [el.shadowRoot!.querySelector('.label')!.textContent!.trim(), el.shadowRoot!.querySelector('.supporting-text')!.textContent!.trim()])).toEqual(['Message', 'Everyone in this channel can read it.']);
    // Its own label wins; the counter comes first, then the field's help, which stays in error (FLD-11), and its error
    // text last; the field's error is its own.
    expect(await said('own')).toEqual({ group: 'Message', name: 'Message', description: '5/3 Be kind. Too long.', invalid: 'true', error: true, disabled: false, rows: 0 });
    await field.evaluate((el) => Object.assign(el, { disabled: true, error: true, errorText: 'Say something.' }));
    await settle(page);
    expect(await said('chat-composer-supporting')).toMatchObject({ description: 'Everyone in this channel can read it. Say something.', invalid: 'true', error: true, disabled: true });
    // The file picker inside asks the chat composer, and not the field around it: the field hears one control.
    expect(await stage(page, 'own').locator('tanrei-field').evaluate((el) => el.shadowRoot!.querySelectorAll('.supporting-text').length)).toBe(1);
    expect(await host(page, 'own').evaluate((el) => el.shadowRoot!.querySelector('tanrei-file-picker')!.shadowRoot!.querySelector('.group')!.getAttribute('role'))).toBeNull();
  });

  test('CCM-29: a group named by label holding, in the order they are drawn, the list of File items and the controls — and Tab moves through them in that order, each one stop, the actions of each File item among them: inline, the attach button, the leading Buttons, the typing area, the trailing Buttons and the send button; stacked, the typing area, the send button, then the row beneath; no key of its own — Backspace in an empty typing area removes no attachment', async ({ page, browserName }) => {
    const items = [file({ value: 'a', name: 'a.pdf', status: 'done', statusText: 'Uploaded' })];
    const slots = { leading: ['mood'], trailing: ['mic'] };
    await mount(page, [fx('inline', { attachments: 'given', ...FILES, value: 'Hi' }, { items, slots }), fx('stacked', { layout: 'stacked', attachments: 'given', ...FILES, value: 'Hi' }, { items, slots })]);
    const walk = async (id: string, stops: number) => {
      await host(page, id).locator('tanrei-file-item .action.remove').focus();
      const path = [await focused(page)];
      for (let i = 1; i < stops; i++) {
        await tab(page);
        path.push(await focused(page));
      }
      return path.map((stop) => stop.replace(/^chat-composer>/, '').replace(/^file-item>/, ''));
    };
    expect(await walk('inline', 6)).toEqual(['remove', 'attach-button>container', 'leading>container', 'embedded-text-input>input', 'trailing>container', 'send-button>container']);
    expect(await walk('stacked', 6)).toEqual(['remove', 'embedded-text-input>input', 'send-button>container', 'attach-button>container', 'leading>container', 'trailing>container']);
    expect(await host(page, 'inline').evaluate((el) => [el.shadowRoot!.querySelectorAll('[tabindex]').length, el.hasAttribute('tabindex'), el.getAttribute('role')])).toEqual([0, false, null]);
    expect(await capsule(page, 'inline').evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), el.querySelector('.strip')!.getAttribute('role')])).toEqual(['group', 'Message', 'list']);
    // Backspace and Delete in an empty typing area remove nothing.
    await set(page, 'inline', { value: '' });
    await focus(page, 'inline');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Delete');
    await page.keyboard.press('ArrowLeft');
    expect(await host(page, 'inline').locator('tanrei-file-item').count()).toBe(1);
    // What assistive technology is given, in the order of each layout.
    await set(page, 'inline', { value: 'Hi' });
    const tree = async (id: string) => (await stage(page, id).ariaSnapshot()).split('\n').map((row) => /^\s*- (group|list|listitem|button|textbox)\b(?: "([^"]*)")?/.exec(row)).filter((found) => !!found).map((found) => `${found![1]}:${found![2] ?? ''}`);
    expect(await tree('inline')).toEqual(['group:Message', 'list:Message', 'listitem:', 'button:Remove', 'button:Attach files', 'button:mood', 'textbox:Message', 'button:mic', 'button:Send']);
    expect(await tree('stacked')).toEqual(['group:Message', 'list:Message', 'listitem:', 'button:Remove', 'textbox:Message', 'button:Send', 'button:Attach files', 'button:mood', 'button:mic']);
    if (browserName === 'chromium') expect((await axTree(page)).filter((node) => node.role === 'textbox').every((node) => node.multiline)).toBe(true);
  });

  test('CCM-30: exactly one live region, polite, through which it says, once each and in the product’s words alone: announcement when the product sets or changes it; a File item the product added after it was first presented, and one that became done or failed; for an arrival it kept itself one message with each kept file’s name and each refused file’s name and sentence — and nothing of progress or of its own making', async ({ page }) => {
    await mount(page, [fx('given', { attachments: 'given', ...FILES, announcement: 'Here before' }, { items: [file({ value: 'a', name: 'a.pdf', status: 'uploading', statusText: 'Uploading' })] }), fx('own', { attachments: 'own', ...FILES, accept: ['.pdf'], typeErrorText: 'Only PDF files can be added.', value: 'Hi' })]);
    const region = (id: string) => host(page, id).locator('.announce');
    const told = async (id: string) => {
      await settle(page);
      return region(id).evaluate((el) => [...el.children].map((line) => line.textContent));
    };
    expect(await host(page, 'given').evaluate((el) => [...el.shadowRoot!.querySelectorAll('[aria-live]')].map((each) => each.getAttribute('aria-live')))).toEqual(['polite']);
    expect(await told('given'), 'nothing of what it was first presented with').toEqual([]);
    await set(page, 'given', { announcement: 'Message sent' });
    expect(await told('given')).toEqual(['Message sent']);
    const item = host(page, 'given').locator('tanrei-file-item').first();
    await item.evaluate((el) => Object.assign(el, { progress: 0.5 }));
    expect(await told('given'), 'no progress').toEqual(['Message sent']);
    await item.evaluate((el) => Object.assign(el, { status: 'done', statusText: 'Uploaded' }));
    expect(await told('given')).toEqual(['a.pdf, Uploaded']);
    await host(page, 'given').evaluate((el) => el.insertAdjacentHTML('beforeend', '<tanrei-file-item value="b" name="b.pdf" status-text="Waiting"></tanrei-file-item>'));
    expect(await told('given')).toEqual(['b.pdf, Waiting']);
    await host(page, 'given').locator('tanrei-file-item').nth(1).evaluate((el) => Object.assign(el, { status: 'error', errorText: 'The connection was lost' }));
    expect(await told('given')).toEqual(['b.pdf, The connection was lost']);
    // Its own files: one message for the arrival; sending says nothing.
    await hand(page, 'own', ['brief.pdf', 'notes.txt']);
    expect(await told('own')).toEqual(['brief.pdf', 'notes.txt, Only PDF files can be added.']);
    await region('own').evaluate((el) => el.replaceChildren());
    await send(page, 'own').click();
    expect(await told('own')).toEqual([]);
  });

  test('CCM-31: it has no words of its own — each of its eight words is the instance’s prop, else the product’s word of its key, else nothing; a button it brings without a name is drawn, works and is reported, and so is a chat composer no label and no field names', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('given', { label: 'Message', sendLabel: '', attachments: 'own', sending: false }), { id: 'bare', props: { attachments: 'own', value: 'Hi' } }], { reducedMotion: true });
    await settle(page);
    const names = (id: string) => host(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('tanrei-button')].map((button) => button.shadowRoot!.querySelector('button')!.getAttribute('aria-label')));
    expect(await names('bare')).toEqual([null, null]);
    expect((await missingWords(page)).sort()).toEqual(['attachLabel', 'sendLabel']);
    expect(seen.filter((text) => text.includes('CCM-31') && text.includes('no accessible name; give it a label')).length).toBe(1);
    // It works without them.
    await record(page, 'bare');
    await send(page, 'bare').click();
    expect((await events(page)).filter((e) => e.startsWith('send:'))).toEqual(['send:Hi|']);
    // The product's words, once for the page; the instance's own win.
    await setWords(page, { sendLabel: 'Send', stopLabel: 'Stop', attachLabel: 'Attach files', removeLabel: 'Remove', retryLabel: 'Try again', fileTypeErrorText: 'This kind of file cannot be added.', fileSizeErrorText: 'This file is too large.', fileCountErrorText: 'No more files can be added.' });
    await settle(page);
    expect(await names('bare')).toEqual(['Attach files', 'Send']);
    await set(page, 'bare', { sendLabel: 'Send message', accept: ['.pdf'], maxSize: 2, maxFiles: 1 });
    expect(await names('bare')).toEqual(['Attach files', 'Send message']);
    await hand(page, 'bare', ['notes.txt']);
    expect(await ownItems(page, 'bare').evaluateAll((list) => list.map((el) => [(el as HTMLElement & { errorText: string }).errorText, el.shadowRoot!.querySelector('.action.remove')!.getAttribute('aria-label')]))).toEqual([['This kind of file cannot be added.', 'Remove']]);
    await set(page, 'bare', { typeErrorText: 'Only PDF here.', sending: true, stoppable: true });
    expect(await ownItems(page, 'bare').first().evaluate((el) => (el as HTMLElement & { errorText: string }).errorText)).toBe('Only PDF here.');
    expect((await names('bare'))[1]).toBe('Stop');
    await hand(page, 'bare', ['a.pdf', 'b.pdf', 'big.pdf']);
    expect(await ownItems(page, 'bare').evaluateAll((list) => list.map((el) => (el as HTMLElement & { errorText: string }).errorText))).toEqual(['', 'No more files can be added.', 'This file is too large.']);
  });

  test('CCM-32: with the text enlarged it grows with its texts — at 200 % in a width of 320 nothing is cut, overlaps or needs scrolling sideways: it is laid out stacked, the typing area keeps the capsule’s width but for the send button, the row of actions beneath wraps, and the strip wraps with no row or tile wider than it', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await mount(page, [...one('long-text', 'tiles-wrapped', 'inline-rtl')]);
    await page.addStyleTag({ content: 'html { font-size: 200%; } .stage { box-sizing: border-box !important; inline-size: 320px !important; }' });
    await settle(page);
    await expect.poll(() => capsule(page, 'long-text').getAttribute('data-layout')).toBe('stacked');
    await settle(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    for (const id of ['long-text', 'tiles-wrapped', 'inline-rtl']) {
      const fits = await host(page, id).evaluate((el) => {
        const root = el.shadowRoot!;
        const c = root.querySelector('.capsule')!.getBoundingClientRect();
        const parts = [...root.querySelectorAll('tanrei-file-item, tanrei-embedded-text-input, tanrei-button, .counter'), ...el.querySelectorAll('tanrei-file-item, tanrei-button')].map((part) => part.getBoundingClientRect()).filter((r) => r.width > 0);
        const inside = parts.every((r) => r.left >= c.left - 0.5 && r.right <= c.right + 0.5 && r.top >= c.top - 0.5 && r.bottom <= c.bottom + 0.5);
        const buttons = [...root.querySelectorAll('tanrei-button'), ...el.querySelectorAll('tanrei-button')].map((part) => part.getBoundingClientRect());
        const apart = buttons.every((a, i) => buttons.every((b, j) => i === j || a.right <= b.left + 0.5 || b.right <= a.left + 0.5 || a.bottom <= b.top + 0.5 || b.bottom <= a.top + 0.5));
        const input = root.querySelector('tanrei-embedded-text-input')!.shadowRoot!.querySelector('.input')!;
        return { inside, apart, sideways: input.scrollWidth > input.clientWidth, layout: root.querySelector('.capsule')!.getAttribute('data-layout') };
      });
      expect(fits, id).toEqual({ inside: true, apart: true, sideways: false, layout: 'stacked' });
    }
    const p = await places(page, 'long-text');
    expect(p.send!.left).toBeGreaterThan(p.typing!.left + p.typing!.width);
    expect(p.typing!.width).toBeGreaterThanOrEqual(p.capsule.width / 2 - 1);
    expect(new Set(p.leading.map((part) => Math.round(part.top))).size).toBeGreaterThan(1);
  });

  test('CCM-33: with a person’s own forced colors the capsule stands on the platform’s background with an edge in its text color at rest and in error, in its highlight at the focused width while the typing area has focus and at twice the receiving width while receiving, and in its disabled text color while disabled; the counter is the platform’s text color', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await mount(page, [...one('inline-typed', 'error', 'inline-disabled', 'inline-over-limit'), fx('drop', { attachments: 'own', ...FILES })]);
    const system = (keyword: string, property = 'color') =>
      page.evaluate(([k, p]) => {
        const probe = document.createElement('div');
        probe.style.cssText = `forced-color-adjust: none; ${p}: ${k}`;
        document.body.append(probe);
        const value = getComputedStyle(probe).getPropertyValue(p!);
        probe.remove();
        return value;
      }, [keyword, property]);
    const [canvas, text, highlight, gray] = [await system('Canvas', 'background-color'), await system('CanvasText'), await system('Highlight'), await system('GrayText')];
    const [hairline, focusedWidth, receiving] = [await token(page, 'outline-width'), await token(page, 'focused-outline-width'), await token(page, 'receiving-outline-width')];
    const rest = await drawn(page, 'inline-typed');
    expect(rest).toMatchObject({ fill: canvas, edge: text, shadow: 'none' });
    near(rest.width, hairline, 'the resting edge');
    expect(await drawn(page, 'error')).toMatchObject({ fill: canvas, edge: text });
    await focus(page, 'inline-typed');
    const focusedNow = await drawn(page, 'inline-typed');
    expect(focusedNow.edge).toBe(highlight);
    near(focusedNow.width, focusedWidth, 'the focused edge');
    await carry(page, 'drop', 'dragover', ['a.pdf']);
    const dropping = await drawn(page, 'drop');
    expect(dropping.edge).toBe(highlight);
    near(dropping.width, 2 * receiving, 'twice the receiving width');
    expect((await drawn(page, 'inline-disabled')).edge).toBe(gray);
    expect(await host(page, 'inline-over-limit').locator('.counter').evaluate((el) => getComputedStyle(el).color)).toBe(text);
    expect((await drawn(page, 'inline-over-limit')).edge).toBe(text);
  });

  test('CCM-34: right to left it is mirrored — the attach button and the leading actions at the right, the counter, the trailing actions and the send button at the left with the send button outermost; stacked, the send button at the left end of the typing line and the row beneath mirrored; the strip filled from the right; it has no direction setting of its own, and the send glyph is the icon set’s mirrored one', async ({ page }) => {
    await mount(page, one('inline-rtl', 'stacked-rtl'));
    const pib = await token(page, 'container-padding-inline-with-button');
    const i = await places(page, 'inline-rtl');
    const order = [i.send!, ...i.trailing, i.counter!, i.typing!, ...i.leading, i.attach!];
    for (let k = 1; k < order.length; k++) expect(order[k]!.left, `part ${k}`).toBeGreaterThanOrEqual(order[k - 1]!.left + order[k - 1]!.width - 0.5);
    near(i.send!.left, pib, 'the send button outermost at the left');
    near(i.attach!.right, pib, 'the attach button outermost at the right');
    const s = await places(page, 'stacked-rtl');
    near(s.send!.left, pib, 'the send button at the left end of the typing line');
    expect(s.typing!.left).toBeGreaterThan(s.send!.left + s.send!.width);
    expect(s.attach!.left).toBeGreaterThan(s.leading[0]!.left);
    expect(s.trailing[0]!.left).toBeLessThan(s.counter!.left);
    near(s.attach!.right, pib, 'the row beneath, from the right');
    // The strip: the first item's start is the capsule's right.
    const strip = await host(page, 'inline-rtl').evaluate((el) => {
      const c = el.shadowRoot!.querySelector('.strip')!.getBoundingClientRect();
      const tile = el.querySelector('tanrei-file-item[form="tile"]')!.getBoundingClientRect();
      return [Math.round(c.right - tile.right), getComputedStyle(el).direction, el.hasAttribute('dir')];
    });
    expect(strip).toEqual([Math.round(await token(page, 'container-padding-inline')), 'rtl', false]);
    expect(await send(page, 'inline-rtl').evaluate((el) => el.querySelector('[slot="icon"]')!.hasAttribute('data-tanrei-mirrored'))).toBe(true);
  });

  test('CCM-35: a change of the capsule’s fill or edge, and of the counter’s color, moves over motion.state-duration with motion.state-easing and is made at once where motion is reduced; the capsule has no motion of its own height — it is as tall as what it holds at every sample of the typing area’s own change of height, its corners keep their radius and its Buttons their distance from its bottom edge', async ({ page }) => {
    await mount(page, [fx('a', { attachments: 'own', ...FILES, counter: true, value: 'One' })], { reducedMotion: false });
    const duration = await resolveToken(page, T('motion-state-duration'), 'duration');
    const moves = await host(page, 'a').evaluate((el) => {
      const read = (selector: string) => {
        const s = getComputedStyle(el.shadowRoot!.querySelector(selector)!);
        return Object.fromEntries(s.transitionProperty.split(', ').map((name, index) => [name, Number.parseFloat(s.transitionDuration.split(', ')[index] ?? s.transitionDuration) * 1000]));
      };
      return { capsule: read('.capsule'), outline: read('.outline'), counter: read('.counter') };
    });
    expect(Object.keys(moves.capsule).sort()).toEqual(['background-color', 'box-shadow', 'opacity']);
    expect(Object.keys(moves.outline).sort()).toEqual(['border-color', 'border-width']);
    expect(Object.keys(moves.counter)).toEqual(['color']);
    for (const time of [...Object.values(moves.capsule), ...Object.values(moves.outline), ...Object.values(moves.counter)]) near(time, duration, 'motion.state-duration', 0.01);
    // The height: the capsule follows the typing area's motion, sample for sample.
    const sampled = await host(page, 'a').evaluate((el) => {
      const root = el.shadowRoot!;
      const capsule = root.querySelector('.capsule')!;
      const input = root.querySelector('tanrei-embedded-text-input')!;
      const inner = input.shadowRoot!;
      const send = root.querySelector('.send > tanrei-button')!;
      const read = () => ({ capsule: capsule.getBoundingClientRect().height, input: input.getBoundingClientRect().height, below: capsule.getBoundingClientRect().bottom - send.getBoundingClientRect().bottom, radius: getComputedStyle(capsule).borderTopLeftRadius });
      (inner.querySelector('.input') as HTMLTextAreaElement).focus();
      const before = read();
      document.execCommand('insertText', false, '\nTwo\nThree');
      const box = inner.querySelector('.box')!;
      const running = box.getAnimations();
      if (!running.length) return { before, samples: [], after: read(), own: capsule.getAnimations().length };
      const total = Number(running[0]!.effect!.getComputedTiming().duration);
      const samples = [];
      for (const part of [0, 0.25, 0.5, 0.75]) {
        for (const animation of box.getAnimations()) {
          animation.pause();
          animation.currentTime = total * part;
        }
        samples.push(read());
      }
      const own = capsule.getAnimations().filter((animation) => /size|height/.test((animation as CSSTransition).transitionProperty ?? '')).length;
      for (const animation of box.getAnimations()) animation.finish();
      return { before, samples, after: read(), own };
    });
    expect(sampled.samples.length).toBe(4);
    expect(sampled.own, 'no motion of the capsule’s own height').toBe(0);
    const rest = sampled.before.capsule - sampled.before.input;
    for (const sample of [...sampled.samples, sampled.after]) {
      near(sample.capsule - sample.input, rest, 'the capsule is the typing area’s height and a constant');
      near(sample.below, sampled.before.below, 'the send button’s distance from the bottom edge');
      expect(sample.radius).toBe(sampled.before.radius);
    }
    expect(sampled.samples[2]!.capsule).toBeGreaterThan(sampled.before.capsule + 2);
    expect(sampled.samples[2]!.capsule).toBeLessThan(sampled.after.capsule - 2);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await host(page, 'a').evaluate((el) => ['.capsule', '.outline', '.counter'].map((selector) => getComputedStyle(el.shadowRoot!.querySelector(selector)!).transitionDuration))).toEqual(['0s', '0s', '0s']);
  });

  test('CCM-36: in a form it is one control — it submits value under its name and, while it keeps its own files, each under the name given for its files; nothing while disabled or while the form disables its set; a reset empties it; after send the form is asked to submit as a submit button does — validation, then the submit event — unless send was cancelled, and it does not empty itself, whatever keepAfterSend says', async ({ page }) => {
    await page.setContent(`<!doctype html><html><head><style>${tokensCss()}</style></head><body>
      <form id="f"><fieldset id="set"><tanrei-chat-composer id="c" name="message" files-name="files" label="Message" send-label="Send" attachments="own" attach-label="Attach files" remove-label="Remove" value="First"></tanrei-chat-composer></fieldset><input id="need" name="need" required value="x" /></form>
      <script type="module">${bundle()}</script></body></html>`);
    await page.waitForFunction((tag) => !!customElements.get(tag), TAG);
    await settle(page);
    const data = () => page.evaluate(() => [...new FormData(document.querySelector('form')!).entries()].map(([key, value]) => `${key}=${value instanceof File ? `file:${value.name}` : value}`).join('&'));
    const c = page.locator('#c');
    expect(await c.evaluate((el) => [(el as El & { form: HTMLFormElement }).form.id, [...document.forms[0]!.elements].map((each) => each.id)])).toEqual(['f', ['set', 'c', 'need']]);
    expect(await data()).toBe('message=First&need=x');
    await c.evaluate((el) => (el as El).addFiles([new File(['a'], 'a.pdf'), new File(['bb'], 'b.pdf')]));
    await settle(page);
    expect(await data()).toBe('message=First&files=file:a.pdf&files=file:b.pdf&need=x');
    await page.evaluate(() => {
      const log: string[] = [];
      (window as unknown as { __log: string[] }).__log = log;
      const form = document.querySelector('form')!;
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        log.push(`submit:${[...new FormData(form).entries()].map(([key, value]) => `${key}=${value instanceof File ? value.name : value}`).join('&')}`);
      });
      for (const type of ['send', 'invalid']) document.addEventListener(type, (event) => log.push(`${type}:${(event.target as Element).id}`), true);
    });
    const log = () => page.evaluate(() => (window as unknown as { __log: string[] }).__log.splice(0));
    await c.evaluate((el) => (el as HTMLElement).focus());
    await page.keyboard.press('Enter');
    await settle(page);
    expect(await log()).toEqual(['send:c', 'submit:message=First&files=a.pdf&files=b.pdf&need=x']);
    expect(await c.evaluate((el) => [(el as El).value, (el as El).files.length]), 'in a form it does not empty itself').toEqual(['First', 2]);
    // The form's validation comes first.
    await page.locator('#need').evaluate((el) => ((el as HTMLInputElement).value = ''));
    await page.keyboard.press('Enter');
    expect(await log()).toEqual(['send:c', 'invalid:need']);
    await page.locator('#need').evaluate((el) => ((el as HTMLInputElement).value = 'x'));
    // Cancelled: no submission.
    await page.evaluate(() => document.addEventListener('send', (event) => event.preventDefault(), { once: true }));
    await c.evaluate((el) => (el as HTMLElement).focus());
    await page.keyboard.press('Enter');
    expect(await log()).toEqual(['send:c']);
    // The form disables its set; then it is disabled itself.
    await page.locator('#set').evaluate((el) => ((el as HTMLFieldSetElement).disabled = true));
    await settle(page);
    expect(await data()).toBe('need=x');
    expect(await c.evaluate((el) => el.shadowRoot!.querySelector('.capsule')!.hasAttribute('data-disabled'))).toBe(true);
    await page.locator('#set').evaluate((el) => ((el as HTMLFieldSetElement).disabled = false));
    await settle(page);
    expect(await data()).toBe('message=First&files=file:a.pdf&files=file:b.pdf&need=x');
    await page.evaluate(() => document.querySelector('form')!.reset());
    await settle(page);
    expect(await c.evaluate((el) => [(el as El).value, (el as El).files.length])).toEqual(['', 0]);
    expect(await data()).toBe('message=&need=x');
  });

  test('CCM-37: before it is defined the text area and the submit button the product wrote as its children are a working form; once defined it takes the text area’s text as its value while its own is empty, takes both out of what is drawn, focused, read and submitted, and submits under its own name', async ({ page }) => {
    await page.setContent(`<!doctype html><html><head><style>${tokensCss()}</style></head><body>
      <form><tanrei-chat-composer id="c" name="message" label="Message" send-label="Send"><textarea name="message" aria-label="Message" rows="3">Written without script</textarea><button type="submit" name="via" value="button">Send</button></tanrei-chat-composer></form></body></html>`);
    const data = () => page.evaluate(() => new URLSearchParams(new FormData(document.querySelector('form')!) as unknown as Record<string, string>).toString());
    expect(await data()).toBe('message=Written+without+script');
    await expect(page.getByRole('button', { name: 'Send' })).toHaveCount(1);
    await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible();
    await page.addScriptTag({ content: bundle(), type: 'module' });
    await page.waitForFunction((tag) => !!customElements.get(tag), TAG);
    await settle(page);
    expect(await data()).toBe('message=Written+without+script');
    expect(await page.locator('#c').evaluate((el) => [(el as El).value, ...[...el.children].map((child) => [(child as HTMLElement).hidden, (child as HTMLButtonElement).disabled, child.getBoundingClientRect().width])])).toEqual(['Written without script', [true, true, 0], [true, true, 0]]);
    await expect(page.getByRole('textbox', { name: 'Message' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Send' })).toHaveCount(1);
    expect(await page.locator('#c').evaluate((el) => !!el.shadowRoot!.querySelector('.capsule'))).toBe(true);
  });

  test('CCM-38: a prop that changes while it is shown is drawn at once and keeps the focus and the caret; an attachments it does not know is none, and reported; changing between own and given lets go of every file it keeps and removes every File item it drew, or stops drawing the product’s, emitting and announcing nothing; none draws no strip', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('a', { attachments: 'own', ...FILES, value: 'Hello there' }, { content: '<tanrei-file-item value="p" name="product.pdf"></tanrei-file-item>' }), fx('odd', { attachments: 'cloud', ...FILES })]);
    await hand(page, 'a', ['mine.pdf']);
    await focus(page, 'a');
    await native(page, 'a').evaluate((el) => (el as HTMLTextAreaElement).setSelectionRange(2, 5));
    await set(page, 'a', { layout: 'stacked', counter: true, maxLength: 50, placeholder: 'Reply', sendLabel: 'Post', error: true, maxRows: 3 });
    expect(await native(page, 'a').evaluate((el) => [(el as HTMLTextAreaElement).selectionStart, (el as HTMLTextAreaElement).selectionEnd, (el.getRootNode() as ShadowRoot).activeElement === el])).toEqual([2, 5, true]);
    expect(await capsule(page, 'a').getAttribute('data-layout')).toBe('stacked');
    await record(page, 'a');
    const strip = () => host(page, 'a').evaluate((el) => [(el as El).files.length, el.shadowRoot!.querySelectorAll('tanrei-file-item').length, el.shadowRoot!.querySelector('.strip')!.hasAttribute('hidden'), el.querySelector('tanrei-file-item')!.getBoundingClientRect().width > 0]);
    expect(await strip()).toEqual([1, 1, false, false]);
    await set(page, 'a', { attachments: 'given' });
    expect(await strip()).toEqual([0, 0, false, true]);
    await set(page, 'a', { attachments: 'own' });
    expect(await strip()).toEqual([0, 0, true, false]);
    await hand(page, 'a', ['again.pdf']);
    await set(page, 'a', { attachments: 'none' });
    expect(await strip()).toEqual([0, 0, true, false]);
    expect((await events(page)).filter((e) => e.startsWith('attachmentschange') || e.startsWith('select'))).toEqual([]);
    expect(await host(page, 'a').locator('.announce').evaluate((el) => [...el.children].map((line) => line.textContent).filter((text) => /product|mine/.test(text ?? '')))).toEqual([]);
    expect(await host(page, 'odd').evaluate((el) => el.shadowRoot!.querySelectorAll('tanrei-file-picker').length)).toBe(0);
    expect(seen.filter((text) => text.includes('CCM-38'))).toHaveLength(1);
  });

  test('CCM-39: it never moves, resizes or scrolls itself or the page for an on-screen keyboard — it has no position of its own, listens to no change of the visual viewport, and neither sending nor anything else takes focus from the typing area', async ({ page }) => {
    await mount(page, [fx('a', { value: 'Hi', keepAfterSend: true })]);
    await focus(page, 'a');
    const before = await host(page, 'a').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return [getComputedStyle(el).position, r.top, r.height, window.scrollY];
    });
    await page.evaluate(() => {
      window.visualViewport?.dispatchEvent(new Event('resize'));
      window.visualViewport?.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('resize'));
    });
    await settle(page);
    await page.keyboard.press('Enter');
    await settle(page);
    expect(await host(page, 'a').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return [getComputedStyle(el).position, r.top, r.height, window.scrollY];
    })).toEqual(before);
    expect(before[0]).toBe('static');
    expect(await focused(page), 'a keyboard a person opened is not closed by sending').toBe(TYPING);
  });

  test('CCM-40: it holds the text and the files for as long as it is shown and no longer — it writes nothing to any store and reads no file; a product keeps a draft from input and attachmentschange and by setting value; a page that restores its form’s controls gives back the text, and no file', async ({ page }) => {
    await mount(page, [fx('a', { attachments: 'own', ...FILES })]);
    const reads = await host(page, 'a').evaluate(async (el) => {
      let read = 0;
      const file = new File(['content'], 'draft.pdf', { type: 'application/pdf' });
      for (const method of ['arrayBuffer', 'text', 'stream', 'slice'] as const) Object.defineProperty(file, method, { value: () => (read++, new Blob().arrayBuffer()) });
      (el as El).addFiles([file]);
      await (el as El).updateComplete;
      return read;
    });
    await focus(page, 'a');
    await page.keyboard.type('A draft');
    await settle(page);
    expect(reads).toBe(0);
    // (A document written into a blank window has no store of its own: where the browser refuses the read, nothing was written either.)
    expect(await page.evaluate(async () => {
      const count = async (read: () => number | Promise<number>) => {
        try {
          return await read();
        } catch {
          return 0;
        }
      };
      return [await count(() => localStorage.length), await count(() => sessionStorage.length), await count(async () => (await indexedDB.databases()).length), await count(() => document.cookie.length)];
    })).toEqual([0, 0, 0, 0]);
    // Restored by the page: the text, and no file.
    expect(await host(page, 'a').evaluate(async (el) => {
      (el as El).clear();
      (el as unknown as { formStateRestoreCallback(state: string, mode: string): void }).formStateRestoreCallback('Restored draft', 'restore');
      await (el as El).updateComplete;
      return [(el as El).value, (el as El).files.length];
    })).toEqual(['Restored draft', 0]);
  });

  test('CCM-41: the capsule is one container behind everything — filled with the container color of its condition, lifted by its elevation, its edge outline.width wide in its outline color, drawn inside its box; its four corners have one radius, container.shape and never more than half the height it has inline with one line of text — at one line, at six, with a strip, stacked and at 200 % text alike — and it clips nothing', async ({ page }) => {
    await mount(page, one('inline-empty', 'inline-lines-at-maximum', 'inline-image-tiles', 'stacked-typed', 'error'));
    const [fill, edge, width] = [await color(page, 'standard-container-color'), await color(page, 'standard-outline-color'), await token(page, 'outline-width')];
    const rest = await drawn(page, 'inline-empty');
    expect(rest).toMatchObject({ fill, edge, shadow: await page.evaluate((name) => { const probe = document.createElement('div'); probe.style.boxShadow = `var(${name})`; document.body.append(probe); const value = getComputedStyle(probe).boxShadow; probe.remove(); return value; }, T('standard-container-elevation')) });
    near(rest.width, width, 'the edge');
    // One line: fully rounded — half its height.
    const oneLine = (await box(capsule(page, 'inline-empty'))).height;
    near(rest.radius, oneLine / 2, 'half the one-line height');
    for (const id of ['inline-lines-at-maximum', 'inline-image-tiles', 'stacked-typed', 'error']) {
      const corners = await capsule(page, id).evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomLeftRadius, s.borderBottomRightRadius, s.overflow];
      });
      expect(corners, id).toEqual([`${rest.radius}px`, `${rest.radius}px`, `${rest.radius}px`, `${rest.radius}px`, 'visible']);
    }
    // The edge is inside the box and takes no room; a layer's smaller step is the radius.
    expect(await capsule(page, 'inline-empty').evaluate((el) => {
      const [c, o] = [el.getBoundingClientRect(), el.querySelector('.outline')!.getBoundingClientRect()];
      return [o.left - c.left, o.top - c.top, o.width - c.width, o.height - c.height, getComputedStyle(el.querySelector('.outline')!).position];
    })).toEqual([0, 0, 0, 0, 'absolute']);
    await host(page, 'inline-lines-at-maximum').evaluate((el) => el.style.setProperty('--tanrei-comp-chat-composer-container-shape', '6px'));
    expect((await drawn(page, 'inline-lines-at-maximum')).radius).toBe(6);
    // Enlarged text: the line is taller, and the corners follow the one-line height.
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    await expect.poll(async () => (await drawn(page, 'inline-image-tiles')).radius).toBeGreaterThan(rest.radius * 1.9);
    await set(page, 'inline-empty', { layout: 'inline' });
    await page.addStyleTag({ content: '.stage { inline-size: 1000px !important; }' });
    await settle(page);
    await expect.poll(async () => Math.abs((await drawn(page, 'inline-empty')).radius - (await box(capsule(page, 'inline-empty'))).height / 2)).toBeLessThan(0.6);
    expect((await drawn(page, 'inline-image-tiles')).radius).toBe((await drawn(page, 'inline-empty')).radius);
  });

  test('CCM-42: focus is answered with the capsule’s edge — while the typing area has focus, given by Tab, by a press or by focus(), the edge is drawn from the focused tokens in place of a ring, with the container as at rest; while focus is on a Button or in a File item the capsule draws its resting edge and that control its own ring; hover draws it from the hovered tokens; it answers no press; disabled wins over receiving, receiving over focused, focused over hovered', async ({ page }) => {
    await mount(page, [...one('inline-uploading', 'error'), fx('a', { attachments: 'own', ...FILES, value: 'Hi' })], { reducedMotion: true });
    const [rest, focusedEdge, focusedWidth] = [await drawn(page, 'a'), await color(page, 'standard-focused-outline-color'), await token(page, 'focused-outline-width')];
    expect(focusedEdge).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    const ways: [string, () => Promise<unknown>][] = [
      ['Tab', () => tabTo(page, native(page, 'a'))],
      ['a press', async () => {
        const b = await box(native(page, 'a'));
        await page.mouse.click(b.x + 5, b.y + 5);
      }],
      ['focus()', () => focus(page, 'a')],
    ];
    for (const [way, give] of ways) {
      await give();
      await page.mouse.move(0, 0);
      const now = await drawn(page, 'a');
      expect(now, way).toMatchObject({ edge: focusedEdge, fill: rest.fill });
      near(now.width, focusedWidth, `${way}: the focused width`);
      expect(await typing(page, 'a').evaluate((el) => getComputedStyle(el).outlineStyle), 'the typing area draws no ring').toBe('none');
      await page.evaluate(() => (document.activeElement as HTMLElement).blur());
      expect((await drawn(page, 'a')).edge, way).toBe(rest.edge);
    }
    // Focus on a Button, or in a File item: the resting edge, and the control's own indication.
    await tabTo(page, attach(page, 'a').locator('button'));
    expect(await drawn(page, 'a')).toMatchObject({ edge: rest.edge, width: rest.width });
    expect(await attach(page, 'a').evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('button')!).outlineStyle)).not.toBe('none');
    await host(page, 'inline-uploading').locator('tanrei-file-item .action.remove').first().focus();
    expect((await drawn(page, 'inline-uploading')).edge).toBe(rest.edge);
    // Hover, where a pointer can hover: the hovered tokens of the condition.
    const c = await box(capsule(page, 'a'));
    await page.mouse.move(c.x + c.width / 2, c.y + c.height - 3);
    await expect.poll(async () => (await drawn(page, 'a')).fill).toBe(await color(page, 'standard-hovered-container-color'));
    expect((await drawn(page, 'a')).fill).not.toBe(rest.fill);
    // No press: no pressed state and no ripple.
    await page.mouse.down();
    expect(await capsule(page, 'a').evaluate((el) => [el.hasAttribute('data-pressed'), el.querySelectorAll('.ripple').length])).toEqual([false, 0]);
    await page.mouse.up();
    // In error the focused edge keeps the error color and is told by its width.
    await focus(page, 'error');
    const inError = await drawn(page, 'error');
    expect(inError.edge).toBe(await color(page, 'error-focused-outline-color'));
    near(inError.width, focusedWidth, 'the focused width in error');
    // The order: focused over hovered; receiving over focused; disabled over all.
    await focus(page, 'a');
    await page.mouse.move(c.x + c.width / 2, c.y + c.height - 3);
    expect((await drawn(page, 'a')).edge).toBe(focusedEdge);
    await carry(page, 'a', 'dragover', ['a.pdf']);
    expect((await drawn(page, 'a')).fill).toBe(await color(page, 'receiving-container-color'));
    await set(page, 'a', { disabled: true });
    expect((await drawn(page, 'a')).fill).toBe(await color(page, 'standard-disabled-container-color'));
  });

  test('CCM-42: where the focus style is glow the glow is drawn around the capsule while the typing area has focus, with its focused edge, and not while focus is on a Button', async ({ page }) => {
    await mount(page, [fx('a', { attachments: 'own', ...FILES, value: 'Hi' })], { system: 'acme', systemCss: await acmeSystemCss() });
    const glow = () => capsule(page, 'a').evaluate((el) => getComputedStyle(el, '::after').boxShadow);
    expect(await glow()).toBe('none');
    await focus(page, 'a');
    expect(await glow()).not.toBe('none');
    expect((await drawn(page, 'a')).edge).toBe(await color(page, 'standard-focused-outline-color'));
    await tabTo(page, send(page, 'a').locator('button'));
    expect(await glow()).toBe('none');
  });

  test('CCM-43: the File items are a strip at the top of the capsule — container.padding-block and strip.padding-block-start below its top edge, container.padding-inline from each inline edge, strip.offset above what follows, strip.gap apart: a tile at its own size beside its neighbours and aligned to the top of its line, a row across a whole line; a full line wraps, nothing scrolls sideways and no item is cut, shrunk or hidden — nine tiles in 320', async ({ page }) => {
    await mount(page, one('inline-uploading', 'tiles-wrapped', 'inline-image-tiles'));
    const [pb, start, pi, offset, gap] = [await token(page, 'container-padding-block'), await token(page, 'strip-padding-block-start'), await token(page, 'container-padding-inline'), await token(page, 'strip-offset'), await token(page, 'strip-gap')];
    const boxes = (id: string) =>
      host(page, id).evaluate((el) => {
        const c = el.shadowRoot!.querySelector('.capsule')!.getBoundingClientRect();
        return [...el.querySelectorAll('tanrei-file-item')].map((item) => {
          const r = item.getBoundingClientRect();
          return { left: r.left - c.left, top: r.top - c.top, right: c.right - r.right, width: r.width, height: r.height, bottom: r.bottom - c.top, tile: item.getAttribute('form') === 'tile' };
        });
      });
    const mixed = await boxes('inline-uploading');
    const p = await places(page, 'inline-uploading');
    near(mixed[0]!.top, pb + start, 'below the top edge');
    near(mixed[0]!.left, pi, 'from the start edge');
    near(mixed[0]!.right, pi, 'a row across the whole line');
    expect(mixed[1]!.tile).toBe(true);
    near(mixed[1]!.top - mixed[0]!.bottom, gap, 'the next line of the strip');
    near(mixed[1]!.left, pi, 'a tile from the start edge');
    near(p.typing!.top - mixed[1]!.bottom, offset, 'strip.offset above what follows');
    const three = await boxes('inline-image-tiles');
    near(three[1]!.left - (three[0]!.left + three[0]!.width), gap, 'tiles beside each other');
    expect(new Set(three.map((tile) => Math.round(tile.top))).size).toBe(1);
    // Nine tiles in 320: wrapped, each at its size, nothing wider than the strip, nothing scrolled.
    const size = (await boxes('tiles-wrapped'))[0]!;
    await page.setViewportSize({ width: 320, height: 900 });
    await page.addStyleTag({ content: '.stage { box-sizing: border-box !important; inline-size: 320px !important; }' });
    await settle(page);
    const nine = await boxes('tiles-wrapped');
    expect(nine).toHaveLength(9);
    expect(new Set(nine.map((tile) => Math.round(tile.top))).size).toBeGreaterThan(2);
    for (const tile of nine) {
      near(tile.width, size.width, 'no tile shrinks');
      near(tile.height, size.height, 'no tile is cut');
      expect(tile.left).toBeGreaterThanOrEqual(pi - 0.5);
      expect(tile.right).toBeGreaterThanOrEqual(pi - 0.5);
    }
    expect(await host(page, 'tiles-wrapped').locator('.strip').evaluate((el) => [el.scrollWidth <= el.clientWidth, getComputedStyle(el).overflowX, document.documentElement.scrollWidth <= document.documentElement.clientWidth])).toEqual([true, 'visible', true]);
  });

  test('CCM-44: the File items it draws take the form attachmentForm names — auto: a tile with its picture and no drawn name for an image, a row for every other file; tile: every file a tile; row: every file a row and no picture; a refused file is a row under every value; none is pressable; a value it does not know is auto, and reported; while attachments is given every prop is the product’s', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [...one('own-image-tiles', 'form-tile', 'form-row', 'attachments-refused', 'inline-image-tiles'), fx('odd', { attachments: 'own', ...FILES, attachmentForm: 'grid', accept: ['.png'], typeErrorText: 'Only PNG.' })]);
    await hand(page, 'odd', ['a.png', 'b.pdf']);
    const forms = (id: string) => ownItems(page, id).evaluateAll((list) => list.map((el) => {
      const item = el as HTMLElement & { name: string; form: string; preview: boolean; nameHidden: boolean; interactive: boolean; previewSrc: string; width: number | null };
      return `${item.name}:${item.form}:${item.preview}:${item.nameHidden}:${item.interactive}:${item.previewSrc}:${item.width}`;
    }));
    expect(await forms('own-image-tiles')).toEqual(['site-north.png:tile:true:true:false::null', 'site-east.png:tile:true:true:false::null', 'brief.pdf:row:false:false:false::null']);
    expect(await forms('form-tile')).toEqual(['site-north.png:tile:true:true:false::null', 'brief.pdf:tile:false:false:false::null', 'survey.csv:tile:false:false:false::null']);
    expect(await forms('form-row')).toEqual(['site-north.png:row:false:false:false::null', 'brief.pdf:row:false:false:false::null']);
    expect(await forms('attachments-refused')).toEqual(['brief.pdf:row:false:false:false::null', 'holiday.mov:row:false:false:false::null']);
    expect(await forms('odd')).toEqual(['a.png:tile:true:true:false::null', 'b.pdf:row:false:false:false::null']);
    await set(page, 'attachments-refused', { attachmentForm: 'tile' });
    expect((await forms('attachments-refused'))[1]).toBe('holiday.mov:row:false:false:false::null');
    // The picture is the File item's, of the file itself: the chat composer makes no address.
    await stage(page, 'own-image-tiles').scrollIntoViewIfNeeded();
    await expect(ownItems(page, 'own-image-tiles').first().locator('img[part="preview"]')).toHaveCount(1);
    expect(await ownItems(page, 'own-image-tiles').first().locator('img[part="preview"]').getAttribute('src')).toMatch(/^blob:/);
    // Given: every prop is the product's.
    expect(await host(page, 'inline-image-tiles').locator('tanrei-file-item').first().evaluate((el) => [el.getAttribute('form'), el.hasAttribute('preview'), el.hasAttribute('name-hidden')])).toEqual(['tile', true, true]);
    await set(page, 'inline-image-tiles', { attachmentForm: 'row' });
    expect(await host(page, 'inline-image-tiles').locator('tanrei-file-item').first().evaluate((el) => el.shadowRoot!.querySelector('.item')!.getAttribute('data-form'))).toBe('tile');
    expect(seen.filter((text) => text.includes('CCM-44'))).toHaveLength(1);
  });
});

test.describe('the value, the form and focus, which a feature holds itself (W5, W6, W7)', () => {
  test('the value is the typing area’s at every moment: what was last set until the typing area has taken it, and from then on what it holds — already the new text in a capturing listener of input on an ancestor — and a value that is set emits no input', async ({ page }) => {
    await mount(page, [fx('a', {})]);
    const read = await host(page, 'a').evaluate(async (el) => {
      const control = el as El;
      let events = 0;
      el.addEventListener('input', () => events++);
      control.value = 'Two\nlines';
      const atOnce = control.value;
      await control.updateComplete;
      const inner = el.shadowRoot!.querySelector('tanrei-embedded-text-input') as HTMLElement & { value: string };
      const fresh = document.createElement(el.localName) as El;
      fresh.value = 'given';
      return { atOnce, after: [control.value, inner.value], fresh: fresh.value, events };
    });
    expect(read).toEqual({ atOnce: 'Two\nlines', after: ['Two\nlines', 'Two\nlines'], fresh: 'given', events: 0 });
    await page.evaluate(() => {
      const seen: string[] = [];
      (window as unknown as { __seen: string[] }).__seen = seen;
      window.addEventListener('input', (event) => seen.push((event.target as HTMLInputElement).value), true);
    });
    await focus(page, 'a');
    await page.keyboard.type('!');
    expect(await page.evaluate(() => (window as unknown as { __seen: string[] }).__seen)).toEqual(['Two\nlines!']);
  });

  test('focus() on the element focuses the typing area and blur() takes it away; the shadow root delegates nothing and the host is not focusable; a page’s label for the element moves focus to the typing area, once', async ({ page }) => {
    await page.setContent(`<!doctype html><html><head><style>${tokensCss()}</style></head><body><label id="l" for="c">The page's own label</label><tanrei-chat-composer id="c" label="Message" send-label="Send"></tanrei-chat-composer><script type="module">${bundle()}</script></body></html>`);
    await page.waitForFunction((tag) => !!customElements.get(tag), TAG);
    await settle(page);
    const c = page.locator('#c');
    expect(await c.evaluate((el) => [el.shadowRoot!.delegatesFocus, el.getAttribute('tabindex'), el.tabIndex])).toEqual([false, null, -1]);
    await c.evaluate((el) => (el as HTMLElement).focus());
    expect(await focused(page)).toBe(TYPING);
    await c.evaluate((el) => (el as HTMLElement).blur());
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    await page.locator('#l').click();
    expect(await focused(page)).toBe(TYPING);
  });
});

test.describe('the members compared (the twin of a feature with parts of its own)', () => {
  // The capsule, the strip's arrangement and the counter are in every picture and in no member, so no fixture has a
  // twin that is the same picture. What is compared is each member
  // the chat composer brings: the same element written by hand with the props the chat composer gives it, drawn at the
  // same place on the capsule's fill — the same pixels inside the member's own box, and the same thing said to
  // assistive technology by its native element.
  const members = (page: P, id: string) =>
    host(page, id).evaluate((el) => {
      const root = el.shadowRoot!;
      const said = (native: Element | null | undefined) => (native ? ['aria-label', 'aria-description', 'aria-invalid', 'aria-required', 'aria-disabled'].map((name) => native.getAttribute(name)).concat([String((native as HTMLButtonElement).disabled), native.localName]) : null);
      const out: { markup: string; rect: { x: number; y: number; width: number; height: number }; said: unknown; kind: string; file?: number }[] = [];
      const input = root.querySelector('tanrei-embedded-text-input') as HTMLElement & Record<string, unknown>;
      const attributes = (pairs: [string, unknown][]) => pairs.filter(([, value]) => value !== false && value !== '' && value !== null && value !== undefined).map(([name, value]) => (value === true ? name : `${name}="${String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('\n', '&#10;')}"`)).join(' ');
      const rect = (element: Element) => {
        const r = element.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      };
      out.push({
        kind: 'typing',
        markup: `<tanrei-embedded-text-input ${attributes([['multiline', true], ['label', input.label], ['description', input.description], ['placeholder', input.placeholder], ['value', input.value], ['min-rows', input.minRows], ['max-rows', input.maxRows], ['enter-key', input.enterKey], ['error', input.error], ['disabled', input.disabled]])}></tanrei-embedded-text-input>`,
        rect: rect(input),
        said: said(input.shadowRoot!.querySelector('.input')),
      });
      for (const button of root.querySelectorAll<HTMLElement & Record<string, unknown>>('tanrei-button')) {
        const attach = button.matches('tanrei-file-picker > *');
        out.push({
          kind: attach ? 'attach' : 'send',
          // One level down the attach button is the trigger of a file picker, and the send button a Button alone.
          markup: attach
            ? `<tanrei-file-picker multiple ${attributes([['disabled', (el as unknown as { disabled: boolean }).disabled]])}><tanrei-button slot="trigger" ${attributes([['variant', 'text'], ['label', button.label]])}><span slot="icon">${button.querySelector('[slot="icon"]')!.textContent}</span></tanrei-button></tanrei-file-picker>`
            : `<tanrei-button ${attributes([['variant', getComputedStyle(el).getPropertyValue('--tanrei-comp-chat-composer-send-button-variant').trim()], ['label', button.label], ['disabled', button.disabled]])}><span slot="icon">${button.querySelector('[slot="icon"]')!.textContent}</span></tanrei-button>`,
          rect: rect(button),
          said: said(button.shadowRoot!.querySelector('button')),
        });
      }
      [...root.querySelectorAll<HTMLElement & Record<string, unknown>>('.strip > tanrei-file-item')].forEach((item, index) => {
        out.push({
          kind: 'item',
          file: item.file ? index : undefined,
          markup: `<tanrei-file-item ${attributes([['name', item.name], ['media-type', item.mediaType], ['status', item.status], ['error-text', item.errorText], ['form', item.form], ['preview', item.preview], ['name-hidden', item.nameHidden], ['remove-label', (el as unknown as { removeLabel: string }).removeLabel], ['disabled', (el as unknown as { disabled: boolean }).disabled]])}></tanrei-file-item>`,
          rect: rect(item),
          said: [...item.shadowRoot!.querySelectorAll('.action')].map((action) => said(action)),
        });
      });
      return { fill: getComputedStyle(root.querySelector('.capsule')!).backgroundColor, members: out };
    });

  for (const f of spec.fixtures) {
    test(`${f.id}: each member the chat composer brings is the same pixels inside its own box, and the same control to assistive technology, as that member written by hand with the props it is given`, async ({ page }) => {
      await mount(page, [f]);
      await settle(page);
      await page.mouse.move(0, 0);
      const { fill, members: list } = await members(page, f.id);
      expect(list.length).toBeGreaterThanOrEqual(1);
      // The twins: each at the member's own place and size, on the capsule's fill, over the page.
      await page.evaluate(
        async ([ground, all, id]) => {
          const composer = document.querySelector(`[data-fixture="${id}"] tanrei-chat-composer`) as HTMLElement & { files: File[] };
          const layer = document.createElement('div');
          layer.id = 'twins';
          // (In the direction the fixture is drawn in, said as a page says it: a glyph is mirrored by `dir`.)
          layer.dir = getComputedStyle(composer).direction;
          layer.style.cssText = `position: absolute; top: 0; left: 0; inline-size: 100%; block-size: ${document.documentElement.scrollHeight}px; visibility: hidden;`;
          for (const member of all as { markup: string; rect: { x: number; y: number; width: number; height: number }; kind: string; file?: number }[]) {
            const twin = document.createElement('div');
            twin.className = 'twin';
            twin.dataset.kind = member.kind;
            twin.style.cssText = `position: absolute; left: ${member.rect.x + scrollX}px; top: ${member.rect.y + scrollY}px; width: ${member.rect.width}px; height: ${member.rect.height}px; background: ${ground}; display: flex; align-items: flex-start;`;
            twin.innerHTML = member.markup;
            const made = twin.firstElementChild as HTMLElement & { file?: File };
            if (member.kind === 'typing' || (member.kind === 'item' && made.getAttribute('form') !== 'tile')) made.style.cssText = 'flex: 1 1 0; min-inline-size: 0;';
            if (member.file !== undefined) made.file = composer.files[member.file];
            layer.append(twin);
          }
          document.body.append(layer);
          const each = [...layer.querySelectorAll('.twin > *')] as (HTMLElement & { updateComplete: Promise<unknown> })[];
          for (let round = 0; round < 3; round++) await Promise.all(each.map((element) => element.updateComplete));
        },
        [fill, list, f.id] as const,
      );
      await settle(page);
      await page.waitForFunction(() => {
        const all = (root: Document | ShadowRoot): Element[] => [...root.querySelectorAll('*')].flatMap((el) => [el, ...(el.shadowRoot ? all(el.shadowRoot) : [])]);
        return all(document).every((el) => !(el instanceof HTMLImageElement) || el.complete);
      });
      // A picture that has loaded is not yet one that is drawn: a file item's picture is decoded off the page's turn
      // (`decoding="async"`), and a twin's, loaded while its layer is hidden, has had no drawing to be decoded for — the
      // first picture taken of it shows the tile's ground where the picture comes a frame later. Each picture is
      // decoded before any is taken (one that cannot be decoded draws its glyph, in the member and in its twin alike).
      await page.evaluate(async () => {
        const all = (root: Document | ShadowRoot): Element[] => [...root.querySelectorAll('*')].flatMap((el) => [el, ...(el.shadowRoot ? all(el.shadowRoot) : [])]);
        await Promise.all(all(document).filter((el): el is HTMLImageElement => el instanceof HTMLImageElement).map((img) => img.decode().catch(() => undefined)));
      });
      const said = await page.evaluate(() =>
        [...document.querySelectorAll('#twins .twin > *')].map((made) => {
          const read = (native: Element | null) => (native ? ['aria-label', 'aria-description', 'aria-invalid', 'aria-required', 'aria-disabled'].map((name) => native.getAttribute(name)).concat([String((native as HTMLButtonElement).disabled), native.localName]) : null);
          if (made.localName === 'tanrei-file-item') return [...made.shadowRoot!.querySelectorAll('.action')].map(read);
          const control = made.localName === 'tanrei-file-picker' ? made.querySelector('tanrei-button')! : made;
          return read(control.shadowRoot!.querySelector('.input, button'));
        }),
      );
      expect(said).toEqual(list.map((member) => member.said));
      // The pixels: the composer's member, then its twin in the same place, each drawn alone.
      const clip = (rect: { x: number; y: number; width: number; height: number }) => ({ x: Math.ceil(rect.x), y: Math.ceil(rect.y), width: Math.max(1, Math.floor(rect.x + rect.width) - Math.ceil(rect.x)), height: Math.max(1, Math.floor(rect.y + rect.height) - Math.ceil(rect.y)) });
      for (const [index, member] of list.entries()) {
        // The capsule's own drawing is not a member's: its edge is not drawn and its corners are square for the
        // comparison, so that the box of a member that stands in a corner is all fill.
        await host(page, f.id).evaluate((el) => {
          el.shadowRoot!.querySelector<HTMLElement>('.outline')!.style.visibility = 'hidden';
          el.shadowRoot!.querySelector<HTMLElement>('.capsule')!.style.borderRadius = '0';
        });
        const where = await page.evaluate(([i]) => {
          const twin = document.querySelectorAll('#twins .twin')[i as number] as HTMLElement;
          twin.scrollIntoView({ block: 'center' });
          const r = twin.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        }, [index]);
        const ours = decodePng(await page.screenshot({ clip: clip(where), animations: 'disabled' }));
        await page.evaluate(([i]) => {
          (document.querySelectorAll('#twins .twin')[i as number] as HTMLElement).style.visibility = 'visible';
        }, [index]);
        const theirs = decodePng(await page.screenshot({ clip: clip(where), animations: 'disabled' }));
        await page.evaluate(([i]) => {
          (document.querySelectorAll('#twins .twin')[i as number] as HTMLElement).style.visibility = '';
        }, [index]);
        expect({ width: ours.width, height: ours.height }).toEqual({ width: theirs.width, height: theirs.height });
        // The twin is drawn in a layer over the page, and an engine smooths the edge of a glyph by the layer it is
        // drawn in: a pixel differs where a channel is further apart than that smoothing goes (a quarter of its range).
        let different = 0;
        for (let at = 0; at < ours.data.length; at += 4) if ([0, 1, 2].some((channel) => Math.abs(ours.data[at + channel]! - theirs.data[at + channel]!) > 64)) different++;
        expect(different, `${member.kind} ${index}: differing pixels`).toBe(0);
      }
    });
  }
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark, at rest and with the typing area focused — but in the fixture drawn without its words', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mount(page, spec.fixtures.filter((f) => f.id !== 'without-words'), { theme });
      await settle(page);
      const rest = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(rest.violations, theme).toEqual([]);
      await focus(page, 'inline-typed');
      const focusedNow = await new AxeBuilder({ page }).include('[data-fixture="inline-typed"]').analyze();
      expect(focusedNow.violations, `${theme}, focused`).toEqual([]);
    }
  });

  test('the fixture drawn without its words draws every part, works, and says what it lacks', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, one('without-words'));
    await settle(page);
    expect(await host(page, 'without-words').evaluate((el) => [el.shadowRoot!.querySelectorAll('tanrei-button').length, el.querySelectorAll('tanrei-file-item').length, el.shadowRoot!.querySelector('.capsule')!.getAttribute('aria-label')])).toEqual([2, 2, null]);
    expect((await missingWords(page)).sort()).toEqual(expect.arrayContaining(['attachLabel', 'sendLabel']));
    expect(seen.filter((text) => text.includes('CCM-31')).length).toBeGreaterThanOrEqual(3);
  });

  test('Chromium’s accessibility tree: the group is busy while sending, the typing area is a multi-line text box named by label, described by the counter and invalid over the limit, and the send button a disabled button named by sendLabel', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'the accessibility tree is read over the DevTools protocol');
    await mount(page, one('inline-over-limit'));
    await set(page, 'inline-over-limit', { sending: true });
    const tree = await axTree(page);
    expect(!!tree.find((node) => node.role === 'group' && node.name === 'Message')!.busy).toBe(true);
    expect(tree.find((node) => node.role === 'textbox')).toMatchObject({ name: 'Message', description: `${[...String(one('inline-over-limit')[0]!.props.value)].length}/80`, invalid: 'true', multiline: true });
    expect(tree.find((node) => node.role === 'button')).toMatchObject({ name: 'Send', disabled: true });
  });
});

test.describe('fixtures', () => {
  test('every fixture of the spec is mounted, with the layout, the strip, the Buttons and the text it gives', async ({ page }) => {
    await mount(page, spec.fixtures);
    await settle(page);
    expect(spec.fixtures).toHaveLength(37);
    for (const f of spec.fixtures) {
      await expect(capsule(page, f.id), f.id).toBeVisible();
      expect(await host(page, f.id).evaluate((el) => (el as El).value), f.id).toBe(String(f.props.value ?? ''));
      const items = (f.items ?? []).length;
      expect(await host(page, f.id).evaluate((el) => el.querySelectorAll('tanrei-file-item').length + el.shadowRoot!.querySelectorAll('tanrei-file-item').length), f.id).toBe(items);
      const rowHolds = (f.props.attachments ?? 'none') !== 'none' || !!f.slots?.leading || !!f.slots?.trailing || (!!f.props.counter && !f.props.disabled);
      expect(await capsule(page, f.id).getAttribute('data-layout'), f.id).toBe(f.props.layout === 'stacked' && rowHolds ? 'stacked' : 'inline');
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true, reducedMotion: true });
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
