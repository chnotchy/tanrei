// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiMeter as TanreiMeterElement } from '@tanrei/web/components/meter';

const MeterElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-meter',
  elementClass: TanreiMeterElement,
  react: React,
  events: {},
});
const MeterAttributes = { variant: ['variant', 'linear'], size: ['size', 'medium'], separation: ['separation', 'auto'], status: ['status', 'default'], value: ['value', 0], min: ['min', 0], max: ['max', 1], label: ['label', ''], valueText: ['value-text', ''] } as const;
/**
 * Shows where a known value stands in a known range — storage used, a battery's charge, a quota, the strength of a password — as a bar or a ring that looks like the progress indicator, without saying that anything is under way.
 */
export const Meter = /* @__PURE__ */ withServerAttributes(MeterElement, 'tanrei-meter', TanreiMeterElement, MeterAttributes);
