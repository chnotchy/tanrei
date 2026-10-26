// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiMarqueeText as TanreiMarqueeTextElement, type TanreiMarqueeTextPausedChangeDetail } from '@tanrei/web/components/marquee-text';

const MarqueeTextElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-marquee-text',
  elementClass: TanreiMarqueeTextElement,
  react: React,
  events: {
    onPausedChange: 'pausedchange' as EventName<TanreiEvent<TanreiMarqueeTextElement, CustomEvent<TanreiMarqueeTextPausedChangeDetail>>>,
  },
});
const MarqueeTextAttributes = { trigger: ['trigger', 'hover-or-focus'], loop: ['loop', 'repeat'], speed: ['speed', null], startPause: ['start-pause', null], endPause: ['end-pause', null], iterations: ['iterations', null], paused: ['paused', false], playbackControl: ['playback-control', false], playLabel: ['play-label', ''], pauseLabel: ['pause-label', ''] } as const;
/**
 * One line of text that does not fit its place and, while its trigger holds, moves sideways at a steady pace to show all of it, resting at its start between passes; at rest it is cut with an ellipsis.
 *
 * Children, by their `slot`:
 * - default — The text: plain text, or inline content (a bold run, an inline mark).
 *
 * Events:
 * - `onPausedChange` (`pausedchange`) — The person paused or played the motion with the playback control; `detail.paused` is the new value. Not fired when `paused` is set.
 */
export const MarqueeText = /* @__PURE__ */ withServerAttributes(MarqueeTextElement, 'tanrei-marquee-text', TanreiMarqueeTextElement, MarqueeTextAttributes);
