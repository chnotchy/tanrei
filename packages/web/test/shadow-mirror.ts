// A glyph that shows a direction is drawn mirrored in a right-to-left layout wherever the component is used — in the
// document, and in a shadow root of the product's, which is where a web component library is often used. The tests of
// each light-DOM element that holds a product's `.tanrei-icon` read it the same way: the element in a `dir="rtl"`
// container inside two shadow roots of the product's, one declared in the page's markup (parsed with the page, before
// the bundle defines the element) and one attached by script after, each with `icons.css` in it as the product's own
// sheet (the `.tanrei-icon` rules of the document do not reach into a shadow root).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import { askForFrame } from './frame-asked.js';

const dist = (file: string) => fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', file), 'utf8');

/** The hosts of the two shadow roots, by id. */
export const SHADOW_HOSTS = ['declared', 'scripted'] as const;
export type ShadowHost = (typeof SHADOW_HOSTS)[number];

/**
 * The markup that declares the first shadow root, for `mountFixtures(…, { lead })`: `markup` in it after `icons.css`
 * and the element's own stylesheet `sheet` (dist/), so the root holds the sheet before the element is defined.
 */
export function declaredShadowRoot(markup: string, sheet: string): string {
  return `<div id="declared"><template shadowrootmode="open"><style>${dist('icons.css')}\n${dist(sheet)}</style>${markup}</template></div>`;
}

/**
 * Attaches the second shadow root by script, with `markup` in it after `icons.css` alone: the element adds its own
 * stylesheet to that root, as it does wherever its sheet is missing. The page then draws a frame (`askForFrame()`).
 */
export async function attachShadowRoot(page: Page, markup: string): Promise<void> {
  await page.evaluate(
    ([css, html]) => {
      const outer = document.createElement('div');
      outer.id = 'scripted';
      outer.attachShadow({ mode: 'open' }).innerHTML = `<style>${css}</style>${html}`;
      document.body.append(outer);
    },
    [dist('icons.css'), markup] as const,
  );
  await askForFrame(page);
}

/** Each `.tanrei-icon` in the shadow root of `host`, in order: its name, whether it is marked, and its transform. */
export function glyphsIn(page: Page, host: ShadowHost): Promise<{ name: string; marked: boolean; transform: string }[]> {
  return page.evaluate(
    (id) =>
      [...(document.getElementById(id)?.shadowRoot?.querySelectorAll('.tanrei-icon') ?? [])].map((glyph) => ({
        name: glyph.textContent?.trim() ?? '',
        marked: glyph.hasAttribute('data-tanrei-mirrored'),
        transform: getComputedStyle(glyph).transform,
      })),
    host,
  );
}
