// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiAppBar as TanreiAppBarElement } from '@tanrei/web/components/app-bar';

const AppBarElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-app-bar',
  elementClass: TanreiAppBarElement,
  react: React,
  events: {},
});
const AppBarAttributes = { size: ['size', 'small'], headline: ['headline', ''], subtitle: ['subtitle', ''], titleAlignment: ['title-alignment', 'start'], brandHref: ['brand-href', ''], brandLabel: ['brand-label', ''], brandLayout: ['brand-layout', 'lockup'], scrolled: ['scrolled', false], dividerVisibility: ['divider-visibility', 'auto'], scrollTarget: ['scroll-target', ''], headingLevel: ['heading-level', 1] } as const;
/**
 * Names the current screen at its top edge and holds the way back and the screen's most used actions, its bottom edge drawn as the edge of a region that stays (or, under `divider-visibility="scroll"`, only once content scrolls under it).
 *
 * Children, by their `slot`:
 * - `navigation` — The navigation item: one icon-only `<tanrei-button>` (back, menu or close) at the start.
 * - `brand` — The brand as one image (a single logo file), drawn `comp.app-bar.brand.image.height` high.
 * - `brand-symbol` — The brand's symbol, drawn `comp.app-bar.brand.symbol.size` high.
 * - `brand-wordmark` — The brand's wordmark, drawn `comp.app-bar.brand.wordmark.height` high.
 * - `context` — One control of the product's context after the brand (a `<tanrei-button>` that opens a menu of workspaces, projects or design systems), laid out and never restyled.
 * - `actions` — The action items: up to three icon-only `<tanrei-button>`s at the end, in reading order.
 */
export const AppBar = /* @__PURE__ */ withServerAttributes(AppBarElement, 'tanrei-app-bar', TanreiAppBarElement, AppBarAttributes);
