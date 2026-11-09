---
'@tanrei/docs': patch
---

The worker that computes the stylesheet of **My theme** loads and computes only what the stylesheet needs. It no longer
bundles Theme Studio's whole core: no schema validator, no checks of the build, no status, no other system's layers, no
prose of the token documents. It is 0.73 MB instead of 1.86 MB (89 KB instead of 248 KB compressed with Brotli), and it
answers about a fifth sooner on its own (0.34 s instead of 0.42 s in Chromium, 0.49 s instead of 0.61 s in Firefox,
0.34 s instead of 0.45 s in WebKit). A theme built on a showcase system loads that system's layers when it is asked
for. A layer that only the schema refuses now gets a stylesheet where the token engine can compute one; a layer the
engine cannot compute is refused with the engine's reason, as before.
