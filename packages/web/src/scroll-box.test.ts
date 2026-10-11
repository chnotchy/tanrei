// A component inside a scroll box stays inside it: nothing it draws — and nothing it hides — counts toward the width
// of the page. A part that is positioned (`position: absolute`: a visually hidden text for assistive technology, a
// floating label, a ripple) is laid out against the nearest ancestor that is a containing block, and a scroll box
// clips only what is laid out against something inside it. So a component whose host is not a containing block leaves
// such a part OUTSIDE the box it scrolls in: far along a row the box scrolls, the part stands at the place it would
// have had, uncut, and the page itself scrolls sideways to reach one invisible pixel.
//
// So every fixture of every component is put at the far end of a row in a box 300 wide that scrolls, and the page
// must not scroll sideways: the document is exactly as wide as its window. What is in the top layer or fixed to the
// window (a dialog, a menu, a snackbar) is laid out against the window and never widens the page, wherever it is
// written.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { type Spec, loadSpec, mountFixtures } from '../test/harness.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const inventory = JSON.parse(fs.readFileSync(path.join(repo, 'specs/inventory.json'), 'utf8')) as { components: { name: string }[] };
/** Every component that has a spec and is built here: an element (src/components/<name>), or a class of a stylesheet (src/styles/<name>.css). */
const built = (name: string) => fs.existsSync(path.join(repo, `packages/web/src/components/${name}`)) || fs.existsSync(path.join(repo, `packages/web/src/styles/${name}.css`));
const specs: Spec[] = inventory.components.filter((c) => fs.existsSync(path.join(repo, `specs/${c.name}.spec.json`)) && built(c.name)).map((c) => loadSpec(c.name));

test.describe('inside a scroll box', () => {
  for (const spec of specs) {
    test(`${spec.name}: at the far end of a row a 300 wide box scrolls, no part of a fixture widens the page`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true });
      const seen = await page.evaluate(async () => {
        const box = document.createElement('div');
        box.id = 'scroll-box';
        box.style.cssText = 'inline-size: 300px; overflow: auto;';
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: flex-start; inline-size: max-content;';
        const before = document.createElement('div');
        before.style.cssText = 'flex: none; inline-size: 2000px; block-size: 1px;';
        row.append(before, ...document.querySelectorAll('.stage'));
        box.append(row);
        document.body.append(box);
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        // The parts that are laid out against something outside the box: positioned, with no containing block between
        // them and the box (through shadow roots and slots, as they are drawn). Named, so a failure says which parts to
        // look at.
        const holds = (element: Element) => {
          const style = getComputedStyle(element);
          return style.position !== 'static' || style.transform !== 'none' || style.translate !== 'none' || style.scale !== 'none' || style.rotate !== 'none' || style.containerType !== 'normal' || /layout|paint|strict|content/.test(style.contain) || style.filter !== 'none' || style.perspective !== 'none' || /transform|translate|scale|rotate|perspective|filter/.test(style.willChange);
        };
        const above = (element: Element): Element | null => element.assignedSlot ?? element.parentElement ?? ((element.getRootNode() as ShadowRoot).host as Element | undefined) ?? null;
        const beyond: string[] = [];
        const walk = (root: Document | ShadowRoot, host: string) => {
          for (const element of root.querySelectorAll('*')) {
            if (element.shadowRoot) walk(element.shadowRoot, `${host}${element.localName} » `);
            // (A part with no box, or an empty one — the host of a menu, whose surface is in the top layer — adds nothing to a page's width.)
            if (getComputedStyle(element).position !== 'absolute' || ![...element.getClientRects()].some((rect) => rect.width > 0 && rect.height > 0) || !box.contains(root === document ? element : (root as ShadowRoot).host)) continue;
            let up = above(element);
            while (up && up !== box && !holds(up)) up = above(up);
            if (up === box) beyond.push(`${host}${element.localName}${typeof element.className === 'string' && element.className ? `.${element.className.trim().split(/\s+/).join('.')}` : ''}`);
          }
        };
        walk(document, '');
        return {
          stages: row.querySelectorAll('.stage').length,
          box: [box.scrollWidth > box.clientWidth, box.clientWidth],
          page: [document.documentElement.scrollWidth, document.documentElement.clientWidth],
          beyond: [...new Set(beyond)],
        };
      });
      expect(seen.stages).toBe(spec.fixtures.length);
      // The box is the one that scrolls, and it is 300 wide.
      expect(seen.box).toEqual([true, 300]);
      // (The parts are named for the message: one that names its own place — a live region at the start corner of what
      // it is laid out against — is outside the box and widens nothing.)
      expect(seen.page[0], `the page is as wide as its window; laid out against something outside the box: ${seen.beyond.join(', ') || 'no part'}`).toBe(seen.page[1]);
    });
  }
});
