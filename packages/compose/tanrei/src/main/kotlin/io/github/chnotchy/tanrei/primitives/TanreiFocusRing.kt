package io.github.chnotchy.tanrei.primitives

import android.graphics.BlurMaskFilter
import androidx.compose.foundation.interaction.InteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.ClipOp
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.nativePaint
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.drawscope.inset
import androidx.compose.ui.input.InputMode
import androidx.compose.ui.platform.LocalInputModeManager
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.coerceAtLeast
import androidx.compose.ui.unit.dp
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiFocusStyle
import io.github.chnotchy.tanrei.tokens.TanreiMeasure

/** True while [interactionSource] is focused and the user is navigating with a keyboard (or D-pad). */
@Composable
internal fun InteractionSource.isTanreiKeyboardFocused(): Boolean {
    val focused by collectIsFocusedAsState()
    return focused && LocalInputModeManager.current.inputMode == InputMode.Keyboard
}

/**
 * The focus indicator, drawn over the element without changing layout, shown for keyboard focus only, and never
 * animated. The design system's `focus-style` chooses how it looks:
 *
 * - **ring** — from the control outwards: a signed `focus.offset` (negative = inside the control), an optional
 *   inner stroke (`focus.inner-width` in `focus-ring-inner`; 0 = none), then the outer stroke (`focus.outer-width`
 *   in `focus-ring`).
 * - **glow** — the same two colors as a soft halo instead of hard lines. It starts where the ring's inner stroke
 *   ends (offset + inner width from the control). Each color is the box-shadow the web draws there: the inner one
 *   spread by and blurred by the inner width, the outer one spread by inner + outer width and blurred by the outer
 *   width; nothing is painted between the control and the start of the halo.
 *
 * The corners ease by `sys.shape.corner-smoothing`, like the container's.
 *
 * [inside] draws the whole indicator inside the element instead — its outer edge on the element's edge — for an element
 * whose parent would clip what it draws outside (a list row in a scrolling list, a menu item in its surface: LST-4,
 * MNU-11).
 *
 * @param cornerRadius the container's corner radius; each stroke's radius follows its distance from
 *   the container so the corners stay concentric.
 * @param endCornerRadius the END corners' radius, when they differ from the start ones ([cornerRadius]): a joined piece
 *   of one control (a segment, a connected group's button, a split button's half — `tanreiSideCornerShape`).
 * @param inset with [inside]: how much further in the indicator is drawn — clear of an outline its parent draws over
 *   the element's edge (a segmented button's set outline, SEG-5).
 */
@Composable
internal fun Modifier.tanreiFocusRing(
    interactionSource: InteractionSource,
    cornerRadius: Dp,
    inside: Boolean = false,
    endCornerRadius: Dp = cornerRadius,
    inset: Dp = NoExtent,
): Modifier {
    if (!interactionSource.isTanreiKeyboardFocused()) return this
    val system = TanreiTheme.tokens
    val measure = system.measure
    val smoothing = system.shape.cornerSmoothing
    val style = system.behavior.focusStyle
    val glow = style == TanreiFocusStyle.Glow
    val innerColor = TanreiColorRole.FocusRingInner.color
    val outerColor = TanreiColorRole.FocusRing.color
    // Inside: the whole indicator is drawn as around a control shrunk by its extent, so its outer edge is the element's
    // own edge and its corners stay concentric with the element's.
    val extent = if (inside) focusExtent(measure, style) + inset else NoExtent
    return drawWithContent {
        drawContent()
        val shrink = extent.toPx()
        inset(shrink) {
            val offset = measure.focusOffset.toPx()
            val innerWidth = measure.focusInnerWidth.toPx()
            val outerWidth = measure.focusOuterWidth.toPx()
            val radius = (cornerRadius.toPx() - shrink).coerceAtLeast(0f)
            if (endCornerRadius != cornerRadius) {
                // A joined piece (SEG-13, BGR-2, SPB-13): its start and end corners differ, left and right by direction.
                val end = (endCornerRadius.toPx() - shrink).coerceAtLeast(0f)
                val rtl = layoutDirection == LayoutDirection.Rtl
                val corners = SideCorners(left = if (rtl) end else radius, right = if (rtl) radius else end)
                if (glow) {
                    drawFocusGlowSides(innerColor, outerColor, offset, innerWidth, outerWidth, corners, smoothing)
                } else {
                    focusStrokeSides(innerColor, from = offset, width = innerWidth, corners = corners, smoothing = smoothing)
                    focusStrokeSides(outerColor, from = offset + innerWidth, width = outerWidth, corners = corners, smoothing = smoothing)
                }
            } else if (glow) {
                drawFocusGlow(innerColor, outerColor, offset, innerWidth, outerWidth, radius, radius, smoothing)
            } else {
                focusStroke(innerColor, from = offset, width = innerWidth, cornerRadius = radius, smoothing = smoothing)
                focusStroke(outerColor, from = offset + innerWidth, width = outerWidth, cornerRadius = radius, smoothing = smoothing)
            }
        }
    }
}

/** The corner radii of a joined piece, in pixels: its two left corners and its two right corners. */
private class SideCorners(val left: Float, val right: Float)

/** The control's bounds grown by [outset] pixels on every side, each side's corners kept concentric. */
private fun DrawScope.outsetPathSides(outset: Float, corners: SideCorners, smoothing: Float): Path {
    val rect = Rect(-outset, -outset, (size.width + outset).coerceAtLeast(-outset), (size.height + outset).coerceAtLeast(-outset))
    val left = (corners.left + outset).coerceAtLeast(0f)
    val right = (corners.right + outset).coerceAtLeast(0f)
    return if (smoothing <= 0f) {
        Path().apply { addRoundRect(RoundRect(rect, topLeft = CornerRadius(left), topRight = CornerRadius(right), bottomRight = CornerRadius(right), bottomLeft = CornerRadius(left))) }
    } else {
        smoothedRoundRectPath(rect, topLeft = left, topRight = right, bottomRight = right, bottomLeft = left, smoothing = smoothing)
    }
}

/** [focusStroke] around a joined piece. */
private fun DrawScope.focusStrokeSides(color: Color, from: Float, width: Float, corners: SideCorners, smoothing: Float) {
    if (width <= 0f) return
    drawPath(outsetPathSides(from + width / 2, corners, smoothing), color = color, style = Stroke(width))
}

/** [drawFocusGlow] around a joined piece. */
private fun DrawScope.drawFocusGlowSides(innerColor: Color, outerColor: Color, offset: Float, innerWidth: Float, outerWidth: Float, corners: SideCorners, smoothing: Float) {
    val start = offset + innerWidth
    val hole = outsetPathSides(start, corners, smoothing)
    clipPath(hole, clipOp = ClipOp.Difference) {
        focusHaloSides(outerColor, from = start, spread = innerWidth + outerWidth, blur = outerWidth, corners = corners, smoothing = smoothing)
        focusHaloSides(innerColor, from = start, spread = innerWidth, blur = innerWidth, corners = corners, smoothing = smoothing)
    }
}

/** [focusHalo] around a joined piece. */
private fun DrawScope.focusHaloSides(color: Color, from: Float, spread: Float, blur: Float, corners: SideCorners, smoothing: Float) {
    if (blur <= 0f && spread <= 0f) return
    val paint = Paint().apply { this.color = color }
    val radius = cssBlurToAndroidBlurRadius(blur)
    if (radius > 0f) paint.nativePaint.maskFilter = BlurMaskFilter(radius, BlurMaskFilter.Blur.NORMAL)
    val path = outsetPathSides(from + spread, corners, smoothing)
    drawIntoCanvas { it.drawPath(path, paint) }
}

/**
 * The glow alone, for a component whose focus indicator is its own edge (a text field's focused outline or active
 * indicator, TXF-7): drawn while [visible] — focus by ANY means, not only the keyboard — and only where the
 * system's `focus-style` is glow; under ring the edge is the whole answer and nothing is drawn here. The same halo
 * [tanreiFocusRing] draws, around a container whose top corners have [topRadius] and bottom corners [bottomRadius].
 * Never animated.
 */
@Composable
internal fun Modifier.tanreiFocusGlow(visible: Boolean, topRadius: Dp, bottomRadius: Dp = topRadius): Modifier {
    val system = TanreiTheme.tokens
    if (!visible || system.behavior.focusStyle != TanreiFocusStyle.Glow) return this
    val measure = system.measure
    val smoothing = system.shape.cornerSmoothing
    val innerColor = TanreiColorRole.FocusRingInner.color
    val outerColor = TanreiColorRole.FocusRing.color
    return drawWithContent {
        drawContent()
        drawFocusGlow(innerColor, outerColor, measure.focusOffset.toPx(), measure.focusInnerWidth.toPx(), measure.focusOuterWidth.toPx(), topRadius.toPx(), bottomRadius.toPx(), smoothing)
    }
}

/** The glow of the focus indicator (see [tanreiFocusRing]) around a box with these corner radii, in pixels. */
private fun DrawScope.drawFocusGlow(innerColor: Color, outerColor: Color, offset: Float, innerWidth: Float, outerWidth: Float, topRadius: Float, bottomRadius: Float, smoothing: Float) {
    val start = offset + innerWidth
    val hole = outsetPath(start, topRadius, bottomRadius, smoothing)
    // Outside the halo's own box only, as an outer box-shadow is; the wider color first, the tighter on top.
    clipPath(hole, clipOp = ClipOp.Difference) {
        focusHalo(outerColor, from = start, spread = innerWidth + outerWidth, blur = outerWidth, topRadius = topRadius, bottomRadius = bottomRadius, smoothing = smoothing)
        focusHalo(innerColor, from = start, spread = innerWidth, blur = innerWidth, topRadius = topRadius, bottomRadius = bottomRadius, smoothing = smoothing)
    }
}

/** How far the focus indicator reaches outside the control (0 when it is drawn inside). */
internal fun focusExtent(measure: TanreiMeasure, style: TanreiFocusStyle = TanreiFocusStyle.Ring): Dp = when (style) {
    TanreiFocusStyle.Ring -> measure.focusOffset + measure.focusInnerWidth + measure.focusOuterWidth
    // offset + inner width to where the halo starts, the widest spread (inner + outer), and its blur (outer).
    TanreiFocusStyle.Glow -> measure.focusOffset + measure.focusInnerWidth * 2 + measure.focusOuterWidth * 2
}.coerceAtLeast(NoExtent)

private val NoExtent = 0.dp

/** The control's bounds grown by [outset] pixels on every side, its corners kept concentric. */
private fun DrawScope.outsetPath(outset: Float, cornerRadius: Float, smoothing: Float): Path = outsetPath(outset, cornerRadius, cornerRadius, smoothing)

/** [outsetPath] with its own radius for the top and the bottom corners. */
private fun DrawScope.outsetPath(outset: Float, topRadius: Float, bottomRadius: Float, smoothing: Float): Path {
    val rect = Rect(-outset, -outset, (size.width + outset).coerceAtLeast(-outset), (size.height + outset).coerceAtLeast(-outset))
    val top = (topRadius + outset).coerceAtLeast(0f)
    val bottom = (bottomRadius + outset).coerceAtLeast(0f)
    return if (smoothing <= 0f) {
        Path().apply { addRoundRect(RoundRect(rect, topLeft = CornerRadius(top), topRight = CornerRadius(top), bottomRight = CornerRadius(bottom), bottomLeft = CornerRadius(bottom))) }
    } else {
        smoothedRoundRectPath(rect, top, bottom, smoothing)
    }
}

/** One stroke of [width] whose inner edge is [from] away from the control's edge. No width, no stroke. */
private fun DrawScope.focusStroke(color: Color, from: Float, width: Float, cornerRadius: Float, smoothing: Float) {
    if (width <= 0f) return
    // A stroke is centered on its path: push the path out to the middle of the band.
    val outset = from + width / 2
    if (smoothing <= 0f) {
        drawRoundRect(
            color = color,
            topLeft = Offset(-outset, -outset),
            size = Size((size.width + outset * 2).coerceAtLeast(0f), (size.height + outset * 2).coerceAtLeast(0f)),
            cornerRadius = CornerRadius((cornerRadius + outset).coerceAtLeast(0f)),
            style = Stroke(width),
        )
    } else {
        drawPath(outsetPath(outset, cornerRadius, smoothing), color = color, style = Stroke(width))
    }
}

/**
 * One color of the glow: the halo's box ([from] outside the control) grown by [spread] and blurred by a CSS blur
 * radius of [blur] pixels. No spread and no blur, no halo — like a zero inner width draws no inner stroke.
 */
private fun DrawScope.focusHalo(color: Color, from: Float, spread: Float, blur: Float, topRadius: Float, bottomRadius: Float, smoothing: Float) {
    if (blur <= 0f && spread <= 0f) return
    val outset = from + spread
    val paint = Paint().apply { this.color = color }
    val radius = cssBlurToAndroidBlurRadius(blur)
    if (radius > 0f) paint.nativePaint.maskFilter = BlurMaskFilter(radius, BlurMaskFilter.Blur.NORMAL)
    val path = outsetPath(outset, topRadius, bottomRadius, smoothing)
    drawIntoCanvas { it.drawPath(path, paint) }
}
