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
 * A `slotted` host reads nothing of the layout: it is given the sizes the observer reports (`sizes`).
 */
const owners = new WeakMap<Element, GlyphDrawnController>();
const observer =
  typeof ResizeObserver === 'undefined'
    ? null
    : new ResizeObserver((entries) => {
        const hosts = new Set<GlyphDrawnController>();
        const heard = new Set<GlyphDrawnController>();
        for (const entry of entries) {
          const owner = owners.get(entry.target);
          if (!owner) continue;
          if (owner.slotted) {
            sizes.set(entry.target, entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width);
            heard.add(owner);
          } else hosts.add(owner);
        }
        mark([...[...hosts].flatMap((host) => host.read(true)), ...[...heard].flatMap((host) => host.decided())]);
      });

/**
 * The inline size the observer last reported of each element a `slotted` host gives it — a glyph box, and the ink of
 * the probe it holds (`probeOf`). Taken from the observer's report, after the frame's own layout: no element is asked
 * for its size, so a page that builds a hundred Buttons reads nothing of its layout for them.
 */
const sizes = new WeakMap<Element, number>();

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
 * A `slotted` host reads nothing: every load has the observer report its boxes anew (`facesChanged`).
 */
const connected = new Set<GlyphDrawnController>();
const faces = new FacesWatch((loaded) => {
  const iconFace = !(observer && loaded && !loaded.some((face) => iconFamilies.has(familyName(face.family))));
  for (const host of connected) host.facesChanged(iconFace);
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
    const ink = glyph.firstElementChild;
    if (!ink || !owners.has(ink)) continue;
    observer.unobserve(ink);
    observer.observe(ink);
  }
}

/** The attribute of the box a glyph box that holds a slot is heard by (`probeOf`). */
const PROBE = 'data-tanrei-glyph-probe';
/**
 * What that box holds: a glyph every icon set has — a checkbox draws it, so an icon font cut down to the glyphs the
 * components draw keeps it — spelled out well over `DRAWN_WIDTH` while the set cannot draw it.
 */
const PROBE_GLYPH = 'check';

/**
 * The ink that says whether a glyph box that holds a slot can draw: the product sizes what it slots, or the component
 * sizes it to the box, so its size need not change when the icon set can or cannot draw it any more (a face that
 * arrives, or a system that switches to a family that has none yet). A name of the set in the box's font, set out of
 * the layout in a box of no size that clips it and is not drawn, is one glyph while the box's family can draw and is
 * spelled out while it cannot; the observer reports its width, and its changes, with no read of the layout. A short
 * name spelled out (`add`) can be narrower than `DRAWN_WIDTH`, this one never is. Written into the glyph box once,
 * after its slot, while the slot holds a glyph that is a name.
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

/** A glyph named by its `data-icon` (icons.css draws the name as generated content). */
const NAMED_BY_ATTRIBUTE = '[data-icon]:not([data-icon=""])';
/**
 * Whether a slotted element is a glyph of the icon set — a name the set's font draws as a ligature, in its text or in
 * its `data-icon` — rather than an image, an SVG or another element with no name in it, which draws whether or not the
 * font is there.
 */
const isNamed = (ink: Element) =>
  ink.localName !== 'svg' && ink.localName !== 'img' && (!!ink.textContent?.trim() || ink.matches(NAMED_BY_ATTRIBUTE) || !!ink.querySelector(NAMED_BY_ATTRIBUTE));

/**
 * Marks each glyph the host draws with `data-drawn` while the icon set can draw it, and removes the mark while it cannot,
 * so the component's styles draw nothing in its place until then. Each glyph is a box styled by `iconGlyph()` holding
 * ONE inline-block child with the ligature text — the child's width is the ink's. A ResizeObserver on that child hears
 * the font arrive (or a system switch to another icon set) in the frame it changes the layout, before it is painted.
 * When a glyph becomes drawable, no transition starts on it or in it, and one running on it ends: it appears without
 * motion (`appearAtOnce`).
 *
 * With `slotted`, each glyph box holds the slot the product places its glyph in (a Button's `icon` slot), and the inks
 * are the elements assigned to it. A box that holds none is not drawn; one that holds only images, SVGs or elements
 * with no text is drawn; one that holds a name (`isNamed`) is drawn while the box's family can draw a glyph of the set,
 * which the name it holds out of sight says (`probeOf`). Nothing of the layout is read for it, in the task of the render
 * or after: the observer reports the widths of the box and of that name after the frame's own layout, before its paint,
 * and again when either changes (`sizes`); a render or a change of what a slot holds is decided from the widths last
 * reported, at once. A page that builds a hundred Buttons, with a glyph or without, reads nothing of its layout for them.
 */
export class GlyphDrawnController implements ReactiveController {
  private connected = false;
  private readonly observed = new Set<Element>();
  /** With `slotted`: what a slot of the host's shadow root now holds is decided, as after a render. */
  private readonly slotChanged = () => this.hostUpdated();

  /**
   * `firstInFrame`: a glyph the host draws for the first time is decided by the observer — after the layout of the
   * frame it is first drawn in, before that frame is painted — in place of a layout the host asks for in the task of
   * its render. For a host that a page draws many of at once (the copy button of every code block of a page): the
   * hosts are then decided in one pass, and none of them costs the page a layout of its own. The mark is in the
   * first frame painted either way; it is not there yet in the task of the render, nor in a frame callback before it.
   *
   * `slotted`: the glyph boxes hold the product's glyph in a slot (above); it is always decided by the observer's
   * reports, so `firstInFrame` changes nothing for it.
   */
  constructor(
    private readonly host: ReactiveControllerHost & Element,
    private readonly glyphs: () => Iterable<HTMLElement>,
    private readonly options: { firstInFrame?: boolean; slotted?: boolean } = {},
  ) {
    host.addController(this);
  }

  /** Whether the glyph boxes hold a slot. */
  get slotted(): boolean {
    return !!this.options.slotted;
  }

  /** With `slotted`: the elements a glyph box's slots hold (a slot's own content where nothing is assigned to it). */
  private slottedIn(glyph: HTMLElement): Element[] {
    return [...glyph.querySelectorAll('slot')].flatMap((slot) => slot.assignedElements({ flatten: true }));
  }

  hostConnected() {
    this.connected = true;
    connected.add(this);
    faces.connect();
    if (!this.options.slotted) return;
    this.host.shadowRoot?.addEventListener('slotchange', this.slotChanged);
    // A host connected again keeps what it rendered, and renders it again only when it changes: its boxes are given to
    // the observer again now.
    this.hostUpdated();
  }

  hostDisconnected() {
    this.connected = false;
    if (this.options.slotted) this.host.shadowRoot?.removeEventListener('slotchange', this.slotChanged);
    for (const element of this.observed) {
      observer?.unobserve(element);
      owners.delete(element);
      readUnder.delete(element);
      sizes.delete(element);
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
   *
   * With `slotted`: the boxes that hold a name are given to the observer, with their probe, and every box is decided
   * from the widths last reported — a box the observer has not reported yet is not drawn until it does.
   */
  hostUpdated() {
    if (this.options.slotted) {
      if (!this.connected) return;
      if (observer) for (const glyph of this.glyphs()) if (this.slottedIn(glyph).some(isNamed)) this.watch(glyph, probeOf(glyph));
      mark(this.decided());
      return;
    }
    const watching = !!observer && this.connected;
    let decide = !watching || !this.options.firstInFrame;
    for (const glyph of this.glyphs()) {
      const ink = glyph.firstElementChild;
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

  /** With `slotted`: gives the observer what it does not have yet of these elements. */
  private watch(...elements: Element[]) {
    for (const element of elements) {
      if (this.observed.has(element)) continue;
      this.observed.add(element);
      owners.set(element, this);
      observer!.observe(element);
    }
  }

  /**
   * A face's load ended (`faces`). `iconFace`: it may be of a family a glyph was read in. A host without `slotted`
   * reads its glyphs again; a `slotted` one has the observer report its boxes and probes anew after the next layout,
   * whatever their width is then — a face that arrived and is gone again by the next frame leaves the width the
   * observer last reported, which it would not report again — and reads nothing itself.
   */
  facesChanged(iconFace: boolean) {
    if (!this.options.slotted) {
      if (iconFace) decideTogether(this, true);
      return;
    }
    if (!observer) return;
    for (const element of this.observed) {
      observer.unobserve(element);
      observer.observe(element);
    }
  }

  /**
   * With `slotted`: each glyph box, and whether it is drawn, from what its slots hold and the widths the observer last
   * reported (`sizes`) — no read of the layout. A box that holds a name is drawn while its probe's name is one glyph:
   * at most `DRAWN_WIDTH` of the box. Without an observer nothing could say when the font arrives, and every box that
   * holds a glyph is drawn.
   */
  decided(): Reading[] {
    const readings: Reading[] = [];
    if (!this.connected) return readings;
    let named = false;
    for (const glyph of this.glyphs()) {
      const inks = this.slottedIn(glyph);
      if (!inks.length || !observer || !inks.some(isNamed)) {
        readings.push([glyph, inks.length > 0]);
        continue;
      }
      named = true;
      const box = sizes.get(glyph);
      const probe = sizes.get(probeOf(glyph));
      readings.push([glyph, box !== undefined && probe !== undefined && box > 0 && probe <= box * DRAWN_WIDTH]);
    }
    // A face the probe first asked for in the layout just made is loading now: the boxes are reported again once it is.
    if (named) faces.measured();
    return readings;
  }

  /**
   * Each glyph, and whether its ink is the ligature: a reading of the layout. None for a host that is not connected,
   * nor for a `slotted` one (`decided`). `again`: read every glyph (a face arrived, the observer reported a size);
   * otherwise only the glyphs whose name or family changed since they were read (`readUnder`) — the others are left
   * out, and keep their mark.
   *
   * The family is read only of an ink that is laid out: one read in a box last time (and compared before any layout),
   * or one whose box was just read and is not empty. An ink in a part that is not drawn (the buttons of a search's
   * closed view) has no style resolved here: Firefox keeps a style resolved for an element outside the layout, and a
   * glyph slotted into a Button's flex box then reads as `inline-block` where it is drawn as a block, a frame after it
   * was drawn — a change of style no frame shows.
   */
  read(again = false): Reading[] {
    const readings: Reading[] = [];
    if (!this.connected || this.options.slotted) return readings;
    for (const glyph of this.glyphs()) {
      const ink = glyph.firstElementChild as HTMLElement | null;
      const watched = !!ink && this.observed.has(ink);
      const known = watched ? readUnder.get(ink) : undefined;
      if (!again && known !== undefined && known === underOf(ink!)) continue;
      const box = glyph.clientWidth;
      readings.push([glyph, !!ink && box > 0 && ink.offsetWidth <= box * DRAWN_WIDTH]);
      if (!watched) continue;
      if (box > 0) {
        const under = underOf(ink!);
        readUnder.set(ink!, under);
        for (const name of under.slice(under.indexOf('\n') + 1).split(',')) iconFamilies.add(familyName(name));
      } else readUnder.delete(ink!);
    }
    // After the layout the reads forced: the icon face a glyph first asked for in it is loading now.
    if (readings.length) faces.measured();
    return readings;
  }
}
