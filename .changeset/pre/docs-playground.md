---
'@tanrei/docs': patch
---

Documentation site: the pages of Button, Text field, Slider and Tabs have a playground — the live component in the one
frame, with a control under it for each property a reader can set on the web element.

- **Controls from the spec.** A choice of up to four values is a Segmented button, a longer one a Select, a flag a
  Switch, a number a Number field and a text a Text field, each named by its property. A control writes only an
  attribute the web package's manifest says the element reads; a property the element takes by property alone has no
  control.
- **The code follows.** The frame's code, in HTML or in React, is the element with what the controls set, and nothing
  that is the spec's default. An attribute that turns off a property that is on by default (a card's `flush`) is now
  written in React as that property, false (`inset={false}`), in every example's code.
- **The address keeps it.** What differs from where the playground started is kept in the page's address
  (`#play-button=variant:tonal,size:large`), so a link opens the playground as it was left; a reset button takes every
  control back.
- **Nothing moves as the page loads.** The stage and the controls hold their room before anything is defined, and the
  controls are defined with the stage, when the frame comes near the view.
- The code is the web's. For the other platforms the caption links to the spec's platform name mapping, which now has
  an anchor (`#platform-names`).
