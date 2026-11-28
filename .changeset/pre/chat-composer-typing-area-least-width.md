---
'@tanrei/web': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
'@tanrei/swiftui': patch
'@tanrei/react-native': patch
---

The chat composer is laid out stacked wherever its actions would leave the typing area narrower than the new
`comp.chat-composer.layout.input-min-width` (160 at the default size, growing with enlarged text), not only where the
capsule is narrower than `layout.inline-min-width`. A composer with many actions, a counter and an attachment used to
keep them all on the typing area's line and leave the text a column a few letters wide; it now puts them in the row
beneath and gives the text the capsule's width but for the send button. The counter is counted as wide as it is at
`maxLength`, so typing never changes the layout. The vocabulary gains one token (every platform's token types gain
`layoutInputMinWidth`). Pictures that move: `chat-composer/long-text` is now drawn stacked.
