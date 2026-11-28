---
'@tanrei/web': patch
'@tanrei/react': patch
---

An input chip is one Tab stop. Its remove action leaves the Tab order (`tabindex="-1"`): it stays pressable by pointer, touch and assistive technology and keeps its name, and the keyboard removes the chip with Backspace or Delete on the chip itself, as before — once per press, never for the repeats of a held key. While the chip can be removed, its button announces the two keys with `aria-keyshortcuts="Delete Backspace"`; a disabled or `not-removable` chip announces none. In a tag group, Tab now goes from chip to chip, and after a removal focus goes on to the next chip, or the one before where none follows, as it already did. The chip field already took every chip out of the Tab order and is unchanged. No baseline changes: only the focus order and an ARIA attribute differ. The native platforms still have the remove action as a second stop; each follows when it catches up.
