package io.github.chnotchy.tanrei.primitives

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.AnimationSpec
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.center
import androidx.compose.ui.geometry.isSpecified
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.layout.LayoutCoordinates
import androidx.compose.ui.layout.onPlaced
import io.github.chnotchy.tanrei.theme.tanreiTween
import io.github.chnotchy.tanrei.tokens.TanreiCubicBezier
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiPressedFeedback
import kotlin.math.hypot

/**
 * The ripple of `pressed-feedback: ripple` (Button's BTN-9, and every pressable component after it): [color]
 * — the component's PRESSED container color, so Tanrei's tokens and not a Material theme decide it — inside a circle
 * that grows from the point of contact to the farthest corner, clipped to the container's shape, and fades once the
 * press (and its hold) has ended. Enter / Space have no point of contact ([TanreiPress.origin] is unspecified), so a
 * keyboard ripple grows from the center.
 *
 * Get one from [rememberTanreiRipple]; tell it where the input and the container are with [tanreiRippleInput] (right
 * after [tanreiPressInput]) and [tanreiContainer] (which also draws it). It is drawn by the component rather than
 * through Compose's `Indication`: an indication draws in the bounds of `clickable`, which are the 48dp touch target,
 * not the container.
 */
@Stable
internal class TanreiRipple {
    internal val radius = Animatable(0f)
    internal val alpha = Animatable(0f)
    internal var color: Color = Color.Transparent
    internal var origin: Offset = Offset.Unspecified

    /**
     * A selection control's rule (CHK-10, RAD-12, SWT-8): a press OUTSIDE the container — on the label, which is part of
     * the hit area — grows from the container's center, as a keyboard activation does. Button and icon button keep
     * the point of contact wherever it is.
     */
    internal var centerOutsideContainer: Boolean = false

    /** Coordinates of the input modifier ([origin] is given in them) and of the container (the circle is drawn in them). */
    internal var input: LayoutCoordinates? = null
    internal var container: LayoutCoordinates? = null

    /** Draws the current frame of the ripple in the container's coordinates, inside [clip] (the container's outline). */
    internal fun DrawScope.draw(clip: Path, outline: Outline? = null) {
        val visible = alpha.value
        if (visible <= 0f || !color.isDrawn) return
        val from = input
        val to = container
        val contact = when {
            !origin.isSpecified -> size.center
            from != null && to != null && from.isAttached && to.isAttached -> to.localPositionOf(from, origin)
            else -> origin
        }
        val center = if (centerOutsideContainer && outline != null && !outline.containsPoint(contact)) size.center else contact
        // Far enough to cover the farthest corner when fully grown.
        val reach = maxOf(center.x, size.width - center.x).let { dx -> maxOf(center.y, size.height - center.y).let { dy -> hypot(dx, dy) } }
        clipPath(clip) { drawCircle(color = color, radius = reach * radius.value, center = center, alpha = visible) }
    }
}

/** Whether [point] lies inside this outline (a generic path answers by its bounds). */
private fun Outline.containsPoint(point: Offset): Boolean = when (this) {
    is Outline.Rectangle -> rect.contains(point)
    is Outline.Rounded -> roundRect.contains(point)
    is Outline.Generic -> path.getBounds().contains(point)
}

/**
 * The ripple of [interaction] when the system's [feedback] is [TanreiPressedFeedback.Ripple], else null (nothing to
 * draw, nothing to place). The timing is one rule on every platform and every component:
 * - it GROWS over the component's `motion.feedback-duration` ([feedbackDurationMillis]) with its state easing;
 * - it FADES over the component's `motion.state-duration` ([stateDurationMillis]) with the same easing, once the press
 *   has ended AND `duration.press-hold` has passed ([TanreiInteraction.state] leaves pressed only then);
 * - where motion is reduced it appears whole and leaves without a fade: Android's reduced motion is the animator
 *   duration scale ("Remove animations" = 0), which Compose hands to every animation, these included.
 *
 * [color] is the pressed container color, already resolved against the current scheme.
 */
@Composable
internal fun rememberTanreiRipple(
    feedback: TanreiPressedFeedback,
    interaction: TanreiInteraction,
    color: Color,
    feedbackDurationMillis: Int,
    stateDurationMillis: Int,
    stateEasing: TanreiCubicBezier,
    centerOutsideContainer: Boolean = false,
): TanreiRipple? {
    if (feedback != TanreiPressedFeedback.Ripple) return null
    return rememberTanreiRipple(
        press = interaction.press,
        pressed = interaction.state == TanreiInteractionState.Pressed,
        color = color,
        grow = tanreiTween(feedbackDurationMillis, stateEasing),
        leave = tanreiTween(stateDurationMillis, stateEasing),
    ).also { it.centerOutsideContainer = centerOutsideContainer }
}

@Composable
private fun rememberTanreiRipple(press: TanreiPress, pressed: Boolean, color: Color, grow: AnimationSpec<Float>, leave: AnimationSpec<Float>): TanreiRipple {
    val ripple = remember { TanreiRipple() }
    ripple.color = color
    val generation = press.generation
    LaunchedEffect(generation) {
        if (generation == 0) return@LaunchedEffect
        ripple.origin = press.origin
        ripple.alpha.snapTo(1f)
        ripple.radius.snapTo(0f)
        ripple.radius.animateTo(1f, grow)
    }
    LaunchedEffect(pressed) {
        if (!pressed) ripple.alpha.animateTo(0f, leave)
    }
    return ripple
}

/**
 * Tells [ripple] the coordinates its point of contact is given in. Goes right after the input modifiers (`clickable`,
 * [tanreiPressInput]) — the same node, the same coordinates as [TanreiPress.origin]. No ripple: nothing.
 */
internal fun Modifier.tanreiRippleInput(ripple: TanreiRipple?): Modifier =
    if (ripple == null) this else onPlaced { ripple.input = it }
