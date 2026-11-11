---
'@tanrei/docs': minor
---

**Docs: a focus order figure and a keyboard map on the Tabs, Tree view, Slider and Menu pages.** The Accessibility
section of the Tabs, Tree view and Slider pages starts with a figure of the component's focus order: the live
component, drawn from one of its fixtures, with a number on each element the Tab key stops at, in the order it reaches
them — computed from the elements as they stand (shadow roots, slots, `tabindex`, disabled and inert elements, a roving
`tabindex`), and said in words in the caption for assistive technology. The component is live, so a reader can press
Tab and follow the numbers. On those pages and the Menu page, the keyboard table is drawn as a keyboard map: each key
of the spec's phrase is a cap of Tanrei's Keyboard shortcut, in the reader's own keyboard convention, read in the
page's language, with the spec's other words and the action beside it. Every key has a name in the six languages (the
glossary's new "Key names" table). The column header string `keys` of the docs' dictionary is now `keysColumn`, and
`keys` holds the key names.
