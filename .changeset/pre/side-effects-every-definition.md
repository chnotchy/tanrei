---
'@tanrei/web': patch
---

The package's `sideEffects` now names every module whose loading defines an element, so a bundler that honours the
field (esbuild, Rollup, Vite, webpack) keeps each definition a component brings with it — the buttons of a calendar,
the copy button of a code block, the menu of the breadcrumbs, the requirement tag of a field. Importing a component
from `@tanrei/web/components/<name>` already defined all of them; what changes is that a build from the package's
sources (a workspace that bundles `src/`, or the package's own `tanrei.bundle.js`) no longer warns that an import of a
component was ignored, and that the field frame, which defines the tag, is declared too.
