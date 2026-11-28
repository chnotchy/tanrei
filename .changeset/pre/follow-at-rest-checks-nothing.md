---
'@tanrei/web': patch
---

An open overlay that follows its anchor (a tooltip, a menu and its submenus, a FAB menu, a search view, a docked
date-time picker, a popover, a select's or a combobox's list) no longer runs its placement check in every frame while
nothing moves. The follower compared a size the ResizeObserver reported with one read by `getBoundingClientRect()`,
which gives the box after its transform and, in Firefox, at another precision, so each report after observing again
counted as a change. An open plain tooltip in Firefox was checked 60 times a second for as long as it was open, as was,
in every engine, an overlay whose surface a page drew with a transform; and a menu's surface was checked in every frame
of its entrance, whose scale it read as a size. Sizes are now compared only with sizes the observer reported, and a followed element
that did not move keeps its place observer instead of having it set again.
