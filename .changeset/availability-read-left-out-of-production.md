---
'@tanrei/web': patch
---

A production bundle no longer carries the code that reads, records and reports a component or variant the active
system does not have, which only a debug build runs: about 0.8 kB gzip (2.4 kB minified) less in every component's
bundle. The package's `browser` field now maps a second module, `dist/primitives/availability-debug.js`, as it maps
`dist/primitives/debug.js`. What a debug build reports and what `unavailableUses()` returns are unchanged.
