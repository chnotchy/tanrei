---
'@tanrei/mcp': minor
---

**New — the MCP server answers about components.** An agent that writes UI can now work with only the components a
design system has. Four read-only tools and one resource, answered from the system's components manifest and the
component specs (never from the documentation site):

- `list_components` — the components a system ships (default `tanrei`; with `layerFile`, a product's system as
  `tanrei build` works it out): each with its web element and the module that registers it, its React wrapper and the
  entry to import it from, the `variant` values the system offers and its status. `omitted` lists what the system does
  not have — why, what to use instead (`insteadUse`), the shipped systems that have it (`availableIn`) and the line of
  a product's layer that takes it (`howToInclude`); `omittedVariants` the variant values it leaves out. Cupertino lists
  no FAB menu; m3-like lists it, registered by `@tanrei/web/m3-like`.
- `get_component` — one component from its spec, for one system: props with `variant` narrowed to the system's values,
  events, slots, items, states, the behaviour as EARS rules with their stable ids, accessibility and one fixture as an
  example; `available: false` with what to use instead where the system does not have it.
- `find_component` — which component does a job, by the words of its name, summary and props.
- `check_usage` — the elements, imports and literal variants in code that the system does not have, each with its file,
  line and column and what to use instead; a React wrapper imported from another entry than the system's is a warning.
- `tanrei://components/<id>` — each shipped system's components manifest.

The server's instructions now say to call `list_components` first and use nothing it does not list, and to use the
default system when asked to rebuild a product with Tanrei. The published server carries the component specs, the
catalog and the manifests in its copy of the vocabulary.
