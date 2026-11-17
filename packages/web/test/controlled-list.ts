// What a field's `aria-controls` names (a select's container, a combobox's input; SEL-48, CMB-48): it names its list
// box while the list is open and nothing while it is closed, and what it names is exposed — in the accessibility tree,
// never under `display: none` or inside a closed popover — also where the list holds no option and shows its status row
// alone, the list box then empty and of no size. The same holds for every element that opens a popup or shows and
// hides a list (`controlledElements`): a reference to an element that is not exposed is dropped by the engine, so it
// is no reference.
import type { Locator, Page } from '@playwright/test';

/** What the element `owner` names by `aria-controls`, as the page has it; `null` where it names nothing. In every engine. */
export function controlledList(owner: Locator) {
  return owner.evaluate((el: HTMLElement) => {
    const id = el.getAttribute('aria-controls');
    if (id === null) return null;
    const target = (el.getRootNode() as ShadowRoot | Document).getElementById(id);
    if (!target) return { found: false } as const;
    // Kept from assistive technology by itself or by an element it is in, through shadow roots: not displayed (a closed
    // popover included), hidden, aria-hidden or inert.
    const flatParent = (node: Element): Element | null => node.assignedSlot ?? node.parentElement ?? ((node.getRootNode() as ShadowRoot).host || null);
    let kept = !target.checkVisibility({ visibilityProperty: true });
    for (let at: Element | null = target; at && !kept; at = flatParent(at)) kept = at.getAttribute('aria-hidden') === 'true' || (at as HTMLElement).inert === true;
    const root = target.getRootNode() as ShadowRoot;
    const before = root.activeElement;
    target.focus();
    const focusable = root.activeElement === target;
    (before as HTMLElement | null)?.focus();
    const box = target.getBoundingClientRect();
    return {
      found: true,
      role: target.getAttribute('role'),
      exposed: !kept,
      height: box.height,
      rows: target.querySelectorAll('[role="option"]').length,
      text: (target.textContent ?? '').trim(),
      focusable,
    } as const;
  });
}

/**
 * What any element `owner` names by `aria-controls` — a menu's anchor, a popover's opener, a disclosure's button — as
 * the page has it: `null` where it names nothing; else, for each element named, by id or by element reference
 * (`ariaControlsElements`, which leaves the attribute empty), whether it was found, its role (an element's own, else
 * its tag) and whether it is exposed. A popup that is not shown is named by nothing, and what is named is exposed (MNU-24,
 * POP-18, DTM-37, FBM-20, TOC-31, NVD-37, NVD-46, APS-7). In every engine.
 */
export function controlledElements(owner: Locator) {
  return owner.evaluate((el: HTMLElement) => {
    const ids = (el.getAttribute('aria-controls') ?? '').trim();
    const root = el.getRootNode() as ShadowRoot | Document;
    const reflected = (el as unknown as { ariaControlsElements?: Element[] | null }).ariaControlsElements ?? [];
    const targets: (Element | null)[] = ids ? ids.split(/\s+/).map((id) => root.getElementById(id)) : [...reflected];
    if (!targets.length) return null;
    const flatParent = (node: Element): Element | null => node.assignedSlot ?? node.parentElement ?? ((node.getRootNode() as ShadowRoot).host || null);
    return targets.map((target) => {
      if (!target) return { found: false } as const;
      // A box that draws none of its own (`display: contents`) is as visible as what it stands in.
      let boxed: Element | null = target;
      while (boxed && getComputedStyle(boxed).display === 'contents') boxed = flatParent(boxed);
      let kept = !!boxed && !boxed.checkVisibility({ visibilityProperty: true });
      for (let at: Element | null = target; at && !kept; at = flatParent(at)) kept = at.getAttribute('aria-hidden') === 'true' || (at as HTMLElement).inert === true;
      return { found: true, role: target.getAttribute('role') ?? target.localName, exposed: !kept } as const;
    });
  });
}

/**
 * Chromium's view of the same, over the DevTools protocol: for the element of `role` (a combobox unless given) named
 * `name`, each node its `controls` relation reaches — role, name, whether it is in the tree (not ignored), how many
 * nodes of the tree it holds and whether it can take focus. An empty list where the relation reaches nothing (the
 * engine drops a reference to an element out of the tree).
 */
export async function controlledInTree(page: Page, name: string, role = 'combobox') {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  const byId = new Map(nodes.map((node) => [node.nodeId, node]));
  const byElement = new Map(nodes.filter((node) => node.backendDOMNodeId !== undefined).map((node) => [node.backendDOMNodeId, node]));
  const owner = nodes.find((node) => !node.ignored && node.role?.value === role && node.name?.value === name);
  if (!owner) throw new Error(`no ${role} named ${name} in the accessibility tree`);
  const related = (owner.properties?.find((p) => p.name === 'controls')?.value.relatedNodes ?? []) as { backendDOMNodeId?: number }[];
  return related.map((r) => {
    const node = r.backendDOMNodeId === undefined ? undefined : byElement.get(r.backendDOMNodeId);
    return {
      inTree: !!node && !node.ignored,
      role: node?.role?.value as string | undefined,
      name: node?.name?.value as string | undefined,
      children: (node?.childIds ?? []).filter((id) => byId.get(id) && !byId.get(id)!.ignored).length,
      focusable: (node?.properties?.find((p) => p.name === 'focusable')?.value.value ?? false) as boolean,
    };
  });
}
