// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { TanreiMarqueeText as TanreiMarqueeTextElement, type TanreiMarqueeTextPausedChangeDetail } from '@tanrei/web/components/marquee-text';

/**
 * One line of text that does not fit its place and, while its trigger holds, moves sideways at a steady pace to show all of it, resting at its start between passes; at rest it is cut with an ellipsis.
 *
 * Children, by their `slot`:
 * - default — The text: plain text, or inline content (a bold run, an inline mark).
 *
 * Events:
 * - `onPausedchange` (`pausedchange`) — The person paused or played the motion with the playback control; `detail.paused` is the new value. Not fired when `paused` is set.
 */
export const MarqueeText = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-marquee-text',
  elementClass: TanreiMarqueeTextElement,
  react: React,
  events: {
    onPausedchange: 'pausedchange' as EventName<TanreiEvent<TanreiMarqueeTextElement, CustomEvent<TanreiMarqueeTextPausedChangeDetail>>>,
  },
});
