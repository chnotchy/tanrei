---
'@tanrei/web': minor
'@tanrei/react': minor
---

Button: three additions to its surface, each in the spec first. `busy` (with `busy-label`) keeps a button focused, in
the focus order and at its size while its action is under way: it draws the loading indicator's arc in place of its
label, refuses every press (a submit button cannot send its form twice, and stops Enter in the form), and announces
`busy-label` once. `focusable-when-disabled` keeps a disabled button reachable by Tab, drawn and announced as
disabled, so a person can learn why it does nothing. The `inline` variant is an action inside a sentence: no container
and no inset, the text's own font and line height, the link color and the system's underline for links, and a target
the size of its text. New tokens: `comp.button.inline.*`, `comp.button.busy.indicator.thickness` and
`comp.button.motion.busy-cycle-duration`, which alias the link and the loading indicator. Theme Studio's sentence
"Groups · Every token · Source" and the docs hero's minimal action use the inline variant. New baselines: button
`filled-busy`, `text-icon-busy`, `filled-disabled-focusable` and `inline`.

Medium and high contrast: the hairline (`sys.color.outline-variant`, an outlined button's edge and a divider's line)
is raised to 3:1 and 4.5:1 against every surface in the default system, and `outline` stays the stronger of the two.
The build now holds that, for the default system. Standard contrast is unchanged.

Copy button: the icon-only form also shows "Copied" or "Could not copy" above the button, drawn as a plain tooltip,
for as long as its confirmation lasts. The bubble takes no focus, closes with Escape, and is not read a second time.

Interactive card: a press no longer selects the card's text or starts a drag of it, as on every other pressable part.

Link: a standalone link takes its label's own direction (its first strong character's, written as `dir` by the script where the page gave none),
so in right-to-left text a left-to-right label has its arrow, its new-tab mark and its glyphs at the ends of its own
words, unmirrored. A phrase in a sentence does the same when the page marks it with `dir`.

Link card: a host label that mixes Han with a Latin letter outside ASCII is shown in its ASCII (`xn--`) form, as
Chromium shows it.
