package io.github.chnotchy.tanrei.primitives

import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathFillType
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas

/**
 * A control's own filled shape with an outline INSIDE its edge and the fill inside the outline, never under it — a
 * checkbox's box (CHK-12), a switch's track (SWT-10) —, so a translucent fill and a translucent outline (the disabled
 * look) never stack. [fill] is the shape inset by the outline width, its corners concentric; [outline] is the band
 * between the edge and [fill]. Build it once per size (`drawWithCache`) and draw it with [drawTanreiInsetOutline].
 */
internal class TanreiInsetOutline(val fill: Path, val outline: Path)

/**
 * The [TanreiInsetOutline] of a shape of [size] with corners of [radius] px (clamped to half the shorter side) eased by
 * [smoothing] (`sys.shape.corner-smoothing` — the construction `tanreiContainerShape` draws), and an outline
 * of [outlineWidth] px.
 */
internal fun tanreiInsetOutline(size: Size, radius: Float, smoothing: Float, outlineWidth: Float): TanreiInsetOutline {
    val outerRadius = radius.coerceIn(0f, size.minDimension / 2)
    val width = outlineWidth.coerceIn(0f, size.minDimension / 2)
    val outer = roundRectPath(Rect(Offset.Zero, size), outerRadius, smoothing)
    val inner = roundRectPath(Rect(width, width, size.width - width, size.height - width), (outerRadius - width).coerceAtLeast(0f), smoothing)
    val band = Path().apply {
        addPath(outer)
        addPath(inner)
        fillType = PathFillType.EvenOdd
    }
    return TanreiInsetOutline(fill = inner, outline = band)
}

/**
 * Draws [shape]: the [fill] color inside the outline, the [outline] color on the band. A color that draws nothing is
 * skipped. Where both are drawn, the band is ADDED to the fill in a layer of its own: along the inner edge the two
 * anti-aliased coverages are complementary, so they sum to one pixel of the right mix instead of leaving a lighter
 * seam between a fill and an outline of the same color (visible at a box's corners).
 */
internal fun DrawScope.drawTanreiInsetOutline(shape: TanreiInsetOutline, fill: Color, outline: Color) {
    when {
        fill.isDrawn && outline.isDrawn -> drawIntoCanvas { canvas ->
            canvas.saveLayer(Rect(Offset.Zero, size), Paint())
            drawPath(shape.fill, fill)
            drawPath(shape.outline, outline, blendMode = BlendMode.Plus)
            canvas.restore()
        }
        fill.isDrawn -> drawPath(shape.fill, fill)
        outline.isDrawn -> drawPath(shape.outline, outline)
    }
}

private fun roundRectPath(rect: Rect, radius: Float, smoothing: Float): Path =
    if (smoothing <= 0f || radius <= 0f) Path().apply { addRoundRect(RoundRect(rect, CornerRadius(radius))) } else smoothedRoundRectPath(rect, radius, smoothing)
