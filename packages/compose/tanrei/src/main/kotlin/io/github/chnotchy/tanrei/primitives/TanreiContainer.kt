package io.github.chnotchy.tanrei.primitives

import androidx.compose.foundation.border
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.addOutline
import androidx.compose.ui.graphics.drawOutline
import androidx.compose.ui.layout.onPlaced
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.max
import io.github.chnotchy.tanrei.tokens.TanreiShadowLayer
import io.github.chnotchy.tanrei.tokens.TanreiSystem

/**
 * A component's container, drawn from its state's tokens: the [containerColor] filling [shape], the pressed-feedback
 * [ripple] over it (clipped to the same outline; null when the system does not ripple), and — when [outlineColor] is
 * drawn at all — an outline of [outlineWidth] along the shape. Goes after [tanreiElevation] (the shadow is under the
 * container) and before size and padding (the container is the component's own size, not the touch target's).
 *
 * [containerColor] is read in the draw phase, so a color transition never recomposes. A paint that resolved to
 * transparent ([io.github.chnotchy.tanrei.tokens.TanreiPaint.None]) draws nothing; neither does an outline.
 */
internal fun Modifier.tanreiContainer(
    shape: Shape,
    containerColor: () -> Color,
    outlineColor: Color,
    outlineWidth: Dp,
    ripple: TanreiRipple? = null,
): Modifier {
    var container = if (ripple != null) onPlaced { ripple.container = it } else this
    container = container.drawWithCache {
        val outline = shape.createOutline(size, layoutDirection, this)
        val clip = if (ripple != null) Path().apply { addOutline(outline) } else null
        onDrawBehind {
            containerColor().let { if (it.isDrawn) drawOutline(outline, color = it) }
            if (ripple != null && clip != null) ripple.run { draw(clip, outline) }
        }
    }
    return if (outlineColor.isDrawn) container.border(width = outlineWidth, color = outlineColor, shape = shape) else container
}

/**
 * How far an interactive component draws outside its container: the farther of the focus indicator (of the system's
 * focus style) and the shadow of [elevation]. What [tanreiGroupOpacity] must dim instead of clipping.
 */
internal fun tanreiDecorationOverflow(system: TanreiSystem, elevation: List<TanreiShadowLayer>): Dp =
    max(focusExtent(system.measure, system.behavior.focusStyle), elevation.extent)

/** A paint that resolved to fully transparent ([io.github.chnotchy.tanrei.tokens.TanreiPaint.None]) draws nothing. */
internal val Color.isDrawn: Boolean get() = alpha > 0f
