package io.github.chnotchy.tanrei.primitives

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.layout
import androidx.compose.ui.unit.Dp
import io.github.chnotchy.tanrei.theme.TanreiTheme

/**
 * Reserves at least [minimum] × [minimum] of layout for an element and centers the element in it,
 * without changing the element's own (visual) size.
 *
 * Order matters: put the input modifier (`clickable`, `toggleable`, …) **before** this one so the
 * hit area and the accessibility bounds cover the reserved space, and the visual modifiers
 * (background, border, focus ring) **after** it so they keep the visual size.
 *
 * @param minimum defaults to the current system's `sys.target.touch`.
 */
@Composable
internal fun Modifier.tanreiMinimumTouchTarget(minimum: Dp = TanreiTheme.tokens.measure.targetTouch): Modifier =
    layout { measurable, constraints ->
        val placeable = measurable.measure(constraints)
        val minimumPx = minimum.roundToPx()
        val width = maxOf(placeable.width, minimumPx)
        val height = maxOf(placeable.height, minimumPx)
        layout(width, height) {
            placeable.place((width - placeable.width) / 2, (height - placeable.height) / 2)
        }
    }
