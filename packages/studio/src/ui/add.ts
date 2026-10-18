// Add…: a step in a series, a value on a component axis, a token of the layer's own. Every flow builds a
// `{ vocabulary, tokens? }` fragment in the shapes `extensionRecipes` (@tanrei/token-engine) describes, shows what it
// would resolve to BEFORE it is written, and writes nothing without a rationale.
import { KEY_PATTERN, MIN_REASON } from '../core.js';
import { type Ctx, type Json, button, cssColor, fold, folds, format, h, isolated, linkButton, ltr, panel, rich, short, textField, views } from './dom';
import { tokenEditor } from './editor';
import { type Widget, comboWidget, literalWidget, mulWidget, numberWidget, reasonWidget, selectWidget, toneWidget, tokenSelect } from './widgets';

type Flow = 'step' | 'axis' | 'own';
const TYPES = ['dimension', 'color', 'number', 'duration', 'typography', 'shadow', 'cubicBezier', 'fontFamily', 'fontWeight'];
const NUMERIC = ['dimension', 'number', 'duration'];

/** Tokens of one axis value, in the axis' member order (a size) or every resting part (a variant). */
function membersOf(view: Json, NS: string, component: string, axis: string, value: string): string[] {
  const declared = view.model.components[component];
  if (!declared) return [];
  const prefix = `${NS}.comp.${component}`;
  if (declared.axes[axis]?.from === 'states') return Object.keys(view.model.tokens).filter((id) => id.startsWith(`${prefix}.${value}.`));
  return (declared.axes[axis]?.members ?? []).map((member: string) => `${prefix}.${member}.${value}`);
}

function valueCell(view: Json, id: string) {
  const token = view.model.tokens[id];
  return h('span', { class: 'ts-value' }, token?.type === 'color' ? h('tanrei-swatch', { class: 'ts-token-swatch', decorative: true, size: 'small', shape: 'circle', color: cssColor(token.value) }) : null, format(token?.type, token?.value));
}

/**
 * The members of an axis value with their resolved values. `editable`: an accordion, each member opening the generic
 * editor — a member valued by a pattern rule is an item that cannot be opened here. Otherwise plain rows (a dry run).
 */
function membersTable(ctx: Ctx, view: Json, ids: string[], { editable }: { editable: boolean }) {
  const NS = ctx.studio.namespace;
  const rows = ids.map((id) => {
    const token = view.model.tokens[id];
    // "by pattern rule" is a word of the language; where a member points is an id.
    const how = token?.state ? ctx.t.add.byRule : token?.alias ? ltr(`→ ${short(token.alias, NS)}`) : null;
    const name = h('code', { text: short(id, NS).split('.').slice(2).join('.') });
    if (!editable) return h('div', { class: 'ts-member', 'data-member': id }, name, valueCell(view, id), how ? h('small', {}, how) : null);
    const value = h('span', {}, valueCell(view, id));
    const details = fold({ label: name, supporting: how, trailing: value, disabled: Boolean(token?.state), attrs: { 'data-member': id } });
    if (token?.state) return details;
    details.addEventListener('toggle', () => details.open && details.children.length === 1 && details.append(tokenEditor(ctx, id, { compact: true })));
    ctx.onUpdate(() => value.replaceChildren(valueCell(ctx.view(), id)));
    return details;
  });
  return h('div', { class: 'ts-members', 'data-members': true }, editable ? folds({}, rows) : rows);
}

const warningsFor = (view: Json, needle: string) => (view.warnings as string[]).filter((warning) => warning.includes(needle));

/** What this layer has added so far: every declaration, editable, with the tokens it created. */
export function extensionsPanel(ctx: Ctx) {
  const { t, studio } = ctx;
  const NS = studio.namespace;
  const entries = Object.entries((ctx.layer().vocabulary ?? {}) as Json);
  if (!entries.length) return null;
  const rows = entries.map(([id, declaration]: [string, Json]) => {
    const isAxis = 'from' in declaration;
    const [, , component, axis, value] = id.split('.');
    const warnings = h('ul', { class: 'ts-warnings ts-warnings-inline' });
    const refresh = () => warnings.replaceChildren(...warningsFor(ctx.view(), isAxis ? `.${value}` : id).map((warning) => h('li', {}, isolated(warning))));
    refresh();
    ctx.onUpdate(refresh);
    const save = (patch: Json) => {
      const result = studio.setDeclaration(ctx.layer(), id, { ...ctx.layer().vocabulary[id], ...patch }) as Json;
      if (!result.problem) ctx.commit(result.layer);
    };
    const rationale = textField({ label: t.add.rationale.replace(/\s*[（(][^）)]*[）)]\s*$/, ''), value: declaration.rationale, attrs: { required: true, 'error-text': t.add.rationaleShort, 'data-extension-rationale': true }, oninput: (value) => ((rationale.error = value.trim().length < MIN_REASON), save({ rationale: value })) });
    const scale = isAxis && axis === 'size' && typeof (declaration.scale ?? 1) === 'number' ? numberWidget(ctx, { label: t.add.scale, labelHidden: false, value: declaration.scale ?? 1, min: 0.25, max: 4, step: 0.05, unit: '×', onchange: () => scale!.get() && save({ scale: scale!.get() }) }) : null;
    const body = isAxis ? membersTable(ctx, ctx.view(), membersOf(ctx.view(), NS, component, axis, value), { editable: true }) : tokenEditor(ctx, id, { compact: true });
    const details = fold(
      { label: h('code', { text: short(id, NS) }), supporting: isAxis ? rich((at) => t.add.fromSource(at(ltr(`${declaration.from}${declaration.scale && typeof declaration.scale === 'number' ? ` × ${declaration.scale}` : ''}`)))) : ltr(declaration.$type), attrs: { 'data-extension': id } },
      h('div', { class: 'ts-stack' }, rationale, scale ? scale.el : null, isAxis && axis === 'variant' ? h('p', { class: 'ts-help', text: t.add.variantStates }) : null, body, warnings, h('div', { class: 'ts-row-actions' }, linkButton(t.add.remove, () => ctx.commit(studio.removeExtension(ctx.layer(), id), { rebuild: true }), { 'aria-label': t.labelled(t.add.remove, id) }))),
    );
    return details;
  });
  return panel(ctx, { title: t.add.yours, code: 'vocabulary', help: t.add.yoursHelp, key: 'extensions' }, folds({}, rows));
}

/** `$value` alias | `derive` | literal + reason: how a declared token gets its value. */
function definitionWidget(ctx: Ctx, { type, targets, neighbour, onchange }: { type: string; targets: string[]; neighbour?: Json; onchange: () => void }): Widget<Json> {
  const { t } = ctx;
  const kinds = type === 'color' ? (neighbour?.role ? ['derive', 'alias'] : ['alias', 'literal']) : NUMERIC.includes(type) ? ['derive', 'alias', 'literal'] : ['alias', 'literal'];
  const holder = h('div', { class: 'ts-stack' });
  let get: () => Json | undefined = () => undefined;
  const draw = (kind: string) => {
    if (kind === 'alias') {
      const target = tokenSelect(ctx, { label: t.editor.target, ids: targets, value: targets[0], onchange });
      holder.replaceChildren(target.el);
      get = () => (target.get() ? { $value: target.get() } : undefined);
    } else if (kind === 'derive') {
      const rule = type === 'color' ? toneWidget(ctx, { rule: neighbour?.rule, onchange }) : mulWidget(ctx, { type, rule: neighbour?.rule?.fn === 'mul' ? neighbour.rule : undefined, onchange });
      holder.replaceChildren(rule.el);
      get = () => (rule.get() ? { derive: rule.get() } : undefined);
    } else {
      const literal = literalWidget(ctx, { type, value: neighbour?.value, onchange });
      const reason = reasonWidget(ctx, { label: t.editor.reason, placeholder: t.editor.reasonPlaceholder, hint: t.editor.reasonShort, onchange });
      holder.replaceChildren(literal.el, reason.el);
      get = () => (literal.get() !== undefined && reason.get() ? { $value: literal.get(), reason: reason.get() } : undefined);
    }
  };
  const kind = views({ label: t.add.definition, attrs: { 'data-add-definition': true }, options: kinds.map((kind) => ({ value: kind, label: t.add.kinds[kind] })), value: kinds[0], onchange: (kind) => (draw(kind), onchange()) });
  draw(kinds[0]);
  return { el: h('div', { class: 'ts-stack' }, kind, holder), get: () => get() };
}

export function addPanel(ctx: Ctx, focusToken?: string) {
  const { t, studio } = ctx;
  const NS = studio.namespace;
  const body = h('div', { class: 'ts-stack', 'data-add-body': true });
  const hint = focusToken ? (studio.describe(ctx.view(), focusToken) as Json | null) : null;
  let flow: Flow = hint?.descriptor.axis ? 'axis' : hint && hint.token.path[0] === 'sys' ? 'step' : hint ? 'own' : 'axis';

  function draw() {
    const view = ctx.view();
    const name = textField({ label: flow === 'step' ? t.add.stepName : flow === 'axis' ? t.add.valueName : t.add.part, placeholder: flow === 'own' ? 'star.size' : undefined, attrs: { 'data-add-name': true }, oninput: () => update() });
    const rationale = reasonWidget(ctx, { label: t.add.rationale, placeholder: t.add.rationalePlaceholder, hint: t.add.rationaleShort, onchange: () => update() });
    const idLine = h('p', { class: 'ts-writes' });
    const result = h('div', { class: 'ts-stack', 'data-add-result': true });
    const problem = h('p', { class: 'ts-error', role: 'alert', 'data-add-problem': true });
    const add = button(t.add.add, () => submit(), { primary: true, 'data-add-submit': true });
    let fragment: () => { id: string; write: Json } | undefined = () => undefined;
    const controls: (HTMLElement | null)[] = [];

    if (flow === 'step') {
      const all = studio.series(view) as Json[];
      const initial = hint ? all.find((s) => s.steps.includes(hint.token.id)) : undefined;
      const series = selectWidget(ctx, { label: t.add.series, attrs: { 'data-add-series': true }, options: all.map((s) => ({ value: s.id, label: short(s.id, NS), supportingText: `${s.type} · ${s.steps.length}` })), value: (initial ?? all.find((x) => x.id.endsWith('.space')) ?? all[0])?.id, onchange: () => drawDefinition() });
      const holder = h('div');
      let definition: Widget<Json> | undefined;
      let onRole: Widget<string> | null = null;
      const drawDefinition = () => {
        const chosen = all.find((s) => s.id === series.get())!;
        const neighbourId = chosen.steps.at(-1);
        const neighbour = view.model.tokens[neighbourId];
        const isColor = chosen.type === 'color';
        const described = isColor ? (studio.describe(view, neighbourId) as Json) : null;
        definition = definitionWidget(ctx, { type: chosen.type, targets: chosen.steps, neighbour: { rule: described?.descriptor.rule ?? neighbour.derive, value: neighbour.value, role: isColor }, onchange: () => update() });
        onRole = isColor ? tokenSelect(ctx, { label: t.add.onRole, ids: chosen.steps.filter((id: string) => id.includes('.on-')), value: `${NS}.sys.color.on-surface`, onchange: () => update() }) : null;
        holder.replaceChildren(definition.el, onRole ? onRole.el : '');
        update();
      };
      controls.push(series.el, name, holder);
      fragment = () => {
        const chosen = all.find((s) => s.id === series.get())!;
        const value = definition?.get();
        if (!value) return undefined;
        const id = `${chosen.id}.${name.value.trim()}`;
        return { id, write: { vocabulary: { [id]: { $type: chosen.type, rationale: rationale.get() ?? '', ...value, ...(onRole?.get() ? { onRole: onRole.get()!.slice(1, -1) } : {}) } } } };
      };
      queueMicrotask(drawDefinition);
    } else if (flow === 'axis') {
      const components = Object.entries(view.model.components as Json);
      const axes = components.flatMap(([component, declared]: [string, Json]) => Object.keys(declared.axes).map((axis) => ({ key: `${component}.${axis}`, component, axis, values: declared.axes[axis].from === 'states' ? (declared.states?.variants ?? []) : declared.axes[axis].values })));
      const initial = hint?.descriptor.axis ? hint.descriptor.axis.id.split('.').slice(2).join('.') : axes[0]?.key;
      // About fifty axes, found by typing: a combobox. What it names decides the options of "from".
      const axis = comboWidget(ctx, { label: t.add.axis, attrs: { 'data-add-axis': true }, options: axes.map((a) => ({ value: a.key, label: t.listed(a.component, t.add.axes[a.axis] ?? a.axis) })), value: initial, onchange: () => axis.get() && drawFrom() });
      const from = selectWidget(ctx, { label: t.add.from, attrs: { 'data-add-from': true }, options: [], onchange: () => update() });
      const scale = numberWidget(ctx, { label: t.add.scale, labelHidden: false, value: 1.5, min: 0.25, max: 4, step: 0.05, unit: '×', onchange: () => update() });
      const scaleField = scale.el;
      let chosenAxis = axes.find((a) => a.key === initial) ?? axes[0];
      const current = () => (chosenAxis = axes.find((a) => a.key === axis.get()) ?? chosenAxis);
      const drawFrom = () => {
        const chosen = current();
        const wanted = hint?.descriptor.axis?.key;
        from.setOptions(chosen.values.map((value: string) => ({ value, label: value })), chosen.values.includes(wanted) ? wanted : chosen.values.at(-1));
        scaleField.hidden = chosen.axis !== 'size';
        update();
      };
      controls.push(axis.el, h('div', { class: 'ts-grid-2' }, name, from.el), scaleField);
      fragment = () => {
        const chosen = current();
        const id = `${NS}.comp.${chosen.component}.${chosen.axis}.${name.value.trim()}`;
        return { id, write: { vocabulary: { [id]: { from: from.get(), ...(chosen.axis === 'size' ? { scale: scale.get() ?? 1 } : {}), rationale: rationale.get() ?? '' } } } };
      };
      queueMicrotask(drawFrom);
    } else {
      const component = textField({ label: t.add.component, placeholder: 'rating', attrs: { 'data-add-component': true }, oninput: () => update() });
      const type = selectWidget(ctx, { label: '$type', attrs: { 'data-add-type': true }, options: TYPES.map((value) => ({ value, label: value })), value: TYPES.includes(hint?.token.type) ? hint!.token.type : 'dimension', onchange: () => drawDefinition() });
      const holder = h('div');
      let definition: Widget<Json> | undefined;
      const drawDefinition = () => {
        const targets = (Object.values(view.model.tokens) as Json[]).filter((token) => token.type === type.get() && !token.state && !(token.path[0] === 'ref' && type.get() === 'color')).map((token) => token.id);
        if (hint && targets.includes(hint.token.id)) targets.unshift(...targets.splice(targets.indexOf(hint.token.id), 1));
        definition = definitionWidget(ctx, { type: type.get(), targets, neighbour: { value: targets[0] ? view.model.tokens[targets[0]].value : undefined }, onchange: () => update() });
        holder.replaceChildren(definition.el);
        update();
      };
      controls.push(h('p', { class: 'ts-help', text: t.add.ownHelp.replace('{id}', ctx.layer().id) }), h('div', { class: 'ts-grid-2' }, component, name), type.el, holder);
      fragment = () => {
        const value = definition?.get();
        if (!value) return undefined;
        const id = `${ctx.layer().id}.comp.${component.value.trim()}.${name.value.trim()}`;
        return { id, write: { vocabulary: { [id]: { $type: type.get(), rationale: rationale.get() ?? '', ...value } } } };
      };
      queueMicrotask(drawDefinition);
    }

    /** Try the fragment on a copy of the layer: the id, what it would resolve to, the build's warnings about it. */
    function update() {
      const candidate = fragment();
      const named = candidate && candidate.id.split('.').slice(1).every((segment) => KEY_PATTERN.test(segment));
      idLine.replaceChildren(...rich((at) => t.labelled(t.add.declares, at(h('b', { text: candidate && named ? candidate.id : '…' })))));
      problem.textContent = '';
      result.replaceChildren();
      add.disabled = true;
      if (!candidate || !named) return;
      // The dry run needs a rationale the engine accepts; the real one is checked again when it is written.
      const trial = JSON.parse(JSON.stringify(candidate.write));
      for (const declaration of Object.values(trial.vocabulary) as Json[]) if ((declaration.rationale ?? '').length < MIN_REASON) declaration.rationale = 'a dry run in Theme Studio';
      const tried = studio.addExtension(ctx.layer(), trial) as Json;
      if (tried.problem) return void problem.replaceChildren(isolated(tried.problem));
      const after = studio.preview(tried.layer) as Json;
      if (!after.model) return void problem.replaceChildren(isolated(after.problems.at(-1) ?? ''));
      if (flow === 'axis') {
        const [, , component, axis, value] = candidate.id.split('.');
        result.append(h('p', { class: 'ts-subhead', text: t.add.members }), membersTable(ctx, after, membersOf(after, NS, component, axis, value), { editable: false }), h('p', { class: 'ts-help', text: axis === 'size' ? t.add.sizeHelp : t.add.variantHelp }));
        const warnings = warningsFor(after, `.${value}`);
        if (warnings.length) result.append(h('ul', { class: 'ts-warnings ts-warnings-inline', 'data-add-warnings': true }, warnings.map((warning) => h('li', {}, isolated(warning)))));
      } else result.append(h('p', { class: 'ts-writes' }, rich((at) => t.labelled(t.editor.resolves, at(h('b', {}, valueCell(after, candidate.id)))))));
      add.disabled = !rationale.get();
    }

    function submit() {
      const candidate = fragment();
      if (!candidate) return;
      const written = studio.addExtension(ctx.layer(), candidate.write) as Json;
      if (written.problem) return void problem.replaceChildren(isolated(written.problem));
      ctx.commit(written.layer, { rebuild: true });
      ctx.announce(t.add.added(candidate.id));
    }

    body.replaceChildren(...(controls.filter(Boolean) as HTMLElement[]), rationale.el, idLine, result, problem, h('div', { class: 'ts-actions' }, add));
    update();
  }

  const tabs = views<Flow>({ label: t.add.title, attrs: { 'data-add-flow': true }, options: (['axis', 'step', 'own'] as Flow[]).map((value) => ({ value, label: t.add.flows[value] })), value: flow, onchange: (value) => ((flow = value), draw()) });
  draw();
  return panel(ctx, { title: t.add.title, code: 'vocabulary', help: t.add.help, key: 'add' }, tabs, body);
}
