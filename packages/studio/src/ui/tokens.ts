// "Every token": two panes. The tree only chooses — tier → group → token, or the flat list a search gives — and the
// chosen token's editor stands beside it (under it where the panel is narrow). One generic editor (./editor).
import { type Ctx, type Json, button, codeInput, cssColor, fold, folds, format, h, linkButton, ltr, panel, rename, rich, scrollingList, short, textInput, views } from './dom';
import { tokenDetail } from './editor';
import { jsonWidget } from './widgets';
import { addPanel, extensionsPanel } from './add';

const PAGE = 60;
const TIERS = ['dial', 'ref', 'sys', 'comp', 'own'];
export type Filter = 'all' | 'changed' | 'extensions';
export interface TreeState {
  selected?: string;
  query: string;
  filter: Filter;
  /** The parents the person left open: a tier's key, or `tier/group`. */
  open: Set<string>;
}

/**
 * The tree and the editor. The tree is `<tanrei-tree-view selection="single">`: one stop in the focus order, the arrow
 * keys move through it, Enter or Space (or a press) chooses, and choosing changes nothing but the pane beside it.
 * A group's rows are written when it first opens, so the tree costs what it shows however large the system is.
 */
function tokenPanes(ctx: Ctx, state: TreeState) {
  const { t, studio } = ctx;
  const NS = studio.namespace;
  const tree = h('tanrei-tree-view', { class: 'ts-tree', label: t.panes.tree, selection: 'single', density: 'compact', 'data-tree': true });
  const top = h('ul');
  tree.append(top);
  const count = h('span', { class: 'ts-help', 'aria-live': 'polite' });
  const none = h('tanrei-empty-state', { class: 'ts-tree-none', live: true, hidden: true, headline: t.panes.noResultsTitle, 'data-no-results': true }, t.panes.noResultsHelp);
  type Drawn = { text: HTMLElement; dot: HTMLElement | null; name: HTMLElement; mark: HTMLElement | null };
  const values = new Map<string, Drawn>();
  let shown = PAGE;
  let found: Json[] = [];

  const paneId = ctx.uid('ts-token-pane');
  const headingId = ctx.uid('ts-token-name');
  const pane = h('section', { class: 'ts-token-pane', id: paneId, 'data-token-pane': true });
  /** What the editor asked to be told of an update. It is the pane's, and goes when another token is chosen. */
  let refreshers: (() => void)[] = [];
  const inPane: Ctx = Object.create(ctx, { onUpdate: { value: (refresh: () => void) => refreshers.push(refresh) } });

  const tokenOf = (id: string) => ctx.view().model.tokens[id] as Json | undefined;
  const rowOf = (id?: string) => (id ? tree.querySelector<HTMLElement>(`li[data-token="${CSS.escape(id)}"] > span`) : null);
  /** What a row says that an edit changes: the value, a color's sample, and "changed" in words beside the name. */
  const paint = (id: string, at: Drawn) => {
    const token = tokenOf(id);
    at.text.textContent = format(token?.type, token?.value, token);
    if (at.dot) at.dot.setAttribute('color', cssColor(token?.value));
    const changed = Boolean(ctx.layer().tokens?.[id] || ctx.layer().vocabulary?.[id]);
    if (changed && !at.mark) at.name.append((at.mark = h('small', { 'data-supporting-text': true, 'data-changed': true, text: t.changed })));
    else if (!changed && at.mark) at.mark = (at.mark.remove(), null);
  };
  /** A token's row: its name, "changed" beside it in words, a sample of a color, the "added" tag and the value. */
  function tokenItem(entry: Json, label: string) {
    const at: Drawn = { text: h('span', { class: 'ts-value', 'data-trailing-text': true }), dot: tokenOf(entry.id)?.type === 'color' ? h('tanrei-swatch', { class: 'ts-token-swatch', decorative: true, size: 'small', shape: 'circle' }) : null, name: h('bdi', {}, label), mark: null };
    values.set(entry.id, at);
    paint(entry.id, at);
    const marks = at.dot || entry.extension ? h('span', { 'data-trailing': true }, at.dot, entry.extension ? h('tanrei-tag', { size: 'small', variant: 'outlined', label: t.detail.extension }) : null) : null;
    return h('li', { 'data-value': entry.id, 'data-token': entry.id }, h('span', {}, at.name, marks, at.text));
  }
  const parentRow = (label: Node | string, trailing: string) => h('span', {}, h('bdi', {}, label), h('span', { 'data-trailing-text': true, text: trailing }));

  /** The rows of a group, written once: when it first opens, or when the chosen token is in it. */
  function fill(group: HTMLElement) {
    if (group.querySelector(':scope > ul')) return;
    const [tier, name] = group.dataset.key!.split('/');
    const prefix = tier === 'own' ? `${name}.` : `${NS}.${tier}.${name}.`;
    group.append(h('ul', {}, found.filter((entry) => entry.tier === tier && entry.group === name).map((entry) => tokenItem(entry, entry.id.startsWith(prefix) ? entry.id.slice(prefix.length) : short(entry.id, NS)))));
  }
  const flat = () => Boolean(state.query) || state.filter !== 'all';
  const visible = () => {
    const words = state.query.toLowerCase().split(/\s+/).filter(Boolean);
    return (studio.rows(ctx.view()) as Json[]).filter((entry) => (state.filter === 'all' || (state.filter === 'changed' ? entry.changed : entry.extension)) && words.every((word) => `${entry.id} ${entry.type}`.includes(word)));
  };
  /** The tree's chosen row is the chosen token's — where that row is written — and says which pane it controls. */
  function tie() {
    for (const row of tree.querySelectorAll('[aria-controls]')) row.removeAttribute('aria-controls');
    const row = rowOf(state.selected);
    tree.value = row ? state.selected! : null;
    row?.setAttribute('aria-controls', paneId);
  }

  function draw() {
    values.clear();
    found = visible();
    count.textContent = t.tokens.count(found.length);
    none.hidden = found.length > 0;
    tree.hidden = found.length === 0;
    if (flat()) {
      // A search is a flat, paged list: ids in full.
      top.replaceChildren(...found.slice(0, shown).map((entry) => tokenItem(entry, short(entry.id, NS))));
    } else {
      const chosen = state.selected ? found.find((entry) => entry.id === state.selected) : undefined;
      if (chosen) state.open.add(chosen.tier).add(`${chosen.tier}/${chosen.group}`);
      else if (!state.open.size) state.open.add('dial');
      top.replaceChildren(
        ...TIERS.filter((tier) => found.some((entry) => entry.tier === tier)).map((tier) => {
          const inTier = found.filter((entry) => entry.tier === tier);
          const groups = [...new Set(inTier.map((entry) => entry.group as string))];
          return h(
            'li',
            { 'data-tier': tier, 'data-key': tier, 'data-open': state.open.has(tier) },
            parentRow(t.tokens.tiers[tier] ?? tier, String(inTier.length)),
            h('ul', {}, groups.map((group) => {
              const members = inTier.filter((entry) => entry.group === group);
              // A group of one is its token: a row to open for one row is a row too many.
              if (members.length === 1) return tokenItem(members[0], short(members[0].id, NS).split('.').slice(tier === 'own' ? 0 : 1).join('.'));
              const key = `${tier}/${group}`;
              const item = h('li', { 'data-group': group, 'data-key': key, 'data-expandable': true, 'data-open': state.open.has(key) }, parentRow(h('code', { text: group }), `${members.length}${members.some((m) => m.changed) ? ' · ✎' : ''}`));
              if (state.open.has(key)) fill(item);
              return item;
            })),
          );
        }),
      );
    }
    more.hidden = !flat() || found.length <= shown;
    rename(more, t.withCount(t.tokens.more, found.length - shown));
    tie();
  }
  const more = button('', () => {
    const next = found.slice(shown, shown + PAGE).map((entry) => tokenItem(entry, short(entry.id, NS)));
    shown += PAGE;
    top.append(...next);
    more.hidden = found.length <= shown;
    rename(more, t.withCount(t.tokens.more, found.length - shown));
    tie();
    // The button may be gone now: the keyboard's place is the first of the rows it brought.
    next[0]?.querySelector<HTMLElement>(':scope > span')?.focus();
  }, { 'data-more': true });

  // A parent opened or closed by the person: remembered (a redraw keeps the tree as it was left), and filled.
  tree.addEventListener('toggle', (event) => {
    const item = event.target as HTMLElement;
    const open = (event as unknown as CustomEvent<{ open: boolean }>).detail?.open;
    if (!item.dataset?.key || typeof open !== 'boolean') return;
    if (open) state.open.add(item.dataset.key);
    else state.open.delete(item.dataset.key);
    if (open && item.dataset.group) fill(item), tie();
  });
  tree.addEventListener('change', (event) => event.target === tree && choose((event as CustomEvent<{ value: string }>).detail.value));

  /** The panes stand one under the other (a narrow panel): the editor is then out of sight of the tree. */
  const stacked = () => pane.getBoundingClientRect().top >= tree.getBoundingClientRect().bottom - 1;
  const toTree = () => (rowOf(state.selected) ?? tree.querySelector<HTMLElement>('[role="treeitem"][tabindex="0"]') ?? tree).focus();

  function drawPane() {
    refreshers = [];
    const id = state.selected;
    if (!id || !studio.describe(ctx.view(), id)) {
      pane.removeAttribute('aria-labelledby');
      pane.replaceChildren(h('tanrei-empty-state', { headline: t.panes.emptyTitle, 'data-pane-empty': true }, t.panes.emptyHelp));
      return;
    }
    // A region named by the token: the chosen row says it controls it (`tie`), and its heading takes focus where
    // the editor is out of the tree's sight.
    pane.setAttribute('aria-labelledby', headingId);
    pane.replaceChildren(
      h('header', { class: 'ts-token-head' }, linkButton(t.panes.back, toTree, { class: 'ts-link ts-token-back', 'data-back': true }), h('h3', { class: 'ts-token-name', id: headingId, tabindex: '-1', 'data-token-name': true }, h('code', { text: short(id, NS) }))),
      tokenDetail(inPane, id, (next) => choose(next, { reveal: true, focus: true })),
    );
  }
  /** Another token is the chosen one: from the tree, or (`reveal`) from a link of the editor, which the tree then shows. */
  function choose(id: string, { reveal = false, focus = false }: { reveal?: boolean; focus?: boolean } = {}) {
    state.selected = id;
    if (reveal) {
      if (flat() && !found.some((entry) => entry.id === id)) {
        Object.assign(state, { query: '', filter: 'all' });
        search.value = '';
        setFilter('all');
      }
      draw();
      requestAnimationFrame(() => rowOf(id)?.scrollIntoView({ block: 'nearest' }));
    } else tie();
    drawPane();
    if (focus || stacked()) {
      const heading = pane.querySelector<HTMLElement>('[data-token-name]');
      heading?.focus({ preventScroll: true });
      if (stacked()) pane.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }

  // The search is the box alone: nothing of a Field is drawn around it — its name is read, not drawn,
  // and it has no help and no error — so it is a text input, named by its own label.
  const search = textInput({ type: 'search', label: t.tokens.search, placeholder: t.tokens.searchPlaceholder, value: state.query, attrs: { 'data-search': true }, oninput: (value) => ((state.query = value), (shown = PAGE), draw()) }, h('span', { slot: 'leading-icon', text: 'search' }));
  // Which rows are shown: three views of the one tree.
  const filter = views<Filter>({ label: t.tokens.filter, attrs: { 'data-filter': true }, options: (['all', 'changed', 'extensions'] as Filter[]).map((option) => ({ value: option, label: t.tokens.filters[option] })), value: state.filter, onchange: (next) => ((state.filter = next), (shown = PAGE), draw()) });
  const setFilter = (value: Filter) => (filter.value = value);
  const bar = h('div', { class: 'ts-tree-bar' }, search, filter);
  draw();
  drawPane();
  ctx.onUpdate(() => {
    for (const [id, at] of values) paint(id, at);
    for (const refresh of refreshers) refresh();
  });
  queueMicrotask(() => rowOf(state.selected)?.scrollIntoView({ block: 'nearest' }));
  return panel(ctx, { title: t.tokens.title, code: 'tokens', help: t.tokens.help, key: 'tree' }, h('div', { class: 'ts-tokens' }, h('div', { class: 'ts-tokens-grid' }, h('div', { class: 'ts-tokens-tree' }, bar, count, tree, none, more), pane)));
}

/** `rules`: pattern rules for the per-state tokens. One row per rule: the pattern, and its operation as JSON. */
function rulesPanel(ctx: Ctx) {
  const { t, studio } = ctx;
  const rules = (): Json[] => ctx.layer().rules ?? [];
  const inherited = (ctx.view().chain as Json[]).slice(0, -1).flatMap((layer) => (layer.rules ?? []).map((rule: Json) => ({ layer: layer.id, rule })));
  const write = (next: Json[], rebuild = false) => ctx.commit(studio.setRules(ctx.layer(), next), { rebuild });
  const rows = rules().map((rule, index) => {
    const { match, ...operation } = rule;
    // The pattern is a token id with stars: code, on one line — left to right in the code face. It is
    // the box alone: its name is read and not drawn, and it has no help and no error of its own.
    const pattern = codeInput({ label: 'match', value: match, attrs: { 'data-rule-match': true }, oninput: (value) => write(rules().map((r, i) => (i === index ? { ...r, match: value } : r))) });
    const body = jsonWidget({ label: t.rules.operation, value: operation, rows: 4, onchange: () => body.get() && typeof body.get() === 'object' && write(rules().map((r, i) => (i === index ? { match: pattern.value, ...(body.get() as Json) } : r))) });
    return h('div', { class: 'ts-row', 'data-rule': index }, h('div', { class: 'ts-row-head' }, h('div', { class: 'ts-row-title' }, pattern), linkButton(t.rules.remove, () => write(rules().filter((_, i) => i !== index), true))), body.el);
  });
  const add = button(t.rules.add, () => write([...rules(), { match: `${studio.namespace}.comp.*.*.hovered.container.color`, $value: `{${studio.namespace}.comp.$1.$2.container.color}` }], true), { 'data-add-rule': true });
  return panel(
    ctx,
    // `$1` and `$2` open with a symbol: each is a left-to-right run of its own inside the sentence.
    { title: t.rules.title, code: 'rules', help: rich((at) => t.rules.help(at(ltr('$1')), at(ltr('$2')))), key: 'rules' },
    h('div', { class: 'ts-rows' }, rows),
    h('div', { class: 'ts-actions' }, add),
    folds({}, fold({ label: t.rules.inherited, trailing: ltr(String(inherited.length)), attrs: { 'data-inherited-rules': true } }, scrollingList(t.rules.inherited, {}, inherited.map(({ layer, rule }) => h('li', {}, h('bdi', { dir: 'ltr' }, h('b', { text: `${layer} ` }), JSON.stringify(rule))))))),
  );
}

export function tokensLevel(ctx: Ctx, state: TreeState, focus?: { token?: string; panel?: string }): HTMLElement[] {
  return [tokenPanes(ctx, state), extensionsPanel(ctx), addPanel(ctx, focus?.panel === 'add' ? focus.token : undefined), rulesPanel(ctx)].filter(Boolean) as HTMLElement[];
}
