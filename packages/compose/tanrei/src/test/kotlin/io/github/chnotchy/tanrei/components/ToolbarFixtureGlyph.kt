package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph

/**
 * The stand-in for the icon font's glyph [name] in the toolbar's and the search's baselines: `archive` a box with a lid, `mark_email_unread`
 * an envelope with a dot, `drive_file_move` a folder with an arrow, `attach_file` a paper clip, `image` a framed mountain,
 * `link` two links, `ink_highlighter` a slanted marker, `ink_eraser` a slanted block, `remove` a minus, `my_location` a
 * target and `mic` a microphone; any other name is [BarFixtureGlyph]'s (`delete` a bin) or [NamedFixtureGlyph]'s (`edit`, `check`, `add`, the
 * text marks). Kept apart from both on purpose: other components' baselines draw some of these names as a plus, and must
 * not move. Stroked by the glyph's weight in the icon color the slot is given. Tests only: the proportions describe a
 * picture, not a design value.
 */
@Composable
internal fun ToolbarFixtureGlyph(name: String, modifier: Modifier = Modifier.fillMaxSize()) {
    if (name !in TOOLBAR_GLYPHS) return BarFixtureGlyph(name, modifier)
    val glyph = LocalTanreiIconGlyph.current
    val color = LocalTanreiContentColor.current
    Canvas(modifier) {
        val stroke = size.minDimension * glyph.weight / STROKE_PER_WEIGHT
        fun at(x: Float, y: Float) = Offset(size.width * x, size.height * y)
        val line = Stroke(stroke, join = StrokeJoin.Round, cap = StrokeCap.Round)
        when (name) {
            "archive" -> {
                drawRect(color, topLeft = at(0.18f, 0.2f), size = Size(size.width * 0.64f, size.height * 0.16f), style = line)
                drawRect(color, topLeft = at(0.24f, 0.36f), size = Size(size.width * 0.52f, size.height * 0.44f), style = line)
                drawLine(color, at(0.42f, 0.5f), at(0.58f, 0.5f), stroke, StrokeCap.Round)
            }
            "mark_email_unread" -> {
                drawRect(color, topLeft = at(0.16f, 0.28f), size = Size(size.width * 0.56f, size.height * 0.44f), style = line)
                drawPath(Path().apply { moveTo(size.width * 0.16f, size.height * 0.28f); lineTo(size.width * 0.44f, size.height * 0.52f); lineTo(size.width * 0.72f, size.height * 0.28f) }, color, style = line)
                drawCircle(color, radius = size.minDimension * 0.09f, center = at(0.78f, 0.24f))
            }
            "drive_file_move" -> {
                drawPath(Path().apply { moveTo(size.width * 0.16f, size.height * 0.24f); lineTo(size.width * 0.42f, size.height * 0.24f); lineTo(size.width * 0.5f, size.height * 0.32f); lineTo(size.width * 0.84f, size.height * 0.32f); lineTo(size.width * 0.84f, size.height * 0.78f); lineTo(size.width * 0.16f, size.height * 0.78f); close() }, color, style = line)
                drawLine(color, at(0.36f, 0.55f), at(0.64f, 0.55f), stroke, StrokeCap.Round)
                drawLine(color, at(0.54f, 0.45f), at(0.64f, 0.55f), stroke, StrokeCap.Round)
                drawLine(color, at(0.54f, 0.65f), at(0.64f, 0.55f), stroke, StrokeCap.Round)
            }
            "attach_file" -> {
                drawRoundRect(color, topLeft = at(0.36f, 0.16f), size = Size(size.width * 0.28f, size.height * 0.68f), cornerRadius = CornerRadius(size.width * 0.14f), style = line)
                drawLine(color, at(0.5f, 0.32f), at(0.5f, 0.66f), stroke, StrokeCap.Round)
            }
            "image" -> {
                drawRect(color, topLeft = at(0.18f, 0.2f), size = Size(size.width * 0.64f, size.height * 0.6f), style = line)
                drawPath(Path().apply { moveTo(size.width * 0.26f, size.height * 0.7f); lineTo(size.width * 0.42f, size.height * 0.48f); lineTo(size.width * 0.54f, size.height * 0.62f); lineTo(size.width * 0.62f, size.height * 0.54f); lineTo(size.width * 0.74f, size.height * 0.7f) }, color, style = line)
            }
            "link" -> {
                drawRoundRect(color, topLeft = at(0.12f, 0.38f), size = Size(size.width * 0.4f, size.height * 0.24f), cornerRadius = CornerRadius(size.width * 0.12f), style = line)
                drawRoundRect(color, topLeft = at(0.48f, 0.38f), size = Size(size.width * 0.4f, size.height * 0.24f), cornerRadius = CornerRadius(size.width * 0.12f), style = line)
            }
            "ink_highlighter" -> {
                drawPath(Path().apply { moveTo(size.width * 0.3f, size.height * 0.62f); lineTo(size.width * 0.6f, size.height * 0.2f); lineTo(size.width * 0.76f, size.height * 0.32f); lineTo(size.width * 0.46f, size.height * 0.74f); close() }, color, style = line)
                drawLine(color, at(0.18f, 0.84f), at(0.82f, 0.84f), stroke, StrokeCap.Round)
            }
            "ink_eraser" -> {
                drawPath(Path().apply { moveTo(size.width * 0.18f, size.height * 0.6f); lineTo(size.width * 0.52f, size.height * 0.24f); lineTo(size.width * 0.8f, size.height * 0.5f); lineTo(size.width * 0.5f, size.height * 0.8f); lineTo(size.width * 0.34f, size.height * 0.8f); close() }, color, style = line)
                drawLine(color, at(0.36f, 0.42f), at(0.62f, 0.68f), stroke, StrokeCap.Round)
            }
            "remove" -> drawLine(color, at(0.2f, 0.5f), at(0.8f, 0.5f), stroke, StrokeCap.Round)
            "mic" -> {
                drawRoundRect(color, topLeft = at(0.38f, 0.14f), size = Size(size.width * 0.24f, size.height * 0.44f), cornerRadius = CornerRadius(size.width * 0.12f), style = line)
                drawArc(color, 0f, 180f, false, topLeft = at(0.26f, 0.3f), size = Size(size.width * 0.48f, size.height * 0.42f), style = line)
                drawLine(color, at(0.5f, 0.72f), at(0.5f, 0.86f), stroke, StrokeCap.Round)
            }
            "my_location" -> {
                drawCircle(color, radius = size.minDimension * 0.28f, center = at(0.5f, 0.5f), style = line)
                drawCircle(color, radius = size.minDimension * 0.1f, center = at(0.5f, 0.5f))
                for ((from, to) in listOf(at(0.5f, 0.1f) to at(0.5f, 0.22f), at(0.5f, 0.78f) to at(0.5f, 0.9f), at(0.1f, 0.5f) to at(0.22f, 0.5f), at(0.78f, 0.5f) to at(0.9f, 0.5f))) {
                    drawLine(color, from, to, stroke, StrokeCap.Round)
                }
            }
        }
    }
}

private val TOOLBAR_GLYPHS = setOf("archive", "mark_email_unread", "drive_file_move", "attach_file", "image", "link", "ink_highlighter", "ink_eraser", "remove", "my_location", "mic")

/** Weight 400 strokes a tenth of the box (as `NamedFixtureGlyph`). */
private const val STROKE_PER_WEIGHT = 4000f
