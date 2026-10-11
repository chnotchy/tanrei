import { DRAWN_WIDTH } from './glyph.js';

/**
 * Whether the icon set can draw a glyph yet, for a light-DOM component whose glyphs are drawn by a stylesheet (a
 * pseudo-element's `content`, the product's own `.tanrei-icon` elements): there is no box of the component's own to
 * measure each glyph in, so ONE name is measured in the icon family, in a box that is not drawn, and the host is marked
 * `data-glyphs="pending"` while the family cannot draw it. The stylesheet draws no glyph under that mark and keeps
 * every box (TRV-40).
 *
 * A glyph is a ligature — one glyph, about one em wide — and its name spelled in a text face is several
 * (src/primitives/glyph.ts). A family that draws is remembered until the fonts of the page change. Only while the
 * family cannot draw does the measured box stay, as a child of the host that is not drawn, so that the font's arrival
 * is heard as a change of that box's size in the frame it happens, whatever the engine says of its fonts.
 */
const drawable = new Set<string>();
const EM = 24;
const PROBE = 'data-tanrei-glyph-probe';
const FAMILY = '--tanrei-sys-icon-family-unselected';

const connected = new Set<PendingGlyphs>();
const fontsChanged = () => {
  drawable.clear();
  for (const pending of connected) pending.read();
};

/** Whether `node` is the box a host's glyph is measured in: its coming and going is not a change of the host's content. */
export const isGlyphProbe = (node: Node) => node instanceof Element && node.hasAttribute(PROBE);

export class PendingGlyphs {
  private probe: HTMLElement | null = null;
  private sizes: ResizeObserver | null | undefined;

  /** `glyph`: a name the icon set has (the component's own mark: `chevron_right`). */
  constructor(
    private readonly host: HTMLElement,
    private readonly glyph: string,
  ) {}

  /** Call when the host is connected. */
  connect() {
    if (!connected.size) {
      document.fonts?.addEventListener('loadingdone', fontsChanged);
      document.fonts?.addEventListener('loadingerror', fontsChanged);
    }
    connected.add(this);
  }

  /** Call when the host is disconnected. */
  disconnect() {
    connected.delete(this);
    if (!connected.size) {
      document.fonts?.removeEventListener('loadingdone', fontsChanged);
      document.fonts?.removeEventListener('loadingerror', fontsChanged);
    }
    this.sizes?.disconnect();
    this.probe?.remove();
    this.probe = null;
  }

  /** Reads whether the family draws the glyph now, and writes the mark. A host that is not drawn is asked again when it is. */
  read() {
    const host = this.host;
    if (!host.isConnected) return;
    const family = getComputedStyle(host).getPropertyValue(FAMILY).trim();
    let drawn = !family || drawable.has(family);
    if (!drawn) {
      const probe = this.probe ?? host.appendChild(this.box());
      const width = probe.getBoundingClientRect().width;
      drawn = width <= EM * DRAWN_WIDTH;
      if (drawn && width > 0) drawable.add(family);
      else if (!this.probe) {
        this.probe = probe;
        this.sizes ??= typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.read());
        this.sizes?.observe(probe);
      }
    }
    if (drawn && this.probe) {
      this.sizes?.disconnect();
      this.probe = null;
    }
    if (drawn) host.querySelector(`:scope > [${PROBE}]`)?.remove();
    if (drawn) host.removeAttribute('data-glyphs');
    else if (host.getAttribute('data-glyphs') !== 'pending') host.setAttribute('data-glyphs', 'pending');
  }

  private box(): HTMLElement {
    const probe = document.createElement('span');
    probe.setAttribute('aria-hidden', 'true');
    probe.setAttribute(PROBE, '');
    probe.style.cssText = `position: absolute; visibility: hidden; pointer-events: none; white-space: nowrap; font: normal ${EM}px/1 var(${FAMILY}); letter-spacing: normal; font-feature-settings: 'liga'; text-transform: none`;
    probe.textContent = this.glyph;
    return probe;
  }
}
