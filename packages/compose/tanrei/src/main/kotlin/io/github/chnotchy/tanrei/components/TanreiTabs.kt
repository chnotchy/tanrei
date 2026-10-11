package io.github.chnotchy.tanrei.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.AnimationSpec
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.State
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawOutline
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.layoutId
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
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
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.max
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiReportMissingName
import io.github.chnotchy.tanrei.primitives.TanreiReportUnknownValue
import io.github.chnotchy.tanrei.primitives.TanreiRovingFocus
import io.github.chnotchy.tanrei.primitives.TanreiStateMotion
import io.github.chnotchy.tanrei.primitives.WithoutTanreiAnchorDescription
import io.github.chnotchy.tanrei.primitives.animateTanreiColorAsState
import io.github.chnotchy.tanrei.primitives.collectTanreiInteraction
import io.github.chnotchy.tanrei.primitives.drawnStates
import io.github.chnotchy.tanrei.primitives.isDrawn
import io.github.chnotchy.tanrei.primitives.isTanreiDebuggable
import io.github.chnotchy.tanrei.primitives.rememberTanreiRipple
import io.github.chnotchy.tanrei.primitives.rememberTanreiRovingEntry
import io.github.chnotchy.tanrei.primitives.rememberTanreiSelectionMotion
import io.github.chnotchy.tanrei.primitives.tanreiAnchorDescription
import io.github.chnotchy.tanrei.primitives.tanreiContainer
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.primitives.tanreiFocusRing
import io.github.chnotchy.tanrei.primitives.tanreiGroupOpacity
import io.github.chnotchy.tanrei.primitives.tanreiPressInput
import io.github.chnotchy.tanrei.primitives.tanreiRippleInput
import io.github.chnotchy.tanrei.primitives.tanreiRovingItem
import io.github.chnotchy.tanrei.primitives.tanreiRovingKeys
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.LocalTanreiTextStyle
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.glyph
import io.github.chnotchy.tanrei.theme.tanreiTween
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiTabsTokens
import io.github.chnotchy.tanrei.tokens.TanreiTabsVariant
import io.github.chnotchy.tanrei.tokens.TanreiTabsVariantStateTokens
import kotlin.math.roundToInt
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

/*
 * `specs/tabs.spec.json` (TAB-1…23) on Compose, as `platforms.compose` maps it: `TanreiTabs(selectedValue,
 * onSelectedValueChange, variant, scrollable, contentDescription) { TanreiTab(value, label, …) }` — Material's
 * `PrimaryTabRow`, `SecondaryTabRow` and `ScrollableTabRow` in one, selected by VALUE instead of an index.
 * The row lays the tabs out (fixed: equal widths; scrollable: each its content, scrolling sideways), draws the divider
 * under them and the sliding active indicator over them, and moves keyboard focus among them (`TanreiRovingFocus` in its
 * horizontal form: one Tab stop — the selected tab —, Left / Right wrapping and mirrored right-to-left, Home, End, and
 * automatic activation). Each `TanreiTab` (the item kind `tab`) is [TanreiButton]'s chain — press and press-hold, pressed
 * feedback and ripple, keyboard focus ring (inside the tab), container, corner smoothing — with the tabs' tokens, drawn
 * from its look (the variant's own parts, or its `selected.` parts) and state. Compose has no tab panel role: the
 * product shows the selected tab's view below the row.
 */

/** A tab's look (TAB-11): the variant's own parts, or its `selected.` parts. Chosen once from the row's selection. */
private enum class TanreiTabLook { Unselected, Selected }

/** The container, label, icon and active-indicator paints of one look in one state. */
private class TanreiTabParts(val container: TanreiPaint, val label: TanreiPaint, val icon: TanreiPaint, val indicator: TanreiPaint)

private fun TanreiTabsVariantStateTokens.parts(look: TanreiTabLook): TanreiTabParts = when (look) {
    TanreiTabLook.Unselected -> TanreiTabParts(containerColor, labelColor, iconColor, activeIndicatorColor)
    TanreiTabLook.Selected -> TanreiTabParts(selectedContainerColor, selectedLabelColor, selectedIconColor, selectedActiveIndicatorColor)
}

/**
 * What the row knows of one tab: where it was laid out (physical pixels in the row's content), where its content sits
 * inside it, and what the sliding indicator draws while it is the selected one — the SELECTED look's indicator color,
 * thickness and corner in the tab's state, and the tab's opacity. Written by the tab and by the row's layout, read in
 * the draw phase and by the indicator's motion.
 */
@Stable
private class TanreiTabInfo {
    var left by mutableFloatStateOf(0f)
    var width by mutableFloatStateOf(0f)
    var contentLeft by mutableFloatStateOf(0f)
    var contentWidth by mutableFloatStateOf(0f)
    var selectedIndicatorColor: State<Color>? by mutableStateOf(null)
    var opacity: State<Float>? by mutableStateOf(null)
    var indicatorThickness by mutableStateOf(0.dp)
    var indicatorShape by mutableStateOf(0.dp)
}

/** Where the sliding indicator goes: [start] to [end] in the row's content, physical pixels. */
private data class TanreiTabIndicatorTarget(val info: TanreiTabInfo, val start: Float, val end: Float)

/** The row's own state, for its lifetime. */
@Stable
private class TanreiTabsState(val scroll: ScrollState) {
    /** TAB-12: one Tab stop (the selected tab), Left / Right wrapping, Home, End; disabled tabs take no focus at all. */
    val roving = TanreiRovingFocus(wrap = true, horizontal = true, typeahead = false, tabStopIsSelected = true)
    val infos = mutableStateMapOf<TanreiRovingFocus.Entry, TanreiTabInfo>()
    val indicatorStart = Animatable(0f)
    val indicatorEnd = Animatable(0f)

    /**
     * False until the tabs have registered and been drawn once: what the first frames resolve (the first enabled tab of
     * a null selection, which is known only once every tab has registered) is where the tabs START, not a change.
     */
    var settled by mutableStateOf(false)

    var scrollable = false
    var viewport = 0
    var contentWidth = 0
    var direction = LayoutDirection.Ltr
    var scope: CoroutineScope? = null
    var revealSpec: AnimationSpec<Float>? = null

    /**
     * TAB-15: scrolls a scrollable row until the whole of [info] is visible — over the indicator's duration and easing
     * when [animate], at once otherwise (and where motion is reduced: the animator duration scale reaches the scroll).
     * A scroll value is the distance from the row's START edge in either layout direction.
     */
    fun reveal(info: TanreiTabInfo, animate: Boolean) {
        if (!scrollable || info.width <= 0f || viewport <= 0) return
        val start = if (direction == LayoutDirection.Rtl) contentWidth - (info.left + info.width) else info.left
        val current = scroll.value
        val lowest = (start + info.width - viewport).roundToInt()
        val highest = start.roundToInt()
        val target = if (lowest > highest) highest else current.coerceIn(lowest, highest)
        if (target == current) return
        val launcher = scope ?: return
        val spec = revealSpec
        launcher.launch { if (animate && spec != null) scroll.animateScrollTo(target, spec) else scroll.scrollTo(target) }
    }
}

/** What a [TanreiTab] learns from its row; a new one whenever the row's props change. */
private class TanreiTabsContext(
    val state: TanreiTabsState,
    val variant: TanreiTabsVariant,
    val scrollable: Boolean,
    val selectedValue: String?,
    val onSelectedValueChange: (String) -> Unit,
) {
    /** The tab that is selected (TAB-11): the first with the selected value, or — while it is null — the first enabled tab. */
    fun chosen(): TanreiRovingFocus.Entry? {
        val ordered = state.roving.ordered
        return if (selectedValue == null) ordered.firstOrNull { it.enabled } else ordered.firstOrNull { it.value == selectedValue }
    }

    /** Whether the tab of [entry] (value [value]) is the selected one. Before it has registered, by its value alone. */
    fun isSelected(entry: TanreiRovingFocus.Entry?, value: String): Boolean {
        if (entry == null) return false
        if (entry !in state.roving.ordered) return selectedValue != null && value == selectedValue
        return chosen() === entry
    }

    /** TAB-1: activating a tab that is not selected emits change once with its value; the selected one emits nothing. */
    fun activate(entry: TanreiRovingFocus.Entry, value: String) {
        if (!isSelected(entry, value)) onSelectedValueChange(value)
    }

    /** TAB-16: primary spans the tab's content, secondary the whole tab (and a variant a layer adds, primary's form). */
    fun span(info: TanreiTabInfo): TanreiTabIndicatorTarget =
        if (variant == TanreiTabsVariant.Secondary) {
            TanreiTabIndicatorTarget(info, info.left, info.left + info.width)
        } else {
            TanreiTabIndicatorTarget(info, info.left + info.contentLeft, info.left + info.contentLeft + info.contentWidth)
        }
}

private val LocalTanreiTabs = compositionLocalOf<TanreiTabsContext?> { null }

/**
 * Switches between views of the same subject with a row of labelled tabs, one of them selected, above the view it
 * shows. Implements `specs/tabs.spec.json`. The row draws no background — it sits on the screen's or an app bar's
 * surface — only the divider under the tabs and the selected tab's active indicator; it fills the width it is given.
 * Compose has no tab panel role: show the selected tab's view below the row, in reading order.
 *
 * @param selectedValue the spec's `selected`: the value of the selected tab. Null selects the first enabled tab; a
 *   value that names no tab selects none, and a debuggable app reports it (TAB-11). The caller keeps it and moves it
 *   from [onSelectedValueChange] (state hoisting).
 * @param onSelectedValueChange the spec's `change`: the user selected another tab — by pointer, touch, Enter, Space,
 *   or by moving to it with the arrow keys, Home or End (automatic activation); receives its value. Called once per
 *   change, never for the tab that is already selected (TAB-1, TAB-12).
 * @param modifier applied to the row.
 * @param variant a key of `tokens.tabs.variants`: [TanreiTabsVariant.Primary] (default) for the main views of a screen —
 *   an icon stacks above the label and the indicator spans the tab's content —, [TanreiTabsVariant.Secondary] for the
 *   views inside one of them — an icon goes before the label and the indicator spans the whole tab. Open: a design
 *   system may add values, drawn in primary's form; a value it does not have draws with primary's tokens, and
 *   a debuggable app reports it (TAB-7).
 * @param scrollable false (default) divides the row's width equally among the tabs, and a label that does not fit
 *   wraps; true sizes each tab to its content and scrolls the row sideways (TAB-14).
 * @param contentDescription the spec's `label`: the accessible name of the row — what the views are views of. Needed
 *   when a screen has more than one row of tabs.
 * @param content the `TanreiTab`s, in order.
 */
@Composable
public fun TanreiTabs(
    selectedValue: String?,
    onSelectedValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    variant: TanreiTabsVariant = TanreiTabsVariant.Primary,
    scrollable: Boolean = false,
    contentDescription: String = "",
    content: @Composable () -> Unit,
) {
    val system = TanreiTheme.tokens
    val tokens = system.tabs
    // TAB-7: the lookup is total — a value this design system does not have reads the default value's tokens.
    if (variant !in tokens.variants) TanreiReportUnknownValue(system.id, "TanreiTabs", "variant", variant.key)
    val scroll = rememberScrollState()
    val state = remember(scroll) { TanreiTabsState(scroll) }
    val direction = LocalLayoutDirection.current
    state.roving.layoutDirection = direction
    state.direction = direction
    state.scrollable = scrollable
    state.scope = rememberCoroutineScope()
    state.revealSpec = tanreiTween(tokens.motionIndicatorDuration, tokens.motionIndicatorEasing)

    val change by rememberUpdatedState(onSelectedValueChange)
    val context = remember(state, variant, scrollable, selectedValue) { TanreiTabsContext(state, variant, scrollable, selectedValue) { change(it) } }
    val current by rememberUpdatedState(context)
    // TAB-12: the arrow keys, Home and End select the tab they reach (automatic activation).
    SideEffect { state.roving.onMove = { entry -> current.activate(entry, entry.value) } }
    LaunchedEffect(state) {
        // Registration, then the recomposition it causes: two frames.
        withFrameNanos { }
        withFrameNanos { }
        state.settled = true
    }
    // TAB-11: a selected value naming no tab, and tabs whose value is empty or repeated, are reported.
    TanreiReportTabValues(state, selectedValue)

    // TAB-16 / TAB-17: the indicator goes to the selected tab — at once the first time and when the same tab moves, over
    // the indicator's duration and easing when the selection changes (at once where motion is reduced). TAB-15: the tab
    // is scrolled into view over the same timing.
    val indicatorSpec by rememberUpdatedState(tanreiTween<Float>(tokens.motionIndicatorDuration, tokens.motionIndicatorEasing))
    LaunchedEffect(state) {
        var shown: TanreiTabInfo? = null
        snapshotFlow { current.chosen()?.let { state.infos[it] }?.let { current.span(it) } }.collectLatest { target ->
            if (target == null) {
                shown = null
                return@collectLatest
            }
            val moved = shown != null && shown !== target.info && state.settled
            shown = target.info
            state.reveal(target.info, animate = moved)
            if (moved) {
                coroutineScope {
                    launch { state.indicatorStart.animateTo(target.start, indicatorSpec) }
                    launch { state.indicatorEnd.animateTo(target.end, indicatorSpec) }
                }
            } else {
                state.indicatorStart.snapTo(target.start)
                state.indicatorEnd.snapTo(target.end)
            }
        }
    }

    val label = contentDescription.takeUnless { it.isBlank() }
    val count = state.roving.size
    val dividerColor = tokens.dividerColor.color
    val dividerThickness = tokens.dividerThickness
    val smoothing = system.shape.cornerSmoothing
    val minimumWidth = system.measure.targetTouch
    Box(
        modifier
            .fillMaxWidth()
            // TAB-13: the tab list (Compose's selectable group) of `count` tabs in one row, named by its label.
            .semantics {
                selectableGroup()
                collectionInfo = CollectionInfo(rowCount = 1, columnCount = count)
                if (label != null) {
                    this.contentDescription = label
                    isTraversalGroup = true
                }
            }
            // TAB-20: the divider along the bottom of the whole row, under the tabs and the indicator, across its full
            // width while it scrolls; drawn, so it has no semantics.
            .drawBehind {
                val thickness = dividerThickness.toPx()
                if (dividerColor.isDrawn && thickness > 0f) drawRect(dividerColor, topLeft = Offset(0f, size.height - thickness), size = Size(size.width, thickness))
            }
            // TAB-12: the arrow keys, Home and End, heard from the focused tab.
            .tanreiRovingKeys(state.roving)
            .onSizeChanged { state.viewport = it.width },
    ) {
        TanreiTabsLayout(
            state = state,
            scrollable = scrollable,
            minimumWidth = minimumWidth,
            modifier = (if (scrollable) Modifier.horizontalScroll(scroll) else Modifier.fillMaxWidth())
                .drawWithContent {
                    drawContent()
                    drawTanreiTabIndicator(current, state, smoothing)
                },
        ) {
            CompositionLocalProvider(LocalTanreiTabs provides context, content = content)
        }
    }
}

/** TAB-16: the selected tab's indicator at its (moving) place on the bottom edge, its top corners rounded. */
private fun DrawScope.drawTanreiTabIndicator(context: TanreiTabsContext, state: TanreiTabsState, smoothing: Float) {
    val info = context.chosen()?.let { state.infos[it] } ?: return
    val color = info.selectedIndicatorColor?.value ?: return
    if (!color.isDrawn) return
    val start = state.indicatorStart.value
    val end = state.indicatorEnd.value
    val thickness = info.indicatorThickness.toPx()
    if (end <= start || thickness <= 0f) return
    val outline = tanreiContainerShape(info.indicatorShape, 0.dp, smoothing).createOutline(Size(end - start, thickness), layoutDirection, this)
    translate(start, size.height - thickness) { drawOutline(outline, color, alpha = info.opacity?.value ?: 1f) }
}

/**
 * TAB-14: the tabs in one row. Fixed: the width divided equally (the remainder to the first tabs), each at least
 * [minimumWidth]; scrollable: each tab its content's width (one line of label) and at least [minimumWidth], the row as
 * wide as their sum and scrolled by its parent. Every tab is as tall as the tallest (a wrapping label grows them all).
 * Placed from the start edge (right-to-left mirrors, TAB-21); each tab's physical place is recorded for the indicator.
 */
@Composable
private fun TanreiTabsLayout(state: TanreiTabsState, scrollable: Boolean, minimumWidth: Dp, modifier: Modifier, content: @Composable () -> Unit) {
    Layout(content = content, modifier = modifier) { measurables, constraints ->
        val count = measurables.size
        if (count == 0) return@Layout layout(constraints.minWidth, constraints.minHeight) {}
        val minimum = minimumWidth.roundToPx()
        val widths = if (scrollable) {
            IntArray(count) { maxOf(measurables[it].maxIntrinsicWidth(Constraints.Infinity), minimum) }
        } else {
            val total = if (constraints.hasBoundedWidth) constraints.maxWidth else measurables.maxOf { it.maxIntrinsicWidth(Constraints.Infinity) } * count
            IntArray(count) { maxOf(total / count + if (it < total % count) 1 else 0, minimum) }
        }
        val height = maxOf(constraints.minHeight, (0 until count).maxOf { measurables[it].minIntrinsicHeight(widths[it]) })
        val placeables = measurables.mapIndexed { i, measurable -> measurable.measure(Constraints.fixed(widths[i], height)) }
        val sum = widths.sum()
        val width = if (scrollable) maxOf(sum, constraints.minWidth) else sum.coerceIn(constraints.minWidth, constraints.maxWidth)
        layout(width, height) {
            var x = 0
            placeables.forEachIndexed { i, placeable ->
                placeable.placeRelative(x, 0)
                (measurables[i].layoutId as? TanreiTabInfo)?.let { info ->
                    info.left = (if (layoutDirection == LayoutDirection.Rtl) width - x - placeable.width else x).toFloat()
                    info.width = placeable.width.toFloat()
                }
                x += placeable.width
            }
            state.contentWidth = width
        }
    }
}

/**
 * One tab of a [TanreiTabs] row (the spec's item kind `tab`). Call it in the row's content lambda.
 *
 * @param value identifies the tab: the row's `selectedValue` names the selected tab by it, and `onSelectedValueChange`
 *   carries it. Unique within the row; an empty or repeated one still renders — the first tab with a value is the one it
 *   selects — and a debuggable app reports it (TAB-11).
 * @param label the tab's text and its accessible name. Required, even when [labelHidden]; an empty one still renders,
 *   and a debuggable app reports it (TAB-22).
 * @param modifier applied to the tab.
 * @param labelHidden draws the icon alone and keeps [label] as the accessible name (an icon-only tab). Without an icon
 *   the label is drawn anyway, and a debuggable app reports it (TAB-19).
 * @param enabled the Compose idiom for the spec's `disabled` (inverse). A disabled tab cannot be selected, is skipped by
 *   the arrow keys, is never the Tab stop, and is announced disabled (TAB-2).
 * @param icon the spec's `icon`: a glyph of the system's icon set, above the label (primary) or before it (secondary),
 *   in a box of `iconSize`, given the look's icon color, the glyph of the tab's selection (selected for the selected
 *   tab) and an icon-font text style — as `TanreiIconButton`'s slot. Decorative. Give every tab of a row an icon, or none.
 * @param interactionSource hoist to observe or drive hover, focus and press.
 */
@Composable
public fun TanreiTab(
    value: String,
    label: String,
    modifier: Modifier = Modifier,
    labelHidden: Boolean = false,
    enabled: Boolean = true,
    icon: (@Composable () -> Unit)? = null,
    interactionSource: MutableInteractionSource? = null,
) {
    val row = LocalTanreiTabs.current
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val system = TanreiTheme.tokens
    val tokens = system.tabs
    val variant = row?.variant ?: TanreiTabsVariant.Primary
    val scrollable = row?.scrollable ?: false
    // TAB-22: still rendered and still working; reported in debuggable apps.
    if (label.isBlank()) TanreiReportMissingName("TanreiTab", "label", what = "a tab without a label")
    // TAB-19: an icon-only tab needs an icon; without one the label is drawn anyway.
    val drawLabel = !labelHidden || icon == null
    if (labelHidden && icon == null) TanreiReportTabsProblem("TanreiTab \"$label\": labelHidden is true but it has no icon; its label is drawn.")

    // TAB-2 / TAB-12: the row's keyboard sees this tab — its order and value; a disabled tab takes no focus.
    val state = row?.state
    val entry = rememberTanreiRovingEntry(state?.roving, focusable = enabled, enabled = enabled, selected = false, text = label, value = value)
    // TAB-11: which look is drawn — the variant's own parts, or its `selected.` parts.
    val selected = row?.isSelected(entry, value) ?: false
    SideEffect { entry?.selected = selected }
    val index = entry?.let { state?.roving?.indexOf(it) } ?: -1
    val look = if (selected) TanreiTabLook.Selected else TanreiTabLook.Unselected
    val info = remember { TanreiTabInfo() }
    if (state != null && entry != null) {
        DisposableEffect(state, entry) {
            state.infos[entry] = info
            onDispose { state.infos.remove(entry) }
        }
    }

    // TAB-3 / TAB-6: one state wins; TAB-8: a press counts from the first frame and for at least press-hold.
    val interaction = source.collectTanreiInteraction(enabled)
    // TAB-9: the pressed tokens say WHAT a press looks like; `pressed-feedback` says how it arrives.
    val feedback = system.behavior.pressedFeedback
    val drawnStates = interaction.drawnStates(feedback)
    val palette = tokens.variants[variant]
    val stateTokens = palette[drawnStates.content]
    val drawn = stateTokens.parts(look)

    // TAB-23: a change of state moves over the tabs' state motion (entering pressed snaps); a change between selected and
    // not selected over the same duration and easing, also while pressed. At once where motion is reduced — and while the
    // row is still settling its first selection, which is where the tabs start, not a change.
    val stateMotion = TanreiStateMotion(interaction.state, tokens.motionStateDuration, tokens.motionStateEasing)
    val selectionMotion = rememberTanreiSelectionMotion(look, stateMotion, tokens.motionStateDuration, tokens.motionStateEasing)
    val settling = state != null && !state.settled
    // Entering pressed is the one motion that snaps: the settling frames borrow it.
    val instant = TanreiStateMotion(TanreiInteractionState.Pressed, tokens.motionStateDuration, tokens.motionStateEasing)
    val motion = if (settling) instant else selectionMotion
    val restMotion = if (settling) instant else stateMotion
    val containerColor = animateTanreiColorAsState(palette[drawnStates.container].parts(look).container.color, motion, label = "container")
    val labelColor = animateTanreiColorAsState(drawn.label.color, motion, label = "label")
    val iconColor by animateTanreiColorAsState(drawn.icon.color, motion, label = "icon")
    // TAB-16: a tab that is not selected draws its own look's indicator (none, by default) under itself; the selected
    // look's indicator is the row's, which slides. Each moves with the tab's state only, so neither fades in or out as
    // the selection passes.
    val ownIndicatorColor = animateTanreiColorAsState(stateTokens.activeIndicatorColor.color, restMotion, label = "indicator")
    val selectedIndicatorColor = animateTanreiColorAsState(stateTokens.selectedActiveIndicatorColor.color, restMotion, label = "selected-indicator")
    val opacity = animateFloatAsState(tokens.opacity(drawnStates.content), motion.spec(), label = "opacity")
    SideEffect {
        info.selectedIndicatorColor = selectedIndicatorColor
        info.opacity = opacity
        info.indicatorThickness = stateTokens.activeIndicatorThickness
        info.indicatorShape = stateTokens.activeIndicatorShape
    }
    // TAB-10: the tab's corners, eased by the system's corner smoothing.
    val cornerRadius = tokens.containerShape
    val smoothing = system.shape.cornerSmoothing
    val shape = remember(cornerRadius, smoothing) { tanreiContainerShape(cornerRadius, smoothing) }
    // TAB-9, ripple: the pressed container color of the tab's look, from the point of contact (the center for a key).
    val ripple = rememberTanreiRipple(
        feedback = feedback,
        interaction = interaction,
        color = palette.pressed.parts(look).container.color,
        feedbackDurationMillis = tokens.motionFeedbackDuration,
        stateDurationMillis = tokens.motionStateDuration,
        stateEasing = tokens.motionStateEasing,
    )

    val secondary = variant == TanreiTabsVariant.Secondary
    val stacked = !secondary && icon != null && drawLabel
    // TAB-5 / TAB-18: at least the touch target wide and tall (Compose cannot tell a fine pointer), and the tab's height.
    val minimumHeight = max(system.measure.targetTouch, if (stacked) tokens.containerHeightWithIcon else tokens.containerHeight)
    val minimumWidth = system.measure.targetTouch
    val hiddenName = label.takeIf { !drawLabel || labelHidden }?.takeUnless { it.isBlank() }

    val tab = Modifier
        .layoutId(info)
        .then(modifier)
        .tanreiRovingItem(state?.roving, entry, focusable = enabled)
        // TAB-15: a tab that receives focus is scrolled into view.
        .onFocusChanged { if (it.isFocused) state?.reveal(info, animate = true) }
        .tanreiAnchorDescription()
        // TAB-13: its position in the row; an icon-only tab is named by its label.
        .semantics {
            if (index >= 0) collectionItemInfo = CollectionItemInfo(rowIndex = 0, rowSpan = 1, columnIndex = index, columnSpan = 1)
            if (hiddenName != null) this.contentDescription = hiddenName
        }
        // TAB-1 / TAB-2 / TAB-13: a tab (`Role.Tab`) with its selected state; a disabled one does not activate.
        .selectable(
            selected = selected,
            interactionSource = source,
            indication = null,
            enabled = enabled,
            role = Role.Tab,
            onClick = { if (entry != null) row?.activate(entry, value) },
        )
        // TAB-8: the pointer press itself, heard at once.
        .tanreiPressInput(interaction.press, enabled)
        .tanreiRippleInput(ripple)
        // TAB-4: inside the tab, which a scrolling row would otherwise clip; never animated; keyboard focus only.
        .tanreiFocusRing(source, cornerRadius = cornerRadius, inside = true)
        .tanreiGroupOpacity(overflow = NoLength) { opacity.value }
        .tanreiContainer(shape, containerColor = { containerColor.value }, outlineColor = Color.Transparent, outlineWidth = NoLength, ripple = ripple)
        .drawBehind {
            val color = ownIndicatorColor.value
            if (selected || !color.isDrawn) return@drawBehind
            val thickness = stateTokens.activeIndicatorThickness.toPx()
            val start = if (secondary) 0f else info.contentLeft
            val width = if (secondary) size.width else info.contentWidth
            if (width <= 0f || thickness <= 0f) return@drawBehind
            val outline = tanreiContainerShape(stateTokens.activeIndicatorShape, 0.dp, smoothing).createOutline(Size(width, thickness), layoutDirection, this)
            translate(start, size.height - thickness) { drawOutline(outline, color) }
        }

    val glyph = system.icon.glyph(tokens.iconSize, selected = selected)
    val labelStyle = tokens.labelTypescale.toTextStyle().merge(TextStyle(textAlign = TextAlign.Center))
    val iconBox: @Composable () -> Unit = {
        Box(Modifier.size(tokens.iconSize).clearAndSetSemantics {}, contentAlignment = Alignment.Center) {
            if (icon != null) {
                CompositionLocalProvider(
                    LocalTanreiContentColor provides iconColor,
                    LocalTanreiIconGlyph provides glyph,
                    LocalTanreiTextStyle provides glyph.toTextStyle(tokens.iconSize),
                ) { WithoutTanreiAnchorDescription(icon) }
            }
        }
    }
    val text: @Composable (Modifier) -> Unit = { textModifier ->
        BasicText(
            text = label,
            modifier = textModifier,
            style = labelStyle,
            color = { labelColor.value },
            // TAB-14: a fixed tab's label wraps; a scrollable tab keeps it on one line and grows wider.
            softWrap = !scrollable,
            maxLines = if (scrollable) 1 else Int.MAX_VALUE,
        )
    }

    // The content keeps clear of the indicator: inset by the variant's resting thickness above and below (so it stays
    // centred), which changes nothing while the content is shorter than the tab.
    TanreiTabLayout(info, tokens, minimumWidth, minimumHeight, palette.enabled.activeIndicatorThickness, tab) {
        when {
            // TAB-19: the icon alone.
            icon != null && !drawLabel -> iconBox()
            // TAB-18: primary stacks the icon above the label.
            stacked -> Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(tokens.containerGap)) {
                iconBox()
                text(Modifier)
            }
            // TAB-18: secondary puts it before the label, on the label's first line.
            icon != null -> {
                val line = with(LocalDensity.current) { tokens.labelTypescale.toTextStyle().lineHeight.takeIf { it.isSp }?.toDp() } ?: tokens.iconSize
                Row(horizontalArrangement = Arrangement.spacedBy(tokens.containerGap), verticalAlignment = Alignment.Top) {
                    Box(Modifier.padding(top = ((line - tokens.iconSize) / 2).coerceAtLeast(NoLength))) { iconBox() }
                    text(Modifier.padding(top = ((tokens.iconSize - line) / 2).coerceAtLeast(NoLength)))
                }
            }
            else -> text(Modifier)
        }
    }
}

/**
 * The tab's own box: at least [minimumWidth] × [minimumHeight], its content inset by `containerPaddingInline` on each
 * side and by [clearance] (the indicator's thickness) above and below, and centered; where the content lands is recorded
 * for the indicator (TAB-16: primary spans it).
 */
@Composable
private fun TanreiTabLayout(info: TanreiTabInfo, tokens: TanreiTabsTokens, minimumWidth: Dp, minimumHeight: Dp, clearance: Dp, modifier: Modifier, content: @Composable () -> Unit) {
    val padding = tokens.containerPaddingInline
    Layout(content = content, modifier = modifier) { measurables, constraints ->
        val pad = padding.roundToPx()
        val inner = measurables.first().measure(
            Constraints(maxWidth = if (constraints.hasBoundedWidth) (constraints.maxWidth - 2 * pad).coerceAtLeast(0) else Constraints.Infinity, maxHeight = constraints.maxHeight),
        )
        val width = maxOf(constraints.minWidth, minimumWidth.roundToPx(), inner.width + 2 * pad).coerceAtMost(constraints.maxWidth)
        val height = maxOf(constraints.minHeight, minimumHeight.roundToPx(), inner.height + 2 * clearance.roundToPx()).coerceAtMost(constraints.maxHeight)
        layout(width, height) {
            val x = (width - inner.width) / 2
            inner.placeRelative(x, (height - inner.height) / 2)
            info.contentLeft = x.toFloat()
            info.contentWidth = inner.width.toFloat()
        }
    }
}

/** No length: a tab has no outline and draws nothing outside itself. */
private val NoLength = Dp.Hairline

/** Debuggable apps only (TAB-19): one report per message and composition site. */
@Composable
private fun TanreiReportTabsProblem(message: String) {
    if (!isTanreiDebuggable()) return
    remember(message) { TanreiDiagnostics.reporter(message) }
}

/**
 * Debuggable apps only (TAB-11): a selected value that names none of the tabs (none is drawn selected), a tab whose
 * value is empty, and a value given to more than one tab (the first is the one it selects). Each reported once, after
 * the tabs registered.
 */
@Composable
private fun TanreiReportTabValues(state: TanreiTabsState, selectedValue: String?) {
    if (!isTanreiDebuggable()) return
    val reported = remember { mutableSetOf<String>() }
    LaunchedEffect(state, selectedValue) {
        snapshotFlow {
            val tabs = state.roving.ordered
            val values = tabs.map { it.value }
            buildList {
                if (selectedValue != null && values.isNotEmpty() && selectedValue !in values) add("TanreiTabs: selectedValue \"$selectedValue\" names none of its tabs; none is drawn selected.")
                tabs.filter { it.value.isEmpty() }.forEach { add("TanreiTab \"${it.text}\": its value is empty; it cannot be selected by value.") }
                values.filter { it.isNotEmpty() }.groupingBy { it }.eachCount().filterValues { it > 1 }.keys.forEach { add("TanreiTabs: the value \"$it\" is given to more than one tab; the first of them is the one it selects.") }
            }
        }.collect { problems -> problems.forEach { if (reported.add(it)) TanreiDiagnostics.reporter(it) } }
    }
}
