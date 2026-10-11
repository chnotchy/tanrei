package io.github.chnotchy.tanrei.primitives

import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.unit.Dp

private const val OPAQUE = 1f
private const val INVISIBLE = 0f

/**
 * Dims everything drawn after it as ONE group, like CSS `opacity`: overlapping parts (a label on its
 * container) do not show through each other. [overflow] is how far the element draws outside its
 * bounds (focus indicator, shadows), so those are dimmed too instead of being clipped.
 *
 * [opacity] is read in the draw phase, so animating it never recomposes. Fully opaque draws directly.
 */
internal fun Modifier.tanreiGroupOpacity(overflow: Dp, opacity: () -> Float): Modifier = drawWithContent {
    val alpha = opacity()
    when {
        alpha >= OPAQUE -> drawContent()
        alpha > INVISIBLE -> drawIntoCanvas { canvas ->
            val outset = overflow.toPx()
            val bounds = Rect(-outset, -outset, size.width + outset, size.height + outset)
            canvas.saveLayer(bounds, Paint().apply { this.alpha = alpha })
            drawContent()
            canvas.restore()
        }
    }
}
