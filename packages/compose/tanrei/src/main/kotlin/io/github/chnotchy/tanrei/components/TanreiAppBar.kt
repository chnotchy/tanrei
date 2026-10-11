package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.displayCutout
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.union
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.listSaver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.Placeable
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.LayoutDirection
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiReportUnknownValue
import io.github.chnotchy.tanrei.primitives.TanreiStateMotion
import io.github.chnotchy.tanrei.primitives.animateTanreiColorAsState
import io.github.chnotchy.tanrei.primitives.animateTanreiElevation
import io.github.chnotchy.tanrei.primitives.isDrawn
import io.github.chnotchy.tanrei.primitives.isTanreiDebuggable
import io.github.chnotchy.tanrei.primitives.tanreiElevation
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiAppBarCondition
import io.github.chnotchy.tanrei.tokens.TanreiAppBarSize
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import kotlin.math.roundToInt

/*
 * `specs/app-bar.spec.json` (APB-1…15) on Compose, as `platforms.compose` maps it — Material's `TopAppBar` and
 * `LargeTopAppBar` in one: `TanreiAppBar(title, navigationIcon = { … }, actions = { … }, subtitle, size, titleAlignment,
 * scrollBehavior, windowInsets)`. The bar is a layout region, not a control: it draws its container (color, elevation,
 * bottom edge — the `flat` or `scrolled` condition), lays out the product's own icon buttons and its title, and is never
 * focusable itself. The spec's `scrolled` is carried by the `scrollBehavior`'s state, which a scrolling view connected
 * with `Modifier.nestedScroll(scrollBehavior.nestedScrollConnection)` moves: content under the bar, and — for a size with
 * a title row of its own (`large`) and the collapse behavior — the collapse, one for one with the scroll.
 */

/** Where the top row's title sits (APB-6): after the navigation button, or centered on the bar. */
public enum class TanreiAppBarTitleAlignment {
    /** After the navigation slot (or `title.inset` from the start edge), its text start-aligned. The default. */
    Start,

    /** Centered on the bar's full width, narrowed equally on both sides so it never runs under the buttons. */
    Center,
}

/**
 * What a scrolling view tells an app bar (APB-8, APB-9), in pixels: how far the content has scrolled from its top
 * ([contentOffset]) and how far the bar has collapsed ([collapsedOffset], up to [collapseLimit]). A bar's
 * [TanreiAppBarScrollBehavior] moves it; a product without a scrolling view may set [contentOffset] itself, and a state
 * created with an offset ([rememberTanreiAppBarState]) draws a bar that starts scrolled or collapsed.
 */
@Stable
public class TanreiAppBarState(initialCollapsedOffset: Float = 0f, initialContentOffset: Float = 0f) {
    private var requestedCollapse by mutableFloatStateOf(initialCollapsedOffset.coerceAtLeast(0f))

    /**
     * How far the bar can collapse: its expanded height less its top row — 0 for a bar that does not collapse. Set by
     * the bar once it is laid out; infinite before, so an offset given up front is kept until the bar knows its size.
     */
    public var collapseLimit: Float by mutableFloatStateOf(Float.POSITIVE_INFINITY)
        internal set

    /** How far the bar has collapsed, from 0 (expanded) to [collapseLimit] (collapsed). */
    public var collapsedOffset: Float
        get() = requestedCollapse.coerceIn(0f, collapseLimit)
        set(value) {
            requestedCollapse = value.coerceIn(0f, collapseLimit)
        }

    /** How far the content has scrolled from its top; 0 while it is at its top. */
    public var contentOffset: Float by mutableFloatStateOf(initialContentOffset.coerceAtLeast(0f))

    /** How far the bar has collapsed, from 0 to 1; 0 for a bar that does not collapse. */
    public val collapsedFraction: Float
        get() = if (collapseLimit <= 0f || collapseLimit.isInfinite()) 0f else collapsedOffset / collapseLimit

    /**
     * The spec's `scrolled` (APB-9): content lies under the bar — for a bar that collapses, only once it has fully
     * collapsed.
     */
    public val isScrolled: Boolean
        get() = contentOffset > 0f && collapsedOffset >= collapseLimit

    public companion object {
        /** Keeps both offsets across a configuration change. */
        public val Saver: Saver<TanreiAppBarState, *> = listSaver(
            save = { listOf(it.requestedCollapse, it.contentOffset) },
            restore = { TanreiAppBarState(it[0], it[1]) },
        )
    }
}

/** A [TanreiAppBarState] for the lifetime of the screen, kept across configuration changes. */
@Composable
public fun rememberTanreiAppBarState(initialCollapsedOffset: Float = 0f, initialContentOffset: Float = 0f): TanreiAppBarState =
    rememberSaveable(saver = TanreiAppBarState.Saver) { TanreiAppBarState(initialCollapsedOffset, initialContentOffset) }

/**
 * How an app bar follows a scrolling view: connect the view with `Modifier.nestedScroll(nestedScrollConnection)` and
 * pass the behavior to the bar. Made by [TanreiAppBarDefaults.pinnedScrollBehavior] (the bar never collapses; it takes
 * its scrolled condition while content lies under it) or [TanreiAppBarDefaults.collapseScrollBehavior] (a bar with a
 * title row of its own — `large` — collapses one for one with the scroll first, and expands again once the content is
 * back at its top).
 */
@Stable
public class TanreiAppBarScrollBehavior internal constructor(
    public val state: TanreiAppBarState,
    internal val collapses: Boolean,
) {
    /** Hand it to the scrolling view: `Modifier.nestedScroll(scrollBehavior.nestedScrollConnection)`. */
    public val nestedScrollConnection: NestedScrollConnection = object : NestedScrollConnection {
        override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
            // APB-8: moving the content up collapses the bar first, one pixel per pixel.
            if (!collapses || available.y >= 0f) return Offset.Zero
            val before = state.collapsedOffset
            state.collapsedOffset = before - available.y
            return Offset(0f, before - state.collapsedOffset)
        }

        override fun onPostScroll(consumed: Offset, available: Offset, source: NestedScrollSource): Offset {
            // APB-9: how far the content is from its top — zero again once it cannot scroll further down.
            state.contentOffset = (state.contentOffset - consumed.y).coerceAtLeast(0f)
            if (available.y > 0f && consumed.y == 0f) state.contentOffset = 0f
            // APB-8: what the content leaves once back at its top expands the bar.
            if (!collapses || available.y <= 0f) return Offset.Zero
            val before = state.collapsedOffset
            state.collapsedOffset = before - available.y
            return Offset(0f, before - state.collapsedOffset)
        }
    }
}

/** What [TanreiAppBar] takes when a product says nothing else. */
public object TanreiAppBarDefaults {
    /** APB-10: the status bars and the horizontal display cutout — the bar's color reaches under them, its content does not. */
    public val windowInsets: WindowInsets
        @Composable
        get() = WindowInsets.statusBars.union(WindowInsets.displayCutout.only(WindowInsetsSides.Horizontal))

    /** A bar that never collapses and takes its scrolled condition while content lies under it (a `small` bar's). */
    @Composable
    public fun pinnedScrollBehavior(state: TanreiAppBarState = rememberTanreiAppBarState()): TanreiAppBarScrollBehavior =
        remember(state) { TanreiAppBarScrollBehavior(state, collapses = false) }

    /** A bar whose title row of its own (`large`) collapses into the top row as the content scrolls (APB-8). */
    @Composable
    public fun collapseScrollBehavior(state: TanreiAppBarState = rememberTanreiAppBarState()): TanreiAppBarScrollBehavior =
        remember(state) { TanreiAppBarScrollBehavior(state, collapses = true) }
}

/**
 * What the bar's layout learns and its draw and semantics read: how far it can collapse, where its expanded title is,
 * and how many items its slots hold. Written in the measure pass only when a value changes.
 */
@Stable
private class TanreiAppBarGeometry {
    /** The bar's expanded height less its top row, px. */
    var limit by mutableFloatStateOf(0f)

    /** The space above the expanded title while expanded: the collapse at which the title starts to be covered, px. */
    var titleFree by mutableFloatStateOf(0f)

    /** The expanded title's line, px. */
    var titleHeight by mutableFloatStateOf(0f)
    var navigationCount by mutableIntStateOf(0)
    var actionCount by mutableIntStateOf(0)
}

/**
 * The app bar at the top edge of a screen: its title and subtitle, the way back ([navigationIcon]) and up to three
 * [actions]. Implements `specs/app-bar.spec.json`; every value comes from `TanreiTheme.tokens.appBar`. The bar spans the
 * width it is given, reaches under [windowInsets] with its color and keeps its content inside them. It is not focusable
 * and has no role: its buttons are the product's own [TanreiIconButton]s, laid out and never restyled (APB-11), and its
 * title is the screen's heading (APB-12).
 *
 * @param title the screen's name, on one line, truncated with an ellipsis; exposed as a heading. Empty draws no title
 *   block and exposes no heading (APB-13).
 * @param modifier applied to the whole bar, including the part under the system insets.
 * @param navigationIcon the spec's `navigation` slot: one [TanreiIconButton] (back, menu, close) at the start. More than
 *   one still renders, and a debuggable app reports it (APB-13).
 * @param actions the spec's `actions` slot: up to three [TanreiIconButton]s at the end, in reading order,
 *   `actions.gap` apart. More still render, and a debuggable app reports that they belong in an overflow menu (APB-13).
 * @param subtitle one line under the title, read after it; empty draws none.
 * @param size a key of `tokens.appBar.sizes`: [TanreiAppBarSize.Small] (default), one row with the title;
 *   [TanreiAppBarSize.Large], a larger title in a row of its own under the top row, which collapses into it. A size
 *   whose height is greater than small's has that row. Open: a design system may add values; one it does not
 *   have draws with small's tokens, and a debuggable app reports it (APB-14).
 * @param titleAlignment where the top row's title sits (APB-6).
 * @param scrollBehavior the spec's `scrolled`: the connection to a scrolling view and its state
 *   ([TanreiAppBarDefaults.pinnedScrollBehavior] for small, [TanreiAppBarDefaults.collapseScrollBehavior] for large).
 *   Null: the bar is flat and a large bar stays expanded.
 * @param windowInsets the system insets the bar's color reaches under and its content keeps out of (APB-10).
 */
@Composable
public fun TanreiAppBar(
    title: String,
    modifier: Modifier = Modifier,
    navigationIcon: (@Composable () -> Unit)? = null,
    actions: (@Composable () -> Unit)? = null,
    subtitle: String = "",
    size: TanreiAppBarSize = TanreiAppBarSize.Small,
    titleAlignment: TanreiAppBarTitleAlignment = TanreiAppBarTitleAlignment.Start,
    scrollBehavior: TanreiAppBarScrollBehavior? = null,
    windowInsets: WindowInsets = TanreiAppBarDefaults.windowInsets,
) {
    val system = TanreiTheme.tokens
    val tokens = system.appBar
    // APB-14: the lookup is total — a value this design system does not have reads the default value's tokens.
    if (size !in tokens.sizes) TanreiReportUnknownValue(system.id, "TanreiAppBar", "size", size.key)
    val metrics = tokens.sizes[size]
    val top = tokens.sizes.small
    // APB-7: a size taller than the top row has a title row of its own (large, and a size a layer clones from it).
    val expandedRow = metrics.containerHeight > top.containerHeight
    val geometry = remember { TanreiAppBarGeometry() }

    // APB-9: scrolled comes from the connected view; without one the bar is flat.
    val state = scrollBehavior?.state
    val collapses = scrollBehavior?.collapses ?: false
    val scrolled by remember(state) { derivedStateOf { state?.isScrolled ?: false } }
    // APB-8 / APB-9: how far the bar is drawn collapsed — with the view (collapse), or wholly while scrolled.
    val collapse: () -> Float = {
        when {
            !expandedRow || state == null -> 0f
            collapses -> state.collapsedOffset.coerceAtMost(geometry.limit)
            state.isScrolled -> geometry.limit
            else -> 0f
        }
    }
    // APB-12: the expanded title is exposed while any of it is visible, the top row's once it is covered.
    val expandedTitleCovered by remember(state, expandedRow) {
        derivedStateOf { expandedRow && collapse() >= geometry.titleFree + geometry.titleHeight && geometry.titleHeight > 0f }
    }

    // APB-1 / APB-2: the condition's container color, elevation and bottom edge. APB-3: a change moves over the
    // condition motion (the state motion's form, never entering pressed), at once where motion is reduced.
    val condition = tokens.conditions[if (scrolled) TanreiAppBarCondition.Scrolled else TanreiAppBarCondition.Flat]
    val motion = TanreiStateMotion(TanreiInteractionState.Enabled, tokens.motionConditionDuration, tokens.motionConditionEasing)
    val containerColor = animateTanreiColorAsState(condition.containerColor.color, motion, label = "container")
    val outlineColor = animateTanreiColorAsState(condition.outlineColor.color, motion, label = "outline")
    val elevation = animateTanreiElevation(condition.containerElevation, motion.spec())
    val outlineWidth = tokens.outlineWidth

    TanreiReportAppBarItems(geometry)

    val hasTitle = title.isNotEmpty()
    val titleColor = tokens.titleColor.color
    val subtitleColor = tokens.subtitleColor.color
    val align = if (titleAlignment == TanreiAppBarTitleAlignment.Center) TextAlign.Center else TextAlign.Start

    val topTitle: @Composable () -> Unit = {
        if (hasTitle) {
            // APB-5 / APB-6: the top row's block, vertically centered; while a large bar is expanded it fades in with the
            // part of the expanded title that is covered (APB-8), and is hidden from assistive technology until the
            // expanded title is wholly covered (APB-12).
            val exposed = !expandedRow || expandedTitleCovered
            Column(
                modifier = Modifier
                    .graphicsLayer {
                        alpha = if (!expandedRow) 1f else coveredPart(collapse(), geometry.titleFree, geometry.titleHeight)
                    }
                    .then(if (exposed) Modifier else Modifier.clearAndSetSemantics {}),
                horizontalAlignment = if (titleAlignment == TanreiAppBarTitleAlignment.Center) Alignment.CenterHorizontally else Alignment.Start,
            ) {
                TanreiAppBarLine(title, top.titleTypescale.toTextStyle(), titleColor, align, heading = true)
                if (subtitle.isNotEmpty()) TanreiAppBarLine(subtitle, top.subtitleTypescale.toTextStyle(), subtitleColor, align, heading = false)
            }
        }
    }
    // APB-7: the expanded title and subtitle, in the size's styles, from the start. Exposed while any of it is visible.
    val expandedTitle: @Composable () -> Unit = {
        if (expandedRow && hasTitle) {
            val hidden = Modifier.clearAndSetSemantics {}
            TanreiAppBarLine(title, metrics.titleTypescale.toTextStyle(), titleColor, TextAlign.Start, heading = true, modifier = if (expandedTitleCovered) hidden else Modifier)
        }
    }
    val expandedSubtitle: @Composable () -> Unit = {
        if (expandedRow && hasTitle && subtitle.isNotEmpty()) {
            val hidden = Modifier.clearAndSetSemantics {}
            TanreiAppBarLine(subtitle, metrics.subtitleTypescale.toTextStyle(), subtitleColor, TextAlign.Start, heading = false, modifier = if (expandedTitleCovered) hidden else Modifier)
        }
    }

    val bar = modifier
        .fillMaxWidth()
        .tanreiElevation(elevation, RectangleShape)
        // APB-10: the container reaches under the insets; APB-1 / APB-2: its color, and its bottom edge over everything.
        .drawBehind { containerColor.value.let { if (it.isDrawn) drawRect(it) } }
        .drawWithContent {
            drawContent()
            val edge = outlineColor.value
            val thickness = outlineWidth.toPx()
            if (edge.isDrawn && thickness > 0f) drawRect(edge, topLeft = Offset(0f, this.size.height - thickness), size = Size(this.size.width, thickness))
        }
        .windowInsetsPadding(windowInsets)

    val navigationContent: @Composable () -> Unit = { navigationIcon?.invoke() }
    val actionsContent: @Composable () -> Unit = { actions?.invoke() }
    Layout(
        contents = listOf(navigationContent, actionsContent, topTitle, expandedTitle, expandedSubtitle),
        modifier = bar,
    ) { (navigation, actionItems, topTitles, expandedTitles, expandedSubtitles), constraints ->
        val width = if (constraints.hasBoundedWidth) constraints.maxWidth else constraints.minWidth
        val padding = tokens.containerPaddingInline.roundToPx()
        val gap = tokens.containerGap.roundToPx()
        val between = tokens.actionsGap.roundToPx()
        val inset = tokens.titleInset.roundToPx()
        val loose = Constraints()
        // APB-4 / APB-15: the items at their own size — the bar never scales them.
        val navigationPlaceables = navigation.map { it.measure(loose) }
        val actionPlaceables = actionItems.map { it.measure(loose) }
        geometry.update(navigationPlaceables.size, actionPlaceables.size)
        val navigationWidth = rowWidth(navigationPlaceables, between)
        val actionsWidth = rowWidth(actionPlaceables, between)

        // APB-4 / APB-6: the title block between the slots — after the navigation slot or at the inset, up to the actions.
        val start = if (navigationPlaceables.isNotEmpty()) padding + navigationWidth + gap else inset
        val end = if (actionPlaceables.isNotEmpty()) width - padding - actionsWidth - gap else width - inset
        val available = when (titleAlignment) {
            TanreiAppBarTitleAlignment.Start -> (end - start).coerceAtLeast(0)
            TanreiAppBarTitleAlignment.Center -> 2 * minOf(width / 2 - start, end - width / 2).coerceAtLeast(0)
        }
        val topTitlePlaceable = topTitles.firstOrNull()?.measure(Constraints(maxWidth = available))
        // APB-4 / APB-15: the top row is at least small's height and grows with its content.
        val topRow = maxOf(
            top.containerHeight.roundToPx(),
            navigationPlaceables.maxOfOrNull { it.height } ?: 0,
            actionPlaceables.maxOfOrNull { it.height } ?: 0,
            topTitlePlaceable?.height ?: 0,
        )

        // APB-7: the expanded title row under the top row, the block padding-block-end above the bottom edge.
        val expandedWidth = Constraints(maxWidth = (width - 2 * inset).coerceAtLeast(0))
        val titlePlaceable = expandedTitles.firstOrNull()?.measure(expandedWidth)
        val subtitlePlaceable = expandedSubtitles.firstOrNull()?.measure(expandedWidth)
        val blockEnd = tokens.containerPaddingBlockEnd.roundToPx()
        val block = (titlePlaceable?.height ?: 0) + (subtitlePlaceable?.height ?: 0)
        val expandedHeight = if (expandedRow) maxOf(metrics.containerHeight.roundToPx(), topRow + block + blockEnd) else maxOf(metrics.containerHeight.roundToPx(), topRow)
        val limit = (expandedHeight - topRow).toFloat()
        val free = (expandedHeight - topRow - blockEnd - block).toFloat()
        geometry.set(limit, free, (titlePlaceable?.height ?: 0).toFloat())
        state?.let { if (it.collapseLimit != (if (collapses) limit else 0f)) it.collapseLimit = if (collapses) limit else 0f }

        // APB-8: the bar shrinks by the collapse; the expanded block moves up with its bottom edge.
        val collapsed = collapse().roundToInt()
        val height = expandedHeight - collapsed
        layout(width, height) {
            var x = padding
            for (placeable in navigationPlaceables) {
                placeable.placeRelative(x, (topRow - placeable.height) / 2)
                x += placeable.width + between
            }
            x = width - padding - actionsWidth
            for (placeable in actionPlaceables) {
                placeable.placeRelative(x, (topRow - placeable.height) / 2)
                x += placeable.width + between
            }
            topTitlePlaceable?.let {
                val titleX = if (titleAlignment == TanreiAppBarTitleAlignment.Center) (width - it.width) / 2 else start
                it.placeRelative(titleX, (topRow - it.height) / 2)
            }
            // Clipped under the top row: only what lies below it is drawn.
            var y = height - blockEnd - block
            for (placeable in listOfNotNull(titlePlaceable, subtitlePlaceable)) {
                placeUnder(placeable, inset, y, topRow)
                y += placeable.height
            }
        }
    }
}

/** One line of the title block: never wrapped, truncated at the end with an ellipsis (APB-5, APB-7, APB-15). */
@Composable
private fun TanreiAppBarLine(text: String, style: TextStyle, color: Color, align: TextAlign, heading: Boolean, modifier: Modifier = Modifier) {
    BasicText(
        text = text,
        modifier = modifier.then(if (heading) Modifier.semantics { heading() } else Modifier),
        style = style.merge(TextStyle(textAlign = align)),
        color = { color },
        maxLines = 1,
        softWrap = false,
        overflow = TextOverflow.Ellipsis,
    )
}

/** How much of the expanded title's line lies under the top row once the bar has collapsed by [collapse] (APB-8). */
private fun coveredPart(collapse: Float, free: Float, line: Float): Float =
    if (line <= 0f) (if (collapse > free) 1f else 0f) else ((collapse - free) / line).coerceIn(0f, 1f)

private fun rowWidth(placeables: List<Placeable>, gap: Int): Int =
    if (placeables.isEmpty()) 0 else placeables.sumOf { it.width } + gap * (placeables.size - 1)

private fun TanreiAppBarGeometry.update(navigation: Int, actions: Int) {
    if (navigationCount != navigation) navigationCount = navigation
    if (actionCount != actions) actionCount = actions
}

private fun TanreiAppBarGeometry.set(limit: Float, free: Float, titleHeight: Float) {
    if (this.limit != limit) this.limit = limit
    if (titleFree != free) titleFree = free
    if (this.titleHeight != titleHeight) this.titleHeight = titleHeight
}

/**
 * Places this line of the expanded block at ([x], [y]) from the start, clipped so that nothing above [rowBottom] — the
 * top row — is drawn (APB-8).
 */
private fun Placeable.PlacementScope.placeUnder(placeable: Placeable, x: Int, y: Int, rowBottom: Int) {
    val hiddenAbove = (rowBottom - y).coerceAtLeast(0).toFloat()
    val clip = if (hiddenAbove <= 0f) null else ClipBelow(hiddenAbove)
    placeable.placeRelativeWithLayer(x, y) {
        if (clip != null) {
            this.clip = true
            shape = clip
        }
    }
}

/** A rectangle from [top] down to the bottom of the layer: the part of an expanded line that is not under the top row. */
private class ClipBelow(private val top: Float) : Shape {
    override fun createOutline(size: Size, layoutDirection: LayoutDirection, density: Density): Outline =
        Outline.Rectangle(Rect(0f, top.coerceAtMost(size.height), size.width, size.height))
}

/**
 * Debuggable apps only (APB-13): more than three actions (they belong in an overflow menu) or more than one navigation
 * button. The bar renders them all; each problem is reported once.
 */
@Composable
private fun TanreiReportAppBarItems(geometry: TanreiAppBarGeometry) {
    if (!isTanreiDebuggable()) return
    val reported = remember { mutableSetOf<String>() }
    LaunchedEffect(geometry) {
        snapshotFlow { geometry.navigationCount to geometry.actionCount }.collect { (navigation, actions) ->
            if (actions > MAX_ACTIONS && reported.add("actions")) {
                TanreiDiagnostics.reporter("TanreiAppBar: it holds $actions actions; more than $MAX_ACTIONS belong in an overflow menu.")
            }
            if (navigation > 1 && reported.add("navigation")) {
                TanreiDiagnostics.reporter("TanreiAppBar: it holds $navigation navigation buttons; a bar has one.")
            }
        }
    }
}

/** APB-13: the most actions a bar holds before the rest belong in an overflow menu (the spec's number, not a design value). */
private const val MAX_ACTIONS = 3
