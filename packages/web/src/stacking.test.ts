// A component's stacking order stays inside the component. A shadow root makes no stacking context, so a z-index a
// component gives one of its parts — a Code block's copy button, a Slider's value indicator, a Button group's divider —
// is otherwise ordered in the PAGE's stacking context, against the page's own levels: it rose over a sticky header of
// the product's at z-index 1 and took its clicks. So a component that gives any of its parts a z-index makes its own
// outermost box a stacking context (`isolation: isolate`), and what has to stand over the page is drawn in the top
// layer (a popover, a modal dialog), never by a level.
//
// Every fixture of every component with a web implementation is mounted, and two things are asked of it:
// - each element of it that a z-index places (positioned, or a flex or grid item, with a z-index other than `auto`)
//   is ordered in a stacking context inside the fixture, never in the page's; an element in the top layer is its own;
// - a sticky header of the page's at z-index 1, laid over the fixture, is what is drawn at every point of it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { loadSpec, mountFixtures } from '../test/harness.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
/** Every spec the web implements. */
const NAMES = fs
  .readdirSync(path.join(repo, 'specs'))
  .filter((file) => file.endsWith('.spec.json'))
  .map((file) => JSON.parse(fs.readFileSync(path.join(repo, 'specs', file), 'utf8')) as { name: string; platforms?: { web?: { status?: string } } })
  .filter((spec) => spec.platforms?.web?.status && spec.platforms.web.status !== 'planned')
  .map((spec) => spec.name)
  .sort();

/**
 * Runs in the page: for each stage, every element (through shadow roots and slots) that a z-index places, whose
 * stacking context is the stage's or one outside it — `<fixture> › <element path> (z-index)`.
 */
function escaping(): string[] {
  const flatParent = (el: Element): Element | null => (el.assignedSlot as Element | null) ?? el.parentElement ?? ((el.getRootNode() as ShadowRoot).host || null);
  const placedByZ = (el: Element, s: CSSStyleDeclaration) => {
    if (!s.zIndex || s.zIndex === 'auto' || s.display === 'none' || s.display === 'contents') return false;
    if (s.position !== 'static') return true;
    const parent = flatParent(el);
    return !!parent && /flex|grid/.test(getComputedStyle(parent).display);
  };
  const inTopLayer = (el: Element) => el.matches(':popover-open, :modal, :fullscreen');
  /** Whether an element makes a stacking context: what MDN lists (position, z-index, isolation, opacity, transforms, filters, containment, the top layer). */
  const makesContext = (el: Element) => {
    const s = getComputedStyle(el);
    if (s.display === 'contents') return false;
    if (inTopLayer(el)) return true;
    if (s.position === 'fixed' || s.position === 'sticky') return true;
    if (placedByZ(el, s)) return true;
    if (Number(s.opacity) < 1 || s.isolation === 'isolate' || s.mixBlendMode !== 'normal') return true;
    if (s.transform !== 'none' || s.translate !== 'none' || s.rotate !== 'none' || s.scale !== 'none' || s.perspective !== 'none') return true;
    if (s.filter !== 'none' || s.backdropFilter !== 'none' || s.clipPath !== 'none' || (s.maskImage && s.maskImage !== 'none')) return true;
    if (/paint|layout|strict|content/.test(s.contain)) return true;
    if (s.containerType && s.containerType !== 'normal') return true;
    return /transform|opacity|filter|isolation|z-index|translate|rotate|scale/.test(s.willChange);
  };
  const out: string[] = [];
  for (const stage of document.querySelectorAll('.stage')) {
    const id = stage.getAttribute('data-fixture') ?? stage.getAttribute('data-twin-of') ?? '?';
    const all: Element[] = [];
    const walk = (root: ParentNode) => {
      for (const el of root.querySelectorAll('*')) {
        all.push(el);
        if (el.shadowRoot) walk(el.shadowRoot);
      }
    };
    walk(stage);
    for (const el of all) {
      const s = getComputedStyle(el);
      if (!placedByZ(el, s) || s.zIndex === '0' || inTopLayer(el)) continue;
      // An element inside an overlay that is in the top layer is ordered there.
      let context: Element | null = null;
      for (let at = flatParent(el); at; at = flatParent(at)) {
        if (makesContext(at)) {
          context = at;
          break;
        }
      }
      // Inside the stage — its own stacking context's element is a descendant of the stage — the order is the component's.
      if (context && context !== stage && stage.contains(context.getRootNode() instanceof ShadowRoot ? hostChain(context, stage) : context)) continue;
      const names: string[] = [];
      for (let at: Element | null = el; at && at !== stage && names.length < 5; at = flatParent(at)) names.unshift(at.localName + (typeof at.className === 'string' && at.className ? `.${at.className.trim().split(/\s+/)[0]}` : ''));
      out.push(`${id} › ${names.join(' › ')} (${s.zIndex})`);
    }
  }
  return [...new Set(out)];

  /** The outermost host of `el` that stands in the light DOM of `stage` (or `el` itself), for `contains`. */
  function hostChain(el: Element, stage: Element): Element {
    let at: Element = el;
    while (!stage.contains(at)) {
      const root = at.getRootNode();
      if (!(root instanceof ShadowRoot)) break;
      at = root.host;
    }
    return at;
  }
}

/**
 * What still reaches the page's stacking order, by component, with the reason; this list only shrinks. A part listed
 * here that no longer escapes fails too, so the entry is taken out with the fix.
 */
const KNOWN: Record<string, { part: RegExp; reason: string }> = {
  // SLD's value indicator must stand over the content beside the slider (above it, where it rises), which a stacking
  // context of the slider's own would put under any later positioned neighbour. It belongs in the top layer, as the
  // other floating parts are (a popover placed against the handle); until then it is the one part that escapes.
  slider: { part: /› div\.value-indicator \(1\)$/, reason: 'the value indicator rises over the neighbours; it moves to the top layer in its own change' },
  'slider-field': { part: /› div\.value-indicator \(1\)$/, reason: 'the Slider inside it' },
  field: { part: /› div\.value-indicator \(1\)$/, reason: 'the Slider of its slider fixtures' },
};

for (const name of NAMES) {
  test(`a z-index in ${name} orders its own parts only: each is ordered in a stacking context inside the component`, async ({ page }) => {
    const spec = loadSpec(name);
    await page.setViewportSize({ width: 1280, height: 900 });
    await mountFixtures(page, spec, { icons: true });
    const found = await page.evaluate(escaping);
    const known = KNOWN[name];
    expect(found.filter((line) => !known?.part.test(line))).toEqual([]);
    if (known) expect(found.some((line) => known.part.test(line)), `${name} no longer lets ${known.part} escape: take it out of KNOWN`).toBe(true);
  });
}

/** The components that gave a part a z-index in the page's stacking order, each sealed now by its own. */
const SEALED = ['button-group', 'button-with-menu', 'carousel', 'chip', 'code-block', 'file-item', 'menu', 'navigation-drawer', 'stepper'];
/** A product's own sticky header, at the smallest level that lifts it over the page's content. */
const HEADER = '<header id="product-header" style="position: sticky; inset-block-start: 0; z-index: 1; block-size: 64px; background: rgb(255, 255, 255)"></header>';

for (const name of SEALED) {
  test(`${name} scrolled under a product's sticky header at z-index 1 is drawn under it, at every point of the header`, async ({ page }) => {
    const spec = loadSpec(name);
    await page.setViewportSize({ width: 1280, height: 900 });
    await mountFixtures(page, spec, { icons: true, lead: HEADER });
    // Each stage in turn, half under the header: what is drawn at a grid of points inside the header is the header.
    const covered = await page.evaluate(async () => {
      const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const header = document.getElementById('product-header')!;
      // What a fixture opens in the top layer (a modal drawer, an open menu) stands over the whole window by design:
      // it is closed first, so what is asked is what stands in the page.
      const walk = (root: Document | ShadowRoot) => {
        for (const el of root.querySelectorAll('*')) {
          if (el instanceof HTMLDialogElement && el.matches(':modal')) el.close();
          else if (el instanceof HTMLElement && el.matches(':popover-open')) el.hidePopover();
          if (el.shadowRoot) walk(el.shadowRoot);
        }
      };
      walk(document);
      await frame();
      const out: string[] = [];
      for (const stage of document.querySelectorAll<HTMLElement>('.stage[data-fixture]')) {
        // Long enough below to scroll any stage under the header.
        document.body.style.paddingBlockEnd = `${window.innerHeight}px`;
        window.scrollBy(0, stage.getBoundingClientRect().top - header.offsetHeight / 2);
        await frame();
        const r = header.getBoundingClientRect();
        for (let i = 0; i <= 64; i++)
          for (const f of [0.1, 0.5, 0.9]) {
            const hit = document.elementFromPoint(r.left + 1 + ((r.width - 2) * i) / 64, r.top + r.height * f);
            if (hit && hit !== header) out.push(`${stage.dataset.fixture}: ${hit.localName}`);
          }
      }
      return [...new Set(out)];
    });
    expect(covered).toEqual([]);
  });
}
