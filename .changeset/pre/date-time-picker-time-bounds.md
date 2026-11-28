---
'@tanrei/web': minor
'@tanrei/react': minor
---

Date-time picker: `min` and `max` now bound the time as well as the date. They take the mode's ISO form, the same form a
Text field's `min` and `max` take, so a field's `pickerRequest` can pass them straight on to the picker.

- **Forms.** `date` mode takes a date, as before. `time` mode takes a time (`09:00`). `date-time` mode takes a date and
  time (`2026-09-17T09:00`), which limits the times only on its own day, or a date alone, which limits only the dates,
  as before. A bound in any other form is ignored and reported in debug builds. So is a date given in `time` mode,
  where it had no effect before.
- **What is offered.** Only the times between the bounds can be chosen. `min` is rounded up and `max` down to
  `minuteStep`, so the picker never offers a time that its field refuses. Bounds with no time of the step between them
  are ignored and reported.
- **Out-of-range times.** Hours, minutes and periods outside the bounds keep their places on the wheels and the dial
  and are drawn faded. They are never removed, so no other value moves. Every entry mode passes over them: the arrow
  keys go on to the next available value, a wheel settles on the nearest available row, the dial takes the nearest
  available number, and a typed value outside the bounds keeps the value before.
- **The pending time.** A pending time outside the bounds moves to the nearer bound. This happens when the picker
  opens with a value or the current time outside them, when a date that is a bound's own day is chosen, and when a new
  hour or period would leave the bounds. OK then commits the moved time.
- **Assistive technology.** The spin buttons expose their first and last available values as their minimum and
  maximum.
- **New token.** `comp.date-time-picker.time.unavailable-opacity` aliases `sys.state.disabled-content-opacity`, so the
  vocabulary grows by one token. SwiftUI, Compose, Flutter and React Native do not implement the picker yet.

Snapshot baselines: two new fixtures, `modal-time-bounded` and `modal-time-dial-bounded`. No existing fixture sets a
bound in a time mode, so no existing baseline changes.
