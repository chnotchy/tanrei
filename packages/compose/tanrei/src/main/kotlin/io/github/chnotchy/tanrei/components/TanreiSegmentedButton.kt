package io.github.chnotchy.tanrei.components

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.addOutline
import androidx.compose.ui.graphics.drawOutline
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.IntrinsicMeasurable
import androidx.compose.ui.layout.IntrinsicMeasureScope
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.LayoutIdParentData
import androidx.compose.ui.layout.Measurable
import androidx.compose.ui.layout.MeasurePolicy
import androidx.compose.ui.layout.MeasureResult
import androidx.compose.ui.layout.MeasureScope
import androidx.compose.ui.layout.layoutId
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.CollectionInfo
import androidx.compose.ui.semantics.CollectionItemInfo
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.collectionInfo
import androidx.compose.ui.semantics.collectionItemInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.isTraversalGroup
import androidx.compose.ui.semantics.selectableGroup
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.traversalIndex
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.coerceAtLeast
import androidx.compose.ui.util.lerp
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiDrawnGlyph
import io.github.chnotchy.tanrei.primitives.TanreiDrawnGlyphKind
import io.github.chnotchy.tanrei.primitives.TanreiReportMissingName
import io.github.chnotchy.tanrei.primitives.TanreiReportUnknownValue
import io.github.chnotchy.tanrei.primitives.TanreiRovingFocus
import io.github.chnotchy.tanrei.primitives.TanreiStateMotion
import io.github.chnotchy.tanrei.primitives.WithoutTanreiAnchorDescription
import io.github.chnotchy.tanrei.primitives.animateTanreiColorAsState
import io.github.chnotchy.tanrei.primitives.animateTanreiElevation
import io.github.chnotchy.tanrei.primitives.collectTanreiInteraction
import io.github.chnotchy.tanrei.primitives.drawnStates
import io.github.chnotchy.tanrei.primitives.isDrawn
import io.github.chnotchy.tanrei.primitives.isTanreiDebuggable
import io.github.chnotchy.tanrei.primitives.rememberTanreiRipple
import io.github.chnotchy.tanrei.primitives.rememberTanreiRovingEntry
import io.github.chnotchy.tanrei.primitives.rememberTanreiSelectionMotion
import io.github.chnotchy.tanrei.primitives.tanreiContainer
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.primitives.tanreiDecorationOverflow
import io.github.chnotchy.tanrei.primitives.tanreiElevation
import io.github.chnotchy.tanrei.primitives.tanreiFocusRing
import io.github.chnotchy.tanrei.primitives.tanreiGroupOpacity
import io.github.chnotchy.tanrei.primitives.tanreiPressInput
import io.github.chnotchy.tanrei.primitives.tanreiRippleInput
import io.github.chnotchy.tanrei.primitives.tanreiRovingItem
import io.github.chnotchy.tanrei.primitives.tanreiRovingKeys
import io.github.chnotchy.tanrei.primitives.tanreiSideCornerShape
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.LocalTanreiTextStyle
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.glyph
import io.github.chnotchy.tanrei.theme.tanreiTween
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiSegmentedButtonCondition
import io.github.chnotchy.tanrei.tokens.TanreiSegmentedButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiSegmentedButtonTokens
import kotlin.math.roundToInt

/*
 * `specs/segmented-button.spec.json` (SEG-1…24) on Compose, as `platforms.compose` maps it:
 * `TanreiSegmentedButton(selectionMode, selectedValue, selectedValues, onSelectionChange, size, contentDescription)
 * { TanreiSegment(value, label, icon, labelHidden, enabled) }` — Material's `SingleChoiceSegmentedButtonRow` and
 * `MultiChoiceSegmentedButtonRow` in one, selected by VALUE. The set lays the segments out at one width
 * (the widest, measured as if selected), fills itself (`set.color`), draws its outline over them and moves keyboard focus
 * among them (`TanreiRovingFocus` in its horizontal form with Up and Down as well: one Tab stop, wrapping, Home, End;
 * with single selection the arrows also select). Each `TanreiSegment` (the item kind `segment`) is its HIT box — the
 * element (`Role.RadioButton` or a toggleable `Role.Button`), as tall as the touch target and tiling the set's width, so
 * neighbours never overlap (SEG-6) — holding its VISUAL where the set says: [TanreiButton]'s chain (fill, elevation,
 * ripple, focus ring inside it, state opacity, eased corners) from the segment's condition (`unselected` / `selected`)
 * and state, the divider before it, the check or icon and the label.
 */

/**
 * The spec's `selection`: [Single] makes the segmented button a radio group (one value, never cleared by its own
 * segment), [Multiple] a group of toggle buttons (any number of values, none included). A closed set.
 */
public enum class TanreiSegmentedButtonSelectionMode { Single, Multiple }

/**
 * What the set knows of one segment: whether it is drawn selected, read by the set's placement (a selected segment is
 * placed over its neighbours, SEG-24), written by the segment; and where the segment's drawn part lies inside its hit
 * box, written by the set's layout just before it measures the segment (pixels; 0 × 0 until a set has laid it out).
 */
@Stable
private class TanreiSegmentInfo {
    var selected by mutableStateOf(false)
    var visualWidth = 0
    var visualHeight = 0
    var visualStart = 0
    var visualTop = 0
}

/** The set's own nodes: its fill (under the segments) and its outline (over them). */
private enum class TanreiSegmentedSetPart { Track, Frame }

/** What a [TanreiSegment] learns from its set; a new one whenever the set's props change. */
private class TanreiSegmentedButtonContext(
    val roving: TanreiRovingFocus,
    val mode: TanreiSegmentedButtonSelectionMode,
    val selectedValue: String?,
    val selectedValues: Set<String>,
    val size: TanreiSegmentedButtonSize,
    val onSelectionChange: (Set<String>) -> Unit,
) {
    /** Whether the segment of [entry] (value [value]) is drawn selected: the FIRST segment with a selected value (SEG-12). */
    fun isSelected(entry: TanreiRovingFocus.Entry?, value: String): Boolean {
        val chosen = when (mode) {
            TanreiSegmentedButtonSelectionMode.Single -> selectedValue != null && value == selectedValue
            TanreiSegmentedButtonSelectionMode.Multiple -> value in selectedValues
        }
        if (!chosen || entry == null) return chosen
        val ordered = roving.ordered
        if (entry !in ordered) return true
        return ordered.firstOrNull { it.value == value } === entry
    }

    /**
     * SEG-1: single — a segment that is not selected selects its value and emits it; the selected one emits nothing.
     * SEG-2: multiple — the value is added, or removed when it is held, and the new values are emitted.
     */
    fun activate(entry: TanreiRovingFocus.Entry?, value: String) {
        val selected = isSelected(entry, value)
        when (mode) {
            TanreiSegmentedButtonSelectionMode.Single -> if (!selected) onSelectionChange(setOf(value))
            TanreiSegmentedButtonSelectionMode.Multiple -> onSelectionChange(if (selected) selectedValues - value else selectedValues + value)
        }
    }
}

private val LocalTanreiSegmentedButton = compositionLocalOf<TanreiSegmentedButtonContext?> { null }

/**
 * Lets people choose one option, or several, from two to five related options drawn side by side as the joined segments
 * of one control. Implements `specs/segmented-button.spec.json`. Every design value comes from the current design
 * system's [TanreiSegmentedButtonTokens] (`TanreiTheme.tokens.segmentedButton`); each segment is drawn from its
 * condition — `conditions.selected` or `conditions.unselected` — in its interaction state. The set keeps no selection of
 * its own: the caller keeps it and moves it from [onSelectionChange] (state hoisting).
 *
 * @param onSelectionChange the spec's `change`: the user changed the selection — by pointer, touch, Enter, Space or (single)
 *   by moving to a segment with the arrow keys, Home or End. Receives the selection after the change: one value (single)
 *   or the new values (multiple, possibly empty). Called once per change; never for the selected segment of a single set.
 * @param contentDescription the spec's `label`: the question the options answer ("Range"). Required; an empty one still
 *   renders, and a debuggable app reports it (SEG-22).
 * @param modifier applied to the set, including the touch target it reserves above and below.
 * @param selectionMode the spec's `selection`: [TanreiSegmentedButtonSelectionMode.Single] (a radio group) or
 *   [TanreiSegmentedButtonSelectionMode.Multiple] (toggle buttons).
 * @param selectedValue the spec's `value`: the selected segment's value while single; null selects none.
 * @param selectedValues the spec's `values`: the selected segments' values while multiple.
 * @param size a key of `tokens.segmentedButton.sizes` (32 / 36 / 40 in the default system, Button's heights). Open: a
 *   design system may add values; one it does not have draws medium, and a debuggable app reports it (SEG-8).
 * @param content the `TanreiSegment`s, in order: two to five of them.
 */
@Composable
public fun TanreiSegmentedButton(
    onSelectionChange: (Set<String>) -> Unit,
    contentDescription: String,
    modifier: Modifier = Modifier,
    selectionMode: TanreiSegmentedButtonSelectionMode = TanreiSegmentedButtonSelectionMode.Single,
    selectedValue: String? = null,
    selectedValues: Set<String> = emptySet(),
    size: TanreiSegmentedButtonSize = TanreiSegmentedButtonSize.Medium,
    content: @Composable () -> Unit,
) {
    val system = TanreiTheme.tokens
    val tokens = system.segmentedButton
    // SEG-8: the lookup is total — a size this design system does not have reads the default size's tokens.
    val metrics = tokens.sizes[size]
    if (size !in tokens.sizes) TanreiReportUnknownValue(system.id, "TanreiSegmentedButton", "size", size.key)
    // SEG-22: still rendered; reported in debuggable apps.
    val named = contentDescription.isNotBlank()
    if (!named) TanreiReportMissingName("TanreiSegmentedButton", "contentDescription", what = "a segmented button without a label")

    // SEG-18 / SEG-19: one Tab stop — single: the selected segment (or the first enabled one); multiple: the segment
    // that had focus last, else the first selected one, else the first enabled one. The arrows wrap; Up and Down as well.
    val single = selectionMode == TanreiSegmentedButtonSelectionMode.Single
    val roving = remember(single) { TanreiRovingFocus(wrap = true, horizontal = true, typeahead = false, tabStopIsSelected = single, crossAxisKeys = true) }
    roving.layoutDirection = LocalLayoutDirection.current
    val change by rememberUpdatedState(onSelectionChange)
    val context = remember(roving, selectionMode, selectedValue, selectedValues, size) {
        TanreiSegmentedButtonContext(roving, selectionMode, selectedValue, selectedValues, size) { change(it) }
    }
    val current by rememberUpdatedState(context)
    // SEG-18: with single selection, each move of the arrow keys, Home or End also selects the segment it reaches.
    SideEffect { roving.onMove = if (single) { entry -> current.activate(entry, entry.value) } else null }
    // SEG-12 / SEG-22: values naming no segment, empty or repeated values, and a set of fewer than two or more than five.
    TanreiReportSegmentedButtonProblems(roving, context)

    val count = roving.size
    val smoothing = system.shape.cornerSmoothing
    val setShape = remember(tokens.setShape, smoothing) { tanreiContainerShape(tokens.setShape, smoothing) }
    val setColor = tokens.setColor.color
    val outlineColor = tokens.outlineColor.color
    val label = contentDescription.takeIf { named }

    Layout(
        modifier = modifier
            // SEG-20: a selectable group (Compose has no radio group role) of `count` segments in one row, named by label.
            .semantics {
                selectableGroup()
                collectionInfo = CollectionInfo(rowCount = 1, columnCount = count)
                isTraversalGroup = true
                if (label != null) this.contentDescription = label
            }
            // SEG-18 / SEG-19: the arrow keys, Home and End, heard from the focused segment.
            .tanreiRovingKeys(roving),
        content = {
            // SEG-13: the set's fill, under the segments; drawn, so not in the tree.
            Box(Modifier.layoutId(TanreiSegmentedSetPart.Track).tanreiSetOutline(setShape, fill = setColor))
            CompositionLocalProvider(LocalTanreiSegmentedButton provides context, content = content)
            // SEG-13 / SEG-7: the set's outline, inside its edge and OVER the segments, so no fill covers it; not in the tree.
            Box(Modifier.layoutId(TanreiSegmentedSetPart.Frame).tanreiSetOutline(setShape, stroke = outlineColor, width = tokens.outlineWidth))
        },
        measurePolicy = remember(tokens, metrics, system.measure.targetTouch) { TanreiSegmentedSetPolicy(tokens, metrics.containerHeight, system.measure.targetTouch) },
    )
}

/**
 * The set's fill ([fill]) or its outline ([stroke], [width] wide, inside the edge — where `Modifier.border` draws it) in
 * [shape]. Drawn rather than `background` / `border`, which would put the shape into the semantics tree: the set's only
 * children there are its segments (SEG-17, SEG-20).
 */
private fun Modifier.tanreiSetOutline(shape: Shape, fill: Color = Color.Transparent, stroke: Color = Color.Transparent, width: Dp = NoLength): Modifier =
    if (!fill.isDrawn && !stroke.isDrawn) this else drawWithCache {
        val outline = shape.createOutline(size, layoutDirection, this)
        val path = Path().apply { addOutline(outline) }
        val strokeWidth = width.toPx()
        onDrawBehind {
            if (fill.isDrawn) drawOutline(outline, fill)
            if (stroke.isDrawn && strokeWidth > 0f) {
                val half = strokeWidth / 2
                when (outline) {
                    // As `Modifier.border` draws a rounded or plain rectangle: the stroke centred half its width inside.
                    is Outline.Rounded -> drawRoundRect(
                        stroke,
                        topLeft = Offset(half, half),
                        size = Size(size.width - strokeWidth, size.height - strokeWidth),
                        cornerRadius = CornerRadius((outline.roundRect.topLeftCornerRadius.x - half).coerceAtLeast(0f)),
                        style = Stroke(strokeWidth),
                    )
                    is Outline.Rectangle -> drawRect(stroke, topLeft = Offset(half, half), size = Size(size.width - strokeWidth, size.height - strokeWidth), style = Stroke(strokeWidth))
                    // A smoothed corner: twice the width along the edge, clipped to the shape — the inner half is the outline.
                    is Outline.Generic -> clipPath(path) { drawPath(path, stroke, style = Stroke(strokeWidth * 2)) }
                }
            }
        }
    }

/**
 * SEG-6, SEG-13, SEG-14, SEG-24: the set's layout. Every segment one width — the widest segment's content measured as if
 * selected, plus its padding, and at least the touch target —; more width divided equally, less divided equally with
 * labels wrapping. The segments are inset by `set.padding`, `divider.width` apart, as tall as the tallest (at least the
 * container height less the padding). The set is as tall as that and at least the size's height; the whole layout at
 * least the touch target, the set centered in it. Each segment's hit box spans that height and tiles the set's width
 * (outer padding and half of each divider included). Placed from the start edge (right-to-left mirrors, SEG-21): the
 * fill, the segments — a selected one over its neighbours —, then the outline over them.
 */
private class TanreiSegmentedSetPolicy(
    private val tokens: TanreiSegmentedButtonTokens,
    private val containerHeight: Dp,
    private val target: Dp,
) : MeasurePolicy {
    override fun MeasureScope.measure(measurables: List<Measurable>, constraints: Constraints): MeasureResult {
        val track = measurables.firstOrNull { it.layoutId == TanreiSegmentedSetPart.Track }
        val frame = measurables.firstOrNull { it.layoutId == TanreiSegmentedSetPart.Frame }
        val segments = measurables.filter { it.layoutId is TanreiSegmentInfo }
        val count = segments.size
        val pad = tokens.setPadding.roundToPx()
        val divider = tokens.dividerWidth.roundToPx()
        val targetPx = target.roundToPx()
        val fixed = 2 * pad + (count - 1).coerceAtLeast(0) * divider
        val natural = segments.maxOfOrNull { maxOf(it.maxIntrinsicWidth(Constraints.Infinity), targetPx) } ?: 0
        val wanted = fixed + count * natural
        val width = if (constraints.hasBoundedWidth) wanted.coerceIn(constraints.minWidth, constraints.maxWidth) else maxOf(wanted, constraints.minWidth)
        val inner = (width - fixed).coerceAtLeast(0)
        val widths = IntArray(count) { inner / maxOf(count, 1) + if (it < inner % maxOf(count, 1)) 1 else 0 }
        val minimumSegment = (containerHeight.roundToPx() - 2 * pad).coerceAtLeast(0)
        val segment = maxOf(minimumSegment, (0 until count).maxOfOrNull { segments[it].minIntrinsicHeight(widths[it]) } ?: 0)
        val set = segment + 2 * pad
        val height = maxOf(set, targetPx, constraints.minHeight).let { if (constraints.hasBoundedHeight) minOf(it, maxOf(constraints.maxHeight, set)) else it }
        val top = (height - set) / 2
        val lefts = IntArray(count)
        var x = pad
        for (i in 0 until count) {
            lefts[i] = x
            x += widths[i] + divider
        }
        // The hit boxes' edges: the set's edges, and the middle of each divider.
        val edges = IntArray(count + 1) { i ->
            when (i) {
                0 -> 0
                count -> width
                else -> lefts[i] - divider / 2 - divider % 2
            }
        }
        val trackPlaceable = track?.measure(Constraints.fixed(width, set))
        val framePlaceable = frame?.measure(Constraints.fixed(width, set))
        val infos = segments.map { it.layoutId as TanreiSegmentInfo }
        val placeables = segments.mapIndexed { i, measurable ->
            infos[i].apply {
                visualWidth = widths[i]
                visualHeight = segment
                visualStart = lefts[i] - edges[i]
                visualTop = top + pad
            }
            measurable.measure(Constraints.fixed((edges[i + 1] - edges[i]).coerceAtLeast(0), height))
        }
        return layout(width, height) {
            trackPlaceable?.placeRelative(0, top)
            // SEG-24: a selected segment is placed after the others, so its elevation lies over its neighbours.
            val order = (0 until count).sortedBy { if (infos[it].selected) 1 else 0 }
            for (i in order) placeables[i].placeRelative(edges[i], 0)
            // SEG-13: the outline over every segment's fill.
            framePlaceable?.placeRelative(0, top)
        }
    }
}

/**
 * One segment of a [TanreiSegmentedButton] (the spec's item kind `segment`). Call it in the set's content lambda.
 *
 * @param value identifies the segment: the set's `selectedValue` or `selectedValues` name it by this, and
 *   `onSelectionChange` carries it. Unique within the set; an empty or repeated one still renders — the first segment with
 *   a value is the one it selects — and a debuggable app reports it (SEG-12).
 * @param label the segment's text and its accessible name. Required, even when [labelHidden]; an empty one still renders,
 *   and a debuggable app reports it (SEG-22). It wraps onto more lines rather than truncate (SEG-14).
 * @param modifier applied to the segment's element (its hit area).
 * @param labelHidden draws the icon alone and keeps [label] as the accessible name (an icon-only segment, which keeps its
 *   icon when selected and draws no check). Without an icon the label is drawn anyway, and a debuggable app reports it.
 * @param enabled the Compose idiom for the spec's `disabled` (inverse). A disabled segment is not selected or cleared by
 *   the user, is skipped by the arrow keys, is never the Tab stop, and is announced disabled (SEG-3).
 * @param icon the spec's `icon`: a glyph of the system's icon set before the label, in a box of the size's `iconSize`,
 *   given the condition's icon color, the glyph of the segment's selection and an icon-font text style — as
 *   `TanreiIconButton`'s slot. Decorative. A selected segment shows the check in its place (unless the system's check
 *   size is 0). Give every segment of a set an icon, or none.
 * @param interactionSource hoist to observe or drive hover, focus and press.
 */
@Composable
public fun TanreiSegment(
    value: String,
    label: String,
    modifier: Modifier = Modifier,
    labelHidden: Boolean = false,
    enabled: Boolean = true,
    icon: (@Composable () -> Unit)? = null,
    interactionSource: MutableInteractionSource? = null,
) {
    val set = LocalTanreiSegmentedButton.current
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val system = TanreiTheme.tokens
    val tokens = system.segmentedButton
    val metrics = tokens.sizes[set?.size ?: TanreiSegmentedButtonSize.Medium]
    // SEG-22: still rendered and still working; reported in debuggable apps.
    if (label.isBlank()) TanreiReportMissingName("TanreiSegment", "label", what = "a segment without a label")
    val drawLabel = !labelHidden || icon == null
    if (labelHidden && icon == null) TanreiReportSegmentedProblem("TanreiSegment \"$label\": labelHidden is true but it has no icon; its label is drawn.")

    // SEG-3 / SEG-18 / SEG-19: the set's keyboard sees this segment — its order and value; a disabled one takes no focus.
    val roving = set?.roving
    val entry = rememberTanreiRovingEntry(roving, focusable = enabled, enabled = enabled, selected = false, text = label, value = value)
    // SEG-12: the condition — selected while its value is the set's (the first segment with it), otherwise unselected.
    val selected = set?.isSelected(entry, value) ?: false
    val info = remember { TanreiSegmentInfo() }
    SideEffect {
        entry?.selected = selected
        info.selected = selected
    }
    val index = entry?.let { roving?.indexOf(it) } ?: -1
    val count = roving?.size ?: 0
    val condition = if (selected) TanreiSegmentedButtonCondition.Selected else TanreiSegmentedButtonCondition.Unselected
    val palette = tokens.conditions[condition]

    // SEG-4 / SEG-7: one state wins; SEG-9: a press counts from the first frame and for at least press-hold.
    val interaction = source.collectTanreiInteraction(enabled)
    // SEG-10: the pressed tokens say WHAT a press looks like; `pressed-feedback` says how it arrives.
    val feedback = system.behavior.pressedFeedback
    val drawnStates = interaction.drawnStates(feedback)
    val drawn = palette[drawnStates.content]

    // SEG-23: a change of interaction state moves over the state motion (entering pressed snaps); SEG-16: a change of
    // condition moves the colors and the elevation over the selection motion. At once where motion is reduced.
    val stateMotion = TanreiStateMotion(interaction.state, tokens.motionStateDuration, tokens.motionStateEasing)
    val motion = rememberTanreiSelectionMotion(condition, stateMotion, tokens.motionSelectionDuration, tokens.motionSelectionEasing)
    val containerColor = animateTanreiColorAsState(palette[drawnStates.container].containerColor.color, motion, label = "container")
    val labelColor = animateTanreiColorAsState(drawn.labelColor.color, motion, label = "label")
    val iconColor by animateTanreiColorAsState(drawn.iconColor.color, motion, label = "icon")
    val opacity = animateFloatAsState(tokens.opacity(drawnStates.content), motion.spec(), label = "opacity")
    val elevation = animateTanreiElevation(drawn.containerElevation, motion.spec())
    // SEG-16: the check comes and goes — and the content re-centres around it — over the selection motion.
    val checkShown = animateFloatAsState(if (selected) 1f else 0f, tanreiTween(tokens.motionSelectionDuration, tokens.motionSelectionEasing), label = "check")

    // SEG-11 / SEG-13: the corners where segments meet follow the state's `container.shape`; the outer corners of the
    // first and last segment are the set's less its padding (concentric); all eased by the system's corner smoothing.
    val inner by animateDpAsState(tokens.containerShape(drawnStates.content), stateMotion.spec(), label = "shape")
    val outer = (tokens.setShape - tokens.setPadding).coerceAtLeast(NoLength)
    val first = index <= 0
    val last = index < 0 || index == count - 1
    val startRadius = if (first) outer else inner
    val endRadius = if (last) outer else inner
    val smoothing = system.shape.cornerSmoothing
    val shape = remember(startRadius, endRadius, smoothing) { tanreiSideCornerShape(startRadius, endRadius, smoothing) }
    val restingInner = tokens.containerShape(drawnStates.content)
    // SEG-5: the ring clears the set's outline, which is drawn over the segments' outer edges.
    val ringInset = if (tokens.outlineColor.color.isDrawn) (tokens.outlineWidth - tokens.setPadding).coerceAtLeast(NoLength) else NoLength

    // SEG-10, ripple: the pressed container color of the segment's condition, from the point of contact (the center
    // for a key), clipped to the segment.
    val ripple = rememberTanreiRipple(
        feedback = feedback,
        interaction = interaction,
        color = palette.pressed.containerColor.color,
        feedbackDurationMillis = tokens.motionFeedbackDuration,
        stateDurationMillis = tokens.motionStateDuration,
        stateEasing = tokens.motionStateEasing,
    )

    // SEG-15 / SEG-16: glyphs through THE icon helper — the icon with the family and fill of the segment's condition, the
    // check with the selected ones. SEG-16: a check only where a label is drawn and the size's check size is above 0.
    val glyph = system.icon.glyph(metrics.iconSize, selected = selected)
    val checkGlyph = system.icon.glyph(metrics.checkSize, selected = true)
    val checkable = drawLabel && metrics.checkSize > NoLength
    val dividerColor = tokens.dividerColor.color
    val dividerWidth = tokens.dividerWidth

    // SEG-17: the divider before every segment but the first, in the gap the set leaves for it, from the set's top
    // padding to its bottom padding. Drawn outside the segment's opacity: its color and full opacity never change.
    val visual = Modifier
        .drawBehind {
            val width = dividerWidth.toPx()
            if (first || !dividerColor.isDrawn || width <= 0f) return@drawBehind
            val x = if (layoutDirection == LayoutDirection.Rtl) size.width else -width
            drawRect(dividerColor, topLeft = Offset(x, 0f), size = Size(width, size.height))
        }
        .tanreiGroupOpacity(overflow = tanreiDecorationOverflow(system, drawn.containerElevation)) { opacity.value }
        // SEG-5: inside the segment, where the outline and the neighbours cannot cover it; never animated.
        .tanreiFocusRing(source, cornerRadius = if (first) outer else restingInner, inside = true, endCornerRadius = if (last) outer else restingInner, inset = ringInset)
        // SEG-24: the condition's elevation, outside the segment, never clipped by the set.
        .tanreiElevation(elevation, shape)
        .tanreiContainer(shape, containerColor = { containerColor.value }, outlineColor = Color.Transparent, outlineWidth = NoLength, ripple = ripple)

    val hiddenName = label.takeIf { !drawLabel || labelHidden }?.takeUnless { it.isBlank() }
    val single = set?.mode != TanreiSegmentedButtonSelectionMode.Multiple
    val hit = Modifier
        .layoutId(info)
        .then(modifier)
        .tanreiRovingItem(roving, entry, focusable = enabled)
        // SEG-20: named by its own label — the drawn label merges in; a hidden one is its description — with its position.
        .semantics {
            if (hiddenName != null) this.contentDescription = hiddenName
            // Read in order, whichever segment is drawn over the others (SEG-24).
            if (index >= 0) traversalIndex = index.toFloat()
            if (index >= 0) collectionItemInfo = CollectionItemInfo(rowIndex = 0, rowSpan = 1, columnIndex = index, columnSpan = 1)
        }
        .then(
            if (single) {
                // SEG-1 / SEG-20: a radio (Compose has no radio group role; the set is a selectable group).
                Modifier.selectable(selected = selected, interactionSource = source, indication = null, enabled = enabled, role = Role.RadioButton, onClick = { set?.activate(entry, value) })
            } else {
                // SEG-2 / SEG-20: a toggle button with its on / off state, as the filter chip and the toggle icon button.
                Modifier.toggleable(value = selected, interactionSource = source, indication = null, enabled = enabled, role = Role.Button, onValueChange = { set?.activate(entry, value) })
            },
        )
        // SEG-9: the pointer press itself, heard at once.
        .tanreiPressInput(interaction.press, enabled)
        .tanreiRippleInput(ripple)

    val labelStyle = metrics.labelTypescale.toTextStyle().merge(TextStyle(textAlign = TextAlign.Center))
    Layout(modifier = hit, measurePolicy = remember(info) { TanreiSegmentHitPolicy(info) }, content = {
    Layout(
        modifier = visual,
        content = {
            if (icon != null) {
                Box(
                    Modifier
                        .layoutId(TanreiSegmentSlot.Icon)
                        .size(metrics.iconSize)
                        // SEG-20: the icon is decorative; the segment's name is its label.
                        .clearAndSetSemantics {}
                        // The check takes the icon's place as it comes (SEG-16).
                        .graphicsLayer { alpha = if (checkable) 1f - checkShown.value.coerceIn(0f, 1f) else 1f },
                    contentAlignment = Alignment.Center,
                ) {
                    CompositionLocalProvider(
                        LocalTanreiContentColor provides iconColor,
                        LocalTanreiIconGlyph provides glyph,
                        LocalTanreiTextStyle provides glyph.toTextStyle(metrics.iconSize),
                    ) { WithoutTanreiAnchorDescription(icon) }
                }
            }
            if (checkable) {
                Box(Modifier.layoutId(TanreiSegmentSlot.Check).size(metrics.checkSize).clearAndSetSemantics {}, contentAlignment = Alignment.Center) {
                    TanreiDrawnGlyph(TanreiDrawnGlyphKind.Check, glyph = checkGlyph, box = metrics.checkSize, color = iconColor, stroke = system.measure.borderThick, progress = { checkShown.value })
                }
            }
            if (drawLabel) {
                BasicText(text = label, modifier = Modifier.layoutId(TanreiSegmentSlot.Label), style = labelStyle, color = { labelColor.value })
            }
        },
        measurePolicy = TanreiSegmentContentPolicy(
            paddingInline = metrics.containerPaddingInline,
            paddingBlock = metrics.containerPaddingBlock,
            gap = metrics.containerGap,
            iconSize = if (icon != null) metrics.iconSize else NoLength,
            checkSize = if (checkable) metrics.checkSize else NoLength,
            labelDrawn = drawLabel,
            shown = { checkShown.value.coerceIn(0f, 1f) },
        ),
    )
    })
}

/**
 * SEG-6: a segment's hit box — the size the set gives it: its share of the set's width and the touch target's height —
 * holding its drawn part where the set says ([TanreiSegmentInfo]); its intrinsic size is the drawn part's. Outside a set
 * (nothing laid it out) the drawn part takes what it is given and the hit box is its size.
 */
private class TanreiSegmentHitPolicy(private val info: TanreiSegmentInfo) : MeasurePolicy {
    override fun MeasureScope.measure(measurables: List<Measurable>, constraints: Constraints): MeasureResult {
        val visual = measurables.firstOrNull()
        if (info.visualWidth <= 0 || info.visualHeight <= 0) {
            val placeable = visual?.measure(constraints)
            return layout(placeable?.width ?: constraints.minWidth, placeable?.height ?: constraints.minHeight) { placeable?.placeRelative(0, 0) }
        }
        val placeable = visual?.measure(Constraints.fixed(info.visualWidth, info.visualHeight))
        return layout(constraints.maxWidth, constraints.maxHeight) { placeable?.placeRelative(info.visualStart, info.visualTop) }
    }

    override fun IntrinsicMeasureScope.maxIntrinsicWidth(measurables: List<IntrinsicMeasurable>, height: Int): Int = measurables.firstOrNull()?.maxIntrinsicWidth(height) ?: 0

    override fun IntrinsicMeasureScope.minIntrinsicWidth(measurables: List<IntrinsicMeasurable>, height: Int): Int = measurables.firstOrNull()?.minIntrinsicWidth(height) ?: 0

    override fun IntrinsicMeasureScope.minIntrinsicHeight(measurables: List<IntrinsicMeasurable>, width: Int): Int = measurables.firstOrNull()?.minIntrinsicHeight(width) ?: 0

    override fun IntrinsicMeasureScope.maxIntrinsicHeight(measurables: List<IntrinsicMeasurable>, width: Int): Int = measurables.firstOrNull()?.maxIntrinsicHeight(width) ?: 0
}

private enum class TanreiSegmentSlot { Icon, Check, Label }

/** The child in [slot], asked for its intrinsic size. */
private fun List<IntrinsicMeasurable>.slot(slot: TanreiSegmentSlot): IntrinsicMeasurable? = firstOrNull { (it.parentData as? LayoutIdParentData)?.layoutId == slot }

/**
 * SEG-14 / SEG-15 / SEG-16 / SEG-21: a segment's content — [leading glyph][gap][label] — centered in it, the glyph
 * first (mirrored right-to-left by `placeRelative`). The leading glyph is the icon, or the check in its place while
 * selected: its room and the gap after it move between the unselected and the selected room as the check comes and goes
 * ([shown], read in layout). The label wraps within the room the segment leaves it AS IF SELECTED, so a selection never
 * rewraps it; the segment's natural width is that content as if selected (never narrower than unselected), plus
 * [paddingInline] on each side; its height, at a width, the content plus [paddingBlock] above and below.
 */
private class TanreiSegmentContentPolicy(
    private val paddingInline: Dp,
    private val paddingBlock: Dp,
    private val gap: Dp,
    /** 0 without an icon. */
    private val iconSize: Dp,
    /** 0 where no check is drawn: an icon-only segment, or a system whose check size is 0. */
    private val checkSize: Dp,
    private val labelDrawn: Boolean,
    private val shown: () -> Float,
) : MeasurePolicy {
    private fun IntrinsicMeasureScope.lead(selected: Boolean): Int = when {
        selected && checkSize > NoLength -> checkSize.roundToPx()
        iconSize > NoLength -> iconSize.roundToPx()
        else -> 0
    }

    private fun IntrinsicMeasureScope.leadGap(lead: Int): Int = if (lead > 0 && labelDrawn) gap.roundToPx() else 0

    /** The most the glyph and its gap ever take: selected or not. */
    private fun IntrinsicMeasureScope.widestLead(): Int = maxOf(lead(true) + leadGap(lead(true)), lead(false) + leadGap(lead(false)))

    private fun IntrinsicMeasureScope.labelRoom(width: Int): Int = (width - 2 * paddingInline.roundToPx() - widestLead()).coerceAtLeast(0)

    override fun MeasureScope.measure(measurables: List<Measurable>, constraints: Constraints): MeasureResult {
        val width = constraints.maxWidth.takeIf { constraints.hasBoundedWidth } ?: constraints.minWidth
        val shown = shown()
        val iconPlaceable = measurables.firstOrNull { it.layoutId == TanreiSegmentSlot.Icon }?.measure(Constraints())
        val checkPlaceable = measurables.firstOrNull { it.layoutId == TanreiSegmentSlot.Check }?.measure(Constraints())
        val labelPlaceable = measurables.firstOrNull { it.layoutId == TanreiSegmentSlot.Label }?.measure(Constraints(maxWidth = labelRoom(width)))
        val unselected = lead(false)
        val selected = lead(true)
        val room = lerp(unselected.toFloat(), selected.toFloat(), shown)
        val between = lerp(leadGap(unselected).toFloat(), leadGap(selected).toFloat(), shown)
        val labelWidth = labelPlaceable?.width ?: 0
        val content = room + between + labelWidth
        val block = paddingBlock.roundToPx()
        val tallest = maxOf(labelPlaceable?.height ?: 0, iconPlaceable?.height ?: 0, checkPlaceable?.height ?: 0)
        val height = maxOf(constraints.minHeight, tallest + 2 * block).let { if (constraints.hasBoundedHeight) minOf(it, constraints.maxHeight) else it }
        val start = (width - content) / 2f
        return layout(width, height) {
            iconPlaceable?.placeRelative((start + (room - iconPlaceable.width) / 2f).roundToInt(), (height - iconPlaceable.height) / 2)
            checkPlaceable?.placeRelative(start.roundToInt(), (height - checkPlaceable.height) / 2)
            labelPlaceable?.placeRelative((start + room + between).roundToInt(), (height - labelPlaceable.height) / 2)
        }
    }

    override fun IntrinsicMeasureScope.maxIntrinsicWidth(measurables: List<IntrinsicMeasurable>, height: Int): Int {
        val label = measurables.slot(TanreiSegmentSlot.Label)?.maxIntrinsicWidth(Constraints.Infinity) ?: 0
        return 2 * paddingInline.roundToPx() + widestLead() + label
    }

    override fun IntrinsicMeasureScope.minIntrinsicWidth(measurables: List<IntrinsicMeasurable>, height: Int): Int {
        val label = measurables.slot(TanreiSegmentSlot.Label)?.minIntrinsicWidth(Constraints.Infinity) ?: 0
        return 2 * paddingInline.roundToPx() + widestLead() + label
    }

    override fun IntrinsicMeasureScope.minIntrinsicHeight(measurables: List<IntrinsicMeasurable>, width: Int): Int = height(measurables, width)

    override fun IntrinsicMeasureScope.maxIntrinsicHeight(measurables: List<IntrinsicMeasurable>, width: Int): Int = height(measurables, width)

    private fun IntrinsicMeasureScope.height(measurables: List<IntrinsicMeasurable>, width: Int): Int {
        val label = measurables.slot(TanreiSegmentSlot.Label)?.minIntrinsicHeight(labelRoom(width)) ?: 0
        val glyphs = maxOf(if (iconSize > NoLength) iconSize.roundToPx() else 0, if (checkSize > NoLength) checkSize.roundToPx() else 0)
        return maxOf(label, glyphs) + 2 * paddingBlock.roundToPx()
    }
}

/** No length: a segment has no outline of its own. */
private val NoLength = Dp.Hairline

/** Debuggable apps only (SEG-22): one report per message and composition site. */
@Composable
private fun TanreiReportSegmentedProblem(message: String) {
    if (!isTanreiDebuggable()) return
    remember(message) { TanreiDiagnostics.reporter(message) }
}

/**
 * Debuggable apps only: a selected value that names none of the segments (none is drawn selected for it), a segment
 * whose value is empty, a value given to more than one segment (the first of them is the one it selects) — SEG-12 — and
 * a set of fewer than two or more than five segments (SEG-22). Each reported once, after the segments registered.
 */
@Composable
private fun TanreiReportSegmentedButtonProblems(roving: TanreiRovingFocus, context: TanreiSegmentedButtonContext) {
    if (!isTanreiDebuggable()) return
    val reported = remember { mutableSetOf<String>() }
    LaunchedEffect(roving, context) {
        snapshotFlow {
            val segments = roving.ordered
            val values = segments.map { it.value }
            val named = if (context.mode == TanreiSegmentedButtonSelectionMode.Single) listOfNotNull(context.selectedValue) else context.selectedValues.toList()
            buildList {
                if (segments.isEmpty()) return@buildList
                named.filter { it !in values }.forEach { add("TanreiSegmentedButton: the selected value \"$it\" names none of its segments; none is drawn selected for it.") }
                segments.filter { it.value.isEmpty() }.forEach { add("TanreiSegment \"${it.text}\": its value is empty; it cannot be selected by value.") }
                values.filter { it.isNotEmpty() }.groupingBy { it }.eachCount().filterValues { it > 1 }.keys.forEach { add("TanreiSegmentedButton: the value \"$it\" is given to more than one segment; the first of them is the one it selects.") }
                if (segments.size < 2 || segments.size > 5) add("TanreiSegmentedButton: it holds ${segments.size} segments; a segmented button holds two to five.")
            }
        }.collect { problems -> problems.forEach { if (reported.add(it)) TanreiDiagnostics.reporter(it) } }
    }
}
