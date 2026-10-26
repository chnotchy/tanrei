// The rail: what the panel edits, in one column. First the nine rows — the parts of a look that change most of it, each
// with what it holds now and a small sample drawn in the layer itself, and a lock that keeps it from the shuffle —
// then the rest of what a layer holds. Pressing a row or an item shows its controls in the panel; the rail stays, so
// where each thing is stays where it was.
import { CORNER_SMOOTHING } from '../core.js';
import { SUGGESTED_FAMILIES } from '../fonts.js';
import { type Ctx, type Json, type Layer, h, trim } from './dom';
import { MORE, ROWS, type Row, type Section } from './sections';

const glyph = (ctx: Ctx, name: string, attrs: Json = {}) => h('span', { class: `${ctx.studio.tagPrefix}-icon`, 'aria-hidden': 'true', translate: 'no', ...attrs }, name);
const PRESS_GLYPHS: Record<string, string> = { overlay: 'layers', ripple: 'water_drop', dim: 'brightness_6', none: 'block' };
const FOCUS_GLYPHS: Record<string, string> = { ring: 'radio_button_unchecked', glow: 'blur_on' };
/** A row's sample when its value names no glyph of its own; the lock, held and open. Declared, so that the docs site's cut-down icon file has them (packages/tools/src/glyphs.js). */
const SAMPLE_GLYPHS = { icons: 'star', press: 'touch_app', focus: 'center_focus_strong' };
const LOCK_GLYPHS = { held: 'lock', open: 'lock_open' };
const MORE_GLYPHS: Record<(typeof MORE)[number], string> = { base: 'layers', dials: 'tune', palettes: 'palette', components: 'widgets', behavior: 'touch_app', vocabulary: 'add_box', about: 'description', a11y: 'accessibility_new' };

/** A row's state, read from the layer each time it is drawn. */
interface RowState {
  value: string;
  changed: boolean;
}

function dial(ctx: Ctx, layer: Layer, key: string) {
  return ctx.studio.dials(layer).find((d: Json) => d.key === key)!;
}
function behavior(ctx: Ctx, layer: Layer, key: string) {
  return (ctx.studio.behaviors(layer) as Json[]).find((entry) => entry.key === key)!;
}
function palette(ctx: Ctx, layer: Layer, name: string) {
  return (ctx.studio.paletteRows(layer) as Json[]).find((row) => row.name === name);
}

/** What each row holds now, in words: values and names as the file has them, never translated. */
export function rowState(ctx: Ctx, layer: Layer, row: Row): RowState {
  const { t, studio } = ctx;
  switch (row) {
    case 'color': {
      const primary = palette(ctx, layer, 'primary');
      const seed = primary?.source?.seed;
      return { value: seed ? seed.toUpperCase() : primary?.source ? t.rail.hueChroma(trim(primary.source.hue), trim(primary.source.chroma)) : t.rail.monochrome, changed: Boolean(primary?.changed) };
    }
    case 'neutral': {
      const neutral = palette(ctx, layer, 'neutral');
      const source = neutral?.source;
      return { value: source?.seed ? source.seed.toUpperCase() : source ? t.rail.hueChroma(trim(source.hue), trim(source.chroma)) : '—', changed: Boolean(neutral?.changed) };
    }
    case 'typeface': {
      const brand = (studio.typefaces(layer) as Json[]).find((face) => face.key === 'brand');
      return { value: brand?.stack?.[0] ?? '—', changed: Boolean(brand?.changed) };
    }
    case 'size': {
      const [density, size] = [dial(ctx, layer, 'density'), dial(ctx, layer, 'size.unit')];
      return { value: t.rail.size(trim(density.value), `${trim(size.value)}${size.unit}`), changed: density.changed || size.changed };
    }
    case 'radius': {
      const shape = dial(ctx, layer, 'shape.unit');
      return { value: `${trim(shape.value)}${shape.unit}`, changed: shape.changed };
    }
    case 'smoothing': {
      const smoothing = studio.cornerSmoothing(layer) as Json;
      return { value: trim(smoothing.value), changed: smoothing.changed };
    }
    case 'icons': {
      const icons = studio.iconSet(layer) as Json;
      const family = (icons.mode === 'variable' ? icons.family : icons.selected)?.[0] ?? '—';
      return { value: t.listed(family, String(icons.weight)), changed: icons.anyChanged };
    }
    case 'press':
    case 'focus': {
      const entry = behavior(ctx, layer, row === 'press' ? 'pressed-feedback' : 'focus-style');
      return { value: entry.value, changed: entry.changed };
    }
  }
}

/**
 * The row's sample, drawn by the preview's sheet: it carries the preview's system id, so its custom properties are the
 * layer's (the Studio's own chrome stays in the default system). What it shows follows the sheet by itself; a glyph that
 * names a choice is written again when the choice changes.
 */
function sample(ctx: Ctx, row: Row) {
  const { studio } = ctx;
  const v = (id: string) => `var(${studio.cssVar(`${studio.namespace}.${id}`)})`;
  const el = h('span', { class: 'ts-sample', 'aria-hidden': 'true', 'data-sample-of': row, [`data-${studio.namespace}-system`]: ctx.scope });
  const draw = (layer: Layer) => {
    // A sample drawn from the sheet alone is drawn once: the sheet keeps it up to date.
    if (el.childElementCount && row !== 'press' && row !== 'focus') return;
    switch (row) {
      case 'color':
        return el.replaceChildren(h('i', { class: 'ts-sample-swatch', style: `background: ${v('sys.color.primary')};` }));
      case 'neutral':
        return el.replaceChildren(h('i', { class: 'ts-sample-swatch', style: `background: linear-gradient(90deg, ${v('ref.palette.neutral.95')}, ${v('ref.palette.neutral.50')}, ${v('ref.palette.neutral.10')});` }));
      case 'typeface':
        return el.replaceChildren(h('i', { class: 'ts-sample-type', style: `font-family: ${v('ref.typeface.brand')};`, text: 'Ag' }));
      case 'size':
        return el.replaceChildren(h('i', { class: 'ts-sample-size', style: `block-size: min(1.5rem, calc(${v('dial.size.unit')} * 4 * ${v('dial.density')}));` }));
      case 'radius':
        return el.replaceChildren(h('i', { class: 'ts-sample-corner', style: `border-start-end-radius: ${v('sys.shape.corner.large')};` }));
      case 'smoothing':
        return el.replaceChildren(h('i', { class: 'ts-sample-corner ts-sample-smooth', style: `border-start-end-radius: ${v('sys.shape.corner.extra-large')};` }));
      case 'icons':
        return el.replaceChildren(glyph(ctx, SAMPLE_GLYPHS.icons));
      case 'press':
        return el.replaceChildren(glyph(ctx, PRESS_GLYPHS[behavior(ctx, layer, 'pressed-feedback').value] ?? SAMPLE_GLYPHS.press));
      case 'focus':
        return el.replaceChildren(glyph(ctx, FOCUS_GLYPHS[behavior(ctx, layer, 'focus-style').value] ?? SAMPLE_GLYPHS.focus));
    }
  };
  return { el, draw };
}

/** The tokens a row writes, or the first ones it moves: what the preview marks while the row is pointed at or focused. */
function rowTokens(ctx: Ctx, layer: Layer, row: Row): string[] {
  const { studio } = ctx;
  const NS = studio.namespace;
  switch (row) {
    case 'color':
      return [`${NS}.sys.color.primary`, `${NS}.sys.color.primary-container`];
    case 'neutral':
      return [`${NS}.sys.color.surface`, `${NS}.sys.color.on-surface`, `${NS}.sys.color.outline`];
    case 'typeface':
      return (studio.typefaces(layer) as Json[]).filter((face) => face.key !== 'mono').map((face) => face.id);
    case 'size':
      return [dial(ctx, layer, 'density').id, dial(ctx, layer, 'size.unit').id, `${NS}.sys.target.minimum`];
    case 'radius':
      return [dial(ctx, layer, 'shape.unit').id];
    case 'smoothing':
      return [(studio.cornerSmoothing(layer) as Json).id];
    case 'icons':
      return Object.values((studio.iconSet(layer) as Json).ids as Record<string, string>);
    case 'press':
      return [behavior(ctx, layer, 'pressed-feedback').id];
    case 'focus':
      return [behavior(ctx, layer, 'focus-style').id];
  }
}
/** The preview's marking, where the host's preview has it (an optional part of the context). */
type Marking = { highlight?: (ids: string[]) => number; clearHighlight?: () => void };

// ── the shuffle ──────────────────────────────────────────────────────────────────────────────────
/** Seeds to choose a brand color from: twelve hues apart, each saturated enough to be a brand. */
const SEEDS = ['#2563eb', '#0f766e', '#7c3aed', '#db2777', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#4f46e5', '#be123c', '#57534e', '#0a7aff'];
const DENSITIES = [0.85, 0.9, 1, 1.1, 1.2];
const SHAPES = [0, 1, 2, 3, 4, 6];
const WEIGHTS = [200, 300, 400, 500];
/** One of `choices` that is not `now` (when there is another): a shuffled row always changes. */
const another = <T>(choices: readonly T[], now: T, random: () => number): T => {
  const others = choices.filter((choice) => String(choice) !== String(now));
  const from = others.length ? others : choices;
  return from[Math.floor(random() * from.length)]!;
};

/**
 * Every row that is not locked, each given another of its usual values, in one layer: one step to undo. What the
 * shuffle writes is what the row's own controls write — a palette's seed, a dial, a pin with its group's reason.
 */
export function shuffle(ctx: Ctx, layer: Layer, locked: ReadonlySet<Row>, random: () => number = Math.random): Layer {
  const { studio } = ctx;
  let next = layer;
  for (const row of ROWS) {
    if (locked.has(row)) continue;
    switch (row) {
      case 'color':
        next = studio.setPalette(next, 'primary', { source: { seed: another(SEEDS, palette(ctx, next, 'primary')?.source?.seed, random) } });
        break;
      case 'neutral': {
        // A gray of the brand's hue, or another, with as little chroma as a gray has.
        const source = palette(ctx, next, 'neutral')?.source ?? {};
        next = studio.setPalette(next, 'neutral', { source: { hue: another([0, 30, 60, 90, 150, 210, 250, 290], source.hue, random), chroma: another([2, 4, 6, 8], source.chroma, random) } });
        break;
      }
      case 'typeface': {
        for (const key of ['brand', 'plain']) {
          const face = (studio.typefaces(next) as Json[]).find((entry) => entry.key === key);
          if (!face) continue;
          const family = another(SUGGESTED_FAMILIES.text, face.stack[0], random);
          next = studio.setTypeface(next, key, [family, ...face.stack.filter((name: string) => name !== family && name !== face.stack[0])], undefined);
        }
        break;
      }
      case 'size': {
        const density = dial(ctx, next, 'density');
        next = studio.setDial(next, density.id, another(DENSITIES.filter((value) => value >= density.min && value <= density.max), density.value, random));
        break;
      }
      case 'radius': {
        const shape = dial(ctx, next, 'shape.unit');
        next = studio.setDial(next, shape.id, another(SHAPES.filter((value) => value >= shape.min && value <= shape.max), shape.value, random));
        break;
      }
      case 'smoothing':
        next = studio.setCornerSmoothing(next, another([CORNER_SMOOTHING.min, 0.6, CORNER_SMOOTHING.max], (studio.cornerSmoothing(next) as Json).value, random), undefined);
        break;
      case 'icons': {
        const icons = studio.iconSet(next) as Json;
        next = studio.setIconSet(next, { mode: 'variable', family: [another(SUGGESTED_FAMILIES.icon, icons.family?.[0], random)], weight: another(WEIGHTS, icons.weight, random) }, undefined);
        break;
      }
      case 'press':
      case 'focus': {
        const entry = behavior(ctx, next, row === 'press' ? 'pressed-feedback' : 'focus-style');
        next = studio.setBehavior(next, entry.id, another(entry.values as string[], entry.value, random), undefined);
        break;
      }
    }
  }
  return next;
}

// ── the rail ─────────────────────────────────────────────────────────────────────────────────────
export function createRail(ctx: Ctx, { locked, onshow, onlock }: { locked: Set<Row>; onshow: (section: Section) => void; onlock: (row: Row, locked: boolean) => void }) {
  const { t } = ctx;
  const buttons = new Map<Section, HTMLButtonElement>();
  const refreshers: (() => void)[] = [];
  const heading = (id: string, text: string) => h('h2', { id, class: 'ts-eyebrow ts-rail-heading', text });

  const rowsId = ctx.uid('ts-h');
  const rows = h(
    'ul',
    { class: 'ts-rail-rows', 'aria-labelledby': rowsId, 'data-rail-rows': true },
    ROWS.map((row) => {
      const value = h('span', { class: 'ts-rail-value', dir: 'auto' });
      const mark = h('span', { class: 'ts-mark', title: t.changed, 'aria-label': t.changed, role: 'img', hidden: true });
      const drawn = sample(ctx, row);
      const show = h('button', { type: 'button', class: 'ts-rail-row', 'aria-current': 'false', 'data-row': row, onclick: () => onshow(row) }, h('span', { class: 'ts-rail-label' }, t.rail.rows[row], mark), value, drawn.el) as HTMLButtonElement;
      buttons.set(row, show);
      // Pointed at or focused, the row marks in the preview what it changes; leaving it takes the marks away.
      const marking = ctx as Ctx & Marking;
      const point = () => marking.highlight?.(rowTokens(ctx, ctx.layer(), row));
      const unmark = () => marking.clearHighlight?.();
      show.addEventListener('pointerenter', point);
      show.addEventListener('focusin', point);
      show.addEventListener('pointerleave', unmark);
      show.addEventListener('focusout', unmark);
      const lock = h('tanrei-button', { class: 'ts-rail-lock', variant: 'text', size: 'small', toggle: true, label: t.rail.lock(t.rail.rows[row]), title: t.rail.lockHelp, selected: locked.has(row), 'data-lock': row }, glyph(ctx, locked.has(row) ? LOCK_GLYPHS.held : LOCK_GLYPHS.open, { slot: 'icon' })) as HTMLElement & { selected: boolean };
      lock.addEventListener('change', (event) => {
        if (event.target !== lock) return;
        lock.querySelector('[slot="icon"]')!.textContent = lock.selected ? LOCK_GLYPHS.held : LOCK_GLYPHS.open;
        onlock(row, lock.selected);
      });
      refreshers.push(() => {
        const layer = ctx.layer();
        const state = rowState(ctx, layer, row);
        value.textContent = state.value;
        mark.hidden = !state.changed;
        show.toggleAttribute('data-changed', state.changed);
        drawn.draw(layer);
      });
      return h('li', { class: 'ts-rail-item', 'data-rail-row': row }, show, lock);
    }),
  );

  const moreId = ctx.uid('ts-h');
  const more = h(
    'ul',
    { class: 'ts-rail-more', 'aria-labelledby': moreId, 'data-rail-more': true },
    MORE.map((section) => {
      const show = h('button', { type: 'button', class: 'ts-rail-link', 'aria-current': 'false', 'data-row': section, onclick: () => onshow(section) }, glyph(ctx, MORE_GLYPHS[section]), h('span', { class: 'ts-rail-label', text: t.rail.more[section] })) as HTMLButtonElement;
      buttons.set(section, show);
      return h('li', {}, show);
    }),
  );

  const el = h('div', { class: 'ts-rail-lists' }, heading(rowsId, t.rail.theme), rows, heading(moreId, t.rail.moreTitle), more);
  return {
    el,
    /** What the rail says of the layer, drawn again. */
    refresh: () => refreshers.forEach((refresh) => refresh()),
    /** The section the panel shows: its row is the current one. */
    select(section: Section) {
      for (const [each, button] of buttons) button.setAttribute('aria-current', String(each === section));
    },
  };
}
