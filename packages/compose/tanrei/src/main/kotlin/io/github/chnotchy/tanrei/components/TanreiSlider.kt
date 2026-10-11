package io.github.chnotchy.tanrei.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.rememberTransition
import androidx.compose.foundation.focusable
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.interaction.HoverInteraction
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.PressInteraction
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.ProvidableCompositionLocal
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.geometry.translate as movedBy
import androidx.compose.ui.graphics.ClipOp
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.addOutline
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.drawOutline
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.pointer.PointerEventType
import androidx.compose.ui.input.pointer.PointerType
import androidx.compose.ui.input.pointer.changedToUp
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChange
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.LayoutCoordinates
import androidx.compose.ui.layout.boundsInWindow
import androidx.compose.ui.layout.findRootCoordinates
import androidx.compose.ui.layout.layout
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.disabled
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.setProgress
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.intl.Locale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntRect
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.max
import androidx.compose.ui.unit.min
import androidx.compose.ui.window.Popup
import androidx.compose.ui.window.PopupPositionProvider
import androidx.compose.ui.window.PopupProperties
import io.github.chnotchy.tanrei.primitives.TanreiInteraction
import io.github.chnotchy.tanrei.primitives.TanreiReportInvalidValue
import io.github.chnotchy.tanrei.primitives.TanreiReportMissingName
import io.github.chnotchy.tanrei.primitives.TanreiReportUnknownValue
import io.github.chnotchy.tanrei.primitives.TanreiStateMotion
import io.github.chnotchy.tanrei.primitives.TanreiText
import io.github.chnotchy.tanrei.primitives.animateTanreiColorAsState
import io.github.chnotchy.tanrei.primitives.animateTanreiElevation
import io.github.chnotchy.tanrei.primitives.collectTanreiInteraction
import io.github.chnotchy.tanrei.primitives.drawnStates
import io.github.chnotchy.tanrei.primitives.isDrawn
import io.github.chnotchy.tanrei.primitives.rememberTanreiRipple
import io.github.chnotchy.tanrei.primitives.tanreiContainer
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.primitives.tanreiDecorationOverflow
import io.github.chnotchy.tanrei.primitives.tanreiDrawnStatesOf
import io.github.chnotchy.tanrei.primitives.tanreiElevation
import io.github.chnotchy.tanrei.primitives.tanreiFocusRing
import io.github.chnotchy.tanrei.primitives.tanreiGroupOpacity
import io.github.chnotchy.tanrei.primitives.tanreiSideCornerShape
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiTextStyle
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.tanreiTween
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiSliderSize
import io.github.chnotchy.tanrei.tokens.TanreiSliderTokens
import java.text.NumberFormat
import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.roundToInt

/*
 * `specs/slider.spec.json` (SLD-1…23) on Compose, as `platforms.compose` maps it — the idiom of foundation's `Slider` and
 * `RangeSlider`: `TanreiSlider(value: Float, onValueChange, contentDescription, modifier, enabled, valueRange, step, …)`
 * and the range overload whose `value` is a `ClosedFloatingPointRange<Float>` (the spec's `startValue` to `value`) and
 * which also takes `startContentDescription` and `startStateDescription`. `step` is a size, not Material's count of
 * `steps`. State hoisting: the caller moves `value` from `onValueChange` (the spec's `input`); `onValueChangeFinished`
 * is its `change`, and carries the value. Each handle has Compose's slider semantics (`progressBarRangeInfo` and
 * `setProgress`), its `stateDescription` the value text.
 */

/**
 * The spec's `valueIndicator`: whether a handle shows its value beside it — [None] never, [Active] while it is pressed
 * or has keyboard focus, [Always] all the time. A closed set: every value the spec defines is here, so no unknown one can
 * be passed (SLD-23).
 */
public enum class TanreiSliderValueIndicator { None, Active, Always }

/**
 * A value chosen along a track: continuous, or in steps of [step] with optional dots ([showStops]), from an [origin]
 * (the start, or the middle of a centred slider), horizontal or vertical. Implements `specs/slider.spec.json`; every value
 * it reads is `TanreiTheme.tokens.slider` ([TanreiSliderTokens]), each handle drawn from ITS state's tokens.
 *
 * @param value the handle's value; drawn clamped to [valueRange] and snapped to [step], reported in debuggable apps when
 *   it is not (SLD-22). Setting it emits nothing (SLD-16).
 * @param onValueChange the spec's `input`: every value the person moves the handle to (a drag, a key, an assistive
 *   technology adjustment) — move [value] from it.
 * @param contentDescription the spec's `label`: names the slider for assistive technology; never drawn. Required: an
 *   empty one still renders, and a debuggable app reports it (SLD-19).
 * @param modifier applied to the whole slider, whose hit area is at least `sys.target.touch` across its axis (SLD-7).
 * @param enabled the Compose idiom for the spec's `disabled` (inverse): false takes no input, leaves the focus order and
 *   draws the disabled tokens (SLD-20).
 * @param valueRange the spec's `min` and `max`. A range whose end is not above its start draws the handle at the track's
 *   start and takes no input, reported in debuggable apps (SLD-22).
 * @param step 0 is continuous; above 0 the values are the range's start plus whole multiples of [step] (a size, not a
 *   count). Below 0 is treated as 0 and reported (SLD-22).
 * @param origin where the active track starts: null is the range's start; a value inside the range makes a centred
 *   slider whose active track grows toward either side (SLD-6).
 * @param showStops the spec's `stops`: a dot at every value a discrete slider can take (SLD-9).
 * @param size a key of `tokens.slider.sizes` — the track's weight: [TanreiSliderSize.Small] (default), medium, large.
 *   Open: a design system may add values; one it does not have draws with small's tokens and is reported
 *   (SLD-23).
 * @param orientation foundation's [Orientation]: [Orientation.Horizontal] from the start edge (min) to the end edge,
 *   [Orientation.Vertical] from the bottom (min) to the top (SLD-21).
 * @param valueIndicator whether the handle shows its value above it (SLD-17).
 * @param stateDescription the spec's `valueText`: the value as words ("40 %"), read and shown in place of the number
 *   (SLD-18).
 * @param onValueChangeFinished the spec's `change`: the person finished changing the value — the press ended with another
 *   value than it started with, or a key or assistive technology changed it — always after the input it follows.
 * @param interactionSource the handle's: hover, focus and press.
 */
@Composable
public fun TanreiSlider(
    value: Float,
    onValueChange: (Float) -> Unit,
    contentDescription: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    valueRange: ClosedFloatingPointRange<Float> = 0f..100f,
    step: Float = 0f,
    origin: Float? = null,
    showStops: Boolean = false,
    size: TanreiSliderSize = TanreiSliderSize.Small,
    orientation: Orientation = Orientation.Horizontal,
    valueIndicator: TanreiSliderValueIndicator = TanreiSliderValueIndicator.None,
    stateDescription: String = "",
    onValueChangeFinished: ((Float) -> Unit)? = null,
    interactionSource: MutableInteractionSource? = null,
) {
    val change by rememberUpdatedState(onValueChange)
    val finished by rememberUpdatedState(onValueChangeFinished)
    TanreiSliderCore(
        values = listOf(value),
        onInput = { change(it[0]) },
        onChange = { values -> finished?.invoke(values[0]) },
        names = listOf(contentDescription),
        nameProps = listOf("contentDescription"),
        valueTexts = listOf(stateDescription),
        modifier = modifier,
        enabled = enabled,
        valueRange = valueRange,
        step = step,
        origin = origin,
        showStops = showStops,
        size = size,
        orientation = orientation,
        valueIndicator = valueIndicator,
        sources = listOf(interactionSource),
    )
}

/**
 * A range chosen along a track (a price filter): two handles, [value]'s start and end, which may meet but never cross
 * (SLD-5); each is its own Tab stop — the start first — and its own slider for assistive technology, its bounds the other
 * handle's value. Everything else is the single slider's; there is no origin (the active track runs between the handles).
 *
 * @param value the spec's `startValue` to `value`. A start above the end draws both handles at the end, reported in
 *   debuggable apps (SLD-22).
 * @param onValueChange the spec's `input`, with both values.
 * @param contentDescription the spec's `label`: names the END handle ("Maximum price").
 * @param startContentDescription the spec's `startLabel`: names the start handle ("Minimum price"). Required too.
 * @param stateDescription the end handle's value text; [startStateDescription] the start handle's.
 * @param onValueChangeFinished the spec's `change`, with both values.
 * @param startInteractionSource the start handle's; [interactionSource] the end handle's.
 */
@Composable
public fun TanreiSlider(
    value: ClosedFloatingPointRange<Float>,
    onValueChange: (ClosedFloatingPointRange<Float>) -> Unit,
    contentDescription: String,
    startContentDescription: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    valueRange: ClosedFloatingPointRange<Float> = 0f..100f,
    step: Float = 0f,
    showStops: Boolean = false,
    size: TanreiSliderSize = TanreiSliderSize.Small,
    orientation: Orientation = Orientation.Horizontal,
    valueIndicator: TanreiSliderValueIndicator = TanreiSliderValueIndicator.None,
    stateDescription: String = "",
    startStateDescription: String = "",
    onValueChangeFinished: ((ClosedFloatingPointRange<Float>) -> Unit)? = null,
    startInteractionSource: MutableInteractionSource? = null,
    interactionSource: MutableInteractionSource? = null,
) {
    val change by rememberUpdatedState(onValueChange)
    val finished by rememberUpdatedState(onValueChangeFinished)
    TanreiSliderCore(
        values = listOf(value.start, value.endInclusive),
        onInput = { change(it[0]..it[1]) },
        onChange = { values -> finished?.invoke(values[0]..values[1]) },
        names = listOf(startContentDescription, contentDescription),
        nameProps = listOf("startContentDescription", "contentDescription"),
        valueTexts = listOf(startStateDescription, stateDescription),
        modifier = modifier,
        enabled = enabled,
        valueRange = valueRange,
        step = step,
        origin = null,
        showStops = showStops,
        size = size,
        orientation = orientation,
        valueIndicator = valueIndicator,
        sources = listOf(startInteractionSource, interactionSource),
    )
}

/**
 * Tests only: the value indicator drawn in place — inside the slider's own layout, outside its bounds — instead of in a
 * popup window, so that a node capture (the baselines' stage) shows it. The popup is what an app gets.
 */
internal val LocalTanreiSliderIndicatorInPlace: ProvidableCompositionLocal<Boolean> = staticCompositionLocalOf { false }

/** SLD-1 / SLD-22: the numbers every part reads, sanitised once. */
private class TanreiSliderModel(
    val min: Float,
    val max: Float,
    /** 0: continuous. */
    val step: Float,
    /** SLD-22: max is not above min — the handles sit at the track's start and nothing takes input. */
    val degenerate: Boolean,
) {
    /** The highest value a handle can take: max, or the last whole step below it. */
    val top: Float = if (degenerate) min else if (step > 0f) min + floor((max - min) / step + EPSILON) * step else max

    /** SLD-3: one keyboard step — step, or a hundredth of the range. */
    val keyStep: Float = if (step > 0f) step else (max - min) / KEY_STEPS

    /** SLD-1: clamped between min and [top], and snapped to the nearest step. */
    fun snap(value: Float): Float {
        if (degenerate || value.isNaN()) return min
        val clamped = value.coerceIn(min, max)
        if (step <= 0f) return clamped
        return (min + ((clamped - min) / step).roundToInt() * step).coerceIn(min, top)
    }

    /** Where [value] lies along the travel, 0 at min and 1 at max. */
    fun fraction(value: Float): Float = if (degenerate) 0f else ((value - min) / (max - min)).coerceIn(0f, 1f)

    /** The value at [fraction] of the travel. */
    fun valueAt(fraction: Float): Float = min + fraction.coerceIn(0f, 1f) * (max - min)

    /** SLD-9: every value a discrete slider can take. */
    fun stops(): List<Float> = if (step <= 0f || degenerate) emptyList() else (0..floor((max - min) / step + EPSILON).toInt()).map { min + it * step }

    /** SLD-18: the value in the platform's locale, with as many fraction digits as the keyboard step has (at most two). */
    fun format(value: Float, locale: java.util.Locale): String {
        val digits = (0..MAX_FRACTION_DIGITS).firstOrNull { d -> val scaled = keyStep * POWERS[d]; abs(scaled - scaled.roundToInt()) < EPSILON } ?: MAX_FRACTION_DIGITS
        return NumberFormat.getNumberInstance(locale).apply {
            minimumFractionDigits = digits
            maximumFractionDigits = digits
        }.format(value.toDouble())
    }
}

private const val EPSILON = 1e-4f
private const val KEY_STEPS = 100f
private const val PAGE_STEPS = 10
private const val MAX_FRACTION_DIGITS = 2
private val POWERS = floatArrayOf(1f, 10f, 100f)

/** The precedence of SLD-11: pressed over focused over hovered. */
private val TanreiInteractionState.rank: Int
    get() = when (this) {
        TanreiInteractionState.Pressed -> 3
        TanreiInteractionState.Focused -> 2
        TanreiInteractionState.Hovered -> 1
        TanreiInteractionState.Enabled, TanreiInteractionState.Disabled -> 0
    }

@Composable
private fun TanreiSliderCore(
    values: List<Float>,
    onInput: (List<Float>) -> Unit,
    onChange: (List<Float>) -> Unit,
    names: List<String>,
    nameProps: List<String>,
    valueTexts: List<String>,
    modifier: Modifier,
    enabled: Boolean,
    valueRange: ClosedFloatingPointRange<Float>,
    step: Float,
    origin: Float?,
    showStops: Boolean,
    size: TanreiSliderSize,
    orientation: Orientation,
    valueIndicator: TanreiSliderValueIndicator,
    sources: List<MutableInteractionSource?>,
) {
    val system = TanreiTheme.tokens
    val tokens = system.slider
    val count = values.size
    val range = count == 2
    // SLD-23: the lookup is total — a size this design system does not have reads small's tokens.
    if (size !in tokens.sizes) TanreiReportUnknownValue(system.id, "TanreiSlider", "size", size.key)
    val metrics = tokens.sizes[size]
    // The one condition: a component without variants has one look.
    val look = tokens.conditions.standard

    // SLD-22: what is drawn is clamped, snapped and ordered; each problem reported in debuggable apps.
    val min = valueRange.start
    val max = valueRange.endInclusive
    if (step < 0f) TanreiReportInvalidValue("TanreiSlider", "step", "$step", "is below 0", "as 0 (continuous)")
    val degenerate = !(max > min)
    if (degenerate) TanreiReportInvalidValue("TanreiSlider", "valueRange", "$min..$max", "has no end above its start", "with its handles at the track's start, taking no input")
    val model = remember(min, max, step, degenerate) { TanreiSliderModel(min, max, if (step > 0f) step else 0f, degenerate) }
    val snapped = values.map(model::snap).toMutableList()
    values.forEachIndexed { i, raw ->
        if (!degenerate && raw != snapped[i]) {
            TanreiReportInvalidValue("TanreiSlider", if (range && i == 0) "startValue" else "value", "$raw", "lies outside the range or off a step", "as ${snapped[i]}")
        }
    }
    if (range && snapped[0] > snapped[1]) {
        TanreiReportInvalidValue("TanreiSlider", "startValue", "${snapped[0]}", "is above the end value ${snapped[1]}", "with both handles at the end value")
        snapped[0] = snapped[1]
    }
    val originValue = if (range || origin == null) min else model.snap(origin)
    if (!range && origin != null && !degenerate && origin != originValue) {
        TanreiReportInvalidValue("TanreiSlider", "origin", "$origin", "lies outside the range or off a step", "as $originValue")
    }
    // SLD-19: every handle needs a name.
    names.forEachIndexed { i, name -> if (name.isBlank()) TanreiReportMissingName("TanreiSlider", nameProps[i], what = "a slider handle without a label") }

    val current by rememberUpdatedState(snapped.toList())
    val input by rememberUpdatedState(onInput)
    val change by rememberUpdatedState(onChange)
    val acceptsInput = enabled && !degenerate

    // Each handle's own interaction: hover, focus and press (SLD-11).
    val handleSources = List(count) { i -> sources[i] ?: remember { MutableInteractionSource() } }
    val interactions: List<TanreiInteraction> = List(count) { i -> handleSources[i].collectTanreiInteraction(enabled) }
    val feedback = system.behavior.pressedFeedback
    // SLD-11: the tracks, stop dots and opacity from the highest-precedence state of any handle.
    val sliderState = if (!enabled) TanreiInteractionState.Disabled else interactions.map { it.state }.maxBy { it.rank }
    val sliderUnpressed = if (!enabled) TanreiInteractionState.Disabled else interactions.map { it.unpressed }.maxBy { it.rank }
    val sliderDrawn = tanreiDrawnStatesOf(sliderState, sliderUnpressed, feedback).content
    val sliderMotion = TanreiStateMotion(sliderState, tokens.motionStateDuration, tokens.motionStateEasing)
    val trackColor = animateTanreiColorAsState(look[sliderDrawn].trackColor.color, sliderMotion, label = "track")
    val activeTrackColor = animateTanreiColorAsState(look[sliderDrawn].activeTrackColor.color, sliderMotion, label = "active track")
    val stopColor = animateTanreiColorAsState(look[sliderDrawn].stopIndicatorColor.color, sliderMotion, label = "stop")
    val activeStopColor = animateTanreiColorAsState(look[sliderDrawn].activeStopIndicatorColor.color, sliderMotion, label = "active stop")
    val opacity = animateFloatAsState(tokens.opacity(sliderDrawn), sliderMotion.spec(), label = "opacity")

    // SLD-16: the handles travel to a value set by a key, assistive technology, a tap or the product over the value
    // motion; a dragged handle follows the press at once. Reduced motion: every change at once.
    val dragging = remember { mutableIntStateOf(-1) }
    val positions = List(count) { i -> remember { Animatable(model.fraction(snapped[i])) } }
    for (i in 0 until count) {
        val target = model.fraction(snapped[i])
        val follows = dragging.intValue == i
        LaunchedEffect(target, follows) {
            if (follows) positions[i].snapTo(target) else positions[i].animateTo(target, tanreiTween(tokens.motionValueDuration, tokens.motionValueEasing))
        }
    }

    val smoothing = system.shape.cornerSmoothing
    val horizontal = orientation == Orientation.Horizontal
    val direction = LocalLayoutDirection.current
    val rtl = horizontal && direction == LayoutDirection.Rtl
    val handleWidths = List(count) { i ->
        val drawn = interactions[i].drawnStates(feedback)
        animateDpAsState(look[drawn.content].handleWidth, TanreiStateMotion(interactions[i].state, tokens.motionStateDuration, tokens.motionStateEasing).spec(), label = "handle width")
    }
    val locale = Locale.current.platformLocale
    val texts = List(count) { i -> valueTexts[i].ifEmpty { model.format(snapped[i], locale) } }
    val thickness = max(tokens.containerSize, metrics.handleHeight)
    val target = system.measure.targetTouch
    val geometry = remember { TanreiSliderGeometry() }

    // SLD-2 / SLD-11: the whole slider is the hit area; a press moves the nearer handle, a fine pointer hovers it.
    val pointer = Modifier
        .pointerInput(acceptsInput, count, horizontal, rtl) {
            if (!acceptsInput) return@pointerInput
            awaitEachGesture {
                val down = awaitFirstDown(requireUnconsumed = false)
                val along = geometry.along(down.position, horizontal, rtl)
                val start = current.toMutableList()
                val pending = start.toMutableList()
                val handle = geometry.nearest(along, pending.map(model::fraction))
                val press = PressInteraction.Press(Offset.Zero) // SLD-14: the point of contact is the handle's centre.
                handleSources[handle].tryEmit(press)
                fun moveTo(position: Offset): Boolean {
                    val bounded = model.snap(model.valueAt(geometry.fractionAt(geometry.along(position, horizontal, rtl))))
                        .let { if (count == 2) (if (handle == 0) it.coerceAtMost(pending[1]) else it.coerceAtLeast(pending[0])) else it }
                    if (bounded == pending[handle]) return false
                    pending[handle] = bounded
                    input(pending.toList())
                    return true
                }
                var cancelled = false
                if (down.type == PointerType.Touch) {
                    // SLD-2: on touch, a press that travels along the track by the slop drags; one that travels across
                    // it first is a scroll's; one that did not move moves the handle when it ends.
                    val slop = viewConfiguration.touchSlop
                    var travelled = Offset.Zero
                    var decided = false
                    while (!decided) {
                        val event = awaitPointerEvent()
                        val drag = event.changes.firstOrNull { it.id == down.id }
                        if (drag == null) {
                            cancelled = true
                            break
                        }
                        if (drag.changedToUp()) {
                            moveTo(down.position)
                            decided = true
                            handleSources[handle].tryEmit(PressInteraction.Release(press))
                            if (pending != start) change(pending.toList())
                            return@awaitEachGesture
                        }
                        if (drag.isConsumed) {
                            cancelled = true
                            break
                        }
                        travelled += drag.positionChange()
                        val alongTravel = if (horizontal) travelled.x else travelled.y
                        val acrossTravel = if (horizontal) travelled.y else travelled.x
                        if (abs(alongTravel) >= slop) {
                            drag.consume()
                            dragging.intValue = handle
                            moveTo(drag.position)
                            decided = true
                        } else if (abs(acrossTravel) >= slop) {
                            cancelled = true
                            break
                        }
                    }
                } else {
                    // A mouse or a stylus: the handle moves to the press at once, and follows it while it moves.
                    down.consume()
                    moveTo(down.position)
                }
                if (cancelled) {
                    handleSources[handle].tryEmit(PressInteraction.Cancel(press))
                    return@awaitEachGesture
                }
                try {
                    while (true) {
                        val event = awaitPointerEvent()
                        val drag = event.changes.firstOrNull { it.id == down.id } ?: break
                        if (drag.changedToUp()) break
                        if (drag.positionChange() != Offset.Zero) {
                            dragging.intValue = handle
                            moveTo(drag.position)
                        }
                        drag.consume()
                    }
                } finally {
                    dragging.intValue = -1
                    handleSources[handle].tryEmit(PressInteraction.Release(press))
                    if (pending != start) change(pending.toList())
                }
            }
        }
        .pointerInput(enabled, count, horizontal, rtl) {
            if (!enabled) return@pointerInput
            // SLD-11: a fine pointer over the slider hovers the handle a press there would move.
            var hovered: Pair<Int, HoverInteraction.Enter>? = null
            fun leave() {
                hovered?.let { (i, enter) -> handleSources[i].tryEmit(HoverInteraction.Exit(enter)) }
                hovered = null
            }
            try {
                awaitPointerEventScope {
                    while (true) {
                        val event = awaitPointerEvent()
                        val change = event.changes.firstOrNull() ?: continue
                        if (change.type != PointerType.Mouse) continue
                        when (event.type) {
                            PointerEventType.Exit -> leave()
                            PointerEventType.Enter, PointerEventType.Move -> {
                                val handle = geometry.nearest(geometry.along(change.position, horizontal, rtl), current.map(model::fraction))
                                if (hovered?.first != handle) {
                                    leave()
                                    val enter = HoverInteraction.Enter()
                                    handleSources[handle].tryEmit(enter)
                                    hovered = handle to enter
                                }
                            }
                        }
                    }
                }
            } finally {
                leave()
            }
        }

    // SLD-7 / SLD-8 / SLD-9: the tracks and the stop dots, drawn along the axis and turned into place.
    val trackShape = min(metrics.trackShape, metrics.trackThickness / 2)
    val tracks = Modifier.drawBehind {
        val length = geometry.length
        if (length <= 0f) return@drawBehind
        withSliderAxis(horizontal, rtl, length) {
            drawSliderTracks(
                geometry = geometry,
                thickness = metrics.trackThickness.toPx(),
                radius = trackShape,
                smoothing = smoothing,
                fractions = positions.map { it.value },
                originFraction = if (range) null else model.fraction(originValue),
                handleWidths = handleWidths.map { it.value.toPx() },
                handleHeight = metrics.handleHeight.toPx(),
                handleShape = tokens.handleShape,
                gap = tokens.trackGap.toPx(),
                stops = if (showStops) model.stops().map(model::fraction) else emptyList(),
                stopSize = tokens.stopIndicatorSize.toPx(),
                colors = SliderColors(trackColor.value, activeTrackColor.value, stopColor.value, activeStopColor.value),
            )
        }
    }

    val overflow = max(tanreiDecorationOverflow(system, look.enabled.handleElevation), max(tokens.containerSize - metrics.handleHeight, metrics.handleHeight - tokens.containerSize) / 2)
    Layout(
        modifier = modifier
            .then(pointer)
            .tanreiGroupOpacity(overflow = overflow) { opacity.value }
            .then(tracks),
        content = {
            for (i in 0 until count) {
                val interaction = interactions[i]
                val lo = if (range && i == 1) snapped[0] else model.min
                val hi = if (range && i == 0) snapped[1] else model.top
                TanreiSliderHandle(
                    interaction = interaction,
                    source = handleSources[i],
                    tokens = tokens,
                    handleHeight = metrics.handleHeight,
                    handleWidth = handleWidths[i],
                    horizontal = horizontal,
                    enabled = enabled,
                    name = names[i],
                    text = texts[i],
                    value = snapped[i],
                    bounds = lo..hi,
                    model = model,
                    showIndicator = enabled && (valueIndicator == TanreiSliderValueIndicator.Always ||
                        (valueIndicator == TanreiSliderValueIndicator.Active && (interaction.state == TanreiInteractionState.Pressed || interaction.unpressed == TanreiInteractionState.Focused))),
                    // SLD-3 / SLD-4: a key or an assistive technology adjustment — input, then change.
                    onSet = { requested ->
                        if (!acceptsInput) return@TanreiSliderHandle false
                        val now = current.toMutableList()
                        val next = model.snap(requested).coerceIn(if (range && i == 1) now[0] else model.min, if (range && i == 0) now[1] else model.top)
                        if (next == now[i]) return@TanreiSliderHandle false
                        now[i] = next
                        input(now.toList())
                        change(now.toList())
                        true
                    },
                    increaseKey = { key -> sliderKeyDirection(key, horizontal, rtl) },
                )
            }
        },
    ) { measurables, constraints ->
        // SLD-7 / SLD-21: as long as the layout gives it along the axis; across it the larger of the container and the
        // handle, its hit area reaching the touch target without changing that.
        val along = if (horizontal) (if (constraints.hasBoundedWidth) constraints.maxWidth else constraints.minWidth) else (if (constraints.hasBoundedHeight) constraints.maxHeight else constraints.minHeight)
        val across = maxOf(thickness.roundToPx(), target.roundToPx(), if (horizontal) constraints.minHeight else constraints.minWidth)
        val containerPx = tokens.containerSize.roundToPx()
        val trackPx = metrics.trackThickness.toPx()
        geometry.update(along.toFloat(), across.toFloat(), containerPx / 2f, trackPx)
        val placeables = measurables.map { it.measure(Constraints.fixed(containerPx, containerPx)) }
        layout(if (horizontal) along else across, if (horizontal) across else along) {
            placeables.forEachIndexed { i, placeable ->
                val center = geometry.center(positions[i].value)
                val (x, y) = if (horizontal) (if (rtl) along - center else center) to across / 2f else across / 2f to along - center
                placeable.place((x - placeable.width / 2f).roundToInt(), (y - placeable.height / 2f).roundToInt())
            }
        }
    }
}

/**
 * Which way a key moves a handle (SLD-3): +1 up the range, -1 down, [PAGE_STEPS] times that for Page Up and Page Down,
 * [Int.MAX_VALUE] / [Int.MIN_VALUE] to the ends; null for any other key. Right and Left are swapped in a right-to-left
 * horizontal slider (SLD-21).
 */
private fun sliderKeyDirection(key: Key, horizontal: Boolean, rtl: Boolean): Int? = when (key) {
    Key.DirectionUp -> 1
    Key.DirectionDown -> -1
    Key.DirectionRight -> if (horizontal && rtl) -1 else 1
    Key.DirectionLeft -> if (horizontal && rtl) 1 else -1
    Key.PageUp -> PAGE_STEPS
    Key.PageDown -> -PAGE_STEPS
    Key.MoveHome -> Int.MIN_VALUE
    Key.MoveEnd -> Int.MAX_VALUE
    else -> null
}

/** Where the slider's parts lie along its axis, in pixels; written by its layout, read by its drawing and its input. */
private class TanreiSliderGeometry {
    var length = 0f
    var across = 0f

    /** SLD-7: the track, inset by half the container from each end. */
    var trackStart = 0f
    var trackEnd = 0f

    /** The handle centre's travel: half the track's thickness in from the track's ends. */
    var travelStart = 0f
    var travelEnd = 0f

    fun update(length: Float, across: Float, inset: Float, thickness: Float) {
        this.length = length
        this.across = across
        trackStart = inset
        trackEnd = (length - inset).coerceAtLeast(inset)
        travelStart = trackStart + thickness / 2f
        travelEnd = (trackEnd - thickness / 2f).coerceAtLeast(travelStart)
    }

    fun center(fraction: Float): Float = travelStart + fraction * (travelEnd - travelStart)

    fun fractionAt(along: Float): Float = if (travelEnd <= travelStart) 0f else ((along - travelStart) / (travelEnd - travelStart)).coerceIn(0f, 1f)

    /** The distance of [position] (layout coordinates) from the axis's start: the start edge, or the bottom. */
    fun along(position: Offset, horizontal: Boolean, rtl: Boolean): Float = when {
        !horizontal -> length - position.y
        rtl -> length - position.x
        else -> position.x
    }

    /**
     * The handle a press at [along] moves (SLD-2): the nearer one; where the two meet, the one that can move toward the
     * press (the end handle above them, the start handle below).
     */
    fun nearest(along: Float, fractions: List<Float>): Int {
        if (fractions.size < 2) return 0
        val start = center(fractions[0])
        val end = center(fractions[1])
        if (abs(end - start) < 0.5f) return if (along > end) 1 else 0
        return if (abs(along - start) <= abs(along - end)) 0 else 1
    }
}

private class SliderColors(val track: Color, val active: Color, val stop: Color, val activeStop: Color)

/**
 * Draws in the axis's own coordinates: x along the axis from its start (min), y across it from the top. A right-to-left
 * horizontal slider is mirrored; a vertical one is turned a quarter so that min is at the bottom (SLD-21).
 */
private inline fun DrawScope.withSliderAxis(horizontal: Boolean, rtl: Boolean, length: Float, block: DrawScope.() -> Unit) {
    when {
        horizontal && !rtl -> block()
        horizontal -> scale(-1f, 1f, pivot = Offset(size.width / 2f, size.height / 2f)) { block() }
        else -> translate(0f, length) { rotate(-90f, pivot = Offset.Zero) { block() } }
    }
}

/**
 * SLD-6, SLD-8, SLD-9: the track from end to end in its color, the active track over its part (from the origin — at the
 * travel's start, the track's own rounded start — to the value, or between a range's handles); every end rounded by
 * [radius] and eased by the corner smoothing, except where the track and the active track meet away from a handle. Under
 * each handle nothing of the tracks is drawn: its own shape is left out of them (a translucent disabled handle shows no
 * track through it, and a round handle leaves no notch), and a [gap] above 0 also cuts the tracks that far from the
 * handle's edge, their ends there rounded. Then the stop dots: at an end of the travel that lies on the track, and at every
 * step with [stops]; in the active color on the active track, none where a handle or its gap covers it.
 */
private fun DrawScope.drawSliderTracks(
    geometry: TanreiSliderGeometry,
    thickness: Float,
    radius: Dp,
    smoothing: Float,
    fractions: List<Float>,
    originFraction: Float?,
    handleWidths: List<Float>,
    handleHeight: Float,
    handleShape: Dp,
    gap: Float,
    stops: List<Float>,
    stopSize: Float,
    colors: SliderColors,
) {
    val mid = geometry.across / 2f
    val centers = fractions.map(geometry::center)
    val (activeFrom, activeTo) = if (centers.size == 2) centers[0] to centers[1] else {
        val origin = geometry.center(originFraction ?: 0f)
        minOf(origin, centers[0]) to maxOf(origin, centers[0])
    }
    // At the travel's ends the active track takes the track's rounded end with it.
    val activeStart = if (activeFrom <= geometry.travelStart + 0.5f) geometry.trackStart else activeFrom
    val activeEnd = if (activeTo >= geometry.travelEnd - 0.5f) geometry.trackEnd else activeTo
    // Where a handle or its gap covers the tracks; cut from them only when there is a gap.
    val covers = centers.mapIndexed { i, c -> (c - handleWidths[i] / 2f - gap) to (c + handleWidths[i] / 2f + gap) }
    val holes = if (gap > 0f) covers else emptyList()
    val handles = Path().apply {
        centers.forEachIndexed { i, c ->
            val w = handleWidths[i]
            val corner = minOf(handleShape.toPx(), minOf(w, handleHeight) / 2f).toDp()
            val outline = tanreiContainerShape(corner, smoothing).createOutline(Size(w, handleHeight), LayoutDirection.Ltr, this@drawSliderTracks)
            addOutline(outline.translated(Offset(c - w / 2f, mid - handleHeight / 2f)))
        }
    }

    fun pieces(from: Float, to: Float): List<Pair<Float, Float>> {
        var result = listOf(from to to)
        for ((a, b) in holes) result = result.flatMap { (s, e) -> listOfNotNull((s to minOf(e, a)).takeIf { it.second > it.first }, (maxOf(s, b) to e).takeIf { it.second > it.first }) }
        return result
    }
    fun rounded(at: Float): Boolean = at <= geometry.trackStart + 0.5f || at >= geometry.trackEnd - 0.5f || holes.any { (a, b) -> abs(at - a) < 0.5f || abs(at - b) < 0.5f }
    fun segment(from: Float, to: Float, color: Color) {
        if (!color.isDrawn || to <= from) return
        val shape: Shape = tanreiSideCornerShape(if (rounded(from)) radius else Dp.Hairline, if (rounded(to)) radius else Dp.Hairline, smoothing)
        val outline = shape.createOutline(Size(to - from, thickness), LayoutDirection.Ltr, this)
        translate(from, mid - thickness / 2f) { drawOutline(outline, color) }
    }

    // The track outside the active part, then the active part.
    clipPath(handles, ClipOp.Difference) {
        val before = if (activeStart > geometry.trackStart) pieces(geometry.trackStart, activeStart) else emptyList()
        val after = if (activeEnd < geometry.trackEnd) pieces(activeEnd, geometry.trackEnd) else emptyList()
        (before + after).forEach { (s, e) -> segment(s, e, colors.track) }
        if (activeEnd > activeStart) pieces(activeStart, activeEnd).forEach { (s, e) -> segment(s, e, colors.active) }
    }

    if (stopSize <= 0f) return
    val dots = (stops.map(geometry::center) + listOf(geometry.travelStart, geometry.travelEnd).filter { it < activeStart - 0.5f || it > activeEnd + 0.5f }).distinct()
    for (at in dots) {
        if (covers.any { (a, b) -> at > a - 0.5f && at < b + 0.5f }) continue
        val active = at >= activeStart - 0.5f && at <= activeEnd + 0.5f
        val color = if (active) colors.activeStop else colors.stop
        if (color.isDrawn) drawCircle(color, radius = stopSize / 2f, center = Offset(at, mid))
    }
}

/**
 * One handle (SLD-8, SLD-10, SLD-12 … SLD-20): its element is the round state layer (`container.size`, centred on the
 * handle and moving with it — the element the keyboard focuses and assistive technology reads as a slider), the handle
 * inside it with the focus ring around the handle, and its value indicator.
 */
@Composable
private fun TanreiSliderHandle(
    interaction: TanreiInteraction,
    source: MutableInteractionSource,
    tokens: TanreiSliderTokens,
    handleHeight: Dp,
    handleWidth: State<Dp>,
    horizontal: Boolean,
    enabled: Boolean,
    name: String,
    text: String,
    value: Float,
    bounds: ClosedFloatingPointRange<Float>,
    model: TanreiSliderModel,
    showIndicator: Boolean,
    onSet: (Float) -> Boolean,
    increaseKey: (Key) -> Int?,
) {
    val system = TanreiTheme.tokens
    val look = tokens.conditions.standard
    val feedback = system.behavior.pressedFeedback
    val drawn = interaction.drawnStates(feedback)
    val motion = TanreiStateMotion(interaction.state, tokens.motionStateDuration, tokens.motionStateEasing)
    // SLD-10 / SLD-11: the state layer from the handle's state; SLD-14: under ripple, dim and none it stays with the
    // state under the press, and the ripple grows from the handle's centre.
    val containerColor = animateTanreiColorAsState(look[drawn.container].containerColor.color, motion, label = "container")
    val handleColor = animateTanreiColorAsState(look[drawn.content].handleColor.color, motion, label = "handle")
    val elevation = animateTanreiElevation(look[drawn.content].handleElevation, motion.spec())
    val ripple = rememberTanreiRipple(
        feedback = feedback,
        interaction = interaction,
        color = look.pressed.containerColor.color,
        feedbackDurationMillis = tokens.motionFeedbackDuration,
        stateDurationMillis = tokens.motionStateDuration,
        stateEasing = tokens.motionStateEasing,
    )
    val smoothing = system.shape.cornerSmoothing
    val containerShape = remember(tokens.containerShape, smoothing) { tanreiContainerShape(tokens.containerShape, smoothing) }
    val width = handleWidth.value
    // SLD-8: the handle's corners clamped to half its smaller side.
    val handleRadius = min(tokens.handleShape, min(width, handleHeight) / 2)
    val handleShape = remember(handleRadius, smoothing) { tanreiContainerShape(handleRadius, smoothing) }
    val named = name.isNotBlank()
    val span = bounds.endInclusive - bounds.start
    // SLD-4: Android's increment and decrement move by the range over (steps + 1): steps chosen so that is one keyboard step.
    val steps = if (model.keyStep > 0f && span > 0f) ((span / model.keyStep).roundToInt() - 1).coerceAtLeast(0) else 0

    Box(
        modifier = Modifier
            // SLD-19: a slider named by its label, with its value, value text and the values it can reach; SLD-20: disabled.
            .semantics {
                if (named) contentDescription = name
                stateDescription = text
                progressBarRangeInfo = ProgressBarRangeInfo(value, bounds.start..maxOf(bounds.start, bounds.endInclusive), steps)
                if (enabled) setProgress { target -> onSet(target) } else disabled()
            }
            // SLD-3: the keys, while this handle has focus.
            .onKeyEvent { event ->
                if (event.type != KeyEventType.KeyDown || !enabled) return@onKeyEvent false
                val direction = increaseKey(event.key) ?: return@onKeyEvent false
                val next = when (direction) {
                    Int.MIN_VALUE -> bounds.start
                    Int.MAX_VALUE -> bounds.endInclusive
                    else -> value + direction * model.keyStep
                }
                onSet(next)
                true
            }
            // SLD-5 / SLD-20: each handle its own Tab stop; disabled, none.
            .focusable(enabled = enabled, interactionSource = source)
            .tanreiContainer(containerShape, containerColor = { containerColor.value }, outlineColor = Color.Transparent, outlineWidth = Dp.Hairline, ripple = ripple),
        contentAlignment = Alignment.Center,
    ) {
        // SLD-8 / SLD-12: the handle — width along the axis, height across it — raised by its elevation; the focus ring
        // around it, never animated.
        Box(
            Modifier
                .requiredSize(if (horizontal) width else handleHeight, if (horizontal) handleHeight else width)
                .tanreiFocusRing(source, cornerRadius = handleRadius)
                .tanreiElevation(elevation, handleShape)
                .drawWithCache {
                    val outline = handleShape.createOutline(size, layoutDirection, this)
                    onDrawBehind { handleColor.value.let { if (it.isDrawn) drawOutline(outline, it) } }
                },
        )
        TanreiSliderValueIndicator(visible = showIndicator, text = text, tokens = tokens, handleWidth = width, handleHeight = handleHeight, horizontal = horizontal)
    }
}

/**
 * SLD-17: the handle's value on one line, `value-indicator.offset` beyond the handle's edge — above it in a horizontal
 * slider, at its inline start in a vertical one —, centred on the handle and kept inside the window. A read overlay:
 * a popup that takes no focus and no input, hidden from assistive technology (the handle's own value text is
 * what is read), above neighbouring content and never clipped by the slider. It fades in and out over the state motion.
 *
 * A popup escapes every clip, so it is presented only while it belongs in view ([tanreiSliderIndicatorInView]): while
 * the handle is scrolled or clipped out of view, or the edge the bubble grows from lies outside the window, there is no
 * popup — on the web the scroll container clips the bubble with its handle. Scrolling is not a show or a hide: back in
 * view, the bubble is there at once, without the fade.
 */
@Composable
private fun TanreiSliderValueIndicator(visible: Boolean, text: String, tokens: TanreiSliderTokens, handleWidth: Dp, handleHeight: Dp, horizontal: Boolean) {
    val transition = remember { MutableTransitionState(visible) }
    transition.targetState = visible
    if (!transition.currentState && !transition.targetState) return
    val shown = rememberTransition(transition, label = "value indicator").animateFloat(
        transitionSpec = { tanreiTween(tokens.motionStateDuration, tokens.motionStateEasing) },
        label = "shown",
    ) { if (it) 1f else 0f }
    val density = LocalDensity.current
    val direction = LocalLayoutDirection.current
    val distance = with(density) { (handleHeight / 2 + tokens.valueIndicatorOffset).roundToPx() }
    val bubble: @Composable (Modifier) -> Unit = { placement ->
        TanreiSliderBubble(text, tokens, placement.graphicsLayer { alpha = shown.value }.clearAndSetSemantics {})
    }
    if (LocalTanreiSliderIndicatorInPlace.current) {
        // Tests: in the slider's own layout, placed from the handle's centre (this zero-size node sits there).
        bubble(
            Modifier.layout { measurable, _ ->
                val placeable = measurable.measure(Constraints())
                layout(0, 0) {
                    val at = sliderIndicatorOffset(IntSize(placeable.width, placeable.height), distance, horizontal, direction)
                    placeable.place(at)
                }
            },
        )
        return
    }
    // Where the handle is, in its window: a node of the handle's own size, centred on it as the handle is (it draws and
    // exposes nothing). Until it has been placed, and while its place is out of view, no popup exists.
    var inView by remember { mutableStateOf(false) }
    Box(
        Modifier
            .requiredSize(if (horizontal) handleWidth else handleHeight, if (horizontal) handleHeight else handleWidth)
            .onGloballyPositioned { coordinates -> inView = tanreiSliderIndicatorInView(coordinates, distance, horizontal, direction) },
    )
    if (!inView) return
    val provider = remember(distance, horizontal, direction) { TanreiSliderIndicatorPosition(distance, horizontal, direction) }
    Popup(popupPositionProvider = provider, properties = PopupProperties(focusable = false, dismissOnBackPress = false, dismissOnClickOutside = false, clippingEnabled = false)) {
        bubble(Modifier)
    }
}

/**
 * Whether the value indicator of the handle at [handle] (a node of the handle's size, centred on it) belongs in view
 * (SLD-17): some of the handle is visible in its window — not scrolled or clipped out of it — and the edge the bubble
 * grows from, [distance] from the handle's centre, lies inside the window (the root of the handle's composition). A
 * popup placed from a handle that is out of view would float over whatever is there instead, or lie wholly outside the
 * screen (a window no one sees, of which a screenshot — the Accessibility Test Framework's — has no pixels).
 */
private fun tanreiSliderIndicatorInView(handle: LayoutCoordinates, distance: Int, horizontal: Boolean, direction: LayoutDirection): Boolean {
    if (!handle.isAttached || handle.boundsInWindow().isEmpty) return false
    val window = handle.findRootCoordinates().boundsInWindow()
    val center = handle.localToWindow(Offset(handle.size.width / 2f, handle.size.height / 2f))
    return when {
        horizontal -> center.y - distance > window.top
        direction == LayoutDirection.Rtl -> center.x + distance < window.right
        else -> center.x - distance > window.left
    }
}

/** Where the bubble's top-left lies from the handle's centre (SLD-17). */
private fun sliderIndicatorOffset(bubble: IntSize, distance: Int, horizontal: Boolean, direction: LayoutDirection): IntOffset = when {
    horizontal -> IntOffset(-bubble.width / 2, -distance - bubble.height)
    direction == LayoutDirection.Rtl -> IntOffset(distance, -bubble.height / 2)
    else -> IntOffset(-distance - bubble.width, -bubble.height / 2)
}

/** The popup's place: [sliderIndicatorOffset] from the centre of the handle's element, shifted along the axis into the window. */
private class TanreiSliderIndicatorPosition(private val distance: Int, private val horizontal: Boolean, private val direction: LayoutDirection) : PopupPositionProvider {
    override fun calculatePosition(anchorBounds: IntRect, windowSize: IntSize, layoutDirection: LayoutDirection, popupContentSize: IntSize): IntOffset {
        val center = anchorBounds.center
        val at = sliderIndicatorOffset(popupContentSize, distance, horizontal, direction)
        val x = center.x + at.x
        val y = center.y + at.y
        return if (horizontal) IntOffset(x.coerceIn(0, (windowSize.width - popupContentSize.width).coerceAtLeast(0)), y)
        else IntOffset(x, y.coerceIn(0, (windowSize.height - popupContentSize.height).coerceAtLeast(0)))
    }
}

/**
 * The value indicator's container (SLD-17): the text on one line in the label style and color, centred in a container
 * at least `container.height` high, `padding-inline` either side of the text and never narrower than high, its corners
 * eased by the corner smoothing.
 */
@Composable
private fun TanreiSliderBubble(text: String, tokens: TanreiSliderTokens, modifier: Modifier) {
    val smoothing = TanreiTheme.tokens.shape.cornerSmoothing
    val shape = remember(tokens.valueIndicatorContainerShape, smoothing) { tanreiContainerShape(tokens.valueIndicatorContainerShape, smoothing) }
    val color = tokens.valueIndicatorContainerColor.color
    CompositionLocalProvider(
        LocalTanreiContentColor provides tokens.valueIndicatorLabelColor.color,
        LocalTanreiTextStyle provides tokens.valueIndicatorLabelTypescale.toTextStyle(),
    ) {
        Box(
            modifier
                .tanreiContainer(shape, containerColor = { color }, outlineColor = Color.Transparent, outlineWidth = Dp.Hairline)
                .defaultMinSize(minWidth = tokens.valueIndicatorContainerHeight, minHeight = tokens.valueIndicatorContainerHeight)
                .padding(horizontal = tokens.valueIndicatorContainerPaddingInline),
            contentAlignment = Alignment.Center,
        ) {
            TanreiText(text, style = LocalTanreiTextStyle.current.merge(textAlign = TextAlign.Center), modifier = Modifier)
        }
    }
}

/** This outline moved by [by]. */
private fun Outline.translated(by: Offset): Outline = when (this) {
    is Outline.Rectangle -> Outline.Rectangle(rect.translate(by))
    is Outline.Rounded -> Outline.Rounded(roundRect.movedBy(by))
    is Outline.Generic -> Outline.Generic(Path().apply { addPath(path, by) })
}
