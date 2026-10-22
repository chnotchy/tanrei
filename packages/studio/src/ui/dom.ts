// Small DOM helpers shared by every part of the Studio's page half.
import type { Studio } from '../data';
import type { StudioStrings } from '../strings';

export type Json = Record<string, any>;
export type Layer = Json;
export type View = Json; // studio.preview(layer) with a model: the last VALID preview
export type Contrast = 'standard' | 'medium' | 'high';
export type Level = 'essentials' | 'groups' | 'tokens' | 'source';

/** What every part of the page gets: the core, the strings, the current layer, and the one way to change it. */
export interface Ctx {
  studio: Studio;
  t: StudioStrings;
  root: HTMLElement;
  layer(): Layer;
  /** The last valid preview: what the preview pane shows. */
  view(): View;
  /** The latest preview, valid or not: what Export shows. */
  latest(): Json;
  /**
   * Replace the layer. `rebuild` redraws the controls (an edit that changes which controls exist). `preview` shows the
   * layer and does not save it yet: the person is still typing, stepping or dragging, and the commit follows.
   */
  commit(next: Layer, options?: { rebuild?: boolean; preview?: boolean }): void;
  /** Redraw the controls of the current level. */
  rebuild(): void;
  /** Called after every update while the controls stay: refresh what you show. */
  onUpdate(refresh: () => void): void;
  announce(message: string): void;
  setLevel(level: Level, focus?: { token?: string; panel?: string }): void;
  locked: { id: boolean };
  uid(prefix: string): string;
  /** Text typed at "Source" that does not parse: kept, never saved, never lost (../draft.js). */
  draft: { readonly text: string | null; readonly pending: boolean; open(layerText: string): string; input(text: string, layerId?: string, notObject?: string): { layer: Layer } | { error: string; line?: number }; discard(): void };
  /** The draft appeared, changed or went away: redraw what shows it. */
  draftChanged(): void;
}

type Child = Node | string | null | undefined | false;
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Json = {}, ...children: (Child | Child[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'text') el.textContent = value;
    else if (key === 'value') (el as any).value = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) if (child) el.append(child);
  return el;
}

/**
 * A sentence of the dictionary with elements standing in it. The dictionary's sentences are functions of strings, so
 * that each language orders its own words; `say` is given `at`, which takes an element and hands back a mark to
 * pass as that string, and the sentence comes back as the text and the elements in the order the language put them:
 * `rich((at) => t.labelled(t.editor.writes, at(h('b', { text: json }))))`.
 */
export function rich(say: (at: (node: Node) => string) => string): (Node | string)[] {
  const nodes: Node[] = [];
  // One private-use character for each element: no dictionary holds one, and no value the Studio shows does.
  const text = say((node) => String.fromCharCode(0xe000 + nodes.push(node) - 1));
  return text.split(/([\uE000-\uF8FF])/).filter(Boolean).map((part) => nodes[part.charCodeAt(0) - 0xe000] ?? part);
}
/** A string with one `{place}`, and the element that stands there. */
export function placed(text: string, place: string, node: Node): (Node | string)[] {
  const at = text.indexOf(`{${place}}`);
  return at === -1 ? [text] : [text.slice(0, at), node, text.slice(at + place.length + 2)];
}
/**
 * A run inside a sentence that is left-to-right whatever the sentence is: a token id, a number with its
 * unit or sign, a ratio, a file name or path, JSON. Isolated, so it reorders nothing beside it.
 */
export const ltr = (text: string) => h('bdi', { dir: 'ltr', text });
/** A name the product or the person gave (a palette, a family, a layer): isolated, in the direction of its own letters. */
export const isolated = (text: string) => h('bdi', { text });
/**
 * A field for the person's own prose (a name, a reason, a description): laid out and aligned by the direction of what
 * it holds. `dir="auto"` only while it holds a letter — an empty field, or one of digits alone, keeps
 * the layout's direction, and so does its placeholder. Call it again after writing the value from script.
 */
const DIRECTED = new WeakSet<Element>();
export function ownDirection<T extends HTMLInputElement | HTMLTextAreaElement>(field: T): T {
  const sync = () => (/\p{L}/u.test(field.value) ? field.setAttribute('dir', 'auto') : field.removeAttribute('dir'));
  if (!DIRECTED.has(field)) {
    DIRECTED.add(field);
    field.addEventListener('input', sync);
  }
  sync();
  return field;
}

export const trim = (n: number) => String(+n.toFixed(4));
/** `tanrei.sys.space.space100` → `sys.space.space100`; a layer's own tokens keep their namespace. */
export const short = (id: string, ns: string) => (id.startsWith(`${ns}.`) ? id.slice(ns.length + 1) : id);

/** A resolved token value, as a person reads it. A choice of kind (`token.enum`) reads as its NAME. */
export function format(type: string, value: any, token?: Json): string {
  if (value === undefined || value === null) return '—';
  if (token?.enum?.values) return token.enum.values[value] ?? `${value} (?)`;
  if (type === 'color') return value.alpha !== undefined && value.alpha !== 1 ? `${value.hex} · ${Math.round(value.alpha * 100)}%` : value.hex;
  if (type === 'typography') return `${trim(value.fontSize.value)}${value.fontSize.unit} / ${trim(value.lineHeight)} · ${value.fontWeight}`;
  if (type === 'shadow') return value.length === 1 && !value[0].blur.value && !value[0].spread.value ? 'none' : `${value.length} layer${value.length > 1 ? 's' : ''}`;
  if (type === 'cubicBezier') return `cubic-bezier(${value.join(', ')})`;
  if (type === 'fontFamily') return value.join(', ');
  if (typeof value === 'object' && 'value' in value) return `${trim(value.value)}${value.unit}`;
  return typeof value === 'number' ? trim(value) : String(value);
}

export const cssColor = (color: Json | undefined) => (color ? (color.alpha !== undefined && color.alpha !== 1 ? `rgb(${color.components.map((c: number) => Math.round(c * 255)).join(' ')} / ${color.alpha})` : color.hex) : 'transparent');

/**
 * A panel: a region named by its heading. It is still the Studio's own box and not a `<tanrei-card>`: inside a card
 * axe cannot judge the contrast of any text (the card lays an element over its content), and the Studio's contrast
 * checks would pass by seeing nothing.
 */
export function panel(ctx: Ctx, { title, code, help, key, actions }: { title: string; code?: string; help?: string | (Node | string)[]; key?: string; actions?: Child[] }, ...body: (Child | Child[])[]) {
  const id = ctx.uid('ts-h');
  return h(
    'section',
    { class: 'ts-panel', 'aria-labelledby': id, 'data-panel': key },
    h('header', {}, h('h2', { id, class: 'ts-eyebrow', text: title }), actions?.length ? h('span', { class: 'ts-row-actions' }, ...actions) : code ? h('code', { text: code }) : null),
    help ? h('p', { class: 'ts-help' }, help) : null,
    ...body,
  );
}

/**
 * Panels drawn as they come near the window, in their order: a level of many panels costs its first frame what that
 * frame shows (Groups holds some three thousand elements, a window of it a few hundred). Each panel stands as an empty
 * holder, a window high, until it is drawn:
 *
 * 1. before the first paint, every panel from the top down to the bottom of the window — each measured where it is
 *    once the panels above it have drawn their components, so the window is never shown with a holder in it;
 * 2. then each panel the person scrolls to within half a window (an `IntersectionObserver`);
 * 3. and the rest one at a time while the page is idle, top down, so that the Tab key, the browser's find and a screen
 *    reader reach every panel soon after, wherever the person has scrolled.
 *
 * A panel whose `make` gives nothing leaves no holder. `stop()` leaves what is not drawn yet: the controls are being
 * drawn again. `done` says when every panel is drawn (or the drawing stopped).
 */
export function drawnNear(makers: (() => HTMLElement | null)[]): { holders: HTMLElement[]; done: Promise<void>; stop(): void } {
  const holders: HTMLElement[] = makers.map(() => h('div', { class: 'ts-panel-pending', 'data-panel-pending': true }));
  const pending = new Map(holders.map((holder, index) => [holder, makers[index]!]));
  let finish = () => {};
  const done = new Promise<void>((resolve) => (finish = resolve));
  let stopped = false;
  let frame = 0;
  let idle: number | undefined;
  // (A browser with no idle callbacks gets a timer, a frame apart, in their place.)
  const idles = typeof requestIdleCallback === 'function';
  const near = new IntersectionObserver((entries) => entries.forEach((entry) => entry.isIntersecting && draw(entry.target as HTMLElement)), { rootMargin: '50% 0px' });
  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    if (idle !== undefined) (idles ? cancelIdleCallback(idle) : clearTimeout(idle));
    near.disconnect();
    pending.clear();
    finish();
  };
  /** Draws one panel in its holder's place; what it holds is drawn by its components a microtask later. */
  function draw(holder: HTMLElement): HTMLElement | null {
    const make = pending.get(holder);
    if (!make || stopped) return null;
    // A holder taken out of the page belongs to controls drawn again since: nothing of that drawing is drawn any more.
    if (!holder.isConnected) return (stop(), null);
    pending.delete(holder);
    near.unobserve(holder);
    const panel = make();
    if (panel) holder.replaceWith(panel);
    else holder.remove();
    if (!pending.size) stop();
    return panel;
  }
  /** The components' first drawing (Lit draws a component in a microtask after it is connected): its height is real then. */
  const drawnInside = (panel: HTMLElement | null) => Promise.all([...(panel?.querySelectorAll('*') ?? [])].map((el) => (el as Element & { updateComplete?: Promise<unknown> }).updateComplete));
  const schedule = (next: () => void) => (idle = idles ? requestIdleCallback(next, { timeout: 500 }) : window.setTimeout(next, 16));
  const rest = () => {
    const holder = holders.find((each) => pending.has(each));
    if (!holder || stopped) return;
    draw(holder);
    if (!stopped) schedule(rest);
  };
  // (An animation frame runs before its paint, and the microtasks it waits for run before the paint as well.)
  frame = requestAnimationFrame(async () => {
    for (const holder of holders) {
      if (stopped) return;
      if (!pending.has(holder)) continue;
      if (holder.getBoundingClientRect().top >= innerHeight) break;
      await drawnInside(draw(holder));
    }
    if (stopped) return;
    for (const holder of pending.keys()) near.observe(holder);
    schedule(rest);
  });
  if (!makers.length) stop();
  return { holders, done, stop };
}

/**
 * Text the person writes (a name, a reason, a description): `<tanrei-text-field>` — a Field around a text input, a
 * block as wide as its place — which lays the text out by its own direction. `oninput` is told of
 * every keystroke. Its error is its own: set `error` and `errorText`.
 */
export function textField({ label, labelHidden = false, value = '', placeholder, multiline = false, rows, attrs = {}, oninput }: { label: string; labelHidden?: boolean; value?: string; placeholder?: string; multiline?: boolean; rows?: number; attrs?: Json; oninput?: (value: string) => void }) {
  const field = h('tanrei-text-field', { label, 'label-hidden': labelHidden, placeholder, multiline, 'min-rows': rows, autocomplete: 'off', ...attrs });
  field.value = value;
  if (oninput) field.addEventListener('input', () => oninput(field.value));
  return field;
}
/**
 * Code the person writes (JSON, a token pattern): `<tanrei-text-field type="code">` — one left-to-right row in the code
 * face in every layout, which the browser does not correct or spell-check (TXF-53 to TXF-55) — on one line, or on
 * `rows` lines and as many more as the code has, up to `maxRows`. A text field is complete by itself: its label, drawn
 * or not, is its own, and so is what is wrong with the code — set `error` and `errorText`. `oninput` is told of every
 * keystroke. (Code that needs neither a drawn label nor an error of its own is `codeInput`.)
 */
export function codeField({ label, labelHidden = false, value = '', placeholder, rows, maxRows = 16, attrs = {}, oninput }: { label: string; labelHidden?: boolean; value?: string; placeholder?: string; rows?: number; maxRows?: number; attrs?: Json; oninput?: (value: string) => void }) {
  const many = rows !== undefined;
  const field = h('tanrei-text-field', { type: 'code', label, 'label-hidden': labelHidden, placeholder, multiline: many, 'min-rows': rows, 'max-rows': many ? maxRows : undefined, ...attrs });
  field.value = value;
  if (oninput) field.addEventListener('input', () => oninput(field.value));
  return field;
}
/**
 * The box alone, where no row of a Field would be drawn — no label, no help, no error of its own: `<tanrei-text-input>`,
 * named by its own `label`, which a stacked input reads and never draws. One element where a text
 * field is three. It fills its place; the place gives it a width. `oninput` is told of every keystroke.
 */
export function textInput({ label, type, value = '', placeholder, attrs = {}, oninput }: { label: string; type?: 'text' | 'search' | 'code'; value?: string; placeholder?: string; attrs?: Json; oninput?: (value: string) => void }, ...children: Child[]) {
  const input = h('tanrei-text-input', { type, label, placeholder, autocomplete: type === 'text' || type === undefined ? 'off' : undefined, ...attrs }, ...children);
  input.value = value;
  if (oninput) input.addEventListener('input', () => oninput(input.value));
  return input;
}
/** Code on one line that nothing is drawn around (a token pattern in a row of its own): the text input, in the code face. */
export const codeInput = (options: { label: string; value?: string; placeholder?: string; attrs?: Json; oninput?: (value: string) => void }) => textInput({ ...options, type: 'code' });
/**
 * What a button says when its drawn word is not enough to tell it from its neighbours («Reset» in every row): the
 * word is drawn, and the whole name is the button's `label` (BTN-16) — the name alone, in place of the drawn word.
 * The name opens with the word, so what is seen is what is said first, and a person who says the word is heard.
 */
const whole = (text: string, name?: string) => (name && name !== text ? name : '');
/** Writes a button's word again (and its whole name, where it has one): the button itself stays, with the keyboard's place. */
export const rename = (el: HTMLElement, text: string, name?: string) => {
  el.replaceChildren(text);
  (el as HTMLElement & { label: string }).label = whole(text, name);
};
const pressable = (variant: string, text: string, onclick: (() => void) | null, { 'aria-label': name, ...attrs }: Json) => h('tanrei-button', { variant, size: 'small', onclick, label: whole(text, name) || undefined, ...attrs }, text);
/**
 * An action that is one of a row's quiet ones, or stands in a sentence («Reset», «Remove», «Back to the tree»): a text
 * `<tanrei-button>`. `aria-label` in `attrs` is its whole name, given to the button as its `label`.
 */
export const linkButton = (text: string, onclick: () => void, attrs: Json = {}) => pressable('text', text, onclick, { class: 'ts-link', ...attrs });
/**
 * An action: an outlined `<tanrei-button>`; `primary` is the one filled action of its row. With `type: 'submit'` it
 * sends the form it stands in (BTN-27) and needs no `onclick`: pass `null`.
 */
export const button = (text: string, onclick: (() => void) | null, { primary = false, ...attrs }: Json = {}) => pressable(primary ? 'filled' : 'outlined', text, onclick, attrs);
/**
 * A short state that is pressed to go where it is told in full (the count of contrast findings, the draft at Source):
 * a small `<tanrei-chip>` with the glyph of its state. Write its `label` to say something else.
 */
export function stateChip(onclick: () => void, attrs: Json = {}) {
  const glyph = h('span', { slot: 'icon', 'aria-hidden': 'true', translate: 'no' });
  const chip = h('tanrei-chip', { size: 'small', onclick, ...attrs }, glyph);
  return Object.assign(chip, { say: (label: string, icon: string) => ((chip.label = label), (glyph.textContent = icon)) });
}

/**
 * A list that scrolls in a box of its own once it is long (a build can report a hundred warnings). While it scrolls
 * it is a focus stop with a name — as the layer's JSON is — so that the keyboard reads past its first lines; while
 * all of it is in view it is no stop at all. The name stays either way: it says what the list is.
 */
export function scrollingList(name: string, attrs: Json = {}, items: Child[] = []) {
  const list = h('ul', { ...attrs, class: `ts-warnings ts-warnings-long${attrs.class ? ` ${attrs.class}` : ''}`, 'aria-label': name }, items);
  // (Down its rows, or along a line that cannot be broken: a rule's JSON on a phone.)
  const fit = () => (list.scrollHeight > list.clientHeight + 1 || list.scrollWidth > list.clientWidth + 1 ? list.setAttribute('tabindex', '0') : list.removeAttribute('tabindex'));
  // Its box changes when it is first shown (a fold opens) and when the pane is resized; its rows, when the build says something else.
  new ResizeObserver(fit).observe(list);
  new MutationObserver(fit).observe(list, { childList: true });
  return list;
}

/**
 * What opens and closes: `<tanrei-accordion>` around the Studio's own `<details>` (the web's accordion draws the
 * product's elements in place: the browser's disclosure stays whole). Dense rows, on the panel's surface.
 */
export const folds = (attrs: Json = {}, ...items: (Child | Child[])[]) => h('tanrei-accordion', { density: 'compact', ...attrs }, ...items);
/**
 * One item of `folds`: a `<details>` whose summary holds its label, a line under it (`supporting`) and a short value
 * before the chevron (`trailing`). The label is one element. `disabled`: a row that cannot be opened here.
 */
export function fold({ label, supporting, trailing, open, disabled, attrs = {} }: { label: string | HTMLElement; supporting?: Child | Child[]; trailing?: Child | Child[]; open?: boolean; disabled?: boolean; attrs?: Json }, ...content: (Child | Child[])[]) {
  const summary = h('summary', disabled ? { 'aria-disabled': 'true', tabindex: '-1' } : {}, typeof label === 'string' ? h('span', { text: label }) : label, supporting ? h('small', { 'data-supporting-text': true }, supporting) : null, trailing ? h('span', { 'data-trailing-text': true }, trailing) : null);
  return h('details', { open, ...attrs }, summary, ...content);
}

/**
 * One of a few named values that the layer stores: a horizontal `<tanrei-radio-group>`. Its name is not drawn — the
 * panel or the row it stands in says it — and stays its accessible name. Set its `value` to show a value chosen elsewhere.
 */
export function choice<T extends string>({ label, options, value, onchange, attrs = {} }: { label: string; options: { value: T; label: string }[]; value: T; onchange: (value: T) => void; attrs?: Json }) {
  const group = h('tanrei-radio-group', { label, 'label-hidden': true, orientation: 'horizontal', ...attrs }, options.map((option) => h('tanrei-radio-button', { value: option.value, label: option.label, 'data-value': option.value })));
  group.value = value;
  group.addEventListener('change', (event) => event.target === group && onchange(group.value as T));
  return group;
}

/**
 * Which of a few views is shown: a row of `<tanrei-tabs>` (the arrow keys choose, one stop of the Tab key). The view
 * itself is the caller's, drawn where it stands. Set its `value` to show a view chosen elsewhere.
 */
export function views<T extends string>({ label, options, value, onchange, variant = 'secondary', attrs = {} }: { label: string; options: { value: T; label: string }[]; value: T; onchange: (value: T) => void; variant?: 'primary' | 'secondary'; attrs?: Json }) {
  const tabs = h('tanrei-tabs', { label, variant, ...attrs }, options.map((option) => h('tanrei-tab', { value: option.value, label: option.label, 'data-value': option.value })));
  tabs.value = value;
  tabs.addEventListener('change', (event) => event.target === tabs && onchange(tabs.value as T));
  return tabs;
}

/**
 * One of a few forms, each drawn under the row that chooses it: `<tanrei-tabs>` with a `<tanrei-tab-panel>` for every
 * tab (the row gives the roles, the selected state, one stop of the Tab key, the arrow keys with Home and End, and the
 * panel named by its tab). Only the chosen panel holds anything: `show(key, content)` chooses a tab and writes its
 * panel; `select` is told when the person chooses another. The row stays while its panels are written again, so the
 * keyboard keeps its place; `keys` says which tabs it was made for.
 */
export function tabbed({ label, tabs, select }: { label: string; tabs: { key: string; label: string }[]; select: (key: string) => void }) {
  const panels = new Map(tabs.map((tab) => [tab.key, h('tanrei-tab-panel', { value: tab.key })]));
  const el = h('tanrei-tabs', { label, variant: 'secondary', class: 'ts-tabs' }, tabs.map((tab) => h('tanrei-tab', { value: tab.key, label: tab.label, 'data-tab': tab.key })), [...panels.values()]);
  el.addEventListener('change', (event) => event.target === el && el.value !== null && select(el.value));
  return {
    el,
    keys: tabs.map((tab) => tab.key).join('\n'),
    show(key: string, content: (Node | null)[]) {
      el.value = key;
      for (const [each, panel] of panels) panel.replaceChildren(...(each === key ? [h('div', { class: 'ts-tabpanel ts-stack' }, ...content)] : []));
    },
  };
}
