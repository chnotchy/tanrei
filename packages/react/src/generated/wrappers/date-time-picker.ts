// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { TanreiDateTimePicker as TanreiDateTimePickerElement, type TanreiDateTimePickerChangeDetail, type TanreiDateTimePickerCloseDetail } from '@tanrei/web/components/date-time-picker';

/**
 * Lets a person choose a date, a time, or a date and time — or a span of any of them — from a Calendar and time wheels or a clock dial, in a dialog or in a surface that drops down from a field.
 *
 * Events:
 * - `onChange` (`change`) — The person committed a choice that differs from the one before (OK, or choosing a date in a docked picker that sets a date only). `value`, `start` and `end` are already the new ones; `detail` holds them too. Fired before the `close` it causes.
 * - `onClose` (`close`) — The picker asks to be closed: `detail.reason` is `escape`, `back`, `outside`, `tab`, `focus-out`, `cancel`, `confirm` or `select`. Set `open` to false.
 */
export const DateTimePicker = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-date-time-picker',
  elementClass: TanreiDateTimePickerElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiDateTimePickerElement, CustomEvent<TanreiDateTimePickerChangeDetail>>>,
    onClose: 'close' as EventName<TanreiEvent<TanreiDateTimePickerElement, CustomEvent<TanreiDateTimePickerCloseDetail>>>,
  },
});
