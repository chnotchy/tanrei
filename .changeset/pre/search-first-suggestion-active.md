---
'@tanrei/web': minor
---

**Breaking (behaviour).** The search now makes its first suggestion active as soon as the view shows suggestions, so a
single Enter chooses it, as a web search, a documentation search and a command palette do. This is the WAI-ARIA
combobox's list autocomplete with automatic selection. Focus stays in the input. The suggestion is selected, but the input
names it as its `aria-activedescendant` only once the person moves with an arrow key, so a screen reader does not read a
suggestion after every key typed. The suggestion becomes active
again each time the person types, deletes, pastes or moves the caret, and each time the product gives new suggestions,
the view opens, or focus comes back to the input. The first Down Arrow stays on it and has it read out; the next goes on
to the second suggestion. Up Arrow on the first
leaves none active, and Enter then emits `submit` with the query as typed.

With results and no suggestions, the first result is current while focus stays in the input. It is drawn as a focused
result, and Enter in the input activates it as Enter on the link does: `select`, then the link is followed unless
`select` was cancelled. The first Down Arrow moves focus to it, and the next ones on through the results. A result is a link, not an option, so it is never the
input's active descendant, and the status row still says what was found.

What broke: Enter in the input with suggestions or results showing no longer emits `submit` unless the person first
presses Up Arrow on the first row. A product that wants Enter to search for the typed text while suggestions show gives
that text as its first suggestion. The search does not add that row itself.

While an input method is composing, no suggestion or result is current, and Enter, Escape and the arrow keys are the
input method's: the Enter that confirms a conversion takes nothing. Escape during a composition used to close the view.
It now cancels the composition only.

The combobox already worked this way where it filters with `allowCustomValue` false: the first match is active from the
first key. With `allowCustomValue` true no option becomes active by typing, so Enter commits the text as typed. That is
unchanged.

No baseline changes. A fixture drawn in place has no focus in its input, so nothing in it is active or current.
