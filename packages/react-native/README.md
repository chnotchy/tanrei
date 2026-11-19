# @tanrei/react-native

> **Pre-release.** Nothing has been released: `@tanrei/react-native` is not on npm yet. It has not caught up with the current specs and tokens and **does not build yet**; its CI is paused until it does (the [status matrix](../../docs/status/STATUS.md) marks it *lagging*). Documentation: <https://tanrei.chnotchy.com/getting-started/react-native/>.

Tanrei design system components for React Native. Pure TypeScript — no native modules — so it works
in Expo (including Expo Go) and in bare apps. Implements the platform-neutral specs in `specs/`
with the design tokens generated from `tokens/`.

## Requirements

- React Native with the New Architecture (0.78 or newer; developed against 0.87) and React 19.
  Elevation and the `glow` focus style use the `boxShadow` style prop, which only the New Architecture draws
  (Android 9+ for shadows; the 1px elevation ring is a plain border and renders everywhere). On a renderer
  without it (`supportsBoxShadow()` is false) elevation falls back to the legacy shadow props and a glow to the
  ring — see "Shadows" and "Behaviour choices".

## Install

```sh
pnpm add @tanrei/react-native   # or npm / yarn / bun
```

`react` and `react-native` are peer dependencies.

### Fonts

**Fonts are referenced by name and never bundled.** Which families a design system names is a value of that
system — `system.typefaces` lists them by role, and every type style carries its own stack:

```ts
system.typefaces.brand      // TanreiFontStack — the default system:
// { stack: ['Inter', 'Noto Sans JP', 'Noto Sans', 'system-ui', 'sans-serif'],   as written in the tokens (CSS); never parse it
//   families: ['Inter', 'Noto Sans JP', 'Noto Sans'],                           the NAMED families, in order: what an app installs
//   generic: 'sans-serif',                                                      the class of platform font to fall back to
//   system: false }                                                             true = the platform's own font comes FIRST
system.typefaces.mono       // families: ['Roboto Mono', 'Noto Sans JP'], generic: 'monospace'
system.typescale.label.font        // the same shape, per type style
```

The stack is interpreted **once, in the token pipeline**; this package does not look at CSS keywords.
React Native has no font fallback list — a `<Text>` takes ONE `fontFamily` — so `fontFamilyOf(font, weight)` picks:

1. `system: true` (the `cupertino` preset: `-apple-system, …, Inter`) → the platform's own font of class `generic`;
2. otherwise the **first named family** — the app must have loaded it; if it has not, both native text stacks
   silently use the platform default font (sizes, weights, tracking and line heights still apply);
3. no named family → the platform's own font of class `generic`.

The platform font of a class (`platformFontFamily(generic)`): `sans-serif` → no `fontFamily` (San Francisco /
Roboto); `serif` → `ui-serif` on iOS, `serif` on Android; `monospace` → `ui-monospace` on iOS, `monospace` on Android.

Two things the token pipeline knows about a stack do **not** reach this package:

- **`generic` is one of three classes.** `TanreiFontGeneric` is `'sans-serif' | 'serif' | 'monospace'` — the classes
  of platform font both iOS and Android have. A stack that ends with any other CSS generic (`cursive`, `fantasy`,
  `math`, `emoji`) arrives as `generic: 'sans-serif'`, the platform's default text face; the keyword as written is
  still the last entry of `stack`. That is decided once, in the pipeline (`fontStack().genericClass`), not here.
- **The `fallback` flag is not delivered.** The pipeline records whether a stack itself names a system or generic
  fallback (`fontStack().fallback`) and `tanrei validate` warns when it does not. On React Native it would change
  nothing: a `<Text>` takes one family, and a missing family always ends in the platform default font — with or
  without a fallback keyword in the stack. If you need to know, look at `stack`.

**What a product installs**, per shipped system (first named family of `brand`/`plain`, and of `mono` if it uses the
code styles): `tanrei` — Inter, Roboto Mono; `m3-like` — Roboto (already the Android system
font; iOS needs the files), Roboto Mono; `cupertino` — nothing (the platform font). Japanese and other scripts fall
through to the platform's own fallback fonts: React Native cannot be given the second family of a stack. For a
product system, read `system.typefaces.*.families[0]`, or run `tanrei build`, which lists the families a system names.

- **Expo**: the `expo-font` config plugin (`app.json` → `"plugins": [["expo-font", { "fonts": ["./assets/fonts/Inter-Regular.ttf", …] }]]`,
  embedded at build time) or `useFonts({ Inter: require('./assets/fonts/Inter.ttf') })` at runtime (works in Expo Go).
- **Bare React Native**: put the files in `assets/fonts/`, list the folder in `react-native.config.js`
  (`module.exports = { assets: ['./assets/fonts'] }`) and run `npx react-native-asset` (iOS: adds them to the target and
  to `UIAppFonts`; Android: copies them to `android/app/src/main/assets/fonts`).
- The family name a `<Text>` must use is the font's **PostScript/full name on iOS** and the **file name (without
  extension) on Android**. Name the files after the family (`Inter.ttf` for a variable font) or map names with `resolveFont`.

The type scale contains the weights 450 and 550; React Native only accepts the hundreds, so they are rounded
(`toFontWeight`: 450 → `'500'`, 550 → `'600'`).

If your fonts are registered under one family name per weight (for example `Inter_500Medium` from
`@expo-google-fonts/inter`), map them with `resolveFont`. It receives the first named family, the weight and the
whole stack (for an app that loaded a later family instead), and is not asked about the platform font:

```tsx
const FONTS: Record<number, string> = { 400: 'Inter_400Regular', 500: 'Inter_500Medium', 600: 'Inter_600SemiBold' };

<TanreiProvider resolveFont={(family, weight) => (family === 'Inter' ? FONTS[Math.round(weight / 100) * 100] : undefined)}>
```

Returning `undefined` selects the platform default font.

### Text styles

Sixteen roles **by level**, `system.typescale.<role>` — each a `TanreiTypography` (`font`, `size`, `weight`,
`tracking`, `lineHeight`), every family strictly monotonic in size. In the default system a heading that shares a size with a body role weighs 500 and the body role 400; a preset sets its own weights (`m3-like`'s `heading1` is Material's 400).

| role | HTML / use |
|---|---|
| `display` | the one hero size |
| `heading1` … `heading6` | `h1` … `h6` — `heading5` a card's or dialog's title, `heading6` a table's |
| `bodyLarge`, `body`, `bodySmall` | lead text, `p`, `small` |
| `label`, `labelSmall`, `caption` | text inside and next to controls: buttons, inputs, chips, helper text |
| `code`, `codeSmall` | monospace |
| `eyebrow` | a section's kicker: small, tracked, in the plain face (upper-case it yourself) |

**Emphasis is a weight step, not a role.** `system.typescale.emphasis` = `{ display, heading, body, label }`, the
weight each family ADDS when you ask for emphasized text; there are no `emphasized…` twins. A role's family is the
first segment of its name (`heading3` → heading); `caption`, `code*` and `eyebrow` take the `label` step.

```tsx
const { text } = useTanrei();
<Text style={text('heading1')} />                        // weight 500 in the default system
<Text style={text('heading1', { emphasized: true })} />  // 500 + emphasis.heading (100) = 600
<Text style={text('label', { emphasized: true })} />     // m3-like: 500 + 200 = 700 (Material emphasizes labels more)
```

The pure helpers behind it: `emphasize(token, system.typescale.emphasis, role)` → the same token, heavier — the family a
role belongs to is decided by the token build and generated as `family` on each type style, which `emphasize()` reads;
`typeFamilyOf(role)` (the first name segment) is only the fallback for a hand-written style without one;
`typescaleStyle(token, resolveFont)` → `TextStyle`. The resolver hook (`resolveFont(family, weight, font)`)
receives the emphasized weight, so an app that registers one family per weight gets the right one. React Native takes
weights in hundreds: `toFontWeight` rounds the sum to the nearest hundred and never leaves `100`–`900`.

The shipped presets re-value these roles from their sources and ADD the ones the core lacks (`m3-like`:
`displayLarge`, `displaySmall`; `cupertino`: `bodyCallout`, `bodySubhead`, `captionSmall`) — optional keys of
`TanreiTypescale`, readable under any system through `m3LikeSteps.typescale.displayLarge(system)` /
`cupertinoSteps.typescale.bodyCallout(system)`. `TanreiTypescaleRole` is every key of `TanreiTypescale` but `emphasis`.

### Icons

How icons are drawn is a small token group on the system, next to the icon sizes (`system.measure.icon`). **An icon
set is a family per selection state**:

```ts
system.icon // TanreiIconStyle
// { family: { unselected: TanreiFontStack, selected: TanreiFontStack }, weight: 300, fillUnselected: 0, fillSelected: 1 }
```

The rule it encodes — everywhere: an icon for something **unselected** is drawn outlined, the same icon in its
**selected** state filled. A *variable* icon font (the default system: Material Symbols Rounded, weight 300; `m3-like`:
Material Symbols Outlined, 400) names the same family twice and tells the states apart by the `FILL` axis (0 / 1). A
*static* icon set names two families. The font is referenced by name and **not bundled**, icon *names* belong to the
product. `IconButton` draws its glyph through this helper; there is no standalone icon component (Button's `icon` stays
a slot). One helper turns the tokens into what a glyph needs:

```ts
import { iconFamily, iconFill, iconGlyphStyle, iconNeedsFillAxis, useTanrei } from '@tanrei/react-native';

const { system } = useTanrei();
const glyph = iconGlyphStyle(system.icon, system.measure.icon.medium, { selected, resolveFont });
glyph.family;                // the token family of THIS selection state (system.icon.family.selected | .unselected)
glyph.axes;                  // { FILL: 0 | 1, wght: 300, GRAD: 0, opsz: size clamped to system.icon.opticalSizeMin–Max } — a static font ignores them
glyph.fontVariationSettings; // "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24"
glyph.style;                 // TextStyle: { fontFamily, fontSize: size, lineHeight: size, fontWeight: '300' }
glyph.textDrawsFill;         // false = a <Text> with `style` draws the WRONG (unfilled) glyph — see below
```

#### What React Native cannot do — and the two honest ways to keep the rule

React Native's `TextStyle` has no `fontVariationSettings`: a `<Text>` **cannot set the `FILL`, `GRAD` or `opsz` axes**
of a variable font, and `fontWeight` is the only weight control (whether a platform maps it onto the `wght` axis
depends on the platform and on how the font was registered — do not rely on it).

**So with the DEFAULT system — and every shipped preset — React Native cannot fill a selected icon.** They name ONE
variable family for both states (`iconNeedsFillAxis(system.icon)` is true), a `<Text>` draws the font's default
instance, and that is unfilled. The helper does not hide this: for a selected icon `glyph.textDrawsFill` is `false`,
and development builds (`__DEV__`) say so once on the console. A product keeps the rule in one of two ways:

**1. A system (a layer) whose icon set is two static font instances.** The family then changes with the selection
state, which a `<Text>` *can* do. The layer — exactly what the `acme` test fixture does:

```json
{
  "id": "acme",
  "extends": "tanrei",
  "tokens": {
    "tanrei.sys.icon.family.unselected": { "$value": ["Material Icons Outlined"], "reason": "A static set: outlined when unselected." },
    "tanrei.sys.icon.family.selected": { "$value": ["Material Icons"], "reason": "A static set: filled when selected." },
    "tanrei.sys.icon.weight": { "$value": 400, "reason": "A static icon font has one weight." }
  }
}
```

`tanrei build` writes the system file; under it `glyph.style.fontFamily` is `'Material Icons Outlined'` /
`'Material Icons'` by state, `textDrawsFill` is always true and nothing is reported. The two families may equally be
two static instances you exported from a variable font (FILL 0 and FILL 1 at your weight). Register the fonts:

- **Expo**: `app.json` → `"plugins": [["expo-font", { "fonts": ["./assets/fonts/MaterialIconsOutlined-Regular.otf", "./assets/fonts/MaterialIcons-Regular.ttf"] }]]`,
  or at runtime `useFonts({ 'Material Icons Outlined': require('./assets/fonts/MaterialIconsOutlined-Regular.otf'), 'Material Icons': require('./assets/fonts/MaterialIcons-Regular.ttf') })`
  — the key IS the family name a `<Text>` uses, so make it the token's name.
- **Bare React Native**: files in `assets/fonts/`, `react-native.config.js` → `module.exports = { assets: ['./assets/fonts'] }`,
  then `npx react-native-asset`. iOS uses the font's own full name (`Material Icons Outlined`, `Material Icons`);
  Android uses the **file name**, so name the files `Material Icons Outlined.otf` / `Material Icons.ttf`, or keep other
  file names and map them:

  ```ts
  const resolveFont: TanreiIconFontResolver = (family) => Platform.select({ android: family.replaceAll(' ', ''), default: family });
  ```

```tsx
<Text style={[iconGlyphStyle(system.icon, size, { selected }).style, { color }]}>{'home'}</Text>
```

(Ligature names such as `'home'` need a font that keeps its ligatures; otherwise pass the codepoint.)

If you would rather keep the shipped system's tokens and only map at the edge, `resolveFont` does the same job
without a layer — it receives the token family and the axes and returns the static instance you loaded; with a
resolver the helper trusts you (`textDrawsFill` is true, no report):

```ts
const resolveFont: TanreiIconFontResolver = (family, axes) => `${family.replaceAll(' ', '')}-${axes.wght}${axes.FILL >= 0.5 ? '-Filled' : ''}`;
```

Components that draw a glyph themselves (`IconButton`) take the resolver from the provider, once for the app:

```tsx
<TanreiProvider resolveIconFont={resolveFont}>…</TanreiProvider>
```

**2. SVG icons.** Export the unfilled and the filled outline of each icon at the system's weight and pick by
`iconFill(system.icon, selected) >= 0.5` (or by `glyph.axes` for a renderer that takes more of them). No font, no
axis, every platform.

(A renderer of your own that does take variable-font axes — a canvas text, a web view — gets `glyph.axes` /
`glyph.fontVariationSettings`.) A symbol set that is not a font (SF Symbols) cannot be named by a family token at all;
that is a recorded mimicry gap, not something this helper papers over.

## Usage

```tsx
import { useState } from 'react';
import { Badge, Button, Card, Checkbox, Chip, TextField, Divider, ExtendedFloatingActionButton, FloatingActionButton, IconButton, LoadingIndicator, ProgressIndicator, RadioButton, RadioGroup, Switch, TanreiProvider } from '@tanrei/react-native';

export default function App() {
  const [favorite, setFavorite] = useState(false);
  const [updates, setUpdates] = useState(false);
  const [frequency, setFrequency] = useState('weekly');
  const [wifi, setWifi] = useState(true);
  const [vegetarian, setVegetarian] = useState(false);
  const [email, setEmail] = useState('');
  return (
    <TanreiProvider theme="system" contrast="standard">
      <Button onPress={deploy}>Deploy</Button>
      <Button variant="tonal" size="small" icon={({ color, size }) => <RocketIcon color={color} size={size} />}>
        Deploy
      </Button>
      <Button variant="outlined" disabled>
        Deploy
      </Button>
      <IconButton accessibilityLabel="Favorite" toggle selected={favorite} onSelectedChange={setFavorite}>
        favorite
      </IconButton>
      <FloatingActionButton accessibilityLabel="Compose" icon="edit" onPress={compose} />
      <ExtendedFloatingActionButton label="Compose" icon="edit" onPress={compose} />
      <Divider inset="start" />
      <Badge count={3} label="3 unread">
        <IconButton accessibilityLabel="Inbox">inbox</IconButton>
      </Badge>
      <ProgressIndicator accessibilityLabel="Uploading" value={0.4} />
      <LoadingIndicator accessibilityLabel="Loading messages" />
      <Checkbox label="Email me updates" value={updates} onValueChange={setUpdates} />
      <RadioGroup accessibilityLabel="How often?">
        {['daily', 'weekly'].map((each) => (
          <RadioButton key={each} value={each} label={each} selected={frequency === each} onSelect={setFrequency} />
        ))}
      </RadioGroup>
      <Switch label="Wi-Fi" value={wifi} onValueChange={setWifi} />
      <Chip kind="filter" label="Vegetarian" selected={vegetarian} onSelectedChange={setVegetarian} />
      <TextField label="Email" type="email" autoComplete="email" value={email} onChangeText={setEmail} />
      <Card accessibilityLabel="Quarterly report" onPress={openReport}>
        Quarterly report. Revenue grew 12% over the previous quarter.
      </Card>
    </TanreiProvider>
  );
}
```

### `Button`

| Prop | Type | Default | |
|---|---|---|---|
| `variant` | `ButtonVariant`: `'filled' \| 'tonal' \| 'elevated' \| 'outlined' \| 'text'` + values the design system added | `'filled'` | Emphasis level. |
| `size` | `ButtonSize`: `'small' \| 'medium' \| 'large'` + values the design system added | `'medium'` | Minimum visual height 32 / 36 / 40. |
| `disabled` | `boolean` | `false` | No `onPress`, not focusable, exposed as disabled. |
| `onPress` | `(event) => void` | | The spec's `click` event. |
| `icon` | `ReactNode \| ({ color, size }) => ReactNode` | | Leading icon. The function form receives the label color of the current state. With an icon the leading padding is the size's `containerPaddingInlineStartWithIcon`; the icon box is the size's `iconSize`. |
| `children` | `ReactNode` | | Label. Strings and numbers get the label type style and become the accessible name. |
| `accessibilityLabel` | `string` | label text | Overrides the accessible name. |
| `style` | `StyleProp<ViewStyle>` | | Layout only (margins, `alignSelf`). The button is `alignSelf: 'flex-start'` by default. |
| `ref` | `Ref<View>` | | Forwarded to the underlying `Pressable`. |

Every other `Pressable` prop is passed through. The button is an `accessibilityRole="button"`; the
container height is a minimum, so at larger system font sizes the button grows and the label wraps
instead of truncating.

Inside a `ButtonGroup` the group sets where the button sits, its inner corners and minimum width (connected) and how
far its hit area reaches toward a neighbour, through an internal context — not a prop (BTN-10; see `ButtonGroup`).

Behaviour notes specific to React Native:

- **Minimum target** — the visual size never changes; the button measures itself and sets `hitSlop`
  so the pressable area is at least 48 × 48 (`system.measure.target.touch`). React Native cannot tell touch
  from a fine pointer, so the touch target is always used. On Android a hit area cannot extend past
  the parent view's bounds, so leave room (`system.measure.target.spacing`) around small buttons.
- **Keyboard focus** — React Native has no `:focus-visible`. Focus that arrives during a press is
  treated as pointer/touch focus; any other focus shows the focus indicator and selects the
  `focused` state.
- **Open size and variant** (BTN-7) — `size` and `variant` are open keys
  (`keyof TanreiButtonSizeRegistry` / `keyof TanreiButtonVariantRegistry`). The button reads
  `button.sizes[size]` and `button.variants[variant]`; a value the active system does not have renders
  from the default value's tokens (`medium`, `filled`) and warns once per key in development builds
  only. See "Extending the vocabulary" below.
- **States** — one state wins (disabled, else pressed > keyboard-focused > hovered) and the button
  draws container, label, outline, elevation, opacity and shape from **that state's tokens**
  (`variants.filled.hovered.containerColor`, `pressedOpacity`, `disabledContainerShape`, …). There is no overlay
  and no disabled-opacity logic in the component: whether hover is a state-layer mix, an explicit
  color, a dim or nothing at all is a value of the active design system.
- **Motion** — colors, opacity, shape **and elevation** move to the new state's values with the button's motion
  tokens (`motionStateDuration` / `motionStateEasing`); press feedback is immediate; the device's "reduce motion"
  setting disables the animation; when a transition arrives the style is plain values again. Elevation: every
  `boxShadow` layer (offset, blur, spread, color) and the ring's color are interpolated; two states with different
  numbers of layers are padded with layers that draw nothing, as CSS does. **What is not possible:** `boxShadow` and
  colors cannot use the native driver, so this runs on the JS thread like the container color; on a renderer without
  `boxShadow` the legacy shadow (iOS `shadow*`, Android `elevation`) **switches** with the state — Android's
  `elevation` also reorders views, so animating it is not the same effect. The focus indicator is never animated.
- **Press hold** (BTN-8) — the pressed state appears in the same frame as the press and stays visible for at least
  `system.motion.duration.pressHold` (100 ms by default) even when the press ends sooner — with reduce-motion on, too.
  Enter / Space / D-pad centre and assistive activation reach a `Pressable` as a bare click (no press events): the
  button shows them pressed for the hold as well. **The hold is the token's alone, for touch too**: React Native's
  `Pressable` holds `onPressOut` back until 130 ms after a touch began (`DEFAULT_MIN_PRESS_DURATION` in
  `Libraries/Pressability/Pressability.js`, used by `_deactivate`; `Pressable` has no prop for it), so the Button
  takes the END of a touch from the host's `onTouchEnd` / `onTouchCancel`, which are not held back
  (`usePressHold().touchEnd`; a second finger's touch end is ignored). `Pressable` still decides activation,
  accessibility and the start of the press. What is left of the constant: a finger that slides OUT of the press
  rectangle (or loses the responder without a touch cancel) within 130 ms of touching down is released by
  `onPressOut`, i.e. at 130 ms — and `onPressOut` itself reaches your own handler as late as React Native sends it.
- **Focus indicator** — from the control outwards: `measure.focus.offset` (negative = inside the
  control), an optional inner stroke (`innerWidth`, role `focusRingInner`; 0 = none), then the outer
  stroke (`outerWidth`, role `focusRing`).
- **Corner smoothing** (`system.shape.cornerSmoothing`; BTN-10) — a number 0–1 with Figma's meaning: 0 a
  quarter circle, **0.6 the iOS continuous corner** (`cupertino`), 1 the most eased. React Native has only the OS's
  curve, so **the amount rounds to iOS's**: `borderCurveOf(amount)` sets `borderCurve: 'continuous'` on the container,
  its rings, the ripple clip and the focus indicator for ANY amount above 0 (the same radius, the OS curve — not Figma's
  construction, which Compose and Flutter draw: 5.1 px² apart on a 180×80 r20 box at 0.6, within what parity
  tolerates), and sets nothing at 0 — the default system's render tree carries no `borderCurve`. **iOS only**, so **Android draws
  circular corners** at the same radius whatever the amount (the fallback BTN-10 allows). Checked against React Native 0.87.1: `borderCurve` is documented `@platform ios`
  (`Libraries/StyleSheet/StyleSheetTypes.js`), it is in the iOS view config only (`Libraries/NativeComponent/BaseViewConfig.ios.js`;
  `BaseViewConfig.android.js` does not list it, so the prop never reaches the Android view), and nothing under
  `ReactAndroid/` mentions it. The new architecture's style additions do not help: `boxShadow` and
  `experimental_backgroundImage` follow the view's circular rounded rectangle, `filter` has no shape function, and there
  is no `clipPath` / `mask` / corner-shape style. Figma's construction on Android needs a drawn path — a native module
  such as `react-native-svg` or Skia — which this package (pure TypeScript, no dependencies beyond the peers) does not take.
- **Behaviour choices** (`system.behavior`; BTN-9, BTN-10) — names, never numbers, and the button
  never looks at a system's id:

  | `system.behavior.` | values (first = default and fallback) | on React Native |
  |---|---|---|
  | `pressedFeedback` | `overlay` \| `ripple` \| `dim` \| `none` | `overlay`: the pressed tokens reach the whole container at once. `ripple` (`m3-like`): the container keeps the color of the state under the press and the pressed container color grows as a circle from the point of contact — from the center for keyboard / assistive activation — clipped to the container shape (smoothed and animated shapes included), over the component token `motion.feedback-duration` (`components.button.motionFeedbackDuration`, an alias of `duration.long1` in the default system) with the state easing; it fades over the state duration once the press has ended and the hold has passed. It is drawn in JavaScript with `Animated` (native driver), identically on iOS and Android: `android_ripple` exists on Android only, takes no duration or easing, and does not follow every shape. With reduce-motion on it appears whole, like `overlay`. Its node exists only while a ripple is on screen. `dim` (`cupertino`): the pressed opacity on the whole control, and no state layer — the container keeps the color of the state under the press. `none`: the state under the press keeps being drawn. Label, outline, elevation, opacity and shape always come from the pressed tokens (except under `none`). |
  | `focusStyle` | `ring` \| `glow` | `glow`: the same two focus colors over the same reach as ONE soft halo (`boxShadow`, each color blurred by its own width) instead of hard strokes. A renderer without `boxShadow` (old architecture) **draws the ring**: a focus indicator must never be invisible. |
- **Direction** — paddings are logical (`paddingStart` / `paddingEnd`), so they follow RTL. Vertical
  padding is the size's `containerPaddingBlock`; heights stay minimums.

### `IconButton`

An action — or an on/off switch — drawn as one icon in a square, named by `accessibilityLabel`
(`specs/icon-button.spec.json`). Inside a `ButtonGroup` the group sets its place, inner corners, minimum width and
hit-area reach through an internal context, not a prop (ICB-10; see `ButtonGroup`).

| Prop | Type | Default | |
|---|---|---|---|
| `variant` | `IconButtonVariant`: `'standard' \| 'filled' \| 'tonal' \| 'outlined'` + values the design system added | `'standard'` | Emphasis. `filled` marks the one most important icon action in a view. |
| `size` | `IconButtonSize`: `'small' \| 'medium' \| 'large'` + values the design system added | `'medium'` | A square of the size's `containerSize` (32 / 36 / 40, Button's heights) with an icon of its `iconSize` (16 / 20 / 24). |
| `toggle` | `boolean` | `false` | A two-state control: activation calls `onSelectedChange(!selected)`. |
| `selected` | `boolean` | `false` | Whether a toggle is on. **Controlled**, like `Switch`'s `value`: the button never flips it itself. Ignored unless `toggle`. |
| `disabled` | `boolean` | `false` | No `onPress` / `onSelectedChange`, not focusable, exposed as disabled. |
| `accessibilityLabel` | `string` | | **Required**: the accessible name (the spec's `label`). An icon alone is not a name; without one the button still renders and development builds warn (ICB-14). `aria-label` / `aria-labelledby` count too. |
| `onPress` | `(event) => void` | | The spec's `click`: every activation, a toggle's included. |
| `onSelectedChange` | `(selected: boolean) => void` | | The spec's `change`: a toggle was activated; called after `onPress` with the new value. |
| `children` | `string \| ReactNode \| ({ color, size, selected, glyph }) => ReactNode` | | The icon. A **string** is a glyph of the system's icon font (a ligature name such as `'favorite'`, or a codepoint), drawn with `iconGlyphStyle` at the size's `iconSize` in the icon color of the current state. A **function** receives that color, the size, whether the icon is drawn selected and the `glyph` (family, axes, style) — for SVG icons or a font of your own. Any other node is rendered as given. |
| `style` | `StyleProp<ViewStyle>` | | Layout only (margins, `alignSelf`). |
| `ref` | `Ref<View>` | | Forwarded to the underlying `Pressable`. |

Every other `Pressable` prop is passed through. Press hold, the minimum target (`hitSlop` to
`system.measure.target.touch`: 6 on each side of the 36 square), keyboard focus, `pressedFeedback` (overlay, ripple,
dim, none), `focusStyle`, corner smoothing, motion and open axis keys behave exactly as for `Button` (above); only the
parts differ:

- **Looks** (ICB-12) — a plain button is drawn from its variant's own parts (`variants.<v>.<state>.containerColor`,
  `iconColor`, `outlineColor`); a toggle from its `unselected…` parts when off and its `selected…` parts when on, in every
  interaction state. Switching look moves with the state motion tokens. `selected` without `toggle` changes nothing.
- **Accessibility** (ICB-11) — `accessibilityRole="button"`; a toggle adds `accessibilityState.selected` (iOS's selected
  trait, Android's selected state); a plain button never exposes one, even if the caller's `accessibilityState` does.
  The icon is decorative: its box is hidden from assistive technology (`accessibilityElementsHidden`,
  `importantForAccessibility="no-hide-descendants"`), so a ligature name is never read out.
- **Text size** — the square is a fixed `width` / `height` and the glyph has `allowFontScaling={false}`: an icon is not
  text, so a larger system font size never grows the button (spec, accessibility notes).
- **The icon** (ICB-13) — family and FILL of the selection (selected only for a toggle that is on), the system's
  weight, optical size = `iconSize` clamped to `system.icon.opticalSizeMin`–`Max`. **What React Native cannot do:**
  with one variable icon family — the default system and every shipped preset — a `<Text>` cannot set `FILL`, so a
  selected icon is drawn **unfilled** and development builds say so once (see "Icons" above). Keep the rule with a
  layer that names two static families, `TanreiProvider`'s `resolveIconFont`, or a function icon that draws SVG.
  Under `cupertino`, where a standard toggle is the tint both off and on, the fill is the only difference — so there
  the rule matters most.
- **No elevation** — the icon button has no elevation tokens; nothing is raised in any state.

### `ButtonGroup`

A row of `Button`s and `IconButton`s (toggles included) that belong together (`specs/button-group.spec.json`):
`standard` spaces them `standardGap` apart, `connected` joins them `connectedGap` apart with tighter corners where
they meet. The items are ordinary children — each drawn from its own tokens, answering its own states, emitting its
own events and being its own Tab stop (BGR-5); the group takes no focus, handles no keys and keeps no selection. A
choice among options is a `SegmentedButton`.

```tsx
<ButtonGroup variant="connected" accessibilityLabel="Text style">
  <IconButton toggle selected={bold} onSelectedChange={setBold} accessibilityLabel="Bold">format_bold</IconButton>
  <IconButton toggle selected={italic} onSelectedChange={setItalic} accessibilityLabel="Italic">format_italic</IconButton>
</ButtonGroup>
```

| Prop | Type | Default | |
|---|---|---|---|
| `variant` | `'standard' \| 'connected'` | `'standard'` | A closed choice of layout; unknown values render as `standard`, reported in development builds (BGR-9). |
| `accessibilityLabel` | `string` | | The spec's `label`. With it the row is `role="group"` named by it; without it the group adds no accessibility element (BGR-6). |
| `children` | `Button` / `IconButton` elements | | The items, in order. Anything else still renders but is reported in development builds, as is a group of fewer than two (BGR-10). |

What the group tells its items goes through an **internal React context** (BTN-10, ICB-10: not part of their public
props), so it reaches a `Button` or `IconButton` that is a direct child:

- **Where they sit** (BGR-1) — `standard` centres every item on the row's middle; `connected` stretches every item
  to the tallest (a Button's height is a minimum; an icon button trades its fixed height for a minimum).
- **Inner corners** (BGR-2, BGR-8, BGR-11) — in a `connected` group the corners that face a neighbour are
  `connectedInnerShape` (logical corners, mirrored in right-to-left); the outer ends keep the item's own shape. The
  fill, outline, ripple and focus ring follow the joined shape, and the corners move at once when an item is added,
  removed or disabled. A state's shape change (a morph) is not animated on a joined item.
- **Target** (BGR-3, BGR-4) — in a `connected` group each item is at least `system.measure.target.touch` wide (an
  icon button widens its container around its centred icon). In both variants an item's hit area reaches at most half
  the gap toward a neighbour, so a press between two items goes to the nearer one and never over a neighbour; above,
  below and at the row's ends it extends as BTN-5 / ICB-5 say.
- **Too narrow a row** (BGR-7) — Buttons narrow in proportion to their widths (`flexShrink`) and their labels wrap;
  icon buttons keep their size; the row never wraps or scrolls, and a row that still does not fit is reported in
  development builds. React Native has no min-content width, so a Button can narrow past its longest word.

### `SplitButton`

A main action and a chevron that opens a `Menu` of related actions, joined as one control
(`specs/split-button.spec.json`): two halves, each its own button and Tab stop with its own state.

```tsx
const [open, setOpen] = useState(false);

<SplitButton
  label="Save"
  icon="save"
  menuAccessibilityLabel="More save options"
  onPress={save}
  menuVisible={open}
  onMenuToggle={setOpen}
  onMenuDismiss={() => setOpen(false)}
  menuItems={[
    { label: 'Save as…', onPress: saveAs },
    { label: 'Save a copy', onPress: saveCopy },
  ]}
/>
```

| Prop | Type | Default | |
|---|---|---|---|
| `variant` | `SplitButtonVariant`: `'filled' \| 'tonal' \| 'elevated' \| 'outlined'` + your system's | `'filled'` | Emphasis, as Button's. An open key: unknown values render as `filled` (SPB-8). |
| `size` | `SplitButtonSize`: `'small' \| 'medium' \| 'large'` + your system's | `'medium'` | Button's heights. Unknown values render as `medium` (SPB-8). |
| `label` | `string` | | The leading half's text and name. Required (reported in development builds when empty). |
| `icon` | glyph name, function or node | | The leading half's icon, in its label color. |
| `menuAccessibilityLabel` | `string` | | The spec's `menuLabel`: the trailing half's name ("More save options"). Required: the chevron alone is not a name. |
| `menuVisible` | `boolean` | `false` | The spec's `open`. **Controlled**: set it from `onMenuToggle`, and to `false` from `onMenuDismiss`. |
| `disabled` | `boolean` | `false` | Both halves: no events, not focusable, exposed as disabled; no menu and no open form, whatever `menuVisible` says. |
| `onPress` | `(event) => void` | | The spec's `click`: the leading half was activated. Never opens the menu. |
| `onMenuToggle` | `(open: boolean) => void` | | The spec's `toggle`: the trailing half asks for the opposite of `menuVisible` (Enter, Space or a press); Down Arrow on it asks to open a closed menu. |
| `onMenuDismiss` | `(reason: MenuDismissReason) => void` | | The spec's `close`: the menu asks to be closed — `'escape'`, `'back'`, `'outside'`, `'tab'`, `'focus-out'` or `'item'` (after the item's own `onPress`). |
| `menuItems` | `readonly MenuEntry[]` | `[]` | The spec's `menu` slot: the `Menu`'s items, all four kinds. Empty: the trailing half still toggles and draws its open form, no menu is presented, and development builds report it. |

- **The halves** (SPB-4, SPB-7, SPB-9, SPB-10, SPB-12, SPB-18) — each half answers hover, focus and press on its own,
  from the variant's tokens in its own state (the other half stays as it is), with Button's press hold, ripple, dim
  and state motion; elevation and colors move over `motionStateDuration`. They sit `containerInnerGap` apart in one
  row; the leading half is at least the size's `containerHeight`, padded `leadingPaddingInlineStart` (or
  `…StartWithIcon`) and `leadingPaddingInlineEnd`, its icon `containerGap` from the label (in `labelTypescale`, never
  truncated); the trailing half is as tall, the chevron (`'keyboard_arrow_down'` of the system's icon font, never
  mirrored) between `trailingPaddingInline`. Icon and chevron are drawn at `iconSize` through the icon helper
  (unselected).
- **Corners** (SPB-11, SPB-13) — the outer corners are the state's `containerShape`, the corners where the halves meet
  `containerInnerShape`; while the menu is open the trailing half's inner corners are `containerInnerShapeOpen` and the
  chevron points up — both move over `motionOpenDuration` / `motionOpenEasing` (at once with reduced motion). Fill,
  outline, ripple and focus ring follow each half's own corners, eased by the corner smoothing.
- **Target** (SPB-6) — each half's hit area extends to the touch target above, below and outward, and toward the other
  half only to the middle of the gap (`hitSlop`, mirrored in right-to-left).
- **The menu** (SPB-15, SPB-16) — a `Menu` on `TanreiProvider`'s overlay layer (see "The overlay layer"), anchored to
  the whole split button at `bottom-end`, named by `menuAccessibilityLabel`; focus goes back to the trailing half when it
  closes. The menu's press-catcher gives a press on the trailing half back to it (an internal channel): it is a toggle
  to `false`, not `'outside'`.
- **Accessibility** (SPB-17, SPB-20) — two `button`s in reading order, the leading one named by `label`, the trailing
  one by `menuAccessibilityLabel` with `accessibilityState.expanded`; React Native has no "has a popup" property. The
  icon and chevron are hidden, and the row is no element of its own.
- **Right-to-left** (SPB-19) — the row mirrors (the trailing half on the left) with logical paddings and corners; the
  chevron is not mirrored; a ripple grows from the point of contact.

### `FloatingActionButton`

The single most important action of a screen: one icon on a raised square that floats above the content, named by
`accessibilityLabel` (`specs/fab.spec.json`). **It does not position itself** (FAB-13): it lays out at its own size
where your layout puts it — usually absolutely in the inline-end bottom corner of the screen's root view, clear of any
navigation bar — and draws no scrim.

```tsx
<View style={{ flex: 1 }}>
  <MessageList />
  <FloatingActionButton accessibilityLabel="Compose" icon="edit" onPress={compose} style={{ position: 'absolute', end: 16, bottom: 16 }} />
</View>
```

| Prop | Type | Default | |
|---|---|---|---|
| `variant` | `FloatingActionButtonVariant`: `'filled' \| 'tonal' \| 'surface'` + values the design system added | `'filled'` | Emphasis: `filled` at full strength, `tonal` quieter, `surface` a neutral container (over a map or a photo) with a primary glyph. |
| `size` | `FloatingActionButtonSize`: `'small' \| 'medium' \| 'large'` + values the design system added | `'medium'` | A square of the size's `containerSize` (40 / 48 / 64) with the size's corners `containerShape` (8 / 12 / 16) and an icon of its `iconSize` (20 / 24 / 24). |
| `disabled` | `boolean` | `false` | No `onPress`, not focusable, exposed as disabled. Hiding a FAB whose action is unavailable is usually better. |
| `accessibilityLabel` | `string` | | **Required**: the accessible name (the spec's `label`). Without one the button still renders and development builds warn (FAB-14). `aria-label` / `aria-labelledby` count too. |
| `onPress` | `(event) => void` | | The spec's `click`. |
| `icon` | `string \| ReactNode \| ({ color, size, glyph }) => ReactNode` | | The icon. A **string** is a glyph of the system's icon font (`'add'`), drawn with `iconGlyphStyle` (unselected family and FILL, the system's weight, opsz clamped) at the size's `iconSize` in the icon color of the current state. A **function** receives that color, the size and the `glyph`; any other node is rendered as given. |
| `style` | `StyleProp<ViewStyle>` | | Layout only — this is where the FAB is placed. |
| `ref` | `Ref<View>` | | Forwarded to the underlying `Pressable`. |

Every other `Pressable` prop is passed through. Press hold, the minimum target (`hitSlop` to
`system.measure.target.touch`: 4 on each side of the small 40 square; the medium square is exactly 48), keyboard focus,
`pressedFeedback` (overlay, ripple, dim, none), `focusStyle`, corner smoothing, motion and open axis keys behave exactly
as for `Button` (above); only the parts differ:

- **Parts** (FAB-3, FAB-6, FAB-11) — the host carries the container color, the state's opacity, the size's corners and
  the elevation (`boxShadow` layers and the elevation ring, outside it — nothing clips it). The corners are the size's
  in every state: a FAB has no per-state shape tokens. There is no outline.
- **Elevation per state** (FAB-12) — each state's `containerElevation` is a token. In the default system the FAB rests
  at `level3`, **rises to `level4` under hover**, keeps `level3` under focus and press, and has none when disabled
  (an on-surface fill at 12 % with an on-surface glyph at 38 %). Every shadow layer and the ring's color move with
  `motionStateDuration` / `motionStateEasing`; the press is immediate; reduce motion changes them at once.
  `cupertino` has no hover lift and dims the pressed FAB to 0.7; `m3-like` is 40 / 56 / 96 with a 36 px large icon.
- **Accessibility** — `accessibilityRole="button"`, named by `accessibilityLabel`; the icon box is hidden from
  assistive technology. Its place in the reading order is where you put it in the element tree, not where it is drawn.
- **Text size** — the square is a fixed `width` / `height` and the glyph has `allowFontScaling={false}`: at 200 % text
  size the FAB keeps its size and its label is still announced.
- **The large icon** — the default system's large FAB draws a 24 glyph in a 64 square, because `sys.icon` stops at 24.

### `ExtendedFloatingActionButton`

The FAB with its name written out next to its icon, which collapses to the icon when the room goes away
(`specs/extended-fab.spec.json`). Like the FAB it **does not position itself** (EFB-17).

```tsx
const [scrolled, setScrolled] = useState(false);
<ExtendedFloatingActionButton label="Compose" icon="edit" expanded={!scrolled} onPress={compose} style={{ position: 'absolute', end: 16, bottom: 16 }} />
```

| Prop | Type | Default | |
|---|---|---|---|
| `variant` | `ExtendedFloatingActionButtonVariant`: `'filled' \| 'tonal' \| 'surface'` + values the design system added | `'filled'` | Emphasis, with the FAB's meanings. |
| `size` | `ExtendedFloatingActionButtonSize`: `'small' \| 'medium' \| 'large'` + values the design system added | `'medium'` | Minimum height `containerHeight` (40 / 48 / 64 — the FAB's sides), corners `containerShape`, paddings, gap, `labelTypescale` (`label`, `label`, `heading5`) and `iconSize` of the size. |
| `expanded` | `boolean` | `true` | `false` collapses it to a square of the height holding only the icon; `label` stays the accessible name. **Without an icon it cannot collapse**: it stays expanded and development builds say why (EFB-15). |
| `disabled` | `boolean` | `false` | No `onPress`, not focusable, exposed as disabled. |
| `label` | `string` | `''` | The visible text and the accessible name (EFB-19: empty still renders, and development builds warn). Never truncated: it wraps when the layout gives it less width, and the container grows with it. |
| `accessibilityLabel` | `string` | `label` | Overrides the accessible name. |
| `onPress` | `(event) => void` | | The spec's `click`. |
| `icon` | `string \| ReactNode \| ({ color, size, glyph }) => ReactNode` | | Leading icon **in the label color** (the extended FAB has no icon color of its own, as Button). A string is a glyph of the system's icon font (`'edit'`); a function receives the color, the size and the unselected `glyph`. |
| `style` | `StyleProp<ViewStyle>` | | Layout only — this is where it is placed. |
| `ref` | `Ref<View>` | | Forwarded to the underlying `Pressable`. |

Every other `Pressable` prop is passed through. Press, focus, target, corner smoothing and open keys behave as for
`Button`; elevation per state as for `FloatingActionButton` (level3 at rest, level4 under hover in the default system).

- **Geometry** (EFB-11) — a row: the icon, then the label, `containerGap` apart; `paddingStart` is
  `containerPaddingInlineStartWithIcon` with an icon and `containerPaddingInlineStart` without, `paddingEnd` is
  `containerPaddingInlineEnd`, `paddingVertical` `containerPaddingBlock`; the height is a minimum. Logical paddings and
  a `row` mirror in right-to-left (EFB-18).
- **Collapse** (EFB-13, EFB-14) — collapsed, the host is a fixed `width` / `height` of `containerHeight` with the icon
  centered and **no label node** (the host's `accessibilityLabel` still names it). Between the two forms the width moves
  over `motionResizeDuration` / `motionResizeEasing` (the standard spatial spring's duration and curve): the paddings and
  the gap move, and the label sits in a clip (`<testID>.label-clip`, `overflow: 'hidden'`) whose width moves between 0
  and the label's width while its opacity fades. The label's width is what it measured when it was last laid out
  (`onLayout`); one that was never laid out (mounted collapsed) is measured off the flow when the width starts to move.
  Reduce motion changes it at once. **Which edge stays put is your layout's**: anchor it with `end` to collapse toward
  the inline-end corner. The resize runs on the JS thread (widths and paddings cannot use the native driver).
- **Text size** — the label scales with the system font size and the container grows with it (a `minHeight`); the
  glyph does not scale.

### `FabMenu`

A floating action button that opens a short column of related actions above itself (`specs/fab-menu.spec.json`): the
toggle is a FAB (its own tokens, `system.components.fabMenu`) whose look turns to its `open…` parts, its corners to
`containerShapeOpen` and its glyph to the close glyph while open; the items are drawn on `TanreiProvider`'s overlay
layer, as the `Menu` is. You position the toggle, as you would a `FloatingActionButton`.

```tsx
const [open, setOpen] = useState(false);

<View style={{ position: 'absolute', end: 16, bottom: 16 }}>
  <FabMenu
    icon="add"
    accessibilityLabel="Create"
    visible={open}
    onToggle={setOpen}
    onDismiss={() => setOpen(false)}
    items={[
      { label: 'Document', icon: 'description', onPress: newDocument },
      { label: 'Folder', icon: 'create_new_folder', onPress: newFolder },
    ]}
  />
</View>
```

| Prop | Type | Default | |
|---|---|---|---|
| `variant` | `FabMenuVariant`: `'filled' \| 'tonal' \| 'surface'` + your system's | `'filled'` | Colors the toggle (closed and open) and the items. An open key: unknown values render as `filled` (FBM-7). |
| `size` | `FabMenuSize`: `'small' \| 'medium' \| 'large'` + your system's | `'medium'` | The toggle's square (40 / 48 / 64 in the default system); the items keep one size. |
| `visible` | `boolean` | `false` | The spec's `open`. **Controlled**: set it from `onToggle`, and to `false` from `onDismiss`. |
| `accessibilityLabel` | `string` | | The spec's `label`: names the toggle and the list ("Create"). Required. |
| `disabled` | `boolean` | `false` | The toggle is drawn closed from its disabled tokens, is not focusable and emits nothing; no items. |
| `icon` | glyph name, function or node | | The toggle's glyph while closed (the spec's `icon` slot). |
| `onToggle` | `(open: boolean) => void` | | The spec's `toggle`: a press, Enter or Space asks for the opposite of `visible`; Down or Up Arrow on a closed toggle asks to open (Up Arrow then focuses the item nearest the toggle). |
| `onDismiss` | `(reason: FabMenuDismissReason) => void` | | The spec's `close`: `'escape'`, `'back'`, `'outside'`, `'tab'`, `'focus-out'` (focus left the items and the toggle) or `'item'` (after the item's `onPress`). |
| `items` | `readonly FabMenuItem[]` | | `{ label, icon, onPress?, testID? }`, first at the top: two to six. |
| `positionText` | `(position, count) => string` | `"2 of 3"` | How an item's position is announced, in your language. |
| `inline` | `boolean` | `false` | **Tests and the gallery only** (FBM-13's `verify`): the open items in place above the toggle, settled — no overlay layer, placement, motion or focus move. |

- **The toggle** (FBM-3 … FBM-11, FBM-21) — a square of the size's `containerSize` with the size's `containerShape`
  (`containerShapeOpen` while open), its glyph at `iconSize` (unselected) — the `icon` while closed, `'close'` while
  open. Its closed parts, or its `open…` parts, of the variant in the state that wins; Button's press hold, ripple,
  dim and state motion; its elevation cast outside it. Hit area: the touch target on both axes (`hitSlop`).
- **The items** (FBM-5, FBM-13, FBM-18, FBM-22) — a column above the toggle, `listOffset` from its top edge and
  `listGap` apart, each item's end edge on the toggle's (its left edge in right-to-left), placed by measuring the toggle
  (`measureInWindow`) when it opens and when the window changes. Each item is at least `itemHeight` and the touch target
  tall, as wide as its icon (`itemIconSize`) and label (`itemLabelTypescale`, wrapping, never truncated) `itemGap`
  apart with `itemPaddingInlineStart` / `…End`, corners `itemShape`, its item elevation, its own states from the
  `item…` parts; no `hitSlop` (stacked items never extend over each other).
- **Motion** (FBM-19) — opening moves the toggle's look, corners and a cross-faded glyph over `motionOpenDuration` /
  `motionOpenEasing`, and fades and grows each item in from its end edge, the one nearest the toggle first and each next
  one `motionStagger` later (native driver); closing reverses the toggle over `motionCloseDuration` /
  `motionCloseEasing` and fades every item out together. Reduced motion: at once.
- **Focus and dismissal** (FBM-13 … FBM-17) — an operated overlay that is not modal: opening moves focus to
  the first item (the last after Up Arrow), closing gives it back to the toggle when it was in the items. Down and Up
  Arrow move through the items, wrapping, Home and End to the ends. Escape, Android's back button (`BackHandler`), Tab
  (consumed: the next Tab moves on from the toggle) and focus leaving the items and the toggle ask to close. No scrim:
  an invisible press-catcher fills the layer, so **a press outside closes the menu and does not reach what is under
  it**, as the `Menu`'s; a press on the toggle is the toggle's (`onToggle(false)`, not `'outside'`).
- **Accessibility** (FBM-20, FBM-23) — the toggle is a `button` named by `accessibilityLabel` with
  `accessibilityState.expanded` (React Native has no "has a popup" property); the open list is `role="menu"` named by
  it, each item a `menuitem` named by its label with its position. Icons are hidden. A missing name, an item without a
  label or icon, and fewer than two or more than six items are reported in development builds.

### `Badge`

A dot or a small count on the top-end corner of an anchor — an icon, an `IconButton`, a navigation item, an avatar —
that says something is waiting (`specs/badge.spec.json`). The anchor is `children`.

```tsx
<Badge count={unread} label={`${unread} unread`}>
  <IconButton accessibilityLabel="Inbox" onPress={openInbox}>inbox</IconButton>
</Badge>
```

| Prop | Type | Default | |
|---|---|---|---|
| `count` | `number \| null` | `null` | `null` (or `undefined`) draws the dot; 0 draws nothing; above 0 draws the number. |
| `max` | `number` | `999` | The largest count shown as it is; a larger one shows as `999+`. |
| `label` | `string` | `''` | What assistive technology reads after the anchor's own name (`"3 unread"`). Empty reads the displayed count; a dot needs one. |
| `children` | `ReactNode` | | The anchor. One element receives the description (below); a **string** is a glyph of the system's icon font at `measure.icon.large` in `onSurfaceVariant`, named by its glyph name (`"mail"`) with `label` as its value (`"mail, 3 unread"`) — what the spec's fixtures are (its default slot); several nodes are grouped into one accessible element that carries it. |
| `style` | `StyleProp<ViewStyle>` | | Layout of the anchor's box (margins, `alignSelf`). |

Every other `View` prop is passed through to the anchor's box.

- **Forms** (BDG-1 … BDG-4) — the dot is a circle of diameter `badge.dotSize` in `containerColor` whatever
  `containerShape` is, its center `dotOffset` inside the corner on both axes. The count is a pill of at least
  `containerHeight` high and at least as wide as it is drawn high (`minHeight` / `minWidth`), with
  `containerPaddingInline` on each side, `containerShape`, and the number in `labelTypescale` / `labelColor`. The center
  of its leading circle — a square of the pill's DRAWN height at its start — sits `containerOffset` inside the corner,
  and a longer count grows toward the end (`start: '100%'` with a negative `marginStart`). A count above `max` shows `max+`.
- **Takes nothing from its anchor** (BDG-7) — the box is the anchor's own size (`alignSelf: 'flex-start'`, no padding);
  the badge is absolute, `pointerEvents: 'none'`, and never focusable: a press over it reaches the anchor. The box is a
  row on purpose: Yoga constrains an absolute child of a column to the column's width, which would wrap `999+` over a
  20-wide icon.
- **Outline** (BDG-6) — `outlineWidth` of `outlineColor` outside the dot or the pill (a `Ring`), so it never changes the
  badge's size or place. A system whose outline color resolves to nothing (`m3-like`, `cupertino`) draws no outline element.
- **Accessibility** (BDG-8 … BDG-10) — the badge has no role or name: its drawing is hidden (`accessible={false}`,
  `accessibilityElementsHidden`, `importantForAccessibility="no-hide-descendants"`) and `label` — or, without one, the
  displayed text (`999+`) — is appended to the anchor's `accessibilityValue.text` (after the anchor's own value text,
  if it has one), which VoiceOver and TalkBack read after the anchor's name and role ("Inbox, button, 3 unread" is the
  intent; not yet checked on a device). The anchor must pass `accessibilityValue`
  on to its host (every Tanrei component and React Native's own do). A count of 0 leaves the anchor untouched. A change
  updates the value and announces nothing (no live region, no `announceForAccessibility`); a product that must announce
  uses a live region of its own. A dot without a label still renders and development builds say it tells assistive
  technology nothing (BDG-9).
- **Text** (BDG-11 … BDG-13) — the number is formatted with `Intl.NumberFormat` in the runtime's locale with no grouping
  (`1200`, not `1,200`; Hermes has `Intl`, other runtimes fall back to `String(count)`), drawn with
  `fontVariant: ['tabular-nums']`, and wrapped in Unicode directional isolates (FSI … PDI) so a capped count keeps its
  plus sign after the digits in right-to-left text. Font scaling is on: the pill grows with enlarged text, and the
  center of its leading circle (a square of the grown height) stays in place — the pill measures its drawn height
  (`onLayout`) and is placed by `containerHeight` until then, so at enlarged text the first frame is drawn from the
  minimum; the dot keeps `dotSize`. Placement is logical (`start` / `end`), so in right-to-left layouts
  the badge sits on the anchor's top-left corner and grows to the left.
- **Corrected values** (BDG-14) — a negative count or one that is not a number (`NaN`, or another type from untyped
  code) renders as 0 — nothing drawn, nothing announced — a fraction is rounded down, a `max` below 1 is 999;
  development builds report each.

### `ProgressIndicator`

How far a task has come — or that it is under way — as a bar or a ring (`specs/progress-indicator.spec.json`).

```tsx
<ProgressIndicator accessibilityLabel="Uploading report.pdf" value={sent} max={total} valueText={`${sent} of ${total} files`} />
<ProgressIndicator variant="circular" size="small" accessibilityLabel="Syncing" />
```

| Prop | Type | Default | |
|---|---|---|---|
| `variant` | `'linear' \| 'circular'` | `'linear'` | A bar that fills the width its layout gives it, or a ring of a fixed size. Drawn by code, not a token axis; unknown values render as `linear` (PRG-12). |
| `size` | `ProgressIndicatorSize`: `'small' \| 'medium' \| 'large'` + values the design system added | `'medium'` | The bar's `linearThickness` (2 / 4 / 8) or the ring's `circularSize` (16 / 24 / 40) with its `circularThickness` stroke. |
| `value` | `number \| null` | `null` | Between `min` and `max`. `null` / `undefined` is indeterminate. |
| `min`, `max` | `number` | `0`, `1` | The range. |
| `accessibilityLabel` | `string` | | **Required**: the accessible name (the spec's `label`) — what is in progress. Without one it still renders and development builds warn (PRG-15). |
| `valueText` | `string` | `''` | How the value is read when a percentage is not the natural reading (`"3 of 10 files"`). |
| `style` | `StyleProp<ViewStyle>` | | Layout only (margins, a width for a bar). |

Every other `View` prop is passed through.

- **Drawing** (PRG-1, PRG-3 … PRG-5) — a bar is a row of `linearThickness` stretched across its layout: the track under
  an indicator whose width is the fraction `(value − min) / (max − min)` (a percentage, so it needs no layout pass),
  ends rounded by `trackShape` clamped to half the thickness. With a `trackGap` and a value strictly between the ends,
  the rest of the track starts that far after the indicator's end (`m3-like`); a `stopIndicatorSize` above 0 draws a dot in the
  indicator color, centered in the thickness with its center half the thickness before the track's end (concentric
  with the rounded end). A ring is drawn **with views only** (the package takes
  no SVG): a bordered circle for the whole track, and each arc as one or two halves — a bordered circle clipped by two
  half-planes, every border one color, so no platform has to join two border colors — plus round caps (a dot of the
  stroke's width at each end) unless `trackShape` is 0. A ring leaves the gap at BOTH ends of the indicator's
  arc, measured along its center line with the caps' reach included.
- **Motion** (PRG-2, PRG-6, PRG-7) — a value change moves the indicator's end over `motionValueDuration` with
  `motionValueEasing` (JavaScript-driven: a width); a switch between determinate and indeterminate is immediate.
  Indeterminate, a bar moves a segment two fifths long from −40 % to 100 % once per `motionCycleDuration` with
  `motionCycleEasing` (JavaScript-driven: a layout position, clipped by the track); a ring turns a quarter arc at constant
  speed (native driver). Under reduced motion values change at once and the indeterminate form stands still: the whole
  track in the indicator color, its opacity 1 → 0 → 1 once per cycle (native driver). The loop does not start until
  `AccessibilityInfo.isReduceMotionEnabled()` has answered, so a person who asked for less motion never sees it begin.
- **Off screen** (PRG-14) — the loop stops while the app is in the background (`AppState`) and restarts at the start of
  a cycle when it comes back. **What React Native cannot do:** it has no API that says a view is scrolled out of view or
  in a hidden screen, so the loop keeps running there; unmount the indicator when its
  screen is not shown.
- **Accessibility** (PRG-8 … PRG-11) — `accessibilityRole="progressbar"` named by `accessibilityLabel` (iOS gives the
  role the "updates frequently" trait); determinate: `accessibilityValue={{ min, max, now, text }}` with the clamped
  value and `valueText`; indeterminate: `accessibilityState={{ busy: true }}` and no value. Never focusable, never a live
  region, nothing announced. A value outside the range is drawn and exposed clamped; a `max` not above `min` draws the
  track alone and exposes 0 of 0–1; development builds report both.
- **Direction** (PRG-13) — a bar is logical (`width` from the start, `start` for the moving segment, `marginStart` for the
  gap, `end` for the stop indicator), so it fills from the right in right-to-left layouts; a ring is laid out
  `direction: 'ltr'` and turns clockwise everywhere, as a clock does.

### `LoadingIndicator`

A short wait of unknown length, inline or over content (`specs/loading-indicator.spec.json`). Not React Native's
`ActivityIndicator`, which draws the platform's own spinner and cannot follow the tokens.

```tsx
<LoadingIndicator accessibilityLabel="Loading messages" />
<LoadingIndicator accessibilityLabel="Refreshing" size="large" contained />
```

| Prop | Type | Default | |
|---|---|---|---|
| `size` | `LoadingIndicatorSize`: `'small' \| 'medium' \| 'large'` + values the design system added | `'medium'` | The mark's `indicatorSize` (16 / 24 / 40) and `indicatorThickness`; contained, a `containerSize` (24 / 32 / 48) circle. Unknown values render as `medium` (LDG-9). |
| `contained` | `boolean` | `false` | Draws the mark on a raised circle of its own, for waits over content. |
| `accessibilityLabel` | `string` | | **Required**: the accessible name (the spec's `label`) — what is loading. Without one it still renders and development builds warn (LDG-10). |
| `style` | `StyleProp<ViewStyle>` | | Layout only (margins, a position over content). |

Every other `View` prop is passed through.

- **Drawing** (LDG-1 … LDG-3) — a quarter arc with round caps, drawn with the same views-only `Arc` as the progress
  ring, turning clockwise once per `motionCycleDuration` at constant speed (`sys.motion.easing.linear`, native driver);
  no track. Not contained, the component is exactly the mark's square; contained, a `containerSize` square with
  `containerShape`, filled with `containedContainerColor` and raised by `containedContainerElevation` (the same
  `boxShadow` + outside ring as Button's elevation; `level0` draws neither), the mark centered in
  `containedIndicatorColor`.
- **Reduced motion** (LDG-4) — the arc stops turning: the whole circle at the mark's size and stroke, its opacity
  1 → 0 → 1 once per cycle with `sys.motion.easing.standard`; the container stays still and opaque. The loop waits for
  `AccessibilityInfo.isReduceMotionEnabled()` to answer before it starts.
- **Off screen** (LDG-7) — as the progress indicator: stopped while the app is in the background; React Native cannot
  tell that a view is scrolled out of view.
- **Accessibility** (LDG-5, LDG-6) — `accessibilityRole="progressbar"` named by `accessibilityLabel`,
  `accessibilityState={{ busy: true }}`, no value; never focusable, never a live region, nothing announced. Mark the
  region being loaded as busy, and announce its arrival, in the product.
- **Direction** (LDG-8) — never mirrored: laid out `direction: 'ltr'`, clockwise everywhere.

### `Divider`

A thin line that separates groups of content (`specs/divider.spec.json`). It has no interaction and no states.

| Prop | Type | Default | |
|---|---|---|---|
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Horizontal separates stacked content (in a column); vertical separates content in a row. Unknown values render as `horizontal`, reported in development builds (DIV-7). |
| `inset` | `'none' \| 'start' \| 'both'` | `'none'` | Shortens the line by `divider.lineInset` (16) at its start — the logical start of a horizontal line, the top of a vertical one — or at both ends. |
| `decorative` | `boolean` | `true` | Hidden from assistive technology. `false` exposes it as a separator, for groups whose grouping is meaningful (a toolbar's, a menu's). |
| `style` | `StyleProp<ViewStyle>` | | Layout only (margins, a fixed length). |

Every other `View` prop is passed through.

- **Length and thickness** (DIV-1, DIV-2) — the host is `alignSelf: 'stretch'` and exactly `divider.lineThickness` across:
  a horizontal divider spans the width of the column it is in, a vertical one the height of the row it is in (give the
  row a height, or let its tallest child set it). The divider has no margin or padding of its own: put the space around
  it in the layout (`gap`, the caller's `style`). The line is a child of the host, positioned by the inset, so the inset
  stretch draws nothing.
- **Pixel grid** (DIV-8) — thickness and inset are rounded to whole device pixels (`PixelRatio.roundToNearestPixel`),
  and the line is never thinner than one device pixel (`1 / PixelRatio.get()`). Yoga rounds layout positions to the same
  grid, so the line never straddles two rows of pixels. A thickness of 1 is one point — two or three device pixels; the
  "one device pixel" hairline of Apple's separators is a recorded mimicry gap (`device-pixel-hairline`), not something
  this component fakes.
- **Direction** (DIV-4) — a horizontal inset is logical (`start` / `end`), so it moves to the right end in right-to-left
  layouts; a vertical inset is `top` / `bottom` in every direction.
- **Accessibility** (DIV-5, DIV-6) — decorative: `accessible={false}`, `accessibilityElementsHidden` (iOS) and
  `importantForAccessibility="no-hide-descendants"` (Android). Not decorative: `role="separator"` with no accessible
  name, never keyboard-focusable. **What React Native cannot do:** it has no orientation semantics (no
  `aria-orientation` prop), and neither iOS nor Android has a native separator trait, so the orientation is not exposed
  and what VoiceOver and TalkBack say for the element is not yet checked on a device. On `react-native-web` the role
  becomes `role="separator"`.

### Selection controls: `Checkbox`, `RadioButton` / `RadioGroup`, `Switch`

Three controls that turn a choice on or off, built the same way: the host is a pressable **row** that holds
the control and its label, so a press on the label is a press on the control (CHK-7 / RAD-9 / SWT-5); the
component's `container` is a **round state layer behind the control** — hover, focus and press show there, never on the
box, ring or track — and it is invisible at rest (no `backgroundColor` at all). Every part is drawn from the tokens of
its **condition** (`system.components.<name>.conditions.<condition>.<state>`) in the current interaction
state: the props pick the condition, `resolveInteractionState` the state, and nothing is computed. The conditions are
an open token axis that no prop names, so a value a layer adds is never drawn and never reported.

Common to all three:

- **Controlled** — they never change themselves; activation calls the callback with the new value and the caller sets
  the prop, as React Native's own `Switch` (`value` / `onValueChange`).
- `label` is the accessible name, drawn at the inline end of the control `label.gap` away in `label.typescale`
  (`flexShrink: 1`, no line limit, font scaling on — the label wraps at 200 % text; the control keeps its size).
  `labelHidden` keeps the name and draws nothing. Without a name (empty `label`, no `accessibilityLabel` /
  `aria-label` / `aria-labelledby`) the control still renders and works, and development builds warn once.
- The row is `flexDirection: 'row'`, which React Native mirrors in a right-to-left layout: the label moves to the left.
  Nothing is placed with `left` / `right`.
- Press hold, keyboard focus, `pressedFeedback` (overlay, ripple, dim, none), `focusStyle`, corner smoothing and the
  state motion behave exactly as for `Button`. **The ripple grows in the round container**, not in the row: the point
  of contact is measured against the container (a switch's moves with its handle); a press outside it — on the label —
  and a keyboard or assistive activation grow from its center, the latter even before the first layout pass
  (`usePressInteraction({ rippleArea })`; CHK-10, RAD-12, SWT-8).
- **Minimum target** — `hitSlop` to `system.measure.target.touch` on both axes: from the container's square (the
  switch: its track) until the first layout pass, then from the whole row, label included.
- **Two motions** (CHK-5 / RAD-7 / SWT-3) — the state layer, the label and the opacity move with `motionStateDuration`
  / `motionStateEasing` (a press is immediate). The control's own parts (box, outline, mark; ring, dot; track, outline,
  handle, glyph) move the same way when an interaction STATE recolors them, and with the component's **selection**
  tokens (`motionSelectionDuration` / `motionSelectionEasing`) only when the **condition** changes
  (`useControlTransition`: the motion is chosen when the drawn values change and kept for that transition). The marks
  (check, dash, dot) and the switch's travel change only with the condition. Reduce motion shows every change at once.
- **First line** (CHK-15 / RAD-17 / SWT-15) — the row is `alignItems: 'flex-start'` and the control (the switch: its
  track) is centered on the label's FIRST line: whichever is taller — the control or the line — pushes the other down by
  half the difference (`marginTop`). The line is the type style's `lineHeight` until the label is laid out, then the
  measured first line (`onTextLayout`), which follows the system's text size; a wrapped label grows downwards.
- Every other `Pressable` prop is passed through; `ref` is forwarded to the host; `style` is layout only.

#### `Checkbox`

```tsx
<Checkbox label="I accept the terms" value={accepted} error={submitted && !accepted} onValueChange={setAccepted} />
<Checkbox label="Select all" value={all} indeterminate={some && !all} onValueChange={selectAll} />
```

| Prop | Type | Default | |
|---|---|---|---|
| `value` | `boolean` | `false` | The spec's `checked`. |
| `indeterminate` | `boolean` | `false` | Partly on. Wins over `value` for what is drawn and announced (`checked: 'mixed'`). Activation asks for `true` (CHK-2); the caller clears it. |
| `error` | `boolean` | `false` | Draws the `error-` form of the condition. See the accessibility note below. |
| `disabled` | `boolean` | `false` | No `onValueChange`, not focusable, exposed as disabled; the round layer stays clear. |
| `label` / `labelHidden` | `string` / `boolean` | `''` / `false` | See above. |
| `onValueChange` | `(value: boolean) => void` | | The spec's `change`: `!value`, or `true` from indeterminate. Called after `onPress`. |

- **Condition** (CHK-4) — `indeterminate` → `indeterminate`, else `value` → `selected`, else `unselected`; `error` picks
  the `error…` form (`conditions.errorSelected`, …).
- **Geometry** (CHK-12) — a `boxSize` square with `boxShape` corners, centered in the `containerSize` round layer; the
  outline (`outlineWidth`) is a `Ring` inside the box's edge and the fill sits inside the outline (inset by its width),
  never under it, so a translucent disabled fill and outline do not stack. The mark is stroked at `markWidth` in
  `markColor` with square caps (half a stroke past each end), along the spec's center line in fractions of the box
  side: a check through (0.2, 0.5) → (0.4, 0.7) → (0.8, 0.3), or a dash from (0.1375, 0.5) to (0.8625, 0.5); nothing
  while unselected. The mark's legs are views (no SVG): positions are physical and the mark is `direction: 'ltr'`, so a check
  is never mirrored.
- **Motion** (CHK-13) — the check draws along its path (the first leg, then the second, each growing from its start);
  the dash grows from its center (`scaleX`); both reverse when the mark goes away, and a mark at rest at 0 has no node.
- **Accessibility** (CHK-14) — `accessibilityRole="checkbox"`, `accessibilityState.checked` `false` / `true` /
  `'mixed'`. **What React Native cannot do:** it has no invalid state (no `aria-invalid`, nothing in
  `accessibilityState`), so `error` is drawn but **not announced**; the form's message reaches assistive technology
  through the caller's own `accessibilityHint` (passed through) or a live region.

#### `RadioButton` and `RadioGroup`

```tsx
<RadioGroup accessibilityLabel="How often?">
  <RadioButton value="daily" label="Daily" selected={frequency === 'daily'} onSelect={setFrequency} />
  <RadioButton value="weekly" label="Weekly" selected={frequency === 'weekly'} onSelect={setFrequency} />
</RadioGroup>
```

| Prop | Type | Default | |
|---|---|---|---|
| `selected` | `boolean` | `false` | Whether this option is the chosen one. |
| `value` | `string` | `''` | What the option stands for: `onSelect` receives it. |
| `disabled` | `boolean` | `false` | Not selectable, not focusable, skipped by the arrow keys. |
| `label` / `labelHidden` | `string` / `boolean` | `''` / `false` | See above. |
| `onSelect` | `(value: string) => void` | | The spec's `change`: only when an unselected option is activated (RAD-2); the caller moves `selected`, which unselects the others (RAD-3). |

`RadioGroup` is the spec's `name` (React Native has no group idiom): a `View` with `accessibilityRole="radiogroup"` and
the product's `accessibilityLabel` (the question), no tokens and nothing drawn. `positionText(position, count)` words
the position (default English `"2 of 3"`); every other `View` prop is passed through.

- **Geometry** (RAD-14) — a `ringSize` circle stroked at `ringWidth` inside its diameter (a `Ring`), centered in the
  round layer; while selected a `dotSize` dot centered in it. The dot grows from the ring's center (`scale`) and the ring
  color changes over the selection tokens (RAD-15); unselected, there is no dot node.
- **In a group** (RAD-4, RAD-5, RAD-16) — each option is `accessibilityRole="radio"` with `accessibilityState.checked`
  and its position and the group's size as `accessibilityValue.text`; iOS has no radio trait, so there it also carries
  `selected`. **One tab stop**: only the selected option (else the first enabled one) is `focusable`. **Arrow keys**:
  the group handles `onKeyDown` (Down / Right → next enabled option, Up / Left → previous, wrapping; Left and Right swap
  when `I18nManager.isRTL`), moves focus to that option (`focus()`) and selects it. **What is not verified:** React
  Native 0.87 declares `onKeyDown` on `View` (its TypeScript types do not yet), but whether iOS and Android deliver
  arrow keys to it has not been checked on a device; where they do not, the single tab stop leaves a keyboard user
  only the selected option. Order is the order in which options mount: an option
  inserted between others later is counted last. An option outside a group is
  focusable on its own and has no position.

#### `Switch`

Not React Native's core `Switch` (which cannot draw these tokens).

| Prop | Type | Default | |
|---|---|---|---|
| `value` | `boolean` | `false` | The spec's `selected`: on. |
| `disabled` | `boolean` | `false` | No `onValueChange`, not focusable, exposed as disabled. |
| `label` / `labelHidden` | `string` / `boolean` | `''` / `false` | See above; the label sits at the inline end of the track. |
| `selectedIcon` / `unselectedIcon` | `string` | `''` | A glyph of the system's icon font for the handle while on / off (`'check'`, `'close'`); empty shows none. |
| `onValueChange` | `(value: boolean) => void` | | The spec's `change`: `!value`, after `onPress`. |

- **Geometry** (SWT-10, SWT-11) — a `trackWidth` × `trackHeight` track with `trackShape` corners; its outline inside the
  edge and its fill inside the outline. The handle's center is on the midline, `trackHeight / 2` from the inline-start
  end (off) or the inline-end end (on). The round layer (`containerSize`) is absolute, centered on the handle and
  moving with it (it may extend beyond the track without changing the layout); its position is a logical `start`, so
  right-to-left mirrors the positions and the travel. The focus ring is around the track.
- **The handle** (SWT-3, SWT-12) — color, size and elevation come from the condition's state tokens (`m3-like` grows
  it to 28 under a press; `cupertino` raises it at `level1`), at least `handleSizeWithIcon` while it shows a glyph. The
  glyph is drawn with `iconGlyphStyle` at `iconSize` — the family and fill of the condition, the system's weight, the
  optical size clamped — in `iconColor`, font scaling off, and hidden from assistive technology. The same limit as
  `IconButton`: with one variable icon family a selected glyph is drawn **unfilled** (see "Icons").
- **Motion** (SWT-13) — the handle travels (`start`), changes size and color, and the track and outline change color,
  together over the selection tokens — the switch's spring (`motion.spring.standard.fast-spatial` as a duration and a
  cubic-bézier that overshoots). The handle's elevation moves layer by layer with them.
- **Accessibility** (SWT-14) — `accessibilityRole="switch"` with `accessibilityState.checked` (on / off), never a
  checkbox. Dragging the handle is not part of the spec: a tap anywhere on the row toggles.

### `Chip`

A compact choice, a suggested action or an item the user entered, as a small labelled control
(`specs/chip.spec.json`). `kind` decides what it does, its role and its parts; `variant` decides how it looks.

```tsx
<Chip label="Add to calendar" icon="event" onPress={addToCalendar} />
<Chip kind="filter" label="Vegetarian" selected={vegetarian} onSelectedChange={setVegetarian} />
<Chip kind="input" label="Ada Lovelace" avatar={{ uri: ada.photo }} removeAccessibilityLabel="Remove Ada Lovelace" onRemove={() => removeRecipient(ada)} />
```

| Prop | Type | Default | |
|---|---|---|---|
| `kind` | `ChipKind`: `'action' \| 'filter' \| 'input'` | `'action'` | `action`: a button. `filter`: on or off. `input`: an entered item with a remove action. A closed choice: an unknown value renders as `action` and development builds report it. |
| `variant` | `ChipVariant`: `'outlined' \| 'elevated'` + values the design system added | `'outlined'` | `outlined` flat with an edge on a plain surface; `elevated` raised over media or a busy background. |
| `size` | `ChipSize`: `'small' \| 'medium'` + values the design system added | `'medium'` | Minimum height 24 / 32, with the size's paddings, gap, `labelTypescale`, `iconSize`, `avatarSize` and `removeContainerSize`. |
| `selected` | `boolean` | `false` | Whether a filter chip is on. **Controlled**: activation calls `onSelectedChange(!selected)`. Ignored unless `kind="filter"`. |
| `disabled` | `boolean` | `false` | No `onPress` / `onSelectedChange` / `onRemove`; neither the chip nor its remove action is focusable. |
| `label` | `string` | `''` | The visible text and the accessible name, on one line (CHP-17). Empty still renders, and development builds warn (CHP-26). |
| `accessibilityLabel` | `string` | `label` | Overrides the chip's accessible name. |
| `removeAccessibilityLabel` | `string` | `''` | The spec's `removeLabel`: the accessible name of an input chip's remove action. Name the item (`"Remove Ada Lovelace"`) — it is a separate element. Missing on an input chip: development builds warn. |
| `onPress` | `(event) => void` | | The spec's `click`: the chip itself was activated — never its remove action. |
| `onSelectedChange` | `(selected: boolean) => void` | | The spec's `change`: a filter chip was activated; called after `onPress` with the new value. |
| `onRemove` | `() => void` | | The spec's `remove`: the remove action, or Backspace / Delete on the focused input chip. **The chip does not remove itself or move focus** (CHP-22): remove it from your list and focus a neighbour. |
| `icon` | `string \| ReactNode \| ({ color, size, glyph }) => ReactNode` | | Leading glyph of the system's icon font (`'event'`), a function, or a node — in the look's icon color. A filter chip that is on shows a check in its place. |
| `avatar` | `ImageSourcePropType` | | An input chip's leading image, in place of the icon: `avatarSize` clipped to `avatarShape`, decorative. **Ignored** on other kinds (development builds report it). |
| `style` | `StyleProp<ViewStyle>` | | Layout of the chip's container (margins, `alignSelf`, `maxWidth`). |
| `ref` | `Ref<View>` | | Forwarded to the chip's `Pressable`. |

Every other `Pressable` prop is passed to the chip's `Pressable`. Press hold, the minimum target, keyboard focus,
`pressedFeedback`, `focusStyle`, corner smoothing, motion and the open axis keys behave as for `Button`; only the parts
differ:

- **Parts** (CHP-16) — a container `View` draws the chip: `minHeight`, `containerShape`, the fill, the elevation
  (`boxShadow` and the ring, outside it), the outline (an inside `Ring`, `outlineWidth`), the ripple and the focus ring.
  In it sit **two siblings**: the chip's `Pressable` (role button; the leading icon, check or avatar `containerGap`
  before the label; `paddingStart` is `containerPaddingInlineWithIcon` for a glyph, `…WithAvatar` for an avatar,
  `containerPaddingInline` for bare text) and, on an input chip, the remove action. They are siblings because an
  accessible element hides the elements inside it from VoiceOver, and the remove action must be its own element
  (CHP-18). The paddings are logical, so the row mirrors in right-to-left and the remove action sits at the left (CHP-25).
- **Looks** (CHP-12) — a filter chip that is on is drawn from its variant's `selected…` parts
  (`selectedContainerColor`, `selectedOutlineColor`, `selectedLabelColor`, `selectedIconColor`,
  `selectedContainerElevation`); every other chip from the variant's own parts. `selected` on another kind changes
  nothing, and only a filter chip exposes `accessibilityState.selected` (iOS's selected trait) — as a toggle
  `IconButton` does (CHP-11).
- **The check** (CHP-13, CHP-14) — the glyph `'check'` of the system's icon font, drawn in the SELECTED glyph style (so
  in the default system and every shipped preset it is drawn **unfilled** — see "Icons"). Turning on or off moves the
  colors and elevation over `motionSelectionDuration` / `motionSelectionEasing` (a state change uses the state motion);
  a chip without an icon grows the check's box from nothing and moves its start padding with it. Reduce motion: at once.
- **The remove action** (CHP-18 … CHP-21) — a `Pressable` (role button, named by `removeAccessibilityLabel`) holding the
  glyph `'close'` at `iconSize` in `removeIconColor`, on a round container of `removeContainerSize` /
  `removeContainerShape` centered on the glyph. It has its **own** state: hovering, focusing or pressing it draws
  `removeContainerColor` / `removeIconColor` of its state (a state layer: nothing at rest in the default system), holds
  the press, ripples inside its round container (from its center when the press lands outside it), and shows its focus
  ring around that container — the chip keeps its own state. Its `hitSlop` reaches `system.measure.target.touch` on both
  axes but toward the label only as far as `containerGap` (never over the label); the rest reaches outward, beyond the
  chip. On Android a hit area cannot extend past the parent's bounds: leave room around a row of input chips.
- **Keyboard** (CHP-19, CHP-23) — one tab stop, two on an input chip (the chip, then its remove action); no arrow keys:
  moving between chips, single or multiple selection and wrapping belong to the layout that holds them (a future chip
  group). Backspace / Delete on a focused input chip call `onRemove` through `onKeyDown`, which
  React Native 0.87 declares on `View` but whose delivery on iOS and Android has not been checked on a device.
- **Label** (CHP-17) — `numberOfLines={1}`: it ends in an ellipsis only when the layout gives the chip less width; the
  full label stays the accessible name. The height is a minimum, so larger text grows the chip.
- **Glyph names** — the check and the close glyph are the ligature names `'check'` and `'close'` of the system's icon
  font; an icon set without them cannot draw them.

### `Card`

Sets a group of related content apart from its background — by depth, by tone or by an edge — and can be one action
that opens what it shows (`specs/card.spec.json`). The content is `children`; the card does not lay it out.

```tsx
// Text inside a card reads the card's content color (React Native has no inherited text color).
function CardText({ role = 'body', children }: { role?: TanreiTypescaleRole; children: ReactNode }) {
  const { text } = useTanrei();
  return <Text style={[text(role), { color: useContentColor() }]}>{children}</Text>;
}

// A container: its own buttons stay reachable.
<Card variant="filled">
  <CardText role="heading5">Quarterly report</CardText>
  <CardText>Revenue grew 12%.</CardText>
  <Button variant="text" onPress={share}>Share</Button>
</Card>

// One action: the whole card is the button, named by its heading.
<Card accessibilityLabel="Quarterly report" onPress={openReport}>
  <ReportSummary />
</Card>
```

| Prop | Type | Default | |
|---|---|---|---|
| `variant` | `CardVariant`: `'elevated' \| 'filled' \| 'outlined'` + values the design system added | `'outlined'` | How the card separates from its background. Pick by the background, not by importance. |
| `onPress` | `(event) => void` | | The spec's `interactive` **and** its `click`: with a handler the card is ONE pressable action (an accessible `Pressable`, `accessibilityRole="button"`); without one it is a plain `View`. |
| `disabled` | `boolean` | `false` | No `onPress`, not focusable, exposed as disabled, drawn from the disabled tokens. **Ignored** unless the card is interactive (CRD-11). |
| `inset` | `boolean` | `true` | Insets the content by `components.card.containerPadding` on every side. `false`: the content reaches the edges (a photo on top) and pads its own text — it may read the same token. |
| `accessibilityLabel` | `string` | | The spec's `label`. Interactive: the accessible name, normally the heading's text. Not interactive: makes the card a named group (`role="group"`). |
| `children` | `ReactNode` | | Anything. Strings and numbers are drawn as one text in `system.typescale.body` and the content color (CRD-13). |
| `style` | `StyleProp<ViewStyle>` | | Layout only (margins, width, `alignSelf`). The card has no height of its own: it grows with its content. |
| `ref` | `Ref<View>` | | Forwarded to the host view. |

Every other `Pressable` prop is passed through. An interactive card presses exactly as `Button` does — press hold,
`pressedFeedback` (overlay, ripple, dim, none), `focusStyle`, corner smoothing, motion and the open axis key (above);
only the parts differ:

- **Parts** (CRD-3, CRD-6, CRD-12) — the host carries the container color, the state's opacity, the corner radius and
  the elevation (`boxShadow` layers and the elevation ring, outside it). The content sits in a clip view — `overflow:
  'hidden'` with the container's radius and the logical padding — so the host keeps no `overflow` and its shadow is
  not clipped. The outlined variant's outline is an inside `Ring`, drawn **above** the content; a variant whose outline
  paint is none gets no outline node. The ripple is drawn below the content. The corners do not change with the state
  (a card has no per-state shape tokens).
- **States** — an interactive card is drawn from the tokens of the one state that wins (disabled, else pressed >
  keyboard-focused > hovered): container, outline, elevation, content color and opacity. In the default system hover,
  focus and press mix the variant's `stateLayerColor` (its content color) into the container, an elevated card rests
  on a shadow (`level2`) and rises to `level3` on hover, and a disabled card keeps its colors and dims as a whole to
  `disabledOpacity` — without a shadow, though a disabled elevated card keeps its edge (`level1`, the ring). A card that is **not** interactive is always drawn from its resting tokens (CRD-11).
- **The content color** (CRD-13) — React Native has no inherited text color, so the card hands its content the
  content color of its variant and state through a Tanrei context: read it with **`useContentColor()`** (a color
  string inside a card, `undefined` outside). It is the settled color of the current state — it changes at once
  while the card's own drawing moves over its motion tokens. Plain text children are drawn in it by the card itself.
  **Tanrei has no text component on React Native yet**, so nothing else reads the context for you: style your text with
  it, or pass it to an icon.
- **Minimum target** (CRD-5) — an interactive card smaller than `system.measure.target.touch` gets a `hitSlop` up to
  it on both axes. Until the first layout pass the estimate is the padding around nothing (`2 × containerPadding`
  when inset, 0 otherwise); a normal card needs none.
- **Accessibility** (CRD-14, CRD-15) — an interactive card is ONE accessible element: the `Pressable`, named by
  `accessibilityLabel`. Without one, a text-only card is named by its text; any other content is merged by the
  platform in reading order (VoiceOver and TalkBack read an accessible view's descendants), and development builds
  report the missing label. A card that is not interactive has no role and leaves its content's semantics alone;
  with `accessibilityLabel` it is `role="group"` with that name, without becoming one element — iOS maps the group
  role to no trait, so VoiceOver may not announce the name.
  **Never put an interactive element — a button, a link, a field, a switch — inside an interactive card.** React Native
  cannot inspect a card's content for them, so the card does not report it: assistive technology cannot reach them
  (the card is one element), and a press on them would also press the card. A card that needs its own buttons stays
  non-interactive, and its primary action is one of those buttons.
- **Direction** (CRD-17) — the padding is `paddingStart` / `paddingEnd` / `paddingVertical`, so it follows
  right-to-left; the card does not mirror its content (the content follows the layout direction), and a ripple grows
  from the point of contact in physical coordinates, as in left-to-right.

### `Carousel` and `CarouselItem`

A row of visual items that scrolls sideways (`specs/carousel.spec.json`): items shrink as they near the edge and grow
as they come into place. `CarouselItem`s are its children (the spec's item kind `item`), each one button named by its
`label`; their content (an image, a poster) is the product's.

```tsx
<Carousel accessibilityLabel="Recently played" layout="multi-browse">
  {albums.map((album) => (
    <CarouselItem key={album.id} label={`${album.title}, ${album.artist}`} onPress={() => open(album)}>
      <Image source={album.cover} style={{ flex: 1 }} />
    </CarouselItem>
  ))}
</Carousel>
```

| Prop | Type | Default | |
|---|---|---|---|
| `layout` | `'multi-browse' \| 'hero' \| 'uncontained'` | `'multi-browse'` | How the row arranges its items. Not a token axis (the layouts are geometry). Unknown values render as `multi-browse`, reported (CRL-24). |
| `itemWidth` | `number \| null` | `null` | A large item's width for multi-browse and uncontained; `null` takes `containerLargeWidth`. The hero layout ignores it. A value that is not a positive number counts as `null`, reported. Choose it from your content's shape. |
| `accessibilityLabel` | `string` | | The spec's `label`: names the list. Required (reported). |
| `style` | `ViewStyle` | | The carousel's own sizing: it is as wide as its parent (`alignSelf: 'stretch'`) and `layoutHeight` tall unless you size it here. |

`CarouselItem`: `label` (the accessible name, required — reported), `onPress` (the spec's `click`), `children` (the
content), `testID`, `ref`. Only inside a `Carousel`, which places it (outside one it draws nothing, reported).

- **The arrangement** (CRL-8 … CRL-11) — the inner width W is the carousel's width less `layoutPaddingInline` at both
  ends; items are `layoutGap` apart; the large width L is `itemWidth` or `containerLargeWidth`. **Multi-browse**: as many
  large slots as leave room for two small ones, then a medium and a small one that fill W exactly — the small one a third
  of what remains, kept between `containerSmallMinWidth` and `containerSmallMaxWidth`, the medium one the rest (never wider
  than L). **Hero**: one large slot (W − gap − small-max) and a small one. **Uncontained**: every item L wide, the last one
  in view cut by the edge. A carousel too narrow for a large and two small items shows one item W wide in every layout.
  Widths are never rounded. The arrangement is `carouselArrangement` in `src/components/Carousel.tsx`, the formula of the
  spec's verify notes.
- **Scrolling** (CRL-12 – CRL-14) — a horizontal `ScrollView` whose content is as long as the scroll range; each item is
  placed in it from the scroll offset (an `Animated` interpolation of `onScroll`, JS-driven because a width is layout):
  at a scroll position p (one step is the large slot plus the gap) item i sits between slots i − p and i − p + 1,
  growing to large as it reaches the first slot and shrinking as it leaves at the start edge; items beyond the slots are
  out of view. When a drag ends, multi-browse and hero settle at a whole position — the next one in a fling's direction
  (faster than 0.5 pt/ms, the release's `velocity`), else the nearest — over `motionScrollDuration` / `motionScrollEasing`
  (at once with reduce motion); a momentum scroll that ends between positions settles too. Uncontained scrolls freely.
  At the end of the range the last item is large and the slots after it are empty.
- **Content** (CRL-15, CRL-16) — laid out at L wide (the hero's large slot) and the item's full height, centred in the
  item and clipped to its `containerShape` corners, so a narrower item shows the middle of its content. The item's
  container is filled with the `item` part's resting `containerColor` under the content, and the content gets the
  state's `contentColor` through `useContentColor()`. Because the content usually covers the item (an image), hover,
  keyboard focus and press are drawn **over** it: a state layer of the `item` part's `stateLayerColor` at
  `system.state.hoverStateLayerOpacity`, `focusStateLayerOpacity` or `pressedStateLayerOpacity`, clipped to the corners,
  hidden from assistive technology and present only while it draws; the ripple (the pressed layer) grows in the same
  place, and under `ripple` and `dim` the layer stays with the state under the press. **An item's content holds no interactive element** (CRL-20): React
  Native cannot inspect it, so nothing reports one — the item is the one button.
- **Items** (CRL-1 … CRL-7, CRL-22) — press hold, `pressedFeedback` (overlay, ripple from the point of contact, dim, none),
  hover, keyboard focus (the ring drawn inside the item, which the row would otherwise clip), `focusStyle`, corner
  smoothing and the state motion behave as for `Button`, with the state's `containerShape` and opacity. A press that the
  row takes over as a scroll never activates the item (the `ScrollView` takes the responder). The hit area is the item
  with half the gap on each side (48 for a 40-wide small item), never less than `system.measure.target.touch` on either
  axis, and the drawn item never changes.
- **Keyboard and focus** (CRL-17, CRL-18) — ONE Tab stop: the item focused last, else the item at the first slot (the
  first wholly in view, uncontained). Right / Left Arrow move to the next / previous item without wrapping (mirrored in
  right-to-left), Home and End to the first and last (key events where the renderer delivers them). An item that takes
  keyboard focus is scrolled to the first slot, as near as the range allows (uncontained: just wholly into view), over the
  scroll motion. A screen reader's own focus moves the `ScrollView` as the platform does; whether that brings the item to
  the first slot is unverified on a device.
- **Accessibility** (CRL-19, CRL-20) — the carousel is `role="list"` named by `accessibilityLabel`; each item ONE
  `role="button"` named by its label, its content hidden from assistive technology. Items out of view stay exposed, in
  order. React Native has no position-in-set property, so an item's position and the number of items are left to
  the screen reader's own count of the list.
- **Width and items** (CRL-21) — a new width (the first layout pass included: until then the carousel takes the window's
  width) or new items arrange the slots again and keep the item that was at the first slot where it was (by its `key`),
  without motion.
- **Right-to-left** (CRL-23) — the row is laid out left to right (`direction: 'ltr'`, so the scroll offset means the
  same on both platforms) and the geometry is mirrored: the first slot at the right, the scroll starting at the end of
  its range, items moving right as p grows. An item's content is not mirrored.
- **Text size** (CRL-25) — the carousel holds no text: its height, slots and items stay.
- **Not in the carousel** — virtualization (every item is rendered), automatic advance.

### `TextField`

Lets people enter and edit text — one line or several — with a floating label, optional icons, prefix and suffix,
supporting or error text and a character count (`specs/text-field.spec.json`). The counter sits at the end of the
supporting row, at least the size's `containerGap` from the text (TXF-19). Text is edited in React Native's own
`TextInput`, so input methods, autofill, selection and the clipboard are the platform's.

```tsx
const [email, setEmail] = useState('');
<TextField
  label="Email"
  type="email"
  autoComplete="email"
  value={email}
  onChangeText={setEmail}
  onEndEditing={validate}
  error={invalid}
  errorText="Enter a complete email address."
  supportingText="We only use it to sign you in."
/>
<TextField label="Search" labelHidden placeholder="Search components" type="search" leadingIcon="search"
  trailingIcon={<IconButton accessibilityLabel="Clear" onPress={clear}>close</IconButton>} />
```

| Prop | Type | Default | |
|---|---|---|---|
| `variant` | `TextFieldVariant`: `'filled' \| 'outlined'` + values the design system added | `'outlined'` | A border, or a tinted box with a bottom line. One per form. |
| `size` | `TextFieldSize`: `'medium' \| 'large'` + values the design system added | `'medium'` | Minimum height of a single-line field: 36 / 40, Button's medium and large. |
| `type` | `'text' \| 'email' \| 'password' \| 'number' \| 'search' \| 'tel' \| 'url'` | `'text'` | The keyboard and entry settings (below). The value is a string for every type. |
| `value` | `string` | | Controlled: set it from `onChangeText`. Without it the field keeps its own value (from `defaultValue`). |
| `label` | `string` | `''` | **Required**: the input's accessible name, drawn or not. Without one the field renders and development builds warn. |
| `labelHidden` | `boolean` | `false` | Does not draw the label; it stays the name. |
| `placeholder` | `string` | `''` | Shown only while the value is empty and the label is floated or not drawn. Never the name. |
| `supportingText` / `errorText` | `string` | `''` | Help below the field; `errorText` replaces it while `error`. The shown one is the input's `accessibilityHint`. |
| `error` | `boolean` | `false` | Draws every part from the variant's `error…` tokens. Validation is yours. |
| `disabled` | `boolean` | `false` | Not focusable, not editable, no events, drawn from the disabled tokens. |
| `readOnly` | `boolean` | `false` | Focusable and selectable, not editable; drawn as an enabled field. |
| `required` | `boolean` | `false` | Draws no mark (word the label). See "What React Native cannot expose" below. |
| `multiline` / `minRows` / `maxRows` | `boolean` / `number` / `number` | `false` / `2` / `0` | A multi-line field starts at `minRows` lines and grows to `maxRows` (0: no limit), then scrolls. Ignored for `password`. |
| `maxLength` | `number` | `0` | The most **user-perceived characters** the user can type (below); 0 is no limit. |
| `counter` | `boolean` | `false` | The count (and `/maxLength`) at the end of the supporting row. |
| `prefix` / `suffix` | `string` | `''` | The spec's `prefixText` / `suffixText`: fixed text before the value and at the end of the input line, `affixGap` from the input, in the input's style and the affix color. While shown they are read with the value: they join the input's `accessibilityHint` (`"$ USD, …"`) and the drawn ones are hidden from assistive technology. |
| `autoComplete` | `string` | `''` | The autofill hint as an HTML autofill name (`email`, `current-password`, `one-time-code`, …), passed to `TextInput`'s `autoComplete` (which maps it to iOS's `textContentType`). |
| `leadingIcon` / `trailingIcon` | `string \| ReactNode \| ({ color, size, glyph }) => ReactNode` | | A **string** is a glyph of the system's icon font, drawn at the size's `iconSize` in the unselected glyph style and the part's color, decorative. A **function** receives that color, the size and the glyph. Any other **node** — your own `IconButton` (clear, reveal password) — is rendered as given: its own tokens, its own name, its own focus stop after the input. |
| `onChangeText` | `(value: string) => void` | | The spec's `input`: every user change (typing, paste, cut, dictation, autofill), never a value you set. |
| `onEndEditing` | `(value: string) => void` | | The spec's `change`: focus left, or the action key was pressed, with a value other than the one last committed. |
| `onSubmitEditing` | `(value: string) => void` | | The spec's `action`: the action key in a single-line field, after the `onEndEditing` it caused. Never in a multi-line field (`submitBehavior="newline"`). |
| `style` | `StyleProp<ViewStyle>` | | Layout of the whole field (margins, width). |
| `ref` | `Ref<TextInput>` | | Forwarded to the `TextInput` (`focus()`, `blur()`, `clear()`). |

Every other `TextInput` prop (`autoFocus`, `returnKeyLabel`, `onFocus`, `onBlur`, …) is passed to the input.

- **Parts** — a pressable container (the fill, the edge, the icons, the input line and the label) above a supporting
  row. A press anywhere on the container focuses the input and draws no press answer (TXF-8); its hit area reaches
  `system.measure.target.touch` **vertically** (`hitSlop`), never sideways. The container is not an accessibility
  element or a focus stop; the input is.
- **Structure from tokens, not from names** — variants are open, so the field never branches on `'outlined'`: a variant
  whose resting outline paint draws is **bordered** (four corners of `containerShape`; the floated label sits on the top
  edge, centred on the line, in a gap of `outlineNotchPadding` on each side), one whose outline paint is none is
  **filled** (top corners `containerShape`, bottom corners `containerShapeBottom`, a bottom `activeIndicator`; the label
  floats inside the box, which is then `2 × containerPaddingBlockWithLabel + a floated-label line + an input line` tall
  so it never jumps). A part whose paint resolves to nothing has no node.
- **The border's gap** is drawn with views: two corner pieces, the sides and the bottom, and two top segments with the
  gap between them, as wide as the floated label (its own text in the floated style, not drawn). While the label rests,
  a line bridges the gap; it shrinks away (`scaleX`) as the label floats.
- **The label** (TXF-13, TXF-14) floats while the input is focused or the value is not empty (an autofill fills it); otherwise
  it rests centred vertically in the container — the input line of a bordered field, the middle of a filled field's
  taller box (a multi-line field rests it on its first line, TXF-17). Its position, font size and line height move over `motionLabelDuration` / `motionLabelEasing`; everything else (colors,
  edge widths, opacity) over `motionStateDuration` / `motionStateEasing`; with reduce-motion on, at once. Positions are
  computed from the tokens and `useWindowDimensions().fontScale`, so the label follows larger text. The drawn label is
  hidden from assistive technology: the input carries the name.
- **A label that does not fit** (TXF-13) — narrow field, long or translated label, enlarged text — wraps, resting and
  floated, never cut: no `numberOfLines`, no ellipsis. React Native lays text out natively, so once the drawn label
  reports a second line (`onTextLayout`) two copies that are not drawn (`<testID>.label.measure.resting` / `.floated`,
  hidden from assistive technology) measure its lines in each position, and the field grows to hold them: a resting
  label wraps inside the container, which grows (`minHeight`); a filled field's floated lines sit above the input line
  (the band above it is that many lines tall); a bordered field's floated label keeps its last line on the top edge and
  reserves the lines above it as `marginTop` on the container, and the border's gap opens by the widest line. A field
  whose label fits renders exactly as before (no measuring copies).
- **States** (TXF-6) — focused (by any means, pointer and touch included: a field shows where typing goes) over hovered;
  disabled. There is no pressed state. The focused edge is the focus indicator: **no focus ring**; under
  `focusStyle: 'glow'` the glow is drawn around the container too (only where the renderer has `boxShadow`; without it
  the edge alone shows focus). Placeholder and caret colors are settled strings (`placeholderTextColor`,
  `cursorColor`, `selectionColor` cannot take an animated value).
- **Selection** (TXF-6) — selected text is highlighted in `components.textField.selectionColor` (primary-container in
  the default system). **On Android** the field passes it as `selectionColor`, with the caret color on `cursorColor` and
  `selectionHandleColor`. **On iOS** `selectionColor` is ONE tint for the caret and the highlight, so the field keeps the
  caret color there (a primary-container caret would be too pale to see) and UIKit draws the highlight as a tint of it.
- **Floated label beside a leading icon** (TXF-13) — a bordered field floats its label to `containerPaddingInline`, over
  the icon (the border's gap follows it); its resting label starts at the input text. A filled field's label starts at
  the input text in both positions.
- **Types** (TXF-20) — `email`: `keyboardType="email-address"`, no autocapitalization or autocorrection; `password`:
  `secureTextEntry`, no autocorrection; `number`: `decimal-pad`; `search`: `returnKeyType="search"` and
  `accessibilityRole="search"`; `tel`: `phone-pad`; `url`: `url`, no autocapitalization or autocorrection; each with the
  matching `inputMode`. The values of `email`, `url`, `tel`, `number` and `password` are laid out left to right and
  aligned to the field's start edge in right-to-left layouts (TXF-24).
- **Characters** (TXF-18, TXF-19) — `maxLength` and the counter count grapheme clusters: an emoji (a ZWJ family, a flag,
  a skin tone) or a letter with its accents is one. `TextInput`'s own `maxLength` counts UTF-16 code units and is not
  used: an edit past the limit is refused, a paste shortened to fit; a value you set is never shortened. `Intl.Segmenter`
  is used where it exists; **Hermes has none**, so there a smaller set of the Unicode rules applies (combining marks,
  variation selectors, ZWJ sequences, emoji modifiers, tags, regional-indicator pairs, Hangul jamo, CR LF).
- **Announcements** — an error that appears (or changes) while the input has focus is announced once, politely
  (`announceForAccessibilityWithOptions(text, { queue: true })`, TXF-12); with `counter`, the count is announced once
  typing pauses for one second (TXF-19). The supporting row is hidden from assistive technology: its text is the
  input's `accessibilityHint` (`"help, 12/40"`), not a second reading; the count is announced as the counter shows it
  (`"3/40"`).
- **What React Native cannot expose** — it has no invalid, required or read-only accessibility state: `error` reaches
  assistive technology only as the error text in the hint, `readOnly` only as a field that does not change, `required`
  not at all. And it reports no input-method composition to JavaScript: the field
  never writes a value that equals the native text back (a product that echoes `value` is safe), but a value the
  product **changes** during a composition, and the `maxLength` limit, are applied at once rather than when the
  composition ends (TXF-4, TXF-18).

### `List`

A column of related items — a line or more of text with an icon, an avatar or an image — that people read, open one by
one, or choose from (`specs/list.spec.json`). The items are data: `items` is an array of `ListItem` (the spec's item
kind `list-item`). The list draws nothing of its own — no background, no padding around its items, no
scrolling — so put it on a surface, in a `Card` (a grouped list), or in your own `ScrollView`.

```tsx
// Static rows: content only; a row that toggles a setting holds the switch in its trailing slot.
<List items={[
  { headline: 'Inbox', leadingIcon: 'inbox', trailingText: '12', divider: true },
  { headline: 'Wi-Fi', trailing: <Switch label="Wi-Fi" labelHidden value={wifi} onValueChange={setWifi} /> },
]} />

// Interactive rows: each is ONE button.
<List items={[{ headline: 'Wi-Fi', supportingText: 'Connected', leadingIcon: 'wifi', trailingIcon: 'chevron_right', onPress: openWifi }]} />

// A listbox: controlled, the list calls onSelectionChange and you move value (or values).
<List accessibilityLabel="Theme" selectionMode="single" value={theme} onSelectionChange={setTheme}
  items={[{ headline: 'Light', value: 'light' }, { headline: 'Dark', value: 'dark' }]} />
<List accessibilityLabel="Labels" selectionMode="multiple" values={labels} onSelectionChange={setLabels}
  items={[{ headline: 'Bug', value: 'bug' }, { headline: 'Docs', value: 'docs' }]} />
```

| Prop | Type | Default | |
|---|---|---|---|
| `items` | `readonly ListItem[]` | | The rows, in order (below). |
| `selectionMode` | `ListSelectionMode`: `'none' \| 'single' \| 'multiple'` | `'none'` | The spec's `selection`. `single` and `multiple` make the list a listbox: every item is an option. A closed choice: an unknown value renders as `none` and development builds report it (LST-7). |
| `value` | `string \| null` | `null` | `single`: the selected option's `value`. **Controlled.** |
| `values` | `readonly string[]` | `[]` | `multiple`: the selected options' values. **Controlled.** |
| `onSelectionChange` | `(value: string) => void` (single), `(values: string[]) => void` (multiple) | | The spec's `change`: the selection after the user chose an option. A single choice is never cleared by its own option (LST-13). |
| `accessibilityLabel` | `string` | | The spec's `label`: what the items are. Required for a listbox (development builds report a missing one). |
| `positionText` | `(position, count) => string` | `"2 of 3"` | How an item's position is announced, in your language. |
| `style` | `StyleProp<ViewStyle>` | | Layout of the column. |
| `ref` | `Ref<View>` | | The list's host view. Every other `View` prop is passed to it. |

A `ListItem`:

| Field | Type | Default | |
|---|---|---|---|
| `headline` | `string` | | The main text and the accessible name. Empty still renders, and development builds report it. |
| `overline` | `string` | `''` | A short line above the headline. |
| `supportingText` | `string` | `''` | Text below the headline. |
| `supportingNumberOfLines` | `number` | `0` | The spec's `supportingMaxLines`: lines shown before an ellipsis; 0 shows all. The full text is still read. |
| `trailingText` | `string` | `''` | A short value at the end of the row. |
| `leadingIcon`, `trailingIcon` | `string \| ReactNode \| ({ color, size, glyph }) => ReactNode` | | A glyph name of the system's icon font, a function or a node, in the icon color of the item's condition and state. Empty: nothing, and no space. |
| `leadingMedia` | `ListLeadingMedia`: `'none' \| 'avatar' \| 'image'` | `'none'` | Frames `leading` as an avatar (`avatarSize`, `avatarShape`) or an image (`imageSize`, `imageShape`) on `mediaContainerColor`, in place of `leadingIcon`. Unknown values render as `none`. |
| `leading` | `ReactNode` | | The media's content (an `Image`, an icon). It reads `mediaContentColor` with `useContentColor()`; a string is drawn as a monogram in `headlineTypescale`, centred (LST-20). |
| `trailing` | `ReactNode` | | A control of your own at the end of a **static** item. It keeps its own tokens, semantics and focus stop. |
| `onPress` | `(event) => void` | | The spec's `interactive` **and** its `click`: with a handler the item is ONE pressable action. Ignored in a listbox. |
| `value` | `string` | | An option's identity; unique within the list. |
| `disabled` | `boolean` | `false` | No activation; exposed as disabled; still reached by the arrow keys. Ignored for a static item. |
| `divider` | `boolean` | `false` | A hairline along the bottom of the item. Set it on every item but the last, or at the end of a group. |
| `testID` | `string` | `<list testID>.item.<index>` | The item's id; its row is `<id>.row`, its parts `<id>.headline`, `.leading-icon`, `.avatar`, `.mark`, `.check`, `.divider`, … |

Press hold, `pressedFeedback` (overlay, ripple, dim, none), `focusStyle`, corner smoothing and motion behave as for
`Button`; only the parts differ:

- **Three kinds of row** (LST-11, LST-12) — a **static** item (no `onPress`, `selectionMode` `none`) is a `View` inside a
  view with `role="listitem"`: it takes no focus, answers nothing, is drawn from the resting `unselected` tokens and
  ignores `disabled`; its content keeps its own semantics. An **interactive** item is ONE `Pressable` with the button
  role inside its list item, named by its headline. An **option** is ONE `Pressable` with `role="option"` and
  `accessibilityState.selected`. The list itself has `accessibilityRole="list"`: React Native has **no listbox role**
  and no multi-selectable property, so what the screen reader announces for a selectable list is the platform's (each
  option still says whether it is selected). An item's position is its `accessibilityValue` text (`"2 of 3"`); React
  Native has no position-in-set property, and a static item — not an accessible element of its own — announces none.
- **Conditions** (LST-26) — a selected option is drawn from `conditions.selected`, every other item from
  `conditions.unselected`, in the state that wins (disabled, else pressed > keyboard-focused > hovered): the row's
  fill (the `container`), every text, both icons, the mark, the opacity and the corners. In the default system hover,
  focus and press mix the condition's `stateLayerColor` (its headline color) into the row, a selected option rests on
  `secondary-container` with a `primary` check, and a disabled row keeps its resting colors and dims as a whole —
  its media included — to `disabledOpacity` (LST-6).
- **Layout** (LST-16, LST-17) — one row with `paddingStart` / `paddingEnd` (so it mirrors in right-to-left),
  `paddingVertical` from `containerPaddingBlock` and `containerGap` between the leading element, the text column (it
  takes the rest of the width), the trailing text, the trailing icon, the trailing control and, in a listbox, the mark.
  The minimum height follows the lines of text: `containerHeightOneLine` with a headline alone, `…TwoLine` with one more
  line (an overline, or supporting text laid out on one line), `…ThreeLine` with two or more (the supporting text's
  lines are counted from its layout). It is a minimum: rows grow with their content and with larger text. The leading
  and trailing elements are centered in a one- or two-line row and aligned with the top of the text in a taller one.
- **Minimum target** (LST-5) — an interactive item or an option is at least `system.measure.target.touch` tall (in
  `cupertino` a 44 one-line row becomes 48); stacked rows never extend a hit area over each other, so rows have no
  `hitSlop`. The whole row — media and trailing elements included — is the `Pressable`.
- **Texts** (LST-18) — `headlineTypescale`, `overlineTypescale`, `supportingTextTypescale`, `trailingTextTypescale`,
  font scaling on; only the supporting text is ever cut (`supportingNumberOfLines`). The item's
  `accessibilityHint` is its overline, supporting text and trailing text in reading order — the full supporting text.
- **Icons** (LST-19) — drawn through `iconGlyphStyle` at `leadingIconSize` / `trailingIconSize` with the glyph style of
  the item's condition (selected for a selected option), so under a single variable icon family a selected icon is
  drawn unfilled (see "Icons").
- **The mark** (LST-21) — every option reserves a `markSize` box at its end, so texts line up; a selected option
  strokes the checkbox's check in it at `markWidth` in its mark color. Choosing an option draws the check along its
  path and moves the colors over `motionStateDuration` / `motionStateEasing` (the list has no selection motion); with
  reduce motion, at once.
- **The divider** (LST-22) — a `dividerThickness` line in `dividerColor` along the bottom edge of the item, from the
  start of the text column (a logical `start`) to the row's end. It is drawn beside the row, not in it, so it keeps its
  color and its full opacity in every state and condition — a disabled item's opacity and a dim press do not reach
  it; it is hidden from assistive technology.
- **Keyboard** (LST-15) — a list with interactive items or options is ONE tab stop: the item focused last, else the
  first selected option, else the first enabled item. Up and Down Arrow move focus without wrapping (disabled items
  are reached, not activated), Home and End go to the ends, and letters typed within a second move to the next item
  whose headline begins with them. Moving focus never selects; Space and Enter activate the focused item as its own
  click. The keys arrive through `onKeyDown`, which React Native 0.87 declares on `View` but whose delivery on iOS and
  Android has not been checked on a device.
- **Focus ring** (LST-4) — drawn **inside** the row (its outer edge on the row's edge), so a `ScrollView` around the
  list cannot clip it; never animated; not for focus that came from a press. A disabled item reached by the arrow
  keys shows it too.
- **Accessibility** (LST-23, LST-24) — icons, the mark, the divider and the media are hidden from assistive technology,
  unless the element you put in `leading` has an `accessibilityLabel`. **Never put an interactive element — a button, a link, a field, a switch — inside an interactive list item or an option.**
  React Native cannot inspect the content, so the list does not report it: the item is one element (assistive
  technology cannot reach what is inside), and a press on it would also press the row. A row that needs its own
  control stays static and holds it in `trailing`.
- **Long lists** — the list never scrolls or virtualizes (on any platform): it renders every item. For long data,
  build your own lazy list (a `FlatList`) and state the set size.

### `Menu`

A short set of actions or choices on a temporary surface that opens from the element that asked for it
(`specs/menu.spec.json`): Tanrei's first overlay. The anchor is your own button, icon button or field; the menu reads
its position and gives it focus back. `items` is an array of `MenuEntry` — the spec's four item kinds, told
apart by `kind`.

```tsx
const more = useRef<View>(null);
const [open, setOpen] = useState(false);

<IconButton ref={more} accessibilityLabel="More" accessibilityState={{ expanded: open }} onPress={() => setOpen(true)}>more_vert</IconButton>
<Menu
  visible={open}
  anchorRef={more}
  accessibilityLabel="More"
  onDismiss={() => setOpen(false)}
  items={[
    { label: 'Copy', leadingIcon: 'content_copy', trailingText: '⌘C', onPress: copy },
    { kind: 'group', title: 'View', items: [{ kind: 'checkbox-item', label: 'Show grid', checked: grid, onCheckedChange: setGrid }] },
    { kind: 'group', title: 'Sort by', value: sort, onValueChange: setSort, items: [
      { kind: 'radio-item', label: 'Name', value: 'name' },
      { kind: 'radio-item', label: 'Date', value: 'date' },
    ] },
    { label: 'Delete', leadingIcon: 'delete', destructive: true, onPress: remove },
  ]}
/>
```

| Prop | Type | Default | |
|---|---|---|---|
| `visible` | `boolean` | `false` | The spec's `open`. **Controlled**: set it to `false` from `onDismiss`. |
| `anchorRef` | `RefObject<{ measureInWindow, focus }>` | | Your anchor's ref (any host view): measured with `measureInWindow` to place the surface, focused when the menu closes. |
| `placement` | `MenuPlacement`: `'bottom-start' \| 'bottom-end' \| 'top-start' \| 'top-end'` | `'bottom-start'` | Below or above the anchor, its start or end edge aligned with the anchor's. A closed choice: unknown values render as `bottom-start` and development builds report them (MNU-14). |
| `onDismiss` | `(reason: MenuDismissReason) => void` | | The spec's `close`, with the spec's reason names: `'escape'`, `'back'` (Android's back button), `'outside'`, `'tab'`, `'focus-out'` (keyboard focus left the items: one lost focus and no other took it) or `'item'` (an item's activation). |
| `items` | `readonly MenuEntry[]` | | The items, in order (below). |
| `accessibilityLabel` | `string` | | The menu's name: your anchor's name ("More"). |
| `positionText` | `(position, count) => string` | `"2 of 5"` | How an item's position is announced, in your language. |
| `inline` | `boolean` | `false` | **Tests and the gallery only** (MNU-19's `verify`): draws the open surface where the menu is, at its natural size with its elevation — no overlay layer, anchor, placement, motion or focus move. |
| `style` | `StyleProp<ViewStyle>` | | Layout of the surface (in `inline`). Every other `View` prop goes to the surface. |

The kinds — every one has `label` (the name; empty still renders, and development builds report it), `supportingText`
(its description), `leadingIcon` and `trailingIcon` (a glyph name, a function or a node), `trailingText` (usually the
shortcut; React Native has no shortcut property, so it is read as part of the description), `disabled` and `testID`:

| Kind | Type | Own fields | |
|---|---|---|---|
| `'item'` (or none) | `MenuItem` | `destructive`, `onPress` | An action: `onPress` (the spec's `click`), then `onDismiss('item')`. `destructive` draws it from the `destructive` condition (the error color). |
| `'checkbox-item'` | `MenuCheckboxItem` | `checked`, `onCheckedChange` | Switched on its own. **Controlled**: activation calls `onCheckedChange(!checked)`. |
| `'radio-item'` | `MenuRadioItem` | `value` | One choice of its group: checked while the group's `value` is its own. |
| `'group'` | `MenuGroup` | `title`, `value`, `onValueChange`, `items` | A run of items with a divider between it and what is next to it; `title` names it and is drawn above its items; its radio items are one choice (`onValueChange`, the spec's group `change`). **Controlled.** |

Press hold, `pressedFeedback` (overlay, ripple, dim, none), `focusStyle`, corner smoothing and motion behave as for
`Button`; the rows are built like `List`'s (a shared row: `src/primitives/itemRow.ts`) with the menu's own tokens:

- **Presentation** (MNU-1, MNU-25) — the surface is drawn in `TanreiProvider`'s **overlay layer** (see "The overlay
  layer"), not in a `Modal`: a `Modal` is a window of its own, which would make the screen behind the menu unreachable
  to assistive technology and the keyboard although the menu is not modal. There is no scrim, and **the screen behind it
  stays reachable**: a screen reader can move on to it, and keyboard focus that leaves the items asks to close
  (`'focus-out'`). Behind the surface an invisible press-catcher, hidden from assistive technology and never focused,
  fills the layer: **a press outside closes the menu and does not reach what is under it** (the spec leaves that to each
  platform, MNU-5). A screen reader's activation of an element behind the menu is the platform's: VoiceOver's
  double-tap lands on the press-catcher and closes the menu (`'outside'`); TalkBack's acts on the element directly and
  the menu stays open (unverified on a device). Opening moves keyboard focus
  and the screen reader's focus to the first enabled item (once the surface is placed); closing gives keyboard focus
  back to the anchor when it was inside the menu or was inside when the close was asked for. Tab and Shift+Tab ask to
  close (`'tab'`) and are consumed, so focus goes back to the anchor and the NEXT Tab moves on from it — React Native
  cannot send the Tab on for you (MNU-5). Android's back button asks to close (`'back'`, `BackHandler`) while the menu
  is open. Without a `TanreiProvider` there is no layer: nothing is drawn, and development builds say so. Inside a
  `Dialog` the menu is drawn in the dialog's own layer.
- **Your anchor** (MNU-24) — the menu cannot set properties on your element: give the anchor
  `accessibilityState={{ expanded: open }}` yourself, and name the menu with the anchor's name.
- **Placement** (MNU-2) — `surfaceOffset` from the anchor, flipped to the other side when this one has less room than
  the surface needs within `surfaceViewportMargin` of the layer's edges (moved in by `TanreiProvider`'s `insets`) and
  the other has more; aligned by its start or end
  edge (mirrored in right-to-left), shifted to stay inside the margin, its height limited to the room left, and the
  items scroll beyond it. The anchor is measured when the menu opens and when the window changes size; React Native
  reports no other movement of a view, so a menu does not follow an anchor that scrolls while it is open. Until the surface has been laid out it is drawn unseen, to be measured.
- **Motion** (MNU-4) — once placed, the surface fades in and grows (`scaleY`) from the edge that faces the anchor over
  `motionOpenDuration` / `motionOpenEasing`, and fades out over `motionCloseDuration` / `motionCloseEasing` before it
  leaves the layer; with reduce motion, at once.
- **The surface** (MNU-3) — `surfaceColor`, `surfaceShape` (eased by the corner smoothing), `surfaceElevation`
  (`boxShadow` and the elevation ring, outside the clip), `surfacePaddingBlock` / `surfacePaddingInline`, and as wide as
  its widest item between `surfaceMinWidth` and `surfaceMaxWidth`. Its items are clipped to its shape.
- **Rows** (MNU-10 … MNU-20) — a row is drawn from its condition — `destructive` for a destructive action, `selected` for
  a checked checkbox or radio item, else `unselected` — in the state that wins: container (the state layer, which mixes
  the condition's label color), label, supporting and trailing text, icons, mark, opacity, corners. It is at least
  `containerHeight` and **at least `system.measure.target.touch`** tall (the default 44 row is 48 on React Native, which
  cannot tell a fine pointer), with no `hitSlop`. In order: `containerPaddingInline` (logical), the mark column while
  any item is a checkbox or radio item, the icon column while any item has an icon — both kept in every row so labels
  line up — the label and supporting text, the trailing text, the trailing icon, `containerGap` between them. The
  columns and the trailing elements sit on the label's **first line**, as a checkbox sits beside its label: an element
  taller than the line moves the label down; a label that wraps grows downwards.
- **The check** (MNU-22) — the checkbox's check at `markWidth` in a `markSize` box, in the mark color; drawn along its
  path over the state motion when `checked` changes while the menu is open.
- **Groups** (MNU-23, MNU-28, MNU-29) — a divider (`dividerThickness`, `dividerColor`, `dividerSpace` above and below,
  `role="separator"`) between a group and whatever is next to it, never at the ends; it runs inside the surface's
  padding (`surfacePaddingInline`), the same inset as the rows. A title is drawn in
  `groupTitleTypescale` / `groupTitleColor` where the labels start and takes no focus; the group is `role="group"`
  named by it. A radio item outside a group is never checked, a group value that names none of its radio items checks
  none, two radio items sharing the value are both checked, and a group inside a group is drawn as its outer group's
  items — each reported in development builds.
- **Keyboard and pointer** (MNU-5 … MNU-8) — one tab stop; Up and Down Arrow wrap through every item (through groups),
  Home and End, typeahead within a second; disabled items are reached, not activated; Escape and Tab ask to close.
  Enter activates and closes; **Space on a checkbox or radio item switches it and leaves the menu open** — told apart
  by the key that came before the click. A pointer moving onto an item moves focus there, drawn hovered and without
  the ring, so the keys continue from it. Keys arrive through `onKeyDown` on the surface, unverified on a device.
- **Accessibility** (MNU-24) — the surface is `role="menu"`; every item is ONE element with `role="menuitem"`, named by
  its label, described by its supporting text and trailing text, with its position (`accessibilityValue`); checkbox
  and radio items carry `accessibilityState.checked`. React Native has no `menuitemcheckbox` / `menuitemradio` role.
  Icons and the mark are hidden. The focus ring is drawn inside the row (MNU-11), which
  the surface would otherwise clip.
- **Not in a menu** — submenus (a later item kind), context menus, and fields, sliders or switches in a row (they would
  take the menu's keys).

### `Search`

A search bar that opens a view of suggestions, docked under the bar or full-screen (`specs/search.spec.json`).
**Controlled**, in `TextInput`'s idiom: set `value` from `onChangeText` and `expanded` from `onExpandedChange` (which
receives the new value and, when closing, the reason), as for the `Menu`. Text is edited in React Native's own
`TextInput`, as the `TextField` edits it.

```tsx
const [query, setQuery] = useState('');
const [open, setOpen] = useState(false);
<Search
  accessibilityLabel="Search mail" placeholder="Search mail" clearLabel="Clear search" backLabel="Back"
  presentation={compact ? 'full-screen' : 'docked'}
  value={query} onChangeText={setQuery}
  expanded={open} onExpandedChange={(next) => setOpen(next)}
  suggestions={matches.map((m) => ({ value: m.id, headline: m.title, supportingText: m.folder, leadingIcon: 'history' }))}
  onSelect={openResult} onSubmitEditing={runSearch}
  trailing={<IconButton accessibilityLabel="Voice search" onPress={listen}>mic</IconButton>}
>
  {matches.length === 0 ? 'No results' : null}
</Search>
```

| Prop | Type | Default | |
|---|---|---|---|
| `presentation` | `'docked' \| 'full-screen'` | `'docked'` | Docked opens the view under the bar in the overlay layer; full-screen over the whole window in a `Modal`. A closed choice: unknown values render as `docked`, reported. |
| `value` / `onChangeText` | `string` / `(value) => void` | `''` | The query and the spec's `input` (typing, the clear button, Escape). Never called when you set `value`. |
| `expanded` / `onExpandedChange` | `boolean` / `(expanded, reason?) => void` | `false` | Whether the view is open, and the spec's `toggle`: asked once per change, with the reason `'escape' \| 'back' \| 'select' \| 'submit' \| 'outside' \| 'tab' \| 'focus-out'` when closing. The value stays as it is. |
| `accessibilityLabel` | `string` | `''` | The spec's `label`: names the field and its view; never drawn, and the placeholder is never the name. Required (reported). |
| `placeholder` | `string` | `''` | A hint in the empty input. |
| `disabled` | `boolean` | `false` | Not focusable or editable, never opens, no events, no clear button; the bar from the disabled tokens. |
| `clearLabel` / `backLabel` | `string` | `''` | The clear button's and the full-screen back button's names. Required while they show (reported). |
| `onSubmitEditing` | `(value) => void` | | The spec's `submit`: the keyboard's action key with no suggestion active. An open view then asks to close with `'submit'`. |
| `onSelect` | `(value) => void` | | The spec's `select`: a suggestion was chosen (a press, or Enter while it is active). The view then asks to close with `'select'`; the value is yours to set. |
| `suggestions` | `SearchSuggestion[]` | `[]` | `{ value, headline, supportingText?, leadingIcon? }` (the spec's item kind). An empty or repeated value and an empty headline are reported. |
| `leading` / `trailing` | `ReactNode` | | Your `IconButton`s: one in place of the search glyph, up to two after the clear button (more are reported). Not restyled, their own focus stops; not drawn in the full-screen header. |
| `children` | `ReactNode` | | Your content in the view, after the suggestions (results, "No results"). It gets the suggestion headline color through `useContentColor()`; plain text takes the `body` style. |
| `insets` | `TanreiInsets` | the provider's | The full-screen view's safe area (each side given replaces `TanreiProvider`'s). |
| `positionText` | `(position, count) => string` | `"2 of 5"` | How a suggestion's position is announced (English by default). |
| `inline` | `boolean` | `false` | Test and gallery only: draws an open view in place — docked under the bar, full-screen filling the parent — without the overlay layer, a `Modal`, placement, motion or focus moves. |

- **The bar** (SRC-1 … SRC-4, SRC-18 … SRC-22) — as wide as its layout, at least `containerHeight` (a minimum: it grows
  with the text), filled, raised by `containerElevation` and rounded by `containerShape`; one centred row: the search
  glyph (`leadingIconSize`, unselected, hidden) `containerPaddingInline` from the start — or your leading icon button
  `containerPaddingInlineWithButton` from it — the input, the clear button (a small standard `IconButton`, `close`), your
  trailing icon buttons; the end padding is `containerPaddingInlineWithButton` after an icon button, else
  `containerPaddingInline`. The value is one line in `inputTypescale`; the caret in `caretColor`; the selection in
  `comp.text-field.selection.color` on Android (iOS has one tint for both: the caret color). Focus by any means is the focused state, drawn as the **outline** inside the
  bar's edge (its per-state width and color; the container stays at rest) — never a focus ring; under `glow` the glow
  too. A press on the bar or on its input shows the pressed state (`pressedFeedback`: overlay, ripple, dim, none) for at
  least `pressHold`, and the hit area reaches `system.measure.target.touch` vertically.
- **Opening and closing** (SRC-5, SRC-6, SRC-12, SRC-13) — a press on the bar or its input, typing, or Down Arrow asks
  to open; focus alone never does. Escape, Android's back button, the back button, choosing a suggestion, submitting,
  and — docked — a press outside the bar and the view, Tab, or focus leaving the input ask to close. **A press outside
  closes the view and does not reach what is under it**, as the `Menu`'s (MNU-5); the bar stays reachable (the press
  catchers surround it). While closed, Escape clears a value. Hardware keys arrive through `TextInput`'s `onKeyPress`
  where the platform delivers them.
- **Docked view** (SRC-7, SRC-8, SRC-23) — in `TanreiProvider`'s overlay layer (the Menu's), `viewOffset` under the bar
  (above it when the room below — less `viewViewportMargin`, the provider's insets and the on-screen keyboard — is too
  small and above is more), as wide as the bar and aligned with it, its height limited to the room and its content
  scrolling; `viewContainerColor`, `viewContainerElevation`, `viewContainerShape`, clipped and padded by
  `viewPaddingBlock` / `viewPaddingInline`; it fades and grows from the bar's side over the open motion and fades over
  the close motion. It is not a `Modal`: focus stays in the input, rows never take focus, taps keep the keyboard
  (`keyboardShouldPersistTaps="handled"`), nothing is inert, no scrim. It is placed when it opens, when it is laid out
  and when the window or the keyboard changes — not while the bar moves under a scroll. Without content (no suggestion, no children) it is not drawn and the search stays
  expanded.
- **Full-screen view** (SRC-9, SRC-11, SRC-23) — a transparent `Modal` (its own window: everything outside is inert)
  with translucent bars, filled with `viewContainerColor` to every edge, its content inside the insets and above the
  keyboard: a header at least `headerHeight` tall (`headerPaddingInline`; a medium back button — `arrow_back`, mirrored
  in right-to-left — the input and a medium clear button), a `dividerThickness` line in `dividerColor`, then the
  suggestions and your content. `role="dialog"` named by the label, `accessibilityViewIsModal`. Focus moves to the
  header's input as it opens (the caret at the end) and back to the bar's input when it closes, which does not open it
  again. The `Modal`'s back (`onRequestClose`) asks to close with `'back'`.
- **Suggestions** (SRC-14 … SRC-17) — rows at least `suggestionContainerHeight` and the touch target tall (hit areas never
  overlap), `suggestionContainerPaddingInline` / `PaddingBlock`, an icon column kept in every row while any has an icon,
  the headline and supporting text wrapping. Down / Up Arrow make a row **active** (drawn from the focused tokens, a
  focus ring inside it) while focus stays in the input; typing leaves none active; Enter chooses the active row. Each
  row is a button named by its headline, described by its supporting text, with its position (`accessibilityValue`).
  React Native has no combobox role: the input is `accessibilityRole="search"` and a screen reader reaches the rows by
  swiping.

### `SegmentedButton`

Two to five joined segments for one choice (a radio group) or several (toggle buttons) among the options of one
setting (`specs/segmented-button.spec.json`). `items` is an array of `Segment` — the spec's item kind `segment` —
and the set is selected by value. Use a button group for actions and `Tabs` for views.

```tsx
const [range, setRange] = useState<string | null>('week');
const [days, setDays] = useState<string[]>(['mon']);

<SegmentedButton
  accessibilityLabel="Range"
  value={range}
  onSelectionChange={setRange}
  items={[
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month', disabled: true },
  ]}
/>
<SegmentedButton
  accessibilityLabel="Days"
  selectionMode="multiple"
  values={days}
  onSelectionChange={setDays}
  items={[{ value: 'mon', label: 'Mon' }, { value: 'tue', label: 'Tue' }, { value: 'wed', label: 'Wed' }]}
/>
```

| Prop | Type | Default | |
|---|---|---|---|
| `items` | `readonly Segment[]` | | The segments, in order: two to five (below). |
| `selectionMode` | `'single' \| 'multiple'` | `'single'` | The spec's `selection`. The props are a union on it: `value` and `onSelectionChange(value: string)` for `single`, `values` and `onSelectionChange(values: string[])` for `multiple`. An unknown value renders as `single`, reported in development builds. |
| `value` | `string \| null` | `null` | Single: the selected segment's value. **Controlled**: move it from `onSelectionChange`. `null` selects none; a value no segment has selects none and is reported (SEG-12). |
| `values` | `readonly string[]` | `[]` | Multiple: the selected segments' values. **Controlled**. Entries no segment has select nothing and are reported. |
| `onSelectionChange` | see `selectionMode` | | The spec's `change`: a press, Enter, Space or (single) an arrow key chose another segment — never the selected one (single) or a disabled one. Multiple: the values after the switch, which may be empty. |
| `size` | `SegmentedButtonSize`: `'small' \| 'medium' \| 'large'` + your system's | `'medium'` | The heights of Button's sizes (32 / 36 / 40 in the default system). An open key: unknown values render as `medium`, reported in development builds (SEG-8). |
| `accessibilityLabel` | `string` | | The spec's `label`: the set's name — the question its options answer. Required (reported in development builds when missing). |
| `positionText` | `(position, count) => string` | `"2 of 3"` | How a segment's position is announced, in your language. |

A `Segment` is `{ value, label, icon?, labelHidden?, disabled?, testID? }`: `value` identifies it (unique; an empty
or repeated one still renders, the first segment with a value is the one it selects, and both are reported); `label`
is its text and its name, even when `labelHidden` draws the icon alone (without an icon the label is drawn anyway, and
reported); `icon` is a glyph name, a function of `{ color, size, glyph }` or a node — give every segment of a set an
icon, or none; `disabled` prevents choosing or clearing it.

Press hold, `pressedFeedback` (overlay, ripple, dim, none), `focusStyle`, corner smoothing and the state motion behave
as for `Button`, with the segmented button's own tokens (`system.components.segmentedButton`):

- **Conditions and states** (SEG-4, SEG-7, SEG-12, SEG-23) — a selected segment is drawn from `conditions.selected`,
  every other one from `conditions.unselected`, in the state that wins: container (the state layer mixes the
  condition's state-layer color), label, icon and check, elevation, opacity. A state moves them over
  `motionStateDuration` / `motionStateEasing` (a press at once); a change of condition over `motionSelectionDuration` /
  `motionSelectionEasing`; reduced motion at once. A disabled segment keeps the set's outline and dividers.
- **The set** (SEG-13, SEG-17, SEG-24) — at least the size's `containerHeight`, filled with `setColor`, its corners
  `setShape`, the segments `setPadding` in; the outline (`outlineWidth` in `outlineColor`) is drawn over the set's edge,
  above the segments, and a `dividerWidth` line in `dividerColor` stands between each two (both keep their color in
  every state, hidden from assistive technology). The end segments' outer corners are `setShape` less `setPadding`;
  every other corner is the state's `containerShape`, and each segment clips its fill and ripple to its corners. A
  raised segment (cupertino's selection) casts its elevation over its neighbours; nothing clips it.
- **Widths** (SEG-14) — every segment is as wide as the widest content measured as if selected (the check, or the
  icon where the check size is 0, the gap, the label) plus `containerPaddingInline` on each side, and at least
  `system.measure.target.touch`. The labels' natural widths are measured from their first layout (the segments lie at
  their natural widths until then); the segments then share one `flexBasis`, grow equally in a wider set
  (`style={{ alignSelf: 'stretch' }}`) and shrink equally in a narrower one, where labels wrap and every segment grows
  to the tallest, `containerPaddingBlock` above and below. Unverified on a device.
- **The check** (SEG-15, SEG-16) — a selected segment with a drawn label shows the check glyph (`'check'` of the
  system's icon font, as the filter chip's) before its label, in place of its icon, at the size's `checkSize` in the
  selected icon color; it grows in and out over the selection motion, re-centring the content. An icon-only segment
  keeps its icon (drawn in the selected family and fill). A `checkSize` of 0 (cupertino) draws no check and keeps the
  icon. The icon is drawn at `iconSize` through the icon helper; the label in `labelTypescale`, centred.
- **Target** (SEG-6) — each segment's hit area extends above and below to the touch target (`hitSlop`), never sideways:
  neighbours cannot extend over each other, so each segment is at least a target wide.
- **Keyboard** (SEG-18, SEG-19) — one tab stop. Single: the selected segment (the first enabled one when none is);
  Right and Down Arrow move to the next **enabled** segment, Left and Up Arrow to the previous one, wrapping, Home and
  End to the ends, and each move selects (a radio group). Multiple: the last focused segment (else the first selected,
  else the first enabled); the arrows only move, and Enter or Space (the focused segment's own click) switch it.
  Left and Right are swapped in right-to-left. Keys arrive through `onKeyDown` on the set (`src/primitives/rovingFocus.ts`).
- **Accessibility** (SEG-20, SEG-22) — single: the set is `role="radiogroup"` named by `accessibilityLabel` and each
  segment `accessibilityRole="radio"` with `accessibilityState.checked` (and `selected` on iOS, which has no radio
  trait); multiple: `role="group"` and each segment a toggle `button` with `accessibilityState.selected`. Each segment
  is named by its label, drawn or not, with its position (`accessibilityValue`); icons, the check, the dividers and the
  outline are hidden. The focus ring is drawn inside the segment, clear of the outline (SEG-5), following its corners.
- **Right-to-left** (SEG-21) — the set is a flex row with logical paddings and corners, which React Native mirrors;
  a ripple grows from the point of contact.
- **Not in the segmented button** — a sliding selection (mimicry gap `segmented-selection-slides`), a disabled state
  for the whole set, and form association.

### `Slider`

A value, or a range of two, chosen along a track (`specs/slider.spec.json`). React Native has no slider in its core;
this one is **controlled**, in the community slider's idiom, without depending on it: `value`, `minimumValue`,
`maximumValue`, `step`, `onValueChange` (the spec's `input`) and `onSlidingComplete` (its `change`). Set `value` from
`onValueChange`; the slider never keeps a value of its own.

```tsx
const [volume, setVolume] = useState(40);
<Slider accessibilityLabel="Volume" value={volume} onValueChange={setVolume} onSlidingComplete={save} />

const [[low, high], setPrice] = useState([20, 60]);
<Slider range startValue={low} value={high} step={5} accessibilityLabel="Maximum price" startAccessibilityLabel="Minimum price"
  valueText={`$${high}`} startValueText={`$${low}`} onValueChange={(value, start) => setPrice([start!, value])} />
```

| Prop | Type | Default | |
|---|---|---|---|
| `size` | `SliderSize`: `'small' \| 'medium' \| 'large'` + your system's | `'small'` | The track's weight (and, where a system says so, the handle's height). An open key: unknown values render as `small`, reported in development builds (SLD-23). |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Horizontal runs from the inline start (min) to the end; vertical from the bottom (min) to the top, in every layout direction. A closed choice. |
| `value` / `startValue` | `number` | `0` | The only handle's value (a range's end handle); a range's start handle. Drawn clamped and snapped; a value outside the range or off a step, and a start above the end, are reported (SLD-22). |
| `range` | `boolean` | `false` | Two handles, each its own Tab stop and adjustable element, the start one first; they meet but never cross (SLD-5). |
| `minimumValue` / `maximumValue` | `number` | `0` / `100` | The spec's `min` / `max`. A max not above min draws the handles at the start and takes no input (reported). |
| `step` | `number` | `0` | 0 is continuous; above 0 the values are min plus whole multiples of step, up to max. Negative is treated as 0 (reported). |
| `origin` | `number \| null` | `null` | Where the active track starts: null is min; a value inside the range makes a centered slider. Ignored for a range. |
| `stops` | `boolean` | `false` | A dot at every value a discrete slider can take. |
| `valueIndicator` | `'none' \| 'active' \| 'always'` | `'none'` | The value beside the handle: never, while it is pressed or has keyboard focus, or always. |
| `disabled` | `boolean` | `false` | No input, not focusable, no value indicator; drawn from the disabled tokens. |
| `accessibilityLabel` / `startAccessibilityLabel` | `string` | | The spec's `label` / `startLabel`: name the (end) handle and a range's start handle. Never drawn. Required; a missing one is reported (SLD-19). |
| `valueText` / `startValueText` | `string` | `''` | The value as words ("40 %"), read and shown in place of the number. Without it: the number in the device's locale (`Intl.NumberFormat`) with as many fraction digits as the keyboard step has, at most two (SLD-18). |
| `onValueChange` | `(value, startValue?) => void` | | Every change the person makes: each value a drag passes, and each key or assistive step. A range also receives `startValue`. Never called when you set a value. |
| `onSlidingComplete` | `(value, startValue?) => void` | | The change is finished: the press ended with another value than it started with, or a key or assistive step was made. Always after the `onValueChange` it follows. |
| `style` | `StyleProp<ViewStyle>` | | Layout of the slider. A horizontal slider stretches across its parent (`alignSelf: 'stretch'`); a vertical one is `height: '100%'` of its parent. |

- **Geometry** (SLD-7 … SLD-10) — across the axis the slider is the larger of `containerSize` and the size's
  `handleHeight`, and its hit area reaches `system.measure.target.touch` across the axis (`hitSlop`; React Native cannot
  tell touch from a fine pointer). The track is the size's `trackThickness`, inset `containerSize / 2` from each end, its
  ends rounded by `trackShape` (clamped to half the thickness); a handle's center travels between the points half the
  thickness in from the track's ends. The active track and the track are drawn as pieces that stop `trackGap` from each
  handle's edge; the handle is `handleWidth` (a state part) × `handleHeight`, rounded by `handleShape`, raised by
  `handleElevation`; the round container (the state layer) is `containerSize` square, centred on it and invisible at
  rest. Positions along the track are **percentages of the travel**, so the slider draws before its first layout pass
  (the render-tree baselines show it); the laid-out length only turns a press into a value and hides the dots a handle
  covers.
- **Stop dots** (SLD-9) — `stopIndicatorSize` dots at an end of the travel that lies on the track (not the active track)
  and, with `stops`, at every step, in `stopIndicatorColor` or `activeStopIndicatorColor` on the active track; none
  under a handle or its gap (before layout: none exactly at a handle), none at size 0.
- **Press and drag** (SLD-2, SLD-13) — the whole slider is the hit area (the responder system: `onStartShouldSetResponder`
  and friends on the host). The press takes the nearer handle (in a range whose handles meet, the one that can move
  toward the press) and shows it pressed at once, for at least `pressHold`. Every press is treated as touch: the handle
  moves once the press has travelled the touch slop (`TOUCH_SLOP`, 8 — React Native does not expose the platform's) along
  the track, or to the value under the press when a press that did not move ends. A press that first travels across the
  track by the slop is left to an enclosing `ScrollView` and changes nothing; once dragging, the slider keeps the
  responder. A pointer press does not move the handle until it moves or ends, as a touch does.
- **Keys and assistive technology** (SLD-3, SLD-4) — each handle is `accessibilityRole="adjustable"` with
  `accessibilityValue` (`{ min, max, now, text }`; a range's handle is bounded by the other) and the `increment` /
  `decrement` actions (one keyboard step: `step`, or a hundredth of the range). Where a hardware keyboard delivers key
  events: Right / Up Arrow add a step (Right and Left swapped in a right-to-left horizontal slider), Left / Down Arrow
  take one away, Page Up / Down ten, Home / End the lowest and highest the handle can take. Each change calls
  `onValueChange` then `onSlidingComplete`. React Native has no set-value action and no orientation property, so neither
  is exposed.
- **States** (SLD-11 … SLD-15) — each handle and its container draw from their own state (pressed > focused > hovered;
  a hovered handle is the one a press at the pointer would move); the tracks, the dots and the opacity from the highest
  state of any handle. Colors move over `motionStateDuration` / `motionStateEasing` (at once under a press or with
  reduce motion). `pressedFeedback`: `ripple` grows the pressed layer from the handle's centre over
  `motionFeedbackDuration`; `dim` draws no layer and applies `pressedOpacity` to the whole slider; `none` draws nothing.
  Corners follow `sys.shape.corner-smoothing`, focus the `focusStyle`.
- **Value motion** (SLD-16) — a value you set, a key, an assistive step or a tap moves the handle and the active track
  over `motionValueDuration` / `motionValueEasing`; a drag follows at once; reduce motion shows every change at once.
- **Value indicator** (SLD-17) — `valueIndicatorOffset` above the handle (at the inline start of a vertical one),
  centred on it once its width is measured and shifted to stay inside the slider, one line of
  `valueIndicatorLabelTypescale` in `valueIndicatorLabelColor` on `valueIndicatorContainerColor`, at least
  `valueIndicatorContainerHeight` high and never narrower, `valueIndicatorContainerShape` corners; faded over the state
  motion; no input, hidden from assistive technology. It is drawn inside the slider's view (`zIndex` 1), not in the
  overlay layer: a sibling drawn after the slider can cover it, and it stays inside the slider rather than the window.

### `Tabs`

A row of labelled tabs that switches between views of the same subject, one of them selected
(`specs/tabs.spec.json`). `items` is an array of `Tab` — the spec's item kind `tab` — and the row is
selected by value. **React Native has no tab panel role**: render the selected tab's panel yourself, below the row; it
follows the row in reading order, and the next Tab after the selected tab reaches it.

```tsx
const [view, setView] = useState('overview');

<Tabs
  accessibilityLabel="Project"
  value={view}
  onValueChange={setView}
  items={[
    { value: 'overview', label: 'Overview', icon: 'dashboard' },
    { value: 'activity', label: 'Activity', icon: 'history' },
    { value: 'billing', label: 'Billing', icon: 'payments', disabled: true },
  ]}
/>
{view === 'overview' ? <Overview /> : <Activity />}
```

| Prop | Type | Default | |
|---|---|---|---|
| `items` | `readonly Tab[]` | | The tabs, in order (below). |
| `value` | `string \| null` | `null` | The spec's `selected`: the selected tab's value. **Controlled**: move it from `onValueChange`. `null` selects the first enabled tab; a value no tab has selects none and is reported in development builds (TAB-11). |
| `onValueChange` | `(value: string) => void` | | The spec's `change`: a press, Enter, Space or an arrow key selected another tab. Never for the selected tab or a disabled one. |
| `variant` | `TabsVariant`: `'primary' \| 'secondary'` + your system's | `'primary'` | Primary switches the main views of a screen (icon above the label, the indicator under the content); secondary switches within one of them (icon before the label, the indicator under the whole tab). An open key: unknown values render as `primary`, reported in development builds (TAB-7); a value your system added is laid out as primary. |
| `scrollable` | `boolean` | `false` | `false` shares the row's width equally (labels wrap and every tab grows to the tallest); `true` sizes each tab to its content plus `containerPaddingInline` on each side, keeps each label on one line and scrolls the row sideways (a horizontal `ScrollView`). |
| `accessibilityLabel` | `string` | | The spec's `label`: the row's name — what the views are views of. |
| `positionText` | `(position, count) => string` | `"2 of 5"` | How a tab's position is announced, in your language. |

A `Tab` is `{ value, label, icon?, labelHidden?, disabled?, testID? }`: `value` identifies it (unique; an empty or
repeated one still renders, the first tab with a value is the one it selects, and both are reported); `label` is its
text and its name, even when `labelHidden` draws the icon alone (without an icon the label is drawn anyway, and
reported); `icon` is a glyph name, a function of `{ color, size, glyph }` or a node — give every tab of a row an icon,
or none; `disabled` prevents selecting it.

Press hold, `pressedFeedback` (overlay, ripple, dim, none), `focusStyle`, corner smoothing and the state motion behave
as for `Button`; each tab is built like a list row (`src/primitives/itemRow.ts`) with the tabs' own tokens:

- **Looks and states** (TAB-3, TAB-6, TAB-11, TAB-23) — the selected tab is drawn from its variant's `selected…` parts,
  every other tab from the variant's own parts, in the state that wins: container (the state layer, which mixes the
  look's state-layer color), label, icon, indicator, opacity. A change of state or of selection moves the colors over
  `motionStateDuration` / `motionStateEasing` (a press at once; reduced motion at once).
- **Size and target** (TAB-5, TAB-18) — at least `containerHeight` tall, `containerHeightWithIcon` in a primary row
  whose tabs stack an icon above a drawn label, and **at least `system.measure.target.touch` wide and tall** with no
  `hitSlop`: tabs touch their neighbours and the panel. The icon is drawn at `iconSize` in the family and fill of the
  tab's selection, `containerGap` from the label (in `labelTypescale`, centered).
- **The indicator** (TAB-16, TAB-17) — on the bottom edge, `activeIndicatorThickness` thick with its top corners at
  `activeIndicatorShape`: under the content (the label, or the icon when it is wider or alone) in primary tabs, under
  the whole tab in secondary ones. A tab's content keeps `activeIndicatorThickness` from its top and bottom edges, so a
  label that wraps grows the tab rather than running under the indicator. When the selection changes it slides and resizes from the old tab to the new one
  over `motionIndicatorDuration` / `motionIndicatorEasing` (JS driver: it animates `left` and `width`), from the
  laid-out positions; at once with reduce motion, or before both tabs have been laid out.
- **Scrolling** (TAB-15) — when the row first appears with its selected tab partly or wholly out of view, it is
  scrolled into view at once, without motion (once the row and the tab have been laid out). A tab that becomes
  selected or gets keyboard focus while partly out of view is scrolled into view over the indicator motion (at once
  with reduce motion). React Native's `scrollTo` has no duration, so the
  row follows an `Animated.Value` frame by frame; unverified on a device, and in right-to-left rows the offsets are
  the platform's.
- **The divider** (TAB-20) — `dividerThickness` in `dividerColor` along the bottom of the whole row, under the tabs
  and the indicator, outside the scrolling content so it spans the row while it scrolls; hidden from assistive
  technology.
- **Keyboard** (TAB-12) — one tab stop, the selected tab (the first enabled tab when the selected one is disabled or
  none is). Right and Left Arrow move to the next and previous **enabled** tab, wrapping (mirrored in right-to-left),
  Home and End to the first and last, and each move selects the tab (automatic activation). Enter and Space reach the
  focused tab as its own click. Keys arrive through `onKeyDown` on the row (the menu's primitive,
  `src/primitives/rovingFocus.ts`), unverified on a device.
- **Accessibility** (TAB-13) — the row is `role="tablist"` named by `accessibilityLabel`; each tab is ONE element with
  `role="tab"`, named by its label whether or not it is drawn, with `accessibilityState.selected` and `disabled` and
  its position (`accessibilityValue`). Icons, the indicator and the divider are hidden. The focus ring is drawn inside
  the tab (TAB-4), which a scrolling row would otherwise clip. There is no tab panel role and no `controls` relation:
  the panel is yours, after the row — and a panel with nothing focusable in it must itself be focusable (`focusable`
  and an `accessibilityLabel` naming its tab) so that Tab reaches it.
- **Right-to-left** (TAB-21) — the row is a flex row with logical padding, which React Native mirrors; a scrollable
  row starts at its right edge as the platform's `ScrollView` does.
- **Not in tabs** — manual activation (focus first, then Enter), swiping between panels, scroll buttons and badges on
  tabs (place a `Badge` on the icon yourself).

### The overlay layer

`TanreiProvider` hosts one **overlay layer** (`src/theme/overlay.tsx`): a view drawn after your app's content, above
it, that takes no touch of its own (`pointerEvents="box-none"`). The non-modal overlays — `Tooltip`, the snackbar host,
`Menu` — are drawn in it (a menu above a snackbar, a tooltip above both), **not in a `Modal`**: a `Modal` is a window of its own that takes every touch and moves
accessibility focus, which a read overlay must not do. The layer exists only while
something is in it, so an app without an open overlay renders exactly its children. It fills the provider's parent:
put `TanreiProvider` at the root of your app. A nested provider shares its outer provider's layer, and a `Dialog`'s
window hosts a layer of its own, so a tooltip inside a dialog is drawn above the dialog and its scrim (TIP-13).

**Insets.** React Native has no safe-area API of its own, and the package takes no safe-area dependency. Give
`TanreiProvider` the window's system insets — `insets={{ top, right, bottom, left }}` (physical sides; a side left out is
0) — and the layer keeps what it draws inside them: a snackbar sits `containerMargin` above the bottom inset (the
keyboard, when it is taller, replaces it) and inside the side insets, a tooltip and a menu keep their margin from the
safe area's edges, and a `Dialog` (its `Modal` a window of its own) is centred in the safe area. `AppBar`, `NavigationBar` and `NavigationRail` read the same insets to reach under the system bars
while keeping their content clear of them; each also takes an `insets` prop, whose sides replace the provider's (a bar
that is not at the top of the window passes `insets={{ top: 0 }}`). A nested provider without `insets` keeps its outer
provider's.

```tsx
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

function Root() {
  const insets = useSafeAreaInsets();
  return <TanreiProvider insets={insets}><App /></TanreiProvider>;
}
export default () => <SafeAreaProvider><Root /></SafeAreaProvider>;
```

### `Tooltip`

A few words that describe an element when a person points at it, focuses it with the keyboard or long-presses it
(`specs/tooltip.spec.json`). The anchor is your element — ONE child that takes a `Pressable`'s props (a Tanrei
`IconButton`, `Button`, your own `Pressable`). The tooltip adds its handlers (calling the anchor's own first), its
ref, and while `describes` its `accessibilityHint`; it never changes the anchor's name or role.

```tsx
<Tooltip text="Move to trash" describes={false}>
  <IconButton accessibilityLabel="Move to trash" onPress={trash}>delete</IconButton>
</Tooltip>

<Tooltip variant="rich" title="Storage" text="Files in the trash still count toward your storage until they are deleted." placement="bottom">
  <IconButton accessibilityLabel="About storage">info</IconButton>
</Tooltip>
```

| Prop | Type | Default | |
|---|---|---|---|
| `text` | `string` | | The description. Required: while it is empty the tooltip never opens and adds nothing (reported in development builds, TIP-16). |
| `variant` | `'plain' \| 'rich'` | `'plain'` | Plain: one phrase on the inverse surface. Rich: `title` above the text on a raised surface. A structural choice, not a token axis: unknown values render as `plain`, reported. |
| `title` | `string` | `''` | A rich tooltip's heading. A plain tooltip ignores it (reported). |
| `placement` | `'top' \| 'bottom' \| 'start' \| 'end'` | `'top'` | The side it prefers; start and end follow the layout direction. Unknown values render as `top`, reported. |
| `describes` | `boolean` | `true` | The text (after the title, for a rich tooltip) is the anchor's `accessibilityHint`, open or not — after the anchor's own hint when it has one. Set it to `false` when the text repeats the anchor's name. |
| `open` | `boolean` | `false` | Shows or hides it from your code (a first-run hint), without `onOpenChange`; it keeps opening and closing itself after. |
| `onOpenChange` | `(open: boolean) => void` | | The spec's `toggle`: it opened or closed by itself. |
| `children` | `ReactElement` | | The anchor. |
| `inline` | `boolean` | `false` | **Tests and the gallery only** (the spec's snapshot harness): draws the anchor and, while open, the tooltip beside it in place — no overlay layer, measuring, motion or timers. |

- **Opening and closing** (TIP-1 … TIP-8) — a pointer resting on the anchor for `motionShowDelay` (hover comes from the
  anchor's `onHoverIn` / `onHoverOut`), keyboard focus at once (focus that comes with a press does not count), a
  long-press at once (the anchor's `onPress` does not fire; `onLongPress` is the tooltip's too). It stays while the
  pointer is on the anchor or the tooltip (`onPointerEnter` / `onPointerLeave`) or the anchor has keyboard focus,
  closes `motionHideDelay` after the pointer leaves both, on blur, `timeoutTouch` after the finger lifts from a
  long-press, on the anchor's activation (and the same hover does not reopen it), and on Escape (the anchor's
  `onKeyDown`: it calls `preventDefault` and `stopPropagation`, and it stays closed until the anchor is focused or
  entered again). One tooltip is open at a time: the next closes it and opens without the delay. **A touch elsewhere
  does not close a long-pressed tooltip sooner** (the layer cannot observe a touch it does not take; the timeout still
  closes it).
- **Placement** (TIP-9) — `offset` from the anchor on its side, centred, flipped when the side has no room (the side
  with more room when neither has), shifted to stay `windowMargin` inside the window. The anchor is measured
  (`measureInWindow`) when it opens, when the anchor lays out and when the window changes; React Native reports no
  other movement, so **a tooltip does not follow an anchor that scrolls**. The
  window's safe area is `TanreiProvider`'s `insets`: each edge of the area moves in by its inset. It is laid out unseen
  until placed.
- **The drawn tooltip** (TIP-10 … TIP-13) — plain: `plainContainerColor`, `plainContainerShape`, `plainContainerElevation`,
  padding, `plainContainerMinHeight`, `plainContainerMaxWidth`, the text in `plainSupportingTextTypescale` /
  `plainSupportingTextColor`, wrapping. Rich: the same `rich…` tokens, `richTitleTypescale` / `richTitleColor` above the
  text, `richContainerGap` apart. Corners eased by the smoothing; text start-aligned and growing with the font scale.
  It holds nothing focusable or pressable and is hidden from assistive technology (the anchor's hint carries the text);
  a press on it closes it and does not reach what is under it.
- **Motion** (TIP-15) — once placed it fades in over `motionEnterDuration` / `motionEnterEasing` and out over
  `motionExitDuration` / `motionExitEasing` (native driver), never moving or scaling. With reduce motion it keeps the
  fade on iOS and appears and disappears at once on Android.
- **Not a tooltip** — anything a person needs to finish a task (a touch user sees it only after a long-press), and a
  note with a link or a button (that waits for a popover component). Do not put one on a disabled anchor.

### `Snackbar` and `useSnackbar`

A brief message at the bottom of the screen about what the app just did, with at most one action
(`specs/snackbar.spec.json`). A read overlay: it is announced politely and never takes focus. Show one
with **`useSnackbar().show()`**: the host that `TanreiProvider` renders in its overlay layer (not a `Modal`) queues,
places, times, animates and announces it, and the promise resolves once it has closed.

```tsx
const snackbar = useSnackbar();

async function archive() {
  await archiveConversation();
  const { result } = await snackbar.show({ message: 'Conversation archived', actionLabel: 'Undo' });
  if (result === 'action') await restoreConversation();
}
```

| `useSnackbar()` | |
|---|---|
| `show(options): Promise<SnackbarResult>` | Queues a snackbar (`SnackbarOptions`, below); it resolves with `{ result: 'action' }` or `{ result: 'dismiss', reason: 'close' \| 'escape' \| 'timeout' \| 'host' }`. Outside a `TanreiProvider` it resolves at once with reason `host` (reported in development builds). |
| `dismissCurrent()` | Closes the showing snackbar (reason `host`). |
| `clear()` | Closes the showing snackbar and drops the waiting ones (each resolves with reason `host`). |

A `<Snackbar>` element is the bar **drawn in place** (SNK-19: the snapshot harness, a documentation page): at rest,
centred across the width it is given, no timeout, queue, entrance or announcement, still calling `onAction` / `onDismiss`.

| Prop (and `show()` option) | Type | Default | |
|---|---|---|---|
| `message` | `string` | | What happened. An empty message still renders (reported). |
| `actionLabel` | `string` | `''` | The spec's `action`: the one action's label ("Undo"). Empty draws none. |
| `closable` | `boolean` | `false` | Draws a close button. |
| `closeLabel` | `string` | `''` | The close button's name, in your language. Required while `closable` (reported when empty). |
| `duration` | `'auto' \| 'short' \| 'long' \| 'indefinite'` | `'auto'` | `auto` is `short` without an action and `indefinite` with one (WCAG 2.2.1). A timed snackbar with an action is reported: offer the action elsewhere too. Unknown values render as `auto`, reported. |
| `onAction` | `() => void` | | `<Snackbar>` only: the action was activated. |
| `onDismiss` | `(reason) => void` | | `<Snackbar>` only: it closed without its action (`close`, or `escape` while focus is inside). |

- **The bar** (SNK-14 … SNK-16) — `containerColor` at `containerElevation` with `containerShape` corners (eased by the
  smoothing), at least `containerMinHeight` tall and as wide as its content between `containerMinWidth` and
  `containerMaxWidth` (never wider than the host less `containerMargin` on each side). The message in
  `supportingTextTypescale` / `supportingTextColor`, padded by `containerPaddingInlineStart` before it and
  `containerPaddingBlock` above and below, wrapping and never cut; then `containerGap`, the controls `controlsGap` apart,
  centred on the message's first line, then `containerPaddingInlineEnd` (`…WithControls` when controls follow). When
  the message needs more than two lines beside the controls, or the action's label would wrap, the action moves to its
  own row below the message, end-aligned, `containerGap` below the text, and the close button stays on the first row —
  decided from the laid-out lines, so it happens after the first layout pass (a render-tree baseline shows the row
  before it).
- **The controls** (SNK-1 … SNK-7) — the action is a text button (`controlsHeight` tall, `controlsPaddingInline`,
  `controlsLabelTypescale`), the close button a `controlsHeight` square with the close glyph at `controlsIconSize`; both
  `controlsShape`, drawn from their own tokens (`controls.action`, `controls.close`) in the state that wins, with the
  press hold, `pressedFeedback`, `focusStyle` (the ring around the control) and the minimum target as `hitSlop`. Each
  is a button named by its label; the action emits once and closes the snackbar.
- **The host** (SNK-8 … SNK-13) — one snackbar at a time, in order: the next is shown after the previous has closed
  and left, and a snackbar not shown yet waits while a Tanrei `Dialog` is open. It sits at the bottom of the layer,
  centred, `containerMargin` from the bottom and the sides of the safe area (`TanreiProvider`'s `insets`: React Native
  has none of its own) and above the on-screen keyboard (`Keyboard` events). `short` and `long`
  close after `timeoutShort` / `timeoutLong` (Android's recommended accessibility timeout when it is longer, and never
  for an action while a screen reader runs), paused while the pointer is over it, focus is in it, the app is not active
  or a dialog covers it — and each resume starts the whole length again. Escape while focus is inside closes it. Its
  controls follow the app's content in the focus order.
- **Announcement** (SNK-10) — once, when shown: the message, then the action's label, with
  `AccessibilityInfo.announceForAccessibilityWithOptions(…, { queue: true })` on iOS (after what is being read) and
  `announceForAccessibility` on Android. Nothing takes focus. When a snackbar closes while focus is inside it, focus
  goes where the platform puts it: React Native cannot tell which element had it before.
- **Motion** (SNK-17) — once laid out it rises from below by its height plus `containerMargin` while it fades in over
  `motionEnterDuration` / `motionEnterEasing`, and fades out in place over `motionExitDuration` / `motionExitEasing`;
  with reduce motion it fades without moving on iOS and appears and disappears at once on Android.
- **Right-to-left** (SNK-18) — a row with logical padding, which React Native mirrors.

### `Dialog` and `DialogSurface`

Stops a person for a decision or a few details (`specs/dialog.spec.json`): Tanrei's modal overlay. Named as React
Native's `Modal` — `visible` and `onRequestClose` — and presented in one: a transparent `Modal` with
`animationType="none"`, `statusBarTranslucent` and `navigationBarTranslucent`, over which Tanrei draws its own scrim
(`scrimColor`) and motion, so every platform draws the same dim.

```tsx
const cancel = useRef<View>(null);

<Dialog
  visible={open}
  headline="Discard draft?"
  supportingText="The message you were writing will be deleted from this device."
  onRequestClose={() => setOpen(false)}
  initialFocusRef={cancel}
  actions={
    <>
      <Button ref={cancel} variant="text" onPress={() => setOpen(false)}>Cancel</Button>
      <Button variant="text" onPress={discard}>Discard</Button>
    </>
  }
/>
```

| Prop | Type | Default | |
|---|---|---|---|
| `visible` | `boolean` | `false` | The spec's `open`. **Controlled**: set it to `false` from an action's handler or `onRequestClose` — an action never closes the dialog by itself (DLG-6). |
| `headline` | `string` | | The question or statement; the dialog's name, read first. An empty one still opens (reported). |
| `supportingText` | `string` | `''` | What will happen; the dialog's description. |
| `alert` | `boolean` | `false` | `role="alertdialog"`, and the headline and supporting text are read out as it opens (`announceForAccessibility`). |
| `dismissible` | `boolean` | `true` | Whether Escape (a hardware keyboard, `onKeyDown`), Android's back, the iOS escape gesture (`onAccessibilityEscape`) and a press on the scrim call `onRequestClose` (once each). While `false` they do nothing. |
| `onRequestClose` | `() => void` | | The spec's `dismiss`. |
| `icon` | glyph name \| function \| node | | Above the headline, at `iconSize` in `iconColor` (the unselected glyph); with it, the icon and the headline are centred. |
| `actions` | `ReactNode` | | Tanrei Buttons, the confirming one last (a fragment is fine). Laid out in one row at the end, `actionsGap` apart, and in a column at the end when the row does not fit (measured from the buttons' own widths); never restyled. |
| `children` | `ReactNode` | | The custom content, below the supporting text. It gets `contentColor` through `useContentColor()` (React Native has no inherited text color); a plain string is drawn in it, in `sys.typescale.body` (`theme.text('body')`, as a card's content is — DLG-8). |
| `initialFocusRef` | `RefObject<{ focus }>` | | Where focus goes when it opens: `focus()` for the keyboard and `AccessibilityInfo.sendAccessibilityEvent(ref, 'focus')` for the screen reader (the ref form of `setAccessibilityFocus`). Without it, the screen reader goes to the headline. |

`DialogSurface` takes the same props without `visible` / `initialFocusRef`: the scrim and the centred container drawn
**in place**, without a `Modal`, motion or focus — the spec's snapshot harness (a 480 × 640 view), the gallery and a
documentation page.

- **Modal** (DLG-1, DLG-3, DLG-15) — a `Modal` is a window of its own: everything outside is inert and hidden from
  assistive technology, the content behind cannot scroll, and focus cannot leave its window — the container is
  `aria-modal` (VoiceOver stays inside). Whether Tab wraps from the last element to the first inside the window is the
  platform's, unverified on a device. A dialog opened from a dialog is a `Modal`
  inside its window, stacked above it with its own scrim; back and keys reach the topmost window.
- **Focus** (DLG-2, DLG-4, DLG-13) — it moves in as the dialog opens (and again on the `Modal`'s `onShow`), not when the
  motion ends. Without `initialFocusRef` only the screen reader moves (to the headline); a hardware keyboard's focus is
  where the platform puts it in the new window. When it closes, focus goes back where the platform returns it: React
  Native cannot tell which element had focus before.
- **Layout** (DLG-7 … DLG-12) — centred in its area (the window's safe area — each edge moved in by `TanreiProvider`'s
  `insets`, the keyboard replacing the bottom inset while it is taller — or the view `DialogSurface` is drawn in, which
  takes no insets), at least `containerMargin` from every edge and from the on-screen keyboard; `containerColor` at `containerElevation` with
  `containerShape` corners (eased by the smoothing); as wide as its content between `containerMinWidth` and
  `containerMaxWidth`, never wider or taller than the area less the margins. `containerPadding` on every side; icon,
  headline, supporting text and content `containerGap` apart (an empty part left out); the actions
  `actionsMarginBlockStart` below. When it does not fit, the supporting text and the content scroll between the fixed
  headline and actions, with a `dividerWidth` line in `dividerColor` across the container below the headline while
  scrolled down and above the actions while more lies below; when the fixed parts leave less than one line for it,
  everything scrolls together.
- **Motion** (DLG-13) — the scrim fades in, the container fades in while growing from `motionEnterScale` over
  `motionEnterDuration` / `motionEnterEasing`; both fade out over `motionExitDuration` / `motionExitEasing` before the
  `Modal` goes. With reduce motion it fades without growing on iOS and appears and disappears at once on Android (it
  waits for the setting's answer before it starts).
- **Accessibility** (DLG-14) — the container has `role="dialog"` (`"alertdialog"` while `alert`), `accessibilityLabel`
  = headline and `accessibilityHint` = supporting text; the headline is a heading. The scrim is not an element.
- **Overlays inside** — the `Modal`'s window hosts an overlay layer of its own, so a `Tooltip` in the dialog is drawn
  above it; a snackbar shown while a dialog is open waits for it (and one already shown pauses), and is drawn under the
  dialog's window.
- **Right-to-left** (DLG-16) — texts take their natural alignment and the actions the row's end, which React Native
  mirrors; the content follows the layout direction as it is.

### `DatePicker` and `DatePickerSurface`

Lets a person choose one date, or one contiguous range, from a month calendar or by typing it
(`specs/date-picker.spec.json`). Two presentations of one picker: **`modal`** — a dialog in a transparent `Modal`
over a scrim, with a header, text entry and Cancel / OK, the choice pending until OK — and **`docked`** — an operated
overlay below your field or button, drawn in `TanreiProvider`'s overlay layer, where choosing a day commits it and
closes the picker. Every date is an **ISO 8601 string** (`"2026-09-17"`): never a `Date`, so no time zone moves a day.

```tsx
const field = useRef<View>(null);
const [open, setOpen] = useState(false);
const [due, setDue] = useState('');

<View ref={field}>
  <TextField
    label="Due date"
    value={due}
    onChangeText={setDue}
    trailingIcon={<IconButton accessibilityLabel="Choose a date" accessibilityHint="Opens a dialog" accessibilityState={{ expanded: open }} onPress={() => setOpen(true)}>calendar_month</IconButton>}
  />
</View>
<DatePicker
  visible={open}
  presentation="docked"
  anchorRef={field}
  value={due}
  onChange={({ value }) => setDue(value)}
  onClose={() => setOpen(false)}
/>

// A range in a dialog:
<DatePicker visible={open} mode="range" label="Select dates" start={start} end={end} min={today} onChange={({ start, end }) => save(start, end)} onClose={() => setOpen(false)} />
```

| Prop | Type | Default | |
|---|---|---|---|
| `visible` | `boolean` | `false` | The spec's `open`. **Controlled**: set it to `false` from `onClose` (DTP-5). |
| `presentation` | `'modal' \| 'docked'` | `'modal'` | A closed choice: unknown values render as `modal` and development builds report them (DTP-40). |
| `mode` | `'single' \| 'range'` | `'single'` | One date in `value`, or one span in `start` … `end` (inclusive). |
| `value`, `start`, `end` | ISO date `string` | `''` | The committed choice. `value` belongs to single mode, `start` / `end` to range mode; the other is ignored (reported). |
| `min`, `max` | ISO date `string` | `''` | The earliest and latest dates that can be chosen. `min` after `max`: both are ignored (reported). |
| `disabledDates` | `readonly string[]` | `[]` | Dates that cannot be chosen. |
| `isDateDisabled` | `(date: string) => boolean` | | A rule no list can hold (every weekend). A day is unavailable when either says so. |
| `today` | ISO date `string` | `''` | The date drawn as today; empty reads the device's date in its own time zone when the picker opens. |
| `firstDayOfWeek` | `'locale' \| 'sunday' \| … \| 'saturday'` | `'locale'` | The weekday in the first column. |
| `locale` | BCP 47 `string` | `''` | Names, digits, the numeric date's order and the first day of the week; empty uses the JavaScript engine's current locale. |
| `entryMode` | `'calendar' \| 'text'` | `'calendar'` | How a modal picker opens (a docked one has the calendar only; `text` is reported). |
| `startView` | `'day' \| 'year'` | `'day'` | Open on the list of years (a birthday). |
| `label`, `dateLabel`, `startLabel`, `endLabel`, `confirmLabel`, `cancelLabel`, `previousMonthLabel`, `nextMonthLabel`, `yearViewLabel`, `textEntryLabel`, `calendarEntryLabel`, `todayLabel`, `invalidText`, `unavailableText` | `string` | English | Every word the picker shows or announces that is not locale data (DTP-37): "Select date", "Date", "Start date", "End date", "OK", "Cancel", "Previous month", "Next month", "Choose a year", "Switch to text entry", "Switch to calendar", "Today", "Enter a valid date", "This date can't be chosen". An empty `label` still opens (reported: the surface has no name). |
| `onChange` | `(selection: { value, start, end }) => void` | | The spec's `change`: a committed choice that differs from the props (OK in a modal picker, a completed choice in a docked one), always before `onClose`. |
| `onClose` | `({ reason }) => void` | | The spec's `close`: `'escape'`, `'back'` (Android's back, the iOS escape gesture), `'outside'` (the scrim, or outside a docked picker and its anchor), `'tab'`, `'focus-out'`, `'cancel'`, `'confirm'` or `'select'`. Only `confirm` and `select` commit. |
| `anchorRef` | `RefObject<{ measureInWindow, focus }>` | | Your field or button: a docked picker is placed below it, and focus goes back to it when either presentation closes with focus inside. |
| `insets` | `TanreiInsets` | the provider's | The window's system insets (React Native cannot read them). |

`DatePickerSurface` takes the same props without `visible` / `anchorRef` / `insets`: the open picker drawn **in
place** — a modal one's scrim over the view it is in and its container centred, a docked one at its natural size —
without a `Modal`, the overlay layer, motion or a focus move. It is fully operable: the spec's snapshot harness (a
480 × 640 or 400 × 440 stage), the gallery and a documentation page.

- **Modal** (DTP-1, DTP-22) — as `Dialog`: a `Modal` window (everything outside is inert, nothing behind scrolls), the
  container `aria-modal`, `modalScrimColor` over the whole window, `modalContainerColor` at `modalContainerElevation`
  with `modalContainerShape` corners (eased by the smoothing), centred at least `modalContainerMargin` from every edge,
  the insets and the keyboard. Tab from its last element (OK, or Cancel while OK is disabled) moves to the entry-mode
  toggle and Shift+Tab back; key events arrive through `onKeyDown` on the renderers that deliver them (unverified on a
  device). It opens with a fade and a grow from `modalMotionEnterScale` and
  closes with a fade; with reduce motion it fades without growing (Android: at once).
- **Docked** (DTP-2, DTP-5, DTP-22) — as `Menu`: in the overlay layer, `dockedOffset` below the anchor, start edges
  aligned (mirrored right to left), flipped above and shifted to stay `dockedViewportMargin` inside the layer, its height
  limited to the room and its calendar scrolling beyond it; measured when it opens and when the window changes (it does
  not follow an anchor that scrolls). No scrim, nothing is made inert, focus is not
  trapped. Four invisible press-catchers surround your anchor: **a press outside the picker and its anchor closes it
  (`'outside'`) and does not reach what is under it**; a press on the anchor is the anchor's. Tab past the grid, or
  Shift+Tab before the view toggle, asks to close (`'tab'`) and is consumed, so focus goes back to the anchor and the
  NEXT Tab moves on from it — React Native cannot send the Tab on (DTP-5); focus leaving it any other way is
  `'focus-out'`. Android's back is `'back'` (`BackHandler`). It fades in and grows from the edge facing the anchor;
  with reduce motion, at once. A docked picker is drawn only inside a `TanreiProvider` (development builds say so).
- **Focus** (DTP-3, DTP-4) — opening moves keyboard focus and the screen reader's to the active day (the displayed
  year in the year view, the first field in text entry) at once — a modal picker also on the `Modal`'s `onShow`, a
  docked one once it is placed. Closing gives focus back to `anchorRef` when focus was inside; without an anchor it
  goes where the platform returns it.
- **Your anchor** (DTP-36) — the picker cannot set properties on your element: give your anchor
  `accessibilityState={{ expanded: open }}` yourself, and say in its name or hint that it opens a dialog (React Native
  has no "has popup" property).
- **The calendar** (DTP-10 … DTP-17) — a navigation row at least `cellSize` tall: the view toggle (the month and year in
  `viewToggleLabelTypescale` and the `expand_more` glyph, `viewToggleContainerHeight` / `…Shape` / `…PaddingInline`,
  drawn in the `unselected` condition's colors, its hit area grown to the target, the chevron turned half a turn over
  the state motion in the year view) and the previous / next month buttons — standard, medium `IconButton`s,
  `navigationGap` apart, disabled at `min`'s / `max`'s month, hidden in the year view. Below: the weekday row (narrow
  names in `weekdayTypescale` / `weekdayColor`, each a column header named by the full name) and six rows of seven
  cells of `cellSize` — never below `system.measure.target.touch`: **the cells are the hit areas** (no `hitSlop` over a
  neighbour). The weekday row is one cell tall (the spec gives it no height).
  A day is its number in `dayLabelTypescale` on a `dayContainerSize` square with `dayContainerShape` corners and an
  `outlineWidth` ring, from ONE condition by precedence: `selected` (the date, a range's start and end) over `inRange`
  (strictly between) over `today` over `unselected`. An in-range day's container spans its cell, so consecutive days
  join into a band with square ends that breaks at the row's ends; a range's start and end draw the half cell toward
  each other in the band's color (logical `start` / `end`: it mirrors right to left). The grid is `role="grid"` named by
  its month; each day one `role="button"` named by its full date ("Thursday, September 17, 2026", then `todayLabel`:
  React Native has no current-date property), `accessibilityState.selected` for the date and every day of a range,
  described by `startLabel` / `endLabel`, `disabled` while unavailable. Empty cells are hidden.
- **Unavailable days** (DTP-29, DTP-30) — before `min`, after `max`, in `disabledDates` or named by `isDateDisabled`:
  drawn from the `disabled` tokens of their condition, never chosen, reachable by the arrow keys. A `value` naming one
  is still drawn as chosen, from `selected`'s disabled tokens.
- **Keyboard** (DTP-17 … DTP-19) — the grid is one Tab stop, the active day (the chosen date or start in the shown
  month, else today, else the first available day, else the first day). Right and Left Arrow move a day the way they
  point (mirrored right to left), Down and Up a week, Home and End to the ends of the week row, Page Down / Up a month
  (the last day of a shorter month), with Shift a year; the month follows; never before `min` or after `max`. Enter and
  Space are the focused day's own click. In the year view: one Tab stop (the displayed year), Right / Left a year, Down
  / Up a row, Home / End to the ends.
- **Paging and views** (DTP-16, DTP-20, DTP-21) — the previous and next buttons keep focus, move the active day to the
  same day number (the last day when shorter) and announce the new month once
  (`announceForAccessibilityWithOptions(…, { queue: true })`). A later month slides in from the end while the old one
  slides out toward the start over `motionPageDuration` / `motionPageEasing`; a view change cross-fades; with reduce
  motion, at once. The year view lists `min`'s year to `max`'s (1900 to 2100 without them) in rows of three, opening
  with the displayed year in the third row; only the rows near the view are drawn (two hundred years would be two
  hundred controls), the focused year's always. Choosing a year shows that year's month (clamped), focuses its active
  day and keeps the choice.
- **Header and actions** (DTP-23, DTP-24) — a modal picker's header: `label` in `headerLabelTypescale` /
  `headerLabelColor`, `headerGap` above the pending choice in `headerValueTypescale` / `headerValueColor` ("Thu, Sep 17";
  "Sep 10 – Sep 16"; the year added when it is not today's), a part not chosen yet as its label in
  `headerPlaceholderColor`; the entry-mode toggle (a standard, medium `IconButton`: `keyboard` / `calendar_month`) at the
  end of the value's line; a `dividerWidth` line below. Cancel and OK are text `Button`s of the medium size, at the end,
  `actionsGap` apart; OK is disabled while the choice is incomplete or a field holds text that is not an available date.
- **Text entry** (DTP-25 … DTP-28) — outlined, medium `TextField`s: one for a date, two side by side for a range. The
  placeholder is the locale's pattern ("mm/dd/yyyy", "yyyy/mm/dd", "dd.mm.yyyy"); a field is filled with its date in the
  locale's numeric form and never reformatted. Three groups of digits (ASCII or the locale's) in the locale's order with
  any separators and a four-digit year read as a date; the error (`invalidText`, `unavailableText`) shows when the field
  is committed (`onEndEditing`) and clears on the next edit. The action key moves to the next field, and in the last
  one activates OK.
- **Scrolling and text size** (DTP-38) — the header and the actions stay while the calendar or the fields scroll
  between them; when they alone leave no room for a cell, everything scrolls. Heights are minimums and font scaling is
  on: days, years, weekday names, the view toggle and the header grow with enlarged text. The surface is as wide as
  seven cells and the container's inline padding (360). On a narrower window (its safe area; a docked picker's viewport
  inside the insets) the margins give way first, then the inline padding, so that the cells keep the minimum target;
  below seven targets (336, a 320-wide phone) the cells narrow equally so that the grid fits the window, their height
  and their numbers unchanged, and the surface is never wider than the window.
- **Locale** (DTP-37) — from the JavaScript engine's `Intl.DateTimeFormat` (`formatToParts` for the numeric order and
  separator; without it the parts are recovered from `format()`) and `Intl.NumberFormat` (digits), always in the
  Gregorian calendar and UTC. **Hermes has no `Intl.Locale` week information**, so the first day of the week comes from
  CLDR's `weekData`, embedded (`src/primitives/calendar.ts`), for the tag's region or the language's likely one. What an
  engine lacks: an unsupported tag falls back to `en-US` (reported), and a `calendar` option it rejects is dropped.
- **States** (DTP-31 … DTP-35) — days, years and the view toggle answer hover, keyboard focus and press as `Button`
  does, from their condition's tokens: press hold, `pressedFeedback` (the ripple grows in the day's container — the band
  for an in-range day), `focusStyle` (the ring around the day's square, an in-range day's too), corner smoothing.

### `TimePicker` and `TimePickerSurface`

Lets a person choose a time of day, in hours and minutes, on a clock dial or by typing it, in a dialog
(`specs/time-picker.spec.json`). The value is always a 24-hour **"HH:MM" string** ("19:30"), whatever clock is shown:
no date, no seconds, no time zone. Presented as `Dialog` is: a transparent `Modal` with Tanrei's scrim and motion.

```tsx
const [open, setOpen] = useState(false);
const [time, setTime] = useState('');

<Button variant="text" onPress={() => setOpen(true)}>{time || 'Set a time'}</Button>
<TimePicker visible={open} value={time} onChange={setTime} onClose={() => setOpen(false)} />
```

| Prop | Type | Default | |
|---|---|---|---|
| `visible` | `boolean` | `false` | The spec's `open`. **Controlled**: set it to `false` from `onClose` (TMP-4). |
| `value` | `"HH:MM"` | `''` | The committed time. Empty: the picker starts from the device's time to the minute. Anything else that is not a 24-hour "HH:MM" is treated as empty (reported). |
| `hourCycle` | `'locale' \| 'h12' \| 'h23'` | `'locale'` | 1–12 with a period, or 00–23; `locale` takes the locale's clock (`resolvedOptions().hourCycle`: a 0–11 locale shows h12, a 1–24 one h23). A closed choice: unknown values render as `locale` and are reported (TMP-29). |
| `entryMode` | `'dial' \| 'text'` | `'dial'` | How it opens. |
| `unit` | `'hour' \| 'minute'` | `'hour'` | The unit the dial shows, and the selector that takes focus, when it opens. |
| `layout` | `'auto' \| 'vertical' \| 'horizontal'` | `'auto'` | `auto` is horizontal only when the vertical layout does not fit the window's height (less the margins) and the horizontal one fits its width — decided from the parts' measured sizes, so the first frame is vertical. |
| `locale` | BCP 47 `string` | `''` | The period names, the digits, the separator and the clock; empty uses the JavaScript engine's current locale. |
| `label`, `hourLabel`, `minuteLabel`, `confirmLabel`, `cancelLabel`, `textEntryLabel`, `dialEntryLabel`, `invalidText` | `string` | English | "Select time", "Hour", "Minute", "OK", "Cancel", "Switch to text entry", "Switch to clock", "Enter a valid time". An empty `label` still opens (reported). |
| `onChange` | `(value: string) => void` | | The spec's `change`: the "HH:MM" committed with OK when it differs from `value` (or `value` was empty), before `onClose`. |
| `onClose` | `({ reason }) => void` | | The spec's `close`: `'escape'`, `'back'` (Android's back, the iOS escape gesture), `'outside'` (the scrim), `'cancel'` or `'confirm'`. Only `confirm` commits. |
| `insets` | `TanreiInsets` | the provider's | The window's system insets. |

`TimePickerSurface` takes the same props without `visible` / `insets`: the scrim and the centred container drawn **in
place**, fully operable, without a `Modal`, motion or a focus move — the spec's snapshot harness (a 480 × 640 stage,
720 × 480 for `horizontal`), the gallery and a documentation page.

- **Modal** (TMP-1, TMP-3, TMP-25) — as `Dialog` and the modal `DatePicker`: its own window (everything outside is
  inert), `aria-modal`, `scrimColor` over the whole window, `containerColor` at `containerElevation` with
  `containerShape` corners (eased by the smoothing), centred at least `containerMargin` from the edges, the insets and
  the keyboard. Tab from its last element (OK, or Cancel while OK is disabled) moves to the first — the hour selector,
  or the period where the locale writes it first — and Shift+Tab back. It opens with a fade and a grow from
  `motionEnterScale` and closes with a fade; with reduce motion it fades without growing (Android: at once). Focus moves
  in at once (and again on the `Modal`'s `onShow`) to the selector of `unit`, or the hour field; when it closes, focus
  goes where the platform returns it — React Native cannot tell which element had it.
- **The display** (TMP-9, TMP-10, TMP-28) — the hour selector, the separator and the minute selector, `selectorGap`
  apart and **always left to right** (`direction: 'ltr'`: a time is written so), each a box of at least
  `selectorContainerWidth` × `selectorContainerHeight` (and the target) with `selectorContainerShape` corners, drawn from
  its condition: `selected` for the unit the dial shows (in the default, a `primary` edge of 2), `unselected` for the
  other. The hour is written as the locale writes it on the clock in use ("7" with h12, "07" with h23 in en-US), the
  minute with two digits, in the locale's digits; the separator is the locale's (":", "." in Finnish). With the 12-hour
  clock the **period selector** sits where the locale's own 12-hour pattern writes the period — read from the order of
  `formatToParts`, never from a list of locales: after the minutes in English ("7:30 AM"), before the hour in Japanese,
  Chinese and Korean ("午前 7:30") — `periodMarginInlineStart` from its neighbour, its place mirrored right to left. Two
  segments side by side, before noon first, each at least `periodContainerWidth` wide and the selectors' height, bordered
  and divided by `periodOutlineWidth` in `periodOutlineColor` with `periodContainerShape` outer corners; the chosen one
  from `selected` (a `primary` fill in the default).
- **The dial** (TMP-12 … TMP-15) — a `dialContainerSize` circle in `dialContainerColor`, twelve numbers clockwise from
  the top (12, 1 … 11; on the 24-hour clock 00 … 11 outside and 12 … 23 on an inner ring a handle smaller; minutes 00 …
  55) in `dialLabelTypescale` / `dialLabelColor`, on the ring half the size less `dialPadding` less half the handle. The
  handle (`dialHandleSize`, `dialHandleColor`) sits on the pending value, joined to the centre by a `dialTrackWidth`
  track and a `dialCenterSize` dot; the part of a number under the handle is drawn in `dialSelectedLabelColor` (the
  numbers drawn again, clipped by the handle), and a minute between fives puts a dot in the handle. A press or a drag
  sets the value nearest the pointer's angle (the nearer ring on the 24-hour dial) through the responder system, at
  once; lifting it on the hour dial moves on to the minutes (and focus from the hour selector to the minute one). A key,
  an action or a field moves the handle along the shorter arc over `motionDialDuration` / `motionDialEasing`, and a
  change of unit cross-fades the numbers; with reduce motion, at once. The dial runs clockwise in every direction and
  is **hidden from assistive technology**: the selectors and the fields are its controls.
- **Selectors and keys** (TMP-11, TMP-16, TMP-26) — each selector has `accessibilityRole="adjustable"`, is named by
  `hourLabel` / `minuteLabel` and reads its value as drawn ("7 AM"); the `increment` / `decrement` accessibility actions,
  Up / Right Arrow and Down / Left Arrow step it by one, wrapping without changing the other unit or the period (12 → 1,
  23 → 00, 59 → 00); Page Up / Down move the minute by five; Home / End go to the first and last value. Focusing or
  pressing a selector shows its unit on the dial. The period selector is `role="radiogroup"` of two `role="radio"`
  segments with `accessibilityState.checked`, one Tab stop (the chosen one); Left and Right Arrow choose the other and
  move focus to it; a chosen period keeps the hour's number (7 AM → 7 PM). Key events arrive through `onKeyDown` on the
  renderers that deliver them (unverified on a device).
- **States** (TMP-17 … TMP-22) — selectors and segments answer hover, keyboard focus and press as `Button` does, from
  their condition's tokens (press hold, `pressedFeedback`, `focusStyle`, corner smoothing); both are at least the touch
  target in each dimension and extend no hit area over a neighbour.
- **Text entry** (TMP-23, TMP-24) — two outlined, large, number `TextField`s (`maxLength` 2) of
  `selectorContainerWidth`, the separator between them in the fields' input style, the period beside them (from their
  top, at least the field's height and the target — a field's `invalidText` below never stretches it). The fields
  report where their containers are laid out (a package-internal context): when a field grows — enlarged text, a label
  that wraps (TXF-13) — the two containers are aligned, and the separator and the period start at their top and are as
  tall as the taller one (TMP-10). A whole
  number of the unit (ASCII or the locale's digits: 1–12 or 0–23 for hours, 0–59 for minutes) sets the pending value;
  committing anything else (empty included) shows `invalidText` until the next edit, and OK is disabled meanwhile. The
  action key moves from the hour field to the minute field, then activates OK. The actions row has the entry-mode toggle
  (a standard, medium `IconButton`: `keyboard` / `schedule`) at the start and Cancel and OK (text `Button`s) at the end.
- **Layout and scrolling** (TMP-7, TMP-8) — vertical: the label, the display and the dial centred `containerGap` apart,
  the actions `actionsMarginBlockStart` below, all inset by `containerPadding`; horizontal: the label, the display and
  (at the bottom) the actions in one column, the dial in the other; text entry is always vertical. The label and the
  actions stay while the rest scrolls between them when the window is short (in the horizontal layout the whole content
  scrolls), and everything scrolls when they alone leave no room. Heights are minimums and font scaling is on.
- **Presets** — `m3-like` and `cupertino` drive the same component with
  their own values and no preset code: m3-like's 96 × 80 `primaryContainer` selectors without an edge, `tertiaryContainer`
  period and 256 dial; cupertino's `surfaceContainerHighest` selectors and dial face with the `primary` edge, continuous
  corners and `dim` feedback. Baselines of `dial-hour` under both, beside the default ones.

### `BottomSheet` and `BottomSheetSurface`

A surface that rises from the bottom edge (`specs/bottom-sheet.spec.json`), in two forms: **modal**, a modal overlay
over a scrim (the default), and **standard**, a layout region that covers the bottom of its parent while the content
above stays usable. **Controlled**: it asks to close with `onClose(reason)` and you set `open` to
false; it never closes itself.

```tsx
const [open, setOpen] = useState(false);

<BottomSheet
  open={open}
  onClose={() => setOpen(false)}
  accessibilityLabel="Share photo"
  handleLabel="Resize sheet"
>
  <List items={targets} />
</BottomSheet>
```

| Prop | Type | Default | |
|---|---|---|---|
| `variant` | `'standard' \| 'modal'` | `'modal'` | Modal dims and blocks the window; standard covers the bottom of its parent with no scrim. Not a token axis (both read the same tokens); unknown values render as `modal`, reported (BSH-25). |
| `open` | `boolean` | `false` | Whether it is shown. **Controlled**: set it to `false` from `onClose` (or your own Close button). |
| `detent` | `'partial' \| 'full'` | `'partial'` | The height it rests at while its content is taller than its partial height. A height the person chose (a drag, the handle) stays until you set `detent` to another value; your change moves it without `onDetentChange` (BSH-21). Unknown values render as `partial`. |
| `onDetentChange` | `(detent) => void` | | The spec's `detentChange`: the person moved it to its other height (once per move). |
| `dismissible` | `boolean` | `true` | Whether a drag below its lowest height and, for a modal sheet, the scrim, Escape, Android's back and the iOS escape gesture call `onClose`. While `false` they do nothing (a drag settles back); put a Done button in the content. |
| `onClose` | `(reason: 'drag' \| 'scrim' \| 'escape' \| 'back') => void` | | The spec's `close`, once per input. |
| `handle` | `boolean` | `true` | Draws the drag handle. |
| `handleLabel` | `string` | `''` | The handle's accessible name ("Resize sheet"); required while it is a button (reported in development builds). |
| `inset` | `boolean` | `true` | Insets the content by `containerPadding`; `false` lets a list with its own padding reach the edges. |
| `accessibilityLabel` | `string` | `''` | The spec's `label`: names the dialog (modal) or the region (standard). Required (reported). |
| `initialFocusRef` | `RefObject<{ focus }>` | | Where focus goes when it opens: `focus()` for the keyboard and the screen reader's focus. Without it the screen reader moves to the container. |
| `insets` | `TanreiInsets` | the provider's | The window's system insets for this sheet; each side named replaces `TanreiProvider`'s. The package takes no safe-area dependency. |
| `children` | `ReactNode` | | The content. A string is drawn in `contentColor` in `sys.typescale.body`; anything else reads `useContentColor()`. |

`BottomSheetSurface` takes the same props without `open` / `initialFocusRef`: the sheet as it rests open — the scrim
(modal) and the sheet at the bottom of the view it is drawn in — without a `Modal`, the enter / exit motion or a focus
move; the handle, the drag and `onClose` work as in `BottomSheet`. It is the spec's snapshot harness (a 400 × 720 view
over a `surface` page), the gallery's entry and a documentation page's.

- **Modal** (BSH-1, BSH-2, BSH-5, BSH-23) — a transparent React Native `Modal` (`animationType="none"`,
  `statusBarTranslucent`, `navigationBarTranslucent`): a window of its own, so everything behind it is inert to touch,
  the keyboard and assistive technology, the content behind cannot scroll, and focus cannot leave its window; the
  container is `role="dialog"`, `aria-modal`, `accessibilityViewIsModal`. Whether Tab wraps inside the window is the
  platform's, as for `Dialog`. Tanrei draws the scrim (`scrimColor`) and the motion, so
  every platform draws the same dim. The window hosts an overlay layer of its own (a tooltip or a menu in the sheet is
  drawn above it); a dialog opened from the sheet is a `Modal` inside its window, and back reaches only the topmost; a
  snackbar waits while the sheet is open. `onClose` reasons: a press on the scrim (`scrim`), Escape on a hardware keyboard
  (`escape`, `onKeyDown`), Android's back (`back`, the `Modal`'s `onRequestClose`), the iOS escape gesture (`back`,
  `onAccessibilityEscape`) and a released drag (`drag`).
- **Standard** (BSH-4) — a view placed absolutely over its parent (put it in the view that holds the content it covers):
  no scrim, no `Modal`, nothing inert, no trap; Tab leaves it and it stays open; Escape and back do nothing; presses above
  the sheet reach the content (`pointerEvents="box-none"`). It does not pad the content: a product whose content must
  stay visible above it pads its scrolling content by the sheet's partial height. `role="region"` named by the label.
- **Focus** (BSH-3) — when `open` changes to true (not after the motion) focus moves to `initialFocusRef`, else the
  screen reader to the container (`AccessibilityInfo.sendAccessibilityEvent(ref, 'focus')`); a modal sheet moves it once
  more on the `Modal`'s `onShow`. A modal sheet mounted open moves focus in as if it had just opened (everything behind
  it is unreachable); a standard sheet mounted open does not. **When it closes, focus goes where the platform puts it**:
  React Native cannot tell which element had focus before it opened, as for the dialog.
- **Heights** (BSH-6, BSH-7, BSH-24) — as tall as the handle's row and the content, up to its detent's bound:
  `containerPartialFraction` of the area at `partial`, the area less `containerMarginBlockStart` at `full`. The area is
  the window below its top inset (modal) or the parent (standard), ending at the on-screen keyboard (`Keyboard` events),
  so the sheet sits on the keyboard. At rest these are layout rules (a percentage `maxHeight`, the top margin as the
  area's padding), so a render needs no measurement; the sheet has two heights only while its measured content is taller
  than its partial height — before the first layout pass it has one, and the handle is not a button yet (the render-tree
  baselines are recorded before layout). As wide as the area up to
  `containerMaxWidth`, centred, in `containerColor` at `containerElevation` (its shadow and, where the level has one, its
  ring), with `containerShape` top corners (eased by the smoothing) and square bottom ones; its color reaches under the
  bottom inset and its content stays above it (none while the keyboard is shown). Larger text grows the content up to
  the bound, then it scrolls; the handle does not scale.
- **Content** (BSH-8, BSH-10) — below the handle's row, inset by `containerPadding` at its start, end and bottom (and top
  without a handle) unless `inset` is false, clipped, in a `ScrollView`; `contentColor` through `useContentColor()`. The
  handle's row stays in place while the content scrolls.
- **Drag** (BSH-9, BSH-10, BSH-20) — `PanResponder` on the handle's row, the padding and the content: past 8 points
  vertically the sheet follows the finger (never above its full height; below its lowest height it moves down); on
  release it settles at the next height in a fling's direction (faster than 0.5 pt/ms), else the nearest, over
  `motionEnterDuration` / `motionEnterEasing` (at once with reduce motion). Below half of its lowest height, or a downward
  fling with no height below, it calls `onClose('drag')` (while `dismissible`), waits one frame where the drag left it,
  and then leaves from there if you closed it or settles back if you did not. On the content an upward drag first raises
  the sheet to its full height and a downward one lowers it only once the content is scrolled to its top; React Native
  cannot hand one gesture from the sheet to the content's native scroll midway, so the remainder of that drag is lost
  and the next one scrolls.
- **Drag handle** (BSH-11 … BSH-19) — a `handleContainerWidth` × `handleContainerHeight` box with `handleContainerShape`
  corners, `handleMarginBlock` above and below, centred, the grip (`handleGripWidth` × `handleGripHeight`,
  with round ends) centred in it; each drawn from the `dragHandle` control's state tokens. With two heights it is one
  `role="button"` named by `handleLabel` with `accessibilityState.expanded` (true at full), and a press, Enter or Space
  moves the sheet to its other height; with one height it is drawn at rest and is not focusable, pressable or exposed.
  Press hold, `pressedFeedback` (overlay, ripple, dim, none), keyboard focus, `focusStyle`, corner smoothing and the state
  motion behave as for `Button`. Its hit area is its whole row across the box, never less than
  `system.measure.target.touch` (cupertino's 16-high box with no margin still reaches it). A drag that starts on the
  handle ends its press once the sheet follows it. The grip is hidden from assistive technology.
- **Right-to-left** (BSH-26) — the container and the handle stay centred; the content's padding is logical, so it
  follows the direction.
- **Not in the sheet** — a third, collapsed height (a peek): the spec leaves it out.

### `SideSheet` and `SideSheetSurface`

A panel at the end edge with a headline, an optional close button and optional actions (`specs/side-sheet.spec.json`),
in two forms on a token axis: **standard**, a layout region beside the content — put it at the end of a row —
and **modal**, a modal overlay over a scrim. One product uses both: standard where the window is wide, modal where it is
not. **Controlled**: it asks to close with `onClose(reason)` and you set `open` to false.

```tsx
<View style={{ flex: 1, flexDirection: 'row' }}>
  <Results style={{ flex: 1 }} />
  <SideSheet
    variant={wide ? 'standard' : 'modal'}
    open={open}
    onClose={() => setOpen(false)}
    headline="Filters"
    closable
    closeLabel="Close filters"
    actions={
      <>
        <Button variant="filled" onPress={apply}>Apply</Button>
        <Button variant="text" onPress={reset}>Reset</Button>
      </>
    }
  >
    <FilterList />
  </SideSheet>
</View>
```

| Prop | Type | Default | |
|---|---|---|---|
| `variant` | `SideSheetVariant`: `'standard' \| 'modal'` + your system's | `'standard'` | An open key: a value the active system does not have is drawn from `standard`'s tokens, reported (SSH-13); only `modal` is presented as an overlay. |
| `open` | `boolean` | `false` | Standard: whether it takes its width in the row. Modal: whether it is presented. **Controlled**. |
| `headline` | `string` | `''` | Drawn in the header in `headlineTypescale` / `headlineColor` (it wraps; `role="heading"`), and the sheet's accessible name. Required (reported). |
| `closable` | `boolean` | `false` | Draws the close button at the end of the header: a standard, medium `IconButton` showing the `close` glyph, placed (centred in the header) and never restyled. A standard sheet has no other way to close, so give it one unless your own control closes it. |
| `closeLabel` | `string` | `''` | The close button's accessible name ("Close filters"). Required while `closable` (reported). |
| `onClose` | `(reason: 'close' \| 'scrim' \| 'escape' \| 'back' \| 'drag') => void` | | The spec's `close`, once per input: the close button (either form); for a modal sheet also the scrim, Escape (`onKeyDown`), Android's back (`onRequestClose`), the iOS escape gesture (`back`, `onAccessibilityEscape`) and a drag toward its edge. |
| `actions` | `ReactNode` | | The spec's `actions` slot: Tanrei Buttons, main action first (a fragment is fine). Never restyled. |
| `children` | `ReactNode` | | The content. A string is drawn in `contentColor` in `sys.typescale.body`; anything else reads `useContentColor()`. |
| `initialFocusRef` | `RefObject<{ focus }>` | | Where focus goes when it opens. Without it the screen reader moves to the headline (else the container). |
| `insets` | `TanreiInsets` | the provider's | The window's system insets; each side named replaces `TanreiProvider`'s (pass `{ top: 0 }` for a sheet below an app bar). |
| `style` | `ViewStyle` | | Layout of a standard sheet in its row (margins); do not restyle tokens here. |

`SideSheetSurface` takes the same props without `open` / `initialFocusRef`: the sheet as it rests open, in place — a
standard sheet at its width (put it at the end of a row), a modal one with its scrim over the view it is drawn in and
its panel at that view's end — without a `Modal`, motion or a focus move. It is the spec's snapshot harness (a
720 × 480 view over a `surface` page) and the gallery's entry.

- **The panel** (SSH-7, SSH-8) — `containerWidth` wide beside the end inset (a modal sheet never wider than the window
  less `system.measure.target.touch`, so a strip of scrim stays pressable), the full height of its row (standard) or of
  the window (modal), in the variant's `containerColor` at its `containerElevation` (its shadow and, where the level has
  one, its ring), with start corners of the variant's `containerShape` (eased by the smoothing) and square end corners,
  and a start edge of `outlineWidth` in the variant's `outlineColor` (the standard sheet's hairline; none where the color
  draws nothing). Its color reaches under the end, top and bottom insets; the header, content and actions stay inside
  them. Right-to-left puts it at the left edge, mirrored.
- **Header** (SSH-8, SSH-9, SSH-5) — while there is a headline or a close button: a row at least `headerHeight` high
  (it grows with a wrapping headline), the headline from `containerPaddingInline`, the close button ending
  `headerPaddingInlineEnd` before the end edge (without one, the headline ends `containerPaddingInline` before it),
  `headerGap` apart, both centred.
- **Content** (SSH-8, SSH-10) — `containerPaddingInline` from the sides, directly below the header (or
  `containerPaddingBlock` below the top without one), scrolling between the header and the actions, which stay in place;
  `containerPaddingBlock` below it when there are no actions.
- **Actions** (SSH-11) — below a `dividerWidth` hairline in `dividerColor` across the full width (hidden from assistive
  technology): one row from the start, `containerPaddingInline` from the sides, `actionsGap` apart, `actionsPaddingBlock`
  above and below; a column from the start in the same order when the row does not fit (measured from the buttons' own
  widths, as the dialog's actions are).
- **Standard** (SSH-1, SSH-3) — in the layout while open, gone while closed (no width, nothing for assistive technology
  or focus); when `open` changes its width moves over `motionEnterDuration` / `motionEnterEasing` or `motionExitDuration`
  / `motionExitEasing` while the content beside it resizes (at once with reduce motion). No scrim, no `Modal`, no trap;
  Tab leaves it and it stays open; Escape, back and drags do nothing. `role="complementary"` named by the headline.
- **Modal** (SSH-2, SSH-4, SSH-6, SSH-15) — a transparent React Native `Modal` (`animationType="none"`,
  `statusBarTranslucent`, `navigationBarTranslucent`): a window of its own, so everything behind it is inert, focus cannot
  leave its window and the container is `role="dialog"`, `aria-modal`, `accessibilityViewIsModal`. The scrim
  (`scrimColor`) fades in while the panel slides in from the end edge over the enter motion; both leave over the exit
  motion; a fade in place with reduce motion (at once on Android). A drag toward the end edge (`PanResponder`, past 8
  points horizontally) moves it; released past half its width, or flung that way faster than 0.5 pt/ms, it calls
  `onClose('drag')`, holds one frame, and slides out from there if you closed it or back if you did not; a shorter drag
  slides back over the enter motion. The window hosts its own overlay layer; a dialog opened from it stacks above, and
  back reaches only the topmost; a snackbar waits.
- **Focus** (SSH-3) — when `open` changes to true (not after the motion) focus moves to `initialFocusRef`, else the
  screen reader to the headline (again on the modal `Modal`'s `onShow`). A modal sheet mounted open moves focus in as if
  it had just opened (everything behind it is unreachable); a standard sheet mounted open does not. **When it closes,
  focus goes where the platform puts it**: React Native cannot tell which element had focus.
- **Text size** (SSH-14) — the width stays; the header grows with its headline; the content scrolls; the close button
  scales as an `IconButton` does (it does not).
- **Not in the sheet** — opening a modal sheet by a swipe from the screen edge: open it from a button.

### `AppBar` and `useAppBarScroll`

Names the current screen at its top edge and holds the way back and the screen's most used actions
(`specs/app-bar.spec.json`): flat while the content is at its top, set apart once content scrolls under it. A layout
region, not an overlay: it has no role of its own and takes no focus. `navigation` and `actions` are **your**
`IconButton`s (the spec's item kinds `navigation` and `action`), laid out and never restyled.

```tsx
<AppBar
  title="Inbox"
  navigation={<IconButton accessibilityLabel="Back" onPress={goBack}>arrow_back</IconButton>}
  actions={
    <>
      <IconButton accessibilityLabel="Search" onPress={search}>search</IconButton>
      <IconButton accessibilityLabel="More options" onPress={more}>more_vert</IconButton>
    </>
  }
/>
```

A large bar that collapses as its content scrolls is connected with **`useAppBarScroll()`**: `scroll.onScroll` goes to
the `ScrollView` or `FlatList` (with `scrollEventThrottle={16}`), `scroll.state` to the bar's `scrollState`. Only the bar
re-renders as the content scrolls. For the collapse to follow the content one for one, lay the bar **over** the
scrolling view and pad the content by the bar's expanded height; the bar then shrinks from the bottom as the content
moves up under it:

```tsx
const scroll = useAppBarScroll();
const [barHeight, setBarHeight] = useState(0);

<View style={{ flex: 1 }}>
  <ScrollView onScroll={scroll.onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: barHeight }}>
    {content}
  </ScrollView>
  <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }} onLayout={(e) => setBarHeight((h) => Math.max(h, e.nativeEvent.layout.height))}>
    <AppBar size="large" title="Inbox" scrollState={scroll.state} navigation={menuButton} />
  </View>
</View>
```

| Prop | Type | Default | |
|---|---|---|---|
| `title` | `string` | `''` | The screen's name and its heading (`role="heading"`). Empty: no title, no heading. |
| `subtitle` | `string` | `''` | One line under the title. Empty: none. |
| `size` | `AppBarSize`: `'small' \| 'large'` + your system's | `'small'` | Small: one row. Large: an expanded title row under the top row, which collapses into it as the content scrolls. An open key: unknown values render as `small`, reported in development builds (APB-14); a size your system adds that is taller than `small` gets an expanded row from its own tokens. |
| `titleAlignment` | `'start' \| 'center'` | `'start'` | Where the top row's title sits. A closed choice: unknown values render as `start`, reported. |
| `scrolled` | `boolean` | `false` | Whether content lies under the bar, when no scroll view is connected: the scrolled look, and a large bar drawn collapsed. |
| `scrollState` | `AppBarScrollState` | | `useAppBarScroll().state`: sets `scrolled` and the collapse from the connected scroll view; `scrolled` is then ignored. |
| `navigation` | `ReactNode` | | ONE `IconButton` (back, menu, close) at the start. More than one still renders, reported in development builds. |
| `actions` | `ReactNode` | | Up to three `IconButton`s at the end, in reading order (a fragment). More still render, reported: they belong in an overflow menu. |
| `insets` | `TanreiInsets` | the provider's | The top and side insets the bar reaches under. Each side given replaces `TanreiProvider`'s (`{ top: 0 }` for a bar that is not at the top of the window). |
| `style` | `StyleProp<ViewStyle>` | | Layout of the bar. Every other `View` prop goes to the container. |

- **Conditions** (APB-1 … APB-3) — `conditions.flat` while nothing is under the bar, `conditions.scrolled` while
  something is: each has `containerColor`, `containerElevation` and `outlineColor`, the bottom edge `outlineWidth` thick
  inside the bar (the default system: the same surface, and a hairline edge only once scrolled; a paint that resolves
  to nothing draws nothing — cupertino's flat bar has no fill at all). A change of condition moves the color, elevation
  and edge over `motionConditionDuration` / `motionConditionEasing` (at once with reduce motion).
- **The top row** (APB-4 … APB-6) — the parent's full width, at least `sizes.small.containerHeight` high (a large bar's
  top row is the small height): the navigation item `containerPaddingInline` from the start, the actions
  `containerPaddingInline` from the end (`actionsGap` apart), `containerGap` around the title; without a navigation item
  the title starts `titleInset` from the start (and without actions it ends `titleInset` from the end). The title is
  in `sizes.small.titleTypescale` / `titleColor`, the subtitle below it in `sizes.small.subtitleTypescale` /
  `subtitleColor`, centred as a block, each on one line with an ellipsis. Centred, the title block is narrowed on the
  side with the smaller slot so that it is centred on the bar's width and never runs under either slot — from the
  slots' laid-out widths, so a render-tree baseline shows it before the first layout pass.
- **The expanded row** (APB-7) — for a size taller than `small`: under the top row, at least the size's height less the
  top row, the title in the size's `titleTypescale` and the subtitle in its `subtitleTypescale`, `titleInset` from the
  start (whatever `titleAlignment` says), the block ending `containerPaddingBlockEnd` above the bottom edge. The top
  row then draws no title.
- **Collapse** (APB-8, APB-9) — connected, a large bar shrinks one for one with the scroll from its expanded height to
  the top row; the expanded title row moves up with the bottom edge, clipped under the top row, and the top row's title
  fades in with the part of the expanded title that is covered (from the measured row and title). Back toward the top
  it expands again. `scrolled` is true once content lies under the bar — for a large bar only once it has fully
  collapsed. Without a connection a large bar is drawn collapsed while `scrolled` is true and expanded while it is
  false.
- **Insets** (APB-10) — the bar's color fills the top and side insets (`TanreiProvider`'s `insets`, or the bar's own);
  its content stays inside them. React Native has no safe-area API: see "The overlay layer".
- **Accessibility** (APB-11 … APB-13) — the bar is not an element and not focusable; the icon buttons keep their own
  role, name and focus order (navigation first). The title is a heading and the subtitle is read after it. While both
  titles of a large bar are drawn, only the expanded one is exposed (the other is hidden from assistive technology);
  once collapsed, only the top row's. Not a landmark: wrap it in your own view if it is the screen's banner.
- **Text size** (APB-15) — heights are minimums, so the rows grow with the text; titles stay on one line and scale;
  the icon buttons' glyphs do not.

### `Toolbar`

A short row of actions for the current screen or selection, docked across the bottom edge or floating over the
content (`specs/toolbar.spec.json`). The items are **your** `IconButton`s (the spec's item kind `action`, toggles
included) and `Button`s (`button`), laid out and never restyled (TBR-9): each draws from its own tokens and keeps its
own press, target, disabled behaviour, events and semantics. The toolbar is **one Tab stop** over them (the WAI-ARIA
toolbar pattern, TBR-10).

```tsx
<Toolbar variant="floating" accessibilityLabel="Formatting" style={{ alignSelf: 'center', marginBottom: 16 }}>
  <IconButton toggle selected={bold} onSelectedChange={setBold} accessibilityLabel="Bold">format_bold</IconButton>
  <IconButton toggle selected={italic} onSelectedChange={setItalic} accessibilityLabel="Italic">format_italic</IconButton>
  <IconButton accessibilityLabel="Insert link" onPress={insertLink}>link</IconButton>
</Toolbar>
```

| Prop | Type | Default | |
|---|---|---|---|
| `variant` | `ToolbarVariant`: `'docked' \| 'floating'` + your system's | `'docked'` | Docked spans the bottom edge; floating is a rounded, raised surface over the content. An open key: unknown values render as `docked`, reported in development builds (TBR-13). A value your system adds keeps its own values and takes the docked structure (spans the width, reaches under the insets, spreads its items, a top edge), TBR-13. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Vertical is for a floating toolbar beside the content. A docked toolbar is always horizontal (asked to be vertical, it is reported, TBR-6). A closed choice: unknown values render as `horizontal`, reported. |
| `accessibilityLabel` | `string` | | The spec's `label`: names the toolbar; never drawn. Required: without it the toolbar still renders and development builds say so (TBR-12). |
| `insets` | `TanreiInsets` | the provider's | A docked toolbar's bottom and side insets (its color fills them, its items stay inside them). Each side given replaces `TanreiProvider`'s (`{ bottom: 0 }` for a toolbar that is not at the bottom of the window). A floating toolbar reads none. |
| `children` | `IconButton` / `Button` elements | | The items, in reading order (a fragment is fine). Anything else, or no item, still renders and is reported in development builds: a field or a slider would take the arrow keys (TBR-12). |
| `style` | `StyleProp<ViewStyle>` | | Layout of the toolbar. A floating toolbar does not place itself (TBR-5): give it `alignSelf`, margins or a `position` here, as you would a FAB. |

- **Docked** (TBR-1 … TBR-3) — the parent's full width, the items' row at least `variants.docked.containerSize` high
  above the bottom inset, filled with `containerColor`, raised by `containerElevation`, cornered by `containerShape`,
  with a top edge `outlineWidth` thick in `outlineColor`. The first item sits `containerPaddingInline` from the start
  edge and the last as far from the end edge, the items spread with at least `containerGap` between them, each centred
  across the row; one item is centred. The color reaches under the bottom and side insets.
- **Floating** (TBR-4, TBR-5, TBR-6) — as long as its items (`containerPaddingInline` at each end, `containerGap` between
  them) and at least `variants.floating.containerSize` across, filled, raised and rounded (eased by
  `sys.shape.corner-smoothing`) by the floating tokens, an edge around the whole shape where `outlineColor` draws. It
  lays out at its own size (`alignSelf: 'flex-start'`, as a Button does): its layout places it. Vertical stacks the
  items top to bottom with the paddings along the vertical axis.
- **Items** — a `Button` or `IconButton` that is a direct child (or in a fragment) is told, through an internal React
  context (not a prop), to sit centred across the row, whether it is the Tab stop, and when it takes focus. Nothing
  else about it changes; outside a toolbar it is its own Tab stop as always.
- **Keyboard** (TBR-10) — only one item is focusable: the item focused last, else the first that is not disabled.
  Right / Left Arrow (horizontal; mirrored in right-to-left, TBR-7) or Down / Up Arrow (vertical) move focus to the
  next / previous item that is not disabled, wrapping; Home and End to the first and last. Moving focus never
  activates; Enter and Space reach the focused item as its own press. A disabled item never takes focus. Key events
  arrive where a hardware keyboard is attached, as for `Tabs`.
- **Too many items** (TBR-8) — the row scrolls along its axis (a `ScrollView`, always present, so the items never
  remount); items keep their size and the gap its minimum, nothing wraps or shrinks, an item that takes keyboard focus
  is scrolled fully into view at once (the toolbar has no motion tokens), and development builds say the extra actions
  belong in an overflow menu (a `Menu` anchored to a "More" `IconButton`).
- **Accessibility** (TBR-11) — the view has `role="toolbar"` named by `accessibilityLabel`; each item keeps its own
  role, name and state. React Native has no orientation property for assistive technology, so a vertical toolbar is
  not announced as vertical.
- **Text size** (TBR-14) — the sizes are minimums: an item that grows with the text (a `Button`'s label) grows the
  toolbar across its axis; the toolbar scales nothing itself.

### `NavigationBar`

Moves between three to five top-level destinations from the bottom edge of a compact screen, and shows which one is
current (`specs/navigation-bar.spec.json`). A layout region, not an overlay. `destinations` is an array of
`NavigationBarDestination` — the spec's item kind `destination` — and the bar is selected by value.

```tsx
const [screen, setScreen] = useState('inbox');

<NavigationBar
  accessibilityLabel="Main"
  value={screen}
  onValueChange={setScreen}
  onReselect={scrollToTop}
  destinations={[
    { value: 'inbox', label: 'Inbox', icon: 'inbox', badge: { count: 3, label: '3 unread' } },
    { value: 'chat', label: 'Chat', icon: 'chat', badge: { label: 'New messages' } },
    { value: 'starred', label: 'Starred', icon: 'star' },
    { value: 'settings', label: 'Settings', icon: 'settings' },
  ]}
/>
```

| Prop | Type | Default | |
|---|---|---|---|
| `destinations` | `readonly NavigationBarDestination[]` | | The destinations, in order: three to five (fewer or more still render, reported in development builds). |
| `value` | `string` | `''` | The selected destination's value. **Controlled**: move it from `onValueChange`. Empty selects none; a value no destination has selects none and is reported. |
| `onValueChange` | `(value: string) => void` | | The spec's `change`: a destination that is not selected was activated (touch, pointer, Enter, Space). |
| `onReselect` | `(value: string) => void` | | The spec's `reselect`: the selected destination was activated again (scroll that screen to its top). |
| `labelVisibility` | `'always' \| 'selected' \| 'never'` | `'always'` | Which destinations draw their label. A label not drawn is still the destination's name. A closed choice: unknown values render as `always`, reported. |
| `accessibilityLabel` | `string` | | The spec's `label`: names the bar ("Main"). |
| `positionText` | `(position, count) => string` | `"2 of 4"` | How a destination's position is announced, in your language. |
| `insets` | `TanreiInsets` | the provider's | The bottom and side insets the bar reaches under. Each side given replaces `TanreiProvider`'s. |

A `NavigationBarDestination` is `{ value, label, icon, disabled?, badge?, testID? }`: `value` identifies it (a repeated
value selects the first and is reported); `label` is its name (an empty one still renders, reported); `icon` a glyph
name of the system's icon font (a function of `{ color, size, glyph }` or a node also works); `disabled` keeps its place,
draws its disabled look and leaves the focus order; `badge: { count?, label? }` draws a Tanrei `Badge` on the icon —
`count` as the badge's (`null` or left out: the dot; 0: nothing; above 999: `999+`), `label` what assistive technology
reads (a dot needs one). `NavigationRailDestination` is the same shape.

Press hold, `pressedFeedback` (overlay, ripple, dim, none), `focusStyle`, corner smoothing and the state motion behave as
for `Button`; each destination is built on the list row's shared state (`src/primitives/itemRow.ts`) and the
destination cell the bar shares with the rail (`src/primitives/destination.tsx`):

- **The bar** (NVB-11, NVB-18) — the parent's full width, at least `containerHeight` above the bottom inset, in
  `containerColor` at `containerElevation`, with a top edge of `outlineWidth` in `outlineColor` (none when its color
  resolves to nothing). Its color reaches under `TanreiProvider`'s bottom and side insets (or the bar's own `insets`);
  the destinations stay above and inside them. Equal cells, one per destination, in reading order (a row, which React
  Native mirrors in right-to-left).
- **The cell** (NVB-6) — the whole cell is the pressable: the bar's full height and an equal share of its width, at
  least `system.measure.target.touch` both ways, with no `hitSlop` (cells touch). A press anywhere in it answers on the
  item container.
- **The destination** (NVB-12 … NVB-14, NVB-16) — the item container, `itemContainerWidth` × `itemContainerHeight` with
  `itemContainerShape` corners, is the state layer's box and the active indicator: its fill is the condition's
  `itemContainerColor` in the state that wins (a paint of nothing draws no fill). The icon is centred in it at
  `itemIconSize`, in the family and fill of its selection; a badge sits on the icon (and stays while disabled). The label
  is `itemGap` below, centred, in `itemLabelTypescale`, on one line with an ellipsis. `labelVisibility` `selected` draws
  only the selected destination's label, `never` none; a destination without a label centres its item container.
- **Looks and states** (NVB-3, NVB-4, NVB-7) — the selected destination is drawn from `conditions.selected`, the others
  from `conditions.unselected`: the item container, icon and label colors and the opacity, of the state that wins
  (pressed > focused > hovered; disabled). A disabled selected destination keeps its indicator.
- **Press** (NVB-8, NVB-9) — `ripple` grows in the item container, clipped to it, from the point of contact — from its
  centre for a press on the label or a keyboard activation; `dim` dims the whole destination.
- **Focus** (NVB-5, NVB-10) — the focus ring around the item container, for keyboard focus only, never animated.
- **Selection motion** (NVB-15) — the new destination's indicator grows from the centre of its item container
  (`scaleX`, JS driver) while the previous one fades, and the icon and label colors move, over
  `motionSelectionDuration` / `motionSelectionEasing`; with `labelVisibility: 'selected'` the labels appear and disappear
  (height and opacity) over the same time, moving the item containers. The icon's fill switches at once — a glyph's fill
  is a font, not a color. With reduce motion, at once.
- **Accessibility** (NVB-19, NVB-20, NVB-2) — a tab bar: the bar is `role="tablist"` named by `accessibilityLabel`; each
  destination is ONE element with `role="tab"`, named by its label (drawn or not), with `accessibilityState.selected`
  and `disabled`, and its position then the badge's description (its `label`, or the count it shows) as
  `accessibilityValue` ("Inbox, tab, 1 of 4, 3 unread"). The icon and badge drawings are hidden. Each destination that is
  not disabled is its own tab stop (Tab moves through them), as the links of a navigation region are; Enter and Space
  reach it as its own click.
- **Text size** (NVB-21) — the bar's height is a minimum, so labels at an enlarged text size grow it and stay on one
  line; item containers and icons do not scale. **React Native has no large-content viewer** (iOS shows one for its own
  tab bar on a long press).
- **Not in the bar** — a floating action button over it and hiding it while scrolling are the screen's.

### `NavigationRail`

The navigation bar's destinations along the start edge of a wide window (`specs/navigation-rail.spec.json`), with an
optional header for your menu icon button and floating action button. The same props and destination shape as
`NavigationBar`, so a product switches between them without touching its data; the destination cell is the same
(`src/primitives/destination.tsx`).

```tsx
<View style={{ flex: 1, flexDirection: 'row' }}>
  <NavigationRail
    accessibilityLabel="Main"
    value={screen}
    onValueChange={setScreen}
    header={
      <>
        <IconButton accessibilityLabel="Menu" onPress={openDrawer}>menu</IconButton>
        <FloatingActionButton accessibilityLabel="Compose" icon="edit" onPress={compose} />
      </>
    }
    destinations={destinations}
  />
  <Content />
</View>
```

| Prop | Type | Default | |
|---|---|---|---|
| `destinations` | `readonly NavigationRailDestination[]` | | The destinations, in order: three to seven (fewer or more still render, reported). The same shape as `NavigationBarDestination`. |
| `value`, `onValueChange`, `onReselect`, `labelVisibility`, `accessibilityLabel`, `positionText` | | | As `NavigationBar`'s. |
| `header` | `ReactNode` | | Above the destinations: your `IconButton`s (the spec's `header-button` items) and floating action button, each centred, stacked in order `containerGap` apart. Laid out, never restyled; first in reading and focus order. |
| `insets` | `TanreiInsets` | the provider's | The top, bottom and start insets the rail reaches under. Each side given replaces `TanreiProvider`'s. |

- **The rail** (NVR-11, NVR-19) — the parent's full height (it stretches in a row) at the start edge, `containerWidth`
  wide beside the start inset, in `containerColor` at `containerElevation`, its end edge `outlineWidth` of
  `outlineColor`. Its color reaches under `TanreiProvider`'s top, bottom and start insets (the start one is the left in
  left-to-right and the right in right-to-left); the header and destinations stay inside them.
- **Layout** (NVR-6, NVR-12, NVR-18) — the header `containerPaddingBlock` below the top; the destinations `headerGap`
  below it (`containerPaddingBlock` below the top without a header), stacked `containerGap` apart: each cell is the
  rail's full width and its destination with half of `containerGap` above and below, at least
  `system.measure.target.touch` high even without a label. When they do not fit, the destinations scroll (a
  `ScrollView`) and the header stays.
- **Destinations** (NVR-1 … NVR-10, NVR-13 … NVR-17, NVR-21, NVR-23) — as `NavigationBar`'s, with the rail's tokens; a
  label takes at most **two lines** (an ellipsis after that), and grows its destination.
- **Accessibility** (NVR-20) — the rail is `role="tablist"` named by `accessibilityLabel` and each destination a `tab`,
  as the bar's; the header's buttons keep their own role and come first.
- **Text size** (NVR-22) — the rail keeps its width; labels take their two lines and destinations grow. No large-content
  viewer.
- **Not in the rail** — Material 3's rail that expands in place (mimicry gap `navigation-rail-expanded`), and
  an alignment option for the destinations (top only).

### `NavigationDrawer`

A panel of destinations with text-led rows (`specs/navigation-drawer.spec.json`), in two forms: **standard**, a layout
region beside the content, and **modal**, a modal overlay over a scrim that closes itself after a
destination is chosen. `items` holds destinations and sections (the spec's item kinds) in reading
order; a section is told from a destination by its `items` array.

```tsx
const [open, setOpen] = useState(false);
const [folder, setFolder] = useState('inbox');

<NavigationDrawer
  variant={wide ? 'standard' : 'modal'}
  open={open}
  onClose={() => setOpen(false)}
  accessibilityLabel="Mail"
  value={folder}
  onValueChange={setFolder}
  header={<Text>Mail</Text>}
  items={[
    { heading: 'Mail', items: [
      { value: 'inbox', label: 'Inbox', icon: 'inbox', badge: '24' },
      { value: 'sent', label: 'Sent', icon: 'send' },
    ] },
    { heading: 'Labels', divider: true, items: [{ value: 'work', label: 'Work', icon: 'label', badge: 'New' }] },
  ]}
/>
```

| Prop | Type | Default | |
|---|---|---|---|
| `variant` | `NavigationDrawerVariant`: `'standard' \| 'modal'` + your system's | `'standard'` | Standard sits beside the content; modal slides over it with a scrim. An open key: unknown values render as `standard`, reported (NVD-26); only `modal` is presented as an overlay. |
| `open` | `boolean` | `false` | Whether it is shown. **Controlled**: a modal drawer asks to close with `onClose`; set it to `false` then. |
| `value` | `string` | `''` | The selected destination's value, wherever it stands. **Controlled**: move it from `onValueChange`. |
| `onValueChange` / `onReselect` | `(value: string) => void` | | The spec's `change` / `reselect`. |
| `onClose` | `() => void` | | The spec's `close` (modal only): the scrim, Escape, Android's back, the iOS escape gesture, a drag toward the start edge, or after a destination. Once per opening. |
| `items` | `readonly NavigationDrawerItem[]` | | Destinations and sections, in reading order. |
| `header` | `ReactNode` | | Above the items (a title, an account switcher, a close button); never restyled. |
| `accessibilityLabel` | `string` | | The spec's `label`: names the modal drawer's dialog (reported in development builds when a modal drawer has none). |
| `positionText` | `(position, count) => string` | `"2 of 6"` | How a destination's position is announced, in your language. |
| `inline` | `boolean` | `false` | **Tests and the gallery only**: draws an open modal drawer — scrim and panel — in place, without a `Modal`, motion or focus move. |

A `NavigationDrawerDestination` is `{ value, label, icon?, badge?, disabled?, testID? }` — `icon` a glyph name (or a
function, or a node; give every destination one, or none), `badge` short text at the row's end ("24", "New"). A
`NavigationDrawerSection` is `{ heading?, divider?, items }`; a section inside a section is drawn as its destinations
in its place, reported in development builds.

Press hold, `pressedFeedback` (overlay, ripple, dim, none), `focusStyle`, corner smoothing and the state motion behave as
for `Button`; each row is built on the list row's shared state (`src/primitives/itemRow.ts`) with the drawer's tokens:

- **The panel** (NVD-11, NVD-12, NVD-25) — `containerWidth` wide beside the start inset, the parent's full height, in
  the variant's `containerColor` at its `containerElevation` (its shadow and, where the level has one, its ring, which
  follows the corners), with end corners of the variant's `containerShape` and square start corners, and an end edge of
  `outlineWidth` in the variant's `outlineColor`. `containerPaddingInline` / `containerPaddingBlock` inside; the
  header, then the items `containerGap` apart, all in one `ScrollView`. Its color reaches under `TanreiProvider`'s top,
  bottom and start insets; the content stays inside them. (The drawer has no `insets` prop of its own: the spec names
  none.)
- **Rows** (NVD-3 … NVD-9, NVD-13 … NVD-15) — a row across the inner width, at least `itemContainerHeight`, with
  `itemContainerShape` corners, `itemPaddingInline` at its ends and `itemGap` between: the icon at `itemIconSize` in the
  family and fill of its selection, the label in `itemLabelTypescale` (it wraps), and the badge text in
  `itemBadgeTypescale` at the end, all in the colors of the row's condition (`selected` for the selected destination) in
  the state that wins. The row is the state layer (its fill is the active indicator while selected); a disabled
  selected row keeps its indicator. The hit area is the row with half of `containerGap` above and below
  (`hitSlop`), never less than `system.measure.target.touch` high.
- **Sections** (NVD-16, NVD-17) — a `Divider` before a section whose `divider` is true; its heading in
  `headingTypescale` / `headingColor`, in a row at least `headingHeight` high, starting where the destinations'
  content starts (`itemPaddingInline`), `role="heading"`, not focusable.
- **Standard** (NVD-18, NVD-28) — in the layout while open, gone while closed (no width, nothing for assistive
  technology or focus); when `open` changes it slides while the content beside it resizes: its width moves over
  `motionEnterDuration` / `motionEnterEasing` or `motionExitDuration` / `motionExitEasing` (JS driver; at once with
  reduce motion). No scrim, no focus trap, never `onClose`. Opening moves keyboard and screen-reader focus to the
  selected destination (else the first enabled one); Tab moves out of it without closing it.
- **Modal** (NVD-19 … NVD-22) — a transparent React Native `Modal` (`statusBarTranslucent`,
  `navigationBarTranslucent`, `animationType="none"`): a window of its own, so everything behind it is inert to touch,
  the keyboard and assistive technology, and focus stays in it. The scrim (`scrimColor`) fades in while the panel slides
  in from the start edge (from the right in right-to-left) over the enter motion, and both leave over the exit motion
  before the `Modal` goes; at once with reduce motion. Opening moves focus to the selected destination (again on the
  `Modal`'s `onShow`). `onClose` comes from a press on the scrim, Escape (`onKeyDown` on the panel), Android's back
  (`onRequestClose`), the iOS escape gesture (`onAccessibilityEscape`), a drag toward the start edge past half the width
  or a fling that way (`PanResponder`; a shorter drag springs back), and after a destination was activated — once per
  opening. A tooltip inside it is drawn above it (the window hosts its own overlay layer); a snackbar waits while it is
  open. **When it closes, focus goes where the platform puts it**: React Native cannot tell which element had focus
  before it opened, like the dialog's.
- **Accessibility** (NVD-23, NVD-24) — each destination is ONE element with `role="button"`, named by its label, with
  `accessibilityState.selected` and `disabled`, and its position then its badge as `accessibilityValue` ("Inbox, 1 of 6,
  24"); icons are hidden. The modal drawer's panel is `role="dialog"`, `aria-modal`, `accessibilityViewIsModal`, named by
  `accessibilityLabel`.
- **Text size** (NVD-27) — the width stays; rows and headings grow with their text (their heights are minimums); icons
  do not scale.
- **Not in the drawer** — opening a modal drawer by a swipe from the screen edge (on iOS that edge is the back gesture):
  open it from a menu button.

## Design systems, theming and contrast

Every token reaches a component through **one system object** provided by `TanreiProvider`.
The default is the generated `tanrei` system; a shipped preset or a product's own
generated system is passed the same way:

```tsx
import { TanreiProvider, type TanreiSystem } from '@tanrei/react-native';
import { acme } from './generated/acme'; // export const acme = { … } as const satisfies TanreiSystem

<TanreiProvider system={acme} theme="system" contrast="standard">
```

- `TanreiSystem` (and its parts: `TanreiColors`, `TanreiTypescale`, `TanreiMeasure`, `TanreiMotion`,
  `TanreiButtonTokens`, …) is the **vocabulary** as types. Every member is required, so a system
  generated before a vocabulary change stops type-checking instead of rendering wrong.
- A system file holds only **values**. The token pipeline produces it
  (`packages/tokens-build/src/emit/ts.js` → `src/generated/systems/<id>.ts`); the shipped presets (`m3-like`,
  `cupertino`) are generated the same way and exposed as npm subpaths
  (`@tanrei/react-native/systems/<id>`). A product runs the same generator on
  its own layer file and imports the result.
- A quick experiment does not need the pipeline — a system is a plain object:
  `{ ...tanrei, components: { ...tanrei.components, button: { ...tanrei.components.button, pressedOpacity: 0.4 } } }`.

### Component tokens have the shape of their axes

`system.components.button` (`TanreiButtonTokens`) holds the tokens that are on no axis as flat members
(`containerShape`, `motionStateDuration`, `<state>Opacity`, `<state>ContainerShape`, …) and one holder per
axis, keyed by the axis value:

```ts
button.sizes.medium            // TanreiButtonSizeTokens: containerHeight, containerPaddingInlineStart, …End,
                               //   …StartWithIcon, containerPaddingBlock, labelTypescale, iconSize,
                               //   containerGap, outlineWidth
button.variants.filled.hovered // TanreiButtonVariantStateTokens: containerColor, labelColor, outlineColor,
                               //   containerElevation — for `enabled` (resting), `hovered`, `focused`, `pressed`, `disabled`
```

`containerGap` and `outlineWidth` are per size (they were flat members before): the default system has the
same value at every size (8 and 1), `m3-like` does not (gap 8/8/8/12/16, outline 1/1/1/2/3).

`TanreiButtonSizes` / `TanreiButtonVariants` require the core values and make every other registered key
optional — the same shape `TanreiSchemeColors` has for color roles. Interaction states are closed.

### Extending the vocabulary

A layer may add a step to a series, a color role, a value to a component axis, and tokens of its own
namespace. `tanrei build` then writes one file for React Native, and everything is in it:

```ts
// generated/acme.ts (excerpt)
declare module '@tanrei/react-native' {
  interface TanreiColorRoleRegistry { brandGlow: true }
  interface TanreiSpace { readonly space1200?: number }
  interface TanreiButtonSizeRegistry { '3x': true }
  interface TanreiButtonVariantRegistry { danger: true }
}
export const acme = { …, space: { …, space1200: 96 }, components: { button: { …, sizes: { …, '3x': { … } } } } } as const satisfies TanreiSystem;
export const acmeTokens = { comp: { rating: { gap: 4, star: { color: { kind: 'role', role: 'warning' }, size: 20 } } } } as const satisfies AcmeTokens;
```

```tsx
<TanreiProvider system={acme}>
  <Button size="3x" variant="danger">Delete</Button>
</TanreiProvider>

acme.space.space1200;                        // 96 — typed on the system you imported
useTanrei().system.space.space1200;          // number | undefined — the ACTIVE system may be another one
acmeSteps.space.space1200(system);           // number, ALWAYS: the active system's value, else the 96 acme declared
acmeSteps.motion.spring.standard.bouncy(system); // springs are a series too: a whole TanreiSpring, per spring scheme
theme.paint(acmeTokens.comp.rating.star.color);                   // own colors are paints: they follow the scheme
```

- The augmentation targets the package entry point (`'@tanrei/react-native'`); TypeScript merges it into the
  declaring module through the entry point's `export type *` (checked with TypeScript 5.4, 6.0 and 7.0
  against the built package). A system file of this repository augments `'../vocabulary'` instead; shipped
  presets that extend the vocabulary do so (`m3-like`: color roles and the Button sizes
  `xsmall` and `xlarge`), and their keys are typed only in a program that imports that preset.
- `vocabulary.ts` ends with a **merge anchor**: an empty `declare module './vocabulary'` that names every open
  interface. It adds nothing; it makes the merge independent of file order. Without it TypeScript (5.4 – 7.0)
  drops a product's augmentation when that file comes before the first preset file that augments the same
  interface directly (a product with its own layer that also imports a preset).
- **Series steps never throw and never come back `undefined`**: for every step a system added, its file exports a
  total accessor in `<system>Steps`, shaped like the system object (`acmeSteps.space.space1200`,
  `acmeSteps.motion.duration.…`, `acmeSteps.motion.spring.<scheme>.…`). Under a system that lacks the step it returns
  the value the DECLARING system gave it — the generator knows it — and development builds report once per step
  (`seriesStep()`; the same spirit as Button BTN-7). `sys.motion.spring` is open like every other series: core
  springs are required keys of `TanreiSpringSet`, an added spring is an optional one.
- A system **without** extensions generates none of this: no augmentation section, no extra exports, no runtime import.
- A layer's own tokens (`acmeTokens`) are not part of `TanreiSystem`. Colors are `TanreiPaint`s, type styles
  and elevations name a step of the system (`theme.text(…)`, `theme.elevation(…)`).
- `theme.text(role)` and `theme.elevation(level)` are total too: a step the active system does not have
  falls back to `body` / `level0`.

### Colors are paints

Role colors are structured (`{ r, g, b, a }`, 0–255 / 0–1) per scheme. Component colors are
scheme-independent **paints**, a closed union evaluated at render time against the active scheme:

| `kind` | Meaning |
|---|---|
| `role` | a color role of the scheme |
| `mix` | `base` mixed with `with` by `amount` — premultiplied, identical to CSS `color-mix(in srgb)` |
| `alpha` | `of` with its alpha multiplied by `amount` |
| `none` | nothing is drawn (no fill, no outline element) |
| `literal` | a fixed color, the same in every scheme |
| `scheme` | one paint per scheme (`by.light`, `by.darkHigh`, …): a color the token pipeline decided per scheme at build time (a palette tone, a contrast pick) |

`evaluatePaint(paint, colors, scheme)` → structured color (`scheme` names the scheme `colors` belongs to; only a `scheme` paint needs it — the theme passes it); `formatColor(color)` → React Native color string
(the only place a string is made). `useTanrei().paint(p)` does both for the active scheme.

Color roles are **open-ended across systems**: a system may declare palettes (`tertiary`,
`correct`, …). The role key is `keyof TanreiColorRoleRegistry`; a generated system file adds its
declared roles by module augmentation, and a product can do the same:

```ts
declare module '@tanrei/react-native' {
  interface TanreiColorRoleRegistry { correct: true; onCorrect: true }
}
```

Core roles are required in every scheme; declared roles are optional in the type. A role the active
system does not have falls back to the matching `primary` slot (`x` → `primary`, `onX` → `onPrimary`, `xContainer` →
`primaryContainer`, `onXContainer` → `onPrimaryContainer`) and warns once in development.
`system.intents` lists the roles that come as a set of four.

### Scheme

`TanreiProvider` selects one of the system's six color schemes:

| `theme` | `contrast` | scheme |
|---|---|---|
| `'system'` (default) | | follows `useColorScheme()` |
| `'light'` / `'dark'` | `'standard'` (default) / `'medium'` / `'high'` | `light`, `lightMedium`, `lightHigh`, `dark`, `darkMedium`, `darkHigh` |

Without a provider, components use the `tanrei` system in the standard light scheme. Read the theme
in your own components:

```tsx
const { system, scheme, colors, color, paint, text, elevation } = useTanrei();
<Text style={[text('body'), { color: color('onSurface') }]} />
<View style={{ padding: system.space.space200, borderRadius: system.shape.medium }} />
```

Also exported: the default system `tanrei`, the vocabulary types, the theme helpers
(`createTanreiTheme`, `evaluatePaint`, `formatColor`, `mixColors`, `roleColor`, `lookupValue`, `seriesStep`,
`typescaleStyle`, `emphasize`, `typeFamilyOf`, `toFontWeight`, `fontFamilyOf`, `platformFontFamily`, `borderCurveOf`, `iconFill`, `iconFamily`, `iconNeedsFillAxis`, `iconGlyphStyle`,
`resolveElevation`, `resolveElevationLayers`, the shadow conversions `toShadowRadius`, `toAndroidElevation`, `toLegacyShadow` and `supportsBoxShadow`, `toEasing`, `useReduceMotion`,
`useContentColor` (the content color of the nearest `Card`), `resolveScheme`) and the primitives (`resolveInteractionState`, `useStateTransition`, `usePressHold`,
`usePressRipple` / `PressRipple` (per-corner `corners`), `FocusRing` (`inside`, `inset`, per-corner `corners`), `Ring`, `useKeyboardFocus`, `useMinimumTarget`, `minimumTargetHitSlop`).

### Shadows

`system.elevation` layers have **CSS box-shadow semantics**: `blur` is the CSS blur radius — a Gaussian
with σ = blur / 2 — and `spread` grows the casting box. `src/theme/elevation.ts` is the one place where that becomes
a React Native quantity (unit-tested in `src/theme/__tests__/elevation.test.ts`):

| Target | Conversion | What is lost |
|---|---|---|
| `boxShadow` style prop (New Architecture, React Native ≥ 0.76 — what this package is developed against and **prefers**) | takes CSS semantics directly: `blurRadius = blur`, `spreadDistance = spread`, every layer | nothing (Android 9+) |
| iOS `shadowRadius` (legacy) | `shadowRadius = blur / 2` (it is the Gaussian's σ, not the CSS radius) — `toShadowRadius()` | one shadow per view: the layer with the widest blur; no spread |
| Android `elevation` (legacy) | a height in dp, not a blur: `1.5 × the largest offsetY` (σ of the widest blur when nothing is offset) — `toAndroidElevation()` | offset, blur, spread, layer count and (below API 28) color: the platform draws its own shadow |

The components use `boxShadow` whenever the renderer draws it (`supportsBoxShadow()`), and the legacy style
(`theme.elevation(level).legacy`) only otherwise. `elevation.level0` is an **empty list**: nothing is drawn — no
`boxShadow` entry, no ring, no legacy style. The first layer of a level, when it is only spread, is drawn as a 1px
outside `Ring` (a border, so it renders everywhere).

## Development

Run from the repository root (pnpm 12 via corepack/volta):

```sh
pnpm --filter @tanrei/react-native typecheck
pnpm --filter @tanrei/react-native build      # react-native-builder-bob → lib/module (ESM) + lib/typescript
pnpm --filter @tanrei/react-native test       # Jest + @testing-library/react-native; no iOS/Android toolchain needed
```

`src/generated/vocabulary.ts` (types) and `src/generated/systems/*.ts` (values) are generated by
`pnpm generate`; never edit them.

### Gallery app (`example/`)

`example/` is a small **Expo** app (no native folders): one screen, `example/src/GalleryScreen.tsx`, that renders
every fixture of every implemented component's spec under every shipped system, with system, theme and contrast
switches — what a person opens to *look* at the components on a simulator or a device. The components come from ONE
registration table, `example/src/registry.tsx` (`spec name → { spec, render(props) }`; a fixture's props are mapped
through the spec's `platforms.react-native.props`, its `content` becomes `children`, its testID is
`gallery.fixture.<component>.<fixture id>`): adding a component to the gallery is adding one entry, and a test fails
while an implemented component has none.

- **In CI without Expo**: `pnpm --filter @tanrei/react-native typecheck` also type-checks the app
  (`example/tsconfig.typecheck.json`: the app's `tsconfig.json` plus type-only pins of `react` / `react-native` to this package's copies — Expo's Metro resolves through `tsconfig.json` `paths`, so they cannot live there), and the package's Jest run renders the screen (`example/__tests__/GalleryScreen.test.tsx`:
  every fixture × every system equals the component alone under that provider; the switches select the scheme; the
  list of systems is checked against `src/generated/systems/`, the registry against `specs/` and `src/components/`). Both use this package's own React Native.
- **It is deliberately not a pnpm workspace member.** Expo's current SDK (57) pins `react-native` 0.86 / `react` 19.2
  while this package is developed against 0.87 / 19.3; as a member it would put a second React Native and the whole
  Expo tree (several hundred packages) into the repository's lockfile and under its install policy. So its
  dependencies are its own:

  ```sh
  cd packages/react-native/example
  npm install            # Expo SDK 57; not part of the root `pnpm install`
  npx expo start         # then i / a, or scan the QR code with Expo Go
  ```

  `metro.config.js` resolves `@tanrei/react-native` to `../src` (no build step), watches the repository (the spec),
  and makes the library's `react` / `react-native` imports resolve to the app's copies.
- **Verified on a simulator and an emulator** (iPhone 17e / iOS 26.5 and Pixel 7a / API 33, Expo Go
  57.0.9 for SDK 57, `react-native` 0.86.3, new architecture): the app bundles for both platforms
  (`npx expo export --platform ios|android`) and runs; the system / theme / contrast switches work through the real
  `Pressable`; `m3-like` draws the ripple from the point of contact, clipped to the pill (iOS, looked at frame by
  frame); `cupertino` (corner smoothing 0.6) draws the OS's continuous corners on iOS; `boxShadow` elevation draws on both. Three
  constraints of the setup: `babel-preset-expo`, which `babel.config.js` names, is a devDependency because npm does
  not hoist it out of `expo/node_modules`; the title keeps clear of the status bar
  (`contentInsetAdjustmentBehavior` / `StatusBar.currentHeight`); and Expo's Metro resolves through `tsconfig.json`
  `paths`, so type-only pins must stay in `tsconfig.typecheck.json`. With `example/node_modules` installed, Jest and
  the type check still use this package's React / React Native (`jest.config.js`, `tsconfig.typecheck.json`) — both
  states are green. Not looked at yet: `cupertino` and the glow focus with a hardware keyboard on Android. It is not
  run in CI. `npx expo start --localhost` binds IPv6 only while the manifest says `127.0.0.1`: start without it.
- `node_modules/`, `.expo/`, `dist/` and the app's `package-lock.json` are git-ignored (`example/.gitignore`).

### Snapshots

Each spec fixture has a serialized render-tree baseline at
`src/components/__tests__/__snapshots__/<Component>/<fixture-id>.json` (sorted keys, flattened styles,
no functions). `expect(tree).toMatchFixtureSnapshot('Button', fixtureId)` **compares**; it fails when
the baseline is missing or different and never rewrites a baseline because a comparison failed.

A diff is a finding. Record only when the change is the intended result of a spec or token change,
say why, and repeat the reason in the changeset:

```sh
TANREI_SNAPSHOT_REASON="button: container shape token changed 6 → 8" TANREI_RECORD_SNAPSHOTS=1 \
  pnpm --filter @tanrei/react-native test
```

Recording without `TANREI_SNAPSHOT_REASON` fails. Review the JSON diff before committing.

## License

Apache-2.0
