---
'@tanrei/studio': patch
'@tanrei/docs': patch
---

**The documentation's Theme Studio page opens under `astro dev`**: the layer schema's validator, which the Studio's
Vite plugin compiles at build time, imported one of Ajv's CommonJS helpers by its path, and a dev server served it as
it is ("does not provide an export named 'default'"), so the Studio never mounted there while every build worked. The
plugin now inlines each helper with what it requires, and the validator module imports nothing.
