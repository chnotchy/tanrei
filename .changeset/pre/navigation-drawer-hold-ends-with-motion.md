---
'@tanrei/web': patch
---

Navigation drawer: when a person folds or unfolds the drawer, or gives it its default width, an app shell around it
now holds the place being read until the drawer's width motion has ended. Before, the hold ended on a page timer of
the change's duration plus 100 ms. A motion that played more slowly outlasted that timer, for example on a slowed page
or one whose first frame came late after a long task. For the rest of the motion the main content moved under the
reader: about 528 px in one frame of the fold at a quarter of its speed. A change that starts no width motion still
ends its hold in the frame after it is drawn. That covers reduced motion and a key's step.
