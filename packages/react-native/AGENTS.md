# packages/react-native — local rules

The root `AGENTS.md` is law. This file only adds React Native specifics.

## Boundaries

- Pure TypeScript. No native modules, no codegen, no Expo-only APIs, no dependencies beyond the
  `react` / `react-native` peers. It must build and test without an iOS or Android toolchain.
- `src/generated/` is generated: `vocabulary.ts` holds the system-independent TYPES (`TanreiSystem`
  and its parts, every member required), `systems/<id>.ts` holds one system's VALUES
  (`export const tanrei = { … } as const satisfies TanreiSystem`). Never edit them. If a token is
  missing or mistyped, fix `packages/tokens-build/src/emit/ts.js` and run `pnpm generate`. Only
  non-deprecated tokens are emitted.
- **Every token flows through the system object**, so that a product's system replaces every value. Components and primitives read
  `useTanrei().system`; the only static import of generated values is the provider's default
  (`src/theme/TanreiProvider.tsx`). Anywhere else, import generated files with `import type` only.
  Pure helpers take the token value as an argument (`typescaleStyle(system.typescale.label)`,
  `resolveElevation(system.elevation.level2, color)`, `minimumTargetHitSlop(size, target)`).
- Zero literal design values in `src/components/` and `src/primitives/`: every color, radius, size,
  padding, gap, type style, opacity, duration and easing comes from `system.components.<name>` or the
  other parts of the system. Structural values (`position: 'absolute'`, a zero inset, `flexShrink: 1`,
  the resting opacity 1 — there is no enabled `opacity` token) are fine.
- **A state renders from that state's tokens.** Resolve one state with `resolveInteractionState()`
  (disabled, else pressed > focused > hovered) and read `variants.<variant>.<state>.<part>` / `<state><Part>`.
  Never compute how a state looks: no overlays, no opacity math, no "dim when disabled".
- **Axes are open, states are closed**: a design system may add sizes and variants. Component tokens have the shape of their axes: flat members
  for tokens on no axis, one holder per axis (`sizes`, `variants`) keyed by the axis value. Key types are
  `keyof Tanrei<Component><Axis>Registry`; holders are required-core ∩ optional-registered, like
  `TanreiSchemeColors`. Read a holder ONLY through `lookupValue(holder, key, '<spec default>', '<what>')`
  (total: falls back to the default value, warns once per key under `__DEV__`, own properties only). Never
  build a token key by string concatenation, never `switch` over sizes or variants; a `switch` over
  interaction states is fine. The emitter takes axes from `ir.axes` / each token's `axis`, `key`, `member`,
  `state` — it never parses token names.
- **Per-size members** of Button include `containerGap` and `outlineWidth`: read them from
  the looked-up size (`dimensions.containerGap`), never from `tokens.*`. The value-identity pin
  (`button-flat-tokens.tanrei.json`) still has ONE value for each; the test requires every size to carry it.
- **Icon style is tokens, not code**: `system.icon` (`TanreiIconStyle`: `family.unselected` / `family.selected` — an icon
  SET is a family per selection state — `weight`, `fillUnselected`, `fillSelected`, `opticalSizeMin` / `opticalSizeMax`; required in every system)
  + `system.measure.icon` sizes. `src/theme/icon.ts` is the only reader: `iconFamily`, `iconFill`, `iconNeedsFillAxis`
  and `iconGlyphStyle(icon, size, { selected, resolveFont })` → `{ family, axes, fontVariationSettings, textDrawsFill, style }`
  (the family of the STATE; opsz = size clamped to `icon.opticalSizeMin`–`opticalSizeMax`, GRAD 0). React Native cannot set variable-font axes on
  `<Text>`: with one variable family (the default system, every shipped preset) a selected icon CANNOT be filled — the
  helper says so (`textDrawsFill: false`, one `__DEV__` warning) and the README names the two ways out (a layer with two
  static families — the `acme` fixture — or SVG). Keep that honest; never make the helper pretend. The font is not
  bundled; `IconButton` draws its glyph through `iconGlyphStyle` with the provider's `resolveIconFont`, there is no
  standalone icon component, and Button's `icon` stays a slot. Library source never names an icon set
  or a preset (a test greps for it): the family comes from the tokens.
- **Fonts are names, not files, and stacks are read ONCE in the token pipeline**: every type style's `font`,
  `system.typefaces.*` and `system.icon.family.*` are `TanreiFontStack` = `{ stack, families, generic, system }`.
  `src/theme/typography.ts` (`fontFamilyOf`, `platformFontFamily(generic)`) turns that into the one `fontFamily` React
  Native takes. **Never parse a CSS font keyword here** (a test greps `typography.ts` for them); `stack` is only for a
  renderer that takes CSS. The product's `resolveFont(family, weight, font)` hook stays. Render-tree baselines contain
  the first named family, so a typeface rename moves every default baseline — and nothing else.
- **Type styles by level**: `system.typescale` holds sixteen roles — `display`, `heading1`…`heading6`
  (h1…h6), `bodyLarge` / `body` / `bodySmall` (lead, p, small), `label` / `labelSmall` / `caption`, `code` / `codeSmall`,
  `eyebrow` — plus `emphasis: { display, heading, body, label }`, the weight step each family ADDS for emphasized text.
  There are no `emphasized…` roles and no emphasis color roles (a role a scheme does not declare falls back to `primary`).
  `TanreiTypescaleRole` excludes `emphasis`; `theme.text(role, { emphasized })` is the API, `emphasize(token, emphasis,
  role)` + `typeFamilyOf(role)` (first name segment; `caption`, `code*`, `eyebrow` → `label`) the pure helpers in
  `src/theme/typography.ts`. The family is decided by the token build and generated as `TanreiTypography.family`;
  `emphasize()` reads it and falls back to `typeFamilyOf(role)` only for a hand-written style without one. A preset adds the roles its source has (`displayLarge`, `bodyCallout`…) as optional keys,
  with `<preset>Steps.typescale.<role>(system)` accessors. The unknown-role fallback of `text()` is `body`.
- **Corner smoothing is an amount**: `system.shape.cornerSmoothing`, 0–1 with Figma's meaning (0.6 = the iOS
  corner; `cupertino`). `src/theme/shape.ts` `borderCurveOf(amount)` is the ONE reader: `{ borderCurve: 'continuous' }`
  on iOS for any amount above 0 (the amount rounds to the OS's curve), `null` at 0 and on Android (circular: React Native
  has no continuous corner there). Button, `Ring`, `FocusRing` and `PressRipple` take `cornerSmoothing` and spread it.
- **Choices of kind** (`system.behavior`: `pressedFeedback`, `focusStyle` — typed string unions generated
  from the vocabulary; the token's index never reaches this package). A component reads the NAME and never a system id.
  **An extra node or style exists only when the choice asks for it, and only while it draws**: the ripple node exists
  only while a ripple is on screen, the glow replaces the ring nodes only under `glow`, `borderCurve` is set only
  when the smoothing amount is above 0. That is what keeps the default system's (and `m3-like`'s) render-tree baselines still.
- **Shadows**: `src/theme/elevation.ts` is the ONE place a shadow token (CSS box-shadow semantics) becomes a React
  Native quantity (`boxShadow` as is; `toShadowRadius` = blur / 2; `toAndroidElevation`), with its unit test next to it.
  `elevation.level0` is `[]`: draw nothing.
- **Series steps never throw**: a system file that added steps exports `<system>Steps` accessors calling
  `seriesStep()` (`src/theme/lookup.ts`) with the declaring system's value as the fallback; it is the only generated
  file that imports runtime code, and only then. Springs are a series (`TanreiSpringSet` is open, in the merge anchor).
- `vocabulary.ts` ends with a generated **merge anchor** (an empty `declare module './vocabulary'` naming every
  open interface). It keeps module augmentation independent of file order (a product file augments through the
  package name, a preset file augments the module directly; TypeScript drops the former when it is merged first).
  When the emitter gains a new open interface, it must join the anchor — `SERIES` and the axis registries do so
  automatically.
- **A system that extends the vocabulary** declares its keys in ONE marked `declare module` section of its
  generated file (roles, optional series steps, axis registry keys) and exports its own-namespace tokens as
  `<namespace>Tokens`. A system without extensions emits nothing of the kind — a test guards that.
  In this repository the augmented module is `'../vocabulary'`; a product's file augments
  `'@tanrei/react-native'`, which `tsconfig.json` `paths` and Jest's `moduleNameMapper` point at `src/index.ts`
  so that the test fixture `src/components/__tests__/__fixtures__/acme.ts` compiles as a product's file does.
  Regenerate the fixtures with `pnpm --filter @tanrei/react-native generate:fixtures` (a test fails when one is stale;
  the generator builds in memory — nothing in this package may make a temporary directory, `src/testing/__tests__/tempDirs.test.ts`).
- **Colors are paints** (`TanreiPaint`: `role` | `mix` | `alpha` | `none` | `literal` | `scheme` — one paint per
  scheme, decided at build time), scheme-independent in the tokens and evaluated at render time (`evaluatePaint(paint,
  colors, scheme)`): `useTanrei().resolve(paint)` → `{ r, g, b, a }`,
  `.paint(paint)` / `.color(role)` → string. Strings are made only by `formatColor()`; never parse one.
  A paint whose alpha resolves to 0 draws nothing (no `backgroundColor`, no outline element).
- Color roles are open-ended (`keyof TanreiColorRoleRegistry`, augmented by each system file). Do not
  assume a role exists: go through `roleColor()` / the theme, which fall back and warn in development.
  `system.intents` is what a future `palette` prop may name; that prop is not in the spec yet.

## Naming idioms

- Components are unprefixed PascalCase (`Button`), file `src/components/<Pascal>.tsx`. Props keep the
  spec names; spec events become `on<Verb>` (`click` → `onPress`); slots are `children` plus
  `ReactNode` props (`icon`). Enum props are string unions of the spec values; a prop bound to a token axis
  (`axis` in the spec) is the generated open key type instead (`ButtonSize = TanreiButtonSize`).
- The mapping is recorded in the spec's `platforms.react-native` block. The parity checker greps the
  implementation file for the component name, the mapped prop/event names and every enum value, so keep
  them literal in that file.
- React 19: `ref` is a normal prop; do not use `forwardRef`.

## Where things live

| Path | What |
|---|---|
| `src/index.ts` | Barrel. Export every public component, type, helper. |
| `src/generated/vocabulary.ts`, `src/generated/systems/<id>.ts` | Generated vocabulary types / system values |
| `src/theme/` | `TanreiProvider` (`system`, `theme`, `contrast`, `resolveFont`, `insets` — the window's system insets, which React Native cannot read itself; `useTanreiInsets(own?)`, internal, is what the overlay layer and the bars read) / `useTanrei`, `overlay.tsx` (the overlay layer: snackbar < menu < tooltip; a `Modal` — dialog, modal drawer — hosts its own), `paint.ts` (`evaluatePaint`, `mixColors`, `formatColor`, `roleColor`), `lookup.ts` (`lookupValue`: the total lookup of open keys; `seriesStep`: the total read of an added series step; `closedValue`, internal: the total read of a closed enum prop such as a divider's `orientation`), `typography.ts` (`typescaleStyle`, `emphasize`, `typeFamilyOf`, `fontFamilyOf`, `platformFontFamily`), `shape.ts` (`borderCurveOf`), `icon.ts` (`iconFamily`, `iconFill`, `iconGlyphStyle`), `elevation.ts` (`resolveElevation`, `resolveElevationLayers`, the shadow conversions, `supportsBoxShadow`), `toEasing`, `useReduceMotion` (and, internal, `useReduceMotionSetting`: `null` until the platform answers — loops wait for it) |
| `src/primitives/interaction.ts` | `resolveInteractionState()`: the pure precedence function |
| `src/primitives/stateTransition.ts` | `useStateTransition(target, { duration, easing, immediate })`: moves drawn colors / numbers to the current state's values with the component's motion tokens; press and reduce-motion are immediate; plain values when settled |
| `src/primitives/pressHold.ts` | `usePressHold(system.motion.duration.pressHold)`: pressed at once, visible at least that long (BTN-8); `touchEnd(event)` (from the host's `onTouchEnd` AND `onTouchCancel`) ends a touch press — `Pressable` holds `onPressOut` back until 130 ms after the touch began, the touch events are not held back; `activate(event)` shows a bare click (keyboard / assistive activation) as a press |
| `src/primitives/PressRipple.tsx` | `usePressRipple` + `<PressRipple>`: the token-driven JS ripple (BTN-9), null at rest; `rippleOrigin`, `rippleRadius` |
| `src/primitives/FocusRing.tsx` | Offset → optional inner stroke → outer stroke from `system.measure.focus`, never animated; `focusStyle: 'glow'` draws them as ONE `boxShadow` halo (ring when the renderer has no `boxShadow`); `useKeyboardFocus()` = focus not preceded by a press |
| `src/primitives/Ring.tsx` | Absolute, non-interactive ring: `inside` (outlines) or `outside` (elevation ring, focus strokes; a negative gap goes inside). Accepts an animated color / radius. Never changes the host's size |
| `src/primitives/minimumTarget.ts` | `useMinimumTarget()` → `hitSlop` from `system.measure.target.touch`, both axes, visual size untouched |
| `src/primitives/pressInteraction.ts` | `usePressInteraction({ disabled, estimate, motion, ref, rippleArea?, …handlers })`: everything a pressable control does with input — press hold, hover, keyboard focus, minimum target, the ripple started at the point of contact — and the resolved `state` / `under` / `layerless`; spread `hostProps` on the host. `rippleArea` (`{ ref, size }`): the ripple grows in that node (a selection control's round container) instead of the host — the contact point is measured against it and kept inside it, a press outside it (on the label) and a bare click start at its center — the latter from `size`, before any layout. Internal |
| `src/primitives/selectionControl.tsx` | The shell of the selection controls (Checkbox, RadioButton, Switch): `selectionRow(gap)` (the pressable row: control, then the label), `<StateLayer>` (the round `container` behind the control, the ripple in it; `areaRef` for `rippleArea`), `hasAccessibleName` + `useNamelessReport` (the dev-only "no label" report), `useControlTransition` (a control part's transition: state motion for a state change, selection motion for a condition change), `useFirstLineAlignment` (the control centered on the label's first line), `ramp` (a settled number or an interpolation through a piecewise-linear ramp: the check's legs). Internal |
| `src/primitives/elevationTransition.ts` | `shadowLayerCount` + `elevationVisuals` (an elevation as flat values for `useStateTransition`), `useElevationDrawing(drawn, theme.elevation(level), count)` → `{ shadow, ring }`. Internal |
| `src/primitives/content.tsx` | `RESTING_OPACITY`, `drawsColor` / `fillOf` (a paint that resolves to nothing draws nothing), `textContent` (label text + default accessibility label), `<IconBox>` (`decorative` hides it from assistive technology), `glyphSlotContent` (an icon slot that takes a glyph name — string, function of `{ color, size, glyph }`, or node — as the box's content; FloatingActionButton, ExtendedFloatingActionButton, Chip), `<Label>`, `partTestID`. Internal |
| `src/primitives/Arc.tsx` | `<Arc size thickness color from sweep roundCaps>`: a stroked arc drawn with views only (a bordered circle; a part of it as one or two halves, each clipped by two half-planes; round caps as dots), `direction: 'ltr'`, angles plain or animated. The progress ring and the loading indicator. Internal |
| `src/primitives/loop.ts` | `useLoop(name, make, initial)`: a value that loops one cycle while `name` is set and the app is in the foreground (`useAppActive`), a new value per loop (native and JS drivers never share one), restarted at `initial`. Internal |
| `src/primitives/destination.tsx` | `DestinationCell` (the navigation bar's and rail's destination: the cell is the pressable, its item container the state layer AND the active indicator, the ripple grown in it, the badge on the icon, the selection motion: the indicator's `scaleX` grow and the labels that follow the selection), `destinationModel` (selection by value, repeated values, the reports every navigation component shares), `badgeDescription`. Internal |
| `src/primitives/stateShape.ts` | `stateShape(tokens, state)` → `{ opacity, shape }`: the one switch over interaction states for the axis-free state tokens. Internal |
| `src/primitives/actionRow.tsx` | `ActionRow` (a container's actions — Tanrei Buttons in a slot — in one row at the `start` or `end`, a column the same way when the buttons' own widths do not fit) and `actionItems` (fragments opened): the dialog's (DLG-10) and the side sheet's (SSH-11). Internal |
| `src/primitives/sheet.tsx` | What the bottom sheet and the side sheet share: `useSheetPresence` (present while open or leaving; the enter / exit progress, a plain 1 at rest; mounted open without motion; reduce motion fades, Android jumps), `useSheetFocus` (focus in when `open` turns true, and for a modal sheet mounted open — a standard one mounted open moves nothing; again on the `Modal`'s `onShow`; focus is not returned yet), `SheetModal` (the transparent `Modal` with its own overlay layer; covers the outer one), `SheetScrim`, `escapeKey`, the drag's slop (8) and fling (0.5 pt/ms). A drag's `panHandlers` go on a view INSIDE the sheet's host, never on the host: Testing Library refuses every event (layout, keys) on an element whose responder says no. Internal |
| `src/components/<Pascal>.tsx` | One file per spec |
| `src/components/__tests__/<Pascal>.test.tsx` | Behaviour, a11y, token-binding and fixture tests |
| `src/components/__tests__/<Pascal>.subject.tsx` | The component as the test harness sees it: `defineSubject({ component, spec, tokens, render, axes })` |
| `src/components/__tests__/__snapshots__/<Pascal>/<fixture-id>.json` | One baseline per spec fixture |
| `src/components/__tests__/<Pascal>.presets.test.tsx`, `__snapshots__/<Pascal>/<system-id>/<fixture-id>.json` | Shipped presets (`m3-like`, `m3-expressive-like`, `cupertino`): the component's vocabulary, preset-driven behaviour, light-scheme baselines (`m3-like`, `cupertino`; `m3-expressive-like` is covered by behaviour tests only). Never mixed with the default baselines |
| `src/components/__tests__/<Pascal>.extensions.test.tsx`, `__fixtures__/acme.ts`, `scripts/acme-fixture.mjs` | A system that extends the vocabulary, end to end (generated fixture + its generator) |
| `src/components/__tests__/<Pascal>.perScheme.test.tsx`, `__fixtures__/tone-per-state.ts` | A component color that differs per scheme (paint kind `scheme`), end to end: the fixture layer with non-monotonic `tone` rules, built by the same generator through `buildProductSystem`, rendered in all six schemes |
| `src/components/__tests__/__fixtures__/button-flat-tokens.tanrei.json` | The default system's Button tokens in flat form: the value-identity pin |
| `example/` | The Expo gallery app (every fixture × every shipped system). NOT a workspace member and never installed in CI: its screen is type-checked by `typecheck` and rendered by Jest with this package's React Native. No native folders |
| `src/testing/` | Jest setup, `toMatchFixtureSnapshot`, `loadSpec`, `referencedRoles` / `unknownRoles` / `intentRoles`, and `harness.tsx` (below) (excluded from the build) |
| `src/__tests__/systems.test.ts` | The shipped systems' own structure (schemes, roles, intents, series) and "no preset-specific code": component-independent, run once |
| `example/src/registry.tsx` | The gallery's registration table: spec name → `{ spec, render(props) }`. One entry per implemented component (a test compares it with `specs/` and `src/components/`) |

The component, test and snapshot paths are fixed by `packages/tools/src/conventions.js`.

## Interactive component recipe

Animated `Pressable` (`{...rest}` then `{...interaction.hostProps}`, role, state, `focusable={!disabled}`)
containing, in order: elevation `Ring` / outline `Ring` → `PressRipple` (only while one is on screen) → content
(`<IconBox>`, `<Label>` when `textContent(children).textOnly`) → `FocusRing`. `Button.tsx` is the reference.

1. `const interaction = usePressInteraction({ disabled, estimate, motion, ref, …the caller's handlers })` — it owns the
   press hold (BTN-8: never a raw `onPressIn/Out` flag; `touchEnd` on `onTouchEnd` / `onTouchCancel`), hover, keyboard
   focus, the minimum target and the ripple, and resolves `state` (`resolveInteractionState`; under
   `pressedFeedback: 'none'` without `pressed`), `under` and `layerless`.
2. Read that state's tokens, `theme.resolve()` the paints, and pass colors + opacity + shape +
   `elevationVisuals(theme.elevationLayers(level), shadowLayerCount(every state's layers))` to `useStateTransition` with
   the component's motion tokens (`immediate` while pressed). When `interaction.layerless` (`ripple` while a ripple
   draws, `dim`) the container color is the one of the state UNDER the press.
3. Put the returned values on the host (`fillOf` for the fill), the `<Label>` and the outline `Ring` (only when
   `drawsColor`). Settled values are plain (the hook re-renders when a transition arrives); `useElevationDrawing` gives
   the host's `shadow` and the elevation `ring`: interpolated layer by layer while it moves, `theme.elevation(level)`
   when settled, `.legacy` without `boxShadow` (`supportsBoxShadow()`).

- Do not put a real `borderWidth` or `overflow: 'hidden'` on the host: rings are positioned from the
  host's outer edge and drawn outside it.
- Paddings are logical (`paddingStart` / `paddingEnd`; `paddingVertical` from `padding-block`).
- Interaction state is local and lives in `usePressInteraction`: `pressed` from `usePressHold` (fed by `onPressIn/Out`,
  `onTouchEnd` / `onTouchCancel` and `onPress`), `hovered` from `onHoverIn/Out`, keyboard focus from `useKeyboardFocus()`.
  It calls the caller's handler too — pass them in, do not wire them on the host yourself.
- A state's non-axis tokens (`<state>Opacity`, `<state>ContainerShape`) are read by the ONE shared `switch`,
  `stateShape(tokens, state)` (`src/primitives/stateShape.ts`; structural, so every component's tokens fit); the resting
  opacity is `RESTING_OPACITY`. A component whose conditions are prefixed parts (`selected.`, `unselected.`)
  picks them with a `switch` over its closed list of looks (`lookPaints` in IconButton), never by building a key.
  A component whose conditions are its state variants (Checkbox, RadioButton, Switch: `conditions.<condition>.<state>`)
  picks the condition from its boolean props with a plain function (`checkboxCondition`) and reads the holder through
  `lookupValue`; its `container` is the round `<StateLayer>` behind the control, and the host is a `selectionRow`.
- The shared building blocks (`pressInteraction`, `elevationTransition`, `content`) are package-internal: the index test
  pins the public list and names them as internal. Making one public is a deliberate README + index-test change.
- Heights are `minHeight`; never set `numberOfLines` on a label by default; keep `allowFontScaling` on.
- Parts get `testID`s derived from the host's (`<testID>.outline`, `.elevation-ring`, `.ripple`, `.ripple.wave`, `.focus-ring`, `.focus-ring.inner`, `.label`, …).

## Adding a component

1. The spec and `comp.<name>` tokens exist and `pnpm generate` has produced `Tanrei<Name>Tokens` and
   `tanrei.components.<name>`.
2. Implement `src/components/<Pascal>.tsx` from the primitives; export it from `src/index.ts`.
3. Write `src/components/__tests__/<Pascal>.subject.tsx`: `defineSubject<Props>({ component: '<Pascal>', spec: '<name>',
   tokens: '<camel>', render: (props) => <Pascal {...props} />, axes: { <prop>: '<holder>' } })` — every spec prop with an
   `axis`, by its React Native name, to its holder in the component tokens (a test checks the list against the spec).
4. Write `src/components/__tests__/<Pascal>.test.tsx`. Load the spec with `loadSpec('<name>')`; every
   behaviour id (`BTN-1`, …) appears literally in the name of the test that covers it. Assert token
   bindings against the generated `tanrei` system in at least light and dark, never against literals,
   and prove that values drive rendering: render under a modified system (`withComponent(tanrei, '<camel>', …)`) and
   assert the changed value. `settleMotion()`, `byTestID(id)`, `viewStyle` / `textStyle`, `painted`, `enterState` come
   from `src/testing/harness.tsx`. End with `describeFixtureBaselines(subject)`: one baseline per fixture.
5. `<Pascal>.presets.test.tsx`: `describeSharedVocabulary(subject)`, `describeFixtureBaselines(subject, { systems:
   [m3Like, cupertino], fixtures: [...] })`, then what each preset's values must do to THIS component.
   `<Pascal>.extensions.test.tsx`: `describeAxisExtensions(subject, acme)` once acme adds a value to one of its axes
   (the fixture layer is `packages/tokens-build/test/fixtures/acme.system.json`), plus the component's own cases.
   A per-scheme test uses `SCHEME_SETTINGS`, `schemePaintPaths`, `decidedColor`, `expectFixtureSystemsFresh`.
6. Add one entry to `example/src/registry.tsx` (import the spec JSON, `render: (props) => <Pascal {...props} />`).
7. `pnpm --filter @tanrei/react-native typecheck && … build && … test`, then `pnpm check` at the root.
8. Do not flip `platforms.react-native.status` yourself; the status must never claim more than exists.

## Snapshots

Record deliberately, with a reason:
`TANREI_SNAPSHOT_REASON="…" TANREI_RECORD_SNAPSHOTS=1 pnpm --filter @tanrei/react-native test`.
Never re-record to make a failing test pass; a diff is a finding. Do not use `toMatchSnapshot()` /
`jest -u` — the JSON baselines are the only snapshots. Tests run with reduce-motion mocked on so
styles are settled plain values (the press hold still applies: a release is over after `duration.pressHold` — wait for it); the animated path is asserted by spying on `Animated.timing` and
`Animated.Value.prototype.interpolate`.
