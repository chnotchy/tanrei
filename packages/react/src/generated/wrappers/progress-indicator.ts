// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiProgressIndicator as TanreiProgressIndicatorElement } from '@tanrei/web/components/progress-indicator';

const ProgressIndicatorElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-progress-indicator',
  elementClass: TanreiProgressIndicatorElement,
  react: React,
  events: {},
});
const ProgressIndicatorAttributes = { variant: ['variant', 'linear'], size: ['size', 'medium'], separation: ['separation', 'auto'], value: ['value', null], min: ['min', 0], max: ['max', 1], label: ['label', ''], valueText: ['value-text', ''] } as const;
/**
 * Shows how far a task has come, or that it is under way when how far is unknown, as a bar or a ring.
 */
export const ProgressIndicator = /* @__PURE__ */ withServerAttributes(ProgressIndicatorElement, 'tanrei-progress-indicator', TanreiProgressIndicatorElement, ProgressIndicatorAttributes);
