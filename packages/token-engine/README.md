# @tanrei/token-engine

Tanrei's token derivation engine: **layers, rules and palettes**, as pure functions over DTCG documents. It is isomorphic — no filesystem, no `tanrei.config.json` read of its own — so the token build (`@tanrei/tokens-build`), the CLI, the MCP server and Theme Studio in a browser all compute identical values from the same inputs. Everything is exported from `src/index.js`; the groups below follow that file.

The vocabulary's namespace (`tanrei` in `tanrei.config.json`) is a parameter, `DEFAULT_NAMESPACE` when a caller passes none; a namespace given to `mergeLayers` travels on the merged system, so everything that takes the system afterwards uses the same one.

## Layers and systems (`system.js`)

`mergeLayers(layers, { namespace })` merges a chain of layer files, root first: later layers win, and a `scale` composes with an inherited `scale`. The result is the *system* every other function takes. `resolveNumericTokens(sources, system)` applies the merged operations to cloned source documents (relative file name → DTCG document, the vocabulary with its defaults) and evaluates every rule, returning the same file names fully valued for this system; extensions become ordinary tokens first (`materializeVocabulary`), color roles and per-state tokens are left to the palette engine and `generateStateDocument`. The merged system is what a reader (`explain`, Theme Studio) shows as authored — the operations are applied from a copy — and only `notices` is written back. `rootLayerProblems(sources, layer, { namespace })` lists what a *root* layer writes and the default system cannot take: the default system is the source documents as written plus what is generated from the root layer (color roles, per-state tokens, component colors valued by a color rule), so a root layer's line for any other token is a problem, reported with the document that holds its value. A declaration under the root layer's `vocabulary` that is not a color role is a problem the same way: a new core token is written in the source documents, and an extension belongs to a layer that extends the root.

## Rules and documents (`rules.js`)

`walkTokens(node)` walks a DTCG document, yielding leaf tokens with their inherited `$type` and vocabulary rationale. `evaluateNumeric(rule, lookup, ctx)` evaluates one numeric rule against a lookup of other tokens' resolved values; `ruleDependencies(rule)` lists the ids a rule reads, for ordering and cycle detection; `roundTo(value, step)` is the rounding the rules use. The `$extensions` keys are constants: `DERIVE` (`dev.tanrei.derive`, a rule), `VOCABULARY` (`dev.tanrei.vocabulary`), `LLM` (`dev.tanrei.llm`, usage guidance for agents, inherited from the nearest group) and `ENUM` (`dev.tanrei.enum`, a choice of kind: a `number` token whose value indexes `values`); `enumName(token)` gives the name a choice-of-kind token currently has. Two checks return lists of problems: `checkSources(documents)` requires every source token to be accounted for (a rationale, and an alias, a rule or a fixed value with a reason, with a rule's value at the dial defaults equal to the literal next to it), and `checkGuidance(documents)` requires every authored group to say how it is meant to be used — a repository policy kept apart from `checkSources`, so the engine can still check any well-formed document.

## Contexts (`contexts.js`)

`SCHEMES` is the six schemes (`light`, `light-medium`, `light-high`, `dark`, `dark-medium`, `dark-high`); `parseScheme(scheme)` splits one into `{ theme, contrast }`, `pick(list, contrast)` picks a contrast level's entry from a value list (`[standard, medium, high]`, the last value repeating), and `inContext(value, scheme)` resolves a context map — `[10, 6, 0]`, `{ light: [10, 6, 0], dark: [93] }`, or a plain value — for one scheme.

## Palettes and color roles (`palette.js`)

`createPaletteEngine({ Hct, TonalPalette, namespace })` takes the two classes from `@material/material-color-utilities` (injected, so the engine has no dependency of its own) and returns `{ buildPalette, roleTable, rolesFor, generateColorFiles }`: a palette from a declaration (a `seed`, or `hue` and `chroma`, with `source.tones` fixing single tones to exact colors while every other tone still follows the seed); the roles a system must and may value, in output order, each with its one-product rationale; every color role resolved for one scheme; and the generated DTCG documents for a system's colors (`ref.palette` + `ref.alpha`, and one `sys.color` document per scheme, as aliases). `hexToArgb` and `argbToColor` convert between the two representations.

## States (`states.js`)

`STATES` (`dev.tanrei.states`) is the key under which a component declares its interaction states; `expandStateVocabulary(compDocuments)` expands every declaration into the token ids it implies. `operationFor(id, system)` is the operation that values one state token in this system, and `matchingRules(id, layers)` lists every pattern rule that matches it, in the order they were written, with the one that wins and why (an explicit `tokens` entry beats every pattern; fewer wildcards win; the later one wins a tie). `generateStateDocument({ system, documents, roleColor, toneColor })` produces the DTCG document of per-state colors (or `null` when no component declares states). The color arithmetic underneath is exported too: `mixColors`, `toDtcgColor`, `contrastRatio(fg, bg)` (a translucent foreground is composited over the background first) and `pickByContrast(on, candidates)`, the `contrast-pick` rule — of the candidates, the one most readable on `on`, the first winning a tie.

## What a layer may write (`operations.js`)

`tokenKind(descriptor)` classifies a token as `dial`, `alias`, `derived` or `fixed`. `legalOperations(descriptor)` lists the operations a layer may write for it, most natural first, each with its effect (and, for a choice of kind, its choices); `cannot(namespace)` / `CANNOT` say what no layer can do whatever the token. `extensionRecipes(descriptor, layerId)` returns ready-to-edit `vocabulary` snippets for adding next to this token. `dependencyIndex(documents)` answers which tokens follow a token: `dependents.get(id)` for the direct readers, `followers(id)` for the transitive closure. Theme Studio's *Every token* level and the MCP server's tools are built on this group.

## Vocabulary extensions (`vocabulary.js`)

`collectVocabulary(layers, { namespace })` collects the declarations of a layer chain, root first — each with its `kind`, `rationale`, what it is cloned `from` and `declaredBy`; `AXES` (`dev.tanrei.axes`) is the extension key a component axis carries. `materializeVocabulary(docs, system)` inserts a system's extensions into already cloned documents (it may add `ext/<ns>.tokens.json`) and returns notices for declarations that core has since made redundant; `listExtensions(system)` is the same set as a plain list, for bundles, reports and tools.

## `SystemError`

```js
export class SystemError extends Error {}
```

The engine throws a `SystemError` for **a layer or a declaration it refuses**, and the message is written for the person who wrote that layer: it names the token and says what to do instead (`…: unknown token (layer "acme"). To add it, declare it under "vocabulary" with a rationale.`, `…: a layer cannot change $type`, `cycle: a → b → a`, `…names the palette "x", which this system does not declare`). Callers rely on the contract: the build and the CLI print the message as the reason a system cannot build, `tanrei studio` refuses a save with it (`422 { problems }`), and Theme Studio lists it among the layer's problems and disables export until it is gone. Anything else that throws is a bug in the engine or in a source document, not in the layer.

## Tests

`pnpm --filter @tanrei/token-engine test` runs `node --test` over `test/`. The engine has no build step; `files` publishes `src/` and this README.
