// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiKeyboardShortcut as TanreiKeyboardShortcutElement } from '@tanrei/web/components/keyboard-shortcut';

const KeyboardShortcutElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-keyboard-shortcut',
  elementClass: TanreiKeyboardShortcutElement,
  react: React,
  events: {},
});
const KeyboardShortcutAttributes = { keys: ['keys'], variant: ['variant', 'keycap'], size: ['size', 'medium'], convention: ['convention', 'auto'], label: ['label', ''], disabled: ['disabled', false] } as const;
/**
 * Shows the keys that perform a command, as keys or as text, in the modifier symbols and names of the keyboard the person is using, read aloud in the product's own words.
 */
export const KeyboardShortcut = /* @__PURE__ */ withServerAttributes(KeyboardShortcutElement, 'tanrei-keyboard-shortcut', TanreiKeyboardShortcutElement, KeyboardShortcutAttributes);
