package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.Measurable
import androidx.compose.ui.layout.MeasurePolicy
import androidx.compose.ui.layout.MeasureResult
import androidx.compose.ui.layout.MeasureScope
import androidx.compose.ui.layout.layout
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.isTraversalGroup
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import io.github.chnotchy.tanrei.primitives.LocalTanreiJoinedRow
import io.github.chnotchy.tanrei.primitives.ProvideTanreiRovingGroup
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiJoinedItem
import io.github.chnotchy.tanrei.primitives.TanreiJoinedRow
import io.github.chnotchy.tanrei.primitives.TanreiReportMissingName
import io.github.chnotchy.tanrei.primitives.TanreiReportUnknownValue
import io.github.chnotchy.tanrei.primitives.TanreiRovingFocus
import io.github.chnotchy.tanrei.primitives.isDrawn
import io.github.chnotchy.tanrei.primitives.isTanreiDebuggable
import io.github.chnotchy.tanrei.primitives.tanreiContainer
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.primitives.tanreiElevation
import io.github.chnotchy.tanrei.primitives.tanreiJoinedReach
import io.github.chnotchy.tanrei.primitives.tanreiRovingKeys
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.TanreiToolbarTokens
import io.github.chnotchy.tanrei.tokens.TanreiToolbarVariant

/*
 * `specs/toolbar.spec.json` (TBR-1…14) on Compose, as `platforms.compose` maps it:
 * `TanreiToolbar(contentDescription, modifier, variant, orientation, windowInsets) { … }`, the items called in its content
 * lambda — the product's own `TanreiIconButton`s (the `action` kind: `contentDescription`, `variant`, `checked` with
 * `onCheckedChange` for a toggle, `enabled`, `onClick`) and `TanreiButton`s (the `button` kind: `variant`, `enabled`,
 * `onClick`). The toolbar lays them out and moves keyboard focus among them; it never restyles them (TBR-9). It reaches
 * them through two internal channels, not their public surface: `LocalTanreiJoinedRow` (a standard, unconnected row: each
 * item placed by its VISIBLE bounds, its hit area reaching to the middle of the space toward a neighbour) and
 * `LocalTanreiRovingGroup` (the roving Tab stop, TBR-10).
 */

/** What [TanreiToolbar] takes when a product says nothing else. */
public object TanreiToolbarDefaults {
    /**
     * TBR-3 / TBR-5: the insets a toolbar of [variant] reaches under with its color and keeps its items out of — the
     * navigation bars for a docked toolbar (and for a value a design system added, which lays out as docked), none for a
     * floating one, which the layout that holds it places clear of them.
     */
    @Composable
    public fun windowInsets(variant: TanreiToolbarVariant): WindowInsets =
        if (variant == TanreiToolbarVariant.Floating) WindowInsets(0.dp, 0.dp, 0.dp, 0.dp) else WindowInsets.navigationBars
}

/**
 * A short row of actions for the current screen or selection, docked across the bottom edge or floating over the content.
 * Implements `specs/toolbar.spec.json`; every value it reads is `TanreiTheme.tokens.toolbar` ([TanreiToolbarTokens]) —
 * the items keep their own tokens, states, press, focus ring, target and semantics (TBR-9).
 *
 * Compose has no toolbar role: the toolbar is a traversal group (`isTraversalGroup`) named by [contentDescription] that
 * holds its items in order, and adds nothing to them (TBR-11). It is one Tab stop — the item focused last, else the first
 * enabled one —; while an item has keyboard focus, Right and Left Arrow (horizontal; mirrored right-to-left) or Down and
 * Up Arrow (vertical) move to the next and previous enabled item, wrapping, and Home and End to the ends, activating
 * nothing (TBR-10). It uses `TanreiRovingFocus`, the primitive the list, the menu and the tabs use.
 *
 * @param contentDescription the spec's `label`: names the toolbar ("Formatting"); never drawn. Required: an empty one still
 *   renders, and a debuggable app reports it (TBR-12).
 * @param modifier applied to the toolbar's container.
 * @param variant a key of `tokens.toolbar.variants`: [TanreiToolbarVariant.Docked] (default) spans the width it is given,
 *   reaches under [windowInsets] and spreads its items; [TanreiToolbarVariant.Floating] is a raised, rounded surface as
 *   long as its items, placed by the layout that holds it (TBR-5). Open: a design system may add values,
 *   which lay out as docked; a value it does not have draws with docked's tokens, and a debuggable app reports it (TBR-13).
 * @param orientation foundation's [Orientation] (as the divider takes it): [Orientation.Horizontal] (default) or
 *   [Orientation.Vertical] (a floating toolbar's; a docked toolbar stays horizontal and a debuggable app reports it —
 *   TBR-6). A closed enum: no value outside the spec can be passed (TBR-13).
 * @param windowInsets the system insets the toolbar's color reaches under and its items keep out of (TBR-3):
 *   [TanreiToolbarDefaults.windowInsets] — `WindowInsets.navigationBars` for docked, none for floating.
 * @param content the items, in reading order: `TanreiIconButton`s and `TanreiButton`s. None, or anything else (a field or
 *   a slider would take the arrow keys), still lays out, and a debuggable app reports it (TBR-12).
 */
@Composable
public fun TanreiToolbar(
    contentDescription: String,
    modifier: Modifier = Modifier,
    variant: TanreiToolbarVariant = TanreiToolbarVariant.Docked,
    orientation: Orientation = Orientation.Horizontal,
    windowInsets: WindowInsets = TanreiToolbarDefaults.windowInsets(variant),
    content: @Composable () -> Unit,
) {
    val system = TanreiTheme.tokens
    val tokens = system.toolbar
    // TBR-13: the lookup is total — a value this design system does not have reads docked's tokens.
    if (variant !in tokens.variants) TanreiReportUnknownValue(system.id, "TanreiToolbar", "variant", variant.key)
    val look = tokens.variants[variant]
    val floating = variant == TanreiToolbarVariant.Floating
    // TBR-12: still rendered; reported in debuggable apps.
    val label = contentDescription.takeUnless { it.isBlank() }
    if (label == null) TanreiReportMissingName("TanreiToolbar", "contentDescription", what = "a toolbar without a label")
    // TBR-6: a docked toolbar is horizontal.
    val vertical = orientation == Orientation.Vertical && floating
    if (orientation == Orientation.Vertical && !floating) TanreiReportToolbarProblem("TanreiToolbar: a docked toolbar is horizontal; orientation Vertical is laid out as Horizontal.")

    // TBR-10: one Tab stop, the arrow keys along the axis, wrapping; no type-ahead, and moving focus activates nothing.
    val roving = remember(vertical) { TanreiRovingFocus(wrap = true, horizontal = !vertical, typeahead = false) }
    val direction = LocalLayoutDirection.current
    SideEffect { roving.layoutDirection = direction }
    // The items as a standard (unconnected) row: placed by their visible bounds, their targets their own (TBR-9).
    val row = remember(system.measure.targetTouch) { TanreiJoinedRow(connected = false, innerRadius = 0.dp, minWidth = system.measure.targetTouch) }

    // TBR-1 / TBR-4: the variant's container — color, elevation, corners eased by corner smoothing, and edge.
    val shape = remember(look.containerShape, system.shape.cornerSmoothing) { tanreiContainerShape(look.containerShape, system.shape.cornerSmoothing) }
    val containerColor = look.containerColor.color
    val outlineColor = look.outlineColor.color
    val outlineWidth = tokens.outlineWidth

    // TBR-8: the items scroll along the axis when they do not fit; the focused one is brought into view by its own focus.
    val scroll = rememberScrollState()
    TanreiReportToolbarOverflow(scroll)
    val debuggable = isTanreiDebuggable()

    val named = if (label != null) Modifier.semantics { isTraversalGroup = true; this.contentDescription = label } else Modifier.semantics { isTraversalGroup = true }
    val container = if (floating) {
        // TBR-4: an edge around the whole shape. TBR-5: at its own size, where the layout that holds it places it.
        modifier
            .then(named)
            .tanreiElevation(look.containerElevation, shape)
            .tanreiContainer(shape, containerColor = { containerColor }, outlineColor = outlineColor, outlineWidth = outlineWidth)
    } else {
        // TBR-1 / TBR-3: the full width, the color reaching under the insets; the edge is the top one only, drawn over the
        // items (the container draws none).
        modifier
            .fillMaxWidth()
            .then(named)
            .tanreiElevation(look.containerElevation, shape)
            .tanreiContainer(shape, containerColor = { containerColor }, outlineColor = Color.Transparent, outlineWidth = outlineWidth)
            .drawWithContent {
                drawContent()
                val thickness = outlineWidth.toPx()
                if (outlineColor.isDrawn && thickness > 0f) drawRect(outlineColor, topLeft = Offset.Zero, size = Size(size.width, thickness))
            }
    }
    // The layout itself is the scrolled content: it receives the width the container has (a docked toolbar's full width,
    // less the insets) as its minimum, and spreads its items across it.
    Layout(
        modifier = container
            .windowInsetsPadding(windowInsets)
            .tanreiToolbarRoomAlongAxis(vertical)
            .then(if (vertical) Modifier.verticalScroll(scroll) else Modifier.horizontalScroll(scroll))
            .tanreiRovingKeys(roving),
        content = {
            CompositionLocalProvider(LocalTanreiJoinedRow provides row) {
                ProvideTanreiRovingGroup(roving, content)
            }
        },
        measurePolicy = remember(look, vertical, floating, system.measure.targetTouch, roving, debuggable) {
            TanreiToolbarPolicy(
                vertical = vertical,
                spread = !floating,
                padding = look.containerPaddingInline,
                gap = look.containerGap,
                size = look.containerSize,
                target = system.measure.targetTouch,
                roving = roving,
                debuggable = debuggable,
            )
        },
    )
}

/**
 * TBR-2, TBR-4, TBR-6, TBR-8, TBR-14: the items along the axis at their own VISIBLE length, [padding] from each end and at
 * least [gap] apart. [spread] (docked): a wider layout spreads the extra equally between neighbours, and one item is
 * centred; otherwise (floating) the toolbar is as long as its items need. Across the axis the toolbar is at least [size]
 * and grows to hold its tallest item's target (TBR-14); every item is centred across it. Each item's hit area reaches
 * past its visible bounds toward a neighbour no further than the middle of the space between them, and toward an end no
 * further than the padding. Items are never shrunk, wrapped or hidden: a row that needs more length than the layout has
 * is scrolled by the container (TBR-8). Placed from the start edge; right-to-left mirrors a row (TBR-7).
 */
private class TanreiToolbarPolicy(
    private val vertical: Boolean,
    private val spread: Boolean,
    private val padding: Dp,
    private val gap: Dp,
    private val size: Dp,
    private val target: Dp,
    private val roving: TanreiRovingFocus,
    private val debuggable: Boolean,
) : MeasurePolicy {
    override fun MeasureScope.measure(measurables: List<Measurable>, constraints: Constraints): MeasureResult {
        val count = measurables.size
        val paddingPx = padding.roundToPx()
        val gapPx = gap.roundToPx()
        val sizePx = size.roundToPx()
        val targetPx = target.roundToPx()
        if (debuggable) {
            // TBR-12: nothing to act on, or something that is not a Tanrei button (it would keep its own Tab stop).
            if (count == 0) TanreiDiagnostics.report("toolbar/empty", "TanreiToolbar: it holds no item; a toolbar holds icon buttons and buttons.")
            else if (roving.size < count) TanreiDiagnostics.report("toolbar/content", "TanreiToolbar: it holds content that is not a Tanrei icon button or button; it is laid out, but a field or a slider would take the arrow keys the toolbar moves focus with.")
        }
        val items = measurables.map { it.parentData as? TanreiJoinedItem }
        // The visible length of each item along the axis (the item records it when asked for its intrinsic size), or the
        // whole of foreign content.
        val lengths = IntArray(count) { i ->
            val measurable = measurables[i]
            if (vertical) {
                val whole = measurable.minIntrinsicHeight(Constraints.Infinity)
                items[i]?.visualHeight ?: whole
            } else {
                val whole = measurable.maxIntrinsicWidth(Constraints.Infinity)
                items[i]?.visualMaxWidth ?: whole
            }
        }
        val gaps = (count - 1).coerceAtLeast(0)
        val needed = 2 * paddingPx + lengths.sum() + gaps * gapPx
        val length = maxOf(needed, if (vertical) constraints.minHeight else constraints.minWidth)
        val extra = length - needed
        // TBR-2: docked spreads the extra between neighbours; one item (or a floating toolbar given more room) is centred.
        val spreads = spread && count > 1
        val between = IntArray(gaps) { if (spreads) extra / gaps + if (it < extra % gaps) 1 else 0 else 0 }
        val lead = paddingPx + if (spreads) 0 else extra / 2
        val before = IntArray(count) { if (it == 0) lead else gapPx + between[it - 1] }
        val after = IntArray(count) { if (it == count - 1) length - lead - lengths.sum() - between.sum() - gaps * gapPx else gapPx + between[it] }

        // Each item's hit area — its own target — reaches toward a neighbour no further than the middle of the space
        // between them, and toward an end no further than the space there.
        val allowBefore = IntArray(count) { if (it == 0) before[it] else before[it] - before[it] / 2 }
        val allowAfter = IntArray(count) { if (it == count - 1) after[it] else after[it] / 2 }
        items.forEachIndexed { i, item ->
            item ?: return@forEachIndexed
            if (vertical) {
                item.reachAbove = allowBefore[i]
                item.reachBelow = allowAfter[i]
                item.reachStart = Int.MAX_VALUE
                item.reachEnd = Int.MAX_VALUE
            } else {
                item.reachStart = allowBefore[i]
                item.reachEnd = allowAfter[i]
                item.reachAbove = Int.MAX_VALUE
                item.reachBelow = Int.MAX_VALUE
            }
        }
        // TBR-8 / TBR-14: every item at its own size, never shrunk.
        val placeables = measurables.map { it.measure(Constraints()) }
        val across = maxOf(sizePx, placeables.maxOfOrNull { if (vertical) it.width else it.height } ?: 0, if (vertical) constraints.minWidth else constraints.minHeight)
        return layout(if (vertical) across else length, if (vertical) length else across) {
            var at = 0
            placeables.forEachIndexed { i, placeable ->
                val visibleStart = at + before[i]
                // Where the visible bounds start inside the item's box: past the part of its hit area before them.
                val reach = if (items[i] != null) tanreiJoinedReach(lengths[i], targetPx, allowBefore[i], allowAfter[i]).first else 0
                if (vertical) placeable.placeRelative((across - placeable.width) / 2, visibleStart - reach)
                else placeable.placeRelative(visibleStart - reach, (across - placeable.height) / 2)
                at = visibleStart + lengths[i]
            }
        }
    }
}

/**
 * TBR-8: the items scroll only when they need more length than the toolbar HAS. A parent that sets no limit along the
 * toolbar's axis — a vertical toolbar in a Row of a vertically scrolling page, a horizontal one in a horizontally
 * scrolling row — has room for every item, so there is nothing to scroll; but a scroll container measured with an
 * infinite length along its axis throws. There the scroll container is given the longest finite length a constraint
 * can hold instead: it measures its items with no limit, as always, takes their length (never more) and its scroll
 * range is 0, so nothing scrolls and no overflow is reported. A bounded parent's constraints pass through unchanged.
 */
private fun Modifier.tanreiToolbarRoomAlongAxis(vertical: Boolean): Modifier = layout { measurable, constraints ->
    val room = when {
        vertical && !constraints.hasBoundedHeight ->
            Constraints.fitPrioritizingWidth(constraints.minWidth, constraints.maxWidth, constraints.minHeight, Constraints.Infinity - 1)
        !vertical && !constraints.hasBoundedWidth ->
            Constraints.fitPrioritizingHeight(constraints.minWidth, Constraints.Infinity - 1, constraints.minHeight, constraints.maxHeight)
        else -> constraints
    }
    val placeable = measurable.measure(room)
    layout(placeable.width, placeable.height) { placeable.placeRelative(0, 0) }
}

/** Debuggable apps only (TBR-6, TBR-12): one report per message and composition site. */
@Composable
private fun TanreiReportToolbarProblem(message: String) {
    if (!isTanreiDebuggable()) return
    remember(message) { TanreiDiagnostics.reporter(message) }
}

/** Debuggable apps only (TBR-8): the items need more length than the toolbar has — the extra actions belong in an overflow menu. */
@Composable
private fun TanreiReportToolbarOverflow(scroll: ScrollState) {
    if (!isTanreiDebuggable()) return
    LaunchedEffect(scroll) {
        snapshotFlow { scroll.maxValue.let { it > 0 && it != Int.MAX_VALUE } }.collect { overflowing ->
            if (overflowing) TanreiDiagnostics.reporter("TanreiToolbar: its items need more length than it has; they scroll, and the extra actions belong in an overflow menu the product provides (a Tanrei menu on a \"More\" icon button).")
        }
    }
}
