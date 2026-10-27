// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiCard as TanreiCardElement } from '@tanrei/web/components/card';

const CardElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-card',
  elementClass: TanreiCardElement,
  react: React,
  events: {},
});
const CardAttributes = { variant: ['variant', 'outlined'], interactive: ['interactive', false], disabled: ['disabled', false], inset: ['flush', true], label: ['label', ''], href: ['href', ''], target: ['target', 'same'], targetLabel: ['target-label', ''], rel: ['rel', null], download: ['download', null] } as const;
/**
 * Sets a group of related content apart from its background, and can be one action that opens what it shows.
 *
 * Children, by their `slot`:
 * - default — The content: any layout of media, text and — only when the card is neither interactive nor a link — actions.
 */
export const Card = /* @__PURE__ */ withServerAttributes(CardElement, 'tanrei-card', TanreiCardElement, CardAttributes);
