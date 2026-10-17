---
'@tanrei/web': minor
'@tanrei/tokens-build': minor
'@tanrei/cli': minor
---

**New — a components manifest for every system.** What a system ships is one generated list, for whatever suggests or
checks a component (a coding agent, an editor, a lint, the documentation):

- each shipped system's is `@tanrei/web/systems/<id>.components.json` (`tanrei` for the default system), and
  `tokens/generated/<id>/components.json` in the repository;
- `tanrei build` writes a product's into its `tokens` output, as `components.json`.

It lists the components the system ships — each with its level and listing, the layer it lives in, its element (or
class) with the module that registers it (`@tanrei/web`, or a system's own entry such as `@tanrei/web/systems/m3-like.js`) and its
own module, its React name, and the `variant` values the system has, those a layer adds included — and, under
`omitted`, the components it does not have: with the layer that left each out, why and what to use instead, or the
layer it lives in (`providedBy`). `omittedVariants` lists the variant values it leaves out, for a composed component
too (the default system's text field has only `stacked`, as its text input). It is worked out from the system's layers:
the default system lists neither the FAB menu nor the segmented button, m3-like lists both, cupertino the segmented
button only, a product keeps what the system it extends leaves out, and a product that includes a component from
another layer has it listed.
