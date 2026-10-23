// One generic token editor. What it offers comes from `legalOperations(descriptor)` (@tanrei/token-engine, through
// core.describe): the Studio has no per-token controls — a dial, a Button height and a hover color are all "a token
// and the operations that are legal on it".
import { MIN_REASON } from '../core.js';
import { type Ctx, type Json, button, cssColor, format, h, isolated, linkButton, ltr, rich, short, tabbed } from './dom';
import { type Change, type Widget, jsonWidget, literalWidget, mulWidget, numberWidget, reasonWidget, stateRuleWidget, toneWidget, tokenSelect } from './widgets';

const isRef = (v: unknown) => typeof v === 'string' && /^\{[^}]+\}$/.test(v);

/** Which of the offered operations the written one is. */
function writtenKind(d: Json): string | undefined {
  const op = d.written;
  if (!op) return undefined;
  if (d.token.path[0] === 'dial' && '$value' in op && !isRef(op.$value)) return 'set the dial';
  if ('scale' in op) return 'scale';
  if ('derive' in op && !('$value' in op)) return 'derive';
  if ('$value' in op && Object.keys(op).every((key) => ['$value', 'reason'].includes(key))) return isRef(op.$value) ? 're-point alias' : d.token.enum ? 'choose' : d.token.type === 'fontFamily' ? 'set the font stack' : 'pin $value';
  return 'json';
}

/**
 * The form of one operation. `write(op)` is called with a complete operation whenever the form holds one;
 * a form that is not complete yet (a pin without its reason) writes nothing and says why.
 */
function operationForm(ctx: Ctx, d: Json, kind: string, write: (op: Json | null, live?: boolean) => void): HTMLElement {
  const { t, studio } = ctx;
  const { token, written, descriptor } = d;
  const id: string = token.id;
  const assertion = written?.$type ? { $type: written.$type } : {};
  // The fields of one operation are one set (each names itself): a field group, named by the operation.
  const group = (...fields: (HTMLElement | null)[]) => h('tanrei-field-group', { label: t.editor.ops[kind] ?? kind, 'label-hidden': true, spacing: 'fields' }, fields);
  const form = (widgets: Widget[], make: () => Json | undefined) => ({ el: group(...widgets.map((widget) => widget.el)), fire: (live?: boolean) => { const op = make(); if (op) write({ ...assertion, ...op }, live); } });
  let current: { el: HTMLElement; fire: (live?: boolean) => void };
  const onchange: Change = (live) => current.fire(live);

  if (kind === 'set the dial') {
    const dial = studio.dials(ctx.layer()).find((entry: Json) => entry.id === id)!;
    const value = numberWidget(ctx, { label: t.editor.value, value: dial.value, min: dial.min, max: dial.max, step: dial.step, unit: dial.unit, range: true, onchange });
    const reason = h('tanrei-text-field', { label: t.dials.reason, placeholder: t.dials.reasonPlaceholder, autocomplete: 'off' });
    reason.value = dial.reason ?? '';
    reason.addEventListener('input', () => onchange(true));
    reason.addEventListener('change', () => onchange());
    current = { el: group(value.el, reason), fire: (live) => value.get() !== undefined && write({ $value: dial.type === 'number' ? value.get() : { value: value.get(), unit: dial.unit }, reason: reason.value }, live) };
  } else if (kind === 'scale') {
    const factor = numberWidget(ctx, { label: t.editor.scale, value: typeof written?.scale === 'number' ? written.scale : 1, min: 0.25, max: 4, step: 0.05, unit: '×', range: true, onchange });
    current = form([factor], () => (factor.get() && factor.get()! > 0 ? { scale: factor.get() } : undefined));
  } else if (kind === 're-point alias') {
    const target = tokenSelect(ctx, { label: t.editor.target, ids: studio.aliasTargets(ctx.view(), id), value: isRef(written?.$value) ? written.$value : token.alias, allowEmpty: token.alias ? undefined : t.editor.pick, onchange });
    current = form([target], () => (target.get() ? { $value: target.get() } : undefined));
  } else if (kind === 'pin $value' || kind === 'choose' || kind === 'set the font stack') {
    // The same operation under three names (@tanrei/token-engine): a literal `$value` with its reason. A choice of
    // kind is picked by NAME and a font stack is edited as a list — `literalWidget` knows which from the token.
    const pinned = written && '$value' in written && !isRef(written.$value);
    const literal = literalWidget(ctx, { type: token.type, token, value: pinned && token.type !== 'typography' ? written.$value : token.value, onchange });
    const reason = reasonWidget(ctx, { label: t.editor.reason, value: pinned ? written.reason : '', placeholder: t.editor.reasonPlaceholder, hint: t.editor.reasonShort, onchange });
    current = form([literal, reason], () => (literal.get() !== undefined && reason.get() ? { $value: literal.get(), reason: reason.get() } : undefined));
  } else if (kind === 'derive') {
    const rule = written?.derive ?? descriptor.rule;
    if (id.startsWith(`${studio.namespace}.sys.color.`)) {
      const tone = toneWidget(ctx, { rule, onchange });
      current = form([tone], () => (tone.get() ? { derive: tone.get() } : undefined));
    } else if (descriptor.state && token.type === 'color') {
      const state = stateRuleWidget(ctx, { id, rule, onchange });
      current = form([state], () => (state.get() ? { derive: state.get() } : undefined));
    } else if (token.type === 'typography') {
      const size = mulWidget(ctx, { type: 'typography', rule: rule?.fontSize, onchange });
      current = form([size], () => (size.get() ? { derive: { fontSize: size.get() } } : undefined));
    } else if (['dimension', 'number', 'duration'].includes(token.type)) {
      const mul = mulWidget(ctx, { type: token.type, rule: rule?.fn === 'mul' ? rule : undefined, onchange });
      current = form([mul], () => (mul.get() ? { derive: mul.get() } : undefined));
    } else {
      const raw = jsonWidget({ label: 'derive', value: rule ?? {}, onchange });
      current = form([raw], () => (raw.get() && typeof raw.get() === 'object' ? { derive: raw.get() } : undefined));
    }
  } else {
    // Any operation the schema allows — a `$type` assertion, `$value` and `derive` together on a text style…
    const raw = jsonWidget({ label: t.editor.json, value: written ?? d.operations.find((o: Json) => o.write?.tokens)?.write.tokens[id] ?? {}, rows: 7, onchange });
    current = { el: raw.el, fire: (live) => raw.get() && typeof raw.get() === 'object' && write(raw.get() as Json, live) };
  }
  return current.el;
}

/** Whether a pointer is down: read where a redraw must not move what is under it. */
let pressing = false;
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', () => (pressing = true), true);
  for (const end of ['pointerup', 'pointercancel']) document.addEventListener(end, () => (pressing = false), true);
}

/** Operations that are edits of this token; the others are pointers to where the change is made. */
const FORMS = ['set the dial', 'choose', 'set the font stack', 'scale', 're-point alias', 'pin $value', 'derive'];

/**
 * The editor of one token: tabs for the legal operations, the form of the chosen one, what it writes, and revert.
 * Rebuilds itself after an edit once focus leaves it, because an operation can change which operations are legal.
 */
export function tokenEditor(ctx: Ctx, id: string, { compact = false }: { compact?: boolean } = {}): HTMLElement {
  const { t, studio } = ctx;
  const host = h('div', { class: 'ts-editor', 'data-editor': id });
  let chosen: string | undefined;
  let dirty = false;

  let row: ReturnType<typeof tabbed> | undefined;

  function draw() {
    dirty = false;
    const d = studio.describe(ctx.view(), id) as Json | null;
    if (!d) return host.replaceChildren(h('p', { class: 'ts-help', text: t.editor.gone }));
    const offered: Json[] = d.operations.filter((o: Json) => FORMS.includes(o.op));
    // A generated token (a palette tone) has no operation of its own: only pointers to where the change is made.
    const kinds = offered.length || d.written ? [...new Set([...offered.map((o) => o.op), 'json'])] : [];
    const active = chosen && kinds.includes(chosen) ? chosen : (writtenKind(d) ?? kinds[0]);
    const writes = h('p', { class: 'ts-writes' });
    const problem = h('p', { class: 'ts-error', role: 'alert' });
    const showWrites = () => {
      const written = ctx.layer().tokens?.[id];
      writes.replaceChildren(...(written ? rich((at) => t.labelled(t.editor.writes, at(h('b', { text: JSON.stringify(written) })))) : [t.labelled(t.editor.writes, t.editor.nothing)]));
    };
    const write = (op: Json | null, live?: boolean) => {
      const result = studio.applyOperation(ctx.layer(), id, op) as Json;
      problem.textContent = result.problem === 'reason' ? t.editor.reasonShort : '';
      if (result.problem) return;
      dirty = true;
      ctx.commit(result.layer, { preview: live });
      const failed = ctx.latest().model ? '' : ctx.latest().problems.at(-1);
      problem.replaceChildren(failed ? isolated(failed) : '');
      showWrites();
    };
    showWrites();
    const effect = offered.find((o) => o.op === active)?.effect ?? (active === 'json' ? t.editor.jsonHelp : '');
    const pointers: Json[] = d.operations.filter((o: Json) => !FORMS.includes(o.op) && o.op !== 'revert to inherited');
    // The operations are tabs: one row, and the panel of the chosen one (its form and what it writes). The row is
    // kept while the same operations are offered: an arrow key moves focus with the selection, and the tab it lands
    // on must still be there.
    const keys = kinds.join('\n');
    if (!kinds.length) row = undefined;
    else if (row?.keys !== keys) row = tabbed({ label: t.editor.operations, tabs: kinds.map((kind) => ({ key: kind, label: t.editor.ops[kind] ?? kind })), select: (kind) => ((chosen = kind), draw()) });
    // What the operation does is the engine's sentence: a run of its own direction.
    row?.show(active, [h('p', { class: 'ts-row-note' }, isolated(effect)), operationForm(ctx, d, active, write), problem, writes]);
    // (`replaceChildren` is the DOM's, not `h`: it would print a `null` child as the text "null".)
    const parts: (HTMLElement | null)[] = [
      row?.el ?? problem,
      h('div', { class: 'ts-row-actions' }, d.written ? linkButton(t.editor.revert, () => (write(null), (chosen = undefined), draw())) : null),
      !compact && pointers.length
        ? h(
            'ul',
            { class: 'ts-pointers' },
            pointers.map((o) =>
              h(
                'li',
                {},
                // The effect is the engine's sentence, in English in every language.
                rich((at) => t.named(at(h('b', { text: t.editor.ops[o.op] ?? o.op })), at(isolated(o.effect ?? '')))),
                ' ',
                o.op === 'pattern rule' ? linkButton(t.editor.toRules, () => ctx.show({ inspect: 'tokens', panel: 'rules' })) : null,
                o.op === 'change the palette' || o.op === 'declare a palette' ? linkButton(t.editor.toColor, () => ctx.show({ section: 'palettes' })) : null,
                o.op === 'declare a single role' ? linkButton(t.editor.toAdd, () => ctx.show({ section: 'vocabulary', panel: 'add' })) : null,
              ),
            ),
          )
        : null,
    ];
    const [first, ...rest] = parts.filter((part): part is HTMLElement => Boolean(part));
    // A row that stays is not taken out and put back: it would lose the keyboard.
    if (first === row?.el && host.firstElementChild === first) {
      while (first.nextSibling) first.nextSibling.remove();
      host.append(...rest);
    } else host.replaceChildren(first, ...rest);
  }
  host.addEventListener('focusout', (event) => {
    if (!dirty || host.contains(event.relatedTarget as Node | null)) return;
    const redraw = () => host.isConnected && dirty && !host.contains(document.activeElement) && draw();
    // Focus that leaves under a press leaves before the press is over: drawing now would move what is being pressed
    // out from under the pointer, and its click would land on something else. Wait for the press to end.
    if (pressing) document.addEventListener('pointerup', () => setTimeout(redraw, 0), { once: true });
    // Focus that goes to nothing may be a control disabled under it — the move button of a row that reached the end of
    // its list — and its component puts focus on a neighbour once it has drawn. A Button is one of its form's controls
    // (BTN-29), and one engine takes focus from such a control the moment it is disabled, before that: wait a turn.
    else if (!event.relatedTarget) setTimeout(redraw, 0);
    else redraw();
  });
  draw();
  return host;
}

/** Everything the Studio knows about one token, then its editor. */
export function tokenDetail(ctx: Ctx, id: string, open: (id: string) => void): HTMLElement {
  const { t, studio } = ctx;
  const NS = studio.namespace;
  // What the value is and where it comes from stands above the editor; what the token is for, and what follows it, below.
  const facts = h('div', { class: 'ts-facts', 'data-facts': true });
  const about = h('div', { class: 'ts-facts', 'data-about': true });
  let aboutShown = '';
  const refresh = () => {
    const d = studio.describe(ctx.view(), id) as Json | null;
    if (!d) return void (facts.replaceChildren(), about.replaceChildren());
    const { token, setBy, inherited, followers } = d;
    const how = t.detail.how[setBy.how] ?? setBy.how;
    const swatches = d.schemes
      ? h('div', { class: 'ts-schemes' }, Object.entries(d.schemes as Json).map(([scheme, color]) => h('span', { class: 'ts-scheme' }, h('tanrei-swatch', { decorative: true, size: 'small', color: cssColor(color) }), h('small', { dir: 'ltr', text: `${scheme} ${format('color', color)}` }))))
      : null;
    // Facts: an inline description list, compact, the terms in one column as wide as the widest.
    const row = (label: string, ...value: (Node | string | null | (Node | string)[])[]) => h('div', { class: 'ts-fact' }, h('dt', { text: label }), h('dd', {}, ...value));
    // What the value is and who set it: short answers, beside their terms. What follows the token and what it is for:
    // rows of chips and whole sentences, each under its term, as wide as the pane (a phone's included).
    const list = (layout: 'inline' | 'stacked', ...rows: (HTMLElement | null)[]) => h('tanrei-description-list', { layout, density: 'compact', separation: 'gap' }, h('dl', {}, ...rows));
    const tag = (text: string, attrs: Json = {}) => h('tanrei-tag', { size: 'small', variant: 'outlined', label: text, ...attrs });
    facts.replaceChildren(
      list(
        'inline',
        row(t.detail.value, h('b', { dir: 'ltr', text: format(token.type, token.value, token) }), token.enum ? [' ', h('code', { text: `$value ${token.value}` })] : null, token.alias ? [' ', h('code', { text: `→ ${short(token.alias, NS)}` })] : null, !token.alias && token.derive && !('fixed' in token.derive) ? [' ', h('code', { text: `= ${ruleText(token.derive, NS)}` })] : null),
        swatches ? row(t.detail.schemes, swatches) : null,
        row(t.detail.kind, h('tanrei-tag-group', { label: t.detail.kind }, tag(t.detail.kinds[d.kind] ?? d.kind), tag(token.type), token.vocabulary?.extension ? tag(t.detail.extension, { variant: 'tonal' }) : null)),
        row(t.detail.setBy, rich((at) => t.listed(at(h('b', {}, isolated(setBy.layer))), how)), setBy.match ? [' ', h('code', { text: setBy.match })] : null),
        d.written && inherited ? row(t.detail.inherited, ltr(format(inherited.type, inherited.value, inherited)), inherited.alias ? [' ', h('code', { text: `→ ${short(inherited.alias, NS)}` })] : null) : null,
        token.derive?.fixed ? row(t.detail.fixed, token.derive.fixed) : null,
      ),
    );
    // Written again only when what it shows changed: an edit of the value must not take a chip from under the keyboard.
    const shown = JSON.stringify([followers, token.enum ? token.value : null, token.description, token.vocabulary?.rationale ?? token.rationale]);
    if (shown === aboutShown) return;
    aboutShown = shown;
    about.replaceChildren(
      list(
        'stacked',
        row(
          t.withCount(t.detail.followers, followers.length),
          followers.length ? h('span', { class: 'ts-followers' }, h('tanrei-tag-group', { spacing: 'chips', label: t.detail.followers }, followers.slice(0, 12).map((follower: string) => h('tanrei-chip', { size: 'small', label: short(follower, NS), 'data-follower': follower, onclick: () => open(follower) }))), followers.length > 12 ? [' ', ltr(`+${followers.length - 12}`)] : null) : t.detail.noFollowers,
        ),
        token.enum ? row(t.detail.choices, h('tanrei-tag-group', { label: t.detail.choices }, token.enum.values.map((name: string, index: number) => h('tanrei-tag', { size: 'small', variant: index === token.value ? 'filled' : 'outlined', label: name, 'data-current': index === token.value ? true : undefined })))) : null,
        token.description ? row(t.detail.description, isolated(token.description)) : null,
        (token.vocabulary?.rationale ?? token.rationale) && (token.vocabulary?.rationale ?? token.rationale) !== token.description ? row(t.detail.rationale, isolated(token.vocabulary?.rationale ?? token.rationale)) : null,
        token.llm ? row(t.detail.guidance, isolated(token.llm.usage ?? ''), token.llm.rules?.length ? h('ul', {}, token.llm.rules.map((rule: string) => h('li', {}, isolated(rule)))) : null) : null,
      ),
    );
  };
  refresh();
  ctx.onUpdate(refresh);
  const d = studio.describe(ctx.view(), id) as Json | null;
  const declared = d?.declaration;
  return h(
    'div',
    { class: 'ts-detail', 'data-detail': id },
    facts,
    tokenEditor(ctx, id),
    about,
    d?.recipes?.length
      ? h('div', { class: 'ts-row-actions ts-recipes' }, h('span', { class: 'ts-help', text: t.detail.addNext }), d.recipes.map((recipe: Json) => linkButton(t.add.recipes[recipe.op] ?? recipe.op, () => ctx.show({ section: 'vocabulary', panel: 'add', token: id }), { 'data-recipe': recipe.op })))
      : null,
    declared ? h('p', { class: 'ts-help' }, rich((at) => t.sentences(t.detail.declaredHere, at(linkButton(t.detail.removeExtension, () => ctx.commit(studio.removeExtension(ctx.layer(), id), { rebuild: true })))))) : null,
  );
}

export function ruleText(rule: Json, ns: string): string {
  const name = (v: unknown) => (isRef(v) ? short((v as string).slice(1, -1), ns) : String(v));
  if (rule.fn === 'mul') {
    // max(min, round(of × by^exp × times, round)), in the order the engine applies it.
    const product = `${name(rule.of)} × ${rule.by}${rule.exp !== undefined ? ` ^ ${name(rule.exp)}` : ''}${rule.times !== undefined ? ` × ${name(rule.times)}` : ''}`;
    const rounded = rule.round !== undefined ? `round(${product}, ${name(rule.round)})` : product;
    return rule.min !== undefined ? `max(${name(rule.min)}, ${rounded})` : rounded;
  }
  if (rule.fn === 'pad') return `pad(${name(rule.of)}${rule.by !== undefined ? ` × ${rule.by}` : ''}, ${name(rule.height)})`;
  if (rule.fn === 'sub') return `max(0, ${name(rule.of)} − ${name(rule.by)})`;
  if (rule.fn === 'mix') return `mix(${name(rule.base)}, ${name(rule.with)}, ${name(rule.amount)})`;
  if (rule.fn === 'alpha') return `alpha(${name(rule.of)}, ${name(rule.amount)})`;
  if (rule.fn === 'tone') return `tone(${rule.palette})`;
  if (rule.fn) return rule.fn;
  return Object.entries(rule).filter(([key]) => key !== 'pinned').map(([key, value]) => `${key}: ${ruleText(value as Json, ns)}`).join(', ');
}

export { MIN_REASON, button };
