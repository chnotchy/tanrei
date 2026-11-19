# Tanrei for Jetpack Compose

> **Pre-release.** Nothing has been released: `io.github.chnotchy:tanrei` is not on Maven Central yet. It has not caught up with the current specs and tokens and **does not build yet**; its CI is paused until it does (the [status matrix](../../docs/status/STATUS.md) marks it *lagging*). Documentation: <https://tanrei.chnotchy.com/getting-started/compose/>.

The Jetpack Compose implementation of the Tanrei design system. Tanrei is its own system: it builds on
Compose `runtime` / `ui` / `foundation` / `animation` only and does **not** depend on Material 3.

- Coordinates: `io.github.chnotchy:tanrei` (not published yet)
- `minSdk` 23, `compileSdk` 37, JDK 17, Kotlin 2.4, Compose BOM 2026.09.00 (see "What a machine needs")

```kotlin
dependencies {
    implementation("io.github.chnotchy:tanrei:<version>")
}
```

## Usage

```kotlin
import io.github.chnotchy.tanrei.components.TanreiButton
import io.github.chnotchy.tanrei.primitives.TanreiText
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.tokens.TanreiButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiButtonVariant

@Composable
fun Screen() {
    TanreiTheme {
        TanreiButton(text = "Deploy", onClick = { /* … */ })

        TanreiButton(
            onClick = { /* … */ },
            variant = TanreiButtonVariant.Outlined,
            size = TanreiButtonSize.Small,
            enabled = false,
            icon = { /* a 16dp icon; tint it with LocalTanreiContentColor.current */ },
        ) {
            TanreiText("Roll back")
        }
    }
}
```

The spec's `disabled` prop is the inverse Compose flag `enabled`; the `click` event is `onClick`
(see `specs/button.spec.json` → `platforms.compose`).

## Theming

```kotlin
TanreiTheme(
    system = TanreiSystem.Tanrei,        // the design system: the default, a preset, or your product's own
    theme = TanreiThemeMode.System,      // System | Light | Dark — System follows isSystemInDarkTheme()
    contrast = TanreiContrast.Standard,  // Standard | Medium | High — defaults to the system contrast on Android 14+
    fontFamilies = TanreiFontFamilies { font -> if ("Inter" in font.families) inter else null },
) { /* content */ }
```

### Fonts: stacks are read once, families are yours to install

Tanrei names fonts and never bundles them. A font stack reaches Kotlin already read by the token build —
no CSS keyword (`system-ui`, `ui-monospace`, `sans-serif` …) is parsed on the device:

```kotlin
val stack: TanreiFontStack = TanreiTheme.tokens.typescale.body.font   // every text style carries its stack
stack.families   // ["Inter", "Noto Sans JP", "Noto Sans"] — the NAMED families, in the order the system prefers them
stack.generic    // TanreiGenericFontFamily.SansSerif | Serif | Monospace | Cursive — the platform font to fall back to
stack.system     // true when the stack asks for the platform's own font FIRST (cupertino: `-apple-system, …`)
TanreiTheme.tokens.typefaces   // TanreiTypefaces(brand, plain, mono, icon): the system's named typefaces
```

One rule decides the font (`TanreiFontStack.toFontFamily(fontFamilies)`): **the named families first, then the
platform font of the generic class** (`platformFontFamily`: the platform default for sans-serif, else
`FontFamily.Serif` / `Monospace` / `Cursive`) — except that a stack with `system = true` gets the platform font
without asking, because that is what it asked for.

The generic class is decided by the token build, for every value it can answer — nothing is guessed on the device:

| The stack's generic keyword (IR `generic`) | `TanreiGenericFontFamily` | Drawn with |
|---|---|---|
| `sans-serif` — also a stack that names no generic at all | `SansSerif` | the platform default (`FontFamily.Default`) |
| `serif` — also a stack whose only hint is `ui-serif` | `Serif` | `FontFamily.Serif` |
| `monospace` — also a stack whose only hint is `ui-monospace` | `Monospace` | `FontFamily.Monospace` |
| `cursive` | `Cursive` | `FontFamily.Cursive` |
| `fantasy`, `math`, `emoji` | `SansSerif` | Android has no face of these classes: they read as sans-serif, by decision |
| anything else | — | cannot reach Kotlin: `emit/kotlin.js` stops with the value's name instead of choosing a face (`emit-kotlin.test.js`) |

The IR's `fallback` flag ("the stack itself names a system or generic fallback") is tooling for `tanrei validate`;
it is not delivered to Kotlin, where a stack ALWAYS ends in the platform font of its generic class.

**What a product installs.** Whatever `families` names, for every stack it wants drawn in that face: for the
default system `Inter`, `Noto Sans JP`, `Noto Sans` (text) and `Roboto Mono` (code); for icons see below
(`tanrei build` lists the families a system names). On Android "install" means: put the font files in
`res/font/` (or use downloadable fonts), build a `FontFamily`, and hand it over by family name:

```kotlin
val inter = FontFamily(Font(R.font.inter_variable))          // YOUR file; a variable font keeps weights like 450 exact
val robotoMono = FontFamily(Font(R.font.roboto_mono))
TanreiTheme(fontFamilies = TanreiFontFamilies { font ->
    when {
        "Inter" in font.families -> inter
        "Roboto Mono" in font.families -> robotoMono
        else -> null                                          // → the platform font of font.generic
    }
}) { /* … */ }
```

Without any of this everything still renders: text in the platform default, code monospaced. Numeric weights (450,
550) are passed through as `FontWeight(450)`: exact with a variable font, rounded by the platform to the nearest
instance of a static one. Tests and baselines render with the platform's fonts.

### Text styles: sixteen roles by level, emphasis as a weight

The type scale is by LEVEL, not by size: pick the level the text has in the page. `TanreiTypescale` has
sixteen `TanreiTextStyle` members and a keyed lookup (`typescale["heading-1"]`):

| Role (`typescale.<member>`) | Token | HTML | Use |
|---|---|---|---|
| `display` | `display` | — | the one hero size |
| `heading1` … `heading6` | `heading-1` … `heading-6` | `h1` … `h6` | `heading5` is a card's or dialog's title, `heading6` a table's |
| `bodyLarge`, `body`, `bodySmall` | `body-large`, `body`, `body-small` | lead, `p`, `small` | running text; `body` is the theme's default text style |
| `label`, `labelSmall`, `caption` | `label`, `label-small`, `caption` | — | text inside and next to controls (buttons, inputs, chips, helper text) |
| `code`, `codeSmall` | `code`, `code-small` | `code`, `pre` | monospace |
| `eyebrow` | `eyebrow` | — | a section's kicker (small, tracked; the component uppercases) |

Every family is monotonic in size; where a heading and a body role share a size the heading weighs 500 or more and the
body 400. Presets re-value the roles and may add steps (`m3-like`: `displayLarge` / `displaySmall`; `cupertino`:
`bodyCallout`, `bodySubhead`, `captionSmall` — accessors from their generated files).

**Emphasis is a weight step, not a role.** There are no `…Emphasized` styles: `typescale.emphasis` is a
`TanreiTypeEmphasis(display, heading, body, label)` of weight increments (100 everywhere by default; `m3-like` adds
200 to labels), and every `TanreiTextStyle` knows its `family` (`TanreiTypeFamily`: the first segment of the role's
name; `caption`, `code` and `eyebrow` take the `label` step). To stress text without changing its level:

```kotlin
tokens.typescale.heading1.emphasized().toTextStyle()                      // in composition: the current system's step
tokens.typescale.label.emphasized(system.typescale.emphasis)             // anywhere: the same, given the steps
// default: heading-1 500 → 600; m3-like: label 500 → 700. Only the weight changes; toTextStyle clamps it to 1–1000.
```

### Icon set

An icon set is **a font family per selection state** plus a weight and two fills — core tokens
(`sys.icon.family.unselected|selected`, `sys.icon.weight`, `sys.icon.fill.unselected|selected`), so every system
values them and a design system can change the set:

| System | unselected | selected | weight |
|---|---|---|---|
| `tanrei`, `cupertino` | Material Symbols Rounded | the same family, `FILL` 1 | 300 |
| `m3-like` | Material Symbols Outlined | the same family, `FILL` 1 | 400 |
| a static set (the `acme` test fixture) | Material Icons Outlined | **Material Icons** | 400 |

A variable font tells the states apart with its `FILL` axis; a static set with a second family — there the axes are
delivered all the same and the font ignores them. ONE helper answers "how do I draw this glyph":

```kotlin
val glyph: TanreiIconGlyph = TanreiTheme.tokens.icon.glyph(size = TanreiTheme.tokens.measure.iconLarge, selected = true)
glyph.family             // TanreiFontStack — the family of THAT state: install it like any other font
glyph.fill               // 1f (0f unselected)      → FILL
glyph.weight             // 300                     → wght
glyph.opticalSize        // the icon box in dp, clamped to icon.opticalSizeMin–Max (20–48) → opsz
glyph.grade              // 0                       → GRAD
glyph.variationSettings  // FontVariation.Settings of the four axes
val symbols = FontFamily(Font(R.font.material_symbols_rounded, variationSettings = glyph.variationSettings))   // YOUR bundled font
```

The `opsz` range is the icon font's, so it is a token too (`sys.icon.optical-size.min` / `.max` →
`TanreiIconStyle.opticalSizeMin` / `opticalSizeMax`; 20–48, Material Symbols', in every shipped system): a system
naming another icon font gives its font's range, and `glyph` clamps to it.
`TanreiIconStyle.variationSettings(size, selected)` is the same settings in one call. The icon fonts are **not**
bundled, icon NAMES (ligatures, code points) belong to the product, and there is no icon component — an icon is a
slot you fill. `TanreiIconButton` hands its slot the glyph (see "Icon button" below); `TanreiButton`'s `icon` slot
gets only the icon color so far. Icon sizes stay in `measure` (`iconSmall` / `iconMedium` /
`iconLarge`). Android applies variation settings from API 26; on API 23–25 a variable font's default instance is
drawn (a static set is unaffected). A symbol set that is not a font cannot be expressed by a family token.

### Choices of kind: how a press is answered and how focus is drawn — and corner smoothing, an amount

Two things no amount can express are typed values on the system; how a corner eases is a number.
`TanreiButton` and `TanreiIconButton` read them and never look at a system's id:

```kotlin
val behavior = TanreiTheme.tokens.behavior   // TanreiBehavior
behavior.pressedFeedback   // TanreiPressedFeedback.Overlay | Ripple | Dim | None
behavior.focusStyle        // TanreiFocusStyle.Ring | Glow
TanreiTheme.tokens.shape.cornerSmoothing   // Float 0–1: 0 a quarter circle, 0.6 the iOS continuous corner, 1 the most eased
```

Shipped: the default is overlay / ring / smoothing 0; `m3-like` ripples; `cupertino` dims
and smooths its corners by 0.6. The first value of each enum is the fallback of a platform that cannot draw a
choice — **Compose draws all of them**, so nothing falls back here.

- **pressed-feedback** (BTN-9). The pressed TOKENS still say what a press looks like; this says how it arrives.
  `Overlay`: the pressed tokens, everywhere at once. `Ripple`: label, outline, elevation, opacity and shape are
  the pressed tokens at once, and the pressed *container color* arrives as a circle growing from the point of
  contact (from the center for Enter / Space), clipped to the container's shape; it grows over
  `comp.button.motion.feedback-duration` (`tokens.button.motionFeedbackDuration` — the component's token, which
  aliases `duration.long1` in the default system) with the button's state easing and fades over the button's state
  duration — with that same easing, as on every other platform — once the press has ended AND its hold has passed. `Dim`: the pressed opacity — and the pressed label,
  outline, elevation and shape — with no state layer. Under `Ripple` and `Dim` only the container color stays with
  the state UNDER the press (hovered, focused or resting). `None`: a press changes nothing, in any part (hover and
  focus still do).
  The ripple is Tanrei's own drawing, driven only by the variant's pressed token: Compose's ready-made ripple
  lives in `androidx.compose.material:material-ripple`, and this library has no Material dependency; and an
  `Indication` draws in the bounds of `clickable` — the 48dp touch target — not in the container. Reduced motion on
  Android is the animator duration scale ("Remove animations" sets it to 0), which Compose hands to every animation:
  there the ripple appears whole, without growth, and leaves without a fade (`TanreiButtonReducedMotionTest`).
- **press-hold** (BTN-8). A press shows on the next frame and stays visible for at least
  `sys.motion.duration.press-hold` (100 ms by default), also for Enter / Space and for a tap that ends within a
  frame. That holds inside a scrolling container too: there foundation's `clickable` holds its `PressInteraction`
  back for the tap timeout to tell a tap from a scroll, so the button also listens to the pointer itself
  (`Modifier.tanreiPressInput`, which consumes nothing) — touch-down shows the press at once, and the press is
  cancelled when the gesture becomes a scroll, as `pointercancel` does on the web. `clickable` stays in charge of
  the click, the keyboard and accessibility; its late report of the same press is not counted twice.
- **corner smoothing** (BTN-10, `sys.shape.corner-smoothing`). At 0 the container is Compose's own
  `RoundedCornerShape`. Above 0 it is a path (`primitives/TanreiShape.kt`) that draws **Figma's corner-smoothing
  construction** — the formulas of `figma-squircle` (MIT), the same on the web, in Compose
  and Flutter: per corner three cubic Béziers whose control points follow the amount `s`. Each leg leaves the edge
  `(1 + s)·r` before the corner and ends on the corner circle where the tangent is `45°·s` from the edge; the middle
  is that circle, as one cubic with the standard `4/3·tan(θ/4)` handles; at 0 only the quarter circle is left. Where
  a corner has less room than the leg wants, Figma's budget rule is applied per CORNER, as Figma applies it
  (`s = min(s, min(width, height) / 2 / r − 1)`, both legs alike): a pill (radius = half the short side) has no room
  and IS the circular capsule at every amount — what Figma draws for it. Measured in
  CoreGraphics against SwiftUI's `.continuous` corner (area of the symmetric difference,
  `packages/flutter/tool/continuous_corner_reference.swift`): at 0.6 the 180 × 80 r20 box is 4.9 px² off (a circle:
  19.2; Android's rasterizer says 5.1) — about 1.2 px² per corner at radius 20, and no amount gets closer than
  0.65's 4.2 — and the 180 × 40 pill, a circular capsule, 12.2 px² (Apple eases a capsule's caps, Figma does not):
  Figma's curve is near Apple's, not Apple's, and Figma's
  construction is what the amount means — Flutter draws the same path; the web draws the nearest
  superellipse. Container, outline,
  elevation ring and shadow, ripple clip and focus indicator all follow the amount.
- **focus-style** (BTN-10). `Ring`: the two hard strokes. `Glow`: the same two colors as a soft halo that starts
  where the ring's inner stroke would end — the outer color spread by inner + outer width and blurred by the outer
  width, the inner color spread and blurred by the inner width — and nothing between the control and the halo.

### A design system is an instance

Every token reaches components through one `TanreiSystem` value that the theme provides
(`LocalTanreiSystem`; read it with `TanreiTheme.tokens`). Nothing reads a static token object, so shipped
presets and a product's generated system coexist in one app.

```kotlin
val tokens = TanreiTheme.tokens              // TanreiSystem
tokens.shape.small                           // Dp
tokens.motion.duration.short3                // Int, milliseconds
tokens.space["space200"]                     // Dp? — every series also has a keyed lookup
tokens.button.sizes.medium.containerHeight   // Dp — named member for a core size
tokens.button.sizes[size].labelTypescale     // size: TanreiButtonSize, total lookup
tokens.button.sizes[size].containerGap       // Dp — the icon–label gap and `outlineWidth` are per size too
tokens.icon.glyph(size, selected)            // TanreiIconGlyph — how an icon is drawn (see "Icon set")
tokens.behavior.pressedFeedback              // a choice of kind (see "Choices of kind")
tokens.shape.cornerSmoothing                 // Float 0–1 — how every corner eases
tokens.typescale.heading1.emphasized()       // the role at its emphasized weight (see "Text styles")
tokens.motion.duration.pressHold             // Int — how long a press stays visible at least
tokens.motion.standardSpring["default-spatial"] // TanreiSpringSpec? — spring sets are a series too
tokens.button.variants.filled.hovered.containerColor  // TanreiPaint
tokens.button.variants[variant][state].labelColor     // variant: TanreiButtonVariant, state: TanreiInteractionState
tokens.button.opacity(state)                 // per-state, shared by every variant
TanreiTheme.colors                           // TanreiColors of the current scheme (theme × contrast)
```

| Generated file (`tokens/`) | What |
|---|---|
| `TanreiTokens.kt` | The **vocabulary**: `TanreiSystem` and its parts (`TanreiColorSchemes`, `TanreiTypescale` with `TanreiTypeEmphasis`, `TanreiShape` with `cornerSmoothing`, `TanreiSpace`, `TanreiState`, `TanreiMeasure`, `TanreiMotion`, `TanreiElevation`, `TanreiButtonTokens` …), `TanreiPaint`, `TanreiColorRole`, `TanreiInteractionState`. System-independent. |
| `TanreiSystemTanrei.kt` | The **values** of the default system: `TanreiSystem.Tanrei`. |
| `TanreiSystemM3Like.kt`, `TanreiSystemCupertino.kt` | The shipped presets: `TanreiSystem.M3Like`, `TanreiSystem.Cupertino`. Opt-in by reference. |

**Colors are paints.** A component color is a `TanreiPaint` — `Role`, `Mix(base, with, amount)`,
`Alpha(of, amount)`, `None`, `Literal` or `Scheme` — evaluated at runtime against the current scheme
(`paint.color` in composition, `paint.resolve(colors)` elsewhere). `Mix` is premultiplied interpolation,
identical to CSS `color-mix(in srgb)`. Component tokens are therefore the same in all six schemes.

**A color that differs per scheme** — a `tone` or `contrast-pick` rule whose answer is another role or literal in
each scheme — is `TanreiPaint.Scheme(light, lightMedium, lightHigh, dark, darkMedium, darkHigh)`: one paint per
scheme, of any kind. It needs nothing from the caller: a `TanreiColors` knows which scheme it is
(`colors.scheme: TanreiScheme`, kept by `copy(…)`), so `resolve(colors)` picks `of(colors.scheme)`, and a `Mix` or
`Alpha` of it follows the scheme too. `TanreiColorSchemes[scheme]` is the matching lookup. No shipped system needs
one; `TanreiButtonPerSchemeTest` draws the fixture `tone-per-state.system.json` (a non-monotonic `tone` on the
filled Button's hovered and pressed container) in all six schemes against the token bundle's values.

**Each state is drawn from that state's tokens.** A button resolves one `TanreiInteractionState`
(disabled, else pressed > keyboard-focused > hovered) and draws container, label, outline, elevation,
opacity and shape from it. Whether hover is a state-layer mix (Tanrei), an explicit color, a dim or nothing
is a value in the system — never component code. Colors, opacity and shape animate with the component's
motion tokens — the shadow too: elevation levels blend layer by layer like a CSS `box-shadow` transition, with the
same duration and easing as the container color. Entering pressed applies immediately and stays for at least
`press-hold`. How the press arrives is the system's `pressed-feedback` (above).

**Shadows have CSS `box-shadow` semantics.** A `TanreiShadowLayer`'s `blur` is the CSS blur radius (σ = blur / 2).
Android blurs with `android.graphics.BlurMaskFilter(radius)`, whose Gaussian is σ = 0.57735 · radius + 0.5 (pixels)
— so the library converts in ONE place, `primitives/TanreiElevation.kt`: `radius = (blur / 2 − 0.5) / 0.57735` in
pixels (at most 1px of blur is no blur). `spread` moves every edge and a rounded corner's radius with it (a sharp
corner stays sharp); a leading layer with no offset, no blur and a positive spread is Tanrei's hairline ring and is
drawn as a border inside the shape. `elevation.level0` is an empty list and draws nothing.
The library draws the shadow itself instead of using `Modifier.dropShadow`: Compose (ui-graphics 1.12) renders a
drop shadow into a bitmap that ends `radius` ≈ 1.7σ beyond the shape — measured: 0 from 1.75σ on, where the Gaussian
still has 4.0% — and places it at a fractional offset (up to 0.045 off the curve, lopsided). Tanrei's is the same
technique (the blurred shape in an alpha-only software bitmap, tinted when drawn: every API level from 23) with a
bitmap that reaches 3σ, on the pixel grid. `TanreiElevationTest` checks the arithmetic, the spread, and the pixels
against the Gaussian: 50% at the edge, 16% one σ out, 4.0% at 1.75σ, 2.3% at 2σ, nothing at 4σ, equal on both sides.

**Color roles are open-ended.** `TanreiColorRole` is a value class over the role's key, with constants for
the default system's roles. Another system may declare more palettes: `TanreiColorRole("tertiary")` is just
another key in its `TanreiColors`. Looking up a role a scheme does not define falls back to the matching
`primary` slot (there are no `emphasis` roles; a recolored button is a variant) — reported once per
scheme in a debuggable app (`TanreiDiagnostics.missingRole`, as SwiftUI, Flutter and React Native report it);
`TanreiTheme` fails fast ahead of that instead (`TanreiSystem.unknownRoles()`). A scheme without even `primary`
draws transparent, never a marker color.

**Sizes and variants are open-ended too.** `TanreiButtonSize` and `TanreiButtonVariant` are value
classes over the token key (generated, in `tokens/`), with constants for the core values (`Small` `Medium`
`Large`; `Filled` `Tonal` `Elevated` `Outlined` `Text`). Their tokens live in holders shaped like everything a
design system may extend: a named member per core value, an `extra` map for what a system added, and lookups.
One size's group (`TanreiButtonSizeTokens`) holds everything that varies with size: `containerHeight`, the four
paddings, `labelTypescale`, `iconSize`, and — since they joined the size axis — `containerGap` and `outlineWidth`
(the former flat `button.containerGap` / `button.outlineWidth` are gone; the default system keeps 8 and 1 at every size).

The `m3-like` preset uses all of this: it adds the sizes `xsmall` and `xlarge` and revalues the five
(`TanreiButtonSize.Xlarge` → 136dp tall, 16dp gap, 3dp outline). Its accessors come from its generated file:
`import io.github.chnotchy.tanrei.tokens.Xlarge`. A shipped system's file declares accessors only for what that
system added (`declaredBy`).

```kotlin
tokens.button.sizes.large                        // core: a named member
tokens.button.sizes[TanreiButtonSize("3x")]      // TOTAL: a key this system lacks reads the default (medium)
tokens.button.sizes.find(TanreiButtonSize("3x")) // null when this system does not have it
TanreiButtonSize("3x") in tokens.button.sizes    // and `sizes.keys` lists them, core first
```

A `TanreiButton` given a size or variant the current system does not have draws with the default value's
tokens (spec BTN-7). In a debuggable app it also reports the value once through `TanreiDiagnostics.reporter`
(default: a Logcat warning, tag `Tanrei`; replace it to route reports or to fail tests); a release build
stays silent. The series (`space`, `shape`, `typescale`, `state`, `measure`, `motion.duration`,
`motion.easing`, the spring sets `motion.standardSpring` / `expressiveSpring`, `elevation`) keep their named steps
and gain `extra` plus `operator get(key: String): T?`.

### Supplying your own system

A product does not write a `TanreiSystem` by hand. It writes a layer file (`<id>.system.json`: palettes, token
values, rules, and optionally `vocabulary` extensions) and runs `tanrei build` with the `compose` output and a
`kotlinPackage` (see `packages/cli/README.md`). The Kotlin emitter turns that system's IR into
`TanreiSystem<Id>.kt` — the same shape as `TanreiSystemTanrei.kt`, in YOUR package, importing this library's
`tokens` package — exposing `TanreiSystem.<Id>`; palettes only that system declares become
`TanreiColorRole("<key>")`. Put the generated file in your module and pass it to the theme:

```kotlin
TanreiTheme(system = TanreiSystem.Acme) { /* every Tanrei component now draws Acme's values */ }
```

Every constructor parameter for a core token is required (only `extra` has a default, empty), so a generated
system that is older than the library's vocabulary stops compiling instead of silently missing tokens:
regenerate it. For experiments and tests, `copy` works at any depth:

```kotlin
val button = TanreiSystem.Tanrei.button
val dimOnPress = TanreiSystem.Tanrei.copy(button = button.copy(pressed = button.pressed.copy(opacity = 0.4f)))
val roomier = button.copy(sizes = button.sizes.copy(medium = button.sizes.medium.copy(containerPaddingBlock = 8.dp)))
```

#### A system that extends the vocabulary

A layer may add a step to a series, a color role, a size or a variant, and tokens in its own namespace
(`"vocabulary"` in the layer file). The SAME generated file then fills `extra` and gains one marked
section of typed accessors — extension properties in your package — plus a typed object for your own tokens.
A system without extensions generates none of this.

```kotlin
import com.acme.design.*   // the package you passed as `kotlinPackage`

TanreiTheme(system = TanreiSystem.Acme) {
    TanreiButton(text = "Delete", onClick = { /* … */ }, variant = TanreiButtonVariant.Danger, size = TanreiButtonSize.Size3x)
    Spacer(Modifier.height(TanreiTheme.tokens.space.space1200))          // = space["space1200"]
    Box(Modifier.background(TanreiColorRole.BrandGlow.color))
    val star = AcmeTokens.Acme.rating                                     // acme.comp.rating.* — not part of TanreiSystem
    Icon(/* … */ Modifier.size(star.starSize), tint = star.starColor.color) // a TanreiPaint: follows the scheme
}
```

A key that is not an identifier keeps its string (`TanreiButtonSize("3x")`); its generated names are prefixed
with the axis (`TanreiButtonSize.Size3x`, `sizes.size3x`).

**No accessor throws.** Read from a system that lacks the value, an axis accessor (`sizes.size3x`) reads the
default value, like the component does; a step accessor (`space.space1200`, an added text style, elevation level,
spring …) answers with the value the DECLARING system gave the step — the generator wrote it into the accessor —
and a debuggable app reports it once through `TanreiDiagnostics.reporter`. `space["space1200"]` stays the honest
question: it is `null` there.

Never edit the generated files by hand; fix `packages/tokens-build/src/emit/kotlin.js` or the tokens.

## Icon button

`TanreiIconButton` (`specs/icon-button.spec.json`, ICB-1…14) performs an action — or switches something on and off —
with one icon and no visible label. It is `TanreiButton`'s chain (press and press-hold, pressed feedback and ripple,
keyboard focus ring, minimum target, container, corner smoothing, unknown-value reports) with the icon button's own
tokens, `TanreiTheme.tokens.iconButton`.

```kotlin
TanreiIconButton(onClick = { share() }, contentDescription = "Share") { TanreiText("share") }

var starred by remember { mutableStateOf(false) }
TanreiIconButton(
    onClick = { /* also called for a toggle, before onCheckedChange */ },
    contentDescription = "Favorite",
    variant = TanreiIconButtonVariant.Filled,          // Standard (default) | Filled | Tonal | Outlined — open
    size = TanreiIconButtonSize.Small,                 // Small | Medium (default) | Large: 32 / 36 / 40 in the default system
    checked = starred,
    onCheckedChange = { starred = it },                // non-null: a toggle
) { TanreiText("favorite") }
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `label` | `contentDescription: String` — required; an empty one still renders, and a debuggable app reports it once through `TanreiDiagnostics.reporter` (ICB-14) |
| `toggle`, `change` | `onCheckedChange: ((Boolean) -> Unit)?` — non-null makes it a toggle (as Material's `IconToggleButton`); activation calls `onClick`, then it with `!checked` (ICB-11, as a native checkbox) |
| `selected` | `checked` — ignored unless `onCheckedChange` is given |
| `disabled` | `enabled` (inverse) |
| `click` | `onClick` |
| `variant`, `size` | `TanreiIconButtonVariant`, `TanreiIconButtonSize` — keys of `tokens.iconButton.variants` / `.sizes`; a key the system lacks draws the default's tokens and is reported in debuggable apps (ICB-7) |
| slot `icon` | `icon: @Composable () -> Unit`, the trailing lambda |

- **Semantics.** A plain icon button is `Role.Button` named by `contentDescription`. A toggle is `Modifier.toggleable`
  with `Role.Button` — a button with an on / off state (TalkBack announces it), not a checkbox or a switch; a plain one
  exposes no toggle state. The icon is decorative: the slot's semantics are cleared, so a ligature drawn as text is
  never announced.
- **Looks (ICB-12).** A plain icon button draws its variant's own parts (`containerColor`, `iconColor`,
  `outlineColor`); a toggle that is off draws the `unselected…` parts and one that is on the `selected…` parts, in
  every state — `tokens.iconButton.variants[variant][state].selectedContainerColor` and so on. The ripple of a
  `ripple` system is the pressed container color of the look that is drawn.
- **The icon (ICB-13).** The slot is laid out in a box of the size's `iconSize` and is given, for the icon's selection
  (selected only for a toggle that is on): `LocalTanreiContentColor` — the icon color of the state and look;
  `LocalTanreiIconGlyph` — `tokens.icon.glyph(iconSize, selected)`: family, `FILL`, weight, `opsz` clamped to
  `sys.icon.optical-size` —; and a `LocalTanreiTextStyle` that draws one glyph of the icon font at the box's size, so
  `TanreiText("favorite")` in the slot IS the icon once the app has installed the font. The box is dp, not sp: at 200%
  text size the button and its icon keep their size. Because Compose applies variation axes per `Font`, a variable icon
  font is installed per glyph with `TanreiFontFamilies.resolveIcon` (its default is `resolve(glyph.family)`, which is
  all a static set needs):

  ```kotlin
  TanreiTheme(fontFamilies = object : TanreiFontFamilies {
      override fun resolve(font: TanreiFontStack): FontFamily? = /* text fonts, as above */ null
      override fun resolveIcon(glyph: TanreiIconGlyph): FontFamily? =
          if ("Material Symbols Rounded" in glyph.family.families) {
              FontFamily(Font(R.font.material_symbols_rounded, variationSettings = glyph.variationSettings))
          } else null
  }) { /* … */ }
  ```

  Without an installed icon font the platform font draws the ligature's NAME; an app that draws its icons otherwise
  (vector drawables, its own `Icon`) reads `LocalTanreiIconGlyph.current.fill` or `.family` to pick the selected one and
  `LocalTanreiContentColor.current` to tint it. The baselines and the gallery draw a stand-in heart for the fixtures'
  `favorite` (filled by `FILL`, stroked by the weight): the library bundles no font.
- **Size and target (ICB-5).** The container is a square of `iconButton.sizes[size].containerSize`; the hit area and
  the accessibility bounds grow to `sys.target.touch` on both axes without changing it.

## Divider

`TanreiDivider` (`specs/divider.spec.json`, DIV-1…8) separates groups of content with one thin line, from
`TanreiTheme.tokens.divider`: `lineColor`, `lineThickness` and `lineInset`. It has no container and adds no space
around itself — the gap on either side belongs to the layout that places it (DIV-2).

```kotlin
Column {
    Row0()
    TanreiDivider()                                          // horizontal, full width, decorative
    Row1()
    TanreiDivider(inset = TanreiDividerInset.Start)          // aligned with an inset list's text
}
Row(Modifier.height(IntrinsicSize.Min)) {
    Action0()
    TanreiDivider(orientation = Orientation.Vertical, decorative = false)   // a toolbar's groups: a separator
    Action1()
}
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `orientation` | `orientation: Orientation` — foundation's `Orientation.Horizontal` (default) / `.Vertical`, one composable instead of Material's `HorizontalDivider` / `VerticalDivider` |
| `inset` | `inset: TanreiDividerInset` — `None` (default) / `Start` / `Both`, by `lineInset`; a closed enum (a structural choice, not a token axis) |
| `decorative` | `decorative: Boolean = true` |

- **Length.** Horizontal fills the width its layout gives it (`fillMaxWidth`), vertical the height (`fillMaxHeight` —
  in a `Row`, give the row a height, as `IntrinsicSize.Min` above; Material's `VerticalDivider` needs the same). The
  inset is padding inside the divider's box, so the box keeps its full length and the inset stretch draws nothing;
  `Start` follows the layout direction for a horizontal divider (its right end in RTL) and is always the top of a
  vertical one (DIV-3, DIV-4).
- **Pixels (DIV-8).** The cross axis is `lineThickness` rounded to whole device pixels and never less than one, and
  layout places at whole pixels: the line is never blurred over two partial rows, at any density.
- **Semantics (DIV-5, DIV-6).** Decorative (the default): `hideFromAccessibility()`. `decorative = false` keeps the node
  in the semantics tree carrying its `Orientation` as a separator; **Android has no separator role** (neither
  Compose's `Role` nor the platform's accessibility node classes has one), so TalkBack skips it like any unnamed,
  inert node — the groups on either side carry their own names. Never focusable, never named.
- **Unknown values (DIV-7).** `orientation` and `inset` are closed enums, so a value the divider does not define cannot
  be passed on this platform: there is nothing to fall back from or report.

## Badge

`TanreiBadge` (`specs/badge.spec.json`, BDG-1…14) marks an anchor with a dot or a small count. One composable plays
Material's `BadgedBox` and `Badge` together, from `TanreiTheme.tokens.badge`.

```kotlin
TanreiBadge(count = unread, contentDescription = "$unread unread") {         // 0 draws nothing; 1200 draws 999+
    TanreiIconButton(onClick = { openInbox() }, contentDescription = "Inbox") { TanreiText("inbox") }
}
TanreiBadge(count = null, contentDescription = "New messages") { Avatar() }  // null is the dot
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `count` | `count: Int?` — required, first: `null` is the dot, `0` draws nothing, above 0 the number; a negative count draws as 0 and is reported in debuggable apps (a count is an `Int`, so never fractional and never not a number here) |
| `max` | `max: Int = 999` — a larger count shows as `max+`; below 1 it is 999 (reported) |
| `label` | `contentDescription: String = ""` |
| slot `default` | `anchor: @Composable () -> Unit`, the trailing lambda |

- **Placement (BDG-1, BDG-3, BDG-7, BDG-11).** The badge's box is the anchor's: it is measured on its own and placed
  over the anchor's top-end corner (`dotOffset` / `containerOffset` inside it, the pill's leading circle — a square of
  the pill's height at its start — centered there), so a longer count grows toward the end; in a right-to-left layout
  the corner is the top-left one and the pill grows left. It draws past the anchor's bounds, takes no layout space and
  has no input modifiers: taps, clicks and keys reach the anchor.
- **The pill (BDG-2, BDG-12, BDG-13).** At least `containerHeight` high and at least as wide as high, with
  `containerPaddingInline` around the label, corners of `containerShape` through the system's corner smoothing, and the
  label in `labelTypescale` with tabular figures (`tnum`), formatted in the locale's digits without grouping and
  isolated from the surrounding direction (so `999+` never reads `+999`). The label is sp: at larger text sizes the
  pill grows and stays centered on the corner; the dot stays `dotSize`.
- **Outline (BDG-6).** `outlineWidth` of `outlineColor` outside the dot's or the pill's edge (the pill's outline is
  grown with the same path spread as a shadow's): it never moves or grows the badge. Tanrei's is the surface color, so
  it cuts the badge out of the icon it overlaps; the presets have none.
- **Semantics (BDG-5, BDG-8, BDG-10).** The drawn dot and number are hidden (`clearAndSetSemantics`). The description
  (`contentDescription`, or the displayed text when it is empty and there is a count) is a `stateDescription` —
  updated with the count, never a live region:
  - a **Tanrei control as the anchor** (`TanreiIconButton`, `TanreiButton`) puts it on its own node, so TalkBack reads
    "Inbox, button, 3 unread". Compose merges semantics into the nearest node that merges its descendants, and a control
    is such a node itself: a description on a wrapper around a control would never reach its announcement, so the badge
    hands it down (an internal composition local) and the control takes it;
  - inside an element that merges its descendants (a list row, a navigation item), it merges into that element;
  - on a plain anchor with nothing merging around it, it stays on the badge's box, which is no element of its own —
    wrap the badge in `Modifier.semantics(mergeDescendants = true) {}` (or put it inside the element it describes) to
    have the icon's name and the description read together.
  A count of 0 adds nothing: the anchor is announced as without a badge. A dot with no description still renders and
  is reported in debuggable apps (BDG-9).

## Progress indicator

`TanreiProgressIndicator` (`specs/progress-indicator.spec.json`, PRG-1…15) shows how far a task has come, as a bar or a
ring, from `TanreiTheme.tokens.progressIndicator`. Two overloads, as Material's indicators have: with `progress` it is
determinate, without it indeterminate.

```kotlin
TanreiProgressIndicator(progress = { uploaded }, contentDescription = "Uploading report.pdf")
TanreiProgressIndicator(
    progress = { files.toFloat() },
    contentDescription = "Uploading",
    variant = TanreiProgressIndicatorVariant.Circular,     // Linear (default) | Circular
    size = TanreiProgressIndicatorSize.Small,              // Small | Medium (default) | Large — open
    valueRange = 0f..10f,
    stateDescription = "$files of 10 files",
)
TanreiProgressIndicator(contentDescription = "Loading results")   // indeterminate
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `value` | `progress: () -> Float` — present: determinate; the overload without it: indeterminate. A lambda: it is read in the draw phase and by a snapshot flow, so a new value moves the indicator without recomposing |
| `min`, `max` | `valueRange: ClosedFloatingPointRange<Float> = 0f..1f` (as `Slider` names it) |
| `label` | `contentDescription: String` — required; an empty one still renders and is reported in debuggable apps (PRG-15) |
| `valueText` | `stateDescription: String = ""` — the semantics property of the same name |
| `variant` | `TanreiProgressIndicatorVariant` — a closed enum: a form is drawing, not values |
| `size` | `TanreiProgressIndicatorSize` — a key of `tokens.progressIndicator.sizes`; one the system lacks draws as medium and is reported (PRG-12) |

- **Drawing (PRG-1…5, PRG-13).** A bar fills the width it is given at `sizes[size].linearThickness`, from the start
  of the layout direction (mirrored in RTL), its ends and the indicator's rounded by `trackShape` clamped to half the
  thickness. A ring's outer edge fills `circularSize` with a `circularThickness` stroke, from the top, clockwise in
  every direction; its caps are round unless `trackShape` is 0. Strictly between min and max, `trackGap` of empty
  space separates the indicator from the rest of the track (on a ring, on both sides of the indicator — both of its
  ends meet the track), and a bar draws a `stopIndicatorSize` dot whose center is half the thickness before the track's end (concentric with the rounded end). Tanrei's gap and stop are 0.
- **Motion (PRG-2, PRG-6, PRG-7, PRG-14).** A new value eases over `motionValueDuration` / `motionValueEasing`; a
  switch of overload is immediate. Indeterminate, a bar moves a segment of two fifths from beyond its start to beyond
  its end with `motionCycleEasing`, a ring turns a quarter arc at constant speed, once per `motionCycleDuration`. Where
  motion is reduced — Android's animator duration scale 0 ("Remove animations"), which Compose hands to animations as
  `MotionDurationScale` — a value change is immediate and the indeterminate form stops moving: the whole track in the
  indicator color, its opacity pulsing 1 → 0 → 1 once per cycle. The loop runs on frame time
  (`withInfiniteAnimationFrameMillis`) and only while the indicator is on screen (`onVisibilityChanged`): scrolled out
  of its window it stops, and it resumes where it stopped; an app in the background gets no frames.
- **Semantics (PRG-8…11).** One node that merges its descendants: `contentDescription`, `progressBarRangeInfo` (the
  clamped value in `valueRange`, or `ProgressBarRangeInfo.Indeterminate`), and `stateDescription` when given — TalkBack
  otherwise reads its percentage. Never focusable, never a live region. A value outside the range is drawn and exposed
  clamped; a range that does not end above its start draws the track alone and exposes 0 of 0…1; both are reported in
  debuggable apps.

## Loading indicator

`TanreiLoadingIndicator` and `TanreiContainedLoadingIndicator` (`specs/loading-indicator.spec.json`, LDG-1…10) show
that a short wait of unknown length is under way, from `TanreiTheme.tokens.loadingIndicator`. The spec's `contained`
is the second composable, as Material's `LoadingIndicator` / `ContainedLoadingIndicator` are.

```kotlin
TanreiLoadingIndicator(contentDescription = "Loading messages")
TanreiContainedLoadingIndicator(contentDescription = "Refreshing", size = TanreiLoadingIndicatorSize.Large)
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `contained` | `TanreiContainedLoadingIndicator` — same parameters |
| `label` | `contentDescription: String` — required; an empty one still renders and is reported in debuggable apps (LDG-10) |
| `size` | `TanreiLoadingIndicatorSize` — `Small` / `Medium` (default) / `Large`, open; one the system lacks draws as medium and is reported (LDG-9) |

- **The mark (LDG-1, LDG-2, LDG-8).** A quarter arc with round caps and no track, its outer edge touching a square of
  `sizes[size].indicatorSize` with an `indicatorThickness` stroke, turning clockwise from the top once per
  `motionCycleDuration` at constant speed, in `indicatorColor`. Uncontained, the square is the whole component. It is
  never mirrored.
- **Contained (LDG-3).** A container of `containerSize`, cornered by `containerShape` through the system's corner
  smoothing, filled with `containedContainerColor` and raised by `containedContainerElevation` (`tanreiElevation`), the
  mark centered in it in `containedIndicatorColor`.
- **Motion (LDG-4, LDG-7).** Where motion is reduced (the animator duration scale 0) it does not turn: the whole circle
  at the mark's size and stroke pulses its opacity 1 → 0 → 1 once per cycle with `sys.motion.easing.standard`; the
  container stays still and opaque. The loop is the progress indicator's (frame time, only while on screen).
- **Semantics (LDG-5, LDG-6).** One node that merges its descendants: `contentDescription` and
  `ProgressBarRangeInfo.Indeterminate` (TalkBack's busy progress bar), no value. Never focusable, never a live region.

## Checkbox

`TanreiCheckbox` (`specs/checkbox.spec.json`, CHK-1…16) turns one independent choice on or off, from
`TanreiTheme.tokens.checkbox`. Two overloads, as Compose's own `Checkbox` / `TriStateCheckbox`: a boolean one, and a
tri-state one for a parent that can be partly on, where the caller computes the next state.

```kotlin
var updates by remember { mutableStateOf(false) }
TanreiCheckbox(checked = updates, onCheckedChange = { updates = it }, label = "Email me updates")

// A "select all": activating an indeterminate checkbox makes it On (CHK-2) — the caller says so.
TanreiCheckbox(
    state = allState,                                   // ToggleableState.On | Off | Indeterminate
    onClick = { setAll(allState != ToggleableState.On) },
    label = "Select all",
    isError = false,
)
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `checked`, `change` | `checked: Boolean`, `onCheckedChange: ((Boolean) -> Unit)?` — called once per activation with `!checked`; null draws a checkbox that only displays (no input, no toggle semantics, for a parent row that handles the click) |
| `indeterminate` | the overload `TanreiCheckbox(state: ToggleableState, onClick: (() -> Unit)?, …)`; `Indeterminate` wins over checked for what is drawn and announced |
| `error` | `isError` |
| `disabled` | `enabled` (inverse) |
| `label` | `label: String` — required; an empty one still renders and is reported in debuggable apps (CHK-16) |
| `labelHidden` | `labelHidden` — no visible label; `label` becomes the node's `contentDescription` |

- **The condition (CHK-4).** The props select one of `tokens.checkbox.conditions` — `Unselected`, `Selected`,
  `Indeterminate` and their `Error…` forms (`TanreiCheckboxCondition`, a token axis without a prop) — and
  every part is drawn from `conditions[condition][state]`: the container (the round state layer), the box's fill, the
  outline, the mark, the label. The lookup is total; no prop can name a condition the system lacks.
- **The press (CHK-5, CHK-9, CHK-10).** `TanreiButton`'s chain: press-hold, `pressed-feedback` (the ripple is the
  pressed container of the condition, clipped to the round container), keyboard focus. The focus ring goes around the
  BOX, not the container (CHK-6). The whole row — box and label — is `Modifier.triStateToggleable(role =
  Role.Checkbox)`: a press on the label toggles, Space and Enter toggle (Android activates any focused control with
  Enter), and the row reserves at least `sys.target.touch` on both axes (CHK-7). Under `ripple` a press on the label —
  outside the round container — grows the layer from the container's center, as a keyboard activation does (the ripple
  primitive's `centerOutsideContainer`, used by the checkbox, the radio button and the switch).
- **The box (CHK-11, CHK-12).** A square of `boxSize` with corners of `boxShape` eased by the system's corner
  smoothing, centered in the round container of `containerSize`. The outline (`outlineWidth`) lies inside the box's
  edge and the fill inside the outline, never under it (`tanreiInsetOutline`: the two are added in one layer, so their
  shared anti-aliased edge leaves no seam). The mark is stroked at `markWidth` with square caps, as the spec's anatomy
  gives it: a check through (0.2, 0.5), (0.4, 0.7), (0.8, 0.3) of the box, or a dash from (0.1375, 0.5) to
  (0.8625, 0.5); none is drawn while unselected, whatever the mark color token says.
- **Motion (CHK-13).** When the condition changes, the check draws along its path from its start and the dash grows
  from its center — undrawn the same way when it goes away — and the box, outline and mark colors move, over
  `motionSelectionDuration` with `motionSelectionEasing`. Every part an interaction state recolors — the state layer,
  the label, and the box, outline and mark too — moves over the state motion (`motionStateDuration`; a press snaps in,
  also when the activation lands in the same frame); only a change of condition takes the selection motion. Where
  motion is reduced (the animator duration scale 0) the new condition shows at once.
- **Semantics (CHK-14, CHK-16).** Role checkbox with `ToggleableState` `On` / `Off` / `Indeterminate` (TalkBack:
  checked, not checked, partially checked); `isError` sets the error semantics with the library's string
  `R.string.tanrei_invalid` ("Invalid" — an app overrides or translates it with a string of the same name). The
  visible label merges into the node as its name. Disabled: not focusable, announced disabled.
- **The label (CHK-15).** At the container's inline end, `labelGap` away, in `labelTypescale` and the label color of
  the condition and state; it wraps, and the control stays centered on its FIRST line. A `Row`: right-to-left mirrors it. The
  mark is not mirrored.

## Radio button

`TanreiRadioButton` (`specs/radio-button.spec.json`, RAD-1…18) chooses exactly one option of a small group, from
`TanreiTheme.tokens.radioButton`. Compose's idiom, as its own `RadioButton`: the caller passes `selected` and an
`onClick` that captures the option's value, and the PARENT forms the group with `Modifier.selectableGroup()`.

```kotlin
var frequency by remember { mutableStateOf("weekly") }
Column(Modifier.selectableGroup()) {                    // the spec's `name`: one group
    for ((value, label) in listOf("weekly" to "Weekly", "monthly" to "Monthly")) {
        TanreiRadioButton(selected = frequency == value, onClick = { frequency = value }, label = label)
    }
}
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `selected` | `selected: Boolean` |
| `value`, `change` | `onClick: (() -> Unit)?` — captures the value; called once when an UNSELECTED option is activated, never for the selected one (RAD-2); null draws an option that only displays |
| `name` | `Modifier.selectableGroup()` on the options' parent |
| `disabled` | `enabled` (inverse) |
| `label` | `label: String` — required; an empty one still renders and is reported in debuggable apps (RAD-18) |
| `labelHidden` | `labelHidden` — no visible label; `label` becomes the node's `contentDescription` |

- **The group (RAD-3, RAD-4, RAD-5, RAD-16).** Inside a `selectableGroup()` the options act as one control for the
  keyboard: Down / Right move to the next enabled option and select it, Up / Left to the previous, wrapping at the
  ends, Right and Left swapped in a right-to-left layout; disabled options are skipped. Only one option is a Tab stop —
  the selected one, or the first enabled one while none is selected — so Tab enters the group once and leaves it with
  the next Tab. Selecting one option is the caller's state, so the others become unselected without emitting. TalkBack
  reads "2 of 3" from the same `selectableGroup()` (Compose's collection semantics). Each option finds its group
  through the semantics tree (the nearest ancestor with `SelectableGroup`), read from `RootForTest.semanticsOwner`
  because Compose has no public way for a modifier to read its ancestors' semantics. Outside a `selectableGroup()` each option is a Tab stop of its own and the
  arrows move focus as they do anywhere.
- **The condition (RAD-14).** `selected` chooses `tokens.radioButton.conditions.selected` or `.unselected`
  (`TanreiRadioButtonCondition`); every part is drawn from `conditions[condition][state]`: the container (the round
  state layer), the ring, the dot, the label.
- **The press (RAD-7, RAD-11, RAD-12).** `TanreiButton`'s chain on the whole row (ring and label): press-hold,
  `pressed-feedback`, the minimum target (RAD-9). The focus ring goes around the RING (RAD-8). The input is
  `Modifier.selectable(role = Role.RadioButton)`: Space and Enter select a focused option.
- **Geometry (RAD-13, RAD-14).** A ring of `ringSize` stroked at `ringWidth` inside that diameter, centered in the round
  container of `containerSize`; while selected a dot of `dotSize` at its center — never while unselected, whatever the
  dot color token says. A round container is unchanged by corner smoothing; a system that gives it a corner below full
  gets the smoothed construction.
- **Motion (RAD-15).** When `selected` changes the dot grows from the ring's center (or shrinks back) and the ring and
  dot colors move, over `motionSelectionDuration` with `motionSelectionEasing`; a hover, focus or press recolors every
  part over the state motion. Reduced motion: at once.
- **The label (RAD-17).** As the checkbox's: at the container's inline end, `labelGap` away, in `labelTypescale`,
  wrapping with the control centered on its first line, mirrored in right-to-left; a label press ripples from the
  container's center.

## Switch

`TanreiSwitch` (`specs/switch.spec.json`, SWT-1…16) turns one setting on or off with immediate effect, from
`TanreiTheme.tokens.switch`. Compose's `Switch` idiom: `checked` / `onCheckedChange`, and the handle's glyph as
`thumbContent`, a slot the caller fills for the current selection.

```kotlin
var wifi by remember { mutableStateOf(true) }
TanreiSwitch(
    checked = wifi,
    onCheckedChange = { wifi = it },
    label = "Wi-Fi",
    thumbContent = if (wifi) { { TanreiText("check") } } else null,   // the spec's selectedIcon / unselectedIcon
)
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `selected`, `change` | `checked: Boolean`, `onCheckedChange: ((Boolean) -> Unit)?` — called once per activation with `!checked`; null draws a switch that only displays |
| `selectedIcon`, `unselectedIcon` | `thumbContent: (@Composable () -> Unit)?` — the glyph of the current selection, null for none |
| `disabled` | `enabled` (inverse) |
| `label` | `label: String` — required; an empty one still renders and is reported in debuggable apps (SWT-16) |
| `labelHidden` | `labelHidden` — no visible label; `label` becomes the node's `contentDescription` |

- **The condition (SWT-3, SWT-6).** `checked` chooses `tokens.switch.conditions.selected` or `.unselected`
  (`TanreiSwitchCondition`); every part is drawn from `conditions[condition][state]`: the round state layer, the track,
  the outline, the handle's color, SIZE and elevation, the icon, the label. A system may change the handle's size by
  state (m3-like grows it under a press, and that snaps in with the press).
- **Geometry (SWT-9, SWT-10).** A track of `trackWidth` × `trackHeight` with corners of `trackShape` eased by the
  system's corner smoothing; its outline (`outlineWidth`) inside the edge and the fill inside the outline, never under
  it (`tanreiInsetOutline`, as the checkbox's box). The handle is a circle whose center is half the track height from
  the end it rests at — the inline start when off, the inline end when on — raised by its elevation tokens. The round
  layer of `containerSize` is centered on the handle and moves with it; it is placed, not measured, so it reaches past
  the track (4 dp in the default system) without moving the label — with a visible label it draws that far outside the
  switch's own bounds at the inline start, so do not clip the parent tightly.
- **The glyph (SWT-12, SWT-14).** While `thumbContent` is given the handle is at least `handleSizeWithIcon`; the slot is
  laid out in a box of `iconSize`, is decorative (its semantics are cleared) and gets, as `TanreiIconButton`'s icon
  does, `LocalTanreiContentColor` (the icon color of the condition and state), `LocalTanreiIconGlyph`
  (`tokens.icon.glyph(iconSize, selected = checked)`) and a `LocalTanreiTextStyle` that draws one glyph of the icon
  font. The baselines and the gallery draw stand-in check and cross glyphs: the library bundles no font.
- **Motion (SWT-11, SWT-13).** When `checked` changes the handle travels along the track (mirrored in right-to-left) and
  its size and the track, outline, handle and icon colors move, over `motionSelectionDuration` with
  `motionSelectionEasing` — the spatial spring's curve, which overshoots a little. A hover, focus or press recolors (or
  resizes) every part over the state motion. Reduced motion: the handle is at the other end on the next frame, no travel.
- **Input and semantics (SWT-1, SWT-2, SWT-4, SWT-5, SWT-14).** `Modifier.toggleable(role = Role.Switch)` on the whole
  row, so the track and the label are the hit area (at least `sys.target.touch` on both axes); Space and Enter toggle.
  TalkBack announces a switch that is on or off, never a checkbox. The focus ring goes around the TRACK.
- **The label (SWT-15).** At the track's inline end, `labelGap` away, in `labelTypescale`, wrapping, the track centered
  on its first line; mirrored in right-to-left. Under `ripple` a press on the label or on the track away from the handle
  grows the layer from its center.

## Card

`TanreiCard` (`specs/card.spec.json`, CRD-1…17) sets a group of related content apart from its background, from
`TanreiTheme.tokens.card`. Compose's `Card` idiom: the overload with `onClick` is the interactive card — the whole card
one action —, the one without it a plain container. The card does not lay out its content: it insets it, clips it to
its corners and hands it a content color.

```kotlin
TanreiCard(variant = TanreiCardVariant.Filled) {                 // Outlined (default) | Filled | Elevated — open
    TanreiText("Quarterly report", style = TanreiTheme.tokens.typescale.heading5.toTextStyle())
    TanreiText("Revenue grew 12% over the previous quarter.")
    TanreiButton(text = "Open", onClick = { open() })             // a card that is not an action may hold actions
}

TanreiCard(onClick = { open() }, contentDescription = "Quarterly report") {   // one action: nothing interactive inside
    TanreiText("Quarterly report", style = TanreiTheme.tokens.typescale.heading5.toTextStyle())
    TanreiText("Revenue grew 12% over the previous quarter.")
}
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `interactive`, `click` | `onClick: () -> Unit` — the overload that takes it is the interactive card |
| `disabled` | `enabled` (inverse), interactive overload only: a card that is not an action cannot be disabled (CRD-11) |
| `inset` | `inset: Boolean = true` |
| `label` | `contentDescription: String? = null` |
| `variant` | `TanreiCardVariant` — a key of `tokens.card.variants`; a key the system lacks draws the default's tokens and is reported in debuggable apps (CRD-7) |
| slot `default` | `content: @Composable ColumnScope.() -> Unit`, the trailing lambda |

- **Never put an interactive element inside an interactive card (CRD-15).** No button, link, field, toggle or anything
  else focusable: the card is ONE element to assistive technology, which cannot reach a control nested in it, and a
  press on that control would also activate the card. Compose cannot detect a nested control reliably, so this is not
  checked — it is the caller's rule. A card that needs its own buttons uses the overload without `onClick`, and its
  primary action is one of those buttons.
- **Semantics (CRD-14).** The interactive card is one `Role.Button` node (`clickable` merges the content into it). With
  `contentDescription` — normally the text of its heading — that is its name and the content is presentational (its
  semantics are cleared, as the web's button children are); without one the text of the whole content, merged in
  reading order, is the name, and a debuggable app reports the missing label once. The card that is not interactive
  has no role and leaves its content's semantics alone; with `contentDescription` it is a traversal group named by it.
- **States (CRD-3, CRD-6, CRD-16).** Only the interactive card answers hover, keyboard focus and press: container,
  outline, elevation, content color and opacity come from `tokens.card.variants[variant][state]` and
  `tokens.card.opacity(state)`, moving over `motionStateDuration` with `motionStateEasing` (entering pressed snaps; at
  once where motion is reduced). It is `TanreiButton`'s chain — press-hold, pressed feedback and ripple, focus ring,
  minimum target, corner smoothing. Disabled keeps the resting colors and dims the WHOLE card, content included, to the
  disabled opacity without a shadow: the card cannot recolor content it does not know.
- **Layout (CRD-12, CRD-17).** The content is a `Column` inset by `containerPadding` on every side (logical, so it
  mirrors), or reaching the edges with `inset = false` (a photo on top; that content pads its own text, and may read
  `TanreiTheme.tokens.card.containerPadding` to do it). It is clipped to the container's shape, and the outlined
  variant's `outlineWidth` edge is drawn above it. The card has no height of its own: it grows with its content, also at
  200% text size. A size given through `modifier` is passed on to the content area.
- **Content color and text style (CRD-13).** The content reads `LocalTanreiContentColor` — the variant's
  `contentColor` in the current state — so `TanreiText` and icons inside follow it, and `LocalTanreiTextStyle` is
  `sys.typescale.body` whatever an enclosing component asked its own text to use. A title uses `heading5`.
- **Elevation (default system).** The `elevated` card rests at `level2`, rises to `level3` on hover, and keeps its
  hairline ring (`level1`) when disabled, dimmed with the rest of the card.

## Text field

`TanreiTextField` (`specs/text-field.spec.json`, TXF-1…24) lets people enter and edit text, from
`TanreiTheme.tokens.textField`. Compose's `TextField` idiom on Compose's own `BasicTextField`, so input
methods, autofill, selection and the clipboard work as the platform's do.

```kotlin
var email by remember { mutableStateOf("") }
TanreiTextField(
    value = email,
    onValueChange = { email = it },                       // the spec's input: every change the user makes
    label = "Email",                                      // required: the name, drawn or not
    type = TanreiTextFieldType.Email,                     // keyboard, autocorrection, direction
    contentType = "email",                                // the spec's autocomplete: an HTML autofill name
    supportingText = "We only use it to sign you in.",
    isError = emailInvalid,
    errorText = "Enter a complete email address.",
    onCommit = { save(it) },                              // the spec's change: focus left, or the action key
    keyboardActions = KeyboardActions(onDone = { submit() }),   // the spec's action
    trailingIcon = { TanreiIconButton(onClick = { email = "" }, contentDescription = "Clear") { TanreiText("close") } },
)
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `value`, `input` | `value: String`, `onValueChange: (String) -> Unit`; or `value: TextFieldValue`, `onValueChange: (TextFieldValue) -> Unit` for a product that manages selection and composition |
| `change` | `onCommit: ((String) -> Unit)?` — Tanrei's own: focus leaves with a changed value, or the action key commits (TXF-2) |
| `action` | `keyboardActions: KeyboardActions` — called after `onCommit`; a handler you leave null does the platform's default |
| `error`, `disabled`, `multiline` | `isError`; `enabled` and `singleLine` (both inverse) |
| `minRows`, `maxRows` | `minLines` (default 2), `maxLines` (0 grows without limit) |
| `prefixText`, `suffixText` | `prefix`, `suffix` |
| `autocomplete` | `contentType: String` — an HTML autofill field name, mapped to Compose's autofill `ContentType` (`email` → `EmailAddress`, `current-password` → `Password`, `one-time-code` → `SmsOtpCode` …; an unmapped name is passed on as the hint) |
| `type` | `TanreiTextFieldType` — a closed enum, so an unknown type cannot be written (TXF-9) |
| `variant`, `size` | `TanreiTextFieldVariant` (`Outlined` default, `Filled`), `TanreiTextFieldSize` (`Medium` default, `Large`) — open keys; one the system lacks draws the default's tokens and is reported in debuggable apps |
| slots `leading-icon`, `trailing-icon` | `leadingIcon`, `trailingIcon: (@Composable () -> Unit)?` |

- **States (TXF-6, TXF-7).** Disabled, else focused (by ANY means — a field shows where typing goes), else
  hovered; there is no press answer. Every part is drawn from `variants[variant][state]` (its `error…` parts while
  `isError`), and the outline and indicator widths from `outlineWidth(state)` / `activeIndicatorWidth(state)`, moving
  over the state motion. The focused edge IS the focus indicator: no focus ring is drawn; a system whose focus style is
  glow adds the glow around the container while focused.
- **Which edge (TXF-16).** Read from the variant's resting tokens, never from its name: a variant whose outline is drawn
  rounds four corners by `containerShape` and floats its label onto the outline, at `containerPaddingInline` — over a
  leading icon, as Material 3 does — opening a gap of `outlineNotchPadding` on each side; one bounded by its fill and active indicator keeps `containerShapeBottom` below and floats its label to
  the top of the fill, at the input text. An outlined field that draws a label reserves half a floated-label line above its container.
- **Geometry (TXF-8, TXF-16, TXF-17).** The container is at least the size's `containerHeight`, a single line centred in
  it; a filled field that draws its label is at least `2 × containerPaddingBlockWithLabel + a floated line + an input
  line` (46 / 50 in the default system) from the start. Heights follow the measured text: at 200% text size the field
  grows. A container shorter than `sys.target.touch` reserves the rest above and below, and the whole field — one
  semantics node — is the hit area: a press on its padding, label, prefix or a decorative icon focuses the input.
- **The label (TXF-13, TXF-14, TXF-15).** At rest it is centred in the container (a multi-line field: on its first line);
  it floats while focused or filled (an autofill fills it, so it floats too — Compose reports no separate "autofilled"
  flag), over `motionLabelDuration`, lerping from `labelTypescale` to `labelFloatedTypescale`. `labelHidden` draws none.
  The placeholder, the prefix and the suffix show only while the label is floated or not drawn.
- **Input methods and the limit (TXF-4, TXF-18).** A composition is left to the platform: every step is an input, it is
  never cut, and a value the product sets while it runs is applied when it ends. `maxLength` counts grapheme clusters
  (`java.text.BreakIterator`), shortens a paste, refuses a keystroke into a full field, applies to a composition only
  when it is committed, and never shortens a value the product sets.
- **Semantics (TXF-11, TXF-12, TXF-19, TXF-23).** The node's `contentDescription` is `label` (drawn or not; the drawn
  label is not read again); the shown supporting or error text and the counter are merged into it as its description;
  `isError` sets `error` ("Invalid", the library's `tanrei_invalid` string); `required` sets the state description
  "Required" (`tanrei_required` — override both in your resources to translate); `readOnly` is exposed as not
  editable. While shown, the prefix and suffix are part of the description too, so a unit is read with the value; the
  count is read as its visible text ("3/40"). An error shown while the field has focus is a polite live region, and the count is read — and announced
  while focused — only once typing pauses for a second.
- **Type (TXF-20, TXF-24).** `KeyboardOptions` per type (email and url: no capitalization or autocorrection; password:
  `PasswordVisualTransformation`, always one line; number: the decimal keypad, the value stays a string; search: the
  search action). Email, url, tel, number and password values are laid out left-to-right, aligned to the field's start
  edge in either direction; the rest follow their own direction.
- **Selection (TXF-6).** The highlight behind selected text is `selectionColor` (primary-container in the default
  system) in every variant and state, through `LocalTextSelectionColors`; the selection handles take the caret color.
- **Icons (TXF-22).** A slot is at least a box of the size's `iconSize`, given `LocalTanreiContentColor` (the leading or
  trailing icon part), `LocalTanreiIconGlyph` (unselected, at that size) and a text style that draws one glyph of the
  icon font. What you put there keeps its own semantics: an icon button stays a button and is the next focus stop
  after the input. The field builds in no clear or reveal action. Give a decorative glyph drawn as text
  `Modifier.clearAndSetSemantics {}` so its ligature is not read.

## Chip

`TanreiChip` (`specs/chip.spec.json`, CHP-1…26) is a compact control in a row — a suggested action, a filter, an item
the user entered — from `TanreiTheme.tokens.chip`. The spec's `kind` is the overload, as `platforms.compose` says; all
three are one implementation, `TanreiButton`'s chain with the chip's tokens.

```kotlin
TanreiChip(onClick = { addToCalendar() }, label = "Add to calendar", icon = { TanreiText("event") })   // action

var vegetarian by remember { mutableStateOf(false) }
TanreiChip(selected = vegetarian, onSelectedChange = { vegetarian = it }, label = "Vegetarian")        // filter

TanreiChip(                                                                                            // input
    onClick = { edit(person) },
    onRemove = { recipients -= person },          // the chip never removes itself or moves focus
    label = person.name,
    removeContentDescription = "Remove ${person.name}",
    avatar = { Image(person.portrait, contentDescription = null) },
    size = TanreiChipSize.Small,                  // Small | Medium (default): 24 / 32 in the default system
    variant = TanreiChipVariant.Elevated,         // Outlined (default) | Elevated — open
)
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `kind` | the overload: `onClick` alone (action), `selected` + `onSelectedChange` (filter), `onClick` + `onRemove` (input) |
| `click`, `change`, `remove` | `onClick`, `onSelectedChange: (Boolean) -> Unit` (`onClick` first, then `onSelectedChange` with `!selected`, as a native checkbox emits them — CHP-11), `onRemove` |
| `label` | `label: String` — the drawn text and the name; an empty one still renders, and a debuggable app reports it (CHP-26) |
| `removeLabel` | `removeContentDescription: String` (input overload) — the remove action's name; reported when empty |
| `selected` | `selected` (filter overload only) |
| `disabled` | `enabled` (inverse) |
| `variant`, `size` | `TanreiChipVariant`, `TanreiChipSize` — open keys of `tokens.chip.variants` / `.sizes`; one the system lacks draws the default's tokens and is reported in debuggable apps (CHP-7) |
| slots `icon`, `avatar` | `icon: (@Composable () -> Unit)?`; `avatar` on the input overload only — the other kinds cannot be given one, so CHP-15's "ignore and report" cannot arise |

- **Semantics (CHP-1, CHP-11, CHP-18).** The chip is one `Role.Button` node named by its label's text (read in full even
  when it is cut). A filter chip is `Modifier.toggleable` with `Role.Button` — an on / off state, not a checkbox — and
  the other kinds expose none. An input chip's remove action is a second `Role.Button` node, named by
  `removeContentDescription`, the next Tab stop after the chip. Icons, the check, the avatar and the close glyph are
  decorative. The chip handles no arrow keys and does not group itself (CHP-23): a row's keyboard model belongs to the
  layout holding the chips (a future chip group).
- **Looks and states (CHP-3, CHP-6, CHP-12, CHP-24).** Every part comes from `variants[variant][state]`: the variant's
  own parts, or — a filter chip that is on — its `selected…` parts; a change of state moves over the state motion, a
  change of selection over `motionSelectionDuration` / `motionSelectionEasing` (CHP-13), at once where motion is
  reduced. The default outlined chip keeps no fill and fades its outline when disabled; the elevated one rests at
  `level2` and rises to `level3` on hover.
- **The row (CHP-16, CHP-17).** `[start][icon | check | avatar][gap][label][gap][remove glyph][end]`, at least
  `containerHeight` high, padded top and bottom by at least `containerPaddingBlock`; each end is
  `containerPaddingInlineWithIcon` beside a glyph, `…WithAvatar` beside an avatar and `containerPaddingInline` beside
  the label. The label stays on one line and is cut with an ellipsis only when the chip is given less width; at 200 %
  text size the chip grows in height. The outline is `outlineWidth` inside the edge. Logical throughout: right-to-left
  mirrors the row, the remove action at the left (CHP-25).
- **The check and the close glyph (CHP-13, CHP-14).** The chip draws them itself, in the icon color of its look (the
  remove color for the close), at the size's `iconSize`. With an icon font installed (`TanreiFontFamilies.resolveIcon`
  returns a family for the glyph) they are the font's `check` and `close` ligatures with the glyph of their selection;
  without one they are vectors of the same box — the check on the checkbox's mark geometry, both stroked at
  `sys.border.thick`, as the checkbox's mark is — which is what the baselines show. The check draws in (and a filter
  chip without an icon widens by its room) over the selection motion; with an icon it takes the icon's place.
- **The remove action (CHP-18 – CHP-22).** A round container of `removeContainerSize` / `removeContainerShape` around
  the close glyph, answering its OWN hover, focus and press from the `remove…` parts (its own focus ring and ripple;
  a press outside the round container ripples from its center); the chip keeps its own state meanwhile — hovering the
  remove action does not hover the chip, and pressing it does not press the chip (CHP-20). Its hit area is at least `sys.target.touch` on both axes around the glyph:
  toward the label it reaches no further than the gap before the glyph, and outward past the chip's edge as far as it
  needs (Compose hit-tests a child outside its parent's bounds, so the chip's layout size does not grow; a chip placed
  right after it may cover that overflow). Backspace or Delete on the focused chip also emits `onRemove`.
- **The avatar (CHP-15).** A box of `avatarSize` clipped to `avatarShape`, hidden from assistive technology, drawn at
  `sys.state.disabled-content-opacity` when the chip is disabled. The baselines and the gallery draw a neutral grey
  square (#9E9E9E) for the fixture's `avatar`, and a stand-in calendar for `event`.

## Floating action button

`TanreiFloatingActionButton` (`specs/fab.spec.json`, FAB-1…14) performs the single most important action of a screen
with one icon on a raised container, from `TanreiTheme.tokens.fab`. It is `TanreiButton`'s chain (press and
press-hold, pressed feedback and ripple, keyboard focus ring, minimum target, elevation, container, corner smoothing,
unknown-value reports) with `TanreiIconButton`'s icon slot.

```kotlin
Box(Modifier.fillMaxSize()) {
    content()
    TanreiFloatingActionButton(
        onClick = { compose() },
        contentDescription = "Create",                     // required: the icon alone is not a name
        modifier = Modifier.align(Alignment.BottomEnd).padding(TanreiTheme.tokens.space.space200),
        variant = TanreiFabVariant.Tonal,                  // Filled (default) | Tonal | Surface — open
        size = TanreiFabSize.Large,                        // Small | Medium (default) | Large: 40 / 48 / 64 in the default system
    ) { TanreiText("add") }
}
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `label` | `contentDescription: String` — required; an empty one still renders, and a debuggable app reports it once (FAB-14) |
| `disabled` | `enabled` (inverse) — prefer hiding a FAB whose action is unavailable |
| `click` | `onClick` |
| `variant`, `size` | `TanreiFabVariant`, `TanreiFabSize` — keys of `tokens.fab.variants` / `.sizes`; a key the system lacks draws the default's tokens and is reported in debuggable apps (FAB-7) |
| slot `icon` | `icon: @Composable () -> Unit`, the trailing lambda |

- **Placement (FAB-13).** The FAB does not position itself, draw a scrim or move content: it lays out at its own size
  where its parent puts it — `Modifier.align(Alignment.BottomEnd)` in a `Box` (the inline end follows the layout
  direction), or a scaffold's `floatingActionButton` slot — clear of any navigation bar. Its place in the focus order
  is its place in the tree.
- **Semantics.** One `Role.Button` node named by `contentDescription`; the icon is decorative (its semantics are
  cleared, so a ligature drawn as text is never announced). Disabled leaves the focus order and is announced disabled.
- **States and elevation (FAB-3, FAB-6, FAB-12).** Container, icon, shadow and opacity come from
  `tokens.fab.variants[variant][state]` and `tokens.fab.opacity(state)`, moving over `motionStateDuration` with
  `motionStateEasing` (entering pressed snaps; at once where motion is reduced). The default system rests the FAB at
  `level3`, raises it to `level4` under hover, keeps `level3` under focus and press, and drops the shadow when
  disabled (a fill of on-surface at 12 %). The shadow is drawn outside the container and is never clipped — the group
  opacity of a `dim` press dims it with the rest.
- **Size, corner and icon (FAB-5, FAB-11).** The container is a square of `sizes[size].containerSize` with the corner of
  its size, `sizes[size].containerShape` (8 / 12 / 16: a larger FAB keeps the same proportion of rounding; cupertino
  draws a circle). The hit area grows to `sys.target.touch` on both axes when the square is smaller (the default
  system's medium FAB is exactly the target). The icon slot is a box of `sizes[size].iconSize`, given the icon color of
  the state, the unselected glyph (`LocalTanreiIconGlyph`) and a text style that draws one glyph of the icon font — as
  the icon button's. The box is dp, not sp: at 200 % text size the FAB keeps its size. The large FAB's glyph is 24 in
  the default system, whose `sys.icon` has no larger step. The baselines and the gallery draw a stand-in
  plus for the fixtures' `add`.

## Extended floating action button

`TanreiExtendedFloatingActionButton` (`specs/extended-fab.spec.json`, EFB-1…19) is the FAB with its name written out —
a label and an optional leading icon — from `TanreiTheme.tokens.extendedFab`, with its own tokens (a layer can style it
apart from the FAB) and Button's geometry. It collapses to a square that holds only its icon.

```kotlin
val listState = rememberLazyListState()
TanreiExtendedFloatingActionButton(
    text = "Compose",                                  // the label AND the accessible name, drawn or collapsed away
    onClick = { compose() },
    modifier = Modifier.align(Alignment.BottomEnd),
    expanded = listState.firstVisibleItemIndex == 0,   // the screen decides when it collapses
    icon = { TanreiText("edit") },                     // required to collapse
)
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `label` | `text: String` — the drawn label and the node's `contentDescription`; an empty one still renders, and a debuggable app reports it once (EFB-19) |
| `expanded` | `expanded: Boolean = true` |
| `disabled` | `enabled` (inverse) |
| `click` | `onClick` |
| `variant`, `size` | `TanreiExtendedFabVariant` (`Filled` default, `Tonal`, `Surface`), `TanreiExtendedFabSize` (`Small`, `Medium` default, `Large`) — open keys of `tokens.extendedFab.variants` / `.sizes`; one the system lacks draws the default's tokens and is reported in debuggable apps (EFB-7) |
| slot `icon` | `icon: (@Composable () -> Unit)?` |

- **Semantics.** One `Role.Button` node whose `contentDescription` is `text` — expanded or collapsed, the name and the
  role never change (EFB-13); the drawn label and the icon are not announced again. Disabled leaves the focus order.
- **Layout (EFB-11, EFB-12, EFB-18).** `[padding-inline-start(-with-icon)][icon][gap][label][padding-inline-end]`, at
  least `containerHeight` high and padded by at least `containerPaddingBlock`, exactly as wide as that content. The label
  is set in the size's `labelTypescale` (`heading5` at large in the default system) and the state's `labelColor`, and
  the icon — a box of `iconSize`, the unselected glyph — takes the same color. The label never truncates: given less
  width it wraps and the container grows; at 200 % text size it grows too. Paddings are logical, so right-to-left
  mirrors the row.
- **Collapsing (EFB-13, EFB-14, EFB-15).** `expanded = false` collapses it to a square of `containerHeight` with the
  icon centered, over `motionResizeDuration` with `motionResizeEasing` (the standard spatial spring, 500 ms in the
  default system), the label fading out as it narrows; at once where motion is reduced. The content is clipped to the
  container while it moves. It changes only its own width: which edge stays put is the parent's alignment
  (`Alignment.BottomEnd` keeps the inline end). Without an icon it cannot collapse: it stays expanded and a debuggable
  app reports it.
- **States, elevation, placement (EFB-3, EFB-6, EFB-16, EFB-17).** As the FAB's: every part from
  `variants[variant][state]` and `opacity(state)`, over the state motion; `level3` at rest and `level4` under hover in
  the default system, no shadow when disabled; the shadow outside the container and never clipped. It does not position
  itself. The baselines and the gallery draw a stand-in pencil for the fixtures' `edit`.

## List

`TanreiList` and `TanreiListItem` (`specs/list.spec.json`, LST-1…26) show a column of related items that people read,
open one by one, or choose from, from `TanreiTheme.tokens.list`. The list is the column and the semantics; each
`TanreiListItem` called in its content lambda is one row (the spec's item kind `list-item`). An item finds its
list through a composition local, so the items may also come from a lazy list the product builds inside the list.

```kotlin
TanreiList {                                                        // selectionMode = None: static and interactive rows
    TanreiListItem("Wi-Fi", supportingText = "Connected", onClick = { openWifi() },
        leadingIcon = { TanreiText("wifi") }, trailingIcon = { TanreiText("chevron_right") })
    TanreiListItem("Airplane mode", divider = true,                  // static: its switch keeps its own focus stop
        trailingContent = { TanreiSwitch(checked = airplane, onCheckedChange = { airplane = it }, label = "Airplane mode", labelHidden = true) })
    TanreiListItem("Ada Lovelace", supportingText = "Edited the roadmap", leadingMedia = TanreiListLeadingMedia.Avatar,
        leadingContent = { TanreiText("A") })
}

var theme by remember { mutableStateOf<String?>("light") }
TanreiList(
    selectionMode = TanreiListSelectionMode.Single,                  // Multiple: selectedValues: Set<String>
    contentDescription = "Theme",                                    // required for a listbox
    selectedValue = theme,
    onSelectionChange = { theme = it.single() },                     // the new selection: the chosen value alone
) {
    TanreiListItem("Light", value = "light")
    TanreiListItem("Dark", value = "dark")
}
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `selection` | `selectionMode: TanreiListSelectionMode` (`None` default, `Single`, `Multiple`) — closed, so an unknown value cannot be passed (LST-7) |
| `label` | `contentDescription: String` — the listbox's name; a blank one in a listbox still renders, and a debuggable app reports it (LST-23) |
| `value`, `values` | `selectedValue: String?` (single), `selectedValues: Set<String>` (multiple) — hoisted: the caller keeps them |
| `change` | `onSelectionChange: (Set<String>) -> Unit` — the new selection: `setOf(chosen)` while single, the new set while multiple; never for the selected option of a single choice (LST-13, LST-14) |
| item `list-item` | `TanreiListItem(headline, …)` in the content lambda |
| `headline`, `overline`, `supportingText`, `supportingMaxLines`, `trailingText`, `value`, `divider` | the same names |
| `leadingMedia` | `leadingMedia: TanreiListLeadingMedia` (`None` default, `Avatar`, `Image`) — closed |
| `interactive`, `click` | `onClick: (() -> Unit)?` — non-null makes a row interactive; ignored in a listbox |
| `disabled` | `enabled` (inverse) — ignored for a static row |
| `leadingIcon`, `trailingIcon` | icon slots, `(@Composable () -> Unit)?` — null draws nothing and leaves no space |
| slots `leading`, `trailing` | `leadingContent` (the avatar's or image's content), `trailingContent` (a static row's control) |

- **Three kinds of row (LST-11, LST-12).** In a list whose `selectionMode` is `None`, an item without `onClick` is
  STATIC: not focusable, no state answer, `enabled` ignored, its texts merged into one node with its position, and a
  control in `trailingContent` keeping its own semantics and focus stop. An item with `onClick` is one `Role.Button`
  node. In a listbox (`Single`, `Multiple`) every item is an option: `Modifier.selectable` with its selected state, in
  a `selectableGroup()`; its `onClick` is ignored. The list carries `CollectionInfo` (its row count) and each item
  `CollectionItemInfo` (its position); the list's `contentDescription` names it as a traversal group. Compose has no
  list, listbox or option role and no multi-selectable flag: TalkBack announces a collection and "selected".
- **Name and description (LST-23).** The item's texts merge into its node in reading order — overline, headline,
  supporting text, trailing text —, so the headline is read with the rest; a cut supporting text is read in full.
  Icons, the check, the divider and the leading media are hidden (their semantics are cleared; a monogram is not read).
  An empty headline still renders; a debuggable app reports it.
- **The slots of an interactive item or an option must hold no interactive element (LST-24).** The row is one element
  to assistive technology, which cannot reach a control nested in it, and a press on that control would also activate
  the row. Compose cannot inspect slot content, so this is not checked: it is the caller's rule. A row with its own
  switch is a static item with the switch in `trailingContent`.
- **Keyboard (LST-15).** A list with interactive items or options is ONE Tab stop — the item that had focus last, else
  the first selected option, else the first enabled item; the other items refuse focus (`focusProperties`), so a
  programmatic `requestFocus()` reaches only the stop. Down and Up Arrow move without wrapping, Home and End go to the
  ends, and printable characters typed within a second of each other move to the next item whose headline begins with
  them. Moving focus never selects; Space and Enter activate. A disabled item stays reachable by the arrow keys (it
  keeps a focus target of its own) but does not activate (LST-2). Static items take no focus.
- **States (LST-3, LST-6, LST-9, LST-25).** An interactive item or an option is `TanreiButton`'s chain with the list's
  tokens, drawn from `tokens.list.conditions[condition][state]` — the condition is `Selected` for a selected option,
  otherwise `Unselected` — and `tokens.list.opacity(state)`, moving over `motionStateDuration` / `motionStateEasing`
  (entering pressed snaps; at once where motion is reduced). A disabled item keeps its resting colors and dims as a
  whole, its leading media included (0.38 in the default system).
- **Focus ring (LST-4, LST-10).** Drawn INSIDE the row (`tanreiFocusRing(inside = true)`: its outer edge on the row's
  edge), so the list's scrolling ancestor cannot clip it; never animated; in the system's focus style. It is drawn
  outside the dimmed group, so a disabled item the arrow keys reach shows it at full strength.
- **The row (LST-5, LST-16, LST-17).** `[padding-inline-start][leading][gap][overline / headline / supporting
  text][gap][trailing text][gap][trailing icon][gap][trailingContent][gap][mark][padding-inline-end]`, the text column
  taking the rest of the width (a trailing text takes at most half of it). At least `containerHeightOneLine` with a
  headline alone, `…TwoLine` with one more line (an overline, or supporting text on one line), `…ThreeLine` with two or
  more — counted from the laid-out text —, padded by `containerPaddingBlock`, growing with its content and with larger
  text. An interactive item or an option is at least `sys.target.touch` tall (Compose cannot tell a fine pointer), and
  the whole row is its hit area. Leading and trailing elements are centered on the text column in a one- or two-line
  item and aligned with its top in a taller one. Logical throughout: right-to-left mirrors the row; a ripple still
  grows from the point of contact.
- **Texts, icons and media (LST-18 – LST-20).** Headline, overline, supporting and trailing text in their
  `…Typescale` tokens; all wrap; `supportingMaxLines > 0` cuts the supporting text with an ellipsis (a negative value
  draws as 0 and is reported). Icon slots are boxes of `leadingIconSize` / `trailingIconSize` given the condition's icon
  color, glyph (`FILL` for a selected option) and icon-font text style. `leadingMedia` frames `leadingContent` in a
  box of `avatarSize` / `avatarShape` or `imageSize` / `imageShape` on `mediaContainerColor`, handing it
  `mediaContentColor` and the headline's text style — a monogram is set in `headlineTypescale`, centred (LST-20); it
  replaces the leading icon.
- **Selection (LST-13, LST-14, LST-21, LST-26).** Every option of a listbox reserves a box of `markSize` at the end;
  the selected one strokes the checkbox's check geometry in it at `markWidth` in `markColor`, drawn in over the state
  duration. A value or values naming no option select nothing; an option whose value is empty or repeated still
  renders; a debuggable app reports each once.
- **Divider (LST-22).** `divider = true` draws `dividerThickness` of `dividerColor` along the bottom edge, inside the
  height, from the start of the text column to the end edge. It is drawn over the row but outside the dimmed group, so
  it keeps its color and its full opacity in every state and condition — a disabled item's opacity does not reach
  it —, and it is not in the semantics tree.
- **Long lists.** The list never scrolls or virtualizes: put it in the screen's scroll container. For long data the
  product builds its own lazy list (a `LazyColumn` inside `TanreiList`); then only the composed items register, so the
  position, the set size and the arrow keys cover the items on screen.

## Menu

`TanreiMenu` (`specs/menu.spec.json`, MNU-1…29) shows a short list of actions or options on a surface that opens from
the product's anchor, from `TanreiTheme.tokens.menu`. `DropdownMenu`'s idiom: call it inside the anchor's `Box`; it is
shown in a `Popup`, above everything else. Its items are the spec's four item kinds, each a composable
called in the content lambda. The menu is an operated overlay: not modal, but it takes focus
and gives it back.

```kotlin
var open by remember { mutableStateOf(false) }
var grid by remember { mutableStateOf(true) }
var sort by remember { mutableStateOf<String?>("name") }
Box {
    TanreiIconButton(onClick = { open = true }, contentDescription = "More") { TanreiText("more_vert") }
    TanreiMenu(expanded = open, onDismissRequest = { reason -> open = false }, placement = TanreiMenuPlacement.BottomEnd) {
        TanreiMenuItem("Copy", onClick = { copy() }, leadingIcon = { TanreiText("content_copy") }, trailingText = "Ctrl+C")
        TanreiMenuGroup(title = "View") {
            TanreiCheckboxMenuItem("Show grid", checked = grid, onCheckedChange = { grid = it })
        }
        TanreiMenuGroup(title = "Sort by", selectedValue = sort, onSelectedValueChange = { sort = it }) {
            TanreiRadioMenuItem("Name", value = "name")
            TanreiRadioMenuItem("Date", value = "date")
        }
        TanreiMenuGroup { TanreiMenuItem("Delete", onClick = { delete() }, destructive = true) }
    }
}
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `open` | `expanded: Boolean` — the caller opens and closes it |
| `close` | `onDismissRequest: (TanreiMenuCloseReason) -> Unit` — `Escape`, `Back`, `Outside`, `Tab`, `FocusOut`, `Item` (the spec's `escape`, `back`, `outside`, `tab`, `focus-out`, `item`); the menu only asks, the caller sets `expanded = false` (MNU-5) |
| `placement` | `placement: TanreiMenuPlacement` (`BottomStart` default, `BottomEnd`, `TopStart`, `TopEnd`) — closed (MNU-14) |
| item `item` | `TanreiMenuItem(text, onClick, …, destructive, enabled, leadingIcon, trailingIcon)` |
| item `checkbox-item` | `TanreiCheckboxMenuItem(text, checked, onCheckedChange, …)` — the caller keeps `checked` |
| item `radio-item` | `TanreiRadioMenuItem(text, value, …)`, in a group |
| item `group` | `TanreiMenuGroup(title, selectedValue, onSelectedValueChange) { … }` — the caller keeps `selectedValue` |
| `label`, `supportingText`, `trailingText`, `leadingIcon`, `trailingIcon`, `disabled` | `text`, `supportingText`, `trailingText`, icon slots `(@Composable () -> Unit)?`, `enabled` (inverse) |

- **The overlay (MNU-1, MNU-2, MNU-25).** A focusable `Popup` placed against the anchor's `Box`: `surfaceOffset` below
  or above it with the start or end edges aligned (start and end follow the layout direction), flipped to the other
  side when this one lacks room and the other has more, shifted to stay `surfaceViewportMargin` inside the window,
  its height limited to the larger room left (its items then scroll), following the anchor as it moves. No scrim, no
  focus trap, nothing made inert.
- **Focus (MNU-1, MNU-5).** Opening moves focus to the first enabled item. The anchor keeps its focus in its
  own window while the popup holds focus in the popup's window, so when the menu closes the anchor has focus again —
  when it had it (a menu opened by touch leaves nothing focused). Tab and Shift+Tab ask to close (`Tab`) and, once
  the popup is gone, move focus on from the anchor.
- **Closing (MNU-5, MNU-6).** Escape → `Escape`; the platform's back → `Back`; a press outside the surface → `Outside`
  — Compose's `Popup` CONSUMES that press, so it does not reach the element under it, and a press on the anchor itself
  is such a press (it closes the menu rather than reopening it); Tab → `Tab`; the popup's window losing focus to
  another window → `FocusOut`; an activated item → `Item`. Each is ONE call of `onDismissRequest`; the product closes
  the menu by setting `expanded` to false (`open` is a plain value on Compose).
- **Activation (MNU-6).** An action calls `onClick`, then asks to close. A checkbox item calls `onCheckedChange(!checked)`
  and a radio item its group's `onSelectedValueChange(value)`; after a pointer, touch or Enter they then ask to close,
  after Space the menu stays open. A checked radio item emits no change, but closes (or stays open) the same way.
- **Keyboard and pointer (MNU-7, MNU-8).** Down and Up Arrow wrap and pass through groups, Home and End go to the ends,
  and type-ahead moves to the next item whose label begins with the typed characters (within a second); disabled
  items are reached but do not activate; titles and dividers take no focus. A pointer moving onto an item moves focus
  there without the focus ring and draws it hovered; the arrow keys continue from it.
- **Semantics (MNU-24).** Compose has no menu, menu-item or separator role: the surface carries `CollectionInfo` and
  each item `CollectionItemInfo` (its position); an action has no role (as `DropdownMenuItem`), a checkbox item is
  `Role.Checkbox` with its on / off state, a radio item `Role.RadioButton` with its selected state. An item's texts
  merge in order — label, supporting text, trailing text (a shortcut is read as description: Compose has no shortcut
  property). A group is a traversal group whose title is a heading; the divider has no semantics. Icons and the check
  are hidden. The menu cannot mark the product's anchor as opening a menu or as expanded: an anchor that wants it sets
  its own semantics (`expand` / `collapse` actions).
- **States (MNU-10, MNU-13, MNU-15 – MNU-17, MNU-27).** An item is `TanreiButton`'s chain with the menu's tokens, drawn
  from `tokens.menu.conditions[condition][state]` — `Destructive` for a destructive action, `Selected` for a checked
  item, otherwise `Unselected` — and `tokens.menu.opacity(state)`, over `motionStateDuration` / `motionStateEasing`
  (entering pressed snaps; at once where motion is reduced). The focus ring is drawn INSIDE the item
  (`tanreiFocusRing(inside = true)`), which the surface would otherwise clip.
- **Surface (MNU-3, MNU-4).** `surfaceColor` at `surfaceElevation`, `surfaceShape` eased by corner smoothing, as wide as
  its widest item between `surfaceMinWidth` and `surfaceMaxWidth` (a longer label wraps), its items inset by
  `surfacePaddingInline` / `surfacePaddingBlock` and clipped to its shape. It fades in and grows (a vertical scale from
  the edge that faces the anchor) over `motionOpenDuration` / `motionOpenEasing`, and fades out over
  `motionCloseDuration` / `motionCloseEasing`; at once where motion is reduced.
- **Rows (MNU-12, MNU-19 – MNU-22).** `[containerPaddingInline][mark column][gap][icon column][gap][label / supporting
  text][gap][trailing text][gap][trailing icon][containerPaddingInline]`. The mark column is there while ANY item is a
  checkbox or radio item, the icon column while any item has a leading icon, and both keep their width in every row,
  so labels align. At least `containerHeight` and `sys.target.touch` tall (Compose cannot tell a fine pointer), padded
  by `containerPaddingBlock`, growing with larger text; every element is centred on the label's first line. Texts
  in `labelTypescale`, `supportingTextTypescale`, `trailingTextTypescale`; icons in boxes of their size tokens with the
  glyph of the condition. A checked item strokes the checkbox's check geometry at `markWidth` in a box of `markSize`,
  drawn in over the state duration. Right-to-left mirrors the row.
- **Groups (MNU-23, MNU-28, MNU-29).** A divider — `dividerThickness` of `dividerColor` across the surface's inner width
  (inside its inline padding), `dividerSpace` above and below — goes between a group and the element next to it,
  never first or last. A title is drawn above the group's items in `groupTitleTypescale` / `groupTitleColor`,
  starting where the labels start. A radio item outside a group is drawn unchecked; a group's value naming none of its
  radio items, two radio items of one group sharing a value (both checked), and a group inside a group (its items join
  the outer group, without its title or divider) are reported in debuggable apps, as is an empty label (MNU-26).
- **The in-place form (MNU-19's `verify`).** The baselines draw the open surface where it is composed, at its natural
  size with its elevation, without an anchor, placement, popup or open motion: the test-only internal
  `TanreiMenuInPlace(onDismissRequest, modifier, maxHeight) { … }`. The gallery shows each fixture behind an anchor
  button that opens it.

## Tabs

`TanreiTabs` (`specs/tabs.spec.json`, TAB-1…23) switches between views of the same subject with a row of labelled
tabs, from `TanreiTheme.tokens.tabs`. Material's `PrimaryTabRow`, `SecondaryTabRow` and `ScrollableTabRow` in one
composable, selected by VALUE rather than by index: a value survives tabs being added, removed or
reordered. Each tab is the spec's item kind `tab`, a `TanreiTab` called in the content lambda.

```kotlin
var view by rememberSaveable { mutableStateOf("overview") }
Column {
    TanreiTabs(selectedValue = view, onSelectedValueChange = { view = it }, contentDescription = "Project") {
        TanreiTab(value = "overview", label = "Overview", icon = { TanreiText("dashboard") })
        TanreiTab(value = "activity", label = "Activity", icon = { TanreiText("history") })
        TanreiTab(value = "billing", label = "Billing", icon = { TanreiText("payments") }, enabled = false)
    }
    // Compose has no tab panel role: the selected view follows the row in reading order.
    when (view) {
        "overview" -> Overview()
        "activity" -> Activity()
    }
}
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `variant` | `variant: TanreiTabsVariant` (`Primary` default, `Secondary`; open) |
| `scrollable` | `scrollable: Boolean` |
| `selected` | `selectedValue: String?` — null selects the first enabled tab; the caller keeps it |
| `label` | `contentDescription: String` — the row's name |
| `change` | `onSelectedValueChange: (String) -> Unit` — the caller moves `selectedValue` (state hoisting) |
| item `tab` | `TanreiTab(value, label, modifier, labelHidden, enabled, icon, interactionSource)` — `enabled` is the spec's `disabled`, inverted; `icon` is a slot |

- **Selection (TAB-1, TAB-11).** The selected tab is the first whose value equals `selectedValue`, or, while it is
  null, the first enabled tab. Activating another tab — pointer, touch, Enter, Space, or reaching it with the arrow
  keys — calls `onSelectedValueChange` once with its value; the selected tab calls nothing. A value naming no tab
  selects none (no indicator); a value naming none, an empty value and a value given to two tabs are reported in
  debuggable apps (the first tab with a value is the one it selects), as are an empty label (TAB-22) and
  `labelHidden` without an icon, which draws the label anyway (TAB-19).
- **Keyboard (TAB-2, TAB-12).** The row is one Tab stop: the selected tab (the first enabled tab when the selected one
  is disabled), and Tab moves on into what follows — the panel. Right and Left Arrow move to the next and previous
  enabled tab, wrapping, and select it (automatic activation); mirrored right-to-left. Home and End go to the first
  and last enabled tab. Disabled tabs take no focus at all. Built on the list's and menu's `TanreiRovingFocus` in its
  horizontal form (ordered from the start edge, no type-ahead, the Tab stop following the selection).
- **Semantics (TAB-13).** Compose has no tab list or tab panel role. The row is a selectable group
  (`selectableGroup()`, as Material's rows) named by `contentDescription`, with `CollectionInfo(rowCount = 1,
  columnCount = n)`; each tab is `Role.Tab` with its selected state, `CollectionItemInfo(columnIndex = i)`, named by its
  label — as `contentDescription` while the label is hidden. Icons, the indicator and the divider are not in the
  tree. The product shows the selected tab's view below the row, in reading order: there is no panel to associate
  or hide, and a panel with no focusable content is not made focusable (the web's `tanrei-tab-panel` does both).
- **Layout (TAB-5, TAB-14, TAB-18, TAB-21).** Fixed: the row's width divided equally, each tab at least
  `sys.target.touch` wide, a label that does not fit wraps and every tab grows to the tallest. Scrollable: each tab its
  content plus `containerPaddingInline` on each side (at least the touch target), labels on one line, the row starting
  at its start edge and scrolling sideways. The content is inset by `containerPaddingInline` in both forms. At least
  `containerHeight` (and the touch target) tall; a primary tab with an icon and a drawn label stacks the icon above
  it, `containerGap` apart, and is at least `containerHeightWithIcon` tall; a secondary tab puts the icon before the
  label, on its first line. Icons in a box of `iconSize` with the glyph of the tab's selection; labels in
  `labelTypescale`. Right-to-left orders the tabs from the right and starts a scrollable row at its right edge.
- **Indicator and divider (TAB-16, TAB-17, TAB-20).** The row draws the selected tab's indicator on its bottom edge,
  over the divider: the selected look's `activeIndicatorColor`, `activeIndicatorThickness` thick, its top corners
  rounded by `activeIndicatorShape` (eased by corner smoothing), spanning the tab's content (primary — the label, or
  the icon when wider or alone) or the whole tab (secondary). It slides and resizes to a newly selected tab over
  `motionIndicatorDuration` / `motionIndicatorEasing`, and a scrollable row scrolls a selected or focused tab that is
  partly out of view into view over the same timing (TAB-15); both at once where motion is reduced, and at once when the
  row first appears with its selected tab out of view. A tab's content is inset by its variant's indicator thickness
  above and below, so a wrapping label grows the tab rather than running under the indicator (TAB-16). A variant a
  layer adds is drawn in primary's form. The divider — `dividerThickness` of `dividerColor` — runs under the whole
  row, across its full width while it scrolls.
- **States (TAB-3, TAB-6, TAB-8 – TAB-10, TAB-23).** A tab is `TanreiButton`'s chain with the tabs' tokens, drawn from
  `tokens.tabs.variants[variant][state]` — the `selected.` parts for the selected tab, the variant's own for the
  others — and `tokens.tabs.opacity(state)`; a change of state moves over `motionStateDuration` /
  `motionStateEasing` (entering pressed snaps), and so does a change between selected and not selected. The focus
  ring is drawn INSIDE the tab (`tanreiFocusRing(inside = true)`), which a scrolling row would otherwise clip.

## Tooltip

`TanreiTooltip` (`specs/tooltip.spec.json`, TIP-1…16) describes its anchor with a short text that appears on a resting
pointer, keyboard focus or a long-press, from `TanreiTheme.tokens.tooltip`. Material's `TooltipBox` idiom: it wraps the
anchor, and a `TanreiTooltipState` says whether it is showing. A READ overlay: a `Popup` that never takes
focus and makes nothing inert.

```kotlin
TanreiTooltip(text = "Move to trash", describes = false) {
    TanreiIconButton(onClick = { trash() }, contentDescription = "Move to trash") { TanreiText("delete") }
}
val hint = rememberTanreiTooltipState(onToggle = { open -> log(open) })
TanreiTooltip(text = "Files in the trash still count toward your storage.", variant = TanreiTooltipVariant.Rich, title = "Storage", state = hint) {
    TanreiText("12.4 GB used")
}
LaunchedEffect(Unit) { hint.show() } // a first-run hint: emits nothing
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `variant` | `variant: TanreiTooltipVariant` (`Plain` default, `Rich`) — closed: structure, not a token axis |
| `text`, `title` | `text: String`, `title: String` (a plain tooltip ignores `title`) |
| `placement` | `placement: TanreiTooltipPlacement` (`Top` default, `Bottom`, `Start`, `End`) |
| `describes` | `describes: Boolean = true` |
| `open` | `state: TanreiTooltipState` — `isVisible`; `show()` and `dismiss()` set it and emit nothing (TIP-7) |
| `toggle` | `rememberTanreiTooltipState(initiallyVisible, onToggle)` — `onToggle(open)` when it opened or closed BY ITSELF |

- **Opening and closing (TIP-1 – TIP-6).** A mouse resting on the anchor opens it after `motionShowDelay`; it stays
  while the pointer moves onto the tooltip and closes `motionHideDelay` after the pointer left both. Keyboard focus on
  the anchor opens it at once and focus leaving closes it; focus by pointer or touch does not. A long-press by touch
  opens it without activating the anchor (the rest of that touch is consumed) and it stays `timeoutTouch` after the
  finger lifts; a touch anywhere else closes it sooner. Escape closes it without moving focus and goes no further — its
  key down and key up are both consumed, so an enclosing dialog does not hear them; while focus is elsewhere in the
  window (the anchor only hovered), a key listener for unhandled keys does the same (API 28+), and a Tanrei dialog asks
  the open tooltip of its window first. Activating the anchor (click, tap, Enter, Space) closes it, and it does not
  reopen from the same hover. No time limit while hovered or focused. At most one tooltip is open per window: one
  opening closes the other at once, and opens without the show delay while another is open (TIP-8).
- **Placement (TIP-9).** `offset` from the anchor on the preferred side, centred on it; flipped to the opposite side when
  that one has no room inside `windowMargin` of the window, the side with more room when neither has, shifted along
  the side to stay inside the margin — and, when it is taller (or wider) than either side's room, kept inside the
  window across the side too, over the anchor. Never wider than the window's room. It follows the anchor as it moves,
  and closes (emitting) when the anchor is removed or scrolled out of the window.
- **Drawing (TIP-10 – TIP-12).** Plain: `plainSupportingTextTypescale` / `plainSupportingTextColor` on
  `plainContainerColor` at `plainContainerElevation`, `plainContainerShape` corners, padded by the plain paddings, at
  least `plainContainerMinHeight` tall and at most `plainContainerMaxWidth` wide. Rich: `richTitle*` above
  `richSupportingText*`, `richContainerGap` apart, on `richContainerColor` at `richContainerElevation` (its shadow is
  inside the popup's window, so it is not cut off), at most `richContainerMaxWidth` wide; no title, the text alone.
  Text wraps, grows with larger text and starts at the layout direction's start; corners eased by corner smoothing.
- **Never in the way (TIP-13).** `PopupProperties(focusable = false)`: nothing in it takes focus or is pressable; a
  press on it closes it and is consumed. It is a sub-window of the window its anchor is in — above that window's
  content, and above a Tanrei dialog when the anchor is inside it; a tooltip shown by the product on an anchor BEHIND an
  open dialog is under the dialog's window.
- **Semantics (TIP-14, TIP-16).** Compose has no description property: the text — after the title, for a rich tooltip —
  becomes the anchor's `stateDescription`, read after its own name and role, whether or not the tooltip is showing, and
  the drawn tooltip is hidden so it is not read twice. A Tanrei control as the anchor puts it on its own node (as a
  badge's description, which it joins); anything else gets it on the tooltip's box. `describes = false` adds nothing.
  An empty `text` never opens and describes nothing; it and a plain tooltip's `title` are reported in debuggable apps.
- **Motion (TIP-15).** It fades in over `motionEnterDuration` / `motionEnterEasing` and out over `motionExitDuration` /
  `motionExitEasing`, and never moves or scales. Android's reduced motion removes every animation, so there it appears
  and disappears at once.
- **The in-place form.** The baselines draw the anchor at the centre of a 320 × 200 stage and the open tooltip beside
  it, placed by the popup's own rule with the stage as the window — the test-only internal
  `TanreiTooltipInPlace(text, modifier, variant, title, placement) { anchor }`. The gallery shows each fixture closed:
  hover, focus or a long-press opens it.

## Snackbar

`TanreiSnackbarHost` (`specs/snackbar.spec.json`, SNK-1…20) shows short messages about what just happened, one at a
time, at the bottom of its area, from `TanreiTheme.tokens.snackbar`. Material's snackbar API: a hoisted
`TanreiSnackbarHostState` and a suspending `showSnackbar` that returns how the snackbar closed. A READ overlay:
announced politely, never taking focus.

```kotlin
val snackbars = remember { TanreiSnackbarHostState() }
val scope = rememberCoroutineScope()
Box(Modifier.fillMaxSize()) {
    Content(onArchive = {
        scope.launch {
            when (snackbars.showSnackbar("Conversation archived", actionLabel = "Undo")) {
                TanreiSnackbarResult.ActionPerformed -> unarchive()
                is TanreiSnackbarResult.Dismissed -> Unit
            }
        }
    })
    TanreiSnackbarHost(snackbars, Modifier.fillMaxSize())
}
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `message`, `action`, `closable`, `closeLabel`, `duration` | `showSnackbar(message, actionLabel, withDismissAction, closeLabel, duration)`; `TanreiSnackbarDuration` (`Auto` default, `Short`, `Long`, `Indefinite`) |
| `action` | returns `TanreiSnackbarResult.ActionPerformed` |
| `dismiss` | returns `TanreiSnackbarResult.Dismissed(reason)` — `TanreiSnackbarDismissReason` `Close`, `Escape`, `Timeout`, `Host` |
| (in place, SNK-19) | `TanreiSnackbar(message, modifier, actionLabel, withDismissAction, closeLabel, duration, onResult)` |

- **The queue (SNK-12).** One at a time, in the order requested; the next is shown only once the last has faded out,
  and not while a Tanrei modal dialog is open. Each `showSnackbar` returns once its snackbar has closed.
  `dismissCurrent()` closes the one showing and `clear()` closes it and drops every one waiting, each with `Host`; a
  cancelled `showSnackbar` closes its snackbar with `Host` too. `currentMessage` is the message showing.
- **Timing (SNK-8, SNK-9).** `Auto` is `timeoutShort` without an action and never times out with one; `Short` and
  `Long` close after `timeoutShort` / `timeoutLong` (`Timeout`); `Indefinite` never. The time is lengthened to
  Android's accessibility timeout (`calculateRecommendedTimeoutMillis`), and a snackbar with an action never closes by
  itself while touch exploration (TalkBack) runs. It pauses while the pointer is over it, while focus is inside it,
  while its window has no focus (hidden, in the background, or covered by a dialog's window) and while a Tanrei modal
  dialog is open, and then starts again from its whole length.
- **Announcement and focus (SNK-10, SNK-11).** The shown bar is a polite live region (`LiveRegionMode.Polite`): its
  message, then its action's label, are read when it appears; focus never moves. Its controls come in the focus order
  where the host is (put the host last); Escape while focus is inside closes it (`Escape`), and when it closes around
  the focus — its action, its close button, Escape — focus is moved back out the way it came in (Compose cannot name
  the element that had focus before).
- **Placement (SNK-13).** The host is a box that puts the bar at its bottom centre, inside the safe drawing insets
  (`WindowInsets.safeDrawing`, which includes the keyboard) and `containerMargin` from its edges. It is part of the
  layout: give it the area of the content it reports on, last in a `Box` with that content, so it is drawn above the
  content; a Tanrei dialog, a window of its own, is above it.
- **The bar (SNK-14 – SNK-16, SNK-18).** At least `containerMinHeight` tall, as wide as its content between
  `containerMinWidth` and `containerMaxWidth` and never wider than it is given; `containerColor` at
  `containerElevation`, `containerShape` corners. The message in `supportingTextTypescale` / `supportingTextColor`,
  `containerPaddingInlineStart` before it and `containerPaddingBlock` above and below; `containerGap` later the action
  and the close button, `controlsGap` apart, centred on the message's first line, then
  `containerPaddingInlineEndWithControls` (or `containerPaddingInlineEnd` with no control). When the message would need
  more than two lines beside the controls, or the action would not fit beside it, the action moves to its own row,
  `containerGap` below the message, at the end, `containerPaddingInlineEndWithControls` from the bottom; the close button
  stays on the first row. The message wraps; the action's label never does. Right-to-left mirrors it.
- **The controls (SNK-1 – SNK-7, SNK-15).** The action (`controlsHeight` tall, `controlsPaddingInline` around its label
  in `controlsLabelTypescale`) and the close button (a `controlsHeight` square with the close glyph at
  `controlsIconSize` — the icon font's `close` when installed, else the chip's vector cross — named `closeLabel`) are
  `TanreiButton`'s chain with `tokens.snackbar.controls[control][state]` and `tokens.snackbar.opacity(state)`. Their hit
  areas reach `sys.target.touch` on both axes while the row places their VISUAL boxes, so the target overlaps the
  padding and the gap instead of spreading the controls apart.
- **Motion (SNK-17).** It rises into place from below by its height plus its margin while fading in, over
  `motionEnterDuration` / `motionEnterEasing`, and fades out in place over `motionExitDuration` / `motionExitEasing`.
  Android's reduced motion removes every animation: it appears and disappears at once.
- **In place (SNK-19).** `TanreiSnackbar(…)` draws the bar where it is composed — no host, timeout, queue, entrance or
  announcement — and still reports through `onResult`; the baselines and the gallery draw it so. An empty message, a
  close button without `closeLabel` and a timed snackbar with an action are reported in debuggable apps (SNK-20).

## Dialog

`TanreiDialog` (`specs/dialog.spec.json`, DLG-1…16) asks for a decision in a modal surface over the whole window, from
`TanreiTheme.tokens.dialog`: an optional icon, the headline (its name), supporting text (read after it), custom content,
and the product's Tanrei Buttons as actions. A modal overlay, presented in a `Dialog` window.

```kotlin
var open by remember { mutableStateOf(false) }
val cancel = remember { FocusRequester() }
TanreiButton(text = "Discard", onClick = { open = true })
TanreiDialog(
    visible = open,
    onDismissRequest = { open = false },
    headline = "Discard draft?",
    supportingText = "The message you were writing will be deleted from this device.",
    initialFocus = cancel,
    actions = {
        TanreiButton(text = "Cancel", onClick = { open = false }, modifier = Modifier.focusRequester(cancel), variant = TanreiButtonVariant.Text)
        TanreiButton(text = "Discard", onClick = { discard(); open = false }, variant = TanreiButtonVariant.Text)
    },
)
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `open` | `visible: Boolean` — a parameter, so the exit motion runs before the window goes |
| `headline`, `supportingText`, `alert`, `dismissible` | `headline: String`, `supportingText: String`, `alert: Boolean`, `dismissible: Boolean = true` |
| `dismiss` | `onDismissRequest: () -> Unit` — the product closes it |
| slots `icon`, `actions`, default | `icon`, `actions`, `content`: `(@Composable () -> Unit)?` |
| (initial focus, DLG-2) | `initialFocus: FocusRequester?` |

- **The window (DLG-1, DLG-15).** A `Dialog` window (`usePlatformDefaultWidth = false`, edge to edge) with the window's
  own dim and animation switched off: Tanrei draws `scrimColor` (the `scrim` role, as drawn) over the whole window and
  runs its own motion. Nothing behind it can be pressed, scrolled or focused (the window is modal), and the window under
  it is hidden from assistive technology while it is open (`IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS`, restored
  when it closes). A dialog opened from a dialog stacks above it with its own scrim, and hides the first one the same
  way. A snackbar host waits for it (SNK-9, SNK-12).
- **Focus (DLG-2 – DLG-4, DLG-13).** When it opens, focus moves to `initialFocus` or, without one, to the surface (a
  focus stop only until something inside it has had focus), on the first frame — not when the motion ends. Tab and
  Shift+Tab wrap inside the window. When it closes, the window underneath has its focus back, on the element that had
  it (the opener, or the element inside the first of two stacked dialogs).
- **Dismiss (DLG-5, DLG-6).** While `dismissible`, Escape (consumed, key down and up), the platform's back
  (`dismissOnBackPress`) and a press on the scrim — not on the surface — each call `onDismissRequest` once; while it is
  false they do nothing. A tooltip open inside the dialog has Escape first (TIP-4). Actions never close it: the product
  sets `visible` to false from their handlers.
- **The surface (DLG-7 – DLG-10, DLG-16).** Centred in the safe drawing insets (the keyboard included) at least
  `containerMargin` from every edge; as wide as its content between `containerMinWidth` and `containerMaxWidth` and
  never wider than the window less the margins; `containerColor` at `containerElevation`, `containerShape` corners eased
  by corner smoothing, inset by `containerPadding`. The icon (`iconSize`, `iconColor`, the unselected glyph), the
  headline (`headlineTypescale` / `headlineColor`), the supporting text (`supportingTextTypescale` /
  `supportingTextColor`) and the content (given `contentColor` as its content color and `sys.typescale.body` as its text
  style, DLG-8) are `containerGap` apart, empty
  parts left out; with an icon, the icon and the headline are centred and the supporting text stays at the start. The
  actions are `actionsMarginBlockStart` below: one row at the end, `actionsGap` apart, or — when they do not fit — a
  column at the end in the same order; their variant, size and tokens are left alone. Right-to-left mirrors it.
- **Scrolling (DLG-11, DLG-12).** When it is taller than the window, the supporting text and the content scroll between
  the fixed headline and actions, with a `dividerWidth` line of `dividerColor` across the surface under the headline
  while they are not at their top and above the actions while more lies below. When the headline and the actions
  leave less than a line of it (large text on a short window), everything scrolls together.
- **Semantics (DLG-14).** The window is a dialog (Compose's `Dialog`) and the surface's `paneTitle` is the headline,
  which is also a heading, read before the supporting text. Compose has no alert-dialog role: an `alert` dialog has its
  headline and supporting text announced as it opens (`View.announceForAccessibility`). An empty headline is reported
  in debuggable apps.
- **Motion (DLG-13).** The scrim fades in and the surface fades in while growing about its centre from
  `motionEnterScale`, over `motionEnterDuration` / `motionEnterEasing`; both fade out over `motionExitDuration` /
  `motionExitEasing`. Android's reduced motion removes every animation: it appears and disappears at once.
- **The in-place form.** The baselines draw the scrim and the surface where they are composed, fully shown, in a
  480 × 640 stage: the test-only internal `TanreiDialogContent(headline, supportingText, icon, actions, content, …)`; a
  fixture's `slots` fill the icon (a glyph) and the actions (text-variant Tanrei Buttons), in the
  baselines and the gallery alike.
  The window itself is covered by the behaviour tests (Robolectric; `TanreiDialogTest`). The gallery opens each fixture
  from a button.

## App bar

`TanreiAppBar` (`specs/app-bar.spec.json`, APB-1…15) names the screen at its top edge and holds the way back and the
screen's most used actions, from `TanreiTheme.tokens.appBar` — Material's `TopAppBar` and `LargeTopAppBar` in one
composable. Its buttons are the product's own `TanreiIconButton`s (the item kinds `navigation` and `action`),
laid out and never restyled.

```kotlin
val scrollBehavior = TanreiAppBarDefaults.collapseScrollBehavior()
Column(Modifier.nestedScroll(scrollBehavior.nestedScrollConnection)) {
    TanreiAppBar(
        title = "Inbox",
        navigationIcon = { TanreiIconButton(onClick = openDrawer, contentDescription = "Menu") { TanreiText("menu") } },
        actions = {
            TanreiIconButton(onClick = search, contentDescription = "Search") { TanreiText("search") }
            TanreiIconButton(onClick = openAccount, contentDescription = "Account") { TanreiText("account_circle") }
        },
        size = TanreiAppBarSize.Large,
        scrollBehavior = scrollBehavior,
    )
    LazyColumn { /* the screen's content */ }
}
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `title`, `subtitle` | `title: String`, `subtitle: String = ""` |
| `size` | `size: TanreiAppBarSize` (`Small` default, `Large`; open) |
| `titleAlignment` | `titleAlignment: TanreiAppBarTitleAlignment` (`Start` default, `Center`) |
| `scrolled` | `scrollBehavior: TanreiAppBarScrollBehavior?` — `TanreiAppBarDefaults.pinnedScrollBehavior()` (small) or `.collapseScrollBehavior()` (large), connected with `Modifier.nestedScroll(scrollBehavior.nestedScrollConnection)`; its `state` (`TanreiAppBarState`: `contentOffset`, `collapsedOffset`, `collapseLimit`, `collapsedFraction`, `isScrolled`; `rememberTanreiAppBarState(initialCollapsedOffset, initialContentOffset)`) carries scrolled and the collapse |
| slots `navigation`, `actions`; item kinds `navigation`, `action` | `navigationIcon`, `actions: (@Composable () -> Unit)?` holding `TanreiIconButton`s (`label` is their `contentDescription`, `click` their `onClick`) |
| (insets, APB-10) | `windowInsets: WindowInsets = TanreiAppBarDefaults.windowInsets` — the status bars plus the horizontal display cutout |

- **The conditions (APB-1 – APB-3, APB-9).** Flat while nothing is under the bar, scrolled while content is: the
  container is `conditions[flat|scrolled].containerColor` at its `containerElevation`, with a bottom edge `outlineWidth`
  thick in its `outlineColor` (by default transparent flat, an `outline-variant` hairline scrolled). A change moves over
  `motionConditionDuration` / `motionConditionEasing`, at once where motion is reduced. The pinned behavior makes the bar
  scrolled while its view's content is away from its top; the collapse behavior only once the bar has fully collapsed.
  Without a behavior the bar is flat, and a large bar stays expanded; a product without a scrolling view may set the
  state's `contentOffset` itself, and a state created with an offset draws a bar that starts scrolled or collapsed (the
  baselines' `scrolled` fixtures).
- **The top row (APB-4 – APB-6, APB-15).** The bar spans the width it is given. Its top row is at least the small
  size's `containerHeight` and grows with its content: the navigation button `containerPaddingInline` from the start, the
  actions `containerPaddingInline` from the end and `actionsGap` apart (at their touch-target size), `containerGap`
  around the title block, everything centered vertically; without a navigation button the title starts at `titleInset`
  (and without actions it ends `titleInset` from the end). The title and subtitle are one line each in the small size's
  `titleTypescale` / `subtitleTypescale` and `titleColor` / `subtitleColor`, truncated with an ellipsis, even at 200 %
  text (the rows grow; the icon buttons do not). `Center` centers the block on the bar's full width and narrows it
  equally on both sides so it never runs under the buttons. Right-to-left mirrors the row.
- **Large (APB-7, APB-8).** A size whose `containerHeight` is greater than the small size's (large, and a size a layer
  clones from it) has a title row of its own under the top row: the title and subtitle in that size's styles, from
  `titleInset`, the block `containerPaddingBlockEnd` above the bottom edge; the bar is at least that `containerHeight`.
  With the collapse behavior the bar shrinks one for one with the scroll down to the top row (the view's content moves
  only once it has), the expanded block moving up with the bottom edge and clipped under the top row, and the top row's
  title fading in with the part of the expanded title that is covered; back at the content's top the bar expands the
  same way. A pinned large bar is drawn collapsed while scrolled. There is no snap after a fling.
- **Insets (APB-10).** The container's color reaches under `windowInsets`; the content is padded inside them.
- **Semantics (APB-11 – APB-13).** The bar has no role and takes no focus: Tab goes from the navigation button through
  the actions. The title is a heading and the subtitle is read after it; a large bar exposes one of its two titles —
  the expanded one while any of it is visible, the top row's once it is covered (the other is cleared from the tree).
  An empty title draws no title block and exposes no heading. More than three actions or more than one navigation
  button still render and are reported in debuggable apps, as is a size the system does not have (APB-14, drawn with
  small's tokens).

## Navigation bar

`TanreiNavigationBar` (`specs/navigation-bar.spec.json`, NVB-1…22) switches between a product's three to five
top-level destinations along the bottom edge of a compact screen, from `TanreiTheme.tokens.navigationBar` — Material's
`NavigationBar` and `NavigationBarItem`. Each destination is the spec's item kind `destination`, a
`TanreiNavigationBarItem` called in the bar's `RowScope` content lambda.

```kotlin
var screen by rememberSaveable { mutableStateOf("inbox") }
TanreiNavigationBar(contentDescription = "Main") {
    TanreiNavigationBarItem(selected = screen == "inbox", onClick = { screen = "inbox" }, icon = "inbox", label = "Inbox",
        badge = TanreiNavigationBadge(count = 3, contentDescription = "3 unread"))
    TanreiNavigationBarItem(selected = screen == "sent", onClick = { screen = "sent" }, icon = "send", label = "Sent")
    TanreiNavigationBarItem(selected = screen == "starred", onClick = { screen = "starred" }, icon = "star", label = "Starred")
}
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `value` (bar and destination) | the item's `selected: Boolean` — there is no bar-level value; the caller marks `selected = (current == value)` |
| `labelVisibility` | `labelVisibility: TanreiNavigationLabelVisibility` (`Always` default, `Selected`, `Never`) |
| `label` | `contentDescription: String` — the bar's name |
| `change`, `reselect` | the item's `onClick: () -> Unit` — one per destination; the caller tells a reselect by `selected` |
| item `destination` | `RowScope.TanreiNavigationBarItem(selected, onClick, icon, label, modifier, enabled, badge, interactionSource)` — `icon` is the glyph's NAME; `enabled` is the spec's `disabled`, inverted; `badge: TanreiNavigationBadge?` (`count`, `contentDescription` — the spec's `badgeCount` and `badgeLabel`) |
| (insets, NVB-18) | `windowInsets: WindowInsets = TanreiNavigationBarDefaults.windowInsets` — the navigation bars plus the horizontal display cutout |

- **Icons by name (NVB-14).** A destination's `icon` is the name of its glyph (a ligature of the icon font), drawn in a
  box of `itemIconSize` in the glyph of its selection through THE icon helper — the family and fill of the selection,
  `sys.icon.weight`, the optical size clamped — its fill moving with the selection. Tanrei bundles no icon font:
  install one through `TanreiTheme(fontFamilies = …)` (`TanreiFontFamilies.resolveIcon`); without one the platform font
  draws the NAME, clipped to the icon box. The library's baselines draw a stand-in glyph (test-only).
- **Selection (NVB-1, NVB-3, NVB-22).** The destination marked `selected` draws the selected parts
  (`conditions.selected[state]`: `itemContainerColor` — the active indicator —, `itemIconColor`, `itemLabelColor`),
  every other the unselected parts. When more than one is marked, the first is drawn selected and a debuggable app
  reports it. Activation — pointer, touch, Enter, Space — calls the item's `onClick` once, for a change and a reselect
  alike. Compose has no bar value, so a value naming no destination (NVB-3's report) has no counterpart: mark none
  selected to draw none.
- **Layout (NVB-6, NVB-11 – NVB-13, NVB-21).** The bar spans the width it is given, `containerColor` at
  `containerElevation` with an `outlineWidth` top edge in `outlineColor`, at least `containerHeight` above the insets
  and as tall as a destination with its label needs (enlarged text grows it; the item containers and icons keep their
  dp size). The width is divided into equal cells from the start edge (mirrored right-to-left); each cell is the whole
  hit area and answers on its item container (`itemContainerWidth` × `itemContainerHeight`, `itemContainerShape`
  corners eased by corner smoothing), the icon centered in it, the label `itemGap` below on one line in
  `itemLabelTypescale`, truncated, the group centered in the cell. `Selected` draws only the selected label, `Never`
  none (the item container is centered); a label that is not drawn is still the name.
- **States (NVB-4, NVB-5, NVB-7 – NVB-10, NVB-15).** A destination is `TanreiButton`'s chain on its item container: one
  state wins (pressed > keyboard-focused > hovered), drawn from its condition's tokens of that state and
  `opacity(state)` (on the whole destination), entering pressed at once and held for press-hold, the ripple clipped to
  the item container (from its center for a press beside it, on the label), dim and none as the system says, the focus
  ring around the item container on keyboard focus only. A new selection's indicator grows in width from the item
  container's center, at its full height, while the old one fades out, and the colors, the glyph's fill and — with `Selected` — the labels and the item
  containers' places move over `motionSelectionDuration` / `motionSelectionEasing`; at once where motion is reduced.
- **Badges (NVB-16).** A `TanreiNavigationBadge` draws a `TanreiBadge` on the icon — the badge component's dot, count,
  cap and tokens — also while the destination is disabled, and its description (`contentDescription`, or the displayed
  count) is the destination's `stateDescription`, read after its name and state.
- **Semantics (NVB-2, NVB-17, NVB-19, NVB-20).** The bar is the platform's tab bar: a selectable group named by
  `contentDescription` with `CollectionInfo(1, n)`; each destination is one `Role.Tab` element with its selected state
  and `CollectionItemInfo`, named by its label (drawn or not), its icon and label text hidden. Each enabled destination
  is a Tab stop of its own (no arrow keys: this is navigation, not a tab list); a disabled one takes no focus and is
  announced disabled. Fewer than three or more than five destinations and an empty label are reported in debuggable
  apps.

## Navigation rail

`TanreiNavigationRail` (`specs/navigation-rail.spec.json`, NVR-1…23) holds the navigation bar's destinations along the
start edge of a medium or expanded window, from `TanreiTheme.tokens.navigationRail` — Material's `NavigationRail` and
`NavigationRailItem`. Its destinations are the bar's (the same shared destination, drawn from the rail's own
tokens), each a `TanreiNavigationRailItem` in the rail's `ColumnScope` content lambda; the menu button and a FAB go
in `header`.

```kotlin
TanreiNavigationRail(
    header = { TanreiIconButton(onClick = openDrawer, contentDescription = "Menu") { TanreiText("menu") } },
    contentDescription = "Main",
) {
    TanreiNavigationRailItem(selected = screen == "inbox", onClick = { screen = "inbox" }, icon = "inbox", label = "Inbox")
    TanreiNavigationRailItem(selected = screen == "sent", onClick = { screen = "sent" }, icon = "send", label = "Sent")
}
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `value`, `labelVisibility`, `label`, `change`, `reselect` | as the navigation bar's: the item's `selected`, `labelVisibility: TanreiNavigationLabelVisibility`, `contentDescription`, the item's `onClick` |
| slot `header`; item kind `header-button` | `header: (@Composable ColumnScope.() -> Unit)?` holding `TanreiIconButton`s (and a FAB) |
| item `destination` | `ColumnScope.TanreiNavigationRailItem(selected, onClick, icon, label, modifier, enabled, badge, interactionSource)` — as the bar's item, with the same `TanreiNavigationBadge` |
| (insets, NVR-19) | `windowInsets: WindowInsets = TanreiNavigationRailDefaults.windowInsets` — the system bars and the display cutout, at the start, top and bottom |

- **The rail (NVR-11, NVR-12, NVR-18, NVR-19).** It spans the height it is given, `containerWidth` wide beside the start
  inset, `containerColor` at `containerElevation` with an `outlineWidth` end edge in `outlineColor` (the left edge
  right-to-left), reaching under its insets. The header's content is stacked and centered `containerPaddingBlock` below
  the top; the destinations follow `headerGap` below it (or `containerPaddingBlock` below the top without a header),
  centered, `containerGap` apart. When they do not fit, the destinations scroll and the header stays. Fewer than three
  or more than seven are reported in debuggable apps.
- **Destinations (NVR-1 – NVR-10, NVR-13 – NVR-17, NVR-20 – NVR-23).** Everything the navigation bar's destinations do,
  with these differences: a cell is the rail's full width and its destination's height with half of `containerGap`
  above and below, at least `sys.target.touch` high (NVR-6); a label takes up to two lines before it is truncated, and
  with `Selected` the destinations themselves move as labels come and go (NVR-13, NVR-16); enlarged text keeps the
  rail's width and grows each destination (NVR-22). The header's buttons come first in reading and focus order, with
  their own semantics (NVR-20).

## Navigation drawer

`TanreiNavigationDrawer` (`specs/navigation-drawer.spec.json`, NVD-1…29) is a panel of a product's destinations at the
start edge, from `TanreiTheme.tokens.navigationDrawer` — Material's `DismissibleNavigationDrawer` and
`ModalNavigationDrawer` in one composable that wraps the screen. Its destinations and sections are the spec's item
kinds: `TanreiNavigationDrawerItem` and `TanreiNavigationDrawerSection`.

```kotlin
val drawerState = rememberTanreiDrawerState()
TanreiNavigationDrawer(
    variant = if (wide) TanreiNavigationDrawerVariant.Standard else TanreiNavigationDrawerVariant.Modal,
    drawerState = drawerState,
    contentDescription = "Mail",
    drawerContent = {
        TanreiNavigationDrawerSection(heading = "Mail") {
            TanreiNavigationDrawerItem(selected = box == "inbox", onClick = { box = "inbox" }, label = "Inbox", icon = "inbox", badge = "24")
            TanreiNavigationDrawerItem(selected = box == "sent", onClick = { box = "sent" }, label = "Sent", icon = "send")
        }
        TanreiNavigationDrawerSection(heading = "Labels", divider = true) {
            TanreiNavigationDrawerItem(selected = box == "work", onClick = { box = "work" }, label = "Work", icon = "label")
        }
    },
) {
    Screen(onMenu = { drawerState.open() })
}
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `variant` | `variant: TanreiNavigationDrawerVariant` (`Standard` default, `Modal`; open — an added value behaves as standard) |
| `open`, `close` | `drawerState: TanreiDrawerState` (`rememberTanreiDrawerState(initialValue, confirmValueChange)`; `currentValue`, `isOpen`, `isClosed`, `open()`, `close()`; `TanreiDrawerValue` `Closed` / `Open`) — the drawer closes a modal drawer itself, and `confirmValueChange(Closed)` is the spec's `close` (answer false to refuse it) |
| `value` | the item's `selected: Boolean` — the caller marks it, as for the bar |
| `label` | `contentDescription: String` — the modal drawer's pane title |
| `change`, `reselect` | the item's `onClick` |
| slot `header` | `header: (@Composable ColumnScope.() -> Unit)?` |
| item `destination` | `TanreiNavigationDrawerItem(selected, onClick, label, modifier, icon, badge, enabled, interactionSource)` — `icon` a glyph NAME or null, `badge` short text |
| item `section` | `TanreiNavigationDrawerSection(modifier, heading, divider) { … }` |
| (insets, NVD-25) | `windowInsets: WindowInsets = TanreiNavigationDrawerDefaults.windowInsets` — the system bars and the display cutout at the start, top and bottom |

- **Standard (NVD-18, NVD-28).** A layout region beside the content: while open it takes its width and the
  content takes the rest; opening and closing slide it in and out while the content resizes, over
  `motionEnterDuration` / `motionEnterEasing` and `motionExitDuration` / `motionExitEasing` (at once where motion is
  reduced). While closed it is not composed: no width, not in the tree, not focusable. Opening moves focus to the
  selected destination, else its first focusable element; closing while focus is inside returns it to the element that
  had it (the content keeps it with `focusRestorer`), else where focus goes by default. Tab leaves it without closing
  it; no scrim, no close.
- **Modal (NVD-19 – NVD-22).** An operated overlay, presented as the dialog is — in a `Dialog`
  window over the whole window (not inside the app's window as Material's drawer layout is): Tanrei's
  `scrimColor` fades in over the window while the sheet slides in from the start edge; the window keeps focus inside it
  (Tab wraps), hides the window under it from assistive technology, and counts as a modal dialog (a snackbar host waits).
  Opening moves focus to the selected destination, else the first focusable element. A press on the scrim, Escape, the
  platform's back, a drag toward the start edge past half its width or a fling that way (the platform's minimum fling
  velocity), and activating a destination each close it through `confirmValueChange` once; closing slides it out and
  fades the scrim, and the window under it has its focus back.
- **The panel (NVD-10 – NVD-12, NVD-25, NVD-26).** `containerWidth` wide beside the start inset, the full height, its
  variant's `containerColor` at `containerElevation`, its end corners rounded by `containerShape` (eased by corner
  smoothing; start corners square), an `outlineWidth` end edge in `outlineColor`; mirrored right-to-left. The header and
  the items are `containerPaddingInline` / `containerPaddingBlock` inside it and scroll together. A variant the system
  does not have draws with standard's tokens and is reported.
- **Destinations (NVD-1 – NVD-9, NVD-13 – NVD-15, NVD-23, NVD-27, NVD-29).** A row across the inner width, at least
  `itemContainerHeight`, `itemContainerShape` corners, `itemPaddingInline` inside, icon (`itemIconSize`, the glyph of its
  selection, by NAME as the bar's), label (`itemLabelTypescale`, wrapping and growing the row) and badge text
  (`itemBadgeTypescale`) `itemGap` apart, drawn from `conditions[selected|unselected][state]` (container, icon, label,
  badge) and `opacity(state)`: `TanreiButton`'s chain on the row, as the bar's destinations. The hit area is the row with
  half of `containerGap` above and below — the touch target by default, and at least the touch target always
  (NVD-6). Each is one button with its selected state and `CollectionItemInfo`, named by its label; the badge is its
  state description, after the selected state ("Selected, 24"; the word is the library's `tanrei_selected` string,
  which an app translates). Enter and Space activate it; each enabled destination is a Tab stop. When more than one is
  marked selected, the first in reading order is drawn selected and it is reported.
- **Sections (NVD-16, NVD-17).** A `TanreiDivider` before the section when `divider`, a heading row at least
  `headingHeight` (`headingTypescale`, `headingColor`, starting with the destinations' content, a heading that is not
  focusable) when `heading` is not empty, then its destinations. A section inside a section draws its destinations in
  its place and is reported.
- **Baselines.** A standard fixture is the drawer open beside an empty content area; a modal one is drawn in place,
  fully shown (the test-only internal `TanreiModalDrawerInPlace`), in a 400 × 560 stage.

## Button group

`TanreiButtonGroup` (`specs/button-group.spec.json`, BGR-1…11) lays out a row of related Tanrei Buttons and icon
buttons (toggles included), spaced apart or joined into one shape, from `TanreiTheme.tokens.buttonGroup`. The items are
the spec's item kinds `button` and `icon-button`: a `TanreiButton` and a `TanreiIconButton` called in the content lambda,
exactly as anywhere else.

```kotlin
TanreiButtonGroup(variant = TanreiButtonGroupVariant.Connected, contentDescription = "Text style") {
    TanreiIconButton(onClick = {}, contentDescription = "Bold", variant = TanreiIconButtonVariant.Tonal, checked = bold, onCheckedChange = { bold = it }) { TanreiText("format_bold") }
    TanreiIconButton(onClick = {}, contentDescription = "Italic", variant = TanreiIconButtonVariant.Tonal, checked = italic, onCheckedChange = { italic = it }) { TanreiText("format_italic") }
}
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `variant` | `variant: TanreiButtonGroupVariant` (`Standard` default, `Connected`; closed — the two differ in structure, so no unknown value can be passed, BGR-9) |
| `label` | `contentDescription: String` — optional; the group's name |
| item `button` | `TanreiButton(…)` — `variant`, `size`, `enabled` (the spec's `disabled`, inverted), `onClick`; its label is its content |
| item `icon-button` | `TanreiIconButton(…)` — `variant`, `size`, `onCheckedChange` (non-null: the spec's `toggle`), `checked` (`selected`), `enabled`, `contentDescription` (`label`), `onClick`, `onCheckedChange` (`change`); its glyph is its content |

- **The internal channel (BGR-2, BGR-3; BTN-10, ICB-10).** The group reaches its items through `LocalTanreiJoinedRow`,
  an internal `CompositionLocal` that `TanreiButton` and `TanreiIconButton` read — not part of their public surface, and
  null outside a group, where they draw exactly as before. Through it the group's layout marks which corners face a
  neighbour (read by the item's shape in the draw phase, so the first frame is already joined, and a change redraws at
  once — BGR-11), gives connected items a minimum width, and limits how far each item's hit area reaches sideways. The
  item reports its VISIBLE size back when the group asks for its intrinsic size, since its own layout also holds the
  touch target.
- **Standard (BGR-1, BGR-4).** Items at their own sizes, `standardGap` apart between their visible bounds, centred on the
  row's middle. Where two hit areas would overlap (an icon button smaller than the target), each reaches at most to the
  middle of the gap: a press on an item's visible bounds is that item's, a press in the gap goes to the nearer one.
- **Connected (BGR-1, BGR-2, BGR-3).** Items `connectedGap` apart, every one stretched to the tallest VISIBLE height (so
  the joined shape stays even when a label wraps or text is enlarged) and at least `sys.target.touch` wide — an icon
  button widens its container around its centred icon (Compose cannot tell a fine pointer, so the touch target is used).
  Each corner that faces a neighbour takes `connectedInnerShape`, eased by corner smoothing; the outer corners stay the
  item's own; the fill, outline, state layer, ripple and focus ring follow the joined shape. Above and below the row the
  items' hit areas still reach the target (BTN-5, ICB-5).
- **Narrowing (BGR-7).** A row wider than its space narrows its Buttons in proportion to their widths, down to the width
  of their longest word — their labels wrap, as a Button's does — and keeps the icon buttons at their size. It never
  wraps or scrolls; a row that still does not fit overflows its end and is reported in debuggable apps.
- **The items stay themselves (BGR-5, BGR-6).** Each item keeps its tokens, states, events, semantics and Tab stop; the
  group takes no focus, handles no keys and keeps no selection (a toggle stays independent). With a
  `contentDescription` the group is a traversal group with that name (Compose has no group role); without one it adds
  nothing to the tree. Right-to-left orders the items from the right and mirrors which corners are inner (BGR-8).
- **What it holds (BGR-10).** Compose cannot inspect the content lambda before it runs, but the group's layout can: an
  item that is not a Tanrei Button or icon button (it carries no joined-item parent data) is laid out as it is, without
  corners or width from the group, and reported in debuggable apps, as is a group of fewer than two items.

## Split button

`TanreiSplitButton` (`specs/split-button.spec.json`, SPB-1…20) performs a main action with one press and offers related
actions in a menu that its joined trailing half opens, from `TanreiTheme.tokens.splitButton` (its own tokens,
whose default values are Button's). The content lambda is the menu's: the menu's own items, presented in a `TanreiMenu`.

```kotlin
var more by remember { mutableStateOf(false) }
TanreiSplitButton(
    text = "Save",
    onClick = { save() },
    menuContentDescription = "More save options",
    menuExpanded = more,
    onMenuExpandedChange = { more = it },
    onMenuDismissRequest = { more = false },
    icon = { TanreiText("save") },
) {
    TanreiMenuItem("Save as…", onClick = { saveAs() })
    TanreiMenuItem("Save a copy", onClick = { saveCopy() })
}
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `variant` | `variant: TanreiSplitButtonVariant` (`Filled` default, `Tonal`, `Elevated`, `Outlined`; open) |
| `size` | `size: TanreiSplitButtonSize` (`Small`, `Medium` default, `Large`; open) |
| `label` | `text: String` — the leading half's text and name |
| `menuLabel` | `menuContentDescription: String` — the trailing half's name |
| `open` | `menuExpanded: Boolean` — the caller keeps it |
| `disabled` | `enabled: Boolean` (inverse) |
| `click` | `onClick: () -> Unit` |
| `toggle` | `onMenuExpandedChange: (Boolean) -> Unit` — the open value asked for |
| `close` | `onMenuDismissRequest: (TanreiMenuCloseReason) -> Unit` — the menu's reason |
| slot `icon` | `icon: (@Composable () -> Unit)?` |
| slot `menu` | the trailing `menuContent` lambda |

Also `interactionSource` (the leading half) and `menuInteractionSource` (the trailing half).

- **Two buttons (SPB-1, SPB-2, SPB-17).** The leading half is `Role.Button` named by `text`: activating it calls
  `onClick` and nothing else. The trailing half is `Role.Button` named by `menuContentDescription`, with the `expand` /
  `collapse` semantics actions of a menu button (Compose has no has-popup property): activating it — pointer, touch,
  Enter, Space — calls `onMenuExpandedChange(!menuExpanded)`, and Down Arrow on it while closed calls it with true. Each
  half is its own Tab stop with its own hover, focus, press and focus ring (SPB-4, SPB-5); nothing wraps them in the tree.
  The icon and the chevron are hidden.
- **The menu (SPB-15, SPB-16, SPB-20).** While `menuExpanded` the content is presented as a Tanrei Menu anchored to the
  whole split button at `BottomEnd` (flipping and shifting as MNU-2 says); it moves focus to its first enabled item, and
  when it closes the trailing half — which kept its focus in its own window — has it again. The menu's requests reach
  `onMenuDismissRequest` with their reason; an action item's `onClick` comes first, then `Item`. A press on the trailing
  half while the menu is open is not a press outside: the split button hears it before the popup (which would otherwise
  consume it) and calls `onMenuExpandedChange(false)`, no close. A menu with no item is not presented (its surface is not
  drawn, then removed once its items have registered, which takes one frame) and a debuggable app reports it; the
  trailing half still toggles and shows its open form.
- **Disabled (SPB-3, SPB-7).** Both halves are announced disabled, leave the focus order and emit nothing; no menu is
  presented and the closed form is drawn, whatever `menuExpanded` says; both draw the variant's disabled tokens.
- **Layout and shape (SPB-6, SPB-12, SPB-13, SPB-14, SPB-19).** The leading half — the icon (in a box of `iconSize`, the
  label color and the unselected glyph) and the label, `containerGap` apart, padded by `leadingPaddingInlineStart` (or
  `…WithIcon`) and `leadingPaddingInlineEnd` — as wide as its content; the trailing half the chevron between
  `trailingPaddingInline`s; `containerInnerGap` apart; both at least `containerHeight` tall and as tall as each other (a
  label never truncates: given less width it wraps and both halves grow). The outer corners are the state's
  `containerShape`, the join's `containerInnerShape`; while open the trailing half's inner corners move to
  `containerInnerShapeOpen` and its chevron turns half a turn over `motionOpenDuration` / `motionOpenEasing` (at once where
  motion is reduced). Each half clips its fill, state layer and ripple to its own shape and draws its outline
  (`outlineWidth` of its size) inside its edge. Each half's hit area reaches the touch target above and below and outward,
  and toward the other half no further than the middle of the gap (`tanreiJoinedTarget`, the button group's). Right-to-left
  puts the trailing half on the left and mirrors the leading half; the chevron is not mirrored.
- **States (SPB-8 – SPB-11, SPB-18).** Each half is `TanreiButton`'s chain drawn from
  `tokens.splitButton.variants[variant][its own state]`: pressed feedback, ripple, press-hold, the focus ring around its
  own shape, its own elevation outside it, colors and elevation moving over `motionStateDuration` / `motionStateEasing`.
  The chevron is the icon font's `keyboard_arrow_down` when installed, else a vector (`TanreiDrawnGlyph`, as the chip's
  check). An unknown variant or size draws the default's tokens and is reported in debuggable apps.

## FAB menu

`TanreiFabMenu` (`specs/fab-menu.spec.json`, FBM-1…23) is a floating action button that opens a short column of related
actions above it, from `TanreiTheme.tokens.fabMenu` (its own tokens, whose values copy the FAB's). Each
action is the spec's item kind `item`, a `TanreiFabMenuItem` called in the content lambda. Place it as a FAB — through
`Scaffold`'s `floatingActionButton` slot or at the inline-end bottom corner of your layout: it positions nothing itself.
Material 3's `FloatingActionButtonMenu` is not used.

```kotlin
var create by remember { mutableStateOf(false) }
TanreiFabMenu(
    expanded = create,
    onExpandedChange = { create = it },
    onDismissRequest = { create = false },
    contentDescription = "Create",
    icon = { TanreiText("add") },
) {
    TanreiFabMenuItem("Document", onClick = { newDocument() }, icon = "description")
    TanreiFabMenuItem("Folder", onClick = { newFolder() }, icon = "create_new_folder")
}
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `variant` | `variant: TanreiFabMenuVariant` (`Filled` default, `Tonal`, `Surface`; open) |
| `size` | `size: TanreiFabMenuSize` (`Small`, `Medium` default, `Large` — the toggle's; open) |
| `open` | `expanded: Boolean` — the caller keeps it |
| `label` | `contentDescription: String` — the toggle's and the items' name |
| `disabled` | `enabled: Boolean` (inverse) |
| `toggle` | `onExpandedChange: (Boolean) -> Unit` — the open value asked for |
| `close` | `onDismissRequest: (TanreiMenuCloseReason) -> Unit` — the reason, as the menu's |
| slot `icon` | `icon: @Composable () -> Unit` — the toggle's glyph while closed |
| item `item` | `TanreiFabMenuItem(text, onClick, icon, modifier, interactionSource)` — `icon` is the NAME of the glyph (as a navigation destination's) |

Also `interactionSource` (the toggle).

- **The toggle (FBM-1, FBM-2, FBM-6, FBM-8 – FBM-11, FBM-21).** The FAB's chain with the FAB menu's tokens: a square of
  the size's `containerSize` with its `containerShape` corners, the slot's glyph at `iconSize` (the unselected glyph),
  its hover lift and elevation from its look and state. Activating it calls `onExpandedChange(!expanded)`; Down or Up
  Arrow on the closed toggle calls it with true (Up then moves focus to the last item). While open it takes the
  variant's OTHER look (the `open…` parts), rounds to `containerShapeOpen` (no rounder than a circle) and cross-fades
  its glyph to the icon set's close glyph (the icon font's when installed, else a vector), over `motionOpenDuration` /
  `motionOpenEasing` — back over `motionCloseDuration` / `motionCloseEasing`. It keeps its name; its `expand` /
  `collapse` semantics actions say whether it opens or closes the items (Compose has no has-popup property). Disabled:
  announced disabled, out of the focus order, emitting nothing, drawn closed from the closed parts' disabled tokens, no
  items whatever `expanded` says.
- **The items (FBM-5, FBM-13, FBM-18, FBM-22).** A column in a focusable `Popup` above the toggle: its bottom
  `listOffset` above the toggle's drawn top, its items `listGap` apart, the first on top, each as wide as its content
  and its end edge on the toggle's (right-to-left: its left edge). An item — the `item…` parts of the variant — is at
  least `itemHeight` and the touch target tall, its whole container its hit area, rounded by `itemShape`, the icon then
  the label (`itemLabelTypescale`, wrapping rather than truncating) `itemGap` apart between `itemPaddingInlineStart` and
  `…End`, casting its item elevation. Each answers its own hover, focus and press as the toggle does.
- **Keyboard and closing (FBM-13 – FBM-17).** Opening moves focus to the first item (the last after Up Arrow); Down and
  Up move among the items, wrapping, Home and End to the ends; no type-ahead. Escape → `Escape`, the platform's back →
  `Back`, Tab or Shift+Tab → `Tab` (focus then moves on from the toggle), focus leaving the items' window → `FocusOut`,
  a press outside → `Outside` (the popup consumes it, as the menu's does). A press on the toggle while open is heard
  before the popup and is the toggle's: `onExpandedChange(false)`, no close. Activating an item calls its `onClick`, then
  `onDismissRequest(Item)`. When the items close, the toggle — which kept its focus in its own window — has it again.
  Not modal: no scrim, nothing made inert.
- **Motion (FBM-19).** Opening fades and grows each item in from its end edge over the open motion, the item nearest the
  toggle first and each next `motionStagger` later; closing fades them all out together over the close motion, then
  removes the popup. Everything at once where motion is reduced.
- **Semantics (FBM-20).** Compose has no menu role: the items are buttons in a traversal group named by
  `contentDescription`, with `CollectionInfo(rowCount = n)` and each its `CollectionItemInfo(rowIndex = i)`; the glyphs
  are hidden. An empty label, an item without a label or icon, and fewer than two or more than six items are reported
  in debuggable apps (FBM-23). An unknown variant or size draws the default's tokens and is reported (FBM-7).
- **The in-place form.** The baselines draw an open FAB menu's items in place above the toggle, with their elevation and
  without open motion: the test-only internal `TanreiFabMenuInPlace(expanded, contentDescription, icon, modifier,
  variant, size, enabled) { … }`. The gallery shows each fixture closed; its toggle opens it.

## Segmented button

`TanreiSegmentedButton` (`specs/segmented-button.spec.json`, SEG-1…24) lets people choose one option, or several, from
two to five related options drawn as the joined segments of one control, from `TanreiTheme.tokens.segmentedButton`.
Material's `SingleChoiceSegmentedButtonRow` and `MultiChoiceSegmentedButtonRow` in one composable, selected by VALUE.
Each segment is the spec's item kind `segment`, a `TanreiSegment` called in the content lambda.

```kotlin
var range by rememberSaveable { mutableStateOf<String?>("week") }
TanreiSegmentedButton(
    onSelectionChange = { range = it.single() },
    contentDescription = "Range",
    selectedValue = range,
) {
    TanreiSegment(value = "day", label = "Day")
    TanreiSegment(value = "week", label = "Week")
    TanreiSegment(value = "month", label = "Month", enabled = false)
}

var days by rememberSaveable { mutableStateOf(setOf("mon")) }
TanreiSegmentedButton(
    onSelectionChange = { days = it },
    contentDescription = "Days",
    selectionMode = TanreiSegmentedButtonSelectionMode.Multiple,
    selectedValues = days,
) {
    TanreiSegment(value = "mon", label = "Mon")
    TanreiSegment(value = "tue", label = "Tue")
}
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `selection` | `selectionMode: TanreiSegmentedButtonSelectionMode` (`Single` default, `Multiple`; closed) |
| `value` | `selectedValue: String?` — single; null selects none; the caller keeps it |
| `values` | `selectedValues: Set<String>` — multiple; the caller keeps it |
| `size` | `size: TanreiSegmentedButtonSize` (`Small`, `Medium` default, `Large`; open) |
| `label` | `contentDescription: String` — required, the set's name |
| `change` | `onSelectionChange: (Set<String>) -> Unit` — the selection after the change: one value (single) or the new values (multiple), as `TanreiList`'s |
| item `segment` | `TanreiSegment(value, label, modifier, labelHidden, enabled, icon, interactionSource)` — `enabled` is the spec's `disabled`, inverted; `icon` is a slot |

- **Selection (SEG-1, SEG-2, SEG-12).** Single: activating a segment that is not selected calls `onSelectionChange`
  once with its value; the selected one calls nothing (a single choice is never cleared by its own segment). Multiple:
  activating a segment adds its value, or removes it; the values may become empty. A segment is selected while its
  value is the set's — the FIRST segment with that value. A value naming no segment, an empty value and a value given
  to two segments are reported in debuggable apps, as are an empty label, `labelHidden` without an icon (the label is
  drawn anyway), an empty `contentDescription` and a set of fewer than two or more than five segments (SEG-22). A
  disabled segment is not selected or cleared by the user and is announced disabled (SEG-3).
- **Keyboard (SEG-18, SEG-19).** One Tab stop: single — the selected segment, else the first enabled one; multiple —
  the segment focused last, else the first selected one, else the first enabled one. Right and Down Arrow move to the
  next enabled segment, Left and Up to the previous, wrapping; Home and End to the ends; Left and Right are mirrored
  right-to-left. With single selection each move also selects the segment it reaches (a radio group); with multiple
  it only moves, and Space or Enter switches. Disabled segments are skipped and take no focus. Built on
  `TanreiRovingFocus` in its horizontal form, with Up and Down (`crossAxisKeys`).
- **Semantics (SEG-20).** Compose has no radio group role: the set is a selectable group (`selectableGroup()`) named by
  `contentDescription`, with `CollectionInfo(rowCount = 1, columnCount = n)`; a single-choice segment is
  `selectable(role = Role.RadioButton)` with its selected state, a multiple-choice one `toggleable(role = Role.Button)`
  with its on / off state, as the filter chip is. Each is named by its label (merged from the drawn text, or as
  `contentDescription` while hidden), with `CollectionItemInfo(columnIndex = i)` and a `traversalIndex` in order. The
  icons, the check, the dividers and the outline are not in the tree: the set's only children there are its segments.
- **Layout (SEG-6, SEG-13, SEG-14, SEG-15, SEG-21).** Every segment is one width: the widest segment's content measured
  AS IF SELECTED (the check in place of the icon) plus `containerPaddingInline` on each side, and at least
  `sys.target.touch` — so selecting never moves a width. A wider layout (`fillMaxWidth`) is divided equally; a narrower
  one is divided equally too and the labels wrap (never truncate), every segment growing to the tallest with
  `containerPaddingBlock` above and below. The set is at least `containerHeight` tall, its segments inset by
  `setPadding` and `dividerWidth` apart. Each segment's hit area is as tall as the touch target and tiles the set's
  width — the outer padding and half of each divider included — so neighbours never overlap; the set reserves the
  target's height and draws itself centred in it, as `TanreiButton` does. Content is centred, the glyph first:
  right-to-left orders the segments from the right and puts the glyph to the right of the label.
- **Set, dividers, corners (SEG-7, SEG-11, SEG-13, SEG-17).** The set fills itself with `setColor` and draws its outline
  (`outlineWidth` of `outlineColor`, inside its edge) OVER the segments, so no selected fill covers it; a divider of
  `dividerWidth` in `dividerColor` runs between neighbours from the set's top padding to its bottom padding. Neither
  changes with a segment's state or condition, so a disabled segment keeps its boundary. The first and last segment's
  outer corners are `setShape` less `setPadding` (concentric); every other corner is the state's `containerShape`; all
  eased by `sys.shape.corner-smoothing` (`tanreiSideCornerShape`: start and end corners of their own).
- **States (SEG-4, SEG-5, SEG-9, SEG-10, SEG-23, SEG-24).** A segment is `TanreiButton`'s chain drawn from
  `tokens.segmentedButton.conditions[selected or unselected][state]` and `opacity(state)`: container, label, icon,
  check and elevation; a change of state moves over `motionStateDuration` / `motionStateEasing` (entering pressed
  snaps). The focus ring is drawn INSIDE the segment, inset clear of the set's outline. A selected segment casts its
  condition's elevation outside itself and is drawn over its neighbours; the set clips nothing.
- **The check (SEG-16).** A selected segment whose label is drawn shows the check before it — in place of its icon —
  at the size's `checkSize` in the condition's icon color, drawn as the filter chip draws it (`TanreiDrawnGlyph`); an
  icon-only segment keeps its icon (the selected glyph) and draws no check; a `checkSize` of 0 (cupertino) draws no
  check and reserves no room. The check comes and goes, the content re-centres and the colors and elevation change
  over `motionSelectionDuration` / `motionSelectionEasing`; everything at once where motion is reduced.

## Search

`TanreiSearch` (`specs/search.spec.json`, SRC-1…29) is a search bar that opens a view of suggestions and the product's own
content, docked under the bar or over the whole window, from `TanreiTheme.tokens.search` (and, for the selection
highlight, the text field's `selectionColor`). Its API is Material's `SearchBar` idiom with state hoisting: the caller keeps
`value` and `expanded` and moves them from `onValueChange` and `onExpandedChange`.

```kotlin
var query by remember { mutableStateOf("") }
var open by remember { mutableStateOf(false) }
TanreiSearch(
    value = query,
    onValueChange = { query = it },
    expanded = open,
    onExpandedChange = { expanded, _ -> open = expanded },
    label = "Search mail",
    placeholder = "Search mail",
    clearLabel = "Clear search",
    onSearch = { runSearch(it) },
    onSelect = { query = it },
) {
    TanreiSearchSuggestion(value = "invoices", headline = "invoices", leadingIcon = "history")
    TanreiSearchSuggestion(value = "folder:invoices", headline = "Invoices", supportingText = "Folder · 24 messages", leadingIcon = "folder")
}
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `presentation` | `presentation: TanreiSearchPresentation` (`Docked` default, `FullScreen`; closed — no unknown value can be passed, SRC-27) |
| `value` | `value: String` |
| `label` | `label: String` — required; never drawn, and the placeholder is never the name |
| `placeholder` | `placeholder: String` |
| `expanded` | `expanded: Boolean` — the caller's; set it from `onExpandedChange` |
| `disabled` | `enabled: Boolean = true` (inverse) |
| `clearLabel`, `backLabel` | `clearLabel: String`, `backLabel: String` |
| event `input` | `onValueChange: (String) -> Unit` |
| event `submit` | `onSearch: ((String) -> Unit)?` — carries the value |
| event `select` | `onSelect: ((String) -> Unit)?` — carries the suggestion's value; the search never changes `value` itself |
| event `toggle` | `onExpandedChange: (Boolean, TanreiSearchCloseReason?) -> Unit` — `true` and null to open; `false` and the reason (`Escape`, `Back`, `Select`, `Submit`, `Outside`, `Tab`, `FocusOut`) to close |
| slots `leading`, `trailing` | `leading`, `trailing: (@Composable () -> Unit)?` — the product's `TanreiIconButton`s |
| slot `default` | `content` — `TanreiSearchSuggestion`s first, then the product's own content |
| item `suggestion` | `TanreiSearchSuggestion(value, headline, modifier, supportingText, leadingIcon)` — `leadingIcon` is the NAME of a glyph (drawn from the icon font, as a navigation destination's `icon`) |
| — | `interactionSource` — the bar's hover and press (the input's focus is the bar's focused state) |

- **The bar (SRC-1…3, SRC-22, SRC-28).** As wide as its layout, at least `containerHeight` high (it grows to hold one
  line of the input at large text sizes), its hit area reaching `sys.target.touch` above and below. One row: the search
  glyph (or the leading slot's icon button, `containerPaddingInlineWithButton` from the start), the input taking the rest,
  the clear button while there is a value, and the trailing slot, `containerGap` apart; the icon buttons are placed by
  their VISIBLE bounds through the button group's internal channel, their hit areas reaching toward a neighbour no further
  than the middle of the gap. The glyph is decorative; the placeholder is drawn in its own color and hidden from assistive
  technology; the caret takes the caret color and selected text the text field's `selectionColor`.
- **Editing (SRC-4, SRC-12).** Compose's own `BasicTextField`, one line (it scrolls sideways), the typed text in its own
  direction, a general keyboard whose action key is Search. `onValueChange` hears every change the person makes and none
  the product makes. Escape in a closed search clears a value; with no value it passes on.
- **Opening and closing (SRC-5, SRC-6).** A press on the bar (anywhere but its buttons — watched before the input handles
  it, never consumed), typing, or Down Arrow asks to open (`onExpandedChange(true, null)`); focus alone never does. Escape
  or back, choosing, submitting, and — docked — a press outside the bar and the view, Tab or Shift+Tab (which then move on
  as they would have) or focus moving out of the search ask to close with that reason; the value stays. A request the
  caller has not answered is not asked again. The docked view is a popup that takes no touches it is not on: a press
  outside it also reaches whatever is under it, as the menu's does not.
- **The docked view (SRC-7, SRC-8, SRC-23).** A `Popup` that never takes focus — the input keeps it and typing goes on;
  a press on a suggestion does not take it either —, `viewOffset` below the bar (above it when there is more room there
  and not enough below, the on-screen keyboard counted, `viewViewportMargin` from the window's edge), as wide as the bar,
  its height limited to the room and its content scrolling; `viewContainerColor` at `viewContainerElevation`, rounded by
  `viewContainerShape`, clipped, inset by the view's padding. With no content it draws nothing and the search stays
  expanded. It fades in and grows from the edge facing the bar over the open motion, fades out over the close motion; at
  once where motion is reduced.
- **The full-screen view (SRC-9, SRC-11).** A `Dialog` window (`usePlatformDefaultWidth = false`, the window's own dim and
  animation off, as the dialog's), `viewContainerColor` to every edge; inside the safe area and above the keyboard a header
  at least `headerHeight` high — the back button (medium, `arrow_back` mirrored right-to-left, named by `backLabel`), the
  input with the same value, the clear button (medium) — a `dividerThickness` line under it, then the suggestions and the
  content, scrolling. It is modal: everything behind is hidden from assistive technology, focus moves to the header's input
  with the caret at the end, and the platform's back closes it (back). When it closes, focus returns to the bar's input,
  which does not open it again. The slots are not drawn in the header.
- **Suggestions (SRC-14…17, SRC-19, SRC-20).** Down Arrow makes the next suggestion active (the first while none is,
  staying on the last), Up Arrow the previous (none from the first); focus stays in the input, and typing, moving the caret
  or a change of the suggestions leaves none active; the active one is scrolled into view and Enter chooses it (else Enter
  submits). A row is at least `suggestionContainerHeight` and the touch target tall (Compose cannot tell a fine pointer:
  rows are 48 where the web's are 44), its icon column kept in every row while any row has an icon, the headline over the
  supporting text, both wrapping. Hovered, active (the focused tokens and the focus ring inside the row) and pressed draw
  their own tokens, pressed over active over hovered; a pointer over a row does not make it active.
- **The bar's states (SRC-18…21).** Pressed over focused over hovered; focus by ANY means selects the focused state (a
  field shows where typing will go): the focused edge, drawn inside the bar's edge, is its indicator — no ring around the
  bar, and under the glow focus style also the glow. Pressed feedback, corner smoothing and the state motion are the
  shared primitives'.
- **Semantics (SRC-24).** Compose has no search, combobox or listbox role: the input is a text field named by `label`;
  the suggestions are buttons in a column with collection semantics (each with its position), a button's name its
  headline and supporting text merged (Compose has no separate description); icons and the divider are hidden; the view
  carries `label` as its pane title; the clear and back buttons are named by `clearLabel` and `backLabel`.
- **The product's content (SRC-25, SRC-29).** The slots' icon buttons keep their own tokens, semantics and focus stops in
  reading order (leading, input, clear, trailing). The default slot's content after the suggestions is inset by the rows'
  padding and handed the headline color as its content color and `body` as its text style.
- **Disabled and reports (SRC-26, SRC-27).** Disabled: not focusable, editable or expandable, no clear button, nothing
  emitted, announced disabled, drawn from the disabled tokens (the fill kept). An empty label, clear or back label, an
  empty or repeated suggestion value, an empty headline and more than two trailing elements still render and are reported
  in debuggable apps.

## Slider

`TanreiSlider` (`specs/slider.spec.json`, SLD-1…23) chooses a value, or a range of two, along a track, from
`TanreiTheme.tokens.slider`. Its API is foundation's `Slider` / `RangeSlider` idiom: the caller moves `value` from
`onValueChange`; the range is the overload whose `value` is a `ClosedFloatingPointRange<Float>`.

```kotlin
var volume by remember { mutableFloatStateOf(40f) }
TanreiSlider(value = volume, onValueChange = { volume = it }, contentDescription = "Volume")

var price by remember { mutableStateOf(20f..60f) }
TanreiSlider(value = price, onValueChange = { price = it }, contentDescription = "Maximum price", startContentDescription = "Minimum price", step = 5f, showStops = true)
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `value`, `startValue`, `range` | `value: Float`, or the overload with `value: ClosedFloatingPointRange<Float>` (start to end) |
| `min`, `max` | `valueRange: ClosedFloatingPointRange<Float> = 0f..100f` |
| `step` | `step: Float = 0f` — a SIZE (the spec's), not Material's count of `steps` |
| `origin` | `origin: Float? = null` (single slider only) |
| `stops` | `showStops: Boolean` |
| `size` | `size: TanreiSliderSize` — a key of `tokens.slider.sizes` (`Small` default, `Medium`, `Large`); open: one the system does not have draws small's tokens and is reported (SLD-23) |
| `orientation` | `orientation: Orientation` — foundation's, as the divider's (closed) |
| `valueIndicator` | `valueIndicator: TanreiSliderValueIndicator` (`None` default, `Active`, `Always`; closed) |
| `disabled` | `enabled: Boolean = true` (inverse) |
| `label`, `startLabel` | `contentDescription: String` (the end handle's in a range), `startContentDescription: String` — required; never drawn |
| `valueText`, `startValueText` | `stateDescription: String`, `startStateDescription: String` |
| event `input` | `onValueChange` — every value the person moves a handle to |
| event `change` | `onValueChangeFinished: ((Float) -> Unit)?` (the range's takes the range) — it CARRIES the value, as the spec's `change` does, where foundation's takes none |
| — | `interactionSource` (the range's: `startInteractionSource` and `interactionSource`) |

- **Values (SLD-1, SLD-22).** What is drawn and exposed is clamped to the range and snapped to `step` (the highest
  value is the last whole step at or below max); a start above the end draws both handles at the end; a range without an
  end above its start draws the handles at the track's start and takes no input; a negative step is continuous. Each is
  reported in debuggable apps; setting a value never emits (SLD-16).
- **The pointer (SLD-2).** The whole slider is the hit area (at least `sys.target.touch` across). A press moves the
  nearer handle — where a range's handles meet, the one that can move toward the press — to the value under it and a
  drag follows at once; `onValueChange` hears each new value and `onValueChangeFinished` once when the press ends with
  another value than it began with. On touch the handle moves once the press has travelled along the track by the touch
  slop, or when a press that did not move ends; a press that first travels ACROSS the track is left to an enclosing
  scroll and changes nothing. A mouse moves the handle at once. The pressed state shows on the next frame and is held for
  `pressHold`; the ripple grows from the handle's centre (SLD-13, SLD-14).
- **Keys and assistive technology (SLD-3, SLD-4).** The arrows move one keyboard step (`step`, or a hundredth of the
  range), Page Up and Down ten, Home and End to the ends (Right and Left swapped in a right-to-left horizontal slider,
  never in a vertical one); each change emits input, then change. Each handle has Compose's slider semantics:
  `progressBarRangeInfo` (its value and the values IT can reach — a range's handle is bounded by the other) and
  `setProgress`, whose target is clamped and snapped. Android's increment and decrement move by the range over
  `steps + 1`, so the handle reports the `steps` that make that one keyboard step (99 for a continuous slider).
- **A range (SLD-5).** Two handles that meet but never cross, each its own Tab stop (the start first) and its own slider
  node, named by `startContentDescription` and `contentDescription`.
- **Drawing (SLD-6…10, SLD-15).** The track is inset half the container from each end; the handle's centre travels half
  the track's thickness in from the track's ends. The active track runs from the origin (the range's start when null) to
  the value on either side, or between a range's handles; at a travel end it takes the track's rounded end with it, and
  where it meets the track away from a handle the join is square. Under each handle nothing of the tracks is drawn — the
  handle's own shape is left out of them, so a translucent disabled handle shows no track through it — and a `trackGap`
  above 0 also cuts them that far from the handle's edge, their ends there rounded. Stop dots: at a travel end on the
  track, and at every step with `showStops`, in the color of the part they lie on, none under a handle or its gap. The
  round state layer (`containerSize`) moves with its handle, behind it; every corner is eased by corner smoothing.
- **States (SLD-11, SLD-12, SLD-20).** Each handle has its own hover, focus and press: a fine pointer hovers the handle a
  press there would move; keyboard focus draws the focused tokens and the focus ring (ring or glow) around the handle,
  never animated; focus by touch draws neither. The handle and its state layer draw from their handle's state, the
  tracks, dots and opacity from the highest state of any handle; colors move over the state motion. Disabled: no input,
  no focus, no value indicator, announced disabled, drawn from the disabled tokens.
- **Motion (SLD-16).** A value set by a key, assistive technology, a tap or the product moves the handle and the active
  track over `motionValueDuration` / `motionValueEasing`; a dragged handle follows the press without delay. Where motion
  is reduced (the animator duration scale), everything changes at once.
- **Value indicator (SLD-17, SLD-18).** Above a horizontal handle, at the inline start of a vertical one,
  `valueIndicatorOffset` beyond its edge, kept inside the window along the axis: a read overlay in a `Popup` that takes
  no focus and no input, not clipped by the slider, cleared from assistive technology (the handle's `stateDescription`
  is what is read), fading over the state motion. Its text is `stateDescription`, else the value in the current locale
  with as many fraction digits as the keyboard step has (at most two). A `Popup` escapes every clip, so it is presented
  only while it belongs in view: not while the handle is scrolled or clipped out of view, nor while the edge the bubble
  grows from lies outside the window (the web's scroll container clips the bubble with its handle); back in view it is
  there at once, without the fade. A handle partly in view still shows the whole bubble.
- **Semantics (SLD-19).** Each handle is a slider named by its label, with its value text; the tracks, dots, state layer
  and value indicator are not in the tree. Compose's semantics have no orientation for a slider, so the orientation is
  not exposed (Android's range semantics carry none). An empty label still renders and is reported in debuggable apps.
- **Vertical and right-to-left (SLD-21).** Vertical runs from the bottom (min) to the top and is as tall as its layout;
  right-to-left mirrors a horizontal slider (track, dots, arrows), never a vertical one.

## Toolbar

`TanreiToolbar` (`specs/toolbar.spec.json`, TBR-1…14) holds a short row of actions for the current screen or selection,
docked across the bottom edge or floating over the content, from `TanreiTheme.tokens.toolbar`. The items are the spec's
item kinds `action` and `button`: the product's own `TanreiIconButton`s and `TanreiButton`s, called in the content lambda
exactly as anywhere else, laid out by the toolbar and never restyled (TBR-9).

```kotlin
TanreiToolbar(contentDescription = "Formatting", variant = TanreiToolbarVariant.Floating) {
    TanreiIconButton(onClick = {}, contentDescription = "Bold", checked = bold, onCheckedChange = { bold = it }) { TanreiText("format_bold") }
    TanreiIconButton(onClick = {}, contentDescription = "Italic", checked = italic, onCheckedChange = { italic = it }) { TanreiText("format_italic") }
    TanreiIconButton(onClick = { insertLink() }, contentDescription = "Insert link") { TanreiText("link") }
}
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `variant` | `variant: TanreiToolbarVariant` — a key of `tokens.toolbar.variants` (`Docked` default, `Floating`); open: a value a design system added lays out as docked, one it does not have draws docked's tokens and is reported (TBR-13) |
| `orientation` | `orientation: Orientation` — foundation's, as the divider's (`Horizontal` default, `Vertical`; closed — no unknown value can be passed, TBR-13) |
| `label` | `contentDescription: String` — required; never drawn |
| — | `windowInsets: WindowInsets` — `TanreiToolbarDefaults.windowInsets(variant)`: `WindowInsets.navigationBars` for docked, none for floating (TBR-3, TBR-5) |
| item `action` | `TanreiIconButton(…)` — `contentDescription` (`label`), `variant`, `onCheckedChange` (non-null: the spec's `toggle`; its `change`), `checked` (`selected`), `enabled` (`disabled`, inverted), `onClick` (`click`); its glyph is its content |
| item `button` | `TanreiButton(…)` — `variant`, `enabled` (`disabled`, inverted), `onClick` (`click`); its label is its content |

- **Docked (TBR-1…3).** The full width it is given, at least `containerSize` high above `windowInsets` (whose bottom and
  sides its color reaches under — the navigation bars by default; its items stay inside them), flat, square, with a
  hairline top edge in `outlineColor` drawn over the items. The items are spread: the first `containerPaddingInline` from
  the start, the last as far from the end, the rest of the width shared equally between neighbours and never less than
  `containerGap`; one item is centred.
- **Floating (TBR-4, TBR-5).** As long as its items need — `containerPaddingInline` at each end, exactly `containerGap`
  between neighbours — and at least `containerSize` across: a pill (corners eased by corner smoothing) filled with its
  color, raised by its elevation (level3, the FAB's) and with an edge around its whole shape. It does not position
  itself, draws no scrim and reaches under no inset: place it as you place a FAB (centred above the bottom of the
  content, or beside its end edge when vertical).
- **Vertical (TBR-6).** A floating toolbar can stand upright: items top to bottom, the paddings and gap along the vertical
  axis, `containerSize` wide. A docked toolbar is always horizontal; `Vertical` there lays out as `Horizontal` and is
  reported in debuggable apps. Right-to-left mirrors a horizontal row and keeps a vertical one's order (TBR-7).
- **Visible bounds, own targets.** The items are placed by their VISIBLE bounds (a medium icon button's 36, not its 48
  target), through the same internal channel a button group uses (`LocalTanreiJoinedRow`, as an unconnected row). Each
  item keeps its own touch target; toward a neighbour its hit area reaches at most to the middle of the space between
  them, toward an end at most across the padding (a floating toolbar's 6 is exactly a medium item's reach).
- **Too many items (TBR-8).** Every item keeps its size and the gap its minimum; the row scrolls along its axis, and an
  item that receives keyboard focus is brought into view by its own focus. A debuggable app hears that the extra actions
  belong in an overflow menu — the product's `TanreiMenu` on a "More" icon button. Nothing wraps, shrinks or hides.
  A parent with no limit along the axis (a vertical toolbar in a `Row` of a `verticalScroll` page, a horizontal one in a
  `horizontalScroll` row) has room for every item: the toolbar is as long as its items, nothing scrolls, nothing is
  reported — and it does not throw, as a bare scroll container measured with an infinite length would.
- **One Tab stop (TBR-10).** The toolbar is the WAI-ARIA toolbar: Tab enters at the item focused last, else the first
  enabled one, and leaves; Right and Left Arrow (horizontal; mirrored right-to-left) or Down and Up Arrow (vertical) move
  to the next and previous enabled item, wrapping, Home and End to the ends; moving activates nothing, Enter and Space
  act as the focused item does, and a disabled item takes no focus. It is `TanreiRovingFocus`, the primitive the list,
  the menu and the tabs use; `TanreiButton` and `TanreiIconButton` join it through an internal `CompositionLocal`
  (`LocalTanreiRovingGroup`), not their public surface — outside a toolbar they are their own Tab stops, as always. A
  button composed into another window from inside the toolbar's content (a dialog's, a menu's) is not one of its items.
- **Semantics (TBR-11).** Compose has no toolbar role: the toolbar is a traversal group (`isTraversalGroup`) named by
  `contentDescription`, holding its items in order; each item keeps its own name, role and state (a toggle stays a
  toggle), and the toolbar adds nothing to them.
- **Reports (TBR-12).** An empty `contentDescription`, a toolbar with no item, and content that is not a Tanrei icon
  button or Button (it does not join the Tab stop — a field or a slider would take the arrow keys) still render and lay
  out, and are reported in debuggable apps.
- **Enlarged text (TBR-14).** `containerSize` is a minimum across the axis: a Button's enlarged label grows the toolbar;
  icon buttons keep their size.

## Bottom sheet

`TanreiBottomSheet` (`specs/bottom-sheet.spec.json`, BSH-1…26) shows supplementary content or a short task in a surface
that rises from the bottom edge, from `TanreiTheme.tokens.bottomSheet`. `modal` (the default) is a modal overlay in a
`Dialog` window of its own over Tanrei's scrim; `standard` is a layout region the product places
in a `Box` over the content it covers.

```kotlin
var open by remember { mutableStateOf(false) }
var detent by remember { mutableStateOf(TanreiBottomSheetDetent.Partial) }
TanreiButton(text = "Share", onClick = { open = true })
TanreiBottomSheet(
    visible = open,
    onClose = { open = false },
    detent = detent,
    onDetentChange = { detent = it },
    handleLabel = "Resize sheet",
    contentDescription = "Share photo",
) {
    Column { /* the sheet's content */ }
}
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `open` | `visible: Boolean` — a parameter, so the exit motion runs before the sheet goes |
| `close` | `onClose: (TanreiSheetCloseReason) -> Unit` — `Drag`, `Scrim`, `Escape`, `Back` (and a side sheet's `Close`); the product sets `visible` to false |
| `variant` | `variant: TanreiBottomSheetVariant` (`Standard`, `Modal`; closed — not a token axis) |
| `detent`, `detentChange` | `detent: TanreiBottomSheetDetent` (`Partial`, `Full`), `onDetentChange: (TanreiBottomSheetDetent) -> Unit` |
| `dismissible`, `handle`, `handleLabel`, `inset` | `dismissible: Boolean = true`, `handle: Boolean = true`, `handleLabel: String`, `inset: Boolean = true` |
| `label` | `contentDescription: String` — the modal sheet's pane title, the standard sheet's region name |
| (initial focus, BSH-3) | `initialFocus: FocusRequester?` |
| slot default | `content: @Composable () -> Unit` |

- **Modal (BSH-1, BSH-2, BSH-5, BSH-23).** Presented as the dialog is, in a `Dialog` window with its own dim and
  animation off: `scrimColor` fades in over the whole window while the sheet slides up from below over
  `motionEnterDuration` / `motionEnterEasing`, and both leave over `motionExitDuration` / `motionExitEasing` from
  wherever the sheet is. The window keeps focus inside (Tab wraps), hides the window under it from assistive
  technology and counts as a modal dialog (a snackbar host waits). While `dismissible`, a press on the scrim, Escape
  (consumed, key down and up) and the platform's back each call `onClose` once with their reason; the sheet never closes
  itself. A dialog opened from it stacks above it and takes Escape alone.
- **Standard (BSH-4).** Fills its parent and draws the sheet at the parent's bottom edge; the part
  above takes no presses, draws no scrim, and Escape and back are ignored. Focus is not kept: Tab leaves it and it stays
  open. A sheet mounted with `visible` true is in place at once and moves no focus.
- **Focus (BSH-3).** Opening moves focus to `initialFocus` or, without one, to the container (a focus stop only until
  something inside it has had focus), on the first frame. A modal sheet mounted with `visible` true does the same, as if
  it had just opened: its window makes everything behind it unfocusable. Closing a modal sheet hands focus back through
  its window. A standard sheet lives in the product's own window beside content it does not wrap, and Compose has no
  public way to ask which node has focus: it reads the focused node from the window's semantics tree when it opens
  (every `AndroidComposeView` is a `RootForTest`, as the radio group reads its options) and, when it closes while focus
  is inside it, asks that node to take focus again — or clears focus where the node is gone.
- **Heights (BSH-6, BSH-21, BSH-24).** As tall as the handle's row and the content, up to `containerPartialFraction` of
  the area (partial) or the area less `containerMarginBlockStart` (full); the area is the window below its top inset (a
  modal sheet) or the parent (a standard one), ending at the keyboard's top edge. Only content taller than the partial
  height gives two heights. Setting `detent` moves the sheet over the enter motion without `onDetentChange`; a height
  the person chose stays until `detent` changes again.
- **The container (BSH-7, BSH-8, BSH-18, BSH-26).** As wide as the area up to `containerMaxWidth`, centred;
  `containerColor` at `containerElevation`, top corners `containerShape` eased by corner smoothing, bottom corners
  square; its color reaches under the bottom system inset and its content stays above it. The content is inset by
  `containerPadding` (unless `inset` is false: then it reaches the edges below the handle's row) and handed
  `contentColor` as its content color and `sys.typescale.body` as its text style.
- **Scrolling (BSH-10).** The sheet scrolls its content itself (a `verticalScroll` below the handle's row): give it a
  plain column, not a lazy list, which cannot be measured inside a scrolling parent. Assistive technology and keyboard
  focus scroll it at either height.
- **Dragging (BSH-9, BSH-10, BSH-20).** The sheet hears its drags first, on the handle's row, the padding and the
  content, past `ViewConfiguration`'s touch slop, and follows the finger by its position in the window — the content's
  own scroll would measure a finger's move against content that moves with the sheet, and fall behind it. Up, a drag
  raises the sheet to its full height and then scrolls the content; down, it scrolls the content back to its top and
  then lowers the sheet. Released, the sheet settles at the next height in the direction of a fling (faster than
  `ViewConfiguration`'s minimum fling velocity) or the nearest one, over the enter motion; below half its lowest height,
  or flung down from it, it calls `onClose(Drag)` while `dismissible`, holds for a frame, and then leaves from there — or
  settles back at its lowest height if `visible` is still true. Content a drag went on to scroll up flings on release.
- **The drag handle (BSH-11 – BSH-19).** A row of `handleMarginBlock`, a `handleContainerWidth` ×
  `handleContainerHeight` box (`handleContainerShape`) and the grip centred in it (`handleGripWidth` ×
  `handleGripHeight`, with round ends), drawn from `controls[drag-handle][state]` (box, grip) and `opacity(state)` —
  `TanreiButton`'s chain on the box: state motion, press-hold, pressed feedback and ripple (from the box's center for a
  press on the hit area outside it), keyboard focus ring. While the sheet has two heights it is one button named by
  `handleLabel`, with the platform's expand / collapse (expanded at full height); a press, Enter or Space moves the sheet
  to its other height and calls `onDetentChange` once. At one height it is drawn at rest and not exposed. Its hit area is
  its row across the box and at least `sys.target.touch` wide and high — below a short row it lies over the content's
  top (cupertino's 16 row). An interactive handle without a name, and a sheet without `contentDescription`, are
  reported in debuggable apps.
- **The in-place form.** The baselines draw the sheet (and a modal sheet's scrim) where it is composed, fully shown,
  in a 400 × 720 stage over the surface: the test-only internal `TanreiBottomSheetContent`. The window itself is covered
  by the behaviour tests (`TanreiBottomSheetTest`). The gallery opens each fixture from a button in a stage.

## Side sheet

`TanreiSideSheet` (`specs/side-sheet.spec.json`, SSH-1…15) is a panel at the end edge with a headline, an optional close
button and optional actions, from `TanreiTheme.tokens.sideSheet`. `standard` is a layout region the product
places at the end of a `Row`; `modal` is a modal overlay in a `Dialog` window over Tanrei's scrim.

```kotlin
var filters by remember { mutableStateOf(false) }
Row(Modifier.fillMaxSize()) {
    Results(Modifier.weight(1f), onFilters = { filters = true })
    TanreiSideSheet(
        visible = filters,
        onClose = { filters = false },
        headline = "Filters",
        variant = if (wide) TanreiSideSheetVariant.Standard else TanreiSideSheetVariant.Modal,
        closable = true,
        closeLabel = "Close filters",
        actions = {
            TanreiButton(text = "Apply", onClick = { apply(); filters = false }, variant = TanreiButtonVariant.Text)
            TanreiButton(text = "Reset", onClick = { reset() }, variant = TanreiButtonVariant.Text)
        },
    ) {
        FilterForm()
    }
}
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `open` | `visible: Boolean` — a parameter, so the motion runs before the sheet goes |
| `close` | `onClose: (TanreiSheetCloseReason) -> Unit` — `Close`, `Scrim`, `Escape`, `Back`, `Drag`; the product sets `visible` to false |
| `variant` | `variant: TanreiSideSheetVariant` (`Standard` default, `Modal`; open — an added value behaves as standard) |
| `headline` | `headline: String` — its name and a heading |
| `closable`, `closeLabel` | `closable: Boolean = false`, `closeLabel: String` |
| (initial focus, SSH-3) | `initialFocus: FocusRequester?` |
| slots `actions`, default | `actions: (@Composable RowScope.() -> Unit)?`, `content: @Composable () -> Unit` |

- **Standard (SSH-1).** At the end of the product's row it takes `containerWidth` while open and none while
  closed (then it is not composed: not in the tree, not focusable). Opening and closing slide it in and out at the end
  edge while the content beside it resizes, over `motionEnterDuration` / `motionEnterEasing` and `motionExitDuration` /
  `motionExitEasing` (at once where motion is reduced). No scrim; Tab leaves it and it stays open; Escape, back and
  drags do nothing.
- **Modal (SSH-2, SSH-4, SSH-6, SSH-15).** Presented as the dialog is, in a `Dialog` window with its own dim and
  animation off: `scrimColor` fades in over the window while the panel slides in from the end edge. The window keeps
  focus inside (Tab wraps), hides the window under it from assistive technology and counts as a modal dialog. A press on
  the scrim, Escape (consumed), the platform's back, and a drag toward the end edge — followed past `ViewConfiguration`'s
  touch slop — past half the panel or flung that way (faster than its minimum fling velocity) each call `onClose` once
  with their reason. A released drag that asked to close holds for a frame, then leaves from there if `visible` became
  false, or slides back over the enter motion; so does a shorter drag. A dialog opened from it stacks above it and takes
  Escape alone.
- **Focus (SSH-3).** Opening moves focus to `initialFocus` or, without one, to the panel (a stop only until something
  inside it has had focus), on the first frame. A standard sheet mounted open moves none; a modal one mounted open moves
  focus in as if it had just opened, since its window makes everything behind it unfocusable. Closing a modal sheet
  hands focus back through its window; a standard sheet reads the focused node from the window's semantics tree when it
  opens and hands focus back to it when it closes, as the standard bottom sheet does.
- **The panel (SSH-7, SSH-13).** `containerWidth` wide beside the end inset — a modal one never wider than the window less
  `sys.target.touch` —, the full height, its variant's `containerColor` at `containerElevation`, its start corners
  `containerShape` eased by corner smoothing and its end corners square, edged at its start by `outlineWidth` of
  `outlineColor`; mirrored right-to-left. A variant the system does not have draws with standard's tokens and is
  reported.
- **Header, content, actions (SSH-5, SSH-8 – SSH-11, SSH-14).** The header is a row at least `headerHeight` high: the
  headline (`headlineTypescale`, `headlineColor`, wrapping and growing the row, a heading) from `containerPaddingInline`,
  and, while `closable`, a standard medium `TanreiIconButton` with the close glyph (the icon font's `close` when
  installed, else the drawn cross the snackbar's close uses), `headerGap` after the headline and ending
  `headerPaddingInlineEnd` before the end edge — placed, not restyled: it reads the icon button's own tokens and answers
  hover, focus and press as it does. Without a header the content starts `containerPaddingBlock` below the top edge. The
  content is inset by `containerPaddingInline`, handed `contentColor` and `sys.typescale.body`, and scrolls between the
  header and the actions. With actions, a `dividerWidth` line of `dividerColor` crosses the sheet (hidden from
  assistive technology) and the buttons follow in a row from the start, `actionsGap` apart with `actionsPaddingBlock`
  above and below — stacked in a column at the start when they do not fit; else `containerPaddingBlock` closes the
  sheet. The actions are called in a `RowScope` for the call site's sake; the sheet lays them out, so `weight` and the
  alignments do nothing. The panel reaches under the system bars and the display cutout at its end, top and bottom and
  keeps what it holds inside them.
- **Semantics (SSH-12).** A modal sheet is a dialog (the window) whose pane title is the headline; a standard one a
  traversal group named by the headline. An empty headline, and a close button without `closeLabel`, are reported in
  debuggable apps.
- **The in-place form.** The baselines draw the sheet where it is composed, fully shown, in a 720 × 480 stage over the
  surface — a standard sheet at the end of a row whose other child fills the rest, a modal one with its scrim: the
  test-only internal `TanreiSideSheetContent`. A fixture's `actions` slot is text Buttons.

## Carousel

`TanreiCarousel` (`specs/carousel.spec.json`, CRL-1…25) is a row of visual items that scrolls sideways, from
`TanreiTheme.tokens.carousel`, in three layouts. Its items are the spec's item kind: `TanreiCarouselItem`, called from
the carousel's item lambda, as Material's carousels take one.

```kotlin
TanreiCarousel(itemCount = walks.size, contentDescription = "Walks near you") { index ->
    val walk = walks[index]
    TanreiCarouselItem(label = walk.name, onClick = { open(walk) }) {
        Image(walk.photo, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
    }
}
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `layout` | `layout: TanreiCarouselLayout` (`MultiBrowse` default, `Hero`, `Uncontained`; closed — not a token axis) |
| `itemWidth` | `itemWidth: Dp? = null` — null takes `containerLargeWidth` |
| `label` | `contentDescription: String` — names the list |
| items | `itemCount: Int` and `content: @Composable (index: Int) -> Unit` |
| item `item` | `TanreiCarouselItem(label, onClick, modifier, interactionSource, content)` — `label` its name, `onClick` its `click` |

- **The row (CRL-8, CRL-19, CRL-25).** As wide as its parent and `layoutHeight` tall unless the modifier sizes it (never
  below the touch target); its items `layoutGap` apart inside `layoutPaddingInline`, scrolling under the padding to its
  clipped edges. It holds no text of its own: enlarged text changes nothing. Compose has no list role: the row gives `collectionInfo` (one row of `itemCount`) and is named by
  `contentDescription`; each item is one `Role.Button` named by its label with `collectionItemInfo`, its content hidden.
  Items out of view stay laid out beyond the edges, so every item is exposed in order; the row's horizontal scroll range,
  `scrollBy` and `scrollToIndex` let assistive technology bring any of them into place.
- **The layouts (CRL-9 – CRL-13, CRL-21).** The spec's closed formula, in unrounded pixels (the internal
  `TanreiCarouselGeometry`): multi-browse lays out as many large slots as fit, then a medium and a small one (the small
  one between `containerSmallMinWidth` and `containerSmallMaxWidth`); hero one large slot and one small one of
  `containerSmallMaxWidth`, ignoring `itemWidth`; uncontained every item `itemWidth` (at most W) wide. Below three small
  slots and two gaps there is one slot, W wide. The scroll position is a number of items — one per large slot and gap
  scrolled — and each item's width and start are interpolated between the two slots around it, so items grow toward the
  start and shrink leaving it; an item beyond the slots rests past an edge. A change of width or of the items keeps the
  item at slot 0 in place, at once.
- **Scrolling (CRL-14, CRL-23).** `Modifier.scrollable`: touch, pen, trackpad and wheel, mirrored right to left.
  Multi-browse and hero settle at a whole position — the next one in the direction of a fling faster than
  `ViewConfiguration`'s minimum fling velocity, else the nearest one — over `motionScrollDuration` /
  `motionScrollEasing`; a wheel, which does not fling, settles at the nearest once it stops. Uncontained scrolls freely,
  and not at all while its items fit.
- **Items (CRL-1 – CRL-7, CRL-15, CRL-16, CRL-22).** `TanreiButton`'s chain with `parts[item][state]` (content color,
  state-layer color), `containerShape(state)` and `opacity(state)`: state motion, press-hold, pressed feedback and ripple
  (from the item's center for a press in the gap beside it), and the keyboard focus ring drawn inside the container, which
  the row would otherwise clip. The container under the content is the resting fill only; hover, focus and press are a
  state layer drawn OVER the content — the state's `stateLayerColor` at `sys.state`'s hover, focus or pressed state-layer
  opacity — with the ripple in that same layer, so they show on an opaque image (CRL-16). A press that becomes a scroll clicks nothing. The hit area is the item and half the gap on
  each side (a small item's is the touch target), never below `sys.target.touch`. The content is laid out at the layout's
  large width and the carousel's height, centred on the item and clipped to its corners — a narrow item shows its middle
  — and is handed the item's content color.
- **Keyboard (CRL-17, CRL-18).** One Tab stop: the item that had focus last, else the one at slot 0. Right and Left
  Arrow move to the next and previous item without wrapping (mirrored right to left), Home and End to the first and the
  last; a focused item comes to slot 0 (as near as the range allows) over the scroll motion, or — uncontained — wholly
  into view, scrolling as little as that needs. Enter and Space activate it.
- **Reports (CRL-20, CRL-24).** An item without a label, a carousel without `contentDescription`, and an `itemWidth` that
  is not positive (then treated as null) are reported in debuggable apps. An item's content must hold no interactive
  element: Compose cannot inspect it, so this rule is stated here and not checked.
- **Baselines.** Each fixture fills a 400 × 200 stage, scrolled to its start; an item's content is its glyph NAME, drawn
  by the stand-in at `sys.icon.large` through the icon helper.

## Date picker

`TanreiDatePicker` (`specs/date-picker.spec.json`, DTP-1…40) lets a person choose one date, or one range of dates,
from a month calendar or by typing it, from `TanreiTheme.tokens.datePicker`. Two presentations of one picker:
`Modal` is a dialog in a `Dialog` window of its own over a scrim, with a header, text entry and Cancel and OK — the
choice stays pending until OK; `Docked` is a focusable `Popup` below the product's anchor — call it inside the anchor's
`Box`, as `TanreiMenu` — and choosing a day commits it. Both are operated overlays. The caller keeps the value
(hoisting) and closes the picker from `onClose`.

```kotlin
var due by remember { mutableStateOf<TanreiDate?>(null) }
var open by remember { mutableStateOf(false) }
Box {
    TanreiTextField(value = due?.toString() ?: "", onValueChange = {}, label = "Due date", readOnly = true, trailingIcon = {
        TanreiIconButton(onClick = { open = true }, contentDescription = "Choose a date") { TanreiText("calendar_month") }
    })
    TanreiDatePicker(
        visible = open,
        onClose = { open = false },
        presentation = TanreiDatePickerPresentation.Docked,
        value = due,
        onChange = { due = it.value },
        min = TanreiDate(2026, 1, 1),
        isDateDisabled = { it.month == 12 && it.day == 25 }, // closed on Christmas Day
    )
}
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `open` | `visible: Boolean` — the caller opens it and closes it |
| `close` | `onClose: (TanreiDatePickerCloseReason) -> Unit` — `Escape`, `Back`, `Outside`, `Tab`, `FocusOut`, `Cancel`, `Confirm`, `Select`; the picker only asks, the caller sets `visible = false` (DTP-5) |
| `change` | `onChange: (TanreiDateSelection) -> Unit` — `value` in single mode, `start` and `end` in range mode; called before `onClose` |
| `presentation`, `mode`, `firstDayOfWeek`, `entryMode`, `startView` | the closed enums `TanreiDatePickerPresentation` (`Modal`, `Docked`), `TanreiDatePickerMode` (`Single`, `Range`), `TanreiDatePickerFirstDayOfWeek` (`Locale`, `Sunday` … `Saturday`), `TanreiDatePickerEntryMode` (`Calendar`, `Text`), `TanreiDatePickerStartView` (`Day`, `Year`) — no undefined value can be passed (DTP-40) |
| `value`, `start`, `end`, `min`, `max`, `today` | `TanreiDate?` (null: none; `today` null reads the device's date when it opens) |
| `disabledDates` | `disabledDates: Set<TanreiDate>`, and the predicate `isDateDisabled: ((TanreiDate) -> Boolean)?` |
| `locale` | `locale: java.util.Locale?` — null takes `LocalConfiguration`'s first locale |
| `label` … `unavailableText` (14 words) | the fields of `labels: TanreiDatePickerLabels`, named as the spec's props, with its English defaults |
| item `day`, item `year` | generated by the picker: the internal `TanreiDatePickerDay(date, disabled, …)` and `TanreiDatePickerYear(year, …)` |

- **Dates (DTP-37).** `TanreiDate(year, month, day)` is Tanrei's own value class — a Gregorian calendar date with no
  time and no time zone (`java.time.LocalDate` needs API 26; Material's UTC milliseconds bring a time zone in). It is
  ordered, prints and parses its ISO form (`toString()`, `TanreiDate.parse("2026-09-17")`), answers null for a date that
  does not exist (`TanreiDate.of`) — its constructor throws — and converts with `toLocalDate()` on API 26 and above. An
  invalid ISO string therefore cannot reach the picker; `min` after `max` (both ignored), `end` before `start`, `value`
  in range mode and `start` or `end` in single mode are ignored and reported in debuggable apps, as is an empty `label`.
- **Locale (DTP-13, DTP-37).** Month and weekday names, digits, the header's and the accessible names' date forms, the
  numeric date's order and separator and the first day of the week come from `android.icu` (API 24 and above), always
  of the Gregorian calendar in UTC (a th-TH picker shows 2026, not 2569); API 23 uses `java.text` and the platform's best
  pattern for each skeleton. `firstDayOfWeek` overrides the locale's first day.
- **The modal presentation (DTP-1, DTP-22, DTP-38).** The sheets' `Dialog` window (the window's own dim and animation off;
  the window under it hidden from assistive technology and counted as a modal dialog): `modalScrimColor` over it — a press
  on it asks to close (`Outside`) — and the surface centred in the safe area, `modalContainerMargin` from every edge and
  from the keyboard, in `modalContainerColor` at `modalContainerElevation` with `modalContainerShape` corners eased by
  corner smoothing. The window keeps focus in: Tab wraps. It fades in growing from `modalMotionEnterScale` over the open
  motion and fades out over the close motion; at once where motion is reduced (Android removes every animation). When it
  does not fit the window, the header and the actions stay and the calendar or the fields scroll between them; when they
  alone leave less than a cell, everything scrolls together. On a narrow window the margins give way first (the surface,
  centred, reaches past them), then `containerPaddingInline` (the calendar's sides and the actions' end), and below seven
  targets with no padding left the cells narrow equally to share the safe area's width, in whole pixels — their height
  and their numbers stay, and the surface never passes the window (a 320-wide phone).
- **The docked presentation (DTP-2, DTP-22, DTP-38).** The menu's placement: `dockedOffset` below the anchor's `Box`, start edges
  aligned (right to left: the right edges), flipped above when below lacks room and above has more, shifted to stay
  `dockedViewportMargin` inside the window, its height limited to the room left (it scrolls), following the anchor.
  DTP-38: it narrows as the modal one does, within the width its popup is given (the window); wider than the window less
  its margins, it is centred in the window. `dockedContainerColor` at `dockedContainerElevation` with `dockedContainerShape`. No scrim, no focus trap, nothing made
  inert. It fades in and grows from the edge that faces the anchor, and fades out; at once where motion is reduced.
- **Focus (DTP-3, DTP-4).** Opening moves focus — on its first frame, not when its motion ends — to the active day, to
  the displayed year in the year view, or to the first field in text entry. The opener keeps its focus in its own window
  meanwhile, so it has focus again when the picker closes. Closing a docked picker with Tab moves focus on from the anchor.
- **Closing (DTP-5).** Escape → `Escape`; the platform's back → `Back`; a press on the scrim or outside a docked picker →
  `Outside` — Compose's `Popup` CONSUMES that press, so it does not reach what is under it; a press on the anchor itself is
  taken too and closes nothing; Tab from the grid (or Shift+Tab from the view toggle) of a docked picker → `Tab`; the
  popup's window losing focus → `FocusOut`; Cancel → `Cancel`; OK → `Confirm`; a docked picker's completed choice →
  `Select`. Only `Confirm` and `Select` commit.
- **Choosing (DTP-6 – DTP-9, DTP-26).** A modal picker's pending choice starts as the value it opened with; a value set
  while it is open changes nothing; OK emits `onChange` once when the pending choice differs, then `Confirm`, and is
  disabled while the choice is incomplete or a field holds text that is not an available date. A docked picker commits
  a date, or a range's end (its start emits nothing). In range mode a day before the start, or after a complete range,
  starts again; a start and end on one day are a one-day range; unavailable days inside a range stay in it.
- **The grid (DTP-10 – DTP-13, DTP-17, DTP-18).** The navigation row, then seven weekday names (narrow, each named by its
  full name, no focus) and six rows of seven cells of `max(cellSize, sys.target.touch)` (Compose cannot tell a fine
  pointer) — the cells are the days' hit areas; a month needing fewer rows keeps six. Inset by `containerPaddingInline`
  and `containerPaddingBlock`. A day is `TanreiButton`'s chain drawn from `conditions[condition][state]` and
  `opacity(state)`: its number in `dayLabelTypescale` on a `dayContainerSize` square with `dayContainerShape` corners and
  an `outlineWidth` outline, by precedence selected > in-range > today > unselected; an in-range day's container is the
  cell's whole width (the band, square ends), and a range's start and end draw the half cell toward each other in the
  band's resting color. The grid is one Tab stop, the active day; the arrows (mirrored right to left), Home, End, Page Up
  and Down (with Shift, a year) move it, showing another month as needed, never past `min` or `max`; Enter and Space choose.
- **Unavailable days (DTP-29, DTP-30).** Before `min`, after `max`, in `disabledDates` or named by `isDateDisabled`: drawn
  from their condition's disabled tokens, announced disabled, reached by the arrow keys, never chosen. A value naming one
  still draws selected, from the selected disabled tokens.
- **Navigation, view toggle and year view (DTP-14 – DTP-16, DTP-19 – DTP-21).** Previous and next are standard medium
  `TanreiIconButton`s (chevron_left and chevron_right, swapped right to left), disabled at `min`'s and `max`'s months and
  hidden in the year view; paging keeps focus on the button, keeps the day number (the last day of a shorter month) and
  announces the new month and year once (the view's announcement). The view toggle — month and year and an expand_more
  glyph that turns half a turn in the year view over the state motion — is drawn from the unselected condition, at least
  `viewToggleContainerHeight` tall, its hit area the touch target. The year list (min's year to max's, 1900 to 2100 for an
  empty side) is rows of three in the grid's space, opening with the displayed year third in view; one Tab stop, the arrows,
  Home and End move among years; a chosen year shows the same month in it (clamped), focuses its active day and announces
  it. A month change slides the grid (not the weekday row) over `motionPageDuration` / `motionPageEasing`; the day and year
  views cross-fade over the same; at once where motion is reduced.
- **Header, actions and text entry (DTP-23 – DTP-28).** The header: `label`, then the pending choice in the locale's
  form ("Thu, Sep 17"; "Sep 10 – Sep 16"; the year added when it is not today's year), a part not chosen yet in
  `headerPlaceholderColor` (the dash too, until both ends are chosen); it wraps and grows with text. The entry-mode toggle
  is a standard medium icon button (keyboard / calendar_month). A divider of `dividerWidth` in `dividerColor`. Cancel and OK
  are text-variant medium `TanreiButton`s at the end. Text entry is outlined medium `TanreiTextField`s (one, or two
  side by side `inputGap` apart) whose placeholder is the locale's pattern ("mm/dd/yyyy"); typed text is read in the
  locale's order (any separators, the locale's digits, leading zeros optional) and never reformatted; a committed field
  that is not an available date shows `invalidText` or `unavailableText`; the action key moves to the next field, and in
  the last activates OK. A docked picker has the calendar only (and reports `entryMode = Text`).
- **States (DTP-31 – DTP-35).** Pressed over keyboard-focused over hovered, from the condition's tokens, over
  `motionStateDuration` / `motionStateEasing` (entering pressed snaps; the press held for press-hold); the system's
  pressed feedback (overlay, ripple within the square or the band, dim, none); the focus ring around the square — an
  in-range day's too — for keyboard focus only, never animated; corners eased by corner smoothing; ring or glow as the
  system's focus style says.
- **Semantics (DTP-36).** The surface's pane title is `label` (a modal one is in a window of its own). Compose has no grid
  role: the day view is a traversal group named by its month and year with `CollectionInfo` (7 × 7, the weekday row
  first); each day is a `Role.Button` named by its full date ("Thursday, September 17, 2026", then `todayLabel` for
  today — Compose has no current-date property), with `selected` (the date, and every day of a range),
  `stateDescription` `startLabel` / `endLabel` for a range's ends, `disabled` while unavailable, and its
  `CollectionItemInfo`; empty cells are hidden. The view toggle is a button named by its month and year, described
  (`stateDescription`) by `yearViewLabel`, with the expand / collapse action of its state. A year is a button with its
  selected state and `todayLabel` after the current year. Compose cannot mark the product's anchor as opening a dialog:
  an anchor that wants it sets its own semantics.
- **Right to left (DTP-39).** Everything mirrors: the first weekday at the right, the view toggle at the right and the
  navigation at the left, the header, the fields and the actions; the arrows move in the direction they point.
- **The in-place form (DTP-1's `verify`).** The baselines draw the open picker where it is composed, without a window, a
  popup, motion or a focus move: the test-only internal `TanreiDatePickerContent(modifier, props, onClose, onChange,
  maxHeight)` — a modal one fills its 480 × 640 stage with the scrim and centres the surface, a docked one is its surface
  at its natural size on a 400 × 440 stage. The gallery opens each fixture from a button.

## Time picker

`TanreiTimePicker` (`specs/time-picker.spec.json`, TMP-1…29) lets a person choose a time of day, in hours and minutes,
on a clock dial or by typing it, in a dialog, from `TanreiTheme.tokens.timePicker`. It is a modal overlay in a `Dialog`
window of its own over a scrim (the modal date picker's window); the time stays pending until OK. The caller keeps the
value (hoisting) and closes the picker from `onClose`.

```kotlin
var alarm by remember { mutableStateOf<TanreiTime?>(TanreiTime(7, 30)) }
var open by remember { mutableStateOf(false) }
TanreiButton(text = alarm?.toString() ?: "Set alarm", onClick = { open = true })
TanreiTimePicker(
    visible = open,
    onClose = { open = false },
    value = alarm,
    onChange = { alarm = it },
    labels = TanreiTimePickerLabels(label = "Wake up at"),
)
```

| Spec (`platforms.compose`) | Compose |
|---|---|
| `open` | `visible: Boolean` — the caller opens it and closes it |
| `close` | `onClose: (TanreiTimePickerCloseReason) -> Unit` — `Escape`, `Back`, `Outside`, `Cancel`, `Confirm`; the picker only asks, the caller sets `visible = false` (TMP-4) |
| `change` | `onChange: (TanreiTime) -> Unit` — OK committed a time that differs from `value` (or `value` was null); called before `onClose` |
| `value` | `TanreiTime?` — null: none; the picker then starts from the device's current time |
| `hourCycle`, `entryMode`, `unit`, `layout` | the closed enums `TanreiTimePickerHourCycle` (`Locale`, `H12`, `H23`), `TanreiTimePickerEntryMode` (`Dial`, `Text`), `TanreiTimePickerUnit` (`Hour`, `Minute`), `TanreiTimePickerLayout` (`Auto`, `Vertical`, `Horizontal`) — no undefined value can be passed (TMP-29) |
| `locale` | `locale: java.util.Locale?` — null takes `LocalConfiguration`'s first locale |
| `label` … `invalidText` (8 words) | the fields of `labels: TanreiTimePickerLabels`, named as the spec's props, with its English defaults |

- **Times (TMP-5, TMP-29).** `TanreiTime(hour, minute)` is Tanrei's own value class — a time of day with no date, no
  seconds and no time zone (`java.time.LocalTime` needs API 26). It is ordered, prints and parses the 24-hour "HH:MM"
  (`toString()`, `TanreiTime.parse("19:30")`), answers null for a time that does not exist (`TanreiTime.of`) — its
  constructor throws — and converts with `toLocalTime()` on API 26 and above. An invalid string therefore cannot reach
  the picker; an empty `labels.label` is reported in debuggable apps, and the picker still opens.
- **The clock (TMP-6).** `H12` runs 1 to 12 with a period, `H23` 00 to 23. `Locale` takes the person's own 12/24-hour
  choice for the device when they made one (`Settings.System.TIME_12_24`), then — for the platform's current locale —
  `DateFormat.is24HourFormat`, and otherwise the locale's preferred clock (its best pattern for the skeleton `j`; a
  locale that counts 0 to 11 is 12-hour, 1 to 24 is 24-hour).
- **Locale (TMP-9, TMP-10, TMP-27).** The periods' names (`android.icu` `DateFormatSymbols`, `java.text` on API 23), the
  digits, the separator (the literal between the hour and the minute of the best `Hm` pattern), how many digits an hour
  has ("7" with h12 and "07" with h23 in en-US) and where the period goes (the best `hm` pattern: after the minutes for
  "h:mm a", before the hour for "aK:mm", never a list of locales) come from the locale's own patterns.
- **The presentation (TMP-1, TMP-3, TMP-25).** The sheets' `Dialog` window (the window's own dim and animation off; the
  window under it hidden from assistive technology and counted as a modal dialog): `scrimColor` over it — a press on it
  asks to close (`Outside`) — and the surface centred in the safe area, `containerMargin` from every edge and from the
  keyboard, in `containerColor` at `containerElevation` with `containerShape` corners eased by corner smoothing. The
  window keeps focus in: Tab wraps. It fades in growing about its centre from `motionEnterScale` over the open motion
  and fades out over the close motion; at once where motion is reduced (Android removes every animation). While it
  fades out its window takes no focus and no touch, so focus is back on the opener when it closes, not when its motion
  ends.
- **Focus (TMP-2, TMP-3).** Opening moves focus to the selector of `unit` (or the hour field in text entry) once its
  layout is decided — within a frame or two, not when its motion ends; closing leaves it on the element that opened it.
- **Closing and committing (TMP-4, TMP-5).** Escape → `Escape`; the platform's back → `Back`; the scrim → `Outside`;
  Cancel → `Cancel`; OK → `onChange` once when the pending time differs from `value` as it is at OK (or `value` is
  null), then `Confirm`. A value set while the picker is open does not change the pending time, but OK compares with it:
  the time the person saw is committed. OK is disabled while a field holds text that is not a number of its unit.
- **Layout (TMP-7, TMP-8).** Vertical: the label, the time display and the dial, centred, `containerGap` apart, the
  actions `actionsMarginBlockStart` below, everything `containerPadding` in. Horizontal: the label, the time and (at the
  bottom) the actions at the start, the dial at the end, centred vertically. `Auto` measures the parts as they are laid
  out and takes horizontal only when the window's height is too short for vertical and its width holds horizontal; text
  entry is vertical in every layout. When the picker does not fit, the label and the actions stay and the middle
  scrolls; when they alone leave no room for a selector, everything scrolls together. The horizontal layout, where
  nothing lies between the label and the actions, scrolls the whole surface as one.
  The selectors, the period segments and the dial's numbers grow with enlarged text.
- **The time display (TMP-9 – TMP-11, TMP-16, TMP-28).** The hour selector, the separator and the minute selector,
  `selectorGap` apart and always left to right (right to left too). A selector is `TanreiButton`'s chain drawn from
  `conditions[condition][state]` and `opacity(state)`: at least `selectorContainerWidth` × `selectorContainerHeight`
  (and the touch target) with `selectorContainerShape` corners, its value in `selectorLabelTypescale`, selected while the
  dial shows its unit (an edge of the condition's `selectorOutlineWidth` and color). The period selector sits where the
  locale writes the period, `periodMarginInlineStart` away in the layout direction: two segments as tall as the
  selectors, before noon first, each at least `periodContainerWidth` and the target wide, a `periodOutlineWidth` border
  in `periodOutlineColor` around both and between them, the outer corners `periodContainerShape`. A segment keeps the
  hour's number; the arrows choose the other and move focus to it; the chosen one is the group's one Tab stop.
- **The keys (TMP-16).** On a selector: Up and Right one later, Down and Left one earlier, wrapping without touching the
  other unit or the period; Page Up and Down five minutes; Home and End the first and last value. Focusing or pressing a
  selector shows its unit on the dial.
- **The dial (TMP-12 – TMP-15).** A `Canvas` of `dialContainerSize` in `dialContainerColor`: twelve numbers clockwise from
  the top in `dialLabelTypescale` and `dialLabelColor` (12, 1 … 11; 00 … 11 outside and 12 … 23 on an inner ring a handle
  further in; 00, 05 … 55), the track (`dialTrackWidth`, `dialTrackColor`) and the centre dot (`dialCenterSize`) under
  them, the handle (`dialHandleSize`, `dialHandleColor`) over the pending value with the part of a number under it in
  `dialSelectedLabelColor`, and a dot of that color in the handle for a minute between two numbers. A press or a drag
  sets the value nearest the pointer's angle (on the 24-hour hour dial, on the nearer ring) at once; letting go of the
  hour shows the minutes and moves focus from the hour selector to the minute selector. A key, an action or a field
  moves the handle along the shorter arc, and a change of unit cross-fades the numbers, over `motionDialDuration` /
  `motionDialEasing`; at once where motion is reduced. It never mirrors, and assistive technology never sees it.
- **Text entry (TMP-23).** Two outlined large `TanreiTextField`s of the number type with a `maxLength` of 2, labelled
  `hourLabel` and `minuteLabel`, `selectorContainerWidth` wide, the separator between them in the fields' input style;
  the period beside them, drawn as tall as a field's container (aligned with it through the internal
  `TanreiTextFieldContainerTop` alignment line) and reaching the touch target's height with a hit area above and below.
  A whole number of the unit (ASCII or the locale's digits) becomes the pending hour or minute; a committed field that is
  not one shows `invalidText` until its next edit. The action key moves from the hour field to the minute field and there
  activates OK.
- **Actions (TMP-24).** The entry-mode toggle — a standard medium `TanreiIconButton` showing `keyboard` (named
  `textEntryLabel`) or `schedule` (named `dialEntryLabel`) — at the start; Cancel and OK, text-variant medium
  `TanreiButton`s, at the end, `actionsGap` apart. The toggle keeps the pending time and moves focus to the hour field or
  selector.
- **States (TMP-17 – TMP-22).** Pressed over keyboard-focused over hovered, from the condition's tokens, over
  `motionStateDuration` / `motionStateEasing` (entering pressed snaps; the press held for press-hold); the system's
  pressed feedback (overlay, ripple within the selector or segment, dim, none); the focus ring around a selector and
  inside a segment (clear of the border) for keyboard focus only, never animated; corners eased by corner smoothing; ring
  or glow as the system's focus style says. Compose cannot tell a fine pointer, so the targets are `sys.target.touch`.
- **Semantics (TMP-26).** The surface's pane title is `label` (in a window of its own). Each selector is named by
  `hourLabel` or `minuteLabel`, its `stateDescription` the value as drawn with the period in a 12-hour clock ("7 AM",
  "午前 7"), with `progressBarRangeInfo` and a `setProgress` action whose steps past the ends wrap (the increment and
  decrement of assistive technology). The segments are `Role.RadioButton`s in a selectable group, named by the periods'
  names and selected for the pending one. The dial is `clearAndSetSemantics {}`.
- **The in-place form (TMP-1's `verify`).** The baselines draw the open picker where it is composed, without a window,
  motion or a focus move: the test-only internal `TanreiTimePickerContent(modifier, props, onClose, onChange)`, filling
  its 480 × 640 stage (720 × 480 for `horizontal`) with the scrim and centring the surface. The gallery opens each
  fixture from a button.

## Public API

The library is compiled in Kotlin's explicit-API mode. Public is what the spec's `platforms.compose` block names
and what this README documents; everything else is `internal`.

| Package | Public |
|---|---|
| `components` | `TanreiButton` (slot and `text` overloads): `onClick`, `modifier`, `variant`, `size`, `enabled`, `icon`, `interactionSource`, `content` |
| `components` | `TanreiIconButton`: `onClick`, `contentDescription`, `modifier`, `variant`, `size`, `checked`, `onCheckedChange`, `enabled`, `interactionSource`, `icon` |
| `components` | `TanreiDivider`: `modifier`, `orientation`, `inset`, `decorative`; `TanreiDividerInset` (`None`, `Start`, `Both`) |
| `components` | `TanreiBadge`: `count`, `modifier`, `max`, `contentDescription`, `anchor` |
| `components` | `TanreiProgressIndicator` (determinate: `progress`, `contentDescription`, `modifier`, `variant`, `size`, `valueRange`, `stateDescription`; indeterminate: `contentDescription`, `modifier`, `variant`, `size`); `TanreiProgressIndicatorVariant` (`Linear`, `Circular`) |
| `components` | `TanreiLoadingIndicator`, `TanreiContainedLoadingIndicator`: `contentDescription`, `modifier`, `size` |
| `components` | `TanreiCheckbox` (boolean: `checked`, `onCheckedChange`, `label`, `modifier`, `enabled`, `isError`, `labelHidden`, `interactionSource`; tri-state: `state`, `onClick`, and the same) |
| `components` | `TanreiRadioButton`: `selected`, `onClick`, `label`, `modifier`, `enabled`, `labelHidden`, `interactionSource` |
| `components` | `TanreiSwitch`: `checked`, `onCheckedChange`, `label`, `modifier`, `enabled`, `labelHidden`, `thumbContent`, `interactionSource` |
| `components` | `TanreiCard` (plain: `modifier`, `variant`, `inset`, `contentDescription`, `content`; interactive: `onClick`, `modifier`, `variant`, `enabled`, `inset`, `contentDescription`, `interactionSource`, `content`) |
| `components` | `TanreiChip` (action: `onClick`, `label`, `modifier`, `variant`, `size`, `enabled`, `icon`, `interactionSource`; filter: `selected`, `onSelectedChange`, `label`, `modifier`, `variant`, `size`, `enabled`, `onClick`, `icon`, `interactionSource`; input: `onClick`, `onRemove`, `label`, `removeContentDescription`, `modifier`, `variant`, `size`, `enabled`, `icon`, `avatar`, `interactionSource`, `removeInteractionSource`) |
| `components` | `TanreiList`: `modifier`, `selectionMode`, `contentDescription`, `selectedValue`, `selectedValues`, `onSelectionChange`, `content`; `TanreiListItem`: `headline`, `modifier`, `value`, `overline`, `supportingText`, `supportingMaxLines`, `trailingText`, `leadingMedia`, `enabled`, `divider`, `onClick`, `leadingIcon`, `trailingIcon`, `leadingContent`, `trailingContent`, `interactionSource`; `TanreiListSelectionMode` (`None`, `Single`, `Multiple`), `TanreiListLeadingMedia` (`None`, `Avatar`, `Image`) |
| `components` | `TanreiMenu`: `expanded`, `onDismissRequest`, `modifier`, `placement`, `content`; `TanreiMenuItem`: `text`, `onClick`, `modifier`, `supportingText`, `trailingText`, `destructive`, `enabled`, `leadingIcon`, `trailingIcon`, `interactionSource`; `TanreiCheckboxMenuItem`: `text`, `checked`, `onCheckedChange`, `modifier`, `supportingText`, `trailingText`, `enabled`, `leadingIcon`, `trailingIcon`, `interactionSource`; `TanreiRadioMenuItem`: `text`, `value`, `modifier`, `supportingText`, `trailingText`, `enabled`, `leadingIcon`, `trailingIcon`, `interactionSource`; `TanreiMenuGroup`: `modifier`, `title`, `selectedValue`, `onSelectedValueChange`, `content`; `TanreiMenuPlacement` (`BottomStart`, `BottomEnd`, `TopStart`, `TopEnd`), `TanreiMenuCloseReason` (`Escape`, `Back`, `Outside`, `Tab`, `FocusOut`, `Item`) |
| `components` | `TanreiButtonGroup`: `modifier`, `variant`, `contentDescription`, `content`; `TanreiButtonGroupVariant` (`Standard`, `Connected`) |
| `components` | `TanreiSearch`: `value`, `onValueChange`, `expanded`, `onExpandedChange`, `label`, `modifier`, `presentation`, `placeholder`, `enabled`, `clearLabel`, `backLabel`, `onSearch`, `onSelect`, `leading`, `trailing`, `interactionSource`, `content`; `TanreiSearchSuggestion`: `value`, `headline`, `modifier`, `supportingText`, `leadingIcon`; `TanreiSearchPresentation` (`Docked`, `FullScreen`), `TanreiSearchCloseReason` (`Escape`, `Back`, `Select`, `Submit`, `Outside`, `Tab`, `FocusOut`) |
| `components` | `TanreiSlider` (single: `value`, `onValueChange`, `contentDescription`, `modifier`, `enabled`, `valueRange`, `step`, `origin`, `showStops`, `size`, `orientation`, `valueIndicator`, `stateDescription`, `onValueChangeFinished`, `interactionSource`; range: `value`, `onValueChange`, `contentDescription`, `startContentDescription`, `modifier`, `enabled`, `valueRange`, `step`, `showStops`, `size`, `orientation`, `valueIndicator`, `stateDescription`, `startStateDescription`, `onValueChangeFinished`, `startInteractionSource`, `interactionSource`); `TanreiSliderValueIndicator` (`None`, `Active`, `Always`) |
| `components` | `TanreiToolbar`: `contentDescription`, `modifier`, `variant`, `orientation`, `windowInsets`, `content`; `TanreiToolbarDefaults` (`windowInsets(variant)`) |
| `components` | `TanreiSplitButton`: `text`, `onClick`, `menuContentDescription`, `menuExpanded`, `onMenuExpandedChange`, `onMenuDismissRequest`, `modifier`, `variant`, `size`, `enabled`, `icon`, `interactionSource`, `menuInteractionSource`, `menuContent` |
| `components` | `TanreiFabMenu`: `expanded`, `onExpandedChange`, `onDismissRequest`, `contentDescription`, `icon`, `modifier`, `variant`, `size`, `enabled`, `interactionSource`, `content`; `TanreiFabMenuItem`: `text`, `onClick`, `icon`, `modifier`, `interactionSource` |
| `components` | `TanreiSegmentedButton`: `onSelectionChange`, `contentDescription`, `modifier`, `selectionMode`, `selectedValue`, `selectedValues`, `size`, `content`; `TanreiSegment`: `value`, `label`, `modifier`, `labelHidden`, `enabled`, `icon`, `interactionSource`; `TanreiSegmentedButtonSelectionMode` (`Single`, `Multiple`) |
| `components` | `TanreiTabs`: `selectedValue`, `onSelectedValueChange`, `modifier`, `variant`, `scrollable`, `contentDescription`, `content`; `TanreiTab`: `value`, `label`, `modifier`, `labelHidden`, `enabled`, `icon`, `interactionSource` |
| `components` | `TanreiTooltip`: `text`, `modifier`, `variant`, `title`, `placement`, `describes`, `state`, `anchor`; `TanreiTooltipState` (`isVisible`, `show()`, `dismiss()`), `rememberTanreiTooltipState(initiallyVisible, onToggle)`; `TanreiTooltipVariant` (`Plain`, `Rich`), `TanreiTooltipPlacement` (`Top`, `Bottom`, `Start`, `End`) |
| `components` | `TanreiSnackbarHost`: `hostState`, `modifier`; `TanreiSnackbarHostState` (`showSnackbar(message, actionLabel, withDismissAction, closeLabel, duration)`, `dismissCurrent()`, `clear()`, `currentMessage`); `TanreiSnackbar`: `message`, `modifier`, `actionLabel`, `withDismissAction`, `closeLabel`, `duration`, `onResult`; `TanreiSnackbarDuration` (`Auto`, `Short`, `Long`, `Indefinite`), `TanreiSnackbarResult` (`ActionPerformed`, `Dismissed(reason)`), `TanreiSnackbarDismissReason` (`Close`, `Escape`, `Timeout`, `Host`) |
| `components` | `TanreiDialog`: `visible`, `onDismissRequest`, `headline`, `modifier`, `supportingText`, `alert`, `dismissible`, `initialFocus`, `icon`, `actions`, `content` |
| `components` | `TanreiBottomSheet`: `visible`, `onClose`, `modifier`, `variant`, `detent`, `onDetentChange`, `dismissible`, `handle`, `handleLabel`, `inset`, `contentDescription`, `initialFocus`, `content`; `TanreiBottomSheetVariant` (`Standard`, `Modal`), `TanreiBottomSheetDetent` (`Partial`, `Full`), `TanreiSheetCloseReason` (`Close`, `Scrim`, `Escape`, `Back`, `Drag`) |
| `components` | `TanreiSideSheet`: `visible`, `onClose`, `headline`, `modifier`, `variant`, `closable`, `closeLabel`, `initialFocus`, `actions`, `content` |
| `components` | `TanreiCarousel`: `itemCount`, `contentDescription`, `modifier`, `layout`, `itemWidth`, `content`; `TanreiCarouselItem`: `label`, `onClick`, `modifier`, `interactionSource`, `content`; `TanreiCarouselLayout` (`MultiBrowse`, `Hero`, `Uncontained`) |
| `components` | `TanreiDatePicker`: `visible`, `onClose`, `modifier`, `presentation`, `mode`, `value`, `start`, `end`, `onChange`, `min`, `max`, `disabledDates`, `isDateDisabled`, `today`, `firstDayOfWeek`, `locale`, `entryMode`, `startView`, `labels`; `TanreiDate` (`year`, `month`, `day`, `toString()`, `toLocalDate()`, `TanreiDate.of`, `TanreiDate.parse`), `TanreiDateSelection` (`value`, `start`, `end`), `TanreiDatePickerLabels` (the spec's 14 words), `TanreiDatePickerPresentation` (`Modal`, `Docked`), `TanreiDatePickerMode` (`Single`, `Range`), `TanreiDatePickerFirstDayOfWeek` (`Locale`, `Sunday` … `Saturday`), `TanreiDatePickerEntryMode` (`Calendar`, `Text`), `TanreiDatePickerStartView` (`Day`, `Year`), `TanreiDatePickerCloseReason` (`Escape`, `Back`, `Outside`, `Tab`, `FocusOut`, `Cancel`, `Confirm`, `Select`) |
| `components` | `TanreiTimePicker`: `visible`, `onClose`, `modifier`, `value`, `onChange`, `hourCycle`, `entryMode`, `unit`, `layout`, `locale`, `labels`; `TanreiTime` (`hour`, `minute`, `toString()`, `toLocalTime()`, `TanreiTime.of`, `TanreiTime.parse`), `TanreiTimePickerLabels` (the spec's 8 words), `TanreiTimePickerHourCycle` (`Locale`, `H12`, `H23`), `TanreiTimePickerEntryMode` (`Dial`, `Text`), `TanreiTimePickerUnit` (`Hour`, `Minute`), `TanreiTimePickerLayout` (`Auto`, `Vertical`, `Horizontal`), `TanreiTimePickerCloseReason` (`Escape`, `Back`, `Outside`, `Cancel`, `Confirm`) |
| `components` | `TanreiAppBar`: `title`, `modifier`, `navigationIcon`, `actions`, `subtitle`, `size`, `titleAlignment`, `scrollBehavior`, `windowInsets`; `TanreiAppBarTitleAlignment` (`Start`, `Center`), `TanreiAppBarScrollBehavior` (`state`, `nestedScrollConnection`), `TanreiAppBarState` (`contentOffset`, `collapsedOffset`, `collapseLimit`, `collapsedFraction`, `isScrolled`, `Saver`), `rememberTanreiAppBarState(initialCollapsedOffset, initialContentOffset)`, `TanreiAppBarDefaults` (`windowInsets`, `pinnedScrollBehavior(state)`, `collapseScrollBehavior(state)`) |
| `components` | `TanreiNavigationBar`: `modifier`, `labelVisibility`, `contentDescription`, `windowInsets`, `content`; `RowScope.TanreiNavigationBarItem`: `selected`, `onClick`, `icon`, `label`, `modifier`, `enabled`, `badge`, `interactionSource`; `TanreiNavigationLabelVisibility` (`Always`, `Selected`, `Never`), `TanreiNavigationBadge` (`count`, `contentDescription`), `TanreiNavigationBarDefaults` (`windowInsets`) |
| `components` | `TanreiNavigationRail`: `modifier`, `header`, `labelVisibility`, `contentDescription`, `windowInsets`, `content`; `ColumnScope.TanreiNavigationRailItem`: `selected`, `onClick`, `icon`, `label`, `modifier`, `enabled`, `badge`, `interactionSource`; `TanreiNavigationRailDefaults` (`windowInsets`) |
| `components` | `TanreiNavigationDrawer`: `drawerContent`, `modifier`, `variant`, `drawerState`, `contentDescription`, `header`, `windowInsets`, `content`; `TanreiNavigationDrawerItem`: `selected`, `onClick`, `label`, `modifier`, `icon`, `badge`, `enabled`, `interactionSource`; `TanreiNavigationDrawerSection`: `modifier`, `heading`, `divider`, `content`; `TanreiDrawerState` (`currentValue`, `isOpen`, `isClosed`, `open()`, `close()`, `Saver`), `rememberTanreiDrawerState(initialValue, confirmValueChange)`, `TanreiDrawerValue` (`Closed`, `Open`), `TanreiNavigationDrawerDefaults` (`windowInsets`) |
| `components` | `TanreiExtendedFloatingActionButton`: `text`, `onClick`, `modifier`, `variant`, `size`, `expanded`, `enabled`, `icon`, `interactionSource` |
| `components` | `TanreiFloatingActionButton`: `onClick`, `contentDescription`, `modifier`, `variant`, `size`, `enabled`, `interactionSource`, `icon` |
| `components` | `TanreiTextField` (`String` and `TextFieldValue` overloads): `value`, `onValueChange`, `label`, `modifier`, `variant`, `size`, `type`, `labelHidden`, `placeholder`, `supportingText`, `errorText`, `isError`, `enabled`, `readOnly`, `required`, `singleLine`, `minLines`, `maxLines`, `maxLength`, `counter`, `prefix`, `suffix`, `contentType`, `onCommit`, `keyboardActions`, `leadingIcon`, `trailingIcon`, `interactionSource`; `TanreiTextFieldType` (`Text`, `Email`, `Password`, `Number`, `Search`, `Tel`, `Url`) |
| `primitives` | `TanreiText`; `TanreiDiagnostics` (`reporter`, `LogWarning`, and `missingStep`, which generated accessors call) |
| `theme` | `TanreiTheme` (composable and accessor object: `tokens`, `colors`), `TanreiThemeMode`, `TanreiContrast`, `systemTanreiContrast`, `TanreiColorSchemes.select`, `LocalTanreiSystem`, `LocalTanreiColors`, `LocalTanreiContentColor`, `LocalTanreiTextStyle`, `LocalTanreiFontFamilies`, `TanreiFontFamilies` (`resolve`, `resolveIcon`), `LocalTanreiIconGlyph`, `TanreiFontStack.platformFontFamily` / `toFontFamily`, `TanreiTextStyle.toTextStyle` / `emphasized()`, `TanreiColorRole.color`, `TanreiPaint.color`, `TanreiCubicBezier.toEasing`, `tanreiTween`, `TanreiIconGlyph`, `TanreiIconStyle.glyph` / `variationSettings` |
| `tokens` (generated) | the vocabulary (`TanreiSystem` and its parts, `TanreiPaint` (with `TanreiPaint.Scheme`), `TanreiScheme`, `TanreiColors(scheme, values)`, `TanreiColorRole`, `TanreiInteractionState`, `TanreiFontStack`, `TanreiTextStyle` (with `family` and `emphasized(emphasis)`), `TanreiTypeFamily`, `TanreiTypeEmphasis`, `TanreiBehavior` and its enums, `TanreiButtonVariant`, `TanreiButtonSize` …) and the shipped systems `TanreiSystem.Tanrei`, `.M3Like`, `.Cupertino` with their accessors |

The building blocks components are made of (`tanreiFocusRing`, `tanreiElevation`, `tanreiGroupOpacity`,
`tanreiMinimumTouchTarget`, the glow of a component whose edge is its focus indicator (`tanreiFocusGlow`), the interaction-state reducer and `TanreiDrawnStates` (which state each part draws under
the system's pressed feedback), `TanreiStateMotion`, the ripple (`rememberTanreiRipple`), `tanreiContainer` (fill,
ripple, outline), the smoothed corner shape, the anchor description a badge hands the control it wraps, the looping-animation clock with its visibility gate and reduced-motion pulse, the ring geometry, the repeated items' keyboard — order, Tab stop, arrow keys, Home, End and type-ahead, in a column or a row (`TanreiRovingFocus`) —, a focus ring drawn inside its element (`tanreiFocusRing(inside = true)`), the selection controls' shared pieces — the motion of a change of condition (`rememberTanreiSelectionMotion`), a fill inside an outline inside an edge (`tanreiInsetOutline`), the control-and-label row with its name and missing-name report (`TanreiLabelledControl`, `tanreiControlLabel`), the glyphs a component draws itself — the checkbox's mark and the filter chip's check (`tanreiCheckPath`), the chip's and the snackbar's close without an icon font (`tanreiCrossPath`, `TanreiDrawnGlyph`) —, how many Tanrei modal dialogs are open (`TanreiModalDialogs`, which a snackbar host waits for), the navigation bar's and rail's shared destination (`TanreiNavigationDestination`, with `TanreiDestinations` — order, count, the first marked selected), a glyph drawn by NAME (`TanreiNamedGlyph`), a panel with rounded end corners (`tanreiEndCornerShape`), the joined pieces of one control — start and end corners of their own (`tanreiSideCornerShape`) and a focus ring that follows them (`tanreiFocusRing(endCornerRadius = …)`) —, the channel a button group and a toolbar reach their Buttons and icon buttons through (`LocalTanreiJoinedRow`, `tanreiJoinedTarget`, `TanreiJoinedShape`), the channel a toolbar's roving Tab stop reaches them through (`LocalTanreiRovingGroup`), and a press outside a popup heard before the popup (`TanreiPopupOutsidePress`: a split button's trailing half, a FAB menu's toggle), and the sheets' modal window and the focus a standard sheet hands back (`TanreiModalSheetWindow`, `TanreiFocusReturn`)) are internal until a spec asks for them. Every pressable component
(icon button, chip, FAB, list item, tab …) is built from them the way `TanreiButton` is.

## Building and testing

### What a machine needs

| | Version | Where it is decided |
|---|---|---|
| JDK | **17** (source, target and Kotlin `jvmTarget` are 17; Robolectric's SDK 36 image would need 21, so tests run on SDK 35) | `tanrei/build.gradle.kts`, `gallery/build.gradle.kts`, `tanrei/src/test/resources/robolectric.properties` |
| Gradle | **9.7.1**, through the wrapper (`./gradlew`) — nothing to install | `gradle/wrapper/gradle-wrapper.properties` |
| Android Gradle Plugin / Kotlin / Compose BOM | 9.4.1 / 2.4.20 / 2026.09.00 — resolved by Gradle | `gradle/libs.versions.toml` |
| Android SDK platform | **`android-37.0`** (`compileSdk = 37`; the gallery also targets 37); `minSdk` 23 | the two `build.gradle.kts` |
| Android SDK build-tools | **no version is pinned** in the Gradle files, so the Android Gradle Plugin uses its own default and installs it when the SDK licences are accepted (`sdkmanager --licenses`) | — |
| `ANDROID_HOME` | the SDK directory (for example `~/Library/Android/sdk`), **or** `sdk.dir=/path/to/Android/sdk` in `packages/compose/local.properties` (git-ignored) | — |
| For the instrumented tests only | a device or emulator with API 23 or later (they were run on an API 34 `google_apis` arm64 emulator) | — |

With the SDK's command-line tools: `sdkmanager "platforms;android-37.0" "platform-tools"` and `sdkmanager --licenses`.

```sh
export ANDROID_HOME=~/Library/Android/sdk
./gradlew :tanrei:assembleDebug
./gradlew :tanrei:testDebugUnitTest      # behaviour tests (Robolectric, no emulator)
./gradlew :tanrei:verifyRoborazziDebug   # behaviour tests + compare snapshots against the baselines
```

`pnpm --filter @tanrei/compose build|test` wrap the same commands.

### The gallery app and the instrumented tests

`gallery/` is a small application module (never published): **every fixture of every component spec under every
shipped design system**, each section in its own `TanreiTheme`, with a theme switch (System / Light / Dark) and a
contrast switch (Standard / Medium / High). The fixtures are not copied: the build packages every `specs/*.spec.json`
as an asset and the app reads them (`GallerySpecs.kt`: a fixture's props under the spec's names, the spec's defaults
filled in). How a component is drawn is ONE entry in `GalleryComponents.kt` — spec name → the props it maps and a
composable that maps them to the Compose API; a spec without an entry is named, not drawn, and an entry that does not
map every prop of its spec stops the app. Test tags are `<component>/<system id>/<fixture id>` (`fixtureTag`). It
uses only the library's public API.

```sh
./gradlew :gallery:installDebug                 # then open "Tanrei Gallery" on the device
./gradlew :gallery:assembleDebugAndroidTest     # compiles the instrumented tests (no device needed)
./gradlew :gallery:connectedDebugAndroidTest    # runs them on the connected device / emulator
```

The instrumented tests exist because of what Robolectric cannot do: there the Accessibility Test Framework does
not see Compose's accessibility nodes and every check reports NOT_RUN. On a device they run for real —
`AccessibilityChecksAreLiveTest` proves it by requiring an 8dp click target to be rejected — and
`GalleryAccessibilityTest` holds every fixture of the default system to them, activates a button with Enter and
Space through the platform's real key-event pipeline (BTN-1, and ICB-1 for an icon button), shows a disabled one
cannot be focused or activated (BTN-2, ICB-2), and that Enter switches an icon toggle whose on / off state is exposed
(ICB-11). Presets are shown but not asserted against Tanrei's accessibility criteria: an imitation preset is held to
fidelity to the system it imitates, not to those criteria, in any contrast scheme.

### Snapshots

Baselines live in `tanrei/src/test/snapshots/<component>/<fixture-id>.png`, one per fixture in the
component spec (the test reads the fixture list from `specs/*.spec.json`). On a mismatch, the actual and
diff images are written to `tanrei/build/outputs/roborazzi/`.

Recording is deliberate and never part of `test`. Record only the snapshot tests of the component whose images
should change — the task records every snapshot test it runs:

```sh
TANREI_SNAPSHOT_REASON="<what changed and why>" ./gradlew :tanrei:recordRoborazziDebug --tests '*TanreiIconButton*SnapshotTest*'
```

Shipped presets record one representative fixture per component next to the default's baselines, at
`<component>/<system-id>/<fixture-id>.png` (Button: every variant at medium; icon button: `filled-selected` for m3-like, `standard-unselected` — an off toggle — for cupertino; divider: `horizontal-inset-both` for m3-like, `horizontal-inset-start` for cupertino; badge: `count-single` for m3-like, `count-double` for cupertino; progress indicator: `linear-determinate`; loading indicator: `medium` — every progress and loading baseline is recorded with reduced motion, at the start of a cycle; checkbox and radio button: `unselected` for m3-like, `selected` for cupertino; switch: `selected-icon` for m3-like, `selected` for cupertino; card: `elevated` for m3-like, `filled` for cupertino; text field: `filled-filled` for m3-like, `outlined-label-hidden` for cupertino; FAB: `filled-large` for m3-like, `filled-medium` for cupertino; extended FAB: `tonal-medium` for m3-like, `filled-medium` for cupertino — the stage of both leaves `space600` around them so the whole shadow is in the image; chip: `action-outlined` for m3-like, `filter-selected` for cupertino; list: `three-line-image` for m3-like, `single-selected` for cupertino; menu: `icons-shortcut` for m3-like, `group-titles` for cupertino — drawn in place, with `space600` around them for the shadow; app bar: `small-scrolled` for m3-like, `large` for cupertino; navigation bar: `badges` for m3-like, `four-destinations` for cupertino; navigation rail: `four-destinations` for m3-like, `long-label` for cupertino; navigation drawer: `standard`; segmented button: `icons` for m3-like, `single` for cupertino; button group: `connected` for m3-like, `connected-large` for cupertino; split button: `filled-open` for m3-like, `filled-icon` for cupertino; FAB menu: `tonal-open` for m3-like, `surface-open` for cupertino — drawn in place).

A snapshot diff is a finding. Re-record only when the visual change is the intended result of a spec or
token change, and say so in the changeset (root `AGENTS.md`).

Baselines are recorded and verified on Linux (`ubuntu-24.04`, JDK 17 — CI's `compose` job): Robolectric's native
graphics draw text a little differently on each OS, so an image recorded on a Mac does not match. Record with the
**Record baselines** workflow (`../../CONTRIBUTING.md#recording-baselines`).
