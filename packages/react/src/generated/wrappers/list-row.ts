// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiListRow as TanreiListRowElement } from '@tanrei/web/components/list-row';

const ListRowElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-list-row',
  elementClass: TanreiListRowElement,
  react: React,
  events: {},
});
const ListRowAttributes = { headline: ['headline', ''], overline: ['overline', ''], supportingText: ['supporting-text', ''], supportingLines: ['supporting-lines', 1], leadingIcon: ['leading-icon', ''], trailingText: ['trailing-text', ''], trailingIcon: ['trailing-icon', ''], density: ['density', 'regular'] } as const;
/**
 * One row of text with something before it and something after it: an overline, a headline and a line or two of supporting text; a glyph, an avatar, a picture or a control at its start; a short value, a control and a glyph at its end. Placed as the direct child of a `<tanrei-list-item>`, which tells it what the item is, or standing alone.
 *
 * Children, by their `slot`:
 * - `leading` — Content at the row's start in place of `leading-icon`: an avatar, a picture, or — while the row is static — a checkbox, a radio button or a switch. Drawn at its own size, given no style.
 * - `trailing` — Content at the row's end, after the trailing text and before the trailing glyph: a badge, or — while the row is static — a switch, a checkbox or an icon-only Button.
 */
export const ListRow = /* @__PURE__ */ withServerAttributes(ListRowElement, 'tanrei-list-row', TanreiListRowElement, ListRowAttributes);
