// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiLoadingIndicator as TanreiLoadingIndicatorElement } from '@tanrei/web/components/loading-indicator';

const LoadingIndicatorElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-loading-indicator',
  elementClass: TanreiLoadingIndicatorElement,
  react: React,
  events: {},
});
const LoadingIndicatorAttributes = { size: ['size', 'medium'], contained: ['contained', false], label: ['label', ''], showDelay: ['show-delay', null], entrance: ['entrance', 'auto'], enterDuration: ['enter-duration', null] } as const;
/**
 * Shows that a short wait of unknown length is under way, inline or over content.
 */
export const LoadingIndicator = /* @__PURE__ */ withServerAttributes(LoadingIndicatorElement, 'tanrei-loading-indicator', TanreiLoadingIndicatorElement, LoadingIndicatorAttributes);
