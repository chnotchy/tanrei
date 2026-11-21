---
'@tanrei/web': patch
---

Text input, embedded text input and one-time-code input: what an input method commits is taken when its composition
ends, and what the browser reports for it afterwards is told by what it is, never by a timer. A browser handles input
before timers on a busy page, and until the timer ran:

- in a date, time or date-time field, the next composition began on the segment just filled, so its digits went there
  or were lost (a month committed as ０９ and a day as ２７ could give 07 and an empty day, or 09 and an empty day), and
  a digit typed straight after a commit was lost;
- the first key pressed after a commit — Backspace, an arrow or Enter, in a date field's segments and a one-time-code
  input, and Enter in an embedded text input — did nothing, also after a composition committed by picking a candidate
  with the pointer, where no key had committed it.

The key that commits a composition is still the input method's where the browser reports it only after the end (with
the platform's mark of such a key, or pressed no later than the end), and a composition's last `input`, which one
browser sends after the end, is still not an edit of its own.
