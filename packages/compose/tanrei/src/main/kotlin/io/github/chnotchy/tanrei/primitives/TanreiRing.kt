package io.github.chnotchy.tanrei.primitives

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.unit.Dp

/**
 * The geometry of a ring whose OUTER edge fills the draw area's square (PRG-3, LDG-1): a stroke of [thickness] centered
 * half a stroke inside the square. [block] gets the arc's bounding box (top-left and size, for `drawArc`) and the
 * stroke width in pixels. Used by every component that draws a ring or an arc of one.
 */
internal inline fun DrawScope.tanreiRing(thickness: Dp, block: DrawScope.(topLeft: Offset, diameter: Size, stroke: Float) -> Unit) {
    val stroke = thickness.toPx()
    val side = minOf(size.width, size.height) - stroke
    block(Offset((size.width - side) / 2f, (size.height - side) / 2f), Size(side, side), stroke)
}

/** A whole turn, in `drawArc`'s degrees. */
internal const val TanreiFullTurn: Float = 360f

/** `drawArc` measures angles clockwise from 3 o'clock: the top of a ring — where a turn starts — is −90°. */
internal const val TanreiRingTop: Float = -90f
