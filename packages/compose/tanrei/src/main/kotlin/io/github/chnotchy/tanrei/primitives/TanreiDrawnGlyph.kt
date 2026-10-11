package io.github.chnotchy.tanrei.primitives

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.Dp
import io.github.chnotchy.tanrei.theme.LocalTanreiFontFamilies
import io.github.chnotchy.tanrei.theme.TanreiIconGlyph
import io.github.chnotchy.tanrei.theme.toTextStyle

/** A glyph a component draws itself, and its icon font ligature. */
internal enum class TanreiDrawnGlyphKind(val ligature: String) { Check("check"), Close("close"), ChevronDown("keyboard_arrow_down") }

/**
 * A glyph a component draws itself — the filter chip's check and the remove action's close (CHP-13, CHP-14), the
 * snackbar's close button (SNK-15), the split button's chevron (SPB-14). From the icon font — the family, fill, weight and optical size of [glyph], through
 * THE icon helper — when the app has installed one (`TanreiFontFamilies.resolveIcon`); otherwise as a vector of the same
 * box, the check following the checkbox's mark geometry (`tanreiCheckPath`), stroked at [stroke] (`sys.border.thick`,
 * as the checkbox's mark is). [progress] (read in draw) draws the check in from its start, or fades the font's glyph.
 */
@Composable
internal fun TanreiDrawnGlyph(kind: TanreiDrawnGlyphKind, glyph: TanreiIconGlyph, box: Dp, color: Color, stroke: Dp, progress: () -> Float) {
    val fontFamilies = LocalTanreiFontFamilies.current
    val installed = remember(glyph, fontFamilies) { !glyph.family.system && fontFamilies.resolveIcon(glyph) != null }
    if (installed) {
        val style: TextStyle = glyph.toTextStyle(box)
        Box(Modifier.fillMaxSize().graphicsLayer { alpha = progress().coerceIn(0f, 1f) }, contentAlignment = Alignment.Center) {
            TanreiText(kind.ligature, color = color, style = style)
        }
    } else {
        Canvas(Modifier.fillMaxSize()) {
            if (!color.isDrawn) return@Canvas
            val width = stroke.toPx()
            when (kind) {
                TanreiDrawnGlyphKind.Check -> {
                    val shown = progress()
                    if (shown > 0f) drawPath(tanreiCheckPath(size, shown), color, style = Stroke(width = width, cap = StrokeCap.Square, join = StrokeJoin.Miter))
                }
                TanreiDrawnGlyphKind.Close -> drawPath(tanreiCrossPath(size), color, style = Stroke(width = width, cap = StrokeCap.Square))
                TanreiDrawnGlyphKind.ChevronDown -> drawPath(tanreiChevronDownPath(size), color, style = Stroke(width = width, cap = StrokeCap.Square, join = StrokeJoin.Miter))
            }
        }
    }
}
