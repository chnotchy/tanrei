// GENERATED FILE — DO NOT EDIT.
// Source: tokens/ (DTCG 2025.10). Regenerate with `pnpm generate`.
@file:Suppress("unused", "MagicNumber", "MaxLineLength", "LongParameterList", "LargeClass", "LongMethod")

package io.github.chnotchy.tanrei.tokens

import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics

/**
 * A color role: the key of one color in a scheme. The set is OPEN — every system has the core roles, and
 * a system may declare more palettes (for example `tertiary`), so a role is a string key, not an enum.
 * The constants are the roles of the default system.
 */
@JvmInline
public value class TanreiColorRole(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val ElevationRing: TanreiColorRole = TanreiColorRole("elevation-ring")
        public val ElevationShadow1: TanreiColorRole = TanreiColorRole("elevation-shadow-1")
        public val ElevationShadow2: TanreiColorRole = TanreiColorRole("elevation-shadow-2")
        public val ElevationShadow3: TanreiColorRole = TanreiColorRole("elevation-shadow-3")
        public val Error: TanreiColorRole = TanreiColorRole("error")
        public val ErrorContainer: TanreiColorRole = TanreiColorRole("error-container")
        public val FocusRing: TanreiColorRole = TanreiColorRole("focus-ring")
        public val FocusRingInner: TanreiColorRole = TanreiColorRole("focus-ring-inner")
        public val Info: TanreiColorRole = TanreiColorRole("info")
        public val InfoContainer: TanreiColorRole = TanreiColorRole("info-container")
        public val InverseLink: TanreiColorRole = TanreiColorRole("inverse-link")
        public val InverseOnSurface: TanreiColorRole = TanreiColorRole("inverse-on-surface")
        public val InversePrimary: TanreiColorRole = TanreiColorRole("inverse-primary")
        public val InverseSurface: TanreiColorRole = TanreiColorRole("inverse-surface")
        public val Link: TanreiColorRole = TanreiColorRole("link")
        public val OnError: TanreiColorRole = TanreiColorRole("on-error")
        public val OnErrorContainer: TanreiColorRole = TanreiColorRole("on-error-container")
        public val OnInfo: TanreiColorRole = TanreiColorRole("on-info")
        public val OnInfoContainer: TanreiColorRole = TanreiColorRole("on-info-container")
        public val OnPrimary: TanreiColorRole = TanreiColorRole("on-primary")
        public val OnPrimaryContainer: TanreiColorRole = TanreiColorRole("on-primary-container")
        public val OnSecondary: TanreiColorRole = TanreiColorRole("on-secondary")
        public val OnSecondaryContainer: TanreiColorRole = TanreiColorRole("on-secondary-container")
        public val OnSuccess: TanreiColorRole = TanreiColorRole("on-success")
        public val OnSuccessContainer: TanreiColorRole = TanreiColorRole("on-success-container")
        public val OnSurface: TanreiColorRole = TanreiColorRole("on-surface")
        public val OnSurfaceVariant: TanreiColorRole = TanreiColorRole("on-surface-variant")
        public val OnWarning: TanreiColorRole = TanreiColorRole("on-warning")
        public val OnWarningContainer: TanreiColorRole = TanreiColorRole("on-warning-container")
        public val Outline: TanreiColorRole = TanreiColorRole("outline")
        public val OutlineVariant: TanreiColorRole = TanreiColorRole("outline-variant")
        public val Primary: TanreiColorRole = TanreiColorRole("primary")
        public val PrimaryContainer: TanreiColorRole = TanreiColorRole("primary-container")
        public val Scrim: TanreiColorRole = TanreiColorRole("scrim")
        public val Secondary: TanreiColorRole = TanreiColorRole("secondary")
        public val SecondaryContainer: TanreiColorRole = TanreiColorRole("secondary-container")
        public val Shadow: TanreiColorRole = TanreiColorRole("shadow")
        public val Success: TanreiColorRole = TanreiColorRole("success")
        public val SuccessContainer: TanreiColorRole = TanreiColorRole("success-container")
        public val Surface: TanreiColorRole = TanreiColorRole("surface")
        public val SurfaceBright: TanreiColorRole = TanreiColorRole("surface-bright")
        public val SurfaceContainer: TanreiColorRole = TanreiColorRole("surface-container")
        public val SurfaceContainerHigh: TanreiColorRole = TanreiColorRole("surface-container-high")
        public val SurfaceContainerHighest: TanreiColorRole = TanreiColorRole("surface-container-highest")
        public val SurfaceContainerLow: TanreiColorRole = TanreiColorRole("surface-container-low")
        public val SurfaceContainerLowest: TanreiColorRole = TanreiColorRole("surface-container-lowest")
        public val SurfaceDim: TanreiColorRole = TanreiColorRole("surface-dim")
        public val SurfaceVariant: TanreiColorRole = TanreiColorRole("surface-variant")
        public val Warning: TanreiColorRole = TanreiColorRole("warning")
        public val WarningContainer: TanreiColorRole = TanreiColorRole("warning-container")
    }
}

/** One scheme: theme × contrast. [key] is its name in the token files. */
public enum class TanreiScheme(public val key: String) {
    Light("light"),
    LightMedium("light-medium"),
    LightHigh("light-high"),
    Dark("dark"),
    DarkMedium("dark-medium"),
    DarkHigh("dark-high"),
}

/**
 * Every color role of one scheme (theme × contrast). It knows WHICH scheme it is ([scheme]), so that a paint whose
 * rule answers differently from scheme to scheme ([TanreiPaint.Scheme]) evaluates against it like any other paint.
 */
@Immutable
public class TanreiColors(public val scheme: TanreiScheme, private val values: Map<TanreiColorRole, Color>) {
    public val roles: Set<TanreiColorRole> get() = values.keys

    public operator fun contains(role: TanreiColorRole): Boolean = role in values

    /**
     * The color of [role]. A role this scheme does not have (a component token of another system naming
     * a palette this system never declared) falls back to the matching slot of the `primary` palette,
     * so content stays readable on its container — and, in a debuggable app, is reported once per scheme through
     * [TanreiDiagnostics.missingRole], as the other platforms do. [TanreiSystem.unknownRoles] is the check
     * `TanreiTheme` runs ahead of time. A scheme without even `primary` draws nothing (transparent).
     */
    public operator fun get(role: TanreiColorRole): Color = values[role] ?: missing(role)

    private fun missing(role: TanreiColorRole): Color {
        val fallback = fallbackOf(role)
        TanreiDiagnostics.missingRole(scheme.key, role.key, fallback.key)
        return values[fallback] ?: values[TanreiColorRole.Primary] ?: Color.Transparent
    }

    /** This scheme with some roles replaced or added. It stays the same [scheme]. */
    public fun copy(vararg overrides: Pair<TanreiColorRole, Color>): TanreiColors = TanreiColors(scheme, values + overrides)

    override fun equals(other: Any?): Boolean = other is TanreiColors && other.scheme == scheme && other.values == values

    override fun hashCode(): Int = 31 * scheme.hashCode() + values.hashCode()

    override fun toString(): String = "TanreiColors($scheme, $values)"

    private fun fallbackOf(role: TanreiColorRole): TanreiColorRole {
        val on = role.key.startsWith("on-")
        val container = role.key.endsWith("-container")
        return when {
            on && container -> TanreiColorRole.OnPrimaryContainer
            container -> TanreiColorRole.PrimaryContainer
            on -> TanreiColorRole.OnPrimary
            else -> TanreiColorRole.Primary
        }
    }
}

/**
 * How a component color is described WITHOUT resolving the scheme. It is evaluated at runtime against
 * the current scheme's [TanreiColors], so component tokens are scheme-independent.
 */
@Immutable
public sealed interface TanreiPaint {
    public fun resolve(colors: TanreiColors): Color

    /** Every role this paint reads. */
    public fun roles(): Set<TanreiColorRole>

    /** A color role of the current scheme. */
    public data class Role(public val role: TanreiColorRole) : TanreiPaint {
        override fun resolve(colors: TanreiColors): Color = colors[role]

        override fun roles(): Set<TanreiColorRole> = setOf(role)
    }

    /** Premultiplied interpolation from [base] to [with] — identical to CSS `color-mix(in srgb, base, with amount)`. */
    public data class Mix(public val base: TanreiPaint, public val with: TanreiPaint, public val amount: Float) : TanreiPaint {
        override fun resolve(colors: TanreiColors): Color {
            val from = base.resolve(colors)
            val to = with.resolve(colors)
            val t = amount.coerceIn(0f, 1f)
            val alpha = from.alpha * (1f - t) + to.alpha * t
            if (alpha == 0f) return Color.Transparent
            fun channel(a: Float, b: Float): Float = (a * from.alpha * (1f - t) + b * to.alpha * t) / alpha
            return Color(channel(from.red, to.red), channel(from.green, to.green), channel(from.blue, to.blue), alpha)
        }

        override fun roles(): Set<TanreiColorRole> = base.roles() + with.roles()
    }

    /** [of] with its alpha multiplied by [amount]. */
    public data class Alpha(public val of: TanreiPaint, public val amount: Float) : TanreiPaint {
        override fun resolve(colors: TanreiColors): Color = of.resolve(colors).let { it.copy(alpha = it.alpha * amount) }

        override fun roles(): Set<TanreiColorRole> = of.roles()
    }

    /** Nothing is drawn. */
    public data object None : TanreiPaint {
        override fun resolve(colors: TanreiColors): Color = Color.Transparent

        override fun roles(): Set<TanreiColorRole> = emptySet()
    }

    /** A fixed color, the same in every scheme. */
    public data class Literal(public val color: Color) : TanreiPaint {
        override fun resolve(colors: TanreiColors): Color = color

        override fun roles(): Set<TanreiColorRole> = emptySet()
    }

    /**
     * One paint per scheme: a component color whose rule (`tone`, `contrast-pick`) answers with a different role or
     * literal from scheme to scheme, so no single paint describes it. Evaluated as the paint of [TanreiColors.scheme];
     * it composes — a [Mix] or [Alpha] of it follows the scheme too.
     */
    public data class Scheme(
        public val light: TanreiPaint,
        public val lightMedium: TanreiPaint,
        public val lightHigh: TanreiPaint,
        public val dark: TanreiPaint,
        public val darkMedium: TanreiPaint,
        public val darkHigh: TanreiPaint,
    ) : TanreiPaint {
        /** The paint of [scheme]. */
        public fun of(scheme: TanreiScheme): TanreiPaint = when (scheme) {
            TanreiScheme.Light -> light
            TanreiScheme.LightMedium -> lightMedium
            TanreiScheme.LightHigh -> lightHigh
            TanreiScheme.Dark -> dark
            TanreiScheme.DarkMedium -> darkMedium
            TanreiScheme.DarkHigh -> darkHigh
        }

        override fun resolve(colors: TanreiColors): Color = of(colors.scheme).resolve(colors)

        override fun roles(): Set<TanreiColorRole> = buildSet { TanreiScheme.entries.forEach { addAll(of(it).roles()) } }
    }
}

/** What a font stack falls back to when none of its named families is available: a class of platform font. */
public enum class TanreiGenericFontFamily { SansSerif, Serif, Monospace, Cursive }

/**
 * A font stack, read ONCE by the token build instead of being parsed as CSS on every platform.
 * Tanrei names fonts and never bundles them: [families] are the NAMED families, in order, that a product may
 * install or register; [generic] is the class of platform font to use when none of them is available; [system]
 * says the stack asks for the platform's own font of that class BEFORE any named family.
 */
@Immutable
public data class TanreiFontStack(
    public val families: List<String>,
    public val generic: TanreiGenericFontFamily,
    public val system: Boolean,
)

/** The named typefaces of a design system (`ref.typeface.*`), each as one [TanreiFontStack]. */
@Immutable
public data class TanreiTypefaces(
    public val brand: TanreiFontStack,
    public val icon: TanreiFontStack,
    public val mono: TanreiFontStack,
    public val plain: TanreiFontStack,
)

/** The families of the type scale. `emphasis` is a weight step per family. */
public enum class TanreiTypeFamily { Body, Display, Heading, Label }

/**
 * `sys.typescale.emphasis.*`: how much weight `emphasized` text gains, per family. There are no
 * emphasized roles — [TanreiTextStyle.emphasized] adds the step of the style's [TanreiTextStyle.family].
 */
@Immutable
public data class TanreiTypeEmphasis(
    public val body: Int,
    public val display: Int,
    public val heading: Int,
    public val label: Int,
) {
    /** The weight step of [family]. */
    public operator fun get(family: TanreiTypeFamily): Int = when (family) {
        TanreiTypeFamily.Body -> body
        TanreiTypeFamily.Display -> display
        TanreiTypeFamily.Heading -> heading
        TanreiTypeFamily.Label -> label
    }
}

@Immutable
public data class TanreiTextStyle(
    public val font: TanreiFontStack,
    public val size: TextUnit,
    /** Numeric weight on the 1–1000 axis (variable fonts may use in-between values such as 450). */
    public val weight: Int,
    public val tracking: TextUnit,
    public val lineHeight: TextUnit,
    /** The family whose `emphasis` step this role takes: decided by the token build, not by the name here. */
    public val family: TanreiTypeFamily,
) {
    /** This style stressed: the same role at [weight] plus its family's step of [emphasis]. */
    public fun emphasized(emphasis: TanreiTypeEmphasis): TanreiTextStyle = copy(weight = weight + emphasis[family])
}

/**
 * How icons are drawn. An icon SET is a font family per selection state: a variable icon font
 * (Material Symbols) names the same family twice and tells the states apart with its `FILL` axis; a static set
 * (Material Icons Outlined / Material Icons) names two families, and the axes are harmless. The fonts are named,
 * not bundled. Read a state through [family] and [fill]; icon sizes are in [TanreiMeasure].
 */
@Immutable
public data class TanreiIconStyle(
    /** The family that draws an icon whose subject is NOT selected. */
    public val unselected: TanreiFontStack,
    /** The family that draws an icon whose subject is selected. */
    public val selected: TanreiFontStack,
    /** Numeric weight on the font's `wght` axis. */
    public val weight: Int,
    /** Numeric weight of a control's own mark (`sys.icon.mark.weight`): a checkbox's check, the glyph on a switch's handle. */
    public val markWeight: Int,
    public val fillUnselected: Float,
    public val fillSelected: Float,
    /** The smallest `opsz` the icon font draws (`sys.icon.optical-size.min`); a smaller box is drawn at it. */
    public val opticalSizeMin: Float,
    /** The largest `opsz` the icon font draws (`sys.icon.optical-size.max`); a larger box is drawn at it. */
    public val opticalSizeMax: Float,
) {
    /** The icon font of an icon whose subject is [selected] or not. */
    public fun family(selected: Boolean): TanreiFontStack = if (selected) this.selected else unselected

    /** The `FILL` of an icon whose subject is [selected] or not. */
    public fun fill(selected: Boolean): Float = if (selected) fillSelected else fillUnselected
}

@Immutable
public data class TanreiCubicBezier(public val x1: Float, public val y1: Float, public val x2: Float, public val y2: Float)

@Immutable
public data class TanreiSpringSpec(
    public val damping: Float,
    public val stiffness: Float,
    /** Fallback for contexts without spring animation. */
    public val easing: TanreiCubicBezier,
    public val durationMs: Int,
)

/**
 * One layer of an elevation level, with CSS `box-shadow` semantics: [blur] is the CSS blur radius —
 * the Gaussian's standard deviation is blur / 2 — and [spread] grows the shadow's shape on every side before it is
 * blurred. The library converts both to what Android draws in ONE place (`primitives/TanreiElevation.kt`).
 */
@Immutable
public data class TanreiShadowLayer(public val x: Dp, public val y: Dp, public val blur: Dp, public val spread: Dp, public val role: TanreiColorRole)

/** The interaction state a component draws. A component reads THAT state's tokens; it never computes how a state looks. */
public enum class TanreiInteractionState { Enabled, Hovered, Focused, Pressed, Disabled }

/** One [TanreiColors] per scheme (theme × contrast). */
@Immutable
public data class TanreiColorSchemes(
    public val light: TanreiColors,
    public val lightMedium: TanreiColors,
    public val lightHigh: TanreiColors,
    public val dark: TanreiColors,
    public val darkMedium: TanreiColors,
    public val darkHigh: TanreiColors,
) {
    /** The colors of [scheme]. */
    public operator fun get(scheme: TanreiScheme): TanreiColors = when (scheme) {
        TanreiScheme.Light -> light
        TanreiScheme.LightMedium -> lightMedium
        TanreiScheme.LightHigh -> lightHigh
        TanreiScheme.Dark -> dark
        TanreiScheme.DarkMedium -> darkMedium
        TanreiScheme.DarkHigh -> darkHigh
    }
}

/** The dials the values were derived from. Informational: derivation happens at build time. */
@Immutable
public data class TanreiDials(
    public val motionUnit: Float,
    public val shapeUnit: Float,
    public val sizeUnit: Float,
    public val spaceUnit: Float,
    public val strokeUnit: Float,
    public val typeBase: Float,
    public val typeContrast: Float,
)

/** Text styles by level: `display`, `heading1`…`heading6` (h1–h6), `bodyLarge` / `body` / `bodySmall`, `label` / `labelSmall` / `caption`, `code` / `codeSmall`, `eyebrow`. Emphasis is [emphasis], a weight step, not a role. */
@Immutable
public data class TanreiTypescale(
    public val body: TanreiTextStyle,
    public val bodyLarge: TanreiTextStyle,
    public val bodySmall: TanreiTextStyle,
    public val caption: TanreiTextStyle,
    public val code: TanreiTextStyle,
    public val codeSmall: TanreiTextStyle,
    public val display: TanreiTextStyle,
    public val eyebrow: TanreiTextStyle,
    public val heading1: TanreiTextStyle,
    public val heading2: TanreiTextStyle,
    public val heading3: TanreiTextStyle,
    public val heading4: TanreiTextStyle,
    public val heading5: TanreiTextStyle,
    public val heading6: TanreiTextStyle,
    public val label: TanreiTextStyle,
    public val labelSmall: TanreiTextStyle,
    /** `sys.typescale.emphasis.*`: the weight step `emphasized` text gains, per family. */
    public val emphasis: TanreiTypeEmphasis,
    /** Steps a design system added to the vocabulary, by token key. */
    public val extra: Map<String, TanreiTextStyle> = emptyMap(),
) {
    /** The step with this token key — core or added — or null when this system does not have it. */
    public operator fun get(key: String): TanreiTextStyle? = when (key) {
        "body" -> body
        "body-large" -> bodyLarge
        "body-small" -> bodySmall
        "caption" -> caption
        "code" -> code
        "code-small" -> codeSmall
        "display" -> display
        "eyebrow" -> eyebrow
        "heading-1" -> heading1
        "heading-2" -> heading2
        "heading-3" -> heading3
        "heading-4" -> heading4
        "heading-5" -> heading5
        "heading-6" -> heading6
        "label" -> label
        "label-small" -> labelSmall
        else -> extra[key]
    }
}

/** Corner radii, and how every corner eases ([cornerSmoothing]). */
@Immutable
public data class TanreiShape(
    public val extraExtraLarge: Dp,
    public val extraLarge: Dp,
    public val extraLargeIncreased: Dp,
    public val extraSmall: Dp,
    public val full: Dp,
    public val large: Dp,
    public val largeIncreased: Dp,
    public val medium: Dp,
    public val none: Dp,
    public val small: Dp,
    /** `sys.shape.corner-smoothing`: how a corner eases into the edge, 0–1 with Figma's meaning — 0 a quarter circle, 0.6 the iOS continuous corner, 1 the most eased. The radius does not change. */
    public val cornerSmoothing: Float,
    /** Steps a design system added to the vocabulary, by token key. */
    public val extra: Map<String, Dp> = emptyMap(),
) {
    /** The step with this token key — core or added — or null when this system does not have it. */
    public operator fun get(key: String): Dp? = when (key) {
        "extra-extra-large" -> extraExtraLarge
        "extra-large" -> extraLarge
        "extra-large-increased" -> extraLargeIncreased
        "extra-small" -> extraSmall
        "full" -> full
        "large" -> large
        "large-increased" -> largeIncreased
        "medium" -> medium
        "none" -> none
        "small" -> small
        else -> extra[key]
    }
}

@Immutable
public data class TanreiSpace(
    public val space0: Dp,
    public val space25: Dp,
    public val space50: Dp,
    public val space75: Dp,
    public val space100: Dp,
    public val space125: Dp,
    public val space150: Dp,
    public val space175: Dp,
    public val space200: Dp,
    public val space250: Dp,
    public val space300: Dp,
    public val space400: Dp,
    public val space450: Dp,
    public val space500: Dp,
    public val space600: Dp,
    public val space700: Dp,
    public val space800: Dp,
    public val space900: Dp,
    /** Steps a design system added to the vocabulary, by token key. */
    public val extra: Map<String, Dp> = emptyMap(),
) {
    /** The step with this token key — core or added — or null when this system does not have it. */
    public operator fun get(key: String): Dp? = when (key) {
        "space0" -> space0
        "space25" -> space25
        "space50" -> space50
        "space75" -> space75
        "space100" -> space100
        "space125" -> space125
        "space150" -> space150
        "space175" -> space175
        "space200" -> space200
        "space250" -> space250
        "space300" -> space300
        "space400" -> space400
        "space450" -> space450
        "space500" -> space500
        "space600" -> space600
        "space700" -> space700
        "space800" -> space800
        "space900" -> space900
        else -> extra[key]
    }
}

/** State opacities. Systems use them as amounts in paints; components never read them. */
@Immutable
public data class TanreiState(
    public val disabledContainerOpacity: Float,
    public val disabledContentOpacity: Float,
    public val draggedStateLayerOpacity: Float,
    public val focusStateLayerOpacity: Float,
    public val hoverStateLayerOpacity: Float,
    public val pressedStateLayerOpacity: Float,
    public val selectedStateLayerOpacity: Float,
    /** Steps a design system added to the vocabulary, by token key. */
    public val extra: Map<String, Float> = emptyMap(),
) {
    /** The step with this token key — core or added — or null when this system does not have it. */
    public operator fun get(key: String): Float? = when (key) {
        "disabled-container-opacity" -> disabledContainerOpacity
        "disabled-content-opacity" -> disabledContentOpacity
        "dragged-state-layer-opacity" -> draggedStateLayerOpacity
        "focus-state-layer-opacity" -> focusStateLayerOpacity
        "hover-state-layer-opacity" -> hoverStateLayerOpacity
        "pressed-state-layer-opacity" -> pressedStateLayerOpacity
        "selected-state-layer-opacity" -> selectedStateLayerOpacity
        else -> extra[key]
    }
}

@Immutable
public data class TanreiMeasure(
    public val borderHairline: Dp,
    public val borderThick: Dp,
    public val breakpointExpanded: Dp,
    public val breakpointMedium: Dp,
    public val focusInnerWidth: Dp,
    public val focusOffset: Dp,
    public val focusOuterWidth: Dp,
    public val iconExtraSmall: Dp,
    public val iconLarge: Dp,
    public val iconMedium: Dp,
    public val iconSmall: Dp,
    public val targetPointer: Dp,
    public val targetSpacing: Dp,
    public val targetTouch: Dp,
    /** Steps a design system added to the vocabulary, by token key. */
    public val extra: Map<String, Dp> = emptyMap(),
) {
    /** The step with this token key — core or added — or null when this system does not have it. */
    public operator fun get(key: String): Dp? = when (key) {
        "border-hairline" -> borderHairline
        "border-thick" -> borderThick
        "breakpoint-expanded" -> breakpointExpanded
        "breakpoint-medium" -> breakpointMedium
        "focus-inner-width" -> focusInnerWidth
        "focus-offset" -> focusOffset
        "focus-outer-width" -> focusOuterWidth
        "icon-extra-small" -> iconExtraSmall
        "icon-large" -> iconLarge
        "icon-medium" -> iconMedium
        "icon-small" -> iconSmall
        "target-pointer" -> targetPointer
        "target-spacing" -> targetSpacing
        "target-touch" -> targetTouch
        else -> extra[key]
    }
}

/** Milliseconds. */
@Immutable
public data class TanreiDuration(
    public val extraLong1: Int,
    public val extraLong2: Int,
    public val extraLong3: Int,
    public val extraLong4: Int,
    public val long1: Int,
    public val long2: Int,
    public val long3: Int,
    public val long4: Int,
    public val medium1: Int,
    public val medium2: Int,
    public val medium3: Int,
    public val medium4: Int,
    public val pressHold: Int,
    public val short1: Int,
    public val short2: Int,
    public val short3: Int,
    public val short4: Int,
    public val stagger: Int,
    /** Steps a design system added to the vocabulary, by token key. */
    public val extra: Map<String, Int> = emptyMap(),
) {
    /** The step with this token key — core or added — or null when this system does not have it. */
    public operator fun get(key: String): Int? = when (key) {
        "extra-long1" -> extraLong1
        "extra-long2" -> extraLong2
        "extra-long3" -> extraLong3
        "extra-long4" -> extraLong4
        "long1" -> long1
        "long2" -> long2
        "long3" -> long3
        "long4" -> long4
        "medium1" -> medium1
        "medium2" -> medium2
        "medium3" -> medium3
        "medium4" -> medium4
        "press-hold" -> pressHold
        "short1" -> short1
        "short2" -> short2
        "short3" -> short3
        "short4" -> short4
        "stagger" -> stagger
        else -> extra[key]
    }
}

@Immutable
public data class TanreiEasing(
    public val emphasizedAccelerate: TanreiCubicBezier,
    public val emphasizedDecelerate: TanreiCubicBezier,
    public val enter: TanreiCubicBezier,
    public val exit: TanreiCubicBezier,
    public val linear: TanreiCubicBezier,
    public val spatial: TanreiCubicBezier,
    public val standard: TanreiCubicBezier,
    public val standardAccelerate: TanreiCubicBezier,
    public val standardDecelerate: TanreiCubicBezier,
    public val state: TanreiCubicBezier,
    /** Steps a design system added to the vocabulary, by token key. */
    public val extra: Map<String, TanreiCubicBezier> = emptyMap(),
) {
    /** The step with this token key — core or added — or null when this system does not have it. */
    public operator fun get(key: String): TanreiCubicBezier? = when (key) {
        "emphasized-accelerate" -> emphasizedAccelerate
        "emphasized-decelerate" -> emphasizedDecelerate
        "enter" -> enter
        "exit" -> exit
        "linear" -> linear
        "spatial" -> spatial
        "standard" -> standard
        "standard-accelerate" -> standardAccelerate
        "standard-decelerate" -> standardDecelerate
        "state" -> state
        else -> extra[key]
    }
}

/** One spring set. [scheme] is its token key (`standard`, `expressive`). */
@Immutable
public data class TanreiSprings(
    public val scheme: String,
    public val defaultEffects: TanreiSpringSpec,
    public val defaultSpatial: TanreiSpringSpec,
    public val fastEffects: TanreiSpringSpec,
    public val fastSpatial: TanreiSpringSpec,
    public val slowEffects: TanreiSpringSpec,
    public val slowSpatial: TanreiSpringSpec,
    /** Springs a design system added to the vocabulary, by token key. */
    public val extra: Map<String, TanreiSpringSpec> = emptyMap(),
) {
    /** The spring with this token key — core or added — or null when this system does not have it. */
    public operator fun get(key: String): TanreiSpringSpec? = when (key) {
        "default-effects" -> defaultEffects
        "default-spatial" -> defaultSpatial
        "fast-effects" -> fastEffects
        "fast-spatial" -> fastSpatial
        "slow-effects" -> slowEffects
        "slow-spatial" -> slowSpatial
        else -> extra[key]
    }
}

@Immutable
public data class TanreiMotion(
    public val duration: TanreiDuration,
    public val easing: TanreiEasing,
    public val expressiveSpring: TanreiSprings,
    public val standardSpring: TanreiSprings,
)

/** A level may start with a ring — a layer with no offset, no blur and a positive spread: render that one as a border, the rest as shadows. Not every system has one. */
@Immutable
public data class TanreiElevation(
    public val level0: List<TanreiShadowLayer>,
    public val level1: List<TanreiShadowLayer>,
    public val level2: List<TanreiShadowLayer>,
    public val level3: List<TanreiShadowLayer>,
    public val level4: List<TanreiShadowLayer>,
    public val level5: List<TanreiShadowLayer>,
    /** Steps a design system added to the vocabulary, by token key. */
    public val extra: Map<String, List<TanreiShadowLayer>> = emptyMap(),
) {
    /** The step with this token key — core or added — or null when this system does not have it. */
    public operator fun get(key: String): List<TanreiShadowLayer>? = when (key) {
        "level0" -> level0
        "level1" -> level1
        "level2" -> level2
        "level3" -> level3
        "level4" -> level4
        "level5" -> level5
        else -> extra[key]
    }
}

/** `sys.behavior.appearance`. The first value is the default, and what a platform that cannot draw a choice falls back to. */
public enum class TanreiAppearance { FadeScale, Fade, FadeSlide, BlurSlide, Unfold }

/** `sys.behavior.divider-visibility`. The first value is the default, and what a platform that cannot draw a choice falls back to. */
public enum class TanreiDividerVisibility { Always, Scroll }

/** `sys.behavior.focus-style`. The first value is the default, and what a platform that cannot draw a choice falls back to. */
public enum class TanreiFocusStyle { Ring, Glow }

/** `sys.behavior.link-underline`. The first value is the default, and what a platform that cannot draw a choice falls back to. */
public enum class TanreiLinkUnderline { Always, Hover, Never }

/** `sys.behavior.pressed-feedback`. The first value is the default, and what a platform that cannot draw a choice falls back to. */
public enum class TanreiPressedFeedback { Overlay, Ripple, Dim, None }

/** `sys.behavior.requirement-mark`. The first value is the default, and what a platform that cannot draw a choice falls back to. */
public enum class TanreiRequirementMark { Tag, Asterisk, None }

/** `sys.behavior.separation`. The first value is the default, and what a platform that cannot draw a choice falls back to. */
public enum class TanreiSeparation { Divider, Gap }

/** Choices of kind: what no amount can express. Components read them and never branch on a system's id. */
@Immutable
public data class TanreiBehavior(
    public val appearance: TanreiAppearance,
    public val dividerVisibility: TanreiDividerVisibility,
    public val focusStyle: TanreiFocusStyle,
    public val linkUnderline: TanreiLinkUnderline,
    public val pressedFeedback: TanreiPressedFeedback,
    public val requirementMark: TanreiRequirementMark,
    public val separation: TanreiSeparation,
)

/**
 * A variant of accordion: the key of one entry of [TanreiAccordionVariants]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Plain].
 */
@JvmInline
public value class TanreiAccordionVariant(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Plain: TanreiAccordionVariant = TanreiAccordionVariant("plain")
        public val Outlined: TanreiAccordionVariant = TanreiAccordionVariant("outlined")
    }
}

/** What one variant of accordion draws in one interaction state. */
@Immutable
public data class TanreiAccordionVariantStateTokens(
    public val containerColor: TanreiPaint,
    public val labelColor: TanreiPaint,
    public val supportingTextColor: TanreiPaint,
    public val trailingTextColor: TanreiPaint,
    public val iconColor: TanreiPaint,
    public val chevronColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(labelColor.roles())
        addAll(supportingTextColor.roles())
        addAll(trailingTextColor.roles())
        addAll(iconColor.roles())
        addAll(chevronColor.roles())
        addAll(stateLayerColor.roles())
    }
}

/** One variant of accordion: a full set of tokens per interaction state. */
@Immutable
public data class TanreiAccordionVariantTokens(
    public val enabled: TanreiAccordionVariantStateTokens,
    public val hovered: TanreiAccordionVariantStateTokens,
    public val focused: TanreiAccordionVariantStateTokens,
    public val pressed: TanreiAccordionVariantStateTokens,
    public val disabled: TanreiAccordionVariantStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiAccordionVariantStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every variant of accordion: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiAccordionVariants(
    public val plain: TanreiAccordionVariantTokens,
    public val outlined: TanreiAccordionVariantTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiAccordionVariant, TanreiAccordionVariantTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiAccordionVariant> get() = linkedSetOf(TanreiAccordionVariant.Plain, TanreiAccordionVariant.Outlined) + extra.keys

    public operator fun contains(key: TanreiAccordionVariant): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiAccordionVariant): TanreiAccordionVariantTokens? = when (key) {
        TanreiAccordionVariant.Plain -> plain
        TanreiAccordionVariant.Outlined -> outlined
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [plain]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiAccordionVariant): TanreiAccordionVariantTokens = find(key) ?: plain

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(plain.referencedRoles())
        addAll(outlined.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/**
 * A density of accordion: the key of one entry of [TanreiAccordionDensitys]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Regular].
 */
@JvmInline
public value class TanreiAccordionDensity(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Regular: TanreiAccordionDensity = TanreiAccordionDensity("regular")
        public val Compact: TanreiAccordionDensity = TanreiAccordionDensity("compact")
    }
}

/** The tokens of one density of accordion. */
@Immutable
public data class TanreiAccordionDensityTokens(
    public val containerHeight: Dp,
    public val containerPaddingBlock: Dp,
    public val containerPaddingInline: Dp,
    public val labelTypescale: TanreiTextStyle,
    public val supportingTextTypescale: TanreiTextStyle,
    public val trailingTextTypescale: TanreiTextStyle,
    public val iconSize: Dp,
    public val chevronSize: Dp,
    public val contentPaddingBlockEnd: Dp,
)

/**
 * Every density of accordion: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiAccordionDensitys(
    public val regular: TanreiAccordionDensityTokens,
    public val compact: TanreiAccordionDensityTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiAccordionDensity, TanreiAccordionDensityTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiAccordionDensity> get() = linkedSetOf(TanreiAccordionDensity.Regular, TanreiAccordionDensity.Compact) + extra.keys

    public operator fun contains(key: TanreiAccordionDensity): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiAccordionDensity): TanreiAccordionDensityTokens? = when (key) {
        TanreiAccordionDensity.Regular -> regular
        TanreiAccordionDensity.Compact -> compact
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [regular]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiAccordionDensity): TanreiAccordionDensityTokens = find(key) ?: regular
}

/** What every variant of accordion shares in one interaction state. */
@Immutable
public data class TanreiAccordionStateTokens(
    public val opacity: Float,
)

/** `comp.accordion`. Members are flat tokens, then per-state tokens, then one holder per axis (`variants[variant]`, `densitys[density]`). */
@Immutable
public data class TanreiAccordionTokens(
    public val containerGap: Dp,
    public val containerShape: Dp,
    public val dividerColor: TanreiPaint,
    public val dividerThickness: Dp,
    public val itemGap: Dp,
    public val motionDisclosureDuration: Int,
    public val motionDisclosureEasing: TanreiCubicBezier,
    public val motionFeedbackDuration: Int,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val outlineColor: TanreiPaint,
    public val outlineShape: Dp,
    public val outlineWidth: Dp,
    public val separation: Float,
    public val hovered: TanreiAccordionStateTokens,
    public val focused: TanreiAccordionStateTokens,
    public val pressed: TanreiAccordionStateTokens,
    public val disabled: TanreiAccordionStateTokens,
    public val variants: TanreiAccordionVariants,
    public val densitys: TanreiAccordionDensitys,
) {
    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(dividerColor.roles())
        addAll(outlineColor.roles())
        addAll(variants.referencedRoles())
    }
}

/**
 * A size of app-bar: the key of one entry of [TanreiAppBarSizes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Small].
 */
@JvmInline
public value class TanreiAppBarSize(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Small: TanreiAppBarSize = TanreiAppBarSize("small")
        public val Large: TanreiAppBarSize = TanreiAppBarSize("large")
    }
}

/** The tokens of one size of app-bar. */
@Immutable
public data class TanreiAppBarSizeTokens(
    public val containerHeight: Dp,
    public val titleTypescale: TanreiTextStyle,
    public val subtitleTypescale: TanreiTextStyle,
)

/**
 * Every size of app-bar: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiAppBarSizes(
    public val small: TanreiAppBarSizeTokens,
    public val large: TanreiAppBarSizeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiAppBarSize, TanreiAppBarSizeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiAppBarSize> get() = linkedSetOf(TanreiAppBarSize.Small, TanreiAppBarSize.Large) + extra.keys

    public operator fun contains(key: TanreiAppBarSize): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiAppBarSize): TanreiAppBarSizeTokens? = when (key) {
        TanreiAppBarSize.Small -> small
        TanreiAppBarSize.Large -> large
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [small]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiAppBarSize): TanreiAppBarSizeTokens = find(key) ?: small
}

/**
 * A condition of app-bar: the key of one entry of [TanreiAppBarConditions]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Flat].
 */
@JvmInline
public value class TanreiAppBarCondition(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Flat: TanreiAppBarCondition = TanreiAppBarCondition("flat")
        public val Scrolled: TanreiAppBarCondition = TanreiAppBarCondition("scrolled")
    }
}

/** The tokens of one condition of app-bar. */
@Immutable
public data class TanreiAppBarConditionTokens(
    public val containerColor: TanreiPaint,
    public val containerElevation: List<TanreiShadowLayer>,
    public val outlineColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        containerElevation.forEach { add(it.role) }
        addAll(outlineColor.roles())
    }
}

/**
 * Every condition of app-bar: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiAppBarConditions(
    public val flat: TanreiAppBarConditionTokens,
    public val scrolled: TanreiAppBarConditionTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiAppBarCondition, TanreiAppBarConditionTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiAppBarCondition> get() = linkedSetOf(TanreiAppBarCondition.Flat, TanreiAppBarCondition.Scrolled) + extra.keys

    public operator fun contains(key: TanreiAppBarCondition): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiAppBarCondition): TanreiAppBarConditionTokens? = when (key) {
        TanreiAppBarCondition.Flat -> flat
        TanreiAppBarCondition.Scrolled -> scrolled
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [flat]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiAppBarCondition): TanreiAppBarConditionTokens = find(key) ?: flat

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(flat.referencedRoles())
        addAll(scrolled.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** `comp.app-bar`. Members are flat tokens, then per-state tokens, then one holder per axis (`sizes[size]`, `conditions[condition]`). */
@Immutable
public data class TanreiAppBarTokens(
    public val actionsGap: Dp,
    public val brandColor: TanreiPaint,
    public val brandImageHeight: Dp,
    public val brandLockupAlignment: Float,
    public val brandLockupGap: Dp,
    public val brandLockupSymbolSize: Dp,
    public val brandShape: Dp,
    public val brandSymbolSize: Dp,
    public val brandWordmarkHeight: Dp,
    public val containerGap: Dp,
    public val containerPaddingBlockEnd: Dp,
    public val containerPaddingInline: Dp,
    public val motionConditionDuration: Int,
    public val motionConditionEasing: TanreiCubicBezier,
    public val outlineVisibility: Float,
    public val outlineWidth: Dp,
    public val subtitleColor: TanreiPaint,
    public val titleColor: TanreiPaint,
    public val titleInset: Dp,
    public val sizes: TanreiAppBarSizes,
    public val conditions: TanreiAppBarConditions,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(brandColor.roles())
        addAll(subtitleColor.roles())
        addAll(titleColor.roles())
        addAll(conditions.referencedRoles())
    }
}

/** `comp.app-shell`. Members are flat tokens, then per-state tokens, then one holder per axis (). */
@Immutable
public data class TanreiAppShellTokens(
    public val asideGap: Dp,
    public val asidePaddingInline: Dp,
    public val asideWidth: Dp,
    public val breakpointExpanded: Dp,
    public val breakpointMedium: Dp,
    public val containerColor: TanreiPaint,
    public val contentColor: TanreiPaint,
    public val footerPaddingBlock: Dp,
    public val gutterCompact: Dp,
    public val gutterExpanded: Dp,
    public val gutterMedium: Dp,
    public val mainMaxWidth: Dp,
    public val mainPaddingBlock: Dp,
    public val outlineColor: TanreiPaint,
    public val outlineWidth: Dp,
    public val separation: Float,
    public val skipLinkContainerColor: TanreiPaint,
    public val skipLinkContainerElevation: List<TanreiShadowLayer>,
    public val skipLinkContainerPaddingBlock: Dp,
    public val skipLinkContainerPaddingInline: Dp,
    public val skipLinkContainerShape: Dp,
    public val skipLinkLabelTypescale: TanreiTextStyle,
    public val skipLinkOffset: Dp,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(contentColor.roles())
        addAll(outlineColor.roles())
        addAll(skipLinkContainerColor.roles())
        skipLinkContainerElevation.forEach { add(it.role) }
    }
}

/**
 * A size of avatar: the key of one entry of [TanreiAvatarSizes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Medium].
 */
@JvmInline
public value class TanreiAvatarSize(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Small: TanreiAvatarSize = TanreiAvatarSize("small")
        public val Medium: TanreiAvatarSize = TanreiAvatarSize("medium")
        public val Large: TanreiAvatarSize = TanreiAvatarSize("large")
    }
}

/** The tokens of one size of avatar. */
@Immutable
public data class TanreiAvatarSizeTokens(
    public val containerSize: Dp,
    public val labelTypescale: TanreiTextStyle,
    public val iconSize: Dp,
    public val groupOverlap: Dp,
)

/**
 * Every size of avatar: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiAvatarSizes(
    public val small: TanreiAvatarSizeTokens,
    public val medium: TanreiAvatarSizeTokens,
    public val large: TanreiAvatarSizeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiAvatarSize, TanreiAvatarSizeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiAvatarSize> get() = linkedSetOf(TanreiAvatarSize.Small, TanreiAvatarSize.Medium, TanreiAvatarSize.Large) + extra.keys

    public operator fun contains(key: TanreiAvatarSize): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiAvatarSize): TanreiAvatarSizeTokens? = when (key) {
        TanreiAvatarSize.Small -> small
        TanreiAvatarSize.Medium -> medium
        TanreiAvatarSize.Large -> large
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [medium]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiAvatarSize): TanreiAvatarSizeTokens = find(key) ?: medium
}

/**
 * A shape of avatar: the key of one entry of [TanreiAvatarShapes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Circle].
 */
@JvmInline
public value class TanreiAvatarShape(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Circle: TanreiAvatarShape = TanreiAvatarShape("circle")
        public val Square: TanreiAvatarShape = TanreiAvatarShape("square")
    }
}

/** The tokens of one shape of avatar. */
@Immutable
public data class TanreiAvatarShapeTokens(
    public val containerShape: Dp,
)

/**
 * Every shape of avatar: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiAvatarShapes(
    public val circle: TanreiAvatarShapeTokens,
    public val square: TanreiAvatarShapeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiAvatarShape, TanreiAvatarShapeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiAvatarShape> get() = linkedSetOf(TanreiAvatarShape.Circle, TanreiAvatarShape.Square) + extra.keys

    public operator fun contains(key: TanreiAvatarShape): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiAvatarShape): TanreiAvatarShapeTokens? = when (key) {
        TanreiAvatarShape.Circle -> circle
        TanreiAvatarShape.Square -> square
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [circle]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiAvatarShape): TanreiAvatarShapeTokens = find(key) ?: circle
}

/** `comp.avatar`. Members are flat tokens, then per-state tokens, then one holder per axis (`sizes[size]`, `shapes[shape]`). */
@Immutable
public data class TanreiAvatarTokens(
    public val containerColor: TanreiPaint,
    public val groupOutlineColor: TanreiPaint,
    public val groupOutlineWidth: Dp,
    public val iconColor: TanreiPaint,
    public val labelColor: TanreiPaint,
    public val sizes: TanreiAvatarSizes,
    public val shapes: TanreiAvatarShapes,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(groupOutlineColor.roles())
        addAll(iconColor.roles())
        addAll(labelColor.roles())
    }
}

/** `comp.badge`. Members are flat tokens, then per-state tokens, then one holder per axis (). */
@Immutable
public data class TanreiBadgeTokens(
    public val containerColor: TanreiPaint,
    public val containerHeight: Dp,
    public val containerOffset: Dp,
    public val containerPaddingInline: Dp,
    public val containerShape: Dp,
    public val dotOffset: Dp,
    public val dotSize: Dp,
    public val labelColor: TanreiPaint,
    public val labelTypescale: TanreiTextStyle,
    public val outlineColor: TanreiPaint,
    public val outlineWidth: Dp,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(labelColor.roles())
        addAll(outlineColor.roles())
    }
}

/**
 * A control of bottom-sheet: the key of one entry of [TanreiBottomSheetControls]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [DragHandle].
 */
@JvmInline
public value class TanreiBottomSheetControl(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val DragHandle: TanreiBottomSheetControl = TanreiBottomSheetControl("drag-handle")
    }
}

/** What one control of bottom-sheet draws in one interaction state. */
@Immutable
public data class TanreiBottomSheetControlStateTokens(
    public val containerColor: TanreiPaint,
    public val gripColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(gripColor.roles())
        addAll(stateLayerColor.roles())
    }
}

/** One control of bottom-sheet: a full set of tokens per interaction state. */
@Immutable
public data class TanreiBottomSheetControlTokens(
    public val enabled: TanreiBottomSheetControlStateTokens,
    public val hovered: TanreiBottomSheetControlStateTokens,
    public val focused: TanreiBottomSheetControlStateTokens,
    public val pressed: TanreiBottomSheetControlStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiBottomSheetControlStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> enabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles()
}

/**
 * Every control of bottom-sheet: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiBottomSheetControls(
    public val dragHandle: TanreiBottomSheetControlTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiBottomSheetControl, TanreiBottomSheetControlTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiBottomSheetControl> get() = linkedSetOf(TanreiBottomSheetControl.DragHandle) + extra.keys

    public operator fun contains(key: TanreiBottomSheetControl): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiBottomSheetControl): TanreiBottomSheetControlTokens? = when (key) {
        TanreiBottomSheetControl.DragHandle -> dragHandle
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [dragHandle]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiBottomSheetControl): TanreiBottomSheetControlTokens = find(key) ?: dragHandle

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(dragHandle.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of bottom-sheet shares in one interaction state. */
@Immutable
public data class TanreiBottomSheetStateTokens(
    public val opacity: Float,
)

/** `comp.bottom-sheet`. Members are flat tokens, then per-state tokens, then one holder per axis (`controls[control]`). */
@Immutable
public data class TanreiBottomSheetTokens(
    public val closeButtonVariant: Float,
    public val containerColor: TanreiPaint,
    public val containerElevation: List<TanreiShadowLayer>,
    public val containerMarginBlockStart: Dp,
    public val containerMaxWidth: Dp,
    public val containerPadding: Dp,
    public val containerPartialFraction: Float,
    public val containerShape: Dp,
    public val contentColor: TanreiPaint,
    public val dividerColor: TanreiPaint,
    public val dividerVisibility: Float,
    public val dividerWidth: Dp,
    public val handleContainerHeight: Dp,
    public val handleContainerShape: Dp,
    public val handleContainerWidth: Dp,
    public val handleGripHeight: Dp,
    public val handleGripShape: Dp,
    public val handleGripWidth: Dp,
    public val handleMarginBlock: Dp,
    public val headerGap: Dp,
    public val headerHeight: Dp,
    public val headerPaddingInlineEnd: Dp,
    public val headlineColor: TanreiPaint,
    public val headlineTypescale: TanreiTextStyle,
    public val motionEnterDuration: Int,
    public val motionEnterEasing: TanreiCubicBezier,
    public val motionExitDuration: Int,
    public val motionExitEasing: TanreiCubicBezier,
    public val motionFeedbackDuration: Int,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val scrimBlur: Dp,
    public val scrimColor: TanreiPaint,
    public val hovered: TanreiBottomSheetStateTokens,
    public val focused: TanreiBottomSheetStateTokens,
    public val pressed: TanreiBottomSheetStateTokens,
    public val controls: TanreiBottomSheetControls,
) {
    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> 1f
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        containerElevation.forEach { add(it.role) }
        addAll(contentColor.roles())
        addAll(dividerColor.roles())
        addAll(headlineColor.roles())
        addAll(scrimColor.roles())
        addAll(controls.referencedRoles())
    }
}

/**
 * A part of breadcrumbs: the key of one entry of [TanreiBreadcrumbsParts]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Item].
 */
@JvmInline
public value class TanreiBreadcrumbsPart(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Item: TanreiBreadcrumbsPart = TanreiBreadcrumbsPart("item")
        public val Current: TanreiBreadcrumbsPart = TanreiBreadcrumbsPart("current")
        public val Overflow: TanreiBreadcrumbsPart = TanreiBreadcrumbsPart("overflow")
    }
}

/** What one part of breadcrumbs draws in one interaction state. */
@Immutable
public data class TanreiBreadcrumbsPartStateTokens(
    public val containerColor: TanreiPaint,
    public val contentColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(contentColor.roles())
        addAll(stateLayerColor.roles())
    }
}

/** One part of breadcrumbs: a full set of tokens per interaction state. */
@Immutable
public data class TanreiBreadcrumbsPartTokens(
    public val enabled: TanreiBreadcrumbsPartStateTokens,
    public val hovered: TanreiBreadcrumbsPartStateTokens,
    public val focused: TanreiBreadcrumbsPartStateTokens,
    public val pressed: TanreiBreadcrumbsPartStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiBreadcrumbsPartStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> enabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles()
}

/**
 * Every part of breadcrumbs: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiBreadcrumbsParts(
    public val item: TanreiBreadcrumbsPartTokens,
    public val current: TanreiBreadcrumbsPartTokens,
    public val overflow: TanreiBreadcrumbsPartTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiBreadcrumbsPart, TanreiBreadcrumbsPartTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiBreadcrumbsPart> get() = linkedSetOf(TanreiBreadcrumbsPart.Item, TanreiBreadcrumbsPart.Current, TanreiBreadcrumbsPart.Overflow) + extra.keys

    public operator fun contains(key: TanreiBreadcrumbsPart): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiBreadcrumbsPart): TanreiBreadcrumbsPartTokens? = when (key) {
        TanreiBreadcrumbsPart.Item -> item
        TanreiBreadcrumbsPart.Current -> current
        TanreiBreadcrumbsPart.Overflow -> overflow
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [item]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiBreadcrumbsPart): TanreiBreadcrumbsPartTokens = find(key) ?: item

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(item.referencedRoles())
        addAll(current.referencedRoles())
        addAll(overflow.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of breadcrumbs shares in one interaction state. */
@Immutable
public data class TanreiBreadcrumbsStateTokens(
    public val containerShape: Dp,
    public val opacity: Float,
)

/** `comp.breadcrumbs`. Members are flat tokens, then per-state tokens, then one holder per axis (`parts[part]`). */
@Immutable
public data class TanreiBreadcrumbsTokens(
    public val containerGap: Dp,
    public val containerShape: Dp,
    public val iconSize: Dp,
    public val labelColor: TanreiPaint,
    public val labelTypescale: TanreiTextStyle,
    public val motionFeedbackDuration: Int,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val rowGap: Dp,
    public val separatorColor: TanreiPaint,
    public val separatorGap: Dp,
    public val separatorSize: Dp,
    public val underlineOffset: Dp,
    public val underlineVisibility: Float,
    public val underlineWidth: Dp,
    public val hovered: TanreiBreadcrumbsStateTokens,
    public val focused: TanreiBreadcrumbsStateTokens,
    public val pressed: TanreiBreadcrumbsStateTokens,
    public val parts: TanreiBreadcrumbsParts,
) {
    /** `container-shape` of [state]. */
    public fun containerShape(state: TanreiInteractionState): Dp = when (state) {
        TanreiInteractionState.Enabled -> containerShape
        TanreiInteractionState.Hovered -> hovered.containerShape
        TanreiInteractionState.Focused -> focused.containerShape
        TanreiInteractionState.Pressed -> pressed.containerShape
        TanreiInteractionState.Disabled -> containerShape
    }

    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> 1f
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(labelColor.roles())
        addAll(separatorColor.roles())
        addAll(parts.referencedRoles())
    }
}

/** `comp.button-group`. Members are flat tokens, then per-state tokens, then one holder per axis (). */
@Immutable
public data class TanreiButtonGroupTokens(
    public val connectedDividerColor: TanreiPaint,
    public val connectedDividerInset: Dp,
    public val connectedDividerOnFillColor: TanreiPaint,
    public val connectedDividerThickness: Dp,
    public val connectedGap: Dp,
    public val connectedHorizontalOuterInset: Dp,
    public val connectedHorizontalOuterShape: Dp,
    public val connectedInnerShape: Dp,
    public val connectedSeparation: Float,
    public val connectedVerticalOuterShape: Dp,
    public val standardGap: Dp,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(connectedDividerColor.roles())
        addAll(connectedDividerOnFillColor.roles())
    }
}

/**
 * A size of button-with-menu: the key of one entry of [TanreiButtonWithMenuSizes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Medium].
 */
@JvmInline
public value class TanreiButtonWithMenuSize(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Small: TanreiButtonWithMenuSize = TanreiButtonWithMenuSize("small")
        public val Medium: TanreiButtonWithMenuSize = TanreiButtonWithMenuSize("medium")
        public val Large: TanreiButtonWithMenuSize = TanreiButtonWithMenuSize("large")
    }
}

/** The tokens of one size of button-with-menu. */
@Immutable
public data class TanreiButtonWithMenuSizeTokens(
    public val containerHeight: Dp,
    public val containerPaddingBlock: Dp,
    public val containerGap: Dp,
    public val leadingPaddingInlineStart: Dp,
    public val leadingPaddingInlineStartWithIcon: Dp,
    public val leadingPaddingInlineEnd: Dp,
    public val trailingPaddingInline: Dp,
    public val trailingPaddingInlineNarrow: Dp,
    public val labelTypescale: TanreiTextStyle,
    public val iconSize: Dp,
    public val outlineWidth: Dp,
)

/**
 * Every size of button-with-menu: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiButtonWithMenuSizes(
    public val small: TanreiButtonWithMenuSizeTokens,
    public val medium: TanreiButtonWithMenuSizeTokens,
    public val large: TanreiButtonWithMenuSizeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiButtonWithMenuSize, TanreiButtonWithMenuSizeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiButtonWithMenuSize> get() = linkedSetOf(TanreiButtonWithMenuSize.Small, TanreiButtonWithMenuSize.Medium, TanreiButtonWithMenuSize.Large) + extra.keys

    public operator fun contains(key: TanreiButtonWithMenuSize): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiButtonWithMenuSize): TanreiButtonWithMenuSizeTokens? = when (key) {
        TanreiButtonWithMenuSize.Small -> small
        TanreiButtonWithMenuSize.Medium -> medium
        TanreiButtonWithMenuSize.Large -> large
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [medium]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiButtonWithMenuSize): TanreiButtonWithMenuSizeTokens = find(key) ?: medium
}

/**
 * A variant of button-with-menu: the key of one entry of [TanreiButtonWithMenuVariants]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Filled].
 */
@JvmInline
public value class TanreiButtonWithMenuVariant(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Filled: TanreiButtonWithMenuVariant = TanreiButtonWithMenuVariant("filled")
        public val Tonal: TanreiButtonWithMenuVariant = TanreiButtonWithMenuVariant("tonal")
        public val Elevated: TanreiButtonWithMenuVariant = TanreiButtonWithMenuVariant("elevated")
        public val Outlined: TanreiButtonWithMenuVariant = TanreiButtonWithMenuVariant("outlined")
    }
}

/** What one variant of button-with-menu draws in one interaction state. */
@Immutable
public data class TanreiButtonWithMenuVariantStateTokens(
    public val containerColor: TanreiPaint,
    public val containerElevation: List<TanreiShadowLayer>,
    public val labelColor: TanreiPaint,
    public val outlineColor: TanreiPaint,
    public val dividerColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        containerElevation.forEach { add(it.role) }
        addAll(labelColor.roles())
        addAll(outlineColor.roles())
        addAll(dividerColor.roles())
        addAll(stateLayerColor.roles())
    }
}

/** One variant of button-with-menu: a full set of tokens per interaction state. */
@Immutable
public data class TanreiButtonWithMenuVariantTokens(
    public val enabled: TanreiButtonWithMenuVariantStateTokens,
    public val hovered: TanreiButtonWithMenuVariantStateTokens,
    public val focused: TanreiButtonWithMenuVariantStateTokens,
    public val pressed: TanreiButtonWithMenuVariantStateTokens,
    public val disabled: TanreiButtonWithMenuVariantStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiButtonWithMenuVariantStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every variant of button-with-menu: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiButtonWithMenuVariants(
    public val filled: TanreiButtonWithMenuVariantTokens,
    public val tonal: TanreiButtonWithMenuVariantTokens,
    public val elevated: TanreiButtonWithMenuVariantTokens,
    public val outlined: TanreiButtonWithMenuVariantTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiButtonWithMenuVariant, TanreiButtonWithMenuVariantTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiButtonWithMenuVariant> get() = linkedSetOf(TanreiButtonWithMenuVariant.Filled, TanreiButtonWithMenuVariant.Tonal, TanreiButtonWithMenuVariant.Elevated, TanreiButtonWithMenuVariant.Outlined) + extra.keys

    public operator fun contains(key: TanreiButtonWithMenuVariant): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiButtonWithMenuVariant): TanreiButtonWithMenuVariantTokens? = when (key) {
        TanreiButtonWithMenuVariant.Filled -> filled
        TanreiButtonWithMenuVariant.Tonal -> tonal
        TanreiButtonWithMenuVariant.Elevated -> elevated
        TanreiButtonWithMenuVariant.Outlined -> outlined
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [filled]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiButtonWithMenuVariant): TanreiButtonWithMenuVariantTokens = find(key) ?: filled

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(filled.referencedRoles())
        addAll(tonal.referencedRoles())
        addAll(elevated.referencedRoles())
        addAll(outlined.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of button-with-menu shares in one interaction state. */
@Immutable
public data class TanreiButtonWithMenuStateTokens(
    public val containerShape: Dp,
    public val opacity: Float,
)

/** `comp.button-with-menu`. Members are flat tokens, then per-state tokens, then one holder per axis (`sizes[size]`, `variants[variant]`). */
@Immutable
public data class TanreiButtonWithMenuTokens(
    public val containerInnerGap: Dp,
    public val containerInnerShape: Dp,
    public val containerInnerShapeOpen: Dp,
    public val containerOuterInset: Dp,
    public val containerSeparation: Float,
    public val containerShape: Dp,
    public val dividerInset: Dp,
    public val dividerThickness: Dp,
    public val motionFeedbackDuration: Int,
    public val motionHoverCloseDelay: Int,
    public val motionHoverOpenDelay: Int,
    public val motionOpenDuration: Int,
    public val motionOpenEasing: TanreiCubicBezier,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val hovered: TanreiButtonWithMenuStateTokens,
    public val focused: TanreiButtonWithMenuStateTokens,
    public val pressed: TanreiButtonWithMenuStateTokens,
    public val disabled: TanreiButtonWithMenuStateTokens,
    public val sizes: TanreiButtonWithMenuSizes,
    public val variants: TanreiButtonWithMenuVariants,
) {
    /** `container-shape` of [state]. */
    public fun containerShape(state: TanreiInteractionState): Dp = when (state) {
        TanreiInteractionState.Enabled -> containerShape
        TanreiInteractionState.Hovered -> hovered.containerShape
        TanreiInteractionState.Focused -> focused.containerShape
        TanreiInteractionState.Pressed -> pressed.containerShape
        TanreiInteractionState.Disabled -> disabled.containerShape
    }

    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(variants.referencedRoles())
    }
}

/**
 * A size of button: the key of one entry of [TanreiButtonSizes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Medium].
 */
@JvmInline
public value class TanreiButtonSize(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Small: TanreiButtonSize = TanreiButtonSize("small")
        public val Medium: TanreiButtonSize = TanreiButtonSize("medium")
        public val Large: TanreiButtonSize = TanreiButtonSize("large")
    }
}

/** The tokens of one size of button. */
@Immutable
public data class TanreiButtonSizeTokens(
    public val containerHeight: Dp,
    public val containerPaddingInlineNarrow: Dp,
    public val containerWidthWide: Dp,
    public val containerPaddingInlineStart: Dp,
    public val containerPaddingInlineEnd: Dp,
    public val containerPaddingInlineStartWithIcon: Dp,
    public val containerPaddingInlineEndWithIcon: Dp,
    public val containerPaddingBlock: Dp,
    public val labelTypescale: TanreiTextStyle,
    public val iconSize: Dp,
    public val iconSizeWithoutLabel: Dp,
    public val containerGap: Dp,
    public val outlineWidth: Dp,
    public val motionStateDuration: Int,
)

/**
 * Every size of button: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiButtonSizes(
    public val small: TanreiButtonSizeTokens,
    public val medium: TanreiButtonSizeTokens,
    public val large: TanreiButtonSizeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiButtonSize, TanreiButtonSizeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiButtonSize> get() = linkedSetOf(TanreiButtonSize.Small, TanreiButtonSize.Medium, TanreiButtonSize.Large) + extra.keys

    public operator fun contains(key: TanreiButtonSize): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiButtonSize): TanreiButtonSizeTokens? = when (key) {
        TanreiButtonSize.Small -> small
        TanreiButtonSize.Medium -> medium
        TanreiButtonSize.Large -> large
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [medium]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiButtonSize): TanreiButtonSizeTokens = find(key) ?: medium
}

/**
 * A variant of button: the key of one entry of [TanreiButtonVariants]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Filled].
 */
@JvmInline
public value class TanreiButtonVariant(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Filled: TanreiButtonVariant = TanreiButtonVariant("filled")
        public val Tonal: TanreiButtonVariant = TanreiButtonVariant("tonal")
        public val Elevated: TanreiButtonVariant = TanreiButtonVariant("elevated")
        public val Outlined: TanreiButtonVariant = TanreiButtonVariant("outlined")
        public val Text: TanreiButtonVariant = TanreiButtonVariant("text")
    }
}

/** What one variant of button draws in one interaction state. */
@Immutable
public data class TanreiButtonVariantStateTokens(
    public val containerColor: TanreiPaint,
    public val labelColor: TanreiPaint,
    public val iconColor: TanreiPaint,
    public val outlineColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
    public val containerElevation: List<TanreiShadowLayer>,
    public val unselectedContainerColor: TanreiPaint,
    public val unselectedLabelColor: TanreiPaint,
    public val unselectedIconColor: TanreiPaint,
    public val unselectedOutlineColor: TanreiPaint,
    public val unselectedStateLayerColor: TanreiPaint,
    public val selectedContainerColor: TanreiPaint,
    public val selectedLabelColor: TanreiPaint,
    public val selectedIconColor: TanreiPaint,
    public val selectedOutlineColor: TanreiPaint,
    public val selectedStateLayerColor: TanreiPaint,
    public val destructiveContainerColor: TanreiPaint,
    public val destructiveLabelColor: TanreiPaint,
    public val destructiveIconColor: TanreiPaint,
    public val destructiveOutlineColor: TanreiPaint,
    public val destructiveStateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(labelColor.roles())
        addAll(iconColor.roles())
        addAll(outlineColor.roles())
        addAll(stateLayerColor.roles())
        containerElevation.forEach { add(it.role) }
        addAll(unselectedContainerColor.roles())
        addAll(unselectedLabelColor.roles())
        addAll(unselectedIconColor.roles())
        addAll(unselectedOutlineColor.roles())
        addAll(unselectedStateLayerColor.roles())
        addAll(selectedContainerColor.roles())
        addAll(selectedLabelColor.roles())
        addAll(selectedIconColor.roles())
        addAll(selectedOutlineColor.roles())
        addAll(selectedStateLayerColor.roles())
        addAll(destructiveContainerColor.roles())
        addAll(destructiveLabelColor.roles())
        addAll(destructiveIconColor.roles())
        addAll(destructiveOutlineColor.roles())
        addAll(destructiveStateLayerColor.roles())
    }
}

/** One variant of button: a full set of tokens per interaction state. */
@Immutable
public data class TanreiButtonVariantTokens(
    public val enabled: TanreiButtonVariantStateTokens,
    public val hovered: TanreiButtonVariantStateTokens,
    public val focused: TanreiButtonVariantStateTokens,
    public val pressed: TanreiButtonVariantStateTokens,
    public val disabled: TanreiButtonVariantStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiButtonVariantStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every variant of button: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiButtonVariants(
    public val filled: TanreiButtonVariantTokens,
    public val tonal: TanreiButtonVariantTokens,
    public val elevated: TanreiButtonVariantTokens,
    public val outlined: TanreiButtonVariantTokens,
    public val text: TanreiButtonVariantTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiButtonVariant, TanreiButtonVariantTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiButtonVariant> get() = linkedSetOf(TanreiButtonVariant.Filled, TanreiButtonVariant.Tonal, TanreiButtonVariant.Elevated, TanreiButtonVariant.Outlined, TanreiButtonVariant.Text) + extra.keys

    public operator fun contains(key: TanreiButtonVariant): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiButtonVariant): TanreiButtonVariantTokens? = when (key) {
        TanreiButtonVariant.Filled -> filled
        TanreiButtonVariant.Tonal -> tonal
        TanreiButtonVariant.Elevated -> elevated
        TanreiButtonVariant.Outlined -> outlined
        TanreiButtonVariant.Text -> text
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [filled]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiButtonVariant): TanreiButtonVariantTokens = find(key) ?: filled

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(filled.referencedRoles())
        addAll(tonal.referencedRoles())
        addAll(elevated.referencedRoles())
        addAll(outlined.referencedRoles())
        addAll(text.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of button shares in one interaction state. */
@Immutable
public data class TanreiButtonStateTokens(
    public val containerShape: Dp,
    public val opacity: Float,
)

/** `comp.button`. Members are flat tokens, then per-state tokens, then one holder per axis (`sizes[size]`, `variants[variant]`). */
@Immutable
public data class TanreiButtonTokens(
    public val busyIndicatorThickness: Dp,
    public val containerShape: Dp,
    public val motionBusyCycleDuration: Int,
    public val motionFeedbackDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val toneContainerOpacity: Float,
    public val hovered: TanreiButtonStateTokens,
    public val focused: TanreiButtonStateTokens,
    public val pressed: TanreiButtonStateTokens,
    public val disabled: TanreiButtonStateTokens,
    public val sizes: TanreiButtonSizes,
    public val variants: TanreiButtonVariants,
) {
    /** `container-shape` of [state]. */
    public fun containerShape(state: TanreiInteractionState): Dp = when (state) {
        TanreiInteractionState.Enabled -> containerShape
        TanreiInteractionState.Hovered -> hovered.containerShape
        TanreiInteractionState.Focused -> focused.containerShape
        TanreiInteractionState.Pressed -> pressed.containerShape
        TanreiInteractionState.Disabled -> disabled.containerShape
    }

    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(variants.referencedRoles())
    }
}

/**
 * A condition of calendar: the key of one entry of [TanreiCalendarConditions]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Unselected].
 */
@JvmInline
public value class TanreiCalendarCondition(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Unselected: TanreiCalendarCondition = TanreiCalendarCondition("unselected")
        public val Adjacent: TanreiCalendarCondition = TanreiCalendarCondition("adjacent")
        public val Today: TanreiCalendarCondition = TanreiCalendarCondition("today")
        public val Selected: TanreiCalendarCondition = TanreiCalendarCondition("selected")
        public val InRange: TanreiCalendarCondition = TanreiCalendarCondition("in-range")
    }
}

/** What one condition of calendar draws in one interaction state. */
@Immutable
public data class TanreiCalendarConditionStateTokens(
    public val containerColor: TanreiPaint,
    public val labelColor: TanreiPaint,
    public val outlineColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(labelColor.roles())
        addAll(outlineColor.roles())
        addAll(stateLayerColor.roles())
    }
}

/** One condition of calendar: a full set of tokens per interaction state. */
@Immutable
public data class TanreiCalendarConditionTokens(
    public val enabled: TanreiCalendarConditionStateTokens,
    public val hovered: TanreiCalendarConditionStateTokens,
    public val focused: TanreiCalendarConditionStateTokens,
    public val pressed: TanreiCalendarConditionStateTokens,
    public val disabled: TanreiCalendarConditionStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiCalendarConditionStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every condition of calendar: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiCalendarConditions(
    public val unselected: TanreiCalendarConditionTokens,
    public val adjacent: TanreiCalendarConditionTokens,
    public val today: TanreiCalendarConditionTokens,
    public val selected: TanreiCalendarConditionTokens,
    public val inRange: TanreiCalendarConditionTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiCalendarCondition, TanreiCalendarConditionTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiCalendarCondition> get() = linkedSetOf(TanreiCalendarCondition.Unselected, TanreiCalendarCondition.Adjacent, TanreiCalendarCondition.Today, TanreiCalendarCondition.Selected, TanreiCalendarCondition.InRange) + extra.keys

    public operator fun contains(key: TanreiCalendarCondition): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiCalendarCondition): TanreiCalendarConditionTokens? = when (key) {
        TanreiCalendarCondition.Unselected -> unselected
        TanreiCalendarCondition.Adjacent -> adjacent
        TanreiCalendarCondition.Today -> today
        TanreiCalendarCondition.Selected -> selected
        TanreiCalendarCondition.InRange -> inRange
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [unselected]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiCalendarCondition): TanreiCalendarConditionTokens = find(key) ?: unselected

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(unselected.referencedRoles())
        addAll(adjacent.referencedRoles())
        addAll(today.referencedRoles())
        addAll(selected.referencedRoles())
        addAll(inRange.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of calendar shares in one interaction state. */
@Immutable
public data class TanreiCalendarStateTokens(
    public val opacity: Float,
)

/** `comp.calendar`. Members are flat tokens, then per-state tokens, then one holder per axis (`conditions[condition]`). */
@Immutable
public data class TanreiCalendarTokens(
    public val cellSize: Dp,
    public val dayContainerShape: Dp,
    public val dayContainerSize: Dp,
    public val dayLabelTypescale: TanreiTextStyle,
    public val motionFeedbackDuration: Int,
    public val motionPageDuration: Int,
    public val motionPageEasing: TanreiCubicBezier,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val navigationAxis: Float,
    public val navigationGap: Dp,
    public val outlineWidth: Dp,
    public val viewToggleContainerHeight: Dp,
    public val viewToggleContainerPaddingInline: Dp,
    public val viewToggleContainerShape: Dp,
    public val viewToggleGap: Dp,
    public val viewToggleIconSize: Dp,
    public val viewToggleLabelTypescale: TanreiTextStyle,
    public val weekdayColor: TanreiPaint,
    public val weekdayTypescale: TanreiTextStyle,
    public val yearContainerHeight: Dp,
    public val yearContainerShape: Dp,
    public val yearContainerWidth: Dp,
    public val yearLabelTypescale: TanreiTextStyle,
    public val hovered: TanreiCalendarStateTokens,
    public val focused: TanreiCalendarStateTokens,
    public val pressed: TanreiCalendarStateTokens,
    public val disabled: TanreiCalendarStateTokens,
    public val conditions: TanreiCalendarConditions,
) {
    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(weekdayColor.roles())
        addAll(conditions.referencedRoles())
    }
}

/**
 * A size of callout: the key of one entry of [TanreiCalloutSizes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Medium].
 */
@JvmInline
public value class TanreiCalloutSize(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Medium: TanreiCalloutSize = TanreiCalloutSize("medium")
        public val Large: TanreiCalloutSize = TanreiCalloutSize("large")
    }
}

/** The tokens of one size of callout. */
@Immutable
public data class TanreiCalloutSizeTokens(
    public val titleTypescale: TanreiTextStyle,
    public val bodyTypescale: TanreiTextStyle,
)

/**
 * Every size of callout: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiCalloutSizes(
    public val medium: TanreiCalloutSizeTokens,
    public val large: TanreiCalloutSizeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiCalloutSize, TanreiCalloutSizeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiCalloutSize> get() = linkedSetOf(TanreiCalloutSize.Medium, TanreiCalloutSize.Large) + extra.keys

    public operator fun contains(key: TanreiCalloutSize): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiCalloutSize): TanreiCalloutSizeTokens? = when (key) {
        TanreiCalloutSize.Medium -> medium
        TanreiCalloutSize.Large -> large
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [medium]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiCalloutSize): TanreiCalloutSizeTokens = find(key) ?: medium
}

/**
 * A variant of callout: the key of one entry of [TanreiCalloutVariants]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Tonal].
 */
@JvmInline
public value class TanreiCalloutVariant(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Tonal: TanreiCalloutVariant = TanreiCalloutVariant("tonal")
        public val Outlined: TanreiCalloutVariant = TanreiCalloutVariant("outlined")
    }
}

/** The tokens of one variant of callout. */
@Immutable
public data class TanreiCalloutVariantTokens(
    public val containerColor: TanreiPaint,
    public val titleColor: TanreiPaint,
    public val bodyColor: TanreiPaint,
    public val iconColor: TanreiPaint,
    public val infoContainerColor: TanreiPaint,
    public val infoTitleColor: TanreiPaint,
    public val infoBodyColor: TanreiPaint,
    public val infoIconColor: TanreiPaint,
    public val warningContainerColor: TanreiPaint,
    public val warningTitleColor: TanreiPaint,
    public val warningBodyColor: TanreiPaint,
    public val warningIconColor: TanreiPaint,
    public val errorContainerColor: TanreiPaint,
    public val errorTitleColor: TanreiPaint,
    public val errorBodyColor: TanreiPaint,
    public val errorIconColor: TanreiPaint,
    public val successContainerColor: TanreiPaint,
    public val successTitleColor: TanreiPaint,
    public val successBodyColor: TanreiPaint,
    public val successIconColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(titleColor.roles())
        addAll(bodyColor.roles())
        addAll(iconColor.roles())
        addAll(infoContainerColor.roles())
        addAll(infoTitleColor.roles())
        addAll(infoBodyColor.roles())
        addAll(infoIconColor.roles())
        addAll(warningContainerColor.roles())
        addAll(warningTitleColor.roles())
        addAll(warningBodyColor.roles())
        addAll(warningIconColor.roles())
        addAll(errorContainerColor.roles())
        addAll(errorTitleColor.roles())
        addAll(errorBodyColor.roles())
        addAll(errorIconColor.roles())
        addAll(successContainerColor.roles())
        addAll(successTitleColor.roles())
        addAll(successBodyColor.roles())
        addAll(successIconColor.roles())
    }
}

/**
 * Every variant of callout: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiCalloutVariants(
    public val tonal: TanreiCalloutVariantTokens,
    public val outlined: TanreiCalloutVariantTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiCalloutVariant, TanreiCalloutVariantTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiCalloutVariant> get() = linkedSetOf(TanreiCalloutVariant.Tonal, TanreiCalloutVariant.Outlined) + extra.keys

    public operator fun contains(key: TanreiCalloutVariant): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiCalloutVariant): TanreiCalloutVariantTokens? = when (key) {
        TanreiCalloutVariant.Tonal -> tonal
        TanreiCalloutVariant.Outlined -> outlined
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [tonal]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiCalloutVariant): TanreiCalloutVariantTokens = find(key) ?: tonal

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(tonal.referencedRoles())
        addAll(outlined.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** `comp.callout`. Members are flat tokens, then per-state tokens, then one holder per axis (`sizes[size]`, `variants[variant]`). */
@Immutable
public data class TanreiCalloutTokens(
    public val actionsGap: Dp,
    public val actionsItemGap: Dp,
    public val closeButtonVariant: Float,
    public val containerGap: Dp,
    public val containerPaddingBlock: Dp,
    public val containerPaddingInline: Dp,
    public val containerPaddingInlineEndWithClose: Dp,
    public val containerShape: Dp,
    public val iconGap: Dp,
    public val iconOpacity: Float,
    public val iconSize: Dp,
    public val outlineColor: TanreiPaint,
    public val outlineWidth: Dp,
    public val titleGap: Dp,
    public val sizes: TanreiCalloutSizes,
    public val variants: TanreiCalloutVariants,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(outlineColor.roles())
        addAll(variants.referencedRoles())
    }
}

/**
 * A variant of card: the key of one entry of [TanreiCardVariants]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Outlined].
 */
@JvmInline
public value class TanreiCardVariant(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Elevated: TanreiCardVariant = TanreiCardVariant("elevated")
        public val Filled: TanreiCardVariant = TanreiCardVariant("filled")
        public val Outlined: TanreiCardVariant = TanreiCardVariant("outlined")
    }
}

/** What one variant of card draws in one interaction state. */
@Immutable
public data class TanreiCardVariantStateTokens(
    public val containerColor: TanreiPaint,
    public val containerElevation: List<TanreiShadowLayer>,
    public val outlineColor: TanreiPaint,
    public val contentColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        containerElevation.forEach { add(it.role) }
        addAll(outlineColor.roles())
        addAll(contentColor.roles())
        addAll(stateLayerColor.roles())
    }
}

/** One variant of card: a full set of tokens per interaction state. */
@Immutable
public data class TanreiCardVariantTokens(
    public val enabled: TanreiCardVariantStateTokens,
    public val hovered: TanreiCardVariantStateTokens,
    public val focused: TanreiCardVariantStateTokens,
    public val pressed: TanreiCardVariantStateTokens,
    public val disabled: TanreiCardVariantStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiCardVariantStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every variant of card: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiCardVariants(
    public val elevated: TanreiCardVariantTokens,
    public val filled: TanreiCardVariantTokens,
    public val outlined: TanreiCardVariantTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiCardVariant, TanreiCardVariantTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiCardVariant> get() = linkedSetOf(TanreiCardVariant.Elevated, TanreiCardVariant.Filled, TanreiCardVariant.Outlined) + extra.keys

    public operator fun contains(key: TanreiCardVariant): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiCardVariant): TanreiCardVariantTokens? = when (key) {
        TanreiCardVariant.Elevated -> elevated
        TanreiCardVariant.Filled -> filled
        TanreiCardVariant.Outlined -> outlined
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [outlined]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiCardVariant): TanreiCardVariantTokens = find(key) ?: outlined

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(elevated.referencedRoles())
        addAll(filled.referencedRoles())
        addAll(outlined.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of card shares in one interaction state. */
@Immutable
public data class TanreiCardStateTokens(
    public val opacity: Float,
)

/** `comp.card`. Members are flat tokens, then per-state tokens, then one holder per axis (`variants[variant]`). */
@Immutable
public data class TanreiCardTokens(
    public val containerPadding: Dp,
    public val containerShape: Dp,
    public val motionFeedbackDuration: Int,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val outlineWidth: Dp,
    public val hovered: TanreiCardStateTokens,
    public val focused: TanreiCardStateTokens,
    public val pressed: TanreiCardStateTokens,
    public val disabled: TanreiCardStateTokens,
    public val variants: TanreiCardVariants,
) {
    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(variants.referencedRoles())
    }
}

/**
 * A part of carousel: the key of one entry of [TanreiCarouselParts]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Item].
 */
@JvmInline
public value class TanreiCarouselPart(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Item: TanreiCarouselPart = TanreiCarouselPart("item")
        public val Playback: TanreiCarouselPart = TanreiCarouselPart("playback")
        public val Indicator: TanreiCarouselPart = TanreiCarouselPart("indicator")
    }
}

/** What one part of carousel draws in one interaction state. */
@Immutable
public data class TanreiCarouselPartStateTokens(
    public val containerColor: TanreiPaint,
    public val contentColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(contentColor.roles())
        addAll(stateLayerColor.roles())
    }
}

/** One part of carousel: a full set of tokens per interaction state. */
@Immutable
public data class TanreiCarouselPartTokens(
    public val enabled: TanreiCarouselPartStateTokens,
    public val hovered: TanreiCarouselPartStateTokens,
    public val focused: TanreiCarouselPartStateTokens,
    public val pressed: TanreiCarouselPartStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiCarouselPartStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> enabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles()
}

/**
 * Every part of carousel: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiCarouselParts(
    public val item: TanreiCarouselPartTokens,
    public val playback: TanreiCarouselPartTokens,
    public val indicator: TanreiCarouselPartTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiCarouselPart, TanreiCarouselPartTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiCarouselPart> get() = linkedSetOf(TanreiCarouselPart.Item, TanreiCarouselPart.Playback, TanreiCarouselPart.Indicator) + extra.keys

    public operator fun contains(key: TanreiCarouselPart): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiCarouselPart): TanreiCarouselPartTokens? = when (key) {
        TanreiCarouselPart.Item -> item
        TanreiCarouselPart.Playback -> playback
        TanreiCarouselPart.Indicator -> indicator
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [item]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiCarouselPart): TanreiCarouselPartTokens = find(key) ?: item

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(item.referencedRoles())
        addAll(playback.referencedRoles())
        addAll(indicator.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of carousel shares in one interaction state. */
@Immutable
public data class TanreiCarouselStateTokens(
    public val containerShape: Dp,
    public val opacity: Float,
)

/** `comp.carousel`. Members are flat tokens, then per-state tokens, then one holder per axis (`parts[part]`). */
@Immutable
public data class TanreiCarouselTokens(
    public val autoplayInterval: Int,
    public val containerLargeWidth: Dp,
    public val containerMinScale: Float,
    public val containerShape: Dp,
    public val containerSmallMaxWidth: Dp,
    public val containerSmallMinWidth: Dp,
    public val controlsButtonSize: Dp,
    public val controlsHeight: Dp,
    public val controlsIconSize: Dp,
    public val controlsIndicatorPaddingInline: Dp,
    public val controlsShape: Dp,
    public val dotActiveWidth: Dp,
    public val dotColor: TanreiPaint,
    public val dotGap: Dp,
    public val dotSize: Dp,
    public val layoutGap: Dp,
    public val layoutHeight: Dp,
    public val layoutPaddingInline: Dp,
    public val motionAutoplayDuration: Int,
    public val motionAutoplayEasing: TanreiCubicBezier,
    public val motionFeedbackDuration: Int,
    public val motionScrollDuration: Int,
    public val motionScrollEasing: TanreiCubicBezier,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val navigationButtonVariant: Float,
    public val hovered: TanreiCarouselStateTokens,
    public val focused: TanreiCarouselStateTokens,
    public val pressed: TanreiCarouselStateTokens,
    public val parts: TanreiCarouselParts,
) {
    /** `container-shape` of [state]. */
    public fun containerShape(state: TanreiInteractionState): Dp = when (state) {
        TanreiInteractionState.Enabled -> containerShape
        TanreiInteractionState.Hovered -> hovered.containerShape
        TanreiInteractionState.Focused -> focused.containerShape
        TanreiInteractionState.Pressed -> pressed.containerShape
        TanreiInteractionState.Disabled -> containerShape
    }

    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> 1f
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(dotColor.roles())
        addAll(parts.referencedRoles())
    }
}

/**
 * A condition of chat-composer: the key of one entry of [TanreiChatComposerConditions]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Standard].
 */
@JvmInline
public value class TanreiChatComposerCondition(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Standard: TanreiChatComposerCondition = TanreiChatComposerCondition("standard")
        public val Error: TanreiChatComposerCondition = TanreiChatComposerCondition("error")
    }
}

/** What one condition of chat-composer draws in one interaction state. */
@Immutable
public data class TanreiChatComposerConditionStateTokens(
    public val containerColor: TanreiPaint,
    public val containerElevation: List<TanreiShadowLayer>,
    public val outlineColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        containerElevation.forEach { add(it.role) }
        addAll(outlineColor.roles())
        addAll(stateLayerColor.roles())
    }
}

/** One condition of chat-composer: a full set of tokens per interaction state. */
@Immutable
public data class TanreiChatComposerConditionTokens(
    public val enabled: TanreiChatComposerConditionStateTokens,
    public val hovered: TanreiChatComposerConditionStateTokens,
    public val focused: TanreiChatComposerConditionStateTokens,
    public val disabled: TanreiChatComposerConditionStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiChatComposerConditionStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> enabled
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every condition of chat-composer: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiChatComposerConditions(
    public val standard: TanreiChatComposerConditionTokens,
    public val error: TanreiChatComposerConditionTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiChatComposerCondition, TanreiChatComposerConditionTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiChatComposerCondition> get() = linkedSetOf(TanreiChatComposerCondition.Standard, TanreiChatComposerCondition.Error) + extra.keys

    public operator fun contains(key: TanreiChatComposerCondition): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiChatComposerCondition): TanreiChatComposerConditionTokens? = when (key) {
        TanreiChatComposerCondition.Standard -> standard
        TanreiChatComposerCondition.Error -> error
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [standard]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiChatComposerCondition): TanreiChatComposerConditionTokens = find(key) ?: standard

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(standard.referencedRoles())
        addAll(error.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of chat-composer shares in one interaction state. */
@Immutable
public data class TanreiChatComposerStateTokens(
    public val opacity: Float,
    public val outlineWidth: Dp,
)

/** `comp.chat-composer`. Members are flat tokens, then per-state tokens, then one holder per axis (`conditions[condition]`). */
@Immutable
public data class TanreiChatComposerTokens(
    public val actionsGap: Dp,
    public val containerGap: Dp,
    public val containerHeight: Dp,
    public val containerPaddingBlock: Dp,
    public val containerPaddingInline: Dp,
    public val containerPaddingInlineWithButton: Dp,
    public val containerRowGap: Dp,
    public val containerShape: Dp,
    public val counterColor: TanreiPaint,
    public val counterErrorColor: TanreiPaint,
    public val counterTypescale: TanreiTextStyle,
    public val inputPaddingBlock: Dp,
    public val layoutInlineMinWidth: Dp,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val outlineWidth: Dp,
    public val receivingContainerColor: TanreiPaint,
    public val receivingOutlineColor: TanreiPaint,
    public val receivingOutlineWidth: Dp,
    public val sendButtonVariant: Float,
    public val stripGap: Dp,
    public val stripOffset: Dp,
    public val stripPaddingBlockStart: Dp,
    public val hovered: TanreiChatComposerStateTokens,
    public val focused: TanreiChatComposerStateTokens,
    public val disabled: TanreiChatComposerStateTokens,
    public val conditions: TanreiChatComposerConditions,
) {
    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> 1f
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    /** `outline-width` of [state]. */
    public fun outlineWidth(state: TanreiInteractionState): Dp = when (state) {
        TanreiInteractionState.Enabled -> outlineWidth
        TanreiInteractionState.Hovered -> hovered.outlineWidth
        TanreiInteractionState.Focused -> focused.outlineWidth
        TanreiInteractionState.Pressed -> outlineWidth
        TanreiInteractionState.Disabled -> disabled.outlineWidth
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(counterColor.roles())
        addAll(counterErrorColor.roles())
        addAll(receivingContainerColor.roles())
        addAll(receivingOutlineColor.roles())
        addAll(conditions.referencedRoles())
    }
}

/**
 * A condition of checkbox: the key of one entry of [TanreiCheckboxConditions]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Unselected].
 */
@JvmInline
public value class TanreiCheckboxCondition(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Unselected: TanreiCheckboxCondition = TanreiCheckboxCondition("unselected")
        public val Selected: TanreiCheckboxCondition = TanreiCheckboxCondition("selected")
        public val Indeterminate: TanreiCheckboxCondition = TanreiCheckboxCondition("indeterminate")
        public val ErrorUnselected: TanreiCheckboxCondition = TanreiCheckboxCondition("error-unselected")
        public val ErrorSelected: TanreiCheckboxCondition = TanreiCheckboxCondition("error-selected")
        public val ErrorIndeterminate: TanreiCheckboxCondition = TanreiCheckboxCondition("error-indeterminate")
    }
}

/** What one condition of checkbox draws in one interaction state. */
@Immutable
public data class TanreiCheckboxConditionStateTokens(
    public val containerColor: TanreiPaint,
    public val boxColor: TanreiPaint,
    public val markColor: TanreiPaint,
    public val outlineColor: TanreiPaint,
    public val labelColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(boxColor.roles())
        addAll(markColor.roles())
        addAll(outlineColor.roles())
        addAll(labelColor.roles())
        addAll(stateLayerColor.roles())
    }
}

/** One condition of checkbox: a full set of tokens per interaction state. */
@Immutable
public data class TanreiCheckboxConditionTokens(
    public val enabled: TanreiCheckboxConditionStateTokens,
    public val hovered: TanreiCheckboxConditionStateTokens,
    public val focused: TanreiCheckboxConditionStateTokens,
    public val pressed: TanreiCheckboxConditionStateTokens,
    public val disabled: TanreiCheckboxConditionStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiCheckboxConditionStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every condition of checkbox: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiCheckboxConditions(
    public val unselected: TanreiCheckboxConditionTokens,
    public val selected: TanreiCheckboxConditionTokens,
    public val indeterminate: TanreiCheckboxConditionTokens,
    public val errorUnselected: TanreiCheckboxConditionTokens,
    public val errorSelected: TanreiCheckboxConditionTokens,
    public val errorIndeterminate: TanreiCheckboxConditionTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiCheckboxCondition, TanreiCheckboxConditionTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiCheckboxCondition> get() = linkedSetOf(TanreiCheckboxCondition.Unselected, TanreiCheckboxCondition.Selected, TanreiCheckboxCondition.Indeterminate, TanreiCheckboxCondition.ErrorUnselected, TanreiCheckboxCondition.ErrorSelected, TanreiCheckboxCondition.ErrorIndeterminate) + extra.keys

    public operator fun contains(key: TanreiCheckboxCondition): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiCheckboxCondition): TanreiCheckboxConditionTokens? = when (key) {
        TanreiCheckboxCondition.Unselected -> unselected
        TanreiCheckboxCondition.Selected -> selected
        TanreiCheckboxCondition.Indeterminate -> indeterminate
        TanreiCheckboxCondition.ErrorUnselected -> errorUnselected
        TanreiCheckboxCondition.ErrorSelected -> errorSelected
        TanreiCheckboxCondition.ErrorIndeterminate -> errorIndeterminate
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [unselected]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiCheckboxCondition): TanreiCheckboxConditionTokens = find(key) ?: unselected

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(unselected.referencedRoles())
        addAll(selected.referencedRoles())
        addAll(indeterminate.referencedRoles())
        addAll(errorUnselected.referencedRoles())
        addAll(errorSelected.referencedRoles())
        addAll(errorIndeterminate.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of checkbox shares in one interaction state. */
@Immutable
public data class TanreiCheckboxStateTokens(
    public val containerShape: Dp,
    public val opacity: Float,
)

/** `comp.checkbox`. Members are flat tokens, then per-state tokens, then one holder per axis (`conditions[condition]`). */
@Immutable
public data class TanreiCheckboxTokens(
    public val boxShape: Dp,
    public val boxSize: Dp,
    public val containerShape: Dp,
    public val containerSize: Dp,
    public val labelGap: Dp,
    public val labelTypescale: TanreiTextStyle,
    public val markSize: Dp,
    public val markWeight: Float,
    public val markWidth: Dp,
    public val motionFeedbackDuration: Int,
    public val motionMarkEnterScale: Float,
    public val motionMarkScaleDuration: Int,
    public val motionMarkScaleEasing: TanreiCubicBezier,
    public val motionSelectionDuration: Int,
    public val motionSelectionEasing: TanreiCubicBezier,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val outlineWidth: Dp,
    public val hovered: TanreiCheckboxStateTokens,
    public val focused: TanreiCheckboxStateTokens,
    public val pressed: TanreiCheckboxStateTokens,
    public val disabled: TanreiCheckboxStateTokens,
    public val conditions: TanreiCheckboxConditions,
) {
    /** `container-shape` of [state]. */
    public fun containerShape(state: TanreiInteractionState): Dp = when (state) {
        TanreiInteractionState.Enabled -> containerShape
        TanreiInteractionState.Hovered -> hovered.containerShape
        TanreiInteractionState.Focused -> focused.containerShape
        TanreiInteractionState.Pressed -> pressed.containerShape
        TanreiInteractionState.Disabled -> disabled.containerShape
    }

    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(conditions.referencedRoles())
    }
}

/**
 * A size of chip: the key of one entry of [TanreiChipSizes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Medium].
 */
@JvmInline
public value class TanreiChipSize(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Small: TanreiChipSize = TanreiChipSize("small")
        public val Medium: TanreiChipSize = TanreiChipSize("medium")
    }
}

/** The tokens of one size of chip. */
@Immutable
public data class TanreiChipSizeTokens(
    public val containerHeight: Dp,
    public val containerPaddingInline: Dp,
    public val containerPaddingInlineWithIcon: Dp,
    public val containerPaddingInlineWithAvatar: Dp,
    public val containerPaddingInlineWithRemove: Dp,
    public val containerPaddingBlock: Dp,
    public val containerGap: Dp,
    public val labelTypescale: TanreiTextStyle,
    public val iconSize: Dp,
    public val avatarSize: Dp,
    public val removeContainerSize: Dp,
    public val motionStateDuration: Int,
)

/**
 * Every size of chip: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiChipSizes(
    public val small: TanreiChipSizeTokens,
    public val medium: TanreiChipSizeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiChipSize, TanreiChipSizeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiChipSize> get() = linkedSetOf(TanreiChipSize.Small, TanreiChipSize.Medium) + extra.keys

    public operator fun contains(key: TanreiChipSize): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiChipSize): TanreiChipSizeTokens? = when (key) {
        TanreiChipSize.Small -> small
        TanreiChipSize.Medium -> medium
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [medium]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiChipSize): TanreiChipSizeTokens = find(key) ?: medium
}

/**
 * A variant of chip: the key of one entry of [TanreiChipVariants]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Outlined].
 */
@JvmInline
public value class TanreiChipVariant(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Outlined: TanreiChipVariant = TanreiChipVariant("outlined")
        public val Elevated: TanreiChipVariant = TanreiChipVariant("elevated")
    }
}

/** What one variant of chip draws in one interaction state. */
@Immutable
public data class TanreiChipVariantStateTokens(
    public val containerColor: TanreiPaint,
    public val containerElevation: List<TanreiShadowLayer>,
    public val outlineColor: TanreiPaint,
    public val labelColor: TanreiPaint,
    public val iconColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
    public val removeContainerColor: TanreiPaint,
    public val removeIconColor: TanreiPaint,
    public val removeStateLayerColor: TanreiPaint,
    public val destructiveRemoveContainerColor: TanreiPaint,
    public val destructiveRemoveIconColor: TanreiPaint,
    public val destructiveRemoveStateLayerColor: TanreiPaint,
    public val selectedContainerColor: TanreiPaint,
    public val selectedContainerElevation: List<TanreiShadowLayer>,
    public val selectedOutlineColor: TanreiPaint,
    public val selectedLabelColor: TanreiPaint,
    public val selectedIconColor: TanreiPaint,
    public val selectedStateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        containerElevation.forEach { add(it.role) }
        addAll(outlineColor.roles())
        addAll(labelColor.roles())
        addAll(iconColor.roles())
        addAll(stateLayerColor.roles())
        addAll(removeContainerColor.roles())
        addAll(removeIconColor.roles())
        addAll(removeStateLayerColor.roles())
        addAll(destructiveRemoveContainerColor.roles())
        addAll(destructiveRemoveIconColor.roles())
        addAll(destructiveRemoveStateLayerColor.roles())
        addAll(selectedContainerColor.roles())
        selectedContainerElevation.forEach { add(it.role) }
        addAll(selectedOutlineColor.roles())
        addAll(selectedLabelColor.roles())
        addAll(selectedIconColor.roles())
        addAll(selectedStateLayerColor.roles())
    }
}

/** One variant of chip: a full set of tokens per interaction state. */
@Immutable
public data class TanreiChipVariantTokens(
    public val enabled: TanreiChipVariantStateTokens,
    public val hovered: TanreiChipVariantStateTokens,
    public val focused: TanreiChipVariantStateTokens,
    public val pressed: TanreiChipVariantStateTokens,
    public val disabled: TanreiChipVariantStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiChipVariantStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every variant of chip: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiChipVariants(
    public val outlined: TanreiChipVariantTokens,
    public val elevated: TanreiChipVariantTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiChipVariant, TanreiChipVariantTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiChipVariant> get() = linkedSetOf(TanreiChipVariant.Outlined, TanreiChipVariant.Elevated) + extra.keys

    public operator fun contains(key: TanreiChipVariant): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiChipVariant): TanreiChipVariantTokens? = when (key) {
        TanreiChipVariant.Outlined -> outlined
        TanreiChipVariant.Elevated -> elevated
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [outlined]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiChipVariant): TanreiChipVariantTokens = find(key) ?: outlined

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(outlined.referencedRoles())
        addAll(elevated.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of chip shares in one interaction state. */
@Immutable
public data class TanreiChipStateTokens(
    public val opacity: Float,
)

/** `comp.chip`. Members are flat tokens, then per-state tokens, then one holder per axis (`sizes[size]`, `variants[variant]`). */
@Immutable
public data class TanreiChipTokens(
    public val avatarShape: Dp,
    public val checkWeight: Float,
    public val containerShape: Dp,
    public val motionFeedbackDuration: Int,
    public val motionSelectionDuration: Int,
    public val motionSelectionEasing: TanreiCubicBezier,
    public val motionStateEasing: TanreiCubicBezier,
    public val outlineWidth: Dp,
    public val removeContainerShape: Dp,
    public val hovered: TanreiChipStateTokens,
    public val focused: TanreiChipStateTokens,
    public val pressed: TanreiChipStateTokens,
    public val disabled: TanreiChipStateTokens,
    public val sizes: TanreiChipSizes,
    public val variants: TanreiChipVariants,
) {
    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(variants.referencedRoles())
    }
}

/**
 * A size of code-block: the key of one entry of [TanreiCodeBlockSizes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Medium].
 */
@JvmInline
public value class TanreiCodeBlockSize(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Small: TanreiCodeBlockSize = TanreiCodeBlockSize("small")
        public val Medium: TanreiCodeBlockSize = TanreiCodeBlockSize("medium")
    }
}

/** The tokens of one size of code-block. */
@Immutable
public data class TanreiCodeBlockSizeTokens(
    public val codeTypescale: TanreiTextStyle,
    public val containerPaddingBlock: Dp,
    public val containerPaddingInline: Dp,
)

/**
 * Every size of code-block: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiCodeBlockSizes(
    public val small: TanreiCodeBlockSizeTokens,
    public val medium: TanreiCodeBlockSizeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiCodeBlockSize, TanreiCodeBlockSizeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiCodeBlockSize> get() = linkedSetOf(TanreiCodeBlockSize.Small, TanreiCodeBlockSize.Medium) + extra.keys

    public operator fun contains(key: TanreiCodeBlockSize): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiCodeBlockSize): TanreiCodeBlockSizeTokens? = when (key) {
        TanreiCodeBlockSize.Small -> small
        TanreiCodeBlockSize.Medium -> medium
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [medium]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiCodeBlockSize): TanreiCodeBlockSizeTokens = find(key) ?: medium
}

/**
 * A variant of code-block: the key of one entry of [TanreiCodeBlockVariants]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Filled].
 */
@JvmInline
public value class TanreiCodeBlockVariant(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Filled: TanreiCodeBlockVariant = TanreiCodeBlockVariant("filled")
        public val Outlined: TanreiCodeBlockVariant = TanreiCodeBlockVariant("outlined")
    }
}

/** The tokens of one variant of code-block. */
@Immutable
public data class TanreiCodeBlockVariantTokens(
    public val containerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
    }
}

/**
 * Every variant of code-block: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiCodeBlockVariants(
    public val filled: TanreiCodeBlockVariantTokens,
    public val outlined: TanreiCodeBlockVariantTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiCodeBlockVariant, TanreiCodeBlockVariantTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiCodeBlockVariant> get() = linkedSetOf(TanreiCodeBlockVariant.Filled, TanreiCodeBlockVariant.Outlined) + extra.keys

    public operator fun contains(key: TanreiCodeBlockVariant): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiCodeBlockVariant): TanreiCodeBlockVariantTokens? = when (key) {
        TanreiCodeBlockVariant.Filled -> filled
        TanreiCodeBlockVariant.Outlined -> outlined
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [filled]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiCodeBlockVariant): TanreiCodeBlockVariantTokens = find(key) ?: filled

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(filled.referencedRoles())
        addAll(outlined.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/**
 * A syntax of code-block: the key of one entry of [TanreiCodeBlockSyntaxs]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Comment].
 */
@JvmInline
public value class TanreiCodeBlockSyntax(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Comment: TanreiCodeBlockSyntax = TanreiCodeBlockSyntax("comment")
        public val Keyword: TanreiCodeBlockSyntax = TanreiCodeBlockSyntax("keyword")
        public val String: TanreiCodeBlockSyntax = TanreiCodeBlockSyntax("string")
        public val Constant: TanreiCodeBlockSyntax = TanreiCodeBlockSyntax("constant")
        public val Function: TanreiCodeBlockSyntax = TanreiCodeBlockSyntax("function")
        public val Type: TanreiCodeBlockSyntax = TanreiCodeBlockSyntax("type")
        public val Tag: TanreiCodeBlockSyntax = TanreiCodeBlockSyntax("tag")
        public val Property: TanreiCodeBlockSyntax = TanreiCodeBlockSyntax("property")
        public val Punctuation: TanreiCodeBlockSyntax = TanreiCodeBlockSyntax("punctuation")
    }
}

/** The tokens of one syntax of code-block. */
@Immutable
public data class TanreiCodeBlockSyntaxTokens(
    public val syntaxColor: TanreiPaint,
    public val syntaxEmphasis: Float,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(syntaxColor.roles())
    }
}

/**
 * Every syntax of code-block: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiCodeBlockSyntaxs(
    public val comment: TanreiCodeBlockSyntaxTokens,
    public val keyword: TanreiCodeBlockSyntaxTokens,
    public val string: TanreiCodeBlockSyntaxTokens,
    public val constant: TanreiCodeBlockSyntaxTokens,
    public val function: TanreiCodeBlockSyntaxTokens,
    public val type: TanreiCodeBlockSyntaxTokens,
    public val tag: TanreiCodeBlockSyntaxTokens,
    public val property: TanreiCodeBlockSyntaxTokens,
    public val punctuation: TanreiCodeBlockSyntaxTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiCodeBlockSyntax, TanreiCodeBlockSyntaxTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiCodeBlockSyntax> get() = linkedSetOf(TanreiCodeBlockSyntax.Comment, TanreiCodeBlockSyntax.Keyword, TanreiCodeBlockSyntax.String, TanreiCodeBlockSyntax.Constant, TanreiCodeBlockSyntax.Function, TanreiCodeBlockSyntax.Type, TanreiCodeBlockSyntax.Tag, TanreiCodeBlockSyntax.Property, TanreiCodeBlockSyntax.Punctuation) + extra.keys

    public operator fun contains(key: TanreiCodeBlockSyntax): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiCodeBlockSyntax): TanreiCodeBlockSyntaxTokens? = when (key) {
        TanreiCodeBlockSyntax.Comment -> comment
        TanreiCodeBlockSyntax.Keyword -> keyword
        TanreiCodeBlockSyntax.String -> string
        TanreiCodeBlockSyntax.Constant -> constant
        TanreiCodeBlockSyntax.Function -> function
        TanreiCodeBlockSyntax.Type -> type
        TanreiCodeBlockSyntax.Tag -> tag
        TanreiCodeBlockSyntax.Property -> property
        TanreiCodeBlockSyntax.Punctuation -> punctuation
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [comment]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiCodeBlockSyntax): TanreiCodeBlockSyntaxTokens = find(key) ?: comment

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(comment.referencedRoles())
        addAll(keyword.referencedRoles())
        addAll(string.referencedRoles())
        addAll(constant.referencedRoles())
        addAll(function.referencedRoles())
        addAll(type.referencedRoles())
        addAll(tag.referencedRoles())
        addAll(property.referencedRoles())
        addAll(punctuation.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** `comp.code-block`. Members are flat tokens, then per-state tokens, then one holder per axis (`sizes[size]`, `variants[variant]`, `syntaxs[syntax]`). */
@Immutable
public data class TanreiCodeBlockTokens(
    public val codeColor: TanreiPaint,
    public val codeTabSize: Float,
    public val containerShape: Dp,
    public val copyButtonInset: Dp,
    public val headerGap: Dp,
    public val headerPaddingBlockEnd: Dp,
    public val languageColor: TanreiPaint,
    public val languageTypescale: TanreiTextStyle,
    public val lineNumberColor: TanreiPaint,
    public val lineNumberGap: Dp,
    public val lineAddedContainerColor: TanreiPaint,
    public val lineAddedMarkColor: TanreiPaint,
    public val lineHighlightedContainerColor: TanreiPaint,
    public val lineHighlightedMarkColor: TanreiPaint,
    public val lineMarkWidth: Dp,
    public val lineRemovedContainerColor: TanreiPaint,
    public val lineRemovedMarkColor: TanreiPaint,
    public val outlineColor: TanreiPaint,
    public val outlineWidth: Dp,
    public val promptColor: TanreiPaint,
    public val syntaxMaxLength: Float,
    public val titleColor: TanreiPaint,
    public val titleTypescale: TanreiTextStyle,
    public val sizes: TanreiCodeBlockSizes,
    public val variants: TanreiCodeBlockVariants,
    public val syntaxs: TanreiCodeBlockSyntaxs,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(codeColor.roles())
        addAll(languageColor.roles())
        addAll(lineNumberColor.roles())
        addAll(lineAddedContainerColor.roles())
        addAll(lineAddedMarkColor.roles())
        addAll(lineHighlightedContainerColor.roles())
        addAll(lineHighlightedMarkColor.roles())
        addAll(lineRemovedContainerColor.roles())
        addAll(lineRemovedMarkColor.roles())
        addAll(outlineColor.roles())
        addAll(promptColor.roles())
        addAll(titleColor.roles())
        addAll(variants.referencedRoles())
        addAll(syntaxs.referencedRoles())
    }
}

/** `comp.color-input`. Members are flat tokens, then per-state tokens, then one holder per axis (). */
@Immutable
public data class TanreiColorInputTokens(
    public val swatchOutlineColor: TanreiPaint,
    public val swatchOutlineWidth: Dp,
    public val swatchShape: Dp,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(swatchOutlineColor.roles())
    }
}

/**
 * A variant of combobox: the key of one entry of [TanreiComboboxVariants]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Stacked].
 */
@JvmInline
public value class TanreiComboboxVariant(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Stacked: TanreiComboboxVariant = TanreiComboboxVariant("stacked")
        public val Filled: TanreiComboboxVariant = TanreiComboboxVariant("filled")
        public val Outlined: TanreiComboboxVariant = TanreiComboboxVariant("outlined")
    }
}

/** What one variant of combobox draws in one interaction state. */
@Immutable
public data class TanreiComboboxVariantStateTokens(
    public val optionContainerColor: TanreiPaint,
    public val optionLabelColor: TanreiPaint,
    public val optionSupportingTextColor: TanreiPaint,
    public val optionLeadingIconColor: TanreiPaint,
    public val optionStateLayerColor: TanreiPaint,
    public val selectedOptionContainerColor: TanreiPaint,
    public val selectedOptionLabelColor: TanreiPaint,
    public val selectedOptionSupportingTextColor: TanreiPaint,
    public val selectedOptionLeadingIconColor: TanreiPaint,
    public val selectedOptionMarkColor: TanreiPaint,
    public val selectedOptionStateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(optionContainerColor.roles())
        addAll(optionLabelColor.roles())
        addAll(optionSupportingTextColor.roles())
        addAll(optionLeadingIconColor.roles())
        addAll(optionStateLayerColor.roles())
        addAll(selectedOptionContainerColor.roles())
        addAll(selectedOptionLabelColor.roles())
        addAll(selectedOptionSupportingTextColor.roles())
        addAll(selectedOptionLeadingIconColor.roles())
        addAll(selectedOptionMarkColor.roles())
        addAll(selectedOptionStateLayerColor.roles())
    }
}

/** One variant of combobox: a full set of tokens per interaction state. */
@Immutable
public data class TanreiComboboxVariantTokens(
    public val enabled: TanreiComboboxVariantStateTokens,
    public val hovered: TanreiComboboxVariantStateTokens,
    public val focused: TanreiComboboxVariantStateTokens,
    public val pressed: TanreiComboboxVariantStateTokens,
    public val disabled: TanreiComboboxVariantStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiComboboxVariantStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every variant of combobox: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiComboboxVariants(
    public val stacked: TanreiComboboxVariantTokens,
    public val filled: TanreiComboboxVariantTokens,
    public val outlined: TanreiComboboxVariantTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiComboboxVariant, TanreiComboboxVariantTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiComboboxVariant> get() = linkedSetOf(TanreiComboboxVariant.Stacked, TanreiComboboxVariant.Filled, TanreiComboboxVariant.Outlined) + extra.keys

    public operator fun contains(key: TanreiComboboxVariant): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiComboboxVariant): TanreiComboboxVariantTokens? = when (key) {
        TanreiComboboxVariant.Stacked -> stacked
        TanreiComboboxVariant.Filled -> filled
        TanreiComboboxVariant.Outlined -> outlined
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [stacked]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiComboboxVariant): TanreiComboboxVariantTokens = find(key) ?: stacked

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(stacked.referencedRoles())
        addAll(filled.referencedRoles())
        addAll(outlined.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of combobox shares in one interaction state. */
@Immutable
public data class TanreiComboboxStateTokens(
    public val opacity: Float,
)

/** `comp.combobox`. Members are flat tokens, then per-state tokens, then one holder per axis (`variants[variant]`). */
@Immutable
public data class TanreiComboboxTokens(
    public val containerActionGap: Dp,
    public val dividerColor: TanreiPaint,
    public val dividerSpace: Dp,
    public val dividerThickness: Dp,
    public val groupTitleColor: TanreiPaint,
    public val groupTitlePaddingInline: Dp,
    public val groupTitleTypescale: TanreiTextStyle,
    public val groupGap: Dp,
    public val listColor: TanreiPaint,
    public val listElevation: List<TanreiShadowLayer>,
    public val listMaxHeight: Dp,
    public val listOffset: Dp,
    public val listPaddingBlock: Dp,
    public val listPaddingInline: Dp,
    public val listShape: Dp,
    public val listViewportMargin: Dp,
    public val motionCloseDuration: Int,
    public val motionCloseEasing: TanreiCubicBezier,
    public val motionFeedbackDuration: Int,
    public val motionOpenDuration: Int,
    public val motionOpenEasing: TanreiCubicBezier,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val optionGap: Dp,
    public val optionHeight: Dp,
    public val optionLabelTypescale: TanreiTextStyle,
    public val optionLeadingIconSize: Dp,
    public val optionMarkSize: Dp,
    public val optionMatchEmphasis: Float,
    public val optionPaddingBlock: Dp,
    public val optionPaddingInline: Dp,
    public val optionShape: Dp,
    public val optionSupportingTextTypescale: TanreiTextStyle,
    public val separation: Float,
    public val statusColor: TanreiPaint,
    public val statusErrorColor: TanreiPaint,
    public val statusTypescale: TanreiTextStyle,
    public val hovered: TanreiComboboxStateTokens,
    public val focused: TanreiComboboxStateTokens,
    public val pressed: TanreiComboboxStateTokens,
    public val disabled: TanreiComboboxStateTokens,
    public val variants: TanreiComboboxVariants,
) {
    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(dividerColor.roles())
        addAll(groupTitleColor.roles())
        addAll(listColor.roles())
        listElevation.forEach { add(it.role) }
        addAll(statusColor.roles())
        addAll(statusErrorColor.roles())
        addAll(variants.referencedRoles())
    }
}

/** `comp.copy-button`. Members are flat tokens, then per-state tokens, then one holder per axis (). */
@Immutable
public data class TanreiCopyButtonTokens(
    public val confirmationDuration: Int,
    public val motionResizeDuration: Int,
    public val motionResizeEasing: TanreiCubicBezier,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
    }
}

/**
 * A condition of date-time-picker: the key of one entry of [TanreiDateTimePickerConditions]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Unselected].
 */
@JvmInline
public value class TanreiDateTimePickerCondition(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Unselected: TanreiDateTimePickerCondition = TanreiDateTimePickerCondition("unselected")
        public val Selected: TanreiDateTimePickerCondition = TanreiDateTimePickerCondition("selected")
    }
}

/** What one condition of date-time-picker draws in one interaction state. */
@Immutable
public data class TanreiDateTimePickerConditionStateTokens(
    public val selectorContainerColor: TanreiPaint,
    public val selectorLabelColor: TanreiPaint,
    public val selectorOutlineColor: TanreiPaint,
    public val selectorOutlineWidth: Dp,
    public val selectorStateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(selectorContainerColor.roles())
        addAll(selectorLabelColor.roles())
        addAll(selectorOutlineColor.roles())
        addAll(selectorStateLayerColor.roles())
    }
}

/** One condition of date-time-picker: a full set of tokens per interaction state. */
@Immutable
public data class TanreiDateTimePickerConditionTokens(
    public val enabled: TanreiDateTimePickerConditionStateTokens,
    public val hovered: TanreiDateTimePickerConditionStateTokens,
    public val focused: TanreiDateTimePickerConditionStateTokens,
    public val pressed: TanreiDateTimePickerConditionStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiDateTimePickerConditionStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> enabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles()
}

/**
 * Every condition of date-time-picker: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiDateTimePickerConditions(
    public val unselected: TanreiDateTimePickerConditionTokens,
    public val selected: TanreiDateTimePickerConditionTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiDateTimePickerCondition, TanreiDateTimePickerConditionTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiDateTimePickerCondition> get() = linkedSetOf(TanreiDateTimePickerCondition.Unselected, TanreiDateTimePickerCondition.Selected) + extra.keys

    public operator fun contains(key: TanreiDateTimePickerCondition): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiDateTimePickerCondition): TanreiDateTimePickerConditionTokens? = when (key) {
        TanreiDateTimePickerCondition.Unselected -> unselected
        TanreiDateTimePickerCondition.Selected -> selected
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [unselected]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiDateTimePickerCondition): TanreiDateTimePickerConditionTokens = find(key) ?: unselected

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(unselected.referencedRoles())
        addAll(selected.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of date-time-picker shares in one interaction state. */
@Immutable
public data class TanreiDateTimePickerStateTokens(
    public val opacity: Float,
)

/** `comp.date-time-picker`. Members are flat tokens, then per-state tokens, then one holder per axis (`conditions[condition]`). */
@Immutable
public data class TanreiDateTimePickerTokens(
    public val actionsArrangement: Float,
    public val actionsGap: Dp,
    public val actionsPaddingBlock: Dp,
    public val actionsVariant: Float,
    public val containerGap: Dp,
    public val containerPaddingBlock: Dp,
    public val containerPaddingInline: Dp,
    public val dialCenterSize: Dp,
    public val dialContainerColor: TanreiPaint,
    public val dialContainerSize: Dp,
    public val dialHandleColor: TanreiPaint,
    public val dialHandleSize: Dp,
    public val dialLabelColor: TanreiPaint,
    public val dialLabelTypescale: TanreiTextStyle,
    public val dialPadding: Dp,
    public val dialSelectedLabelColor: TanreiPaint,
    public val dialTrackColor: TanreiPaint,
    public val dialTrackWidth: Dp,
    public val dividerColor: TanreiPaint,
    public val dividerWidth: Dp,
    public val dockedContainerColor: TanreiPaint,
    public val dockedContainerElevation: List<TanreiShadowLayer>,
    public val dockedContainerShape: Dp,
    public val dockedMotionCloseDuration: Int,
    public val dockedMotionCloseEasing: TanreiCubicBezier,
    public val dockedMotionOpenDuration: Int,
    public val dockedMotionOpenEasing: TanreiCubicBezier,
    public val dockedOffset: Dp,
    public val dockedViewportMargin: Dp,
    public val errorColor: TanreiPaint,
    public val errorTypescale: TanreiTextStyle,
    public val headerGap: Dp,
    public val headerLabelColor: TanreiPaint,
    public val headerLabelTypescale: TanreiTextStyle,
    public val headerPaddingBlock: Dp,
    public val headerPaddingInlineEnd: Dp,
    public val headerPaddingInlineStart: Dp,
    public val headerPlaceholderColor: TanreiPaint,
    public val headerValueColor: TanreiPaint,
    public val headerValueTypescale: TanreiTextStyle,
    public val modalContainerColor: TanreiPaint,
    public val modalContainerElevation: List<TanreiShadowLayer>,
    public val modalContainerMargin: Dp,
    public val modalContainerShape: Dp,
    public val modalMotionCloseDuration: Int,
    public val modalMotionCloseEasing: TanreiCubicBezier,
    public val modalMotionEnterScale: Float,
    public val modalMotionOpenDuration: Int,
    public val modalMotionOpenEasing: TanreiCubicBezier,
    public val modalScrimBlur: Dp,
    public val modalScrimColor: TanreiPaint,
    public val motionDialDuration: Int,
    public val motionDialEasing: TanreiCubicBezier,
    public val motionFeedbackDuration: Int,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val motionWheelDuration: Int,
    public val motionWheelEasing: TanreiCubicBezier,
    public val periodContainerWidth: Dp,
    public val periodGap: Dp,
    public val periodLabelTypescale: TanreiTextStyle,
    public val rangeFieldContainerHeight: Dp,
    public val rangeFieldContainerPaddingInline: Dp,
    public val rangeFieldGap: Dp,
    public val rangeFieldLabelTypescale: TanreiTextStyle,
    public val selectorContainerHeight: Dp,
    public val selectorContainerShape: Dp,
    public val selectorContainerWidth: Dp,
    public val selectorGap: Dp,
    public val selectorLabelTypescale: TanreiTextStyle,
    public val separatorColor: TanreiPaint,
    public val separatorTypescale: TanreiTextStyle,
    public val timeEntryModes: Float,
    public val timeUnavailableOpacity: Float,
    public val wheelGap: Dp,
    public val wheelHeight: Dp,
    public val wheelLabelColor: TanreiPaint,
    public val wheelLabelTypescale: TanreiTextStyle,
    public val wheelRowHeight: Dp,
    public val wheelSelectedLabelColor: TanreiPaint,
    public val wheelSelectionContainerColor: TanreiPaint,
    public val wheelSelectionContainerShape: Dp,
    public val wheelSelectionSpan: Float,
    public val wheelWidth: Dp,
    public val hovered: TanreiDateTimePickerStateTokens,
    public val focused: TanreiDateTimePickerStateTokens,
    public val pressed: TanreiDateTimePickerStateTokens,
    public val conditions: TanreiDateTimePickerConditions,
) {
    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> 1f
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(dialContainerColor.roles())
        addAll(dialHandleColor.roles())
        addAll(dialLabelColor.roles())
        addAll(dialSelectedLabelColor.roles())
        addAll(dialTrackColor.roles())
        addAll(dividerColor.roles())
        addAll(dockedContainerColor.roles())
        dockedContainerElevation.forEach { add(it.role) }
        addAll(errorColor.roles())
        addAll(headerLabelColor.roles())
        addAll(headerPlaceholderColor.roles())
        addAll(headerValueColor.roles())
        addAll(modalContainerColor.roles())
        modalContainerElevation.forEach { add(it.role) }
        addAll(modalScrimColor.roles())
        addAll(separatorColor.roles())
        addAll(wheelLabelColor.roles())
        addAll(wheelSelectedLabelColor.roles())
        addAll(wheelSelectionContainerColor.roles())
        addAll(conditions.referencedRoles())
    }
}

/**
 * A density of description-list: the key of one entry of [TanreiDescriptionListDensitys]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Regular].
 */
@JvmInline
public value class TanreiDescriptionListDensity(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Regular: TanreiDescriptionListDensity = TanreiDescriptionListDensity("regular")
        public val Compact: TanreiDescriptionListDensity = TanreiDescriptionListDensity("compact")
    }
}

/** The tokens of one density of description-list. */
@Immutable
public data class TanreiDescriptionListDensityTokens(
    public val factGap: Dp,
    public val termGap: Dp,
    public val termTypescale: TanreiTextStyle,
    public val valueTypescale: TanreiTextStyle,
    public val statValueTypescale: TanreiTextStyle,
)

/**
 * Every density of description-list: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiDescriptionListDensitys(
    public val regular: TanreiDescriptionListDensityTokens,
    public val compact: TanreiDescriptionListDensityTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiDescriptionListDensity, TanreiDescriptionListDensityTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiDescriptionListDensity> get() = linkedSetOf(TanreiDescriptionListDensity.Regular, TanreiDescriptionListDensity.Compact) + extra.keys

    public operator fun contains(key: TanreiDescriptionListDensity): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiDescriptionListDensity): TanreiDescriptionListDensityTokens? = when (key) {
        TanreiDescriptionListDensity.Regular -> regular
        TanreiDescriptionListDensity.Compact -> compact
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [regular]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiDescriptionListDensity): TanreiDescriptionListDensityTokens = find(key) ?: regular
}

/** `comp.description-list`. Members are flat tokens, then per-state tokens, then one holder per axis (`densitys[density]`). */
@Immutable
public data class TanreiDescriptionListTokens(
    public val columnGap: Dp,
    public val columnMinWidth: Dp,
    public val dividerColor: TanreiPaint,
    public val dividerThickness: Dp,
    public val separation: Float,
    public val stackGap: Dp,
    public val termColor: TanreiPaint,
    public val valueColor: TanreiPaint,
    public val densitys: TanreiDescriptionListDensitys,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(dividerColor.roles())
        addAll(termColor.roles())
        addAll(valueColor.roles())
    }
}

/** `comp.dialog`. Members are flat tokens, then per-state tokens, then one holder per axis (). */
@Immutable
public data class TanreiDialogTokens(
    public val actionsArrangement: Float,
    public val actionsGap: Dp,
    public val actionsMarginBlockStart: Dp,
    public val actionsVariant: Float,
    public val compactWindowWidth: Dp,
    public val containerColor: TanreiPaint,
    public val containerElevation: List<TanreiShadowLayer>,
    public val containerGap: Dp,
    public val containerMargin: Dp,
    public val containerMaxWidth: Dp,
    public val containerMinWidth: Dp,
    public val containerPadding: Dp,
    public val containerShape: Dp,
    public val contentColor: TanreiPaint,
    public val dividerColor: TanreiPaint,
    public val dividerVisibility: Float,
    public val dividerWidth: Dp,
    public val headerGap: Dp,
    public val headlineColor: TanreiPaint,
    public val headlineTypescale: TanreiTextStyle,
    public val iconColor: TanreiPaint,
    public val iconPlacement: Float,
    public val iconSize: Dp,
    public val motionEnterDuration: Int,
    public val motionEnterEasing: TanreiCubicBezier,
    public val motionEnterScale: Float,
    public val motionExitDuration: Int,
    public val motionExitEasing: TanreiCubicBezier,
    public val scrimBlur: Dp,
    public val scrimColor: TanreiPaint,
    public val supportingTextColor: TanreiPaint,
    public val supportingTextTypescale: TanreiTextStyle,
    public val widthLarge: Dp,
    public val widthMedium: Dp,
    public val widthSmall: Dp,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        containerElevation.forEach { add(it.role) }
        addAll(contentColor.roles())
        addAll(dividerColor.roles())
        addAll(headlineColor.roles())
        addAll(iconColor.roles())
        addAll(scrimColor.roles())
        addAll(supportingTextColor.roles())
    }
}

/** `comp.divider`. Members are flat tokens, then per-state tokens, then one holder per axis (). */
@Immutable
public data class TanreiDividerTokens(
    public val lineColor: TanreiPaint,
    public val lineDashGap: Dp,
    public val lineDashLength: Dp,
    public val lineDotGap: Dp,
    public val lineInset: Dp,
    public val lineThickness: Dp,
    public val lineWaveAmplitude: Dp,
    public val lineWaveWavelength: Dp,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(lineColor.roles())
    }
}

/** `comp.drop-zone`. Members are flat tokens, then per-state tokens, then one holder per axis (). */
@Immutable
public data class TanreiDropZoneTokens(
    public val iconColor: TanreiPaint,
    public val iconSize: Dp,
    public val labelColor: TanreiPaint,
    public val labelTypescale: TanreiTextStyle,
    public val motionDuration: Int,
    public val motionEasing: TanreiCubicBezier,
    public val outlineColor: TanreiPaint,
    public val outlineWidth: Dp,
    public val panelContainerColor: TanreiPaint,
    public val panelElevation: List<TanreiShadowLayer>,
    public val panelGap: Dp,
    public val panelMargin: Dp,
    public val panelMaxWidth: Dp,
    public val panelPaddingBlock: Dp,
    public val panelPaddingInline: Dp,
    public val panelShape: Dp,
    public val refusingIconColor: TanreiPaint,
    public val refusingOutlineColor: TanreiPaint,
    public val scrimColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(iconColor.roles())
        addAll(labelColor.roles())
        addAll(outlineColor.roles())
        addAll(panelContainerColor.roles())
        panelElevation.forEach { add(it.role) }
        addAll(refusingIconColor.roles())
        addAll(refusingOutlineColor.roles())
        addAll(scrimColor.roles())
    }
}

/**
 * A condition of embedded-text-input: the key of one entry of [TanreiEmbeddedTextInputConditions]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Standard].
 */
@JvmInline
public value class TanreiEmbeddedTextInputCondition(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Standard: TanreiEmbeddedTextInputCondition = TanreiEmbeddedTextInputCondition("standard")
    }
}

/** What one condition of embedded-text-input draws in one interaction state. */
@Immutable
public data class TanreiEmbeddedTextInputConditionStateTokens(
    public val inputColor: TanreiPaint,
    public val placeholderColor: TanreiPaint,
    public val caretColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(inputColor.roles())
        addAll(placeholderColor.roles())
        addAll(caretColor.roles())
    }
}

/** One condition of embedded-text-input: a full set of tokens per interaction state. */
@Immutable
public data class TanreiEmbeddedTextInputConditionTokens(
    public val enabled: TanreiEmbeddedTextInputConditionStateTokens,
    public val disabled: TanreiEmbeddedTextInputConditionStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiEmbeddedTextInputConditionStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> enabled
        TanreiInteractionState.Focused -> enabled
        TanreiInteractionState.Pressed -> enabled
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every condition of embedded-text-input: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiEmbeddedTextInputConditions(
    public val standard: TanreiEmbeddedTextInputConditionTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiEmbeddedTextInputCondition, TanreiEmbeddedTextInputConditionTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiEmbeddedTextInputCondition> get() = linkedSetOf(TanreiEmbeddedTextInputCondition.Standard) + extra.keys

    public operator fun contains(key: TanreiEmbeddedTextInputCondition): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiEmbeddedTextInputCondition): TanreiEmbeddedTextInputConditionTokens? = when (key) {
        TanreiEmbeddedTextInputCondition.Standard -> standard
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [standard]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiEmbeddedTextInputCondition): TanreiEmbeddedTextInputConditionTokens = find(key) ?: standard

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(standard.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** `comp.embedded-text-input`. Members are flat tokens, then per-state tokens, then one holder per axis (`conditions[condition]`). */
@Immutable
public data class TanreiEmbeddedTextInputTokens(
    public val inputTypescale: TanreiTextStyle,
    public val motionResizeDuration: Int,
    public val motionResizeEasing: TanreiCubicBezier,
    public val selectionColor: TanreiPaint,
    public val selectionContentColor: TanreiPaint,
    public val conditions: TanreiEmbeddedTextInputConditions,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(selectionColor.roles())
        addAll(selectionContentColor.roles())
        addAll(conditions.referencedRoles())
    }
}

/**
 * A size of empty-state: the key of one entry of [TanreiEmptyStateSizes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Medium].
 */
@JvmInline
public value class TanreiEmptyStateSize(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Medium: TanreiEmptyStateSize = TanreiEmptyStateSize("medium")
        public val Large: TanreiEmptyStateSize = TanreiEmptyStateSize("large")
    }
}

/** The tokens of one size of empty-state. */
@Immutable
public data class TanreiEmptyStateSizeTokens(
    public val containerPaddingBlock: Dp,
    public val mediaSize: Dp,
    public val titleTypescale: TanreiTextStyle,
    public val descriptionTypescale: TanreiTextStyle,
)

/**
 * Every size of empty-state: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiEmptyStateSizes(
    public val medium: TanreiEmptyStateSizeTokens,
    public val large: TanreiEmptyStateSizeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiEmptyStateSize, TanreiEmptyStateSizeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiEmptyStateSize> get() = linkedSetOf(TanreiEmptyStateSize.Medium, TanreiEmptyStateSize.Large) + extra.keys

    public operator fun contains(key: TanreiEmptyStateSize): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiEmptyStateSize): TanreiEmptyStateSizeTokens? = when (key) {
        TanreiEmptyStateSize.Medium -> medium
        TanreiEmptyStateSize.Large -> large
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [medium]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiEmptyStateSize): TanreiEmptyStateSizeTokens = find(key) ?: medium
}

/** `comp.empty-state`. Members are flat tokens, then per-state tokens, then one holder per axis (`sizes[size]`). */
@Immutable
public data class TanreiEmptyStateTokens(
    public val actionsGap: Dp,
    public val actionsItemGap: Dp,
    public val containerPaddingInline: Dp,
    public val contentMeasure: Float,
    public val descriptionColor: TanreiPaint,
    public val mediaColor: TanreiPaint,
    public val mediaGap: Dp,
    public val titleColor: TanreiPaint,
    public val titleGap: Dp,
    public val sizes: TanreiEmptyStateSizes,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(descriptionColor.roles())
        addAll(mediaColor.roles())
        addAll(titleColor.roles())
    }
}

/**
 * A size of fab-menu: the key of one entry of [TanreiFabMenuSizes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Medium].
 */
@JvmInline
public value class TanreiFabMenuSize(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Small: TanreiFabMenuSize = TanreiFabMenuSize("small")
        public val Medium: TanreiFabMenuSize = TanreiFabMenuSize("medium")
        public val Large: TanreiFabMenuSize = TanreiFabMenuSize("large")
    }
}

/** The tokens of one size of fab-menu. */
@Immutable
public data class TanreiFabMenuSizeTokens(
    public val containerSize: Dp,
    public val containerShape: Dp,
    public val iconSize: Dp,
)

/**
 * Every size of fab-menu: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiFabMenuSizes(
    public val small: TanreiFabMenuSizeTokens,
    public val medium: TanreiFabMenuSizeTokens,
    public val large: TanreiFabMenuSizeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiFabMenuSize, TanreiFabMenuSizeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiFabMenuSize> get() = linkedSetOf(TanreiFabMenuSize.Small, TanreiFabMenuSize.Medium, TanreiFabMenuSize.Large) + extra.keys

    public operator fun contains(key: TanreiFabMenuSize): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiFabMenuSize): TanreiFabMenuSizeTokens? = when (key) {
        TanreiFabMenuSize.Small -> small
        TanreiFabMenuSize.Medium -> medium
        TanreiFabMenuSize.Large -> large
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [medium]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiFabMenuSize): TanreiFabMenuSizeTokens = find(key) ?: medium
}

/**
 * A variant of fab-menu: the key of one entry of [TanreiFabMenuVariants]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Filled].
 */
@JvmInline
public value class TanreiFabMenuVariant(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Filled: TanreiFabMenuVariant = TanreiFabMenuVariant("filled")
        public val Tonal: TanreiFabMenuVariant = TanreiFabMenuVariant("tonal")
        public val Surface: TanreiFabMenuVariant = TanreiFabMenuVariant("surface")
    }
}

/** What one variant of fab-menu draws in one interaction state. */
@Immutable
public data class TanreiFabMenuVariantStateTokens(
    public val containerColor: TanreiPaint,
    public val containerElevation: List<TanreiShadowLayer>,
    public val iconColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
    public val openContainerColor: TanreiPaint,
    public val openContainerElevation: List<TanreiShadowLayer>,
    public val openIconColor: TanreiPaint,
    public val openStateLayerColor: TanreiPaint,
    public val itemContainerColor: TanreiPaint,
    public val itemContainerElevation: List<TanreiShadowLayer>,
    public val itemLabelColor: TanreiPaint,
    public val itemIconColor: TanreiPaint,
    public val itemStateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        containerElevation.forEach { add(it.role) }
        addAll(iconColor.roles())
        addAll(stateLayerColor.roles())
        addAll(openContainerColor.roles())
        openContainerElevation.forEach { add(it.role) }
        addAll(openIconColor.roles())
        addAll(openStateLayerColor.roles())
        addAll(itemContainerColor.roles())
        itemContainerElevation.forEach { add(it.role) }
        addAll(itemLabelColor.roles())
        addAll(itemIconColor.roles())
        addAll(itemStateLayerColor.roles())
    }
}

/** One variant of fab-menu: a full set of tokens per interaction state. */
@Immutable
public data class TanreiFabMenuVariantTokens(
    public val enabled: TanreiFabMenuVariantStateTokens,
    public val hovered: TanreiFabMenuVariantStateTokens,
    public val focused: TanreiFabMenuVariantStateTokens,
    public val pressed: TanreiFabMenuVariantStateTokens,
    public val disabled: TanreiFabMenuVariantStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiFabMenuVariantStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every variant of fab-menu: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiFabMenuVariants(
    public val filled: TanreiFabMenuVariantTokens,
    public val tonal: TanreiFabMenuVariantTokens,
    public val surface: TanreiFabMenuVariantTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiFabMenuVariant, TanreiFabMenuVariantTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiFabMenuVariant> get() = linkedSetOf(TanreiFabMenuVariant.Filled, TanreiFabMenuVariant.Tonal, TanreiFabMenuVariant.Surface) + extra.keys

    public operator fun contains(key: TanreiFabMenuVariant): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiFabMenuVariant): TanreiFabMenuVariantTokens? = when (key) {
        TanreiFabMenuVariant.Filled -> filled
        TanreiFabMenuVariant.Tonal -> tonal
        TanreiFabMenuVariant.Surface -> surface
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [filled]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiFabMenuVariant): TanreiFabMenuVariantTokens = find(key) ?: filled

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(filled.referencedRoles())
        addAll(tonal.referencedRoles())
        addAll(surface.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of fab-menu shares in one interaction state. */
@Immutable
public data class TanreiFabMenuStateTokens(
    public val opacity: Float,
)

/** `comp.fab-menu`. Members are flat tokens, then per-state tokens, then one holder per axis (`sizes[size]`, `variants[variant]`). */
@Immutable
public data class TanreiFabMenuTokens(
    public val containerShapeOpen: Dp,
    public val itemGap: Dp,
    public val itemHeight: Dp,
    public val itemIconSize: Dp,
    public val itemLabelTypescale: TanreiTextStyle,
    public val itemPaddingInlineEnd: Dp,
    public val itemPaddingInlineStart: Dp,
    public val itemShape: Dp,
    public val listGap: Dp,
    public val listOffset: Dp,
    public val motionCloseDuration: Int,
    public val motionCloseEasing: TanreiCubicBezier,
    public val motionFeedbackDuration: Int,
    public val motionOpenDuration: Int,
    public val motionOpenEasing: TanreiCubicBezier,
    public val motionStagger: Int,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val hovered: TanreiFabMenuStateTokens,
    public val focused: TanreiFabMenuStateTokens,
    public val pressed: TanreiFabMenuStateTokens,
    public val disabled: TanreiFabMenuStateTokens,
    public val sizes: TanreiFabMenuSizes,
    public val variants: TanreiFabMenuVariants,
) {
    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(variants.referencedRoles())
    }
}

/**
 * A spacing of field-group: the key of one entry of [TanreiFieldGroupSpacings]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Controls].
 */
@JvmInline
public value class TanreiFieldGroupSpacing(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Controls: TanreiFieldGroupSpacing = TanreiFieldGroupSpacing("controls")
        public val Fields: TanreiFieldGroupSpacing = TanreiFieldGroupSpacing("fields")
    }
}

/** The tokens of one spacing of field-group. */
@Immutable
public data class TanreiFieldGroupSpacingTokens(
    public val gap: Dp,
)

/**
 * Every spacing of field-group: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiFieldGroupSpacings(
    public val controls: TanreiFieldGroupSpacingTokens,
    public val fields: TanreiFieldGroupSpacingTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiFieldGroupSpacing, TanreiFieldGroupSpacingTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiFieldGroupSpacing> get() = linkedSetOf(TanreiFieldGroupSpacing.Controls, TanreiFieldGroupSpacing.Fields) + extra.keys

    public operator fun contains(key: TanreiFieldGroupSpacing): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiFieldGroupSpacing): TanreiFieldGroupSpacingTokens? = when (key) {
        TanreiFieldGroupSpacing.Controls -> controls
        TanreiFieldGroupSpacing.Fields -> fields
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [controls]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiFieldGroupSpacing): TanreiFieldGroupSpacingTokens = find(key) ?: controls
}

/**
 * A condition of field-group: the key of one entry of [TanreiFieldGroupConditions]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Standard].
 */
@JvmInline
public value class TanreiFieldGroupCondition(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Standard: TanreiFieldGroupCondition = TanreiFieldGroupCondition("standard")
    }
}

/** What one condition of field-group draws in one interaction state. */
@Immutable
public data class TanreiFieldGroupConditionStateTokens(
    public val labelColor: TanreiPaint,
    public val supportingTextColor: TanreiPaint,
    public val requiredAsteriskColor: TanreiPaint,
    public val errorTextColor: TanreiPaint,
    public val errorLabelColor: TanreiPaint,
    public val errorSupportingTextColor: TanreiPaint,
    public val errorRequiredAsteriskColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(labelColor.roles())
        addAll(supportingTextColor.roles())
        addAll(requiredAsteriskColor.roles())
        addAll(errorTextColor.roles())
        addAll(errorLabelColor.roles())
        addAll(errorSupportingTextColor.roles())
        addAll(errorRequiredAsteriskColor.roles())
    }
}

/** One condition of field-group: a full set of tokens per interaction state. */
@Immutable
public data class TanreiFieldGroupConditionTokens(
    public val enabled: TanreiFieldGroupConditionStateTokens,
    public val disabled: TanreiFieldGroupConditionStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiFieldGroupConditionStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> enabled
        TanreiInteractionState.Focused -> enabled
        TanreiInteractionState.Pressed -> enabled
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every condition of field-group: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiFieldGroupConditions(
    public val standard: TanreiFieldGroupConditionTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiFieldGroupCondition, TanreiFieldGroupConditionTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiFieldGroupCondition> get() = linkedSetOf(TanreiFieldGroupCondition.Standard) + extra.keys

    public operator fun contains(key: TanreiFieldGroupCondition): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiFieldGroupCondition): TanreiFieldGroupConditionTokens? = when (key) {
        TanreiFieldGroupCondition.Standard -> standard
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [standard]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiFieldGroupCondition): TanreiFieldGroupConditionTokens = find(key) ?: standard

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(standard.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** `comp.field-group`. Members are flat tokens, then per-state tokens, then one holder per axis (`spacings[spacing]`, `conditions[condition]`). */
@Immutable
public data class TanreiFieldGroupTokens(
    public val errorTextGap: Dp,
    public val fieldMinWidth: Dp,
    public val gapInline: Dp,
    public val labelGap: Dp,
    public val labelTypescale: TanreiTextStyle,
    public val requirementAsteriskGap: Dp,
    public val requirementGap: Dp,
    public val requirementMark: Float,
    public val supportingTextGap: Dp,
    public val supportingTextTypescale: TanreiTextStyle,
    public val spacings: TanreiFieldGroupSpacings,
    public val conditions: TanreiFieldGroupConditions,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(conditions.referencedRoles())
    }
}

/**
 * A condition of field: the key of one entry of [TanreiFieldConditions]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Standard].
 */
@JvmInline
public value class TanreiFieldCondition(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Standard: TanreiFieldCondition = TanreiFieldCondition("standard")
    }
}

/** What one condition of field draws in one interaction state. */
@Immutable
public data class TanreiFieldConditionStateTokens(
    public val labelColor: TanreiPaint,
    public val labelIconColor: TanreiPaint,
    public val supportingTextColor: TanreiPaint,
    public val requiredAsteriskColor: TanreiPaint,
    public val errorLabelColor: TanreiPaint,
    public val errorLabelIconColor: TanreiPaint,
    public val errorSupportingTextColor: TanreiPaint,
    public val errorRequiredAsteriskColor: TanreiPaint,
    public val counterColor: TanreiPaint,
    public val errorCounterColor: TanreiPaint,
    public val valueTextColor: TanreiPaint,
    public val errorValueTextColor: TanreiPaint,
    public val errorTextColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(labelColor.roles())
        addAll(labelIconColor.roles())
        addAll(supportingTextColor.roles())
        addAll(requiredAsteriskColor.roles())
        addAll(errorLabelColor.roles())
        addAll(errorLabelIconColor.roles())
        addAll(errorSupportingTextColor.roles())
        addAll(errorRequiredAsteriskColor.roles())
        addAll(counterColor.roles())
        addAll(errorCounterColor.roles())
        addAll(valueTextColor.roles())
        addAll(errorValueTextColor.roles())
        addAll(errorTextColor.roles())
    }
}

/** One condition of field: a full set of tokens per interaction state. */
@Immutable
public data class TanreiFieldConditionTokens(
    public val enabled: TanreiFieldConditionStateTokens,
    public val focused: TanreiFieldConditionStateTokens,
    public val disabled: TanreiFieldConditionStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiFieldConditionStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> enabled
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> enabled
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + focused.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every condition of field: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiFieldConditions(
    public val standard: TanreiFieldConditionTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiFieldCondition, TanreiFieldConditionTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiFieldCondition> get() = linkedSetOf(TanreiFieldCondition.Standard) + extra.keys

    public operator fun contains(key: TanreiFieldCondition): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiFieldCondition): TanreiFieldConditionTokens? = when (key) {
        TanreiFieldCondition.Standard -> standard
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [standard]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiFieldCondition): TanreiFieldConditionTokens = find(key) ?: standard

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(standard.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** `comp.field`. Members are flat tokens, then per-state tokens, then one holder per axis (`conditions[condition]`). */
@Immutable
public data class TanreiFieldTokens(
    public val counterGap: Dp,
    public val errorTextGap: Dp,
    public val errorTextPlacement: Float,
    public val labelIconGap: Dp,
    public val labelIconSize: Dp,
    public val labelGap: Dp,
    public val labelTypescale: TanreiTextStyle,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val requirementAsteriskGap: Dp,
    public val requirementGap: Dp,
    public val requirementMark: Float,
    public val supportingTextGap: Dp,
    public val supportingTextTypescale: TanreiTextStyle,
    public val valueTextGap: Dp,
    public val valueTextTypescale: TanreiTextStyle,
    public val conditions: TanreiFieldConditions,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(conditions.referencedRoles())
    }
}

/**
 * A variant of figure: the key of one entry of [TanreiFigureVariants]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Outlined].
 */
@JvmInline
public value class TanreiFigureVariant(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Outlined: TanreiFigureVariant = TanreiFigureVariant("outlined")
        public val Filled: TanreiFigureVariant = TanreiFigureVariant("filled")
        public val Plain: TanreiFigureVariant = TanreiFigureVariant("plain")
    }
}

/** The tokens of one variant of figure. */
@Immutable
public data class TanreiFigureVariantTokens(
    public val containerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
    }
}

/**
 * Every variant of figure: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiFigureVariants(
    public val outlined: TanreiFigureVariantTokens,
    public val filled: TanreiFigureVariantTokens,
    public val plain: TanreiFigureVariantTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiFigureVariant, TanreiFigureVariantTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiFigureVariant> get() = linkedSetOf(TanreiFigureVariant.Outlined, TanreiFigureVariant.Filled, TanreiFigureVariant.Plain) + extra.keys

    public operator fun contains(key: TanreiFigureVariant): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiFigureVariant): TanreiFigureVariantTokens? = when (key) {
        TanreiFigureVariant.Outlined -> outlined
        TanreiFigureVariant.Filled -> filled
        TanreiFigureVariant.Plain -> plain
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [outlined]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiFigureVariant): TanreiFigureVariantTokens = find(key) ?: outlined

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(outlined.referencedRoles())
        addAll(filled.referencedRoles())
        addAll(plain.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** `comp.figure`. Members are flat tokens, then per-state tokens, then one holder per axis (`variants[variant]`). */
@Immutable
public data class TanreiFigureTokens(
    public val attachmentGap: Dp,
    public val captionColor: TanreiPaint,
    public val captionGap: Dp,
    public val captionTypescale: TanreiTextStyle,
    public val containerShape: Dp,
    public val contentColor: TanreiPaint,
    public val dividerColor: TanreiPaint,
    public val dividerThickness: Dp,
    public val headerGap: Dp,
    public val headerPaddingBlock: Dp,
    public val headerPaddingInline: Dp,
    public val headerPaddingInlineEndWithActions: Dp,
    public val outlineColor: TanreiPaint,
    public val outlineWidth: Dp,
    public val patternCheckerboardSize: Dp,
    public val patternClearExtent: Float,
    public val patternColor: TanreiPaint,
    public val patternDotSize: Dp,
    public val patternLineThickness: Dp,
    public val patternSpacing: Dp,
    public val separation: Float,
    public val stagePaddingBlock: Dp,
    public val stagePaddingInline: Dp,
    public val titleColor: TanreiPaint,
    public val titleTypescale: TanreiTextStyle,
    public val variants: TanreiFigureVariants,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(captionColor.roles())
        addAll(contentColor.roles())
        addAll(dividerColor.roles())
        addAll(outlineColor.roles())
        addAll(patternColor.roles())
        addAll(titleColor.roles())
        addAll(variants.referencedRoles())
    }
}

/**
 * A form of file-item: the key of one entry of [TanreiFileItemForms]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Row].
 */
@JvmInline
public value class TanreiFileItemForm(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Row: TanreiFileItemForm = TanreiFileItemForm("row")
        public val Tile: TanreiFileItemForm = TanreiFileItemForm("tile")
    }
}

/** What one form of file-item draws in one interaction state. */
@Immutable
public data class TanreiFileItemFormStateTokens(
    public val containerColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
    public val actionContainerColor: TanreiPaint,
    public val actionIconColor: TanreiPaint,
    public val actionStateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(stateLayerColor.roles())
        addAll(actionContainerColor.roles())
        addAll(actionIconColor.roles())
        addAll(actionStateLayerColor.roles())
    }
}

/** One form of file-item: a full set of tokens per interaction state. */
@Immutable
public data class TanreiFileItemFormTokens(
    public val enabled: TanreiFileItemFormStateTokens,
    public val hovered: TanreiFileItemFormStateTokens,
    public val focused: TanreiFileItemFormStateTokens,
    public val pressed: TanreiFileItemFormStateTokens,
    public val disabled: TanreiFileItemFormStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiFileItemFormStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every form of file-item: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiFileItemForms(
    public val row: TanreiFileItemFormTokens,
    public val tile: TanreiFileItemFormTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiFileItemForm, TanreiFileItemFormTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiFileItemForm> get() = linkedSetOf(TanreiFileItemForm.Row, TanreiFileItemForm.Tile) + extra.keys

    public operator fun contains(key: TanreiFileItemForm): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiFileItemForm): TanreiFileItemFormTokens? = when (key) {
        TanreiFileItemForm.Row -> row
        TanreiFileItemForm.Tile -> tile
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [row]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiFileItemForm): TanreiFileItemFormTokens = find(key) ?: row

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(row.referencedRoles())
        addAll(tile.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of file-item shares in one interaction state. */
@Immutable
public data class TanreiFileItemStateTokens(
    public val opacity: Float,
)

/** `comp.file-item`. Members are flat tokens, then per-state tokens, then one holder per axis (`forms[form]`). */
@Immutable
public data class TanreiFileItemTokens(
    public val actionGap: Dp,
    public val actionIconSize: Dp,
    public val actionShape: Dp,
    public val actionSize: Dp,
    public val doneIconColor: TanreiPaint,
    public val errorIconColor: TanreiPaint,
    public val errorSupportingTextColor: TanreiPaint,
    public val headlineColor: TanreiPaint,
    public val headlineTypescale: TanreiTextStyle,
    public val iconColor: TanreiPaint,
    public val mediaColor: TanreiPaint,
    public val motionCycleDuration: Int,
    public val motionCycleEasing: TanreiCubicBezier,
    public val motionFeedbackDuration: Int,
    public val motionProgressDuration: Int,
    public val motionProgressEasing: TanreiCubicBezier,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val progressGap: Dp,
    public val progressIndicatorColor: TanreiPaint,
    public val progressShape: Dp,
    public val progressThickness: Dp,
    public val progressTrackColor: TanreiPaint,
    public val rowContainerGap: Dp,
    public val rowContainerOutset: Dp,
    public val rowContainerShape: Dp,
    public val rowIconSize: Dp,
    public val rowMediaHeight: Dp,
    public val rowMediaShape: Dp,
    public val statusIconGap: Dp,
    public val statusIconSize: Dp,
    public val supportingTextColor: TanreiPaint,
    public val supportingTextTypescale: TanreiTextStyle,
    public val tileActionInset: Dp,
    public val tileContainerGap: Dp,
    public val tileContainerShape: Dp,
    public val tileIconSize: Dp,
    public val tileMediaHeight: Dp,
    public val hovered: TanreiFileItemStateTokens,
    public val focused: TanreiFileItemStateTokens,
    public val pressed: TanreiFileItemStateTokens,
    public val disabled: TanreiFileItemStateTokens,
    public val forms: TanreiFileItemForms,
) {
    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(doneIconColor.roles())
        addAll(errorIconColor.roles())
        addAll(errorSupportingTextColor.roles())
        addAll(headlineColor.roles())
        addAll(iconColor.roles())
        addAll(mediaColor.roles())
        addAll(progressIndicatorColor.roles())
        addAll(progressTrackColor.roles())
        addAll(supportingTextColor.roles())
        addAll(forms.referencedRoles())
    }
}

/**
 * A condition of file-picker: the key of one entry of [TanreiFilePickerConditions]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Standard].
 */
@JvmInline
public value class TanreiFilePickerCondition(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Standard: TanreiFilePickerCondition = TanreiFilePickerCondition("standard")
    }
}

/** What one condition of file-picker draws in one interaction state. */
@Immutable
public data class TanreiFilePickerConditionStateTokens(
    public val containerColor: TanreiPaint,
    public val outlineColor: TanreiPaint,
    public val iconColor: TanreiPaint,
    public val labelColor: TanreiPaint,
    public val supportingTextColor: TanreiPaint,
    public val selectionTextColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
    public val errorOutlineColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(outlineColor.roles())
        addAll(iconColor.roles())
        addAll(labelColor.roles())
        addAll(supportingTextColor.roles())
        addAll(selectionTextColor.roles())
        addAll(stateLayerColor.roles())
        addAll(errorOutlineColor.roles())
    }
}

/** One condition of file-picker: a full set of tokens per interaction state. */
@Immutable
public data class TanreiFilePickerConditionTokens(
    public val enabled: TanreiFilePickerConditionStateTokens,
    public val hovered: TanreiFilePickerConditionStateTokens,
    public val focused: TanreiFilePickerConditionStateTokens,
    public val pressed: TanreiFilePickerConditionStateTokens,
    public val disabled: TanreiFilePickerConditionStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiFilePickerConditionStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every condition of file-picker: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiFilePickerConditions(
    public val standard: TanreiFilePickerConditionTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiFilePickerCondition, TanreiFilePickerConditionTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiFilePickerCondition> get() = linkedSetOf(TanreiFilePickerCondition.Standard) + extra.keys

    public operator fun contains(key: TanreiFilePickerCondition): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiFilePickerCondition): TanreiFilePickerConditionTokens? = when (key) {
        TanreiFilePickerCondition.Standard -> standard
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [standard]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiFilePickerCondition): TanreiFilePickerConditionTokens = find(key) ?: standard

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(standard.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of file-picker shares in one interaction state. */
@Immutable
public data class TanreiFilePickerStateTokens(
    public val opacity: Float,
)

/** `comp.file-picker`. Members are flat tokens, then per-state tokens, then one holder per axis (`conditions[condition]`). */
@Immutable
public data class TanreiFilePickerTokens(
    public val containerGap: Dp,
    public val containerPaddingBlock: Dp,
    public val containerPaddingInline: Dp,
    public val containerShape: Dp,
    public val iconSize: Dp,
    public val labelTypescale: TanreiTextStyle,
    public val motionFeedbackDuration: Int,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val outlineDashLength: Dp,
    public val outlineStyle: Float,
    public val outlineWidth: Dp,
    public val receivingContainerColor: TanreiPaint,
    public val receivingContentColor: TanreiPaint,
    public val receivingOutlineColor: TanreiPaint,
    public val refusingIconColor: TanreiPaint,
    public val refusingOutlineColor: TanreiPaint,
    public val selectionTextTypescale: TanreiTextStyle,
    public val supportingTextGap: Dp,
    public val supportingTextTypescale: TanreiTextStyle,
    public val triggerGap: Dp,
    public val hovered: TanreiFilePickerStateTokens,
    public val focused: TanreiFilePickerStateTokens,
    public val pressed: TanreiFilePickerStateTokens,
    public val disabled: TanreiFilePickerStateTokens,
    public val conditions: TanreiFilePickerConditions,
) {
    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(receivingContainerColor.roles())
        addAll(receivingContentColor.roles())
        addAll(receivingOutlineColor.roles())
        addAll(refusingIconColor.roles())
        addAll(refusingOutlineColor.roles())
        addAll(conditions.referencedRoles())
    }
}

/** `comp.file-upload`. Members are flat tokens, then per-state tokens, then one holder per axis (). */
@Immutable
public data class TanreiFileUploadTokens(
    public val listGap: Dp,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
    }
}

/**
 * A size of handle: the key of one entry of [TanreiHandleSizes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Medium].
 */
@JvmInline
public value class TanreiHandleSize(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Small: TanreiHandleSize = TanreiHandleSize("small")
        public val Medium: TanreiHandleSize = TanreiHandleSize("medium")
    }
}

/** The tokens of one size of handle. */
@Immutable
public data class TanreiHandleSizeTokens(
    public val containerLength: Dp,
    public val containerBreadth: Dp,
    public val lineLength: Dp,
    public val lineThickness: Dp,
    public val lineActiveLength: Dp,
    public val lineActiveThickness: Dp,
    public val arcRadius: Dp,
)

/**
 * Every size of handle: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiHandleSizes(
    public val small: TanreiHandleSizeTokens,
    public val medium: TanreiHandleSizeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiHandleSize, TanreiHandleSizeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiHandleSize> get() = linkedSetOf(TanreiHandleSize.Small, TanreiHandleSize.Medium) + extra.keys

    public operator fun contains(key: TanreiHandleSize): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiHandleSize): TanreiHandleSizeTokens? = when (key) {
        TanreiHandleSize.Small -> small
        TanreiHandleSize.Medium -> medium
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [medium]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiHandleSize): TanreiHandleSizeTokens = find(key) ?: medium
}

/**
 * A condition of handle: the key of one entry of [TanreiHandleConditions]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Standard].
 */
@JvmInline
public value class TanreiHandleCondition(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Standard: TanreiHandleCondition = TanreiHandleCondition("standard")
    }
}

/** What one condition of handle draws in one interaction state. */
@Immutable
public data class TanreiHandleConditionStateTokens(
    public val containerColor: TanreiPaint,
    public val lineColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(lineColor.roles())
        addAll(stateLayerColor.roles())
    }
}

/** One condition of handle: a full set of tokens per interaction state. */
@Immutable
public data class TanreiHandleConditionTokens(
    public val enabled: TanreiHandleConditionStateTokens,
    public val hovered: TanreiHandleConditionStateTokens,
    public val focused: TanreiHandleConditionStateTokens,
    public val pressed: TanreiHandleConditionStateTokens,
    public val disabled: TanreiHandleConditionStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiHandleConditionStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every condition of handle: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiHandleConditions(
    public val standard: TanreiHandleConditionTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiHandleCondition, TanreiHandleConditionTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiHandleCondition> get() = linkedSetOf(TanreiHandleCondition.Standard) + extra.keys

    public operator fun contains(key: TanreiHandleCondition): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiHandleCondition): TanreiHandleConditionTokens? = when (key) {
        TanreiHandleCondition.Standard -> standard
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [standard]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiHandleCondition): TanreiHandleConditionTokens = find(key) ?: standard

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(standard.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of handle shares in one interaction state. */
@Immutable
public data class TanreiHandleStateTokens(
    public val opacity: Float,
)

/** `comp.handle`. Members are flat tokens, then per-state tokens, then one holder per axis (`sizes[size]`, `conditions[condition]`). */
@Immutable
public data class TanreiHandleTokens(
    public val containerShape: Dp,
    public val inset: Dp,
    public val motionFeedbackDuration: Int,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val hovered: TanreiHandleStateTokens,
    public val focused: TanreiHandleStateTokens,
    public val pressed: TanreiHandleStateTokens,
    public val disabled: TanreiHandleStateTokens,
    public val sizes: TanreiHandleSizes,
    public val conditions: TanreiHandleConditions,
) {
    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(conditions.referencedRoles())
    }
}

/** `comp.image-preview`. Members are flat tokens, then per-state tokens, then one holder per axis (). */
@Immutable
public data class TanreiImagePreviewTokens(
    public val barButtonVariant: Float,
    public val barContainerColor: TanreiPaint,
    public val barGap: Dp,
    public val barHeight: Dp,
    public val barPaddingInline: Dp,
    public val captionColor: TanreiPaint,
    public val captionContainerColor: TanreiPaint,
    public val captionMaxWidth: Dp,
    public val captionPaddingBlock: Dp,
    public val captionPaddingInline: Dp,
    public val captionTypescale: TanreiTextStyle,
    public val containerColor: TanreiPaint,
    public val countColor: TanreiPaint,
    public val countPaddingInline: Dp,
    public val countTypescale: TanreiTextStyle,
    public val errorGap: Dp,
    public val errorIconColor: TanreiPaint,
    public val errorIconSize: Dp,
    public val errorTextColor: TanreiPaint,
    public val errorTextTypescale: TanreiTextStyle,
    public val layoutPageGap: Dp,
    public val motionControlsDuration: Int,
    public val motionControlsEasing: TanreiCubicBezier,
    public val motionEnterDuration: Int,
    public val motionEnterEasing: TanreiCubicBezier,
    public val motionEnterScale: Float,
    public val motionExitDuration: Int,
    public val motionExitEasing: TanreiCubicBezier,
    public val motionPageDuration: Int,
    public val motionPageEasing: TanreiCubicBezier,
    public val motionZoomDuration: Int,
    public val motionZoomEasing: TanreiCubicBezier,
    public val navigationButtonVariant: Float,
    public val navigationMarginInline: Dp,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(barContainerColor.roles())
        addAll(captionColor.roles())
        addAll(captionContainerColor.roles())
        addAll(containerColor.roles())
        addAll(countColor.roles())
        addAll(errorIconColor.roles())
        addAll(errorTextColor.roles())
    }
}

/** `comp.inline-code`. Members are flat tokens, then per-state tokens, then one holder per axis (). */
@Immutable
public data class TanreiInlineCodeTokens(
    public val containerColor: TanreiPaint,
    public val containerPaddingInline: Dp,
    public val containerShape: Dp,
    public val labelColor: TanreiPaint,
    public val labelScale: Float,
    public val labelTypescale: TanreiTextStyle,
    public val outlineColor: TanreiPaint,
    public val outlineWidth: Dp,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(labelColor.roles())
        addAll(outlineColor.roles())
    }
}

/**
 * A size of input-box: the key of one entry of [TanreiInputBoxSizes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Medium].
 */
@JvmInline
public value class TanreiInputBoxSize(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Small: TanreiInputBoxSize = TanreiInputBoxSize("small")
        public val Medium: TanreiInputBoxSize = TanreiInputBoxSize("medium")
        public val Large: TanreiInputBoxSize = TanreiInputBoxSize("large")
    }
}

/** The tokens of one size of input-box. */
@Immutable
public data class TanreiInputBoxSizeTokens(
    public val containerHeight: Dp,
    public val containerPaddingInline: Dp,
    public val containerPaddingInlineWithIcon: Dp,
    public val containerPaddingBlock: Dp,
    public val containerPaddingBlockWithLabel: Dp,
    public val containerGap: Dp,
    public val labelTypescale: TanreiTextStyle,
    public val labelFloatedTypescale: TanreiTextStyle,
    public val inputTypescale: TanreiTextStyle,
    public val iconSize: Dp,
    public val motionStateDuration: Int,
)

/**
 * Every size of input-box: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiInputBoxSizes(
    public val small: TanreiInputBoxSizeTokens,
    public val medium: TanreiInputBoxSizeTokens,
    public val large: TanreiInputBoxSizeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiInputBoxSize, TanreiInputBoxSizeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiInputBoxSize> get() = linkedSetOf(TanreiInputBoxSize.Small, TanreiInputBoxSize.Medium, TanreiInputBoxSize.Large) + extra.keys

    public operator fun contains(key: TanreiInputBoxSize): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiInputBoxSize): TanreiInputBoxSizeTokens? = when (key) {
        TanreiInputBoxSize.Small -> small
        TanreiInputBoxSize.Medium -> medium
        TanreiInputBoxSize.Large -> large
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [medium]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiInputBoxSize): TanreiInputBoxSizeTokens = find(key) ?: medium
}

/**
 * A variant of input-box: the key of one entry of [TanreiInputBoxVariants]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Stacked].
 */
@JvmInline
public value class TanreiInputBoxVariant(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Stacked: TanreiInputBoxVariant = TanreiInputBoxVariant("stacked")
        public val Filled: TanreiInputBoxVariant = TanreiInputBoxVariant("filled")
        public val Outlined: TanreiInputBoxVariant = TanreiInputBoxVariant("outlined")
    }
}

/** What one variant of input-box draws in one interaction state. */
@Immutable
public data class TanreiInputBoxVariantStateTokens(
    public val containerColor: TanreiPaint,
    public val activeIndicatorColor: TanreiPaint,
    public val outlineColor: TanreiPaint,
    public val labelColor: TanreiPaint,
    public val inputColor: TanreiPaint,
    public val placeholderColor: TanreiPaint,
    public val affixColor: TanreiPaint,
    public val leadingIconColor: TanreiPaint,
    public val trailingIconColor: TanreiPaint,
    public val caretColor: TanreiPaint,
    public val requiredAsteriskColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
    public val errorContainerColor: TanreiPaint,
    public val errorActiveIndicatorColor: TanreiPaint,
    public val errorOutlineColor: TanreiPaint,
    public val errorLabelColor: TanreiPaint,
    public val errorInputColor: TanreiPaint,
    public val errorPlaceholderColor: TanreiPaint,
    public val errorAffixColor: TanreiPaint,
    public val errorLeadingIconColor: TanreiPaint,
    public val errorTrailingIconColor: TanreiPaint,
    public val errorCaretColor: TanreiPaint,
    public val errorRequiredAsteriskColor: TanreiPaint,
    public val errorStateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(activeIndicatorColor.roles())
        addAll(outlineColor.roles())
        addAll(labelColor.roles())
        addAll(inputColor.roles())
        addAll(placeholderColor.roles())
        addAll(affixColor.roles())
        addAll(leadingIconColor.roles())
        addAll(trailingIconColor.roles())
        addAll(caretColor.roles())
        addAll(requiredAsteriskColor.roles())
        addAll(stateLayerColor.roles())
        addAll(errorContainerColor.roles())
        addAll(errorActiveIndicatorColor.roles())
        addAll(errorOutlineColor.roles())
        addAll(errorLabelColor.roles())
        addAll(errorInputColor.roles())
        addAll(errorPlaceholderColor.roles())
        addAll(errorAffixColor.roles())
        addAll(errorLeadingIconColor.roles())
        addAll(errorTrailingIconColor.roles())
        addAll(errorCaretColor.roles())
        addAll(errorRequiredAsteriskColor.roles())
        addAll(errorStateLayerColor.roles())
    }
}

/** One variant of input-box: a full set of tokens per interaction state. */
@Immutable
public data class TanreiInputBoxVariantTokens(
    public val enabled: TanreiInputBoxVariantStateTokens,
    public val hovered: TanreiInputBoxVariantStateTokens,
    public val focused: TanreiInputBoxVariantStateTokens,
    public val disabled: TanreiInputBoxVariantStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiInputBoxVariantStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> enabled
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every variant of input-box: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiInputBoxVariants(
    public val stacked: TanreiInputBoxVariantTokens,
    public val filled: TanreiInputBoxVariantTokens,
    public val outlined: TanreiInputBoxVariantTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiInputBoxVariant, TanreiInputBoxVariantTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiInputBoxVariant> get() = linkedSetOf(TanreiInputBoxVariant.Stacked, TanreiInputBoxVariant.Filled, TanreiInputBoxVariant.Outlined) + extra.keys

    public operator fun contains(key: TanreiInputBoxVariant): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiInputBoxVariant): TanreiInputBoxVariantTokens? = when (key) {
        TanreiInputBoxVariant.Stacked -> stacked
        TanreiInputBoxVariant.Filled -> filled
        TanreiInputBoxVariant.Outlined -> outlined
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [stacked]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiInputBoxVariant): TanreiInputBoxVariantTokens = find(key) ?: stacked

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(stacked.referencedRoles())
        addAll(filled.referencedRoles())
        addAll(outlined.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of input-box shares in one interaction state. */
@Immutable
public data class TanreiInputBoxStateTokens(
    public val activeIndicatorWidth: Dp,
    public val opacity: Float,
    public val outlineWidth: Dp,
)

/** `comp.input-box`. Members are flat tokens, then per-state tokens, then one holder per axis (`sizes[size]`, `variants[variant]`). */
@Immutable
public data class TanreiInputBoxTokens(
    public val activeIndicatorWidth: Dp,
    public val affixGap: Dp,
    public val containerShape: Dp,
    public val containerShapeBottom: Dp,
    public val motionLabelDuration: Int,
    public val motionLabelEasing: TanreiCubicBezier,
    public val motionStateEasing: TanreiCubicBezier,
    public val outlineNotchPadding: Dp,
    public val outlineWidth: Dp,
    public val requirementAsteriskGap: Dp,
    public val selectionColor: TanreiPaint,
    public val selectionContentColor: TanreiPaint,
    public val hovered: TanreiInputBoxStateTokens,
    public val focused: TanreiInputBoxStateTokens,
    public val disabled: TanreiInputBoxStateTokens,
    public val sizes: TanreiInputBoxSizes,
    public val variants: TanreiInputBoxVariants,
) {
    /** `active-indicator-width` of [state]. */
    public fun activeIndicatorWidth(state: TanreiInteractionState): Dp = when (state) {
        TanreiInteractionState.Enabled -> activeIndicatorWidth
        TanreiInteractionState.Hovered -> hovered.activeIndicatorWidth
        TanreiInteractionState.Focused -> focused.activeIndicatorWidth
        TanreiInteractionState.Pressed -> activeIndicatorWidth
        TanreiInteractionState.Disabled -> disabled.activeIndicatorWidth
    }

    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> 1f
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    /** `outline-width` of [state]. */
    public fun outlineWidth(state: TanreiInteractionState): Dp = when (state) {
        TanreiInteractionState.Enabled -> outlineWidth
        TanreiInteractionState.Hovered -> hovered.outlineWidth
        TanreiInteractionState.Focused -> focused.outlineWidth
        TanreiInteractionState.Pressed -> outlineWidth
        TanreiInteractionState.Disabled -> disabled.outlineWidth
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(selectionColor.roles())
        addAll(selectionContentColor.roles())
        addAll(variants.referencedRoles())
    }
}

/**
 * A size of keyboard-shortcut: the key of one entry of [TanreiKeyboardShortcutSizes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Medium].
 */
@JvmInline
public value class TanreiKeyboardShortcutSize(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Small: TanreiKeyboardShortcutSize = TanreiKeyboardShortcutSize("small")
        public val Medium: TanreiKeyboardShortcutSize = TanreiKeyboardShortcutSize("medium")
    }
}

/** The tokens of one size of keyboard-shortcut. */
@Immutable
public data class TanreiKeyboardShortcutSizeTokens(
    public val containerHeight: Dp,
    public val containerPaddingInline: Dp,
    public val containerShape: Dp,
    public val labelTypescale: TanreiTextStyle,
    public val chordGap: Dp,
    public val sequenceGap: Dp,
)

/**
 * Every size of keyboard-shortcut: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiKeyboardShortcutSizes(
    public val small: TanreiKeyboardShortcutSizeTokens,
    public val medium: TanreiKeyboardShortcutSizeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiKeyboardShortcutSize, TanreiKeyboardShortcutSizeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiKeyboardShortcutSize> get() = linkedSetOf(TanreiKeyboardShortcutSize.Small, TanreiKeyboardShortcutSize.Medium) + extra.keys

    public operator fun contains(key: TanreiKeyboardShortcutSize): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiKeyboardShortcutSize): TanreiKeyboardShortcutSizeTokens? = when (key) {
        TanreiKeyboardShortcutSize.Small -> small
        TanreiKeyboardShortcutSize.Medium -> medium
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [medium]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiKeyboardShortcutSize): TanreiKeyboardShortcutSizeTokens = find(key) ?: medium
}

/**
 * A variant of keyboard-shortcut: the key of one entry of [TanreiKeyboardShortcutVariants]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Keycap].
 */
@JvmInline
public value class TanreiKeyboardShortcutVariant(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Keycap: TanreiKeyboardShortcutVariant = TanreiKeyboardShortcutVariant("keycap")
        public val Plain: TanreiKeyboardShortcutVariant = TanreiKeyboardShortcutVariant("plain")
    }
}

/** What one variant of keyboard-shortcut draws in one interaction state. */
@Immutable
public data class TanreiKeyboardShortcutVariantStateTokens(
    public val labelColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(labelColor.roles())
    }
}

/** One variant of keyboard-shortcut: a full set of tokens per interaction state. */
@Immutable
public data class TanreiKeyboardShortcutVariantTokens(
    public val enabled: TanreiKeyboardShortcutVariantStateTokens,
    public val disabled: TanreiKeyboardShortcutVariantStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiKeyboardShortcutVariantStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> enabled
        TanreiInteractionState.Focused -> enabled
        TanreiInteractionState.Pressed -> enabled
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every variant of keyboard-shortcut: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiKeyboardShortcutVariants(
    public val keycap: TanreiKeyboardShortcutVariantTokens,
    public val plain: TanreiKeyboardShortcutVariantTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiKeyboardShortcutVariant, TanreiKeyboardShortcutVariantTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiKeyboardShortcutVariant> get() = linkedSetOf(TanreiKeyboardShortcutVariant.Keycap, TanreiKeyboardShortcutVariant.Plain) + extra.keys

    public operator fun contains(key: TanreiKeyboardShortcutVariant): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiKeyboardShortcutVariant): TanreiKeyboardShortcutVariantTokens? = when (key) {
        TanreiKeyboardShortcutVariant.Keycap -> keycap
        TanreiKeyboardShortcutVariant.Plain -> plain
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [keycap]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiKeyboardShortcutVariant): TanreiKeyboardShortcutVariantTokens = find(key) ?: keycap

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(keycap.referencedRoles())
        addAll(plain.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** `comp.keyboard-shortcut`. Members are flat tokens, then per-state tokens, then one holder per axis (`sizes[size]`, `variants[variant]`). */
@Immutable
public data class TanreiKeyboardShortcutTokens(
    public val containerColor: TanreiPaint,
    public val outlineBottomWidth: Dp,
    public val outlineColor: TanreiPaint,
    public val outlineWidth: Dp,
    public val sizes: TanreiKeyboardShortcutSizes,
    public val variants: TanreiKeyboardShortcutVariants,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(outlineColor.roles())
        addAll(variants.referencedRoles())
    }
}

/**
 * A variant of link-card: the key of one entry of [TanreiLinkCardVariants]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Outlined].
 */
@JvmInline
public value class TanreiLinkCardVariant(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Outlined: TanreiLinkCardVariant = TanreiLinkCardVariant("outlined")
        public val Filled: TanreiLinkCardVariant = TanreiLinkCardVariant("filled")
    }
}

/** What one variant of link-card draws in one interaction state. */
@Immutable
public data class TanreiLinkCardVariantStateTokens(
    public val containerColor: TanreiPaint,
    public val outlineColor: TanreiPaint,
    public val titleColor: TanreiPaint,
    public val descriptionColor: TanreiPaint,
    public val siteColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(outlineColor.roles())
        addAll(titleColor.roles())
        addAll(descriptionColor.roles())
        addAll(siteColor.roles())
        addAll(stateLayerColor.roles())
    }
}

/** One variant of link-card: a full set of tokens per interaction state. */
@Immutable
public data class TanreiLinkCardVariantTokens(
    public val enabled: TanreiLinkCardVariantStateTokens,
    public val hovered: TanreiLinkCardVariantStateTokens,
    public val focused: TanreiLinkCardVariantStateTokens,
    public val pressed: TanreiLinkCardVariantStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiLinkCardVariantStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> enabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles()
}

/**
 * Every variant of link-card: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiLinkCardVariants(
    public val outlined: TanreiLinkCardVariantTokens,
    public val filled: TanreiLinkCardVariantTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiLinkCardVariant, TanreiLinkCardVariantTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiLinkCardVariant> get() = linkedSetOf(TanreiLinkCardVariant.Outlined, TanreiLinkCardVariant.Filled) + extra.keys

    public operator fun contains(key: TanreiLinkCardVariant): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiLinkCardVariant): TanreiLinkCardVariantTokens? = when (key) {
        TanreiLinkCardVariant.Outlined -> outlined
        TanreiLinkCardVariant.Filled -> filled
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [outlined]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiLinkCardVariant): TanreiLinkCardVariantTokens = find(key) ?: outlined

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(outlined.referencedRoles())
        addAll(filled.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of link-card shares in one interaction state. */
@Immutable
public data class TanreiLinkCardStateTokens(
    public val opacity: Float,
)

/** `comp.link-card`. Members are flat tokens, then per-state tokens, then one holder per axis (`variants[variant]`). */
@Immutable
public data class TanreiLinkCardTokens(
    public val containerPadding: Dp,
    public val containerShape: Dp,
    public val descriptionMaxLines: Float,
    public val descriptionTypescale: TanreiTextStyle,
    public val layoutBesideMinWidth: Dp,
    public val mediaAspectRatio: Float,
    public val mediaContainerColor: TanreiPaint,
    public val mediaWidth: Dp,
    public val motionFeedbackDuration: Int,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val outlineWidth: Dp,
    public val siteGap: Dp,
    public val siteIconShape: Dp,
    public val siteIconSize: Dp,
    public val siteItemGap: Dp,
    public val siteTypescale: TanreiTextStyle,
    public val titleGap: Dp,
    public val titleMaxLines: Float,
    public val titleTypescale: TanreiTextStyle,
    public val hovered: TanreiLinkCardStateTokens,
    public val focused: TanreiLinkCardStateTokens,
    public val pressed: TanreiLinkCardStateTokens,
    public val variants: TanreiLinkCardVariants,
) {
    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> 1f
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(mediaContainerColor.roles())
        addAll(variants.referencedRoles())
    }
}

/**
 * A variant of link: the key of one entry of [TanreiLinkVariants]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Standard].
 */
@JvmInline
public value class TanreiLinkVariant(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Standard: TanreiLinkVariant = TanreiLinkVariant("standard")
        public val Inverse: TanreiLinkVariant = TanreiLinkVariant("inverse")
    }
}

/** What one variant of link draws in one interaction state. */
@Immutable
public data class TanreiLinkVariantStateTokens(
    public val containerColor: TanreiPaint,
    public val labelColor: TanreiPaint,
    public val iconColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
    public val currentContainerColor: TanreiPaint,
    public val currentLabelColor: TanreiPaint,
    public val currentIconColor: TanreiPaint,
    public val currentStateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(labelColor.roles())
        addAll(iconColor.roles())
        addAll(stateLayerColor.roles())
        addAll(currentContainerColor.roles())
        addAll(currentLabelColor.roles())
        addAll(currentIconColor.roles())
        addAll(currentStateLayerColor.roles())
    }
}

/** One variant of link: a full set of tokens per interaction state. */
@Immutable
public data class TanreiLinkVariantTokens(
    public val enabled: TanreiLinkVariantStateTokens,
    public val hovered: TanreiLinkVariantStateTokens,
    public val focused: TanreiLinkVariantStateTokens,
    public val pressed: TanreiLinkVariantStateTokens,
    public val disabled: TanreiLinkVariantStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiLinkVariantStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every variant of link: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiLinkVariants(
    public val standard: TanreiLinkVariantTokens,
    public val inverse: TanreiLinkVariantTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiLinkVariant, TanreiLinkVariantTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiLinkVariant> get() = linkedSetOf(TanreiLinkVariant.Standard, TanreiLinkVariant.Inverse) + extra.keys

    public operator fun contains(key: TanreiLinkVariant): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiLinkVariant): TanreiLinkVariantTokens? = when (key) {
        TanreiLinkVariant.Standard -> standard
        TanreiLinkVariant.Inverse -> inverse
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [standard]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiLinkVariant): TanreiLinkVariantTokens = find(key) ?: standard

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(standard.referencedRoles())
        addAll(inverse.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of link shares in one interaction state. */
@Immutable
public data class TanreiLinkStateTokens(
    public val containerShape: Dp,
    public val opacity: Float,
)

/** `comp.link`. Members are flat tokens, then per-state tokens, then one holder per axis (`variants[variant]`). */
@Immutable
public data class TanreiLinkTokens(
    public val containerGap: Dp,
    public val containerShape: Dp,
    public val externalMarks: Float,
    public val motionFeedbackDuration: Int,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val siteIconDisabledOpacity: Float,
    public val siteIconShape: Dp,
    public val underlineOffset: Dp,
    public val underlineVisibility: Float,
    public val underlineWidth: Dp,
    public val hovered: TanreiLinkStateTokens,
    public val focused: TanreiLinkStateTokens,
    public val pressed: TanreiLinkStateTokens,
    public val disabled: TanreiLinkStateTokens,
    public val variants: TanreiLinkVariants,
) {
    /** `container-shape` of [state]. */
    public fun containerShape(state: TanreiInteractionState): Dp = when (state) {
        TanreiInteractionState.Enabled -> containerShape
        TanreiInteractionState.Hovered -> hovered.containerShape
        TanreiInteractionState.Focused -> focused.containerShape
        TanreiInteractionState.Pressed -> pressed.containerShape
        TanreiInteractionState.Disabled -> disabled.containerShape
    }

    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(variants.referencedRoles())
    }
}

/**
 * A density of list-row: the key of one entry of [TanreiListRowDensitys]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Regular].
 */
@JvmInline
public value class TanreiListRowDensity(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Regular: TanreiListRowDensity = TanreiListRowDensity("regular")
        public val Compact: TanreiListRowDensity = TanreiListRowDensity("compact")
    }
}

/** The tokens of one density of list-row. */
@Immutable
public data class TanreiListRowDensityTokens(
    public val containerHeightOneLine: Dp,
    public val containerHeightTwoLine: Dp,
    public val containerHeightThreeLine: Dp,
    public val containerPaddingBlock: Dp,
)

/**
 * Every density of list-row: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiListRowDensitys(
    public val regular: TanreiListRowDensityTokens,
    public val compact: TanreiListRowDensityTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiListRowDensity, TanreiListRowDensityTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiListRowDensity> get() = linkedSetOf(TanreiListRowDensity.Regular, TanreiListRowDensity.Compact) + extra.keys

    public operator fun contains(key: TanreiListRowDensity): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiListRowDensity): TanreiListRowDensityTokens? = when (key) {
        TanreiListRowDensity.Regular -> regular
        TanreiListRowDensity.Compact -> compact
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [regular]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiListRowDensity): TanreiListRowDensityTokens = find(key) ?: regular
}

/** `comp.list-row`. Members are flat tokens, then per-state tokens, then one holder per axis (`densitys[density]`). */
@Immutable
public data class TanreiListRowTokens(
    public val containerGap: Dp,
    public val containerPaddingInlineEnd: Dp,
    public val containerPaddingInlineStart: Dp,
    public val headlineColor: TanreiPaint,
    public val headlineTypescale: TanreiTextStyle,
    public val leadingIconColor: TanreiPaint,
    public val leadingIconSize: Dp,
    public val overlineColor: TanreiPaint,
    public val overlineTypescale: TanreiTextStyle,
    public val supportingTextColor: TanreiPaint,
    public val supportingTextTypescale: TanreiTextStyle,
    public val trailingIconColor: TanreiPaint,
    public val trailingIconSize: Dp,
    public val trailingTextColor: TanreiPaint,
    public val trailingTextTypescale: TanreiTextStyle,
    public val densitys: TanreiListRowDensitys,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(headlineColor.roles())
        addAll(leadingIconColor.roles())
        addAll(overlineColor.roles())
        addAll(supportingTextColor.roles())
        addAll(trailingIconColor.roles())
        addAll(trailingTextColor.roles())
    }
}

/**
 * A condition of list: the key of one entry of [TanreiListConditions]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Unselected].
 */
@JvmInline
public value class TanreiListCondition(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Unselected: TanreiListCondition = TanreiListCondition("unselected")
        public val Selected: TanreiListCondition = TanreiListCondition("selected")
    }
}

/** What one condition of list draws in one interaction state. */
@Immutable
public data class TanreiListConditionStateTokens(
    public val containerColor: TanreiPaint,
    public val contentColor: TanreiPaint,
    public val markColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(contentColor.roles())
        addAll(markColor.roles())
        addAll(stateLayerColor.roles())
    }
}

/** One condition of list: a full set of tokens per interaction state. */
@Immutable
public data class TanreiListConditionTokens(
    public val enabled: TanreiListConditionStateTokens,
    public val hovered: TanreiListConditionStateTokens,
    public val focused: TanreiListConditionStateTokens,
    public val pressed: TanreiListConditionStateTokens,
    public val disabled: TanreiListConditionStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiListConditionStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every condition of list: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiListConditions(
    public val unselected: TanreiListConditionTokens,
    public val selected: TanreiListConditionTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiListCondition, TanreiListConditionTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiListCondition> get() = linkedSetOf(TanreiListCondition.Unselected, TanreiListCondition.Selected) + extra.keys

    public operator fun contains(key: TanreiListCondition): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiListCondition): TanreiListConditionTokens? = when (key) {
        TanreiListCondition.Unselected -> unselected
        TanreiListCondition.Selected -> selected
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [unselected]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiListCondition): TanreiListConditionTokens = find(key) ?: unselected

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(unselected.referencedRoles())
        addAll(selected.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of list shares in one interaction state. */
@Immutable
public data class TanreiListStateTokens(
    public val containerShape: Dp,
    public val opacity: Float,
)

/** `comp.list`. Members are flat tokens, then per-state tokens, then one holder per axis (`conditions[condition]`). */
@Immutable
public data class TanreiListTokens(
    public val containerGap: Dp,
    public val containerHeight: Dp,
    public val containerPaddingBlock: Dp,
    public val containerPaddingInlineEnd: Dp,
    public val containerPaddingInlineStart: Dp,
    public val containerShape: Dp,
    public val contentTypescale: TanreiTextStyle,
    public val dividerColor: TanreiPaint,
    public val dividerThickness: Dp,
    public val draggedContainerColor: TanreiPaint,
    public val draggedContainerElevation: List<TanreiShadowLayer>,
    public val gapLarge: Dp,
    public val gapMedium: Dp,
    public val gapSmall: Dp,
    public val markSize: Dp,
    public val markWidth: Dp,
    public val motionFeedbackDuration: Int,
    public val motionReorderDuration: Int,
    public val motionReorderEasing: TanreiCubicBezier,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val hovered: TanreiListStateTokens,
    public val focused: TanreiListStateTokens,
    public val pressed: TanreiListStateTokens,
    public val disabled: TanreiListStateTokens,
    public val conditions: TanreiListConditions,
) {
    /** `container-shape` of [state]. */
    public fun containerShape(state: TanreiInteractionState): Dp = when (state) {
        TanreiInteractionState.Enabled -> containerShape
        TanreiInteractionState.Hovered -> hovered.containerShape
        TanreiInteractionState.Focused -> focused.containerShape
        TanreiInteractionState.Pressed -> pressed.containerShape
        TanreiInteractionState.Disabled -> disabled.containerShape
    }

    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(dividerColor.roles())
        addAll(draggedContainerColor.roles())
        draggedContainerElevation.forEach { add(it.role) }
        addAll(conditions.referencedRoles())
    }
}

/**
 * A size of loading-indicator: the key of one entry of [TanreiLoadingIndicatorSizes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Medium].
 */
@JvmInline
public value class TanreiLoadingIndicatorSize(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Small: TanreiLoadingIndicatorSize = TanreiLoadingIndicatorSize("small")
        public val Medium: TanreiLoadingIndicatorSize = TanreiLoadingIndicatorSize("medium")
        public val Large: TanreiLoadingIndicatorSize = TanreiLoadingIndicatorSize("large")
    }
}

/** The tokens of one size of loading-indicator. */
@Immutable
public data class TanreiLoadingIndicatorSizeTokens(
    public val indicatorSize: Dp,
    public val indicatorThickness: Dp,
    public val containerSize: Dp,
)

/**
 * Every size of loading-indicator: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiLoadingIndicatorSizes(
    public val small: TanreiLoadingIndicatorSizeTokens,
    public val medium: TanreiLoadingIndicatorSizeTokens,
    public val large: TanreiLoadingIndicatorSizeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiLoadingIndicatorSize, TanreiLoadingIndicatorSizeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiLoadingIndicatorSize> get() = linkedSetOf(TanreiLoadingIndicatorSize.Small, TanreiLoadingIndicatorSize.Medium, TanreiLoadingIndicatorSize.Large) + extra.keys

    public operator fun contains(key: TanreiLoadingIndicatorSize): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiLoadingIndicatorSize): TanreiLoadingIndicatorSizeTokens? = when (key) {
        TanreiLoadingIndicatorSize.Small -> small
        TanreiLoadingIndicatorSize.Medium -> medium
        TanreiLoadingIndicatorSize.Large -> large
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [medium]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiLoadingIndicatorSize): TanreiLoadingIndicatorSizeTokens = find(key) ?: medium
}

/** `comp.loading-indicator`. Members are flat tokens, then per-state tokens, then one holder per axis (`sizes[size]`). */
@Immutable
public data class TanreiLoadingIndicatorTokens(
    public val containedContainerColor: TanreiPaint,
    public val containedContainerElevation: List<TanreiShadowLayer>,
    public val containedIndicatorColor: TanreiPaint,
    public val containerShape: Dp,
    public val indicatorColor: TanreiPaint,
    public val motionCycleDuration: Int,
    public val motionEnterDuration: Int,
    public val motionEnterEasing: TanreiCubicBezier,
    public val motionEntrance: Float,
    public val motionShowDelay: Int,
    public val sizes: TanreiLoadingIndicatorSizes,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containedContainerColor.roles())
        containedContainerElevation.forEach { add(it.role) }
        addAll(containedIndicatorColor.roles())
        addAll(indicatorColor.roles())
    }
}

/**
 * A size of main-action-button: the key of one entry of [TanreiMainActionButtonSizes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Medium].
 */
@JvmInline
public value class TanreiMainActionButtonSize(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Small: TanreiMainActionButtonSize = TanreiMainActionButtonSize("small")
        public val Medium: TanreiMainActionButtonSize = TanreiMainActionButtonSize("medium")
        public val Large: TanreiMainActionButtonSize = TanreiMainActionButtonSize("large")
    }
}

/** The tokens of one size of main-action-button. */
@Immutable
public data class TanreiMainActionButtonSizeTokens(
    public val containerHeight: Dp,
    public val containerShape: Dp,
    public val containerPaddingInlineStart: Dp,
    public val containerPaddingInlineEnd: Dp,
    public val containerPaddingInlineStartWithIcon: Dp,
    public val containerPaddingInlineEndWithIcon: Dp,
    public val containerPaddingBlock: Dp,
    public val containerGap: Dp,
    public val labelTypescale: TanreiTextStyle,
    public val iconSize: Dp,
    public val motionStateDuration: Int,
)

/**
 * Every size of main-action-button: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiMainActionButtonSizes(
    public val small: TanreiMainActionButtonSizeTokens,
    public val medium: TanreiMainActionButtonSizeTokens,
    public val large: TanreiMainActionButtonSizeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiMainActionButtonSize, TanreiMainActionButtonSizeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiMainActionButtonSize> get() = linkedSetOf(TanreiMainActionButtonSize.Small, TanreiMainActionButtonSize.Medium, TanreiMainActionButtonSize.Large) + extra.keys

    public operator fun contains(key: TanreiMainActionButtonSize): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiMainActionButtonSize): TanreiMainActionButtonSizeTokens? = when (key) {
        TanreiMainActionButtonSize.Small -> small
        TanreiMainActionButtonSize.Medium -> medium
        TanreiMainActionButtonSize.Large -> large
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [medium]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiMainActionButtonSize): TanreiMainActionButtonSizeTokens = find(key) ?: medium
}

/**
 * A variant of main-action-button: the key of one entry of [TanreiMainActionButtonVariants]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Filled].
 */
@JvmInline
public value class TanreiMainActionButtonVariant(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Filled: TanreiMainActionButtonVariant = TanreiMainActionButtonVariant("filled")
        public val Tonal: TanreiMainActionButtonVariant = TanreiMainActionButtonVariant("tonal")
        public val Surface: TanreiMainActionButtonVariant = TanreiMainActionButtonVariant("surface")
    }
}

/** What one variant of main-action-button draws in one interaction state. */
@Immutable
public data class TanreiMainActionButtonVariantStateTokens(
    public val containerColor: TanreiPaint,
    public val containerElevation: List<TanreiShadowLayer>,
    public val labelColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        containerElevation.forEach { add(it.role) }
        addAll(labelColor.roles())
        addAll(stateLayerColor.roles())
    }
}

/** One variant of main-action-button: a full set of tokens per interaction state. */
@Immutable
public data class TanreiMainActionButtonVariantTokens(
    public val enabled: TanreiMainActionButtonVariantStateTokens,
    public val hovered: TanreiMainActionButtonVariantStateTokens,
    public val focused: TanreiMainActionButtonVariantStateTokens,
    public val pressed: TanreiMainActionButtonVariantStateTokens,
    public val disabled: TanreiMainActionButtonVariantStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiMainActionButtonVariantStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every variant of main-action-button: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiMainActionButtonVariants(
    public val filled: TanreiMainActionButtonVariantTokens,
    public val tonal: TanreiMainActionButtonVariantTokens,
    public val surface: TanreiMainActionButtonVariantTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiMainActionButtonVariant, TanreiMainActionButtonVariantTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiMainActionButtonVariant> get() = linkedSetOf(TanreiMainActionButtonVariant.Filled, TanreiMainActionButtonVariant.Tonal, TanreiMainActionButtonVariant.Surface) + extra.keys

    public operator fun contains(key: TanreiMainActionButtonVariant): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiMainActionButtonVariant): TanreiMainActionButtonVariantTokens? = when (key) {
        TanreiMainActionButtonVariant.Filled -> filled
        TanreiMainActionButtonVariant.Tonal -> tonal
        TanreiMainActionButtonVariant.Surface -> surface
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [filled]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiMainActionButtonVariant): TanreiMainActionButtonVariantTokens = find(key) ?: filled

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(filled.referencedRoles())
        addAll(tonal.referencedRoles())
        addAll(surface.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of main-action-button shares in one interaction state. */
@Immutable
public data class TanreiMainActionButtonStateTokens(
    public val opacity: Float,
)

/** `comp.main-action-button`. Members are flat tokens, then per-state tokens, then one holder per axis (`sizes[size]`, `variants[variant]`). */
@Immutable
public data class TanreiMainActionButtonTokens(
    public val motionFeedbackDuration: Int,
    public val motionResizeDuration: Int,
    public val motionResizeEasing: TanreiCubicBezier,
    public val motionStateEasing: TanreiCubicBezier,
    public val hovered: TanreiMainActionButtonStateTokens,
    public val focused: TanreiMainActionButtonStateTokens,
    public val pressed: TanreiMainActionButtonStateTokens,
    public val disabled: TanreiMainActionButtonStateTokens,
    public val sizes: TanreiMainActionButtonSizes,
    public val variants: TanreiMainActionButtonVariants,
) {
    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(variants.referencedRoles())
    }
}

/**
 * A condition of menu: the key of one entry of [TanreiMenuConditions]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Unselected].
 */
@JvmInline
public value class TanreiMenuCondition(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Unselected: TanreiMenuCondition = TanreiMenuCondition("unselected")
        public val Selected: TanreiMenuCondition = TanreiMenuCondition("selected")
        public val Current: TanreiMenuCondition = TanreiMenuCondition("current")
        public val Destructive: TanreiMenuCondition = TanreiMenuCondition("destructive")
        public val Expanded: TanreiMenuCondition = TanreiMenuCondition("expanded")
    }
}

/** What one condition of menu draws in one interaction state. */
@Immutable
public data class TanreiMenuConditionStateTokens(
    public val containerColor: TanreiPaint,
    public val labelColor: TanreiPaint,
    public val supportingTextColor: TanreiPaint,
    public val trailingTextColor: TanreiPaint,
    public val leadingIconColor: TanreiPaint,
    public val trailingIconColor: TanreiPaint,
    public val markColor: TanreiPaint,
    public val controlColor: TanreiPaint,
    public val controlMarkColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(labelColor.roles())
        addAll(supportingTextColor.roles())
        addAll(trailingTextColor.roles())
        addAll(leadingIconColor.roles())
        addAll(trailingIconColor.roles())
        addAll(markColor.roles())
        addAll(controlColor.roles())
        addAll(controlMarkColor.roles())
        addAll(stateLayerColor.roles())
    }
}

/** One condition of menu: a full set of tokens per interaction state. */
@Immutable
public data class TanreiMenuConditionTokens(
    public val enabled: TanreiMenuConditionStateTokens,
    public val hovered: TanreiMenuConditionStateTokens,
    public val focused: TanreiMenuConditionStateTokens,
    public val pressed: TanreiMenuConditionStateTokens,
    public val disabled: TanreiMenuConditionStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiMenuConditionStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every condition of menu: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiMenuConditions(
    public val unselected: TanreiMenuConditionTokens,
    public val selected: TanreiMenuConditionTokens,
    public val current: TanreiMenuConditionTokens,
    public val destructive: TanreiMenuConditionTokens,
    public val expanded: TanreiMenuConditionTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiMenuCondition, TanreiMenuConditionTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiMenuCondition> get() = linkedSetOf(TanreiMenuCondition.Unselected, TanreiMenuCondition.Selected, TanreiMenuCondition.Current, TanreiMenuCondition.Destructive, TanreiMenuCondition.Expanded) + extra.keys

    public operator fun contains(key: TanreiMenuCondition): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiMenuCondition): TanreiMenuConditionTokens? = when (key) {
        TanreiMenuCondition.Unselected -> unselected
        TanreiMenuCondition.Selected -> selected
        TanreiMenuCondition.Current -> current
        TanreiMenuCondition.Destructive -> destructive
        TanreiMenuCondition.Expanded -> expanded
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [unselected]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiMenuCondition): TanreiMenuConditionTokens = find(key) ?: unselected

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(unselected.referencedRoles())
        addAll(selected.referencedRoles())
        addAll(current.referencedRoles())
        addAll(destructive.referencedRoles())
        addAll(expanded.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of menu shares in one interaction state. */
@Immutable
public data class TanreiMenuStateTokens(
    public val containerShape: Dp,
    public val opacity: Float,
)

/** `comp.menu`. Members are flat tokens, then per-state tokens, then one holder per axis (`conditions[condition]`). */
@Immutable
public data class TanreiMenuTokens(
    public val checkboxItemMark: Float,
    public val containerGap: Dp,
    public val containerHeight: Dp,
    public val containerPaddingBlock: Dp,
    public val containerPaddingInline: Dp,
    public val containerShape: Dp,
    public val controlBoxShape: Dp,
    public val controlBoxSize: Dp,
    public val controlFillInset: Dp,
    public val controlFillOpacity: Float,
    public val controlMarkSize: Dp,
    public val controlMarkWeight: Float,
    public val controlOutlineWidth: Dp,
    public val controlRingSelectedWidthShare: Float,
    public val controlRingSize: Dp,
    public val controlRingWidth: Dp,
    public val dividerColor: TanreiPaint,
    public val dividerSpace: Dp,
    public val dividerThickness: Dp,
    public val groupTitleColor: TanreiPaint,
    public val groupTitlePaddingInline: Dp,
    public val groupTitleTypescale: TanreiTextStyle,
    public val groupGap: Dp,
    public val labelTypescale: TanreiTextStyle,
    public val leadingIconSize: Dp,
    public val markSize: Dp,
    public val markWidth: Dp,
    public val motionCloseDuration: Int,
    public val motionCloseEasing: TanreiCubicBezier,
    public val motionFeedbackDuration: Int,
    public val motionOpenDuration: Int,
    public val motionOpenEasing: TanreiCubicBezier,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val motionSubmenuDelay: Int,
    public val radioItemMark: Float,
    public val separation: Float,
    public val shortcutVariant: Float,
    public val submenuOffset: Dp,
    public val supportingTextTypescale: TanreiTextStyle,
    public val surfaceColor: TanreiPaint,
    public val surfaceElevation: List<TanreiShadowLayer>,
    public val surfaceMaxWidth: Dp,
    public val surfaceMinWidth: Dp,
    public val surfaceOffset: Dp,
    public val surfacePaddingBlock: Dp,
    public val surfacePaddingInline: Dp,
    public val surfaceShape: Dp,
    public val surfaceViewportMargin: Dp,
    public val trailingIconSize: Dp,
    public val trailingTextTypescale: TanreiTextStyle,
    public val hovered: TanreiMenuStateTokens,
    public val focused: TanreiMenuStateTokens,
    public val pressed: TanreiMenuStateTokens,
    public val disabled: TanreiMenuStateTokens,
    public val conditions: TanreiMenuConditions,
) {
    /** `container-shape` of [state]. */
    public fun containerShape(state: TanreiInteractionState): Dp = when (state) {
        TanreiInteractionState.Enabled -> containerShape
        TanreiInteractionState.Hovered -> hovered.containerShape
        TanreiInteractionState.Focused -> focused.containerShape
        TanreiInteractionState.Pressed -> pressed.containerShape
        TanreiInteractionState.Disabled -> disabled.containerShape
    }

    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(dividerColor.roles())
        addAll(groupTitleColor.roles())
        addAll(surfaceColor.roles())
        surfaceElevation.forEach { add(it.role) }
        addAll(conditions.referencedRoles())
    }
}

/**
 * A condition of menubar: the key of one entry of [TanreiMenubarConditions]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Unselected].
 */
@JvmInline
public value class TanreiMenubarCondition(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Unselected: TanreiMenubarCondition = TanreiMenubarCondition("unselected")
        public val Selected: TanreiMenubarCondition = TanreiMenubarCondition("selected")
        public val Expanded: TanreiMenubarCondition = TanreiMenubarCondition("expanded")
    }
}

/** What one condition of menubar draws in one interaction state. */
@Immutable
public data class TanreiMenubarConditionStateTokens(
    public val containerColor: TanreiPaint,
    public val labelColor: TanreiPaint,
    public val iconColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(labelColor.roles())
        addAll(iconColor.roles())
        addAll(stateLayerColor.roles())
    }
}

/** One condition of menubar: a full set of tokens per interaction state. */
@Immutable
public data class TanreiMenubarConditionTokens(
    public val enabled: TanreiMenubarConditionStateTokens,
    public val hovered: TanreiMenubarConditionStateTokens,
    public val focused: TanreiMenubarConditionStateTokens,
    public val pressed: TanreiMenubarConditionStateTokens,
    public val disabled: TanreiMenubarConditionStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiMenubarConditionStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every condition of menubar: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiMenubarConditions(
    public val unselected: TanreiMenubarConditionTokens,
    public val selected: TanreiMenubarConditionTokens,
    public val expanded: TanreiMenubarConditionTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiMenubarCondition, TanreiMenubarConditionTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiMenubarCondition> get() = linkedSetOf(TanreiMenubarCondition.Unselected, TanreiMenubarCondition.Selected, TanreiMenubarCondition.Expanded) + extra.keys

    public operator fun contains(key: TanreiMenubarCondition): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiMenubarCondition): TanreiMenubarConditionTokens? = when (key) {
        TanreiMenubarCondition.Unselected -> unselected
        TanreiMenubarCondition.Selected -> selected
        TanreiMenubarCondition.Expanded -> expanded
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [unselected]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiMenubarCondition): TanreiMenubarConditionTokens = find(key) ?: unselected

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(unselected.referencedRoles())
        addAll(selected.referencedRoles())
        addAll(expanded.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of menubar shares in one interaction state. */
@Immutable
public data class TanreiMenubarStateTokens(
    public val containerShape: Dp,
    public val opacity: Float,
)

/** `comp.menubar`. Members are flat tokens, then per-state tokens, then one holder per axis (`conditions[condition]`). */
@Immutable
public data class TanreiMenubarTokens(
    public val barColor: TanreiPaint,
    public val barGap: Dp,
    public val barPaddingBlock: Dp,
    public val barPaddingInline: Dp,
    public val containerGap: Dp,
    public val containerHeight: Dp,
    public val containerPaddingInline: Dp,
    public val containerShape: Dp,
    public val iconSize: Dp,
    public val indicatorSize: Dp,
    public val labelTypescale: TanreiTextStyle,
    public val motionFeedbackDuration: Int,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val hovered: TanreiMenubarStateTokens,
    public val focused: TanreiMenubarStateTokens,
    public val pressed: TanreiMenubarStateTokens,
    public val disabled: TanreiMenubarStateTokens,
    public val conditions: TanreiMenubarConditions,
) {
    /** `container-shape` of [state]. */
    public fun containerShape(state: TanreiInteractionState): Dp = when (state) {
        TanreiInteractionState.Enabled -> containerShape
        TanreiInteractionState.Hovered -> hovered.containerShape
        TanreiInteractionState.Focused -> focused.containerShape
        TanreiInteractionState.Pressed -> pressed.containerShape
        TanreiInteractionState.Disabled -> disabled.containerShape
    }

    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(barColor.roles())
        addAll(conditions.referencedRoles())
    }
}

/**
 * A size of meter: the key of one entry of [TanreiMeterSizes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Medium].
 */
@JvmInline
public value class TanreiMeterSize(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Small: TanreiMeterSize = TanreiMeterSize("small")
        public val Medium: TanreiMeterSize = TanreiMeterSize("medium")
        public val Large: TanreiMeterSize = TanreiMeterSize("large")
    }
}

/** The tokens of one size of meter. */
@Immutable
public data class TanreiMeterSizeTokens(
    public val linearThickness: Dp,
    public val circularSize: Dp,
    public val circularThickness: Dp,
)

/**
 * Every size of meter: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiMeterSizes(
    public val small: TanreiMeterSizeTokens,
    public val medium: TanreiMeterSizeTokens,
    public val large: TanreiMeterSizeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiMeterSize, TanreiMeterSizeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiMeterSize> get() = linkedSetOf(TanreiMeterSize.Small, TanreiMeterSize.Medium, TanreiMeterSize.Large) + extra.keys

    public operator fun contains(key: TanreiMeterSize): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiMeterSize): TanreiMeterSizeTokens? = when (key) {
        TanreiMeterSize.Small -> small
        TanreiMeterSize.Medium -> medium
        TanreiMeterSize.Large -> large
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [medium]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiMeterSize): TanreiMeterSizeTokens = find(key) ?: medium
}

/** `comp.meter`. Members are flat tokens, then per-state tokens, then one holder per axis (`sizes[size]`). */
@Immutable
public data class TanreiMeterTokens(
    public val errorIndicatorColor: TanreiPaint,
    public val indicatorColor: TanreiPaint,
    public val infoIndicatorColor: TanreiPaint,
    public val motionValueDuration: Int,
    public val motionValueEasing: TanreiCubicBezier,
    public val stopIndicatorSize: Dp,
    public val successIndicatorColor: TanreiPaint,
    public val trackColor: TanreiPaint,
    public val trackGap: Dp,
    public val trackSeparation: Float,
    public val trackShape: Dp,
    public val warningIndicatorColor: TanreiPaint,
    public val sizes: TanreiMeterSizes,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(errorIndicatorColor.roles())
        addAll(indicatorColor.roles())
        addAll(infoIndicatorColor.roles())
        addAll(successIndicatorColor.roles())
        addAll(trackColor.roles())
        addAll(warningIndicatorColor.roles())
    }
}

/** `comp.modal-layer`. Members are flat tokens, then per-state tokens, then one holder per axis (). */
@Immutable
public data class TanreiModalLayerTokens(
    public val motionEnterDuration: Int,
    public val motionEnterEasing: TanreiCubicBezier,
    public val motionExitDuration: Int,
    public val motionExitEasing: TanreiCubicBezier,
    public val scrimBlur: Dp,
    public val scrimColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(scrimColor.roles())
    }
}

/**
 * A condition of navigation-bar: the key of one entry of [TanreiNavigationBarConditions]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Unselected].
 */
@JvmInline
public value class TanreiNavigationBarCondition(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Unselected: TanreiNavigationBarCondition = TanreiNavigationBarCondition("unselected")
        public val Selected: TanreiNavigationBarCondition = TanreiNavigationBarCondition("selected")
        public val FilledUnselected: TanreiNavigationBarCondition = TanreiNavigationBarCondition("filled-unselected")
        public val FilledSelected: TanreiNavigationBarCondition = TanreiNavigationBarCondition("filled-selected")
    }
}

/** What one condition of navigation-bar draws in one interaction state. */
@Immutable
public data class TanreiNavigationBarConditionStateTokens(
    public val itemContainerColor: TanreiPaint,
    public val itemIconIndicatorColor: TanreiPaint,
    public val itemIconColor: TanreiPaint,
    public val itemLabelColor: TanreiPaint,
    public val itemCoveredIconColor: TanreiPaint,
    public val itemCoveredLabelColor: TanreiPaint,
    public val itemStateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(itemContainerColor.roles())
        addAll(itemIconIndicatorColor.roles())
        addAll(itemIconColor.roles())
        addAll(itemLabelColor.roles())
        addAll(itemCoveredIconColor.roles())
        addAll(itemCoveredLabelColor.roles())
        addAll(itemStateLayerColor.roles())
    }
}

/** One condition of navigation-bar: a full set of tokens per interaction state. */
@Immutable
public data class TanreiNavigationBarConditionTokens(
    public val enabled: TanreiNavigationBarConditionStateTokens,
    public val hovered: TanreiNavigationBarConditionStateTokens,
    public val focused: TanreiNavigationBarConditionStateTokens,
    public val pressed: TanreiNavigationBarConditionStateTokens,
    public val disabled: TanreiNavigationBarConditionStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiNavigationBarConditionStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every condition of navigation-bar: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiNavigationBarConditions(
    public val unselected: TanreiNavigationBarConditionTokens,
    public val selected: TanreiNavigationBarConditionTokens,
    public val filledUnselected: TanreiNavigationBarConditionTokens,
    public val filledSelected: TanreiNavigationBarConditionTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiNavigationBarCondition, TanreiNavigationBarConditionTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiNavigationBarCondition> get() = linkedSetOf(TanreiNavigationBarCondition.Unselected, TanreiNavigationBarCondition.Selected, TanreiNavigationBarCondition.FilledUnselected, TanreiNavigationBarCondition.FilledSelected) + extra.keys

    public operator fun contains(key: TanreiNavigationBarCondition): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiNavigationBarCondition): TanreiNavigationBarConditionTokens? = when (key) {
        TanreiNavigationBarCondition.Unselected -> unselected
        TanreiNavigationBarCondition.Selected -> selected
        TanreiNavigationBarCondition.FilledUnselected -> filledUnselected
        TanreiNavigationBarCondition.FilledSelected -> filledSelected
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [unselected]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiNavigationBarCondition): TanreiNavigationBarConditionTokens = find(key) ?: unselected

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(unselected.referencedRoles())
        addAll(selected.referencedRoles())
        addAll(filledUnselected.referencedRoles())
        addAll(filledSelected.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of navigation-bar shares in one interaction state. */
@Immutable
public data class TanreiNavigationBarStateTokens(
    public val opacity: Float,
)

/** `comp.navigation-bar`. Members are flat tokens, then per-state tokens, then one holder per axis (`conditions[condition]`). */
@Immutable
public data class TanreiNavigationBarTokens(
    public val containerColor: TanreiPaint,
    public val containerElevation: List<TanreiShadowLayer>,
    public val containerHeight: Dp,
    public val containerPadding: Dp,
    public val itemContainerPaddingBlock: Dp,
    public val itemContainerPaddingInline: Dp,
    public val itemContainerShape: Dp,
    public val itemGap: Dp,
    public val itemIconIndicatorHeight: Dp,
    public val itemIconIndicatorShape: Dp,
    public val itemIconIndicatorWidth: Dp,
    public val itemIconSize: Dp,
    public val itemLabelTypescale: TanreiTextStyle,
    public val motionFeedbackDuration: Int,
    public val motionSelectionDuration: Int,
    public val motionSelectionEasing: TanreiCubicBezier,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val outlineColor: TanreiPaint,
    public val outlineWidth: Dp,
    public val hovered: TanreiNavigationBarStateTokens,
    public val focused: TanreiNavigationBarStateTokens,
    public val pressed: TanreiNavigationBarStateTokens,
    public val disabled: TanreiNavigationBarStateTokens,
    public val conditions: TanreiNavigationBarConditions,
) {
    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        containerElevation.forEach { add(it.role) }
        addAll(outlineColor.roles())
        addAll(conditions.referencedRoles())
    }
}

/**
 * A variant of navigation-drawer: the key of one entry of [TanreiNavigationDrawerVariants]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Standard].
 */
@JvmInline
public value class TanreiNavigationDrawerVariant(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Standard: TanreiNavigationDrawerVariant = TanreiNavigationDrawerVariant("standard")
        public val Modal: TanreiNavigationDrawerVariant = TanreiNavigationDrawerVariant("modal")
    }
}

/** The tokens of one variant of navigation-drawer. */
@Immutable
public data class TanreiNavigationDrawerVariantTokens(
    public val containerColor: TanreiPaint,
    public val containerElevation: List<TanreiShadowLayer>,
    public val containerShape: Dp,
    public val outlineColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        containerElevation.forEach { add(it.role) }
        addAll(outlineColor.roles())
    }
}

/**
 * Every variant of navigation-drawer: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiNavigationDrawerVariants(
    public val standard: TanreiNavigationDrawerVariantTokens,
    public val modal: TanreiNavigationDrawerVariantTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiNavigationDrawerVariant, TanreiNavigationDrawerVariantTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiNavigationDrawerVariant> get() = linkedSetOf(TanreiNavigationDrawerVariant.Standard, TanreiNavigationDrawerVariant.Modal) + extra.keys

    public operator fun contains(key: TanreiNavigationDrawerVariant): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiNavigationDrawerVariant): TanreiNavigationDrawerVariantTokens? = when (key) {
        TanreiNavigationDrawerVariant.Standard -> standard
        TanreiNavigationDrawerVariant.Modal -> modal
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [standard]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiNavigationDrawerVariant): TanreiNavigationDrawerVariantTokens = find(key) ?: standard

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(standard.referencedRoles())
        addAll(modal.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/**
 * A condition of navigation-drawer: the key of one entry of [TanreiNavigationDrawerConditions]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Unselected].
 */
@JvmInline
public value class TanreiNavigationDrawerCondition(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Unselected: TanreiNavigationDrawerCondition = TanreiNavigationDrawerCondition("unselected")
        public val Selected: TanreiNavigationDrawerCondition = TanreiNavigationDrawerCondition("selected")
        public val CollapsedUnselected: TanreiNavigationDrawerCondition = TanreiNavigationDrawerCondition("collapsed-unselected")
        public val CollapsedSelected: TanreiNavigationDrawerCondition = TanreiNavigationDrawerCondition("collapsed-selected")
    }
}

/** What one condition of navigation-drawer draws in one interaction state. */
@Immutable
public data class TanreiNavigationDrawerConditionStateTokens(
    public val itemContainerColor: TanreiPaint,
    public val itemIconIndicatorColor: TanreiPaint,
    public val itemIconColor: TanreiPaint,
    public val itemLabelColor: TanreiPaint,
    public val itemSupportingTextColor: TanreiPaint,
    public val itemTrailingTextColor: TanreiPaint,
    public val itemTrailingIconColor: TanreiPaint,
    public val itemStateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(itemContainerColor.roles())
        addAll(itemIconIndicatorColor.roles())
        addAll(itemIconColor.roles())
        addAll(itemLabelColor.roles())
        addAll(itemSupportingTextColor.roles())
        addAll(itemTrailingTextColor.roles())
        addAll(itemTrailingIconColor.roles())
        addAll(itemStateLayerColor.roles())
    }
}

/** One condition of navigation-drawer: a full set of tokens per interaction state. */
@Immutable
public data class TanreiNavigationDrawerConditionTokens(
    public val enabled: TanreiNavigationDrawerConditionStateTokens,
    public val hovered: TanreiNavigationDrawerConditionStateTokens,
    public val focused: TanreiNavigationDrawerConditionStateTokens,
    public val pressed: TanreiNavigationDrawerConditionStateTokens,
    public val disabled: TanreiNavigationDrawerConditionStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiNavigationDrawerConditionStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every condition of navigation-drawer: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiNavigationDrawerConditions(
    public val unselected: TanreiNavigationDrawerConditionTokens,
    public val selected: TanreiNavigationDrawerConditionTokens,
    public val collapsedUnselected: TanreiNavigationDrawerConditionTokens,
    public val collapsedSelected: TanreiNavigationDrawerConditionTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiNavigationDrawerCondition, TanreiNavigationDrawerConditionTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiNavigationDrawerCondition> get() = linkedSetOf(TanreiNavigationDrawerCondition.Unselected, TanreiNavigationDrawerCondition.Selected, TanreiNavigationDrawerCondition.CollapsedUnselected, TanreiNavigationDrawerCondition.CollapsedSelected) + extra.keys

    public operator fun contains(key: TanreiNavigationDrawerCondition): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiNavigationDrawerCondition): TanreiNavigationDrawerConditionTokens? = when (key) {
        TanreiNavigationDrawerCondition.Unselected -> unselected
        TanreiNavigationDrawerCondition.Selected -> selected
        TanreiNavigationDrawerCondition.CollapsedUnselected -> collapsedUnselected
        TanreiNavigationDrawerCondition.CollapsedSelected -> collapsedSelected
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [unselected]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiNavigationDrawerCondition): TanreiNavigationDrawerConditionTokens = find(key) ?: unselected

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(unselected.referencedRoles())
        addAll(selected.referencedRoles())
        addAll(collapsedUnselected.referencedRoles())
        addAll(collapsedSelected.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/**
 * A density of navigation-drawer: the key of one entry of [TanreiNavigationDrawerDensitys]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Regular].
 */
@JvmInline
public value class TanreiNavigationDrawerDensity(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Regular: TanreiNavigationDrawerDensity = TanreiNavigationDrawerDensity("regular")
        public val Compact: TanreiNavigationDrawerDensity = TanreiNavigationDrawerDensity("compact")
    }
}

/** The tokens of one density of navigation-drawer. */
@Immutable
public data class TanreiNavigationDrawerDensityTokens(
    public val containerGap: Dp,
    public val itemContainerHeight: Dp,
    public val itemPaddingInline: Dp,
    public val itemPaddingBlock: Dp,
    public val itemNestIndent: Dp,
    public val itemIconSize: Dp,
    public val itemIconIndicatorWidth: Dp,
    public val itemIconIndicatorHeight: Dp,
    public val itemLabelTypescale: TanreiTextStyle,
    public val itemTrailingIconSize: Dp,
    public val collapsedContainerWidth: Dp,
    public val collapsedItemContainerWidth: Dp,
    public val collapsedItemContainerPaddingBlock: Dp,
    public val headingHeight: Dp,
)

/**
 * Every density of navigation-drawer: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiNavigationDrawerDensitys(
    public val regular: TanreiNavigationDrawerDensityTokens,
    public val compact: TanreiNavigationDrawerDensityTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiNavigationDrawerDensity, TanreiNavigationDrawerDensityTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiNavigationDrawerDensity> get() = linkedSetOf(TanreiNavigationDrawerDensity.Regular, TanreiNavigationDrawerDensity.Compact) + extra.keys

    public operator fun contains(key: TanreiNavigationDrawerDensity): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiNavigationDrawerDensity): TanreiNavigationDrawerDensityTokens? = when (key) {
        TanreiNavigationDrawerDensity.Regular -> regular
        TanreiNavigationDrawerDensity.Compact -> compact
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [regular]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiNavigationDrawerDensity): TanreiNavigationDrawerDensityTokens = find(key) ?: regular
}

/** What every variant of navigation-drawer shares in one interaction state. */
@Immutable
public data class TanreiNavigationDrawerStateTokens(
    public val opacity: Float,
)

/** `comp.navigation-drawer`. Members are flat tokens, then per-state tokens, then one holder per axis (`variants[variant]`, `conditions[condition]`, `densitys[density]`). */
@Immutable
public data class TanreiNavigationDrawerTokens(
    public val breakpointCollapsed: Dp,
    public val breakpointExpanded: Dp,
    public val collapsedItemContainerPaddingInline: Dp,
    public val collapsedItemContainerShape: Dp,
    public val collapsedItemGap: Dp,
    public val collapsedItemLabelTypescale: TanreiTextStyle,
    public val containerPaddingBlock: Dp,
    public val containerPaddingInline: Dp,
    public val containerWidth: Dp,
    public val guideColor: TanreiPaint,
    public val guideWidth: Dp,
    public val headerColor: TanreiPaint,
    public val headerGap: Dp,
    public val headerItemGap: Dp,
    public val headerTypescale: TanreiTextStyle,
    public val headingColor: TanreiPaint,
    public val headingTypescale: TanreiTextStyle,
    public val itemContainerShape: Dp,
    public val itemGap: Dp,
    public val itemIconIndicatorShape: Dp,
    public val itemSupportingTextTypescale: TanreiTextStyle,
    public val itemTrailingTextTypescale: TanreiTextStyle,
    public val motionDisclosureDuration: Int,
    public val motionDisclosureEasing: TanreiCubicBezier,
    public val motionEnterDuration: Int,
    public val motionEnterEasing: TanreiCubicBezier,
    public val motionExitDuration: Int,
    public val motionExitEasing: TanreiCubicBezier,
    public val motionExpandDuration: Int,
    public val motionExpandEasing: TanreiCubicBezier,
    public val motionFeedbackDuration: Int,
    public val motionSelectionDuration: Int,
    public val motionSelectionEasing: TanreiCubicBezier,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val outlineWidth: Dp,
    public val scrimBlur: Dp,
    public val scrimColor: TanreiPaint,
    public val stickyContainerColor: TanreiPaint,
    public val stickyDividerColor: TanreiPaint,
    public val stickyDividerWidth: Dp,
    public val hovered: TanreiNavigationDrawerStateTokens,
    public val focused: TanreiNavigationDrawerStateTokens,
    public val pressed: TanreiNavigationDrawerStateTokens,
    public val disabled: TanreiNavigationDrawerStateTokens,
    public val variants: TanreiNavigationDrawerVariants,
    public val conditions: TanreiNavigationDrawerConditions,
    public val densitys: TanreiNavigationDrawerDensitys,
) {
    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(guideColor.roles())
        addAll(headerColor.roles())
        addAll(headingColor.roles())
        addAll(scrimColor.roles())
        addAll(stickyContainerColor.roles())
        addAll(stickyDividerColor.roles())
        addAll(variants.referencedRoles())
        addAll(conditions.referencedRoles())
    }
}

/** `comp.number-input`. Members are flat tokens, then per-state tokens, then one holder per axis (). */
@Immutable
public data class TanreiNumberInputTokens(
    public val motionRepeatDelay: Int,
    public val motionRepeatInterval: Int,
    public val motionRepeatIntervalFast: Int,
    public val stepperGap: Dp,
    public val stepperInset: Dp,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
    }
}

/**
 * A condition of one-time-code-input: the key of one entry of [TanreiOneTimeCodeInputConditions]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Standard].
 */
@JvmInline
public value class TanreiOneTimeCodeInputCondition(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Standard: TanreiOneTimeCodeInputCondition = TanreiOneTimeCodeInputCondition("standard")
    }
}

/** What one condition of one-time-code-input draws in one interaction state. */
@Immutable
public data class TanreiOneTimeCodeInputConditionStateTokens(
    public val containerColor: TanreiPaint,
    public val outlineColor: TanreiPaint,
    public val inputColor: TanreiPaint,
    public val caretColor: TanreiPaint,
    public val separatorColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
    public val errorContainerColor: TanreiPaint,
    public val errorOutlineColor: TanreiPaint,
    public val errorInputColor: TanreiPaint,
    public val errorCaretColor: TanreiPaint,
    public val errorSeparatorColor: TanreiPaint,
    public val errorStateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(outlineColor.roles())
        addAll(inputColor.roles())
        addAll(caretColor.roles())
        addAll(separatorColor.roles())
        addAll(stateLayerColor.roles())
        addAll(errorContainerColor.roles())
        addAll(errorOutlineColor.roles())
        addAll(errorInputColor.roles())
        addAll(errorCaretColor.roles())
        addAll(errorSeparatorColor.roles())
        addAll(errorStateLayerColor.roles())
    }
}

/** One condition of one-time-code-input: a full set of tokens per interaction state. */
@Immutable
public data class TanreiOneTimeCodeInputConditionTokens(
    public val enabled: TanreiOneTimeCodeInputConditionStateTokens,
    public val hovered: TanreiOneTimeCodeInputConditionStateTokens,
    public val focused: TanreiOneTimeCodeInputConditionStateTokens,
    public val disabled: TanreiOneTimeCodeInputConditionStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiOneTimeCodeInputConditionStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> enabled
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every condition of one-time-code-input: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiOneTimeCodeInputConditions(
    public val standard: TanreiOneTimeCodeInputConditionTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiOneTimeCodeInputCondition, TanreiOneTimeCodeInputConditionTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiOneTimeCodeInputCondition> get() = linkedSetOf(TanreiOneTimeCodeInputCondition.Standard) + extra.keys

    public operator fun contains(key: TanreiOneTimeCodeInputCondition): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiOneTimeCodeInputCondition): TanreiOneTimeCodeInputConditionTokens? = when (key) {
        TanreiOneTimeCodeInputCondition.Standard -> standard
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [standard]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiOneTimeCodeInputCondition): TanreiOneTimeCodeInputConditionTokens = find(key) ?: standard

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(standard.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of one-time-code-input shares in one interaction state. */
@Immutable
public data class TanreiOneTimeCodeInputStateTokens(
    public val outlineWidth: Dp,
)

/** `comp.one-time-code-input`. Members are flat tokens, then per-state tokens, then one holder per axis (`conditions[condition]`). */
@Immutable
public data class TanreiOneTimeCodeInputTokens(
    public val caretWidth: Dp,
    public val containerGap: Dp,
    public val containerHeight: Dp,
    public val containerPaddingInline: Dp,
    public val containerShape: Dp,
    public val containerWidth: Dp,
    public val inputTypescale: TanreiTextStyle,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val outlineWidth: Dp,
    public val separatorThickness: Dp,
    public val separatorWidth: Dp,
    public val hovered: TanreiOneTimeCodeInputStateTokens,
    public val focused: TanreiOneTimeCodeInputStateTokens,
    public val disabled: TanreiOneTimeCodeInputStateTokens,
    public val conditions: TanreiOneTimeCodeInputConditions,
) {
    /** `outline-width` of [state]. */
    public fun outlineWidth(state: TanreiInteractionState): Dp = when (state) {
        TanreiInteractionState.Enabled -> outlineWidth
        TanreiInteractionState.Hovered -> hovered.outlineWidth
        TanreiInteractionState.Focused -> focused.outlineWidth
        TanreiInteractionState.Pressed -> outlineWidth
        TanreiInteractionState.Disabled -> disabled.outlineWidth
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(conditions.referencedRoles())
    }
}

/**
 * A size of page-header: the key of one entry of [TanreiPageHeaderSizes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Medium].
 */
@JvmInline
public value class TanreiPageHeaderSize(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Small: TanreiPageHeaderSize = TanreiPageHeaderSize("small")
        public val Medium: TanreiPageHeaderSize = TanreiPageHeaderSize("medium")
        public val Large: TanreiPageHeaderSize = TanreiPageHeaderSize("large")
    }
}

/** The tokens of one size of page-header. */
@Immutable
public data class TanreiPageHeaderSizeTokens(
    public val titleTypescale: TanreiTextStyle,
    public val descriptionTypescale: TanreiTextStyle,
    public val descriptionGap: Dp,
    public val containerPaddingBlockEnd: Dp,
)

/**
 * Every size of page-header: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiPageHeaderSizes(
    public val small: TanreiPageHeaderSizeTokens,
    public val medium: TanreiPageHeaderSizeTokens,
    public val large: TanreiPageHeaderSizeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiPageHeaderSize, TanreiPageHeaderSizeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiPageHeaderSize> get() = linkedSetOf(TanreiPageHeaderSize.Small, TanreiPageHeaderSize.Medium, TanreiPageHeaderSize.Large) + extra.keys

    public operator fun contains(key: TanreiPageHeaderSize): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiPageHeaderSize): TanreiPageHeaderSizeTokens? = when (key) {
        TanreiPageHeaderSize.Small -> small
        TanreiPageHeaderSize.Medium -> medium
        TanreiPageHeaderSize.Large -> large
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [medium]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiPageHeaderSize): TanreiPageHeaderSizeTokens = find(key) ?: medium
}

/** `comp.page-header`. Members are flat tokens, then per-state tokens, then one holder per axis (`sizes[size]`). */
@Immutable
public data class TanreiPageHeaderTokens(
    public val actionsGap: Dp,
    public val actionsItemGap: Dp,
    public val breadcrumbsGap: Dp,
    public val containerGap: Dp,
    public val descriptionColor: TanreiPaint,
    public val descriptionMeasure: Float,
    public val dividerColor: TanreiPaint,
    public val dividerThickness: Dp,
    public val eyebrowColor: TanreiPaint,
    public val eyebrowGap: Dp,
    public val eyebrowTypescale: TanreiTextStyle,
    public val metaColor: TanreiPaint,
    public val metaGap: Dp,
    public val metaIconGap: Dp,
    public val metaItemGap: Dp,
    public val metaRowGap: Dp,
    public val metaSeparatorColor: TanreiPaint,
    public val metaSeparatorSize: Dp,
    public val metaTypescale: TanreiTextStyle,
    public val titleColor: TanreiPaint,
    public val wideContainerWidth: Dp,
    public val sizes: TanreiPageHeaderSizes,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(descriptionColor.roles())
        addAll(dividerColor.roles())
        addAll(eyebrowColor.roles())
        addAll(metaColor.roles())
        addAll(metaSeparatorColor.roles())
        addAll(titleColor.roles())
    }
}

/**
 * A size of pagination: the key of one entry of [TanreiPaginationSizes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Medium].
 */
@JvmInline
public value class TanreiPaginationSize(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Small: TanreiPaginationSize = TanreiPaginationSize("small")
        public val Medium: TanreiPaginationSize = TanreiPaginationSize("medium")
    }
}

/** The tokens of one size of pagination. */
@Immutable
public data class TanreiPaginationSizeTokens(
    public val containerHeight: Dp,
)

/**
 * Every size of pagination: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiPaginationSizes(
    public val small: TanreiPaginationSizeTokens,
    public val medium: TanreiPaginationSizeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiPaginationSize, TanreiPaginationSizeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiPaginationSize> get() = linkedSetOf(TanreiPaginationSize.Small, TanreiPaginationSize.Medium) + extra.keys

    public operator fun contains(key: TanreiPaginationSize): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiPaginationSize): TanreiPaginationSizeTokens? = when (key) {
        TanreiPaginationSize.Small -> small
        TanreiPaginationSize.Medium -> medium
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [medium]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiPaginationSize): TanreiPaginationSizeTokens = find(key) ?: medium
}

/**
 * A part of pagination: the key of one entry of [TanreiPaginationParts]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Item].
 */
@JvmInline
public value class TanreiPaginationPart(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Item: TanreiPaginationPart = TanreiPaginationPart("item")
        public val Current: TanreiPaginationPart = TanreiPaginationPart("current")
    }
}

/** What one part of pagination draws in one interaction state. */
@Immutable
public data class TanreiPaginationPartStateTokens(
    public val containerColor: TanreiPaint,
    public val labelColor: TanreiPaint,
    public val iconColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(labelColor.roles())
        addAll(iconColor.roles())
        addAll(stateLayerColor.roles())
    }
}

/** One part of pagination: a full set of tokens per interaction state. */
@Immutable
public data class TanreiPaginationPartTokens(
    public val enabled: TanreiPaginationPartStateTokens,
    public val hovered: TanreiPaginationPartStateTokens,
    public val focused: TanreiPaginationPartStateTokens,
    public val pressed: TanreiPaginationPartStateTokens,
    public val disabled: TanreiPaginationPartStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiPaginationPartStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every part of pagination: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiPaginationParts(
    public val item: TanreiPaginationPartTokens,
    public val current: TanreiPaginationPartTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiPaginationPart, TanreiPaginationPartTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiPaginationPart> get() = linkedSetOf(TanreiPaginationPart.Item, TanreiPaginationPart.Current) + extra.keys

    public operator fun contains(key: TanreiPaginationPart): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiPaginationPart): TanreiPaginationPartTokens? = when (key) {
        TanreiPaginationPart.Item -> item
        TanreiPaginationPart.Current -> current
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [item]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiPaginationPart): TanreiPaginationPartTokens = find(key) ?: item

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(item.referencedRoles())
        addAll(current.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of pagination shares in one interaction state. */
@Immutable
public data class TanreiPaginationStateTokens(
    public val containerShape: Dp,
    public val opacity: Float,
)

/** `comp.pagination`. Members are flat tokens, then per-state tokens, then one holder per axis (`sizes[size]`, `parts[part]`). */
@Immutable
public data class TanreiPaginationTokens(
    public val containerPaddingInline: Dp,
    public val containerShape: Dp,
    public val countColor: TanreiPaint,
    public val countPaddingInline: Dp,
    public val countTypescale: TanreiTextStyle,
    public val ellipsisColor: TanreiPaint,
    public val gap: Dp,
    public val iconSize: Dp,
    public val labelTypescale: TanreiTextStyle,
    public val motionFeedbackDuration: Int,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val hovered: TanreiPaginationStateTokens,
    public val focused: TanreiPaginationStateTokens,
    public val pressed: TanreiPaginationStateTokens,
    public val disabled: TanreiPaginationStateTokens,
    public val sizes: TanreiPaginationSizes,
    public val parts: TanreiPaginationParts,
) {
    /** `container-shape` of [state]. */
    public fun containerShape(state: TanreiInteractionState): Dp = when (state) {
        TanreiInteractionState.Enabled -> containerShape
        TanreiInteractionState.Hovered -> hovered.containerShape
        TanreiInteractionState.Focused -> focused.containerShape
        TanreiInteractionState.Pressed -> pressed.containerShape
        TanreiInteractionState.Disabled -> disabled.containerShape
    }

    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(countColor.roles())
        addAll(ellipsisColor.roles())
        addAll(parts.referencedRoles())
    }
}

/** `comp.popover`. Members are flat tokens, then per-state tokens, then one holder per axis (). */
@Immutable
public data class TanreiPopoverTokens(
    public val actionsArrangement: Float,
    public val actionsGap: Dp,
    public val actionsMarginBlockStart: Dp,
    public val actionsVariant: Float,
    public val arrowHeight: Dp,
    public val arrowInset: Dp,
    public val arrowVisible: Float,
    public val arrowWidth: Dp,
    public val closeButtonVariant: Float,
    public val compactWindowWidth: Dp,
    public val containerColor: TanreiPaint,
    public val containerElevation: List<TanreiShadowLayer>,
    public val containerGap: Dp,
    public val containerMaxHeight: Dp,
    public val containerMaxWidth: Dp,
    public val containerMinWidth: Dp,
    public val containerPaddingBlock: Dp,
    public val containerPaddingInline: Dp,
    public val containerShape: Dp,
    public val contentColor: TanreiPaint,
    public val dividerColor: TanreiPaint,
    public val dividerVisibility: Float,
    public val dividerWidth: Dp,
    public val headerGap: Dp,
    public val headlineColor: TanreiPaint,
    public val headlineTypescale: TanreiTextStyle,
    public val motionCloseDuration: Int,
    public val motionCloseEasing: TanreiCubicBezier,
    public val motionOpenDuration: Int,
    public val motionOpenEasing: TanreiCubicBezier,
    public val offset: Dp,
    public val windowMargin: Dp,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        containerElevation.forEach { add(it.role) }
        addAll(contentColor.roles())
        addAll(dividerColor.roles())
        addAll(headlineColor.roles())
    }
}

/**
 * A part of previous-next-links: the key of one entry of [TanreiPreviousNextLinksParts]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Item].
 */
@JvmInline
public value class TanreiPreviousNextLinksPart(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Item: TanreiPreviousNextLinksPart = TanreiPreviousNextLinksPart("item")
    }
}

/** What one part of previous-next-links draws in one interaction state. */
@Immutable
public data class TanreiPreviousNextLinksPartStateTokens(
    public val containerColor: TanreiPaint,
    public val outlineColor: TanreiPaint,
    public val labelColor: TanreiPaint,
    public val titleColor: TanreiPaint,
    public val iconColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(outlineColor.roles())
        addAll(labelColor.roles())
        addAll(titleColor.roles())
        addAll(iconColor.roles())
        addAll(stateLayerColor.roles())
    }
}

/** One part of previous-next-links: a full set of tokens per interaction state. */
@Immutable
public data class TanreiPreviousNextLinksPartTokens(
    public val enabled: TanreiPreviousNextLinksPartStateTokens,
    public val hovered: TanreiPreviousNextLinksPartStateTokens,
    public val focused: TanreiPreviousNextLinksPartStateTokens,
    public val pressed: TanreiPreviousNextLinksPartStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiPreviousNextLinksPartStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> enabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles()
}

/**
 * Every part of previous-next-links: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiPreviousNextLinksParts(
    public val item: TanreiPreviousNextLinksPartTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiPreviousNextLinksPart, TanreiPreviousNextLinksPartTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiPreviousNextLinksPart> get() = linkedSetOf(TanreiPreviousNextLinksPart.Item) + extra.keys

    public operator fun contains(key: TanreiPreviousNextLinksPart): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiPreviousNextLinksPart): TanreiPreviousNextLinksPartTokens? = when (key) {
        TanreiPreviousNextLinksPart.Item -> item
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [item]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiPreviousNextLinksPart): TanreiPreviousNextLinksPartTokens = find(key) ?: item

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(item.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of previous-next-links shares in one interaction state. */
@Immutable
public data class TanreiPreviousNextLinksStateTokens(
    public val containerShape: Dp,
    public val opacity: Float,
)

/** `comp.previous-next-links`. Members are flat tokens, then per-state tokens, then one holder per axis (`parts[part]`). */
@Immutable
public data class TanreiPreviousNextLinksTokens(
    public val containerGap: Dp,
    public val containerMinWidth: Dp,
    public val containerPadding: Dp,
    public val containerShape: Dp,
    public val gap: Dp,
    public val iconSize: Dp,
    public val labelGap: Dp,
    public val labelTypescale: TanreiTextStyle,
    public val motionFeedbackDuration: Int,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val outlineWidth: Dp,
    public val titleTypescale: TanreiTextStyle,
    public val hovered: TanreiPreviousNextLinksStateTokens,
    public val focused: TanreiPreviousNextLinksStateTokens,
    public val pressed: TanreiPreviousNextLinksStateTokens,
    public val parts: TanreiPreviousNextLinksParts,
) {
    /** `container-shape` of [state]. */
    public fun containerShape(state: TanreiInteractionState): Dp = when (state) {
        TanreiInteractionState.Enabled -> containerShape
        TanreiInteractionState.Hovered -> hovered.containerShape
        TanreiInteractionState.Focused -> focused.containerShape
        TanreiInteractionState.Pressed -> pressed.containerShape
        TanreiInteractionState.Disabled -> containerShape
    }

    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> 1f
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(parts.referencedRoles())
    }
}

/**
 * A size of progress-indicator: the key of one entry of [TanreiProgressIndicatorSizes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Medium].
 */
@JvmInline
public value class TanreiProgressIndicatorSize(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Small: TanreiProgressIndicatorSize = TanreiProgressIndicatorSize("small")
        public val Medium: TanreiProgressIndicatorSize = TanreiProgressIndicatorSize("medium")
        public val Large: TanreiProgressIndicatorSize = TanreiProgressIndicatorSize("large")
    }
}

/** The tokens of one size of progress-indicator. */
@Immutable
public data class TanreiProgressIndicatorSizeTokens(
    public val linearThickness: Dp,
    public val circularSize: Dp,
    public val circularThickness: Dp,
)

/**
 * Every size of progress-indicator: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiProgressIndicatorSizes(
    public val small: TanreiProgressIndicatorSizeTokens,
    public val medium: TanreiProgressIndicatorSizeTokens,
    public val large: TanreiProgressIndicatorSizeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiProgressIndicatorSize, TanreiProgressIndicatorSizeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiProgressIndicatorSize> get() = linkedSetOf(TanreiProgressIndicatorSize.Small, TanreiProgressIndicatorSize.Medium, TanreiProgressIndicatorSize.Large) + extra.keys

    public operator fun contains(key: TanreiProgressIndicatorSize): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiProgressIndicatorSize): TanreiProgressIndicatorSizeTokens? = when (key) {
        TanreiProgressIndicatorSize.Small -> small
        TanreiProgressIndicatorSize.Medium -> medium
        TanreiProgressIndicatorSize.Large -> large
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [medium]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiProgressIndicatorSize): TanreiProgressIndicatorSizeTokens = find(key) ?: medium
}

/** `comp.progress-indicator`. Members are flat tokens, then per-state tokens, then one holder per axis (`sizes[size]`). */
@Immutable
public data class TanreiProgressIndicatorTokens(
    public val indicatorColor: TanreiPaint,
    public val motionCycleDuration: Int,
    public val motionCycleEasing: TanreiCubicBezier,
    public val motionValueDuration: Int,
    public val motionValueEasing: TanreiCubicBezier,
    public val stopIndicatorSize: Dp,
    public val trackColor: TanreiPaint,
    public val trackGap: Dp,
    public val trackSeparation: Float,
    public val trackShape: Dp,
    public val sizes: TanreiProgressIndicatorSizes,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(indicatorColor.roles())
        addAll(trackColor.roles())
    }
}

/**
 * A size of prose: the key of one entry of [TanreiProseSizes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Medium].
 */
@JvmInline
public value class TanreiProseSize(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Medium: TanreiProseSize = TanreiProseSize("medium")
        public val Large: TanreiProseSize = TanreiProseSize("large")
    }
}

/** The tokens of one size of prose. */
@Immutable
public data class TanreiProseSizeTokens(
    public val textTypescale: TanreiTextStyle,
    public val smallTypescale: TanreiTextStyle,
)

/**
 * Every size of prose: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiProseSizes(
    public val medium: TanreiProseSizeTokens,
    public val large: TanreiProseSizeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiProseSize, TanreiProseSizeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiProseSize> get() = linkedSetOf(TanreiProseSize.Medium, TanreiProseSize.Large) + extra.keys

    public operator fun contains(key: TanreiProseSize): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiProseSize): TanreiProseSizeTokens? = when (key) {
        TanreiProseSize.Medium -> medium
        TanreiProseSize.Large -> large
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [medium]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiProseSize): TanreiProseSizeTokens = find(key) ?: medium
}

/** `comp.prose`. Members are flat tokens, then per-state tokens, then one holder per axis (`sizes[size]`). */
@Immutable
public data class TanreiProseTokens(
    public val anchorGap: Dp,
    public val blockGap: Dp,
    public val heading1GapAfter: Dp,
    public val heading1GapBefore: Dp,
    public val heading2GapAfter: Dp,
    public val heading2GapBefore: Dp,
    public val heading3GapAfter: Dp,
    public val heading3GapBefore: Dp,
    public val heading4GapAfter: Dp,
    public val heading4GapBefore: Dp,
    public val heading5GapAfter: Dp,
    public val heading5GapBefore: Dp,
    public val heading6GapAfter: Dp,
    public val heading6GapBefore: Dp,
    public val itemGap: Dp,
    public val japaneseLineHeight: Float,
    public val leadTypescale: TanreiTextStyle,
    public val listIndent: Dp,
    public val measure: Float,
    public val nestedGap: Dp,
    public val quoteInset: Dp,
    public val quoteLineColor: TanreiPaint,
    public val quoteLineThickness: Dp,
    public val ruleGap: Dp,
    public val taskIconSize: Dp,
    public val sizes: TanreiProseSizes,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(quoteLineColor.roles())
    }
}

/**
 * A condition of radio-button: the key of one entry of [TanreiRadioButtonConditions]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Unselected].
 */
@JvmInline
public value class TanreiRadioButtonCondition(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Unselected: TanreiRadioButtonCondition = TanreiRadioButtonCondition("unselected")
        public val Selected: TanreiRadioButtonCondition = TanreiRadioButtonCondition("selected")
        public val ErrorUnselected: TanreiRadioButtonCondition = TanreiRadioButtonCondition("error-unselected")
        public val ErrorSelected: TanreiRadioButtonCondition = TanreiRadioButtonCondition("error-selected")
    }
}

/** What one condition of radio-button draws in one interaction state. */
@Immutable
public data class TanreiRadioButtonConditionStateTokens(
    public val containerColor: TanreiPaint,
    public val ringColor: TanreiPaint,
    public val fillColor: TanreiPaint,
    public val labelColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(ringColor.roles())
        addAll(fillColor.roles())
        addAll(labelColor.roles())
        addAll(stateLayerColor.roles())
    }
}

/** One condition of radio-button: a full set of tokens per interaction state. */
@Immutable
public data class TanreiRadioButtonConditionTokens(
    public val enabled: TanreiRadioButtonConditionStateTokens,
    public val hovered: TanreiRadioButtonConditionStateTokens,
    public val focused: TanreiRadioButtonConditionStateTokens,
    public val pressed: TanreiRadioButtonConditionStateTokens,
    public val disabled: TanreiRadioButtonConditionStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiRadioButtonConditionStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every condition of radio-button: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiRadioButtonConditions(
    public val unselected: TanreiRadioButtonConditionTokens,
    public val selected: TanreiRadioButtonConditionTokens,
    public val errorUnselected: TanreiRadioButtonConditionTokens,
    public val errorSelected: TanreiRadioButtonConditionTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiRadioButtonCondition, TanreiRadioButtonConditionTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiRadioButtonCondition> get() = linkedSetOf(TanreiRadioButtonCondition.Unselected, TanreiRadioButtonCondition.Selected, TanreiRadioButtonCondition.ErrorUnselected, TanreiRadioButtonCondition.ErrorSelected) + extra.keys

    public operator fun contains(key: TanreiRadioButtonCondition): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiRadioButtonCondition): TanreiRadioButtonConditionTokens? = when (key) {
        TanreiRadioButtonCondition.Unselected -> unselected
        TanreiRadioButtonCondition.Selected -> selected
        TanreiRadioButtonCondition.ErrorUnselected -> errorUnselected
        TanreiRadioButtonCondition.ErrorSelected -> errorSelected
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [unselected]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiRadioButtonCondition): TanreiRadioButtonConditionTokens = find(key) ?: unselected

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(unselected.referencedRoles())
        addAll(selected.referencedRoles())
        addAll(errorUnselected.referencedRoles())
        addAll(errorSelected.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of radio-button shares in one interaction state. */
@Immutable
public data class TanreiRadioButtonStateTokens(
    public val containerShape: Dp,
    public val opacity: Float,
)

/** `comp.radio-button`. Members are flat tokens, then per-state tokens, then one holder per axis (`conditions[condition]`). */
@Immutable
public data class TanreiRadioButtonTokens(
    public val containerShape: Dp,
    public val containerSize: Dp,
    public val fillInset: Dp,
    public val fillOpacity: Float,
    public val labelGap: Dp,
    public val labelTypescale: TanreiTextStyle,
    public val motionFeedbackDuration: Int,
    public val motionSelectionDuration: Int,
    public val motionSelectionEasing: TanreiCubicBezier,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val optionMinHeight: Dp,
    public val ringSelectedWidthShare: Float,
    public val ringSize: Dp,
    public val ringWidth: Dp,
    public val hovered: TanreiRadioButtonStateTokens,
    public val focused: TanreiRadioButtonStateTokens,
    public val pressed: TanreiRadioButtonStateTokens,
    public val disabled: TanreiRadioButtonStateTokens,
    public val conditions: TanreiRadioButtonConditions,
) {
    /** `container-shape` of [state]. */
    public fun containerShape(state: TanreiInteractionState): Dp = when (state) {
        TanreiInteractionState.Enabled -> containerShape
        TanreiInteractionState.Hovered -> hovered.containerShape
        TanreiInteractionState.Focused -> focused.containerShape
        TanreiInteractionState.Pressed -> pressed.containerShape
        TanreiInteractionState.Disabled -> disabled.containerShape
    }

    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(conditions.referencedRoles())
    }
}

/**
 * A condition of search: the key of one entry of [TanreiSearchConditions]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Standard].
 */
@JvmInline
public value class TanreiSearchCondition(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Standard: TanreiSearchCondition = TanreiSearchCondition("standard")
    }
}

/** What one condition of search draws in one interaction state. */
@Immutable
public data class TanreiSearchConditionStateTokens(
    public val containerColor: TanreiPaint,
    public val containerElevation: List<TanreiShadowLayer>,
    public val outlineColor: TanreiPaint,
    public val leadingIconColor: TanreiPaint,
    public val inputColor: TanreiPaint,
    public val placeholderColor: TanreiPaint,
    public val caretColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
    public val suggestionContainerColor: TanreiPaint,
    public val suggestionLeadingIconColor: TanreiPaint,
    public val suggestionHeadlineColor: TanreiPaint,
    public val suggestionSupportingTextColor: TanreiPaint,
    public val suggestionStateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        containerElevation.forEach { add(it.role) }
        addAll(outlineColor.roles())
        addAll(leadingIconColor.roles())
        addAll(inputColor.roles())
        addAll(placeholderColor.roles())
        addAll(caretColor.roles())
        addAll(stateLayerColor.roles())
        addAll(suggestionContainerColor.roles())
        addAll(suggestionLeadingIconColor.roles())
        addAll(suggestionHeadlineColor.roles())
        addAll(suggestionSupportingTextColor.roles())
        addAll(suggestionStateLayerColor.roles())
    }
}

/** One condition of search: a full set of tokens per interaction state. */
@Immutable
public data class TanreiSearchConditionTokens(
    public val enabled: TanreiSearchConditionStateTokens,
    public val hovered: TanreiSearchConditionStateTokens,
    public val focused: TanreiSearchConditionStateTokens,
    public val pressed: TanreiSearchConditionStateTokens,
    public val disabled: TanreiSearchConditionStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiSearchConditionStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every condition of search: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiSearchConditions(
    public val standard: TanreiSearchConditionTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiSearchCondition, TanreiSearchConditionTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiSearchCondition> get() = linkedSetOf(TanreiSearchCondition.Standard) + extra.keys

    public operator fun contains(key: TanreiSearchCondition): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiSearchCondition): TanreiSearchConditionTokens? = when (key) {
        TanreiSearchCondition.Standard -> standard
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [standard]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiSearchCondition): TanreiSearchConditionTokens = find(key) ?: standard

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(standard.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of search shares in one interaction state. */
@Immutable
public data class TanreiSearchStateTokens(
    public val opacity: Float,
    public val outlineWidth: Dp,
)

/** `comp.search`. Members are flat tokens, then per-state tokens, then one holder per axis (`conditions[condition]`). */
@Immutable
public data class TanreiSearchTokens(
    public val containerButtonGap: Dp,
    public val containerGap: Dp,
    public val containerHeight: Dp,
    public val containerPaddingInline: Dp,
    public val containerPaddingInlineWithButton: Dp,
    public val containerShape: Dp,
    public val dividerColor: TanreiPaint,
    public val dividerThickness: Dp,
    public val groupTitleColor: TanreiPaint,
    public val groupTitleTypescale: TanreiTextStyle,
    public val groupGap: Dp,
    public val groupIndent: Dp,
    public val headerHeight: Dp,
    public val headerPaddingInline: Dp,
    public val inputTypescale: TanreiTextStyle,
    public val leadingIconSize: Dp,
    public val motionCloseDuration: Int,
    public val motionCloseEasing: TanreiCubicBezier,
    public val motionFeedbackDuration: Int,
    public val motionOpenDuration: Int,
    public val motionOpenEasing: TanreiCubicBezier,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val outlineWidth: Dp,
    public val resultMarkColor: TanreiPaint,
    public val resultMarkContainerColor: TanreiPaint,
    public val resultMarkEmphasis: Float,
    public val shortcutColor: TanreiPaint,
    public val shortcutTypescale: TanreiTextStyle,
    public val statusColor: TanreiPaint,
    public val statusErrorColor: TanreiPaint,
    public val statusTypescale: TanreiTextStyle,
    public val suggestionContainerGap: Dp,
    public val suggestionContainerHeight: Dp,
    public val suggestionContainerPaddingBlock: Dp,
    public val suggestionContainerPaddingInline: Dp,
    public val suggestionContainerShape: Dp,
    public val suggestionHeadlineTypescale: TanreiTextStyle,
    public val suggestionLeadingIconSize: Dp,
    public val suggestionSupportingTextTypescale: TanreiTextStyle,
    public val triggerContainerGap: Dp,
    public val triggerContainerHeight: Dp,
    public val triggerContainerPaddingInline: Dp,
    public val triggerLabelTypescale: TanreiTextStyle,
    public val triggerLeadingIconSize: Dp,
    public val viewContainerColor: TanreiPaint,
    public val viewContainerElevation: List<TanreiShadowLayer>,
    public val viewContainerShape: Dp,
    public val viewDialogMaxWidth: Dp,
    public val viewDialogOffset: Dp,
    public val viewOffset: Dp,
    public val viewPaddingBlock: Dp,
    public val viewPaddingInline: Dp,
    public val viewScrimBlur: Dp,
    public val viewScrimColor: TanreiPaint,
    public val viewViewportMargin: Dp,
    public val hovered: TanreiSearchStateTokens,
    public val focused: TanreiSearchStateTokens,
    public val pressed: TanreiSearchStateTokens,
    public val disabled: TanreiSearchStateTokens,
    public val conditions: TanreiSearchConditions,
) {
    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    /** `outline-width` of [state]. */
    public fun outlineWidth(state: TanreiInteractionState): Dp = when (state) {
        TanreiInteractionState.Enabled -> outlineWidth
        TanreiInteractionState.Hovered -> hovered.outlineWidth
        TanreiInteractionState.Focused -> focused.outlineWidth
        TanreiInteractionState.Pressed -> pressed.outlineWidth
        TanreiInteractionState.Disabled -> disabled.outlineWidth
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(dividerColor.roles())
        addAll(groupTitleColor.roles())
        addAll(resultMarkColor.roles())
        addAll(resultMarkContainerColor.roles())
        addAll(shortcutColor.roles())
        addAll(statusColor.roles())
        addAll(statusErrorColor.roles())
        addAll(viewContainerColor.roles())
        viewContainerElevation.forEach { add(it.role) }
        addAll(viewScrimColor.roles())
        addAll(conditions.referencedRoles())
    }
}

/**
 * A size of segmented-button: the key of one entry of [TanreiSegmentedButtonSizes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Medium].
 */
@JvmInline
public value class TanreiSegmentedButtonSize(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Small: TanreiSegmentedButtonSize = TanreiSegmentedButtonSize("small")
        public val Medium: TanreiSegmentedButtonSize = TanreiSegmentedButtonSize("medium")
        public val Large: TanreiSegmentedButtonSize = TanreiSegmentedButtonSize("large")
    }
}

/** The tokens of one size of segmented-button. */
@Immutable
public data class TanreiSegmentedButtonSizeTokens(
    public val containerHeight: Dp,
    public val containerPaddingInline: Dp,
    public val containerPaddingBlock: Dp,
    public val containerGap: Dp,
    public val labelTypescale: TanreiTextStyle,
    public val iconSize: Dp,
    public val checkSize: Dp,
    public val motionStateDuration: Int,
)

/**
 * Every size of segmented-button: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiSegmentedButtonSizes(
    public val small: TanreiSegmentedButtonSizeTokens,
    public val medium: TanreiSegmentedButtonSizeTokens,
    public val large: TanreiSegmentedButtonSizeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiSegmentedButtonSize, TanreiSegmentedButtonSizeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiSegmentedButtonSize> get() = linkedSetOf(TanreiSegmentedButtonSize.Small, TanreiSegmentedButtonSize.Medium, TanreiSegmentedButtonSize.Large) + extra.keys

    public operator fun contains(key: TanreiSegmentedButtonSize): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiSegmentedButtonSize): TanreiSegmentedButtonSizeTokens? = when (key) {
        TanreiSegmentedButtonSize.Small -> small
        TanreiSegmentedButtonSize.Medium -> medium
        TanreiSegmentedButtonSize.Large -> large
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [medium]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiSegmentedButtonSize): TanreiSegmentedButtonSizeTokens = find(key) ?: medium
}

/**
 * A condition of segmented-button: the key of one entry of [TanreiSegmentedButtonConditions]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Unselected].
 */
@JvmInline
public value class TanreiSegmentedButtonCondition(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Unselected: TanreiSegmentedButtonCondition = TanreiSegmentedButtonCondition("unselected")
        public val Selected: TanreiSegmentedButtonCondition = TanreiSegmentedButtonCondition("selected")
    }
}

/** What one condition of segmented-button draws in one interaction state. */
@Immutable
public data class TanreiSegmentedButtonConditionStateTokens(
    public val containerColor: TanreiPaint,
    public val containerElevation: List<TanreiShadowLayer>,
    public val labelColor: TanreiPaint,
    public val iconColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        containerElevation.forEach { add(it.role) }
        addAll(labelColor.roles())
        addAll(iconColor.roles())
        addAll(stateLayerColor.roles())
    }
}

/** One condition of segmented-button: a full set of tokens per interaction state. */
@Immutable
public data class TanreiSegmentedButtonConditionTokens(
    public val enabled: TanreiSegmentedButtonConditionStateTokens,
    public val hovered: TanreiSegmentedButtonConditionStateTokens,
    public val focused: TanreiSegmentedButtonConditionStateTokens,
    public val pressed: TanreiSegmentedButtonConditionStateTokens,
    public val disabled: TanreiSegmentedButtonConditionStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiSegmentedButtonConditionStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every condition of segmented-button: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiSegmentedButtonConditions(
    public val unselected: TanreiSegmentedButtonConditionTokens,
    public val selected: TanreiSegmentedButtonConditionTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiSegmentedButtonCondition, TanreiSegmentedButtonConditionTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiSegmentedButtonCondition> get() = linkedSetOf(TanreiSegmentedButtonCondition.Unselected, TanreiSegmentedButtonCondition.Selected) + extra.keys

    public operator fun contains(key: TanreiSegmentedButtonCondition): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiSegmentedButtonCondition): TanreiSegmentedButtonConditionTokens? = when (key) {
        TanreiSegmentedButtonCondition.Unselected -> unselected
        TanreiSegmentedButtonCondition.Selected -> selected
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [unselected]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiSegmentedButtonCondition): TanreiSegmentedButtonConditionTokens = find(key) ?: unselected

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(unselected.referencedRoles())
        addAll(selected.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of segmented-button shares in one interaction state. */
@Immutable
public data class TanreiSegmentedButtonStateTokens(
    public val containerShape: Dp,
    public val opacity: Float,
)

/** `comp.segmented-button`. Members are flat tokens, then per-state tokens, then one holder per axis (`sizes[size]`, `conditions[condition]`). */
@Immutable
public data class TanreiSegmentedButtonTokens(
    public val checkWeight: Float,
    public val containerShape: Dp,
    public val dividerColor: TanreiPaint,
    public val dividerWidth: Dp,
    public val motionFeedbackDuration: Int,
    public val motionSelectionDuration: Int,
    public val motionSelectionEasing: TanreiCubicBezier,
    public val motionStateEasing: TanreiCubicBezier,
    public val outlineColor: TanreiPaint,
    public val outlineWidth: Dp,
    public val setColor: TanreiPaint,
    public val setPadding: Dp,
    public val setShape: Dp,
    public val hovered: TanreiSegmentedButtonStateTokens,
    public val focused: TanreiSegmentedButtonStateTokens,
    public val pressed: TanreiSegmentedButtonStateTokens,
    public val disabled: TanreiSegmentedButtonStateTokens,
    public val sizes: TanreiSegmentedButtonSizes,
    public val conditions: TanreiSegmentedButtonConditions,
) {
    /** `container-shape` of [state]. */
    public fun containerShape(state: TanreiInteractionState): Dp = when (state) {
        TanreiInteractionState.Enabled -> containerShape
        TanreiInteractionState.Hovered -> hovered.containerShape
        TanreiInteractionState.Focused -> focused.containerShape
        TanreiInteractionState.Pressed -> pressed.containerShape
        TanreiInteractionState.Disabled -> disabled.containerShape
    }

    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(dividerColor.roles())
        addAll(outlineColor.roles())
        addAll(setColor.roles())
        addAll(conditions.referencedRoles())
    }
}

/**
 * A variant of select: the key of one entry of [TanreiSelectVariants]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Stacked].
 */
@JvmInline
public value class TanreiSelectVariant(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Stacked: TanreiSelectVariant = TanreiSelectVariant("stacked")
        public val Filled: TanreiSelectVariant = TanreiSelectVariant("filled")
        public val Outlined: TanreiSelectVariant = TanreiSelectVariant("outlined")
    }
}

/** What one variant of select draws in one interaction state. */
@Immutable
public data class TanreiSelectVariantStateTokens(
    public val optionContainerColor: TanreiPaint,
    public val optionLabelColor: TanreiPaint,
    public val optionSupportingTextColor: TanreiPaint,
    public val optionLeadingIconColor: TanreiPaint,
    public val optionStateLayerColor: TanreiPaint,
    public val selectedOptionContainerColor: TanreiPaint,
    public val selectedOptionLabelColor: TanreiPaint,
    public val selectedOptionSupportingTextColor: TanreiPaint,
    public val selectedOptionLeadingIconColor: TanreiPaint,
    public val selectedOptionMarkColor: TanreiPaint,
    public val selectedOptionStateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(optionContainerColor.roles())
        addAll(optionLabelColor.roles())
        addAll(optionSupportingTextColor.roles())
        addAll(optionLeadingIconColor.roles())
        addAll(optionStateLayerColor.roles())
        addAll(selectedOptionContainerColor.roles())
        addAll(selectedOptionLabelColor.roles())
        addAll(selectedOptionSupportingTextColor.roles())
        addAll(selectedOptionLeadingIconColor.roles())
        addAll(selectedOptionMarkColor.roles())
        addAll(selectedOptionStateLayerColor.roles())
    }
}

/** One variant of select: a full set of tokens per interaction state. */
@Immutable
public data class TanreiSelectVariantTokens(
    public val enabled: TanreiSelectVariantStateTokens,
    public val hovered: TanreiSelectVariantStateTokens,
    public val focused: TanreiSelectVariantStateTokens,
    public val pressed: TanreiSelectVariantStateTokens,
    public val disabled: TanreiSelectVariantStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiSelectVariantStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every variant of select: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiSelectVariants(
    public val stacked: TanreiSelectVariantTokens,
    public val filled: TanreiSelectVariantTokens,
    public val outlined: TanreiSelectVariantTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiSelectVariant, TanreiSelectVariantTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiSelectVariant> get() = linkedSetOf(TanreiSelectVariant.Stacked, TanreiSelectVariant.Filled, TanreiSelectVariant.Outlined) + extra.keys

    public operator fun contains(key: TanreiSelectVariant): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiSelectVariant): TanreiSelectVariantTokens? = when (key) {
        TanreiSelectVariant.Stacked -> stacked
        TanreiSelectVariant.Filled -> filled
        TanreiSelectVariant.Outlined -> outlined
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [stacked]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiSelectVariant): TanreiSelectVariantTokens = find(key) ?: stacked

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(stacked.referencedRoles())
        addAll(filled.referencedRoles())
        addAll(outlined.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of select shares in one interaction state. */
@Immutable
public data class TanreiSelectStateTokens(
    public val opacity: Float,
)

/** `comp.select`. Members are flat tokens, then per-state tokens, then one holder per axis (`variants[variant]`). */
@Immutable
public data class TanreiSelectTokens(
    public val dividerColor: TanreiPaint,
    public val dividerSpace: Dp,
    public val dividerThickness: Dp,
    public val groupTitleColor: TanreiPaint,
    public val groupTitlePaddingInline: Dp,
    public val groupTitleTypescale: TanreiTextStyle,
    public val groupGap: Dp,
    public val listColor: TanreiPaint,
    public val listElevation: List<TanreiShadowLayer>,
    public val listMaxHeight: Dp,
    public val listMaxWidth: Dp,
    public val listMinWidth: Dp,
    public val listOffset: Dp,
    public val listPaddingBlock: Dp,
    public val listPaddingInline: Dp,
    public val listShape: Dp,
    public val listViewportMargin: Dp,
    public val motionCloseDuration: Int,
    public val motionCloseEasing: TanreiCubicBezier,
    public val motionFeedbackDuration: Int,
    public val motionOpenDuration: Int,
    public val motionOpenEasing: TanreiCubicBezier,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val optionGap: Dp,
    public val optionHeight: Dp,
    public val optionLabelTypescale: TanreiTextStyle,
    public val optionLeadingIconSize: Dp,
    public val optionMarkSize: Dp,
    public val optionPaddingBlock: Dp,
    public val optionPaddingInline: Dp,
    public val optionShape: Dp,
    public val optionSupportingTextTypescale: TanreiTextStyle,
    public val separation: Float,
    public val hovered: TanreiSelectStateTokens,
    public val focused: TanreiSelectStateTokens,
    public val pressed: TanreiSelectStateTokens,
    public val disabled: TanreiSelectStateTokens,
    public val variants: TanreiSelectVariants,
) {
    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(dividerColor.roles())
        addAll(groupTitleColor.roles())
        addAll(listColor.roles())
        listElevation.forEach { add(it.role) }
        addAll(variants.referencedRoles())
    }
}

/**
 * A variant of side-sheet: the key of one entry of [TanreiSideSheetVariants]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Standard].
 */
@JvmInline
public value class TanreiSideSheetVariant(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Standard: TanreiSideSheetVariant = TanreiSideSheetVariant("standard")
        public val Modal: TanreiSideSheetVariant = TanreiSideSheetVariant("modal")
    }
}

/** The tokens of one variant of side-sheet. */
@Immutable
public data class TanreiSideSheetVariantTokens(
    public val containerColor: TanreiPaint,
    public val containerElevation: List<TanreiShadowLayer>,
    public val containerShape: Dp,
    public val outlineColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        containerElevation.forEach { add(it.role) }
        addAll(outlineColor.roles())
    }
}

/**
 * Every variant of side-sheet: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiSideSheetVariants(
    public val standard: TanreiSideSheetVariantTokens,
    public val modal: TanreiSideSheetVariantTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiSideSheetVariant, TanreiSideSheetVariantTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiSideSheetVariant> get() = linkedSetOf(TanreiSideSheetVariant.Standard, TanreiSideSheetVariant.Modal) + extra.keys

    public operator fun contains(key: TanreiSideSheetVariant): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiSideSheetVariant): TanreiSideSheetVariantTokens? = when (key) {
        TanreiSideSheetVariant.Standard -> standard
        TanreiSideSheetVariant.Modal -> modal
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [standard]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiSideSheetVariant): TanreiSideSheetVariantTokens = find(key) ?: standard

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(standard.referencedRoles())
        addAll(modal.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** `comp.side-sheet`. Members are flat tokens, then per-state tokens, then one holder per axis (`variants[variant]`). */
@Immutable
public data class TanreiSideSheetTokens(
    public val actionsArrangement: Float,
    public val actionsGap: Dp,
    public val actionsPaddingBlock: Dp,
    public val actionsVariant: Float,
    public val closeButtonVariant: Float,
    public val containerPaddingBlock: Dp,
    public val containerPaddingInline: Dp,
    public val containerWidth: Dp,
    public val contentColor: TanreiPaint,
    public val dividerColor: TanreiPaint,
    public val dividerVisibility: Float,
    public val dividerWidth: Dp,
    public val headerGap: Dp,
    public val headerHeight: Dp,
    public val headerPaddingInlineEnd: Dp,
    public val headlineColor: TanreiPaint,
    public val headlineTypescale: TanreiTextStyle,
    public val motionEnterDuration: Int,
    public val motionEnterEasing: TanreiCubicBezier,
    public val motionExitDuration: Int,
    public val motionExitEasing: TanreiCubicBezier,
    public val outlineWidth: Dp,
    public val scrimBlur: Dp,
    public val scrimColor: TanreiPaint,
    public val variants: TanreiSideSheetVariants,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(contentColor.roles())
        addAll(dividerColor.roles())
        addAll(headlineColor.roles())
        addAll(scrimColor.roles())
        addAll(variants.referencedRoles())
    }
}

/** `comp.skeleton`. Members are flat tokens, then per-state tokens, then one holder per axis (). */
@Immutable
public data class TanreiSkeletonTokens(
    public val containerGap: Dp,
    public val motionAnimation: Float,
    public val motionDimDuration: Int,
    public val motionDimEasing: TanreiCubicBezier,
    public val motionShowDelay: Int,
    public val placeholderColor: TanreiPaint,
    public val placeholderDimOpacity: Float,
    public val placeholderLastLineInlineSize: Float,
    public val placeholderShapeBlock: Dp,
    public val placeholderShapeCircle: Dp,
    public val placeholderShapeText: Dp,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(placeholderColor.roles())
    }
}

/**
 * A size of slider: the key of one entry of [TanreiSliderSizes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Small].
 */
@JvmInline
public value class TanreiSliderSize(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Small: TanreiSliderSize = TanreiSliderSize("small")
        public val Medium: TanreiSliderSize = TanreiSliderSize("medium")
        public val Large: TanreiSliderSize = TanreiSliderSize("large")
    }
}

/** The tokens of one size of slider. */
@Immutable
public data class TanreiSliderSizeTokens(
    public val trackThickness: Dp,
    public val trackShape: Dp,
    public val handleHeight: Dp,
    public val stopIndicatorSize: Dp,
)

/**
 * Every size of slider: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiSliderSizes(
    public val small: TanreiSliderSizeTokens,
    public val medium: TanreiSliderSizeTokens,
    public val large: TanreiSliderSizeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiSliderSize, TanreiSliderSizeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiSliderSize> get() = linkedSetOf(TanreiSliderSize.Small, TanreiSliderSize.Medium, TanreiSliderSize.Large) + extra.keys

    public operator fun contains(key: TanreiSliderSize): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiSliderSize): TanreiSliderSizeTokens? = when (key) {
        TanreiSliderSize.Small -> small
        TanreiSliderSize.Medium -> medium
        TanreiSliderSize.Large -> large
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [small]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiSliderSize): TanreiSliderSizeTokens = find(key) ?: small
}

/**
 * A condition of slider: the key of one entry of [TanreiSliderConditions]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Standard].
 */
@JvmInline
public value class TanreiSliderCondition(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Standard: TanreiSliderCondition = TanreiSliderCondition("standard")
    }
}

/** What one condition of slider draws in one interaction state. */
@Immutable
public data class TanreiSliderConditionStateTokens(
    public val containerColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
    public val handleColor: TanreiPaint,
    public val handleWidth: Dp,
    public val handleElevation: List<TanreiShadowLayer>,
    public val handleOutlineColor: TanreiPaint,
    public val trackColor: TanreiPaint,
    public val activeTrackColor: TanreiPaint,
    public val stopIndicatorColor: TanreiPaint,
    public val activeStopIndicatorColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(stateLayerColor.roles())
        addAll(handleColor.roles())
        handleElevation.forEach { add(it.role) }
        addAll(handleOutlineColor.roles())
        addAll(trackColor.roles())
        addAll(activeTrackColor.roles())
        addAll(stopIndicatorColor.roles())
        addAll(activeStopIndicatorColor.roles())
    }
}

/** One condition of slider: a full set of tokens per interaction state. */
@Immutable
public data class TanreiSliderConditionTokens(
    public val enabled: TanreiSliderConditionStateTokens,
    public val hovered: TanreiSliderConditionStateTokens,
    public val focused: TanreiSliderConditionStateTokens,
    public val pressed: TanreiSliderConditionStateTokens,
    public val disabled: TanreiSliderConditionStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiSliderConditionStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every condition of slider: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiSliderConditions(
    public val standard: TanreiSliderConditionTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiSliderCondition, TanreiSliderConditionTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiSliderCondition> get() = linkedSetOf(TanreiSliderCondition.Standard) + extra.keys

    public operator fun contains(key: TanreiSliderCondition): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiSliderCondition): TanreiSliderConditionTokens? = when (key) {
        TanreiSliderCondition.Standard -> standard
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [standard]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiSliderCondition): TanreiSliderConditionTokens = find(key) ?: standard

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(standard.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of slider shares in one interaction state. */
@Immutable
public data class TanreiSliderStateTokens(
    public val opacity: Float,
)

/** `comp.slider`. Members are flat tokens, then per-state tokens, then one holder per axis (`sizes[size]`, `conditions[condition]`). */
@Immutable
public data class TanreiSliderTokens(
    public val containerShape: Dp,
    public val containerSize: Dp,
    public val handleOutlineWidth: Dp,
    public val handleShape: Dp,
    public val motionFeedbackDuration: Int,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val motionValueDuration: Int,
    public val motionValueEasing: TanreiCubicBezier,
    public val trackGap: Dp,
    public val valueIndicatorContainerColor: TanreiPaint,
    public val valueIndicatorContainerHeight: Dp,
    public val valueIndicatorContainerPaddingInline: Dp,
    public val valueIndicatorContainerShape: Dp,
    public val valueIndicatorLabelColor: TanreiPaint,
    public val valueIndicatorLabelTypescale: TanreiTextStyle,
    public val valueIndicatorOffset: Dp,
    public val hovered: TanreiSliderStateTokens,
    public val focused: TanreiSliderStateTokens,
    public val pressed: TanreiSliderStateTokens,
    public val disabled: TanreiSliderStateTokens,
    public val sizes: TanreiSliderSizes,
    public val conditions: TanreiSliderConditions,
) {
    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(valueIndicatorContainerColor.roles())
        addAll(valueIndicatorLabelColor.roles())
        addAll(conditions.referencedRoles())
    }
}

/**
 * A control of snackbar: the key of one entry of [TanreiSnackbarControls]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Action].
 */
@JvmInline
public value class TanreiSnackbarControl(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Action: TanreiSnackbarControl = TanreiSnackbarControl("action")
    }
}

/** What one control of snackbar draws in one interaction state. */
@Immutable
public data class TanreiSnackbarControlStateTokens(
    public val containerColor: TanreiPaint,
    public val contentColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
    public val infoContainerColor: TanreiPaint,
    public val infoContentColor: TanreiPaint,
    public val infoStateLayerColor: TanreiPaint,
    public val warningContainerColor: TanreiPaint,
    public val warningContentColor: TanreiPaint,
    public val warningStateLayerColor: TanreiPaint,
    public val errorContainerColor: TanreiPaint,
    public val errorContentColor: TanreiPaint,
    public val errorStateLayerColor: TanreiPaint,
    public val successContainerColor: TanreiPaint,
    public val successContentColor: TanreiPaint,
    public val successStateLayerColor: TanreiPaint,
    public val inverseContainerColor: TanreiPaint,
    public val inverseContentColor: TanreiPaint,
    public val inverseStateLayerColor: TanreiPaint,
    public val inverseInfoContainerColor: TanreiPaint,
    public val inverseInfoContentColor: TanreiPaint,
    public val inverseInfoStateLayerColor: TanreiPaint,
    public val inverseWarningContainerColor: TanreiPaint,
    public val inverseWarningContentColor: TanreiPaint,
    public val inverseWarningStateLayerColor: TanreiPaint,
    public val inverseErrorContainerColor: TanreiPaint,
    public val inverseErrorContentColor: TanreiPaint,
    public val inverseErrorStateLayerColor: TanreiPaint,
    public val inverseSuccessContainerColor: TanreiPaint,
    public val inverseSuccessContentColor: TanreiPaint,
    public val inverseSuccessStateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(contentColor.roles())
        addAll(stateLayerColor.roles())
        addAll(infoContainerColor.roles())
        addAll(infoContentColor.roles())
        addAll(infoStateLayerColor.roles())
        addAll(warningContainerColor.roles())
        addAll(warningContentColor.roles())
        addAll(warningStateLayerColor.roles())
        addAll(errorContainerColor.roles())
        addAll(errorContentColor.roles())
        addAll(errorStateLayerColor.roles())
        addAll(successContainerColor.roles())
        addAll(successContentColor.roles())
        addAll(successStateLayerColor.roles())
        addAll(inverseContainerColor.roles())
        addAll(inverseContentColor.roles())
        addAll(inverseStateLayerColor.roles())
        addAll(inverseInfoContainerColor.roles())
        addAll(inverseInfoContentColor.roles())
        addAll(inverseInfoStateLayerColor.roles())
        addAll(inverseWarningContainerColor.roles())
        addAll(inverseWarningContentColor.roles())
        addAll(inverseWarningStateLayerColor.roles())
        addAll(inverseErrorContainerColor.roles())
        addAll(inverseErrorContentColor.roles())
        addAll(inverseErrorStateLayerColor.roles())
        addAll(inverseSuccessContainerColor.roles())
        addAll(inverseSuccessContentColor.roles())
        addAll(inverseSuccessStateLayerColor.roles())
    }
}

/** One control of snackbar: a full set of tokens per interaction state. */
@Immutable
public data class TanreiSnackbarControlTokens(
    public val enabled: TanreiSnackbarControlStateTokens,
    public val hovered: TanreiSnackbarControlStateTokens,
    public val focused: TanreiSnackbarControlStateTokens,
    public val pressed: TanreiSnackbarControlStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiSnackbarControlStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> enabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles()
}

/**
 * Every control of snackbar: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiSnackbarControls(
    public val action: TanreiSnackbarControlTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiSnackbarControl, TanreiSnackbarControlTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiSnackbarControl> get() = linkedSetOf(TanreiSnackbarControl.Action) + extra.keys

    public operator fun contains(key: TanreiSnackbarControl): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiSnackbarControl): TanreiSnackbarControlTokens? = when (key) {
        TanreiSnackbarControl.Action -> action
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [action]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiSnackbarControl): TanreiSnackbarControlTokens = find(key) ?: action

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(action.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of snackbar shares in one interaction state. */
@Immutable
public data class TanreiSnackbarStateTokens(
    public val opacity: Float,
)

/** `comp.snackbar`. Members are flat tokens, then per-state tokens, then one holder per axis (`controls[control]`). */
@Immutable
public data class TanreiSnackbarTokens(
    public val actionTonalLayerOpacity: Float,
    public val breakpointMedium: Dp,
    public val closeButtonVariant: Float,
    public val containerColor: TanreiPaint,
    public val containerElevation: List<TanreiShadowLayer>,
    public val containerGap: Dp,
    public val containerInverse: Float,
    public val containerMargin: Dp,
    public val containerMaxWidth: Dp,
    public val containerMinHeight: Dp,
    public val containerMinWidth: Dp,
    public val containerPaddingBlock: Dp,
    public val containerPaddingInlineEnd: Dp,
    public val containerPaddingInlineEndWithControls: Dp,
    public val containerPaddingInlineStart: Dp,
    public val containerShape: Dp,
    public val controlsGap: Dp,
    public val controlsHeight: Dp,
    public val controlsLabelTypescale: TanreiTextStyle,
    public val controlsPaddingInline: Dp,
    public val controlsShape: Dp,
    public val errorContainerColor: TanreiPaint,
    public val errorFocusRingColor: TanreiPaint,
    public val errorIconColor: TanreiPaint,
    public val errorOutlineColor: TanreiPaint,
    public val errorSupportingTextColor: TanreiPaint,
    public val errorTitleColor: TanreiPaint,
    public val focusRingColor: TanreiPaint,
    public val iconGap: Dp,
    public val iconOpacity: Float,
    public val iconSize: Dp,
    public val infoContainerColor: TanreiPaint,
    public val infoFocusRingColor: TanreiPaint,
    public val infoIconColor: TanreiPaint,
    public val infoOutlineColor: TanreiPaint,
    public val infoSupportingTextColor: TanreiPaint,
    public val infoTitleColor: TanreiPaint,
    public val inverseErrorContainerColor: TanreiPaint,
    public val inverseErrorFocusRingColor: TanreiPaint,
    public val inverseErrorIconColor: TanreiPaint,
    public val inverseErrorOutlineColor: TanreiPaint,
    public val inverseErrorSupportingTextColor: TanreiPaint,
    public val inverseErrorTitleColor: TanreiPaint,
    public val inverseInfoContainerColor: TanreiPaint,
    public val inverseInfoFocusRingColor: TanreiPaint,
    public val inverseInfoIconColor: TanreiPaint,
    public val inverseInfoOutlineColor: TanreiPaint,
    public val inverseInfoSupportingTextColor: TanreiPaint,
    public val inverseInfoTitleColor: TanreiPaint,
    public val inverseSuccessContainerColor: TanreiPaint,
    public val inverseSuccessFocusRingColor: TanreiPaint,
    public val inverseSuccessIconColor: TanreiPaint,
    public val inverseSuccessOutlineColor: TanreiPaint,
    public val inverseSuccessSupportingTextColor: TanreiPaint,
    public val inverseSuccessTitleColor: TanreiPaint,
    public val inverseWarningContainerColor: TanreiPaint,
    public val inverseWarningFocusRingColor: TanreiPaint,
    public val inverseWarningIconColor: TanreiPaint,
    public val inverseWarningOutlineColor: TanreiPaint,
    public val inverseWarningSupportingTextColor: TanreiPaint,
    public val inverseWarningTitleColor: TanreiPaint,
    public val inverseContainerColor: TanreiPaint,
    public val inverseFocusRingColor: TanreiPaint,
    public val inverseSupportingTextColor: TanreiPaint,
    public val inverseTitleColor: TanreiPaint,
    public val motionEnterDuration: Int,
    public val motionEnterEasing: TanreiCubicBezier,
    public val motionExitDuration: Int,
    public val motionExitEasing: TanreiCubicBezier,
    public val motionExpandDuration: Int,
    public val motionExpandEasing: TanreiCubicBezier,
    public val motionFeedbackDuration: Int,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val outlineOpacity: Float,
    public val outlineWidth: Dp,
    public val successContainerColor: TanreiPaint,
    public val successFocusRingColor: TanreiPaint,
    public val successIconColor: TanreiPaint,
    public val successOutlineColor: TanreiPaint,
    public val successSupportingTextColor: TanreiPaint,
    public val successTitleColor: TanreiPaint,
    public val supportingTextColor: TanreiPaint,
    public val supportingTextMaxLines: Float,
    public val supportingTextTypescale: TanreiTextStyle,
    public val supportingTextUnderTitleOpacity: Float,
    public val timeoutLong: Int,
    public val timeoutShort: Int,
    public val titleColor: TanreiPaint,
    public val titleGap: Dp,
    public val titleMaxLines: Float,
    public val titleTypescale: TanreiTextStyle,
    public val warningContainerColor: TanreiPaint,
    public val warningFocusRingColor: TanreiPaint,
    public val warningIconColor: TanreiPaint,
    public val warningOutlineColor: TanreiPaint,
    public val warningSupportingTextColor: TanreiPaint,
    public val warningTitleColor: TanreiPaint,
    public val hovered: TanreiSnackbarStateTokens,
    public val focused: TanreiSnackbarStateTokens,
    public val pressed: TanreiSnackbarStateTokens,
    public val controls: TanreiSnackbarControls,
) {
    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> 1f
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        containerElevation.forEach { add(it.role) }
        addAll(errorContainerColor.roles())
        addAll(errorFocusRingColor.roles())
        addAll(errorIconColor.roles())
        addAll(errorOutlineColor.roles())
        addAll(errorSupportingTextColor.roles())
        addAll(errorTitleColor.roles())
        addAll(focusRingColor.roles())
        addAll(infoContainerColor.roles())
        addAll(infoFocusRingColor.roles())
        addAll(infoIconColor.roles())
        addAll(infoOutlineColor.roles())
        addAll(infoSupportingTextColor.roles())
        addAll(infoTitleColor.roles())
        addAll(inverseErrorContainerColor.roles())
        addAll(inverseErrorFocusRingColor.roles())
        addAll(inverseErrorIconColor.roles())
        addAll(inverseErrorOutlineColor.roles())
        addAll(inverseErrorSupportingTextColor.roles())
        addAll(inverseErrorTitleColor.roles())
        addAll(inverseInfoContainerColor.roles())
        addAll(inverseInfoFocusRingColor.roles())
        addAll(inverseInfoIconColor.roles())
        addAll(inverseInfoOutlineColor.roles())
        addAll(inverseInfoSupportingTextColor.roles())
        addAll(inverseInfoTitleColor.roles())
        addAll(inverseSuccessContainerColor.roles())
        addAll(inverseSuccessFocusRingColor.roles())
        addAll(inverseSuccessIconColor.roles())
        addAll(inverseSuccessOutlineColor.roles())
        addAll(inverseSuccessSupportingTextColor.roles())
        addAll(inverseSuccessTitleColor.roles())
        addAll(inverseWarningContainerColor.roles())
        addAll(inverseWarningFocusRingColor.roles())
        addAll(inverseWarningIconColor.roles())
        addAll(inverseWarningOutlineColor.roles())
        addAll(inverseWarningSupportingTextColor.roles())
        addAll(inverseWarningTitleColor.roles())
        addAll(inverseContainerColor.roles())
        addAll(inverseFocusRingColor.roles())
        addAll(inverseSupportingTextColor.roles())
        addAll(inverseTitleColor.roles())
        addAll(successContainerColor.roles())
        addAll(successFocusRingColor.roles())
        addAll(successIconColor.roles())
        addAll(successOutlineColor.roles())
        addAll(successSupportingTextColor.roles())
        addAll(successTitleColor.roles())
        addAll(supportingTextColor.roles())
        addAll(titleColor.roles())
        addAll(warningContainerColor.roles())
        addAll(warningFocusRingColor.roles())
        addAll(warningIconColor.roles())
        addAll(warningOutlineColor.roles())
        addAll(warningSupportingTextColor.roles())
        addAll(warningTitleColor.roles())
        addAll(controls.referencedRoles())
    }
}

/**
 * A condition of stepper: the key of one entry of [TanreiStepperConditions]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Incomplete].
 */
@JvmInline
public value class TanreiStepperCondition(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Incomplete: TanreiStepperCondition = TanreiStepperCondition("incomplete")
        public val Current: TanreiStepperCondition = TanreiStepperCondition("current")
        public val Complete: TanreiStepperCondition = TanreiStepperCondition("complete")
        public val Error: TanreiStepperCondition = TanreiStepperCondition("error")
    }
}

/** What one condition of stepper draws in one interaction state. */
@Immutable
public data class TanreiStepperConditionStateTokens(
    public val containerColor: TanreiPaint,
    public val markerColor: TanreiPaint,
    public val markerOutlineColor: TanreiPaint,
    public val markerContentColor: TanreiPaint,
    public val labelColor: TanreiPaint,
    public val descriptionColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(markerColor.roles())
        addAll(markerOutlineColor.roles())
        addAll(markerContentColor.roles())
        addAll(labelColor.roles())
        addAll(descriptionColor.roles())
        addAll(stateLayerColor.roles())
    }
}

/** One condition of stepper: a full set of tokens per interaction state. */
@Immutable
public data class TanreiStepperConditionTokens(
    public val enabled: TanreiStepperConditionStateTokens,
    public val hovered: TanreiStepperConditionStateTokens,
    public val focused: TanreiStepperConditionStateTokens,
    public val pressed: TanreiStepperConditionStateTokens,
    public val disabled: TanreiStepperConditionStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiStepperConditionStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every condition of stepper: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiStepperConditions(
    public val incomplete: TanreiStepperConditionTokens,
    public val current: TanreiStepperConditionTokens,
    public val complete: TanreiStepperConditionTokens,
    public val error: TanreiStepperConditionTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiStepperCondition, TanreiStepperConditionTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiStepperCondition> get() = linkedSetOf(TanreiStepperCondition.Incomplete, TanreiStepperCondition.Current, TanreiStepperCondition.Complete, TanreiStepperCondition.Error) + extra.keys

    public operator fun contains(key: TanreiStepperCondition): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiStepperCondition): TanreiStepperConditionTokens? = when (key) {
        TanreiStepperCondition.Incomplete -> incomplete
        TanreiStepperCondition.Current -> current
        TanreiStepperCondition.Complete -> complete
        TanreiStepperCondition.Error -> error
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [incomplete]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiStepperCondition): TanreiStepperConditionTokens = find(key) ?: incomplete

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(incomplete.referencedRoles())
        addAll(current.referencedRoles())
        addAll(complete.referencedRoles())
        addAll(error.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of stepper shares in one interaction state. */
@Immutable
public data class TanreiStepperStateTokens(
    public val containerShape: Dp,
    public val opacity: Float,
)

/** `comp.stepper`. Members are flat tokens, then per-state tokens, then one holder per axis (`conditions[condition]`). */
@Immutable
public data class TanreiStepperTokens(
    public val barColor: TanreiPaint,
    public val barFilledColor: TanreiPaint,
    public val barGap: Dp,
    public val barShape: Dp,
    public val barThickness: Dp,
    public val connectorColor: TanreiPaint,
    public val connectorCompleteColor: TanreiPaint,
    public val connectorGap: Dp,
    public val connectorThickness: Dp,
    public val containerPadding: Dp,
    public val containerShape: Dp,
    public val descriptionGap: Dp,
    public val descriptionTypescale: TanreiTextStyle,
    public val labelTypescale: TanreiTextStyle,
    public val markerGap: Dp,
    public val markerIconSize: Dp,
    public val markerIconWeight: Float,
    public val markerLabelTypescale: TanreiTextStyle,
    public val markerOutlineWidth: Dp,
    public val markerShape: Dp,
    public val markerSize: Dp,
    public val motionFeedbackDuration: Int,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val positionColor: TanreiPaint,
    public val positionGap: Dp,
    public val positionTypescale: TanreiTextStyle,
    public val stepMinWidth: Dp,
    public val hovered: TanreiStepperStateTokens,
    public val focused: TanreiStepperStateTokens,
    public val pressed: TanreiStepperStateTokens,
    public val disabled: TanreiStepperStateTokens,
    public val conditions: TanreiStepperConditions,
) {
    /** `container-shape` of [state]. */
    public fun containerShape(state: TanreiInteractionState): Dp = when (state) {
        TanreiInteractionState.Enabled -> containerShape
        TanreiInteractionState.Hovered -> hovered.containerShape
        TanreiInteractionState.Focused -> focused.containerShape
        TanreiInteractionState.Pressed -> pressed.containerShape
        TanreiInteractionState.Disabled -> disabled.containerShape
    }

    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(barColor.roles())
        addAll(barFilledColor.roles())
        addAll(connectorColor.roles())
        addAll(connectorCompleteColor.roles())
        addAll(positionColor.roles())
        addAll(conditions.referencedRoles())
    }
}

/**
 * A size of steps: the key of one entry of [TanreiStepsSizes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Medium].
 */
@JvmInline
public value class TanreiStepsSize(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Medium: TanreiStepsSize = TanreiStepsSize("medium")
        public val Large: TanreiStepsSize = TanreiStepsSize("large")
    }
}

/** The tokens of one size of steps. */
@Immutable
public data class TanreiStepsSizeTokens(
    public val markerHeight: Dp,
    public val markerLabelTypescale: TanreiTextStyle,
    public val titleTypescale: TanreiTextStyle,
    public val bodyTypescale: TanreiTextStyle,
)

/**
 * Every size of steps: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiStepsSizes(
    public val medium: TanreiStepsSizeTokens,
    public val large: TanreiStepsSizeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiStepsSize, TanreiStepsSizeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiStepsSize> get() = linkedSetOf(TanreiStepsSize.Medium, TanreiStepsSize.Large) + extra.keys

    public operator fun contains(key: TanreiStepsSize): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiStepsSize): TanreiStepsSizeTokens? = when (key) {
        TanreiStepsSize.Medium -> medium
        TanreiStepsSize.Large -> large
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [medium]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiStepsSize): TanreiStepsSizeTokens = find(key) ?: medium
}

/** `comp.steps`. Members are flat tokens, then per-state tokens, then one holder per axis (`sizes[size]`). */
@Immutable
public data class TanreiStepsTokens(
    public val bodyGap: Dp,
    public val connectorColor: TanreiPaint,
    public val connectorGap: Dp,
    public val connectorThickness: Dp,
    public val markerGap: Dp,
    public val markerOutlineColor: TanreiPaint,
    public val markerOutlineWidth: Dp,
    public val markerPaddingInline: Dp,
    public val markerShape: Dp,
    public val stepGap: Dp,
    public val titleGap: Dp,
    public val sizes: TanreiStepsSizes,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(connectorColor.roles())
        addAll(markerOutlineColor.roles())
    }
}

/**
 * A size of swatch: the key of one entry of [TanreiSwatchSizes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Medium].
 */
@JvmInline
public value class TanreiSwatchSize(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Small: TanreiSwatchSize = TanreiSwatchSize("small")
        public val Medium: TanreiSwatchSize = TanreiSwatchSize("medium")
        public val Large: TanreiSwatchSize = TanreiSwatchSize("large")
    }
}

/** The tokens of one size of swatch. */
@Immutable
public data class TanreiSwatchSizeTokens(
    public val containerSize: Dp,
    public val gap: Dp,
    public val labelTypescale: TanreiTextStyle,
    public val supportingTextTypescale: TanreiTextStyle,
)

/**
 * Every size of swatch: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiSwatchSizes(
    public val small: TanreiSwatchSizeTokens,
    public val medium: TanreiSwatchSizeTokens,
    public val large: TanreiSwatchSizeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiSwatchSize, TanreiSwatchSizeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiSwatchSize> get() = linkedSetOf(TanreiSwatchSize.Small, TanreiSwatchSize.Medium, TanreiSwatchSize.Large) + extra.keys

    public operator fun contains(key: TanreiSwatchSize): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiSwatchSize): TanreiSwatchSizeTokens? = when (key) {
        TanreiSwatchSize.Small -> small
        TanreiSwatchSize.Medium -> medium
        TanreiSwatchSize.Large -> large
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [medium]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiSwatchSize): TanreiSwatchSizeTokens = find(key) ?: medium
}

/**
 * A shape of swatch: the key of one entry of [TanreiSwatchShapes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Square].
 */
@JvmInline
public value class TanreiSwatchShape(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Square: TanreiSwatchShape = TanreiSwatchShape("square")
        public val Circle: TanreiSwatchShape = TanreiSwatchShape("circle")
    }
}

/** The tokens of one shape of swatch. */
@Immutable
public data class TanreiSwatchShapeTokens(
    public val containerShape: Dp,
)

/**
 * Every shape of swatch: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiSwatchShapes(
    public val square: TanreiSwatchShapeTokens,
    public val circle: TanreiSwatchShapeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiSwatchShape, TanreiSwatchShapeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiSwatchShape> get() = linkedSetOf(TanreiSwatchShape.Square, TanreiSwatchShape.Circle) + extra.keys

    public operator fun contains(key: TanreiSwatchShape): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiSwatchShape): TanreiSwatchShapeTokens? = when (key) {
        TanreiSwatchShape.Square -> square
        TanreiSwatchShape.Circle -> circle
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [square]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiSwatchShape): TanreiSwatchShapeTokens = find(key) ?: square
}

/** `comp.swatch`. Members are flat tokens, then per-state tokens, then one holder per axis (`sizes[size]`, `shapes[shape]`). */
@Immutable
public data class TanreiSwatchTokens(
    public val checkerboardAlternateColor: TanreiPaint,
    public val checkerboardColor: TanreiPaint,
    public val checkerboardSize: Dp,
    public val labelColor: TanreiPaint,
    public val outlineColor: TanreiPaint,
    public val outlineWidth: Dp,
    public val supportingTextColor: TanreiPaint,
    public val sizes: TanreiSwatchSizes,
    public val shapes: TanreiSwatchShapes,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(checkerboardAlternateColor.roles())
        addAll(checkerboardColor.roles())
        addAll(labelColor.roles())
        addAll(outlineColor.roles())
        addAll(supportingTextColor.roles())
    }
}

/**
 * A condition of switch: the key of one entry of [TanreiSwitchConditions]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Unselected].
 */
@JvmInline
public value class TanreiSwitchCondition(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Unselected: TanreiSwitchCondition = TanreiSwitchCondition("unselected")
        public val Selected: TanreiSwitchCondition = TanreiSwitchCondition("selected")
    }
}

/** What one condition of switch draws in one interaction state. */
@Immutable
public data class TanreiSwitchConditionStateTokens(
    public val containerColor: TanreiPaint,
    public val trackColor: TanreiPaint,
    public val outlineColor: TanreiPaint,
    public val handleColor: TanreiPaint,
    public val handleSize: Dp,
    public val handleElevation: List<TanreiShadowLayer>,
    public val iconColor: TanreiPaint,
    public val labelColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(trackColor.roles())
        addAll(outlineColor.roles())
        addAll(handleColor.roles())
        handleElevation.forEach { add(it.role) }
        addAll(iconColor.roles())
        addAll(labelColor.roles())
        addAll(stateLayerColor.roles())
    }
}

/** One condition of switch: a full set of tokens per interaction state. */
@Immutable
public data class TanreiSwitchConditionTokens(
    public val enabled: TanreiSwitchConditionStateTokens,
    public val hovered: TanreiSwitchConditionStateTokens,
    public val focused: TanreiSwitchConditionStateTokens,
    public val pressed: TanreiSwitchConditionStateTokens,
    public val disabled: TanreiSwitchConditionStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiSwitchConditionStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every condition of switch: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiSwitchConditions(
    public val unselected: TanreiSwitchConditionTokens,
    public val selected: TanreiSwitchConditionTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiSwitchCondition, TanreiSwitchConditionTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiSwitchCondition> get() = linkedSetOf(TanreiSwitchCondition.Unselected, TanreiSwitchCondition.Selected) + extra.keys

    public operator fun contains(key: TanreiSwitchCondition): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiSwitchCondition): TanreiSwitchConditionTokens? = when (key) {
        TanreiSwitchCondition.Unselected -> unselected
        TanreiSwitchCondition.Selected -> selected
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [unselected]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiSwitchCondition): TanreiSwitchConditionTokens = find(key) ?: unselected

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(unselected.referencedRoles())
        addAll(selected.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** What every variant of switch shares in one interaction state. */
@Immutable
public data class TanreiSwitchStateTokens(
    public val containerShape: Dp,
    public val opacity: Float,
)

/** `comp.switch`. Members are flat tokens, then per-state tokens, then one holder per axis (`conditions[condition]`). */
@Immutable
public data class TanreiSwitchTokens(
    public val containerShape: Dp,
    public val containerSize: Dp,
    public val handleSizeWithIcon: Dp,
    public val iconSize: Dp,
    public val iconWeight: Float,
    public val labelGap: Dp,
    public val labelTypescale: TanreiTextStyle,
    public val motionFeedbackDuration: Int,
    public val motionSelectionDuration: Int,
    public val motionSelectionEasing: TanreiCubicBezier,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val outlineWidth: Dp,
    public val trackHeight: Dp,
    public val trackShape: Dp,
    public val trackWidth: Dp,
    public val hovered: TanreiSwitchStateTokens,
    public val focused: TanreiSwitchStateTokens,
    public val pressed: TanreiSwitchStateTokens,
    public val disabled: TanreiSwitchStateTokens,
    public val conditions: TanreiSwitchConditions,
) {
    /** `container-shape` of [state]. */
    public fun containerShape(state: TanreiInteractionState): Dp = when (state) {
        TanreiInteractionState.Enabled -> containerShape
        TanreiInteractionState.Hovered -> hovered.containerShape
        TanreiInteractionState.Focused -> focused.containerShape
        TanreiInteractionState.Pressed -> pressed.containerShape
        TanreiInteractionState.Disabled -> disabled.containerShape
    }

    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(conditions.referencedRoles())
    }
}

/** `comp.tab-view`. Members are flat tokens, then per-state tokens, then one holder per axis (). */
@Immutable
public data class TanreiTabViewTokens(
    public val containerShape: Dp,
    public val motionFadeDuration: Int,
    public val motionFadeEasing: TanreiCubicBezier,
    public val motionSwitchDuration: Int,
    public val motionSwitchEasing: TanreiCubicBezier,
    public val motionTransition: Float,
    public val transitionBlur: Dp,
    public val transitionDistance: Dp,
    public val transitionDistanceFraction: Float,
    public val transitionOpacity: Float,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
    }
}

/**
 * A part of table-of-contents: the key of one entry of [TanreiTableOfContentsParts]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Item].
 */
@JvmInline
public value class TanreiTableOfContentsPart(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Item: TanreiTableOfContentsPart = TanreiTableOfContentsPart("item")
        public val Current: TanreiTableOfContentsPart = TanreiTableOfContentsPart("current")
        public val Disclosure: TanreiTableOfContentsPart = TanreiTableOfContentsPart("disclosure")
    }
}

/** What one part of table-of-contents draws in one interaction state. */
@Immutable
public data class TanreiTableOfContentsPartStateTokens(
    public val containerColor: TanreiPaint,
    public val labelColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(labelColor.roles())
        addAll(stateLayerColor.roles())
    }
}

/** One part of table-of-contents: a full set of tokens per interaction state. */
@Immutable
public data class TanreiTableOfContentsPartTokens(
    public val enabled: TanreiTableOfContentsPartStateTokens,
    public val hovered: TanreiTableOfContentsPartStateTokens,
    public val focused: TanreiTableOfContentsPartStateTokens,
    public val pressed: TanreiTableOfContentsPartStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiTableOfContentsPartStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> enabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles()
}

/**
 * Every part of table-of-contents: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiTableOfContentsParts(
    public val item: TanreiTableOfContentsPartTokens,
    public val current: TanreiTableOfContentsPartTokens,
    public val disclosure: TanreiTableOfContentsPartTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiTableOfContentsPart, TanreiTableOfContentsPartTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiTableOfContentsPart> get() = linkedSetOf(TanreiTableOfContentsPart.Item, TanreiTableOfContentsPart.Current, TanreiTableOfContentsPart.Disclosure) + extra.keys

    public operator fun contains(key: TanreiTableOfContentsPart): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiTableOfContentsPart): TanreiTableOfContentsPartTokens? = when (key) {
        TanreiTableOfContentsPart.Item -> item
        TanreiTableOfContentsPart.Current -> current
        TanreiTableOfContentsPart.Disclosure -> disclosure
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [item]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiTableOfContentsPart): TanreiTableOfContentsPartTokens = find(key) ?: item

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(item.referencedRoles())
        addAll(current.referencedRoles())
        addAll(disclosure.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/**
 * A density of table-of-contents: the key of one entry of [TanreiTableOfContentsDensitys]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Regular].
 */
@JvmInline
public value class TanreiTableOfContentsDensity(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Regular: TanreiTableOfContentsDensity = TanreiTableOfContentsDensity("regular")
        public val Compact: TanreiTableOfContentsDensity = TanreiTableOfContentsDensity("compact")
    }
}

/** The tokens of one density of table-of-contents. */
@Immutable
public data class TanreiTableOfContentsDensityTokens(
    public val rowHeight: Dp,
    public val rowPaddingBlock: Dp,
)

/**
 * Every density of table-of-contents: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiTableOfContentsDensitys(
    public val regular: TanreiTableOfContentsDensityTokens,
    public val compact: TanreiTableOfContentsDensityTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiTableOfContentsDensity, TanreiTableOfContentsDensityTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiTableOfContentsDensity> get() = linkedSetOf(TanreiTableOfContentsDensity.Regular, TanreiTableOfContentsDensity.Compact) + extra.keys

    public operator fun contains(key: TanreiTableOfContentsDensity): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiTableOfContentsDensity): TanreiTableOfContentsDensityTokens? = when (key) {
        TanreiTableOfContentsDensity.Regular -> regular
        TanreiTableOfContentsDensity.Compact -> compact
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [regular]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiTableOfContentsDensity): TanreiTableOfContentsDensityTokens = find(key) ?: regular
}

/** What every variant of table-of-contents shares in one interaction state. */
@Immutable
public data class TanreiTableOfContentsStateTokens(
    public val opacity: Float,
)

/** `comp.table-of-contents`. Members are flat tokens, then per-state tokens, then one holder per axis (`parts[part]`, `densitys[density]`). */
@Immutable
public data class TanreiTableOfContentsTokens(
    public val compactContainerColor: TanreiPaint,
    public val compactContainerShape: Dp,
    public val compactIconColor: TanreiPaint,
    public val compactIconSize: Dp,
    public val compactListPaddingBlock: Dp,
    public val compactListPaddingInline: Dp,
    public val compactRowGap: Dp,
    public val compactRowHeight: Dp,
    public val compactRowPaddingInline: Dp,
    public val compactSupportingTextColor: TanreiPaint,
    public val compactSupportingTextTypescale: TanreiTextStyle,
    public val containerGap: Dp,
    public val labelTypescale: TanreiTextStyle,
    public val markerColor: TanreiPaint,
    public val markerWidth: Dp,
    public val motionDisclosureDuration: Int,
    public val motionDisclosureEasing: TanreiCubicBezier,
    public val motionFeedbackDuration: Int,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val railColor: TanreiPaint,
    public val railWidth: Dp,
    public val rowIndent: Dp,
    public val rowPaddingInline: Dp,
    public val rowShape: Dp,
    public val titleColor: TanreiPaint,
    public val titleTypescale: TanreiTextStyle,
    public val hovered: TanreiTableOfContentsStateTokens,
    public val focused: TanreiTableOfContentsStateTokens,
    public val pressed: TanreiTableOfContentsStateTokens,
    public val parts: TanreiTableOfContentsParts,
    public val densitys: TanreiTableOfContentsDensitys,
) {
    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> 1f
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(compactContainerColor.roles())
        addAll(compactIconColor.roles())
        addAll(compactSupportingTextColor.roles())
        addAll(markerColor.roles())
        addAll(railColor.roles())
        addAll(titleColor.roles())
        addAll(parts.referencedRoles())
    }
}

/**
 * A part of table: the key of one entry of [TanreiTableParts]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Sort].
 */
@JvmInline
public value class TanreiTablePart(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Sort: TanreiTablePart = TanreiTablePart("sort")
        public val Sorted: TanreiTablePart = TanreiTablePart("sorted")
    }
}

/** What one part of table draws in one interaction state. */
@Immutable
public data class TanreiTablePartStateTokens(
    public val containerColor: TanreiPaint,
    public val labelColor: TanreiPaint,
    public val iconColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(labelColor.roles())
        addAll(iconColor.roles())
        addAll(stateLayerColor.roles())
    }
}

/** One part of table: a full set of tokens per interaction state. */
@Immutable
public data class TanreiTablePartTokens(
    public val enabled: TanreiTablePartStateTokens,
    public val hovered: TanreiTablePartStateTokens,
    public val focused: TanreiTablePartStateTokens,
    public val pressed: TanreiTablePartStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiTablePartStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> enabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles()
}

/**
 * Every part of table: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiTableParts(
    public val sort: TanreiTablePartTokens,
    public val sorted: TanreiTablePartTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiTablePart, TanreiTablePartTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiTablePart> get() = linkedSetOf(TanreiTablePart.Sort, TanreiTablePart.Sorted) + extra.keys

    public operator fun contains(key: TanreiTablePart): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiTablePart): TanreiTablePartTokens? = when (key) {
        TanreiTablePart.Sort -> sort
        TanreiTablePart.Sorted -> sorted
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [sort]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiTablePart): TanreiTablePartTokens = find(key) ?: sort

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(sort.referencedRoles())
        addAll(sorted.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/**
 * A density of table: the key of one entry of [TanreiTableDensitys]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Regular].
 */
@JvmInline
public value class TanreiTableDensity(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Regular: TanreiTableDensity = TanreiTableDensity("regular")
        public val Compact: TanreiTableDensity = TanreiTableDensity("compact")
    }
}

/** The tokens of one density of table. */
@Immutable
public data class TanreiTableDensityTokens(
    public val cellPaddingBlock: Dp,
    public val cellPaddingInline: Dp,
    public val cellTextTypescale: TanreiTextStyle,
    public val headerTextTypescale: TanreiTextStyle,
)

/**
 * Every density of table: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiTableDensitys(
    public val regular: TanreiTableDensityTokens,
    public val compact: TanreiTableDensityTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiTableDensity, TanreiTableDensityTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiTableDensity> get() = linkedSetOf(TanreiTableDensity.Regular, TanreiTableDensity.Compact) + extra.keys

    public operator fun contains(key: TanreiTableDensity): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiTableDensity): TanreiTableDensityTokens? = when (key) {
        TanreiTableDensity.Regular -> regular
        TanreiTableDensity.Compact -> compact
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [regular]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiTableDensity): TanreiTableDensityTokens = find(key) ?: regular
}

/** What every variant of table shares in one interaction state. */
@Immutable
public data class TanreiTableStateTokens(
    public val opacity: Float,
)

/** `comp.table`. Members are flat tokens, then per-state tokens, then one holder per axis (`parts[part]`, `densitys[density]`). */
@Immutable
public data class TanreiTableTokens(
    public val captionGap: Dp,
    public val captionTextColor: TanreiPaint,
    public val captionTextTypescale: TanreiTextStyle,
    public val cellTextColor: TanreiPaint,
    public val dividerColor: TanreiPaint,
    public val dividerThickness: Dp,
    public val emptyPaddingBlock: Dp,
    public val headerContainerColor: TanreiPaint,
    public val headerGap: Dp,
    public val headerIconSize: Dp,
    public val headerIconWeight: Float,
    public val headerTextColor: TanreiPaint,
    public val motionFeedbackDuration: Int,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val rowGap: Dp,
    public val rowSelectedContainerColor: TanreiPaint,
    public val rowSelectedHoveredContainerColor: TanreiPaint,
    public val rowSelectedHoveredTextColor: TanreiPaint,
    public val rowSelectedPressedContainerColor: TanreiPaint,
    public val rowSelectedPressedTextColor: TanreiPaint,
    public val rowSelectedStateLayerColor: TanreiPaint,
    public val rowSelectedTextColor: TanreiPaint,
    public val rowUnselectedContainerColor: TanreiPaint,
    public val rowUnselectedHoveredContainerColor: TanreiPaint,
    public val rowUnselectedHoveredTextColor: TanreiPaint,
    public val rowUnselectedPressedContainerColor: TanreiPaint,
    public val rowUnselectedPressedTextColor: TanreiPaint,
    public val rowUnselectedStateLayerColor: TanreiPaint,
    public val rowUnselectedTextColor: TanreiPaint,
    public val separation: Float,
    public val statusGap: Dp,
    public val statusPaddingBlock: Dp,
    public val statusTextColor: TanreiPaint,
    public val statusTextTypescale: TanreiTextStyle,
    public val stickyContainerColor: TanreiPaint,
    public val stripeContainerColor: TanreiPaint,
    public val hovered: TanreiTableStateTokens,
    public val focused: TanreiTableStateTokens,
    public val pressed: TanreiTableStateTokens,
    public val parts: TanreiTableParts,
    public val densitys: TanreiTableDensitys,
) {
    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> 1f
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(captionTextColor.roles())
        addAll(cellTextColor.roles())
        addAll(dividerColor.roles())
        addAll(headerContainerColor.roles())
        addAll(headerTextColor.roles())
        addAll(rowSelectedContainerColor.roles())
        addAll(rowSelectedHoveredContainerColor.roles())
        addAll(rowSelectedHoveredTextColor.roles())
        addAll(rowSelectedPressedContainerColor.roles())
        addAll(rowSelectedPressedTextColor.roles())
        addAll(rowSelectedStateLayerColor.roles())
        addAll(rowSelectedTextColor.roles())
        addAll(rowUnselectedContainerColor.roles())
        addAll(rowUnselectedHoveredContainerColor.roles())
        addAll(rowUnselectedHoveredTextColor.roles())
        addAll(rowUnselectedPressedContainerColor.roles())
        addAll(rowUnselectedPressedTextColor.roles())
        addAll(rowUnselectedStateLayerColor.roles())
        addAll(rowUnselectedTextColor.roles())
        addAll(statusTextColor.roles())
        addAll(stickyContainerColor.roles())
        addAll(stripeContainerColor.roles())
        addAll(parts.referencedRoles())
    }
}

/**
 * A variant of tabs: the key of one entry of [TanreiTabsVariants]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Primary].
 */
@JvmInline
public value class TanreiTabsVariant(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Primary: TanreiTabsVariant = TanreiTabsVariant("primary")
        public val Secondary: TanreiTabsVariant = TanreiTabsVariant("secondary")
        public val Tonal: TanreiTabsVariant = TanreiTabsVariant("tonal")
    }
}

/** What one variant of tabs draws in one interaction state. */
@Immutable
public data class TanreiTabsVariantStateTokens(
    public val trackColor: TanreiPaint,
    public val containerColor: TanreiPaint,
    public val labelColor: TanreiPaint,
    public val iconColor: TanreiPaint,
    public val coveredLabelColor: TanreiPaint,
    public val coveredIconColor: TanreiPaint,
    public val activeIndicatorColor: TanreiPaint,
    public val activeIndicatorThickness: Dp,
    public val activeIndicatorShape: Dp,
    public val underlineColor: TanreiPaint,
    public val underlineThickness: Dp,
    public val underlineShape: Dp,
    public val stateLayerColor: TanreiPaint,
    public val selectedContainerColor: TanreiPaint,
    public val selectedLabelColor: TanreiPaint,
    public val selectedIconColor: TanreiPaint,
    public val selectedCoveredLabelColor: TanreiPaint,
    public val selectedCoveredIconColor: TanreiPaint,
    public val selectedActiveIndicatorColor: TanreiPaint,
    public val selectedUnderlineColor: TanreiPaint,
    public val selectedStateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(trackColor.roles())
        addAll(containerColor.roles())
        addAll(labelColor.roles())
        addAll(iconColor.roles())
        addAll(coveredLabelColor.roles())
        addAll(coveredIconColor.roles())
        addAll(activeIndicatorColor.roles())
        addAll(underlineColor.roles())
        addAll(stateLayerColor.roles())
        addAll(selectedContainerColor.roles())
        addAll(selectedLabelColor.roles())
        addAll(selectedIconColor.roles())
        addAll(selectedCoveredLabelColor.roles())
        addAll(selectedCoveredIconColor.roles())
        addAll(selectedActiveIndicatorColor.roles())
        addAll(selectedUnderlineColor.roles())
        addAll(selectedStateLayerColor.roles())
    }
}

/** One variant of tabs: a full set of tokens per interaction state. */
@Immutable
public data class TanreiTabsVariantTokens(
    public val enabled: TanreiTabsVariantStateTokens,
    public val hovered: TanreiTabsVariantStateTokens,
    public val focused: TanreiTabsVariantStateTokens,
    public val pressed: TanreiTabsVariantStateTokens,
    public val disabled: TanreiTabsVariantStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiTabsVariantStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every variant of tabs: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiTabsVariants(
    public val primary: TanreiTabsVariantTokens,
    public val secondary: TanreiTabsVariantTokens,
    public val tonal: TanreiTabsVariantTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiTabsVariant, TanreiTabsVariantTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiTabsVariant> get() = linkedSetOf(TanreiTabsVariant.Primary, TanreiTabsVariant.Secondary, TanreiTabsVariant.Tonal) + extra.keys

    public operator fun contains(key: TanreiTabsVariant): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiTabsVariant): TanreiTabsVariantTokens? = when (key) {
        TanreiTabsVariant.Primary -> primary
        TanreiTabsVariant.Secondary -> secondary
        TanreiTabsVariant.Tonal -> tonal
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [primary]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiTabsVariant): TanreiTabsVariantTokens = find(key) ?: primary

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(primary.referencedRoles())
        addAll(secondary.referencedRoles())
        addAll(tonal.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/**
 * A size of tabs: the key of one entry of [TanreiTabsSizes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Medium].
 */
@JvmInline
public value class TanreiTabsSize(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Small: TanreiTabsSize = TanreiTabsSize("small")
        public val Medium: TanreiTabsSize = TanreiTabsSize("medium")
    }
}

/** The tokens of one size of tabs. */
@Immutable
public data class TanreiTabsSizeTokens(
    public val containerHeight: Dp,
    public val containerPaddingInline: Dp,
    public val activeIndicatorPaddingInline: Dp,
    public val activeIndicatorPaddingBlock: Dp,
    public val iconSize: Dp,
    public val iconPlacement: Float,
)

/**
 * Every size of tabs: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiTabsSizes(
    public val small: TanreiTabsSizeTokens,
    public val medium: TanreiTabsSizeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiTabsSize, TanreiTabsSizeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiTabsSize> get() = linkedSetOf(TanreiTabsSize.Small, TanreiTabsSize.Medium) + extra.keys

    public operator fun contains(key: TanreiTabsSize): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiTabsSize): TanreiTabsSizeTokens? = when (key) {
        TanreiTabsSize.Small -> small
        TanreiTabsSize.Medium -> medium
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [medium]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiTabsSize): TanreiTabsSizeTokens = find(key) ?: medium
}

/** What every variant of tabs shares in one interaction state. */
@Immutable
public data class TanreiTabsStateTokens(
    public val opacity: Float,
)

/** `comp.tabs`. Members are flat tokens, then per-state tokens, then one holder per axis (`variants[variant]`, `sizes[size]`). */
@Immutable
public data class TanreiTabsTokens(
    public val activeIndicatorHeight: Dp,
    public val containerGap: Dp,
    public val containerHeightWithIcon: Dp,
    public val containerShape: Dp,
    public val dividerColor: TanreiPaint,
    public val dividerThickness: Dp,
    public val labelTypescale: TanreiTextStyle,
    public val motionFeedbackDuration: Int,
    public val motionIndicatorDuration: Int,
    public val motionIndicatorEasing: TanreiCubicBezier,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val motionTransition: Float,
    public val primarySelectedLabelEmphasis: Float,
    public val secondarySelectedLabelEmphasis: Float,
    public val tonalSelectedLabelEmphasis: Float,
    public val trackPadding: Dp,
    public val trackShape: Dp,
    public val trackVisible: Float,
    public val hovered: TanreiTabsStateTokens,
    public val focused: TanreiTabsStateTokens,
    public val pressed: TanreiTabsStateTokens,
    public val disabled: TanreiTabsStateTokens,
    public val variants: TanreiTabsVariants,
    public val sizes: TanreiTabsSizes,
) {
    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(dividerColor.roles())
        addAll(variants.referencedRoles())
    }
}

/**
 * A spacing of tag-group: the key of one entry of [TanreiTagGroupSpacings]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Chips].
 */
@JvmInline
public value class TanreiTagGroupSpacing(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Tags: TanreiTagGroupSpacing = TanreiTagGroupSpacing("tags")
        public val Chips: TanreiTagGroupSpacing = TanreiTagGroupSpacing("chips")
    }
}

/** The tokens of one spacing of tag-group. */
@Immutable
public data class TanreiTagGroupSpacingTokens(
    public val gap: Dp,
    public val rowGap: Dp,
)

/**
 * Every spacing of tag-group: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiTagGroupSpacings(
    public val tags: TanreiTagGroupSpacingTokens,
    public val chips: TanreiTagGroupSpacingTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiTagGroupSpacing, TanreiTagGroupSpacingTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiTagGroupSpacing> get() = linkedSetOf(TanreiTagGroupSpacing.Tags, TanreiTagGroupSpacing.Chips) + extra.keys

    public operator fun contains(key: TanreiTagGroupSpacing): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiTagGroupSpacing): TanreiTagGroupSpacingTokens? = when (key) {
        TanreiTagGroupSpacing.Tags -> tags
        TanreiTagGroupSpacing.Chips -> chips
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [chips]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiTagGroupSpacing): TanreiTagGroupSpacingTokens = find(key) ?: chips
}

/** `comp.tag-group`. Members are flat tokens, then per-state tokens, then one holder per axis (`spacings[spacing]`). */
@Immutable
public data class TanreiTagGroupTokens(
    public val spacings: TanreiTagGroupSpacings,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
    }
}

/**
 * A size of tag: the key of one entry of [TanreiTagSizes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Medium].
 */
@JvmInline
public value class TanreiTagSize(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Small: TanreiTagSize = TanreiTagSize("small")
        public val Medium: TanreiTagSize = TanreiTagSize("medium")
    }
}

/** The tokens of one size of tag. */
@Immutable
public data class TanreiTagSizeTokens(
    public val containerHeight: Dp,
    public val containerPaddingInline: Dp,
    public val containerPaddingInlineWithIcon: Dp,
    public val containerPaddingBlock: Dp,
    public val labelTypescale: TanreiTextStyle,
)

/**
 * Every size of tag: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiTagSizes(
    public val small: TanreiTagSizeTokens,
    public val medium: TanreiTagSizeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiTagSize, TanreiTagSizeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiTagSize> get() = linkedSetOf(TanreiTagSize.Small, TanreiTagSize.Medium) + extra.keys

    public operator fun contains(key: TanreiTagSize): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiTagSize): TanreiTagSizeTokens? = when (key) {
        TanreiTagSize.Small -> small
        TanreiTagSize.Medium -> medium
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [medium]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiTagSize): TanreiTagSizeTokens = find(key) ?: medium
}

/**
 * A variant of tag: the key of one entry of [TanreiTagVariants]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Tonal].
 */
@JvmInline
public value class TanreiTagVariant(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Tonal: TanreiTagVariant = TanreiTagVariant("tonal")
        public val Outlined: TanreiTagVariant = TanreiTagVariant("outlined")
        public val Filled: TanreiTagVariant = TanreiTagVariant("filled")
    }
}

/** What one variant of tag draws in one interaction state. */
@Immutable
public data class TanreiTagVariantStateTokens(
    public val containerColor: TanreiPaint,
    public val labelColor: TanreiPaint,
    public val iconColor: TanreiPaint,
    public val infoContainerColor: TanreiPaint,
    public val infoLabelColor: TanreiPaint,
    public val infoIconColor: TanreiPaint,
    public val warningContainerColor: TanreiPaint,
    public val warningLabelColor: TanreiPaint,
    public val warningIconColor: TanreiPaint,
    public val errorContainerColor: TanreiPaint,
    public val errorLabelColor: TanreiPaint,
    public val errorIconColor: TanreiPaint,
    public val successContainerColor: TanreiPaint,
    public val successLabelColor: TanreiPaint,
    public val successIconColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(labelColor.roles())
        addAll(iconColor.roles())
        addAll(infoContainerColor.roles())
        addAll(infoLabelColor.roles())
        addAll(infoIconColor.roles())
        addAll(warningContainerColor.roles())
        addAll(warningLabelColor.roles())
        addAll(warningIconColor.roles())
        addAll(errorContainerColor.roles())
        addAll(errorLabelColor.roles())
        addAll(errorIconColor.roles())
        addAll(successContainerColor.roles())
        addAll(successLabelColor.roles())
        addAll(successIconColor.roles())
    }
}

/** One variant of tag: a full set of tokens per interaction state. */
@Immutable
public data class TanreiTagVariantTokens(
    public val enabled: TanreiTagVariantStateTokens,
    public val disabled: TanreiTagVariantStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiTagVariantStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> enabled
        TanreiInteractionState.Focused -> enabled
        TanreiInteractionState.Pressed -> enabled
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every variant of tag: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiTagVariants(
    public val tonal: TanreiTagVariantTokens,
    public val outlined: TanreiTagVariantTokens,
    public val filled: TanreiTagVariantTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiTagVariant, TanreiTagVariantTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiTagVariant> get() = linkedSetOf(TanreiTagVariant.Tonal, TanreiTagVariant.Outlined, TanreiTagVariant.Filled) + extra.keys

    public operator fun contains(key: TanreiTagVariant): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiTagVariant): TanreiTagVariantTokens? = when (key) {
        TanreiTagVariant.Tonal -> tonal
        TanreiTagVariant.Outlined -> outlined
        TanreiTagVariant.Filled -> filled
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [tonal]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiTagVariant): TanreiTagVariantTokens = find(key) ?: tonal

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(tonal.referencedRoles())
        addAll(outlined.referencedRoles())
        addAll(filled.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** `comp.tag`. Members are flat tokens, then per-state tokens, then one holder per axis (`sizes[size]`, `variants[variant]`). */
@Immutable
public data class TanreiTagTokens(
    public val containerGap: Dp,
    public val containerShape: Dp,
    public val dotSize: Dp,
    public val iconSize: Dp,
    public val outlineColor: TanreiPaint,
    public val outlineWidth: Dp,
    public val sizes: TanreiTagSizes,
    public val variants: TanreiTagVariants,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(outlineColor.roles())
        addAll(variants.referencedRoles())
    }
}

/**
 * A variant of text-input: the key of one entry of [TanreiTextInputVariants]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Stacked].
 */
@JvmInline
public value class TanreiTextInputVariant(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Stacked: TanreiTextInputVariant = TanreiTextInputVariant("stacked")
        public val Filled: TanreiTextInputVariant = TanreiTextInputVariant("filled")
        public val Outlined: TanreiTextInputVariant = TanreiTextInputVariant("outlined")
    }
}

/** What one variant of text-input draws in one interaction state. */
@Immutable
public data class TanreiTextInputVariantStateTokens(
    public val resizeGripColor: TanreiPaint,
    public val errorResizeGripColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(resizeGripColor.roles())
        addAll(errorResizeGripColor.roles())
    }
}

/** One variant of text-input: a full set of tokens per interaction state. */
@Immutable
public data class TanreiTextInputVariantTokens(
    public val enabled: TanreiTextInputVariantStateTokens,
    public val hovered: TanreiTextInputVariantStateTokens,
    public val focused: TanreiTextInputVariantStateTokens,
    public val disabled: TanreiTextInputVariantStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiTextInputVariantStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> enabled
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every variant of text-input: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiTextInputVariants(
    public val stacked: TanreiTextInputVariantTokens,
    public val filled: TanreiTextInputVariantTokens,
    public val outlined: TanreiTextInputVariantTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiTextInputVariant, TanreiTextInputVariantTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiTextInputVariant> get() = linkedSetOf(TanreiTextInputVariant.Stacked, TanreiTextInputVariant.Filled, TanreiTextInputVariant.Outlined) + extra.keys

    public operator fun contains(key: TanreiTextInputVariant): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiTextInputVariant): TanreiTextInputVariantTokens? = when (key) {
        TanreiTextInputVariant.Stacked -> stacked
        TanreiTextInputVariant.Filled -> filled
        TanreiTextInputVariant.Outlined -> outlined
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [stacked]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiTextInputVariant): TanreiTextInputVariantTokens = find(key) ?: stacked

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(stacked.referencedRoles())
        addAll(filled.referencedRoles())
        addAll(outlined.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** `comp.text-input`. Members are flat tokens, then per-state tokens, then one holder per axis (`variants[variant]`). */
@Immutable
public data class TanreiTextInputTokens(
    public val codeTabSize: Float,
    public val codeTypescale: TanreiTextStyle,
    public val entriesGap: Dp,
    public val entriesRowGap: Dp,
    public val entriesTypingMinWidth: Dp,
    public val motionResizeDuration: Int,
    public val motionResizeEasing: TanreiCubicBezier,
    public val resizeGripInset: Dp,
    public val resizeGripSize: Dp,
    public val segmentPaddingInline: Dp,
    public val variants: TanreiTextInputVariants,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(variants.referencedRoles())
    }
}

/**
 * A size of timeline: the key of one entry of [TanreiTimelineSizes]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Medium].
 */
@JvmInline
public value class TanreiTimelineSize(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Medium: TanreiTimelineSize = TanreiTimelineSize("medium")
        public val Large: TanreiTimelineSize = TanreiTimelineSize("large")
    }
}

/** The tokens of one size of timeline. */
@Immutable
public data class TanreiTimelineSizeTokens(
    public val markerHeight: Dp,
    public val timeTypescale: TanreiTextStyle,
    public val titleTypescale: TanreiTextStyle,
    public val bodyTypescale: TanreiTextStyle,
)

/**
 * Every size of timeline: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiTimelineSizes(
    public val medium: TanreiTimelineSizeTokens,
    public val large: TanreiTimelineSizeTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiTimelineSize, TanreiTimelineSizeTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiTimelineSize> get() = linkedSetOf(TanreiTimelineSize.Medium, TanreiTimelineSize.Large) + extra.keys

    public operator fun contains(key: TanreiTimelineSize): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiTimelineSize): TanreiTimelineSizeTokens? = when (key) {
        TanreiTimelineSize.Medium -> medium
        TanreiTimelineSize.Large -> large
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [medium]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiTimelineSize): TanreiTimelineSizeTokens = find(key) ?: medium
}

/**
 * A density of timeline: the key of one entry of [TanreiTimelineDensitys]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Regular].
 */
@JvmInline
public value class TanreiTimelineDensity(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Regular: TanreiTimelineDensity = TanreiTimelineDensity("regular")
        public val Compact: TanreiTimelineDensity = TanreiTimelineDensity("compact")
    }
}

/** The tokens of one density of timeline. */
@Immutable
public data class TanreiTimelineDensityTokens(
    public val itemGap: Dp,
)

/**
 * Every density of timeline: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiTimelineDensitys(
    public val regular: TanreiTimelineDensityTokens,
    public val compact: TanreiTimelineDensityTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiTimelineDensity, TanreiTimelineDensityTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiTimelineDensity> get() = linkedSetOf(TanreiTimelineDensity.Regular, TanreiTimelineDensity.Compact) + extra.keys

    public operator fun contains(key: TanreiTimelineDensity): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiTimelineDensity): TanreiTimelineDensityTokens? = when (key) {
        TanreiTimelineDensity.Regular -> regular
        TanreiTimelineDensity.Compact -> compact
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [regular]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiTimelineDensity): TanreiTimelineDensityTokens = find(key) ?: regular
}

/** `comp.timeline`. Members are flat tokens, then per-state tokens, then one holder per axis (`sizes[size]`, `densitys[density]`). */
@Immutable
public data class TanreiTimelineTokens(
    public val bodyGap: Dp,
    public val connectorColor: TanreiPaint,
    public val connectorGap: Dp,
    public val connectorThickness: Dp,
    public val markerCurrentContainerColor: TanreiPaint,
    public val markerCurrentIconColor: TanreiPaint,
    public val markerDotColor: TanreiPaint,
    public val markerDotSize: Dp,
    public val markerGap: Dp,
    public val markerIconColor: TanreiPaint,
    public val markerIconSize: Dp,
    public val markerOutlineColor: TanreiPaint,
    public val markerOutlineWidth: Dp,
    public val markerShape: Dp,
    public val timeColor: TanreiPaint,
    public val timeGap: Dp,
    public val titleGap: Dp,
    public val sizes: TanreiTimelineSizes,
    public val densitys: TanreiTimelineDensitys,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(connectorColor.roles())
        addAll(markerCurrentContainerColor.roles())
        addAll(markerCurrentIconColor.roles())
        addAll(markerDotColor.roles())
        addAll(markerIconColor.roles())
        addAll(markerOutlineColor.roles())
        addAll(timeColor.roles())
    }
}

/**
 * A variant of toolbar: the key of one entry of [TanreiToolbarVariants]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Docked].
 */
@JvmInline
public value class TanreiToolbarVariant(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Docked: TanreiToolbarVariant = TanreiToolbarVariant("docked")
        public val Floating: TanreiToolbarVariant = TanreiToolbarVariant("floating")
    }
}

/** The tokens of one variant of toolbar. */
@Immutable
public data class TanreiToolbarVariantTokens(
    public val containerColor: TanreiPaint,
    public val containerElevation: List<TanreiShadowLayer>,
    public val containerShape: Dp,
    public val containerSize: Dp,
    public val containerPaddingInline: Dp,
    public val containerGap: Dp,
    public val outlineColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        containerElevation.forEach { add(it.role) }
        addAll(outlineColor.roles())
    }
}

/**
 * Every variant of toolbar: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiToolbarVariants(
    public val docked: TanreiToolbarVariantTokens,
    public val floating: TanreiToolbarVariantTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiToolbarVariant, TanreiToolbarVariantTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiToolbarVariant> get() = linkedSetOf(TanreiToolbarVariant.Docked, TanreiToolbarVariant.Floating) + extra.keys

    public operator fun contains(key: TanreiToolbarVariant): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiToolbarVariant): TanreiToolbarVariantTokens? = when (key) {
        TanreiToolbarVariant.Docked -> docked
        TanreiToolbarVariant.Floating -> floating
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [docked]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiToolbarVariant): TanreiToolbarVariantTokens = find(key) ?: docked

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(docked.referencedRoles())
        addAll(floating.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/** `comp.toolbar`. Members are flat tokens, then per-state tokens, then one holder per axis (`variants[variant]`). */
@Immutable
public data class TanreiToolbarTokens(
    public val outlineWidth: Dp,
    public val variants: TanreiToolbarVariants,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(variants.referencedRoles())
    }
}

/** `comp.tooltip`. Members are flat tokens, then per-state tokens, then one holder per axis (). */
@Immutable
public data class TanreiTooltipTokens(
    public val arrowHeight: Dp,
    public val arrowInset: Dp,
    public val arrowVisible: Float,
    public val arrowWidth: Dp,
    public val motionEnterDuration: Int,
    public val motionEnterEasing: TanreiCubicBezier,
    public val motionEnterOffset: Dp,
    public val motionEnterScale: Float,
    public val motionExitDuration: Int,
    public val motionExitEasing: TanreiCubicBezier,
    public val motionHideDelay: Int,
    public val motionShowDelay: Int,
    public val motionWarmDuration: Int,
    public val offset: Dp,
    public val plainContainerColor: TanreiPaint,
    public val plainContainerElevation: List<TanreiShadowLayer>,
    public val plainContainerGap: Dp,
    public val plainContainerInverse: Float,
    public val plainContainerMaxWidth: Dp,
    public val plainContainerMinHeight: Dp,
    public val plainContainerPaddingBlock: Dp,
    public val plainContainerPaddingInline: Dp,
    public val plainContainerShape: Dp,
    public val plainShortcutColor: TanreiPaint,
    public val plainSupportingTextColor: TanreiPaint,
    public val plainSupportingTextTypescale: TanreiTextStyle,
    public val plainSurfaceContainerColor: TanreiPaint,
    public val plainSurfaceContainerElevation: List<TanreiShadowLayer>,
    public val plainSurfaceShortcutColor: TanreiPaint,
    public val plainSurfaceSupportingTextColor: TanreiPaint,
    public val richContainerColor: TanreiPaint,
    public val richContainerElevation: List<TanreiShadowLayer>,
    public val richContainerGap: Dp,
    public val richContainerInverse: Float,
    public val richContainerMaxWidth: Dp,
    public val richContainerPaddingBlock: Dp,
    public val richContainerPaddingInline: Dp,
    public val richContainerShape: Dp,
    public val richInverseContainerColor: TanreiPaint,
    public val richInverseContainerElevation: List<TanreiShadowLayer>,
    public val richInverseSupportingTextColor: TanreiPaint,
    public val richInverseTitleColor: TanreiPaint,
    public val richSupportingTextColor: TanreiPaint,
    public val richSupportingTextTypescale: TanreiTextStyle,
    public val richTitleColor: TanreiPaint,
    public val richTitleTypescale: TanreiTextStyle,
    public val timeoutTouch: Int,
    public val windowMargin: Dp,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(plainContainerColor.roles())
        plainContainerElevation.forEach { add(it.role) }
        addAll(plainShortcutColor.roles())
        addAll(plainSupportingTextColor.roles())
        addAll(plainSurfaceContainerColor.roles())
        plainSurfaceContainerElevation.forEach { add(it.role) }
        addAll(plainSurfaceShortcutColor.roles())
        addAll(plainSurfaceSupportingTextColor.roles())
        addAll(richContainerColor.roles())
        richContainerElevation.forEach { add(it.role) }
        addAll(richInverseContainerColor.roles())
        richInverseContainerElevation.forEach { add(it.role) }
        addAll(richInverseSupportingTextColor.roles())
        addAll(richInverseTitleColor.roles())
        addAll(richSupportingTextColor.roles())
        addAll(richTitleColor.roles())
    }
}

/**
 * A condition of tree-view: the key of one entry of [TanreiTreeViewConditions]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Unselected].
 */
@JvmInline
public value class TanreiTreeViewCondition(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Unselected: TanreiTreeViewCondition = TanreiTreeViewCondition("unselected")
        public val Selected: TanreiTreeViewCondition = TanreiTreeViewCondition("selected")
    }
}

/** What one condition of tree-view draws in one interaction state. */
@Immutable
public data class TanreiTreeViewConditionStateTokens(
    public val containerColor: TanreiPaint,
    public val labelColor: TanreiPaint,
    public val supportingTextColor: TanreiPaint,
    public val trailingTextColor: TanreiPaint,
    public val iconColor: TanreiPaint,
    public val chevronColor: TanreiPaint,
    public val stateLayerColor: TanreiPaint,
) {
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(containerColor.roles())
        addAll(labelColor.roles())
        addAll(supportingTextColor.roles())
        addAll(trailingTextColor.roles())
        addAll(iconColor.roles())
        addAll(chevronColor.roles())
        addAll(stateLayerColor.roles())
    }
}

/** One condition of tree-view: a full set of tokens per interaction state. */
@Immutable
public data class TanreiTreeViewConditionTokens(
    public val enabled: TanreiTreeViewConditionStateTokens,
    public val hovered: TanreiTreeViewConditionStateTokens,
    public val focused: TanreiTreeViewConditionStateTokens,
    public val pressed: TanreiTreeViewConditionStateTokens,
    public val disabled: TanreiTreeViewConditionStateTokens,
) {
    public operator fun get(state: TanreiInteractionState): TanreiTreeViewConditionStateTokens = when (state) {
        TanreiInteractionState.Enabled -> enabled
        TanreiInteractionState.Hovered -> hovered
        TanreiInteractionState.Focused -> focused
        TanreiInteractionState.Pressed -> pressed
        TanreiInteractionState.Disabled -> disabled
    }

    public fun referencedRoles(): Set<TanreiColorRole> = enabled.referencedRoles() + hovered.referencedRoles() + focused.referencedRoles() + pressed.referencedRoles() + disabled.referencedRoles()
}

/**
 * Every condition of tree-view: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiTreeViewConditions(
    public val unselected: TanreiTreeViewConditionTokens,
    public val selected: TanreiTreeViewConditionTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiTreeViewCondition, TanreiTreeViewConditionTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiTreeViewCondition> get() = linkedSetOf(TanreiTreeViewCondition.Unselected, TanreiTreeViewCondition.Selected) + extra.keys

    public operator fun contains(key: TanreiTreeViewCondition): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiTreeViewCondition): TanreiTreeViewConditionTokens? = when (key) {
        TanreiTreeViewCondition.Unselected -> unselected
        TanreiTreeViewCondition.Selected -> selected
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [unselected]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiTreeViewCondition): TanreiTreeViewConditionTokens = find(key) ?: unselected

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(unselected.referencedRoles())
        addAll(selected.referencedRoles())
        extra.values.forEach { addAll(it.referencedRoles()) }
    }
}

/**
 * A density of tree-view: the key of one entry of [TanreiTreeViewDensitys]. The set is OPEN — the constants are the core
 * values every design system has, and a system may add more, so this is a string key, not an enum.
 * A key the current system does not have draws as [Regular].
 */
@JvmInline
public value class TanreiTreeViewDensity(public val key: String) {
    override fun toString(): String = key

    public companion object {
        public val Regular: TanreiTreeViewDensity = TanreiTreeViewDensity("regular")
        public val Compact: TanreiTreeViewDensity = TanreiTreeViewDensity("compact")
    }
}

/** The tokens of one density of tree-view. */
@Immutable
public data class TanreiTreeViewDensityTokens(
    public val containerHeight: Dp,
    public val containerPaddingBlock: Dp,
    public val containerPaddingInline: Dp,
    public val containerGap: Dp,
    public val levelIndent: Dp,
    public val labelTypescale: TanreiTextStyle,
    public val iconSize: Dp,
    public val chevronSize: Dp,
)

/**
 * Every density of tree-view: a named member per core value, plus [extra] for the values a design system added.
 */
@Immutable
public data class TanreiTreeViewDensitys(
    public val regular: TanreiTreeViewDensityTokens,
    public val compact: TanreiTreeViewDensityTokens,
    /** Values a design system added to the vocabulary, by key. */
    public val extra: Map<TanreiTreeViewDensity, TanreiTreeViewDensityTokens> = emptyMap(),
) {
    /** Every key this system has, core values first. */
    public val keys: Set<TanreiTreeViewDensity> get() = linkedSetOf(TanreiTreeViewDensity.Regular, TanreiTreeViewDensity.Compact) + extra.keys

    public operator fun contains(key: TanreiTreeViewDensity): Boolean = find(key) != null

    /** The tokens of [key], or null when this system does not have it. */
    public fun find(key: TanreiTreeViewDensity): TanreiTreeViewDensityTokens? = when (key) {
        TanreiTreeViewDensity.Regular -> regular
        TanreiTreeViewDensity.Compact -> compact
        else -> extra[key]
    }

    /** TOTAL: a key this system does not have reads the default value, [regular]. Components report such a key in debuggable apps. */
    public operator fun get(key: TanreiTreeViewDensity): TanreiTreeViewDensityTokens = find(key) ?: regular
}

/** What every variant of tree-view shares in one interaction state. */
@Immutable
public data class TanreiTreeViewStateTokens(
    public val opacity: Float,
)

/** `comp.tree-view`. Members are flat tokens, then per-state tokens, then one holder per axis (`conditions[condition]`, `densitys[density]`). */
@Immutable
public data class TanreiTreeViewTokens(
    public val containerShape: Dp,
    public val guideColor: TanreiPaint,
    public val guideWidth: Dp,
    public val iconGap: Dp,
    public val motionDisclosureDuration: Int,
    public val motionDisclosureEasing: TanreiCubicBezier,
    public val motionFeedbackDuration: Int,
    public val motionStateDuration: Int,
    public val motionStateEasing: TanreiCubicBezier,
    public val stickyContainerColor: TanreiPaint,
    public val stickyDividerColor: TanreiPaint,
    public val stickyDividerWidth: Dp,
    public val supportingTextTypescale: TanreiTextStyle,
    public val trailingTextTypescale: TanreiTextStyle,
    public val hovered: TanreiTreeViewStateTokens,
    public val focused: TanreiTreeViewStateTokens,
    public val pressed: TanreiTreeViewStateTokens,
    public val disabled: TanreiTreeViewStateTokens,
    public val conditions: TanreiTreeViewConditions,
    public val densitys: TanreiTreeViewDensitys,
) {
    /** `opacity` of [state]; the resting state has no such token and is never dimmed. */
    public fun opacity(state: TanreiInteractionState): Float = when (state) {
        TanreiInteractionState.Enabled -> 1f
        TanreiInteractionState.Hovered -> hovered.opacity
        TanreiInteractionState.Focused -> focused.opacity
        TanreiInteractionState.Pressed -> pressed.opacity
        TanreiInteractionState.Disabled -> disabled.opacity
    }

    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        addAll(guideColor.roles())
        addAll(stickyContainerColor.roles())
        addAll(stickyDividerColor.roles())
        addAll(conditions.referencedRoles())
    }
}

/**
 * One design system: every token a component or primitive reads. `TanreiTheme(system = …)` provides it.
 * Instances are generated (one file per system); construct with named arguments only.
 */
@Immutable
public data class TanreiSystem(
    public val id: String,
    public val dials: TanreiDials,
    /** Roles that come as a set of four (`x`, `on-x`, `x-container`, `on-x-container`). */
    public val intents: List<TanreiColorRole>,
    public val colors: TanreiColorSchemes,
    /** The named typefaces (`ref.typeface.*`); every text style already carries its own stack. */
    public val typefaces: TanreiTypefaces,
    public val typescale: TanreiTypescale,
    public val shape: TanreiShape,
    public val space: TanreiSpace,
    public val state: TanreiState,
    public val measure: TanreiMeasure,
    /** How icons are drawn; their sizes are in [measure]. */
    public val icon: TanreiIconStyle,
    public val motion: TanreiMotion,
    public val elevation: TanreiElevation,
    /** Choices of kind: how a press is answered and how keyboard focus is drawn. How corners ease is an amount, `shape.cornerSmoothing`. */
    public val behavior: TanreiBehavior,
    public val accordion: TanreiAccordionTokens,
    public val appBar: TanreiAppBarTokens,
    public val appShell: TanreiAppShellTokens,
    public val avatar: TanreiAvatarTokens,
    public val badge: TanreiBadgeTokens,
    public val bottomSheet: TanreiBottomSheetTokens,
    public val breadcrumbs: TanreiBreadcrumbsTokens,
    public val buttonGroup: TanreiButtonGroupTokens,
    public val buttonWithMenu: TanreiButtonWithMenuTokens,
    public val button: TanreiButtonTokens,
    public val calendar: TanreiCalendarTokens,
    public val callout: TanreiCalloutTokens,
    public val card: TanreiCardTokens,
    public val carousel: TanreiCarouselTokens,
    public val chatComposer: TanreiChatComposerTokens,
    public val checkbox: TanreiCheckboxTokens,
    public val chip: TanreiChipTokens,
    public val codeBlock: TanreiCodeBlockTokens,
    public val colorInput: TanreiColorInputTokens,
    public val combobox: TanreiComboboxTokens,
    public val copyButton: TanreiCopyButtonTokens,
    public val dateTimePicker: TanreiDateTimePickerTokens,
    public val descriptionList: TanreiDescriptionListTokens,
    public val dialog: TanreiDialogTokens,
    public val divider: TanreiDividerTokens,
    public val dropZone: TanreiDropZoneTokens,
    public val embeddedTextInput: TanreiEmbeddedTextInputTokens,
    public val emptyState: TanreiEmptyStateTokens,
    public val fabMenu: TanreiFabMenuTokens,
    public val fieldGroup: TanreiFieldGroupTokens,
    public val field: TanreiFieldTokens,
    public val figure: TanreiFigureTokens,
    public val fileItem: TanreiFileItemTokens,
    public val filePicker: TanreiFilePickerTokens,
    public val fileUpload: TanreiFileUploadTokens,
    public val handle: TanreiHandleTokens,
    public val imagePreview: TanreiImagePreviewTokens,
    public val inlineCode: TanreiInlineCodeTokens,
    public val inputBox: TanreiInputBoxTokens,
    public val keyboardShortcut: TanreiKeyboardShortcutTokens,
    public val linkCard: TanreiLinkCardTokens,
    public val link: TanreiLinkTokens,
    public val listRow: TanreiListRowTokens,
    public val list: TanreiListTokens,
    public val loadingIndicator: TanreiLoadingIndicatorTokens,
    public val mainActionButton: TanreiMainActionButtonTokens,
    public val menu: TanreiMenuTokens,
    public val menubar: TanreiMenubarTokens,
    public val meter: TanreiMeterTokens,
    public val modalLayer: TanreiModalLayerTokens,
    public val navigationBar: TanreiNavigationBarTokens,
    public val navigationDrawer: TanreiNavigationDrawerTokens,
    public val numberInput: TanreiNumberInputTokens,
    public val oneTimeCodeInput: TanreiOneTimeCodeInputTokens,
    public val pageHeader: TanreiPageHeaderTokens,
    public val pagination: TanreiPaginationTokens,
    public val popover: TanreiPopoverTokens,
    public val previousNextLinks: TanreiPreviousNextLinksTokens,
    public val progressIndicator: TanreiProgressIndicatorTokens,
    public val prose: TanreiProseTokens,
    public val radioButton: TanreiRadioButtonTokens,
    public val search: TanreiSearchTokens,
    public val segmentedButton: TanreiSegmentedButtonTokens,
    public val select: TanreiSelectTokens,
    public val sideSheet: TanreiSideSheetTokens,
    public val skeleton: TanreiSkeletonTokens,
    public val slider: TanreiSliderTokens,
    public val snackbar: TanreiSnackbarTokens,
    public val stepper: TanreiStepperTokens,
    public val steps: TanreiStepsTokens,
    public val swatch: TanreiSwatchTokens,
    public val switch: TanreiSwitchTokens,
    public val tabView: TanreiTabViewTokens,
    public val tableOfContents: TanreiTableOfContentsTokens,
    public val table: TanreiTableTokens,
    public val tabs: TanreiTabsTokens,
    public val tagGroup: TanreiTagGroupTokens,
    public val tag: TanreiTagTokens,
    public val textInput: TanreiTextInputTokens,
    public val timeline: TanreiTimelineTokens,
    public val toolbar: TanreiToolbarTokens,
    public val tooltip: TanreiTooltipTokens,
    public val treeView: TanreiTreeViewTokens,
) {
    /** Every role a component token or an elevation level of this system reads. */
    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {
        (listOf(elevation.level0, elevation.level1, elevation.level2, elevation.level3, elevation.level4, elevation.level5) + elevation.extra.values).forEach { level -> level.forEach { add(it.role) } }
        addAll(accordion.referencedRoles())
        addAll(appBar.referencedRoles())
        addAll(appShell.referencedRoles())
        addAll(avatar.referencedRoles())
        addAll(badge.referencedRoles())
        addAll(bottomSheet.referencedRoles())
        addAll(breadcrumbs.referencedRoles())
        addAll(buttonGroup.referencedRoles())
        addAll(buttonWithMenu.referencedRoles())
        addAll(button.referencedRoles())
        addAll(calendar.referencedRoles())
        addAll(callout.referencedRoles())
        addAll(card.referencedRoles())
        addAll(carousel.referencedRoles())
        addAll(chatComposer.referencedRoles())
        addAll(checkbox.referencedRoles())
        addAll(chip.referencedRoles())
        addAll(codeBlock.referencedRoles())
        addAll(colorInput.referencedRoles())
        addAll(combobox.referencedRoles())
        addAll(copyButton.referencedRoles())
        addAll(dateTimePicker.referencedRoles())
        addAll(descriptionList.referencedRoles())
        addAll(dialog.referencedRoles())
        addAll(divider.referencedRoles())
        addAll(dropZone.referencedRoles())
        addAll(embeddedTextInput.referencedRoles())
        addAll(emptyState.referencedRoles())
        addAll(fabMenu.referencedRoles())
        addAll(fieldGroup.referencedRoles())
        addAll(field.referencedRoles())
        addAll(figure.referencedRoles())
        addAll(fileItem.referencedRoles())
        addAll(filePicker.referencedRoles())
        addAll(fileUpload.referencedRoles())
        addAll(handle.referencedRoles())
        addAll(imagePreview.referencedRoles())
        addAll(inlineCode.referencedRoles())
        addAll(inputBox.referencedRoles())
        addAll(keyboardShortcut.referencedRoles())
        addAll(linkCard.referencedRoles())
        addAll(link.referencedRoles())
        addAll(listRow.referencedRoles())
        addAll(list.referencedRoles())
        addAll(loadingIndicator.referencedRoles())
        addAll(mainActionButton.referencedRoles())
        addAll(menu.referencedRoles())
        addAll(menubar.referencedRoles())
        addAll(meter.referencedRoles())
        addAll(modalLayer.referencedRoles())
        addAll(navigationBar.referencedRoles())
        addAll(navigationDrawer.referencedRoles())
        addAll(numberInput.referencedRoles())
        addAll(oneTimeCodeInput.referencedRoles())
        addAll(pageHeader.referencedRoles())
        addAll(pagination.referencedRoles())
        addAll(popover.referencedRoles())
        addAll(previousNextLinks.referencedRoles())
        addAll(progressIndicator.referencedRoles())
        addAll(prose.referencedRoles())
        addAll(radioButton.referencedRoles())
        addAll(search.referencedRoles())
        addAll(segmentedButton.referencedRoles())
        addAll(select.referencedRoles())
        addAll(sideSheet.referencedRoles())
        addAll(skeleton.referencedRoles())
        addAll(slider.referencedRoles())
        addAll(snackbar.referencedRoles())
        addAll(stepper.referencedRoles())
        addAll(steps.referencedRoles())
        addAll(swatch.referencedRoles())
        addAll(switch.referencedRoles())
        addAll(tabView.referencedRoles())
        addAll(tableOfContents.referencedRoles())
        addAll(table.referencedRoles())
        addAll(tabs.referencedRoles())
        addAll(tagGroup.referencedRoles())
        addAll(tag.referencedRoles())
        addAll(textInput.referencedRoles())
        addAll(timeline.referencedRoles())
        addAll(toolbar.referencedRoles())
        addAll(tooltip.referencedRoles())
        addAll(treeView.referencedRoles())
    }

    /**
     * Debug check: roles this system reads (plus [alsoRequired]) that one of its schemes does not define.
     * Such a role still draws — see [TanreiColors.get] — but with a fallback color.
     */
    public fun unknownRoles(alsoRequired: Set<TanreiColorRole> = emptySet()): Set<TanreiColorRole> {
        val schemes = listOf(colors.light, colors.lightMedium, colors.lightHigh, colors.dark, colors.darkMedium, colors.darkHigh)
        return (referencedRoles() + alsoRequired).filterNotTo(linkedSetOf()) { role -> schemes.all { role in it } }
    }

    /** Generated systems attach here: `TanreiSystem.Tanrei`, a preset, a product's own. */
    public companion object
}
