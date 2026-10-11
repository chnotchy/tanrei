package io.github.chnotchy.tanrei.components

import android.view.ViewConfiguration
import androidx.compose.animation.core.animate
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.FlingBehavior
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.ScrollScope
import androidx.compose.foundation.gestures.ScrollableDefaults
import androidx.compose.foundation.gestures.ScrollableState
import androidx.compose.foundation.gestures.animateScrollBy
import androidx.compose.foundation.gestures.scrollable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.addOutline
import androidx.compose.ui.graphics.drawOutline
import androidx.compose.ui.layout.onPlaced
import io.github.chnotchy.tanrei.primitives.isDrawn
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.layout
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.CollectionInfo
import androidx.compose.ui.semantics.CollectionItemInfo
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.ScrollAxisRange
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.collectionInfo
import androidx.compose.ui.semantics.collectionItemInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.horizontalScrollAxisRange
import androidx.compose.ui.semantics.isTraversalGroup
import androidx.compose.ui.semantics.scrollBy
import androidx.compose.ui.semantics.scrollToIndex
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import io.github.chnotchy.tanrei.primitives.TanreiReportInvalidValue
import io.github.chnotchy.tanrei.primitives.TanreiReportMissingName
import io.github.chnotchy.tanrei.primitives.TanreiRovingFocus
import io.github.chnotchy.tanrei.primitives.TanreiStateMotion
import io.github.chnotchy.tanrei.primitives.animateTanreiColorAsState
import io.github.chnotchy.tanrei.primitives.collectTanreiInteraction
import io.github.chnotchy.tanrei.primitives.drawnStates
import io.github.chnotchy.tanrei.primitives.rememberTanreiRipple
import io.github.chnotchy.tanrei.primitives.rememberTanreiRovingEntry
import io.github.chnotchy.tanrei.primitives.tanreiContainer
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.primitives.tanreiDecorationOverflow
import io.github.chnotchy.tanrei.primitives.tanreiFocusRing
import io.github.chnotchy.tanrei.primitives.tanreiGroupOpacity
import io.github.chnotchy.tanrei.primitives.tanreiPressInput
import io.github.chnotchy.tanrei.primitives.tanreiRippleInput
import io.github.chnotchy.tanrei.primitives.tanreiRovingItem
import io.github.chnotchy.tanrei.primitives.tanreiRovingKeys
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.tanreiTween
import io.github.chnotchy.tanrei.tokens.TanreiCarouselPart
import io.github.chnotchy.tanrei.tokens.TanreiShadowLayer
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.roundToInt
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.launch

/*
 * `specs/carousel.spec.json` (CRL-1…25) on Compose, as `platforms.compose` maps it: `TanreiCarousel(itemCount,
 * contentDescription, layout, itemWidth) { index -> TanreiCarouselItem(label, onClick) { … } }`, as Material's carousels
 * take an item lambda — built on `Modifier.scrollable` and a custom `Layout`, not Material's carousel. The row's scroll
 * position is a number of items (CRL-12); multi-browse and hero settle at a whole position (CRL-14), uncontained scrolls
 * freely (CRL-13). Every value comes from `TanreiTheme.tokens.carousel`; an item is `TanreiButton`'s chain with the
 * carousel's `parts[item]` tokens.
 */

/** The spec's `layout`: how a [TanreiCarousel] arranges its items. Not a token axis. */
public enum class TanreiCarouselLayout {
    /** As many large items as fit, then a medium and a small one that grow as they scroll toward the start. */
    MultiBrowse,

    /** One large item and a small one after it: one featured item at a time. */
    Hero,

    /** Every item the same width, the last one in view cut by the edge: a plain scrolling row. */
    Uncontained,
}

/**
 * Lets people browse a row of visual items that scrolls sideways. Implements `specs/carousel.spec.json`; every value
 * comes from `TanreiTheme.tokens.carousel`.
 *
 * @param itemCount how many items there are; [content] is called once for each index.
 * @param contentDescription the spec's `label`: names the carousel's list ("Recently played"). Required: an empty one
 *   is reported in debuggable apps (CRL-20).
 * @param modifier applied to the carousel. It is as wide as its parent and `layoutHeight` tall unless the modifier sizes it.
 * @param layout multi-browse (default), hero or uncontained (CRL-9 – CRL-13).
 * @param itemWidth the width of a large item for multi-browse and uncontained; null takes `containerLargeWidth`. Hero
 *   ignores it. One that is not positive is treated as null and reported in debuggable apps (CRL-24).
 * @param content one item per index: a [TanreiCarouselItem].
 */
@Composable
public fun TanreiCarousel(
    itemCount: Int,
    contentDescription: String,
    modifier: Modifier = Modifier,
    layout: TanreiCarouselLayout = TanreiCarouselLayout.MultiBrowse,
    itemWidth: Dp? = null,
    content: @Composable (index: Int) -> Unit,
) {
    val system = TanreiTheme.tokens
    val tokens = system.carousel
    // CRL-20: still renders; reported in debuggable apps.
    if (contentDescription.isBlank()) TanreiReportMissingName("TanreiCarousel", "contentDescription", what = "a carousel without a label")
    // CRL-24: a width that is not positive is no width.
    val width = itemWidth?.takeIf { it.value > 0f && !it.value.isNaN() }
    if (itemWidth != null && width == null) TanreiReportInvalidValue("TanreiCarousel", "itemWidth", itemWidth.toString(), "is not positive", "with containerLargeWidth")
    val rtl = LocalLayoutDirection.current == LayoutDirection.Rtl
    val state = remember { TanreiCarouselState() }
    state.layout = layout
    state.count = itemCount
    val roving = remember { TanreiRovingFocus(wrap = false, horizontal = true, typeahead = false) }
    roving.layoutDirection = LocalLayoutDirection.current
    val scope = rememberCoroutineScope()
    val fling = ViewConfiguration.get(LocalContext.current).scaledMinimumFlingVelocity.toFloat()
    val scroll = tanreiTween<Float>(tokens.motionScrollDuration, tokens.motionScrollEasing)
    state.scrollSpec = scroll
    val settling = layout != TanreiCarouselLayout.Uncontained
    val flingBehavior = if (settling) remember(state, fling) { TanreiCarouselSnap(state, fling) } else ScrollableDefaults.flingBehavior()
    // CRL-14: a scroll that ends between whole positions — a wheel's, which does not fling — settles at the nearest.
    if (settling) {
        LaunchedEffect(state) {
            snapshotFlow { state.scrollable.isScrollInProgress }.filter { !it }.collect {
                val target = state.position.roundToInt().toFloat()
                if (abs(state.position - target) > POSITION_EPSILON) state.animateTo(target)
            }
        }
    }
    val label = contentDescription.takeUnless { it.isBlank() }
    val padding = tokens.layoutPaddingInline
    val gap = tokens.layoutGap
    val target = system.measure.targetTouch
    val slots = remember(itemCount) { List(itemCount) { TanreiCarouselSlot(it) } }
    Layout(
        contents = slots.map { slot ->
            @Composable {
                CompositionLocalProvider(LocalTanreiCarouselSlot provides TanreiCarouselItemContext(slot, state, roving) { index -> scope.launch { state.bringToPlace(index) } }) {
                    content(slot.index)
                }
            }
        },
        modifier = Modifier
            .fillMaxWidth()
            .then(modifier)
            // CRL-8: the carousel's height unless the product sizes it; never below the target (CRL-4).
            .height(tokens.layoutHeight)
            .heightIn(min = target)
            // CRL-8: items scroll under the padding to the edges and are clipped there.
            .clipToBounds()
            // CRL-19: a list named by label, of `itemCount` items; the platform scrolls it for assistive technology.
            .semantics {
                collectionInfo = CollectionInfo(rowCount = 1, columnCount = itemCount)
                isTraversalGroup = true
                if (label != null) this.contentDescription = label
                horizontalScrollAxisRange = ScrollAxisRange(value = { state.position * state.unit }, maxValue = { state.maxPosition * state.unit })
                scrollBy { x, _ ->
                    scope.launch { state.scrollable.animateScrollBy(x, scroll) }
                    true
                }
                scrollToIndex { index ->
                    scope.launch { state.bringToPlace(index) }
                    true
                }
            }
            // CRL-14: touch, pen, trackpad and wheel scrolling; mirrored right to left (CRL-23).
            .scrollable(
                state = state.scrollable,
                orientation = Orientation.Horizontal,
                reverseDirection = ScrollableDefaults.reverseDirection(if (rtl) LayoutDirection.Rtl else LayoutDirection.Ltr, Orientation.Horizontal, false),
                flingBehavior = flingBehavior,
            )
            // CRL-17: the arrow keys, Home and End among the items.
            .tanreiRovingKeys(roving),
    ) { measurables, constraints ->
        val fullWidth = constraints.maxWidth
        val height = constraints.maxHeight
        val pad = padding.toPx()
        val geometry = TanreiCarouselGeometry.of(
            layout = layout,
            inner = fullWidth - 2 * pad,
            padding = pad,
            large = width?.toPx() ?: tokens.containerLargeWidth.toPx(),
            gap = gap.toPx(),
            smallMin = tokens.containerSmallMinWidth.toPx(),
            smallMax = tokens.containerSmallMaxWidth.toPx(),
            count = itemCount,
        )
        state.geometry = geometry
        val targetPx = target.toPx()
        val gapPx = gap.toPx()
        val placed = measurables.mapIndexed { index, contents ->
            val (start, itemWidth) = geometry.itemAt(index, state.position)
            val slot = slots[index]
            slot.width = itemWidth
            slot.contentWidth = geometry.contentWidth
            // CRL-4: the hit area is the item with half the gap on each side, and never below the touch target.
            val node = max(itemWidth + gapPx, targetPx)
            val placeables = contents.map { it.measure(Constraints.fixed(node.roundToInt().coerceAtLeast(0), height)) }
            Triple(placeables, (pad + start + itemWidth / 2f - node / 2f).roundToInt(), index)
        }
        layout(fullWidth, height) {
            for ((placeables, x, _) in placed) placeables.forEach { it.placeRelative(x, 0) }
        }
    }
}

private const val POSITION_EPSILON = 0.001f

/** One item's place, as the carousel's layout last set it: its drawn width and its content's width, in pixels. */
@Stable
internal class TanreiCarouselSlot(val index: Int) {
    var width by mutableFloatStateOf(0f)
    var contentWidth by mutableFloatStateOf(0f)
}

/** What an item learns from its carousel. */
internal class TanreiCarouselItemContext(
    val slot: TanreiCarouselSlot,
    val state: TanreiCarouselState,
    val roving: TanreiRovingFocus,
    /** CRL-18: brings the item to its place. */
    val bringToPlace: (Int) -> Unit,
)

private val LocalTanreiCarouselSlot = staticCompositionLocalOf<TanreiCarouselItemContext?> { null }

/**
 * The row's scroll position — a number of items (CRL-12) — and the geometry of its last layout. A scroll of one large
 * slot and one gap ([unit] pixels) moves it by one.
 */
@Stable
internal class TanreiCarouselState {
    var position by mutableFloatStateOf(0f)
        private set
    var geometry = TanreiCarouselGeometry.Empty
    var layout = TanreiCarouselLayout.MultiBrowse
    var count by mutableIntStateOf(0)
    var scrollSpec: androidx.compose.animation.core.AnimationSpec<Float> = androidx.compose.animation.core.snap()

    val unit: Float get() = geometry.unit.coerceAtLeast(1f)
    val maxPosition: Float get() = geometry.maxPosition

    val scrollable: ScrollableState = ScrollableState { delta ->
        val before = position
        position = (position + delta / unit).coerceIn(0f, maxPosition)
        (position - before) * unit
    }

    /** The whole position the item [index] rests at: slot 0 (multi-browse, hero), or wholly in view (uncontained). */
    fun placeOf(index: Int): Float {
        val max = maxPosition
        if (layout != TanreiCarouselLayout.Uncontained) return index.toFloat().coerceIn(0f, max)
        val g = geometry
        val start = index * g.unit
        val end = start + g.large
        val viewStart = position * g.unit
        val viewEnd = viewStart + g.inner
        return when {
            start < viewStart -> index.toFloat()
            end > viewEnd -> (end - g.inner) / g.unit
            else -> position
        }.coerceIn(0f, max)
    }

    /** CRL-18: moves the row so that [index] is in its place, over the scroll motion (at once where motion is reduced). */
    suspend fun bringToPlace(index: Int) = animateTo(placeOf(index))

    suspend fun animateTo(target: Float) {
        val by = (target - position) * unit
        if (abs(by) < 0.5f) return
        scrollable.animateScrollBy(by, scrollSpec)
    }
}

/**
 * CRL-14: a released drag settles at a whole position — the next one in the direction of a fling (faster than the
 * platform's minimum fling velocity), else the nearest one — over the scroll motion.
 */
private class TanreiCarouselSnap(private val state: TanreiCarouselState, private val fling: Float) : FlingBehavior {
    override suspend fun ScrollScope.performFling(initialVelocity: Float): Float {
        val here = state.position
        val target = when {
            initialVelocity > fling -> ceil(here - POSITION_EPSILON)
            initialVelocity < -fling -> floor(here + POSITION_EPSILON)
            else -> here.roundToInt().toFloat()
        }.coerceIn(0f, state.maxPosition)
        var at = here
        animate(here, target, animationSpec = state.scrollSpec) { value, _ ->
            scrollBy((value - at) * state.unit)
            at = value
        }
        return 0f
    }
}

/**
 * The carousel's slots (CRL-8 – CRL-13), in pixels from the inner start edge: [widths] and [starts] of slots 0 to K − 1,
 * the width of a large item's content ([contentWidth]), the scroll [unit] and the greatest position. Uncontained has no
 * slots: every item is [large] wide, [unit] apart.
 */
@Stable
internal class TanreiCarouselGeometry(
    val layout: TanreiCarouselLayout,
    val inner: Float,
    val padding: Float,
    val large: Float,
    val gap: Float,
    val widths: FloatArray,
    val starts: FloatArray,
    val contentWidth: Float,
    val unit: Float,
    val maxPosition: Float,
) {
    /** Slot [k] (−1 to K): its start and width. Slot −1 ends at the carousel's start edge, slot K starts at its end. */
    private fun slot(k: Int): Pair<Float, Float> {
        val last = widths.size - 1
        return when {
            k < 0 -> (-padding - widths[last]) to widths[last]
            k > last -> (inner + padding) to widths[last]
            else -> starts[k] to widths[k]
        }
    }

    /** Item [index]'s start and width at [position] (CRL-12, CRL-13); an item out of view rests beyond an edge. */
    fun itemAt(index: Int, position: Float): Pair<Float, Float> {
        if (widths.isEmpty()) return 0f to 0f
        // CRL-13: uncontained items sit one unit apart, moved by the scroll.
        if (layout == TanreiCarouselLayout.Uncontained && widths.size == 1 && unit == large + gap) return (index * unit - position * unit) to large
        val k = widths.size
        val s = (index - position).coerceIn(-1f, k.toFloat())
        val lower = floor(s).toInt()
        val t = s - lower
        val (fromStart, fromWidth) = slot(lower)
        if (t == 0f) return fromStart to fromWidth
        val (toStart, toWidth) = slot(lower + 1)
        return (fromStart + (toStart - fromStart) * t) to (fromWidth + (toWidth - fromWidth) * t)
    }

    companion object {
        val Empty = TanreiCarouselGeometry(TanreiCarouselLayout.MultiBrowse, 0f, 0f, 0f, 0f, FloatArray(0), FloatArray(0), 0f, 1f, 0f)

        /**
         * CRL-9 – CRL-11 and CRL-13, the closed formula: [inner] is W, [large] L (itemWidth or the token), [gap] g. Widths
         * are not rounded.
         */
        fun of(layout: TanreiCarouselLayout, inner: Float, padding: Float, large: Float, gap: Float, smallMin: Float, smallMax: Float, count: Int): TanreiCarouselGeometry {
            fun slots(widths: FloatArray, content: Float, unit: Float, largeSlots: Int): TanreiCarouselGeometry {
                val starts = FloatArray(widths.size)
                var x = 0f
                for (i in widths.indices) {
                    starts[i] = x
                    x += widths[i] + gap
                }
                return TanreiCarouselGeometry(layout, inner, padding, content, gap, widths, starts, content, unit, max(0, count - largeSlots).toFloat())
            }
            // CRL-9: too narrow for a large slot and two small ones: one slot, W wide, in every layout.
            if (inner < 3 * smallMin + 2 * gap) return slots(floatArrayOf(inner.coerceAtLeast(0f)), inner.coerceAtLeast(0f), inner.coerceAtLeast(0f) + gap, 1)
            return when (layout) {
                TanreiCarouselLayout.MultiBrowse -> {
                    // CRL-10.
                    val room = inner - 2 * (smallMin + gap)
                    val l = large.coerceAtMost(room)
                    val n = max(1, floor(room / (l + gap)).toInt())
                    val rest = inner - n * (l + gap)
                    var small = ((rest - gap) / 3f).coerceIn(smallMin, smallMax)
                    var medium = rest - gap - small
                    if (medium > l) {
                        medium = l
                        small = rest - gap - l
                    }
                    slots(FloatArray(n) { l } + floatArrayOf(medium, small), l, l + gap, n)
                }
                TanreiCarouselLayout.Hero -> {
                    // CRL-11: itemWidth is ignored.
                    val l = inner - gap - smallMax
                    slots(floatArrayOf(l, smallMax), l, l + gap, 1)
                }
                TanreiCarouselLayout.Uncontained -> {
                    // CRL-13: every item L wide (at most W), free scrolling up to where the last one ends at the inner end.
                    val l = large.coerceAtMost(inner)
                    val span = count * (l + gap) - gap
                    val unit = l + gap
                    TanreiCarouselGeometry(layout, inner, padding, l, gap, floatArrayOf(l), floatArrayOf(0f), l, unit, (max(0f, span - inner) / unit))
                }
            }
        }
    }
}

/**
 * One item of a [TanreiCarousel] (the spec's item kind `item`): the product's content in a rounded box, one action named
 * by [label]. Call it in the carousel's content lambda, once per index.
 *
 * @param label the item's accessible name: what its content shows ("Coast path, 12 photos"). Required: an empty one still
 *   renders, and a debuggable app reports it (CRL-20). The content itself is not read.
 * @param onClick the item's `click`: pointer, touch, Enter, Space or assistive technology (CRL-1).
 * @param modifier applied to the item.
 * @param interactionSource hoist to observe or drive hover, focus and press.
 * @param content what the item shows (an image): laid out at a large item's width and the carousel's height, centred and
 *   clipped, handed the item's content color. It must hold no interactive element (CRL-20).
 */
@Composable
public fun TanreiCarouselItem(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    interactionSource: MutableInteractionSource? = null,
    content: @Composable () -> Unit,
) {
    val context = LocalTanreiCarouselSlot.current
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val system = TanreiTheme.tokens
    val tokens = system.carousel
    // CRL-20: still renders and still works; reported in debuggable apps.
    if (label.isBlank()) TanreiReportMissingName("TanreiCarouselItem", "label", what = "a carousel item without a label")
    val index = context?.slot?.index ?: 0
    // CRL-17: one Tab stop — the item that had focus last, else the one in place.
    val roving = context?.roving
    val inPlace = context != null && context.state.position.roundToInt() == index
    val entry = rememberTanreiRovingEntry(roving, focusable = true, enabled = true, selected = inPlace, text = label)

    // CRL-2: one state wins; CRL-5: a press counts from the first frame and for at least press-hold.
    val interaction = source.collectTanreiInteraction(enabled = true)
    // CRL-6: the pressed tokens say WHAT a press looks like; `pressed-feedback` says how it arrives.
    val feedback = system.behavior.pressedFeedback
    val drawnStates = interaction.drawnStates(feedback)
    val look = tokens.parts[TanreiCarouselPart.Item]
    // CRL-22: the colors move over the state motion; entering pressed snaps.
    val motion = TanreiStateMotion(interaction.state, tokens.motionStateDuration, tokens.motionStateEasing)
    // CRL-16: the container under the content is the resting fill; hover, focus and press are a state layer OVER the
    // content — the state's state-layer color at its `sys.state` opacity — so they show on an opaque image. The layer
    // follows the state the container would (under ripple and dim, the state under the press).
    val restingColor = look.enabled.containerColor.color
    val layerState = drawnStates.container
    val layerTarget = look[layerState].stateLayerColor.color.let { color -> color.copy(alpha = color.alpha * system.state.layerOpacity(layerState)) }
    val layerColor = animateTanreiColorAsState(layerTarget, motion, label = "state layer")
    val contentColor by animateTanreiColorAsState(look[drawnStates.content].contentColor.color, motion, label = "content")
    val opacity = animateFloatAsState(tokens.opacity(drawnStates.content), motion.spec(), label = "opacity")
    val radius = tokens.containerShape(drawnStates.content)
    // CRL-7: the corners, eased by corner smoothing.
    val smoothing = system.shape.cornerSmoothing
    val shape = remember(radius, smoothing) { tanreiContainerShape(radius, smoothing) }
    // CRL-6 / CRL-16, ripple: the pressed state layer, in the same layer over the content, from the point of contact;
    // a press on the gap beside the item grows from its center.
    val pressedLayer = look.pressed.stateLayerColor.color.let { it.copy(alpha = it.alpha * system.state.pressedStateLayerOpacity) }
    val ripple = rememberTanreiRipple(
        feedback = feedback,
        interaction = interaction,
        color = pressedLayer,
        feedbackDurationMillis = tokens.motionFeedbackDuration,
        stateDurationMillis = tokens.motionStateDuration,
        stateEasing = tokens.motionStateEasing,
        centerOutsideContainer = true,
    )
    val named = label.takeUnless { it.isBlank() }
    val bring = context?.bringToPlace
    val container = modifier
        // CRL-19: one button named by its label, with its position among the items.
        .semantics {
            if (named != null) contentDescription = named
            collectionItemInfo = CollectionItemInfo(rowIndex = 0, rowSpan = 1, columnIndex = index, columnSpan = 1)
        }
        .tanreiRovingItem(roving, entry, focusable = true)
        // CRL-18: keyboard focus brings the item to its place.
        .onFocusChanged { if (it.isFocused) bring?.invoke(index) }
        // CRL-1: once per activation; a press that becomes a scroll activates nothing.
        .clickable(interactionSource = source, indication = null, role = Role.Button, onClick = onClick)
        .tanreiPressInput(interaction.press)
        .tanreiRippleInput(ripple)
        // CRL-4: the node is the hit area; the item is drawn at its own width in the middle of it.
        .layout { measurable, constraints ->
            val drawn = (context?.slot?.width ?: constraints.maxWidth.toFloat()).roundToInt().coerceIn(0, constraints.maxWidth)
            val placeable = measurable.measure(Constraints.fixed(drawn, constraints.maxHeight))
            layout(constraints.maxWidth, constraints.maxHeight) { placeable.placeRelative((constraints.maxWidth - drawn) / 2, 0) }
        }
        // CRL-6 dim: the pressed opacity on the whole item.
        .tanreiGroupOpacity(overflow = tanreiDecorationOverflow(system, NoShadow)) { opacity.value }
        // CRL-3: inside the container, which the row would otherwise clip; keyboard focus only, never animated.
        .tanreiFocusRing(source, cornerRadius = radius, inside = true)
        // CRL-16: the resting fill under the content.
        .tanreiContainer(shape, containerColor = { restingColor }, outlineColor = Color.Transparent, outlineWidth = Dp.Hairline)
        // CRL-16: the state layer and the ripple over the content, in the container's shape.
        .then(if (ripple != null) Modifier.onPlaced { ripple.container = it } else Modifier)
        .drawWithCache {
            val outline = shape.createOutline(size, layoutDirection, this)
            val clip = Path().apply { addOutline(outline) }
            onDrawWithContent {
                drawContent()
                layerColor.value.let { if (it.isDrawn) drawOutline(outline, it) }
                if (ripple != null) ripple.run { draw(clip, outline) }
            }
        }
        // CRL-15: the content is clipped to the container's corners.
        .clip(shape)
    Box(container) {
        // CRL-15: the content at a large item's width and the full height, centred, so a narrower item shows its middle.
        Layout(
            content = {
                Box(Modifier.clearAndSetSemantics {}) {
                    CompositionLocalProvider(LocalTanreiContentColor provides contentColor, content = content)
                }
            },
        ) { measurables, constraints ->
            val width = (context?.slot?.contentWidth ?: constraints.maxWidth.toFloat()).roundToInt().coerceAtLeast(0)
            val placeables = measurables.map { it.measure(Constraints.fixed(width, constraints.maxHeight)) }
            layout(constraints.maxWidth, constraints.maxHeight) {
                placeables.forEach { it.place((constraints.maxWidth - width) / 2, 0) }
            }
        }
    }
}

/** `sys.state`'s state-layer opacity of [state] (CRL-16); none at rest. */
private fun io.github.chnotchy.tanrei.tokens.TanreiState.layerOpacity(state: TanreiInteractionState): Float = when (state) {
    TanreiInteractionState.Hovered -> hoverStateLayerOpacity
    TanreiInteractionState.Focused -> focusStateLayerOpacity
    TanreiInteractionState.Pressed -> pressedStateLayerOpacity
    TanreiInteractionState.Enabled, TanreiInteractionState.Disabled -> 0f
}

/** An item draws no shadow. */
private val NoShadow: List<TanreiShadowLayer> = emptyList()
