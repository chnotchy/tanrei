// A product's text is a paragraph of its own direction (`unicode-bidi: plaintext`: `productText()`, and the same
// declaration in the stylesheets of the light-DOM components and of prose), and it is drawn inside the
// content box of the box that carries it, in every component.
//
// WebKit lays such a paragraph over its box's inline padding where the paragraph's direction is not the layout's and
// the box's two inline paddings differ (measured on a
// bare block: `dir="rtl"` around `<span style="display: block; unicode-bidi: plaintext; text-align: right;
// padding-inline-start: 12px">Compose</span>` draws the word 12px outside the content box, and inside it where the two
// paddings are equal or the room is a margin). So the box that carries `plaintext` keeps its inline paddings equal,
// and room on one side is a margin or a parent's padding: `productText()` says so, and this file looks at every box of
// every fixture of every spec, in a right-to-left page — where the fixtures' left-to-right words are the other
// direction. Only WebKit has anything to find; the other engines place the line in the content box whatever the
// paddings are.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { loadSpec, mountFixtures } from '../../test/harness.js';

const specs = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../specs');
const names = fs.readdirSync(specs).filter((file) => file.endsWith('.spec.json')).map((file) => file.replace('.spec.json', ''));

test.describe('a paragraph of its own direction stands inside its box’s content', () => {
  test.skip(({ browserName }) => browserName !== 'webkit', 'the defect is WebKit’s: the other engines have nothing to find, and the look costs a mount of every fixture of every spec');

  for (const name of names) {
    test(`${name}: in a right-to-left page no box that carries unicode-bidi: plaintext and unequal inline paddings draws its left-to-right text outside its content box`, async ({ page }) => {
      await mountFixtures(page, loadSpec(name), { dir: 'rtl', icons: true });
      const outside = await page.evaluate(() => {
        const found = new Set<string>();
        const range = document.createRange();
        const look = (root: Document | ShadowRoot) => {
          for (const el of root.querySelectorAll('*')) {
            if (el.shadowRoot) look(el.shadowRoot);
            const style = getComputedStyle(el);
            if (style.unicodeBidi !== 'plaintext') continue;
            const [left, right] = [Number.parseFloat(style.paddingLeft), Number.parseFloat(style.paddingRight)];
            if (!(Math.abs(left - right) > 0.5)) continue;
            // The text the box draws: its own, and what is slotted into it.
            const rects: DOMRect[] = [];
            // (Not into a box that clips its own text — a one-line label cut with an ellipsis lays out the rest beside
            // itself, hidden: such a box is looked at by itself where it carries plaintext and unequal paddings.)
            const text = (node: Node) => {
              if (node instanceof HTMLSlotElement && node.assignedNodes().length) node.assignedNodes({ flatten: true }).forEach(text);
              else if (node instanceof Element && node !== el && getComputedStyle(node).overflowX !== 'visible') return;
              else if (node.nodeType !== Node.TEXT_NODE) node.childNodes.forEach(text);
              else if (node.nodeValue?.trim()) {
                range.selectNodeContents(node);
                rects.push(...[...range.getClientRects()].filter((rect) => rect.width > 0));
              }
            };
            text(el);
            if (!rects.length) continue;
            const box = el.getBoundingClientRect();
            const beyond = Math.max(box.left + left - Math.min(...rects.map((rect) => rect.left)), Math.max(...rects.map((rect) => rect.right)) - (box.right - right));
            if (beyond > 0.5) found.add(`${(el.getRootNode() as ShadowRoot).host?.localName ?? 'the page'}: <${el.localName} class="${el.className}"> paddings ${left}/${right}, its text ${Math.round(beyond * 10) / 10}px outside`);
          }
        };
        look(document);
        return [...found];
      });
      expect(outside).toEqual([]);
    });
  }
});
