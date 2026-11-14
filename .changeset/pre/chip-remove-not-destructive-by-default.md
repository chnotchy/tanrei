---
'@tanrei/web': minor
'@tanrei/react': minor
---

**Breaking — Chip.** An input chip's remove action is plain by default: `destructiveRemove` now defaults to false.
The error color says that an action takes away something that may not come back, and most removals take away
something the person can put back in one step — an applied filter, a search term, an entry they can type again. Set
`destructiveRemove` where removing loses something that cannot be put back in a step, such as an attachment or a
recipient already invited.

What broke:

- An input chip that did not set the flag no longer takes the error color while its remove action is hovered,
  keyboard-focused or pressed; it paints from the variant's `remove.*` parts. At rest and disabled it looks as before.
  The chip field's entries and the input chips of a tag group follow, as they leave the flag at its default.
- On the web the attribute is now `destructive-remove` (set it to turn the look on). The inverse attribute
  `no-destructive-remove` is gone and is not read; remove it from your markup, where it is now an unknown attribute.
- React: `destructiveRemove` defaults to false; `destructiveRemove={false}` is now the default and can be dropped.

The tokens are unchanged: the `destructive-remove.*` parts stay and are read while the flag is set. SwiftUI, Compose,
Flutter and React Native, which ship the previous revision of the chip, already draw a plain remove action and do not
change.

No baseline changes: every fixture is drawn at rest, where the two looks are the same.
