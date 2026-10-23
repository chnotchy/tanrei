// The live preview: a real system scope with real components. The scope gets the WHOLE sheet `tanrei build` would
// write for this layer (core.preview → the build's emitter), so everything the layer changes is applied — not a
// curated subset — to every component on every screen. What is drawn comes from the system itself (./screens.ts).
//
// Above the screen, how it is seen: which of the five screens, light, dark or the two side by side, and the
// contrast. None of that is the layer's: it is not saved in the file, only remembered in this browser.
import { type Contrast, type Ctx, type Json, cssColor, h, short, stateChip } from './dom';
import { createHighlighter } from './highlight';
import { SCREENS, type Screen, drawScreen } from './screens';

export type Mode = 'light' | 'dark' | 'both';
const MODES: Mode[] = ['light', 'dark', 'both'];
const MODE_ICONS: Record<Mode, string> = { light: 'light_mode', dark: 'dark_mode', both: 'splitscreen_left' };
const CONTRASTS: Contrast[] = ['standard', 'medium', 'high'];

let scopes = 0;

export function createPreview(ctx: Ctx, { contrast, onContrast }: { contrast: Contrast; onContrast: (level: Contrast) => void }) {
  const { t, studio } = ctx;
  const NS = studio.namespace;
  const STORE = `${NS}-studio-preview`;
  const scopeId = `studio-preview-${++scopes}`;
  const sheet = h('style', { 'data-sheet': true });
  const stale = h('p', { class: 'ts-stale', hidden: true, text: t.preview.stale, 'data-stale': true });
  // The count of warnings, and the way to them: the rail's Accessibility, in the panel.
  const badge = stateChip(() => ctx.show({ section: 'a11y' }), { 'data-a11y-count': true });
  const scope = h('div', { class: 'ts-scope', 'data-scope': true, [`data-${NS}-system`]: scopeId, [`data-${NS}-contrast`]: contrast });

  // ── how the preview is seen: kept in this browser, never in the layer ─────────────────────────────
  let screen: Screen = 'overview';
  // The first time, the scheme the page is drawn in.
  let mode: Mode = getComputedStyle(document.documentElement).colorScheme === 'dark' || document.documentElement.getAttribute(`data-${NS}-theme`) === 'dark' ? 'dark' : 'light';
  try {
    const stored = JSON.parse(localStorage.getItem(STORE) ?? 'null');
    if (SCREENS.includes(stored?.screen)) screen = stored.screen;
    if (MODES.includes(stored?.mode)) mode = stored.mode;
  } catch {}
  const keep = () => {
    try {
      localStorage.setItem(STORE, JSON.stringify({ screen, mode }));
    } catch {}
  };

  let emphasized = false;
  // The style ATTRIBUTE is rewritten whole: touching one longhand through `el.style` makes the browser expand the
  // `font: var(…)` shorthand into longhands and lose it.
  const drawEmphasis = () => {
    for (const p of scope.querySelectorAll<HTMLElement>('.ts-ramp [data-emphasized-weight]')) p.setAttribute('style', emphasized ? `${p.dataset.font} font-weight: ${p.dataset.emphasizedWeight};` : p.dataset.font!);
    scope.toggleAttribute('data-emphasized', emphasized);
  };

  /**
   * The panes: one, or light and dark side by side. A pane is drawn once for a screen and kept while what is drawn
   * stays the same (`drawn`), so that switching screens or modes moves elements that exist — it creates none, and
   * no component is set up again. A switch between light and dark changes the one pane's scheme.
   */
  let view: Json | null = null;
  let drawn = '';
  const panes = new Map<string, HTMLElement>();
  let uid = 0;
  function pane(name: Screen, slot: number) {
    const key = `${name}:${slot}`;
    let el = panes.get(key);
    if (!el) {
      const label = h('span', { class: 'ts-pane-label', 'data-pane-label': true });
      el = h('section', { class: 'ts-pane', 'data-pane': slot }, label, drawScreen(name, { ctx, view: view!, uid: `${scopeId}-${++uid}`, distinct: slot ? t.dark : undefined }));
      panes.set(key, el);
    }
    return el;
  }
  function drawPanes() {
    if (!view) return;
    const started = performance.now();
    const shown = mode === 'both' ? [pane(screen, 0), pane(screen, 1)] : [pane(screen, 0)];
    const themes: ('light' | 'dark')[] = mode === 'both' ? ['light', 'dark'] : [mode];
    shown.forEach((el, i) => {
      el.setAttribute(`data-${NS}-theme`, themes[i]);
      el.setAttribute('aria-label', t[themes[i]]);
      (el.querySelector('[data-pane-label]') as HTMLElement).textContent = t[themes[i]];
    });
    if (shown.some((el, i) => scope.children[i] !== el) || scope.children.length !== shown.length) scope.replaceChildren(...shown);
    scope.dataset.mode = mode;
    scope.dataset.screen = screen;
    drawEmphasis();
    highlighter.clear();
    performance.clearMeasures(SHOWN);
    performance.measure(SHOWN, { start: started });
  }
  const SHOWN = `${NS}-studio: preview shown`;

  /** The computation the sheet and the panes were last written from, and the sheet. */
  let applied: Json | undefined;
  let written = '';
  /** What a drag wrote on the elements the sheet's tokens are declared on: those elements, and the properties. */
  let patched: { on: HTMLElement[]; names: Set<string> } | undefined;
  /**
   * While a palette's color or a dial is dragged: what the applied view's sheet would change (core.liveProperties),
   * set as the person moves on the elements the sheet declares its tokens on — the scope, and a contrast set inside it
   * (emitCss's base block). The sheet is neither written again nor changed: the browser parses nothing and restyles
   * the preview alone, which costs a third of what writing the sheet costs, or less (and changing a rule of the sheet
   * restyles the page). Each patch is the whole difference from the applied view, so a property it no longer names —
   * a value dragged back to where it started — is taken off. The next `apply` takes them all off: what is drawn then
   * is the sheet of the view it applies.
   */
  function patch(properties: Record<string, string>) {
    patched ??= { on: [scope, ...scope.querySelectorAll<HTMLElement>(`[data-${NS}-contrast]`)], names: new Set() };
    for (const name of patched.names) {
      if (name in properties) continue;
      patched.names.delete(name);
      for (const el of patched.on) el.style.removeProperty(name);
    }
    for (const [name, value] of Object.entries(properties)) {
      patched.names.add(name);
      for (const el of patched.on) el.style.setProperty(name, value);
    }
  }
  function unpatch() {
    for (const el of patched?.on ?? []) for (const name of patched!.names) el.style.removeProperty(name);
    patched = undefined;
  }

  /** What the screens draw of the system itself: the variants and sizes its components declare, its intents, its added steps, its own tokens. */
  const whatIsDrawn = (next: Json) =>
    JSON.stringify([
      Object.entries(next.model.components as Json).map(([name, declared]: [string, Json]) => [name, declared.states?.variants, declared.axes?.variant?.values, declared.axes?.size?.values]),
      next.intents,
      next.system.name,
      Object.values(next.model.tokens as Json)
        .filter((token: Json) => token.vocabulary?.extension || token.namespace !== NS)
        .map((token: Json) => [token.id, token.namespace !== NS && token.value]),
    ]);

  function apply(next: Json, level: Contrast) {
    scope.setAttribute(`data-${NS}-contrast`, level);
    contrastTabs.value = level;
    // A layer is computed once for its values (core.preview), so the same computation is the same sheet and the same
    // panes: a level drawn again, another contrast, or a name or a reason typed, writes neither. The sheet is the
    // system's whole — written again it has the browser read it again, and style and lay out the whole page with it —
    // so a computation that only brought the model's words up to date, and wrote the same sheet, does not write it.
    if (patched) unpatch();
    if (next.computation !== applied) {
      applied = next.computation;
      view = next;
      const css = next.css(scopeId);
      if (css !== written) sheet.textContent = written = css;
      // The panes are drawn again only when WHAT is drawn changes (a variant, a size, a step, an own token) — values arrive through the sheet.
      const key = whatIsDrawn(next);
      if (key !== drawn) {
        drawn = key;
        panes.clear();
        scope.replaceChildren();
        drawPanes();
      }
      // What a setting reaches is read from the page's rules and this sheet: read once the page is idle.
      const idle = window.requestIdleCallback ?? ((then: () => void) => window.setTimeout(then, 200));
      idle(() => highlighter.warm());
    }
    const count = next.warnings.length;
    badge.say(count ? t.a11y.warnings(count) : t.a11y.pass, count ? 'warning' : 'check_circle');
    badge.dataset.state = count ? 'warn' : 'pass';
  }

  function setScreen(next: Screen) {
    if (!SCREENS.includes(next)) return;
    screen = next;
    screenTabs.value = next;
    keep();
    drawPanes();
  }
  function setMode(next: Mode) {
    if (!MODES.includes(next)) return;
    mode = next;
    modeTabs.value = next;
    keep();
    drawPanes();
  }

  const highlighter = createHighlighter({ scope, sheet, view: () => view, cssVar: studio.cssVar });

  // ── the bar ───────────────────────────────────────────────────────────────────────────────────
  const s = t.screens;
  const id = ctx.uid('ts-h');
  const note = ctx.uid('ts-note');
  const tabs = <T extends string>(attrs: Json, options: { value: T; label: string; icon?: string }[], value: T, onchange: (value: T) => void) => {
    const row = h('tanrei-tabs', { size: 'small', ...attrs }, options.map((option) => h('tanrei-tab', { value: option.value, label: option.label, icon: option.icon, 'label-hidden': Boolean(option.icon), title: option.icon ? option.label : undefined, 'data-value': option.value, 'aria-describedby': attrs['data-condition'] ? note : undefined })));
    row.value = value;
    row.addEventListener('change', (event) => event.target === row && row.value !== null && onchange(row.value as T));
    return row;
  };
  const screenTabs = tabs({ label: s.label, variant: 'secondary', 'data-screens': true }, SCREENS.map((value) => ({ value, label: s.names[value] })), screen, setScreen);
  const modeTabs = tabs({ label: s.mode, variant: 'tonal', track: 'false', transition: 'none', 'data-modes': true, 'data-condition': true }, MODES.map((value) => ({ value, label: s.modes[value], icon: MODE_ICONS[value] })), mode, setMode);
  // The contrast, as the documentation's header chooses it: the word, then three quiet tabs.
  const contrastTabs = tabs({ label: t.preview.contrast, variant: 'tonal', track: 'false', transition: 'none', 'data-contrast': true, 'data-condition': true }, CONTRASTS.map((value) => ({ value, label: t.preview.levels[value] })), contrast, onContrast);
  const emphasisToggle = h('tanrei-checkbox', { label: t.preview.emphasized, 'data-emphasized-toggle': true, title: t.preview.emphasizedHelp, onchange: () => ((emphasized = emphasisToggle.checked), drawEmphasis()) });
  // A link in a screen goes nowhere: the page's address is the Studio's (it may hold the layer).
  scope.addEventListener('click', (event) => (event.composedPath() as Element[]).some((node) => node instanceof HTMLAnchorElement) && event.preventDefault());
  const el = h(
    'div',
    { class: 'ts-preview', 'aria-labelledby': id },
    h(
      'header',
      { class: 'ts-preview-bar' },
      h('h2', { id, class: 'ts-eyebrow', text: t.preview.title }),
      screenTabs,
      h(
        'div',
        { class: 'ts-preview-conditions', role: 'group', 'aria-label': s.conditions },
        modeTabs,
        h('span', { class: 'ts-preview-word', 'aria-hidden': 'true', text: t.preview.contrast }),
        contrastTabs,
        h('span', { class: 'ts-row-actions' }, badge, emphasisToggle),
      ),
      h('p', { id: note, class: 'ts-preview-note', text: s.conditions }),
    ),
    stale,
    sheet,
    scope,
  );
  return {
    el,
    apply,
    patch,
    stale,
    scopeId,
    short: (tokenId: string) => short(tokenId, NS),
    cssColor,
    /** Outline, for a moment, the parts of the screen shown that read one of these tokens; how many there are. */
    highlight: (ids: string[]) => highlighter.highlight(ids),
    clearHighlight: () => highlighter.clear(),
    setScreen,
    setMode,
    state: () => ({ screen, mode }),
  };
}
