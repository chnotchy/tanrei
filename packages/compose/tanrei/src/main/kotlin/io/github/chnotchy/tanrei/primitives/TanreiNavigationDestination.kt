package io.github.chnotchy.tanrei.primitives

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.IntrinsicMeasurable
import androidx.compose.ui.layout.IntrinsicMeasureScope
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.Measurable
import androidx.compose.ui.layout.MeasurePolicy
import androidx.compose.ui.layout.MeasureResult
import androidx.compose.ui.layout.MeasureScope
import androidx.compose.ui.semantics.CollectionInfo
import androidx.compose.ui.semantics.CollectionItemInfo
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsPropertyReceiver
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.collectionInfo
import androidx.compose.ui.semantics.collectionItemInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.isTraversalGroup
import androidx.compose.ui.semantics.selectableGroup
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.glyph
import io.github.chnotchy.tanrei.theme.tanreiTween
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiCubicBezier
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiTextStyle
import kotlin.math.roundToInt

/*
 * The destinations of a navigation bar and a navigation rail (NVB-*, NVR-*): the same item structure in both, each
 * component with its own tokens. The component maps its generated tokens into a [TanreiDestinationStyle]; everything a
 * destination does — its cell and hit area, its item container that carries the state answer and is the active
 * indicator, its glyph, its badge, its label, the selection motion and its semantics — is drawn here once.
 */

/** A destination's container, icon and label paints in one condition (selected or not) and one interaction state. */
@Immutable
internal class TanreiDestinationParts(val container: TanreiPaint, val icon: TanreiPaint, val label: TanreiPaint)

/** What a navigation component's destinations are drawn from: its own tokens, mapped by the component. */
@Immutable
internal class TanreiDestinationStyle(
    val containerWidth: Dp,
    val containerHeight: Dp,
    val containerShape: Dp,
    val gap: Dp,
    val iconSize: Dp,
    val labelTypescale: TanreiTextStyle,
    /** The lines a label may take before it is truncated: one in a bar (NVB-12), two in a rail (NVR-13). */
    val labelMaxLines: Int,
    val feedbackDuration: Int,
    val stateDuration: Int,
    val stateEasing: TanreiCubicBezier,
    val selectionDuration: Int,
    val selectionEasing: TanreiCubicBezier,
    val opacity: (TanreiInteractionState) -> Float,
    val parts: (selected: Boolean, state: TanreiInteractionState) -> TanreiDestinationParts,
)

/**
 * The destinations of one bar or rail, as its semantics and its debug reports see them: their order (by where they are
 * laid out — [TanreiRovingFocus] with no keys of its own: every destination is a Tab stop, NVB-19 / NVR-20), their count,
 * and which one is drawn selected — the first the caller marked selected (NVB-22, NVR-23).
 */
@Stable
internal class TanreiDestinations(horizontal: Boolean, allFocusable: Boolean = false) {
    /** [allFocusable]: the destinations register as focusable, so the holder can move focus to one (a drawer, NVD-19). */
    val order = TanreiRovingFocus(wrap = false, allFocusable = allFocusable, horizontal = horizontal, typeahead = false)

    /** False until the destinations have registered and been drawn once: what they resolve then is where they start. */
    var settled by mutableStateOf(false)

    /** The destination drawn selected: the first marked selected. */
    fun chosen(): TanreiRovingFocus.Entry? = order.ordered.firstOrNull { it.selected }

    /** Whether the destination of [entry], marked [selected] by the caller, is drawn selected. */
    fun isSelected(entry: TanreiRovingFocus.Entry?, selected: Boolean): Boolean {
        if (entry == null || entry !in order.ordered) return selected
        return selected && chosen() === entry
    }
}

/** One [TanreiDestinations] for the lifetime of the component; settled two frames after it enters the composition. */
@Composable
internal fun rememberTanreiDestinations(horizontal: Boolean, direction: LayoutDirection, allFocusable: Boolean = false): TanreiDestinations {
    val destinations = remember(horizontal, allFocusable) { TanreiDestinations(horizontal, allFocusable) }
    destinations.order.layoutDirection = direction
    LaunchedEffect(destinations) {
        // Registration, then the recomposition it causes: two frames.
        withFrameNanos { }
        withFrameNanos { }
        destinations.settled = true
    }
    return destinations
}

/**
 * The holder's semantics (NVB-19, NVR-20): a selectable group of tabs (the platform's tab bar), [count] in one row or
 * one column, named by [label] when there is one.
 */
internal fun SemanticsPropertyReceiver.tanreiDestinationGroup(label: String, count: Int, horizontal: Boolean) {
    selectableGroup()
    collectionInfo = if (horizontal) CollectionInfo(rowCount = 1, columnCount = count) else CollectionInfo(rowCount = count, columnCount = 1)
    if (label.isNotBlank()) {
        contentDescription = label
        isTraversalGroup = true
    }
}

/**
 * Debuggable apps only: a count of destinations outside [range] (NVB-17, NVR-18), more than one destination marked
 * selected (the first is drawn selected, NVB-22, NVR-23) and a destination without a label (NVB-20, NVR-21). Each
 * reported once, after the destinations registered.
 */
@Composable
internal fun TanreiReportDestinations(destinations: TanreiDestinations, component: String, range: IntRange) {
    if (!isTanreiDebuggable()) return
    val reported = remember { mutableSetOf<String>() }
    LaunchedEffect(destinations) {
        snapshotFlow {
            val entries = destinations.order.ordered
            buildList {
                if (destinations.settled && entries.isNotEmpty() && entries.size !in range) add("$component: it holds ${entries.size} destinations; it is designed for ${range.first} to ${range.last}.")
                if (entries.count { it.selected } > 1) add("$component: more than one destination is marked selected; the first of them is drawn selected.")
            }
        }.collect { problems -> problems.forEach { if (reported.add(it)) TanreiDiagnostics.reporter(it) } }
    }
}

/**
 * One destination of a navigation bar or rail. [modifier] sizes the cell — the whole hit area (NVB-6, NVR-6): the bar
 * gives each an equal share of its width and its full height, the rail its full width — and the destination centers
 * its group in it: the item container ([TanreiDestinationStyle.containerWidth] × [TanreiDestinationStyle.containerHeight],
 * the state answer and the active indicator) with the icon in it and the badge on the icon, and — while the label is
 * drawn — the label [TanreiDestinationStyle.gap] below it. [cellPaddingBlock] is space inside the cell above and below
 * the group (the rail's half gap), [minCellHeight] the least the cell is. [reserveLabel]: the cell's intrinsic height
 * holds a label whether it is drawn or not (a bar keeps its height as labels come and go).
 *
 * [labelShown] says, for the selection it is drawn with, whether the label is drawn (the component's label visibility).
 * [badgeDescription] is read after the name and state (NVB-16, NVR-17); [badge] wraps the icon in the badge.
 */
@Composable
internal fun TanreiNavigationDestination(
    destinations: TanreiDestinations?,
    selected: Boolean,
    onClick: () -> Unit,
    icon: String,
    label: String,
    enabled: Boolean,
    style: TanreiDestinationStyle,
    labelShown: (Boolean) -> Boolean,
    badgeDescription: String?,
    badge: (@Composable (anchor: @Composable () -> Unit) -> Unit)?,
    interactionSource: MutableInteractionSource?,
    component: String,
    reserveLabel: Boolean,
    modifier: Modifier,
    cellPaddingBlock: Dp = Dp.Hairline,
    minCellHeight: Dp = Dp.Hairline,
) {
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val system = TanreiTheme.tokens
    // NVB-20 / NVR-21: still rendered and still working; reported in debuggable apps.
    if (label.isBlank()) TanreiReportMissingName(component, "label", what = "a destination without a label")

    // NVB-22 / NVR-23: the order, the count and which one is drawn selected are the holder's.
    val entry = rememberTanreiRovingEntry(destinations?.order, focusable = false, enabled = enabled, selected = selected, text = label)
    val drawnSelected = destinations?.isSelected(entry, selected) ?: selected
    val index = entry?.let { destinations?.order?.indexOf(it) } ?: -1

    // NVB-4 / NVR-4: one state wins; NVB-8 / NVR-8: a press counts from the first frame and for at least press-hold.
    val interaction = source.collectTanreiInteraction(enabled)
    // NVB-9 / NVR-9: the pressed tokens say WHAT a press looks like; `pressed-feedback` says how it arrives.
    val feedback = system.behavior.pressedFeedback
    val drawnStates = interaction.drawnStates(feedback)
    val drawn = style.parts(drawnSelected, drawnStates.content)

    // NVB-15 / NVR-16: a change of selection moves over the selection motion; a change of state over the state motion
    // (entering pressed snaps). The first frames — while the holder settles its selection — are where it starts.
    val settling = destinations != null && !destinations.settled
    val stateMotion = TanreiStateMotion(interaction.state, style.stateDuration, style.stateEasing)
    val selectionMotion = rememberTanreiSelectionMotion(drawnSelected, stateMotion, style.selectionDuration, style.selectionEasing)
    val instant = TanreiStateMotion(TanreiInteractionState.Pressed, style.stateDuration, style.stateEasing)
    val motion = if (settling) instant else selectionMotion
    // The new selection's indicator is not faded in: it takes its color at once and grows (below).
    val becameSelected = drawnSelected && selectionMotion !== stateMotion
    val containerColor = animateTanreiColorAsState(style.parts(drawnSelected, drawnStates.container).container.color, if (becameSelected) instant else motion, label = "container")
    val iconColor by animateTanreiColorAsState(drawn.icon.color, motion, label = "icon")
    val labelColor = animateTanreiColorAsState(drawn.label.color, motion, label = "label")
    val opacity = animateFloatAsState(style.opacity(drawnStates.content), motion.spec(), label = "opacity")

    // NVB-15 / NVR-16: the new selection's indicator grows in width from the center of the item container, at its full
    // height; the old one fades out
    // (its color moves to the unselected container's, which draws nothing). At once where motion is reduced.
    val grow = remember { Animatable(1f) }
    val seen = remember { SeenDestination(drawnSelected) }
    val selectionSpec = tanreiTween<Float>(style.selectionDuration, style.selectionEasing)
    LaunchedEffect(drawnSelected) {
        val became = drawnSelected && !seen.selected
        seen.selected = drawnSelected
        if (became && !settling) {
            grow.snapTo(0f)
            grow.animateTo(1f, selectionSpec)
        } else {
            grow.snapTo(1f)
        }
    }
    // NVB-14 / NVR-15: the glyph of the selection (family, weight, optical size) — its fill moving with the selection.
    val glyph = system.icon.glyph(style.iconSize, drawnSelected)
    val fill by animateFloatAsState(glyph.fill, if (settling) motion.spec() else selectionSpec, label = "fill")
    // NVB-13 / NVR-14: whether the label is drawn; with `selected` it appears and disappears over the selection motion.
    val shown = labelShown(drawnSelected)
    val labelPart by animateFloatAsState(if (shown) 1f else 0f, if (settling) motion.spec() else selectionSpec, label = "label-shown")
    val composeLabel = shown || labelPart > 0f

    // NVB-10 / NVR-10: the item container's corners eased by corner smoothing.
    val smoothing = system.shape.cornerSmoothing
    val shape = remember(style.containerShape, smoothing) { tanreiContainerShape(style.containerShape, smoothing) }
    // NVB-9 / NVR-9, ripple: the pressed container color of the condition, clipped to the item container; a press on
    // the rest of the cell (the label, the space around) grows from the item container's center.
    val ripple = rememberTanreiRipple(
        feedback = feedback,
        interaction = interaction,
        color = style.parts(drawnSelected, TanreiInteractionState.Pressed).container.color,
        feedbackDurationMillis = style.feedbackDuration,
        stateDurationMillis = style.stateDuration,
        stateEasing = style.stateEasing,
        centerOutsideContainer = true,
    )

    val name = label.takeUnless { it.isBlank() }
    val cell = modifier
        .tanreiRovingItem(destinations?.order, entry, focusable = false)
        // NVB-19 / NVR-20: one element — a tab with its selected state and position — named by its label (drawn or not),
        // then the badge's description (NVB-16 / NVR-17).
        .semantics {
            if (index >= 0) {
                val horizontal = destinations?.order?.horizontal ?: true
                collectionItemInfo = if (horizontal) CollectionItemInfo(0, 1, index, 1) else CollectionItemInfo(index, 1, 0, 1)
            }
            if (name != null) contentDescription = name
            if (badgeDescription != null) stateDescription = badgeDescription
        }
        // NVB-1 / NVB-2 / NVB-6: the whole cell is one tab; a disabled one does not activate and takes no focus.
        .selectable(selected = drawnSelected, interactionSource = source, indication = null, enabled = enabled, role = Role.Tab, onClick = onClick)
        .tanreiPressInput(interaction.press, enabled)
        .tanreiRippleInput(ripple)
        // NVB-9 dim / NVB-7: the opacity of the state, on the whole destination.
        .tanreiGroupOpacity(overflow = tanreiDecorationOverflow(system, emptyList())) { opacity.value }
        .heightIn(min = minCellHeight)
        .padding(vertical = cellPaddingBlock)

    val labelStyle = style.labelTypescale.toTextStyle().merge(TextStyle(textAlign = TextAlign.Center))
    val group: @Composable () -> Unit = {
        // NVB-5 / NVR-5: the focus ring around the item container, keyboard focus only, never animated.
        Box(Modifier.size(style.containerWidth, style.containerHeight).tanreiFocusRing(source, cornerRadius = style.containerShape), contentAlignment = Alignment.Center) {
            Box(
                Modifier
                    .matchParentSize()
                    // NVB-15 / NVR-16 (6c8a6cf): in width only, from the center, at full height throughout.
                    .graphicsLayer { scaleX = grow.value }
                    .tanreiContainer(shape, containerColor = { containerColor.value }, outlineColor = Color.Transparent, outlineWidth = Dp.Hairline, ripple = ripple),
            )
            val iconBox: @Composable () -> Unit = { TanreiNamedGlyph(icon, glyph.copy(fill = fill), style.iconSize, iconColor) }
            Box(Modifier.clearAndSetSemantics {}) {
                WithoutTanreiAnchorDescription { if (badge != null) badge(iconBox) else iconBox() }
            }
        }
        if (composeLabel) {
            // NVB-12 / NVR-13: centered, truncated at the end; the name is the cell's, so the text is hidden.
            BasicText(
                text = label,
                modifier = Modifier.clearAndSetSemantics {}.graphicsLayer { alpha = labelPart },
                style = labelStyle,
                color = { labelColor.value },
                maxLines = style.labelMaxLines,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
    Layout(content = group, modifier = cell, measurePolicy = remember(style, reserveLabel) { TanreiDestinationLayout(style, reserveLabel) { labelPart } })
}

/** Not a snapshot state on purpose: which selection the grow effect saw last. */
private class SeenDestination(var selected: Boolean)

/**
 * The cell: the group — the item container and, while it is drawn, the label [TanreiDestinationStyle.gap] below it —
 * centered in the cell, whose height is the group's (at least the constraints'); the label takes the cell's width. While
 * a label appears or disappears ([labelPart] 0–1) the group's height moves with it, so the item container moves.
 */
private class TanreiDestinationLayout(
    private val style: TanreiDestinationStyle,
    private val reserveLabel: Boolean,
    private val labelPart: () -> Float,
) : MeasurePolicy {
    override fun MeasureScope.measure(measurables: List<Measurable>, constraints: Constraints): MeasureResult {
        val container = measurables[0].measure(Constraints())
        val width = if (constraints.hasBoundedWidth) constraints.maxWidth else maxOf(constraints.minWidth, container.width)
        val label = measurables.getOrNull(1)?.measure(Constraints(maxWidth = width))
        val part = if (label == null) 0f else labelPart().coerceIn(0f, 1f)
        val gap = style.gap.roundToPx()
        val group = container.height + ((gap + (label?.height ?: 0)) * part).roundToInt()
        val height = maxOf(constraints.minHeight, group).coerceAtMost(if (constraints.hasBoundedHeight) constraints.maxHeight else Int.MAX_VALUE)
        return layout(width, height) {
            val top = (height - group) / 2
            container.placeRelative((width - container.width) / 2, top)
            label?.placeRelative((width - label.width) / 2, top + container.height + gap)
        }
    }

    override fun IntrinsicMeasureScope.minIntrinsicHeight(measurables: List<IntrinsicMeasurable>, width: Int): Int = intrinsicHeight(measurables, width)

    override fun IntrinsicMeasureScope.maxIntrinsicHeight(measurables: List<IntrinsicMeasurable>, width: Int): Int = intrinsicHeight(measurables, width)

    /** The group's height; with [reserveLabel], one label line's room whether a label is drawn or not. */
    private fun IntrinsicMeasureScope.intrinsicHeight(measurables: List<IntrinsicMeasurable>, width: Int): Int {
        val container = style.containerHeight.roundToPx()
        val label = measurables.getOrNull(1)?.maxIntrinsicHeight(width)
        val room = when {
            label != null && (reserveLabel || labelPart() > 0f) -> style.gap.roundToPx() + label
            reserveLabel -> style.gap.roundToPx() + style.labelTypescale.lineHeight.roundToPx()
            else -> 0
        }
        return container + room
    }
}
