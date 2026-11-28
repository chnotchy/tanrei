---
'@tanrei/react': minor
'@tanrei/tokens-build': minor
'@tanrei/cli': minor
---

**Breaking — `@tanrei/react` has one entry per design system, and its main entry is the default system's.** What a
product can import is what its system has, so an editor offers, and a type check accepts, only that:

| Entry | What it exports |
|---|---|
| `@tanrei/react` | the default system's components (Tanrei) |
| `@tanrei/react/m3-like`, `@tanrei/react/cupertino` | that preset's components |
| `@tanrei/react/advanced` | the components listed as advanced, the building blocks of others, in every system |
| `@tanrei/react/all` | every wrapper, whichever system has its component: for a product's own system and for building one |

What breaks:

- `FabMenu` and `FabMenuItem` are no longer exported by `@tanrei/react`: the FAB menu lives in the m3-like layer, and
  the default system does not descend from it. Import them from `@tanrei/react/m3-like` (or `/all`).
- `SegmentedButton` and `Segment` are no longer exported by `@tanrei/react`: the default system leaves the segmented
  button out. Import them from `@tanrei/react/m3-like` or `/cupertino` (or `/all`).
- `TextInput`, `NumberInput`, `ColorInput`, `OneTimeCodeInput`, `EmbeddedTextInput`, `Combobox`, `FilePicker` and
  `ModalLayer` — the advanced components — are no longer exported by `@tanrei/react`: import them from
  `@tanrei/react/advanced`. A product usually writes the component built from one instead (`TextField`, `NumberField`,
  `ColorField`, `OneTimeCodeField`, `ChatComposer`, `ComboboxField`, `FileUpload`, `Dialog` and the other surfaces), and
  each one's doc comment now names them.
- In `@tanrei/react`, `variant` takes none of the values the default system leaves out: `<TextField variant="outlined">`
  (and `filled`) is a type error, for the text field, the chip, color, number, select and combobox fields, and the
  select. The preset entries take their own values (`/m3-like`'s `TextField` takes `outlined`); `/all`
  and `/advanced` take every value. This is a type only: the wrapper is the same component in every entry, so a
  bundler still keeps only what is imported, from any entry.
- The package's main module is `dist/entries/generated/index.js` (was `dist/index.js`); a deep import of `dist/index.js`
  no longer resolves. Every entry exports `setWords`, `missingWords` and `TanreiEvent`.

The entries are generated from the components manifests (`scripts/entries.js`), and the manifests now name each
component's React entry (`react.import`): the system's own entry, `@tanrei/react/advanced` for an advanced component,
and `@tanrei/react/all` in a product's manifest (`tanrei build`), where the system has no entry of its own.

The React generator now reads the tag prefix and the npm scope from `tanrei.config.json` instead of writing them.
