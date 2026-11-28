---
'@tanrei/web': minor
'@tanrei/tokens-build': minor
'@tanrei/cli': minor
---

**New — a product's tests can fail on a component its system does not have.** `@tanrei/web` exports
`setAvailabilityMode('warn' | 'error')` and `unavailableUses()` (and `@tanrei/web/availability` the two alone, without
registering an element), shaped like `missingWords()`:

```js
setAvailabilityMode('error'); // in the test setup, before anything renders
// …render the screens of the product…
expect(unavailableUses()).toEqual([]);
```

In a debug build every use of a component, or a `variant` value, that the active system leaves out, or of a component
that lives in a layer the system does not extend, is recorded once, in either mode (`segmented-button`,
`text-field:outlined`), and the error mode reports it with `console.error` instead of `console.warn`. A production
build reads and records nothing.

**The report names what the system uses instead.** Every system's stylesheet now declares
`--tanrei-unavailable-replacement`, written from the `insteadUse` of its components manifest (the default system's:
`segmented-button=tabs,radio-button,button-group`); a product's sheet from `tanrei build` declares it too, with its own
`components.omit` entries, and Theme Studio's preview declares the same. A component that lives in another layer names its replacement as soon as its manifest entry
carries one.

**A use is reported under the component the product wrote.** `<tanrei-text-field variant="outlined">` under the default
system reports `variant "outlined" of text-field` on `<tanrei-text-field>`, not the text input it draws inside.
