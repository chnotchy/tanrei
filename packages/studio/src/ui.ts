// Theme Studio — the page half. One layer: a rail of what it holds, a live preview, a panel that edits what the rail
// points at, Inspect over that panel (every token, and the file itself), and — when the host gives an adapter — the
// file that layer lives in.
import { missingWords, setWords } from '@tanrei/web';
import { layerParam, packLayer, unpackLayer, withLayer } from './address.js';
import { ID_PATTERN, stringifyLayer } from './core.js';
import { createSourceDraft } from './draft.js';
import { createHistory } from './history.js';
import { studio } from './data';
import { type StudioStrings, studioDirection, studioLanguage, studioStrings } from './strings';
import { type Contrast, type Ctx, type Json, type Layer, type Place, button, codeField, fold, folds, h, isolated, ltr, panel, rename, rich, scrollingList, stateChip, textField, views } from './ui/dom';
import { sectionPanels } from './ui/panels';
import { createPreview } from './ui/preview';
import { createRail, shuffle } from './ui/rail';
import { INSPECT, type Inspect, type Pane, PANES, ROWS, type Row, SECTIONS, type Section } from './ui/sections';
import { sourceLevel } from './ui/source';
import { type TreeState, tokensInspect } from './ui/tokens';

export interface StudioAdapter {
  /** Shown next to the save state: usually the file name. */
  label?: string;
  load(): Promise<{ layer: Layer; etag?: string }>;
  save(layer: Layer, etag?: string): Promise<{ etag?: string; conflict?: { layer: Layer; etag?: string } }>;
  build?(): Promise<{ warnings: string[]; files: { target: string; path: string; changed: boolean | null }[] }>;
  /**
   * The host's own layers this one may extend (a product may stack its layers): `[{ id, layer }]`, read-only.
   * The Studio resolves the chain itself, in the page, exactly as it does for the shipped systems.
   */
  parents?(): Promise<{ id: string; layer: Layer }[]>;
  /** Report changes made to the layer — or, with `onParentsChange`, to its local parents — by someone else; returns how to stop. */
  watch?(onExternalChange: (remote: { layer: Layer; etag?: string }) => void, onParentsChange?: () => void): () => void;
}
export interface StudioOptions {
  /**
   * The language of the Studio's own words: a BCP 47 tag (`ja`, `es`, `zh-CN`; case does not matter). A language the
   * Studio has no translation for — see `studioLanguages()` — is hosted in English.
   */
  lang?: string;
  adapter?: StudioAdapter;
  /** Where the prose links point; a host without those pages leaves them out. */
  links?: { layers?: string };
  /** Autosave delay in ms (adapter only). */
  saveDelay?: number;
  /**
   * The host's own items for the Studio's bar, which stands across the top of the Studio: `start` before the Studio's
   * own (a brand that leads back to the host's pages), `end` after them (a language, a theme). They are moved into it.
   */
  bar?: { start?: Node[]; end?: Node[] };
  /**
   * Keep the layer in the page's address (the fragment, compressed: ./address.js), so that a link opens the Studio on
   * that layer. Without an adapter only: a file is where a layer that has one is kept.
   */
  address?: boolean;
}
type SaveState = 'saved' | 'unsaved' | 'saving' | 'invalid' | 'conflict' | 'error' | 'loading';

const STORE = `${studio.namespace}-theme-studio`;
const NS = studio.namespace;

export function mountStudio(root: HTMLElement, { lang = 'en', adapter, links = {}, saveDelay = 600, bar: hosted = {}, address = false }: StudioOptions = {}) {
  // The language the Studio speaks: the one asked for when it is translated, English otherwise (./strings/index.ts).
  const speaks = studioLanguage(lang);
  const t: StudioStrings = studioStrings(speaks);
  let layer: Layer = studio.blank();
  /** The layer as it was last COMMITTED: what is saved. `layer` runs ahead of it while a value is typed, stepped or dragged (`preview`). */
  let committed: Layer = layer;
  /** What the panel edits: a row of the rail, or another of its sections (./ui/sections.ts). */
  let section: Section = 'color';
  /** Inspect, open at one of its tabs over the panel, or closed; and the tab it opens at next. */
  let inspect: Inspect | null = null;
  let lastInspect: Inspect = 'tokens';
  /** The rows the shuffle leaves alone. */
  const locks = new Set<Row>();
  let contrast: Contrast = 'standard';
  let last: Json | null = null; // the last VALID preview: what the scope shows
  let latest: Json = {}; // the latest preview, valid or not: what Export shows
  let refreshers: (() => void)[] = [];
  let uid = 0;
  /** Where `show` was asked to go, while the panel is drawn there: a token, a panel to scroll to. */
  let place: Place | undefined;
  const tree: TreeState = { query: '', filter: 'all', open: new Set() };
  /**
   * The width the person gave the panel's column for what it holds — a section's controls, or Inspect at one of its
   * tabs — in CSS pixels; one given none has the frame's own (studio.css), which is wider for Inspect's two tabs.
   */
  const panelWidths: Partial<Record<Pane, number>> = {};
  const pane = (): Pane => inspect ?? 'edit';
  const history = createHistory();
  const linked = address && !adapter;

  // ── persistence: the browser (no adapter) or the host's file (adapter) ────────────────────────
  let etag: string | undefined;
  let saveState: SaveState = adapter ? 'loading' : 'saved';
  let saveProblem = '';
  let savedText = '';
  let timer: number | undefined;
  let theirs: { layer: Layer; etag?: string } | null = null;

  // Text typed at "Source" that does not parse (./draft.js). It is remembered with the rest, so a reload keeps it too.
  let draft = createSourceDraft();
  /**
   * While the page shows the layer of a link (`address`): the layer this browser kept before it. It stays the one kept
   * until the person edits the link's layer or keeps it, and they can go back to it.
   */
  let mine: Layer | null = null;
  function remember() {
    try {
      const view = { section, inspect, locks: [...locks], contrast, draft, panel: panelWidths };
      localStorage.setItem(STORE, JSON.stringify(adapter ? view : { layer: mine ?? layer, ...view }));
    } catch {}
  }
  function recall() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORE) ?? 'null');
      if (SECTIONS.includes(stored?.section)) section = stored.section;
      if (INSPECT.includes(stored?.inspect)) inspect = lastInspect = stored.inspect;
      for (const row of Array.isArray(stored?.locks) ? stored.locks : []) if (ROWS.includes(row)) locks.add(row);
      if (['standard', 'medium', 'high'].includes(stored?.contrast)) contrast = stored.contrast;
      for (const [at, px] of Object.entries(stored?.panel ?? {})) if (PANES.includes(at as Pane) && Number.isFinite(px) && (px as number) > 0) panelWidths[at as Pane] = px as number;
      if (!adapter && stored?.layer) layer = studio.fromLayer(stored.layer);
      draft = createSourceDraft(stored?.draft);
    } catch {}
  }
  recall();
  committed = layer;

  const ctx: Ctx = {
    studio,
    t,
    root,
    layer: () => layer,
    view: () => last!,
    latest: () => latest,
    commit(next, options) {
      layer = next;
      // An edit of a link's layer makes it the person's: it is kept from now on, in the place of theirs.
      if (mine && !options?.preview) keepShared(t.shared.edited);
      if (!options?.preview) {
        // A step to undo: what was committed before, unless nothing changed.
        if (stringifyLayer(next) !== stringifyLayer(committed)) history.record(committed);
        committed = next;
        drawHistory();
      }
      if (options?.rebuild) build();
      else if (options?.preview) follow();
      else update();
      if (!options?.preview) scheduleSave();
    },
    rebuild: () => build(),
    onUpdate: (refresh) => refreshers.push(refresh),
    announce: (message) => (status.textContent = message),
    show,
    scope: '',
    locked: { id: Boolean(adapter) },
    uid: (prefix) => `${prefix}-${++uid}`,
    get draft() {
      return draft;
    },
    draftChanged: () => (drawFrame(), remember()),
  };

  // ── the frame: what stays while the panel changes ─────────────────────────────────────────────
  // The bar across the top; under it the rail (what the layer holds), the preview, and the panel of what the rail points
  // at, with the handle that resizes the panel between the preview and it. On a narrow screen they stand in one column
  // (studio.css). The Studio's own chrome is drawn in the default system: the layer being edited is the preview's, and
  // the rail's samples', which carry the preview's system id.
  root.classList.add('ts', 'not-content');
  root.dataset.studio = '';
  // The Studio's words for Tanrei's components, given once — for the Studio alone: its root carries its
  // language with a private-use subtag, and the words are given for that tag. A component inside finds them first; one
  // outside never does, so the host page's own words (the document's, or its language's) are not written over, and a
  // key the Studio does not give is still looked for under the plain language and then in the document's set.
  root.lang = `${speaks}-x-studio`;
  // A language written right-to-left is laid out so. A host that already is — a page in that language —
  // is left alone; one that is not gets the direction on the Studio's root, for the Studio alone.
  if (studioDirection(speaks) === 'rtl' && getComputedStyle(root).direction !== 'rtl') root.dir = 'rtl';
  setWords({ requiredText: t.words.required, optionalText: t.words.optional, incrementLabel: t.words.increase, decrementLabel: t.words.decrease, clearLabel: t.words.clear, emptyText: t.words.noMatches, dragHandleLabel: t.fonts.reorder, dragHandleHint: t.fonts.reorderHint, moveToStartLabel: t.fonts.toStart, moveBeforeLabel: t.fonts.before, moveAfterLabel: t.fonts.after, moveToEndLabel: t.fonts.toEnd, liftedText: t.fonts.lifted, movedText: t.fonts.moved, cancelledText: t.fonts.cancelled }, { lang: root.lang });
  const status = h('p', { class: 'ts-status', role: 'status', 'aria-live': 'polite', 'data-status': true });
  const controls = h('div', { class: 'ts-controls', 'data-controls': true });
  const preview = createPreview(ctx, { contrast, onContrast: (next) => ((contrast = next), update()) });
  ctx.scope = preview.scopeId;
  const railView = createRail(ctx, {
    locked: locks,
    onshow: (next) => show({ section: next }),
    onlock: (row, held) => {
      if (held) locks.add(row);
      else locks.delete(row);
      remember();
    },
  });
  const file = h('div', { class: 'ts-file', 'data-file': true });
  // What changed underneath the person, and the two answers: a live callout (it is announced when it opens).
  const banner = h('tanrei-callout', { class: 'ts-banner', status: 'warning', 'status-label': t.file.states.conflict, live: true, open: 'false', 'data-banner': true });
  // The layer of a link, shown in the place of the one this browser kept, and the two ways on (`address`).
  const sharedBanner = h('tanrei-callout', { class: 'ts-banner', status: 'info', 'status-label': t.shared.status, live: true, open: 'false', 'data-shared-banner': true });
  const a11y = h('div');
  const exportHost = h('div');
  const glyph = (name: string) => h('span', { class: `${studio.tagPrefix}-icon`, slot: 'icon', 'aria-hidden': 'true', translate: 'no' }, name);
  // The shuffle: every row that is not locked, another of its values, in one step to undo.
  const shuffleButton = h('tanrei-button', { variant: 'text', size: 'small', label: t.rail.shuffle, title: t.rail.shuffleHelp, onclick: () => shuffleRows(), 'data-shuffle': true }, glyph('shuffle'));
  // Inspect: over the panel, every token in its tree and the file itself. A toggle: it says whether it is open.
  const inspectButton = h('tanrei-button', { variant: 'outlined', size: 'small', toggle: true, title: t.inspect.help, 'data-inspect': true }, glyph('data_object'), t.inspect.title) as HTMLElement & { selected: boolean };
  inspectButton.addEventListener('change', (event) => event.target === inspectButton && show(inspectButton.selected ? { inspect: lastInspect } : { section }));
  // Undo and redo: icon buttons that keep their place in the keyboard's order while there is nothing to do (BTN-38).
  const historyButton = (name: string, label: string, keys: string, act: () => void, attrs: Json) => h('tanrei-button', { variant: 'text', size: 'small', label, title: label, 'aria-keyshortcuts': keys, 'focusable-when-disabled': true, disabled: true, onclick: act, ...attrs }, glyph(name));
  const undoButton = historyButton('undo', t.frame.undo, 'Meta+Z Control+Z', () => undo(), { 'data-undo': true });
  const redoButton = historyButton('redo', t.frame.redo, 'Meta+Shift+Z Control+Shift+Z Control+Y', () => redo(), { 'data-redo': true });
  const bar = h(
    'header',
    { class: `ts-bar${hosted.end?.length ? ' ts-bar-hosted' : ''}`, 'data-bar': true },
    hosted.start?.length ? h('div', { class: 'ts-bar-host' }, hosted.start) : null,
    h('div', { class: 'ts-bar-history', role: 'group', 'aria-label': t.frame.history }, undoButton, redoButton),
    h('div', { class: 'ts-bar-tools' }, shuffleButton),
    file,
    h('div', { class: 'ts-bar-tools ts-bar-inspect', 'data-bar-inspect': true }, inspectButton),
    hosted.end?.length ? h('div', { class: 'ts-bar-host ts-bar-end' }, hosted.end) : null,
  );
  const rail = h('nav', { class: 'ts-rail', 'aria-label': t.frame.rail, 'data-rail': true }, railView.el);
  // Inspect's head, over its two tabs: what it is, which tab, and the way back to the panel.
  const inspectTabs = views<Inspect>({ label: t.inspect.title, attrs: { 'data-inspect-tabs': true }, options: INSPECT.map((value) => ({ value, label: t.inspect[value] })), value: lastInspect, onchange: (value) => show({ inspect: value }) });
  const inspectClose = h('tanrei-button', { variant: 'text', size: 'small', label: t.inspect.close, title: t.inspect.close, onclick: () => (show({ section }), inspectButton.focus()), 'data-inspect-close': true }, glyph('close'));
  const inspectHead = h('div', { class: 'ts-inspect-head', hidden: true, 'data-inspect-head': true }, h('h2', { class: 'ts-eyebrow', text: t.inspect.title }), inspectTabs, inspectClose);
  // The panel scrolls by itself beside the preview; it takes the focus when what had it is drawn again (an undo).
  const inspector = h('section', { class: 'ts-inspector', 'aria-label': t.frame.panel, tabindex: '-1', 'data-inspector': true }, inspectHead, controls, a11y, exportHost);
  const handle = h('tanrei-handle', { class: 'ts-handle', axis: 'horizontal', label: t.frame.resize, 'data-panel-handle': true }) as HTMLElement & { value: number | null; min: number; max: number; valueText: string };
  // The frame is the page's main region; what is announced is said from inside it.
  const layout = h('main', { class: 'ts-frame', 'data-frame': true }, rail, preview.el, handle, inspector, status);
  root.replaceChildren(bar, h('div', { class: 'ts-notices' }, banner, sharedBanner), layout);

  // ── the panel's width ─────────────────────────────────────────────────────────────────────────
  // The handle reports how far it was moved and the keys pressed on it (the Handle's window splitter); the Studio
  // keeps the width: at least the panel's least, and never so wide that the preview falls under its own least
  // (studio.css: --ts-panel-min, --ts-preview-min). The width is the person's, remembered in this browser.
  const length = (property: string) => {
    const probe = h('div', { style: `position: absolute; inline-size: var(${property}); visibility: hidden;` });
    layout.append(probe);
    const px = probe.getBoundingClientRect().width;
    probe.remove();
    return px;
  };
  const range = () => {
    const least = length('--ts-panel-min');
    const room = layout.clientWidth - rail.getBoundingClientRect().width - handle.getBoundingClientRect().width - length('--ts-preview-min');
    return [least, Math.max(least, Math.floor(room))];
  };
  const panelNow = () => Math.round(inspector.getBoundingClientRect().width);
  const drawHandle = () => {
    if (!handle.getBoundingClientRect().width) return;
    const [least, most] = range();
    const now = panelNow();
    Object.assign(handle, { min: Math.round(least), max: most, value: now, valueText: t.frame.width(now) });
  };
  function setPanel(px: number, keep = true) {
    const [least, most] = range();
    panelWidths[pane()] = Math.round(Math.min(most, Math.max(least, px)));
    drawPanelWidth();
    drawHandle();
    if (keep) remember();
  }
  /** The width given to what the column holds now, or none: the frame's own for it. */
  function drawPanelWidth() {
    const px = panelWidths[pane()];
    if (px) root.style.setProperty('--ts-panel-width', `${px}px`);
    else root.style.removeProperty('--ts-panel-width');
  }
  drawPanelWidth();
  let dragFrom = 0;
  let restoreTo = 0;
  handle.addEventListener('resizestart', () => (dragFrom = panelNow()));
  // The handle stands at the panel's start edge: moving it toward the end edge narrows the panel, in either direction.
  handle.addEventListener('resize', (event) => setPanel(dragFrom - (event as unknown as CustomEvent).detail.inline, false));
  handle.addEventListener('resizeend', (event) => {
    const { inline, cancelled } = (event as CustomEvent).detail;
    setPanel(cancelled ? dragFrom : dragFrom - inline);
  });
  handle.addEventListener('step', (event) => {
    const { direction, amount } = (event as CustomEvent).detail;
    const [least, most] = range();
    const STEP = { one: 16, large: 64 } as Record<string, number>;
    setPanel(amount === 'limit' ? (direction < 0 ? least : most) : panelNow() - direction * STEP[amount]);
  });
  // Enter, Space or a press without a drag: the panel at its least, and back to where it was.
  handle.addEventListener('activate', () => {
    const [least] = range();
    if (panelNow() > least + 1) {
      restoreTo = panelNow();
      setPanel(least);
    } else setPanel(restoreTo || length('--ts-panel-default'));
  });
  const resized = new ResizeObserver(() => {
    const px = panelWidths[pane()];
    if (px && px > range()[1]) setPanel(px, false);
    else drawHandle();
  });
  resized.observe(layout);

  // ── undo and redo ─────────────────────────────────────────────────────────────────────────────
  function drawHistory() {
    undoButton.toggleAttribute('disabled', !history.canUndo);
    redoButton.toggleAttribute('disabled', !history.canRedo);
  }
  /** The layer `step` hands back, drawn whole and saved; the focus stays where it was, or goes to the panel. */
  function travel(step: Layer | null, said: string) {
    if (!step) return;
    const inside = root.contains(document.activeElement) && !bar.contains(document.activeElement);
    layer = committed = step as Layer;
    build();
    drawHistory();
    scheduleSave();
    if (inside && !root.contains(document.activeElement)) inspector.focus({ preventScroll: true });
    ctx.announce(said);
  }
  const undo = () => travel(history.undo(committed) as Layer | null, t.frame.undone);
  const redo = () => travel(history.redo(committed) as Layer | null, t.frame.redone);
  // ⌘Z and ⇧⌘Z (Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y elsewhere), wherever the focus is in the Studio, or on no element at
  // all. In a field that holds text the keys are the field's: they undo what was typed in it.
  const editable = (target: EventTarget | undefined) => target instanceof HTMLElement && (target.isContentEditable || target.matches('input:not([type="checkbox"], [type="radio"], [type="range"], [type="button"]), textarea'));
  const onKey = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey || !(event.metaKey || event.ctrlKey)) return;
    const key = event.key.toLowerCase();
    const redoing = (key === 'z' && event.shiftKey) || (key === 'y' && event.ctrlKey && !event.metaKey && !event.shiftKey);
    if (!redoing && !(key === 'z' && !event.shiftKey)) return;
    const target = event.composedPath()[0];
    const here = event.target === document.body || event.target === document.documentElement || root.contains(event.target as Node);
    if (!here || editable(target)) return;
    event.preventDefault();
    if (redoing) redo();
    else undo();
  };
  document.addEventListener('keydown', onKey);

  // Said in words wherever the person is: the text they typed at Source is still there, and is not what is saved.
  const draftBadge = stateChip(() => show({ inspect: 'source' }), { class: 'ts-draft-badge', 'data-draft-badge': true, title: t.source.draftHelp });
  draftBadge.say(t.source.draftBadge, 'warning');
  /** What the frame says of where the person is: the rail's current row, Inspect open or closed, the draft. */
  function drawFrame() {
    railView.select(section);
    inspectButton.selected = Boolean(inspect);
    inspectHead.hidden = !inspect;
    inspectTabs.value = inspect ?? lastInspect;
    inspector.setAttribute('aria-label', inspect ? t.inspect.title : t.frame.panel);
    // (It keeps focus while it stays: it is taken out only when the draft is gone.)
    if (draft.pending && !draftBadge.isConnected) inspectButton.before(draftBadge);
    else if (!draft.pending) draftBadge.remove();
  }

  /** Show a section in the panel, or open Inspect at a tab — at a token, or scrolled to a panel. */
  function show(to: Place) {
    place = to;
    if (to.inspect) {
      inspect = lastInspect = to.inspect;
      if (to.token && to.inspect === 'tokens') Object.assign(tree, { selected: to.token, query: '', filter: 'all' });
    } else {
      inspect = null;
      if (to.section) section = to.section;
    }
    build();
    remember();
    const panelKey = to.panel ?? (to.token && to.inspect === 'tokens' ? 'tree' : undefined);
    if (panelKey) queueMicrotask(() => root.querySelector(`[data-panel="${panelKey}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
    else inspector.scrollTo({ top: 0 });
    place = undefined;
  }

  /** Every row that is not locked, another of its values: one commit, one step to undo. */
  function shuffleRows() {
    ctx.commit(shuffle(ctx, committed, locks), { rebuild: true });
    ctx.announce(locks.size ? t.rail.shuffledKept(locks.size) : t.rail.shuffled);
  }

  // ── accessibility ─────────────────────────────────────────────────────────────────────────────
  /** The contrast pairs and the build's warnings: the panel of the rail's Accessibility. */
  function accessibilityPanel() {
    const pairs = h('div', { class: 'ts-pairs', 'data-pairs': true });
    const total = h('bdi', { 'data-warnings-count': true });
    // The build's warnings are listed in a fold, written when it first opens; their count is said on it all along.
    let warnings: HTMLUListElement | undefined;
    const listWarnings = () => last && warnings?.replaceChildren(...(last.warnings.length ? last.warnings.map((warning: string) => h('li', {}, isolated(warning))) : [h('li', { text: t.a11y.none })]));
    const refresh = () => {
      if (!last) return;
      pairs.replaceChildren(
        ...(studio.pairs(last, contrast) as Json[]).map((pair) =>
          h(
            'div',
            { class: 'ts-pair' },
            // A text pair is shown as text; a non-text pair (3:1 — boundaries, icons, the focus ring) as a shape: it is
            // not meant to be read, and "Aa" in it would be text below 4.5:1 drawn by the Studio itself.
            h('span', { class: 'ts-pair-chip', 'aria-hidden': 'true' }, pair.themes.map((theme: Json) => h('span', { style: `background: ${theme.bg}; color: ${theme.fg};`, 'data-kind': pair.required === 3 ? 'non-text' : 'text' }, pair.required === 3 ? h('i') : 'Aa'))),
            h('span', { class: 'ts-pair-name' }, ltr(`${pair.fg} / ${pair.bg}`)),
            h('span', { class: 'ts-pair-ratios' }, pair.themes.map((theme: Json) => h('span', { 'data-fail': !theme.pass }, `${t[theme.theme as 'light' | 'dark']} `, h('b', { dir: 'ltr', text: `${theme.ratio.toFixed(2)}:1` }))), h('span', {}, rich((at) => t.a11y[pair.required === 3 ? 'nonText' : 'text'](at(ltr(`≥ ${pair.required}:1`)))))),
          ),
        ),
      );
      const count = last.warnings.length;
      total.textContent = String(count);
      // What the build says is the build's sentence: a run of its own direction inside the list.
      listWarnings();
    };
    refresh();
    ctx.onUpdate(refresh);
    const all = fold({ label: t.a11y.all, trailing: total, attrs: { 'data-warnings-wrap': true } });
    all.addEventListener('toggle', () => all.open && !warnings && (all.append((warnings = scrollingList(t.a11y.all, { 'data-warnings': true }))), listWarnings()));
    return panel(ctx, { title: t.a11y.title, help: t.a11y.help, key: 'a11y' }, pairs, folds({}, all));
  }

  // ── export / save ─────────────────────────────────────────────────────────────────────────────
  /** The file: its id, the checks, copy and download, and what to do next. Under every panel; the file itself is Source. */
  function exportPanel() {
    const id = textField({ label: ctx.locked.id ? t.file.idLocked : t.export.id, attrs: { disabled: ctx.locked.id, 'data-id': true }, oninput: (value) => {
      const result = studio.setMeta(layer, { id: value.trim() }) as Json;
      // What is wrong with the id is the field's own error, said under it.
      id.errorText = result.problem ? t.export.ownNamespace.replace('{id}', layer.id) : '';
      if (!result.problem) ctx.commit(result.layer);
      else id.error = true;
    } });
    const name = textField({ label: t.export.name, attrs: { 'data-name': true }, oninput: (value) => ctx.commit(studio.setMeta(layer, { name: value }).layer) });
    const json = h('code', { 'data-json': true });
    const filename = h('code', { 'data-filename': true });
    const checks = h('ul', { class: 'ts-checks', 'aria-live': 'polite', 'data-checks': true });
    const init = h('code', { 'data-next-init': true });
    const put = h('span', { 'data-next-put': true });
    const flash = (el: HTMLElement, message: string) => {
      const label = el.dataset.label ?? el.textContent ?? '';
      el.dataset.label = label;
      rename(el, message);
      window.setTimeout(() => rename(el, label), 1600);
    };
    const copy = button(t.export.copy, async () => {
      try {
        await navigator.clipboard.writeText(stringifyLayer(layer));
        ctx.announce(t.export.copied);
        flash(copy, t.export.copied);
      } catch {
        ctx.announce(t.export.copyFailed);
        flash(copy, t.export.copyFailed);
      }
    }, { primary: !adapter, 'data-copy': true });
    const download = button(t.export.download, () => {
      const url = URL.createObjectURL(new Blob([stringifyLayer(layer)], { type: 'application/json' }));
      const link = h('a', { href: url, download: `${layer.id}.system.json` });
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      ctx.announce(t.export.downloaded(`${layer.id}.system.json`));
    }, { 'data-download': true });
    const reset = button(t.export.reset, () => window.confirm(t.export.confirmReset) && ctx.commit({ ...studio.blank(layer.extends ?? studio.defaultId), id: layer.id }, { rebuild: true }), { 'data-reset': true });

    // The layer to import: JSON, in a text field that holds code, which says itself what does not parse.
    const importForm = () => {
      const importArea = codeField({ label: t.import.label, placeholder: '{ "id": "acme", "extends": "tanrei", … }', rows: 8, attrs: { 'data-import': true } });
      const importFailed = (message: string) => ((importArea.errorText = message), (importArea.error = Boolean(message)));
      const importApply = button(t.import.apply, () => {
        try {
          importLayer(importArea.value);
          importFailed('');
          ctx.announce(t.import.done);
        } catch (problem) {
          importFailed((problem as Error).message);
        }
      }, { 'data-import-apply': true });
      return [h('p', { class: 'ts-help', text: t.import.help }), importArea, h('div', { class: 'ts-actions' }, importApply)];
    };

    const refresh = () => {
      if (document.activeElement !== id) id.value = layer.id ?? '';
      if (document.activeElement !== name) name.value = layer.name ?? '';
      id.error = Boolean(id.errorText) || !ID_PATTERN.test(layer.id ?? '') || studio.systems.some((s: Json) => s.id === layer.id);
      json.textContent = stringifyLayer(layer);
      filename.textContent = adapter?.label ?? `${layer.id}.system.json`;
      init.textContent = `npx tanrei init ${layer.id} --extends ${layer.extends}`;
      put.replaceChildren(...rich((at) => t.export.put(at(h('code', { text: `design/${layer.id}.system.json` })))));
      const changed = ['tokens', 'palettes', 'vocabulary'].reduce((sum, key) => sum + Object.keys(layer[key] ?? {}).length, 0) + (layer.rules?.length ?? 0);
      checks.replaceChildren(
        ...(latest.problems.length ? latest.problems.map((problem: string) => h('li', { 'data-state': 'problem' }, isolated(problem))) : [h('li', { text: t.export.schemaOk }), h('li', { text: t.export.engineOk }), h('li', { text: changed ? t.export.size(changed) : t.export.empty })]),
      );
      copy.disabled = download.disabled = latest.problems.length > 0;
    };
    refresh();
    ctx.onUpdate(refresh);

    // The import is written when its fold first opens.
    const importFold = fold({ label: t.import.title, attrs: { class: 'ts-import' } });
    importFold.addEventListener('toggle', () => importFold.open && importFold.children.length === 1 && importFold.append(...importForm()));
    return panel(
      ctx,
      { title: adapter ? t.file.title : t.export.title, key: 'export', actions: [filename] },
      h(
        'div',
        { class: 'ts-export-grid' },
        h(
          'div',
          { class: 'ts-export-side' },
          h('div', { class: 'ts-stack' }, id, name),
          checks,
          h('div', { class: 'ts-actions' }, copy, download, reset),
          adapter ? null : h('div', { class: 'ts-next' }, h('p', { class: 'ts-subhead', text: t.export.next }), h('ol', {}, h('li', {}, init), h('li', {}, put), h('li', {}, h('code', { text: 'npx tanrei build' }))), h('p', { class: 'ts-help' }, links.layers ? rich((at) => t.sentences(t.export.authoritative, at(h('a', { href: links.layers, text: t.export.layersLink })))) : t.export.authoritative)),
        ),
        inspect === 'source' ? null : h('pre', { class: 'ts-json', tabindex: '0', 'aria-label': t.export.jsonLabel }, json),
      ),
      folds({}, importFold),
    );
  }

  function importLayer(text: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw new Error(t.labelled(t.import.invalidJson, (error as Error).message));
    }
    const next = studio.fromLayer(parsed);
    if (adapter && next.id !== layer.id) throw new Error(t.file.idLocked);
    ctx.commit(next, { rebuild: true });
  }

  // ── the file (adapter) ────────────────────────────────────────────────────────────────────────
  const buildResult = h('div', { class: 'ts-build', 'data-build-result': true });
  function drawFile() {
    if (!adapter) return file.replaceChildren();
    const run = adapter.build
      ? button(t.file.build, async () => {
          run!.disabled = true;
          try {
            if (saveState === 'unsaved') await saveNow();
            const result = await adapter.build!();
            buildResult.replaceChildren(
              h('p', { class: 'ts-subhead', text: t.listed(t.file.built, t.a11y.warnings(result.warnings.length)) }),
              h('ul', { class: 'ts-checks' }, result.files.map((entry) => h('li', { 'data-state': entry.changed === false ? undefined : 'pending' }, h('span', {}, h('code', { text: entry.path }), ' ', rich((at) => (entry.changed === false ? t.listed(at(ltr(entry.target)), t.file.unchanged) : at(ltr(entry.target)))))))),
              result.warnings.length ? scrollingList(t.a11y.warnings(result.warnings.length), {}, result.warnings.map((warning) => h('li', {}, isolated(warning)))) : '',
            );
          } catch (error) {
            buildResult.replaceChildren(h('p', { class: 'ts-error', text: (error as Error).message }));
          }
          run!.disabled = false;
        }, { 'data-build': true })
      : null;
    const parts = [h('span', { class: 'ts-save', 'data-save-state': saveState, title: saveProblem }, h('i'), t.file.states[saveState], adapter.label ? h('code', { text: adapter.label }) : null), run, saveProblem ? h('p', { class: 'ts-error', text: saveProblem }) : null, buildResult];
    file.replaceChildren(...(parts.filter(Boolean) as HTMLElement[]));
  }
  const setSave = (next: SaveState, problem = '') => ((saveState = next), (saveProblem = problem), drawFile());

  function scheduleSave() {
    remember();
    if (linked) writeAddress();
    if (!adapter || saveState === 'loading') return;
    if (stringifyLayer(committed) === savedText && saveState !== 'conflict') return setSave('saved');
    if (saveState === 'conflict') return; // the person decides first
    setSave(latest.ok ? 'unsaved' : 'invalid');
    window.clearTimeout(timer);
    if (latest.ok) timer = window.setTimeout(saveNow, saveDelay);
  }
  async function saveNow() {
    if (!adapter || !latest.ok) return;
    window.clearTimeout(timer);
    const text = stringifyLayer(committed);
    const sending = committed;
    setSave('saving');
    try {
      const result = await adapter.save(sending, etag);
      if (result.conflict) return conflict(result.conflict);
      etag = result.etag;
      savedText = text;
      if (committed === sending) setSave('saved');
      else scheduleSave();
    } catch (error) {
      setSave('error', (error as Error).message);
    }
  }
  /** The file changed underneath us: never overwrite it, never drop our edits, without being told to. */
  function conflict(remote: { layer: Layer; etag?: string }) {
    if (JSON.stringify(remote.layer) === JSON.stringify(layer)) {
      etag = remote.etag;
      savedText = stringifyLayer(layer);
      return setSave('saved');
    }
    theirs = remote;
    window.clearTimeout(timer);
    const dirty = stringifyLayer(layer) !== savedText;
    setSave('conflict');
    banner.replaceChildren(
      h('b', { slot: 'title', text: t.file.changedOnDisk }),
      ` ${dirty ? t.file.changedDirty : t.file.changedClean}`,
      h(
        'div',
        { class: 'ts-actions', slot: 'actions' },
        button(t.file.reload, () => {
          layer = committed = studio.fromLayer(theirs!.layer);
          history.clear();
          drawHistory();
          etag = theirs!.etag;
          savedText = stringifyLayer(layer);
          dismiss('saved');
          build();
        }, { primary: true, 'data-reload': true }),
        button(dirty ? t.file.keepMine : t.file.keepOpen, () => {
          etag = theirs!.etag; // our next save replaces what is on disk now, knowingly
          dismiss('unsaved');
          saveNow();
        }, { 'data-keep-mine': true }),
      ),
    );
    banner.open = true;
  }
  function dismiss(next: SaveState) {
    theirs = null;
    banner.open = false;
    banner.replaceChildren();
    setSave(next);
  }

  // ── what is typed, stepped or dragged ─────────────────────────────────────────────────────────
  // A drag reports a value for every move of the pointer — a picker or a slider, many times a frame — and computing
  // the layer is the whole build: the token engine, the emitter and the checks. So a value shown while it moves is
  // shown at the next frame, the latest one only. A palette's color and a dial are drawn without computing the layer,
  // into the sheet that is there (core.liveProperties, preview.patch); the layer is computed when the value is
  // committed, or once the pointer has rested a moment — and every other value is computed at that frame.
  let frame = 0;
  let resting: number | undefined;
  const REST = 150;
  function follow() {
    frame ||= requestAnimationFrame(() => {
      frame = 0;
      const properties = last ? (studio.liveProperties(last, layer) as Record<string, string> | null) : null;
      if (!properties) return update();
      preview.patch(properties);
      window.clearTimeout(resting);
      window.clearTimeout(wording);
      resting = window.setTimeout(update, REST);
    });
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────────────────────────
  // What is typed into a name, a reason or a description is no value (core.valueKey): the page shows it at once —
  // the file, the fields, the checks — and the layer is not computed for it. A reason, a rationale or a palette's
  // description is also written into the model as text (a token's "fixed" reason in Every token): those words catch
  // up once the typing has rested, as a dragged value does.
  let wording: number | undefined;
  const COMPUTE = `${NS}-studio: compute`;
  /** The layer, computed (core.preview): each time it is, a measure on the page's timeline that DevTools shows — the last one is kept. */
  function compute(options?: { worded?: boolean }) {
    cancelAnimationFrame(frame);
    frame = 0;
    window.clearTimeout(resting);
    window.clearTimeout(wording);
    const started = performance.now();
    const before = latest.computation;
    latest = studio.preview(layer, options) as Json;
    if (latest.computation !== before) {
      performance.clearMeasures(COMPUTE);
      performance.measure(COMPUTE, { start: started });
    }
    if (!latest.worded) wording = window.setTimeout(() => update({ worded: true }), REST);
  }
  function update(options?: { worded?: boolean }) {
    compute(options);
    if (latest.model) last = latest;
    if (last) preview.apply(last, contrast);
    preview.stale.hidden = Boolean(latest.model);
    railView.refresh();
    for (const refresh of refreshers) refresh();
    remember();
  }

  function build() {
    refreshers = [];
    compute();
    if (latest.model) last = latest;
    // A layer that cannot be computed at all still needs controls to fix it: fall back to its base.
    if (!last) last = studio.preview({ id: 'studio-fallback', extends: studio.systems.some((s: Json) => s.id === layer.extends) ? layer.extends : studio.defaultId }) as Json;
    const switched = root.dataset.pane !== pane();
    root.dataset.pane = pane();
    root.dataset.section = section;
    if (switched) {
      drawPanelWidth();
      drawHandle();
    }
    drawFrame();
    controls.replaceChildren(...((inspect === 'tokens' ? tokensInspect(ctx, tree) : inspect === 'source' ? sourceLevel(ctx) : sectionPanels(ctx, section, place)).filter(Boolean) as HTMLElement[]));
    a11y.replaceChildren(!inspect && section === 'a11y' ? accessibilityPanel() : '');
    exportHost.replaceChildren(exportPanel());
    drawFile();
    update();
  }

  // ── the layer in the address (`address`) ──────────────────────────────────────────────────────
  // Written a moment after each commit, in place of the address the tab has (the Back button still leaves the Studio):
  // a link copied from the address bar opens the Studio on this layer. An untouched layer writes none. A layer that
  // arrives in the address — the page opened from a link, or a link pasted into this tab — is shown, and the one this
  // browser kept is not written over: it stays the one kept until the person edits the link's layer or keeps it, and
  // the notice above the frame leads back to it.
  let addressTimer: number | undefined;
  let written: string | null = linked ? layerParam(location.hash) : null;
  function writeAddress() {
    window.clearTimeout(addressTimer);
    addressTimer = window.setTimeout(async () => {
      const text = stringifyLayer(committed);
      let code: string | null;
      try {
        code = text === stringifyLayer(studio.blank()) ? null : await packLayer(text);
      } catch {
        // The page is going away under the compression (WebKit fails its stream then): there is no address to write.
        return;
      }
      if (!live || code === written) return;
      written = code;
      window.history.replaceState(window.history.state, '', `${location.pathname}${location.search}${withLayer(location.hash, code)}`);
    }, 250);
  }
  /**
   * Show the layer of a link. The layer this browser kept — `kept`, unless one is already set aside — is set aside when
   * it holds anything the link's does not: an untouched layer, or the same one, is no work to lose.
   */
  function showShared(next: Layer, kept: Layer) {
    const aside = mine ?? kept;
    layer = committed = next;
    history.clear();
    drawHistory();
    if (stringifyLayer(aside) === stringifyLayer(next) || stringifyLayer(aside) === stringifyLayer(studio.blank())) {
      mine = null;
      sharedBanner.open = false;
      return;
    }
    mine = aside;
    sharedBanner.replaceChildren(
      h('b', { slot: 'title', text: t.shared.title }),
      ` ${t.shared.body}`,
      h('div', { class: 'ts-actions', slot: 'actions' }, button(t.shared.keep, () => keepShared(t.shared.kept), { primary: true, 'data-keep-shared': true }), button(t.shared.mine, () => backToMine(), { 'data-back-to-mine': true })),
    );
    sharedBanner.open = true;
  }
  /** The link's layer is the person's from now on: kept in this browser, in the place of the one set aside. */
  function keepShared(said: string) {
    mine = null;
    sharedBanner.open = false;
    remember();
    ctx.announce(said);
  }
  /** Back to the layer this browser kept: drawn, and written into the address in the place of the link's. */
  function backToMine() {
    if (!mine) return;
    const inside = sharedBanner.contains(document.activeElement);
    layer = committed = mine;
    mine = null;
    sharedBanner.open = false;
    history.clear();
    build();
    drawHistory();
    remember();
    writeAddress();
    if (inside) inspector.focus({ preventScroll: true });
    ctx.announce(t.shared.back);
  }
  /** The layer of the address, or `null` when it holds none, or none that can be read (a link cut short is left alone). */
  async function readAddress(): Promise<Layer | null> {
    const code = layerParam(location.hash);
    if (!code) return null;
    try {
      written = code;
      return studio.fromLayer(await unpackLayer(code));
    } catch {
      return null;
    }
  }
  const onHash = () => {
    if (layerParam(location.hash) === written) return;
    readAddress().then((next) => {
      if (!live || !next) return;
      showShared(next, committed);
      build();
    });
  };
  let live = true;
  if (linked && layerParam(location.hash)) {
    // Read before the first drawing, so that the layer of the link is the first one drawn.
    readAddress().then((next) => {
      if (!live) return;
      if (next) showShared(next, layer);
      build();
      remember();
    });
  } else build();
  if (linked) addEventListener('hashchange', onHash);
  let stopWatching = () => {};
  /** The host's local parent layers, before anything that extends them is computed. A host without them has none. */
  const loadParents = async () => studio.setParents(adapter?.parents ? await adapter.parents().catch(() => []) : []);
  if (adapter) {
    loadParents()
      .then(() => adapter.load())
      .then((loaded) => {
        layer = committed = studio.fromLayer(loaded.layer);
        history.clear();
        drawHistory();
        draft.belongsTo(layer.id);
        etag = loaded.etag;
        savedText = stringifyLayer(layer);
        saveState = 'saved';
        build();
        stopWatching =
          adapter.watch?.(
            (remote) => remote.etag !== etag && conflict(remote),
            // A parent changed on disk: what this layer inherits changed, so everything is computed again.
            () => loadParents().then(build),
          ) ?? stopWatching;
      })
      .catch((error: Error) => setSave('error', error.message));
  }

  // For scripts and agents driving the page: the same layer the controls edit.
  const api = {
    getState: () => ({ layer: structuredClone(layer), section, inspect, locks: [...locks], contrast, saveState, draft: draft.text, canUndo: history.canUndo, canRedo: history.canRedo }),
    getLayer: () => structuredClone(layer),
    setLayer: (next: Layer) => ctx.commit(studio.fromLayer(next), { rebuild: true }),
    importLayer: (input: string | object) => importLayer(typeof input === 'string' ? input : JSON.stringify(input)),
    /** Show a section of the rail in the panel, or open Inspect (`{ inspect: 'tokens' | 'source' }`). */
    show: (to: Place) => show(to),
    /** Every row that is not locked, another of its values. */
    shuffle: () => shuffleRows(),
    setContrast: (next: Contrast) => ((contrast = next), build()),
    undo: () => undo(),
    redo: () => redo(),
    /** One operation on one token, or `null` to revert it; returns the problem, if it was not written. */
    applyOperation: (id: string, op: Json | null) => {
      const result = studio.applyOperation(layer, id, op) as Json;
      if (!result.problem) ctx.commit(result.layer, { rebuild: true });
      return result.problem ?? null;
    },
    /** `{ vocabulary, tokens? }`; returns the problem, if it was not written. */
    addExtension: (fragment: Json) => {
      const result = studio.addExtension(layer, fragment) as Json;
      if (!result.problem) ctx.commit(result.layer, { rebuild: true });
      return result.problem ?? null;
    },
    getWarnings: () => [...(last?.warnings ?? [])],
    getProblems: () => [...(latest.problems ?? [])],
    /** The words a component on this page needed and nobody gave (`missingWords()` of @tanrei/web): empty, or a defect. */
    missingWords: () => missingWords(),
    describe: (id: string) => (last ? studio.describe(last, id) : null),
    save: () => saveNow(),
    destroy: () => {
      stopWatching();
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
      window.clearTimeout(resting);
      window.clearTimeout(wording);
      window.clearTimeout(addressTimer);
      live = false;
      document.removeEventListener('keydown', onKey);
      removeEventListener('hashchange', onHash);
      resized.disconnect();
    },
  };
  (window as Json)[`${NS}Studio`] = api;
  return api;
}
