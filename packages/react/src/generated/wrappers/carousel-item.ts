// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiCarouselItem as TanreiCarouselItemElement } from '@tanrei/web/components/carousel';

const CarouselItemElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-carousel-item',
  elementClass: TanreiCarouselItemElement,
  react: React,
  events: {},
});
const CarouselItemAttributes = { label: ['label', ''] } as const;
/**
 * One item of a carousel — the spec's item kind `item`: the product's content in a rounded box, one action named by its label. A child of `<tanrei-carousel>`, which places it, sizes it and says which item is the Tab stop.
 *
 * Children, by their `slot`:
 * - default — The content: an image or other visual, never anything interactive.
 */
export const CarouselItem = /* @__PURE__ */ withServerAttributes(CarouselItemElement, 'tanrei-carousel-item', TanreiCarouselItemElement, CarouselItemAttributes);
