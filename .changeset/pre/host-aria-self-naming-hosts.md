---
'@tanrei/web': minor
---

The elements whose host carries its role and names itself now hold the name a product writes on them, as a tab
does, and the last hosts the rule had left undecided are decided.

**Breaking:** where an element below names itself, your `aria-label` and `aria-labelledby` on it are held as
`data-aria-label` and `data-aria-labelledby`; where it moves your ARIA inside, select and read `data-aria-*`.

- **Its own name wins, yours is kept.** The Loading indicator, Progress indicator, Meter, Menubar and its action
  items, Toolbar and its groups, Button group, Stepper, Segmented button (the set), Navigation bar (the bar),
  Avatar and Avatar group, Swatch, a FAB menu's items, List and its options, Menu items, submenus, groups and the
  Menu, Callout and Tree view. While their own name (`label`, a callout's title or `headline`, a menu's anchor) is
  set, your `aria-labelledby` no longer takes the name from it; while it is empty, your name is the name, where
  before it was wiped at the next update. While the element shows no role (a loading indicator waiting to show, a
  decorative avatar, a closed callout or menu, a swatch drawing its text), your name is held, and given back when
  it does. A name you give counts before a debug build reports a missing one.
- **A name you give makes a named group or image.** A Button group or a Toolbar group with no `label`, and an Avatar
  or a Swatch with no name of its own, that you name are exposed as a group or an image named by your name.
- **A list option, an action or a link item is named by your name over its content** while its `label` is empty, as
  an author's `aria-label` is over content in the platform's name computation. The Button says the same of its drawn
  text, which it already did.
- **Moved in one mode.** A List item that is an action or a link, a reorderable List, and a Menu item that is a link
  move your ARIA to the element inside that carries the role, and give it back to the host when they leave that mode.
- **The Field reports your ARIA.** `tanrei-field` has no role and frames your own control: what you write on its host
  is moved, exposed on nothing and reported; write it on the control.
- **The Scroll area** exposes your ARIA on its box, and your name only while the box is a focus stop (a region); a
  name it cannot carry is reported.
- **The Table of contents' compact row** is named by the name you give the landmark and the current item it shows,
  and is no longer reported unnamed then.
