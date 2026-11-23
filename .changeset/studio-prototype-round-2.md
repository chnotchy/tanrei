---
'@tanrei/studio': minor
---

**Theme Studio, closer to its approved design.**

- **The overview draws each kind of component as a product uses it**, in compact panels, in reading order across
  as many columns as the preview's own width gives each a readable one — the notice's headline on one line, the card's
  sentence in at most two; a form's actions may take a second row — up to three: two beside the rail and the editing
  panel in a window 1440px wide, three from about 1700px, one on a phone. A form's actions (Save,
  Save draft, Cancel, Details) and a row of icon buttons; a field and a select; the selection controls; the period tabs, chips and status tags; a notice with a progress bar and two people; a card; a
  menu. A variant the layer, or the system it starts from, adds is drawn in its component's panel beside them; the
  Button's sizes, one at each size the system declares, stand with what the system is made of under the panels. The
  overview no longer draws every variant of every component.
- **Each row of the rail, and each item after them, ends in a chevron**: it opens its controls. The Size row draws
  the height glyph, Press feedback and Focus a glyph of their own whatever they hold, and what a row holds is said in
  the Studio's language: the press feedback and the focus style by their words for the vocabulary's choices (オーバーレイ,
  リング…), while the panel where one is chosen lists the vocabulary's names.
- **A rail row's value is shown whole**: a long one wraps under the row's name instead of being cut, an icon set is
  named by its style beside its weight ("Rounded · 300"), and the brand color's "none" is shorter in Japanese.
- **The Size and Corners panels name each number by what it does**: the token ids under the names (`dial.control.height`,
  `sys.target.minimum`…) are gone from the panels the rail's rows open, and stay in Dials, Inspect and Export.
- **The editing panel is as wide as a design tool's property panel**: 20rem at every window (it was 30% of the window,
  up to 30rem), so that a wider window gives its room to the preview; the handle still widens it. At that width a
  number stands under its row's name, token id and note instead of beside them; a palette's choice, reset and
  removal go under its name, a fixed tone's color takes a row of its own, and the button that declares a palette
  goes under its reason. Two hints are shorter so that they fit their fields there: the family field's ("e.g. IBM
  Plex Sans") and the reason a vocabulary addition asks for ("Why this product needs it").
- **The dashboard's four figures** stand in one row where each has room for its largest amount, else in two rows of
  two (never three and one left alone), else one under another; the three figures under a list's selection in one
  row or in a column. They follow the width of the content they stand in, not the window's. The dashboard's table of
  orders no longer breaks a customer's name one character to a line in a narrow pane: it scrolls sideways in its box.
- **On a phone the bar is one line**: undo and redo, Inspect, Share and Export show their glyphs alone, named by
  their labels, and the start point the start's name; reset, the shuffle and the checks' count are left out there (the
  checks are Export's first line, and the rail's Accessibility). Every control of the bar that shows a glyph alone has
  a tooltip. The documentation's Studio page puts its link to the page about the tool beside the tool's name, as a
  glyph, and on a phone shows its brand as the mark. The preview no longer grows wider than a phone's window when the
  screens' tabs do not fit it.
- **Inspect opens as a modal side sheet over the Studio**, as Export does, as the approved design draws it: under its
  head, the line that says it is the file and the tokens it settles, its two tabs — **Tokens** and **JSON** (was
  *Source*) — and at its foot a way on to Export. It is wide enough for the token tree and the editor side by side; the
  panel keeps its row (and its width) under it, and closing it goes back there. The draft's badge says "The JSON has
  invalid edits", and its help no longer speaks of "levels", in the six languages; the hint of a pin's reason is
  shorter, so that it fits the sheet on a phone.
