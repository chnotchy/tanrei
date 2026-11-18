---
'@tanrei/web': minor
'@tanrei/react': minor
---

Progress indicator: a show delay, as the loading indicator has. From its insertion it now waits before it is drawn and
exposed, so that a task shorter than the delay shows nothing at all — no bar that flashes, no progressbar that appears
and vanishes for a screen reader. During the wait it keeps its box and is `aria-hidden`; when the wait ends it is shown
at once, with no entrance, drawing the value it has then and starting an indeterminate cycle from its beginning. The
wait is `showDelay` (`show-delay`), in milliseconds; null, the default, takes
`comp.loading-indicator.motion.show-delay` (300 ms in the default system), so the two kinds of indicator wait alike, and
0 shows it as it is inserted. The delay is kept where motion is reduced and while the indicator cannot be seen.

What changes for a product: every progress indicator it inserts now appears after the delay. Give `show-delay="0"` to
one that must be there as it is inserted. The file item's bar does so, and is drawn as before. React's
`ProgressIndicator` takes `showDelay`. SwiftUI, Compose, Flutter and React Native do not have the delay yet: they draw
and expose the indicator as it is inserted.
