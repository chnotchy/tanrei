// Value widgets: the few inputs every editor is assembled from. One widget edits one JSON value of the layer
// (a number with a unit, a reference, a rule…); `get()` returns that value, or undefined while it is incomplete.
import { argbToColor, hexToArgb } from '@tanrei/token-engine';
import { HEX_PATTERN, MIN_REASON } from '../core.js';
import { GENERIC_CHOICES, SUGGESTED_FAMILIES, composeStack, cssFontFamily, familyName, inferredGeneric, parseStack, systemKeywordFor } from '../fonts.js';
import { type Ctx, type Json, choice, codeField, format, h, isolated, rich, short, trim } from './dom';
import { fontAvailable } from './fonts';

export interface Widget<T = any> {
  el: HTMLElement;
  get(): T | undefined;
}
/** `live`: the person is still at it (a keystroke, a step, a drag in the picker) — shown, not saved yet. */
export type Change = (live?: boolean) => void;
const ref = (id: string) => `{${id}}`;
const unref = (value: unknown) => (typeof value === 'string' && /^\{[^}]+\}$/.test(value) ? value.slice(1, -1) : undefined);

/** How long after a key that stepped a control is released the steps are one adjustment: a step within it continues it. */
export const KEY_STEPS_REST = 300;

/**
 * The steps a person makes with keys on one control — Up and Down Arrow, Page Up and Page Down, every repeat of a held
 * key, presses that follow one another — are one adjustment, as a drag is: each step is shown as it is made, and the
 * adjustment is committed when the keys rest (`KEY_STEPS_REST` after the last key is released, with no step since),
 * at Enter, or when focus leaves the control. A number input and a slider each commit every step a key makes (a
 * `change` under each `keydown`), and committing computes the layer — the whole build: twenty presses of Up Arrow on a
 * palette's hue were twenty long tasks, one under each key.
 *
 * `keyed()` says whether the `change` being heard was made by a key: it is asked in the control's own `change`
 * listener, which runs inside the `keydown` that stepped (the capture listener on the host runs before the control
 * steps, the bubbling one after). `hold()` marks the step uncommitted; `commit` makes the commit.
 */
function keySteps(control: HTMLElement, commit: () => void) {
  let keyed = false;
  let held = false;
  let timer: number | undefined;
  const flush = () => {
    window.clearTimeout(timer);
    if (!held) return;
    held = false;
    commit();
  };
  control.addEventListener('keydown', (event) => {
    window.clearTimeout(timer);
    // Enter commits what is typed (the control's own `change`): never a step.
    keyed = event.key !== 'Enter';
  }, true);
  control.addEventListener('keydown', (event) => {
    keyed = false;
    if (event.key === 'Enter') flush();
  });
  control.addEventListener('keyup', () => {
    window.clearTimeout(timer);
    if (held) timer = window.setTimeout(flush, KEY_STEPS_REST);
  });
  control.addEventListener('focusout', flush);
  return {
    keyed: () => keyed,
    hold: () => void (held = true),
    /** A `change` that is a commit of its own (a text typed, a drag let go): the held steps are in it. */
    taken: () => ((held = false), window.clearTimeout(timer)),
  };
}

/**
 * A number: `<tanrei-number-field>` with its unit as the suffix. `input` is the live value (a keystroke, a step),
 * `change` the committed one, held within `min` and `max` by the field. `range` puts a `<tanrei-slider>` before it,
 * each one's `input` written to the other: a drag is shown as it goes and written when the press ends. A step made
 * with a key, on either, is shown as it is made and written when the keys rest (`keySteps`).
 */
export function numberWidget(ctx: Ctx, { label, labelHidden = true, rangeLabel = label, value, min, max, step = 'any', unit = '', range = false, digits = 4, placeholder, attrs = {}, rangeAttrs = {}, onchange }: { label: string; labelHidden?: boolean; rangeLabel?: string; value: number | undefined; min?: number; max?: number; step?: number | 'any'; unit?: string; range?: boolean; digits?: number; placeholder?: string; attrs?: Json; rangeAttrs?: Json; onchange: Change }): Widget<number> & { number: HTMLElementTagNameMap['tanrei-number-field']; slider: HTMLElementTagNameMap['tanrei-slider'] | null; set(value: number | undefined): void; sync(value: number): void } {
  const { words } = ctx.t;
  let current = value;
  const within = (n: number) => (min === undefined || n >= min) && (max === undefined || n <= max);
  const number = h('tanrei-number-field', { label, 'label-hidden': labelHidden, align: 'end', min, max, step: step === 'any' ? undefined : step, 'suffix-text': unit || undefined, placeholder, 'no-steppers': true, 'max-fraction-digits': digits, 'invalid-text': words.invalidNumber, ...attrs });
  number.value = value === undefined ? null : +trim(value);
  // The slider is named in words (its own label is never drawn: the row's title stands beside it).
  const slider = range ? h('tanrei-slider', { label: rangeLabel, min, max, step: step === 'any' ? 0 : step, ...rangeAttrs }) : null;
  const commit = () => onchange();
  if (slider) {
    slider.value = value ?? min ?? 0;
    const sliderKeys = keySteps(slider, commit);
    slider.addEventListener('input', () => ((current = +trim(slider.value)), (number.value = current), onchange(true)));
    slider.addEventListener('change', () => {
      current = +trim(slider.value);
      number.value = current;
      // A key's step was shown by its `input`; it is written when the keys rest.
      if (sliderKeys.keyed()) return sliderKeys.hold();
      sliderKeys.taken();
      onchange();
    });
  }
  const keys = keySteps(number, commit);
  number.addEventListener('input', (event) => {
    const typed = (event as unknown as CustomEvent<{ value: number | null }>).detail.value;
    current = typed ?? undefined;
    // A number outside the limits is not written while it is typed: the field brings it within them at the commit.
    if (typed !== null && !within(typed)) return;
    if (slider && typed !== null) slider.value = typed;
    onchange(true);
  });
  number.addEventListener('change', () => {
    current = number.value ?? undefined;
    if (slider && current !== undefined) slider.value = current;
    // A key's step was shown by its `input`; it is written when the keys rest.
    if (keys.keyed()) return keys.hold();
    keys.taken();
    onchange();
  });
  return {
    el: range ? h('div', { class: 'ts-edit-control' }, slider, number) : number,
    number,
    slider,
    get: () => (current === undefined || !within(current) ? undefined : current),
    set(next) {
      current = next;
      number.value = next === undefined ? null : +trim(next);
      if (slider && next !== undefined) slider.value = next;
    },
    /** A value that changed elsewhere (a reset, another level, a linked dial): shown, never under the person's hands. */
    sync(next) {
      const held = document.activeElement;
      if (held !== number && held !== slider) current = next;
      if (held !== number) number.value = +trim(next);
      if (slider && held !== slider) slider.value = next;
    },
  };
}

/**
 * One value of a short, closed list, as a field of a form: `<tanrei-select-field>` — a Field around a select, its
 * label above the box. (A select whose label stands elsewhere is the bare `<tanrei-select>`, as the bar's language
 * select is.) An option's value may be empty ("none").
 */
export function selectWidget(ctx: Ctx, { label, options, value, attrs = {}, onchange }: { label: string; options: { value: string; label: string; supportingText?: string }[]; value?: string; attrs?: Json; onchange: Change }) {
  const select = h('tanrei-select-field', { label, ...attrs }, options.map((option) => h('tanrei-option', { value: option.value, label: option.label, 'supporting-text': option.supportingText })));
  select.value = value ?? options[0]?.value ?? '';
  select.addEventListener('change', () => onchange());
  return {
    el: select,
    get: () => select.value,
    /** Other options (the list a choice elsewhere decides), and the value among them. */
    setOptions(next: { value: string; label: string }[], chosen?: string) {
      select.replaceChildren(...next.map((option) => h('tanrei-option', { value: option.value, label: option.label })));
      select.value = chosen ?? next[0]?.value ?? '';
    },
  };
}

/** One of many, found by typing: `<tanrei-combobox-field>` over the options — a Field around a combobox, so that it has its label. `get()` is the chosen value, or undefined. */
export function comboWidget(ctx: Ctx, { label, labelHidden = false, options, value, placeholder, clearable = false, attrs = {}, onchange }: { label: string; labelHidden?: boolean; options: { value: string; label: string; supportingText?: string }[]; value?: string; placeholder?: string; clearable?: boolean; attrs?: Json; onchange: Change }): Widget<string> {
  const make = (option: { value: string; label: string; supportingText?: string }) => h('tanrei-option', { value: option.value, label: option.label, 'supporting-text': option.supportingText });
  // Every option at once, however many (every token a token may point at: more than a thousand): the combobox draws
  // only the rows near where its list is scrolled to, and none while it is closed.
  const box = h('tanrei-combobox-field', { label, 'label-hidden': labelHidden, placeholder, clearable, ...attrs }, options.map(make));
  box.value = value ?? '';
  box.addEventListener('change', () => onchange());
  return { el: box, get: () => box.value || undefined };
}

/** Pick a token by id, found by typing; each option shows the resolved value. Returns a `{reference}`. */
export function tokenSelect(ctx: Ctx, { label, labelHidden = false, ids, value, onchange, allowEmpty, attrs = {} }: { label: string; labelHidden?: boolean; ids: string[]; value?: string; onchange: Change; allowEmpty?: string; attrs?: Json }): Widget<string> {
  const tokens = ctx.view().model.tokens;
  const current = unref(value) ?? value;
  const options = [...new Set(current && !ids.includes(current) ? [current, ...ids] : ids)];
  const box = comboWidget(ctx, { label, labelHidden, value: current, placeholder: allowEmpty, clearable: allowEmpty !== undefined, attrs: { 'data-token-select': true, ...attrs }, options: options.map((id) => ({ value: id, label: short(id, ctx.studio.namespace), supportingText: tokens[id] ? format(tokens[id].type, tokens[id].value, tokens[id]) : undefined })), onchange });
  return { el: box.el, get: () => (box.get() ? ref(box.get()!) : undefined) };
}

/** A mandatory reason or rationale: a required text field, in error once what was typed is too short to count. */
export function reasonWidget(ctx: Ctx, { label, value = '', placeholder, hint, onchange }: { label: string; value?: string; placeholder?: string; hint: string; onchange: Change }): Widget<string> {
  // The dictionary's label says "(required)" in words; the field says it with its own mark.
  const field = h('tanrei-text-field', { label: label.replace(/\s*[（(][^）)]*[）)]\s*$/, ''), required: true, placeholder, 'supporting-text': hint, 'error-text': hint, autocomplete: 'off', 'data-reason': true });
  field.value = value;
  const enough = () => field.value.trim().length >= MIN_REASON;
  let touched = value.length > 0;
  const sync = () => (field.error = touched && !enough());
  field.addEventListener('input', () => ((touched = true), sync(), onchange(true)));
  field.addEventListener('change', () => (sync(), onchange()));
  sync();
  return { el: field, get: () => (enough() ? field.value.trim() : undefined) };
}

const dtcgColor = (hex: string) => argbToColor(hexToArgb(hex.toLowerCase()));
/**
 * One colour: `<tanrei-color-field picker>`. `get()` is its value — `#` and six digits — or undefined while there is
 * none; the field reports a text that is not a colour when it is committed, never while it is typed.
 */
export function colorWidget(ctx: Ctx, { label, labelHidden = false, value, attrs = {}, onchange }: { label: string; labelHidden?: boolean; value?: string; attrs?: Json; onchange: Change }): Widget<string> & { set(value: string): void } {
  const { words } = ctx.t;
  const field = h('tanrei-color-field', { label, 'label-hidden': labelHidden, picker: true, 'picker-label': ctx.t.labelled(words.pickColor, label), 'invalid-text': words.invalidColor, ...attrs });
  field.value = HEX_PATTERN.test(value ?? '') ? value!.toLowerCase() : '';
  field.addEventListener('input', () => onchange(true));
  field.addEventListener('change', () => onchange());
  return { el: field, get: () => field.value || undefined, set: (next) => void (field.value = next) };
}

/** "not installed here": said plainly, next to the control, whenever a family cannot be drawn in this browser. */
export function availabilityNote(ctx: Ctx, attrs: Json = {}) {
  const el = h('p', { class: 'ts-font-note', role: 'status', hidden: true, ...attrs });
  let asked = 0;
  return {
    el,
    /** `family` = the one the preview should be drawing with; empty = nothing to say. */
    check(family: string | undefined, onresult?: (available: boolean) => void) {
      const turn = ++asked;
      if (!family) return void (el.hidden = true);
      fontAvailable(family).then((available) => {
        if (turn !== asked) return;
        el.hidden = available;
        el.replaceChildren(...(available ? [] : rich((at) => ctx.t.fonts.missing(at(h('b', {}, isolated(family)))))));
        onresult?.(available);
      });
    },
  };
}

/**
 * A font stack as an ordered list: add, remove and reorder named families, choose the generic fallback, and put the
 * platform's own font first. `get()` is the DTCG `fontFamily` value; what was read and not touched is written back
 * unchanged (../fonts.js).
 */
export function stackWidget(ctx: Ctx, { label, value, kind = 'text', onchange }: { label: string; value: string[]; kind?: 'text' | 'mono'; onchange: Change }): Widget<string[]> & { set(value: string[]): void } {
  const { t } = ctx;
  let model = parseStack(value);
  // The families are a reorderable List (LST-31): the order is the Studio's data, so the list asks (`move`) and the
  // Studio answers — it reorders the stack and draws it. The handle with its menu of moves, dragging, the keyboard's
  // lift, where focus stands after a move or a removal, and what is announced are the list's; the words are the
  // Studio's, given once (ui.ts).
  const list = h('tanrei-list', { class: 'ts-stack-list', reorderable: true, dividers: true, label: t.named(label, t.fonts.families), 'data-stack-list': true });
  const empty = h('p', { class: 'ts-stack-empty', 'data-stack-empty': true, hidden: true });
  const note = availabilityNote(ctx, { 'data-font-note': true });
  const sample = h('p', { class: 'ts-stack-sample', 'aria-hidden': 'true', 'data-stack-sample': true, text: t.fonts.sample });
  const css = h('code', { class: 'ts-stack-css', 'data-stack-css': true });
  // A family is added by name: a combobox whose options are the families people reach for first, and which takes any
  // other name as it is typed. It adds at the commit (an option chosen, Enter, or leaving the field) and is emptied.
  // A combobox field with its label hidden: the row says what it is, and what is wrong with a name is drawn under it
  // (`errorText`, below), which is a Field's row — a bare combobox has none.
  const input = h('tanrei-combobox-field', { label: t.named(label, t.fonts.add), 'label-hidden': true, 'allow-custom-value': true, placeholder: t.fonts.addPlaceholder, 'data-stack-input': true });
  const suggestions = h('tanrei-tag-group', { spacing: 'chips', label: t.fonts.suggestions, 'data-stack-suggestions': true });
  // The switch says the keyword it writes after its label: a left-to-right run of its own in every language.
  const platform = h('tanrei-switch', { 'data-stack-system': true });
  const generics = () => [...new Set([...GENERIC_CHOICES, ...(model.generic ? [model.generic.toLowerCase()] : [])])];
  // The generic fallback is one of CSS's few names: a radio group, kept while the stack is drawn again.
  const generic = choice<string>({ label: t.named(label, t.fonts.generic), attrs: { 'data-stack-generic': true }, options: [], value: '', onchange: (name) => ((model = { ...model, generic: name }), changed()) });

  const changed = () => (draw(), onchange());
  list.addEventListener('move', (event) => {
    if (event.target !== list) return;
    const { from, to } = (event as CustomEvent<{ from: number; to: number }>).detail;
    // A move may cross several places (the menu's start and end, the keyboard, a drag): the family is taken out and put back at `to`.
    const families = [...model.families];
    const [moved] = families.splice(from, 1);
    if (moved === undefined) return;
    families.splice(to, 0, moved);
    model = { ...model, families };
    changed();
  });
  /** One family: an item named by it, its name drawn in its own face, with the button that removes it at its end. */
  function row(family: string) {
    const missing = h('span', { class: 'ts-stack-missing', 'data-stack-missing': true, hidden: true, text: t.fonts.missingShort });
    const item = h('tanrei-list-item', { label: family, 'data-family': family });
    item.append(
      h('span', { class: 'ts-stack-row' },
        h('span', { class: 'ts-stack-text' }, h('span', { class: 'ts-stack-family', text: family }), missing),
        h('tanrei-button', { variant: 'text', label: t.labelled(t.fonts.remove, family), 'data-act': 'remove', onclick: () => {
          // The item is found where it stands now: it may have been moved since it was drawn.
          const index = [...list.children].indexOf(item);
          model = { ...model, families: model.families.filter((_, i) => i !== index) };
          changed();
          // The list puts focus on the handle of the item that took this one's place (LST-46); with no item left it is
          // the Studio's, and goes to the field that adds one.
          if (!model.families.length) input.focus();
        } }, h('span', { slot: 'icon', text: 'close' })),
      ),
    );
    fontAvailable(family).then((available) => (missing.hidden = available));
    return item;
  }
  function add(raw: string) {
    const result = familyName(raw, model.families) as { name?: string; problem?: string };
    // What is wrong with the name is the field's own error: drawn under it, and read with it.
    input.errorText = result.problem && result.problem !== 'empty' ? t.fonts.problems[result.problem] : '';
    input.error = Boolean(input.errorText);
    if (!result.name) return;
    model = { ...model, families: [...model.families, result.name] };
    input.value = '';
    changed();
    ctx.announce(t.fonts.added(result.name));
  }

  function draw() {
    const fallback = inferredGeneric(model);
    // The rows are kept by the family they hold and put in the stack's order: a row that stays is the same element,
    // so the list sees which one moved, and nothing is drawn again under a press.
    model.families.forEach((family, index) => {
      const item = ([...list.children] as HTMLElement[]).slice(index).find((each) => each.dataset.family === family) ?? row(family);
      if (list.children[index] !== item) list.insertBefore(item, list.children[index] ?? null);
      item.style.setProperty('--ts-stack-face', cssFontFamily([family, fallback]));
    });
    while (list.children.length > model.families.length) list.lastElementChild!.remove();
    list.hidden = !model.families.length;
    empty.hidden = !list.hidden;
    empty.textContent = model.system ? t.fonts.onlyPlatform : t.fonts.empty;
    const pool = (SUGGESTED_FAMILIES[kind] as string[]).filter((family) => !model.families.some((own) => own.toLowerCase() === family.toLowerCase()));
    // The options are kept by what they offer: one that is taken leaves alone, so an open list keeps its place.
    for (const option of [...input.children] as HTMLElement[]) if (!pool.includes(option.dataset.option!)) option.remove();
    pool.forEach((family, index) => {
      const at = input.children[index] as HTMLElement | undefined;
      if (at?.dataset.option === family) return;
      input.insertBefore(input.querySelector(`[data-option="${CSS.escape(family)}"]`) ?? h('tanrei-option', { value: family, label: family, 'data-option': family }), at ?? null);
    });
    // Chips are kept by what they suggest: one that is taken leaves alone, and the tag group moves focus to the one
    // after it (TGR-9) — a row written again whole would leave the keyboard's place to chance.
    const wanted = [...pool, ...(model.system ? [] : ['system'])];
    for (const chip of [...suggestions.children] as HTMLElement[]) if (!wanted.includes(chip.dataset.suggest!)) chip.remove();
    wanted.forEach((family, index) => {
      const at = suggestions.children[index] as HTMLElement | undefined;
      if (at?.dataset.suggest === family) return;
      const chip = h('tanrei-chip', { size: 'small', label: family === 'system' ? t.fonts.system : family, 'data-suggest': family, onclick: () => (family === 'system' ? ((model = { ...model, system: true }), changed(), platform.focus()) : add(family)) });
      suggestions.insertBefore(suggestions.querySelector(`[data-suggest="${CSS.escape(family)}"]`) ?? chip, at ?? null);
    });
    platform.checked = model.system;
    platform.label = `${t.fonts.platform} \u2066${(model.keywords.length ? model.keywords : [systemKeywordFor(fallback)]).join(', ')}\u2069`;
    const names = generics();
    if ([...generic.children].map((option) => (option as HTMLElement).dataset.value).join() !== names.join()) generic.replaceChildren(...names.map((name) => h('tanrei-radio-button', { value: name, label: name, 'data-value': name })));
    generic.value = fallback;
    const stack = composeStack(model);
    sample.style.fontFamily = cssFontFamily(stack);
    css.textContent = cssFontFamily(stack);
    // Honesty about what the sample and the preview really show: the first NAMED family, unless the platform's font comes first.
    note.check(model.system ? undefined : model.families[0]);
  }

  input.addEventListener('change', () => input.value && add(input.value));
  input.addEventListener('input', () => (input.error = false));
  platform.addEventListener('change', () => ((model = { ...model, system: platform.checked }), changed()));
  const el = h(
    'div',
    { class: 'ts-stack ts-stack-editor', 'data-stack': true },
    list,
    empty,
    note.el,
    input,
    suggestions,
    h('div', { class: 'ts-stack-options' }, h('div', { class: 'ts-field' }, h('span', { text: t.fonts.generic }), generic), platform),
    sample,
    css,
  );
  draw();
  return {
    el,
    get: () => (composeStack(model).length ? composeStack(model) : undefined),
    set(next) {
      if (JSON.stringify(next) === JSON.stringify(composeStack(model))) return;
      model = parseStack(next);
      draw();
    },
  };
}

/** A choice of kind (`dev.tanrei.enum`): people pick a NAME; `get()` is the index the layer stores. */
export function choiceWidget(ctx: Ctx, { label, values, value, onchange }: { label: string; values: string[]; value: number | undefined; onchange: Change }): Widget<number> {
  let index = typeof value === 'number' && values[value] ? value : 0;
  const group = h('tanrei-radio-group', { label, 'label-hidden': true, orientation: 'horizontal', 'data-choice': true }, values.map((name) => h('tanrei-radio-button', { value: name, label: name, 'data-value': name })));
  group.value = values[index];
  group.addEventListener('change', () => ((index = values.indexOf(group.value)), onchange()));
  return { el: group, get: () => index };
}

/** A literal of a token type: what a pin's `$value` holds. `token` lets a choice of kind be picked by name. */
export function literalWidget(ctx: Ctx, { type, value, token, onchange }: { type: string; value: any; token?: Json; onchange: Change }): Widget {
  const { t } = ctx;
  if (token?.enum?.values?.length) return choiceWidget(ctx, { label: t.editor.value, values: token.enum.values, value, onchange });
  if (type === 'fontFamily') {
    const stack = (Array.isArray(value) ? value : value ? [value] : []) as string[];
    // The icon font is a family name, not running text: no generic fallback is forced on it.
    return stackWidget(ctx, { label: t.editor.value, value: stack, kind: token?.id?.includes('.typeface.mono') ? 'mono' : 'text', onchange });
  }
  if (type === 'dimension' || type === 'duration') {
    const unit = value?.unit ?? (type === 'duration' ? 'ms' : 'px');
    const number = numberWidget(ctx, { label: t.editor.value, labelHidden: false, value: value?.value, step: type === 'duration' ? 1 : 0.25, unit, onchange });
    return { el: number.el, get: () => (number.get() === undefined ? undefined : { value: number.get(), unit }) };
  }
  if (type === 'number' || type === 'fontWeight') return numberWidget(ctx, { label: t.editor.value, labelHidden: false, value: typeof value === 'number' ? value : undefined, step: type === 'fontWeight' ? 100 : 0.01, onchange });
  if (type === 'color') {
    const color = colorWidget(ctx, { label: t.editor.value, value: value?.hex, onchange });
    return { el: color.el, get: () => (color.get() ? dtcgColor(color.get()!) : undefined) };
  }
  if (type === 'typography') {
    // Pin only the fields that are filled in; the others keep following their rules.
    const now = (name: string) => (value?.[name] === undefined ? undefined : trim(typeof value[name] === 'object' ? value[name].value : value[name]));
    const fields: [string, Widget<number>][] = [
      ['fontSize', numberWidget(ctx, { label: 'fontSize', labelHidden: false, value: undefined, placeholder: now('fontSize'), step: 0.25, unit: 'px', onchange })],
      ['lineHeight', numberWidget(ctx, { label: 'lineHeight', labelHidden: false, value: undefined, placeholder: now('lineHeight'), step: 0.01, onchange })],
      ['fontWeight', numberWidget(ctx, { label: 'fontWeight', labelHidden: false, value: undefined, placeholder: now('fontWeight'), step: 100, onchange })],
      ['letterSpacing', numberWidget(ctx, { label: 'letterSpacing', labelHidden: false, value: undefined, placeholder: now('letterSpacing'), step: 0.01, unit: 'px', onchange })],
    ];
    return {
      el: h('tanrei-field-group', { label: t.editor.value, 'label-hidden': true, spacing: 'fields', class: 'ts-grid-2' }, fields.map(([, widget]) => widget.el)),
      get: () => {
        const pinned = fields.filter(([, widget]) => widget.get() !== undefined).map(([name, widget]) => [name, name === 'fontSize' || name === 'letterSpacing' ? { value: widget.get(), unit: 'px' } : widget.get()]);
        return pinned.length ? Object.fromEntries(pinned) : undefined;
      },
    };
  }
  return jsonWidget({ label: t.editor.value, value, rows: 5, onchange });
}

/** Anything else, as JSON — with the parse error next to it. */
export function jsonWidget({ label, value, rows = 4, onchange }: { label: string; value: unknown; rows?: number; onchange: Change }): Widget {
  let parsed: unknown = value;
  // JSON, in a text field that holds code: left to right in the code face in every layout. Its label
  // names it, undrawn, and what does not parse is its own error.
  const el = codeField({
    label,
    labelHidden: true,
    value: value === undefined ? '' : JSON.stringify(value, null, 2),
    rows,
    oninput: (text) => {
      try {
        parsed = JSON.parse(text);
        said('');
      } catch (error) {
        parsed = undefined;
        said((error as Error).message);
      }
      onchange();
    },
  });
  const said = (message: string) => ((el.errorText = message), (el.error = Boolean(message)));
  return { el, get: () => parsed };
}

/**
 * `mul`: a coefficient on a dial (or on another token), optionally raised to the type-contrast dial, and its three
 * optional terms: `times` (a number token the product is multiplied by, a density), `round` (the step it lands on) and
 * `min` (a floor applied after rounding). Each is kept as it was written, shown, and can be set or cleared.
 */
export function mulWidget(ctx: Ctx, { type, rule, onchange }: { type: string; rule?: Json; onchange: Change }): Widget<Json> {
  const { t, studio } = ctx;
  const tokens = Object.values(ctx.view().model.tokens) as Json[];
  const unitType = type === 'typography' ? 'dimension' : type;
  const own = (kind: string) => tokens.filter((token) => token.type === kind && (token.path[0] === 'dial' || token.path[0] === 'sys') && !token.alias).map((token) => token.id);
  const sources = own(unitType);
  const of = tokenSelect(ctx, { label: t.editor.of, ids: sources, value: rule?.of ?? sources[0], onchange });
  const by = numberWidget(ctx, { label: t.editor.by, labelHidden: false, value: rule?.by ?? 1, step: 0.0625, min: 0, onchange });
  const contrast = `${studio.namespace}.dial.type.contrast`;
  const exp = selectWidget(ctx, { label: t.editor.exp, options: [{ value: '', label: t.editor.expNone }, { value: contrast, label: short(contrast, studio.namespace) }], value: unref(rule?.exp) === contrast ? contrast : '', onchange });
  // The factor is a number token; the step and the floor are in the unit of `of`.
  const times = tokenSelect(ctx, { label: t.editor.times, ids: own('number'), value: rule?.times, allowEmpty: t.editor.termNone, attrs: { 'data-term': 'times' }, onchange });
  const round = tokenSelect(ctx, { label: t.editor.round, ids: sources, value: rule?.round, allowEmpty: t.editor.termNone, attrs: { 'data-term': 'round' }, onchange });
  const min = tokenSelect(ctx, { label: t.editor.min, ids: sources, value: rule?.min, allowEmpty: t.editor.termNone, attrs: { 'data-term': 'min' }, onchange });
  const terms = () => Object.fromEntries((
    [['times', times], ['round', round], ['min', min]] as const
  ).flatMap(([name, widget]) => (widget.get() ? [[name, widget.get()]] : [])));
  return {
    el: h('div', { class: 'ts-grid-2' }, of.el, by.el, type === 'typography' ? exp.el : null, times.el, round.el, min.el),
    get: () => (of.get() && by.get() !== undefined ? { fn: 'mul', of: of.get(), by: by.get(), ...(exp.get() ? { exp: ref(exp.get()) } : typeof rule?.exp === 'number' ? { exp: rule.exp } : {}), ...terms() } : undefined),
  };
}

const THEMES = ['light', 'dark'] as const;
/** A tone table in its three written forms → three numbers per theme. */
function toneGrid(tone: unknown): Record<(typeof THEMES)[number], number[]> {
  const three = (v: unknown): number[] => (Array.isArray(v) ? [0, 1, 2].map((i) => v[Math.min(i, v.length - 1)]) : [v, v, v]) as number[];
  const perTheme = tone && typeof tone === 'object' && !Array.isArray(tone) ? (tone as Json) : { light: tone, dark: tone };
  return { light: three(perTheme.light ?? 50), dark: three(perTheme.dark ?? 50) };
}
/** `tone`: which tone of which palette a color role takes — light/dark × standard/medium/high. */
export function toneWidget(ctx: Ctx, { rule, onchange }: { rule?: Json; onchange: Change }): Widget<Json> {
  const { t } = ctx;
  const palettes = Object.keys(ctx.view().system.palettes);
  const palette = selectWidget(ctx, { label: t.editor.palette, options: palettes.map((name) => ({ value: name, label: name })), value: palettes.includes(rule?.palette) ? rule!.palette : palettes[0], onchange });
  const grid = toneGrid(rule?.fn === 'tone' ? rule.tone : undefined);
  const inputs = Object.fromEntries(THEMES.map((theme) => [theme, grid[theme].map((tone, i) => numberWidget(ctx, { label: t.listed(t[theme], Object.values(t.preview.levels)[i]), value: tone, min: 0, max: 100, step: 1, onchange }))]));
  // A table of fields, and still a bare one, named for whoever cannot see what stands above it. Not inside a
  // `<tanrei-table>`: that table's cells are padded for text, and three number fields with those paddings are wider
  // than a phone's pane — the table would scroll sideways where this one fits.
  const table = h(
    'table',
    { class: 'ts-tones', 'aria-label': t.editor.tones },
    // The corner is no heading: a header cell without a name is one a screen reader announces as empty.
    h('thead', {}, h('tr', {}, h('td'), Object.values(t.preview.levels).map((name) => h('th', { scope: 'col', text: name })))),
    h('tbody', {}, THEMES.map((theme) => h('tr', {}, h('th', { scope: 'row', text: t[theme] }), inputs[theme].map((input) => h('td', {}, input.el))))),
  );
  return {
    el: h('div', { class: 'ts-stack' }, palette.el, table),
    get: () => {
      const tone: Json = {};
      for (const theme of THEMES) {
        const values = inputs[theme].map((input) => input.get());
        if (values.some((v) => v === undefined)) return undefined;
        tone[theme] = values.every((v) => v === values[0]) ? [values[0]] : values;
      }
      return { fn: 'tone', palette: palette.get(), tone };
    },
  };
}

/** `mix` (a state layer) or `alpha` (a dim): the two rules a state token accepts. */
export function stateRuleWidget(ctx: Ctx, { id, rule, onchange }: { id: string; rule?: Json; onchange: Change }): Widget<Json> {
  const { t, studio } = ctx;
  const NS = studio.namespace;
  const tokens = Object.values(ctx.view().model.tokens) as Json[];
  const component = id.split('.').slice(0, 3).join('.');
  const colors = tokens.filter((token) => token.type === 'color' && !token.state && (token.id.startsWith(`${component}.`) || token.id.startsWith(`${NS}.sys.color.`))).map((token) => token.id);
  const opacities = tokens.filter((token) => token.type === 'number' && token.id.startsWith(`${NS}.sys.state.`)).map((token) => token.id);
  const holder = h('tanrei-field-group', { label: t.editor.rule, 'label-hidden': true, spacing: 'fields' });
  let get: () => Json | undefined = () => undefined;
  const amountWidget = (value: unknown) => {
    const token = tokenSelect(ctx, { label: t.editor.amount, ids: opacities, value: unref(value), allowEmpty: t.editor.amountNumber, onchange: () => (sync(), onchange()) });
    const number = numberWidget(ctx, { label: t.editor.amount, value: typeof value === 'number' ? value : 0.12, min: 0, max: 1, step: 0.01, onchange });
    const sync = () => (number.el.hidden = Boolean(token.get()));
    sync();
    return { el: h('div', { class: 'ts-stack' }, token.el, number.el), get: () => token.get() ?? number.get() };
  };
  const draw = (fn: string) => {
    const enabled = id.replace(/\.(hovered|focused|pressed|disabled)\./, '.');
    if (fn === 'mix') {
      const base = tokenSelect(ctx, { label: 'base', ids: colors, value: rule?.base ?? enabled, onchange });
      const over = tokenSelect(ctx, { label: 'with', ids: colors, value: rule?.with ?? colors[0], onchange });
      const amount = amountWidget(rule?.fn === 'mix' ? rule.amount : ref(opacities[0]));
      holder.replaceChildren(base.el, over.el, amount.el);
      get = () => (base.get() && over.get() && amount.get() !== undefined ? { fn: 'mix', base: base.get(), with: over.get(), amount: amount.get() } : undefined);
    } else {
      const of = tokenSelect(ctx, { label: 'of', ids: colors, value: rule?.of ?? enabled, onchange });
      const amount = amountWidget(rule?.fn === 'alpha' ? rule.amount : 0.38);
      holder.replaceChildren(of.el, amount.el);
      get = () => (of.get() && amount.get() !== undefined ? { fn: 'alpha', of: of.get(), amount: amount.get() } : undefined);
    }
  };
  const kind = selectWidget(ctx, { label: t.editor.rule, options: ['mix', 'alpha'].map((fn) => ({ value: fn, label: fn })), value: rule?.fn === 'alpha' ? 'alpha' : 'mix', attrs: { 'data-rule-kind': true }, onchange: () => (draw(kind.get()), onchange()) });
  draw(kind.get());
  return { el: h('div', { class: 'ts-stack' }, kind.el, holder), get: () => get() };
}
