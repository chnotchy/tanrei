package io.github.chnotchy.tanrei.primitives

import androidx.compose.animation.core.AnimationSpec
import androidx.compose.animation.core.animateValueAsState
import androidx.compose.animation.core.snap
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Color
import io.github.chnotchy.tanrei.theme.PremultipliedColor
import io.github.chnotchy.tanrei.theme.tanreiTween
import io.github.chnotchy.tanrei.tokens.TanreiCubicBezier
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState

/**
 * How a component moves INTO [state]: entering pressed applies immediately (`snap()`, the press must show on the next
 * frame); every other change takes the component's `motion.state-duration` ([durationMillis]) and
 * `motion.state-easing` ([easing]). One motion for every part of the component — colors, opacity, shape, elevation.
 */
@Immutable
internal class TanreiStateMotion(
    val state: TanreiInteractionState,
    private val durationMillis: Int,
    private val easing: TanreiCubicBezier,
) {
    /** The spec of one animated value. */
    fun <T> spec(): AnimationSpec<T> =
        if (state == TanreiInteractionState.Pressed) snap() else tanreiTween(durationMillis, easing)
}

/**
 * A state color animated like a CSS transition: in premultiplied sRGB, so fading in from a paint that draws nothing
 * keeps the target's hue instead of passing through black.
 */
@Composable
internal fun animateTanreiColorAsState(target: Color, motion: TanreiStateMotion, label: String): State<Color> =
    animateValueAsState(target, PremultipliedColor, motion.spec(), label = label)

/**
 * The motion of a selection control (checkbox, radio button, switch — spec `XXX-n` "WHEN the condition changes THE …
 * SHALL … change the … colors over motion.selection-duration with motion.selection-easing"): in the composition where
 * [condition] changed, every part moves over the component's selection duration ([durationMillis]) and easing, also
 * while pressed; in every other composition it moves as [state] says (a change of interaction state). Entering
 * pressed wins over both: a press must show on the next frame (`XXX-n` "SHALL show the pressed state without delay"),
 * also when the activation it starts lands in the same frame (a key press, a synthetic tap).
 *
 * What was seen last is kept outside the snapshot system, so noticing the change does not itself recompose: the
 * animations the changing composition starts read the selection spec, and a later change of interaction state reads
 * [state] again. Where motion is reduced both take no time (the animator duration scale, see `tanreiMotionReduced`).
 */
@Composable
internal fun rememberTanreiSelectionMotion(condition: Any, state: TanreiStateMotion, durationMillis: Int, easing: TanreiCubicBezier): TanreiStateMotion {
    val seen = remember { SeenSelection(condition, state.state) }
    val changed = seen.condition != condition
    val enteringPressed = state.state == TanreiInteractionState.Pressed && seen.state != TanreiInteractionState.Pressed
    SideEffect {
        seen.condition = condition
        seen.state = state.state
    }
    // A selection is never "entering pressed": build its motion from a state that does not snap.
    return if (changed && !enteringPressed) TanreiStateMotion(TanreiInteractionState.Enabled, durationMillis, easing) else state
}

/** Not a snapshot state on purpose (see [rememberTanreiSelectionMotion]). */
private class SeenSelection(var condition: Any, var state: TanreiInteractionState)
