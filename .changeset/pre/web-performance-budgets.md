---
'@tanrei/docs': patch
---

Documentation site: the web page's new Performance section says what the components promise — a component that
holds items is linear up to 1,000 items, Tanrei does not virtualise, and each component's bundle is held to a budget in
bytes — and how a product keeps its own bundle small.

The web package's tests now hold budgets (`packages/web/perf-budgets.json`): each component's own module and
`@tanrei/web/all`, bundled alone for production and compressed with gzip, under a budget in bytes and pulling in only
the other components it is listed with; and, in Chromium, the layout and style reads that building 100 instances cost
against 10, the updates one property change draws, and the stylesheets instances do not share. Nothing the package
ships changes.
