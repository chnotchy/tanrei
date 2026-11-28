---
'@tanrei/web': minor
'@tanrei/react': minor
---

Text input: a password field can show what was typed. With `revealable`, a `type="password"` input draws a reveal
button at its end (after the clear button where there is one): a small icon-only text Button that is a toggle, showing
`visibility` while the value is hidden and `visibility_off` while it is shown, named by `revealLabel` or the product's
`revealLabel` word ("Show password" in the English pack) — one name in both states, `aria-pressed` saying which. A press
shows the value as plain text and a second hides it; the value, the caret and the selection stay, no `input` or
`change` is emitted, and focus does not move (a pointer press keeps it in the input, Enter and Space keep it on the
button). It never submits a form. New prop `revealed` (reflected) and event `revealchange` (`detail.revealed`, type
`TanreiTextInputRevealChangeDetail`). A shown value is hidden again, without the event, when its form is submitted or
reset, when the type changes and when the field is disabled. `revealable` on any other type is ignored and reported in
a debug build. The text field forwards the three props and the event, and reads `revealed` through from its input. New
part `reveal-button`, exported by the text field. New word key `revealLabel`.

New fixtures `stacked-password-revealable`, `stacked-password-revealed`, `stacked-password-revealable-clearable` and
`outlined-password-revealable` have new baselines; no existing picture changes.
