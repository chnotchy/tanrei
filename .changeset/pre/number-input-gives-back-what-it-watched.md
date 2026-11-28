---
'@tanrei/web': patch
---

Number input: the elements it watches for wrapping (its container and its input's line) are given back to the page's
resize observer exactly as they were given, and an input that leaves the page before its first update ends watches
nothing. Such an input used to stay watched after it was gone.
