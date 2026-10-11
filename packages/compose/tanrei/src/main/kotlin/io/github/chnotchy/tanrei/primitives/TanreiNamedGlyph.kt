package io.github.chnotchy.tanrei.primitives

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ProvidableCompositionLocal
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.Dp
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.LocalTanreiTextStyle
import io.github.chnotchy.tanrei.theme.TanreiIconGlyph
import io.github.chnotchy.tanrei.theme.toTextStyle

/**
 * Tests only: how a glyph given by NAME is drawn instead of the icon font's ligature. Tanrei bundles no icon font, and
 * the platform font would draw the name as text, so the baselines provide a stand-in drawing here; it reads the color
 * and the glyph from [LocalTanreiContentColor] and [LocalTanreiIconGlyph], as an icon slot's content does. Null (every
 * app): the ligature.
 */
internal val LocalTanreiGlyphStandIn: ProvidableCompositionLocal<(@Composable (String) -> Unit)?> = staticCompositionLocalOf { null }

/**
 * An icon a component draws from the NAME of its glyph (a navigation destination's `icon`, NVB-14, NVR-15, NVD-*): the
 * icon font's ligature [name] in a box of [size], drawn with [glyph] — the family, fill, weight and optical size THE
 * icon helper gives for the selection — in [color]. Decorative: the component names the element. The box clips, so an
 * app without the icon font (which then draws the NAME in the platform font) never spills text over its neighbours.
 * The same locals as an icon slot are provided, so a stand-in ([LocalTanreiGlyphStandIn]) draws like slot content.
 */
@Composable
internal fun TanreiNamedGlyph(name: String, glyph: TanreiIconGlyph, size: Dp, color: Color, modifier: Modifier = Modifier) {
    Box(modifier.size(size).clipToBounds().clearAndSetSemantics {}, contentAlignment = Alignment.Center) {
        val style = glyph.toTextStyle(size)
        CompositionLocalProvider(
            LocalTanreiContentColor provides color,
            LocalTanreiIconGlyph provides glyph,
            LocalTanreiTextStyle provides style,
        ) {
            val standIn = LocalTanreiGlyphStandIn.current
            if (standIn != null) standIn(name) else BasicText(name, style = style.merge(TextStyle(color = color)), softWrap = false, maxLines = 1)
        }
    }
}
