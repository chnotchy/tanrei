package io.github.chnotchy.tanrei.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.ProvidableCompositionLocal
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.LineHeightStyle
import io.github.chnotchy.tanrei.tokens.TanreiFontStack
import io.github.chnotchy.tanrei.tokens.TanreiGenericFontFamily
import io.github.chnotchy.tanrei.tokens.TanreiTextStyle

/**
 * Gives the [FontFamily] the app bundles for a font stack — typically by looking at [TanreiFontStack.families],
 * the named families in the order the design system prefers them. Return `null` when the app bundles none of
 * them: the stack is then drawn with [platformFontFamily].
 */
public fun interface TanreiFontFamilies {
    public fun resolve(font: TanreiFontStack): FontFamily?

    /**
     * The icon font for ONE glyph ([TanreiIconGlyph], from [glyph]): override it to
     * build a variable icon font with the glyph's axes — `FontFamily(Font(R.font.material_symbols_rounded,
     * variationSettings = glyph.variationSettings))` —, since Compose applies variation settings per `Font`, not per
     * text style. The default is [resolve] of the glyph's family, which is all a static icon set needs (the family
     * alone tells selected from unselected). `null`: the app installed no icon font for it.
     */
    public fun resolveIcon(glyph: TanreiIconGlyph): FontFamily? = resolve(glyph.family)

    public companion object {
        /** Tanrei ships no font files: no named font is available, so every stack is drawn with its platform font. */
        public val PlatformDefault: TanreiFontFamilies = TanreiFontFamilies { null }
    }
}

/**
 * The platform font of this stack's generic class: the platform's monospace, serif or cursive face, and for
 * sans-serif the platform default (Roboto, or whatever the device's UI font is).
 */
public val TanreiFontStack.platformFontFamily: FontFamily
    get() = when (generic) {
        TanreiGenericFontFamily.SansSerif -> FontFamily.Default
        TanreiGenericFontFamily.Serif -> FontFamily.Serif
        TanreiGenericFontFamily.Monospace -> FontFamily.Monospace
        TanreiGenericFontFamily.Cursive -> FontFamily.Cursive
    }

/**
 * ONE reading of a font stack, the same on every platform: the named families first, then the platform
 * font of the stack's generic class — except that a stack which asks for the platform's own font first
 * ([TanreiFontStack.system], e.g. `cupertino`'s `-apple-system, …`) gets it, without asking [fontFamilies].
 */
public fun TanreiFontStack.toFontFamily(fontFamilies: TanreiFontFamilies): FontFamily =
    if (system) platformFontFamily else fontFamilies.resolve(this) ?: platformFontFamily

public val LocalTanreiFontFamilies: ProvidableCompositionLocal<TanreiFontFamilies> =
    staticCompositionLocalOf { TanreiFontFamilies.PlatformDefault }

private val FontWeightRange = 1..1000

/**
 * Converts a typescale token to a Compose [TextStyle]. The numeric weight is kept as-is (450 stays 450).
 * The font is [toFontFamily] of the style's stack, so code styles stay monospaced in every system whether or
 * not the app bundles the named fonts.
 */
public fun TanreiTextStyle.toTextStyle(fontFamilies: TanreiFontFamilies): TextStyle = TextStyle(
    fontFamily = font.toFontFamily(fontFamilies),
    fontSize = size,
    fontWeight = FontWeight(weight.coerceIn(FontWeightRange)),
    letterSpacing = tracking,
    lineHeight = lineHeight,
    lineHeightStyle = LineHeightStyle(
        alignment = LineHeightStyle.Alignment.Center,
        trim = LineHeightStyle.Trim.None,
    ),
)

/** Converts a typescale token using the font families registered on the nearest `TanreiTheme`. */
@Composable
@ReadOnlyComposable
public fun TanreiTextStyle.toTextStyle(): TextStyle = toTextStyle(LocalTanreiFontFamilies.current)

/**
 * This role stressed without changing its level: the same style at its weight plus the step the current
 * design system gives the role's family (`sys.typescale.emphasis.*`, read from `TanreiTheme.tokens`). There are no
 * emphasized roles: `tokens.typescale.heading1.emphasized().toTextStyle()` is how an `h1` gets heavier.
 * Outside composition, pass the system's steps: `style.emphasized(system.typescale.emphasis)`.
 */
@Composable
@ReadOnlyComposable
public fun TanreiTextStyle.emphasized(): TanreiTextStyle = emphasized(LocalTanreiSystem.current.typescale.emphasis)
