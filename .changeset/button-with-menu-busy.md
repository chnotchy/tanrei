---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Button with menu: `busy` and `busyLabel` (the `busy` and `busy-label` attributes on the web), as Button's, for the
leading half only. While the main action is under way the leading half keeps its size, its place in the focus order and
the person's focus, draws the loading indicator's arc in place of its label and icon (the label and the icon fade out
and back in; at once under reduced motion, where the arc pulses instead of turning), shows no hovered or pressed state,
refuses every activation, exposes `aria-disabled` and `busyLabel` as its description, and has `busyLabel` announced
once. Nothing is announced when it ends. The trailing half and its menu stay usable. On the web an empty `busyLabel`
takes the product's words (`busyLabel`), and a debug build reports a busy button with menu that has none. Disabled,
busy changes nothing.

The vocabulary grows: `comp.button-with-menu.busy.indicator.thickness`, `comp.button-with-menu.motion.busy-cycle-duration`
and `comp.button-with-menu.motion.busy-fade-duration`, aliasing Button's, in every platform's generated tokens. The
native platforms map the props and do not draw them yet; their notes say so.

On the web, Button's busy arc, fade and announcement are now a shared primitive (`src/primitives/busy.ts`) that both
components compose; Button draws and behaves as before.

New baseline owed, the intended result of this change: button-with-menu `filled-busy`. No existing baseline changes.
