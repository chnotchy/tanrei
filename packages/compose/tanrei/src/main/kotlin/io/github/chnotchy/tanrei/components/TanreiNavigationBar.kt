package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.displayCutout
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.union
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.semantics
import io.github.chnotchy.tanrei.primitives.TanreiDestinationParts
import io.github.chnotchy.tanrei.primitives.TanreiDestinationStyle
import io.github.chnotchy.tanrei.primitives.TanreiDestinations
import io.github.chnotchy.tanrei.primitives.TanreiNavigationDestination
import io.github.chnotchy.tanrei.primitives.TanreiReportDestinations
import io.github.chnotchy.tanrei.primitives.isDrawn
import io.github.chnotchy.tanrei.primitives.rememberTanreiDestinations
import io.github.chnotchy.tanrei.primitives.tanreiDestinationGroup
import io.github.chnotchy.tanrei.primitives.tanreiElevation
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.TanreiNavigationBarCondition
import io.github.chnotchy.tanrei.tokens.TanreiNavigationBarTokens

/*
 * `specs/navigation-bar.spec.json` (NVB-1…22) on Compose, as `platforms.compose` maps it — Material's `NavigationBar` and
 * `NavigationBarItem`: `TanreiNavigationBar(labelVisibility, contentDescription) { TanreiNavigationBarItem(…) … }`. There
 * is no bar-level value: the caller marks the selected destination with `selected = (current == value)`, and one
 * `onClick` per destination is both the spec's `change` and its `reselect` (the caller knows which one is selected). The
 * destinations are the platform's tab bar (NVB-19): tabs in a selectable group, each a Tab stop of its own.
 */

/** Which destinations draw their label (NVB-13, NVR-14). A label that is not drawn is still the accessible name. */
public enum class TanreiNavigationLabelVisibility {
    /** Every destination's label. The default. */
    Always,

    /** Only the selected destination's label. */
    Selected,

    /** No label; the item containers are centered in their cells. */
    Never,
}

/**
 * A Tanrei badge on a destination's icon (NVB-16, NVR-17): the badge component's [count] — null draws the dot, 0
 * nothing, above 0 the number (above 999 as `999+`) — and its [contentDescription], the spec's `badgeLabel`, read after
 * the destination's name and state ("3 unread"; a dot needs one).
 */
@Immutable
public data class TanreiNavigationBadge(
    public val count: Int? = null,
    public val contentDescription: String = "",
)

/** What a [TanreiNavigationBarItem] learns from its bar. */
private class TanreiNavigationBarContext(
    val destinations: TanreiDestinations,
    val labelVisibility: TanreiNavigationLabelVisibility,
    val style: TanreiDestinationStyle,
)

private val LocalTanreiNavigationBar = compositionLocalOf<TanreiNavigationBarContext?> { null }

/** What [TanreiNavigationBar] takes when a product says nothing else. */
public object TanreiNavigationBarDefaults {
    /** NVB-18: the navigation bars and the horizontal display cutout — the bar's color reaches under them, its destinations do not. */
    public val windowInsets: WindowInsets
        @Composable
        get() = WindowInsets.navigationBars.union(WindowInsets.displayCutout.only(WindowInsetsSides.Horizontal))
}

/**
 * The bar of a product's three to five top-level destinations along the bottom edge of a compact screen. Implements
 * `specs/navigation-bar.spec.json`; every value comes from `TanreiTheme.tokens.navigationBar`. It spans the width it is
 * given, divides it into equal cells, one per [TanreiNavigationBarItem], reaches under [windowInsets] with its color and
 * keeps its destinations above them. To assistive technology it is a tab bar: a selectable group of tabs, named by
 * [contentDescription].
 *
 * @param modifier applied to the whole bar, including the part under the system insets.
 * @param labelVisibility which destinations draw their label (NVB-13).
 * @param contentDescription the spec's `label`: names the bar ("Main").
 * @param windowInsets the system insets the bar's color reaches under and its destinations keep out of (NVB-18).
 * @param content the [TanreiNavigationBarItem]s, in order. Fewer than three or more than five still render, and a
 *   debuggable app reports the count (NVB-17).
 */
@Composable
public fun TanreiNavigationBar(
    modifier: Modifier = Modifier,
    labelVisibility: TanreiNavigationLabelVisibility = TanreiNavigationLabelVisibility.Always,
    contentDescription: String = "",
    windowInsets: WindowInsets = TanreiNavigationBarDefaults.windowInsets,
    content: @Composable RowScope.() -> Unit,
) {
    val system = TanreiTheme.tokens
    val tokens = system.navigationBar
    val destinations = rememberTanreiDestinations(horizontal = true, direction = LocalLayoutDirection.current)
    TanreiReportDestinations(destinations, "TanreiNavigationBar", NavigationBarRange)
    val style = remember(tokens) { tokens.destinationStyle() }
    val context = remember(destinations, labelVisibility, style) { TanreiNavigationBarContext(destinations, labelVisibility, style) }

    // NVB-11: the surface, its elevation, and the top edge; NVB-18: all of it reaching under the insets.
    val containerColor = tokens.containerColor.color
    val outlineColor = tokens.outlineColor.color
    val outlineWidth = tokens.outlineWidth
    val count = destinations.order.size
    Row(
        modifier
            .fillMaxWidth()
            .tanreiElevation(tokens.containerElevation, RectangleShape)
            .drawBehind {
                if (containerColor.isDrawn) drawRect(containerColor)
                val thickness = outlineWidth.toPx()
                if (outlineColor.isDrawn && thickness > 0f) drawRect(outlineColor, topLeft = Offset.Zero, size = Size(size.width, thickness))
            }
            .windowInsetsPadding(windowInsets)
            // NVB-19: the tab bar — a selectable group of `count` tabs in one row, named by its label.
            .semantics { tanreiDestinationGroup(contentDescription, count, horizontal = true) }
            // NVB-11 / NVB-21: at least the bar's height, and as tall as a destination with its label needs.
            .heightIn(min = tokens.containerHeight)
            .height(IntrinsicSize.Min),
    ) {
        CompositionLocalProvider(LocalTanreiNavigationBar provides context) { content() }
    }
}

/**
 * One destination of a [TanreiNavigationBar] (the spec's item kind `destination`): an equal share of the bar's width
 * and its full height, all of it the hit area (NVB-6). Call it in the bar's content lambda.
 *
 * @param selected the spec's `value`: true for the destination the bar's value names — the caller marks it,
 *   `selected = (current == value)`. When more than one is marked, the first is drawn selected and a debuggable app
 *   reports it (NVB-22).
 * @param onClick the spec's `change` and `reselect`: the user activated this destination — pointer, touch, Enter,
 *   Space, an assistive technology's click (NVB-1). The caller tells a change from a reselect by [selected].
 * @param icon the name of the destination's glyph in the system's icon set, drawn in the icon style of its selection —
 *   outlined while unselected, filled while selected (NVB-14). The app installs the icon font (see the README).
 * @param label its name, drawn under the icon (see the bar's `labelVisibility`) and always its accessible name. An
 *   empty one still renders, and a debuggable app reports it (NVB-20).
 * @param modifier applied to the destination's cell.
 * @param enabled the Compose idiom for the spec's `disabled` (inverse): a disabled destination keeps its place, draws
 *   its disabled look, cannot be activated and takes no focus (NVB-2, NVB-7).
 * @param badge the spec's `badge`, `badgeCount` and `badgeLabel`: a Tanrei badge on the icon; null draws none (NVB-16).
 * @param interactionSource hoist to observe or drive hover, focus and press.
 */
@Composable
public fun RowScope.TanreiNavigationBarItem(
    selected: Boolean,
    onClick: () -> Unit,
    icon: String,
    label: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    badge: TanreiNavigationBadge? = null,
    interactionSource: MutableInteractionSource? = null,
) {
    val bar = LocalTanreiNavigationBar.current
    val tokens = TanreiTheme.tokens.navigationBar
    val style = bar?.style ?: remember(tokens) { tokens.destinationStyle() }
    val visibility = bar?.labelVisibility ?: TanreiNavigationLabelVisibility.Always
    val badgeDescription = badge?.let { tanreiBadgeDescription(it.count, it.contentDescription) }
    TanreiNavigationDestination(
        destinations = bar?.destinations,
        selected = selected,
        onClick = onClick,
        icon = icon,
        label = label,
        enabled = enabled,
        style = style,
        labelShown = { drawnSelected -> visibility.shows(drawnSelected) },
        badgeDescription = badgeDescription,
        badge = badge?.let { given -> { anchor -> TanreiBadge(count = given.count, contentDescription = given.contentDescription, anchor = anchor) } },
        interactionSource = interactionSource,
        component = "TanreiNavigationBarItem",
        // NVB-21: the bar keeps room for a label while labels are drawn at all, so it does not change height.
        reserveLabel = visibility != TanreiNavigationLabelVisibility.Never,
        // NVB-6 / NVB-11: an equal share of the width, the bar's full height.
        modifier = Modifier.weight(1f).fillMaxHeight().then(modifier),
    )
}

/** NVB-13: whether a destination drawn [selected] (or not) draws its label. */
internal fun TanreiNavigationLabelVisibility.shows(selected: Boolean): Boolean = when (this) {
    TanreiNavigationLabelVisibility.Always -> true
    TanreiNavigationLabelVisibility.Selected -> selected
    TanreiNavigationLabelVisibility.Never -> false
}

/** NVB-17: what a bar is designed to hold. */
private val NavigationBarRange = 3..5

/** The bar's tokens as its destinations read them (NVB-3, NVB-4, NVB-7, NVB-12, NVB-14, NVB-15). */
private fun TanreiNavigationBarTokens.destinationStyle(): TanreiDestinationStyle = TanreiDestinationStyle(
    containerWidth = itemContainerWidth,
    containerHeight = itemContainerHeight,
    containerShape = itemContainerShape,
    gap = itemGap,
    iconSize = itemIconSize,
    labelTypescale = itemLabelTypescale,
    labelMaxLines = 1,
    feedbackDuration = motionFeedbackDuration,
    stateDuration = motionStateDuration,
    stateEasing = motionStateEasing,
    selectionDuration = motionSelectionDuration,
    selectionEasing = motionSelectionEasing,
    opacity = ::opacity,
    parts = { selected, state ->
        // NVB-3: the selected parts for the selected destination, the unselected parts for every other.
        val condition = conditions[if (selected) TanreiNavigationBarCondition.Selected else TanreiNavigationBarCondition.Unselected][state]
        TanreiDestinationParts(condition.itemContainerColor, condition.itemIconColor, condition.itemLabelColor)
    },
)
