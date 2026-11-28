---
'@tanrei/docs': patch
'@tanrei/mcp': patch
---

Documentation site: an anatomy figure and a measure figure on the page of every component whose spec says where the
web draws its parts (32 so far), drawn over the live component in the example frame.

- The anatomy figure numbers each part the fixture draws, in the spec's order, with a leader to it; the anatomy table
  under it is its legend. A focus ring, drawn only while a control has the keyboard's focus, is shown as a dashed ring
  as far out as the component draws it.
- The measure figure draws a dimension line for each length it can show on the fixture — heights, sizes, widths, the
  container's paddings, the gap between its parts — labelled with what it is and the value its token resolves to, and
  names each token in a table under it. A line is drawn only where the component draws that length; where it draws
  another, the table says what it found instead.
- Both follow the design system chosen in the header, the scheme, the contrast and the page's direction (mirrored in
  Arabic), are drawn in the system's colors under forced colors, and hold their room before the component is defined.
  Their text alternatives are in the six languages.

Component specs: the button's and the badge's `anatomyFixture` name the fixture their anatomy figures draw — the
button with its leading icon (`filled-leading-icon`), the badge with a count (`count-single`).
