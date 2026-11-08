// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiSplitView as TanreiSplitViewElement, type TanreiSplitViewDetail } from '@tanrei/web/components/split-view';

const SplitViewElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-split-view',
  elementClass: TanreiSplitViewElement,
  react: React,
  events: {
    onResize: 'resize' as EventName<TanreiEvent<TanreiSplitViewElement, CustomEvent<TanreiSplitViewDetail>>>,
    onChange: 'change' as EventName<TanreiEvent<TanreiSplitViewElement, CustomEvent<TanreiSplitViewDetail>>>,
    onToggle: 'toggle' as EventName<TanreiEvent<TanreiSplitViewElement, CustomEvent<TanreiSplitViewDetail>>>,
  },
});
const SplitViewAttributes = { axis: ['axis', 'horizontal'], primary: ['primary', 'start'], value: ['value'], min: ['min'], max: ['max'], minSize: ['min-size', null], maxSize: ['max-size', null], step: ['step'], largeStep: ['large-step'], resetValue: ['reset-value'], collapsible: ['collapsible', false], collapsed: ['collapsed', false], label: ['label', ''], valueText: ['value-text', ''], disabled: ['disabled', false] } as const;
/**
 * Divides a region into two panes — side by side, or one above the other — with a hairline between them and a Handle on it that a person drags, steps from the keyboard or presses to give one pane more room; where `collapsible` is set, a press or Enter folds the primary pane away and brings it back.
 *
 * Children, by their `slot`:
 * - `start` — The content of the start pane: the inline-start side, or the top while axis is vertical.
 * - `end` — The content of the end pane.
 *
 * Events:
 * - `onResize` (`resize`) — The divider moved during a drag, in every frame it moves.
 * - `onChange` (`change`) — A person changed the primary pane's share: a drag ended, a key, or a press that moved the divider.
 * - `onToggle` (`toggle`) — A person folded the primary pane away or brought it back.
 */
export const SplitView = /* @__PURE__ */ withServerAttributes(SplitViewElement, 'tanrei-split-view', TanreiSplitViewElement, SplitViewAttributes);
