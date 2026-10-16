---
'@tanrei/react': patch
---

Smaller bundles: a product that imports a few wrappers now bundles only those wrappers and their elements, not every
element of `@tanrei/web`. `import { Calendar } from '@tanrei/react'` went from about 2.4 MB minified (esbuild; 2.8 MB
with Vite) to about 154 kB (200 kB with Vite) — the calendar and the buttons it draws, plus React and `@lit/react`.
Importing a wrapper still defines its element, and the elements it is drawn with; nothing else changes in how wrappers
are imported or used. The package now declares `"sideEffects": false`, so a bare `import '@tanrei/react'` defines no
element: import the wrappers you render.
