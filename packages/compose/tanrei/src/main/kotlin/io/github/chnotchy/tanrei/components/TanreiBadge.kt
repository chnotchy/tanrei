package io.github.chnotchy.tanrei.components

import android.content.res.Configuration
import android.os.Build
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.graphics.drawOutline
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.Constraints
import io.github.chnotchy.tanrei.primitives.LocalTanreiAnchorDescription
import io.github.chnotchy.tanrei.primitives.TanreiReportInvalidValue
import io.github.chnotchy.tanrei.primitives.TanreiReportMissingName
import io.github.chnotchy.tanrei.primitives.isDrawn
import io.github.chnotchy.tanrei.primitives.spreadShadowPath
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiBadgeTokens
import java.text.NumberFormat
import java.util.Locale

/**
 * Marks its [anchor] with a dot or a small count to show that something is waiting. Implements
 * `specs/badge.spec.json` (BDG-1…14) and plays Material's `BadgedBox` and `Badge` together. Every design value comes
 * from the current design system's [TanreiBadgeTokens] (`TanreiTheme.tokens.badge`).
 *
 * The badge sits on the anchor's top-end corner (its top-left in a right-to-left layout) without changing the anchor's
 * size or position, takes no space in the layout (it may draw past the anchor's bounds) and takes no input: pointer,
 * touch and keys reach the anchor (BDG-7).
 *
 * @param count how many things are waiting: null draws the dot (BDG-1), 0 draws nothing and adds nothing (BDG-5), above
 *   0 draws the number (BDG-2). A negative count draws as 0, and a debuggable app reports it (BDG-14); an `Int` is never
 *   fractional or not a number, the spec's other two cases.
 * @param modifier applied to the badge and its anchor together; their box is the anchor's.
 * @param max the largest count shown as it is; a larger one shows as `max+` (`999+`, BDG-4). Below 1 it is 999, and a
 *   debuggable app reports it (BDG-14).
 * @param contentDescription the spec's `label`: what assistive technology reads after the anchor's own name
 *   ("3 unread"). The drawn dot and number are hidden; this (or, when empty and there is a count, the displayed text)
 *   becomes the anchor's `stateDescription` (BDG-8). A Tanrei control as the anchor puts it on its own node; for
 *   anything else it is on the badge's box, and reaches assistive technology through the nearest element that merges
 *   its descendants (see the README). A dot with no description is reported in debuggable apps (BDG-9).
 * @param anchor what the badge sits on: an icon, an icon button, a navigation item or an avatar.
 */
@Composable
public fun TanreiBadge(
    count: Int?,
    modifier: Modifier = Modifier,
    max: Int = TanreiBadgeDefaultMax,
    contentDescription: String = "",
    anchor: @Composable () -> Unit,
) {
    val system = TanreiTheme.tokens
    val tokens = system.badge
    // BDG-14: a count below 0 is 0; a max below 1 is the default. (A count is an Int on this platform: never fractional,
    // never not a number.)
    if (count != null && count < 0) TanreiReportInvalidValue("TanreiBadge", "count", count.toString(), "is negative", "as 0")
    if (max < 1) TanreiReportInvalidValue("TanreiBadge", "max", max.toString(), "is below 1", "with the default max of $TanreiBadgeDefaultMax")
    val shown = count?.coerceAtLeast(0)
    val cap = if (max < 1) TanreiBadgeDefaultMax else max
    val dot = shown == null
    // BDG-4 / BDG-12: the displayed text — the count, or the cap and a plus sign — in the locale's digits.
    val text = if (shown != null && shown > 0) tanreiBadgeText(shown, cap, LocalConfiguration.current.primaryLocale) else null
    // BDG-8: what assistive technology reads after the anchor's name. BDG-5: nothing at all for a count of 0.
    val description = tanreiBadgeDescription(dot, text, contentDescription)
    // BDG-9: a dot without a description still renders; a debuggable app hears about it.
    if (dot && description == null) TanreiReportMissingName("TanreiBadge", "contentDescription", what = "a dot alone")

    // BDG-8 / BDG-10: a state description — updated with the count, never announced by itself (no live region).
    val semantics = if (description != null) Modifier.semantics { stateDescription = description } else Modifier
    Layout(
        modifier = modifier.then(semantics),
        content = {
            // The anchor, handed the description so that a Tanrei control puts it on the node that is announced.
            Box(propagateMinConstraints = true) {
                CompositionLocalProvider(LocalTanreiAnchorDescription provides description, anchor)
            }
            when {
                dot -> TanreiBadgeDot(tokens)
                text != null -> TanreiBadgePill(tokens, text)
            }
        },
    ) { measurables, constraints ->
        // BDG-7: the box is the anchor's; the badge is measured on its own and placed over it.
        val anchorPlaceable = measurables[0].measure(constraints)
        val badge = measurables.getOrNull(1)?.measure(Constraints())
        layout(anchorPlaceable.width, anchorPlaceable.height) {
            anchorPlaceable.placeRelative(0, 0)
            if (badge != null) {
                // BDG-1 / BDG-3: the center of the dot — or of the pill's leading circle, a square of the pill's height at
                // its start — sits `offset` inside the anchor's top-end corner on both axes, so a longer count grows
                // toward the end. BDG-11: `placeRelative` mirrors it in a right-to-left layout (top-left corner, growing
                // left).
                val offset = (if (dot) tokens.dotOffset else tokens.containerOffset).roundToPx()
                val half = badge.height / 2
                badge.placeRelative(anchorPlaceable.width - offset - half, offset - half)
            }
        }
    }
}

/** The spec's default `max`. */
internal const val TanreiBadgeDefaultMax: Int = 999

/**
 * BDG-8 / BDG-5: what assistive technology reads after the anchor's name — [contentDescription], or for a count without
 * one the displayed [text]; nothing for a count of 0 (no [text]) or a dot without a description. [dot]: the count is null.
 */
private fun tanreiBadgeDescription(dot: Boolean, text: String?, contentDescription: String): String? = when {
    dot -> contentDescription.ifBlank { null }
    text != null -> contentDescription.ifBlank { text }
    else -> null
}

/**
 * The description a badge of [count] and [contentDescription] (the spec's `label`) adds after its anchor's name, with
 * the default `max` — what [TanreiBadge] puts on the Tanrei control it wraps. A component that draws a badge on part of
 * itself (a navigation destination's icon, NVB-16) puts it on its own node instead, with this.
 */
@Composable
internal fun tanreiBadgeDescription(count: Int?, contentDescription: String): String? {
    val shown = count?.coerceAtLeast(0)
    val text = if (shown != null && shown > 0) tanreiBadgeText(shown, TanreiBadgeDefaultMax, LocalConfiguration.current.primaryLocale) else null
    return tanreiBadgeDescription(shown == null, text, contentDescription)
}

/**
 * BDG-4 / BDG-12: [count], or [max] and a plus sign when it is larger, in [locale]'s digits without grouping (`1200`
 * with max 9999 is `1200`, never `1,200`). What the pill draws and, without a description, what is read.
 */
internal fun tanreiBadgeText(count: Int, max: Int, locale: Locale): String {
    val format = NumberFormat.getIntegerInstance(locale).apply { isGroupingUsed = false }
    return if (count > max) "${format.format(max)}+" else format.format(count)
}

/**
 * BDG-11: [text] isolated from the surrounding direction (FIRST STRONG ISOLATE … POP DIRECTIONAL ISOLATE, the `<bdi>`
 * of the web): digits and a plus sign have no strong direction of their own, so in a right-to-left paragraph `999+`
 * would be drawn `+999`. Inside the isolate it stays `999+`.
 */
internal fun tanreiIsolated(text: String): String = "\u2068$text\u2069"

/** BDG-12: tabular figures where the font has them, so a changing count does not shift its neighbours. */
internal const val TanreiBadgeFigures: String = "tnum"

private val Configuration.primaryLocale: Locale
    get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) locales[0] else @Suppress("DEPRECATION") locale

/**
 * BDG-1 / BDG-6: the dot — a circle of `dot.size` in the container color, with the outline ring OUTSIDE its edge, so
 * the ring never changes where the dot sits. BDG-13: dp, so a larger text size does not grow it. BDG-8: hidden.
 */
@Composable
private fun TanreiBadgeDot(tokens: TanreiBadgeTokens) {
    val fill = tokens.containerColor.color
    val outline = tokens.outlineColor.color
    val ring = tokens.outlineWidth
    Box(
        Modifier
            .clearAndSetSemantics {}
            .size(tokens.dotSize)
            .drawBehind {
                val radius = size.minDimension / 2
                if (outline.isDrawn) drawCircle(outline, radius = radius + ring.toPx())
                drawCircle(fill, radius = radius)
            },
    )
}

/**
 * BDG-2 / BDG-6 / BDG-13: the pill — at least `container.height` high and at least as wide as it is high,
 * `container.padding-inline` on each side of the label, corners of `container.shape` (eased by the system's corner
 * smoothing, as every container), the outline ring outside its edge. It grows with the label at larger text sizes.
 */
@Composable
private fun TanreiBadgePill(tokens: TanreiBadgeTokens, text: String) {
    val fill = tokens.containerColor.color
    val outline = tokens.outlineColor.color
    val smoothing = TanreiTheme.tokens.shape.cornerSmoothing
    val shape = remember(tokens.containerShape, smoothing) { tanreiContainerShape(tokens.containerShape, smoothing) }
    val style = tokens.labelTypescale.toTextStyle().merge(TextStyle(color = tokens.labelColor.color, fontFeatureSettings = TanreiBadgeFigures))
    val ring = tokens.outlineWidth
    Layout(
        modifier = Modifier
            .clearAndSetSemantics {}
            .drawWithCache {
                val container = shape.createOutline(size, layoutDirection, this)
                val band = if (outline.isDrawn) spreadShadowPath(container, ring.toPx()) else null
                onDrawBehind {
                    if (band != null) drawPath(band, outline)
                    drawOutline(container, fill)
                }
            },
        content = { BasicText(tanreiIsolated(text), style = style, softWrap = false) },
    ) { measurables, _ ->
        val label = measurables.single().measure(Constraints())
        val height = maxOf(tokens.containerHeight.roundToPx(), label.height)
        val width = maxOf(height, label.width + 2 * tokens.containerPaddingInline.roundToPx())
        layout(width, height) { label.placeRelative((width - label.width) / 2, (height - label.height) / 2) }
    }
}
