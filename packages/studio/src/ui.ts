// Theme Studio — the page half. One layer, four views of it (the level is a view, never a mode of the file), a live
// preview, and — when the host gives an adapter — the file that layer lives in.
import { missingWords, setWords } from '@tanrei/web';
import { ID_PATTERN, LEVELS, stringifyLayer } from './core.js';
import { createSourceDraft } from './draft.js';
import { studio } from './data';
import { type StudioStrings, studioDirection, studioLanguage, studioStrings } from './strings';
import { type Contrast, type Ctx, type Json, type Layer, type Level, button, codeField, fold, folds, h, isolated, ltr, panel, rename, rich, scrollingList, stateChip, textField, views } from './ui/dom';
import { essentialsLevel, groupsLevel } from './ui/levels';
import { createPreview } from './ui/preview';
import { sourceLevel } from './ui/source';
import { type TreeState, tokensLevel } from './ui/tokens';

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
}
type SaveState = 'saved' | 'unsaved' | 'saving' | 'invalid' | 'conflict' | 'error' | 'loading';

const STORE = `${studio.namespace}-theme-studio`;
const NS = studio.namespace;
/** The Studios mounted in this document: while there is one, the root says so (studio.css gives the page a tool's width). */
let mounted = 0;
const MOUNTED = 'data-ts-mounted';

export function mountStudio(root: HTMLElement, { lang = 'en', adapter, links = {}, saveDelay = 600 }: StudioOptions = {}) {
  // The language the Studio speaks: the one asked for when it is translated, English otherwise (./strings/index.ts).
  const speaks = studioLanguage(lang);
  const t: StudioStrings = studioStrings(speaks);
  let layer: Layer = studio.blank();
  /** The layer as it was last COMMITTED: what is saved. `layer` runs ahead of it while a value is typed, stepped or dragged (`preview`). */
  let committed: Layer = layer;
  let level: Level = 'essentials';
  let contrast: Contrast = 'standard';
  let last: Json | null = null; // the last VALID preview: what the scope shows
  let latest: Json = {}; // the latest preview, valid or not: what Export shows
  let refreshers: (() => void)[] = [];
  let uid = 0;
  let focus: { token?: string; panel?: string } | undefined;
  const tree: TreeState = { query: '', filter: 'all', open: new Set() };

  // ── persistence: the browser (no adapter) or the host's file (adapter) ────────────────────────
  let etag: string | undefined;
  let saveState: SaveState = adapter ? 'loading' : 'saved';
  let saveProblem = '';
  let savedText = '';
  let timer: number | undefined;
  let theirs: { layer: Layer; etag?: string } | null = null;

  // Text typed at "Source" that does not parse (./draft.js). It is remembered with the rest, so a reload keeps it too.
  let draft = createSourceDraft();
  function remember() {
    try {
      localStorage.setItem(STORE, JSON.stringify(adapter ? { level, contrast, draft } : { layer, level, contrast, draft }));
    } catch {}
  }
  function recall() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORE) ?? 'null');
      if (LEVELS.includes(stored?.level)) level = stored.level;
      if (['standard', 'medium', 'high'].includes(stored?.contrast)) contrast = stored.contrast;
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
      if (!options?.preview) committed = next;
      if (options?.rebuild) build();
      else if (options?.preview) follow();
      else update();
      if (!options?.preview) scheduleSave();
    },
    rebuild: () => build(),
    onUpdate: (refresh) => refreshers.push(refresh),
    announce: (message) => (status.textContent = message),
    setLevel,
    locked: { id: Boolean(adapter) },
    uid: (prefix) => `${prefix}-${++uid}`,
    get draft() {
      return draft;
    },
    draftChanged: () => (drawLevels(), remember()),
  };

  // ── the frame: what stays while the levels change ─────────────────────────────────────────────
  root.classList.add('ts', 'not-content');
  root.dataset.studio = '';
  // The page's width follows from this attribute, written here and taken back by `destroy` — never from a `:has()`
  // on the root, which every page that loads the Studio's stylesheet would pay for (studio.css).
  let live = true;
  mounted += 1;
  document.documentElement.setAttribute(MOUNTED, '');
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
  const levels = h('div', { class: 'ts-levels' });
  const file = h('div', { class: 'ts-file', 'data-file': true });
  // What changed underneath the person, and the two answers: a live callout (it is announced when it opens).
  const banner = h('tanrei-callout', { class: 'ts-banner', status: 'warning', 'status-label': t.file.states.conflict, live: true, open: 'false', 'data-banner': true });
  const a11y = h('div');
  const exportHost = h('div');
  root.replaceChildren(h('header', { class: 'ts-top' }, levels, file), banner, h('div', { class: 'ts-layout' }, controls, preview.el), a11y, exportHost, status);

  // The four levels are four views of one layer: tabs. They stay while the level changes, so the keyboard keeps its place.
  const levelTabs = views<Level>({ label: t.levels.label, variant: 'primary', attrs: { 'data-levels': true }, options: (LEVELS as Level[]).map((value) => ({ value, label: t.levels[value] })), value: level, onchange: (value) => setLevel(value) });
  // Said in words wherever the person is: the text they typed at Source is still there, and is not what is saved.
  const draftBadge = stateChip(() => setLevel('source'), { class: 'ts-draft-badge', 'data-draft-badge': true, title: t.source.draftHelp });
  draftBadge.say(t.source.draftBadge, 'warning');
  const levelHelp = h('p', { class: 'ts-help ts-level-help' });
  levels.append(levelTabs, levelHelp);
  function drawLevels() {
    levelTabs.value = level;
    // (It keeps focus while it stays: it is taken out only when the draft is gone.)
    if (draft.pending && !draftBadge.isConnected) levelTabs.after(draftBadge);
    else if (!draft.pending) draftBadge.remove();
    levelHelp.textContent = t.levels.help[level];
  }

  function setLevel(next: Level, target?: { token?: string; panel?: string }) {
    level = next;
    focus = target;
    if (target?.token && next === 'tokens' && target.panel !== 'add') Object.assign(tree, { selected: target.token, query: '', filter: 'all' });
    build();
    const panelKey = target?.panel ?? (target?.token ? 'tree' : undefined);
    if (panelKey) queueMicrotask(() => root.querySelector(`[data-panel="${panelKey}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
    focus = undefined;
  }

  // ── accessibility ─────────────────────────────────────────────────────────────────────────────
  function drawAccessibility() {
    const pairs = h('div', { class: 'ts-pairs', 'data-pairs': true });
    const total = h('bdi', { 'data-warnings-count': true });
    const warnings = scrollingList(t.a11y.all, { 'data-warnings': true });
    const notices = h('ul', { class: 'ts-warnings' });
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
      warnings.replaceChildren(...(count ? last.warnings.map((warning: string) => h('li', {}, isolated(warning))) : [h('li', { text: t.a11y.none })]));
      notices.replaceChildren(...last.notices.map((notice: string) => h('li', {}, isolated(notice))));
    };
    refresh();
    ctx.onUpdate(refresh);
    a11y.replaceChildren(level === 'essentials' ? '' : panel(ctx, { title: t.a11y.title, help: t.a11y.help, key: 'a11y' }, pairs, folds({}, fold({ label: t.a11y.all, trailing: total, attrs: { 'data-warnings-wrap': true } }, warnings)), notices));
  }

  // ── export / save ─────────────────────────────────────────────────────────────────────────────
  function drawExport() {
    const compact = level === 'essentials';
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
    const reset = button(t.export.reset, () => window.confirm(t.export.confirmReset) && ctx.commit({ ...studio.blank(layer.extends ?? studio.rootId), id: layer.id }, { rebuild: true }), { 'data-reset': true });

    // The layer to import: JSON, in a text field that holds code, which says itself what does not parse.
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

    exportHost.replaceChildren(
      panel(
        ctx,
        { title: adapter ? t.file.title : t.export.title, key: 'export', actions: [filename] },
        h(
          'div',
          { class: `ts-export-grid${compact || level === 'source' ? ' ts-export-compact' : ''}` },
          h(
            'div',
            { class: 'ts-export-side' },
            h('div', { class: compact ? 'ts-grid-2' : 'ts-stack' }, id, compact ? null : name),
            checks,
            h('div', { class: 'ts-actions' }, copy, download, reset),
            compact || adapter ? null : h('div', { class: 'ts-next' }, h('p', { class: 'ts-subhead', text: t.export.next }), h('ol', {}, h('li', {}, init), h('li', {}, put), h('li', {}, h('code', { text: 'npx tanrei build' }))), h('p', { class: 'ts-help' }, links.layers ? rich((at) => t.sentences(t.export.authoritative, at(h('a', { href: links.layers, text: t.export.layersLink })))) : t.export.authoritative)),
          ),
          compact || level === 'source' ? null : h('pre', { class: 'ts-json', tabindex: '0', 'aria-label': t.export.jsonLabel }, json),
        ),
        compact ? null : folds({}, fold({ label: t.import.title, attrs: { class: 'ts-import' } }, h('p', { class: 'ts-help', text: t.import.help }), importArea, h('div', { class: 'ts-actions' }, importApply))),
      ),
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
    for (const refresh of refreshers) refresh();
    remember();
  }

  function build() {
    refreshers = [];
    compute();
    if (latest.model) last = latest;
    // A layer that cannot be computed at all still needs controls to fix it: fall back to its base.
    if (!last) last = studio.preview({ id: 'studio-fallback', extends: studio.systems.some((s: Json) => s.id === layer.extends) ? layer.extends : studio.rootId }) as Json;
    root.dataset.level = level;
    drawLevels();
    const draw = { essentials: essentialsLevel, groups: groupsLevel, tokens: () => tokensLevel(ctx, tree, focus), source: sourceLevel }[level];
    controls.replaceChildren(...(draw(ctx).filter(Boolean) as HTMLElement[]));
    drawAccessibility();
    drawExport();
    drawFile();
    update();
  }

  build();
  let stopWatching = () => {};
  /** The host's local parent layers, before anything that extends them is computed. A host without them has none. */
  const loadParents = async () => studio.setParents(adapter?.parents ? await adapter.parents().catch(() => []) : []);
  if (adapter) {
    loadParents()
      .then(() => adapter.load())
      .then((loaded) => {
        layer = committed = studio.fromLayer(loaded.layer);
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
    getState: () => ({ layer: structuredClone(layer), level, contrast, saveState, draft: draft.text }),
    getLayer: () => structuredClone(layer),
    setLayer: (next: Layer) => ctx.commit(studio.fromLayer(next), { rebuild: true }),
    importLayer: (input: string | object) => importLayer(typeof input === 'string' ? input : JSON.stringify(input)),
    setLevel: (next: Level) => setLevel(next),
    setContrast: (next: Contrast) => ((contrast = next), build()),
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
      // Once for each mount, whatever the caller does twice; the last Studio of the document gives the width back.
      if (!live) return;
      live = false;
      mounted -= 1;
      if (mounted === 0) document.documentElement.removeAttribute(MOUNTED);
    },
  };
  (window as Json)[`${NS}Studio`] = api;
  return api;
}
