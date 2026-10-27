---
'@tanrei/docs': patch
---

Documentation site: guidance shown as pictures. The Guidelines of the Button, Text field, Menu, Tabs, Slider and
Navigation drawer pages show Do and Don’t pairs side by side, each a live example in the page's language
with a caption, and the Popover page explains the toggletip — a short note behind an info button, made of a Button and a
Popover — with an example.

- **The verdict is a word, a glyph and a color**, never the color alone, and each example is a picture: it takes no
  focus and is not read out, and its caption says what it shows.
- **One markup for every language.** An example is written once and shared by the six languages; only the product's
  words in it are translated.
- **A Don't is what the component refuses.** Where a component reports a mistake in a debug build — a link given
  `destructive`, an icon-only button without a name, a text field inside a field, radio items outside a group, a tab
  told to hide its label without an icon, a slider without a name, a section inside a section — the Don't is that
  mistake, and produces that report.
