// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { TanreiCalendar as TanreiCalendarElement, type TanreiCalendarChangeDetail } from '@tanrei/web/components/calendar';

/**
 * Shows one month as a grid of days, in the page or inside a picker, and lets a person choose one date or one range of dates from it.
 *
 * Events:
 * - `onChange` (`change`) — The person chose a day that changes the choice. `value`, `start` and `end` are already the new ones (end empty after a start alone); `detail` holds them too.
 */
export const Calendar = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-calendar',
  elementClass: TanreiCalendarElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiCalendarElement, CustomEvent<TanreiCalendarChangeDetail>>>,
  },
});
