---
'@tanrei/studio': minor
'@tanrei/docs': minor
---

**Theme Studio previews the layer on five screens built from Tanrei's components.** The preview no longer shows a
button and a few samples: it draws an **overview** of every kind of component (with the system's own text styles,
icons, intents, steps and the layer's own tokens), a **dashboard**, a **settings form**, a **list and its detail**, and
a **documentation page**, chosen from the preview's bar. Every component on them follows the layer, and the overview
draws one sample per variant and size a component declares — buttons, cards, tabs, chips, tags, callouts — a variant
or a size the layer adds included. The screens' text is a product's, in each of the Studio's six languages, with
numbers, money and dates formatted for the language.

- **How it is seen.** Light, dark, or the two side by side (one large pane by default), and the three contrast levels as
  the documentation's header offers them. None of it is the layer's: it is remembered in this browser and never saved
  in the file. A screen is drawn once, and switching screens or modes moves what exists.
- **What a setting reaches.** `highlight(ids)` outlines, for a moment, the parts of the screen that read any of these
  tokens or a token that follows one of them, and says how many there are; `clearHighlight()` takes the outline off.
  It is there for the Studio's controls to call while one is hovered or focused (`ctx.highlight`), and for a script
  (`window.tanreiStudio.highlight`).
- The host loads `@tanrei/web/table.css` and `@tanrei/web/prose.css` with the Studio's other stylesheets: the screens
  hold a table and a page of text (the standalone app and the docs page do).

**Breaking (Studio dictionaries).** A language file gains `screens` and loses the old card sample's words
(`sample.cardTitle`, `cardBody`, `link`, `cancel`, `save`).
