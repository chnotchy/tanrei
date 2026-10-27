// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiDateTimePicker as TanreiDateTimePickerElement, type TanreiDateTimePickerChangeDetail, type TanreiDateTimePickerCloseDetail } from '@tanrei/web/components/date-time-picker';

const DateTimePickerElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-date-time-picker',
  elementClass: TanreiDateTimePickerElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiDateTimePickerElement, CustomEvent<TanreiDateTimePickerChangeDetail>>>,
    onClose: 'close' as EventName<TanreiEvent<TanreiDateTimePickerElement, CustomEvent<TanreiDateTimePickerCloseDetail>>>,
  },
});
const DateTimePickerAttributes = { open: ['open', false], presentation: ['presentation', 'modal'], mode: ['mode', 'date'], range: ['range', false], value: ['value', ''], start: ['start', ''], end: ['end', ''], min: ['min', ''], max: ['max', ''], disabledDates: ['disabled-dates'], today: ['today', ''], firstDayOfWeek: ['first-day-of-week', 'locale'], locale: ['locale', ''], startView: ['start-view', 'day'], showAdjacentDays: ['show-adjacent-days', false], hourCycle: ['hour-cycle', 'locale'], minuteStep: ['minute-step', 1], entryMode: ['entry-mode', 'wheels'], unit: ['unit', 'hour'], layout: ['layout', 'auto'], label: ['label', ''], dateLabel: ['date-label', ''], startLabel: ['start-label', ''], endLabel: ['end-label', ''], confirmLabel: ['confirm-label', ''], cancelLabel: ['cancel-label', ''], previousMonthLabel: ['previous-month-label', ''], nextMonthLabel: ['next-month-label', ''], yearViewLabel: ['year-view-label', ''], todayLabel: ['today-label', ''], hourLabel: ['hour-label', ''], minuteLabel: ['minute-label', ''], wheelsLabel: ['wheels-label', ''], dialLabel: ['dial-label', ''], entryModeLabel: ['entry-mode-label', ''], periodLabel: ['period-label', ''], rangeLabel: ['range-label', ''], nextDayLabel: ['next-day-label', ''], rangeErrorText: ['range-error-text', ''], anchor: ['anchor', ''], opener: ['opener', ''], inline: ['inline', false] } as const;
/**
 * Lets a person choose a date, a time, or a date and time — or a span of any of them — from a Calendar and time wheels or a clock dial, in a dialog or in a surface that drops down from a field.
 *
 * Events:
 * - `onChange` (`change`) — The person committed a choice that differs from the one before (OK, or choosing a date in a docked picker that sets a date only). `value`, `start` and `end` are already the new ones; `detail` holds them too. Fired before the `close` it causes.
 * - `onClose` (`close`) — The picker asks to be closed: `detail.reason` is `escape`, `back`, `outside`, `tab`, `focus-out`, `cancel`, `confirm` or `select`. Set `open` to false.
 */
export const DateTimePicker = /* @__PURE__ */ withServerAttributes(DateTimePickerElement, 'tanrei-date-time-picker', TanreiDateTimePickerElement, DateTimePickerAttributes);
