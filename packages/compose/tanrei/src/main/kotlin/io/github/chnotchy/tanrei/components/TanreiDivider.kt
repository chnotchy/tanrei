package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.layout
import androidx.compose.ui.semantics.SemanticsPropertyKey
import androidx.compose.ui.semantics.SemanticsPropertyReceiver
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.hideFromAccessibility
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.constrainHeight
import androidx.compose.ui.unit.constrainWidth
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.TanreiDividerTokens

/**
 * Where the line of a [TanreiDivider] is shortened (the spec's `inset`), by `comp.divider.line.inset`: nowhere, at its
 * start (the inline-start of a horizontal divider — its right end in a right-to-left layout — or the top of a vertical
 * one), or at both ends (a middle divider). A closed set: a structural choice, not a token axis.
 */
public enum class TanreiDividerInset { None, Start, Both }

/**
 * Separates groups of content with one thin line. Implements `specs/divider.spec.json` (DIV-1…8). Every design value
 * comes from the current design system's [TanreiDividerTokens] (`TanreiTheme.tokens.divider`): the line's color and
 * thickness, and the length [inset] shortens it by. The divider has no container and adds no space around itself
 * (DIV-2): the gap on either side of the line belongs to the layout that places it.
 *
 * @param modifier applied to the divider, whose box is the line's full length by its thickness.
 * @param orientation foundation's [Orientation] (as `Modifier.scrollable` takes it): [Orientation.Horizontal] separates
 *   stacked content and fills the width its layout gives it; [Orientation.Vertical] separates content in a row and
 *   fills the height (in a [androidx.compose.foundation.layout.Row], give the row a height — for instance
 *   `Modifier.height(IntrinsicSize.Min)` — as Material's `VerticalDivider` needs too).
 * @param inset [TanreiDividerInset.None] (default) spans the full length; `Start` and `Both` leave
 *   `comp.divider.line.inset` undrawn at the start, or at both ends. The box keeps its full length either way.
 * @param decorative true (default): hidden from assistive technology. False: kept in the semantics tree as a separator
 *   with its orientation (Android has no separator role; see the README). Never focusable, never named.
 */
@Composable
public fun TanreiDivider(
    modifier: Modifier = Modifier,
    orientation: Orientation = Orientation.Horizontal,
    inset: TanreiDividerInset = TanreiDividerInset.None,
    decorative: Boolean = true,
) {
    val tokens = TanreiTheme.tokens.divider
    // DIV-7: orientation and inset are closed enums — a value the divider does not define cannot be passed on this
    // platform, so there is nothing to fall back from and nothing to report.
    val horizontal = orientation == Orientation.Horizontal
    // DIV-3: the inset stretch draws nothing. Padding is placed in whole pixels, so the line's ends stay on the grid.
    val length = tokens.lineInset
    val line = if (horizontal) {
        // DIV-4: `start` / `end` follow the layout direction — the start inset of a horizontal line is at its right
        // end in a right-to-left layout.
        val shortened = when (inset) {
            TanreiDividerInset.None -> Modifier
            TanreiDividerInset.Start -> Modifier.padding(start = length)
            TanreiDividerInset.Both -> Modifier.padding(horizontal = length)
        }
        Modifier.fillMaxWidth().tanreiLineThickness(tokens.lineThickness, horizontal = true).then(shortened)
    } else {
        // DIV-4: a vertical line's inset is at its top whatever the direction.
        val shortened = when (inset) {
            TanreiDividerInset.None -> Modifier
            TanreiDividerInset.Start -> Modifier.padding(top = length)
            TanreiDividerInset.Both -> Modifier.padding(vertical = length)
        }
        Modifier.fillMaxHeight().tanreiLineThickness(tokens.lineThickness, horizontal = false).then(shortened)
    }
    // DIV-5 / DIV-6: never focusable (no focus modifier), never named; decorative is hidden, otherwise a separator.
    val semantics = if (decorative) {
        Modifier.clearAndSetSemantics { hideFromAccessibility() }
    } else {
        Modifier.clearAndSetSemantics { tanreiSeparator = orientation }
    }
    // DIV-1: one straight line of the thickness, in the line color, over the box's length less the inset.
    Box(modifier.then(semantics).then(line).background(tokens.lineColor.color))
}

/**
 * DIV-2 / DIV-8: the cross axis is exactly the thickness, rounded to whole device pixels and never less than one — so
 * the line is never spread over two partial rows (or columns) of pixels, and never vanishes on a low-density screen.
 * Layout places at whole pixels, so the line's edges are on the grid.
 */
private fun Modifier.tanreiLineThickness(thickness: Dp, horizontal: Boolean): Modifier = layout { measurable, constraints ->
    val px = thickness.roundToPx().coerceAtLeast(1)
    val fixed = if (horizontal) {
        val height = constraints.constrainHeight(px)
        constraints.copy(minHeight = height, maxHeight = height)
    } else {
        val width = constraints.constrainWidth(px)
        constraints.copy(minWidth = width, maxWidth = width)
    }
    val placeable = measurable.measure(fixed)
    layout(placeable.width, placeable.height) { placeable.place(0, 0) }
}

/**
 * DIV-6: the orientation of a divider exposed as a separator (`decorative = false`). Compose's [androidx.compose.ui.semantics.Role]
 * has no separator and Android's accessibility API has no separator class, so this key is what the semantics tree
 * carries; TalkBack skips the node (it has no name and no action), as it skips a native divider.
 */
internal val TanreiSeparatorKey: SemanticsPropertyKey<Orientation> = SemanticsPropertyKey("TanreiSeparator")

internal var SemanticsPropertyReceiver.tanreiSeparator: Orientation by TanreiSeparatorKey
