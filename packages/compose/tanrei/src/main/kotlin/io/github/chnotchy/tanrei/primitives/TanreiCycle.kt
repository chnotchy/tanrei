package io.github.chnotchy.tanrei.primitives

import androidx.compose.animation.core.Easing
import androidx.compose.animation.core.withInfiniteAnimationFrameMillis
import androidx.compose.runtime.Composable
import androidx.compose.runtime.FloatState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.MotionDurationScale
import androidx.compose.ui.layout.onVisibilityChanged

/**
 * Whether motion is reduced for this composition. On Android reduced motion IS the animator duration scale: the
 * accessibility setting "Remove animations" sets it to 0, and Compose hands it to every animation as the
 * [MotionDurationScale] of the composition's effect context (a snapshot state: a change of the setting recomposes).
 * Transitions obey it by themselves; a looping animation that must CHANGE what it draws under reduced motion (a turning
 * arc that becomes a still, pulsing circle — PRG-7, LDG-4) asks here.
 */
@Composable
internal fun tanreiMotionReduced(): Boolean {
    val scope = rememberCoroutineScope()
    return (scope.coroutineContext[MotionDurationScale]?.scaleFactor ?: 1f) == 0f
}

/**
 * A looping animation's clock (PRG-2, PRG-14, LDG-1, LDG-7): the phase, from 0 up to (not including) 1, of an endless
 * cycle of [durationMillis], read in the draw phase so a turn never recomposes. It advances only while [running] — the
 * component passes whether it is visible — and resumes from where it stopped. It runs on raw frame time, not on the
 * animator duration scale: under reduced motion the component draws a slow pulse from it instead of a movement, and
 * the pulse must still run.
 *
 * Frames come through `withInfiniteAnimationFrameMillis`, so tests that wait for idle are not held up by the loop (and
 * the test clock stops it while it advances by itself); an app in the background gets no frames at all.
 */
@Composable
internal fun rememberTanreiCycle(durationMillis: Int, running: Boolean): FloatState {
    val phase = remember { mutableFloatStateOf(0f) }
    LaunchedEffect(running, durationMillis) {
        if (!running || durationMillis <= 0) return@LaunchedEffect
        val from = phase.floatValue
        var start = -1L
        while (true) {
            withInfiniteAnimationFrameMillis { now ->
                if (start < 0) start = now
                phase.floatValue = (from + (now - start).toFloat() / durationMillis) % 1f
            }
        }
    }
    return phase
}

/**
 * The reduced-motion pulse (PRG-7, LDG-4): opacity from 1 to 0 over the first half of a cycle and back to 1 over the
 * second, each half eased by [easing]. At phase 0 — where a cycle starts, and where the baselines are recorded — it is 1.
 */
internal fun tanreiPulseAlpha(phase: Float, easing: Easing): Float {
    val half = phase * 2f
    return if (half < 1f) 1f - easing.transform(half) else easing.transform(half - 1f)
}

/**
 * Whether this element is on screen (PRG-14, LDG-7): false once no part of it is visible in its window — scrolled out
 * of view, or not placed — and true again when any part is. The component stops its [rememberTanreiCycle] meanwhile.
 */
@Composable
internal fun rememberTanreiVisibility(): TanreiVisibility = remember { TanreiVisibility() }

internal class TanreiVisibility {
    var visible: Boolean by mutableStateOf(true)
        private set

    /** Goes on the element whose visibility counts. */
    val modifier: Modifier = Modifier.onVisibilityChanged(minFractionVisible = 0f) { visible = it }
}
