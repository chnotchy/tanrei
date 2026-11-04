// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiTab as TanreiTabElement } from '@tanrei/web/components/tabs';

const TabElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-tab',
  elementClass: TanreiTabElement,
  react: React,
  events: {},
});
const TabAttributes = { value: ['value', ''], label: ['label', ''], icon: ['icon', ''], labelHidden: ['label-hidden', false], disabled: ['disabled', false] } as const;
/**
 * One tab of a row — the spec's item kind `tab`: a label, an optional icon, and the value that selects it. Placed as a child of `<tanrei-tabs>`, as `<option>` in a `<select>`; the row decides whether it is selected, which tab is the Tab stop, and answers its activation.
 */
export const Tab = /* @__PURE__ */ withServerAttributes(TabElement, 'tanrei-tab', TanreiTabElement, TabAttributes);
