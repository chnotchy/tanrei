package io.github.chnotchy.tanrei.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawOutline
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import io.github.chnotchy.tanrei.primitives.TanreiFullTurn
import io.github.chnotchy.tanrei.primitives.TanreiReportMissingName
import io.github.chnotchy.tanrei.primitives.TanreiReportUnknownValue
import io.github.chnotchy.tanrei.primitives.TanreiRingTop
import io.github.chnotchy.tanrei.primitives.rememberTanreiCycle
import io.github.chnotchy.tanrei.primitives.rememberTanreiVisibility
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.primitives.tanreiElevation
import io.github.chnotchy.tanrei.primitives.tanreiMotionReduced
import io.github.chnotchy.tanrei.primitives.tanreiPulseAlpha
import io.github.chnotchy.tanrei.primitives.tanreiRing
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.toEasing
import io.github.chnotchy.tanrei.tokens.TanreiLoadingIndicatorSize
import io.github.chnotchy.tanrei.tokens.TanreiLoadingIndicatorTokens

/**
 * Shows that a short wait of unknown length is under way. Implements `specs/loading-indicator.spec.json` (LDG-1…10) for
 * `contained = false`; [TanreiContainedLoadingIndicator] is `contained = true` (the Compose idiom of Material's
 * `LoadingIndicator` and `ContainedLoadingIndicator`). Every design value comes from the current design system's
 * [TanreiLoadingIndicatorTokens] (`TanreiTheme.tokens.loadingIndicator`).
 *
 * A quarter arc with round caps, no track, turning clockwise once per `motion.cycle-duration` at constant speed, in
 * `indicator.color`, inside a square of the size's `indicator.size` that is the whole component (LDG-1, LDG-2). Where
 * motion is reduced it does not turn: the whole circle pulses its opacity once per cycle (LDG-4). It stops while it is
 * not on screen (LDG-7) and is never mirrored (LDG-8).
 *
 * @param contentDescription the spec's `label`: what is loading ("Loading messages"). Required: a moving mark alone is
 *   not a name. An empty one still renders, and a debuggable app reports it (LDG-10).
 * @param size a key of `tokens.loadingIndicator.sizes` (small replaces an icon in a control, medium sits next to text,
 *   large fills an empty section). Open; a size the current design system does not have draws as medium,
 *   and a debuggable app reports it (LDG-9).
 */
@Composable
public fun TanreiLoadingIndicator(
    contentDescription: String,
    modifier: Modifier = Modifier,
    size: TanreiLoadingIndicatorSize = TanreiLoadingIndicatorSize.Medium,
) {
    TanreiLoadingIndicatorImpl(contentDescription, modifier, size, contained = false)
}

/**
 * [TanreiLoadingIndicator] on a raised container of its own, for places where it floats over content (pull to
 * refresh, over an image or a list) — the spec's `contained = true` (LDG-3): a container of the size's
 * `container.size` with corners of `container.shape`, filled with `contained.container.color` and raised by
 * `contained.container.elevation`, the arc centered in it in `contained.indicator.color`. Under reduced motion the
 * container stays still and opaque (LDG-4). Same parameters as [TanreiLoadingIndicator].
 */
@Composable
public fun TanreiContainedLoadingIndicator(
    contentDescription: String,
    modifier: Modifier = Modifier,
    size: TanreiLoadingIndicatorSize = TanreiLoadingIndicatorSize.Medium,
) {
    TanreiLoadingIndicatorImpl(contentDescription, modifier, size, contained = true)
}

@Composable
private fun TanreiLoadingIndicatorImpl(contentDescription: String, modifier: Modifier, size: TanreiLoadingIndicatorSize, contained: Boolean) {
    val system = TanreiTheme.tokens
    val tokens = system.loadingIndicator
    // LDG-9: the lookup is total — a size this design system does not have reads medium's tokens.
    val metrics = tokens.sizes[size]
    if (size !in tokens.sizes) {
        TanreiReportUnknownValue(system.id, if (contained) "TanreiContainedLoadingIndicator" else "TanreiLoadingIndicator", "size", size.key)
    }
    // LDG-10: still rendered; reported in debuggable apps.
    val named = contentDescription.isNotBlank()
    if (!named) {
        TanreiReportMissingName(if (contained) "TanreiContainedLoadingIndicator" else "TanreiLoadingIndicator", "contentDescription", what = "a loading indicator alone")
    }

    val color = (if (contained) tokens.containedIndicatorColor else tokens.indicatorColor).color
    val reduced = tanreiMotionReduced()
    val visibility = rememberTanreiVisibility()
    // LDG-1 / LDG-7: one turn per cycle, running only while on screen.
    val cycle = rememberTanreiCycle(tokens.motionCycleDuration, running = visibility.visible)
    val pulseEasing = system.motion.easing.standard.toEasing()

    // LDG-5 / LDG-6: a progress bar named by the label, in the indeterminate (busy) state, with no value. Never
    // focusable, never a live region: it does not announce itself when it appears or disappears.
    val semantics = Modifier.semantics(mergeDescendants = true) {
        if (named) this.contentDescription = contentDescription
        progressBarRangeInfo = ProgressBarRangeInfo.Indeterminate
    }
    // LDG-1 / LDG-4 / LDG-8: the arc, or the pulsing circle, in the indicator square. Never mirrored: drawn the same in
    // every layout direction.
    val indicator = Modifier.size(metrics.indicatorSize).drawBehind {
        if (reduced) {
            drawLoadingPulse(color, tanreiPulseAlpha(cycle.floatValue, pulseEasing), metrics.indicatorThickness)
        } else {
            drawLoadingArc(color, LinearEasing.transform(cycle.floatValue), metrics.indicatorThickness)
        }
    }

    if (!contained) {
        // LDG-2: exactly the indicator square, no container.
        Box(modifier.then(semantics).then(visibility.modifier).then(indicator))
    } else {
        // LDG-3: the raised container, the arc centered in it.
        val smoothing = system.shape.cornerSmoothing
        val shape = remember(tokens.containerShape, smoothing) { tanreiContainerShape(tokens.containerShape, smoothing) }
        val fill = tokens.containedContainerColor.color
        Box(
            modifier
                .then(semantics)
                .then(visibility.modifier)
                .tanreiElevation(tokens.containedContainerElevation, shape)
                .drawWithCache {
                    val outline = shape.createOutline(this.size, layoutDirection, this)
                    onDrawBehind { drawOutline(outline, fill) }
                }
                .size(metrics.containerSize),
            contentAlignment = Alignment.Center,
        ) {
            Box(indicator)
        }
    }
}

/** LDG-1: a quarter arc with round caps, [turn] 0–1 of a clockwise revolution from the top, and no track. */
private fun DrawScope.drawLoadingArc(color: Color, turn: Float, thickness: Dp) =
    tanreiRing(thickness) { topLeft, diameter, stroke ->
        drawArc(color, TanreiRingTop + TanreiFullTurn * turn, TanreiFullTurn * QUARTER, useCenter = false, topLeft = topLeft, size = diameter, style = Stroke(stroke, cap = StrokeCap.Round))
    }

/** LDG-4: the whole circle at the indicator's size and stroke, at [alpha]. */
private fun DrawScope.drawLoadingPulse(color: Color, alpha: Float, thickness: Dp) =
    tanreiRing(thickness) { topLeft, diameter, stroke ->
        drawArc(color, 0f, TanreiFullTurn, useCenter = false, topLeft = topLeft, size = diameter, style = Stroke(stroke), alpha = alpha)
    }

/** The spec's arc (LDG-1): a quarter of the circle — drawing, not a design value. */
private const val QUARTER = 1f / 4f
