---
'@tanrei/docs': minor
---

**Docs: every component page's keyboard table is the keyboard map, and seventeen more pages show their focus order.**
The Accessibility section of every component page, in every language, draws its spec's keyboard table as the keyboard
map: each key a cap of Tanrei's Keyboard shortcut, in the reader's own keyboard convention, read in the page's
language. The plain table of hand-written `<kbd>` phrases is gone, and with it `ComponentAccessibility`'s
`keyboardMap` prop (no alias): `<ComponentAccessibility name="…" />` draws the map. The focus order figure now opens
the Accessibility section of the Accordion, Calendar, Carousel, Chip field, Combobox, Date and time picker, List,
Menubar, One-time code input, Pagination, Radio group, Rating, Segmented button, Select, Table, Tag group and Toolbar
pages, as it did on Tabs, Tree view and Slider.
