// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { type Marked, withMarks } from '../../marks.js';
import { withServerAttributes } from '../../server.js';
import { TanreiButton as TanreiButtonElement, type TanreiButtonChangeDetail } from '@tanrei/web/components/button';

/** The attributes of `<tanrei-button>` that are not properties of the element, as props of `Button`. */
export interface ButtonMarks {
  /** A mark for the component that places this button as an action (a button group, a dialog, a popover, a side sheet): the action completes the task, and is placed at the end of a row and at the top of a column (BGR-13, BGR-14). Read by that component as an attribute; the button draws nothing for it and has no property of the name. */
  confirming?: boolean;
  /** The same mark for the action that backs out of the task: placed at the start of a row and at the bottom of a column. With `confirming` as well, the button is placed as one with neither (BGR-18). */
  dismissive?: boolean;
  /** The id of the form the button belongs to, where it stands outside it (a dialog's actions, a page header): the platform's own attribute, which then wins over a form around the button (BTN-29). The `form` property is read-only and returns the form element. */
  form?: string;
}

const ButtonElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-button',
  elementClass: TanreiButtonElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiButtonElement, CustomEvent<TanreiButtonChangeDetail>>>,
  },
});
const withButtonMarks = /* @__PURE__ */ withMarks<ButtonMarks>(['confirming', 'dismissive'], ['form']);
const ButtonAttributes = { variant: ['variant', 'filled'], destructive: ['destructive', false], size: ['size', 'medium'], width: ['width', 'default'], fullWidth: ['full-width', false], iconPosition: ['icon-position', 'leading'], toggle: ['toggle', false], selected: ['selected', false], disabled: ['disabled', false], focusableWhenDisabled: ['focusable-when-disabled', false], busy: ['busy', false], busyLabel: ['busy-label', ''], label: ['label', ''], type: ['type', 'button'], name: ['name', ''], value: ['value', ''], href: ['href', ''], target: ['target', 'same'], targetLabel: ['target-label', ''], rel: ['rel', null], confirming: ['confirming', false], dismissive: ['dismissive', false], form: ['form'] } as const;
/**
 * Lets people take an action, or switch something on and off, with one tap or click — named by a label, an icon, or both.
 *
 * Children, by their `slot`:
 * - default — Label content: the text that names the action. Leave it empty for an icon-only button.
 * - `icon` — The icon: a glyph of the system's icon set (its ligature text), or a `.tanrei-icon`, `<svg>` or `<img>`. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 *
 * Events:
 * - `onChange` (`change`) — A toggle was activated; fired after its `click`. `detail.selected` (and the element's `selected`) is the new value.
 */
export const Button: Marked<typeof ButtonElement, ButtonMarks> = /* @__PURE__ */ withServerAttributes(/* @__PURE__ */ withButtonMarks(ButtonElement), 'tanrei-button', TanreiButtonElement, ButtonAttributes);
