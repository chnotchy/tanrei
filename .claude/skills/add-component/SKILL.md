---
name: add-component
description: Add a new Tanrei component (or bring an existing one to more platforms) the spec-first way — tokens, spec, five platform implementations, tests, baselines, docs, changeset. Use whenever the task is "add/implement/port <component>".
---

# Add a component

Follow these steps in order. Do not skip ahead to platform code.

1. **Read** `AGENTS.md`, `CONTRIBUTING.md` (its section *Adding a component*), `docs/architecture/overview.md` (what every component shares), `specs/button.spec.json` (the reference spec) and `packages/tools/src/conventions.js` (mandatory file paths).
2. **Inventory**: the name must exist in `specs/inventory.json`. A component that is not there, or a breaking change to one that is, is the maintainers' decision: stop and ask before writing it.
3. **Tokens**: write `tokens/comp/<name>.tokens.json` (aliases to `tanrei.sys.*` only; heights may be literals) and add it to the `comp` set in `tokens/tanrei.resolver.json`. If you need a new `sys` token, add it there first and say why in the changeset.
4. **Spec**: write `specs/<name>.spec.json`, all platforms `planned`. Behavior in EARS form with ids (`CHK-1`…). Fixtures must cover every variant, every size, and disabled/error/selected states. Map every prop and event for every platform using that platform's idiom.
5. `pnpm validate && pnpm generate`. Fix invariant failures in the tokens, never in the thresholds.
6. **Implement per platform** — delegate each to its subagent (`platform-web`, `platform-swiftui`, `platform-compose`, `platform-flutter`, `platform-react-native`) in parallel. Each one: implementation at the conventions path built on the platform's shared primitives, tests citing every behavior id, one baseline per fixture id plus one representative fixture per shipped preset, one gallery registration line, no literal design values. Only one of them may run the root `pnpm generate` at a time; emitter changes are serialized.
7. **Flip status** to `alpha` in the spec only for platforms whose tests pass and baselines exist. Look at the baselines yourself — a green snapshot test only proves the image did not change, not that it was right.
8. **Docs**: `apps/docs/src/content/docs/components/<name>.mdx` and `ja/…` plus the sidebar slug. Prose only; tables come from the spec.
8a. **Figma**: the component's page and component set, bound to variables (`CONTRIBUTING.md`, *Adding a component*).
9. `pnpm check`. Then `pnpm changeset`.

If a platform cannot be finished, leave it `planned` and report why. Never mark something done that is not.
