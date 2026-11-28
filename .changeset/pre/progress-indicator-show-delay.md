---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
'@tanrei/docs': patch
---

Progress indicator: a show delay, as the loading indicator has. From its insertion it now waits before it is drawn and
exposed, so that a task shorter than the delay shows nothing at all — no bar that flashes, no progressbar that appears
and vanishes for a screen reader. During the wait it keeps its box and is `aria-hidden`; when the wait ends it is shown
at once, with no entrance, drawing the value it has then and starting an indeterminate cycle from its beginning. The
wait is `showDelay` (`show-delay`), in milliseconds; null, the default, takes the new token
`comp.progress-indicator.motion.show-delay`, which aliases `sys.motion.role.show-delay` as the loading indicator's does
(300 ms in the default system), so the two kinds of indicator wait alike unless a design system sets one apart, and 0
shows it as it is inserted. The vocabulary grows by that one token. The delay is kept where motion is reduced and while the indicator cannot be seen.

What changes for a product: every progress indicator it inserts now appears after the delay. Give `show-delay="0"` to
one that must be there as it is inserted. The file item's bar does so, and is drawn as before. React's
`ProgressIndicator` takes `showDelay`. SwiftUI, Compose, Flutter and React Native carry the new token in their
generated tokens but do not have the delay yet: they draw and expose the indicator as it is inserted. The progress
indicator's docs page, in the six languages, has a section on the show delay, and its note on the lagging platforms
says they do not have it yet.
