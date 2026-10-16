// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { TanreiTooltip as TanreiTooltipElement, type TanreiTooltipToggleDetail } from '@tanrei/web/components/tooltip';

/**
 * Describes an element in a few words when a person points at it, focuses it with the keyboard or long-presses it, without taking focus or blocking anything.
 *
 * Children, by their `slot`:
 * - default — The anchor: the element the tooltip describes.
 *
 * Events:
 * - `onToggle` (`toggle`) — The tooltip opened or closed by itself (hover, focus, long-press, Escape, the touch timeout, another tooltip opening): `detail.open` (and the element's `open`) is the new value.
 */
export const Tooltip = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-tooltip',
  elementClass: TanreiTooltipElement,
  react: React,
  events: {
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiTooltipElement, CustomEvent<TanreiTooltipToggleDetail>>>,
  },
});
