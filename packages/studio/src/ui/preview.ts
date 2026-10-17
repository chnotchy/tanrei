// The live preview: a real system scope with real components. The scope gets the WHOLE sheet `tanrei build` would
// write for this layer (core.preview → the build's emitter), so everything the layer changes is applied — not a
// curated subset. What is drawn comes from the system itself: the variants and sizes its components declare (added
// ones included), the steps of its series, the layer's own tokens.
import { emphasisFamily } from '../core.js';
import { type Contrast, type Ctx, type Json, cssColor, format, choice, h, ltr, rich, short, stateChip } from './dom';

/** Text styles by level: a heading of each face, running text, a label, code. Roles a layer adds follow. */
const RAMP = ['heading-1', 'heading-3', 'body', 'label', 'code'];
/** The same icons, unselected and selected: what the system's icon set, weight and fills make of them. */
const ICON_SET = ['home', 'favorite', 'bookmark', 'notifications', 'settings'];
const SPACES = ['space50', 'space100', 'space200', 'space300', 'space400'];
const CORNERS = ['extra-small', 'small', 'medium', 'large', 'extra-large'];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
/**
 * The components the preview draws a row of samples for: one element per variant and per size, labelled with it.
 * That is a button's shape; most other components' declared "variants" are states (checkbox: selected, error-…),
 * some declare none, and a sheet or a drawer drawn that way would open over the page. They follow the system through
 * the sheet all the same; they have no sample of their own yet.
 */
const SAMPLED = ['button'];

let scopes = 0;

export function createPreview(ctx: Ctx, { contrast, onContrast }: { contrast: Contrast; onContrast: (level: Contrast) => void }) {
  const { t, studio } = ctx;
  const NS = studio.namespace;
  const scopeId = `studio-preview-${++scopes}`;
  const sheet = h('style', { 'data-sheet': true });
  const stale = h('p', { class: 'ts-stale', hidden: true, text: t.preview.stale, 'data-stale': true });
  const badge = stateChip(() => ctx.root.querySelector('[data-panel="a11y"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), { 'data-a11y-count': true });
  const scope = h('div', { class: 'ts-scope', 'data-scope': true, [`data-${NS}-system`]: scopeId, [`data-${NS}-contrast`]: contrast });
  const v = (id: string) => `var(${studio.cssVar(id)})`;
  const font = (id: string) => `font: var(${studio.cssVar(id)}-font); letter-spacing: var(${studio.cssVar(id)}-letter-spacing);`;
  /**
   * Emphasis is a weight step, not a role: the sheet's `<role>-font-weight-emphasized` — the role's weight
   * plus its family's `sys.typescale.emphasis.*` — read live, so a step edited anywhere in the Studio moves the sample.
   * The same sum is the fallback, for a sheet that predates the property.
   */
  const emphasizedWeight = (id: string) => `var(${studio.cssVar(id)}-font-weight-emphasized, calc(var(${studio.cssVar(id)}-font-weight) + var(${studio.cssVar(`${NS}.sys.typescale.emphasis.${emphasisFamily(id.slice(`${NS}.sys.typescale.`.length))}`)})))`;
  let emphasized = false;
  let drawn = '';
  // The style ATTRIBUTE is rewritten whole: touching one longhand through `el.style` makes the browser expand the
  // `font: var(…)` shorthand into longhands and lose it.
  const drawEmphasis = () => {
    for (const p of scope.querySelectorAll<HTMLElement>('.ts-ramp [data-emphasized-weight]')) p.setAttribute('style', emphasized ? `${p.dataset.font} font-weight: ${p.dataset.emphasizedWeight};` : p.dataset.font!);
    scope.toggleAttribute('data-emphasized', emphasized);
  };

  function pane(theme: 'light' | 'dark', view: Json) {
    const tokens = view.model.tokens as Record<string, Json>;
    const added = (prefix: string, core: string[]) => Object.keys(tokens).filter((id) => id.startsWith(prefix) && tokens[id].vocabulary?.extension && !core.includes(id.slice(prefix.length)));
    const components = sampled(view).flatMap(([component, declared]: [string, Json]) => {
      const tag = `${studio.tagPrefix}-${component}`;
      const el = (attrs: Json, text: string) => h(tag as 'div', attrs, text);
      return [
        h('div', { class: 'ts-buttons', 'data-sample': 'variants' }, (declared.states?.variants ?? []).map((variant: string) => el({ variant }, cap(variant)))),
        h('div', { class: 'ts-buttons', 'data-sample': 'sizes' }, (declared.axes.size?.values ?? []).map((size: string) => el({ size }, cap(size))), el({ disabled: true }, t.sample.disabled)),
      ];
    });
    const texts: Record<string, string> = { 'heading-1': t.sample.headline, 'heading-3': t.sample.title, body: t.sample.body, label: t.sample.label, code: t.sample.code };
    const typescale = `${NS}.sys.typescale.`;
    const ramp = [...RAMP.map((role) => `${typescale}${role}`), ...added(typescale, RAMP)];
    const own = Object.values(tokens).filter((token) => token.namespace !== NS);
    const Tag = `${studio.tagPrefix}-button` as 'div';
    // Icons (@tanrei/web/icons.css): the face, the weight and the two fills are tokens of the system being edited.
    // The fill is never chosen by hand — it follows the state of the control the icon sits in, here `aria-pressed`.
    const icon = (name: string, attrs: Json = {}) => h('span', { class: `${studio.tagPrefix}-icon`, 'aria-hidden': 'true', translate: 'no', ...attrs }, name);
    // A toggle is the system's own: a real Button that switches, its glyph filled while it is on (BTN-13).
    const toggle = (pressed: boolean) => {
      const label = h('span', { text: pressed ? t.sample.selected : t.sample.unselected });
      const el = h(`${studio.tagPrefix}-button` as 'tanrei-button', { toggle: true, variant: 'outlined', size: 'small', selected: pressed, 'data-sample-toggle': true, onchange: () => (label.textContent = el.selected ? t.sample.selected : t.sample.unselected) }, icon('favorite', { slot: 'icon' }), label);
      return el;
    };
    const icons = h('div', { class: 'ts-buttons', 'data-sample': 'icons' }, h(Tag, {}, icon('add', { slot: 'icon' }), t.sample.withIcon), h(Tag, { variant: 'tonal', size: 'small' }, icon('edit', { slot: 'icon' }), t.sample.edit), toggle(false), toggle(true));
    // `data-selected` on a region selects every icon in it (icons.css): the family of that state AND its fill.
    const iconRow = (selected: boolean) => h('div', { class: 'ts-icon-row', 'data-icon-row': selected ? 'selected' : 'unselected', 'data-selected': selected ? 'true' : undefined }, h('span', { class: 'ts-icon-row-label', style: font(`${typescale}label-small`), text: selected ? t.sample.selected : t.sample.unselected }), ICON_SET.map((name) => icon(name)));
    const iconSet = h('div', { class: 'ts-icon-set', 'data-sample': 'icon-set' }, iconRow(false), iconRow(true));
    return h(
      'div',
      { class: 'ts-pane', [`data-${NS}-theme`]: theme },
      h('span', { class: 'ts-pane-label', style: font(`${typescale}label-small`), text: t[theme] }),
      // The line of code is a left-to-right run in every language: a command, then its comment.
      h('div', { class: 'ts-ramp' }, ramp.map((id) => h('p', { style: font(id), 'data-font': font(id), 'data-sample': id.slice(typescale.length), 'data-emphasized-weight': emphasizedWeight(id) }, id === `${typescale}code` ? ltr(texts.code) : (texts[id.slice(typescale.length)] ?? t.listed(id.slice(typescale.length), t.sample.added))))),
      ...components,
      icons,
      iconSet,
      h(
        'div',
        { class: 'ts-card' },
        h('p', { style: font(`${typescale}heading-5`), text: t.sample.cardTitle }),
        h('p', { style: font(`${typescale}body-small`), class: 'ts-card-body' }, rich((at) => t.sentences(t.sample.cardBody, at(h('a', { href: '#', class: 'ts-sample-link', text: t.sample.link, onclick: (event: Event) => event.preventDefault() }))))),
        h('div', { class: 'ts-card-actions' }, h(Tag, { variant: 'text', size: 'small' }, t.sample.cancel), h(Tag, { size: 'small' }, t.sample.save)),
      ),
      h(
        'div',
        { class: 'ts-intents', 'data-intents': true },
        view.intents.map((intent: string) => h('span', { class: 'ts-intent' }, h('span', { style: `background: var(${studio.roleVar(intent)}); color: var(${studio.roleVar(`on-${intent}`)});`, text: intent }), h('span', { style: `background: var(${studio.roleVar(`${intent}-container`)}); color: var(${studio.roleVar(`on-${intent}-container`)});`, text: 'Aa' }))),
        // A single role a layer declared, drawn with the role it names as its content.
        Object.entries(view.model.colors.light as Json).filter(([, token]) => (token as Json).vocabulary?.extension).map(([role, token]) => h('span', { class: 'ts-intent' }, h('span', { style: `background: var(${studio.roleVar(role)}); color: ${(token as Json).vocabulary.onRole ? v((token as Json).vocabulary.onRole) : 'inherit'};`, text: role }))),
      ),
      h(
        'div',
        { class: 'ts-measures', 'aria-hidden': 'true' },
        h('div', { class: 'ts-spaces' }, [...SPACES.map((step) => `${NS}.sys.space.${step}`), ...added(`${NS}.sys.space.`, SPACES)].map((id) => h('i', { style: `inline-size: ${v(id)};`, 'data-step': id }))),
        h('div', { class: 'ts-corners' }, [...CORNERS.map((step) => `${NS}.sys.shape.corner.${step}`), ...added(`${NS}.sys.shape.corner.`, CORNERS)].map((id) => h('i', { style: `border-radius: ${v(id)};`, 'data-step': id }))),
      ),
      own.length
        ? h(
            'div',
            { class: 'ts-own', 'data-own': true },
            h('span', { class: 'ts-pane-label', style: font(`${typescale}label-small`), text: t.sample.yours }),
            own.map((token) =>
              h(
                'div',
                { class: 'ts-own-row', style: font(`${typescale}label-small`), 'data-own-token': token.id },
                token.type === 'color' ? h('tanrei-swatch', { class: 'ts-own-swatch', decorative: true, size: 'small', shape: 'circle', color: v(token.id) }) : token.type === 'dimension' ? h('i', { class: 'ts-own-bar', style: `inline-size: ${v(token.id)};` }) : h('i'),
                h('span', { dir: 'ltr', text: token.id }),
                h('span', { dir: 'ltr', 'data-own-value': true, text: format(token.type, token.value) }),
              ),
            ),
          )
        : null,
    );
  }

  const sampled = (view: Json) => Object.entries(view.model.components as Json).filter(([component]) => SAMPLED.includes(component));

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

  function apply(view: Json, level: Contrast) {
    scope.setAttribute(`data-${NS}-contrast`, level);
    // A layer is computed once for its values (core.preview), so the same computation is the same sheet and the same
    // panes: a level drawn again, another contrast, or a name or a reason typed, writes neither. The sheet is the
    // system's whole — written again it has the browser read it again, and style and lay out the whole page with it —
    // so a computation that only brought the model's words up to date, and wrote the same sheet, does not write it.
    if (patched) unpatch();
    if (view.computation !== applied) {
      applied = view.computation;
      const css = view.css(scopeId);
      if (css !== written) sheet.textContent = written = css;
      // The panes are redrawn only when WHAT is drawn changes (a variant, a size, a step, an own token) — values arrive through the sheet.
      const key = JSON.stringify([sampled(view), view.intents, Object.values(view.model.tokens as Json).filter((token: Json) => token.vocabulary?.extension || token.namespace !== NS).map((token: Json) => [token.id, token.namespace !== NS && token.value])]);
      if (key !== drawn) {
        drawn = key;
        scope.replaceChildren(pane('light', view), pane('dark', view));
        drawEmphasis();
      }
    }
    const count = view.warnings.length;
    badge.say(count ? t.a11y.warnings(count) : t.a11y.pass, count ? 'warning' : 'check_circle');
    badge.dataset.state = count ? 'warn' : 'pass';
  }

  const id = ctx.uid('ts-h');
  const emphasisToggle = h('tanrei-checkbox', { label: t.preview.emphasized, 'data-emphasized-toggle': true, title: t.preview.emphasizedHelp, onchange: () => ((emphasized = emphasisToggle.checked), drawEmphasis()) });
  const el = h(
    'div',
    { class: 'ts-preview', 'aria-labelledby': id },
    h(
      'header',
      { class: 'ts-preview-bar' },
      h('h2', { id, class: 'ts-eyebrow', text: t.preview.title }),
      h('span', { class: 'ts-row-actions' }, badge, emphasisToggle, choice<Contrast>({ label: t.preview.contrast, attrs: { 'data-contrast': true }, options: (['standard', 'medium', 'high'] as Contrast[]).map((value) => ({ value, label: t.preview.levels[value] })), value: contrast, onchange: onContrast })),
    ),
    stale,
    sheet,
    scope,
  );
  return { el, apply, patch, stale, scopeId, short: (id: string) => short(id, NS), cssColor };
}
