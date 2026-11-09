// The bar's Share menu: a button that opens a popover with what the Studio can share of the layer — the link to the
// Studio that holds it, where the page's address holds the layer (`address`), and, where the documentation hosts the
// Studio (`docs`), a switch that shows the documentation in the layer: off until the person turns it on, and kept in
// this browser only. While it is on, the documentation follows the layer this browser keeps as it is edited; turned
// off, the documentation keeps no layer and shows its own look again.
import { packLayer, withLayer } from '../address.js';
import { stringifyLayer } from '../core.js';
import { type Ctx, type Json, type Layer, button, h } from './dom';

/** The documentation that hosts the Studio, as the Studio sees it: the layer it keeps for its "My theme", if any. */
export interface DocsTheme {
  /** Whether the documentation keeps a layer of the Studio's to show. */
  kept(): boolean;
  /**
   * Keep `layer` for the documentation, in the place of any before it; with `show`, the documentation shows it from
   * now on. `null`: keep none, and the documentation shows its own look again.
   */
  keep(layer: Layer | null, options?: { show?: boolean }): void;
}

/** How long the layer rests before the documentation is given it again: one edit's commits are one change. */
const REST = 300;
/** The glyph of the menu's button: declared, so that the docs site's cut-down icon file has it (packages/tools/src/glyphs.js). */
const SHARE_GLYPH = 'link';

/** Copies the address of the Studio holding this layer; what was said of it (copied, or not). */
export async function copyLayerLink(ctx: Ctx): Promise<string> {
  const { t, studio } = ctx;
  try {
    const text = stringifyLayer(ctx.layer());
    const packed = text === stringifyLayer(studio.blank()) ? null : await packLayer(text);
    await navigator.clipboard.writeText(`${location.origin}${location.pathname}${location.search}${withLayer(location.hash, packed)}`);
    return t.exporting.linkCopied;
  } catch {
    return t.exporting.copyFailed;
  }
}

export function createShareMenu(ctx: Ctx, { linked, docs, glyph }: { linked: boolean; docs?: DocsTheme; glyph(name: string): HTMLElement }) {
  if (!linked && !docs) return null;
  const { t, studio } = ctx;
  const words = t.sharing;
  const system = (studio.systems as Json[]).find((each) => each.id === studio.defaultId)?.name ?? studio.defaultId;
  const id = ctx.uid('ts-share');
  const opener = h('tanrei-button', { id, variant: 'outlined', size: 'small', 'data-share-open': true }, glyph(SHARE_GLYPH), words.open);

  // The link: what Export's last tab offers too, one press away.
  const linkState = h('span', { class: 'ts-help', role: 'status', 'data-share-link-state': true });
  const link = linked
    ? h(
        'section',
        { class: 'ts-stack', 'aria-label': t.exporting.share, 'data-share-link': true },
        h('p', { class: 'ts-help', text: t.exporting.shareHelp }),
        h('div', { class: 'ts-actions' }, button(t.exporting.copyLink, () => void copyLayerLink(ctx).then((said) => ((linkState.textContent = said), ctx.announce(said))), { primary: true, 'data-share-copy-link': true }), linkState),
      )
    : null;

  // The documentation in this layer.
  const toggle = docs ? (h('tanrei-switch', { label: words.docs, 'data-share-docs': true }) as HTMLElement & { checked: boolean }) : null;
  let given = '';
  let resting: number | undefined;
  /** The layer this browser keeps, given to the documentation now (and shown there, with `show`). */
  let keeping: () => Layer = () => ctx.layer();
  toggle?.addEventListener('change', () => {
    if (!docs || !toggle) return;
    window.clearTimeout(resting);
    if (toggle.checked) {
      const layer = keeping();
      given = stringifyLayer(layer);
      docs.keep(layer, { show: true });
      ctx.announce(words.docsOn);
    } else {
      given = '';
      docs.keep(null);
      ctx.announce(words.docsOff(system));
    }
  });
  const docsPart = toggle
    ? h('section', { class: 'ts-stack', 'aria-label': words.docs, 'data-share-docs-part': true }, toggle, h('p', { class: 'ts-help', text: words.docsHelp(system) }))
    : null;

  const popover = h(
    'tanrei-popover',
    { class: 'ts-share', anchor: id, placement: 'bottom-end', headline: words.open, closable: true, 'close-label': words.close, 'data-share': true },
    h('div', { class: 'ts-stack ts-share-body' }, link, link && docsPart ? h('tanrei-divider', { decorative: true }) : null, docsPart),
  ) as HTMLElement & { open: boolean };
  /** The switch says what the documentation keeps: another tab of the documentation may have changed it. */
  const refresh = () => {
    if (toggle && docs) toggle.checked = docs.kept();
  };
  popover.addEventListener('toggle', (event) => {
    if (event.target !== popover) return;
    const open = (event as unknown as CustomEvent<{ open: boolean }>).detail.open;
    if (open) refresh();
    popover.open = open;
  });
  popover.addEventListener('close', (event) => event.target === popover && (popover.open = false));
  refresh();

  return {
    el: [opener, popover],
    /**
     * The layer this browser keeps (`keeping()`) changed, or may have: while the documentation keeps one of the
     * Studio's, it is given this one once the edits rest. The documentation's look is the reader's: it is not changed.
     */
    follow(next: () => Layer) {
      keeping = next;
      if (!docs || !docs.kept()) return;
      const text = stringifyLayer(next());
      if (text === given) return;
      window.clearTimeout(resting);
      resting = window.setTimeout(() => {
        if (!docs.kept()) return;
        given = text;
        docs.keep(next());
      }, REST);
    },
  };
}
