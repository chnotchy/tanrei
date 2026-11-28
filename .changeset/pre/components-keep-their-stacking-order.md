---
'@tanrei/web': patch
---

A component's own stacking order no longer reaches the page. A shadow root makes no stacking context, so the
`z-index` a component gave one of its parts was ordered against the page's own levels: a Code block's copy button, an
inline Menu's submenu surface, a Carousel's controls, a Chip's remove button, a File item's action, a Navigation drawer's
edge and pinned rows, a Button group's and a Button with menu's divider and a Stepper's connector rose over a sticky
header of the product's at `z-index: 1` as the page scrolled under it, and took its clicks. Those components, and the
List, the One-time code input and the Side sheet, which lift a part the same way, now make their host a stacking context
of its own (`isolation: isolate`): their parts are ordered among themselves as before, and the component as a whole
stands in the page like any other element. Nothing moves and no color changes. What stands over the page — menus,
popovers, tooltips, snackbars, dialogs, sheets — is in the top layer, as before. The Slider's value indicator is the one
part still ordered in the page's stacking context: it must rise over the content beside the slider, and moves to the top
layer in a change of its own.
