// Groups: typefaces, the icon set, shape, behaviour. Four panels over ordinary operations —
// everything they write is `tokens: { <id>: { $value, reason } }` (or an alias), so Every token and Source show the
// same entries. A pin needs a reason; each panel asks for it ONCE, prefilled, and every pin the panel writes carries it.
import { CORNER_SMOOTHING, MIN_REASON } from '../core.js';
import { SUGGESTED_FAMILIES, cssFontFamily } from '../fonts.js';
import { type Ctx, type Json, choice, fold, folds, h, isolated, linkButton, ltr, panel, rich, short, textField, trim } from './dom';
import { availabilityNote, numberWidget, stackWidget } from './widgets';

type Group = 'typefaces' | 'icons' | 'shape' | 'behavior';

/** The group's one reason, and the group's reset. `value()` is what a pin written now should carry. */
function groupReason(ctx: Ctx, group: Group) {
  const { t, studio } = ctx;
  // A text field: in error — with the words under it — while what it holds is too short to be written.
  const input = textField({ label: t.system.reason, value: studio.groupReason(ctx.layer(), group), attrs: { 'error-text': t.system.reasonShort, 'data-group-reason': group }, oninput: (value) => (sync(), value.trim().length >= MIN_REASON && ctx.commit(studio.setGroupReason(ctx.layer(), group, value))) });
  const sync = () => (input.error = input.value.trim().length < MIN_REASON);
  ctx.onUpdate(() => {
    if (document.activeElement !== input) input.value = studio.groupReason(ctx.layer(), group);
    sync();
  });
  sync();
  return { el: h('div', { class: 'ts-stack ts-group-reason' }, input), value: () => input.value };
}

const stateNote = (ctx: Ctx, changed: boolean) => (changed ? ctx.t.changed : ctx.t.inherited);

// ── typefaces ────────────────────────────────────────────────────────────────────────────────────
export function typefacesPanel(ctx: Ctx) {
  const { t, studio } = ctx;
  const NS = studio.namespace;
  const reason = groupReason(ctx, 'typefaces');
  const rows = (studio.typefaces(ctx.layer()) as Json[]).map((face, index) => {
    const now = () => (studio.typefaces(ctx.layer()) as Json[]).find((entry) => entry.key === face.key) ?? face;
    const [name, use] = t.typefaces.names[face.key] ?? [face.key, ''];
    const state = h('small');
    const summaryValue = h('bdi', { class: 'ts-fold-value', dir: 'ltr' });
    const mark = h('span', { class: 'ts-mark', title: t.changed, 'aria-label': t.changed, role: 'img', hidden: true });
    const reset = linkButton(t.reset, () => ctx.commit(studio.applyOperation(ctx.layer(), face.id, null).layer), { 'aria-label': t.labelled(t.reset, name) });
    // The editor of a stack is written when its fold first opens (the first one is open).
    let editor: ReturnType<typeof stackWidget> | undefined;
    const body = h('div', { class: 'ts-stack' }, h('div', { class: 'ts-row-head' }, state, reset));
    const build = () => {
      if (editor) return;
      const made = (editor = stackWidget(ctx, { label: name, value: now().stack, kind: face.key === 'mono' ? 'mono' : 'text', onchange: () => made.get() && ctx.commit(studio.setTypeface(ctx.layer(), face.key, made.get(), reason.value())) }));
      body.append(made.el);
    };
    const details = fold(
      { label: h('span', {}, name, mark), supporting: [...rich((at) => (use ? t.listed(at(h('code', { text: short(face.id, NS) })), use) : at(h('code', { text: short(face.id, NS) })))), h('br'), summaryValue], open: index === 0, attrs: { 'data-typeface': face.key } },
      body,
    );
    details.addEventListener('toggle', () => details.open && build());
    if (index === 0) build();
    const refresh = () => {
      const current = now();
      if (!details.contains(document.activeElement)) editor?.set(current.stack);
      details.toggleAttribute('data-changed', current.changed);
      reset.hidden = mark.hidden = !current.changed;
      state.textContent = stateNote(ctx, current.changed);
      summaryValue.textContent = cssFontFamily(current.stack);
    };
    refresh();
    ctx.onUpdate(refresh);
    return details;
  });
  const resetAll = linkButton(t.resetAll, () => ctx.commit(studio.resetGroup(ctx.layer(), 'typefaces')), { 'data-reset-typefaces': true });
  return panel(ctx, { title: t.typefaces.title, help: t.typefaces.help, key: 'typefaces', actions: [resetAll] }, folds({ 'data-typefaces': true }, rows), reason.el);
}

// ── the icon set ─────────────────────────────────────────────────────────────────────────────────
type IconMode = 'variable' | 'static';
const families = (text: string) => text.split(',').map((name) => name.trim().replace(/^["']|["']$/g, '')).filter(Boolean);

export function iconsPanel(ctx: Ctx) {
  const { t, studio } = ctx;
  const NS = studio.namespace;
  const reason = groupReason(ctx, 'icons');
  const set = (patch: Json, live?: boolean) => ctx.commit(studio.setIconSet(ctx.layer(), patch, reason.value()), { preview: live });
  const now = () => studio.iconSet(ctx.layer()) as Json;
  const start = now();

  const mode = choice<IconMode>({ label: t.icons.mode, attrs: { 'data-icon-mode': true }, options: (['variable', 'static'] as IconMode[]).map((value) => ({ value, label: t.icons.modes[value] })), value: start.mode, onchange: (value) => set({ mode: value }) });
  const modeHelp = h('p', { class: 'ts-help', 'data-icon-mode-help': true });

  // A family by name: a combobox over the families people reach for first, which takes any other name (or several,
  // with commas) as typed. Shown while it is typed, written at the commit.
  const familyField = (key: 'family' | 'unselected' | 'selected', suggestions: string[]) => {
    const input = h('tanrei-combobox-field', { label: t.icons.families[key], 'supporting-text': short(start.ids[key], NS), 'allow-custom-value': true, 'data-icon-family': key }, suggestions.map((name) => h('tanrei-option', { value: name, label: name })));
    input.addEventListener('input', () => families(input.inputValue).length && set({ [key]: families(input.inputValue) }, true));
    input.addEventListener('change', () => families(input.value).length && set({ [key]: families(input.value) }));
    const note = availabilityNote(ctx, { 'data-icon-note': key });
    const el = h('div', { class: 'ts-stack', 'data-icon-field': key }, input, note.el);
    return { el, input, note };
  };
  // One family or two: the fields of the kind that is not chosen are written when it is.
  const fields = h('div', { class: 'ts-stack' });
  const made: Partial<Record<'family' | 'unselected' | 'selected', ReturnType<typeof familyField>>> = {};
  const fieldOf = (key: 'family' | 'unselected' | 'selected') => {
    if (!made[key]) fields.append((made[key] = familyField(key, key === 'family' ? SUGGESTED_FAMILIES.icon : [...SUGGESTED_FAMILIES.iconStatic, ...SUGGESTED_FAMILIES.icon])).el);
    return made[key]!;
  };

  const weight = numberWidget(ctx, { label: t.named(t.icons.weight, t.dials.value), rangeLabel: t.icons.weight, value: start.weight, min: 100, max: 700, step: 100, digits: 0, range: true, attrs: { class: 'ts-num' }, rangeAttrs: { 'data-icon-weight': true }, onchange: (live) => weight.get() !== undefined && set({ weight: weight.get() }, live) });
  const fill = (key: 'fillUnselected' | 'fillSelected') => {
    const field = numberWidget(ctx, { label: t.icons.fills[key], labelHidden: false, value: start[key], min: 0, max: 1, step: 0.05, attrs: { 'data-icon-fill': key }, onchange: (live) => field.get() !== undefined && set({ [key]: field.get() }, live) });
    return field;
  };
  const fills = { fillUnselected: fill('fillUnselected'), fillSelected: fill('fillSelected') };
  const fillsHelp = h('p', { class: 'ts-help' });

  const resetAll = linkButton(t.resetAll, () => ctx.commit(studio.resetGroup(ctx.layer(), 'icons')), { 'data-reset-icons': true });
  const refresh = () => {
    const current = now();
    mode.value = current.mode;
    modeHelp.textContent = t.icons.modeHelp[current.mode];
    for (const key of current.mode === 'variable' ? (['family'] as const) : (['unselected', 'selected'] as const)) fieldOf(key);
    fillsHelp.textContent = current.mode === 'static' ? t.icons.fillsStatic : t.icons.fillsVariable;
    for (const key of ['family', 'unselected', 'selected'] as const) {
      const entry = made[key];
      if (!entry) continue;
      entry.el.hidden = (key === 'family') !== (current.mode === 'variable');
      const value: string[] = current[key] ?? [];
      if (document.activeElement !== entry.input) entry.input.value = value.join(', ');
      entry.note.check(entry.el.hidden ? undefined : value[0]);
    }
    weight.sync(current.weight);
    for (const [key, field] of Object.entries(fills)) field.sync(current[key]);
    resetAll.hidden = !current.anyChanged;
  };
  refresh();
  ctx.onUpdate(refresh);

  return panel(
    ctx,
    { title: t.icons.title, help: t.icons.help, key: 'icons', actions: [resetAll] },
    h('div', { class: 'ts-stack', 'data-icons': true }, mode, modeHelp, fields),
    h('div', { class: 'ts-row ts-row-first' }, h('div', { class: 'ts-row-head' }, h('div', { class: 'ts-row-title' }, t.icons.weight, h('small', {}, rich((at) => t.listed(at(h('code', { text: short(start.ids.weight, NS) })), t.icons.weightNote)))), weight.number), weight.slider),
    h('div', { class: 'ts-grid-2' }, fills.fillUnselected.el, fills.fillSelected.el),
    fillsHelp,
    reason.el,
  );
}

// ── shape ────────────────────────────────────────────────────────────────────────────────────────
/** Corner smoothing: one slider, 0–1 with Figma's meaning, over `sys.shape.corner-smoothing`. */
export function shapePanel(ctx: Ctx) {
  const { t, studio } = ctx;
  const NS = studio.namespace;
  const reason = groupReason(ctx, 'shape');
  const now = () => studio.cornerSmoothing(ctx.layer()) as Json;
  const start = now();
  const amount = numberWidget(ctx, { label: t.named(t.shape.smoothing, t.dials.value), rangeLabel: t.shape.smoothing, value: start.value, min: CORNER_SMOOTHING.min, max: CORNER_SMOOTHING.max, step: CORNER_SMOOTHING.step, range: true, attrs: { class: 'ts-num' }, rangeAttrs: { 'data-corner-smoothing': true }, onchange: (live) => amount.get() !== undefined && ctx.commit(studio.setCornerSmoothing(ctx.layer(), amount.get(), reason.value()), { preview: live }) });
  const state = h('small');
  const reset = linkButton(t.reset, () => ctx.commit(studio.applyOperation(ctx.layer(), start.id, null).layer), { 'aria-label': t.labelled(t.reset, t.shape.smoothing) });
  const row = h(
    'div',
    { class: 'ts-row ts-row-first', 'data-shape-row': 'corner-smoothing' },
    h('div', { class: 'ts-row-head' }, h('div', { class: 'ts-row-title' }, t.shape.smoothing, h('small', {}, rich((at) => t.listed(t.listed(at(h('code', { text: short(start.id, NS) })), t.shape.smoothingNote), at(state))))), amount.number, reset),
    amount.slider,
    // The one number worth remembering, next to the control: what Figma calls 60 %.
    h('p', { class: 'ts-hint', 'data-shape-hint': 'corner-smoothing', text: t.shape.smoothingHint }),
    // The token's own description, word for word.
    h('p', { class: 'ts-help' }, isolated(start.description ?? '')),
  );
  const resetAll = linkButton(t.resetAll, () => ctx.commit(studio.resetGroup(ctx.layer(), 'shape')), { 'data-reset-shape': true });
  const refresh = () => {
    const current = now();
    amount.sync(current.value);
    row.toggleAttribute('data-changed', current.changed);
    reset.hidden = resetAll.hidden = !current.changed;
    state.replaceChildren(...(current.changed ? rich((at) => t.listed(t.changed, t.shape.baseSays(at(ltr(trim(current.base)))))) : [t.inherited]));
  };
  refresh();
  ctx.onUpdate(refresh);
  return panel(ctx, { title: t.shape.title, help: t.shape.help, key: 'shape', actions: [resetAll] }, h('div', { class: 'ts-rows', 'data-shape': true }, row), reason.el);
}

// ── behaviour ────────────────────────────────────────────────────────────────────────────────────
export function behaviourPanel(ctx: Ctx) {
  const { t, studio } = ctx;
  const NS = studio.namespace;
  const reason = groupReason(ctx, 'behavior');
  const rows = (studio.behaviors(ctx.layer()) as Json[]).map((entry) => {
    const now = () => (studio.behaviors(ctx.layer()) as Json[]).find((each) => each.id === entry.id) ?? entry;
    const names = choice<string>({ label: t.behavior.names[entry.key] ?? entry.key, attrs: { 'data-behavior': entry.key }, options: entry.values.map((name: string) => ({ value: name, label: name })), value: entry.value, onchange: (name) => ctx.commit(studio.setBehavior(ctx.layer(), entry.id, name, reason.value())) });
    const state = h('small');
    const reset = linkButton(t.reset, () => ctx.commit(studio.applyOperation(ctx.layer(), entry.id, null).layer), { 'aria-label': t.labelled(t.reset, entry.key) });
    // What the BUILD says about this choice (checkInvariants: e.g. "dim" while every pressed opacity is 1 draws
    // nothing) is said here, next to the control, word for word — with the way to each token it names. The Studio
    // has no opinion of its own about which choices are traps.
    const hint = h('p', { class: 'ts-hint', hidden: true, 'data-behavior-hint': entry.key });
    const about = `${short(entry.id, NS)} `;
    const row = h(
      'div',
      { class: 'ts-row', 'data-behavior-row': entry.key },
      h('div', { class: 'ts-row-head' }, h('div', { class: 'ts-row-title' }, t.behavior.names[entry.key] ?? entry.key, h('small', {}, rich((at) => t.listed(at(h('code', { text: short(entry.id, NS) })), at(state))))), reset),
      names,
      // The token's own description: what each name means, word for word.
      h('p', { class: 'ts-help' }, isolated(entry.description ?? '')),
      hint,
    );
    const refresh = () => {
      const current = now();
      names.value = current.value;
      row.toggleAttribute('data-changed', current.changed);
      reset.hidden = !current.changed;
      state.replaceChildren(...(current.changed ? rich((at) => t.listed(t.changed, t.behavior.baseSays(at(ltr(String(current.base)))))) : [t.inherited]));
      const said = (ctx.view().warnings as string[]).filter((warning) => warning.startsWith(about));
      hint.hidden = !said.length;
      const tokens = ctx.view().model.tokens;
      // A token id inside the message becomes the way to that token; everything else stays as the build wrote it.
      const words = (warning: string) => warning.split(new RegExp(`(${NS}\\.[a-z0-9.-]*[a-z0-9])`)).map((part) => (part in tokens ? linkButton(short(part, NS), () => ctx.setLevel('tokens', { token: part }), { class: 'ts-link ts-link-mono' }) : part));
      // The build's sentence is one run of its own direction: its commas and brackets stay where it put them.
      hint.replaceChildren(...said.flatMap((warning, index) => [index ? h('br') : '', h('bdi', {}, words(warning))]));
    };
    refresh();
    ctx.onUpdate(refresh);
    return row;
  });
  const resetAll = linkButton(t.resetAll, () => ctx.commit(studio.resetGroup(ctx.layer(), 'behavior')), { 'data-reset-behavior': true });
  return panel(ctx, { title: t.behavior.title, help: t.behavior.help, key: 'behavior', actions: [resetAll] }, h('div', { class: 'ts-rows', 'data-behaviors': true }, rows), reason.el);
}
