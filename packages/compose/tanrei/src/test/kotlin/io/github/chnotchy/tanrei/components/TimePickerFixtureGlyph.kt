package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph

/**
 * The stand-in for the icon font's glyph [name] in the time picker's baselines and tests: `schedule` a clock face with
 * its hands; any other name (the entry-mode toggle's `keyboard`) is [DatePickerFixtureGlyph]'s. Stroked by the glyph's
 * weight in the icon color the slot is given. Tests only: the proportions describe a picture, not a design value.
 */
@Composable
internal fun TimePickerFixtureGlyph(name: String, modifier: Modifier = Modifier.fillMaxSize()) {
    if (name != "schedule") return DatePickerFixtureGlyph(name, modifier)
    val glyph = LocalTanreiIconGlyph.current
    val color = LocalTanreiContentColor.current
    Canvas(modifier) {
        val stroke = size.minDimension * glyph.weight / STROKE_PER_WEIGHT
        fun at(x: Float, y: Float) = Offset(size.width * x, size.height * y)
        drawCircle(color, radius = size.minDimension * 0.36f, center = at(0.5f, 0.5f), style = Stroke(stroke))
        drawLine(color, at(0.5f, 0.5f), at(0.5f, 0.3f), stroke, StrokeCap.Round)
        drawLine(color, at(0.5f, 0.5f), at(0.64f, 0.6f), stroke, StrokeCap.Round)
    }
}

/** Weight 400 strokes a tenth of the box (as `NamedFixtureGlyph`). */
private const val STROKE_PER_WEIGHT = 4000f
