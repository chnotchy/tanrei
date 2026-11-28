---
'@tanrei/web': patch
---

A drag that stops before it is let go is no longer flung. Someone who drags quickly, stops on the tab, month, height or
position they want and lets go there now gets that place: a release that comes more than 40 ms after the pointer last
moved has no velocity, as on Android and in Flutter. Before, a pointer held still for up to 80 ms was still released
as a fling and went on past where it stopped. This applies to every drag that flings: the tabs, the navigation bar,
the Tab view, the calendar, the bottom and side sheets, the switch, the navigation drawer, the carousel's settle and the
image preview (its pages, its pan and its swipe down to close). A drag released while it is still moving flings as
before.
