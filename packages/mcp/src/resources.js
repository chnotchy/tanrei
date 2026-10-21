// What an agent should read once. The philosophy is a summary of how Tanrei decides its tokens; the schema, the
// shipped layers and their components manifests are served as they are on disk.
import fs from 'node:fs';
import path from 'node:path';
import { COMPONENTS_URI, componentsResource } from './components.js';
import { DEFAULT_SYSTEM, REPO_ROOT, ToolError, listedSystems, shippedLayer, shippedSystems } from './systems.js';

export const INSTRUCTIONS = `Tanrei is a small, simply named core vocabulary of design tokens shipped to five platforms, which any design system can reproduce exactly: a design system is a layer file (<id>.system.json) that changes VALUES and, where the core has no word for something, EXTENDS the vocabulary.
Components: first call list_components to settle the system, and use no component it does not list (omitted says what to use instead); when asked to rebuild a product with Tanrei, use system=${DEFAULT_SYSTEM}. get_component gives a component's props and its EARS rules; check_usage checks code before it is kept.
Hard rules:
- Values first. Find the existing token with search_tokens and change it in the layer, in this order of preference: set a dial, "scale" an inherited rule, re-point an alias, replace "derive", and only then pin a literal "$value" — a pinned literal needs a "reason" (8+ characters). New color families are declared under "palettes" with "roles": "intent". Never edit generated files.
- If the word really is missing, add it — in the layer, under "vocabulary", with a "rationale" (8+ characters): a step in a series, a value on a component axis (a size, a variant), or the layer's own token in its own namespace ("<layer id>.comp.…"). propose_extension writes and verifies the declaration. Additive only: never re-declare, remove or retype what exists (change its value under "tokens"); interaction states are not extensible; nothing in tanrei.* may reference a layer's own token.
- Accessibility thresholds are constants, for extensions too. Nothing in a layer changes them; a violation in a product layer is a warning that every build prints. Do not try to silence it — fix the value or report it.
- Call explain_token before editing a token and validate_layer before saving; after editing the layer run \`tanrei build\` (@tanrei/cli) to regenerate every platform.
Read tanrei://philosophy once.`;

const PHILOSOPHY = `# Tanrei in one page

Tanrei holds two ideals at once:
- **(a) a small core** — Tanrei's own tokens are a necessary and sufficient set, simply named, fitted to no one design system;
- **(b) exact reproduction** — by customizing Tanrei, any design system can be matched exactly, not approximated.
Both hold because **the core stays small and any layer may extend it**. Nothing is added to the core for somebody else's sake.

## The core: the one-product test
A core token exists because ONE product may need the distinction, by meaning or by place (\`focus-ring\` is not \`primary\`:
a product may want a saturated brand color and a quiet focus ring). It does not exist because one design system has it,
nor because a component uses it today. Core changes happen only in the Tanrei repository (tokens/, lock file, review).

## Tiers and kinds
Four tiers, one reference order: \`dial < ref < sys < comp\`. Components read \`comp\` tokens only. Seven numeric dials sit
under everything: type.base 16px, type.contrast 1, space.unit 8px, size.unit 4px, shape.unit 2px, stroke.unit 1px,
motion.unit 50ms. Color seeds are palette declarations, not dials. Every value is one of three kinds:
- **derived** — a rule in a closed language: \`mul\`, \`scale\`, \`clamp\`, \`sub\` ({ of, by } → max(0, of − by): a corner inside another at an inset), \`em\`; \`tone\`, \`alpha\`, \`contrast-pick\` for color roles; \`mix\`, \`alpha\`, \`tone\`,
  \`contrast-pick\` ({ on, from: […] } → the most readable candidate, per scheme) for per-state component colors. No other arithmetic, conditionals or user functions.
- **fixed** — a literal with a stated reason, exempt from the dials.   - **alias** — a reference that can be re-pointed.

## A design system is a layer
\`<id>.system.json\`: \`id\`, \`extends\` (every chain ends at the root \`core\`; the default system \`tanrei\` extends it), \`vocabulary\`, \`palettes\`, \`tokens\`, \`rules\`.
**Values first.** Operations under \`tokens\`, keyed by an existing token id — prefer the earliest that does the job:
1. set a dial        \`"tanrei.dial.type.base": { "$value": { "value": 17, "unit": "px" }, "reason": "…" }\`
2. scale             \`{ "scale": 2 }\` — N × the inherited rule or alias, still following its dial
3. re-point alias    \`{ "$value": "{tanrei.sys.space.space50}" }\`
4. replace the rule  \`{ "derive": { "fn": "mul", "of": "{tanrei.dial.shape.unit}", "by": 4 } }\`
5. pin a literal     \`{ "$value": …, "reason": "…" }\` — stops following dials; the reason is mandatory.
\`palettes\`: re-declare a palette (\`{ "source": { "seed": "#rrggbb" } }\`) to recolor every role that reads it; \`"roles": "intent"\`
plus a \`description\` gives \`<name>\`, \`on-<name>\`, \`<name>-container\`, \`on-<name>-container\`, contrast-checked; \`null\` drops one.
A source may state single tones exactly — \`"tones": { "40": "#6750a4" }\` (a published ramp, a brand color); the rest are generated.
Color roles take \`derive\` (tone / alpha / contrast-pick) or an alias, never a literal. A choice of kind (\`tanrei.sys.behavior.*\`) takes one of its NAMES (\`{ "$value": "ripple", "reason": "…" }\`); a typeface takes a font stack that ends in a system or generic fallback.
\`rules\`: pattern rules value per-state component tokens (\`tanrei.comp.*.*.hovered.container.color\`); \`*\` is one segment,
available as $1, $2…. An explicit \`tokens\` entry beats a pattern; fewer wildcards win; then the later layer.

## Extending the vocabulary
\`vocabulary\` says that something EXISTS; \`tokens\` and \`rules\` then value it like any core token. Three kinds, one mechanism:
1. **a step in a series**, inside Tanrei's tree — or a single color role with its \`onRole\`:
   \`"tanrei.sys.space.space1200": { "$type": "dimension", "rationale": "…", "derive": { "fn": "mul", "of": "{tanrei.dial.space.unit}", "by": 12 } }\`
2. **a value on a component axis** — one line values every member; a variant's state tokens come from the pattern rules:
   \`"tanrei.comp.button.size.3x": { "from": "large", "scale": 1.5, "rationale": "…" }\`, \`"tanrei.comp.button.variant.danger": { "from": "filled", "rationale": "…" }\`
3. **the layer's own tokens**, in its own namespace = the layer id: \`"acme.comp.rating.star.size": { "$type": "dimension", … }\`.
   They may reference \`tanrei.*\`; nothing in \`tanrei.*\` may reference them. On the web they are \`--acme-…\`.
- Every declaration carries a **rationale** (8+ characters) and is attributed to its layer (\`declaredBy\`).
- **Additive only**, inherited down \`extends\`. No layer removes or retypes vocabulary; re-declaring what core or an
  ancestor declared is an error — change its value under \`tokens\`.
- **Interaction states are not extensible**: hovered, focused, pressed, disabled are platform behaviour. How they LOOK is a value.
- Traits no token can express are Tanrei defects, listed by mimicry_gaps until a token can express them.

## Accessibility
The ruler never changes, for core and extensions alike: text 4.5:1 (7:1 in high contrast), non-text and focus 3:1, and a
control's height must hold its content. These are constants in code. In the default system a violation fails the build; in
a product layer it is a warning — printed, written to a11y-report.json, stamped into every generated file. An imitation
preset is held to fidelity to its original, not to Tanrei's accessibility criteria, in every contrast scheme: its
contrast is reported as measurements, not warnings; a structural or functional failure fails its build, as in the default system.

## Workflow for a product
search_tokens → explain_token (\`howToChange\`, \`howToExtend\`) → propose_extension if a word is missing → edit the layer →
validate_layer → \`tanrei build\` (one layer in; DTCG bundle, CSS, Tailwind/shadcn, SwiftUI, Compose, Flutter, React Native out).
`;

const SYSTEM_URI = /^tanrei:\/\/systems\/([a-z0-9-]+)$/;

export function listResources() {
  return [
    { uri: 'tanrei://philosophy', name: 'Tanrei philosophy', description: 'The two ideals (a small core, exact reproduction), tiers and kinds, the operations a layer may perform and the three ways it may extend the vocabulary. Read once before editing a layer.', mimeType: 'text/markdown' },
    { uri: 'tanrei://schema/system', name: 'Layer JSON Schema', description: 'JSON Schema of a design system layer (<id>.system.json).', mimeType: 'application/schema+json' },
    ...shippedSystems().map((id) => {
      const layer = shippedLayer(id);
      return { uri: `tanrei://systems/${id}`, name: `System layer: ${id}`, description: `${layer.name ?? id}${layer.extends ? ` (extends ${layer.extends})` : ' (root)'} — the layer file as authored. A worked example of every operation.`, mimeType: 'application/json' };
    }),
    ...listedSystems().map((id) => ({ uri: `tanrei://components/${id}`, name: `Components: ${id}`, description: `The components manifest of "${id}": every component it ships with the module that registers it, those it does not have with what to use instead, and the variant values it leaves out.`, mimeType: 'application/json' })),
  ];
}

export function readResource(uri) {
  if (uri === 'tanrei://philosophy') return { uri, mimeType: 'text/markdown', text: PHILOSOPHY };
  if (uri === 'tanrei://schema/system') return { uri, mimeType: 'application/schema+json', text: fs.readFileSync(path.join(REPO_ROOT, 'tokens/schema/system.schema.json'), 'utf8') };
  const id = SYSTEM_URI.exec(uri)?.[1];
  if (id && shippedSystems().includes(id)) return { uri, mimeType: 'application/json', text: fs.readFileSync(path.join(REPO_ROOT, 'tokens/systems', `${id}.system.json`), 'utf8') };
  const manifest = componentsResource(COMPONENTS_URI.exec(uri)?.[1]);
  if (manifest) return { uri, mimeType: 'application/json', text: JSON.stringify(manifest) };
  throw new ToolError(`unknown resource ${uri}. Known: ${listResources().map((r) => r.uri).join(', ')}`);
}
