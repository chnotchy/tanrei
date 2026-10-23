// What the docs' anatomy and measure figures lay over the live component (components/visuals/AnatomyDiagram.astro,
// MeasureDiagram.astro), run in the browser. Both stand on the web package's own stage of one fixture, in the overlay of
// the docs' one frame (components/visuals/Example.astro, `whenDrawn` in lib/visuals/frame.ts): nothing here moves what
// the stage draws, and nothing is drawn until the stage's elements are defined and the figure's time has come.
//
// - **The parts are found where the spec says the web draws them** (`platforms.web.parts`, lib/visuals/anatomy.ts):
//   the element, a CSS part of its shadow tree, what a slot holds, a child element, a class. Each is measured as the
//   browser drew it (`getBoundingClientRect`), so the figure follows the reader's system, the stage's direction, and
//   any change of the implementation. A part the fixture does not draw (an optional icon left out, a box of no size)
//   gets no number on the figure; its legend's row stays.
// - **The anatomy figure** numbers each part drawn, in two bands above and below the stage, each number over its part
//   where it fits and moved along its band where another is there, with a leader to the part's edge. A focus ring,
//   which is drawn only while the component has the keyboard's focus, is drawn as a dashed ring as far out as the
//   component draws it: the figure holds the component focused for a moment, on the docs' side
//   (lib/visuals/pseudo-states.ts), and reads its outline's offset and width.
// - **The measure figure** draws a dimension line for each length (lib/visuals/measure.ts): the inline lengths in rows
//   above the stage, the block lengths in columns at its end, each labelled with what it is and the value its token
//   resolves to in the system the stage is drawn under, read from the component's own custom property. A line is drawn
//   only where what the component draws is that length, to half a pixel: a figure never shows a length the component
//   does not have. Each line, and each row of the table under the figure, carries what was measured (`data-measured`)
//   and what the token says (`data-value`); a row whose length is not drawn says in words what was found instead. The
//   table is written again when the system changes.
// - **It is drawn again** when the stage changes size or direction, when the fonts arrive, and when the frame is drawn
//   under another system (lib/visuals/frame.ts, `SYSTEM_EVENT`).
import type { PartTarget } from './anatomy';
import type { LineAxis } from './measure';
import { SYSTEM_EVENT, whenDrawn } from './frame';
import { STATE_ATTRIBUTE, hold } from './pseudo-states';

/** Sent on a figure's frame each time its overlay has been drawn. */
export const DRAWN_EVENT = 'docs-blueprint-drawn';

/** The figure's data, written by the page as JSON on the figure's subject (`data-blueprint`). */
export interface BlueprintData {
  kind: 'anatomy' | 'measure';
  /** The web element the parts are found in. */
  tag: string;
  parts: { n: number; id: string; target: PartTarget | null }[];
  /** The measure figure's lines. */
  lines?: { token: string; cssVar: string; part: string; kind: string; axis: LineAxis }[];
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
const width = (box: Box) => box.right - box.left;
const height = (box: Box) => box.bottom - box.top;
/** Within half a pixel: what a test of a drawn length allows. */
const NEAR = 0.5;

const SVG = 'http://www.w3.org/2000/svg';

// ── Finding a part ───────────────────────────────────────────────────────────────────────────────────────────────────

/** Every shadow root under `root`, nearest first. */
function shadowRootsIn(root: ParentNode): ShadowRoot[] {
  const found: ShadowRoot[] = [];
  const walk = (node: ParentNode) => {
    for (const element of node.querySelectorAll('*')) {
      if (!element.shadowRoot) continue;
      found.push(element.shadowRoot);
      walk(element.shadowRoot);
    }
  };
  walk(root);
  return found;
}

/** The first element matching `selector` in `root`'s light tree, else in the shadow trees under it, nearest first. */
function deepQuery(root: Element, selector: string): Element | null {
  const light = root.querySelector(selector);
  if (light) return light;
  for (const shadow of [...(root.shadowRoot ? [root.shadowRoot, ...shadowRootsIn(root.shadowRoot)] : []), ...shadowRootsIn(root)]) {
    const found = shadow.querySelector(selector);
    if (found) return found;
  }
  return null;
}

/**
 * The elements of an element's CSS part: in its shadow tree, or in the nearest shadow tree under it that exports it.
 * A part may be drawn in pieces (a slider's track, on each side of its active track): the part is all of them.
 */
function partOf(element: Element, part: string): Element[] {
  for (const shadow of element.shadowRoot ? [element.shadowRoot, ...shadowRootsIn(element.shadowRoot)] : []) {
    const found = [...shadow.querySelectorAll(`[part~="${part}"]`)];
    if (found.length) return found;
  }
  return [];
}

/** The box of what a part's target is, as drawn, in the viewport's coordinates; null where nothing of it is drawn. */
function targetBox(host: Element, target: PartTarget): { box: Box; element: Element | null } | null {
  let elements: Element[] = [];
  let range: Range | null = null;
  if ('host' in target) elements = [host];
  else if ('part' in target && !('child' in target)) elements = partOf(host, target.part);
  else if ('child' in target) {
    let at: Element | null = host;
    for (const tag of target.child) at = at && deepQuery(at, tag);
    elements = at && target.part ? partOf(at, target.part) : at ? [at] : [];
  } else if ('slot' in target) {
    if (target.slot) elements = [...host.querySelectorAll(`:scope > [slot="${target.slot}"]`)];
    else {
      const nodes = [...host.childNodes].filter((node) => (node instanceof Element ? !node.hasAttribute('slot') : node.nodeType === Node.TEXT_NODE && node.textContent?.trim()));
      if (nodes.length) {
        range = document.createRange();
        range.setStartBefore(nodes[0]);
        range.setEndAfter(nodes.at(-1)!);
      }
    }
  } else if ('className' in target) elements = [host.closest('.stage')?.querySelector(`.${target.className}`) ?? host.querySelector(`.${target.className}`)].filter((element): element is Element => element !== null);
  // What is drawn invisibly (a checkbox's mark while it is unchecked, faded out) is not drawn for the figure.
  elements = elements.filter((element) => element.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) ?? true);
  const rects = range ? [range.getBoundingClientRect()] : elements.map((element) => element.getBoundingClientRect());
  const drawn = rects.filter((rect) => rect.width > NEAR && rect.height > NEAR);
  if (!drawn.length) return null;
  const box = { left: Math.min(...drawn.map((r) => r.left)), top: Math.min(...drawn.map((r) => r.top)), right: Math.max(...drawn.map((r) => r.right)), bottom: Math.max(...drawn.map((r) => r.bottom)) };
  return { box, element: elements[0] ?? null };
}

/** The element whose shadow tree holds `element`'s rules: its shadow host, or itself where it is in the light tree. */
const ownerOf = (element: Element): HTMLElement => ((element.getRootNode() as ShadowRoot).host as HTMLElement | undefined) ?? (element as HTMLElement);

/**
 * How far outside an element's border box its focus indicator reaches (negative: inside it), and its corner radius
 * there: the element is held focused on the docs' side for the moment it takes to read its outline, then let go.
 */
function focusReach(element: Element): { reach: number; radius: number } {
  const owner = ownerOf(element);
  const had = owner.getAttribute(STATE_ATTRIBUTE);
  // The element is given back its own sheets after: a held copy of a sheet is the figure's, not the component's.
  const sheets = owner.shadowRoot ? [...owner.shadowRoot.adoptedStyleSheets] : undefined;
  hold(owner, ['focused']);
  const style = getComputedStyle(element);
  const drawn = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
  const read = (name: string) => parseFloat(style.getPropertyValue(name)) || 0;
  // Where the component draws no outline (a ring of its own drawing), the system's: the offset, then both strokes.
  const reach = drawn ? parseFloat(style.outlineOffset) + parseFloat(style.outlineWidth) : read('--tanrei-sys-focus-offset') + read('--tanrei-sys-focus-inner-width') + read('--tanrei-sys-focus-outer-width');
  const radius = parseFloat(style.borderStartStartRadius) || 0;
  if (had === null) owner.removeAttribute(STATE_ATTRIBUTE);
  else owner.setAttribute(STATE_ATTRIBUTE, had);
  if (owner.shadowRoot && sheets) owner.shadowRoot.adoptedStyleSheets = sheets;
  return { reach, radius: Math.max(0, radius + reach) };
}

/** Every Tanrei element under `root`, its shadow trees included, has drawn. */
async function settled(root: Element): Promise<void> {
  const elements = [root, ...root.querySelectorAll('*'), ...shadowRootsIn(root).flatMap((shadow) => [...shadow.querySelectorAll('*')])];
  await Promise.all(elements.map((element) => (element as Element & { updateComplete?: Promise<unknown> }).updateComplete).filter(Boolean));
  await document.fonts.ready;
}

// ── Drawing ──────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Empties the overlay and gives it the drawing's lines, as large as the overlay (which has no box while it is empty). */
function svgOf(overlay: HTMLElement): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'docs-blueprint-lines');
  overlay.replaceChildren(svg);
  svg.setAttribute('width', String(overlay.clientWidth));
  svg.setAttribute('height', String(overlay.clientHeight));
  return svg;
}

function line(svg: SVGSVGElement, x1: number, y1: number, x2: number, y2: number, kind: string) {
  const element = document.createElementNS(SVG, 'line');
  for (const [name, value] of Object.entries({ x1, y1, x2, y2 })) element.setAttribute(name, String(value));
  element.setAttribute('class', kind);
  svg.append(element);
}

function label(overlay: HTMLElement, text: string, className: string, attributes: Record<string, string> = {}): HTMLElement {
  const element = document.createElement('span');
  element.className = className;
  element.textContent = text;
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  overlay.append(element);
  return element;
}

/** Places an element of the overlay with its centre at (x, y), kept inside the overlay. */
function place(element: HTMLElement, x: number, y: number, room: { width: number; height: number }) {
  const w = element.offsetWidth;
  const h = element.offsetHeight;
  element.style.left = `${Math.min(Math.max(0, x - w / 2), Math.max(0, room.width - w))}px`;
  element.style.top = `${Math.min(Math.max(0, y - h / 2), Math.max(0, room.height - h))}px`;
}

interface Drawing {
  frame: HTMLElement;
  canvas: HTMLElement;
  overlay: HTMLElement;
  subject: HTMLElement;
  data: BlueprintData;
}

/** The figure's coordinates: boxes relative to the overlay, the stage's direction, and the stage's own box. */
function frameOf({ overlay, subject, data }: Drawing) {
  const origin = overlay.getBoundingClientRect();
  const relative = (box: Box): Box => ({ left: box.left - origin.left, top: box.top - origin.top, right: box.right - origin.left, bottom: box.bottom - origin.top });
  const host = subject.querySelector(data.tag);
  const stage = subject.querySelector('.stage') ?? subject;
  const rtl = host ? getComputedStyle(host).direction === 'rtl' : false;
  return { origin, relative, host, stage: relative(stage.getBoundingClientRect()), rtl, room: { width: origin.width, height: origin.height } };
}

/** Each part's drawn box, relative to the overlay, by id; a focus ring as far out as it is drawn. */
function partBoxes(drawing: Drawing, host: Element, relative: (box: Box) => Box) {
  const boxes = new Map<string, { n: number; box: Box; aspect?: PartTarget['aspect']; radius?: number; element: Element | null }>();
  for (const part of drawing.data.parts) {
    if (!part.target || part.target.aspect === 'backdrop') continue;
    const found = targetBox(host, part.target);
    if (!found) continue;
    let box = relative(found.box);
    let radius: number | undefined;
    if (part.target.aspect === 'focus-ring' && found.element) {
      const ring = focusReach(found.element);
      box = { left: box.left - ring.reach, top: box.top - ring.reach, right: box.right + ring.reach, bottom: box.bottom + ring.reach };
      radius = ring.radius;
    }
    boxes.set(part.id, { n: part.n, box, aspect: part.target.aspect, radius, element: found.element });
  }
  return boxes;
}

function drawAnatomy(drawing: Drawing) {
  const { overlay, subject } = drawing;
  const svg = svgOf(overlay);
  const { relative, host, stage, rtl, room } = frameOf(drawing);
  if (!host) return;
  const boxes = partBoxes(drawing, host, relative);
  // The bands the numbers stand in: the room the subject keeps above and below the stage.
  const band = parseFloat(getComputedStyle(subject).paddingBlockStart) || 0;
  const bands = { top: stage.top - band / 2, bottom: stage.bottom + band / 2 };
  const taken: Record<'top' | 'bottom', number[]> = { top: [], bottom: [] };
  for (const [id, { n, box, aspect, radius }] of boxes) {
    if (aspect === 'focus-ring') {
      const ring = document.createElementNS(SVG, 'rect');
      for (const [name, value] of Object.entries({ x: box.left, y: box.top, width: width(box), height: height(box), rx: Math.min(radius ?? 0, height(box) / 2) })) ring.setAttribute(name, String(value));
      ring.setAttribute('class', 'ring');
      svg.append(ring);
    }
    // Where the leader meets the part: an edge's middle, a ring's or an outline's near one end, so that the leaders of
    // boxes that share a middle (a container, its outline, its ring) do not meet at one point.
    const start = rtl ? box.right : box.left;
    const end = rtl ? box.left : box.right;
    const along = aspect === 'outline' ? start + (end - start) * 0.2 : aspect === 'focus-ring' ? start + (end - start) * 0.85 : (box.left + box.right) / 2;
    const marker = label(overlay, String(n), 'docs-blueprint-marker', { 'data-part': id, 'data-n': String(n) });
    const size = marker.offsetWidth;
    const spacing = size + size / 4;
    const free = (side: 'top' | 'bottom', x: number) => taken[side].every((other) => Math.abs(other - x) >= spacing);
    // Over its part in the band nearer it where that is free, else the other band, else moved along the nearer band.
    // A ring is numbered from below: its leader does not cross the leaders of what it is drawn around.
    const nearer: 'top' | 'bottom' = aspect === 'focus-ring' || (box.top + box.bottom) / 2 > (stage.top + stage.bottom) / 2 ? 'bottom' : 'top';
    const other = nearer === 'top' ? 'bottom' : 'top';
    let side: 'top' | 'bottom' = free(nearer, along) ? nearer : free(other, along) ? other : nearer;
    let x = along;
    for (let step = 1; !free(side, x) && step < 64; step++) x = along + (step % 2 ? 1 : -1) * Math.ceil(step / 2) * spacing * (rtl ? -1 : 1);
    if (!free(side, x)) side = other;
    taken[side].push(x);
    const y = bands[side];
    place(marker, x, y, room);
    marker.dataset.band = side;
    const edge = side === 'top' ? box.top : box.bottom;
    line(svg, x, side === 'top' ? y + marker.offsetHeight / 2 : y - marker.offsetHeight / 2, along, edge, 'leader');
    const dot = document.createElementNS(SVG, 'circle');
    for (const [name, value] of Object.entries({ cx: along, cy: edge, r: size / 8 })) dot.setAttribute(name, String(value));
    dot.setAttribute('class', 'end');
    svg.append(dot);
  }
}

/**
 * The resolved value of a length token, in pixels, as the system the stage is drawn under has it: a custom property
 * holds what it was written as (another's `var()`, a `rem`), so a probe in the overlay, under the same scope, is given
 * it as its width and the browser resolves it.
 */
function valueOf(overlay: HTMLElement, cssVar: string): number {
  const probe = document.createElement('span');
  probe.className = 'docs-blueprint-probe';
  probe.style.inlineSize = `var(${cssVar})`;
  overlay.append(probe);
  const value = probe.getBoundingClientRect().width;
  const written = getComputedStyle(probe).getPropertyValue(cssVar).trim();
  probe.remove();
  return written ? value : NaN;
}

/** A number as the figure writes it: whole where it is, else to a tenth. */
const shown = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

function drawMeasures(drawing: Drawing) {
  const { overlay, subject, frame, data } = drawing;
  const svg = svgOf(overlay);
  const { relative, host, stage, rtl, room } = frameOf(drawing);
  if (!host || !data.lines) return;
  const boxes = partBoxes(drawing, host, relative);
  const style = getComputedStyle(subject);
  const rowsRoom = parseFloat(style.paddingBlockStart) || 0;
  const columnsRoom = parseFloat(style.paddingInlineEnd) || 0;
  const inlineLines = data.lines.filter((l) => l.axis !== 'block');
  const blockLines = data.lines.filter((l) => l.axis === 'block');
  const row = inlineLines.length ? rowsRoom / inlineLines.length : 0;
  const column = blockLines.length ? columnsRoom / blockLines.length : 0;
  const tick = row / 6 || column / 12;
  /** The parts drawn inside a box, less those as large as it (its outline, the part it is). */
  const inside = (id: string, box: Box) =>
    [...boxes]
      .filter(([other, { box: b, aspect }]) => other !== id && aspect !== 'focus-ring' && b.left >= box.left - NEAR && b.right <= box.right + NEAR && b.top >= box.top - NEAR && b.bottom <= box.bottom + NEAR)
      .filter(([, { box: b }]) => !(Math.abs(b.left - box.left) < NEAR && Math.abs(b.right - box.right) < NEAR && Math.abs(b.top - box.top) < NEAR && Math.abs(b.bottom - box.bottom) < NEAR))
      .map(([, { box: b }]) => b);
  const startOf = (b: Box) => (rtl ? b.right : b.left);
  const endOf = (b: Box) => (rtl ? b.left : b.right);
  const toward = rtl ? -1 : 1;
  let rowAt = 0;
  let columnAt = 0;
  for (const measure of data.lines) {
    const part = boxes.get(measure.part);
    const value = valueOf(overlay, measure.cssVar);
    // A line is drawn between two points along one axis: its ends, and what it measured.
    let from: number | null = null;
    let to: number | null = null;
    if (part) {
      const box = part.box;
      if (measure.axis === 'block') [from, to] = [box.top, box.bottom];
      else if (measure.axis === 'inline') [from, to] = [box.left, box.right];
      else if (measure.axis === 'padding-start' || measure.axis === 'padding-end') {
        // A padding is drawn one of two ways: as the padding of the part's element, inside its border, at the edge the
        // length names (a minimum, where the content is centred in a wider box); or as the room between that edge and
        // the nearest part drawn inside it (where an element inside the part holds the padding). The first that is the
        // token's length is drawn; where neither is, what the part's content stands at is said.
        const atStart = measure.axis === 'padding-start';
        const ways: [number, number][] = [];
        if (part.element) {
          const style = getComputedStyle(part.element);
          const border = parseFloat(atStart ? style.borderInlineStartWidth : style.borderInlineEndWidth) || 0;
          const padding = parseFloat(atStart ? style.paddingInlineStart : style.paddingInlineEnd) || 0;
          const edge = atStart ? startOf(box) + toward * border : endOf(box) - toward * border;
          ways.push(atStart ? [edge, edge + toward * padding] : [edge - toward * padding, edge]);
        }
        const held = inside(measure.part, box);
        if (held.length) {
          const nearest = atStart ? (rtl ? Math.max(...held.map(startOf)) : Math.min(...held.map(startOf))) : rtl ? Math.min(...held.map(endOf)) : Math.max(...held.map(endOf));
          ways.push(atStart ? [startOf(box), nearest] : [nearest, endOf(box)]);
        }
        const chosen = ways.find(([a, b]) => Math.abs(Math.abs(b - a) - value) <= NEAR) ?? ways.at(-1);
        if (chosen) [from, to] = chosen;
      } else {
        const held = inside(measure.part, box);
        if (measure.axis === 'gap') {
          // The parts that hold no other drawn part, in the order they stand along the line; the first two side by side.
          const leaves = held.filter((b) => !held.some((c) => c !== b && c.left >= b.left - NEAR && c.right <= b.right + NEAR && c.top >= b.top - NEAR && c.bottom <= b.bottom + NEAR)).sort((a, b) => (rtl ? b.right - a.right : a.left - b.left));
          for (let i = 0; i + 1 < leaves.length && from === null; i++) {
            const [a, b] = [leaves[i], leaves[i + 1]];
            const between = rtl ? a.left - b.right : b.left - a.right;
            if (between >= -NEAR) [from, to] = [endOf(a), startOf(b)];
          }
        }
      }
    }
    const measured = from === null || to === null ? NaN : Math.abs(to - from);
    // A line is drawn only where the component draws the length its token says: the figure never shows a length the
    // component does not have. Where it does not, the table says what was found instead.
    const agrees = Number.isFinite(measured) && Number.isFinite(value) && Math.abs(measured - value) <= NEAR;
    const row_ = frame.querySelector<HTMLElement>(`[data-measure-row="${measure.token}"]`);
    if (row_) {
      const cell = row_.querySelector<HTMLElement>('[data-measure-value]');
      if (cell && Number.isFinite(value)) cell.textContent = shown(value);
      Object.assign(row_.dataset, { measured: String(measured), value: String(value), drawn: String(agrees) });
      const note = row_.querySelector<HTMLElement>('[data-measure-note]');
      const table = row_.closest<HTMLElement>('table');
      if (note && table) {
        note.hidden = agrees;
        note.textContent = agrees ? '' : Number.isFinite(measured) ? (table.dataset.differs ?? '').replace('{measured}', shown(measured)) : (table.dataset.absent ?? '');
      }
    }
    const isBlock = measure.axis === 'block';
    const at = isBlock ? columnAt++ : rowAt++;
    if (!agrees || from === null || to === null || !part) continue;
    const text = `${measure.kind} · ${shown(value)}`;
    const attributes = { 'data-token': measure.token, 'data-part': measure.part, 'data-axis': measure.axis, 'data-value': String(value), 'data-measured': String(measured) };
    if (isBlock) {
      const x = rtl ? stage.left - (at + 0.5) * column : stage.right + (at + 0.5) * column;
      const tag = label(overlay, text, 'docs-blueprint-length', attributes);
      const edge = rtl ? part.box.left : part.box.right;
      line(svg, edge, from, x, from, 'extension');
      line(svg, edge, to, x, to, 'extension');
      line(svg, x, from, x, to, 'dimension');
      line(svg, x - tick, from, x + tick, from, 'tick');
      line(svg, x - tick, to, x + tick, to, 'tick');
      // Beside the line, toward the end of the column.
      const w = tag.offsetWidth;
      place(tag, x + (rtl ? -1 : 1) * (tick * 2 + w / 2), (from + to) / 2, room);
    } else {
      const y = stage.top - rowsRoom + (inlineLines.length - at - 0.5) * row;
      const tag = label(overlay, text, 'docs-blueprint-length', attributes);
      line(svg, from, y, from, part.box.top, 'extension');
      line(svg, to, y, to, part.box.top, 'extension');
      line(svg, from, y, to, y, 'dimension');
      line(svg, from, y - tick, from, y + tick, 'tick');
      line(svg, to, y - tick, to, y + tick, 'tick');
      place(tag, (from + to) / 2, y - tick - tag.offsetHeight / 2, room);
    }
  }
}

// ── Each figure of the page ──────────────────────────────────────────────────────────────────────────────────────────

for (const subject of document.querySelectorAll<HTMLElement>('[data-blueprint]')) {
  const frame = subject.closest<HTMLElement>('[data-example]');
  if (!frame) continue;
  const data = JSON.parse(subject.dataset.blueprint ?? '{}') as BlueprintData;
  whenDrawn(frame, (canvas, overlay) => {
    const drawing: Drawing = { frame, canvas, overlay, subject, data };
    let queued = false;
    // While a drawing is on its way the overlay says so (`data-drawing`); once one is done, `data-drawn`.
    let waiting = 0;
    const draw = () => {
      if (queued) return;
      queued = true;
      waiting++;
      overlay.dataset.drawing = '';
      requestAnimationFrame(() => {
        queued = false;
        void settled(subject)
          .then(() => {
            if (data.kind === 'anatomy') drawAnatomy(drawing);
            else drawMeasures(drawing);
            overlay.dataset.drawn = '';
            frame.dispatchEvent(new CustomEvent(DRAWN_EVENT));
          })
          .finally(() => {
            if (--waiting === 0) delete overlay.dataset.drawing;
          });
      });
    };
    draw();
    const resized = new ResizeObserver(draw);
    resized.observe(canvas);
    const host = subject.querySelector(data.tag);
    if (host) resized.observe(host);
    frame.addEventListener(SYSTEM_EVENT, draw);
    const stage = frame.querySelector('[data-example-stage]');
    const turned = new MutationObserver(draw);
    if (stage) turned.observe(stage, { attributes: true, attributeFilter: ['dir'] });
    turned.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-tanrei-contrast', 'dir'] });
    void document.fonts.ready.then(draw);
  });
}
