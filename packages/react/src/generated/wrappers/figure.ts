// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiFigure as TanreiFigureElement } from '@tanrei/web/components/figure';

const FigureElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-figure',
  elementClass: TanreiFigureElement,
  react: React,
  events: {},
});
const FigureAttributes = { headline: ['headline', ''], caption: ['caption', ''], label: ['label', ''], variant: ['variant', 'outlined'], inset: ['flush', true], separation: ['separation', 'auto'], pattern: ['pattern', 'none'] } as const;
/**
 * Sets one thing to look at — a picture, a chart, a specimen, a live example — on a stage of its own, framed or not, with a caption that says what it shows, and optionally a title with the product's controls above and a joined block beneath. It is never pressed and has no state; what stands in it stays as operable as it is anywhere else.
 *
 * Children, by their `slot`:
 * - default — The native `<figure>` — a frame (`data-part="frame"`) around an optional `<header>`, the stage (`data-part="stage"`) and an optional attachment, then an optional `<figcaption>` — or, for a figure the element builds, what is shown. A child in the document, not a slotted node: the element has no shadow root.
 * - `title` — For a figure the element builds: the product's own title content in place of `headline` (text with inline content, or a heading of the level the page's outline needs). In the native form it is the element with `data-part="title"`.
 * - `actions` — For a figure the element builds: the controls at the end of the header. In the native form they are the children of the element with `data-part="actions"`.
 * - `caption` — For a figure the element builds: the product's own caption content in place of `caption`. In the native form it is the `<figcaption>`.
 * - `attachment` — For a figure the element builds: the block joined under the stage. In the native form it is the element with `data-part="attachment"`.
 */
export const Figure = /* @__PURE__ */ withServerAttributes(FigureElement, 'tanrei-figure', TanreiFigureElement, FigureAttributes);
