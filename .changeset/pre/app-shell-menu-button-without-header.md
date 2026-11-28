---
'@tanrei/web': minor
'@tanrei/react': minor
---

**App shell: a frame without a header keeps its menu button at the top of the window.** `<tanrei-app-shell>` (React
`AppShell`) has a new `menu-button` slot for a frame whose header region is empty:
`<tanrei-button slot="menu-button" variant="text" label="Menu">…</tanrei-button>`.

- The button is shown only where the navigation has no place in the layout (as `menu-button-placement="drawer"` shows
  the header's, whatever that attribute says); in the column and beside the content the drawer runs from the top of
  the frame and its own first header button stands for it.
- Shown, it stands alone at the top start corner — the window class's gutter (`comp.app-shell.gutter.*`) from the top,
  inside the top inset, and from the start edge — with no band, fill or edge around it, and the main region begins
  below it. It stays at that place while the page scrolls under it (`position: sticky`), drawn over every region as a
  sticky header is, and its gutter and height are the frame's scroll offset, so a link's target and a focused element
  rest below it.
- It adds no landmark and is reached in the header's place in the order of focus. The drawer it opens is the modal
  dialog it is outside a frame: over the whole window from its top edge, the button under its scrim, focus kept inside
  until it closes and then returned to the button.
- With a header, what the `menu-button` slot holds is not shown, and a debug build reports it.
- `comp.app-shell.gutter.*`'s description now names this inset; its values do not change.

The web does not yet hold the button still when the page is pulled past an end (overscroll), as it does not the header,
the navigation or the aside: they are all `position: sticky`.

The app shell's module grows by about 230 bytes gzip (17.2 kB); its bundle budget is raised from 17,100 to 18,100 bytes
for this placement, which is the only way a frame without a header can open its navigation in a narrow window.

New fixtures: `compact-no-header` and `expanded-no-header`.
