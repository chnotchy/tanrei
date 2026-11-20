import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { FacesWatch } from './faces.js';
import { DRAWN_WIDTH } from './glyph-drawn-width.js';
import { adopt } from './sheets.js';

// Whether a glyph of the icon set can be drawn yet is read from its ink's width: at most `DRAWN_WIDTH` of its box
// (glyph-drawn-width.ts says why, and why it is a module of its own).
export { DRAWN_WIDTH };

/** What was read of a glyph: whether the icon set can draw it now. */
type Reading = readonly [glyph: HTMLElement, drawn: boolean];

/**
 * The glyphs whose mark is not what was read get it; those that became drawable appear without motion. Returns the
 * glyphs whose mark changed.
 */
function mark(readings: readonly Reading[]): HTMLElement[] {
  const appeared: HTMLElement[] = [];
  const changed: HTMLElement[] = [];
  for (const [glyph, drawn] of readings) {
    if (drawn === glyph.hasAttribute('data-drawn')) continue;
    changed.push(glyph);
    if (drawn) appeared.push(glyph);
    else glyph.removeAttribute('data-drawn');
  }
  if (appeared.length) appearAtOnce(appeared);
  return changed;
}

/**
 * Marks the glyphs drawn with no transition starting on them or in them (MOT-3): a glyph appears when its face has
 * loaded — after the element that draws it has settled, on a page loaded cold — and a style that fades its mark in and
 * out (a menu's or a select's check: `visibility` and `opacity`) would otherwise start a transition from the hidden mark
 * it never showed. A transition is started by the style a change leads to, so each glyph and what is in it are styled
 * once with `transition-property: none` (inline, and important over a rule of the component's), marked, and let go; a
 * transition or an animation already running on the glyph ends where it was going.
 */
function appearAtOnce(glyphs: readonly HTMLElement[]) {
  const quiet = glyphs.flatMap((glyph) => [glyph, ...glyph.querySelectorAll<HTMLElement>('*')]);
  const own = quiet.map((element) => ({
    attribute: element.hasAttribute('style'),
    value: element.style.getPropertyValue('transition-property'),
    priority: element.style.getPropertyPriority('transition-property'),
  }));
  for (const element of quiet) element.style.setProperty('transition-property', 'none', 'important');
  for (const glyph of glyphs) glyph.setAttribute('data-drawn', '');
  // Styled now, each of them: an engine styles only what the element asked about needs.
  for (const element of quiet) void getComputedStyle(element).visibility;
  quiet.forEach((element, at) => {
    const { attribute, value, priority } = own[at]!;
    if (value) element.style.setProperty('transition-property', value, priority);
    else element.style.removeProperty('transition-property');
    if (!attribute && !element.style.length) element.removeAttribute('style');
  });
  for (const animation of glyphs.flatMap((glyph) => glyph.getAnimations())) animation.finish();
}

/**
 * One observer for every glyph of the page: it is told of them all after a layout, every host reads its glyphs, and
 * only then are the marks written — so the glyphs of a page are decided in one pass, not one layout for each host.
 */
const owners = new WeakMap<Element, GlyphDrawnController>();
const observer =
  typeof ResizeObserver === 'undefined'
    ? null
    : new ResizeObserver((entries) => {
        const hosts = new Set<GlyphDrawnController>();
        for (const entry of entries) {
          const owner = owners.get(entry.target);
          if (owner) hosts.add(owner);
        }
        mark([...hosts].flatMap((host) => host.read(true)));
      });

/**
 * The hosts that decide at once, in the turn of their render — collected, and read together. Each host renders in a
 * microtask of its own, after writing its own shadow tree: a host that read its glyphs there had the page styled and
 * laid out once for itself (fifty layouts).
 * The hosts of one turn are read in ONE microtask after their renders — one layout for them all — and only then are
 * the marks written. The decision is still made in the task of the render, before any frame.
 */
const deciding = new Map<GlyphDrawnController, boolean>();
function decideTogether(host: GlyphDrawnController, again = false) {
  if (!deciding.size) {
    queueMicrotask(() => {
      const hosts = [...deciding];
      deciding.clear();
      watchAgain(mark(hosts.flatMap(([each, all]) => each.read(all))));
    });
  }
  deciding.set(host, again || !!deciding.get(host));
}

/**
 * What each ink was last read under: its name and the family it is set in. A render that leaves both as they were has
 * nothing new to read — the ink is as wide as it was, or the observer reports it after the next layout — so the glyph
 * keeps its mark without a layout (a page that toggles a hundred checkboxes reads none of their glyphs). A render that
 * changes either (a checkbox that turns selected under a system whose selected glyphs have a family of their own) is
 * read in the turn of the render, as before. An ink read in no box (its glyph not laid out) is read again on its next
 * render: being laid out is not a change of name or family.
 */
const readUnder = new WeakMap<Element, string>();
/** An ink's name and the family it is set in, as `readUnder` keeps them. */
const underOf = (ink: HTMLElement) => `${ink.textContent}\n${getComputedStyle(ink).fontFamily}`;

/** The families an ink was read in: a face of another family that arrives cannot change what a glyph draws. */
const iconFamilies = new Set<string>();
const familyName = (family: string) => family.trim().replace(/^["']|["']$/g, '').toLowerCase();

/**
 * One watch of the fonts of the page for every host (`FacesWatch`). A face that finishes loading, or fails to, has
 * every host read all its glyphs again — once, together — unless it is of none of the families the glyphs were read
 * in: a text face's arrival leaves every ligature as wide as it was. Without an observer to report what this skips,
 * every load is read; so is the moment the faces are ready after a glyph was read while one loaded, which names no face.
 */
const connected = new Set<GlyphDrawnController>();
const faces = new FacesWatch((loaded) => {
  if (observer && loaded && !loaded.some((face) => iconFamilies.has(familyName(face.family)))) return;
  for (const host of connected) decideTogether(host, true);
});

/**
 * A mark written here, between two frames, was read from a width the observer has not been told of: it compares an
 * ink's width with the one it last reported, so an ink that is back at that width by the next frame — the face that
 * arrived is gone again, the icon set was switched and switched back — is not reported, and its mark would stay as
 * this read left it (a check still marked drawable, five seconds after its font was taken away). The inks whose mark changed here are given to the observer anew, which
 * has it report them after the next layout whatever their width is then. Nothing is laid out for it: the observer
 * reads after the frame's own layout, and writes only a mark that differs.
 */
function watchAgain(glyphs: readonly HTMLElement[]) {
  if (!observer) return;
  for (const glyph of glyphs) {
    const ink = boxes.get(glyph)?.watched(glyph);
    if (!ink || !owners.has(ink)) continue;
    observer.unobserve(ink);
    observer.observe(ink);
  }
}

/** The host that decides each glyph box. */
const boxes = new WeakMap<HTMLElement, GlyphDrawnController>();

/** The attribute of the box a glyph box that holds a slot is heard by (`probeOf`). */
const PROBE = 'data-tanrei-glyph-probe';
/**
 * What that box holds: a glyph every icon set has — a checkbox draws it, so an icon font cut down to the glyphs the
 * components draw keeps it — spelled out well over `DRAWN_WIDTH` while the set cannot draw it.
 */
const PROBE_GLYPH = 'check';

/**
 * The ink that hears a glyph box that holds a slot: the product sizes what it slots, or the component sizes it to the
 * box, so its size need not change when the icon set can or cannot draw it any more (a face that arrives, or a system
 * that switches to a family that has none yet). A name of the set in the box's font, set out of the layout in a box of
 * no size that clips it and is not drawn, changes its width then; the observer reports it, and the slotted glyphs are
 * read. Its width also says whether the box's family can draw at all: a short name spelled out (`add`) can be narrower
 * than `DRAWN_WIDTH`, this one never is. Written into the glyph box once, after its slot.
 */
function probeOf(glyph: HTMLElement): HTMLElement {
  const held = glyph.querySelector<HTMLElement>(`:scope > [${PROBE}]`);
  if (held) return held.firstElementChild as HTMLElement;
  adopt(glyph.getRootNode(), probeSheet());
  const probe = document.createElement('span');
  probe.setAttribute(PROBE, '');
  probe.setAttribute('aria-hidden', 'true');
  const ink = document.createElement('span');
  probe.append(ink);
  glyph.append(probe);
  return ink;
}

/**
 * The probe's rules, adopted by each root it stands in. The name is generated content, so it is in none of the
 * component's text (`textContent`, what a test or a person copies).
 */
let sheet: CSSStyleSheet | null | undefined;
function probeSheet(): CSSStyleSheet | null {
  if (sheet !== undefined) return sheet;
  if (typeof CSSStyleSheet === 'undefined') return (sheet = null);
  sheet = new CSSStyleSheet();
  sheet.replaceSync(`
    [${PROBE}] {
      position: absolute;
      inline-size: 0;
      block-size: 0;
      overflow: hidden;
      visibility: hidden;
      pointer-events: none;
    }
    [${PROBE}] > span {
      display: inline-block;
      white-space: nowrap;
    }
    [${PROBE}] > span::before {
      content: '${PROBE_GLYPH}';
    }
  `);
  return sheet;
}

/**
 * Whether a slotted glyph is drawn as a ligature. The component sizes the product's element to the glyph box, so that
 * box alone cannot tell a ligature from a name spelled out that overflows it: its width is the widest of its box, what
 * overflows it (`scrollWidth`) and, for an inline element, its text's run. It is drawn while that is at most
 * `DRAWN_WIDTH` of the glyph box, or of its own box where the product made that larger (a `.tanrei-icon` of another
 * size). An image, an SVG, or an element that is not laid out is never wider than its box.
 */
function slottedFits(ink: HTMLElement, box: number): boolean {
  const own = ink.clientWidth;
  return Math.max(own, ink.scrollWidth, ink.getBoundingClientRect().width) <= Math.max(box, own) * DRAWN_WIDTH;
}

/**
 * Marks each glyph the host draws with `data-drawn` while the icon set can draw it, and removes the mark while it cannot,
 * so the component's styles draw nothing in its place until then. Each glyph is a box styled by `iconGlyph()` holding
 * ONE inline-block child with the ligature text — the child's width is the ink's. A ResizeObserver on that child hears
 * the font arrive (or a system switch to another icon set) in the frame it changes the layout, before it is painted.
 * When a glyph becomes drawable, no transition starts on it or in it, and one running on it ends: it appears without
 * motion (`appearAtOnce`).
 *
 * With `slotted`, each glyph box holds the slot the product places its glyph in (a Button's `icon` slot), and the inks
 * are the elements assigned to it: a box is drawn while every one of them is (`slottedFits`), and not while it holds
 * none. The observer hears the box through a name of the set it holds out of sight (`probeOf`); a change of what a
 * slot holds is read at once.
 */
export class GlyphDrawnController implements ReactiveController {
  private connected = false;
  private readonly observed = new Set<Element>();
  /** With `slotted`: what a slot of the host's shadow root now holds is read, as after a render. */
  private readonly slotChanged = () => this.hostUpdated();

  /**
   * `firstInFrame`: a glyph the host draws for the first time is decided by the observer — after the layout of the
   * frame it is first drawn in, before that frame is painted — in place of a layout the host asks for in the task of
   * its render. For a host that a page draws many of at once (the copy button of every code block of a page): the
   * hosts are then decided in one pass, and none of them costs the page a layout of its own. The mark is in the
   * first frame painted either way; it is not there yet in the task of the render, nor in a frame callback before it.
   *
   * `slotted`: the glyph boxes hold the product's glyph in a slot (above).
   */
  constructor(
    private readonly host: ReactiveControllerHost & Element,
    private readonly glyphs: () => Iterable<HTMLElement>,
    private readonly options: { firstInFrame?: boolean; slotted?: boolean } = {},
  ) {
    host.addController(this);
  }

  /** The inks a glyph box is decided by: its one child, or with `slotted` the elements its slots hold. */
  private inksOf(glyph: HTMLElement): HTMLElement[] {
    if (this.options.slotted) return [...glyph.querySelectorAll('slot')].flatMap((slot) => slot.assignedElements({ flatten: true }) as HTMLElement[]);
    return glyph.firstElementChild ? [glyph.firstElementChild as HTMLElement] : [];
  }

  /** The ink the observer is given for a glyph box: its one child, or with `slotted` the box's probe. */
  watched(glyph: HTMLElement): HTMLElement | null {
    return this.options.slotted ? probeOf(glyph) : (glyph.firstElementChild as HTMLElement | null);
  }

  hostConnected() {
    this.connected = true;
    connected.add(this);
    faces.connect();
    if (this.options.slotted) this.host.shadowRoot?.addEventListener('slotchange', this.slotChanged);
  }

  hostDisconnected() {
    this.connected = false;
    if (this.options.slotted) {
      this.host.shadowRoot?.removeEventListener('slotchange', this.slotChanged);
      for (const glyph of this.glyphs()) for (const ink of this.inksOf(glyph)) readUnder.delete(ink);
    }
    for (const ink of this.observed) {
      observer?.unobserve(ink);
      owners.delete(ink);
      readUnder.delete(ink);
    }
    this.observed.clear();
    connected.delete(this);
    if (!connected.size) faces.disconnect();
  }

  /**
   * After every render: observe the glyphs it drew, and decide in this turn, before the first frame is painted — with
   * every other host that rendered in it (`decideTogether`). With
   * `firstInFrame`, a render that draws only glyphs the observer is newly given leaves the decision to it; a render
   * that draws a glyph the observer already has is decided at once, as its size may not change.
   */
  hostUpdated() {
    const watching = !!observer && this.connected;
    let decide = !watching || !this.options.firstInFrame;
    for (const glyph of this.glyphs()) {
      boxes.set(glyph, this);
      const ink = this.watched(glyph);
      if (ink && watching && !this.observed.has(ink)) {
        this.observed.add(ink);
        owners.set(ink, this);
        observer.observe(ink);
      } else {
        decide = true;
      }
    }
    if (decide) decideTogether(this);
  }

  /**
   * Each glyph, and whether its ink is the ligature: a reading of the layout. None for a host that is not connected.
   * `again`: read every glyph (a face arrived, the observer reported a size); otherwise only the glyphs whose name or
   * family changed since they were read (`readUnder`) — the others are left out, and keep their mark.
   *
   * The family is read only of an ink that is laid out: one read in a box last time (and compared before any layout),
   * or one whose box was just read and is not empty. An ink in a part that is not drawn (the buttons of a search's
   * closed view) has no style resolved here: Firefox keeps a style resolved for an element outside the layout, and a
   * glyph slotted into a Button's flex box then reads as `inline-block` where it is drawn as a block, a frame after it
   * was drawn — a change of style no frame shows.
   */
  read(again = false): Reading[] {
    const readings: Reading[] = [];
    if (!this.connected) return readings;
    const slotted = !!this.options.slotted;
    for (const glyph of this.glyphs()) {
      const inks = this.inksOf(glyph);
      // The inks that were read, and are known again by their name and family: a slotted one, or one observed.
      const kept = (ink: HTMLElement) => slotted || this.observed.has(ink);
      const known = inks.length > 0 && inks.every((ink) => kept(ink) && readUnder.get(ink) !== undefined);
      if (!again && known && inks.every((ink) => readUnder.get(ink) === underOf(ink))) continue;
      const box = glyph.clientWidth;
      // With `slotted`, the probe's name decides whether the box's family can draw at all: a short name spelled out
      // (`add`) can be narrower than DRAWN_WIDTH, and the probe's never is.
      const probe = slotted ? glyph.querySelector<HTMLElement>(`:scope > [${PROBE}] > *`) : null;
      const fits = (ink: HTMLElement) => (slotted ? slottedFits(ink, box) : ink.offsetWidth <= box * DRAWN_WIDTH);
      readings.push([glyph, inks.length > 0 && box > 0 && (!probe || probe.offsetWidth <= box * DRAWN_WIDTH) && inks.every(fits)]);
      for (const ink of inks) {
        if (!kept(ink)) continue;
        if (box > 0) {
          const under = underOf(ink);
          readUnder.set(ink, under);
          for (const name of under.slice(under.indexOf('\n') + 1).split(',')) iconFamilies.add(familyName(name));
        } else readUnder.delete(ink);
      }
    }
    // After the layout the reads forced: the icon face a glyph first asked for in it is loading now.
    if (readings.length) faces.measured();
    return readings;
  }
}
