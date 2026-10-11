// <tanrei-checkbox-group>, driven by specs/checkbox-group.spec.json: CKG-1 to CKG-14, each cited by a test title.
//
// It is a composed element whose value members are the product's own children: the field group's own
// element in its shadow root, around the select-all checkbox and a slot. What every composed element is —
// declarations, passing, parts, the one event, reports — is held by src/primitives/composed.test.ts (W13-1 to W13-4,
// W13-8); what that file cannot ask of members the product places — the value, the form, focus, the twins — is held
// here, with the fourteen sentences. Its members' own behaviour is held by their own files: nothing of
// the field group's frame or of a checkbox's look is measured again, but through the twins.
//
// The twins: the tools' `twin` key cannot compare members the product places on both sides, so the pairs
// are written here and each is compared in one run — the same pixels, the same accessibility tree.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures, setWords, tab } from '../../../test/harness.js';
import { decodePng } from '../../../test/png.js';

const spec = loadSpec('checkbox-group');
const fieldGroup = loadSpec('field-group');
type P = Page;
const TAG = 'tanrei-checkbox-group';
const FRAME = 'tanrei-field-group';
const BOX = 'tanrei-checkbox';
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

/** Fixtures and twins: each fixture and the field group's fixture that is the same thing by hand. */
const TWINS: Record<string, string> = {
  default: 'checkboxes',
  supporting: 'checkboxes-supporting',
  'label-hidden': 'checkboxes-label-hidden',
  required: 'checkboxes-required',
  optional: 'checkboxes-optional',
  'required-asterisk': 'checkboxes-required-asterisk',
  'required-error': 'checkboxes-error',
  horizontal: 'checkboxes-horizontal',
  'horizontal-many': 'checkboxes-horizontal-many',
  disabled: 'checkboxes-disabled',
  'one-disabled': 'checkboxes-one-disabled',
  'long-label': 'long-label',
  'required-ja': 'checkboxes-required-ja',
  rtl: 'checkboxes-rtl',
  'horizontal-rtl': 'checkboxes-horizontal-rtl',
  'ltr-label-rtl': 'ltr-label-rtl',
  'error-selected': 'checkboxes-error-selected',
  'select-all-none': 'checkboxes-parent-none',
  'select-all-some': 'checkboxes-parent-some',
  'select-all-all': 'checkboxes-parent-all',
  'select-all-one-disabled': 'checkboxes-parent-one-disabled',
};

type Group = HTMLElement & {
  value: string[];
  name: string;
  disabled: boolean;
  error: boolean;
  errorText: string;
  requirement: string;
  requiredText: string;
  label: string;
  selectAllLabel: string;
  form: HTMLFormElement | null;
  validity: ValidityState;
  validationMessage: string;
  willValidate: boolean;
  checkValidity(): boolean;
  reportValidity(): boolean;
  formStateRestoreCallback(state: string | null, mode: string): void;
  updateComplete: Promise<unknown>;
};
type Box = HTMLElement & { checked: boolean; indeterminate: boolean; disabled: boolean; error: boolean; value: string; label: string; updateComplete: Promise<unknown> };

const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > ${TAG}`);
const fx = (id: string, props: Fixture['props'] = {}, rest: Partial<Fixture> = {}): Fixture => ({ id, props: { label: 'Notify me by', ...props }, items: THREE, ...rest });
const item = (value: string, label: string, props: Fixture['props'] = {}) => ({ kind: 'checkbox', props: { value, label, ...props } });
const THREE = [item('email', 'Email'), item('text', 'Text message'), item('push', 'Push notification')];
const mount = (page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) => mountFixtures(page, spec, { fixtures, icons: true, ...options });
const settle = (page: P) =>
  page.evaluate(async () => {
    const all = (root: Document | ShadowRoot | Element): Element[] => [...root.querySelectorAll('*')].flatMap((el) => [el, ...(el.shadowRoot ? all(el.shadowRoot) : [])]);
    for (let round = 0; round < 3; round++) await Promise.all(all(document).map((el) => (el as Element & { updateComplete?: Promise<unknown> }).updateComplete));
  });
const frames = (page: P) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const focusPath = (page: P) =>
  page.evaluate(() => {
    const at: string[] = [];
    for (let active: Element | null = document.activeElement; active; active = active.shadowRoot?.activeElement ?? null) at.push(active.localName + (active.id ? `#${active.id}` : ''));
    return at;
  });
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error') seen.push(message.text());
  });
  return seen;
}
const reportsOf = (seen: string[]) => seen.filter((text) => text.includes('[tanrei]'));

/** A page of the product's own, with the bundle: for what a fixture cannot hold (a form, a label, another frame). */
const document_ = (body: string, head = '') => `<!doctype html>
<html lang="en" data-tanrei-theme="light"><head><meta charset="utf-8" /><style>${read('dist/tokens.css')}</style>${head}</head>
<body>${body}<script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`;
async function page_(page: P, body: string, head = '') {
  await page.setContent(document_(body, head));
  await page.waitForFunction((tag) => !!customElements.get(tag), TAG);
  await settle(page);
}
const BOXES = `<${BOX} id="email" value="email" label="Email"></${BOX}><${BOX} id="text" value="text" label="Text message"></${BOX}><${BOX} id="push" value="push" label="Push notification"></${BOX}>`;
const group_ = (attributes = '', children = BOXES) => `<${TAG} id="g" label="Notify me by" ${attributes}>${children}</${TAG}>`;
const g = (page: P) => page.locator('#g');
const value = (page: P, selector = '#g') => page.locator(selector).evaluate((el) => (el as Group).value);
const setValue = async (page: P, list: string[], selector = '#g') => {
  await page.locator(selector).evaluate((el, given) => ((el as Group).value = given), list);
  await settle(page);
};
/** Which checkboxes of the page's group are checked: what each says itself, and what its native checkbox says. */
const checked = (page: P, selector = '#g') =>
  page.locator(selector).evaluate((el) =>
    [...el.querySelectorAll('tanrei-checkbox')].map((box) => {
      const native = box.shadowRoot!.querySelector('input')!;
      if (native.checked !== (box as Box).checked) throw new Error(`${box.id}: the native checkbox says ${native.checked} and the element ${(box as Box).checked}`);
      return native.checked;
    }),
  );
/** The select-all checkbox: its native checkbox's state. */
const selectAll = (page: P, selector = '#g') =>
  page.locator(selector).evaluate((el) => {
    const all = el.shadowRoot!.querySelector('tanrei-checkbox');
    const native = all?.shadowRoot!.querySelector('input');
    return native ? (native.indeterminate ? 'mixed' : native.checked ? 'checked' : 'unchecked') + (native.disabled ? ', disabled' : '') : null;
  });
/** Hears `input` and `change` — on the group, bubbling, and on the document, capturing — with the target and the list at that moment. */
const hear = (page: P, selector = '#g') =>
  page.locator(selector).evaluate((el) => {
    const heard: string[] = [];
    (window as unknown as { heard: string[] }).heard = heard;
    const note = (where: string) => (event: Event) => {
      const target = event.target as HTMLElement;
      const detail = (event as CustomEvent<{ value?: string[] } | null>).detail;
      // The native checkbox's own `input` is the browser's event: composed, it passes a capturing listener on an
      // ancestor before the checkbox stops it, as it does for every checkbox, in a group or not. It is marked.
      heard.push(`${where}: ${event.isTrusted ? "the browser's " : ''}${event.type} from ${target === el ? 'the group' : target.localName + (target.id ? `#${target.id}` : '')} [${(el as Group).value.join(',')}]${detail && 'value' in detail ? ` detail [${detail.value!.join(',')}]` : ''}`);
    };
    for (const name of ['input', 'change']) {
      document.addEventListener(name, note('document, capturing'), true);
      el.addEventListener(name, note('group'));
    }
  });
const heard = (page: P) => page.evaluate(() => (window as unknown as { heard: string[] }).heard.splice(0));
/** What was dispatched by an element: every event but the browser's own. */
const dispatched = async (page: P) => (await heard(page)).filter((line) => !line.includes("the browser's "));
/** Sends a form for real, to a server of the test's own, and gives back the body the browser sent. */
function sent(page: P, form: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const chunks: Buffer[] = [];
      request.on('data', (chunk: Buffer) => chunks.push(chunk));
      request.on('end', () => {
        response.writeHead(204).end();
        server.close();
        resolve(Buffer.concat(chunks).toString('utf8'));
      });
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      void page.evaluate(
        ([selector, action]) => {
          const element = document.querySelector<HTMLFormElement>(selector!)!;
          element.method = 'post';
          element.action = action!;
          element.requestSubmit();
        },
        [form, `http://127.0.0.1:${port}/taken`],
      );
    });
  });
}
const box = async (locator: Locator) => (await locator.boundingBox())!;
const near = (actual: number, expected: number, what: string) => expect(Math.abs(actual - expected), `${what}: ${actual} is not ${expected}`).toBeLessThanOrEqual(0.5);
const native = (page: P, id: string) => page.locator(`#${id}`).locator('input');
/** What a form would submit now, entry by entry. */
const entries = (page: P, form = 'form') => page.locator(form).evaluate((el) => [...new FormData(el as HTMLFormElement).entries()].map(([name, entry]) => `${name}=${String(entry)}`));

/** The accessibility tree Chromium computes under an element, without the nodes it ignores: role, name, description and states. */
async function axTree(page: P, selector: string) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { result } = await cdp.send('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(selector)})` });
  const { node } = await cdp.send('DOM.describeNode', { objectId: result.objectId! });
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  const byId = new Map(nodes.map((each) => [each.nodeId, each]));
  const root = nodes.find((each) => each.backendDOMNodeId === node.backendNodeId);
  if (!root) throw new Error(`${selector} is not in the accessibility tree`);
  const lines: string[] = [];
  const walk = (id: string, depth: number) => {
    const at = byId.get(id);
    if (!at) return;
    let next = depth;
    if (!at.ignored) {
      const states = (at.properties ?? [])
        .filter((property) => ['checked', 'invalid', 'required', 'disabled', 'posinset', 'setsize', 'focusable'].includes(property.name))
        .map((property) => `${property.name}=${String(property.value.value)}`)
        .sort();
      lines.push(`${'  '.repeat(depth)}${String(at.role?.value)} "${String(at.name?.value ?? '')}"${at.description?.value ? ` (${String(at.description.value)})` : ''}${states.length ? ` ${states.join(' ')}` : ''}`);
      next = depth + 1;
    }
    for (const child of at.childIds ?? []) walk(child, next);
  };
  for (const child of root.childIds ?? []) walk(child, 0);
  return lines;
}

/**
 * The tree inside the group's own node. Chromium gives every form-associated custom element that can be validated a
 * node of its own — `generic`, with no name: no role — and the checkbox group is the form's control where its twin's
 * frame is not (CKG-8). That one node, where there is one, is the whole difference between the two trees; a disabled
 * group, which is not validated, has none. While the form's own validation refuses the group — required and empty —
 * the engine marks that node invalid, as it marks any control its validation refuses; the group inside it has no such
 * state (CKG-9).
 */
function inside(tree: string[]): string[] {
  if (!/^generic ""( invalid=(false|true))?$/.test(tree[0] ?? '') || tree.slice(1).some((line) => !line.startsWith('  '))) return tree;
  return tree.slice(1).map((line) => line.slice(2));
}

test.describe('checkbox group', () => {
  test('every fixture of the spec is mounted, and each has its twin among the field group\'s fixtures', async ({ page }) => {
    await mount(page, spec.fixtures);
    expect(spec.fixtures.map((f) => f.id).sort()).toEqual(Object.keys(TWINS).sort());
    for (const f of spec.fixtures) {
      await expect(host(page, f.id)).toHaveCount(1);
      expect(fieldGroup.fixtures.find((twin) => twin.id === TWINS[f.id]), `${f.id}: field-group.${TWINS[f.id]}`).toBeTruthy();
      // The fixture's value is the checked checkboxes, in their order: `checked` on the children is the first value (CKG-3).
      const order = (f.items ?? []).map((each) => String(each.props.value));
      expect(await host(page, f.id).evaluate((el) => (el as Group).value), f.id).toEqual(order.filter((entry) => ((f.props.value as string[] | undefined) ?? []).includes(entry)));
    }
  });

  for (const fixture of spec.fixtures) {
    test(`CKG-1 twin: ${fixture.id} and field-group.${TWINS[fixture.id]}, mounted in one run, are the same pixels and the same accessibility tree — the field group itself around the same checkboxes, checked by hand one level down`, async ({ page, browserName }) => {
      const seen = warnings(page);
      await mount(page, [{ ...fixture, twin: `field-group.${TWINS[fixture.id]}` }], { twins: true });
      await settle(page);
      await frames(page);
      const [ours, theirs] = [page.locator(`[data-fixture="${fixture.id}"]`), page.locator(`[data-twin-of="${fixture.id}"]`)];
      await expect(theirs).toHaveCount(1);
      // The same tree: what a reader of the page is told of each stage.
      expect(await ours.ariaSnapshot(), 'the accessibility tree of the stage').toBe(await theirs.ariaSnapshot());
      // Each checkbox says the same of itself, the select-all checkbox among them, in the same order.
      const said = (stage_: Locator) =>
        stage_.evaluate((el) => {
          const frame = el.querySelector('tanrei-field-group') ?? el.querySelector('tanrei-checkbox-group')!.shadowRoot!.querySelector('tanrei-field-group')!;
          const slot = frame.shadowRoot!.querySelector('slot')!;
          return slot.assignedElements({ flatten: true }).map((box) => {
            const input = box.shadowRoot!.querySelector('input')!;
            return { name: input.getAttribute('aria-label'), description: input.getAttribute('aria-description'), invalid: input.getAttribute('aria-invalid'), required: input.getAttribute('aria-required') ?? input.required, disabled: input.disabled, checked: input.checked, mixed: input.indeterminate };
          });
        });
      const mine = await said(ours);
      expect(mine.length, 'the checkboxes are the field group\'s controls, read through the slot').toBeGreaterThan(0);
      expect(mine).toEqual(await said(theirs));
      if (browserName === 'chromium') {
        const [engineMine, engineTwin] = [await axTree(page, `[data-fixture="${fixture.id}"]`), await axTree(page, `[data-twin-of="${fixture.id}"]`)];
        expect(engineMine.filter((line) => line.trimStart().startsWith('group ')), 'one group').toHaveLength(1);
        expect(inside(engineMine)).toEqual(engineTwin);
      }
      // The same pixels: each stage drawn in the same place — the other taken out of the flow for the picture.
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
      for (let index = 0; index < a.data.length; index++) if (a.data[index] !== b.data[index]) different++;
      expect(different, 'differing color channels').toBe(0);
      // And neither said anything: no member reports a case the group cannot be in (W10).
      expect(reportsOf(seen)).toEqual([]);
    });
  }

  test('CKG-1: the shadow root holds the field group\'s own element — spacing controls — around the select-all checkbox, only while one is asked for, and a slot the product\'s checkboxes pass through; the eleven props of the frame are on it as given; the group is a block that writes no custom property, so a field group token set on it is read inside; and the rows measure what the field group\'s do', async ({ page }) => {
    await page_(
      page,
      `${group_('supporting-text="Choose all that apply." requirement="required" required-mark="tag" required-text="Required" optional-text="Optional" error error-text="Choose one." orientation="horizontal" label-hidden select-all-label="All of these"')}
       <${TAG} id="plain" label="Days" style="--tanrei-comp-field-group-gap-controls: 40px"><${BOX} value="a" label="A"></${BOX}><${BOX} value="b" label="B"></${BOX}></${TAG}>`,
    );
    const built = (selector: string) =>
      page.locator(selector).evaluate((el) => {
        const root = el.shadowRoot!;
        const frame = root.querySelector('tanrei-field-group')! as HTMLElement & Record<string, unknown>;
        const names = ['label', 'labelHidden', 'supportingText', 'errorText', 'error', 'disabled', 'requirement', 'requiredMark', 'requiredText', 'optionalText', 'orientation'];
        return {
          root: [...root.children].map((child) => child.localName),
          frame: [...frame.children].map((child) => child.localName + (child.getAttribute('part') ? `[${child.getAttribute('part')}]` : '')),
          spacing: frame.spacing,
          same: names.filter((name) => frame[name] !== (el as unknown as Record<string, unknown>)[name]),
          passed: root.querySelector('slot')!.assignedElements().map((child) => child.localName + (child.id ? `#${child.id}` : '')),
          read: frame.shadowRoot!.querySelector('slot')!.assignedElements({ flatten: true }).length,
          display: getComputedStyle(el).display,
          written: [...root.querySelectorAll<HTMLElement>('*')].flatMap((child) => [...child.style]),
        };
      });
    expect(await built('#g')).toEqual({ root: [FRAME], frame: [`${BOX}[select-all]`, 'slot'], spacing: 'controls', same: [], passed: [`${BOX}#email`, `${BOX}#text`, `${BOX}#push`], read: 4, display: 'block', written: [] });
    expect(await built('#plain')).toMatchObject({ root: [FRAME], frame: ['slot'], spacing: 'controls', same: [], read: 2, display: 'block', written: [] });
    // One group set apart: a token of the field group's, set on the element, is read by the field group inside.
    expect(await page.locator('#plain').locator('.controls').evaluate((el) => getComputedStyle(el).rowGap)).toBe('40px');
    // The field group's parts are the group's, under the field group's names.
    await page.addStyleTag({ content: `#g::part(error-text) { outline: 1px dashed rgb(1, 2, 3); } #g::part(select-all) { outline: 1px dashed rgb(3, 2, 1); }` });
    expect(await g(page).locator('.error-text').evaluate((el) => getComputedStyle(el).outlineColor)).toBe('rgb(1, 2, 3)');
    expect(await g(page).locator('[part="select-all"]').evaluate((el) => getComputedStyle(el).outlineColor)).toBe('rgb(3, 2, 1)');
    // Under the default system: a one-line label (20), 4, one line of description (16), 8, the checkboxes with their
    // containers 8 apart, 4, one line of error text (16).
    await mount(page, [spec.fixtures.find((f) => f.id === 'required-error')!]);
    const group = host(page, 'required-error');
    const [label, description, controls, error] = [await box(group.locator('.label-row')), await box(group.locator('.supporting-text')), await box(group.locator('.controls')), await box(group.locator('.error-text'))];
    near(label.height, 20, 'the label row');
    near(description.y - (label.y + label.height), 4, 'to the description');
    near(description.height, 16, 'the description');
    near(controls.y - (description.y + description.height), 8, 'to the checkboxes');
    const containers = await Promise.all((await group.locator(`${BOX} [part="container"]`).all()).map(box));
    expect(containers).toHaveLength(3);
    for (let index = 1; index < containers.length; index++) near(containers[index]!.y - (containers[index - 1]!.y + containers[index - 1]!.height), 8, 'between two containers');
    near(error.y - (controls.y + controls.height), 4, 'to the error text');
    near(error.height, 16, 'the error text');
    near((await box(group)).width, 320, 'as wide as its layout gives it');
    near((await box(group)).height, error.y + error.height - label.y, 'no padding around its rows');
  });

  test('CKG-2: it holds one list and shows as checked exactly the checkboxes whose value is in it; a value the product sets checks and unchecks to match, over each checkbox\'s own selection motion, with no change and no move of focus; an entry of no checkbox is kept and given back; the list is copied in and out; an entry held twice is held once, two checkboxes of one value move together, a checkbox with no value stays unchecked under a press — and each of the three is reported', async ({ page }) => {
    const seen = warnings(page);
    await page_(page, `<button id="before">Before</button>${group_('name="notify"')}`);
    expect(await value(page)).toEqual([]);
    expect(await checked(page)).toEqual([false, false, false]);
    await page.locator('#before').focus();
    await hear(page);
    // Set by the product: in the order of the checkboxes, whatever order it was given in.
    const marked = await g(page).evaluate(async (el) => {
      (el as Group).value = ['push', 'email'];
      await (el as Group).updateComplete;
      // CHK-13: the change of condition is marked on each checkbox that changed, for its own selection motion.
      return [...el.querySelectorAll('tanrei-checkbox')].map((each) => each.shadowRoot!.querySelector('.root')!.hasAttribute('data-condition-change'));
    });
    expect(marked).toEqual([true, false, true]);
    await settle(page);
    expect(await checked(page)).toEqual([true, false, true]);
    expect(await value(page)).toEqual(['email', 'push']);
    expect(await heard(page), 'no event for a value the product set').toEqual([]);
    expect(await focusPath(page), 'focus has not moved').toEqual(['button#before']);
    await setValue(page, []);
    expect(await checked(page)).toEqual([false, false, false]);
    // An entry that is the value of no checkbox is kept, and given back with the rest: in change and to a form.
    await setValue(page, ['later', 'email']);
    expect(await value(page)).toEqual(['email', 'later']);
    await page.locator('#text').click();
    expect((await dispatched(page)).filter((line) => line.startsWith('group: change'))).toEqual(['group: change from the group [email,text,later] detail [email,text,later]']);
    expect(await value(page)).toEqual(['email', 'text', 'later']);
    // Copied in and out.
    const copies = await g(page).evaluate((el) => {
      const group = el as Group;
      const given = ['email'];
      group.value = given;
      given.push('text');
      const read = group.value;
      read.push('push');
      return { held: group.value, another: group.value !== group.value };
    });
    expect(copies).toEqual({ held: ['email'], another: true });
    // Held twice: held once.
    await setValue(page, ['email', 'text', 'email']);
    expect(await value(page)).toEqual(['email', 'text']);
    // Two checkboxes of one value are checked and unchecked together, and switching either switches the entry.
    await g(page).evaluate((el) => el.insertAdjacentHTML('beforeend', '<tanrei-checkbox id="again" value="push" label="Push, again"></tanrei-checkbox>'));
    await setValue(page, ['push']);
    expect(await checked(page)).toEqual([false, false, true, true]);
    await heard(page);
    await page.locator('#again').click();
    expect(await checked(page)).toEqual([false, false, false, false]);
    expect((await dispatched(page)).filter((line) => line.startsWith('group: change'))).toEqual(['group: change from the group [] detail []']);
    await page.locator('#push').click();
    expect(await checked(page)).toEqual([false, false, true, true]);
    expect(await value(page)).toEqual(['push']);
    // A checkbox that carries no value: drawn unchecked, and a press changes nothing and emits nothing.
    await g(page).evaluate((el) => el.insertAdjacentHTML('beforeend', '<tanrei-checkbox id="none" label="No value"></tanrei-checkbox>'));
    await settle(page);
    await heard(page);
    await page.locator('#none').click();
    await settle(page);
    expect(await checked(page)).toEqual([false, false, true, true, false]);
    expect(await value(page)).toEqual(['push']);
    expect(await dispatched(page)).toEqual([]);
    await page.locator('#none').evaluate((el) => ((el as Box).checked = true));
    await settle(page);
    expect(await checked(page), 'drawn unchecked, whatever the product marks').toEqual([false, false, true, true, false]);
    const reports = reportsOf(seen).filter((text) => text.includes('(CKG-2)'));
    expect(reports.some((text) => text.includes('holds an entry twice'))).toBe(true);
    expect(reports.some((text) => text.includes('share the value "push"'))).toBe(true);
    expect(reports.some((text) => text.includes('has no value'))).toBe(true);
    expect(reports).toHaveLength(3);
  });

  test('CKG-3: checked on its children is its first value, in the order of the children, while the product has not set value; a checkbox that arrives so marked adds its value; where the product has set value, value decides and a checkbox that is drawn or arrives marked against it is shown as value says; checked set or cleared on a checkbox it holds adds the value or takes it out, with no change', async ({ page }) => {
    await page_(page, `<${TAG} id="g" label="Notify me by"><${BOX} id="email" value="email" label="Email" checked></${BOX}><${BOX} id="text" value="text" label="Text message"></${BOX}><${BOX} id="push" value="push" label="Push notification" checked></${BOX}></${TAG}><div id="place"></div>`);
    expect(await value(page)).toEqual(['email', 'push']);
    expect(await checked(page)).toEqual([true, false, true]);
    // The same markup with the value property set to another list shows that list.
    await page.evaluate((markup) => {
      const decided = document.createElement('tanrei-checkbox-group') as Group;
      decided.id = 'h';
      decided.label = 'Notify me by';
      decided.value = ['text'];
      decided.innerHTML = markup;
      document.getElementById('place')!.append(decided);
    }, `<${BOX} value="email" label="Email" checked></${BOX}><${BOX} value="text" label="Text message"></${BOX}><${BOX} value="push" label="Push notification" checked></${BOX}>`);
    await settle(page);
    expect(await value(page, '#h')).toEqual(['text']);
    expect(await checked(page, '#h')).toEqual([false, true, false]);
    // A checkbox that arrives marked: its value is added where the markup is the value, and it is shown as value says where the product decided.
    await hear(page);
    for (const id of ['g', 'h']) await page.locator(`#${id}`).evaluate((el) => el.insertAdjacentHTML('beforeend', '<tanrei-checkbox value="sms" label="SMS" checked></tanrei-checkbox>'));
    await settle(page);
    expect(await value(page)).toEqual(['email', 'push', 'sms']);
    expect(await checked(page)).toEqual([true, false, true, true]);
    expect(await value(page, '#h')).toEqual(['text']);
    expect(await checked(page, '#h')).toEqual([false, true, false, false]);
    // checked set or cleared on a checkbox the group holds — by the property or by the attribute — is the list's from then on, in either group.
    await page.locator('#text').evaluate((el) => ((el as Box).checked = true));
    await settle(page);
    expect(await value(page)).toEqual(['email', 'text', 'push', 'sms']);
    await page.locator('#email').evaluate((el) => el.removeAttribute('checked'));
    await settle(page);
    expect(await value(page)).toEqual(['text', 'push', 'sms']);
    expect(await checked(page)).toEqual([false, true, true, true]);
    await page.locator('#h').evaluate((el) => el.querySelector('tanrei-checkbox')!.setAttribute('checked', ''));
    await settle(page);
    expect(await value(page, '#h')).toEqual(['email', 'text']);
    expect(await checked(page, '#h')).toEqual([true, true, false, false]);
    expect(await heard(page), 'nothing is emitted').toEqual([]);
  });

  test('CKG-4: a switch by a click, by Space and by a click on a label adds the checkbox\'s value or takes it out and emits change exactly once, with the new list already the value — in the order of the checkboxes, not of the checking; no other checkbox changes; nothing a checkbox emits reaches the group or a capturing listener on the document as a second change, and a listener on a checkbox hears nothing; the last one unchecked gives an empty list', async ({ page }) => {
    await page_(page, group_());
    await hear(page);
    await page.evaluate(() => {
      const own: string[] = [];
      (window as unknown as { own: string[] }).own = own;
      for (const each of document.querySelectorAll('#g > tanrei-checkbox')) for (const name of ['input', 'change']) each.addEventListener(name, (event) => event.target === each && own.push(`${name} on ${each.id}`));
    });
    // The third, by a click.
    await page.locator('#push').click();
    expect(await heard(page)).toEqual([
      "document, capturing: the browser's input from tanrei-checkbox#push []",
      'document, capturing: input from the group [push]',
      'group: input from the group [push]',
      'document, capturing: change from the group [push] detail [push]',
      'group: change from the group [push] detail [push]',
    ]);
    expect(await checked(page)).toEqual([false, false, true]);
    // The first, by Space: it stands before the third in the list.
    await page.locator('#email').evaluate((el: HTMLElement) => el.focus());
    await page.keyboard.press('Space');
    expect(await dispatched(page)).toEqual([
      'document, capturing: input from the group [email,push]',
      'group: input from the group [email,push]',
      'document, capturing: change from the group [email,push] detail [email,push]',
      'group: change from the group [email,push] detail [email,push]',
    ]);
    // The second, by a click on its label.
    await page.locator('#text').locator('.label').click();
    expect((await dispatched(page)).filter((line) => line.includes('change'))).toEqual(['document, capturing: change from the group [email,text,push] detail [email,text,push]', 'group: change from the group [email,text,push] detail [email,text,push]']);
    expect(await checked(page)).toEqual([true, true, true]);
    // The detail is a copy: a listener that changes it changes nothing of the group's.
    await g(page).evaluate((el) => el.addEventListener('change', (event) => (event as CustomEvent<{ value: string[] }>).detail.value.push('written by a listener'), { once: true }));
    await page.locator('#text').click();
    expect(await value(page)).toEqual(['email', 'push']);
    await heard(page);
    // A person can empty the list.
    await page.locator('#email').click();
    await page.locator('#push').click();
    expect((await dispatched(page)).filter((line) => line.startsWith('group: change'))).toEqual(['group: change from the group [push] detail [push]', 'group: change from the group [] detail []']);
    expect(await value(page)).toEqual([]);
    // CHK-23: a listener set on a checkbox inside the group heard nothing in all of this.
    expect(await page.evaluate(() => (window as unknown as { own: string[] }).own)).toEqual([]);
  });

  test('CKG-5: every enabled checkbox is a stop of its own, in the order given — three, four with the select-all checkbox, a disabled one passed — and the group is none; no arrow key moves focus or checks, and Enter switches nothing; a press on the label, the requirement mark, the description or the error text checks nothing and moves no focus in; focus() goes to the first enabled checkbox it shows, the select-all checkbox where one is drawn', async ({ page }) => {
    await page_(page, `<button id="before">Before</button><label id="for" for="g">A label of the page</label>${group_('supporting-text="Choose all that apply." requirement="required" required-text="Required" error error-text="Choose one."')}<button id="after">After</button>`);
    expect(await g(page).evaluate((el) => ({ delegates: el.shadowRoot!.delegatesFocus, tabindex: el.getAttribute('tabindex'), tabIndex: el.tabIndex }))).toEqual({ delegates: false, tabindex: null, tabIndex: -1 });
    const stops = async (count: number, back = false) => {
      const seen: string[] = [];
      for (let press = 0; press < count; press++) {
        await tab(page, { back });
        seen.push((await focusPath(page)).slice(0, 2).join(' > '));
      }
      return seen;
    };
    await page.locator('#before').focus();
    expect(await stops(4)).toEqual([`${BOX}#email > input`, `${BOX}#text > input`, `${BOX}#push > input`, 'button#after']);
    expect(await stops(4, true)).toEqual([`${BOX}#push > input`, `${BOX}#text > input`, `${BOX}#email > input`, 'button#before']);
    // With a select-all checkbox: one more stop, before the first.
    await g(page).evaluate((el) => ((el as Group).selectAllLabel = 'All of these'));
    await settle(page);
    expect(await stops(5)).toEqual([`${TAG}#g > ${BOX}`, `${BOX}#email > input`, `${BOX}#text > input`, `${BOX}#push > input`, 'button#after']);
    // A disabled one is passed.
    await page.locator('#text').evaluate((el) => ((el as Box).disabled = true));
    await settle(page);
    await page.locator('#before').focus();
    expect(await stops(4)).toEqual([`${TAG}#g > ${BOX}`, `${BOX}#email > input`, `${BOX}#push > input`, 'button#after']);
    // No arrow key moves focus or checks, and Enter is left to the form.
    await hear(page);
    await page.locator('#email').evaluate((el: HTMLElement) => el.focus());
    for (const key of ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End', 'Enter']) {
      await page.keyboard.press(key);
      expect((await focusPath(page))[0], key).toBe(`${BOX}#email`);
    }
    expect(await value(page)).toEqual([]);
    expect(await heard(page)).toEqual([]);
    // A press on a text of the frame: nothing is checked and no focus moves into the group.
    await page.locator('#email').evaluate((el: HTMLElement) => el.blur());
    for (const part of ['.legend', '.requirement-tag', '.supporting-text', '.error-text']) {
      const at = await box(g(page).locator(part).first());
      await page.mouse.click(at.x + 3, at.y + at.height / 2);
      expect(await page.evaluate(() => document.activeElement?.localName), part).toBe('body');
    }
    expect(await value(page)).toEqual([]);
    expect(await heard(page)).toEqual([]);
    // focus(): the select-all checkbox where one is drawn; else the first enabled checkbox.
    await g(page).evaluate((el: HTMLElement) => el.focus());
    expect((await focusPath(page)).slice(0, 2)).toEqual([`${TAG}#g`, BOX]);
    await g(page).evaluate((el: HTMLElement) => el.blur());
    expect(await focusPath(page)).toEqual(['body']);
    await g(page).evaluate((el) => ((el as Group).selectAllLabel = ''));
    await page.locator('#email').evaluate((el) => ((el as Box).disabled = true));
    await page.locator('#text').evaluate((el) => ((el as Box).disabled = false));
    await settle(page);
    await g(page).evaluate((el: HTMLElement) => el.focus());
    expect(await focusPath(page)).toEqual([`${BOX}#text`, 'input']);
    await g(page).evaluate((el: HTMLElement) => el.blur());
    expect(await focusPath(page)).toEqual(['body']);
    // A label of the page for the group: focus goes to that checkbox, and nothing is checked.
    await page.locator('#for').click();
    expect(await focusPath(page)).toEqual([`${BOX}#text`, 'input']);
    expect(await value(page)).toEqual([]);
  });

  test('CKG-6: disabled, it is a disabled field group — the frame drawn disabled and every checkbox it holds disabled, the select-all checkbox among them, through the slot — that keeps its value, shows the checked ones checked and emits no change; enabled, it does not enable a checkbox the product disabled itself, which keeps its entry, is shown as value says and cannot be switched; it has no read-only state', async ({ page }) => {
    await page_(page, `<${TAG} id="g" label="Notify me by" disabled select-all-label="All of these"><${BOX} id="email" value="email" label="Email" checked></${BOX}><${BOX} id="text" value="text" label="Text message"></${BOX}><${BOX} id="push" value="push" label="Push notification"></${BOX}></${TAG}>`);
    const disabled = () => g(page).evaluate((el) => [el.shadowRoot!.querySelector('tanrei-checkbox')!, ...el.querySelectorAll('tanrei-checkbox')].map((each) => each.shadowRoot!.querySelector('input')!.disabled));
    const frame = () => g(page).locator('fieldset').evaluate((el) => ({ said: el.getAttribute('aria-disabled'), drawn: el.hasAttribute('data-disabled') }));
    expect(await disabled()).toEqual([true, true, true, true]);
    expect(await frame()).toEqual({ said: 'true', drawn: true });
    expect(await value(page)).toEqual(['email']);
    expect(await checked(page)).toEqual([true, false, false]);
    await hear(page);
    await page.locator('#text').click({ force: true });
    await page.locator('#text').evaluate((el: HTMLElement) => el.click());
    await g(page).locator('[part="select-all"]').click({ force: true });
    expect(await heard(page)).toEqual([]);
    expect(await value(page)).toEqual(['email']);
    // Enabled again: every checkbox is, but one the product disabled itself.
    await page.locator('#text').evaluate((el) => ((el as Box).disabled = true));
    await g(page).evaluate((el) => ((el as Group).disabled = false));
    await settle(page);
    expect(await disabled()).toEqual([false, false, true, false]);
    expect(await frame()).toEqual({ said: null, drawn: false });
    // It is shown as value says, keeps its entry, and a person cannot switch it.
    await setValue(page, ['text']);
    expect(await checked(page)).toEqual([false, true, false]);
    await page.locator('#text').click({ force: true });
    await page.locator('#text').evaluate((el: HTMLElement) => el.click());
    expect(await dispatched(page)).toEqual([]);
    expect(await value(page)).toEqual(['text']);
    await page.locator('#push').click();
    expect(await value(page), 'its entry stays while the others change').toEqual(['text', 'push']);
    // Disabled and enabled once more: the checkbox's own disabled is still its own.
    await g(page).evaluate((el) => ((el as Group).disabled = true));
    await settle(page);
    expect(await disabled()).toEqual([true, true, true, true]);
    await g(page).evaluate((el) => ((el as Group).disabled = false));
    await settle(page);
    expect(await disabled()).toEqual([false, false, true, false]);
    expect(await page.locator('#text').evaluate((el) => (el as Box).disabled)).toBe(true);
    // No read-only state: the group has no such property and takes no such attribute.
    expect(await g(page).evaluate((el) => ['readOnly', 'readonly'].filter((name) => name in el || (el.constructor as unknown as { elementProperties: Map<string, unknown> }).elementProperties.has(name)))).toEqual([]);
  });

  test('CKG-7: required means at least one, and the group never sets error itself — not for an empty list; in error it is a field group in error: the error text below the last checkbox, the description still there, and every checkbox it holds, the select-all checkbox among them, in its own error condition, invalid and described by the error text, through the slot; not in error it leaves one checkbox the error the product gave it; a change of value does not clear error; an error that appears under the person\'s focus is announced by the field group', async ({ page }) => {
    await page_(page, group_('requirement="required" required-text="Required" supporting-text="Choose all that apply." error-text="Choose at least one way to reach you." select-all-label="All of these"'));
    const marks = () =>
      g(page).evaluate((el) =>
        [el.shadowRoot!.querySelector('tanrei-checkbox')!, ...el.querySelectorAll('tanrei-checkbox')].map((each) => {
          const input = each.shadowRoot!.querySelector('input')!;
          return [each.shadowRoot!.querySelector('.root')!.hasAttribute('data-error'), input.getAttribute('aria-invalid'), input.getAttribute('aria-description')].join(' | ');
        }),
      );
    // Required and empty: no error of the group's own making.
    expect(await g(page).evaluate((el) => (el as Group).error)).toBe(false);
    await expect(g(page).locator('.error-text')).toHaveCount(0);
    expect(await marks()).toEqual(Array(4).fill('false |  | '));
    await page.locator('#email').click();
    await page.locator('#email').click();
    expect(await g(page).evaluate((el) => (el as Group).error), 'emptied by the person: still the product\'s to set').toBe(false);
    // One checkbox in error by itself, in a group that is not.
    await page.locator('#push').evaluate((el) => ((el as Box).error = true));
    await settle(page);
    expect(await marks()).toEqual(['false |  | ', 'false |  | ', 'false |  | ', 'true | true | ']);
    await page.locator('#push').evaluate((el) => ((el as Box).error = false));
    // In error: the field group's row and words, and every box marked.
    await page.locator('#text').evaluate((el: HTMLElement) => el.focus());
    await g(page).evaluate((el) => ((el as Group).error = true));
    await settle(page);
    await expect(g(page).locator('.error-text')).toHaveText('Choose at least one way to reach you.');
    await expect(g(page).locator('.supporting-text')).toHaveText('Choose all that apply.');
    expect(await marks()).toEqual(Array(4).fill('true | true | Choose at least one way to reach you.'));
    const [last, error] = [await box(page.locator('#push')), await box(g(page).locator('.error-text'))];
    expect(error.y, 'below the last checkbox').toBeGreaterThanOrEqual(last.y + last.height);
    // FGR-9: focus is on a checkbox of the set — a child of the group, slotted into the field group — and the error is announced.
    await expect(g(page).locator('.announcer')).toHaveText('Choose at least one way to reach you.');
    // A change of value does not clear it.
    await page.locator('#email').click();
    await setValue(page, ['email', 'text']);
    expect(await g(page).evaluate((el) => (el as Group).error)).toBe(true);
    expect((await marks())[1]).toBe('true | true | Choose at least one way to reach you.');
    await g(page).evaluate((el) => ((el as Group).error = false));
    await settle(page);
    expect(await marks()).toEqual(Array(4).fill('false |  | '));
  });

  test('CKG-8: in a form it is one control — one entry under its name for each entry of the list, in the list\'s order, exactly what native checkboxes of one name submit, read from a real submission; its checkboxes submit nothing, whatever name they carry, so nothing is sent twice; an entry of no checkbox is submitted with the rest; an empty list and a group with no name submit nothing', async ({ page }) => {
    await page_(
      page,
      `<form id="f"><${TAG} id="g" name="notify" label="Notify me by" select-all-label="All of these"><${BOX} id="email" name="own" value="email" label="Email" checked></${BOX}><${BOX} id="text" name="notify" value="text" label="Text message"></${BOX}><${BOX} id="push" name="own" value="push" label="Push notification" checked></${BOX}></${TAG}><input name="note" value="hello" /></form>
       <form id="n"><fieldset><legend>Notify me by</legend><input type="checkbox" name="notify" value="email" checked /><input type="checkbox" name="notify" value="text" /><input type="checkbox" name="notify" value="push" checked /></fieldset><input name="note" value="hello" /></form>`,
    );
    expect(await entries(page, '#f')).toEqual(['notify=email', 'notify=push', 'note=hello']);
    expect(await entries(page, '#f')).toEqual(await entries(page, '#n'));
    expect(await g(page).evaluate((el) => (el as Group).form?.id)).toBe('f');
    // What the browser sends: the two forms, submitted for real.
    const [ours, native_] = [await sent(page, '#f'), await sent(page, '#n')];
    expect(ours).toBe('notify=email&notify=push&note=hello');
    expect(ours).toBe(native_);
    // Checked in another order: still the order of the checkboxes. A checkbox that carries the group's own name adds no second entry.
    await page.locator('#push').click();
    await page.locator('#text').click();
    await page.locator('#push').click();
    expect(await entries(page, '#f')).toEqual(['notify=email', 'notify=text', 'notify=push', 'note=hello']);
    expect(await sent(page, '#f')).toBe('notify=email&notify=text&notify=push&note=hello');
    // An entry of no checkbox follows the others.
    await setValue(page, ['later', 'push']);
    expect(await entries(page, '#f')).toEqual(['notify=push', 'notify=later', 'note=hello']);
    // All of them by the select-all checkbox, which is no entry itself.
    await g(page).locator('[part="select-all"]').click();
    expect(await sent(page, '#f')).toBe('notify=email&notify=text&notify=push&notify=later&note=hello');
    // Empty: nothing. Without a name: nothing, and still nothing of a checkbox's own.
    await setValue(page, []);
    expect(await entries(page, '#f')).toEqual(['note=hello']);
    await setValue(page, ['email']);
    await g(page).evaluate((el) => ((el as Group).name = ''));
    await settle(page);
    expect(await entries(page, '#f')).toEqual(['note=hello']);
  });

  test('CKG-8: a checkbox the product disabled itself still has its entry submitted while the list holds it; a disabled group submits nothing; it is disabled while a fieldset of the form disables the set it is in — the frame and every checkbox with it, its own property unchanged — and submitted again when the fieldset is enabled', async ({ page }) => {
    await page_(page, `<form id="f"><fieldset id="set"><${TAG} id="g" name="notify" label="Notify me by"><${BOX} id="email" value="email" label="Email" checked disabled></${BOX}><${BOX} id="text" value="text" label="Text message" checked></${BOX}><${BOX} id="push" value="push" label="Push notification" disabled></${BOX}></${TAG}></fieldset></form>`);
    // The always-on choice: one disabled, checked checkbox, and no hidden field beside it.
    expect(await entries(page, '#f')).toEqual(['notify=email', 'notify=text']);
    expect(await sent(page, '#f')).toBe('notify=email&notify=text');
    const state = () =>
      g(page).evaluate((el) => ({
        own: (el as Group).disabled,
        platform: el.matches(':disabled'),
        frame: el.shadowRoot!.querySelector('tanrei-field-group')!.shadowRoot!.querySelector('fieldset')!.getAttribute('aria-disabled'),
        boxes: [...el.querySelectorAll('tanrei-checkbox')].map((each) => each.shadowRoot!.querySelector('input')!.disabled),
        validated: (el as Group).willValidate,
      }));
    expect(await state()).toEqual({ own: false, platform: false, frame: null, boxes: [true, false, true], validated: true });
    // A disabled group.
    await g(page).evaluate((el) => ((el as Group).disabled = true));
    await settle(page);
    expect(await entries(page, '#f')).toEqual([]);
    expect(await state()).toEqual({ own: true, platform: true, frame: 'true', boxes: [true, true, true], validated: false });
    expect(await value(page), 'the value is kept').toEqual(['email', 'text']);
    await g(page).evaluate((el) => ((el as Group).disabled = false));
    await settle(page);
    expect(await entries(page, '#f')).toEqual(['notify=email', 'notify=text']);
    // A disabled fieldset.
    await page.locator('#set').evaluate((el) => ((el as HTMLFieldSetElement).disabled = true));
    await settle(page);
    expect(await state()).toEqual({ own: false, platform: true, frame: 'true', boxes: [true, true, true], validated: false });
    expect(await entries(page, '#f')).toEqual([]);
    await page.locator('#set').evaluate((el) => ((el as HTMLFieldSetElement).disabled = false));
    await settle(page);
    expect(await state()).toEqual({ own: false, platform: false, frame: null, boxes: [true, false, true], validated: true });
    expect(await entries(page, '#f')).toEqual(['notify=email', 'notify=text']);
  });

  test('CKG-8: a reset returns it to the value it was first given, without a change — checked on the children where the markup is the first value, the list where the product gave one before the group was drawn — and a restored state is the list again', async ({ page }) => {
    await page_(page, `<form id="f"><${TAG} id="g" name="notify" label="Notify me by"><${BOX} id="email" value="email" label="Email" checked></${BOX}><${BOX} id="text" value="text" label="Text message"></${BOX}><${BOX} id="push" value="push" label="Push notification" checked></${BOX}></${TAG}><div id="place"></div><button type="reset" id="reset">Reset</button></form>`);
    await page.evaluate((markup) => {
      const given = document.createElement('tanrei-checkbox-group') as Group;
      given.id = 'h';
      given.name = 'days';
      given.label = 'Days';
      given.value = ['text'];
      given.innerHTML = markup;
      document.getElementById('place')!.append(given);
    }, `<${BOX} value="email" label="Email" checked></${BOX}><${BOX} value="text" label="Text message"></${BOX}><${BOX} value="push" label="Push notification"></${BOX}>`);
    await settle(page);
    await hear(page);
    await page.locator('#text').click();
    await page.locator('#email').click();
    await setValue(page, ['push', 'email'], '#h');
    await page.locator('#h').locator(BOX).nth(1).click();
    expect(await entries(page, '#f')).toEqual(['notify=text', 'notify=push', 'days=email', 'days=text', 'days=push']);
    await heard(page);
    await page.locator('#reset').click();
    await settle(page);
    expect(await value(page)).toEqual(['email', 'push']);
    expect(await checked(page)).toEqual([true, false, true]);
    expect(await value(page, '#h')).toEqual(['text']);
    expect(await checked(page, '#h')).toEqual([false, true, false]);
    expect(await entries(page, '#f')).toEqual(['notify=email', 'notify=push', 'days=text']);
    expect(await dispatched(page), 'no change for a reset').toEqual([]);
    // A value the product set after the group was drawn is no first value: the markup still is.
    await setValue(page, ['text']);
    await page.locator('#reset').click();
    await settle(page);
    expect(await value(page)).toEqual(['email', 'push']);
    // Restored on navigation: the list the group told the form.
    await g(page).evaluate((el) => (el as Group).formStateRestoreCallback(JSON.stringify(['push', 'kept']), 'restore'));
    await settle(page);
    expect(await value(page)).toEqual(['push', 'kept']);
    expect(await checked(page)).toEqual([false, false, true]);
    expect(await dispatched(page)).toEqual([]);
  });

  test('CKG-8: while required and its list is empty it reports a missing value to the form\'s own validation, anchored on its first enabled checkbox, in the product\'s words — errorText, else the required text of the instance or of the product, else the label, never a browser\'s sentence for one unchecked box — and the form is not submitted; one entry, of a checkbox or of none, satisfies it; it never sets error', async ({ page }) => {
    await page_(
      page,
      `<form id="f"><${TAG} id="g" name="notify" label="Notify me by" requirement="required" error-text="Choose at least one way to reach you." required-text="Required">${BOXES}</${TAG}><button id="send">Send</button></form>
       <input id="native" type="checkbox" required />
       <script>window.submitted = 0; document.getElementById('f').addEventListener('submit', (event) => { event.preventDefault(); window.submitted++; });</script>`,
    );
    const validity = () => g(page).evaluate((el) => ({ valid: (el as Group).checkValidity(), missing: (el as Group).validity.valueMissing, message: (el as Group).validationMessage, validated: (el as Group).willValidate, error: (el as Group).error }));
    expect(await validity()).toEqual({ valid: false, missing: true, message: 'Choose at least one way to reach you.', validated: true, error: false });
    expect(await page.locator('#f').evaluate((el) => (el as HTMLFormElement).checkValidity())).toBe(false);
    const browsers = await page.locator('#native').evaluate((el) => (el as HTMLInputElement).validationMessage);
    expect(browsers).not.toBe('');
    // The message, most telling first.
    const message = async (change: (el: Group) => void) => {
      await g(page).evaluate(change);
      await settle(page);
      return (await validity()).message;
    };
    expect(await message((el) => (el.errorText = ''))).toBe('Required');
    expect(await message((el) => (el.requiredText = ''))).toBe('Notify me by');
    await setWords(page, { requiredText: 'Must be answered' });
    await settle(page);
    expect((await validity()).message, 'the product\'s words, where the instance gives none').toBe('Must be answered');
    for (const said of ['Choose at least one way to reach you.', 'Required', 'Notify me by', 'Must be answered']) expect(said).not.toBe(browsers);
    // The browser's message is anchored on the first enabled checkbox: reporting focuses it, and the form is not sent.
    await page.locator('#email').evaluate((el) => ((el as Box).disabled = true));
    await settle(page);
    const reported = await g(page).evaluate((el) => {
      let invalid = 0;
      el.addEventListener('invalid', () => invalid++);
      return { reported: (el as Group).reportValidity(), invalid };
    });
    expect(reported).toEqual({ reported: false, invalid: 1 });
    expect(await focusPath(page)).toEqual([`${BOX}#text`, 'input']);
    await page.locator('#send').click();
    expect(await page.evaluate(() => (window as unknown as { submitted: number }).submitted)).toBe(0);
    // One entry satisfies it — of a checkbox, or of none — and an empty list fails it again.
    await page.locator('#text').click();
    expect(await validity()).toMatchObject({ valid: true, missing: false, message: '', error: false });
    await page.locator('#send').click();
    expect(await page.evaluate(() => (window as unknown as { submitted: number }).submitted)).toBe(1);
    await setValue(page, ['later']);
    expect((await validity()).valid).toBe(true);
    await setValue(page, []);
    expect(await validity()).toMatchObject({ valid: false, missing: true, error: false });
    // Not required, or disabled: nothing is asked.
    expect(await message((el) => (el.requirement = 'optional'))).toBe('');
    await g(page).evaluate((el) => {
      (el as Group).requirement = 'required';
      (el as Group).disabled = true;
    });
    await settle(page);
    expect(await validity()).toMatchObject({ validated: false, missing: false });
  });

  test('CKG-8: Enter in a checkbox of the set, and in the select-all checkbox in the group\'s shadow root, presses the default button of the group\'s form and switches nothing', async ({ page }) => {
    await page_(
      page,
      `<form id="f"><${TAG} id="g" name="notify" label="Notify me by" select-all-label="All of these"><${BOX} id="email" value="email" label="Email" checked></${BOX}><${BOX} id="text" value="text" label="Text message"></${BOX}></${TAG}><button id="send" name="via" value="send">Send</button></form>
       <script>window.log = []; const form = document.getElementById('f'); document.getElementById('send').addEventListener('click', () => window.log.push('click')); form.addEventListener('submit', (event) => { event.preventDefault(); window.log.push('submit ' + [...new FormData(form, event.submitter).entries()].join('|')); });</script>`,
    );
    await page.locator('#text').evaluate((el: HTMLElement) => el.focus());
    await page.keyboard.press('Enter');
    await g(page).evaluate((el: HTMLElement) => el.focus());
    expect((await focusPath(page)).slice(0, 2)).toEqual([`${TAG}#g`, BOX]);
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => (window as unknown as { log: string[] }).log)).toEqual(['click', 'submit notify,email|via,send', 'click', 'submit notify,email|via,send']);
    expect(await value(page)).toEqual(['email']);
  });

  test('CKG-9: it is exposed as the field group it is, once — the host has no role and no ARIA attribute, and the one group is the field group\'s fieldset, named by label whether drawn or not, described by the description, the error text while in error and the requirement in words, disabled while the group is; a group has neither a required nor an invalid state, each checkbox says invalid for itself, none has a position in a set, and the select-all checkbox says mixed', async ({ page, browserName }) => {
    const seen = warnings(page);
    await page_(
      page,
      `${group_('supporting-text="Choose all that apply." requirement="required" required-text="Required" error error-text="Choose one." select-all-label="All of these"', BOXES.replace('id="email"', 'id="email" checked'))}
       <${TAG} id="unseen" label="Days" label-hidden requirement="optional" optional-text="Optional" disabled><${BOX} value="mon" label="Monday"></${BOX}></${TAG}>`,
    );
    const said = (selector: string) =>
      page.locator(selector).evaluate((el) => {
        const all = (root: Element | ShadowRoot): Element[] => [...root.querySelectorAll('*')].flatMap((each) => [each, ...(each.shadowRoot ? all(each.shadowRoot) : [])]);
        const inside = [...all(el.shadowRoot!), ...all(el)];
        const groups = inside.filter((each) => each.localName === 'fieldset' || ['group', 'radiogroup'].includes(each.getAttribute('role') ?? ''));
        const fieldset = groups[0]!;
        const root = fieldset.getRootNode() as ShadowRoot;
        const boxes = inside.filter((each): each is HTMLInputElement => each instanceof HTMLInputElement && each.type === 'checkbox');
        return {
          host: [...el.attributes].map((attribute) => attribute.name).filter((name) => name === 'role' || name === 'tabindex' || name.startsWith('aria-')),
          groups: groups.map((each) => `${each.localName} in ${(each.getRootNode() as ShadowRoot).host.localName}`),
          name: fieldset.querySelector('legend')?.textContent?.trim().replace(/\s*\*$/, '') ?? null,
          described: (fieldset.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean).map((id) => root.getElementById(id)?.textContent?.trim()),
          states: ['aria-required', 'aria-invalid', 'required', 'aria-disabled'].filter((name) => fieldset.hasAttribute(name)),
          boxes: boxes.map((input) => `${input.getAttribute('aria-label')}: ${input.indeterminate ? 'mixed' : input.checked}${input.getAttribute('aria-invalid') === 'true' ? ', invalid' : ''}${input.getAttribute('aria-description') ? ` (${input.getAttribute('aria-description')})` : ''}`),
          positions: boxes.filter((input) => input.hasAttribute('aria-posinset') || input.hasAttribute('aria-setsize')).length,
        };
      });
    expect(await said('#g')).toEqual({
      host: [],
      groups: [`fieldset in ${FRAME}`],
      name: 'Notify me by',
      described: ['Choose all that apply.', 'Choose one.', 'Required'],
      states: [],
      boxes: ['All of these: mixed, invalid (Choose one.)', 'Email: true, invalid (Choose one.)', 'Text message: false, invalid (Choose one.)', 'Push notification: false, invalid (Choose one.)'],
      positions: 0,
    });
    expect(await said('#unseen')).toMatchObject({ host: [], groups: [`fieldset in ${FRAME}`], name: 'Days', described: ['Optional'], states: ['aria-disabled'], positions: 0 });
    if (browserName === 'chromium') {
      // What the engine computes: exactly one group for each, and nothing around it that is one.
      const tree = await axTree(page, 'body');
      const groups = tree.filter((line) => /^\s*(group|radiogroup) /.test(line)).map((line) => line.trim());
      expect(groups).toEqual(['group "Notify me by" (Choose all that apply. Choose one. Required) invalid=false', 'group "Days" (Optional) disabled=true invalid=false']);
      const boxes = tree.filter((line) => line.trim().startsWith('checkbox ')).map((line) => line.trim());
      expect(boxes).toEqual([
        'checkbox "All of these" (Choose one.) checked=mixed focusable=true invalid=true',
        'checkbox "Email" (Choose one.) checked=true focusable=true invalid=true',
        'checkbox "Text message" (Choose one.) checked=false focusable=true invalid=true',
        'checkbox "Push notification" (Choose one.) checked=false focusable=true invalid=true',
        'checkbox "Monday" checked=false disabled=true invalid=false',
      ]);
      expect(tree.join('\n')).not.toMatch(/posinset|setsize|required=true/);
    }
    // W8: the host has no role, so an ARIA name on it names nothing: a debug build says so.
    expect(reportsOf(seen)).toEqual([]);
    await g(page).evaluate(async (el) => {
      el.setAttribute('aria-label', 'A name on the host');
      (el as HTMLElement & { requestUpdate(): void }).requestUpdate();
      await (el as Group).updateComplete;
    });
    expect(reportsOf(seen).filter((text) => text.includes('(CKG-9)') && text.includes('aria-label'))).toHaveLength(1);
  });

  test('CKG-10: a checkbox added, removed or moved, or whose value or disabled changes, is checked by value again — one that arrives with a value the list holds is shown checked, and the entry of a checked one that leaves is kept — the select-all checkbox is set again, the field group gives its error condition to one that came and takes it back from one that left, no change is emitted and focus stays where it is', async ({ page }) => {
    await page_(page, group_('select-all-label="All of these" error error-text="Choose one."'));
    await setValue(page, ['email', 'sms']);
    await hear(page);
    await page.locator('#email').evaluate((el: HTMLElement) => el.focus());
    expect(await selectAll(page)).toBe('mixed');
    // One arrives whose value the list holds: checked, and in the error condition of the group it came into.
    await g(page).evaluate((el) => el.insertAdjacentHTML('beforeend', '<tanrei-checkbox id="sms" value="sms" label="SMS"></tanrei-checkbox>'));
    await settle(page);
    expect(await checked(page)).toEqual([true, false, false, true]);
    expect(await value(page)).toEqual(['email', 'sms']);
    const marked = (id: string) => page.locator(`#${id}`).evaluate((el) => `${el.shadowRoot!.querySelector('.root')!.hasAttribute('data-error')} ${el.shadowRoot!.querySelector('input')!.getAttribute('aria-description') ?? ''}`.trim());
    expect(await marked('sms')).toBe('true Choose one.');
    // Moved: the list follows the order of the checkboxes.
    await g(page).evaluate((el) => el.prepend(el.querySelector('#sms')!));
    await settle(page);
    expect(await value(page)).toEqual(['sms', 'email']);
    expect(await marked('sms')).toBe('true Choose one.');
    // Its value changes: checked by value again, and the entry it stood for is kept.
    await page.locator('#sms').evaluate((el) => el.setAttribute('value', 'text-message'));
    await settle(page);
    expect(await checked(page)).toEqual([false, true, false, false]);
    expect(await value(page)).toEqual(['email', 'sms']);
    // The two left unchecked are checked, then one is disabled: the select-all checkbox stands for those a person can switch.
    await setValue(page, ['email', 'text', 'text-message']);
    expect(await selectAll(page)).toBe('mixed');
    await page.locator('#push').evaluate((el) => ((el as Box).disabled = true));
    await settle(page);
    expect(await selectAll(page)).toBe('checked');
    // A checked one leaves: its entry stays in the list, and it takes nothing of the group with it.
    await page.evaluate(() => document.body.append(document.querySelector('#text')!));
    await settle(page);
    expect(await value(page)).toEqual(['text-message', 'email', 'text']);
    expect(await marked('text')).toBe('false');
    expect(await page.locator('#text').evaluate((el) => (el as Box).checked), 'outside, checked is its own').toBe(true);
    expect(await selectAll(page)).toBe('checked');
    // Nothing was emitted, and focus is where it was.
    expect(await dispatched(page)).toEqual([]);
    expect(await focusPath(page)).toEqual([`${BOX}#email`, 'input']);
  });

  test('CKG-11: it holds checkboxes and nothing else that can be operated — without one it draws its rows and reports it; another control, or a group of controls inside it, is reported and makes no entry of the value; it sets indeterminate on no checkbox of the set and leaves each checkbox drawn and pressed as it is anywhere', async ({ page }) => {
    const seen = warnings(page);
    await page_(
      page,
      `<${TAG} id="empty" label="Nothing yet" supporting-text="Choices will come."></${TAG}>
       ${group_('name="notify"', `${BOXES}<tanrei-switch id="switch" label="A switch" selected></tanrei-switch><${FRAME} id="inner" label="Inside"><${BOX} id="nested" name="nested" value="nested" label="Nested" checked></${BOX}></${FRAME}>`)}
       <${BOX} id="alone" value="email" label="Email"></${BOX}>`,
    );
    await expect(page.locator('#empty').locator('.legend')).toHaveText('Nothing yet');
    await expect(page.locator('#empty').locator('.supporting-text')).toHaveText('Choices will come.');
    expect(await value(page, '#empty')).toEqual([]);
    const mine = (id: string) => reportsOf(seen).filter((text) => text.includes(`<${TAG}>`) && text.includes('(CKG-11)') && text.includes(id));
    expect(mine('holds no checkbox')).toHaveLength(1);
    expect(mine('a control that is not a checkbox of the set')).toHaveLength(1);
    // What another control or a set inside it holds is no entry: the checkbox of the field group inside is a checkbox of its own.
    expect(await value(page)).toEqual([]);
    await hear(page);
    await page.locator('#nested').click();
    expect(await value(page)).toEqual([]);
    expect((await dispatched(page)).filter((line) => line.startsWith('group:')).map((line) => line.replace(/ \[.*$/, ''))).toEqual(['group: input from tanrei-checkbox#nested', 'group: change from tanrei-checkbox#nested']);
    await page.locator('#switch').click();
    expect(await value(page)).toEqual([]);
    // It sets indeterminate on none of its checkboxes, whatever is switched.
    await page.locator('#email').click();
    await setValue(page, ['email', 'text']);
    await setValue(page, ['text']);
    expect(await g(page).evaluate((el) => [...el.querySelectorAll('tanrei-checkbox')].map((each) => (each as Box).indeterminate || each.shadowRoot!.querySelector('input')!.indeterminate))).toEqual([false, false, false, false]);
    // And restyles none: a checkbox of the set is drawn as the same checkbox outside it.
    await setValue(page, []);
    await page.mouse.move(0, 0);
    await frames(page);
    // The selection motion of the checkbox that was just unchecked has ended: what is compared is the two at rest.
    await page.evaluate(() => document.getAnimations().forEach((animation) => animation.finish()));
    await frames(page);
    const drawn = (id: string) =>
      page.locator(`#${id}`).evaluate((el) => {
        const [root, container, box_, label] = ['.root', '.container', '.box', '.label'].map((part) => el.shadowRoot!.querySelector(part)!);
        const size = (part: Element) => `${part.getBoundingClientRect().width}x${part.getBoundingClientRect().height}`;
        return { host: size(el), container: size(container!), box: size(box_!), edge: getComputedStyle(box_!, '::before').backgroundColor, fill: getComputedStyle(box_!.querySelector('.fill')!).backgroundColor, label: getComputedStyle(label!).color, font: getComputedStyle(label!).font, opacity: getComputedStyle(root!).opacity, cursor: getComputedStyle(root!).cursor };
      });
    expect(await drawn('email')).toEqual(await drawn('alone'));
  });

  test('CKG-12: while selectAllLabel is given it brings one more checkbox — the Checkbox itself, before the first, one more control of the field group at the same distance and not indented over the set — that is checked while every checkbox a person can switch is, indeterminate while some are, unchecked while none is and disabled while there is none; it has no value and is no entry, follows every change of the value and of the set at once, and is disabled and in error with the others; while the label is empty there is none', async ({ page }) => {
    await mount(page, spec.fixtures.filter((f) => f.id.startsWith('select-all') || f.id === 'default'));
    const state = (id: string) =>
      host(page, id).evaluate((el) => {
        const input = el.shadowRoot!.querySelector('tanrei-checkbox')?.shadowRoot!.querySelector('input');
        return input ? (input.indeterminate ? 'mixed' : input.checked ? 'checked' : 'unchecked') + (input.disabled ? ', disabled' : '') : null;
      });
    expect(await state('default')).toBeNull();
    expect(await state('select-all-none')).toBe('unchecked');
    expect(await state('select-all-some')).toBe('mixed');
    expect(await state('select-all-all')).toBe('checked');
    // It stands for the two a person can switch: the disabled checkbox is not checked.
    expect(await state('select-all-one-disabled')).toBe('checked');
    const id = 'select-all-some';
    const all = host(page, id).locator('[part="select-all"]');
    expect(await all.evaluate((el) => [el.localName, (el as Box).label, el.hasAttribute('value'), el.parentElement!.localName, el.previousElementSibling, el.nextElementSibling!.localName])).toEqual([BOX, 'All of these', false, FRAME, null, 'slot']);
    // One more control of the field group: the same distance from the next as between two of the set, from the same edge.
    const rows = [await box(all), ...(await Promise.all((await host(page, id).locator(`> ${BOX}`).all()).map(box)))];
    near(rows[1]!.y - (rows[0]!.y + rows[0]!.height), rows[2]!.y - (rows[1]!.y + rows[1]!.height), 'the same distance');
    near(rows[0]!.x, rows[1]!.x, 'not indented');
    // No value and no entry.
    expect(await host(page, id).evaluate((el) => (el as Group).value)).toEqual(['email']);
    // It follows the value and the set at once, whoever changes them.
    const group = host(page, id);
    const now = async (change: (el: Group) => void) => {
      await group.evaluate(change);
      await settle(page);
      return state(id);
    };
    expect(await now((el) => (el.value = ['email', 'text', 'push']))).toBe('checked');
    expect(await now((el) => (el.value = []))).toBe('unchecked');
    expect(await now((el) => ((el.querySelector('tanrei-checkbox') as Box).checked = true))).toBe('mixed');
    expect(await now((el) => el.querySelectorAll('tanrei-checkbox')[2]!.remove())).toBe('mixed');
    expect(await now((el) => el.querySelectorAll('tanrei-checkbox')[1]!.remove())).toBe('checked');
    expect(await now((el) => el.insertAdjacentHTML('beforeend', '<tanrei-checkbox value="sms" label="SMS"></tanrei-checkbox>'))).toBe('mixed');
    // Disabled while there is no checkbox a person can switch; with the others while the group is disabled; in error with the others.
    expect(await now((el) => el.querySelectorAll('tanrei-checkbox').forEach((each) => ((each as Box).disabled = true)))).toBe('unchecked, disabled');
    expect(await now((el) => el.querySelectorAll('tanrei-checkbox').forEach((each) => ((each as Box).disabled = false)))).toBe('mixed');
    expect(await now((el) => (el.disabled = true))).toBe('mixed, disabled');
    expect(await now((el) => ((el.disabled = false), (el.error = true)))).toBe('mixed');
    expect(await all.evaluate((el) => [el.shadowRoot!.querySelector('.root')!.hasAttribute('data-error'), el.shadowRoot!.querySelector('input')!.getAttribute('aria-invalid')])).toEqual([true, 'true']);
    // Empty: none. Given again: one.
    expect(await now((el) => (el.selectAllLabel = ''))).toBeNull();
    await expect(all).toHaveCount(0);
    expect(await now((el) => (el.selectAllLabel = 'Every one'))).toBe('mixed');
    expect(await all.evaluate((el) => el.shadowRoot!.querySelector('input')!.getAttribute('aria-label'))).toBe('Every one');
    // In a row it is one more checkbox of the row.
    await mount(page, [fx('row', { orientation: 'horizontal', selectAllLabel: 'All', value: ['email'] }, { items: [item('email', 'Email'), item('text', 'Text')] })]);
    const row = [await box(host(page, 'row').locator('[part="select-all"]')), ...(await Promise.all((await host(page, 'row').locator(`> ${BOX}`).all()).map(box)))];
    near(row[0]!.y, row[1]!.y, 'on the row');
    expect(row[1]!.x, 'before the first').toBeGreaterThan(row[0]!.x + row[0]!.width);
    near(row[1]!.x - (row[0]!.x + row[0]!.width), row[2]!.x - (row[1]!.x + row[1]!.width), 'the same distance');
  });

  test('CKG-13: the select-all checkbox, activated while unchecked or indeterminate, checks every checkbox of the set the product did not disable, and while checked unchecks them all — by a click and by Space; a checkbox the product disabled and an entry of no checkbox stay as they are; change is emitted exactly once with the list after the change, and nothing of the select-all checkbox\'s own reaches a listener on the group', async ({ page }) => {
    await page_(page, `<${TAG} id="g" label="Notify me by" select-all-label="All of these"><${BOX} id="email" value="email" label="Email" checked></${BOX}><${BOX} id="text" value="text" label="Text message"></${BOX}><${BOX} id="push" value="push" label="Push notification"></${BOX}></${TAG}>`);
    await hear(page);
    await g(page).evaluate((el) => {
      // A capturing listener on the group itself, too.
      for (const name of ['input', 'change']) el.addEventListener(name, (event) => !event.isTrusted && (window as unknown as { heard: string[] }).heard.push(`group, capturing: ${event.type} from ${event.target === el ? 'the group' : 'another'}`), true);
    });
    const all = g(page).locator('[part="select-all"]');
    expect(await selectAll(page)).toBe('mixed');
    // From some: all.
    await all.click();
    expect(await dispatched(page)).toEqual([
      'document, capturing: input from the group [email,text,push]',
      'group, capturing: input from the group',
      'group: input from the group [email,text,push]',
      'document, capturing: change from the group [email,text,push] detail [email,text,push]',
      'group, capturing: change from the group',
      'group: change from the group [email,text,push] detail [email,text,push]',
    ]);
    expect(await checked(page)).toEqual([true, true, true]);
    expect(await selectAll(page)).toBe('checked');
    // From all: none.
    await all.click();
    expect((await dispatched(page)).filter((line) => line.startsWith('group: '))).toEqual(['group: input from the group []', 'group: change from the group [] detail []']);
    expect(await checked(page)).toEqual([false, false, false]);
    expect(await selectAll(page)).toBe('unchecked');
    // From none, by Space.
    await g(page).evaluate((el: HTMLElement) => el.focus());
    await page.keyboard.press('Space');
    expect((await dispatched(page)).filter((line) => line.startsWith('group: change'))).toEqual(['group: change from the group [email,text,push] detail [email,text,push]']);
    expect(await selectAll(page)).toBe('checked');
    // One checkbox disabled and checked, and an entry of no checkbox: both stay through both activations.
    await page.locator('#text').evaluate((el) => ((el as Box).disabled = true));
    await setValue(page, ['text', 'later']);
    expect(await selectAll(page)).toBe('unchecked');
    await all.click();
    expect(await value(page)).toEqual(['email', 'text', 'push', 'later']);
    expect(await checked(page)).toEqual([true, true, true]);
    expect(await selectAll(page)).toBe('checked');
    await all.click();
    expect(await value(page)).toEqual(['text', 'later']);
    expect(await checked(page)).toEqual([false, true, false]);
    expect((await dispatched(page)).filter((line) => line.startsWith('group: change'))).toEqual(['group: change from the group [email,text,push,later] detail [email,text,push,later]', 'group: change from the group [text,later] detail [text,later]']);
    // One disabled and unchecked: it stays unchecked, and the select-all checkbox is checked without it.
    await setValue(page, []);
    await all.click();
    expect(await value(page)).toEqual(['email', 'push']);
    expect(await checked(page)).toEqual([true, false, true]);
    expect(await selectAll(page)).toBe('checked');
  });

  test('CKG-14: in right-to-left it is mirrored as the field group is, each checkbox mirroring itself, and a row runs from the right; it follows a change of direction at once, keeping its value and its focus', async ({ page }) => {
    await mount(page, spec.fixtures.filter((f) => ['rtl', 'horizontal-rtl', 'ltr-label-rtl', 'default'].includes(f.id)));
    const sides = (id: string) =>
      host(page, id).evaluate((el) => {
        const first = el.querySelector('tanrei-checkbox')!;
        const [control, label] = [first.shadowRoot!.querySelector('.control')!.getBoundingClientRect(), first.shadowRoot!.querySelector('.label')!.getBoundingClientRect()];
        const [group, legend] = [el.getBoundingClientRect(), el.shadowRoot!.querySelector('tanrei-field-group')!.shadowRoot!.querySelector('.label')!.getBoundingClientRect()];
        return { box: control.left > label.left ? 'after its label' : 'before its label', label: Math.abs(legend.right - group.right) < 1 ? 'right' : Math.abs(legend.left - group.left) < 1 ? 'left' : 'neither', direction: getComputedStyle(el).direction };
      });
    expect(await sides('rtl')).toEqual({ box: 'after its label', label: 'right', direction: 'rtl' });
    expect(await sides('default')).toEqual({ box: 'before its label', label: 'left', direction: 'ltr' });
    expect(await host(page, 'ltr-label-rtl').evaluate((el) => (el as Group).value)).toEqual(['2.4', '5']);
    // A row runs from the right.
    const row = await Promise.all((await host(page, 'horizontal-rtl').locator(`> ${BOX}`).all()).map(box));
    near(row[0]!.y, row[1]!.y, 'one row');
    expect(row[0]!.x).toBeGreaterThan(row[1]!.x);
    expect(row[1]!.x).toBeGreaterThan(row[2]!.x);
    // A change of direction is followed at once: the value and the focus stay.
    await host(page, 'default').locator(BOX).nth(1).evaluate((el: HTMLElement) => el.focus());
    await stage(page, 'default').evaluate((el) => el.setAttribute('dir', 'rtl'));
    await frames(page);
    expect(await sides('default')).toEqual({ box: 'after its label', label: 'right', direction: 'rtl' });
    expect(await host(page, 'default').evaluate((el) => (el as Group).value)).toEqual(['email']);
    expect(await host(page, 'default').evaluate((el) => el.querySelectorAll('tanrei-checkbox')[1] === document.activeElement)).toBe(true);
  });

  test('CKG-14: at 200% text in a stage 320 wide, horizontal-many and long-label lose no text, lay nothing over another part and scroll in one direction only — every text wraps and the row becomes a column', async ({ page }) => {
    const ids = ['horizontal-many', 'long-label'];
    await page.setViewportSize({ width: 320, height: 2400 });
    await mount(page, spec.fixtures.filter((f) => ids.includes(f.id)));
    const before = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, (await box(host(page, id))).height] as const)));
    await page.addStyleTag({ content: 'html { font-size: 200%; } main { display: block !important; } .stage { box-sizing: border-box; inline-size: 320px !important; } .stage > tanrei-checkbox-group { inline-size: auto !important; }' });
    await frames(page);
    for (const id of ids) {
      expect((await box(host(page, id))).height, `${id} grows`).toBeGreaterThan(before[id]!);
      expect(await stage(page, id).evaluate((el) => el.scrollWidth <= el.clientWidth + 1), `${id}: no scrolling sideways`).toBe(true);
      const laid = await host(page, id).evaluate((el) => {
        const frame = el.shadowRoot!.querySelector('tanrei-field-group')!.shadowRoot!;
        const texts = [...frame.querySelectorAll('.label-row > .label, .supporting-text, .error-text'), ...[...el.querySelectorAll('tanrei-checkbox')].map((each) => each.shadowRoot!.querySelector('.label')!)];
        const rect = (part: Element) => part.getBoundingClientRect();
        const parts = [frame.querySelector('.label-row'), frame.querySelector('.supporting-text'), ...el.querySelectorAll('tanrei-checkbox'), frame.querySelector('.error-text')].filter((part): part is Element => !!part).map(rect);
        const over = parts.some((a, i) => parts.some((b, j) => i < j && a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5));
        return {
          clipped: texts.filter((text) => text.scrollWidth > text.clientWidth + 1 || text.scrollHeight > text.clientHeight + 1).length,
          outside: parts.filter((part) => part.left < rect(el).left - 0.5 || part.right > rect(el).right + 0.5).length,
          over,
          tops: [...el.querySelectorAll('tanrei-checkbox')].map((each) => Math.round(rect(each).top)),
        };
      });
      expect({ clipped: laid.clipped, outside: laid.outside, over: laid.over }, id).toEqual({ clipped: 0, outside: 0, over: false });
      if (id === 'horizontal-many') expect(new Set(laid.tops).size, 'the row has become a column').toBe(laid.tops.length);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'one direction only').toBe(true);
  });

  test('CKG-14: in forced colors it is drawn as the field group is — its texts in the platform\'s text color — and the error is carried by the words of errorText and by each checkbox\'s invalid state, never by a color of the group\'s', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mount(page, spec.fixtures.filter((f) => ['required-error', 'error-selected', 'disabled'].includes(f.id)));
    const system = (name: string) =>
      page.evaluate((keyword) => {
        const probe = document.createElement('div');
        probe.style.color = keyword;
        document.body.append(probe);
        const computed = getComputedStyle(probe).color;
        probe.remove();
        return computed;
      }, name);
    const [canvasText, grayText] = [await system('CanvasText'), await system('GrayText')];
    for (const id of ['required-error', 'error-selected', 'disabled']) {
      const colors = await host(page, id).evaluate((el) => [...el.shadowRoot!.querySelector('tanrei-field-group')!.shadowRoot!.querySelectorAll('.label, .supporting-text, .error-text')].map((text) => getComputedStyle(text).color));
      expect(colors.length).toBeGreaterThan(1);
      for (const color of colors) expect(color, id).toBe(id === 'disabled' ? grayText : canvasText);
    }
    await expect(host(page, 'required-error').locator('.error-text')).toHaveText('Choose at least one way to reach you.');
    expect(await host(page, 'required-error').evaluate((el) => [...el.querySelectorAll('tanrei-checkbox')].map((each) => each.shadowRoot!.querySelector('input')!.getAttribute('aria-invalid')))).toEqual(['true', 'true', 'true']);
  });

  test('FGR-15, W8: inside a field group it is one member — the field group passes it disabled, and neither its error nor its requirement; its checkboxes are the checkboxes of the field group in its own shadow root, never of a frame around the group, though they ask before that field group is drawn; disabled by the field group around it, it submits nothing', async ({ page }) => {
    const seen = warnings(page);
    await page_(page, `<form id="f"><${FRAME} id="outer" label="Contact" spacing="fields" error error-text="Something here is wrong." requirement="required" required-text="Required">${group_('name="notify" select-all-label="All of these"', BOXES.replace('id="email"', 'id="email" checked'))}</${FRAME}></form>`);
    const boxes = () => g(page).evaluate((el) => [el.shadowRoot!.querySelector('tanrei-checkbox')!, ...el.querySelectorAll('tanrei-checkbox')].map((each) => [each.shadowRoot!.querySelector('input')!.disabled, each.shadowRoot!.querySelector('input')!.getAttribute('aria-invalid'), each.shadowRoot!.querySelector('input')!.getAttribute('aria-description')].join(' | ')));
    // The outer group's error and requirement reach neither the group nor a checkbox.
    expect(await boxes()).toEqual(Array(4).fill('false |  | '));
    expect(await g(page).evaluate((el) => [(el as Group).error, (el as Group).requirement, (el as Group).disabled])).toEqual([false, 'none', false]);
    await expect(g(page).locator('.error-text')).toHaveCount(0);
    expect(await entries(page, '#f')).toEqual(['notify=email']);
    // The inner group's own error does reach them: they are its field group's controls.
    await g(page).evaluate((el) => (((el as Group).error = true), ((el as Group).errorText = 'Choose one.')));
    await settle(page);
    expect(await boxes()).toEqual(Array(4).fill('false | true | Choose one.'));
    // Disabled by the field group around it: every checkbox, the frame, and nothing is submitted.
    await page.locator('#outer').evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = true));
    await settle(page);
    expect(await boxes()).toEqual(Array(4).fill('true | true | Choose one.'));
    expect(await g(page).locator('fieldset').getAttribute('aria-disabled')).toBe('true');
    expect(await entries(page, '#f')).toEqual([]);
    expect(await g(page).evaluate((el) => (el as Group).disabled), 'its own property does not change').toBe(false);
    await page.locator('#outer').evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = false));
    await settle(page);
    expect(await boxes()).toEqual(Array(4).fill('false | true | Choose one.'));
    expect(await entries(page, '#f')).toEqual(['notify=email']);
    // A group made by script and put in with its checkboxes: they are connected before it has drawn its field group,
    // and still none becomes a control of the field group around it.
    await page.evaluate((markup) => {
      const made = document.createElement('tanrei-checkbox-group') as Group;
      made.id = 'made';
      made.label = 'Days';
      made.innerHTML = markup;
      document.getElementById('outer')!.append(made);
    }, `<${BOX} value="mon" label="Monday" checked></${BOX}><${BOX} value="tue" label="Tuesday"></${BOX}>`);
    await settle(page);
    expect(await page.locator('#made').evaluate((el) => [...el.querySelectorAll('tanrei-checkbox')].map((each) => [each.shadowRoot!.querySelector('input')!.getAttribute('aria-invalid'), each.shadowRoot!.querySelector('input')!.getAttribute('aria-description')].join(' | ')))).toEqual([' | ', ' | ']);
    await page.locator('#made').evaluate((el) => (((el as Group).error = true), ((el as Group).errorText = 'Choose a day.')));
    await settle(page);
    expect(await page.locator('#made').evaluate((el) => [...el.querySelectorAll('tanrei-checkbox')].map((each) => each.shadowRoot!.querySelector('input')!.getAttribute('aria-description')))).toEqual(['Choose a day.', 'Choose a day.']);
    // The field group around it reports nothing of a member it frames as one.
    expect(reportsOf(seen)).toEqual([]);
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { icons: true, theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, theme).toEqual([]);
    }
  });
});

test.describe('baselines', () => {
  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true });
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
