package io.github.chnotchy.tanrei.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.ProvidableCompositionLocal
import androidx.compose.runtime.compositionLocalWithComputedDefaultOf
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.LineHeightStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import io.github.chnotchy.tanrei.tokens.TanreiFontStack
import io.github.chnotchy.tanrei.tokens.TanreiIconStyle

/** Material Symbols' `GRAD` axis: Tanrei never emboldens by grade. */
private const val Grade = 0

/**
 * How ONE glyph is drawn: everything [TanreiIconStyle.glyph] decides for a selection state and an icon size.
 * Build the app's bundled icon font with it:
 * `Font(R.font.material_symbols_rounded, variationSettings = glyph.variationSettings)`.
 */
@Immutable
public data class TanreiIconGlyph(
    /** The icon font of this selection state. A static icon set names another family for "selected". */
    public val family: TanreiFontStack,
    /** `FILL` axis. */
    public val fill: Float,
    /** `wght` axis. */
    public val weight: Int,
    /**
     * `opsz` axis: the icon box in dp, clamped to the range the system's icon font is drawn for
     * ([TanreiIconStyle.opticalSizeMin]–[TanreiIconStyle.opticalSizeMax], `sys.icon.optical-size.*`).
     */
    public val opticalSize: Float,
    /** `GRAD` axis: always 0. */
    public val grade: Int,
) {
    /**
     * The variable-font axes. A static icon font has none of them and ignores the settings — there the selection
     * state is carried by [family] alone. Android applies variation settings from API 26; older versions draw the
     * font's default instance.
     */
    public val variationSettings: FontVariation.Settings
        get() = FontVariation.Settings(
            FontVariation.Setting("FILL", fill),
            FontVariation.weight(weight),
            FontVariation.Setting("opsz", opticalSize),
            FontVariation.grade(grade),
        )
}

/**
 * THE icon helper: how this system draws an icon of box [size] whose subject is [selected] or not — the family of
 * that state ([TanreiIconStyle.family]), `FILL` = [TanreiIconStyle.fill], `wght` = [TanreiIconStyle.weight],
 * `opsz` = [size] in dp clamped to the font's range ([TanreiIconStyle.opticalSizeMin]–[TanreiIconStyle.opticalSizeMax],
 * `sys.icon.optical-size.*`: a fact of the font the system names, so a token, not a literal), `GRAD` = 0. Never write one of these by hand.
 *
 * Tanrei names the icon fonts and does not bundle them; icon NAMES (ligatures, code points) belong to the product.
 */
public fun TanreiIconStyle.glyph(size: Dp, selected: Boolean): TanreiIconGlyph = TanreiIconGlyph(
    family = family(selected),
    fill = fill(selected),
    weight = weight,
    opticalSize = size.value.coerceIn(opticalSizeMin, opticalSizeMax),
    grade = Grade,
)

/** [glyph]`(size, selected).variationSettings`. */
public fun TanreiIconStyle.variationSettings(size: Dp, selected: Boolean): FontVariation.Settings = glyph(size, selected).variationSettings

/**
 * How the icon in the current slot is drawn: a component that owns an icon slot (`TanreiIconButton`) provides the
 * [glyph] of ITS icon size and selection here, next to the icon color in [LocalTanreiContentColor] — the Compose
 * counterpart of Flutter's `IconTheme`. An icon composable of the app's own reads it to build its font
 * (`Font(R.font.…, variationSettings = LocalTanreiIconGlyph.current.variationSettings)`) or to pick a drawable per
 * selection state. Outside such a slot it is the current system's unselected glyph at `measure.iconMedium`.
 */
public val LocalTanreiIconGlyph: ProvidableCompositionLocal<TanreiIconGlyph> =
    compositionLocalWithComputedDefaultOf {
        LocalTanreiSystem.currentValue.let { system -> system.icon.glyph(system.measure.iconMedium, selected = false) }
    }

private val IconWeightRange = 1..1000

/**
 * The text style that draws one glyph of the icon font as text (a ligature such as `"favorite"`, or a code point) in a
 * box of [size]: the font [TanreiFontFamilies.resolveIcon] gives for this glyph (the platform font of the family's
 * generic class when the app installed none — which then draws the NAME, not the glyph), the glyph's weight, and a
 * font size and line height equal to the box. The box is dp, not sp: an icon is not text, so a larger text size
 * never grows it. Components that own an icon slot provide it as [LocalTanreiTextStyle], so `TanreiText("favorite")`
 * in the slot is the icon.
 */
@Composable
internal fun TanreiIconGlyph.toTextStyle(size: Dp): TextStyle {
    val fontFamilies = LocalTanreiFontFamilies.current
    val glyph = this
    val fontFamily = remember(glyph, fontFamilies) {
        if (glyph.family.system) glyph.family.platformFontFamily else fontFamilies.resolveIcon(glyph) ?: glyph.family.platformFontFamily
    }
    // Dp → sp through the density's font scale, so the rendered glyph is [size] at every text size.
    val fontSize = with(LocalDensity.current) { size.toSp() }
    return TextStyle(
        fontFamily = fontFamily,
        fontSize = fontSize,
        fontWeight = FontWeight(weight.coerceIn(IconWeightRange)),
        lineHeight = fontSize,
        lineHeightStyle = LineHeightStyle(alignment = LineHeightStyle.Alignment.Center, trim = LineHeightStyle.Trim.None),
        textAlign = TextAlign.Center,
    )
}
