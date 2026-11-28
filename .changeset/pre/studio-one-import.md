---
'@tanrei/studio': patch
---

**Theme Studio: a pasted layer is loaded as a file is.** The layer pasted under the file panel (**Import a layer**)
goes the way of the start point's **Import a file…**, through the same function: over a layer that holds changes it asks
first; what is not JSON, what the schema refuses, or a layer on a system the Studio does not have is not loaded, and the
callout at the top of the panel says why; a layer the schema accepts is loaded, and what the token engine and the build's
checks find in it is listed there. Before, it replaced a layer with changes without asking, said what kept a layer out
under the field, and said nothing of what the engine found in one it loaded.

- A new start, a loaded layer and a shuffle are each a step of their own to undo, however soon they follow another
  commit: two loads half a second apart were one step.
- The page's API: `importLayer(input)` loads the layer the same way, without asking, and throws what kept it out.
- The import's "Layer loaded." is gone from the dictionaries: a pasted layer is announced as a loaded file is.
