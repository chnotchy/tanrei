---
'@tanrei/docs': patch
---

The worker that computes the stylesheet of **My theme** loads and computes only what the stylesheet needs. It no longer
bundles Theme Studio's whole core: no schema validator, no checks of the build, no status, no other system's layers, no
prose of the token documents. It is 0.73 MB instead of 1.86 MB (89 KB instead of 248 KB compressed with Brotli), and it
answers about a fifth sooner on its own (0.34 s instead of 0.42 s in Chromium, 0.49 s instead of 0.61 s in Firefox,
0.34 s instead of 0.45 s in WebKit). A theme built on a showcase system loads that system's layers when it is asked
for. The documentation still draws only a layer the schema accepts: Theme Studio's Share now gives it only such a
layer, and while the layer being edited is one the schema refuses, the documentation keeps the last one it was given.
A kept stylesheet is also computed again when the installed version of material-color-utilities, whose code computes
it, changes.
