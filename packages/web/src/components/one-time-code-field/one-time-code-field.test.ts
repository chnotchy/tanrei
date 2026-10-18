// <tanrei-one-time-code-field>, driven by specs/one-time-code-field.spec.json: OTF-1 to OTF-8, each cited by a test
// title. It is a composed element, so what a composed element is — declarations, passing, parts, events
// and the value, the form, focus, the twin, reports — is held once, for every composed element, by
// src/primitives/composed.test.ts (W13-1 to W13-8), and its members' own behaviour by their own files (a
// higher level's tests repeat no test of a member). What is here is the eight sentences, as they hold of THIS element, and the browser behaviours the element is built on.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures, requirementDrawn, resolveToken, setWords, tab, twinOf } from '../../../test/harness.js';
import { decodePng } from '../../../test/png.js';

const spec = loadSpec('one-time-code-field');
type P = Page;
const TAG = 'tanrei-one-time-code-field';
const FIELD = 'tanrei-field';
const INPUT = 'tanrei-one-time-code-input';
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > ${TAG}`);
const field = (page: P, id: string) => host(page, id).locator(FIELD);
const input = (page: P, id: string) => host(page, id).locator(INPUT);
const native = (page: P, id: string) => input(page, id).locator('input');
const fx = (id: string, props: Fixture['props'], rest: Partial<Fixture> = {}): Fixture => ({ id, props: { label: 'Verification code', ...props }, ...rest });
const mount = (page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) => mountFixtures(page, spec, { fixtures, ...options });
const focus = (element: Locator) => element.evaluate((el: HTMLElement) => el.focus());
const settle = (page: P) =>
  page.evaluate(async () => {
    const all = (root: Document | ShadowRoot | Element): Element[] => [...root.querySelectorAll('*')].flatMap((el) => [el, ...(el.shadowRoot ? all(el.shadowRoot) : [])]);
    for (let round = 0; round < 3; round++) await Promise.all(all(document).map((el) => (el as Element & { updateComplete?: Promise<unknown> }).updateComplete));
  });
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
/** Hears the four events on the fixture's element, in order, with what `event.target.value` and `detail.value` were. */
const hear = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const heard: string[] = [];
    (window as unknown as { heard: string[] }).heard = heard;
    for (const name of ['input', 'change', 'complete', 'action']) el.addEventListener(name, (event) => heard.push(`${name} ${(event.target as HTMLElement & { value: string }).value} ${(event as CustomEvent<{ value: string }>).detail.value}${event.target === el ? '' : ' (another target)'}`));
  });
const heard = (page: P) => page.evaluate(() => (window as unknown as { heard: string[] }).heard);
/** A page of the product's own, with the bundle: for what a fixture cannot hold (a form, a label, a group). */
const document_ = (body: string, head = '') => `<!doctype html>
<html lang="en" data-tanrei-theme="light"><head><meta charset="utf-8" /><style>${read('dist/tokens.css')}</style>${head}</head>
<body>${body}<script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`;
async function page_(page: P, body: string, head = '') {
  await page.setContent(document_(body, head));
  await page.waitForFunction((tag) => !!customElements.get(tag), TAG);
  await settle(page);
}
/** A page that is loaded, not written: the browser's own first load (autofocus is a matter of the load). */
async function load(page: P, body: string) {
  await page.route('http://one-time-code-field.test/**', (route) => route.fulfill({ contentType: 'text/html', body: document_(body) }));
  await page.goto('http://one-time-code-field.test/');
  await page.waitForFunction((tag) => !!customElements.get(tag), TAG);
  await settle(page);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 50)))));
}
const CODE = `<${TAG} id="code" name="code" label="Verification code" supporting-text="Enter the 6-digit code we sent to your phone." group-size="3"></${TAG}>`;
const code = (page: P) => page.locator('#code');

test.describe('one-time-code field', () => {
  test('every fixture of the spec is mounted, and each names its twin among the Field\'s fixtures', async ({ page }) => {
    await mount(page, spec.fixtures);
    for (const f of spec.fixtures) {
      await expect(host(page, f.id)).toBeVisible();
      expect(twinOf(f)?.spec.name, f.id).toBe('field');
    }
    expect(spec.fixtures.map((f) => f.id)).toEqual(['supporting', 'error', 'disabled', 'required-rtl']);
  });

  test('OTF-1: it is a Field whose one control is a One-time-code input — the two members\' own elements in its shadow root, and nothing else — and draws nothing of its own: no token, no size, no gap; the host is a block as wide as its place and the control fills the field', async ({ page }) => {
    await mount(page, [fx('code', { supportingText: 'Help', groupSize: 3, value: '123' })]);
    const made = await host(page, 'code').evaluate((el) => {
      const root = el.shadowRoot!;
      const frame = root.querySelector('tanrei-field')!;
      const control = frame.querySelector('tanrei-one-time-code-input')!;
      const box = (element: Element) => element.getBoundingClientRect();
      return {
        // R1, R7: the members' real elements, by their tags and of their registered classes — not a copy of what they draw.
        elements: [...root.querySelectorAll('*')].map((element) => element.localName),
        frame: frame instanceof customElements.get('tanrei-field')!,
        control: control instanceof customElements.get('tanrei-one-time-code-input')! && control.parentElement === frame,
        text: [...root.childNodes, ...frame.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent!.trim() !== '').length,
        parts: [frame.getAttribute('part'), control.getAttribute('part')],
        exported: [frame.getAttribute('exportparts'), control.getAttribute('exportparts')],
        // Its own sheet: the host's display and the hidden rule, and the rule every element has that starts no transition
        // while it settles (MOT-3, src/styles/motion.ts), which draws nothing. No token is read and no size, gap or color is named.
        sheet: [...root.adoptedStyleSheets].flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText.replace(/\s+/g, ' '))),
        display: getComputedStyle(el).display,
        widths: [box(el.parentElement!).width - 32, box(el).width, box(frame).width, box(control).width],
        height: [box(el).height, box(frame).height],
        delegates: root.delegatesFocus,
      };
    });
    expect(made.elements).toEqual([FIELD, INPUT]);
    expect(made).toMatchObject({ frame: true, control: true, text: 0, parts: ['field', 'one-time-code-input'], display: 'block', delegates: false });
    expect(made.exported).toEqual(['label, label-icon, requirement-label, supporting-text, error-text', 'input, cell, character, caret, separator']);
    expect(made.sheet.join(' ')).not.toContain('--');
    expect(made.sheet.every((rule) => /^:host(\(.*\))? \{ display: (block|none); \}$/.test(rule) || /^:host\(\[data-tanrei-settling\][^{]* \{ transition-property: none !important; \}$/.test(rule)), made.sheet.join(' | ')).toBe(true);
    // As wide as its place, the frame as wide as it, and the control filling the frame; as tall as its Field.
    expect(new Set(made.widths).size, `widths ${made.widths.join(', ')}`).toBe(1);
    expect(made.height[0]).toBe(made.height[1]);
    // In a place of another width it is that wide: it has no width of its own.
    await page.addStyleTag({ content: '.stage { inline-size: 520px !important; }' });
    expect((await host(page, 'code').boundingBox())!.width).toBe(520);
    expect((await field(page, 'code').boundingBox())!.width).toBe(520);
  });

  test('OTF-1: one instance is set apart by a custom property on the element — the members read it by inheritance, and the element writes none', async ({ page }) => {
    await mount(page, [fx('plain', { supportingText: 'Help' }), fx('apart', { supportingText: 'Help' })]);
    const gap = () => Promise.all(['plain', 'apart'].map((id) => field(page, id).evaluate((el) => el.shadowRoot!.querySelector('.control')!.getBoundingClientRect().top - el.shadowRoot!.querySelector('.label-row')!.getBoundingClientRect().bottom)));
    const [before] = await gap();
    expect(before).toBe(await resolveToken(page, '--tanrei-comp-field-label-gap'));
    await host(page, 'apart').evaluate((el: HTMLElement) => {
      el.style.setProperty('--tanrei-comp-field-label-gap', '23px');
      el.style.setProperty('--tanrei-comp-one-time-code-input-container-gap', '1px');
    });
    expect(await gap()).toEqual([before, 23]);
    const cellGap = (id: string) => input(page, id).evaluate((el) => {
      const cells = el.shadowRoot!.querySelectorAll('.cell');
      return cells[1]!.getBoundingClientRect().left - cells[0]!.getBoundingClientRect().right;
    });
    expect(await cellGap('apart')).toBe(1);
    expect(await cellGap('plain')).not.toBe(1);
  });

  test('OTF-1: the control is one text box, named by the label — drawn or not — and described by the shown text; invalid, required, disabled, read-only and a protected entry are exposed as the pair by hand exposes them (the labeling sentence, through Chromium\'s accessibility tree)', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'the accessibility tree is read over the DevTools protocol');
    await mount(page, [
      ...spec.fixtures,
      fx('hidden-optional', { labelHidden: true, supportingText: 'Help', requirement: 'optional', optionalText: 'Optional' }),
      fx('read-only', { readOnly: true, value: '123456' }),
      fx('masked', { mask: true, value: '12' }),
    ]);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Accessibility.enable');
    const node = async (id: string) => {
      const { result } = await cdp.send('Runtime.evaluate', { expression: `document.querySelector('[data-fixture="${id}"] > ${TAG}').shadowRoot.querySelector('${INPUT}').shadowRoot.querySelector('input')` });
      const found = (await cdp.send('Accessibility.getPartialAXTree', { objectId: result.objectId!, fetchRelatives: false })).nodes[0]!;
      return { role: found.role?.value, name: found.name?.value, description: found.description?.value, ...Object.fromEntries((found.properties ?? []).map((p) => [p.name, p.value.value])) } as Record<string, unknown>;
    };
    expect(await node('supporting')).toMatchObject({ role: 'textbox', name: 'Verification code', description: 'Enter the 6-digit code we sent to your phone.' });
    expect(await node('error')).toMatchObject({ role: 'textbox', name: 'Verification code', description: 'That code is not right. Check the message and try again.', invalid: 'true' });
    expect(await node('disabled')).toMatchObject({ name: 'Verification code', disabled: true });
    expect(await node('required-rtl')).toMatchObject({ name: 'رمز التحقق', required: true });
    expect(await node('hidden-optional')).toMatchObject({ name: 'Verification code', description: 'Help Optional' });
    expect(await node('read-only')).toMatchObject({ name: 'Verification code', readonly: true });
    expect(await native(page, 'masked').getAttribute('type')).toBe('password');
    // Nothing is exposed a second time: one text box in the whole element, and the host has no role.
    const tree = await stage(page, 'supporting').ariaSnapshot();
    expect(tree.match(/textbox/g)).toHaveLength(1);
    expect(await host(page, 'supporting').evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label')])).toEqual([null, null]);
  });

  test('OTF-2: each prop goes unchanged to the member it is from — ten to the Field, six to the One-time-code input — and the input\'s own label, error and disabled are never set: the Field\'s label names it, its error puts it in error and its disabled disables it', async ({ page }) => {
    await mount(page, [fx('all', { labelHidden: true, supportingText: 'Help', errorText: 'Wrong', error: true, disabled: true, requirement: 'required', requiredMark: 'asterisk', requiredText: 'Required', optionalText: 'Optional', value: '12AB', length: 4, type: 'alphanumeric', groupSize: 2, mask: true, readOnly: true })]);
    const given = await host(page, 'all').evaluate((el) => {
      const pick = (element: Element, names: string[]) => Object.fromEntries(names.map((name) => [name, (element as unknown as Record<string, unknown>)[name]]));
      const frame = el.shadowRoot!.querySelector('tanrei-field')!;
      const control = el.shadowRoot!.querySelector('tanrei-one-time-code-input')!;
      const inner = control.shadowRoot!.querySelector('input')!;
      return {
        frame: pick(frame, ['label', 'labelHidden', 'supportingText', 'errorText', 'error', 'disabled', 'requirement', 'requiredMark', 'requiredText', 'optionalText']),
        control: pick(control, ['value', 'length', 'type', 'groupSize', 'mask', 'readOnly']),
        own: pick(control, ['label', 'error', 'disabled', 'name']),
        attributes: [...control.attributes].map((attribute) => attribute.name).sort(),
        said: { name: inner.getAttribute('aria-label'), invalid: inner.getAttribute('aria-invalid'), disabled: inner.disabled, cellsInError: control.shadowRoot!.querySelector('.field')!.hasAttribute('data-error') },
      };
    });
    expect(given.frame).toEqual({ label: 'Verification code', labelHidden: true, supportingText: 'Help', errorText: 'Wrong', error: true, disabled: true, requirement: 'required', requiredMark: 'asterisk', requiredText: 'Required', optionalText: 'Optional' });
    expect(given.control).toEqual({ value: '12AB', length: 4, type: 'alphanumeric', groupSize: 2, mask: true, readOnly: true });
    // Said once, on the frame: the control's own three stay as they were, and it is told by the Field's connection.
    expect(given.own).toEqual({ label: '', error: false, disabled: false, name: '' });
    expect(given.attributes.filter((name) => ['label', 'error', 'disabled'].includes(name))).toEqual([]);
    expect(given.said).toEqual({ name: 'Verification code', invalid: 'true', disabled: true, cellsInError: true });
  });

  test('OTF-2: a value a member does not know is passed on as given and answered by that member, under the member\'s own sentence (FLD-22, OTC-19)', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('unknown', { requirement: 'sometimes', type: 'letters', length: 0 })]);
    await settle(page);
    expect(await field(page, 'unknown').evaluate((el) => (el as HTMLElement & { requirement: string }).requirement)).toBe('sometimes');
    expect(await input(page, 'unknown').evaluate((el) => [(el as HTMLElement & { type: string }).type, (el as HTMLElement & { length: number }).length])).toEqual(['letters', 0]);
    // The element keeps what it was given; the members answer.
    expect(await host(page, 'unknown').evaluate((el) => [(el as HTMLElement & { requirement: string }).requirement, (el as HTMLElement & { type: string }).type, (el as HTMLElement & { length: number }).length])).toEqual(['sometimes', 'letters', 0]);
    expect(await input(page, 'unknown').locator('.cell').count()).toBe(6);
    expect(seen.some((text) => text.includes(`<${FIELD}>`) && text.includes('FLD-22'))).toBe(true);
    expect(seen.filter((text) => text.includes(`<${INPUT}>`) && text.includes('OTC-19'))).toHaveLength(2);
    expect(seen.filter((text) => text.includes(`<${TAG}>`))).toEqual([]);
  });

  test('OTF-3: one value, the input\'s — typing a code reports input for each character and complete once after the last, Enter reports change and then action, all with the element as their target and its value already new; a value the product sets is shown as OTC-18 says and reports nothing', async ({ page }) => {
    await mount(page, [fx('code', { length: 4, supportingText: 'Help' })]);
    await hear(page, 'code');
    await focus(host(page, 'code'));
    await page.keyboard.type('1x23');
    expect(await host(page, 'code').evaluate((el) => (el as HTMLElement & { value: string }).value)).toBe('123');
    await page.keyboard.type('4');
    await page.keyboard.press('Enter');
    expect(await heard(page)).toEqual(['input 1 1', 'input 12 12', 'input 123 123', 'input 1234 1234', 'complete 1234 1234', 'change 1234 1234', 'action 1234 1234']);
    // The value is the member's at every moment, and the member's is the element's.
    expect(await host(page, 'code').evaluate((el) => [(el as HTMLElement & { value: string }).value, (el.shadowRoot!.querySelector('tanrei-one-time-code-input') as HTMLElement & { value: string }).value])).toEqual(['1234', '1234']);
    // Set by the product: read by OTC-18 (the first permitted characters), shown, and no event.
    await host(page, 'code').evaluate(async (el) => {
      (el as HTMLElement & { value: string }).value = '98-76 5';
      await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    });
    expect(await host(page, 'code').evaluate((el) => (el as HTMLElement & { value: string }).value)).toBe('9876');
    expect(await input(page, 'code').locator('.char').allTextContents()).toEqual(['9', '8', '7', '6']);
    expect(await heard(page)).toHaveLength(7);
    // Leaving the field after a value the product set is no change by the person.
    await host(page, 'code').evaluate((el: HTMLElement) => el.blur());
    expect(await heard(page)).toHaveLength(7);
  });

  test('OTF-4: in a form it is the one control the form meets — it takes name, submits the code alone, an empty string while it holds none and nothing while disabled, resets to the value it was first given, reports a missing value while required and empty and nothing for a code shorter than length; its members add no entry', async ({ page }) => {
    await page_(page, `<form id="form"><${TAG} id="code" name="code" label="Verification code" requirement="required" value="12"></${TAG}></form>`);
    const form = () =>
      page.evaluate(async () => {
        const el = document.getElementById('code') as HTMLElement & { updateComplete: Promise<unknown>; validity: ValidityState; value: string; form: HTMLFormElement };
        await el.updateComplete;
        const formElement = document.getElementById('form') as HTMLFormElement;
        return { entries: [...new FormData(formElement).entries()].map(([key, value]) => `${key}=${String(value)}`), controls: [...formElement.elements].map((control) => control.localName), mine: el.form === formElement, valid: el.validity.valid, missing: el.validity.valueMissing, short: el.validity.tooShort };
      });
    // Shorter than length: submitted as it is, and valid.
    expect(await form()).toEqual({ entries: ['code=12'], controls: [TAG], mine: true, valid: true, missing: false, short: false });
    await code(page).evaluate((el) => ((el as HTMLElement & { value: string }).value = ''));
    expect(await form()).toMatchObject({ entries: ['code='], valid: false, missing: true });
    await code(page).evaluate((el) => ((el as HTMLElement & { requirement: string }).requirement = 'none'));
    expect(await form()).toMatchObject({ entries: ['code='], valid: true, missing: false });
    await page.evaluate(() => (document.getElementById('form') as HTMLFormElement).reset());
    expect(await form()).toMatchObject({ entries: ['code=12'] });
    await code(page).evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = true));
    expect(await form()).toMatchObject({ entries: [] });
    await code(page).evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = false));
    expect(await form()).toMatchObject({ entries: ['code=12'] });
    // What the person types is what is submitted.
    await focus(code(page));
    await page.keyboard.type('3');
    expect(await form()).toMatchObject({ entries: ['code=123'] });
  });

  test('OTF-4: the action key submits the form the one-time-code field belongs to, by its default button, after the change and the action — and not when action was cancelled; a form it names by its form attribute from outside is its form', async ({ page }) => {
    await page_(
      page,
      `<form id="form"><button id="send" name="via" value="send">Send</button></form><${TAG} id="code" form="form" name="code" label="Verification code"></${TAG}>
       <script>window.log = []; const form = document.getElementById('form'); form.addEventListener('submit', (event) => { event.preventDefault(); window.log.push('submit ' + [...new FormData(form, event.submitter).entries()].join('|')); });
       const code = document.getElementById('code'); for (const name of ['change', 'action']) code.addEventListener(name, () => window.log.push(name));</script>`,
    );
    expect(await code(page).evaluate((el) => (el as HTMLElement & { form: HTMLFormElement | null }).form?.id)).toBe('form');
    await focus(code(page));
    await page.keyboard.type('12');
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => (window as unknown as { log: string[] }).log)).toEqual(['change', 'action', 'submit via,send|code,12']);
    await code(page).evaluate((el) => el.addEventListener('action', (event) => event.preventDefault()));
    await page.keyboard.type('3');
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => (window as unknown as { log: string[] }).log)).toEqual(['change', 'action', 'submit via,send|code,12', 'change', 'action']);
  });

  test('OTF-5: it is one stop in the focus order, its control\'s; focus given to it goes to the control, whose active cell is the first empty one; a press on the label row moves focus to the control and operates nothing, a press on the supporting row does nothing; it takes focus for no other press and draws no focus indicator of its own', async ({ page }) => {
    await page_(page, `<button id="before">Before</button><${TAG} id="code" label="Verification code" supporting-text="Enter the 6-digit code we sent to your phone." value="12"></${TAG}><button id="after">After</button>`);
    await page.evaluate(() => {
      const log: string[] = [];
      (window as unknown as { log: string[] }).log = log;
      for (const name of ['input', 'change', 'complete', 'action']) document.getElementById('code')!.addEventListener(name, () => log.push(name));
    });
    await focus(code(page));
    expect(await focusPath(page)).toEqual([`${TAG}#code`, INPUT, 'input']);
    // OTC-5: the first empty cell is active — the third — and holds the caret.
    const cells = code(page).locator('.cell');
    expect(await cells.evaluateAll((all) => all.findIndex((cell) => cell.hasAttribute('data-active')))).toBe(2);
    await expect(cells.nth(2).locator('.caret')).toHaveCount(1);
    // No indicator of its own, no tabindex: the members draw focus.
    expect(await code(page).evaluate((el) => [getComputedStyle(el).outlineStyle, el.getAttribute('tabindex'), el.shadowRoot!.querySelector('tanrei-field')!.shadowRoot!.querySelector('.frame')!.hasAttribute('data-focused')])).toEqual(['none', null, true]);
    // One stop.
    await page.locator('#before').focus();
    await tab(page);
    expect((await focusPath(page))[0]).toBe(`${TAG}#code`);
    await tab(page);
    expect(await focusPath(page)).toEqual(['button#after']);
    // A press on the label row: focus to the control, nothing operated.
    const label = code(page).locator('[part~="label"]').first();
    const labelBox = (await label.boundingBox())!;
    await page.mouse.click(labelBox.x + 6, labelBox.y + labelBox.height / 2);
    expect(await focusPath(page)).toEqual([`${TAG}#code`, INPUT, 'input']);
    expect(await code(page).evaluate((el) => (el as HTMLElement & { value: string }).value)).toBe('12');
    // A press on the supporting row: focus stays where it is — here in the control — and from elsewhere none arrives.
    const help = code(page).locator('[part~="supporting-text"]').first();
    const helpBox = (await help.boundingBox())!;
    await page.locator('#after').focus();
    await page.mouse.click(helpBox.x + 6, helpBox.y + helpBox.height / 2);
    expect((await focusPath(page))[0]).not.toBe(`${TAG}#code`);
    // No press, key or focus reported an event of the field's.
    expect(await page.evaluate(() => (window as unknown as { log: string[] }).log)).toEqual([]);
  });

  test('OTF-5: a click that arrives on the element itself — what a page\'s own label for it sends — moves focus to the control, exactly once; the browser focuses nothing itself, the host not being focusable', async ({ page }) => {
    await page_(page, `<label id="label" for="code">Your code</label>${CODE}`);
    await page.evaluate(() => {
      const log: string[] = [];
      (window as unknown as { log: string[] }).log = log;
      const el = document.getElementById('code')!;
      el.addEventListener('click', (event) => log.push(`click ${event.composedPath()[0] === el ? 'on the host' : 'inside'} ${event.isTrusted ? 'trusted' : 'made'}`));
      el.addEventListener('focusin', () => log.push('focusin'));
      el.addEventListener('focusout', () => log.push('focusout'));
      el.shadowRoot!.querySelector('tanrei-one-time-code-input')!.shadowRoot!.querySelector('input')!.addEventListener('focus', () => log.push('focus on the native input'));
    });
    await page.locator('#label').click();
    expect(await page.evaluate(() => (window as unknown as { log: string[] }).log)).toEqual(['focus on the native input', 'focusin', 'click on the host trusted']);
    expect(await focusPath(page)).toEqual([`${TAG}#code`, INPUT, 'input']);
    // A click from inside the shadow root is not such a click: pressing the help still moves no focus.
    await code(page).evaluate((el: HTMLElement) => el.blur());
    const help = (await code(page).locator('[part~="supporting-text"]').first().boundingBox())!;
    await page.mouse.click(help.x + 6, help.y + help.height / 2);
    expect(await focusPath(page)).toEqual(['body']);
  });

  test('OTF-5: autofocus on the element gives its control focus when it first renders — on the page\'s first load and when it is inserted later — and takes it from nothing that already has it', async ({ page }) => {
    await load(page, `<${TAG} id="code" autofocus label="Verification code"></${TAG}>`);
    expect(await focusPath(page), 'first load').toEqual([`${TAG}#code`, INPUT, 'input']);
    await load(page, '<p>Nothing to focus</p>');
    await page.evaluate(async (tag) => {
      const el = document.createElement(tag);
      el.id = 'code';
      el.setAttribute('autofocus', '');
      el.setAttribute('label', 'Verification code');
      document.body.append(el);
      await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    }, TAG);
    await page.waitForFunction(() => document.activeElement?.id === 'code');
    expect(await focusPath(page), 'inserted later').toEqual([`${TAG}#code`, INPUT, 'input']);
    await load(page, `<input id="first" autofocus /><${TAG} id="code" autofocus label="Verification code"></${TAG}>`);
    expect(await focusPath(page), 'after an input that has focus').toEqual(['input#first']);
  });

  test('OTF-5: while disabled no press on it does anything, in any engine — on the label, on a cell or on the help: no focus arrives and no click is heard on it — whether it is disabled itself or by a fieldset', async ({ page }) => {
    await page_(page, `<form><${TAG} id="own" disabled name="a" label="Own" supporting-text="Help" value="12"></${TAG}><fieldset disabled><${TAG} id="set" name="b" label="Set" supporting-text="Help" value="34"></${TAG}></fieldset></form>`);
    await page.evaluate(() => {
      const log: string[] = [];
      (window as unknown as { log: string[] }).log = log;
      for (const id of ['own', 'set']) for (const type of ['click', 'focusin', 'input', 'change']) document.getElementById(id)!.addEventListener(type, () => log.push(`${id} ${type}`));
    });
    for (const id of ['own', 'set']) {
      const element = page.locator(`#${id}`);
      expect(await element.evaluate((el) => [el.matches(':disabled'), (el.shadowRoot!.querySelector('tanrei-field') as HTMLElement & { disabled: boolean }).disabled, el.shadowRoot!.querySelector('tanrei-one-time-code-input')!.shadowRoot!.querySelector('input')!.disabled])).toEqual([true, true, true]);
      for (const part of ['label', 'cell', 'supporting-text']) {
        const box = (await element.locator(`[part~="${part}"]`).first().boundingBox())!;
        await page.mouse.click(box.x + Math.min(8, box.width / 2), box.y + box.height / 2);
      }
      await element.evaluate((el: HTMLElement) => el.focus());
    }
    expect(await focusPath(page)).toEqual(['body']);
    expect(await page.evaluate(() => (window as unknown as { log: string[] }).log)).toEqual([]);
    expect(await page.evaluate(() => [...new FormData(document.querySelector('form')!).entries()])).toEqual([]);
  });

  test('OTF-6: it holds exactly one control and takes no other from the product — a child without the label glyph\'s slot is drawn nowhere and framed by nothing — so no case of FLD-15 or FLD-23 arises in it; the label glyph is passed to the Field only while there is one', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('code', { supportingText: 'Help' }, { content: '<tanrei-slider id="second" label="Second"></tanrei-slider><input id="third" />' })], { icons: true });
    await settle(page);
    const drawn = await host(page, 'code').evaluate((el) => ({
      slots: [...el.shadowRoot!.querySelectorAll('slot')].map((slot) => slot.name),
      controls: [...el.shadowRoot!.querySelector('tanrei-field')!.children].map((child) => child.localName),
      second: [document.getElementById('second')!.getBoundingClientRect().width, document.getElementById('third')!.getBoundingClientRect().width],
      framed: [document.getElementById('third')!.getAttribute('aria-label'), document.getElementById('third')!.getAttribute('aria-description')],
    }));
    expect(drawn).toEqual({ slots: [], controls: [INPUT], second: [0, 0], framed: [null, null] });
    expect(seen.filter((text) => text.includes('FLD-15') || text.includes('FLD-23'))).toEqual([]);
    // The one place for a child: the Field's label glyph, passed on while it is there and not a moment longer (W9).
    const passed = () => host(page, 'code').evaluate(async (el) => {
      await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      const frame = el.shadowRoot!.querySelector('tanrei-field')!;
      await (frame as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      const slot = frame.querySelector('slot');
      return { passing: slot ? [slot.name, slot.slot] : null, glyph: (frame.shadowRoot!.querySelector('[part~="label-icon"]')?.getBoundingClientRect().width ?? 0) > 0 };
    });
    expect(await passed()).toEqual({ passing: null, glyph: false });
    await host(page, 'code').evaluate((el) => {
      const glyph = document.createElement('span');
      glyph.slot = 'label-icon';
      glyph.textContent = 'lock';
      el.append(glyph);
    });
    await expect.poll(passed).toEqual({ passing: ['label-icon', 'label-icon'], glyph: true });
    await host(page, 'code').evaluate((el) => el.querySelector('[slot="label-icon"]')!.remove());
    await expect.poll(passed).toEqual({ passing: null, glyph: false });
  });

  test('OTF-6: with a label glyph it is still the picture of the pair by hand with that glyph — the passed slot draws what the Field\'s own slot draws', async ({ page }) => {
    const glyph = '<span slot="label-icon">lock</span>';
    await mount(page, [fx('code', { supportingText: 'Help', groupSize: 3, value: '123' }, { content: glyph })], { icons: true });
    await page.evaluate((markup) => {
      const twin = document.createElement('div');
      twin.className = 'stage';
      twin.id = 'twin';
      twin.innerHTML = `<tanrei-field label="Verification code" supporting-text="Help" style="display: block; inline-size: 280px">${markup}<tanrei-one-time-code-input group-size="3" value="123"></tanrei-one-time-code-input></tanrei-field>`;
      document.querySelector('main')!.append(twin);
    }, glyph);
    await settle(page);
    await page.evaluate(() => document.fonts.ready);
    const alone = async (shown: Locator, other: Locator) => {
      await other.evaluate((el: HTMLElement) => (el.style.display = 'none'));
      const picture = decodePng(await shown.screenshot({ animations: 'disabled' }));
      await other.evaluate((el: HTMLElement) => el.style.removeProperty('display'));
      return picture;
    };
    const [a, b] = [await alone(stage(page, 'code'), page.locator('#twin')), await alone(page.locator('#twin'), stage(page, 'code'))];
    expect([a.width, a.height]).toEqual([b.width, b.height]);
    let different = 0;
    for (let index = 0; index < a.data.length; index++) if (a.data[index] !== b.data[index]) different++;
    expect(different).toBe(0);
    // And the glyph is drawn: the label starts after it.
    expect(await field(page, 'code').evaluate((el) => el.shadowRoot!.querySelector('[part~="label"]')!.getBoundingClientRect().left - el.getBoundingClientRect().left)).toBeGreaterThan(8);
  });

  test('OTF-6: placed in a Field it is drawn as it is and reported as a field placed in a Field (FLD-15); placed in a field group it follows the group\'s disabled through its Field, and takes nothing else from the group (FGR-14)', async ({ page }) => {
    const seen = warnings(page);
    await page_(
      page,
      `<tanrei-field id="outer" label="Outer" supporting-text="Outer help" error error-text="Outer error">${CODE}</tanrei-field>
       <tanrei-field-group id="group" label="Sign in" error error-text="Group error"><${TAG} id="grouped" name="grouped" label="Verification code" supporting-text="Help" value="12"></${TAG}></tanrei-field-group>`,
    );
    expect(seen.filter((text) => text.includes('FLD-15'))).toHaveLength(1);
    expect(seen.find((text) => text.includes('FLD-15'))).toContain(`<${TAG}>`);
    // Drawn as it is: its own label names it, and the outer field's error is not its error.
    const inner = (id: string) =>
      page.locator(`#${id}`).evaluate((el) => {
        const control = el.shadowRoot!.querySelector('tanrei-one-time-code-input')!.shadowRoot!.querySelector('input')!;
        return { name: control.getAttribute('aria-label'), description: control.getAttribute('aria-description'), invalid: control.getAttribute('aria-invalid'), disabled: control.disabled };
      });
    expect(await inner('code')).toEqual({ name: 'Verification code', description: 'Enter the 6-digit code we sent to your phone.', invalid: null, disabled: false });
    expect(await inner('grouped')).toEqual({ name: 'Verification code', description: 'Help', invalid: null, disabled: false });
    await page.locator('#group').evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = true));
    await settle(page);
    expect(await inner('grouped')).toMatchObject({ disabled: true });
    expect(await page.locator('#grouped').evaluate((el) => [(el as HTMLElement & { disabled: boolean }).disabled, el.shadowRoot!.querySelector('tanrei-field')!.shadowRoot!.querySelector('.frame')!.hasAttribute('data-disabled')]), 'its own disabled does not change; its Field is drawn disabled').toEqual([false, true]);
    await page.locator('#group').evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = false));
    await settle(page);
    expect(await inner('grouped')).toMatchObject({ disabled: false });
  });

  test('OTF-6: a Field defined after the one-time-code field inside it still hears it — the element passes the frame\'s call to ask again on to its members (W8)', async ({ page }) => {
    await page_(page, `<late-frame id="late"><${TAG} id="code" label="Verification code"></${TAG}></late-frame>`);
    // A frame of the product's own that speaks the Field's protocol, defined late: it asks every descendant to ask again.
    const answered = await page.evaluate(async () => {
      const asked: string[] = [];
      const key = Symbol.for('tanrei.field-control');
      class LateFrame extends HTMLElement {
        connectedCallback() {
          this.addEventListener('tanrei-field-connect', (event) => {
            const detail = (event as CustomEvent<{ control: Element; takes: string; update: (state: unknown) => void }>).detail;
            asked.push(`${detail.control.localName} takes ${detail.takes}`);
            event.stopPropagation();
            detail.update({ label: '', description: '', invalid: false, required: false, requiredText: '', disabled: true });
          });
          for (const element of this.querySelectorAll('*')) (element as unknown as Record<symbol, { ask?: () => void } | undefined>)[key]?.ask?.();
        }
      }
      customElements.define('late-frame', LateFrame);
      const el = document.getElementById('code') as HTMLElement & { updateComplete: Promise<unknown> };
      await el.updateComplete;
      const frame = el.shadowRoot!.querySelector('tanrei-field') as HTMLElement & { updateComplete: Promise<unknown> };
      await frame.updateComplete;
      await el.updateComplete;
      return { asked, disabled: el.shadowRoot!.querySelector('tanrei-one-time-code-input')!.shadowRoot!.querySelector('input')!.disabled };
    });
    // The frame member's own question left the element; the control's, answered inside, did not.
    expect(answered.asked).toEqual([`${FIELD} takes disabled`]);
    await expect.poll(() => code(page).evaluate((el) => el.shadowRoot!.querySelector('tanrei-one-time-code-input')!.shadowRoot!.querySelector('input')!.disabled)).toBe(true);
  });

  test('OTF-7: it has no words of its own — the required and the optional text are the Field\'s props, read by the Field: the instance\'s, else the product\'s words of the same name, else none (FLD-24)', async ({ page }) => {
    await mount(page, [fx('given', { requirement: 'required', requiredText: 'Needed' }), fx('none', { requirement: 'required' }), fx('optional', { requirement: 'optional' })]);
    expect(await requirementDrawn(field(page, 'given'))).toMatchObject({ tag: 'Needed', asterisk: false });
    // Tanrei has no word: the asterisk stands in the tag's place, and the control is still required.
    expect(await requirementDrawn(field(page, 'none'))).toMatchObject({ tag: null, asterisk: true });
    expect(await native(page, 'none').getAttribute('aria-required')).toBe('true');
    expect(await requirementDrawn(field(page, 'optional'))).toMatchObject({ tag: null });
    await setWords(page, { requiredText: 'Required', optionalText: 'Optional' });
    await settle(page);
    expect(await requirementDrawn(field(page, 'none'))).toMatchObject({ tag: 'Required', asterisk: false });
    expect(await requirementDrawn(field(page, 'optional'))).toMatchObject({ tag: 'Optional' });
    expect(await native(page, 'optional').getAttribute('aria-description')).toBe('Optional');
    expect(await requirementDrawn(field(page, 'given'))).toMatchObject({ tag: 'Needed' });
    // The element holds no word and reads no key: its own text props stay as they were given.
    expect(await host(page, 'none').evaluate((el) => [(el as HTMLElement & { requiredText: string }).requiredText, (el as HTMLElement & { optionalText: string }).optionalText])).toEqual(['', '']);
    const source = read('src/components/one-time-code-field/one-time-code-field.ts');
    expect(source).not.toContain('WordsController');
    expect(source).not.toMatch(/words\.(get|missing)/);
  });

  test('OTF-8: in a right-to-left place the frame is mirrored by the Field and the cells stay a left-to-right run at the start edge by the input, as in the pair by hand — the element has no direction of its own', async ({ page }) => {
    await mount(page, [fx('ltr', { supportingText: 'Help', value: '12', length: 4 }), fx('rtl', { supportingText: 'Help', value: '12', length: 4 }, { direction: 'rtl' })]);
    await page.addStyleTag({ content: '.stage { inline-size: 400px !important; }' });
    const laid = (id: string) =>
      host(page, id).evaluate((el) => {
        const box = el.getBoundingClientRect();
        const label = el.shadowRoot!.querySelector('tanrei-field')!.shadowRoot!.querySelector('[part~="label"]')!.getBoundingClientRect();
        const cells = [...el.shadowRoot!.querySelector('tanrei-one-time-code-input')!.shadowRoot!.querySelectorAll('.cell')].map((cell) => cell.getBoundingClientRect());
        return { dir: el.getAttribute('dir'), labelAtStart: [Math.round(label.left - box.left), Math.round(box.right - label.right)], firstCellLeft: Math.round(cells[0]!.left - box.left), lastCellRight: Math.round(box.right - cells.at(-1)!.right), leftToRight: cells.every((cell, index) => index === 0 || cell.left > cells[index - 1]!.left) };
      });
    const [ltr, rtl] = [await laid('ltr'), await laid('rtl')];
    expect(ltr.dir).toBeNull();
    expect(rtl.dir).toBeNull();
    expect(ltr.labelAtStart[0]).toBe(0);
    expect(rtl.labelAtStart[1]).toBe(0);
    // OTC-27, OTC-28: a left-to-right run in both, at the start edge — the left in one, the right in the other.
    expect([ltr.leftToRight, rtl.leftToRight]).toEqual([true, true]);
    expect(ltr.firstCellLeft).toBe(0);
    expect(rtl.lastCellRight).toBe(0);
    expect(rtl.firstCellLeft).toBeGreaterThan(0);
  });

  test('OTF-8: with the text enlarged to 200 % in a place 320 wide it is never wider than its layout gives it — nothing is cut and nothing scrolls sideways — and it is as tall as its members make it', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 1200 });
    await mount(page, spec.fixtures);
    await page.addStyleTag({ content: `html { font-size: 200%; } main { display: block !important; } .stage { box-sizing: border-box !important; inline-size: 320px !important; }` });
    await settle(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    for (const f of spec.fixtures) {
      const sizes = await host(page, f.id).evaluate((el) => {
        const frame = el.shadowRoot!.querySelector('tanrei-field')!;
        const control = el.shadowRoot!.querySelector('tanrei-one-time-code-input')!;
        return { width: el.getBoundingClientRect().width, frame: frame.getBoundingClientRect().width, control: control.getBoundingClientRect().width, scrolls: el.scrollWidth > el.clientWidth + 1, height: el.getBoundingClientRect().height, frameHeight: frame.getBoundingClientRect().height };
      });
      expect(sizes.width, f.id).toBe(288);
      expect(sizes.frame, f.id).toBe(288);
      expect(sizes.control, f.id).toBeLessThanOrEqual(288);
      expect(sizes.scrolls, f.id).toBe(false);
      expect(sizes.height, f.id).toBe(sizes.frameHeight);
    }
  });

  test('OTF-8: under a person\'s own forced colors it is still the picture of the pair by hand — each member\'s own answer, and no color of the element\'s', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'forced colors cannot be asked for in this engine');
    await page.emulateMedia({ forcedColors: 'active' });
    await mount(page, [spec.fixtures.find((f) => f.id === 'error')!], { twins: true });
    await settle(page);
    const [ours, theirs] = [stage(page, 'error'), page.locator('[data-twin-of="error"]')];
    const alone = async (shown: Locator, other: Locator) => {
      await other.evaluate((el: HTMLElement) => (el.style.display = 'none'));
      const picture = decodePng(await shown.screenshot({ animations: 'disabled' }));
      await other.evaluate((el: HTMLElement) => el.style.removeProperty('display'));
      return picture;
    };
    const [a, b] = [await alone(ours, theirs), await alone(theirs, ours)];
    expect([a.width, a.height]).toEqual([b.width, b.height]);
    let different = 0;
    for (let index = 0; index < a.data.length; index++) if (a.data[index] !== b.data[index]) different++;
    expect(different).toBe(0);
    expect(await host(page, 'error').evaluate((el) => getComputedStyle(el).forcedColorAdjust)).toBe('auto');
  });

  test('no axe violations, light and dark: every fixture, and a field in each condition', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mount(page, [...spec.fixtures, fx('optional', { requirement: 'optional', optionalText: 'Optional', supportingText: 'Help' }), fx('read-only', { readOnly: true, value: '123456' }), fx('masked', { mask: true, value: '12' }), fx('label-hidden', { labelHidden: true })], { theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, theme).toEqual([]);
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true });
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
