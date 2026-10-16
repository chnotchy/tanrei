// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { TanreiChip as TanreiChipElement, type TanreiChipChangeDetail } from '@tanrei/web/components/chip';

/**
 * Shows a compact choice, a suggested action or an item the user entered as a small labelled control.
 *
 * Children, by their `slot`:
 * - `icon` — The leading icon: a glyph of the system's icon set (its ligature text), or an `<svg>` or `<img>`. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * - `avatar` — The leading image of an input chip (an `<img>`), in place of the icon. Ignored for other kinds.
 *
 * Events:
 * - `onChange` (`change`) — A filter chip was activated; fired after its `click`, as a native checkbox does. `detail.selected` (and the element's `selected`) is the new value.
 * - `onRemove` (`remove`) — The user asked to remove an input chip, with its remove action or with Backspace or Delete. The chip stays until the page removes it.
 */
export const Chip = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-chip',
  elementClass: TanreiChipElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiChipElement, CustomEvent<TanreiChipChangeDetail>>>,
    onRemove: 'remove' as EventName<TanreiEvent<TanreiChipElement>>,
  },
});
