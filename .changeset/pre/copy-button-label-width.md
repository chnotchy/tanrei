---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Copy button: `labelWidth` (`label-width` on the web), `widest` or `fit`. `widest`, the default and the behaviour until
now, keeps the labelled form as wide as the widest of its three texts, so nothing beside it moves when its words change.
`fit` makes it as wide as the text it shows and eases the width to the new text over two new tokens,
`comp.copy-button.motion.resize-duration` and `resize-easing` (aliases of the standard default-spatial spring, as the
main action button's resize), at once where motion is reduced (CPY-19). The vocabulary grows by those two tokens; the
native platforms carry them in their generated tokens and owe the prop when they build the copy button. One new
baseline, `labelled-fit`; no other image changes.
