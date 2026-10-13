// Essentials and Groups: the first two views of the layer. Both are made of the same few panels.
import { HEX_PATTERN } from '../core.js';
import { type Ctx, type Json, button, choice, codeField, fold, folds, format, h, inlineButton, isolated, linkButton, ltr, panel, placed, rich, short, textField, trim } from './dom';
import { tokenEditor } from './editor';
import { addPanel, extensionsPanel } from './add';
import { behaviourPanel, iconsPanel, shapePanel, typefacesPanel } from './system';
import { colorWidget, numberWidget } from './widgets';
import { componentList } from '../listing.js';

// ── base ─────────────────────────────────────────────────────────────────────────────────────────
function basePanel(ctx: Ctx) {
  const { t, studio } = ctx;
  const layer = ctx.layer();
  const description = studio.systems.find((s: Json) => s.id === layer.extends)?.description ?? '';
  return panel(
    ctx,
    { title: t.base.title, code: 'extends', key: 'base' },
    choice({
      label: t.base.title,
      options: studio.systems.map((s: Json) => ({ value: s.id, label: s.id })),
      value: layer.extends,
      attrs: { 'data-base': true },
      onchange: (id) => {
        // Operations are relative to what they inherit, so another base starts from that base's defaults — and the
        // person is asked before their edits go. The layer is read NOW: this panel is drawn once, and most edits
        // (a color, a slider) do not redraw it, so the layer it was drawn with may be an empty one by now.
        const now = ctx.layer();
        const changed = Object.keys(now).some((key) => ['palettes', 'tokens', 'rules', 'vocabulary'].includes(key));
        if (changed && !window.confirm(t.base.confirm)) return ctx.rebuild();
        ctx.commit(studio.setBase(now, id), { rebuild: true });
      },
    }),
    // The system's own description, word for word: a run of its own language's direction inside the panel's.
    h('p', { class: 'ts-help', 'data-base-description': true }, isolated(description)),
  );
}

// ── dials ────────────────────────────────────────────────────────────────────────────────────────
function dialRow(ctx: Ctx, dial: Json, { name, note, reason: withReason, set }: { name: string; note: string; reason: boolean; set: (value: number) => Json }) {
  const { t } = ctx;
  const current = () => ctx.studio.dials(ctx.layer()).find((d: Json) => d.id === dial.id)!;
  // Shown while it is typed, stepped or dragged; written when that ends (the field's and the slider's `change`).
  const pair = numberWidget(ctx, { label: t.named(name, t.dials.value), rangeLabel: name, value: dial.value, min: dial.min, max: dial.max, step: dial.step, unit: dial.unit, range: true, attrs: { class: 'ts-num' }, onchange: (live) => pair.get() !== undefined && ctx.commit(set(pair.get()!), { preview: live }) });
  const reset = linkButton(t.reset, () => ctx.commit(set(dial.base)), { 'aria-label': t.labelled(t.reset, name) });
  // A dial's reason is asked once the dial is changed: the field is written then, not before.
  let reason: ReturnType<typeof textField> | undefined;
  const row = h(
    'div',
    { class: 'ts-row', 'data-dial': dial.id },
    h('div', { class: 'ts-row-head' }, h('div', { class: 'ts-row-title' }, name, h('small', {}, rich((at) => (note ? t.listed(at(h('code', { text: short(dial.id, ctx.studio.namespace) })), note) : at(h('code', { text: short(dial.id, ctx.studio.namespace) })))))), pair.number, reset),
    pair.slider,
  );
  const refresh = () => {
    const now = current();
    pair.sync(now.value);
    if (withReason && now.changed && !reason) row.append((reason = textField({ label: t.dials.reason, placeholder: t.dials.reasonPlaceholder, attrs: { 'data-dial-reason': true }, oninput: (value) => ctx.commit(ctx.studio.setDial(ctx.layer(), dial.id, current().value, value)) })));
    if (reason && document.activeElement !== reason) reason.value = now.reason;
    row.toggleAttribute('data-changed', now.changed);
    reset.hidden = !now.changed;
    if (reason) reason.hidden = !now.changed;
  };
  refresh();
  ctx.onUpdate(refresh);
  return row;
}

function dialsPanel(ctx: Ctx) {
  const { t, studio } = ctx;
  const rows = studio.dials(ctx.layer()).map((dial: Json) => {
    const [name, note] = t.dials.names[dial.key] ?? [dial.key, ''];
    return dialRow(ctx, dial, { name, note, reason: true, set: (value) => studio.setDial(ctx.layer(), dial.id, value) });
  });
  const resetAll = linkButton(t.resetAll, () => ctx.commit(studio.dials(ctx.layer()).reduce((layer: Json, dial: Json) => studio.setDial(layer, dial.id, dial.base), ctx.layer())), { 'data-reset-dials': true });
  return panel(ctx, { title: t.dials.title, help: t.dials.help, key: 'dials', actions: [resetAll] }, h('div', { class: 'ts-rows', 'data-dials': true }, rows));
}

function feelPanel(ctx: Ctx) {
  const { t, studio } = ctx;
  const rows = studio.essentials(ctx.layer()).dials.map((dial: Json) => {
    const [name, note] = t.essentials.names[dial.key];
    return dialRow(ctx, dial, { name, note, reason: false, set: (value) => studio.setEssential(ctx.layer(), dial.key, value) });
  });
  const hint = h('p', { class: 'ts-hint', 'data-link-hint': true });
  const refresh = () => {
    const { linked, size } = studio.essentials(ctx.layer());
    hint.replaceChildren(...placed(linked ? t.essentials.linked : t.essentials.separated, 'size', ltr(`${trim(size.value)}${size.unit}`)));
  };
  refresh();
  ctx.onUpdate(refresh);
  rows.splice(2, 0, hint); // under Spacing
  return panel(ctx, { title: t.essentials.feel, key: 'feel' }, h('div', { class: 'ts-rows', 'data-essentials': true }, rows));
}

// ── color ────────────────────────────────────────────────────────────────────────────────────────
/** A palette's seed: one colour field. It is shown as it is typed or picked (`live`) and written at the commit. */
function seedControls(ctx: Ctx, name: string, current: () => string, onseed: (seed: string, live?: boolean) => void) {
  const { t } = ctx;
  const field = colorWidget(ctx, { label: t.color.seedOf(name), labelHidden: true, value: current(), attrs: { 'data-seed': name }, onchange: (live) => field.get() && onseed(field.get()!, live) });
  // A seed changed elsewhere is shown; never under the person's hands (a half-typed text is no value yet).
  const refresh = () => !field.el.matches(':focus-within') && field.set(HEX_PATTERN.test(current()) ? current().toLowerCase() : '');
  ctx.onUpdate(refresh);
  return field.el;
}

/**
 * Fixed tones (`source.tones`): exact colors for single tones of a palette. A small table — tone → hex — that writes
 * the palette's declaration whole, so Source shows the same entries and the color controls keep them (core.setPalette).
 */
function tonesEditor(ctx: Ctx, name: string) {
  const { t, studio } = ctx;
  const count = h('bdi');
  const total = () => (count.textContent = String((studio.paletteTones(ctx.layer(), name) as Json[]).length));
  const details = fold({ label: t.tones.title, trailing: count, attrs: { 'data-tones': name } });
  // The table is written when its fold first opens: every palette has one, and most are never looked at.
  details.addEventListener('toggle', () => details.open && details.children.length === 1 && details.append(tonesTable(ctx, name)));
  total();
  ctx.onUpdate(total);
  return folds({ class: 'ts-tones-fold' }, details);
}
function tonesTable(ctx: Ctx, name: string) {
  const { t, studio } = ctx;
  const rows = h('div', { class: 'ts-tone-rows', 'data-tone-rows': true });
  const table = () => Object.fromEntries((studio.paletteTones(ctx.layer(), name) as Json[]).map((row) => [String(row.tone), row.hex]));
  const write = (next: Json) => ctx.commit(studio.setPaletteTones(ctx.layer(), name, next));
  let drawn = '';

  function draw() {
    const tones = studio.paletteTones(ctx.layer(), name) as Json[];
    drawn = JSON.stringify(tones);
    rows.replaceChildren(
      ...tones.map((row) => {
        // A whole number from 0 to 100: the field holds what is typed to that. What it cannot know is said under it.
        const tone = numberWidget(ctx, {
          label: t.tones.toneOf(name, row.tone), value: row.tone, min: 0, max: 100, step: 1, digits: 0, attrs: { 'data-tone': row.tone },
          onchange: (live) => {
            tone.number.error = false;
            const to = tone.get();
            if (live || to === undefined || to === row.tone) return;
            const current = table();
            if (String(to) in current) {
              tone.number.errorText = t.tones.taken.replace('{tone}', String(to));
              tone.number.error = true;
              return void tone.set(row.tone);
            }
            delete current[String(row.tone)];
            write({ ...current, [String(to)]: row.hex });
            redraw(() => rows.querySelector<HTMLElement>(`[data-tone="${to}"]`)?.focus());
          },
        });
        const color = colorWidget(ctx, { label: t.tones.toneOf(name, row.tone), labelHidden: true, value: row.hex, onchange: () => color.get() && write({ ...table(), [String(row.tone)]: color.get() }) });
        const remove = linkButton(t.tones.remove, () => {
          const current = table();
          delete current[String(row.tone)];
          write(current);
          redraw(() => (rows.querySelector<HTMLElement>('[data-tone]') ?? addTone.number).focus());
        }, { 'aria-label': t.labelled(t.tones.remove, `${name} ${row.tone}`) });
        return h('div', { class: 'ts-tone-row', 'data-tone-row': row.tone }, tone.el, color.el, remove);
      }),
    );
    if (!tones.length) rows.append(h('p', { class: 'ts-help', text: t.tones.none }));
  }
  const redraw = (then?: () => void) => (draw(), then?.());

  const addTone = numberWidget(ctx, { label: t.named(name, t.tones.newTone), value: undefined, min: 0, max: 100, step: 1, digits: 0, placeholder: '40', attrs: { 'data-tone-new': true }, onchange: () => (addTone.number.error = false) });
  const add = () => {
    const tone = addTone.number.value;
    const current = table();
    const problem = tone === null ? t.tones.range : String(tone) in current ? t.tones.taken.replace('{tone}', String(tone)) : '';
    addTone.number.errorText = problem;
    addTone.number.error = Boolean(problem);
    if (problem) return;
    // Starts as the color the palette generates for that tone: nothing moves until the person changes it.
    write({ ...current, [String(tone)]: studio.generatedTone(ctx.layer(), name, tone) ?? '#808080' });
    addTone.set(undefined);
    redraw(() => rows.querySelector<HTMLInputElement>(`[data-tone-row="${tone}"] tanrei-color-field`)?.focus());
    ctx.announce(t.tones.added(name, tone!));
  };
  // Enter in the field: the field has committed what was typed by then (its `action` follows its `change`).
  addTone.number.addEventListener('action', add);
  const el = h('div', { class: 'ts-stack' }, h('p', { class: 'ts-help', text: t.tones.help }), rows, h('div', { class: 'ts-tone-add' }, addTone.el, button(t.tones.add, add, { 'data-tone-add': true })));
  draw();
  // A change made elsewhere (another color, Source, a reload) redraws the table — never under the person's fingers.
  ctx.onUpdate(() => JSON.stringify(studio.paletteTones(ctx.layer(), name)) !== drawn && !rows.contains(document.activeElement) && draw());
  return el;
}

function brandPanel(ctx: Ctx) {
  const { t, studio } = ctx;
  const row = () => studio.paletteRows(ctx.layer()).find((r: Json) => r.name === 'primary')!;
  const fallback = () => ctx.view().model.colors.light.primary.value.hex;
  const seed = seedControls(ctx, 'primary', () => row().source?.seed ?? fallback(), (seed, live) => ctx.commit(studio.setPalette(ctx.layer(), 'primary', { source: { seed } }), { preview: live }));
  const swatch = h('tanrei-swatch', { class: 'ts-swatch', decorative: true, size: 'large', color: `var(${studio.cssVar(`${studio.namespace}.ref.palette.primary.50`)})`, 'data-swatch': true });
  const note = h('small');
  const reset = linkButton(t.reset, () => ctx.commit(studio.setPalette(ctx.layer(), 'primary', undefined)), { 'aria-label': t.labelled(t.reset, 'primary') });
  const refresh = () => {
    const now = row();
    reset.hidden = !now.changed;
    const state = now.changed ? t.changed : now.monochrome ? t.essentials.monochrome : t.inherited;
    note.textContent = now.tones ? t.listed(state, t.color.fixedTones(now.tones)) : state;
    note.title = now.tones ? t.color.fixedTonesHelp(now.tones) : '';
  };
  refresh();
  ctx.onUpdate(refresh);
  // Essentials stays small: the tone table shows up only for a palette that HAS fixed tones (m3-like's primary).
  const tones = row().tones ? tonesEditor(ctx, 'primary') : null;
  return panel(ctx, { title: t.essentials.brand, code: 'palettes.primary', key: 'brand' }, h('div', { class: 'ts-row ts-palette ts-row-first', 'data-palette': 'primary' }, swatch, h('div', { class: 'ts-row-title' }, h('span', { text: t.essentials.brandName }), note), h('div', { class: 'ts-row-actions' }, reset), h('div', { class: 'ts-field' }, seed), tones));
}

function paletteRow(ctx: Ctx, palette: Json) {
  const { t, studio } = ctx;
  const { name } = palette;
  const NS = studio.namespace;
  const now = () => studio.paletteRows(ctx.layer()).find((r: Json) => r.name === name) ?? palette;
  const title = (note: string | HTMLElement) => h('div', { class: 'ts-row-title' }, h('span', { dir: 'auto', text: name }), typeof note === 'string' ? h('small', { text: note }) : note);
  if (palette.dropped) {
    return h('div', { class: 'ts-row ts-palette', 'data-palette': name, 'data-dropped': true }, h('tanrei-swatch', { class: 'ts-swatch', decorative: true, size: 'large' }), title(t.color.dropped), h('div', { class: 'ts-row-actions' }, linkButton(t.color.restore, () => ctx.commit(studio.restorePalette(ctx.layer(), name), { rebuild: true }), { 'aria-label': t.labelled(t.color.restore, name) })));
  }
  const note = h('small');
  const reset = palette.inherited ? linkButton(t.reset, () => ctx.commit(studio.setPalette(ctx.layer(), name, undefined), { rebuild: true }), { 'aria-label': t.labelled(t.reset, name) }) : null;
  const drop = palette.droppable || palette.added ? linkButton(palette.added ? t.color.remove : t.color.drop, () => ctx.commit(studio.dropPalette(ctx.layer(), name), { rebuild: true }), { 'aria-label': t.labelled(palette.added ? t.color.remove : t.color.drop, name) }) : null;
  const usesSeed = !palette.source || 'seed' in palette.source;
  const swatch = h('tanrei-swatch', { class: 'ts-swatch', decorative: true, size: 'large', color: `var(${studio.cssVar(`${NS}.ref.palette.${name}.50`)})`, 'data-swatch': true });

  let lead: HTMLElement;
  const fields: HTMLElement[] = [];
  if (usesSeed) {
    const fallback = () => ctx.view().model.colors.light.primary.value.hex;
    lead = swatch;
    fields.push(h('div', { class: 'ts-field' }, seedControls(ctx, name, () => now().source?.seed ?? fallback(), (seed, live) => ctx.commit(studio.setPalette(ctx.layer(), name, { source: { seed } }), { preview: live }))));
  } else {
    // A palette given as hue + chroma (HCT): neutrals usually are, so their chroma can be held near zero.
    lead = swatch;
    const set = (live?: boolean) => hue.get() !== undefined && chroma.get() !== undefined && ctx.commit(studio.setPalette(ctx.layer(), name, { source: { hue: hue.get(), chroma: chroma.get() } }), { preview: live });
    const hue = numberWidget(ctx, { label: t.color.hue, labelHidden: false, value: palette.source.hue, min: 0, max: 360, step: 1, attrs: { 'data-hue': true }, onchange: set });
    const chroma = numberWidget(ctx, { label: t.color.chroma, labelHidden: false, value: palette.source.chroma, min: 0, max: 150, step: 1, attrs: { 'data-chroma': true }, onchange: set });
    fields.push(h('div', { class: 'ts-grid-2 ts-field' }, hue.el, chroma.el));
  }
  const toggle = palette.monochrome ? null : linkButton(usesSeed ? t.color.useHue : t.color.useSeed, () => {
    const hex = ctx.view().model.tokens[`${NS}.ref.palette.${name}.50`]?.value.hex ?? '#808080';
    ctx.commit(studio.setPalette(ctx.layer(), name, { source: usesSeed ? { hue: 265, chroma: 16 } : { seed: hex } }), { rebuild: true });
  });
  if (palette.added || palette.declared) {
    fields.push(textField({ label: t.color.description, placeholder: t.color.whyPlaceholder, value: palette.description ?? '', attrs: { 'data-palette-why': true }, oninput: (value) => ctx.commit(studio.setPalette(ctx.layer(), name, { description: value })) }));
  }
  if (palette.source) fields.push(tonesEditor(ctx, name));
  const row = h('div', { class: 'ts-row ts-palette', 'data-palette': name }, lead, title(note), h('div', { class: 'ts-row-actions' }, toggle, reset, drop), ...fields);
  const refresh = () => {
    const current = now();
    row.toggleAttribute('data-changed', current.changed);
    if (reset) reset.hidden = !current.changed;
    const state = current.added ? t.color.added : current.changed ? t.changed : current.monochrome ? t.color.monochrome : current.declared ? t.listed(t.color.declared, t.inherited) : t.inherited;
    // `source.tones`: exact colors for single tones. Shown, kept on every edit that keeps the color; edited in the fold below.
    note.textContent = current.tones ? t.listed(state, t.color.fixedTones(current.tones)) : state;
    note.title = current.tones ? t.color.fixedTonesHelp(current.tones) : '';
    row.toggleAttribute('data-fixed-tones', current.tones > 0);
  };
  refresh();
  ctx.onUpdate(refresh);
  return row;
}

function colorPanel(ctx: Ctx) {
  const { t, studio } = ctx;
  const name = textField({ label: t.color.name, placeholder: 'correct', attrs: { name: 'name' }, oninput: () => (name.error = false) });
  const seed = colorWidget(ctx, { label: t.color.seed, value: '#0f766e', attrs: { name: 'seed' }, onchange: () => {} });
  const why = textField({ label: t.color.why, placeholder: t.color.whyPlaceholder, attrs: { name: 'description', class: 'ts-field-wide' } });
  const form = h(
    'form',
    {
      class: 'ts-add',
      novalidate: true,
      'data-add-palette': true,
      onsubmit: (event: Event) => {
        event.preventDefault();
        const problem = studio.paletteNameProblem(ctx.layer(), name.value.trim());
        // What is wrong with the name is the field's own error.
        name.errorText = problem ? t.color.errors[problem] : '';
        name.error = Boolean(problem);
        if (problem) return;
        ctx.commit(studio.setPalette(ctx.layer(), name.value.trim(), { source: { seed: seed.get() ?? '#0f766e' }, description: why.value }), { rebuild: true });
        ctx.announce(t.color.addedPalette(name.value.trim()));
      },
    },
    h('p', { class: 'ts-subhead', text: t.color.add }),
    h('div', { class: 'ts-add-grid' }, name, seed.el, why, button(t.color.addButton, null, { type: 'submit', 'data-add-palette-submit': true })),
  );
  return panel(ctx, { title: t.color.title, code: 'palettes', help: t.color.help, key: 'color' }, h('div', { class: 'ts-rows', 'data-palettes': true }, studio.paletteRows(ctx.layer()).map((row: Json) => paletteRow(ctx, row))), form);
}

// ── components ───────────────────────────────────────────────────────────────────────────────────
const COMMON = ['container.shape', 'container.gap', 'container.height', 'container.padding-inline-start', 'container.padding-inline-end', 'label.typescale', 'outline.width'];
/** The size the common edits of a component apply to; kept while the controls are redrawn. */
const commonSize = new Map<string, string>();

/**
 * Per component: what its axes hold now, and the handful of edits people make first. All of them are ordinary tokens.
 * The components are the items of one accordion, and an item is drawn when it first opens: the level costs what it
 * shows, however many components the system has (the token tree does the same with its groups).
 *
 * Which components are items is the specs' (`../listing.js`): by default the ones every list shows, and
 * with the switch above the list also the ones shown on request, each marked. An item says its level; a component
 * with no panel of its own that is built from ones that have one opens its members' panels.
 */
function componentsPanel(ctx: Ctx) {
  const { t, studio } = ctx;
  const NS = studio.namespace;
  /** One item: a component's own panel, drawn when it first opens. `key` is what is remembered as open. */
  // `reads`: the sets of tokens the component reads that are no component's (the input box): each is an item inside
  // this one, above the component's own controls — the way to the box from every control drawn on it.
  const item = (component: string, key: string, attrs: Json, trailing?: string, reads: string[] = []): HTMLDetailsElement => {
    const details = fold({ label: h('span', { text: component }), supporting: h('code', { text: `comp.${component}` }), trailing: trailing || undefined, open: openComponents.has(key), attrs: { ...attrs, ...(reads.length ? { 'data-reads': reads.join(' ') } : {}) } });
    const draw = () => details.children.length === 1 && details.append(...(reads.length ? [folds({}, reads.map((set) => item(set, `${key}/${set}`, { 'data-member': set })))] : []), componentBody(ctx, component, NS));
    // What the person left open stays open while the controls are drawn again. (An item inside this one answers for itself.)
    details.addEventListener('toggle', (event) => event.target === details && (details.open ? (openComponents.add(key), draw()) : openComponents.delete(key)));
    if (details.open) draw();
    return details;
  };
  const items = () =>
    componentList(Object.keys(ctx.view().model.components as Json), studio.catalog, { everything: everyComponent(), shared: ctx.view().model.shared }).map((entry: Json) => {
      const says = [entry.role && t.components.levels[entry.role], entry.onRequest && t.components.advanced].filter(Boolean).join(' · ');
      const attrs = { 'data-component': entry.name, ...(entry.onRequest ? { 'data-on-request': true } : {}) };
      if (entry.own) return item(entry.name, entry.name, attrs, says, entry.reads);
      // No panel of its own: its members', each an item of an accordion inside it (one level down is open).
      const details = fold({ label: h('span', { text: entry.name }), supporting: h('span', { text: t.components.members }), trailing: says || undefined, open: openComponents.has(entry.name), attrs: { ...attrs, 'data-members': entry.members.join(' ') } });
      const draw = () => details.children.length === 1 && details.append(folds({}, entry.members.map((member: string) => item(member, `${entry.name}/${member}`, { 'data-member': member }))));
      details.addEventListener('toggle', (event) => event.target === details && (details.open ? (openComponents.add(entry.name), draw()) : openComponents.delete(entry.name)));
      if (details.open) draw();
      return details;
    });
  let list = folds({ 'data-components': true }, items());
  // The one control of the list: off, what every list shows; on, everything. The person's choice, kept on this device.
  const everything = h('tanrei-switch', { class: 'ts-components-everything', label: t.components.everything, 'data-components-everything': true });
  everything.selected = everyComponent();
  everything.addEventListener('change', (event) => {
    if (event.target !== everything) return;
    setEveryComponent(!!everything.selected);
    const next = folds({ 'data-components': true }, items());
    list.replaceWith(next);
    list = next;
  });
  return panel(ctx, { title: t.components.title, code: 'tokens', help: t.components.help, key: 'components' }, everything, list);
}
/** The components the person left open. */
const openComponents = new Set<string>();
/** Whether the list shows every component: remembered on this device, apart from the layer (it is a view, not a value). */
const EVERY_COMPONENT = 'tanrei-theme-studio-every-component';
let everyComponentNow: boolean | undefined;
function everyComponent(): boolean {
  if (everyComponentNow === undefined) {
    try {
      everyComponentNow = localStorage.getItem(EVERY_COMPONENT) === 'true';
    } catch {
      everyComponentNow = false;
    }
  }
  return everyComponentNow;
}
function setEveryComponent(value: boolean) {
  everyComponentNow = value;
  try {
    if (value) localStorage.setItem(EVERY_COMPONENT, 'true');
    else localStorage.removeItem(EVERY_COMPONENT);
  } catch {}
}

function componentBody(ctx: Ctx, component: string, NS: string) {
  const { t, studio } = ctx;
  const prefix = `${NS}.comp.${component}`;
  // A look's sample is its container on its edge: a component that reads a shared set draws that box from the set's tokens.
  const boxOf = () => { const shared = (ctx.view().model.shared ?? {}) as Record<string, string[]>; const set = Object.keys(shared).find((name) => shared[name]!.includes(component)); return set ? `${NS}.comp.${set}` : prefix; };
  // What the axes hold: two rows of small tags. Written again only when the names or a height change (a variant's
  // sample follows the sheet by itself), so a drag elsewhere costs this row nothing.
  const sizeTags = h('tanrei-tag-group', { label: t.components.sizes, 'data-sizes': true });
  const variantTags = h('tanrei-tag-group', { label: t.components.variants, 'data-variants': true });
  // A row with nothing in it is not drawn: a component with no size axis (or no variants) shows no empty "Sizes:".
  // The row is left out of the list rather than hidden, because the list draws each of its rows as a grid.
  const sizeRow = h('div', { 'data-axis-row': 'sizes' }, h('dt', { text: t.components.sizes }), h('dd', {}, sizeTags));
  const variantRow = h('div', { 'data-axis-row': 'variants' }, h('dt', { text: t.components.variants }), h('dd', {}, variantTags));
  const rows = h('dl', {});
  const summary = h('tanrei-description-list', { class: 'ts-axis-summary', layout: 'inline', density: 'compact', separation: 'gap' }, rows);
  let shown = '';
  const refresh = () => {
    const model = ctx.view().model;
    const now = model.components[component];
    if (!now) return;
    const sizes: [string, string][] = (now.axes.size?.values ?? []).map((value: string) => [value, format('dimension', model.tokens[`${prefix}.container.height.${value}`]?.value)]);
    const variants: string[] = now.states?.variants ?? [];
    const key = JSON.stringify([sizes, variants]);
    if (key === shown) return;
    shown = key;
    rows.replaceChildren(...(sizes.length ? [sizeRow] : []), ...(variants.length ? [variantRow] : []));
    summary.hidden = !sizes.length && !variants.length;
    sizeTags.replaceChildren(...sizes.map(([value, height]) => h('tanrei-tag', { size: 'small', variant: 'outlined', label: `${value} ${height}` })));
    variantTags.replaceChildren(...variants.map((value) => h('tanrei-tag', { size: 'small', variant: 'outlined', label: value }, h('i', { slot: 'icon', class: 'ts-dot', style: `background: var(${studio.cssVar(`${boxOf()}.${value}.container.color`)}); border-color: var(${studio.cssVar(`${boxOf()}.${value}.outline.color`)})` }))));
  };
  refresh();
  ctx.onUpdate(refresh);
  // The common edits are named by member; the size axis (`dev.tanrei.axes` on the component group) says which of
  // them are tokens per size, and the picker says for which size — so a member that joins the axis needs no change here.
  let syncs: (() => void)[] = [];
  const sizes = () => ctx.view().model.components[component]?.axes.size as Json | undefined;
  const chosenSize = (axis = sizes()): string | undefined => (axis?.values.includes(commonSize.get(component)) ? commonSize.get(component) : axis?.default);
  const list = folds({ class: 'ts-common-folds' });
  const drawFolds = () => {
    const model = ctx.view().model;
    const axis = sizes();
    const chosen = chosenSize(axis);
    const ids = COMMON.map((member) => (axis?.members.includes(member) ? `${prefix}.${member}.${chosen}` : `${prefix}.${member}`)).filter((id) => model.tokens[id]);
    syncs = [];
    list.replaceChildren(...ids.map((id) => {
      const value = h('bdi', { dir: 'ltr' });
      const sync = () => (value.textContent = format(ctx.view().model.tokens[id]?.type, ctx.view().model.tokens[id]?.value));
      sync();
      syncs.push(sync);
      const details = fold({ label: h('code', { text: short(id, NS).replace(`comp.${component}.`, '') }), trailing: value, attrs: { 'data-common': id } });
      details.addEventListener('toggle', () => details.open && details.children.length === 1 && details.append(tokenEditor(ctx, id, { compact: true })));
      return details;
    }));
  };
  // The picker stays while the edits under it are drawn again: the arrow keys go on from the size they chose.
  const axis = sizes();
  const picker = axis && axis.values.length > 1
    ? choice({ label: t.components.commonSize, attrs: { 'data-common-size': true }, options: axis.values.map((value: string) => ({ value, label: value })), value: chosenSize(axis)!, onchange: (value) => (commonSize.set(component, value), drawFolds()) })
    : null;
  drawFolds();
  ctx.onUpdate(() => syncs.forEach((sync) => sync()));
  return h(
    'div',
    { class: 'ts-stack ts-component' },
    summary,
    h('div', { class: 'ts-common', 'data-common-edits': true }, h('div', { class: 'ts-row-head' }, h('p', { class: 'ts-subhead ts-row-title', text: t.components.common }), picker), picker ? h('p', { class: 'ts-help', text: t.components.commonHelp }) : null, list),
    // Its container's shape where it has one, else the first token it has: a component that draws no box of its own (the
    // Field, whose tokens are the rows around another control's box) has no `container.shape`, and its link chose nothing.
    h('div', { class: 'ts-row-actions' }, linkButton(t.components.all, () => { const tokens = ctx.view().model.tokens as Json; ctx.setLevel('tokens', { token: tokens[`${prefix}.container.shape`] ? `${prefix}.container.shape` : (Object.keys(tokens).find((id) => id.startsWith(`${prefix}.`)) ?? `${prefix}.container.shape`) }); })),
  );
}

// ── about ────────────────────────────────────────────────────────────────────────────────────────
function aboutPanel(ctx: Ctx) {
  const { t, studio } = ctx;
  const layer = ctx.layer();
  const set = (patch: Json) => ctx.commit(studio.setMeta(ctx.layer(), patch).layer);
  const description = textField({ label: t.about.description, value: layer.description ?? '', multiline: true, rows: 2, attrs: { 'data-about-description': true }, oninput: (value) => set({ description: value }) });
  // What the fold holds is written when it first opens (it is open for a layer that has any of it).
  const more = fold({ label: t.about.more, open: Boolean(layer.attribution || layer.specVersion), attrs: { 'data-about-more': true } });
  const fill = () => {
    if (more.children.length > 1) return;
    const specVersion = textField({ label: 'specVersion', value: layer.specVersion ?? '', oninput: (value) => set({ specVersion: value }) });
    const attribution = layer.attribution ?? {};
    const inspiredBy = textField({ label: 'attribution.inspiredBy', value: attribution.inspiredBy ?? '' });
    const disclaimer = textField({ label: 'attribution.disclaimer', value: attribution.disclaimer ?? '', multiline: true, rows: 2 });
    // JSON, in a text field that holds code: it names itself and holds what is wrong with the code.
    const sources = codeField({ label: 'attribution.sources', value: attribution.sources ? JSON.stringify(attribution.sources, null, 2) : '', placeholder: '[{ "name": "…", "license": "…", "url": "…" }]', rows: 3 });
    const said = (message: string) => ((sources.errorText = message), (sources.error = Boolean(message)));
    const setAttribution = () => {
      let list: unknown;
      try {
        list = sources.value.trim() ? JSON.parse(sources.value) : undefined;
        said('');
      } catch (error) {
        said((error as Error).message);
        return;
      }
      const filled = inspiredBy.value.trim() || disclaimer.value.trim() || list;
      set({ attribution: filled ? { inspiredBy: inspiredBy.value, ...(list ? { sources: list } : {}), disclaimer: disclaimer.value } : undefined });
    };
    for (const input of [inspiredBy, disclaimer, sources]) input.addEventListener('input', setAttribution);
    more.append(h('div', { class: 'ts-stack' }, specVersion, h('p', { class: 'ts-help', text: t.about.attributionHelp }), inspiredBy, disclaimer, sources));
  };
  more.addEventListener('toggle', () => more.open && fill());
  if (more.open) fill();
  return panel(
    ctx,
    { title: t.about.title, code: 'description', key: 'about' },
    description,
    folds({}, more),
  );
}

export function essentialsLevel(ctx: Ctx): HTMLElement[] {
  const { t } = ctx;
  return [basePanel(ctx), brandPanel(ctx), feelPanel(ctx), h('p', { class: 'ts-more' }, rich((at) => t.sentences(t.essentials.more, t.listed(t.listed(at(inlineButton(t.levels.groups, () => ctx.setLevel('groups'))), at(inlineButton(t.levels.tokens, () => ctx.setLevel('tokens')))), at(inlineButton(t.levels.source, () => ctx.setLevel('source')))))))];
}

export function groupsLevel(ctx: Ctx): HTMLElement[] {
  // `extensionsPanel` is null until the layer has declared something of its own.
  return [basePanel(ctx), dialsPanel(ctx), colorPanel(ctx), typefacesPanel(ctx), iconsPanel(ctx), shapePanel(ctx), behaviourPanel(ctx), componentsPanel(ctx), extensionsPanel(ctx), addPanel(ctx), aboutPanel(ctx)].filter(Boolean) as HTMLElement[];
}

export { button };
