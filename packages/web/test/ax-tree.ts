// The accessibility tree an engine computes, read through Chromium's DevTools protocol — the one engine that gives it
// to a test. What two stages of one page say to assistive technology is compared line by line (a composed
// element and the same thing written one level down are the same tree).
import type { Page } from '@playwright/test';

/** The states of a node that a line carries, where the engine gives them (it gives no position in a set). */
const STATES = ['checked', 'invalid', 'required', 'disabled', 'orientation', 'focusable'];

/**
 * The tree Chromium computes under the element `selector` finds, without the nodes it ignores: one line per node —
 * role, name, description and states — indented by depth.
 */
export async function axTree(page: Page, selector: string): Promise<string[]> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { result } = await cdp.send('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(selector)})` });
  const { node } = await cdp.send('DOM.describeNode', { objectId: result.objectId! });
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  const byId = new Map(nodes.map((each) => [each.nodeId, each]));
  const root = nodes.find((each) => each.backendDOMNodeId === node.backendNodeId);
  if (!root) throw new Error(`${selector} is not in the accessibility tree`);
  const lines: string[] = [];
  const walk = (id: string, depth: number) => {
    const at = byId.get(id);
    if (!at) return;
    let next = depth;
    if (!at.ignored) {
      const states = (at.properties ?? [])
        .filter((property) => STATES.includes(property.name))
        .map((property) => `${property.name}=${String(property.value.value)}`)
        .sort();
      lines.push(`${'  '.repeat(depth)}${String(at.role?.value)} "${String(at.name?.value ?? '')}"${at.description?.value ? ` (${String(at.description.value)})` : ''}${states.length ? ` ${states.join(' ')}` : ''}`);
      next = depth + 1;
    }
    for (const child of at.childIds ?? []) walk(child, next);
  };
  for (const child of root.childIds ?? []) walk(child, 0);
  return lines;
}

/**
 * The tree inside a composed element's own node. Chromium gives every form-associated custom element that can be
 * validated a node of its own — `generic`, with no name: no role — and the composed element is the form's control
 * where its twin's frame is not. That one node, where there is one, is the whole difference between the two trees; a
 * disabled element, which is not validated, has none. While the form's own validation refuses the element — required
 * and empty — the engine marks that node invalid, as it marks any control its validation refuses.
 */
export function insideHost(tree: string[]): string[] {
  if (!/^generic ""( invalid=(false|true))?$/.test(tree[0] ?? '') || tree.slice(1).some((line) => !line.startsWith('  '))) return tree;
  return tree.slice(1).map((line) => line.slice(2));
}

/**
 * The lines of a tree whose role is one of `roles`, indented by how many of the kept lines each is inside: the nodes
 * between them — a custom element's own node, a label's — are left out, and what contains what is kept.
 */
export function ofRoles(tree: string[], roles: string[]): string[] {
  const kept: string[] = [];
  const open: number[] = [];
  for (const line of tree) {
    const indent = line.length - line.trimStart().length;
    if (!roles.includes(line.trimStart().split(' ')[0]!)) continue;
    while (open.length && open[open.length - 1]! >= indent) open.pop();
    kept.push(`${'  '.repeat(open.length)}${line.trimStart()}`);
    open.push(indent);
  }
  return kept;
}
