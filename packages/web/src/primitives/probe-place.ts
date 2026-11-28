// Where a probe stands: an element this package puts in the page for the instant it is measured, and takes out again
// (the style queries' probe, src/primitives/separation.ts; the box of the window that `windowBox()` reads,
// src/primitives/modal.ts).
//
// Never in the root element, where a page of many elements pays for it twice in Firefox. Firefox marks an element when
// a rule that looks at a child's place among its siblings (`:first-child`, `:last-child`, `+`, `~`) is tried on its
// children, and an element put in or taken out of a marked element has it style again every sibling after it and the
// child that was last before it, with all they hold. Rules whose last part names no tag, class or attribute
// (`:where(li) > :where(:first-child)`, `:where(* + *)`: this package's own light-DOM stylesheets have them) are tried
// on every element, the head and the body too, so the root element is marked on any page that loads them, and a probe
// there had the whole body styled again as it went in and again as it came out: about 0.1 s each way on the
// documentation's Button page (13,000 elements), and 0.7 s for the style queries' probe taken out as the page loaded,
// against about 10 ms in and out at the end of the body, where the child it follows is the body's last one. Chromium
// styles neither; WebKit takes about twice as long for one in the root element (35 ms against 17 on the same page).
//
// So a probe stands at the end of the body; one placed against the window stands in the root element only where the
// body would hold it in a box of its own.

/**
 * The properties that make an element the containing block of what it holds in `position: fixed` (a transform, a
 * filter, a perspective, layout or paint containment, a container, a promise of one of those in `will-change`, skipped
 * content), each read as set wherever its computed value is other than the one that makes none. Some values read as
 * set make no such block (`contain: size`, `will-change: opacity`): the probe then stands in the root element, which
 * costs Firefox more and reads the same box. Safari 17 reads a backdrop filter only prefixed, which is not asked.
 */
const FIXED_HOLDERS = /* @__PURE__ */ 'transform translate rotate scale perspective filter backdrop-filter contain container-type will-change content-visibility'.split(' ');

/**
 * The element a probe placed against the window (`position: fixed`) is put in, under `root`: the end of the body,
 * unless the body would hold it in a box of its own (or there is none) — then the root element, whose box the window's
 * is.
 */
export function fixedProbeParent(root: HTMLElement): HTMLElement {
  // The body, where there is one, is a child of the root element: the first of its children that is a body.
  const { body } = root.ownerDocument;
  const style = body && getComputedStyle(body);
  return style && FIXED_HOLDERS.every((name) => /^(none|normal|auto|visible|)$/.test(style.getPropertyValue(name))) ? body : root;
}
