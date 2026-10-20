import type { ReactiveController, ReactiveControllerHost } from 'lit';

/**
 * A glyph of the icon set is a ligature: while its font is missing (still loading, failed, or never made available —
 * fonts are named, not bundled) the browser spells the glyph's name in a text face instead (CHK-19). A
 * ligature is one glyph, about one em wide; its name spelled out is several. A glyph is drawn while its ink is at most
 * `DRAWN_WIDTH` of its box (the box is one em: `iconGlyph()` sizes both from the icon size). The one answer on the web to
 * whether a glyph of the icon set can be drawn yet: the checkbox (CHK-19), the switch (SWT-17), the menu's check (MNU-30),
 * the snackbar's glyphs (SNK-26) and every other mark of the icon set use it.
 *
 * It assumes that a face that draws the ligature draws it no wider than `DRAWN_WIDTH` em, and that a fallback face
 * spells the name wider than that. That holds for Material Symbols and Material Icons; an icon font whose ligatures are
 * wider than their em box would read as not drawable.
 */
export const DRAWN_WIDTH = 1.5;

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
    glyph.toggleAttribute('data-drawn', drawn);
    changed.push(glyph);
    if (drawn) appeared.push(glyph);
  }
  for (const animation of appeared.flatMap((glyph) => glyph.getAnimations())) animation.finish();
  return changed;
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

/** The families an ink was read in: a face of another family that arrives cannot change what a glyph draws. */
const iconFamilies = new Set<string>();
const familyName = (family: string) => family.trim().replace(/^["']|["']$/g, '').toLowerCase();

/**
 * One subscription to the fonts of the page for every host (not two for each: a page of a thousand checkboxes had two
 * thousand). A face that finishes loading, or fails to, has every host read all its glyphs again — once, together —
 * unless it is of none of the families the glyphs were read in: a text face's arrival leaves every ligature as wide as
 * it was. Without an observer to report what this skips, every load is read.
 */
const connected = new Set<GlyphDrawnController>();
function fontsChanged(event: Event) {
  const faces = (event as Event & { fontfaces?: readonly FontFace[] }).fontfaces;
  if (observer && faces && !faces.some((face) => iconFamilies.has(familyName(face.family)))) return;
  for (const host of connected) decideTogether(host, true);
}

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

/**
 * Marks each glyph the host draws with `data-drawn` while the icon set can draw it, and removes the mark while it cannot,
 * so the component's styles draw nothing in its place until then. Each glyph is a box styled by `iconGlyph()` holding
 * ONE inline-block child with the ligature text — the child's width is the ink's. A ResizeObserver on that child hears
 * the font arrive (or a system switch to another icon set) in the frame it changes the layout, before it is painted.
 * When a glyph becomes drawable, the transitions running on it are ended, so it appears without motion.
 */
export class GlyphDrawnController implements ReactiveController {
  private connected = false;
  private readonly observed = new Set<Element>();

  /**
   * `firstInFrame`: a glyph the host draws for the first time is decided by the observer — after the layout of the
   * frame it is first drawn in, before that frame is painted — in place of a layout the host asks for in the task of
   * its render. For a host that a page draws many of at once (the copy button of every code block of a page): the
   * hosts are then decided in one pass, and none of them costs the page a layout of its own. The mark is in the
   * first frame painted either way; it is not there yet in the task of the render, nor in a frame callback before it.
   */
  constructor(
    private readonly host: ReactiveControllerHost & Element,
    private readonly glyphs: () => Iterable<HTMLElement>,
    private readonly options: { firstInFrame?: boolean } = {},
  ) {
    host.addController(this);
  }

  hostConnected() {
    this.connected = true;
    if (!connected.size) {
      document.fonts?.addEventListener('loadingdone', fontsChanged);
      document.fonts?.addEventListener('loadingerror', fontsChanged);
    }
    connected.add(this);
  }

  hostDisconnected() {
    this.connected = false;
    for (const ink of this.observed) {
      observer?.unobserve(ink);
      owners.delete(ink);
      readUnder.delete(ink);
    }
    this.observed.clear();
    connected.delete(this);
    if (!connected.size) {
      document.fonts?.removeEventListener('loadingdone', fontsChanged);
      document.fonts?.removeEventListener('loadingerror', fontsChanged);
    }
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

  /**
   * Each glyph, and whether its ink is the ligature: a reading of the layout. None for a host that is not connected.
   * `again`: read every glyph (a face arrived, the observer reported a size); otherwise only the glyphs whose name or
   * family changed since they were read (`readUnder`) — the others are left out, and keep their mark.
   */
  read(again = false): Reading[] {
    const readings: Reading[] = [];
    if (!this.connected) return readings;
    for (const glyph of this.glyphs()) {
      const ink = glyph.firstElementChild as HTMLElement | null;
      const watched = !!ink && this.observed.has(ink);
      const family = watched ? getComputedStyle(ink).fontFamily : '';
      const under = `${ink?.textContent}\n${family}`;
      if (watched && !again && readUnder.get(ink) === under) continue;
      const box = glyph.clientWidth;
      readings.push([glyph, !!ink && box > 0 && ink.offsetWidth <= box * DRAWN_WIDTH]);
      if (!watched) continue;
      if (box > 0) readUnder.set(ink, under);
      else readUnder.delete(ink);
      for (const name of family.split(',')) iconFamilies.add(familyName(name));
    }
    return readings;
  }
}
