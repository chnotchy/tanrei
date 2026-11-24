---
'@tanrei/web': patch
---

**`<tanrei-search>`: a result's headline and excerpt are checked for contrast.** A result's control — its own `<a>` or
`<button>`, slotted over the whole row as the hit area — lay above the text, so axe's `color-contrast` rule left the
headline and the excerpt incomplete ("overlapped by another element"). The text is now drawn above the control and lets a
press through to it, as before; nothing a result draws or answers changes.
