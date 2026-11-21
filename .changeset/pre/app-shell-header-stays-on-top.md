---
'@tanrei/web': minor
'@tanrei/react': minor
---

**Breaking — App shell: the header stays on top, and one menu button shows and hides the navigation at every width.**
`<tanrei-app-shell>` (React `AppShell`) and a `<tanrei-navigation-drawer>` it holds:

- **The menu button is shown in every window class** while the navigation region holds a navigation drawer. In an
  expanded window it collapses a collapsible drawer to its column and widens it back, and hides and shows one that is
  not collapsible; in a medium window it widens the column over the content; in a compact one it opens the drawer, and
  a second press closes it. Its glyph does not change; `aria-expanded` says whether the navigation is shown. Before, it
  was shown only where the navigation had no place in the layout. The new `menuButtonPlacement` prop
  (`menu-button-placement`: `header`, the default, or `drawer`) keeps the former arrangement with `drawer`: the drawer's
  own first header button collapses and expands it where it has a place, and the header's button is shown only where
  it has none.
- **The open navigation is drawn below the header, and the header stays usable.** The drawer and its scrim cover only
  what lies below the header; the header is neither dimmed nor inert, and pressing it does not close the drawer. The
  frame makes the skip link, the main region, the aside, the footer and the navigation bar inert while it is open, and
  holds the page's scroll. Focus goes into the drawer as before but is no longer kept inside it: Tab moves through the
  announcement, the header and the drawer. Escape closes it while focus is in the drawer or on the menu button.
- **A drawer the frame holds is not a dialog when open.** Held by an app shell whose header slot is filled, the drawer
  is never a top-layer `<dialog>`: it stays the navigation landmark named by its `label`, and the menu button's
  `aria-expanded` and `aria-controls` tell that it is open. A drawer outside such a frame is a modal dialog as before.
- **A change of the window's class no longer closes the navigation.** Between compact and medium it stays open, its
  scrim and focus where they are; only the window becoming expanded ends the overlay (`close` and one
  `navigationopenchange` with false), and narrowing again opens nothing. Held by the frame, the drawer moves to its new
  place and form over `motion.expand` as one panel instead of being redrawn at once; the rest of the frame changes at
  once. Outside an app shell a responsive drawer keeps `open` the same way, still redrawn at once.
- **`expanded` of a responsive drawer that is not collapsible now shows (true) or hides (false) its standard
  presentation**: hidden, it takes no width and has nothing to focus. Before, it was ignored.
- **Nothing happens at the end of closing**: from the first frame of a closing nothing is inert, the scrim takes no
  press and focus is back; the last frame is the closed drawer's first, and no element is taken away or replaced.
- A collapsible modal drawer added open after the document's first paint now widens from its column (MOT-4); written
  open in the page's markup it is still drawn open at once.

Not yet: the header, the navigation and the aside are still `position: sticky`, not `fixed` (so a pulled page can still
move them past an end in an engine that moves a sticky box), and the platform's back action does not close a drawer the
frame holds. Visual baselines of the fixtures are unchanged in intent; the frames the tests build from real components
now draw the open drawer below the header.
