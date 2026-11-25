// What the docs' color role map does in the browser (components/visuals/ColorRoleMap.astro): the live component on the
// web package's own stage of one fixture, and beside it a table of the color token each of its parts is drawn with and
// the system's color role that token is. Run once the figure's elements are defined and its time has come
// (lib/visuals/frame.ts, `whenDrawn`), and again when the stage changes size or direction, when the fonts arrive, when
// the reader changes the scheme or the contrast, and when the page's look changes (lib/visuals/frame.ts, `SYSTEM_EVENT`).
//
// - **Each row's swatch is the token as the stage draws it**: its custom property, read in the stage's scope, so it is
//   the value of the system, the scheme and the contrast the page is drawn in. The role named beside it is the one
//   that system writes the token as (lib/visuals/roles.ts, `roleIn`).
// - **Each part is found where the spec says the web draws it** (lib/visuals/blueprint.ts, `targetBox`) and its color
//   is read as the browser computed it — a fill's `background-color`, a text's `color`, an edge's border — and
//   compared with the token's. A row says when they differ (`data-matches="false"`, and the color the part is drawn in
//   instead): the figure never shows a binding the component does not have.
// - **The contrast** is the token's color against what is drawn behind the part (the first fill under it that is not
//   transparent, laid over the ones beneath), computed by the token build's own contrast check (`contrast` of
//   packages/tokens-build/src/invariants.js), the WCAG 2 ratio.
// - **A leader** joins each part drawn to its row. Focusing a row (or pointing at it) outlines its part with a dashed
//   ring and draws its leader heavier: what joins them is a shape, not a color alone.
import { contrast } from '../../../../../packages/tokens-build/src/invariants.js';
import { targetBox } from './blueprint';
import type { PartTarget } from './anatomy';
import { DEFAULT_SYSTEM_ATTR, SYSTEM_EVENT, settled, systemOf, whenDrawn } from './frame';
import { hold, wordsOf } from './pseudo-states';

/** Sent on a figure's frame each time its rows and leaders have been drawn. */
export const ROLES_DRAWN_EVENT = 'docs-roles-drawn';

/** The figure's data, written by the page as JSON on its subject (`data-color-roles`). */
export interface ColorRolesData {
  tag: string;
  /** The state the element is held in, or null. */
  held: string | null;
  /** The custom property that names how the system answers a press. */
  feedback: string;
  rows: { part: string; target: PartTarget; cssVar: string; paint: 'fill' | 'text' | 'edge'; roles: Record<string, { role: string | null; derived: string | null }> }[];
}

type Rgba = [number, number, number, number];
const SVG = 'http://www.w3.org/2000/svg';

// Every form a browser computes a color to (rgb(), color(srgb …), oklch() …) read as 8-bit sRGB by drawing it.
let pen: CanvasRenderingContext2D | null = null;
function rgbaOf(css: string): Rgba {
  pen ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
  if (!pen) return [0, 0, 0, 0];
  pen.clearRect(0, 0, 1, 1);
  pen.fillStyle = '#000';
  pen.fillStyle = css;
  pen.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = pen.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a / 255];
}
const hex = ([r, g, b, a]: Rgba) => `#${[r, g, b, ...(a < 1 ? [Math.round(a * 255)] : [])].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
/** The DTCG color the token build's contrast check reads. */
const dtcg = ([r, g, b, a]: Rgba) => ({ components: [r / 255, g / 255, b / 255], alpha: a });
const same = (a: Rgba, b: Rgba) => a.every((value, index) => Math.abs(value - b[index]) <= (index === 3 ? 1 / 255 : 1));
/** `a` laid over `b`, which is opaque. */
const over = (a: Rgba, b: Rgba): Rgba => [0, 1, 2].map((i) => a[i] * a[3] + b[i] * (1 - a[3])).concat(1) as Rgba;

/** The first color written in a computed `box-shadow` of an inset shadow (a ring drawn inside the edge), or null. */
function insetRing(shadow: string): string | null {
  if (!shadow || shadow === 'none') return null;
  // Shadows are parted by commas outside parentheses; each computed shadow writes its color first.
  const shadows = shadow.split(/,(?![^(]*\))/).map((each) => each.trim());
  const ring = shadows.find((each) => /\binset\b/.test(each));
  return ring?.match(/^(?:[a-z-]+\([^)]*\)|#[\da-f]+|[a-z]+)/i)?.[0] ?? null;
}

/** The color of the edge one box draws — a border that has a width, else a ring inside it (an inset shadow), else an outline — or null. */
function edgeOf(style: CSSStyleDeclaration): Rgba | null {
  if (style.borderBlockStartStyle !== 'none' && parseFloat(style.borderBlockStartWidth) > 0) return rgbaOf(style.borderBlockStartColor);
  // A border drawn on another side only (a field's bottom edge, a notched outline's pieces).
  if (style.borderBlockEndStyle !== 'none' && parseFloat(style.borderBlockEndWidth) > 0) return rgbaOf(style.borderBlockEndColor);
  const ring = insetRing(style.boxShadow);
  if (ring) return rgbaOf(ring);
  if (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) return rgbaOf(style.outlineColor);
  return null;
}

/**
 * The color a part is drawn in, as its paint reads it: a fill's background, a text's color, and an edge where the
 * part draws it — on its own box, on a box it generates before or after its content (`::before`, `::after`), or on
 * the boxes it is drawn in pieces of (a notched outline's), or the boxes those generate, the nearest first; an edge
 * drawn nowhere is transparent.
 */
function drawnColor(element: Element, paint: 'fill' | 'text' | 'edge'): Rgba {
  const style = getComputedStyle(element);
  if (paint === 'fill') return rgbaOf(style.backgroundColor);
  if (paint === 'text') return rgbaOf(style.color);
  const generated = (of: Element, pseudo: string) => {
    const box = getComputedStyle(of, pseudo);
    return box.content && box.content !== 'none' && box.content !== 'normal' ? edgeOf(box) : null;
  };
  // A piece drawn as no element draws its edge by its `::before` (the web package's `drawnAsNoElement`).
  const pieceEdge = (piece: Element) => edgeOf(getComputedStyle(piece)) ?? generated(piece, '::before') ?? generated(piece, '::after');
  const pieces = [...element.children, ...[...element.children].flatMap((child) => [...child.children])];
  return edgeOf(style) ?? generated(element, '::before') ?? generated(element, '::after') ?? pieces.map(pieceEdge).find(Boolean) ?? [0, 0, 0, 0];
}

/** The element a node is drawn in: its parent, its slot, or its shadow root's host. */
const drawnIn = (element: Element): Element | null => element.assignedSlot ?? element.parentElement ?? ((element.getRootNode() as ShadowRoot).host || null);

/**
 * What is drawn behind a part, opaque: the fills under it, from the nearest that is not transparent down to the first
 * opaque one (the page's, at the last), laid over each other. A fill is behind a text and an edge from the part's own
 * element; behind a fill, from the element it stands in.
 */
function backdropOf(element: Element, paint: 'fill' | 'text' | 'edge'): Rgba {
  const layers: Rgba[] = [];
  for (let at: Element | null = paint === 'fill' ? drawnIn(element) : element; at; at = drawnIn(at)) {
    const fill = rgbaOf(getComputedStyle(at).backgroundColor);
    if (fill[3] > 0) layers.push(fill);
    if (fill[3] >= 1) break;
  }
  if (!layers.length || layers.at(-1)![3] < 1) layers.push(rgbaOf(getComputedStyle(document.documentElement).backgroundColor || 'Canvas'));
  return layers.reduceRight((under, layer) => (layer[3] >= 1 ? layer : over(layer, under)), [255, 255, 255, 1] as Rgba);
}

/** A ratio as the figure writes it. */
const ratioText = (ratio: number) => `${ratio.toFixed(2)}:1`;

function drawFigure(frame: HTMLElement, overlay: HTMLElement, subject: HTMLElement, table: HTMLElement, data: ColorRolesData) {
  const system = systemOf(frame);
  const fallback = frame.getAttribute(DEFAULT_SYSTEM_ATTR) ?? '';
  const host = subject.querySelector<HTMLElement>(data.tag);
  if (!host) return;
  if (data.held) hold(host, wordsOf(data.held, getComputedStyle(host).getPropertyValue(data.feedback).trim()));
  const origin = overlay.getBoundingClientRect();
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'docs-blueprint-lines');
  overlay.replaceChildren(svg);
  svg.setAttribute('width', String(overlay.clientWidth));
  svg.setAttribute('height', String(overlay.clientHeight));
  const rtl = getComputedStyle(table).direction === 'rtl';
  const probe = document.createElement('span');
  probe.className = 'docs-blueprint-probe';
  subject.append(probe);
  const words = { notDrawn: table.dataset.notDrawn ?? '', differs: table.dataset.differs ?? '', fixed: table.dataset.fixed ?? '', transparent: table.dataset.transparent ?? '' };
  data.rows.forEach((row, index) => {
    const tr = table.querySelector<HTMLElement>(`[data-role-row="${index}"]`);
    if (!tr) return;
    probe.style.color = `var(${row.cssVar})`;
    const value = rgbaOf(getComputedStyle(probe).color);
    const role = row.roles[system] ?? row.roles[fallback];
    const swatch = tr.querySelector<HTMLElement>('[data-role-swatch]');
    swatch?.setAttribute('color', hex(value));
    const name = tr.querySelector<HTMLElement>('[data-role-name]');
    if (name) name.textContent = role?.role ? role.role.split('.').slice(1).join('.') : value[3] === 0 ? words.transparent : words.fixed;
    const derived = tr.querySelector<HTMLElement>('[data-role-derived]');
    if (derived) derived.hidden = !(role?.role && role.derived);
    const found = targetBox(host, row.target);
    const element = found?.element ?? (row.target && 'host' in row.target ? host : null);
    const cell = tr.querySelector<HTMLElement>('[data-role-contrast]');
    Object.assign(tr.dataset, { value: hex(value), role: role?.role ?? '' });
    if (!found || !element) {
      Object.assign(tr.dataset, { drawn: 'false', matches: '', contrast: '' });
      if (cell) cell.textContent = words.notDrawn;
      return;
    }
    const drawn = drawnColor(element, row.paint);
    const matches = same(drawn, value);
    const ratio = value[3] > 0 ? contrast(dtcg(value), dtcg(backdropOf(element, row.paint))) : NaN;
    Object.assign(tr.dataset, { drawn: 'true', drawnColor: hex(drawn), matches: String(matches), contrast: Number.isFinite(ratio) ? ratio.toFixed(2) : '' });
    if (cell) cell.textContent = !matches ? words.differs.replace('{drawn}', hex(drawn)) : Number.isFinite(ratio) ? ratioText(ratio) : '—';
    // The leader: from a point of the part — the middle of a text, near the end edge of a fill, on the end edge of an
    // edge, so that the leaders of parts that share a middle do not meet — to the start of its row.
    const box = found.box;
    const end = rtl ? box.left - origin.left : box.right - origin.left;
    const start = rtl ? box.right - origin.left : box.left - origin.left;
    const middle = (box.top + box.bottom) / 2 - origin.top;
    const inset = Math.min(8, (box.right - box.left) / 4) * (rtl ? 1 : -1);
    const [x1, y1] = row.paint === 'text' ? [(start + end) / 2, middle] : row.paint === 'edge' ? [end, box.top - origin.top + (box.bottom - box.top) / 4] : [end + inset, box.bottom - origin.top - (box.bottom - box.top) / 4];
    const target = (tr.querySelector('th') ?? tr).getBoundingClientRect();
    const x2 = (rtl ? target.right : target.left) - origin.left;
    const y2 = (target.top + target.bottom) / 2 - origin.top;
    const leader = document.createElementNS(SVG, 'line');
    for (const [key, at] of Object.entries({ x1, y1, x2, y2 })) leader.setAttribute(key, String(at));
    leader.setAttribute('class', 'leader');
    leader.dataset.roleLeader = String(index);
    const dot = document.createElementNS(SVG, 'circle');
    for (const [key, at] of Object.entries({ cx: x1, cy: y1, r: 2 })) dot.setAttribute(key, String(at));
    dot.setAttribute('class', 'end');
    const ring = document.createElementNS(SVG, 'rect');
    const pad = 3;
    for (const [key, at] of Object.entries({ x: box.left - origin.left - pad, y: box.top - origin.top - pad, width: box.right - box.left + 2 * pad, height: box.bottom - box.top + 2 * pad, rx: pad })) ring.setAttribute(key, String(at));
    ring.setAttribute('class', 'highlight');
    ring.dataset.roleRing = String(index);
    svg.append(leader, dot, ring);
  });
  probe.remove();
  const active = table.querySelector<HTMLElement>('[data-role-row][data-active]');
  if (active) highlight(overlay, active.dataset.roleRow ?? null);
  frame.dispatchEvent(new CustomEvent(ROLES_DRAWN_EVENT));
}

/** Outlines the part of a row and draws its leader heavier; null takes the outline away. */
function highlight(overlay: HTMLElement, index: string | null) {
  for (const element of overlay.querySelectorAll<SVGElement>('[data-role-ring], [data-role-leader]')) {
    const own = element.dataset.roleRing ?? element.dataset.roleLeader;
    element.toggleAttribute('data-active', own === index);
  }
}

for (const subject of document.querySelectorAll<HTMLElement>('[data-color-roles]')) {
  const frame = subject.closest<HTMLElement>('[data-example]');
  const table = frame?.querySelector<HTMLElement>('[data-color-roles-table]');
  if (!frame || !table) continue;
  const data = JSON.parse(subject.dataset.colorRoles ?? '{}') as ColorRolesData;
  whenDrawn(frame, (canvas, overlay) => {
    let queued = false;
    const draw = () => {
      if (queued) return;
      queued = true;
      overlay.dataset.drawing = '';
      requestAnimationFrame(() => {
        queued = false;
        void settled(subject)
          .then(() => {
            drawFigure(frame, overlay, subject, table, data);
            overlay.dataset.drawn = '';
          })
          .finally(() => delete overlay.dataset.drawing);
      });
    };
    draw();
    const resized = new ResizeObserver(draw);
    resized.observe(canvas);
    frame.addEventListener(SYSTEM_EVENT, draw);
    const turned = new MutationObserver(draw);
    const stage = frame.querySelector('[data-example-stage]');
    if (stage) turned.observe(stage, { attributes: true, attributeFilter: ['dir'] });
    turned.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-tanrei-contrast', 'dir'] });
    void document.fonts.ready.then(draw);
    // A row focused, or pointed at, outlines its part.
    const choose = (row: HTMLElement | null) => {
      for (const each of table.querySelectorAll<HTMLElement>('[data-role-row][data-active]')) if (each !== row) delete each.dataset.active;
      if (row) row.dataset.active = '';
      highlight(overlay, row?.dataset.roleRow ?? null);
    };
    table.addEventListener('focusin', (event) => choose((event.target as Element).closest<HTMLElement>('[data-role-row]')));
    table.addEventListener('focusout', (event) => {
      if (!table.contains(event.relatedTarget as Node | null)) choose(null);
    });
    table.addEventListener('pointerover', (event) => choose((event.target as Element).closest<HTMLElement>('[data-role-row]')));
    table.addEventListener('pointerleave', () => choose(table.querySelector<HTMLElement>('[data-role-row]:focus-within')));
  });
}
