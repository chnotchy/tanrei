---
'@tanrei/web': minor
---

The search's first suggestion, made active as soon as the suggestions show, is no longer read out after every key the
person types. It is selected, and Enter still chooses it, but the input names it as its `aria-activedescendant` only
once the person moves with an arrow key (the Down Arrow that opens the view counts). From then on, each suggestion an
arrow key moves to is read, as before. The first Down Arrow no longer skips it: it stays on that suggestion and has it
read, and the next goes on to the second; with results and no suggestions, the first Down Arrow moves focus to the first
result rather than the second. This is what the WAI-ARIA list autocomplete example and GitHub's combobox navigation do.

On an on-screen keyboard nothing is made active by itself any more, neither the first suggestion nor the first result:
the keyboard's Search or Go key submits the query as typed, as a search field on a phone does, and the person touches the
suggestion they want. The search counts the keyboard as on-screen when a touch or a pen gave the input focus, and as a
hardware keyboard again after an arrow key, Home, End or a mouse press on the input.

Each suggestion's option now has an id of its own element instead of one by its place in the list, so suggestions the
product replaces are new options to a screen reader, and one the product moves keeps its id.
