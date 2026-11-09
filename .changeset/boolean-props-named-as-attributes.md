---
'@tanrei/web': minor
'@tanrei/react': minor
---

**Breaking — a boolean property is spelt as its attribute.** A web element's boolean property that was on by default
and turned off by an attribute of another name is now that attribute's property, false by default, as an HTML boolean
attribute is. The React wrappers' props are the elements' properties, so a React prop is now written as the attribute
is (`<Card flush>`, as `<tanrei-card flush>`). The attributes are unchanged; only the properties and the React props are
renamed, and the old names are gone (no alias):

| Element | Was (property, React prop) | Now (property, React prop, attribute) |
|---|---|---|
| `tanrei-card`, `tanrei-figure` | `inset={false}` | `flush` |
| `tanrei-bottom-sheet` | `handle={false}`, `inset={false}` | `noHandle` (`no-handle`), `flush` |
| `tanrei-popover` | `inset={false}` | `noInset` (`no-inset`) |
| `tanrei-carousel` | `fluidWidth={false}`, `snap={false}`, `playbackControl={false}` | `fixedWidth` (`fixed-width`), `freeScroll` (`free-scroll`), `noPlaybackControl` (`no-playback-control`) |
| `tanrei-chip` | `removable={false}` | `notRemovable` (`not-removable`) |
| `tanrei-combobox`, `tanrei-combobox-field`, `tanrei-search` | `wrap={false}` | `noWrap` (`no-wrap`) |
| `tanrei-main-action-button` | `extended={false}` | `collapsed` |
| `tanrei-modal-layer` | `scrim={false}` | `noScrim` (`no-scrim`) |
| `tanrei-side-sheet` | `closable={false}` | `notClosable` (`not-closable`) |
| `tanrei-tooltip` | `describes={false}` | `noDescribe` (`no-describe`) |

To migrate, write the new name for the old one set to false (`extended={atTop}` becomes `collapsed={!atTop}`), and
drop the old one where it was true. Script that set the property (`fab.extended = false`) sets the new one
(`fab.collapsed = true`). The specs keep their platform-neutral names (`inset`, `handle`, …); each spec's web mapping
names the property.
