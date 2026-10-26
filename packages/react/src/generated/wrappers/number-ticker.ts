// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiNumberTicker as TanreiNumberTickerElement, type TanreiNumberTickerSettleDetail } from '@tanrei/web/components/number-ticker';

const NumberTickerElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-number-ticker',
  elementClass: TanreiNumberTickerElement,
  react: React,
  events: {
    onSettle: 'settle' as EventName<TanreiEvent<TanreiNumberTickerElement, CustomEvent<TanreiNumberTickerSettleDetail>>>,
  },
});
const NumberTickerAttributes = { value: ['value', 0], numberStyle: ['number-style', 'decimal'], currency: ['currency', ''], unit: ['unit', ''], notation: ['notation', 'standard'], fractionDigits: ['fraction-digits', null], signDisplay: ['sign-display', 'auto'], locale: ['locale', ''], trend: ['trend', 'auto'], animation: ['animation', 'auto'], startValue: ['start-value', null], duration: ['duration', null], live: ['live', 'off'], label: ['label', ''] } as const;
/**
 * Shows a number that changes — a count, a price, a score, a figure on a dashboard — by moving each changed digit to its new value, so that a person sees that it changed, which way and roughly by how much, while assistive technology is told only the value it settles on.
 *
 * Events:
 * - `onSettle` (`settle`) — The digits came to rest at `value`: once at the end of each change's motion (at once where there is none). `detail.value` is the value.
 */
export const NumberTicker = /* @__PURE__ */ withServerAttributes(NumberTickerElement, 'tanrei-number-ticker', TanreiNumberTickerElement, NumberTickerAttributes);
