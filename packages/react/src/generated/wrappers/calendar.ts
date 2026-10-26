// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiCalendar as TanreiCalendarElement, type TanreiCalendarChangeDetail } from '@tanrei/web/components/calendar';

const CalendarElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-calendar',
  elementClass: TanreiCalendarElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiCalendarElement, CustomEvent<TanreiCalendarChangeDetail>>>,
  },
});
const CalendarAttributes = { mode: ['mode', 'single'], value: ['value', ''], start: ['start', ''], end: ['end', ''], min: ['min', ''], max: ['max', ''], disabledDates: ['disabled-dates'], today: ['today', ''], firstDayOfWeek: ['first-day-of-week', 'locale'], locale: ['locale', ''], startView: ['start-view', 'day'], showAdjacentDays: ['show-adjacent-days', false], label: ['label', ''], startLabel: ['start-label', ''], endLabel: ['end-label', ''], previousMonthLabel: ['previous-month-label', ''], nextMonthLabel: ['next-month-label', ''], yearViewLabel: ['year-view-label', ''], todayLabel: ['today-label', ''] } as const;
/**
 * Shows one month as a grid of days, in the page or inside a picker, and lets a person choose one date or one range of dates from it.
 *
 * Events:
 * - `onChange` (`change`) — The person chose a day that changes the choice. `value`, `start` and `end` are already the new ones (end empty after a start alone); `detail` holds them too.
 */
export const Calendar = /* @__PURE__ */ withServerAttributes(CalendarElement, 'tanrei-calendar', TanreiCalendarElement, CalendarAttributes);
