// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiCallout as TanreiCalloutElement } from '@tanrei/web/components/callout';

const CalloutElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-callout',
  elementClass: TanreiCalloutElement,
  react: React,
  events: {
    onDismiss: 'dismiss' as EventName<TanreiEvent<TanreiCalloutElement>>,
  },
});
const CalloutAttributes = { headline: ['headline', ''], status: ['status', 'default'], statusLabel: ['status-label', ''], variant: ['variant', 'tonal'], size: ['size', 'medium'], live: ['live', false], closable: ['closable', false], closeLabel: ['close-label', ''], open: ['open', true] } as const;
/**
 * A notice that is part of the content and stays there, as a quiet fill or an outline, in a status's colors with its glyph. A note, a caution, the reason for something or a summary of what is wrong, in the flow of the page, with an optional title, actions and a close button.
 *
 * Children, by their `slot`:
 * - default — The body: text, or the product's own blocks (paragraphs, lists, a table, a code block, any component). Text placed directly takes the callout's text style and color; long-form blocks go in a `<div class="tanrei-prose" data-measure="false">` (with `data-size="large"` in a large callout).
 * - `icon` — A glyph of the system's icon set (its ligature text, in an element), drawn in place of the status glyph, or as the glyph of a callout without a status. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * - `title` — The product's own title content in place of `headline`: text with inline content, or a heading of the level the page's outline needs. It is drawn in the title's style; its role and its level are not changed.
 * - `actions` — The product's own Buttons or links, one or two, laid out in a row below the text.
 *
 * Events:
 * - `onDismiss` (`dismiss`) — The person closed the callout with its close button. Fired once, after `open` became false; never when the product sets `open`.
 */
export const Callout = /* @__PURE__ */ withServerAttributes(CalloutElement, 'tanrei-callout', TanreiCalloutElement, CalloutAttributes);
