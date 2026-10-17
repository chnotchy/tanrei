package io.github.chnotchy.tanrei.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiReportInvalidValue
import io.github.chnotchy.tanrei.primitives.TanreiReportMissingName
import io.github.chnotchy.tanrei.primitives.TanreiFullTurn
import io.github.chnotchy.tanrei.primitives.TanreiReportUnknownValue
import io.github.chnotchy.tanrei.primitives.TanreiRingTop
import io.github.chnotchy.tanrei.primitives.rememberTanreiCycle
import io.github.chnotchy.tanrei.primitives.rememberTanreiVisibility
import io.github.chnotchy.tanrei.primitives.tanreiMotionReduced
import io.github.chnotchy.tanrei.primitives.tanreiPulseAlpha
import io.github.chnotchy.tanrei.primitives.tanreiRing
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.tanreiTween
import io.github.chnotchy.tanrei.theme.toEasing
import io.github.chnotchy.tanrei.tokens.TanreiProgressIndicatorSize
import io.github.chnotchy.tanrei.tokens.TanreiProgressIndicatorTokens
import kotlinx.coroutines.flow.collectLatest

/**
 * The form of a [TanreiProgressIndicator] (the spec's `variant`): a [Linear] bar that fills the width its layout gives
 * it, or a [Circular] ring of a fixed size. A closed set — a form is drawing, not values (a design system cannot add
 * one); sizes are the token axis.
 */
public enum class TanreiProgressIndicatorVariant { Linear, Circular }

/**
 * Shows how far a task has come, as a bar or a ring. Implements `specs/progress-indicator.spec.json` (PRG-1…15), with
 * every design value from the current design system's [TanreiProgressIndicatorTokens]
 * (`TanreiTheme.tokens.progressIndicator`). This overload is DETERMINATE (the spec's `value` is a number); the one
 * without [progress] is indeterminate, as Material's two overloads are.
 *
 * @param progress the spec's `value`, read within [valueRange]: a lambda, so a changing value moves the indicator
 *   without recomposing. A change eases over `motion.value-duration` with `motion.value-easing` (at once where motion
 *   is reduced, PRG-6 / PRG-7). A value outside [valueRange] is drawn and exposed clamped, and a debuggable app reports
 *   it (PRG-11).
 * @param contentDescription the spec's `label`: what is in progress ("Uploading report.pdf"). Required: a bar alone is
 *   not a name. An empty one still renders, and a debuggable app reports it (PRG-15).
 * @param variant [TanreiProgressIndicatorVariant.Linear] (default) or [TanreiProgressIndicatorVariant.Circular].
 * @param size a key of `tokens.progressIndicator.sizes`: the bar's thickness or the ring's box and stroke. Open (a design
 *   system may add sizes); a size the current design system does not have draws as medium, and a debuggable app reports it (PRG-12).
 * @param valueRange the spec's `min` and `max` (as `Slider` names them). A range whose end is not above its start draws
 *   the track alone and exposes 0 of 0…1, and a debuggable app reports it (PRG-11).
 * @param stateDescription the spec's `valueText`: how assistive technology reads the value when a percentage is not
 *   the natural reading ("3 of 10 files"). Empty: the platform's percentage.
 */
@Composable
public fun TanreiProgressIndicator(
    progress: () -> Float,
    contentDescription: String,
    modifier: Modifier = Modifier,
    variant: TanreiProgressIndicatorVariant = TanreiProgressIndicatorVariant.Linear,
    size: TanreiProgressIndicatorSize = TanreiProgressIndicatorSize.Medium,
    valueRange: ClosedFloatingPointRange<Float> = 0f..1f,
    stateDescription: String = "",
) {
    TanreiProgressIndicatorImpl(progress, contentDescription, modifier, variant, size, valueRange, stateDescription)
}

/**
 * The INDETERMINATE progress indicator (the spec's `value` is null): a bar moves a segment two fifths of the track long
 * from beyond its start to beyond its end once per `motion.cycle-duration` with `motion.cycle-easing`; a ring turns a
 * quarter arc clockwise once per cycle at constant speed (PRG-2). Where motion is reduced it does not move: the
 * indicator covers the whole track and pulses its opacity once per cycle (PRG-7). It stops while it is not on screen
 * (PRG-14). Exposed as a progress bar with no value, in the indeterminate state (PRG-9).
 *
 * @param contentDescription the spec's `label` (required; PRG-15).
 * @param variant [TanreiProgressIndicatorVariant.Linear] (default) or [TanreiProgressIndicatorVariant.Circular].
 * @param size a key of `tokens.progressIndicator.sizes` (PRG-12).
 */
@Composable
public fun TanreiProgressIndicator(
    contentDescription: String,
    modifier: Modifier = Modifier,
    variant: TanreiProgressIndicatorVariant = TanreiProgressIndicatorVariant.Linear,
    size: TanreiProgressIndicatorSize = TanreiProgressIndicatorSize.Medium,
) {
    TanreiProgressIndicatorImpl(null, contentDescription, modifier, variant, size, DefaultRange, "")
}

private val DefaultRange: ClosedFloatingPointRange<Float> = 0f..1f

@Composable
private fun TanreiProgressIndicatorImpl(
    progress: (() -> Float)?,
    contentDescription: String,
    modifier: Modifier,
    variant: TanreiProgressIndicatorVariant,
    size: TanreiProgressIndicatorSize,
    valueRange: ClosedFloatingPointRange<Float>,
    stateDescription: String,
) {
    val system = TanreiTheme.tokens
    val tokens = system.progressIndicator
    // PRG-12: the lookup is total — a size this design system does not have reads medium's tokens. The variant is a
    // closed enum: a form the component does not define cannot be passed on this platform.
    val metrics = tokens.sizes[size]
    if (size !in tokens.sizes) TanreiReportUnknownValue(system.id, "TanreiProgressIndicator", "size", size.key)
    // PRG-15: still rendered; reported in debuggable apps.
    val named = contentDescription.isNotBlank()
    if (!named) TanreiReportMissingName("TanreiProgressIndicator", "contentDescription", what = "a progress indicator alone")
    // PRG-11: a range that is not a range draws the track alone and is exposed as 0 of 0…1.
    val degenerate = valueRange.endInclusive <= valueRange.start
    if (progress != null && degenerate) {
        TanreiReportInvalidValue("TanreiProgressIndicator", "valueRange", valueRange.toString(), "does not end above its start", "as an empty track")
    }

    val trackColor = tokens.trackColor.color
    val indicatorColor = tokens.indicatorColor.color
    val reduced = tanreiMotionReduced()
    val visibility = rememberTanreiVisibility()

    // PRG-1 / PRG-6: the fraction drawn, eased to each new value; PRG-11: clamped (and reported) first.
    val latest = rememberUpdatedState(progress)
    val range = rememberUpdatedState(valueRange)
    fun fraction(): Float {
        val read = latest.value ?: return 0f
        return tanreiProgressFraction(read(), range.value, report = true)
    }
    val fraction = remember { Animatable(if (progress != null) fraction() else 0f) }
    if (progress != null) {
        val valueSpec = tanreiTween<Float>(tokens.motionValueDuration, tokens.motionValueEasing)
        LaunchedEffect(fraction) {
            // The lambda is read here and in the draw phase only: a new value animates without recomposing.
            snapshotFlow { fraction() }.collectLatest { target -> fraction.animateTo(target, valueSpec) }
        }
    }
    // PRG-2 / PRG-7 / PRG-14: the loop runs while indeterminate and on screen.
    val cycle = rememberTanreiCycle(tokens.motionCycleDuration, running = progress == null && visibility.visible)

    // PRG-8 / PRG-9 / PRG-10: a progress bar named by the label; its range and clamped value, or indeterminate. Never
    // focusable (no focus modifier), never a live region: assistive technology reads the value when it reaches it.
    val semantics = Modifier.semantics(mergeDescendants = true) {
        if (named) this.contentDescription = contentDescription
        if (progress == null) {
            progressBarRangeInfo = ProgressBarRangeInfo.Indeterminate
        } else {
            val current = latest.value?.let { read -> tanreiProgressValue(read(), range.value) } ?: 0f
            progressBarRangeInfo = if (degenerate) ProgressBarRangeInfo(0f, 0f..1f) else ProgressBarRangeInfo(current, range.value)
            if (stateDescription.isNotEmpty()) this.stateDescription = stateDescription
        }
    }

    // PRG-3: a bar fills the width it is given at the size's thickness; a ring is a square of the size's box.
    val box = when (variant) {
        TanreiProgressIndicatorVariant.Linear -> Modifier.fillMaxWidth().height(metrics.linearThickness)
        TanreiProgressIndicatorVariant.Circular -> Modifier.size(metrics.circularSize)
    }
    val drawing = Modifier.drawBehind {
        val paint = TanreiProgressPaint(trackColor, indicatorColor)
        val shape = tokens.trackShape
        when {
            progress != null && variant == TanreiProgressIndicatorVariant.Linear ->
                drawLinearDeterminate(paint, fraction.value, shape, tokens.trackGap, tokens.stopIndicatorSize)
            progress != null -> drawCircularDeterminate(paint, fraction.value, metrics.circularThickness, shape, tokens.trackGap)
            reduced -> {
                // PRG-7: nothing moves — the indicator covers the whole track and pulses over the still track.
                val alpha = tanreiPulseAlpha(cycle.floatValue, tokens.motionCycleEasing.toEasing())
                if (variant == TanreiProgressIndicatorVariant.Linear) drawLinearPulse(paint, alpha, shape) else drawCircularPulse(paint, alpha, metrics.circularThickness, shape)
            }
            variant == TanreiProgressIndicatorVariant.Linear ->
                drawLinearIndeterminate(paint, tokens.motionCycleEasing.toEasing().transform(cycle.floatValue), shape)
            else -> drawCircularIndeterminate(paint, LinearEasing.transform(cycle.floatValue), metrics.circularThickness, shape)
        }
    }
    Box(modifier.then(semantics).then(visibility.modifier).then(box).then(drawing))
}

/** PRG-11: [value] clamped into [range] (0 for a range that is not one); [report] tells a debuggable app once. */
internal fun tanreiProgressValue(value: Float, range: ClosedFloatingPointRange<Float>, report: Boolean = false): Float {
    if (range.endInclusive <= range.start) return 0f
    if (report && (value < range.start || value > range.endInclusive)) {
        TanreiDiagnostics.invalidValue("TanreiProgressIndicator", "progress", value.toString(), "is outside $range", "clamped to it")
    }
    return value.coerceIn(range.start, range.endInclusive)
}

/** PRG-1: the fraction of the track done, (value − min) / (max − min), clamped (PRG-11). */
internal fun tanreiProgressFraction(value: Float, range: ClosedFloatingPointRange<Float>, report: Boolean = false): Float {
    if (range.endInclusive <= range.start) return 0f
    return (tanreiProgressValue(value, range, report) - range.start) / (range.endInclusive - range.start)
}

private class TanreiProgressPaint(val track: Color, val indicator: Color)

/** PRG-13: a bar fills from the start of the layout direction; drawn left to right, mirrored in right-to-left. */
private inline fun DrawScope.alongLayoutDirection(block: DrawScope.() -> Unit) {
    if (layoutDirection == LayoutDirection.Rtl) scale(-1f, 1f) { block() } else block()
}

/** PRG-4: the bar's ends are rounded by the track shape, clamped to half the thickness. */
private fun DrawScope.barRadius(shape: Dp): CornerRadius = CornerRadius(minOf(shape.toPx(), size.height / 2f))

/** PRG-1 / PRG-4 / PRG-5: track, gap, stop indicator and indicator of a determinate bar. */
private fun DrawScope.drawLinearDeterminate(paint: TanreiProgressPaint, fraction: Float, shape: Dp, gap: Dp, stop: Dp) = alongLayoutDirection {
    val radius = barRadius(shape)
    val end = size.width * fraction
    val gapPx = gap.toPx()
    if (gapPx > 0f && fraction > 0f && fraction < 1f) {
        // PRG-5: the rest of the track starts `gap` after the indicator's end.
        val from = end + gapPx
        if (from < size.width) drawRoundRect(paint.track, topLeft = Offset(from, 0f), size = Size(size.width - from, size.height), cornerRadius = radius)
    } else {
        drawRoundRect(paint.track, cornerRadius = radius)
    }
    // PRG-5: the stop indicator, its center half the thickness before the track's end (concentric with the rounded end);
    // 0 draws none.
    val stopPx = stop.toPx()
    if (stopPx > 0f) {
        val center = Offset(size.width - size.height / 2f, size.height / 2f)
        drawRoundRect(
            paint.indicator,
            topLeft = center - Offset(stopPx / 2f, stopPx / 2f),
            size = Size(stopPx, stopPx),
            cornerRadius = CornerRadius(minOf(shape.toPx(), stopPx / 2f)),
        )
    }
    if (end > 0f) drawRoundRect(paint.indicator, size = Size(end, size.height), cornerRadius = radius)
}

/** PRG-2: a segment two fifths of the track long, from beyond its start ([position] 0) to beyond its end (1). */
private fun DrawScope.drawLinearIndeterminate(paint: TanreiProgressPaint, position: Float, shape: Dp) = alongLayoutDirection {
    val radius = barRadius(shape)
    drawRoundRect(paint.track, cornerRadius = radius)
    val length = size.width * SEGMENT
    val start = -length + (size.width + length) * position
    val track = Path().apply { addRoundRect(RoundRect(0f, 0f, size.width, size.height, radius)) }
    clipPath(track) { drawRoundRect(paint.indicator, topLeft = Offset(start, 0f), size = Size(length, size.height), cornerRadius = radius) }
}

/** PRG-7: the whole bar in the indicator color at [alpha], over the still track. */
private fun DrawScope.drawLinearPulse(paint: TanreiProgressPaint, alpha: Float, shape: Dp) {
    val radius = barRadius(shape)
    drawRoundRect(paint.track, cornerRadius = radius)
    drawRoundRect(paint.indicator, cornerRadius = radius, alpha = alpha)
}

/** PRG-4: a ring's arcs have round caps unless the track shape is `corner.none`. */
private fun ringCap(shape: Dp): StrokeCap = if (shape.value > 0f) StrokeCap.Round else StrokeCap.Butt

/**
 * PRG-1 / PRG-4 / PRG-5: a determinate ring from the top, clockwise, in every layout direction (PRG-13). With a gap,
 * the rest of the track keeps `gap` of empty space from the indicator on both sides — on a ring both of its ends meet
 * the rest of the track; round caps reach half a stroke past an arc's end, so the arcs stop that much earlier. PRG-3:
 * the ring's outer edge fills the box ([tanreiRing]).
 */
private fun DrawScope.drawCircularDeterminate(paint: TanreiProgressPaint, fraction: Float, thickness: Dp, shape: Dp, gap: Dp) =
    tanreiRing(thickness) { topLeft, diameter, stroke ->
        val cap = ringCap(shape)
        val style = Stroke(stroke, cap = cap)
        val sweep = FULL_TURN * fraction
        val gapPx = gap.toPx()
        if (gapPx > 0f && fraction > 0f && fraction < 1f) {
            val capPx = if (cap == StrokeCap.Round) stroke else 0f
            val gapAngle = Math.toDegrees(((gapPx + capPx) / (diameter.width / 2f)).toDouble()).toFloat()
            val rest = FULL_TURN - sweep - 2 * gapAngle
            if (rest > 0f) drawArc(paint.track, TOP + sweep + gapAngle, rest, useCenter = false, topLeft = topLeft, size = diameter, style = style)
        } else {
            drawArc(paint.track, 0f, FULL_TURN, useCenter = false, topLeft = topLeft, size = diameter, style = Stroke(stroke))
        }
        if (sweep > 0f) drawArc(paint.indicator, TOP, sweep, useCenter = false, topLeft = topLeft, size = diameter, style = style)
    }

/** PRG-2: a quarter arc turning clockwise over the full track; [turn] 0–1 is one revolution from the top. */
private fun DrawScope.drawCircularIndeterminate(paint: TanreiProgressPaint, turn: Float, thickness: Dp, shape: Dp) =
    tanreiRing(thickness) { topLeft, diameter, stroke ->
        drawArc(paint.track, 0f, FULL_TURN, useCenter = false, topLeft = topLeft, size = diameter, style = Stroke(stroke))
        drawArc(paint.indicator, TOP + FULL_TURN * turn, FULL_TURN * ARC, useCenter = false, topLeft = topLeft, size = diameter, style = Stroke(stroke, cap = ringCap(shape)))
    }

/** PRG-7: the whole circle in the indicator color at [alpha], over the still track. */
private fun DrawScope.drawCircularPulse(paint: TanreiProgressPaint, alpha: Float, thickness: Dp, @Suppress("UNUSED_PARAMETER") shape: Dp) =
    tanreiRing(thickness) { topLeft, diameter, stroke ->
        drawArc(paint.track, 0f, FULL_TURN, useCenter = false, topLeft = topLeft, size = diameter, style = Stroke(stroke))
        drawArc(paint.indicator, 0f, FULL_TURN, useCenter = false, topLeft = topLeft, size = diameter, style = Stroke(stroke), alpha = alpha)
    }

/** The spec's geometry of the indeterminate forms (PRG-2): drawing, not design values. */
private const val SEGMENT = 2f / 5f
private const val ARC = 1f / 4f
private const val FULL_TURN = TanreiFullTurn
private const val TOP = TanreiRingTop
