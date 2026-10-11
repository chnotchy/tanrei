package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.displayCutout
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.union
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.LayoutDirection
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
import io.github.chnotchy.tanrei.tokens.TanreiNavigationRailCondition
import io.github.chnotchy.tanrei.tokens.TanreiNavigationRailTokens

/*
 * `specs/navigation-rail.spec.json` (NVR-1…23) on Compose, as `platforms.compose` maps it — Material's `NavigationRail`
 * and `NavigationRailItem`: `TanreiNavigationRail(header = { … }, labelVisibility, contentDescription) {
 * TanreiNavigationRailItem(…) … }`. The navigation bar's destinations along the start edge of a wide window, with the
 * bar's semantics (a tab bar, each destination a Tab stop) and its item structure (the shared destination primitive),
 * drawn from the rail's own tokens. As for the bar there is no rail-level value: the caller marks the selected item.
 */

/** What a [TanreiNavigationRailItem] learns from its rail. */
private class TanreiNavigationRailContext(
    val destinations: TanreiDestinations,
    val labelVisibility: TanreiNavigationLabelVisibility,
    val style: TanreiDestinationStyle,
)

private val LocalTanreiNavigationRail = compositionLocalOf<TanreiNavigationRailContext?> { null }

/** What [TanreiNavigationRail] takes when a product says nothing else. */
public object TanreiNavigationRailDefaults {
    /**
     * NVR-19: the system bars' start, top and bottom, and the display cutout on the start side — the rail's color reaches
     * under them, its header and destinations do not. (A rail is at the start edge: its end is the content's.)
     */
    public val windowInsets: WindowInsets
        @Composable
        get() = WindowInsets.systemBars.union(WindowInsets.displayCutout).only(WindowInsetsSides.Start + WindowInsetsSides.Vertical)
}

/**
 * The column of a product's top-level destinations along the start edge of a medium or expanded window. Implements
 * `specs/navigation-rail.spec.json`; every value comes from `TanreiTheme.tokens.navigationRail`. It spans the height it
 * is given, `containerWidth` wide beside the start inset, reaches under [windowInsets] with its color and keeps its
 * content inside them. To assistive technology its destinations are a tab bar, named by [contentDescription], after the
 * header's own content.
 *
 * @param modifier applied to the whole rail, including the part under the system insets.
 * @param header the spec's `header` slot: the header-button items (a [TanreiIconButton], the menu) and a floating action
 *   button the product places there, stacked and centered above the destinations, `containerPaddingBlock` below the
 *   top. The rail does not restyle them; they come first in reading and focus order.
 * @param labelVisibility which destinations draw their label (NVR-14): [TanreiNavigationLabelVisibility.Always] (default),
 *   [TanreiNavigationLabelVisibility.Selected] (only the selected one's) or [TanreiNavigationLabelVisibility.Never].
 * @param contentDescription the spec's `label`: names the destinations ("Main").
 * @param windowInsets the system insets the rail's color reaches under and its content keeps out of (NVR-19).
 * @param content the [TanreiNavigationRailItem]s, in order. They scroll when the rail is too short for them (the header
 *   stays); fewer than three or more than seven still render, and a debuggable app reports the count (NVR-18).
 */
@Composable
public fun TanreiNavigationRail(
    modifier: Modifier = Modifier,
    header: (@Composable ColumnScope.() -> Unit)? = null,
    labelVisibility: TanreiNavigationLabelVisibility = TanreiNavigationLabelVisibility.Always,
    contentDescription: String = "",
    windowInsets: WindowInsets = TanreiNavigationRailDefaults.windowInsets,
    content: @Composable ColumnScope.() -> Unit,
) {
    val system = TanreiTheme.tokens
    val tokens = system.navigationRail
    val destinations = rememberTanreiDestinations(horizontal = false, direction = LocalLayoutDirection.current)
    TanreiReportDestinations(destinations, "TanreiNavigationRail", NavigationRailRange)
    val style = remember(tokens) { tokens.destinationStyle() }
    val context = remember(destinations, labelVisibility, style) { TanreiNavigationRailContext(destinations, labelVisibility, style) }

    // NVR-11: the surface, its elevation and the end edge (the left one right-to-left); NVR-19: under the insets.
    val containerColor = tokens.containerColor.color
    val outlineColor = tokens.outlineColor.color
    val outlineWidth = tokens.outlineWidth
    val count = destinations.order.size
    // NVR-6 / NVR-12: each cell holds half the gap above and below its destination, so the first destination's group
    // sits header-gap (or padding-block) below what is above it.
    val halfGap = tokens.containerGap / 2
    Column(
        modifier
            .fillMaxHeight()
            .tanreiElevation(tokens.containerElevation, RectangleShape)
            .drawBehind {
                if (containerColor.isDrawn) drawRect(containerColor)
                val thickness = outlineWidth.toPx()
                if (outlineColor.isDrawn && thickness > 0f) {
                    val x = if (layoutDirection == LayoutDirection.Rtl) 0f else size.width - thickness
                    drawRect(outlineColor, topLeft = Offset(x, 0f), size = Size(thickness, size.height))
                }
            }
            .windowInsetsPadding(windowInsets)
            .width(tokens.containerWidth),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(if (header != null) tokens.containerPaddingBlock else (tokens.containerPaddingBlock - halfGap).coerceAtLeast(NoSpace)))
        if (header != null) {
            // NVR-12: the header's content stacked and centered; NVR-20: first in reading and focus order.
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Top, content = header)
            Spacer(Modifier.height((tokens.headerGap - halfGap).coerceAtLeast(NoSpace)))
        }
        // NVR-18: the destinations scroll, the header stays. NVR-20: a tab bar of `count` destinations in one column.
        Column(
            Modifier
                .fillMaxWidth()
                .weight(1f, fill = false)
                .verticalScroll(rememberScrollState())
                .semantics { tanreiDestinationGroup(contentDescription, count, horizontal = false) },
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            CompositionLocalProvider(LocalTanreiNavigationRail provides context) { content() }
        }
    }
}

/**
 * One destination of a [TanreiNavigationRail] (the spec's item kind `destination`): the rail's full width and its
 * destination's height, with half of `containerGap` above and below, at least `sys.target.touch` high — all of it the
 * hit area (NVR-6). Call it in the rail's content lambda.
 *
 * @param selected the spec's `value`: true for the destination the rail's value names — the caller marks it. When more
 *   than one is marked, the first is drawn selected and a debuggable app reports it (NVR-23).
 * @param onClick the spec's `change` and `reselect`: the user activated this destination (NVR-1).
 * @param icon the name of the destination's glyph, drawn in the icon style of its selection (NVR-15).
 * @param label its name, under the icon on at most two lines (see the rail's `labelVisibility`), and always its
 *   accessible name. An empty one still renders, and a debuggable app reports it (NVR-21).
 * @param modifier applied to the destination's cell.
 * @param enabled the Compose idiom for the spec's `disabled` (inverse) (NVR-2, NVR-7).
 * @param badge the spec's `badge`, `badgeCount` and `badgeLabel`: a Tanrei badge on the icon (NVR-17).
 * @param interactionSource hoist to observe or drive hover, focus and press.
 */
@Composable
public fun ColumnScope.TanreiNavigationRailItem(
    selected: Boolean,
    onClick: () -> Unit,
    icon: String,
    label: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    badge: TanreiNavigationBadge? = null,
    interactionSource: MutableInteractionSource? = null,
) {
    val rail = LocalTanreiNavigationRail.current
    val system = TanreiTheme.tokens
    val tokens = system.navigationRail
    val style = rail?.style ?: remember(tokens) { tokens.destinationStyle() }
    val visibility = rail?.labelVisibility ?: TanreiNavigationLabelVisibility.Always
    val badgeDescription = badge?.let { tanreiBadgeDescription(it.count, it.contentDescription) }
    TanreiNavigationDestination(
        destinations = rail?.destinations,
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
        component = "TanreiNavigationRailItem",
        // NVR-16 / NVR-22: a destination's height follows its label (two lines at most), and moves as it comes and goes.
        reserveLabel = false,
        modifier = Modifier.fillMaxWidth().then(modifier),
        cellPaddingBlock = tokens.containerGap / 2,
        minCellHeight = system.measure.targetTouch,
    )
}

/** NVR-18: what a rail is designed to hold. */
private val NavigationRailRange = 3..7

private val NoSpace = androidx.compose.ui.unit.Dp.Hairline

/** The rail's tokens as its destinations read them (NVR-3, NVR-4, NVR-7, NVR-13, NVR-15, NVR-16). */
private fun TanreiNavigationRailTokens.destinationStyle(): TanreiDestinationStyle = TanreiDestinationStyle(
    containerWidth = itemContainerWidth,
    containerHeight = itemContainerHeight,
    containerShape = itemContainerShape,
    gap = itemGap,
    iconSize = itemIconSize,
    labelTypescale = itemLabelTypescale,
    labelMaxLines = 2,
    feedbackDuration = motionFeedbackDuration,
    stateDuration = motionStateDuration,
    stateEasing = motionStateEasing,
    selectionDuration = motionSelectionDuration,
    selectionEasing = motionSelectionEasing,
    opacity = ::opacity,
    parts = { selected, state ->
        // NVR-3: the selected parts for the selected destination, the unselected parts for every other.
        val condition = conditions[if (selected) TanreiNavigationRailCondition.Selected else TanreiNavigationRailCondition.Unselected][state]
        TanreiDestinationParts(condition.itemContainerColor, condition.itemIconColor, condition.itemLabelColor)
    },
)
