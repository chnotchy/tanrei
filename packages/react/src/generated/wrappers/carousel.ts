// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { TanreiCarousel as TanreiCarouselElement, type TanreiCarouselPausedChangeDetail } from '@tanrei/web/components/carousel';

/**
 * Lets people browse a row of visual items that scrolls sideways around one item in focus — the hero, in the centre (the default) or at the start, the others narrower (fluid widths) or smaller (scaleOthers) as they move away, every two neighbours one gap apart at every scroll position (CRL-40) — each item opening what it shows. A featured row may loop, show its position in dots and advance by itself, with a control to stop it.
 *
 * Children, by their `slot`:
 * - default — `<tanrei-carousel-item>` children: the items, in order.
 *
 * Events:
 * - `onPausedChange` (`pausedchange`) — The person paused or played autoplay with the playback control; `detail.paused` is the new value. Not fired when `paused` is set, nor for a hold.
 */
export const Carousel = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-carousel',
  elementClass: TanreiCarouselElement,
  react: React,
  events: {
    onPausedChange: 'pausedchange' as EventName<TanreiEvent<TanreiCarouselElement, CustomEvent<TanreiCarouselPausedChangeDetail>>>,
  },
});
