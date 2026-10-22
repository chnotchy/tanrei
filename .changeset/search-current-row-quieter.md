---
'@tanrei/web': minor
---

The search's first suggestion, made active as soon as the suggestions show, is no longer read out after every key the
person types. It is selected, and Enter still chooses it, but the input names it as its `aria-activedescendant` only
once the person moves with an arrow key (the Down Arrow that opens the view counts). From then on, each suggestion an
arrow key moves to is read, as before. This is what the WAI-ARIA list autocomplete example and GitHub's combobox
navigation do.
