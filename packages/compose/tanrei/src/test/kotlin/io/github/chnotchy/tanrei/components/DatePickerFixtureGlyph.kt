package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph

/**
 * The stand-in for the icon font's glyph [name] in the date picker's baselines and tests: `chevron_left` and
 * `chevron_right` chevrons, `expand_more` a chevron pointing down, `keyboard` a keyboard, `calendar_month` a calendar
 * page; any other name is [NamedFixtureGlyph]'s. Kept apart from it on purpose: other components' baselines draw some of
 * these names as a plus, and must not move. Stroked by the glyph's weight in the icon color the slot is given. Tests
 * only: the proportions describe a picture, not a design value.
 */
@Composable
internal fun DatePickerFixtureGlyph(name: String, modifier: Modifier = Modifier.fillMaxSize()) {
    if (name !in DATE_PICKER_GLYPHS) return NamedFixtureGlyph(name, modifier)
    val glyph = LocalTanreiIconGlyph.current
    val color = LocalTanreiContentColor.current
    Canvas(modifier) {
        val stroke = size.minDimension * glyph.weight / STROKE_PER_WEIGHT
        fun at(x: Float, y: Float) = Offset(size.width * x, size.height * y)
        when (name) {
            "chevron_left" -> {
                drawLine(color, at(0.6f, 0.25f), at(0.35f, 0.5f), stroke, StrokeCap.Round)
                drawLine(color, at(0.35f, 0.5f), at(0.6f, 0.75f), stroke, StrokeCap.Round)
            }
            "chevron_right" -> {
                drawLine(color, at(0.4f, 0.25f), at(0.65f, 0.5f), stroke, StrokeCap.Round)
                drawLine(color, at(0.65f, 0.5f), at(0.4f, 0.75f), stroke, StrokeCap.Round)
            }
            "expand_more" -> {
                drawLine(color, at(0.25f, 0.4f), at(0.5f, 0.65f), stroke, StrokeCap.Round)
                drawLine(color, at(0.5f, 0.65f), at(0.75f, 0.4f), stroke, StrokeCap.Round)
            }
            "keyboard" -> {
                drawRoundRect(color, topLeft = at(0.12f, 0.26f), size = Size(size.width * 0.76f, size.height * 0.48f), cornerRadius = CornerRadius(stroke), style = Stroke(stroke))
                for (x in listOf(0.28f, 0.42f, 0.58f, 0.72f)) drawCircle(color, radius = stroke * 0.6f, center = at(x, 0.42f))
                drawLine(color, at(0.34f, 0.6f), at(0.66f, 0.6f), stroke, StrokeCap.Round)
            }
            "calendar_month" -> {
                drawRoundRect(color, topLeft = at(0.18f, 0.22f), size = Size(size.width * 0.64f, size.height * 0.6f), cornerRadius = CornerRadius(stroke), style = Stroke(stroke))
                drawLine(color, at(0.18f, 0.38f), at(0.82f, 0.38f), stroke)
                drawLine(color, at(0.34f, 0.14f), at(0.34f, 0.28f), stroke, StrokeCap.Round)
                drawLine(color, at(0.66f, 0.14f), at(0.66f, 0.28f), stroke, StrokeCap.Round)
                for (x in listOf(0.34f, 0.5f, 0.66f)) for (y in listOf(0.52f, 0.68f)) drawCircle(color, radius = stroke * 0.55f, center = at(x, y))
            }
        }
    }
}

private val DATE_PICKER_GLYPHS = setOf("chevron_left", "chevron_right", "expand_more", "keyboard", "calendar_month")

/** Weight 400 strokes a tenth of the box (as `NamedFixtureGlyph`). */
private const val STROKE_PER_WEIGHT = 4000f
