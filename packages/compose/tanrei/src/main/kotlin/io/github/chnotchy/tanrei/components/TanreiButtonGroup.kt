package io.github.chnotchy.tanrei.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.Measurable
import androidx.compose.ui.layout.MeasurePolicy
import androidx.compose.ui.layout.MeasureResult
import androidx.compose.ui.layout.MeasureScope
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.isTraversalGroup
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import io.github.chnotchy.tanrei.primitives.LocalTanreiJoinedRow
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiJoinedItem
import io.github.chnotchy.tanrei.primitives.TanreiJoinedRow
import io.github.chnotchy.tanrei.primitives.isTanreiDebuggable
import io.github.chnotchy.tanrei.primitives.tanreiJoinedReach
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.tokens.TanreiButtonGroupTokens
import kotlin.math.roundToInt

/*
 * `specs/button-group.spec.json` (BGR-1…11) on Compose, as `platforms.compose` maps it:
 * `TanreiButtonGroup(variant, contentDescription) { TanreiButton(…); TanreiIconButton(…) }` — a row whose items read a
 * `CompositionLocal` (`LocalTanreiJoinedRow`, internal) for their inner corners, their minimum width and how far their hit
 * areas may reach sideways. The group draws nothing and answers no interaction: each item is a Tanrei Button or icon
 * button as anywhere, with its own tokens, states, events, semantics and Tab stop (BGR-5).
 */

/**
 * The spec's `variant`: [Standard] spaces the buttons `standardGap` apart; [Connected] joins them `connectedGap` apart
 * with the inner corners `connectedInnerShape`, each at least a target wide and all as tall as the tallest. A closed set:
 * the two differ in structure, not only in values, so a design system does not add values (every value the spec defines
 * is here, so no unknown one can be passed — BGR-9).
 */
public enum class TanreiButtonGroupVariant { Standard, Connected }

/**
 * A row of related Tanrei Buttons and icon buttons (toggles included), spaced apart or joined into one shape.
 * Implements `specs/button-group.spec.json`; every value it reads is `TanreiTheme.tokens.buttonGroup`
 * ([TanreiButtonGroupTokens]) — the buttons keep their own tokens.
 *
 * @param modifier applied to the row.
 * @param variant [TanreiButtonGroupVariant.Standard] (default) or [TanreiButtonGroupVariant.Connected].
 * @param contentDescription the spec's `label`: when not empty the row is a traversal group with this name ("Text style")
 *   — Compose has no group role —; when empty it adds nothing to the tree, only its items (BGR-6).
 * @param content the items, in order: `TanreiButton`s and `TanreiIconButton`s, as anywhere. Anything else, or fewer than
 *   two items, still renders, and a debuggable app reports it (BGR-10).
 */
@Composable
public fun TanreiButtonGroup(
    modifier: Modifier = Modifier,
    variant: TanreiButtonGroupVariant = TanreiButtonGroupVariant.Standard,
    contentDescription: String = "",
    content: @Composable () -> Unit,
) {
    val system = TanreiTheme.tokens
    val tokens = system.buttonGroup
    val connected = variant == TanreiButtonGroupVariant.Connected
    val row = remember(connected, tokens.connectedInnerShape, system.measure.targetTouch) {
        TanreiJoinedRow(connected = connected, innerRadius = tokens.connectedInnerShape, minWidth = system.measure.targetTouch)
    }
    val label = contentDescription.takeUnless { it.isBlank() }
    // BGR-7 / BGR-10: what the layout finds is reported in debuggable apps only.
    val debuggable = isTanreiDebuggable()
    Layout(
        // BGR-6: a named group only when it has a label; otherwise nothing of its own in the tree.
        modifier = if (label != null) modifier.semantics { isTraversalGroup = true; this.contentDescription = label } else modifier,
        content = { CompositionLocalProvider(LocalTanreiJoinedRow provides row, content = content) },
        measurePolicy = remember(connected, tokens, system.measure.targetTouch, debuggable) {
            TanreiButtonGroupPolicy(connected, if (connected) tokens.connectedGap else tokens.standardGap, system.measure.targetTouch, debuggable)
        },
    )
}

/**
 * BGR-1, BGR-3, BGR-4, BGR-7, BGR-8, BGR-11: the row. Each item at its own VISIBLE width (a Button's natural width, an
 * icon button's size — at least a target wide when connected, which the item does itself), [gap] between visible
 * bounds; when the row is wider than the layout allows, the Buttons are narrowed in proportion to their widths, no
 * narrower than their longest word (their labels wrap), the icon buttons kept; a row that still does not fit overflows
 * its end and is reported. Each item's hit area reaches past its visible bounds as its target asks, above and below as
 * far as it likes, sideways at most to the middle of the gap toward a neighbour (so a press in the gap goes to the
 * nearer item, BGR-4). Connected: every item stretched to the tallest visible height, and each corner that faces a
 * neighbour marked inner (BGR-2, at once — BGR-11). Placed from the start edge (right-to-left mirrors, BGR-8); items
 * centred on the row's middle.
 */
private class TanreiButtonGroupPolicy(
    private val connected: Boolean,
    private val gap: Dp,
    private val target: Dp,
    private val debuggable: Boolean,
) : MeasurePolicy {
    override fun MeasureScope.measure(measurables: List<Measurable>, constraints: Constraints): MeasureResult {
        val count = measurables.size
        if (count == 0) return layout(constraints.minWidth, constraints.minHeight) {}
        val items = measurables.map { it.parentData as? TanreiJoinedItem }
        if (debuggable) {
            if (items.any { it == null }) TanreiDiagnostics.report("button-group/content", "TanreiButtonGroup: it holds content that is not a Tanrei Button or icon button; it is laid out, but the group cannot set its corners or width.")
            if (count < 2) TanreiDiagnostics.report("button-group/count", "TanreiButtonGroup: it holds $count item; a button group holds two or more.")
        }
        val gapPx = gap.roundToPx()
        val targetPx = target.roundToPx()
        // The visible widths: an item's own (its intrinsic size records what is visible), or the whole of foreign content.
        val natural = IntArray(count) { i ->
            val width = measurables[i].maxIntrinsicWidth(Constraints.Infinity)
            items[i]?.visualMaxWidth ?: width
        }
        val least = IntArray(count) { i ->
            val item = items[i]
            if (item?.shrinkable == true) {
                measurables[i].minIntrinsicWidth(Constraints.Infinity)
                minOf(item.visualMinWidth, natural[i])
            } else {
                natural[i]
            }
        }
        val widths = natural.copyOf()
        // Sideways reach of each item's hit area: half the missing target width on each side, no more than half the gap
        // toward a neighbour; the outer ends take what the inner sides cannot.
        fun reach(i: Int, width: Int) = tanreiJoinedReach(width, targetPx, if (i == 0) Int.MAX_VALUE else gapPx - gapPx / 2, if (i == count - 1) Int.MAX_VALUE else gapPx / 2)
        fun reachStart(i: Int, width: Int) = reach(i, width).first
        fun reachEnd(i: Int, width: Int) = reach(i, width).second
        fun total(): Int = widths.sum() + (count - 1) * gapPx + reachStart(0, widths[0]) + reachEnd(count - 1, widths[count - 1])
        // BGR-7: narrow the Buttons in proportion to their widths, down to their longest word.
        if (constraints.hasBoundedWidth && total() > constraints.maxWidth) {
            repeat(count) {
                val excess = total() - constraints.maxWidth
                if (excess <= 0) return@repeat
                val room = (0 until count).filter { widths[it] > least[it] }
                if (room.isEmpty()) return@repeat
                val weight = room.sumOf { widths[it] }.toFloat()
                for (i in room) widths[i] = (widths[i] - (excess * widths[i] / weight).roundToInt().coerceAtLeast(1)).coerceAtLeast(least[i])
            }
            if (debuggable && total() > constraints.maxWidth) {
                TanreiDiagnostics.report("button-group/fit", "TanreiButtonGroup: the row needs ${total()} px but has ${constraints.maxWidth} px; it overflows its end.")
            }
        }
        // BGR-2 / BGR-11: which corners face a neighbour, decided now, before the first frame is drawn.
        items.forEachIndexed { i, item ->
            item ?: return@forEachIndexed
            item.innerStart = connected && i > 0
            item.innerEnd = connected && i < count - 1
            item.reachStart = reachStart(i, widths[i])
            item.reachEnd = reachEnd(i, widths[i])
        }
        val starts = IntArray(count) { items[it]?.let { item -> item.reachStart } ?: 0 }
        val ends = IntArray(count) { items[it]?.let { item -> item.reachEnd } ?: 0 }
        // BGR-1: connected — every item as tall as the tallest visible one.
        val stretch = if (connected) {
            (0 until count).maxOf { i ->
                val height = measurables[i].minIntrinsicHeight(widths[i] + starts[i] + ends[i])
                items[i]?.visualHeight ?: height
            }
        } else {
            0
        }
        val placeables = measurables.mapIndexed { i, measurable ->
            val width = widths[i] + starts[i] + ends[i]
            measurable.measure(Constraints(minWidth = 0, maxWidth = width, minHeight = stretch, maxHeight = Constraints.Infinity))
        }
        val height = maxOf(constraints.minHeight, placeables.maxOf { it.height })
        // Each item's hit box starts where its visible bounds start, less its reach.
        val lefts = IntArray(count)
        var visible = 0
        for (i in 0 until count) {
            lefts[i] = if (i == 0) 0 else visible - starts[i]
            visible = lefts[i] + starts[i] + (placeables[i].width - starts[i] - ends[i]) + gapPx
        }
        val width = (lefts[count - 1] + placeables[count - 1].width).let { if (constraints.hasBoundedWidth) it.coerceIn(constraints.minWidth, constraints.maxWidth) else maxOf(it, constraints.minWidth) }
        return layout(width, height) {
            placeables.forEachIndexed { i, placeable -> placeable.placeRelative(lefts[i], (height - placeable.height) / 2) }
        }
    }
}
