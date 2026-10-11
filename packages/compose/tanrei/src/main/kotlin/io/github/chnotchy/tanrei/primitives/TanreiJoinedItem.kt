package io.github.chnotchy.tanrei.primitives

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.ProvidableCompositionLocal
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.layout.IntrinsicMeasurable
import androidx.compose.ui.layout.IntrinsicMeasureScope
import androidx.compose.ui.layout.Measurable
import androidx.compose.ui.layout.MeasureResult
import androidx.compose.ui.layout.MeasureScope
import androidx.compose.ui.layout.layout
import androidx.compose.ui.node.LayoutModifierNode
import androidx.compose.ui.node.ModifierNodeElement
import androidx.compose.ui.node.ParentDataModifierNode
import androidx.compose.ui.platform.InspectorInfo
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import io.github.chnotchy.tanrei.theme.TanreiTheme

/*
 * The internal channel a button group reaches its items through (BGR-2, BGR-3, and one sentence each in BTN-10 and
 * ICB-10). Not part of any public surface: `TanreiButton` and `TanreiIconButton` read [LocalTanreiJoinedRow]; outside a
 * group it is null and they draw exactly as they always have. The group reaches in exactly two ways when it is
 * connected — the corners that face a neighbour ([TanreiJoinedItem.innerStart] / [TanreiJoinedItem.innerEnd], which its
 * layout sets) and a minimum width ([TanreiJoinedRow.minWidth]) — and, in either form, how far each item's hit area may
 * reach sideways past its visible bounds ([TanreiJoinedItem.reachStart] / [TanreiJoinedItem.reachEnd]): to the middle of
 * the gap between two items, so a press there goes to the nearer one and never covers a neighbour (BGR-4).
 */

/** What a button group tells the Tanrei buttons it holds. */
@Immutable
internal class TanreiJoinedRow(
    /** Connected (BGR-2, BGR-3): the items draw the corners and minimum width below; standard: they draw their own. */
    val connected: Boolean,
    /** `comp.button-group.connected.inner-shape`: the radius of a corner that faces a neighbour. */
    val innerRadius: Dp,
    /** The minimum width of a connected item: `sys.target.touch`. */
    val minWidth: Dp,
)

/** The group an item is laid out by; null outside a button group (and inside an item's own content). */
internal val LocalTanreiJoinedRow: ProvidableCompositionLocal<TanreiJoinedRow?> = staticCompositionLocalOf { null }

/**
 * A button group's hold on one item. The group's layout finds it as the item's parent data, writes where its corners
 * face a neighbour (snapshot state: read by the item's shape in the draw phase, and by its focus ring) and how far its
 * hit area may reach sideways (plain fields, set just before the group measures the item), and reads what the item
 * reported of its VISIBLE size when the group asked for its intrinsic size (the item's own layout also holds the touch
 * target, which a group must not count as visible width or height).
 */
@Stable
internal class TanreiJoinedItem {
    var innerStart: Boolean by mutableStateOf(false)
    var innerEnd: Boolean by mutableStateOf(false)

    /** A Button: narrowed by the group when the row does not fit (BGR-7). An icon button keeps its size. */
    var shrinkable: Boolean = false

    /** Pixels the hit area may reach past the visible bounds at the start and at the end; unlimited until a group says. */
    var reachStart: Int = Int.MAX_VALUE
    var reachEnd: Int = Int.MAX_VALUE

    /**
     * Pixels the hit area may reach above and below the visible bounds — a column of items (a vertical toolbar, TBR-6)
     * sets them; unlimited (the target centred on the item, as a row's items are) until a layout says.
     */
    var reachAbove: Int = Int.MAX_VALUE
    var reachBelow: Int = Int.MAX_VALUE

    /** The visible container's intrinsic sizes, as last asked (pixels). */
    var visualMaxWidth: Int = 0
    var visualMinWidth: Int = 0
    var visualHeight: Int = 0
}

/** The item of the group this Tanrei button is laid out by, for as long as it is; null outside a group. */
@Composable
internal fun rememberTanreiJoinedItem(): TanreiJoinedItem? {
    val row = LocalTanreiJoinedRow.current ?: return null
    return remember(row) { TanreiJoinedItem() }
}

/** The content of a grouped item — its label or icon — is not itself an item of the group. */
@Composable
internal fun WithoutTanreiJoinedRow(content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalTanreiJoinedRow provides null, content = content)
}

/**
 * A Tanrei button's minimum target — [tanreiMinimumTouchTarget] outside a group. Inside one, the same reservation
 * above and below, and sideways no further than [TanreiJoinedItem.reachStart] / [TanreiJoinedItem.reachEnd] allow; the
 * item is the group's parent data, and its visible container reports its intrinsic size to the group. Goes where
 * [tanreiMinimumTouchTarget] goes: after the input, before the visuals.
 */
@Composable
internal fun Modifier.tanreiJoinedTarget(item: TanreiJoinedItem?): Modifier {
    if (item == null) return tanreiMinimumTouchTarget()
    val minimum = TanreiTheme.tokens.measure.targetTouch
    return this
        .then(TanreiJoinedParentData(item))
        .layout { measurable, constraints ->
            val target = minimum.roundToPx()
            // The visible container gets what the group allots it, less the sideways reach.
            val reach = (if (item.reachStart == Int.MAX_VALUE) 0 else item.reachStart) + (if (item.reachEnd == Int.MAX_VALUE) 0 else item.reachEnd)
            val inner = constraints.copy(
                minWidth = (constraints.minWidth - reach).coerceAtLeast(0),
                maxWidth = if (constraints.hasBoundedWidth) (constraints.maxWidth - reach).coerceAtLeast(0) else Constraints.Infinity,
            )
            val placeable = measurable.measure(inner)
            val (start, end) = tanreiJoinedReach(placeable.width, target, item.reachStart, item.reachEnd)
            val width = placeable.width + start + end
            if (item.reachAbove == Int.MAX_VALUE && item.reachBelow == Int.MAX_VALUE) {
                val height = maxOf(placeable.height, target)
                layout(width, height) { placeable.placeRelative(start, (height - placeable.height) / 2) }
            } else {
                // In a column: above and below no further than the layout allows (to the middle of the gap).
                val (above, below) = tanreiJoinedReach(placeable.height, target, item.reachAbove, item.reachBelow)
                layout(width, placeable.height + above + below) { placeable.placeRelative(start, above) }
            }
        }
        .then(TanreiJoinedVisualElement(item))
}

/**
 * How far a hit area [visual] pixels wide reaches past its visible bounds at the start and at the end to be [target]
 * wide: half the missing width on each side, no more than [allowStart] / [allowEnd] (toward a neighbour: the middle of
 * the gap), the side that may reach further taking what the other cannot. Applying it again to its own answer gives the
 * same answer, so a layout can compute it, hand the result to the item as its allowance, and the item draws the same.
 */
internal fun tanreiJoinedReach(visual: Int, target: Int, allowStart: Int, allowEnd: Int): Pair<Int, Int> {
    val missing = (target - visual).coerceAtLeast(0)
    val first = minOf((missing + 1) / 2, allowStart)
    val end = minOf(missing - first, allowEnd)
    val start = minOf(missing - end, allowStart)
    return start to end
}

/** The item as its group's parent data. */
private class TanreiJoinedParentData(private val item: TanreiJoinedItem) : ModifierNodeElement<TanreiJoinedParentDataNode>() {
    override fun create() = TanreiJoinedParentDataNode(item)
    override fun update(node: TanreiJoinedParentDataNode) {
        node.item = item
    }
    override fun InspectorInfo.inspectableProperties() {
        name = "tanreiJoinedParentData"
    }
    override fun equals(other: Any?) = other is TanreiJoinedParentData && other.item === item
    override fun hashCode() = item.hashCode()
}

private class TanreiJoinedParentDataNode(var item: TanreiJoinedItem) : Modifier.Node(), ParentDataModifierNode {
    override fun Density.modifyParentData(parentData: Any?): Any = item
}

/** Records the visible container's intrinsic size into the item when the group asks for the item's. */
private class TanreiJoinedVisualElement(private val item: TanreiJoinedItem) : ModifierNodeElement<TanreiJoinedVisualNode>() {
    override fun create() = TanreiJoinedVisualNode(item)
    override fun update(node: TanreiJoinedVisualNode) {
        node.item = item
    }
    override fun InspectorInfo.inspectableProperties() {
        name = "tanreiJoinedVisual"
    }
    override fun equals(other: Any?) = other is TanreiJoinedVisualElement && other.item === item
    override fun hashCode() = item.hashCode()
}

private class TanreiJoinedVisualNode(var item: TanreiJoinedItem) : Modifier.Node(), LayoutModifierNode {
    override fun MeasureScope.measure(measurable: Measurable, constraints: Constraints): MeasureResult {
        val placeable = measurable.measure(constraints)
        return layout(placeable.width, placeable.height) { placeable.place(0, 0) }
    }

    override fun IntrinsicMeasureScope.maxIntrinsicWidth(measurable: IntrinsicMeasurable, height: Int): Int =
        measurable.maxIntrinsicWidth(height).also { item.visualMaxWidth = it }

    override fun IntrinsicMeasureScope.minIntrinsicWidth(measurable: IntrinsicMeasurable, height: Int): Int =
        measurable.minIntrinsicWidth(height).also { item.visualMinWidth = it }

    override fun IntrinsicMeasureScope.minIntrinsicHeight(measurable: IntrinsicMeasurable, width: Int): Int =
        measurable.minIntrinsicHeight(width).also { item.visualHeight = it }

    override fun IntrinsicMeasureScope.maxIntrinsicHeight(measurable: IntrinsicMeasurable, width: Int): Int = measurable.maxIntrinsicHeight(width)
}

/**
 * The shape of a grouped item: its own corners of [radius], except that a corner facing a neighbour in a connected group
 * is [innerRadius] (BGR-2) — read from [item] when the outline is made, in the draw phase, so the group's layout decides
 * it before the first frame is drawn and a change (an item added or removed, BGR-11) redraws at once.
 */
@Immutable
internal class TanreiJoinedShape(private val item: TanreiJoinedItem, private val radius: Dp, private val innerRadius: Dp, private val smoothing: Float) : Shape {
    override fun createOutline(size: Size, layoutDirection: LayoutDirection, density: Density): Outline =
        tanreiSideCornerShape(if (item.innerStart) innerRadius else radius, if (item.innerEnd) innerRadius else radius, smoothing).createOutline(size, layoutDirection, density)

    override fun equals(other: Any?): Boolean =
        other is TanreiJoinedShape && other.item === item && other.radius == radius && other.innerRadius == innerRadius && other.smoothing == smoothing

    override fun hashCode(): Int = ((item.hashCode() * 31 + radius.hashCode()) * 31 + innerRadius.hashCode()) * 31 + smoothing.hashCode()
}
