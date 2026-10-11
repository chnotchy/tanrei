package io.github.chnotchy.tanrei.theme

import android.app.UiModeManager
import android.content.Context
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ProvidableCompositionLocal
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.compositionLocalWithComputedDefaultOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import io.github.chnotchy.tanrei.primitives.isTanreiDebuggable
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiColorSchemes
import io.github.chnotchy.tanrei.tokens.TanreiColors
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiSystem

/** Which brightness the theme resolves to. [System] follows `isSystemInDarkTheme()`. */
public enum class TanreiThemeMode { System, Light, Dark }

/** Contrast level of the color scheme. */
public enum class TanreiContrast {
    Standard,
    Medium,
    High;

    public companion object {
        // Platform facts, not design values: Android reports contrast on a -1..1 axis where the
        // system settings expose 0 (standard), 0.5 (medium) and 1 (high). Split at the midpoints.
        private const val MEDIUM_FROM = 0.25f
        private const val HIGH_FROM = 0.75f

        /** Maps `UiModeManager.getContrast()` (API 34+) to a Tanrei contrast level. */
        public fun fromSystemContrast(contrast: Float): TanreiContrast = when {
            contrast >= HIGH_FROM -> High
            contrast >= MEDIUM_FROM -> Medium
            else -> Standard
        }
    }
}

/** The contrast the user chose in system settings (Android 14+); [TanreiContrast.Standard] elsewhere. */
@Composable
public fun systemTanreiContrast(): TanreiContrast {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return TanreiContrast.Standard
    val context = LocalContext.current
    val configuration = LocalConfiguration.current
    return remember(context, configuration) {
        val manager = context.getSystemService(Context.UI_MODE_SERVICE) as? UiModeManager
        TanreiContrast.fromSystemContrast(manager?.contrast ?: 0f)
    }
}

/** Picks this system's scheme for one theme × contrast pair. */
public fun TanreiColorSchemes.select(dark: Boolean, contrast: TanreiContrast = TanreiContrast.Standard): TanreiColors = when (contrast) {
    TanreiContrast.Standard -> if (dark) this.dark else light
    TanreiContrast.Medium -> if (dark) darkMedium else lightMedium
    TanreiContrast.High -> if (dark) darkHigh else lightHigh
}

/**
 * The design system every component and primitive reads its tokens from. Outside a [TanreiTheme] it is
 * the default system, so a component never renders without tokens.
 */
public val LocalTanreiSystem: ProvidableCompositionLocal<TanreiSystem> =
    staticCompositionLocalOf { TanreiSystem.Tanrei }

/** The current scheme. Outside a [TanreiTheme] it is the light scheme of the current system. */
public val LocalTanreiColors: ProvidableCompositionLocal<TanreiColors> =
    compositionLocalWithComputedDefaultOf { LocalTanreiSystem.currentValue.colors.light }

/** Roles the primitives read directly; part of the debug check for roles a system does not define. */
private val PrimitiveRoles = setOf(TanreiColorRole.OnSurface, TanreiColorRole.FocusRing, TanreiColorRole.FocusRingInner)

/**
 * Provides Tanrei tokens to [content].
 *
 * @param system the design system: the default [Tanrei][TanreiSystem.Companion.Tanrei], a preset, or the
 *   one a product generated for itself. Components draw every value, in every state, from it.
 * @param theme brightness; defaults to the system setting.
 * @param contrast contrast level; defaults to the system setting where detectable (Android 14+).
 * @param fontFamilies gives the fonts the app bundles for the families a font stack names. Tanrei ships no
 *   font files, so the default draws every stack with the platform font of its generic class.
 */
@Composable
public fun TanreiTheme(
    system: TanreiSystem = TanreiSystem.Tanrei,
    theme: TanreiThemeMode = TanreiThemeMode.System,
    contrast: TanreiContrast = systemTanreiContrast(),
    fontFamilies: TanreiFontFamilies = TanreiFontFamilies.PlatformDefault,
    content: @Composable () -> Unit,
) {
    val dark = when (theme) {
        TanreiThemeMode.System -> isSystemInDarkTheme()
        TanreiThemeMode.Light -> false
        TanreiThemeMode.Dark -> true
    }
    if (isTanreiDebuggable()) {
        // Debug builds only: a role the system reads but never defines would silently draw a fallback color.
        remember(system) {
            val unknown = system.unknownRoles(alsoRequired = PrimitiveRoles)
            check(unknown.isEmpty()) { "Design system \"${system.id}\" reads color roles none of its schemes define: $unknown" }
        }
    }
    val colors = system.colors.select(dark, contrast)
    CompositionLocalProvider(
        LocalTanreiSystem provides system,
        LocalTanreiColors provides colors,
        LocalTanreiFontFamilies provides fontFamilies,
        LocalTanreiContentColor provides colors[TanreiColorRole.OnSurface],
        LocalTanreiTextStyle provides system.typescale.body.toTextStyle(fontFamilies),
        content = content,
    )
}

/** Accessors for the values provided by the nearest [TanreiTheme]. */
public object TanreiTheme {
    /** The current design system: every token, of every tier. */
    public val tokens: TanreiSystem
        @Composable
        @ReadOnlyComposable
        get() = LocalTanreiSystem.current

    /** The current scheme of [tokens]. */
    public val colors: TanreiColors
        @Composable
        @ReadOnlyComposable
        get() = LocalTanreiColors.current
}

/** The color this role resolves to in the current scheme. */
public val TanreiColorRole.color: Color
    @Composable
    @ReadOnlyComposable
    get() = LocalTanreiColors.current[this]

/** This paint evaluated against the current scheme. [TanreiPaint.None] is [Color.Transparent]. */
public val TanreiPaint.color: Color
    @Composable
    @ReadOnlyComposable
    get() = resolve(LocalTanreiColors.current)
