// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiTooltip as TanreiTooltipElement, type TanreiTooltipToggleDetail } from '@tanrei/web/components/tooltip';

const TooltipElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-tooltip',
  elementClass: TanreiTooltipElement,
  react: React,
  events: {
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiTooltipElement, CustomEvent<TanreiTooltipToggleDetail>>>,
  },
});
const TooltipAttributes = { variant: ['variant', 'plain'], text: ['text', ''], headline: ['headline', ''], shortcut: ['shortcut'], placement: ['placement', 'top'], offset: ['offset', null], crossOffset: ['cross-offset', 0], arrow: ['arrow', null], inverse: ['inverse', null], describes: ['no-describe', true], open: ['open', false], showDelay: ['show-delay', null], hideDelay: ['hide-delay', null], touchTimeout: ['touch-timeout', null] } as const;
/**
 * Describes an element in a few words when a person points at it, focuses it with the keyboard or long-presses it, without taking focus or blocking anything.
 *
 * Children, by their `slot`:
 * - default — The anchor: the element the tooltip describes.
 *
 * Events:
 * - `onToggle` (`toggle`) — The tooltip opened or closed by itself (hover, focus, long-press, Escape, the touch timeout, another tooltip opening): `detail.open` (and the element's `open`) is the new value.
 */
export const Tooltip = /* @__PURE__ */ withServerAttributes(TooltipElement, 'tanrei-tooltip', TanreiTooltipElement, TooltipAttributes);
