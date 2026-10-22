// Every form-associated element of the package takes the platform's word that it is disabled the same way
// (`takeFormDisabled()`): its own `disabled` attribute unset by the property leaves it enabled, drawn so, focusable and
// submitted; an ancestor `<fieldset disabled>` disables it whatever its own property says, and enables it again.
//
// What "drawn as disabled" is differs by element (a native input's `disabled`, `aria-disabled`, `data-disabled` on a
// part), so each element is read beside a twin that is never disabled by itself: the two are drawn alike exactly when
// they are in the same condition.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file: string) => fs.readFileSync(path.join(web, file), 'utf8');

const OPTIONS = '<tanrei-option value="a">Alpha</tanrei-option><tanrei-option value="b">Beta</tanrei-option>';
const RADIOS = '<tanrei-radio-button value="a" label="Alpha"></tanrei-radio-button><tanrei-radio-button value="b" label="Beta"></tanrei-radio-button>';

/** Each form-associated element, as markup that submits something: `rest` is the attributes that differ between the two. */
const SUBJECTS: Record<string, (rest: string) => string> = {
  'tanrei-text-field': (rest) => `<tanrei-text-field label="Text" value="a" ${rest}></tanrei-text-field>`,
  'tanrei-text-input': (rest) => `<tanrei-text-input label="Text" value="a" ${rest}></tanrei-text-input>`,
  'tanrei-number-field': (rest) => `<tanrei-number-field label="Number" value="3" ${rest}></tanrei-number-field>`,
  'tanrei-number-input': (rest) => `<tanrei-number-input label="Number" value="3" ${rest}></tanrei-number-input>`,
  'tanrei-color-field': (rest) => `<tanrei-color-field label="Color" value="#0f766e" ${rest}></tanrei-color-field>`,
  'tanrei-color-input': (rest) => `<tanrei-color-input label="Color" value="#0f766e" ${rest}></tanrei-color-input>`,
  'tanrei-one-time-code-input': (rest) => `<tanrei-one-time-code-input label="Code" value="12" ${rest}></tanrei-one-time-code-input>`,
  'tanrei-one-time-code-field': (rest) => `<tanrei-one-time-code-field label="Code" value="12" ${rest}></tanrei-one-time-code-field>`,
  'tanrei-chip-field': (rest) => `<tanrei-chip-field label="Recipients" remove-label="Remove {entry}" value='["a@example.com"]' ${rest}></tanrei-chip-field>`,
  'tanrei-embedded-text-input': (rest) => `<tanrei-embedded-text-input label="Text" value="a" ${rest}></tanrei-embedded-text-input>`,
  'tanrei-chat-composer': (rest) => `<tanrei-chat-composer label="Message" send-label="Send" value="a" ${rest}></tanrei-chat-composer>`,
  'tanrei-select': (rest) => `<tanrei-select label="Select" value="a" ${rest}>${OPTIONS}</tanrei-select>`,
  'tanrei-select-field': (rest) => `<tanrei-select-field label="Select" value="a" ${rest}>${OPTIONS}</tanrei-select-field>`,
  'tanrei-combobox': (rest) => `<tanrei-combobox label="Combobox" value="a" ${rest}>${OPTIONS}</tanrei-combobox>`,
  'tanrei-combobox-field': (rest) => `<tanrei-combobox-field label="Combobox" value="a" ${rest}>${OPTIONS}</tanrei-combobox-field>`,
  'tanrei-checkbox': (rest) => `<tanrei-checkbox label="Checkbox" checked ${rest}></tanrei-checkbox>`,
  'tanrei-checkbox-group': (rest) => `<tanrei-checkbox-group label="Checkbox group" ${rest}><tanrei-checkbox value="a" label="Alpha" checked></tanrei-checkbox><tanrei-checkbox value="b" label="Beta"></tanrei-checkbox></tanrei-checkbox-group>`,
  'tanrei-switch': (rest) => `<tanrei-switch label="Switch" checked ${rest}></tanrei-switch>`,
  'tanrei-slider': (rest) => `<tanrei-slider label="Slider" value="40" ${rest}></tanrei-slider>`,
  'tanrei-slider-field': (rest) => `<tanrei-slider-field label="Slider" value="40" ${rest}></tanrei-slider-field>`,
  'tanrei-radio-button': (rest) => `<tanrei-radio-button label="Radio" value="a" checked ${rest}></tanrei-radio-button>`,
  'tanrei-radio-group': (rest) => `<tanrei-radio-group label="Radio group" value="a" ${rest}>${RADIOS}</tanrei-radio-group>`,
  'tanrei-search': (rest) => `<tanrei-search label="Search" value="a" ${rest}></tanrei-search>`,
  // A Button is one of its form's controls and adds to a submission only when it is the button pressed (BTN-29,
  // BTN-31): what it submits is read from the submission its own press makes.
  'tanrei-button': (rest) => `<tanrei-button type="submit" value="a" ${rest}>Send</tanrei-button>`,
  // What a file upload submits is the `file` of its rows — a property, which no markup holds (FUP-31): the page gives it.
  'tanrei-file-upload': (rest) =>
    `<tanrei-file-upload label="Files" rows="given" remove-label="Remove" ${rest}><tanrei-button slot="trigger">Choose</tanrei-button><tanrei-file-item value="a" name="a.txt"></tanrei-file-item></tanrei-file-upload><script>for (const row of document.querySelectorAll('tanrei-file-item')) row.file = new File(['a'], 'a.txt');</script>`,
};

test('the subjects are every form-associated element of the package', () => {
  const found: string[] = [];
  const components = path.join(web, 'src/components');
  for (const name of fs.readdirSync(components)) {
    const file = path.join(components, name, `${name}.ts`);
    if (!fs.existsSync(file)) continue;
    const source = fs.readFileSync(file, 'utf8');
    if (/static (override )?(readonly )?formAssociated = true/.test(source)) found.push(`tanrei-${name}`);
  }
  expect(found.sort()).toEqual(Object.keys(SUBJECTS).sort());
});

async function mount(page: Page, tag: string) {
  const subject = SUBJECTS[tag]!;
  await page.setContent(`<!doctype html>
<html lang="en"><head><style>${read('dist/tokens.css')}</style></head>
<body><form id="f"><fieldset id="set">${subject('id="own" name="own" disabled')}${subject('id="twin" name="twin"')}</fieldset></form>
<script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`);
  await page.waitForFunction((t) => !!customElements.get(t), tag);
  await settle(page);
}

/** Every element under the form has rendered, twice (a change made by the first render is drawn), and a frame has passed. */
const settle = (page: Page) =>
  page.evaluate(async () => {
    type Updating = HTMLElement & { updateComplete?: Promise<unknown> };
    const all = [...document.querySelectorAll<Updating>('#f *')];
    for (let pass = 0; pass < 2; pass++) {
      for (const el of all) await el.updateComplete;
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    for (const el of all) await el.updateComplete;
  });

/** What is seen of one element: the platform's view, what its parts are drawn with, whether focus goes into it, and whether it is submitted. */
const look = (page: Page, id: string) =>
  page.evaluate((id) => {
    const el = document.querySelector<HTMLElement>(`#${id}`)!;
    // Its own shadow tree, those of the elements it holds (a radio group's radio buttons), and those of the elements in
    // its shadow tree (a composed element's members, its members draw).
    const drawn: string[] = [];
    const hosts = (root: Element | ShadowRoot): HTMLElement[] => [...root.querySelectorAll<HTMLElement>('*')].flatMap((host) => [host, ...(host.shadowRoot && host.localName.includes('-') ? hosts(host.shadowRoot) : [])]);
    for (const host of [el, ...hosts(el), ...(el.shadowRoot ? hosts(el.shadowRoot) : [])]) {
      for (const node of host.shadowRoot?.querySelectorAll('input:disabled, textarea:disabled, button:disabled, [aria-disabled="true"], [data-disabled], [inert]') ?? []) {
        drawn.push(`${host.localName} ${node.localName}.${node.className}`);
      }
    }
    (document.activeElement as HTMLElement | null)?.blur();
    el.focus();
    const active = document.activeElement;
    const focused = !!active && active !== document.body && (active === el || el.contains(active));
    (document.activeElement as HTMLElement | null)?.blur();
    const form = document.querySelector<HTMLFormElement>('#f')!;
    let submitted = [...new FormData(form).keys()].includes(id);
    if (el.localName === 'tanrei-button') {
      const onSubmit = (event: SubmitEvent) => {
        event.preventDefault();
        submitted = [...new FormData(form, event.submitter).keys()].includes(id);
      };
      form.addEventListener('submit', onSubmit);
      el.click();
      form.removeEventListener('submit', onSubmit);
    }
    return { attribute: el.hasAttribute('disabled'), platform: el.matches(':disabled'), drawn: drawn.sort(), focused, submitted };
  }, id);

const setDisabled = async (page: Page, selector: string, disabled: boolean) => {
  await page.evaluate(([s, d]) => ((document.querySelector(s as string) as HTMLElement & { disabled: boolean }).disabled = d as boolean), [selector, disabled] as const);
  await settle(page);
};

for (const tag of Object.keys(SUBJECTS)) {
  test(`${tag}: disabled by its attribute and enabled by its property, it is enabled, drawn so, focusable and submitted; a disabled fieldset around it disables it whatever its property says, and enables it again`, async ({ page }) => {
    await mount(page, tag);
    const enabled = await look(page, 'twin');
    expect(enabled, 'the twin, never disabled').toMatchObject({ attribute: false, platform: false, focused: true, submitted: true });

    // Disabled by its own attribute.
    const disabled = await look(page, 'own');
    expect(disabled).toMatchObject({ attribute: true, platform: true, focused: false, submitted: false });
    expect(disabled.drawn, 'drawn as disabled: not as the twin').not.toEqual(enabled.drawn);

    // The property set to false: the attribute goes, and the element is as its twin.
    await setDisabled(page, '#own', false);
    expect(await look(page, 'own'), 'enabled by the property').toEqual(enabled);

    // And back by the property, then by removing the attribute.
    await setDisabled(page, '#own', true);
    expect(await look(page, 'own'), 'disabled by the property').toEqual(disabled);
    await page.evaluate(() => document.querySelector('#own')!.removeAttribute('disabled'));
    await settle(page);
    expect(await look(page, 'own'), 'enabled by the attribute’s removal').toEqual(enabled);

    // A disabled fieldset: both are disabled, though neither says so itself.
    await setDisabled(page, '#set', true);
    const byFieldset = { ...disabled, attribute: false };
    expect(await look(page, 'own'), 'disabled by the fieldset').toEqual(byFieldset);
    expect(await look(page, 'twin'), 'the twin disabled by the fieldset').toEqual(byFieldset);
    // Whatever its own property says: true, then false again inside the disabled fieldset.
    await setDisabled(page, '#own', true);
    expect(await look(page, 'own'), 'its own property true, in the disabled fieldset').toEqual(disabled);
    await setDisabled(page, '#own', false);
    expect(await look(page, 'own'), 'its own property false, in the disabled fieldset: still disabled').toEqual(byFieldset);

    // The fieldset enabled: both are enabled.
    await setDisabled(page, '#set', false);
    expect(await look(page, 'own'), 'enabled with the fieldset').toEqual(enabled);
    expect(await look(page, 'twin'), 'the twin enabled with the fieldset').toEqual(enabled);
  });
}

// A form-associated element that is disabled while it holds focus lets go of focus when the platform's own control
// would: not within the call that disables it — where one engine takes focus from a form-associated custom element
// whose `disabled` attribute is written — but at the next frame (src/primitives/disabled-while-focused.ts).
for (const tag of Object.keys(SUBJECTS)) {
  test(`${tag}: disabled while it holds focus — by its property, by setAttribute, by toggleAttribute — it is disabled and left out of a submission at once, keeps focus for the turn and gives it up at the next frame, in every engine; enabled again before the frame, it keeps focus and its attribute was never written`, async ({ page }) => {
    for (const how of ['property', 'setAttribute', 'toggleAttribute', 'undone'] as const) {
      await mount(page, tag);
      const outcome = await page.evaluate(async (how) => {
        type Subject = HTMLElement & { disabled: boolean; updateComplete: Promise<unknown> };
        const el = document.querySelector<Subject>('#twin')!;
        const inside = () => {
          const active = document.activeElement;
          return !!active && active !== document.body && (active === el || el.contains(active));
        };
        const frames = async () => {
          for (let i = 0; i < 3; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
        };
        el.focus();
        await frames();
        if (!inside()) return 'focus() gives it no focus';
        // Focus in the element's own shadow tree, or on an element it holds (a group's first control): then the group's
        // own attribute takes no focus in any engine, and is written at once.
        const own = document.activeElement === el;
        const nowhere: string[] = [];
        window.addEventListener('focusout', (event) => !event.relatedTarget && nowhere.push((event.target as Element).localName), true);
        const written: string[] = [];
        new MutationObserver((records) => written.push(...records.map((record) => String(record.attributeName)))).observe(el, { attributes: true, attributeFilter: ['disabled'] });
        if (how === 'setAttribute') el.setAttribute('disabled', '');
        else if (how === 'toggleAttribute') el.toggleAttribute('disabled', true);
        else el.disabled = true;
        for (let pass = 0; pass < 3; pass++) await el.updateComplete;
        // Left out of a submission at once, though the platform's own word — the attribute — is a frame late.
        const submitted = [...new FormData(document.querySelector<HTMLFormElement>('#f')!).keys()].includes('twin');
        const within = { focus: inside(), nowhere: [...nowhere], disabled: el.disabled, submitted };
        if (how === 'undone') {
          el.disabled = false;
          for (let pass = 0; pass < 3; pass++) await el.updateComplete;
          await frames();
          return { within, after: { focus: inside(), nowhere: nowhere.length, attribute: el.hasAttribute('disabled'), platform: el.matches(':disabled'), written: own ? written.length : 0 } };
        }
        await frames();
        return { within, after: { focus: inside(), nowhere: nowhere.length > 0, attribute: el.hasAttribute('disabled'), platform: el.matches(':disabled') } };
      }, how);
      const within = { focus: true, nowhere: [], disabled: true, submitted: false };
      if (how === 'undone') expect(outcome, how).toEqual({ within, after: { focus: true, nowhere: 0, attribute: false, platform: false, written: 0 } });
      else expect(outcome, how).toEqual({ within, after: { focus: false, nowhere: true, attribute: true, platform: true } });
    }
  });
}
